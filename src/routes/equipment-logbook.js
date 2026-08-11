const express = require('express');

function createEquipmentLogbookRouter({
  db,
  requireAuth,
  requireResident,
  requireApartmentAccount,
  requireAdmin,
  currentHouseId,
  todayStringLocal,
  isSuperadmin,
  isValidPlainText,
  isValidMaintenanceText,
  maintenanceReporting,
  writeAudit,
  writeAuditForHouse
}) {
  const router = express.Router();

  router.get('/api/resources', requireAuth, (req, res) => {
    const resources = db.prepare(`
      SELECT id, name, type FROM resources
      WHERE active = 1 AND house_id = ?
      ORDER BY type, name
    `).all(currentHouseId(req));
    res.json({ resources });
  });

  router.get('/api/maintenance-resources', requireAuth, (req, res) => {
    const reportableResources = db.prepare(`
      SELECT id, name, type, active, blocked_reason
      FROM resources WHERE house_id = ? ORDER BY type, name
    `).all(currentHouseId(req));
    res.json({ resources: reportableResources });
  });

  function maintenanceCaseDetails(rows) {
    const entryQuery = db.prepare(`
      SELECT me.id, me.case_id, me.entry_type, me.note, me.created_at,
             u.role AS actor_role, me.created_by
      FROM maintenance_entries me
      LEFT JOIN users u ON u.id = me.created_by
      WHERE me.case_id = ?
      ORDER BY me.created_at, me.id
    `);
    const reportQuery = db.prepare(`
      SELECT mr.id, mr.title, mr.description, mr.created_at,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'Bewohner') AS reporter_name,
             u.email AS reporter_contact, mrp.push_enabled, mrp.email_enabled
      FROM maintenance_reports mr
      JOIN users u ON u.id = mr.reporter_user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id
      LEFT JOIN maintenance_report_preferences mrp ON mrp.report_id = mr.id
      WHERE mr.case_id = ?
      ORDER BY mr.created_at, mr.id
    `);
    const upcomingBookingQuery = db.prepare(`
      SELECT b.id, b.booking_date, b.slot,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS booking_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE b.resource_id = ? AND r.house_id = ? AND b.booking_date >= ?
      ORDER BY b.booking_date, b.slot, b.id
    `);
    return rows.map((row) => ({
      ...row,
      upcoming_bookings: row.resource_id
        ? upcomingBookingQuery.all(row.resource_id, row.house_id, todayStringLocal())
        : [],
      entries: entryQuery.all(row.id).map((entry) => ({
        id: entry.id,
        case_id: entry.case_id,
        entry_type: entry.entry_type,
        note: entry.note,
        created_at: entry.created_at,
        actor_ref: maintenanceReporting.actorReference(entry.created_by),
        actor_role: entry.actor_role || 'system'
      })),
      reports: reportQuery.all(row.id).map((report) => ({
        ...report,
        adminDelivery: maintenanceReporting.reportDeliverySummary(report.id),
        notificationPreferences: {
          push: Boolean(report.push_enabled),
          email: Boolean(report.email_enabled)
        }
      }))
    }));
  }

  function maintenanceCasesForHouse(houseId) {
    return maintenanceCaseDetails(db.prepare(`
      SELECT mc.id, mc.house_id, mc.resource_id, mc.title, mc.description, mc.status,
             mc.created_at, mc.updated_at, mc.closed_at,
             r.name AS resource_name, r.type AS resource_type, h.name AS house_name
      FROM maintenance_cases mc
      LEFT JOIN resources r ON r.id = mc.resource_id
      JOIN houses h ON h.id = mc.house_id
      WHERE mc.house_id = ?
      ORDER BY CASE mc.status WHEN 'reported' THEN 0 WHEN 'blocked' THEN 1 WHEN 'repairing' THEN 2 WHEN 'tested' THEN 3 ELSE 4 END,
               mc.updated_at DESC, mc.id DESC
      LIMIT 300
    `).all(houseId));
  }

  function maintenanceCasesForAdmin(req) {
    return maintenanceCasesForHouse(currentHouseId(req));
  }

  function maintenanceCaseForAdmin(req, caseId) {
    const maintenanceCase = db.prepare('SELECT * FROM maintenance_cases WHERE id = ?').get(caseId);
    if (!maintenanceCase) return null;
    if (Number(maintenanceCase.house_id) !== currentHouseId(req)) return null;
    return maintenanceCase;
  }

  function appendMaintenanceEntry(caseId, entryType, note, userId) {
    db.prepare(`
      INSERT INTO maintenance_entries (case_id, entry_type, note, created_by)
      VALUES (?, ?, ?, ?)
    `).run(caseId, entryType, note, userId || null);
    db.prepare('UPDATE maintenance_cases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(caseId);
  }

  function maintenanceCaseHasEntry(caseId, entryType) {
    return Boolean(db.prepare(`
      SELECT 1 FROM maintenance_entries
      WHERE case_id = ? AND entry_type = ?
      LIMIT 1
    `).get(caseId, entryType));
  }

  function upcomingBookingsForResource(resourceId, houseId) {
    return db.prepare(`
      SELECT b.id, b.booking_date, b.slot,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS booking_name
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE b.resource_id = ? AND r.house_id = ? AND b.booking_date >= ?
      ORDER BY b.booking_date, b.slot, b.id
    `).all(resourceId, houseId, todayStringLocal());
  }

  router.get('/api/maintenance-cases', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const houseId = currentHouseId(req);
    res.json({
      cases: maintenanceReporting.residentReports(req.session.user.id, houseId),
      notificationAvailability: maintenanceReporting.notificationAvailability(req.session.user.id, houseId)
    });
  });

  router.post('/api/maintenance-cases', requireAuth, requireResident, requireApartmentAccount, async (req, res, next) => {
    const resourceId = Number(req.body?.resourceId);
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const submissionKey = String(req.get('Idempotency-Key') || req.body?.submissionKey || '').trim();
    const notifyPush = req.body?.notifyPush === true;
    const notifyEmail = req.body?.notifyEmail === true;
    const houseId = currentHouseId(req);
    const resource = db.prepare('SELECT id, name FROM resources WHERE id = ? AND house_id = ?')
      .get(resourceId, houseId);
    if (!resource) return res.status(404).json({ error: 'Geraet oder Raum nicht gefunden.' });
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(submissionKey)) {
      return res.status(400).json({ error: 'Die Meldung benoetigt einen gueltigen Idempotenzschluessel.' });
    }
    if (!isValidPlainText(title, 3, 120) || !isValidMaintenanceText(description, 5, 1000)) {
      return res.status(400).json({ error: 'Bitte einen kurzen Titel und eine Beschreibung mit mindestens 5 Zeichen eingeben.' });
    }
    const availability = maintenanceReporting.notificationAvailability(req.session.user.id, houseId);
    if (notifyPush && !availability.push) {
      return res.status(409).json({
        code: 'PUSH_UNAVAILABLE',
        error: 'Fuer dieses Haus ist kein aktives Push-Geraet verfuegbar.'
      });
    }
    if (notifyEmail && !availability.email) {
      return res.status(409).json({ code: 'EMAIL_UNAVAILABLE', error: 'Bestaetige zuerst eine E-Mail-Adresse.' });
    }
    let created;
    try {
      created = maintenanceReporting.createReport({
        reporterUserId: req.session.user.id,
        houseId,
        submissionKey,
        input: { resourceId, title, description, notifyPush, notifyEmail }
      });
      if (created.conflict) {
        return res.status(409).json({ code: 'IDEMPOTENCY_CONFLICT', error: 'Dieser Meldungsschluessel wurde bereits mit anderen Angaben verwendet.' });
      }
      if (created.unavailable === 'push') {
        return res.status(409).json({ code: 'PUSH_UNAVAILABLE', error: 'Fuer dieses Haus ist kein aktives Push-Geraet verfuegbar.' });
      }
      if (created.unavailable === 'email') {
        return res.status(409).json({ code: 'EMAIL_UNAVAILABLE', error: 'Bestaetige zuerst eine E-Mail-Adresse.' });
      }
      if (created.notFound) return res.status(404).json({ error: 'Geraet oder Raum nicht gefunden.' });
    } catch (error) {
      return next(error);
    }
    let delivery = created.delivery;
    if (!created.replayed) {
      try {
        delivery = await maintenanceReporting.deliverAdminNotifications(req, created.id);
      } catch {
        console.error('Admin-Zustellung nach gespeicherter Stoerungsmeldung fehlgeschlagen.');
        delivery = { pending: created.delivery?.pending || 0, sent: 0, failed: 0, unavailable: 0, unknown: 0, processingFailed: true };
      }
    }
    return res.status(created.replayed ? 200 : 201).json({
      id: created.caseId,
      reportId: created.id,
      replayed: created.replayed,
      addedToExisting: created.addedToExisting,
      delivery,
      message: created.addedToExisting
        ? `Deine Beobachtung zu ${resource.name} wurde dem laufenden Tagebuchfall ergaenzt.`
        : `Stoerung zu ${resource.name} wurde an den Haus-Admin gemeldet.`
    });
  });

  router.put('/api/maintenance-reports/:id/preferences', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const result = maintenanceReporting.updateOwnPreferences({
      reportId: Number(req.params.id),
      reporterUserId: req.session.user.id,
      push: req.body?.push === true,
      email: req.body?.email === true
    });
    if (result.notFound) return res.status(404).json({ error: 'Meldung nicht gefunden.' });
    if (result.unavailable === 'push') {
      return res.status(409).json({
        code: 'PUSH_UNAVAILABLE',
        error: 'Fuer das Haus dieser Meldung ist kein aktives Push-Geraet verfuegbar.'
      });
    }
    if (result.unavailable === 'email') return res.status(409).json({ code: 'EMAIL_UNAVAILABLE', error: 'Bestaetige zuerst eine E-Mail-Adresse.' });
    return res.json({ preferences: { push: result.push, email: result.email } });
  });

  router.delete('/api/maintenance-reports/:id', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const deleted = maintenanceReporting.deleteOwnReport({
      reportId: Number(req.params.id),
      reporterUserId: req.session.user.id
    });
    if (!deleted) return res.status(404).json({ error: 'Meldung nicht gefunden.' });
    return res.json({ ok: true, message: 'Deine persoenlichen Meldungsdaten wurden geloescht. Der neutrale Betriebsfall bleibt erhalten.' });
  });

  router.get('/api/admin/resources', requireAdmin, (req, res) => {
    const resources = db.prepare(`
      SELECT r.id, r.name, r.type, r.active, r.blocked_reason, r.blocked_at,
             r.blocked_by
      FROM resources r
      WHERE r.house_id = ?
      ORDER BY type, name
    `).all(currentHouseId(req)).map((resource) => ({
      ...resource,
      blocked_by_actor: maintenanceReporting.actorReference(resource.blocked_by),
      blocked_by: undefined
    }));
    res.json({ resources });
  });

  router.post('/api/admin/resources', requireAdmin, (req, res) => {
    const name = String(req.body?.name || '').trim();
    const type = String(req.body?.type || '');
    if (!isValidPlainText(name, 2, 80) || !['washer', 'drying_room', 'tumbler'].includes(type)) {
      return res.status(400).json({ error: 'Bitte einen g\u00fcltigen Namen und Bereich w\u00e4hlen.' });
    }
    if (db.prepare('SELECT id FROM resources WHERE lower(name) = lower(?) AND house_id = ?').get(name, currentHouseId(req))) {
      return res.status(409).json({ error: 'Ein Ger\u00e4t mit diesem Namen ist bereits vorhanden.' });
    }
    const result = db.prepare('INSERT INTO resources (name, type, house_id) VALUES (?, ?, ?)')
      .run(name, type, currentHouseId(req));
    writeAudit(req, 'resource.create', 'resource', result.lastInsertRowid, { name, type });
    res.status(201).json({ id: result.lastInsertRowid, message: `${name} wurde angelegt.` });
  });

  router.put('/api/admin/resources/:id', requireAdmin, async (req, res, next) => {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND house_id = ?')
      .get(Number(req.params.id), currentHouseId(req));
    if (!resource) {
      return res.status(404).json({ error: 'Ger\u00e4t nicht gefunden.' });
    }
    const name = String(req.body?.name ?? resource.name).trim();
    const active = req.body?.active == null ? resource.active : req.body.active === true ? 1 : 0;
    const blockReason = String(req.body?.blockReason || '').trim();
    if (!isValidPlainText(name, 2, 80)) {
      return res.status(400).json({ error: 'Der Name muss 2 bis 80 Zeichen haben.' });
    }
    if (!active && blockReason && !isValidPlainText(blockReason, 3, 180)) {
      return res.status(400).json({ error: 'Der Sperrgrund muss 3 bis 180 Zeichen haben.' });
    }
    if (db.prepare('SELECT id FROM resources WHERE lower(name) = lower(?) AND house_id = ? AND id != ?')
      .get(name, currentHouseId(req), resource.id)) {
      return res.status(409).json({ error: 'Ein Ger\u00e4t mit diesem Namen ist bereits vorhanden.' });
    }
    if (active && !resource.active) {
      return res.status(409).json({
        error: 'Freigabe nur im Maschinentagebuch: zuerst Reparatur und Funktionspruefung dokumentieren, danach mit Abschlussnotiz freigeben.'
      });
    }
    if (!active && resource.active && !isValidPlainText(blockReason, 3, 180)) {
      return res.status(400).json({ error: 'Zum Sperren ist ein Grund mit 3 bis 180 Zeichen erforderlich.' });
    }
    let maintenanceCaseId = null;
    let reporterNotificationIds = [];
    const affectedBookings = !active && resource.active
      ? upcomingBookingsForResource(resource.id, currentHouseId(req))
      : [];
    const linkedOpenCase = !active && resource.active
      ? db.prepare(`
          SELECT id, status FROM maintenance_cases
          WHERE resource_id = ? AND house_id = ? AND status != 'closed'
          ORDER BY created_at DESC, id DESC LIMIT 1
        `).get(resource.id, currentHouseId(req))
      : null;
    if (linkedOpenCase) {
      return res.status(409).json({
        code: 'OPEN_CASE_REQUIRES_LOGBOOK',
        error: linkedOpenCase.status === 'reported'
          ? 'Ein neuer Fall muss zuerst im Tagebuch mit ausdruecklicher Sperrentscheidung uebernommen werden.'
          : 'Diese Ressource gehoert zu einem laufenden Tagebuchfall. Sperre sie dort mit einer eigenen Aktion.'
      });
    }
    const updateResourceAndCase = db.transaction(() => {
      db.prepare(`
        UPDATE resources
        SET name = ?, active = ?, blocked_reason = ?, blocked_at = ?, blocked_by = ?
        WHERE id = ?
      `).run(
        name,
        active,
        active ? null : (blockReason || resource.blocked_reason),
        active ? null : (resource.blocked_at || new Date().toISOString()),
        active ? null : req.session.user.id,
        resource.id
      );
      if (!active && resource.active) {
        const openCase = db.prepare(`
          SELECT id, status FROM maintenance_cases
          WHERE resource_id = ? AND house_id = ? AND status != 'closed'
          ORDER BY created_at DESC LIMIT 1
        `).get(resource.id, currentHouseId(req));
        if (openCase) {
          const error = new Error('Open maintenance case requires logbook action.');
          error.code = 'OPEN_CASE_REQUIRES_LOGBOOK';
          throw error;
        }
        const created = db.prepare(`
          INSERT INTO maintenance_cases (house_id, resource_id, reported_by, title, description, status)
          VALUES (?, ?, NULL, 'Betriebsfall', '', 'blocked')
        `).run(currentHouseId(req), resource.id);
        maintenanceCaseId = created.lastInsertRowid;
        appendMaintenanceEntry(maintenanceCaseId, 'block', blockReason, req.session.user.id);
        maintenanceReporting.insertNeutralAudit({
          houseId: currentHouseId(req),
          actorUserId: req.session.user.id,
          actorRole: req.session.user.role,
          action: 'resource.block',
          targetType: 'resource',
          targetId: resource.id,
          details: { maintenanceCaseId, action: 'resource_blocked' }
        });
      }
    });
    try {
      updateResourceAndCase();
    } catch (error) {
      if (error.code === 'OPEN_CASE_REQUIRES_LOGBOOK') {
        return res.status(409).json({
          code: error.code,
          error: 'Diese Ressource gehoert inzwischen zu einem laufenden Tagebuchfall. Sperre sie dort.'
        });
      }
      return next(error);
    }
    if (active || !resource.active) {
      writeAudit(req, 'resource.update', 'resource', resource.id, { name, active: Boolean(active) });
    }
    let delivery;
    try {
      delivery = await maintenanceReporting.deliverReporterNotifications(req, reporterNotificationIds);
    } catch {
      console.error('Reporter-Zustellung nach gespeicherter Ressourcenaenderung fehlgeschlagen.');
      delivery = { pending: reporterNotificationIds.length, sent: 0, failed: 0, unavailable: 0, unknown: 0, processingFailed: true };
    }
    return res.json({
      ok: true,
      maintenanceCaseId,
      delivery,
      affectedBookings,
      message: !active && resource.active ? `${name} wurde gesperrt und im Tagebuch erfasst.` : `${name} wurde gespeichert.`
    });
  });

  router.get('/api/admin/maintenance-cases', requireAdmin, (req, res) => {
    res.json({ cases: maintenanceCasesForAdmin(req) });
  });

  router.post('/api/admin/maintenance-cases/:id/notifications/retry', requireAdmin, async (req, res) => {
    const retry = maintenanceReporting.retryAdminFailures({
      houseId: currentHouseId(req),
      caseId: Number(req.params.id),
      actorUserId: req.session.user.id,
      actorRole: req.session.user.role
    });
    if (retry.notFound) return res.status(404).json({ error: 'Tagebuchfall nicht gefunden.' });

    const delivery = { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 };
    try {
      for (const reportId of retry.reportIds) {
        const result = await maintenanceReporting.deliverAdminNotifications(req, reportId);
        for (const key of Object.keys(delivery)) delivery[key] += Number(result[key] || 0);
      }
    } catch {
      console.error('Erneute Admin-Zustellung konnte nach gespeicherter Retry-Freigabe nicht verarbeitet werden.');
      delivery.processingFailed = true;
    }
    return res.json({
      ok: true,
      reset: retry.reset,
      terminalized: retry.terminalized,
      delivery,
      message: retry.reset
        ? 'Fehlgeschlagene Admin-Zustellungen wurden erneut verarbeitet.'
        : 'Es gibt keine fehlgeschlagene Admin-Zustellung fuer diesen Fall.'
    });
  });

  router.post('/api/admin/maintenance-cases/:id/actions', requireAdmin, async (req, res, next) => {
    const maintenanceCase = maintenanceCaseForAdmin(req, Number(req.params.id));
    if (!maintenanceCase) return res.status(404).json({ error: 'Tagebuchfall nicht gefunden.' });

    const action = String(req.body?.action || '');
    const note = String(req.body?.note || '').trim();
    const blockDecision = String(req.body?.blockDecision || '');
    if (!['note', 'takeover', 'block', 'repair', 'test', 'release', 'close'].includes(action)) {
      return res.status(400).json({ error: 'Unbekannter Tagebuchschritt.' });
    }
    if (action === 'takeover' && !['block', 'keep_available'].includes(blockDecision)) {
      return res.status(400).json({
        error: 'Bitte ausdruecklich waehlen, ob die Ressource gesperrt oder verfuegbar bleiben soll.'
      });
    }
    if (!isValidMaintenanceText(note, 3, 1000)) {
      return res.status(400).json({ error: 'Eine nachvollziehbare Notiz mit 3 bis 1000 Zeichen ist erforderlich.' });
    }
    const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND house_id = ?')
      .get(maintenanceCase.resource_id, maintenanceCase.house_id);
    if (!resource && action !== 'note') {
      return res.status(409).json({ error: 'Die zugehoerige Ressource existiert nicht mehr. Es kann nur noch eine Notiz ergaenzt werden.' });
    }

    let message = 'Notiz wurde unveraenderbar ergaenzt.';
    let entryType = 'note';
    let nextStatus = maintenanceCase.status;
    let shouldBlockResource = false;
    let shouldReleaseResource = false;
    let affectedBookings = [];
    const caseHasBlock = maintenanceCaseHasEntry(maintenanceCase.id, 'block') || (
      !resource.active && ['blocked', 'repairing', 'tested'].includes(maintenanceCase.status)
    );
    const caseHasRepair = maintenanceCaseHasEntry(maintenanceCase.id, 'repair');
    const caseHasSuccessfulTest = maintenanceCaseHasEntry(maintenanceCase.id, 'test_passed');
    if (maintenanceCase.status === 'closed') {
      return res.status(409).json({ error: 'Ein abgeschlossener Fall kann nicht mehr veraendert werden.' });
    }
    if (action === 'takeover') {
      if (maintenanceCase.status !== 'reported') {
        return res.status(409).json({ error: 'Nur ein neuer Fall kann zur Bearbeitung uebernommen werden.' });
      }
      if (blockDecision === 'keep_available' && !resource.active) {
        return res.status(409).json({
          error: 'Die Ressource ist bereits gesperrt. Uebernimm den Fall mit der Entscheidung Ressource sperren.'
        });
      }
      if (blockDecision === 'block') {
        entryType = 'block';
        nextStatus = 'blocked';
        shouldBlockResource = Boolean(resource.active);
        affectedBookings = upcomingBookingsForResource(resource.id, maintenanceCase.house_id);
        message = resource.active
          ? `${resource.name} wurde gesperrt und der Fall ist in Bearbeitung.`
          : `${resource.name} war bereits gesperrt. Der Fall ist jetzt in Bearbeitung.`;
      } else {
        entryType = 'note';
        nextStatus = 'repairing';
        message = `${resource.name} bleibt verfuegbar. Der Fall ist jetzt in Bearbeitung.`;
      }
    } else if (action === 'block') {
      if (maintenanceCase.status === 'reported') {
        return res.status(409).json({
          error: 'Ein neuer Fall kann nur ueber Bearbeitung uebernehmen mit ausdruecklicher Sperrentscheidung gesperrt werden.'
        });
      }
      if (maintenanceCase.status !== 'repairing' || !resource.active) {
        return res.status(409).json({
          error: 'Eine spaetere Sperre ist nur bei einer noch verfuegbaren Ressource in Bearbeitung moeglich.'
        });
      }
      entryType = 'block';
      nextStatus = 'blocked';
      shouldBlockResource = Boolean(resource.active);
      affectedBookings = upcomingBookingsForResource(resource.id, maintenanceCase.house_id);
      message = resource.active ? `${resource.name} wurde gesperrt.` : `${resource.name} war bereits gesperrt.`;
    } else if (action === 'repair') {
      if (!['blocked', 'repairing', 'tested'].includes(maintenanceCase.status)) {
        return res.status(409).json({ error: 'Eine Reparatur kann erst nach Uebernahme des Falls dokumentiert werden.' });
      }
      if ((maintenanceCase.status === 'blocked' || caseHasBlock) && resource.active) {
        return res.status(409).json({ error: 'Die fallbezogene Sperre ist nicht mehr konsistent. Bitte den Fall pruefen.' });
      }
      entryType = 'repair';
      nextStatus = 'repairing';
      message = 'Reparatur wurde dokumentiert.';
    } else if (action === 'test') {
      if (maintenanceCase.status !== 'repairing' || !caseHasRepair) {
        return res.status(409).json({ error: 'Die Funktionspruefung folgt auf eine dokumentierte Reparatur.' });
      }
      if (caseHasBlock && resource.active) {
        return res.status(409).json({ error: 'Die fallbezogene Sperre ist nicht mehr konsistent. Bitte den Fall pruefen.' });
      }
      const successful = req.body?.successful === true;
      entryType = successful ? 'test_passed' : 'test_failed';
      nextStatus = successful ? 'tested' : 'repairing';
      message = successful
        ? 'Funktionspruefung bestanden. Die Freigabe ist jetzt moeglich.'
        : 'Funktionspruefung nicht bestanden. Die Ressource bleibt gesperrt.';
    } else if (action === 'release') {
      if (
        maintenanceCase.status !== 'tested'
        || !caseHasRepair
        || !caseHasSuccessfulTest
        || !caseHasBlock
        || resource.active
      ) {
        return res.status(409).json({ error: 'Freigabe erst nach einer erfolgreichen Funktionspruefung moeglich.' });
      }
      entryType = 'release';
      nextStatus = 'closed';
      shouldReleaseResource = true;
      message = `${resource.name} wurde freigegeben und der Fall abgeschlossen.`;
    } else if (action === 'close') {
      if (
        maintenanceCase.status !== 'tested'
        || !caseHasRepair
        || !caseHasSuccessfulTest
        || caseHasBlock
        || !resource.active
      ) {
        return res.status(409).json({
          error: 'Ein Fall ohne Sperre kann erst nach erfolgreicher Funktionspruefung abgeschlossen werden.'
        });
      }
      entryType = 'note';
      nextStatus = 'closed';
      message = 'Der Fall wurde nach erfolgreicher Funktionspruefung abgeschlossen.';
    }

    let reporterNotificationIds = [];
    const applyAction = db.transaction(() => {
      if (action === 'takeover') {
        const currentCase = db.prepare(`
          SELECT status FROM maintenance_cases WHERE id = ? AND house_id = ?
        `).get(maintenanceCase.id, maintenanceCase.house_id);
        const currentResource = db.prepare(`
          SELECT active FROM resources WHERE id = ? AND house_id = ?
        `).get(maintenanceCase.resource_id, maintenanceCase.house_id);
        if (!currentCase || currentCase.status !== 'reported') {
          const error = new Error('Maintenance case was already taken over.');
          error.code = 'CASE_ALREADY_TAKEN';
          throw error;
        }
        if (!currentResource) {
          const error = new Error('Maintenance resource disappeared.');
          error.code = 'RESOURCE_CHANGED';
          throw error;
        }
        if (blockDecision === 'keep_available' && currentResource.active !== 1) {
          const error = new Error('Maintenance resource is no longer available.');
          error.code = 'RESOURCE_CHANGED';
          throw error;
        }
      }
      appendMaintenanceEntry(maintenanceCase.id, entryType, note, req.session.user.id);
      db.prepare(`
        UPDATE maintenance_cases
        SET status = ?, updated_at = CURRENT_TIMESTAMP,
            closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
        WHERE id = ?
      `).run(nextStatus, nextStatus, maintenanceCase.id);
      if (shouldBlockResource) {
        db.prepare(`
          UPDATE resources SET active = 0, blocked_reason = ?, blocked_at = ?, blocked_by = ? WHERE id = ?
        `).run(note, new Date().toISOString(), req.session.user.id, resource.id);
      } else if (shouldReleaseResource) {
        db.prepare(`
          UPDATE resources SET active = 1, blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE id = ?
        `).run(resource.id);
      }
      const previousVisibleStatus = maintenanceReporting.visibleMaintenanceStatus(maintenanceCase.status);
      const nextVisibleStatus = maintenanceReporting.visibleMaintenanceStatus(nextStatus);
      if (previousVisibleStatus !== nextVisibleStatus) {
        reporterNotificationIds = maintenanceReporting.queueReporterStatus(maintenanceCase.id, nextVisibleStatus);
      }
      maintenanceReporting.insertNeutralAudit({
        houseId: maintenanceCase.house_id,
        actorUserId: req.session.user.id,
        actorRole: req.session.user.role,
        action: `maintenance_case.${action}`,
        targetType: 'maintenance_case',
        targetId: maintenanceCase.id,
        details: {
          action,
          status: nextVisibleStatus,
          testSuccessful: action === 'test' ? req.body?.successful === true : undefined
        }
      });
    });
    try {
      applyAction();
    } catch (error) {
      if (error.code === 'CASE_ALREADY_TAKEN') {
        return res.status(409).json({ error: 'Der Fall wurde bereits uebernommen. Bitte Ansicht aktualisieren.' });
      }
      if (error.code === 'RESOURCE_CHANGED') {
        return res.status(409).json({ error: 'Der Ressourcenzustand hat sich geaendert. Bitte Ansicht aktualisieren.' });
      }
      return next(error);
    }
    let delivery;
    try {
      delivery = await maintenanceReporting.deliverReporterNotifications(req, reporterNotificationIds);
    } catch {
      console.error('Reporter-Zustellung nach gespeicherter Tagebuchaktion fehlgeschlagen.');
      delivery = { pending: reporterNotificationIds.length, sent: 0, failed: 0, unavailable: 0, unknown: 0, processingFailed: true };
    }
    return res.json({
      ok: true,
      status: nextStatus,
      visibleStatus: maintenanceReporting.visibleMaintenanceStatus(nextStatus),
      affectedBookings,
      message,
      delivery
    });
  });

  return router;
}

module.exports = { createEquipmentLogbookRouter };
