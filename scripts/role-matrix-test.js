const assert = require('assert/strict');
process.env.ALLOW_LEGACY_HOUSE_REGISTRATION = 'true';
process.env.ALLOW_TEST_INVITATION_LINK = 'true';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const port = 37000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `waschplan-roles-${process.pid}.sqlite`);
const output = [];

class ApiClient {
  constructor() {
    this.cookie = '';
  }

  async request(urlPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) headers.Cookie = this.cookie;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${baseUrl}${urlPath}`, { ...options, headers });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';', 1)[0];
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : Buffer.from(await response.arrayBuffer());
    return { response, body };
  }
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function futureMonday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const distance = ((1 - date.getDay() + 7) % 7) || 7;
  date.setDate(date.getDate() + distance + 21);
  return dateString(date);
}

async function expectStatus(client, urlPath, status, options = {}) {
  const result = await client.request(urlPath, options);
  assert.equal(
    result.response.status,
    status,
    `${options.method || 'GET'} ${urlPath}: ${JSON.stringify(result.body)}`
  );
  return result;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Rollentestserver nicht erreichbar.\n${output.join('')}`);
}

async function verifyConfiguredSuperadminRecovery() {
  const recoveryPort = port + 1;
  const recoveryUrl = `http://127.0.0.1:${recoveryPort}`;
  const recoveryDatabasePath = path.join(os.tmpdir(), `waschplan-role-recovery-${process.pid}.sqlite`);
  const recoveryOutput = [];
  const initialPassword = 'Bestehender-Admin-2026!';
  const configuredPassword = 'Nicht-Ueberschreiben-2026!';

  function start(password, forcePasswordReset = false) {
    const child = spawn(process.execPath, ['server.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(recoveryPort),
        DB_PATH: recoveryDatabasePath,
        HOUSE_NAME: 'Recoveryhaus 18',
        HOUSE_CODE: 'Recoverycode 18',
        SEED_ADMIN_NAME: 'bestehender-admin',
        SEED_ADMIN_PASSWORD: password,
        SEED_ADMIN_FORCE_PASSWORD_RESET: forcePasswordReset ? 'true' : 'false',
        SESSION_SECRET: 'rollen-recovery-session-secret-at-least-32-characters',
        AUTO_BACKUP: 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => recoveryOutput.push(chunk.toString()));
    child.stderr.on('data', (chunk) => recoveryOutput.push(chunk.toString()));
    return child;
  }

  async function waitUntilReady() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const response = await fetch(`${recoveryUrl}/api/health`);
        if (response.ok) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Superadmin-Recovery-Testserver nicht erreichbar.\n${recoveryOutput.join('')}`);
  }

  async function stop(child) {
    if (child.exitCode === null) {
      child.kill();
      await new Promise((resolve) => child.once('exit', resolve));
    }
  }

  let child;
  try {
    child = start(initialPassword);
    await waitUntilReady();
    await stop(child);

    const database = new Database(recoveryDatabasePath);
    database.prepare(`
      UPDATE users
      SET role = 'user', active = 0, is_superadmin = 0
      WHERE username = 'bestehender-admin'
    `).run();
    database.close();

    child = start(configuredPassword);
    await waitUntilReady();

    const restoredLogin = await fetch(`${recoveryUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bestehender-admin', password: initialPassword })
    });
    assert.equal(restoredLogin.status, 200);
    const restored = await restoredLogin.json();
    assert.equal(restored.user.role, 'admin');
    assert.equal(restored.user.isSuperadmin, true);

    const overwrittenPasswordLogin = await fetch(`${recoveryUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bestehender-admin', password: configuredPassword })
    });
    assert.equal(overwrittenPasswordLogin.status, 401);

    await stop(child);
    child = start(configuredPassword, true);
    await waitUntilReady();

    const forcedPasswordLogin = await fetch(`${recoveryUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bestehender-admin', password: configuredPassword })
    });
    assert.equal(forcedPasswordLogin.status, 200);
  } finally {
    if (child) await stop(child);
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${recoveryDatabasePath}${suffix}`, { force: true });
    }
  }
}

async function register(client, { username, email, password, houseCode }) {
  return expectStatus(client, '/api/register', 201, {
    method: 'POST',
    body: JSON.stringify({ username, email, password, houseCode, notifyReleases: true })
  });
}

async function login(client, username, password) {
  return expectStatus(client, '/api/login', 200, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

async function run() {
  await verifyConfiguredSuperadminRecovery();

  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      HOUSE_NAME: 'Rollenhaus 18',
      HOUSE_CODE: 'Rollencode 18',
      SEED_ADMIN_NAME: 'rollen-superadmin',
      SEED_ADMIN_PASSWORD: 'Rollen-Superadmin-2026!',
      SESSION_SECRET: 'rollenmatrix-session-secret-at-least-32-characters',
      AUTO_BACKUP: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => output.push(chunk.toString()));
  server.stderr.on('data', (chunk) => output.push(chunk.toString()));

  try {
    await waitForServer();

    const superadmin = new ApiClient();
    const superLogin = await login(superadmin, 'rollen-superadmin', 'Rollen-Superadmin-2026!');
    assert.equal(superLogin.body.user.role, 'admin');
    assert.equal(superLogin.body.user.isSuperadmin, true);

    const firstHouse = await expectStatus(superadmin, '/api/admin/houses', 200);
    const firstHouseId = firstHouse.body.activeHouseId;
    const firstHouseResources = await expectStatus(superadmin, '/api/resources', 200);
    const firstWasher = firstHouseResources.body.resources.find((resource) => resource.type === 'washer');

    const firstResident = new ApiClient();
    const firstResidentRegistration = await register(firstResident, {
      username: 'Rollen Bewohner Haus 18',
      email: 'rollen-18@example.test',
      password: 'Rollen-Bewohner18!',
      houseCode: 'Rollencode 18'
    });
    const firstHouseBooking = await expectStatus(firstResident, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: firstWasher.id,
        date: futureMonday(),
        slot: '07:00-12:00'
      })
    });
    const firstHouseIssue = await expectStatus(firstResident, '/api/maintenance-cases', 201, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: firstWasher.id,
        title: 'Rollenpruefung Haus 18',
        description: 'Bewohnermeldung aus dem ersten Haus.'
      })
    });

    const secondHouse = await expectStatus(superadmin, '/api/admin/houses', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Rollenhaus 20', code: 'Rollencode 20' })
    });
    const secondHouseId = secondHouse.body.house.id;

    const houseAdminRegistrationClient = new ApiClient();
    const houseAdminRegistration = await register(houseAdminRegistrationClient, {
      username: 'Rollen Hausadmin',
      email: 'rollen-admin@example.test',
      password: 'Rollen-Hausadmin-2026!',
      houseCode: 'Rollencode 20'
    });
    const peerAdminRegistrationClient = new ApiClient();
    const peerAdminRegistration = await register(peerAdminRegistrationClient, {
      username: 'Rollen Zweitadmin',
      email: 'rollen-zweitadmin@example.test',
      password: 'Rollen-Zweitadmin-2026!',
      houseCode: 'Rollencode 20'
    });
    const resident = new ApiClient();
    const residentRegistration = await register(resident, {
      username: 'Rollen Bewohner Haus 20',
      email: 'rollen-20@example.test',
      password: 'Rollen-Bewohner20!',
      houseCode: 'Rollencode 20'
    });

    await expectStatus(superadmin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: secondHouseId })
    });
    await expectStatus(superadmin, `/api/admin/users/${houseAdminRegistration.body.user.id}/role`, 200, {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' })
    });
    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/role`, 200, {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' })
    });

    const houseAdmin = new ApiClient();
    const houseAdminLogin = await login(houseAdmin, 'Rollen Hausadmin', 'Rollen-Hausadmin-2026!');
    assert.equal(houseAdminLogin.body.user.role, 'admin');
    assert.equal(houseAdminLogin.body.user.isSuperadmin, false);
    assert.equal(houseAdminLogin.body.user.houseId, secondHouseId);

    for (const route of [
      '/api/admin/users',
      '/api/admin/overview',
      '/api/admin/settings',
      '/api/admin/resources',
      '/api/admin/maintenance-cases',
      '/api/admin/apartments',
      '/api/admin/fixed-bookings',
      '/api/admin/audit-log'
    ]) {
      await expectStatus(houseAdmin, route, 200);
    }
    const apartment = await expectStatus(houseAdmin, '/api/admin/apartments', 201, {
      method: 'POST',
      body: JSON.stringify({ label: 'Rollen 2. OG links', displayName: 'Rollenfamilie Sieben' })
    });
    assert.ok(apartment.body.activationCode);
    await expectStatus(houseAdmin, `/api/admin/apartments/${apartment.body.apartment.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ displayName: 'Rollenfamilie 7 aktualisiert' })
    });
    const renewedApartmentCode = await expectStatus(houseAdmin, `/api/admin/apartments/${apartment.body.apartment.id}/new-code`, 200, {
      method: 'POST'
    });
    await expectStatus(resident, '/api/me/apartment/claim', 200, {
      method: 'POST',
      body: JSON.stringify({ apartmentCode: renewedApartmentCode.body.activationCode })
    });
    await expectStatus(houseAdmin, `/api/admin/apartments/${apartment.body.apartment.id}`, 403, {
      method: 'PUT',
      body: JSON.stringify({
        displayName: 'Rollenfamilie 7 aktualisiert',
        email: 'hausadmin-uebernahme@example.test'
      })
    });
    const invitedApartment = await expectStatus(houseAdmin, '/api/admin/apartments', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Rollen 3. OG rechts',
        displayName: 'Rollenfamilie Einladung',
        email: 'rollen-einladung@example.test'
      })
    });
    assert.match(invitedApartment.body.invitationLink, /invite=[a-f0-9]{64}$/);
    assert.equal(invitedApartment.body.invitation.email, 'rollen-einladung@example.test');
    const renewedInvitation = await expectStatus(
      houseAdmin,
      `/api/admin/apartments/${invitedApartment.body.apartment.id}/invitation`,
      200,
      {
        method: 'POST',
        body: JSON.stringify({ email: 'rollen-einladung@example.test' })
      }
    );
    assert.notEqual(renewedInvitation.body.invitationLink, invitedApartment.body.invitationLink);
    const firstInvitationToken = new URL(invitedApartment.body.invitationLink).searchParams.get('invite');
    const renewedInvitationToken = new URL(renewedInvitation.body.invitationLink).searchParams.get('invite');
    await expectStatus(new ApiClient(), `/api/invitations/${firstInvitationToken}`, 404);
    await expectStatus(new ApiClient(), `/api/invitations/${renewedInvitationToken}`, 200);
    await expectStatus(resident, `/api/admin/apartments/${invitedApartment.body.apartment.id}/invitation`, 403, {
      method: 'POST',
      body: JSON.stringify({ email: 'angriff@example.test' })
    });
    await expectStatus(houseAdmin, '/api/me/device-code', 403, { method: 'POST' });

    const dualRoleApartment = await expectStatus(houseAdmin, '/api/admin/apartments', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Rollen Hauswartwohnung',
        displayName: 'Familie Hausadmin',
        email: 'rollen-admin@example.test'
      })
    });
    const dualRoleToken = new URL(dualRoleApartment.body.invitationLink).searchParams.get('invite');
    const dualRoleIdentity = new ApiClient();
    const dualRoleAcceptance = await expectStatus(dualRoleIdentity, '/api/invitations/accept', 201, {
      method: 'POST',
      body: JSON.stringify({
        token: dualRoleToken,
        password: 'Rollen-Hausadmin-2026!',
        notifyReleases: true
      })
    });
    assert.equal(dualRoleAcceptance.body.user.id, houseAdminRegistration.body.user.id);
    assert.deepEqual(dualRoleAcceptance.body.user.roles, ['resident', 'house_admin']);
    assert.equal(dualRoleAcceptance.body.user.canBook, true);
    assert.equal(dualRoleAcceptance.body.user.canManage, true);
    await expectStatus(dualRoleIdentity, '/api/admin/resources', 200);

    const dualRoleResources = await expectStatus(dualRoleIdentity, '/api/resources', 200);
    const dualRoleWasher = dualRoleResources.body.resources.find((resource) => resource.type === 'washer');
    const dualRoleBooking = await expectStatus(dualRoleIdentity, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: dualRoleWasher.id,
        date: futureMonday(),
        slot: '17:00-21:00'
      })
    });
    const residentQr = await expectStatus(dualRoleIdentity, '/api/me/device-code', 201, { method: 'POST' });
    const partnerIdentity = new ApiClient();
    const partnerAcceptance = await expectStatus(partnerIdentity, '/api/device-login', 200, {
      method: 'POST',
      body: JSON.stringify({
        deviceCode: residentQr.body.code,
        email: 'rollen-partner@example.test',
        password: 'Rollen-Partner-2026!',
        passwordConfirmation: 'Rollen-Partner-2026!'
      })
    });
    assert.notEqual(partnerAcceptance.body.user.id, dualRoleAcceptance.body.user.id);
    assert.deepEqual(partnerAcceptance.body.user.roles, ['resident']);
    assert.equal(partnerAcceptance.body.user.canManage, false);
    assert.equal(partnerAcceptance.body.user.bookingUserId, dualRoleAcceptance.body.user.bookingUserId);
    await expectStatus(partnerIdentity, '/api/admin/resources', 403);
    const sharedBookings = await expectStatus(partnerIdentity, '/api/my-bookings', 200);
    assert.ok(sharedBookings.body.bookings.some((booking) => booking.id === dualRoleBooking.body.id));
    const nextWashDate = new Date(`${futureMonday()}T12:00:00`);
    nextWashDate.setDate(nextWashDate.getDate() + 7);
    await expectStatus(partnerIdentity, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: dualRoleWasher.id,
        date: dateString(nextWashDate),
        slot: '17:00-21:00'
      })
    });

    await expectStatus(houseAdmin, '/api/admin/settings/house-code', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseCode: 'Rollencode 20 neu' })
    });
    const createdResource = await expectStatus(houseAdmin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Rollen Trockenraum Reserve', type: 'drying_room' })
    });
    const secondHouseIssue = await expectStatus(resident, '/api/maintenance-cases', 201, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: createdResource.body.id,
        title: 'Rollenpruefung Haus 20',
        description: 'Bewohnermeldung aus dem zweiten Haus.'
      })
    });
    const houseAdminCases = await expectStatus(houseAdmin, '/api/admin/maintenance-cases', 200);
    assert.ok(houseAdminCases.body.cases.some((item) => item.id === secondHouseIssue.body.id));
    assert.ok(!houseAdminCases.body.cases.some((item) => item.id === firstHouseIssue.body.id));
    await expectStatus(houseAdmin, `/api/admin/maintenance-cases/${firstHouseIssue.body.id}/actions`, 404, {
      method: 'POST',
      body: JSON.stringify({ action: 'note', note: 'Fremdes Haus darf nicht bearbeitet werden.' })
    });
    await expectStatus(houseAdmin, `/api/admin/maintenance-cases/${secondHouseIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'block', note: 'Haus-Admin sperrt nach Pruefung.' })
    });
    await expectStatus(houseAdmin, `/api/admin/maintenance-cases/${secondHouseIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'repair', note: 'Haus-Admin dokumentiert die Reparatur.' })
    });
    await expectStatus(houseAdmin, `/api/admin/maintenance-cases/${secondHouseIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'test', successful: true, note: 'Haus-Admin bestaetigt den Probelauf.' })
    });
    await expectStatus(houseAdmin, `/api/admin/maintenance-cases/${secondHouseIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'release', note: 'Reparatur abgeschlossen und Probelauf erfolgreich.' })
    });
    const superadminCases = await expectStatus(superadmin, '/api/admin/maintenance-cases', 200);
    assert.ok(superadminCases.body.cases.some((item) => item.id === firstHouseIssue.body.id));
    assert.ok(superadminCases.body.cases.some((item) => item.id === secondHouseIssue.body.id));
    await expectStatus(superadmin, `/api/admin/maintenance-cases/${firstHouseIssue.body.id}/actions`, 200, {
      method: 'POST',
      body: JSON.stringify({ action: 'note', note: 'Hausuebergreifende Sicht und Bedarfseingriff bestaetigt.' })
    });

    const secondResources = await expectStatus(houseAdmin, '/api/resources', 200);
    const secondWasher = secondResources.body.resources.find((resource) => resource.type === 'washer');
    const adminOnly = new ApiClient();
    await login(adminOnly, 'Rollen Zweitadmin', 'Rollen-Zweitadmin-2026!');
    const forbiddenAdminBooking = {
      resourceId: secondWasher.id,
      date: futureMonday(),
      slot: '17:00-21:00'
    };
    await expectStatus(adminOnly, '/api/bookings', 403, {
      method: 'POST',
      body: JSON.stringify(forbiddenAdminBooking)
    });
    await expectStatus(adminOnly, '/api/booking-package', 403, {
      method: 'POST',
      body: JSON.stringify({ items: [forbiddenAdminBooking] })
    });
    await expectStatus(superadmin, '/api/bookings', 403, {
      method: 'POST',
      body: JSON.stringify(forbiddenAdminBooking)
    });
    await expectStatus(superadmin, '/api/booking-package', 403, {
      method: 'POST',
      body: JSON.stringify({ items: [forbiddenAdminBooking] })
    });
    const fixedBooking = await expectStatus(houseAdmin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Rollen Dauertermin',
        resourceId: secondWasher.id,
        weekday: 3,
        slot: '12:00-17:00'
      })
    });
    await expectStatus(houseAdmin, `/api/admin/fixed-bookings/${fixedBooking.body.id}`, 200, {
      method: 'DELETE'
    });

    await expectStatus(houseAdmin, `/api/admin/users/${residentRegistration.body.user.id}/status`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(houseAdmin, `/api/admin/users/${residentRegistration.body.user.id}/status`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: true })
    });
    await expectStatus(houseAdmin, `/api/admin/users/${residentRegistration.body.user.id}/password`, 404, {
      method: 'PUT',
      body: JSON.stringify({ newPassword: 'Rollen-Bewohner20-Neu!' })
    });
    await expectStatus(houseAdmin, `/api/admin/users/${residentRegistration.body.user.id}/password-reset`, 409, {
      method: 'POST'
    });

    await expectStatus(houseAdmin, `/api/admin/users/${firstResidentRegistration.body.user.id}/recovery-code`, 404, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'KONTO WIEDERHERSTELLEN' })
    });
    const residentRecovery = await expectStatus(
      houseAdmin,
      `/api/admin/users/${residentRegistration.body.user.id}/recovery-code`,
      201,
      {
        method: 'POST',
        body: JSON.stringify({ confirm: 'KONTO WIEDERHERSTELLEN' })
      }
    );
    await expectStatus(new ApiClient(), '/api/account-recovery/confirm', 200, {
      method: 'POST',
      body: JSON.stringify({
        code: residentRecovery.body.code,
        email: 'rollen-20-neu@example.test',
        newPassword: 'Rollen-Bewohner20-Neu!'
      })
    });

    const residentAfterReset = new ApiClient();
    await login(residentAfterReset, 'rollen-20-neu@example.test', 'Rollen-Bewohner20-Neu!');
    const recoveredResident = await expectStatus(residentAfterReset, '/api/me', 200);
    assert.equal(recoveredResident.body.user.apartmentLabel, 'Rollen 2. OG links');
    const residentBooking = await expectStatus(residentAfterReset, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: secondWasher.id,
        date: futureMonday(),
        slot: '12:00-17:00'
      })
    });
    await expectStatus(houseAdmin, `/api/bookings/${residentBooking.body.id}`, 200, { method: 'DELETE' });

    await expectStatus(houseAdmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/status`, 403, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(houseAdmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/password-reset`, 403, {
      method: 'POST'
    });
    await expectStatus(houseAdmin, `/api/admin/users/${houseAdminRegistration.body.user.id}/password-reset`, 400, {
      method: 'POST'
    });

    await expectStatus(houseAdmin, '/api/admin/houses', 403);
    await expectStatus(houseAdmin, '/api/admin/backup', 403);
    await expectStatus(houseAdmin, '/api/admin/backup/run', 403, { method: 'POST' });
    await expectStatus(houseAdmin, '/api/admin/maintenance', 403);
    await expectStatus(houseAdmin, '/api/admin/maintenance', 403, {
      method: 'PUT',
      body: JSON.stringify({ active: true })
    });
    await expectStatus(houseAdmin, '/api/me/active-house', 403, {
      method: 'PUT',
      body: JSON.stringify({ houseId: firstHouseId })
    });
    await expectStatus(houseAdmin, `/api/admin/users/${residentRegistration.body.user.id}/role`, 403, {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' })
    });
    await expectStatus(houseAdmin, `/api/admin/users/${residentRegistration.body.user.id}/house`, 403, {
      method: 'PUT',
      body: JSON.stringify({ houseId: firstHouseId })
    });
    await expectStatus(houseAdmin, `/api/admin/resources/${firstWasher.id}`, 404, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(houseAdmin, `/api/bookings/${firstHouseBooking.body.id}`, 404, { method: 'DELETE' });

    const residentDeniedRoutes = [
      ['/api/admin/users', 'GET'],
      ['/api/admin/overview', 'GET'],
      ['/api/admin/analytics', 'GET'],
      ['/api/admin/settings', 'GET'],
      ['/api/admin/resources', 'GET'],
      ['/api/admin/maintenance-cases', 'GET'],
      ['/api/admin/apartments', 'GET'],
      ['/api/admin/fixed-bookings', 'GET'],
      ['/api/admin/audit-log', 'GET'],
      ['/api/admin/push-devices', 'GET'],
      ['/api/admin/houses', 'GET'],
      ['/api/admin/backup', 'GET'],
      ['/api/admin/email-test', 'POST'],
      ['/api/admin/push-test', 'POST'],
      ['/api/admin/recovery-status', 'GET'],
      [`/api/admin/users/${peerAdminRegistration.body.user.id}/superadmin`, 'PUT'],
      ['/api/admin/bookings', 'DELETE'],
      ['/api/admin/pilot-accounts', 'DELETE'],
      ['/api/admin/backup/run', 'POST'],
      ['/api/admin/maintenance', 'GET'],
      ['/api/admin/maintenance', 'PUT'],
      [`/api/admin/users/${residentRegistration.body.user.id}/recovery-code`, 'POST']
    ];
    for (const [route, method] of residentDeniedRoutes) {
      await expectStatus(residentAfterReset, route, 403, { method });
    }
    await expectStatus(residentAfterReset, '/api/calendar?from=' + futureMonday() + '&days=7', 200);
    await expectStatus(residentAfterReset, '/api/recommendation', 200);
    await expectStatus(residentAfterReset, `/api/admin/apartments/${apartment.body.apartment.id}`, 403, {
      method: 'PUT',
      body: JSON.stringify({ displayName: 'Nicht erlaubt' })
    });

    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/password-reset`, 409, {
      method: 'POST'
    });
    const peerAdmin = new ApiClient();
    await login(peerAdmin, 'Rollen Zweitadmin', 'Rollen-Zweitadmin-2026!');

    const moduleAnswer = (module) => {
      if (module.type === 'wire') return { choice: module.options.find((option) => option.symbol === module.targetSymbol).id };
      if (module.type === 'signal') return { sequence: module.sequence };
      if (module.type === 'valve') return { position: (module.safeStart + module.safeEnd) / 2 };
      if (module.type === 'code') return { code: module.codeSymbols.map((symbol) => module.decoder[symbol]).join('') };
      if (module.type === 'temperature') return { value: module.target };
      if (module.type === 'leak') return { zone: module.revealZone };
      if (module.type === 'circuit') return { path: module.path };
      if (module.type === 'locks') return { positions: module.targets };
      throw new Error(`Unbekanntes Windel-Alarm-Modul: ${module.type}`);
    };
    const solveModules = async (client, round) => {
      for (const [moduleIndex, module] of round.body.modules.entries()) {
        const action = await expectStatus(client, '/api/diaper-game/action', 200, {
          method: 'POST',
          body: JSON.stringify({ token: round.body.token, moduleIndex, answer: moduleAnswer(module) })
        });
        assert.equal(action.body.correct, true);
        assert.equal(action.body.progress, moduleIndex + 1);
      }
    };
    const playScoredRound = async (client, delayMs) => {
      const round = await expectStatus(client, '/api/diaper-game/start', 201, {
        method: 'POST',
        body: JSON.stringify({ mode: 'ranked' })
      });
      assert.match(round.body.token, /^[a-f0-9]{64}$/);
      assert.equal(round.body.gameVersion, 4);
      assert.equal(round.body.roundMs, 60000);
      assert.equal(round.body.modules.length, 4);
      assert.equal(new Set(round.body.modules.map((module) => module.type)).size, 4);
      assert.ok(['baby-kick', 'blackout', 'pressure-surge', 'scanner-fog'].includes(round.body.incident.type));
      assert.ok([1, 2].includes(round.body.incident.afterModule));
      await solveModules(client, round);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return expectStatus(client, '/api/diaper-game/complete', 200, {
        method: 'POST',
        body: JSON.stringify({ token: round.body.token, holdMs: 1100 })
      });
    };
    await expectStatus(new ApiClient(), '/api/diaper-game/leaderboard', 401);
    await playScoredRound(firstResident, 2600);
    const globalGameScores = await playScoredRound(residentAfterReset, 2650);
    assert.equal(globalGameScores.body.gameVersion, 4);
    assert.equal(globalGameScores.body.leaderboard.length, 2);
    assert.ok(globalGameScores.body.leaderboard.every((entry) => /^Wickelprofi #\d+$/.test(entry.player)));
    assert.equal(globalGameScores.body.own.isOwn, true);
    assert.ok(globalGameScores.body.own.position >= 1);
    assert.equal((await expectStatus(houseAdmin, '/api/diaper-game/leaderboard', 200)).body.leaderboard.length, 2);
    assert.equal((await expectStatus(superadmin, '/api/diaper-game/leaderboard', 200)).body.leaderboard.length, 2);
    const practiceRound = await expectStatus(houseAdmin, '/api/diaper-game/start', 201, {
      method: 'POST',
      body: JSON.stringify({ mode: 'practice' })
    });
    assert.equal(practiceRound.body.mode, 'practice');
    const practiceModule = practiceRound.body.modules[0];
    for (let mistake = 1; mistake <= 3; mistake += 1) {
      const failedAction = await expectStatus(houseAdmin, '/api/diaper-game/action', 200, {
        method: 'POST',
        body: JSON.stringify({
          token: practiceRound.body.token,
          moduleIndex: 0,
          answer: practiceModule.type === 'temperature' ? { value: 9999 } : { invalid: true }
        })
      });
      assert.equal(failedAction.body.correct, false);
      assert.equal(failedAction.body.mistakes, mistake);
      assert.equal(failedAction.body.failed, mistake === 3);
    }
    await expectStatus(houseAdmin, '/api/diaper-game/action', 409, {
      method: 'POST',
      body: JSON.stringify({ token: practiceRound.body.token, moduleIndex: 0, answer: moduleAnswer(practiceModule) })
    });
    assert.equal((await expectStatus(houseAdmin, '/api/diaper-game/leaderboard', 200)).body.own, null);
    await expectStatus(residentAfterReset, '/api/diaper-game/complete', 409, {
      method: 'POST',
      body: JSON.stringify({ token: globalGameScores.body.token || '0'.repeat(64) })
    });
    const scoreDeleted = await expectStatus(residentAfterReset, '/api/diaper-game/score', 200, { method: 'DELETE' });
    assert.equal(scoreDeleted.body.own, null);
    assert.equal(scoreDeleted.body.leaderboard.length, 1);

    const globalAudit = await expectStatus(superadmin, '/api/admin/audit-log', 200);
    assert.ok(globalAudit.body.entries.some((entry) => entry.action === 'resource.create'));
    const backup = await expectStatus(superadmin, '/api/admin/backup/run', 200, { method: 'POST' });
    assert.equal(backup.body.status.ok, true);
    await expectStatus(houseAdmin, '/api/admin/bookings', 403, {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: 'ALLE BUCHUNGEN',
        currentPassword: 'falsches-passwort'
      })
    });
    await expectStatus(houseAdmin, '/api/admin/bookings', 200, {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: 'ALLE BUCHUNGEN',
        currentPassword: 'Rollen-Hausadmin-2026!'
      })
    });
    await expectStatus(superadmin, '/api/admin/maintenance', 403, {
      method: 'PUT',
      body: JSON.stringify({
        active: true,
        currentPassword: 'falsches-passwort'
      })
    });
    const maintenanceStarted = await expectStatus(superadmin, '/api/admin/maintenance', 200, {
      method: 'PUT',
      body: JSON.stringify({
        active: true,
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    assert.equal(maintenanceStarted.body.maintenance.active, true);
    await expectStatus(residentAfterReset, '/api/bookings', 503, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: secondWasher.id,
        date: futureMonday(),
        slot: '17:00-21:00'
      })
    });
    const maintenanceFinished = await expectStatus(superadmin, '/api/admin/maintenance', 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    assert.equal(maintenanceFinished.body.maintenance.active, false);
    assert.equal(maintenanceFinished.body.maintenance.lastCheck.bookingWrite, 'ok');

    const recoveryStatus = await expectStatus(superadmin, '/api/admin/recovery-status', 200);
    assert.equal(recoveryStatus.body.houseAdminCount, 2);
    assert.equal(recoveryStatus.body.superadminCount, 1);
    assert.equal(recoveryStatus.body.seedRecoveryConfigured, true);
    await expectStatus(houseAdmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/superadmin`, 403, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        confirm: 'SUPERADMINRECHT GEBEN',
        currentPassword: 'Rollen-Admin-2026!'
      })
    });
    await expectStatus(superadmin, `/api/admin/users/${residentRegistration.body.user.id}/superadmin`, 409, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        confirm: 'SUPERADMINRECHT GEBEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    await expectStatus(superadmin, `/api/admin/users/${firstResidentRegistration.body.user.id}/superadmin`, 404, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        confirm: 'SUPERADMINRECHT GEBEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/superadmin`, 400, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        confirm: 'SUPERADMINRECHT FALSCH',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/superadmin`, 403, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        confirm: 'SUPERADMINRECHT GEBEN',
        currentPassword: 'falsches-passwort'
      })
    });
    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/superadmin`, 200, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: true,
        confirm: 'SUPERADMINRECHT GEBEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    assert.equal((await expectStatus(superadmin, '/api/me', 200)).body.user.isSuperadmin, true);
    assert.equal((await expectStatus(peerAdmin, '/api/me', 200)).body.user, null);
    const grantedSuperadmin = new ApiClient();
    const grantedLogin = await login(grantedSuperadmin, 'Rollen Zweitadmin', 'Rollen-Zweitadmin-2026!');
    assert.equal(grantedLogin.body.user.isSuperadmin, true);
    await expectStatus(grantedSuperadmin, '/api/admin/houses', 200);
    const revokedBehindSession = new Database(databasePath);
    revokedBehindSession.prepare('UPDATE users SET is_superadmin = 0 WHERE id = ?')
      .run(peerAdminRegistration.body.user.id);
    revokedBehindSession.close();
    await expectStatus(grantedSuperadmin, '/api/admin/houses', 403);
    const restoredBehindSession = new Database(databasePath);
    restoredBehindSession.prepare('UPDATE users SET is_superadmin = 1 WHERE id = ?')
      .run(peerAdminRegistration.body.user.id);
    restoredBehindSession.close();
    await expectStatus(grantedSuperadmin, '/api/admin/houses', 200);
    const grantAudit = await expectStatus(superadmin, '/api/admin/audit-log', 200);
    assert.ok(grantAudit.body.entries.some((entry) => (
      entry.action === 'superadmin.grant'
        && Number(entry.target_id) === Number(peerAdminRegistration.body.user.id)
    )));
    assert.equal((await expectStatus(superadmin, '/api/admin/recovery-status', 200)).body.superadminCount, 2);
    await expectStatus(superadmin, `/api/admin/users/${superLogin.body.user.id}/superadmin`, 400, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: false,
        confirm: 'SUPERADMINRECHT ENTZIEHEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/superadmin`, 200, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: false,
        confirm: 'SUPERADMINRECHT ENTZIEHEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    assert.equal((await expectStatus(grantedSuperadmin, '/api/me', 200)).body.user, null);
    const revokeAudit = await expectStatus(superadmin, '/api/admin/audit-log', 200);
    assert.ok(revokeAudit.body.entries.some((entry) => (
      entry.action === 'superadmin.revoke'
        && Number(entry.target_id) === Number(peerAdminRegistration.body.user.id)
    )));
    const peerAfterRevoke = await login(peerAdmin, 'Rollen Zweitadmin', 'Rollen-Zweitadmin-2026!');
    assert.equal(peerAfterRevoke.body.user.isSuperadmin, false);
    await expectStatus(peerAdmin, '/api/admin/houses', 403);
    assert.equal((await expectStatus(superadmin, '/api/admin/recovery-status', 200)).body.superadminCount, 1);
    await expectStatus(superadmin, '/api/admin/superadmin-transfer', 404, {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: peerAdminRegistration.body.user.id,
        confirm: 'SUPERADMIN UEBERGEBEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });

    await expectStatus(houseAdmin, '/api/admin/pilot-accounts', 403, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'ALLE TESTKONTEN LOESCHEN' })
    });
    await expectStatus(superadmin, '/api/admin/pilot-accounts', 400, {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: 'falsch',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    await expectStatus(superadmin, '/api/admin/pilot-accounts', 403, {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: 'ALLE TESTKONTEN LOESCHEN',
        currentPassword: 'falsches-passwort'
      })
    });
    const pilotReset = await expectStatus(superadmin, '/api/admin/pilot-accounts', 200, {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: 'ALLE TESTKONTEN LOESCHEN',
        currentPassword: 'Rollen-Superadmin-2026!'
      })
    });
    assert.ok(pilotReset.body.deleted >= 4);
    assert.ok(pilotReset.body.residents >= 2);
    assert.ok(pilotReset.body.houseAdmins >= 2);
    assert.equal(pilotReset.body.backup.ok, true);
    const remainingAccounts = await expectStatus(superadmin, '/api/admin/users', 200);
    assert.deepEqual(remainingAccounts.body.users, []);
    assert.equal((await expectStatus(superadmin, '/api/me', 200)).body.user.isSuperadmin, true);

    const residentLogout = await expectStatus(residentAfterReset, '/api/logout', 200, { method: 'POST' });
    assert.match(residentLogout.response.headers.get('set-cookie') || '', /connect\.sid=;/);
    const residentSession = await expectStatus(residentAfterReset, '/api/me', 200);
    assert.equal(residentSession.body.user, null);

    const adminLogout = await expectStatus(houseAdmin, '/logout', 303, {
      method: 'POST',
      redirect: 'manual'
    });
    assert.equal(adminLogout.response.headers.get('location'), '/login.html?loggedOut=1');
    assert.equal((await expectStatus(houseAdmin, '/api/me', 200)).body.user, null);

    const superLogout = await expectStatus(superadmin, '/logout', 303, {
      method: 'POST',
      redirect: 'manual'
    });
    assert.equal(superLogout.response.headers.get('location'), '/login.html?loggedOut=1');
    assert.equal((await expectStatus(superadmin, '/api/me', 200)).body.user, null);

    console.log(JSON.stringify({
      ok: true,
      roles: ['Bewohner', 'Haus-Admin', 'Superadmin'],
      checks: {
        residentBoundaries: true,
        adminBookingBoundary: true,
        combinedResidentAdminRole: true,
        houseAdminOwnHouse: true,
        houseAdminPeerAdminProtection: true,
        superadminGlobalActions: true,
        additiveSuperadminPermission: true,
        legacySuperadminTransferRemoved: true,
        configuredAdminRecovery: true,
        crossHouseIsolation: true,
        maintenanceWorkflow: true,
        invitationOnboarding: true,
        residentOnlyQrPairing: true,
        personalMultiRoleIdentity: true,
        sharedApartmentBookingScope: true,
        qrNeverCopiesAdminRights: true,
        globalDiaperGameLeaderboard: true,
        pilotReset: true,
        roleSpecificLogout: true
      },
      users: {
        firstResident: firstResidentRegistration.body.user.id,
        houseAdmin: houseAdminRegistration.body.user.id,
        peerAdmin: peerAdminRegistration.body.user.id,
        secondResident: residentRegistration.body.user.id
      }
    }, null, 2));
  } finally {
    if (server.exitCode === null) {
      server.kill();
      await new Promise((resolve) => server.once('exit', resolve));
    }
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${databasePath}${suffix}`, { force: true });
    }
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  if (output.length) console.error(output.join(''));
  process.exitCode = 1;
});
