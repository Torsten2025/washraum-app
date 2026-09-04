'use strict';

const {
  ProductionBackupError,
  verifyDatabaseArtifact
} = require('./production-backup-contract');

function fail(code) {
  process.stderr.write(`BACKUP_VERIFY_FAIL ${code}\n`);
  process.exitCode = 1;
}

const input = process.argv[2];
if (!input || process.argv.length !== 3) {
  fail('usage');
} else {
  try {
    process.stdout.write(`${JSON.stringify(verifyDatabaseArtifact(input))}\n`);
  } catch (error) {
    fail(error instanceof ProductionBackupError ? error.code.toLowerCase() : 'unexpected');
  }
}
