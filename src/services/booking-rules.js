function createBookingRules({
  db,
  slots,
  addDays,
  weekdayForDate,
  releaseWindowStatus,
  todayStringLocal,
  isDateString,
  isPastSwissDate,
  isPastSwissSlot
}) {
  function getFixedBookingsForDate(dateString, houseId) {
    const weekday = weekdayForDate(dateString);
    if (weekday === 0) {
      return [];
    }

    return db.prepare(`
      SELECT 'fixed-' || fb.id AS id, ? AS booking_date, fb.slot, r.id AS resource_id, r.name AS resource_name,
             r.type AS resource_type, NULL AS user_id, fb.label AS username,
             1 AS is_fixed, fb.weekday
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1
        AND r.active = 1
        AND r.house_id = ?
        AND fb.weekday = ?
      ORDER BY fb.slot, r.name
    `).all(dateString, houseId, weekday);
  }

  function fixedBookingConflict(resourceId, dateString, slot, houseId) {
    const weekday = weekdayForDate(dateString);
    if (weekday === 0) {
      return null;
    }

    return db.prepare(`
      SELECT fb.id, fb.label, r.name AS resource_name
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1
        AND fb.resource_id = ?
        AND r.house_id = ?
        AND fb.weekday = ?
        AND fb.slot = ?
      LIMIT 1
    `).get(Number(resourceId), houseId, weekday, slot);
  }

  function allowedDryingRoomSlots(washDate, washSlot) {
    const nextDate = addDays(washDate, 1);

    if (washSlot === '07:00-12:00') {
      return [
        { date: washDate, slot: '07:00-12:00' },
        { date: washDate, slot: '12:00-17:00' },
        { date: washDate, slot: '17:00-21:00' }
      ];
    }

    if (washSlot === '12:00-17:00') {
      return [
        { date: washDate, slot: '12:00-17:00' },
        { date: washDate, slot: '17:00-21:00' },
        { date: nextDate, slot: '07:00-12:00' }
      ];
    }

    if (washSlot === '17:00-21:00') {
      return [
        { date: washDate, slot: '17:00-21:00' },
        { date: nextDate, slot: '07:00-12:00' }
      ];
    }

    return [];
  }

  function hasAllowedDryingRoomWindow(userId, date, slot, houseId) {
    const previousDate = addDays(date, -1);
    const washerBookings = db.prepare(`
      SELECT b.booking_date, b.slot
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'washer'
        AND r.house_id = ?
        AND b.booking_date IN (?, ?)
    `).all(userId, houseId, date, previousDate);

    return washerBookings.some((booking) => (
      allowedDryingRoomSlots(booking.booking_date, booking.slot)
        .some((allowed) => allowed.date === date && allowed.slot === slot)
    ));
  }

  function validateWasherBooking(userId, date, slot, houseId) {
    const today = todayStringLocal();
    const washerBookings = db.prepare(`
      SELECT b.booking_date, b.slot
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'washer'
        AND r.house_id = ?
        AND b.booking_date >= ?
    `).all(userId, houseId, today);

    const sameDayDifferentSlot = washerBookings.find((booking) => (
      booking.booking_date === date && booking.slot !== slot
    ));
    if (sameDayDifferentSlot) {
      return 'Pro Waschtag darf nur ein Waschmaschinen-Slot reserviert werden.';
    }

    const otherFutureWashDay = washerBookings.find((booking) => (
      booking.booking_date > today && booking.booking_date !== date
    ));
    if (date > today && otherFutureWashDay) {
      return 'Der n\u00e4chste Waschslot kann fr\u00fchestens am bestehenden Waschtag reserviert werden.';
    }

    return '';
  }

  function validateTumblerBooking(date, slot, houseId) {
    const totalTumblers = db.prepare(`
      SELECT COUNT(*) AS count
      FROM resources
      WHERE active = 1 AND type = 'tumbler' AND house_id = ?
    `).get(houseId).count;

    const bookedTumblers = db.prepare(`
      SELECT COUNT(*) AS count
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.type = 'tumbler'
        AND r.house_id = ?
        AND b.booking_date = ?
        AND b.slot = ?
    `).get(houseId, date, slot).count;

    const fixedTumblers = db.prepare(`
      SELECT COUNT(*) AS count
      FROM fixed_bookings fb
      JOIN resources r ON r.id = fb.resource_id
      WHERE fb.active = 1
        AND r.type = 'tumbler'
        AND r.house_id = ?
        AND fb.weekday = ?
        AND fb.slot = ?
    `).get(houseId, weekdayForDate(date), slot).count;

    if (bookedTumblers + fixedTumblers >= Math.max(0, totalTumblers - 1)) {
      return 'Mindestens ein Tumbler muss am Ende des Waschslots frei bleiben.';
    }

    return '';
  }

  function validateDryingRoomBooking(userId, date, slot, houseId) {
    const userDryingRoomInSlot = db.prepare(`
      SELECT b.id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'drying_room'
        AND r.house_id = ?
        AND b.booking_date = ?
        AND b.slot = ?
      LIMIT 1
    `).get(userId, houseId, date, slot);

    if (userDryingRoomInSlot) {
      return 'Pro Slot kann nur ein Trockenraum reserviert werden.';
    }

    if (!hasAllowedDryingRoomWindow(userId, date, slot, houseId)) {
      return 'Trockenr\u00e4ume k\u00f6nnen nur passend zu deiner Waschmaschinen-Buchung reserviert werden: 07:00 bis 21:00, 12:00 bis Folgetag 12:00, 17:00 bis Folgetag 12:00.';
    }

    return '';
  }

  function calendarDaySummary(userId, date, houseId) {
    const closed = isSunday(date);
    const activeResources = db.prepare(`
      SELECT id, name, type
      FROM resources
      WHERE active = 1 AND house_id = ?
      ORDER BY type, name
    `).all(houseId);
    const normalBookings = db.prepare(`
      SELECT b.resource_id, b.slot, b.user_id, r.name AS resource_name, r.type AS resource_type
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.booking_date = ? AND r.house_id = ?
    `).all(date, houseId);
    const fixedBookings = getFixedBookingsForDate(date, houseId);
    const occupied = new Set([
      ...normalBookings.map((booking) => `${booking.resource_id}|${booking.slot}`),
      ...fixedBookings.map((booking) => `${booking.resource_id}|${booking.slot}`)
    ]);
    const availability = {};
    const ownByType = { washer: 0, drying_room: 0, tumbler: 0 };
    const slotDetails = [];

    for (const booking of normalBookings) {
      if (booking.user_id === userId) {
        ownByType[booking.resource_type] += 1;
      }
    }

    for (const type of ['washer', 'drying_room', 'tumbler']) {
      const typeResources = activeResources.filter((resource) => resource.type === type);
      let free = 0;
      let total = 0;
      let freeSlots = 0;
      let totalSlots = 0;

      for (const slot of closed ? [] : slots) {
        if (isPastSlot(date, slot)) {
          continue;
        }
        const capacity = type === 'tumbler'
          ? Math.max(0, typeResources.length - 1)
          : typeResources.length;
        const occupiedCount = typeResources
          .filter((resource) => occupied.has(`${resource.id}|${slot}`)).length;
        const freeCapacity = Math.max(0, capacity - occupiedCount);
        total += capacity;
        free += freeCapacity;
        totalSlots += capacity > 0 ? 1 : 0;
        freeSlots += freeCapacity > 0 ? 1 : 0;
      }

      availability[type] = { free, total, freeSlots, totalSlots };
    }

    for (const slot of slots) {
      const past = isPastSlot(date, slot);
      const types = {};

      for (const type of ['washer', 'drying_room', 'tumbler']) {
        const typeResources = activeResources.filter((resource) => resource.type === type);
        const capacity = type === 'tumbler'
          ? Math.max(0, typeResources.length - 1)
          : typeResources.length;
        const occupiedResources = typeResources.filter((resource) => occupied.has(`${resource.id}|${slot}`));
        const occupiedCount = occupiedResources.length;
        const bookable = closed || past ? 0 : Math.max(0, capacity - occupiedCount);
        const ownResourceIds = new Set(normalBookings
          .filter((booking) => booking.user_id === userId && booking.slot === slot)
          .map((booking) => booking.resource_id));
        const resourceStates = typeResources.map((resource) => {
          const isOccupied = occupied.has(`${resource.id}|${slot}`);
          let state = 'free';
          if (ownResourceIds.has(resource.id)) state = 'own';
          else if (isOccupied) state = 'booked';
          else if (closed) state = 'closed';
          else if (past) state = 'past';
          else if (type === 'tumbler' && bookable === 0) state = 'reserve';
          return { resourceId: resource.id, resourceName: resource.name, state };
        });

        types[type] = {
          total: capacity,
          free: bookable,
          occupied: Math.min(capacity, occupiedCount),
          resources: resourceStates
        };
      }

      slotDetails.push({ slot, past, types });
    }

    return {
      date,
      closed,
      availability,
      slotDetails,
      ownBookings: Object.values(ownByType).reduce((sum, count) => sum + count, 0),
      ownByType
    };
  }

  function findAvailableResources(userId, type, date, slot, houseId, limit = 1) {
    if (isPastSlot(date, slot)) {
      return [];
    }

    let ruleError = '';
    if (type === 'washer') {
      ruleError = validateWasherBooking(userId, date, slot, houseId);
    } else if (type === 'drying_room') {
      ruleError = validateDryingRoomBooking(userId, date, slot, houseId);
    } else if (type === 'tumbler') {
      ruleError = validateTumblerBooking(date, slot, houseId);
    }
    if (ruleError) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(20, Number(limit) || 1));
    return db.prepare(`
      SELECT r.id, r.name, r.type
      FROM resources r
      WHERE r.active = 1
        AND r.type = ?
        AND r.house_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.resource_id = r.id
            AND b.booking_date = ?
            AND b.slot = ?
        )
        AND NOT EXISTS (
          SELECT 1
          FROM fixed_bookings fb
          WHERE fb.resource_id = r.id
            AND fb.active = 1
            AND fb.weekday = ?
            AND fb.slot = ?
        )
      ORDER BY r.name
      LIMIT ?
    `).all(type, houseId, date, slot, weekdayForDate(date), slot, safeLimit);
  }

  function findAvailableResource(userId, type, date, slot, houseId) {
    return findAvailableResources(userId, type, date, slot, houseId, 1)[0] || null;
  }

  function userHasBookingInWindow(userId, type, window, houseId) {
    return window.some(({ date, slot }) => Boolean(db.prepare(`
      SELECT b.id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = ?
        AND r.house_id = ?
        AND b.booking_date = ?
        AND b.slot = ?
      LIMIT 1
    `).get(userId, type, houseId, date, slot)));
  }

  function findAvailableResourceForWindow(type, window, houseId) {
    if (!window.length || window.some((item) => isPastSlot(item.date, item.slot) || isSunday(item.date))) {
      return null;
    }

    const resourcesForType = db.prepare(`
      SELECT id, name, type
      FROM resources
      WHERE active = 1 AND type = ? AND house_id = ?
      ORDER BY name
    `).all(type, houseId);
    const occupied = db.prepare(`
      SELECT id
      FROM bookings
      WHERE resource_id = ? AND booking_date = ? AND slot = ?
      LIMIT 1
    `);

    return resourcesForType.find((resource) => window.every((item) => (
      !occupied.get(resource.id, item.date, item.slot)
      && !fixedBookingConflict(resource.id, item.date, item.slot, houseId)
    ))) || null;
  }

  function bestDryingRoomWindow(washDate, washSlot, houseId) {
    const allowedWindow = allowedDryingRoomSlots(washDate, washSlot);
    for (let length = allowedWindow.length; length >= 1; length -= 1) {
      const window = allowedWindow.slice(0, length);
      const resource = findAvailableResourceForWindow('drying_room', window, houseId);
      if (resource) {
        return { resource, maxWindow: window };
      }
    }
    return null;
  }

  function dryingWindowOptions(resource, maxWindow) {
    const lengths = [...new Set([1, Math.min(2, maxWindow.length), maxWindow.length])];
    return lengths.map((length) => {
      const window = maxWindow.slice(0, length);
      const end = window[window.length - 1];
      const dateLabel = end.date === window[0].date ? '' : ` am ${end.date}`;
      return {
        id: length === 1 ? 'short' : length === maxWindow.length ? 'max' : 'standard',
        label: `${length === 1 ? 'Kurz' : length === maxWindow.length ? 'Maximal' : 'Standard'} - bis ${end.slot.split('-')[1]}${dateLabel}`,
        bookings: window.map((booking) => ({
          resourceId: resource.id,
          date: booking.date,
          slot: booking.slot
        }))
      };
    });
  }

  function availableDryingRoomsForWasher(userId, washDate, washSlot, houseId) {
    const allowedWindow = allowedDryingRoomSlots(washDate, washSlot);
    const dryingRooms = db.prepare(`
      SELECT id, name, type
      FROM resources
      WHERE active = 1 AND type = 'drying_room' AND house_id = ?
      ORDER BY name
    `).all(houseId);
    const occupied = db.prepare(`
      SELECT id
      FROM bookings
      WHERE resource_id = ? AND booking_date = ? AND slot = ?
      LIMIT 1
    `);
    const ownDryingBooking = db.prepare(`
      SELECT b.id
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'drying_room'
        AND r.house_id = ?
        AND b.booking_date = ?
        AND b.slot = ?
      LIMIT 1
    `);

    return dryingRooms.flatMap((resource) => {
      const availableWindow = [];
      for (const item of allowedWindow) {
        const unavailable = isPastSlot(item.date, item.slot)
          || isSunday(item.date)
          || occupied.get(resource.id, item.date, item.slot)
          || fixedBookingConflict(resource.id, item.date, item.slot, houseId)
          || ownDryingBooking.get(userId, houseId, item.date, item.slot);
        if (unavailable) {
          break;
        }
        availableWindow.push(item);
      }
      if (!availableWindow.length) {
        return [];
      }
      const bookingOptions = dryingWindowOptions(resource, availableWindow);
      const preferredLength = Math.min(2, availableWindow.length);
      return [{
        resourceId: resource.id,
        resourceName: resource.name,
        bookingOptions,
        selectedOption: bookingOptions.find((option) => option.bookings.length === preferredLength)?.id
          || bookingOptions[0].id
      }];
    });
  }

  function packageComponent(type, resource, bookings, options = {}) {
    return {
      id: String(options.id || type),
      type,
      resourceName: resource.name,
      required: Boolean(options.required),
      existing: Boolean(options.existing),
      selectedByDefault: Boolean(options.required || options.selectedByDefault),
      recommendationLabel: String(options.recommendationLabel || ''),
      bookingOptions: options.bookingOptions || [],
      selectedOption: String(options.selectedOption || ''),
      bookings: bookings.map((booking) => ({
        resourceId: resource.id,
        date: booking.date,
        slot: booking.slot
      }))
    };
  }

  function companionPackageRecommendation(userId, washerBooking, houseId) {
    const components = [packageComponent('washer', {
      id: washerBooking.resource_id,
      name: washerBooking.resource_name
    }, [], { required: true, existing: true })];
    const dryingWindow = allowedDryingRoomSlots(washerBooking.booking_date, washerBooking.slot);

    if (!userHasBookingInWindow(userId, 'drying_room', dryingWindow, houseId)) {
      const drying = bestDryingRoomWindow(washerBooking.booking_date, washerBooking.slot, houseId);
      if (drying) {
        const suggestedWindow = drying.maxWindow.slice(0, Math.min(2, drying.maxWindow.length));
        const options = dryingWindowOptions(drying.resource, drying.maxWindow);
        components.push(packageComponent('drying_room', drying.resource, suggestedWindow, {
          selectedByDefault: true,
          recommendationLabel: 'Empfohlen',
          bookingOptions: options,
          selectedOption: options.find((option) => option.bookings.length === suggestedWindow.length)?.id
        }));
      }
    }

    const tumblerWindow = [{ date: washerBooking.booking_date, slot: washerBooking.slot }];
    if (!userHasBookingInWindow(userId, 'tumbler', tumblerWindow, houseId)) {
      const tumbler = findAvailableResource(
        userId,
        'tumbler',
        washerBooking.booking_date,
        washerBooking.slot,
        houseId
      );
      if (tumbler) {
        components.push(packageComponent('tumbler', tumbler, tumblerWindow, {
          selectedByDefault: true,
          recommendationLabel: 'Ausgew\u00e4hlt'
        }));
      }
    }

    if (components.length === 1) {
      return null;
    }
    const hasDryingRoom = components.some((component) => component.type === 'drying_room');

    return {
      kind: 'package',
      washerBookingId: washerBooking.id,
      date: washerBooking.booking_date,
      slot: washerBooking.slot,
      resourceType: 'washer',
      title: 'Waschpaket erg\u00e4nzen',
      reason: hasDryingRoom
        ? 'Die Waschmaschine ist bereits gebucht. Im gef\u00fchrten Ablauf kannst du passende Trocknungsoptionen erg\u00e4nzen.'
        : 'Die Waschmaschine ist bereits gebucht. Der gef\u00fchrte Ablauf zeigt dir, welche Trocknungsoptionen noch verf\u00fcgbar sind.',
      actionLabel: 'Paket erg\u00e4nzen',
      components
    };
  }

  function washerHistoryPreference(userId, houseId) {
    return db.prepare(`
      SELECT CAST(strftime('%w', b.booking_date) AS INTEGER) AS weekday,
             b.slot,
             COUNT(*) AS count,
             MAX(b.booking_date) AS last_date
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'washer'
        AND r.house_id = ?
        AND b.booking_date < ?
      GROUP BY weekday, b.slot
      ORDER BY count DESC, last_date DESC
      LIMIT 1
    `).get(userId, houseId, todayStringLocal()) || null;
  }

  function washerPackageRecommendation(userId, washer, reason, houseId) {
    const washWindow = [{ date: washer.date, slot: washer.slot }];
    const washerResources = washer.resources?.length
      ? washer.resources
      : findAvailableResources(userId, 'washer', washer.date, washer.slot, houseId, 3);
    if (!washerResources.length) {
      return null;
    }
    const components = washerResources.map((resource, index) => packageComponent(
      'washer',
      resource,
      washWindow,
      {
        id: `washer-${resource.id}`,
        required: index === 0,
        recommendationLabel: index === 0 ? 'Dabei' : 'Bei Bedarf'
      }
    ));
    const drying = bestDryingRoomWindow(washer.date, washer.slot, houseId);
    const tumbler = findAvailableResource(userId, 'tumbler', washer.date, washer.slot, houseId);

    if (drying) {
      const suggestedWindow = drying.maxWindow.slice(0, Math.min(2, drying.maxWindow.length));
      const options = dryingWindowOptions(drying.resource, drying.maxWindow);
      components.push(packageComponent('drying_room', drying.resource, suggestedWindow, {
        selectedByDefault: true,
        recommendationLabel: 'Empfohlen',
        bookingOptions: options,
        selectedOption: options.find((option) => option.bookings.length === suggestedWindow.length)?.id
      }));
    }
    if (tumbler) {
      components.push(packageComponent('tumbler', tumbler, washWindow, {
        selectedByDefault: true,
        recommendationLabel: 'Ausgew\u00e4hlt'
      }));
    }
    if (components.every((component) => component.type === 'washer')) {
      return null;
    }
    const hasDryingRoom = components.some((component) => component.type === 'drying_room');
    const hasTumbler = components.some((component) => component.type === 'tumbler');

    return {
      kind: 'package',
      date: washer.date,
      slot: washer.slot,
      resourceType: 'washer',
      title: 'Dein Waschpaket',
      reason: hasDryingRoom && hasTumbler
        ? `${reason} W\u00e4hle den Termin und stelle danach Waschmaschinen, Trockenraum und Tumbler Schritt f\u00fcr Schritt zusammen.`
        : hasDryingRoom
          ? `${reason} W\u00e4hle den Termin und erg\u00e4nze danach bei Bedarf einen Trockenraum.`
          : `${reason} W\u00e4hle den Termin und entscheide danach, ob du einen Tumbler brauchst.`,
      actionLabel: 'Waschpaket buchen',
      components
    };
  }

  function nextWasherRecommendation(userId, startDate, houseId) {
    const preference = washerHistoryPreference(userId, houseId);
    const candidates = [];
    let fallback = null;
    let compactPackage = null;
    let compactPackageScore = Number.POSITIVE_INFINITY;

    for (let offset = 0; offset < 21; offset += 1) {
      const date = addDays(startDate, offset);
      const weekday = weekdayForDate(date);
      if (weekday === 0) {
        continue;
      }
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        const slot = slots[slotIndex];
        const score = preference
          ? offset + (weekday === preference.weekday ? 0 : 8) + (slot === preference.slot ? 0 : 4)
          : offset * slots.length + slotIndex;
        candidates.push({ date, slot, weekday, score });
      }
    }
    candidates.sort((left, right) => left.score - right.score || left.date.localeCompare(right.date));

    for (const candidate of candidates) {
      if (compactPackage && candidate.score > compactPackageScore + 8) {
        break;
      }
      if (releaseWindowStatus(candidate.date, candidate.slot).reason !== 'not_started') {
        continue;
      }
      const resources = findAvailableResources(userId, 'washer', candidate.date, candidate.slot, houseId, 3);
      const resource = resources[0];
      if (!resource) {
        continue;
      }
      const matchesHabit = Boolean(
        preference
        && candidate.weekday === preference.weekday
        && candidate.slot === preference.slot
      );
      const reason = preference
        ? (matchesHabit
          ? 'Dieser freie Termin entspricht deinem bisher h\u00e4ufigsten Waschrhythmus.'
          : 'Dein \u00fcblicher Termin ist belegt. Dies ist die n\u00e4chste passende freie Option.')
        : 'Ein fr\u00fcher freier Termin f\u00fcr deinen ersten Waschrhythmus.';
      const washer = {
        kind: 'booking',
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        date: candidate.date,
        slot: candidate.slot,
        title: preference ? 'Dein passender Waschslot' : 'N\u00e4chster freier Waschslot',
        reason,
        actionLabel: 'Direkt buchen'
      };
      fallback ||= washer;
      const packageRecommendation = washerPackageRecommendation(userId, {
        resources,
        date: candidate.date,
        slot: candidate.slot
      }, reason, houseId);
      if (packageRecommendation) {
        if (packageRecommendation.components.some((component) => component.type === 'drying_room')) {
          return packageRecommendation;
        }
        if (!compactPackage) {
          compactPackage = packageRecommendation;
          compactPackageScore = candidate.score;
        }
      }
    }
    return compactPackage || fallback;
  }

  function bookingRecommendation(userId, houseId) {
    const today = todayStringLocal();
    const upcomingWashers = db.prepare(`
      SELECT b.id, b.booking_date, b.slot, r.id AS resource_id, r.name AS resource_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE b.user_id = ?
        AND r.type = 'washer'
        AND r.house_id = ?
        AND b.booking_date >= ?
      ORDER BY b.booking_date, b.slot, b.id
    `).all(userId, houseId, today);

    for (const washerBooking of upcomingWashers) {
      const companion = companionPackageRecommendation(userId, washerBooking, houseId);
      if (companion) {
        return companion;
      }
    }

    const futureWasher = upcomingWashers.find((booking) => booking.booking_date > today);
    if (futureWasher) {
      return {
        kind: 'info',
        date: futureWasher.booking_date,
        slot: futureWasher.slot,
        title: 'Dein n\u00e4chster Waschtag steht',
        reason: 'Waschmaschine und sinnvolle Erg\u00e4nzungen sind bereits geplant.'
      };
    }

    const startDate = upcomingWashers.some((booking) => booking.booking_date === today)
      ? addDays(today, 1)
      : today;
    return nextWasherRecommendation(userId, startDate, houseId) || {
      kind: 'info',
      title: 'Im Moment keine freie Empfehlung',
      reason: 'In den n\u00e4chsten drei Wochen ist kein regelkonformer Waschslot frei.'
    };
  }

  function isSunday(dateString) {
    return weekdayForDate(dateString) === 0;
  }

  function isPastDate(dateString) {
    return isPastSwissDate(dateString);
  }

  function isPastSlot(dateString, slot) {
    if (!isDateString(dateString) || !slots.includes(slot)) {
      return false;
    }
    return isPastSwissSlot(dateString, slot);
  }

  function slotEndLabel(slot) {
    return slot.split('-')[1] || slot;
  }

  return {
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
  };
}

module.exports = { createBookingRules };
