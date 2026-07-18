const assert = require('assert/strict');
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

  function start(password) {
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
      '/api/admin/fixed-bookings',
      '/api/admin/audit-log'
    ]) {
      await expectStatus(houseAdmin, route, 200);
    }

    await expectStatus(houseAdmin, '/api/admin/settings/house-code', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseCode: 'Rollencode 20 neu' })
    });
    const createdResource = await expectStatus(houseAdmin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Rollen Trockenraum Reserve', type: 'drying_room' })
    });
    await expectStatus(houseAdmin, `/api/admin/resources/${createdResource.body.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });

    const secondResources = await expectStatus(houseAdmin, '/api/resources', 200);
    const secondWasher = secondResources.body.resources.find((resource) => resource.type === 'washer');
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

    const residentAfterReset = new ApiClient();
    await login(residentAfterReset, 'Rollen Bewohner Haus 20', 'Rollen-Bewohner20!');
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
      ['/api/admin/fixed-bookings', 'GET'],
      ['/api/admin/audit-log', 'GET'],
      ['/api/admin/push-devices', 'GET'],
      ['/api/admin/houses', 'GET'],
      ['/api/admin/backup', 'GET'],
      ['/api/admin/email-test', 'POST'],
      ['/api/admin/push-test', 'POST'],
      ['/api/admin/bookings', 'DELETE'],
      ['/api/admin/backup/run', 'POST']
    ];
    for (const [route, method] of residentDeniedRoutes) {
      await expectStatus(residentAfterReset, route, 403, { method });
    }
    await expectStatus(residentAfterReset, '/api/calendar?from=' + futureMonday() + '&days=7', 200);
    await expectStatus(residentAfterReset, '/api/recommendation', 200);

    await expectStatus(superadmin, `/api/admin/users/${peerAdminRegistration.body.user.id}/password-reset`, 409, {
      method: 'POST'
    });
    const peerAdmin = new ApiClient();
    await login(peerAdmin, 'Rollen Zweitadmin', 'Rollen-Zweitadmin-2026!');

    const globalAudit = await expectStatus(superadmin, '/api/admin/audit-log', 200);
    assert.ok(globalAudit.body.entries.some((entry) => entry.action === 'resource.create'));
    const backup = await expectStatus(superadmin, '/api/admin/backup/run', 200, { method: 'POST' });
    assert.equal(backup.body.status.ok, true);

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
        houseAdminOwnHouse: true,
        houseAdminPeerAdminProtection: true,
        superadminGlobalActions: true,
        configuredAdminRecovery: true,
        crossHouseIsolation: true,
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
