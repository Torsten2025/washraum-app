'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_CONTRACT_VERSION = 'waschzeit-production-schema-v1';
const ALLOWED_TABLES = new Set([
  'account_recovery_codes',
  'apartment_invitations',
  'apartment_name_requests',
  'apartments',
  'audit_log',
  'booking_day_usage',
  'bookings',
  'device_pairing_codes',
  'diaper_game_challenge_scores',
  'diaper_game_rounds',
  'diaper_game_scores',
  'email_verification_tokens',
  'fixed_bookings',
  'houses',
  'maintenance_admin_notifications',
  'maintenance_cases',
  'maintenance_entries',
  'maintenance_report_deliveries',
  'maintenance_report_notifications',
  'maintenance_report_preferences',
  'maintenance_reports',
  'notification_preferences',
  'password_reset_tokens',
  'push_subscriptions',
  'release_notices',
  'remaining_slot_requests',
  'resources',
  'sessions',
  'settings',
  'user_house_roles',
  'users'
]);
const REQUIRED_TABLE_COLUMNS = Object.freeze({
  apartments: Object.freeze(['id', 'house_id', 'label', 'claimed_by', 'active']),
  bookings: Object.freeze(['id', 'user_id', 'resource_id', 'booking_date', 'slot']),
  houses: Object.freeze(['id', 'name', 'code', 'active']),
  resources: Object.freeze(['id', 'name', 'type', 'house_id', 'active']),
  settings: Object.freeze(['key', 'value']),
  users: Object.freeze(['id', 'username', 'password_hash', 'role', 'house_id', 'is_superadmin', 'active'])
});

function fail(message) {
  process.stderr.write(`BACKUP_VERIFY_FAIL ${message}\n`);
  process.exit(1);
}

const input = process.argv[2];
if (!input) fail('usage: node scripts/verify-production-backup.js <backup.sqlite>');

const backupPath = path.resolve(input);
let stat;
try {
  stat = fs.statSync(backupPath);
} catch {
  fail('file_missing');
}
if (!stat.isFile() || stat.size <= 0) fail('file_invalid');

let db;
try {
  db = new Database(backupPath, { readonly: true, fileMustExist: true });
  db.pragma('query_only = ON');
  db.pragma('foreign_keys = ON');
  const integrity = String(db.pragma('integrity_check', { simple: true })).toLowerCase();
  const foreignKeyViolations = db.pragma('foreign_key_check').length;
  if (integrity !== 'ok' || foreignKeyViolations !== 0) fail('sqlite_integrity');

  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const tableNames = tables.map(({ name }) => String(name));
  if (tableNames.some((name) => !ALLOWED_TABLES.has(name))) fail('schema_contract');

  const structure = [];
  const columnsByTable = new Map();
  for (const name of tableNames) {
    if (!/^[a-z0-9_]+$/i.test(name)) fail('schema_contract');
    const columns = db.pragma(`table_info('${name}')`);
    if (!Array.isArray(columns) || columns.length === 0) fail('schema_contract');
    columnsByTable.set(name, new Set(columns.map((column) => String(column.name))));
    structure.push({
      table: name,
      columns: columns.map((column) => ({
        name: String(column.name),
        type: String(column.type || '').trim().toUpperCase(),
        notNull: Number(column.notnull) === 1,
        primaryKeyPosition: Number(column.pk) || 0
      }))
    });
  }
  for (const [name, requiredColumns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
    const actualColumns = columnsByTable.get(name);
    if (!actualColumns || requiredColumns.some((column) => !actualColumns.has(column))) {
      fail('schema_contract');
    }
  }

  const counts = {};
  for (const { name } of tables) {
    counts[name] = Number(db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get().count);
  }

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(backupPath)).digest('hex');
  const schemaSha256 = crypto.createHash('sha256')
    .update(Buffer.from(`${JSON.stringify(structure)}\n`, 'utf8'))
    .digest('hex');
  process.stdout.write(`${JSON.stringify({
    ok: true,
    bytes: stat.size,
    sha256,
    schemaContract: SCHEMA_CONTRACT_VERSION,
    schemaSha256,
    tableCounts: counts,
    personalDataPrinted: false
  })}\n`);
} catch (error) {
  fail(error.code || 'sqlite_open');
} finally {
  if (db) db.close();
}
