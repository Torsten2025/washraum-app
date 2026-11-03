'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { BetterSqliteSessionStore, credentialStamp, REMEMBER_MS, RENEW_INTERVAL_MS,
  renewRememberSession } = require('../src/services/session-store');
const { createAccountService } = require('../src/services/account-service');

function storeChecks() {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE sessions(sid TEXT PRIMARY KEY, expired INTEGER, sess TEXT); CREATE TABLE users(id INTEGER PRIMARY KEY, active INTEGER, password_hash TEXT); INSERT INTO users VALUES (1,1,\'old\')');
  let now = 1800000000000;
  const store = new BetterSqliteSessionStore(db, () => now);
  const base = () => ({ user: { id: 1 }, authUserId: 1, authCredentialStamp: credentialStamp({ password_hash: 'old' }),
    rememberDevice: true, rememberRenewedAt: now, rememberExpiresAt: now + REMEMBER_MS,
    cookie: { expires: new Date(now + REMEMBER_MS) } });
  const save = (sid, sess) => store.set(sid, sess, (error) => { if (error) throw error; });
  const get = (sid) => { let result; store.get(sid, (error, sess) => { if (error) throw error; result = sess; }); return result; };
  const seed = (sid, sess) => db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(sid, now + REMEMBER_MS, JSON.stringify(sess));
  let original = base();
  seed('one', original);
  now += RENEW_INTERVAL_MS - 1;
  const noRenew = get('one');
  assert.equal(renewRememberSession(noRenew, now), true);
  assert.equal(noRenew.rememberExpiresAt, original.rememberExpiresAt);
  now += 1;
  const renewed = get('one');
  renewRememberSession(renewed, now);
  save('one', renewed);
  save('one', original);
  assert.equal(get('one').rememberExpiresAt, renewed.rememberExpiresAt, 'stale save cannot shorten renewed server deadline');
  assert.equal(original.cookie.expires.getTime(), renewed.rememberExpiresAt);
  store.destroy('one');
  save('one', renewed);
  save('one', { cookie: { expires: new Date(now + REMEMBER_MS) } });
  store.touch('one', renewed);
  assert.equal(get('one'), null, 'logout cannot be undone by any delayed save');
  seed('expired', base());
  const expired = get('expired');
  now += REMEMBER_MS;
  save('expired', expired);
  assert.equal(get('expired'), null, 'exact deadline cannot be renewed');
  now += 1;
  const pending = base();
  delete pending.user;
  seed('pending', pending);
  const accountService = createAccountService({ db });
  accountService.destroyUserSessions(1);
  save('pending', { ...pending, user: { id: 1 } });
  assert.equal(get('pending'), null, 'first authenticated save after central revoke cannot resurrect');
  seed('reset', base());
  const stale = get('reset');
  db.prepare('UPDATE users SET password_hash = ?').run('changed');
  save('reset', stale);
  assert.equal(get('reset'), null, 'credential change rejects even if central delete was unavailable');
  db.prepare('UPDATE users SET password_hash = ?').run('old');
  seed('blocked', base());
  const beforeBlock = get('blocked');
  db.prepare('UPDATE users SET active = 0').run();
  accountService.destroyUserSessions(1);
  db.prepare('UPDATE users SET active = 1').run();
  save('blocked', beforeBlock);
  assert.equal(get('blocked'), null, 'unblocking never restores old SID');
  db.close();
  console.log('PASS remembered store deadlines, monotone renewal, first-save/revocation and stale anonymous/authenticated races');
}

async function httpChecks() {
  const root = path.resolve(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wz-remember-'));
  const databasePath = path.join(dir, 'test.sqlite');
  const port = 38000 + process.pid % 1000;
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'development', APP_ENV: 'development', PORT: String(port), DB_PATH: databasePath,
      SEED_ADMIN_NAME: 'remember-test-admin', SEED_ADMIN_PASSWORD: 'Remember-Test-Password-2026!',
      SESSION_SECRET: 'remember-test-only-session-secret-over-32-characters',
      EMAIL_ENABLED: 'false', PUSH_ENABLED: 'false', BACKUP_ENABLED: 'false', AUTO_BACKUP: 'false' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', c => { output += c; });
  child.stderr.on('data', c => { output += c; });
  let db;
  async function request(route, cookie = '', method = 'GET', body) {
    const response = await fetch(baseUrl + route, { method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json();
    return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie,
      fullCookie: response.headers.get('set-cookie') || '' };
  }
  const login = (rememberDevice) => request('/api/login', '', 'POST', {
    username: 'remember-test-admin', password: 'Remember-Test-Password-2026!', rememberDevice
  });
  const sid = cookie => decodeURIComponent(cookie.split('=')[1]).slice(2).split('.')[0];
  function mutate(cookie, fn) {
    const key = sid(cookie);
    const stored = JSON.parse(db.prepare('SELECT sess FROM sessions WHERE sid = ?').get(key).sess);
    fn(stored);
    db.prepare('UPDATE sessions SET sess = ?, expired = ? WHERE sid = ?')
      .run(JSON.stringify(stored), stored.rememberExpiresAt || Date.now() + 86400000, key);
  }
  try {
    let ready = false;
    for (let n = 0; n < 120; n += 1) {
      try { if ((await fetch(baseUrl + '/api/health')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, output);
    db = new Database(databasePath);
    const normal = await login(false);
    assert.equal(normal.status, 200);
    mutate(normal.cookie, s => { s.lastActivityAt = Date.now() - 31 * 60000; });
    assert.equal((await request('/api/session/keepalive', normal.cookie, 'POST')).status, 401);
    const invalidBoolean = await login('true');
    assert.equal((await request('/api/me', invalidBoolean.cookie)).data.session.rememberDevice, false);
    const one = await login(true);
    const two = await login(true);
    assert.match(one.fullCookie, /HttpOnly/i);
    assert.match(one.fullCookie, /SameSite=Lax/i);
    const initial = (await request('/api/me', one.cookie)).data.session;
    assert.equal(initial.rememberDevice, true);
    assert.equal(initial.idleTimeoutMs, 0);
    assert.ok(Math.abs(initial.expiresAt - Date.now() - REMEMBER_MS) < 5000);
    mutate(one.cookie, s => { s.lastActivityAt = Date.now() - 31 * 60000; });
    assert.equal((await request('/api/me', one.cookie)).data.user.username, 'remember-test-admin');
    mutate(one.cookie, s => { s.rememberRenewedAt = Date.now() - 2 * 86400000; s.rememberExpiresAt = s.rememberRenewedAt + REMEMBER_MS; });
    const pollDeadline = (await request('/api/me', one.cookie)).data.session.expiresAt;
    assert.ok(pollDeadline < Date.now() + REMEMBER_MS - 86400000, 'polling does not renew');
    const renewals = await Promise.all(Array.from({ length: 8 }, () => request('/api/session/keepalive', one.cookie, 'POST')));
    assert.ok(renewals.every(r => r.status === 200));
    const after = (await request('/api/me', one.cookie)).data.session;
    assert.ok(after.expiresAt > pollDeadline);
    assert.equal((await request('/api/logout', one.cookie, 'POST')).status, 200);
    assert.equal((await request('/api/me', one.cookie)).data.user, null);
    assert.ok((await request('/api/me', two.cookie)).data.user, 'other device remains signed in');
    const expired = await login(true);
    mutate(expired.cookie, s => { s.rememberRenewedAt = Date.now() - REMEMBER_MS - 1000; s.rememberExpiresAt = s.rememberRenewedAt + REMEMBER_MS; });
    assert.equal((await request('/api/me', expired.cookie)).data.user, null);
    const failedLogout = await login(true);
    db.exec("CREATE TRIGGER fail_session_delete BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'synthetic delete failure'); END");
    assert.equal((await request('/api/logout', failedLogout.cookie, 'POST')).status, 503, 'failed durable logout must not claim success');
    const failedPassword = await request('/api/me/password', two.cookie, 'PUT', {
      currentPassword: 'Remember-Test-Password-2026!', newPassword: 'Remember-New-Password-2026!'
    });
    assert.equal(failedPassword.status, 500, 'database failure is handled without process crash');
    db.exec('DROP TRIGGER fail_session_delete');
    assert.equal((await request('/api/logout', failedLogout.cookie, 'POST')).status, 200);
    const otherHouse = Number(db.prepare("INSERT INTO houses(name,code,active) VALUES ('Remember second house','remember-other',1)").run().lastInsertRowid);
    assert.equal((await request('/api/me/active-house', two.cookie, 'PUT', { houseId: otherHouse })).status, 200);
    const changed = await request('/api/me/password', two.cookie, 'PUT', {
      currentPassword: 'Remember-Test-Password-2026!', newPassword: 'Remember-New-Password-2026!'
    });
    assert.equal(changed.status, 200);
    assert.notEqual(changed.cookie, two.cookie, 'password change rotates current SID');
    assert.equal(changed.data.session.rememberDevice, false);
    assert.equal((await request('/api/me', two.cookie)).data.user, null);
    assert.ok((await request('/api/me', changed.cookie)).data.user);
    assert.equal((await request('/api/me', changed.cookie)).data.user.activeHouseId, otherHouse);
    assert.equal((await request('/api/me/active-house', changed.cookie, 'PUT', { houseId: 1 })).status, 200);
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const residentId = Number(db.prepare(`INSERT INTO users (username,password_hash,role,house_id,active)
      VALUES ('remember-resident',?,'user',1,1)`).run(bcrypt.hashSync('Remember-Resident-2026!', 10)).lastInsertRowid);
    const residentLogin = () => request('/api/login', '', 'POST', {
      username: 'remember-resident', password: 'Remember-Resident-2026!', rememberDevice: true
    });
    const residentOne = await residentLogin();
    const residentTwo = await residentLogin();
    assert.equal(residentOne.status, 200);
    assert.equal((await request('/api/admin/apartments', residentOne.cookie)).status, 403);
    assert.equal((await request('/api/me/active-house', residentOne.cookie, 'PUT', { houseId: otherHouse })).status, 403);
    assert.equal((await request(`/api/admin/users/${residentId}/status`, changed.cookie, 'PUT', { active: false })).status, 200);
    assert.equal((await request(`/api/admin/users/${residentId}/status`, changed.cookie, 'PUT', { active: true })).status, 200);
    assert.equal((await request('/api/me', residentOne.cookie)).data.user, null);
    assert.equal((await request('/api/me', residentTwo.cookie)).data.user, null);
    const beforeReset = await residentLogin();
    const resetToken = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES (?,?,?)')
      .run(residentId, crypto.createHash('sha256').update(resetToken).digest('hex'), String(Date.now() + 60000));
    assert.equal((await request('/api/password-reset/confirm', '', 'POST', {
      token: resetToken, newPassword: 'Remember-Resident-New-2026!'
    })).status, 200);
    assert.equal((await request('/api/me', beforeReset.cookie)).data.user, null);
    console.log('PASS real HTTP account block/reactivation and password reset revoke remembered devices');
    console.log('PASS HTTP default/opt-in/30-minute/90-day/renewal/polling/multidevice/logout/password rotation');
    const { chromium } = require('playwright-core');
    const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium']
      .filter(Boolean).find(p => fs.existsSync(p));
    const profile = path.join(dir, 'browser-profile');
    const launch = () => chromium.launchPersistentContext(profile, { headless: true,
      ...(executablePath ? { executablePath } : {}), viewport: { width: 390, height: 844 } });
    let context = await launch();
    try {
      let page = context.pages()[0];
      await page.goto(baseUrl + '/login.html');
      const option = page.locator('input[name="rememberDevice"]');
      assert.equal(await option.isChecked(), false);
      for (const language of ['de', 'en']) {
        await page.evaluate(lang => window.WZ_I18N.setLanguage(lang), language);
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 844 });
          await option.scrollIntoViewIfNeeded();
          const label = language === 'de' ? 'Auf diesem Gerät angemeldet bleiben' : 'Stay signed in on this device';
          assert.equal(await page.getByRole('checkbox', { name: label }).count(), 1);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          if (process.env.REMEMBER_DEVICE_ARTIFACT_DIR) {
            const evidenceDirectory = path.resolve(process.env.REMEMBER_DEVICE_ARTIFACT_DIR);
            fs.mkdirSync(evidenceDirectory, { recursive: true });
            await page.screenshot({ path: path.join(evidenceDirectory, `login-${language}-${width}.png`), fullPage: true });
          }
        }
      }
      await page.locator('#loginForm input[name="email"]').fill('remember-test-admin');
      await page.locator('#loginForm input[name="password"]').fill('Remember-New-Password-2026!');
      await option.focus();
      await page.keyboard.press('Space');
      assert.equal(await option.isChecked(), true);
      await page.locator('#loginForm button[type="submit"]').click();
      await page.waitForURL('**/index.html');
      const browserCookie = (await context.cookies()).find(c => c.name === 'connect.sid');
      assert.ok(browserCookie.httpOnly);
      assert.equal(browserCookie.sameSite, 'Lax');
      const browserSession = await page.evaluate(async () => (await (await fetch('/api/me')).json()).session);
      assert.equal(browserSession.rememberDevice, true);
      assert.ok(Math.abs(browserSession.expiresAt - Date.now() - REMEMBER_MS) < 5000,
        `server remember deadline mismatch: ${browserSession.expiresAt}`);
      assert.ok(Math.abs(browserCookie.expires * 1000 - browserSession.expiresAt) < 2000,
        `cookie/server deadline mismatch: cookie=${browserCookie.expires * 1000} server=${browserSession.expiresAt}`);
      mutate(`connect.sid=${browserCookie.value}`, s => { s.lastActivityAt = Date.now() - 31 * 60000; });
      await context.close();
      context = await launch();
      page = context.pages()[0];
      await page.goto(baseUrl + '/index.html');
      await page.waitForFunction(async () => Boolean((await (await fetch('/api/me')).json()).user));
      await page.waitForFunction(() => typeof sessionRememberDevice !== 'undefined' && sessionRememberDevice === true);
      await page.clock.install();
      await page.clock.fastForward(31 * 60000);
      assert.ok(page.url().endsWith('/index.html'));
      assert.equal(await page.locator('#sessionWarningOverlay').isVisible(), false);
      const state = await page.evaluate(async () => (await (await fetch('/api/me')).json()).session);
      assert.equal(state.rememberDevice, true);
      assert.equal(state.idleTimeoutMs, 0);
      console.log('PASS real persistent browser close/reopen beyond 30 minutes, DE/EN 320/390, accessible keyboard checkbox');
    } finally { await context.close(); }
    for (const language of ['de', 'en']) {
      const retryContext = await chromium.launchPersistentContext(path.join(dir, `logout-${language}`), {
        headless: true, ...(executablePath ? { executablePath } : {}), viewport: { width: 390, height: 844 }
      });
      try {
        const retryPage = retryContext.pages()[0];
        await retryPage.goto(baseUrl + '/login.html');
        await retryPage.locator('#loginForm input[name="email"]').fill('remember-test-admin');
        await retryPage.locator('#loginForm input[name="password"]').fill('Remember-New-Password-2026!');
        await retryPage.locator('input[name="rememberDevice"]').check();
        await retryPage.locator('#loginForm button[type="submit"]').click();
        await retryPage.waitForURL('**/index.html');
        await retryPage.waitForFunction(() => typeof sessionRememberDevice !== 'undefined' && sessionRememberDevice);
        await retryPage.evaluate(lang => window.WZ_I18N.setLanguage(lang), language);
        const originalCookie = (await retryContext.cookies()).find(c => c.name === 'connect.sid');
        const replayCookie = `connect.sid=${originalCookie.value}`;
        const key = sid(replayCookie);
        const stale = JSON.parse(db.prepare('SELECT sess FROM sessions WHERE sid = ?').get(key).sess);
        const otherDevice = await request('/api/login', '', 'POST', {
          username: 'remember-test-admin', password: 'Remember-New-Password-2026!', rememberDevice: true
        });
        db.exec("CREATE TRIGGER fail_session_delete BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'synthetic delete failure'); END");
        await retryPage.locator('#accountMenuButton').click();
        const failureResponse = retryPage.waitForResponse(r => r.url() === baseUrl + '/api/logout');
        await retryPage.locator('#logoutButton').click();
        const failed = await failureResponse;
        assert.equal(failed.status(), 503);
        await retryPage.waitForFunction(() => !document.querySelector('#logoutButton').disabled);
        const expectedError = language === 'de'
          ? 'Abmelden konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
          : 'Sign out could not be completed. Please try again.';
        assert.equal(await retryPage.locator('#statusText').innerText(), expectedError);
        assert.equal(await retryPage.locator('#statusText').isVisible(), true);
        assert.ok(retryPage.url().endsWith('/index.html'), 'failed logout does not redirect');
        assert.ok((await retryContext.cookies()).find(c => c.name === 'connect.sid')?.value ===
          originalCookie.value, 'real browser retains SID needed by the identical UI retry');
        assert.ok(!/Expires=Thu, 01 Jan 1970/i.test(failed.headers()['set-cookie'] || ''));
        if (process.env.REMEMBER_DEVICE_ARTIFACT_DIR) {
          await retryPage.screenshot({ path: path.join(path.resolve(process.env.REMEMBER_DEVICE_ARTIFACT_DIR),
            `logout-retry-${language}.png`), fullPage: false });
        }
        db.exec('DROP TRIGGER fail_session_delete');
        // Hold an actual response loaded before logout; let it arrive after the retry.
        let releaseResponse;
        let snapshotReady;
        const held = new Promise(resolve => { releaseResponse = resolve; });
        const ready = new Promise(resolve => { snapshotReady = resolve; });
        await retryPage.route('**/api/session/keepalive?logoutRace=1', async route => {
          const response = await route.fetch();
          snapshotReady();
          await held;
          await route.fulfill({ response });
        });
        await retryPage.evaluate(() => {
          window.logoutRaceRequest = fetch('/api/session/keepalive?logoutRace=1', { method: 'POST' });
        });
        await ready;
        const successResponse = retryPage.waitForResponse(r => r.url() === baseUrl + '/api/logout');
        await retryPage.locator('#logoutButton').click();
        assert.equal((await successResponse).status(), 200);
        await retryPage.waitForURL('**/login.html?loggedOut=1');
        assert.equal((await retryContext.cookies()).some(c => c.name === 'connect.sid'), false);
        releaseResponse();
        await retryPage.unrouteAll({ behavior: 'wait' });
        const store = new BetterSqliteSessionStore(db);
        store.set(key, stale, error => { if (error) throw error; });
        store.touch(key, stale, error => { if (error) throw error; });
        store.set(key, { cookie: stale.cookie }, error => { if (error) throw error; });
        assert.equal(db.prepare('SELECT sid FROM sessions WHERE sid = ?').get(key), undefined);
        assert.equal((await request('/api/me', replayCookie)).data.user, null, 'old cookie replay remains rejected');
        assert.equal(await retryPage.evaluate(async () => (await (await fetch('/api/me')).json()).user), null);
        assert.ok((await request('/api/me', otherDevice.cookie)).data.user, 'second device stays valid');
        console.log(`PASS ${language} real browser logout SQL failure, visible error, same-button cookiejar retry, stale response/save replay and other device`);
      } finally {
        db.exec('DROP TRIGGER IF EXISTS fail_session_delete');
        await retryContext.close();
      }
    }
  } finally {
    if (db) db.close();
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function initialSaveRaceChecks() {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE sessions(sid TEXT PRIMARY KEY, expired INTEGER, sess TEXT); CREATE TABLE users(id INTEGER PRIMARY KEY, active INTEGER, password_hash TEXT); INSERT INTO users VALUES (1,1,\'old\')');
  const service = createAccountService({ db });
  const store = new BetterSqliteSessionStore(db);
  const user = db.prepare('SELECT * FROM users WHERE id=1').get();
  const makeRequest = (sid, beforeCallback = () => {}) => {
    const req = { sessionID: sid };
    req.session = { regenerate(callback) {
      req.session = { cookie: { expires: new Date(Date.now() + REMEMBER_MS) } };
      beforeCallback();
      callback();
    } };
    return req;
  };
  const resetDuringRegenerate = makeRequest('reset-during', () => db.prepare("UPDATE users SET password_hash='new'").run());
  await assert.rejects(service.regenerateSession(resetDuringRegenerate, user), /SESSION_ACCOUNT_CHANGED/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
  db.prepare("UPDATE users SET password_hash='old'").run();
  const req = makeRequest('before-first-save');
  const pending = service.regenerateSession(req, user);
  // Deliberately revoke before the awaiting login continuation sets user/mode.
  assert.equal(JSON.parse(db.prepare('SELECT sess FROM sessions').get().sess).authUserId, 1);
  service.destroyUserSessions(1);
  await pending;
  req.session.user = { id: 1 };
  req.session.rememberDevice = true;
  req.session.rememberRenewedAt = Date.now();
  req.session.rememberExpiresAt = req.session.rememberRenewedAt + REMEMBER_MS;
  store.set(req.sessionID, req.session, error => { if (error) throw error; });
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
  db.close();
  console.log('PASS real regeneration credential recheck and revoke between bound initialization and first authenticated save');
}

storeChecks();
initialSaveRaceChecks().then(httpChecks).catch(error => { console.error(error); process.exitCode = 1; });
