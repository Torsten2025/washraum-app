'use strict';

const { reportStartupFailure } = require('./src/services/startup-diagnostics');

function fail(error) {
  try {
    reportStartupFailure(error);
  } finally {
    process.exit(1);
  }
}

process.once('uncaughtException', fail);
process.once('unhandledRejection', fail);

try {
  require('./server');
} catch (error) {
  fail(error);
}
