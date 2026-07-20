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
const QRCode = require('qrcode');
const webPush = require('web-push');
const packageInfo = require('./package.json');
const { releaseWindowStatus } = require('./release-window');
const { createAccountRouters } = require('./src/routes/accounts');
const { createDiaperGameRouter } = require('./src/routes/diaper-game');
const { createBookingRouters } = require('./src/routes/bookings');
const { createEquipmentLogbookRouter } = require('./src/routes/equipment-logbook');
const { createHouseRoleRouters } = require('./src/routes/houses-roles');
const { createNotificationRouters } = require('./src/routes/notifications');
const { createOperationsRouters } = require('./src/routes/operations');
const { createBackupService } = require('./src/services/backup');
const { createAccountSecurity } = require('./src/services/account-security');
const { createAccountService } = require('./src/services/account-service');
const { createBookingRules } = require('./src/services/booking-rules');
const { createMailTransport } = require('./src/services/mail-transport');
const { createNotificationService } = require('./src/services/notifications');
const { createOperationsService } = require('./src/services/operations');
const { createPushService } = require('./src/services/push');
const { createRoleContext } = require('./src/services/role-context');
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
const allowTestInvitationLink = !isProduction && process.env.ALLOW_TEST_INVITATION_LINK === 'true';
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
      apartment_id INTEGER,
      code_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_house_roles (
      user_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('house_admin')),
      granted_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, house_id, role),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS diaper_game_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      started_at_ms INTEGER NOT NULL,
      expires_at_ms INTEGER NOT NULL,
      completed_at_ms INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diaper_game_scores (
      user_id INTEGER PRIMARY KEY,
      house_id INTEGER,
      best_time_ms INTEGER NOT NULL CHECK (best_time_ms BETWEEN 600 AND 120000),
      achieved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_diaper_game_scores_best
      ON diaper_game_scores(best_time_ms, achieved_at);
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
  ensureColumn('device_pairing_codes', 'apartment_id', 'INTEGER');
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
  db.exec('DROP INDEX IF EXISTS idx_users_apartment_unique');
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartments_house ON apartments (house_id, active, label)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartment_invitations_apartment ON apartment_invitations (apartment_id, created_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartment_invitations_email ON apartment_invitations (lower(email), expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_maintenance_cases_house_status ON maintenance_cases (house_id, status, updated_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_maintenance_cases_resource ON maintenance_cases (resource_id, status)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_one_open_case_per_resource ON maintenance_cases (resource_id) WHERE status != 'closed' AND resource_id IS NOT NULL");
  db.exec("CREATE INDEX IF NOT EXISTS idx_maintenance_entries_case ON maintenance_entries (case_id, created_at, id)");
  db.prepare("UPDATE apartments SET display_name = label WHERE display_name IS NULL OR trim(display_name) = ''").run();
  db.exec("CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON device_pairing_codes (user_id, expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_pairing_codes_apartment ON device_pairing_codes (apartment_id, expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_user_house_roles_house ON user_house_roles (house_id, role, user_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_account_recovery_user ON account_recovery_codes (user_id, expires_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_apartment_name_requests ON apartment_name_requests (apartment_id, status, created_at)");
  const initialHouseCode = getSetting('house_code').trim()
    || process.env.HOUSE_CODE
    || (isProduction ? `GBMZ-${crypto.randomBytes(5).toString('hex')}` : 'GBMZ Maneggplatz 18');
  const defaultHouse = seedHouse(process.env.HOUSE_NAME || 'Maneggplatz 18', initialHouseCode);
  db.prepare('UPDATE users SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare('UPDATE resources SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare('UPDATE release_notices SET house_id = ? WHERE house_id IS NULL').run(defaultHouse.id);
  db.prepare(`
    INSERT OR IGNORE INTO user_house_roles (user_id, house_id, role, granted_by)
    SELECT id, house_id, 'house_admin', NULL
    FROM users
    WHERE role = 'admin' AND house_id IS NOT NULL
  `).run();

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
  if (role === 'admin') {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    db.prepare(`
      INSERT OR IGNORE INTO user_house_roles (user_id, house_id, role, granted_by)
      VALUES (?, ?, 'house_admin', NULL)
    `).run(user.id, houseId);
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

const {
  maintenanceStatus,
  publicReleaseStatus,
  runMaintenanceSelfCheck,
  runScheduledBackup,
  cleanupExpiredData
} = createOperationsService({
  db,
  crypto,
  getSetting,
  setSetting,
  createVerifiedBackup: (...args) => createVerifiedBackup(...args),
  appVersion,
  appRelease,
  appReleasedAt
});

const {
  isBcryptHash,
  verifyStoredPassword,
  authRateLimit,
  registrationRateLimit,
  recoveryRateLimit,
  adminRecoveryRateLimit,
  clearAuthRateLimit,
  normalizeEmail,
  isValidEmail,
  verifiedEmailForUser,
  normalizeAccessCode,
  generateReadableCode,
  isValidUsername,
  isValidPassword
} = createAccountSecurity({ bcrypt, crypto });

initDb();

const activeAdminAtStartup = db.prepare(`
  SELECT u.id
  FROM users u
  LEFT JOIN user_house_roles uhr ON uhr.user_id = u.id AND uhr.role = 'house_admin'
  WHERE u.active = 1 AND (u.is_superadmin = 1 OR uhr.user_id IS NOT NULL)
  LIMIT 1
`).get();
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

const bookingRules = createBookingRules({
  db,
  slots,
  addDays,
  weekdayForDate,
  releaseWindowStatus,
  todayStringLocal,
  isDateString,
  isPastSwissDate,
  isPastSwissSlot
});

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
  if (!req.session.user.canBook && !allowLegacyHouseRegistration) {
    return res.status(409).json({
      code: 'APARTMENT_SETUP_REQUIRED',
      error: 'Fuer Buchungen braucht dein persoenlicher Zugang eine Wohnungszuordnung im aktuell ausgewaehlten Haus.'
    });
  }
  next();
}

function requireResident(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  const legacyResident = allowLegacyHouseRegistration && req.session.user.role === 'user';
  if (!req.session.user.canBook && !legacyResident) {
    return res.status(403).json({
      error: 'Normale Waschzeiten werden mit einem aktiven Wohnungskonto gebucht. Nutze als Admin den Kalender zur Kontrolle.'
    });
  }
  next();
}

const {
  currentHouseId,
  isSuperadmin,
  hasHouseRole,
  bookingUserIdForApartment,
  sessionUserFromRow,
  adminRecoveryStatus
} = createRoleContext({ db, env: process.env });

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.canManage) {
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

function confirmCurrentAdminPassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || '');
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ? AND active = 1')
    .get(req.session.user?.id);
  if (!currentPassword || !user || !verifyStoredPassword(currentPassword, user.password_hash)) {
    res.status(403).json({ error: 'Zur Bestaetigung ist dein aktuelles Passwort erforderlich.' });
    return false;
  }
  return true;
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

function publicAppUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (configured) {
    return configured;
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
}

const { emailStatus, smtpConfig, extractEmailAddress, sendMail } = createMailTransport({
  net,
  tls,
  env: process.env
});

const {
  pushStatus,
  applyPushConfig,
  pushPayload,
  subscriptionForRow,
  releaseNoticeUrl,
  notifyPushSubscribers,
  sendPushNotification
} = createPushService({
  db,
  webPush,
  env: process.env,
  getSetting,
  setSetting,
  smtpConfig,
  extractEmailAddress,
  publicAppUrl,
  weekdayForDate
});

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

const {
  findEmailOwner,
  apartmentForCode,
  apartmentInvitationForToken,
  pendingInvitationForEmail,
  issueApartmentInvitation,
  apartmentAccountLabel,
  apartmentAccountUsername,
  personalAccountUsername,
  regenerateSession,
  destroyUserSessions
} = createAccountService({
  db,
  crypto,
  allowTestInvitationLink,
  normalizeEmail,
  normalizeAccessCode,
  tokenHash,
  smtpConfig,
  sendMail,
  publicAppUrl
});

const {
  sendEmailVerification,
  sendPasswordReset,
  notifyReleaseSubscribers,
  notifyReleaseChannels
} = createNotificationService({
  db,
  crypto,
  smtpConfig,
  sendMail,
  isValidEmail,
  normalizeEmail,
  tokenHash,
  publicAppUrl,
  apartmentAccountLabel,
  weekdayForDate,
  notifyPushSubscribers,
  releaseNoticeUrl
});


const { backupDirectory, createVerifiedBackup } = createBackupService({
  db,
  Database,
  fs,
  path,
  env: process.env,
  dbDir,
  setSetting,
  fetchImpl: fetch
});

const operationsRouters = createOperationsRouters({
  express,
  db,
  fs,
  path,
  os,
  crypto,
  env: process.env,
  dbPath,
  appVersion,
  appRelease,
  requireAdmin,
  requireSuperadmin,
  currentHouseId,
  isSuperadmin,
  writeAudit,
  maintenanceStatus,
  publicReleaseStatus,
  createVerifiedBackup,
  runMaintenanceSelfCheck,
  confirmCurrentAdminPassword,
  emailStatus,
  pushStatus,
  getSetting,
  setSetting,
  todayStringLocal,
  addDays,
  destroyUserSessions
});
app.use(operationsRouters.publicRouter);

const accountRouters = createAccountRouters({
  express,
  db,
  bcrypt,
  QRCode,
  allowLegacyHouseRegistration,
  sessionIdleTimeoutMs,
  sessionWarningMs,
  authRateLimit,
  registrationRateLimit,
  recoveryRateLimit,
  clearAuthRateLimit,
  normalizeEmail,
  isValidEmail,
  verifiedEmailForUser,
  normalizeAccessCode,
  generateReadableCode,
  isValidUsername,
  isValidPassword,
  isBcryptHash,
  verifyStoredPassword,
  findEmailOwner,
  apartmentForCode,
  apartmentInvitationForToken,
  apartmentAccountUsername,
  personalAccountUsername,
  regenerateSession,
  destroyUserSessions,
  requireAuth,
  requireApartmentAccount,
  currentHouseId,
  isSuperadmin,
  hasHouseRole,
  sessionUserFromRow,
  clearSessionCookie,
  tokenHash,
  sendEmailVerification,
  sendPasswordReset,
  writeAudit,
  writeAuditForHouse,
  pushStatus,
  isValidPlainText,
  publicAppUrl
});
app.use(accountRouters.primaryRouter);

app.use(createDiaperGameRouter({ db, requireAuth, tokenHash }));

const notificationRouters = createNotificationRouters({
  db,
  env: process.env,
  requireAuth,
  requireAdmin,
  currentHouseId,
  slots,
  normalizeEmail,
  isValidEmail,
  findEmailOwner,
  emailStatus,
  sendEmailVerification,
  pushStatus,
  smtpConfig,
  sendMail,
  apartmentAccountLabel,
  applyPushConfig,
  pushPayload,
  subscriptionForRow,
  sendPushNotification,
  writeAudit,
  releaseWindowStatus
});
app.use(notificationRouters.pushRouter);

const houseRoleRouters = createHouseRoleRouters({
  express,
  db,
  crypto,
  allowLegacyHouseRegistration,
  allowTestInvitationLink,
  requireAuth,
  requireAdmin,
  requireSuperadmin,
  adminRecoveryRateLimit,
  currentHouseId,
  isSuperadmin,
  hasHouseRole,
  sessionUserFromRow,
  adminRecoveryStatus,
  normalizeEmail,
  isValidEmail,
  verifiedEmailForUser,
  normalizeAccessCode,
  generateReadableCode,
  findEmailOwner,
  pendingInvitationForEmail,
  issueApartmentInvitation,
  apartmentAccountLabel,
  destroyUserSessions,
  tokenHash,
  smtpConfig,
  sendPasswordReset,
  writeAudit,
  confirmCurrentAdminPassword,
  isValidPlainText,
  todayStringLocal,
  seedHouseResources
});
app.use(houseRoleRouters.activeHouseRouter);

const bookingRouters = createBookingRouters({
  db,
  crypto,
  slots,
  addDays,
  isDateString,
  todayStringLocal,
  releaseWindowStatus,
  requireAuth,
  requireResident,
  requireApartmentAccount,
  requireAdmin,
  currentHouseId,
  notifyReleaseChannels,
  emailStatus,
  pushStatus,
  writeAudit,
  isValidPlainText,
  confirmCurrentAdminPassword,
  bookingRules
});
app.use(bookingRouters.preferencesRouter);

app.use(notificationRouters.preferencesRouter);

app.use(accountRouters.personalRouter);

app.use(bookingRouters.planningRouter);

app.use(createEquipmentLogbookRouter({
  db,
  requireAuth,
  requireResident,
  requireApartmentAccount,
  requireAdmin,
  currentHouseId,
  isSuperadmin,
  isValidPlainText,
  isValidMaintenanceText,
  writeAudit,
  writeAuditForHouse
}));

app.use(bookingRouters.bookingsRouter);

app.use(notificationRouters.noticesRouter);

app.use(houseRoleRouters.accountsRouter);

app.use(operationsRouters.adminRouter);

app.use(houseRoleRouters.recoveryRouter);

app.use(operationsRouters.analyticsRouter);

app.use(bookingRouters.adminResetRouter);

app.use(operationsRouters.pilotRouter);

app.use(notificationRouters.adminRouter);

app.use(houseRoleRouters.housesRouter);

app.use(bookingRouters.fixedBookingsRouter);

app.use(houseRoleRouters.houseCodeRouter);

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
