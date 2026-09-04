'use strict';

const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const {
  BACKUP_CONTRACT_VERSION,
  PRODUCTION_DOMAIN,
  PRODUCTION_RENDER_SERVICE_ID,
  SIGNED_PROOF_CONTRACT_VERSION,
  ProductionBackupError,
  assertEquivalentArtifacts,
  createProductionBackup,
  expectedTargetPath,
  signBackupProof,
  verifyDatabaseArtifact,
  verifySignedBackupProof
} = require('./production-backup-contract');
const { parseArguments, readLiveVersion } = require('./bootstrap-production-backup');
const {
  MAX_BACKUP_AGE_MS,
  consumeProofOnce,
  proofConsumptionRef,
  runDeployment,
  sendSingleDeployRequest,
  validateProof,
  validateRenderHookUrl
} = require('./trigger-production-deploy');

const projectRoot = path.resolve(__dirname, '..');
const LIVE_COMMIT = '1'.repeat(40);
const CANDIDATE_COMMIT = '2'.repeat(40);
const PII_CANARY = 'PRIVATE-NAME-MUST-NEVER-PRINT';
const PROOF_KEY = Buffer.alloc(32, 7).toString('base64');

function trackFilesystemMutations() {
  let mutations = 0;
  const mark = (operation) => (...args) => {
    mutations += 1;
    return operation(...args);
  };
  return {
    fsImpl: {
      ...fs,
      openSync(filePath, flags, ...args) {
        if (/[wax+]/.test(String(flags))) mutations += 1;
        return fs.openSync(filePath, flags, ...args);
      },
      copyFileSync: mark(fs.copyFileSync.bind(fs)),
      linkSync: mark(fs.linkSync.bind(fs)),
      renameSync: mark(fs.renameSync.bind(fs)),
      rmSync: mark(fs.rmSync.bind(fs)),
      writeFileSync: mark(fs.writeFileSync.bind(fs))
    },
    count: () => mutations
  };
}

function createContractDatabase(databasePath, options = {}) {
  const db = new Database(databasePath);
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE houses (id INTEGER PRIMARY KEY, name TEXT, code TEXT, active INTEGER);
    CREATE TABLE users (
      id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT,
      house_id INTEGER REFERENCES houses(id), is_superadmin INTEGER, active INTEGER
    );
    CREATE TABLE apartments (
      id INTEGER PRIMARY KEY, house_id INTEGER REFERENCES houses(id), label TEXT,
      claimed_by INTEGER REFERENCES users(id), active INTEGER
    );
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY, name TEXT, type TEXT, house_id INTEGER REFERENCES houses(id), active INTEGER
    );
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
      resource_id INTEGER REFERENCES resources(id), booking_date TEXT, slot TEXT
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
  `);
  db.prepare('INSERT INTO houses (id, name, code, active) VALUES (1, ?, ?, 1)').run(PII_CANARY, 'secret-code');
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, house_id, is_superadmin, active)
    VALUES (1, ?, 'hash', 'user', 1, 0, 1)
  `).run(PII_CANARY);
  db.prepare('INSERT INTO apartments (id, house_id, label, claimed_by, active) VALUES (1, 1, ?, 1, 1)').run(PII_CANARY);
  db.prepare('INSERT INTO resources (id, name, type, house_id, active) VALUES (1, ?, \'washer\', 1, 1)').run(PII_CANARY);
  if (options.foreignKeyViolation) {
    db.prepare("INSERT INTO bookings (id, user_id, resource_id, booking_date, slot) VALUES (1, 999, 1, '2026-09-04', '08:00-10:00')").run();
  }
  db.close();
}

function backupInput(root, overrides = {}) {
  const backupDir = path.join(root, 'backups');
  return {
    input: {
      service: 'washraum-app',
      serviceId: PRODUCTION_RENDER_SERVICE_ID,
      domain: PRODUCTION_DOMAIN,
      expectedLiveCommit: LIVE_COMMIT,
      actualLiveCommit: LIVE_COMMIT,
      candidateCommit: CANDIDATE_COMMIT,
      expectedLiveVersion: '0.3.4',
      actualLiveVersion: '0.3.4',
      candidateVersion: '0.3.10',
      databasePath: path.join(root, 'washraum.sqlite'),
      targetPath: expectedTargetPath(CANDIDATE_COMMIT, backupDir, path)
    },
    options: {
      databasePath: path.join(root, 'washraum.sqlite'),
      backupDir,
      pathImpl: path,
      allowNonLinuxTestBinding: true
    },
    backupDir,
    ...overrides
  };
}

async function expectBackupError(code, operation) {
  await assert.rejects(operation, (error) => error instanceof ProductionBackupError && error.code === code);
}

function validProof(now = Date.now()) {
  const hashA = 'a'.repeat(64);
  const hashB = 'b'.repeat(64);
  const hashC = 'c'.repeat(64);
  return {
    ok: true,
    contract: BACKUP_CONTRACT_VERSION,
    signedProofContract: SIGNED_PROOF_CONTRACT_VERSION,
    service: 'washraum-app',
    serviceId: PRODUCTION_RENDER_SERVICE_ID,
    domain: PRODUCTION_DOMAIN,
    sourceCommit: LIVE_COMMIT,
    candidateCommit: CANDIDATE_COMMIT,
    sourceVersion: '0.3.4',
    candidateVersion: '0.3.10',
    databasePath: '/var/data/washraum.sqlite',
    backupPath: `/var/data/backups/washraum-predeploy-${CANDIDATE_COMMIT}.sqlite`,
    bootstrapObserved: true,
    backupArtifactObserved: true,
    executionNonce: 'e'.repeat(64),
    createdAt: new Date(now - 1_000).toISOString(),
    sha256: hashA,
    schemaContract: 'waschzeit-production-schema-v1',
    schemaSha256: hashB,
    tableCountsSha256: hashC,
    integrityCheck: 'ok',
    foreignKeyViolations: 0,
    personalDataPrinted: false,
    sourceOpenedReadOnly: true,
    targetCreatedExactlyOnce: true,
    restoreDrill: {
      ok: true,
      sha256: hashA,
      schemaSha256: hashB,
      tableCountsSha256: hashC
    }
  };
}

function atomicTestConsumer() {
  const consumed = new Set();
  let attempts = 0;
  return {
    consume: async (proof) => {
      attempts += 1;
      const key = proofConsumptionRef(proof);
      if (consumed.has(key)) throw new ProductionBackupError('PROOF_REPLAY');
      consumed.add(key);
      await Promise.resolve();
      return { consumed: true };
    },
    attempts: () => attempts
  };
}

function deploymentInput(proofToken) {
  return {
    candidateCommit: CANDIDATE_COMMIT,
    parallelActions: 'none',
    autoDeploy: 'off',
    proofToken,
    proofKey: PROOF_KEY,
    hookUrl: 'https://api.render.com/deploy/srv-d8k09i48aovs73di2ejg?key=masked'
  };
}

async function withServer(handler, operation) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    return await operation(`http://127.0.0.1:${server.address().port}/deploy`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function verifyBackupBootstrap() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-production-bootstrap-'));
  try {
    const contract = backupInput(root);
    fs.mkdirSync(contract.backupDir);
    createContractDatabase(contract.input.databasePath);
    const sourceBefore = fs.readFileSync(contract.input.databasePath);
    const proof = await createProductionBackup(contract.input, contract.options);
    const sourceAfter = fs.readFileSync(contract.input.databasePath);
    assert.deepEqual(sourceAfter, sourceBefore);
    assert.equal(proof.ok, true);
    assert.equal(proof.contract, BACKUP_CONTRACT_VERSION);
    assert.equal(proof.sourceCommit, LIVE_COMMIT);
    assert.equal(proof.candidateCommit, CANDIDATE_COMMIT);
    assert.equal(proof.sourceVersion, '0.3.4');
    assert.equal(proof.candidateVersion, '0.3.10');
    assert.equal(proof.sourceOpenedReadOnly, true);
    assert.equal(proof.targetCreatedExactlyOnce, true);
    assert.equal(proof.restoreDrill.ok, true);
    assert.equal(proof.restoreDrill.sha256, proof.sha256);
    assert.equal(proof.restoreDrill.schemaSha256, proof.schemaSha256);
    assert.equal(proof.restoreDrill.tableCountsSha256, proof.tableCountsSha256);
    assert.equal(proof.tableCounts.users, 1);
    assert.doesNotMatch(JSON.stringify(proof), new RegExp(PII_CANARY));
    assert.equal(fs.existsSync(`${contract.input.targetPath}.partial`), false);
    assert.equal(fs.existsSync(`${contract.input.targetPath}.restore-probe`), false);
    assert.equal(fs.existsSync(path.join(contract.backupDir, '.washraum-predeploy-backup.lock')), false);

    await expectBackupError('TARGET_EXISTS', () => createProductionBackup(contract.input, contract.options));

    const badService = backupInput(path.join(root, 'bad-service'));
    await expectBackupError('TARGET_SERVICE', () => createProductionBackup({ ...badService.input, service: 'other' }, badService.options));
    assert.equal(fs.existsSync(badService.options.databasePath), false);

    const badCommit = backupInput(path.join(root, 'bad-commit'));
    await expectBackupError('LIVE_COMMIT', () => createProductionBackup({ ...badCommit.input, actualLiveCommit: '3'.repeat(40) }, badCommit.options));
    assert.equal(fs.existsSync(badCommit.options.databasePath), false);

    const badPath = backupInput(path.join(root, 'bad-path'));
    await expectBackupError('DATABASE_PATH', () => createProductionBackup({ ...badPath.input, databasePath: path.join(root, 'wrong.sqlite') }, badPath.options));

    const existingRoot = path.join(root, 'existing');
    fs.mkdirSync(existingRoot);
    const existing = backupInput(existingRoot);
    fs.mkdirSync(existing.backupDir);
    createContractDatabase(existing.input.databasePath);
    fs.writeFileSync(existing.input.targetPath, 'occupied');
    await expectBackupError('TARGET_EXISTS', () => createProductionBackup(existing.input, existing.options));
    assert.equal(fs.readFileSync(existing.input.targetPath, 'utf8'), 'occupied');

    const collisionRoot = path.join(root, 'publish-collision');
    fs.mkdirSync(collisionRoot);
    const collision = backupInput(collisionRoot);
    fs.mkdirSync(collision.backupDir);
    createContractDatabase(collision.input.databasePath);
    const fsWithPublishCollision = {
      ...fs,
      linkSync(_partialPath, targetPath) {
        fs.writeFileSync(targetPath, 'late-owner');
        const error = new Error('synthetic collision');
        error.code = 'EEXIST';
        throw error;
      }
    };
    await expectBackupError('TARGET_COLLISION', () => createProductionBackup(collision.input, {
      ...collision.options,
      fsImpl: fsWithPublishCollision
    }));
    assert.equal(fs.readFileSync(collision.input.targetPath, 'utf8'), 'late-owner');
    assert.equal(fs.existsSync(`${collision.input.targetPath}.partial`), false);

    const parallelRoot = path.join(root, 'parallel');
    fs.mkdirSync(parallelRoot);
    const parallel = backupInput(parallelRoot);
    fs.mkdirSync(parallel.backupDir);
    createContractDatabase(parallel.input.databasePath);
    fs.writeFileSync(path.join(parallel.backupDir, '.washraum-predeploy-backup.lock'), 'held');
    await expectBackupError('PARALLEL_OPERATION', () => createProductionBackup(parallel.input, parallel.options));
    assert.equal(fs.existsSync(parallel.input.targetPath), false);

    const symlinkRoot = path.join(root, 'symlink');
    fs.mkdirSync(symlinkRoot);
    const symlink = backupInput(symlinkRoot);
    fs.mkdirSync(symlink.backupDir);
    createContractDatabase(symlink.input.databasePath);
    const fsWithSyntheticLink = {
      ...fs,
      lstatSync(filePath) {
        const stat = fs.lstatSync(filePath);
        if (filePath !== symlink.input.databasePath) return stat;
        return { ...stat, isSymbolicLink: () => true, isFile: () => true };
      }
    };
    await expectBackupError('SOURCE_DATABASE', () => createProductionBackup(symlink.input, { ...symlink.options, fsImpl: fsWithSyntheticLink }));
    assert.equal(fs.existsSync(symlink.input.targetPath), false);

    const linkedDirectoryRoot = path.join(root, 'linked-directory');
    fs.mkdirSync(linkedDirectoryRoot);
    const linkedDirectory = backupInput(linkedDirectoryRoot);
    fs.mkdirSync(linkedDirectory.backupDir);
    createContractDatabase(linkedDirectory.input.databasePath);
    const fsWithSyntheticDirectoryLink = {
      ...fs,
      lstatSync(filePath) {
        const stat = fs.lstatSync(filePath);
        if (filePath !== linkedDirectory.backupDir) return stat;
        return { ...stat, isSymbolicLink: () => true, isDirectory: () => true };
      }
    };
    await expectBackupError('BACKUP_DIRECTORY', () => createProductionBackup(linkedDirectory.input, {
      ...linkedDirectory.options,
      fsImpl: fsWithSyntheticDirectoryLink
    }));
    assert.equal(fs.existsSync(linkedDirectory.input.targetPath), false);

    const foreignRoot = path.join(root, 'foreign-source');
    fs.mkdirSync(foreignRoot);
    const foreign = backupInput(foreignRoot);
    fs.mkdirSync(foreign.backupDir);
    const foreignDb = new Database(foreign.input.databasePath);
    foreignDb.exec('CREATE TABLE foreign_private_table (id INTEGER PRIMARY KEY, secret TEXT)');
    foreignDb.prepare('INSERT INTO foreign_private_table (secret) VALUES (?)').run(PII_CANARY);
    foreignDb.close();
    const foreignWrites = trackFilesystemMutations();
    await expectBackupError('SCHEMA_CONTRACT', () => createProductionBackup(foreign.input, {
      ...foreign.options,
      fsImpl: foreignWrites.fsImpl
    }));
    assert.equal(foreignWrites.count(), 0);
    assert.equal(fs.existsSync(foreign.input.targetPath), false);
    assert.equal(fs.existsSync(`${foreign.input.targetPath}.partial`), false);

    const foreignKeyRoot = path.join(root, 'foreign-key-source');
    fs.mkdirSync(foreignKeyRoot);
    const foreignKey = backupInput(foreignKeyRoot);
    fs.mkdirSync(foreignKey.backupDir);
    createContractDatabase(foreignKey.input.databasePath, { foreignKeyViolation: true });
    await expectBackupError('FOREIGN_KEYS', () => createProductionBackup(foreignKey.input, foreignKey.options));
    assert.equal(fs.existsSync(foreignKey.input.targetPath), false);

    const corruptRoot = path.join(root, 'corrupt-source');
    fs.mkdirSync(corruptRoot);
    const corrupt = backupInput(corruptRoot);
    fs.mkdirSync(corrupt.backupDir);
    fs.writeFileSync(corrupt.input.databasePath, 'not sqlite');
    const corruptWrites = trackFilesystemMutations();
    await expectBackupError('SQLITE_OPEN', () => createProductionBackup(corrupt.input, {
      ...corrupt.options,
      fsImpl: corruptWrites.fsImpl
    }));
    assert.equal(corruptWrites.count(), 0);
    assert.equal(fs.existsSync(corrupt.input.targetPath), false);

    const backupFailureRoot = path.join(root, 'backup-failure');
    fs.mkdirSync(backupFailureRoot);
    const backupFailure = backupInput(backupFailureRoot);
    fs.mkdirSync(backupFailure.backupDir);
    createContractDatabase(backupFailure.input.databasePath);
    function FailingBackupDatabase(filePath, options) {
      const db = new Database(filePath, options);
      if (filePath === backupFailure.input.databasePath) db.backup = async () => { throw new Error('synthetic'); };
      return db;
    }
    await expectBackupError('ONLINE_BACKUP', () => createProductionBackup(backupFailure.input, {
      ...backupFailure.options,
      DatabaseImpl: FailingBackupDatabase
    }));
    assert.equal(fs.existsSync(backupFailure.input.targetPath), false);
    assert.equal(fs.existsSync(`${backupFailure.input.targetPath}.partial`), false);

    const restoreFailureRoot = path.join(root, 'restore-failure');
    fs.mkdirSync(restoreFailureRoot);
    const restoreFailure = backupInput(restoreFailureRoot);
    fs.mkdirSync(restoreFailure.backupDir);
    createContractDatabase(restoreFailure.input.databasePath);
    const fsWithRestoreFailure = { ...fs, copyFileSync() { throw new Error('synthetic'); } };
    await expectBackupError('RESTORE_COPY', () => createProductionBackup(restoreFailure.input, {
      ...restoreFailure.options,
      fsImpl: fsWithRestoreFailure
    }));
    assert.equal(fs.existsSync(restoreFailure.input.targetPath), false);
    assert.equal(fs.existsSync(`${restoreFailure.input.targetPath}.partial`), false);

    assert.throws(() => assertEquivalentArtifacts(
      { sha256: 'a', schemaSha256: 'b', tableCountsSha256: 'c' },
      { sha256: 'a', schemaSha256: 'b', tableCountsSha256: 'different' }
    ), (error) => error.code === 'RESTORE_MISMATCH');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function changedIdentity(stat) {
  return new Proxy(stat, {
    get(target, property) {
      if (property === 'dev') return typeof target.dev === 'bigint' ? target.dev + 1n : Number(target.dev) + 1;
      if (property === 'ino') return typeof target.ino === 'bigint' ? target.ino + 1n : Number(target.ino) + 1;
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

async function verifySourceDatabaseSwapStops() {
  const stages = [
    'during-bind',
    'after-source-inspection',
    'before-lock',
    'before-online-backup',
    'after-online-backup',
    'before-publish',
    'before-proof'
  ];
  for (const stage of stages) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `waschzeit-source-swap-${stage}-`));
    try {
      const contract = backupInput(root);
      fs.mkdirSync(contract.backupDir);
      createContractDatabase(contract.input.databasePath);
      let swapped = false;
      let sourceLstatCalls = 0;
      const swapFs = {
        ...fs,
        lstatSync(filePath, ...args) {
          const stat = fs.lstatSync(filePath, ...args);
          const sourceMatched = path.resolve(filePath) === path.resolve(contract.input.databasePath);
          if (sourceMatched) sourceLstatCalls += 1;
          if (stage === 'during-bind' && sourceMatched && sourceLstatCalls >= 3) swapped = true;
          return swapped && sourceMatched ? changedIdentity(stat) : stat;
        }
      };
      let observedError;
      try {
        await createProductionBackup(contract.input, {
          ...contract.options,
          fsImpl: swapFs,
          lifecycleHook(currentStage) {
            if (currentStage === stage) swapped = true;
          }
        });
      } catch (error) {
        observedError = error;
      }
      assert.equal(observedError instanceof ProductionBackupError && observedError.code === 'SOURCE_DATABASE_TOCTOU', true, `${stage}: source swap rejected (${observedError?.code || 'none'}, lstats=${sourceLstatCalls})`);
      assert.equal(fs.existsSync(contract.input.targetPath), false, `${stage}: no published backup`);
      assert.equal(fs.existsSync(`${contract.input.targetPath}.partial`), false, `${stage}: no partial backup`);
      assert.equal(fs.existsSync(`${contract.input.targetPath}.restore-probe`), false, `${stage}: no restore copy`);
      assert.equal(fs.existsSync(path.join(contract.backupDir, '.washraum-predeploy-backup.lock')), false, `${stage}: no lock`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

function verifyOfflineVerifierFailures() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-production-verifier-'));
  try {
    const corrupt = path.join(root, 'corrupt.sqlite');
    fs.writeFileSync(corrupt, 'not sqlite');
    assert.throws(() => verifyDatabaseArtifact(corrupt), (error) => ['SQLITE_OPEN', 'SQLITE_INTEGRITY'].includes(error.code));

    const foreign = path.join(root, 'foreign.sqlite');
    const foreignDb = new Database(foreign);
    foreignDb.exec('CREATE TABLE foreign_private_table (id INTEGER PRIMARY KEY, secret TEXT)');
    foreignDb.prepare('INSERT INTO foreign_private_table (secret) VALUES (?)').run(PII_CANARY);
    foreignDb.close();
    assert.throws(() => verifyDatabaseArtifact(foreign), (error) => error.code === 'SCHEMA_CONTRACT');

    const foreignKey = path.join(root, 'foreign-key.sqlite');
    createContractDatabase(foreignKey, { foreignKeyViolation: true });
    assert.throws(() => verifyDatabaseArtifact(foreignKey), (error) => error.code === 'FOREIGN_KEYS');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function verifyArgumentAndProofContracts() {
  const parsed = parseArguments([
    '--service', 'washraum-app',
    '--expected-live-commit', LIVE_COMMIT,
    '--candidate-commit', CANDIDATE_COMMIT,
    '--expected-live-version', '0.3.4',
    '--candidate-version', '0.3.10',
    '--database', '/var/data/washraum.sqlite',
    '--target', `/var/data/backups/washraum-predeploy-${CANDIDATE_COMMIT}.sqlite`
  ]);
  assert.equal(parsed.service, 'washraum-app');
  assert.throws(() => parseArguments(['--service', 'washraum-app', '--service', 'washraum-app']), /ARGUMENTS/);
  const livePackageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-live-package-'));
  try {
    const livePackagePath = path.join(livePackageRoot, 'package.json');
    fs.writeFileSync(livePackagePath, '{"version":"0.3.4"}\n');
    assert.equal(readLiveVersion(livePackagePath), '0.3.4');
    assert.throws(() => readLiveVersion(path.join(livePackageRoot, 'missing.json')), /LIVE_VERSION_SOURCE/);
  } finally {
    fs.rmSync(livePackageRoot, { recursive: true, force: true });
  }

  const now = Date.now();
  assert.equal(validateProof(validProof(now), CANDIDATE_COMMIT, now).candidateCommit, CANDIDATE_COMMIT);
  const token = signBackupProof(validProof(now), PROOF_KEY);
  assert.deepEqual(verifySignedBackupProof(token, PROOF_KEY), validProof(now));
  assert.throws(() => verifySignedBackupProof(`${token}x`, PROOF_KEY), ProductionBackupError);
  const failures = [
    { ...validProof(now), service: 'other' },
    { ...validProof(now), sourceVersion: '0.3.3' },
    { ...validProof(now), candidateVersion: '0.3.8' },
    { ...validProof(now), candidateCommit: '3'.repeat(40) },
    { ...validProof(now), backupArtifactObserved: false },
    { ...validProof(now), executionNonce: '' },
    { ...validProof(now), restoreDrill: { ...validProof(now).restoreDrill, sha256: 'd'.repeat(64) } },
    { ...validProof(now), createdAt: new Date(now - MAX_BACKUP_AGE_MS - 1).toISOString() }
  ];
  for (const invalid of failures) assert.throws(() => validateProof(invalid, CANDIDATE_COMMIT, now), ProductionBackupError);

  const hook = validateRenderHookUrl('https://api.render.com/deploy/srv-d8k09i48aovs73di2ejg?key=masked', CANDIDATE_COMMIT);
  assert.equal(hook.searchParams.get('ref'), CANDIDATE_COMMIT);
  assert.throws(() => validateRenderHookUrl('https://example.com/deploy/srv-d8k09i48aovs73di2ejg?key=x', CANDIDATE_COMMIT), ProductionBackupError);
  assert.throws(() => validateRenderHookUrl('https://api.render.com/deploy/srv-other?key=x', CANDIDATE_COMMIT), ProductionBackupError);
  assert.throws(() => validateRenderHookUrl('https://api.render.com/deploy/srv-d8k09i48aovs73di2ejg?key=x&ref=main', CANDIDATE_COMMIT), ProductionBackupError);
}

function verifyBootstrapBundleManifest() {
  const manifestPath = path.join(projectRoot, 'scripts', 'production-backup-bundle.sha256');
  const lines = fs.readFileSync(manifestPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 3);
  const expectedPaths = [
    'scripts/bootstrap-production-backup.js',
    'scripts/production-backup-contract.js',
    'scripts/verify-production-backup.js'
  ];
  const observedPaths = [];
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{64})  (scripts\/[a-z0-9-]+\.js)$/);
    assert.ok(match);
    observedPaths.push(match[2]);
    const actual = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(projectRoot, ...match[2].split('/'))))
      .digest('hex');
    assert.equal(actual, match[1]);
  }
  assert.deepEqual(observedPaths, expectedPaths);
}

async function verifyFabricatedProofStopsBeforeObservationAndHook() {
  let ledgerRequests = 0;
  let liveEndpointRequests = 0;
  let hookRequests = 0;
  const fabricated = validProof(Date.now());
  fabricated.sourceCommit = '9'.repeat(40);
  fabricated.createdAt = new Date().toISOString();
  fabricated.sha256 = '8'.repeat(64);
  await expectBackupError('SIGNED_PROOF', () => runDeployment({
    candidateCommit: CANDIDATE_COMMIT,
    parallelActions: 'none',
    autoDeploy: 'off',
    proofToken: Buffer.from(JSON.stringify(fabricated)).toString('base64url') + '.' + 'x'.repeat(43),
    proofKey: PROOF_KEY,
    hookUrl: 'https://api.render.com/deploy/srv-d8k09i48aovs73di2ejg?key=masked'
  }, {
    consumeProofImpl: async () => { ledgerRequests += 1; throw new Error('must not run'); },
    liveFetchImpl: async () => { liveEndpointRequests += 1; throw new Error('must not run'); },
    hookFetchImpl: async () => { hookRequests += 1; throw new Error('must not run'); }
  }));
  assert.deepEqual({ backupArtifactObserved: false, liveEndpointObserved: false, requestCount: hookRequests }, {
    backupArtifactObserved: false,
    liveEndpointObserved: false,
    requestCount: 0
  });
  assert.equal(liveEndpointRequests, 0);
  assert.equal(ledgerRequests, 0);
}

async function verifySignedProofObservesLiveBeforeSingleHook() {
  const now = Date.now();
  const proofToken = signBackupProof(validProof(now), PROOF_KEY);
  let liveEndpointRequests = 0;
  let hookRequests = 0;
  const consumer = atomicTestConsumer();
  const result = await runDeployment(deploymentInput(proofToken), {
    now,
    consumeProofImpl: consumer.consume,
    liveFetchImpl: async () => {
      liveEndpointRequests += 1;
      return { status: 200, json: async () => ({ ok: true, revision: LIVE_COMMIT, version: '0.3.4' }) };
    },
    hookFetchImpl: async () => {
      hookRequests += 1;
      return { status: 200, json: async () => ({ deploy: { id: 'dep-signedproof123' } }) };
    }
  });
  assert.equal(result.backupArtifactObserved, true);
  assert.equal(result.liveEndpointObserved, true);
  assert.equal(liveEndpointRequests, 1);
  assert.equal(hookRequests, 1);
  assert.equal(consumer.attempts(), 1);

  hookRequests = 0;
  const mismatchConsumer = atomicTestConsumer();
  await expectBackupError('LIVE_ENDPOINT', () => runDeployment(deploymentInput(proofToken), {
    now,
    consumeProofImpl: mismatchConsumer.consume,
    liveFetchImpl: async () => ({ status: 200, json: async () => ({ ok: true, revision: '9'.repeat(40), version: '0.3.4' }) }),
    hookFetchImpl: async () => { hookRequests += 1; throw new Error('must not run'); }
  }));
  assert.equal(hookRequests, 0);
}

async function verifyProofReplayAndCrashBoundaries() {
  const now = Date.now();
  const proofToken = signBackupProof(validProof(now), PROOF_KEY);
  const liveOk = async () => ({ status: 200, json: async () => ({
    ok: true, revision: LIVE_COMMIT, version: '0.3.4'
  }) });

  let liveRequests = 0;
  let hookRequests = 0;
  const sequential = atomicTestConsumer();
  const options = {
    now,
    consumeProofImpl: sequential.consume,
    liveFetchImpl: async (...args) => { liveRequests += 1; return liveOk(...args); },
    hookFetchImpl: async () => {
      hookRequests += 1;
      return { status: 200, json: async () => ({ deploy: { id: 'dep-replayonce' } }) };
    }
  };
  await runDeployment(deploymentInput(proofToken), options);
  await expectBackupError('PROOF_REPLAY', () => runDeployment(deploymentInput(proofToken), options));
  assert.deepEqual({ liveRequests, hookRequests }, { liveRequests: 1, hookRequests: 1 });

  liveRequests = 0;
  hookRequests = 0;
  const parallel = atomicTestConsumer();
  const parallelOptions = { ...options, consumeProofImpl: parallel.consume,
    liveFetchImpl: async (...args) => { liveRequests += 1; return liveOk(...args); },
    hookFetchImpl: async () => {
      hookRequests += 1;
      return { status: 200, json: async () => ({ deploy: { id: 'dep-parallelonce' } }) };
    }
  };
  const outcomes = await Promise.allSettled([
    runDeployment(deploymentInput(proofToken), parallelOptions),
    runDeployment(deploymentInput(proofToken), parallelOptions)
  ]);
  assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(({ status, reason }) => status === 'rejected' && reason?.code === 'PROOF_REPLAY').length, 1);
  assert.deepEqual({ liveRequests, hookRequests }, { liveRequests: 1, hookRequests: 1 });

  liveRequests = 0;
  hookRequests = 0;
  const crash = atomicTestConsumer();
  const crashOptions = {
    now,
    consumeProofImpl: crash.consume,
    liveFetchImpl: async () => { liveRequests += 1; throw new Error('synthetic crash after consume'); },
    hookFetchImpl: async () => { hookRequests += 1; throw new Error('must not run'); }
  };
  await expectBackupError('LIVE_ENDPOINT', () => runDeployment(deploymentInput(proofToken), crashOptions));
  await expectBackupError('PROOF_REPLAY', () => runDeployment(deploymentInput(proofToken), crashOptions));
  assert.deepEqual({ liveRequests, hookRequests }, { liveRequests: 1, hookRequests: 0 });

  liveRequests = 0;
  hookRequests = 0;
  await expectBackupError('REPLAY_LEDGER_STATUS', () => runDeployment(deploymentInput(proofToken), {
    now,
    consumeProofImpl: async () => { throw new ProductionBackupError('REPLAY_LEDGER_STATUS'); },
    liveFetchImpl: async () => { liveRequests += 1; throw new Error('must not run'); },
    hookFetchImpl: async () => { hookRequests += 1; throw new Error('must not run'); }
  }));
  assert.deepEqual({ liveRequests, hookRequests }, { liveRequests: 0, hookRequests: 0 });

  const expiredToken = signBackupProof(validProof(now - MAX_BACKUP_AGE_MS - 2_000), PROOF_KEY);
  let consumeAttempts = 0;
  await expectBackupError('BACKUP_FRESHNESS', () => runDeployment(deploymentInput(expiredToken), {
    now,
    consumeProofImpl: async () => { consumeAttempts += 1; },
    liveFetchImpl: async () => { liveRequests += 1; },
    hookFetchImpl: async () => { hookRequests += 1; }
  }));
  assert.equal(consumeAttempts, 0);
}

async function verifyGithubAtomicLedgerContract() {
  const proof = validProof();
  let requests = 0;
  await consumeProofOnce(proof, {
    githubRepository: 'Torsten2025/washraum-app',
    githubToken: 'synthetic-test-token'
  }, {
    fetchImpl: async (url, options) => {
      requests += 1;
      assert.equal(url, 'https://api.github.com/repos/Torsten2025/washraum-app/git/refs');
      assert.equal(options.method, 'POST');
      assert.equal(JSON.parse(options.body).sha, CANDIDATE_COMMIT);
      assert.match(JSON.parse(options.body).ref, /^refs\/tags\/waschzeit-release-proof-[0-9a-f]{64}$/);
      return { status: 201 };
    }
  });
  assert.equal(requests, 1);
  await expectBackupError('PROOF_REPLAY', () => consumeProofOnce(proof, {
    githubRepository: 'Torsten2025/washraum-app', githubToken: 'synthetic-test-token'
  }, { fetchImpl: async () => ({ status: 422 }) }));
  await expectBackupError('REPLAY_LEDGER_STATUS', () => consumeProofOnce(proof, {
    githubRepository: 'Torsten2025/washraum-app', githubToken: 'synthetic-test-token'
  }, { fetchImpl: async () => ({ status: 500 }) }));
  await expectBackupError('REPLAY_LEDGER_TRANSPORT', () => consumeProofOnce(proof, {
    githubRepository: 'Torsten2025/washraum-app', githubToken: 'synthetic-test-token'
  }, { fetchImpl: async () => { throw new Error('uncertain'); } }));
  await expectBackupError('REPLAY_LEDGER_CONFIG', () => consumeProofOnce(proof, {
    githubRepository: 'other/repository', githubToken: 'synthetic-test-token'
  }, { fetchImpl: async () => { throw new Error('must not run'); } }));
}

async function verifySingleHookAttempt() {
  let requestCount = 0;
  await withServer((request, response) => {
    requestCount += 1;
    assert.equal(request.method, 'POST');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ deploy: { id: 'dep-synthetic123' } }));
  }, async (url) => {
    const result = await sendSingleDeployRequest(new URL(url));
    assert.deepEqual(result, { ok: true, requestCount: 1, deployAccepted: true });
  });
  assert.equal(requestCount, 1);

  requestCount = 0;
  await withServer((_request, response) => {
    requestCount += 1;
    response.writeHead(202, { 'Content-Type': 'application/json' });
    response.end('{}');
  }, async (url) => expectBackupError('HOOK_PARALLEL', () => sendSingleDeployRequest(new URL(url))));
  assert.equal(requestCount, 1);

  requestCount = 0;
  await withServer((_request, response) => {
    requestCount += 1;
    response.writeHead(302, { Location: '/second' });
    response.end();
  }, async (url) => expectBackupError('HOOK_TRANSPORT', () => sendSingleDeployRequest(new URL(url))));
  assert.equal(requestCount, 1);

  requestCount = 0;
  await withServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'started' }));
  }, async (url) => expectBackupError('HOOK_BODY', () => sendSingleDeployRequest(new URL(url))));
  assert.equal(requestCount, 1);

  requestCount = 0;
  await withServer((_request, _response) => {
    requestCount += 1;
  }, async (url) => expectBackupError('HOOK_TRANSPORT', () => sendSingleDeployRequest(new URL(url), { timeoutMs: 50 })));
  assert.equal(requestCount, 1);
}

function verifyWorkflowContract() {
  const workflow = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'deploy-render.yml'), 'utf8');
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.match(workflow, /^\s*workflow_dispatch:/m);
  assert.match(workflow, /node scripts\/trigger-production-deploy\.js/);
  assert.doesNotMatch(workflow, /--retry|retry-all-errors|curl[\s\S]*RENDER_DEPLOY_HOOK_URL/);
  assert.match(workflow, /PRODUCTION_PARALLEL_ACTIONS/);
  assert.match(workflow, /PRODUCTION_AUTO_DEPLOY/);
  assert.match(workflow, /GITHUB_REF_NAME.*master/s);
  assert.match(workflow, /PRODUCTION_BACKUP_PROOF/);
  assert.match(workflow, /secrets\.PRODUCTION_RELEASE_PROOF_KEY/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
  assert.doesNotMatch(workflow, /PRODUCTION_BACKUP_OK|PRODUCTION_BACKUP_SHA256|PRODUCTION_RESTORE_OK/);
}

async function main() {
  await verifyBackupBootstrap();
  await verifySourceDatabaseSwapStops();
  verifyOfflineVerifierFailures();
  verifyArgumentAndProofContracts();
  verifyBootstrapBundleManifest();
  await verifyFabricatedProofStopsBeforeObservationAndHook();
  await verifySignedProofObservesLiveBeforeSingleHook();
  await verifyProofReplayAndCrashBoundaries();
  await verifyGithubAtomicLedgerContract();
  await verifySingleHookAttempt();
  verifyWorkflowContract();
  process.stdout.write(`${JSON.stringify({
    suite: 'production-release-tooling',
    onlineBackup: true,
    restoreProbe: true,
    signedRuntimeProof: true,
    liveEndpointObservedBeforeHook: true,
    proofReplayStoppedBeforeLiveEndpoint: true,
    failClosedGuards: true,
    personalDataPrinted: false,
    hookRequestsPerRun: 1,
    externalAttempts: 0
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`PRODUCTION_RELEASE_TOOLING_TEST_FAIL ${error.code || error.name || 'UNEXPECTED'} ${error.message || ''}\n`);
  process.exitCode = 1;
});
