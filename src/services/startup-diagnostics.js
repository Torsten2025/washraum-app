'use strict';

const fs = require('node:fs');

const STARTUP_FAILURE_CLASSES = Object.freeze({
  AGENT_TEST_FIXTURE_FLAG_INVALID: 'GUARD_FLAG',
  AGENT_TEST_FIXTURE_IDENTITY_MISMATCH: 'GUARD_IDENTITY',
  AGENT_TEST_FIXTURE_NO_SEND_REQUIRED: 'GUARD_NO_SEND',
  AGENT_TEST_FIXTURE_PROVIDER_BINDING_FORBIDDEN: 'GUARD_PROVIDER',
  AGENT_TEST_FIXTURE_CREDENTIALS_INVALID: 'GUARD_CREDENTIALS',
  AGENT_TEST_FIXTURE_UNSAFE_MODE: 'GUARD_MODE',
  MAINTENANCE_MIGRATION_BACKUP_REQUIRED: 'MIGRATION_BACKUP'
});

function classifyStartupFailure(error) {
  const code = String(error?.code || '');
  if (STARTUP_FAILURE_CLASSES[code]) return STARTUP_FAILURE_CLASSES[code];
  if (code.startsWith('AGENT_TEST_FIXTURE_')) return 'FIXTURE_STATE';
  if (code.startsWith('SQLITE_')) return 'STORAGE';
  if (['EACCES', 'EADDRINUSE', 'EADDRNOTAVAIL'].includes(code)) return 'LISTENER';
  if (code === 'MODULE_NOT_FOUND' || code === 'ERR_DLOPEN_FAILED') return 'BOOTSTRAP';
  return 'STARTUP';
}

function formatStartupFailure(error) {
  return `WASCHZEIT_STARTFAIL class=${classifyStartupFailure(error)}`;
}

function writeStartupFailureLine(line) {
  const output = Buffer.from(`${line}\n`, 'utf8');
  let offset = 0;
  while (offset < output.length) {
    const written = fs.writeSync(2, output, offset, output.length - offset);
    if (!Number.isInteger(written) || written <= 0) {
      const error = new Error('STARTUP_DIAGNOSTIC_WRITE_FAILED');
      error.code = 'STARTUP_DIAGNOSTIC_WRITE_FAILED';
      throw error;
    }
    offset += written;
  }
}

function createStartupFailureReporter(writeLine = writeStartupFailureLine) {
  let reported = false;
  return (error) => {
    if (reported) return false;
    reported = true;
    writeLine(formatStartupFailure(error));
    return true;
  };
}

const reportStartupFailure = createStartupFailureReporter();

module.exports = {
  classifyStartupFailure,
  createStartupFailureReporter,
  formatStartupFailure,
  reportStartupFailure,
  writeStartupFailureLine
};
