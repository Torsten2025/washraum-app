'use strict';

const path = require('path');

class ProductionSafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProductionSafetyError';
    this.code = code;
  }
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function isMissingOrFalse(value) {
  const current = normalized(value);
  return current === '' || current === 'false';
}

const allowedProductionSmtpKeys = new Set([
  'SMTP_FROM',
  'SMTP_HELO_NAME',
  'SMTP_HOST',
  'SMTP_PASSWORD',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_TEST_TO',
  'SMTP_USER'
]);

function hasProviderBinding(env, { allowSmtp = false } = {}) {
  const forbiddenPrefixes = [
    'AWS_',
    'BACKUP_UPLOAD_',
    'CLOUDFLARE_',
    'KOPIA_',
    'R2_',
    'S3_',
    'SMTP_',
    'VAPID_'
  ];
  return Object.keys(env).some((name) => (
    (!allowSmtp || !allowedProductionSmtpKeys.has(name))
    && forbiddenPrefixes.some((prefix) => name.startsWith(prefix))
    && String(env[name] || '').trim() !== ''
  ));
}

function assertProductionEmailConfig(env) {
  const emailEnabled = normalized(env.EMAIL_ENABLED) === 'true';
  if (!['false', 'true'].includes(normalized(env.EMAIL_ENABLED))) {
    throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'E-Mail muss in Produktion explizit aktiviert oder deaktiviert sein.');
  }
  if (!emailEnabled) return false;
  if (normalized(env.PRODUCTION_EMAIL_APPROVED) !== 'true') {
    throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'E-Mail benoetigt eine ausdrueckliche Produktionsfreigabe.');
  }
  const port = Number(String(env.SMTP_PORT || '').trim());
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  if (required.some((key) => String(env[key] || '').trim() === '')
    || !Number.isInteger(port) || port < 1 || port > 65535
    || !['false', 'true'].includes(normalized(env.SMTP_SECURE))) {
    throw new ProductionSafetyError('PRODUCTION_EMAIL_CONFIG', 'Die produktive SMTP-Konfiguration ist unvollstaendig oder ungueltig.');
  }
  return true;
}

function createHttpSecurityContract({ production = false } = {}) {
  return Object.freeze({
    strictTransportSecurity: production ? 'max-age=31536000; includeSubDomains' : '',
    sessionCookie: Object.freeze({
      httpOnly: true,
      sameSite: 'lax',
      secure: production === true
    })
  });
}

function assertProductionSafety({ env = process.env, dbPath, agentTestAllowed = false } = {}) {
  const nodeEnvironment = normalized(env.NODE_ENV);
  const appEnvironment = normalized(env.APP_ENV);

  if (nodeEnvironment === 'production' && appEnvironment === 'agent-test' && agentTestAllowed === true) {
    return Object.freeze({ production: false, agentTest: true });
  }

  if (nodeEnvironment === 'production' && appEnvironment !== 'production') {
    throw new ProductionSafetyError('PRODUCTION_TARGET', 'NODE_ENV=production verlangt eine eindeutig freigegebene Zielumgebung.');
  }

  if (nodeEnvironment !== 'production' && appEnvironment !== 'production') {
    return Object.freeze({ production: false, agentTest: false });
  }

  if (nodeEnvironment !== 'production') {
    throw new ProductionSafetyError('PRODUCTION_ENV', 'APP_ENV=production verlangt NODE_ENV=production.');
  }

  if (!['false', 'true'].includes(normalized(env.BACKUP_ENABLED))) {
    throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'Lokales Backup muss in Produktion explizit aktiviert oder deaktiviert sein.');
  }
  if (normalized(env.AUTO_BACKUP) !== 'false') {
    throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'Automatisches Backup muss beim Produktionsstart explizit deaktiviert sein.');
  }

  const backupEnabled = normalized(env.BACKUP_ENABLED) === 'true';
  const expectedBackupPath = path.resolve('/var/data/backups');
  if (backupEnabled && path.resolve(String(env.BACKUP_DIR || '')) !== expectedBackupPath) {
    throw new ProductionSafetyError('PRODUCTION_STORAGE', 'Produktionsbackups muessen auf der persistenten lokalen Disk liegen.');
  }

  const emailEnabled = assertProductionEmailConfig(env);

  const pushEnabled = normalized(env.PUSH_ENABLED) === 'true';
  if (!['false', 'true'].includes(normalized(env.PUSH_ENABLED))) {
    throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'Push muss in Produktion explizit aktiviert oder deaktiviert sein.');
  }
  if (pushEnabled && normalized(env.PRODUCTION_PUSH_APPROVED) !== 'true') {
    throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'Push benoetigt eine ausdrueckliche Produktionsfreigabe.');
  }

  for (const key of [
    'AGENT_TEST_FIXTURE_ENABLED',
    'ALLOW_TEST_INVITATION_LINK',
    'ALLOW_LEGACY_HOUSE_REGISTRATION',
    'SEED_ADMIN_FORCE_PASSWORD_RESET'
  ]) {
    if (!isMissingOrFalse(env[key])) {
      throw new ProductionSafetyError('PRODUCTION_FEATURE_HOLD', 'Test-, Legacy- und Passwortresetpfade muessen beim Produktionsstart deaktiviert sein.');
    }
  }

  if (hasProviderBinding(env, { allowSmtp: emailEnabled })) {
    throw new ProductionSafetyError('PRODUCTION_PROVIDER_BINDING', 'Providerbindungen muessen beim ersten Produktionsstart vollstaendig fehlen.');
  }

  const expectedDbPath = path.resolve('/var/data/washraum.sqlite');
  if (path.resolve(String(dbPath || '')) !== expectedDbPath) {
    throw new ProductionSafetyError('PRODUCTION_STORAGE', 'Die Produktion ist nicht an die persistente SQLite-Disk gebunden.');
  }

  if (!['', '1'].includes(String(env.WEB_CONCURRENCY || '').trim())) {
    throw new ProductionSafetyError('PRODUCTION_CONCURRENCY', 'SQLite-Produktion erlaubt genau eine App-Instanz.');
  }

  return Object.freeze({
    production: true,
    dbPath: expectedDbPath,
    singleInstance: true,
    providersHeld: true,
    fixtureDisabled: true,
    localBackupEnabled: backupEnabled,
    emailApproved: emailEnabled,
    pushApproved: pushEnabled
  });
}

module.exports = {
  ProductionSafetyError,
  assertProductionSafety,
  assertProductionEmailConfig,
  createHttpSecurityContract,
  hasProviderBinding
};
