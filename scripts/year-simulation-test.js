const assert = require('assert/strict');
process.env.ALLOW_LEGACY_HOUSE_REGISTRATION = 'true';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const port = 36000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `waschplan-year-${process.pid}.sqlite`);
const output = [];
const slots = ['07:00-12:00', '12:00-17:00', '17:00-21:00'];
const simulatedWeeks = 52;
const totalHouseCount = 6;
const totalResidentCount = 100;

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

    db = new Database(databasePath);
    db.pragma('busy_timeout = 5000');
    const seededResidentPassword = 'Jahrestest-Skalierung-Sicher!';
    const seededResidentHash = bcrypt.hashSync(seededResidentPassword, 10);
    const insertSeededResident = db.prepare(`
      INSERT INTO users (
        username, password_hash, role, active, email, notify_releases,
        house_id, is_superadmin, email_verified
      ) VALUES (?, ?, 'user', 1, ?, 1, ?, 0, 1)
    `);

    const houseResult = await expectStatus(admin, '/api/admin/houses', 200);
    const defaultHouse = houseResult.body.houses.find((house) => house.id === houseResult.body.activeHouseId);
    assert.ok(defaultHouse);
    const houses = [{ ...defaultHouse, code: 'Jahrestest 18' }];
    for (let index = 1; index < totalHouseCount; index += 1) {
      const created = await expectStatus(admin, '/api/admin/houses', 201, {
        method: 'POST',
        body: JSON.stringify({
          name: `Jahrestest Haus ${index + 1}`,
          code: `Jahrestest Code ${index + 1}`
        })
      });
      houses.push({ ...created.body.house, code: `Jahrestest Code ${index + 1}` });
    }
    assert.equal(houses.length, totalHouseCount);

    const residents = [];
    let residentNumber = 0;
    for (let houseIndex = 0; houseIndex < houses.length; houseIndex += 1) {
      const house = houses[houseIndex];
      await expectStatus(admin, '/api/me/active-house', 200, {
        method: 'PUT',
        body: JSON.stringify({ houseId: house.id })
      });
      const resourceResult = await expectStatus(admin, '/api/resources', 200);
      house.washers = resourceResult.body.resources.filter((resource) => resource.type === 'washer');
      house.dryingRooms = resourceResult.body.resources.filter((resource) => resource.type === 'drying_room');
      house.tumblers = resourceResult.body.resources.filter((resource) => resource.type === 'tumbler');
      assert.equal(house.washers.length, 3);
      assert.equal(house.dryingRooms.length, 3);
      assert.equal(house.tumblers.length, 2);

      await expectStatus(admin, '/api/admin/fixed-bookings', 201, {
        method: 'POST',
        body: JSON.stringify({
          resourceId: house.washers[0].id,
          weekday: 2,
          slot: slots[0],
          label: `Geschuetzter Dauertermin Haus ${houseIndex + 1}`
        })
      });

      const houseResidentCount = Math.floor(totalResidentCount / totalHouseCount)
        + (houseIndex < totalResidentCount % totalHouseCount ? 1 : 0);
      house.residents = [];
      for (let index = 0; index < houseResidentCount; index += 1) {
        residentNumber += 1;
        const client = new ApiClient();
        const username = `Jahrestest Person ${String(residentNumber).padStart(3, '0')}`;
        const email = `jahrestest-${residentNumber}@example.test`;
        if (residentNumber <= 30) {
          await expectStatus(client, '/api/register', 201, {
            method: 'POST',
            body: JSON.stringify({
              username,
              email,
              password: `Jahrestest-${residentNumber}-Sicher!`,
              houseCode: house.code,
              notifyReleases: true
            })
          });
        } else {
          insertSeededResident.run(username, seededResidentHash, email, house.id);
          await expectStatus(client, '/api/login', 200, {
            method: 'POST',
            body: JSON.stringify({ username, password: seededResidentPassword })
          });
        }
        const resident = { client, username, houseId: house.id };
        house.residents.push(resident);
        residents.push(resident);
      }
    }
    assert.equal(residents.length, totalResidentCount);

    const templateMonday = nextMonday();
    const historyStart = addDays(previousMonday(), -simulatedWeeks * 7);
    const moveGroupToHistory = db.prepare('UPDATE bookings SET booking_date = ? WHERE group_id = ?');
    const expectedWashSlots = new Map();
    let packageCount = 0;
    const fixedConflictHouses = new Set();

    for (let week = 0; week < simulatedWeeks; week += 1) {
      const createdGroups = [];
      for (const house of houses) {
        for (let residentIndex = 0; residentIndex < house.residents.length; residentIndex += 1) {
          const resident = house.residents[residentIndex];
          const pairSlot = Math.floor(residentIndex / 2);
          const dayOffset = Math.floor(pairSlot / slots.length);
          const slot = slots[pairSlot % slots.length];
          const date = addDays(templateMonday, dayOffset);
          const historicalDate = addDays(historyStart, (week * 7) + dayOffset);
          const isFixedWindow = dayOffset === 1 && slot === slots[0];
          const positionInPair = residentIndex % 2;
          const washer = isFixedWindow
            ? house.washers[positionInPair + 1]
            : house.washers[positionInPair];
          const dryingRoom = house.dryingRooms[positionInPair];
          const tumbler = positionInPair === 0 ? house.tumblers[0] : null;

          if (isFixedWindow && !fixedConflictHouses.has(house.id)) {
            await expectStatus(resident.client, '/api/booking-package', 409, {
              method: 'POST',
              body: JSON.stringify(payloadFor({
                washer: house.washers[0], dryingRoom, tumbler: null, date, slot
              }))
            });
            fixedConflictHouses.add(house.id);
          }

          const booking = await expectStatus(resident.client, '/api/booking-package', 201, {
            method: 'POST',
            body: JSON.stringify(payloadFor({ washer, dryingRoom, tumbler, date, slot }))
          });
          assert.ok(booking.body.groupId);
          assert.equal(booking.body.created.length, tumbler ? 3 : 2);
          createdGroups.push({ groupId: booking.body.groupId, historicalDate });
          expectedWashSlots.set(resident.username, slot);
          packageCount += 1;
        }
      }

      const archiveWeek = db.transaction((groups) => {
        for (const group of groups) moveGroupToHistory.run(group.historicalDate, group.groupId);
      });
      archiveWeek(createdGroups);

      if ([0, 13, 26, 39, 51].includes(week)) {
        const sampleDate = addDays(historyStart, week * 7);
        for (const house of houses) {
          const calendar = await expectStatus(house.residents[0].client, `/api/bookings?date=${sampleDate}`, 200);
          assert.ok(calendar.body.bookings.length >= 2, `Keine Buchungen fuer Haus ${house.id} in Stichprobenwoche ${week + 1}`);
          const houseUsernames = new Set(house.residents.map((resident) => resident.username));
          assert.ok(calendar.body.bookings.every((booking) => booking.is_fixed || houseUsernames.has(booking.username)));
        }
      }
    }

    const expectedPackageCount = totalResidentCount * simulatedWeeks;
    assert.equal(packageCount, expectedPackageCount);
    assert.equal(fixedConflictHouses.size, totalHouseCount);

    const totals = db.prepare(`
      SELECT r.type, COUNT(*) AS count
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      GROUP BY r.type
    `).all().reduce((result, row) => ({ ...result, [row.type]: row.count }), {});
    assert.equal(totals.washer, expectedPackageCount);
    assert.equal(totals.drying_room, expectedPackageCount);
    const expectedTumblerBookings = houses.reduce(
      (sum, house) => sum + Math.ceil(house.residents.length / 2),
      0
    ) * simulatedWeeks;
    assert.equal(totals.tumbler, expectedTumblerBookings);

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
      SELECT r.house_id, b.booking_date, b.slot, COUNT(*) AS booked
      FROM bookings b
      JOIN resources r ON r.id = b.resource_id
      WHERE r.type = 'tumbler'
      GROUP BY r.house_id, b.booking_date, b.slot
      HAVING COUNT(*) > 1
    `).all();
    assert.equal(tumblerCapacityViolations.length, 0);

    const historyCoverage = db.prepare(`
      SELECT COUNT(DISTINCT user_id) AS users, COUNT(DISTINCT booking_date) AS days
      FROM bookings
    `).get();
    assert.equal(historyCoverage.users, totalResidentCount);
    assert.ok(historyCoverage.days >= 150);

    const crossHouseViolations = db.prepare(`
      SELECT COUNT(*) AS count
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN resources r ON r.id = b.resource_id
      WHERE u.house_id <> r.house_id
    `).get();
    assert.equal(crossHouseViolations.count, 0);
    const populatedHouses = db.prepare(`
      SELECT COUNT(DISTINCT house_id) AS count
      FROM users
      WHERE role = 'user' AND username LIKE 'Jahrestest Person %'
    `).get();
    assert.equal(populatedHouses.count, totalHouseCount);

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

    let protectedBookings = 0;
    for (const house of houses) {
      await expectStatus(admin, '/api/me/active-house', 200, {
        method: 'PUT',
        body: JSON.stringify({ houseId: house.id })
      });
      const fixedBookings = await expectStatus(admin, '/api/admin/fixed-bookings', 200);
      assert.equal(fixedBookings.body.fixedBookings.length, 1);
      protectedBookings += fixedBookings.body.fixedBookings.length;
    }

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(JSON.stringify({
      ok: true,
      houses: houses.length,
      residents: residents.length,
      simulatedWeeks,
      washPackages: packageCount,
      bookings: totals,
      historicalDays: historyCoverage.days,
      protectedBookings,
      crossHouseViolations: crossHouseViolations.count,
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
