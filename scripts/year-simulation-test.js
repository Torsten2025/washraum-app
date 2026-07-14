const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const port = 36000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `waschplan-year-${process.pid}.sqlite`);
const output = [];
const slots = ['07:00-12:00', '12:00-17:00', '17:00-21:00'];

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

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateString(date);
}

function nextMonday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const distance = ((1 - date.getDay() + 7) % 7) || 7;
  date.setDate(date.getDate() + distance);
  return dateString(date);
}

function previousMonday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const distance = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - distance);
  return dateString(date);
}

async function expectStatus(client, urlPath, expectedStatus, options = {}) {
  const result = await client.request(urlPath, options);
  assert.equal(
    result.response.status,
    expectedStatus,
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
  throw new Error(`Jahressimulation: Testserver nicht erreichbar.\n${output.join('')}`);
}

function payloadFor({ washer, dryingRoom, tumbler, date, slot }) {
  const items = [
    { resourceId: washer.id, date, slot },
    { resourceId: dryingRoom.id, date, slot }
  ];
  if (tumbler) items.push({ resourceId: tumbler.id, date, slot });
  return { items };
}

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      HOUSE_CODE: 'Jahrestest 18',
      SEED_ADMIN_NAME: 'jahrestest-admin',
      SEED_ADMIN_PASSWORD: 'Jahrestest-Admin-2026!',
      SESSION_SECRET: 'jahrestest-session-secret-at-least-32-characters',
      AUTO_BACKUP: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => output.push(chunk.toString()));
  server.stderr.on('data', (chunk) => output.push(chunk.toString()));

  let db;
  const startedAt = Date.now();
  try {
    await waitForServer();
    const admin = new ApiClient();
    await expectStatus(admin, '/api/login', 200, {
      method: 'POST',
      body: JSON.stringify({
        username: 'jahrestest-admin',
        password: 'Jahrestest-Admin-2026!'
      })
    });

    const resourceResult = await expectStatus(admin, '/api/resources', 200);
    const washers = resourceResult.body.resources.filter((resource) => resource.type === 'washer');
    const dryingRooms = resourceResult.body.resources.filter((resource) => resource.type === 'drying_room');
    const tumblers = resourceResult.body.resources.filter((resource) => resource.type === 'tumbler');
    assert.equal(washers.length, 3);
    assert.equal(dryingRooms.length, 3);
    assert.equal(tumblers.length, 2);

    await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
      method: 'POST',
      body: JSON.stringify({
        resourceId: washers[0].id,
        weekday: 2,
        slot: slots[0],
        label: 'Geschuetzter Dauertermin'
      })
    });

    const residents = [];
    for (let index = 0; index < 20; index += 1) {
      const client = new ApiClient();
      const username = `Jahrestest Person ${String(index + 1).padStart(2, '0')}`;
      await expectStatus(client, '/api/register', 201, {
        method: 'POST',
        body: JSON.stringify({
          username,
          email: `jahrestest-${index + 1}@example.test`,
          password: `Jahrestest-${index + 1}-Sicher!`,
          houseCode: 'Jahrestest 18',
          notifyReleases: true
        })
      });
      residents.push({ client, username });
    }

    db = new Database(databasePath);
    db.pragma('busy_timeout = 5000');
    const templateMonday = nextMonday();
    const historyStart = addDays(previousMonday(), -52 * 7);
    const moveGroupToHistory = db.prepare('UPDATE bookings SET booking_date = ? WHERE group_id = ?');
    const expectedWashSlots = new Map();
    let packageCount = 0;
    let fixedConflictChecked = false;

    for (let week = 0; week < 52; week += 1) {
      const createdGroups = [];
      for (let residentIndex = 0; residentIndex < residents.length; residentIndex += 1) {
        const pairSlot = Math.floor(residentIndex / 2);
        const dayOffset = Math.floor(pairSlot / slots.length);
        const slot = slots[pairSlot % slots.length];
        const date = addDays(templateMonday, dayOffset);
        const historicalDate = addDays(historyStart, (week * 7) + dayOffset);
        const isFixedWindow = dayOffset === 1 && slot === slots[0];
        const positionInPair = residentIndex % 2;
        const washer = isFixedWindow
          ? washers[positionInPair + 1]
          : washers[positionInPair];
        const dryingRoom = dryingRooms[positionInPair];
        const tumbler = positionInPair === 0 ? tumblers[0] : null;

        if (isFixedWindow && !fixedConflictChecked) {
          await expectStatus(residents[residentIndex].client, '/api/booking-package', 409, {
            method: 'POST',
            body: JSON.stringify(payloadFor({
              washer: washers[0], dryingRoom, tumbler: null, date, slot
            }))
          });
          fixedConflictChecked = true;
        }

        const booking = await expectStatus(residents[residentIndex].client, '/api/booking-package', 201, {
          method: 'POST',
          body: JSON.stringify(payloadFor({ washer, dryingRoom, tumbler, date, slot }))
        });
        assert.ok(booking.body.groupId);
        assert.equal(booking.body.created.length, tumbler ? 3 : 2);
        createdGroups.push({ groupId: booking.body.groupId, historicalDate });
        expectedWashSlots.set(residents[residentIndex].username, slot);
        packageCount += 1;
      }

      const archiveWeek = db.transaction((groups) => {
        for (const group of groups) moveGroupToHistory.run(group.historicalDate, group.groupId);
      });
      archiveWeek(createdGroups);

      if ([0, 13, 26, 39, 51].includes(week)) {
        const sampleDate = addDays(historyStart, week * 7);
        const calendar = await expectStatus(residents[0].client, `/api/bookings?date=${sampleDate}`, 200);
        assert.ok(calendar.body.bookings.length >= 2, `Keine Buchungen in Stichprobenwoche ${week + 1}`);
      }
    }

    assert.equal(packageCount, 1040);
    assert.equal(fixedConflictChecked, true);

    const totals = db.prepare(`
      SELECT r.type, COUNT(*) AS count
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      GROUP BY r.type
    `).all().reduce((result, row) => ({ ...result, [row.type]: row.count }), {});
    assert.equal(totals.washer, 1040);
    assert.equal(totals.drying_room, 1040);
    assert.equal(totals.tumbler, 520);

    const collisions = db.prepare(`
      SELECT resource_id, booking_date, slot, COUNT(*) AS count
      FROM bookings
      GROUP BY resource_id, booking_date, slot
      HAVING COUNT(*) > 1
    `).all();
    assert.equal(collisions.length, 0, 'Die Jahressimulation hat eine doppelte Ressourcenbelegung erzeugt.');

    const washerRuleViolations = db.prepare(`
      SELECT b.user_id, b.booking_date, COUNT(DISTINCT b.slot) AS slot_count
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.type = 'washer'
      GROUP BY b.user_id, b.booking_date
      HAVING COUNT(DISTINCT b.slot) > 1
    `).all();
    assert.equal(washerRuleViolations.length, 0);

    const tumblerCapacityViolations = db.prepare(`
      SELECT b.booking_date, b.slot, COUNT(*) AS booked
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.type = 'tumbler'
      GROUP BY b.booking_date, b.slot
      HAVING COUNT(*) > 1
    `).all();
    assert.equal(tumblerCapacityViolations.length, 0);

    const historyCoverage = db.prepare(`
      SELECT COUNT(DISTINCT user_id) AS users, COUNT(DISTINCT booking_date) AS days
      FROM bookings
    `).get();
    assert.equal(historyCoverage.users, 20);
    assert.ok(historyCoverage.days >= 200);

    for (const resident of residents) {
      const result = await expectStatus(resident.client, '/api/recommendation', 200);
      const recommendation = result.body.recommendation;
      assert.equal(recommendation.kind, 'package');
      const washerComponent = recommendation.components.find((item) => item.type === 'washer');
      const dryingComponent = recommendation.components.find((item) => item.type === 'drying_room');
      assert.ok(washerComponent?.bookings?.length === 1);
      assert.ok(dryingComponent?.bookingOptions?.length >= 1);
      assert.equal(recommendation.slot, expectedWashSlots.get(resident.username));
    }

    const finalResult = await expectStatus(residents[0].client, '/api/recommendation', 200);
    const finalRecommendation = finalResult.body.recommendation;
    const finalItems = finalRecommendation.components.flatMap((component) => {
      if (component.type === 'drying_room') {
        const option = component.bookingOptions.find((item) => item.id === 'short')
          || component.bookingOptions[0];
        return option.bookings;
      }
      return component.bookings;
    });
    const finalPackage = await expectStatus(residents[0].client, '/api/booking-package', 201, {
      method: 'POST',
      body: JSON.stringify({ items: finalItems })
    });
    const groupedBookings = await expectStatus(residents[0].client, '/api/my-bookings', 200);
    assert.equal(
      groupedBookings.body.bookings.filter((booking) => booking.group_id === finalPackage.body.groupId).length,
      finalPackage.body.created.length
    );
    await expectStatus(
      residents[0].client,
      `/api/booking-groups/${finalPackage.body.groupId}/cancel-notify`,
      200,
      { method: 'POST' }
    );

    const fixedBookings = await expectStatus(admin, '/api/admin/fixed-bookings', 200);
    assert.equal(fixedBookings.body.fixedBookings.length, 1);

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(JSON.stringify({
      ok: true,
      residents: residents.length,
      simulatedWeeks: 52,
      washPackages: packageCount,
      bookings: totals,
      historicalDays: historyCoverage.days,
      protectedBookings: fixedBookings.body.fixedBookings.length,
      elapsedSeconds
    }, null, 2));
  } finally {
    if (db) db.close();
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
  console.error(error);
  process.exitCode = 1;
});
