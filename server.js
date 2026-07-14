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

const sessionSecret = process.env.SESSION_SECRET || 'local-dev-session-secret';
if (isProduction && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET muss in Produktion mindestens 32 Zeichen haben.');
}
const slots = [
  '07:00-12:00',
  '12:00-17:00',
  '17:00-21:00'
];

function createCurrentTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      active INTEGER NOT NULL DEFAULT 1,
      notify_releases INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('washer', 'drying_room', 'tumbler')),
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      slot TEXT NOT NULL,
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
      message TEXT NOT NULL,
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
  `);
}

function seedCurrentDefaults() {
  ensureColumn('users', 'active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'email', 'TEXT');
  ensureColumn('users', 'notify_releases', 'INTEGER NOT NULL DEFAULT 1');
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL AND email != ''");
  const seededAdminPassword = String(process.env.SEED_ADMIN_PASSWORD || '');
  if (seededAdminPassword) {
    seedUser(process.env.SEED_ADMIN_NAME || 'admin', seededAdminPassword, 'admin');
  } else if (!isProduction) {
    seedUser('admin', 'admin123', 'admin');
  }
  if (!isProduction) {
    seedUser('user', 'user123', 'user');
  }
  seedResource('Waschmaschine 1', 'washer');
  seedResource('Waschmaschine 2', 'washer');
  seedResource('Waschmaschine 3', 'washer');
  seedResource('Trockenraum 1', 'drying_room');
  seedResource('Trockenraum 2', 'drying_room');
  seedResource('Trockenraum 3', 'drying_room');
  seedResource('Tumbler 1', 'tumbler');
  seedResource('Tumbler 2', 'tumbler');
  const initialHouseCode = process.env.HOUSE_CODE
    || (isProduction ? `GBMZ-${crypto.randomBytes(5).toString('hex')}` : 'GBMZ Maneggplatz 18');
  seedSetting('house_code', initialHouseCode);
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

function seedUser(username, password, role) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!exists) {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username, bcrypt.hashSync(password, 10), role);
  }
}

function seedResource(name, type) {
  const exists = db.prepare('SELECT id FROM resources WHERE name = ?').get(name);
  if (!exists) {
    db.prepare('INSERT INTO resources (name, type) VALUES (?, ?)').run(name, type);
  }
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

if (isProduction) {
  const activeAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get();
  if (!activeAdmin) {
    throw new Error('Kein aktives Admin-Konto vorhanden. Fuer eine neue Datenbank SEED_ADMIN_PASSWORD setzen.');
  }
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

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayStringLocal() {
  return formatDateLocal(new Date());
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateLocal(date);
}

function weekdayForDate(dateString) {
  return new Date(`${dateString}T12:00:00`).getDay();
}

function getFixedBookingsForDate(dateString) {
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
      AND fb.weekday = ?
    ORDER BY fb.slot, r.name
  `).all(dateString, weekday);
}

function fixedBookingConflict(resourceId, dateString, slot) {
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
      AND fb.weekday = ?
      AND fb.slot = ?
    LIMIT 1
  `).get(Number(resourceId), weekday, slot);
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

function hasAllowedDryingRoomWindow(userId, date, slot) {
  const previousDate = addDays(date, -1);
  const washerBookings = db.prepare(`
    SELECT b.booking_date, b.slot
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND b.booking_date IN (?, ?)
  `).all(userId, date, previousDate);

  return washerBookings.some((booking) => (
    allowedDryingRoomSlots(booking.booking_date, booking.slot)
      .some((allowed) => allowed.date === date && allowed.slot === slot)
  ));
}

function validateWasherBooking(userId, date, slot) {
  const today = todayStringLocal();
  const washerBookings = db.prepare(`
    SELECT b.booking_date, b.slot
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND b.booking_date >= ?
  `).all(userId, today);

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

function validateTumblerBooking(date, slot) {
  const totalTumblers = db.prepare(`
    SELECT COUNT(*) AS count
    FROM resources
    WHERE active = 1 AND type = 'tumbler'
  `).get().count;

  const bookedTumblers = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.type = 'tumbler'
      AND b.booking_date = ?
      AND b.slot = ?
  `).get(date, slot).count;

  const fixedTumblers = db.prepare(`
    SELECT COUNT(*) AS count
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1
      AND r.type = 'tumbler'
      AND fb.weekday = ?
      AND fb.slot = ?
  `).get(weekdayForDate(date), slot).count;

  if (bookedTumblers + fixedTumblers >= Math.max(0, totalTumblers - 1)) {
    return 'Mindestens ein Tumbler muss am Ende des Waschslots frei bleiben.';
  }

  return '';
}

function validateDryingRoomBooking(userId, date, slot) {
  const userDryingRoomInSlot = db.prepare(`
    SELECT b.id
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'drying_room'
      AND b.booking_date = ?
      AND b.slot = ?
    LIMIT 1
  `).get(userId, date, slot);

  if (userDryingRoomInSlot) {
    return 'Pro Slot kann nur ein Trockenraum reserviert werden.';
  }

  if (!hasAllowedDryingRoomWindow(userId, date, slot)) {
    return 'Trockenr\u00e4ume k\u00f6nnen nur passend zu deiner Waschmaschinen-Buchung reserviert werden: 07:00 bis 21:00, 12:00 bis Folgetag 12:00, 17:00 bis Folgetag 12:00.';
  }

  return '';
}

function calendarDaySummary(userId, date) {
  const activeResources = db.prepare(`
    SELECT id, type
    FROM resources
    WHERE active = 1
  `).all();
  const normalBookings = db.prepare(`
    SELECT b.resource_id, b.slot, b.user_id, r.type AS resource_type
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.booking_date = ?
  `).all(date);
  const fixedBookings = getFixedBookingsForDate(date);
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

function findAvailableResource(userId, type, date, slot) {
  if (isPastSlot(date, slot)) {
    return null;
  }

  let ruleError = '';
  if (type === 'washer') {
    ruleError = validateWasherBooking(userId, date, slot);
  } else if (type === 'drying_room') {
    ruleError = validateDryingRoomBooking(userId, date, slot);
  } else if (type === 'tumbler') {
    ruleError = validateTumblerBooking(date, slot);
  }
  if (ruleError) {
    return null;
  }

  return db.prepare(`
    SELECT r.id, r.name, r.type
    FROM resources r
    WHERE r.active = 1
      AND r.type = ?
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
  `).get(type, date, slot, weekdayForDate(date), slot) || null;
}

function userHasBookingInWindow(userId, type, window) {
  return window.some(({ date, slot }) => Boolean(db.prepare(`
    SELECT b.id
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = ?
      AND b.booking_date = ?
      AND b.slot = ?
    LIMIT 1
  `).get(userId, type, date, slot)));
}

function companionPreference(userId) {
  const rows = db.prepare(`
    SELECT r.type, COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND b.booking_date < date('now', 'localtime')
      AND r.type IN ('drying_room', 'tumbler')
    GROUP BY r.type
  `).all(userId);
  const counts = Object.fromEntries(rows.map((row) => [row.type, row.count]));
  return (counts.tumbler || 0) > (counts.drying_room || 0)
    ? ['tumbler', 'drying_room']
    : ['drying_room', 'tumbler'];
}

function companionRecommendation(userId, washerBooking) {
  const dryingWindow = allowedDryingRoomSlots(washerBooking.booking_date, washerBooking.slot);
  const candidates = {};

  if (!userHasBookingInWindow(userId, 'drying_room', dryingWindow)) {
    for (const option of dryingWindow) {
      const resource = findAvailableResource(userId, 'drying_room', option.date, option.slot);
      if (resource) {
        candidates.drying_room = {
          resource,
          date: option.date,
          slot: option.slot,
          title: 'Trockenraum erg\u00e4nzen',
          reason: 'Passt zu deiner vorhandenen Waschmaschinen-Buchung.'
        };
        break;
      }
    }
  }

  const tumblerWindow = [{ date: washerBooking.booking_date, slot: washerBooking.slot }];
  if (!userHasBookingInWindow(userId, 'tumbler', tumblerWindow)) {
    const resource = findAvailableResource(
      userId,
      'tumbler',
      washerBooking.booking_date,
      washerBooking.slot
    );
    if (resource) {
      candidates.tumbler = {
        resource,
        date: washerBooking.booking_date,
        slot: washerBooking.slot,
        title: 'Tumbler erg\u00e4nzen',
        reason: 'Liegt im gleichen Zeitfenster wie deine Waschmaschinen-Buchung.'
      };
    }
  }

  for (const type of companionPreference(userId)) {
    const candidate = candidates[type];
    if (candidate) {
      return {
        kind: 'booking',
        resourceId: candidate.resource.id,
        resourceName: candidate.resource.name,
        resourceType: candidate.resource.type,
        date: candidate.date,
        slot: candidate.slot,
        title: candidate.title,
        reason: candidate.reason,
        actionLabel: 'Direkt buchen'
      };
    }
  }
  return null;
}

function washerHistoryPreference(userId) {
  return db.prepare(`
    SELECT CAST(strftime('%w', b.booking_date) AS INTEGER) AS weekday,
           b.slot,
           COUNT(*) AS count,
           MAX(b.booking_date) AS last_date
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND b.booking_date < date('now', 'localtime')
    GROUP BY weekday, b.slot
    ORDER BY count DESC, last_date DESC
    LIMIT 1
  `).get(userId) || null;
}

function nextWasherRecommendation(userId, startDate) {
  const preference = washerHistoryPreference(userId);
  const candidates = [];

  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDays(startDate, offset);
    const weekday = weekdayForDate(date);
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
    const resource = findAvailableResource(userId, 'washer', candidate.date, candidate.slot);
    if (!resource) {
      continue;
    }
    const matchesHabit = Boolean(
      preference
      && candidate.weekday === preference.weekday
      && candidate.slot === preference.slot
    );
    return {
      kind: 'booking',
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      date: candidate.date,
      slot: candidate.slot,
      title: preference ? 'Dein passender Waschslot' : 'N\u00e4chster freier Waschslot',
      reason: preference
        ? (matchesHabit
          ? 'Dieser freie Termin entspricht deinem bisher h\u00e4ufigsten Waschrhythmus.'
          : 'Dein \u00fcblicher Termin ist belegt. Dies ist die n\u00e4chste passende freie Option.')
        : 'Ein fr\u00fcher freier Termin f\u00fcr deinen ersten Waschrhythmus.',
      actionLabel: 'Direkt buchen'
    };
  }
  return null;
}

function bookingRecommendation(userId) {
  const today = todayStringLocal();
  const upcomingWashers = db.prepare(`
    SELECT b.booking_date, b.slot
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND b.booking_date >= ?
    GROUP BY b.booking_date, b.slot
    ORDER BY b.booking_date, b.slot
  `).all(userId, today);

  for (const washerBooking of upcomingWashers) {
    const companion = companionRecommendation(userId, washerBooking);
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
  return nextWasherRecommendation(userId, startDate) || {
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

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function isSunday(dateString) {
  return new Date(`${dateString}T12:00:00`).getDay() === 0;
}

function isPastDate(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateString}T00:00:00`);
  return date < today;
}

function isPastSlot(dateString, slot) {
  if (!isDateString(dateString) || !slots.includes(slot)) {
    return false;
  }

  const [, end] = slot.split('-');
  const slotEnd = new Date(`${dateString}T${end}:00`);
  return slotEnd <= new Date();
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

async function notifyReleaseSubscribers(req, booking, message) {
  const config = smtpConfig();
  if (!config.host || !config.from) {
    return { configured: false, sent: 0 };
  }

  const recipients = db.prepare(`
    SELECT id, username, email
    FROM users
    WHERE active = 1
      AND notify_releases = 1
      AND email IS NOT NULL
      AND email != ''
      AND id != ?
    ORDER BY username
  `).all(booking.user_id);

  if (!recipients.length) {
    return { configured: true, sent: 0 };
  }

  const appUrl = publicAppUrl(req);
  let sent = 0;

  for (const recipient of recipients) {
    try {
      await sendMail({
        config,
        to: recipient.email,
        subject: `Waschplan: ${booking.resource_name} fr\u00fcher frei`,
        text: [
          `Hallo ${recipient.username}`,
          '',
          message,
          '',
          `Du kannst den Slot jetzt im Waschplan ansehen und buchen: ${appUrl}`,
          '',
          'Viele Gr\u00fcsse',
          'Waschplan Maneggplatz 18'
        ].join('\n')
      });
      sent += 1;
    } catch (error) {
      console.error(`E-Mail an ${recipient.email} konnte nicht gesendet werden: ${error.message}`);
    }
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

app.get(['/health', '/api/health'], (req, res) => {
  const storage = process.env.RENDER === 'true'
    ? (dbPath.startsWith('/var/data') ? 'persistent' : 'ephemeral')
    : 'local';
  res.json({
    ok: true,
    storage,
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

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email || '',
    notifyReleases: Boolean(user.notify_releases)
  };
  clearAuthRateLimit(req);
  res.json({ user: req.session.user });
});

app.post('/api/register', authRateLimit, (req, res) => {
  const username = String(req.body?.username || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const houseCode = String(req.body?.houseCode || '').trim();
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const configuredCode = getSetting('house_code').trim();

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Der Benutzername darf 3 bis 40 Buchstaben, Zahlen, Leerzeichen, Punkte, Binde- oder Unterstriche enthalten.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Das Passwort muss 8 bis 128 Zeichen haben.' });
  }
  if (houseCode.toLowerCase() !== configuredCode.toLowerCase()) {
    return res.status(403).json({ error: 'Hauscode ist nicht korrekt' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, active, notify_releases)
      VALUES (?, ?, ?, 'user', 1, ?)
    `).run(username, email, bcrypt.hashSync(password, 10), notifyReleases);

    req.session.user = {
      id: result.lastInsertRowid,
      username,
      role: 'user',
      email,
      notifyReleases: Boolean(notifyReleases)
    };
    clearAuthRateLimit(req);
    res.status(201).json({ user: req.session.user });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Benutzername oder E-Mail ist bereits vergeben' });
    }
    throw error;
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.put('/api/me/notifications', requireAuth, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const notifyReleases = req.body?.notifyReleases === false ? 0 : 1;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }

  try {
    db.prepare('UPDATE users SET email = ?, notify_releases = ? WHERE id = ?')
      .run(email, notifyReleases, req.session.user.id);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
    }
    throw error;
  }

  req.session.user.email = email;
  req.session.user.notifyReleases = Boolean(notifyReleases);
  res.json({ user: req.session.user, message: 'Benachrichtigungen gespeichert.' });
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

app.get('/api/calendar', requireAuth, (req, res) => {
  const from = String(req.query.from || todayStringLocal());
  const days = Number(req.query.days || 7);
  if (!isDateString(from) || !Number.isInteger(days) || days < 1 || days > 14) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Kalenderzeitraum' });
  }

  res.json({
    from,
    days: Array.from({ length: days }, (_, index) => (
      calendarDaySummary(req.session.user.id, addDays(from, index))
    ))
  });
});

app.get('/api/recommendation', requireAuth, (req, res) => {
  res.json({ recommendation: bookingRecommendation(req.session.user.id) });
});

app.get('/api/slots', requireAuth, (req, res) => {
  res.json({ slots });
});

app.get('/api/resources', requireAuth, (req, res) => {
  const resources = db.prepare('SELECT id, name, type FROM resources WHERE active = 1 ORDER BY type, name').all();
  res.json({ resources });
});

app.get('/api/my-bookings', requireAuth, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.id, b.booking_date, b.slot, r.id AS resource_id, r.name AS resource_name,
           r.type AS resource_type, u.id AS user_id, u.username
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN users u ON u.id = b.user_id
    WHERE b.user_id = ?
      AND b.booking_date >= date('now', 'localtime')
    ORDER BY b.booking_date, b.slot, r.name
    LIMIT 12
  `).all(req.session.user.id);

  res.json({ bookings });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const date = req.query.date;
  if (!isDateString(date)) {
    return res.status(400).json({ error: 'Datum im Format YYYY-MM-DD erforderlich' });
  }

  const bookings = db.prepare(`
    SELECT b.id, b.booking_date, b.slot, r.id AS resource_id, r.name AS resource_name,
           r.type AS resource_type, u.id AS user_id, u.username, 0 AS is_fixed
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN users u ON u.id = b.user_id
    WHERE b.booking_date = ?
    ORDER BY b.slot, r.name
  `).all(date);

  const fixedBookings = getFixedBookingsForDate(date);
  const allBookings = [...bookings, ...fixedBookings]
    .sort((left, right) => left.slot.localeCompare(right.slot) || left.resource_name.localeCompare(right.resource_name));

  res.json({ bookings: allBookings });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { resourceId, date, slot } = req.body || {};

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

  const resource = db.prepare('SELECT id, type FROM resources WHERE id = ? AND active = 1').get(Number(resourceId));
  if (!resource) {
    return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
  }

  const fixedConflict = fixedBookingConflict(resource.id, date, slot);
  if (fixedConflict) {
    return res.status(409).json({
      error: `${fixedConflict.resource_name} ist in diesem Slot fest f\u00fcr ${fixedConflict.label} reserviert.`
    });
  }

  let ruleError = '';
  if (resource.type === 'washer') {
    ruleError = validateWasherBooking(req.session.user.id, date, slot);
  } else if (resource.type === 'tumbler') {
    ruleError = validateTumblerBooking(date, slot);
  } else if (resource.type === 'drying_room') {
    ruleError = validateDryingRoomBooking(req.session.user.id, date, slot);
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

app.delete('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(req.params.id));
  if (!booking) {
    return res.status(404).json({ error: 'Buchung nicht gefunden' });
  }

  if (req.session.user.role !== 'admin' && booking.user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
  res.json({ ok: true, message: 'Buchung gel\u00f6scht.' });
});

app.post('/api/bookings/:id/release', requireAuth, async (req, res, next) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, r.name AS resource_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = ?
    `).get(Number(req.params.id));

    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    if (req.session.user.role !== 'admin' && booking.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
    const message = `${booking.resource_name} ist am ${booking.booking_date} bis ${slotEndLabel(booking.slot)} wieder frei.`;
    db.prepare(`
      INSERT INTO release_notices (resource_name, booking_date, slot, message, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(booking.resource_name, booking.booking_date, booking.slot, message, req.session.user.id);

    const emailNotifications = await notifyReleaseSubscribers(req, booking, message);
    res.json({ ok: true, message, emailNotifications });
  } catch (error) {
    next(error);
  }
});

app.get('/api/release-notices', requireAuth, (req, res) => {
  const notices = db.prepare(`
    SELECT rn.id, rn.resource_name, rn.booking_date, rn.slot, rn.message, rn.created_at,
           u.username AS created_by_name
    FROM release_notices rn
    LEFT JOIN users u ON u.id = rn.created_by
    WHERE rn.created_at >= datetime('now', '-7 days', 'localtime')
    ORDER BY rn.created_at DESC
    LIMIT 10
  `).all();

  res.json({ notices });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, active, notify_releases, created_at FROM users ORDER BY username').all();
  res.json({ users });
});

app.put('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const active = req.body?.active === true ? 1 : 0;
  const user = db.prepare('SELECT id, username, role, active FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (!active && user.id === req.session.user.id) {
    return res.status(400).json({ error: 'Du kannst dein eigenes Admin-Konto nicht deaktivieren.' });
  }
  if (!active && user.role === 'admin') {
    const activeAdmins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1").get().count;
    if (activeAdmins <= 1) {
      return res.status(400).json({ error: 'Mindestens ein aktives Admin-Konto muss erhalten bleiben.' });
    }
  }

  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, user.id);
  if (!active) {
    destroyUserSessions(user.id);
  }
  res.json({ ok: true, message: `${user.username} ist jetzt ${active ? 'aktiv' : 'deaktiviert'}.` });
});

app.put('/api/admin/users/:id/password', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const newPassword = String(req.body?.newPassword || '');
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Das neue Passwort muss 8 bis 128 Zeichen haben.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), user.id);
  destroyUserSessions(user.id, user.id === req.session.user.id ? req.sessionID : '');
  res.json({ ok: true, message: `Passwort f\u00fcr ${user.username} wurde neu gesetzt.` });
});

app.get('/api/admin/backup', requireAdmin, async (req, res, next) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const downloadName = `waschplan-backup-${stamp}.sqlite`;
  const backupPath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${downloadName}`);

  try {
    await db.backup(backupPath);
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

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT COUNT(*) AS count FROM users WHERE active = 1').get().count;
  const todayBookings = db.prepare(`
    SELECT COUNT(*) AS count FROM bookings WHERE booking_date = date('now', 'localtime')
  `).get().count;
  const activeResources = db.prepare('SELECT COUNT(*) AS count FROM resources WHERE active = 1').get().count;
  const fixedBookings = db.prepare('SELECT COUNT(*) AS count FROM fixed_bookings WHERE active = 1').get().count;
  const recentReleases = db.prepare(`
    SELECT COUNT(*) AS count
    FROM release_notices
    WHERE created_at >= datetime('now', '-7 days', 'localtime')
  `).get().count;

  res.json({
    users,
    todayBookings,
    activeResources,
    fixedBookings,
    recentReleases,
    email: emailStatus()
  });
});

app.post('/api/admin/email-test', requireAdmin, async (req, res, next) => {
  const config = smtpConfig();
  const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(req.session.user.id);

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
        'Waschplan Maneggplatz 18'
      ].join('\n')
    });
    res.json({ ok: true, message: `Testmail wurde an ${user.email} gesendet.` });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json({
    houseCode: getSetting('house_code')
  });
});

app.get('/api/admin/fixed-bookings', requireAdmin, (req, res) => {
  const fixedBookings = db.prepare(`
    SELECT fb.id, fb.resource_id, fb.weekday, fb.slot, fb.label, fb.created_at,
           r.name AS resource_name, r.type AS resource_type
    FROM fixed_bookings fb
    JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1
    ORDER BY fb.weekday, fb.slot, r.name
  `).all();

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

  const resource = db.prepare('SELECT id FROM resources WHERE id = ? AND active = 1').get(resourceId);
  if (!resource) {
    return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
  }

  const conflictingBooking = db.prepare(`
    SELECT b.id
    FROM bookings b
    WHERE b.resource_id = ?
      AND b.slot = ?
      AND b.booking_date >= date('now', 'localtime')
      AND CAST(strftime('%w', b.booking_date) AS INTEGER) = ?
    LIMIT 1
  `).get(resourceId, slot, weekday);

  if (conflictingBooking) {
    return res.status(409).json({ error: 'Es gibt bereits eine normale zuk\u00fcnftige Buchung in diesem Dauer-Slot. Bitte zuerst kl\u00e4ren oder l\u00f6schen.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO fixed_bookings (resource_id, weekday, slot, label, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(resourceId, weekday, slot, label, req.session.user.id);

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
  const fixedBooking = db.prepare('SELECT id FROM fixed_bookings WHERE id = ? AND active = 1').get(Number(req.params.id));
  if (!fixedBooking) {
    return res.status(404).json({ error: 'Feste Buchung nicht gefunden' });
  }

  db.prepare('UPDATE fixed_bookings SET active = 0 WHERE id = ?').run(fixedBooking.id);
  res.json({ ok: true, message: 'Feste Buchung entfernt.' });
});

app.put('/api/admin/settings/house-code', requireAdmin, (req, res) => {
  const houseCode = String(req.body?.houseCode || '').trim();
  if (houseCode.length < 4 || houseCode.length > 80) {
    return res.status(400).json({ error: 'Hauscode muss 4 bis 80 Zeichen haben' });
  }

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('house_code', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(houseCode);

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

app.listen(port, () => {
  console.log(`Waschplan App laeuft auf http://localhost:${port}`);
  console.log(`SQLite: ${dbPath}`);
});
