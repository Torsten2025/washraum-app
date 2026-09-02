'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const Database = require('better-sqlite3');
const { createBackupService } = require('../src/services/backup');
const { createMailTransport } = require('../src/services/mail-transport');
const { createOperationsService } = require('../src/services/operations');
const { createPushService } = require('../src/services/push');
const { formatStartupFailure } = require('../src/services/startup-diagnostics');
const { assertProductionSafety } = require('../src/services/production-safety');
const {
  FLAG_DEFAULTS,
  createRuntimeFlags,
  parseStrictBooleanFlag,
  publicRuntimeFlags
} = require('../src/services/runtime-flags');
const {
  EXPECTED_NODE_VERSION,
  EXPECTED_NPM_VERSION,
  detectNpmVersion,
  evaluateToolchain,
  formatGuardOutput
} = require('./toolchain-guard');

const projectRoot = path.resolve(__dirname, '..');
const adminPassword = 'Synthetic-Safety-Admin-2026!';
const omitted = Symbol('omitted');
const disabledFlagCases = [
  { name: 'false', value: ' FaLsE ', source: 'environment', valid: true },
  { name: 'missing', value: omitted, source: 'missing', valid: true },
  { name: 'empty', value: '   ', source: 'empty', valid: true },
  { name: 'invalid', value: 'definitely-not-enabled', source: 'invalid', valid: false }
];

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  child.kill();
  return new Promise((resolve) => child.once('exit', resolve));
}

async function waitForApp(baseUrl, output) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Safety-Testserver nicht erreichbar.\n${output.join('')}`);
}

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = '';
  }

  async request(route, options = {}) {
    const response = await fetch(`${this.baseUrl}${route}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(options.headers || {})
      }
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { response, body };
  }
}

async function expectStatus(client, route, status, options = {}) {
  const result = await client.request(route, options);
  assert.equal(result.response.status, status, `${route}: ${JSON.stringify(result.body)}`);
  return result;
}

async function verifyUnitKillSwitches() {
  const warnings = [];
  assert.deepEqual(FLAG_DEFAULTS, {
    BACKUP_ENABLED: false,
    EMAIL_ENABLED: false,
    PUSH_ENABLED: false
  });
  assert.deepEqual(
    parseStrictBooleanFlag({}, 'EXAMPLE_ENABLED', { warn: (message) => warnings.push(message) }),
    { enabled: false, source: 'missing', valid: true }
  );
  assert.deepEqual(
    parseStrictBooleanFlag(
      { EXAMPLE_ENABLED: ' TrUe ' },
      'EXAMPLE_ENABLED',
      { warn: (message) => warnings.push(message) }
    ),
    { enabled: true, source: 'environment', valid: true }
  );

  const channelNames = ['BACKUP_ENABLED', 'EMAIL_ENABLED', 'PUSH_ENABLED'];
  const parsedCases = [];
  for (const channelName of channelNames) {
    for (const flagCase of disabledFlagCases) {
      const env = {};
      if (flagCase.value !== omitted) env[channelName] = flagCase.value;
      const result = parseStrictBooleanFlag(env, channelName, {
        warn: (message) => warnings.push(message)
      });
      assert.deepEqual(result, {
        enabled: false,
        source: flagCase.source,
        valid: flagCase.valid
      }, `${channelName}/${flagCase.name}`);
      parsedCases.push(`${channelName}:${flagCase.name}`);
    }
  }
  assert.equal(warnings.length, channelNames.length);
  assert.ok(warnings.every((message) => !message.includes('definitely-not-enabled')));

  const explicitTrueFlags = createRuntimeFlags({
    env: {
      BACKUP_ENABLED: ' TRUE ',
      EMAIL_ENABLED: 'true',
      PUSH_ENABLED: 'TrUe'
    },
    logger: { warn() {} }
  });
  assert.deepEqual(publicRuntimeFlags(explicitTrueFlags), {
    backup: { enabled: true },
    email: { enabled: true },
    push: { enabled: true }
  });

  async function verifyDisabledFactories(label, enabledValue) {
    const backupCounters = { mkdir: 0, backup: 0, fetch: 0, setting: 0 };
    const backupOptions = {
      db: { backup: async () => { backupCounters.backup += 1; } },
      Database: function ForbiddenDatabase() { throw new Error('Backup-Verifikation darf nicht starten'); },
      fs: {
        mkdirSync() { backupCounters.mkdir += 1; },
        readdirSync() { throw new Error('Backup-Verzeichnis darf nicht gelesen werden'); }
      },
      path,
      env: {
        BACKUP_DIR: path.join(os.tmpdir(), `forbidden-backup-${label}`),
        BACKUP_UPLOAD_URL: 'https://provider.example.invalid/upload'
      },
      dbDir: os.tmpdir(),
      setSetting() { backupCounters.setting += 1; },
      fetchImpl: async () => {
        backupCounters.fetch += 1;
        throw new Error('Externer Backup-Versuch');
      }
    };
    if (enabledValue !== omitted) backupOptions.enabled = enabledValue;
    const backupService = createBackupService(backupOptions);
    assert.equal(backupService.enabled, false, `backup/${label}`);
    await assert.rejects(backupService.createVerifiedBackup(), { code: 'BACKUP_DISABLED' });
    assert.deepEqual(backupCounters, { mkdir: 0, backup: 0, fetch: 0, setting: 0 });

    const mailCounters = { net: 0, tls: 0 };
    const mailOptions = {
      net: { connect() { mailCounters.net += 1; throw new Error('SMTP-Verbindung'); } },
      tls: { connect() { mailCounters.tls += 1; throw new Error('SMTP-TLS-Verbindung'); } },
      env: {
        SMTP_HOST: 'smtp.example.invalid',
        SMTP_FROM: 'synthetic@example.invalid'
      }
    };
    if (enabledValue !== omitted) mailOptions.enabled = enabledValue;
    const mailTransport = createMailTransport(mailOptions);
    assert.deepEqual(mailTransport.emailStatus(), {
      enabled: false,
      configured: false,
      label: 'deaktiviert'
    }, `email/${label}`);
    assert.equal(mailTransport.smtpConfig().host, '');
    await assert.rejects(mailTransport.sendMail({
      config: { host: 'smtp.example.invalid', port: 465, secure: true },
      to: 'recipient@example.invalid',
      subject: 'Synthetic',
      text: 'Synthetic'
    }), { code: 'EMAIL_DISABLED' });
    assert.deepEqual(mailCounters, { net: 0, tls: 0 });

    const pushCounters = {
      generateKeys: 0,
      setVapid: 0,
      send: 0,
      getSetting: 0,
      setSetting: 0,
      db: 0
    };
    const pushOptions = {
      db: { prepare() { pushCounters.db += 1; throw new Error('Push-DB-Zugriff'); } },
      webPush: {
        generateVAPIDKeys() { pushCounters.generateKeys += 1; throw new Error('VAPID-Erzeugung'); },
        setVapidDetails() { pushCounters.setVapid += 1; throw new Error('VAPID-Konfiguration'); },
        async sendNotification() { pushCounters.send += 1; throw new Error('Push-Provider'); }
      },
      env: {
        VAPID_PUBLIC_KEY: 'synthetic-public',
        VAPID_PRIVATE_KEY: 'synthetic-private'
      },
      getSetting() { pushCounters.getSetting += 1; return ''; },
      setSetting() { pushCounters.setSetting += 1; },
      smtpConfig() { return { from: 'synthetic@example.invalid' }; },
      extractEmailAddress(value) { return value; },
      publicAppUrl() { return 'https://app.example.invalid'; },
      weekdayForDate() { return 1; }
    };
    if (enabledValue !== omitted) pushOptions.enabled = enabledValue;
    const pushService = createPushService(pushOptions);
    assert.equal(pushService.configuredVapidKeys().source, 'disabled');
    assert.equal(pushService.pushStatus().enabled, false);
    assert.equal(pushService.applyPushConfig({}).enabled, false);
    assert.deepEqual(
      await pushService.notifyPushSubscribers({}, {}, 'Synthetic'),
      { enabled: false, configured: false, sent: 0, failed: 0 }
    );
    await assert.rejects(
      pushService.sendPushNotification({ endpoint: 'https://push.example.invalid' }, '{}'),
      { code: 'PUSH_DISABLED' }
    );
    assert.deepEqual(pushCounters, {
      generateKeys: 0,
      setVapid: 0,
      send: 0,
      getSetting: 0,
      setSetting: 0,
      db: 0
    });

    let scheduledBackupCalls = 0;
    const runtimeFlags = enabledValue === omitted
      ? undefined
      : {
          backup: { enabled: enabledValue },
          email: { enabled: enabledValue },
          push: { enabled: enabledValue }
        };
    const operations = createOperationsService({
      db: {},
      crypto: {},
      getSetting() { return ''; },
      setSetting() { throw new Error('Backup-Status darf bei deaktiviertem Timer nicht geschrieben werden'); },
      createVerifiedBackup: async () => { scheduledBackupCalls += 1; },
      appVersion: '0.3.5-test.16',
      appRelease: 'synthetic',
      appReleasedAt: '2026-07-30T00:00:00.000Z',
      runtimeFlags
    });
    assert.deepEqual(operations.publicReleaseStatus().features, {
      backup: { enabled: false },
      email: { enabled: false },
      push: { enabled: false }
    }, `operations/${label}`);
    assert.deepEqual(await operations.runScheduledBackup(), {
      skipped: true,
      reason: 'BACKUP_DISABLED'
    });
    assert.equal(scheduledBackupCalls, 0);
  }

  for (const flagCase of disabledFlagCases) {
    const env = {};
    if (flagCase.value !== omitted) {
      env.BACKUP_ENABLED = flagCase.value;
      env.EMAIL_ENABLED = flagCase.value;
      env.PUSH_ENABLED = flagCase.value;
    }
    const flags = createRuntimeFlags({ env, logger: { warn() {} } });
    assert.deepEqual(publicRuntimeFlags(flags), {
      backup: { enabled: false },
      email: { enabled: false },
      push: { enabled: false }
    }, flagCase.name);
    await verifyDisabledFactories(flagCase.name, flags.backup.enabled);
  }
  await verifyDisabledFactories('factory-default-omitted', omitted);

  const enabledBackup = createBackupService({
    db: {},
    Database,
    fs,
    path,
    env: {},
    dbDir: os.tmpdir(),
    setSetting() {},
    fetchImpl: fetch,
    enabled: true
  });
  assert.equal(enabledBackup.enabled, true);
  assert.deepEqual(
    createMailTransport({ net, tls: {}, env: {}, enabled: true }).emailStatus(),
    { enabled: true, configured: false, label: 'nicht konfiguriert' }
  );

  const generatedSettings = new Map();
  let activePushProviderAttempts = 0;
  const activePush = createPushService({
    db: {
      prepare(sql) {
        if (/COUNT\(\*\).*push_subscriptions/is.test(sql)) return { get: () => ({ count: 0 }) };
        if (/SELECT ps\.id/is.test(sql)) return { all: () => [] };
        if (/UPDATE push_subscriptions/is.test(sql)) return { run() {} };
        throw new Error(`Unerwarteter Push-Testzugriff: ${sql}`);
      }
    },
    webPush: {
      generateVAPIDKeys() { return { publicKey: 'synthetic-public', privateKey: 'synthetic-private' }; },
      setVapidDetails() {},
      async sendNotification() { activePushProviderAttempts += 1; }
    },
    env: {},
    getSetting(key) { return generatedSettings.get(key) || ''; },
    setSetting(key, value) { generatedSettings.set(key, value); },
    smtpConfig() { return { from: '' }; },
    extractEmailAddress() { return ''; },
    publicAppUrl() { return 'https://app.example.invalid'; },
    weekdayForDate() { return 1; },
    enabled: true
  });
  assert.deepEqual(activePush.pushStatus(), {
    enabled: true,
    configured: true,
    label: 'bereit',
    publicKey: 'synthetic-public',
    keySource: 'database',
    activeSubscriptions: 0
  });
  assert.deepEqual(await activePush.notifyPushSubscribers({}, {
    house_id: 1,
    user_id: 1,
    resource_type: 'washer',
    booking_date: '2026-08-26',
    slot: 'morning'
  }, 'Synthetic'), { enabled: true, configured: true, sent: 0, failed: 0 });
  assert.equal(activePushProviderAttempts, 0);

  return {
    parsedCases,
    factoryCases: [...disabledFlagCases.map((entry) => entry.name), 'factory-default-omitted'],
    explicitTrue: 'production-guard-and-zero-subscriber-push-path',
    providerAttempts: 0,
    dnsAttempts: 0,
    queueWrites: 0,
    backupWrites: 0
  };
}

async function verifyPreMigrationBackupWithRuntimeBackupDisabled() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-pre-migration-'));
  const sourcePath = path.join(temporaryRoot, 'source.sqlite');
  const backupDir = path.join(temporaryRoot, 'backups');
  const db = new Database(sourcePath);
  db.exec('CREATE TABLE proof (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
  db.prepare('INSERT INTO proof (value) VALUES (?)').run('synthetic');
  const settings = new Map();
  let providerAttempts = 0;
  try {
    const service = createBackupService({
      db,
      Database,
      fs,
      path,
      env: {
        BACKUP_DIR: backupDir,
        BACKUP_UPLOAD_URL: 'https://provider.example.invalid/upload'
      },
      dbDir: temporaryRoot,
      setSetting(key, value) { settings.set(key, value); },
      fetchImpl: async () => { providerAttempts += 1; throw new Error('Provider darf nicht kontaktiert werden'); },
      enabled: false
    });
    await assert.rejects(service.createVerifiedBackup(), { code: 'BACKUP_DISABLED' });
    const status = await service.createVerifiedPreMigrationBackup();
    assert.equal(status.ok, true);
    assert.equal(status.uploaded, false);
    assert.match(status.filename, /^washplan-pre-migration-.*\.sqlite$/);
    assert.equal(providerAttempts, 0);
    assert.equal(settings.has('backup_status'), false);
    assert.equal(settings.has('pre_migration_backup_status'), true);
    const copy = new Database(path.join(backupDir, status.filename), { readonly: true, fileMustExist: true });
    assert.equal(copy.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(copy.prepare('SELECT value FROM proof').get().value, 'synthetic');
    copy.close();
    return { created: true, integrity: 'ok', providerAttempts };
  } finally {
    db.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function verifyBlueprintsAndVersion() {
  const packageInfo = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  const serviceWorker = fs.readFileSync(path.join(projectRoot, 'public', 'sw.js'), 'utf8');
  const envExample = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
  const staging = fs.readFileSync(path.join(projectRoot, 'render.staging.yaml'), 'utf8');
  const agentTest = fs.readFileSync(path.join(projectRoot, 'render.agent-test.yaml'), 'utf8');
  const production = fs.readFileSync(path.join(projectRoot, 'render.yaml'), 'utf8');
  const fixtureSource = fs.readFileSync(path.join(projectRoot, 'src', 'services', 'agent-test-fixture.js'), 'utf8');
  const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  const startupSource = fs.readFileSync(path.join(projectRoot, 'startup.js'), 'utf8');
  const startupDiagnostics = fs.readFileSync(path.join(projectRoot, 'src', 'services', 'startup-diagnostics.js'), 'utf8');
  const publicAppSource = fs.readFileSync(path.join(projectRoot, 'public', 'app.js'), 'utf8');
  const publicI18nSource = fs.readFileSync(path.join(projectRoot, 'public', 'i18n.js'), 'utf8');
  const handbook = fs.readFileSync(path.join(projectRoot, 'HANDBUCH.md'), 'utf8');
  const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
  const testPlan = fs.readFileSync(path.join(projectRoot, 'TESTPLAN_GESAMTAUDIT.md'), 'utf8');

  assert.equal(packageInfo.version, '0.3.5-test.16');
  assert.equal(packageInfo.packageManager, 'npm@10.9.8');
  assert.equal(packageInfo.scripts.start, 'node startup.js');
  assert.equal(lock.version, '0.3.5-test.16');
  assert.equal(lock.packages[''].version, '0.3.5-test.16');
  assert.ok(serviceWorker.includes("const CACHE_NAME = 'waschzeit-pwa-v0.3.5-test.16';"));
  assert.match(envExample, /^BACKUP_ENABLED=false$/m);
  assert.match(envExample, /^EMAIL_ENABLED=false$/m);
  assert.match(envExample, /^PRODUCTION_EMAIL_APPROVED=false$/m);
  assert.match(envExample, /^PUSH_ENABLED=false$/m);
  assert.match(envExample, /^PRODUCTION_PUSH_APPROVED=false$/m);
  for (const publicSource of [publicAppSource, publicI18nSource]) {
    assert.doesNotMatch(publicSource, /SEED_ADMIN_FORCE_PASSWORD_RESET\s*=\s*true/i);
    assert.doesNotMatch(publicSource, /SEED_ADMIN_PASSWORD (?:setzen|set)/i);
  }
  assert.match(publicAppSource, /SEED_ADMIN_FORCE_PASSWORD_RESET muss fehlen oder false bleiben/);
  assert.match(publicI18nSource, /SEED_ADMIN_FORCE_PASSWORD_RESET must remain absent or false/);
  assert.match(publicAppSource, /async function loadCalendarFeedStatus\(\) \{\s*clearCalendarFeedSecret\(\);/);
  assert.match(publicAppSource, /function closeSettings\(\) \{\s*clearCalendarFeedSecret\(\);/);
  assert.match(publicAppSource, /function clearCalendarFeedSecret\(\) \{\s*calendarFeedUrl\.value = '';\s*calendarFeedUrlWrap\.hidden = true;\s*copyCalendarFeedButton\.hidden = true;/);
  for (const auditKey of ['audit.houseBookingRuleMode', 'audit.calendarFeedRotate', 'audit.calendarFeedRevoke']) {
    assert.match(publicI18nSource, new RegExp(`'${auditKey}'`));
    assert.match(publicAppSource, new RegExp(`'${auditKey}'`));
  }

  assert.match(staging, /name: waschplan-staging-test7/);
  assert.match(staging, /branch: codex\/staging/);
  assert.match(staging, /autoDeployTrigger: off/);
  assert.match(staging, /plan: free/);
  assert.match(staging, /buildCommand: npm ci/);
  assert.match(staging, /healthCheckPath: \/api\/health/);
  assert.match(staging, /DB_PATH[\s\S]*value: \/tmp\/waschplan-staging\.sqlite/);
  assert.match(staging, /BACKUP_ENABLED[\s\S]*value: false/);
  assert.match(staging, /EMAIL_ENABLED[\s\S]*value: false/);
  assert.match(staging, /PUSH_ENABLED[\s\S]*value: false/);
  assert.match(staging, /SESSION_SECRET\s*\n\s*sync: false/);
  assert.doesNotMatch(staging, /NODE_VERSION/);
  assert.doesNotMatch(staging, /\bdisk:/);
  assert.doesNotMatch(staging, /SMTP_|VAPID_|BACKUP_UPLOAD_|envVarGroups/);

  assert.match(agentTest, /name: waschzeit-agent-test/);
  assert.match(agentTest, /region: frankfurt/);
  assert.match(agentTest, /^    branch: codex\/agent-test$/m);
  assert.match(agentTest, /autoDeployTrigger: commit/);
  assert.match(agentTest, /plan: free/);
  assert.match(agentTest, /^    buildCommand: node scripts\/toolchain-guard\.js && npm ci$/m);
  assert.match(agentTest, /- key: NODE_VERSION\s*\n\s*value: 22\.23\.1/);
  assert.equal((agentTest.match(/^\s*- key: NODE_VERSION$/gm) || []).length, 1);
  assert.doesNotMatch(agentTest, /\bNPM_VERSION\b/);
  assert.doesNotMatch(agentTest, /npm (?:install|i) (?:--global|-g)|\bnpx\b|\bcorepack\b/);
  assert.match(agentTest, /startCommand: npm start/);
  assert.match(agentTest, /healthCheckPath: \/api\/health/);
  assert.match(agentTest, /APP_ENV[\s\S]*value: agent-test/);
  assert.match(agentTest, /APP_RELEASE[\s\S]*value: agent-v0\.3\.4/);
  assert.match(agentTest, /DB_PATH[\s\S]*value: \/tmp\/waschzeit-agent-test\.sqlite/);
  assert.match(agentTest, /SESSION_SECRET\s*\n\s*generateValue: true/);
  assert.match(agentTest, /SEED_ADMIN_PASSWORD\s*\n\s*sync: false/);
  assert.match(agentTest, /HOUSE_CODE\s*\n\s*generateValue: true/);
  assert.match(agentTest, /PUBLIC_APP_URL[\s\S]*value: https:\/\/waschzeit-agent-test\.onrender\.com/);
  assert.match(agentTest, /AGENT_TEST_FIXTURE_ENABLED\s*\n\s*value: true/);
  assert.equal((agentTest.match(/^\s*- key: AGENT_TEST_FIXTURE_ENABLED$/gm) || []).length, 1);
  assert.match(agentTest, /AGENT_TEST_FIXTURE_ORIGIN[\s\S]*value: https:\/\/waschzeit-agent-test\.onrender\.com/);
  assert.match(agentTest, /AGENT_TEST_EXPECTED_COMMIT\s*\n\s*sync: false/);
  for (const key of [
    'AGENT_TEST_RESIDENT_PASSWORD',
    'AGENT_TEST_HOUSEADMIN_PASSWORD',
    'AGENT_TEST_SUPERADMIN_PASSWORD'
  ]) {
    assert.match(agentTest, new RegExp(`${key}\\s*\\n\\s*sync: false`));
    assert.equal((agentTest.match(new RegExp(`^\\s*- key: ${key}$`, 'gm')) || []).length, 1);
  }
  assert.equal((agentTest.match(/^\s*sync: false$/gm) || []).length, 5);
  assert.match(agentTest, /BACKUP_ENABLED[\s\S]*value: false/);
  assert.match(agentTest, /AUTO_BACKUP[\s\S]*value: false/);
  assert.match(agentTest, /EMAIL_ENABLED[\s\S]*value: false/);
  assert.match(agentTest, /PUSH_ENABLED[\s\S]*value: false/);
  assert.doesNotMatch(agentTest, /\bdisk:/);
  assert.doesNotMatch(agentTest, /SMTP_|VAPID_|BACKUP_UPLOAD_|envVarGroups/);
  assert.match(fixtureSource, /serviceId: 'srv-d9m4majm8hqs739ssq20'/);
  assert.match(fixtureSource, /exact\(env, 'NODE_ENV', 'production'\)/);
  assert.match(fixtureSource, /runtimeCommit === expectedCommit/);
  assert.match(fixtureSource, /exact\(env, 'DB_PATH', EXPECTED\.databasePath\)/);
  assert.match(fixtureSource, /AGENT_TEST_FIXTURE_PROVIDER_BINDING_FORBIDDEN/);
  assert.match(fixtureSource, /FIXTURE_POLICY: 0x1/);
  assert.match(fixtureSource, /FIXTURE_DISTINCT: 0x2/);
  assert.match(fixtureSource, /SEED_POLICY: 0x4/);
  assert.match(fixtureSource, /FIXTURE_SEED_OVERLAP: 0x8/);
  assert.match(fixtureSource, /fixtureCredentialValidity = credentials\.map/);
  assert.match(fixtureSource, /fixtureSeedMatches = credentials\.map/);
  assert.match(fixtureSource, /credentialFailMask =[\s\S]*FIXTURE_POLICY[\s\S]*FIXTURE_DISTINCT[\s\S]*SEED_POLICY[\s\S]*FIXTURE_SEED_OVERLAP/);
  for (const key of [
    'ALLOW_LEGACY_HOUSE_REGISTRATION',
    'ALLOW_TEST_INVITATION_LINK',
    'SEED_ADMIN_FORCE_PASSWORD_RESET'
  ]) {
    assert.match(fixtureSource, new RegExp(`missingOrFalse\\(env, key\\)`));
    assert.match(fixtureSource, new RegExp(key));
  }
  assert.match(fixtureSource, /externalAttempts \+= 1/);
  assert.match(fixtureSource, /AGENT_TEST_FIXTURE_EXTERNAL_ATTEMPT/);
  assert.match(fixtureSource, /AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID/);
  assert.match(startupSource, /process\.once\('uncaughtException', fail\)/);
  assert.match(startupSource, /process\.once\('unhandledRejection', fail\)/);
  assert.match(startupSource, /finally \{\s*process\.exit\(1\);\s*\}/);
  assert.doesNotMatch(startupSource, /process\.exitCode\s*=/);
  assert.match(startupDiagnostics, /WASCHZEIT_STARTFAIL class=/);
  assert.match(startupDiagnostics, /STARTUP_ABORT class=GUARD_CREDENTIALS failMask=0x/);
  assert.match(startupDiagnostics, /fs\.writeSync\(2, output, offset, output\.length - offset\)/);
  assert.doesNotMatch(startupDiagnostics, /process\.stderr\.write/);
  assert.doesNotMatch(startupDiagnostics, /error\?\.message|error\?\.stack|JSON\.stringify\(error/);
  const credentialMarker = formatStartupFailure({
    code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID',
    failMask: 0xf,
    message: 'canary-secret C:\\private\\credential.env'
  });
  assert.equal(credentialMarker, 'STARTUP_ABORT class=GUARD_CREDENTIALS failMask=0xF');
  assert.doesNotMatch(credentialMarker, /canary|private|credential\.env|AGENT_TEST_|SEED_ADMIN|Password|\\|\/[A-Za-z]/i);
  for (const failMask of [0, 0x10, NaN, null]) {
    assert.equal(formatStartupFailure({
      code: 'AGENT_TEST_FIXTURE_CREDENTIALS_INVALID',
      failMask
    }), 'WASCHZEIT_STARTFAIL class=STARTUP');
  }
  for (const document of [handbook, readme, testPlan]) {
    assert.doesNotMatch(document, /codex\/agent-test11/);
  }
  assert.match(handbook, /Save only/);
  assert.match(handbook, /refs\/heads\/codex\/agent-test/);
  assert.match(handbook, /genau eine neue AutoDeploy-ID/);
  assert.match(testPlan, /AutoDeploy-Umschaltung, Manual Deploy, Restart, Hook, Blueprint-Sync, zweiter Push oder Retry sind ausgeschlossen/);
  assert.doesNotMatch(staging, /AGENT_TEST_FIXTURE_|AGENT_TEST_(?:RESIDENT|HOUSEADMIN|SUPERADMIN)_PASSWORD/);
  assert.doesNotMatch(production, /AGENT_TEST_FIXTURE_|AGENT_TEST_(?:RESIDENT|HOUSEADMIN|SUPERADMIN)_PASSWORD/);
  assert.doesNotMatch(envExample, /AGENT_TEST_FIXTURE_|AGENT_TEST_(?:RESIDENT|HOUSEADMIN|SUPERADMIN)_PASSWORD/);

  assert.match(production, /name: waschplan-app[\s\S]*branch: master/);
  assert.match(production, /buildCommand: npm ci/);
  assert.match(production, /SESSION_SECRET\s*\n\s*sync: false/);
  assert.doesNotMatch(production, /NODE_VERSION/);
  assert.match(production, /DB_PATH[\s\S]*value: \/var\/data\/washraum\.sqlite/);
  assert.match(production, /mountPath: \/var\/data/);
  assert.match(production, /BACKUP_ENABLED[\s\S]*value: false/);
  assert.match(production, /APP_ENV[\s\S]*value: production/);
  assert.match(production, /WEB_CONCURRENCY[\s\S]*value: 1/);
  assert.match(production, /AUTO_BACKUP[\s\S]*value: false/);
  assert.match(production, /EMAIL_ENABLED[\s\S]*value: false/);
  assert.match(production, /PRODUCTION_EMAIL_APPROVED[\s\S]*value: false/);
  assert.match(production, /PUSH_ENABLED[\s\S]*value: false/);
  assert.match(production, /PRODUCTION_PUSH_APPROVED[\s\S]*value: false/);
  assert.doesNotMatch(production, /KOPIA_|R2_|AWS_|BACKUP_UPLOAD_|SMTP_|VAPID_/);
  assert.match(serverSource, /runtimeFlags\.backup\.enabled === true\s*\n\s*&& String\(process\.env\.AUTO_BACKUP/);
  assert.doesNotMatch(serverSource, /runtimeFlags\.backup\.enabled === true\s*\n\s*&& \(isProduction/);
}

function verifyLeanProductionSafety() {
  const validProductionEnv = () => ({
    NODE_ENV: 'production',
    APP_ENV: 'production',
    WEB_CONCURRENCY: '1',
    BACKUP_ENABLED: 'false',
    AUTO_BACKUP: 'false',
    EMAIL_ENABLED: 'false',
    PUSH_ENABLED: 'false'
  });
  assert.deepEqual(assertProductionSafety({
    env: validProductionEnv(),
    dbPath: '/var/data/washraum.sqlite'
  }), {
    production: true,
    dbPath: path.resolve('/var/data/washraum.sqlite'),
    singleInstance: true,
    providersHeld: true,
    fixtureDisabled: true,
    emailApproved: false,
    pushApproved: false
  });

  assert.deepEqual(assertProductionSafety({
    env: {
      ...validProductionEnv(),
      PUSH_ENABLED: 'true',
      PRODUCTION_PUSH_APPROVED: 'true'
    },
    dbPath: '/var/data/washraum.sqlite'
  }), {
    production: true,
    dbPath: path.resolve('/var/data/washraum.sqlite'),
    singleInstance: true,
    providersHeld: true,
    fixtureDisabled: true,
    emailApproved: false,
    pushApproved: true
  });

  assert.deepEqual(assertProductionSafety({
    env: {
      ...validProductionEnv(),
      EMAIL_ENABLED: 'true',
      PRODUCTION_EMAIL_APPROVED: 'true',
      SMTP_HOST: 'smtp.example.invalid',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'synthetic-user',
      SMTP_PASSWORD: 'SECRET-CANARY-MUST-NOT-PRINT',
      SMTP_FROM: 'WaschZeit <synthetic@example.invalid>'
    },
    dbPath: '/var/data/washraum.sqlite'
  }), {
    production: true,
    dbPath: path.resolve('/var/data/washraum.sqlite'),
    singleInstance: true,
    providersHeld: true,
    fixtureDisabled: true,
    emailApproved: true,
    pushApproved: false
  });

  assert.throws(() => assertProductionSafety({
    env: {
      ...validProductionEnv(),
      EMAIL_ENABLED: 'true',
      PRODUCTION_EMAIL_APPROVED: 'true'
    },
    dbPath: '/var/data/washraum.sqlite'
  }), { code: 'PRODUCTION_EMAIL_CONFIG' });

  for (const [name, value, code] of [
    ['DB_PATH', '/tmp/production.sqlite', 'PRODUCTION_STORAGE'],
    ['WEB_CONCURRENCY', '2', 'PRODUCTION_CONCURRENCY'],
    ['BACKUP_ENABLED', 'true', 'PRODUCTION_FEATURE_HOLD'],
    ['EMAIL_ENABLED', 'true', 'PRODUCTION_FEATURE_HOLD'],
    ['PUSH_ENABLED', 'true', 'PRODUCTION_FEATURE_HOLD'],
    ['AGENT_TEST_FIXTURE_ENABLED', 'true', 'PRODUCTION_FEATURE_HOLD'],
    ['SEED_ADMIN_FORCE_PASSWORD_RESET', 'true', 'PRODUCTION_FEATURE_HOLD'],
    ['BACKUP_UPLOAD_URL', 'https://provider.invalid/upload', 'PRODUCTION_PROVIDER_BINDING'],
    ['SMTP_PASSWORD', 'SECRET-CANARY-MUST-NOT-PRINT', 'PRODUCTION_PROVIDER_BINDING'],
    ['VAPID_PRIVATE_KEY', 'SECRET-CANARY-MUST-NOT-PRINT', 'PRODUCTION_PROVIDER_BINDING'],
    ['R2_ACCESS_KEY_ID', 'SECRET-CANARY-MUST-NOT-PRINT', 'PRODUCTION_PROVIDER_BINDING']
  ]) {
    const env = validProductionEnv();
    if (name !== 'DB_PATH') env[name] = value;
    assert.throws(() => assertProductionSafety({
      env,
      dbPath: name === 'DB_PATH' ? value : '/var/data/washraum.sqlite'
    }), { code });
  }

  for (const appEnvironment of [undefined, '', 'staging', 'unknown']) {
    const env = validProductionEnv();
    if (appEnvironment === undefined) delete env.APP_ENV;
    else env.APP_ENV = appEnvironment;
    assert.throws(() => assertProductionSafety({
      env,
      dbPath: '/var/data/washraum.sqlite'
    }), { code: 'PRODUCTION_TARGET' });
  }
  assert.throws(() => assertProductionSafety({
    env: { ...validProductionEnv(), NODE_ENV: 'development' },
    dbPath: '/var/data/washraum.sqlite'
  }), { code: 'PRODUCTION_ENV' });
  assert.deepEqual(assertProductionSafety({
    env: { NODE_ENV: 'production', APP_ENV: 'agent-test' },
    dbPath: '/tmp/waschzeit-agent-test.sqlite',
    agentTestAllowed: true
  }), { production: false, agentTest: true });
  assert.throws(() => assertProductionSafety({
    env: { NODE_ENV: 'production', APP_ENV: 'agent-test' },
    dbPath: '/tmp/waschzeit-agent-test.sqlite'
  }), { code: 'PRODUCTION_TARGET' });

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-production-target-'));
  const blockedDirectory = path.join(root, 'must-not-exist');
  const blockedDbPath = path.join(blockedDirectory, 'blocked.sqlite');
  try {
    const blocked = spawnSync(process.execPath, ['startup.js'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        NODE_ENV: 'production',
        APP_ENV: '',
        DB_PATH: blockedDbPath,
        PORT: '0'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.notEqual(blocked.status, 0);
    assert.equal(blocked.stdout, '');
    assert.equal(blocked.stderr.trim(), 'WASCHZEIT_STARTFAIL class=GUARD_PRODUCTION');
    assert.equal(fs.existsSync(blockedDirectory), false, 'ungueltige Produktionsidentitaet darf kein Verzeichnis oder SQLite-Artefakt anlegen');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function verifyProductionBackupTool() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-backup-verify-'));
  const databasePath = path.join(root, 'backup.sqlite');
  const verifierPath = path.join(projectRoot, 'scripts', 'verify-production-backup.js');
  try {
    const db = new Database(databasePath);
    db.exec(`
      CREATE TABLE houses (id INTEGER PRIMARY KEY, name TEXT, code TEXT, active INTEGER);
      CREATE TABLE users (
        id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT,
        house_id INTEGER, is_superadmin INTEGER, active INTEGER
      );
      CREATE TABLE apartments (
        id INTEGER PRIMARY KEY, house_id INTEGER, label TEXT, claimed_by INTEGER, active INTEGER
      );
      CREATE TABLE resources (id INTEGER PRIMARY KEY, name TEXT, type TEXT, house_id INTEGER, active INTEGER);
      CREATE TABLE bookings (
        id INTEGER PRIMARY KEY, user_id INTEGER, resource_id INTEGER, booking_date TEXT, slot TEXT
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    `);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, house_id, is_superadmin, active)
      VALUES (?, 'hash', 'user', NULL, 0, 1)
    `).run('PII-CANARY-MUST-NOT-PRINT');
    db.close();

    const result = spawnSync(process.execPath, [verifierPath, databasePath], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stderr, '');
    assert.doesNotMatch(result.stdout, /PII-CANARY-MUST-NOT-PRINT/);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.schemaContract, 'waschzeit-production-schema-v1');
    assert.match(report.schemaSha256, /^[0-9a-f]{64}$/);
    assert.equal(report.tableCounts.users, 1);
    assert.equal(report.personalDataPrinted, false);
    assert.match(report.sha256, /^[0-9a-f]{64}$/);

    const foreignPath = path.join(root, 'foreign.sqlite');
    const foreignDb = new Database(foreignPath);
    foreignDb.exec('CREATE TABLE residents (id INTEGER PRIMARY KEY, private_name TEXT NOT NULL)');
    foreignDb.prepare('INSERT INTO residents (private_name) VALUES (?)').run('PII-CANARY-MUST-NOT-PRINT');
    foreignDb.close();
    const foreign = spawnSync(process.execPath, [verifierPath, foreignPath], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.notEqual(foreign.status, 0);
    assert.equal(foreign.stdout, '');
    assert.equal(foreign.stderr, 'BACKUP_VERIFY_FAIL schema_contract\n');
    assert.doesNotMatch(foreign.stderr, /PII-CANARY-MUST-NOT-PRINT/);

    const invalidPath = path.join(root, 'invalid.sqlite');
    fs.writeFileSync(invalidPath, 'not-a-database');
    const invalid = spawnSync(process.execPath, [verifierPath, invalidPath], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /^BACKUP_VERIFY_FAIL /);
    return {
      validBackup: true,
      foreignSchemaRejected: true,
      corruptBackupRejected: true,
      personalDataPrinted: false
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function verifyToolchainContract() {
  const passing = evaluateToolchain({
    nodeVersion: '22.23.1',
    npmVersion: '10.9.8'
  });
  assert.equal(passing.ok, true);
  assert.deepEqual(passing.failures, []);

  const failingCases = [
    { nodeVersion: '24.14.1', npmVersion: '10.9.8', failure: 'NODE_VERSION_MISMATCH' },
    { nodeVersion: '22.23.0', npmVersion: '10.9.8', failure: 'NODE_VERSION_MISMATCH' },
    { nodeVersion: '22.23.1', npmVersion: '10.9.7', failure: 'NPM_VERSION_MISMATCH' },
    { nodeVersion: '22.23.1', npmVersion: '10.9.9', failure: 'NPM_VERSION_MISMATCH' },
    { nodeVersion: '', npmVersion: '10.9.8', failure: 'NODE_VERSION_MISSING' },
    { nodeVersion: 'invalid', npmVersion: '10.9.8', failure: 'NODE_VERSION_INVALID' },
    { nodeVersion: '22.23.1', npmVersion: '', failure: 'NPM_VERSION_MISSING' },
    { nodeVersion: '22.23.1', npmVersion: 'invalid', failure: 'NPM_VERSION_INVALID' }
  ];
  for (const testCase of failingCases) {
    const result = evaluateToolchain(testCase);
    assert.equal(result.ok, false);
    assert.ok(result.failures.includes(testCase.failure));
  }

  const missingExecutable = detectNpmVersion({
    platform: 'win32',
    nodeExecutable: 'C:\\synthetic\\node.exe',
    existsSync: () => false,
    spawnSyncImpl() {
      throw new Error('spawn must not run without an npm CLI');
    }
  });
  assert.deepEqual(missingExecutable, {
    ok: false,
    failure: 'NPM_EXECUTABLE_NOT_FOUND',
    version: ''
  });
  const failedDetection = detectNpmVersion({
    platform: 'linux',
    spawnSyncImpl: () => ({ status: 1, error: null, stdout: '' })
  });
  assert.deepEqual(failedDetection, {
    ok: false,
    failure: 'NPM_VERSION_DETECTION_FAILED',
    version: ''
  });
  const negativeOutput = formatGuardOutput(evaluateToolchain({
    nodeVersion: '24.14.1',
    npmVersion: '10.9.7'
  }));
  assert.match(negativeOutput, /^TOOLCHAIN_GUARD_FAIL classes=/);
  assert.match(negativeOutput, /NODE_VERSION_MISMATCH/);
  assert.match(negativeOutput, /NPM_VERSION_MISMATCH/);
  assert.match(negativeOutput, /expected_node=22\.23\.1 actual_node=24\.14\.1/);
  assert.match(negativeOutput, /expected_npm=10\.9\.8 actual_npm=10\.9\.7/);

  const guardPath = path.join(projectRoot, 'scripts', 'toolchain-guard.js');
  const guardSource = fs.readFileSync(guardPath, 'utf8');
  assert.doesNotMatch(guardSource, /\bnpx\b|\bcorepack\b|npm\s+(?:install|i)\b|https?:\/\//i);
  const actual = spawnSync(process.execPath, [guardPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, npm_config_update_notifier: 'false' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert.equal(actual.status, 0, actual.stderr || actual.stdout);
  assert.equal(actual.stderr, '');
  assert.match(actual.stdout, /^TOOLCHAIN_GUARD_OK /);
  assert.match(actual.stdout, new RegExp(`expected_node=${EXPECTED_NODE_VERSION}`));
  assert.match(actual.stdout, new RegExp(`expected_npm=${EXPECTED_NPM_VERSION}`));

  return {
    expectedNode: EXPECTED_NODE_VERSION,
    expectedNpm: EXPECTED_NPM_VERSION,
    positiveCases: 1,
    negativeCases: failingCases.length + 2,
    networkAttempts: 0,
    installationAttempts: 0
  };
}

async function verifyRuntimeScenario(flagCase) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `waschzeit-safety-${flagCase.name}-`));
  const databasePath = path.join(temporaryRoot, 'safety.sqlite');
  const backupDirectory = path.join(temporaryRoot, 'backups');
  const providerCounters = { backupHttp: 0, smtpTcp: 0 };
  const providerServer = http.createServer((request, response) => {
    providerCounters.backupHttp += 1;
    response.writeHead(500).end();
  });
  const smtpServer = net.createServer((socket) => {
    providerCounters.smtpTcp += 1;
    socket.destroy();
  });
  const portHolder = net.createServer();
  let child;
  const output = [];

  try {
    const providerPort = await listen(providerServer);
    const smtpPort = await listen(smtpServer);
    const appPort = await listen(portHolder);
    await closeServer(portHolder);
    const baseUrl = `http://127.0.0.1:${appPort}`;

    const childEnv = {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(appPort),
      DB_PATH: databasePath,
      BACKUP_DIR: backupDirectory,
      BACKUP_UPLOAD_URL: `http://127.0.0.1:${providerPort}/backup/{filename}`,
      BACKUP_UPLOAD_TOKEN: 'synthetic-upload-token',
      AUTO_BACKUP: 'true',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SMTP_FROM: 'synthetic@example.invalid',
      SMTP_USER: 'synthetic-user',
      SMTP_PASSWORD: 'synthetic-password',
      VAPID_PUBLIC_KEY: 'synthetic-public',
      VAPID_PRIVATE_KEY: 'synthetic-private',
      VAPID_SUBJECT: 'mailto:synthetic@example.invalid',
      SEED_ADMIN_NAME: 'safety-admin',
      SEED_ADMIN_PASSWORD: adminPassword,
      SESSION_SECRET: 'synthetic-runtime-safety-session-secret-2026'
    };
    delete childEnv.BACKUP_ENABLED;
    delete childEnv.EMAIL_ENABLED;
    delete childEnv.PUSH_ENABLED;
    if (flagCase.value !== omitted) {
      childEnv.BACKUP_ENABLED = flagCase.value;
      childEnv.EMAIL_ENABLED = flagCase.value;
      childEnv.PUSH_ENABLED = flagCase.value;
    }

    child = spawn(process.execPath, ['server.js'], {
      cwd: projectRoot,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    await waitForApp(baseUrl, output);

    const guest = new ApiClient(baseUrl);
    const admin = new ApiClient(baseUrl);
    const health = await expectStatus(guest, '/api/health', 200);
    assert.equal(health.body.version, '0.3.5-test.16');
    assert.deepEqual(health.body.features, {
      backup: { enabled: false },
      email: { enabled: false },
      push: { enabled: false }
    });

    await expectStatus(admin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'safety-admin', password: adminPassword })
    });

    for (const [route, options] of [
      ['/api/admin/backup', {}],
      ['/api/admin/backup/run', { method: 'POST', body: '{}' }],
      ['/api/admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify({ active: true, currentPassword: adminPassword })
      }],
      ['/api/admin/pilot-accounts', {
        method: 'DELETE',
        body: JSON.stringify({
          confirm: 'ALLE TESTKONTEN LOESCHEN',
          currentPassword: adminPassword
        })
      }]
    ]) {
      const result = await expectStatus(admin, route, 503, options);
      assert.equal(result.body.code, 'BACKUP_DISABLED');
      assert.equal(result.body.error, 'Backups sind in dieser Umgebung deaktiviert.');
    }

    const emailTest = await expectStatus(admin, '/api/admin/email-test', 503, {
      method: 'POST',
      body: '{}'
    });
    assert.equal(emailTest.body.code, 'EMAIL_DISABLED');
    assert.equal(emailTest.body.error, 'E-Mail ist in dieser Umgebung deaktiviert.');

    const pushKey = await expectStatus(admin, '/api/push/public-key', 200);
    assert.equal(pushKey.body.enabled, false);
    assert.equal(pushKey.body.configured, false);
    assert.equal(pushKey.body.publicKey, '');

    const pushSubscribe = await expectStatus(admin, '/api/push/subscriptions', 503, {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: `http://127.0.0.1:${providerPort}/push`,
          keys: { p256dh: 'synthetic', auth: 'synthetic' }
        }
      })
    });
    assert.equal(pushSubscribe.body.code, 'PUSH_DISABLED');
    assert.equal(pushSubscribe.body.error, 'Push-Benachrichtigungen sind in dieser Umgebung deaktiviert.');

    const pushTest = await expectStatus(admin, '/api/admin/push-test', 503, {
      method: 'POST',
      body: JSON.stringify({ userId: 'all' })
    });
    assert.equal(pushTest.body.code, 'PUSH_DISABLED');
    assert.equal(pushTest.body.error, 'Push-Benachrichtigungen sind in dieser Umgebung deaktiviert.');

    const overview = await expectStatus(admin, '/api/admin/overview', 200);
    assert.equal(overview.body.backupEnabled, false);
    assert.equal(overview.body.externalBackupConfigured, false);
    assert.equal(overview.body.email.enabled, false);
    assert.equal(overview.body.push.enabled, false);

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.deepEqual(providerCounters, { backupHttp: 0, smtpTcp: 0 });
    assert.equal(fs.existsSync(backupDirectory), false);

    const checkDb = new Database(databasePath, { readonly: true, fileMustExist: true });
    assert.equal(checkDb.prepare('SELECT COUNT(*) AS count FROM push_subscriptions').get().count, 0);
    assert.equal(checkDb.prepare('SELECT COUNT(*) AS count FROM email_verification_tokens').get().count, 0);
    assert.equal(checkDb.prepare('SELECT COUNT(*) AS count FROM password_reset_tokens').get().count, 0);
    assert.equal(
      checkDb.prepare("SELECT COUNT(*) AS count FROM settings WHERE key IN ('vapid_public_key', 'vapid_private_key', 'backup_status')").get().count,
      0
    );
    assert.equal(
      checkDb.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action LIKE 'backup.%' OR action LIKE 'push.%' OR action LIKE 'maintenance.%' OR action = 'users.pilot_reset'").get().count,
      0
    );
    checkDb.close();

    const combinedOutput = output.join('');
    assert.match(combinedOutput, /Integrationen: Backup=deaktiviert, E-Mail=deaktiviert, Push=deaktiviert/);
    assert.ok(!combinedOutput.includes('synthetic-upload-token'));
    assert.ok(!combinedOutput.includes('synthetic-password'));
    if (flagCase.name === 'invalid') {
      assert.match(combinedOutput, /BACKUP_ENABLED ist ungueltig/);
      assert.match(combinedOutput, /EMAIL_ENABLED ist ungueltig/);
      assert.match(combinedOutput, /PUSH_ENABLED ist ungueltig/);
      assert.ok(!combinedOutput.includes('definitely-not-enabled'));
    }
    return {
      case: flagCase.name,
      providerCounters,
      ports: { app: appPort, backupTrap: providerPort, smtpTrap: smtpPort },
      temporaryDatabase: databasePath,
      fixture: 'synthetic-superadmin-only',
      networkScope: '127.0.0.1-only',
      providerAttempts: 0
    };
  } finally {
    await stopProcess(child);
    await closeServer(providerServer);
    await closeServer(smtpServer);
    await closeServer(portHolder);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

async function verifyRuntimeRoutes() {
  const scenarios = [];
  for (const flagCase of disabledFlagCases) {
    const scenario = await verifyRuntimeScenario(flagCase);
    assert.equal(fs.existsSync(path.dirname(scenario.temporaryDatabase)), false, `${flagCase.name}: TEMP nicht bereinigt`);
    scenarios.push({ ...scenario, cleaned: true });
  }
  return {
    scenarios,
    temporaryDatabasesCleaned: true,
    providerAttempts: 0
  };
}

async function run() {
  verifyBlueprintsAndVersion();
  verifyLeanProductionSafety();
  const productionBackup = verifyProductionBackupTool();
  const toolchain = verifyToolchainContract();
  const unit = await verifyUnitKillSwitches();
  const preMigrationBackup = await verifyPreMigrationBackupWithRuntimeBackupDisabled();
  const runtime = await verifyRuntimeRoutes();
  console.log(JSON.stringify({
    ok: true,
    suite: 'runtime-safety',
    version: '0.3.5-test.16',
    toolchain,
    productionBackup,
    unit,
    preMigrationBackup,
    runtime,
    providersContacted: 0
  }));
}

function runExplicitIntegrationTest(target) {
  const allowedTargets = new Set([
    'app-test.js',
    'security-auth-test.js',
    'role-matrix-test.js',
    'year-simulation-test.js',
    'backup-restore-test.js',
    'e2e-smoke.js'
  ]);
  assert.ok(allowedTargets.has(target), 'Nicht freigegebener Integrationstest');
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', target)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      BACKUP_ENABLED: 'true',
      BACKUP_UPLOAD_URL: '',
      BACKUP_UPLOAD_TOKEN: '',
      EMAIL_ENABLED: 'true',
      SMTP_HOST: '',
      SMTP_PORT: '',
      SMTP_USER: '',
      SMTP_PASSWORD: '',
      SMTP_FROM: '',
      SMTP_TEST_TO: '',
      PUSH_ENABLED: 'true',
      VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: '',
      VAPID_SUBJECT: 'mailto:synthetic-tests@example.invalid'
    },
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[2] === '--with-integrations') {
  try {
    runExplicitIntegrationTest(process.argv[3]);
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  }
} else {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
