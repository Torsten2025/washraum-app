'use strict';

const crypto = require('crypto');
const { readSchemaIdentity } = require('./guarded-database');

const PHASES = new Set(['pre-deploy', 'pre-migration', 'post-migration', 'periodic', 'restore-drill']);

class ProductionBackupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProductionBackupError';
    this.code = code;
  }
}

function sha256File(fs, filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertReplicaStore(store) {
  if (!store || store.kind !== 'encrypted-replica' || store.clientSideEncryption !== true
    || store.repositoryTransport !== 'server' || store.accessRole !== 'APPEND_READ'
    || store.deleteCapability !== false || store.maintenanceCapability !== false
    || store.providerCredentialsPresent !== false
    || typeof store.snapshotDirectory !== 'function' || typeof store.verifySnapshot !== 'function'
    || typeof store.readbackSnapshot !== 'function' || typeof store.restoreSnapshot === 'function') {
    throw new ProductionBackupError('ENCRYPTED_REPLICA_UNAVAILABLE', 'Der gepruefte clientseitig verschluesselte Off-Disk-Adapter fehlt.');
  }
}

function assertVerifierStore(store) {
  if (!store || store.kind !== 'encrypted-replica' || store.clientSideEncryption !== true
    || store.repositoryTransport !== 'server' || store.accessRole !== 'READ_ONLY'
    || store.deleteCapability !== false || store.maintenanceCapability !== false
    || store.providerCredentialsPresent !== false || typeof store.verifySnapshot !== 'function'
    || typeof store.restoreSnapshot !== 'function' || typeof store.snapshotDirectory === 'function') {
    throw new ProductionBackupError('READ_ONLY_VERIFIER_UNAVAILABLE', 'Der getrennte READ_ONLY-Restore-Verifier fehlt.');
  }
}

function manifestPayload({ sourceSha256, schemaHash, contractHash, commit, appVersion, phase, createdAt }) {
  if (!PHASES.has(phase)) throw new ProductionBackupError('BACKUP_PHASE', 'Die Backupphase ist nicht freigegeben.');
  return {
    format: 1,
    artifact: 'sqlite-online-backup',
    sourceSha256,
    schemaSha256: schemaHash,
    contractSha256: contractHash,
    commit,
    appVersion,
    phase,
    createdAtUtc: createdAt,
    containsPersonalData: true,
    encryptionRequired: true,
    sourceIdentityIncluded: false
  };
}

function verifyRestoredFiles({ Database, fs, path, restoreRoot, expectedManifestSha256, expectedSourceSha256, expectedSchemaHash }) {
  const manifest = JSON.parse(fs.readFileSync(path.join(restoreRoot, 'manifest.json'), 'utf8'));
  const databasePath = path.join(restoreRoot, 'database.sqlite');
  const { manifestSha256, ...payload } = manifest;
  if (manifestSha256 !== expectedManifestSha256 || sha256Json(payload) !== expectedManifestSha256
    || sha256File(fs, databasePath) !== expectedSourceSha256 || manifest.schemaSha256 !== expectedSchemaHash) {
    throw new ProductionBackupError('RESTORE_HASH', 'Restore-Manifest, SQLite-Hash oder Schema-Bindung weicht ab.');
  }
  const restored = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    restored.pragma('foreign_keys = ON');
    restored.pragma('query_only = ON');
    if (String(restored.pragma('integrity_check', { simple: true })).toLowerCase() !== 'ok') {
      throw new ProductionBackupError('RESTORE_INTEGRITY', 'Der isolierte Restore besteht integrity_check nicht.');
    }
    if (restored.pragma('foreign_key_check').length !== 0) {
      throw new ProductionBackupError('RESTORE_FOREIGN_KEYS', 'Der isolierte Restore verletzt Fremdschluessel.');
    }
    if (readSchemaIdentity(restored).hash !== expectedSchemaHash) {
      throw new ProductionBackupError('RESTORE_SCHEMA', 'Der isolierte Restore besitzt nicht das gebundene Schema.');
    }
  } finally {
    restored.close();
  }
  return manifest;
}

async function createEncryptedProductionBackup({
  db, Database, fs, path, tempRoot, replicaStore, schemaHash, contractHash,
  commit, appVersion, phase, now = () => new Date(), killpoint = ''
}) {
  assertReplicaStore(replicaStore);
  const directory = fs.mkdtempSync(path.join(tempRoot, 'waschzeit-production-backup-'));
  const snapshotPath = path.join(directory, 'database.sqlite');
  try {
    await db.backup(snapshotPath);
    fs.chmodSync(snapshotPath, 0o600);
    if (killpoint === 'after-local-snapshot') throw new ProductionBackupError('BACKUP_KILLPOINT', 'Injizierter Fehler nach lokalem Snapshot.');
    const verify = new Database(snapshotPath, { readonly: true, fileMustExist: true });
    try {
      verify.pragma('foreign_keys = ON');
      verify.pragma('query_only = ON');
      if (String(verify.pragma('integrity_check', { simple: true })).toLowerCase() !== 'ok') {
        throw new ProductionBackupError('BACKUP_INTEGRITY', 'Der lokale Snapshot besteht integrity_check nicht.');
      }
      if (verify.pragma('foreign_key_check').length !== 0 || readSchemaIdentity(verify).hash !== schemaHash) {
        throw new ProductionBackupError('BACKUP_SCHEMA', 'Der lokale Snapshot verletzt Fremdschluessel oder Schema-Bindung.');
      }
    } finally {
      verify.close();
    }

    const payload = manifestPayload({
      sourceSha256: sha256File(fs, snapshotPath), schemaHash, contractHash, commit, appVersion,
      phase, createdAt: now().toISOString()
    });
    const manifest = { ...payload, manifestSha256: sha256Json(payload) };
    fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest)}\n`, {
      encoding: 'utf8', mode: 0o600, flag: 'wx'
    });
    if (killpoint === 'before-encrypted-upload') throw new ProductionBackupError('BACKUP_KILLPOINT', 'Injizierter Fehler vor Upload.');
    const stored = await replicaStore.snapshotDirectory(directory, {
      tags: { app: 'waschzeit', phase, manifest: manifest.manifestSha256 }
    });
    if (killpoint === 'after-encrypted-upload') throw new ProductionBackupError('BACKUP_KILLPOINT', 'Injizierter Fehler nach Upload.');
    const remoteVerify = await replicaStore.verifySnapshot(stored.snapshotId);
    if (!remoteVerify?.ok || remoteVerify.snapshotId !== stored.snapshotId) {
      throw new ProductionBackupError('BACKUP_REMOTE_VERIFY', 'Remote-Snapshot und Verify sind nicht identisch gebunden.');
    }
    const readbackPath = path.join(tempRoot, `waschzeit-production-readback-${crypto.randomUUID()}`);
    try {
      await replicaStore.readbackSnapshot(stored.snapshotId, readbackPath);
      verifyRestoredFiles({
        Database, fs, path, restoreRoot: readbackPath,
        expectedManifestSha256: manifest.manifestSha256,
        expectedSourceSha256: manifest.sourceSha256,
        expectedSchemaHash: schemaHash
      });
    } finally {
      fs.rmSync(readbackPath, { recursive: true, force: true });
    }
    return Object.freeze({
      ok: true, encrypted: true, remoteReadback: true, snapshotId: stored.snapshotId,
      manifestSha256: manifest.manifestSha256, sourceSha256: manifest.sourceSha256,
      schemaHash, createdAtUtc: manifest.createdAtUtc, verifiedAtUtc: now().toISOString(), phase
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function restoreEncryptedProductionBackup({
  Database, fs, path, replicaStore, snapshotId, restoreRoot,
  expectedManifestSha256, expectedSourceSha256, expectedSchemaHash
}) {
  assertVerifierStore(replicaStore);
  if (fs.existsSync(restoreRoot)) {
    throw new ProductionBackupError('RESTORE_TARGET_EXISTS', 'Der isolierte Restorepfad muss vor dem Drill fehlen.');
  }
  await replicaStore.verifySnapshot(snapshotId);
  await replicaStore.restoreSnapshot(snapshotId, restoreRoot);
  verifyRestoredFiles({
    Database, fs, path, restoreRoot, expectedManifestSha256, expectedSourceSha256, expectedSchemaHash
  });
  return Object.freeze({
    ok: true, isolated: true, snapshotId, manifestSha256: expectedManifestSha256,
    sourceSha256: expectedSourceSha256, schemaHash: expectedSchemaHash
  });
}

function assertVerifiedBackupForGate(backup, { phase, maximumAgeMs, now = () => Date.now() } = {}) {
  const verifiedAt = Date.parse(String(backup?.verifiedAtUtc || ''));
  if (!backup?.ok || backup.encrypted !== true || backup.remoteReadback !== true || backup.phase !== phase
    || !Number.isFinite(verifiedAt) || now() - verifiedAt < 0 || now() - verifiedAt > maximumAgeMs) {
    throw new ProductionBackupError('BACKUP_GATE_NOT_VERIFIED', `${phase} besitzt kein frisches verifiziertes Off-Disk-Backup.`);
  }
  return true;
}

module.exports = {
  ProductionBackupError,
  assertReplicaStore,
  assertVerifierStore,
  assertVerifiedBackupForGate,
  createEncryptedProductionBackup,
  manifestPayload,
  restoreEncryptedProductionBackup,
  sha256File,
  verifyRestoredFiles
};
