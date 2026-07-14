const fs = require('fs');
const net = require('net');
const path = require('path');
const tls = require('tls');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, 'data', 'washraum.sqlite'));
const dbDir = path.dirname(dbPath);

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

app.use(express.json());
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

function initDb() {
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

  ensureColumn('users', 'active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'email', 'TEXT');
  ensureColumn('users', 'notify_releases', 'INTEGER NOT NULL DEFAULT 1');
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL AND email != ''");
  seedUser('admin', 'admin123', 'admin');
  seedUser('user', 'user123', 'user');
  seedResource('Waschmaschine 1', 'washer');
  seedResource('Waschmaschine 2', 'washer');
  seedResource('Waschmaschine 3', 'washer');
  seedResource('Trockenraum 1', 'drying_room');
  seedResource('Trockenraum 2', 'drying_room');
  seedResource('Trockenraum 3', 'drying_room');
  seedResource('Tumbler 1', 'tumbler');
  seedResource('Tumbler 2', 'tumbler');
  seedSetting('house_code', process.env.HOUSE_CODE || 'GBMZ Maneggplatz 18');
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

initDb();

const slots = [
  '07:00-12:00',
  '12:00-17:00',
  '17:00-21:00'
];

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
    return 'Der naechste Waschslot kann fruehestens am bestehenden Waschtag reserviert werden.';
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
    return 'Trockenraeume koennen nur passend zu deiner Waschmaschinen-Buchung reserviert werden: 07:00 bis 21:00, 12:00 bis Folgetag 12:00, 17:00 bis Folgetag 12:00.';
  }

  return '';
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur fuer Admins erlaubt' });
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
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
        subject: `Waschplan: ${booking.resource_name} frueher frei`,
        text: [
          `Hallo ${recipient.username}`,
          '',
          message,
          '',
          `Du kannst den Slot jetzt im Waschplan ansehen und buchen: ${appUrl}`,
          '',
          'Viele Gruesse',
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

app.get('/health', (req, res) => {
  res.json({ ok: true, dbPath });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const loginName = normalizeEmail(username);
  const user = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?')
    .get(loginName, loginName);

  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Login fehlgeschlagen' });
  }
  if (!user.active) {
    return res.status(403).json({ error: 'Dieses Konto ist deaktiviert' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email || '',
    notifyReleases: Boolean(user.notify_releases)
  };
  res.json({ user: req.session.user });
});

app.post('/api/register', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const houseCode = String(req.body?.houseCode || '').trim();
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const configuredCode = getSetting('house_code').trim();

  if (username.length < 3) {
    return res.status(400).json({ error: 'Benutzername muss mindestens 3 Zeichen haben' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse eintragen' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
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
    return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse eintragen' });
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
    return res.status(400).json({ error: 'Ungueltige Buchungsdaten' });
  }
  if (isPastDate(date)) {
    return res.status(400).json({ error: 'Buchungen in der Vergangenheit sind nicht erlaubt' });
  }
  if (isPastSlot(date, slot)) {
    return res.status(400).json({ error: 'Dieser Slot liegt bereits in der Vergangenheit' });
  }
  if (isSunday(date)) {
    return res.status(400).json({ error: 'Sonntags sind keine Buchungen moeglich' });
  }

  const resource = db.prepare('SELECT id, type FROM resources WHERE id = ? AND active = 1').get(Number(resourceId));
  if (!resource) {
    return res.status(404).json({ error: 'Geraet nicht gefunden' });
  }

  const fixedConflict = fixedBookingConflict(resource.id, date, slot);
  if (fixedConflict) {
    return res.status(409).json({
      error: `${fixedConflict.resource_name} ist in diesem Slot fest fuer ${fixedConflict.label} reserviert.`
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
    return res.status(403).json({ error: 'Diese Buchung gehoert dir nicht' });
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
  res.json({ ok: true, message: 'Buchung geloescht.' });
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
      return res.status(403).json({ error: 'Diese Buchung gehoert dir nicht' });
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
    return res.status(400).json({ error: 'Ungueltige feste Buchung' });
  }
  if (label.length < 2) {
    return res.status(400).json({ error: 'Bitte einen Namen oder Hinweis eintragen' });
  }

  const resource = db.prepare('SELECT id FROM resources WHERE id = ? AND active = 1').get(resourceId);
  if (!resource) {
    return res.status(404).json({ error: 'Geraet nicht gefunden' });
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
    return res.status(409).json({ error: 'Es gibt bereits eine normale zukuenftige Buchung in diesem Dauer-Slot. Bitte zuerst klaeren oder loeschen.' });
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
      return res.status(409).json({ error: 'Fuer dieses Geraet gibt es an diesem Wochentag und Slot bereits eine feste Buchung.' });
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
  if (houseCode.length < 4) {
    return res.status(400).json({ error: 'Hauscode muss mindestens 4 Zeichen haben' });
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
