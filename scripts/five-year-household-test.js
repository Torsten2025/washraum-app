'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '..');
const slots = ['07:00-12:00', '12:00-17:00', '17:00-21:00'];
const password = 'Synthetic-Five-Year-2027!';
const counters = { requests: 0, packages: 0, cancellations: 0, collisionsRejected: 0,
  foreignHouseRejected: 0, sharedPartyChecks: 0, quotaRejected: 0, boundMovesRejected: 0,
  legacyMoves: 0, roleRevocationsOnMove: 0, departures: 0, returns: 0,
  expiredCardsRejected: 0, qrPartners: 0, accountExports: 0, pastSlotsRejected: 0,
  sessionRevocations: 0, calendarChecks: 0, releases: 0, absentAccountWeeks: 0,
  legacyBookingDenied: 0, pendingMoveRejected: 0, historicalMovePreserved: 0 };
const models = [
  ['Single', 1], ['Paar', 2], ['Alleinerziehend mit Kindern (ein erwachsenes Konto)', 1],
  ['Eltern mit Kindern (zwei erwachsene Konten)', 2], ['Dreier-WG', 3],
  ['Mehrgenerationenhaushalt', 3], ['Patchwork mit drei erwachsenen Nutzern', 3],
  ['WG mit befristeter Abwesenheit', 3]
];
let baseUrl;
class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async request(route, method = 'GET', body) {
    counters.requests++;
    const response = await fetch(baseUrl + route, { method, headers: {
      Cookie: this.cookie, 'Content-Type': 'application/json'
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.headers.get('set-cookie')) this.cookie = response.headers.get('set-cookie').split(';')[0];
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  }
  async expect(route, statuses, method, body) {
    const result = await this.request(route, method, body);
    assert.ok([].concat(statuses).includes(result.status),
      `${this.name} ${method || 'GET'} ${route} expected ${statuses} got ${result.status}: ${JSON.stringify(result.data)}`);
    return result.data;
  }
  async login() { return this.expect('/api/login', 200, 'POST', { username: this.name, password, rememberDevice: true }); }
}
function dayPlus(date, days) { return new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10); }
async function freePort() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  return port;
}
async function main() {
  const began = Date.now();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-five-year-'));
  const databasePath = path.join(temporary, 'synthetic.sqlite');
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['--require', path.join(__dirname, 'five-year-test-clock.cjs'), 'server.js'], {
    cwd: root, env: { ...process.env, NODE_ENV: 'development', APP_ENV: 'development',
      WZ_FIVE_YEAR_TEST: 'synthetic-local-only', PORT: String(port), DB_PATH: databasePath,
      SESSION_SECRET: 'synthetic-five-year-session-secret-never-for-production',
      SEED_ADMIN_NAME: 'five-year-superadmin', SEED_ADMIN_PASSWORD: password,
      HOUSE_CODE: 'Synthetic Five Year House', PUBLIC_APP_URL: baseUrl,
      EMAIL_ENABLED: 'false', PUSH_ENABLED: 'false', BACKUP_ENABLED: 'false', AUTO_BACKUP: 'false',
      AGENT_TEST_FIXTURE_ENABLED: 'false', ALLOW_LEGACY_HOUSE_REGISTRATION: 'false'
    }, stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  let logs = ''; child.stdout.on('data', c => { logs += c; }); child.stderr.on('data', c => { logs += c; });
  let db;
  let clockId = 0;
  async function clock(iso) {
    const id = ++clockId;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('clock ack timeout')), 5000);
      const listener = message => { if (message?.id === id) { clearTimeout(timer); child.off('message', listener); resolve(); } };
      child.on('message', listener); child.send({ type: 'five-year-clock', id, iso });
    });
  }
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(baseUrl + '/api/health')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, logs);
    db = new Database(databasePath); db.pragma('busy_timeout=5000');
    const admin = new Client('five-year-superadmin'); await admin.login();
    const listing = await admin.expect('/api/admin/houses', 200);
    const houses = [listing.houses.find(h => h.id === listing.activeHouseId)];
    for (let i = 1; i < 3; i++) houses.push((await admin.expect('/api/admin/houses', 201, 'POST', {
      name: `Five Year House ${i + 1}`, code: `Five Year House Code ${i + 1}`
    })).house);
    async function select(house) { await admin.expect('/api/me/active-house', 200, 'PUT', { houseId: house.id }); }
    for (const house of houses) {
      await select(house);
      let resources = (await admin.expect('/api/resources', 200)).resources;
      if (!resources.length) {
        for (const type of ['washer', 'drying_room', 'tumbler']) for (let i = 0; i < 3; i++) {
          await admin.expect('/api/admin/resources', 201, 'POST', { name: `Synthetic ${type} ${i + 1}`, type });
        }
        resources = (await admin.expect('/api/resources', 200)).resources;
      }
      house.washers = resources.filter(r => r.type === 'washer');
      house.dryers = resources.filter(r => r.type === 'drying_room');
      house.tumblers = resources.filter(r => r.type === 'tumbler');
    }
    const households = [];
    const residents = [];
    for (let i = 0; i < models.length; i++) {
      const house = houses[i % 3]; await select(house);
      const created = await admin.expect('/api/admin/apartments/access-card', 201, 'POST', {
        label: `Synthetic Apartment ${i + 1}`, displayName: `Synthetic Family ${i + 1}`
      });
      const family = { model: models[i][0], house, apartmentId: created.apartment.id, members: [], index: i };
      for (let member = 0; member < models[i][1]; member++) {
        const client = new Client('pending');
        let activated;
        if (member === 0) activated = await client.expect('/api/access-cards/activate', 201, 'POST', {
          accessId: created.accessCard.accessId, activationCode: created.accessCard.activationCode,
          password, passwordConfirmation: password, rememberDevice: true
        });
        else {
          const pairing = await family.members[0].expect('/api/me/device-code', 201, 'POST');
          activated = await client.expect('/api/device-login', 200, 'POST', {
            deviceCode: pairing.code, password, passwordConfirmation: password, email: ''
          });
          counters.qrPartners++;
        }
        client.name = activated.user.username; client.userId = activated.user.id; client.active = true;
        await client.login(); family.members.push(client); residents.push(client);
      }
      households.push(family);
    }
    // Two deliberately unbound legacy fixtures exercise the documented real move API.
    // They are not silently attached/detached by SQL to fake a supported family move.
    const legacy = [];
    for (let i = 0; i < 2; i++) {
      const client = new Client(`five-year-legacy-${i + 1}`);
      if (i === 0) {
        // Reuse the development server's sole synthetic seed resident.
        client.userId = db.prepare("SELECT id FROM users WHERE username='user'").get().id;
        db.prepare('UPDATE users SET username=?,password_hash=?,house_id=? WHERE id=?')
          .run(client.name, bcrypt.hashSync(password, 10), houses[i].id, client.userId);
      } else {
        client.userId = Number(db.prepare("INSERT INTO users(username,password_hash,role,house_id,active) VALUES (?,?,'user',?,1)")
          .run(client.name, bcrypt.hashSync(password, 10), houses[i].id).lastInsertRowid);
      }
      client.house = houses[i]; await client.login(); legacy.push(client); residents.push(client);
    }
    assert.equal(residents.length, 20);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE is_superadmin=0").get().n, 20);
    // Two pure technical house-admin fixtures are additional to the 20 residents.
    const houseAdmins = [];
    for (let i = 0; i < 2; i++) {
      const client = new Client(`five-year-houseadmin-${i + 1}`);
      const id = Number(db.prepare("INSERT INTO users(username,password_hash,role,house_id,active) VALUES (?,?,'admin',?,1)")
        .run(client.name, bcrypt.hashSync(password, 10), houses[i].id).lastInsertRowid);
      db.prepare("INSERT INTO user_house_roles(user_id,house_id,role) VALUES (?,?,'house_admin')").run(id, houses[i].id);
      await client.login(); houseAdmins.push(client);
    }
    await select(houses[0]);
    const expiryCard = await admin.expect(`/api/admin/apartments/${households[0].apartmentId}/access-card`, 201, 'POST');
    const expiryToken = new URL(expiryCard.accessCard.activationUrl).searchParams.get('access');
    const years = {};
    let weeks = 0;
    for (let monday = '2027-01-04'; monday <= '2031-12-31'; monday = dayPlus(monday, 7), weeks++) {
      await clock(monday + 'T00:05:00Z');
      const year = monday.slice(0, 4);
      if (!years[year]) years[year] = { weeks: 0, packages: 0, moves: 0 };
      years[year].weeks++;
      for (const client of [admin, ...residents, ...houseAdmins]) {
        if (client.active === false) {
          counters.absentAccountWeeks++;
          await client.expect('/api/my-bookings', 401);
          await client.expect('/api/login', 403, 'POST', { username: client.name, password });
          continue;
        }
        // Monthly activity renews all devices; ordinary weekly booking requests
        // exercise the same sessions between explicit renewals.
        if (weeks % 4 === 0) await client.expect('/api/session/keepalive', 200, 'POST');
      }
      assert.equal((await residents[0].expect('/api/me', 200)).session.rememberDevice, true);
      if (weeks === 1) {
        await new Client('guest').expect(`/api/access-cards/${expiryToken}`, 404); counters.expiredCardsRejected++;
      }
      if (weeks % 13 === 0) {
        const family = households[7]; const departed = family.members[2];
        await select(family.house);
        await admin.expect(`/api/admin/users/${departed.userId}/status`, 200, 'PUT', { active: false }); counters.departures++;
        departed.active = false;
        assert.equal((await departed.expect('/api/me', 200)).user, null); counters.sessionRevocations++;
        await departed.expect('/api/login', 403, 'POST', { username: departed.name, password });
        await admin.expect(`/api/admin/users/${family.members[0].userId}/house`, 409, 'PUT', { houseId: houses[(family.index + 1) % 3].id });
        counters.boundMovesRejected++;
        for (const moving of legacy) {
          await select(moving.house);
          await admin.expect(`/api/admin/users/${moving.userId}/role`, 200, 'PUT', { role: 'admin' });
          await moving.login();
          const target = houses[(houses.indexOf(moving.house) + 1) % 3];
          // Unbound residents cannot create normal bookings. Historical legacy
          // records are therefore an explicit SQL fixture, NOT an API success.
          await moving.expect('/api/bookings', [403, 409], 'POST', {
            resourceId: moving.house.washers[2].id, date: dayPlus(monday, 2), slot: slots[0]
          }); counters.legacyBookingDenied++;
          const history = Number(db.prepare('INSERT INTO bookings(user_id,resource_id,booking_date,slot) VALUES (?,?,?,?)')
            .run(moving.userId, moving.house.washers[2].id, dayPlus(monday, -2), slots[legacy.indexOf(moving)]).lastInsertRowid);
          const pending = Number(db.prepare('INSERT INTO bookings(user_id,resource_id,booking_date,slot) VALUES (?,?,?,?)')
            .run(moving.userId, moving.house.washers[2].id, dayPlus(monday, 2), slots[legacy.indexOf(moving)]).lastInsertRowid);
          await admin.expect(`/api/admin/users/${moving.userId}/house`, 409, 'PUT', { houseId: target.id }); counters.pendingMoveRejected++;
          await admin.expect(`/api/bookings/${pending}`, 200, 'DELETE');
          await admin.expect(`/api/admin/users/${moving.userId}/house`, 200, 'PUT', { houseId: target.id });
          counters.legacyMoves++; years[year].moves++;
          assert.equal((await moving.expect('/api/me', 200)).user, null); counters.sessionRevocations++;
          await moving.login();
          const state = (await moving.expect('/api/me', 200)).user;
          assert.equal(state.houseId, target.id); assert.equal(state.role, 'user');
          assert.equal(db.prepare('SELECT COUNT(*) n FROM user_house_roles WHERE user_id=?').get(moving.userId).n, 0);
          counters.roleRevocationsOnMove++; moving.house = target;
          assert.ok(db.prepare('SELECT id FROM bookings WHERE id=?').get(history)); counters.historicalMovePreserved++;
          await moving.expect('/api/admin/users', 403);
        }
      }
      if (weeks % 13 === 4) {
        const family = households[7]; const returning = family.members[2]; await select(family.house);
        await admin.expect(`/api/admin/users/${returning.userId}/status`, 200, 'PUT', { active: true }); counters.returns++;
        assert.equal((await returning.expect('/api/me', 200)).user, null);
        returning.active = true; await returning.login();
      }
      let releaseSample;
      for (const family of households) {
        // Singles use alternate weeks; larger households use two machines.
        if (family.members.length === 1 && weeks % 2 === 1) continue;
        const activeMembers = family.members.filter(member => member.active);
        const owner = activeMembers[weeks % activeMembers.length];
        const partner = activeMembers[(weeks + 1) % activeMembers.length];
        const date = dayPlus(monday, 1); const slot = slots[Math.floor(family.index / 3)];
        const house = family.house;
        const items = [{ resourceId: house.washers[0].id, date, slot }, { resourceId: house.dryers[0].id, date, slot }];
        if (family.members.length === 3) items.push({ resourceId: house.washers[1].id, date, slot });
        if (weeks % 2 === 0) items.push({ resourceId: house.tumblers[0].id, date, slot });
        const created = await owner.expect('/api/booking-package', 201, 'POST', { items });
        counters.packages++; years[year].packages++;
        const mine = await partner.expect('/api/my-bookings', 200);
        assert.equal(mine.bookings.filter(b => b.group_id === created.groupId).length, items.length);
        counters.sharedPartyChecks++;
        await owner.expect('/api/booking-package', 409, 'POST', { items }); counters.collisionsRejected++;
        await partner.expect('/api/bookings', 409, 'POST', {
          resourceId: house.washers[1].id, date: dayPlus(date, 1), slot
        }); counters.quotaRejected++;
        const foreign = houses[(houses.indexOf(house) + 1) % 3];
        await owner.expect('/api/bookings', 404, 'POST', { resourceId: foreign.washers[0].id, date, slot });
        counters.foreignHouseRejected++;
        if (weeks % 4 === 0) {
          await partner.expect(`/api/booking-groups/${created.groupId}/cancel-notify`, 200, 'POST'); counters.cancellations++;
          const replaced = await owner.expect('/api/booking-package', 201, 'POST', { items });
          counters.packages++; years[year].packages++;
          assert.ok(replaced.groupId !== created.groupId);
          if (family.index === 0) releaseSample = { owner, id: replaced.created[0].id };
        }
      }
      if (weeks % 13 === 0) {
        for (let i = 0; i < households.length; i++) {
          const family = households[i]; const client = family.members[0];
          const calendar = await client.expect(`/api/bookings?date=${dayPlus(monday, 1)}`, 200);
          assert.ok(calendar.bookings.every(b => !('user_id' in b) && !('username' in b) && !('apartment_id' in b)));
          counters.calendarChecks++;
          await client.expect('/api/me/export', 200); counters.accountExports++;
          await client.expect('/api/admin/houses', 403);
          await client.expect('/api/me/active-house', 403, 'PUT', { houseId: houses[(i + 1) % 3].id });
        }
        await houseAdmins[0].expect('/api/admin/houses', 403);
        await houseAdmins[0].expect(`/api/admin/apartments/${households[1].apartmentId}/access-card`, 404, 'POST');
      }
      assert.equal(db.prepare(`SELECT COUNT(*) n FROM (SELECT resource_id,booking_date,slot,COUNT(*) n FROM bookings GROUP BY resource_id,booking_date,slot HAVING n>1)`).get().n, 0);
      // Historical legacy bookings deliberately remain in the former house;
      // only future/current reservations must match the current house.
      assert.equal(db.prepare(`SELECT COUNT(*) n FROM bookings b JOIN users u ON u.id=b.user_id JOIN resources r ON r.id=b.resource_id WHERE u.house_id!=r.house_id AND b.booking_date>=?`).get(monday).n, 0);
      if (weeks % 26 === 0 && releaseSample) {
        await clock(dayPlus(monday, 1) + 'T07:30:00Z');
        await releaseSample.owner.expect(`/api/bookings/${releaseSample.id}/release`, 200, 'POST'); counters.releases++;
      }
      if (dayPlus(monday, 7).slice(0, 4) !== year) console.log(JSON.stringify({ year, ...years[year], aggregate: counters }));
    }
    await clock('2031-12-31T22:00:00Z');
    await admin.expect('/api/session/keepalive', 200, 'POST');
    await residents[0].expect('/api/session/keepalive', 200, 'POST');
    await residents[0].expect('/api/bookings', 400, 'POST', {
      resourceId: houses[0].washers[0].id, date: '2027-01-05', slot: slots[0]
    }); counters.pastSlotsRejected++;
    assert.equal(weeks, 261);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 23);
    const summary = { ok: true, suite: 'five-year-households', from: '2027-01-01', through: '2031-12-31',
      weeks, residentAccounts: residents.length, technicalAdminAccounts: 3, householdAccounts: 18,
      unboundLegacyAccounts: 2, households: models, houses: houses.length, years, counters,
      storedBookings: db.prepare('SELECT COUNT(*) n FROM bookings').get().n,
      integrity: 'ok', foreignKeyViolations: 0, resourceCollisions: 0, crossHouseBookings: 0,
      elapsedSeconds: Number(((Date.now() - began) / 1000).toFixed(1)),
      limitations: ['JavaScript Date virtual; SQLite CURRENT_TIMESTAMP and SQL now use wall clock',
        'Timers not accelerated; no five-year retention/scheduler or continuous uptime claim',
        'Bound apartment moves rejected by documented product contract, not simulated as success',
        'Departures last four weekly cycles; returns reactivate same household, not identity relocation',
        'Legacy future/history booking records are explicit SQL fixtures; cancellation and move are real HTTP APIs',
        'No external providers, physical devices or production touched',
        'Existing QA-01 QA-02 QA-03 remain open; this test is not a release approval'] };
    console.log(JSON.stringify(summary, null, 2));
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'artifacts', 'five-year-household-result.json'), JSON.stringify(summary, null, 2) + '\n');
  } finally {
    if (db) db.close();
    if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    // Only this test's freshly created synthetic database directory is removed.
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
