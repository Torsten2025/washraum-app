'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { createRemainingSlotService } = require('../src/services/remaining-slots');

const TODAY = '2026-08-11';
const SLOTS = ['07:00-12:00', '12:00-17:00', '17:00-21:00'];

function createDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE houses (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE apartments (
      id INTEGER PRIMARY KEY, house_id INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY, apartment_id INTEGER, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
      house_id INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, resource_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL, slot TEXT NOT NULL, group_id TEXT,
      booking_kind TEXT NOT NULL DEFAULT 'standard', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (resource_id, booking_date, slot)
    );
    CREATE TABLE fixed_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, resource_id INTEGER NOT NULL, weekday INTEGER NOT NULL,
      slot TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, apartment_id INTEGER
    );
    CREATE TABLE booking_day_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT, apartment_id INTEGER NOT NULL, house_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL, slot TEXT NOT NULL, source_kind TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (apartment_id, house_id, booking_date, slot)
    );
    CREATE TABLE remaining_slot_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, apartment_id INTEGER NOT NULL, house_id INTEGER NOT NULL,
      idempotency_key_hash TEXT NOT NULL, payload_hash TEXT NOT NULL, state TEXT NOT NULL,
      group_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (apartment_id, idempotency_key_hash)
    );
  `);
  db.exec(`
    INSERT INTO houses (id, name) VALUES (1, 'Haus A'), (2, 'Haus B');
    INSERT INTO apartments (id, house_id) VALUES (11, 1), (12, 1), (21, 2);
    INSERT INTO users (id, apartment_id) VALUES (101, 11), (102, 11), (201, 12), (301, 21);
    INSERT INTO resources (id, name, type, house_id) VALUES
      (1001, 'Washer A1', 'washer', 1),
      (1002, 'Washer A2', 'washer', 1),
      (1101, 'Drying A', 'drying_room', 1),
      (1201, 'Tumbler A1', 'tumbler', 1),
      (1202, 'Tumbler A2', 'tumbler', 1),
      (2001, 'Washer B1', 'washer', 2),
      (2201, 'Tumbler B1', 'tumbler', 2),
      (2202, 'Tumbler B2', 'tumbler', 2);
  `);
  return db;
}

function fixture(db) {
  let startedSlots = new Set();
  let weekday = 2;
  const fixedBookingConflict = (resourceId, date, slot, houseId) => db.prepare(`
    SELECT fb.id FROM fixed_bookings fb JOIN resources r ON r.id = fb.resource_id
    WHERE fb.resource_id = ? AND fb.weekday = 2 AND fb.slot = ? AND fb.active = 1 AND r.house_id = ?
  `).get(Number(resourceId), slot, Number(houseId));
  const validateTumblerBooking = (date, slot, houseId) => {
    const total = db.prepare(`SELECT COUNT(*) AS count FROM resources WHERE type = 'tumbler' AND active = 1 AND house_id = ?`)
      .get(Number(houseId)).count;
    const occupied = db.prepare(`
      SELECT COUNT(*) AS count FROM bookings b JOIN resources r ON r.id = b.resource_id
      WHERE r.type = 'tumbler' AND r.house_id = ? AND b.booking_date = ? AND b.slot = ?
    `).get(Number(houseId), date, slot).count;
    const fixed = db.prepare(`
      SELECT COUNT(*) AS count FROM fixed_bookings fb JOIN resources r ON r.id = fb.resource_id
      WHERE r.type = 'tumbler' AND r.house_id = ? AND fb.weekday = 2 AND fb.slot = ? AND fb.active = 1
    `).get(Number(houseId), slot).count;
    return occupied + fixed >= Math.max(0, total - 1) ? 'TUMBLER_RESERVE' : '';
  };
  const service = createRemainingSlotService({
    db,
    crypto,
    slots: SLOTS,
    todayStringLocal: () => TODAY,
    isSwissSlotStarted: (date, slot) => date !== TODAY || startedSlots.has(slot),
    weekdayForDate: () => weekday,
    fixedBookingConflict,
    validateTumblerBooking
  });
  return {
    service,
    setStarted(slot) { startedSlots = new Set([...startedSlots, slot]); },
    setWeekday(value) { weekday = Number(value); }
  };
}

function request(overrides = {}) {
  return {
    apartmentId: 11,
    bookingUserId: 101,
    houseId: 1,
    idempotencyKey: 'remaining-slot-request-0001',
    slot: '12:00-17:00',
    washerId: 1001,
    tumblerId: null,
    selfDryingConfirmed: true,
    ...overrides
  };
}

function main() {
  const db = createDatabase();
  const { service, setStarted } = fixture(db);
  try {
    const initial = service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 });
    assert.equal(initial.eligible, true);
    assert.equal(initial.date, TODAY);
    assert.equal(initial.slots.length, 3, 'Auch vollstaendig freie heutige Slots muessen angeboten werden');
    assert.ok(initial.slots.every((slot) => !Object.hasOwn(slot, 'dryingRooms')));
    assert.ok(initial.slots.every((slot) => slot.washers.every((washer) => !Object.hasOwn(washer, 'houseId'))));

    assert.throws(() => service.create(request({ selfDryingConfirmed: false })), {
      code: 'SELF_DRYING_CONFIRMATION_REQUIRED'
    });
    assert.throws(() => service.create(request({ tumblerId: 1101, selfDryingConfirmed: false })), {
      code: 'TUMBLER_UNAVAILABLE'
    });
    assert.throws(() => service.create(request({ washerId: 2001 })), { code: 'WASHER_UNAVAILABLE' });

    const first = service.create(request({ tumblerId: 1201, selfDryingConfirmed: false }));
    assert.equal(first.idempotent, false);
    assert.deepEqual(first.bookings.map((booking) => booking.resourceType), ['washer', 'tumbler']);
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bookings WHERE booking_kind = 'remaining_slot'`).get().count, 2);
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE r.type = 'drying_room'`).get().count, 0);

    const repeated = service.create(request({ tumblerId: 1201, selfDryingConfirmed: false }));
    assert.equal(repeated.idempotent, true);
    assert.equal(repeated.bookings.length, 2);
    assert.throws(() => service.create(request({
      tumblerId: 1201,
      selfDryingConfirmed: true
    })), { code: 'IDEMPOTENCY_CONFLICT' },
    'Die Selbsttrocknungsentscheidung muss Teil des Idempotenzvergleichs sein');
    assert.throws(() => service.create(request({
      tumblerId: 1202,
      selfDryingConfirmed: false
    })), { code: 'IDEMPOTENCY_CONFLICT' });
    assert.throws(() => service.create(request({
      idempotencyKey: 'remaining-slot-request-0002',
      washerId: 1002
    })), { code: 'TODAY_WASH_SLOT_EXISTS' });
    assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).eligible, false);
    assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).code, 'TODAY_WASH_SLOT_EXISTS');
    assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).slots.length, 0);
    assert.throws(() => service.options({ apartmentId: 11, bookingUserId: 101, houseId: 2 }), {
      code: 'REMAINING_SLOT_PARTY_UNAVAILABLE'
    });
    assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).code, 'TODAY_WASH_SLOT_EXISTS',
      'Zweites Konto derselben Wohnung muss dieselbe Buchungspartei verwenden');
  } catch (error) {
    throw error;
  }

  const firstGroup = db.prepare(`SELECT group_id FROM bookings WHERE booking_kind = 'remaining_slot' LIMIT 1`).get().group_id;
  assert.throws(() => service.removeTumbler({
    groupId: firstGroup, bookingUserId: 101, houseId: 1, selfDryingConfirmed: false
  }), { code: 'SELF_DRYING_CONFIRMATION_REQUIRED' });
  const removed = service.removeTumbler({
    groupId: firstGroup, bookingUserId: 101, houseId: 1, selfDryingConfirmed: true
  });
  assert.equal(removed.bookings.length, 1);
  assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM remaining_slot_requests WHERE state = 'modified'`).get().count, 1);
  const cancelled = service.cancel({ groupId: firstGroup, bookingUserId: 101, houseId: 1 });
  assert.equal(cancelled.deleted, 1);
  assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bookings WHERE group_id = ?`).get(firstGroup).count, 0);
  assert.throws(() => service.create(request({ tumblerId: 1201, selfDryingConfirmed: false })), {
    code: 'REMAINING_SLOT_REQUEST_FINAL'
  });

  db.prepare(`
    INSERT INTO bookings (user_id, resource_id, booking_date, slot, booking_kind)
    VALUES (101, 1001, '2026-08-12', '12:00-17:00', 'standard')
  `).run();
  assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).eligible, true,
    'Kuenftige Normalbuchung darf heutigen Restplatz nicht blockieren');

  const second = service.create(request({
    idempotencyKey: 'remaining-slot-request-0003',
    slot: '17:00-21:00',
    washerId: 1002
  }));
  const secondGroup = second.bookings[0].groupId;
  setStarted('17:00-21:00');
  assert.throws(() => service.cancel({ groupId: secondGroup, bookingUserId: 101, houseId: 1 }), {
    code: 'REMAINING_SLOT_STARTED'
  });
  const startedWasher = db.prepare(`
    SELECT b.*, r.type AS resource_type, r.house_id
    FROM bookings b JOIN resources r ON r.id = b.resource_id
    WHERE b.group_id = ? AND r.type = 'washer'
  `).get(secondGroup);
  assert.equal(service.recordCountedUsage(startedWasher), true);
  db.prepare('DELETE FROM bookings WHERE group_id = ?').run(secondGroup);
  assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).code, 'TODAY_WASH_SLOT_EXISTS');

  db.prepare('DELETE FROM booking_day_usage').run();
  db.prepare(`INSERT INTO fixed_bookings (resource_id, weekday, slot, apartment_id) VALUES (1001, 2, '07:00-12:00', 11)`).run();
  assert.equal(service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 }).code, 'TODAY_WASH_SLOT_EXISTS');
  assert.equal(service.options({ apartmentId: 12, bookingUserId: 201, houseId: 1 }).eligible, true,
    'Nicht zurechenbarer Dauertermin darf keine andere Wohnung blockieren');

  db.prepare('DELETE FROM fixed_bookings').run();
  db.prepare('UPDATE apartments SET active = 0 WHERE id = 12').run();
  assert.throws(() => service.options({ apartmentId: 12, bookingUserId: 201, houseId: 1 }), {
    code: 'REMAINING_SLOT_PARTY_UNAVAILABLE'
  });
  db.prepare('UPDATE apartments SET active = 1 WHERE id = 12').run();
  db.prepare(`INSERT INTO bookings (user_id, resource_id, booking_date, slot) VALUES (201, 1201, ?, '12:00-17:00')`).run(TODAY);
  assert.throws(() => service.create(request({
    apartmentId: 12,
    bookingUserId: 201,
    idempotencyKey: 'remaining-slot-request-0004',
    slot: '12:00-17:00',
    washerId: 1001,
    tumblerId: 1202,
    selfDryingConfirmed: false
  })), { code: 'TUMBLER_RESERVE' });

  assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM remaining_slot_requests WHERE state = 'pending'`).get().count, 0);
  db.close();

  const sundayDb = createDatabase();
  const sundayFixture = fixture(sundayDb);
  sundayFixture.setWeekday(0);
  const sundayOptions = sundayFixture.service.options({ apartmentId: 11, bookingUserId: 101, houseId: 1 });
  assert.deepEqual(sundayOptions, {
    date: TODAY,
    eligible: false,
    code: 'SUNDAY_CLOSED',
    slots: []
  });
  assert.throws(() => sundayFixture.service.create(request()), { code: 'SUNDAY_CLOSED' });
  assert.equal(sundayDb.prepare('SELECT COUNT(*) AS count FROM bookings').get().count, 0);
  assert.equal(sundayDb.prepare('SELECT COUNT(*) AS count FROM remaining_slot_requests').get().count, 0);
  sundayDb.close();

  const projectRoot = path.resolve(__dirname, '..');
  const bookingRulesSource = fs.readFileSync(path.join(projectRoot, 'src', 'services', 'booking-rules.js'), 'utf8');
  const bookingRoutesSource = fs.readFileSync(path.join(projectRoot, 'src', 'routes', 'bookings.js'), 'utf8');
  assert.match(bookingRulesSource,
    /function validateWasherBooking[\s\S]*SELECT b\.booking_date, b\.slot, b\.booking_kind[\s\S]*booking\.booking_kind === 'remaining_slot'/,
    'Der zentrale direkte/alternative Waschmaschinenweg muss booking_kind projizieren und Restplaetze sperren');
  assert.match(bookingRoutesSource,
    /washerBookingId[\s\S]*SELECT b\.id, b\.user_id, b\.booking_date, b\.slot, b\.group_id, b\.booking_kind[\s\S]*existingWasher\.booking_kind === 'remaining_slot'/,
    'Der Paket-Erweiterungsweg muss booking_kind projizieren und Restplaetze sperren');
  assert.match(bookingRoutesSource,
    /partyHasRemainingSlot\(req\.session\.user\.bookingUserId, houseId, date\)/,
    'Der direkte Buchungsweg muss eine vorhandene Restplatzgruppe sperren');
  console.log('Restplatz-Service: Zeit, Partei, Haus, Atomaritaet, Idempotenz und Aenderungsgrenzen PASS.');
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error?.code || error?.message || 'REMAINING_SLOT_TEST_FAILED');
  process.exitCode = 1;
}
