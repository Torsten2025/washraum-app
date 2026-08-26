'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readSchemaIdentity } = require('./guarded-database');

const LEDGER_TABLE = 'production_migration_ledger';
const ADDITIVE_SQL = /^\s*(?:CREATE\s+(?:TABLE|INDEX|UNIQUE\s+INDEX|TRIGGER)\b|ALTER\s+TABLE\b[\s\S]*\bADD\s+COLUMN\b)/i;
const DESTRUCTIVE_SQL = /\b(?:DROP|DELETE|INSERT|UPDATE|UPSERT|REPLACE|VACUUM|REINDEX|ATTACH|DETACH)\b/i;
const DOMAIN_TABLES = Object.freeze([
  'houses', 'users', 'apartments', 'resources', 'bookings', 'fixed_bookings',
  'booking_day_usage', 'remaining_slot_requests', 'maintenance_reports', 'maintenance_cases'
]);

class ProductionMigrationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProductionMigrationError';
    this.code = code;
  }
}

function canonicalArtifact(artifact) {
  return JSON.stringify({
    id: artifact.id,
    appVersion: artifact.appVersion,
    commit: artifact.commit,
    fromSchemaHash: artifact.fromSchemaHash,
    toSchemaHash: artifact.toSchemaHash,
    destructive: artifact.destructive,
    compatibleCode: [...(artifact.compatibleCode || [])].sort(),
    steps: (artifact.steps || []).map((step) => ({ id: step.id, sql: step.sql }))
  });
}

function artifactHash(artifact) {
  return crypto.createHash('sha256').update(canonicalArtifact(artifact)).digest('hex');
}

function validateMigrationArtifact(artifact, { appVersion, commit } = {}) {
  if (!artifact || artifact.format !== 1 || !/^[a-z0-9][a-z0-9._-]{4,80}$/i.test(String(artifact.id || ''))) {
    throw new ProductionMigrationError('MIGRATION_ARTIFACT_FORMAT', 'Das Migrationsartefakt ist nicht kanonisch.');
  }
  if (artifact.destructive !== false) {
    throw new ProductionMigrationError('MIGRATION_DESTRUCTIVE', 'Produktionsmigrationen muessen destructive=false sein.');
  }
  if (artifact.appVersion !== appVersion || artifact.commit !== commit) {
    throw new ProductionMigrationError('MIGRATION_BINDING', 'Migrationsartefakt, Appversion und Commit sind nicht identisch gebunden.');
  }
  if (![artifact.fromSchemaHash, artifact.toSchemaHash].every((value) => /^[0-9a-f]{64}$/.test(String(value || '')))) {
    throw new ProductionMigrationError('MIGRATION_SCHEMA_HASH', 'Vor- oder Nach-Schemahash fehlt.');
  }
  if (!Array.isArray(artifact.compatibleCode) || !artifact.compatibleCode.includes(appVersion)
    || artifact.compatibleCode.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new ProductionMigrationError('MIGRATION_CODE_COMPATIBILITY', 'Die explizite Codekompatibilitaet des Zielschemas fehlt.');
  }
  if (!Array.isArray(artifact.steps)) {
    throw new ProductionMigrationError('MIGRATION_STEPS', 'Migrationsschritte muessen als vollstaendige Liste vorliegen.');
  }
  const ids = new Set();
  for (const step of artifact.steps) {
    const sql = String(step?.sql || '');
    if (!step?.id || ids.has(step.id)) {
      throw new ProductionMigrationError('MIGRATION_STEP_ID', 'Migrationsschritte muessen eindeutig sein.');
    }
    ids.add(step.id);
    if (!ADDITIVE_SQL.test(sql) || DESTRUCTIVE_SQL.test(sql) || sql.trim().replace(/;$/, '').includes(';')) {
      throw new ProductionMigrationError('MIGRATION_STEP_NOT_ADDITIVE', `Migrationsschritt ${step.id} ist nicht rein additiv.`);
    }
  }
  if (artifactHash(artifact) !== artifact.artifactSha256) {
    throw new ProductionMigrationError('MIGRATION_ARTIFACT_HASH', 'Der SHA256 des Migrationsartefakts stimmt nicht.');
  }
  return Object.freeze({ ...artifact, calculatedHash: artifact.artifactSha256 });
}

function loadMigrationArtifact({ rootDir, relativePath, appVersion, commit }) {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  if (!/^migrations\/production\/[a-z0-9._-]+\.json$/i.test(normalized)) {
    throw new ProductionMigrationError('MIGRATION_ARTIFACT_PATH', 'Das Artefakt liegt ausserhalb der Produktions-Allowlist.');
  }
  const absolute = path.resolve(rootDir, normalized);
  const root = `${path.resolve(rootDir, 'migrations', 'production')}${path.sep}`;
  if (!absolute.startsWith(root)) {
    throw new ProductionMigrationError('MIGRATION_ARTIFACT_PATH', 'Der Artefaktpfad verlaesst die Produktions-Allowlist.');
  }
  try {
    return validateMigrationArtifact(JSON.parse(fs.readFileSync(absolute, 'utf8')), { appVersion, commit });
  } catch (error) {
    if (error instanceof ProductionMigrationError) throw error;
    const wrapped = new ProductionMigrationError('MIGRATION_ARTIFACT_READ', 'Das gebundene Migrationsartefakt ist nicht lesbar.');
    wrapped.cause = error;
    throw wrapped;
  }
}

function createLedgerSql() {
  return `
    CREATE TABLE ${LEDGER_TABLE} (
      migration_id TEXT PRIMARY KEY,
      artifact_sha256 TEXT NOT NULL UNIQUE,
      from_schema_sha256 TEXT NOT NULL,
      to_schema_sha256 TEXT NOT NULL,
      app_version TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      applied_at_utc TEXT NOT NULL,
      destructive INTEGER NOT NULL CHECK (destructive = 0),
      compatible_code_json TEXT NOT NULL
    ) WITHOUT ROWID;
    CREATE TRIGGER ${LEDGER_TABLE}_no_update BEFORE UPDATE ON ${LEDGER_TABLE}
    BEGIN SELECT RAISE(ABORT, 'PRODUCTION_MIGRATION_LEDGER_IMMUTABLE'); END;
    CREATE TRIGGER ${LEDGER_TABLE}_no_delete BEFORE DELETE ON ${LEDGER_TABLE}
    BEGIN SELECT RAISE(ABORT, 'PRODUCTION_MIGRATION_LEDGER_IMMUTABLE'); END
  `;
}

function captureDataInvariants(db) {
  const existing = new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map((row) => row.name));
  const counts = Object.fromEntries(DOMAIN_TABLES.filter((table) => existing.has(table)).map((table) => [
    table,
    Number(db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count)
  ]));
  const foreignKeyViolations = db.pragma('foreign_key_check').length;
  return Object.freeze({ counts, foreignKeyViolations });
}

function assertDataInvariants(before, after) {
  if (before.foreignKeyViolations !== 0 || after.foreignKeyViolations !== 0
    || JSON.stringify(before.counts) !== JSON.stringify(after.counts)) {
    throw new ProductionMigrationError('MIGRATION_DATA_INVARIANT', 'Additive Migration hat Fachdatenzaehler oder Fremdschluessel veraendert.');
  }
  return true;
}

function applyProductionMigration({ db, artifact, migrationPermit, now = () => new Date() }) {
  if (!migrationPermit || migrationPermit.preMigrationBackupVerified !== true
    || migrationPermit.contractHash !== migrationPermit.expectedContractHash) {
    throw new ProductionMigrationError('MIGRATION_PERMIT', 'Die Migration ist ohne verifiziertes Off-Disk-Vorbackup gesperrt.');
  }
  const current = readSchemaIdentity(db);
  const ledgerExists = Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(LEDGER_TABLE));
  if (ledgerExists) {
    const applied = db.prepare(`SELECT * FROM ${LEDGER_TABLE} WHERE migration_id=?`).get(artifact.id);
    if (applied) {
      if (applied.artifact_sha256 !== artifact.artifactSha256
        || applied.to_schema_sha256 !== artifact.toSchemaHash || current.hash !== artifact.toSchemaHash) {
        throw new ProductionMigrationError('MIGRATION_LEDGER_DRIFT', 'Ledger, Artefakt und Schema weichen voneinander ab.');
      }
      return Object.freeze({ applied: false, idempotent: true, schemaHash: current.hash, invariants: captureDataInvariants(db) });
    }
  }
  if (current.hash !== artifact.fromSchemaHash) {
    throw new ProductionMigrationError('MIGRATION_BASELINE_DRIFT', 'Das aktuelle Schema entspricht nicht dem Artefakt-Vorhash.');
  }
  const before = captureDataInvariants(db);
  let result;
  db.transaction(() => {
    if (!ledgerExists) db.exec(createLedgerSql());
    for (const step of artifact.steps) {
      db.exec(step.sql);
      if (migrationPermit.failAfterStep === step.id) {
        throw new ProductionMigrationError('MIGRATION_INJECTED_FAILURE', 'Injizierter Migrationsfehler.');
      }
    }
    const afterIdentity = readSchemaIdentity(db);
    if (afterIdentity.hash !== artifact.toSchemaHash) {
      throw new ProductionMigrationError('MIGRATION_TARGET_DRIFT', 'Der Nach-Schemahash entspricht nicht dem Artefakt.');
    }
    const after = captureDataInvariants(db);
    assertDataInvariants(before, after);
    db.prepare(`
      INSERT INTO ${LEDGER_TABLE} (
        migration_id, artifact_sha256, from_schema_sha256, to_schema_sha256,
        app_version, commit_sha, applied_at_utc, destructive, compatible_code_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(artifact.id, artifact.artifactSha256, artifact.fromSchemaHash, artifact.toSchemaHash,
      artifact.appVersion, artifact.commit, now().toISOString(), JSON.stringify([...artifact.compatibleCode].sort()));
    result = { applied: true, idempotent: false, schemaHash: afterIdentity.hash, invariants: after };
  }).immediate();
  return Object.freeze(result);
}

module.exports = {
  DOMAIN_TABLES,
  LEDGER_TABLE,
  ProductionMigrationError,
  applyProductionMigration,
  artifactHash,
  assertDataInvariants,
  canonicalArtifact,
  captureDataInvariants,
  createLedgerSql,
  loadMigrationArtifact,
  validateMigrationArtifact
};
