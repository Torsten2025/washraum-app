const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { releaseWindowStatus } = require('../release-window');
const { isDateString, isPastSwissSlot, swissDateString } = require('../swiss-time');

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

async function verifySmtpDelivery() {
  const messages = [];
  const smtpServer = net.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 local.test ESMTP\r\n');
    let buffer = '';
    let dataMode = false;

    socket.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.length) {
        if (dataMode) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          messages.push(buffer.slice(0, end));
          buffer = buffer.slice(end + 5);
          dataMode = false;
          socket.write('250 queued\r\n');
          continue;
        }
        const end = buffer.indexOf('\r\n');
        if (end < 0) return;
        const command = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (/^EHLO /i.test(command)) socket.write('250-local.test\r\n250 SIZE 20000000\r\n');
        else if (/^(MAIL FROM|RCPT TO):/i.test(command)) socket.write('250 OK\r\n');
        else if (/^DATA$/i.test(command)) {
          dataMode = true;
          socket.write('354 End data\r\n');
        } else if (/^QUIT$/i.test(command)) {
          socket.write('221 Bye\r\n');
          socket.end();
        } else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve) => smtpServer.listen(0, '127.0.0.1', resolve));
  const smtpPort = smtpServer.address().port;
  const appPort = port + 2;
  const smtpDatabasePath = path.join(os.tmpdir(), `waschplan-smtp-${process.pid}.sqlite`);
  const smtpOutput = [];
  const smtpApp = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(appPort),
      DB_PATH: smtpDatabasePath,
      HOUSE_CODE: 'SMTP Testhaus',
      SEED_ADMIN_NAME: 'smtp-admin',
      SEED_ADMIN_PASSWORD: 'SMTP-Admin-2026!',
      SESSION_SECRET: 'smtp-integration-secret-at-least-32-characters',
      PUBLIC_APP_URL: `http://127.0.0.1:${appPort}`,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SMTP_FROM: 'waschplan@local.test',
      SMTP_SECURE: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  smtpApp.stdout.on('data', (chunk) => smtpOutput.push(chunk.toString()));
  smtpApp.stderr.on('data', (chunk) => smtpOutput.push(chunk.toString()));

  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${appPort}/api/health`);
        if (response.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const registration = await fetch(`http://127.0.0.1:${appPort}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'SMTP Person',
        email: 'smtp-person@example.com',
        password: 'SMTP-Person-2026!',
        houseCode: 'SMTP Testhaus',
        notifyReleases: true
      })
    });
    assert.equal(registration.status, 201, smtpOutput.join(''));
    const registrationBody = await registration.json();
    assert.equal(registrationBody.verification.sent, true);
    assert.ok(messages[0].includes('Subject: WaschZeit:'));
    assert.ok(messages[0].includes('/api/email-verification/confirm?token='));
    const verificationLink = messages[0].match(/http:\/\/[^\s]+\/api\/email-verification\/confirm\?token=[a-f0-9]+/)[0];
    const verification = await fetch(verificationLink, { redirect: 'manual' });
    assert.equal(verification.status, 302);

    const resetRequest = await fetch(`http://127.0.0.1:${appPort}/api/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smtp-person@example.com' })
    });
    assert.equal(resetRequest.status, 200);
    assert.ok(messages[1].includes('Subject: WaschZeit:'));
    assert.ok(messages[1].includes('/reset.html?token='));
    const resetToken = messages[1].match(/reset\.html\?token=([a-f0-9]+)/)[1];
    const resetConfirm = await fetch(`http://127.0.0.1:${appPort}/api/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'SMTP-Neu-2026!' })
    });
    assert.equal(resetConfirm.status, 200);

    const smtpAdminLogin = await fetch(`http://127.0.0.1:${appPort}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'smtp-admin', password: 'SMTP-Admin-2026!' })
    });
    assert.equal(smtpAdminLogin.status, 200);
    const smtpAdminCookie = String(smtpAdminLogin.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(smtpAdminCookie.includes('connect.sid='));

    const adminResetRequest = await fetch(
      `http://127.0.0.1:${appPort}/api/admin/users/${registrationBody.user.id}/password-reset`,
      { method: 'POST', headers: { Cookie: smtpAdminCookie } }
    );
    assert.equal(adminResetRequest.status, 200);
    assert.ok(messages[2].includes('Subject: WaschZeit:'));
    assert.ok(messages[2].includes('/reset.html?token='));

    const resourcesResponse = await fetch(`http://127.0.0.1:${appPort}/api/resources`, {
      headers: { Cookie: smtpAdminCookie }
    });
    assert.equal(resourcesResponse.status, 200);
    const smtpWasher = (await resourcesResponse.json()).resources.find((resource) => resource.type === 'washer');
    assert.ok(smtpWasher);

    const smtpBookingDate = addDays(nextWeekday(1), 14);
    const smtpBooking = await fetch(`http://127.0.0.1:${appPort}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: smtpAdminCookie },
      body: JSON.stringify({ resourceId: smtpWasher.id, date: smtpBookingDate, slot: '07:00-12:00' })
    });
    assert.equal(smtpBooking.status, 201);
    const smtpBookingBody = await smtpBooking.json();

    const releaseMail = await fetch(`http://127.0.0.1:${appPort}/api/bookings/${smtpBookingBody.id}/cancel-notify`, {
      method: 'POST',
      headers: { Cookie: smtpAdminCookie }
    });
    assert.equal(releaseMail.status, 200);
    const releaseMailBody = await releaseMail.json();
    assert.equal(releaseMailBody.releaseNoticeCreated, true);
    assert.equal(releaseMailBody.emailNotifications.configured, true);
    assert.equal(releaseMailBody.emailNotifications.sent, 1);
    assert.equal(messages.length, 4);
    assert.ok(messages[3].includes('To: smtp-person@example.com'));
    assert.ok(messages[3].includes('Subject: WaschZeit: Termin'));
    assert.ok(messages[3].includes(smtpWasher.name));
    assert.ok(messages[3].includes('wieder frei'));
  } finally {
    if (smtpApp.exitCode === null) {
      smtpApp.kill();
      await new Promise((resolve) => smtpApp.once('exit', resolve));
    }
    await new Promise((resolve) => smtpServer.close(resolve));
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${smtpDatabasePath}${suffix}`, { force: true });
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

  assert.equal(swissDateString(new Date('2026-07-14T22:30:00Z')), '2026-07-15');
  assert.equal(isPastSwissSlot('2026-07-14', '17:00-21:00', new Date('2026-07-14T18:59:00Z')), false);
  assert.equal(isPastSwissSlot('2026-07-14', '17:00-21:00', new Date('2026-07-14T19:00:00Z')), true);
  assert.equal(isDateString('2026-02-29'), false);
  assert.equal(isDateString('2028-02-29'), true);
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
    await expectStatus(guest, '/api/login', 403, {
      method: 'POST',
      headers: { Origin: 'https://example.invalid' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' })
    });
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
    await expectStatus(guest, '/api/register', 400, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Ohne Mail',
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
    assert.equal(hydratedSession.body.user.bookingMode, 'time');
    const bookingMode = await expectStatus(user, '/api/me/booking-mode', 200, {
      method: 'PUT',
      body: JSON.stringify({ bookingMode: 'machine' })
    });
    assert.equal(bookingMode.body.user.bookingMode, 'machine');
    await expectStatus(user, '/api/me/booking-mode', 400, {
      method: 'PUT',
      body: JSON.stringify({ bookingMode: 'ungueltig' })
    });
    const persistedBookingMode = await expectStatus(user, '/api/me', 200);
    assert.equal(persistedBookingMode.body.user.bookingMode, 'machine');
    const preferences = await expectStatus(user, '/api/me/notifications', 200, {
      method: 'PUT',
      body: JSON.stringify({
        email: 'bewohner-test@example.com',
        notifyReleases: true,
        resourceType: 'drying_room',
        weekday: 2,
        slot: '12:00-17:00'
      })
    });
    assert.equal(preferences.body.notificationPreferences.resourceType, 'drying_room');
    const preferencesMe = await expectStatus(user, '/api/me', 200);
    assert.equal(preferencesMe.body.notificationPreferences.weekday, 2);
    assert.equal(preferencesMe.body.push.available, true);
    const pushKey = await expectStatus(user, '/api/push/public-key', 200);
    assert.equal(pushKey.body.configured, true);
    assert.ok(pushKey.body.publicKey.length > 40);
    const pushEndpoint = `https://push.example.test/${crypto.randomUUID()}`;
    await expectStatus(user, '/api/push/subscriptions', 201, {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: pushEndpoint,
          keys: {
            p256dh: Buffer.from(crypto.randomBytes(65)).toString('base64url'),
            auth: Buffer.from(crypto.randomBytes(16)).toString('base64url')
          }
        }
      })
    });
    const pushMe = await expectStatus(user, '/api/me', 200);
    assert.equal(pushMe.body.push.activeSubscriptions, 1);
    await expectStatus(user, '/api/push/subscriptions', 200, {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: pushEndpoint })
    });
    const pushMeAfterDelete = await expectStatus(user, '/api/me', 200);
    assert.equal(pushMeAfterDelete.body.push.activeSubscriptions, 0);
    await expectStatus(user, '/api/push/subscriptions', 201, {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: `${pushEndpoint}-active`,
          keys: {
            p256dh: Buffer.from(crypto.randomBytes(65)).toString('base64url'),
            auth: Buffer.from(crypto.randomBytes(16)).toString('base64url')
          }
        }
      })
    });
    const exportResult = await expectStatus(user, '/api/me/export', 200);
    assert.equal(exportResult.body.account.username, 'Bewohner Test');
    assert.equal(exportResult.body.account.booking_mode, 'machine');

    const recoveryClient = new ApiClient();
    const recoveryRegistration = await expectStatus(recoveryClient, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Passwort Hilfe',
        email: 'passwort-hilfe@example.com',
        password: 'Passwort-Alt-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetDatabase = new Database(databasePath);
    resetDatabase.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(
      recoveryRegistration.body.user.id,
      crypto.createHash('sha256').update(resetToken).digest('hex'),
      String(Date.now() + 60000)
    );
    resetDatabase.close();
    await expectStatus(recoveryClient, '/api/password-reset/confirm', 200, {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword: 'Passwort-Neu-2026!' })
    });
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'passwort-hilfe@example.com', password: 'Passwort-Neu-2026!' })
    });

    const deleteClient = new ApiClient();
    await expectStatus(deleteClient, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Konto Loeschen',
        email: 'konto-loeschen@example.com',
        password: 'Konto-Loeschen-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    await expectStatus(deleteClient, '/api/me', 403, {
      method: 'DELETE',
      body: JSON.stringify({ password: 'falsch' })
    });
    await expectStatus(deleteClient, '/api/me', 200, {
      method: 'DELETE',
      body: JSON.stringify({ password: 'Konto-Loeschen-2026!' })
    });

    const resourcesResult = await expectStatus(user, '/api/resources', 200);
    const resources = resourcesResult.body.resources;
    const washers = resources.filter((item) => item.type === 'washer');
    const dryingRooms = resources.filter((item) => item.type === 'drying_room');
    const tumblers = resources.filter((item) => item.type === 'tumbler');
    assert.equal(washers.length, 3);
    assert.equal(dryingRooms.length, 3);
    assert.equal(tumblers.length, 2);

    const concurrentUsers = [new ApiClient(), new ApiClient()];
    for (let index = 0; index < concurrentUsers.length; index += 1) {
      await expectStatus(concurrentUsers[index], '/api/register', 201, {
        method: 'POST',
        body: JSON.stringify({
          username: `Parallel ${index + 1}`,
          email: `parallel-${index + 1}@example.com`,
          password: `Parallel-${index + 1}-2026!`,
          houseCode: 'Testhaus 18',
          notifyReleases: false
        })
      });
    }
    const concurrencyDate = addDays(nextWeekday(3), 35);
    const concurrentResults = await Promise.all(concurrentUsers.map((client) => client.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ resourceId: washers[0].id, date: concurrencyDate, slot: '12:00-17:00' })
    })));
    assert.deepEqual(concurrentResults.map((result) => result.response.status).sort(), [201, 409]);

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
    const guidedDate = packageRecommendation.body.recommendation.date;
    const guidedSlot = packageRecommendation.body.recommendation.slot;
    const guidedWashers = await expectStatus(
      packageUser,
      `/api/booking-options?date=${guidedDate}`,
      200
    );
    assert.equal(guidedWashers.body.companions, null);
    assert.equal(guidedWashers.body.slots.length, 3);
    const guidedWasherSlot = guidedWashers.body.slots.find((item) => item.slot === guidedSlot);
    assert.ok(guidedWasherSlot);
    assert.equal(guidedWasherSlot.washers.length, 3);
    assert.ok(guidedWasherSlot.dryingRoomCount >= 1);
    assert.ok(guidedWasherSlot.tumblerCount >= 1);
    const guidedCompanions = await expectStatus(
      packageUser,
      `/api/booking-options?date=${guidedDate}&slot=${encodeURIComponent(guidedSlot)}`,
      200
    );
    assert.ok(guidedCompanions.body.companions.dryingRooms.length >= 1);
    assert.ok(guidedCompanions.body.companions.dryingRooms[0].bookingOptions.length >= 1);
    assert.ok(guidedCompanions.body.companions.tumblers.length >= 1);
    await expectStatus(packageUser, '/api/booking-options?date=ungueltig', 400);
    await expectStatus(packageUser, `/api/booking-options?date=${guidedDate}&slot=00:00-01:00`, 400);
    const washerPackageComponents = packageRecommendation.body.recommendation.components
      .filter((component) => component.type === 'washer');
    assert.equal(washerPackageComponents.length, 3);
    assert.equal(washerPackageComponents.filter((component) => component.required).length, 1);
    const packageRuleDatabase = new Database(databasePath);
    const packageHouse = packageRuleDatabase.prepare('SELECT house_id FROM resources WHERE id = ?')
      .get(washerPackageComponents[0].bookings[0].resourceId);
    const fourthWasher = packageRuleDatabase.prepare(`
      INSERT INTO resources (name, type, house_id) VALUES ('Waschmaschine 4 Test', 'washer', ?)
    `).run(packageHouse.house_id);
    packageRuleDatabase.close();
    const fourWasherItems = [
      ...washerPackageComponents.flatMap((component) => component.bookings),
      {
        resourceId: Number(fourthWasher.lastInsertRowid),
        date: packageRecommendation.body.recommendation.date,
        slot: packageRecommendation.body.recommendation.slot
      }
    ];
    await expectStatus(packageUser, '/api/booking-package', 400, {
      method: 'POST',
      body: JSON.stringify({ items: fourWasherItems })
    });
    const packageRuleCleanup = new Database(databasePath);
    packageRuleCleanup.prepare('DELETE FROM resources WHERE id = ?').run(Number(fourthWasher.lastInsertRowid));
    packageRuleCleanup.close();
    const recommendedDryingRoom = packageRecommendation.body.recommendation.components
      .find((component) => component.type === 'drying_room');
    const optionalTumbler = packageRecommendation.body.recommendation.components
      .find((component) => component.type === 'tumbler');
    assert.ok(recommendedDryingRoom);
    assert.equal(recommendedDryingRoom.selectedByDefault, true);
    assert.equal(recommendedDryingRoom.recommendationLabel, 'Empfohlen');
    assert.ok(recommendedDryingRoom.bookingOptions.length >= 1);
    const selectedDryingOption = recommendedDryingRoom.bookingOptions
      .find((option) => option.id === recommendedDryingRoom.selectedOption)
      || recommendedDryingRoom.bookingOptions.at(-1);
    assert.ok(selectedDryingOption);
    if (optionalTumbler) {
      assert.equal(optionalTumbler.selectedByDefault, true);
      assert.equal(optionalTumbler.recommendationLabel, 'Ausgew\u00e4hlt');
    }
    const selectedPackageComponents = packageRecommendation.body.recommendation.components.filter((component) => (
      component.type === 'washer' || component.required || component.selectedByDefault
    ));
    const selectedPackageItems = selectedPackageComponents.flatMap((component) => (
      component.type === 'drying_room'
        ? selectedDryingOption.bookings
        : component.bookings
    ));
    assert.ok(selectedPackageComponents.length >= 2);
    const packageBooking = await expectStatus(packageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({ items: selectedPackageItems })
    });
    assert.equal(packageBooking.body.created.filter((item) => item.type === 'washer').length, 3);
    assert.ok(packageBooking.body.created.some((item) => item.type === 'drying_room'));
    assert.ok(packageBooking.body.created.some((item) => item.type === 'tumbler'));
    const packageUserBookings = await expectStatus(packageUser, '/api/my-bookings', 200);
    assert.equal(packageUserBookings.body.bookings.length, packageBooking.body.created.length);
    assert.ok(packageBooking.body.groupId);
    assert.ok(packageUserBookings.body.bookings.every((booking) => booking.group_id === packageBooking.body.groupId));
    const guidedSupplement = await expectStatus(
      packageUser,
      `/api/booking-options?date=${guidedDate}`,
      200
    );
    assert.equal(guidedSupplement.body.existingWashers.length, 3);
    assert.equal(guidedSupplement.body.existingWashers[0].slot, guidedSlot);

    const bookedTumbler = packageBooking.body.created.find((item) => item.type === 'tumbler');
    assert.ok(bookedTumbler);
    await expectStatus(packageUser, `/api/bookings/${bookedTumbler.id}`, 200, { method: 'DELETE' });
    const packageSupplement = await expectStatus(packageUser, '/api/recommendation', 200);
    assert.equal(packageSupplement.body.recommendation.kind, 'package');
    assert.ok(packageSupplement.body.recommendation.washerBookingId);
    const supplementItems = packageSupplement.body.recommendation.components
      .filter((component) => !component.required)
      .flatMap((component) => component.bookings);
    assert.ok(supplementItems.length > 0);
    await expectStatus(packageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({
        washerBookingId: packageSupplement.body.recommendation.washerBookingId,
        items: supplementItems
      })
    });
    await expectStatus(packageUser, `/api/booking-groups/${packageBooking.body.groupId}`, 200, { method: 'DELETE' });
    const deletedPackageBookings = await expectStatus(packageUser, '/api/my-bookings', 200);
    assert.equal(deletedPackageBookings.body.bookings.length, 0);

    const cancelPackageUser = new ApiClient();
    await expectStatus(cancelPackageUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Absage',
        email: 'paket-absage@example.com',
        password: 'Paket-Absage-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const cancelRecommendation = await expectStatus(cancelPackageUser, '/api/recommendation', 200);
    const cancelItems = cancelRecommendation.body.recommendation.components
      .filter((component) => component.required || component.selectedByDefault)
      .flatMap((component) => component.bookings);
    const cancellablePackage = await expectStatus(cancelPackageUser, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({ items: cancelItems })
    });
    const packageCancellation = await expectStatus(
      cancelPackageUser,
      `/api/booking-groups/${cancellablePackage.body.groupId}/cancel-notify`,
      200,
      { method: 'POST' }
    );
    assert.equal(packageCancellation.body.releaseNoticeCreated, true);
    assert.equal(packageCancellation.body.deleted, cancellablePackage.body.created.length);

    const smartPackageUser = new ApiClient();
    await expectStatus(smartPackageUser, '/api/register', 201, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Paket Auswahl',
        email: 'paket-auswahl@example.com',
        password: 'Paket-Auswahl-2026!',
        houseCode: 'Testhaus 18',
        notifyReleases: false
      })
    });
    const firstSmartRecommendation = await expectStatus(smartPackageUser, '/api/recommendation', 200);
    const firstSmartDryingRoom = firstSmartRecommendation.body.recommendation.components
      .find((component) => component.type === 'drying_room');
    assert.ok(firstSmartDryingRoom);

    const rankingDatabase = new Database(databasePath);
    const occupyDryingRoom = rankingDatabase.prepare(`
      INSERT OR IGNORE INTO bookings (user_id, resource_id, booking_date, slot)
      VALUES (?, ?, ?, ?)
    `);
    for (const room of dryingRooms) {
      for (const booking of firstSmartDryingRoom.bookings) {
        occupyDryingRoom.run(registration.body.user.id, room.id, booking.date, booking.slot);
      }
    }
    rankingDatabase.close();

    const smarterRecommendation = await expectStatus(smartPackageUser, '/api/recommendation', 200);
    const smarterDryingRoom = smarterRecommendation.body.recommendation.components
      .find((component) => component.type === 'drying_room');
    assert.ok(smarterDryingRoom, 'Eine nahe Kombination mit Trockenraum soll vor einem reinen Tumbler-Paket stehen.');
    assert.notEqual(
      `${smarterRecommendation.body.recommendation.date}|${smarterRecommendation.body.recommendation.slot}`,
      `${firstSmartRecommendation.body.recommendation.date}|${firstSmartRecommendation.body.recommendation.slot}`
    );

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
    assert.equal(calendar.body.days[0].slotDetails.length, 3);
    const bookedCalendarSlot = calendar.body.days[0].slotDetails
      .find((item) => item.slot === '07:00-12:00');
    assert.ok(bookedCalendarSlot);
    assert.ok(bookedCalendarSlot.types.washer.resources.some((resource) => resource.state === 'own'));
    assert.equal(bookedCalendarSlot.types.tumbler.free, 0);
    assert.ok(bookedCalendarSlot.types.tumbler.resources.some((resource) => resource.state === 'own'));
    assert.ok(bookedCalendarSlot.types.tumbler.resources.some((resource) => resource.state === 'reserve'));
    const monthCalendar = await expectStatus(user, `/api/calendar?from=${bookingDate}&days=42`, 200);
    assert.equal(monthCalendar.body.days.length, 42);
    const closedSunday = monthCalendar.body.days.find((day) => (
      new Date(`${day.date}T12:00:00Z`).getUTCDay() === 0
    ));
    assert.ok(closedSunday);
    assert.equal(closedSunday.closed, true);
    assert.ok(Object.values(closedSunday.availability).every((item) => item.freeSlots === 0));
    await expectStatus(user, `/api/calendar?from=${bookingDate}&days=43`, 400);
    const recommendation = await expectStatus(user, '/api/recommendation', 200);
    assert.ok(recommendation.body.recommendation.title);

    const noticesBeforeEarlyRelease = await expectStatus(user, '/api/release-notices', 200);
    const tumblerNoticesBefore = noticesBeforeEarlyRelease.body.notices
      .filter((notice) => notice.resource_name === 'Tumbler 1').length;
    const earlyRelease = await expectStatus(user, `/api/bookings/${tumblerBooking.body.id}/release`, 200, { method: 'POST' });
    assert.equal(earlyRelease.body.releaseNoticeCreated, false);
    assert.equal(earlyRelease.body.emailNotifications.sent, 0);
    assert.equal(earlyRelease.body.emailNotifications.skipped, true);
    const notices = await expectStatus(user, '/api/release-notices', 200);
    assert.equal(
      notices.body.notices.filter((notice) => notice.resource_name === 'Tumbler 1').length,
      tumblerNoticesBefore
    );

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
    assert.ok(cancellation.body.message.includes('abgesagt'));
    assert.ok(cancellation.body.message.includes('Bewohner Test'));
    const cancellationNotices = await expectStatus(user, '/api/release-notices', 200);
    const cancellationNotice = cancellationNotices.body.notices.find((notice) => (
      notice.resource_name === 'Tumbler 1'
      && notice.kind === 'cancellation'
      && notice.created_by_name === 'Bewohner Test'
    ));
    assert.ok(cancellationNotice);
    assert.equal(cancellationNotice.created_by_name, 'Bewohner Test');
    assert.equal(cancellationNotice.resource_id, tumblers[0].id);
    assert.equal(cancellationNotice.bookable, true);
    assert.equal(cancellationNotice.alreadyBooked, false);
    const noticeDetail = await expectStatus(user, `/api/release-notices/${cancellationNotice.id}`, 200);
    assert.equal(noticeDetail.body.notice.id, cancellationNotice.id);
    assert.equal(noticeDetail.body.notice.created_by_name, 'Bewohner Test');
    assert.equal(noticeDetail.body.notice.resource_id, tumblers[0].id);

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
      assert.ok(timelyRelease.body.message.includes('Bewohner Test'));
      const timelyNotices = await expectStatus(user, '/api/release-notices', 200);
      const timelyNotice = timelyNotices.body.notices.find((notice) => notice.resource_name === 'Tumbler 2');
      assert.ok(timelyNotice);
      assert.equal(timelyNotice.created_by_name, 'Bewohner Test');
      assert.equal(timelyNotice.resource_id, tumblers[1].id);
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
    const overview = await expectStatus(admin, '/api/admin/overview', 200);
    assert.equal(typeof overview.body.usersMissingEmail, 'number');
    await expectStatus(admin, '/api/admin/email-test', 409, { method: 'POST' });
    const pushDevices = await expectStatus(admin, '/api/admin/push-devices', 200);
    assert.equal(pushDevices.body.totalDevices, 1);
    assert.ok(pushDevices.body.users.some((item) => item.username === 'Bewohner Test' && item.devices === 1));
    const residentPushTest = await expectStatus(admin, '/api/admin/push-test', 200, {
      method: 'POST',
      body: JSON.stringify({ userId: resident.id })
    });
    assert.equal(residentPushTest.body.sent, 0);
    assert.equal(residentPushTest.body.failed, 1);
    await expectStatus(admin, '/api/admin/push-test', 404, {
      method: 'POST',
      body: JSON.stringify({ userId: 999999 })
    });

    const initialHouses = await expectStatus(admin, '/api/admin/houses', 200);
    assert.equal(initialHouses.body.houses.length, 1);
    const defaultHouseId = initialHouses.body.activeHouseId;
    await expectStatus(user, '/api/admin/houses', 403);
    await expectStatus(user, '/api/me/active-house', 403, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });

    const addedResource = await expectStatus(admin, '/api/admin/resources', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Trockenraum Reserve', type: 'drying_room' })
    });
    await expectStatus(admin, `/api/admin/resources/${addedResource.body.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Trockenraum Reserve', active: false, blockReason: 'Wartungstest' })
    });
    const adminResources = await expectStatus(admin, '/api/admin/resources', 200);
    assert.ok(adminResources.body.resources.some((resource) => (
      resource.id === addedResource.body.id && resource.active === 0 && resource.blocked_reason === 'Wartungstest'
    )));
    await expectStatus(admin, `/api/admin/resources/${addedResource.body.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Trockenraum Reserve', active: true })
    });

    const secondHouse = await expectStatus(admin, '/api/admin/houses', 201, {
      method: 'POST',
      body: JSON.stringify({ name: 'Maneggplatz 20', code: 'Testhaus 20 Neu' })
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
        houseCode: 'Testhaus 20 Neu',
        notifyReleases: true
      })
    });
    assert.equal(secondHouseRegistration.body.user.houseName, 'Maneggplatz 20');
    const secondWasher = secondHouseResources.body.resources.find((resource) => resource.type === 'washer');
    const secondHouseWasherBooking = await expectStatus(secondHouseUser, '/api/bookings', 201, {
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

    const secondHouseTumblers = secondHouseResources.body.resources.filter((resource) => resource.type === 'tumbler');
    await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Gesch\u00fctzter Tumbler',
        resourceId: secondHouseTumblers[0].id,
        weekday: 4,
        slot: '17:00-21:00'
      })
    });
    await expectStatus(admin, '/api/admin/fixed-bookings', 409, {
      method: 'POST',
      body: JSON.stringify({
        label: 'Nicht erlaubt',
        resourceId: secondHouseTumblers[1].id,
        weekday: 4,
        slot: '17:00-21:00'
      })
    });

    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    const isolatedDefaultBookings = await expectStatus(admin, `/api/bookings?date=${bookingDate}`, 200);
    assert.ok(!isolatedDefaultBookings.body.bookings.some((booking) => booking.username === 'Bewohner Haus 20'));
    const isolatedDefaultUsers = await expectStatus(admin, '/api/admin/users', 200);
    assert.ok(!isolatedDefaultUsers.body.users.some((item) => item.username === 'Bewohner Haus 20'));
    await expectStatus(admin, `/api/admin/users/${secondResident.id}/house`, 409, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: secondHouse.body.house.id })
    });
    await expectStatus(admin, `/api/bookings/${secondHouseWasherBooking.body.id}`, 200, { method: 'DELETE' });
    await expectStatus(admin, '/api/me/active-house', 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });
    await expectStatus(admin, `/api/admin/users/${secondResident.id}/house`, 200, {
      method: 'PUT',
      body: JSON.stringify({ houseId: defaultHouseId })
    });

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
    await expectStatus(admin, `/api/admin/users/${resident.id}/password`, 404, {
      method: 'PUT',
      body: JSON.stringify({ newPassword: 'Admin-Reset-2026!' })
    });
    await expectStatus(admin, `/api/admin/users/${resident.id}/password-reset`, 409, {
      method: 'POST'
    });
    await expectStatus(new ApiClient(), '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'Bewohner Test', password: 'Bewohner-Neu-2026!' })
    });

    const backup = await expectStatus(admin, '/api/admin/backup', 200);
    assert.ok(backup.body.length > 1000);
    assert.equal(backup.body.subarray(0, 15).toString(), 'SQLite format 3');
    const verifiedBackup = await expectStatus(admin, '/api/admin/backup/run', 200, { method: 'POST' });
    assert.equal(verifiedBackup.body.status.ok, true);
    const audit = await expectStatus(admin, '/api/admin/audit-log', 200);
    assert.ok(audit.body.entries.some((entry) => entry.action === 'resource.create'));
    assert.ok(audit.body.entries.some((entry) => entry.action === 'user.move'));
    const analytics = await expectStatus(admin, '/api/admin/analytics?days=30', 200);
    assert.ok(Array.isArray(analytics.body.byResource));
    assert.ok(Array.isArray(analytics.body.bySlot));
    await expectStatus(admin, '/api/admin/bookings', 400, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'falsch' })
    });
    const resetBookings = await expectStatus(admin, '/api/admin/bookings', 200, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'ALLE BUCHUNGEN' })
    });
    assert.ok(resetBookings.body.deleted >= 1);

    await expectStatus(admin, `/api/admin/houses/${secondHouse.body.house.id}`, 200, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Maneggplatz 20A' })
    });

    const apiLogout = await expectStatus(admin, '/api/logout', 200, { method: 'POST' });
    assert.match(apiLogout.response.headers.get('set-cookie') || '', /connect\.sid=;/);
    const apiLoggedOutSession = await expectStatus(admin, '/api/me', 200);
    assert.equal(apiLoggedOutSession.body.user, null);
    await expectStatus(admin, '/api/admin/users', 403);

    const formLogoutAdmin = new ApiClient();
    await expectStatus(formLogoutAdmin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin-Test-2026!' })
    });
    const formLogout = await expectStatus(formLogoutAdmin, '/logout', 303, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Origin: baseUrl,
        'Sec-Fetch-Site': 'same-origin'
      }
    });
    assert.equal(formLogout.response.headers.get('location'), '/login.html?loggedOut=1');
    assert.equal(formLogout.response.headers.get('cache-control'), 'no-store');
    assert.match(formLogout.response.headers.get('set-cookie') || '', /connect\.sid=;/);
    const loggedOutSession = await expectStatus(formLogoutAdmin, '/api/me', 200);
    assert.equal(loggedOutSession.body.user, null);
    const repeatedLogout = await expectStatus(formLogoutAdmin, '/logout', 303, {
      method: 'POST',
      redirect: 'manual'
    });
    assert.equal(repeatedLogout.response.headers.get('location'), '/login.html?loggedOut=1');

    const indexPage = await expectStatus(guest, '/index.html', 200);
    const indexHtml = indexPage.body.toString();
    assert.ok(indexHtml.includes('recordedIntroVideo'));
    assert.ok(indexHtml.includes('settingsOverlay'));
    assert.ok(indexHtml.includes('settingsSummary'));
    assert.ok(indexHtml.includes('Pers&ouml;nliche Einrichtung'));
    assert.ok(indexHtml.includes('etwa f&uuml;nfmin&uuml;tige Video'));
    assert.ok(indexHtml.includes('Absagen &amp; informieren'));
    assert.ok(indexHtml.includes('Waschpaket'));
    assert.ok(indexHtml.includes('passwordForm'));
    assert.ok(indexHtml.includes('user-admin-list'));
    assert.ok(indexHtml.includes('viewSwitcher'));
    assert.ok(indexHtml.includes('weekViewButton'));
    assert.ok(indexHtml.includes('monthViewButton'));
    assert.ok(indexHtml.includes('monthWeekdays'));
    assert.ok(!indexHtml.includes('calendarZoomOutButton'));
    assert.ok(indexHtml.includes('calendarDayDetails'));
    assert.ok(indexHtml.includes('calendarDayDetailsContent'));
    assert.ok(indexHtml.includes('calendarDayDetailsBackdrop'));
    assert.ok(indexHtml.includes('calendarDayDetailsActions'));
    assert.ok(indexHtml.includes('bookingFlowContent'));
    assert.ok(indexHtml.includes('bookingFlowSteps'));
    assert.ok(indexHtml.includes('bookingFlowNotice'));
    assert.ok(indexHtml.includes('data-booking-mode="time"'));
    assert.ok(indexHtml.includes('data-booking-mode="machine"'));
    assert.ok(indexHtml.indexOf('weekCalendar') < indexHtml.indexOf('bookingFlowContent'));
    assert.ok(indexHtml.indexOf('bookingFlowContent') < indexHtml.indexOf('schedule'));
    assert.ok(indexHtml.includes('adminSectionNav'));
    assert.ok(indexHtml.includes('data-admin-target="overview"'));
    assert.ok(indexHtml.includes('data-admin-target="house"'));
    assert.ok(indexHtml.includes('data-admin-target="fixed"'));
    assert.ok(indexHtml.includes('data-admin-target="people"'));
    assert.ok(indexHtml.includes('data-admin-target="analytics"'));
    assert.ok(indexHtml.includes('data-admin-target="system"'));
    assert.ok(indexHtml.includes('noticeJournal'));
    assert.ok(indexHtml.includes('resetBookingsButton'));
    assert.ok(indexHtml.includes('releaseNoticeOverlay'));
    assert.ok(indexHtml.includes('bookReleaseNoticeButton'));
    assert.ok(indexHtml.includes('action="/logout"'));
    assert.ok(indexHtml.includes('class="app-wordmark"'));
    assert.ok(indexHtml.includes('id="brandHouseName"'));
    assert.ok(!indexHtml.includes('/assets/gbmz-logo.svg'));
    const styles = await expectStatus(guest, '/styles.css', 200);
    const stylesText = styles.body.toString();
    assert.ok(stylesText.includes('.topbar .logout-form .ghost-button'));
    assert.ok(stylesText.includes('background: var(--night)'));
    assert.ok(stylesText.includes('.app-wordmark'));
    assert.ok(stylesText.includes('.week-calendar.month-calendar'));
    assert.ok(stylesText.includes('.calendar-status-list'));
    assert.ok(stylesText.includes('.calendar-day-details'));
    assert.ok(stylesText.includes('.calendar-day.is-previewed'));
    assert.ok(stylesText.includes('@keyframes calendar-preview-in'));
    assert.ok(stylesText.includes('.booking-workspace'));
    assert.ok(stylesText.includes('.booking-flow-steps'));
    assert.ok(stylesText.includes('#statusText:not(:empty)'));
    assert.ok(stylesText.includes('.booking-flow-notice'));
    assert.ok(stylesText.includes('.flow-option-time'));
    assert.ok(stylesText.includes('.booking-mode-switch'));
    assert.ok(stylesText.includes('.flow-time-choice'));
    assert.ok(stylesText.includes('.settings-summary'));
    assert.ok(stylesText.includes('.settings-step'));
    assert.ok(stylesText.includes('.notice-journal'));
    assert.ok(stylesText.includes('.analytics-grid'));
    assert.ok(stylesText.includes('.release-notice-modal'));
    assert.ok(stylesText.includes('.release-notice-facts'));
    assert.match(stylesText, /\.main-column\s*\{\s*align-content:\s*start;/);
    assert.match(stylesText, /\.intro-panel\s*\{\s*align-self:\s*start;/);
    const appScript = await expectStatus(guest, '/app.js', 200);
    const appScriptText = appScript.body.toString();
    assert.ok(appScriptText.includes('/api/booking-package'));
    assert.ok(appScriptText.includes('Anzahl Waschmaschinen waehlen'));
    assert.ok(appScriptText.includes('canManageAccount'));
    assert.ok(appScriptText.includes('setAdminSection'));
    assert.ok(appScriptText.includes("calendarView === 'month' ? 42 : 7"));
    assert.ok(appScriptText.includes('formatCalendarMonth'));
    assert.ok(!appScriptText.includes('waschzeit-calendar-zoom'));
    assert.ok(appScriptText.includes('scheduleCalendarPreview'));
    assert.ok(appScriptText.includes('openCalendarPreview'));
    assert.ok(appScriptText.includes('calendarPointerFocus'));
    assert.ok(appScriptText.includes('calendarSheetDragStart'));
    assert.ok(appScriptText.includes('renderCalendarStatusRows'));
    assert.ok(appScriptText.includes('renderCalendarDayDetails'));
    assert.ok(appScriptText.includes('startCalendarWasherBooking'));
    assert.ok(appScriptText.includes('/api/booking-options'));
    assert.ok(appScriptText.includes('renderWasherStep'));
    assert.ok(appScriptText.includes('renderTimeStep'));
    assert.ok(appScriptText.includes('/api/me/booking-mode'));
    assert.ok(appScriptText.includes('renderReviewStep'));
    assert.ok(appScriptText.includes('showBookingFlowStatus'));
    assert.ok(appScriptText.includes('Anderen Trockenraum w\\u00e4hlen oder entfernen'));
    assert.ok(appScriptText.includes('visibleRooms = selectedRoom'));
    assert.ok(appScriptText.includes('logoutInProgress'));
    assert.ok(appScriptText.includes('Reset-Link senden'));
    assert.ok(!appScriptText.includes('user-password-reset-form'));
    assert.ok(appScriptText.includes('document.title = `WaschZeit | ${currentUser.houseName}`'));
    assert.ok(appScriptText.includes('openSettings(!settingsCompleted())'));
    assert.ok(appScriptText.includes('renderSettingsSummary'));
    assert.ok(appScriptText.includes('/api/admin/analytics?days=30'));
    assert.ok(appScriptText.includes('resetAllBookings'));
    assert.ok(appScriptText.includes('openReleaseNoticeFromUrl'));
    assert.ok(appScriptText.includes('/api/release-notices/${noticeId}'));
    assert.ok(appScriptText.includes('bookActiveReleaseNotice'));
    const video = await expectStatus(guest, '/assets/intro/waschplan-einfuehrung.mp4', 206, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.equal(video.response.headers.get('content-type'), 'video/mp4');
    assert.equal(video.body.length, 1024);
    const captions = await expectStatus(guest, '/assets/intro/waschplan-einfuehrung-de.vtt', 200);
    const captionText = captions.body.toString();
    assert.ok(captionText.startsWith('WEBVTT'));
    assert.ok(captionText.includes('Waschpaket buchen'));
    assert.ok(captionText.includes('drei beschriftete Farbstreifen'));
    assert.ok(captionText.includes('Standardm\u00e4\u00dfig steht die Zeit im Mittelpunkt'));
    assert.ok(captionText.includes('Wenn dir eine bestimmte Maschine wichtiger ist'));
    assert.ok(captionText.includes('App merkt sich deine Auswahl im Benutzerkonto'));
    assert.ok(captionText.includes('Erst nach der Waschmaschinenwahl'));
    const privacyPage = await expectStatus(guest, '/privacy.html', 200);
    assert.ok(privacyPage.body.toString().includes('Welche Daten der Waschplan verwendet'));
    assert.ok(!privacyPage.body.toString().includes('/assets/gbmz-logo.svg'));
    const loginPage = await expectStatus(guest, '/login.html', 200);
    assert.ok(loginPage.body.toString().includes('Wasch<strong>Zeit</strong>'));
    assert.ok(!loginPage.body.toString().includes('/assets/gbmz-logo.svg'));
    await expectStatus(guest, '/reset.html?token=test', 200);

    await verifySmtpDelivery();
    await verifyProductionRecoveryStartup();

    console.log(JSON.stringify({
      ok: true,
      checks: {
        authentication: true,
        adminLogout: true,
        legacySessionHydration: true,
        passwordRecovery: true,
        emailPreferences: true,
        originProtection: true,
        privacyControls: true,
        bookingRules: true,
        smartCalendar: true,
        smartPackage: true,
        multiHouseIsolation: true,
        superadmin: true,
        fixedBookings: true,
        adminAnalytics: true,
        bookingReset: true,
        accountManagement: true,
        backup: true,
        verifiedBackup: true,
        adminAudit: true,
        narratedVideo: true,
        releaseWindow: true,
        cancellationNotifications: true,
        concurrentBookingProtection: true,
        smtpDelivery: true,
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
