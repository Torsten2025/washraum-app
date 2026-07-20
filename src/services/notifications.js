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
    const email = emailKind === 'secondary' ? user.secondary_email : user.email;
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
    await sendMail({
      config,
      to: email,
      subject: 'WaschZeit: E-Mail-Adresse best\u00e4tigen',
      text: [
        `Hallo ${apartmentAccountLabel(user.id, user.username)}`,
        '',
        'Bitte best\u00e4tige deine E-Mail-Adresse. Erst danach werden Freigabe-Hinweise an diese Adresse gesendet.',
        '',
        link,
        '',
        'Der Link ist 24 Stunden g\u00fcltig.'
      ].join('\n')
    });
    return { configured: true, sent: true };
  }

  async function sendPasswordReset(req, user, deliveryEmail = user.email) {
    const config = smtpConfig();
    const email = normalizeEmail(deliveryEmail);
    const verified = email === normalizeEmail(user.email)
      ? Boolean(user.email_verified)
      : email === normalizeEmail(user.secondary_email) && Boolean(user.secondary_email_verified);
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
    await sendMail({
      config,
      to: email,
      subject: 'WaschZeit: Passwort neu setzen',
      text: [
        `Hallo ${apartmentAccountLabel(user.id, user.username)}`,
        '',
        'Mit diesem Link kannst du ein neues Passwort setzen:',
        '',
        link,
        '',
        'Der Link ist eine Stunde g\u00fcltig. Falls du nichts angefordert hast, kannst du diese Mail ignorieren.'
      ].join('\n')
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
      SELECT u.id, u.username, u.email, u.secondary_email,
             COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS display_name,
             u.email_verified, u.secondary_email_verified
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
      const emails = [];
      if (recipient.email_verified && isValidEmail(recipient.email)) emails.push(recipient.email);
      if (
        recipient.secondary_email_verified
        && isValidEmail(recipient.secondary_email)
        && normalizeEmail(recipient.secondary_email) !== normalizeEmail(recipient.email)
      ) emails.push(recipient.secondary_email);
      return emails.map((email) => ({ ...recipient, deliveryEmail: email }));
    });
    const appUrl = `${publicAppUrl(req)}${releaseNoticeUrl(booking)}`;
    let sent = 0;
    for (let start = 0; start < deliveries.length; start += 5) {
      const batch = deliveries.slice(start, start + 5);
      const results = await Promise.allSettled(batch.map((recipient) => sendMail({
          config,
          to: recipient.deliveryEmail,
          subject,
          text: [
            `Hallo ${recipient.display_name}`,
            '',
            message,
            '',
            `Du kannst den Slot jetzt im Waschplan ansehen und buchen: ${appUrl}`,
            '',
            'Viele Gr\u00fcsse',
            `WaschZeit ${booking.house_name || ''}`.trim()
          ].join('\n')
        })));
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          sent += 1;
        } else {
          console.error(`E-Mail an ${batch[index].email} konnte nicht gesendet werden: ${result.reason.message}`);
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
