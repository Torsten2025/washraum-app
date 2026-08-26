'use strict';

const crypto = require('crypto');
const path = require('path');

const STARTUP_PERMIT = Symbol.for('waschzeit.production-startup-permit');
const FULL_COMMIT = /^[0-9a-f]{40}$/;
const FULL_SHA256 = /^[0-9a-f]{64}$/;
const KOPIA_IDENTITY = /^[a-z0-9][a-z0-9._-]{2,63}$/;

class ProductionGuardError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProductionGuardError';
    this.code = code;
  }
}

function exact(env, name, expected, code = 'PRODUCTION_GUARD_IDENTITY') {
  const actual = String(env?.[name] ?? '').trim();
  if (!expected || actual !== expected) {
    throw new ProductionGuardError(code, `${name} entspricht nicht dem Produktionsvertrag.`);
  }
  return actual;
}

function strictBoolean(env, name, expected) {
  return exact(env, name, String(expected), 'PRODUCTION_GUARD_FLAG');
}

function strictInteger(env, name, minimum, maximum) {
  const raw = String(env?.[name] ?? '').trim();
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ProductionGuardError('PRODUCTION_GUARD_BUDGET', `${name} liegt ausserhalb des freigegebenen Bereichs.`);
  }
  return value;
}

function requiredSecret(env, name, minimumLength) {
  const value = String(env?.[name] ?? '');
  if (value.length < minimumLength) {
    throw new ProductionGuardError('PRODUCTION_GUARD_SECRET', `${name} fehlt im Produktionsvertrag.`);
  }
  return value;
}

function repositoryServerUrl(env) {
  const raw = String(env?.KOPIA_REPOSITORY_SERVER_URL ?? '').trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ProductionGuardError('PRODUCTION_GUARD_REPOSITORY_SERVER', 'Die Kopia-Repository-Server-URL ist ungueltig.');
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password
    || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_REPOSITORY_SERVER', 'Der Kopia-Repository-Server muss kanonisch und TLS-gebunden sein.');
  }
  return parsed.origin;
}

function isProductionRuntime(env = process.env) {
  const appEnv = String(env.APP_ENV || '').trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  return appEnv === 'production' || (nodeEnv === 'production' && appEnv !== 'agent-test');
}

function evaluateProductionGuard({ env = process.env, appVersion, platform = process.platform } = {}) {
  if (!isProductionRuntime(env)) return Object.freeze({ production: false, contractHash: '' });

  exact(env, 'NODE_ENV', 'production');
  exact(env, 'APP_ENV', 'production');
  exact(env, 'PRODUCTION_EXPECTED_VERSION', String(appVersion || ''));

  const commit = String(env.PRODUCTION_EXPECTED_COMMIT || '').trim().toLowerCase();
  const rollbackCommit = String(env.PRODUCTION_CODE_ROLLBACK_COMMIT || '').trim().toLowerCase();
  if (!FULL_COMMIT.test(commit) || !FULL_COMMIT.test(rollbackCommit) || commit === rollbackCommit) {
    throw new ProductionGuardError('PRODUCTION_GUARD_COMMIT', 'Release- und Code-Rollbackcommit sind nicht getrennt vollstaendig gebunden.');
  }
  exact(env, 'RENDER_GIT_COMMIT', commit, 'PRODUCTION_GUARD_COMMIT');
  const release = exact(env, 'APP_RELEASE', String(env.PRODUCTION_EXPECTED_RELEASE || ''));
  const service = exact(env, 'RENDER_SERVICE_NAME', String(env.PRODUCTION_EXPECTED_SERVICE || ''));
  const url = exact(env, 'PUBLIC_APP_URL', String(env.PRODUCTION_EXPECTED_URL || ''));
  if (!/^https:\/\/[a-z0-9.-]+(?:\/[a-z0-9._~!$&'()*+,;=:@%-]*)?$/i.test(url)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_URL', 'Die Produktions-URL ist nicht kanonisch HTTPS-gebunden.');
  }

  const expectedDbPath = path.resolve(String(env.PRODUCTION_EXPECTED_DB_PATH || ''));
  const dbPath = path.resolve(String(env.DB_PATH || ''));
  if (!env.PRODUCTION_EXPECTED_DB_PATH || dbPath !== expectedDbPath) {
    throw new ProductionGuardError('PRODUCTION_GUARD_DB', 'DB_PATH ist nicht exakt an den freigegebenen persistenten Pfad gebunden.');
  }
  if (dbPath.includes(`${path.sep}tmp${path.sep}`) || dbPath.endsWith(`${path.sep}tmp`)
    || (platform !== 'win32' && !dbPath.startsWith('/var/data/'))) {
    throw new ProductionGuardError('PRODUCTION_GUARD_EPHEMERAL', 'Der Produktionspfad ist nicht persistent gebunden.');
  }

  strictBoolean(env, 'PRODUCTION_SINGLE_INSTANCE', true);
  if (!['', '1'].includes(String(env.WEB_CONCURRENCY || '').trim())) {
    throw new ProductionGuardError('PRODUCTION_GUARD_CONCURRENCY', 'SQLite-Produktion erlaubt genau eine App-Instanz.');
  }
  strictBoolean(env, 'PRODUCTION_PROVIDER_HOLD', true);
  strictBoolean(env, 'PRODUCTION_SEED_DISABLED', true);
  strictBoolean(env, 'PRODUCTION_PREDEPLOY_REQUIRED', true);
  strictBoolean(env, 'EMAIL_ENABLED', false);
  strictBoolean(env, 'PUSH_ENABLED', false);
  strictBoolean(env, 'AUTO_BACKUP', false);
  strictBoolean(env, 'BACKUP_ENABLED', true);

  const forbiddenKeys = [
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_HELO_NAME',
    'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'BACKUP_UPLOAD_URL', 'BACKUP_UPLOAD_TOKEN',
    'AGENT_TEST_FIXTURE_ENABLED', 'AGENT_TEST_FIXTURE_VERSION', 'AGENT_TEST_EXPECTED_COMMIT',
    'AGENT_TEST_RESIDENT_PASSWORD', 'AGENT_TEST_HOUSEADMIN_PASSWORD', 'AGENT_TEST_SUPERADMIN_PASSWORD',
    'ALLOW_TEST_INVITATION_LINK', 'KOPIA_CONFIG_PATH', 'KOPIA_PASSWORD',
    'KOPIA_REPOSITORY_FULL_PASSWORD', 'KOPIA_REPOSITORY_OWNER_PASSWORD',
    'KOPIA_REPOSITORY_MAINTENANCE_PASSWORD', 'KOPIA_REPOSITORY_VERIFIER_PASSWORD'
  ];
  const forbiddenProviderKey = Object.keys(env).find((name) => /^(?:R2_|AWS_|S3_|CF_R2_|CLOUDFLARE_)/i.test(name)
    && String(env[name] || '').trim());
  const forbiddenPrivilegedRepositoryKey = Object.keys(env).find((name) => /^KOPIA_REPOSITORY_(?:FULL|OWNER|MAINTENANCE|VERIFIER|RESTORE)_/i.test(name)
    && String(env[name] || '').trim());
  if (forbiddenProviderKey || forbiddenPrivilegedRepositoryKey
    || forbiddenKeys.some((name) => String(env[name] || '').trim())) {
    throw new ProductionGuardError('PRODUCTION_GUARD_FORBIDDEN_BINDING', 'Provider-, Fixture- oder Legacy-Backupwerte sind in Produktion nicht erlaubt.');
  }
  if (String(env.ALLOW_LEGACY_HOUSE_REGISTRATION || '').trim().toLowerCase() === 'true') {
    throw new ProductionGuardError('PRODUCTION_GUARD_LEGACY', 'Legacy-Registrierung ist in Produktion verboten.');
  }

  exact(env, 'PRODUCTION_BACKUP_MODE', 'kopia-repository-server');
  exact(env, 'PRODUCTION_BACKUP_RESIDENCY', 'EU');
  exact(env, 'PRODUCTION_BACKUP_RETENTION_DAYS', '30');
  exact(env, 'PRODUCTION_RPO_MODE', 'periodic-5m');
  exact(env, 'PRODUCTION_RPO_MINUTES', '5');
  exact(env, 'PRODUCTION_RTO_HOURS', '4');
  exact(env, 'KOPIA_RELEASE_VERSION', '0.23.1');
  exact(env, 'KOPIA_RELEASE_COMMIT', '72ec08f');
  exact(env, 'KOPIA_RELEASE_ARCHIVE_SHA256', '416d0f84a3dbb321a8b2d8f0997b1a0a6e915babe79ee76fa6e4d2bd1e1c5178');
  exact(env, 'KOPIA_RELEASE_CHECKSUMS_SHA256', 'ec1089c8309867fb729b981ee77f6ebf57adb154a8094f841c2848ec8e41fb01');
  exact(env, 'KOPIA_RELEASE_SIGNATURE_SHA256', '0872308be5ff500b18b47558bca775ed35f69598633619ef3178b65d1252433a');

  const kopiaBinarySha256 = String(env.KOPIA_BINARY_SHA256 || '').trim().toLowerCase();
  if (!FULL_SHA256.test(kopiaBinarySha256)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_KOPIA_BINARY', 'Der Laufzeitfingerabdruck der Kopia-Binaerdatei fehlt.');
  }
  const rawBinaryPath = String(env.KOPIA_BINARY_PATH || '');
  if (!path.isAbsolute(rawBinaryPath)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_KOPIA_PATH', 'Die Kopia-Binaerdatei muss absolut gebunden sein.');
  }

  const kopiaRepositoryServerUrl = repositoryServerUrl(env);
  const kopiaRepositoryServerCertificateSha256 = String(env.KOPIA_REPOSITORY_SERVER_CERT_SHA256 || '').trim().toLowerCase();
  if (!FULL_SHA256.test(kopiaRepositoryServerCertificateSha256)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_REPOSITORY_CERT', 'Der TLS-Zertifikatsfingerabdruck des Repository Servers fehlt.');
  }
  const kopiaRepositoryAppUsername = String(env.KOPIA_REPOSITORY_APP_USERNAME || '').trim().toLowerCase();
  const kopiaRepositoryAppHostname = String(env.KOPIA_REPOSITORY_APP_HOSTNAME || '').trim().toLowerCase();
  if (!KOPIA_IDENTITY.test(kopiaRepositoryAppUsername) || !KOPIA_IDENTITY.test(kopiaRepositoryAppHostname)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_REPOSITORY_IDENTITY', 'Das dedizierte Kopia-Appkonto ist nicht eindeutig gebunden.');
  }
  exact(env, 'KOPIA_REPOSITORY_APP_ACL_ROLE', 'APPEND_READ', 'PRODUCTION_GUARD_REPOSITORY_ACL');

  const backupIntervalSeconds = strictInteger(env, 'PRODUCTION_BACKUP_INTERVAL_SECONDS', 60, 240);
  const backupMaximumAgeSeconds = strictInteger(env, 'PRODUCTION_BACKUP_MAX_AGE_SECONDS', 240, 300);
  const backupJobTimeoutSeconds = strictInteger(env, 'PRODUCTION_BACKUP_JOB_TIMEOUT_SECONDS', 10, 180);
  const kopiaCommandTimeoutSeconds = strictInteger(env, 'PRODUCTION_KOPIA_COMMAND_TIMEOUT_SECONDS', 5, 150);
  if (backupIntervalSeconds >= backupMaximumAgeSeconds
    || backupJobTimeoutSeconds >= backupIntervalSeconds
    || kopiaCommandTimeoutSeconds > backupJobTimeoutSeconds) {
    throw new ProductionGuardError('PRODUCTION_GUARD_BUDGET', 'Backupintervall, Frische- und Timeoutbudgets besitzen keine Sicherheitsmarge.');
  }

  const baselineSchemaHash = String(env.PRODUCTION_BASELINE_SCHEMA_SHA256 || '').trim().toLowerCase();
  if (!FULL_SHA256.test(baselineSchemaHash)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_SCHEMA', 'Der freigegebene Baseline-Schemahash fehlt.');
  }
  const migrationArtifact = String(env.PRODUCTION_MIGRATION_ARTIFACT || '').replace(/\\/g, '/');
  if (!/^migrations\/production\/[a-z0-9._-]+\.json$/i.test(migrationArtifact)) {
    throw new ProductionGuardError('PRODUCTION_GUARD_MIGRATION', 'Das gebundene Migrationsartefakt fehlt.');
  }

  const protectedValues = [
    requiredSecret(env, 'SESSION_SECRET', 32),
    requiredSecret(env, 'KOPIA_REPOSITORY_APP_PASSWORD', 24)
  ];
  requiredSecret(env, 'PRODUCTION_BACKUP_ENVELOPE_KEY_ID', 8);
  if (new Set(protectedValues).size !== protectedValues.length) {
    throw new ProductionGuardError('PRODUCTION_GUARD_SECRET_REUSE', 'Session- und Kopia-Appgeheimnis muessen getrennt sein.');
  }

  const publicContract = {
    appVersion: String(appVersion || ''), commit, rollbackCommit, release, service, url, dbPath,
    baselineSchemaHash, migrationArtifact, providerHold: true, seedDisabled: true,
    backupMode: 'kopia-repository-server', backupResidency: 'EU', retentionDays: 30,
    rpoMinutes: 5, rtoHours: 4, backupIntervalSeconds, backupMaximumAgeSeconds,
    backupJobTimeoutSeconds, kopiaCommandTimeoutSeconds,
    kopiaBinaryPath: path.resolve(rawBinaryPath), kopiaBinarySha256,
    kopiaRepositoryServerUrl, kopiaRepositoryServerCertificateSha256,
    kopiaRepositoryAppUsername, kopiaRepositoryAppHostname, kopiaRepositoryAppAclRole: 'APPEND_READ',
    singleInstance: true, predeployRequired: true
  };
  const contractHash = crypto.createHash('sha256').update(JSON.stringify(publicContract)).digest('hex');
  return Object.freeze({ production: true, ...publicContract, contractHash });
}

function installProductionStartupPermit(permit) {
  if (!permit || permit.production !== true || !permit.contractHash || permit.runtimePermit !== true
    || permit.baselineVerified !== true || permit.preMigrationBackupVerified !== true
    || permit.postMigrationBackupVerified !== true) {
    throw new ProductionGuardError('PRODUCTION_PERMIT_INVALID', 'Der Produktions-Startup-Permit ist unvollstaendig.');
  }
  globalThis[STARTUP_PERMIT] = Object.freeze({ ...permit });
  return globalThis[STARTUP_PERMIT];
}

function requireProductionStartupPermit(expectedContractHash) {
  const permit = globalThis[STARTUP_PERMIT];
  if (!permit || permit.contractHash !== expectedContractHash || permit.runtimePermit !== true) {
    throw new ProductionGuardError('PRODUCTION_PERMIT_MISSING', 'Der gepruefte Produktions-Startup-Permit fehlt.');
  }
  return permit;
}

function clearProductionStartupPermitForTests() {
  delete globalThis[STARTUP_PERMIT];
}

module.exports = {
  ProductionGuardError,
  clearProductionStartupPermitForTests,
  evaluateProductionGuard,
  installProductionStartupPermit,
  isProductionRuntime,
  requireProductionStartupPermit
};
