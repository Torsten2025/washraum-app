'use strict';

function createAccountRouters({
  express,
  db,
  bcrypt,
  QRCode,
  allowLegacyHouseRegistration,
  sessionIdleTimeoutMs,
  sessionWarningMs,
  authRateLimit,
  registrationRateLimit,
  recoveryRateLimit,
  clearAuthRateLimit,
  normalizeEmail,
  isValidEmail,
  verifiedEmailForUser,
  normalizeAccessCode,
  generateReadableCode,
  isValidUsername,
  isValidPassword,
  isBcryptHash,
  verifyStoredPassword,
  findEmailOwner,
  apartmentForCode,
  apartmentInvitationForToken,
  apartmentAccountUsername,
  personalAccountUsername,
  regenerateSession,
  destroyUserSessions,
  requireAuth,
  requireApartmentAccount,
  currentHouseId,
  isSuperadmin,
  hasHouseRole,
  sessionUserFromRow,
  clearSessionCookie,
  tokenHash,
  sendEmailVerification,
  sendPasswordReset,
  writeAudit,
  writeAuditForHouse,
  pushStatus,
  isValidPlainText,
  publicAppUrl
}) {
  const primaryRouter = express.Router();
  const personalRouter = express.Router();

primaryRouter.post('/api/login', authRateLimit, async (req, res, next) => {
  const password = req.body?.password;
  const loginName = normalizeEmail(req.body?.email || req.body?.username);
  const user = db.prepare(`
    SELECT * FROM users
    WHERE lower(email) = ?
       OR lower(secondary_email) = ?
       OR (role = 'admin' AND lower(username) = ?)
       OR (role = 'user' AND (email IS NULL OR trim(email) = '') AND lower(username) = ?)
  `).get(loginName, loginName, loginName, loginName);

  if (!user || !verifyStoredPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Login fehlgeschlagen' });
  }
  if (!user.active) {
    return res.status(403).json({ error: 'Dieses Konto ist deaktiviert' });
  }

  if (!isBcryptHash(user.password_hash)) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(bcrypt.hashSync(String(password || ''), 10), user.id);
  }

  try {
    const sessionUser = sessionUserFromRow(user);
    clearAuthRateLimit(req);
    await regenerateSession(req);
    req.session.user = sessionUser;
    req.session.activeHouseId = user.house_id;
    req.session.lastActivityAt = Date.now();
    res.json({ user: req.session.user });
  } catch (error) {
    next(error);
  }
});

primaryRouter.post('/api/device-login', authRateLimit, async (req, res, next) => {
  const code = normalizeAccessCode(req.body?.deviceCode);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const passwordConfirmation = String(req.body?.passwordConfirmation || '');
  const record = code ? db.prepare(`
    SELECT dpc.id AS pairing_id, dpc.user_id AS created_by,
           COALESCE(dpc.apartment_id, u.apartment_id) AS pairing_apartment_id,
           a.house_id, a.label AS apartment_label, a.display_name AS apartment_display_name
    FROM device_pairing_codes dpc
    JOIN users u ON u.id = dpc.user_id
    JOIN apartments a ON a.id = COALESCE(dpc.apartment_id, u.apartment_id)
    WHERE dpc.code_hash = ?
      AND dpc.used_at IS NULL
      AND CAST(dpc.expires_at AS INTEGER) > ?
      AND u.active = 1
      AND a.active = 1
  `).get(tokenHash(code), Date.now()) : null;
  if (!record) {
    return res.status(400).json({ error: 'Der Ger\u00e4tecode ist ung\u00fcltig oder abgelaufen.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte deine persoenliche E-Mail-Adresse eintragen.' });
  }
  const existingOwner = findEmailOwner(email);
  const existingUser = existingOwner ? db.prepare('SELECT * FROM users WHERE id = ?').get(existingOwner.id) : null;
  if (existingUser && (!existingUser.active || !verifyStoredPassword(password, existingUser.password_hash))) {
    return res.status(401).json({ error: 'E-Mail-Adresse oder vorhandenes Passwort ist nicht korrekt.' });
  }
  if (!existingUser && (!isValidPassword(password) || password !== passwordConfirmation)) {
    return res.status(400).json({ error: 'Fuer einen neuen Zugang muessen beide Passwoerter uebereinstimmen und 12 bis 128 Zeichen haben.' });
  }
  if (existingUser?.apartment_id && Number(existingUser.apartment_id) !== Number(record.pairing_apartment_id)) {
    return res.status(409).json({ error: 'Dieser persoenliche Zugang ist bereits einer anderen Wohnung zugeordnet.' });
  }
  if (existingUser && Number(existingUser.house_id) !== Number(record.house_id)) {
    return res.status(409).json({ error: 'Dieser Zugang gehoert zu einem anderen Haus.' });
  }
  try {
    const userId = db.transaction(() => {
      let identityId = existingUser?.id;
      if (existingUser) {
        db.prepare('UPDATE users SET apartment_id = ? WHERE id = ?')
          .run(record.pairing_apartment_id, existingUser.id);
      } else {
        const inserted = db.prepare(`
          INSERT INTO users
            (username, email, password_hash, role, house_id, active, notify_releases,
             email_verified, apartment_id)
          VALUES (?, ?, ?, 'user', ?, 1, 1, 0, ?)
        `).run(
          personalAccountUsername(email),
          email,
          bcrypt.hashSync(password, 10),
          record.house_id,
          record.pairing_apartment_id
        );
        identityId = inserted.lastInsertRowid;
      }
      db.prepare(`
        UPDATE apartments
        SET claimed_by = COALESCE(claimed_by, ?), claimed_at = COALESCE(claimed_at, CURRENT_TIMESTAMP)
        WHERE id = ?
      `).run(identityId, record.pairing_apartment_id);
      db.prepare('UPDATE device_pairing_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL')
        .run(record.pairing_id);
      return identityId;
    })();
    const identity = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      await sendEmailVerification(req, identity).catch((error) => {
        console.error(`QR-Mitglied konnte keine Bestaetigungsmail erhalten: ${error.message}`);
      });
    }
    await regenerateSession(req);
    req.session.user = sessionUserFromRow(identity);
    req.session.activeHouseId = identity.house_id;
    req.session.lastActivityAt = Date.now();
    clearAuthRateLimit(req);
    writeAuditForHouse(req, record.house_id, 'apartment.qr_member_added', 'apartment', record.pairing_apartment_id, {
      userId,
      createdBy: record.created_by,
      existingIdentity: Boolean(existingUser)
    });
    res.json({
      user: req.session.user,
      message: `${req.session.user.apartmentLabel} wurde deinem persoenlichen Zugang hinzugefuegt. Adminrechte wurden nicht uebertragen.`
    });
  } catch (error) {
    next(error);
  }
});

primaryRouter.get('/api/invitations/:token', registrationRateLimit, (req, res) => {
  const invitation = apartmentInvitationForToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Diese Einladung ist ungueltig, abgelaufen oder bereits verwendet.' });
  }
  res.json({
    invitation: {
      email: invitation.email,
      apartmentLabel: invitation.label,
      displayName: invitation.display_name,
      houseName: invitation.house_name,
      expiresAt: new Date(Number(invitation.expires_at)).toISOString(),
      existingAccount: Boolean(findEmailOwner(invitation.email))
    }
  });
});

primaryRouter.post('/api/invitations/accept', registrationRateLimit, authRateLimit, async (req, res, next) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const invitation = apartmentInvitationForToken(token);
  if (!invitation) {
    return res.status(400).json({ error: 'Diese Einladung ist ungueltig, abgelaufen oder bereits verwendet.' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Das Passwort muss 12 bis 128 Zeichen haben.' });
  }
  const existingOwner = findEmailOwner(invitation.email);
  const existingUser = existingOwner
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(existingOwner.id)
    : null;
  if (existingUser && (!existingUser.active || !verifyStoredPassword(password, existingUser.password_hash))) {
    return res.status(401).json({ error: 'Das vorhandene Passwort fuer diese E-Mail-Adresse ist nicht korrekt.' });
  }
  if (existingUser?.apartment_id && Number(existingUser.apartment_id) !== Number(invitation.apartment_id)) {
    return res.status(409).json({ error: 'Dieser persoenliche Zugang gehoert bereits zu einer anderen Wohnung.' });
  }
  if (existingUser && Number(existingUser.house_id) !== Number(invitation.house_id)) {
    return res.status(409).json({ error: 'Dieser Zugang gehoert zu einem anderen Haus. Bitte die Verwaltung kontaktieren.' });
  }

  try {
    const userId = db.transaction(() => {
      const current = apartmentInvitationForToken(token);
      if (!current) {
        const conflict = new Error('INVITATION_ALREADY_USED');
        conflict.code = 'INVITATION_ALREADY_USED';
        throw conflict;
      }
      let identityId = existingUser?.id;
      if (existingUser) {
        const normalizedInvitationEmail = normalizeEmail(current.email);
        const verifiesPrimary = normalizeEmail(existingUser.email) === normalizedInvitationEmail;
        const verifiesSecondary = normalizeEmail(existingUser.secondary_email) === normalizedInvitationEmail;
        db.prepare(`
          UPDATE users
          SET apartment_id = ?, notify_releases = ?,
              email_verified = CASE WHEN ? THEN 1 ELSE email_verified END,
              secondary_email_verified = CASE WHEN ? THEN 1 ELSE secondary_email_verified END
          WHERE id = ?
        `).run(current.apartment_id, notifyReleases, verifiesPrimary ? 1 : 0, verifiesSecondary ? 1 : 0, identityId);
      } else {
        const inserted = db.prepare(`
          INSERT INTO users
            (username, email, password_hash, role, house_id, active, notify_releases,
             email_verified, apartment_id)
          VALUES (?, ?, ?, 'user', ?, 1, ?, ?, ?)
        `).run(
          personalAccountUsername(current.email),
          normalizeEmail(current.email),
          bcrypt.hashSync(password, 10),
          current.house_id,
          notifyReleases,
          current.email_sent_at ? 1 : 0,
          current.apartment_id
        );
        identityId = inserted.lastInsertRowid;
      }
      db.prepare(`
        UPDATE apartments
        SET claimed_by = COALESCE(claimed_by, ?),
            claimed_at = COALESCE(claimed_at, CURRENT_TIMESTAMP),
            activation_code_hash = NULL
        WHERE id = ?
      `).run(identityId, current.apartment_id);
      db.prepare(`
        UPDATE apartment_invitations SET accepted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL
      `).run(current.invitation_id);
      db.prepare(`
        UPDATE apartment_invitations SET revoked_at = CURRENT_TIMESTAMP
        WHERE apartment_id = ? AND lower(email) = lower(?) AND id != ?
          AND accepted_at IS NULL AND revoked_at IS NULL
      `).run(current.apartment_id, current.email, current.invitation_id);
      return identityId;
    })();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const house = db.prepare('SELECT id, name FROM houses WHERE id = ?').get(user.house_id);
    await regenerateSession(req);
    req.session.user = sessionUserFromRow(user, house);
    req.session.activeHouseId = user.house_id;
    req.session.lastActivityAt = Date.now();
    clearAuthRateLimit(req);
    writeAuditForHouse(req, user.house_id, 'apartment.invitation_accepted', 'apartment', user.apartment_id, {
      email: user.email
    });
    res.status(201).json({
      user: req.session.user,
      message: existingUser
        ? `${invitation.label} wurde deinem persoenlichen Zugang hinzugefuegt.`
        : invitation.email_sent_at
          ? `${invitation.label} ist aktiviert. Willkommen bei WaschZeit.`
          : `${invitation.label} ist aktiviert. Die E-Mail wird bestaetigt, sobald der Versand eingerichtet ist.`
    });
  } catch (error) {
    if (error.code === 'INVITATION_ALREADY_USED' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese Einladung wurde gerade bereits verwendet.' });
    }
    next(error);
  }
});

primaryRouter.post('/api/register', registrationRateLimit, authRateLimit, async (req, res, next) => {
  if (!allowLegacyHouseRegistration) {
    return res.status(410).json({ error: 'Neue Wohnungskonten werden nur noch ueber den Einladungslink der Verwaltung aktiviert.' });
  }
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const apartmentCode = String(req.body?.apartmentCode || '').trim();
  const legacyHouseCode = String(req.body?.houseCode || (allowLegacyHouseRegistration ? req.body?.apartmentCode : '') || '').trim();
  const notifyReleases = req.body?.notifyReleases !== false ? 1 : 0;
  const apartment = apartmentForCode(apartmentCode);
  const legacyHouse = allowLegacyHouseRegistration && legacyHouseCode
    ? db.prepare('SELECT id, name FROM houses WHERE lower(code) = lower(?) AND active = 1').get(legacyHouseCode)
    : null;
  const house = apartment
    ? { id: apartment.house_id, name: apartment.house_name }
    : legacyHouse;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine g\u00fcltige E-Mail-Adresse eintragen' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Das Passwort muss 12 bis 128 Zeichen haben.' });
  }
  if (!house || (!apartment && !legacyHouse)) {
    return res.status(403).json({ error: 'Der Wohnungscode ist nicht korrekt oder wurde bereits verwendet.' });
  }
  if (apartment?.claimed_by) {
    return res.status(409).json({ error: 'Diese Wohnung ist bereits aktiviert. Nutze den Ger\u00e4tecode eines angemeldeten Handys.' });
  }
  if (findEmailOwner(email)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
  }

  const legacyUsername = String(req.body?.username || '').trim();
  if (!apartment && !isValidUsername(legacyUsername)) {
    return res.status(400).json({ error: 'Fuer diese technische Registrierung fehlt ein gueltiger Kontoname.' });
  }
  const username = apartment ? apartmentAccountUsername(apartment.id) : legacyUsername;

  try {
    const emailVerified = 0;
    const result = db.transaction(() => {
      if (apartment) {
        const available = db.prepare(`
          SELECT id FROM apartments
          WHERE id = ? AND claimed_by IS NULL AND activation_code_hash = ? AND active = 1
        `).get(apartment.id, tokenHash(normalizeAccessCode(apartmentCode)));
        if (!available) {
          const conflict = new Error('APARTMENT_ALREADY_CLAIMED');
          conflict.code = 'APARTMENT_ALREADY_CLAIMED';
          throw conflict;
        }
      }
      const inserted = db.prepare(`
        INSERT INTO users
          (username, email, password_hash, role, house_id, active, notify_releases, email_verified, apartment_id)
        VALUES (?, ?, ?, 'user', ?, 1, ?, ?, ?)
      `).run(
        username,
        email,
        bcrypt.hashSync(password, 10),
        house.id,
        notifyReleases,
        emailVerified,
        apartment?.id || null
      );
      if (apartment) {
        db.prepare(`
          UPDATE apartments
          SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, activation_code_hash = NULL
          WHERE id = ?
        `).run(inserted.lastInsertRowid, apartment.id);
      }
      return inserted;
    })();

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    await regenerateSession(req);
    req.session.user = sessionUserFromRow(createdUser, house);
    req.session.activeHouseId = house.id;
    req.session.lastActivityAt = Date.now();
    clearAuthRateLimit(req);
    const verification = await sendEmailVerification(req, createdUser).catch((error) => {
      console.error(`Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`);
      return { configured: true, sent: false };
    });
    res.status(201).json({
      user: req.session.user,
      verification,
      message: verification.sent
        ? 'Konto erstellt. Bitte best\u00e4tige jetzt deine E-Mail-Adresse.'
        : verification.configured
          ? 'Konto erstellt. Die Best\u00e4tigungsmail konnte noch nicht gesendet werden.'
          : 'Konto erstellt. E-Mail-Hinweise werden nach Einrichtung des Versands freigeschaltet.'
    });
  } catch (error) {
    if (error.code === 'APARTMENT_ALREADY_CLAIMED') {
      return res.status(409).json({ error: 'Diese Wohnung wurde gerade bereits aktiviert.' });
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: apartment ? 'Diese E-Mail-Adresse ist bereits vergeben' : 'Kontoname oder E-Mail ist bereits vergeben'
      });
    }
    throw error;
  }
});

primaryRouter.get('/api/email-verification/confirm', (req, res) => {
  const token = String(req.query.token || '');
  const record = db.prepare(`
    SELECT evt.id, evt.user_id, evt.email_kind, evt.email_value,
           u.email, u.secondary_email
    FROM email_verification_tokens evt
    JOIN users u ON u.id = evt.user_id
    WHERE evt.token_hash = ? AND CAST(evt.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(token), Date.now());
  if (!record) {
    return res.redirect('/login.html?verification=invalid');
  }
  const currentEmail = record.email_kind === 'secondary' ? record.secondary_email : record.email;
  if (record.email_value && normalizeEmail(currentEmail) !== normalizeEmail(record.email_value)) {
    db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').run(record.id);
    return res.redirect('/login.html?verification=invalid');
  }
  db.transaction(() => {
    const column = record.email_kind === 'secondary' ? 'secondary_email_verified' : 'email_verified';
    db.prepare(`UPDATE users SET ${column} = 1 WHERE id = ?`).run(record.user_id);
    db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').run(record.id);
  })();
  if (Number(req.session.user?.id) === Number(record.user_id)) {
    if (record.email_kind === 'secondary') req.session.user.secondaryEmailVerified = true;
    else req.session.user.emailVerified = true;
  }
  res.redirect(req.session.user ? '/index.html?emailVerified=1' : '/login.html?verification=ok');
});

primaryRouter.post('/api/email-verification/resend', requireAuth, recoveryRateLimit, async (req, res) => {
  const emailKind = req.body?.emailKind === 'secondary' ? 'secondary' : 'primary';
  const user = db.prepare(`
    SELECT id, username, email, email_verified, secondary_email, secondary_email_verified
    FROM users WHERE id = ?
  `)
    .get(req.session.user.id);
  const alreadyVerified = emailKind === 'secondary' ? user?.secondary_email_verified : user?.email_verified;
  if (!user || alreadyVerified) {
    return res.json({ ok: true, message: 'Die E-Mail-Adresse ist bereits best\u00e4tigt.' });
  }
  try {
    const result = await sendEmailVerification(req, user, emailKind);
    if (!result.sent) {
      return res.status(409).json({ error: 'Der E-Mail-Versand ist noch nicht eingerichtet.' });
    }
    res.json({ ok: true, message: 'Best\u00e4tigungsmail wurde erneut gesendet.' });
  } catch (error) {
    console.error(`Best\u00e4tigungsmail konnte nicht gesendet werden: ${error.message}`);
    res.status(502).json({ error: 'Die Best\u00e4tigungsmail konnte gerade nicht gesendet werden.' });
  }
});

primaryRouter.post('/api/password-reset/request', recoveryRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const user = isValidEmail(email)
    ? db.prepare(`
        SELECT id, username, email, email_verified, secondary_email, secondary_email_verified
        FROM users
        WHERE (lower(email) = ? OR lower(secondary_email) = ?) AND active = 1
      `).get(email, email)
    : null;
  if (user) {
    await sendPasswordReset(req, user, email).catch((error) => {
      console.error(`Passwort-Mail konnte nicht gesendet werden: ${error.message}`);
    });
  }
  res.json({
    ok: true,
    message: 'Wenn ein aktives, best\u00e4tigtes Konto zu dieser Adresse geh\u00f6rt, wurde eine E-Mail gesendet.'
  });
});

primaryRouter.post('/api/password-reset/confirm', recoveryRateLimit, (req, res) => {
  const token = String(req.body?.token || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Das neue Passwort muss 12 bis 128 Zeichen haben.' });
  }
  const record = db.prepare(`
    SELECT prt.id, prt.user_id
    FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    WHERE prt.token_hash = ? AND CAST(prt.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(token), Date.now());
  if (!record) {
    return res.status(400).json({ error: 'Der Link ist ung\u00fcltig oder abgelaufen.' });
  }
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(bcrypt.hashSync(newPassword, 10), record.user_id);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(record.user_id);
  })();
  destroyUserSessions(record.user_id);
  res.json({ ok: true, message: 'Passwort ge\u00e4ndert. Du kannst dich jetzt anmelden.' });
});

primaryRouter.post('/api/account-recovery/confirm', recoveryRateLimit, async (req, res, next) => {
  const code = normalizeAccessCode(req.body?.code);
  const email = normalizeEmail(req.body?.email);
  const newPassword = String(req.body?.newPassword || '');
  if (!code || !isValidEmail(email) || !isValidPassword(newPassword)) {
    return res.status(400).json({
      error: 'Bitte einen gueltigen Wiederherstellungscode, eine E-Mail-Adresse und ein Passwort mit 12 bis 128 Zeichen eingeben.'
    });
  }

  const record = db.prepare(`
    SELECT arc.id AS recovery_id, arc.user_id, u.*
    FROM account_recovery_codes arc
    JOIN users u ON u.id = arc.user_id
    WHERE arc.code_hash = ? AND arc.used_at IS NULL
      AND CAST(arc.expires_at AS INTEGER) > ?
      AND u.active = 1 AND u.role = 'user' AND u.merged_into_user_id IS NULL
  `).get(tokenHash(code), Date.now());
  if (!record) {
    return res.status(400).json({ error: 'Der Wiederherstellungscode ist ungueltig, abgelaufen oder bereits verwendet.' });
  }
  if (verifiedEmailForUser(record)) {
    return res.status(409).json({ error: 'Dieses Konto besitzt inzwischen eine bestaetigte E-Mail-Adresse. Bitte den normalen Passwort-Reset verwenden.' });
  }
  if (findEmailOwner(email, record.user_id)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse gehoert bereits zu einem anderen Konto.' });
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET email = ?, email_verified = 0,
            secondary_email = NULL, secondary_email_verified = 0,
            password_hash = ?
        WHERE id = ?
      `).run(email, bcrypt.hashSync(newPassword, 10), record.user_id);
      db.prepare('UPDATE account_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(record.recovery_id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(record.user_id);
      db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(record.user_id);
    })();
    destroyUserSessions(record.user_id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(record.user_id);
    const verification = await sendEmailVerification(req, updatedUser).catch((error) => {
      console.error(`Bestaetigungsmail nach Kontowiederherstellung fehlgeschlagen: ${error.message}`);
      return { configured: true, sent: false };
    });
    writeAuditForHouse(req, record.house_id, 'user.recovery_completed', 'user', record.user_id, {
      verificationSent: Boolean(verification.sent)
    });
    res.json({
      ok: true,
      message: verification.sent
        ? 'Konto wiederhergestellt. Bitte bestaetige jetzt deine E-Mail-Adresse und melde dich danach an.'
        : 'Konto wiederhergestellt. Du kannst dich mit der neuen E-Mail-Adresse und dem neuen Passwort anmelden; die E-Mail-Bestaetigung muss noch versendet werden.'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben.' });
    }
    next(error);
  }
});

function finishLogout(req, res, next, redirectToLogin = false) {
  const sendResponse = () => {
    res.setHeader('Cache-Control', 'no-store');
    clearSessionCookie(res);
    if (redirectToLogin) {
      return res.redirect(303, '/login.html?loggedOut=1');
    }
    return res.json({ ok: true });
  };

  if (!req.session) {
    return sendResponse();
  }
  req.session.destroy((error) => {
    if (error) {
      // Das Cookie wird auch bei einem kurzzeitigen Store-Fehler entfernt.
      console.error(`Sitzung konnte beim Abmelden nicht aus dem Speicher entfernt werden: ${error.message}`);
    }
    return sendResponse();
  });
}

primaryRouter.post('/api/logout', (req, res, next) => finishLogout(req, res, next));
primaryRouter.post('/logout', (req, res, next) => finishLogout(req, res, next, true));

primaryRouter.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.json({
      user: null,
      houses: [],
      session: { idleTimeoutMs: sessionIdleTimeoutMs, warningMs: sessionWarningMs }
    });
  }
  const currentUserRow = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(req.session.user.id);
  if (!currentUserRow) {
    return req.session.destroy(() => res.status(401).json({ error: 'Dieses Konto ist nicht mehr aktiv.' }));
  }
  const activeHouse = db.prepare('SELECT id, name FROM houses WHERE id = ?').get(currentHouseId(req) || currentUserRow.house_id);
  req.session.user = sessionUserFromRow(currentUserRow, activeHouse);
  const houses = isSuperadmin(req)
    ? db.prepare('SELECT id, name, active FROM houses WHERE active = 1 ORDER BY name').all()
    : [];
  const preferences = db.prepare(`
    SELECT resource_type AS resourceType, weekday, slot
    FROM notification_preferences WHERE user_id = ?
  `).get(req.session.user.id) || { resourceType: 'all', weekday: null, slot: null };
  const activePushSubscriptions = db.prepare(`
    SELECT COUNT(*) AS count FROM push_subscriptions
    WHERE user_id = ? AND active = 1
  `).get(req.session.user.id).count;
  res.json({
    user: req.session.user,
    houses,
    notificationPreferences: preferences,
    push: {
      available: pushStatus().configured,
      activeSubscriptions: activePushSubscriptions
    },
    session: {
      idleTimeoutMs: sessionIdleTimeoutMs,
      warningMs: sessionWarningMs,
      lastActivityAt: req.session.lastActivityAt
    }
  });
});

primaryRouter.post('/api/me/apartment/claim', requireAuth, (req, res) => {
  if (!allowLegacyHouseRegistration) {
    return res.status(410).json({ error: 'Wohnungscodes wurden durch sichere Einladungslinks ersetzt.' });
  }
  if (req.session.user.role !== 'user') {
    return res.status(400).json({ error: 'Admin-Konten werden keiner Wohnung zugeordnet.' });
  }
  if (req.session.user.apartmentId) {
    return res.status(409).json({ error: 'Dieses Konto ist bereits einer Wohnung zugeordnet.' });
  }
  const apartment = apartmentForCode(req.body?.apartmentCode);
  if (!apartment || apartment.house_id !== req.session.user.houseId || apartment.claimed_by) {
    return res.status(403).json({ error: 'Der Wohnungscode ist nicht korrekt, passt nicht zum Haus oder wurde bereits verwendet.' });
  }
  const changed = db.transaction(() => {
    const result = db.prepare(`
      UPDATE apartments
      SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, activation_code_hash = NULL
      WHERE id = ? AND claimed_by IS NULL AND activation_code_hash = ?
    `).run(
      req.session.user.id,
      apartment.id,
      tokenHash(normalizeAccessCode(req.body?.apartmentCode))
    );
    if (result.changes) {
      db.prepare('UPDATE users SET apartment_id = ? WHERE id = ?').run(apartment.id, req.session.user.id);
    }
    return result;
  })();
  if (!changed.changes) {
    return res.status(409).json({ error: 'Diese Wohnung wurde gerade bereits aktiviert.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  req.session.user = sessionUserFromRow(user);
  writeAudit(req, 'apartment.claim', 'apartment', apartment.id, { label: apartment.label });
  res.json({ user: req.session.user, message: `${apartment.label} ist jetzt mit diesem Konto verbunden.` });
});

primaryRouter.post('/api/me/apartment-name-request', requireAuth, requireApartmentAccount, (req, res) => {
  if (!req.session.user.canBook || !req.session.user.apartmentId) {
    return res.status(400).json({ error: 'Nur ein aktives Wohnungskonto kann eine Namenskorrektur melden.' });
  }
  const proposedName = String(req.body?.displayName || '').trim();
  const note = String(req.body?.note || '').trim();
  if (!isValidPlainText(proposedName, 2, 80)) {
    return res.status(400).json({ error: 'Bitte den gewuenschten Klingelschildnamen mit 2 bis 80 Zeichen eintragen.' });
  }
  if (note && !isValidPlainText(note, 2, 300)) {
    return res.status(400).json({ error: 'Der Hinweis darf hoechstens 300 Zeichen lang sein.' });
  }
  if (proposedName.toLocaleLowerCase('de-CH') === String(req.session.user.displayName || '').toLocaleLowerCase('de-CH')) {
    return res.status(400).json({ error: 'Dieser Klingelschildname ist bereits eingetragen.' });
  }

  const result = db.transaction(() => {
    db.prepare(`
      UPDATE apartment_name_requests
      SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP
      WHERE apartment_id = ? AND status = 'pending'
    `).run(req.session.user.apartmentId);
    return db.prepare(`
      INSERT INTO apartment_name_requests (apartment_id, user_id, proposed_name, note)
      VALUES (?, ?, ?, NULLIF(?, ''))
    `).run(req.session.user.apartmentId, req.session.user.id, proposedName, note);
  })();
  writeAudit(req, 'apartment.name_request', 'apartment', req.session.user.apartmentId, {
    requestId: result.lastInsertRowid,
    proposedName
  });
  res.status(201).json({
    ok: true,
    message: 'Dein Korrekturwunsch wurde an die Hausverwaltung weitergegeben.'
  });
});

primaryRouter.post('/api/me/device-code', requireAuth, requireApartmentAccount, async (req, res, next) => {
  if (!req.session.user.canBook) {
    return res.status(403).json({ error: 'QR-Einladungen sind nur fuer eine eigene Wohnung im aktuellen Haus verfuegbar.' });
  }
  if (!req.session.user.apartmentId) {
    return res.status(409).json({ error: 'Zuerst muss eine Wohnung mit dem Konto verbunden sein.' });
  }
  const code = generateReadableCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.transaction(() => {
    db.prepare('DELETE FROM device_pairing_codes WHERE user_id = ? OR CAST(expires_at AS INTEGER) <= ?')
      .run(req.session.user.id, Date.now());
    db.prepare(`
      INSERT INTO device_pairing_codes (user_id, apartment_id, code_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(req.session.user.id, req.session.user.apartmentId, tokenHash(normalizeAccessCode(code)), String(expiresAt));
  })();
  try {
    const loginUrl = `${publicAppUrl(req)}/login.html?device=${encodeURIComponent(code)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(loginUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: { dark: '#0d241cff', light: '#ffffffff' }
    });
    res.status(201).json({
      code,
      expiresAt,
      apartmentLabel: req.session.user.apartmentLabel,
      loginUrl,
      qrCodeDataUrl,
      message: 'Der QR-Code ist zehn Minuten gueltig und kann einmal verwendet werden.'
    });
  } catch (error) {
    next(error);
  }
});

primaryRouter.post('/api/me/apartment/join', requireAuth, async (req, res, next) => {
  return res.status(410).json({
    error: 'Konten werden nicht mehr zusammengefuehrt. Nutze die QR-Einladung auf der Loginseite mit deiner eigenen E-Mail-Adresse.'
  });
  /* Alte Zusammenfuehrung bleibt nur waehrend der Datenmigration im Quelltext dokumentiert. */
  if (req.session.user.role !== 'user' || req.session.user.apartmentId) {
    return res.status(409).json({ error: 'Dieses Konto ist bereits einer Wohnung zugeordnet.' });
  }
  const code = normalizeAccessCode(req.body?.deviceCode);
  const pairing = code ? db.prepare(`
    SELECT dpc.id, dpc.user_id, u.house_id, u.apartment_id, u.active
    FROM device_pairing_codes dpc
    JOIN users u ON u.id = dpc.user_id
    WHERE dpc.code_hash = ? AND dpc.used_at IS NULL
      AND CAST(dpc.expires_at AS INTEGER) > ? AND u.active = 1
  `).get(tokenHash(code), Date.now()) : null;
  if (!pairing || !pairing.apartment_id || pairing.house_id !== req.session.user.houseId) {
    return res.status(400).json({ error: 'Der Ger\u00e4tecode ist ung\u00fcltig, abgelaufen oder geh\u00f6rt zu einem anderen Haus.' });
  }
  if (Number(pairing.user_id) === Number(req.session.user.id)) {
    return res.status(400).json({ error: 'Dieser Ger\u00e4tecode geh\u00f6rt bereits zu deinem Konto.' });
  }

  try {
    const source = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(pairing.user_id);
    const targetEmails = new Set([target.email, target.secondary_email].map(normalizeEmail).filter(Boolean));
    const sourceEmails = [
      { email: source.email, verified: source.email_verified },
      { email: source.secondary_email, verified: source.secondary_email_verified }
    ].filter((entry, index, entries) => (
      isValidEmail(entry.email)
      && !targetEmails.has(normalizeEmail(entry.email))
      && entries.findIndex((candidate) => normalizeEmail(candidate.email) === normalizeEmail(entry.email)) === index
    ));
    const availableEmailSlots = target.secondary_email ? 0 : 1;
    if (sourceEmails.length > availableEmailSlots) {
      return res.status(409).json({
        error: 'Das gemeinsame Wohnungskonto hat bereits zwei E-Mail-Adressen. Bitte dort zuerst eine Adresse anpassen und danach erneut verbinden.'
      });
    }
    db.transaction(() => {
      db.prepare('UPDATE bookings SET user_id = ? WHERE user_id = ?').run(target.id, source.id);
      db.prepare('UPDATE push_subscriptions SET user_id = ?, house_id = ? WHERE user_id = ?')
        .run(target.id, target.house_id, source.id);
      const targetPreferences = db.prepare('SELECT user_id FROM notification_preferences WHERE user_id = ?').get(target.id);
      if (!targetPreferences) {
        db.prepare('UPDATE notification_preferences SET user_id = ? WHERE user_id = ?').run(target.id, source.id);
      } else {
        db.prepare('DELETE FROM notification_preferences WHERE user_id = ?').run(source.id);
      }
      if (!target.secondary_email && sourceEmails[0]) {
        db.prepare(`
          UPDATE users SET secondary_email = ?, secondary_email_verified = ? WHERE id = ?
        `).run(sourceEmails[0].email, sourceEmails[0].verified, target.id);
      }
      db.prepare(`
        UPDATE users
        SET active = 0, apartment_id = NULL, merged_into_user_id = ?,
            email = NULL, secondary_email = NULL,
            email_verified = 0, secondary_email_verified = 0
        WHERE id = ?
      `).run(target.id, source.id);
      db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(source.id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(source.id);
      db.prepare('UPDATE device_pairing_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(pairing.id);
    })();

    destroyUserSessions(source.id, req.sessionID);
    req.session.user = sessionUserFromRow(db.prepare('SELECT * FROM users WHERE id = ?').get(target.id));
    req.session.activeHouseId = target.house_id;
    req.session.lastActivityAt = Date.now();
    writeAudit(req, 'apartment.account_merge', 'user', source.id, { targetUserId: target.id });
    res.json({
      user: req.session.user,
      message: `Dieses Ger\u00e4t nutzt jetzt das gemeinsame Konto ${req.session.user.apartmentLabel}.`
    });
  } catch (error) {
    next(error);
  }
});

primaryRouter.post('/api/session/keepalive', requireAuth, (req, res) => {
  req.session.lastActivityAt = Date.now();
  res.json({
    ok: true,
    session: {
      idleTimeoutMs: sessionIdleTimeoutMs,
      warningMs: sessionWarningMs,
      lastActivityAt: req.session.lastActivityAt
    }
  });
});

personalRouter.put('/api/me/password', requireAuth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.session.user.id);

  if (!user || !verifyStoredPassword(currentPassword, user.password_hash)) {
    return res.status(403).json({ error: 'Das bisherige Passwort stimmt nicht.' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Das neue Passwort muss 12 bis 128 Zeichen haben.' });
  }
  if (verifyStoredPassword(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Bitte verwende ein anderes neues Passwort.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), user.id);
  destroyUserSessions(user.id, req.sessionID);
  res.json({ ok: true, message: 'Dein Passwort wurde ge\u00e4ndert.' });
});

personalRouter.get('/api/me/export', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.secondary_email, u.role, u.active,
           u.notify_releases, u.email_verified, u.secondary_email_verified,
           u.booking_mode, u.created_at, a.label AS apartment,
           a.display_name AS apartment_display_name
    FROM users u LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE u.id = ?
  `).get(req.session.user.id);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ?').get(req.session.user.houseId);
  const bookings = db.prepare(`
    SELECT b.booking_date, b.slot, b.group_id, b.created_at, r.name AS resource, r.type AS resource_type
    FROM bookings b JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ? ORDER BY b.booking_date, b.slot
  `).all(req.session.user.bookingUserId);
  const notificationPreferences = db.prepare(`
    SELECT resource_type, weekday, slot FROM notification_preferences WHERE user_id = ?
  `).get(req.session.user.id) || null;
  const payload = {
    exportedAt: new Date().toISOString(),
    account: user,
    house,
    notificationPreferences,
    bookings
  };
  res.setHeader('Content-Disposition', 'attachment; filename="waschplan-meine-daten.json"');
  res.type('application/json').send(JSON.stringify(payload, null, 2));
});

personalRouter.delete('/api/me', requireAuth, (req, res) => {
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!user || !verifyStoredPassword(password, user.password_hash)) {
    return res.status(403).json({ error: 'Das Passwort stimmt nicht.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Das Superadmin-Konto kann nur nach \u00dcbergabe der Verantwortung entfernt werden.' });
  }
  if (hasHouseRole(user.id, user.house_id)) {
    const activeAdmins = db.prepare(`
      SELECT COUNT(*) AS count
      FROM user_house_roles uhr JOIN users u ON u.id = uhr.user_id
      WHERE uhr.house_id = ? AND uhr.role = 'house_admin' AND u.active = 1
    `).get(user.house_id).count;
    if (activeAdmins <= 1) {
      return res.status(409).json({ error: 'Zuerst muss ein anderes aktives Admin-Konto f\u00fcr dieses Haus vorhanden sein.' });
    }
  }
  writeAudit(req, 'user.self_delete', 'user', user.id);
  destroyUserSessions(user.id, req.sessionID);
  db.transaction(() => {
    if (user.apartment_id) {
      const successor = db.prepare(`
        SELECT id FROM users
        WHERE apartment_id = ? AND active = 1 AND id != ?
        ORDER BY id LIMIT 1
      `).get(user.apartment_id, user.id);
      if (successor) {
        db.prepare('UPDATE bookings SET user_id = ? WHERE user_id = ?').run(successor.id, user.id);
        db.prepare('UPDATE apartments SET claimed_by = ? WHERE id = ? AND claimed_by = ?')
          .run(successor.id, user.apartment_id, user.id);
      }
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  })();
  req.session.destroy(() => res.json({ ok: true, message: 'Dein persoenlicher Zugang wurde geloescht. Gemeinsame Wohnungsbuchungen bleiben fuer andere Mitglieder erhalten.' }));
});

  return { primaryRouter, personalRouter };
}

module.exports = { createAccountRouters };

