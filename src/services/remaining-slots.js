'use strict';

function createRemainingSlotService({
  db,
  crypto,
  slots,
  todayStringLocal,
  isSwissSlotStarted,
  weekdayForDate,
  fixedBookingConflict,
  validateTumblerBooking
}) {
  function domainError(status, code, message) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
  }

  function bookingApartmentId(userId) {
    return Number(db.prepare('SELECT apartment_id FROM users WHERE id = ? AND active = 1')
      .get(Number(userId))?.apartment_id || 0);
  }

  function assertParty(apartmentId, houseId) {
    const party = db.prepare(`
      SELECT id FROM apartments WHERE id = ? AND house_id = ? AND active = 1
    `).get(Number(apartmentId), Number(houseId));
    if (!party) {
      throw domainError(403, 'REMAINING_SLOT_PARTY_UNAVAILABLE', 'Restplaetze sind nur fuer eine aktive Wohnung im aktuellen Haus verfuegbar.');
    }
  }

  function partyHasTodayWasher(apartmentId, bookingUserId, houseId, date) {
    const activeBooking = db.prepare(`
      SELECT 1
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ? AND r.house_id = ? AND r.type = 'washer' AND b.booking_date = ?
      LIMIT 1
    `).get(Number(bookingUserId), Number(houseId), date);
    if (activeBooking) return true;

    const retainedUsage = db.prepare(`
      SELECT 1 FROM booking_day_usage
      WHERE apartment_id = ? AND house_id = ? AND booking_date = ?
      LIMIT 1
    `).get(Number(apartmentId), Number(houseId), date);
    if (retainedUsage) return true;

    return Boolean(db.prepare(`
      SELECT 1
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1 AND fb.apartment_id = ? AND r.house_id = ? AND r.type = 'washer'
        AND fb.weekday = ?
      LIMIT 1
    `).get(Number(apartmentId), Number(houseId), weekdayForDate(date)));
  }

  function partyHasRemainingSlot(bookingUserId, houseId, date) {
    return Boolean(db.prepare(`
      SELECT 1
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ? AND r.house_id = ? AND b.booking_date = ?
        AND b.booking_kind = 'remaining_slot'
      LIMIT 1
    `).get(Number(bookingUserId), Number(houseId), date));
  }

  function freeResources(type, date, slot, houseId) {
    return db.prepare(`
      SELECT r.id, r.name
      FROM resources r
      WHERE r.active = 1 AND r.house_id = ? AND r.type = ?
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.resource_id = r.id AND b.booking_date = ? AND b.slot = ?
        )
        AND NOT EXISTS (
          SELECT 1 FROM fixed_bookings fb
          WHERE fb.resource_id = r.id AND fb.active = 1 AND fb.weekday = ? AND fb.slot = ?
        )
      ORDER BY r.name, r.id
    `).all(Number(houseId), type, date, slot, weekdayForDate(date), slot);
  }

  function tumblerOptions(date, slot, houseId) {
    if (validateTumblerBooking(date, slot, houseId)) return [];
    return freeResources('tumbler', date, slot, houseId);
  }

  function options({ apartmentId, bookingUserId, houseId }) {
    const date = todayStringLocal();
    assertParty(apartmentId, houseId);
    if (weekdayForDate(date) === 0) {
      return { date, eligible: false, code: 'SUNDAY_CLOSED', slots: [] };
    }
    if (partyHasTodayWasher(apartmentId, bookingUserId, houseId, date)) {
      return { date, eligible: false, code: 'TODAY_WASH_SLOT_EXISTS', slots: [] };
    }

    const availableSlots = slots.flatMap((slot) => {
      if (isSwissSlotStarted(date, slot)) return [];
      const washers = freeResources('washer', date, slot, houseId);
      if (!washers.length) return [];
      return [{ slot, washers, tumblers: tumblerOptions(date, slot, houseId) }];
    });
    return {
      date,
      eligible: availableSlots.length > 0,
      code: availableSlots.length ? 'READY' : 'NO_REMAINING_SLOTS',
      slots: availableSlots
    };
  }

  function normalizedRequest({ apartmentId, houseId, slot, washerId, tumblerId, selfDryingConfirmed }) {
    return JSON.stringify({
      apartmentId: Number(apartmentId),
      houseId: Number(houseId),
      date: todayStringLocal(),
      slot: String(slot),
      washerId: Number(washerId),
      tumblerId: tumblerId == null ? null : Number(tumblerId),
      selfDryingConfirmed: selfDryingConfirmed === true
    });
  }

  function keyHash(idempotencyKey) {
    const key = String(idempotencyKey || '').trim();
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) {
      throw domainError(400, 'IDEMPOTENCY_KEY_INVALID', 'Die Buchungsanfrage braucht einen gueltigen Wiederholungsschluessel.');
    }
    return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
  }

  function groupProjection(groupId, bookingUserId, houseId) {
    return db.prepare(`
      SELECT b.id, b.group_id AS groupId, b.booking_date AS date, b.slot,
             r.id AS resourceId, r.name AS resourceName, r.type AS resourceType
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.group_id = ? AND b.user_id = ? AND r.house_id = ? AND b.booking_kind = 'remaining_slot'
      ORDER BY CASE r.type WHEN 'washer' THEN 0 ELSE 1 END, r.name
    `).all(groupId, Number(bookingUserId), Number(houseId));
  }

  function validateSelection({ apartmentId, bookingUserId, houseId, slot, washerId, tumblerId, selfDryingConfirmed }) {
    const date = todayStringLocal();
    assertParty(apartmentId, houseId);
    if (weekdayForDate(date) === 0) {
      throw domainError(409, 'SUNDAY_CLOSED', 'Sonntags sind auch Restplatzbuchungen geschlossen.');
    }
    if (!slots.includes(slot) || isSwissSlotStarted(date, slot)) {
      throw domainError(409, 'REMAINING_SLOT_STARTED', 'Dieser Restplatz kann nicht mehr abgeschlossen werden.');
    }
    if (partyHasTodayWasher(apartmentId, bookingUserId, houseId, date)) {
      throw domainError(409, 'TODAY_WASH_SLOT_EXISTS', 'Deine Wohnung hat heute bereits einen Waschslot.');
    }
    if (!Number.isInteger(Number(washerId))) {
      throw domainError(400, 'WASHER_REQUIRED', 'Bitte genau eine Waschmaschine waehlen.');
    }
    const washer = db.prepare(`
      SELECT id, name FROM resources WHERE id = ? AND house_id = ? AND active = 1 AND type = 'washer'
    `).get(Number(washerId), Number(houseId));
    if (!washer) throw domainError(404, 'WASHER_UNAVAILABLE', 'Die Waschmaschine ist nicht verfuegbar.');
    if (fixedBookingConflict(washer.id, date, slot, houseId)) {
      throw domainError(409, 'WASHER_CONFLICT', 'Die Waschmaschine ist in diesem Slot fest reserviert.');
    }
    if (db.prepare('SELECT 1 FROM bookings WHERE resource_id = ? AND booking_date = ? AND slot = ?').get(washer.id, date, slot)) {
      throw domainError(409, 'WASHER_CONFLICT', 'Die Waschmaschine wurde inzwischen gebucht.');
    }

    let tumbler = null;
    if (tumblerId != null) {
      if (!Number.isInteger(Number(tumblerId)) || Number(tumblerId) === Number(washerId)) {
        throw domainError(400, 'TUMBLER_INVALID', 'Bitte hoechstens einen gueltigen Tumbler waehlen.');
      }
      tumbler = db.prepare(`
        SELECT id, name FROM resources WHERE id = ? AND house_id = ? AND active = 1 AND type = 'tumbler'
      `).get(Number(tumblerId), Number(houseId));
      if (!tumbler) throw domainError(404, 'TUMBLER_UNAVAILABLE', 'Der Tumbler ist nicht verfuegbar.');
      if (fixedBookingConflict(tumbler.id, date, slot, houseId)
          || db.prepare('SELECT 1 FROM bookings WHERE resource_id = ? AND booking_date = ? AND slot = ?')
            .get(tumbler.id, date, slot)) {
        throw domainError(409, 'TUMBLER_CONFLICT', 'Der Tumbler wurde inzwischen gebucht.');
      }
      const reserveError = validateTumblerBooking(date, slot, houseId);
      if (reserveError) throw domainError(409, 'TUMBLER_RESERVE', reserveError);
      if (selfDryingConfirmed === true) {
        throw domainError(400, 'DRYING_CHOICE_INVALID', 'Selbsttrocknung und Tumbler duerfen nicht gleichzeitig gewaehlt werden.');
      }
    } else if (selfDryingConfirmed !== true) {
      throw domainError(400, 'SELF_DRYING_CONFIRMATION_REQUIRED', 'Bitte bestaetigen, dass du die Trocknung selbst organisierst.');
    }
    return { date, washer, tumbler };
  }

  function create({ apartmentId, bookingUserId, houseId, idempotencyKey, slot, washerId, tumblerId = null, selfDryingConfirmed }) {
    const requestHash = keyHash(idempotencyKey);
    const payload = normalizedRequest({
      apartmentId,
      houseId,
      slot,
      washerId,
      tumblerId,
      selfDryingConfirmed
    });
    const payloadHash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');

    return db.transaction(() => {
      const existing = db.prepare(`
        SELECT payload_hash, state, group_id FROM remaining_slot_requests
        WHERE apartment_id = ? AND idempotency_key_hash = ?
      `).get(Number(apartmentId), requestHash);
      if (existing) {
        if (existing.payload_hash !== payloadHash) {
          throw domainError(409, 'IDEMPOTENCY_CONFLICT', 'Der Wiederholungsschluessel wurde mit anderen Angaben verwendet.');
        }
        if (existing.state === 'completed') {
          return { idempotent: true, bookings: groupProjection(existing.group_id, bookingUserId, houseId) };
        }
        throw domainError(409, 'REMAINING_SLOT_REQUEST_FINAL', 'Diese Buchungsanfrage wurde bereits abgeschlossen oder geaendert.');
      }

      const selection = validateSelection({
        apartmentId, bookingUserId, houseId, slot, washerId, tumblerId, selfDryingConfirmed
      });
      const groupId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO remaining_slot_requests
          (apartment_id, house_id, idempotency_key_hash, payload_hash, state, group_id)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(Number(apartmentId), Number(houseId), requestHash, payloadHash, groupId);
      const insert = db.prepare(`
        INSERT INTO bookings (user_id, resource_id, booking_date, slot, group_id, booking_kind)
        VALUES (?, ?, ?, ?, ?, 'remaining_slot')
      `);
      insert.run(Number(bookingUserId), selection.washer.id, selection.date, slot, groupId);
      if (selection.tumbler) {
        insert.run(Number(bookingUserId), selection.tumbler.id, selection.date, slot, groupId);
      }
      db.prepare(`
        UPDATE remaining_slot_requests SET state = 'completed' WHERE apartment_id = ? AND idempotency_key_hash = ?
      `).run(Number(apartmentId), requestHash);
      return { idempotent: false, bookings: groupProjection(groupId, bookingUserId, houseId) };
    })();
  }

  function ownedGroup(groupId, bookingUserId, houseId) {
    const rows = groupProjection(String(groupId || ''), bookingUserId, houseId);
    if (!rows.length) throw domainError(404, 'REMAINING_SLOT_NOT_FOUND', 'Restplatz nicht gefunden.');
    return rows;
  }

  function cancel({ groupId, bookingUserId, houseId }) {
    return db.transaction(() => {
      const rows = ownedGroup(groupId, bookingUserId, houseId);
      if (rows.some((row) => isSwissSlotStarted(row.date, row.slot))) {
        throw domainError(409, 'REMAINING_SLOT_STARTED', 'Das Restplatzpaket kann nur vor Slotbeginn storniert werden.');
      }
      db.prepare(`DELETE FROM bookings WHERE group_id = ? AND user_id = ? AND booking_kind = 'remaining_slot'`)
        .run(groupId, Number(bookingUserId));
      db.prepare(`UPDATE remaining_slot_requests SET state = 'cancelled' WHERE group_id = ?`).run(groupId);
      return { deleted: rows.length };
    })();
  }

  function removeTumbler({ groupId, bookingUserId, houseId, selfDryingConfirmed }) {
    if (selfDryingConfirmed !== true) {
      throw domainError(400, 'SELF_DRYING_CONFIRMATION_REQUIRED', 'Bitte bestaetigen, dass du die Trocknung selbst organisierst.');
    }
    return db.transaction(() => {
      const rows = ownedGroup(groupId, bookingUserId, houseId);
      if (rows.some((row) => isSwissSlotStarted(row.date, row.slot))) {
        throw domainError(409, 'REMAINING_SLOT_STARTED', 'Der Tumbler kann nur vor Slotbeginn entfernt werden.');
      }
      const tumbler = rows.find((row) => row.resourceType === 'tumbler');
      if (!tumbler) throw domainError(409, 'TUMBLER_NOT_BOOKED', 'Dieses Restplatzpaket enthaelt keinen Tumbler.');
      db.prepare('DELETE FROM bookings WHERE id = ?').run(tumbler.id);
      db.prepare(`UPDATE remaining_slot_requests SET state = 'modified' WHERE group_id = ?`).run(groupId);
      return { deleted: 1, bookings: groupProjection(groupId, bookingUserId, houseId) };
    })();
  }

  function isRemainingSlotGroup(groupId, bookingUserId, houseId) {
    if (!groupId) return false;
    return Boolean(db.prepare(`
      SELECT 1 FROM bookings b JOIN resources r ON r.id = b.resource_id
      WHERE b.group_id = ? AND b.user_id = ? AND r.house_id = ? AND b.booking_kind = 'remaining_slot'
      LIMIT 1
    `).get(groupId, Number(bookingUserId), Number(houseId)));
  }

  function recordCountedUsage(booking) {
    if (!booking || booking.resource_type !== 'washer' || !isSwissSlotStarted(booking.booking_date, booking.slot)) {
      return false;
    }
    const apartmentId = bookingApartmentId(booking.user_id);
    if (!apartmentId) return false;
    db.prepare(`
      INSERT OR IGNORE INTO booking_day_usage
        (apartment_id, house_id, booking_date, slot, source_kind)
      VALUES (?, ?, ?, ?, ?)
    `).run(apartmentId, Number(booking.house_id), booking.booking_date, booking.slot,
      booking.booking_kind === 'remaining_slot' ? 'remaining_slot' : 'booking');
    return true;
  }

  return {
    options,
    create,
    cancel,
    removeTumbler,
    isRemainingSlotGroup,
    recordCountedUsage,
    partyHasTodayWasher,
    partyHasRemainingSlot
  };
}

module.exports = { createRemainingSlotService };
