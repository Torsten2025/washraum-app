const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { releaseWindowStatus } = require('../release-window');

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

function currentSwissReleaseSlot() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  const dateValue = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number(parts.hour);
  if (hour < 7 || hour >= 21) return null;
  if (hour < 12) return { date: dateValue, slot: '07:00-12:00' };
  if (hour < 17) return { date: dateValue, slot: '12:00-17:00' };
  return { date: dateValue, slot: '17:00-21:00' };
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

function verifyReleaseWindow() {
  const beforeStart = releaseWindowStatus(
    '2026-07-14',
    '07:00-12:00',
    new Date('2026-07-14T04:30:00Z')
  );
  const duringSlot = releaseWindowStatus(
    '2026-07-14',
    '07:00-12:00',
    new Date('2026-07-14T06:30:00Z')
  );
  const alreadyEnded = releaseWindowStatus(
    '2026-07-14',
    '07:00-12:00',
    new Date('2026-07-14T10:00:00Z')
  );

  assert.equal(beforeStart.eligible, false);
  assert.equal(beforeStart.reason, 'not_started');
  assert.equal(duringSlot.eligible, true);
  assert.equal(duringSlot.reason, 'eligible');
  assert.equal(alreadyEnded.eligible, false);
  assert.equal(alreadyEnded.reason, 'ended');
}

async function run() {
  verifyReleaseWindow();
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
    const bookingDate = addDays(nextWeekday(1), 14);
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

    const sessionDatabase = new Database(databasePath);
    const storedSession = sessionDatabase.prepare('SELECT sid, sess FROM sessions').all()
      .map((row) => ({ ...row, data: JSON.parse(row.sess) }))
      .find((row) => row.data.user?.id === registration.body.user.id);
    assert.ok(storedSession, 'Registrierungssitzung wurde nicht gespeichert.');
    storedSession.data.user = {
      id: registration.body.user.id,
      username: registration.body.user.username,
      role: registration.body.user.role,
      email: registration.body.user.email,
      notifyReleases: registration.body.user.notifyReleases
    };
    delete storedSession.data.activeHouseId;
    sessionDatabase.prepare('UPDATE sessions SET sess = ? WHERE sid = ?')
      .run(JSON.stringify(storedSession.data), storedSession.sid);
    sessionDatabase.close();

    const hydratedSession = await expectStatus(user, '/api/me', 200);
    assert.equal(hydratedSession.body.user.houseName, 'Maneggplatz 18');
    assert.ok(hydratedSession.body.user.activeHouseId);

    const resourcesResult = await expectStatus(user, '/api/resources', 200);
    const resources = resourcesResult.body.resources;
    const washers = resources.filter((item) => item.type === 'washer');
    const dryingRooms = resources.filter((item) => item.type === 'drying_room');
    const tumblers = resources.filter((item) => item.type === 'tumbler');
    assert.equal(washers.length, 3);
    assert.equal(dryingRooms.length, 3);
    assert.equal(tumblers.length, 2);

    const packageUser = new ApiClient();
    await expectStatus(packageUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Test',
        email: 'paket-test@example.com',
        password: 'Paket-Test-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const packageRecommendation = await expectStatus(packageUser, '/api/recommendation', 200);
    assert.equal(packageRecommendation.body.recommendation.kind, 'package');
    assert.ok(packageRecommendation.body.recommendation.components.some((component) => component.type === 'washer'));
    const selectedPackageComponents = packageRecommendation.body.recommendation.components.filter((component) => (
      component.required || component.selectedByDefault
    ));
    const selectedPackageItems = selectedPackageComponents.flatMap((component) => component.bookings);
    assert.ok(selectedPackageComponents.length >= 2);
    const packageBooking = await expectStatus(packageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({ items: selectedPackageItems })
    });
    assert.ok(packageBooking.body.created.length >= 2);
    const packageUserBookings = await expectStatus(packageUser, '/api/my-bookings', 200);
    assert.equal(packageUserBookings.body.bookings.length, packageBooking.body.created.length);

    const packageSupplement = await expectStatus(packageUser, '/api/recommendation', 200);
    if (packageSupplement.body.recommendation.kind === 'package') {
      assert.ok(packageSupplement.body.recommendation.washerBookingId);
      const supplementItems = packageSupplement.body.recommendation.components
        .filter((component) => !component.required)
        .flatMap((component) => component.bookings);
      await expectStatus(packageUser, '/api/booking-package', 201, {
        method: 'POST',
        body: JSON.stringify({
          washerBookingId: packageSupplement.body.recommendation.washerBookingId,
          items: supplementItems
        })
      });
    }

    const rollbackUser = new ApiClient();
    await expectStatus(rollbackUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Rollback',
        email: 'paket-rollback@example.com',
        password: 'Paket-Rollback-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const rollbackRecommendation = await expectStatus(rollbackUser, '/api/recommendation', 200);
    assert.equal(rollbackRecommendation.body.recommendation.kind, 'package');
    const invalidPackageItems = rollbackRecommendation.body.recommendation.components
      .filter((component) => component.required || component.selectedByDefault)
      .flatMap((component) => component.bookings)
      .map((item) => ({ ...item }));
    const companionIndex = invalidPackageItems.findIndex((item, index) => index > 0);
    assert.ok(companionIndex > 0);
    invalidPackageItems[companionIndex].date = addDays(invalidPackageItems[companionIndex].date, 5);
    await expectStatus(rollbackUser, '/api/booking-package', 400, {
      method: 'POST',
      body: JSON.stringify({ items: invalidPackageItems })
    });
    const rollbackBookings = await expectStatus(rollbackUser, '/api/my-bookings', 200);
    assert.equal(rollbackBookings.body.bookings.length, 0);

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

    const earlyRelease = await expectStatus(user, `/api/bookings/${tumblerBooking.body.id}/release`, 200, { method: 'POST' });
    assert.equal(earlyRelease.body.releaseNoticeCreated, false);
    assert.equal(earlyRelease.body.emailNotifications.sent, 0);
    assert.equal(earlyRelease.body.emailNotifications.skipped, true);
    const notices = await expectStatus(user, '/api/release-notices', 200);
    assert.ok(!notices.body.notices.some((notice) => notice.resource_name === 'Tumbler 1'));

    const cancellationBooking = await expectStatus(user, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: tumblers[0].id, date: bookingDate, slot: '07:00-12:00' })
    });
    const upcomingBookings = await expectStatus(user, '/api/my-bookings', 200);
    const cancellableBooking = upcomingBookings.body.bookings.find((booking) => booking.id === cancellationBooking.body.id);
    assert.equal(cancellableBooking.releaseEligible, false);
    assert.equal(cancellableBooking.cancellationNoticeEligible, true);
    const cancellation = await expectStatus(
      user,
      `/api/bookings/${cancellationBooking.body.id}/cancel-notify`,
      200,
      { method: 'POST' }
    );
    assert.equal(cancellation.body.releaseNoticeCreated, true);
    assert.ok(cancellation.body.message.includes('wurde abgesagt'));
    const cancellationNotices = await expectStatus(user, '/api/release-notices', 200);
    assert.ok(cancellationNotices.body.notices.some((notice) => (
      notice.resource_name === 'Tumbler 1' && notice.kind === 'cancellation'
    )));

    const nearTerm = currentSwissReleaseSlot();
    if (nearTerm) {
      const testDatabase = new Database(databasePath);
      const nearTermBooking = testDatabase.prepare(`
        INSERT INTO bookings (user_id, resource_id, booking_date, slot)
        VALUES (?, ?, ?, ?)
      `).run(registration.body.user.id, tumblers[1].id, nearTerm.date, nearTerm.slot);
      testDatabase.close();
      await expectStatus(
        user,
        `/api/bookings/${nearTermBooking.lastInsertRowid}/cancel-notify`,
        409,
        { method: 'POST' }
      );
      const timelyRelease = await expectStatus(
        user,
        `/api/bookings/${nearTermBooking.lastInsertRowid}/release`,
        200,
        { method: 'POST' }
      );
      assert.equal(timelyRelease.body.releaseNoticeCreated, true);
      const timelyNotices = await expectStatus(user, '/api/release-notices', 200);
      assert.ok(timelyNotices.body.notices.some((notice) => notice.resource_name === 'Tumbler 2'));
    }

    await expectStatus(user, '/api/me/password', 200, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: 'Bewohner-2026!', newPassword: 'Bewohner-Neu-2026!' })
    });
    await expectStatus(user, '/api/logout', 200, { method: 'POST' });
    await expectStatus(user, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'bewohner-test@example.com', password: 'Bewohner-Neu-2026!' })
    });

    const adminLogin = await expectStatus(admin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin-Test-2026!' })
    });
    assert.equal(adminLogin.body.user.isSuperadmin, true);
    const users = await expectStatus(admin, '/api/admin/users', 200);
    const resident = users.body.users.find((item) => item.username === 'Bewohner Test');
    const adminUser = users.body.users.find((item) => item.username === 'admin');
    assert.ok(resident && adminUser);
    await expectStatus(admin, '/api/admin/email-test', 409, { method: 'POST' });

    const initialHouses = await expectStatus(admin, '/api/admin/houses', 200);
    assert.equal(initialHouses.body.houses.length, 1);
    const defaultHouseId = initialHouses.body.activeHouseId;
    await expectStatus(user, '/api/admin/houses', 403);
    await expectStatus(user, '/api/me/active-house', 403, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });

    const secondHouse = await expectStatus(admin, '/api/admin/houses', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Maneggplatz 20', code: 'Testhaus 20' })
    });
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: secondHouse.body.house.id })
    });
    const secondHouseResources = await expectStatus(admin, '/api/resources', 200);
    assert.equal(secondHouseResources.body.resources.length, 8);
    assert.ok(!secondHouseResources.body.resources.some((resource) => (
      resources.some((defaultResource) => defaultResource.id === resource.id)
    )));

    const secondHouseUser = new ApiClient();
    const secondHouseRegistration = await expectStatus(secondHouseUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Bewohner Haus 20',
        email: 'haus20@example.com',
        password: 'Bewohner-Haus20!',
        houseCode: 'Testhaus 20',
        notifyReleases: true
      })
    });
    assert.equal(secondHouseRegistration.body.user.houseName, 'Maneggplatz 20');
    const secondWasher = secondHouseResources.body.resources.find((resource) => resource.type === 'washer');
    await expectStatus(secondHouseUser, '/api/bookings', 201, {
      method: 'POST',
      body: JSON.stringify({ resourceId: secondWasher.id, date: bookingDate, slot: '07:00-12:00' })
    });
    const secondHouseBookings = await expectStatus(admin, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(secondHouseBookings.body.bookings.some((booking) => booking.username === 'Bewohner Haus 20'));
    assert.ok(!secondHouseBookings.body.bookings.some((booking) => booking.username === 'Bewohner Test'));
    const secondHouseUsers = await expectStatus(admin, '/api/admin/users', 200);
    const secondResident = secondHouseUsers.body.users.find((item) => item.username === 'Bewohner Haus 20');
    assert.ok(secondResident);
    await expectStatus(admin, `/api/admin/users/${secondResident.id}/role`, 200, {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' })
    });

    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    const isolatedDefaultBookings = await expectStatus(admin, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(!isolatedDefaultBookings.body.bookings.some((booking) => booking.username === 'Bewohner Haus 20'));
    const isolatedDefaultUsers = await expectStatus(admin, '/api/admin/users', 200);
    assert.ok(!isolatedDefaultUsers.body.users.some((item) => item.username === 'Bewohner Haus 20'));

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
    assert.ok(indexHtml.includes('Absagen &amp; informieren'));
    assert.ok(indexHtml.includes('Waschpaket'));
    assert.ok(indexHtml.includes('passwordForm'));
    assert.ok(indexHtml.includes('user-admin-list'));
    const appScript = await expectStatus(guest, '/app.js', 200);
    assert.ok(appScript.body.toString().includes('/api/booking-package'));
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
        legacySessionHydration: true,
        passwordRecovery: true,
        bookingRules: true,
        smartCalendar: true,
        smartPackage: true,
        multiHouseIsolation: true,
        superadmin: true,
        fixedBookings: true,
        accountManagement: true,
        backup: true,
        narratedVideo: true,
        releaseWindow: true,
        cancellationNotifications: true,
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
