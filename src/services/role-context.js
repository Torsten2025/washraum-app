'use strict';

function createRoleContext({ db, env }) {
  function currentHouseId(req) {
    return Number(req.session.activeHouseId || req.session.user?.activeHouseId || req.session.user?.houseId || 0);
  }
  
  function isSuperadmin(req) {
    return Boolean(req.session.user?.isSuperadmin);
  }
  
  function hasHouseRole(userId, houseId, role = 'house_admin') {
    if (!userId || !houseId) return false;
    return Boolean(db.prepare(`
      SELECT 1 FROM user_house_roles
      WHERE user_id = ? AND house_id = ? AND role = ?
    `).get(Number(userId), Number(houseId), role));
  }
  
  function bookingUserIdForApartment(apartmentId, fallbackUserId) {
    if (!apartmentId) return Number(fallbackUserId);
    const owner = db.prepare(`
      SELECT COALESCE(
        (SELECT claimed_by FROM apartments WHERE id = ?),
        (SELECT MIN(id) FROM users WHERE apartment_id = ? AND active = 1),
        ?
      ) AS user_id
    `).get(apartmentId, apartmentId, Number(fallbackUserId));
    return Number(owner?.user_id || fallbackUserId);
  }
  
  function sessionUserFromRow(user, activeHouse = null) {
    const house = activeHouse || db.prepare('SELECT id, name FROM houses WHERE id = ?').get(user.house_id);
    const apartment = user.apartment_id
      ? db.prepare('SELECT id, house_id, label, display_name FROM apartments WHERE id = ? AND active = 1').get(user.apartment_id)
      : null;
    const isResident = Boolean(apartment);
    const canBook = Boolean(apartment && Number(apartment.house_id) === Number(house?.id || user.house_id));
    const isHouseAdmin = hasHouseRole(user.id, house?.id || user.house_id);
    const isSuperadmin = Boolean(user.is_superadmin);
    const canManage = isSuperadmin || isHouseAdmin;
    const roles = [
      ...(isResident ? ['resident'] : []),
      ...(isHouseAdmin ? ['house_admin'] : []),
      ...(isSuperadmin ? ['superadmin'] : [])
    ];
    return {
      id: user.id,
      username: user.username,
      role: canManage ? 'admin' : 'user',
      roles,
      isResident,
      isHouseAdmin,
      canBook,
      canManage,
      email: user.email || '',
      notifyReleases: Boolean(user.notify_releases),
      emailVerified: Boolean(user.email_verified),
      secondaryEmail: user.secondary_email || '',
      secondaryEmailVerified: Boolean(user.secondary_email_verified),
      language: user.language === 'en' ? 'en' : 'de',
      bookingMode: user.booking_mode === 'machine' ? 'machine' : 'time',
      apartmentId: apartment?.id || null,
      apartmentLabel: apartment?.label || '',
      displayName: apartment?.display_name || apartment?.label || user.username,
      apartmentSetupRequired: !apartment && !canManage,
      bookingUserId: apartment ? bookingUserIdForApartment(apartment.id, user.id) : user.id,
      houseId: user.house_id,
      activeHouseId: house?.id || user.house_id,
      houseName: house?.name || '',
      isSuperadmin
    };
  }

  function adminRecoveryStatus(houseId) {
    const houseAdminCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM user_house_roles uhr
      JOIN users u ON u.id = uhr.user_id
      WHERE uhr.house_id = ? AND uhr.role = 'house_admin' AND u.active = 1
    `).get(houseId).count;
    const activeSuperadmins = db.prepare(`
      SELECT id, username, house_id
      FROM users
      WHERE active = 1 AND is_superadmin = 1
      ORDER BY username
    `).all();
    const seedAdminName = String(env.SEED_ADMIN_NAME || 'admin');
    const seedRecoveryConfigured = Boolean(String(env.SEED_ADMIN_PASSWORD || '').trim());
    const seedPasswordResetEnabled = env.SEED_ADMIN_FORCE_PASSWORD_RESET === 'true';
    const warnings = [];
  
    if (houseAdminCount < 2) {
      warnings.push({
        level: 'warning',
        code: 'single_house_admin',
        message: 'Nur ein aktives Admin-Konto in diesem Haus. Lege eine Stellvertretung fest.'
      });
    }
    if (activeSuperadmins.length < 2) {
      warnings.push({
        level: 'warning',
        code: 'single_superadmin',
        message: 'Nur ein aktiver Superadmin. Gib einer vertrauenswuerdigen Stellvertretung rechtzeitig zusaetzliche Superadminrechte.'
      });
    }
    if (!seedRecoveryConfigured) {
      warnings.push({
        level: 'critical',
        code: 'seed_recovery_missing',
        message: 'SEED_ADMIN_PASSWORD ist nicht gesetzt. Der technische Notfallzugang ist nicht vorbereitet.'
      });
    }
    if (seedPasswordResetEnabled) {
      warnings.push({
        level: 'critical',
        code: 'seed_force_reset_enabled',
        message: 'SEED_ADMIN_FORCE_PASSWORD_RESET ist aktiv. Nach dem Notfall sofort wieder entfernen.'
      });
    }
  
    return {
      houseAdminCount,
      superadminCount: activeSuperadmins.length,
      superadmins: activeSuperadmins,
      seedAdminName,
      seedRecoveryConfigured,
      seedPasswordResetEnabled,
      warnings
    };
  }
  

  return {
    currentHouseId,
    isSuperadmin,
    hasHouseRole,
    bookingUserIdForApartment,
    sessionUserFromRow,
    adminRecoveryStatus
  };
}

module.exports = { createRoleContext };
