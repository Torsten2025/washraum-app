'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const packageInfo = require('../../package.json');
const { createRuntimeFlags } = require('./runtime-flags');
const { evaluateProductionGuard, installProductionStartupPermit } = require('./production-guard');
const { assertWritableDatabasePermit, openReadOnlyBaseline, readSchemaIdentity } = require('./guarded-database');
const {
  assertVerifiedBackupForGate,
  createEncryptedProductionBackup
} = require('./production-backup');
const { createBackupFreshnessGate, createPeriodicBackupScheduler } = require('./production-backup-scheduler');
const { applyProductionMigration, captureDataInvariants, loadMigrationArtifact } = require('./production-migrations');
const {
  createKopiaReplicaStore,
  validateKopiaRuntimeContract
} = require('./kopia-replica-store');
const { createProviderHold } = require('./provider-hold');
const { createRollbackContract } = require('./production-rollback');

function createSecretSafeCommandRunner({ spawnImpl = childProcess.spawn } = {}) {
  if (typeof spawnImpl !== 'function') throw new TypeError('spawnImpl muss eine Funktion sein.');
  return Object.freeze({
    executionMode: 'linux-proc-fd',
    prepare(executable, args, { env, rejectStdoutSecrets, timeoutMs }) {
      const preparedExecutable = String(executable);
      const preparedArgs = [...args];
      const preparedEnvironment = { ...env };
      const secrets = [...(rejectStdoutSecrets || [])];
      return Object.freeze({
        start(executionHandle) {
          if (!executionHandle || executionHandle.kind !== 'validated-kopia-elf-handle'
            || executionHandle.childFd !== 3 || executionHandle.procExecutablePath !== '/proc/self/fd/3'
            || executionHandle.identity.executablePath !== preparedExecutable) {
            const error = new Error('Kopia-Binaeridentitaet driftete zwischen Vorbereitung und Start.');
            error.code = 'KOPIA_BINARY_PATH_DRIFT';
            throw error;
          }
          // spawn() mappt den offenen, validierten Parent-FD synchron auf Child-FD 3.
          // Der urspruengliche Dateipfad wird nicht erneut geoeffnet oder ausgefuehrt.
          let resolveSpawn;
          let rejectSpawn;
          const spawnOutcome = new Promise((resolve, reject) => {
            resolveSpawn = resolve;
            rejectSpawn = reject;
          });
          const completion = new Promise((resolve, reject) => {
            const stdoutChunks = [];
            const stderrChunks = [];
            let outputBytes = 0;
            let timedOut = false;
            let outputOverflow = false;
            let child;
            let spawnSettled = false;
            try {
              child = spawnImpl(executionHandle.procExecutablePath, preparedArgs, {
                env: preparedEnvironment,
                shell: false,
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe', executionHandle.parentFd]
              });
              if (!child || typeof child.once !== 'function' || typeof child.kill !== 'function'
                || typeof child.stdout?.on !== 'function' || typeof child.stderr?.on !== 'function') {
                const adapterError = new Error('Kopia-Spawn lieferte keinen vollstaendigen Kindprozess.');
                adapterError.code = 'KOPIA_ADAPTER_INCOMPLETE';
                throw adapterError;
              }
            } catch (error) {
              spawnSettled = true;
              rejectSpawn(error);
              reject(error);
              return;
            }
            const collect = (chunks) => (chunk) => {
              outputBytes += chunk.length;
              if (outputBytes > 8 * 1024 * 1024) {
                outputOverflow = true;
                child.kill('SIGKILL');
                return;
              }
              chunks.push(Buffer.from(chunk));
            };
            child.stdout.on('data', collect(stdoutChunks));
            child.stderr.on('data', collect(stderrChunks));
            const timer = setTimeout(() => {
              timedOut = true;
              child.kill('SIGKILL');
            }, timeoutMs);
            child.once('spawn', () => {
              if (spawnSettled) return;
              spawnSettled = true;
              resolveSpawn(true);
            });
            child.once('error', (error) => {
              clearTimeout(timer);
              if (!spawnSettled) {
                spawnSettled = true;
                rejectSpawn(error);
              }
              reject(error);
            });
            child.once('close', (exitCode) => {
              clearTimeout(timer);
              if (!spawnSettled) {
                spawnSettled = true;
                const spawnError = new Error('Kopia-Kindprozess endete ohne bestaetigten Spawn.');
                spawnError.code = 'KOPIA_SPAWN_UNCONFIRMED';
                rejectSpawn(spawnError);
                reject(spawnError);
                return;
              }
              if (timedOut) {
                const timeout = new Error('Kopia-Kommando ueberschritt sein Zeitbudget und wurde beendet.');
                timeout.code = 'KOPIA_COMMAND_TIMEOUT';
                timeout.killed = true;
                reject(timeout);
                return;
              }
              if (outputOverflow) {
                const overflow = new Error('Kopia-Ausgabe ueberschritt die feste Redaktionsgrenze.');
                overflow.code = 'KOPIA_OUTPUT_LIMIT';
                reject(overflow);
                return;
              }
              const stdout = Buffer.concat(stdoutChunks).toString('utf8');
              const stderr = Buffer.concat(stderrChunks).toString('utf8');
              const combined = `${stdout}\n${stderr}`;
              if (secrets.some((secret) => secret && combined.includes(secret))) {
                const outputError = new Error('Kopia-Ausgabe verletzte die Secret-Redaktionsgrenze.');
                outputError.code = 'KOPIA_OUTPUT_SECRET';
                reject(outputError);
                return;
              }
              resolve({ exitCode: Number.isInteger(exitCode) ? exitCode : 1, stdout, stderr });
            });
          });
          Object.defineProperty(completion, 'spawnOutcome', {
            value: spawnOutcome,
            enumerable: false,
            writable: false,
            configurable: false
          });
          return completion;
        }
      });
    }
  });
}

const secretSafeCommandRunner = createSecretSafeCommandRunner();

function createFreshCacheFactory(tempRoot, { fsImpl = fs, pathImpl = path } = {}) {
  return async () => {
    const cachePath = fsImpl.mkdtempSync(pathImpl.join(tempRoot, 'waschzeit-kopia-empty-cache-'));
    fsImpl.chmodSync(cachePath, 0o700);
    return {
      path: cachePath,
      dispose: async () => fsImpl.rmSync(cachePath, { recursive: true, force: true })
    };
  };
}

function productionReplicaStoreFromEnvironment(env, tempRoot, {
  fsImpl = fs,
  pathImpl = path,
  platform = process.platform,
  processUid = typeof process.getuid === 'function' ? process.getuid() : null
} = {}) {
  const runtimePin = Object.freeze({
    version: String(env.KOPIA_RELEASE_VERSION || ''),
    releaseCommit: String(env.KOPIA_RELEASE_COMMIT || ''),
    linuxX64ArchiveSha256: String(env.KOPIA_RELEASE_ARCHIVE_SHA256 || ''),
    checksumsSha256: String(env.KOPIA_RELEASE_CHECKSUMS_SHA256 || ''),
    signatureSha256: String(env.KOPIA_RELEASE_SIGNATURE_SHA256 || '')
  });
  const common = {
    executablePath: String(env.KOPIA_BINARY_PATH || ''),
    runtimePin,
    serverUrl: String(env.KOPIA_REPOSITORY_SERVER_URL || ''),
    serverCertificateSha256: String(env.KOPIA_REPOSITORY_SERVER_CERT_SHA256 || ''),
    repositoryUsername: String(env.KOPIA_REPOSITORY_APP_USERNAME || ''),
    repositoryHostname: String(env.KOPIA_REPOSITORY_APP_HOSTNAME || ''),
    accessRole: String(env.KOPIA_REPOSITORY_APP_ACL_ROLE || ''),
    credential: String(env.KOPIA_REPOSITORY_APP_PASSWORD || ''),
    commandRunner: secretSafeCommandRunner,
    systemEnvironment: env,
    expectedBinarySha256: String(env.KOPIA_BINARY_SHA256 || ''),
    freshCacheFactory: createFreshCacheFactory(tempRoot, { fsImpl, pathImpl }),
    commandTimeoutMs: Number(env.PRODUCTION_KOPIA_COMMAND_TIMEOUT_SECONDS) * 1000,
    fsImpl,
    platform,
    processUid
  };
  const prevalidatedRuntime = validateKopiaRuntimeContract(common);
  const connectionRoot = pathImpl.join(tempRoot, `waschzeit-kopia-app-${require('crypto').randomUUID()}`);
  const replicaStore = createKopiaReplicaStore({
    ...common,
    configPath: pathImpl.join(connectionRoot, 'repository.config'),
    prevalidatedRuntime
  });
  fsImpl.mkdirSync(connectionRoot, { recursive: false, mode: 0o700 });
  fsImpl.chmodSync(connectionRoot, 0o700);
  return replicaStore;
}

function assertProductionTargetInvariants(db, expectedSchemaHash) {
  const required = [
    ['table', 'production_migration_ledger'],
    ['trigger', 'production_migration_ledger_no_update'],
    ['trigger', 'production_migration_ledger_no_delete']
  ];
  for (const [type, name] of required) {
    if (!db.prepare('SELECT 1 FROM sqlite_schema WHERE type=? AND name=?').get(type, name)) {
      throw new Error(`PRODUCTION_TARGET_INVARIANT_MISSING:${name}`);
    }
  }
  if (String(db.pragma('integrity_check', { simple: true })).toLowerCase() !== 'ok'
    || db.pragma('foreign_key_check').length !== 0 || readSchemaIdentity(db).hash !== expectedSchemaHash) {
    throw new Error('PRODUCTION_TARGET_INVARIANT_FAILED');
  }
  return captureDataInvariants(db);
}

function backupArguments({ db, DatabaseImpl, fsImpl, pathImpl, tempRoot, replicaStore, contract, schemaHash, phase, now }) {
  return {
    db,
    Database: DatabaseImpl,
    fs: fsImpl,
    path: pathImpl,
    tempRoot,
    replicaStore,
    schemaHash,
    contractHash: contract.contractHash,
    commit: contract.commit,
    appVersion: contract.appVersion,
    phase,
    now
  };
}

async function runProductionPredeployGate({
  env = process.env,
  DatabaseImpl = Database,
  fsImpl = fs,
  pathImpl = path,
  tempRoot = os.tmpdir(),
  rootDir = path.resolve(__dirname, '..', '..'),
  now = () => new Date(),
  replicaStoreFactory = productionReplicaStoreFromEnvironment
} = {}) {
  const contract = evaluateProductionGuard({ env, appVersion: packageInfo.version });
  if (!contract.production) throw new Error('PRODUCTION_PREDEPLOY_TARGET_REQUIRED');
  const artifact = loadMigrationArtifact({
    rootDir, relativePath: contract.migrationArtifact, appVersion: contract.appVersion, commit: contract.commit
  });
  if (artifact.fromSchemaHash !== contract.baselineSchemaHash) throw new Error('PRODUCTION_PREDEPLOY_BASELINE_BINDING');
  const baseline = openReadOnlyBaseline({
    Database: DatabaseImpl, dbPath: contract.dbPath,
    expectedSchemaHashes: [artifact.fromSchemaHash, artifact.toSchemaHash]
  });
  const replicaStore = replicaStoreFactory(env, tempRoot, { fsImpl, pathImpl });
  const readonlyDb = new DatabaseImpl(contract.dbPath, { readonly: true, fileMustExist: true });
  try {
    readonlyDb.pragma('foreign_keys = ON');
    readonlyDb.pragma('query_only = ON');
    const backup = await createEncryptedProductionBackup(backupArguments({
      db: readonlyDb, DatabaseImpl, fsImpl, pathImpl, tempRoot, replicaStore,
      contract, schemaHash: baseline.hash, phase: 'pre-deploy', now
    }));
    assertVerifiedBackupForGate(backup, {
      phase: 'pre-deploy', maximumAgeMs: contract.backupMaximumAgeSeconds * 1000,
      now: () => now().getTime()
    });
    return Object.freeze({ ok: true, contractHash: contract.contractHash, schemaHash: baseline.hash, backup });
  } finally {
    readonlyDb.close();
  }
}

async function prepareProductionStartup({
  env = process.env,
  DatabaseImpl = Database,
  fsImpl = fs,
  pathImpl = path,
  tempRoot = os.tmpdir(),
  rootDir = path.resolve(__dirname, '..', '..'),
  now = () => new Date(),
  replicaStoreFactory = productionReplicaStoreFromEnvironment,
  failAfterStep = ''
} = {}) {
  const contract = evaluateProductionGuard({ env, appVersion: packageInfo.version });
  if (!contract.production) return Object.freeze({ production: false });

  const runtimeFlags = createRuntimeFlags({ env, logger: { warn() {} } });
  const providerHold = createProviderHold({ enabled: true, runtimeFlags, env });
  providerHold.assertZeroExternalAttempts();
  const artifact = loadMigrationArtifact({
    rootDir, relativePath: contract.migrationArtifact, appVersion: contract.appVersion, commit: contract.commit
  });
  if (artifact.fromSchemaHash !== contract.baselineSchemaHash) throw new Error('PRODUCTION_MIGRATION_BASELINE_BINDING');
  const baseline = openReadOnlyBaseline({
    Database: DatabaseImpl, dbPath: contract.dbPath,
    expectedSchemaHashes: [artifact.fromSchemaHash, artifact.toSchemaHash]
  });
  const replicaStore = replicaStoreFactory(env, tempRoot, { fsImpl, pathImpl });

  const readonlyDb = new DatabaseImpl(contract.dbPath, { readonly: true, fileMustExist: true });
  let preMigrationBackup;
  try {
    readonlyDb.pragma('foreign_keys = ON');
    readonlyDb.pragma('query_only = ON');
    preMigrationBackup = await createEncryptedProductionBackup(backupArguments({
      db: readonlyDb, DatabaseImpl, fsImpl, pathImpl, tempRoot, replicaStore,
      contract, schemaHash: baseline.hash, phase: 'pre-migration', now
    }));
  } finally {
    readonlyDb.close();
  }
  assertVerifiedBackupForGate(preMigrationBackup, {
    phase: 'pre-migration', maximumAgeMs: contract.backupMaximumAgeSeconds * 1000,
    now: () => now().getTime()
  });

  const firstWritePermit = Object.freeze({
    contractHash: contract.contractHash,
    expectedContractHash: contract.contractHash,
    preMigrationBackupVerified: true,
    failAfterStep
  });
  assertWritableDatabasePermit(firstWritePermit, contract.contractHash);
  const writableDb = new DatabaseImpl(contract.dbPath, { fileMustExist: true });
  let migration;
  let targetInvariants;
  let postMigrationBackup;
  try {
    writableDb.pragma('foreign_keys = ON');
    writableDb.pragma('journal_mode = WAL');
    writableDb.pragma('busy_timeout = 5000');
    migration = applyProductionMigration({ db: writableDb, artifact, migrationPermit: firstWritePermit, now });
    targetInvariants = assertProductionTargetInvariants(writableDb, artifact.toSchemaHash);
    postMigrationBackup = await createEncryptedProductionBackup(backupArguments({
      db: writableDb, DatabaseImpl, fsImpl, pathImpl, tempRoot, replicaStore,
      contract, schemaHash: artifact.toSchemaHash, phase: 'post-migration', now
    }));
  } finally {
    writableDb.close();
  }
  assertVerifiedBackupForGate(postMigrationBackup, {
    phase: 'post-migration', maximumAgeMs: contract.backupMaximumAgeSeconds * 1000,
    now: () => now().getTime()
  });
  const rollback = createRollbackContract({
    currentCommit: contract.commit,
    codeRollbackCommit: contract.rollbackCommit,
    preMigrationSnapshotId: preMigrationBackup.snapshotId,
    preMigrationManifestSha256: preMigrationBackup.manifestSha256,
    preMigrationSchemaHash: baseline.hash,
    currentSchemaHash: artifact.toSchemaHash,
    codeCompatibleSchemaHashes: artifact.compatibleCode.includes(contract.appVersion) ? [artifact.toSchemaHash] : []
  });
  providerHold.assertZeroExternalAttempts();
  return installProductionStartupPermit({
    production: true,
    contractHash: contract.contractHash,
    runtimePermit: true,
    baselineVerified: true,
    preMigrationBackupVerified: true,
    postMigrationBackupVerified: true,
    targetSchemaHash: artifact.toSchemaHash,
    targetInvariants,
    migration,
    preMigrationBackup,
    postMigrationBackup,
    rollback,
    replicaStore
  });
}

function createProductionBackupRuntime({
  db, DatabaseImpl = Database, fsImpl = fs, pathImpl = path, tempRoot = os.tmpdir(),
  contract, permit, now = () => new Date()
} = {}) {
  if (!permit?.runtimePermit || permit.contractHash !== contract?.contractHash) {
    throw new Error('PRODUCTION_BACKUP_RUNTIME_PERMIT');
  }
  const freshnessGate = createBackupFreshnessGate({
    maximumAgeMs: contract.backupMaximumAgeSeconds * 1000,
    now: () => now().getTime(),
    initialBackup: permit.postMigrationBackup
  });
  const scheduler = createPeriodicBackupScheduler({
    intervalMs: contract.backupIntervalSeconds * 1000,
    timeoutMs: contract.backupJobTimeoutSeconds * 1000,
    freshnessGate,
    backup: () => createEncryptedProductionBackup(backupArguments({
      db, DatabaseImpl, fsImpl, pathImpl, tempRoot, replicaStore: permit.replicaStore,
      contract, schemaHash: permit.targetSchemaHash, phase: 'periodic', now
    }))
  });
  return Object.freeze({ freshnessGate, scheduler });
}

module.exports = {
  assertProductionTargetInvariants,
  createFreshCacheFactory,
  createSecretSafeCommandRunner,
  createProductionBackupRuntime,
  prepareProductionStartup,
  productionReplicaStoreFromEnvironment,
  runProductionPredeployGate,
  secretSafeCommandRunner
};
