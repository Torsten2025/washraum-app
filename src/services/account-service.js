'use strict';

function createAccountService({
  db,
  crypto,
  allowTestInvitationLink,
  normalizeEmail,
  normalizeAccessCode,
  tokenHash,
  smtpConfig,
  sendMail,
  publicAppUrl
}) {
  function findEmailOwner(email, exceptUserId = 0) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    return db.prepare(`
      SELECT id FROM users
      WHERE id != ? AND (lower(email) = ? OR lower(secondary_email) = ?)
      LIMIT 1
    `).get(Number(exceptUserId || 0), normalized, normalized);
  }

  function apartmentForCode(code) {
    const normalized = normalizeAccessCode(code);
    if (!normalized) return null;
    return db.prepare(`
      SELECT a.id, a.house_id, a.label, a.display_name, a.claimed_by, h.name AS house_name
      FROM apartments a
      JOIN houses h ON h.id = a.house_id
      WHERE a.activation_code_hash = ? AND a.active = 1 AND h.active = 1
    `).get(tokenHash(normalized));
  }

  function apartmentInvitationForToken(token) {
    const normalized = String(token || '').trim();
    if (!/^[a-f0-9]{64}$/i.test(normalized)) return null;
    return db.prepare(`
      SELECT ai.id AS invitation_id, ai.apartment_id, ai.email, ai.expires_at, ai.email_sent_at,
             a.house_id, a.label, a.display_name, a.claimed_by,
             h.name AS house_name
      FROM apartment_invitations ai
      JOIN apartments a ON a.id = ai.apartment_id
      JOIN houses h ON h.id = a.house_id
      WHERE ai.token_hash = ?
        AND ai.accepted_at IS NULL
        AND ai.revoked_at IS NULL
        AND CAST(ai.expires_at AS INTEGER) > ?
        AND (ai.email_sent_at IS NOT NULL OR ? = 1)
        AND a.active = 1
        AND h.active = 1
    `).get(tokenHash(normalized), Date.now(), allowTestInvitationLink ? 1 : 0);
  }

  function pendingInvitationForEmail(email, exceptApartmentId = 0) {
    return db.prepare(`
      SELECT ai.id, ai.apartment_id
      FROM apartment_invitations ai
      JOIN apartments a ON a.id = ai.apartment_id
      WHERE lower(ai.email) = lower(?)
        AND ai.apartment_id != ?
        AND ai.accepted_at IS NULL
        AND ai.revoked_at IS NULL
        AND CAST(ai.expires_at AS INTEGER) > ?
        AND (ai.email_sent_at IS NOT NULL OR ? = 1)
        AND a.active = 1
      LIMIT 1
    `).get(email, Number(exceptApartmentId || 0), Date.now(), allowTestInvitationLink ? 1 : 0);
  }

  async function issueApartmentInvitation(req, apartment, email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const config = smtpConfig();
    const emailConfigured = Boolean(config.host && config.from);
    if (!emailConfigured && !allowTestInvitationLink) {
      const error = new Error('INVITATION_EMAIL_NOT_CONFIGURED');
      error.code = 'INVITATION_EMAIL_NOT_CONFIGURED';
      throw error;
    }

    const hashedToken = tokenHash(token);
    db.prepare(`
      INSERT INTO apartment_invitations
        (apartment_id, email, token_hash, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(apartment.id, email, hashedToken, String(expiresAt), req.session.user.id);

    const link = `${publicAppUrl(req)}/login.html?invite=${encodeURIComponent(token)}`;
    if (emailConfigured) {
      try {
        await sendMail({
          config,
          to: email,
          subject: `WaschZeit: Einladung fuer ${apartment.label}`,
          text: [
            `Hallo ${apartment.display_name}`,
            '',
            `du wurdest fuer die Wohnung ${apartment.label} in ${apartment.house_name} zu WaschZeit eingeladen.`,
            'Oeffne den folgenden Link. Mit einer neuen E-Mail legst du dein persoenliches Passwort fest; mit einem bestehenden WaschZeit-Zugang bestaetigst du dein vorhandenes Passwort:',
            '',
            link,
            '',
            'Der Link ist sieben Tage gueltig und kann nur einmal verwendet werden.',
            'Jede Person behaelt einen eigenen Zugang. Wohnungsbuchungen werden trotzdem gemeinsam gezaehlt.'
          ].join('\n')
        });
      } catch (error) {
        db.prepare('DELETE FROM apartment_invitations WHERE token_hash = ?').run(hashedToken);
        console.error(`Wohnungseinladung konnte nicht gesendet werden: ${error.message}`);
        const deliveryError = new Error('INVITATION_EMAIL_FAILED');
        deliveryError.code = 'INVITATION_EMAIL_FAILED';
        throw deliveryError;
      }
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE apartment_invitations
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE apartment_id = ? AND lower(email) = lower(?) AND token_hash != ?
          AND accepted_at IS NULL AND revoked_at IS NULL
      `).run(apartment.id, email, hashedToken);
      if (emailConfigured) {
        db.prepare(`
          UPDATE apartment_invitations SET email_sent_at = CURRENT_TIMESTAMP
          WHERE token_hash = ?
        `).run(hashedToken);
      }
      db.prepare('UPDATE apartments SET activation_code_hash = NULL WHERE id = ?').run(apartment.id);
    })();
    return { link, expiresAt, emailSent: emailConfigured };
  }

  function apartmentAccountLabel(userId, fallback = 'Jemand') {
    const row = db.prepare(`
      SELECT COALESCE(NULLIF(a.display_name, ''), a.label, u.username) AS label
      FROM users u LEFT JOIN apartments a ON a.id = u.apartment_id
      WHERE u.id = ?
    `).get(userId);
    return row?.label || fallback;
  }

  function apartmentAccountUsername(apartmentId) {
    const base = `wohnung-${Number(apartmentId)}`;
    if (!db.prepare('SELECT id FROM users WHERE username = ?').get(base)) return base;
    return `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }

  function personalAccountUsername(email) {
    const localPart = normalizeEmail(email).split('@')[0]
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'person';
    const base = localPart.slice(0, 48);
    if (!db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(base)) return base;
    return `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }

  function regenerateSession(req) {
    return new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  function destroyUserSessions(userId, exceptSessionId = '') {
    const sessions = db.prepare('SELECT sid, sess FROM sessions').all();
    const remove = db.prepare('DELETE FROM sessions WHERE sid = ?');

    for (const row of sessions) {
      if (row.sid === exceptSessionId) {
        continue;
      }
      try {
        if (Number(JSON.parse(row.sess)?.user?.id) === Number(userId)) {
          remove.run(row.sid);
        }
      } catch {
        remove.run(row.sid);
      }
    }
  }

  return {
    findEmailOwner,
    apartmentForCode,
    apartmentInvitationForToken,
    pendingInvitationForEmail,
    issueApartmentInvitation,
    apartmentAccountLabel,
    apartmentAccountUsername,
    personalAccountUsername,
    regenerateSession,
    destroyUserSessions
  };
}

module.exports = { createAccountService };
