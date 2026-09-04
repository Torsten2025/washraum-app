'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const BACKUP_CONTRACT_VERSION = 'waschzeit-predeploy-backup-v1';
const SCHEMA_CONTRACT_VERSION = 'waschzeit-production-schema-v1';
const PRODUCTION_SERVICE = 'washraum-app';
const PRODUCTION_RENDER_SERVICE_ID = 'srv-d8k09i48aovs73di2ejg';
const PRODUCTION_DOMAIN = 'washraum-app.onrender.com';
const PRODUCTION_DB_PATH = '/var/data/washraum.sqlite';
const PRODUCTION_BACKUP_DIR = '/var/data/backups';
const EXPECTED_LIVE_VERSION = '0.3.4';
const EXPECTED_CANDIDATE_VERSION = '0.3.10';
const SIGNED_PROOF_CONTRACT_VERSION = 'waschzeit-signed-predeploy-proof-v1';
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const ALLOWED_TABLES = new Set([
  'account_recovery_codes', 'activity_entries', 'apartment_invitations',
  'apartment_name_requests', 'apartments', 'audit_log', 'blocked_dates',
  'booking_day_usage', 'bookings', 'device_pairing_codes',
  'diaper_game_challenge_scores', 'diaper_game_rounds', 'diaper_game_scores',
  'email_verification_tokens', 'fixed_bookings', 'houses',
  'maintenance_admin_notifications', 'maintenance_cases', 'maintenance_entries',
  'maintenance_report_deliveries', 'maintenance_report_notifications',
  'maintenance_report_preferences', 'maintenance_reports', 'machine_log_entries',
  'notification_preferences', 'password_reset_tokens', 'pilot_feedback_entries',
  'push_subscriptions', 'release_notices', 'remaining_slot_requests',
  'resource_entries', 'resources', 'sessions', 'settings', 'user_house_roles', 'users'
]);
const REQUIRED_TABLE_COLUMNS = Object.freeze({
  apartments: Object.freeze(['id', 'house_id', 'label', 'claimed_by', 'active']),
  bookings: Object.freeze(['id', 'user_id', 'resource_id', 'booking_date', 'slot']),
  houses: Object.freeze(['id', 'name', 'code', 'active']),
  resources: Object.freeze(['id', 'name', 'type', 'house_id', 'active']),
  settings: Object.freeze(['key', 'value']),
  users: Object.freeze(['id', 'username', 'password_hash', 'role', 'house_id', 'is_superadmin', 'active'])
});

class ProductionBackupError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProductionBackupError';
    this.code = code;
  }
}

function reject(code) {
  throw new ProductionBackupError(code);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function expectedTargetPath(candidateCommit, backupDir = PRODUCTION_BACKUP_DIR, pathImpl = path.posix) {
  return pathImpl.join(backupDir, `washraum-predeploy-${candidateCommit}.sqlite`);
}

function validateBootstrapContract(input, expected = {}) {
  const service = String(input.service || '').trim();
  const serviceId = String(input.serviceId || '').trim();
  const domain = String(input.domain || '').trim().toLowerCase();
  const expectedLiveCommit = String(input.expectedLiveCommit || '').trim().toLowerCase();
  const actualLiveCommit = String(input.actualLiveCommit || '').trim().toLowerCase();
  const candidateCommit = String(input.candidateCommit || '').trim().toLowerCase();
  const expectedLiveVersion = String(input.expectedLiveVersion || '').trim();
  const actualLiveVersion = String(input.actualLiveVersion || '').trim();
  const candidateVersion = String(input.candidateVersion || '').trim();
  const databasePath = String(input.databasePath || '').trim();
  const targetPath = String(input.targetPath || '').trim();
  const canonicalDatabasePath = expected.databasePath || PRODUCTION_DB_PATH;
  const canonicalBackupDir = expected.backupDir || PRODUCTION_BACKUP_DIR;
  const pathImpl = expected.pathImpl || path.posix;

  if (service !== PRODUCTION_SERVICE) reject('TARGET_SERVICE');
  if (serviceId !== PRODUCTION_RENDER_SERVICE_ID || domain !== PRODUCTION_DOMAIN) reject('TARGET_SERVICE');
  if (!COMMIT_PATTERN.test(expectedLiveCommit) || !COMMIT_PATTERN.test(actualLiveCommit)) reject('LIVE_COMMIT');
  if (expectedLiveCommit !== actualLiveCommit) reject('LIVE_COMMIT');
  if (!COMMIT_PATTERN.test(candidateCommit)) reject('CANDIDATE_COMMIT');
  if (expectedLiveVersion !== EXPECTED_LIVE_VERSION || actualLiveVersion !== expectedLiveVersion) reject('LIVE_VERSION');
  if (candidateVersion !== EXPECTED_CANDIDATE_VERSION) reject('CANDIDATE_VERSION');
  if (databasePath !== canonicalDatabasePath) reject('DATABASE_PATH');
  if (targetPath !== expectedTargetPath(candidateCommit, canonicalBackupDir, pathImpl)) reject('TARGET_PATH');

  return {
    service,
    serviceId,
    domain,
    expectedLiveCommit,
    actualLiveCommit,
    candidateCommit,
    expectedLiveVersion,
    actualLiveVersion,
    candidateVersion,
    databasePath,
    targetPath,
    backupDir: canonicalBackupDir
  };
}

function lstatRequired(fsImpl, filePath, missingCode) {
  try {
    return fsImpl.lstatSync(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') reject(missingCode);
    reject('FILESYSTEM');
  }
}

function assertRegularFile(fsImpl, filePath, expectedRealPath, invalidCode) {
  const stat = lstatRequired(fsImpl, filePath, invalidCode);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size <= 0) reject(invalidCode);
  let realPath;
  try {
    realPath = fsImpl.realpathSync(filePath);
  } catch {
    reject(invalidCode);
  }
  if (realPath !== expectedRealPath) reject(invalidCode);
  return stat;
}

function assertRegularDirectory(fsImpl, directoryPath) {
  const stat = lstatRequired(fsImpl, directoryPath, 'BACKUP_DIRECTORY');
  if (stat.isSymbolicLink() || !stat.isDirectory()) reject('BACKUP_DIRECTORY');
  let realPath;
  try {
    realPath = fsImpl.realpathSync(directoryPath);
  } catch {
    reject('BACKUP_DIRECTORY');
  }
  if (realPath !== directoryPath) reject('BACKUP_DIRECTORY');
}

function sameFileIdentity(left, right) {
  return left && right
    && String(left.dev) === String(right.dev)
    && String(left.ino) === String(right.ino)
    && Number(left.nlink) > 0
    && Number(right.nlink) > 0;
}

function assertSourcePathIdentity(fsImpl, sourcePath, identity) {
  const current = lstatRequired(fsImpl, sourcePath, 'SOURCE_DATABASE_TOCTOU');
  if (current.isSymbolicLink() || !current.isFile() || !sameFileIdentity(current, identity)) {
    reject('SOURCE_DATABASE_TOCTOU');
  }
  let realPath;
  try { realPath = fsImpl.realpathSync(sourcePath); } catch { reject('SOURCE_DATABASE_TOCTOU'); }
  if (realPath !== sourcePath) reject('SOURCE_DATABASE_TOCTOU');
}

function bindSourceDatabase(fsImpl, DatabaseImpl, sourcePath, options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== 'linux' && options.allowNonLinuxTestBinding !== true) reject('SOURCE_BINDING_PLATFORM');
  let descriptor;
  let db;
  try {
    descriptor = fsImpl.openSync(sourcePath, 'r');
    const identity = fsImpl.fstatSync(descriptor);
    if (!identity.isFile() || Number(identity.nlink) <= 0) reject('SOURCE_DATABASE');
    assertSourcePathIdentity(fsImpl, sourcePath, identity);
    // The SQLite connection itself owns the opened database file object. It is
    // kept alive from validation through backup; the pathname is never opened
    // by a second SQLite connection in between.
    const boundPath = sourcePath;
    db = new DatabaseImpl(boundPath, { readonly: true, fileMustExist: true });
    db.pragma('query_only = ON');
    assertSourcePathIdentity(fsImpl, sourcePath, identity);
    return {
      db,
      descriptor,
      identity,
      boundPath,
      assertCurrent: () => assertSourcePathIdentity(fsImpl, sourcePath, identity),
      close() {
        if (db) { db.close(); db = null; }
        if (descriptor !== undefined) { fsImpl.closeSync(descriptor); descriptor = undefined; }
      }
    };
  } catch (error) {
    if (db) { try { db.close(); } catch {} }
    if (descriptor !== undefined) { try { fsImpl.closeSync(descriptor); } catch {} }
    if (error instanceof ProductionBackupError) throw error;
    reject('SOURCE_DATABASE');
  }
}

function assertAbsent(fsImpl, filePath, code) {
  try {
    fsImpl.lstatSync(filePath);
    reject(code);
  } catch (error) {
    if (error instanceof ProductionBackupError) throw error;
    if (!error || error.code !== 'ENOENT') reject('FILESYSTEM');
  }
}

function inspectDatabase(db, filePath, fsImpl = fs, options = {}) {
  db.pragma('query_only = ON');
  db.pragma('foreign_keys = ON');
  const integrity = String(db.pragma('integrity_check', { simple: true })).toLowerCase();
  if (integrity !== 'ok') reject('SQLITE_INTEGRITY');
  const foreignKeyViolations = db.pragma('foreign_key_check').length;
  if (foreignKeyViolations !== 0) reject('FOREIGN_KEYS');

  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const tableNames = tables.map(({ name }) => String(name));
  if (tableNames.some((name) => !ALLOWED_TABLES.has(name))) reject('SCHEMA_CONTRACT');

  const structure = [];
  const columnsByTable = new Map();
  for (const name of tableNames) {
    if (!/^[a-z0-9_]+$/i.test(name)) reject('SCHEMA_CONTRACT');
    const columns = db.pragma(`table_info('${name}')`);
    if (!Array.isArray(columns) || columns.length === 0) reject('SCHEMA_CONTRACT');
    columnsByTable.set(name, new Set(columns.map((column) => String(column.name))));
    structure.push({
      table: name,
      columns: columns.map((column) => ({
        name: String(column.name),
        type: String(column.type || '').trim().toUpperCase(),
        notNull: Number(column.notnull) === 1,
        primaryKeyPosition: Number(column.pk) || 0
      }))
    });
  }
  for (const [name, requiredColumns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
    const actualColumns = columnsByTable.get(name);
    if (!actualColumns || requiredColumns.some((column) => !actualColumns.has(column))) reject('SCHEMA_CONTRACT');
  }

  const tableCounts = {};
  for (const name of tableNames) {
    tableCounts[name] = Number(db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get().count);
  }
  const bytes = options.skipFileArtifact ? null : fsImpl.statSync(filePath).size;
  const fileSha256 = options.skipFileArtifact ? null : sha256(fsImpl.readFileSync(filePath));
  const schemaSha256 = sha256(Buffer.from(`${JSON.stringify(structure)}\n`, 'utf8'));
  const tableCountsSha256 = sha256(Buffer.from(`${canonicalJson(tableCounts)}\n`, 'utf8'));

  return {
    ok: true,
    bytes,
    sha256: fileSha256,
    schemaContract: SCHEMA_CONTRACT_VERSION,
    schemaSha256,
    tableCounts,
    tableCountsSha256,
    integrityCheck: 'ok',
    foreignKeyViolations: 0,
    personalDataPrinted: false
  };
}

function verifyDatabaseArtifact(filePath, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const DatabaseImpl = options.DatabaseImpl || Database;
  const resolvedPath = (options.pathImpl || path).resolve(filePath);
  assertRegularFile(fsImpl, resolvedPath, resolvedPath, 'FILE_INVALID');
  let db;
  try {
    db = new DatabaseImpl(resolvedPath, { readonly: true, fileMustExist: true });
    return inspectDatabase(db, resolvedPath, fsImpl);
  } catch (error) {
    if (error instanceof ProductionBackupError) throw error;
    reject('SQLITE_OPEN');
  } finally {
    if (db) db.close();
  }
}

function assertEquivalentArtifacts(source, restored) {
  if (source.sha256 !== restored.sha256
    || source.schemaSha256 !== restored.schemaSha256
    || source.tableCountsSha256 !== restored.tableCountsSha256) reject('RESTORE_MISMATCH');
}

function proofKey(rawKey) {
  let key;
  try {
    key = Buffer.from(String(rawKey || ''), 'base64');
  } catch {
    reject('PROOF_KEY');
  }
  if (key.length !== 32 || key.toString('base64') !== String(rawKey || '')) reject('PROOF_KEY');
  return key;
}

function signBackupProof(proof, rawKey) {
  const payload = Buffer.from(canonicalJson(proof), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', proofKey(rawKey)).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySignedBackupProof(token, rawKey) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra !== undefined) reject('SIGNED_PROOF');
  const expected = crypto.createHmac('sha256', proofKey(rawKey)).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    reject('SIGNED_PROOF');
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) reject('SIGNED_PROOF');
  let proof;
  try {
    proof = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    reject('SIGNED_PROOF');
  }
  return proof;
}

async function createProductionBackup(input, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const DatabaseImpl = options.DatabaseImpl || Database;
  const pathImpl = options.pathImpl || path.posix;
  const contract = validateBootstrapContract(input, {
    databasePath: options.databasePath || PRODUCTION_DB_PATH,
    backupDir: options.backupDir || PRODUCTION_BACKUP_DIR,
    pathImpl
  });

  assertRegularFile(fsImpl, contract.databasePath, contract.databasePath, 'SOURCE_DATABASE');
  assertRegularDirectory(fsImpl, contract.backupDir);
  assertAbsent(fsImpl, contract.targetPath, 'TARGET_EXISTS');
  const lockPath = pathImpl.join(contract.backupDir, '.washraum-predeploy-backup.lock');
  const partialPath = `${contract.targetPath}.partial`;
  const restorePath = `${contract.targetPath}.restore-probe`;
  assertAbsent(fsImpl, partialPath, 'PARTIAL_EXISTS');
  assertAbsent(fsImpl, restorePath, 'RESTORE_EXISTS');

  // Validation and online backup use one uninterrupted SQLite connection;
  // a separate read-only descriptor pins the expected inode identity.
  // Every later boundary also requires the pathname to still name that inode.
  const sourceBinding = bindSourceDatabase(fsImpl, DatabaseImpl, contract.databasePath, options);
  const lifecycleHook = typeof options.lifecycleHook === 'function' ? options.lifecycleHook : () => {};
  try {
    inspectDatabase(sourceBinding.db, sourceBinding.boundPath, fsImpl, { skipFileArtifact: true });
    lifecycleHook('after-source-inspection');
    sourceBinding.assertCurrent();
  } catch (error) {
    sourceBinding.close();
    if (error instanceof ProductionBackupError) throw error;
    reject('SQLITE_OPEN');
  }

  let lockHandle;
  let partialOwned = false;
  let restoreOwned = false;
  let publishedOwned = false;
  try {
    lifecycleHook('before-lock');
    sourceBinding.assertCurrent();
    try {
      lockHandle = fsImpl.openSync(lockPath, 'wx', 0o600);
    } catch (error) {
      if (error && error.code === 'EEXIST') reject('PARALLEL_OPERATION');
      reject('LOCK_CREATE');
    }

    try {
      const partialHandle = fsImpl.openSync(partialPath, 'wx', 0o600);
      fsImpl.closeSync(partialHandle);
      partialOwned = true;
      lifecycleHook('before-online-backup');
      sourceBinding.assertCurrent();
      await sourceBinding.db.backup(partialPath);
      lifecycleHook('after-online-backup');
      sourceBinding.assertCurrent();
    } catch (error) {
      if (error instanceof ProductionBackupError) throw error;
      reject('ONLINE_BACKUP');
    }

    const backup = verifyDatabaseArtifact(partialPath, { fsImpl, DatabaseImpl, pathImpl });
    try {
      fsImpl.copyFileSync(partialPath, restorePath, fs.constants.COPYFILE_EXCL);
      restoreOwned = true;
    } catch {
      reject('RESTORE_COPY');
    }
    const restore = verifyDatabaseArtifact(restorePath, { fsImpl, DatabaseImpl, pathImpl });
    assertEquivalentArtifacts(backup, restore);
    lifecycleHook('before-publish');
    sourceBinding.assertCurrent();

    fsImpl.rmSync(restorePath, { force: true });
    restoreOwned = false;
    try {
      // A hard-link publish is an atomic create-if-absent operation on the same
      // filesystem. Unlike rename(), it cannot overwrite a target that appears
      // after the initial absence check.
      fsImpl.linkSync(partialPath, contract.targetPath);
      publishedOwned = true;
    } catch (error) {
      if (error && error.code === 'EEXIST') reject('TARGET_COLLISION');
      reject('BACKUP_PUBLISH');
    }
    try {
      fsImpl.rmSync(partialPath);
      partialOwned = false;
    } catch {
      reject('BACKUP_PUBLISH');
    }
    const published = verifyDatabaseArtifact(contract.targetPath, { fsImpl, DatabaseImpl, pathImpl });
    assertEquivalentArtifacts(backup, published);
    lifecycleHook('before-proof');
    sourceBinding.assertCurrent();

    const result = {
      ok: true,
      contract: BACKUP_CONTRACT_VERSION,
      signedProofContract: SIGNED_PROOF_CONTRACT_VERSION,
      service: contract.service,
      serviceId: contract.serviceId,
      domain: contract.domain,
      sourceCommit: contract.actualLiveCommit,
      candidateCommit: contract.candidateCommit,
      sourceVersion: contract.actualLiveVersion,
      candidateVersion: contract.candidateVersion,
      databasePath: contract.databasePath,
      backupPath: contract.targetPath,
      bootstrapObserved: true,
      backupArtifactObserved: true,
      executionNonce: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date().toISOString(),
      ...published,
      restoreDrill: {
        ok: true,
        sha256: restore.sha256,
        schemaSha256: restore.schemaSha256,
        tableCountsSha256: restore.tableCountsSha256
      },
      sourceOpenedReadOnly: true,
      targetCreatedExactlyOnce: true
    };
    publishedOwned = false;
    return result;
  } finally {
    sourceBinding.close();
    if (restoreOwned) {
      try { fsImpl.rmSync(restorePath, { force: true }); } catch {}
    }
    if (partialOwned) {
      try { fsImpl.rmSync(partialPath, { force: true }); } catch {}
    }
    if (publishedOwned) {
      try { fsImpl.rmSync(contract.targetPath, { force: true }); } catch {}
    }
    if (lockHandle !== undefined) {
      try { fsImpl.closeSync(lockHandle); } catch {}
      try { fsImpl.rmSync(lockPath, { force: true }); } catch {}
    }
  }
}

module.exports = {
  ALLOWED_TABLES,
  BACKUP_CONTRACT_VERSION,
  COMMIT_PATTERN,
  EXPECTED_CANDIDATE_VERSION,
  EXPECTED_LIVE_VERSION,
  PRODUCTION_DOMAIN,
  HASH_PATTERN,
  PRODUCTION_BACKUP_DIR,
  PRODUCTION_DB_PATH,
  PRODUCTION_RENDER_SERVICE_ID,
  PRODUCTION_SERVICE,
  ProductionBackupError,
  SCHEMA_CONTRACT_VERSION,
  SIGNED_PROOF_CONTRACT_VERSION,
  assertEquivalentArtifacts,
  bindSourceDatabase,
  canonicalJson,
  createProductionBackup,
  expectedTargetPath,
  sha256,
  signBackupProof,
  validateBootstrapContract,
  verifyDatabaseArtifact,
  verifySignedBackupProof
};
