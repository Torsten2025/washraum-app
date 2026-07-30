'use strict';

const FLAG_DEFAULTS = Object.freeze({
  BACKUP_ENABLED: false,
  EMAIL_ENABLED: false,
  PUSH_ENABLED: false
});

function parseStrictBooleanFlag(env, name, logger = console) {
  const rawValue = env?.[name];
  if (rawValue === undefined || rawValue === null) {
    return { enabled: false, source: 'missing', valid: true };
  }
  if (String(rawValue).trim() === '') {
    return { enabled: false, source: 'empty', valid: true };
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === 'true' || normalized === 'false') {
    return { enabled: normalized === 'true', source: 'environment', valid: true };
  }

  logger?.warn?.(`${name} ist ungueltig; die Integration bleibt sicherheitshalber deaktiviert.`);
  return { enabled: false, source: 'invalid', valid: false };
}

function createRuntimeFlags({ env = process.env, logger = console } = {}) {
  return {
    backup: parseStrictBooleanFlag(env, 'BACKUP_ENABLED', logger),
    email: parseStrictBooleanFlag(env, 'EMAIL_ENABLED', logger),
    push: parseStrictBooleanFlag(env, 'PUSH_ENABLED', logger)
  };
}

function publicRuntimeFlags(flags) {
  return {
    backup: { enabled: flags?.backup?.enabled === true },
    email: { enabled: flags?.email?.enabled === true },
    push: { enabled: flags?.push?.enabled === true }
  };
}

module.exports = {
  FLAG_DEFAULTS,
  createRuntimeFlags,
  parseStrictBooleanFlag,
  publicRuntimeFlags
};
