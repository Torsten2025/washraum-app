const express = require('express');
const { mailCopy, normalizeLanguage } = require('../services/localization');

function createNotificationRouters({
  db,
  env,
  requireAuth,
  requireAdmin,
  currentHouseId,
  slots,
  normalizeEmail,
  isValidEmail,
  findEmailOwner,
  emailStatus,
  sendEmailVerification,
  pushStatus,
  smtpConfig,
  sendMail,
  apartmentAccountLabel,
  applyPushConfig,
  pushPayload,
  subscriptionForRow,
  sendPushNotification,
  writeAudit,
  releaseWindowStatus
}) {
  const pushRouter = express.Router();
  const preferencesRouter = express.Router();
  const noticesRouter = express.Router();
  const adminRouter = express.Router();

  pushRouter.get('/api/push/public-key', requireAuth, (req, res) => {
    const status = pushStatus();
    res.json({
      configured: status.configured,
      publicKey: status.publicKey,
      activeSubscriptions: status.activeSubscriptions,
      label: status.label
    });
  });

  pushRouter.post('/api/push/subscriptions', requireAuth, (req, res) => {
    const subscription = req.body?.subscription || req.body;
    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const auth = String(subscription?.keys?.auth || '').trim();
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Push-Abo ist unvollstaendig.' });
    }

    db.prepare(`
      INSERT INTO push_subscriptions (user_id, house_id, endpoint, p256dh, auth, user_agent, active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        house_id = excluded.house_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        active = 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      req.session.user.id,
      req.session.user.houseId,
      endpoint,
      p256dh,
      auth,
      String(req.get('user-agent') || '').slice(0, 300)
    );
    res.status(201).json({ ok: true, message: 'Push-Hinweise sind auf diesem Geraet aktiv.' });
  });

  pushRouter.delete('/api/push/subscriptions', requireAuth, (req, res) => {
    const endpoint = String(req.body?.endpoint || '').trim();
    if (endpoint) {
      db.prepare(`
        UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE endpoint = ? AND user_id = ?
      `).run(endpoint, req.session.user.id);
    } else {
      db.prepare(`
        UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(req.session.user.id);
    }
    res.json({ ok: true, message: 'Push-Hinweise wurden fuer dieses Konto deaktiviert.' });
  });

  preferencesRouter.put('/api/me/notifications', requireAuth, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const secondaryEmail = normalizeEmail(req.body?.secondaryEmail);
    const notifyReleases = req.body?.notifyReleases === false ? 0 : 1;
    const resourceType = String(req.body?.resourceType || 'all');
    const weekday = req.body?.weekday === '' || req.body?.weekday == null ? null : Number(req.body.weekday);
    const preferredSlot = String(req.body?.slot || '') || null;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
    }
    if (secondaryEmail && !isValidEmail(secondaryEmail)) {
      return res.status(400).json({ error: 'Bitte eine g\u00fcltige zweite E-Mail-Adresse eintragen.' });
    }
    if (secondaryEmail && secondaryEmail === email) {
      return res.status(400).json({ error: 'Die zweite E-Mail-Adresse muss sich von der ersten unterscheiden.' });
    }
    if (findEmailOwner(email, req.session.user.id) || (secondaryEmail && findEmailOwner(secondaryEmail, req.session.user.id))) {
      return res.status(409).json({ error: 'Eine dieser E-Mail-Adressen ist bereits einem anderen Konto zugeordnet.' });
    }
    if (!['all', 'washer', 'drying_room', 'tumbler'].includes(resourceType)) {
      return res.status(400).json({ error: 'Ung\u00fcltiger Bereich f\u00fcr Benachrichtigungen.' });
    }
    if (weekday !== null && (!Number.isInteger(weekday) || weekday < 1 || weekday > 6)) {
      return res.status(400).json({ error: 'Ung\u00fcltiger Wochentag f\u00fcr Benachrichtigungen.' });
    }
    if (preferredSlot !== null && !slots.includes(preferredSlot)) {
      return res.status(400).json({ error: 'Ung\u00fcltiges Zeitfenster f\u00fcr Benachrichtigungen.' });
    }

    try {
      const previous = db.prepare(`
        SELECT email, email_verified, secondary_email, secondary_email_verified
        FROM users WHERE id = ?
      `).get(req.session.user.id);
      const emailChanged = normalizeEmail(previous?.email) !== email;
      const secondaryEmailChanged = normalizeEmail(previous?.secondary_email) !== secondaryEmail;
      const emailVerified = emailChanged ? 0 : previous?.email_verified ?? 0;
      const secondaryEmailVerified = secondaryEmailChanged ? 0 : previous?.secondary_email_verified ?? 0;
      db.transaction(() => {
        db.prepare(`
          UPDATE users
          SET email = ?, secondary_email = NULLIF(?, ''), notify_releases = ?,
              email_verified = ?, secondary_email_verified = ?
          WHERE id = ?
        `).run(
          email,
          secondaryEmail,
          notifyReleases,
          emailVerified,
          secondaryEmailVerified,
          req.session.user.id
        );
        db.prepare(`
          INSERT INTO notification_preferences (user_id, resource_type, weekday, slot)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            resource_type = excluded.resource_type,
            weekday = excluded.weekday,
            slot = excluded.slot
        `).run(req.session.user.id, resourceType, weekday, preferredSlot);
      })();
      if (emailChanged && emailStatus().configured) {
        await sendEmailVerification(req, {
          id: req.session.user.id,
          username: req.session.user.username,
          email
        }).catch((error) => console.error(`Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`));
      }
      if (secondaryEmailChanged && secondaryEmail && emailStatus().configured) {
        await sendEmailVerification(req, {
          id: req.session.user.id,
          username: req.session.user.username,
          secondary_email: secondaryEmail
        }, 'secondary').catch((error) => console.error(`Zweite Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`));
      }
      req.session.user.emailVerified = Boolean(emailVerified);
      req.session.user.secondaryEmailVerified = Boolean(secondaryEmailVerified);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
      }
      throw error;
    }

    req.session.user.email = email;
    req.session.user.secondaryEmail = secondaryEmail;
    req.session.user.notifyReleases = Boolean(notifyReleases);
    res.json({
      user: req.session.user,
      notificationPreferences: { resourceType, weekday, slot: preferredSlot },
      message: req.session.user.emailVerified
        ? 'Benachrichtigungen gespeichert.'
        : emailStatus().configured
          ? 'Benachrichtigungen gespeichert. Bitte best\u00e4tige die neue E-Mail-Adresse.'
          : 'Benachrichtigungen gespeichert. E-Mail-Hinweise werden nach Einrichtung des Versands freigeschaltet.'
    });
  });

  function decorateReleaseNotice(notice) {
    const windowStatus = releaseWindowStatus(notice.booking_date, notice.slot);
    const current = notice.kind === 'cancellation'
      ? ['not_started', 'eligible'].includes(windowStatus.reason)
      : windowStatus.eligible;
    const bookable = Boolean(
      current
      && notice.resource_id
      && notice.resource_active === 1
      && notice.is_booked === 0
    );
    return {
      id: notice.id,
      resource_id: notice.resource_id,
      resource_name: notice.resource_name,
      booking_date: notice.booking_date,
      slot: notice.slot,
      kind: notice.kind,
      message: notice.message,
      created_at: notice.created_at,
      created_by_name: notice.created_by_name,
      bookable,
      expired: !current,
      alreadyBooked: notice.is_booked === 1,
      resourceActive: notice.resource_active === 1
    };
  }

  function releaseNoticeSelect(whereSql) {
    return `
      SELECT rn.id,
             COALESCE(rn.resource_id, r.id) AS resource_id,
             rn.resource_name,
             rn.booking_date,
             rn.slot,
             rn.kind,
             rn.message,
             rn.created_at,
             rn.created_by,
             r.type AS resource_type,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS created_by_name,
             r.active AS resource_active,
             CASE WHEN EXISTS (
               SELECT 1 FROM bookings b
               WHERE b.resource_id = COALESCE(rn.resource_id, r.id)
                 AND b.booking_date = rn.booking_date
                 AND b.slot = rn.slot
             ) THEN 1 ELSE 0 END AS is_booked
      FROM release_notices rn
      LEFT JOIN users u ON u.id = rn.created_by
      LEFT JOIN apartments a ON a.id = u.apartment_id
      LEFT JOIN resources r ON r.id = rn.resource_id
        OR (rn.resource_id IS NULL AND r.house_id = rn.house_id AND r.name = rn.resource_name)
      ${whereSql}
    `;
  }

  noticesRouter.get('/api/release-notices', requireAuth, (req, res) => {
    const preferences = db.prepare(`
      SELECT u.notify_releases, COALESCE(np.resource_type, 'all') AS resource_type,
             np.weekday, np.slot
      FROM users u
      LEFT JOIN notification_preferences np ON np.user_id = u.id
      WHERE u.id = ?
    `).get(req.session.user.id);
    if (!req.session.user.notifyReleases || !preferences?.notify_releases) {
      return res.json({ notices: [] });
    }

    const notices = db.prepare(`${releaseNoticeSelect(`
      WHERE rn.house_id = ?
        AND rn.created_at >= datetime('now', '-7 days', 'localtime')
        AND (rn.created_by IS NULL OR rn.created_by != ?)
        AND (? = 'all' OR r.type = ?)
        AND (? IS NULL OR CAST(strftime('%w', rn.booking_date) AS INTEGER) = ?)
        AND (? IS NULL OR rn.slot = ?)
    `)}
      ORDER BY rn.created_at DESC
      LIMIT 10
    `).all(
      currentHouseId(req),
      req.session.user.id,
      preferences.resource_type,
      preferences.resource_type,
      preferences.weekday,
      preferences.weekday,
      preferences.slot,
      preferences.slot
    ).map(decorateReleaseNotice).filter((notice) => notice.bookable);

    res.json({ notices });
  });

  noticesRouter.get('/api/release-notices/:id', requireAuth, (req, res) => {
    const notice = db.prepare(releaseNoticeSelect(`
      WHERE rn.id = ?
        AND rn.house_id = ?
        AND rn.created_at >= datetime('now', '-30 days', 'localtime')
    `)).get(Number(req.params.id), currentHouseId(req));
    if (!notice) {
      return res.status(404).json({ error: 'Freigabe nicht gefunden.' });
    }
    res.json({ notice: decorateReleaseNotice(notice) });
  });

  adminRouter.post('/api/admin/email-test', requireAdmin, async (req, res, next) => {
    const config = smtpConfig();
    const user = db.prepare('SELECT id, username, email, language FROM users WHERE id = ?').get(req.session.user.id);
    const house = db.prepare('SELECT name FROM houses WHERE id = ?').get(currentHouseId(req));
    const configuredTestEmail = normalizeEmail(env.SMTP_TEST_TO);
    const recipient = isValidEmail(configuredTestEmail) ? configuredTestEmail : user?.email;

    if (!config.host || !config.from) {
      return res.status(409).json({ error: 'Der E-Mail-Versand ist noch nicht in Render konfiguriert.' });
    }
    if (!user || !isValidEmail(recipient)) {
      return res.status(400).json({
        error: 'Bitte SMTP_TEST_TO in Render setzen oder unter Benachrichtigungen eine gueltige E-Mail-Adresse speichern.'
      });
    }

    try {
      const language = normalizeLanguage(user.language);
      await sendMail({
        config,
        to: recipient,
        subject: mailCopy(language, 'testSubject'),
        text: mailCopy(language, 'testBody', {
          name: apartmentAccountLabel(user.id, user.username),
          house: house?.name || ''
        })
      });
      res.json({ ok: true, message: `Testmail wurde an ${recipient} gesendet.` });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.post('/api/admin/push-test', requireAdmin, async (req, res) => {
    const status = applyPushConfig(req);
    if (!status.configured) {
      return res.status(409).json({ error: 'Push ist noch nicht bereit.' });
    }
    const targetUserId = req.body?.userId === 'all' || req.body?.userId == null
      ? null
      : Number(req.body.userId);
    if (targetUserId !== null && !Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: 'Ungueltiger Push-Empfaenger.' });
    }
    if (targetUserId !== null) {
      const targetUser = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND house_id = ? AND active = 1
      `).get(targetUserId, currentHouseId(req));
      if (!targetUser) {
        return res.status(404).json({ error: 'Push-Empfaenger nicht gefunden.' });
      }
    }

    const subscriptions = db.prepare(`
      SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, u.language,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE ps.house_id = ?
        AND ps.active = 1
        AND u.active = 1
        AND (? IS NULL OR ps.user_id = ?)
      ORDER BY username, ps.updated_at DESC
    `).all(currentHouseId(req), targetUserId, targetUserId);
    if (!subscriptions.length) {
      return res.status(409).json({ error: 'Fuer diese Auswahl ist noch kein Push-Geraet aktiviert.' });
    }

    let sent = 0;
    let failed = 0;
    const deactivate = db.prepare('UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const subscription of subscriptions) {
      try {
        const english = normalizeLanguage(subscription.language) === 'en';
        const payload = pushPayload({
          title: english ? 'WaschZeit: Push test' : 'WaschZeit: Push-Test',
          body: english
            ? 'Push notifications are working for this building.'
            : 'Push-Benachrichtigungen funktionieren fuer dieses Haus.',
          url: '/index.html',
          tag: 'waschzeit-test'
        });
        await sendPushNotification(subscriptionForRow(subscription), payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        const invalidSubscription = /public key|p256dh|auth secret|specified curve/i.test(String(error.message || ''));
        if ([404, 410].includes(error.statusCode) || invalidSubscription) {
          deactivate.run(subscription.id);
        } else {
          console.error(`Push-Test fehlgeschlagen: ${error.message}`);
        }
      }
    }

    writeAudit(req, 'push.test', 'push_subscription', '', { sent, failed, targetUserId: targetUserId || 'all' });
    const targetLabel = targetUserId
      ? `an ${subscriptions[0]?.username || 'ausgewaehlte Person'}`
      : 'an alle aktiven Push-Geraete im Haus';
    res.json({ ok: true, message: `Push-Test ${targetLabel} gesendet: ${sent}. Fehler: ${failed}.`, sent, failed });
  });

  adminRouter.get('/api/admin/push-devices', requireAdmin, (req, res) => {
    const users = db.prepare(`
      SELECT u.id, COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS username,
             COUNT(ps.id) AS devices
      FROM users u
      JOIN push_subscriptions ps ON ps.user_id = u.id
      LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE u.house_id = ?
        AND u.active = 1
        AND ps.active = 1
      GROUP BY u.id
      ORDER BY username
    `).all(currentHouseId(req));
    const totalDevices = users.reduce((sum, user) => sum + Number(user.devices || 0), 0);
    res.json({ users, totalDevices });
  });

  return { pushRouter, preferencesRouter, noticesRouter, adminRouter };
}

module.exports = { createNotificationRouters };
