const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const port = process.env.PORT || 3000;
const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, "data", "washraum.sqlite");
const isProduction = process.env.NODE_ENV === "production";
const appTimeZone = process.env.APP_TIME_ZONE || "Europe/Zurich";
const whatsappConfig = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  apiVersion: process.env.WHATSAPP_API_VERSION || "v20.0",
  releaseMode: process.env.WHATSAPP_RELEASE_MODE || "test",
  testTarget: normalizePhoneNumber(process.env.WHATSAPP_TEST_TO || process.env.WHATSAPP_RELEASE_TO || ""),
  productionTarget: normalizePhoneNumber(process.env.WHATSAPP_PRODUCTION_TO || process.env.WHATSAPP_GROUP_TO || "")
};
const defaultResources = {
  washer: ["WM 1", "WM 2", "WM 3"],
  drying_room: ["Trockenraum 1", "Trockenraum 2", "Trockenraum 3"],
  tumbler: ["Tumbler 1", "Tumbler 2"]
};
const retiredDefaultResources = [
  { resourceType: "tumbler", resourceId: "Tumbler 3" }
];
const fixedSlots = [
  { id: "slot-1", label: "07:00-12:00", start: "07:00", end: "12:00" },
  { id: "slot-2", label: "12:00-17:00", start: "12:00", end: "17:00" },
  { id: "slot-3", label: "17:00-21:00", start: "17:00", end: "21:00" }
];
const slots = {
  washer: fixedSlots,
  drying_room: fixedSlots,
  tumbler: fixedSlots
};
const defaultBlockedDates = [
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-05-14",
  "2026-05-25",
  "2026-08-01",
  "2026-12-25",
  "2026-12-26"
].map((date) => ({ date, label: defaultBlockedDateLabel(date) }));

fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

const db = new Database(sqlitePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    active INTEGER NOT NULL DEFAULT 1,
    display_name TEXT,
    apartment_label TEXT,
    onboarding_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room', 'tumbler')),
    resource_id TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    released_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blocked_dates (
    date TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS resource_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room', 'tumbler')),
    resource_id TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    unavailable_reason TEXT,
    unavailable_since TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (resource_type, resource_id)
  );

  CREATE TABLE IF NOT EXISTS machine_log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room', 'tumbler')),
    resource_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pilot_feedback_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL CHECK (event_type IN ('booking_created', 'booking_deleted', 'booking_released', 'laundry_left')),
    user_name TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room', 'tumbler')),
    resource_id TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_name ON bookings(user_name);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_machine_log_entries_created_at ON machine_log_entries(created_at);
  CREATE INDEX IF NOT EXISTS idx_pilot_feedback_entries_created_at ON pilot_feedback_entries(created_at);
  CREATE INDEX IF NOT EXISTS idx_activity_entries_created_at ON activity_entries(created_at);
`);

ensureBookingSchema();
ensureBookingColumns();
ensureActivitySchema();
ensureUserColumns();
ensureResourceColumns();
seedDefaultResources();
deactivateRetiredDefaultResources();
seedDefaultBlockedDates();
seedDefaultUsers();

app.disable("x-powered-by");
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.redirect("/login.html");
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    sqlitePath,
    users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
    bookings: db.prepare("SELECT COUNT(*) AS count FROM bookings").get().count,
    blockedDates: db.prepare("SELECT COUNT(*) AS count FROM blocked_dates").get().count,
    production: isProduction
  });
});

app.post("/api/login", (req, res) => {
  cleanupExpiredSessions();
  const userName = String(req.body?.userName || "").trim();
  const password = String(req.body?.password || "");

  if (!userName || !password) {
    return res.status(400).json({ ok: false, error: "missing_login_fields" });
  }

  const user = db.prepare("SELECT * FROM users WHERE user_name = ?").get(userName);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ ok: false, error: "invalid_login" });
  }

  if (!user.active) {
    return res.status(403).json({ ok: false, error: "user_inactive" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();

  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, user.id, expiresAt);

  res.json({
    ok: true,
    token,
    user: {
      userName: user.user_name,
      role: user.role,
      displayName: user.display_name || "",
      apartmentLabel: user.apartment_label || "",
      onboardingSeenAt: user.onboarding_seen_at || ""
    }
  });
});

app.post("/api/logout", (req, res) => {
  const token = getToken(req);
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }

  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  res.json({
    ok: true,
    user: {
      userName: auth.user_name,
      role: auth.role,
      displayName: auth.display_name || "",
      apartmentLabel: auth.apartment_label || "",
      onboardingSeenAt: auth.onboarding_seen_at || ""
    }
  });
});

app.post("/api/me/onboarding-seen", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const seenAt = new Date().toISOString();
  db.prepare("UPDATE users SET onboarding_seen_at = ? WHERE user_name = ?").run(seenAt, auth.user_name);
  res.json({ ok: true, onboardingSeenAt: seenAt });
});

app.get("/api/resources", (_req, res) => {
  res.json({
    resources: listResources(),
    allResources: listAllResources(),
    resourceEntries: listResourceEntries(),
    slots,
    blockedDates: listBlockedDates()
  });
});

app.get("/api/bookings", (_req, res) => {
  const bookings = db
    .prepare(`
      SELECT
        bookings.*,
        users.display_name AS user_display_name,
        users.apartment_label AS apartment_label
      FROM bookings
      LEFT JOIN users ON users.user_name = bookings.user_name
      ORDER BY start_at ASC
    `)
    .all();

  res.json({ bookings });
});

app.get("/api/activity", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const activities = db
    .prepare(`
      SELECT
        activity_entries.*,
        users.display_name AS user_display_name,
        users.apartment_label AS apartment_label
      FROM activity_entries
      LEFT JOIN users ON users.user_name = activity_entries.user_name
      ORDER BY activity_entries.created_at DESC, activity_entries.id DESC
      LIMIT 30
    `)
    .all();

  res.json({ ok: true, activities });
});

app.post("/api/me/password", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const user = db.prepare("SELECT * FROM users WHERE user_name = ?").get(auth.user_name);

  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ ok: false, error: "invalid_current_password" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ ok: false, error: "password_too_short" });
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(newPassword), user.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?")
    .run(user.id, getToken(req));

  res.json({ ok: true });
});

if (!isProduction) {
  app.post("/api/dev/cleanup", (req, res) => {
    const auth = getAdminAuth(req);
    if (!auth.ok) {
      return res.status(auth.status).json(auth.body);
    }

    const prefixes = Array.isArray(req.body?.prefixes) ? req.body.prefixes : [];
    const safePrefixes = prefixes
      .map((prefix) => String(prefix || "").trim())
      .filter((prefix) => prefix.length >= 4);

    if (safePrefixes.length === 0) {
      return res.status(400).json({ ok: false, error: "cleanup_prefix_required" });
    }

    const deleteBookings = db.prepare("DELETE FROM bookings WHERE user_name LIKE ?");
    const deleteLogsByUser = db.prepare("DELETE FROM machine_log_entries WHERE user_name LIKE ?");
    const deleteLogsByResource = db.prepare("DELETE FROM machine_log_entries WHERE resource_id LIKE ?");
    const deleteFeedbackByUser = db.prepare("DELETE FROM pilot_feedback_entries WHERE user_name LIKE ?");
    const deleteActivityByUser = db.prepare("DELETE FROM activity_entries WHERE user_name LIKE ?");
    const deleteActivityByResource = db.prepare("DELETE FROM activity_entries WHERE resource_id LIKE ?");
    const deleteUserSessions = db.prepare(`
      DELETE FROM sessions
      WHERE user_id IN (
        SELECT id FROM users WHERE user_name LIKE ?
      )
    `);
    const deleteUsers = db.prepare("DELETE FROM users WHERE user_name LIKE ?");
    const deleteResources = db.prepare("DELETE FROM resource_entries WHERE resource_id LIKE ?");

    const cleanup = db.transaction(() => {
      let bookingsDeleted = 0;
      let usersDeleted = 0;

      for (const prefix of safePrefixes) {
        deleteUserSessions.run(`${prefix}%`);
        deleteLogsByUser.run(`${prefix}%`);
        deleteLogsByResource.run(`${prefix}%`);
        deleteFeedbackByUser.run(`${prefix}%`);
        deleteActivityByUser.run(`${prefix}%`);
        deleteActivityByResource.run(`${prefix}%`);
        bookingsDeleted += deleteBookings.run(`${prefix}%`).changes;
        usersDeleted += deleteUsers.run(`${prefix}%`).changes;
        deleteResources.run(`${prefix}%`);
      }

      return {
        bookingsDeleted,
        usersDeleted
      };
    });

    res.json({ ok: true, ...cleanup() });
  });
}

app.get("/api/admin/users", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const users = db
    .prepare(`
      SELECT id, user_name, role, active, display_name, apartment_label, onboarding_seen_at, created_at
      FROM users
      ORDER BY
        CASE WHEN apartment_label IS NULL OR apartment_label = '' THEN 1 ELSE 0 END,
        apartment_label ASC,
        user_name ASC
    `)
    .all();

  res.json({ users });
});

app.get("/api/admin/overview", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const activeUsers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE active = 1").get().count;
  const inactiveUsers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE active = 0").get().count;
  const admins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1").get().count;
  const bookings = db.prepare("SELECT COUNT(*) AS count FROM bookings").get().count;
  const pilotFeedback = db.prepare("SELECT COUNT(*) AS count FROM pilot_feedback_entries").get().count;
  const activities = db.prepare("SELECT COUNT(*) AS count FROM activity_entries").get().count;
  const futureBookings = db
    .prepare("SELECT COUNT(*) AS count FROM bookings WHERE end_at > ?")
    .get(new Date().toISOString()).count;
  const blockedDatesCount = db.prepare("SELECT COUNT(*) AS count FROM blocked_dates").get().count;
  const currentResources = listAllResources();
  const unavailableResources = listResourceEntries().filter((resource) => resource.unavailable_reason);
  const whatsappStatus = whatsappRuntimeStatus();
  const seededParties = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE user_name LIKE 'partei-%' OR apartment_label LIKE 'Partei %'")
    .get().count;
  const testUsers = db
    .prepare(`
      SELECT user_name
      FROM users
      WHERE user_name IN ('user')
        OR user_name LIKE 'PartyTest-%'
        OR user_name LIKE 'Smoke-%'
        OR user_name LIKE 'Managed-%'
      ORDER BY user_name ASC
      LIMIT 8
    `)
    .all()
    .map((user) => user.user_name);

  const warnings = [];
  if (testUsers.length > 0) {
    warnings.push({
      code: "test_users_present",
      message: `Test-/Standardnutzer vorhanden: ${testUsers.join(", ")}`
    });
  }
  if (seededParties < 20) {
    warnings.push({
      code: "parties_incomplete",
      message: `Es sind erst ${seededParties} von 20 Parteien nach Standardschema angelegt.`
    });
  }
  if (admins < 1) {
    warnings.push({
      code: "no_active_admin",
      message: "Es gibt keinen aktiven Admin."
    });
  }
  if (!whatsappStatus.configured) {
    warnings.push({
      code: "whatsapp_not_configured",
      message: "WhatsApp-Versand ist noch nicht vollstaendig konfiguriert."
    });
  }

  res.json({
    ok: true,
    status: {
      sqlitePath,
      production: isProduction,
      activeUsers,
      inactiveUsers,
      admins,
      bookings,
      pilotFeedback,
      activities,
      futureBookings,
      blockedDates: blockedDatesCount,
      seededParties,
      resources: {
        washers: currentResources.washer.length,
        dryingRooms: currentResources.drying_room.length,
        tumblers: currentResources.tumbler.length,
        slotsPerResource: fixedSlots.length,
        unavailable: unavailableResources.length
      },
      whatsapp: whatsappStatus
    },
    warnings
  });
});

app.get("/api/admin/analytics", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const days = normalizeAnalyticsDays(req.query.days);
  res.json({
    ok: true,
    analytics: buildAdminAnalytics(days)
  });
});

app.post("/api/admin/bookings/reset", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const confirmation = String(req.body.confirmation || "").trim();
  if (confirmation !== "ZURUECKSETZEN") {
    return res.status(400).json({ ok: false, error: "invalid_reset_confirmation" });
  }

  const resetBookings = db.transaction(() => {
    const deletedBookings = db.prepare("DELETE FROM bookings").run().changes;
    const deletedActivities = db.prepare("DELETE FROM activity_entries").run().changes;
    return {
      deletedBookings,
      deletedActivities
    };
  });

  res.json({
    ok: true,
    ...resetBookings()
  });
});

app.post("/api/admin/resources", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const resourceType = String(req.body?.resourceType || "").trim();
  const resourceId = String(req.body?.resourceId || "").trim();
  const validation = validateResourceInput({ resourceType, resourceId });
  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  try {
    const sortOrder = nextResourceSortOrder(resourceType);
    const info = db
      .prepare(`
        INSERT INTO resource_entries (resource_type, resource_id, sort_order)
        VALUES (?, ?, ?)
      `)
      .run(resourceType, resourceId, sortOrder);
    const resource = db
      .prepare("SELECT id, resource_type, resource_id, active, unavailable_reason, unavailable_since, sort_order, created_at FROM resource_entries WHERE id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json({ ok: true, resource, resources: listResources() });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ ok: false, error: "resource_already_exists" });
    }

    throw error;
  }
});

app.patch("/api/admin/resources/:id/availability", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const id = Number(req.params.id);
  const existingResource = db
    .prepare("SELECT id, resource_type, resource_id FROM resource_entries WHERE id = ? AND active = 1")
    .get(id);
  if (!existingResource) {
    return res.status(404).json({ ok: false, error: "resource_not_found" });
  }

  const unavailable = Boolean(req.body?.unavailable);
  const reason = String(req.body?.reason || "").trim();
  if (unavailable && (reason.length < 3 || reason.length > 160)) {
    return res.status(400).json({ ok: false, error: "invalid_resource_unavailable_reason" });
  }

  if (unavailable) {
    db
      .prepare("UPDATE resource_entries SET unavailable_reason = ?, unavailable_since = ? WHERE id = ?")
      .run(reason, new Date().toISOString(), id);
  } else {
    db
      .prepare("UPDATE resource_entries SET unavailable_reason = NULL, unavailable_since = NULL WHERE id = ?")
      .run(id);
  }

  const resource = db
    .prepare("SELECT id, resource_type, resource_id, active, unavailable_reason, unavailable_since, sort_order, created_at FROM resource_entries WHERE id = ?")
    .get(id);

  res.json({
    ok: true,
    resource,
    resources: listResources(),
    allResources: listAllResources(),
    resourceEntries: listResourceEntries()
  });
});

app.post("/api/admin/seed-parties", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const count = Number(req.body?.count || 20);
  const displayNameMode = String(req.body?.displayNameMode || "schema");
  if (!Number.isInteger(count) || count < 1 || count > 60) {
    return res.status(400).json({ ok: false, error: "invalid_party_count" });
  }

  const lookupUser = db.prepare("SELECT id, user_name, display_name, apartment_label FROM users WHERE user_name = ?");
  const insertUser = db.prepare(`
    INSERT INTO users (user_name, password_hash, role, active, display_name, apartment_label)
    VALUES (?, ?, 'user', 1, ?, ?)
  `);
  const createdParties = [];

  const createParties = db.transaction(() => {
    for (let index = 1; index <= count; index += 1) {
      const suffix = String(index).padStart(2, "0");
      const userName = `partei-${suffix}`;
      const apartmentLabel = `Partei ${suffix}`;
      const existing = lookupUser.get(userName);

      if (existing) {
        createdParties.push({
          status: "exists",
          userName: existing.user_name,
          displayName: existing.display_name || "",
          apartmentLabel: existing.apartment_label || apartmentLabel,
          password: ""
        });
        continue;
      }

      const password = generateInitialPassword();
      const displayName = displayNameMode === "empty" ? "" : apartmentLabel;
      insertUser.run(userName, hashPassword(password), displayName, apartmentLabel);
      createdParties.push({
        status: "created",
        userName,
        displayName,
        apartmentLabel,
        password
      });
    }
  });

  createParties();
  res.status(201).json({ ok: true, parties: createdParties });
});

app.get("/api/machine-logs", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const logs = db
    .prepare(`
      SELECT
        machine_log_entries.*,
        users.display_name AS user_display_name,
        users.apartment_label AS apartment_label
      FROM machine_log_entries
      LEFT JOIN users ON users.user_name = machine_log_entries.user_name
      ORDER BY event_date DESC, created_at DESC, id DESC
      LIMIT 150
    `)
    .all();

  res.json({ ok: true, logs });
});

app.post("/api/machine-logs", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const resourceType = String(req.body?.resourceType || "").trim();
  const resourceId = String(req.body?.resourceId || "").trim();
  const eventDate = String(req.body?.eventDate || dateKey(new Date())).trim();
  const note = String(req.body?.note || "").trim();
  const availabilityAction = String(req.body?.availabilityAction || "log_only").trim();
  const validation = validateMachineLogInput({ resourceType, resourceId, eventDate, note });
  if (!validation.ok) {
    return res.status(400).json(validation);
  }
  if (!["log_only", "block_resource", "release_resource"].includes(availabilityAction)) {
    return res.status(400).json({ ok: false, error: "invalid_machine_log_action" });
  }
  if (availabilityAction !== "log_only" && auth.role !== "admin") {
    return res.status(403).json({ ok: false, error: "admin_required" });
  }

  const saveMachineLog = db.transaction(() => {
    const storedNote = noteWithAvailabilityAction(note, availabilityAction);
    const info = db
      .prepare(`
        INSERT INTO machine_log_entries (user_name, resource_type, resource_id, event_date, note)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(auth.user_name, resourceType, resourceId, eventDate, storedNote);

    if (availabilityAction === "block_resource") {
      db
        .prepare(`
          UPDATE resource_entries
          SET unavailable_reason = ?, unavailable_since = ?
          WHERE resource_type = ? AND resource_id = ? AND active = 1
        `)
        .run(resourceUnavailableReason(note), new Date().toISOString(), resourceType, resourceId);
    }

    if (availabilityAction === "release_resource") {
      db
        .prepare(`
          UPDATE resource_entries
          SET unavailable_reason = NULL, unavailable_since = NULL
          WHERE resource_type = ? AND resource_id = ? AND active = 1
        `)
        .run(resourceType, resourceId);
    }

    return db
      .prepare("SELECT * FROM machine_log_entries WHERE id = ?")
      .get(info.lastInsertRowid);
  });

  const logEntry = saveMachineLog();

  res.status(201).json({
    ok: true,
    logEntry,
    availabilityAction,
    resources: listResources(),
    allResources: listAllResources(),
    resourceEntries: listResourceEntries()
  });
});

app.get("/api/pilot-feedback", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const ownOnly = auth.role !== "admin";
  const query = `
    SELECT
      pilot_feedback_entries.*,
      users.display_name AS user_display_name,
      users.apartment_label AS apartment_label
    FROM pilot_feedback_entries
    LEFT JOIN users ON users.user_name = pilot_feedback_entries.user_name
    ${ownOnly ? "WHERE pilot_feedback_entries.user_name = ?" : ""}
    ORDER BY pilot_feedback_entries.created_at DESC, pilot_feedback_entries.id DESC
    LIMIT 100
  `;
  const feedback = ownOnly
    ? db.prepare(query).all(auth.user_name)
    : db.prepare(query).all();

  res.json({ ok: true, feedback });
});

app.post("/api/pilot-feedback", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const message = String(req.body?.message || "").trim();
  const validation = validatePilotFeedback({ message });
  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  const info = db
    .prepare("INSERT INTO pilot_feedback_entries (user_name, message) VALUES (?, ?)")
    .run(auth.user_name, message);
  const feedbackEntry = db
    .prepare("SELECT * FROM pilot_feedback_entries WHERE id = ?")
    .get(info.lastInsertRowid);

  res.status(201).json({ ok: true, feedbackEntry });
});

app.post("/api/admin/users", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const userName = String(req.body?.userName || "").trim();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "user").trim();
  const displayName = String(req.body?.displayName || "").trim();
  const apartmentLabel = String(req.body?.apartmentLabel || "").trim();
  const active = normalizeActive(req.body?.active);
  const validation = validateUserInput({ userName, password, role, displayName, apartmentLabel, requirePassword: true });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  try {
    const info = db
      .prepare(`
        INSERT INTO users (user_name, password_hash, role, active, display_name, apartment_label)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(userName, hashPassword(password), role, active, displayName, apartmentLabel);
    const user = db
      .prepare("SELECT id, user_name, role, active, display_name, apartment_label, onboarding_seen_at, created_at FROM users WHERE id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json({ ok: true, user });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ ok: false, error: "user_already_exists" });
    }

    throw error;
  }
});

app.post("/api/admin/users/:id/reset-password", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const id = Number(req.params.id);
  const existingUser = db.prepare("SELECT id, user_name FROM users WHERE id = ?").get(id);
  if (!existingUser) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  const password = generateInitialPassword();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);

  res.json({
    ok: true,
    userName: existingUser.user_name,
    password
  });
});

app.get("/api/admin/blocked-dates", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  res.json({ blockedDates: listBlockedDates() });
});

app.post("/api/admin/blocked-dates", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const date = String(req.body?.date || "").trim();
  const label = String(req.body?.label || "").trim() || "Sperrtag";
  const validation = validateBlockedDate({ date, label });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  try {
    db.prepare("INSERT INTO blocked_dates (date, label) VALUES (?, ?)").run(date, label);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return res.status(409).json({ ok: false, error: "blocked_date_already_exists" });
    }

    throw error;
  }

  const blockedDate = db.prepare("SELECT date, label, created_at FROM blocked_dates WHERE date = ?").get(date);
  res.status(201).json({ ok: true, blockedDate });
});

app.get("/api/admin/backup", async (req, res, next) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const backupName = `washraum-backup-${dateTimeStamp(new Date())}.sqlite`;
  const backupPath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${backupName}`);

  try {
    await db.backup(backupPath);
    res.setHeader("Cache-Control", "no-store");
    res.download(backupPath, backupName, (error) => {
      fs.rm(backupPath, { force: true }, () => {});
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    fs.rm(backupPath, { force: true }, () => {});
    next(error);
  }
});

app.delete("/api/admin/blocked-dates/:date", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const date = String(req.params.date || "").trim();
  if (!isDateKey(date)) {
    return res.status(400).json({ ok: false, error: "invalid_blocked_date" });
  }

  const result = db.prepare("DELETE FROM blocked_dates WHERE date = ?").run(date);
  if (result.changes === 0) {
    return res.status(404).json({ ok: false, error: "blocked_date_not_found" });
  }

  res.json({ ok: true });
});

app.post("/api/admin/whatsapp-test", async (req, res, next) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  try {
    const result = await sendWhatsAppText([
      "Test Waschraum Maneggplatz 18:",
      "Der WhatsApp-Versand aus der App ist verbunden."
    ].join(" "));

    if (!result.ok) {
      return res.status(result.status || 400).json(result);
    }

    res.json({ ok: true, status: whatsappRuntimeStatus() });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const id = Number(req.params.id);
  const existingUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

  if (!existingUser) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  const userName = String(req.body?.userName || existingUser.user_name).trim();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || existingUser.role).trim();
  const displayName = req.body?.displayName === undefined
    ? String(existingUser.display_name || "")
    : String(req.body.displayName || "").trim();
  const apartmentLabel = req.body?.apartmentLabel === undefined
    ? String(existingUser.apartment_label || "")
    : String(req.body.apartmentLabel || "").trim();
  const active = req.body?.active === undefined ? existingUser.active : normalizeActive(req.body.active);
  const validation = validateUserInput({ userName, password, role, displayName, apartmentLabel, requirePassword: false });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  if (existingUser.role === "admin" && (role !== "admin" || !active) && countAdmins() <= 1) {
    return res.status(400).json({ ok: false, error: "last_admin_required" });
  }

  try {
    if (password) {
      db
        .prepare(`
          UPDATE users
          SET user_name = ?, password_hash = ?, role = ?, active = ?, display_name = ?, apartment_label = ?
          WHERE id = ?
        `)
        .run(userName, hashPassword(password), role, active, displayName, apartmentLabel, id);
    } else {
      db
        .prepare(`
          UPDATE users
          SET user_name = ?, role = ?, active = ?, display_name = ?, apartment_label = ?
          WHERE id = ?
        `)
        .run(userName, role, active, displayName, apartmentLabel, id);
    }

    if (!active) {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    }

    const user = db
      .prepare("SELECT id, user_name, role, active, display_name, apartment_label, onboarding_seen_at, created_at FROM users WHERE id = ?")
      .get(id);

    res.json({ ok: true, user });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ ok: false, error: "user_already_exists" });
    }

    throw error;
  }
});

app.post("/api/admin/addBooking", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  if (auth.role !== "admin") {
    return res.status(403).json({ ok: false, error: "admin_required" });
  }

  const result = createBooking({ ...req.body, userName: req.body?.userName || auth.user_name });
  if (!result.ok) {
    return res.status(400).json(result);
  }

  res.status(201).json(result);
});

app.post("/api/user/deleteBooking", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const { id } = req.body || {};

  if (!id) {
    return res.status(400).json({ ok: false, error: "booking_id_required" });
  }

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!booking) {
    return res.status(404).json({ ok: false, error: "booking_not_found" });
  }

  if (auth.role !== "admin" && booking.user_name !== auth.user_name) {
    return res.status(403).json({ ok: false, error: "not_allowed" });
  }

  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  logBookingActivity("booking_deleted", booking);
  res.json({ ok: true, activity: latestActivityForBooking("booking_deleted", booking) });
});

app.post("/api/user/releaseBooking", async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ ok: false, error: "booking_id_required" });
  }

  const booking = db
    .prepare(`
      SELECT
        bookings.*,
        users.display_name AS user_display_name,
        users.apartment_label AS apartment_label
      FROM bookings
      LEFT JOIN users ON users.user_name = bookings.user_name
      WHERE bookings.id = ?
    `)
    .get(id);

  if (!booking) {
    return res.status(404).json({ ok: false, error: "booking_not_found" });
  }

  if (auth.role !== "admin" && booking.user_name !== auth.user_name) {
    return res.status(403).json({ ok: false, error: "not_allowed" });
  }

  try {
    const result = await sendWhatsAppReleaseMessage(booking);
    if (!result.ok) {
      return res.status(result.status || 400).json(result);
    }

    const releasedAt = new Date().toISOString();
    db.prepare("UPDATE bookings SET released_at = ? WHERE id = ?").run(releasedAt, id);
    booking.released_at = releasedAt;
    logBookingActivity("booking_released", booking);
    res.json({ ok: true, activity: latestActivityForBooking("booking_released", booking) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/user/laundry-left", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ ok: false, error: "booking_id_required" });
  }

  const booking = bookingWithUser(id);
  if (!booking) {
    return res.status(404).json({ ok: false, error: "booking_not_found" });
  }

  if (booking.released_at) {
    return res.status(400).json({ ok: false, error: "booking_already_released" });
  }

  const message = buildLaundryLeftMessage(booking);
  logBookingActivity("laundry_left", booking, message);
  res.json({ ok: true, activity: latestActivityForBooking("laundry_left", booking) });
});

app.post("/api/bookings", (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const result = createBooking({ ...req.body, userName: auth.user_name });
  if (!result.ok) {
    return res.status(400).json(result);
  }

  res.status(201).json(result);
});

function seedDefaultUsers() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (count > 0) {
    return;
  }

  const seedAdminPassword = seedPassword("SEED_ADMIN_PASSWORD", "admin123");
  const seedUserPassword = seedPassword("SEED_USER_PASSWORD", "user123");
  const insert = db.prepare(`
    INSERT INTO users (user_name, password_hash, role, display_name, apartment_label)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(process.env.SEED_ADMIN_NAME || "admin", hashPassword(seedAdminPassword), "admin", "Administration", "");
  insert.run(process.env.SEED_USER_NAME || "user", hashPassword(seedUserPassword), "user", "Testnutzer", "Partei 01");
}

function seedPassword(envName, localFallback) {
  const value = process.env[envName];

  if (value) {
    return value;
  }

  if (isProduction) {
    throw new Error(`${envName} must be set before starting production with an empty database`);
  }

  return localFallback;
}

function generateInitialPassword() {
  return `Wp-${crypto.randomBytes(6).toString("base64url")}`;
}

async function sendWhatsAppReleaseMessage(booking) {
  return sendWhatsAppText(buildReleaseMessage(booking));
}

async function sendWhatsAppText(text) {
  const releaseTarget = whatsappReleaseTarget();
  if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId || !releaseTarget) {
    return { ok: false, status: 503, error: "whatsapp_not_configured" };
  }

  const response = await fetch(`https://graph.facebook.com/${whatsappConfig.apiVersion}/${whatsappConfig.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${whatsappConfig.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: releaseTarget,
      type: "text",
      text: {
        preview_url: false,
        body: text
      }
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    console.error("WhatsApp release message failed", details);
    return { ok: false, status: 502, error: "whatsapp_send_failed" };
  }

  return { ok: true };
}

function whatsappReleaseTarget() {
  return whatsappConfig.releaseMode === "production"
    ? whatsappConfig.productionTarget
    : whatsappConfig.testTarget;
}

function whatsappRuntimeStatus() {
  const mode = whatsappConfig.releaseMode === "production" ? "production" : "test";
  const target = whatsappReleaseTarget();

  return {
    mode,
    configured: Boolean(whatsappConfig.accessToken && whatsappConfig.phoneNumberId && target),
    hasAccessToken: Boolean(whatsappConfig.accessToken),
    hasPhoneNumberId: Boolean(whatsappConfig.phoneNumberId),
    hasTarget: Boolean(target),
    targetMasked: maskPhoneNumber(target)
  };
}

function buildReleaseMessage(booking) {
  return [
    "Info Waschraum Maneggplatz 18:",
    `${resourceLabel(booking.resource_type)} ${booking.resource_id} ist frueher frei.`,
    `Gebucht war bis ${formatServerTime(booking.end_at)} am ${formatServerDate(booking.start_at)}.`
  ].join(" ");
}

function buildLaundryLeftMessage(booking) {
  const person = bookingPartyLabel(booking);
  return [
    `${person}: kurzer Hinweis, bei ${resourceLabel(booking.resource_type)} ${booking.resource_id} haengt noch Waesche.`,
    `Gebucht war ${formatServerTime(booking.start_at)}-${formatServerTime(booking.end_at)} am ${formatServerDate(booking.start_at)}.`
  ].join(" ");
}

function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  return digits;
}

function maskPhoneNumber(value) {
  const digits = String(value || "");
  if (!digits) {
    return "";
  }

  if (digits.length <= 4) {
    return "****";
  }

  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function seedDefaultResources() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO resource_entries (resource_type, resource_id, sort_order)
    VALUES (?, ?, ?)
  `);

  for (const [resourceType, resourceIds] of Object.entries(defaultResources)) {
    resourceIds.forEach((resourceId, index) => {
      insert.run(resourceType, resourceId, index + 1);
    });
  }
}

function deactivateRetiredDefaultResources() {
  const deactivate = db.prepare(`
    UPDATE resource_entries
    SET active = 0, unavailable_reason = NULL, unavailable_since = NULL
    WHERE resource_type = ? AND resource_id = ?
  `);

  for (const resource of retiredDefaultResources) {
    deactivate.run(resource.resourceType, resource.resourceId);
  }
}

function listResources() {
  const resources = {
    washer: [],
    drying_room: [],
    tumbler: []
  };
  const entries = db
    .prepare(`
      SELECT resource_type, resource_id
      FROM resource_entries
      WHERE active = 1
        AND unavailable_reason IS NULL
      ORDER BY resource_type ASC, sort_order ASC, resource_id ASC
    `)
    .all();

  for (const entry of entries) {
    resources[entry.resource_type].push(entry.resource_id);
  }

  return resources;
}

function listAllResources() {
  const resources = {
    washer: [],
    drying_room: [],
    tumbler: []
  };

  for (const entry of listResourceEntries()) {
    resources[entry.resource_type].push(entry.resource_id);
  }

  return resources;
}

function listResourceEntries() {
  return db
    .prepare(`
      SELECT id, resource_type, resource_id, active, unavailable_reason, unavailable_since, sort_order, created_at
      FROM resource_entries
      WHERE active = 1
      ORDER BY resource_type ASC, sort_order ASC, resource_id ASC
    `)
    .all();
}

function normalizeAnalyticsDays(value) {
  const days = Number(value);
  if ([30, 90, 365].includes(days)) {
    return days;
  }

  return 30;
}

function buildAdminAnalytics(days) {
  const now = new Date();
  const periodStart = addZonedDays(startOfZonedDay(now), -days + 1);
  const periodEnd = now;
  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();
  const periodStartKey = dateKey(periodStart);
  const periodEndKey = dateKey(periodEnd);
  const resources = listAllResources();
  const unavailableResources = listResourceEntries().filter((resource) => resource.unavailable_reason);
  const bookings = db
    .prepare(`
      SELECT
        bookings.*,
        users.display_name AS user_display_name,
        users.apartment_label AS apartment_label
      FROM bookings
      LEFT JOIN users ON users.user_name = bookings.user_name
      WHERE bookings.start_at >= ?
        AND bookings.start_at <= ?
      ORDER BY bookings.start_at ASC
    `)
    .all(periodStartIso, periodEndIso);
  const activeParties = db
    .prepare(`
      SELECT user_name, display_name, apartment_label
      FROM users
      WHERE active = 1
        AND role = 'user'
      ORDER BY apartment_label ASC, user_name ASC
    `)
    .all();
  const machineLogs = db
    .prepare(`
      SELECT resource_type, resource_id, event_date
      FROM machine_log_entries
      WHERE event_date >= ?
        AND event_date <= ?
    `)
    .all(periodStartKey, periodEndKey);
  const bookableDays = countBookableDays(periodStart, periodEnd);
  const bookingsByType = countBy(bookings, (booking) => booking.resource_type);
  const bookingUsers = countBy(bookings, (booking) => booking.user_name);
  const partiesWithBookings = activeParties.filter((party) => (bookingUsers.get(party.user_name) || 0) > 0);

  return {
    period: {
      days,
      start: periodStartIso,
      end: periodEndIso,
      label: `${formatServerDate(periodStartIso)} bis ${formatServerDate(periodEndIso)}`
    },
    totals: {
      bookings: bookings.length,
      activeParties: activeParties.length,
      partiesWithBookings: partiesWithBookings.length,
      averagePerActiveParty: activeParties.length ? roundOne(bookings.length / activeParties.length) : 0,
      machineLogs: machineLogs.length,
      unavailableResources: unavailableResources.length,
      bookableDays
    },
    usage: ["washer", "drying_room", "tumbler"].map((resourceType) => {
      const capacity = bookableDays * (resources[resourceType]?.length || 0) * fixedSlots.length;
      const count = bookingsByType.get(resourceType) || 0;
      return {
        resourceType,
        label: resourceType === "washer" ? "Waschmaschinen" : resourceType === "drying_room" ? "Trockenraeume" : "Tumbler",
        bookings: count,
        capacity,
        utilizationPercent: capacity ? roundOne((count / capacity) * 100) : 0
      };
    }),
    insights: {
      busiestWeekday: topEntry(countBy(bookings, (booking) => weekdayLabel(booking.start_at))),
      busiestSlot: topEntry(countBy(bookings, (booking) => `${formatServerTime(booking.start_at)}-${formatServerTime(booking.end_at)}`)),
      busiestResource: topEntry(countBy(bookings, (booking) => `${resourceLabel(booking.resource_type)} ${booking.resource_id}`)),
      topParties: topEntries(bookingUsers, 5).map((entry) => ({
        label: partyAnalyticsLabel(activeParties.find((party) => party.user_name === entry.label) || { user_name: entry.label }),
        count: entry.count
      })),
      inactiveParties: activeParties
        .filter((party) => !bookingUsers.get(party.user_name))
        .slice(0, 8)
        .map(partyAnalyticsLabel),
      machineLogsByResource: topEntries(countBy(machineLogs, (entry) => `${resourceLabel(entry.resource_type)} ${entry.resource_id}`), 5),
      unavailableResources: unavailableResources.map((resource) => ({
        label: `${resourceLabel(resource.resource_type)} ${resource.resource_id}`,
        reason: resource.unavailable_reason
      }))
    }
  };
}

function countBookableDays(start, end) {
  let count = 0;
  for (let day = startOfZonedDay(start); day <= end; day = addZonedDays(day, 1)) {
    if (zonedWeekday(day) !== 0 && !isBlockedDate(day)) {
      count += 1;
    }
  }

  return count;
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function topEntry(counts) {
  return topEntries(counts, 1)[0] || null;
}

function topEntries(counts, limit) {
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function partyAnalyticsLabel(party) {
  const parts = [];
  if (party.apartment_label) {
    parts.push(party.apartment_label);
  }
  if (party.display_name) {
    parts.push(party.display_name);
  }
  if (parts.length === 0) {
    parts.push(party.user_name);
  }

  return parts.join(" - ");
}

function weekdayLabel(value) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    timeZone: appTimeZone
  }).format(new Date(value));
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function isKnownResource(resourceType, resourceId) {
  return Boolean(db
    .prepare(`
      SELECT id
      FROM resource_entries
      WHERE resource_type = ?
        AND resource_id = ?
        AND active = 1
    `)
    .get(resourceType, resourceId));
}

function isResourceBookable(resourceType, resourceId) {
  return Boolean(db
    .prepare(`
      SELECT id
      FROM resource_entries
      WHERE resource_type = ?
        AND resource_id = ?
        AND active = 1
        AND unavailable_reason IS NULL
    `)
    .get(resourceType, resourceId));
}

function nextResourceSortOrder(resourceType) {
  return db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS sort_order FROM resource_entries WHERE resource_type = ?")
    .get(resourceType).sort_order;
}

function seedDefaultBlockedDates() {
  const insert = db.prepare("INSERT OR IGNORE INTO blocked_dates (date, label) VALUES (?, ?)");
  for (const blockedDate of defaultBlockedDates) {
    insert.run(blockedDate.date, blockedDate.label);
  }
}

function ensureUserColumns() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasActive = columns.some((column) => column.name === "active");
  const hasDisplayName = columns.some((column) => column.name === "display_name");
  const hasApartmentLabel = columns.some((column) => column.name === "apartment_label");
  const hasOnboardingSeenAt = columns.some((column) => column.name === "onboarding_seen_at");

  if (!hasActive) {
    db.exec("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  }

  if (!hasDisplayName) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT");
  }

  if (!hasApartmentLabel) {
    db.exec("ALTER TABLE users ADD COLUMN apartment_label TEXT");
  }

  if (!hasOnboardingSeenAt) {
    db.exec("ALTER TABLE users ADD COLUMN onboarding_seen_at TEXT");
  }
}

function ensureResourceColumns() {
  const columns = db.prepare("PRAGMA table_info(resource_entries)").all();
  const hasUnavailableReason = columns.some((column) => column.name === "unavailable_reason");
  const hasUnavailableSince = columns.some((column) => column.name === "unavailable_since");

  if (!hasUnavailableReason) {
    db.exec("ALTER TABLE resource_entries ADD COLUMN unavailable_reason TEXT");
  }

  if (!hasUnavailableSince) {
    db.exec("ALTER TABLE resource_entries ADD COLUMN unavailable_since TEXT");
  }
}

function ensureBookingColumns() {
  const columns = db.prepare("PRAGMA table_info(bookings)").all();
  const hasReleasedAt = columns.some((column) => column.name === "released_at");

  if (!hasReleasedAt) {
    db.exec("ALTER TABLE bookings ADD COLUMN released_at TEXT");
  }
}

function ensureActivitySchema() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'activity_entries'").get();
  if (!table || table.sql.includes("'laundry_left'")) {
    return;
  }

  db.exec(`
    ALTER TABLE activity_entries RENAME TO activity_entries_old;

    CREATE TABLE activity_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL CHECK (event_type IN ('booking_created', 'booking_deleted', 'booking_released', 'laundry_left')),
      user_name TEXT NOT NULL,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room', 'tumbler')),
      resource_id TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO activity_entries (id, event_type, user_name, resource_type, resource_id, start_at, end_at, message, created_at)
    SELECT id, event_type, user_name, resource_type, resource_id, start_at, end_at, message, created_at
    FROM activity_entries_old;

    DROP TABLE activity_entries_old;

    CREATE INDEX IF NOT EXISTS idx_activity_entries_created_at ON activity_entries(created_at);
  `);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) {
    return false;
  }

  const testHash = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, "hex");

  return storedBuffer.length === testHash.length && crypto.timingSafeEqual(storedBuffer, testHash);
}

function getToken(req) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return String(req.body?.token || req.query?.token || "").trim();
}

function getAuth(req) {
  const token = getToken(req);
  if (!token) {
    return null;
  }

  const session = db
    .prepare(`
      SELECT users.user_name, users.role, sessions.expires_at
        , users.display_name, users.apartment_label, users.onboarding_seen_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ?
        AND users.active = 1
    `)
    .get(token);

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) <= new Date()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return session;
}

function cleanupExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

function getAdminAuth(req) {
  const auth = getAuth(req);
  if (!auth) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, error: "not_authenticated" }
    };
  }

  if (auth.role !== "admin") {
    return {
      ok: false,
      status: 403,
      body: { ok: false, error: "admin_required" }
    };
  }

  return { ok: true, auth };
}

function countAdmins() {
  return db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1").get().count;
}

function normalizeActive(value) {
  return value === false || value === 0 || value === "0" || value === "false" ? 0 : 1;
}

function validateUserInput({ userName, password, role, displayName, apartmentLabel, requirePassword }) {
  if (!userName || !role || (requirePassword && !password)) {
    return { ok: false, error: "missing_user_fields" };
  }

  if (!["user", "admin"].includes(role)) {
    return { ok: false, error: "invalid_user_role" };
  }

  if (userName.length < 2 || userName.length > 60) {
    return { ok: false, error: "invalid_user_name" };
  }

  if (password && password.length < 6) {
    return { ok: false, error: "password_too_short" };
  }

  if (displayName && displayName.length > 80) {
    return { ok: false, error: "invalid_display_name" };
  }

  if (apartmentLabel && apartmentLabel.length > 40) {
    return { ok: false, error: "invalid_apartment_label" };
  }

  return { ok: true };
}

function validateBlockedDate({ date, label }) {
  if (!date || !label) {
    return { ok: false, error: "missing_blocked_date_fields" };
  }

  if (!isDateKey(date)) {
    return { ok: false, error: "invalid_blocked_date" };
  }

  if (label.length < 2 || label.length > 80) {
    return { ok: false, error: "invalid_blocked_date_label" };
  }

  return { ok: true };
}

function validateResourceInput({ resourceType, resourceId }) {
  if (!resourceType || !resourceId) {
    return { ok: false, error: "missing_resource_fields" };
  }

  if (!Object.prototype.hasOwnProperty.call(defaultResources, resourceType)) {
    return { ok: false, error: "invalid_resource_type" };
  }

  if (resourceId.length < 2 || resourceId.length > 60) {
    return { ok: false, error: "invalid_resource_name" };
  }

  return { ok: true };
}

function validateMachineLogInput({ resourceType, resourceId, eventDate, note }) {
  if (!resourceType || !resourceId || !eventDate || !note) {
    return { ok: false, error: "missing_machine_log_fields" };
  }

  if (!Object.prototype.hasOwnProperty.call(defaultResources, resourceType)) {
    return { ok: false, error: "invalid_resource_type" };
  }

  if (!isKnownResource(resourceType, resourceId)) {
    return { ok: false, error: "invalid_resource_id" };
  }

  if (!isDateKey(eventDate)) {
    return { ok: false, error: "invalid_machine_log_date" };
  }

  if (note.length < 3 || note.length > 1200) {
    return { ok: false, error: "invalid_machine_log_note" };
  }

  return { ok: true };
}

function noteWithAvailabilityAction(note, availabilityAction) {
  if (availabilityAction === "block_resource") {
    return `[Gesperrt] ${note}`;
  }
  if (availabilityAction === "release_resource") {
    return `[Freigegeben] ${note}`;
  }

  return note;
}

function resourceUnavailableReason(note) {
  return String(note || "").trim().slice(0, 160);
}

function validatePilotFeedback({ message }) {
  if (!message) {
    return { ok: false, error: "missing_pilot_feedback" };
  }

  if (message.length < 5 || message.length > 1200) {
    return { ok: false, error: "invalid_pilot_feedback" };
  }

  return { ok: true };
}

function createBooking(input) {
  const userName = String(input?.userName || "").trim();
  const resourceType = String(input?.resourceType || "").trim();
  const resourceId = String(input?.resourceId || "").trim();
  const startAt = String(input?.startAt || "").trim();
  const endAt = String(input?.endAt || "").trim();

  if (!userName || !resourceType || !resourceId || !startAt || !endAt) {
    return { ok: false, error: "missing_required_fields" };
  }

  if (!Object.prototype.hasOwnProperty.call(defaultResources, resourceType)) {
    return { ok: false, error: "invalid_resource_type" };
  }

  if (!isKnownResource(resourceType, resourceId)) {
    return { ok: false, error: "invalid_resource_id" };
  }

  if (!isResourceBookable(resourceType, resourceId)) {
    return { ok: false, error: "resource_unavailable" };
  }

  const start = parseBookingDateTime(startAt);
  const end = parseBookingDateTime(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { ok: false, error: "invalid_time_range" };
  }

  if (start <= new Date()) {
    return { ok: false, error: "booking_must_be_in_future" };
  }

  if (zonedWeekday(start) === 0) {
    return { ok: false, error: "sunday_not_allowed" };
  }

  if (isBlockedDate(start)) {
    return { ok: false, error: "blocked_date" };
  }

  if (!isConfiguredSlot(resourceType, start, end)) {
    return { ok: false, error: "invalid_booking_slot" };
  }

  if (hasOtherFutureSequence(userName, start)) {
    return { ok: false, error: "only_one_future_sequence_allowed" };
  }

  if (resourceType === "tumbler" && !hasUserWasherBookingForRange(userName, start, end)) {
    return { ok: false, error: "tumbler_requires_washer_slot" };
  }

  const overlappingBooking = db
    .prepare(`
      SELECT id
      FROM bookings
      WHERE resource_type = ?
        AND resource_id = ?
        AND start_at < ?
        AND end_at > ?
        AND released_at IS NULL
      LIMIT 1
    `)
    .get(resourceType, resourceId, end.toISOString(), start.toISOString());

  if (overlappingBooking) {
    return { ok: false, error: "time_range_already_booked" };
  }

  if (resourceType === "drying_room" && hasUserOverlappingDryingRoomBooking(userName, start, end)) {
    return { ok: false, error: "drying_room_parallel_limit_reached" };
  }

  if (resourceType === "washer" && countUserWasherBookingsForDate(userName, start) >= 3) {
    return { ok: false, error: "washer_daily_limit_reached" };
  }

  const info = db
    .prepare(`
      INSERT INTO bookings (user_name, resource_type, resource_id, start_at, end_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(userName, resourceType, resourceId, start.toISOString(), end.toISOString());

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(info.lastInsertRowid);
  logBookingActivity("booking_created", booking);
  return { ok: true, booking };
}

function logBookingActivity(eventType, booking, customMessage = "") {
  db
    .prepare(`
      INSERT INTO activity_entries (event_type, user_name, resource_type, resource_id, start_at, end_at, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      eventType,
      booking.user_name,
      booking.resource_type,
      booking.resource_id,
      booking.start_at,
      booking.end_at,
      customMessage || activityMessage(eventType, booking)
    );
}

function latestActivityForBooking(eventType, booking) {
  return db
    .prepare(`
      SELECT *
      FROM activity_entries
      WHERE event_type = ?
        AND user_name = ?
        AND resource_type = ?
        AND resource_id = ?
        AND start_at = ?
        AND end_at = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `)
    .get(eventType, booking.user_name, booking.resource_type, booking.resource_id, booking.start_at, booking.end_at);
}

function activityMessage(eventType, booking) {
  const slot = `${resourceLabel(booking.resource_type)} ${booking.resource_id}, ${formatServerDate(booking.start_at)} ${formatServerTime(booking.start_at)}-${formatServerTime(booking.end_at)}`;
  if (eventType === "booking_created") {
    return `${slot} wurde gebucht.`;
  }
  if (eventType === "booking_deleted") {
    return `${slot} wurde geloescht.`;
  }
  if (eventType === "booking_released") {
    return `${slot} wurde frueher frei gemeldet.`;
  }
  if (eventType === "laundry_left") {
    return `${slot}: Waesche haengt noch.`;
  }

  return slot;
}

function bookingWithUser(id) {
  return db
    .prepare(`
      SELECT
        bookings.*,
        users.display_name AS user_display_name,
        users.apartment_label AS apartment_label
      FROM bookings
      LEFT JOIN users ON users.user_name = bookings.user_name
      WHERE bookings.id = ?
    `)
    .get(id);
}

function bookingPartyLabel(booking) {
  const parts = [];
  if (booking.apartment_label) {
    parts.push(booking.apartment_label);
  }
  if (booking.user_display_name) {
    parts.push(booking.user_display_name);
  }
  if (parts.length === 0) {
    parts.push(booking.user_name);
  }

  return parts.join(" - ");
}

function isConfiguredSlot(resourceType, start, end) {
  const startTime = timeKey(start);
  const endTime = timeKey(end);

  return (slots[resourceType] || []).some((slot) => slot.start === startTime && slot.end === endTime);
}

function countUserWasherBookingsForDate(userName, date) {
  const dayStart = startOfZonedDay(date);
  const dayEnd = addZonedDays(dayStart, 1);

  return db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE user_name = ?
        AND resource_type = 'washer'
        AND start_at >= ?
        AND start_at < ?
    `)
    .get(userName, dayStart.toISOString(), dayEnd.toISOString()).count;
}

function hasUserOverlappingDryingRoomBooking(userName, start, end) {
  return Boolean(db
    .prepare(`
      SELECT id
      FROM bookings
      WHERE user_name = ?
        AND resource_type = 'drying_room'
        AND start_at < ?
        AND end_at > ?
        AND released_at IS NULL
      LIMIT 1
    `)
    .get(userName, end.toISOString(), start.toISOString()));
}

function hasUserWasherBookingForRange(userName, start, end) {
  return Boolean(db
    .prepare(`
      SELECT id
      FROM bookings
      WHERE user_name = ?
        AND resource_type = 'washer'
        AND start_at <= ?
        AND end_at >= ?
        AND released_at IS NULL
      LIMIT 1
    `)
    .get(userName, start.toISOString(), end.toISOString()));
}

function hasOtherFutureSequence(userName, start) {
  const sequenceDate = dateKey(start);
  const nowIso = new Date().toISOString();
  const openFutureBookings = db
    .prepare(`
      SELECT start_at
      FROM bookings
      WHERE user_name = ?
        AND end_at > ?
    `)
    .all(userName, nowIso);

  return openFutureBookings.some((booking) => {
    const bookingStart = new Date(booking.start_at);
    return dateKey(bookingStart) !== sequenceDate;
  });
}

function timeKey(date) {
  return zonedParts(date).time;
}

function isBlockedDate(date) {
  return Boolean(db.prepare("SELECT date FROM blocked_dates WHERE date = ?").get(dateKey(date)));
}

function dateKey(date) {
  return zonedParts(date).date;
}

function listBlockedDates() {
  return db
    .prepare("SELECT date, label, created_at FROM blocked_dates ORDER BY date ASC")
    .all();
}

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function parseBookingDateTime(value) {
  const input = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) {
    return parseZonedDateTime(input);
  }

  return new Date(input);
}

function parseZonedDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return new Date(value);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const assumedUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const offsetMinutes = zonedOffsetMinutes(assumedUtc);
  return new Date(assumedUtc.getTime() - offsetMinutes * 60 * 1000);
}

function zonedOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: appTimeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit"
  }).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    weekday: weekdays[values.weekday] ?? date.getUTCDay()
  };
}

function zonedWeekday(date) {
  return zonedParts(date).weekday;
}

function startOfZonedDay(date) {
  return parseZonedDateTime(`${dateKey(date)}T00:00`);
}

function addZonedDays(date, days) {
  const [year, month, day] = dateKey(date).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0, 0));
  const key = [
    utc.getUTCFullYear(),
    String(utc.getUTCMonth() + 1).padStart(2, "0"),
    String(utc.getUTCDate()).padStart(2, "0")
  ].join("-");
  return parseZonedDateTime(`${key}T00:00`);
}

function defaultBlockedDateLabel(date) {
  const labels = {
    "2026-01-01": "Neujahr",
    "2026-04-03": "Karfreitag",
    "2026-04-06": "Ostermontag",
    "2026-05-01": "Tag der Arbeit",
    "2026-05-14": "Auffahrt",
    "2026-05-25": "Pfingstmontag",
    "2026-08-01": "Bundesfeier",
    "2026-12-25": "Weihnachten",
    "2026-12-26": "Stephanstag"
  };

  return labels[date] || "Sperrtag";
}

function resourceLabel(type) {
  const labels = {
    washer: "Waschmaschine",
    drying_room: "Trockenraum",
    tumbler: "Tumbler"
  };

  return labels[type] || type;
}

function formatServerDate(value) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeZone: "Europe/Zurich"
  }).format(new Date(value));
}

function formatServerTime(value) {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich"
  }).format(new Date(value));
}

function dateTimeStamp(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join("");
}

function ensureBookingSchema() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bookings'").get();
  if (!table || table.sql.includes("'tumbler'")) {
    return;
  }

  db.exec(`
    ALTER TABLE bookings RENAME TO bookings_old;

    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room', 'tumbler')),
      resource_id TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO bookings (id, user_name, resource_type, resource_id, start_at, end_at, created_at)
    SELECT id, user_name, resource_type, resource_id, start_at, end_at, created_at
    FROM bookings_old;

    DROP TABLE bookings_old;

    CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_user_name ON bookings(user_name);
  `);
}

app.listen(port, () => {
  console.log(`Washraum app listening on port ${port}`);
  console.log(`SQLite database: ${sqlitePath}`);
});
