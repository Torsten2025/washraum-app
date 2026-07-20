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
const webPush = require('web-push');
const packageInfo = require('./package.json');
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
const serverStartedAt = new Date().toISOString();
const appVersion = String(packageInfo.version || '0.0.0');
const appRelease = String(
  process.env.RENDER_GIT_COMMIT
  || process.env.APP_RELEASE
  || `v${appVersion}`
).trim();
const appReleasedAt = String(process.env.APP_RELEASE_DATE || serverStartedAt).trim();
const allowLegacyHouseRegistration = process.env.ALLOW_LEGACY_HOUSE_REGISTRATION === 'true';
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
db.pragma('busy_timeout = 5000');

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
const configuredSessionIdleMinutes = Number.parseInt(process.env.SESSION_IDLE_MINUTES || '30', 10);
const sessionIdleMinutes = Number.isFinite(configuredSessionIdleMinutes)
  ? Math.min(480, Math.max(5, configuredSessionIdleMinutes))
  : 30;
const sessionIdleTimeoutMs = sessionIdleMinutes * 60 * 1000;
const sessionWarningMs = Math.min(2 * 60 * 1000, Math.floor(sessionIdleTimeoutMs / 3));
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
      email_verified INTEGER NOT NULL DEFAULT 0,
      booking_mode TEXT NOT NULL DEFAULT 'time' CHECK (booking_mode IN ('time', 'machine')),
      apartment_id INTEGER,
      secondary_email TEXT,
      secondary_email_verified INTEGER NOT NULL DEFAULT 0,
      merged_into_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE RESTRICT,
      FOREIGN KEY (merged_into_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS apartments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      display_name TEXT,
      activation_code_hash TEXT UNIQUE,
      claimed_by INTEGER UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      claimed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
      FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE (house_id, label)
    );

    CREATE TABLE IF NOT EXISTS apartment_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartment_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      email_sent_at TEXT,
      accepted_at TEXT,
      revoked_at TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS device_pairing_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS apartment_name_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      proposed_name TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      resolved_by INTEGER,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('washer', 'drying_room', 'tumbler')),
      house_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS maintenance_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL,
      resource_id INTEGER,
      reported_by INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'blocked', 'repairing', 'tested', 'closed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at TEXT,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE RESTRICT,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL,
      FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      entry_type TEXT NOT NULL CHECK (entry_type IN ('report', 'note', 'block', 'repair', 'test_passed', 'test_failed', 'release')),
      note TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES maintenance_cases(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
      resource_id INTEGER,
      resource_name TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      slot TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'early_release',
      message TEXT NOT NULL,
      house_id INTEGER,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL,
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

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      email_kind TEXT NOT NULL DEFAULT 'primary',
      email_value TEXT,
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

    CREATE TABLE IF NOT EXISTS account_recovery_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
  ensureColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'booking_mode', "TEXT NOT NULL DEFAULT 'time' CHECK (booking_mode IN ('time', 'machine'))");
  ensureColumn('users', 'house_id', 'INTEGER');
  ensureColumn('users', 'is_superadmin', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'apartment_id', 'INTEGER');
  ensureColumn('users', 'secondary_email', 'TEXT');
  ensureColumn('users', 'secondary_email_verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'merged_into_user_id', 'INTEGER');
  ensureColumn('apartments', 'display_name', 'TEXT');
  ensureColumn('resources', 'house_id', 'INTEGER');
  ensureColumn('resources', 'blocked_reason', 'TEXT');
  ensureColumn('resources', 'blocked_at', 'TEXT');
  ensureColumn('resources', 'blocked_by', 'INTEGER');
  ensureColumn('bookings', 'group_id', 'TEXT');
  ensureColumn('release_notices', 'kind', "TEXT NOT NULL DEFAULT 'early_release'");
  ensureColumn('release_notices', 'house_id', 'INTEGER');
  ensureColumn('release_notices', 'resource_id', 'INTEGER');
  ensureColumn('push_subscriptions', 'user_agent', 'TEXT');
  ensureColumn('push_subscriptions', 'active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('email_verification_tokens', 'email_kind', "TEXT NOT NULL DEFAULT 'primary'");
  ensureColumn('email_verification_tokens', 'email_value', 'TEXT');
  db.exec(`
    UPDATE users SET email_verified = 0
    WHERE email IS NULL OR trim(email) = '';
    UPDATE users SET secondary_email_verified = 0
    WHERE secondary_email IS NULL OR trim(secondary_email) = '';
  `);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL AND email != ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_houses_code_lower ON houses (lower(code))");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings (group_id) WHERE group_id IS NOT NULL");
  db.exec("CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id, active)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_apartment ON users (apartment_id)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apartment_unique ON users (apartment_id) WHERE apartment_id IS NOT NULL");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartments_house ON apartments (house_id, active, label)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartment_invitations_apartment ON apartment_invitations (apartment_id, created_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartment_invitations_email ON apartment_invitations (lower(email), expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_maintenance_cases_house_status ON maintenance_cases (house_id, status, updated_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_maintenance_cases_resource ON maintenance_cases (resource_id, status)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_one_open_case_per_resource ON maintenance_cases (resource_id) WHERE status != 'closed' AND resource_id IS NOT NULL");
  db.exec("CREATE INDEX IF NOT EXISTS idx_maintenance_entries_case ON maintenance_entries (case_id, created_at, id)");
  db.prepare("UPDATE apartments SET display_name = label WHERE display_name IS NULL OR trim(display_name) = ''").run();
  db.exec("CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON device_pairing_codes (user_id, expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_account_recovery_user ON account_recovery_codes (user_id, expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartment_name_requests ON apartment_name_requests (apartment_id, status, created_at)");
  const initialHouseCode = getSetting('house_code').trim()
    || process.env.HOUSE_CODE
    || (isProduction ? `GBMZ-${crypto.randomBytes(5).toString('hex')}` : 'GBMZ Maneggplatz 18');
  const defaultHouse = seedHouse(process.env.HOUSE_NAME || 'Maneggplatz 18', initialHouseCode);
  db.prepare('UPDATE users SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare('UPDATE resources SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare('UPDATE release_notices SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);

  const seededAdminPassword = String(process.env.SEED_ADMIN_PASSWORD || '');
  if (seededAdminPassword) {
    seedUser(
      process.env.SEED_ADMIN_NAME || 'admin',
      seededAdminPassword,
      'admin',
      defaultHouse.id,
      true,
      process.env.SEED_ADMIN_FORCE_PASSWORD_RESET === 'true'
    );
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

function seedUser(username, password, role, houseId, isSuperadmin = false, forcePasswordReset = false) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!exists) {
    db.prepare('INSERT INTO users (username, password_hash, role, house_id, is_superadmin) VALUES (?, ?, ?, ?, ?)')
      .run(username, bcrypt.hashSync(password, 10), role, houseId, isSuperadmin ? 1 : 0);
  } else if (isSuperadmin) {
    db.prepare(`
      UPDATE users
      SET password_hash = CASE WHEN ? THEN ? ELSE password_hash END,
          house_id = COALESCE(house_id, ?),
          role = 'admin',
          active = 1,
          is_superadmin = 1
      WHERE id = ?
    `).run(
      forcePasswordReset ? 1 : 0,
      bcrypt.hashSync(password, 10),
      houseId,
      exists.id
    );
  } else {
    db.prepare('UPDATE users SET house_id = COALESCE(house_id, ?) WHERE id = ?')
      .run(houseId, exists.id);
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

function maintenanceStatus() {
  const fallback = {
    active: false,
    message: '',
    startedAt: null,
    startedBy: '',
    backup: null,
    lastCheck: null
  };
  try {
    const stored = JSON.parse(getSetting('maintenance_status') || 'null');
    return stored && typeof stored === 'object'
      ? { ...fallback, ...stored, active: Boolean(stored.active) }
      : fallback;
  } catch {
    return fallback;
  }
}

function publicReleaseStatus() {
  const maintenance = maintenanceStatus();
  return {
    version: appVersion,
    release: appRelease,
    releasedAt: appReleasedAt,
    maintenance: {
      active: maintenance.active,
      message: maintenance.message,
      startedAt: maintenance.startedAt
    }
  };
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
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
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
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function clearSessionCookie(res) {
  res.clearCookie('connect.sid', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/'
  });
}

app.use((req, res, next) => {
  if (!req.session?.user?.id) {
    return next();
  }

  const now = Date.now();
  const lastActivityAt = Number(req.session.lastActivityAt || 0);
  if (lastActivityAt && now - lastActivityAt >= sessionIdleTimeoutMs) {
    const isApiRequest = req.path.startsWith('/api/');
    return req.session.destroy((error) => {
      if (error) {
        console.error(`Abgelaufene Sitzung konnte nicht aus dem Speicher entfernt werden: ${error.message}`);
      }
      res.setHeader('Cache-Control', 'no-store');
      clearSessionCookie(res);
      if (isApiRequest) {
        return res.status(401).json({
          error: 'Deine Sitzung wurde wegen Inaktivit\u00e4t beendet.',
          code: 'SESSION_IDLE_TIMEOUT'
        });
      }
      if (req.path === '/' || req.path === '/index.html') {
        return res.redirect(303, '/login.html?sessionExpired=1');
      }
      return next();
    });
  }

  if (!lastActivityAt || req.path === '/' || req.path === '/index.html' || req.path.startsWith('/api/')) {
    req.session.lastActivityAt = now;
  }
  next();
});

app.use((req, res, next) => {
  if (!req.session?.user?.id) {
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

app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  const allowedDuringMaintenance = new Set([
    '/api/login',
    '/api/logout',
    '/logout',
    '/api/session/keepalive',
    '/api/admin/maintenance'
  ]);
  const maintenance = maintenanceStatus();
  if (maintenance.active && !allowedDuringMaintenance.has(req.path)) {
    return res.status(503).json({
      code: 'MAINTENANCE_MODE',
      error: maintenance.message || 'WaschZeit wird gerade gewartet. Bitte versuche es in wenigen Minuten erneut.',
      maintenance: publicReleaseStatus().maintenance
    });
  }
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
  const closed = isSunday(date);
  const activeResources = db.prepare(`
    SELECT id, name, type
    FROM resources
    WHERE active = 1 AND house_id = ?
    ORDER BY type, name
  `).all(houseId);
  const normalBookings = db.prepare(`
    SELECT b.resource_id, b.slot, b.user_id, r.name AS resource_name, r.type AS resource_type
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
  const slotDetails = [];

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

    for (const slot of closed ? [] : slots) {
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

  for (const slot of slots) {
    const past = isPastSlot(date, slot);
    const types = {};

    for (const type of ['washer', 'drying_room', 'tumbler']) {
      const typeResources = activeResources.filter((resource) => resource.type === type);
      const capacity = type === 'tumbler'
        ? Math.max(0, typeResources.length - 1)
        : typeResources.length;
      const occupiedResources = typeResources.filter((resource) => occupied.has(`${resource.id}|${slot}`));
      const occupiedCount = occupiedResources.length;
      const bookable = closed || past ? 0 : Math.max(0, capacity - occupiedCount);
      const ownResourceIds = new Set(normalBookings
        .filter((booking) => booking.user_id === userId && booking.slot === slot)
        .map((booking) => booking.resource_id));
      const resourceStates = typeResources.map((resource) => {
        const isOccupied = occupied.has(`${resource.id}|${slot}`);
        let state = 'free';
        if (ownResourceIds.has(resource.id)) state = 'own';
        else if (isOccupied) state = 'booked';
        else if (closed) state = 'closed';
        else if (past) state = 'past';
        else if (type === 'tumbler' && bookable === 0) state = 'reserve';
        return { resourceId: resource.id, resourceName: resource.name, state };
      });

      types[type] = {
        total: capacity,
        free: bookable,
        occupied: Math.min(capacity, occupiedCount),
        resources: resourceStates
      };
    }

    slotDetails.push({ slot, past, types });
  }

  return {
    date,
    closed,
    availability,
    slotDetails,
    ownBookings: Object.values(ownByType).reduce((sum, count) => sum + count, 0),
    ownByType
  };
}

function findAvailableResources(userId, type, date, slot, houseId, limit = 1) {
  if (isPastSlot(date, slot)) {
    return [];
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
    return [];
  }

  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 1));
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
    LIMIT ?
  `).all(type, houseId, date, slot, weekdayForDate(date), slot, safeLimit);
}

function findAvailableResource(userId, type, date, slot, houseId) {
  return findAvailableResources(userId, type, date, slot, houseId, 1)[0] || null;
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

function availableDryingRoomsForWasher(userId, washDate, washSlot, houseId) {
  const allowedWindow = allowedDryingRoomSlots(washDate, washSlot);
  const dryingRooms = db.prepare(`
    SELECT id, name, type
    FROM resources
    WHERE active = 1 AND type = 'drying_room' AND house_id = ?
    ORDER BY name
  `).all(houseId);
  const occupied = db.prepare(`
    SELECT id
    FROM bookings
    WHERE resource_id = ? AND booking_date = ? AND slot = ?
    LIMIT 1
  `);
  const ownDryingBooking = db.prepare(`
    SELECT b.id
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'drying_room'
      AND r.house_id = ?
      AND b.booking_date = ?
      AND b.slot = ?
    LIMIT 1
  `);

  return dryingRooms.flatMap((resource) => {
    const availableWindow = [];
    for (const item of allowedWindow) {
      const unavailable = isPastSlot(item.date, item.slot)
        || isSunday(item.date)
        || occupied.get(resource.id, item.date, item.slot)
        || fixedBookingConflict(resource.id, item.date, item.slot, houseId)
        || ownDryingBooking.get(userId, houseId, item.date, item.slot);
      if (unavailable) {
        break;
      }
      availableWindow.push(item);
    }
    if (!availableWindow.length) {
      return [];
    }
    const bookingOptions = dryingWindowOptions(resource, availableWindow);
    const preferredLength = Math.min(2, availableWindow.length);
    return [{
      resourceId: resource.id,
      resourceName: resource.name,
      bookingOptions,
      selectedOption: bookingOptions.find((option) => option.bookings.length === preferredLength)?.id
        || bookingOptions[0].id
    }];
  });
}

function packageComponent(type, resource, bookings, options = {}) {
  return {
    id: String(options.id || type),
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
      components.push(packageComponent('tumbler', tumbler, tumblerWindow, {
        selectedByDefault: true,
        recommendationLabel: 'Ausgew\u00e4hlt'
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
      ? 'Die Waschmaschine ist bereits gebucht. Im gef\u00fchrten Ablauf kannst du passende Trocknungsoptionen erg\u00e4nzen.'
      : 'Die Waschmaschine ist bereits gebucht. Der gef\u00fchrte Ablauf zeigt dir, welche Trocknungsoptionen noch verf\u00fcgbar sind.',
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
  const washerResources = washer.resources?.length
    ? washer.resources
    : findAvailableResources(userId, 'washer', washer.date, washer.slot, houseId, 3);
  if (!washerResources.length) {
    return null;
  }
  const components = washerResources.map((resource, index) => packageComponent(
    'washer',
    resource,
    washWindow,
    {
      id: `washer-${resource.id}`,
      required: index === 0,
      recommendationLabel: index === 0 ? 'Dabei' : 'Bei Bedarf'
    }
  ));
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
    components.push(packageComponent('tumbler', tumbler, washWindow, {
      selectedByDefault: true,
      recommendationLabel: 'Ausgew\u00e4hlt'
    }));
  }
  if (components.every((component) => component.type === 'washer')) {
    return null;
  }
  const hasDryingRoom = components.some((component) => component.type === 'drying_room');
  const hasTumbler = components.some((component) => component.type === 'tumbler');

  return {
    kind: 'package',
    date: washer.date,
    slot: washer.slot,
    resourceType: 'washer',
    title: 'Dein Waschpaket',
    reason: hasDryingRoom && hasTumbler
      ? `${reason} W\u00e4hle den Termin und stelle danach Waschmaschinen, Trockenraum und Tumbler Schritt f\u00fcr Schritt zusammen.`
      : hasDryingRoom
        ? `${reason} W\u00e4hle den Termin und erg\u00e4nze danach bei Bedarf einen Trockenraum.`
        : `${reason} W\u00e4hle den Termin und entscheide danach, ob du einen Tumbler brauchst.`,
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
    if (compactPackage && candidate.score > compactPackageScore + 8) {
      break;
    }
    if (releaseWindowStatus(candidate.date, candidate.slot).reason !== 'not_started') {
      continue;
    }
    const resources = findAvailableResources(userId, 'washer', candidate.date, candidate.slot, houseId, 3);
    const resource = resources[0];
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
      resources,
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
    title: 'Im Moment keine freie Empfehlung',
    reason: 'In den n\u00e4chsten drei Wochen ist kein regelkonformer Waschslot frei.'
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  next();
}

function requireApartmentAccount(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  if (
    req.session.user.role === 'user'
    && !req.session.user.apartmentId
    && !allowLegacyHouseRegistration
  ) {
    return res.status(409).json({
      code: 'APARTMENT_SETUP_REQUIRED',
      error: 'Bitte ordne dieses bestehende Konto zuerst deiner Wohnung zu.'
    });
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

function ipRateLimit({ windowMs, maxAttempts, message }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = String(req.ip || req.socket.remoteAddress || 'unknown');
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { attempts: 0, resetAt: now + windowMs };
    }
    bucket.attempts += 1;
    buckets.set(key, bucket);
    if (bucket.attempts > maxAttempts) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    if (buckets.size > 1000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    next();
  };
}

const registrationRateLimit = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 30,
  message: 'Zu viele Einladungsversuche. Bitte versuche es spaeter erneut.'
});
const recoveryRateLimit = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 12,
  message: 'Zu viele Wiederherstellungsversuche. Bitte versuche es sp\u00e4ter erneut.'
});
const adminRecoveryRateLimit = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 30,
  message: 'Zu viele Admin-Wiederherstellungsversuche. Bitte versuche es spaeter erneut.'
});

function currentHouseId(req) {
  return Number(req.session.activeHouseId || req.session.user?.activeHouseId || req.session.user?.houseId || 0);
}

function isSuperadmin(req) {
  return Boolean(req.session.user?.isSuperadmin);
}

function sessionUserFromRow(user, activeHouse = null) {
  const house = activeHouse || db.prepare('SELECT id, name FROM houses WHERE id = ?').get(user.house_id);
  const apartment = user.apartment_id
    ? db.prepare('SELECT id, label, display_name FROM apartments WHERE id = ? AND active = 1').get(user.apartment_id)
    : null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email || '',
    notifyReleases: Boolean(user.notify_releases),
    emailVerified: Boolean(user.email_verified),
    secondaryEmail: user.secondary_email || '',
    secondaryEmailVerified: Boolean(user.secondary_email_verified),
    bookingMode: user.booking_mode === 'machine' ? 'machine' : 'time',
    apartmentId: apartment?.id || null,
    apartmentLabel: apartment?.label || '',
    displayName: apartment?.display_name || apartment?.label || user.username,
    apartmentSetupRequired: user.role === 'user' && !apartment,
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

function adminRecoveryStatus(houseId) {
  const houseAdminCount = db.prepare(`
    SELECT COUNT(*) AS count FROM users
    WHERE house_id = ? AND role = 'admin' AND active = 1
  `).get(houseId).count;
  const activeSuperadmins = db.prepare(`
    SELECT id, username, house_id
    FROM users
    WHERE role = 'admin' AND active = 1 AND is_superadmin = 1
    ORDER BY username
  `).all();
  const seedAdminName = String(process.env.SEED_ADMIN_NAME || 'admin');
  const seedRecoveryConfigured = Boolean(String(process.env.SEED_ADMIN_PASSWORD || '').trim());
  const seedPasswordResetEnabled = process.env.SEED_ADMIN_FORCE_PASSWORD_RESET === 'true';
  const warnings = [];

  if (houseAdminCount < 2) {
    warnings.push({
      level: 'warning',
      code: 'single_house_admin',
      message: 'Nur ein aktives Admin-Konto in diesem Haus. Lege eine Stellvertretung fest.'
    });
  }
  if (activeSuperadmins.length < 2) {
    warnings.push({
      level: 'warning',
      code: 'single_superadmin',
      message: 'Nur ein aktiver Superadmin. Fuer geplante Ausfaelle die Verantwortung rechtzeitig uebergeben.'
    });
  }
  if (!seedRecoveryConfigured) {
    warnings.push({
      level: 'critical',
      code: 'seed_recovery_missing',
      message: 'SEED_ADMIN_PASSWORD ist nicht gesetzt. Der technische Notfallzugang ist nicht vorbereitet.'
    });
  }
  if (seedPasswordResetEnabled) {
    warnings.push({
      level: 'critical',
      code: 'seed_force_reset_enabled',
      message: 'SEED_ADMIN_FORCE_PASSWORD_RESET ist aktiv. Nach dem Notfall sofort wieder entfernen.'
    });
  }

  return {
    houseAdminCount,
    superadminCount: activeSuperadmins.length,
    superadmins: activeSuperadmins,
    seedAdminName,
    seedRecoveryConfigured,
    seedPasswordResetEnabled,
    warnings
  };
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
  const email = String(value || '').trim();
  if (!email || email.length > 254 || /[\s\u0000-\u001f\u007f<>"\\]/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (
    !localPart
    || localPart.length > 64
    || localPart.startsWith('.')
    || localPart.endsWith('.')
    || localPart.includes('..')
    || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)
  ) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((label) => (
    label.length >= 1
    && label.length <= 63
    && /^[A-Za-z0-9-]+$/.test(label)
    && !label.startsWith('-')
    && !label.endsWith('-')
  ));
}

function verifiedEmailForUser(user) {
  if (user?.email_verified && isValidEmail(user.email)) return normalizeEmail(user.email);
  if (user?.secondary_email_verified && isValidEmail(user.secondary_email)) {
    return normalizeEmail(user.secondary_email);
  }
  return '';
}

function normalizeAccessCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

function generateReadableCode(prefix = '') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let index = 0; index < 10; index += 1) {
    value += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  const groups = `${value.slice(0, 5)}-${value.slice(5)}`;
  return prefix ? `${prefix}-${groups}` : groups;
}

function findEmailOwner(email, exceptUserId = 0) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return db.prepare(`
    SELECT id FROM users
    WHERE id != ? AND (lower(email) = ? OR lower(secondary_email) = ?)
    LIMIT 1
  `).get(Number(exceptUserId || 0), normalized, normalized);
}

function apartmentForCode(code) {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return null;
  return db.prepare(`
    SELECT a.id, a.house_id, a.label, a.display_name, a.claimed_by, h.name AS house_name
    FROM apartments a
    JOIN houses h ON h.id = a.house_id
    WHERE a.activation_code_hash = ? AND a.active = 1 AND h.active = 1
  `).get(tokenHash(normalized));
}

function apartmentInvitationForToken(token) {
  const normalized = String(token || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(normalized)) return null;
  return db.prepare(`
    SELECT ai.id AS invitation_id, ai.apartment_id, ai.email, ai.expires_at, ai.email_sent_at,
           a.house_id, a.label, a.display_name, a.claimed_by,
           h.name AS house_name
    FROM apartment_invitations ai
    JOIN apartments a ON a.id = ai.apartment_id
    JOIN houses h ON h.id = a.house_id
    WHERE ai.token_hash = ?
      AND ai.accepted_at IS NULL
      AND ai.revoked_at IS NULL
      AND CAST(ai.expires_at AS INTEGER) > ?
      AND a.active = 1
      AND a.claimed_by IS NULL
      AND h.active = 1
  `).get(tokenHash(normalized), Date.now());
}

function pendingInvitationForEmail(email, exceptApartmentId = 0) {
  return db.prepare(`
    SELECT ai.id, ai.apartment_id
    FROM apartment_invitations ai
    JOIN apartments a ON a.id = ai.apartment_id
    WHERE lower(ai.email) = lower(?)
      AND ai.apartment_id != ?
      AND ai.accepted_at IS NULL
      AND ai.revoked_at IS NULL
      AND CAST(ai.expires_at AS INTEGER) > ?
      AND a.active = 1
      AND a.claimed_by IS NULL
    LIMIT 1
  `).get(email, Number(exceptApartmentId || 0), Date.now());
}

async function issueApartmentInvitation(req, apartment, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const config = smtpConfig();
  db.transaction(() => {
    db.prepare(`
      UPDATE apartment_invitations
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE apartment_id = ? AND accepted_at IS NULL AND revoked_at IS NULL
    `).run(apartment.id);
    db.prepare(`
      INSERT INTO apartment_invitations
        (apartment_id, email, token_hash, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(apartment.id, email, tokenHash(token), String(expiresAt), req.session.user.id);
    db.prepare('UPDATE apartments SET activation_code_hash = NULL WHERE id = ?').run(apartment.id);
  })();

  const link = `${publicAppUrl(req)}/login.html?invite=${encodeURIComponent(token)}`;
  let emailSent = false;
  let deliveryError = '';
  if (config.host && config.from) {
    try {
      await sendMail({
        config,
        to: email,
        subject: `WaschZeit: Einladung fuer ${apartment.label}`,
        text: [
          `Hallo ${apartment.display_name}`,
          '',
          `du wurdest fuer die Wohnung ${apartment.label} in ${apartment.house_name} zu WaschZeit eingeladen.`,
          'Oeffne den folgenden Link und lege dein persoenliches Passwort fest:',
          '',
          link,
          '',
          'Der Link ist sieben Tage gueltig und kann nur einmal verwendet werden.',
          'Weitere Handys derselben Wohnung werden spaeter mit einem kurz gueltigen Geraetecode verbunden.'
        ].join('\n')
      });
      emailSent = true;
      db.prepare(`
        UPDATE apartment_invitations SET email_sent_at = CURRENT_TIMESTAMP
        WHERE token_hash = ?
      `).run(tokenHash(token));
    } catch (error) {
      deliveryError = error.message;
      console.error(`Wohnungseinladung konnte nicht gesendet werden: ${error.message}`);
    }
  }
  return { link, expiresAt, emailSent, deliveryError };
}

function apartmentAccountLabel(userId, fallback = 'Jemand') {
  const row = db.prepare(`
    SELECT COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS label
    FROM users u LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE u.id = ?
  `).get(userId);
  return row?.label || fallback;
}

function apartmentAccountUsername(apartmentId) {
  const base = `wohnung-${Number(apartmentId)}`;
  if (!db.prepare('SELECT id FROM users WHERE username = ?').get(base)) return base;
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

function isValidUsername(value) {
  return /^[\p{L}\p{N}][\p{L}\p{N} ._'\u2019-]{2,39}$/u.test(String(value || ''));
}

function isValidPassword(value) {
  const length = String(value || '').length;
  return length >= 12 && length <= 128;
}

function isValidPlainText(value, minLength = 2, maxLength = 80) {
  const text = String(value || '').trim();
  return text.length >= minLength
    && text.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(text);
}

function isValidMaintenanceText(value, minLength = 3, maxLength = 1000) {
  const text = String(value || '').trim();
  return text.length >= minLength
    && text.length <= maxLength
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text);
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
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

function configuredVapidKeys() {
  const envPublicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPrivateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  if (envPublicKey && envPrivateKey) {
    return { publicKey: envPublicKey, privateKey: envPrivateKey, source: 'env' };
  }

  let publicKey = getSetting('vapid_public_key');
  let privateKey = getSetting('vapid_private_key');
  if (!publicKey || !privateKey) {
    const generated = webPush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    setSetting('vapid_public_key', publicKey);
    setSetting('vapid_private_key', privateKey);
  }
  return { publicKey, privateKey, source: 'database' };
}

function pushStatus() {
  try {
    const keys = configuredVapidKeys();
    const activeSubscriptions = db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions WHERE active = 1').get().count;
    return {
      configured: Boolean(keys.publicKey && keys.privateKey),
      label: 'bereit',
      publicKey: keys.publicKey,
      keySource: keys.source,
      activeSubscriptions
    };
  } catch (error) {
    return {
      configured: false,
      label: `nicht bereit: ${error.message}`,
      publicKey: '',
      keySource: '',
      activeSubscriptions: 0
    };
  }
}

function applyPushConfig(req) {
  const status = pushStatus();
  if (!status.configured) {
    return status;
  }
  const subject = String(process.env.VAPID_SUBJECT || '').trim()
    || `mailto:${extractEmailAddress(smtpConfig().from) || 'admin@example.invalid'}`
    || publicAppUrl(req);
  const keys = configuredVapidKeys();
  webPush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  return status;
}

function pushPayload({ title, body, url = '/index.html', tag = 'waschzeit-freigabe' }) {
  return JSON.stringify({
    title,
    body,
    url,
    tag,
    icon: '/assets/app-icon.svg',
    badge: '/assets/app-icon.svg'
  });
}

function subscriptionForRow(row) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    }
  };
}

function releaseNoticeUrl(booking) {
  const params = new URLSearchParams();
  if (booking.notice_id) {
    params.set('notice', String(booking.notice_id));
  }
  params.set('date', booking.booking_date);
  return `/index.html?${params.toString()}`;
}

async function notifyPushSubscribers(req, booking, message, title = `WaschZeit: ${booking.resource_name} frei`) {
  const status = applyPushConfig(req);
  if (!status.configured) {
    return { configured: false, sent: 0, failed: 0 };
  }

  const recipients = db.prepare(`
    SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.user_id
    LEFT JOIN notification_preferences np ON np.user_id = u.id
    WHERE ps.active = 1
      AND u.active = 1
      AND u.house_id = ?
      AND ps.house_id = ?
      AND u.notify_releases = 1
      AND u.id != ?
      AND (np.resource_type IS NULL OR np.resource_type = 'all' OR np.resource_type = ?)
      AND (np.weekday IS NULL OR np.weekday = ?)
      AND (np.slot IS NULL OR np.slot = ?)
    ORDER BY ps.updated_at DESC
  `).all(
    booking.house_id,
    booking.house_id,
    booking.user_id,
    booking.resource_type || 'all',
    weekdayForDate(booking.booking_date),
    booking.slot
  );

  if (!recipients.length) {
    return { configured: true, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const payload = pushPayload({
    title,
    body: message,
    url: releaseNoticeUrl(booking)
  });
  const deactivate = db.prepare('UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  for (const recipient of recipients) {
    try {
      await webPush.sendNotification(subscriptionForRow(recipient), payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      if ([404, 410].includes(error.statusCode)) {
        deactivate.run(recipient.id);
      } else {
        console.error(`Push-Hinweis fehlgeschlagen: ${error.message}`);
      }
    }
  }

  return { configured: true, sent, failed };
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
  writeAuditForHouse(req, currentHouseId(req) || null, action, targetType, targetId, details);
}

function writeAuditForHouse(req, houseId, action, targetType, targetId = '', details = {}) {
  try {
    db.prepare(`
      INSERT INTO audit_log (house_id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      houseId || null,
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

async function sendEmailVerification(req, user, emailKind = 'primary') {
  const config = smtpConfig();
  const email = emailKind === 'secondary' ? user.secondary_email : user.email;
  if (!config.host || !config.from || !isValidEmail(email)) {
    return { configured: false, sent: false };
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ? AND email_kind = ?').run(user.id, emailKind);
  db.prepare(`
    INSERT INTO email_verification_tokens (user_id, token_hash, email_kind, email_value, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, tokenHash(token), emailKind, email, String(Date.now() + 24 * 60 * 60 * 1000));
  const link = `${publicAppUrl(req)}/api/email-verification/confirm?token=${encodeURIComponent(token)}`;
  await sendMail({
    config,
    to: email,
    subject: 'WaschZeit: E-Mail-Adresse best\u00e4tigen',
    text: [
      `Hallo ${apartmentAccountLabel(user.id, user.username)}`,
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

async function sendPasswordReset(req, user, deliveryEmail = user.email) {
  const config = smtpConfig();
  const email = normalizeEmail(deliveryEmail);
  const verified = email === normalizeEmail(user.email)
    ? Boolean(user.email_verified)
    : email === normalizeEmail(user.secondary_email) && Boolean(user.secondary_email_verified);
  if (!config.host || !config.from || !isValidEmail(email) || !verified) {
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
    to: email,
    subject: 'WaschZeit: Passwort neu setzen',
    text: [
      `Hallo ${apartmentAccountLabel(user.id, user.username)}`,
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
  subject = String(subject).replace(/^Waschplan:/, 'WaschZeit:');
  if (!config.host || !config.from) {
    return { configured: false, sent: 0 };
  }

  const recipients = db.prepare(`
    SELECT u.id, u.username, u.email, u.secondary_email,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS display_name,
           u.email_verified, u.secondary_email_verified
    FROM users u
    LEFT JOIN apartments a ON a.id = u.apartment_id
    LEFT JOIN notification_preferences np ON np.user_id = u.id
    WHERE u.active = 1
      AND u.house_id = ?
      AND u.notify_releases = 1
      AND (u.email_verified = 1 OR u.secondary_email_verified = 1)
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

  const deliveries = recipients.flatMap((recipient) => {
    const emails = [];
    if (recipient.email_verified && isValidEmail(recipient.email)) emails.push(recipient.email);
    if (
      recipient.secondary_email_verified
      && isValidEmail(recipient.secondary_email)
      && normalizeEmail(recipient.secondary_email) !== normalizeEmail(recipient.email)
    ) emails.push(recipient.secondary_email);
    return emails.map((email) => ({ ...recipient, deliveryEmail: email }));
  });
  const appUrl = `${publicAppUrl(req)}${releaseNoticeUrl(booking)}`;
  let sent = 0;
  for (let start = 0; start < deliveries.length; start += 5) {
    const batch = deliveries.slice(start, start + 5);
    const results = await Promise.allSettled(batch.map((recipient) => sendMail({
        config,
        to: recipient.deliveryEmail,
        subject,
        text: [
          `Hallo ${recipient.display_name}`,
          '',
          message,
          '',
          `Du kannst den Slot jetzt im Waschplan ansehen und buchen: ${appUrl}`,
          '',
          'Viele Gr\u00fcsse',
          `WaschZeit ${booking.house_name || ''}`.trim()
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

async function notifyReleaseChannels(req, booking, message, subject = `WaschZeit: ${booking.resource_name} frei`) {
  const [emailNotifications, pushNotifications] = await Promise.all([
    notifyReleaseSubscribers(req, booking, message, subject),
    notifyPushSubscribers(req, booking, message, subject.replace(/^Waschplan:/, 'WaschZeit:'))
  ]);
  return { emailNotifications, pushNotifications };
}

function extractEmailAddress(value) {
  const safeValue = sanitizeMailHeader(value);
  const match = safeValue.match(/<([^>]+)>/);
  return (match ? match[1] : safeValue).trim();
}

function sanitizeMailHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function mailHeaders({ config, to, subject, text }) {
  const safeFrom = sanitizeMailHeader(config.from);
  const from = safeFrom.includes('<') ? safeFrom : `WaschZeit <${safeFrom}>`;
  return [
    `From: ${from}`,
    `To: ${sanitizeMailHeader(to)}`,
    `Subject: ${sanitizeMailHeader(subject)}`,
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
  const retainedBackups = new Set(backups.slice(0, 3));
  const retainedDays = new Set();
  for (const backupName of backups) {
    const day = backupName.slice('washplan-'.length, 'washplan-'.length + 10);
    if (retainedDays.size >= 14 || retainedDays.has(day)) continue;
    retainedDays.add(day);
    retainedBackups.add(backupName);
  }
  for (const oldName of backups) {
    if (!retainedBackups.has(oldName)) fs.rmSync(path.join(directory, oldName), { force: true });
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

function runMaintenanceSelfCheck() {
  const quickCheck = db.pragma('quick_check', { simple: true });
  if (String(quickCheck).toLowerCase() !== 'ok') {
    throw new Error(`SQLite-Pruefung fehlgeschlagen: ${quickCheck}`);
  }

  const probeTarget = db.prepare(`
    SELECT u.id AS user_id, r.id AS resource_id
    FROM users u
    JOIN resources r ON r.house_id = u.house_id
    WHERE u.active = 1 AND r.active = 1
    ORDER BY u.is_superadmin DESC, u.id, r.id
    LIMIT 1
  `).get();
  if (!probeTarget) {
    throw new Error('Buchungspruefung nicht moeglich: aktives Konto oder Geraet fehlt.');
  }

  db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO bookings (user_id, resource_id, booking_date, slot, group_id)
      VALUES (?, ?, '9999-12-31', '__maintenance_probe__', ?)
    `).run(probeTarget.user_id, probeTarget.resource_id, `maintenance-${crypto.randomUUID()}`);
    const removed = db.prepare('DELETE FROM bookings WHERE id = ?').run(result.lastInsertRowid);
    if (removed.changes !== 1) {
      throw new Error('Temporäre Testbuchung konnte nicht sauber entfernt werden.');
    }
  })();

  return {
    ok: true,
    database: 'ok',
    bookingWrite: 'ok',
    checkedAt: new Date().toISOString()
  };
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
    db.prepare('DELETE FROM account_recovery_codes WHERE used_at IS NOT NULL OR CAST(expires_at AS INTEGER) <= ?').run(Date.now());
    db.prepare('DELETE FROM device_pairing_codes WHERE used_at IS NOT NULL OR CAST(expires_at AS INTEGER) <= ?').run(Date.now());
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
    revision: String(process.env.RENDER_GIT_COMMIT || '').trim() || null,
    version: appVersion,
    release: appRelease,
    maintenanceMode: maintenanceStatus().active
  });
});

app.get('/api/version', (req, res) => {
  res.json(publicReleaseStatus());
});

app.post('/api/login', authRateLimit, async (req, res, next) => {
  const password = req.body?.password;
  const loginName = normalizeEmail(req.body?.email || req.body?.username);
  const user = db.prepare(`
    SELECT * FROM users
    WHERE lower(email) = ?
       OR lower(secondary_email) = ?
       OR (role = 'admin' AND lower(username) = ?)
       OR (role = 'user' AND (email IS NULL OR trim(email) = '') AND lower(username) = ?)
  `).get(loginName, loginName, loginName, loginName);

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

  try {
    const sessionUser = sessionUserFromRow(user);
    clearAuthRateLimit(req);
    await regenerateSession(req);
    req.session.user = sessionUser;
    req.session.activeHouseId = user.house_id;
    req.session.lastActivityAt = Date.now();
    res.json({ user: req.session.user });
  } catch (error) {
    next(error);
  }
});

app.post('/api/device-login', authRateLimit, async (req, res, next) => {
  const code = normalizeAccessCode(req.body?.deviceCode);
  const record = code ? db.prepare(`
    SELECT dpc.id AS pairing_id, dpc.user_id, u.*
    FROM device_pairing_codes dpc
    JOIN users u ON u.id = dpc.user_id
    WHERE dpc.code_hash = ?
      AND dpc.used_at IS NULL
      AND CAST(dpc.expires_at AS INTEGER) > ?
      AND u.active = 1
  `).get(tokenHash(code), Date.now()) : null;
  if (!record) {
    return res.status(400).json({ error: 'Der Ger\u00e4tecode ist ung\u00fcltig oder abgelaufen.' });
  }
  try {
    db.prepare('UPDATE device_pairing_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.pairing_id);
    await regenerateSession(req);
    req.session.user = sessionUserFromRow(record);
    req.session.activeHouseId = record.house_id;
    req.session.lastActivityAt = Date.now();
    clearAuthRateLimit(req);
    res.json({ user: req.session.user, message: `${req.session.user.apartmentLabel} wurde auf diesem Ger\u00e4t verbunden.` });
  } catch (error) {
    next(error);
  }
});

app.get('/api/invitations/:token', registrationRateLimit, (req, res) => {
  const invitation = apartmentInvitationForToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Diese Einladung ist ungueltig, abgelaufen oder bereits verwendet.' });
  }
  res.json({
    invitation: {
      email: invitation.email,
      apartmentLabel: invitation.label,
      displayName: invitation.display_name,
      houseName: invitation.house_name,
      expiresAt: new Date(Number(invitation.expires_at)).toISOString()
    }
  });
});

app.post('/api/invitations/accept', registrationRateLimit, authRateLimit, async (req, res, next) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const invitation = apartmentInvitationForToken(token);
  if (!invitation) {
    return res.status(400).json({ error: 'Diese Einladung ist ungueltig, abgelaufen oder bereits verwendet.' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Das Passwort muss 12 bis 128 Zeichen haben.' });
  }
  if (findEmailOwner(invitation.email)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse gehoert bereits zu einem Konto.' });
  }

  try {
    const userId = db.transaction(() => {
      const current = apartmentInvitationForToken(token);
      if (!current) {
        const conflict = new Error('INVITATION_ALREADY_USED');
        conflict.code = 'INVITATION_ALREADY_USED';
        throw conflict;
      }
      const inserted = db.prepare(`
        INSERT INTO users
          (username, email, password_hash, role, house_id, active, notify_releases,
           email_verified, apartment_id)
        VALUES (?, ?, ?, 'user', ?, 1, ?, ?, ?)
      `).run(
        apartmentAccountUsername(current.apartment_id),
        normalizeEmail(current.email),
        bcrypt.hashSync(password, 10),
        current.house_id,
        notifyReleases,
        current.email_sent_at ? 1 : 0,
        current.apartment_id
      );
      db.prepare(`
        UPDATE apartments
        SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, activation_code_hash = NULL
        WHERE id = ? AND claimed_by IS NULL
      `).run(inserted.lastInsertRowid, current.apartment_id);
      db.prepare(`
        UPDATE apartment_invitations SET accepted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL
      `).run(current.invitation_id);
      db.prepare(`
        UPDATE apartment_invitations SET revoked_at = CURRENT_TIMESTAMP
        WHERE apartment_id = ? AND id != ? AND accepted_at IS NULL AND revoked_at IS NULL
      `).run(current.apartment_id, current.invitation_id);
      return inserted.lastInsertRowid;
    })();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const house = db.prepare('SELECT id, name FROM houses WHERE id = ?').get(user.house_id);
    await regenerateSession(req);
    req.session.user = sessionUserFromRow(user, house);
    req.session.activeHouseId = user.house_id;
    req.session.lastActivityAt = Date.now();
    clearAuthRateLimit(req);
    writeAuditForHouse(req, user.house_id, 'apartment.invitation_accepted', 'apartment', user.apartment_id, {
      email: user.email
    });
    res.status(201).json({
      user: req.session.user,
      message: invitation.email_sent_at
        ? `${invitation.label} ist aktiviert. Willkommen bei WaschZeit.`
        : `${invitation.label} ist aktiviert. Die E-Mail wird bestaetigt, sobald der Versand eingerichtet ist.`
    });
  } catch (error) {
    if (error.code === 'INVITATION_ALREADY_USED' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese Einladung wurde gerade bereits verwendet.' });
    }
    next(error);
  }
});

app.post('/api/register', registrationRateLimit, authRateLimit, async (req, res, next) => {
  if (!allowLegacyHouseRegistration) {
    return res.status(410).json({ error: 'Neue Wohnungskonten werden nur noch ueber den Einladungslink der Verwaltung aktiviert.' });
  }
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const apartmentCode = String(req.body?.apartmentCode || '').trim();
  const legacyHouseCode = String(req.body?.houseCode || (allowLegacyHouseRegistration ? req.body?.apartmentCode : '') || '').trim();
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const apartment = apartmentForCode(apartmentCode);
  const legacyHouse = allowLegacyHouseRegistration && legacyHouseCode
    ? db.prepare('SELECT id, name FROM houses WHERE lower(code) = lower(?) AND active = 1').get(legacyHouseCode)
    : null;
  const house = apartment
    ? { id: apartment.house_id, name: apartment.house_name }
    : legacyHouse;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Das Passwort muss 12 bis 128 Zeichen haben.' });
  }
  if (!house || (!apartment && !legacyHouse)) {
    return res.status(403).json({ error: 'Der Wohnungscode ist nicht korrekt oder wurde bereits verwendet.' });
  }
  if (apartment?.claimed_by) {
    return res.status(409).json({ error: 'Diese Wohnung ist bereits aktiviert. Nutze den Ger\u00e4tecode eines angemeldeten Handys.' });
  }
  if (findEmailOwner(email)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
  }

  const legacyUsername = String(req.body?.username || '').trim();
  if (!apartment && !isValidUsername(legacyUsername)) {
    return res.status(400).json({ error: 'Fuer diese technische Registrierung fehlt ein gueltiger Kontoname.' });
  }
  const username = apartment ? apartmentAccountUsername(apartment.id) : legacyUsername;

  try {
    const emailVerified = 0;
    const result = db.transaction(() => {
      if (apartment) {
        const available = db.prepare(`
          SELECT id FROM apartments
          WHERE id = ? AND claimed_by IS NULL AND activation_code_hash = ? AND active = 1
        `).get(apartment.id, tokenHash(normalizeAccessCode(apartmentCode)));
        if (!available) {
          const conflict = new Error('APARTMENT_ALREADY_CLAIMED');
          conflict.code = 'APARTMENT_ALREADY_CLAIMED';
          throw conflict;
        }
      }
      const inserted = db.prepare(`
        INSERT INTO users
          (username, email, password_hash, role, house_id, active, notify_releases, email_verified, apartment_id)
        VALUES (?, ?, ?, 'user', ?, 1, ?, ?, ?)
      `).run(
        username,
        email,
        bcrypt.hashSync(password, 10),
        house.id,
        notifyReleases,
        emailVerified,
        apartment?.id || null
      );
      if (apartment) {
        db.prepare(`
          UPDATE apartments
          SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, activation_code_hash = NULL
          WHERE id = ?
        `).run(inserted.lastInsertRowid, apartment.id);
      }
      return inserted;
    })();

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    await regenerateSession(req);
    req.session.user = sessionUserFromRow(createdUser, house);
    req.session.activeHouseId = house.id;
    req.session.lastActivityAt = Date.now();
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
        : verification.configured
          ? 'Konto erstellt. Die Best\u00e4tigungsmail konnte noch nicht gesendet werden.'
          : 'Konto erstellt. E-Mail-Hinweise werden nach Einrichtung des Versands freigeschaltet.'
    });
  } catch (error) {
    if (error.code === 'APARTMENT_ALREADY_CLAIMED') {
      return res.status(409).json({ error: 'Diese Wohnung wurde gerade bereits aktiviert.' });
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: apartment ? 'Diese E-Mail-Adresse ist bereits vergeben' : 'Kontoname oder E-Mail ist bereits vergeben'
      });
    }
    throw error;
  }
});

app.get('/api/email-verification/confirm', (req, res) => {
  const token = String(req.query.token || '');
  const record = db.prepare(`
    SELECT evt.id, evt.user_id, evt.email_kind, evt.email_value,
           u.email, u.secondary_email
    FROM email_verification_tokens evt
    JOIN users u ON u.id = evt.user_id
    WHERE evt.token_hash = ? AND CAST(evt.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(token), Date.now());
  if (!record) {
    return res.redirect('/login.html?verification=invalid');
  }
  const currentEmail = record.email_kind === 'secondary' ? record.secondary_email : record.email;
  if (record.email_value && normalizeEmail(currentEmail) !== normalizeEmail(record.email_value)) {
    db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').run(record.id);
    return res.redirect('/login.html?verification=invalid');
  }
  db.transaction(() => {
    const column = record.email_kind === 'secondary' ? 'secondary_email_verified' : 'email_verified';
    db.prepare(`UPDATE users SET ${column} = 1 WHERE id = ?`).run(record.user_id);
    db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').run(record.id);
  })();
  if (Number(req.session.user?.id) === Number(record.user_id)) {
    if (record.email_kind === 'secondary') req.session.user.secondaryEmailVerified = true;
    else req.session.user.emailVerified = true;
  }
  res.redirect(req.session.user ? '/index.html?emailVerified=1' : '/login.html?verification=ok');
});

app.post('/api/email-verification/resend', requireAuth, recoveryRateLimit, async (req, res) => {
  const emailKind = req.body?.emailKind === 'secondary' ? 'secondary' : 'primary';
  const user = db.prepare(`
    SELECT id, username, email, email_verified, secondary_email, secondary_email_verified
    FROM users WHERE id = ?
  `)
    .get(req.session.user.id);
  const alreadyVerified = emailKind === 'secondary' ? user?.secondary_email_verified : user?.email_verified;
  if (!user || alreadyVerified) {
    return res.json({ ok: true, message: 'Die E-Mail-Adresse ist bereits best\u00e4tigt.' });
  }
  try {
    const result = await sendEmailVerification(req, user, emailKind);
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
    ? db.prepare(`
        SELECT id, username, email, email_verified, secondary_email, secondary_email_verified
        FROM users
        WHERE (lower(email) = ? OR lower(secondary_email) = ?) AND active = 1
      `).get(email, email)
    : null;
  if (user) {
    await sendPasswordReset(req, user, email).catch((error) => {
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
    return res.status(400).json({ error: 'Das neue Passwort muss 12 bis 128 Zeichen haben.' });
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

app.post('/api/account-recovery/confirm', recoveryRateLimit, async (req, res, next) => {
  const code = normalizeAccessCode(req.body?.code);
  const email = normalizeEmail(req.body?.email);
  const newPassword = String(req.body?.newPassword || '');
  if (!code || !isValidEmail(email) || !isValidPassword(newPassword)) {
    return res.status(400).json({
      error: 'Bitte einen gueltigen Wiederherstellungscode, eine E-Mail-Adresse und ein Passwort mit 12 bis 128 Zeichen eingeben.'
    });
  }

  const record = db.prepare(`
    SELECT arc.id AS recovery_id, arc.user_id, u.*
    FROM account_recovery_codes arc
    JOIN users u ON u.id = arc.user_id
    WHERE arc.code_hash = ? AND arc.used_at IS NULL
      AND CAST(arc.expires_at AS INTEGER) > ?
      AND u.active = 1 AND u.role = 'user' AND u.merged_into_user_id IS NULL
  `).get(tokenHash(code), Date.now());
  if (!record) {
    return res.status(400).json({ error: 'Der Wiederherstellungscode ist ungueltig, abgelaufen oder bereits verwendet.' });
  }
  if (verifiedEmailForUser(record)) {
    return res.status(409).json({ error: 'Dieses Konto besitzt inzwischen eine bestaetigte E-Mail-Adresse. Bitte den normalen Passwort-Reset verwenden.' });
  }
  if (findEmailOwner(email, record.user_id)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse gehoert bereits zu einem anderen Konto.' });
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET email = ?, email_verified = 0,
            secondary_email = NULL, secondary_email_verified = 0,
            password_hash = ?
        WHERE id = ?
      `).run(email, bcrypt.hashSync(newPassword, 10), record.user_id);
      db.prepare('UPDATE account_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(record.recovery_id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(record.user_id);
      db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(record.user_id);
    })();
    destroyUserSessions(record.user_id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(record.user_id);
    const verification = await sendEmailVerification(req, updatedUser).catch((error) => {
      console.error(`Bestaetigungsmail nach Kontowiederherstellung fehlgeschlagen: ${error.message}`);
      return { configured: true, sent: false };
    });
    writeAuditForHouse(req, record.house_id, 'user.recovery_completed', 'user', record.user_id, {
      verificationSent: Boolean(verification.sent)
    });
    res.json({
      ok: true,
      message: verification.sent
        ? 'Konto wiederhergestellt. Bitte bestaetige jetzt deine E-Mail-Adresse und melde dich danach an.'
        : 'Konto wiederhergestellt. Du kannst dich mit der neuen E-Mail-Adresse und dem neuen Passwort anmelden; die E-Mail-Bestaetigung muss noch versendet werden.'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben.' });
    }
    next(error);
  }
});

function finishLogout(req, res, next, redirectToLogin = false) {
  const sendResponse = () => {
    res.setHeader('Cache-Control', 'no-store');
    clearSessionCookie(res);
    if (redirectToLogin) {
      return res.redirect(303, '/login.html?loggedOut=1');
    }
    return res.json({ ok: true });
  };

  if (!req.session) {
    return sendResponse();
  }
  req.session.destroy((error) => {
    if (error) {
      // Das Cookie wird auch bei einem kurzzeitigen Store-Fehler entfernt.
      console.error(`Sitzung konnte beim Abmelden nicht aus dem Speicher entfernt werden: ${error.message}`);
    }
    return sendResponse();
  });
}

app.post('/api/logout', (req, res, next) => finishLogout(req, res, next));
app.post('/logout', (req, res, next) => finishLogout(req, res, next, true));

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.json({
      user: null,
      houses: [],
      session: { idleTimeoutMs: sessionIdleTimeoutMs, warningMs: sessionWarningMs }
    });
  }
  const currentUserRow = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(req.session.user.id);
  if (!currentUserRow) {
    return req.session.destroy(() => res.status(401).json({ error: 'Dieses Konto ist nicht mehr aktiv.' }));
  }
  const activeHouse = db.prepare('SELECT id, name FROM houses WHERE id = ?').get(currentHouseId(req) || currentUserRow.house_id);
  req.session.user = sessionUserFromRow(currentUserRow, activeHouse);
  const houses = isSuperadmin(req)
    ? db.prepare('SELECT id, name, active FROM houses WHERE active = 1 ORDER BY name').all()
    : [];
  const preferences = db.prepare(`
    SELECT resource_type AS resourceType, weekday, slot
    FROM notification_preferences WHERE user_id = ?
  `).get(req.session.user.id) || { resourceType: 'all', weekday: null, slot: null };
  const activePushSubscriptions = db.prepare(`
    SELECT COUNT(*) AS count FROM push_subscriptions
    WHERE user_id = ? AND active = 1
  `).get(req.session.user.id).count;
  res.json({
    user: req.session.user,
    houses,
    notificationPreferences: preferences,
    push: {
      available: pushStatus().configured,
      activeSubscriptions: activePushSubscriptions
    },
    session: {
      idleTimeoutMs: sessionIdleTimeoutMs,
      warningMs: sessionWarningMs,
      lastActivityAt: req.session.lastActivityAt
    }
  });
});

app.post('/api/me/apartment/claim', requireAuth, (req, res) => {
  if (!allowLegacyHouseRegistration) {
    return res.status(410).json({ error: 'Wohnungscodes wurden durch sichere Einladungslinks ersetzt.' });
  }
  if (req.session.user.role !== 'user') {
    return res.status(400).json({ error: 'Admin-Konten werden keiner Wohnung zugeordnet.' });
  }
  if (req.session.user.apartmentId) {
    return res.status(409).json({ error: 'Dieses Konto ist bereits einer Wohnung zugeordnet.' });
  }
  const apartment = apartmentForCode(req.body?.apartmentCode);
  if (!apartment || apartment.house_id !== req.session.user.houseId || apartment.claimed_by) {
    return res.status(403).json({ error: 'Der Wohnungscode ist nicht korrekt, passt nicht zum Haus oder wurde bereits verwendet.' });
  }
  const changed = db.transaction(() => {
    const result = db.prepare(`
      UPDATE apartments
      SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, activation_code_hash = NULL
      WHERE id = ? AND claimed_by IS NULL AND activation_code_hash = ?
    `).run(
      req.session.user.id,
      apartment.id,
      tokenHash(normalizeAccessCode(req.body?.apartmentCode))
    );
    if (result.changes) {
      db.prepare('UPDATE users SET apartment_id = ? WHERE id = ?').run(apartment.id, req.session.user.id);
    }
    return result;
  })();
  if (!changed.changes) {
    return res.status(409).json({ error: 'Diese Wohnung wurde gerade bereits aktiviert.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  req.session.user = sessionUserFromRow(user);
  writeAudit(req, 'apartment.claim', 'apartment', apartment.id, { label: apartment.label });
  res.json({ user: req.session.user, message: `${apartment.label} ist jetzt mit diesem Konto verbunden.` });
});

app.post('/api/me/apartment-name-request', requireAuth, requireApartmentAccount, (req, res) => {
  if (req.session.user.role !== 'user' || !req.session.user.apartmentId) {
    return res.status(400).json({ error: 'Nur ein aktives Wohnungskonto kann eine Namenskorrektur melden.' });
  }
  const proposedName = String(req.body?.displayName || '').trim();
  const note = String(req.body?.note || '').trim();
  if (!isValidPlainText(proposedName, 2, 80)) {
    return res.status(400).json({ error: 'Bitte den gewuenschten Klingelschildnamen mit 2 bis 80 Zeichen eintragen.' });
  }
  if (note && !isValidPlainText(note, 2, 300)) {
    return res.status(400).json({ error: 'Der Hinweis darf hoechstens 300 Zeichen lang sein.' });
  }
  if (proposedName.toLocaleLowerCase('de-CH') === String(req.session.user.displayName || '').toLocaleLowerCase('de-CH')) {
    return res.status(400).json({ error: 'Dieser Klingelschildname ist bereits eingetragen.' });
  }

  const result = db.transaction(() => {
    db.prepare(`
      UPDATE apartment_name_requests
      SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP
      WHERE apartment_id = ? AND status = 'pending'
    `).run(req.session.user.apartmentId);
    return db.prepare(`
      INSERT INTO apartment_name_requests (apartment_id, user_id, proposed_name, note)
      VALUES (?, ?, ?, NULLIF(?, ''))
    `).run(req.session.user.apartmentId, req.session.user.id, proposedName, note);
  })();
  writeAudit(req, 'apartment.name_request', 'apartment', req.session.user.apartmentId, {
    requestId: result.lastInsertRowid,
    proposedName
  });
  res.status(201).json({
    ok: true,
    message: 'Dein Korrekturwunsch wurde an die Hausverwaltung weitergegeben.'
  });
});

app.post('/api/me/device-code', requireAuth, requireApartmentAccount, (req, res) => {
  if (!req.session.user.apartmentId) {
    return res.status(409).json({ error: 'Zuerst muss eine Wohnung mit dem Konto verbunden sein.' });
  }
  const code = generateReadableCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.transaction(() => {
    db.prepare('DELETE FROM device_pairing_codes WHERE user_id = ? OR CAST(expires_at AS INTEGER) <= ?')
      .run(req.session.user.id, Date.now());
    db.prepare(`
      INSERT INTO device_pairing_codes (user_id, code_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(req.session.user.id, tokenHash(normalizeAccessCode(code)), String(expiresAt));
  })();
  res.status(201).json({
    code,
    expiresAt,
    apartmentLabel: req.session.user.apartmentLabel,
    message: 'Der Ger\u00e4tecode ist zehn Minuten g\u00fcltig und kann einmal verwendet werden.'
  });
});

app.post('/api/me/apartment/join', requireAuth, async (req, res, next) => {
  if (req.session.user.role !== 'user' || req.session.user.apartmentId) {
    return res.status(409).json({ error: 'Dieses Konto ist bereits einer Wohnung zugeordnet.' });
  }
  const code = normalizeAccessCode(req.body?.deviceCode);
  const pairing = code ? db.prepare(`
    SELECT dpc.id, dpc.user_id, u.house_id, u.apartment_id, u.active
    FROM device_pairing_codes dpc
    JOIN users u ON u.id = dpc.user_id
    WHERE dpc.code_hash = ? AND dpc.used_at IS NULL
      AND CAST(dpc.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(code), Date.now()) : null;
  if (!pairing || !pairing.apartment_id || pairing.house_id !== req.session.user.houseId) {
    return res.status(400).json({ error: 'Der Ger\u00e4tecode ist ung\u00fcltig, abgelaufen oder geh\u00f6rt zu einem anderen Haus.' });
  }
  if (Number(pairing.user_id) === Number(req.session.user.id)) {
    return res.status(400).json({ error: 'Dieser Ger\u00e4tecode geh\u00f6rt bereits zu deinem Konto.' });
  }

  try {
    const source = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(pairing.user_id);
    const targetEmails = new Set([target.email, target.secondary_email].map(normalizeEmail).filter(Boolean));
    const sourceEmails = [
      { email: source.email, verified: source.email_verified },
      { email: source.secondary_email, verified: source.secondary_email_verified }
    ].filter((entry, index, entries) => (
      isValidEmail(entry.email)
      && !targetEmails.has(normalizeEmail(entry.email))
      && entries.findIndex((candidate) => normalizeEmail(candidate.email) === normalizeEmail(entry.email)) === index
    ));
    const availableEmailSlots = target.secondary_email ? 0 : 1;
    if (sourceEmails.length > availableEmailSlots) {
      return res.status(409).json({
        error: 'Das gemeinsame Wohnungskonto hat bereits zwei E-Mail-Adressen. Bitte dort zuerst eine Adresse anpassen und danach erneut verbinden.'
      });
    }
    db.transaction(() => {
      db.prepare('UPDATE bookings SET user_id = ? WHERE user_id = ?').run(target.id, source.id);
      db.prepare('UPDATE push_subscriptions SET user_id = ?, house_id = ? WHERE user_id = ?')
        .run(target.id, target.house_id, source.id);
      const targetPreferences = db.prepare('SELECT user_id FROM notification_preferences WHERE user_id = ?').get(target.id);
      if (!targetPreferences) {
        db.prepare('UPDATE notification_preferences SET user_id = ? WHERE user_id = ?').run(target.id, source.id);
      } else {
        db.prepare('DELETE FROM notification_preferences WHERE user_id = ?').run(source.id);
      }
      if (!target.secondary_email && sourceEmails[0]) {
        db.prepare(`
          UPDATE users SET secondary_email = ?, secondary_email_verified = ? WHERE id = ?
        `).run(sourceEmails[0].email, sourceEmails[0].verified, target.id);
      }
      db.prepare(`
        UPDATE users
        SET active = 0, apartment_id = NULL, merged_into_user_id = ?,
            email = NULL, secondary_email = NULL,
            email_verified = 0, secondary_email_verified = 0
        WHERE id = ?
      `).run(target.id, source.id);
      db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(source.id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(source.id);
      db.prepare('UPDATE device_pairing_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(pairing.id);
    })();

    destroyUserSessions(source.id, req.sessionID);
    req.session.user = sessionUserFromRow(db.prepare('SELECT * FROM users WHERE id = ?').get(target.id));
    req.session.activeHouseId = target.house_id;
    req.session.lastActivityAt = Date.now();
    writeAudit(req, 'apartment.account_merge', 'user', source.id, { targetUserId: target.id });
    res.json({
      user: req.session.user,
      message: `Dieses Ger\u00e4t nutzt jetzt das gemeinsame Konto ${req.session.user.apartmentLabel}.`
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/session/keepalive', requireAuth, (req, res) => {
  req.session.lastActivityAt = Date.now();
  res.json({
    ok: true,
    session: {
      idleTimeoutMs: sessionIdleTimeoutMs,
      warningMs: sessionWarningMs,
      lastActivityAt: req.session.lastActivityAt
    }
  });
});

app.get('/api/push/public-key', requireAuth, (req, res) => {
  const status = pushStatus();
  res.json({
    configured: status.configured,
    publicKey: status.publicKey,
    activeSubscriptions: status.activeSubscriptions,
    label: status.label
  });
});

app.post('/api/push/subscriptions', requireAuth, (req, res) => {
  const subscription = req.body?.subscription || req.body;
  const endpoint = String(subscription?.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const auth = String(subscription?.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Push-Abo ist unvollstaendig.' });
  }

  db.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth, user_agent, active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      house_id = excluded.house_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      active = 1,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    req.session.user.id,
    req.session.user.houseId,
    endpoint,
    p256dh,
    auth,
    String(req.get('user-agent') || '').slice(0, 300)
  );
  res.status(201).json({ ok: true, message: 'Push-Hinweise sind auf diesem Geraet aktiv.' });
});

app.delete('/api/push/subscriptions', requireAuth, (req, res) => {
  const endpoint = String(req.body?.endpoint || '').trim();
  if (endpoint) {
    db.prepare(`
      UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE endpoint = ? AND user_id = ?
    `).run(endpoint, req.session.user.id);
  } else {
    db.prepare(`
      UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(req.session.user.id);
  }
  res.json({ ok: true, message: 'Push-Hinweise wurden fuer dieses Konto deaktiviert.' });
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

app.put('/api/me/booking-mode', requireAuth, (req, res) => {
  const bookingMode = String(req.body?.bookingMode || '');
  if (!['time', 'machine'].includes(bookingMode)) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Buchungsweg.' });
  }
  db.prepare('UPDATE users SET booking_mode = ? WHERE id = ?')
    .run(bookingMode, req.session.user.id);
  req.session.user.bookingMode = bookingMode;
  res.json({
    user: req.session.user,
    message: bookingMode === 'time'
      ? 'Zeitfenster stehen beim Buchen jetzt an erster Stelle.'
      : 'Waschmaschinen stehen beim Buchen jetzt an erster Stelle.'
  });
});

app.put('/api/me/notifications', requireAuth, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const secondaryEmail = normalizeEmail(req.body?.secondaryEmail);
  const notifyReleases = req.body?.notifyReleases === false ? 0 : 1;
  const resourceType = String(req.body?.resourceType || 'all');
  const weekday = req.body?.weekday === '' || req.body?.weekday == null ? null : Number(req.body.weekday);
  const preferredSlot = String(req.body?.slot || '') || null;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }
  if (secondaryEmail && !isValidEmail(secondaryEmail)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige zweite E-Mail-Adresse eintragen.' });
  }
  if (secondaryEmail && secondaryEmail === email) {
    return res.status(400).json({ error: 'Die zweite E-Mail-Adresse muss sich von der ersten unterscheiden.' });
  }
  if (findEmailOwner(email, req.session.user.id) || (secondaryEmail && findEmailOwner(secondaryEmail, req.session.user.id))) {
    return res.status(409).json({ error: 'Eine dieser E-Mail-Adressen ist bereits einem anderen Konto zugeordnet.' });
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
    const previous = db.prepare(`
      SELECT email, email_verified, secondary_email, secondary_email_verified
      FROM users WHERE id = ?
    `).get(req.session.user.id);
    const emailChanged = normalizeEmail(previous?.email) !== email;
    const secondaryEmailChanged = normalizeEmail(previous?.secondary_email) !== secondaryEmail;
    const emailVerified = emailChanged ? 0 : previous?.email_verified ?? 0;
    const secondaryEmailVerified = secondaryEmailChanged ? 0 : previous?.secondary_email_verified ?? 0;
    db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET email = ?, secondary_email = NULLIF(?, ''), notify_releases = ?,
            email_verified = ?, secondary_email_verified = ?
        WHERE id = ?
      `).run(
        email,
        secondaryEmail,
        notifyReleases,
        emailVerified,
        secondaryEmailVerified,
        req.session.user.id
      );
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
    if (secondaryEmailChanged && secondaryEmail && emailStatus().configured) {
      await sendEmailVerification(req, {
        id: req.session.user.id,
        username: req.session.user.username,
        secondary_email: secondaryEmail
      }, 'secondary').catch((error) => console.error(`Zweite Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`));
    }
    req.session.user.emailVerified = Boolean(emailVerified);
    req.session.user.secondaryEmailVerified = Boolean(secondaryEmailVerified);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
    }
    throw error;
  }

  req.session.user.email = email;
  req.session.user.secondaryEmail = secondaryEmail;
  req.session.user.notifyReleases = Boolean(notifyReleases);
  res.json({
    user: req.session.user,
    notificationPreferences: { resourceType, weekday, slot: preferredSlot },
    message: req.session.user.emailVerified
      ? 'Benachrichtigungen gespeichert.'
      : emailStatus().configured
        ? 'Benachrichtigungen gespeichert. Bitte best\u00e4tige die neue E-Mail-Adresse.'
        : 'Benachrichtigungen gespeichert. E-Mail-Hinweise werden nach Einrichtung des Versands freigeschaltet.'
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
    return res.status(400).json({ error: 'Das neue Passwort muss 12 bis 128 Zeichen haben.' });
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
    SELECT u.id, u.username, u.email, u.secondary_email, u.role, u.active,
           u.notify_releases, u.email_verified, u.secondary_email_verified,
           u.booking_mode, u.created_at, a.label AS apartment,
           a.display_name AS apartment_display_name
    FROM users u LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE u.id = ?
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
  if (!isDateString(from) || !Number.isInteger(days) || days < 1 || days > 42) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Kalenderzeitraum' });
  }

  res.json({
    from,
    days: Array.from({ length: days }, (_, index) => (
      calendarDaySummary(req.session.user.id, addDays(from, index), houseId)
    ))
  });
});

app.get('/api/booking-options', requireAuth, (req, res) => {
  const date = String(req.query.date || '');
  const selectedSlot = String(req.query.slot || '');
  const houseId = currentHouseId(req);
  if (!isDateString(date) || (selectedSlot && !slots.includes(selectedSlot))) {
    return res.status(400).json({ error: 'Ung\u00fcltiger Buchungszeitraum' });
  }

  const existingWashers = db.prepare(`
    SELECT b.id AS bookingId, b.group_id AS groupId, b.slot,
           r.id AS resourceId, r.name AS resourceName
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ?
      AND r.type = 'washer'
      AND r.house_id = ?
      AND b.booking_date = ?
    ORDER BY b.slot, r.name
  `).all(req.session.user.id, houseId, date);

  const slotOptions = slots.map((slot) => {
    const unavailableByTime = isSunday(date) || isPastSlot(date, slot);
    const washerError = unavailableByTime
      ? ''
      : validateWasherBooking(req.session.user.id, date, slot, houseId);
    const washers = unavailableByTime
      ? []
      : findAvailableResources(req.session.user.id, 'washer', date, slot, houseId, 3)
        .map((resource) => ({ resourceId: resource.id, resourceName: resource.name }));
    const dryingRoomCount = washers.length
      ? availableDryingRoomsForWasher(req.session.user.id, date, slot, houseId).length
      : 0;
    const tumblerCount = washers.length
      ? findAvailableResources(req.session.user.id, 'tumbler', date, slot, houseId, 2).length
      : 0;
    return { slot, washerError, washers, dryingRoomCount, tumblerCount };
  });

  let companions = null;
  if (selectedSlot) {
    companions = {
      dryingRooms: availableDryingRoomsForWasher(
        req.session.user.id,
        date,
        selectedSlot,
        houseId
      ),
      tumblers: findAvailableResources(
        req.session.user.id,
        'tumbler',
        date,
        selectedSlot,
        houseId,
        2
      ).map((resource) => ({ resourceId: resource.id, resourceName: resource.name }))
    };
  }

  res.json({
    date,
    closed: isSunday(date),
    existingWashers,
    slots: slotOptions,
    companions
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

app.get('/api/maintenance-resources', requireAuth, (req, res) => {
  const reportableResources = db.prepare(`
    SELECT id, name, type, active, blocked_reason
    FROM resources WHERE house_id = ? ORDER BY type, name
  `).all(currentHouseId(req));
  res.json({ resources: reportableResources });
});

function maintenanceCaseDetails(rows) {
  const entryQuery = db.prepare(`
    SELECT me.id, me.case_id, me.entry_type, me.note, me.created_at,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'System') AS created_by_name
    FROM maintenance_entries me
    LEFT JOIN users u ON u.id = me.created_by
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE me.case_id = ?
    ORDER BY me.created_at, me.id
  `);
  return rows.map((row) => ({ ...row, entries: entryQuery.all(row.id) }));
}

function maintenanceCasesForHouse(houseId, reportedBy = null) {
  const reportedFilter = reportedBy ? `AND (
    mc.reported_by = ? OR EXISTS (
      SELECT 1 FROM maintenance_entries own_report
      WHERE own_report.case_id = mc.id AND own_report.entry_type = 'report' AND own_report.created_by = ?
    )
  )` : '';
  const params = reportedBy ? [houseId, reportedBy, reportedBy] : [houseId];
  return maintenanceCaseDetails(db.prepare(`
    SELECT mc.id, mc.house_id, mc.resource_id, mc.title, mc.description, mc.status,
           mc.created_at, mc.updated_at, mc.closed_at,
           r.name AS resource_name, r.type AS resource_type, h.name AS house_name,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'Verwaltung') AS reported_by_name
    FROM maintenance_cases mc
    LEFT JOIN resources r ON r.id = mc.resource_id
    JOIN houses h ON h.id = mc.house_id
    LEFT JOIN users u ON u.id = mc.reported_by
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE mc.house_id = ? ${reportedFilter}
    ORDER BY CASE mc.status WHEN 'reported' THEN 0 WHEN 'blocked' THEN 1 WHEN 'repairing' THEN 2 WHEN 'tested' THEN 3 ELSE 4 END,
             mc.updated_at DESC, mc.id DESC
    LIMIT 300
  `).all(...params));
}

function maintenanceCasesForAdmin(req) {
  if (!isSuperadmin(req)) return maintenanceCasesForHouse(currentHouseId(req));
  return maintenanceCaseDetails(db.prepare(`
    SELECT mc.id, mc.house_id, mc.resource_id, mc.title, mc.description, mc.status,
           mc.created_at, mc.updated_at, mc.closed_at,
           r.name AS resource_name, r.type AS resource_type, h.name AS house_name,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'Verwaltung') AS reported_by_name
    FROM maintenance_cases mc
    LEFT JOIN resources r ON r.id = mc.resource_id
    JOIN houses h ON h.id = mc.house_id
    LEFT JOIN users u ON u.id = mc.reported_by
    LEFT JOIN apartments a ON a.id = u.apartment_id
    ORDER BY CASE mc.status WHEN 'reported' THEN 0 WHEN 'blocked' THEN 1 WHEN 'repairing' THEN 2 WHEN 'tested' THEN 3 ELSE 4 END,
             mc.updated_at DESC, mc.id DESC
    LIMIT 500
  `).all());
}

function maintenanceCaseForAdmin(req, caseId) {
  const maintenanceCase = db.prepare('SELECT * FROM maintenance_cases WHERE id = ?').get(caseId);
  if (!maintenanceCase) return null;
  if (!isSuperadmin(req) && Number(maintenanceCase.house_id) !== currentHouseId(req)) return null;
  return maintenanceCase;
}

function appendMaintenanceEntry(caseId, entryType, note, userId) {
  db.prepare(`
    INSERT INTO maintenance_entries (case_id, entry_type, note, created_by)
    VALUES (?, ?, ?, ?)
  `).run(caseId, entryType, note, userId || null);
  db.prepare('UPDATE maintenance_cases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(caseId);
}

app.get('/api/maintenance-cases', requireAuth, requireApartmentAccount, (req, res) => {
  if (req.session.user.role !== 'user') {
    return res.status(403).json({ error: 'St\u00f6rungsmeldungen sind f\u00fcr Bewohnerkonten vorgesehen.' });
  }
  res.json({ cases: maintenanceCasesForHouse(currentHouseId(req), req.session.user.id) });
});

app.post('/api/maintenance-cases', requireAuth, requireApartmentAccount, (req, res) => {
  if (req.session.user.role !== 'user') {
    return res.status(403).json({ error: 'St\u00f6rungsmeldungen sind f\u00fcr Bewohnerkonten vorgesehen.' });
  }
  const resourceId = Number(req.body?.resourceId);
  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim();
  const resource = db.prepare('SELECT id, name FROM resources WHERE id = ? AND house_id = ?')
    .get(resourceId, currentHouseId(req));
  if (!resource) return res.status(404).json({ error: 'Geraet oder Raum nicht gefunden.' });
  if (!isValidPlainText(title, 3, 120) || !isValidMaintenanceText(description, 5, 1000)) {
    return res.status(400).json({ error: 'Bitte einen kurzen Titel und eine Beschreibung mit mindestens 5 Zeichen eingeben.' });
  }
  const createCase = db.transaction(() => {
    const openCase = db.prepare(`
      SELECT id FROM maintenance_cases
      WHERE house_id = ? AND resource_id = ? AND status != 'closed'
      ORDER BY created_at DESC LIMIT 1
    `).get(currentHouseId(req), resource.id);
    if (openCase) {
      appendMaintenanceEntry(openCase.id, 'report', `${title}: ${description}`, req.session.user.id);
      return { id: openCase.id, addedToExisting: true };
    }
    const result = db.prepare(`
      INSERT INTO maintenance_cases (house_id, resource_id, reported_by, title, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(currentHouseId(req), resource.id, req.session.user.id, title, description);
    appendMaintenanceEntry(result.lastInsertRowid, 'report', description, req.session.user.id);
    return { id: result.lastInsertRowid, addedToExisting: false };
  });
  const created = createCase();
  writeAudit(req, 'maintenance_case.report', 'maintenance_case', created.id, {
    resourceId: resource.id,
    title,
    addedToExisting: created.addedToExisting
  });
  res.status(201).json({
    id: created.id,
    addedToExisting: created.addedToExisting,
    message: created.addedToExisting
      ? `Deine Beobachtung zu ${resource.name} wurde dem laufenden Tagebuchfall erg\u00e4nzt.`
      : `St\u00f6rung zu ${resource.name} wurde an den Haus-Admin gemeldet.`
  });
});

app.get('/api/admin/resources', requireAdmin, (req, res) => {
  const resources = db.prepare(`
    SELECT r.id, r.name, r.type, r.active, r.blocked_reason, r.blocked_at,
           u.username AS blocked_by
    FROM resources r
    LEFT JOIN users u ON u.id = r.blocked_by
    WHERE r.house_id = ?
    ORDER BY type, name
  `).all(currentHouseId(req));
  res.json({ resources });
});

app.post('/api/admin/resources', requireAdmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const type = String(req.body?.type || '');
  if (!isValidPlainText(name, 2, 80) || !['washer', 'drying_room', 'tumbler'].includes(type)) {
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
  const blockReason = String(req.body?.blockReason || '').trim();
  if (!isValidPlainText(name, 2, 80)) {
    return res.status(400).json({ error: 'Der Name muss 2 bis 80 Zeichen haben.' });
  }
  if (!active && blockReason && !isValidPlainText(blockReason, 3, 180)) {
    return res.status(400).json({ error: 'Der Sperrgrund muss 3 bis 180 Zeichen haben.' });
  }
  if (db.prepare('SELECT id FROM resources WHERE lower(name) = lower(?) AND house_id = ? AND id != ?')
    .get(name, currentHouseId(req), resource.id)) {
    return res.status(409).json({ error: 'Ein Ger\u00e4t mit diesem Namen ist bereits vorhanden.' });
  }
  if (active && !resource.active) {
    return res.status(409).json({
      error: 'Freigabe nur im Maschinentagebuch: zuerst Reparatur und Funktionspruefung dokumentieren, danach mit Abschlussnotiz freigeben.'
    });
  }
  if (!active && resource.active && !isValidPlainText(blockReason, 3, 180)) {
    return res.status(400).json({ error: 'Zum Sperren ist ein Grund mit 3 bis 180 Zeichen erforderlich.' });
  }
  let maintenanceCaseId = null;
  const updateResourceAndCase = db.transaction(() => {
    db.prepare(`
      UPDATE resources
      SET name = ?, active = ?, blocked_reason = ?, blocked_at = ?, blocked_by = ?
      WHERE id = ?
    `).run(
      name,
      active,
      active ? null : (blockReason || resource.blocked_reason),
      active ? null : (resource.blocked_at || new Date().toISOString()),
      active ? null : req.session.user.id,
      resource.id
    );
    if (!active && resource.active) {
      const openCase = db.prepare(`
        SELECT id FROM maintenance_cases
        WHERE resource_id = ? AND house_id = ? AND status != 'closed'
        ORDER BY created_at DESC LIMIT 1
      `).get(resource.id, currentHouseId(req));
      if (openCase) {
        maintenanceCaseId = openCase.id;
        db.prepare("UPDATE maintenance_cases SET status = 'blocked', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(openCase.id);
      } else {
        const created = db.prepare(`
          INSERT INTO maintenance_cases (house_id, resource_id, reported_by, title, description, status)
          VALUES (?, ?, ?, ?, ?, 'blocked')
        `).run(currentHouseId(req), resource.id, req.session.user.id, `Sperre: ${name}`, blockReason);
        maintenanceCaseId = created.lastInsertRowid;
        appendMaintenanceEntry(maintenanceCaseId, 'report', blockReason, req.session.user.id);
      }
      appendMaintenanceEntry(maintenanceCaseId, 'block', blockReason, req.session.user.id);
    }
  });
  updateResourceAndCase();
  writeAudit(req, active ? 'resource.update' : 'resource.block', 'resource', resource.id, {
    name,
    active: Boolean(active),
    reason: active ? '' : (blockReason || resource.blocked_reason || ''),
    maintenanceCaseId
  });
  res.json({
    ok: true,
    maintenanceCaseId,
    message: !active && resource.active ? `${name} wurde gesperrt und im Tagebuch erfasst.` : `${name} wurde gespeichert.`
  });
});

app.get('/api/admin/maintenance-cases', requireAdmin, (req, res) => {
  res.json({ cases: maintenanceCasesForAdmin(req) });
});

app.post('/api/admin/maintenance-cases/:id/actions', requireAdmin, (req, res) => {
  const maintenanceCase = maintenanceCaseForAdmin(req, Number(req.params.id));
  if (!maintenanceCase) return res.status(404).json({ error: 'Tagebuchfall nicht gefunden.' });

  const action = String(req.body?.action || '');
  const note = String(req.body?.note || '').trim();
  if (!['note', 'block', 'repair', 'test', 'release'].includes(action)) {
    return res.status(400).json({ error: 'Unbekannter Tagebuchschritt.' });
  }
  if (!isValidMaintenanceText(note, 3, 1000)) {
    return res.status(400).json({ error: 'Eine nachvollziehbare Notiz mit 3 bis 1000 Zeichen ist erforderlich.' });
  }
  const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND house_id = ?')
    .get(maintenanceCase.resource_id, maintenanceCase.house_id);
  if (!resource && action !== 'note') {
    return res.status(409).json({ error: 'Die zugehoerige Ressource existiert nicht mehr. Es kann nur noch eine Notiz ergaenzt werden.' });
  }

  let message = 'Notiz wurde unveraenderbar ergaenzt.';
  let entryType = 'note';
  let nextStatus = maintenanceCase.status;
  if (action === 'block') {
    if (maintenanceCase.status !== 'reported') {
      return res.status(409).json({ error: 'Nur eine neue Meldung kann als naechster Schritt gesperrt werden.' });
    }
    entryType = 'block';
    nextStatus = 'blocked';
    message = `${resource.name} wurde gesperrt.`;
  } else if (action === 'repair') {
    if (!['blocked', 'repairing'].includes(maintenanceCase.status) || resource.active) {
      return res.status(409).json({ error: 'Eine Reparatur kann nur an einer gesperrten Ressource dokumentiert werden.' });
    }
    entryType = 'repair';
    nextStatus = 'repairing';
    message = 'Reparatur wurde dokumentiert.';
  } else if (action === 'test') {
    if (maintenanceCase.status !== 'repairing' || resource.active) {
      return res.status(409).json({ error: 'Die Funktionspruefung folgt auf eine dokumentierte Reparatur an der gesperrten Ressource.' });
    }
    const successful = req.body?.successful === true;
    entryType = successful ? 'test_passed' : 'test_failed';
    nextStatus = successful ? 'tested' : 'repairing';
    message = successful
      ? 'Funktionspruefung bestanden. Die Freigabe ist jetzt moeglich.'
      : 'Funktionspruefung nicht bestanden. Die Ressource bleibt gesperrt.';
  } else if (action === 'release') {
    if (maintenanceCase.status !== 'tested' || resource.active) {
      return res.status(409).json({ error: 'Freigabe erst nach einer erfolgreichen Funktionspruefung moeglich.' });
    }
    entryType = 'release';
    nextStatus = 'closed';
    message = `${resource.name} wurde freigegeben und der Fall abgeschlossen.`;
  }

  const applyAction = db.transaction(() => {
    appendMaintenanceEntry(maintenanceCase.id, entryType, note, req.session.user.id);
    db.prepare(`
      UPDATE maintenance_cases
      SET status = ?, updated_at = CURRENT_TIMESTAMP,
          closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE id = ?
    `).run(nextStatus, nextStatus, maintenanceCase.id);
    if (action === 'block') {
      db.prepare(`
        UPDATE resources SET active = 0, blocked_reason = ?, blocked_at = ?, blocked_by = ? WHERE id = ?
      `).run(note, new Date().toISOString(), req.session.user.id, resource.id);
    } else if (action === 'release') {
      db.prepare(`
        UPDATE resources SET active = 1, blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE id = ?
      `).run(resource.id);
    }
  });
  applyAction();
  writeAuditForHouse(req, maintenanceCase.house_id, `maintenance_case.${action}`, 'maintenance_case', maintenanceCase.id, {
    resourceId: maintenanceCase.resource_id,
    status: nextStatus,
    successful: action === 'test' ? req.body?.successful === true : undefined
  });
  res.json({ ok: true, status: nextStatus, message });
});

app.get('/api/my-bookings', requireAuth, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.id, b.booking_date, b.slot, b.group_id, r.id AS resource_id, r.name AS resource_name,
           r.type AS resource_type, u.id AS user_id,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN users u ON u.id = b.user_id
    LEFT JOIN apartments a ON a.id = u.apartment_id
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
           r.type AS resource_type, u.id AS user_id,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username, 0 AS is_fixed
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN users u ON u.id = b.user_id
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE b.booking_date = ? AND r.house_id = ?
    ORDER BY b.slot, r.name
  `).all(date, houseId);

  const fixedBookings = getFixedBookingsForDate(date, houseId);
  const allBookings = [...bookings, ...fixedBookings]
    .sort((left, right) => left.slot.localeCompare(right.slot) || left.resource_name.localeCompare(right.resource_name));

  res.json({ bookings: allBookings });
});

app.post('/api/bookings', requireAuth, requireApartmentAccount, (req, res) => {
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

app.post('/api/booking-package', requireAuth, requireApartmentAccount, (req, res, next) => {
  const rawItems = req.body?.items;
  const washerBookingId = Number(req.body?.washerBookingId || 0);
  const houseId = currentHouseId(req);
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 8) {
    return res.status(400).json({ error: 'Ein Waschpaket muss ein bis acht Buchungen enthalten.' });
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
    let newWashers = [];

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
      if (washerItems.length < 1 || washerItems.length > 3) {
        throw packageRequestError(400, 'Ein neues Waschpaket braucht eine bis drei Waschmaschinen.');
      }
      newWashers = washerItems;
    }

    const washDate = existingWasher?.booking_date || newWashers[0].date;
    const washSlot = existingWasher?.slot || newWashers[0].slot;
    if (isPastDate(washDate) || isPastSlot(washDate, washSlot)) {
      throw packageRequestError(400, 'Der empfohlene Waschslot ist bereits vorbei. Bitte lade eine neue Empfehlung.');
    }
    if (isSunday(washDate)) {
      throw packageRequestError(400, 'Sonntags sind keine Buchungen m\u00f6glich.');
    }

    if (newWashers.some((item) => item.date !== washDate || item.slot !== washSlot)) {
      throw packageRequestError(400, 'Alle Waschmaschinen im Paket m\u00fcssen im gleichen Zeitfenster liegen.');
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
        throw packageRequestError(409, 'Ein Bestandteil des Waschpakets wurde inzwischen gebucht. Bitte lade eine neue Empfehlung.');
      }
    }

    if (newWashers.length) {
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

      if (newWashers.length) {
        const washerError = validateWasherBooking(req.session.user.id, washDate, washSlot, houseId);
        if (washerError) {
          throw packageRequestError(409, washerError);
        }
        for (const washer of newWashers) {
          const result = insert.run(req.session.user.id, washer.resourceId, washDate, washSlot, groupId);
          created.push({ id: result.lastInsertRowid, type: 'washer' });
        }
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
    const summary = bookedTypes.map((type) => {
      const count = created.filter((item) => item.type === type).length;
      if (type === 'washer' && count > 1) {
        return `${count} Waschmaschinen`;
      }
      return typeLabels[type];
    }).join(', ');
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
    next(error);
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

    const actorName = req.session.user.displayName || req.session.user.username || 'Jemand';
    const noticeRows = db.transaction(() => {
      const createdNotices = [];
      db.prepare('DELETE FROM bookings WHERE group_id = ?').run(groupId);
      const insertNotice = db.prepare(`
        INSERT INTO release_notices (resource_id, resource_name, booking_date, slot, kind, message, house_id, created_by)
        VALUES (?, ?, ?, ?, 'cancellation', ?, ?, ?)
      `);
      for (const booking of groupedBookings) {
        const noticeMessage = `${actorName} hat ${booking.resource_name} am ${booking.booking_date} im Zeitfenster ${booking.slot} abgesagt. Der Slot ist wieder buchbar.`;
        const result = insertNotice.run(
          booking.resource_id,
          booking.resource_name,
          booking.booking_date,
          booking.slot,
          noticeMessage,
          booking.house_id,
          req.session.user.id
        );
        createdNotices.push({ booking, noticeId: result.lastInsertRowid });
      }
      return createdNotices;
    })();

    const washer = groupedBookings.find((booking) => booking.resource_type === 'washer') || groupedBookings[0];
    const primaryNotice = noticeRows.find((row) => row.booking.resource_type === 'washer') || noticeRows[0];
    const message = `${actorName} hat ein Waschpaket am ${washer.booking_date} im Zeitfenster ${washer.slot} abgesagt. Die enthaltenen Termine sind wieder buchbar.`;
    const { emailNotifications, pushNotifications } = await notifyReleaseChannels(
      req,
      { ...washer, notice_id: primaryNotice?.noticeId },
      message,
      'WaschZeit: Waschpaket wieder frei'
    );
    res.json({
      ok: true,
      deleted: groupedBookings.length,
      releaseNoticeCreated: true,
      emailNotifications,
      pushNotifications,
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
    const actorName = req.session.user.displayName || req.session.user.username || 'Jemand';
    const message = `${actorName} hat ${booking.resource_name} am ${booking.booking_date} im Zeitfenster ${booking.slot} abgesagt. Der Slot ist wieder buchbar.`;
    const noticeResult = db.prepare(`
      INSERT INTO release_notices (resource_id, resource_name, booking_date, slot, kind, message, house_id, created_by)
      VALUES (?, ?, ?, ?, 'cancellation', ?, ?, ?)
    `).run(booking.resource_id, booking.resource_name, booking.booking_date, booking.slot, message, booking.house_id, req.session.user.id);

    const { emailNotifications, pushNotifications } = await notifyReleaseChannels(
      req,
      { ...booking, notice_id: noticeResult.lastInsertRowid },
      message,
      `Waschplan: Termin f\u00fcr ${booking.resource_name} wieder frei`
    );
    res.json({ ok: true, message, releaseNoticeCreated: true, emailNotifications, pushNotifications });
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
        emailNotifications: { configured: emailStatus().configured, sent: 0, skipped: true },
        pushNotifications: { configured: pushStatus().configured, sent: 0, failed: 0, skipped: true }
      });
    }

    const actorName = req.session.user.displayName || req.session.user.username || 'Jemand';
    const message = releaseWindow.hasStarted
      ? `${actorName} hat ${booking.resource_name} freigegeben. Der Slot ist heute bis ${slotEndLabel(booking.slot)} wieder frei.`
      : `${actorName} hat ${booking.resource_name} freigegeben. Der Slot ist am ${booking.booking_date} im Zeitfenster ${booking.slot} wieder frei.`;
    const noticeResult = db.prepare(`
      INSERT INTO release_notices (resource_id, resource_name, booking_date, slot, kind, message, house_id, created_by)
      VALUES (?, ?, ?, ?, 'early_release', ?, ?, ?)
    `).run(booking.resource_id, booking.resource_name, booking.booking_date, booking.slot, message, booking.house_id, req.session.user.id);

    const { emailNotifications, pushNotifications } = await notifyReleaseChannels(req, { ...booking, notice_id: noticeResult.lastInsertRowid }, message);
    res.json({ ok: true, message, releaseNoticeCreated: true, emailNotifications, pushNotifications });
  } catch (error) {
    next(error);
  }
});

function decorateReleaseNotice(notice) {
  const windowStatus = releaseWindowStatus(notice.booking_date, notice.slot);
  const current = notice.kind === 'cancellation'
    ? ['not_started', 'eligible'].includes(windowStatus.reason)
    : windowStatus.eligible;
  const bookable = Boolean(
    current
    && notice.resource_id
    && notice.resource_active === 1
    && notice.is_booked === 0
  );
  return {
    id: notice.id,
    resource_id: notice.resource_id,
    resource_name: notice.resource_name,
    booking_date: notice.booking_date,
    slot: notice.slot,
    kind: notice.kind,
    message: notice.message,
    created_at: notice.created_at,
    created_by_name: notice.created_by_name,
    bookable,
    expired: !current,
    alreadyBooked: notice.is_booked === 1,
    resourceActive: notice.resource_active === 1
  };
}

function releaseNoticeSelect(whereSql) {
  return `
    SELECT rn.id,
           COALESCE(rn.resource_id, r.id) AS resource_id,
           rn.resource_name,
           rn.booking_date,
           rn.slot,
           rn.kind,
           rn.message,
           rn.created_at,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS created_by_name,
           r.active AS resource_active,
           CASE WHEN EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.resource_id = COALESCE(rn.resource_id, r.id)
               AND b.booking_date = rn.booking_date
               AND b.slot = rn.slot
           ) THEN 1 ELSE 0 END AS is_booked
    FROM release_notices rn
    LEFT JOIN users u ON u.id = rn.created_by
    LEFT JOIN apartments a ON a.id = u.apartment_id
    LEFT JOIN resources r ON r.id = rn.resource_id
      OR (rn.resource_id IS NULL AND r.house_id = rn.house_id AND r.name = rn.resource_name)
    ${whereSql}
  `;
}

app.get('/api/release-notices', requireAuth, (req, res) => {
  const notices = db.prepare(`${releaseNoticeSelect(`
    WHERE rn.house_id = ?
      AND rn.created_at >= datetime('now', '-7 days', 'localtime')
  `)}
    ORDER BY rn.created_at DESC
    LIMIT 10
  `).all(currentHouseId(req)).map(decorateReleaseNotice).filter((notice) => !notice.expired);

  res.json({ notices });
});

app.get('/api/release-notices/:id', requireAuth, (req, res) => {
  const notice = db.prepare(releaseNoticeSelect(`
    WHERE rn.id = ?
      AND rn.house_id = ?
      AND rn.created_at >= datetime('now', '-30 days', 'localtime')
  `)).get(Number(req.params.id), currentHouseId(req));
  if (!notice) {
    return res.status(404).json({ error: 'Freigabe nicht gefunden.' });
  }
  res.json({ notice: decorateReleaseNotice(notice) });
});

app.get('/api/admin/apartments', requireAdmin, (req, res) => {
  const apartments = db.prepare(`
    SELECT a.id, a.label, a.display_name, a.active, a.claimed_at,
           CASE WHEN a.claimed_by IS NULL THEN 0 ELSE 1 END AS claimed,
           u.email, u.secondary_email, u.email_verified, u.secondary_email_verified,
           ai.email AS invitation_email, ai.expires_at AS invitation_expires_at,
           ai.email_sent_at AS invitation_email_sent_at,
           ai.accepted_at AS invitation_accepted_at, ai.revoked_at AS invitation_revoked_at,
           anr.id AS name_request_id, anr.proposed_name AS requested_display_name,
           anr.note AS name_request_note, anr.created_at AS name_request_created_at
    FROM apartments a
    LEFT JOIN users u ON u.id = a.claimed_by
    LEFT JOIN apartment_invitations ai ON ai.id = (
      SELECT id FROM apartment_invitations
      WHERE apartment_id = a.id
      ORDER BY id DESC LIMIT 1
    )
    LEFT JOIN apartment_name_requests anr ON anr.id = (
      SELECT id FROM apartment_name_requests
      WHERE apartment_id = a.id AND status = 'pending'
      ORDER BY id DESC LIMIT 1
    )
    WHERE a.house_id = ?
    ORDER BY a.label COLLATE NOCASE
  `).all(currentHouseId(req)).map((apartment) => ({
    ...apartment,
    active: Boolean(apartment.active),
    claimed: Boolean(apartment.claimed),
    invitationStatus: apartment.claimed
      ? 'accepted'
      : !apartment.invitation_email
        ? 'none'
        : apartment.invitation_accepted_at
          ? 'accepted'
          : apartment.invitation_revoked_at
            ? 'revoked'
            : Number(apartment.invitation_expires_at) <= Date.now()
              ? 'expired'
              : 'pending'
  }));
  res.json({ apartments });
});

app.post('/api/admin/apartments', requireAdmin, async (req, res, next) => {
  const label = String(req.body?.label || '').trim();
  const displayName = String(req.body?.displayName || '').trim();
  const email = normalizeEmail(req.body?.email);
  if (!isValidPlainText(label, 2, 60)) {
    return res.status(400).json({ error: 'Bitte eine Wohnungsbezeichnung mit 2 bis 60 Zeichen eingeben.' });
  }
  if (!isValidPlainText(displayName, 2, 80)) {
    return res.status(400).json({ error: 'Bitte den Namen vom Klingelschild mit 2 bis 80 Zeichen eingeben.' });
  }
  if (allowLegacyHouseRegistration && !email) {
    const code = generateReadableCode('W');
    try {
      const result = db.prepare(`
        INSERT INTO apartments (house_id, label, display_name, activation_code_hash)
        VALUES (?, ?, ?, ?)
      `).run(currentHouseId(req), label, displayName, tokenHash(normalizeAccessCode(code)));
      return res.status(201).json({
        apartment: { id: result.lastInsertRowid, label, display_name: displayName, claimed: false, active: true },
        activationCode: code,
        message: 'Technische Testwohnung angelegt.'
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Diese Wohnungsbezeichnung ist bereits vorhanden.' });
      }
      return next(error);
    }
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse fuer die Einladung eingeben.' });
  }
  if (findEmailOwner(email) || pendingInvitationForEmail(email)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits einem Konto oder einer offenen Einladung zugeordnet.' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO apartments (house_id, label, display_name, activation_code_hash)
      VALUES (?, ?, ?, NULL)
    `).run(currentHouseId(req), label, displayName);
    const apartment = {
      id: result.lastInsertRowid,
      house_id: currentHouseId(req),
      house_name: db.prepare('SELECT name FROM houses WHERE id = ?').get(currentHouseId(req)).name,
      label,
      display_name: displayName
    };
    const invitation = await issueApartmentInvitation(req, apartment, email);
    writeAudit(req, 'apartment.invitation_created', 'apartment', result.lastInsertRowid, {
      label, displayName, email, emailSent: invitation.emailSent
    });
    res.status(201).json({
      apartment: { id: result.lastInsertRowid, label, display_name: displayName, claimed: false, active: true },
      invitation: {
        email,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
        emailSent: invitation.emailSent
      },
      invitationLink: invitation.link,
      message: invitation.emailSent
        ? `Wohnung angelegt. Die Einladung wurde an ${email} gesendet.`
        : `Wohnung angelegt. E-Mail-Versand ist noch nicht bereit; der Einladungslink wird einmalig angezeigt.`
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese Wohnungsbezeichnung ist bereits vorhanden.' });
    }
    next(error);
  }
});

app.post('/api/admin/apartments/:id/invitation', requireAdmin, async (req, res, next) => {
  const apartment = db.prepare(`
    SELECT a.id, a.house_id, a.label, a.display_name, a.claimed_by, h.name AS house_name
    FROM apartments a JOIN houses h ON h.id = a.house_id
    WHERE a.id = ? AND a.house_id = ? AND a.active = 1
  `).get(Number(req.params.id), currentHouseId(req));
  if (!apartment) return res.status(404).json({ error: 'Wohnung nicht gefunden.' });
  if (apartment.claimed_by) {
    return res.status(409).json({ error: 'Diese Wohnung ist bereits aktiviert.' });
  }
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse fuer die Einladung eingeben.' });
  }
  if (findEmailOwner(email) || pendingInvitationForEmail(email, apartment.id)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits einem Konto oder einer anderen Einladung zugeordnet.' });
  }
  try {
    const invitation = await issueApartmentInvitation(req, apartment, email);
    writeAudit(req, 'apartment.invitation_renewed', 'apartment', apartment.id, {
      label: apartment.label, email, emailSent: invitation.emailSent
    });
    res.json({
      invitation: {
        email,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
        emailSent: invitation.emailSent
      },
      invitationLink: invitation.link,
      message: invitation.emailSent
        ? `Neue Einladung wurde an ${email} gesendet.`
        : 'E-Mail-Versand ist noch nicht bereit; der neue Einladungslink wird einmalig angezeigt.'
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/apartments/:id', requireAdmin, async (req, res, next) => {
  const apartment = db.prepare(`
    SELECT a.id, a.label, a.display_name, a.claimed_by,
           u.email, u.secondary_email, u.email_verified, u.secondary_email_verified, u.username
    FROM apartments a
    LEFT JOIN users u ON u.id = a.claimed_by
    WHERE a.id = ? AND a.house_id = ? AND a.active = 1
  `).get(Number(req.params.id), currentHouseId(req));
  if (!apartment) {
    return res.status(404).json({ error: 'Wohnung nicht gefunden.' });
  }

  const displayName = String(req.body?.displayName || '').trim();
  if (!isValidPlainText(displayName, 2, 80)) {
    return res.status(400).json({ error: 'Bitte den Namen vom Klingelschild mit 2 bis 80 Zeichen eingeben.' });
  }

  const requestedEmail = normalizeEmail(req.body?.email);
  const requestedSecondaryEmail = normalizeEmail(req.body?.secondaryEmail);
  if (apartment.claimed_by && (
    (Object.hasOwn(req.body || {}, 'email') && requestedEmail !== normalizeEmail(apartment.email))
    || (Object.hasOwn(req.body || {}, 'secondaryEmail')
      && requestedSecondaryEmail !== normalizeEmail(apartment.secondary_email))
  )) {
    return res.status(403).json({
      error: 'Admins duerfen die E-Mail-Adressen eines Wohnungskontos nicht ersetzen. Bewohner aendern sie selbst unter Einstellungen; ohne bestaetigte Adresse wird ein persoenlicher Wiederherstellungscode verwendet.'
    });
  }

  try {
    db.transaction(() => {
      db.prepare('UPDATE apartments SET display_name = ? WHERE id = ?').run(displayName, apartment.id);
      db.prepare(`
        UPDATE apartment_name_requests
        SET status = CASE WHEN lower(proposed_name) = lower(?) THEN 'approved' ELSE 'rejected' END,
            resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE apartment_id = ? AND status = 'pending'
      `).run(displayName, req.session.user.id, apartment.id);
    })();

    writeAudit(req, 'apartment.update', 'apartment', apartment.id, {
      label: apartment.label,
      displayName
    });
    res.json({
      ok: true,
      message: `${apartment.label} wurde aktualisiert.`
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Name oder E-Mail-Adresse ist bereits vergeben.' });
    }
    next(error);
  }
});

app.post('/api/admin/apartments/:id/name-request/:requestId/reject', requireAdmin, (req, res) => {
  const request = db.prepare(`
    SELECT anr.id, anr.apartment_id, anr.proposed_name
    FROM apartment_name_requests anr
    JOIN apartments a ON a.id = anr.apartment_id
    WHERE anr.id = ? AND anr.apartment_id = ? AND anr.status = 'pending' AND a.house_id = ?
  `).get(Number(req.params.requestId), Number(req.params.id), currentHouseId(req));
  if (!request) {
    return res.status(404).json({ error: 'Offener Korrekturwunsch nicht gefunden.' });
  }
  db.prepare(`
    UPDATE apartment_name_requests
    SET status = 'rejected', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.session.user.id, request.id);
  writeAudit(req, 'apartment.name_request_reject', 'apartment', request.apartment_id, {
    requestId: request.id,
    proposedName: request.proposed_name
  });
  res.json({ ok: true, message: 'Der Korrekturwunsch wurde abgelehnt.' });
});

app.post('/api/admin/apartments/:id/new-code', requireAdmin, (req, res) => {
  if (!allowLegacyHouseRegistration) {
    return res.status(410).json({ error: 'Wohnungscodes wurden durch sichere E-Mail-Einladungen ersetzt.' });
  }
  const apartment = db.prepare(`
    SELECT id, label, claimed_by FROM apartments WHERE id = ? AND house_id = ? AND active = 1
  `).get(Number(req.params.id), currentHouseId(req));
  if (!apartment) return res.status(404).json({ error: 'Wohnung nicht gefunden.' });
  if (apartment.claimed_by) {
    return res.status(409).json({ error: 'Eine bereits aktivierte Wohnung erhaelt keinen neuen Aktivierungscode.' });
  }
  const code = generateReadableCode('W');
  db.prepare('UPDATE apartments SET activation_code_hash = ? WHERE id = ?')
    .run(tokenHash(normalizeAccessCode(code)), apartment.id);
  res.json({ activationCode: code, message: 'Technischer Testcode wurde erneuert.' });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.secondary_email, u.role, u.house_id, u.is_superadmin,
           u.active, u.notify_releases, u.email_verified, u.secondary_email_verified,
           u.created_at, a.label AS apartment_label, a.display_name AS apartment_display_name,
           u.merged_into_user_id
    FROM users u
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE u.house_id = ?
    ORDER BY COALESCE(NULLIF(a.display_name, ''), a.label, u.username), u.username
  `).all(currentHouseId(req));
  res.json({ users });
});

app.put('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const active = req.body?.active === true ? 1 : 0;
  const user = db.prepare(`
    SELECT id, username, role, is_superadmin, active, merged_into_user_id
    FROM users WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (active && user.merged_into_user_id) {
    return res.status(409).json({ error: 'Ein zusammengefuehrtes Alt-Konto kann nicht wieder aktiviert werden.' });
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
  res.json({ ok: true, message: `${apartmentAccountLabel(user.id, user.username)} ist jetzt ${active ? 'aktiv' : 'deaktiviert'}.` });
});

app.post('/api/admin/users/:id/password-reset', requireAdmin, adminRecoveryRateLimit, async (req, res, next) => {
  const userId = Number(req.params.id);
  const user = db.prepare(`
    SELECT id, username, email, email_verified, secondary_email, secondary_email_verified, role, is_superadmin FROM users
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
    return res.status(403).json({ error: 'Hausadmins k\u00f6nnen keine Reset-Links f\u00fcr andere Admins senden.' });
  }
  try {
    const deliveryEmail = verifiedEmailForUser(user);
    const sent = await sendPasswordReset(req, user, deliveryEmail);
    if (!sent) {
      return res.status(409).json({
        error: 'F\u00fcr dieses Konto ist keine best\u00e4tigte E-Mail-Adresse oder kein E-Mail-Versand eingerichtet.'
      });
    }
    writeAudit(req, 'user.password_reset_requested', 'user', user.id);
    res.json({ ok: true, message: `Reset-Link wurde an die best\u00e4tigte Adresse von ${apartmentAccountLabel(user.id, user.username)} gesendet.` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/users/:id/recovery-code', requireAdmin, adminRecoveryRateLimit, (req, res) => {
  const userId = Number(req.params.id);
  const user = db.prepare(`
    SELECT id, username, email, email_verified, secondary_email, secondary_email_verified, role, is_superadmin,
           active, merged_into_user_id, house_id
    FROM users
    WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));
  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (user.role !== 'user' || user.is_superadmin || user.merged_into_user_id || !user.active) {
    return res.status(409).json({ error: 'Nur ein aktives, nicht zusammengefuehrtes Bewohnerkonto kann so wiederhergestellt werden.' });
  }
  if (verifiedEmailForUser(user)) {
    return res.status(409).json({ error: 'Dieses Konto besitzt eine bestaetigte E-Mail-Adresse. Bitte stattdessen einen normalen Reset-Link senden.' });
  }
  if (req.body?.confirm !== 'KONTO WIEDERHERSTELLEN') {
    return res.status(400).json({ error: 'Bitte die Wiederherstellung eindeutig bestaetigen.' });
  }

  const code = generateReadableCode('R');
  const expiresAt = Date.now() + 15 * 60 * 1000;
  db.transaction(() => {
    db.prepare('DELETE FROM account_recovery_codes WHERE user_id = ? OR CAST(expires_at AS INTEGER) <= ?')
      .run(user.id, Date.now());
    db.prepare(`
      INSERT INTO account_recovery_codes (user_id, code_hash, expires_at, created_by)
      VALUES (?, ?, ?, ?)
    `).run(user.id, tokenHash(normalizeAccessCode(code)), String(expiresAt), req.session.user.id);
  })();
  destroyUserSessions(user.id);
  writeAudit(req, 'user.recovery_code_created', 'user', user.id, { expiresAt });
  res.status(201).json({
    code,
    expiresAt,
    message: 'Wiederherstellungscode erstellt. Er ist 15 Minuten gueltig, nur einmal verwendbar und muss der berechtigten Person direkt uebergeben werden.'
  });
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
  res.json({ message: `${apartmentAccountLabel(user.id, user.username)} ist jetzt ${role === 'admin' ? 'Haus-Admin' : 'Bewohner'}.` });
});

app.put('/api/admin/users/:id/house', requireAdmin, requireSuperadmin, (req, res) => {
  const userId = Number(req.params.id);
  const houseId = Number(req.body?.houseId);
  const user = db.prepare('SELECT id, username, house_id, is_superadmin, apartment_id FROM users WHERE id = ?').get(userId);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ? AND active = 1').get(houseId);
  if (!user || !house) {
    return res.status(404).json({ error: 'Konto oder Zielhaus nicht gefunden.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Das Superadmin-Konto kann nicht verschoben werden.' });
  }
  if (user.apartment_id) {
    return res.status(409).json({ error: 'Ein Wohnungskonto bleibt bei seiner Wohnung und kann nicht in ein anderes Haus verschoben werden.' });
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
  res.json({ ok: true, message: `${apartmentAccountLabel(user.id, user.username)} wurde nach ${house.name} verschoben.` });
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

app.get('/api/admin/maintenance', requireAdmin, requireSuperadmin, (req, res) => {
  res.json({ maintenance: maintenanceStatus(), release: publicReleaseStatus() });
});

app.put('/api/admin/maintenance', requireAdmin, requireSuperadmin, async (req, res) => {
  const active = req.body?.active === true;
  const current = maintenanceStatus();

  if (active) {
    if (current.active) {
      return res.json({ maintenance: current, message: 'Der Wartungsmodus ist bereits aktiv.' });
    }
    try {
      const backup = await createVerifiedBackup();
      const maintenance = {
        active: true,
        message: 'WaschZeit wird gerade gewartet. Bitte versuche es in wenigen Minuten erneut.',
        startedAt: new Date().toISOString(),
        startedBy: req.session.user.username,
        backup,
        lastCheck: current.lastCheck || null
      };
      setSetting('maintenance_status', JSON.stringify(maintenance));
      writeAudit(req, 'maintenance.start', 'system', '', { backup: backup.filename });
      return res.json({
        maintenance,
        message: 'Backup geprueft. Wartungsmodus ist jetzt aktiv.'
      });
    } catch (error) {
      return res.status(500).json({ error: `Wartungsmodus nicht gestartet: ${error.message}` });
    }
  }

  if (!current.active) {
    return res.json({ maintenance: current, message: 'Der Wartungsmodus ist bereits beendet.' });
  }

  try {
    const lastCheck = runMaintenanceSelfCheck();
    const maintenance = {
      ...current,
      active: false,
      message: '',
      endedAt: new Date().toISOString(),
      endedBy: req.session.user.username,
      lastCheck
    };
    setSetting('maintenance_status', JSON.stringify(maintenance));
    writeAudit(req, 'maintenance.finish', 'system', '', lastCheck);
    return res.json({
      maintenance,
      message: 'System- und Buchungspruefung erfolgreich. WaschZeit ist wieder freigegeben.'
    });
  } catch (error) {
    writeAudit(req, 'maintenance.check_failed', 'system', '', { error: error.message });
    return res.status(500).json({
      error: `Wartung bleibt aktiv: ${error.message}`,
      maintenance: current
    });
  }
});

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const houseId = currentHouseId(req);
  const users = db.prepare('SELECT COUNT(*) AS count FROM users WHERE active = 1 AND house_id = ?').get(houseId).count;
  const usersMissingEmail = db.prepare(`
    SELECT COUNT(*) AS count
    FROM users
    WHERE active = 1
      AND house_id = ?
      AND role = 'user'
      AND NOT (email_verified = 1 AND email IS NOT NULL AND trim(email) != '')
      AND NOT (secondary_email_verified = 1 AND secondary_email IS NOT NULL AND trim(secondary_email) != '')
  `).get(houseId).count;
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
  const openMaintenanceCases = db.prepare(`
    SELECT COUNT(*) AS count FROM maintenance_cases WHERE house_id = ? AND status != 'closed'
  `).get(houseId).count;

  res.json({
    users,
    usersMissingEmail,
    todayBookings,
    activeResources,
    fixedBookings,
    recentReleases,
    openMaintenanceCases,
    email: emailStatus(),
    push: pushStatus(),
    maintenance: maintenanceStatus(),
    externalBackupConfigured: Boolean(String(process.env.BACKUP_UPLOAD_URL || '').trim()),
    backup: (() => {
      try { return JSON.parse(getSetting('backup_status') || 'null'); } catch { return null; }
    })()
  });
});

app.get('/api/admin/recovery-status', requireAdmin, (req, res) => {
  res.json(adminRecoveryStatus(currentHouseId(req)));
});

app.post('/api/admin/superadmin-transfer', requireAdmin, requireSuperadmin, (req, res) => {
  const targetUserId = Number(req.body?.targetUserId);
  const confirm = String(req.body?.confirm || '').trim();
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Bitte ein gueltiges Zielkonto waehlen.' });
  }
  if (confirm !== 'SUPERADMIN UEBERGEBEN') {
    return res.status(400).json({ error: 'Bitte SUPERADMIN UEBERGEBEN als Bestaetigung eingeben.' });
  }
  if (targetUserId === req.session.user.id) {
    return res.status(400).json({ error: 'Du bist bereits Superadmin.' });
  }

  const target = db.prepare(`
    SELECT id, username, role, active, house_id, is_superadmin
    FROM users
    WHERE id = ? AND house_id = ?
  `).get(targetUserId, currentHouseId(req));
  if (!target) {
    return res.status(404).json({ error: 'Zielkonto im aktuellen Haus nicht gefunden.' });
  }
  if (!target.active || target.role !== 'admin') {
    return res.status(409).json({ error: 'Die Uebergabe ist nur an ein aktives Haus-Admin-Konto moeglich.' });
  }
  if (target.is_superadmin) {
    return res.status(400).json({ error: 'Dieses Konto ist bereits Superadmin.' });
  }

  const previousSuperadminId = req.session.user.id;
  db.transaction(() => {
    db.prepare('UPDATE users SET is_superadmin = 1, role = ?, active = 1 WHERE id = ?').run('admin', target.id);
    db.prepare('UPDATE users SET is_superadmin = 0 WHERE id = ?').run(previousSuperadminId);
  })();

  writeAudit(req, 'superadmin.transfer', 'user', target.id, {
    previousSuperadminId,
    newSuperadmin: target.username
  });
  destroyUserSessions(target.id);
  destroyUserSessions(previousSuperadminId, req.sessionID);

  const ownUser = db.prepare('SELECT * FROM users WHERE id = ?').get(previousSuperadminId);
  req.session.activeHouseId = ownUser.house_id;
  req.session.user = sessionUserFromRow(ownUser);

  res.json({
    ok: true,
    message: `${target.username} ist jetzt Superadmin. Alte Sitzungen wurden erneuert.`
  });
});

app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  const houseId = currentHouseId(req);
  const days = Math.min(180, Math.max(7, Number(req.query.days || 30)));
  const since = addDays(todayStringLocal(), -days);
  const until = addDays(todayStringLocal(), days);
  const totals = db.prepare(`
    SELECT r.type, COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.house_id = ?
      AND b.booking_date BETWEEN ? AND ?
    GROUP BY r.type
  `).all(houseId, since, until);
  const bySlot = db.prepare(`
    SELECT b.slot, COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.house_id = ?
      AND b.booking_date BETWEEN ? AND ?
    GROUP BY b.slot
    ORDER BY b.slot
  `).all(houseId, since, until);
  const byResource = db.prepare(`
    SELECT r.name, r.type, COUNT(b.id) AS count
    FROM resources r
    LEFT JOIN bookings b ON b.resource_id = r.id
      AND b.booking_date BETWEEN ? AND ?
    WHERE r.house_id = ?
    GROUP BY r.id
    ORDER BY count DESC, r.name
  `).all(since, until, houseId);
  const byUser = db.prepare(`
    SELECT COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username, COUNT(b.id) AS count
    FROM users u
    LEFT JOIN apartments a ON a.id = u.apartment_id
    LEFT JOIN bookings b ON b.user_id = u.id
      AND b.booking_date BETWEEN ? AND ?
    WHERE u.house_id = ?
      AND u.active = 1
    GROUP BY u.id
    ORDER BY count DESC, COALESCE(NULLIF(a.display_name, ''), a.label, u.username)
    LIMIT 10
  `).all(since, until, houseId);
  const releases = db.prepare(`
    SELECT kind, COUNT(*) AS count
    FROM release_notices
    WHERE house_id = ?
      AND created_at >= datetime('now', ?)
    GROUP BY kind
  `).all(houseId, `-${days} days`);
  const blockedResources = db.prepare(`
    SELECT name, type, blocked_reason AS reason, blocked_at
    FROM resources
    WHERE house_id = ?
      AND active = 0
    ORDER BY name
  `).all(houseId);

  res.json({
    days,
    window: { since, until },
    totals,
    bySlot,
    byResource,
    byUser,
    releases,
    blockedResources
  });
});

app.delete('/api/admin/bookings', requireAdmin, (req, res) => {
  const confirmText = String(req.body?.confirm || '').trim();
  if (confirmText !== 'ALLE BUCHUNGEN') {
    return res.status(400).json({ error: 'Bitte zur Bestaetigung ALLE BUCHUNGEN eingeben.' });
  }
  const houseId = currentHouseId(req);
  const count = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.house_id = ?
  `).get(houseId).count;
  db.prepare(`
    DELETE FROM bookings
    WHERE id IN (
      SELECT b.id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.house_id = ?
    )
  `).run(houseId);
  writeAudit(req, 'bookings.reset', 'booking', '', { deleted: count });
  res.json({ ok: true, deleted: count, message: `${count} Buchungen wurden geloescht. Dauertermine bleiben erhalten.` });
});

app.delete('/api/admin/pilot-accounts', requireAdmin, requireSuperadmin, async (req, res, next) => {
  const confirmText = String(req.body?.confirm || '').trim();
  if (confirmText !== 'ALLE TESTKONTEN LOESCHEN') {
    return res.status(400).json({
      error: 'Bitte zur Bestaetigung ALLE TESTKONTEN LOESCHEN eingeben.'
    });
  }

  try {
    const backup = await createVerifiedBackup();
    const accounts = db.prepare(`
      SELECT id, role, apartment_id
      FROM users
      WHERE is_superadmin = 0
    `).all();
    const accountIds = accounts.map((account) => account.id);
    const apartmentLinks = accounts.filter((account) => account.apartment_id).length;
    const residents = accounts.filter((account) => account.role === 'user').length;
    const houseAdmins = accounts.filter((account) => account.role === 'admin').length;

    db.transaction(() => {
      if (accountIds.length) {
        const placeholders = accountIds.map(() => '?').join(', ');
        db.prepare(`
          DELETE FROM release_notices
          WHERE created_by IN (${placeholders})
        `).run(...accountIds);
        db.prepare(`
          UPDATE apartments
          SET claimed_by = NULL, claimed_at = NULL
          WHERE claimed_by IN (${placeholders})
        `).run(...accountIds);
        db.prepare(`
          UPDATE resources
          SET blocked_by = NULL
          WHERE blocked_by IN (${placeholders})
        `).run(...accountIds);
        db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...accountIds);
      }
    })();

    for (const accountId of accountIds) destroyUserSessions(accountId);
    writeAudit(req, 'users.pilot_reset', 'user', '', {
      deleted: accounts.length,
      residents,
      houseAdmins,
      apartmentLinks,
      backup: backup.filename
    });
    res.json({
      ok: true,
      deleted: accounts.length,
      residents,
      houseAdmins,
      apartmentLinks,
      backup,
      message: `${accounts.length} Testkonten wurden geloescht. Das Superadmin-Konto und technische Protokolle bleiben erhalten.`
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/email-test', requireAdmin, async (req, res, next) => {
  const config = smtpConfig();
  const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.session.user.id);
  const house = db.prepare('SELECT name FROM houses WHERE id = ?').get(currentHouseId(req));
  const configuredTestEmail = normalizeEmail(process.env.SMTP_TEST_TO);
  const recipient = isValidEmail(configuredTestEmail) ? configuredTestEmail : user?.email;

  if (!config.host || !config.from) {
    return res.status(409).json({ error: 'Der E-Mail-Versand ist noch nicht in Render konfiguriert.' });
  }
  if (!user || !isValidEmail(recipient)) {
    return res.status(400).json({
      error: 'Bitte SMTP_TEST_TO in Render setzen oder unter Benachrichtigungen eine gueltige E-Mail-Adresse speichern.'
    });
  }

  try {
    await sendMail({
      config,
      to: recipient,
      subject: 'WaschZeit: Testmail',
      text: [
        `Hallo ${apartmentAccountLabel(user.id, user.username)}`,
        '',
        'Der E-Mail-Versand des Waschplans funktioniert.',
        '',
        'Viele Gr\u00fcsse',
        `WaschZeit ${house?.name || ''}`.trim()
      ].join('\n')
    });
    res.json({ ok: true, message: `Testmail wurde an ${recipient} gesendet.` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/push-test', requireAdmin, async (req, res) => {
  const status = applyPushConfig(req);
  if (!status.configured) {
    return res.status(409).json({ error: 'Push ist noch nicht bereit.' });
  }
  const targetUserId = req.body?.userId === 'all' || req.body?.userId == null
    ? null
    : Number(req.body.userId);
  if (targetUserId !== null && !Number.isInteger(targetUserId)) {
    return res.status(400).json({ error: 'Ungueltiger Push-Empfaenger.' });
  }
  if (targetUserId !== null) {
    const targetUser = db.prepare(`
      SELECT id FROM users
      WHERE id = ? AND house_id = ? AND active = 1
    `).get(targetUserId, currentHouseId(req));
    if (!targetUser) {
      return res.status(404).json({ error: 'Push-Empfaenger nicht gefunden.' });
    }
  }

  const subscriptions = db.prepare(`
    SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth,
           COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.user_id
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE ps.house_id = ?
      AND ps.active = 1
      AND u.active = 1
      AND (? IS NULL OR ps.user_id = ?)
    ORDER BY username, ps.updated_at DESC
  `).all(currentHouseId(req), targetUserId, targetUserId);
  if (!subscriptions.length) {
    return res.status(409).json({ error: 'Fuer diese Auswahl ist noch kein Push-Geraet aktiviert.' });
  }

  let sent = 0;
  let failed = 0;
  const deactivate = db.prepare('UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const payload = pushPayload({
    title: 'WaschZeit: Push-Test',
    body: 'Push-Benachrichtigungen funktionieren fuer dieses Haus.',
    url: '/index.html',
    tag: 'waschzeit-test'
  });
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(subscriptionForRow(subscription), payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      if ([404, 410].includes(error.statusCode)) {
        deactivate.run(subscription.id);
      } else {
        console.error(`Push-Test fehlgeschlagen: ${error.message}`);
      }
    }
  }

  writeAudit(req, 'push.test', 'push_subscription', '', { sent, failed, targetUserId: targetUserId || 'all' });
  const targetLabel = targetUserId
    ? `an ${subscriptions[0]?.username || 'ausgewaehlte Person'}`
    : 'an alle aktiven Push-Geraete im Haus';
  res.json({ ok: true, message: `Push-Test ${targetLabel} gesendet: ${sent}. Fehler: ${failed}.`, sent, failed });
});

app.get('/api/admin/push-devices', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username,
           COUNT(ps.id) AS devices
    FROM users u
    JOIN push_subscriptions ps ON ps.user_id = u.id
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE u.house_id = ?
      AND u.active = 1
      AND ps.active = 1
    GROUP BY u.id
    ORDER BY username
  `).all(currentHouseId(req));
  const totalDevices = users.reduce((sum, user) => sum + Number(user.devices || 0), 0);
  res.json({ users, totalDevices });
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
  const code = String(req.body?.code || `HOUSE-${crypto.randomBytes(12).toString('hex')}`).trim();
  if (!isValidPlainText(name, 2, 80)) {
    return res.status(400).json({ error: 'Die Hausnummer muss 2 bis 80 Zeichen haben.' });
  }
  if (!isValidPlainText(code, 12, 80)) {
    return res.status(400).json({ error: 'Der interne Hausschluessel ist ung\u00fcltig.' });
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
  if (!isValidPlainText(name, 2, 80)) {
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
  if (!isValidPlainText(label, 2, 80)) {
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
  if (!isValidPlainText(houseCode, 12, 80)) {
    return res.status(400).json({ error: 'Hauscode muss 12 bis 80 Zeichen haben und darf keine Steuerzeichen enthalten.' });
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

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sendVersionedPage(res, filename) {
  const template = fs.readFileSync(path.join(__dirname, 'public', filename), 'utf8');
  const html = template
    .replaceAll('__WASCHZEIT_VERSION__', escapeHtmlAttribute(appVersion))
    .replaceAll('__WASCHZEIT_RELEASE__', escapeHtmlAttribute(appRelease))
    .replaceAll('__WASCHZEIT_RELEASED_AT__', escapeHtmlAttribute(appReleasedAt));
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(html);
}

app.get('/index.html', (req, res) => sendVersionedPage(res, 'index.html'));
app.get('/login.html', (req, res) => sendVersionedPage(res, 'login.html'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'Die Anfrage ist zu gross.' });
  }
  if (err instanceof SyntaxError && err?.status === 400 && Object.hasOwn(err, 'body')) {
    return res.status(400).json({ error: 'Die Anfrage enthaelt ungueltiges JSON.' });
  }
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
