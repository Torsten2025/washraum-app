const assert = require('assert/strict');
process.env.ALLOW_LEGACY_HOUSE_REGISTRATION = 'true';
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { releaseWindowStatus } = require('../release-window');
const { resolveAppEnvironment } = require('../src/services/app-environment');
const { isDateString, isPastSwissSlot, swissDateString } = require('../swiss-time');
const {
  buildPuzzle,
  buildRankedPuzzle,
  buildDistinctPracticePuzzle,
  puzzleSignature,
  resultVariantForPuzzle,
  moduleAnswerIsCorrect,
  publicModule
} = require('../src/routes/diaper-game');
const { createNotificationService } = require('../src/services/notifications');
const { isValidEmail, normalizeEmail } = require('../src/services/email-verification');

function answerForDiaperModule(module) {
  if (module.type === 'wire') return { choice: module.targetId };
  if (module.type === 'signal') return { sequence: module.sequence };
  if (module.type === 'valve') return { position: (module.safeStart + module.safeEnd) / 2 };
  if (module.type === 'code') return { code: module.answer };
  if (module.type === 'temperature') return { value: module.target };
  if (module.type === 'leak') return { zone: module.leakZone };
  if (module.type === 'circuit') return { path: module.path };
  if (module.type === 'locks') return { positions: module.targets };
  throw new Error(`Unbekanntes Spielmodul: ${module.type}`);
}

const diaperModuleSamples = new Map();
for (let seed = 0; seed < 80 && diaperModuleSamples.size < 8; seed += 1) {
  for (const module of buildPuzzle(`app-test-${seed}`).modules) diaperModuleSamples.set(module.type, module);
}
assert.deepEqual([...diaperModuleSamples.keys()].sort(), ['circuit', 'code', 'leak', 'locks', 'signal', 'temperature', 'valve', 'wire']);
for (const module of diaperModuleSamples.values()) {
  assert.equal(moduleAnswerIsCorrect(module, answerForDiaperModule(module)), true);
  assert.equal(moduleAnswerIsCorrect(module, { invalid: true }), false);
  const publicShape = publicModule(module);
  if (module.type === 'wire') assert.equal('targetId' in publicShape, false);
  if (module.type === 'code') assert.equal('answer' in publicShape, false);
  if (module.type === 'leak') assert.equal('leakZone' in publicShape, false);
}

const port = 33000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `waschplan-test-${process.pid}.sqlite`);
const serverOutput = [];

class ApiClient {
  constructor() {
    this.cookie = '';
  }

  async request(urlPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) {
      headers.Cookie = this.cookie;
    }
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${baseUrl}${urlPath}`, { ...options, headers });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookie = setCookie.split(';', 1)[0];
    }
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : Buffer.from(await response.arrayBuffer());
    return { response, body };
  }
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextWeekday(weekday) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const distance = ((weekday - date.getDay() + 7) % 7) || 7;
  date.setDate(date.getDate() + distance);
  return dateString(date);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateString(date);
}

function currentSwissReleaseSlot() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  const dateValue = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number(parts.hour);
  if (hour < 7 || hour >= 21) return null;
  if (hour < 12) return { date: dateValue, slot: '07:00-12:00' };
  if (hour < 17) return { date: dateValue, slot: '12:00-17:00' };
  return { date: dateValue, slot: '17:00-21:00' };
}

async function expectStatus(client, urlPath, status, options = {}) {
  const result = await client.request(urlPath, options);
  assert.equal(result.response.status, status, `${options.method || 'GET'} ${urlPath}: ${JSON.stringify(result.body)}`);
  return result;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Testserver nicht erreichbar.\n${serverOutput.join('')}`);
}

async function verifyProductionRecoveryStartup() {
  const recoveryRoot = path.join(os.tmpdir(), `waschplan-production-target-${process.pid}`);
  const recoveryDatabasePath = path.join(recoveryRoot, 'blocked.sqlite');
  const recoveryOutput = [];
  const recoveryServer = spawn(process.execPath, ['startup.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      APP_ENV: '',
      PORT: '0',
      DB_PATH: recoveryDatabasePath,
      SEED_ADMIN_FORCE_PASSWORD_RESET: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  recoveryServer.stdout.on('data', (chunk) => recoveryOutput.push(chunk.toString()));
  recoveryServer.stderr.on('data', (chunk) => recoveryOutput.push(chunk.toString()));

  try {
    await Promise.race([
      new Promise((resolve) => recoveryServer.once('exit', resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Produktions-Zielguard hat nicht beendet.')), 5000))
    ]);
    assert.notEqual(recoveryServer.exitCode, 0);
    assert.equal(recoveryOutput.join('').trim(), 'WASCHZEIT_STARTFAIL class=GUARD_PRODUCTION');
    assert.equal(fs.existsSync(recoveryRoot), false);
  } finally {
    if (recoveryServer.exitCode === null) {
      recoveryServer.kill();
      await new Promise((resolve) => recoveryServer.once('exit', resolve));
    }
    fs.rmSync(recoveryRoot, { recursive: true, force: true });
  }
}

const rankedDayOne = buildRankedPuzzle('2026-08-10');
assert.deepEqual(buildRankedPuzzle('2026-08-10'), rankedDayOne);
assert.notEqual(puzzleSignature(buildRankedPuzzle('2026-08-11')), puzzleSignature(rankedDayOne));
const firstPractice = buildDistinctPracticePuzzle(() => 'practice-seed-one');
let practiceCounter = 0;
const nextPractice = buildDistinctPracticePuzzle(
  () => `practice-seed-${++practiceCounter}`,
  firstPractice.puzzle
);
assert.notEqual(puzzleSignature(nextPractice.puzzle), puzzleSignature(firstPractice.puzzle));
assert.notEqual(resultVariantForPuzzle(nextPractice.puzzle), resultVariantForPuzzle(firstPractice.puzzle));

async function verifyProductionMaintenanceMigrationGate() {
  const migrationPort = port + 3;
  const migrationDatabasePath = path.join(os.tmpdir(), `waschplan-migration-gate-${process.pid}.sqlite`);
  const commonEnv = {
    ...process.env,
    PORT: String(migrationPort),
    DB_PATH: migrationDatabasePath,
    HOUSE_CODE: 'Migration Gate 18',
    SEED_ADMIN_NAME: 'migration-admin',
    SEED_ADMIN_PASSWORD: 'Migration-Admin-2026!',
    SESSION_SECRET: 'migration-gate-session-secret-at-least-32-characters',
    BACKUP_ENABLED: 'false',
    EMAIL_ENABLED: 'false',
    PUSH_ENABLED: 'false'
  };
  const initializerOutput = [];
  const initializer = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...commonEnv, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  initializer.stdout.on('data', (chunk) => initializerOutput.push(chunk.toString()));
  initializer.stderr.on('data', (chunk) => initializerOutput.push(chunk.toString()));

  try {
    let initialized = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${migrationPort}/api/health`);
        if (response.ok) {
          initialized = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(initialized, true, initializerOutput.join(''));
  } finally {
    if (initializer.exitCode === null) {
      initializer.kill();
      await new Promise((resolve) => initializer.once('exit', resolve));
    }
  }

  const fixtureDb = new Database(migrationDatabasePath);
  const fixture = fixtureDb.prepare(`
    SELECT u.id AS user_id, r.id AS resource_id, r.house_id
    FROM users u JOIN resources r ON r.house_id = u.house_id
    WHERE u.role = 'user' ORDER BY r.id LIMIT 1
  `).get();
  assert.ok(fixture);
  fixtureDb.prepare(`
    INSERT INTO maintenance_cases
      (house_id, resource_id, reported_by, title, description, status)
    VALUES (?, ?, ?, 'PRODUCTION-GATE-PRIVATE', 'PRODUCTION-GATE-CONTACT', 'reported')
  `).run(fixture.house_id, fixture.resource_id, fixture.user_id);
  fixtureDb.prepare("DELETE FROM settings WHERE key = 'maintenance_reports_v1_migrated'").run();
  fixtureDb.close();

  const blockedOutput = [];
  const blocked = spawn(process.execPath, ['startup.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...commonEnv, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  blocked.stdout.on('data', (chunk) => blockedOutput.push(chunk.toString()));
  blocked.stderr.on('data', (chunk) => blockedOutput.push(chunk.toString()));
  try {
    await Promise.race([
      new Promise((resolve) => blocked.once('exit', resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Migration gate process did not stop.')), 5000))
    ]);
    assert.notEqual(blocked.exitCode, 0);
    const startupDiagnostic = blockedOutput.join('').trim();
    assert.equal(startupDiagnostic, 'WASCHZEIT_STARTFAIL class=GUARD_PRODUCTION');
    assert.doesNotMatch(startupDiagnostic, /PRODUCTION-GATE|Error:|\sat\s|\\|\/[^/]/);
    await assert.rejects(fetch(`http://127.0.0.1:${migrationPort}/api/health`));
    const unchangedDb = new Database(migrationDatabasePath, { readonly: true });
    assert.equal(
      unchangedDb.prepare("SELECT title FROM maintenance_cases WHERE title = 'PRODUCTION-GATE-PRIVATE'").get().title,
      'PRODUCTION-GATE-PRIVATE'
    );
    assert.equal(
      unchangedDb.prepare("SELECT value FROM settings WHERE key = 'maintenance_reports_v1_migrated'").get(),
      undefined
    );
    unchangedDb.close();
  } finally {
    if (blocked.exitCode === null) {
      blocked.kill();
      await new Promise((resolve) => blocked.once('exit', resolve));
    }
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${migrationDatabasePath}${suffix}`, { force: true });
    }
  }
}

async function verifyEmailVerificationBindingMigration() {
  const migrationPort = port + 4;
  const migrationDatabasePath = path.join(os.tmpdir(), `waschplan-email-binding-${process.pid}.sqlite`);
  const commonEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(migrationPort),
    DB_PATH: migrationDatabasePath,
    HOUSE_CODE: 'Email Binding Gate',
    SEED_ADMIN_NAME: 'email-binding-admin',
    SEED_ADMIN_PASSWORD: 'Email-Binding-Admin-2026!',
    SESSION_SECRET: 'email-binding-session-secret-at-least-32-characters',
    BACKUP_ENABLED: 'false',
    EMAIL_ENABLED: 'false',
    PUSH_ENABLED: 'false'
  };

  async function runServerToHealth() {
    const output = [];
    const child = spawn(process.execPath, ['server.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: commonEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    try {
      let healthy = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
          const response = await fetch(`http://127.0.0.1:${migrationPort}/api/health`);
          if (response.ok) {
            healthy = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(healthy, true, output.join(''));
    } finally {
      if (child.exitCode === null) {
        child.kill();
        await new Promise((resolve) => child.once('exit', resolve));
      }
    }
  }

  try {
    await runServerToHealth();
    const fixtureDb = new Database(migrationDatabasePath);
    fixtureDb.prepare(`
      UPDATE users
      SET email = 'legacy-primary@example.test', email_verified = 1,
          email_verified_value = NULL,
          secondary_email = 'legacy-secondary@example.test', secondary_email_verified = 1,
          secondary_email_verified_value = 'old-secondary@example.test'
      WHERE username = 'email-binding-admin'
    `).run();
    fixtureDb.close();

    await runServerToHealth();
    const migratedDb = new Database(migrationDatabasePath, { readonly: true });
    const migrated = migratedDb.prepare(`
      SELECT email, email_verified, email_verified_value,
             secondary_email, secondary_email_verified, secondary_email_verified_value
      FROM users WHERE username = 'email-binding-admin'
    `).get();
    migratedDb.close();
    assert.equal(migrated.email, 'legacy-primary@example.test');
    assert.equal(migrated.email_verified, 0);
    assert.equal(migrated.email_verified_value, null);
    assert.equal(migrated.secondary_email, 'legacy-secondary@example.test');
    assert.equal(migrated.secondary_email_verified, 0);
    assert.equal(migrated.secondary_email_verified_value, null);
  } finally {
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${migrationDatabasePath}${suffix}`, { force: true });
    }
  }
}

async function verifyReleaseEmailRecipientRevalidation() {
  const fixtureDb = new Database(':memory:');
  fixtureDb.exec(`
    CREATE TABLE apartments (
      id INTEGER PRIMARY KEY,
      label TEXT,
      display_name TEXT
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      active INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      apartment_id INTEGER,
      notify_releases INTEGER NOT NULL,
      language TEXT NOT NULL,
      email TEXT,
      email_verified INTEGER NOT NULL,
      email_verified_value TEXT,
      secondary_email TEXT,
      secondary_email_verified INTEGER NOT NULL,
      secondary_email_verified_value TEXT
    );
    CREATE TABLE notification_preferences (
      user_id INTEGER PRIMARY KEY,
      resource_type TEXT,
      weekday INTEGER,
      slot TEXT
    );
  `);
  const insertUser = fixtureDb.prepare(`
    INSERT INTO users
      (id, username, active, house_id, notify_releases, language,
       email, email_verified, email_verified_value,
       secondary_email_verified)
    VALUES (?, ?, 1, 1, 1, 'de', ?, 1, ?, 0)
  `);
  for (let id = 1; id <= 13; id += 1) {
    const username = `recipient-${String(id).padStart(2, '0')}`;
    const email = `${username}@example.test`;
    insertUser.run(id, username, email, email);
    fixtureDb.prepare(`
      INSERT INTO notification_preferences (user_id, resource_type, weekday, slot)
      VALUES (?, 'all', NULL, NULL)
    `).run(id);
  }

  const providerPayloads = [];
  let mutated = false;
  const service = createNotificationService({
    db: fixtureDb,
    crypto,
    smtpConfig: () => ({ host: 'local-sink', from: 'local@example.test' }),
    sendMail: async (payload) => {
      providerPayloads.push(payload);
      if (!mutated) {
        mutated = true;
        fixtureDb.transaction(() => {
          fixtureDb.prepare("UPDATE users SET email = 'changed-06@example.test' WHERE id = 6").run();
          fixtureDb.prepare('UPDATE users SET email = NULL WHERE id = 7').run();
          fixtureDb.prepare('UPDATE users SET active = 0 WHERE id = 8').run();
          fixtureDb.prepare('UPDATE users SET house_id = 2 WHERE id = 9').run();
          fixtureDb.prepare('UPDATE users SET notify_releases = 0 WHERE id = 10').run();
          fixtureDb.prepare("UPDATE users SET email_verified_value = 'drift-11@example.test' WHERE id = 11").run();
          fixtureDb.prepare('DELETE FROM users WHERE id = 12').run();
        })();
      }
    },
    isValidEmail,
    normalizeEmail,
    tokenHash: (value) => value,
    publicAppUrl: () => 'http://127.0.0.1',
    apartmentAccountLabel: (_id, username) => username,
    weekdayForDate: () => 2,
    notifyPushSubscribers: async () => ({ configured: false, sent: 0 }),
    releaseNoticeUrl: () => '/index.html'
  });

  try {
    const result = await service.notifyReleaseSubscribers({}, {
      house_id: 1,
      user_id: 999,
      resource_type: 'washer',
      resource_name: 'Waschmaschine Test',
      booking_date: '2026-08-11',
      slot: '07:00-12:00',
      house_name: 'Synthetisches Haus'
    }, 'Ein Zeitfenster ist frei.');
    assert.equal(result.configured, true);
    assert.equal(result.sent, 6);
    assert.deepEqual(providerPayloads.map((payload) => payload.to), [
      'recipient-01@example.test',
      'recipient-02@example.test',
      'recipient-03@example.test',
      'recipient-04@example.test',
      'recipient-05@example.test',
      'recipient-13@example.test'
    ]);
    const providerOutput = JSON.stringify(providerPayloads);
    for (let id = 6; id <= 12; id += 1) {
      assert.equal(providerOutput.includes(`recipient-${String(id).padStart(2, '0')}@example.test`), false);
    }
    assert.equal(providerOutput.includes('changed-06@example.test'), false);
    assert.equal(providerOutput.includes('drift-11@example.test'), false);
  } finally {
    fixtureDb.close();
  }
}

async function verifySmtpDelivery() {
  const messages = [];
  const smtpServer = net.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 local.test ESMTP\r\n');
    let buffer = '';
    let dataMode = false;

    socket.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.length) {
        if (dataMode) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          const message = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          dataMode = false;
          const containsBareLineFeed = /(^|[^\r])\n/.test(message);
          const containsOverlongLine = message
            .split('\r\n')
            .some((line) => Buffer.byteLength(line, 'utf8') > 998);
          if (containsBareLineFeed || containsOverlongLine) {
            socket.write('550 invalid SMTP data line framing or length\r\n');
          } else {
            messages.push(message);
            socket.write('250 queued\r\n');
          }
          continue;
        }
        const end = buffer.indexOf('\r\n');
        if (end < 0) return;
        const command = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (/^EHLO /i.test(command)) socket.write('250-local.test\r\n250 SIZE 20000000\r\n');
        else if (/^(MAIL FROM|RCPT TO):/i.test(command)) socket.write('250 OK\r\n');
        else if (/^DATA$/i.test(command)) {
          dataMode = true;
          socket.write('354 End data\r\n');
        } else if (/^QUIT$/i.test(command)) {
          socket.write('221 Bye\r\n');
          socket.end();
        } else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve) => smtpServer.listen(0, '127.0.0.1', resolve));
  const smtpPort = smtpServer.address().port;
  const appPort = port + 2;
  const smtpDatabasePath = path.join(os.tmpdir(), `waschplan-smtp-${process.pid}.sqlite`);
  const smtpOutput = [];
  const smtpApp = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(appPort),
      DB_PATH: smtpDatabasePath,
      HOUSE_CODE: 'SMTP Testhaus',
      SEED_ADMIN_NAME: 'smtp-admin',
      SEED_ADMIN_PASSWORD: 'SMTP-Admin-2026!',
      SESSION_SECRET: 'smtp-integration-secret-at-least-32-characters',
      PUBLIC_APP_URL: `http://127.0.0.1:${appPort}`,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SMTP_FROM: 'waschplan@local.test',
      SMTP_SECURE: 'false',
      SMTP_TEST_TO: 'smtp-test-target@example.com'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  smtpApp.stdout.on('data', (chunk) => smtpOutput.push(chunk.toString()));
  smtpApp.stderr.on('data', (chunk) => smtpOutput.push(chunk.toString()));

  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${appPort}/api/health`);
        if (response.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const registration = await fetch(`http://127.0.0.1:${appPort}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'SMTP Person',
        email: 'smtp-person@example.com',
        password: 'SMTP-Person-2026!',
        houseCode: 'SMTP Testhaus',
        notifyReleases: true
      })
    });
    assert.equal(registration.status, 201, smtpOutput.join(''));
    const registrationBody = await registration.json();
    assert.equal(registrationBody.verification.sent, true);
    assert.ok(messages[0].includes('Subject: WaschZeit:'));
    assert.ok(messages[0].includes('/api/email-verification/confirm?token='));
    const verificationLink = messages[0].match(/http:\/\/[^\s]+\/api\/email-verification\/confirm\?token=[a-f0-9]+/)[0];
    const verification = await fetch(verificationLink, { redirect: 'manual' });
    assert.equal(verification.status, 302);
    const verifiedDatabase = new Database(smtpDatabasePath, { readonly: true });
    const verifiedAccount = verifiedDatabase.prepare(`
      SELECT email_verified, email_verified_value
      FROM users WHERE email = 'smtp-person@example.com'
    `).get();
    verifiedDatabase.close();
    assert.deepEqual(verifiedAccount, {
      email_verified: 1,
      email_verified_value: 'smtp-person@example.com'
    });

    const resetRequest = await fetch(`http://127.0.0.1:${appPort}/api/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smtp-person@example.com' })
    });
    assert.equal(resetRequest.status, 200);
    assert.ok(messages[1].includes('Subject: WaschZeit:'));
    assert.ok(messages[1].includes('/reset.html?token='));
    const resetToken = messages[1].match(/reset\.html\?token=([a-f0-9]+)/)[1];
    const resetConfirm = await fetch(`http://127.0.0.1:${appPort}/api/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'SMTP-Neu-2026!' })
    });
    assert.equal(resetConfirm.status, 200);

    const smtpResidentLogin = await fetch(`http://127.0.0.1:${appPort}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smtp-person@example.com', password: 'SMTP-Neu-2026!' })
    });
    assert.equal(smtpResidentLogin.status, 200);
    const smtpResidentCookie = String(smtpResidentLogin.headers.get('set-cookie') || '').split(';')[0];

    const smtpAdminLogin = await fetch(`http://127.0.0.1:${appPort}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'smtp-admin', password: 'SMTP-Admin-2026!' })
    });
    assert.equal(smtpAdminLogin.status, 200);
    const smtpAdminCookie = String(smtpAdminLogin.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(smtpAdminCookie.includes('connect.sid='));

    const adminEmailTest = await fetch(`http://127.0.0.1:${appPort}/api/admin/email-test`, {
      method: 'POST',
      headers: { Cookie: smtpAdminCookie }
    });
    assert.equal(adminEmailTest.status, 200);
    assert.ok(messages[2].includes('To: smtp-test-target@example.com'));
    assert.ok(messages[2].includes('Subject: WaschZeit: Testmail'));

    const adminResetRequest = await fetch(
      `http://127.0.0.1:${appPort}/api/admin/users/${registrationBody.user.id}/password-reset`,
      { method: 'POST', headers: { Cookie: smtpAdminCookie } }
    );
    assert.equal(adminResetRequest.status, 200);
    assert.ok(messages[3].includes('Subject: WaschZeit:'));
    assert.ok(messages[3].includes('/reset.html?token='));

    const resourcesResponse = await fetch(`http://127.0.0.1:${appPort}/api/resources`, {
      headers: { Cookie: smtpAdminCookie }
    });
    assert.equal(resourcesResponse.status, 200);
    const smtpWasher = (await resourcesResponse.json()).resources.find((resource) => resource.type === 'washer');
    assert.ok(smtpWasher);

    const smtpBookingDate = addDays(nextWeekday(1), 14);
    const smtpBooking = await fetch(`http://127.0.0.1:${appPort}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: smtpResidentCookie },
      body: JSON.stringify({ resourceId: smtpWasher.id, date: smtpBookingDate, slot: '07:00-12:00' })
    });
    assert.equal(smtpBooking.status, 201);
    const smtpBookingBody = await smtpBooking.json();

    const releaseMail = await fetch(`http://127.0.0.1:${appPort}/api/bookings/${smtpBookingBody.id}/cancel-notify`, {
      method: 'POST',
      headers: { Cookie: smtpResidentCookie }
    });
    assert.equal(releaseMail.status, 200);
    const releaseMailBody = await releaseMail.json();
    assert.equal(releaseMailBody.releaseNoticeCreated, true);
    assert.equal(releaseMailBody.emailNotifications.configured, true);
    assert.equal(releaseMailBody.emailNotifications.sent, 0);
    assert.equal(messages.length, 4);

    const invitationResponse = await fetch(`http://127.0.0.1:${appPort}/api/admin/apartments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: smtpAdminCookie },
      body: JSON.stringify({
        label: 'SMTP 2. OG links',
        displayName: 'SMTP Einladung',
        email: 'smtp-einladung@example.com'
      })
    });
    assert.equal(invitationResponse.status, 201);
    const invitationBody = await invitationResponse.json();
    assert.equal(invitationBody.invitation.emailSent, true);
    assert.equal(Object.hasOwn(invitationBody, 'invitationLink'), false);
    assert.equal(messages.length, 5);
    assert.ok(messages[4].includes('To: smtp-einladung@example.com'));
    assert.ok(messages[4].includes('Subject: WaschZeit: Einladung'));
    assert.ok(messages[4].includes('/login.html?invite='));
    assert.equal(/(^|[^\r])\n/.test(messages[4]), false);
    assert.equal(
      messages[4].split('\r\n').every((line) => Buffer.byteLength(line, 'utf8') <= 998),
      true
    );
    const invitationToken = messages[4].match(/login\.html\?invite=([a-f0-9]{64})/)[1];
    const acceptedInvitation = await fetch(`http://127.0.0.1:${appPort}/api/invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: invitationToken, password: 'SMTP-Einladung-2026!' })
    });
    assert.equal(acceptedInvitation.status, 201);
    assert.equal((await acceptedInvitation.json()).user.emailVerified, true);
  } finally {
    if (smtpApp.exitCode === null) {
      smtpApp.kill();
      await new Promise((resolve) => smtpApp.once('exit', resolve));
    }
    await new Promise((resolve) => smtpServer.close(resolve));
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${smtpDatabasePath}${suffix}`, { force: true });
  }
}

function verifyReleaseWindow() {
  const beforeStart = releaseWindowStatus(
    '2026-07-14',
    '07:00-12:00',
    new Date('2026-07-14T04:30:00Z')
  );
  const duringSlot = releaseWindowStatus(
    '2026-07-14',
    '07:00-12:00',
    new Date('2026-07-14T06:30:00Z')
  );
  const alreadyEnded = releaseWindowStatus(
    '2026-07-14',
    '07:00-12:00',
    new Date('2026-07-14T10:00:00Z')
  );

  assert.equal(beforeStart.eligible, false);
  assert.equal(beforeStart.reason, 'not_started');
  assert.equal(duringSlot.eligible, true);
  assert.equal(duringSlot.reason, 'eligible');
  assert.equal(alreadyEnded.eligible, false);
  assert.equal(alreadyEnded.reason, 'ended');

  assert.equal(swissDateString(new Date('2026-07-14T22:30:00Z')), '2026-07-15');
  assert.equal(isPastSwissSlot('2026-07-14', '17:00-21:00', new Date('2026-07-14T18:59:00Z')), false);
  assert.equal(isPastSwissSlot('2026-07-14', '17:00-21:00', new Date('2026-07-14T19:00:00Z')), true);
  assert.equal(isDateString('2026-02-29'), false);
  assert.equal(isDateString('2028-02-29'), true);
}

async function run() {
  verifyReleaseWindow();
  await verifyReleaseEmailRecipientRevalidation();
  for (const value of [undefined, '', 'unknown', 'staging', 'agent-test', 'PRODUCTION ']) {
    const environment = resolveAppEnvironment({ NODE_ENV: value === 'PRODUCTION ' ? 'development' : 'production', APP_ENV: value });
    assert.deepEqual(environment, { environment: 'test', displayName: 'WaschZeit Test' });
  }
  assert.deepEqual(
    resolveAppEnvironment({ NODE_ENV: 'production', APP_ENV: ' production ' }),
    { environment: 'production', displayName: 'WaschZeit' }
  );
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      HOUSE_CODE: 'Testhaus 18',
      SEED_ADMIN_NAME: 'admin',
      SEED_ADMIN_PASSWORD: 'Admin-Test-2026!',
      SESSION_SECRET: 'integration-test-session-secret-at-least-32-characters',
      SESSION_IDLE_MINUTES: '30'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
  server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

  try {
    await waitForServer();
    const guest = new ApiClient();
    const user = new ApiClient();
    const admin = new ApiClient();
    const bookingDate = addDays(nextWeekday(1), 14);
    const secondWashDate = addDays(bookingDate, 1);
    const fixedDate = nextWeekday(6);

    const health = await expectStatus(guest, '/api/health', 200);
    assert.equal(health.body.ok, true);
    assert.equal(health.body.storage, 'local');
    assert.equal(health.body.adminReady, true);
    assert.equal(health.body.version, '0.3.4');
    assert.equal(health.body.environment, 'test');
    assert.equal(health.body.appName, 'WaschZeit Test');
    assert.equal(health.body.maintenanceMode, false);
    assert.ok(health.response.headers.get('content-security-policy'));
    assert.equal(health.response.headers.get('x-content-type-options'), 'nosniff');
    const versionStatus = await expectStatus(guest, '/api/version', 200);
    assert.equal(versionStatus.body.version, '0.3.4');
    assert.equal(versionStatus.body.environment, 'test');
    assert.equal(versionStatus.body.appName, 'WaschZeit Test');
    assert.equal(versionStatus.body.maintenance.active, false);
    await expectStatus(guest, '/api/login', 403, {
      method: 'POST',
      headers: { Origin: 'https://example.invalid' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' })
    });
    await expectStatus(guest, `/api/bookings?date=${bookingDate}`, 401);
    await expectStatus(guest, '/api/remaining-slots/options', 401);

    await expectStatus(guest, '/api/register', 400, {
      method: 'POST',
      body: JSON.stringify({
        username: '<script>alert(1)</script>',
        email: 'bad-name@example.com',
        password: 'Bewohner-2026!',
        houseCode: 'Testhaus 18'
      })
    });
    await expectStatus(guest, '/api/register', 400, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Ohne Mail',
        password: 'Bewohner-2026!',
        houseCode: 'Testhaus 18'
      })
    });

    const registration = await expectStatus(user, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Bewohner Test',
        email: 'bewohner-test@example.com',
        password: 'Bewohner-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: true
      })
    });
    assert.equal(registration.body.user.username, 'Bewohner Test');
    await expectStatus(user, '/api/remaining-slots/options', 403);
    await expectStatus(new ApiClient(), '/api/login', 401, {
      method: 'POST',
      body: JSON.stringify({ username: 'Bewohner Test', password: 'Bewohner-2026!' })
    });

    const sessionDatabase = new Database(databasePath);
    const storedSession = sessionDatabase.prepare('SELECT sid, sess FROM sessions').all()
      .map((row) => ({ ...row, data: JSON.parse(row.sess) }))
      .find((row) => row.data.user?.id === registration.body.user.id);
    assert.ok(storedSession, 'Registrierungssitzung wurde nicht gespeichert.');
    storedSession.data.user = {
      id: registration.body.user.id,
      username: registration.body.user.username,
      role: registration.body.user.role,
      email: registration.body.user.email,
      notifyReleases: registration.body.user.notifyReleases
    };
    delete storedSession.data.activeHouseId;
    sessionDatabase.prepare('UPDATE sessions SET sess = ? WHERE sid = ?')
      .run(JSON.stringify(storedSession.data), storedSession.sid);
    sessionDatabase.close();

    const hydratedSession = await expectStatus(user, '/api/me', 200);
    assert.equal(hydratedSession.body.user.houseName, 'Maneggplatz 18');
    assert.ok(hydratedSession.body.user.activeHouseId);
    assert.equal(hydratedSession.body.user.bookingMode, 'time');
    assert.equal(hydratedSession.body.user.apartmentSetupRequired, true);
    assert.equal(hydratedSession.body.session.idleTimeoutMs, 30 * 60 * 1000);
    assert.equal(hydratedSession.body.session.warningMs, 2 * 60 * 1000);
    assert.ok(hydratedSession.body.session.lastActivityAt);
    const keepalive = await expectStatus(user, '/api/session/keepalive', 200, { method: 'POST' });
    assert.equal(keepalive.body.session.idleTimeoutMs, 30 * 60 * 1000);

    const idleClient = new ApiClient();
    await expectStatus(idleClient, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-2026!' })
    });
    const signedSessionValue = decodeURIComponent(idleClient.cookie.split('=', 2)[1] || '');
    const idleSessionId = signedSessionValue.replace(/^s:/, '').split('.')[0];
    assert.ok(idleSessionId, 'Sitzungskennung fuer Inaktivitaetstest fehlt.');
    const idleSessionDatabase = new Database(databasePath);
    const idleSession = idleSessionDatabase.prepare('SELECT sess FROM sessions WHERE sid = ?').get(idleSessionId);
    assert.ok(idleSession, 'Zweite Sitzung wurde nicht gespeichert.');
    const idleSessionData = JSON.parse(idleSession.sess);
    idleSessionData.lastActivityAt = Date.now() - (31 * 60 * 1000);
    idleSessionDatabase.prepare('UPDATE sessions SET sess = ? WHERE sid = ?')
      .run(JSON.stringify(idleSessionData), idleSessionId);
    idleSessionDatabase.close();
    const expiredSession = await expectStatus(idleClient, '/api/me', 401);
    assert.equal(expiredSession.body.code, 'SESSION_IDLE_TIMEOUT');
    assert.match(expiredSession.response.headers.get('set-cookie') || '', /connect\.sid=;/);
    const expiredGuest = await expectStatus(idleClient, '/api/me', 200);
    assert.equal(expiredGuest.body.user, null);

    const stalePageClient = new ApiClient();
    await expectStatus(stalePageClient, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-2026!' })
    });
    const staleSignedSession = decodeURIComponent(stalePageClient.cookie.split('=', 2)[1] || '');
    const staleSessionId = staleSignedSession.replace(/^s:/, '').split('.')[0];
    const staleSessionDatabase = new Database(databasePath);
    const staleSession = staleSessionDatabase.prepare('SELECT sess FROM sessions WHERE sid = ?').get(staleSessionId);
    assert.ok(staleSession, 'Sitzung fuer den Loginseiten-Regressionstest fehlt.');
    const staleSessionData = JSON.parse(staleSession.sess);
    staleSessionData.lastActivityAt = Date.now() - (31 * 60 * 1000);
    staleSessionDatabase.prepare('UPDATE sessions SET sess = ? WHERE sid = ?')
      .run(JSON.stringify(staleSessionData), staleSessionId);
    staleSessionDatabase.close();
    const staleLoginPage = await expectStatus(stalePageClient, '/login.html', 200);
    assert.match(staleLoginPage.body.toString('utf8'), /WaschZeit/);

    const bookingMode = await expectStatus(user, '/api/me/booking-mode', 200, {
      method: 'PUT',
      body: JSON.stringify({ bookingMode: 'machine' })
    });
    assert.equal(bookingMode.body.user.bookingMode, 'machine');
    await expectStatus(user, '/api/me/booking-mode', 400, {
      method: 'PUT',
      body: JSON.stringify({ bookingMode: 'ungueltig' })
    });
    const persistedBookingMode = await expectStatus(user, '/api/me', 200);
    assert.equal(persistedBookingMode.body.user.bookingMode, 'machine');
    const preferences = await expectStatus(user, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: 'bewohner-test@example.com',
        secondaryEmail: 'bewohner-zweit@example.com',
        notifyReleases: true,
        resourceType: 'drying_room',
        weekday: 2,
        slot: '12:00-17:00'
      })
    });
    assert.equal(preferences.body.notificationPreferences.resourceType, 'drying_room');
    assert.equal(preferences.body.user.secondaryEmail, 'bewohner-zweit@example.com');
    const preferencesMe = await expectStatus(user, '/api/me', 200);
    assert.equal(preferencesMe.body.notificationPreferences.weekday, 2);
    assert.equal(preferencesMe.body.push.available, true);
    const pushKey = await expectStatus(user, '/api/push/public-key', 200);
    assert.equal(pushKey.body.configured, true);
    assert.ok(pushKey.body.publicKey.length > 40);
    const pushEndpoint = `https://push.example.test/${crypto.randomUUID()}`;
    await expectStatus(user, '/api/push/subscriptions', 201, {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: pushEndpoint,
          keys: {
            p256dh: Buffer.from(crypto.randomBytes(65)).toString('base64url'),
            auth: Buffer.from(crypto.randomBytes(16)).toString('base64url')
          }
        }
      })
    });
    const pushMe = await expectStatus(user, '/api/me', 200);
    assert.equal(pushMe.body.push.activeSubscriptions, 1);
    await expectStatus(user, '/api/push/subscriptions', 200, {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: pushEndpoint })
    });
    const pushMeAfterDelete = await expectStatus(user, '/api/me', 200);
    assert.equal(pushMeAfterDelete.body.push.activeSubscriptions, 0);
    await expectStatus(user, '/api/push/subscriptions', 201, {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: `${pushEndpoint}-active`,
          keys: {
            p256dh: Buffer.from(crypto.randomBytes(65)).toString('base64url'),
            auth: Buffer.from(crypto.randomBytes(16)).toString('base64url')
          }
        }
      })
    });
    const exportResult = await expectStatus(user, '/api/me/export', 200);
    assert.equal(exportResult.body.account.username, 'Bewohner Test');
    assert.equal(exportResult.body.account.booking_mode, 'machine');

    const recoveryClient = new ApiClient();
    const recoveryRegistration = await expectStatus(recoveryClient, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Passwort Hilfe',
        email: 'passwort-hilfe@example.com',
        password: 'Passwort-Alt-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetDatabase = new Database(databasePath);
    resetDatabase.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(
      recoveryRegistration.body.user.id,
      crypto.createHash('sha256').update(resetToken).digest('hex'),
      String(Date.now() + 60000)
    );
    resetDatabase.close();
    await expectStatus(recoveryClient, '/api/password-reset/confirm', 200, {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword: 'Passwort-Neu-2026!' })
    });
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'passwort-hilfe@example.com', password: 'Passwort-Neu-2026!' })
    });

    const deleteClient = new ApiClient();
    await expectStatus(deleteClient, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Konto Loeschen',
        email: 'konto-loeschen@example.com',
        password: 'Konto-Loeschen-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    await expectStatus(deleteClient, '/api/me', 403, {
      method: 'DELETE',
      body: JSON.stringify({ password: 'falsch' })
    });
    await expectStatus(deleteClient, '/api/me', 200, {
      method: 'DELETE',
      body: JSON.stringify({ password: 'Konto-Loeschen-2026!' })
    });

    const resourcesResult = await expectStatus(user, '/api/resources', 200);
    const resources = resourcesResult.body.resources;
    const washers = resources.filter((item) => item.type === 'washer');
    const dryingRooms = resources.filter((item) => item.type === 'drying_room');
    const tumblers = resources.filter((item) => item.type === 'tumbler');
    assert.equal(washers.length, 3);
    assert.equal(dryingRooms.length, 3);
    assert.equal(tumblers.length, 2);

    const concurrentUsers = [new ApiClient(), new ApiClient()];
    for (let index = 0; index < concurrentUsers.length; index += 1) {
      await expectStatus(concurrentUsers[index], '/api/register', 201, {
        method: 'POST',
        body: JSON.stringify({
          username: `Parallel ${index + 1}`,
          email: `parallel-${index + 1}@example.com`,
          password: `Parallel-${index + 1}-2026!`,
          houseCode: 'Testhaus 18',
          notifyReleases: false
        })
      });
    }
    const concurrencyDate = addDays(nextWeekday(3), 35);
    const concurrentResults = await Promise.all(concurrentUsers.map((client) => client.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[0].id, date: concurrencyDate, slot: '12:00-17:00' })
    })));
    assert.deepEqual(concurrentResults.map((result) => result.response.status).sort(), [201, 409]);

    const packageUser = new ApiClient();
    await expectStatus(packageUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Test',
        email: 'paket-test@example.com',
        password: 'Paket-Test-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const packageRecommendation = await expectStatus(packageUser, '/api/recommendation', 200);
    assert.equal(packageRecommendation.body.recommendation.kind, 'package');
    const guidedDate = packageRecommendation.body.recommendation.date;
    const guidedSlot = packageRecommendation.body.recommendation.slot;
    const guidedWashers = await expectStatus(
      packageUser,
      `/api/booking-options?date=${guidedDate}`,
      200
    );
    assert.equal(guidedWashers.body.companions, null);
    assert.equal(guidedWashers.body.slots.length, 3);
    const guidedWasherSlot = guidedWashers.body.slots.find((item) => item.slot === guidedSlot);
    assert.ok(guidedWasherSlot);
    assert.equal(guidedWasherSlot.washers.length, 3);
    assert.ok(guidedWasherSlot.dryingRoomCount >= 1);
    assert.ok(guidedWasherSlot.tumblerCount >= 1);
    const guidedCompanions = await expectStatus(
      packageUser,
      `/api/booking-options?date=${guidedDate}&slot=${encodeURIComponent(guidedSlot)}`,
      200
    );
    assert.ok(guidedCompanions.body.companions.dryingRooms.length >= 1);
    assert.ok(guidedCompanions.body.companions.dryingRooms[0].bookingOptions.length >= 1);
    assert.ok(guidedCompanions.body.companions.tumblers.length >= 1);
    await expectStatus(packageUser, '/api/booking-options?date=ungueltig', 400);
    await expectStatus(packageUser, `/api/booking-options?date=${guidedDate}&slot=00:00-01:00`, 400);
    const washerPackageComponents = packageRecommendation.body.recommendation.components
      .filter((component) => component.type === 'washer');
    assert.equal(washerPackageComponents.length, 3);
    assert.equal(washerPackageComponents.filter((component) => component.required).length, 1);
    const packageRuleDatabase = new Database(databasePath);
    const packageHouse = packageRuleDatabase.prepare('SELECT house_id FROM resources WHERE id = ?')
      .get(washerPackageComponents[0].bookings[0].resourceId);
    const fourthWasher = packageRuleDatabase.prepare(`
      INSERT INTO resources (name, type, house_id) VALUES ('Waschmaschine 4 Test', 'washer', ?)
    `).run(packageHouse.house_id);
    packageRuleDatabase.close();
    const fourWasherItems = [
      ...washerPackageComponents.flatMap((component) => component.bookings),
      {
        resourceId: Number(fourthWasher.lastInsertRowid),
        date: packageRecommendation.body.recommendation.date,
        slot: packageRecommendation.body.recommendation.slot
      }
    ];
    await expectStatus(packageUser, '/api/booking-package', 400, {
      method: 'POST',
      body: JSON.stringify({ items: fourWasherItems })
    });
    const packageRuleCleanup = new Database(databasePath);
    packageRuleCleanup.prepare('DELETE FROM resources WHERE id = ?').run(Number(fourthWasher.lastInsertRowid));
    packageRuleCleanup.close();
    const recommendedDryingRoom = packageRecommendation.body.recommendation.components
      .find((component) => component.type === 'drying_room');
    const optionalTumbler = packageRecommendation.body.recommendation.components
      .find((component) => component.type === 'tumbler');
    assert.ok(recommendedDryingRoom);
    assert.equal(recommendedDryingRoom.selectedByDefault, true);
    assert.equal(recommendedDryingRoom.recommendationLabel, 'Empfohlen');
    assert.ok(recommendedDryingRoom.bookingOptions.length >= 1);
    const selectedDryingOption = recommendedDryingRoom.bookingOptions
      .find((option) => option.id === recommendedDryingRoom.selectedOption)
      || recommendedDryingRoom.bookingOptions.at(-1);
    assert.ok(selectedDryingOption);
    if (optionalTumbler) {
      assert.equal(optionalTumbler.selectedByDefault, true);
      assert.equal(optionalTumbler.recommendationLabel, 'Ausgew\u00e4hlt');
    }
    const selectedPackageComponents = packageRecommendation.body.recommendation.components.filter((component) => (
      component.type === 'washer' || component.required || component.selectedByDefault
    ));
    const selectedPackageItems = selectedPackageComponents.flatMap((component) => (
      component.type === 'drying_room'
        ? selectedDryingOption.bookings
        : component.bookings
    ));
    assert.ok(selectedPackageComponents.length >= 2);
    const packageBooking = await expectStatus(packageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({ items: selectedPackageItems })
    });
    assert.equal(packageBooking.body.created.filter((item) => item.type === 'washer').length, 3);
    assert.ok(packageBooking.body.created.some((item) => item.type === 'drying_room'));
    assert.ok(packageBooking.body.created.some((item) => item.type === 'tumbler'));
    const packageUserBookings = await expectStatus(packageUser, '/api/my-bookings', 200);
    assert.equal(packageUserBookings.body.bookings.length, packageBooking.body.created.length);
    assert.ok(packageBooking.body.groupId);
    assert.ok(packageUserBookings.body.bookings.every((booking) => booking.group_id === packageBooking.body.groupId));
    const guidedSupplement = await expectStatus(
      packageUser,
      `/api/booking-options?date=${guidedDate}`,
      200
    );
    assert.equal(guidedSupplement.body.existingWashers.length, 3);
    assert.equal(guidedSupplement.body.existingWashers[0].slot, guidedSlot);

    const bookedTumbler = packageBooking.body.created.find((item) => item.type === 'tumbler');
    assert.ok(bookedTumbler);
    await expectStatus(packageUser, `/api/bookings/${bookedTumbler.id}`, 200, { method: 'DELETE' });
    const packageSupplement = await expectStatus(packageUser, '/api/recommendation', 200);
    assert.equal(packageSupplement.body.recommendation.kind, 'package');
    assert.ok(packageSupplement.body.recommendation.washerBookingId);
    const supplementItems = packageSupplement.body.recommendation.components
      .filter((component) => !component.required)
      .flatMap((component) => component.bookings);
    assert.ok(supplementItems.length > 0);
    await expectStatus(packageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({
        washerBookingId: packageSupplement.body.recommendation.washerBookingId,
        items: supplementItems
      })
    });
    await expectStatus(packageUser, `/api/booking-groups/${packageBooking.body.groupId}`, 200, { method: 'DELETE' });
    const deletedPackageBookings = await expectStatus(packageUser, '/api/my-bookings', 200);
    assert.equal(deletedPackageBookings.body.bookings.length, 0);

    const cancelPackageUser = new ApiClient();
    await expectStatus(cancelPackageUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Absage',
        email: 'paket-absage@example.com',
        password: 'Paket-Absage-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const cancelRecommendation = await expectStatus(cancelPackageUser, '/api/recommendation', 200);
    const cancelItems = cancelRecommendation.body.recommendation.components
      .filter((component) => component.required || component.selectedByDefault)
      .flatMap((component) => component.bookings);
    const cancellablePackage = await expectStatus(cancelPackageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({ items: cancelItems })
    });
    const packageCancellation = await expectStatus(
      cancelPackageUser,
      `/api/booking-groups/${cancellablePackage.body.groupId}/cancel-notify`,
      200,
      { method: 'POST' }
    );
    assert.equal(packageCancellation.body.releaseNoticeCreated, true);
    assert.equal(packageCancellation.body.deleted, cancellablePackage.body.created.length);

    const smartPackageUser = new ApiClient();
    await expectStatus(smartPackageUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Auswahl',
        email: 'paket-auswahl@example.com',
        password: 'Paket-Auswahl-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const firstSmartRecommendation = await expectStatus(smartPackageUser, '/api/recommendation', 200);
    const firstSmartDryingRoom = firstSmartRecommendation.body.recommendation.components
      .find((component) => component.type === 'drying_room');
    assert.ok(firstSmartDryingRoom);

    const rankingDatabase = new Database(databasePath);
    const occupyDryingRoom = rankingDatabase.prepare(`
      INSERT OR IGNORE INTO bookings (user_id, resource_id, booking_date, slot)
      VALUES (?, ?, ?, ?)
    `);
    for (const room of dryingRooms) {
      for (const booking of firstSmartDryingRoom.bookings) {
        occupyDryingRoom.run(registration.body.user.id, room.id, booking.date, booking.slot);
      }
    }
    rankingDatabase.close();

    const smarterRecommendation = await expectStatus(smartPackageUser, '/api/recommendation', 200);
    const smarterDryingRoom = smarterRecommendation.body.recommendation.components
      .find((component) => component.type === 'drying_room');
    assert.ok(smarterDryingRoom, 'Eine nahe Kombination mit Trockenraum soll vor einem reinen Tumbler-Paket stehen.');
    assert.notEqual(
      `${smarterRecommendation.body.recommendation.date}|${smarterRecommendation.body.recommendation.slot}`,
      `${firstSmartRecommendation.body.recommendation.date}|${firstSmartRecommendation.body.recommendation.slot}`
    );

    const rollbackUser = new ApiClient();
    await expectStatus(rollbackUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Rollback',
        email: 'paket-rollback@example.com',
        password: 'Paket-Rollback-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const rollbackRecommendation = await expectStatus(rollbackUser, '/api/recommendation', 200);
    assert.equal(rollbackRecommendation.body.recommendation.kind, 'package');
    const invalidPackageItems = rollbackRecommendation.body.recommendation.components
      .filter((component) => component.required || component.selectedByDefault)
      .flatMap((component) => component.bookings)
      .map((item) => ({ ...item }));
    const companionIndex = invalidPackageItems.findIndex((item, index) => index > 0);
    assert.ok(companionIndex > 0);
    invalidPackageItems[companionIndex].date = addDays(invalidPackageItems[companionIndex].date, 5);
    await expectStatus(rollbackUser, '/api/booking-package', 400, {
      method: 'POST',
      body: JSON.stringify({ items: invalidPackageItems })
    });
    const rollbackBookings = await expectStatus(rollbackUser, '/api/my-bookings', 200);
    assert.equal(rollbackBookings.body.bookings.length, 0);

    const firstWasher = await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[1].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[2].id, date: bookingDate, slot: '12:00-17:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[2].id, date: secondWashDate, slot: '07:00-12:00' })
    });

    await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: dryingRooms[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: dryingRooms[1].id, date: bookingDate, slot: '07:00-12:00' })
    });
    const tumblerBooking = await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: tumblers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: tumblers[1].id, date: bookingDate, slot: '07:00-12:00' })
    });

    const calendar = await expectStatus(user, `/api/calendar?from=${bookingDate}&days=7`, 200);
    assert.equal(calendar.body.days.length, 7);
    assert.ok(calendar.body.days[0].ownBookings >= 4);
    assert.equal(typeof calendar.body.days[0].availability.washer.freeSlots, 'number');
    assert.equal(calendar.body.days[0].slotDetails.length, 3);
    const bookedCalendarSlot = calendar.body.days[0].slotDetails
      .find((item) => item.slot === '07:00-12:00');
    assert.ok(bookedCalendarSlot);
    assert.ok(bookedCalendarSlot.types.washer.resources.some((resource) => resource.state === 'own'));
    assert.equal(bookedCalendarSlot.types.tumbler.free, 0);
    assert.ok(bookedCalendarSlot.types.tumbler.resources.some((resource) => resource.state === 'own'));
    assert.ok(bookedCalendarSlot.types.tumbler.resources.some((resource) => resource.state === 'reserve'));
    const monthCalendar = await expectStatus(user, `/api/calendar?from=${bookingDate}&days=42`, 200);
    assert.equal(monthCalendar.body.days.length, 42);
    const closedSunday = monthCalendar.body.days.find((day) => (
      new Date(`${day.date}T12:00:00Z`).getUTCDay() === 0
    ));
    assert.ok(closedSunday);
    assert.equal(closedSunday.closed, true);
    assert.ok(Object.values(closedSunday.availability).every((item) => item.freeSlots === 0));
    await expectStatus(user, `/api/calendar?from=${bookingDate}&days=43`, 400);
    const recommendation = await expectStatus(user, '/api/recommendation', 200);
    assert.ok(recommendation.body.recommendation.title);

    const noticesBeforeEarlyRelease = await expectStatus(user, '/api/release-notices', 200);
    const tumblerNoticesBefore = noticesBeforeEarlyRelease.body.notices
      .filter((notice) => notice.resource_name === 'Tumbler 1').length;
    const earlyRelease = await expectStatus(user, `/api/bookings/${tumblerBooking.body.id}/release`, 200, { method: 'POST' });
    assert.equal(earlyRelease.body.releaseNoticeCreated, false);
    assert.equal(earlyRelease.body.emailNotifications.sent, 0);
    assert.equal(earlyRelease.body.emailNotifications.skipped, true);
    const notices = await expectStatus(user, '/api/release-notices', 200);
    assert.equal(
      notices.body.notices.filter((notice) => notice.resource_name === 'Tumbler 1').length,
      tumblerNoticesBefore
    );

    const cancellationBooking = await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: tumblers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    const upcomingBookings = await expectStatus(user, '/api/my-bookings', 200);
    const cancellableBooking = upcomingBookings.body.bookings.find((booking) => booking.id === cancellationBooking.body.id);
    assert.equal(cancellableBooking.releaseEligible, false);
    assert.equal(cancellableBooking.cancellationNoticeEligible, true);
    const cancellation = await expectStatus(
      user,
      `/api/bookings/${cancellationBooking.body.id}/cancel-notify`,
      200,
      { method: 'POST' }
    );
    assert.equal(cancellation.body.releaseNoticeCreated, true);
    assert.ok(cancellation.body.message.includes('abgesagt'));
    assert.ok(cancellation.body.message.includes('Bewohner Test'));
    const ownCancellationNotices = await expectStatus(user, '/api/release-notices', 200);
    assert.ok(!ownCancellationNotices.body.notices.some((notice) => (
      notice.resource_name === 'Tumbler 1'
      && notice.kind === 'cancellation'
      && notice.created_by_name === 'Bewohner Test'
    )));

    const disabledCancellationNotices = await expectStatus(packageUser, '/api/release-notices', 200);
    assert.deepEqual(disabledCancellationNotices.body.notices, []);
    await expectStatus(packageUser, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: 'paket-test@example.com',
        secondaryEmail: '',
        notifyReleases: true,
        resourceType: 'washer',
        weekday: '',
        slot: ''
      })
    });
    const mismatchedCancellationNotices = await expectStatus(packageUser, '/api/release-notices', 200);
    assert.ok(!mismatchedCancellationNotices.body.notices.some((notice) => (
      notice.resource_name === 'Tumbler 1'
      && notice.kind === 'cancellation'
      && notice.created_by_name === 'Bewohner Test'
    )));
    await expectStatus(packageUser, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: 'paket-test@example.com',
        secondaryEmail: '',
        notifyReleases: true,
        resourceType: 'tumbler',
        weekday: new Date(`${bookingDate}T12:00:00Z`).getUTCDay(),
        slot: '07:00-12:00'
      })
    });
    const cancellationNotices = await expectStatus(packageUser, '/api/release-notices', 200);
    const cancellationNotice = cancellationNotices.body.notices.find((notice) => (
      notice.resource_name === 'Tumbler 1'
      && notice.kind === 'cancellation'
      && notice.created_by_name === 'Bewohner Test'
    ));
    assert.ok(cancellationNotice);
    assert.equal(cancellationNotice.created_by_name, 'Bewohner Test');
    assert.equal(cancellationNotice.resource_id, tumblers[0].id);
    assert.equal(cancellationNotice.bookable, true);
    assert.equal(cancellationNotice.alreadyBooked, false);
    const noticeDetail = await expectStatus(user, `/api/release-notices/${cancellationNotice.id}`, 200);
    assert.equal(noticeDetail.body.notice.id, cancellationNotice.id);
    assert.equal(noticeDetail.body.notice.created_by_name, 'Bewohner Test');
    assert.equal(noticeDetail.body.notice.resource_id, tumblers[0].id);

    const nearTerm = currentSwissReleaseSlot();
    if (nearTerm) {
      const testDatabase = new Database(databasePath);
      const nearTermBooking = testDatabase.prepare(`
        INSERT INTO bookings (user_id, resource_id, booking_date, slot)
        VALUES (?, ?, ?, ?)
      `).run(registration.body.user.id, tumblers[1].id, nearTerm.date, nearTerm.slot);
      testDatabase.close();
      await expectStatus(
        user,
        `/api/bookings/${nearTermBooking.lastInsertRowid}/cancel-notify`,
        409,
        { method: 'POST' }
      );
      const timelyRelease = await expectStatus(
        user,
        `/api/bookings/${nearTermBooking.lastInsertRowid}/release`,
        200,
        { method: 'POST' }
      );
      assert.equal(timelyRelease.body.releaseNoticeCreated, true);
      assert.ok(timelyRelease.body.message.includes('Bewohner Test'));
      await expectStatus(packageUser, '/api/me/notifications', 200, {
        method: 'PUT',
        body: JSON.stringify({
          email: 'paket-test@example.com',
          secondaryEmail: '',
          notifyReleases: true,
          resourceType: 'tumbler',
          weekday: new Date(`${nearTerm.date}T12:00:00Z`).getUTCDay(),
          slot: nearTerm.slot
        })
      });
      const timelyNotices = await expectStatus(packageUser, '/api/release-notices', 200);
      const timelyNotice = timelyNotices.body.notices.find((notice) => notice.resource_name === 'Tumbler 2');
      assert.ok(timelyNotice);
      assert.equal(timelyNotice.created_by_name, 'Bewohner Test');
      assert.equal(timelyNotice.resource_id, tumblers[1].id);
    }

    await expectStatus(user, '/api/me/password', 200, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'Bewohner-2026!', newPassword: 'Bewohner-Neu-2026!' })
    });
    await expectStatus(user, '/api/logout', 200, { method: 'POST' });
    await expectStatus(user, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-Neu-2026!' })
    });

    const adminLogin = await expectStatus(admin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin-Test-2026!' })
    });
    assert.equal(adminLogin.body.user.isSuperadmin, true);
    await expectStatus(admin, '/api/remaining-slots/options', 403);
    const users = await expectStatus(admin, '/api/admin/users', 200);
    const resident = users.body.users.find((item) => item.username === 'Bewohner Test');
    const adminUser = users.body.users.find((item) => item.username === 'admin');
    assert.ok(resident && adminUser);
    const overview = await expectStatus(admin, '/api/admin/overview', 200);
    assert.equal(typeof overview.body.usersMissingEmail, 'number');
    await expectStatus(admin, '/api/admin/email-test', 409, { method: 'POST' });
    const notificationRoutesSource = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'notifications.js'),
      'utf8'
    );
    assert.match(notificationRoutesSource, /adminRouter\.get\('\/api\/admin\/push-devices'[\s\S]*WHERE ps\.house_id = \?/);
    const pushDevices = await expectStatus(admin, '/api/admin/push-devices', 200);
    assert.equal(pushDevices.body.totalDevices, 1);
    assert.ok(pushDevices.body.users.some((item) => item.username === 'Bewohner Test' && item.devices === 1));
    const residentPushTest = await expectStatus(admin, '/api/admin/push-test', 200, {
      method: 'POST',
      body: JSON.stringify({ userId: resident.id })
    });
    assert.equal(residentPushTest.body.sent, 0);
    assert.equal(residentPushTest.body.failed, 1);
    const pushDevicesAfterInvalidKey = await expectStatus(admin, '/api/admin/push-devices', 200);
    assert.equal(pushDevicesAfterInvalidKey.body.totalDevices, 0);
    await expectStatus(admin, '/api/admin/push-test', 404, {
      method: 'POST',
      body: JSON.stringify({ userId: 999999 })
    });

    const recoveryApartment = await expectStatus(admin, '/api/admin/apartments', 201, {
      method: 'POST',
      body: JSON.stringify({ label: '1. OG rechts', displayName: 'Familie Recovery' })
    });
    const recoveryAccount = new ApiClient();
    const recoveryAccountRegistration = await expectStatus(recoveryAccount, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        email: 'recovery-alt@example.test',
        password: 'Recovery-Alt-2026!',
        apartmentCode: recoveryApartment.body.activationCode,
        notifyReleases: true
      })
    });
    const recoveryUserId = recoveryAccountRegistration.body.user.id;
    await expectStatus(admin, `/api/admin/apartments/${recoveryApartment.body.apartment.id}`, 403, {
      method: 'PUT',
      body: JSON.stringify({
        displayName: 'Familie Recovery',
        email: 'admin-takeover@example.test',
        secondaryEmail: ''
      })
    });
    const beforeRecoveryDatabase = new Database(databasePath);
    const beforeRecoveryUser = beforeRecoveryDatabase.prepare(
      'SELECT email, apartment_id FROM users WHERE id = ?'
    ).get(recoveryUserId);
    assert.equal(beforeRecoveryUser.email, 'recovery-alt@example.test');
    assert.equal(beforeRecoveryUser.apartment_id, recoveryApartment.body.apartment.id);
    beforeRecoveryDatabase.prepare(`
      UPDATE users
      SET email = NULL, secondary_email = NULL,
          email_verified = 1, email_verified_value = 'old-primary@example.test',
          secondary_email_verified = 1,
          secondary_email_verified_value = 'old-secondary@example.test'
      WHERE id = ?
    `).run(recoveryUserId);
    beforeRecoveryDatabase.close();

    const recoveryOverview = await expectStatus(admin, '/api/admin/overview', 200);
    assert.ok(recoveryOverview.body.usersMissingEmail >= 1);

    await expectStatus(admin, `/api/admin/users/${recoveryUserId}/recovery-code`, 400, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'falsch' })
    });
    const recoveryCode = await expectStatus(admin, `/api/admin/users/${recoveryUserId}/recovery-code`, 201, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'KONTO WIEDERHERSTELLEN' })
    });
    assert.match(recoveryCode.body.code, /^R-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    await expectStatus(guest, '/api/account-recovery/confirm', 400, {
      method: 'POST',
      body: JSON.stringify({
        code: recoveryCode.body.code,
        email: 'recovery-neu@example.test',
        newPassword: 'zu-kurz'
      })
    });
    await expectStatus(guest, '/api/account-recovery/confirm', 200, {
      method: 'POST',
      body: JSON.stringify({
        code: recoveryCode.body.code,
        email: 'recovery-neu@example.test',
        newPassword: 'Recovery-Neu-2026!'
      })
    });
    await expectStatus(guest, '/api/account-recovery/confirm', 400, {
      method: 'POST',
      body: JSON.stringify({
        code: recoveryCode.body.code,
        email: 'recovery-nochmal@example.test',
        newPassword: 'Recovery-Nochmal-2026!'
      })
    });
    await expectStatus(new ApiClient(), '/api/login', 401, {
      method: 'POST',
      body: JSON.stringify({ email: 'recovery-alt@example.test', password: 'Recovery-Alt-2026!' })
    });
    const recoveredAccount = new ApiClient();
    await expectStatus(recoveredAccount, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ email: 'recovery-neu@example.test', password: 'Recovery-Neu-2026!' })
    });
    const recoveredMe = await expectStatus(recoveredAccount, '/api/me', 200);
    assert.equal(recoveredMe.body.user.apartmentLabel, '1. OG rechts');
    assert.equal(recoveredMe.body.user.emailVerified, false);
    const recoveredBindingDatabase = new Database(databasePath, { readonly: true });
    const recoveredBinding = recoveredBindingDatabase.prepare(`
      SELECT email_verified, email_verified_value,
             secondary_email_verified, secondary_email_verified_value
      FROM users WHERE id = ?
    `).get(recoveryUserId);
    recoveredBindingDatabase.close();
    assert.deepEqual(recoveredBinding, {
      email_verified: 0,
      email_verified_value: null,
      secondary_email_verified: 0,
      secondary_email_verified_value: null
    });

    const existingApartment = await expectStatus(admin, '/api/admin/apartments', 201, {
      method: 'POST',
      body: JSON.stringify({ label: '2. OG links', displayName: 'Meier / Keller' })
    });
    assert.match(existingApartment.body.activationCode, /^W-/);
    const claimedApartment = await expectStatus(user, '/api/me/apartment/claim', 200, {
      method: 'POST',
      body: JSON.stringify({ apartmentCode: existingApartment.body.activationCode })
    });
    assert.equal(claimedApartment.body.user.apartmentLabel, '2. OG links');
    assert.equal(claimedApartment.body.user.displayName, 'Meier / Keller');
    assert.equal(claimedApartment.body.user.apartmentSetupRequired, false);
    const remainingSlotOptions = await expectStatus(user, '/api/remaining-slots/options', 200);
    assert.equal(typeof remainingSlotOptions.body.eligible, 'boolean');
    assert.ok(Array.isArray(remainingSlotOptions.body.slots));
    assert.ok(remainingSlotOptions.body.slots.every((item) => !Object.hasOwn(item, 'dryingRooms')));
    await expectStatus(user, '/api/remaining-slots', 400, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'remaining-slot-route-test-0001' },
      body: JSON.stringify({ houseId: 999999, slot: '12:00-17:00', washerId: 1, selfDryingConfirmed: true })
    });
    await expectStatus(user, '/api/remaining-slots', 400, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'remaining-slot-route-test-0002' },
      body: JSON.stringify({ date: '2099-01-01', slot: '12:00-17:00', washerId: 1, selfDryingConfirmed: true })
    });
    await expectStatus(user, '/api/remaining-slots', 400, {
      method: 'POST',
      body: JSON.stringify({ slot: '12:00-17:00', washerId: 1, selfDryingConfirmed: true })
    });

    const remainingExportDatabase = new Database(databasePath);
    const exportDate = addDays(bookingDate, 60);
    const exportGroupId = crypto.randomUUID();
    const remainingExportInsert = remainingExportDatabase.prepare(`
      INSERT INTO bookings (user_id, resource_id, booking_date, slot, group_id, booking_kind)
      VALUES (?, ?, ?, '17:00-21:00', ?, 'remaining_slot')
    `).run(registration.body.user.id, washers[0].id, exportDate, exportGroupId);
    remainingExportDatabase.close();
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[1].id, date: exportDate, slot: '17:00-21:00' })
    });
    await expectStatus(user, '/api/booking-package', 409, {
      method: 'POST',
      body: JSON.stringify({
        washerBookingId: Number(remainingExportInsert.lastInsertRowid),
        items: [{ resourceId: tumblers[0].id, date: exportDate, slot: '17:00-21:00' }]
      })
    });
    await expectStatus(user, '/api/booking-package', 409, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ resourceId: washers[1].id, date: exportDate, slot: '17:00-21:00' }]
      })
    });
    await expectStatus(user, `/api/booking-groups/${exportGroupId}`, 409, { method: 'DELETE' });
    await expectStatus(user, `/api/booking-groups/${exportGroupId}/cancel-notify`, 409, { method: 'POST' });
    await expectStatus(user, `/api/bookings/${remainingExportInsert.lastInsertRowid}`, 409, { method: 'DELETE' });
    await expectStatus(user, `/api/bookings/${remainingExportInsert.lastInsertRowid}/cancel-notify`, 409, { method: 'POST' });
    await expectStatus(user, `/api/bookings/${remainingExportInsert.lastInsertRowid}/release`, 409, { method: 'POST' });
    const remainingBypassDatabase = new Database(databasePath, { readonly: true });
    assert.equal(
      remainingBypassDatabase.prepare('SELECT COUNT(*) AS count FROM bookings WHERE group_id = ?').get(exportGroupId).count,
      1
    );
    remainingBypassDatabase.close();
    const remainingExport = await expectStatus(user, '/api/me/export', 200);
    const exportedRemainingSlot = remainingExport.body.bookings.find((item) => item.bookingKind === 'remaining_slot');
    assert.deepEqual(Object.keys(exportedRemainingSlot).sort(), [
      'bookingKind', 'date', 'house', 'resource', 'resourceType', 'slot'
    ]);
    assert.equal(exportedRemainingSlot.house, 'Maneggplatz 18');
    assert.equal(exportedRemainingSlot.resourceType, 'washer');
    assert.equal(JSON.stringify(exportedRemainingSlot).includes('selfDrying'), false);
    const remainingExportCleanup = new Database(databasePath);
    remainingExportCleanup.prepare('DELETE FROM bookings WHERE group_id = ?').run(exportGroupId);
    remainingExportCleanup.close();
    const bookingWithDoorbellName = await expectStatus(user, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(bookingWithDoorbellName.body.bookings.some((booking) => booking.username === 'Meier / Keller'));
    await expectStatus(user, '/api/me/apartment-name-request', 201, {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Meier-Keller', note: 'Klingelschild wurde angepasst.' })
    });
    const apartmentsWithRequest = await expectStatus(admin, '/api/admin/apartments', 200);
    assert.ok(apartmentsWithRequest.body.apartments.some((apartment) => (
      apartment.id === existingApartment.body.apartment.id
      && apartment.requested_display_name === 'Meier-Keller'
    )));
    await expectStatus(admin, `/api/admin/apartments/${existingApartment.body.apartment.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({
        displayName: 'Meier-Keller'
      })
    });
    const renamedBooking = await expectStatus(user, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(renamedBooking.body.bookings.some((booking) => booking.username === 'Meier-Keller'));
    const apartmentsAfterApproval = await expectStatus(admin, '/api/admin/apartments', 200);
    assert.ok(apartmentsAfterApproval.body.apartments.some((apartment) => (
      apartment.id === existingApartment.body.apartment.id && !apartment.name_request_id
    )));

    const newApartment = await expectStatus(admin, '/api/admin/apartments', 201, {
      method: 'POST',
      body: JSON.stringify({ label: '3. OG rechts', displayName: 'Familie Neu' })
    });
    const apartmentResident = new ApiClient();
    const apartmentRegistration = await expectStatus(apartmentResident, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Partei Neu Konto',
        email: 'partei-neu@example.test',
        password: 'Partei-Neu-2026!',
        apartmentCode: newApartment.body.activationCode,
        notifyReleases: true
      })
    });
    assert.equal(apartmentRegistration.body.user.apartmentLabel, '3. OG rechts');
    assert.equal(apartmentRegistration.body.user.displayName, 'Familie Neu');
    assert.notEqual(apartmentRegistration.body.user.username, 'Partei Neu Konto');
    await expectStatus(new ApiClient(), '/api/login', 401, {
      method: 'POST',
      body: JSON.stringify({ username: 'Partei Neu Konto', password: 'Partei-Neu-2026!' })
    });
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ email: 'partei-neu@example.test', password: 'Partei-Neu-2026!' })
    });
    await expectStatus(new ApiClient(), '/api/register', 403, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Doppeltes Konto',
        email: 'doppelt@example.test',
        password: 'Doppelt-Konto-2026!',
        apartmentCode: newApartment.body.activationCode
      })
    });
    const deviceCode = await expectStatus(apartmentResident, '/api/me/device-code', 201, { method: 'POST' });
    assert.match(deviceCode.body.loginUrl, /\/login\.html\?device=/);
    assert.equal(new URL(deviceCode.body.loginUrl).searchParams.get('device'), deviceCode.body.code);
    assert.match(deviceCode.body.qrCodeDataUrl, /^data:image\/png;base64,/);
    assert.ok(Buffer.from(deviceCode.body.qrCodeDataUrl.split(',', 2)[1], 'base64').length > 500);
    const pairedDevice = new ApiClient();
    const deviceLogin = await expectStatus(pairedDevice, '/api/device-login', 200, {
      method: 'POST',
      body: JSON.stringify({
        deviceCode: deviceCode.body.code,
        email: 'partei-neu-mitglied@example.test',
        password: 'Partei-Mitglied-2026!',
        passwordConfirmation: 'Partei-Mitglied-2026!'
      })
    });
    assert.notEqual(deviceLogin.body.user.id, apartmentRegistration.body.user.id);
    assert.equal(deviceLogin.body.user.apartmentId, apartmentRegistration.body.user.apartmentId);
    assert.equal(deviceLogin.body.user.bookingUserId, apartmentRegistration.body.user.bookingUserId);
    assert.deepEqual(deviceLogin.body.user.roles, ['resident']);
    assert.equal(deviceLogin.body.user.canBook, true);
    assert.equal(deviceLogin.body.user.canManage, false);
    await expectStatus(new ApiClient(), '/api/device-login', 400, {
      method: 'POST',
      body: JSON.stringify({ deviceCode: deviceCode.body.code })
    });
    const duplicateApartmentAccount = new ApiClient();
    const duplicateRegistration = await expectStatus(duplicateApartmentAccount, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Partei Neu Doppelt',
        email: 'partei-neu-zweit@example.test',
        password: 'Partei-Neu-Zweit-2026!',
        houseCode: 'Testhaus 18'
      })
    });
    assert.equal(duplicateRegistration.body.user.apartmentSetupRequired, true);
    const existingAccountCode = await expectStatus(apartmentResident, '/api/me/device-code', 201, { method: 'POST' });
    const existingAccountMember = await expectStatus(new ApiClient(), '/api/device-login', 200, {
      method: 'POST',
      body: JSON.stringify({
        deviceCode: existingAccountCode.body.code,
        email: 'partei-neu-zweit@example.test',
        password: 'Partei-Neu-Zweit-2026!'
      })
    });
    assert.equal(existingAccountMember.body.user.id, duplicateRegistration.body.user.id);
    assert.notEqual(existingAccountMember.body.user.id, apartmentRegistration.body.user.id);
    assert.equal(existingAccountMember.body.user.apartmentId, apartmentRegistration.body.user.apartmentId);
    assert.equal(existingAccountMember.body.user.bookingUserId, apartmentRegistration.body.user.bookingUserId);
    assert.deepEqual(existingAccountMember.body.user.roles, ['resident']);
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'partei-neu-zweit@example.test', password: 'Partei-Neu-Zweit-2026!' })
    });
    const apartments = await expectStatus(admin, '/api/admin/apartments', 200);
    assert.ok(apartments.body.apartments.some((item) => (
      item.label === '3. OG rechts' && item.display_name === 'Familie Neu' && item.claimed
    )));

    const initialHouses = await expectStatus(admin, '/api/admin/houses', 200);
    assert.equal(initialHouses.body.houses.length, 1);
    const defaultHouseId = initialHouses.body.activeHouseId;
    await expectStatus(user, '/api/admin/houses', 403);
    await expectStatus(user, '/api/me/active-house', 403, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });

    const addedResource = await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Trockenraum Reserve', type: 'drying_room' })
    });
    const reportableResources = await expectStatus(user, '/api/maintenance-resources', 200);
    assert.ok(reportableResources.body.resources.some((resource) => resource.id === addedResource.body.id));
    const maintenancePushEndpoint = `https://push.example.test/maintenance-${crypto.randomUUID()}`;
    await expectStatus(user, '/api/push/subscriptions', 201, {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: maintenancePushEndpoint,
          keys: {
            p256dh: Buffer.from(crypto.randomBytes(65)).toString('base64url'),
            auth: Buffer.from(crypto.randomBytes(16)).toString('base64url')
          }
        }
      })
    });
    const reportedIssue = await expectStatus(user, '/api/maintenance-cases', 201, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-report-0001' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Ablauf pruefen',
        description: 'Nach dem Trocknen steht Wasser unter dem Geraet.'
      })
    });
    const pushBindingInspection = new Database(databasePath, { readonly: true });
    const activePushBindings = pushBindingInspection.prepare(`
      SELECT user_id, house_id, endpoint, active FROM push_subscriptions
      WHERE user_id = ? ORDER BY id
    `).all(registration.body.user.id);
    pushBindingInspection.close();
    assert.ok(activePushBindings.some((binding) => (
      binding.active === 1 && Number(binding.house_id) === Number(defaultHouseId)
    )), `Aktives Push-Geraet ist nicht an das Meldungshaus gebunden: ${JSON.stringify(activePushBindings)}`);
    const ownIssues = await expectStatus(user, '/api/maintenance-cases', 200);
    assert.deepEqual(ownIssues.body.notificationAvailability, { push: true, email: false });
    assert.ok(ownIssues.body.cases.some((item) => (
      item.report_id === reportedIssue.body.reportId
      && item.status === 'new'
    )));
    assert.deepEqual(Object.keys(ownIssues.body.cases[0]).sort(), [
      'description', 'notificationAvailability', 'notificationPreferences', 'report_id', 'reported_at',
      'resource_name', 'resource_type', 'status', 'title'
    ]);
    assert.equal(Object.hasOwn(ownIssues.body.cases[0], 'technical_status'), false);
    const emailContractDb = new Database(databasePath);
    const originalReporterEmail = emailContractDb.prepare(`
      SELECT email, email_verified, email_verified_value,
             secondary_email, secondary_email_verified, secondary_email_verified_value
      FROM users WHERE id = ?
    `).get(registration.body.user.id);
    emailContractDb.prepare(`
      UPDATE users
      SET email_verified = 1, email_verified_value = lower(trim(email)),
          secondary_email_verified = 1,
          secondary_email_verified_value = lower(trim(secondary_email))
      WHERE id = ?
    `).run(registration.body.user.id);
    emailContractDb.close();
    await expectStatus(user, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: 'changed-by-preferences@example.test',
        secondaryEmail: originalReporterEmail.secondary_email || '',
        notifyReleases: true,
        resourceType: 'drying_room',
        weekday: 2,
        slot: '12:00-17:00'
      })
    });
    const changedPrimaryDb = new Database(databasePath, { readonly: true });
    const changedPrimary = changedPrimaryDb.prepare(`
      SELECT email_verified, email_verified_value FROM users WHERE id = ?
    `).get(registration.body.user.id);
    changedPrimaryDb.close();
    assert.deepEqual(changedPrimary, { email_verified: 0, email_verified_value: null });
    await expectStatus(user, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: originalReporterEmail.email,
        secondaryEmail: '',
        notifyReleases: true,
        resourceType: 'drying_room',
        weekday: 2,
        slot: '12:00-17:00'
      })
    });
    const clearedSecondaryDb = new Database(databasePath, { readonly: true });
    const clearedSecondary = clearedSecondaryDb.prepare(`
      SELECT secondary_email, secondary_email_verified, secondary_email_verified_value
      FROM users WHERE id = ?
    `).get(registration.body.user.id);
    clearedSecondaryDb.close();
    assert.deepEqual(clearedSecondary, {
      secondary_email: null,
      secondary_email_verified: 0,
      secondary_email_verified_value: null
    });
    await expectStatus(user, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: originalReporterEmail.email,
        secondaryEmail: originalReporterEmail.secondary_email || '',
        notifyReleases: true,
        resourceType: 'drying_room',
        weekday: 2,
        slot: '12:00-17:00'
      })
    });
    const restoreProfileBindingDb = new Database(databasePath);
    restoreProfileBindingDb.prepare(`
      UPDATE users
      SET email = ?, email_verified = ?, email_verified_value = ?,
          secondary_email = ?, secondary_email_verified = ?, secondary_email_verified_value = ?
      WHERE id = ?
    `).run(
      originalReporterEmail.email,
      originalReporterEmail.email_verified,
      originalReporterEmail.email_verified_value,
      originalReporterEmail.secondary_email,
      originalReporterEmail.secondary_email_verified,
      originalReporterEmail.secondary_email_verified_value,
      registration.body.user.id
    );
    restoreProfileBindingDb.prepare(`
      UPDATE users
      SET email = 'changed-primary@example.test', email_verified = 1,
          email_verified_value = 'old-primary@example.test',
          secondary_email = NULL, secondary_email_verified = 0,
          secondary_email_verified_value = NULL
      WHERE id = ?
    `).run(registration.body.user.id);
    restoreProfileBindingDb.close();
    assert.equal((await expectStatus(user, '/api/maintenance-cases', 200)).body.notificationAvailability.email, false);
    const staleEmailExport = await expectStatus(user, '/api/me/export', 200);
    assert.equal(staleEmailExport.body.account.email_verified, 0);
    assert.equal(Object.hasOwn(staleEmailExport.body.account, 'email_verified_value'), false);
    assert.equal(Object.hasOwn(staleEmailExport.body.account, 'secondary_email_verified_value'), false);
    await expectStatus(user, `/api/maintenance-reports/${reportedIssue.body.reportId}/preferences`, 409, {
      method: 'PUT',
      body: JSON.stringify({ push: false, email: true })
    });
    await expectStatus(user, '/api/maintenance-cases', 409, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-email-stale-primary' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'E-Mail nicht verfuegbar',
        description: 'Ein veraltetes Bestaetigungsflag darf keine geaenderte Adresse aktivieren.',
        notifyEmail: true
      })
    });
    const legacyEmailDb = new Database(databasePath);
    legacyEmailDb.prepare(`
      UPDATE users
      SET email = 'legacy-primary@example.test', email_verified = 1,
          email_verified_value = NULL
      WHERE id = ?
    `).run(registration.body.user.id);
    legacyEmailDb.close();
    assert.equal((await expectStatus(user, '/api/maintenance-cases', 200)).body.notificationAvailability.email, false);
    await expectStatus(user, `/api/maintenance-reports/${reportedIssue.body.reportId}/preferences`, 409, {
      method: 'PUT',
      body: JSON.stringify({ push: false, email: true })
    });
    const secondaryEmailDb = new Database(databasePath);
    secondaryEmailDb.prepare(`
      UPDATE users
      SET email = 'changed-primary@example.test', email_verified = 1,
          email_verified_value = 'old-primary@example.test',
          secondary_email = 'reporter-secondary@example.test',
          secondary_email_verified = 1,
          secondary_email_verified_value = 'reporter-secondary@example.test'
      WHERE id = ?
    `).run(registration.body.user.id);
    secondaryEmailDb.close();
    assert.equal((await expectStatus(user, '/api/maintenance-cases', 200)).body.notificationAvailability.email, true);
    await expectStatus(user, `/api/maintenance-reports/${reportedIssue.body.reportId}/preferences`, 200, {
      method: 'PUT',
      body: JSON.stringify({ push: false, email: true })
    });
    const secondaryEmailReport = await expectStatus(user, '/api/maintenance-cases', 201, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-email-secondary-fallback' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Bestaetigte Zweitadresse',
        description: 'Die bestaetigte Zweitadresse ist der einzige zulaessige E-Mail-Empfaenger.',
        notifyEmail: true
      })
    });
    const staleSecondaryDb = new Database(databasePath);
    staleSecondaryDb.prepare(`
      UPDATE users
      SET secondary_email = 'changed-secondary@example.test',
          secondary_email_verified = 1,
          secondary_email_verified_value = 'reporter-secondary@example.test'
      WHERE id = ?
    `).run(registration.body.user.id);
    staleSecondaryDb.close();
    assert.equal((await expectStatus(user, '/api/maintenance-cases', 200)).body.notificationAvailability.email, false);
    await expectStatus(user, `/api/maintenance-reports/${reportedIssue.body.reportId}/preferences`, 409, {
      method: 'PUT',
      body: JSON.stringify({ push: false, email: true })
    });
    const restoreEmailContractDb = new Database(databasePath);
    restoreEmailContractDb.prepare(`
      UPDATE users
      SET email = ?, email_verified = ?, email_verified_value = ?,
          secondary_email = ?, secondary_email_verified = ?, secondary_email_verified_value = ?
      WHERE id = ?
    `).run(
      originalReporterEmail.email,
      originalReporterEmail.email_verified,
      originalReporterEmail.email_verified_value,
      originalReporterEmail.secondary_email,
      originalReporterEmail.secondary_email_verified,
      originalReporterEmail.secondary_email_verified_value,
      registration.body.user.id
    );
    restoreEmailContractDb.close();
    await expectStatus(user, `/api/maintenance-reports/${secondaryEmailReport.body.reportId}`, 200, {
      method: 'DELETE'
    });
    const replayedIssue = await expectStatus(user, '/api/maintenance-cases', 200, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-report-0001' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Ablauf pruefen',
        description: 'Nach dem Trocknen steht Wasser unter dem Geraet.'
      })
    });
    assert.equal(replayedIssue.body.reportId, reportedIssue.body.reportId);
    assert.equal(replayedIssue.body.replayed, true);
    await expectStatus(user, '/api/maintenance-cases', 409, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-report-0001' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Ablauf pruefen',
        description: 'Abweichender Inhalt muss abgewiesen werden.'
      })
    });
    const additionalObservation = await expectStatus(user, '/api/maintenance-cases', 201, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-report-0002' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Zweite Beobachtung',
        description: 'Auch nach kurzem Warten bleibt Feuchtigkeit sichtbar.'
      })
    });
    assert.equal(additionalObservation.body.id, reportedIssue.body.id);
    assert.equal(additionalObservation.body.addedToExisting, true);
    const secondReporter = new ApiClient();
    await expectStatus(secondReporter, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Zweite Meldeperson',
        email: 'zweite-meldeperson@example.test',
        password: 'Zweite-Meldeperson-2026!',
        houseCode: 'Testhaus 18'
      })
    });
    const secondReport = await expectStatus(secondReporter, '/api/maintenance-cases', 201, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-report-second-0001' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Nur zweite Person',
        description: 'FREMDREPORT-SENTINEL darf die erste Person niemals sehen.'
      })
    });
    assert.equal(secondReport.body.id, reportedIssue.body.id);
    const firstReporterProjection = await expectStatus(user, '/api/maintenance-cases', 200);
    assert.equal(firstReporterProjection.body.cases.length, 2);
    assert.ok(!JSON.stringify(firstReporterProjection.body).includes('FREMDREPORT-SENTINEL'));
    assert.ok(!JSON.stringify(firstReporterProjection.body).includes('Zweite Meldeperson'));
    assert.ok(firstReporterProjection.body.cases.every((item) => (
      ['new', 'in_progress', 'done'].includes(item.status)
      && Object.keys(item).sort().join('|') === [
        'description', 'notificationAvailability', 'notificationPreferences', 'report_id', 'reported_at',
        'resource_name', 'resource_type', 'status', 'title'
      ].join('|')
    )));
    const ownReportIdsBeforeLegacyJoin = firstReporterProjection.body.cases
      .map((item) => item.report_id).sort();
    await expectStatus(user, '/api/me/apartment/join', 410, {
      method: 'POST',
      body: JSON.stringify({ deviceCode: 'LEGACY-MERGE-MUST-STAY-DISABLED' })
    });
    const firstReporterAfterLegacyJoin = await expectStatus(user, '/api/maintenance-cases', 200);
    assert.deepEqual(
      firstReporterAfterLegacyJoin.body.cases.map((item) => item.report_id).sort(),
      ownReportIdsBeforeLegacyJoin
    );
    assert.equal((await expectStatus(user, '/api/me', 200)).body.user.id, registration.body.user.id);
    const secondReporterProjection = await expectStatus(secondReporter, '/api/maintenance-cases', 200);
    assert.equal(secondReporterProjection.body.cases.length, 1);
    assert.equal(secondReporterProjection.body.cases[0].report_id, secondReport.body.reportId);
    assert.ok(JSON.stringify(secondReporterProjection.body).includes('FREMDREPORT-SENTINEL'));
    assert.ok(!JSON.stringify(secondReporterProjection.body).includes('Nach dem Trocknen'));
    const firstReporterExport = await expectStatus(user, '/api/me/export', 200);
    assert.equal(firstReporterExport.body.maintenanceReports.length, 2);
    assert.ok(!JSON.stringify(firstReporterExport.body.maintenanceReports).includes('FREMDREPORT-SENTINEL'));
    assert.ok(firstReporterExport.body.maintenanceReports.every((report) => (
      Object.keys(report).sort().join('|') === [
        'context', 'description', 'notificationPreferences', 'reportId', 'reportedAt', 'status', 'title'
      ].join('|')
      && Object.keys(report.context).sort().join('|') === ['houseName', 'resourceName', 'resourceType'].join('|')
      && !Object.hasOwn(report, 'case')
      && !Object.hasOwn(report, 'notificationDeliveries')
    )));
    await expectStatus(user, `/api/maintenance-reports/${secondReport.body.reportId}`, 404, { method: 'DELETE' });
    await expectStatus(secondReporter, `/api/maintenance-reports/${secondReport.body.reportId}/preferences`, 409, {
      method: 'PUT',
      body: JSON.stringify({ push: true, email: false })
    });
    await expectStatus(secondReporter, `/api/maintenance-reports/${secondReport.body.reportId}/preferences`, 409, {
      method: 'PUT',
      body: JSON.stringify({ push: false, email: true })
    });
    const pushIsolationDatabase = new Database(databasePath);
    const foreignPushHouse = pushIsolationDatabase.prepare(`
      INSERT INTO houses (name, code) VALUES ('Push-Isolationshaus', 'PUSH-ISOLATION-HOUSE')
    `).run();
    const foreignApartmentSentinel = 'FREMDWOHNUNG-PUSH-SENTINEL';
    const defaultHouseApartment = pushIsolationDatabase.prepare(`
      INSERT INTO apartments (house_id, label, display_name)
      VALUES (?, 'Push-Testwohnung', ?)
    `).run(defaultHouseId, foreignApartmentSentinel);
    pushIsolationDatabase.prepare('UPDATE users SET apartment_id = ? WHERE id = ?')
      .run(defaultHouseApartment.lastInsertRowid, registration.body.user.id);
    pushIsolationDatabase.prepare(`
      UPDATE push_subscriptions SET house_id = ?
      WHERE user_id = ? AND active = 1
    `).run(foreignPushHouse.lastInsertRowid, registration.body.user.id);
    pushIsolationDatabase.close();
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: foreignPushHouse.lastInsertRowid })
    });
    const foreignHousePushDevices = await expectStatus(admin, '/api/admin/push-devices', 200);
    assert.equal(foreignHousePushDevices.body.totalDevices, 1);
    assert.ok(foreignHousePushDevices.body.users.some((item) => (
      item.id === registration.body.user.id && item.username === 'Bewohner Test' && item.devices === 1
    )));
    assert.ok(!JSON.stringify(foreignHousePushDevices.body).includes(foreignApartmentSentinel));
    const foreignHouseTargetPush = await expectStatus(admin, '/api/admin/push-test', 200, {
      method: 'POST',
      body: JSON.stringify({ userId: registration.body.user.id })
    });
    assert.equal(foreignHouseTargetPush.body.sent, 0);
    assert.equal(foreignHouseTargetPush.body.failed, 1);
    const restoreCrossHousePushFixture = new Database(databasePath);
    restoreCrossHousePushFixture.prepare('UPDATE users SET apartment_id = NULL WHERE id = ?')
      .run(registration.body.user.id);
    restoreCrossHousePushFixture.prepare('UPDATE push_subscriptions SET active = 1 WHERE endpoint = ?')
      .run(maintenancePushEndpoint);
    restoreCrossHousePushFixture.prepare('DELETE FROM apartments WHERE id = ?')
      .run(defaultHouseApartment.lastInsertRowid);
    restoreCrossHousePushFixture.close();
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    const foreignHousePushState = await expectStatus(user, '/api/maintenance-cases', 200);
    assert.deepEqual(foreignHousePushState.body.notificationAvailability, { push: false, email: false });
    assert.ok(foreignHousePushState.body.cases.every((item) => item.notificationAvailability.push === false));
    await expectStatus(user, `/api/maintenance-reports/${reportedIssue.body.reportId}/preferences`, 409, {
      method: 'PUT',
      body: JSON.stringify({ push: true, email: false })
    });
    await expectStatus(user, '/api/maintenance-cases', 409, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-push-foreign-house' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Push fremdes Haus',
        description: 'Diese Meldung darf mit fremdem Pushgeraet nicht angelegt werden.',
        notifyPush: true
      })
    });
    const restorePushDatabase = new Database(databasePath);
    restorePushDatabase.prepare(`
      UPDATE push_subscriptions SET house_id = ?, active = 0 WHERE user_id = ?
    `).run(defaultHouseId, registration.body.user.id);
    const inactivePushState = await expectStatus(user, '/api/maintenance-cases', 200);
    assert.deepEqual(inactivePushState.body.notificationAvailability, { push: false, email: false });
    restorePushDatabase.prepare('UPDATE push_subscriptions SET active = 1 WHERE user_id = ?')
      .run(registration.body.user.id);
    restorePushDatabase.prepare('DELETE FROM houses WHERE id = ?').run(foreignPushHouse.lastInsertRowid);
    restorePushDatabase.close();
    const restoredPushState = await expectStatus(user, '/api/maintenance-cases', 200);
    assert.deepEqual(restoredPushState.body.notificationAvailability, { push: true, email: false });
    const pushEnabledReport = await expectStatus(user, '/api/maintenance-cases', 201, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-push-current-house' },
      body: JSON.stringify({
        resourceId: addedResource.body.id,
        title: 'Push im Meldungshaus',
        description: 'Aktives Pushgeraet im Meldungshaus ist ausdruecklich waehlbar.',
        notifyPush: true
      })
    });
    await expectStatus(user, `/api/maintenance-reports/${pushEnabledReport.body.reportId}`, 200, {
      method: 'DELETE'
    });
    await expectStatus(user, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 403, {
      method: 'POST',
      body: JSON.stringify({ action: 'block', note: 'Bewohner darf nicht sperren.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 400, {
      method: 'POST',
      body: JSON.stringify({ action: 'takeover', note: 'Erste Einschaetzung dokumentiert.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 400, {
      method: 'POST',
      body: JSON.stringify({
        action: 'takeover',
        blockDecision: 'automatic',
        note: 'Eine ungueltige Entscheidung darf nichts veraendern.'
      })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 409, {
      method: 'POST',
      body: JSON.stringify({ action: 'block', note: 'Direkte Sperre darf neuen Fall nicht uebernehmen.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 409, {
      method: 'POST',
      body: JSON.stringify({ action: 'release', note: 'Zu frueh.' })
    });
    const maintenanceBookingDate = addDays(nextWeekday(4), 70);
    const maintenanceBookingDatabase = new Database(databasePath);
    const maintenanceBooking = maintenanceBookingDatabase.prepare(`
      INSERT INTO bookings (user_id, resource_id, booking_date, slot)
      VALUES (?, ?, ?, '12:00-17:00')
    `).run(registration.body.user.id, addedResource.body.id, maintenanceBookingDate);
    const maintenanceBookingBeforeBlock = maintenanceBookingDatabase.prepare('SELECT * FROM bookings WHERE id = ?')
      .get(maintenanceBooking.lastInsertRowid);
    maintenanceBookingDatabase.close();
    await expectStatus(admin, `/api/admin/resources/${addedResource.body.id}`, 409, {
      method: 'PUT',
      body: JSON.stringify({ active: false, blockReason: 'API-Bypass muss scheitern' })
    });
    const bypassInspection = new Database(databasePath, { readonly: true });
    assert.equal(bypassInspection.prepare('SELECT status FROM maintenance_cases WHERE id = ?').get(reportedIssue.body.id).status, 'reported');
    assert.equal(bypassInspection.prepare('SELECT active FROM resources WHERE id = ?').get(addedResource.body.id).active, 1);
    assert.deepEqual(
      bypassInspection.prepare('SELECT * FROM bookings WHERE id = ?').get(maintenanceBooking.lastInsertRowid),
      maintenanceBookingBeforeBlock
    );
    assert.equal(bypassInspection.prepare('SELECT COUNT(*) AS count FROM maintenance_entries WHERE case_id = ?').get(reportedIssue.body.id).count, 0);
    bypassInspection.close();
    const takeoverWithBlock = await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({
        action: 'takeover',
        blockDecision: 'block',
        note: 'Wegen moeglichem Wasseraustritt gesperrt.'
      })
    });
    assert.equal(takeoverWithBlock.body.visibleStatus, 'in_progress');
    assert.ok(takeoverWithBlock.body.affectedBookings.some((booking) => booking.id === maintenanceBooking.lastInsertRowid));
    const maintenanceBookingAfterBlockDatabase = new Database(databasePath);
    assert.deepEqual(
      maintenanceBookingAfterBlockDatabase.prepare('SELECT * FROM bookings WHERE id = ?').get(maintenanceBooking.lastInsertRowid),
      maintenanceBookingBeforeBlock
    );
    maintenanceBookingAfterBlockDatabase.close();
    const adminResources = await expectStatus(admin, '/api/admin/resources', 200);
    const blockedAdminResource = adminResources.body.resources.find((resource) => (
      resource.id === addedResource.body.id
        && resource.active === 0
        && resource.blocked_reason === 'Wegen moeglichem Wasseraustritt gesperrt.'
    ));
    assert.ok(blockedAdminResource);
    assert.equal(Object.hasOwn(blockedAdminResource, 'blocked_by'), false);
    assert.match(blockedAdminResource.blocked_by_actor, /^actor-[a-f0-9]{16}$/);
    await expectStatus(admin, `/api/admin/resources/${addedResource.body.id}`, 409, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Trockenraum Reserve', active: true })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'repair', note: 'Ablaufschlauch neu befestigt.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'test', successful: false, note: 'Erster Probelauf zeigt noch Feuchtigkeit.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'test', successful: true, note: 'Zweiter Probelauf ohne Wasseraustritt.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 400, {
      method: 'POST',
      body: JSON.stringify({ action: 'release', note: '' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'release', note: 'Ablaufschlauch befestigt, Probelauf erfolgreich.' })
    });
    const closedIssues = await expectStatus(admin, '/api/admin/maintenance-cases', 200);
    const closedIssue = closedIssues.body.cases.find((item) => item.id === reportedIssue.body.id);
    assert.equal(closedIssue.status, 'closed');
    assert.deepEqual(closedIssue.entries.map((entry) => entry.entry_type), [
      'block', 'repair', 'test_failed', 'test_passed', 'release'
    ]);
    assert.equal(closedIssue.reports.length, 3);
    assert.ok(closedIssue.reports.some((report) => report.description.includes('FREMDREPORT-SENTINEL')));
    await expectStatus(secondReporter, `/api/maintenance-reports/${secondReport.body.reportId}`, 200, { method: 'DELETE' });
    const secondReporterAfterDelete = await expectStatus(secondReporter, '/api/maintenance-cases', 200);
    assert.equal(secondReporterAfterDelete.body.cases.length, 0);
    await expectStatus(admin, `/api/admin/maintenance-cases/${reportedIssue.body.id}`, 404, { method: 'DELETE' });
    const releasedResources = await expectStatus(admin, '/api/admin/resources', 200);
    assert.ok(releasedResources.body.resources.some((resource) => resource.id === addedResource.body.id && resource.active === 1));

    const availableResource = await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Waschmaschine Beobachtung', type: 'washer' })
    });
    const availableCase = await expectStatus(user, '/api/maintenance-cases', 201, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'app-test-report-available-0001' },
      body: JSON.stringify({
        resourceId: availableResource.body.id,
        title: 'Ungewoehnliches Geraeusch',
        description: 'Beim Schleudern ist ein ungewoehnliches Geraeusch hoerbar.'
      })
    });
    const takeoverPayload = {
      method: 'POST',
      body: JSON.stringify({
        action: 'takeover',
        blockDecision: 'keep_available',
        note: 'Geraet bleibt bis zur technischen Kontrolle verfuegbar.'
      })
    };
    const concurrentTakeovers = await Promise.all([
      admin.request(`/api/admin/maintenance-cases/${availableCase.body.id}/actions`, takeoverPayload),
      admin.request(`/api/admin/maintenance-cases/${availableCase.body.id}/actions`, takeoverPayload)
    ]);
    assert.deepEqual(concurrentTakeovers.map((item) => item.response.status).sort(), [200, 409]);
    const takeoverAvailable = concurrentTakeovers.find((item) => item.response.status === 200);
    assert.equal(takeoverAvailable.body.status, 'repairing');
    assert.equal(takeoverAvailable.body.visibleStatus, 'in_progress');
    await expectStatus(admin, `/api/admin/maintenance-cases/${availableCase.body.id}/actions`, 409, {
      method: 'POST',
      body: JSON.stringify({ action: 'test', successful: true, note: 'Pruefung ohne dokumentierte Reparatur.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${availableCase.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'repair', note: 'Lockere Abdeckung befestigt.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${availableCase.body.id}/actions`, 409, {
      method: 'POST',
      body: JSON.stringify({ action: 'close', note: 'Abschluss vor Funktionspruefung.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${availableCase.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'test', successful: true, note: 'Probelauf ohne Auffaelligkeit.' })
    });
    const closeAvailable = await expectStatus(admin, `/api/admin/maintenance-cases/${availableCase.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'close', note: 'Abdeckung befestigt und Probelauf erfolgreich.' })
    });
    assert.equal(closeAvailable.body.status, 'closed');
    assert.equal(closeAvailable.body.visibleStatus, 'done');
    const availableResourcesAfterClose = await expectStatus(admin, '/api/admin/resources', 200);
    assert.ok(availableResourcesAfterClose.body.resources.some((resource) => (
      resource.id === availableResource.body.id && resource.active === 1
    )));

    await expectStatus(admin, `/api/admin/resources/${addedResource.body.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false, blockReason: 'Direkte Sicherheitssperre' })
    });
    const directBlockCases = await expectStatus(admin, '/api/admin/maintenance-cases', 200);
    const directBlockCase = directBlockCases.body.cases.find((item) => (
      item.resource_id === addedResource.body.id && item.status === 'blocked'
    ));
    assert.ok(directBlockCase);
    assert.deepEqual(directBlockCase.entries.map((entry) => entry.entry_type), ['block']);
    assert.equal(directBlockCase.title, 'Betriebsfall');
    assert.equal(directBlockCase.description, '');
    await expectStatus(admin, `/api/admin/maintenance-cases/${directBlockCase.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'repair', note: 'Sichtkontrolle und Reinigung abgeschlossen.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${directBlockCase.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'test', successful: true, note: 'Testbetrieb erfolgreich.' })
    });
    await expectStatus(admin, `/api/admin/maintenance-cases/${directBlockCase.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'release', note: 'Reinigung abgeschlossen, Testbetrieb erfolgreich.' })
    });

    const privacyInspection = new Database(databasePath, { readonly: true });
    const neutralCases = privacyInspection.prepare(`
      SELECT reported_by, title, description FROM maintenance_cases
    `).all();
    assert.ok(neutralCases.every((item) => (
      item.reported_by === null && item.title === 'Betriebsfall' && item.description === ''
    )));
    const neutralEntryText = JSON.stringify(privacyInspection.prepare(`
      SELECT entry_type, note FROM maintenance_entries ORDER BY id
    `).all());
    assert.ok(!neutralEntryText.includes('Nach dem Trocknen'));
    assert.ok(!neutralEntryText.includes('FREMDREPORT-SENTINEL'));
    const maintenanceAudits = privacyInspection.prepare(`
      SELECT user_id, action, details FROM audit_log
      WHERE action LIKE 'maintenance_case.%' OR action = 'resource.block'
      ORDER BY id
    `).all();
    privacyInspection.close();
    assert.ok(maintenanceAudits.length > 0);
    assert.ok(maintenanceAudits.every((entry) => entry.user_id === null));
    const maintenanceAuditText = JSON.stringify(maintenanceAudits);
    assert.ok(!maintenanceAuditText.includes('Nach dem Trocknen'));
    assert.ok(!maintenanceAuditText.includes('FREMDREPORT-SENTINEL'));
    assert.ok(!maintenanceAuditText.includes('zweite-meldeperson@example.test'));
    assert.ok(!maintenanceAuditText.includes('Wegen moeglichem Wasseraustritt'));
    assert.ok(maintenanceAudits.some((entry) => JSON.parse(entry.details).actorRef));

    const defaultResourcesBeforeHouseCreate = await expectStatus(admin, '/api/resources', 200);
    const preservedDefaultResourceIds = defaultResourcesBeforeHouseCreate.body.resources
      .map((resource) => resource.id)
      .sort((left, right) => left - right);
    const secondHouse = await expectStatus(admin, '/api/admin/houses', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Maneggplatz 20', code: 'Testhaus 20 Neu' })
    });
    const defaultResourcesAfterHouseCreate = await expectStatus(admin, '/api/resources', 200);
    assert.deepEqual(
      defaultResourcesAfterHouseCreate.body.resources.map((resource) => resource.id).sort((left, right) => left - right),
      preservedDefaultResourceIds
    );
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: secondHouse.body.house.id })
    });
    const secondHouseResources = await expectStatus(admin, '/api/resources', 200);
    assert.equal(secondHouseResources.body.resources.length, 0);
    const emptyHouseCalendar = await expectStatus(
      admin,
      `/api/calendar?from=${bookingDate}&days=7&houseId=${defaultHouseId}`,
      200
    );
    assert.equal(emptyHouseCalendar.body.resourceCount, 0);
    assert.equal(emptyHouseCalendar.body.activeResourceCount, 0);
    assert.ok(emptyHouseCalendar.body.days.every((day) => (
      day.activeResourceCount === 0
      && Object.values(day.availability).every(({ free, total }) => free === 0 && total === 0)
    )));
    const emptyHouseOptions = await expectStatus(
      admin,
      `/api/booking-options?date=${bookingDate}&houseId=${defaultHouseId}`,
      200
    );
    assert.equal(emptyHouseOptions.body.resourceCount, 0);
    assert.equal(emptyHouseOptions.body.activeResourceCount, 0);
    assert.ok(emptyHouseOptions.body.slots.every((slot) => (
      slot.washers.length === 0 && slot.dryingRoomCount === 0 && slot.tumblerCount === 0
    )));
    const secondWasherResource = await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Waschmaschine Haus 20', type: 'washer' })
    });
    await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Tumbler Haus 20 A', type: 'tumbler' })
    });
    await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Tumbler Haus 20 B', type: 'tumbler' })
    });
    const configuredSecondHouseResources = await expectStatus(admin, '/api/resources', 200);
    assert.equal(configuredSecondHouseResources.body.resources.length, 3);
    assert.ok(!configuredSecondHouseResources.body.resources.some((resource) => (
      resources.some((defaultResource) => defaultResource.id === resource.id)
    )));
    const configuredHouseCalendar = await expectStatus(admin, `/api/calendar?from=${bookingDate}&days=7`, 200);
    assert.equal(configuredHouseCalendar.body.resourceCount, 3);
    assert.equal(configuredHouseCalendar.body.activeResourceCount, 3);

    const secondHouseUser = new ApiClient();
    const secondHouseRegistration = await expectStatus(secondHouseUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Bewohner Haus 20',
        email: 'haus20@example.com',
        password: 'Bewohner-Haus20!',
        houseCode: 'Testhaus 20 Neu',
        notifyReleases: true
      })
    });
    assert.equal(secondHouseRegistration.body.user.houseName, 'Maneggplatz 20');
    await expectStatus(secondHouseUser, '/api/bookings', 404, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    const secondWasher = configuredSecondHouseResources.body.resources.find((resource) => resource.type === 'washer');
    assert.equal(secondWasher.id, secondWasherResource.body.id);
    const secondHouseWasherBooking = await expectStatus(secondHouseUser, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: secondWasher.id, date: bookingDate, slot: '07:00-12:00' })
    });
    const secondHouseBookings = await expectStatus(admin, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(secondHouseBookings.body.bookings.some((booking) => booking.username === 'Bewohner Haus 20'));
    assert.ok(!secondHouseBookings.body.bookings.some((booking) => booking.username === 'Bewohner Test'));
    const secondHouseUsers = await expectStatus(admin, '/api/admin/users', 200);
    const secondResident = secondHouseUsers.body.users.find((item) => item.username === 'Bewohner Haus 20');
    assert.ok(secondResident);
    await expectStatus(admin, `/api/admin/users/${secondResident.id}/role`, 200, {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' })
    });

    const secondHouseTumblers = configuredSecondHouseResources.body.resources.filter((resource) => resource.type === 'tumbler');
    await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Gesch\u00fctzter Tumbler',
        resourceId: secondHouseTumblers[0].id,
        weekday: 4,
        slot: '17:00-21:00'
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 409, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Nicht erlaubt',
        resourceId: secondHouseTumblers[1].id,
        weekday: 4,
        slot: '17:00-21:00'
      })
    });

    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    const defaultResourcesAfterHouseRoundTrip = await expectStatus(admin, '/api/resources', 200);
    assert.deepEqual(
      defaultResourcesAfterHouseRoundTrip.body.resources.map((resource) => resource.id).sort((left, right) => left - right),
      preservedDefaultResourceIds
    );
    const isolatedDefaultBookings = await expectStatus(admin, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(!isolatedDefaultBookings.body.bookings.some((booking) => booking.username === 'Bewohner Haus 20'));
    const isolatedDefaultUsers = await expectStatus(admin, '/api/admin/users', 200);
    assert.ok(!isolatedDefaultUsers.body.users.some((item) => item.username === 'Bewohner Haus 20'));
    await expectStatus(admin, `/api/admin/users/${secondResident.id}/house`, 409, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: secondHouse.body.house.id })
    });
    await expectStatus(admin, `/api/bookings/${secondHouseWasherBooking.body.id}`, 200, { method: 'DELETE' });
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    await expectStatus(admin, `/api/admin/users/${secondResident.id}/house`, 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });

    const legacyFixedBooking = await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Frau Meier',
        resourceId: washers[2].id,
        weekday: 6,
        slot: '12:00-17:00'
      })
    });
    assert.equal(legacyFixedBooking.body.legacy, true);
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[2].id, date: fixedDate, slot: '12:00-17:00' })
    });

    const fixedPackageDatabase = new Database(databasePath);
    const fixedPackageResources = [washers[0], washers[1], dryingRooms[0], tumblers[0], tumblers[1]];
    const fixedPackageCandidate = [1, 2, 3, 4, 5, 6].find((weekday) => {
      const plannedRows = [
        [washers[0].id, weekday, '07:00-12:00'],
        [dryingRooms[0].id, weekday, '07:00-12:00'],
        [dryingRooms[0].id, weekday, '12:00-17:00'],
        [tumblers[0].id, weekday, '07:00-12:00'],
        [washers[1].id, weekday, '07:00-12:00'],
        [tumblers[1].id, weekday, '07:00-12:00']
      ];
      return plannedRows.every(([resourceId, rowWeekday, rowSlot]) => (
        !fixedPackageDatabase.prepare(`
          SELECT 1 FROM bookings
          WHERE resource_id = ? AND slot = ? AND booking_date >= ?
            AND CAST(strftime('%w', booking_date) AS INTEGER) = ?
          LIMIT 1
        `).get(resourceId, rowSlot, swissDateString(), rowWeekday)
        && !fixedPackageDatabase.prepare(`
          SELECT 1 FROM fixed_bookings
          WHERE active = 1 AND resource_id = ? AND weekday = ? AND slot = ?
          LIMIT 1
        `).get(resourceId, rowWeekday, rowSlot)
      ));
    });
    fixedPackageDatabase.close();
    assert.ok(fixedPackageCandidate, `Kein freier synthetischer Dauerpaket-Slot fuer ${fixedPackageResources.length} Ressourcen`);

    const fixedRowsBeforeInvalid = (await expectStatus(admin, '/api/admin/fixed-bookings', 200)).body.fixedBookings.length;
    const blockedFixedResource = await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Trockenraum Dauerpaket gesperrt', type: 'drying_room' })
    });
    await expectStatus(admin, `/api/admin/resources/${blockedFixedResource.body.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false, blockReason: 'Synthetische Dauerpaket-Pruefung' })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 400, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Gemischter Vertrag',
        resourceId: washers[0].id,
        resourceIds: [washers[0].id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00'
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 400, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Zwei Waschmaschinen',
        resourceIds: [washers[0].id, washers[1].id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00'
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 400, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Ohne Waschmaschine',
        resourceIds: [dryingRooms[0].id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00',
        dryingDurationSlots: 1
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 404, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Fremdes Haus',
        resourceIds: [secondWasher.id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00'
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 404, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Gesperrte Ressource',
        resourceIds: [washers[0].id, blockedFixedResource.body.id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00',
        dryingDurationSlots: 1
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 400, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Sonntagsfenster',
        resourceIds: [washers[0].id, dryingRooms[0].id],
        weekday: 6,
        slot: '12:00-17:00',
        dryingDurationSlots: 3
      })
    });
    assert.equal((await expectStatus(admin, '/api/admin/fixed-bookings', 200)).body.fixedBookings.length, fixedRowsBeforeInvalid);

    const fixedPackage = await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Dauerpaket Test',
        resourceIds: [washers[0].id, dryingRooms[0].id, tumblers[0].id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00',
        dryingDurationSlots: 2,
        apartmentId: existingApartment.body.apartment.id
      })
    });
    assert.equal(fixedPackage.body.legacy, false);
    assert.ok(fixedPackage.body.groupId);
    assert.equal(fixedPackage.body.created.length, 4);
    assert.equal(fixedPackage.body.created.filter((item) => item.type === 'washer').length, 1);
    assert.equal(fixedPackage.body.created.filter((item) => item.type === 'drying_room').length, 2);
    const fixedPackageList = await expectStatus(admin, '/api/admin/fixed-bookings', 200);
    const listedFixedPackage = fixedPackageList.body.fixedBookings.filter((item) => item.group_id === fixedPackage.body.groupId);
    assert.equal(listedFixedPackage.length, 4);
    assert.ok(listedFixedPackage.filter((item) => item.resource_type === 'drying_room')
      .every((item) => item.drying_duration_slots === 2));
    assert.ok(listedFixedPackage.every((item) => item.apartment_id === existingApartment.body.apartment.id));
    assert.ok(listedFixedPackage.every((item) => item.apartment_name === 'Meier-Keller'));
    await expectStatus(admin, '/api/admin/fixed-bookings', 409, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Tumblerreserve Test',
        resourceIds: [washers[1].id, tumblers[1].id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00'
      })
    });

    const crossHouseGroupDatabase = new Database(databasePath);
    const crossHouseGroupRow = crossHouseGroupDatabase.prepare(`
      INSERT INTO fixed_bookings (resource_id, weekday, slot, label, group_id, created_by)
      VALUES (?, ?, '17:00-21:00', 'Fremdhaus-Kollision', ?, ?)
    `).run(secondWasher.id, fixedPackageCandidate, fixedPackage.body.groupId, adminUser.id);
    crossHouseGroupDatabase.close();
    await expectStatus(admin, `/api/admin/fixed-bookings/${fixedPackage.body.id}`, 409, { method: 'DELETE' });
    const collisionInspection = new Database(databasePath);
    assert.equal(
      collisionInspection.prepare('SELECT COUNT(*) AS count FROM fixed_bookings WHERE group_id = ? AND active = 1')
        .get(fixedPackage.body.groupId).count,
      5
    );
    collisionInspection.prepare('DELETE FROM fixed_bookings WHERE id = ?').run(crossHouseGroupRow.lastInsertRowid);
    collisionInspection.close();
    const deletedFixedPackage = await expectStatus(
      admin,
      `/api/admin/fixed-bookings/${fixedPackage.body.id}`,
      200,
      { method: 'DELETE' }
    );
    assert.equal(deletedFixedPackage.body.deleted, 4);
    const deletedFixedPackageInspection = new Database(databasePath);
    assert.equal(
      deletedFixedPackageInspection.prepare('SELECT COUNT(*) AS count FROM fixed_bookings WHERE group_id = ? AND active = 1')
        .get(fixedPackage.body.groupId).count,
      0
    );
    deletedFixedPackageInspection.close();

    const washerOnlyFixedPackage = await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Nur Waschmaschine',
        resourceIds: [washers[1].id],
        weekday: fixedPackageCandidate,
        slot: '07:00-12:00'
      })
    });
    assert.ok(washerOnlyFixedPackage.body.groupId);
    assert.equal(washerOnlyFixedPackage.body.created.length, 1);
    await expectStatus(admin, `/api/admin/fixed-bookings/${washerOnlyFixedPackage.body.id}`, 200, { method: 'DELETE' });
    const legacyFixedDelete = await expectStatus(admin, `/api/admin/fixed-bookings/${legacyFixedBooking.body.id}`, 200, {
      method: 'DELETE'
    });
    assert.equal(legacyFixedDelete.body.deleted, 1);

    await expectStatus(admin, `/api/admin/users/${adminUser.id}/status`, 400, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/status`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(new ApiClient(), '/api/login', 403, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-Neu-2026!' })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/status`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: true })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/password`, 404, {
      method: 'PUT',
      body: JSON.stringify({ newPassword: 'Admin-Reset-2026!' })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/password-reset`, 409, {
      method: 'POST'
    });
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-Neu-2026!' })
    });

    const backup = await expectStatus(admin, '/api/admin/backup', 200);
    assert.ok(backup.body.length > 1000);
    assert.equal(backup.body.subarray(0, 15).toString(), 'SQLite format 3');
    const verifiedBackup = await expectStatus(admin, '/api/admin/backup/run', 200, { method: 'POST' });
    assert.equal(verifiedBackup.body.status.ok, true);
    const maintenanceStarted = await expectStatus(admin, '/api/admin/maintenance', 200, {
      method: 'PUT',
      body: JSON.stringify({ active: true, currentPassword: 'Admin-Test-2026!' })
    });
    assert.equal(maintenanceStarted.body.maintenance.active, true);
    await expectStatus(user, '/api/bookings', 503, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[0].id, date: bookingDate, slot: '17:00-21:00' })
    });
    const maintenanceFinished = await expectStatus(admin, '/api/admin/maintenance', 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    assert.equal(maintenanceFinished.body.maintenance.active, false);
    assert.equal(maintenanceFinished.body.maintenance.lastCheck.database, 'ok');
    assert.equal(maintenanceFinished.body.maintenance.lastCheck.bookingWrite, 'ok');
    const audit = await expectStatus(admin, '/api/admin/audit-log', 200);
    assert.ok(audit.body.entries.some((entry) => entry.action === 'resource.create'));
    assert.ok(audit.body.entries.some((entry) => entry.action === 'user.move'));
    const analytics = await expectStatus(admin, '/api/admin/analytics?days=30', 200);
    assert.ok(Array.isArray(analytics.body.byResource));
    assert.ok(Array.isArray(analytics.body.bySlot));
    await expectStatus(admin, '/api/admin/bookings', 400, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'falsch', currentPassword: 'Admin-Test-2026!' })
    });
    const resetBookings = await expectStatus(admin, '/api/admin/bookings', 200, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'ALLE BUCHUNGEN', currentPassword: 'Admin-Test-2026!' })
    });
    assert.ok(resetBookings.body.deleted >= 1);

    await expectStatus(admin, `/api/admin/houses/${secondHouse.body.house.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Maneggplatz 20A' })
    });

    const apiLogout = await expectStatus(admin, '/api/logout', 200, { method: 'POST' });
    assert.match(apiLogout.response.headers.get('set-cookie') || '', /connect\.sid=;/);
    const apiLoggedOutSession = await expectStatus(admin, '/api/me', 200);
    assert.equal(apiLoggedOutSession.body.user, null);
    await expectStatus(admin, '/api/admin/users', 403);

    const formLogoutAdmin = new ApiClient();
    await expectStatus(formLogoutAdmin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin-Test-2026!' })
    });
    const formLogout = await expectStatus(formLogoutAdmin, '/logout', 303, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Origin: baseUrl,
        'Sec-Fetch-Site': 'same-origin'
      }
    });
    assert.equal(formLogout.response.headers.get('location'), '/login.html?loggedOut=1');
    assert.equal(formLogout.response.headers.get('cache-control'), 'no-store');
    assert.match(formLogout.response.headers.get('set-cookie') || '', /connect\.sid=;/);
    const loggedOutSession = await expectStatus(formLogoutAdmin, '/api/me', 200);
    assert.equal(loggedOutSession.body.user, null);
    const repeatedLogout = await expectStatus(formLogoutAdmin, '/logout', 303, {
      method: 'POST',
      redirect: 'manual'
    });
    assert.equal(repeatedLogout.response.headers.get('location'), '/login.html?loggedOut=1');

    const indexPage = await expectStatus(guest, '/index.html', 200);
    const indexHtml = indexPage.body.toString();
    const appJs = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
    assert.ok(appJs.includes("maintenanceCase.status === 'repairing' && hasDocumentedRepair"));
    assert.ok(appJs.includes("entry.entry_type === 'repair'"));
    const rolesDocument = fs.readFileSync(path.resolve(__dirname, '..', '.agents', 'ROLES.md'), 'utf8');
    const handbookDocument = fs.readFileSync(path.resolve(__dirname, '..', 'HANDBUCH.md'), 'utf8');
    const roleMatrixTestDocument = fs.readFileSync(path.resolve(__dirname, 'role-matrix-test.js'), 'utf8');
    const ownerBriefingPosition = rolesDocument.indexOf('| `05` | `05 · Eigentuemer-Briefing');
    assert.ok(rolesDocument.indexOf('| `00` |') < ownerBriefingPosition);
    assert.ok(ownerBriefingPosition < rolesDocument.indexOf('| `10` |'));
    assert.ok(rolesDocument.includes('## OWNER_BRIEFING — Einfacher Ueberblick fuer den Eigentuemer'));
    assert.ok(rolesDocument.includes('Was ist der Stand?'));
    assert.ok(rolesDocument.includes('Was hat sich geaendert?'));
    assert.ok(rolesDocument.includes('Was ist das wichtigste Risiko oder der wichtigste offene Punkt?'));
    assert.ok(rolesDocument.includes('Was muss der Eigentuemer jetzt entscheiden oder wissen?'));
    assert.ok(rolesDocument.includes('keine App-Benutzerrolle und keinerlei App-Rechte'));
    assert.ok(handbookDocument.includes('| `05` | `05 · Eigentuemer-Briefing – Einfacher Ueberblick`'));
    assert.ok(handbookDocument.includes('keine automatisch berechnete Gesamtampel'));
    const appRoleMatrix = handbookDocument.match(/\| Funktion \| Bewohner \| Haus-Admin \| Superadmin \|[\s\S]*?Das Kontomenue/)?.[0] || '';
    assert.ok(appRoleMatrix);
    assert.ok(!appRoleMatrix.includes('OWNER_BRIEFING'));
    assert.ok(!roleMatrixTestDocument.includes('OWNER_BRIEFING'));
    assert.ok(indexHtml.includes('recordedIntroVideo'));
    assert.ok(indexHtml.includes('/intro-media.js?v=v0.3.4'));
    assert.ok(indexHtml.includes('/assets/intro/media/resident-de.mp4'));
    assert.ok(indexHtml.includes('Kapitel 1 von 9'));
    assert.ok(indexHtml.includes('name="waschzeit-version" content="0.3.4"'));
    assert.ok(indexHtml.includes('<title>WaschZeit Test | Waschplan</title>'));
    assert.ok(indexHtml.includes('<span class="app-wordmark">WaschZeit Test</span>'));
    assert.ok(!indexHtml.includes('__WASCHZEIT_APP_NAME__'));
    assert.ok(indexHtml.includes('/app.js?v=v0.3.4'));
    assert.ok(indexHtml.includes('/styles.css?v=v0.3.4'));
    assert.ok(indexHtml.includes('id="appUpdateNotice"'));
    assert.ok(indexHtml.includes('id="maintenanceOverlay"'));
    assert.ok(!indexHtml.includes('__WASCHZEIT_RELEASE__'));
    assert.ok(indexHtml.includes('settingsOverlay'));
    assert.ok(indexHtml.includes('settingsSummary'));
    assert.ok(indexHtml.includes('accountMenuButton'));
    assert.ok(indexHtml.includes('openSettingsButton'));
    assert.ok(indexHtml.includes('id="openDiaperGameButton"'));
    assert.ok(indexHtml.includes('id="diaperGameOverlay"'));
    assert.ok(indexHtml.includes('id="diaperPressureBar"'));
    assert.ok(indexHtml.includes('id="diaperCountdown"'));
    assert.ok(indexHtml.includes('id="diaperMissionBrief"'));
    assert.ok(indexHtml.includes('id="diaperLeaderboardList"'));
    assert.ok(indexHtml.includes('Globale Tageswertung'));
    assert.ok(indexHtml.includes('class="diaper-game-hero"'));
    assert.ok(indexHtml.includes('class="diaper-step-rail"'));
    assert.ok(indexHtml.includes('Vier Module aus acht Systemen. Ein unvorhersehbarer Zwischenfall.'));
    assert.ok(indexHtml.includes('id="diaperStrikeLights"'));
    assert.ok(indexHtml.includes('id="rankedDiaperModeButton"'));
    const manifestPage = await expectStatus(guest, '/manifest.webmanifest', 200);
    const manifest = JSON.parse(manifestPage.body.toString());
    assert.equal(manifest.name, 'WaschZeit Test');
    assert.equal(manifest.short_name, 'WaschZeit Test');
    assert.ok(indexHtml.includes('id="practiceDiaperModeButton"'));
    assert.ok(indexHtml.includes('id="diaperSoundButton"'));
    assert.ok(indexHtml.includes('data-settings-target="profile"'));
    assert.ok(indexHtml.includes('data-settings-target="notifications"'));
    assert.ok(indexHtml.includes('data-settings-target="device"'));
    assert.ok(indexHtml.includes('data-settings-target="help"'));
    assert.ok(indexHtml.includes('data-settings-target="security"'));
    assert.ok(indexHtml.includes('id="settingsPanelHelp"'));
    assert.ok(indexHtml.includes('id="openIntroButton"'));
    assert.ok(!indexHtml.includes('id="sidebarKnowledgeButton"'));
    assert.ok(!indexHtml.includes('<h2>Gut zu wissen</h2>'));
    assert.ok(indexHtml.includes('messageCenterButton'));
    assert.ok(indexHtml.includes('messageCenterOverlay'));
    assert.ok(indexHtml.includes('messageCenterList'));
    assert.ok(indexHtml.includes('Das Video erkl&auml;rt die f&uuml;r deine Rolle wichtigen Abl&auml;ufe'));
    assert.ok(indexHtml.includes('Waschpaket'));
    assert.ok(indexHtml.includes('passwordForm'));
    assert.ok(indexHtml.includes('user-admin-list'));
    assert.ok(indexHtml.includes('viewSwitcher'));
    assert.ok(indexHtml.includes('weekViewButton'));
    assert.ok(indexHtml.includes('monthViewButton'));
    assert.ok(indexHtml.includes('monthWeekdays'));
    assert.ok(!indexHtml.includes('calendarZoomOutButton'));
    assert.ok(indexHtml.includes('calendarDayDetails'));
    assert.ok(indexHtml.includes('calendarDayDetailsContent'));
    assert.ok(indexHtml.includes('calendarDayDetailsBackdrop'));
    assert.ok(indexHtml.includes('calendarDayDetailsActions'));
    assert.ok(indexHtml.includes('id="bookingPanelTitle"'));
    assert.ok(indexHtml.includes('id="remainingSlotPanel"'));
    assert.ok(indexHtml.includes('id="remainingSlotForm"'));
    assert.ok(indexHtml.includes('id="remainingSlotSelfDrying"'));
    assert.ok(indexHtml.includes('id="remainingSlotTumbler"'));
    assert.ok(indexHtml.includes('Restplatz f&uuml;r eine kleine W&auml;sche. Es ist kein Trockenraum enthalten.'));
    assert.ok(!appJs.includes('remainingSlotOptions?.date !== todayString()'),
      'Die Clientuhr darf einen serverseitig angebotenen Restplatz nicht autorisieren oder sperren');
    assert.ok(!appJs.includes('expireRemainingSlotDraftIfDayChanged'),
      'Tageswechsel wird beim Abschluss ausschliesslich serverseitig revalidiert');
    assert.ok(indexHtml.includes('id="fixedBookingApartment"'));
    assert.ok(indexHtml.includes('id="singleBookingDetails"'));
    assert.ok(indexHtml.includes('bookingFlowContent'));
    assert.ok(indexHtml.includes('bookingFlowSteps'));
    assert.ok(indexHtml.includes('bookingFlowNotice'));
    assert.ok(indexHtml.includes('data-booking-mode="time"'));
    assert.ok(indexHtml.includes('data-booking-mode="machine"'));
    assert.ok(indexHtml.indexOf('weekCalendar') < indexHtml.indexOf('bookingFlowContent'));
    assert.ok(indexHtml.indexOf('bookingFlowContent') < indexHtml.indexOf('schedule'));
    assert.ok(indexHtml.includes('adminSectionNav'));
    assert.ok(indexHtml.includes('adminTaskList'));
    assert.ok(indexHtml.includes('adminResponsibilityList'));
    assert.ok(indexHtml.includes('adminRoleSummary'));
    assert.ok(indexHtml.includes('adminLogbookCount'));
    assert.ok(indexHtml.includes('adminPeopleCount'));
    assert.ok(indexHtml.includes('adminHouseCount'));
    assert.ok(indexHtml.includes('adminSystemCount'));
    assert.ok(indexHtml.includes('id="resourceOverview"'));
    assert.ok(indexHtml.includes('class="admin-create-panel"'));
    assert.ok(indexHtml.includes('id="adminPeopleSearch"'));
    assert.ok(indexHtml.includes('class="admin-system-group"'));
    assert.ok(indexHtml.includes('Haus &amp; Ger&auml;te'));
    assert.ok(indexHtml.includes('id="superadminPermissionOperation"'));
    assert.ok(indexHtml.includes('id="superadminPermissionAction"'));
    assert.ok(indexHtml.includes('id="superadminPermissionTarget"'));
    assert.ok(indexHtml.includes('SUPERADMINRECHT GEBEN'));
    assert.ok(!indexHtml.includes('id="superadminTransferOperation"'));
    assert.ok(indexHtml.includes('adminAccountRecoveryResult'));
    assert.ok(indexHtml.includes('apartmentInviteEmailInput'));
    assert.ok(indexHtml.includes('apartmentInvitationResult'));
    assert.ok(!indexHtml.includes('apartmentCodeResult'));
    assert.ok(!indexHtml.includes('claimApartmentForm'));
    assert.ok(indexHtml.includes('data-admin-target="overview"'));
    assert.ok(indexHtml.includes('data-admin-target="house"'));
    assert.ok(indexHtml.includes('data-admin-target="fixed"'));
    assert.ok(indexHtml.includes('data-admin-target="people"'));
    assert.ok(indexHtml.includes('data-admin-target="analytics"'));
    assert.ok(indexHtml.includes('data-admin-target="system"'));
    assert.ok(!indexHtml.includes('id="noticeJournal"'));
    assert.ok(!indexHtml.includes('id="releaseNotices"'));
    assert.ok(indexHtml.includes('resetBookingsButton'));
    assert.ok(indexHtml.includes('releaseNoticeOverlay'));
    assert.ok(indexHtml.includes('bookReleaseNoticeButton'));
    assert.ok(indexHtml.includes('Aktuell buchbare Freigaben passend zu deinen Benachrichtigungseinstellungen'));
    assert.ok(indexHtml.includes('sessionWarningOverlay'));
    assert.ok(indexHtml.includes('sessionStayButton'));
    assert.ok(indexHtml.includes('sessionLogoutButton'));
    assert.ok(indexHtml.includes('devicePairingPanel'));
    assert.ok(indexHtml.includes('devicePairingQr'));
    assert.ok(indexHtml.includes('devicePairingExpires'));
    assert.ok(indexHtml.includes('action="/logout"'));
    assert.ok(indexHtml.includes('class="app-wordmark"'));
    assert.ok(indexHtml.includes('id="brandHouseName"'));
    assert.ok(!indexHtml.includes('/assets/gbmz-logo.svg'));
    const styles = await expectStatus(guest, '/styles.css', 200);
    const stylesText = styles.body.toString();
    assert.ok(stylesText.includes('.topbar .logout-form .ghost-button'));
    assert.ok(stylesText.includes('background: var(--night)'));
    assert.ok(stylesText.includes('.app-wordmark'));
    assert.ok(stylesText.includes('.week-calendar.month-calendar'));
    assert.ok(stylesText.includes('.calendar-status-list'));
    assert.ok(stylesText.includes('.calendar-day-details'));
    assert.ok(stylesText.includes('.calendar-day.is-previewed'));
    assert.ok(stylesText.includes('.calendar-recommended b'));
    assert.ok(stylesText.includes('@keyframes calendar-preview-in'));
    assert.ok(stylesText.includes('.booking-workspace'));
    assert.ok(stylesText.includes('.booking-flow-steps'));
    assert.ok(stylesText.includes('#statusText:not(:empty)'));
    assert.ok(stylesText.includes('.booking-flow-notice'));
    assert.ok(stylesText.includes('.flow-option-time'));
    assert.ok(stylesText.includes('.booking-mode-switch'));
    assert.ok(stylesText.includes('.flow-time-choice'));
    assert.ok(stylesText.includes('.settings-summary'));
    assert.ok(stylesText.includes('.settings-help-video'));
    assert.ok(stylesText.includes('.diaper-game-stage'));
    assert.ok(stylesText.includes('@keyframes diaper-pop'));
    assert.ok(stylesText.includes('.diaper-leaderboard'));
    assert.ok(stylesText.includes('@keyframes diaper-breathe'));
    assert.ok(stylesText.includes('@keyframes diaper-tool-in'));
    assert.ok(stylesText.includes('@keyframes diaper-countdown-pulse'));
    assert.ok(stylesText.includes('.diaper-wire-rack'));
    assert.ok(stylesText.includes('.diaper-signal-bank'));
    assert.ok(stylesText.includes('.diaper-valve-module'));
    assert.ok(stylesText.includes('.diaper-code-module'));
    assert.ok(stylesText.includes('.diaper-temperature-module'));
    assert.ok(stylesText.includes('.diaper-leak-module'));
    assert.ok(stylesText.includes('.diaper-strike-lights'));
    assert.ok(stylesText.includes('.diaper-mode-switch'));
    assert.ok(stylesText.includes('.diaper-final-module'));
    assert.ok(stylesText.includes('body:not(.admin-view) .side-panel'));
    assert.ok(stylesText.includes('.settings-step'));
    assert.ok(stylesText.includes('.notice-journal'));
    assert.ok(stylesText.includes('.analytics-grid'));
    assert.ok(stylesText.includes('.admin-command-grid'));
    assert.ok(stylesText.includes('.admin-task-item'));
    assert.ok(stylesText.includes('.admin-responsibility-list'));
    assert.ok(stylesText.includes('.admin-tab-count'));
    assert.ok(stylesText.includes('.admin-inventory-summary'));
    assert.ok(stylesText.includes('.resource-admin-group'));
    assert.ok(stylesText.includes('.admin-create-panel'));
    assert.ok(stylesText.includes('.admin-system-group'));
    assert.ok(stylesText.includes('.admin-list-search'));
    assert.ok(stylesText.includes('.admin-account-recovery-result'));
    assert.ok(stylesText.includes('.invitation-summary'));
    assert.ok(stylesText.includes('.apartment-invite-form'));
    assert.ok(stylesText.includes('.pairing-panel'));
    assert.ok(stylesText.includes('.pairing-qr'));
    assert.ok(stylesText.includes('.release-notice-modal'));
    assert.ok(stylesText.includes('.release-notice-facts'));
    assert.ok(stylesText.includes('.session-warning-modal'));
    assert.ok(stylesText.includes('.scene-push'));
    assert.ok(stylesText.includes('.video-scene-image'));
    assert.match(stylesText, /\.main-column\s*\{\s*align-content:\s*start;/);
    assert.match(stylesText, /\.intro-panel\s*\{\s*align-self:\s*start;/);
    const appScript = await expectStatus(guest, '/app.js', 200);
    const appScriptText = appScript.body.toString();
    assert.ok(appScriptText.includes('/api/booking-package'));
    assert.ok(appScriptText.includes('Anzahl Waschmaschinen waehlen'));
    assert.ok(appScriptText.includes('canManageAccount'));
    assert.ok(appScriptText.includes('setAdminSection'));
    assert.ok(appScriptText.includes('renderAdminWorkQueue'));
    assert.ok(appScriptText.includes('filterAdminPeople'));
    assert.ok(appScriptText.includes('resource-admin-group'));
    assert.ok(appScriptText.includes('Tagebuch öffnen'));
    assert.ok(appScriptText.includes('visibleMaintenanceStatus'));
    assert.match(indexHtml, /id="maintenanceStatusFilter"[\s\S]*?value="new"[\s\S]*?value="in_progress"[\s\S]*?value="done"/);
    assert.doesNotMatch(indexHtml, /id="maintenanceStatusFilter"[\s\S]*?value="(?:reported|blocked|repairing|tested|closed)"/);
    assert.match(appScriptText, /function renderFixedBookings\(items\)[\s\S]*?booking\.group_id[\s\S]*?const sortedItems = \[\.\.\.groups\.values\(\)\]\.sort/);
    assert.ok(appScriptText.includes('resourcesInPackage'));
    assert.doesNotMatch(
      appScriptText.match(/function renderMyBookings\(items\)[\s\S]*?function renderReleaseNoticeDetail/)?.[0] || '',
      /left\.weekday/
    );
    assert.ok(appScriptText.includes('Normale Waschzeiten werden von Bewohnern selbst gebucht'));
    assert.ok(appScriptText.includes("translate('app.calendar', 'Kalender')"));
    assert.ok(appScriptText.includes("translate('app.myPlan', 'Mein Waschplan')"));
    assert.ok(appScriptText.includes("translate('app.occupancyPlan', 'Belegungsplan')"));
    assert.ok(appScriptText.includes("translate('app.book', 'Buchen')"));
    assert.ok(appScriptText.includes('bookingFlow.hidden = isAdmin'));
    assert.ok(appScriptText.includes('const isAdmin = !currentUser.canBook'));
    assert.ok(appScriptText.includes('Admin-Nachfolge absichern'));
    assert.ok(appScriptText.includes("calendarView === 'month' ? 42 : 7"));
    assert.ok(appScriptText.includes('formatCalendarMonth'));
    assert.ok(!appScriptText.includes('waschzeit-calendar-zoom'));
    assert.ok(appScriptText.includes('scheduleCalendarPreview'));
    assert.ok(appScriptText.includes('openCalendarPreview'));
    assert.ok(appScriptText.includes('calendarPointerFocus'));
    assert.ok(appScriptText.includes('calendarSheetDragStart'));
    assert.ok(appScriptText.includes('renderCalendarStatusRows'));
    assert.ok(appScriptText.includes('renderCalendarDayDetails'));
    assert.ok(appScriptText.includes('startCalendarWasherBooking'));
    assert.ok(appScriptText.includes('openRecommendedCalendarPackage'));
    assert.ok(appScriptText.includes('Empfohlenen Termin buchen'));
    assert.ok(appScriptText.includes('<span>Empfohlen</span><b>Buchen</b>'));
    assert.ok(appScriptText.includes('/api/booking-options'));
    assert.ok(appScriptText.includes('renderWasherStep'));
    assert.ok(appScriptText.includes('renderTimeStep'));
    assert.ok(appScriptText.includes('/api/me/booking-mode'));
    assert.ok(appScriptText.includes('renderReviewStep'));
    assert.ok(appScriptText.includes('showBookingFlowStatus'));
    assert.ok(appScriptText.includes('Anderen Trockenraum w\\u00e4hlen oder entfernen'));
    assert.ok(appScriptText.includes('visibleRooms = selectedRoom'));
    assert.ok(appScriptText.includes('logoutInProgress'));
    assert.ok(appScriptText.includes('/api/session/keepalive'));
    assert.ok(appScriptText.includes('qrCodeDataUrl'));
    assert.ok(appScriptText.includes('devicePairingCountdownTimer'));
    assert.ok(appScriptText.includes('configureSessionTimeout'));
    assert.ok(appScriptText.includes('SESSION_IDLE_TIMEOUT'));
    assert.ok(appScriptText.includes('Reset-Link senden'));
    assert.ok(appScriptText.includes('Wiederherstellungscode'));
    assert.ok(appScriptText.includes('/recovery-code'));
    assert.ok(appScriptText.includes('/invitation'));
    assert.ok(!appScriptText.includes('/new-code'));
    assert.ok(!appScriptText.includes('input name="secondaryEmail" type="email"'));
    assert.ok(!appScriptText.includes('user-password-reset-form'));
    assert.ok(appScriptText.includes('document.title = `${loadedAppName} | ${currentUser.houseName}`'));
    assert.ok(appScriptText.includes("meta[name=\"waschzeit-app-name\"]"));
    assert.ok(!appScriptText.includes("currentPushState !== 'enabled'"));
    assert.ok(appScriptText.includes('openSettings(!settingsCompleted())'));
    assert.ok(appScriptText.includes('renderSettingsSummary'));
    assert.ok(appScriptText.includes("version.includes('-test.') ? 'Testversion' : 'Version'"));
    assert.ok(appScriptText.includes('let diaperGameRoundMs = 60000'));
    assert.ok(appScriptText.includes("setDiaperGameMode('practice')"));
    assert.ok(appScriptText.includes('function playDiaperSignalSequence'));
    assert.ok(appScriptText.includes('function lockDiaperPressureValve'));
    assert.ok(appScriptText.includes('function submitDiaperCode'));
    assert.ok(appScriptText.includes('function submitDiaperTemperature'));
    assert.ok(appScriptText.includes('function chooseDiaperLeakZone'));
    assert.ok(appScriptText.includes('function beginDiaperFinalHold'));
    assert.ok(appScriptText.includes('/api/diaper-game/leaderboard'));
    assert.ok(appScriptText.includes('/api/diaper-game/action'));
    assert.ok(appScriptText.includes('/api/diaper-game/complete'));
    assert.ok(appScriptText.includes('function loseDiaperGame'));
    assert.ok(appScriptText.includes("activeSettingsSection = 'help'"));
    assert.ok(!appScriptText.includes('sidebarKnowledgeButton'));
    assert.ok(appScriptText.includes('/api/admin/analytics?days=30'));
    assert.ok(appScriptText.includes('resetAllBookings'));
    assert.ok(appScriptText.includes('openReleaseNoticeFromUrl'));
    assert.ok(appScriptText.includes('/api/release-notices/${noticeId}'));
    assert.ok(appScriptText.includes('bookActiveReleaseNotice'));
    assert.ok(!appScriptText.includes('rememberNotice'));
    assert.ok(!appScriptText.includes('readNoticeJournal'));
    assert.ok(appScriptText.includes('Passende freie Termine erscheinen hier, solange sie noch buchbar sind.'));
    assert.ok(appScriptText.includes('Freigeben, Push antippen, buchen'));
    assert.ok(appScriptText.includes('Push-Nachricht'));
    assert.ok(appScriptText.includes("introSceneImage('booking-time-focused.png')"));
    assert.ok(appScriptText.includes("introSceneImage('booking-drying-focused.png')"));
    assert.ok(appScriptText.includes("introSceneImage('booking-tumbler-focused.png')"));
    assert.ok(appScriptText.includes("introSceneImage('release-dialog.png')"));
    assert.ok(appScriptText.includes("introSceneImage('cleaning-tasks.png')"));
    const video = await expectStatus(guest, '/assets/intro/media/resident-de.mp4', 206, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.equal(video.response.headers.get('content-type'), 'video/mp4');
    assert.equal(video.body.length, 1024);
    const captions = await expectStatus(guest, '/assets/intro/media/resident-de.vtt', 200);
    const captionText = captions.body.toString();
    assert.ok(captionText.startsWith('WEBVTT'));
    assert.ok(captionText.includes('Willkommen bei WaschZeit'));
    assert.ok(captionText.includes('Im Wochenkalender findest du schnell'));
    assert.ok(captionText.includes('Fuer ein Waschpaket waehlst du zuerst'));
    assert.ok(captionText.includes('Dein Text bleibt als persoenliche Meldung'));
    assert.ok(captionText.includes('Status sind Neu, In Bearbeitung und Erledigt.'));
    assert.ok(captionText.includes('00:04:'));
    for (const sceneAsset of [
      'app-overview.png',
      'booking-time-focused.png',
      'booking-washers-focused.png',
      'booking-drying-focused.png',
      'booking-tumbler-focused.png',
      'message-center.png',
      'release-dialog.png',
      'settings-notifications.png',
      'cleaning-tasks.png'
    ]) {
      const sceneImage = await expectStatus(guest, `/assets/intro/scenes/${sceneAsset}`, 200);
      assert.equal(sceneImage.response.headers.get('content-type'), 'image/png');
      assert.ok(sceneImage.body.length > 10000);
    }
    const privacyPage = await expectStatus(guest, '/privacy.html', 200);
    const privacyHtml = privacyPage.body.toString();
    assert.ok(privacyHtml.includes('Welche Daten der Waschplan verwendet'));
    assert.ok(privacyHtml.includes('WaschZeit wird von Torsten Letsch betrieben'));
    assert.ok(privacyHtml.includes('mailto:torstenletsch@freenet.de'));
    assert.ok(privacyHtml.includes('Die GBMZ ist nicht Betreiberin dieser App'));
    assert.ok(!privacyHtml.includes('/assets/gbmz-logo.svg'));
    const loginPage = await expectStatus(guest, '/login.html', 200);
    const loginHtml = loginPage.body.toString();
    assert.ok(loginHtml.includes('<title>WaschZeit Test | Anmelden</title>'));
    assert.ok(loginHtml.includes('<span class="app-wordmark">WaschZeit Test</span>'));
    assert.ok(!loginHtml.includes('__WASCHZEIT_APP_NAME__'));
    assert.ok(!loginHtml.includes('/assets/gbmz-logo.svg'));
    assert.ok(loginHtml.includes('accountRecoveryForm'));
    assert.ok(loginHtml.includes('Wiederherstellungscode'));
    assert.ok(loginHtml.includes('invitationSummary'));
    assert.ok(!loginHtml.includes('name="apartmentCode"'));
    const loginScript = await expectStatus(guest, '/login.js', 200);
    assert.ok(loginScript.body.toString().includes('/api/account-recovery/confirm'));
    assert.ok(loginScript.body.toString().includes('/api/invitations/accept'));
    assert.ok(loginScript.body.toString().includes("urlParameters.get('device')"));
    await expectStatus(guest, '/reset.html?token=test', 200);

    await verifySmtpDelivery();
    await verifyProductionRecoveryStartup();
    await verifyProductionMaintenanceMigrationGate();
    await verifyEmailVerificationBindingMigration();

    const pilotAdmin = new ApiClient();
    await expectStatus(pilotAdmin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin', password: 'Admin-Test-2026!' })
    });
    await expectStatus(pilotAdmin, '/api/admin/pilot-accounts', 400, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'falsch', currentPassword: 'Admin-Test-2026!' })
    });
    const pilotReset = await expectStatus(pilotAdmin, '/api/admin/pilot-accounts', 200, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'ALLE TESTKONTEN LOESCHEN', currentPassword: 'Admin-Test-2026!' })
    });
    assert.ok(pilotReset.body.deleted >= 1);
    assert.ok(pilotReset.body.residents >= 1);
    assert.equal(pilotReset.body.backup.ok, true);
    const accountsAfterPilotReset = await expectStatus(pilotAdmin, '/api/admin/users', 200);
    assert.equal(accountsAfterPilotReset.body.users.length, 1);
    assert.equal(accountsAfterPilotReset.body.users[0].is_superadmin, 1);
    await expectStatus(new ApiClient(), '/api/login', 401, {
      method: 'POST',
      body: JSON.stringify({ email: 'bewohner-test@example.com', password: 'Bewohner-2026!' })
    });
    const apartmentsAfterPilotReset = await expectStatus(pilotAdmin, '/api/admin/apartments', 200);
    assert.ok(apartmentsAfterPilotReset.body.apartments.every((apartment) => !apartment.claimed));

    console.log(JSON.stringify({
      ok: true,
      checks: {
        authentication: true,
        adminLogout: true,
        sessionTimeout: true,
        legacySessionHydration: true,
        passwordRecovery: true,
        emailPreferences: true,
        apartmentAccounts: true,
        invitationOnboarding: true,
        devicePairing: true,
        originProtection: true,
        privacyControls: true,
        bookingRules: true,
        smartCalendar: true,
        smartPackage: true,
        multiHouseIsolation: true,
        superadmin: true,
        fixedBookings: true,
        adminAnalytics: true,
        bookingReset: true,
        accountManagement: true,
        pilotReset: true,
        backup: true,
        verifiedBackup: true,
        adminAudit: true,
        narratedVideo: true,
        releaseWindow: true,
        cancellationNotifications: true,
        releaseEmailRecipientRevalidation: true,
        filteredInAppNotifications: true,
        concurrentBookingProtection: true,
        smtpDelivery: true,
        productionRecovery: true,
        productionMaintenanceMigrationGate: true,
        securityHeaders: true
      },
      firstBookingId: firstWasher.body.id
    }, null, 2));
  } finally {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${databasePath}${suffix}`, { force: true });
    }
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  if (serverOutput.length) {
    console.error(serverOutput.join(''));
  }
  process.exitCode = 1;
});
