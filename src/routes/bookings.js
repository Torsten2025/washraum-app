const express = require('express');

function createBookingRouters({
  db,
  crypto,
  slots,
  addDays,
  isDateString,
  todayStringLocal,
  releaseWindowStatus,
  requireAuth,
  requireResident,
  requireApartmentAccount,
  requireAdmin,
  currentHouseId,
  notifyReleaseChannels,
  emailStatus,
  pushStatus,
  writeAudit,
  isValidPlainText,
  confirmCurrentAdminPassword,
  bookingRules,
  remainingSlotService
}) {
  const preferencesRouter = express.Router();
  const planningRouter = express.Router();
  const bookingsRouter = express.Router();
  const adminResetRouter = express.Router();
  const fixedBookingsRouter = express.Router();
  const calendarFeedRouter = express.Router();
  const {
    getFixedBookingsForDate,
    fixedBookingConflict,
    allowedDryingRoomSlots,
    validateWasherBooking,
    validateTumblerBooking,
    validateDryingRoomBooking,
    calendarDaySummary,
    findAvailableResources,
    availableDryingRoomsForWasher,
    bookingRecommendation,
    isSunday,
    isPastDate,
    isPastSlot,
    slotEndLabel,
    bookingRuleMode
  } = bookingRules;

  const calendarTokenHash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
  const modeNotApplicable = (res) => res.status(409).json({
    code: 'MODE_NOT_APPLICABLE',
    error: 'Restplaetze sind im liberalen Hausregelmodus nicht anwendbar.'
  });
  const projectCalendarBooking = (booking, req) => {
    const isOwn = Boolean(
      booking.apartment_id
      && req.session.user.apartmentId
      && Number(booking.apartment_id) === Number(req.session.user.apartmentId)
    );
    return ({
    id: booking.id,
    booking_date: booking.booking_date,
    slot: booking.slot,
    booking_kind: booking.booking_kind || 'standard',
    resource_id: booking.resource_id,
    resource_name: booking.resource_name,
    resource_type: booking.resource_type,
    is_fixed: Number(booking.is_fixed) === 1,
    group_id: booking.group_id || null,
    isOwn,
    ownerDisplayName: isOwn ? null : (booking.owner_display_name || null),
    canDelete: Boolean(
      !booking.is_fixed
      && (req.session.user.canManage || Number(booking.user_id) === Number(req.session.user.bookingUserId))
    )
    });
  };
  const icsEscape = (value) => String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
  const icsDate = (date, time) => `${String(date).replace(/-/g, '')}T${String(time).replace(':', '')}00`;
  const slotTimes = (slot) => {
    const [start, end] = String(slot).split('-');
    return { start, end };
  };
  const nextWeekdayDate = (weekday, slot) => {
    const start = todayStringLocal();
    const base = new Date(`${start}T12:00:00Z`);
    const current = base.getUTCDay();
    let offset = (Number(weekday) - current + 7) % 7;
    if (offset === 0 && isPastSlot(start, slot)) offset = 7;
    return addDays(start, offset);
  };
  const stableCalendarUid = (kind, id, userId) => `${crypto.createHash('sha256')
    .update(`${kind}:${id}:${userId}`)
    .digest('hex').slice(0, 32)}@waschzeit`;
  const foldIcsLine = (line) => {
    const chunks = [];
    let current = '';
    for (const codePoint of Array.from(String(line))) {
      if (current && Buffer.byteLength(current + codePoint, 'utf8') > 75) {
        chunks.push(current);
        current = ` ${codePoint}`;
      } else {
        current += codePoint;
      }
    }
    chunks.push(current);
    return chunks.join('\r\n');
  };

  const activeCalendarOwner = (userId) => db.prepare(`
    SELECT u.id, u.apartment_id, u.house_id
    FROM users u
    JOIN apartments a ON a.id = u.apartment_id AND a.active = 1 AND a.house_id = u.house_id
    JOIN houses h ON h.id = u.house_id AND h.active = 1
    WHERE u.id = ? AND u.active = 1
      AND (a.claimed_by = u.id OR EXISTS (
        SELECT 1 FROM users resident
        WHERE resident.apartment_id = a.id AND resident.id = u.id AND resident.active = 1
      ))
  `).get(userId);

  preferencesRouter.get('/api/me/calendar-feed', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const active = db.prepare(`
      SELECT cft.created_at FROM calendar_feed_tokens cft
      JOIN users u ON u.id = cft.user_id AND u.active = 1
      JOIN apartments a ON a.id = cft.apartment_id AND a.active = 1
      WHERE cft.user_id = ? AND cft.revoked_at IS NULL
        AND u.apartment_id = cft.apartment_id AND u.house_id = cft.house_id
        AND a.house_id = cft.house_id
      ORDER BY cft.id DESC LIMIT 1
    `).get(req.session.user.id);
    res.json({ active: Boolean(active), createdAt: active?.created_at || null });
  });

  preferencesRouter.post('/api/me/calendar-feed', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const owner = activeCalendarOwner(req.session.user.id);
    if (!owner) return res.status(409).json({ code: 'CALENDAR_FEED_UNAVAILABLE', error: 'Der Kalenderfeed braucht eine aktive Wohnung im aktuellen Haus.' });
    const token = crypto.randomBytes(32).toString('base64url');
    db.transaction(() => {
      db.prepare('UPDATE calendar_feed_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL')
        .run(req.session.user.id);
      db.prepare('INSERT INTO calendar_feed_tokens (user_id, apartment_id, house_id, token_hash) VALUES (?, ?, ?, ?)')
        .run(owner.id, owner.apartment_id, owner.house_id, calendarTokenHash(token));
    })();
    writeAudit(req, 'calendar_feed.rotate', 'user', req.session.user.id, {});
    res.status(201).json({
      path: `/api/calendar-feed/${token}.ics`,
      message: 'Kalenderfeed erstellt. Diese Adresse wird nur jetzt angezeigt.'
    });
  });

  preferencesRouter.delete('/api/me/calendar-feed', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const result = db.prepare(`
      UPDATE calendar_feed_tokens SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL
    `).run(req.session.user.id);
    writeAudit(req, 'calendar_feed.revoke', 'user', req.session.user.id, { revoked: result.changes });
    res.json({ ok: true, active: false, message: 'Kalenderfeed widerrufen.' });
  });

  calendarFeedRouter.get('/api/calendar-feed/:token.ics', (req, res) => {
    const token = String(req.params.token || '');
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return res.status(404).end();
    const owner = db.prepare(`
      SELECT u.id, u.apartment_id, u.house_id,
             COALESCE(a.claimed_by, (SELECT MIN(p.id) FROM users p WHERE p.apartment_id = u.apartment_id AND p.active = 1), u.id) AS booking_user_id
      FROM calendar_feed_tokens cft
      JOIN users u ON u.id = cft.user_id
      JOIN apartments a ON a.id = cft.apartment_id AND a.active = 1
      JOIN houses h ON h.id = cft.house_id AND h.active = 1
      WHERE cft.token_hash = ? AND cft.revoked_at IS NULL AND u.active = 1
        AND u.apartment_id = cft.apartment_id AND u.house_id = cft.house_id
        AND a.house_id = cft.house_id
      LIMIT 1
    `).get(calendarTokenHash(token));
    if (!owner) return res.status(404).end();

    const normal = db.prepare(`
      SELECT b.id, b.booking_date, b.slot, r.name AS resource_name
      FROM bookings b JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ? AND r.house_id = ? AND b.booking_date >= ?
      ORDER BY b.booking_date, b.slot, b.id
    `).all(owner.booking_user_id, owner.house_id, todayStringLocal());
    const fixed = owner.apartment_id == null ? [] : db.prepare(`
      SELECT fb.id, fb.weekday, fb.slot, r.name AS resource_name
      FROM fixed_bookings fb JOIN resources r ON r.id = fb.resource_id
      WHERE fb.apartment_id = ? AND r.house_id = ? AND fb.active = 1
      ORDER BY fb.weekday, fb.slot, fb.id
    `).all(owner.apartment_id, owner.house_id);
    const events = [];
    for (const booking of normal) {
      const time = slotTimes(booking.slot);
      events.push([
        'BEGIN:VEVENT',
        `UID:${stableCalendarUid('booking', booking.id, owner.id)}`,
        `DTSTAMP:${icsDate(todayStringLocal(), '00:00')}Z`,
        `DTSTART;TZID=Europe/Zurich:${icsDate(booking.booking_date, time.start)}`,
        `DTEND;TZID=Europe/Zurich:${icsDate(booking.booking_date, time.end)}`,
        `SUMMARY:${icsEscape(`WaschZeit: ${booking.resource_name}`)}`,
        'END:VEVENT'
      ]);
    }
    for (const booking of fixed) {
      const date = nextWeekdayDate(booking.weekday, booking.slot);
      const time = slotTimes(booking.slot);
      events.push([
        'BEGIN:VEVENT',
        `UID:${stableCalendarUid('fixed', booking.id, owner.id)}`,
        `DTSTAMP:${icsDate(todayStringLocal(), '00:00')}Z`,
        `DTSTART;TZID=Europe/Zurich:${icsDate(date, time.start)}`,
        `DTEND;TZID=Europe/Zurich:${icsDate(date, time.end)}`,
        'RRULE:FREQ=WEEKLY',
        `SUMMARY:${icsEscape(`WaschZeit Dauertermin: ${booking.resource_name}`)}`,
        'END:VEVENT'
      ]);
    }
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WaschZeit//Personal Calendar Feed//DE',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:WaschZeit - Meine Buchungen',
      'X-WR-TIMEZONE:Europe/Zurich',
      ...events.flat(), 'END:VCALENDAR'
    ];
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="waschzeit-meine-buchungen.ics"',
      'Cache-Control': 'private, no-store'
    });
    res.send(`${lines.map(foldIcsLine).join('\r\n')}\r\n`);
  });

  preferencesRouter.put('/api/me/booking-mode', requireAuth, (req, res) => {
    const bookingMode = String(req.body?.bookingMode || '');
    if (!['time', 'machine'].includes(bookingMode)) {
      return res.status(400).json({ error: 'Ung\u00fcltiger Buchungsweg.' });
    }
    db.prepare('UPDATE users SET booking_mode = ? WHERE id = ?')
      .run(bookingMode, req.session.user.id);
    req.session.user.bookingMode = bookingMode;
    res.json({
      user: req.session.user,
      message: bookingMode === 'time'
        ? 'Zeitfenster stehen beim Buchen jetzt an erster Stelle.'
        : 'Waschmaschinen stehen beim Buchen jetzt an erster Stelle.'
    });
  });

  planningRouter.get('/api/calendar', requireAuth, (req, res) => {
    const from = String(req.query.from || todayStringLocal());
    const days = Number(req.query.days || 7);
    const houseId = currentHouseId(req);
    if (!isDateString(from) || !Number.isInteger(days) || days < 1 || days > 42) {
      return res.status(400).json({ error: 'Ung\u00fcltiger Kalenderzeitraum' });
    }

    const calendarDays = Array.from({ length: days }, (_, index) => (
      calendarDaySummary(req.session.user.bookingUserId, addDays(from, index), houseId)
    ));
    const resourceCount = db.prepare(`
      SELECT COUNT(*) AS count FROM resources
      WHERE house_id = ?
    `).get(houseId).count;
    res.json({
      from,
      bookingRuleMode: bookingRuleMode(houseId),
      resourceCount,
      activeResourceCount: calendarDays[0]?.activeResourceCount || 0,
      days: calendarDays
    });
  });

  planningRouter.get('/api/booking-options', requireAuth, (req, res) => {
    const date = String(req.query.date || '');
    const selectedSlot = String(req.query.slot || '');
    const houseId = currentHouseId(req);
    if (!isDateString(date) || (selectedSlot && !slots.includes(selectedSlot))) {
      return res.status(400).json({ error: 'Ung\u00fcltiger Buchungszeitraum' });
    }

    const resourceCount = db.prepare(`
      SELECT COUNT(*) AS count FROM resources
      WHERE house_id = ?
    `).get(houseId).count;
    const activeResourceCount = db.prepare(`
      SELECT COUNT(*) AS count FROM resources
      WHERE active = 1 AND house_id = ?
    `).get(houseId).count;

    const existingWashers = db.prepare(`
      SELECT b.id AS bookingId, b.group_id AS groupId, b.slot,
             r.id AS resourceId, r.name AS resourceName
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'washer'
        AND r.house_id = ?
        AND b.booking_date = ?
      ORDER BY b.slot, r.name
    `).all(req.session.user.bookingUserId, houseId, date);

    const slotOptions = slots.map((slot) => {
      const unavailableByTime = isSunday(date, houseId) || isPastSlot(date, slot);
      const washerError = unavailableByTime
        ? ''
        : validateWasherBooking(req.session.user.bookingUserId, date, slot, houseId);
      const washers = unavailableByTime
        ? []
        : findAvailableResources(req.session.user.bookingUserId, 'washer', date, slot, houseId, 3)
          .map((resource) => ({ resourceId: resource.id, resourceName: resource.name }));
      const dryingRoomCount = washers.length
        ? availableDryingRoomsForWasher(req.session.user.bookingUserId, date, slot, houseId).length
        : 0;
      const tumblerCount = washers.length
        ? findAvailableResources(req.session.user.bookingUserId, 'tumbler', date, slot, houseId, 2).length
        : 0;
      return { slot, washerError, washers, dryingRoomCount, tumblerCount };
    });

    let companions = null;
    if (selectedSlot) {
      companions = {
        dryingRooms: availableDryingRoomsForWasher(
          req.session.user.bookingUserId,
          date,
          selectedSlot,
          houseId
        ),
        tumblers: findAvailableResources(
          req.session.user.bookingUserId,
          'tumbler',
          date,
          selectedSlot,
          houseId,
          2
        ).map((resource) => ({ resourceId: resource.id, resourceName: resource.name }))
      };
    }

    res.json({
      date,
      resourceCount,
      activeResourceCount,
      closed: isSunday(date, houseId),
      existingWashers,
      slots: slotOptions,
      companions
    });
  });

  planningRouter.get('/api/recommendation', requireAuth, (req, res) => {
    res.json({ recommendation: bookingRecommendation(req.session.user.bookingUserId, currentHouseId(req)) });
  });

  planningRouter.get('/api/slots', requireAuth, (req, res) => {
    res.json({ slots });
  });

  planningRouter.get(
    '/api/remaining-slots/options',
    requireAuth,
    requireResident,
    requireApartmentAccount,
    (req, res) => {
      if (bookingRuleMode(currentHouseId(req)) === 'liberal') return modeNotApplicable(res);
      try {
        res.json(remainingSlotService.options({
          apartmentId: req.session.user.apartmentId,
          bookingUserId: req.session.user.bookingUserId,
          houseId: currentHouseId(req)
        }));
      } catch (error) {
        res.status(error.status || 500).json({ code: error.code || 'REMAINING_SLOT_FAILED', error: error.message });
      }
    }
  );

  bookingsRouter.get('/api/my-bookings', requireAuth, (req, res) => {
    const bookings = db.prepare(`
      SELECT b.id, b.booking_date, b.slot, b.group_id, b.booking_kind, r.id AS resource_id, r.name AS resource_name,
             r.type AS resource_type, u.id AS user_id, u.apartment_id,
             COALESCE(NULLIF(a.display_name, ''), NULLIF(a.label, '')) AS owner_display_name,
             0 AS is_fixed
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id AND a.house_id = r.house_id AND a.active = 1
      WHERE b.user_id = ?
        AND r.house_id = ?
        AND b.booking_date >= ?
      ORDER BY b.booking_date, b.slot, r.name
      LIMIT 30
    `).all(req.session.user.bookingUserId, currentHouseId(req), todayStringLocal());

    res.json({
      bookings: bookings.map((booking) => {
        const windowStatus = releaseWindowStatus(booking.booking_date, booking.slot);
        return {
          ...projectCalendarBooking(booking, req),
          releaseEligible: windowStatus.eligible,
          cancellationNoticeEligible: windowStatus.reason === 'not_started'
        };
      })
    });
  });

  bookingsRouter.get('/api/bookings', requireAuth, (req, res) => {
    const date = req.query.date;
    const houseId = currentHouseId(req);
    if (!isDateString(date)) {
      return res.status(400).json({ error: 'Datum im Format YYYY-MM-DD erforderlich' });
    }

    const bookings = db.prepare(`
      SELECT b.id, b.booking_date, b.slot, b.booking_kind, r.id AS resource_id, r.name AS resource_name,
             r.type AS resource_type, u.id AS user_id, u.apartment_id,
             COALESCE(NULLIF(a.display_name, ''), NULLIF(a.label, '')) AS owner_display_name, 0 AS is_fixed,
             b.group_id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id AND a.house_id = r.house_id AND a.active = 1
      WHERE b.booking_date = ? AND r.house_id = ?
      ORDER BY b.slot, r.name
    `).all(date, houseId);

    const fixedBookings = getFixedBookingsForDate(date, houseId);
    const allBookings = [...bookings, ...fixedBookings]
      .sort((left, right) => left.slot.localeCompare(right.slot) || left.resource_name.localeCompare(right.resource_name));

    res.json({ bookings: allBookings.map((booking) => projectCalendarBooking(booking, req)) });
  });

  bookingsRouter.post('/api/bookings', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const { resourceId, date, slot } = req.body || {};
    const houseId = currentHouseId(req);

    if (!Number.isInteger(Number(resourceId)) || !isDateString(date) || !slots.includes(slot)) {
      return res.status(400).json({ error: 'Ung\u00fcltige Buchungsdaten' });
    }
    if (isPastDate(date)) {
      return res.status(400).json({ error: 'Buchungen in der Vergangenheit sind nicht erlaubt' });
    }
    if (isPastSlot(date, slot)) {
      return res.status(400).json({ error: 'Dieser Slot liegt bereits in der Vergangenheit' });
    }
    if (isSunday(date, houseId)) {
      return res.status(400).json({ error: 'Sonntags sind keine Buchungen m\u00f6glich' });
    }

    const resource = db.prepare(`
      SELECT id, type FROM resources
      WHERE id = ? AND active = 1 AND house_id = ?
    `).get(Number(resourceId), houseId);
    if (!resource) {
      return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
    }
    if (remainingSlotService.partyHasRemainingSlot(req.session.user.bookingUserId, houseId, date)) {
      return res.status(409).json({
        code: 'REMAINING_SLOT_EXTENSION_FORBIDDEN',
        error: 'Ein Restplatz kann nicht ueber den normalen Buchungsweg erweitert werden.'
      });
    }

    const fixedConflict = fixedBookingConflict(resource.id, date, slot, houseId);
    if (fixedConflict) {
      return res.status(409).json({
        error: `${fixedConflict.resource_name} ist in diesem Slot fest f\u00fcr ${fixedConflict.label} reserviert.`
      });
    }

    let ruleError = '';
    if (resource.type === 'washer') {
      ruleError = validateWasherBooking(req.session.user.bookingUserId, date, slot, houseId);
    } else if (resource.type === 'tumbler') {
      ruleError = validateTumblerBooking(date, slot, houseId);
    } else if (resource.type === 'drying_room') {
      ruleError = validateDryingRoomBooking(req.session.user.bookingUserId, date, slot, houseId);
    }

    if (ruleError) {
      return res.status(409).json({ error: ruleError });
    }

    try {
      const result = db.prepare(`
        INSERT INTO bookings (user_id, resource_id, booking_date, slot)
        VALUES (?, ?, ?, ?)
      `).run(req.session.user.bookingUserId, Number(resourceId), date, slot);

      const created = db.prepare(`
        SELECT b.id, b.booking_date, b.slot, r.name AS resource_name
        FROM bookings b
        JOIN resources r ON r.id = b.resource_id
        WHERE b.id = ?
      `).get(result.lastInsertRowid);

      res.status(201).json({
        id: result.lastInsertRowid,
        message: `${created.resource_name} am ${created.booking_date} ${created.slot} gebucht.`
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Dieser Termin ist bereits gebucht' });
      }
      throw error;
    }
  });

  bookingsRouter.post(
    '/api/remaining-slots',
    requireAuth,
    requireResident,
    requireApartmentAccount,
    (req, res) => {
      if (bookingRuleMode(currentHouseId(req)) === 'liberal') return modeNotApplicable(res);
      if (Object.hasOwn(req.body || {}, 'houseId') || Object.hasOwn(req.body || {}, 'date')) {
        return res.status(400).json({ code: 'SERVER_CONTEXT_REQUIRED', error: 'Haus und Datum werden serverseitig bestimmt.' });
      }
      try {
        const result = remainingSlotService.create({
          apartmentId: req.session.user.apartmentId,
          bookingUserId: req.session.user.bookingUserId,
          houseId: currentHouseId(req),
          idempotencyKey: req.get('Idempotency-Key'),
          slot: String(req.body?.slot || ''),
          washerId: req.body?.washerId,
          tumblerId: req.body?.tumblerId == null ? null : req.body.tumblerId,
          selfDryingConfirmed: req.body?.selfDryingConfirmed === true
        });
        return res.status(result.idempotent ? 200 : 201).json({
          ok: true,
          idempotent: result.idempotent,
          bookings: result.bookings,
          message: result.idempotent
            ? 'Dieser Restplatz war bereits gebucht.'
            : 'Der Restplatz wurde verbindlich gebucht.'
        });
      } catch (error) {
        return res.status(error.status || 500).json({
          code: error.code || 'REMAINING_SLOT_FAILED',
          error: error.message
        });
      }
    }
  );

  bookingsRouter.delete(
    '/api/remaining-slots/:groupId',
    requireAuth,
    requireResident,
    requireApartmentAccount,
    (req, res) => {
      if (bookingRuleMode(currentHouseId(req)) === 'liberal') return modeNotApplicable(res);
      try {
        const result = remainingSlotService.cancel({
          groupId: req.params.groupId,
          bookingUserId: req.session.user.bookingUserId,
          houseId: currentHouseId(req)
        });
        return res.json({ ok: true, deleted: result.deleted, message: 'Das Restplatzpaket wurde storniert.' });
      } catch (error) {
        return res.status(error.status || 500).json({ code: error.code || 'REMAINING_SLOT_FAILED', error: error.message });
      }
    }
  );

  bookingsRouter.delete(
    '/api/remaining-slots/:groupId/tumbler',
    requireAuth,
    requireResident,
    requireApartmentAccount,
    (req, res) => {
      if (bookingRuleMode(currentHouseId(req)) === 'liberal') return modeNotApplicable(res);
      try {
        const result = remainingSlotService.removeTumbler({
          groupId: req.params.groupId,
          bookingUserId: req.session.user.bookingUserId,
          houseId: currentHouseId(req),
          selfDryingConfirmed: req.body?.selfDryingConfirmed === true
        });
        return res.json({
          ok: true,
          deleted: result.deleted,
          bookings: result.bookings,
          message: 'Der Tumbler wurde entfernt. Die Trocknung organisierst du selbst.'
        });
      } catch (error) {
        return res.status(error.status || 500).json({ code: error.code || 'REMAINING_SLOT_FAILED', error: error.message });
      }
    }
  );

  function packageRequestError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  bookingsRouter.post('/api/booking-package', requireAuth, requireResident, requireApartmentAccount, (req, res, next) => {
    const rawItems = req.body?.items;
    const washerBookingId = Number(req.body?.washerBookingId || 0);
    const houseId = currentHouseId(req);
    if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 8) {
      return res.status(400).json({ error: 'Ein Waschpaket muss ein bis acht Buchungen enthalten.' });
    }

    try {
      const items = rawItems.map((item) => {
        const resourceId = Number(item?.resourceId);
        const date = String(item?.date || '');
        const slot = String(item?.slot || '');
        if (!Number.isInteger(resourceId) || !isDateString(date) || !slots.includes(slot)) {
          throw packageRequestError(400, 'Das Waschpaket enth\u00e4lt ung\u00fcltige Buchungsdaten.');
        }
        const resource = db.prepare(`
          SELECT id, name, type FROM resources
          WHERE id = ? AND active = 1 AND house_id = ?
        `).get(resourceId, houseId);
        if (!resource) {
          throw packageRequestError(404, 'Ein Ger\u00e4t aus dem Waschpaket ist nicht mehr verf\u00fcgbar.');
        }
        return { resourceId, date, slot, resource };
      });

      const itemKeys = items.map((item) => `${item.resourceId}|${item.date}|${item.slot}`);
      if (new Set(itemKeys).size !== itemKeys.length) {
        throw packageRequestError(400, 'Das Waschpaket enth\u00e4lt eine Buchung doppelt.');
      }

      const washerItems = items.filter((item) => item.resource.type === 'washer');
      const dryingItems = items.filter((item) => item.resource.type === 'drying_room');
      const tumblerItems = items.filter((item) => item.resource.type === 'tumbler');
      let existingWasher = null;
      let newWashers = [];

      if (washerBookingId) {
        existingWasher = db.prepare(`
          SELECT b.id, b.user_id, b.booking_date, b.slot, b.group_id, b.booking_kind,
                 r.id AS resource_id, r.name AS resource_name
          FROM bookings b
          JOIN resources r ON r.id = b.resource_id
          WHERE b.id = ? AND r.type = 'washer' AND r.house_id = ?
        `).get(washerBookingId, houseId);
        if (!existingWasher) {
          throw packageRequestError(404, 'Die Waschmaschinen-Buchung wurde nicht gefunden.');
        }
        if (existingWasher.user_id !== req.session.user.bookingUserId) {
          throw packageRequestError(403, 'Diese Waschmaschinen-Buchung geh\u00f6rt dir nicht.');
        }
        if (existingWasher.booking_kind === 'remaining_slot') {
          throw packageRequestError(409, 'Ein Restplatz kann nicht als normales Waschpaket erweitert werden.');
        }
        if (washerItems.length) {
          throw packageRequestError(400, 'Eine bereits gebuchte Waschmaschine darf im Paket nicht erneut reserviert werden.');
        }
      } else {
        if (washerItems.length < 1 || washerItems.length > 3) {
          throw packageRequestError(400, 'Ein neues Waschpaket braucht eine bis drei Waschmaschinen.');
        }
        newWashers = washerItems;
      }

      const washDate = existingWasher?.booking_date || newWashers[0].date;
      const washSlot = existingWasher?.slot || newWashers[0].slot;
      if (isPastDate(washDate) || isPastSlot(washDate, washSlot)) {
        throw packageRequestError(400, 'Der empfohlene Waschslot ist bereits vorbei. Bitte lade eine neue Empfehlung.');
      }
      if (isSunday(washDate, houseId)) {
        throw packageRequestError(400, 'Sonntags sind keine Buchungen m\u00f6glich.');
      }

      if (newWashers.some((item) => item.date !== washDate || item.slot !== washSlot)) {
        throw packageRequestError(400, 'Alle Waschmaschinen im Paket m\u00fcssen im gleichen Zeitfenster liegen.');
      }

      if (tumblerItems.length > 1 || tumblerItems.some((item) => item.date !== washDate || item.slot !== washSlot)) {
        throw packageRequestError(400, 'Der Tumbler muss im gleichen Zeitfenster wie die Waschmaschine liegen.');
      }

      const allowedDryingWindow = bookingRuleMode(houseId) === 'liberal'
        ? [{ date: washDate, slot: washSlot }]
        : allowedDryingRoomSlots(washDate, washSlot);
      const sortedDryingItems = [...dryingItems].sort((left, right) => {
        const leftIndex = allowedDryingWindow.findIndex((item) => item.date === left.date && item.slot === left.slot);
        const rightIndex = allowedDryingWindow.findIndex((item) => item.date === right.date && item.slot === right.slot);
        return leftIndex - rightIndex;
      });
      const dryingResourceIds = new Set(dryingItems.map((item) => item.resourceId));
      const expectedDryingWindow = allowedDryingWindow.slice(0, dryingItems.length);
      const validDryingWindow = sortedDryingItems.every((item, index) => (
        expectedDryingWindow[index]?.date === item.date
        && expectedDryingWindow[index]?.slot === item.slot
      ));
      if (dryingItems.length && (
        dryingResourceIds.size !== 1
        || dryingItems.length > allowedDryingWindow.length
        || !validDryingWindow
      )) {
        throw packageRequestError(400, 'Der Trockenraum muss l\u00fcckenlos und innerhalb der erlaubten Trocknungszeit gebucht werden.');
      }

      for (const item of items) {
        if (isPastDate(item.date) || isPastSlot(item.date, item.slot)) {
          throw packageRequestError(400, 'Ein Bestandteil des Waschpakets liegt bereits in der Vergangenheit.');
        }
        if (isSunday(item.date, houseId)) {
          throw packageRequestError(400, 'Sonntags sind keine Buchungen m\u00f6glich.');
        }
        const fixedConflict = fixedBookingConflict(item.resourceId, item.date, item.slot, houseId);
        if (fixedConflict) {
          throw packageRequestError(
            409,
            `${fixedConflict.resource_name} ist in diesem Slot fest f\u00fcr ${fixedConflict.label} reserviert.`
          );
        }
        const occupied = db.prepare(`
          SELECT id FROM bookings
          WHERE resource_id = ? AND booking_date = ? AND slot = ?
          LIMIT 1
        `).get(item.resourceId, item.date, item.slot);
        if (occupied) {
          throw packageRequestError(409, 'Ein Bestandteil des Waschpakets wurde inzwischen gebucht. Bitte lade eine neue Empfehlung.');
        }
      }

      if (newWashers.length) {
        const washerError = validateWasherBooking(req.session.user.bookingUserId, washDate, washSlot, houseId);
        if (washerError) {
          throw packageRequestError(409, washerError);
        }
      }
      if (tumblerItems.length) {
        const tumblerError = validateTumblerBooking(washDate, washSlot, houseId);
        if (tumblerError) {
          throw packageRequestError(409, tumblerError);
        }
      }

      const groupId = existingWasher?.group_id || crypto.randomUUID();
      const createPackage = db.transaction(() => {
        const created = [];
        const insert = db.prepare(`
          INSERT INTO bookings (user_id, resource_id, booking_date, slot, group_id)
          VALUES (?, ?, ?, ?, ?)
        `);

        if (existingWasher && !existingWasher.group_id) {
          db.prepare('UPDATE bookings SET group_id = ? WHERE id = ?').run(groupId, existingWasher.id);
        }

        if (newWashers.length) {
          const washerError = validateWasherBooking(req.session.user.bookingUserId, washDate, washSlot, houseId);
          if (washerError) {
            throw packageRequestError(409, washerError);
          }
          for (const washer of newWashers) {
            const result = insert.run(req.session.user.bookingUserId, washer.resourceId, washDate, washSlot, groupId);
            created.push({ id: result.lastInsertRowid, type: 'washer' });
          }
        }

        for (const item of sortedDryingItems) {
          const dryingError = validateDryingRoomBooking(req.session.user.bookingUserId, item.date, item.slot, houseId);
          if (dryingError) {
            throw packageRequestError(409, dryingError);
          }
          const result = insert.run(req.session.user.bookingUserId, item.resourceId, item.date, item.slot, groupId);
          created.push({ id: result.lastInsertRowid, type: 'drying_room' });
        }

        for (const item of tumblerItems) {
          const tumblerError = validateTumblerBooking(item.date, item.slot, houseId);
          if (tumblerError) {
            throw packageRequestError(409, tumblerError);
          }
          const result = insert.run(req.session.user.bookingUserId, item.resourceId, item.date, item.slot, groupId);
          created.push({ id: result.lastInsertRowid, type: 'tumbler' });
        }
        return created;
      });

      const created = createPackage();
      const bookedTypes = [...new Set(created.map((item) => item.type))];
      const typeLabels = {
        washer: 'Waschmaschine',
        drying_room: 'Trockenraum',
        tumbler: 'Tumbler'
      };
      const summary = bookedTypes.map((type) => {
        const count = created.filter((item) => item.type === type).length;
        if (type === 'washer' && count > 1) {
          return `${count} Waschmaschinen`;
        }
        return typeLabels[type];
      }).join(', ');
      res.status(201).json({
        created,
        groupId,
        message: existingWasher
          ? `Waschpaket erg\u00e4nzt: ${summary}.`
          : `Waschpaket gebucht: ${summary}.`
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Ein Bestandteil des Waschpakets wurde inzwischen gebucht. Bitte versuche es erneut.' });
      }
      next(error);
    }
  });

  bookingsRouter.delete('/api/booking-groups/:groupId', requireAuth, (req, res) => {
    const groupId = String(req.params.groupId || '');
    const houseId = currentHouseId(req);
    const groupedBookings = db.prepare(`
      SELECT b.id, b.user_id, b.booking_date, b.slot, b.booking_kind,
             r.type AS resource_type, r.house_id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.group_id = ? AND r.house_id = ?
    `).all(groupId, houseId);
    if (!groupedBookings.length) {
      return res.status(404).json({ error: 'Waschpaket nicht gefunden' });
    }
    if (
      !req.session.user.canManage
      && groupedBookings.some((booking) => booking.user_id !== req.session.user.bookingUserId)
    ) {
      return res.status(403).json({ error: 'Dieses Waschpaket geh\u00f6rt dir nicht' });
    }

    if (groupedBookings.some((booking) => booking.booking_kind === 'remaining_slot')) {
      return res.status(409).json({
        code: 'REMAINING_SLOT_ENDPOINT_REQUIRED',
        error: 'Restplatzpakete werden nur ueber den dafuer vorgesehenen Stornoweg geaendert.'
      });
    }
    db.transaction(() => {
      for (const booking of groupedBookings) remainingSlotService.recordCountedUsage(booking);
      db.prepare('DELETE FROM bookings WHERE group_id = ?').run(groupId);
    })();
    res.json({ ok: true, deleted: groupedBookings.length, message: 'Waschpaket gel\u00f6scht.' });
  });

  bookingsRouter.post('/api/booking-groups/:groupId/cancel-notify', requireAuth, async (req, res, next) => {
    try {
      const groupId = String(req.params.groupId || '');
      const groupedBookings = db.prepare(`
        SELECT b.*, r.name AS resource_name, r.type AS resource_type, r.house_id, h.name AS house_name
        FROM bookings b
        JOIN resources r ON r.id = b.resource_id
        JOIN houses h ON h.id = r.house_id
        WHERE b.group_id = ? AND r.house_id = ?
        ORDER BY b.booking_date, b.slot, r.type
      `).all(groupId, currentHouseId(req));
      if (!groupedBookings.length) {
        return res.status(404).json({ error: 'Waschpaket nicht gefunden' });
      }
      if (
        !req.session.user.canManage
        && groupedBookings.some((booking) => booking.user_id !== req.session.user.bookingUserId)
      ) {
        return res.status(403).json({ error: 'Dieses Waschpaket geh\u00f6rt dir nicht' });
      }
      if (groupedBookings.some((booking) => booking.booking_kind === 'remaining_slot')) {
        return res.status(409).json({
          code: 'REMAINING_SLOT_NO_NOTIFICATIONS',
          error: 'Restplatzpakete werden ohne neue Benachrichtigung ueber den Restplatz-Stornoweg storniert.'
        });
      }
      if (groupedBookings.some((booking) => releaseWindowStatus(booking.booking_date, booking.slot).reason !== 'not_started')) {
        return res.status(409).json({ error: 'Das ganze Paket kann nur vor Beginn abgesagt werden. Laufende Bestandteile bitte einzeln fr\u00fcher freigeben.' });
      }

      const actorName = req.session.user.displayName || req.session.user.username || 'Jemand';
      const noticeRows = db.transaction(() => {
        const createdNotices = [];
        db.prepare('DELETE FROM bookings WHERE group_id = ?').run(groupId);
        const insertNotice = db.prepare(`
          INSERT INTO release_notices (resource_id, resource_name, booking_date, slot, kind, message, house_id, created_by)
          VALUES (?, ?, ?, ?, 'cancellation', ?, ?, ?)
        `);
        for (const booking of groupedBookings) {
          const noticeMessage = `${actorName} hat ${booking.resource_name} am ${booking.booking_date} im Zeitfenster ${booking.slot} abgesagt. Der Slot ist wieder buchbar.`;
          const result = insertNotice.run(
            booking.resource_id,
            booking.resource_name,
            booking.booking_date,
            booking.slot,
            noticeMessage,
            booking.house_id,
            req.session.user.id
          );
          createdNotices.push({ booking, noticeId: result.lastInsertRowid });
        }
        return createdNotices;
      })();

      const washer = groupedBookings.find((booking) => booking.resource_type === 'washer') || groupedBookings[0];
      const primaryNotice = noticeRows.find((row) => row.booking.resource_type === 'washer') || noticeRows[0];
      const message = `${actorName} hat ein Waschpaket am ${washer.booking_date} im Zeitfenster ${washer.slot} abgesagt. Die enthaltenen Termine sind wieder buchbar.`;
      const { emailNotifications, pushNotifications } = await notifyReleaseChannels(
        req,
        { ...washer, notice_id: primaryNotice?.noticeId },
        message,
        'WaschZeit: Waschpaket wieder frei'
      );
      res.json({
        ok: true,
        deleted: groupedBookings.length,
        releaseNoticeCreated: true,
        emailNotifications,
        pushNotifications,
        message
      });
    } catch (error) {
      next(error);
    }
  });

  bookingsRouter.delete('/api/bookings/:id', requireAuth, (req, res) => {
    const booking = db.prepare(`
      SELECT b.*, r.type AS resource_type, r.house_id FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = ? AND r.house_id = ?
    `).get(Number(req.params.id), currentHouseId(req));
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    if (!req.session.user.canManage && booking.user_id !== req.session.user.bookingUserId) {
      return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
    }

    if (booking.booking_kind === 'remaining_slot') {
      return res.status(409).json({
        code: 'REMAINING_SLOT_ENDPOINT_REQUIRED',
        error: 'Ein Restplatzbestandteil kann nicht einzeln ueber diesen Weg geloescht werden.'
      });
    }
    db.transaction(() => {
      remainingSlotService.recordCountedUsage(booking);
      db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
    })();
    res.json({ ok: true, message: 'Buchung gel\u00f6scht.' });
  });

  bookingsRouter.post('/api/bookings/:id/cancel-notify', requireAuth, async (req, res, next) => {
    try {
      const booking = db.prepare(`
        SELECT b.*, r.name AS resource_name, r.type AS resource_type, r.house_id, h.name AS house_name
        FROM bookings b
        JOIN resources r ON r.id = b.resource_id
        JOIN houses h ON h.id = r.house_id
        WHERE b.id = ? AND r.house_id = ?
      `).get(Number(req.params.id), currentHouseId(req));

      if (!booking) {
        return res.status(404).json({ error: 'Buchung nicht gefunden' });
      }
      if (!req.session.user.canManage && booking.user_id !== req.session.user.bookingUserId) {
        return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
      }

      if (booking.booking_kind === 'remaining_slot') {
        return res.status(409).json({
          code: 'REMAINING_SLOT_NO_NOTIFICATIONS',
          error: 'Restplatzpakete werden ohne neue Benachrichtigung ueber den Restplatz-Stornoweg storniert.'
        });
      }
      const windowStatus = releaseWindowStatus(booking.booking_date, booking.slot);
      if (windowStatus.reason !== 'not_started') {
        return res.status(409).json({
          error: 'Absagen mit Benachrichtigung ist nur vor Beginn m\u00f6glich. Im laufenden Slot bitte Freigeben verwenden.'
        });
      }

      db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
      const actorName = req.session.user.displayName || req.session.user.username || 'Jemand';
      const message = `${actorName} hat ${booking.resource_name} am ${booking.booking_date} im Zeitfenster ${booking.slot} abgesagt. Der Slot ist wieder buchbar.`;
      const noticeResult = db.prepare(`
        INSERT INTO release_notices (resource_id, resource_name, booking_date, slot, kind, message, house_id, created_by)
        VALUES (?, ?, ?, ?, 'cancellation', ?, ?, ?)
      `).run(booking.resource_id, booking.resource_name, booking.booking_date, booking.slot, message, booking.house_id, req.session.user.id);

      const { emailNotifications, pushNotifications } = await notifyReleaseChannels(
        req,
        { ...booking, notice_id: noticeResult.lastInsertRowid },
        message,
        `Waschplan: Termin f\u00fcr ${booking.resource_name} wieder frei`
      );
      res.json({ ok: true, message, releaseNoticeCreated: true, emailNotifications, pushNotifications });
    } catch (error) {
      next(error);
    }
  });

  bookingsRouter.post('/api/bookings/:id/release', requireAuth, async (req, res, next) => {
    try {
      const booking = db.prepare(`
        SELECT b.*, r.name AS resource_name, r.type AS resource_type, r.house_id, h.name AS house_name
        FROM bookings b
        JOIN resources r ON r.id = b.resource_id
        JOIN houses h ON h.id = r.house_id
        WHERE b.id = ? AND r.house_id = ?
      `).get(Number(req.params.id), currentHouseId(req));

      if (!booking) {
        return res.status(404).json({ error: 'Buchung nicht gefunden' });
      }
      if (!req.session.user.canManage && booking.user_id !== req.session.user.bookingUserId) {
        return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
      }

      if (booking.booking_kind === 'remaining_slot') {
        return res.status(409).json({
          code: 'REMAINING_SLOT_NO_NOTIFICATIONS',
          error: 'Restplaetze koennen nicht ueber den allgemeinen Freigabeweg geloest werden.'
        });
      }

      const releaseWindow = releaseWindowStatus(booking.booking_date, booking.slot);
      db.transaction(() => {
        remainingSlotService.recordCountedUsage(booking);
        db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
      })();

      if (!releaseWindow.eligible) {
        const message = releaseWindow.reason === 'ended'
          ? 'Buchung gelöscht. Das Zeitfenster ist bereits beendet; es wurde kein Freigabe-Hinweis versendet.'
          : 'Buchung gelöscht. Freigabe-Hinweise werden nur während des gebuchten Zeitfensters versendet.';
        return res.json({
          ok: true,
          message,
          releaseNoticeCreated: false,
          emailNotifications: { configured: emailStatus().configured, sent: 0, skipped: true },
          pushNotifications: { configured: pushStatus().configured, sent: 0, failed: 0, skipped: true }
        });
      }

      const actorName = req.session.user.displayName || req.session.user.username || 'Jemand';
      const message = releaseWindow.hasStarted
        ? `${actorName} hat ${booking.resource_name} freigegeben. Der Slot ist heute bis ${slotEndLabel(booking.slot)} wieder frei.`
        : `${actorName} hat ${booking.resource_name} freigegeben. Der Slot ist am ${booking.booking_date} im Zeitfenster ${booking.slot} wieder frei.`;
      const noticeResult = db.prepare(`
        INSERT INTO release_notices (resource_id, resource_name, booking_date, slot, kind, message, house_id, created_by)
        VALUES (?, ?, ?, ?, 'early_release', ?, ?, ?)
      `).run(booking.resource_id, booking.resource_name, booking.booking_date, booking.slot, message, booking.house_id, req.session.user.id);

      const { emailNotifications, pushNotifications } = await notifyReleaseChannels(req, { ...booking, notice_id: noticeResult.lastInsertRowid }, message);
      res.json({ ok: true, message, releaseNoticeCreated: true, emailNotifications, pushNotifications });
    } catch (error) {
      next(error);
    }
  });

  adminResetRouter.delete('/api/admin/bookings', requireAdmin, (req, res) => {
    const confirmText = String(req.body?.confirm || '').trim();
    if (!confirmCurrentAdminPassword(req, res)) return;
    if (confirmText !== 'ALLE BUCHUNGEN') {
      return res.status(400).json({ error: 'Bitte zur Bestaetigung ALLE BUCHUNGEN eingeben.' });
    }
    const houseId = currentHouseId(req);
    const affectedBookings = db.prepare(`
      SELECT b.*, r.type AS resource_type, r.house_id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.house_id = ?
    `).all(houseId);
    db.transaction(() => {
      for (const booking of affectedBookings) remainingSlotService.recordCountedUsage(booking);
      db.prepare(`
        UPDATE remaining_slot_requests SET state = 'cancelled'
        WHERE group_id IN (
          SELECT DISTINCT b.group_id
          FROM bookings b
          JOIN resources r ON r.id = b.resource_id
          WHERE r.house_id = ? AND b.booking_kind = 'remaining_slot' AND b.group_id IS NOT NULL
        )
      `).run(houseId);
      db.prepare(`
        DELETE FROM bookings
        WHERE id IN (
          SELECT b.id
          FROM bookings b
          JOIN resources r ON r.id = b.resource_id
          WHERE r.house_id = ?
        )
      `).run(houseId);
    })();
    writeAudit(req, 'bookings.reset', 'booking', '', { deleted: affectedBookings.length });
    res.json({ ok: true, deleted: affectedBookings.length, message: `${affectedBookings.length} Buchungen wurden geloescht. Dauertermine bleiben erhalten.` });
  });

  function fixedDryingWindow(weekday, washSlot, durationSlots) {
    const nextWeekday = (weekday + 1) % 7;
    const available = washSlot === '07:00-12:00'
      ? [
        { weekday, slot: '07:00-12:00' },
        { weekday, slot: '12:00-17:00' },
        { weekday, slot: '17:00-21:00' }
      ]
      : washSlot === '12:00-17:00'
        ? [
          { weekday, slot: '12:00-17:00' },
          { weekday, slot: '17:00-21:00' },
          { weekday: nextWeekday, slot: '07:00-12:00' }
        ]
        : [
          { weekday, slot: '17:00-21:00' },
          { weekday: nextWeekday, slot: '07:00-12:00' }
        ];
    if (!Number.isInteger(durationSlots) || durationSlots < 1 || durationSlots > available.length) return null;
    const window = available.slice(0, durationSlots);
    return window.some((item) => item.weekday === 0) ? null : window;
  }

  function fixedSlotConflict(resourceId, weekday, slot, houseId) {
    return db.prepare(`
      SELECT fb.id, fb.label, r.name AS resource_name
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1 AND fb.resource_id = ? AND r.house_id = ?
        AND fb.weekday = ? AND fb.slot = ?
      LIMIT 1
    `).get(resourceId, houseId, weekday, slot);
  }

  function normalFutureConflict(resourceId, weekday, slot) {
    return db.prepare(`
      SELECT b.id
      FROM bookings b
      WHERE b.resource_id = ? AND b.slot = ? AND b.booking_date >= ?
        AND CAST(strftime('%w', b.booking_date) AS INTEGER) = ?
      LIMIT 1
    `).get(resourceId, slot, todayStringLocal(), weekday);
  }

  function ensureFixedTumblerReserve(houseId, weekday, slot, additionalCount = 1) {
    if (bookingRuleMode(houseId) === 'liberal') return;
    const totalTumblers = db.prepare(`
      SELECT COUNT(*) AS count FROM resources
      WHERE active = 1 AND type = 'tumbler' AND house_id = ?
    `).get(houseId).count;
    const fixedTumblers = db.prepare(`
      SELECT COUNT(*) AS count
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1 AND r.type = 'tumbler' AND r.house_id = ?
        AND fb.weekday = ? AND fb.slot = ?
    `).get(houseId, weekday, slot).count;
    if (fixedTumblers + additionalCount > Math.max(0, totalTumblers - 1)) {
      throw packageRequestError(409, 'Mindestens ein Tumbler muss in diesem Slot frei bleiben.');
    }
  }

  function ensureFixedRowsAvailable(rows, houseId) {
    for (const row of rows) {
      const fixedConflict = fixedSlotConflict(row.resourceId, row.weekday, row.slot, houseId);
      if (fixedConflict) {
        throw packageRequestError(409, `${fixedConflict.resource_name} ist in diesem Dauer-Slot bereits reserviert.`);
      }
      if (normalFutureConflict(row.resourceId, row.weekday, row.slot)) {
        throw packageRequestError(409, 'Es gibt bereits eine normale zukuenftige Buchung in einem Bestandteil dieses Dauerpakets.');
      }
    }
  }

  fixedBookingsRouter.get('/api/admin/fixed-bookings', requireAdmin, (req, res) => {
    const fixedBookings = db.prepare(`
      SELECT fb.id, fb.resource_id, fb.weekday, fb.slot, fb.label, fb.group_id, fb.apartment_id,
             fb.drying_duration_slots, fb.created_at,
             r.name AS resource_name, r.type AS resource_type,
             COALESCE(NULLIF(a.display_name, ''), a.label, '') AS apartment_name
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      LEFT JOIN apartments a ON a.id = fb.apartment_id
      WHERE fb.active = 1 AND r.house_id = ?
      ORDER BY fb.weekday, fb.slot, r.name
    `).all(currentHouseId(req));

    res.json({ fixedBookings });
  });

  fixedBookingsRouter.post('/api/admin/fixed-bookings', requireAdmin, (req, res, next) => {
    const hasLegacyResource = Object.prototype.hasOwnProperty.call(req.body || {}, 'resourceId');
    const hasPackageResources = Object.prototype.hasOwnProperty.call(req.body || {}, 'resourceIds');
    const weekday = Number(req.body?.weekday);
    const slot = String(req.body?.slot || '');
    const label = String(req.body?.label || '').trim();
    const houseId = currentHouseId(req);
    const apartmentId = req.body?.apartmentId == null || req.body.apartmentId === ''
      ? null
      : Number(req.body.apartmentId);

    if (hasLegacyResource === hasPackageResources) {
      return res.status(400).json({ error: 'Bitte entweder einen Legacy-Einzeltermin oder ein Dauerpaket angeben.' });
    }
    const weekdayMinimum = bookingRuleMode(houseId) === 'liberal' ? 0 : 1;
    if (!Number.isInteger(weekday) || weekday < weekdayMinimum || weekday > 6 || !slots.includes(slot)) {
      return res.status(400).json({ error: 'Ungueltige feste Buchung' });
    }
    if (!isValidPlainText(label, 2, 80)) {
      return res.status(400).json({ error: 'Bitte einen Namen oder Hinweis eintragen' });
    }
    if (apartmentId != null && (
      !Number.isInteger(apartmentId)
      || !db.prepare('SELECT 1 FROM apartments WHERE id = ? AND house_id = ? AND active = 1').get(apartmentId, houseId)
    )) {
      return res.status(404).json({ error: 'Die zugeordnete Wohnung wurde im aktiven Haus nicht gefunden.' });
    }

    try {
      if (hasLegacyResource) {
        const resourceId = Number(req.body.resourceId);
        if (!Number.isInteger(resourceId)) throw packageRequestError(400, 'Ungueltige feste Buchung');
        const resource = db.prepare(`
          SELECT id, type FROM resources
          WHERE id = ? AND active = 1 AND house_id = ?
        `).get(resourceId, houseId);
        if (!resource) throw packageRequestError(404, 'Geraet nicht gefunden');
        if (resource.type === 'tumbler') ensureFixedTumblerReserve(houseId, weekday, slot);
        ensureFixedRowsAvailable([{ resourceId, weekday, slot }], houseId);
        const result = db.prepare(`
          INSERT INTO fixed_bookings (resource_id, weekday, slot, label, apartment_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(resourceId, weekday, slot, label, apartmentId, req.session.user.id);
        writeAudit(req, 'fixed_booking.create', 'fixed_booking', result.lastInsertRowid, {
          resourceId, weekday, slot, label
        });
        return res.status(201).json({ id: result.lastInsertRowid, legacy: true, message: 'Feste Buchung gespeichert.' });
      }

      if (!Array.isArray(req.body.resourceIds) || req.body.resourceIds.length < 1 || req.body.resourceIds.length > 3) {
        throw packageRequestError(400, 'Ein Dauerpaket braucht eine Waschmaschine und hoechstens zwei optionale Ressourcen.');
      }
      const resourceIds = req.body.resourceIds.map(Number);
      if (resourceIds.some((id) => !Number.isInteger(id)) || new Set(resourceIds).size !== resourceIds.length) {
        throw packageRequestError(400, 'Das Dauerpaket enthaelt ungueltige oder doppelte Ressourcen.');
      }
      const placeholders = resourceIds.map(() => '?').join(', ');
      const resources = db.prepare(`
        SELECT id, name, type FROM resources
        WHERE active = 1 AND house_id = ? AND id IN (${placeholders})
      `).all(houseId, ...resourceIds);
      if (resources.length !== resourceIds.length) {
        throw packageRequestError(404, 'Eine Ressource des Dauerpakets ist nicht verfuegbar oder gehoert zu einem anderen Haus.');
      }
      const washers = resources.filter((resource) => resource.type === 'washer');
      const dryingRooms = resources.filter((resource) => resource.type === 'drying_room');
      const tumblers = resources.filter((resource) => resource.type === 'tumbler');
      if (washers.length !== 1 || dryingRooms.length > 1 || tumblers.length > 1) {
        throw packageRequestError(400, 'Ein Dauerpaket braucht genau eine Waschmaschine und optional je einen Trockenraum und Tumbler.');
      }

      const liberal = bookingRuleMode(houseId) === 'liberal';
      const dryingDurationSlots = dryingRooms.length ? (liberal ? 1 : Number(req.body?.dryingDurationSlots)) : null;
      if (!dryingRooms.length && req.body?.dryingDurationSlots != null) {
        throw packageRequestError(400, 'Eine Trocknungsdauer ist nur mit einem Trockenraum zulaessig.');
      }
      const dryingWindow = dryingRooms.length
        ? (liberal ? [{ weekday, slot }] : fixedDryingWindow(weekday, slot, dryingDurationSlots))
        : [];
      if (dryingRooms.length && !dryingWindow) {
        throw packageRequestError(400, 'Die Trocknungsdauer ist fuer diesen Wochentag und Waschslot nicht zulaessig.');
      }
      const rows = [
        { resourceId: washers[0].id, weekday, slot, type: 'washer' },
        ...dryingWindow.map((item) => ({
          resourceId: dryingRooms[0].id,
          weekday: item.weekday,
          slot: item.slot,
          type: 'drying_room'
        })),
        ...tumblers.map((resource) => ({ resourceId: resource.id, weekday, slot, type: 'tumbler' }))
      ];
      ensureFixedRowsAvailable(rows, houseId);
      if (tumblers.length) ensureFixedTumblerReserve(houseId, weekday, slot);

      const groupId = crypto.randomUUID();
      const createFixedPackage = db.transaction(() => {
        ensureFixedRowsAvailable(rows, houseId);
        if (tumblers.length) ensureFixedTumblerReserve(houseId, weekday, slot);
        const insert = db.prepare(`
          INSERT INTO fixed_bookings
            (resource_id, weekday, slot, label, group_id, drying_duration_slots, apartment_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return rows.map((row) => {
          const result = insert.run(
            row.resourceId,
            row.weekday,
            row.slot,
            label,
            groupId,
            row.type === 'drying_room' ? dryingDurationSlots : null,
            apartmentId,
            req.session.user.id
          );
          return { id: result.lastInsertRowid, ...row };
        });
      });
      const created = createFixedPackage();
      writeAudit(req, 'fixed_booking.create', 'fixed_booking_group', groupId, {
        resourceIds, weekday, slot, dryingDurationSlots, label
      });
      return res.status(201).json({
        id: created[0].id,
        groupId,
        created,
        legacy: false,
        message: 'Dauerpaket gespeichert.'
      });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Ein Bestandteil des Dauertermins wurde inzwischen reserviert.' });
      }
      return next(error);
    }
  });

  fixedBookingsRouter.delete('/api/admin/fixed-bookings/:id', requireAdmin, (req, res) => {
    const houseId = currentHouseId(req);
    const fixedBooking = db.prepare(`
      SELECT fb.id, fb.group_id
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.id = ? AND fb.active = 1 AND r.house_id = ?
    `).get(Number(req.params.id), houseId);
    if (!fixedBooking) {
      return res.status(404).json({ error: 'Feste Buchung nicht gefunden' });
    }

    let targetRows = [fixedBooking];
    if (fixedBooking.group_id) {
      targetRows = db.prepare(`
        SELECT fb.id, r.house_id
        FROM fixed_bookings fb
        JOIN resources r ON r.id = fb.resource_id
        WHERE fb.group_id = ? AND fb.active = 1
      `).all(fixedBooking.group_id);
      if (!targetRows.length || targetRows.some((row) => Number(row.house_id) !== houseId)) {
        return res.status(409).json({ error: 'Das Dauerpaket ist nicht eindeutig dem aktiven Haus zugeordnet.' });
      }
    }

    db.transaction(() => {
      const deactivate = db.prepare('UPDATE fixed_bookings SET active = 0 WHERE id = ?');
      for (const row of targetRows) deactivate.run(row.id);
    })();
    writeAudit(
      req,
      'fixed_booking.delete',
      fixedBooking.group_id ? 'fixed_booking_group' : 'fixed_booking',
      fixedBooking.group_id || fixedBooking.id,
      { deleted: targetRows.length }
    );
    res.json({
      ok: true,
      deleted: targetRows.length,
      message: fixedBooking.group_id ? 'Dauerpaket entfernt.' : 'Feste Buchung entfernt.'
    });
  });

  return { preferencesRouter, planningRouter, bookingsRouter, adminResetRouter, fixedBookingsRouter, calendarFeedRouter };
}

module.exports = { createBookingRouters };
