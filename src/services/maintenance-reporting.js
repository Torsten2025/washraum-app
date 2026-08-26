'use strict';

const { verifiedEmailForUser } = require('./email-verification');

const REPORT_MIGRATION_KEY = 'maintenance_reports_v1_migrated';
const ACTOR_SALT_KEY = 'maintenance_actor_reference_salt';
const OPEN_CASE_STATUSES = ['reported', 'blocked', 'repairing', 'tested'];
const REPORT_STATUS_EVENTS = new Set(['in_progress', 'done']);
const DELIVERY_CLAIM_LEASE_MS = 5 * 60 * 1000;

function normalizedBoolean(value) {
  return value === true;
}

function normalizeReportPayload({ resourceId, title, description, notifyPush, notifyEmail }) {
  return {
    resourceId: Number(resourceId),
    title: String(title || '').trim(),
    description: String(description || '').trim(),
    notifyPush: normalizedBoolean(notifyPush),
    notifyEmail: normalizedBoolean(notifyEmail)
  };
}

function visibleMaintenanceStatus(status) {
  if (status === 'reported') return 'new';
  if (status === 'closed') return 'done';
  return 'in_progress';
}

function createMaintenanceReporting({
  db,
  crypto,
  pushStatus,
  applyPushConfig,
  pushPayload,
  subscriptionForRow,
  sendPushNotification,
  smtpConfig,
  sendMail,
  publicAppUrl,
  now = () => new Date()
}) {
  function payloadHash(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  function endpointKey(endpoint) {
    return crypto.createHash('sha256').update(String(endpoint || '')).digest('hex');
  }

  function actorReference(userId) {
    if (!userId) return null;
    let salt = getSetting(ACTOR_SALT_KEY);
    if (!salt) {
      salt = crypto.randomBytes(32).toString('hex');
      setSetting(ACTOR_SALT_KEY, salt);
    }
    return `actor-${crypto.createHmac('sha256', salt).update(String(userId)).digest('hex').slice(0, 16)}`;
  }

  function installSchema() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        reporter_user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        submission_key TEXT,
        submission_payload_hash TEXT,
        legacy_source TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES maintenance_cases(id) ON DELETE RESTRICT,
        FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS maintenance_report_preferences (
        report_id INTEGER PRIMARY KEY,
        push_enabled INTEGER NOT NULL DEFAULT 0,
        email_enabled INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES maintenance_reports(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS maintenance_report_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'done')),
        channel TEXT NOT NULL CHECK (channel IN ('push', 'email')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (report_id, status, channel),
        FOREIGN KEY (report_id) REFERENCES maintenance_reports(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS maintenance_report_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id INTEGER NOT NULL,
        recipient_key TEXT NOT NULL,
        subscription_id INTEGER,
        state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'failed', 'unavailable')),
        attempts INTEGER NOT NULL DEFAULT 0,
        claim_token TEXT,
        claim_expires_at INTEGER,
        provider_attempted_at TEXT,
        last_error_code TEXT,
        sent_at TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (notification_id, recipient_key),
        FOREIGN KEY (notification_id) REFERENCES maintenance_report_notifications(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS maintenance_admin_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        case_id INTEGER NOT NULL,
        house_id INTEGER NOT NULL,
        subscription_id INTEGER,
        endpoint_key TEXT NOT NULL,
        event_key TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('initial', 'reminder')),
        reminder_window INTEGER,
        state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'failed', 'unavailable')),
        attempts INTEGER NOT NULL DEFAULT 0,
        claim_token TEXT,
        claim_expires_at INTEGER,
        provider_attempted_at TEXT,
        last_error_code TEXT,
        sent_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (report_id, event_key, endpoint_key),
        FOREIGN KEY (report_id) REFERENCES maintenance_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (case_id) REFERENCES maintenance_cases(id) ON DELETE RESTRICT,
        FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE RESTRICT,
        FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE SET NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_report_submission
        ON maintenance_reports (reporter_user_id, submission_key)
        WHERE submission_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_maintenance_reports_case
        ON maintenance_reports (case_id, created_at, id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_reports_reporter
        ON maintenance_reports (reporter_user_id, created_at, id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_admin_pending
        ON maintenance_admin_notifications (state, created_at, id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_report_delivery_pending
        ON maintenance_report_deliveries (state, updated_at, id);
    `);

    const ensureColumn = (table, column, definition) => {
      const present = db.prepare(`PRAGMA table_info(${table})`).all()
        .some((item) => item.name === column);
      if (!present) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    };
    ensureColumn('maintenance_report_deliveries', 'claim_token', 'TEXT');
    ensureColumn('maintenance_report_deliveries', 'claim_expires_at', 'INTEGER');
    ensureColumn('maintenance_report_deliveries', 'provider_attempted_at', 'TEXT');
    ensureColumn('maintenance_admin_notifications', 'claim_token', 'TEXT');
    ensureColumn('maintenance_admin_notifications', 'claim_expires_at', 'INTEGER');
    ensureColumn('maintenance_admin_notifications', 'provider_attempted_at', 'TEXT');

    for (const table of ['maintenance_report_deliveries', 'maintenance_admin_notifications']) {
      db.prepare(`
        UPDATE ${table}
        SET state = 'failed', last_error_code = 'DELIVERY_UNKNOWN',
            provider_attempted_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
            claim_token = NULL, claim_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE provider_attempted_at IS NULL
          AND ((state = 'failed' AND attempts > 0) OR claim_token IS NOT NULL)
      `).run();
    }

  }

  function legacyMigrationRequired() {
    if (String(getSetting(REPORT_MIGRATION_KEY)) === '1') return false;
    const row = db.prepare(`
      SELECT
        EXISTS (
          SELECT 1 FROM maintenance_cases
          WHERE reported_by IS NOT NULL OR title != 'Betriebsfall' OR description != ''
        )
        OR EXISTS (SELECT 1 FROM maintenance_entries WHERE entry_type = 'report')
        OR EXISTS (
          SELECT 1 FROM audit_log
          WHERE action IN (
            'maintenance_case.report', 'maintenance_case.note', 'maintenance_case.block',
            'maintenance_case.repair', 'maintenance_case.test', 'maintenance_case.release',
            'maintenance_case.close', 'resource.block'
          )
        ) AS required
    `).get();
    return row?.required === 1;
  }

  function migrateLegacyReports() {
    if (String(getSetting(REPORT_MIGRATION_KEY)) === '1') return { migrated: false };

    db.transaction(() => {
      const cases = db.prepare(`
        SELECT id, reported_by, title, description FROM maintenance_cases ORDER BY id
      `).all();
      const legacyEntries = db.prepare(`
        SELECT id, case_id, note, created_by, created_at
        FROM maintenance_entries WHERE entry_type = 'report'
        ORDER BY case_id, created_at, id
      `).all();
      const entriesByCase = new Map();
      for (const entry of legacyEntries) {
        if (!entriesByCase.has(entry.case_id)) entriesByCase.set(entry.case_id, []);
        entriesByCase.get(entry.case_id).push(entry);
      }

      const insertLegacyReport = db.prepare(`
        INSERT INTO maintenance_reports
          (case_id, reporter_user_id, title, description, legacy_source, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertPreference = db.prepare(`
        INSERT OR IGNORE INTO maintenance_report_preferences (report_id, push_enabled, email_enabled)
        VALUES (?, 0, 0)
      `);
      for (const maintenanceCase of cases) {
        const caseEntries = entriesByCase.get(maintenanceCase.id) || [];
        if (caseEntries.length) {
          for (const entry of caseEntries) {
            if (!entry.created_by) continue;
            const isFirstReporterEntry = Number(entry.created_by) === Number(maintenanceCase.reported_by)
              && entry.id === caseEntries[0].id;
            const result = insertLegacyReport.run(
              maintenanceCase.id,
              entry.created_by,
              isFirstReporterEntry ? String(maintenanceCase.title || 'Meldung').trim() : 'Meldung',
              String(entry.note || maintenanceCase.description || '').trim(),
              `entry:${entry.id}`,
              entry.created_at
            );
            insertPreference.run(result.lastInsertRowid);
          }
        } else if (maintenanceCase.reported_by) {
          const result = insertLegacyReport.run(
            maintenanceCase.id,
            maintenanceCase.reported_by,
            String(maintenanceCase.title || 'Meldung').trim(),
            String(maintenanceCase.description || '').trim(),
            `case:${maintenanceCase.id}`,
            db.prepare('SELECT created_at FROM maintenance_cases WHERE id = ?').get(maintenanceCase.id).created_at
          );
          insertPreference.run(result.lastInsertRowid);
        }
      }

      db.prepare(`
        UPDATE maintenance_entries
        SET entry_type = 'note', note = 'Meldung eingegangen.', created_by = NULL
        WHERE entry_type = 'report'
      `).run();
      db.prepare(`
        UPDATE maintenance_cases
        SET reported_by = NULL, title = 'Betriebsfall', description = ''
      `).run();
      const legacyAudits = db.prepare(`
        SELECT al.id, al.user_id, al.action, al.details, u.role
        FROM audit_log al LEFT JOIN users u ON u.id = al.user_id
        WHERE al.action IN (
          'maintenance_case.report', 'maintenance_case.note', 'maintenance_case.block',
          'maintenance_case.repair', 'maintenance_case.test', 'maintenance_case.release',
          'maintenance_case.close', 'resource.block'
        )
      `).all();
      const scrubAudit = db.prepare('UPDATE audit_log SET user_id = NULL, details = ? WHERE id = ?');
      for (const audit of legacyAudits) {
        if (audit.action === 'maintenance_case.report') {
          scrubAudit.run(JSON.stringify({ action: 'report_created' }), audit.id);
          continue;
        }
        let previous = {};
        try { previous = JSON.parse(audit.details || '{}'); } catch {}
        scrubAudit.run(JSON.stringify({
          action: audit.action.split('.').at(-1),
          ...(audit.user_id ? {
            actorRef: actorReference(audit.user_id),
            actorRole: audit.role || 'admin'
          } : {}),
          ...(typeof previous.status === 'string' ? { status: previous.status } : {}),
          ...(typeof previous.successful === 'boolean' ? { testSuccessful: previous.successful } : {})
        }), audit.id);
      }
      setSetting(REPORT_MIGRATION_KEY, '1');
    })();
    return { migrated: true };
  }

  function installSchemaAndMigrate() {
    installSchema();
    return migrateLegacyReports();
  }

  async function prepareLegacyMigration({ production = false, createVerifiedBackup } = {}) {
    installSchema();
    if (String(getSetting(REPORT_MIGRATION_KEY)) === '1') return { migrated: false, backupCreated: false };
    if (!legacyMigrationRequired()) {
      setSetting(REPORT_MIGRATION_KEY, '1');
      return { migrated: false, backupCreated: false };
    }
    if (production === true) {
      if (typeof createVerifiedBackup !== 'function') {
        const error = new Error('Die Tagebuchmigration benoetigt vor dem Produktionsstart ein verifiziertes Backup.');
        error.code = 'MAINTENANCE_MIGRATION_BACKUP_REQUIRED';
        throw error;
      }
      await createVerifiedBackup();
    }
    migrateLegacyReports();
    return { migrated: true, backupCreated: production === true };
  }

  function getSetting(key) {
    return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || '';
  }

  function setSetting(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value));
  }

  function adminSubscriptionsForHouse(houseId) {
    return db.prepare(`
      SELECT MAX(ps.id) AS id, ps.endpoint, MAX(ps.p256dh) AS p256dh, MAX(ps.auth) AS auth,
             MAX(u.language) AS language
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id AND u.active = 1
      JOIN user_house_roles uhr
        ON uhr.user_id = u.id AND uhr.house_id = ? AND uhr.role = 'house_admin'
      WHERE ps.active = 1 AND ps.house_id = ?
      GROUP BY ps.endpoint
      ORDER BY MAX(ps.id)
    `).all(houseId, houseId);
  }

  function insertNeutralAudit({
    houseId,
    actorUserId = null,
    actorRole = null,
    action,
    targetType,
    targetId,
    details = {}
  }) {
    const safeDetails = {
      ...(typeof details.action === 'string' ? { action: details.action } : {}),
      ...(typeof details.status === 'string' ? { status: details.status } : {}),
      ...(typeof details.testSuccessful === 'boolean' ? { testSuccessful: details.testSuccessful } : {}),
      ...(Number.isInteger(Number(details.deliveryCount)) ? { deliveryCount: Number(details.deliveryCount) } : {}),
      ...(Number.isInteger(Number(details.maintenanceCaseId)) ? { maintenanceCaseId: Number(details.maintenanceCaseId) } : {}),
      ...(actorUserId ? { actorRef: actorReference(actorUserId), actorRole: actorRole || 'admin' } : {})
    };
    db.prepare(`
      INSERT INTO audit_log (house_id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(houseId, null, action, targetType, String(targetId || ''), JSON.stringify(safeDetails));
  }

  function queueAdminInitial({ reportId, caseId, houseId }) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO maintenance_admin_notifications
        (report_id, case_id, house_id, subscription_id, endpoint_key, event_key, event_type)
      VALUES (?, ?, ?, ?, ?, 'initial', 'initial')
    `);
    for (const recipient of adminSubscriptionsForHouse(houseId)) {
      insert.run(reportId, caseId, houseId, recipient.id, endpointKey(recipient.endpoint));
    }
  }

  function reportDeliverySummary(reportId) {
    const rows = db.prepare(`
      SELECT state, last_error_code, COUNT(*) AS count FROM maintenance_admin_notifications
      WHERE report_id = ? GROUP BY state, last_error_code
    `).all(reportId);
    const summary = { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 };
    for (const row of rows) {
      const key = row.last_error_code === 'DELIVERY_UNKNOWN' ? 'unknown' : row.state;
      summary[key] = Number(summary[key] || 0) + Number(row.count);
    }
    return summary;
  }

  function retryAdminFailures({ houseId, caseId, actorUserId, actorRole }) {
    return db.transaction(() => {
      const maintenanceCase = db.prepare(`
        SELECT id FROM maintenance_cases WHERE id = ? AND house_id = ?
      `).get(caseId, houseId);
      if (!maintenanceCase) return { notFound: true, reset: 0, terminalized: 0, reportIds: [] };
      const terminalized = db.prepare(`
        UPDATE maintenance_admin_notifications
        SET state = 'unavailable', last_error_code = 'REMINDER_NO_LONGER_DUE',
            claim_token = NULL, claim_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE case_id = ? AND house_id = ? AND state = 'failed' AND event_type = 'reminder'
          AND provider_attempted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM maintenance_cases mc
            WHERE mc.id = maintenance_admin_notifications.case_id AND mc.status = 'reported'
          )
      `).run(caseId, houseId).changes;
      const reportIds = db.prepare(`
        SELECT DISTINCT report_id FROM maintenance_admin_notifications
        WHERE case_id = ? AND house_id = ? AND state = 'failed'
          AND provider_attempted_at IS NULL
          AND (
            event_type = 'initial'
            OR EXISTS (
              SELECT 1 FROM maintenance_cases mc
              WHERE mc.id = maintenance_admin_notifications.case_id AND mc.status = 'reported'
            )
          )
        ORDER BY report_id
      `).all(caseId, houseId).map((row) => row.report_id);
      const reset = db.prepare(`
        UPDATE maintenance_admin_notifications
        SET state = 'pending', last_error_code = NULL,
            claim_token = NULL, claim_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE case_id = ? AND house_id = ? AND state = 'failed'
          AND provider_attempted_at IS NULL
          AND (
            event_type = 'initial'
            OR EXISTS (
              SELECT 1 FROM maintenance_cases mc
              WHERE mc.id = maintenance_admin_notifications.case_id AND mc.status = 'reported'
            )
          )
      `).run(caseId, houseId).changes;
      if (reset > 0) {
        insertNeutralAudit({
          houseId,
          actorUserId,
          actorRole,
          action: 'maintenance_case.notification_retry',
          targetType: 'maintenance_case',
          targetId: caseId,
          details: { action: 'notification_retry', deliveryCount: reset }
        });
      }
      return { notFound: false, reset, terminalized, reportIds };
    })();
  }

  function createReport({ reporterUserId, houseId, submissionKey, input }) {
    const normalized = normalizeReportPayload(input);
    const hash = payloadHash(normalized);
    const existing = db.prepare(`
      SELECT id, case_id, submission_payload_hash FROM maintenance_reports
      WHERE reporter_user_id = ? AND submission_key = ?
    `).get(reporterUserId, submissionKey);
    if (existing) {
      if (existing.submission_payload_hash !== hash) {
        return { conflict: true };
      }
      return {
        id: existing.id,
        caseId: existing.case_id,
        replayed: true,
        delivery: reportDeliverySummary(existing.id)
      };
    }

    const availability = notificationAvailability(reporterUserId, houseId);
    if (normalized.notifyPush && !availability.push) return { unavailable: 'push' };
    if (normalized.notifyEmail && !availability.email) return { unavailable: 'email' };

    try {
      return db.transaction(() => {
        const resource = db.prepare(`
          SELECT id, name FROM resources WHERE id = ? AND house_id = ?
        `).get(normalized.resourceId, houseId);
        if (!resource) return { notFound: true };

        let maintenanceCase = db.prepare(`
          SELECT id FROM maintenance_cases
          WHERE house_id = ? AND resource_id = ? AND status != 'closed'
          ORDER BY created_at DESC, id DESC LIMIT 1
        `).get(houseId, resource.id);
        let addedToExisting = true;
        if (!maintenanceCase) {
          const createdCase = db.prepare(`
            INSERT INTO maintenance_cases
              (house_id, resource_id, reported_by, title, description, status)
            VALUES (?, ?, NULL, 'Betriebsfall', '', 'reported')
          `).run(houseId, resource.id);
          maintenanceCase = { id: createdCase.lastInsertRowid };
          addedToExisting = false;
        }

        const inserted = db.prepare(`
          INSERT INTO maintenance_reports
            (case_id, reporter_user_id, title, description, submission_key, submission_payload_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          maintenanceCase.id,
          reporterUserId,
          normalized.title,
          normalized.description,
          submissionKey,
          hash
        );
        const reportId = inserted.lastInsertRowid;
        db.prepare(`
          INSERT INTO maintenance_report_preferences (report_id, push_enabled, email_enabled)
          VALUES (?, ?, ?)
        `).run(reportId, normalized.notifyPush ? 1 : 0, normalized.notifyEmail ? 1 : 0);
        db.prepare('UPDATE maintenance_cases SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(maintenanceCase.id);
        queueAdminInitial({ reportId, caseId: maintenanceCase.id, houseId });
        insertNeutralAudit({
          houseId,
          action: 'maintenance_case.report',
          targetType: 'maintenance_case',
          targetId: maintenanceCase.id,
          details: { action: 'report_created' }
        });
        return {
          id: reportId,
          caseId: maintenanceCase.id,
          resourceName: resource.name,
          addedToExisting,
          replayed: false,
          delivery: reportDeliverySummary(reportId)
        };
      })();
    } catch (error) {
      if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error;
      const raced = db.prepare(`
        SELECT id, case_id, submission_payload_hash FROM maintenance_reports
        WHERE reporter_user_id = ? AND submission_key = ?
      `).get(reporterUserId, submissionKey);
      if (!raced || raced.submission_payload_hash !== hash) return { conflict: true };
      return {
        id: raced.id,
        caseId: raced.case_id,
        replayed: true,
        delivery: reportDeliverySummary(raced.id)
      };
    }
  }

  function residentReports(reporterUserId, houseId) {
    return db.prepare(`
      SELECT mr.id AS report_id, mr.title, mr.description, mr.created_at AS reported_at,
             mc.status AS technical_status, r.name AS resource_name, r.type AS resource_type,
             mrp.push_enabled, mrp.email_enabled,
             ru.active AS reporter_active, ru.email, ru.email_verified, ru.email_verified_value,
             ru.secondary_email, ru.secondary_email_verified, ru.secondary_email_verified_value,
             EXISTS (
               SELECT 1 FROM push_subscriptions ps
               WHERE ps.user_id = mr.reporter_user_id AND ps.house_id = mc.house_id AND ps.active = 1
             ) AS push_available
      FROM maintenance_reports mr
      JOIN maintenance_cases mc ON mc.id = mr.case_id
      JOIN users ru ON ru.id = mr.reporter_user_id
      LEFT JOIN resources r ON r.id = mc.resource_id
      LEFT JOIN maintenance_report_preferences mrp ON mrp.report_id = mr.id
      WHERE mr.reporter_user_id = ? AND mc.house_id = ?
      ORDER BY mr.created_at DESC, mr.id DESC
    `).all(reporterUserId, houseId).map((row) => ({
      report_id: row.report_id,
      title: row.title,
      description: row.description,
      reported_at: row.reported_at,
      status: visibleMaintenanceStatus(row.technical_status),
      resource_name: row.resource_name,
      resource_type: row.resource_type,
      notificationPreferences: {
        push: Boolean(row.push_enabled),
        email: Boolean(row.email_enabled)
      },
      notificationAvailability: {
        push: Boolean(row.reporter_active && row.push_available),
        email: Boolean(verifiedEmailForUser({
          active: row.reporter_active,
          email: row.email,
          email_verified: row.email_verified,
          email_verified_value: row.email_verified_value,
          secondary_email: row.secondary_email,
          secondary_email_verified: row.secondary_email_verified,
          secondary_email_verified_value: row.secondary_email_verified_value
        }))
      }
    }));
  }

  function notificationAvailability(reporterUserId, houseId) {
    const row = db.prepare(`
      SELECT u.active, u.email, u.email_verified, u.email_verified_value,
             u.secondary_email, u.secondary_email_verified, u.secondary_email_verified_value,
             EXISTS (
               SELECT 1 FROM push_subscriptions ps
               WHERE ps.user_id = u.id AND ps.house_id = ? AND ps.active = 1
             ) AS push_available
      FROM users u WHERE u.id = ?
    `).get(houseId, reporterUserId);
    return {
      push: Boolean(row?.active && row.push_available),
      email: Boolean(verifiedEmailForUser(row))
    };
  }

  function reportsForExport(reporterUserId) {
    return db.prepare(`
      SELECT mr.id, mr.title, mr.description, mr.created_at,
             mc.status AS technical_status,
             r.name AS resource_name, r.type AS resource_type, h.name AS house_name,
             mrp.push_enabled, mrp.email_enabled
      FROM maintenance_reports mr
      JOIN maintenance_cases mc ON mc.id = mr.case_id
      LEFT JOIN resources r ON r.id = mc.resource_id
      JOIN houses h ON h.id = mc.house_id
      LEFT JOIN maintenance_report_preferences mrp ON mrp.report_id = mr.id
      WHERE mr.reporter_user_id = ?
      ORDER BY mr.created_at, mr.id
    `).all(reporterUserId).map((row) => ({
        reportId: row.id,
        title: row.title,
        description: row.description,
        reportedAt: row.created_at,
        status: visibleMaintenanceStatus(row.technical_status),
        context: {
          houseName: row.house_name,
          resourceName: row.resource_name,
          resourceType: row.resource_type
        },
        notificationPreferences: {
          push: Boolean(row.push_enabled),
          email: Boolean(row.email_enabled)
        }
      }));
  }

  function deleteOwnReport({ reportId, reporterUserId }) {
    return db.transaction(() => {
      const report = db.prepare(`
        SELECT mr.id, mr.case_id, mc.house_id
        FROM maintenance_reports mr JOIN maintenance_cases mc ON mc.id = mr.case_id
        WHERE mr.id = ? AND mr.reporter_user_id = ?
      `).get(reportId, reporterUserId);
      if (!report) return false;
      db.prepare('DELETE FROM maintenance_reports WHERE id = ? AND reporter_user_id = ?')
        .run(report.id, reporterUserId);
      insertNeutralAudit({
        houseId: report.house_id,
        action: 'maintenance_case.report_deleted',
        targetType: 'maintenance_case',
        targetId: report.case_id,
        details: { action: 'personal_report_deleted' }
      });
      return true;
    })();
  }

  function updateOwnPreferences({ reportId, reporterUserId, push, email }) {
    const report = db.prepare(`
      SELECT mr.id, mc.house_id, u.active, u.email, u.email_verified, u.email_verified_value,
             u.secondary_email, u.secondary_email_verified, u.secondary_email_verified_value,
             EXISTS (
               SELECT 1 FROM push_subscriptions ps
               WHERE ps.user_id = u.id AND ps.house_id = mc.house_id AND ps.active = 1
             ) AS push_available
      FROM maintenance_reports mr
      JOIN maintenance_cases mc ON mc.id = mr.case_id
      JOIN users u ON u.id = mr.reporter_user_id
      WHERE mr.id = ? AND mr.reporter_user_id = ?
    `).get(reportId, reporterUserId);
    if (!report) return { notFound: true };
    if (push === true && !report.push_available) return { unavailable: 'push' };
    if (email === true && !verifiedEmailForUser(report)) {
      return { unavailable: 'email' };
    }
    db.prepare(`
      INSERT INTO maintenance_report_preferences (report_id, push_enabled, email_enabled, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(report_id) DO UPDATE SET
        push_enabled = excluded.push_enabled,
        email_enabled = excluded.email_enabled,
        updated_at = CURRENT_TIMESTAMP
    `).run(report.id, push === true ? 1 : 0, email === true ? 1 : 0);
    return { ok: true, push: push === true, email: email === true };
  }

  function queueReporterStatus(caseId, status) {
    if (!REPORT_STATUS_EVENTS.has(status)) return [];
    const reports = db.prepare(`
      SELECT mr.id, mr.reporter_user_id, mc.house_id, mrp.push_enabled, mrp.email_enabled,
             u.active, u.email, u.email_verified, u.email_verified_value,
             u.secondary_email, u.secondary_email_verified, u.secondary_email_verified_value
      FROM maintenance_reports mr
      JOIN maintenance_cases mc ON mc.id = mr.case_id
      JOIN maintenance_report_preferences mrp ON mrp.report_id = mr.id
      JOIN users u ON u.id = mr.reporter_user_id
      WHERE mr.case_id = ?
    `).all(caseId);
    const queued = [];
    const insertNotification = db.prepare(`
      INSERT OR IGNORE INTO maintenance_report_notifications (report_id, status, channel)
      VALUES (?, ?, ?)
    `);
    const insertDelivery = db.prepare(`
      INSERT OR IGNORE INTO maintenance_report_deliveries
        (notification_id, recipient_key, subscription_id, state)
      VALUES (?, ?, ?, 'pending')
    `);
    for (const report of reports) {
      if (report.push_enabled) {
        const notification = insertNotification.run(report.id, status, 'push');
        const notificationId = notification.changes
          ? notification.lastInsertRowid
          : db.prepare(`
              SELECT id FROM maintenance_report_notifications
              WHERE report_id = ? AND status = ? AND channel = 'push'
            `).get(report.id, status).id;
        const subscriptions = db.prepare(`
          SELECT MAX(id) AS id, endpoint FROM push_subscriptions
          WHERE user_id = ? AND house_id = ? AND active = 1 GROUP BY endpoint
        `).all(report.reporter_user_id, report.house_id);
        for (const subscription of subscriptions) {
          insertDelivery.run(notificationId, endpointKey(subscription.endpoint), subscription.id);
        }
        if (notification.changes) queued.push(notificationId);
      }
      if (report.email_enabled && verifiedEmailForUser(report)) {
        const notification = insertNotification.run(report.id, status, 'email');
        const notificationId = notification.changes
          ? notification.lastInsertRowid
          : db.prepare(`
              SELECT id FROM maintenance_report_notifications
              WHERE report_id = ? AND status = ? AND channel = 'email'
            `).get(report.id, status).id;
        insertDelivery.run(notificationId, 'verified-account-email', null);
        if (notification.changes) queued.push(notificationId);
      }
    }
    return queued;
  }

  function queueDueReminders(at = now()) {
    const atMs = at instanceof Date ? at.getTime() : new Date(at).getTime();
    const reports = db.prepare(`
      SELECT mr.id, mr.case_id, mc.house_id, mr.created_at
      FROM maintenance_reports mr
      JOIN maintenance_cases mc ON mc.id = mr.case_id
      WHERE mc.status = 'reported'
      ORDER BY mr.id
    `).all();
    let inserted = 0;
    const insert = db.prepare(`
      INSERT OR IGNORE INTO maintenance_admin_notifications
        (report_id, case_id, house_id, subscription_id, endpoint_key, event_key, event_type, reminder_window)
      VALUES (?, ?, ?, ?, ?, ?, 'reminder', ?)
    `);
    for (const report of reports) {
      const ageMs = atMs - new Date(`${report.created_at}Z`).getTime();
      const dueWindow = Math.floor(ageMs / (2 * 60 * 60 * 1000));
      if (dueWindow < 1) continue;
      const eventKey = `reminder:${dueWindow}`;
      for (const recipient of adminSubscriptionsForHouse(report.house_id)) {
        inserted += insert.run(
          report.id,
          report.case_id,
          report.house_id,
          recipient.id,
          endpointKey(recipient.endpoint),
          eventKey,
          dueWindow
        ).changes;
      }
    }
    return inserted;
  }

  function genericReporterCopy(status, language) {
    const english = String(language || '').toLowerCase() === 'en';
    if (status === 'done') {
      return english
        ? 'The status of your report changed to Done.'
        : 'Der Status deiner Meldung wurde auf Erledigt geaendert.';
    }
    return english
      ? 'The status of your report changed to In progress.'
      : 'Der Status deiner Meldung wurde auf In Bearbeitung geaendert.';
  }

  function claimOutbox(table, id, { includeFailed = false } = {}) {
    if (!['maintenance_admin_notifications', 'maintenance_report_deliveries'].includes(table)) {
      throw new Error('Unsupported outbox table.');
    }
    const claimedAt = now();
    const claimedAtMs = claimedAt instanceof Date ? claimedAt.getTime() : new Date(claimedAt).getTime();
    const token = crypto.randomBytes(16).toString('hex');
    const states = includeFailed ? "state IN ('pending', 'failed')" : "state = 'pending'";
    const result = db.prepare(`
      UPDATE ${table}
      SET claim_token = ?, claim_expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND ${states}
        AND provider_attempted_at IS NULL
        AND (claim_token IS NULL OR claim_expires_at IS NULL OR claim_expires_at <= ?)
    `).run(token, claimedAtMs + DELIVERY_CLAIM_LEASE_MS, id, claimedAtMs);
    return result.changes === 1 ? token : null;
  }

  function settleOutbox(table, id, token, state, errorCode = null) {
    const sent = state === 'sent';
    return db.prepare(`
      UPDATE ${table}
      SET state = ?, last_error_code = ?,
          sent_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE sent_at END,
          claim_token = NULL, claim_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND claim_token = ?
        AND (? = 0 OR provider_attempted_at IS NOT NULL)
    `).run(state, errorCode, sent ? 1 : 0, id, token, sent ? 1 : 0).changes;
  }

  function beginProviderAttempt(table, id, token) {
    return db.prepare(`
      UPDATE ${table}
      SET state = 'failed', attempts = attempts + 1,
          provider_attempted_at = CURRENT_TIMESTAMP,
          last_error_code = 'DELIVERY_UNKNOWN', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND claim_token = ? AND provider_attempted_at IS NULL
    `).run(id, token).changes;
  }

  function finalizeUnknownDelivery(table, id, token) {
    return db.prepare(`
      UPDATE ${table}
      SET state = 'failed', last_error_code = 'DELIVERY_UNKNOWN',
          claim_token = NULL, claim_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND claim_token = ? AND provider_attempted_at IS NOT NULL
    `).run(id, token).changes;
  }

  function releaseOutboxClaim(table, id, token) {
    return db.prepare(`
      UPDATE ${table}
      SET claim_token = NULL, claim_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND claim_token = ? AND provider_attempted_at IS NULL
    `).run(id, token).changes;
  }

  async function deliverAdminNotifications(req, reportId = null) {
    const rows = db.prepare(`
      SELECT id FROM maintenance_admin_notifications
      WHERE state = 'pending' AND (? IS NULL OR report_id = ?)
      ORDER BY id
    `).all(reportId, reportId);
    if (!rows.length) return { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 };

    let configured = false;
    try {
      configured = applyPushConfig(req).configured === true;
    } catch {}
    const summary = { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 };
    if (!configured) {
      summary.pending = rows.length;
      return summary;
    }
    for (const pendingRow of rows) {
      const claimToken = claimOutbox('maintenance_admin_notifications', pendingRow.id);
      if (!claimToken) continue;
      const row = db.prepare(`
        SELECT man.*, ps.endpoint, ps.p256dh, ps.auth,
               ps.active AS subscription_active, ps.house_id AS subscription_house_id,
               u.active AS user_active, u.language, uhr.user_id AS current_house_admin,
               mc.status AS case_status, r.name AS resource_name, h.name AS house_name
        FROM maintenance_admin_notifications man
        LEFT JOIN push_subscriptions ps ON ps.id = man.subscription_id
        LEFT JOIN users u ON u.id = ps.user_id
        LEFT JOIN user_house_roles uhr
          ON uhr.user_id = u.id AND uhr.house_id = man.house_id AND uhr.role = 'house_admin'
        JOIN maintenance_cases mc ON mc.id = man.case_id
        LEFT JOIN resources r ON r.id = mc.resource_id
        JOIN houses h ON h.id = man.house_id
        WHERE man.id = ? AND man.state = 'pending' AND man.claim_token = ?
      `).get(pendingRow.id, claimToken);
      if (!row) continue;
      const eligible = row.subscription_active === 1
        && row.user_active === 1
        && Number(row.subscription_house_id) === Number(row.house_id)
        && Boolean(row.current_house_admin)
        && Boolean(row.endpoint)
        && endpointKey(row.endpoint) === row.endpoint_key;
      if (!eligible || (row.event_type === 'reminder' && row.case_status !== 'reported')) {
        settleOutbox(
          'maintenance_admin_notifications',
          row.id,
          claimToken,
          'unavailable',
          eligible ? 'REMINDER_NO_LONGER_DUE' : 'RECIPIENT_NO_LONGER_AUTHORIZED'
        );
        summary.unavailable += 1;
        continue;
      }
      let prepared;
      try {
        const english = String(row.language || '').toLowerCase() === 'en';
        const title = english ? 'WaschZeit: New maintenance report' : 'WaschZeit: Neue Stoerungsmeldung';
        const body = row.event_type === 'reminder'
          ? (english
              ? `A new report for ${row.resource_name} in ${row.house_name} is still waiting for review.`
              : `Eine neue Meldung zu ${row.resource_name} in ${row.house_name} wartet noch auf Pruefung.`)
          : (english
              ? `A new report for ${row.resource_name} in ${row.house_name} is ready for review.`
              : `Eine neue Meldung zu ${row.resource_name} in ${row.house_name} ist eingegangen.`);
        prepared = {
          subscription: subscriptionForRow(row),
          payload: pushPayload({
            title,
            body,
            url: `/index.html?maintenance=${row.case_id}`,
            tag: `maintenance-${row.report_id}-${row.event_key}`
          })
        };
      } catch {
        releaseOutboxClaim('maintenance_admin_notifications', row.id, claimToken);
        summary.pending += 1;
        continue;
      }
      if (beginProviderAttempt('maintenance_admin_notifications', row.id, claimToken) !== 1) {
        summary.pending += 1;
        continue;
      }
      try {
        await sendPushNotification(prepared.subscription, prepared.payload);
        if (settleOutbox('maintenance_admin_notifications', row.id, claimToken, 'sent') === 1) {
          summary.sent += 1;
        } else {
          summary.unknown += 1;
        }
      } catch {
        finalizeUnknownDelivery('maintenance_admin_notifications', row.id, claimToken);
        summary.unknown += 1;
      }
    }
    return summary;
  }

  async function deliverReporterNotifications(req, notificationIds = []) {
    if (!notificationIds.length) return { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 };
    const placeholders = notificationIds.map(() => '?').join(',');
    const deliveries = db.prepare(`
      SELECT mrd.id
      FROM maintenance_report_deliveries mrd
      WHERE mrd.state IN ('pending', 'failed') AND mrd.notification_id IN (${placeholders})
      ORDER BY mrd.id
    `).all(...notificationIds);
    const summary = { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 };
    let pushConfigured = false;
    try { pushConfigured = applyPushConfig(req).configured === true; } catch {}
    const mailConfig = smtpConfig();

    for (const pendingDelivery of deliveries) {
      const claimToken = claimOutbox('maintenance_report_deliveries', pendingDelivery.id, { includeFailed: true });
      if (!claimToken) continue;
      const delivery = db.prepare(`
        SELECT mrd.id, mrd.subscription_id, mrd.recipient_key, mrd.state AS delivery_state,
               mrn.status, mrn.channel, mr.reporter_user_id, mc.house_id,
               mrp.push_enabled, mrp.email_enabled,
               u.id AS active_user_id, u.house_id AS user_house_id,
               u.language, u.email, u.secondary_email,
               u.email_verified, u.email_verified_value,
               u.secondary_email_verified, u.secondary_email_verified_value,
               ps.user_id AS subscription_user_id, ps.house_id AS subscription_house_id,
               ps.active AS subscription_active, ps.endpoint, ps.p256dh, ps.auth
        FROM maintenance_report_deliveries mrd
        JOIN maintenance_report_notifications mrn ON mrn.id = mrd.notification_id
        JOIN maintenance_reports mr ON mr.id = mrn.report_id
        JOIN maintenance_cases mc ON mc.id = mr.case_id
        LEFT JOIN maintenance_report_preferences mrp ON mrp.report_id = mr.id
        LEFT JOIN users u ON u.id = mr.reporter_user_id AND u.active = 1
        LEFT JOIN push_subscriptions ps ON ps.id = mrd.subscription_id
        WHERE mrd.id = ? AND mrd.state IN ('pending', 'failed') AND mrd.claim_token = ?
      `).get(pendingDelivery.id, claimToken);
      if (!delivery) continue;

      const currentReporter = Boolean(delivery.active_user_id)
        && Number(delivery.user_house_id) === Number(delivery.house_id)
        && REPORT_STATUS_EVENTS.has(delivery.status);
      const pushEligible = delivery.channel === 'push'
        && currentReporter
        && delivery.push_enabled === 1
        && delivery.subscription_active === 1
        && Number(delivery.subscription_user_id) === Number(delivery.reporter_user_id)
        && Number(delivery.subscription_house_id) === Number(delivery.house_id)
        && Boolean(delivery.endpoint)
        && endpointKey(delivery.endpoint) === delivery.recipient_key;
      const emailEligible = delivery.channel === 'email'
        && currentReporter
        && delivery.email_enabled === 1
        && Boolean(verifiedEmailForUser({
          active: delivery.active_user_id ? 1 : 0,
          email: delivery.email,
          email_verified: delivery.email_verified,
          email_verified_value: delivery.email_verified_value,
          secondary_email: delivery.secondary_email,
          secondary_email_verified: delivery.secondary_email_verified,
          secondary_email_verified_value: delivery.secondary_email_verified_value
        }));
      if (!pushEligible && !emailEligible) {
        settleOutbox(
          'maintenance_report_deliveries', delivery.id, claimToken,
          'unavailable', 'RECIPIENT_NO_LONGER_AUTHORIZED'
        );
        summary.unavailable += 1;
        continue;
      }

      const copy = genericReporterCopy(delivery.status, delivery.language);
      let providerCall;
      try {
        if (delivery.channel === 'push') {
          if (!pushConfigured || !delivery.endpoint) {
            summary.pending += 1;
            releaseOutboxClaim('maintenance_report_deliveries', delivery.id, claimToken);
            continue;
          }
          const subscription = subscriptionForRow(delivery);
          const payload = pushPayload({
            title: 'WaschZeit',
            body: copy,
            url: '/index.html?reports=1',
            tag: `maintenance-report-${delivery.status}`
          });
          providerCall = () => sendPushNotification(subscription, payload);
        } else {
          const email = verifiedEmailForUser({
            active: delivery.active_user_id ? 1 : 0,
            email: delivery.email,
            email_verified: delivery.email_verified,
            email_verified_value: delivery.email_verified_value,
            secondary_email: delivery.secondary_email,
            secondary_email_verified: delivery.secondary_email_verified,
            secondary_email_verified_value: delivery.secondary_email_verified_value
          });
          if (!mailConfig.host || !mailConfig.from || !email) {
            summary.pending += 1;
            releaseOutboxClaim('maintenance_report_deliveries', delivery.id, claimToken);
            continue;
          }
          const message = {
            config: mailConfig,
            to: email,
            subject: 'WaschZeit',
            text: copy
          };
          providerCall = () => sendMail(message);
        }
      } catch {
        releaseOutboxClaim('maintenance_report_deliveries', delivery.id, claimToken);
        summary.pending += 1;
        continue;
      }
      if (beginProviderAttempt('maintenance_report_deliveries', delivery.id, claimToken) !== 1) {
        summary.pending += 1;
        continue;
      }
      try {
        await providerCall();
        if (settleOutbox('maintenance_report_deliveries', delivery.id, claimToken, 'sent') === 1) {
          summary.sent += 1;
        } else {
          summary.unknown += 1;
        }
      } catch {
        finalizeUnknownDelivery('maintenance_report_deliveries', delivery.id, claimToken);
        summary.unknown += 1;
      }
    }
    return summary;
  }

  return {
    installSchemaAndMigrate,
    installSchema,
    legacyMigrationRequired,
    prepareLegacyMigration,
    createReport,
    residentReports,
    notificationAvailability,
    reportsForExport,
    deleteOwnReport,
    updateOwnPreferences,
    queueReporterStatus,
    queueDueReminders,
    retryAdminFailures,
    deliverAdminNotifications,
    deliverReporterNotifications,
    reportDeliverySummary,
    visibleMaintenanceStatus,
    insertNeutralAudit,
    actorReference
  };
}

module.exports = {
  REPORT_MIGRATION_KEY,
  ACTOR_SALT_KEY,
  OPEN_CASE_STATUSES,
  normalizeReportPayload,
  visibleMaintenanceStatus,
  createMaintenanceReporting
};
