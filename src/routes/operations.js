'use strict';

function createOperationsRouters({
  express,
  db,
  fs,
  path,
  os,
  crypto,
  env,
  dbPath,
  appVersion,
  appRelease,
  requireAdmin,
  requireSuperadmin,
  currentHouseId,
  isSuperadmin,
  writeAudit,
  maintenanceStatus,
  publicReleaseStatus,
  createVerifiedBackup,
  runMaintenanceSelfCheck,
  confirmCurrentAdminPassword,
  emailStatus,
  pushStatus,
  getSetting,
  setSetting,
  todayStringLocal,
  addDays,
  destroyUserSessions
}) {
  const publicRouter = express.Router();
  const adminRouter = express.Router();
  const analyticsRouter = express.Router();
  const pilotRouter = express.Router();

publicRouter.get(['/health', '/api/health'], (req, res) => {
  const storage = env.RENDER === 'true'
    ? (dbPath.startsWith('/var/data') ? 'persistent' : 'ephemeral')
    : 'local';
  const adminReady = Boolean(db.prepare(`
    SELECT u.id
    FROM users u
    LEFT JOIN user_house_roles uhr ON uhr.user_id = u.id AND uhr.role = 'house_admin'
    WHERE u.active = 1 AND (u.is_superadmin = 1 OR uhr.user_id IS NOT NULL)
    LIMIT 1
  `).get());
  res.json({
    ok: true,
    storage,
    adminReady,
    revision: String(env.RENDER_GIT_COMMIT || '').trim() || null,
    version: appVersion,
    release: appRelease,
    maintenanceMode: maintenanceStatus().active
  });
});

publicRouter.get('/api/version', (req, res) => {
  res.json(publicReleaseStatus());
});

adminRouter.get('/api/admin/audit-log', requireAdmin, (req, res) => {
  const entries = db.prepare(`
    SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
           u.username AS actor
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.house_id = ? OR ? = 1
    ORDER BY al.id DESC
    LIMIT 80
  `).all(currentHouseId(req), isSuperadmin(req) ? 1 : 0).map((entry) => ({
    ...entry,
    details: (() => { try { return JSON.parse(entry.details || '{}'); } catch { return {}; } })()
  }));
  res.json({ entries });
});

adminRouter.get('/api/admin/backup', requireAdmin, requireSuperadmin, async (req, res, next) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const downloadName = `waschplan-backup-${stamp}.sqlite`;
  const backupPath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${downloadName}`);

  try {
    await db.backup(backupPath);
    writeAudit(req, 'backup.download', 'database');
    res.download(backupPath, downloadName, (error) => {
      fs.rm(backupPath, { force: true }, () => {});
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    fs.rm(backupPath, { force: true }, () => {});
    next(error);
  }
});

adminRouter.post('/api/admin/backup/run', requireAdmin, requireSuperadmin, async (req, res) => {
  try {
    const status = await createVerifiedBackup();
    writeAudit(req, 'backup.create', 'database', '', status);
    res.json({ status, message: 'Backup wurde erstellt und gepr\u00fcft.' });
  } catch (error) {
    setSetting('backup_status', JSON.stringify({ ok: false, createdAt: new Date().toISOString(), error: error.message }));
    res.status(500).json({ error: `Backup fehlgeschlagen: ${error.message}` });
  }
});

adminRouter.get('/api/admin/maintenance', requireAdmin, requireSuperadmin, (req, res) => {
  res.json({ maintenance: maintenanceStatus(), release: publicReleaseStatus() });
});

adminRouter.put('/api/admin/maintenance', requireAdmin, requireSuperadmin, async (req, res) => {
  const active = req.body?.active === true;
  const current = maintenanceStatus();

  if (active) {
    if (!confirmCurrentAdminPassword(req, res)) return;
    if (current.active) {
      return res.json({ maintenance: current, message: 'Der Wartungsmodus ist bereits aktiv.' });
    }
    try {
      const backup = await createVerifiedBackup();
      const maintenance = {
        active: true,
        message: 'WaschZeit wird gerade gewartet. Bitte versuche es in wenigen Minuten erneut.',
        startedAt: new Date().toISOString(),
        startedBy: req.session.user.username,
        backup,
        lastCheck: current.lastCheck || null
      };
      setSetting('maintenance_status', JSON.stringify(maintenance));
      writeAudit(req, 'maintenance.start', 'system', '', { backup: backup.filename });
      return res.json({
        maintenance,
        message: 'Backup geprueft. Wartungsmodus ist jetzt aktiv.'
      });
    } catch (error) {
      return res.status(500).json({ error: `Wartungsmodus nicht gestartet: ${error.message}` });
    }
  }

  if (!current.active) {
    return res.json({ maintenance: current, message: 'Der Wartungsmodus ist bereits beendet.' });
  }

  try {
    const lastCheck = runMaintenanceSelfCheck();
    const maintenance = {
      ...current,
      active: false,
      message: '',
      endedAt: new Date().toISOString(),
      endedBy: req.session.user.username,
      lastCheck
    };
    setSetting('maintenance_status', JSON.stringify(maintenance));
    writeAudit(req, 'maintenance.finish', 'system', '', lastCheck);
    return res.json({
      maintenance,
      message: 'System- und Buchungspruefung erfolgreich. WaschZeit ist wieder freigegeben.'
    });
  } catch (error) {
    writeAudit(req, 'maintenance.check_failed', 'system', '', { error: error.message });
    return res.status(500).json({
      error: `Wartung bleibt aktiv: ${error.message}`,
      maintenance: current
    });
  }
});

adminRouter.get('/api/admin/overview', requireAdmin, (req, res) => {
  const houseId = currentHouseId(req);
  const users = db.prepare('SELECT COUNT(*) AS count FROM users WHERE active = 1 AND house_id = ?').get(houseId).count;
  const usersMissingEmail = db.prepare(`
    SELECT COUNT(*) AS count
    FROM users
    WHERE active = 1
      AND house_id = ?
      AND NOT (email_verified = 1 AND email IS NOT NULL AND trim(email) != '')
      AND NOT (secondary_email_verified = 1 AND secondary_email IS NOT NULL AND trim(secondary_email) != '')
  `).get(houseId).count;
  const todayBookings = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings b JOIN resources r ON r.id = b.resource_id
    WHERE b.booking_date = ? AND r.house_id = ?
  `).get(todayStringLocal(), houseId).count;
  const activeResources = db.prepare('SELECT COUNT(*) AS count FROM resources WHERE active = 1 AND house_id = ?').get(houseId).count;
  const fixedBookings = db.prepare(`
    SELECT COUNT(*) AS count
    FROM fixed_bookings fb JOIN resources r ON r.id = fb.resource_id
    WHERE fb.active = 1 AND r.house_id = ?
  `).get(houseId).count;
  const recentReleases = db.prepare(`
    SELECT COUNT(*) AS count
    FROM release_notices
    WHERE house_id = ? AND created_at >= datetime('now', '-7 days')
  `).get(houseId).count;
  const openMaintenanceCases = db.prepare(`
    SELECT COUNT(*) AS count FROM maintenance_cases WHERE house_id = ? AND status != 'closed'
  `).get(houseId).count;

  res.json({
    users,
    usersMissingEmail,
    todayBookings,
    activeResources,
    fixedBookings,
    recentReleases,
    openMaintenanceCases,
    email: emailStatus(),
    push: pushStatus(),
    maintenance: maintenanceStatus(),
    externalBackupConfigured: Boolean(String(env.BACKUP_UPLOAD_URL || '').trim()),
    backup: (() => {
      try { return JSON.parse(getSetting('backup_status') || 'null'); } catch { return null; }
    })()
  });
});

analyticsRouter.get('/api/admin/analytics', requireAdmin, (req, res) => {
  const houseId = currentHouseId(req);
  const days = Math.min(180, Math.max(7, Number(req.query.days || 30)));
  const since = addDays(todayStringLocal(), -days);
  const until = addDays(todayStringLocal(), days);
  const totals = db.prepare(`
    SELECT r.type, COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.house_id = ?
      AND b.booking_date BETWEEN ? AND ?
    GROUP BY r.type
  `).all(houseId, since, until);
  const bySlot = db.prepare(`
    SELECT b.slot, COUNT(*) AS count
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    WHERE r.house_id = ?
      AND b.booking_date BETWEEN ? AND ?
    GROUP BY b.slot
    ORDER BY b.slot
  `).all(houseId, since, until);
  const byResource = db.prepare(`
    SELECT r.name, r.type, COUNT(b.id) AS count
    FROM resources r
    LEFT JOIN bookings b ON b.resource_id = r.id
      AND b.booking_date BETWEEN ? AND ?
    WHERE r.house_id = ?
    GROUP BY r.id
    ORDER BY count DESC, r.name
  `).all(since, until, houseId);
  const byUser = db.prepare(`
    SELECT COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username, COUNT(b.id) AS count
    FROM users u
    LEFT JOIN apartments a ON a.id = u.apartment_id
    LEFT JOIN bookings b ON b.user_id = u.id
      AND b.booking_date BETWEEN ? AND ?
    WHERE u.house_id = ?
      AND u.active = 1
    GROUP BY u.id
    ORDER BY count DESC, COALESCE(NULLIF(a.display_name, ''), a.label, u.username)
    LIMIT 10
  `).all(since, until, houseId);
  const releases = db.prepare(`
    SELECT kind, COUNT(*) AS count
    FROM release_notices
    WHERE house_id = ?
      AND created_at >= datetime('now', ?)
    GROUP BY kind
  `).all(houseId, `-${days} days`);
  const blockedResources = db.prepare(`
    SELECT name, type, blocked_reason AS reason, blocked_at
    FROM resources
    WHERE house_id = ?
      AND active = 0
    ORDER BY name
  `).all(houseId);

  res.json({
    days,
    window: { since, until },
    totals,
    bySlot,
    byResource,
    byUser,
    releases,
    blockedResources
  });
});

pilotRouter.delete('/api/admin/pilot-accounts', requireAdmin, requireSuperadmin, async (req, res, next) => {
  const confirmText = String(req.body?.confirm || '').trim();
  if (!confirmCurrentAdminPassword(req, res)) return;
  if (confirmText !== 'ALLE TESTKONTEN LOESCHEN') {
    return res.status(400).json({
      error: 'Bitte zur Bestaetigung ALLE TESTKONTEN LOESCHEN eingeben.'
    });
  }

  try {
    const backup = await createVerifiedBackup();
    const accounts = db.prepare(`
      SELECT id, role, apartment_id
      FROM users
      WHERE is_superadmin = 0
    `).all();
    const accountIds = accounts.map((account) => account.id);
    const apartmentLinks = accounts.filter((account) => account.apartment_id).length;
    const residents = accounts.filter((account) => account.role === 'user').length;
    const houseAdmins = accounts.filter((account) => account.role === 'admin').length;

    db.transaction(() => {
      if (accountIds.length) {
        const placeholders = accountIds.map(() => '?').join(', ');
        db.prepare(`
          DELETE FROM release_notices
          WHERE created_by IN (${placeholders})
        `).run(...accountIds);
        db.prepare(`
          UPDATE apartments
          SET claimed_by = NULL, claimed_at = NULL
          WHERE claimed_by IN (${placeholders})
        `).run(...accountIds);
        db.prepare(`
          UPDATE resources
          SET blocked_by = NULL
          WHERE blocked_by IN (${placeholders})
        `).run(...accountIds);
        db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...accountIds);
      }
    })();

    for (const accountId of accountIds) destroyUserSessions(accountId);
    writeAudit(req, 'users.pilot_reset', 'user', '', {
      deleted: accounts.length,
      residents,
      houseAdmins,
      apartmentLinks,
      backup: backup.filename
    });
    res.json({
      ok: true,
      deleted: accounts.length,
      residents,
      houseAdmins,
      apartmentLinks,
      backup,
      message: `${accounts.length} Testkonten wurden geloescht. Das Superadmin-Konto und technische Protokolle bleiben erhalten.`
    });
  } catch (error) {
    next(error);
  }
});

  return { publicRouter, adminRouter, analyticsRouter, pilotRouter };
}

module.exports = { createOperationsRouters };

