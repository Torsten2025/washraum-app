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
  bookingRules
}) {
  const preferencesRouter = express.Router();
  const planningRouter = express.Router();
  const bookingsRouter = express.Router();
  const adminResetRouter = express.Router();
  const fixedBookingsRouter = express.Router();
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
    slotEndLabel
  } = bookingRules;

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

    res.json({
      from,
      days: Array.from({ length: days }, (_, index) => (
        calendarDaySummary(req.session.user.bookingUserId, addDays(from, index), houseId)
      ))
    });
  });

  planningRouter.get('/api/booking-options', requireAuth, (req, res) => {
    const date = String(req.query.date || '');
    const selectedSlot = String(req.query.slot || '');
    const houseId = currentHouseId(req);
    if (!isDateString(date) || (selectedSlot && !slots.includes(selectedSlot))) {
      return res.status(400).json({ error: 'Ung\u00fcltiger Buchungszeitraum' });
    }

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
      const unavailableByTime = isSunday(date) || isPastSlot(date, slot);
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
      closed: isSunday(date),
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

  bookingsRouter.get('/api/my-bookings', requireAuth, (req, res) => {
    const bookings = db.prepare(`
      SELECT b.id, b.booking_date, b.slot, b.group_id, r.id AS resource_id, r.name AS resource_name,
             r.type AS resource_type, u.id AS user_id,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id
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
          ...booking,
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
      SELECT b.id, b.booking_date, b.slot, r.id AS resource_id, r.name AS resource_name,
             r.type AS resource_type, u.id AS user_id,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username, 0 AS is_fixed
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE b.booking_date = ? AND r.house_id = ?
      ORDER BY b.slot, r.name
    `).all(date, houseId);

    const fixedBookings = getFixedBookingsForDate(date, houseId);
    const allBookings = [...bookings, ...fixedBookings]
      .sort((left, right) => left.slot.localeCompare(right.slot) || left.resource_name.localeCompare(right.resource_name));

    res.json({ bookings: allBookings });
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
    if (isSunday(date)) {
      return res.status(400).json({ error: 'Sonntags sind keine Buchungen m\u00f6glich' });
    }

    const resource = db.prepare(`
      SELECT id, type FROM resources
      WHERE id = ? AND active = 1 AND house_id = ?
    `).get(Number(resourceId), houseId);
    if (!resource) {
      return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
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
          SELECT b.id, b.user_id, b.booking_date, b.slot, b.group_id,
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
      if (isSunday(washDate)) {
        throw packageRequestError(400, 'Sonntags sind keine Buchungen m\u00f6glich.');
      }

      if (newWashers.some((item) => item.date !== washDate || item.slot !== washSlot)) {
        throw packageRequestError(400, 'Alle Waschmaschinen im Paket m\u00fcssen im gleichen Zeitfenster liegen.');
      }

      if (tumblerItems.length > 1 || tumblerItems.some((item) => item.date !== washDate || item.slot !== washSlot)) {
        throw packageRequestError(400, 'Der Tumbler muss im gleichen Zeitfenster wie die Waschmaschine liegen.');
      }

      const allowedDryingWindow = allowedDryingRoomSlots(washDate, washSlot);
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
        if (isSunday(item.date)) {
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
      SELECT b.id, b.user_id
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

    db.prepare('DELETE FROM bookings WHERE group_id = ?').run(groupId);
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
      SELECT b.* FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.id = ? AND r.house_id = ?
    `).get(Number(req.params.id), currentHouseId(req));
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    if (!req.session.user.canManage && booking.user_id !== req.session.user.bookingUserId) {
      return res.status(403).json({ error: 'Diese Buchung geh\u00f6rt dir nicht' });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
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

      const releaseWindow = releaseWindowStatus(booking.booking_date, booking.slot);
      db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);

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
    const count = db.prepare(`
      SELECT COUNT(*) AS count
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.house_id = ?
    `).get(houseId).count;
    db.prepare(`
      DELETE FROM bookings
      WHERE id IN (
        SELECT b.id
        FROM bookings b
        JOIN resources r ON r.id = b.resource_id
        WHERE r.house_id = ?
      )
    `).run(houseId);
    writeAudit(req, 'bookings.reset', 'booking', '', { deleted: count });
    res.json({ ok: true, deleted: count, message: `${count} Buchungen wurden geloescht. Dauertermine bleiben erhalten.` });
  });

  fixedBookingsRouter.get('/api/admin/fixed-bookings', requireAdmin, (req, res) => {
    const fixedBookings = db.prepare(`
      SELECT fb.id, fb.resource_id, fb.weekday, fb.slot, fb.label, fb.created_at,
             r.name AS resource_name, r.type AS resource_type
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1 AND r.house_id = ?
      ORDER BY fb.weekday, fb.slot, r.name
    `).all(currentHouseId(req));

    res.json({ fixedBookings });
  });

  fixedBookingsRouter.post('/api/admin/fixed-bookings', requireAdmin, (req, res) => {
    const resourceId = Number(req.body?.resourceId);
    const weekday = Number(req.body?.weekday);
    const slot = String(req.body?.slot || '');
    const label = String(req.body?.label || '').trim();

    if (!Number.isInteger(resourceId) || !Number.isInteger(weekday) || weekday < 1 || weekday > 6 || !slots.includes(slot)) {
      return res.status(400).json({ error: 'Ung\u00fcltige feste Buchung' });
    }
    if (!isValidPlainText(label, 2, 80)) {
      return res.status(400).json({ error: 'Bitte einen Namen oder Hinweis eintragen' });
    }

    const resource = db.prepare(`
      SELECT id, type FROM resources
      WHERE id = ? AND active = 1 AND house_id = ?
    `).get(resourceId, currentHouseId(req));
    if (!resource) {
      return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden' });
    }

    if (resource.type === 'tumbler') {
      const totalTumblers = db.prepare(`
        SELECT COUNT(*) AS count FROM resources
        WHERE active = 1 AND type = 'tumbler' AND house_id = ?
      `).get(currentHouseId(req)).count;
      const fixedTumblers = db.prepare(`
        SELECT COUNT(*) AS count
        FROM fixed_bookings fb
        JOIN resources r ON r.id = fb.resource_id
        WHERE fb.active = 1 AND r.type = 'tumbler' AND r.house_id = ?
          AND fb.weekday = ? AND fb.slot = ?
      `).get(currentHouseId(req), weekday, slot).count;
      if (fixedTumblers >= Math.max(0, totalTumblers - 1)) {
        return res.status(409).json({ error: 'Mindestens ein Tumbler muss in diesem Slot frei bleiben.' });
      }
    }

    const conflictingBooking = db.prepare(`
      SELECT b.id
      FROM bookings b
      WHERE b.resource_id = ?
        AND b.slot = ?
        AND b.booking_date >= ?
        AND CAST(strftime('%w', b.booking_date) AS INTEGER) = ?
      LIMIT 1
    `).get(resourceId, slot, todayStringLocal(), weekday);

    if (conflictingBooking) {
      return res.status(409).json({ error: 'Es gibt bereits eine normale zuk\u00fcnftige Buchung in diesem Dauer-Slot. Bitte zuerst kl\u00e4ren oder l\u00f6schen.' });
    }

    try {
      const result = db.prepare(`
        INSERT INTO fixed_bookings (resource_id, weekday, slot, label, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(resourceId, weekday, slot, label, req.session.user.id);

      writeAudit(req, 'fixed_booking.create', 'fixed_booking', result.lastInsertRowid, {
        resourceId, weekday, slot, label
      });

      res.status(201).json({
        id: result.lastInsertRowid,
        message: 'Feste Buchung gespeichert.'
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'F\u00fcr dieses Ger\u00e4t gibt es an diesem Wochentag und Slot bereits eine feste Buchung.' });
      }
      throw error;
    }
  });

  fixedBookingsRouter.delete('/api/admin/fixed-bookings/:id', requireAdmin, (req, res) => {
    const fixedBooking = db.prepare(`
      SELECT fb.id
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.id = ? AND fb.active = 1 AND r.house_id = ?
    `).get(Number(req.params.id), currentHouseId(req));
    if (!fixedBooking) {
      return res.status(404).json({ error: 'Feste Buchung nicht gefunden' });
    }

    db.prepare('UPDATE fixed_bookings SET active = 0 WHERE id = ?').run(fixedBooking.id);
    writeAudit(req, 'fixed_booking.delete', 'fixed_booking', fixedBooking.id);
    res.json({ ok: true, message: 'Feste Buchung entfernt.' });
  });

  return { preferencesRouter, planningRouter, bookingsRouter, adminResetRouter, fixedBookingsRouter };
}

module.exports = { createBookingRouters };
