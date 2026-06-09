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
const resources = {
  washer: ["WM 1", "WM 2", "WM 3"],
  drying_room: ["Trockenraum 1", "Trockenraum 2", "Trockenraum 3"],
  tumbler: ["Tumbler 1", "Tumbler 2"]
};
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blocked_dates (
    date TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_name ON bookings(user_name);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
`);

ensureBookingSchema();
ensureUserColumns();
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
      role: user.role
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
      role: auth.role
    }
  });
});

app.get("/api/resources", (_req, res) => {
  res.json({ resources, slots, blockedDates: listBlockedDates() });
});

app.get("/api/bookings", (_req, res) => {
  const bookings = db
    .prepare("SELECT * FROM bookings ORDER BY start_at ASC")
    .all();

  res.json({ bookings });
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
    const deleteUserSessions = db.prepare(`
      DELETE FROM sessions
      WHERE user_id IN (
        SELECT id FROM users WHERE user_name LIKE ?
      )
    `);
    const deleteUsers = db.prepare("DELETE FROM users WHERE user_name LIKE ?");

    const cleanup = db.transaction(() => {
      let bookingsDeleted = 0;
      let usersDeleted = 0;

      for (const prefix of safePrefixes) {
        deleteUserSessions.run(`${prefix}%`);
        bookingsDeleted += deleteBookings.run(`${prefix}%`).changes;
        usersDeleted += deleteUsers.run(`${prefix}%`).changes;
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
    .prepare("SELECT id, user_name, role, active, created_at FROM users ORDER BY user_name ASC")
    .all();

  res.json({ users });
});

app.post("/api/admin/users", (req, res) => {
  const auth = getAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const userName = String(req.body?.userName || "").trim();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "user").trim();
  const active = normalizeActive(req.body?.active);
  const validation = validateUserInput({ userName, password, role, requirePassword: true });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  try {
    const info = db
      .prepare("INSERT INTO users (user_name, password_hash, role, active) VALUES (?, ?, ?, ?)")
      .run(userName, hashPassword(password), role, active);
    const user = db
      .prepare("SELECT id, user_name, role, active, created_at FROM users WHERE id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json({ ok: true, user });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ ok: false, error: "user_already_exists" });
    }

    throw error;
  }
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
  const active = req.body?.active === undefined ? existingUser.active : normalizeActive(req.body.active);
  const validation = validateUserInput({ userName, password, role, requirePassword: false });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  if (existingUser.role === "admin" && (role !== "admin" || !active) && countAdmins() <= 1) {
    return res.status(400).json({ ok: false, error: "last_admin_required" });
  }

  try {
    if (password) {
      db
        .prepare("UPDATE users SET user_name = ?, password_hash = ?, role = ?, active = ? WHERE id = ?")
        .run(userName, hashPassword(password), role, active, id);
    } else {
      db
        .prepare("UPDATE users SET user_name = ?, role = ?, active = ? WHERE id = ?")
        .run(userName, role, active, id);
    }

    if (!active) {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    }

    const user = db
      .prepare("SELECT id, user_name, role, active, created_at FROM users WHERE id = ?")
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
  res.json({ ok: true });
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
  const insert = db.prepare("INSERT INTO users (user_name, password_hash, role) VALUES (?, ?, ?)");
  insert.run(process.env.SEED_ADMIN_NAME || "admin", hashPassword(seedAdminPassword), "admin");
  insert.run(process.env.SEED_USER_NAME || "user", hashPassword(seedUserPassword), "user");
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

function seedDefaultBlockedDates() {
  const insert = db.prepare("INSERT OR IGNORE INTO blocked_dates (date, label) VALUES (?, ?)");
  for (const blockedDate of defaultBlockedDates) {
    insert.run(blockedDate.date, blockedDate.label);
  }
}

function ensureUserColumns() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasActive = columns.some((column) => column.name === "active");

  if (!hasActive) {
    db.exec("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  }
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

function validateUserInput({ userName, password, role, requirePassword }) {
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

function createBooking(input) {
  const userName = String(input?.userName || "").trim();
  const resourceType = String(input?.resourceType || "").trim();
  const resourceId = String(input?.resourceId || "").trim();
  const startAt = String(input?.startAt || "").trim();
  const endAt = String(input?.endAt || "").trim();

  if (!userName || !resourceType || !resourceId || !startAt || !endAt) {
    return { ok: false, error: "missing_required_fields" };
  }

  if (!Object.prototype.hasOwnProperty.call(resources, resourceType)) {
    return { ok: false, error: "invalid_resource_type" };
  }

  if (!resources[resourceType].includes(resourceId)) {
    return { ok: false, error: "invalid_resource_id" };
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { ok: false, error: "invalid_time_range" };
  }

  if (start <= new Date()) {
    return { ok: false, error: "booking_must_be_in_future" };
  }

  if (start.getDay() === 0) {
    return { ok: false, error: "sunday_not_allowed" };
  }

  if (isBlockedDate(start)) {
    return { ok: false, error: "blocked_date" };
  }

  if (!isConfiguredSlot(resourceType, start, end)) {
    return { ok: false, error: "invalid_booking_slot" };
  }

  if (resourceType === "drying_room" || resourceType === "tumbler") {
    const nowIso = new Date().toISOString();
    const openFutureBooking = db
      .prepare("SELECT id FROM bookings WHERE user_name = ? AND resource_type = ? AND end_at > ? LIMIT 1")
      .get(userName, resourceType, nowIso);

    if (openFutureBooking) {
      return { ok: false, error: "only_one_future_booking_allowed" };
    }
  }

  const overlappingBooking = db
    .prepare(`
      SELECT id
      FROM bookings
      WHERE resource_type = ?
        AND resource_id = ?
        AND start_at < ?
        AND end_at > ?
      LIMIT 1
    `)
    .get(resourceType, resourceId, end.toISOString(), start.toISOString());

  if (overlappingBooking) {
    return { ok: false, error: "time_range_already_booked" };
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
  return { ok: true, booking };
}

function isConfiguredSlot(resourceType, start, end) {
  const startTime = timeKey(start);
  const endTime = timeKey(end);

  return (slots[resourceType] || []).some((slot) => slot.start === startTime && slot.end === endTime);
}

function countUserWasherBookingsForDate(userName, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

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

function timeKey(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isBlockedDate(date) {
  return Boolean(db.prepare("SELECT date FROM blocked_dates WHERE date = ?").get(dateKey(date)));
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
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
