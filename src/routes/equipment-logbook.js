const express = require('express');

function createEquipmentLogbookRouter({
  db,
  requireAuth,
  requireResident,
  requireApartmentAccount,
  requireAdmin,
  currentHouseId,
  isSuperadmin,
  isValidPlainText,
  isValidMaintenanceText,
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
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'System') AS created_by_name
      FROM maintenance_entries me
      LEFT JOIN users u ON u.id = me.created_by
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE me.case_id = ?
      ORDER BY me.created_at, me.id
    `);
    return rows.map((row) => ({ ...row, entries: entryQuery.all(row.id) }));
  }

  function maintenanceCasesForHouse(houseId, reportedBy = null) {
    const reportedFilter = reportedBy ? `AND (
      mc.reported_by = ? OR EXISTS (
        SELECT 1 FROM maintenance_entries own_report
        WHERE own_report.case_id = mc.id AND own_report.entry_type = 'report' AND own_report.created_by = ?
      )
    )` : '';
    const params = reportedBy ? [houseId, reportedBy, reportedBy] : [houseId];
    return maintenanceCaseDetails(db.prepare(`
      SELECT mc.id, mc.house_id, mc.resource_id, mc.title, mc.description, mc.status,
             mc.created_at, mc.updated_at, mc.closed_at,
             r.name AS resource_name, r.type AS resource_type, h.name AS house_name,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'Verwaltung') AS reported_by_name
      FROM maintenance_cases mc
      LEFT JOIN resources r ON r.id = mc.resource_id
      JOIN houses h ON h.id = mc.house_id
      LEFT JOIN users u ON u.id = mc.reported_by
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE mc.house_id = ? ${reportedFilter}
      ORDER BY CASE mc.status WHEN 'reported' THEN 0 WHEN 'blocked' THEN 1 WHEN 'repairing' THEN 2 WHEN 'tested' THEN 3 ELSE 4 END,
               mc.updated_at DESC, mc.id DESC
      LIMIT 300
    `).all(...params));
  }

  function maintenanceCasesForAdmin(req) {
    if (!isSuperadmin(req)) return maintenanceCasesForHouse(currentHouseId(req));
    return maintenanceCaseDetails(db.prepare(`
      SELECT mc.id, mc.house_id, mc.resource_id, mc.title, mc.description, mc.status,
             mc.created_at, mc.updated_at, mc.closed_at,
             r.name AS resource_name, r.type AS resource_type, h.name AS house_name,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username, 'Verwaltung') AS reported_by_name
      FROM maintenance_cases mc
      LEFT JOIN resources r ON r.id = mc.resource_id
      JOIN houses h ON h.id = mc.house_id
      LEFT JOIN users u ON u.id = mc.reported_by
      LEFT JOIN apartments a ON a.id = u.apartment_id
      ORDER BY CASE mc.status WHEN 'reported' THEN 0 WHEN 'blocked' THEN 1 WHEN 'repairing' THEN 2 WHEN 'tested' THEN 3 ELSE 4 END,
               mc.updated_at DESC, mc.id DESC
      LIMIT 500
    `).all());
  }

  function maintenanceCaseForAdmin(req, caseId) {
    const maintenanceCase = db.prepare('SELECT * FROM maintenance_cases WHERE id = ?').get(caseId);
    if (!maintenanceCase) return null;
    if (!isSuperadmin(req) && Number(maintenanceCase.house_id) !== currentHouseId(req)) return null;
    return maintenanceCase;
  }

  function appendMaintenanceEntry(caseId, entryType, note, userId) {
    db.prepare(`
      INSERT INTO maintenance_entries (case_id, entry_type, note, created_by)
      VALUES (?, ?, ?, ?)
    `).run(caseId, entryType, note, userId || null);
    db.prepare('UPDATE maintenance_cases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(caseId);
  }

  router.get('/api/maintenance-cases', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    res.json({ cases: maintenanceCasesForHouse(currentHouseId(req), req.session.user.id) });
  });

  router.post('/api/maintenance-cases', requireAuth, requireResident, requireApartmentAccount, (req, res) => {
    const resourceId = Number(req.body?.resourceId);
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const resource = db.prepare('SELECT id, name FROM resources WHERE id = ? AND house_id = ?')
      .get(resourceId, currentHouseId(req));
    if (!resource) return res.status(404).json({ error: 'Geraet oder Raum nicht gefunden.' });
    if (!isValidPlainText(title, 3, 120) || !isValidMaintenanceText(description, 5, 1000)) {
      return res.status(400).json({ error: 'Bitte einen kurzen Titel und eine Beschreibung mit mindestens 5 Zeichen eingeben.' });
    }
    const createCase = db.transaction(() => {
      const openCase = db.prepare(`
        SELECT id FROM maintenance_cases
        WHERE house_id = ? AND resource_id = ? AND status != 'closed'
        ORDER BY created_at DESC LIMIT 1
      `).get(currentHouseId(req), resource.id);
      if (openCase) {
        appendMaintenanceEntry(openCase.id, 'report', `${title}: ${description}`, req.session.user.id);
        return { id: openCase.id, addedToExisting: true };
      }
      const result = db.prepare(`
        INSERT INTO maintenance_cases (house_id, resource_id, reported_by, title, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(currentHouseId(req), resource.id, req.session.user.id, title, description);
      appendMaintenanceEntry(result.lastInsertRowid, 'report', description, req.session.user.id);
      return { id: result.lastInsertRowid, addedToExisting: false };
    });
    const created = createCase();
    writeAudit(req, 'maintenance_case.report', 'maintenance_case', created.id, {
      resourceId: resource.id,
      title,
      addedToExisting: created.addedToExisting
    });
    res.status(201).json({
      id: created.id,
      addedToExisting: created.addedToExisting,
      message: created.addedToExisting
        ? `Deine Beobachtung zu ${resource.name} wurde dem laufenden Tagebuchfall erg\u00e4nzt.`
        : `St\u00f6rung zu ${resource.name} wurde an den Haus-Admin gemeldet.`
    });
  });

  router.get('/api/admin/resources', requireAdmin, (req, res) => {
    const resources = db.prepare(`
      SELECT r.id, r.name, r.type, r.active, r.blocked_reason, r.blocked_at,
             u.username AS blocked_by
      FROM resources r
      LEFT JOIN users u ON u.id = r.blocked_by
      WHERE r.house_id = ?
      ORDER BY type, name
    `).all(currentHouseId(req));
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

  router.put('/api/admin/resources/:id', requireAdmin, (req, res) => {
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
          SELECT id FROM maintenance_cases
          WHERE resource_id = ? AND house_id = ? AND status != 'closed'
          ORDER BY created_at DESC LIMIT 1
        `).get(resource.id, currentHouseId(req));
        if (openCase) {
          maintenanceCaseId = openCase.id;
          db.prepare("UPDATE maintenance_cases SET status = 'blocked', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(openCase.id);
        } else {
          const created = db.prepare(`
            INSERT INTO maintenance_cases (house_id, resource_id, reported_by, title, description, status)
            VALUES (?, ?, ?, ?, ?, 'blocked')
          `).run(currentHouseId(req), resource.id, req.session.user.id, `Sperre: ${name}`, blockReason);
          maintenanceCaseId = created.lastInsertRowid;
          appendMaintenanceEntry(maintenanceCaseId, 'report', blockReason, req.session.user.id);
        }
        appendMaintenanceEntry(maintenanceCaseId, 'block', blockReason, req.session.user.id);
      }
    });
    updateResourceAndCase();
    writeAudit(req, active ? 'resource.update' : 'resource.block', 'resource', resource.id, {
      name,
      active: Boolean(active),
      reason: active ? '' : (blockReason || resource.blocked_reason || ''),
      maintenanceCaseId
    });
    res.json({
      ok: true,
      maintenanceCaseId,
      message: !active && resource.active ? `${name} wurde gesperrt und im Tagebuch erfasst.` : `${name} wurde gespeichert.`
    });
  });

  router.get('/api/admin/maintenance-cases', requireAdmin, (req, res) => {
    res.json({ cases: maintenanceCasesForAdmin(req) });
  });

  router.post('/api/admin/maintenance-cases/:id/actions', requireAdmin, (req, res) => {
    const maintenanceCase = maintenanceCaseForAdmin(req, Number(req.params.id));
    if (!maintenanceCase) return res.status(404).json({ error: 'Tagebuchfall nicht gefunden.' });

    const action = String(req.body?.action || '');
    const note = String(req.body?.note || '').trim();
    if (!['note', 'block', 'repair', 'test', 'release'].includes(action)) {
      return res.status(400).json({ error: 'Unbekannter Tagebuchschritt.' });
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
    if (action === 'block') {
      if (maintenanceCase.status !== 'reported') {
        return res.status(409).json({ error: 'Nur eine neue Meldung kann als naechster Schritt gesperrt werden.' });
      }
      entryType = 'block';
      nextStatus = 'blocked';
      message = `${resource.name} wurde gesperrt.`;
    } else if (action === 'repair') {
      if (!['blocked', 'repairing'].includes(maintenanceCase.status) || resource.active) {
        return res.status(409).json({ error: 'Eine Reparatur kann nur an einer gesperrten Ressource dokumentiert werden.' });
      }
      entryType = 'repair';
      nextStatus = 'repairing';
      message = 'Reparatur wurde dokumentiert.';
    } else if (action === 'test') {
      if (maintenanceCase.status !== 'repairing' || resource.active) {
        return res.status(409).json({ error: 'Die Funktionspruefung folgt auf eine dokumentierte Reparatur an der gesperrten Ressource.' });
      }
      const successful = req.body?.successful === true;
      entryType = successful ? 'test_passed' : 'test_failed';
      nextStatus = successful ? 'tested' : 'repairing';
      message = successful
        ? 'Funktionspruefung bestanden. Die Freigabe ist jetzt moeglich.'
        : 'Funktionspruefung nicht bestanden. Die Ressource bleibt gesperrt.';
    } else if (action === 'release') {
      if (maintenanceCase.status !== 'tested' || resource.active) {
        return res.status(409).json({ error: 'Freigabe erst nach einer erfolgreichen Funktionspruefung moeglich.' });
      }
      entryType = 'release';
      nextStatus = 'closed';
      message = `${resource.name} wurde freigegeben und der Fall abgeschlossen.`;
    }

    const applyAction = db.transaction(() => {
      appendMaintenanceEntry(maintenanceCase.id, entryType, note, req.session.user.id);
      db.prepare(`
        UPDATE maintenance_cases
        SET status = ?, updated_at = CURRENT_TIMESTAMP,
            closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
        WHERE id = ?
      `).run(nextStatus, nextStatus, maintenanceCase.id);
      if (action === 'block') {
        db.prepare(`
          UPDATE resources SET active = 0, blocked_reason = ?, blocked_at = ?, blocked_by = ? WHERE id = ?
        `).run(note, new Date().toISOString(), req.session.user.id, resource.id);
      } else if (action === 'release') {
        db.prepare(`
          UPDATE resources SET active = 1, blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE id = ?
        `).run(resource.id);
      }
    });
    applyAction();
    writeAuditForHouse(req, maintenanceCase.house_id, `maintenance_case.${action}`, 'maintenance_case', maintenanceCase.id, {
      resourceId: maintenanceCase.resource_id,
      status: nextStatus,
      successful: action === 'test' ? req.body?.successful === true : undefined
    });
    res.json({ ok: true, status: nextStatus, message });
  });

  return router;
}

module.exports = { createEquipmentLogbookRouter };
