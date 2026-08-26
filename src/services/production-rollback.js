'use strict';

const FULL_COMMIT = /^[0-9a-f]{40}$/;
const FULL_SHA256 = /^[0-9a-f]{64}$/;

class ProductionRollbackError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProductionRollbackError';
    this.code = code;
  }
}

function createRollbackContract({
  currentCommit, codeRollbackCommit, preMigrationSnapshotId, preMigrationManifestSha256,
  preMigrationSchemaHash, currentSchemaHash, codeCompatibleSchemaHashes = []
} = {}) {
  if (!FULL_COMMIT.test(String(currentCommit || '')) || !FULL_COMMIT.test(String(codeRollbackCommit || ''))
    || currentCommit === codeRollbackCommit || !String(preMigrationSnapshotId || '')
    || ![preMigrationManifestSha256, preMigrationSchemaHash, currentSchemaHash].every((value) => FULL_SHA256.test(String(value || '')))) {
    throw new ProductionRollbackError('ROLLBACK_CONTRACT_INVALID', 'Code- und Datenrollbackanker sind nicht getrennt vollstaendig gebunden.');
  }
  const compatible = [...new Set(codeCompatibleSchemaHashes.map(String))].sort();
  if (compatible.some((hash) => !FULL_SHA256.test(hash))) {
    throw new ProductionRollbackError('ROLLBACK_SCHEMA_INVALID', 'Die Codekompatibilitaetsliste ist ungueltig.');
  }
  return Object.freeze({
    currentCommit, codeRollbackCommit, preMigrationSnapshotId, preMigrationManifestSha256,
    preMigrationSchemaHash, currentSchemaHash, codeCompatibleSchemaHashes: compatible
  });
}

function planCodeRollback(contract, liveSchemaHash) {
  if (liveSchemaHash !== contract.currentSchemaHash) {
    throw new ProductionRollbackError('ROLLBACK_LIVE_SCHEMA_DRIFT', 'Der Live-Schemahash weicht vom Rollbackvertrag ab.');
  }
  const codeOnlySafe = contract.codeCompatibleSchemaHashes.includes(liveSchemaHash);
  return Object.freeze({
    kind: codeOnlySafe ? 'code-only' : 'code-and-data',
    codeCommit: contract.codeRollbackCommit,
    dataRestoreRequired: !codeOnlySafe,
    dataSnapshotId: codeOnlySafe ? null : contract.preMigrationSnapshotId,
    automatic: false
  });
}

function authorizeDataRestore(contract, {
  snapshotId, isolatedRestoreVerified, serviceWritesStopped,
  expectedPreMigrationSchemaHash, explicitOwnerGate
} = {}) {
  if (snapshotId !== contract.preMigrationSnapshotId
    || expectedPreMigrationSchemaHash !== contract.preMigrationSchemaHash
    || isolatedRestoreVerified !== true || serviceWritesStopped !== true || explicitOwnerGate !== true) {
    throw new ProductionRollbackError('DATA_RESTORE_NOT_AUTHORIZED', 'Datenrestore bleibt ohne Drill, Schreibstopp und Owner-Gate gesperrt.');
  }
  return Object.freeze({ authorized: true, automatic: false, snapshotId, targetSchemaHash: contract.preMigrationSchemaHash });
}

module.exports = { ProductionRollbackError, authorizeDataRestore, createRollbackContract, planCodeRollback };
