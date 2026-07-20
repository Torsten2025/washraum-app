'use strict';

function createHouseRoleRouters({
  express,
  db,
  crypto,
  allowLegacyHouseRegistration,
  allowTestInvitationLink,
  requireAuth,
  requireAdmin,
  requireSuperadmin,
  adminRecoveryRateLimit,
  currentHouseId,
  isSuperadmin,
  hasHouseRole,
  sessionUserFromRow,
  adminRecoveryStatus,
  normalizeEmail,
  isValidEmail,
  verifiedEmailForUser,
  normalizeAccessCode,
  generateReadableCode,
  findEmailOwner,
  pendingInvitationForEmail,
  issueApartmentInvitation,
  apartmentAccountLabel,
  destroyUserSessions,
  tokenHash,
  smtpConfig,
  sendPasswordReset,
  writeAudit,
  confirmCurrentAdminPassword,
  isValidPlainText,
  todayStringLocal,
  seedHouseResources
}) {
  const activeHouseRouter = express.Router();
  const accountsRouter = express.Router();
  const recoveryRouter = express.Router();
  const housesRouter = express.Router();
  const houseCodeRouter = express.Router();

activeHouseRouter.put('/api/me/active-house', requireAuth, requireSuperadmin, (req, res) => {
  const houseId = Number(req.body?.houseId);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ? AND active = 1').get(houseId);
  if (!house) {
    return res.status(404).json({ error: 'Hausnummer nicht gefunden.' });
  }
  req.session.activeHouseId = house.id;
  const identity = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  req.session.user = sessionUserFromRow(identity, house);
  res.json({ user: req.session.user, message: `Ansicht gewechselt zu ${house.name}.` });
});

accountsRouter.get('/api/admin/apartments', requireAdmin, (req, res) => {
  const apartments = db.prepare(`
    SELECT a.id, a.label, a.display_name, a.active, a.claimed_at,
           CASE WHEN EXISTS (SELECT 1 FROM users member WHERE member.apartment_id = a.id AND member.active = 1) THEN 1 ELSE 0 END AS claimed,
           (SELECT COUNT(*) FROM users member WHERE member.apartment_id = a.id AND member.active = 1) AS member_count,
           (SELECT group_concat(member.email, ', ') FROM users member WHERE member.apartment_id = a.id AND member.active = 1 AND member.email IS NOT NULL) AS member_emails,
           u.email, u.secondary_email, u.email_verified, u.secondary_email_verified,
           ai.email AS invitation_email, ai.expires_at AS invitation_expires_at,
           ai.email_sent_at AS invitation_email_sent_at,
           ai.accepted_at AS invitation_accepted_at, ai.revoked_at AS invitation_revoked_at,
           anr.id AS name_request_id, anr.proposed_name AS requested_display_name,
           anr.note AS name_request_note, anr.created_at AS name_request_created_at
    FROM apartments a
    LEFT JOIN users u ON u.id = a.claimed_by
    LEFT JOIN apartment_invitations ai ON ai.id = (
      SELECT id FROM apartment_invitations
      WHERE apartment_id = a.id
      ORDER BY id DESC LIMIT 1
    )
    LEFT JOIN apartment_name_requests anr ON anr.id = (
      SELECT id FROM apartment_name_requests
      WHERE apartment_id = a.id AND status = 'pending'
      ORDER BY id DESC LIMIT 1
    )
    WHERE a.house_id = ?
    ORDER BY a.label COLLATE NOCASE
  `).all(currentHouseId(req)).map((apartment) => ({
    ...apartment,
    active: Boolean(apartment.active),
    claimed: Boolean(apartment.claimed),
    invitationStatus: !apartment.invitation_email
        ? 'none'
        : apartment.invitation_accepted_at
          ? 'accepted'
          : apartment.invitation_revoked_at
            ? 'revoked'
            : !apartment.invitation_email_sent_at && !allowTestInvitationLink
              ? 'not_sent'
              : Number(apartment.invitation_expires_at) <= Date.now()
                ? 'expired'
                : 'pending',
    member_count: Number(apartment.member_count || 0)
  }));
  res.json({ apartments });
});

accountsRouter.post('/api/admin/apartments', requireAdmin, async (req, res, next) => {
  const label = String(req.body?.label || '').trim();
  const displayName = String(req.body?.displayName || '').trim();
  const email = normalizeEmail(req.body?.email);
  if (!isValidPlainText(label, 2, 60)) {
    return res.status(400).json({ error: 'Bitte eine Wohnungsbezeichnung mit 2 bis 60 Zeichen eingeben.' });
  }
  if (!isValidPlainText(displayName, 2, 80)) {
    return res.status(400).json({ error: 'Bitte den Namen vom Klingelschild mit 2 bis 80 Zeichen eingeben.' });
  }
  if (allowLegacyHouseRegistration && !email) {
    const code = generateReadableCode('W');
    try {
      const result = db.prepare(`
        INSERT INTO apartments (house_id, label, display_name, activation_code_hash)
        VALUES (?, ?, ?, ?)
      `).run(currentHouseId(req), label, displayName, tokenHash(normalizeAccessCode(code)));
      return res.status(201).json({
        apartment: { id: result.lastInsertRowid, label, display_name: displayName, claimed: false, active: true },
        activationCode: code,
        message: 'Technische Testwohnung angelegt.'
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Diese Wohnungsbezeichnung ist bereits vorhanden.' });
      }
      return next(error);
    }
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse fuer die Einladung eingeben.' });
  }
  const existingIdentity = findEmailOwner(email);
  const existingIdentityRow = existingIdentity
    ? db.prepare('SELECT id, house_id, apartment_id FROM users WHERE id = ? AND active = 1').get(existingIdentity.id)
    : null;
  if (
    (existingIdentity && !existingIdentityRow)
    || existingIdentityRow?.apartment_id
    || (existingIdentityRow && Number(existingIdentityRow.house_id) !== currentHouseId(req))
    || pendingInvitationForEmail(email)
  ) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse gehoert bereits zu einer Wohnung, einem anderen Haus oder einer offenen Einladung.' });
  }
  const invitationConfig = smtpConfig();
  if (!allowTestInvitationLink && (!invitationConfig.host || !invitationConfig.from)) {
    return res.status(503).json({
      error: 'Der E-Mail-Versand ist noch nicht eingerichtet. Es wurde keine Wohnung und keine Einladung angelegt.'
    });
  }
  try {
    const result = db.prepare(`
      INSERT INTO apartments (house_id, label, display_name, activation_code_hash)
      VALUES (?, ?, ?, NULL)
    `).run(currentHouseId(req), label, displayName);
    const apartment = {
      id: result.lastInsertRowid,
      house_id: currentHouseId(req),
      house_name: db.prepare('SELECT name FROM houses WHERE id = ?').get(currentHouseId(req)).name,
      label,
      display_name: displayName
    };
    const invitation = await issueApartmentInvitation(req, apartment, email);
    writeAudit(req, 'apartment.invitation_created', 'apartment', result.lastInsertRowid, {
      label, displayName, email, emailSent: invitation.emailSent
    });
    const response = {
      apartment: { id: result.lastInsertRowid, label, display_name: displayName, claimed: false, active: true },
      invitation: {
        email,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
        emailSent: invitation.emailSent
      },
      message: invitation.emailSent
        ? `Wohnung angelegt. Die Einladung wurde an ${email} gesendet.`
        : 'Technische Testeinladung angelegt.'
    };
    if (allowTestInvitationLink && !invitation.emailSent) response.invitationLink = invitation.link;
    res.status(201).json(response);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Diese Wohnungsbezeichnung ist bereits vorhanden.' });
    }
    if (error.code === 'INVITATION_EMAIL_FAILED') {
      return res.status(502).json({
        error: 'Die Wohnung wurde angelegt, aber die Einladungsmail konnte nicht gesendet werden. Bitte bei der Wohnung erneut auf Einladen klicken.'
      });
    }
    next(error);
  }
});

accountsRouter.post('/api/admin/apartments/:id/invitation', requireAdmin, async (req, res, next) => {
  const apartment = db.prepare(`
    SELECT a.id, a.house_id, a.label, a.display_name, a.claimed_by, h.name AS house_name
    FROM apartments a JOIN houses h ON h.id = a.house_id
    WHERE a.id = ? AND a.house_id = ? AND a.active = 1
  `).get(Number(req.params.id), currentHouseId(req));
  if (!apartment) return res.status(404).json({ error: 'Wohnung nicht gefunden.' });
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse fuer die Einladung eingeben.' });
  }
  const existingIdentity = findEmailOwner(email);
  const existingIdentityRow = existingIdentity
    ? db.prepare('SELECT id, house_id, apartment_id FROM users WHERE id = ? AND active = 1').get(existingIdentity.id)
    : null;
  if (
    (existingIdentity && !existingIdentityRow)
    || (existingIdentityRow?.apartment_id && Number(existingIdentityRow.apartment_id) !== Number(apartment.id))
    || (existingIdentityRow && Number(existingIdentityRow.house_id) !== Number(apartment.house_id))
    || pendingInvitationForEmail(email, apartment.id)
  ) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse gehoert bereits zu einer anderen Wohnung, einem anderen Haus oder einer offenen Einladung.' });
  }
  if (existingIdentityRow?.apartment_id && Number(existingIdentityRow.apartment_id) === Number(apartment.id)) {
    return res.status(409).json({ error: 'Diese Person ist bereits Mitglied dieser Wohnung.' });
  }
  const invitationConfig = smtpConfig();
  if (!allowTestInvitationLink && (!invitationConfig.host || !invitationConfig.from)) {
    return res.status(503).json({
      error: 'Der E-Mail-Versand ist noch nicht eingerichtet. Es wurde keine Einladung erstellt.'
    });
  }
  try {
    const invitation = await issueApartmentInvitation(req, apartment, email);
    writeAudit(req, 'apartment.invitation_renewed', 'apartment', apartment.id, {
      label: apartment.label, email, emailSent: invitation.emailSent
    });
    const response = {
      invitation: {
        email,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
        emailSent: invitation.emailSent
      },
      message: invitation.emailSent
        ? `Neue Einladung wurde an ${email} gesendet.`
        : 'Technische Testeinladung erneuert.'
    };
    if (allowTestInvitationLink && !invitation.emailSent) response.invitationLink = invitation.link;
    res.json(response);
  } catch (error) {
    if (error.code === 'INVITATION_EMAIL_FAILED') {
      return res.status(502).json({
        error: 'Die Einladungsmail konnte nicht gesendet werden. Die bisherige Einladung bleibt gueltig.'
      });
    }
    next(error);
  }
});

accountsRouter.put('/api/admin/apartments/:id', requireAdmin, async (req, res, next) => {
  const apartment = db.prepare(`
    SELECT a.id, a.label, a.display_name, a.claimed_by,
           u.email, u.secondary_email, u.email_verified, u.secondary_email_verified, u.username
    FROM apartments a
    LEFT JOIN users u ON u.id = a.claimed_by
    WHERE a.id = ? AND a.house_id = ? AND a.active = 1
  `).get(Number(req.params.id), currentHouseId(req));
  if (!apartment) {
    return res.status(404).json({ error: 'Wohnung nicht gefunden.' });
  }

  const displayName = String(req.body?.displayName || '').trim();
  if (!isValidPlainText(displayName, 2, 80)) {
    return res.status(400).json({ error: 'Bitte den Namen vom Klingelschild mit 2 bis 80 Zeichen eingeben.' });
  }

  const requestedEmail = normalizeEmail(req.body?.email);
  const requestedSecondaryEmail = normalizeEmail(req.body?.secondaryEmail);
  if (apartment.claimed_by && (
    (Object.hasOwn(req.body || {}, 'email') && requestedEmail !== normalizeEmail(apartment.email))
    || (Object.hasOwn(req.body || {}, 'secondaryEmail')
      && requestedSecondaryEmail !== normalizeEmail(apartment.secondary_email))
  )) {
    return res.status(403).json({
      error: 'Admins duerfen die E-Mail-Adressen eines Wohnungskontos nicht ersetzen. Bewohner aendern sie selbst unter Einstellungen; ohne bestaetigte Adresse wird ein persoenlicher Wiederherstellungscode verwendet.'
    });
  }

  try {
    db.transaction(() => {
      db.prepare('UPDATE apartments SET display_name = ? WHERE id = ?').run(displayName, apartment.id);
      db.prepare(`
        UPDATE apartment_name_requests
        SET status = CASE WHEN lower(proposed_name) = lower(?) THEN 'approved' ELSE 'rejected' END,
            resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE apartment_id = ? AND status = 'pending'
      `).run(displayName, req.session.user.id, apartment.id);
    })();

    writeAudit(req, 'apartment.update', 'apartment', apartment.id, {
      label: apartment.label,
      displayName
    });
    res.json({
      ok: true,
      message: `${apartment.label} wurde aktualisiert.`
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Name oder E-Mail-Adresse ist bereits vergeben.' });
    }
    next(error);
  }
});

accountsRouter.post('/api/admin/apartments/:id/name-request/:requestId/reject', requireAdmin, (req, res) => {
  const request = db.prepare(`
    SELECT anr.id, anr.apartment_id, anr.proposed_name
    FROM apartment_name_requests anr
    JOIN apartments a ON a.id = anr.apartment_id
    WHERE anr.id = ? AND anr.apartment_id = ? AND anr.status = 'pending' AND a.house_id = ?
  `).get(Number(req.params.requestId), Number(req.params.id), currentHouseId(req));
  if (!request) {
    return res.status(404).json({ error: 'Offener Korrekturwunsch nicht gefunden.' });
  }
  db.prepare(`
    UPDATE apartment_name_requests
    SET status = 'rejected', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.session.user.id, request.id);
  writeAudit(req, 'apartment.name_request_reject', 'apartment', request.apartment_id, {
    requestId: request.id,
    proposedName: request.proposed_name
  });
  res.json({ ok: true, message: 'Der Korrekturwunsch wurde abgelehnt.' });
});

accountsRouter.post('/api/admin/apartments/:id/new-code', requireAdmin, (req, res) => {
  if (!allowLegacyHouseRegistration) {
    return res.status(410).json({ error: 'Wohnungscodes wurden durch sichere E-Mail-Einladungen ersetzt.' });
  }
  const apartment = db.prepare(`
    SELECT id, label, claimed_by FROM apartments WHERE id = ? AND house_id = ? AND active = 1
  `).get(Number(req.params.id), currentHouseId(req));
  if (!apartment) return res.status(404).json({ error: 'Wohnung nicht gefunden.' });
  if (apartment.claimed_by) {
    return res.status(409).json({ error: 'Eine bereits aktivierte Wohnung erhaelt keinen neuen Aktivierungscode.' });
  }
  const code = generateReadableCode('W');
  db.prepare('UPDATE apartments SET activation_code_hash = ? WHERE id = ?')
    .run(tokenHash(normalizeAccessCode(code)), apartment.id);
  res.json({ activationCode: code, message: 'Technischer Testcode wurde erneuert.' });
});

accountsRouter.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.secondary_email, u.role, u.house_id, u.is_superadmin,
           u.active, u.notify_releases, u.email_verified, u.secondary_email_verified,
           u.created_at, a.label AS apartment_label, a.display_name AS apartment_display_name,
           u.merged_into_user_id,
           CASE WHEN u.apartment_id IS NULL THEN 0 ELSE 1 END AS is_resident,
           CASE WHEN EXISTS (
             SELECT 1 FROM user_house_roles uhr
             WHERE uhr.user_id = u.id AND uhr.house_id = ? AND uhr.role = 'house_admin'
           ) THEN 1 ELSE 0 END AS is_house_admin
    FROM users u
    LEFT JOIN apartments a ON a.id = u.apartment_id
    WHERE u.house_id = ?
    ORDER BY COALESCE(NULLIF(a.display_name, ''), a.label, u.username), u.username
  `).all(currentHouseId(req), currentHouseId(req));
  res.json({ users });
});

accountsRouter.put('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const active = req.body?.active === true ? 1 : 0;
  const user = db.prepare(`
    SELECT id, username, role, is_superadmin, active, merged_into_user_id
    FROM users WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (active && user.merged_into_user_id) {
    return res.status(409).json({ error: 'Ein zusammengefuehrtes Alt-Konto kann nicht wieder aktiviert werden.' });
  }
  if (!active && user.id === req.session.user.id) {
    return res.status(400).json({ error: 'Du kannst dein eigenes Admin-Konto nicht deaktivieren.' });
  }
  if (user.is_superadmin && user.id !== req.session.user.id) {
    return res.status(403).json({ error: 'Das Superadmin-Konto kann hier nicht ge\u00e4ndert werden.' });
  }
  const targetIsHouseAdmin = hasHouseRole(user.id, currentHouseId(req));
  if (!isSuperadmin(req) && targetIsHouseAdmin) {
    return res.status(403).json({ error: 'Hausadmins k\u00f6nnen andere Admin-Konten nicht verwalten.' });
  }
  if (!active && targetIsHouseAdmin) {
    const activeAdmins = db.prepare(`
      SELECT COUNT(*) AS count
      FROM user_house_roles uhr JOIN users u ON u.id = uhr.user_id
      WHERE uhr.role = 'house_admin' AND uhr.house_id = ? AND u.active = 1
    `).get(currentHouseId(req)).count;
    if (activeAdmins <= 1) {
      return res.status(400).json({ error: 'Mindestens ein aktives Admin-Konto muss erhalten bleiben.' });
    }
  }

  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, user.id);
  if (!active) {
    destroyUserSessions(user.id);
  }
  writeAudit(req, 'user.status', 'user', user.id, { active: Boolean(active) });
  res.json({ ok: true, message: `${apartmentAccountLabel(user.id, user.username)} ist jetzt ${active ? 'aktiv' : 'deaktiviert'}.` });
});

accountsRouter.post('/api/admin/users/:id/password-reset', requireAdmin, adminRecoveryRateLimit, async (req, res, next) => {
  const userId = Number(req.params.id);
  const user = db.prepare(`
    SELECT id, username, email, email_verified, secondary_email, secondary_email_verified, role, is_superadmin FROM users
    WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));

  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (user.id === req.session.user.id) {
    return res.status(400).json({ error: 'Dein eigenes Passwort \u00e4nderst du unter Buchen in Zugang & Sicherheit.' });
  }
  if (user.is_superadmin && user.id !== req.session.user.id) {
    return res.status(403).json({ error: 'Das Superadmin-Passwort kann hier nicht ge\u00e4ndert werden.' });
  }
  if (!isSuperadmin(req) && hasHouseRole(user.id, currentHouseId(req))) {
    return res.status(403).json({ error: 'Hausadmins k\u00f6nnen keine Reset-Links f\u00fcr andere Admins senden.' });
  }
  try {
    const deliveryEmail = verifiedEmailForUser(user);
    const sent = await sendPasswordReset(req, user, deliveryEmail);
    if (!sent) {
      return res.status(409).json({
        error: 'F\u00fcr dieses Konto ist keine best\u00e4tigte E-Mail-Adresse oder kein E-Mail-Versand eingerichtet.'
      });
    }
    writeAudit(req, 'user.password_reset_requested', 'user', user.id);
    res.json({ ok: true, message: `Reset-Link wurde an die best\u00e4tigte Adresse von ${apartmentAccountLabel(user.id, user.username)} gesendet.` });
  } catch (error) {
    next(error);
  }
});

accountsRouter.post('/api/admin/users/:id/recovery-code', requireAdmin, adminRecoveryRateLimit, (req, res) => {
  const userId = Number(req.params.id);
  const user = db.prepare(`
    SELECT id, username, email, email_verified, secondary_email, secondary_email_verified, role, is_superadmin,
           active, merged_into_user_id, house_id, apartment_id
    FROM users
    WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));
  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (!user.apartment_id || hasHouseRole(user.id, currentHouseId(req)) || user.is_superadmin || user.merged_into_user_id || !user.active) {
    return res.status(409).json({ error: 'Nur ein aktives, nicht zusammengefuehrtes Bewohnerkonto kann so wiederhergestellt werden.' });
  }
  if (verifiedEmailForUser(user)) {
    return res.status(409).json({ error: 'Dieses Konto besitzt eine bestaetigte E-Mail-Adresse. Bitte stattdessen einen normalen Reset-Link senden.' });
  }
  if (req.body?.confirm !== 'KONTO WIEDERHERSTELLEN') {
    return res.status(400).json({ error: 'Bitte die Wiederherstellung eindeutig bestaetigen.' });
  }

  const code = generateReadableCode('R');
  const expiresAt = Date.now() + 15 * 60 * 1000;
  db.transaction(() => {
    db.prepare('DELETE FROM account_recovery_codes WHERE user_id = ? OR CAST(expires_at AS INTEGER) <= ?')
      .run(user.id, Date.now());
    db.prepare(`
      INSERT INTO account_recovery_codes (user_id, code_hash, expires_at, created_by)
      VALUES (?, ?, ?, ?)
    `).run(user.id, tokenHash(normalizeAccessCode(code)), String(expiresAt), req.session.user.id);
  })();
  destroyUserSessions(user.id);
  writeAudit(req, 'user.recovery_code_created', 'user', user.id, { expiresAt });
  res.status(201).json({
    code,
    expiresAt,
    message: 'Wiederherstellungscode erstellt. Er ist 15 Minuten gueltig, nur einmal verwendbar und muss der berechtigten Person direkt uebergeben werden.'
  });
});

accountsRouter.put('/api/admin/users/:id/role', requireAdmin, requireSuperadmin, (req, res) => {
  const userId = Number(req.params.id);
  const role = String(req.body?.role || '');
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Ung\u00fcltige Rolle.' });
  }
  const user = db.prepare(`
    SELECT id, username, is_superadmin
    FROM users WHERE id = ? AND house_id = ?
  `).get(userId, currentHouseId(req));
  if (!user) {
    return res.status(404).json({ error: 'Konto nicht gefunden.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Die Rolle des Superadmins kann nicht ge\u00e4ndert werden.' });
  }
  if (role === 'admin') {
    db.prepare(`
      INSERT OR IGNORE INTO user_house_roles (user_id, house_id, role, granted_by)
      VALUES (?, ?, 'house_admin', ?)
    `).run(user.id, currentHouseId(req), req.session.user.id);
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  } else {
    db.prepare(`
      DELETE FROM user_house_roles WHERE user_id = ? AND house_id = ? AND role = 'house_admin'
    `).run(user.id, currentHouseId(req));
    db.prepare("UPDATE users SET role = 'user' WHERE id = ? AND is_superadmin = 0").run(user.id);
  }
  destroyUserSessions(user.id);
  writeAudit(req, 'user.role', 'user', user.id, { role });
  res.json({ message: `${apartmentAccountLabel(user.id, user.username)} ist jetzt ${role === 'admin' ? 'Haus-Admin' : 'Bewohner'}.` });
});

accountsRouter.put('/api/admin/users/:id/house', requireAdmin, requireSuperadmin, (req, res) => {
  const userId = Number(req.params.id);
  const houseId = Number(req.body?.houseId);
  const user = db.prepare('SELECT id, username, house_id, is_superadmin, apartment_id FROM users WHERE id = ?').get(userId);
  const house = db.prepare('SELECT id, name FROM houses WHERE id = ? AND active = 1').get(houseId);
  if (!user || !house) {
    return res.status(404).json({ error: 'Konto oder Zielhaus nicht gefunden.' });
  }
  if (user.is_superadmin) {
    return res.status(400).json({ error: 'Das Superadmin-Konto kann nicht verschoben werden.' });
  }
  if (user.apartment_id) {
    return res.status(409).json({ error: 'Ein Wohnungskonto bleibt bei seiner Wohnung und kann nicht in ein anderes Haus verschoben werden.' });
  }
  if (user.house_id === house.id) {
    return res.status(400).json({ error: 'Das Konto geh\u00f6rt bereits zu diesem Haus.' });
  }
  const futureBookings = db.prepare('SELECT COUNT(*) AS count FROM bookings WHERE user_id = ? AND booking_date >= ?')
    .get(user.id, todayStringLocal()).count;
  if (futureBookings) {
    return res.status(409).json({ error: 'Vor dem Umzug m\u00fcssen die kommenden Buchungen dieses Kontos gel\u00f6scht werden.' });
  }
  const previousHouseId = user.house_id;
  db.transaction(() => {
    db.prepare('DELETE FROM user_house_roles WHERE user_id = ?').run(user.id);
    db.prepare('UPDATE users SET house_id = ?, role = ? WHERE id = ?').run(house.id, 'user', user.id);
  })();
  destroyUserSessions(user.id);
  writeAudit(req, 'user.move', 'user', user.id, { fromHouseId: previousHouseId, toHouseId: house.id });
  res.json({ ok: true, message: `${apartmentAccountLabel(user.id, user.username)} wurde nach ${house.name} verschoben.` });
});

recoveryRouter.get('/api/admin/recovery-status', requireAdmin, (req, res) => {
  res.json(adminRecoveryStatus(currentHouseId(req)));
});

recoveryRouter.post('/api/admin/superadmin-transfer', requireAdmin, requireSuperadmin, (req, res) => {
  const targetUserId = Number(req.body?.targetUserId);
  const confirm = String(req.body?.confirm || '').trim();
  if (!confirmCurrentAdminPassword(req, res)) return;
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Bitte ein gueltiges Zielkonto waehlen.' });
  }
  if (confirm !== 'SUPERADMIN UEBERGEBEN') {
    return res.status(400).json({ error: 'Bitte SUPERADMIN UEBERGEBEN als Bestaetigung eingeben.' });
  }
  if (targetUserId === req.session.user.id) {
    return res.status(400).json({ error: 'Du bist bereits Superadmin.' });
  }

  const target = db.prepare(`
    SELECT id, username, role, active, house_id, is_superadmin
    FROM users
    WHERE id = ? AND house_id = ?
  `).get(targetUserId, currentHouseId(req));
  if (!target) {
    return res.status(404).json({ error: 'Zielkonto im aktuellen Haus nicht gefunden.' });
  }
  if (!target.active || !hasHouseRole(target.id, currentHouseId(req))) {
    return res.status(409).json({ error: 'Die Uebergabe ist nur an ein aktives Haus-Admin-Konto moeglich.' });
  }
  if (target.is_superadmin) {
    return res.status(400).json({ error: 'Dieses Konto ist bereits Superadmin.' });
  }

  const previousSuperadminId = req.session.user.id;
  db.transaction(() => {
    db.prepare('UPDATE users SET is_superadmin = 1, role = ?, active = 1 WHERE id = ?').run('admin', target.id);
    db.prepare(`
      INSERT OR IGNORE INTO user_house_roles (user_id, house_id, role, granted_by)
      VALUES (?, ?, 'house_admin', ?)
    `).run(target.id, target.house_id, previousSuperadminId);
    db.prepare('UPDATE users SET is_superadmin = 0 WHERE id = ?').run(previousSuperadminId);
  })();

  writeAudit(req, 'superadmin.transfer', 'user', target.id, {
    previousSuperadminId,
    newSuperadmin: target.username
  });
  destroyUserSessions(target.id);
  destroyUserSessions(previousSuperadminId, req.sessionID);

  const ownUser = db.prepare('SELECT * FROM users WHERE id = ?').get(previousSuperadminId);
  req.session.activeHouseId = ownUser.house_id;
  req.session.user = sessionUserFromRow(ownUser);

  res.json({
    ok: true,
    message: `${target.username} ist jetzt Superadmin. Alte Sitzungen wurden erneuert.`
  });
});

housesRouter.get('/api/admin/settings', requireAdmin, (req, res) => {
  const house = db.prepare('SELECT id, name, code FROM houses WHERE id = ?').get(currentHouseId(req));
  res.json({
    houseCode: house?.code || '',
    houseName: house?.name || ''
  });
});

housesRouter.get('/api/admin/houses', requireAdmin, requireSuperadmin, (req, res) => {
  const houses = db.prepare(`
    SELECT h.id, h.name, h.code, h.active, h.created_at,
           COUNT(DISTINCT u.id) AS users,
           COUNT(DISTINCT r.id) AS resources
    FROM houses h
    LEFT JOIN users u ON u.house_id = h.id AND u.active = 1
    LEFT JOIN resources r ON r.house_id = h.id AND r.active = 1
    GROUP BY h.id
    ORDER BY h.name
  `).all();
  res.json({ houses, activeHouseId: currentHouseId(req) });
});

housesRouter.post('/api/admin/houses', requireAdmin, requireSuperadmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const code = String(req.body?.code || `HOUSE-${crypto.randomBytes(12).toString('hex')}`).trim();
  if (!isValidPlainText(name, 2, 80)) {
    return res.status(400).json({ error: 'Die Hausnummer muss 2 bis 80 Zeichen haben.' });
  }
  if (!isValidPlainText(code, 12, 80)) {
    return res.status(400).json({ error: 'Der interne Hausschluessel ist ung\u00fcltig.' });
  }
  if (db.prepare('SELECT id FROM houses WHERE lower(name) = lower(?)').get(name)) {
    return res.status(409).json({ error: 'Diese Hausnummer ist bereits vorhanden.' });
  }

  try {
    const house = db.transaction(() => {
      const result = db.prepare('INSERT INTO houses (name, code) VALUES (?, ?)').run(name, code);
      seedHouseResources(result.lastInsertRowid);
      return db.prepare('SELECT id, name, code, active FROM houses WHERE id = ?').get(result.lastInsertRowid);
    })();
    writeAudit(req, 'house.create', 'house', house.id, { name: house.name });
    res.status(201).json({ house, message: `${house.name} wurde mit eigenen Ger\u00e4ten angelegt.` });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Hausnummer oder Hauscode ist bereits vorhanden.' });
    }
    throw error;
  }
});

housesRouter.put('/api/admin/houses/:id', requireAdmin, requireSuperadmin, (req, res) => {
  const house = db.prepare('SELECT id, name, active FROM houses WHERE id = ?').get(Number(req.params.id));
  if (!house) {
    return res.status(404).json({ error: 'Hausnummer nicht gefunden.' });
  }
  const name = String(req.body?.name ?? house.name).trim();
  const active = req.body?.active == null ? house.active : req.body.active === true ? 1 : 0;
  if (!isValidPlainText(name, 2, 80)) {
    return res.status(400).json({ error: 'Die Hausnummer muss 2 bis 80 Zeichen haben.' });
  }
  if (db.prepare('SELECT id FROM houses WHERE lower(name) = lower(?) AND id != ?').get(name, house.id)) {
    return res.status(409).json({ error: 'Diese Hausnummer ist bereits vorhanden.' });
  }
  if (!active && house.active) {
    if (Number(house.id) === Number(currentHouseId(req))) {
      return res.status(409).json({ error: 'Wechsle zuerst zu einem anderen Haus.' });
    }
    const activeUsers = db.prepare('SELECT COUNT(*) AS count FROM users WHERE house_id = ? AND active = 1').get(house.id).count;
    const futureBookings = db.prepare(`
      SELECT COUNT(*) AS count FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.house_id = ? AND b.booking_date >= ?
    `).get(house.id, todayStringLocal()).count;
    if (activeUsers || futureBookings) {
      return res.status(409).json({ error: 'Ein Haus mit aktiven Konten oder kommenden Buchungen kann nicht deaktiviert werden.' });
    }
  }
  db.prepare('UPDATE houses SET name = ?, active = ? WHERE id = ?').run(name, active, house.id);
  writeAudit(req, 'house.update', 'house', house.id, { name, active: Boolean(active) });
  res.json({ ok: true, message: `${name} wurde aktualisiert.` });
});

houseCodeRouter.put('/api/admin/settings/house-code', requireAdmin, (req, res) => {
  const houseCode = String(req.body?.houseCode || '').trim();
  if (!isValidPlainText(houseCode, 12, 80)) {
    return res.status(400).json({ error: 'Hauscode muss 12 bis 80 Zeichen haben und darf keine Steuerzeichen enthalten.' });
  }

  try {
    db.prepare('UPDATE houses SET code = ? WHERE id = ?').run(houseCode, currentHouseId(req));
    writeAudit(req, 'house.code', 'house', currentHouseId(req));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Dieser Hauscode wird bereits f\u00fcr eine andere Hausnummer verwendet.' });
    }
    throw error;
  }

  res.json({ houseCode, message: 'Hauscode gespeichert.' });
});

  return {
    activeHouseRouter,
    accountsRouter,
    recoveryRouter,
    housesRouter,
    houseCodeRouter
  };
}

module.exports = { createHouseRoleRouters };

