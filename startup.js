'use strict';

const { reportStartupFailure } = require('./src/services/startup-diagnostics');
const { prepareProductionStartup } = require('./src/services/production-startup');

function fail(error) {
  try {
    reportStartupFailure(error);
  } finally {
    process.exit(1);
  }
}

process.once('uncaughtException', fail);
process.once('unhandledRejection', fail);

prepareProductionStartup()
  .then(() => require('./server'))
  .catch(fail);
