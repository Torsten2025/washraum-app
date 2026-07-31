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
      appVersion: '0.3.0-test.9',
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

  return {
    parsedCases,
    factoryCases: [...disabledFlagCases.map((entry) => entry.name), 'factory-default-omitted'],
    explicitTrue: 'parser-and-in-memory-status-only',
    providerAttempts: 0,
    dnsAttempts: 0,
    queueWrites: 0,
    backupWrites: 0
  };
}

function verifyBlueprintsAndVersion() {
  const packageInfo = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  const serviceWorker = fs.readFileSync(path.join(projectRoot, 'public', 'sw.js'), 'utf8');
  const envExample = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
  const staging = fs.readFileSync(path.join(projectRoot, 'render.staging.yaml'), 'utf8');
  const agentTest = fs.readFileSync(path.join(projectRoot, 'render.agent-test.yaml'), 'utf8');
  const production = fs.readFileSync(path.join(projectRoot, 'render.yaml'), 'utf8');

  assert.equal(packageInfo.version, '0.3.0-test.9');
  assert.equal(packageInfo.packageManager, 'npm@10.9.8');
  assert.equal(lock.version, '0.3.0-test.9');
  assert.equal(lock.packages[''].version, '0.3.0-test.9');
  assert.ok(serviceWorker.includes("const CACHE_NAME = 'waschzeit-pwa-v0.3.0-test.9';"));
  assert.match(envExample, /^BACKUP_ENABLED=false$/m);
  assert.match(envExample, /^EMAIL_ENABLED=false$/m);
  assert.match(envExample, /^PUSH_ENABLED=false$/m);

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
  assert.match(agentTest, /branch: codex\/agent-test/);
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
  assert.match(agentTest, /APP_RELEASE[\s\S]*value: agent-v0\.3\.0-test\.9/);
  assert.match(agentTest, /DB_PATH[\s\S]*value: \/tmp\/waschzeit-agent-test\.sqlite/);
  assert.match(agentTest, /SESSION_SECRET\s*\n\s*generateValue: true/);
  assert.match(agentTest, /SEED_ADMIN_PASSWORD\s*\n\s*sync: false/);
  assert.match(agentTest, /HOUSE_CODE\s*\n\s*generateValue: true/);
  assert.match(agentTest, /PUBLIC_APP_URL[\s\S]*value: https:\/\/waschzeit-agent-test\.onrender\.com/);
  assert.match(agentTest, /BACKUP_ENABLED[\s\S]*value: false/);
  assert.match(agentTest, /AUTO_BACKUP[\s\S]*value: false/);
  assert.match(agentTest, /EMAIL_ENABLED[\s\S]*value: false/);
  assert.match(agentTest, /PUSH_ENABLED[\s\S]*value: false/);
  assert.doesNotMatch(agentTest, /\bdisk:/);
  assert.doesNotMatch(agentTest, /SMTP_|VAPID_|BACKUP_UPLOAD_|envVarGroups/);

  assert.match(production, /name: waschplan-app[\s\S]*branch: master/);
  assert.match(production, /buildCommand: npm ci/);
  assert.match(production, /SESSION_SECRET\s*\n\s*sync: false/);
  assert.doesNotMatch(production, /NODE_VERSION/);
  assert.match(production, /DB_PATH[\s\S]*value: \/var\/data\/washraum\.sqlite/);
  assert.match(production, /mountPath: \/var\/data/);
  assert.match(production, /BACKUP_ENABLED[\s\S]*value: true/);
  assert.match(production, /EMAIL_ENABLED[\s\S]*value: true/);
  assert.match(production, /PUSH_ENABLED[\s\S]*value: true/);
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
    assert.equal(health.body.version, '0.3.0-test.9');
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
  const toolchain = verifyToolchainContract();
  const unit = await verifyUnitKillSwitches();
  const runtime = await verifyRuntimeRoutes();
  console.log(JSON.stringify({
    ok: true,
    suite: 'runtime-safety',
    version: '0.3.0-test.9',
    toolchain,
    unit,
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
