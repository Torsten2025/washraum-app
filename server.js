const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const port = process.env.PORT || 3000;
const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, "data", "washraum.sqlite");

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

app.get("/api/bookings", (_req, res) => {
  const bookings = db
    .prepare("SELECT * FROM bookings ORDER BY start_at ASC")
    .all();

  res.json({ bookings });
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
  insert.run("admin", hashPassword("admin123"), "admin");
  insert.run("user", hashPassword("user123"), "user");
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
