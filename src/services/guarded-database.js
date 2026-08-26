'use strict';

const crypto = require('crypto');

class GuardedDatabaseError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GuardedDatabaseError';
    this.code = code;
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function stableRows(rows) {
  return rows
    .map((row) => Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function describeSchema(db) {
  const objects = db.prepare(`
    SELECT type, name, tbl_name AS tableName, COALESCE(sql, '') AS sql
    FROM sqlite_schema
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all().map((object) => {
    const descriptor = { ...object };
    if (object.type === 'table') {
      descriptor.columns = stableRows(db.prepare(`PRAGMA table_xinfo(${quoteIdentifier(object.name)})`).all());
      descriptor.foreignKeys = stableRows(db.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(object.name)})`).all());
      descriptor.indices = stableRows(db.prepare(`PRAGMA index_list(${quoteIdentifier(object.name)})`).all().map((index) => ({
        ...index,
        columns: stableRows(db.prepare(`PRAGMA index_xinfo(${quoteIdentifier(index.name)})`).all())
      })));
    }
    return descriptor;
  });
  return {
    format: 1,
    objects,
    pragmas: {
      applicationId: Number(db.pragma('application_id', { simple: true })),
      autoVacuum: Number(db.pragma('auto_vacuum', { simple: true })),
      encoding: String(db.pragma('encoding', { simple: true })),
      foreignKeys: Number(db.pragma('foreign_keys', { simple: true })),
      journalMode: String(db.pragma('journal_mode', { simple: true })).toLowerCase(),
      pageSize: Number(db.pragma('page_size', { simple: true })),
      userVersion: Number(db.pragma('user_version', { simple: true }))
    }
  };
}

function schemaHash(descriptor) {
  return crypto.createHash('sha256').update(JSON.stringify(descriptor)).digest('hex');
}

function readSchemaIdentity(db) {
  const descriptor = describeSchema(db);
  return Object.freeze({ descriptor, hash: schemaHash(descriptor) });
}

function openReadOnlyBaseline({ Database, dbPath, expectedSchemaHashes }) {
  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma('foreign_keys = ON');
    db.pragma('query_only = ON');
    const quickCheck = String(db.pragma('quick_check', { simple: true })).toLowerCase();
    if (quickCheck !== 'ok') {
      throw new GuardedDatabaseError('PRODUCTION_BASELINE_INTEGRITY', 'Die Produktionsbaseline besteht quick_check nicht.');
    }
    if (db.pragma('foreign_key_check').length !== 0) {
      throw new GuardedDatabaseError('PRODUCTION_BASELINE_FOREIGN_KEYS', 'Die Produktionsbaseline verletzt Fremdschluessel.');
    }
    const identity = readSchemaIdentity(db);
    const allowed = (expectedSchemaHashes || []).map(String).map((value) => value.toLowerCase());
    if (!allowed.length || !allowed.includes(identity.hash)) {
      throw new GuardedDatabaseError('PRODUCTION_SCHEMA_DRIFT', 'Der Produktions-Schemahash ist nicht freigegeben.');
    }
    return Object.freeze({ descriptor: identity.descriptor, hash: identity.hash, quickCheck: 'ok', foreignKeys: 'ok' });
  } catch (error) {
    if (error instanceof GuardedDatabaseError) throw error;
    const wrapped = new GuardedDatabaseError('PRODUCTION_BASELINE_OPEN', 'Die Produktionsdatenbank konnte nicht read-only mit fileMustExist geoeffnet werden.');
    wrapped.cause = error;
    throw wrapped;
  } finally {
    db?.close();
  }
}

function assertWritableDatabasePermit(permit, expectedContractHash) {
  if (!permit || permit.preMigrationBackupVerified !== true || permit.contractHash !== expectedContractHash) {
    throw new GuardedDatabaseError('PRODUCTION_WRITE_PERMIT', 'Die erste Produktionsschreiboeffnung ist ohne verifiziertes Vorbackup gesperrt.');
  }
}

module.exports = {
  GuardedDatabaseError,
  assertWritableDatabasePermit,
  describeSchema,
  openReadOnlyBaseline,
  readSchemaIdentity,
  schemaHash
};
