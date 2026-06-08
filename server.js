const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const port = process.env.PORT || 3000;
const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, "data", "washraum.sqlite");
const resources = {
  washer: ["WM-1", "WM-2"],
  drying_room: ["TR-1", "TR-2"]
};

fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

const db = new Database(sqlitePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
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
    resource_type TEXT NOT NULL CHECK (resource_type IN ('washer', 'drying_room')),
    resource_id TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON bookings(start_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_name ON bookings(user_name);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
`);

seedDefaultUsers();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.redirect("/login.html");
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    sqlitePath,
    users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count
  });
});

app.post("/api/login", (req, res) => {
  const userName = String(req.body?.userName || "").trim();
  const password = String(req.body?.password || "");

  if (!userName || !password) {
    return res.status(400).json({ ok: false, error: "missing_login_fields" });
  }

  const user = db.prepare("SELECT * FROM users WHERE user_name = ?").get(userName);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ ok: false, error: "invalid_login" });
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
  res.json({ resources });
});

app.get("/api/bookings", (_req, res) => {
  const bookings = db
    .prepare("SELECT * FROM bookings ORDER BY start_at ASC")
    .all();

  res.json({ bookings });
});

if (process.env.NODE_ENV !== "production") {
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
    .prepare("SELECT id, user_name, role, created_at FROM users ORDER BY user_name ASC")
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
  const validation = validateUserInput({ userName, password, role, requirePassword: true });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  try {
    const info = db
      .prepare("INSERT INTO users (user_name, password_hash, role) VALUES (?, ?, ?)")
      .run(userName, hashPassword(password), role);
    const user = db
      .prepare("SELECT id, user_name, role, created_at FROM users WHERE id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json({ ok: true, user });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ ok: false, error: "user_already_exists" });
    }

    throw error;
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
  const validation = validateUserInput({ userName, password, role, requirePassword: false });

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  try {
    if (password) {
      db
        .prepare("UPDATE users SET user_name = ?, password_hash = ?, role = ? WHERE id = ?")
        .run(userName, hashPassword(password), role, id);
    } else {
      db
        .prepare("UPDATE users SET user_name = ?, role = ? WHERE id = ?")
        .run(userName, role, id);
    }

    const user = db
      .prepare("SELECT id, user_name, role, created_at FROM users WHERE id = ?")
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

  const insert = db.prepare("INSERT INTO users (user_name, password_hash, role) VALUES (?, ?, ?)");
  insert.run(process.env.SEED_ADMIN_NAME || "admin", hashPassword(process.env.SEED_ADMIN_PASSWORD || "admin123"), "admin");
  insert.run(process.env.SEED_USER_NAME || "user", hashPassword(process.env.SEED_USER_PASSWORD || "user123"), "user");
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

function createBooking(input) {
  const userName = String(input?.userName || "").trim();
  const resourceType = String(input?.resourceType || "").trim();
  const resourceId = String(input?.resourceId || "").trim();
  const startAt = String(input?.startAt || "").trim();
  const endAt = String(input?.endAt || "").trim();

  if (!userName || !resourceType || !resourceId || !startAt || !endAt) {
    return { ok: false, error: "missing_required_fields" };
  }

  if (!["washer", "drying_room"].includes(resourceType)) {
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

  if (start.getDay() === 0) {
    return { ok: false, error: "sunday_not_allowed" };
  }

  const nowIso = new Date().toISOString();
  const openFutureBooking = db
    .prepare("SELECT id FROM bookings WHERE user_name = ? AND end_at > ? LIMIT 1")
    .get(userName, nowIso);

  if (openFutureBooking) {
    return { ok: false, error: "only_one_future_booking_allowed" };
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

  const info = db
    .prepare(`
      INSERT INTO bookings (user_name, resource_type, resource_id, start_at, end_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(userName, resourceType, resourceId, start.toISOString(), end.toISOString());

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(info.lastInsertRowid);
  return { ok: true, booking };
}

app.listen(port, () => {
  console.log(`Washraum app listening on port ${port}`);
  console.log(`SQLite database: ${sqlitePath}`);
});
