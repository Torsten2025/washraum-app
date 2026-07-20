'use strict';

function createOperationsService({
  db,
  crypto,
  getSetting,
  setSetting,
  createVerifiedBackup,
  appVersion,
  appRelease,
  appReleasedAt
}) {
  function maintenanceStatus() {
    const fallback = {
      active: false,
      message: '',
      startedAt: null,
      startedBy: '',
      backup: null,
      lastCheck: null
    };
    try {
      const stored = JSON.parse(getSetting('maintenance_status') || 'null');
      return stored && typeof stored === 'object'
        ? { ...fallback, ...stored, active: Boolean(stored.active) }
        : fallback;
    } catch {
      return fallback;
    }
  }
  
  function publicReleaseStatus() {
    const maintenance = maintenanceStatus();
    return {
      version: appVersion,
      release: appRelease,
      releasedAt: appReleasedAt,
      maintenance: {
        active: maintenance.active,
        message: maintenance.message,
        startedAt: maintenance.startedAt
      }
    };
  }

  function runMaintenanceSelfCheck() {
    const quickCheck = db.pragma('quick_check', { simple: true });
    if (String(quickCheck).toLowerCase() !== 'ok') {
      throw new Error(`SQLite-Pruefung fehlgeschlagen: ${quickCheck}`);
    }
  
    const probeTarget = db.prepare(`
      SELECT u.id AS user_id, r.id AS resource_id
      FROM users u
      JOIN resources r ON r.house_id = u.house_id
      WHERE u.active = 1 AND r.active = 1
      ORDER BY u.is_superadmin DESC, u.id, r.id
      LIMIT 1
    `).get();
    if (!probeTarget) {
      throw new Error('Buchungspruefung nicht moeglich: aktives Konto oder Geraet fehlt.');
    }
  
    db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO bookings (user_id, resource_id, booking_date, slot, group_id)
        VALUES (?, ?, '9999-12-31', '__maintenance_probe__', ?)
      `).run(probeTarget.user_id, probeTarget.resource_id, `maintenance-${crypto.randomUUID()}`);
      const removed = db.prepare('DELETE FROM bookings WHERE id = ?').run(result.lastInsertRowid);
      if (removed.changes !== 1) {
        throw new Error('Temporäre Testbuchung konnte nicht sauber entfernt werden.');
      }
    })();
  
    return {
      ok: true,
      database: 'ok',
      bookingWrite: 'ok',
      checkedAt: new Date().toISOString()
    };
  }
  
  async function runScheduledBackup() {
    try {
      const status = await createVerifiedBackup();
      console.log(`Backup gepr\u00fcft: ${status.filename}${status.uploaded ? ' (extern kopiert)' : ''}`);
    } catch (error) {
      setSetting('backup_status', JSON.stringify({ ok: false, createdAt: new Date().toISOString(), error: error.message }));
      console.error(`Automatisches Backup fehlgeschlagen: ${error.message}`);
    }
  }
  
  function cleanupExpiredData() {
    db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE expired <= ?').run(Date.now());
      db.prepare('DELETE FROM email_verification_tokens WHERE CAST(expires_at AS INTEGER) <= ?').run(Date.now());
      db.prepare('DELETE FROM password_reset_tokens WHERE CAST(expires_at AS INTEGER) <= ?').run(Date.now());
      db.prepare('DELETE FROM account_recovery_codes WHERE used_at IS NOT NULL OR CAST(expires_at AS INTEGER) <= ?').run(Date.now());
      db.prepare('DELETE FROM device_pairing_codes WHERE used_at IS NOT NULL OR CAST(expires_at AS INTEGER) <= ?').run(Date.now());
      db.prepare("DELETE FROM release_notices WHERE created_at < datetime('now', '-30 days')").run();
      db.prepare("DELETE FROM bookings WHERE booking_date < date('now', '-365 days')").run();
      db.prepare("DELETE FROM audit_log WHERE created_at < datetime('now', '-365 days')").run();
    })();
  }
  

  return {
    maintenanceStatus,
    publicReleaseStatus,
    runMaintenanceSelfCheck,
    runScheduledBackup,
    cleanupExpiredData
  };
}

module.exports = { createOperationsService };

