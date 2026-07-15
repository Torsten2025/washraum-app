const fs = require('fs');
const crypto = require('crypto');
const net = require('net');
const os = require('os');
const path = require('path');
const tls = require('tls');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { releaseWindowStatus } = require('./release-window');
const {
  addDays,
  isDateString,
  isPastSwissDate,
  isPastSwissSlot,
  swissDateString,
  weekdayForDate
} = require('./swiss-time');

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const localDbPath = path.join(__dirname, 'data', 'washraum.sqlite');
const renderDbPath = '/var/data/washraum.sqlite';
const dbPath = path.resolve(
  process.env.DB_PATH
  || process.env.SQLITE_PATH
  || (process.env.RENDER === 'true' ? renderDbPath : localDbPath)
);
const dbDir = path.dirname(dbPath);

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

class BetterSqliteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.db = database;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        expired INTEGER NOT NULL,
        sess TEXT NOT NULL
      )
    `);
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?')
        .get(sid, Date.now());
      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sess, callback = () => {}) {
    try {
      const expires = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
      this.db.prepare(`
        INSERT INTO sessions (sid, expired, sess)
        VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET expired = excluded.expired, sess = excluded.sess
      `).run(sid, expires, JSON.stringify(sess));
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sess, callback = () => {}) {
    try {
      const expires = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
      this.db.prepare('UPDATE sessions SET expired = ? WHERE sid = ?').run(expires, sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

const configuredSessionSecret = process.env.SESSION_SECRET || 'local-dev-session-secret';
const sessionSecret = isProduction && configuredSessionSecret.length < 32
  ? crypto.randomBytes(48).toString('hex')
  : configuredSessionSecret;
if (isProduction && configuredSessionSecret.length < 32) {
  console.warn('SESSION_SECRET ist zu kurz. Fuer diesen Start wurde ein sicheres, zufaelliges Geheimnis erzeugt.');
}
const slots = [
  '07:00-12:00',
  '12:00-17:00',
  '17:00-21:00'
];

function createCurrentTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS houses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL COLLATE NOCASE UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      house_id INTEGER,
      is_superadmin INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      notify_releases INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('washer', 'drying_room', 'tumbler')),
      house_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      slot TEXT NOT NULL,
      group_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      UNIQUE (resource_id, booking_date, slot)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS release_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_name TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      slot TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'early_release',
      message TEXT NOT NULL,
      house_id INTEGER,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS fixed_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 6),
      slot TEXT NOT NULL,
      label TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (resource_id, weekday, slot)
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY,
      resource_type TEXT NOT NULL DEFAULT 'all' CHECK (resource_type IN ('all', 'washer', 'drying_room', 'tumbler')),
      weekday INTEGER CHECK (weekday BETWEEN 1 AND 6),
      slot TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

function seedCurrentDefaults() {
  ensureColumn('users', 'active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'email', 'TEXT');
  ensureColumn('users', 'notify_releases', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'house_id', 'INTEGER');
  ensureColumn('users', 'is_superadmin', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('resources', 'house_id', 'INTEGER');
  ensureColumn('bookings', 'group_id', 'TEXT');
  ensureColumn('release_notices', 'kind', "TEXT NOT NULL DEFAULT 'early_release'");
  ensureColumn('release_notices', 'house_id', 'INTEGER');
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL AND email != ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_houses_code_lower ON houses (lower(code))");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings (group_id) WHERE group_id IS NOT NULL");
  const initialHouseCode = getSetting('house_code').trim()
    || process.env.HOUSE_CODE
    || (isProduction ? `GBMZ-${crypto.randomBytes(5).toString('hex')}` : 'GBMZ Maneggplatz 18');
  const defaultHouse = seedHouse(process.env.HOUSE_NAME || 'Maneggplatz 18', initialHouseCode);
  db.prepare('UPDATE users SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare('UPDATE resources SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare('UPDATE release_notices SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);

  const seededAdminPassword = String(process.env.SEED_ADMIN_PASSWORD || '');
  if (seededAdminPassword) {
    seedUser(process.env.SEED_ADMIN_NAME || 'admin', seededAdminPassword, 'admin', defaultHouse.id, true);
  } else if (!isProduction) {
    seedUser('admin', 'admin123', 'admin', defaultHouse.id, true);
  }
  if (!isProduction) {
    seedUser('user', 'user123', 'user', defaultHouse.id);
  }
  seedHouseResources(defaultHouse.id);
  seedSetting('house_code', initialHouseCode);

  const superadmin = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_superadmin = 1 LIMIT 1").get();
  if (!superadmin) {
    db.prepare(`
      UPDATE users SET is_superadmin = 1
      WHERE id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
    `).run();
  }
}

function tableExists(table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function tableColumns(table) {
  if (!tableExists(table)) {
    return [];
  }
  return db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function readLegacyDatabase() {
  const userColumns = tableColumns('users');
  if (!userColumns.includes('user_name') || userColumns.includes('username')) {
    return null;
  }

  return {
    users: db.prepare('SELECT * FROM users').all(),
    bookings: tableExists('bookings') ? db.prepare('SELECT * FROM bookings').all() : [],
    fixedBookings: tableExists('fixed_bookings') ? db.prepare('SELECT * FROM fixed_bookings').all() : []
  };
}

function migrateLegacyUsers(users) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users
      (id, username, email, password_hash, role, active, notify_releases, created_at)
    VALUES
      (@id, @username, @email, @passwordHash, @role, @active, @notifyReleases, @createdAt)
  `);

  for (const user of users) {
    const username = String(user.user_name || '').trim();
    const passwordHash = String(user.password_hash || '');
    const isTestAccount = username === 'user'
      || /^(PartyTest-|Smoke-|Managed-)/i.test(username);
    if (!username || !passwordHash || isTestAccount) {
      continue;
    }

    insert.run({
      id: user.id,
      username,
      email: user.email || null,
      passwordHash,
      role: user.role === 'admin' ? 'admin' : 'user',
      active: user.active === 0 ? 0 : 1,
      notifyReleases: user.notify_releases === 0 ? 0 : 1,
      createdAt: user.created_at || new Date().toISOString()
    });
  }
}

function legacySlot(row) {
  const slotById = {
    'slot-1': slots[0],
    'slot-2': slots[1],
    'slot-3': slots[2]
  };
  if (slotById[row.slot_id]) {
    return slotById[row.slot_id];
  }

  const match = String(row.start_at || '').match(/[T ](\d{2}:\d{2})/);
  const slotByStart = {
    '07:00': slots[0],
    '12:00': slots[1],
    '17:00': slots[2]
  };
  return match ? slotByStart[match[1]] || '' : '';
}

function legacyResourceName(type, resourceId) {
  const number = String(resourceId || '').match(/(\d+)/)?.[1];
  if (!number) {
    return '';
  }
  if (type === 'washer') {
    return `Waschmaschine ${number}`;
  }
  if (type === 'drying_room') {
    return `Trockenraum ${number}`;
  }
  if (type === 'tumbler') {
    return `Tumbler ${number}`;
  }
  return '';
}

function findMigratedUser(username) {
  return db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(String(username || '').trim());
}

function findMigratedResource(type, resourceId) {
  const name = legacyResourceName(type, resourceId);
  return name ? db.prepare('SELECT id FROM resources WHERE type = ? AND name = ?').get(type, name) : null;
}

function migrateLegacyBookings(bookings) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO bookings
      (id, user_id, resource_id, booking_date, slot, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let migrated = 0;

  for (const booking of bookings) {
    if (booking.released_at) {
      continue;
    }
    const user = findMigratedUser(booking.user_name);
    const resource = findMigratedResource(booking.resource_type, booking.resource_id);
    const bookingDate = String(booking.start_at || '').slice(0, 10);
    const slot = legacySlot(booking);
    if (!user || !resource || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !slot) {
      continue;
    }

    const result = insert.run(
      booking.id || null,
      user.id,
      resource.id,
      bookingDate,
      slot,
      booking.created_at || new Date().toISOString()
    );
    migrated += result.changes;
  }
  return migrated;
}

function migrateLegacyFixedBookings(fixedBookings) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO fixed_bookings
      (id, resource_id, weekday, slot, label, active, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let migrated = 0;

  for (const booking of fixedBookings) {
    const resource = findMigratedResource(booking.resource_type, booking.resource_id);
    const creator = findMigratedUser(booking.created_by);
    const slot = legacySlot(booking);
    const weekday = Number(booking.weekday);
    if (!resource || !slot || !Number.isInteger(weekday) || weekday < 1 || weekday > 6) {
      continue;
    }

    const result = insert.run(
      booking.id || null,
      resource.id,
      weekday,
      slot,
      String(booking.label || 'Feste Buchung'),
      booking.active === 0 ? 0 : 1,
      creator?.id || null,
      booking.created_at || new Date().toISOString()
    );
    migrated += result.changes;
  }
  return migrated;
}

function migrateLegacyDatabase(legacy) {
  db.pragma('foreign_keys = OFF');
  let migratedBookings = 0;
  let migratedFixedBookings = 0;
  try {
    db.transaction(() => {
      db.exec(`
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS fixed_bookings;
        DROP TABLE IF EXISTS bookings;
        DROP TABLE IF EXISTS users;
      `);
      createCurrentTables();
      migrateLegacyUsers(legacy.users);
      seedCurrentDefaults();
      migratedBookings = migrateLegacyBookings(legacy.bookings);
      migratedFixedBookings = migrateLegacyFixedBookings(legacy.fixedBookings);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }

  console.log(
    `Legacy-Datenbank migriert: ${legacy.users.length} Konten, ${migratedBookings} Buchungen, ${migratedFixedBookings} feste Buchungen.`
  );
}

function initDb() {
  const legacy = readLegacyDatabase();
  if (legacy) {
    migrateLegacyDatabase(legacy);
    return;
  }

  createCurrentTables();
  seedCurrentDefaults();
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seedUser(username, password, role, houseId, isSuperadmin = false) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!exists) {
    db.prepare('INSERT INTO users (username, password_hash, role, house_id, is_superadmin) VALUES (?, ?, ?, ?, ?)')
      .run(username, bcrypt.hashSync(password, 10), role, houseId, isSuperadmin ? 1 : 0);
  } else {
    db.prepare(`
      UPDATE users
      SET house_id = COALESCE(house_id, ?),
          is_superadmin = CASE WHEN ? = 1 THEN 1 ELSE is_superadmin END
      WHERE id = ?
    `).run(houseId, isSuperadmin ? 1 : 0, exists.id);
  }
}

function seedHouse(name, code) {
  const existing = db.prepare('SELECT id, name, code, active FROM houses WHERE lower(name) = lower(?)').get(name);
  if (existing) {
    return existing;
  }
  const result = db.prepare('INSERT INTO houses (name, code) VALUES (?, ?)').run(name, code);
  return db.prepare('SELECT id, name, code, active FROM houses WHERE id = ?').get(result.lastInsertRowid);
}

function seedResource(name, type, houseId) {
  const exists = db.prepare('SELECT id FROM resources WHERE name = ? AND house_id = ?').get(name, houseId);
  if (!exists) {
    db.prepare('INSERT INTO resources (name, type, house_id) VALUES (?, ?, ?)').run(name, type, houseId);
  }
}

function seedHouseResources(houseId) {
  seedResource('Waschmaschine 1', 'washer', houseId);
  seedResource('Waschmaschine 2', 'washer', houseId);
  seedResource('Waschmaschine 3', 'washer', houseId);
  seedResource('Trockenraum 1', 'drying_room', houseId);
  seedResource('Trockenraum 2', 'drying_room', houseId);
  seedResource('Trockenraum 3', 'drying_room', houseId);
  seedResource('Tumbler 1', 'tumbler', houseId);
  seedResource('Tumbler 2', 'tumbler', houseId);
}

function seedSetting(key, value) {
  const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
  if (!exists) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value));
}

function isBcryptHash(hash) {
  return /^\$2[aby]\$\d{2}\$/.test(String(hash || ''));
}

function verifyStoredPassword(password, storedHash) {
  const hash = String(storedHash || '');
  if (isBcryptHash(hash)) {
    return bcrypt.compareSync(password, hash);
  }

  const [salt, legacyHash] = hash.split(':');
  if (!salt || !/^[a-f\d]{128}$/i.test(legacyHash || '')) {
    return false;
  }

  try {
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(legacyHash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
  } catch {
    return false;
  }
}

initDb();

const activeAdminAtStartup = db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get();
if (isProduction && !activeAdminAtStartup) {
  console.warn('Kein aktives Admin-Konto vorhanden. Zur Wiederherstellung SEED_ADMIN_PASSWORD in Render setzen.');
}

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'"
  ].join('; '));
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  const origin = String(req.get('origin') || '');
  const fetchSite = String(req.get('sec-fetch-site') || '').toLowerCase();
  if (!origin) {
    if (fetchSite === 'cross-site') {
      return res.status(403).json({ error: 'Anfrage von einer fremden Website abgelehnt.' });
    }
    return next();
  }
  try {
    const requestOrigin = new URL(origin).origin;
    const currentOrigin = new URL(`${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`).origin;
    const configuredOrigin = process.env.PUBLIC_APP_URL ? new URL(process.env.PUBLIC_APP_URL).origin : '';
    if (requestOrigin !== currentOrigin && requestOrigin !== configuredOrigin) {
      return res.status(403).json({ error: 'Anfrage von einer fremden Website abgelehnt.' });
    }
  } catch {
    return res.status(403).json({ error: 'Ung\u00fcltiger Anfrage-Ursprung.' });
  }
  next();
});
app.use(session({
  store: new BetterSqliteSessionStore(db),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use((req, res, next) => {
  if (!req.session.user?.id) {
    return next();
  }
  const storedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!storedUser || !storedUser.active) {
    req.session.user = null;
    req.session.activeHouseId = null;
    return next();
  }

  const requestedHouseId = storedUser.is_superadmin
    ? Number(req.session.activeHouseId || req.session.user.activeHouseId || storedUser.house_id)
    : storedUser.house_id;
  const activeHouse = db.prepare('SELECT id, name FROM houses WHERE id = ? AND active = 1').get(requestedHouseId)
    || db.prepare('SELECT id, name FROM houses WHERE id = ?').get(storedUser.house_id);
  req.session.activeHouseId = activeHouse?.id || storedUser.house_id;
  req.session.user = sessionUserFromRow(storedUser, activeHouse);
  next();
});

function todayStringLocal() {
  return swissDateString();
}

function getFixedBookingsForDate(dateString, houseId) {
  const weekday = weekdayForDate(dateString);
  if (weekday === 0) {
    return [];
  }

  return db.prepare(`
    SELECT 'fixed-' || fb.id AS id, ? AS booking_date, fb.slot, r.id AS resource_id, r.name AS resource_name,
           r.type AS resource_type, NULL AS user_id, fb.label AS username,
           1 AS is_fixed, fb.weekday
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1
      AND r.active = 1
      AND r.house_id = ?
      AND fb.weekday = ?
    ORDER BY fb.slot, r.name
  `).all(dateString, houseId, weekday);
}

function fixedBookingConflict(resourceId, dateString, slot, houseId) {
  const weekday = weekdayForDate(dateString);
  if (weekday === 0) {
    return null;
  }

  return db.prepare(`
    SELECT fb.id, fb.label, r.name AS resource_name
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1
      AND fb.resource_id = ?
      AND r.house_id = ?
      AND fb.weekday = ?
      AND fb.slot = ?
    LIMIT 1
  `).get(Number(resourceId), houseId, weekday, slot);
}

function allowedDryingRoomSlots(washDate, washSlot) {
  const nextDate = addDays(washDate, 1);

  if (washSlot === '07:00-12:00') {
    return [
      { date: washDate, slot: '07:00-12:00' },
      { date: washDate, slot: '12:00-17:00' },
      { date: washDate, slot: '17:00-21:00' }
    ];
  }

  if (washSlot === '12:00-17:00') {
    return [
      { date: washDate, slot: '12:00-17:00' },
      { date: washDate, slot: '17:00-21:00' },
      { date: nextDate, slot: '07:00-12:00' }
    ];
  }

  if (washSlot === '17:00-21:00') {
    return [
      { date: washDate, slot: '17:00-21:00' },
      { date: nextDate, slot: '07:00-12:00' }
    ];
  }

  return [];
}

function hasAllowedDryingRoomWindow(userId, date, slot, houseId) {
  const previousDate = addDays(date, -1);
  const washerBookings = db.prepare(`
    SELECT b.booking_date, b.slot
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND r.house_id = ?
      AND b.booking_date IN (?, ?)
  `).all(userId, houseId, date, previousDate);

  return washerBookings.some((booking) => (
    allowedDryingRoomSlots(booking.booking_date, booking.slot)
      .some((allowed) => allowed.date === date && allowed.slot === slot)
  ));
}

function validateWasherBooking(userId, date, slot, houseId) {
  const today = todayStringLocal();
  const washerBookings = db.prepare(`
    SELECT b.booking_date, b.slot
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND r.house_id = ?
      AND b.booking_date >= ?
  `).all(userId, houseId, today);

  const sameDayDifferentSlot = washerBookings.find((booking) => (
    booking.booking_date === date && booking.slot !== slot
  ));
  if (sameDayDifferentSlot) {
    return 'Pro Waschtag darf nur ein Waschmaschinen-Slot reserviert werden.';
  }

  const otherFutureWashDay = washerBookings.find((booking) => (
    booking.booking_date > today && booking.booking_date !== date
  ));
  if (date > today && otherFutureWashDay) {
    return 'Der n\u00e4chste Waschslot kann fr\u00fchestens am bestehenden Waschtag reserviert werden.';
  }

  return '';
}

function validateTumblerBooking(date, slot, houseId) {
  const totalTumblers = db.prepare(`
    SELECT COUNT(*) AS count
    FROM resources
    WHERE active = 1 AND type = 'tumbler' AND house_id = ?
  `).get(houseId).count;

  const bookedTumblers = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.type = 'tumbler'
      AND r.house_id = ?
      AND b.booking_date = ?
      AND b.slot = ?
  `).get(houseId, date, slot).count;

  const fixedTumblers = db.prepare(`
    SELECT COUNT(*) AS count
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1
      AND r.type = 'tumbler'
      AND r.house_id = ?
      AND fb.weekday = ?
      AND fb.slot = ?
  `).get(houseId, weekdayForDate(date), slot).count;

  if (bookedTumblers + fixedTumblers >= Math.max(0, totalTumblers - 1)) {
    return 'Mindestens ein Tumbler muss am Ende des Waschslots frei bleiben.';
  }

  return '';
}

function validateDryingRoomBooking(userId, date, slot, houseId) {
  const userDryingRoomInSlot = db.prepare(`
    SELECT b.id
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'drying_room'
      AND r.house_id = ?
      AND b.booking_date = ?
      AND b.slot = ?
    LIMIT 1
  `).get(userId, houseId, date, slot);

  if (userDryingRoomInSlot) {
    return 'Pro Slot kann nur ein Trockenraum reserviert werden.';
  }

  if (!hasAllowedDryingRoomWindow(userId, date, slot, houseId)) {
    return 'Trockenr\u00e4ume k\u00f6nnen nur passend zu deiner Waschmaschinen-Buchung reserviert werden: 07:00 bis 21:00, 12:00 bis Folgetag 12:00, 17:00 bis Folgetag 12:00.';
  }

  return '';
}

function calendarDaySummary(userId, date, houseId) {
  const activeResources = db.prepare(`
    SELECT id, type
    FROM resources
    WHERE active = 1 AND house_id = ?
  `).all(houseId);
  const normalBookings = db.prepare(`
    SELECT b.resource_id, b.slot, b.user_id, r.type AS resource_type
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.booking_date = ? AND r.house_id = ?
  `).all(date, houseId);
  const fixedBookings = getFixedBookingsForDate(date, houseId);
  const occupied = new Set([
    ...normalBookings.map((booking) => `${booking.resource_id}|${booking.slot}`),
    ...fixedBookings.map((booking) => `${booking.resource_id}|${booking.slot}`)
  ]);
  const availability = {};
  const ownByType = { washer: 0, drying_room: 0, tumbler: 0 };

  for (const booking of normalBookings) {
    if (booking.user_id === userId) {
      ownByType[booking.resource_type] += 1;
    }
  }

  for (const type of ['washer', 'drying_room', 'tumbler']) {
    const typeResources = activeResources.filter((resource) => resource.type === type);
    let free = 0;
    let total = 0;
    let freeSlots = 0;
    let totalSlots = 0;

    for (const slot of slots) {
      if (isPastSlot(date, slot)) {
        continue;
      }
      const capacity = type === 'tumbler'
        ? Math.max(0, typeResources.length - 1)
        : typeResources.length;
      const occupiedCount = typeResources
        .filter((resource) => occupied.has(`${resource.id}|${slot}`)).length;
      const freeCapacity = Math.max(0, capacity - occupiedCount);
      total += capacity;
      free += freeCapacity;
      totalSlots += capacity > 0 ? 1 : 0;
      freeSlots += freeCapacity > 0 ? 1 : 0;
    }

    availability[type] = { free, total, freeSlots, totalSlots };
  }

  return {
    date,
    availability,
    ownBookings: Object.values(ownByType).reduce((sum, count) => sum + count, 0),
    ownByType
  };
}

function findAvailableResource(userId, type, date, slot, houseId) {
  if (isPastSlot(date, slot)) {
    return null;
  }

  let ruleError = '';
  if (type === 'washer') {
    ruleError = validateWasherBooking(userId, date, slot, houseId);
  } else if (type === 'drying_room') {
    ruleError = validateDryingRoomBooking(userId, date, slot, houseId);
  } else if (type === 'tumbler') {
    ruleError = validateTumblerBooking(date, slot, houseId);
  }
  if (ruleError) {
    return null;
  }

  return db.prepare(`
    SELECT r.id, r.name, r.type
    FROM resources r
    WHERE r.active = 1
      AND r.type = ?
      AND r.house_id = ?
      AND NOT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.resource_id = r.id
          AND b.booking_date = ?
          AND b.slot = ?
      )
      AND NOT EXISTS (
        SELECT 1
        FROM fixed_bookings fb
        WHERE fb.resource_id = r.id
          AND fb.active = 1
          AND fb.weekday = ?
          AND fb.slot = ?
      )
    ORDER BY r.name
    LIMIT 1
  `).get(type, houseId, date, slot, weekdayForDate(date), slot) || null;
}

function userHasBookingInWindow(userId, type, window, houseId) {
  return window.some(({ date, slot }) => Boolean(db.prepare(`
    SELECT b.id
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = ?
      AND r.house_id = ?
      AND b.booking_date = ?
      AND b.slot = ?
    LIMIT 1
  `).get(userId, type, houseId, date, slot)));
}

function findAvailableResourceForWindow(type, window, houseId) {
  if (!window.length || window.some((item) => isPastSlot(item.date, item.slot) || isSunday(item.date))) {
    return null;
  }

  const resourcesForType = db.prepare(`
    SELECT id, name, type
    FROM resources
    WHERE active = 1 AND type = ? AND house_id = ?
    ORDER BY name
  `).all(type, houseId);
  const occupied = db.prepare(`
    SELECT id
    FROM bookings
    WHERE resource_id = ? AND booking_date = ? AND slot = ?
    LIMIT 1
  `);

  return resourcesForType.find((resource) => window.every((item) => (
    !occupied.get(resource.id, item.date, item.slot)
    && !fixedBookingConflict(resource.id, item.date, item.slot, houseId)
  ))) || null;
}

function bestDryingRoomWindow(washDate, washSlot, houseId) {
  const allowedWindow = allowedDryingRoomSlots(washDate, washSlot);
  for (let length = allowedWindow.length; length >= 1; length -= 1) {
    const window = allowedWindow.slice(0, length);
    const resource = findAvailableResourceForWindow('drying_room', window, houseId);
    if (resource) {
      return { resource, maxWindow: window };
    }
  }
  return null;
}

function dryingWindowOptions(resource, maxWindow) {
  const lengths = [...new Set([1, Math.min(2, maxWindow.length), maxWindow.length])];
  return lengths.map((length) => {
    const window = maxWindow.slice(0, length);
    const end = window[window.length - 1];
    const dateLabel = end.date === window[0].date ? '' : ` am ${end.date}`;
    return {
      id: length === 1 ? 'short' : length === maxWindow.length ? 'max' : 'standard',
      label: `${length === 1 ? 'Kurz' : length === maxWindow.length ? 'Maximal' : 'Standard'} - bis ${end.slot.split('-')[1]}${dateLabel}`,
      bookings: window.map((booking) => ({
        resourceId: resource.id,
        date: booking.date,
        slot: booking.slot
      }))
    };
  });
}

function packageComponent(type, resource, bookings, options = {}) {
  return {
    id: type,
    type,
    resourceName: resource.name,
    required: Boolean(options.required),
    existing: Boolean(options.existing),
    selectedByDefault: Boolean(options.required || options.selectedByDefault),
    recommendationLabel: String(options.recommendationLabel || ''),
    bookingOptions: options.bookingOptions || [],
    selectedOption: String(options.selectedOption || ''),
    bookings: bookings.map((booking) => ({
      resourceId: resource.id,
      date: booking.date,
      slot: booking.slot
    }))
  };
}

function companionPackageRecommendation(userId, washerBooking, houseId) {
  const components = [packageComponent('washer', {
    id: washerBooking.resource_id,
    name: washerBooking.resource_name
  }, [], { required: true, existing: true })];
  const dryingWindow = allowedDryingRoomSlots(washerBooking.booking_date, washerBooking.slot);

  if (!userHasBookingInWindow(userId, 'drying_room', dryingWindow, houseId)) {
    const drying = bestDryingRoomWindow(washerBooking.booking_date, washerBooking.slot, houseId);
    if (drying) {
      const suggestedWindow = drying.maxWindow.slice(0, Math.min(2, drying.maxWindow.length));
      const options = dryingWindowOptions(drying.resource, drying.maxWindow);
      components.push(packageComponent('drying_room', drying.resource, suggestedWindow, {
        selectedByDefault: true,
        recommendationLabel: 'Empfohlen',
        bookingOptions: options,
        selectedOption: options.find((option) => option.bookings.length === suggestedWindow.length)?.id
      }));
    }
  }

  const tumblerWindow = [{ date: washerBooking.booking_date, slot: washerBooking.slot }];
  if (!userHasBookingInWindow(userId, 'tumbler', tumblerWindow, houseId)) {
    const tumbler = findAvailableResource(
      userId,
      'tumbler',
      washerBooking.booking_date,
      washerBooking.slot,
      houseId
    );
    if (tumbler) {
      const hasDryingRoom = components.some((component) => component.type === 'drying_room');
      components.push(packageComponent('tumbler', tumbler, tumblerWindow, {
        selectedByDefault: !hasDryingRoom,
        recommendationLabel: hasDryingRoom ? 'Optional' : 'Alternative'
      }));
    }
  }

  if (components.length === 1) {
    return null;
  }
  const hasDryingRoom = components.some((component) => component.type === 'drying_room');

  return {
    kind: 'package',
    washerBookingId: washerBooking.id,
    date: washerBooking.booking_date,
    slot: washerBooking.slot,
    resourceType: 'washer',
    title: 'Waschpaket erg\u00e4nzen',
    reason: hasDryingRoom
      ? 'Die Waschmaschine ist bereits gebucht. Der Trockenraum ist passend eingeplant; den Tumbler kannst du bei Bedarf zus\u00e4tzlich ausw\u00e4hlen.'
      : 'Die Waschmaschine ist bereits gebucht. F\u00fcr diesen Zeitraum ist kein durchg\u00e4ngig freier Trockenraum verf\u00fcgbar; der Tumbler ist die passende Alternative.',
    actionLabel: 'Paket erg\u00e4nzen',
    components
  };
}

function washerHistoryPreference(userId, houseId) {
  return db.prepare(`
    SELECT CAST(strftime('%w', b.booking_date) AS INTEGER) AS weekday,
           b.slot,
           COUNT(*) AS count,
           MAX(b.booking_date) AS last_date
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND r.house_id = ?
      AND b.booking_date < ?
    GROUP BY weekday, b.slot
    ORDER BY count DESC, last_date DESC
    LIMIT 1
  `).get(userId, houseId, todayStringLocal()) || null;
}

function washerPackageRecommendation(userId, washer, reason, houseId) {
  const washWindow = [{ date: washer.date, slot: washer.slot }];
  const components = [packageComponent('washer', washer.resource, washWindow, { required: true })];
  const drying = bestDryingRoomWindow(washer.date, washer.slot, houseId);
  const tumbler = findAvailableResource(userId, 'tumbler', washer.date, washer.slot, houseId);

  if (drying) {
    const suggestedWindow = drying.maxWindow.slice(0, Math.min(2, drying.maxWindow.length));
    const options = dryingWindowOptions(drying.resource, drying.maxWindow);
    components.push(packageComponent('drying_room', drying.resource, suggestedWindow, {
      selectedByDefault: true,
      recommendationLabel: 'Empfohlen',
      bookingOptions: options,
      selectedOption: options.find((option) => option.bookings.length === suggestedWindow.length)?.id
    }));
  }
  if (tumbler) {
    const hasDryingRoom = components.some((component) => component.type === 'drying_room');
    components.push(packageComponent('tumbler', tumbler, washWindow, {
      selectedByDefault: !hasDryingRoom,
      recommendationLabel: hasDryingRoom ? 'Optional' : 'Alternative'
    }));
  }
  if (components.length === 1) {
    return null;
  }
  const hasDryingRoom = components.some((component) => component.type === 'drying_room');

  return {
    kind: 'package',
    date: washer.date,
    slot: washer.slot,
    resourceType: 'washer',
    title: 'Dein Waschpaket',
    reason: hasDryingRoom
      ? `${reason} Der Trockenraum ist passend eingeplant; den Tumbler kannst du bei Bedarf zus\u00e4tzlich ausw\u00e4hlen.`
      : `${reason} In den n\u00e4chsten passenden Zeiten ist kein Trockenraum durchg\u00e4ngig frei; der Tumbler ist die verf\u00fcgbare Alternative.`,
    actionLabel: 'Waschpaket buchen',
    components
  };
}

function nextWasherRecommendation(userId, startDate, houseId) {
  const preference = washerHistoryPreference(userId, houseId);
  const candidates = [];
  let fallback = null;
  let compactPackage = null;
  let compactPackageScore = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDays(startDate, offset);
    const weekday = weekdayForDate(date);
    if (weekday === 0) {
      continue;
    }
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      const slot = slots[slotIndex];
      const score = preference
        ? offset + (weekday === preference.weekday ? 0 : 8) + (slot === preference.slot ? 0 : 4)
        : offset * slots.length + slotIndex;
      candidates.push({ date, slot, weekday, score });
    }
  }
  candidates.sort((left, right) => left.score - right.score || left.date.localeCompare(right.date));

  for (const candidate of candidates) {
    if (compactPackage && candidate.score > compactPackageScore + 4) {
      break;
    }
    if (releaseWindowStatus(candidate.date, candidate.slot).reason !== 'not_started') {
      continue;
    }
    const resource = findAvailableResource(userId, 'washer', candidate.date, candidate.slot, houseId);
    if (!resource) {
      continue;
    }
    const matchesHabit = Boolean(
      preference
      && candidate.weekday === preference.weekday
      && candidate.slot === preference.slot
    );
    const reason = preference
      ? (matchesHabit
        ? 'Dieser freie Termin entspricht deinem bisher h\u00e4ufigsten Waschrhythmus.'
        : 'Dein \u00fcblicher Termin ist belegt. Dies ist die n\u00e4chste passende freie Option.')
      : 'Ein fr\u00fcher freier Termin f\u00fcr deinen ersten Waschrhythmus.';
    const washer = {
      kind: 'booking',
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      date: candidate.date,
      slot: candidate.slot,
      title: preference ? 'Dein passender Waschslot' : 'N\u00e4chster freier Waschslot',
      reason,
      actionLabel: 'Direkt buchen'
    };
    fallback ||= washer;
    const packageRecommendation = washerPackageRecommendation(userId, {
      resource,
      date: candidate.date,
      slot: candidate.slot
    }, reason, houseId);
    if (packageRecommendation) {
      if (packageRecommendation.components.some((component) => component.type === 'drying_room')) {
        return packageRecommendation;
      }
      if (!compactPackage) {
        compactPackage = packageRecommendation;
        compactPackageScore = candidate.score;
      }
    }
  }
  return compactPackage || fallback;
}

function bookingRecommendation(userId, houseId) {
  const today = todayStringLocal();
  const upcomingWashers = db.prepare(`
    SELECT b.id, b.booking_date, b.slot, r.id AS resource_id, r.name AS resource_name
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND r.house_id = ?
      AND b.booking_date >= ?
    ORDER BY b.booking_date, b.slot, b.id
  `).all(userId, houseId, today);

  for (const washerBooking of upcomingWashers) {
    const companion = companionPackageRecommendation(userId, washerBooking, houseId);
    if (companion) {
      return companion;
    }
  }

  const futureWasher = upcomingWashers.find((booking) => booking.booking_date > today);
  if (futureWasher) {
    return {
      kind: 'info',
      date: futureWasher.booking_date,
      slot: futureWasher.slot,
      title: 'Dein n\u00e4chster Waschtag steht',
      reason: 'Waschmaschine und sinnvolle Erg\u00e4nzungen sind bereits geplant.'
    };
  }

  const startDate = upcomingWashers.some((booking) => booking.booking_date === today)
    ? addDays(today, 1)
    : today;
  return nextWasherRecommendation(userId, startDate, houseId) || {
    kind: 'info',
    title: 'Im Moment kein freier Vorschlag',
    reason: 'In den n\u00e4chsten drei Wochen ist kein regelkonformer Waschslot frei.'
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  next();
}

const authRateBuckets = new Map();
const ipRateBuckets = new Map();
const authRateWindowMs = 15 * 60 * 1000;
const authRateMaxAttempts = 20;

function authRateLimit(req, res, next) {
  const now = Date.now();
  const identity = normalizeEmail(req.body?.username || req.body?.email || 'unknown');
  const key = `${String(req.ip || req.socket.remoteAddress || 'unknown')}|${identity}`;
  let bucket = authRateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { attempts: 0, resetAt: now + authRateWindowMs };
  }
  bucket.attempts += 1;
  authRateBuckets.set(key, bucket);
  req.authRateKey = key;

  if (bucket.attempts > authRateMaxAttempts) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte versuche es in einigen Minuten erneut.' });
  }

  if (authRateBuckets.size > 500) {
    for (const [bucketKey, value] of authRateBuckets) {
      if (value.resetAt <= now) {
        authRateBuckets.delete(bucketKey);
      }
    }
    if (authRateBuckets.size > 1000) {
      authRateBuckets.delete(authRateBuckets.keys().next().value);
    }
  }
  next();
}

function ipRateLimit({ windowMs, maxAttempts, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = String(req.ip || req.socket.remoteAddress || 'unknown');
    let bucket = ipRateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { attempts: 0, resetAt: now + windowMs };
    }
    bucket.attempts += 1;
    ipRateBuckets.set(key, bucket);
    if (bucket.attempts > maxAttempts) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    if (ipRateBuckets.size > 1000) {
      for (const [bucketKey, value] of ipRateBuckets) {
        if (value.resetAt <= now) ipRateBuckets.delete(bucketKey);
      }
    }
    next();
  };
}

const registrationRateLimit = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 30,
  message: 'Zu viele Registrierungsversuche. Bitte versuche es sp\u00e4ter erneut.'
});
const recoveryRateLimit = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 12,
  message: 'Zu viele Wiederherstellungsversuche. Bitte versuche es sp\u00e4ter erneut.'
});

function currentHouseId(req) {
  return Number(req.session.activeHouseId || req.session.user?.activeHouseId || req.session.user?.houseId || 0);
}

function isSuperadmin(req) {
  return Boolean(req.session.user?.isSuperadmin);
}

function sessionUserFromRow(user, activeHouse = null) {
  const house = activeHouse || db.prepare('SELECT id, name FROM houses WHERE id = ?').get(user.house_id);
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email || '',
    notifyReleases: Boolean(user.notify_releases),
    emailVerified: Boolean(user.email_verified),
    houseId: user.house_id,
    activeHouseId: house?.id || user.house_id,
    houseName: house?.name || '',
    isSuperadmin: Boolean(user.is_superadmin)
  };
}

function clearAuthRateLimit(req) {
  if (req.authRateKey) {
    authRateBuckets.delete(req.authRateKey);
  }
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur f\u00fcr Admins erlaubt' });
  }
  next();
}

function requireSuperadmin(req, res, next) {
  if (!req.session.user || !isSuperadmin(req)) {
    return res.status(403).json({ error: 'Nur f\u00fcr den Superadmin erlaubt' });
  }
  next();
}

function isSunday(dateString) {
  return weekdayForDate(dateString) === 0;
}

function isPastDate(dateString) {
  return isPastSwissDate(dateString);
}

function isPastSlot(dateString, slot) {
  if (!isDateString(dateString) || !slots.includes(slot)) {
    return false;
  }
  return isPastSwissSlot(dateString, slot);
}

function slotEndLabel(slot) {
  return slot.split('-')[1] || slot;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return String(value || '').length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function isValidUsername(value) {
  return /^[\p{L}\p{N}][\p{L}\p{N} ._'\u2019-]{2,39}$/u.test(String(value || ''));
}

function isValidPassword(value) {
  const length = String(value || '').length;
  return length >= 8 && length <= 128;
}

function destroyUserSessions(userId, exceptSessionId = '') {
  const sessions = db.prepare('SELECT sid, sess FROM sessions').all();
  const remove = db.prepare('DELETE FROM sessions WHERE sid = ?');

  for (const row of sessions) {
    if (row.sid === exceptSessionId) {
      continue;
    }
    try {
      if (Number(JSON.parse(row.sess)?.user?.id) === Number(userId)) {
        remove.run(row.sid);
      }
    } catch {
      remove.run(row.sid);
    }
  }
}

function publicAppUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (configured) {
    return configured;
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
}

function emailStatus() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const from = String(process.env.SMTP_FROM || '').trim();
  return {
    configured: Boolean(host && from),
    label: host && from ? 'bereit' : 'nicht konfiguriert'
  };
}

function smtpConfig() {
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  return {
    host: String(process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || (secure ? 465 : 587)),
    secure,
    user: String(process.env.SMTP_USER || '').trim(),
    password: String(process.env.SMTP_PASSWORD || ''),
    from: String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim()
  };
}

function writeAudit(req, action, targetType, targetId = '', details = {}) {
  try {
    db.prepare(`
      INSERT INTO audit_log (house_id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      currentHouseId(req) || null,
      req.session?.user?.id || null,
      action,
      targetType,
      String(targetId || ''),
      JSON.stringify(details).slice(0, 2000)
    );
  } catch (error) {
    console.error(`Audit-Eintrag fehlgeschlagen: ${error.message}`);
  }
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function sendEmailVerification(req, user) {
  const config = smtpConfig();
  if (!config.host || !config.from || !isValidEmail(user.email)) {
    return { configured: false, sent: false };
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(user.id);
  db.prepare(`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, tokenHash(token), String(Date.now() + 24 * 60 * 60 * 1000));
  const link = `${publicAppUrl(req)}/api/email-verification/confirm?token=${encodeURIComponent(token)}`;
  await sendMail({
    config,
    to: user.email,
    subject: 'Waschplan: E-Mail-Adresse best\u00e4tigen',
    text: [
      `Hallo ${user.username}`,
      '',
      'Bitte best\u00e4tige deine E-Mail-Adresse. Erst danach werden Freigabe-Hinweise an diese Adresse gesendet.',
      '',
      link,
      '',
      'Der Link ist 24 Stunden g\u00fcltig.'
    ].join('\n')
  });
  return { configured: true, sent: true };
}

async function sendPasswordReset(req, user) {
  const config = smtpConfig();
  if (!config.host || !config.from || !isValidEmail(user.email) || !user.email_verified) {
    return false;
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, tokenHash(token), String(Date.now() + 60 * 60 * 1000));
  const link = `${publicAppUrl(req)}/reset.html?token=${encodeURIComponent(token)}`;
  await sendMail({
    config,
    to: user.email,
    subject: 'Waschplan: Passwort neu setzen',
    text: [
      `Hallo ${user.username}`,
      '',
      'Mit diesem Link kannst du ein neues Passwort setzen:',
      '',
      link,
      '',
      'Der Link ist eine Stunde g\u00fcltig. Falls du nichts angefordert hast, kannst du diese Mail ignorieren.'
    ].join('\n')
  });
  return true;
}

async function notifyReleaseSubscribers(req, booking, message, subject = `Waschplan: ${booking.resource_name} fr\u00fcher frei`) {
  const config = smtpConfig();
  if (!config.host || !config.from) {
    return { configured: false, sent: 0 };
  }

  const recipients = db.prepare(`
    SELECT u.id, u.username, u.email
    FROM users u
    LEFT JOIN notification_preferences np ON np.user_id = u.id
    WHERE u.active = 1
      AND u.house_id = ?
      AND u.notify_releases = 1
      AND u.email_verified = 1
      AND u.email IS NOT NULL
      AND u.email != ''
      AND u.id != ?
      AND (np.resource_type IS NULL OR np.resource_type = 'all' OR np.resource_type = ?)
      AND (np.weekday IS NULL OR np.weekday = ?)
      AND (np.slot IS NULL OR np.slot = ?)
    ORDER BY username
  `).all(
    booking.house_id,
    booking.user_id,
    booking.resource_type || 'all',
    weekdayForDate(booking.booking_date),
    booking.slot
  );

  if (!recipients.length) {
    return { configured: true, sent: 0 };
  }

  const appUrl = publicAppUrl(req);
  let sent = 0;
  for (let start = 0; start < recipients.length; start += 5) {
    const batch = recipients.slice(start, start + 5);
    const results = await Promise.allSettled(batch.map((recipient) => sendMail({
        config,
        to: recipient.email,
        subject,
        text: [
          `Hallo ${recipient.username}`,
          '',
          message,
          '',
          `Du kannst den Slot jetzt im Waschplan ansehen und buchen: ${appUrl}`,
          '',
          'Viele Gr\u00fcsse',
          `Waschplan ${booking.house_name || ''}`.trim()
        ].join('\n')
      })));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sent += 1;
      } else {
        console.error(`E-Mail an ${batch[index].email} konnte nicht gesendet werden: ${result.reason.message}`);
      }
    });
  }

  return { configured: true, sent };
}

function extractEmailAddress(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function mailHeaders({ config, to, subject, text }) {
  const from = config.from.includes('<') ? config.from : `Waschplan <${config.from}>`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    `Date: ${new Date().toUTCString()}`,
    '',
    text
  ].join('\r\n');
}

async function sendMail({ config, to, subject, text }) {
  let socket = await openSmtpSocket(config, config.secure);
  let session = smtpSession(socket);

  await session.expect([220]);
  let ehlo = await session.command(`EHLO ${process.env.SMTP_HELO_NAME || 'waschplan.local'}`, [250]);

  if (!config.secure && ehlo.text.includes('STARTTLS')) {
    await session.command('STARTTLS', [220]);
    session.closeListeners();
    socket = await upgradeSmtpSocket(socket, config);
    session = smtpSession(socket);
    await session.command(`EHLO ${process.env.SMTP_HELO_NAME || 'waschplan.local'}`, [250]);
  }

  if (config.user && config.password) {
    await session.command('AUTH LOGIN', [334]);
    await session.command(Buffer.from(config.user).toString('base64'), [334]);
    await session.command(Buffer.from(config.password).toString('base64'), [235]);
  }

  await session.command(`MAIL FROM:<${extractEmailAddress(config.from)}>`, [250]);
  await session.command(`RCPT TO:<${extractEmailAddress(to)}>`, [250, 251]);
  await session.command('DATA', [354]);
  socket.write(`${mailHeaders({ config, to, subject, text }).replace(/^\./gm, '..')}\r\n.\r\n`);
  await session.expect([250]);
  await session.command('QUIT', [221]);
  session.closeListeners();
  socket.end();
}

function openSmtpSocket(config, secure) {
  return new Promise((resolve, reject) => {
    const options = {
      host: config.host,
      port: config.port,
      servername: config.host
    };
    const socket = secure ? tls.connect(options, () => resolve(socket)) : net.connect(options, () => resolve(socket));
    socket.setEncoding('utf8');
    socket.setTimeout(15000, () => {
      socket.destroy(new Error('SMTP timeout'));
    });
    socket.once('error', reject);
  });
}

function upgradeSmtpSocket(socket, config) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: config.host
    }, () => {
      secureSocket.setEncoding('utf8');
      secureSocket.setTimeout(15000, () => {
        secureSocket.destroy(new Error('SMTP timeout'));
      });
      resolve(secureSocket);
    });
    secureSocket.once('error', reject);
  });
}

function smtpSession(socket) {
  let buffer = '';
  const waiters = [];

  function onData(chunk) {
    buffer += chunk;
    flush();
  }

  function onError(error) {
    while (waiters.length) {
      waiters.shift().reject(error);
    }
  }

  function flush() {
    if (!waiters.length) {
      return;
    }

    const match = buffer.match(/(?:^|\r?\n)(\d{3}) [^\r\n]*(?:\r?\n|$)/);
    if (!match) {
      return;
    }

    const endIndex = buffer.indexOf(match[0]) + match[0].length;
    const text = buffer.slice(0, endIndex);
    buffer = buffer.slice(endIndex);
    waiters.shift().resolve({ code: Number(match[1]), text });
  }

  socket.on('data', onData);
  socket.on('error', onError);

  return {
    expect(expectedCodes) {
      return new Promise((resolve, reject) => {
        waiters.push({
          resolve: (response) => {
            if (!expectedCodes.includes(response.code)) {
              reject(new Error(`SMTP expected ${expectedCodes.join('/')} but got ${response.code}: ${response.text.trim()}`));
              return;
            }
            resolve(response);
          },
          reject
        });
        flush();
      });
    },
    command(command, expectedCodes) {
      socket.write(`${command}\r\n`);
      return this.expect(expectedCodes);
    },
    closeListeners() {
      socket.off('data', onData);
      socket.off('error', onError);
    }
  };
}

function backupDirectory() {
  return path.resolve(process.env.BACKUP_DIR || (
    process.env.RENDER === 'true' ? '/var/data/backups' : path.join(dbDir, 'backups')
  ));
}

async function createVerifiedBackup() {
  const directory = backupDirectory();
  fs.mkdirSync(directory, { recursive: true });
  const filename = `washplan-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
  const backupPath = path.join(directory, filename);
  await db.backup(backupPath);
  const verificationDb = new Database(backupPath, { readonly: true, fileMustExist: true });
  const integrity = verificationDb.pragma('integrity_check', { simple: true });
  verificationDb.close();
  if (integrity !== 'ok') {
    fs.rmSync(backupPath, { force: true });
    throw new Error(`Backup-Integrit\u00e4tspr\u00fcfung: ${integrity}`);
  }

  const backups = fs.readdirSync(directory)
    .filter((name) => name.startsWith('washplan-') && name.endsWith('.sqlite'))
    .sort()
    .reverse();
  for (const oldName of backups.slice(7)) {
    fs.rmSync(path.join(directory, oldName), { force: true });
  }

  let uploaded = false;
  const uploadUrl = String(process.env.BACKUP_UPLOAD_URL || '').trim();
  if (uploadUrl) {
    const target = uploadUrl.includes('{filename}')
      ? uploadUrl.replace('{filename}', encodeURIComponent(filename))
      : uploadUrl;
    const response = await fetch(target, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        ...(process.env.BACKUP_UPLOAD_TOKEN
          ? { Authorization: `Bearer ${process.env.BACKUP_UPLOAD_TOKEN}` }
          : {})
      },
      body: fs.readFileSync(backupPath)
    });
    if (!response.ok) {
      throw new Error(`Externe Backup-Kopie fehlgeschlagen (${response.status})`);
    }
    uploaded = true;
  }
  const status = { ok: true, filename, createdAt: new Date().toISOString(), uploaded };
  setSetting('backup_status', JSON.stringify(status));
  return status;
}

async function runScheduledBackup() {
  try {
    const status = await createVerifiedBackup();
    console.log(`Backup gepr\u00fcft: ${status.filename}${status.uploaded ? ' (extern kopiert)' : ''}`);
  } catch (error) {
    setSetting('backup_status', JSON.stringify({ ok: false, createdAt: new Date().toISOString(), error: error.message }));
    console.error(`Automatisches Backup fehlgeschlagen: ${error.message}`);
  }
}

function cleanupExpiredData() {
  db.transaction(() => {
    db.prepare('DELETE FROM sessions WHERE expired <= ?').run(Date.now());
    db.prepare('DELETE FROM email_verification_tokens WHERE CAST(expires_at AS INTEGER) <= ?').run(Date.now());
    db.prepare('DELETE FROM password_reset_tokens WHERE CAST(expires_at AS INTEGER) <= ?').run(Date.now());
    db.prepare("DELETE FROM release_notices WHERE created_at < datetime('now', '-30 days')").run();
    db.prepare("DELETE FROM bookings WHERE booking_date < date('now', '-365 days')").run();
    db.prepare("DELETE FROM audit_log WHERE created_at < datetime('now', '-365 days')").run();
  })();
}

app.get(['/health', '/api/health'], (req, res) => {
  const storage = process.env.RENDER === 'true'
    ? (dbPath.startsWith('/var/data') ? 'persistent' : 'ephemeral')
    : 'local';
  const adminReady = Boolean(
    db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get()
  );
  res.json({
    ok: true,
    storage,
    adminReady,
    revision: String(process.env.RENDER_GIT_COMMIT || '').trim() || null
  });
});

app.post('/api/login', authRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  const loginName = normalizeEmail(username);
  const user = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?')
    .get(loginName, loginName);

  if (!user || !verifyStoredPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Login fehlgeschlagen' });
  }
  if (!user.active) {
    return res.status(403).json({ error: 'Dieses Konto ist deaktiviert' });
  }

  if (!isBcryptHash(user.password_hash)) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(bcrypt.hashSync(String(password || ''), 10), user.id);
  }

  req.session.user = sessionUserFromRow(user);
  req.session.activeHouseId = user.house_id;
  clearAuthRateLimit(req);
  res.json({ user: req.session.user });
});

app.post('/api/register', registrationRateLimit, authRateLimit, async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const houseCode = String(req.body?.houseCode || '').trim();
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const house = db.prepare(`
    SELECT id, name
    FROM houses
    WHERE lower(code) = lower(?) AND active = 1
  `).get(houseCode);

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Der Benutzername darf 3 bis 40 Buchstaben, Zahlen, Leerzeichen, Punkte, Binde- oder Unterstriche enthalten.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Das Passwort muss 8 bis 128 Zeichen haben.' });
  }
  if (!house) {
    return res.status(403).json({ error: 'Hauscode ist nicht korrekt' });
  }

  try {
    const emailVerified = emailStatus().configured ? 0 : 1;
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, house_id, active, notify_releases, email_verified)
      VALUES (?, ?, ?, 'user', ?, 1, ?, ?)
    `).run(username, email, bcrypt.hashSync(password, 10), house.id, notifyReleases, emailVerified);

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    req.session.user = sessionUserFromRow(createdUser, house);
    req.session.activeHouseId = house.id;
    clearAuthRateLimit(req);
    const verification = await sendEmailVerification(req, createdUser).catch((error) => {
      console.error(`Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`);
      return { configured: true, sent: false };
    });
    res.status(201).json({
      user: req.session.user,
      verification,
      message: verification.sent
        ? 'Konto erstellt. Bitte best\u00e4tige jetzt deine E-Mail-Adresse.'
        : 'Konto erstellt.'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Benutzername oder E-Mail ist bereits vergeben' });
    }
    throw error;
  }
});

app.get('/api/email-verification/confirm', (req, res) => {
  const token = String(req.query.token || '');
  const record = db.prepare(`
    SELECT evt.id, evt.user_id
    FROM email_verification_tokens evt
    JOIN users u ON u.id = evt.user_id
    WHERE evt.token_hash = ? AND CAST(evt.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(token), Date.now());
  if (!record) {
    return res.redirect('/login.html?verification=invalid');
  }
  db.transaction(() => {
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(record.user_id);
    db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(record.user_id);
  })();
  if (Number(req.session.user?.id) === Number(record.user_id)) {
    req.session.user.emailVerified = true;
  }
  res.redirect(req.session.user ? '/index.html?emailVerified=1' : '/login.html?verification=ok');
});

app.post('/api/email-verification/resend', requireAuth, recoveryRateLimit, async (req, res) => {
  const user = db.prepare('SELECT id, username, email, email_verified FROM users WHERE id = ?')
    .get(req.session.user.id);
  if (!user || user.email_verified) {
    return res.json({ ok: true, message: 'Die E-Mail-Adresse ist bereits best\u00e4tigt.' });
  }
  try {
    const result = await sendEmailVerification(req, user);
    if (!result.sent) {
      return res.status(409).json({ error: 'Der E-Mail-Versand ist noch nicht eingerichtet.' });
    }
    res.json({ ok: true, message: 'Best\u00e4tigungsmail wurde erneut gesendet.' });
  } catch (error) {
    console.error(`Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`);
    res.status(502).json({ error: 'Die Best\u00e4tigungsmail konnte gerade nicht gesendet werden.' });
  }
});

app.post('/api/password-reset/request', recoveryRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const user = isValidEmail(email)
    ? db.prepare('SELECT id, username, email, email_verified FROM users WHERE lower(email) = ? AND active = 1').get(email)
    : null;
  if (user) {
    await sendPasswordReset(req, user).catch((error) => {
      console.error(`Passwort-Mail konnte nicht gesendet werden: ${error.message}`);
    });
  }
  res.json({
    ok: true,
    message: 'Wenn ein aktives, best\u00e4tigtes Konto zu dieser Adresse geh\u00f6rt, wurde eine E-Mail gesendet.'
  });
});

app.post('/api/password-reset/confirm', recoveryRateLimit, (req, res) => {
  const token = String(req.body?.token || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Das neue Passwort muss 8 bis 128 Zeichen haben.' });
  }
  const record = db.prepare(`
    SELECT prt.id, prt.user_id
    FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    WHERE prt.token_hash = ? AND CAST(prt.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(token), Date.now());
  if (!record) {
    return res.status(400).json({ error: 'Der Link ist ung\u00fcltig oder abgelaufen.' });
  }
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(bcrypt.hashSync(newPassword, 10), record.user_id);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(record.user_id);
  })();
  destroyUserSessions(record.user_id);
  res.json({ ok: true, message: 'Passwort ge\u00e4ndert. Du kannst dich jetzt anmelden.' });
});

function finishLogout(req, res, next, redirectToLogin = false) {
  const sendResponse = () => {
    res.clearCookie('connect.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/'
    });
    if (redirectToLogin) {
      return res.redirect(303, '/login.html?loggedOut=1');
    }
    return res.json({ ok: true });
  };

  if (!req.session) {
    return sendResponse();
  }
  req.session.destroy((error) => {
    if (error) return next(error);
    return sendResponse();
  });
}

app.post('/api/logout', (req, res, next) => finishLogout(req, res, next));
app.post('/logout', (req, res, next) => finishLogout(req, res, next, true));

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null, houses: [] });
  }
  const houses = isSuperadmin(req)
    ? db.prepare('SELECT id, name, active FROM houses WHERE active = 1 ORDER BY name').all()
    : [];
  const preferences = db.prepare(`
    SELECT resource_type AS resourceType, weekday, slot
    FROM notification_preferences WHERE user_id = ?
  `).get(req.session.user.id) || { resourceType: 'all', weekday: null, slot: null };
  res.json({ user: req.session.user, houses, notificationPreferences: preferences });
});

app.put('/api/me/active-house', requireAuth, requireSuperadmin, (req, res) => {
  const houseId = Number(req.body?.houseId);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ? AND active = 1').get(houseId);
  if (!house) {
    return res.status(404).json({ error: 'Hausnummer nicht gefunden.' });
  }
  req.session.activeHouseId = house.id;
  req.session.user.activeHouseId = house.id;
  req.session.user.houseName = house.name;
  res.json({ user: req.session.user, message: `Ansicht gewechselt zu ${house.name}.` });
});

app.put('/api/me/notifications', requireAuth, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const notifyReleases = req.body?.notifyReleases === false ? 0 : 1;
  const resourceType = String(req.body?.resourceType || 'all');
  const weekday = req.body?.weekday === '' || req.body?.weekday == null ? null : Number(req.body.weekday);
  const preferredSlot = String(req.body?.slot || '') || null;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }
  if (!['all', 'washer', 'drying_room', 'tumbler'].includes(resourceType)) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Bereich f\u00fcr Benachrichtigungen.' });
  }
  if (weekday !== null && (!Number.isInteger(weekday) || weekday < 1 || weekday > 6)) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Wochentag f\u00fcr Benachrichtigungen.' });
  }
  if (preferredSlot !== null && !slots.includes(preferredSlot)) {
    return res.status(400).json({ error: 'Ung\u00fcltiges Zeitfenster f\u00fcr Benachrichtigungen.' });
  }

  try {
    const previous = db.prepare('SELECT email, email_verified FROM users WHERE id = ?').get(req.session.user.id);
    const emailChanged = normalizeEmail(previous?.email) !== email;
    const emailVerified = emailChanged && emailStatus().configured ? 0 : previous?.email_verified ?? 1;
    db.transaction(() => {
      db.prepare('UPDATE users SET email = ?, notify_releases = ?, email_verified = ? WHERE id = ?')
        .run(email, notifyReleases, emailVerified, req.session.user.id);
      db.prepare(`
        INSERT INTO notification_preferences (user_id, resource_type, weekday, slot)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          resource_type = excluded.resource_type,
          weekday = excluded.weekday,
          slot = excluded.slot
      `).run(req.session.user.id, resourceType, weekday, preferredSlot);
    })();
    if (emailChanged && emailStatus().configured) {
      await sendEmailVerification(req, {
        id: req.session.user.id,
        username: req.session.user.username,
        email
      }).catch((error) => console.error(`Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`));
    }
    req.session.user.emailVerified = Boolean(emailVerified);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
    }
    throw error;
  }

  req.session.user.email = email;
  req.session.user.notifyReleases = Boolean(notifyReleases);
  res.json({
    user: req.session.user,
    notificationPreferences: { resourceType, weekday, slot: preferredSlot },
    message: req.session.user.emailVerified
      ? 'Benachrichtigungen gespeichert.'
      : 'Benachrichtigungen gespeichert. Bitte best\u00e4tige die neue E-Mail-Adresse.'
  });
});

app.put('/api/me/password', requireAuth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.session.user.id);

  if (!user || !verifyStoredPassword(currentPassword, user.password_hash)) {
    return res.status(403).json({ error: 'Das bisherige Passwort stimmt nicht.' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Das neue Passwort muss 8 bis 128 Zeichen haben.' });
  }
  if (verifyStoredPassword(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Bitte verwende ein anderes neues Passwort.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), user.id);
  destroyUserSessions(user.id, req.sessionID);
  res.json({ ok: true, message: 'Dein Passwort wurde ge\u00e4ndert.' });
});

app.get('/api/me/export', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, role, active, notify_releases, email_verified, created_at
    FROM users WHERE id = ?
  `).get(req.session.user.id);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ?').get(req.session.user.houseId);
  const bookings = db.prepare(`
    SELECT b.booking_date, b.slot, b.group_id, b.created_at, r.name AS resource, r.type AS resource_type
    FROM bookings b JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ? ORDER BY b.booking_date, b.slot
  `).all(req.session.user.id);
  const notificationPreferences = db.prepare(`
    SELECT resource_type, weekday, slot FROM notification_preferences WHERE user_id = ?
  `).get(req.session.user.id) || null;
  const payload = {
    exportedAt: new Date().toISOString(),
    account: user,
    house,
    notificationPreferences,
    bookings
  };
  res.setHeader('Content-Disposition', 'attachment; filename="waschplan-meine-daten.json"');
  res.type('application/json').send(JSON.stringify(payload, null, 2));
});

app.delete('/api/me', requireAuth, (req, res) => {
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!user || !verifyStoredPassword(password, user.password_hash)) {
    return res.status(403).json({ error: 'Das Passwort stimmt nicht.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Das Superadmin-Konto kann nur nach \u00dcbergabe der Verantwortung entfernt werden.' });
  }
  if (user.role === 'admin') {
    const activeAdmins = db.prepare(`
      SELECT COUNT(*) AS count FROM users WHERE house_id = ? AND role = 'admin' AND active = 1
    `).get(user.house_id).count;
    if (activeAdmins <= 1) {
      return res.status(409).json({ error: 'Zuerst muss ein anderes aktives Admin-Konto f\u00fcr dieses Haus vorhanden sein.' });
    }
  }
  writeAudit(req, 'user.self_delete', 'user', user.id);
  destroyUserSessions(user.id, req.sessionID);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  req.session.destroy(() => res.json({ ok: true, message: 'Dein Konto und deine Buchungen wurden gel\u00f6scht.' }));
});

app.get('/api/calendar', requireAuth, (req, res) => {
  const from = String(req.query.from || todayStringLocal());
  const days = Number(req.query.days || 7);
  const houseId = currentHouseId(req);
  if (!isDateString(from) || !Number.isInteger(days) || days < 1 || days > 14) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Kalenderzeitraum' });
  }

  res.json({
    from,
    days: Array.from({ length: days }, (_, index) => (
      calendarDaySummary(req.session.user.id, addDays(from, index), houseId)
    ))
  });
});

app.get('/api/recommendation', requireAuth, (req, res) => {
  res.json({ recommendation: bookingRecommendation(req.session.user.id, currentHouseId(req)) });
});

app.get('/api/slots', requireAuth, (req, res) => {
  res.json({ slots });
});

app.get('/api/resources', requireAuth, (req, res) => {
  const resources = db.prepare(`
    SELECT id, name, type FROM resources
    WHERE active = 1 AND house_id = ?
    ORDER BY type, name
  `).all(currentHouseId(req));
  res.json({ resources });
});

app.get('/api/admin/resources', requireAdmin, (req, res) => {
  const resources = db.prepare(`
    SELECT id, name, type, active
    FROM resources WHERE house_id = ?
    ORDER BY type, name
  `).all(currentHouseId(req));
  res.json({ resources });
});

app.post('/api/admin/resources', requireAdmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const type = String(req.body?.type || '');
  if (name.length < 2 || name.length > 80 || !['washer', 'drying_room', 'tumbler'].includes(type)) {
    return res.status(400).json({ error: 'Bitte einen g\u00fcltigen Namen und Bereich w\u00e4hlen.' });
  }
  if (db.prepare('SELECT id FROM resources WHERE lower(name) = lower(?) AND house_id = ?').get(name, currentHouseId(req))) {
    return res.status(409).json({ error: 'Ein Ger\u00e4t mit diesem Namen ist bereits vorhanden.' });
  }
  const result = db.prepare('INSERT INTO resources (name, type, house_id) VALUES (?, ?, ?)')
    .run(name, type, currentHouseId(req));
  writeAudit(req, 'resource.create', 'resource', result.lastInsertRowid, { name, type });
  res.status(201).json({ id: result.lastInsertRowid, message: `${name} wurde angelegt.` });
});

app.put('/api/admin/resources/:id', requireAdmin, (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND house_id = ?')
    .get(Number(req.params.id), currentHouseId(req));
  if (!resource) {
    return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden.' });
  }
  const name = String(req.body?.name ?? resource.name).trim();
  const active = req.body?.active == null ? resource.active : req.body.active === true ? 1 : 0;
  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Der Name muss 2 bis 80 Zeichen haben.' });
  }
  if (db.prepare('SELECT id FROM resources WHERE lower(name) = lower(?) AND house_id = ? AND id != ?')
    .get(name, currentHouseId(req), resource.id)) {
    return res.status(409).json({ error: 'Ein Ger\u00e4t mit diesem Namen ist bereits vorhanden.' });
  }
  if (!active && resource.active) {
    const conflict = db.prepare(`
      SELECT 1 FROM bookings WHERE resource_id = ? AND booking_date >= ? LIMIT 1
    `).get(resource.id, todayStringLocal()) || db.prepare(`
      SELECT 1 FROM fixed_bookings WHERE resource_id = ? AND active = 1 LIMIT 1
    `).get(resource.id);
    if (conflict) {
      return res.status(409).json({ error: 'Das Ger\u00e4t hat kommende oder feste Buchungen und kann noch nicht deaktiviert werden.' });
    }
    if (resource.type === 'tumbler') {
      const activeTumblers = db.prepare(`
        SELECT COUNT(*) AS count FROM resources
        WHERE house_id = ? AND type = 'tumbler' AND active = 1
      `).get(currentHouseId(req)).count;
      if (activeTumblers <= 2) {
        return res.status(409).json({ error: 'F\u00fcr die Freihalte-Regel m\u00fcssen mindestens zwei Tumbler aktiv bleiben.' });
      }
    }
  }
  db.prepare('UPDATE resources SET name = ?, active = ? WHERE id = ?').run(name, active, resource.id);
  writeAudit(req, 'resource.update', 'resource', resource.id, { name, active: Boolean(active) });
  res.json({ ok: true, message: `${name} wurde aktualisiert.` });
});

app.get('/api/my-bookings', requireAuth, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.id, b.booking_date, b.slot, b.group_id, r.id AS resource_id, r.name AS resource_name,
           r.type AS resource_type, u.id AS user_id, u.username
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN users u ON u.id = b.user_id
    WHERE b.user_id = ?
      AND r.house_id = ?
      AND b.booking_date >= ?
    ORDER BY b.booking_date, b.slot, r.name
    LIMIT 30
  `).all(req.session.user.id, currentHouseId(req), todayStringLocal());

  res.json({
    bookings: bookings.map((booking) => {
      const windowStatus = releaseWindowStatus(booking.booking_date, booking.slot);
      return {
        ...booking,
        releaseEligible: windowStatus.eligible,
        cancellationNoticeEligible: windowStatus.reason === 'not_started'
      };
    })
  });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const date = req.query.date;
  const houseId = currentHouseId(req);
  if (!isDateString(date)) {
    return res.status(400).json({ error: 'Datum im Format YYYY-MM-DD erforderlich' });
  }

  const bookings = db.prepare(`
    SELECT b.id, b.booking_date, b.slot, r.id AS resource_id, r.name AS resource_name,
           r.type AS resource_type, u.id AS user_id, u.username, 0 AS is_fixed
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN users u ON u.id = b.user_id
    WHERE b.booking_date = ? AND r.house_id = ?
    ORDER BY b.slot, r.name
  `).all(date, houseId);

  const fixedBookings = getFixedBookingsForDate(date, houseId);
  const allBookings = [...bookings, ...fixedBookings]
    .sort((left, right) => left.slot.localeCompare(right.slot) || left.resource_name.localeCompare(right.resource_name));

  res.json({ bookings: allBookings });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { resourceId, date, slot } = req.body || {};
  const houseId = currentHouseId(req);

  if (!Number.isInteger(Number(resourceId)) || !isDateString(date) || !slots.includes(slot)) {
    return res.status(400).json({ error: 'Ung\u00fcltige Buchungsdaten' });
  }
  if (isPastDate(date)) {
    return res.status(400).json({ error: 'Buchungen in der Vergangenheit sind nicht erlaubt' });
  }
  if (isPastSlot(date, slot)) {
    return res.status(400).json({ error: 'Dieser Slot liegt bereits in der Vergangenheit' });
  }
  if (isSunday(date)) {
    return res.status(400).json({ error: 'Sonntags sind keine Buchungen m\u00f6glich' });
  }

  const resource = db.prepare(`
    SELECT id, type FROM resources
    WHERE id = ? AND active = 1 AND house_id = ?
  `).get(Number(resourceId), houseId);
  if (!resource) {
    return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
  }

  const fixedConflict = fixedBookingConflict(resource.id, date, slot, houseId);
  if (fixedConflict) {
    return res.status(409).json({
      error: `${fixedConflict.resource_name} ist in diesem Slot fest f\u00fcr ${fixedConflict.label} reserviert.`
    });
  }

  let ruleError = '';
  if (resource.type === 'washer') {
    ruleError = validateWasherBooking(req.session.user.id, date, slot, houseId);
  } else if (resource.type === 'tumbler') {
    ruleError = validateTumblerBooking(date, slot, houseId);
  } else if (resource.type === 'drying_room') {
    ruleError = validateDryingRoomBooking(req.session.user.id, date, slot, houseId);
  }

  if (ruleError) {
    return res.status(409).json({ error: ruleError });
  }

  try {
    const result = db.prepare(`
      INSERT INTO bookings (user_id, resource_id, booking_date, slot)
      VALUES (?, ?, ?, ?)
    `).run(req.session.user.id, Number(resourceId), date, slot);

    const created = db.prepare(`
      SELECT b.id, b.booking_date, b.slot, r.name AS resource_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: `${created.resource_name} am ${created.booking_date} ${created.slot} gebucht.`
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Dieser Termin ist bereits gebucht' });
    }
    throw error;
  }
});

function packageRequestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

app.post('/api/booking-package', requireAuth, (req, res) => {
  const rawItems = req.body?.items;
  const washerBookingId = Number(req.body?.washerBookingId || 0);
  const houseId = currentHouseId(req);
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 5) {
    return res.status(400).json({ error: 'Ein Waschpaket muss ein bis f\u00fcnf Buchungen enthalten.' });
  }

  try {
    const items = rawItems.map((item) => {
      const resourceId = Number(item?.resourceId);
      const date = String(item?.date || '');
      const slot = String(item?.slot || '');
      if (!Number.isInteger(resourceId) || !isDateString(date) || !slots.includes(slot)) {
        throw packageRequestError(400, 'Das Waschpaket enth\u00e4lt ung\u00fcltige Buchungsdaten.');
      }
      const resource = db.prepare(`
        SELECT id, name, type FROM resources
        WHERE id = ? AND active = 1 AND house_id = ?
      `).get(resourceId, houseId);
      if (!resource) {
        throw packageRequestError(404, 'Ein Ger\u00e4t aus dem Waschpaket ist nicht mehr verf\u00fcgbar.');
      }
      return { resourceId, date, slot, resource };
    });

    const itemKeys = items.map((item) => `${item.resourceId}|${item.date}|${item.slot}`);
    if (new Set(itemKeys).size !== itemKeys.length) {
      throw packageRequestError(400, 'Das Waschpaket enth\u00e4lt eine Buchung doppelt.');
    }

    const washerItems = items.filter((item) => item.resource.type === 'washer');
    const dryingItems = items.filter((item) => item.resource.type === 'drying_room');
    const tumblerItems = items.filter((item) => item.resource.type === 'tumbler');
    let existingWasher = null;
    let newWasher = null;

    if (washerBookingId) {
      existingWasher = db.prepare(`
        SELECT b.id, b.user_id, b.booking_date, b.slot, b.group_id,
               r.id AS resource_id, r.name AS resource_name
        FROM bookings b
        JOIN resources r ON r.id = b.resource_id
        WHERE b.id = ? AND r.type = 'washer' AND r.house_id = ?
      `).get(washerBookingId, houseId);
      if (!existingWasher) {
        throw packageRequestError(404, 'Die Waschmaschinen-Buchung wurde nicht gefunden.');
      }
      if (existingWasher.user_id !== req.session.user.id) {
        throw packageRequestError(403, 'Diese Waschmaschinen-Buchung geh\u00f6rt dir nicht.');
      }
      if (washerItems.length) {
        throw packageRequestError(400, 'Eine bereits gebuchte Waschmaschine darf im Paket nicht erneut reserviert werden.');
      }
    } else {
      if (washerItems.length !== 1) {
        throw packageRequestError(400, 'Ein neues Waschpaket braucht genau eine Waschmaschine.');
      }
      newWasher = washerItems[0];
    }

    const washDate = existingWasher?.booking_date || newWasher.date;
    const washSlot = existingWasher?.slot || newWasher.slot;
    if (isPastDate(washDate) || isPastSlot(washDate, washSlot)) {
      throw packageRequestError(400, 'Der vorgeschlagene Waschslot ist bereits vorbei. Bitte lade einen neuen Vorschlag.');
    }
    if (isSunday(washDate)) {
      throw packageRequestError(400, 'Sonntags sind keine Buchungen m\u00f6glich.');
    }

    if (tumblerItems.length > 1 || tumblerItems.some((item) => item.date !== washDate || item.slot !== washSlot)) {
      throw packageRequestError(400, 'Der Tumbler muss im gleichen Zeitfenster wie die Waschmaschine liegen.');
    }

    const allowedDryingWindow = allowedDryingRoomSlots(washDate, washSlot);
    const sortedDryingItems = [...dryingItems].sort((left, right) => {
      const leftIndex = allowedDryingWindow.findIndex((item) => item.date === left.date && item.slot === left.slot);
      const rightIndex = allowedDryingWindow.findIndex((item) => item.date === right.date && item.slot === right.slot);
      return leftIndex - rightIndex;
    });
    const dryingResourceIds = new Set(dryingItems.map((item) => item.resourceId));
    const expectedDryingWindow = allowedDryingWindow.slice(0, dryingItems.length);
    const validDryingWindow = sortedDryingItems.every((item, index) => (
      expectedDryingWindow[index]?.date === item.date
      && expectedDryingWindow[index]?.slot === item.slot
    ));
    if (dryingItems.length && (
      dryingResourceIds.size !== 1
      || dryingItems.length > allowedDryingWindow.length
      || !validDryingWindow
    )) {
      throw packageRequestError(400, 'Der Trockenraum muss l\u00fcckenlos und innerhalb der erlaubten Trocknungszeit gebucht werden.');
    }

    for (const item of items) {
      if (isPastDate(item.date) || isPastSlot(item.date, item.slot)) {
        throw packageRequestError(400, 'Ein Bestandteil des Waschpakets liegt bereits in der Vergangenheit.');
      }
      if (isSunday(item.date)) {
        throw packageRequestError(400, 'Sonntags sind keine Buchungen m\u00f6glich.');
      }
      const fixedConflict = fixedBookingConflict(item.resourceId, item.date, item.slot, houseId);
      if (fixedConflict) {
        throw packageRequestError(
          409,
          `${fixedConflict.resource_name} ist in diesem Slot fest f\u00fcr ${fixedConflict.label} reserviert.`
        );
      }
      const occupied = db.prepare(`
        SELECT id FROM bookings
        WHERE resource_id = ? AND booking_date = ? AND slot = ?
        LIMIT 1
      `).get(item.resourceId, item.date, item.slot);
      if (occupied) {
        throw packageRequestError(409, 'Ein Bestandteil des Waschpakets wurde inzwischen gebucht. Bitte lade einen neuen Vorschlag.');
      }
    }

    if (newWasher) {
      const washerError = validateWasherBooking(req.session.user.id, washDate, washSlot, houseId);
      if (washerError) {
        throw packageRequestError(409, washerError);
      }
    }
    if (tumblerItems.length) {
      const tumblerError = validateTumblerBooking(washDate, washSlot, houseId);
      if (tumblerError) {
        throw packageRequestError(409, tumblerError);
      }
    }

    const groupId = existingWasher?.group_id || crypto.randomUUID();
    const createPackage = db.transaction(() => {
      const created = [];
      const insert = db.prepare(`
        INSERT INTO bookings (user_id, resource_id, booking_date, slot, group_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      if (existingWasher && !existingWasher.group_id) {
        db.prepare('UPDATE bookings SET group_id = ? WHERE id = ?').run(groupId, existingWasher.id);
      }

      if (newWasher) {
        const washerError = validateWasherBooking(req.session.user.id, washDate, washSlot, houseId);
        if (washerError) {
          throw packageRequestError(409, washerError);
        }
        const result = insert.run(req.session.user.id, newWasher.resourceId, washDate, washSlot, groupId);
        created.push({ id: result.lastInsertRowid, type: 'washer' });
      }

      for (const item of sortedDryingItems) {
        const dryingError = validateDryingRoomBooking(req.session.user.id, item.date, item.slot, houseId);
        if (dryingError) {
          throw packageRequestError(409, dryingError);
        }
        const result = insert.run(req.session.user.id, item.resourceId, item.date, item.slot, groupId);
        created.push({ id: result.lastInsertRowid, type: 'drying_room' });
      }

      for (const item of tumblerItems) {
        const tumblerError = validateTumblerBooking(item.date, item.slot, houseId);
        if (tumblerError) {
          throw packageRequestError(409, tumblerError);
        }
        const result = insert.run(req.session.user.id, item.resourceId, item.date, item.slot, groupId);
        created.push({ id: result.lastInsertRowid, type: 'tumbler' });
      }
      return created;
    });

    const created = createPackage();
    const bookedTypes = [...new Set(created.map((item) => item.type))];
    const typeLabels = {
      washer: 'Waschmaschine',
      drying_room: 'Trockenraum',
      tumbler: 'Tumbler'
    };
    const summary = bookedTypes.map((type) => typeLabels[type]).join(', ');
    res.status(201).json({
      created,
      groupId,
      message: existingWasher
        ? `Waschpaket erg\u00e4nzt: ${summary}.`
        : `Waschpaket gebucht: ${summary}.`
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ein Bestandteil des Waschpakets wurde inzwischen gebucht. Bitte versuche es erneut.' });
    }
    throw error;
  }
});

app.delete('/api/booking-groups/:groupId', requireAuth, (req, res) => {
  const groupId = String(req.params.groupId || '');
  const houseId = currentHouseId(req);
  const groupedBookings = db.prepare(`
    SELECT b.id, b.user_id
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.group_id = ? AND r.house_id = ?
  `).all(groupId, houseId);
  if (!groupedBookings.length) {
    return res.status(404).json({ error: 'Waschpaket nicht gefunden' });
  }
  if (
    req.session.user.role !== 'admin'
    && groupedBookings.some((booking) => booking.user_id !== req.session.user.id)
  ) {
    return res.status(403).json({ error: 'Dieses Waschpaket geh\u00f6rt dir nicht' });
  }

  db.prepare('DELETE FROM bookings WHERE group_id = ?').run(groupId);
  res.json({ ok: true, deleted: groupedBookings.length, message: 'Waschpaket gel\u00f6scht.' });
});

app.post('/api/booking-groups/:groupId/cancel-notify', requireAuth, async (req, res, next) => {
  try {
    const groupId = String(req.params.groupId || '');
    const groupedBookings = db.prepare(`
      SELECT b.*, r.name AS resource_name, r.type AS resource_type, r.house_id, h.name AS house_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN houses h ON h.id = r.house_id
      WHERE b.group_id = ? AND r.house_id = ?
      ORDER BY b.booking_date, b.slot, r.type
    `).all(groupId, currentHouseId(req));
    if (!groupedBookings.length) {
      return res.status(404).json({ error: 'Waschpaket nicht gefunden' });
    }
    if (
      req.session.user.role !== 'admin'
      && groupedBookings.some((booking) => booking.user_id !== req.session.user.id)
    ) {
      return res.status(403).json({ error: 'Dieses Waschpaket geh\u00f6rt dir nicht' });
    }
    if (groupedBookings.some((booking) => releaseWindowStatus(booking.booking_date, booking.slot).reason !== 'not_started')) {
      return res.status(409).json({ error: 'Das ganze Paket kann nur vor Beginn abgesagt werden. Laufende Bestandteile bitte einzeln fr\u00fcher freigeben.' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM bookings WHERE group_id = ?').run(groupId);
      const insertNotice = db.prepare(`
        INSERT INTO release_notices (resource_name, booking_date, slot, kind, message, house_id, created_by)
        VALUES (?, ?, ?, 'cancellation', ?, ?, ?)
      `);
      for (const booking of groupedBookings) {
        insertNotice.run(
          booking.resource_name,
          booking.booking_date,
          booking.slot,
          `${booking.resource_name} am ${booking.booking_date} im Zeitfenster ${booking.slot} ist wieder buchbar.`,
          booking.house_id,
          req.session.user.id
        );
      }
    })();

    const washer = groupedBookings.find((booking) => booking.resource_type === 'washer') || groupedBookings[0];
    const message = `Ein Waschpaket am ${washer.booking_date} im Zeitfenster ${washer.slot} wurde abgesagt. Die enthaltenen Termine sind wieder buchbar.`;
    const emailNotifications = await notifyReleaseSubscribers(
      req,
      washer,
      message,
      'Waschplan: Waschpaket wieder frei'
    );
    res.json({
      ok: true,
      deleted: groupedBookings.length,
      releaseNoticeCreated: true,
      emailNotifications,
      message
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = db.prepare(`
    SELECT b.* FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.id = ? AND r.house_id = ?
  `).get(Number(req.params.id), currentHouseId(req));
  if (!booking) {
    return res.status(404).json({ error: 'Buchung nicht gefunden' });
  }

  if (req.session.user.role !== 'admin' && booking.user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
  res.json({ ok: true, message: 'Buchung gel\u00f6scht.' });
});

app.post('/api/bookings/:id/cancel-notify', requireAuth, async (req, res, next) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, r.name AS resource_name, r.type AS resource_type, r.house_id, h.name AS house_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN houses h ON h.id = r.house_id
      WHERE b.id = ? AND r.house_id = ?
    `).get(Number(req.params.id), currentHouseId(req));

    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    if (req.session.user.role !== 'admin' && booking.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
    }

    const windowStatus = releaseWindowStatus(booking.booking_date, booking.slot);
    if (windowStatus.reason !== 'not_started') {
      return res.status(409).json({
        error: 'Absagen mit Benachrichtigung ist nur vor Beginn m\u00f6glich. Im laufenden Slot bitte Freigeben verwenden.'
      });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
    const message = `${booking.resource_name} am ${booking.booking_date} im Zeitfenster ${booking.slot} wurde abgesagt und ist wieder buchbar.`;
    db.prepare(`
      INSERT INTO release_notices (resource_name, booking_date, slot, kind, message, house_id, created_by)
      VALUES (?, ?, ?, 'cancellation', ?, ?, ?)
    `).run(booking.resource_name, booking.booking_date, booking.slot, message, booking.house_id, req.session.user.id);

    const emailNotifications = await notifyReleaseSubscribers(
      req,
      booking,
      message,
      `Waschplan: Termin f\u00fcr ${booking.resource_name} wieder frei`
    );
    res.json({ ok: true, message, releaseNoticeCreated: true, emailNotifications });
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings/:id/release', requireAuth, async (req, res, next) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, r.name AS resource_name, r.type AS resource_type, r.house_id, h.name AS house_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN houses h ON h.id = r.house_id
      WHERE b.id = ? AND r.house_id = ?
    `).get(Number(req.params.id), currentHouseId(req));

    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    if (req.session.user.role !== 'admin' && booking.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
    }

    const releaseWindow = releaseWindowStatus(booking.booking_date, booking.slot);
    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);

    if (!releaseWindow.eligible) {
      const message = releaseWindow.reason === 'ended'
        ? 'Buchung gelöscht. Das Zeitfenster ist bereits beendet; es wurde kein Freigabe-Hinweis versendet.'
        : 'Buchung gelöscht. Freigabe-Hinweise werden nur während des gebuchten Zeitfensters versendet.';
      return res.json({
        ok: true,
        message,
        releaseNoticeCreated: false,
        emailNotifications: { configured: emailStatus().configured, sent: 0, skipped: true }
      });
    }

    const message = releaseWindow.hasStarted
      ? `${booking.resource_name} ist heute bis ${slotEndLabel(booking.slot)} wieder frei.`
      : `${booking.resource_name} ist am ${booking.booking_date} im Zeitfenster ${booking.slot} wieder frei.`;
    db.prepare(`
      INSERT INTO release_notices (resource_name, booking_date, slot, kind, message, house_id, created_by)
      VALUES (?, ?, ?, 'early_release', ?, ?, ?)
    `).run(booking.resource_name, booking.booking_date, booking.slot, message, booking.house_id, req.session.user.id);

    const emailNotifications = await notifyReleaseSubscribers(req, booking, message);
    res.json({ ok: true, message, releaseNoticeCreated: true, emailNotifications });
  } catch (error) {
    next(error);
  }
});

app.get('/api/release-notices', requireAuth, (req, res) => {
  const notices = db.prepare(`
    SELECT rn.id, rn.resource_name, rn.booking_date, rn.slot, rn.kind, rn.message, rn.created_at,
           u.username AS created_by_name
    FROM release_notices rn
    LEFT JOIN users u ON u.id = rn.created_by
    WHERE rn.house_id = ?
      AND rn.created_at >= datetime('now', '-7 days', 'localtime')
    ORDER BY rn.created_at DESC
    LIMIT 10
  `).all(currentHouseId(req)).filter((notice) => {
    const windowStatus = releaseWindowStatus(notice.booking_date, notice.slot);
    return notice.kind === 'cancellation'
      ? ['not_started', 'eligible'].includes(windowStatus.reason)
      : windowStatus.eligible;
  });

  res.json({ notices });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, house_id, is_superadmin, active, notify_releases, email_verified, created_at
    FROM users
    WHERE house_id = ?
    ORDER BY username
  `).all(currentHouseId(req));
  res.json({ users });
});

app.put('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const active = req.body?.active === true ? 1 : 0;
  const user = db.prepare(`
    SELECT id, username, role, is_superadmin, active
    FROM users WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (!active && user.id === req.session.user.id) {
    return res.status(400).json({ error: 'Du kannst dein eigenes Admin-Konto nicht deaktivieren.' });
  }
  if (user.is_superadmin && user.id !== req.session.user.id) {
    return res.status(403).json({ error: 'Das Superadmin-Konto kann hier nicht ge\u00e4ndert werden.' });
  }
  if (!isSuperadmin(req) && user.role === 'admin') {
    return res.status(403).json({ error: 'Hausadmins k\u00f6nnen andere Admin-Konten nicht verwalten.' });
  }
  if (!active && user.role === 'admin') {
    const activeAdmins = db.prepare(`
      SELECT COUNT(*) AS count FROM users
      WHERE role = 'admin' AND active = 1 AND house_id = ?
    `).get(currentHouseId(req)).count;
    if (activeAdmins <= 1) {
      return res.status(400).json({ error: 'Mindestens ein aktives Admin-Konto muss erhalten bleiben.' });
    }
  }

  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, user.id);
  if (!active) {
    destroyUserSessions(user.id);
  }
  writeAudit(req, 'user.status', 'user', user.id, { active: Boolean(active) });
  res.json({ ok: true, message: `${user.username} ist jetzt ${active ? 'aktiv' : 'deaktiviert'}.` });
});

app.put('/api/admin/users/:id/password', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const newPassword = String(req.body?.newPassword || '');
  const user = db.prepare(`
    SELECT id, username, role, is_superadmin FROM users
    WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (user.id === req.session.user.id) {
    return res.status(400).json({ error: 'Dein eigenes Passwort \u00e4nderst du unter Buchen in Zugang & Sicherheit.' });
  }
  if (user.is_superadmin && user.id !== req.session.user.id) {
    return res.status(403).json({ error: 'Das Superadmin-Passwort kann hier nicht ge\u00e4ndert werden.' });
  }
  if (!isSuperadmin(req) && user.role === 'admin') {
    return res.status(403).json({ error: 'Hausadmins k\u00f6nnen Passw\u00f6rter anderer Admins nicht zur\u00fccksetzen.' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Das neue Passwort muss 8 bis 128 Zeichen haben.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), user.id);
  destroyUserSessions(user.id, user.id === req.session.user.id ? req.sessionID : '');
  writeAudit(req, 'user.password_reset', 'user', user.id);
  res.json({ ok: true, message: `Passwort f\u00fcr ${user.username} wurde neu gesetzt.` });
});

app.put('/api/admin/users/:id/role', requireAdmin, requireSuperadmin, (req, res) => {
  const userId = Number(req.params.id);
  const role = String(req.body?.role || '');
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Ung\u00fcltige Rolle.' });
  }
  const user = db.prepare(`
    SELECT id, username, is_superadmin
    FROM users WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));
  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Die Rolle des Superadmins kann nicht ge\u00e4ndert werden.' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  destroyUserSessions(user.id);
  writeAudit(req, 'user.role', 'user', user.id, { role });
  res.json({ message: `${user.username} ist jetzt ${role === 'admin' ? 'Haus-Admin' : 'Bewohner'}.` });
});

app.put('/api/admin/users/:id/house', requireAdmin, requireSuperadmin, (req, res) => {
  const userId = Number(req.params.id);
  const houseId = Number(req.body?.houseId);
  const user = db.prepare('SELECT id, username, house_id, is_superadmin FROM users WHERE id = ?').get(userId);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ? AND active = 1').get(houseId);
  if (!user || !house) {
    return res.status(404).json({ error: 'Konto oder Zielhaus nicht gefunden.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Das Superadmin-Konto kann nicht verschoben werden.' });
  }
  if (user.house_id === house.id) {
    return res.status(400).json({ error: 'Das Konto geh\u00f6rt bereits zu diesem Haus.' });
  }
  const futureBookings = db.prepare('SELECT COUNT(*) AS count FROM bookings WHERE user_id = ? AND booking_date >= ?')
    .get(user.id, todayStringLocal()).count;
  if (futureBookings) {
    return res.status(409).json({ error: 'Vor dem Umzug m\u00fcssen die kommenden Buchungen dieses Kontos gel\u00f6scht werden.' });
  }
  const previousHouseId = user.house_id;
  db.prepare('UPDATE users SET house_id = ?, role = ? WHERE id = ?').run(house.id, 'user', user.id);
  destroyUserSessions(user.id);
  writeAudit(req, 'user.move', 'user', user.id, { fromHouseId: previousHouseId, toHouseId: house.id });
  res.json({ ok: true, message: `${user.username} wurde nach ${house.name} verschoben.` });
});

app.get('/api/admin/audit-log', requireAdmin, (req, res) => {
  const entries = db.prepare(`
    SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
           u.username AS actor
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.house_id = ? OR ? = 1
    ORDER BY al.id DESC
    LIMIT 80
  `).all(currentHouseId(req), isSuperadmin(req) ? 1 : 0).map((entry) => ({
    ...entry,
    details: (() => { try { return JSON.parse(entry.details || '{}'); } catch { return {}; } })()
  }));
  res.json({ entries });
});

app.get('/api/admin/backup', requireAdmin, requireSuperadmin, async (req, res, next) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const downloadName = `waschplan-backup-${stamp}.sqlite`;
  const backupPath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${downloadName}`);

  try {
    await db.backup(backupPath);
    writeAudit(req, 'backup.download', 'database');
    res.download(backupPath, downloadName, (error) => {
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

app.post('/api/admin/backup/run', requireAdmin, requireSuperadmin, async (req, res) => {
  try {
    const status = await createVerifiedBackup();
    writeAudit(req, 'backup.create', 'database', '', status);
    res.json({ status, message: 'Backup wurde erstellt und gepr\u00fcft.' });
  } catch (error) {
    setSetting('backup_status', JSON.stringify({ ok: false, createdAt: new Date().toISOString(), error: error.message }));
    res.status(500).json({ error: `Backup fehlgeschlagen: ${error.message}` });
  }
});

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const houseId = currentHouseId(req);
  const users = db.prepare('SELECT COUNT(*) AS count FROM users WHERE active = 1 AND house_id = ?').get(houseId).count;
  const todayBookings = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings b JOIN resources r ON r.id = b.resource_id
    WHERE b.booking_date = ? AND r.house_id = ?
  `).get(todayStringLocal(), houseId).count;
  const activeResources = db.prepare('SELECT COUNT(*) AS count FROM resources WHERE active = 1 AND house_id = ?').get(houseId).count;
  const fixedBookings = db.prepare(`
    SELECT COUNT(*) AS count
    FROM fixed_bookings fb JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1 AND r.house_id = ?
  `).get(houseId).count;
  const recentReleases = db.prepare(`
    SELECT COUNT(*) AS count
    FROM release_notices
    WHERE house_id = ? AND created_at >= datetime('now', '-7 days')
  `).get(houseId).count;

  res.json({
    users,
    todayBookings,
    activeResources,
    fixedBookings,
    recentReleases,
    email: emailStatus(),
    backup: (() => {
      try { return JSON.parse(getSetting('backup_status') || 'null'); } catch { return null; }
    })()
  });
});

app.post('/api/admin/email-test', requireAdmin, async (req, res, next) => {
  const config = smtpConfig();
  const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(req.session.user.id);
  const house = db.prepare('SELECT name FROM houses WHERE id = ?').get(currentHouseId(req));

  if (!config.host || !config.from) {
    return res.status(409).json({ error: 'Der E-Mail-Versand ist noch nicht in Render konfiguriert.' });
  }
  if (!user || !isValidEmail(user.email)) {
    return res.status(400).json({ error: 'Bitte zuerst unter Benachrichtigungen eine g\u00fcltige E-Mail-Adresse speichern.' });
  }

  try {
    await sendMail({
      config,
      to: user.email,
      subject: 'Waschplan: Testmail',
      text: [
        `Hallo ${user.username}`,
        '',
        'Der E-Mail-Versand des Waschplans funktioniert.',
        '',
        'Viele Gr\u00fcsse',
        `Waschplan ${house?.name || 'GBMZ'}`
      ].join('\n')
    });
    res.json({ ok: true, message: `Testmail wurde an ${user.email} gesendet.` });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const house = db.prepare('SELECT id, name, code FROM houses WHERE id = ?').get(currentHouseId(req));
  res.json({
    houseCode: house?.code || '',
    houseName: house?.name || ''
  });
});

app.get('/api/admin/houses', requireAdmin, requireSuperadmin, (req, res) => {
  const houses = db.prepare(`
    SELECT h.id, h.name, h.code, h.active, h.created_at,
           COUNT(DISTINCT u.id) AS users,
           COUNT(DISTINCT r.id) AS resources
    FROM houses h
    LEFT JOIN users u ON u.house_id = h.id AND u.active = 1
    LEFT JOIN resources r ON r.house_id = h.id AND r.active = 1
    GROUP BY h.id
    ORDER BY h.name
  `).all();
  res.json({ houses, activeHouseId: currentHouseId(req) });
});

app.post('/api/admin/houses', requireAdmin, requireSuperadmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const code = String(req.body?.code || '').trim();
  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Die Hausnummer muss 2 bis 80 Zeichen haben.' });
  }
  if (code.length < 4 || code.length > 80) {
    return res.status(400).json({ error: 'Der Hauscode muss 4 bis 80 Zeichen haben.' });
  }
  if (db.prepare('SELECT id FROM houses WHERE lower(name) = lower(?)').get(name)) {
    return res.status(409).json({ error: 'Diese Hausnummer ist bereits vorhanden.' });
  }

  try {
    const house = db.transaction(() => {
      const result = db.prepare('INSERT INTO houses (name, code) VALUES (?, ?)').run(name, code);
      seedHouseResources(result.lastInsertRowid);
      return db.prepare('SELECT id, name, code, active FROM houses WHERE id = ?').get(result.lastInsertRowid);
    })();
    writeAudit(req, 'house.create', 'house', house.id, { name: house.name });
    res.status(201).json({ house, message: `${house.name} wurde mit eigenen Ger\u00e4ten angelegt.` });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Hausnummer oder Hauscode ist bereits vorhanden.' });
    }
    throw error;
  }
});

app.put('/api/admin/houses/:id', requireAdmin, requireSuperadmin, (req, res) => {
  const house = db.prepare('SELECT id, name, active FROM houses WHERE id = ?').get(Number(req.params.id));
  if (!house) {
    return res.status(404).json({ error: 'Hausnummer nicht gefunden.' });
  }
  const name = String(req.body?.name ?? house.name).trim();
  const active = req.body?.active == null ? house.active : req.body.active === true ? 1 : 0;
  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Die Hausnummer muss 2 bis 80 Zeichen haben.' });
  }
  if (db.prepare('SELECT id FROM houses WHERE lower(name) = lower(?) AND id != ?').get(name, house.id)) {
    return res.status(409).json({ error: 'Diese Hausnummer ist bereits vorhanden.' });
  }
  if (!active && house.active) {
    if (Number(house.id) === Number(currentHouseId(req))) {
      return res.status(409).json({ error: 'Wechsle zuerst zu einem anderen Haus.' });
    }
    const activeUsers = db.prepare('SELECT COUNT(*) AS count FROM users WHERE house_id = ? AND active = 1').get(house.id).count;
    const futureBookings = db.prepare(`
      SELECT COUNT(*) AS count FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.house_id = ? AND b.booking_date >= ?
    `).get(house.id, todayStringLocal()).count;
    if (activeUsers || futureBookings) {
      return res.status(409).json({ error: 'Ein Haus mit aktiven Konten oder kommenden Buchungen kann nicht deaktiviert werden.' });
    }
  }
  db.prepare('UPDATE houses SET name = ?, active = ? WHERE id = ?').run(name, active, house.id);
  writeAudit(req, 'house.update', 'house', house.id, { name, active: Boolean(active) });
  res.json({ ok: true, message: `${name} wurde aktualisiert.` });
});

app.get('/api/admin/fixed-bookings', requireAdmin, (req, res) => {
  const fixedBookings = db.prepare(`
    SELECT fb.id, fb.resource_id, fb.weekday, fb.slot, fb.label, fb.created_at,
           r.name AS resource_name, r.type AS resource_type
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1 AND r.house_id = ?
    ORDER BY fb.weekday, fb.slot, r.name
  `).all(currentHouseId(req));

  res.json({ fixedBookings });
});

app.post('/api/admin/fixed-bookings', requireAdmin, (req, res) => {
  const resourceId = Number(req.body?.resourceId);
  const weekday = Number(req.body?.weekday);
  const slot = String(req.body?.slot || '');
  const label = String(req.body?.label || '').trim();

  if (!Number.isInteger(resourceId) || !Number.isInteger(weekday) || weekday < 1 || weekday > 6 || !slots.includes(slot)) {
    return res.status(400).json({ error: 'Ung\u00fcltige feste Buchung' });
  }
  if (label.length < 2 || label.length > 80) {
    return res.status(400).json({ error: 'Bitte einen Namen oder Hinweis eintragen' });
  }

  const resource = db.prepare(`
    SELECT id, type FROM resources
    WHERE id = ? AND active = 1 AND house_id = ?
  `).get(resourceId, currentHouseId(req));
  if (!resource) {
    return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
  }

  if (resource.type === 'tumbler') {
    const totalTumblers = db.prepare(`
      SELECT COUNT(*) AS count FROM resources
      WHERE active = 1 AND type = 'tumbler' AND house_id = ?
    `).get(currentHouseId(req)).count;
    const fixedTumblers = db.prepare(`
      SELECT COUNT(*) AS count
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1 AND r.type = 'tumbler' AND r.house_id = ?
        AND fb.weekday = ? AND fb.slot = ?
    `).get(currentHouseId(req), weekday, slot).count;
    if (fixedTumblers >= Math.max(0, totalTumblers - 1)) {
      return res.status(409).json({ error: 'Mindestens ein Tumbler muss in diesem Slot frei bleiben.' });
    }
  }

  const conflictingBooking = db.prepare(`
    SELECT b.id
    FROM bookings b
    WHERE b.resource_id = ?
      AND b.slot = ?
      AND b.booking_date >= ?
      AND CAST(strftime('%w', b.booking_date) AS INTEGER) = ?
    LIMIT 1
  `).get(resourceId, slot, todayStringLocal(), weekday);

  if (conflictingBooking) {
    return res.status(409).json({ error: 'Es gibt bereits eine normale zuk\u00fcnftige Buchung in diesem Dauer-Slot. Bitte zuerst kl\u00e4ren oder l\u00f6schen.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO fixed_bookings (resource_id, weekday, slot, label, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(resourceId, weekday, slot, label, req.session.user.id);

    writeAudit(req, 'fixed_booking.create', 'fixed_booking', result.lastInsertRowid, {
      resourceId, weekday, slot, label
    });

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Feste Buchung gespeichert.'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'F\u00fcr dieses Ger\u00e4t gibt es an diesem Wochentag und Slot bereits eine feste Buchung.' });
    }
    throw error;
  }
});

app.delete('/api/admin/fixed-bookings/:id', requireAdmin, (req, res) => {
  const fixedBooking = db.prepare(`
    SELECT fb.id
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.id = ? AND fb.active = 1 AND r.house_id = ?
  `).get(Number(req.params.id), currentHouseId(req));
  if (!fixedBooking) {
    return res.status(404).json({ error: 'Feste Buchung nicht gefunden' });
  }

  db.prepare('UPDATE fixed_bookings SET active = 0 WHERE id = ?').run(fixedBooking.id);
  writeAudit(req, 'fixed_booking.delete', 'fixed_booking', fixedBooking.id);
  res.json({ ok: true, message: 'Feste Buchung entfernt.' });
});

app.put('/api/admin/settings/house-code', requireAdmin, (req, res) => {
  const houseCode = String(req.body?.houseCode || '').trim();
  if (houseCode.length < 4 || houseCode.length > 80) {
    return res.status(400).json({ error: 'Hauscode muss 4 bis 80 Zeichen haben' });
  }

  try {
    db.prepare('UPDATE houses SET code = ? WHERE id = ?').run(houseCode, currentHouseId(req));
    writeAudit(req, 'house.code', 'house', currentHouseId(req));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Dieser Hauscode wird bereits f\u00fcr eine andere Hausnummer verwendet.' });
    }
    throw error;
  }

  res.json({ houseCode, message: 'Hauscode gespeichert.' });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

cleanupExpiredData();
const cleanupTimer = setInterval(cleanupExpiredData, 24 * 60 * 60 * 1000);
cleanupTimer.unref();
if (isProduction || String(process.env.AUTO_BACKUP || '').toLowerCase() === 'true') {
  const initialBackupTimer = setTimeout(runScheduledBackup, 60 * 1000);
  initialBackupTimer.unref();
  const backupTimer = setInterval(runScheduledBackup, 24 * 60 * 60 * 1000);
  backupTimer.unref();
}

app.listen(port, () => {
  console.log(`Waschplan App laeuft auf http://localhost:${port}`);
  console.log(`SQLite: ${dbPath}`);
});
