'use strict';

const { runProductionPredeployGate } = require('../src/services/production-startup');

runProductionPredeployGate().then(() => {
  process.stdout.write('PRODUCTION_PREDEPLOY_BACKUP_PASS\n');
}).catch((error) => {
  process.stderr.write(`PRODUCTION_PREDEPLOY_BACKUP_STOP:${String(error?.code || 'FAILED')}\n`);
  process.exitCode = 1;
});
