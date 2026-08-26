'use strict';

const assert = require('assert/strict');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { createMaintenanceReporting } = require('../src/services/maintenance-reporting');

function createDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE houses (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      house_id INTEGER,
      language TEXT NOT NULL DEFAULT 'de',
      email TEXT,
      secondary_email TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verified_value TEXT,
      secondary_email_verified INTEGER NOT NULL DEFAULT 0,
      secondary_email_verified_value TEXT
    );
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      house_id INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (house_id) REFERENCES houses(id)
    );
    CREATE TABLE maintenance_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL,
      resource_id INTEGER,
      reported_by INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'reported',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at TEXT,
      FOREIGN KEY (house_id) REFERENCES houses(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE maintenance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      entry_type TEXT NOT NULL,
      note TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES maintenance_cases(id),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES houses(id)
    );
    CREATE TABLE user_house_roles (
      user_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (user_id, house_id, role),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES houses(id)
    );
  `);
  return db;
}

function seedActors(db) {
  db.prepare('INSERT INTO houses (id, name) VALUES (1, ?), (2, ?)').run('Haus Eins', 'Haus Zwei');
  const insertUser = db.prepare(`
    INSERT INTO users
      (id, username, role, active, house_id, language, email, email_verified, email_verified_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(1, 'Reporter Eins', 'user', 1, 1, 'de', 'reporter1@example.test', 1, 'reporter1@example.test');
  insertUser.run(2, 'Reporter Zwei', 'user', 1, 1, 'en', 'reporter2@example.test', 1, 'reporter2@example.test');
  insertUser.run(3, 'Hausadmin Eins', 'admin', 1, 1, 'de', 'admin1@example.test', 1, 'admin1@example.test');
  insertUser.run(4, 'Globaler Superadmin', 'admin', 1, 1, 'de', 'global@example.test', 1, 'global@example.test');
  insertUser.run(5, 'Hausadmin Zwei', 'admin', 1, 2, 'en', 'admin2@example.test', 1, 'admin2@example.test');
  insertUser.run(6, 'Inaktiver Hausadmin', 'admin', 0, 1, 'de', 'inactive@example.test', 1, 'inactive@example.test');
  db.prepare(`
    INSERT INTO resources (id, name, type, house_id) VALUES
      (1, 'Waschmaschine Eins', 'washer', 1),
      (2, 'Waschmaschine Zwei', 'washer', 2),
      (3, 'Trockenraum Eins', 'drying_room', 1)
  `).run();
  db.prepare(`
    INSERT INTO user_house_roles (user_id, house_id, role) VALUES
      (3, 1, 'house_admin'), (5, 2, 'house_admin'), (6, 1, 'house_admin')
  `).run();
  const insertSubscription = db.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, 'key', 'auth')
  `);
  insertSubscription.run(3, 1, 'https://push.test/house-one-admin');
  insertSubscription.run(4, 1, 'https://push.test/global-superadmin');
  insertSubscription.run(5, 2, 'https://push.test/house-two-admin');
  insertSubscription.run(6, 1, 'https://push.test/inactive-house-one-admin');
}

function createHarness(db) {
  const calls = { push: [], email: [] };
  const state = {
    pushConfigured: true,
    emailConfigured: true,
    pushFails: false,
    emailFails: false,
    payloadFails: false,
    beforeDeliveryRevalidation: null,
    pushBarrier: null,
    afterPushAttempt: null,
    currentTime: new Date('2026-01-01T00:00:00Z')
  };
  const service = createMaintenanceReporting({
    db,
    crypto,
    pushStatus: () => ({ configured: state.pushConfigured }),
    applyPushConfig: () => {
      if (state.beforeDeliveryRevalidation) {
        const callback = state.beforeDeliveryRevalidation;
        state.beforeDeliveryRevalidation = null;
        callback();
      }
      return { configured: state.pushConfigured };
    },
    pushPayload: (payload) => {
      if (state.payloadFails) throw new Error('synthetic pre-provider payload failure');
      return JSON.stringify(payload);
    },
    subscriptionForRow: (row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }),
    sendPushNotification: async (subscription, payload) => {
      calls.push.push({ subscription, payload });
      if (state.afterPushAttempt) await state.afterPushAttempt(calls.push.length, subscription);
      if (state.pushBarrier) await state.pushBarrier();
      if (state.pushFails) throw Object.assign(new Error('synthetic provider failure'), { code: 'FAKE_PUSH_FAILURE' });
    },
    smtpConfig: () => state.emailConfigured
      ? ({ host: 'smtp.test', from: 'sender@example.test' })
      : ({ host: '', from: '' }),
    sendMail: async (message) => {
      calls.email.push(message);
      if (state.emailFails) throw Object.assign(new Error('synthetic mail failure'), { code: 'FAKE_MAIL_FAILURE' });
    },
    publicAppUrl: () => 'https://app.example.test',
    now: () => new Date(state.currentTime)
  });
  return { service, calls, state };
}

async function verifyCurrentModel() {
  const db = createDatabase();
  seedActors(db);
  const { service, calls, state } = createHarness(db);
  service.installSchemaAndMigrate();
  const actorRef = service.actorReference(3);
  assert.equal(actorRef, service.actorReference(3));
  assert.match(actorRef, /^actor-[a-f0-9]{16}$/);
  assert.notEqual(
    actorRef,
    `actor-${crypto.createHash('sha256').update('maintenance:3').digest('hex').slice(0, 16)}`
  );

  const input = {
    resourceId: 1,
    title: 'PRIVATE-TITLE-ONE',
    description: 'PRIVATE-DESCRIPTION-ONE',
    notifyPush: false,
    notifyEmail: false
  };
  const created = service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'unit-report-key-0001',
    input
  });
  assert.equal(created.replayed, false);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_cases').get().count, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_admin_notifications').get().count, 1);
  assert.equal(
    db.prepare('SELECT subscription_id FROM maintenance_admin_notifications').get().subscription_id,
    1,
    'Only the explicitly assigned house admin endpoint is queued.'
  );

  state.pushFails = true;
  const failedDelivery = await service.deliverAdminNotifications({}, created.id);
  assert.deepEqual(failedDelivery, { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 1 });
  assert.equal(db.prepare('SELECT state FROM maintenance_admin_notifications').get().state, 'failed');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count, 1);

  assert.equal(service.retryAdminFailures({
    houseId: 2,
    caseId: created.caseId,
    actorUserId: 3,
    actorRole: 'admin'
  }).notFound, true);
  const retry = service.retryAdminFailures({
    houseId: 1,
    caseId: created.caseId,
    actorUserId: 3,
    actorRole: 'admin'
  });
  assert.deepEqual(retry.reportIds, []);
  assert.equal(retry.reset, 0);
  state.pushFails = false;
  assert.deepEqual(
    await service.deliverAdminNotifications({}, created.id),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.equal(db.prepare('SELECT state FROM maintenance_admin_notifications').get().state, 'failed');
  assert.equal(service.retryAdminFailures({
    houseId: 1,
    caseId: created.caseId,
    actorUserId: 3,
    actorRole: 'admin'
  }).reset, 0);
  assert.deepEqual(
    await service.deliverAdminNotifications({}, created.id),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );

  const replayed = service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'unit-report-key-0001',
    input
  });
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.id, created.id);
  assert.equal(replayed.delivery.unknown, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_admin_notifications').get().count, 1);
  assert.equal(service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'unit-report-key-0001',
    input: { ...input, notifyEmail: true }
  }).conflict, true);
  assert.equal(service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'unit-report-key-foreign',
    input: { ...input, resourceId: 2 }
  }).notFound, true);

  const second = service.createReport({
    reporterUserId: 2,
    houseId: 1,
    submissionKey: 'unit-report-key-0002',
    input: {
      resourceId: 1,
      title: 'PRIVATE-TITLE-TWO',
      description: 'PRIVATE-DESCRIPTION-TWO',
      notifyPush: false,
      notifyEmail: false
    }
  });
  assert.equal(second.caseId, created.caseId);
  assert.deepEqual(service.residentReports(1, 1).map((row) => row.title), ['PRIVATE-TITLE-ONE']);
  assert.deepEqual(service.residentReports(2, 1).map((row) => row.title), ['PRIVATE-TITLE-TWO']);
  assert.equal(service.residentReports(1, 2).length, 0);
  const residentProjection = service.residentReports(1, 1)[0];
  assert.deepEqual(Object.keys(residentProjection).sort(), [
    'description', 'notificationAvailability', 'notificationPreferences', 'report_id', 'reported_at',
    'resource_name', 'resource_type', 'status', 'title'
  ]);
  assert.equal(residentProjection.status, 'new');
  assert.equal(Object.hasOwn(residentProjection, 'technical_status'), false);
  assert.equal(Object.hasOwn(residentProjection, 'id'), false);
  assert.deepEqual(residentProjection.notificationAvailability, { push: false, email: true });
  const ownExport = service.reportsForExport(1);
  assert.deepEqual(ownExport.map((row) => row.title), ['PRIVATE-TITLE-ONE']);
  assert.deepEqual(Object.keys(ownExport[0]).sort(), [
    'context', 'description', 'notificationPreferences', 'reportId', 'reportedAt', 'status', 'title'
  ]);
  assert.deepEqual(Object.keys(ownExport[0].context).sort(), ['houseName', 'resourceName', 'resourceType']);
  assert.equal(Object.hasOwn(ownExport[0], 'case'), false);
  assert.equal(Object.hasOwn(ownExport[0], 'notificationDeliveries'), false);
  assert.ok(!JSON.stringify(ownExport).includes('PRIVATE-TITLE-TWO'));

  const beforeRollback = {
    cases: db.prepare('SELECT COUNT(*) AS count FROM maintenance_cases').get().count,
    reports: db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count,
    audits: db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count,
    outbox: db.prepare('SELECT COUNT(*) AS count FROM maintenance_admin_notifications').get().count
  };
  db.exec(`
    CREATE TRIGGER fail_maintenance_audit BEFORE INSERT ON audit_log
    WHEN NEW.target_type = 'maintenance_case'
    BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END;
  `);
  assert.throws(() => service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'unit-report-key-rollback',
    input: {
      resourceId: 3,
      title: 'ROLLBACK-TITLE',
      description: 'ROLLBACK-DESCRIPTION',
      notifyPush: false,
      notifyEmail: false
    }
  }), /synthetic audit failure/);
  db.exec('DROP TRIGGER fail_maintenance_audit');
  assert.deepEqual({
    cases: db.prepare('SELECT COUNT(*) AS count FROM maintenance_cases').get().count,
    reports: db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count,
    audits: db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count,
    outbox: db.prepare('SELECT COUNT(*) AS count FROM maintenance_admin_notifications').get().count
  }, beforeRollback);

  db.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth)
    VALUES (1, 1, 'https://push.test/reporter-one', 'key', 'auth')
  `).run();
  assert.deepEqual(service.notificationAvailability(1, 1), { push: true, email: true });
  assert.deepEqual(service.notificationAvailability(1, 2), { push: false, email: true });
  db.prepare("UPDATE push_subscriptions SET active = 0 WHERE endpoint = 'https://push.test/reporter-one'").run();
  assert.equal(service.updateOwnPreferences({
    reportId: created.id,
    reporterUserId: 1,
    push: true,
    email: false
  }).unavailable, 'push');
  db.prepare("UPDATE push_subscriptions SET active = 1, house_id = 2 WHERE endpoint = 'https://push.test/reporter-one'").run();
  assert.equal(service.updateOwnPreferences({
    reportId: created.id,
    reporterUserId: 1,
    push: true,
    email: false
  }).unavailable, 'push');
  db.prepare("UPDATE push_subscriptions SET house_id = 1 WHERE endpoint = 'https://push.test/reporter-one'").run();
  assert.deepEqual(service.updateOwnPreferences({
    reportId: created.id,
    reporterUserId: 1,
    push: true,
    email: true
  }), { ok: true, push: true, email: true });
  assert.equal(service.updateOwnPreferences({
    reportId: created.id,
    reporterUserId: 2,
    push: false,
    email: false
  }).notFound, true);

  const pushCallsBeforeReporterDelivery = calls.push.length;
  const emailCallsBeforeReporterDelivery = calls.email.length;
  const notificationIds = db.transaction(() => service.queueReporterStatus(created.caseId, 'in_progress'))();
  assert.equal(notificationIds.length, 2);
  state.pushFails = false;
  const reporterDelivery = await service.deliverReporterNotifications({}, notificationIds);
  assert.deepEqual(reporterDelivery, { pending: 0, sent: 2, failed: 0, unavailable: 0, unknown: 0 });
  const serializedDelivery = JSON.stringify({
    push: calls.push.slice(pushCallsBeforeReporterDelivery),
    email: calls.email.slice(emailCallsBeforeReporterDelivery)
  });
  assert.ok(!serializedDelivery.includes('PRIVATE-TITLE'));
  assert.ok(!serializedDelivery.includes('PRIVATE-DESCRIPTION'));
  assert.ok(!serializedDelivery.includes('Haus Eins'));
  assert.ok(!serializedDelivery.includes('Waschmaschine Eins'));
  assert.deepEqual(service.queueReporterStatus(created.caseId, 'in_progress'), []);

  db.prepare("UPDATE maintenance_reports SET created_at = '2026-01-01 00:00:00'").run();
  const adminCount = () => db.prepare(`
    SELECT COUNT(*) AS count FROM maintenance_admin_notifications WHERE event_type = 'reminder'
  `).get().count;
  assert.equal(service.queueDueReminders(new Date('2026-01-01T01:59:59Z')), 0);
  assert.equal(adminCount(), 0);
  assert.equal(service.queueDueReminders(new Date('2026-01-01T02:00:00Z')), 2);
  assert.equal(adminCount(), 2);
  assert.equal(service.queueDueReminders(new Date('2026-01-01T03:59:59Z')), 0);
  assert.equal(adminCount(), 2);
  assert.equal(service.queueDueReminders(new Date('2026-01-01T04:00:00Z')), 2);
  assert.equal(adminCount(), 4);
  assert.equal(service.queueDueReminders(new Date('2026-01-01T10:30:00Z')), 2);
  assert.equal(adminCount(), 6);
  db.prepare("UPDATE maintenance_cases SET status = 'blocked' WHERE id = ?").run(created.caseId);
  assert.equal(service.queueDueReminders(new Date('2026-01-01T12:00:00Z')), 0);
  assert.equal(adminCount(), 6);

  const historicOtherHouseReport = service.createReport({
    reporterUserId: 1,
    houseId: 2,
    submissionKey: 'unit-report-key-historic-house-two',
    input: {
      resourceId: 2,
      title: 'OWN-HISTORIC-HOUSE-TWO',
      description: 'Eigene historische Meldung aus einem anderen Haus.',
      notifyPush: false,
      notifyEmail: false
    }
  });
  assert.equal(historicOtherHouseReport.replayed, false);
  assert.equal(service.residentReports(1, 1).length, 1);
  assert.equal(service.residentReports(1, 2).length, 1);
  assert.deepEqual(
    service.reportsForExport(1).map((report) => report.title).sort(),
    ['OWN-HISTORIC-HOUSE-TWO', 'PRIVATE-TITLE-ONE']
  );

  for (let index = 1; index <= 9; index += 1) {
    service.createReport({
      reporterUserId: 1,
      houseId: 1,
      submissionKey: `unit-report-complete-list-${String(index).padStart(2, '0')}`,
      input: {
        resourceId: 1,
        title: `OWN-LIST-TITLE-${index}`,
        description: `OWN-LIST-DESCRIPTION-${index}`,
        notifyPush: false,
        notifyEmail: false
      }
    });
  }
  const completeOwnList = service.residentReports(1, 1);
  assert.equal(completeOwnList.length, 10, 'All own reports must remain available beyond eight entries.');
  assert.ok(completeOwnList.some((report) => report.description === 'OWN-LIST-DESCRIPTION-9'));
  assert.ok(!JSON.stringify(completeOwnList).includes('PRIVATE-DESCRIPTION-TWO'));

  const neutralCore = db.prepare('SELECT reported_by, title, description FROM maintenance_cases WHERE id = ?')
    .get(created.caseId);
  assert.deepEqual(neutralCore, { reported_by: null, title: 'Betriebsfall', description: '' });
  service.insertNeutralAudit({
    houseId: 1,
    actorUserId: 3,
    actorRole: 'admin',
    action: 'maintenance_case.note',
    targetType: 'maintenance_case',
    targetId: created.caseId,
    details: {
      action: 'note',
      title: 'PRIVATE-AUDIT-TITLE',
      description: 'PRIVATE-AUDIT-DESCRIPTION',
      reporterName: 'Reporter Eins',
      reporterContact: 'reporter1@example.test'
    }
  });
  const maintenanceAudits = db.prepare(`
    SELECT user_id, details FROM audit_log WHERE target_type = 'maintenance_case'
  `).all();
  assert.ok(maintenanceAudits.every((audit) => audit.user_id === null));
  const auditText = JSON.stringify(maintenanceAudits);
  assert.ok(!auditText.includes('PRIVATE-'));
  assert.ok(!auditText.includes('Reporter Eins'));
  assert.ok(!auditText.includes('reporter1@example.test'));

  assert.equal(service.deleteOwnReport({ reportId: second.id, reporterUserId: 1 }), false);
  assert.equal(service.deleteOwnReport({ reportId: second.id, reporterUserId: 2 }), true);
  assert.equal(service.residentReports(2, 1).length, 0);
  assert.ok(db.prepare('SELECT id FROM maintenance_cases WHERE id = ?').get(created.caseId));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports WHERE id = ?').get(second.id).count, 0);

  db.prepare('DELETE FROM users WHERE id = 1').run();
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count, 0);
  assert.ok(db.prepare('SELECT id FROM maintenance_cases WHERE id = ?').get(created.caseId));
  db.close();
}

async function verifyDeliveryRevalidation() {
  const db = createDatabase();
  seedActors(db);
  const { service, calls } = createHarness(db);
  service.installSchemaAndMigrate();
  let sequence = 0;
  const createQueuedReport = () => service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: `recipient-revalidation-${String(++sequence).padStart(4, '0')}`,
    input: {
      resourceId: 1,
      title: 'PRIVATE-REVALIDATION',
      description: 'PRIVATE-REVALIDATION-DESCRIPTION',
      notifyPush: false,
      notifyEmail: false
    }
  });
  const assertUnavailableWithoutPush = async (report) => {
    const before = calls.push.length;
    assert.deepEqual(
      await service.deliverAdminNotifications({}, report.id),
      { pending: 0, sent: 0, failed: 0, unavailable: 1, unknown: 0 }
    );
    assert.equal(calls.push.length, before);
    assert.equal(
      db.prepare('SELECT state FROM maintenance_admin_notifications WHERE report_id = ?').get(report.id).state,
      'unavailable'
    );
  };

  const revokedRole = createQueuedReport();
  db.prepare("DELETE FROM user_house_roles WHERE user_id = 3 AND house_id = 1 AND role = 'house_admin'").run();
  await assertUnavailableWithoutPush(revokedRole);
  db.prepare("INSERT INTO user_house_roles (user_id, house_id, role) VALUES (3, 1, 'house_admin')").run();

  const movedSubscription = createQueuedReport();
  db.prepare('UPDATE push_subscriptions SET house_id = 2 WHERE id = 1').run();
  await assertUnavailableWithoutPush(movedSubscription);
  db.prepare('UPDATE push_subscriptions SET house_id = 1 WHERE id = 1').run();

  const disabledSubscription = createQueuedReport();
  db.prepare('UPDATE push_subscriptions SET active = 0 WHERE id = 1').run();
  await assertUnavailableWithoutPush(disabledSubscription);
  db.prepare('UPDATE push_subscriptions SET active = 1 WHERE id = 1').run();

  const reassignedEndpoint = createQueuedReport();
  db.prepare("UPDATE push_subscriptions SET endpoint = 'https://push.test/reassigned-house-one-admin' WHERE id = 1").run();
  await assertUnavailableWithoutPush(reassignedEndpoint);
  db.prepare("UPDATE push_subscriptions SET endpoint = 'https://push.test/house-one-admin' WHERE id = 1").run();

  const staleReminder = createQueuedReport();
  db.prepare("UPDATE maintenance_reports SET created_at = '2026-01-01 00:00:00' WHERE id = ?")
    .run(staleReminder.id);
  assert.equal(service.queueDueReminders(new Date('2026-01-01T02:00:00Z')), 1);
  db.prepare("UPDATE maintenance_admin_notifications SET state = 'failed' WHERE report_id = ?").run(staleReminder.id);
  db.prepare("UPDATE maintenance_cases SET status = 'blocked' WHERE id = ?").run(staleReminder.caseId);
  const retry = service.retryAdminFailures({
    houseId: 1,
    caseId: staleReminder.caseId,
    actorUserId: 3,
    actorRole: 'admin'
  });
  assert.equal(retry.reset, 1, 'The initial event remains explicitly retryable.');
  assert.equal(retry.terminalized, 1, 'The obsolete reminder is terminalized.');
  assert.deepEqual(retry.reportIds, [staleReminder.id]);
  assert.deepEqual(
    await service.deliverAdminNotifications({}, staleReminder.id),
    { pending: 0, sent: 1, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.deepEqual(
    db.prepare(`
      SELECT event_type, state, last_error_code FROM maintenance_admin_notifications
      WHERE report_id = ? ORDER BY event_type
    `).all(staleReminder.id),
    [
      { event_type: 'initial', state: 'sent', last_error_code: null },
      { event_type: 'reminder', state: 'unavailable', last_error_code: 'REMINDER_NO_LONGER_DUE' }
    ]
  );
  db.close();
}

async function verifyReporterDeliveryRevalidation() {
  const db = createDatabase();
  seedActors(db);
  const { service, calls, state } = createHarness(db);
  service.installSchemaAndMigrate();
  const subscriptionId = db.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth)
    VALUES (1, 1, 'https://push.test/reporter-revalidation', 'key', 'auth')
  `).run().lastInsertRowid;
  let sequence = 0;
  const queuePush = () => {
    const report = service.createReport({
      reporterUserId: 1,
      houseId: 1,
      submissionKey: `reporter-delivery-revalidation-${String(++sequence).padStart(4, '0')}`,
      input: {
        resourceId: 1,
        title: 'PRIVATE-REPORTER-DELIVERY',
        description: 'PRIVATE-REPORTER-DELIVERY-DESCRIPTION',
        notifyPush: true,
        notifyEmail: false
      }
    });
    const notificationIds = service.queueReporterStatus(report.caseId, 'in_progress');
    assert.equal(notificationIds.length, 1);
    return { report, notificationIds };
  };
  const assertUnavailable = async ({ report, notificationIds }, mutate) => {
    const before = calls.push.length;
    state.beforeDeliveryRevalidation = mutate;
    assert.deepEqual(
      await service.deliverReporterNotifications({}, notificationIds),
      { pending: 0, sent: 0, failed: 0, unavailable: 1, unknown: 0 }
    );
    assert.equal(calls.push.length, before, 'A stale reporter endpoint must never reach the provider.');
    assert.deepEqual(
      db.prepare(`
        SELECT state, attempts, last_error_code
        FROM maintenance_report_deliveries mrd
        JOIN maintenance_report_notifications mrn ON mrn.id = mrd.notification_id
        WHERE mrn.report_id = ?
      `).get(report.id),
      { state: 'unavailable', attempts: 0, last_error_code: 'RECIPIENT_NO_LONGER_AUTHORIZED' }
    );
    assert.equal(service.deleteOwnReport({ reportId: report.id, reporterUserId: 1 }), true);
  };

  await assertUnavailable(queuePush(), () => {
    db.prepare('UPDATE push_subscriptions SET user_id = 2 WHERE id = ?').run(subscriptionId);
  });
  db.prepare('UPDATE push_subscriptions SET user_id = 1 WHERE id = ?').run(subscriptionId);

  await assertUnavailable(queuePush(), () => {
    db.prepare("UPDATE push_subscriptions SET endpoint = 'https://push.test/reporter-reassigned' WHERE id = ?")
      .run(subscriptionId);
  });
  db.prepare("UPDATE push_subscriptions SET endpoint = 'https://push.test/reporter-revalidation' WHERE id = ?")
    .run(subscriptionId);

  await assertUnavailable(queuePush(), () => {
    db.prepare('UPDATE push_subscriptions SET house_id = 2 WHERE id = ?').run(subscriptionId);
  });
  db.prepare('UPDATE push_subscriptions SET house_id = 1 WHERE id = ?').run(subscriptionId);

  const optedOut = queuePush();
  await assertUnavailable(optedOut, () => {
    db.prepare('UPDATE maintenance_report_preferences SET push_enabled = 0 WHERE report_id = ?')
      .run(optedOut.report.id);
  });

  const valid = queuePush();
  const beforeValid = calls.push.length;
  assert.deepEqual(
    await service.deliverReporterNotifications({}, valid.notificationIds),
    { pending: 0, sent: 1, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.equal(calls.push.length, beforeValid + 1);
  assert.deepEqual(
    await service.deliverReporterNotifications({}, valid.notificationIds),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.equal(calls.push.length, beforeValid + 1, 'A valid endpoint is contacted exactly once.');
  db.close();
}

async function verifyAtomicOutboxClaims() {
  const adminDb = createDatabase();
  seedActors(adminDb);
  const adminHarness = createHarness(adminDb);
  adminHarness.service.installSchemaAndMigrate();
  const adminReport = adminHarness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'atomic-admin-claim-0001',
    input: {
      resourceId: 1,
      title: 'ATOMIC-ADMIN',
      description: 'ATOMIC-ADMIN-DESCRIPTION',
      notifyPush: false,
      notifyEmail: false
    }
  });
  let releaseAdmin;
  let adminStartedResolve;
  const adminStarted = new Promise((resolve) => { adminStartedResolve = resolve; });
  const adminGate = new Promise((resolve) => { releaseAdmin = resolve; });
  adminHarness.state.pushBarrier = async () => {
    adminStartedResolve();
    await adminGate;
  };
  const firstAdminRun = adminHarness.service.deliverAdminNotifications({}, adminReport.id);
  await adminStarted;
  adminHarness.state.currentTime = new Date('2026-01-01T00:06:00Z');
  const secondAdminRun = adminHarness.service.deliverAdminNotifications({}, adminReport.id);
  releaseAdmin();
  const adminResults = await Promise.all([firstAdminRun, secondAdminRun]);
  assert.equal(adminHarness.calls.push.length, 1, 'Only one concurrent admin worker may reach the provider.');
  assert.equal(adminResults.reduce((sum, item) => sum + item.sent, 0), 1);
  assert.deepEqual(
    adminDb.prepare(`
      SELECT state, attempts, claim_token, claim_expires_at
      FROM maintenance_admin_notifications WHERE report_id = ?
    `).get(adminReport.id),
    { state: 'sent', attempts: 1, claim_token: null, claim_expires_at: null }
  );
  adminDb.close();

  const reporterDb = createDatabase();
  seedActors(reporterDb);
  const reporterHarness = createHarness(reporterDb);
  reporterHarness.service.installSchemaAndMigrate();
  reporterDb.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth)
    VALUES (1, 1, 'https://push.test/atomic-reporter', 'key', 'auth')
  `).run();
  const reporterReport = reporterHarness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'atomic-reporter-claim-0001',
    input: {
      resourceId: 1,
      title: 'ATOMIC-REPORTER',
      description: 'ATOMIC-REPORTER-DESCRIPTION',
      notifyPush: true,
      notifyEmail: false
    }
  });
  const notificationIds = reporterHarness.service.queueReporterStatus(reporterReport.caseId, 'in_progress');
  reporterDb.prepare(`
    UPDATE maintenance_report_deliveries
    SET claim_token = 'expired-synthetic-lease', claim_expires_at = 0
    WHERE notification_id = ?
  `).run(notificationIds[0]);
  let releaseReporter;
  let reporterStartedResolve;
  const reporterStarted = new Promise((resolve) => { reporterStartedResolve = resolve; });
  const reporterGate = new Promise((resolve) => { releaseReporter = resolve; });
  reporterHarness.state.pushBarrier = async () => {
    reporterStartedResolve();
    await reporterGate;
  };
  const firstReporterRun = reporterHarness.service.deliverReporterNotifications({}, notificationIds);
  await reporterStarted;
  reporterHarness.state.currentTime = new Date('2026-01-01T00:06:00Z');
  const secondReporterRun = reporterHarness.service.deliverReporterNotifications({}, notificationIds);
  releaseReporter();
  const reporterResults = await Promise.all([firstReporterRun, secondReporterRun]);
  assert.equal(reporterHarness.calls.push.length, 1, 'Only one concurrent reporter worker may reach the provider.');
  assert.equal(reporterResults.reduce((sum, item) => sum + item.sent, 0), 1);
  assert.deepEqual(
    reporterDb.prepare(`
      SELECT state, attempts, claim_token, claim_expires_at
      FROM maintenance_report_deliveries
    `).get(),
    { state: 'sent', attempts: 1, claim_token: null, claim_expires_at: null }
  );

  const retryReport = reporterHarness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'atomic-reporter-retry-0001',
    input: {
      resourceId: 3,
      title: 'REPORTER-RETRY',
      description: 'REPORTER-RETRY-DESCRIPTION',
      notifyPush: true,
      notifyEmail: false
    }
  });
  const retryIds = reporterHarness.service.queueReporterStatus(retryReport.caseId, 'in_progress');
  reporterHarness.state.pushBarrier = null;
  reporterHarness.state.pushFails = true;
  assert.deepEqual(
    await reporterHarness.service.deliverReporterNotifications({}, retryIds),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 1 }
  );
  reporterHarness.state.pushFails = false;
  assert.deepEqual(
    await reporterHarness.service.deliverReporterNotifications({}, retryIds),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.deepEqual(
    reporterDb.prepare(`
      SELECT state, attempts, claim_token, claim_expires_at
      FROM maintenance_report_deliveries mrd
      JOIN maintenance_report_notifications mrn ON mrn.id = mrd.notification_id
      WHERE mrn.report_id = ?
    `).get(retryReport.id),
    { state: 'failed', attempts: 1, claim_token: null, claim_expires_at: null }
  );
  reporterDb.close();
}

async function verifyAdminMidBatchRevalidation() {
  const db = createDatabase();
  seedActors(db);
  db.prepare(`
    INSERT INTO users (id, username, role, active, house_id, language, email, email_verified)
    VALUES (7, 'Zweiter Hausadmin', 'admin', 1, 1, 'de', 'admin7@example.test', 1)
  `).run();
  db.prepare("INSERT INTO user_house_roles (user_id, house_id, role) VALUES (7, 1, 'house_admin')").run();
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth)
    VALUES (7, 1, 'https://push.test/second-house-one-admin', 'key', 'auth')
  `).run();
  const { service, calls, state } = createHarness(db);
  service.installSchemaAndMigrate();
  const report = service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'admin-mid-batch-revalidation-0001',
    input: {
      resourceId: 1,
      title: 'MID-BATCH',
      description: 'MID-BATCH-DESCRIPTION',
      notifyPush: false,
      notifyEmail: false
    }
  });
  state.afterPushAttempt = async (attempt) => {
    if (attempt === 1) {
      db.prepare("DELETE FROM user_house_roles WHERE user_id = 7 AND house_id = 1 AND role = 'house_admin'").run();
      db.prepare("UPDATE push_subscriptions SET endpoint = 'https://push.test/reassigned-admin' WHERE user_id = 7").run();
    }
  };
  assert.deepEqual(
    await service.deliverAdminNotifications({}, report.id),
    { pending: 0, sent: 1, failed: 0, unavailable: 1, unknown: 0 }
  );
  assert.equal(calls.push.length, 1, 'A later revoked batch recipient must not reach the provider.');
  assert.deepEqual(
    db.prepare(`
      SELECT state, last_error_code FROM maintenance_admin_notifications
      WHERE report_id = ? ORDER BY id
    `).all(report.id),
    [
      { state: 'sent', last_error_code: null },
      { state: 'unavailable', last_error_code: 'RECIPIENT_NO_LONGER_AUTHORIZED' }
    ]
  );
  db.close();
}

async function verifyAtMostOneAttemptFailureModes() {
  const adminDb = createDatabase();
  seedActors(adminDb);
  const adminHarness = createHarness(adminDb);
  adminHarness.service.installSchemaAndMigrate();
  const createAdminReport = (key) => adminHarness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: key,
    input: {
      resourceId: 1,
      title: 'ADMIN-ATTEMPT',
      description: 'ADMIN-ATTEMPT-DESCRIPTION',
      notifyPush: false,
      notifyEmail: false
    }
  });

  const settlementDrift = createAdminReport('admin-settlement-drift-0001');
  adminHarness.state.afterPushAttempt = async () => {
    adminDb.prepare(`
      UPDATE maintenance_admin_notifications SET claim_token = 'synthetic-settlement-drift'
      WHERE report_id = ?
    `).run(settlementDrift.id);
  };
  assert.deepEqual(
    await adminHarness.service.deliverAdminNotifications({}, settlementDrift.id),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 1 }
  );
  assert.equal(adminHarness.calls.push.length, 1);
  adminHarness.state.afterPushAttempt = null;
  assert.deepEqual(
    await adminHarness.service.deliverAdminNotifications({}, settlementDrift.id),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.deepEqual(
    adminDb.prepare(`
      SELECT state, attempts, last_error_code, provider_attempted_at IS NOT NULL AS attempted
      FROM maintenance_admin_notifications WHERE report_id = ?
    `).get(settlementDrift.id),
    { state: 'failed', attempts: 1, last_error_code: 'DELIVERY_UNKNOWN', attempted: 1 }
  );

  const preProvider = createAdminReport('admin-pre-provider-0001');
  const beforePreProvider = adminHarness.calls.push.length;
  adminHarness.state.payloadFails = true;
  assert.deepEqual(
    await adminHarness.service.deliverAdminNotifications({}, preProvider.id),
    { pending: 1, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.equal(adminHarness.calls.push.length, beforePreProvider);
  assert.deepEqual(
    adminDb.prepare(`
      SELECT state, attempts, provider_attempted_at, claim_token
      FROM maintenance_admin_notifications WHERE report_id = ?
    `).get(preProvider.id),
    { state: 'pending', attempts: 0, provider_attempted_at: null, claim_token: null }
  );
  adminHarness.state.payloadFails = false;
  assert.equal((await adminHarness.service.deliverAdminNotifications({}, preProvider.id)).sent, 1);
  assert.equal(adminHarness.calls.push.length, beforePreProvider + 1);

  const recovered = createAdminReport('admin-recovery-attempted-0001');
  adminDb.prepare(`
    UPDATE maintenance_admin_notifications
    SET state = 'failed', attempts = 1, provider_attempted_at = NULL,
        last_error_code = 'DELIVERY_UNKNOWN', claim_token = 'old-worker', claim_expires_at = 0
    WHERE report_id = ?
  `).run(recovered.id);
  adminHarness.service.installSchema();
  assert.equal(adminDb.prepare(`
    SELECT provider_attempted_at IS NOT NULL AS attempted
    FROM maintenance_admin_notifications WHERE report_id = ?
  `).get(recovered.id).attempted, 1);
  const beforeRecovery = adminHarness.calls.push.length;
  assert.equal(adminHarness.service.retryAdminFailures({
    houseId: 1,
    caseId: recovered.caseId,
    actorUserId: 3,
    actorRole: 'admin'
  }).reset, 0);
  assert.equal((await adminHarness.service.deliverAdminNotifications({}, recovered.id)).sent, 0);
  assert.equal(adminHarness.calls.push.length, beforeRecovery);
  adminDb.close();

  const reporterDb = createDatabase();
  seedActors(reporterDb);
  reporterDb.prepare(`
    INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth)
    VALUES (1, 1, 'https://push.test/reporter-at-most-one', 'key', 'auth')
  `).run();
  const reporterHarness = createHarness(reporterDb);
  reporterHarness.service.installSchemaAndMigrate();
  let sequence = 0;
  const queueReporter = () => {
    const report = reporterHarness.service.createReport({
      reporterUserId: 1,
      houseId: 1,
      submissionKey: `reporter-at-most-one-${String(++sequence).padStart(4, '0')}`,
      input: {
        resourceId: sequence % 2 ? 1 : 3,
        title: 'REPORTER-ATTEMPT',
        description: 'REPORTER-ATTEMPT-DESCRIPTION',
        notifyPush: true,
        notifyEmail: false
      }
    });
    return { report, notificationIds: reporterHarness.service.queueReporterStatus(report.caseId, 'in_progress') };
  };

  const reporterSettlement = queueReporter();
  reporterHarness.state.afterPushAttempt = async () => {
    reporterDb.prepare(`
      UPDATE maintenance_report_deliveries SET claim_token = 'synthetic-settlement-drift'
      WHERE notification_id = ?
    `).run(reporterSettlement.notificationIds[0]);
  };
  assert.deepEqual(
    await reporterHarness.service.deliverReporterNotifications({}, reporterSettlement.notificationIds),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 1 }
  );
  assert.equal(reporterHarness.calls.push.length, 1);
  reporterHarness.state.afterPushAttempt = null;
  assert.deepEqual(
    await reporterHarness.service.deliverReporterNotifications({}, reporterSettlement.notificationIds),
    { pending: 0, sent: 0, failed: 0, unavailable: 0, unknown: 0 }
  );
  assert.deepEqual(
    reporterDb.prepare(`
      SELECT state, attempts, last_error_code, provider_attempted_at IS NOT NULL AS attempted
      FROM maintenance_report_deliveries WHERE notification_id = ?
    `).get(reporterSettlement.notificationIds[0]),
    { state: 'failed', attempts: 1, last_error_code: 'DELIVERY_UNKNOWN', attempted: 1 }
  );

  const reporterPreProvider = queueReporter();
  const beforeReporterPreProvider = reporterHarness.calls.push.length;
  reporterHarness.state.payloadFails = true;
  assert.equal((await reporterHarness.service.deliverReporterNotifications(
    {}, reporterPreProvider.notificationIds
  )).pending, 1);
  assert.equal(reporterHarness.calls.push.length, beforeReporterPreProvider);
  reporterHarness.state.payloadFails = false;
  assert.equal((await reporterHarness.service.deliverReporterNotifications(
    {}, reporterPreProvider.notificationIds
  )).sent, 1);
  assert.equal(reporterHarness.calls.push.length, beforeReporterPreProvider + 1);

  const reporterRecovered = queueReporter();
  reporterDb.prepare(`
    UPDATE maintenance_report_deliveries
    SET state = 'failed', attempts = 1, provider_attempted_at = NULL,
        last_error_code = 'DELIVERY_UNKNOWN', claim_token = 'old-worker', claim_expires_at = 0
    WHERE notification_id = ?
  `).run(reporterRecovered.notificationIds[0]);
  reporterHarness.service.installSchema();
  assert.equal(reporterDb.prepare(`
    SELECT provider_attempted_at IS NOT NULL AS attempted
    FROM maintenance_report_deliveries WHERE notification_id = ?
  `).get(reporterRecovered.notificationIds[0]).attempted, 1);
  const beforeReporterRecovery = reporterHarness.calls.push.length;
  assert.equal((await reporterHarness.service.deliverReporterNotifications(
    {}, reporterRecovered.notificationIds
  )).sent, 0);
  assert.equal(reporterHarness.calls.push.length, beforeReporterRecovery);
  reporterDb.close();
}

async function verifyEmailAvailabilityContract() {
  const db = createDatabase();
  seedActors(db);
  const harness = createHarness(db);
  harness.service.installSchemaAndMigrate();

  db.prepare(`
    UPDATE users SET email = 'changed-primary@example.test', email_verified = 1,
      email_verified_value = 'reporter1@example.test', secondary_email = NULL,
      secondary_email_verified = 0, secondary_email_verified_value = NULL WHERE id = 1
  `).run();
  assert.deepEqual(harness.service.notificationAvailability(1, 1), { push: false, email: false });
  const invalidCreate = harness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'invalid-email-create-0001',
    input: {
      resourceId: 1,
      title: 'INVALID-EMAIL',
      description: 'INVALID-EMAIL-DESCRIPTION',
      notifyPush: false,
      notifyEmail: true
    }
  });
  assert.deepEqual(invalidCreate, { unavailable: 'email' });
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count, 0);

  db.prepare(`
    UPDATE users SET email = 'legacy-primary@example.test', email_verified = 1,
      email_verified_value = NULL WHERE id = 1
  `).run();
  assert.equal(harness.service.notificationAvailability(1, 1).email, false);

  db.prepare(`
    UPDATE users SET email = 'changed-primary@example.test', email_verified = 1,
      email_verified_value = 'reporter1@example.test',
      secondary_email = 'verified-secondary@example.test', secondary_email_verified = 1,
      secondary_email_verified_value = 'verified-secondary@example.test' WHERE id = 1
  `).run();
  assert.deepEqual(harness.service.notificationAvailability(1, 1), { push: false, email: true });
  const fallbackReport = harness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'secondary-email-fallback-0001',
    input: {
      resourceId: 1,
      title: 'SECONDARY-EMAIL',
      description: 'SECONDARY-EMAIL-DESCRIPTION',
      notifyPush: false,
      notifyEmail: true
    }
  });
  assert.equal(fallbackReport.unavailable, undefined);
  const fallbackNotifications = harness.service.queueReporterStatus(fallbackReport.caseId, 'in_progress');
  assert.equal(fallbackNotifications.length, 1);
  assert.equal((await harness.service.deliverReporterNotifications({}, fallbackNotifications)).sent, 1);
  assert.equal(harness.calls.email.length, 1);
  assert.equal(harness.calls.email[0].to, 'verified-secondary@example.test');

  const pendingRevalidation = harness.service.createReport({
    reporterUserId: 1,
    houseId: 1,
    submissionKey: 'secondary-email-send-revalidation-0001',
    input: {
      resourceId: 1,
      title: 'SECONDARY-REVALIDATION',
      description: 'SECONDARY-REVALIDATION-DESCRIPTION',
      notifyPush: false,
      notifyEmail: true
    }
  });
  const pendingNotifications = harness.service.queueReporterStatus(
    pendingRevalidation.caseId,
    'in_progress'
  );
  assert.equal(pendingNotifications.length, 1);
  db.prepare(`
    UPDATE users SET secondary_email = 'changed-secondary@example.test',
      secondary_email_verified = 1,
      secondary_email_verified_value = 'verified-secondary@example.test' WHERE id = 1
  `).run();
  assert.equal(harness.service.notificationAvailability(1, 1).email, false);
  const beforeRevalidationSend = harness.calls.email.length;
  const revalidated = await harness.service.deliverReporterNotifications({}, pendingNotifications);
  assert.equal(revalidated.unavailable, 1);
  assert.equal(harness.calls.email.length, beforeRevalidationSend);
  assert.deepEqual(harness.service.updateOwnPreferences({
    reportId: fallbackReport.id,
    reporterUserId: 1,
    push: false,
    email: true
  }), { unavailable: 'email' });
  db.prepare('UPDATE maintenance_report_preferences SET email_enabled = 1 WHERE report_id = ?')
    .run(fallbackReport.id);
  assert.deepEqual(harness.service.queueReporterStatus(fallbackReport.caseId, 'done'), []);

  db.prepare(`
    UPDATE users SET email = 'verified-primary@example.test', email_verified = 1,
      email_verified_value = 'verified-primary@example.test', secondary_email = NULL,
      secondary_email_verified = 0, secondary_email_verified_value = NULL, active = 1 WHERE id = 1
  `).run();
  assert.equal(harness.service.notificationAvailability(1, 1).email, true);
  assert.deepEqual(harness.service.updateOwnPreferences({
    reportId: fallbackReport.id,
    reporterUserId: 1,
    push: false,
    email: true
  }), { ok: true, push: false, email: true });

  db.prepare('UPDATE users SET active = 0 WHERE id = 1').run();
  assert.equal(harness.service.notificationAvailability(1, 1).email, false);
  assert.deepEqual(harness.service.updateOwnPreferences({
    reportId: fallbackReport.id,
    reporterUserId: 1,
    push: false,
    email: true
  }), { unavailable: 'email' });

  db.close();
}

async function verifyProductionMigrationBackupGate() {
  const emptyDb = createDatabase();
  seedActors(emptyDb);
  const emptyService = createHarness(emptyDb).service;
  assert.deepEqual(
    await emptyService.prepareLegacyMigration({ production: true }),
    { migrated: false, backupCreated: false }
  );
  emptyDb.close();

  const db = createDatabase();
  seedActors(db);
  db.prepare(`
    INSERT INTO maintenance_cases
      (id, house_id, resource_id, reported_by, title, description, status)
    VALUES (80, 1, 1, 1, 'BACKUP-GATE-PRIVATE', 'BACKUP-GATE-CONTACT', 'reported')
  `).run();
  const service = createHarness(db).service;
  service.installSchema();
  assert.equal(service.legacyMigrationRequired(), true);
  await assert.rejects(
    service.prepareLegacyMigration({ production: true }),
    (error) => error.code === 'MAINTENANCE_MIGRATION_BACKUP_REQUIRED'
  );
  assert.equal(db.prepare('SELECT title FROM maintenance_cases WHERE id = 80').get().title, 'BACKUP-GATE-PRIVATE');
  assert.equal(db.prepare('SELECT value FROM settings WHERE key = ?').get('maintenance_reports_v1_migrated'), undefined);

  let failedBackupCalls = 0;
  await assert.rejects(
    service.prepareLegacyMigration({
      production: true,
      createVerifiedBackup: async () => {
        failedBackupCalls += 1;
        throw new Error('synthetic backup failure');
      }
    }),
    /synthetic backup failure/
  );
  assert.equal(failedBackupCalls, 1);
  assert.equal(db.prepare('SELECT title FROM maintenance_cases WHERE id = 80').get().title, 'BACKUP-GATE-PRIVATE');

  let successfulBackupCalls = 0;
  const result = await service.prepareLegacyMigration({
    production: true,
    createVerifiedBackup: async () => {
      successfulBackupCalls += 1;
      assert.equal(db.prepare('SELECT title FROM maintenance_cases WHERE id = 80').get().title, 'BACKUP-GATE-PRIVATE');
    }
  });
  assert.deepEqual(result, { migrated: true, backupCreated: true });
  assert.equal(successfulBackupCalls, 1);
  assert.equal(db.prepare('SELECT title FROM maintenance_cases WHERE id = 80').get().title, 'Betriebsfall');
  assert.equal(db.prepare('SELECT value FROM settings WHERE key = ?').get('maintenance_reports_v1_migrated').value, '1');
  db.close();
}

function verifyLegacyMigration() {
  const db = createDatabase();
  seedActors(db);
  db.prepare(`
    INSERT INTO maintenance_cases
      (id, house_id, resource_id, reported_by, title, description, status, created_at, updated_at)
    VALUES (50, 1, 1, 1, 'LEGACY-PRIVATE-TITLE', 'LEGACY-PRIVATE-CONTACT', 'reported',
            '2025-12-01 10:00:00', '2025-12-01 10:00:00')
  `).run();
  db.prepare(`
    INSERT INTO maintenance_entries
      (id, case_id, entry_type, note, created_by, created_at)
    VALUES (60, 50, 'report', 'LEGACY-PRIVATE-DESCRIPTION', 1, '2025-12-01 10:00:00')
  `).run();
  db.prepare(`
    INSERT INTO audit_log (house_id, user_id, action, target_type, target_id, details)
    VALUES
      (1, 1, 'maintenance_case.report', 'maintenance_case', '50', '{"title":"LEGACY-PRIVATE-TITLE"}'),
      (1, 3, 'maintenance_case.block', 'maintenance_case', '50', '{"reason":"LEGACY-PRIVATE-DESCRIPTION","status":"blocked"}')
  `).run();

  const { service } = createHarness(db);
  service.installSchemaAndMigrate();
  const migrated = db.prepare('SELECT title, description, legacy_source FROM maintenance_reports').get();
  assert.deepEqual(migrated, {
    title: 'LEGACY-PRIVATE-TITLE',
    description: 'LEGACY-PRIVATE-DESCRIPTION',
    legacy_source: 'entry:60'
  });
  assert.deepEqual(
    db.prepare('SELECT reported_by, title, description FROM maintenance_cases WHERE id = 50').get(),
    { reported_by: null, title: 'Betriebsfall', description: '' }
  );
  assert.deepEqual(
    db.prepare('SELECT entry_type, note, created_by FROM maintenance_entries WHERE id = 60').get(),
    { entry_type: 'note', note: 'Meldung eingegangen.', created_by: null }
  );
  const audits = db.prepare('SELECT user_id, action, details FROM audit_log ORDER BY id').all();
  assert.ok(audits.every((audit) => audit.user_id === null));
  assert.ok(!JSON.stringify(audits).includes('LEGACY-PRIVATE'));
  assert.ok(JSON.parse(audits[1].details).actorRef.startsWith('actor-'));

  const before = {
    reports: db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count,
    preferences: db.prepare('SELECT COUNT(*) AS count FROM maintenance_report_preferences').get().count,
    entries: db.prepare('SELECT COUNT(*) AS count FROM maintenance_entries').get().count,
    audits: db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count
  };
  service.installSchemaAndMigrate();
  assert.deepEqual({
    reports: db.prepare('SELECT COUNT(*) AS count FROM maintenance_reports').get().count,
    preferences: db.prepare('SELECT COUNT(*) AS count FROM maintenance_report_preferences').get().count,
    entries: db.prepare('SELECT COUNT(*) AS count FROM maintenance_entries').get().count,
    audits: db.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count
  }, before);
  db.close();
}

async function run() {
  await verifyCurrentModel();
  await verifyDeliveryRevalidation();
  await verifyReporterDeliveryRevalidation();
  await verifyAtomicOutboxClaims();
  await verifyAdminMidBatchRevalidation();
  await verifyAtMostOneAttemptFailureModes();
  await verifyEmailAvailabilityContract();
  await verifyProductionMigrationBackupGate();
  verifyLegacyMigration();
  console.log(JSON.stringify({
    ok: true,
    checks: {
      idempotency: true,
      transactionRollback: true,
      providerOutcomeUnknownAfterCommit: true,
      preProviderRetryOnly: true,
      multiReporterPrivacy: true,
      exportIsolation: true,
      preferenceIsolation: true,
      houseAdminEndpointIsolation: true,
      deliveryRecipientRevalidation: true,
      reporterEndpointOwnerAndHashRevalidation: true,
      atomicAdminAndReporterOutboxClaims: true,
      adminMidBatchRecipientRevalidation: true,
      atMostOneExternalProviderAttempt: true,
      ambiguousDeliveryTerminalization: true,
      verifiedEmailAvailabilityAndFallback: true,
      completeResidentReportProjection: true,
      strictResidentExportAllowlist: true,
      staleReminderTerminalization: true,
      productionMigrationBackupGate: true,
      reminderWindows: true,
      accountAndReportDeletion: true,
      neutralAudit: true,
      legacyMigration: true
    }
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
