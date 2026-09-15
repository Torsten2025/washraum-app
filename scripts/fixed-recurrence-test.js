'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');
const r = require('../src/services/fixed-recurrence');
const { isSwissSlotStarted, swissDateString } = require('../swiss-time');

function runFixedRecurrenceTests() {
  let checks = 0;
  const today = '2026-01-01';
  const normalize = input => r.normalizeRecurrence(input, { weekday: 1, slot: '07:00-12:00', today, isSlotStarted: () => false });
  const make = (startDate, intervalWeeks = 2, count = null, weekday = 1, offset = 0) => ({ weekday,
    ...r.recurrenceColumns({ startDate, intervalWeeks, count }, offset) });
  const base = { startDate: '2026-01-01', intervalWeeks: 2, endType: 'count', count: 3 };
  assert.equal(normalize(base).firstOccurrenceDate, '2026-01-05'); checks++;
  for (const bad of [{ ...base, intervalWeeks: 0 }, { ...base, intervalWeeks: 53 }, { ...base, intervalWeeks: 1.5 },
    { ...base, count: 0 }, { ...base, count: 1001 }, { ...base, count: '3' }, { ...base, startDate: '2026-02-30' },
    { ...base, startDate: '2025-12-31' }, { ...base, endDate: '2026-03-01' }, { ...base, extra: true },
    { ...base, endType: 'date', count: null, endDate: '2026-01-04' }]) {
    assert.throws(() => normalize(bad), /RECURRENCE_INVALID/); checks++;
  }
  assert.throws(() => r.normalizeRecurrence({ ...base, startDate: '2026-01-05' },
    { weekday: 1, today: '2026-01-05', slot: '07:00-12:00', isSlotStarted: () => true }), /RECURRENCE_INVALID/); checks++;
  for (const [date, offset] of [['2026-10-05', '+02:00'], ['2026-03-30', '+02:00'], ['2026-10-26', '+01:00'], ['2027-01-04', '+01:00']]) {
    for (const [time, begun] of [['06:59:59', false], ['07:00:00', true], ['07:00:01', true], ['11:59:59', true], ['12:00:00', true]]) {
      const now = new Date(`${date}T${time}${offset}`);
      const options = { weekday: 1, slot: '07:00-12:00', today: swissDateString(now),
        isSlotStarted: (day, slot) => isSwissSlotStarted(day, slot, now) };
      const input = { ...base, startDate: date };
      if (begun) assert.throws(() => r.normalizeRecurrence(input, options), /RECURRENCE_INVALID/);
      else assert.equal(r.normalizeRecurrence(input, options).firstOccurrenceDate, date);
      assert.equal(r.normalizeRecurrence(input, { ...options, weekday: 2 }).firstOccurrenceDate, r.dateString(r.dayNumber(date) + 1));
      assert.equal(r.normalizeRecurrence(undefined, options), null, 'Legacy skips new dated-start validation');
      checks += 3;
    }
  }
  const year = make('2026-12-28', 2, 3);
  for (const date of ['2026-12-28', '2027-01-11', '2027-01-25']) { assert(r.occursOn(year, date)); checks++; }
  for (const date of ['2026-12-21', '2027-01-04', '2027-02-08']) { assert(!r.occursOn(year, date)); checks++; }
  for (const start of ['2026-03-23', '2026-10-19', '2028-02-28']) {
    assert(r.occursOn(make(start, 1, 2), r.dateString(r.dayNumber(start) + 7))); checks++;
  }
  const wash = { ...make('2026-01-02', 2, null, 5), series_end_date: '2026-01-02' };
  const drying = { ...wash, weekday: 6, occurrence_day_offset: 1 };
  assert(r.occursOn(drying, '2026-01-03')); assert(!r.occursOn(drying, '2026-01-17')); checks += 2;
  assert.equal(r.feedRecurrence(drying).rule, 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=1'); checks++;
  assert.equal(r.feedRecurrence(drying).date, '2026-01-03'); checks++;
  assert(!r.overlap(make('2026-01-05'), make('2026-01-12'), today)); checks++;
  assert(r.overlap(make('2026-01-05', 2), make('2026-01-12', 3), today)); checks++;
  // Exact CRT against independently enumerated finite synthetic occurrences.
  for (let n = 1; n <= 52; n++) {
    for (let m = 1; m <= 52; m++) {
      const a = make('2026-01-05', n, 7), b = make('2026-01-12', m, 8);
      const expected = Array.from({ length: 7 }, (_, k) => r.dateString(r.dayNumber('2026-01-05') + k * n * 7)).some(date => r.occursOn(b, date));
      assert.equal(Boolean(r.overlap(a, b, today)), expected); checks++;
    }
  }
  const late = r.overlap(make('2026-01-05', 51), make('2026-01-12', 52), today);
  assert(late && late.lo > BigInt(r.dayNumber(today) + 3650)); checks++;
  let huge = r.sequence(make('2026-01-05', 1));
  for (const n of [2, 3, 5, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]) huge = r.intersect(huge, r.sequence(make('2026-01-05', n)));
  assert(huge.p > BigInt(Number.MAX_SAFE_INTEGER)); checks++;
  const candidate = make('2026-01-05', 1, 16);
  const a = { ...make('2026-01-05', 2, 8), resource_id: 1 };
  const b = { ...make('2026-01-12', 3, 5), resource_id: 2 };
  const c = { ...make('2026-01-19', 5, 3), resource_id: 3 };
  assert(r.overlap(a, b, today) && r.overlap(a, c, today) && r.overlap(b, c, today));
  assert(!r.capacityConflict(candidate, [a, b, c], 3, today));
  assert(r.capacityConflict(candidate, [a, b, c], 2, today)); checks += 3;
  const begun = performance.now();
  const many = Array.from({ length: 200 }, (_, i) => ({ ...make('2026-01-05', (i % 52) + 1), resource_id: i % 8 }));
  assert(r.capacityConflict(candidate, many, 7, today));
  assert(!r.capacityConflict(candidate, Array.from({ length: 300 }, (_, i) => [a, b, c][i % 3]), 3, today));
  assert(performance.now() - begun < 1500); checks += 2;

  // Actual migration source, isolated databases only; never import server.js.
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const ddl = source.match(/CREATE TABLE IF NOT EXISTS fixed_bookings \([\s\S]*?\n    \);/)[0];
  const migration = source.slice(source.indexOf('function migrateFixedBookingSundaySupport()'), source.indexOf('\nfunction ensureColumn('));
  for (const profile of ['weekly', 'sunday', 'new-sunday', 'current', 'rollback', 'foreign-key']) {
    const db = new Database(':memory:');
    try {
      db.pragma('foreign_keys = ON');
      db.exec('CREATE TABLE resources(id INTEGER PRIMARY KEY); CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO resources VALUES(1)');
      let table = ddl;
      if (['weekly', 'sunday', 'rollback', 'foreign-key'].includes(profile)) table = table
        .replace(/      interval_weeks[\s\S]*?      FOREIGN KEY/, '      FOREIGN KEY')
        .replace(/CHECK \(series_end_date IS NULL OR occurrence_count IS NULL\)/, 'UNIQUE (resource_id, weekday, slot)');
      if (['sunday', 'new-sunday'].includes(profile)) table = table.replace('weekday BETWEEN 0 AND 6', 'weekday BETWEEN 1 AND 6');
      db.exec(table);
      db.prepare("INSERT INTO fixed_bookings(id,resource_id,weekday,slot,label,group_id,active) VALUES(77,1,1,'07:00-12:00','Synthetic','stable-group',0)").run();
      db.exec("INSERT INTO fixed_bookings(id,resource_id,weekday,slot,label) VALUES(99,1,2,'07:00-12:00','Deleted synthetic'); DELETE FROM fixed_bookings WHERE id=99");
      if (profile === 'new-sunday') db.exec("UPDATE fixed_bookings SET series_start_date='2026-01-05', interval_weeks=3, occurrence_count=7");
      const before = db.prepare('SELECT * FROM fixed_bookings').get();
      const ensureColumn = (name, column, definition) => {
        if (!db.pragma(`table_info(${name})`).some(item => item.name === column)) db.exec(`ALTER TABLE ${name} ADD COLUMN ${column} ${definition}`);
      };
      vm.runInNewContext(migration, { db, ensureColumn });
      const context = vm.createContext({ db, ensureColumn });
      vm.runInContext(migration, context);
      if (profile === 'foreign-key') {
        db.pragma('foreign_keys = OFF');
        db.exec('UPDATE fixed_bookings SET resource_id=999');
        db.pragma('foreign_keys = ON');
        const damaged = db.prepare('SELECT * FROM fixed_bookings').get();
        assert.throws(() => vm.runInContext('migrateFixedBookingSundaySupport()', context), /FIXED_MIGRATION_FOREIGN_KEY/);
        assert.deepEqual(db.prepare('SELECT * FROM fixed_bookings').get(), damaged);
        assert.equal(db.pragma('foreign_keys', { simple: true }), 1); checks += 3;
        continue;
      }
      if (profile === 'rollback') {
        const realExec = db.exec.bind(db);
        db.exec = sql => { if (sql.includes('ALTER TABLE fixed_bookings_recurrence RENAME')) throw new Error('SYNTHETIC_MIGRATION_STOP'); return realExec(sql); };
        assert.throws(() => vm.runInContext('migrateFixedBookingSundaySupport()', context), /SYNTHETIC_MIGRATION_STOP/);
        db.exec = realExec;
        assert.deepEqual(db.prepare('SELECT * FROM fixed_bookings').get(), before);
        assert.equal(db.pragma('foreign_keys', { simple: true }), 1); checks += 3;
      }
      vm.runInContext('migrateFixedBookingSundaySupport()', context);
      const after = db.prepare('SELECT * FROM fixed_bookings').get();
      for (const key of Object.keys(before)) assert.equal(after[key], before[key]);
      vm.runInContext('migrateFixedBookingSundaySupport()', context);
      assert.deepEqual(db.prepare('SELECT * FROM fixed_bookings').get(), after);
      assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
      assert.deepEqual(db.pragma('foreign_key_check'), []);
      assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
      assert.equal(db.prepare("INSERT INTO fixed_bookings(resource_id,weekday,slot,label) VALUES(1,1,'07:00-12:00','Replacement')").run().lastInsertRowid, 100);
      checks += 6;
    } finally { db.close(); }
  }
  const legacyDb = new Database(':memory:');
  try {
    legacyDb.exec('CREATE TABLE resources(id INTEGER PRIMARY KEY); CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO resources VALUES(1)');
    legacyDb.exec(ddl);
    const legacySource = source.slice(source.indexOf('function migrateLegacyFixedBookings('), source.indexOf('\nfunction migrateLegacyDatabase('));
    const context = vm.createContext({ db: legacyDb, findMigratedResource: () => ({ id: 1 }), findMigratedUser: () => null,
      legacySlot: row => row.slot, input: [{ id: 7, weekday: 3, slot: '07:00-12:00', label: 'Legacy', active: 0, created_at: '2020-01-01' }] });
    vm.runInContext(legacySource, context);
    assert.equal(vm.runInContext('migrateLegacyFixedBookings(input)', context), 1);
    const legacy = legacyDb.prepare('SELECT * FROM fixed_bookings').get();
    assert.equal(legacy.id, 7); assert.equal(legacy.active, 0); assert.equal(legacy.created_at, '2020-01-01');
    assert.equal(legacy.interval_weeks, 1); assert.equal(legacy.series_start_date, null); checks += 6;
    const detect = source.slice(source.indexOf('function readLegacyDatabase()'), source.indexOf('\nfunction migrateLegacyUsers('));
    assert.equal(vm.runInNewContext(detect + '\nreadLegacyDatabase()', { tableColumns: () => ['username', 'user_name'], db: null }), null); checks++;
  } finally { legacyDb.close(); }
  // Two independent SQLite connections/processes. Only this newly-created test file.
  const raceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-series-lock-'));
  const racePath = path.join(raceDirectory, 'synthetic.sqlite');
  const raceDb = new Database(racePath);
  try {
    raceDb.exec('CREATE TABLE resources(id INTEGER PRIMARY KEY); CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO resources VALUES(1)');
    raceDb.exec(ddl);
    const child = `
      const Database=require(process.argv[1]),r=require(process.argv[2]);
      const db=new Database(process.argv[3],{timeout:75});
      try { db.transaction(()=>{
        const rows=db.prepare('SELECT * FROM fixed_bookings WHERE active=1').all();
        if(rows.some(row=>r.occursOn(row,'2026-01-05'))) throw new Error('SERIES_CONFLICT');
        db.prepare("INSERT INTO fixed_bookings(resource_id,weekday,slot,label) VALUES(1,1,'07:00-12:00','Second')").run();
      }).immediate(); console.log('WRITTEN'); }
      catch(e){console.log(e.code==='SQLITE_BUSY'?'LOCKED':e.message==='SERIES_CONFLICT'?'CONFLICT':'UNEXPECTED');}
      finally{db.close();}`;
    const probe = () => spawnSync(process.execPath, ['-e', child, require.resolve('better-sqlite3'), require.resolve('../src/services/fixed-recurrence'), racePath], { encoding: 'utf8', timeout: 5000 });
    raceDb.exec('BEGIN IMMEDIATE');
    raceDb.prepare("INSERT INTO fixed_bookings(resource_id,weekday,slot,label,series_start_date,interval_weeks) VALUES(1,1,'07:00-12:00','First','2026-01-05',2)").run();
    const locked = probe(); assert.equal(locked.status, 0); assert.equal(locked.stdout.trim(), 'LOCKED');
    raceDb.exec('COMMIT');
    const committed = probe(); assert.equal(committed.status, 0); assert.equal(committed.stdout.trim(), 'CONFLICT');
    assert.equal(raceDb.prepare('SELECT COUNT(*) AS n FROM fixed_bookings').get().n, 1); checks += 5;
  } finally {
    if (raceDb.inTransaction) raceDb.exec('ROLLBACK');
    raceDb.close();
    fs.rmSync(raceDirectory, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, suite: 'fixed-recurrence', checks, database: 'synthetic-memory-and-fresh-temp', externalCalls: 0 }));
}
module.exports = { runFixedRecurrenceTests };
if (require.main === module) runFixedRecurrenceTests();
