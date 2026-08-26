'use strict';

const MAX_DATE_MILLISECONDS = 8640000000000000;

class ProductionBackupScheduleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProductionBackupScheduleError';
    this.code = code;
    this.retryable = true;
  }
}

function createBackupFreshnessGate({ maximumAgeMs, now = () => Date.now(), initialBackup = null } = {}) {
  if (!Number.isSafeInteger(maximumAgeMs) || maximumAgeMs < 1000
    || maximumAgeMs > MAX_DATE_MILLISECONDS) throw new TypeError('maximumAgeMs fehlt.');
  let lastVerifiedAt = null;
  let lastFailureCode = '';
  let lastAttemptAt = null;

  function clockValue() {
    let value;
    try {
      value = now();
    } catch {
      return null;
    }
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_DATE_MILLISECONDS
      ? value
      : null;
  }

  function recordVerified(backup) {
    const verifiedAt = Date.parse(String(backup?.verifiedAtUtc || ''));
    if (!backup?.ok || backup.encrypted !== true || backup.remoteReadback !== true
      || !Number.isSafeInteger(verifiedAt) || verifiedAt < 0 || verifiedAt > MAX_DATE_MILLISECONDS) {
      throw new ProductionBackupScheduleError('BACKUP_RESULT_UNVERIFIED', 'Backupresultat ist nicht vollstaendig verifiziert.');
    }
    const current = clockValue();
    if (current === null) {
      throw new ProductionBackupScheduleError('BACKUP_CLOCK_INVALID', 'Die Backup-Frischeuhr ist ungueltig.');
    }
    if (verifiedAt > current) {
      throw new ProductionBackupScheduleError('BACKUP_RESULT_FUTURE', 'Ein zukuenftiges Backupresultat wird nicht akzeptiert.');
    }
    lastVerifiedAt = verifiedAt;
    lastAttemptAt = current;
    lastFailureCode = '';
    return status();
  }

  function recordFailure(code = 'BACKUP_FAILED') {
    lastAttemptAt = clockValue();
    lastFailureCode = lastAttemptAt === null
      ? 'BACKUP_CLOCK_INVALID'
      : String(code || 'BACKUP_FAILED');
    return status();
  }

  function status() {
    const current = clockValue();
    const ageMs = lastVerifiedAt !== null && current !== null ? current - lastVerifiedAt : null;
    const fresh = Number.isSafeInteger(ageMs) && ageMs >= 0 && ageMs < maximumAgeMs;
    return Object.freeze({
      fresh,
      clockValid: current !== null,
      maximumAgeMs,
      ageMs,
      lastVerifiedAt: lastVerifiedAt !== null ? new Date(lastVerifiedAt).toISOString() : null,
      lastAttemptAt: lastAttemptAt !== null ? new Date(lastAttemptAt).toISOString() : null,
      lastFailureCode: lastFailureCode || null
    });
  }

  function assertFreshForWrite() {
    const current = status();
    if (!current.fresh) {
      const error = new ProductionBackupScheduleError(
        'PRODUCTION_BACKUP_STALE_WRITE_BLOCKED',
        'Fachliche Schreibzugriffe bleiben bis zu einem frischen verifizierten Off-Disk-Backup gesperrt.'
      );
      error.retryAfterSeconds = Math.max(1, Math.ceil(maximumAgeMs / 1000));
      throw error;
    }
    return current;
  }

  if (initialBackup) recordVerified(initialBackup);
  return Object.freeze({ assertFreshForWrite, recordFailure, recordVerified, status });
}

function createPeriodicBackupScheduler({
  backup,
  freshnessGate,
  intervalMs,
  timeoutMs,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout
} = {}) {
  if (typeof backup !== 'function' || !freshnessGate || typeof freshnessGate.recordVerified !== 'function') {
    throw new TypeError('Backupdelegate oder Frischegate fehlt.');
  }
  if (!Number.isInteger(intervalMs) || !Number.isInteger(timeoutMs) || timeoutMs >= intervalMs) {
    throw new TypeError('Schedulerbudgets sind ungueltig.');
  }
  let inFlight = null;
  let timer = null;
  let overlapSkips = 0;

  async function runNow(reason = 'periodic') {
    if (inFlight) {
      overlapSkips += 1;
      return Object.freeze({ ok: false, skipped: true, reason: 'BACKUP_OVERLAP', overlapSkips });
    }

    let timeoutHandle;
    const actual = Promise.resolve().then(() => backup({ phase: reason }));
    const settled = actual.then((result) => {
      freshnessGate.recordVerified(result);
      return Object.freeze({ ok: true, result });
    }, (error) => {
      freshnessGate.recordFailure(error?.code || 'BACKUP_FAILED');
      return Object.freeze({ ok: false, errorCode: error?.code || 'BACKUP_FAILED' });
    }).finally(() => {
      inFlight = null;
    });
    inFlight = settled;

    const timeout = new Promise((resolve) => {
      timeoutHandle = setTimeoutImpl(() => {
        freshnessGate.recordFailure('BACKUP_JOB_TIMEOUT');
        resolve(Object.freeze({ ok: false, timedOut: true, errorCode: 'BACKUP_JOB_TIMEOUT' }));
      }, timeoutMs);
    });
    const result = await Promise.race([settled, timeout]);
    clearTimeoutImpl(timeoutHandle);
    return result;
  }

  function start() {
    if (timer) return false;
    timer = setIntervalImpl(() => { void runNow('periodic'); }, intervalMs);
    timer?.unref?.();
    return true;
  }

  function stop() {
    if (!timer) return false;
    clearIntervalImpl(timer);
    timer = null;
    return true;
  }

  function status() {
    return Object.freeze({ running: Boolean(timer), inFlight: Boolean(inFlight), overlapSkips, freshness: freshnessGate.status() });
  }

  return Object.freeze({ runNow, start, status, stop });
}

module.exports = {
  ProductionBackupScheduleError,
  createBackupFreshnessGate,
  createPeriodicBackupScheduler
};
