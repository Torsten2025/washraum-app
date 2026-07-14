const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const port = 33000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `waschplan-test-${process.pid}.sqlite`);
const serverOutput = [];

class ApiClient {
  constructor() {
    this.cookie = '';
  }

  async request(urlPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) {
      headers.Cookie = this.cookie;
    }
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${baseUrl}${urlPath}`, { ...options, headers });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookie = setCookie.split(';', 1)[0];
    }
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

function nextWeekday(weekday) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const distance = ((weekday - date.getDay() + 7) % 7) || 7;
  date.setDate(date.getDate() + distance);
  return dateString(date);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateString(date);
}

async function expectStatus(client, urlPath, status, options = {}) {
  const result = await client.request(urlPath, options);
  assert.equal(result.response.status, status, `${options.method || 'GET'} ${urlPath}: ${JSON.stringify(result.body)}`);
  return result;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Testserver nicht erreichbar.\n${serverOutput.join('')}`);
}

async function verifyProductionRecoveryStartup() {
  const recoveryPort = port + 1;
  const recoveryDatabasePath = path.join(os.tmpdir(), `waschplan-recovery-${process.pid}.sqlite`);
  const recoveryOutput = [];
  const recoveryServer = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(recoveryPort),
      DB_PATH: recoveryDatabasePath,
      HOUSE_CODE: 'Recovery Test 18',
      SEED_ADMIN_PASSWORD: '',
      SESSION_SECRET: 'short'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  recoveryServer.stdout.on('data', (chunk) => recoveryOutput.push(chunk.toString()));
  recoveryServer.stderr.on('data', (chunk) => recoveryOutput.push(chunk.toString()));

  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${recoveryPort}/api/health`);
        if (response.ok) {
          const health = await response.json();
          assert.equal(health.adminReady, false);
          assert.ok(recoveryOutput.join('').includes('sicheres, zufaelliges Geheimnis'));
          return;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Produktions-Recovery-Start fehlgeschlagen.\n${recoveryOutput.join('')}`);
  } finally {
    if (recoveryServer.exitCode === null) {
      recoveryServer.kill();
      await new Promise((resolve) => recoveryServer.once('exit', resolve));
    }
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${recoveryDatabasePath}${suffix}`, { force: true });
    }
  }
}

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      HOUSE_CODE: 'Testhaus 18',
      SEED_ADMIN_NAME: 'admin',
      SEED_ADMIN_PASSWORD: 'Admin-Test-2026!',
      SESSION_SECRET: 'integration-test-session-secret-at-least-32-characters'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
  server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

  try {
    await waitForServer();
    const guest = new ApiClient();
    const user = new ApiClient();
    const admin = new ApiClient();
    const bookingDate = nextWeekday(1);
    const secondWashDate = addDays(bookingDate, 1);
    const fixedDate = nextWeekday(6);

    const health = await expectStatus(guest, '/api/health', 200);
    assert.equal(health.body.ok, true);
    assert.equal(health.body.storage, 'local');
    assert.equal(health.body.adminReady, true);
    assert.ok(health.response.headers.get('content-security-policy'));
    assert.equal(health.response.headers.get('x-content-type-options'), 'nosniff');
    await expectStatus(guest, `/api/bookings?date=${bookingDate}`, 401);

    await expectStatus(guest, '/api/register', 400, {
      method: 'POST',
      body: JSON.stringify({
        username: '<script>alert(1)</script>',
        email: 'bad-name@example.com',
        password: 'Bewohner-2026!',
        houseCode: 'Testhaus 18'
      })
    });

    const registration = await expectStatus(user, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Bewohner Test',
        email: 'bewohner-test@example.com',
        password: 'Bewohner-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: true
      })
    });
    assert.equal(registration.body.user.username, 'Bewohner Test');

    const resourcesResult = await expectStatus(user, '/api/resources', 200);
    const resources = resourcesResult.body.resources;
    const washers = resources.filter((item) => item.type === 'washer');
    const dryingRooms = resources.filter((item) => item.type === 'drying_room');
    const tumblers = resources.filter((item) => item.type === 'tumbler');
    assert.equal(washers.length, 3);
    assert.equal(dryingRooms.length, 3);
    assert.equal(tumblers.length, 2);

    const firstWasher = await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[1].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[2].id, date: bookingDate, slot: '12:00-17:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[2].id, date: secondWashDate, slot: '07:00-12:00' })
    });

    await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: dryingRooms[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: dryingRooms[1].id, date: bookingDate, slot: '07:00-12:00' })
    });
    const tumblerBooking = await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: tumblers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: tumblers[1].id, date: bookingDate, slot: '07:00-12:00' })
    });

    const calendar = await expectStatus(user, `/api/calendar?from=${bookingDate}&days=7`, 200);
    assert.equal(calendar.body.days.length, 7);
    assert.ok(calendar.body.days[0].ownBookings >= 4);
    assert.equal(typeof calendar.body.days[0].availability.washer.freeSlots, 'number');
    const recommendation = await expectStatus(user, '/api/recommendation', 200);
    assert.ok(recommendation.body.recommendation.title);

    await expectStatus(user, `/api/bookings/${tumblerBooking.body.id}/release`, 200, { method: 'POST' });
    const notices = await expectStatus(user, '/api/release-notices', 200);
    assert.ok(notices.body.notices.some((notice) => notice.resource_name === 'Tumbler 1'));

    await expectStatus(user, '/api/me/password', 200, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'Bewohner-2026!', newPassword: 'Bewohner-Neu-2026!' })
    });
    await expectStatus(user, '/api/logout', 200, { method: 'POST' });
    await expectStatus(user, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-Neu-2026!' })
    });

    await expectStatus(admin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin-Test-2026!' })
    });
    const users = await expectStatus(admin, '/api/admin/users', 200);
    const resident = users.body.users.find((item) => item.username === 'Bewohner Test');
    const adminUser = users.body.users.find((item) => item.username === 'admin');
    assert.ok(resident && adminUser);
    await expectStatus(admin, '/api/admin/email-test', 409, { method: 'POST' });

    await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Frau Meier',
        resourceId: washers[2].id,
        weekday: 6,
        slot: '12:00-17:00'
      })
    });
    await expectStatus(user, '/api/bookings', 409, {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[2].id, date: fixedDate, slot: '12:00-17:00' })
    });

    await expectStatus(admin, `/api/admin/users/${adminUser.id}/status`, 400, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/status`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: false })
    });
    await expectStatus(new ApiClient(), '/api/login', 403, {
      method: 'POST',
      body: JSON.stringify({ username: 'Bewohner Test', password: 'Bewohner-Neu-2026!' })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/status`, 200, {
      method: 'PUT',
      body: JSON.stringify({ active: true })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/password`, 200, {
      method: 'PUT',
      body: JSON.stringify({ newPassword: 'Admin-Reset-2026!' })
    });
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'Bewohner Test', password: 'Admin-Reset-2026!' })
    });

    const backup = await expectStatus(admin, '/api/admin/backup', 200);
    assert.ok(backup.body.length > 1000);
    assert.equal(backup.body.subarray(0, 15).toString(), 'SQLite format 3');

    const indexPage = await expectStatus(guest, '/index.html', 200);
    const indexHtml = indexPage.body.toString();
    assert.ok(indexHtml.includes('recordedIntroVideo'));
    assert.ok(indexHtml.includes('knapp vier Minuten'));
    assert.ok(indexHtml.includes('passwordForm'));
    assert.ok(indexHtml.includes('user-admin-list'));
    const video = await expectStatus(guest, '/assets/intro/waschplan-einfuehrung.mp4', 206, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.equal(video.response.headers.get('content-type'), 'video/mp4');
    assert.equal(video.body.length, 1024);
    const captions = await expectStatus(guest, '/assets/intro/waschplan-einfuehrung-de.vtt', 200);
    const captionText = captions.body.toString();
    assert.ok(captionText.startsWith('WEBVTT'));
    assert.ok(captionText.includes('Vorschlag buchen'));

    await verifyProductionRecoveryStartup();

    console.log(JSON.stringify({
      ok: true,
      checks: {
        authentication: true,
        passwordRecovery: true,
        bookingRules: true,
        smartCalendar: true,
        fixedBookings: true,
        accountManagement: true,
        backup: true,
        narratedVideo: true,
        productionRecovery: true,
        securityHeaders: true
      },
      firstBookingId: firstWasher.body.id
    }, null, 2));
  } finally {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${databasePath}${suffix}`, { force: true });
    }
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  if (serverOutput.length) {
    console.error(serverOutput.join(''));
  }
  process.exitCode = 1;
});
