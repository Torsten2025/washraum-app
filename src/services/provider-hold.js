'use strict';

class ProviderHoldError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProviderHoldError';
    this.code = code;
  }
}

function createProviderHold({ enabled, runtimeFlags, externalAttemptCounter, env = process.env } = {}) {
  const held = enabled === true;
  if (held && (runtimeFlags?.email?.enabled === true || runtimeFlags?.push?.enabled === true
    || String(env.AUTO_BACKUP || '').trim().toLowerCase() === 'true')) {
    throw new ProviderHoldError('PROVIDER_HOLD_FLAGS', 'Provider-Hold und aktive Versand-/Legacy-Backupflags widersprechen sich.');
  }

  function block(kind) {
    if (held) throw new ProviderHoldError('PROVIDER_HOLD_ACTIVE', `${kind} bleibt bis zum separaten Produktionsgate gesperrt.`);
  }

  function wrap(kind, delegate) {
    if (typeof delegate !== 'function') throw new TypeError('Providerdelegate fehlt.');
    return async (...args) => {
      block(kind);
      externalAttemptCounter?.increment?.(kind);
      return delegate(...args);
    };
  }

  function assertZeroExternalAttempts() {
    if (Number(externalAttemptCounter?.count?.() || 0) !== 0) {
      throw new ProviderHoldError('PROVIDER_HOLD_ATTEMPT', 'Waerend Provider-Hold wurde ein externer Versuch registriert.');
    }
    return true;
  }

  return Object.freeze({ held, block, wrap, assertZeroExternalAttempts });
}

module.exports = { ProviderHoldError, createProviderHold };
