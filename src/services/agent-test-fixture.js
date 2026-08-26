'use strict';

const FIXTURE_VERSION = 'agent-test-fixture-v1';
const CREDENTIAL_FAILURE_BITS = Object.freeze({
  FIXTURE_POLICY: 0x1,
  FIXTURE_DISTINCT: 0x2,
  SEED_POLICY: 0x4,
  FIXTURE_SEED_OVERLAP: 0x8
});
const EXPECTED = Object.freeze({
  appEnvironment: 'agent-test',
  appRelease: 'agent-v0.3.0-test.16',
  appVersion: '0.3.0-test.16',
  branch: 'codex/agent-test',
  databasePath: '/tmp/waschzeit-agent-test.sqlite',
  externalHostname: 'waschzeit-agent-test.onrender.com',
  externalUrl: 'https://waschzeit-agent-test.onrender.com',
  houseAName: 'Agent-Test Haus A',
  serviceId: 'srv-d9m4majm8hqs739ssq20',
  serviceName: 'waschzeit-agent-test'
});

const FIXTURE = Object.freeze({
  houseBName: 'Agent-Test Haus B',
  houseBCode: 'AGENT-TEST-HOUSE-B',
  apartmentLabel: 'Agent-Test Wohnung A',
  residentUsername: 'agent-test-resident',
  houseAdminUsername: 'agent-test-houseadmin',
  superadminUsername: 'agent-test-superadmin',
  resources: Object.freeze([
    Object.freeze({ key: 'house-a-washer', name: 'Agent-Test Waschmaschine A', type: 'washer', house: 'a' }),
    Object.freeze({ key: 'house-a-drying-room', name: 'Agent-Test Trockenraum A', type: 'drying_room', house: 'a' }),
    Object.freeze({ key: 'house-a-tumbler-1', name: 'Agent-Test Tumbler A1', type: 'tumbler', house: 'a' }),
    Object.freeze({ key: 'house-a-tumbler-2', name: 'Agent-Test Tumbler A2', type: 'tumbler', house: 'a' }),
    Object.freeze({ key: 'house-b-washer', name: 'Agent-Test Waschmaschine B', type: 'washer', house: 'b' })
  ])
});

const FIXTURE_ROLE_MATRIX = Object.freeze({
  resident: Object.freeze({ role: 'user', apartment: 'house-a-apartment', superadmin: false, houseAdmin: false }),
  houseAdmin: Object.freeze({ role: 'admin', apartment: null, superadmin: false, houseAdmin: true }),
  superadmin: Object.freeze({ role: 'admin', apartment: null, superadmin: true, houseAdmin: false })
});

function fixtureError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function exact(env, key, expected) {
  return String(env[key] || '').trim() === expected;
}

function missingOrFalse(env, key) {
  const value = String(env[key] || '').trim().toLowerCase();
  return value === '' || value === 'false';
}

function validCredential(value) {
  if (typeof value !== 'string' || value.length < 24 || value.length > 256) return false;
  const characterClasses = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter((pattern) => pattern.test(value)).length;
  return characterClasses >= 3;
}

function validCommit(value) {
  return /^[a-f0-9]{40}$/.test(String(value || '').trim());
}

function evaluateAgentTestFixtureGate({ env = {}, appVersion = '' } = {}) {
  const rawEnabled = String(env.AGENT_TEST_FIXTURE_ENABLED || '').trim().toLowerCase();
  if (!rawEnabled || rawEnabled === 'false') {
    return Object.freeze({ enabled: false, requested: false, code: 'FIXTURE_DISABLED' });
  }
  if (rawEnabled !== 'true') {
    throw fixtureError('AGENT_TEST_FIXTURE_FLAG_INVALID');
  }

  const expectedCommit = String(env.AGENT_TEST_EXPECTED_COMMIT || '').trim();
  const runtimeCommit = String(env.RENDER_GIT_COMMIT || '').trim();

  const identityMatches = [
    exact(env, 'APP_ENV', EXPECTED.appEnvironment),
    exact(env, 'APP_RELEASE', EXPECTED.appRelease),
    exact(env, 'NODE_ENV', 'production'),
    exact(env, 'RENDER', 'true'),
    exact(env, 'RENDER_SERVICE_NAME', EXPECTED.serviceName),
    exact(env, 'RENDER_SERVICE_ID', EXPECTED.serviceId),
    exact(env, 'RENDER_SERVICE_TYPE', 'web'),
    exact(env, 'RENDER_EXTERNAL_HOSTNAME', EXPECTED.externalHostname),
    exact(env, 'AGENT_TEST_FIXTURE_ORIGIN', EXPECTED.externalUrl),
    exact(env, 'PUBLIC_APP_URL', EXPECTED.externalUrl),
    exact(env, 'RENDER_GIT_BRANCH', EXPECTED.branch),
    validCommit(expectedCommit),
    runtimeCommit === expectedCommit,
    exact(env, 'DB_PATH', EXPECTED.databasePath),
    exact(env, 'HOUSE_NAME', EXPECTED.houseAName),
    String(appVersion).trim() === EXPECTED.appVersion
  ];
  if (identityMatches.some((matches) => !matches)) {
    throw fixtureError('AGENT_TEST_FIXTURE_IDENTITY_MISMATCH');
  }

  for (const key of [
    'ALLOW_LEGACY_HOUSE_REGISTRATION',
    'ALLOW_TEST_INVITATION_LINK',
    'SEED_ADMIN_FORCE_PASSWORD_RESET'
  ]) {
    if (!missingOrFalse(env, key)) {
      throw fixtureError('AGENT_TEST_FIXTURE_UNSAFE_MODE');
    }
  }

  for (const key of ['BACKUP_ENABLED', 'AUTO_BACKUP', 'EMAIL_ENABLED', 'PUSH_ENABLED']) {
    if (!exact(env, key, 'false')) {
      throw fixtureError('AGENT_TEST_FIXTURE_NO_SEND_REQUIRED');
    }
  }

  const forbiddenProviderKeys = [
    'BACKUP_DIR',
    'BACKUP_UPLOAD_TOKEN',
    'BACKUP_UPLOAD_URL',
    'SMTP_FROM',
    'SMTP_HELO_NAME',
    'SMTP_HOST',
    'SMTP_PASSWORD',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_TEST_TO',
    'SMTP_USER',
    'VAPID_PRIVATE_KEY',
    'VAPID_PUBLIC_KEY',
    'VAPID_SUBJECT'
  ];
  if (forbiddenProviderKeys.some((key) => String(env[key] || '').trim() !== '')) {
    throw fixtureError('AGENT_TEST_FIXTURE_PROVIDER_BINDING_FORBIDDEN');
  }

  const credentials = [
    env.AGENT_TEST_RESIDENT_PASSWORD,
    env.AGENT_TEST_HOUSEADMIN_PASSWORD,
    env.AGENT_TEST_SUPERADMIN_PASSWORD
  ];
  const fixtureCredentialValidity = credentials.map((credential) => validCredential(credential));
  const fixturePolicyInvalid = fixtureCredentialValidity.some((valid) => !valid);
  const fixtureCredentialsNotDistinct = new Set(credentials).size !== credentials.length;
  const seedPolicyInvalid = !validCredential(env.SEED_ADMIN_PASSWORD);
  const fixtureSeedMatches = credentials.map((credential) => credential === env.SEED_ADMIN_PASSWORD);
  const fixtureSeedOverlap = fixtureSeedMatches.some(Boolean);
  const credentialFailMask =
    (fixturePolicyInvalid ? CREDENTIAL_FAILURE_BITS.FIXTURE_POLICY : 0)
    | (fixtureCredentialsNotDistinct ? CREDENTIAL_FAILURE_BITS.FIXTURE_DISTINCT : 0)
    | (seedPolicyInvalid ? CREDENTIAL_FAILURE_BITS.SEED_POLICY : 0)
    | (fixtureSeedOverlap ? CREDENTIAL_FAILURE_BITS.FIXTURE_SEED_OVERLAP : 0);
  if (credentialFailMask !== 0) {
    const error = fixtureError('AGENT_TEST_FIXTURE_CREDENTIALS_INVALID');
    error.failMask = credentialFailMask;
    throw error;
  }

  return Object.freeze({ enabled: true, requested: true, code: 'FIXTURE_ALLOWED' });
}

function installFixtureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_test_fixture_objects (
      object_type TEXT NOT NULL,
      object_key TEXT NOT NULL,
      object_id INTEGER NOT NULL,
      PRIMARY KEY (object_type, object_key),
      UNIQUE (object_type, object_id)
    );
    CREATE TABLE IF NOT EXISTS agent_test_fixture_state (
      fixture_key TEXT PRIMARY KEY,
      fixture_version TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_test_fixture_sink (
      event_key TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status = 'simulated')
    );
  `);
}

function fixtureResult(db, env, mode = 'rebuilt') {
  const counts = assertGlobalFixtureInvariants(db, env);
  const simulatedEvents = db.prepare('SELECT COUNT(*) AS count FROM agent_test_fixture_sink').get().count;
  return {
    enabled: true,
    ready: true,
    version: FIXTURE_VERSION,
    mode,
    ...counts,
    simulatedEvents
  };
}

function createAgentTestProviderBoundary({ db, gate }) {
  let externalAttempts = 0;

  function record(channel) {
    if (!gate || gate.enabled !== true) return;
    const sequence = db.prepare('SELECT COUNT(*) AS count FROM agent_test_fixture_sink').get().count + 1;
    db.prepare(`
      INSERT INTO agent_test_fixture_sink (event_key, status)
      VALUES (?, 'simulated')
    `).run(`provider.${channel}.${sequence}`);
  }

  function wrap(channel, provider) {
    return async (...args) => {
      if (gate?.enabled === true) {
        record(channel);
        return { simulated: true };
      }
      externalAttempts += 1;
      return provider(...args);
    };
  }

  function status() {
    return {
      simulatedEvents: gate?.enabled === true
        ? db.prepare('SELECT COUNT(*) AS count FROM agent_test_fixture_sink').get().count
        : 0,
      externalAttempts
    };
  }

  function assertNoExternalAttempts() {
    if (externalAttempts !== 0) {
      throw fixtureError('AGENT_TEST_FIXTURE_EXTERNAL_ATTEMPT');
    }
    return status();
  }

  return Object.freeze({
    assertNoExternalAttempts,
    wrapMail: (provider) => wrap('email', provider),
    wrapPush: (provider) => wrap('push', provider),
    status
  });
}

function registeredIds(db, type) {
  return db.prepare(`
    SELECT object_id FROM agent_test_fixture_objects WHERE object_type = ? ORDER BY object_id
  `).all(type).map((row) => Number(row.object_id));
}

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

function deleteWhereIn(db, table, column, values) {
  if (!values.length) return;
  db.prepare(`DELETE FROM ${table} WHERE ${column} IN (${placeholders(values)})`).run(...values);
}

function matchingIds(db, sql, values) {
  if (!values.length) return [];
  return db.prepare(sql.replace('__IDS__', placeholders(values))).all(...values)
    .map((row) => Number(row.id));
}

function cleanupRegisteredFixture(db) {
  const userIds = registeredIds(db, 'user');
  const apartmentIds = registeredIds(db, 'apartment');
  const resourceIds = registeredIds(db, 'resource');
  const ownedHouseIds = registeredIds(db, 'house');

  const caseIds = [
    ...matchingIds(db, `SELECT id FROM maintenance_cases WHERE house_id IN (__IDS__)`, ownedHouseIds),
    ...matchingIds(db, `SELECT id FROM maintenance_cases WHERE resource_id IN (__IDS__)`, resourceIds),
    ...matchingIds(db, `SELECT id FROM maintenance_cases WHERE reported_by IN (__IDS__)`, userIds)
  ].filter((id, index, items) => items.indexOf(id) === index);
  const reportIds = [
    ...matchingIds(db, `SELECT id FROM maintenance_reports WHERE case_id IN (__IDS__)`, caseIds),
    ...matchingIds(db, `SELECT id FROM maintenance_reports WHERE reporter_user_id IN (__IDS__)`, userIds)
  ].filter((id, index, items) => items.indexOf(id) === index);

  deleteWhereIn(db, 'maintenance_admin_notifications', 'report_id', reportIds);
  deleteWhereIn(db, 'maintenance_admin_notifications', 'case_id', caseIds);
  deleteWhereIn(db, 'maintenance_admin_notifications', 'house_id', ownedHouseIds);
  deleteWhereIn(db, 'maintenance_reports', 'id', reportIds);
  deleteWhereIn(db, 'maintenance_entries', 'case_id', caseIds);
  deleteWhereIn(db, 'maintenance_cases', 'id', caseIds);

  deleteWhereIn(db, 'audit_log', 'user_id', userIds);
  deleteWhereIn(db, 'audit_log', 'house_id', ownedHouseIds);
  for (const [targetType, ids] of [
    ['user', userIds],
    ['house', ownedHouseIds],
    ['resource', resourceIds],
    ['apartment', apartmentIds],
    ['maintenance_case', caseIds],
    ['maintenance_report', reportIds]
  ]) {
    if (ids.length) {
      db.prepare(`DELETE FROM audit_log WHERE target_type = ? AND CAST(target_id AS INTEGER) IN (${placeholders(ids)})`)
        .run(targetType, ...ids);
    }
  }
  deleteWhereIn(db, 'release_notices', 'created_by', userIds);
  deleteWhereIn(db, 'release_notices', 'house_id', ownedHouseIds);
  deleteWhereIn(db, 'release_notices', 'resource_id', resourceIds);
  deleteWhereIn(db, 'bookings', 'user_id', userIds);
  deleteWhereIn(db, 'bookings', 'resource_id', resourceIds);
  deleteWhereIn(db, 'fixed_bookings', 'apartment_id', apartmentIds);
  deleteWhereIn(db, 'fixed_bookings', 'resource_id', resourceIds);
  deleteWhereIn(db, 'resources', 'id', resourceIds);
  deleteWhereIn(db, 'users', 'id', userIds);
  deleteWhereIn(db, 'apartments', 'id', apartmentIds);
  deleteWhereIn(db, 'houses', 'id', ownedHouseIds);
  db.prepare('DELETE FROM agent_test_fixture_objects').run();
  db.prepare('DELETE FROM agent_test_fixture_state').run();
  db.prepare('DELETE FROM agent_test_fixture_sink').run();
}

function registerObject(db, type, key, id) {
  db.prepare(`
    INSERT INTO agent_test_fixture_objects (object_type, object_key, object_id)
    VALUES (?, ?, ?)
  `).run(type, key, Number(id));
}

function insertFixtureUser(db, bcrypt, { username, password, role, houseId, apartmentId = null, superadmin = false }) {
  const result = db.prepare(`
    INSERT INTO users (
      username, password_hash, role, house_id, is_superadmin, active, notify_releases,
      email, email_verified, email_verified_value, secondary_email,
      secondary_email_verified, secondary_email_verified_value, apartment_id
    ) VALUES (?, ?, ?, ?, ?, 1, 0, NULL, 0, NULL, NULL, 0, NULL, ?)
  `).run(username, bcrypt.hashSync(password, 10), role, houseId, superadmin ? 1 : 0, apartmentId);
  return Number(result.lastInsertRowid);
}

function stableAccountSnapshot(db, username) {
  const account = db.prepare(`
    SELECT id, username, password_hash, role, house_id, is_superadmin, active,
           apartment_id, email, secondary_email, notify_releases
    FROM users WHERE username = ?
  `).get(username);
  if (!account) return null;
  const roles = db.prepare(`
    SELECT house_id, role FROM user_house_roles WHERE user_id = ? ORDER BY house_id, role
  `).all(account.id);
  return JSON.stringify({ account, roles });
}

function sameRows(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function tableExists(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function assertGlobalFixtureInvariants(db, env) {
  const counts = Object.fromEntries(['houses', 'users', 'resources', 'apartments', 'sessions'].map((table) => [
    table,
    Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)
  ]));
  const roleCount = Number(db.prepare('SELECT COUNT(*) AS count FROM user_house_roles').get().count);
  if (counts.houses !== 2 || counts.users !== 4 || counts.resources !== FIXTURE.resources.length
      || counts.apartments !== 1 || counts.sessions !== 0 || roleCount !== 2) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }
  const globallyEmptyTables = [
    'account_recovery_codes',
    'apartment_invitations',
    'apartment_name_requests',
    'audit_log',
    'booking_day_usage',
    'bookings',
    'device_pairing_codes',
    'diaper_game_challenge_scores',
    'diaper_game_rounds',
    'diaper_game_scores',
    'email_verification_tokens',
    'fixed_bookings',
    'maintenance_admin_notifications',
    'maintenance_cases',
    'maintenance_entries',
    'maintenance_report_deliveries',
    'maintenance_report_notifications',
    'maintenance_report_preferences',
    'maintenance_reports',
    'notification_preferences',
    'password_reset_tokens',
    'push_subscriptions',
    'release_notices',
    'remaining_slot_requests'
  ];
  if (globallyEmptyTables.some((table) => (
    tableExists(db, table) && Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count) !== 0
  ))) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const houses = db.prepare('SELECT id, name, code, active FROM houses ORDER BY name').all();
  const houseA = houses.find((house) => house.name === EXPECTED.houseAName);
  const houseB = houses.find((house) => house.name === FIXTURE.houseBName);
  if (!houseA || !houseB || houseA.active !== 1 || houseB.active !== 1 || houseB.code !== FIXTURE.houseBCode) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const apartment = db.prepare(`
    SELECT id, house_id, label, display_name, active FROM apartments
  `).get();
  if (!apartment || Number(apartment.house_id) !== Number(houseA.id)
      || apartment.label !== FIXTURE.apartmentLabel || apartment.display_name !== FIXTURE.apartmentLabel
      || apartment.active !== 1) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const combinedUsername = String(env.SEED_ADMIN_NAME || '').trim();
  const users = db.prepare(`
    SELECT username, role, house_id, apartment_id, is_superadmin, active, email, secondary_email
    FROM users ORDER BY username
  `).all();
  const expectedUsers = [
    { username: combinedUsername, role: 'admin', house_id: houseA.id, apartment_id: null, is_superadmin: 1, active: 1, email: null, secondary_email: null },
    { username: FIXTURE.houseAdminUsername, role: 'admin', house_id: houseA.id, apartment_id: null, is_superadmin: 0, active: 1, email: null, secondary_email: null },
    { username: FIXTURE.residentUsername, role: 'user', house_id: houseA.id, apartment_id: apartment.id, is_superadmin: 0, active: 1, email: null, secondary_email: null },
    { username: FIXTURE.superadminUsername, role: 'admin', house_id: null, apartment_id: null, is_superadmin: 1, active: 1, email: null, secondary_email: null }
  ].sort((a, b) => a.username.localeCompare(b.username));
  if (!combinedUsername || !sameRows(users, expectedUsers)) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const roles = db.prepare(`
    SELECT u.username, h.name AS house, uhr.role
    FROM user_house_roles uhr
    JOIN users u ON u.id = uhr.user_id
    JOIN houses h ON h.id = uhr.house_id
    ORDER BY u.username, h.name, uhr.role
  `).all();
  const expectedRoles = [
    { username: combinedUsername, house: EXPECTED.houseAName, role: 'house_admin' },
    { username: FIXTURE.houseAdminUsername, house: EXPECTED.houseAName, role: 'house_admin' }
  ].sort((a, b) => a.username.localeCompare(b.username));
  if (!sameRows(roles, expectedRoles)) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const resources = db.prepare(`
    SELECT r.id, r.name, r.type, h.name AS house, r.active
    FROM resources r JOIN houses h ON h.id = r.house_id
    ORDER BY r.name
  `).all();
  const expectedResources = FIXTURE.resources.map((resource) => ({
    name: resource.name,
    type: resource.type,
    house: resource.house === 'a' ? EXPECTED.houseAName : FIXTURE.houseBName,
    active: 1
  })).sort((a, b) => a.name.localeCompare(b.name));
  if (!sameRows(resources.map(({ id, ...resource }) => resource), expectedResources)) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const usersByName = new Map(db.prepare('SELECT id, username FROM users').all().map((row) => [row.username, row.id]));
  const resourcesByName = new Map(resources.map((row) => [row.name, row.id]));
  const registry = db.prepare(`
    SELECT object_type, object_key, object_id
    FROM agent_test_fixture_objects ORDER BY object_type, object_key
  `).all();
  const expectedRegistry = [
    { object_type: 'house', object_key: 'house-b', object_id: houseB.id },
    { object_type: 'apartment', object_key: 'house-a-apartment', object_id: apartment.id },
    { object_type: 'user', object_key: 'resident', object_id: usersByName.get(FIXTURE.residentUsername) },
    { object_type: 'user', object_key: 'houseadmin', object_id: usersByName.get(FIXTURE.houseAdminUsername) },
    { object_type: 'user', object_key: 'superadmin', object_id: usersByName.get(FIXTURE.superadminUsername) },
    ...FIXTURE.resources.map((resource) => ({
      object_type: 'resource', object_key: resource.key, object_id: resourcesByName.get(resource.name)
    }))
  ].sort((a, b) => `${a.object_type}:${a.object_key}`.localeCompare(`${b.object_type}:${b.object_key}`));
  if (!sameRows(registry, expectedRegistry)) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  const states = db.prepare('SELECT fixture_key, fixture_version FROM agent_test_fixture_state').all();
  const sink = db.prepare('SELECT event_key, status FROM agent_test_fixture_sink ORDER BY event_key').all();
  if (!sameRows(states, [{ fixture_key: 'baseline', fixture_version: FIXTURE_VERSION }])
      || !sameRows(sink, [{ event_key: 'baseline.ready', status: 'simulated' }])) {
    throw fixtureError('AGENT_TEST_FIXTURE_GLOBAL_STATE_INVALID');
  }

  return {
    houses: counts.houses,
    accounts: counts.users,
    resources: counts.resources,
    apartments: counts.apartments,
    sessions: counts.sessions,
    residents: users.filter((user) => user.role === 'user').length,
    houseAdmins: roles.length,
    superadmins: users.filter((user) => user.is_superadmin === 1).length
  };
}

function fixtureCanNoop(db, bcrypt, env, combinedUsername) {
  const state = db.prepare(`
    SELECT fixture_version FROM agent_test_fixture_state WHERE fixture_key = 'baseline'
  `).get();
  if (state?.fixture_version !== FIXTURE_VERSION) return false;
  if (db.prepare('SELECT COUNT(*) AS count FROM agent_test_fixture_state').get().count !== 1) return false;
  if (db.prepare('SELECT COUNT(*) AS count FROM agent_test_fixture_sink').get().count !== 1) return false;
  if (db.prepare(`
    SELECT COUNT(*) AS count FROM agent_test_fixture_sink
    WHERE event_key = 'baseline.ready' AND status = 'simulated'
  `).get().count !== 1) return false;

  const objects = db.prepare(`
    SELECT object_type, object_key, object_id
    FROM agent_test_fixture_objects ORDER BY object_type, object_key
  `).all();
  if (objects.length !== 10) return false;
  const objectId = (type, key) => Number(objects.find((row) => (
    row.object_type === type && row.object_key === key
  ))?.object_id || 0);
  const houseBId = objectId('house', 'house-b');
  const apartmentId = objectId('apartment', 'house-a-apartment');
  if (!houseBId || !apartmentId) return false;

  const houseA = db.prepare('SELECT id FROM houses WHERE name = ? AND active = 1').all(EXPECTED.houseAName);
  if (houseA.length !== 1) return false;
  const houseB = db.prepare('SELECT name, code, active FROM houses WHERE id = ?').get(houseBId);
  if (!houseB || houseB.name !== FIXTURE.houseBName || houseB.code !== FIXTURE.houseBCode || houseB.active !== 1) return false;
  const apartment = db.prepare(`
    SELECT house_id, label, display_name, active FROM apartments WHERE id = ?
  `).get(apartmentId);
  if (!apartment || Number(apartment.house_id) !== Number(houseA[0].id)
      || apartment.label !== FIXTURE.apartmentLabel || apartment.display_name !== FIXTURE.apartmentLabel
      || apartment.active !== 1) return false;

  const expectedUsers = [
    { key: 'resident', username: FIXTURE.residentUsername, role: 'user', houseId: houseA[0].id, apartmentId, superadmin: 0, password: env.AGENT_TEST_RESIDENT_PASSWORD },
    { key: 'houseadmin', username: FIXTURE.houseAdminUsername, role: 'admin', houseId: houseA[0].id, apartmentId: null, superadmin: 0, password: env.AGENT_TEST_HOUSEADMIN_PASSWORD },
    { key: 'superadmin', username: FIXTURE.superadminUsername, role: 'admin', houseId: null, apartmentId: null, superadmin: 1, password: env.AGENT_TEST_SUPERADMIN_PASSWORD }
  ];
  for (const expected of expectedUsers) {
    const id = objectId('user', expected.key);
    const user = db.prepare(`
      SELECT username, password_hash, role, house_id, apartment_id, is_superadmin, active,
             email, secondary_email, notify_releases
      FROM users WHERE id = ?
    `).get(id);
    if (!user || user.username !== expected.username || user.role !== expected.role
        || Number(user.house_id || 0) !== Number(expected.houseId || 0)
        || Number(user.apartment_id || 0) !== Number(expected.apartmentId || 0)
        || user.is_superadmin !== expected.superadmin || user.active !== 1
        || user.email !== null || user.secondary_email !== null || user.notify_releases !== 0
        || !bcrypt.compareSync(expected.password, user.password_hash)) return false;
    const roles = db.prepare('SELECT house_id, role FROM user_house_roles WHERE user_id = ?').all(id);
    if (expected.key === 'houseadmin') {
      if (roles.length !== 1 || Number(roles[0].house_id) !== Number(houseA[0].id) || roles[0].role !== 'house_admin') return false;
    } else if (roles.length !== 0) return false;
  }

  for (const resource of FIXTURE.resources) {
    const id = objectId('resource', resource.key);
    const row = db.prepare('SELECT name, type, house_id, active FROM resources WHERE id = ?').get(id);
    const expectedHouseId = resource.house === 'a' ? houseA[0].id : houseBId;
    if (!row || row.name !== resource.name || row.type !== resource.type
        || Number(row.house_id) !== Number(expectedHouseId) || row.active !== 1) return false;
  }

  const userIds = registeredIds(db, 'user');
  const resourceIds = registeredIds(db, 'resource');
  const dependentCase = db.prepare(`
    SELECT 1 FROM maintenance_cases
    WHERE house_id = ? OR resource_id IN (${placeholders(resourceIds)}) OR reported_by IN (${placeholders(userIds)})
    LIMIT 1
  `).get(houseBId, ...resourceIds, ...userIds);
  if (dependentCase) return false;
  if (db.prepare(`SELECT 1 FROM audit_log WHERE user_id IN (${placeholders(userIds)}) LIMIT 1`).get(...userIds)) return false;
  if (db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count !== 0) return false;

  const combined = db.prepare(`
    SELECT u.id FROM users u
    JOIN user_house_roles uhr ON uhr.user_id = u.id AND uhr.house_id = ? AND uhr.role = 'house_admin'
    WHERE u.username = ? AND u.role = 'admin' AND u.is_superadmin = 1 AND u.active = 1
  `).all(houseA[0].id, combinedUsername);
  return combined.length === 1;
}

function rebuildAgentTestFixture({ db, bcrypt, env, gate }) {
  if (!gate || gate.enabled !== true) {
    return Object.freeze({ enabled: false, ready: false, code: 'FIXTURE_DISABLED' });
  }

  const result = db.transaction(() => {
    installFixtureTables(db);
    db.prepare('DELETE FROM sessions').run();

    const combinedUsername = String(env.SEED_ADMIN_NAME || '').trim();
    const combinedBefore = stableAccountSnapshot(db, combinedUsername);
    if (!combinedBefore) throw fixtureError('AGENT_TEST_FIXTURE_COMBINED_ACCOUNT_MISSING');

    if (fixtureCanNoop(db, bcrypt, env, combinedUsername)) {
      return fixtureResult(db, env, 'noop');
    }

    cleanupRegisteredFixture(db);

    const houseA = db.prepare(`
      SELECT id FROM houses WHERE name = ? AND active = 1
    `).all(EXPECTED.houseAName);
    if (houseA.length !== 1) throw fixtureError('AGENT_TEST_FIXTURE_HOUSE_A_INVALID');

    const combined = db.prepare(`
      SELECT u.id
      FROM users u
      JOIN user_house_roles uhr
        ON uhr.user_id = u.id AND uhr.house_id = ? AND uhr.role = 'house_admin'
      WHERE u.username = ? AND u.role = 'admin' AND u.is_superadmin = 1 AND u.active = 1
    `).all(houseA[0].id, combinedUsername);
    if (combined.length !== 1) throw fixtureError('AGENT_TEST_FIXTURE_COMBINED_ACCOUNT_INVALID');

    const fixtureUsernames = [
      FIXTURE.residentUsername,
      FIXTURE.houseAdminUsername,
      FIXTURE.superadminUsername
    ];
    const collisions = db.prepare(`
      SELECT COUNT(*) AS count FROM users WHERE username IN (?, ?, ?)
    `).get(...fixtureUsernames).count;
    if (collisions !== 0) throw fixtureError('AGENT_TEST_FIXTURE_ACCOUNT_COLLISION');
    if (db.prepare('SELECT COUNT(*) AS count FROM houses WHERE name = ?').get(FIXTURE.houseBName).count !== 0) {
      throw fixtureError('AGENT_TEST_FIXTURE_HOUSE_COLLISION');
    }

    const houseBId = Number(db.prepare('INSERT INTO houses (name, code) VALUES (?, ?)')
      .run(FIXTURE.houseBName, FIXTURE.houseBCode).lastInsertRowid);
    registerObject(db, 'house', 'house-b', houseBId);

    const apartmentId = Number(db.prepare(`
      INSERT INTO apartments (house_id, label, display_name, active)
      VALUES (?, ?, ?, 1)
    `).run(houseA[0].id, FIXTURE.apartmentLabel, FIXTURE.apartmentLabel).lastInsertRowid);
    registerObject(db, 'apartment', 'house-a-apartment', apartmentId);

    const residentId = insertFixtureUser(db, bcrypt, {
      username: FIXTURE.residentUsername,
      password: env.AGENT_TEST_RESIDENT_PASSWORD,
      role: FIXTURE_ROLE_MATRIX.resident.role,
      houseId: houseA[0].id,
      apartmentId
    });
    const houseAdminId = insertFixtureUser(db, bcrypt, {
      username: FIXTURE.houseAdminUsername,
      password: env.AGENT_TEST_HOUSEADMIN_PASSWORD,
      role: FIXTURE_ROLE_MATRIX.houseAdmin.role,
      houseId: houseA[0].id
    });
    const superadminId = insertFixtureUser(db, bcrypt, {
      username: FIXTURE.superadminUsername,
      password: env.AGENT_TEST_SUPERADMIN_PASSWORD,
      role: FIXTURE_ROLE_MATRIX.superadmin.role,
      houseId: null,
      superadmin: FIXTURE_ROLE_MATRIX.superadmin.superadmin
    });
    registerObject(db, 'user', 'resident', residentId);
    registerObject(db, 'user', 'houseadmin', houseAdminId);
    registerObject(db, 'user', 'superadmin', superadminId);
    db.prepare(`
      INSERT INTO user_house_roles (user_id, house_id, role, granted_by)
      VALUES (?, ?, 'house_admin', NULL)
    `).run(houseAdminId, houseA[0].id);

    for (const resource of FIXTURE.resources) {
      const houseId = resource.house === 'a' ? houseA[0].id : houseBId;
      const resourceId = Number(db.prepare(`
        INSERT INTO resources (name, type, house_id, active) VALUES (?, ?, ?, 1)
      `).run(resource.name, resource.type, houseId).lastInsertRowid);
      registerObject(db, 'resource', resource.key, resourceId);
    }

    db.prepare(`
      INSERT INTO agent_test_fixture_state (fixture_key, fixture_version)
      VALUES ('baseline', ?)
    `).run(FIXTURE_VERSION);
    db.prepare(`
      INSERT INTO agent_test_fixture_sink (event_key, status)
      VALUES ('baseline.ready', 'simulated')
    `).run();

    if (stableAccountSnapshot(db, combinedUsername) !== combinedBefore) {
      throw fixtureError('AGENT_TEST_FIXTURE_COMBINED_ACCOUNT_CHANGED');
    }

    return fixtureResult(db, env);
  })();

  return Object.freeze(result);
}

function initializeDatabaseWithAgentTestFixture({
  db,
  bcrypt,
  env,
  gate,
  initDatabase,
  installServiceSchemas
}) {
  if (!gate || gate.enabled !== true) {
    initDatabase();
    installServiceSchemas();
    return Object.freeze({ enabled: false, ready: false, code: 'FIXTURE_DISABLED' });
  }
  return Object.freeze(db.transaction(() => {
    initDatabase();
    installServiceSchemas();
    return rebuildAgentTestFixture({ db, bcrypt, env, gate });
  })());
}

module.exports = {
  CREDENTIAL_FAILURE_BITS,
  EXPECTED,
  FIXTURE,
  FIXTURE_ROLE_MATRIX,
  FIXTURE_VERSION,
  createAgentTestProviderBoundary,
  evaluateAgentTestFixtureGate,
  initializeDatabaseWithAgentTestFixture,
  rebuildAgentTestFixture
};
