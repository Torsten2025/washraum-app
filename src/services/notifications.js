const {
  mailCopy,
  normalizeLanguage,
  translateReleaseSubject,
  translateReleaseText
} = require('./localization');
const { verifiedEmailForKind } = require('./email-verification');

function createNotificationService({
  db,
  crypto,
  smtpConfig,
  sendMail,
  isValidEmail,
  normalizeEmail,
  tokenHash,
  publicAppUrl,
  apartmentAccountLabel,
  weekdayForDate,
  notifyPushSubscribers,
  releaseNoticeUrl
}) {
  async function sendEmailVerification(req, user, emailKind = 'primary') {
    const config = smtpConfig();
    const email = normalizeEmail(emailKind === 'secondary' ? user.secondary_email : user.email);
    if (!config.host || !config.from || !isValidEmail(email)) {
      return { configured: false, sent: false };
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ? AND email_kind = ?').run(user.id, emailKind);
    db.prepare(`
      INSERT INTO email_verification_tokens (user_id, token_hash, email_kind, email_value, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, tokenHash(token), emailKind, email, String(Date.now() + 24 * 60 * 60 * 1000));
    const link = `${publicAppUrl(req)}/api/email-verification/confirm?token=${encodeURIComponent(token)}`;
    const language = normalizeLanguage(user.language);
    const name = apartmentAccountLabel(user.id, user.username);
    await sendMail({
      config,
      to: email,
      subject: mailCopy(language, 'verifySubject'),
      text: mailCopy(language, 'verifyBody', { name, link })
    });
    return { configured: true, sent: true };
  }

  async function sendPasswordReset(req, user, deliveryEmail = user.email) {
    const config = smtpConfig();
    const email = normalizeEmail(deliveryEmail);
    const verified = email === verifiedEmailForKind(user, 'primary')
      || email === verifiedEmailForKind(user, 'secondary');
    if (!config.host || !config.from || !isValidEmail(email) || !verified) {
      return false;
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
    db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, tokenHash(token), String(Date.now() + 60 * 60 * 1000));
    const link = `${publicAppUrl(req)}/reset.html?token=${encodeURIComponent(token)}`;
    const language = normalizeLanguage(user.language);
    const name = apartmentAccountLabel(user.id, user.username);
    await sendMail({
      config,
      to: email,
      subject: mailCopy(language, 'resetSubject'),
      text: mailCopy(language, 'resetBody', { name, link })
    });
    return true;
  }

  async function notifyReleaseSubscribers(req, booking, message, subject = `Waschplan: ${booking.resource_name} fr\u00fcher frei`) {
    const config = smtpConfig();
    subject = String(subject).replace(/^Waschplan:/, 'WaschZeit:');
    if (!config.host || !config.from) {
      return { configured: false, sent: 0 };
    }

    const recipients = db.prepare(`
      SELECT u.id, u.username, u.active, u.email, u.secondary_email, u.language,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS display_name,
             u.email_verified, u.email_verified_value,
             u.secondary_email_verified, u.secondary_email_verified_value
      FROM users u
      LEFT JOIN apartments a ON a.id = u.apartment_id
      LEFT JOIN notification_preferences np ON np.user_id = u.id
      WHERE u.active = 1
        AND u.house_id = ?
        AND u.notify_releases = 1
        AND (u.email_verified = 1 OR u.secondary_email_verified = 1)
        AND u.id != ?
        AND (np.resource_type IS NULL OR np.resource_type = 'all' OR np.resource_type = ?)
        AND (np.weekday IS NULL OR np.weekday = ?)
        AND (np.slot IS NULL OR np.slot = ?)
      ORDER BY username
    `).all(
      booking.house_id,
      booking.user_id,
      booking.resource_type || 'all',
      weekdayForDate(booking.booking_date),
      booking.slot
    );

    if (!recipients.length) {
      return { configured: true, sent: 0 };
    }

    const deliveries = recipients.flatMap((recipient) => {
      const emails = [
        verifiedEmailForKind(recipient, 'primary'),
        verifiedEmailForKind(recipient, 'secondary')
      ].filter((email, index, all) => email && all.indexOf(email) === index);
      return emails.map((email) => ({ ...recipient, deliveryEmail: email }));
    });
    const currentRecipient = db.prepare(`
      SELECT u.id, u.username, u.active, u.email, u.secondary_email, u.language,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS display_name,
             u.email_verified, u.email_verified_value,
             u.secondary_email_verified, u.secondary_email_verified_value
      FROM users u
      LEFT JOIN apartments a ON a.id = u.apartment_id
      LEFT JOIN notification_preferences np ON np.user_id = u.id
      WHERE u.id = ?
        AND u.active = 1
        AND u.house_id = ?
        AND u.notify_releases = 1
        AND u.id != ?
        AND (np.resource_type IS NULL OR np.resource_type = 'all' OR np.resource_type = ?)
        AND (np.weekday IS NULL OR np.weekday = ?)
        AND (np.slot IS NULL OR np.slot = ?)
    `);
    const resourceType = booking.resource_type || 'all';
    const bookingWeekday = weekdayForDate(booking.booking_date);
    const appUrl = `${publicAppUrl(req)}${releaseNoticeUrl(booking)}`;
    let sent = 0;
    for (let start = 0; start < deliveries.length; start += 5) {
      const batch = deliveries.slice(start, start + 5);
      const results = await Promise.allSettled(batch.map(async (recipient) => {
        const current = currentRecipient.get(
          recipient.id,
          booking.house_id,
          booking.user_id,
          resourceType,
          bookingWeekday,
          booking.slot
        );
        if (!current) return { attempted: false };
        const currentEmails = [
          verifiedEmailForKind(current, 'primary'),
          verifiedEmailForKind(current, 'secondary')
        ].filter((email, index, all) => email && all.indexOf(email) === index);
        if (!currentEmails.includes(recipient.deliveryEmail)) return { attempted: false };
        await sendMail({
          config,
          to: recipient.deliveryEmail,
          subject: translateReleaseSubject(subject, current.language),
          text: mailCopy(current.language, 'releaseBody', {
            name: current.display_name,
            message: translateReleaseText(message, current.language),
            url: appUrl,
            house: booking.house_name || ''
          })
        });
        return { attempted: true };
      }));
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.attempted) {
          sent += 1;
        } else if (result.status === 'rejected') {
          console.error('Freigabe-E-Mail konnte nicht gesendet werden.');
        }
      });
    }

    return { configured: true, sent };
  }

  async function notifyReleaseChannels(req, booking, message, subject = `WaschZeit: ${booking.resource_name} frei`) {
    const [emailNotifications, pushNotifications] = await Promise.all([
      notifyReleaseSubscribers(req, booking, message, subject),
      notifyPushSubscribers(req, booking, message, subject.replace(/^Waschplan:/, 'WaschZeit:'))
    ]);
    return { emailNotifications, pushNotifications };
  }

  return { sendEmailVerification, sendPasswordReset, notifyReleaseSubscribers, notifyReleaseChannels };
}

module.exports = { createNotificationService };
