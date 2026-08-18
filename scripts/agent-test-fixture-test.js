'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { createMailTransport } = require('../src/services/mail-transport');
const { createPushService } = require('../src/services/push');
const {
  EXPECTED,
  FIXTURE,
  FIXTURE_VERSION,
  createAgentTestProviderBoundary,
  evaluateAgentTestFixtureGate,
  initializeDatabaseWithAgentTestFixture,
  rebuildAgentTestFixture
} = require('../src/services/agent-test-fixture');
const {
  classifyStartupFailure,
  createStartupFailureReporter,
  formatStartupFailure
} = require('../src/services/startup-diagnostics');

const projectRoot = path.resolve(__dirname, '..');

function fixtureEnv(overrides = {}) {
  return {
    AGENT_TEST_FIXTURE_ENABLED: 'true',
    AGENT_TEST_EXPECTED_COMMIT: 'a'.repeat(40),
    AGENT_TEST_RESIDENT_PASSWORD: 'Synthetic-Resident-Password-2026',
    AGENT_TEST_HOUSEADMIN_PASSWORD: 'Synthetic-HouseAdmin-Password-2026',
    AGENT_TEST_SUPERADMIN_PASSWORD: 'Synthetic-Superadmin-Password-2026',
    APP_ENV: EXPECTED.appEnvironment,
    APP_RELEASE: EXPECTED.appRelease,
    AUTO_BACKUP: 'false',
    BACKUP_ENABLED: 'false',
    DB_PATH: EXPECTED.databasePath,
    EMAIL_ENABLED: 'false',
    HOUSE_NAME: EXPECTED.houseAName,
    NODE_ENV: 'production',
    PUBLIC_APP_URL: EXPECTED.externalUrl,
    PUSH_ENABLED: 'false',
    RENDER: 'true',
    RENDER_EXTERNAL_HOSTNAME: EXPECTED.externalHostname,
    RENDER_GIT_COMMIT: 'a'.repeat(40),
    AGENT_TEST_FIXTURE_ORIGIN: EXPECTED.externalUrl,
    RENDER_GIT_BRANCH: EXPECTED.branch,
    RENDER_SERVICE_NAME: EXPECTED.serviceName,
    RENDER_SERVICE_ID: EXPECTED.serviceId,
    RENDER_SERVICE_TYPE: 'web',
    SEED_ADMIN_NAME: 'agent-test-admin',
    SEED_ADMIN_PASSWORD: 'Synthetic-Combined-Password-2026',
    ...overrides
  };
}

function createTestDatabase(databasePath = ':memory:') {
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE houses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL COLLATE NOCASE UNIQUE,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      house_id INTEGER,
      is_superadmin INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      notify_releases INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verified_value TEXT,
      apartment_id INTEGER,
      secondary_email TEXT,
      secondary_email_verified INTEGER NOT NULL DEFAULT 0,
      secondary_email_verified_value TEXT
    );
    CREATE TABLE apartments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      display_name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE (house_id, label)
    );
    CREATE TABLE user_house_roles (
      user_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      granted_by INTEGER,
      PRIMARY KEY (user_id, house_id, role),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
    );
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      house_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      slot TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    CREATE TABLE fixed_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      apartment_id INTEGER,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    CREATE TABLE maintenance_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL,
      resource_id INTEGER,
      reported_by INTEGER
    );
    CREATE TABLE maintenance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL
    );
    CREATE TABLE maintenance_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      reporter_user_id INTEGER NOT NULL
    );
    CREATE TABLE maintenance_admin_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      case_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL
    );
    CREATE TABLE release_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER,
      created_by INTEGER,
      resource_id INTEGER
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER,
      user_id INTEGER,
      target_type TEXT,
      target_id TEXT
    );
    CREATE TABLE sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL
    );
  `);

  const houseAId = Number(db.prepare('INSERT INTO houses (name, code) VALUES (?, ?)')
    .run(EXPECTED.houseAName, 'AGENT-TEST-HOUSE-A').lastInsertRowid);
  const combinedId = Number(db.prepare(`
    INSERT INTO users (username, password_hash, role, house_id, is_superadmin, active)
    VALUES (?, ?, 'admin', ?, 1, 1)
  `).run('agent-test-admin', bcrypt.hashSync('Synthetic-Combined-Password-2026', 10), houseAId).lastInsertRowid);
  db.prepare(`
    INSERT INTO user_house_roles (user_id, house_id, role, granted_by)
    VALUES (?, ?, 'house_admin', NULL)
  `).run(combinedId, houseAId);
  return db;
}

function abstractSnapshot(db) {
  return {
    houses: db.prepare('SELECT name, active FROM houses ORDER BY name').all(),
    users: db.prepare(`
      SELECT username, role, house_id IS NULL AS house_is_null, is_superadmin, active,
             apartment_id IS NOT NULL AS has_apartment, email, secondary_email, notify_releases
      FROM users ORDER BY username
    `).all(),
    roles: db.prepare(`
      SELECT u.username, h.name AS house, uhr.role
      FROM user_house_roles uhr
      JOIN users u ON u.id = uhr.user_id
      JOIN houses h ON h.id = uhr.house_id
      ORDER BY u.username, h.name
    `).all(),
    resources: db.prepare(`
      SELECT r.name, r.type, h.name AS house
      FROM resources r JOIN houses h ON h.id = r.house_id
      ORDER BY r.name
    `).all(),
    state: db.prepare('SELECT fixture_key, fixture_version FROM agent_test_fixture_state').all(),
    sink: db.prepare('SELECT event_key, status FROM agent_test_fixture_sink').all(),
    sessions: db.prepare('SELECT sid, sess FROM sessions ORDER BY sid').all()
  };
}

async function runRejectedServer(env) {
  const bootstrap = [
    "const fs = require('node:fs');",
    "fs.mkdirSync = () => { const error = new Error('FILESYSTEM_TOUCHED'); error.code = 'FILESYSTEM_TOUCHED'; throw error; };",
    `require(${JSON.stringify(path.join(projectRoot, 'startup.js'))});`
  ].join(' ');
  const child = spawn(process.execPath, ['-e', bootstrap], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env,
      DB_PATH: EXPECTED.databasePath,
      PORT: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = [];
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  const exitCode = await new Promise((resolve) => child.once('exit', resolve));
  return { exitCode, output: output.join('') };
}

function requestHealth(port) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: '/api/health', timeout: 1000 }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('timeout', () => request.destroy(new Error('HEALTH_TIMEOUT')));
    request.once('error', reject);
  });
}

async function runFatalListenerRegression(eventName, { writeFailure = false } = {}) {
  const bootstrap = [
    "const fs = require('node:fs');",
    "const http = require('node:http');",
    `const serverPath = require.resolve(${JSON.stringify(path.join(projectRoot, 'server.js'))});`,
    "require.cache[serverPath] = { id: serverPath, filename: serverPath, loaded: true, exports: {} };",
    `require(${JSON.stringify(path.join(projectRoot, 'startup.js'))});`,
    writeFailure
      ? "fs.writeSync = () => { const error = new Error('CANARY_WRITE_FAILURE'); error.code = 'EIO'; throw error; };"
      : '',
    "const listener = http.createServer((request, response) => { response.writeHead(200); response.end('ok'); });",
    "listener.listen(0, '127.0.0.1', () => process.send({ type: 'ready', port: listener.address().port }));",
    "process.once('message', () => {",
    "  const error = new Error('canary-secret C:\\\\private\\\\credential.env');",
    "  error.code = 'AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID';",
    eventName === 'uncaughtException'
      ? "  setImmediate(() => { throw error; });"
      : "  Promise.reject(error);",
    "});"
  ].join(' ');
  const child = spawn(process.execPath, ['-e', bootstrap], {
    cwd: projectRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  const output = [];
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));

  let timeout;
  try {
    const port = await new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`${eventName.toUpperCase()}_READY_TIMEOUT`)), 3000);
      child.once('error', reject);
      child.once('exit', (code) => reject(new Error(`${eventName.toUpperCase()}_EARLY_EXIT_${code}`)));
      child.once('message', (message) => {
        if (message?.type === 'ready') resolve(message.port);
      });
    });
    clearTimeout(timeout);
    assert.equal(await requestHealth(port), 200, `${eventName}: Listener muss vor dem Fatalereignis erreichbar sein`);

    child.send('trigger');
    const exit = await new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`${eventName.toUpperCase()}_EXIT_TIMEOUT`)), 3000);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    clearTimeout(timeout);
    assert.notEqual(exit.code, 0, `${eventName}: Fatalereignis muss mit Nichtnullcode beenden`);
    assert.equal(exit.signal, null, `${eventName}: kontrollierter Fatalexit darf kein externes Kill-Signal brauchen`);
    assert.equal(child.exitCode, exit.code, `${eventName}: Kindprozess muss terminal beendet sein`);
    await assert.rejects(requestHealth(port), `${eventName}: Health darf nach Fatalexit nicht erreichbar sein`);

    const lines = output.join('').trim().split(/\r?\n/).filter(Boolean);
    assert.deepEqual(lines, writeFailure ? [] : ['WASCHZEIT_STARTFAIL class=FIXTURE_STATE']);
    assert.doesNotMatch(output.join(''), /Error:|at\s|canary-secret|private|credential|\\|\/[^/]/i);
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
}

async function main() {
  assert.deepEqual(evaluateAgentTestFixtureGate({ env: {}, appVersion: EXPECTED.appVersion }), {
    enabled: false,
    requested: false,
    code: 'FIXTURE_DISABLED'
  });
  assert.deepEqual(evaluateAgentTestFixtureGate({
    env: { AGENT_TEST_FIXTURE_ENABLED: ' false ' },
    appVersion: EXPECTED.appVersion
  }), { enabled: false, requested: false, code: 'FIXTURE_DISABLED' });
  assert.throws(() => evaluateAgentTestFixtureGate({
    env: { AGENT_TEST_FIXTURE_ENABLED: 'sometimes' },
    appVersion: EXPECTED.appVersion
  }), { code: 'AGENT_TEST_FIXTURE_FLAG_INVALID' });

  const validEnv = fixtureEnv();
  assert.deepEqual(evaluateAgentTestFixtureGate({ env: validEnv, appVersion: EXPECTED.appVersion }), {
    enabled: true,
    requested: true,
    code: 'FIXTURE_ALLOWED'
  });

  const identityKeys = [
    'APP_ENV', 'APP_RELEASE', 'NODE_ENV', 'RENDER', 'RENDER_SERVICE_NAME', 'RENDER_SERVICE_ID',
    'RENDER_SERVICE_TYPE', 'RENDER_EXTERNAL_HOSTNAME', 'AGENT_TEST_FIXTURE_ORIGIN',
    'PUBLIC_APP_URL', 'RENDER_GIT_BRANCH', 'RENDER_GIT_COMMIT', 'AGENT_TEST_EXPECTED_COMMIT',
    'DB_PATH', 'HOUSE_NAME'
  ];
  for (const key of identityKeys) {
    assert.throws(() => evaluateAgentTestFixtureGate({
      env: fixtureEnv({ [key]: 'wrong' }),
      appVersion: EXPECTED.appVersion
    }), { code: 'AGENT_TEST_FIXTURE_IDENTITY_MISMATCH' }, key);
  }
  assert.throws(() => evaluateAgentTestFixtureGate({ env: validEnv, appVersion: '0.3.0-test.10' }), {
    code: 'AGENT_TEST_FIXTURE_IDENTITY_MISMATCH'
  });
  for (const key of ['BACKUP_ENABLED', 'AUTO_BACKUP', 'EMAIL_ENABLED', 'PUSH_ENABLED']) {
    for (const value of ['', 'true', 'invalid']) {
      assert.throws(() => evaluateAgentTestFixtureGate({
        env: fixtureEnv({ [key]: value }),
        appVersion: EXPECTED.appVersion
      }), { code: 'AGENT_TEST_FIXTURE_NO_SEND_REQUIRED' }, `${key}/${value}`);
    }
  }
  for (const key of [
    'SMTP_HOST', 'SMTP_FROM', 'SMTP_HELO_NAME', 'SMTP_PORT', 'SMTP_SECURE',
    'VAPID_PUBLIC_KEY', 'BACKUP_UPLOAD_URL'
  ]) {
    assert.throws(() => evaluateAgentTestFixtureGate({
      env: fixtureEnv({ [key]: 'forbidden-provider-binding' }),
      appVersion: EXPECTED.appVersion
    }), { code: 'AGENT_TEST_FIXTURE_PROVIDER_BINDING_FORBIDDEN' }, key);
  }
  assert.throws(() => evaluateAgentTestFixtureGate({
    env: fixtureEnv({ AGENT_TEST_RESIDENT_PASSWORD: '' }),
    appVersion: EXPECTED.appVersion
  }), { code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID' });
  for (const key of [
    'ALLOW_LEGACY_HOUSE_REGISTRATION',
    'ALLOW_TEST_INVITATION_LINK',
    'SEED_ADMIN_FORCE_PASSWORD_RESET'
  ]) {
    assert.equal(evaluateAgentTestFixtureGate({
      env: fixtureEnv({ [key]: '' }),
      appVersion: EXPECTED.appVersion
    }).enabled, true, `${key} darf fehlen`);
    assert.equal(evaluateAgentTestFixtureGate({
      env: fixtureEnv({ [key]: 'false' }),
      appVersion: EXPECTED.appVersion
    }).enabled, true, `${key}=false muss erlaubt sein`);
    for (const value of ['true', 'invalid']) {
      assert.throws(() => evaluateAgentTestFixtureGate({
        env: fixtureEnv({ [key]: value }),
        appVersion: EXPECTED.appVersion
      }), { code: 'AGENT_TEST_FIXTURE_UNSAFE_MODE' }, `${key}/${value}`);
    }
  }

  assert.equal(classifyStartupFailure({ code: 'AGENT_TEST_FIXTURE_IDENTITY_MISMATCH' }), 'GUARD_IDENTITY');
  assert.equal(classifyStartupFailure({ code: 'AGENT_TEST_FIXTURE_UNSAFE_MODE' }), 'GUARD_MODE');
  assert.equal(classifyStartupFailure({ code: 'AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID' }), 'FIXTURE_STATE');
  assert.equal(classifyStartupFailure({ code: 'SQLITE_CANTOPEN' }), 'STORAGE');
  assert.equal(classifyStartupFailure({ code: 'MAINTENANCE_MIGRATION_BACKUP_REQUIRED' }), 'MIGRATION_BACKUP');
  assert.equal(classifyStartupFailure({ code: 'EADDRINUSE' }), 'LISTENER');
  assert.equal(classifyStartupFailure({ code: 'MODULE_NOT_FOUND' }), 'BOOTSTRAP');
  assert.equal(formatStartupFailure({
    code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID',
    message: 'canary-secret C:\\private\\credential.env'
  }), 'WASCHZEIT_STARTFAIL class=GUARD_CREDENTIALS');
  const diagnosticLines = [];
  const reportDiagnostic = createStartupFailureReporter((line) => diagnosticLines.push(line));
  assert.equal(reportDiagnostic({ code: 'AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID' }), true);
  assert.equal(reportDiagnostic({ code: 'SQLITE_CANTOPEN' }), false, 'Pro Start darf nur ein Marker entstehen');
  assert.deepEqual(diagnosticLines, ['WASCHZEIT_STARTFAIL class=FIXTURE_STATE']);
  assert.throws(() => evaluateAgentTestFixtureGate({
    env: fixtureEnv({ AGENT_TEST_RESIDENT_PASSWORD: 'a'.repeat(24) }),
    appVersion: EXPECTED.appVersion
  }), { code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID' });
  assert.throws(() => evaluateAgentTestFixtureGate({
    env: fixtureEnv({ AGENT_TEST_RESIDENT_PASSWORD: validEnv.SEED_ADMIN_PASSWORD }),
    appVersion: EXPECTED.appVersion
  }), { code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID' });
  assert.throws(() => evaluateAgentTestFixtureGate({
    env: fixtureEnv({
      AGENT_TEST_RESIDENT_PASSWORD: validEnv.AGENT_TEST_HOUSEADMIN_PASSWORD
    }),
    appVersion: EXPECTED.appVersion
  }), { code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID' });

  const rejectedCases = [
    { className: 'GUARD_IDENTITY', override: { RENDER_SERVICE_NAME: 'wrong-service' } },
    { className: 'GUARD_MODE', override: { ALLOW_TEST_INVITATION_LINK: 'true' } },
    { className: 'GUARD_NO_SEND', override: { PUSH_ENABLED: 'true' } },
    { className: 'GUARD_PROVIDER', override: { SMTP_HOST: 'forbidden.invalid' } },
    { className: 'GUARD_CREDENTIALS', override: { AGENT_TEST_RESIDENT_PASSWORD: '' } }
  ];
  for (const rejectedCase of rejectedCases) {
    const rejected = await runRejectedServer(fixtureEnv(rejectedCase.override));
    assert.notEqual(rejected.exitCode, 0);
    assert.equal(rejected.output.trim(), `WASCHZEIT_STARTFAIL class=${rejectedCase.className}`);
    assert.doesNotMatch(rejected.output, /Error:|at\s|FILESYSTEM_TOUCHED|RENDER_|AGENT_TEST_|Password/i);
  }
  await runFatalListenerRegression('uncaughtException');
  await runFatalListenerRegression('unhandledRejection');
  await runFatalListenerRegression('uncaughtException', { writeFailure: true });

  const db = createTestDatabase();
  const gate = evaluateAgentTestFixtureGate({ env: validEnv, appVersion: EXPECTED.appVersion });
  try {
    const combinedBefore = db.prepare('SELECT * FROM users WHERE username = ?').get('agent-test-admin');
    const combinedRoleBefore = db.prepare('SELECT * FROM user_house_roles WHERE user_id = ?')
      .all(combinedBefore.id);

    const first = rebuildAgentTestFixture({ db, bcrypt, env: validEnv, gate });
    assert.deepEqual(first, {
      enabled: true,
      ready: true,
      version: FIXTURE_VERSION,
      mode: 'rebuilt',
      houses: 2,
      accounts: 4,
      resources: 5,
      apartments: 1,
      sessions: 0,
      residents: 1,
      houseAdmins: 2,
      superadmins: 2,
      simulatedEvents: 1
    });
    const firstSnapshot = abstractSnapshot(db);
    assert.equal(firstSnapshot.houses.length, 2);
    assert.equal(firstSnapshot.resources.length, FIXTURE.resources.length);
    assert.equal(firstSnapshot.users.length, 4);
    assert.deepEqual(firstSnapshot.state, [{ fixture_key: 'baseline', fixture_version: FIXTURE_VERSION }]);
    assert.deepEqual(firstSnapshot.sink, [{ event_key: 'baseline.ready', status: 'simulated' }]);
    assert.ok(firstSnapshot.users.every((user) => user.email === null && user.secondary_email === null));

    const resident = firstSnapshot.users.find((user) => user.username === FIXTURE.residentUsername);
    const houseAdmin = firstSnapshot.users.find((user) => user.username === FIXTURE.houseAdminUsername);
    const superadmin = firstSnapshot.users.find((user) => user.username === FIXTURE.superadminUsername);
    assert.deepEqual(
      { role: resident.role, superadmin: resident.is_superadmin, apartment: resident.has_apartment },
      { role: 'user', superadmin: 0, apartment: 1 }
    );
    assert.deepEqual(
      { role: houseAdmin.role, superadmin: houseAdmin.is_superadmin, apartment: houseAdmin.has_apartment },
      { role: 'admin', superadmin: 0, apartment: 0 }
    );
    assert.deepEqual(
      { role: superadmin.role, superadmin: superadmin.is_superadmin, houseIsNull: superadmin.house_is_null },
      { role: 'admin', superadmin: 1, houseIsNull: 1 }
    );
    assert.equal(firstSnapshot.roles.filter((role) => role.username === FIXTURE.houseAdminUsername).length, 1);
    assert.equal(firstSnapshot.roles.filter((role) => role.username === FIXTURE.superadminUsername).length, 0);

    const noOp = rebuildAgentTestFixture({ db, bcrypt, env: validEnv, gate });
    assert.equal(noOp.mode, 'noop');
    assert.deepEqual(abstractSnapshot(db), firstSnapshot, 'Vollstaendiger Sollzustand muss ein echter No-op sein');

    const restartRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-fixture-restart-'));
    const restartPath = path.join(restartRoot, 'fixture.sqlite');
    let restartDb;
    try {
      restartDb = createTestDatabase(restartPath);
      const restartFirst = rebuildAgentTestFixture({ db: restartDb, bcrypt, env: validEnv, gate });
      assert.equal(restartFirst.mode, 'rebuilt');
      const restartSnapshot = abstractSnapshot(restartDb);
      restartDb.close();
      restartDb = new Database(restartPath);
      restartDb.pragma('foreign_keys = ON');
      const restartNoOp = rebuildAgentTestFixture({ db: restartDb, bcrypt, env: validEnv, gate });
      assert.equal(restartNoOp.mode, 'noop');
      assert.deepEqual(abstractSnapshot(restartDb), restartSnapshot,
        'Ein Prozessneustart auf unveraendertem ephemerem Speicher muss ein echter No-op sein');
    } finally {
      if (restartDb?.open) restartDb.close();
      fs.rmSync(restartRoot, { recursive: true, force: true });
    }

    const fixtureResident = db.prepare('SELECT id FROM users WHERE username = ?').get(FIXTURE.residentUsername);
    const fixtureResource = db.prepare('SELECT id, house_id FROM resources WHERE name = ?')
      .get(FIXTURE.resources[0].name);
    const fixtureCase = db.prepare(`
      INSERT INTO maintenance_cases (house_id, resource_id, reported_by) VALUES (?, ?, ?)
    `).run(fixtureResource.house_id, fixtureResource.id, fixtureResident.id);
    const fixtureReport = db.prepare(`
      INSERT INTO maintenance_reports (case_id, reporter_user_id) VALUES (?, ?)
    `).run(fixtureCase.lastInsertRowid, fixtureResident.id);
    db.prepare('INSERT INTO maintenance_entries (case_id) VALUES (?)').run(fixtureCase.lastInsertRowid);
    db.prepare(`
      INSERT INTO maintenance_admin_notifications (report_id, case_id, house_id) VALUES (?, ?, ?)
    `).run(fixtureReport.lastInsertRowid, fixtureCase.lastInsertRowid, fixtureResource.house_id);
    db.prepare('INSERT INTO sessions (sid, sess) VALUES (?, ?)')
      .run('fixture-session', JSON.stringify({ user: { id: fixtureResident.id } }));
    db.prepare('INSERT INTO sessions (sid, sess) VALUES (?, ?)')
      .run('combined-session', JSON.stringify({ user: { id: combinedBefore.id } }));
    db.prepare('INSERT INTO sessions (sid, sess) VALUES (?, ?)')
      .run('unrelated-unreadable-session', '{not-json');
    db.prepare(`
      INSERT INTO audit_log (house_id, user_id, target_type, target_id) VALUES (?, ?, 'resource', ?)
    `).run(fixtureResource.house_id, fixtureResident.id, String(fixtureResource.id));

    const second = rebuildAgentTestFixture({ db, bcrypt, env: validEnv, gate });
    assert.equal(second.ready, true);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_cases').get().count, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0,
      'Ein Agent-Test-Neustart darf keine kombinierte, Fixture- oder unlesbare Sitzung behalten');
    assert.deepEqual(abstractSnapshot(db), firstSnapshot, 'Wiederaufbau muss semantisch idempotent sein');
    assert.deepEqual(db.prepare('SELECT * FROM users WHERE username = ?').get('agent-test-admin'), combinedBefore);
    assert.deepEqual(
      db.prepare('SELECT * FROM user_house_roles WHERE user_id = ?').all(combinedBefore.id),
      combinedRoleBefore
    );

    const assertForeignStateRejected = (label, mutate) => {
      const dirtyDb = createTestDatabase();
      try {
        rebuildAgentTestFixture({ db: dirtyDb, bcrypt, env: validEnv, gate });
        mutate(dirtyDb);
        const before = abstractSnapshot(dirtyDb);
        assert.throws(
          () => rebuildAgentTestFixture({ db: dirtyDb, bcrypt, env: validEnv, gate }),
          { code: 'AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID' },
          label
        );
        assert.deepEqual(abstractSnapshot(dirtyDb), before, `${label} muss nach dem Rollback erhalten bleiben`);
      } finally {
        dirtyDb.close();
      }
    };
    assertForeignStateRejected('fremdes Haus', (dirtyDb) => {
      dirtyDb.prepare('INSERT INTO houses (name, code) VALUES (?, ?)')
        .run('Fremder synthetischer Bestand', 'FOREIGN-SYNTHETIC');
    });
    assertForeignStateRejected('fremder Nutzer', (dirtyDb) => {
      const houseId = dirtyDb.prepare('SELECT id FROM houses WHERE name = ?').get(EXPECTED.houseAName).id;
      dirtyDb.prepare(`
        INSERT INTO users (username, password_hash, role, house_id) VALUES (?, ?, 'user', ?)
      `).run('foreign-user', bcrypt.hashSync('Foreign-Password-Only-Test-2026', 10), houseId);
    });
    assertForeignStateRejected('fremde Ressource', (dirtyDb) => {
      const houseId = dirtyDb.prepare('SELECT id FROM houses WHERE name = ?').get(EXPECTED.houseAName).id;
      dirtyDb.prepare('INSERT INTO resources (name, type, house_id) VALUES (?, ?, ?)')
        .run('Fremde Waschmaschine', 'washer', houseId);
    });
    assertForeignStateRejected('fremde Wohnung', (dirtyDb) => {
      const houseId = dirtyDb.prepare('SELECT id FROM houses WHERE name = ?').get(EXPECTED.houseAName).id;
      dirtyDb.prepare('INSERT INTO apartments (house_id, label, display_name) VALUES (?, ?, ?)')
        .run(houseId, 'Fremde Wohnung', 'Fremde Wohnung');
    });
    assertForeignStateRejected('fremde Rollenbindung', (dirtyDb) => {
      const combined = dirtyDb.prepare('SELECT id FROM users WHERE username = ?').get('agent-test-admin');
      const houseB = dirtyDb.prepare('SELECT id FROM houses WHERE name = ?').get(FIXTURE.houseBName);
      dirtyDb.prepare(`
        INSERT INTO user_house_roles (user_id, house_id, role, granted_by)
        VALUES (?, ?, 'house_admin', NULL)
      `).run(combined.id, houseB.id);
    });
    assertForeignStateRejected('fremder Auditbestand', (dirtyDb) => {
      dirtyDb.prepare(`
        INSERT INTO audit_log (target_type, target_id) VALUES ('foreign', 'retained')
      `).run();
    });

    const missingFixtureResourceId = db.prepare(`
      SELECT object_id FROM agent_test_fixture_objects
      WHERE object_type = 'resource' AND object_key = 'house-b-washer'
    `).get().object_id;
    db.prepare('DELETE FROM resources WHERE id = ?').run(missingFixtureResourceId);
    const repaired = rebuildAgentTestFixture({ db, bcrypt, env: validEnv, gate });
    assert.equal(repaired.mode, 'rebuilt');

    db.prepare(`
      DELETE FROM resources WHERE id = (
        SELECT object_id FROM agent_test_fixture_objects
        WHERE object_type = 'resource' AND object_key = 'house-a-tumbler-1'
      )
    `).run();
    const beforeRollback = abstractSnapshot(db);
    let hashes = 0;
    const failingBcrypt = {
      compareSync(value, hash) {
        return bcrypt.compareSync(value, hash);
      },
      hashSync(value, rounds) {
        hashes += 1;
        if (hashes === 2) throw new Error('SYNTHETIC_HASH_FAILURE');
        return bcrypt.hashSync(value, rounds);
      }
    };
    assert.throws(
      () => rebuildAgentTestFixture({ db, bcrypt: failingBcrypt, env: validEnv, gate }),
      /SYNTHETIC_HASH_FAILURE/
    );
    assert.deepEqual(abstractSnapshot(db), beforeRollback, 'Fehler muss die gesamte Fixture-Transaktion rollen');

    rebuildAgentTestFixture({ db, bcrypt, env: validEnv, gate });

    const auditCountBeforeAtomicFailure = db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count;
    hashes = 0;
    assert.throws(() => initializeDatabaseWithAgentTestFixture({
      db,
      bcrypt: failingBcrypt,
      env: validEnv,
      gate,
      initDatabase() {
        db.exec('CREATE TABLE fixture_init_created (id INTEGER PRIMARY KEY)');
        db.prepare(`
          INSERT INTO audit_log (target_type, target_id) VALUES ('fixture-init-probe', 'must-rollback')
        `).run();
        db.prepare(`
          DELETE FROM resources WHERE id = (
            SELECT object_id FROM agent_test_fixture_objects
            WHERE object_type = 'resource' AND object_key = 'house-a-washer'
          )
        `).run();
      },
      installServiceSchemas() {
        db.exec('CREATE TABLE fixture_schema_created (id INTEGER PRIMARY KEY)');
        db.prepare(`
          INSERT INTO audit_log (target_type, target_id) VALUES ('fixture-schema-probe', 'must-rollback')
        `).run();
      }
    }), /SYNTHETIC_HASH_FAILURE/);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count, auditCountBeforeAtomicFailure,
      'initDb, Service-Schema und Fixture muessen gemeinsam rollen');
    assert.equal(db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master
      WHERE type = 'table' AND name IN ('fixture_init_created', 'fixture_schema_created')
    `).get().count, 0, 'Auch Init-/Schema-DDL muss beim Fixturefehler vollstaendig rollen');

    const providerCalls = { email: 0, push: 0, network: 0 };
    const boundary = createAgentTestProviderBoundary({ db, gate });
    const mailTransport = createMailTransport({
      net: { connect() { providerCalls.network += 1; throw new Error('NETWORK_FORBIDDEN'); } },
      tls: { connect() { providerCalls.network += 1; throw new Error('NETWORK_FORBIDDEN'); } },
      env: { SMTP_HOST: 'must-not-leave.invalid', SMTP_FROM: 'fixture@example.invalid' },
      enabled: true
    });
    const fixtureMail = boundary.wrapMail(mailTransport.sendMail);
    const pushService = createPushService({
      db,
      webPush: {
        sendNotification() { providerCalls.push += 1; throw new Error('PROVIDER_FORBIDDEN'); },
        generateVAPIDKeys() { throw new Error('VAPID_GENERATION_FORBIDDEN'); },
        setVapidDetails() { throw new Error('VAPID_CONFIGURATION_FORBIDDEN'); }
      },
      env: {},
      getSetting() { return ''; },
      setSetting() {},
      smtpConfig: () => ({ enabled: false }),
      extractEmailAddress: (value) => value,
      publicAppUrl: () => EXPECTED.externalUrl,
      weekdayForDate: () => 1,
      providerSendNotification: boundary.wrapPush(async () => { providerCalls.push += 1; }),
      enabled: true
    });
    await fixtureMail({ to: 'must-not-leave@example.invalid' });
    await pushService.sendPushNotification({ endpoint: 'https://must-not-leave.invalid' }, 'payload');
    assert.deepEqual(providerCalls, { email: 0, push: 0, network: 0 });
    assert.deepEqual(boundary.status(), { simulatedEvents: 3, externalAttempts: 0 });
    let measuredProviderCalls = 0;
    const measuredBoundary = createAgentTestProviderBoundary({ db, gate: { enabled: false } });
    await measuredBoundary.wrapMail(async () => { measuredProviderCalls += 1; })();
    assert.equal(measuredProviderCalls, 1);
    assert.equal(measuredBoundary.status().externalAttempts, 1,
      'externalAttempts muss am tatsaechlich betretenen Providerpfad gemessen werden');
    assert.throws(() => measuredBoundary.assertNoExternalAttempts(), {
      code: 'AGENT_TEST_FIXTURE_EXTERNAL_ATTEMPT'
    });

    const fixtureSource = fs.readFileSync(path.join(projectRoot, 'src', 'services', 'agent-test-fixture.js'), 'utf8');
    const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
    const operationsSource = fs.readFileSync(path.join(projectRoot, 'src', 'routes', 'operations.js'), 'utf8');
    assert.doesNotMatch(fixtureSource, /\bfetch\s*\(|https?\.request|net\.connect|tls\.connect|sendMail|sendNotification|webPush/);
    assert.match(serverSource, /const sendMail = agentTestProviderBoundary\.wrapMail\(sendMailProvider\)/);
    assert.match(serverSource, /providerSendNotification: agentTestProviderBoundary\.wrapPush\(/);
    assert.match(serverSource, /createMaintenanceReporting\([\s\S]*sendPushNotification,[\s\S]*sendMail,/);
    assert.match(serverSource, /createNotificationService\([\s\S]*sendMail,/);
    assert.doesNotMatch(serverSource, /password_hash = CASE WHEN/,
      'Ein vorhandenes Seed-Konto darf ohne Reset keinen ungenutzten Legacy-Hash berechnen');
    assert.match(serverSource, /if \(forcePasswordReset\) \{[\s\S]*bcrypt\.hashSync\(password, 10\)/);
    for (const field of ['accounts', 'apartments', 'sessions']) {
      assert.match(operationsSource, new RegExp(`${field}: fixtureStatus\\.${field}`));
    }
    assert.match(operationsSource, /ready: fixtureStatus\.ready === true && fixtureStatus\.externalAttempts === 0/);
  } finally {
    db.close();
  }

  console.log('Agent-Test-Fixture: Guard, Transaktion, Idempotenz, Rollen und No-Send PASS.');
}

main().catch((error) => {
  console.error(error?.stack || error?.code || error?.message || 'AGENT_TEST_FIXTURE_TEST_FAILED');
  process.exitCode = 1;
});
