'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');
const Database = require('better-sqlite3');
const packageInfo = require('../package.json');
const { evaluateProductionGuard, clearProductionStartupPermitForTests } = require('../src/services/production-guard');
const { openReadOnlyBaseline, readSchemaIdentity } = require('../src/services/guarded-database');
const {
  createEncryptedProductionBackup,
  restoreEncryptedProductionBackup
} = require('../src/services/production-backup');
const {
  createBackupFreshnessGate,
  createPeriodicBackupScheduler
} = require('../src/services/production-backup-scheduler');
const {
  applyProductionMigration,
  artifactHash,
  captureDataInvariants,
  createLedgerSql,
  validateMigrationArtifact
} = require('../src/services/production-migrations');
const {
  KOPIA_PIN,
  createKopiaReplicaStore,
  createKopiaVerifierStore,
  validateKopiaRuntimeContract
} = require('../src/services/kopia-replica-store');
const { createProviderHold } = require('../src/services/provider-hold');
const { authorizeDataRestore, createRollbackContract, planCodeRollback } = require('../src/services/production-rollback');
const {
  createSecretSafeCommandRunner,
  prepareProductionStartup,
  productionReplicaStoreFromEnvironment,
  runProductionPredeployGate
} = require('../src/services/production-startup');

const COMMIT = '1'.repeat(40);
const ROLLBACK_COMMIT = '2'.repeat(40);
const LINUX_READ_FLAGS = 0x20000 | 0x80000;

function fakeLinuxX64Elf(label = '', { interpreter = '' } = {}) {
  const interpreterBytes = interpreter ? Buffer.from(`${interpreter}\0`, 'utf8') : Buffer.alloc(0);
  const programCount = interpreter ? 1 : 0;
  const programBytes = programCount * 56;
  const payload = Buffer.from(String(label), 'utf8');
  const binary = Buffer.alloc(64 + programBytes + interpreterBytes.length + payload.length);
  binary.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0);
  binary.writeUInt16LE(2, 16);
  binary.writeUInt16LE(62, 18);
  binary.writeUInt32LE(1, 20);
  binary.writeBigUInt64LE(64n, 32);
  binary.writeUInt16LE(64, 52);
  binary.writeUInt16LE(56, 54);
  binary.writeUInt16LE(programCount, 56);
  if (interpreter) {
    const interpreterOffset = 64 + programBytes;
    binary.writeUInt32LE(3, 64);
    binary.writeBigUInt64LE(BigInt(interpreterOffset), 72);
    binary.writeBigUInt64LE(BigInt(interpreterBytes.length), 96);
    interpreterBytes.copy(binary, interpreterOffset);
  }
  payload.copy(binary, 64 + programBytes + interpreterBytes.length);
  return binary;
}

function sealedLinuxStat(stat) {
  return new Proxy(stat, {
    get(target, property) {
      if (property === 'mode') return (Number(target.mode) & 0o170000) | 0o555;
      if (property === 'uid') return 0;
      if (property === 'gid') return 0;
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function createLinuxFdTestFs(overrides = {}, { sealStats = true } = {}) {
  return new Proxy(fs, {
    get(target, property) {
      if (property === 'statSync') {
        return (candidate, ...args) => {
          if (Object.prototype.hasOwnProperty.call(overrides, property)) {
            return overrides[property](candidate, ...args);
          }
          if (String(candidate) === '/proc/self/fd') {
            return { isDirectory: () => true };
          }
          return target.statSync(candidate, ...args);
        };
      }
      if (property === 'lstatSync' || property === 'fstatSync') {
        return (...args) => {
          const result = Object.prototype.hasOwnProperty.call(overrides, property)
            ? overrides[property](...args)
            : target[property](...args);
          return sealStats ? sealedLinuxStat(result) : result;
        };
      }
      if (property === 'openSync') {
        return (candidate, flags, ...args) => {
          const hostFlags = flags === LINUX_READ_FLAGS ? 'r' : flags;
          if (Object.prototype.hasOwnProperty.call(overrides, property)) {
            return overrides[property](candidate, flags, ...args);
          }
          return target.openSync(candidate, hostFlags, ...args);
        };
      }
      if (Object.prototype.hasOwnProperty.call(overrides, property)) return overrides[property];
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function createCloseTrackingLinuxFs(overrides = {}) {
  const opened = [];
  const closed = [];
  const base = createLinuxFdTestFs(overrides);
  return {
    opened,
    closed,
    fs: new Proxy(base, {
      get(target, property) {
        if (property === 'openSync') {
          return (...args) => {
            const descriptor = target.openSync(...args);
            opened.push(descriptor);
            return descriptor;
          };
        }
        if (property === 'closeSync') {
          return (descriptor) => {
            closed.push(descriptor);
            return target.closeSync(descriptor);
          };
        }
        const value = target[property];
        return typeof value === 'function' ? value.bind(target) : value;
      }
    })
  };
}

function createBaseline(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE houses (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE users (id INTEGER PRIMARY KEY, house_id INTEGER NOT NULL REFERENCES houses(id), username TEXT NOT NULL);
    CREATE TABLE apartments (id INTEGER PRIMARY KEY, house_id INTEGER NOT NULL REFERENCES houses(id), label TEXT NOT NULL);
    CREATE TABLE resources (id INTEGER PRIMARY KEY, house_id INTEGER NOT NULL REFERENCES houses(id), name TEXT NOT NULL);
    CREATE TABLE bookings (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), resource_id INTEGER NOT NULL REFERENCES resources(id));
    CREATE TABLE fixed_bookings (id INTEGER PRIMARY KEY, resource_id INTEGER NOT NULL REFERENCES resources(id));
    CREATE TABLE booking_day_usage (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id));
    CREATE TABLE remaining_slot_requests (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id));
    INSERT INTO houses VALUES (1, 'synthetic');
    INSERT INTO users VALUES (1, 1, 'synthetic-user');
    INSERT INTO apartments VALUES (1, 1, 'A');
    INSERT INTO resources VALUES (1, 1, 'synthetic-resource');
    INSERT INTO bookings VALUES (1, 1, 1);
  `);
  const identity = readSchemaIdentity(db);
  const invariants = captureDataInvariants(db);
  db.close();
  return { identity, invariants };
}

async function createMigrationContract(tempRoot, dbPath) {
  fs.mkdirSync(tempRoot, { recursive: true });
  const baseline = createBaseline(dbPath);
  const targetPath = path.join(tempRoot, 'target.sqlite');
  const source = new Database(dbPath, { readonly: true, fileMustExist: true });
  await source.backup(targetPath);
  source.close();
  const target = new Database(targetPath);
  target.pragma('foreign_keys = ON');
  target.pragma('journal_mode = WAL');
  target.exec(createLedgerSql());
  target.exec('CREATE INDEX idx_bookings_resource ON bookings(resource_id)');
  const targetIdentity = readSchemaIdentity(target);
  target.close();
  const artifact = {
    format: 1,
    id: 'production-ledger-test14',
    appVersion: packageInfo.version,
    commit: COMMIT,
    fromSchemaHash: baseline.identity.hash,
    toSchemaHash: targetIdentity.hash,
    destructive: false,
    compatibleCode: [packageInfo.version],
    steps: [{ id: 'add-booking-index', sql: 'CREATE INDEX idx_bookings_resource ON bookings(resource_id)' }]
  };
  artifact.artifactSha256 = artifactHash(artifact);
  const artifactRoot = path.join(tempRoot, 'artifact-root');
  const artifactDirectory = path.join(artifactRoot, 'migrations', 'production');
  fs.mkdirSync(artifactDirectory, { recursive: true });
  fs.writeFileSync(path.join(artifactDirectory, 'test14.json'), `${JSON.stringify(artifact)}\n`);
  return { artifact, artifactRoot, baseline, targetIdentity };
}

function productionEnv(dbPath, baselineHash) {
  return {
    NODE_ENV: 'production', APP_ENV: 'production',
    PRODUCTION_EXPECTED_VERSION: packageInfo.version,
    PRODUCTION_EXPECTED_COMMIT: COMMIT, RENDER_GIT_COMMIT: COMMIT,
    PRODUCTION_CODE_ROLLBACK_COMMIT: ROLLBACK_COMMIT,
    PRODUCTION_EXPECTED_RELEASE: `v${packageInfo.version}`, APP_RELEASE: `v${packageInfo.version}`,
    PRODUCTION_EXPECTED_SERVICE: 'synthetic-production', RENDER_SERVICE_NAME: 'synthetic-production',
    PRODUCTION_EXPECTED_URL: 'https://example.invalid', PUBLIC_APP_URL: 'https://example.invalid',
    PRODUCTION_EXPECTED_DB_PATH: dbPath, DB_PATH: dbPath,
    PRODUCTION_SINGLE_INSTANCE: 'true', WEB_CONCURRENCY: '1',
    PRODUCTION_PROVIDER_HOLD: 'true', PRODUCTION_SEED_DISABLED: 'true', PRODUCTION_PREDEPLOY_REQUIRED: 'true',
    EMAIL_ENABLED: 'false', PUSH_ENABLED: 'false', BACKUP_ENABLED: 'true', AUTO_BACKUP: 'false',
    PRODUCTION_BACKUP_MODE: 'kopia-repository-server', PRODUCTION_BACKUP_RESIDENCY: 'EU',
    PRODUCTION_BACKUP_RETENTION_DAYS: '30', PRODUCTION_RPO_MODE: 'periodic-5m',
    PRODUCTION_RPO_MINUTES: '5', PRODUCTION_RTO_HOURS: '4',
    PRODUCTION_BACKUP_INTERVAL_SECONDS: '60', PRODUCTION_BACKUP_MAX_AGE_SECONDS: '240',
    PRODUCTION_BACKUP_JOB_TIMEOUT_SECONDS: '10', PRODUCTION_KOPIA_COMMAND_TIMEOUT_SECONDS: '5',
    KOPIA_RELEASE_VERSION: KOPIA_PIN.version, KOPIA_RELEASE_COMMIT: KOPIA_PIN.releaseCommit,
    KOPIA_RELEASE_ARCHIVE_SHA256: KOPIA_PIN.linuxX64ArchiveSha256,
    KOPIA_RELEASE_CHECKSUMS_SHA256: KOPIA_PIN.checksumsSha256,
    KOPIA_RELEASE_SIGNATURE_SHA256: KOPIA_PIN.signatureSha256,
    KOPIA_BINARY_PATH: path.resolve('synthetic-kopia'), KOPIA_BINARY_SHA256: '3'.repeat(64),
    KOPIA_REPOSITORY_SERVER_URL: 'https://kopia-repository.example.invalid',
    KOPIA_REPOSITORY_SERVER_CERT_SHA256: '7'.repeat(64),
    KOPIA_REPOSITORY_APP_USERNAME: 'waschzeit-app',
    KOPIA_REPOSITORY_APP_HOSTNAME: 'waschzeit-production',
    KOPIA_REPOSITORY_APP_ACL_ROLE: 'APPEND_READ',
    SESSION_SECRET: 'session-'.padEnd(40, 's'),
    KOPIA_REPOSITORY_APP_PASSWORD: 'kopia-app-'.padEnd(32, 'k'),
    PRODUCTION_BACKUP_ENVELOPE_KEY_ID: 'owner-envelope-test14',
    PRODUCTION_BASELINE_SCHEMA_SHA256: baselineHash,
    PRODUCTION_MIGRATION_ARTIFACT: 'migrations/production/test14.json'
  };
}

function createFakeReplicaStore(root, controls = {}) {
  const snapshots = new Map();
  const events = [];
  let sequence = 0;
  return {
    kind: 'encrypted-replica',
    implementation: 'kopia-repository-server',
    repositoryTransport: 'server',
    clientSideEncryption: true,
    accessRole: 'APPEND_READ',
    deleteCapability: false,
    maintenanceCapability: false,
    providerCredentialsPresent: false,
    events,
    snapshots,
    async snapshotDirectory(directory, { tags }) {
      events.push(`snapshot:${tags.phase}`);
      if (controls.failPhase === tags.phase) {
        const error = new Error('synthetic remote failure');
        error.code = 'SYNTHETIC_REMOTE_FAILURE';
        throw error;
      }
      const snapshotId = `snapshot-${++sequence}-test14`;
      const destination = path.join(root, snapshotId);
      fs.cpSync(directory, destination, { recursive: true });
      snapshots.set(snapshotId, destination);
      return { snapshotId };
    },
    async verifySnapshot(snapshotId) {
      events.push(`verify:${snapshotId}`);
      if (controls.verifyFailure) return { ok: false, snapshotId };
      return { ok: snapshots.has(snapshotId), snapshotId };
    },
    async readbackSnapshot(snapshotId, target) {
      events.push(`readback:${snapshotId}`);
      const source = snapshots.get(snapshotId);
      if (!source) throw new Error('missing snapshot');
      fs.cpSync(source, target, { recursive: true });
      return { ok: true, snapshotId, targetPath: target };
    }
  };
}

function createFakeVerifierStore(appStore) {
  return {
    kind: 'encrypted-replica',
    implementation: 'kopia-repository-server',
    repositoryTransport: 'server',
    clientSideEncryption: true,
    accessRole: 'READ_ONLY',
    deleteCapability: false,
    maintenanceCapability: false,
    providerCredentialsPresent: false,
    async verifySnapshot(snapshotId) {
      appStore.events.push(`verifier-verify:${snapshotId}`);
      return { ok: appStore.snapshots.has(snapshotId), snapshotId };
    },
    async restoreSnapshot(snapshotId, target) {
      appStore.events.push(`verifier-restore:${snapshotId}`);
      const source = appStore.snapshots.get(snapshotId);
      if (!source) throw new Error('missing snapshot');
      fs.cpSync(source, target, { recursive: true });
      return { ok: true, snapshotId, targetPath: target };
    }
  };
}

function createWriteTrackingFs(overrides = {}) {
  const writes = [];
  const linuxFs = createLinuxFdTestFs(overrides);
  const writeMethods = new Set([
    'appendFileSync', 'chmodSync', 'copyFileSync', 'mkdirSync', 'mkdtempSync', 'renameSync',
    'rmSync', 'truncateSync', 'unlinkSync', 'writeFileSync'
  ]);
  const proxy = new Proxy(linuxFs, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => {
        if (writeMethods.has(property)
          || (property === 'openSync' && args[1] !== LINUX_READ_FLAGS
            && !['r', 'rs', 'sr'].includes(String(args[1] || '')))) {
          writes.push({ method: property, path: String(args[0] || '') });
        }
        return value.apply(target, args);
      };
    }
  });
  return { fs: proxy, writes };
}

function createPreparedCommandRunner(handler, { prepare = null } = {}) {
  return Object.freeze({
    executionMode: 'linux-proc-fd',
    prepare(executable, args, options) {
      prepare?.(executable, args, options);
      const preparedExecutable = executable;
      const preparedArgs = [...args];
      const preparedOptions = { ...options, env: { ...options.env } };
      return Object.freeze({
        start(executionHandle) {
          assert.strictEqual(executionHandle.kind, 'validated-kopia-elf-handle');
          assert.strictEqual(executionHandle.procExecutablePath, '/proc/self/fd/3');
          assert.strictEqual(executionHandle.childFd, 3);
          assert.strictEqual(executionHandle.identity.executablePath, preparedExecutable,
            'Der FD muss exakt dem final validierten Artefakt entsprechen');
          try {
            const completion = Promise.resolve(handler(executionHandle, preparedArgs, preparedOptions));
            Object.defineProperty(completion, 'spawnOutcome', {
              value: Promise.resolve(true), enumerable: false
            });
            return completion;
          } catch (error) {
            const completion = Promise.reject(error);
            Object.defineProperty(completion, 'spawnOutcome', {
              value: Promise.reject(error), enumerable: false
            });
            return completion;
          }
        }
      });
    }
  });
}

function createCompletingChild({
  exitCode = 0, stdout = '{}', stderr = '', beforeSpawn = null, emitSpawn = true
} = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => true;
  process.nextTick(() => {
    beforeSpawn?.();
    if (emitSpawn) child.emit('spawn');
    if (stdout) child.stdout.write(stdout);
    if (stderr) child.stderr.write(stderr);
    child.stdout.end();
    child.stderr.end();
    child.emit('close', exitCode);
  });
  return child;
}

function createFailingChild(error, { beforeError = null } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => true;
  process.nextTick(() => {
    beforeError?.();
    child.emit('error', error);
    child.stdout.end();
    child.stderr.end();
    child.emit('close', 1);
  });
  return child;
}

function testKopiaPreflightBeforeWrites(tempRoot, dbPath, baselineHash) {
  const binaryPath = path.join(tempRoot, 'kopia-preflight-fake');
  fs.writeFileSync(binaryPath, fakeLinuxX64Elf('synthetic pinned kopia binary'));
  const binarySha256 = crypto.createHash('sha256').update(fs.readFileSync(binaryPath)).digest('hex');
  const baseEnv = {
    ...productionEnv(dbPath, baselineHash),
    KOPIA_BINARY_PATH: binaryPath,
    KOPIA_BINARY_SHA256: binarySha256
  };
  const wrongPlatform = createWriteTrackingFs();
  assert.throws(() => productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: wrongPlatform.fs, pathImpl: path, platform: 'win32', processUid: 1000
  }), (error) => error.code === 'KOPIA_EXECUTION_PLATFORM');
  assert.deepStrictEqual(wrongPlatform.writes, [], 'Nicht-Linux muss vor jeder FS-Schreibwirkung stoppen');

  const missingProc = createWriteTrackingFs({
    statSync(candidate) {
      if (String(candidate) === '/proc/self/fd') return { isDirectory: () => false };
      return fs.statSync(candidate);
    }
  });
  assert.throws(() => productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: missingProc.fs, pathImpl: path, platform: 'linux', processUid: 1000
  }), (error) => error.code === 'KOPIA_PROC_FD_UNAVAILABLE');
  assert.deepStrictEqual(missingProc.writes, [], 'Fehlendes procfs muss vor jeder FS-Schreibwirkung stoppen');

  const cases = [
    {
      name: 'missing',
      env: { ...baseEnv, KOPIA_BINARY_PATH: path.join(tempRoot, 'missing-kopia') },
      expected: 'KOPIA_COMPONENT_UNAVAILABLE'
    },
    {
      name: 'wrong-hash',
      env: { ...baseEnv, KOPIA_BINARY_SHA256: '0'.repeat(64) },
      expected: 'KOPIA_BINARY_HASH'
    },
    {
      name: 'wrong-version-pin',
      env: { ...baseEnv, KOPIA_RELEASE_VERSION: '0.23.0' },
      expected: 'KOPIA_PIN_MISMATCH'
    },
    {
      name: 'wrong-server-url',
      env: { ...baseEnv, KOPIA_REPOSITORY_SERVER_URL: 'http://kopia.example.invalid' },
      expected: 'KOPIA_SERVER_URL'
    },
    {
      name: 'wrong-tls-pin',
      env: { ...baseEnv, KOPIA_REPOSITORY_SERVER_CERT_SHA256: 'short' },
      expected: 'KOPIA_SERVER_CERTIFICATE'
    },
    {
      name: 'wrong-acl',
      env: { ...baseEnv, KOPIA_REPOSITORY_APP_ACL_ROLE: 'FULL' },
      expected: 'KOPIA_SERVER_ACL'
    },
    {
      name: 'direct-provider',
      env: { ...baseEnv, AWS_ACCESS_KEY_ID: 'forbidden' },
      expected: 'KOPIA_DIRECT_PROVIDER_BINDING'
    }
  ];
  const directoryPath = path.join(tempRoot, 'kopia-is-directory');
  fs.mkdirSync(directoryPath);
  cases.push({
    name: 'wrong-type', env: { ...baseEnv, KOPIA_BINARY_PATH: directoryPath }, expected: 'KOPIA_BINARY_TYPE'
  });

  for (const testCase of cases) {
    const tracker = createWriteTrackingFs();
    assert.throws(() => productionReplicaStoreFromEnvironment(testCase.env, tempRoot, {
      fsImpl: tracker.fs, pathImpl: path, platform: 'linux', processUid: 1000
    }), (error) => error.code === testCase.expected, testCase.name);
    assert.deepStrictEqual(tracker.writes, [], `${testCase.name} muss vor jeder FS-Schreibwirkung stoppen`);
  }

  const unreadable = createWriteTrackingFs({
    openSync(candidate, flags) {
      if (path.resolve(candidate) === path.resolve(binaryPath) && flags === LINUX_READ_FLAGS) {
        const error = new Error('synthetic unreadable');
        error.code = 'EACCES';
        throw error;
      }
      return fs.openSync(candidate, flags === LINUX_READ_FLAGS ? 'r' : flags);
    }
  });
  assert.throws(() => productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: unreadable.fs, pathImpl: path, platform: 'linux', processUid: 1000
  }), (error) => error.code === 'KOPIA_COMPONENT_UNAVAILABLE');
  assert.deepStrictEqual(unreadable.writes, [], 'Unlesbares Binary muss null Writes besitzen');

  const drifted = createWriteTrackingFs({
    realpathSync(candidate) {
      if (path.resolve(candidate) === path.resolve(binaryPath)) return path.join(tempRoot, 'replacement-kopia');
      return fs.realpathSync(candidate);
    }
  });
  assert.throws(() => productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: drifted.fs, pathImpl: path, platform: 'linux', processUid: 1000
  }), (error) => error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.deepStrictEqual(drifted.writes, [], 'Pfaddrift muss null Writes besitzen');

  const replaced = createWriteTrackingFs({
    fstatSync(descriptor) {
      const actual = fs.fstatSync(descriptor);
      return { ...actual, size: actual.size + 1, isFile: () => true };
    }
  });
  assert.throws(() => productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: replaced.fs, pathImpl: path, platform: 'linux', processUid: 1000
  }), (error) => error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.deepStrictEqual(replaced.writes, [], 'Ersetztes Binary muss null Writes besitzen');

  const success = createWriteTrackingFs();
  const store = productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: success.fs, pathImpl: path, platform: 'linux', processUid: 1000
  });
  assert.strictEqual(store.accessRole, 'APPEND_READ');
  assert.deepStrictEqual(success.writes.map(({ method }) => method), ['mkdirSync', 'chmodSync'],
    'Erst nach vollstaendigem read-only Preflight darf der geschuetzte Connection-Root entstehen');

  const observedOpenFlags = [];
  const exactFlags = createWriteTrackingFs({
    openSync(candidate, flags) {
      observedOpenFlags.push(flags);
      return fs.openSync(candidate, flags === LINUX_READ_FLAGS ? 'r' : flags);
    }
  });
  productionReplicaStoreFromEnvironment(baseEnv, tempRoot, {
    fsImpl: exactFlags.fs, pathImpl: path, platform: 'linux', processUid: 1000
  });
  assert(observedOpenFlags.length >= 2);
  assert(observedOpenFlags.every((flags) => flags === LINUX_READ_FLAGS),
    'Jeder Binaerhandle muss O_RDONLY|O_NOFOLLOW|O_CLOEXEC verwenden');
}

async function testFdBoundKopiaExecution(tempRoot) {
  fs.mkdirSync(tempRoot, { recursive: true });
  const executable = path.join(tempRoot, 'kopia-fd-bound');
  const displacedExecutable = path.join(tempRoot, 'kopia-fd-bound.original');
  const originalBinary = fakeLinuxX64Elf('validated fd-bound executable');
  fs.writeFileSync(executable, originalBinary);
  const expectedBinarySha256 = crypto.createHash('sha256').update(originalBinary).digest('hex');
  const tracking = createCloseTrackingLinuxFs();
  const source = path.join(tempRoot, 'source');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'manifest.json'), '{}');
  let spawnCalls = 0;
  const runner = createSecretSafeCommandRunner({
    spawnImpl(procExecutablePath, args, options) {
      spawnCalls += 1;
      assert.strictEqual(procExecutablePath, '/proc/self/fd/3');
      assert.strictEqual(options.shell, false);
      assert.deepStrictEqual(options.stdio.slice(0, 3), ['ignore', 'pipe', 'pipe']);
      assert(Number.isInteger(options.stdio[3]));
      const inheritedFd = options.stdio[3];
      assert(tracking.opened.includes(inheritedFd));
      assert.strictEqual(tracking.closed.filter((fd) => fd === inheritedFd).length,
        tracking.opened.filter((fd) => fd === inheritedFd).length - 1,
        'Der finale Parent-FD muss waehrend des synchronen spawn noch offen sein');
      assert(args.includes('--config-file'));
      assert.strictEqual(options.env.KOPIA_CHECK_FOR_UPDATES, 'false');
      assert(!Object.keys(options.env).some((name) => /^(?:R2_|AWS_|S3_|CF_R2_|CLOUDFLARE_)/.test(name)));

      fs.renameSync(executable, displacedExecutable);
      fs.writeFileSync(executable, fakeLinuxX64Elf('attacker replacement after final open'));
      const inheritedBytes = Buffer.alloc(originalBinary.length);
      const read = fs.readSync(inheritedFd, inheritedBytes, 0, inheritedBytes.length, 0);
      assert.strictEqual(read, originalBinary.length);
      assert.deepStrictEqual(inheritedBytes, originalBinary,
        'Der geerbte FD muss trotz Pfadersatz exakt das gepruefte Artefakt liefern');
      return createCompletingChild({
        beforeSpawn() {
          assert.strictEqual(tracking.closed.filter((fd) => fd === inheritedFd).length,
            tracking.opened.filter((fd) => fd === inheritedFd).length - 1,
            'Der Parent-FD muss bis zum bestaetigten spawn-Ereignis offen bleiben');
        }
      });
    }
  });
  const invalidMappingPlan = runner.prepare(executable, ['--version'], {
    env: {}, rejectStdoutSecrets: [], timeoutMs: 5000
  });
  assert.throws(() => invalidMappingPlan.start({
    kind: 'validated-kopia-elf-handle', childFd: 4, procExecutablePath: '/proc/self/fd/4',
    parentFd: 99, identity: { executablePath: executable }
  }), (error) => error.code === 'KOPIA_BINARY_PATH_DRIFT');
  const common = {
    executablePath: executable,
    runtimePin: KOPIA_PIN,
    configPath: path.join(tempRoot, 'fd-bound.config'),
    serverUrl: 'https://kopia-repository.example.invalid',
    serverCertificateSha256: '8'.repeat(64),
    repositoryUsername: 'waschzeit-app',
    repositoryHostname: 'waschzeit-production',
    credential: 'fd-bound-app-password-test14',
    commandRunner: runner,
    systemEnvironment: { PATH: 'synthetic-path' },
    expectedBinarySha256,
    freshCacheFactory: async () => ({ path: path.join(tempRoot, 'cache'), dispose: async () => {} }),
    commandTimeoutMs: 5000,
    fsImpl: tracking.fs,
    platform: 'linux',
    processUid: 1000
  };
  const store = createKopiaReplicaStore(common);
  await assert.rejects(() => store.snapshotDirectory(source),
    (error) => error.code === 'KOPIA_BINARY_HASH' || error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.strictEqual(spawnCalls, 1, 'Der ersetzte Pfad darf keinen zweiten Subprozess starten');
  assert.strictEqual(tracking.closed.length, tracking.opened.length,
    'Jeder geoeffnete Binaerhandle muss genau einmal geschlossen werden');

  const failingExecutable = path.join(tempRoot, 'kopia-spawn-failure');
  const failingBinary = fakeLinuxX64Elf('spawn failure executable');
  fs.writeFileSync(failingExecutable, failingBinary);
  const failingTracking = createCloseTrackingLinuxFs();
  const failingStore = createKopiaReplicaStore({
    ...common,
    executablePath: failingExecutable,
    configPath: path.join(tempRoot, 'spawn-failure.config'),
    expectedBinarySha256: crypto.createHash('sha256').update(failingBinary).digest('hex'),
    fsImpl: failingTracking.fs,
    commandRunner: createSecretSafeCommandRunner({
      spawnImpl(_executable, _args, options) {
        const error = new Error('synthetic spawn failure');
        error.code = 'ENOEXEC';
        const inheritedFd = options.stdio[3];
        return createFailingChild(error, {
          beforeError() {
            assert.strictEqual(failingTracking.closed.filter((fd) => fd === inheritedFd).length,
              failingTracking.opened.filter((fd) => fd === inheritedFd).length - 1,
              'Der Parent-FD muss bis zum bestaetigten error-Ereignis offen bleiben');
          }
        });
      }
    })
  });
  await assert.rejects(() => failingStore.snapshotDirectory(source),
    (error) => error.code === 'KOPIA_COMMAND_FAILED');
  assert.strictEqual(failingTracking.closed.length, failingTracking.opened.length,
    'Auch ein bestaetigter Spawnfehler muss jeden Parent-FD genau einmal schliessen');

  const unconfirmedExecutable = path.join(tempRoot, 'kopia-unconfirmed-spawn');
  const unconfirmedBinary = fakeLinuxX64Elf('unconfirmed spawn executable');
  fs.writeFileSync(unconfirmedExecutable, unconfirmedBinary);
  const unconfirmedTracking = createCloseTrackingLinuxFs();
  const unconfirmedStore = createKopiaReplicaStore({
    ...common,
    executablePath: unconfirmedExecutable,
    configPath: path.join(tempRoot, 'unconfirmed-spawn.config'),
    expectedBinarySha256: crypto.createHash('sha256').update(unconfirmedBinary).digest('hex'),
    fsImpl: unconfirmedTracking.fs,
    commandRunner: createSecretSafeCommandRunner({
      spawnImpl() {
        return createCompletingChild({ emitSpawn: false });
      }
    })
  });
  await assert.rejects(() => unconfirmedStore.snapshotDirectory(source),
    (error) => error.code === 'KOPIA_COMMAND_FAILED');
  assert.strictEqual(unconfirmedTracking.closed.length, unconfirmedTracking.opened.length,
    'Close ohne Spawnnachweis muss den Parent-FD schliessen und fail-closed enden');

  const allowedInterpreterExecutable = path.join(tempRoot, 'kopia-allowed-interpreter');
  const allowedInterpreterBinary = fakeLinuxX64Elf('allowed interpreter', {
    interpreter: '/lib64/ld-linux-x86-64.so.2'
  });
  fs.writeFileSync(allowedInterpreterExecutable, allowedInterpreterBinary);
  const validationOptions = {
    executablePath: allowedInterpreterExecutable,
    runtimePin: KOPIA_PIN,
    serverUrl: 'https://kopia-repository.example.invalid',
    serverCertificateSha256: '8'.repeat(64),
    repositoryUsername: 'waschzeit-app',
    repositoryHostname: 'waschzeit-production',
    accessRole: 'APPEND_READ',
    credential: 'fd-bound-app-password-test14',
    commandRunner: createPreparedCommandRunner(async () => ({ exitCode: 0, stdout: '{}', stderr: '' })),
    systemEnvironment: {},
    expectedBinarySha256: crypto.createHash('sha256').update(allowedInterpreterBinary).digest('hex'),
    freshCacheFactory: async () => ({ path: 'unused', dispose: async () => {} }),
    commandTimeoutMs: 5000,
    fsImpl: createLinuxFdTestFs(),
    platform: 'linux',
    processUid: 1000
  };
  assert.strictEqual(validateKopiaRuntimeContract(validationOptions).binarySha256,
    validationOptions.expectedBinarySha256);

  const rejectedInterpreterExecutable = path.join(tempRoot, 'kopia-rejected-interpreter');
  const rejectedInterpreterBinary = fakeLinuxX64Elf('rejected interpreter', { interpreter: '/tmp/ld.so' });
  fs.writeFileSync(rejectedInterpreterExecutable, rejectedInterpreterBinary);
  assert.throws(() => validateKopiaRuntimeContract({
    ...validationOptions,
    executablePath: rejectedInterpreterExecutable,
    expectedBinarySha256: crypto.createHash('sha256').update(rejectedInterpreterBinary).digest('hex')
  }), (error) => error.code === 'KOPIA_BINARY_INTERPRETER');

  const wrongArchitectureExecutable = path.join(tempRoot, 'kopia-wrong-architecture');
  const wrongArchitectureBinary = fakeLinuxX64Elf('wrong architecture');
  wrongArchitectureBinary.writeUInt16LE(183, 18);
  fs.writeFileSync(wrongArchitectureExecutable, wrongArchitectureBinary);
  assert.throws(() => validateKopiaRuntimeContract({
    ...validationOptions,
    executablePath: wrongArchitectureExecutable,
    expectedBinarySha256: crypto.createHash('sha256').update(wrongArchitectureBinary).digest('hex')
  }), (error) => error.code === 'KOPIA_BINARY_ARCHITECTURE');

  const symlinkLikeFs = createLinuxFdTestFs({
    lstatSync(candidate) {
      const actual = fs.lstatSync(candidate);
      return new Proxy(actual, {
        get(target, property) {
          if (property === 'isSymbolicLink') return () => true;
          const value = target[property];
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    }
  });
  assert.throws(() => validateKopiaRuntimeContract({
    ...validationOptions,
    fsImpl: symlinkLikeFs
  }), (error) => error.code === 'KOPIA_BINARY_TYPE');

  const writableExecutable = path.join(tempRoot, 'kopia-writable');
  const writableBinary = fakeLinuxX64Elf('writable executable');
  fs.writeFileSync(writableExecutable, writableBinary);
  assert.throws(() => validateKopiaRuntimeContract({
    ...validationOptions,
    executablePath: writableExecutable,
    expectedBinarySha256: crypto.createHash('sha256').update(writableBinary).digest('hex'),
    fsImpl: createLinuxFdTestFs({}, { sealStats: false })
  }), (error) => ['KOPIA_BINARY_PERMISSIONS', 'KOPIA_BINARY_NOT_SEALED'].includes(error.code));
}

async function testGuardBeforeEffects(tempRoot, dbPath, baselineHash) {
  const env = productionEnv(dbPath, baselineHash);
  const contract = evaluateProductionGuard({ env, appVersion: packageInfo.version, platform: 'win32' });
  assert.strictEqual(contract.rpoMinutes, 5);
  assert.strictEqual(contract.kopiaRepositoryAppAclRole, 'APPEND_READ');
  assert.strictEqual(contract.backupIntervalSeconds < contract.backupMaximumAgeSeconds, true);
  assert.throws(() => evaluateProductionGuard({
    env: { ...env, EMAIL_ENABLED: 'true' }, appVersion: packageInfo.version, platform: 'win32'
  }), (error) => error.code === 'PRODUCTION_GUARD_FLAG');

  let fsTouched = false;
  await assert.rejects(() => prepareProductionStartup({
    env: { ...env, APP_ENV: 'wrong' },
    fsImpl: new Proxy({}, { get() { fsTouched = true; throw new Error('fs touched'); } }),
    rootDir: tempRoot,
    replicaStoreFactory() { throw new Error('store touched'); }
  }));
  assert.strictEqual(fsTouched, false, 'Guardfehler muss vor jeder FS-/DB-Wirkung enden');

  for (const forbidden of [
    'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET', 'CLOUDFLARE_API_TOKEN', 'KOPIA_REPOSITORY_FULL_TOKEN', 'KOPIA_REPOSITORY_RESTORE_PASSWORD'
  ]) {
    assert.throws(() => evaluateProductionGuard({
      env: { ...env, [forbidden]: 'must-never-reach-app' }, appVersion: packageInfo.version, platform: 'win32'
    }), (error) => error.code === 'PRODUCTION_GUARD_FORBIDDEN_BINDING');
  }
  assert.throws(() => evaluateProductionGuard({
    env: { ...env, KOPIA_REPOSITORY_APP_ACL_ROLE: 'FULL' }, appVersion: packageInfo.version, platform: 'win32'
  }), (error) => error.code === 'PRODUCTION_GUARD_REPOSITORY_ACL');
}

async function testMigrationAndBackup(tempRoot, dbPath, contractData) {
  const { artifact, baseline, targetIdentity } = contractData;
  validateMigrationArtifact(artifact, { appVersion: packageInfo.version, commit: COMMIT });
  openReadOnlyBaseline({ Database, dbPath, expectedSchemaHashes: [baseline.identity.hash] });

  const failedPath = path.join(tempRoot, 'failed.sqlite');
  const source = new Database(dbPath, { readonly: true, fileMustExist: true });
  await source.backup(failedPath);
  source.close();
  const failed = new Database(failedPath);
  failed.pragma('foreign_keys = ON');
  failed.pragma('journal_mode = WAL');
  const beforeFailure = readSchemaIdentity(failed).hash;
  assert.throws(() => applyProductionMigration({
    db: failed,
    artifact,
    migrationPermit: {
      preMigrationBackupVerified: true,
      contractHash: 'contract',
      expectedContractHash: 'contract',
      failAfterStep: 'add-booking-index'
    }
  }), (error) => error.code === 'MIGRATION_INJECTED_FAILURE');
  assert.strictEqual(readSchemaIdentity(failed).hash, beforeFailure, 'Migrationsfehler muss Ledger und Schritt zurueckrollen');
  failed.close();

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  const result = applyProductionMigration({
    db, artifact,
    migrationPermit: { preMigrationBackupVerified: true, contractHash: 'contract', expectedContractHash: 'contract' }
  });
  assert.strictEqual(result.applied, true);
  assert.deepStrictEqual(result.invariants.counts, baseline.invariants.counts);
  const again = applyProductionMigration({
    db, artifact,
    migrationPermit: { preMigrationBackupVerified: true, contractHash: 'contract', expectedContractHash: 'contract' }
  });
  assert.strictEqual(again.idempotent, true);
  assert.strictEqual(readSchemaIdentity(db).hash, targetIdentity.hash);

  const store = createFakeReplicaStore(path.join(tempRoot, 'fake-replica'));
  const backup = await createEncryptedProductionBackup({
    db, Database, fs, path, tempRoot, replicaStore: store, schemaHash: targetIdentity.hash,
    contractHash: '4'.repeat(64), commit: COMMIT, appVersion: packageInfo.version, phase: 'periodic'
  });
  assert.strictEqual(backup.remoteReadback, true);
  const restoreRoot = path.join(tempRoot, 'explicit-restore');
  const restore = await restoreEncryptedProductionBackup({
    Database, fs, path, replicaStore: createFakeVerifierStore(store), snapshotId: backup.snapshotId, restoreRoot,
    expectedManifestSha256: backup.manifestSha256, expectedSourceSha256: backup.sourceSha256,
    expectedSchemaHash: backup.schemaHash
  });
  assert.strictEqual(restore.isolated, true);
  db.close();
}

async function testSchedulerAndFreshness() {
  let nowMs = Date.parse('2026-08-25T10:00:00.000Z');
  const initial = {
    ok: true, encrypted: true, remoteReadback: true,
    verifiedAtUtc: new Date(nowMs).toISOString()
  };
  const gate = createBackupFreshnessGate({ maximumAgeMs: 300000, now: () => nowMs, initialBackup: initial });
  gate.assertFreshForWrite();
  nowMs += 299999;
  assert.strictEqual(gate.status().fresh, true);
  gate.assertFreshForWrite();
  nowMs += 1;
  assert.strictEqual(gate.status().fresh, false);
  assert.throws(() => gate.assertFreshForWrite(), (error) => error.code === 'PRODUCTION_BACKUP_STALE_WRITE_BLOCKED');
  nowMs += 1;
  assert.strictEqual(gate.status().fresh, false);
  assert.throws(() => gate.assertFreshForWrite(), (error) => error.code === 'PRODUCTION_BACKUP_STALE_WRITE_BLOCKED');

  for (const invalidNow of [NaN, -1, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
    const invalidGate = createBackupFreshnessGate({ maximumAgeMs: 300000, now: () => invalidNow });
    assert.deepStrictEqual(
      { fresh: invalidGate.status().fresh, clockValid: invalidGate.status().clockValid },
      { fresh: false, clockValid: false }
    );
    assert.throws(() => invalidGate.assertFreshForWrite(),
      (error) => error.code === 'PRODUCTION_BACKUP_STALE_WRITE_BLOCKED');
    assert.strictEqual(invalidGate.recordFailure().lastFailureCode, 'BACKUP_CLOCK_INVALID');
    assert.throws(() => invalidGate.recordVerified(initial),
      (error) => error.code === 'BACKUP_CLOCK_INVALID');
  }
  assert.throws(() => createBackupFreshnessGate({ maximumAgeMs: Number.MAX_SAFE_INTEGER }), TypeError);
  const throwingClock = createBackupFreshnessGate({
    maximumAgeMs: 300000,
    now: () => { throw new Error('clock'); }
  });
  assert.strictEqual(throwingClock.status().fresh, false);

  let skewNow = Date.parse('2026-08-25T11:00:00.000Z');
  const future = { ...initial, verifiedAtUtc: new Date(skewNow + 1).toISOString() };
  assert.throws(
    () => createBackupFreshnessGate({ maximumAgeMs: 300000, now: () => skewNow, initialBackup: future }),
    (error) => error.code === 'BACKUP_RESULT_FUTURE'
  );
  const backwardsGate = createBackupFreshnessGate({
    maximumAgeMs: 300000,
    now: () => skewNow,
    initialBackup: { ...initial, verifiedAtUtc: new Date(skewNow).toISOString() }
  });
  skewNow -= 1;
  assert.deepStrictEqual(
    { ageMs: backwardsGate.status().ageMs, fresh: backwardsGate.status().fresh },
    { ageMs: -1, fresh: false }
  );

  let release;
  let calls = 0;
  const pending = () => new Promise((resolve) => { release = resolve; });
  const scheduler = createPeriodicBackupScheduler({
    backup: async () => {
      calls += 1;
      await pending();
      return { ...initial, verifiedAtUtc: new Date(nowMs).toISOString() };
    },
    freshnessGate: gate,
    intervalMs: 1000,
    timeoutMs: 100
  });
  const first = scheduler.runNow();
  await new Promise((resolve) => setImmediate(resolve));
  const overlap = await scheduler.runNow();
  assert.strictEqual(overlap.reason, 'BACKUP_OVERLAP');
  assert.strictEqual(calls, 1);
  release();
  assert.strictEqual((await first).ok, true);
  gate.assertFreshForWrite();

  let lateRelease;
  const timeoutGate = createBackupFreshnessGate({ maximumAgeMs: 300000, now: () => nowMs, initialBackup: initial });
  const timeoutScheduler = createPeriodicBackupScheduler({
    backup: () => new Promise((resolve) => { lateRelease = resolve; }),
    freshnessGate: timeoutGate,
    intervalMs: 100,
    timeoutMs: 10
  });
  const timedOut = await timeoutScheduler.runNow();
  assert.strictEqual(timedOut.timedOut, true);
  assert.strictEqual(timeoutScheduler.status().inFlight, true, 'Timeout darf den spaeten Job nicht freigeben');
  assert.strictEqual((await timeoutScheduler.runNow()).reason, 'BACKUP_OVERLAP');
  lateRelease({ ...initial, verifiedAtUtc: new Date(nowMs).toISOString() });
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(timeoutScheduler.status().inFlight, false);
  assert.strictEqual(timeoutGate.status().fresh, true);
}

async function testStartupAndPredeploy(tempRoot) {
  const firstPath = path.join(tempRoot, 'startup.sqlite');
  const contractData = await createMigrationContract(tempRoot, firstPath);
  const env = productionEnv(firstPath, contractData.baseline.identity.hash);
  const store = createFakeReplicaStore(path.join(tempRoot, 'startup-replica'));

  clearProductionStartupPermitForTests();
  const permit = await prepareProductionStartup({
    env, rootDir: contractData.artifactRoot, tempRoot,
    replicaStoreFactory: () => store
  });
  assert.strictEqual(permit.runtimePermit, true);
  assert.deepStrictEqual(store.events.filter((event) => event.startsWith('snapshot:')),
    ['snapshot:pre-migration', 'snapshot:post-migration']);
  assert.strictEqual(permit.preMigrationBackup.phase, 'pre-migration');
  assert.strictEqual(permit.postMigrationBackup.phase, 'post-migration');

  clearProductionStartupPermitForTests();
  const restart = await prepareProductionStartup({
    env, rootDir: contractData.artifactRoot, tempRoot,
    replicaStoreFactory: () => store
  });
  assert.strictEqual(restart.migration.idempotent, true, 'Restart muss Migrationsledger als No-op erkennen');

  const failedPath = path.join(tempRoot, 'startup-failure.sqlite');
  const failedContract = await createMigrationContract(path.join(tempRoot, 'failed-contract'), failedPath);
  const failedEnv = productionEnv(failedPath, failedContract.baseline.identity.hash);
  clearProductionStartupPermitForTests();
  await assert.rejects(() => prepareProductionStartup({
    env: failedEnv, rootDir: failedContract.artifactRoot, tempRoot,
    replicaStoreFactory: () => createFakeReplicaStore(path.join(tempRoot, 'failed-replica'), { failPhase: 'pre-migration' })
  }));
  const unchanged = new Database(failedPath, { readonly: true, fileMustExist: true });
  unchanged.pragma('foreign_keys = ON');
  assert.strictEqual(readSchemaIdentity(unchanged).hash, failedContract.baseline.identity.hash,
    'Fehlendes Vorbackup darf keinen DB-Write zulassen');
  unchanged.close();

  const predeployStore = createFakeReplicaStore(path.join(tempRoot, 'predeploy-replica'));
  const predeploy = await runProductionPredeployGate({
    env, rootDir: contractData.artifactRoot, tempRoot,
    replicaStoreFactory: () => predeployStore
  });
  assert.strictEqual(predeploy.backup.phase, 'pre-deploy');
  assert.strictEqual(predeploy.backup.remoteReadback, true);
}

async function testKopiaBoundary(tempRoot) {
  fs.mkdirSync(tempRoot, { recursive: true });
  const executable = path.join(tempRoot, 'kopia-fake');
  fs.writeFileSync(executable, fakeLinuxX64Elf('synthetic executable'));
  const binaryHash = crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex');
  const source = path.join(tempRoot, 'kopia-source');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'manifest.json'), '{}');
  const calls = [];
  const snapshotSources = new Map();
  const appCredential = 'app-repository-password-test14';
  const verifierCredential = 'verifier-repository-password-test14';
  const serverUrl = 'https://kopia-repository.example.invalid';
  const certificate = '8'.repeat(64);
  const commandRunner = createPreparedCommandRunner(async (_executable, args, options) => {
    calls.push({ args, options });
    const commandIndex = args.indexOf('snapshot');
    if (args.includes('repository') && args.includes('connect')) {
      return { exitCode: 0, stdout: '{}', stderr: '' };
    }
    const operation = args[commandIndex + 1];
    if (operation === 'create') {
      snapshotSources.set('snapshot-kopia-test14', args[commandIndex + 2]);
      return { exitCode: 0, stdout: JSON.stringify({ id: 'snapshot-kopia-test14' }), stderr: '' };
    }
    if (operation === 'restore') {
      const snapshotId = args[commandIndex + 2];
      const target = args[commandIndex + 3];
      fs.cpSync(snapshotSources.get(snapshotId), target, { recursive: true });
    }
    return { exitCode: 0, stdout: '{}', stderr: '' };
  });
  const baseOptions = {
    executablePath: executable,
    runtimePin: KOPIA_PIN,
    serverUrl,
    serverCertificateSha256: certificate,
    expectedBinarySha256: binaryHash,
    systemEnvironment: { PATH: 'synthetic-path', UNRELATED_SECRET: 'must-not-be-inherited' },
    commandTimeoutMs: 5000,
    freshCacheFactory: async () => ({ path: path.join(tempRoot, `cache-${calls.length}`), dispose: async () => {} }),
    commandRunner,
    fsImpl: createLinuxFdTestFs(),
    platform: 'linux',
    processUid: 1000
  };
  const store = createKopiaReplicaStore({
    ...baseOptions,
    configPath: path.join(tempRoot, 'kopia-app.config'),
    repositoryUsername: 'waschzeit-app',
    repositoryHostname: 'waschzeit-production',
    credential: appCredential
  });
  assert.strictEqual(store.clientSideEncryption, true);
  assert.strictEqual(store.repositoryTransport, 'server');
  assert.strictEqual(store.accessRole, 'APPEND_READ');
  assert.strictEqual(store.deleteCapability, false);
  assert.strictEqual(store.maintenanceCapability, false);
  assert.strictEqual(store.restoreSnapshot, undefined);
  assert.deepStrictEqual(store.retention, { days: 30, enforcedByExternalPolicy: true, deletionCapabilityUsedByApp: false });
  const created = await store.snapshotDirectory(source, { tags: { phase: 'periodic' } });
  await store.verifySnapshot(created.snapshotId);
  await store.readbackSnapshot(created.snapshotId, path.join(tempRoot, 'app-readback'));
  const verifier = createKopiaVerifierStore({
    ...baseOptions,
    configPath: path.join(tempRoot, 'kopia-verifier.config'),
    repositoryUsername: 'waschzeit-verifier',
    repositoryHostname: 'isolated-restore-drill',
    credential: verifierCredential
  });
  assert.strictEqual(verifier.accessRole, 'READ_ONLY');
  assert.strictEqual(verifier.snapshotDirectory, undefined);
  await verifier.verifySnapshot(created.snapshotId);
  await verifier.restoreSnapshot(created.snapshotId, path.join(tempRoot, 'verifier-restore'));

  const connectCalls = calls.filter(({ args }) => args.includes('repository') && args.includes('connect'));
  assert.strictEqual(connectCalls.length, 2, 'App und Verifier muessen getrennte Serververbindungen besitzen');
  assert(connectCalls.every(({ args }) => args.includes(serverUrl) && args.includes(certificate)
    && args.includes('--no-enable-actions')));
  assert.strictEqual(connectCalls.filter(({ args }) => args.includes('--readonly')).length, 1);
  assert(calls.some(({ args }) => args.includes('--no-send-snapshot-report')));
  const allowedChildKeys = new Set(['PATH', 'KOPIA_PASSWORD', 'KOPIA_CHECK_FOR_UPDATES', 'KOPIA_CACHE_DIRECTORY']);
  for (const { args, options } of calls) {
    assert(Object.keys(options.env).every((name) => allowedChildKeys.has(name)), 'Kindprozess-Env muss minimal bleiben');
    assert(!Object.keys(options.env).some((name) => /^(?:R2_|AWS_|S3_|CF_R2_|CLOUDFLARE_)/.test(name)));
    assert(!args.includes(appCredential) && !args.includes(verifierCredential));
    assert(!options.env.UNRELATED_SECRET);
  }
  await assert.rejects(() => store.snapshotDirectory(Buffer.from('plaintext')), (error) => error.code === 'KOPIA_PLAINTEXT_BOUNDARY');

  for (const invalid of [
    { serverUrl: 'http://kopia.example.invalid', expected: 'KOPIA_SERVER_URL' },
    { serverCertificateSha256: 'short', expected: 'KOPIA_SERVER_CERTIFICATE' },
    { systemEnvironment: { AWS_ACCESS_KEY_ID: 'forbidden' }, expected: 'KOPIA_DIRECT_PROVIDER_BINDING' },
    { systemEnvironment: { S3_BUCKET: 'forbidden' }, expected: 'KOPIA_DIRECT_PROVIDER_BINDING' },
    { systemEnvironment: { KOPIA_REPOSITORY_OWNER_TOKEN: 'forbidden' }, expected: 'KOPIA_DIRECT_PROVIDER_BINDING' }
  ]) {
    assert.throws(() => createKopiaReplicaStore({
      ...baseOptions,
      ...invalid,
      configPath: path.join(tempRoot, `invalid-${invalid.expected}.config`),
      repositoryUsername: 'waschzeit-app', repositoryHostname: 'waschzeit-production',
      credential: appCredential
    }), (error) => error.code === invalid.expected);
  }

  const leakedCredential = 'credential-that-must-not-leak-test14';
  const sanitized = createKopiaReplicaStore({
    ...baseOptions,
    configPath: path.join(tempRoot, 'sanitized.config'),
    repositoryUsername: 'waschzeit-app', repositoryHostname: 'waschzeit-production',
    credential: leakedCredential,
    commandRunner: createPreparedCommandRunner(async () => { throw new Error(`raw ${leakedCredential}`); })
  });
  await assert.rejects(() => sanitized.snapshotDirectory(source), (error) => {
    assert.strictEqual(error.code, 'KOPIA_COMMAND_FAILED');
    assert(!error.message.includes(leakedCredential));
    return true;
  });

  const replaceableExecutable = path.join(tempRoot, 'kopia-replaced-after-construction');
  fs.writeFileSync(replaceableExecutable, fakeLinuxX64Elf('first pinned executable identity'));
  const replaceableHash = crypto.createHash('sha256').update(fs.readFileSync(replaceableExecutable)).digest('hex');
  let replacementCommandCalls = 0;
  let replacementCacheWrites = 0;
  const replacementStore = createKopiaReplicaStore({
    ...baseOptions,
    executablePath: replaceableExecutable,
    expectedBinarySha256: replaceableHash,
    configPath: path.join(tempRoot, 'replacement.config'),
    repositoryUsername: 'waschzeit-app', repositoryHostname: 'waschzeit-production',
    credential: appCredential,
    freshCacheFactory: async () => {
      replacementCacheWrites += 1;
      return { path: path.join(tempRoot, 'replacement-cache'), dispose: async () => {} };
    },
    commandRunner: createPreparedCommandRunner(async () => {
      replacementCommandCalls += 1;
      return { exitCode: 0, stdout: '{}', stderr: '' };
    })
  });
  fs.writeFileSync(replaceableExecutable, fakeLinuxX64Elf('replaced executable identity'));
  await assert.rejects(() => replacementStore.snapshotDirectory(source),
    (error) => error.code === 'KOPIA_BINARY_HASH' || error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.strictEqual(replacementCommandCalls, 0, 'Ersetztes Binary darf keinen Subprozess starten');
  assert.strictEqual(replacementCacheWrites, 0, 'Ersetztes Binary darf keinen Cache erzeugen');

  const cacheExecutable = path.join(tempRoot, 'kopia-cache-preparation-replacement');
  const cacheBinary = fakeLinuxX64Elf('pinned binary before cache preparation');
  fs.writeFileSync(cacheExecutable, cacheBinary);
  const cacheHash = crypto.createHash('sha256').update(cacheBinary).digest('hex');
  let replaceDuringCache = false;
  let cacheReplacementPerformed = false;
  let cacheReplacementExecuted = false;
  let cacheSubprocessCalls = 0;
  const cacheReplacementStore = createKopiaReplicaStore({
    ...baseOptions,
    executablePath: cacheExecutable,
    expectedBinarySha256: cacheHash,
    configPath: path.join(tempRoot, 'cache-replacement.config'),
    repositoryUsername: 'waschzeit-app', repositoryHostname: 'waschzeit-production',
    credential: appCredential,
    freshCacheFactory: async () => {
      if (replaceDuringCache) {
        cacheReplacementPerformed = true;
        fs.writeFileSync(cacheExecutable, fakeLinuxX64Elf('replacement injected by cache preparation'));
      }
      return { path: path.join(tempRoot, 'cache-preparation-cache'), dispose: async () => {} };
    },
    commandRunner: createPreparedCommandRunner(async (_executable, args) => {
      cacheSubprocessCalls += 1;
      if (replaceDuringCache) cacheReplacementExecuted = true;
      if (args.includes('repository')) return { exitCode: 0, stdout: '{}', stderr: '' };
      return { exitCode: 0, stdout: JSON.stringify({ id: 'snapshot-cache-preparation' }), stderr: '' };
    })
  });
  await cacheReplacementStore.snapshotDirectory(source);
  const cacheCallsBeforeReplacement = cacheSubprocessCalls;
  replaceDuringCache = true;
  await assert.rejects(() => cacheReplacementStore.verifySnapshot('snapshot-cache-preparation'),
    (error) => error.code === 'KOPIA_BINARY_HASH' || error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.strictEqual(cacheReplacementPerformed, true, 'Der instrumentierte Cache-Ersatz muss ausgefuehrt werden');
  assert.strictEqual(cacheReplacementExecuted, false, 'Das durch Cachevorbereitung ersetzte Binary darf nie laufen');
  assert.strictEqual(cacheSubprocessCalls, cacheCallsBeforeReplacement,
    'Nach Cachevorbereitung muss die finale Pruefung vor dem Subprozess stoppen');

  const preparationExecutable = path.join(tempRoot, 'kopia-command-preparation-replacement');
  const preparationBinary = fakeLinuxX64Elf('pinned binary before command preparation');
  fs.writeFileSync(preparationExecutable, preparationBinary);
  const preparationHash = crypto.createHash('sha256').update(preparationBinary).digest('hex');
  let replaceDuringPreparation = false;
  let preparationReplacementExecuted = false;
  let preparationSubprocessCalls = 0;
  const preparationStore = createKopiaReplicaStore({
    ...baseOptions,
    executablePath: preparationExecutable,
    expectedBinarySha256: preparationHash,
    configPath: path.join(tempRoot, 'command-preparation.config'),
    repositoryUsername: 'waschzeit-app', repositoryHostname: 'waschzeit-production',
    credential: appCredential,
    commandRunner: createPreparedCommandRunner(async (_executable, args) => {
      preparationSubprocessCalls += 1;
      if (replaceDuringPreparation) preparationReplacementExecuted = true;
      if (args.includes('repository')) return { exitCode: 0, stdout: '{}', stderr: '' };
      return { exitCode: 0, stdout: JSON.stringify({ id: 'snapshot-command-preparation' }), stderr: '' };
    }, {
      prepare() {
        if (replaceDuringPreparation) {
          fs.writeFileSync(preparationExecutable, fakeLinuxX64Elf('replacement injected by command preparation'));
        }
      }
    })
  });
  await preparationStore.snapshotDirectory(source);
  const preparationCallsBeforeReplacement = preparationSubprocessCalls;
  replaceDuringPreparation = true;
  await assert.rejects(() => preparationStore.verifySnapshot('snapshot-command-preparation'),
    (error) => error.code === 'KOPIA_BINARY_HASH' || error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.strictEqual(preparationReplacementExecuted, false,
    'Das durch Config-/Argumentvorbereitung ersetzte Binary darf nie laufen');
  assert.strictEqual(preparationSubprocessCalls, preparationCallsBeforeReplacement,
    'Nach Config-/Argumentvorbereitung muss die finale Pruefung vor dem Subprozess stoppen');

  const betweenCommandsExecutable = path.join(tempRoot, 'kopia-between-commands-replacement');
  const betweenCommandsBinary = fakeLinuxX64Elf('pinned binary before first command');
  fs.writeFileSync(betweenCommandsExecutable, betweenCommandsBinary);
  const betweenCommandsHash = crypto.createHash('sha256').update(betweenCommandsBinary).digest('hex');
  let betweenCommandsCalls = 0;
  const betweenCommandsStore = createKopiaReplicaStore({
    ...baseOptions,
    executablePath: betweenCommandsExecutable,
    expectedBinarySha256: betweenCommandsHash,
    configPath: path.join(tempRoot, 'between-commands.config'),
    repositoryUsername: 'waschzeit-app', repositoryHostname: 'waschzeit-production',
    credential: appCredential,
    commandRunner: createPreparedCommandRunner(async () => {
      betweenCommandsCalls += 1;
      if (betweenCommandsCalls === 1) {
        fs.writeFileSync(betweenCommandsExecutable, fakeLinuxX64Elf('replacement after first completed command'));
      }
      return { exitCode: 0, stdout: '{}', stderr: '' };
    })
  });
  await assert.rejects(() => betweenCommandsStore.snapshotDirectory(source),
    (error) => error.code === 'KOPIA_BINARY_HASH' || error.code === 'KOPIA_BINARY_PATH_DRIFT');
  assert.strictEqual(betweenCommandsCalls, 1,
    'Ein Ersatz zwischen Commands muss vor dem zweiten Subprozess erkannt werden');
}

async function testProviderAndRollback() {
  let attempts = 0;
  const counter = { increment() { attempts += 1; }, count() { return attempts; } };
  const hold = createProviderHold({
    enabled: true,
    runtimeFlags: { email: { enabled: false }, push: { enabled: false } },
    externalAttemptCounter: counter,
    env: { AUTO_BACKUP: 'false' }
  });
  await assert.rejects(() => hold.wrap('email', async () => 'sent')(), (error) => error.code === 'PROVIDER_HOLD_ACTIVE');
  assert.strictEqual(attempts, 0);
  hold.assertZeroExternalAttempts();

  const rollback = createRollbackContract({
    currentCommit: COMMIT, codeRollbackCommit: ROLLBACK_COMMIT,
    preMigrationSnapshotId: 'snapshot-rollback-test14',
    preMigrationManifestSha256: '4'.repeat(64), preMigrationSchemaHash: '5'.repeat(64),
    currentSchemaHash: '6'.repeat(64), codeCompatibleSchemaHashes: ['6'.repeat(64)]
  });
  assert.strictEqual(planCodeRollback(rollback, '6'.repeat(64)).kind, 'code-only');
  assert.throws(() => authorizeDataRestore(rollback, {}), (error) => error.code === 'DATA_RESTORE_NOT_AUTHORIZED');
}

function testStaticScope() {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert(server.includes('productionBackupRuntime.freshnessGate.assertFreshForWrite()'));
  assert.match(server,
    /freshnessGate\.assertFreshForWrite\(\)[\s\S]*catch \(error\)[\s\S]*res\.status\(503\)[\s\S]*code: 'PRODUCTION_BACKUP_STALE_WRITE_BLOCKED'/,
    'Die exakte Frischegrenze muss fachliche Writes als 503 fail-closed abweisen');
  assert(server.includes("code: 'PRODUCTION_BACKUP_STALE_WRITE_BLOCKED'"));
  assert(!server.includes('createDurabilityCoordinator'));
  assert(!server.includes('Idempotency-Key'));
  assert(!app.includes('DURABILITY_PENDING'));
  assert(!app.includes('DURABILITY_BACKPRESSURE'));
  assert(!fs.existsSync(path.join(__dirname, '..', 'src', 'services', 'durability-barrier.js')));
  assert(!fs.existsSync(path.join(__dirname, 'client-idempotency-test.js')));
  const blueprint = fs.readFileSync(path.join(__dirname, '..', 'render.yaml'), 'utf8');
  assert(!/\b(?:R2|AWS)_[A-Z0-9_]+/.test(blueprint), 'App-Blueprint darf keine direkten Providerkeys provisionieren');
  assert(blueprint.includes('KOPIA_REPOSITORY_APP_ACL_ROLE'));
  assert(blueprint.includes('value: APPEND_READ'));
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-production-test14-'));
  try {
    const migrationRoot = path.join(tempRoot, 'migration');
    fs.mkdirSync(migrationRoot, { recursive: true });
    const dbPath = path.join(migrationRoot, 'baseline.sqlite');
    const contractData = await createMigrationContract(migrationRoot, dbPath);
    await testGuardBeforeEffects(tempRoot, dbPath, contractData.baseline.identity.hash);
    testKopiaPreflightBeforeWrites(tempRoot, dbPath, contractData.baseline.identity.hash);
    await testFdBoundKopiaExecution(path.join(tempRoot, 'fd-bound'));
    await testMigrationAndBackup(migrationRoot, dbPath, contractData);
    await testSchedulerAndFreshness();
    await testStartupAndPredeploy(path.join(tempRoot, 'startup'));
    await testKopiaBoundary(path.join(tempRoot, 'kopia'));
    await testProviderAndRollback();
    testStaticScope();
    console.log('Production backup, migration, restore and freshness tests passed.');
  } finally {
    clearProductionStartupPermitForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
