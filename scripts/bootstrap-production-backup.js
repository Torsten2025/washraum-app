'use strict';

const fs = require('fs');
const {
  PRODUCTION_DOMAIN,
  ProductionBackupError,
  createProductionBackup,
  signBackupProof
} = require('./production-backup-contract');

const ARGUMENTS = Object.freeze({
  '--service': 'service',
  '--expected-live-commit': 'expectedLiveCommit',
  '--candidate-commit': 'candidateCommit',
  '--expected-live-version': 'expectedLiveVersion',
  '--candidate-version': 'candidateVersion',
  '--database': 'databasePath',
  '--target': 'targetPath'
});
const LIVE_PACKAGE_PATH = '/opt/render/project/src/package.json';

function readLiveVersion(filePath = LIVE_PACKAGE_PATH, fsImpl = fs) {
  let parsed;
  try {
    const stat = fsImpl.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('invalid file');
    parsed = JSON.parse(fsImpl.readFileSync(filePath, 'utf8'));
  } catch {
    throw new ProductionBackupError('LIVE_VERSION_SOURCE');
  }
  const version = String(parsed?.version || '').trim();
  if (!version) throw new ProductionBackupError('LIVE_VERSION_SOURCE');
  return version;
}

function parseArguments(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = ARGUMENTS[argv[index]];
    const value = argv[index + 1];
    if (!key || value === undefined || String(value).startsWith('--') || Object.hasOwn(parsed, key)) {
      throw new ProductionBackupError('ARGUMENTS');
    }
    parsed[key] = value;
  }
  if (Object.keys(parsed).length !== Object.keys(ARGUMENTS).length) {
    throw new ProductionBackupError('ARGUMENTS');
  }
  return parsed;
}

async function main() {
  try {
    const result = await createProductionBackup({
      ...parseArguments(process.argv.slice(2)),
      serviceId: process.env.RENDER_SERVICE_ID,
      domain: PRODUCTION_DOMAIN,
      actualLiveCommit: process.env.RENDER_GIT_COMMIT,
      actualLiveVersion: readLiveVersion()
    });
    const token = signBackupProof(result, process.env.PRODUCTION_RELEASE_PROOF_KEY);
    process.stdout.write(`PRODUCTION_BACKUP_PASS proof=${token}\n`);
  } catch (error) {
    const code = error instanceof ProductionBackupError ? error.code : 'UNEXPECTED';
    process.stderr.write(`PRODUCTION_BACKUP_FAIL class=${code}\n`);
    process.exitCode = 1;
  }
}

module.exports = { LIVE_PACKAGE_PATH, parseArguments, readLiveVersion };

if (require.main === module) main();
