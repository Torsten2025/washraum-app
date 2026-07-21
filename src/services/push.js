const { translateReleaseSubject, translateReleaseText } = require('./localization');

function createPushService({
  db,
  webPush,
  env,
  getSetting,
  setSetting,
  smtpConfig,
  extractEmailAddress,
  publicAppUrl,
  weekdayForDate
}) {
  const sendPushNotification = (subscription, payload) => webPush.sendNotification(subscription, payload);

  function configuredVapidKeys() {
    const envPublicKey = String(env.VAPID_PUBLIC_KEY || '').trim();
    const envPrivateKey = String(env.VAPID_PRIVATE_KEY || '').trim();
    if (envPublicKey && envPrivateKey) {
      return { publicKey: envPublicKey, privateKey: envPrivateKey, source: 'env' };
    }

    let publicKey = getSetting('vapid_public_key');
    let privateKey = getSetting('vapid_private_key');
    if (!publicKey || !privateKey) {
      const generated = webPush.generateVAPIDKeys();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
      setSetting('vapid_public_key', publicKey);
      setSetting('vapid_private_key', privateKey);
    }
    return { publicKey, privateKey, source: 'database' };
  }

  function pushStatus() {
    try {
      const keys = configuredVapidKeys();
      const activeSubscriptions = db.prepare('SELECT COUNT(*) AS count FROM push_subscriptions WHERE active = 1').get().count;
      return {
        configured: Boolean(keys.publicKey && keys.privateKey),
        label: 'bereit',
        publicKey: keys.publicKey,
        keySource: keys.source,
        activeSubscriptions
      };
    } catch (error) {
      return {
        configured: false,
        label: `nicht bereit: ${error.message}`,
        publicKey: '',
        keySource: '',
        activeSubscriptions: 0
      };
    }
  }

  function applyPushConfig(req) {
    const status = pushStatus();
    if (!status.configured) {
      return status;
    }
    const subject = String(env.VAPID_SUBJECT || '').trim()
      || `mailto:${extractEmailAddress(smtpConfig().from) || 'admin@example.invalid'}`
      || publicAppUrl(req);
    const keys = configuredVapidKeys();
    webPush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
    return status;
  }

  function pushPayload({ title, body, url = '/index.html', tag = 'waschzeit-freigabe' }) {
    return JSON.stringify({
      title,
      body,
      url,
      tag,
      icon: '/assets/app-icon.svg',
      badge: '/assets/app-icon.svg'
    });
  }

  function subscriptionForRow(row) {
    return {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth
      }
    };
  }

  function releaseNoticeUrl(booking) {
    const params = new URLSearchParams();
    if (booking.notice_id) {
      params.set('notice', String(booking.notice_id));
    }
    params.set('date', booking.booking_date);
    return `/index.html?${params.toString()}`;
  }

  async function notifyPushSubscribers(req, booking, message, title = `WaschZeit: ${booking.resource_name} frei`) {
    const status = applyPushConfig(req);
    if (!status.configured) {
      return { configured: false, sent: 0, failed: 0 };
    }

    const recipients = db.prepare(`
      SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, u.language
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      LEFT JOIN notification_preferences np ON np.user_id = u.id
      WHERE ps.active = 1
        AND u.active = 1
        AND u.house_id = ?
        AND ps.house_id = ?
        AND u.notify_releases = 1
        AND u.id != ?
        AND (np.resource_type IS NULL OR np.resource_type = 'all' OR np.resource_type = ?)
        AND (np.weekday IS NULL OR np.weekday = ?)
        AND (np.slot IS NULL OR np.slot = ?)
      ORDER BY ps.updated_at DESC
    `).all(
      booking.house_id,
      booking.house_id,
      booking.user_id,
      booking.resource_type || 'all',
      weekdayForDate(booking.booking_date),
      booking.slot
    );

    if (!recipients.length) {
      return { configured: true, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    const deactivate = db.prepare('UPDATE push_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const recipient of recipients) {
      try {
        const payload = pushPayload({
          title: translateReleaseSubject(title, recipient.language),
          body: translateReleaseText(message, recipient.language),
          url: releaseNoticeUrl(booking)
        });
        await sendPushNotification(subscriptionForRow(recipient), payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        const invalidSubscription = /public key|p256dh|auth secret|specified curve/i.test(String(error.message || ''));
        if ([404, 410].includes(error.statusCode) || invalidSubscription) {
          deactivate.run(recipient.id);
        } else {
          console.error(`Push-Hinweis fehlgeschlagen: ${error.message}`);
        }
      }
    }

    return { configured: true, sent, failed };
  }

  return {
    configuredVapidKeys,
    pushStatus,
    applyPushConfig,
    pushPayload,
    subscriptionForRow,
    releaseNoticeUrl,
    notifyPushSubscribers,
    sendPushNotification
  };
}

module.exports = { createPushService };
