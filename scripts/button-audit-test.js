'use strict';
// Real UI actions on a fresh synthetic database. Never accepts a target URL/DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'artifacts', 'button-audit');
const candidate = {
  productFingerprint: require('./button-coverage').productFingerprint(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  version: require('../package.json').version,
  startedAt: new Date().toISOString(),
  sourceHashes: Object.fromEntries(['public/app.js', 'public/i18n.js', 'public/index.html', 'scripts/button-audit-test.js', 'scripts/button-game-cases.js'].map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]))
};
const password = 'Synthetic-Button-Audit-2026!';
// Test-only process/browser clock: reach morning-only release/rest-slot buttons
// without changing the operating-system clock or adding a production test API.
const testMorning = new Date();
testMorning.setUTCDate(testMorning.getUTCDate() + 1); testMorning.setUTCHours(9, 0, 0, 0);
if (testMorning.getUTCDay() === 0) testMorning.setUTCDate(testMorning.getUTCDate() + 1);
const clockSource = `(() => {
  const NativeDate = Date, started = NativeDate.now(), fixed = ${testMorning.getTime()};
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [fixed + NativeDate.now() - started])); }
    static now() { return fixed + NativeDate.now() - started; }
  };
})();`;
const results = [];
const clicks = [];
const external = [];
let activeCase = '';
let auditPage;
async function step(role, name, run) {
  activeCase = `${role}: ${name}`;
  try { await run(); results.push({ role, name, status: 'PASS' }); }
  catch (error) {
    results.push({ role, name, status: 'FAIL', error: error.message,
      visibleStatus: auditPage ? await auditPage.locator('#statusText').textContent().catch(() => '') : '' });
    if (auditPage) await auditPage.screenshot({ path: path.join(evidence, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  }
  finally { fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ candidate, results, clicks, external }, null, 2)); }
}
async function idle(page) {
  // Allow response JSON continuations to start their follow-up reads/render.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(100);
  await page.waitForLoadState('networkidle');
}
async function until(check, message) {
  for (let i = 0; i < 200; i++) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail(message || `${activeCase}: expected rendered result did not appear`);
}
async function responseClick(page, locator, route, method = 'POST', status = 200) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === route && r.request().method() === method);
  await locator.click();
  const response = await pending;
  assert.equal(response.status(), status, `${activeCase}: ${route}: ${await response.text()}`);
  await idle(page);
  return response;
}
async function expand(page, form) {
  const details = page.locator(form).locator('xpath=ancestor::details[1]');
  if (await details.count() && !(await details.evaluate(e => e.open))) await details.locator(':scope > summary').click();
}
async function settings(page, section) {
  if (!(await page.locator('#settingsOverlay').isVisible())) {
    await page.locator('#accountMenuButton').click(); await page.locator('#openSettingsButton').click();
  }
  await page.locator(`[data-settings-target="${section}"]`).click();
}
async function adminSection(page, section) {
  if (!(await page.locator('body').evaluate(e => e.classList.contains('admin-view')))) await page.locator('#adminViewButton').click();
  await page.locator(`[data-admin-target="${section}"]`).click();
}
async function dialogClick(page, locator, accept, text) {
  const mutation = accept ? page.waitForResponse(r => !['GET', 'HEAD'].includes(r.request().method()) && !new URL(r.url()).pathname.startsWith('/api/session/')) : null;
  page.once('dialog', dialog => accept ? dialog.accept(text) : dialog.dismiss());
  await locator.click();
  if (mutation) { const response = await mutation; assert(response.ok(), `${activeCase}: ${await response.text()}`); }
  await idle(page);
}
async function run() {
  fs.mkdirSync(evidence, { recursive: true });
  // SMTP terminates here; no relay, DNS or real recipients are used.
  const mail = [];
  const smtp = net.createServer(socket => {
    socket.setEncoding('utf8'); socket.write('220 local.test ESMTP\r\n');
    let buffer = '', dataMode = false;
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.length) {
        const end = buffer.indexOf(dataMode ? '\r\n.\r\n' : '\r\n');
        if (end < 0) return;
        const line = buffer.slice(0, end); buffer = buffer.slice(end + (dataMode ? 5 : 2));
        if (dataMode) { mail.push(line); dataMode = false; socket.write('250 queued\r\n'); }
        else if (/^EHLO /i.test(line)) socket.write('250-local.test\r\n250 SIZE 20000000\r\n');
        else if (line === 'DATA') { dataMode = true; socket.write('354 End data\r\n'); }
        else if (line === 'QUIT') { socket.end('221 Bye\r\n'); }
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wz-button-audit-'));
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const databasePath = path.join(temporary, 'synthetic.sqlite');
  const output = [];
  const server = spawn(process.execPath, ['-e', clockSource + "require('./server.js')"], { cwd: root, env: {
    ...process.env, NODE_ENV: 'development', APP_ENV: 'development', PORT: String(port), DB_PATH: databasePath,
    PUBLIC_APP_URL: base, SEED_ADMIN_NAME: 'button-super', SEED_ADMIN_PASSWORD: password,
    SESSION_SECRET: 'synthetic-button-session-at-least-32-characters',
    EMAIL_ENABLED: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port), SMTP_SECURE: 'false',
    SMTP_USER: '', SMTP_PASSWORD: '', SMTP_FROM: 'button-audit@example.invalid', SMTP_TEST_TO: 'button-audit@example.invalid',
    PUSH_ENABLED: 'false', BACKUP_ENABLED: 'true', AUTO_BACKUP: 'false',
    BACKUP_DIR: path.join(temporary, 'backups'), BACKUP_UPLOAD_URL: '', BACKUP_UPLOAD_TOKEN: '', ALLOW_TEST_INVITATION_LINK: 'true'
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', b => output.push(String(b))); server.stderr.on('data', b => output.push(String(b)));
  let browser, db;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { ready = (await fetch(base + '/api/health')).ok; } catch {}
      if (ready) break; await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, output.join(''));
    db = new Database(databasePath);
    const house = db.prepare('SELECT house_id FROM users WHERE username = ?').get('button-super').house_id;
    const hash = bcrypt.hashSync(password, 10);
    const insert = (name, resident, admin) => {
      const id = Number(db.prepare("INSERT INTO users(username,password_hash,role,house_id) VALUES (?,?,'user',?)").run(name, hash, house).lastInsertRowid);
      if (resident) {
        const apartment = Number(db.prepare('INSERT INTO apartments(house_id,label,display_name,claimed_by) VALUES (?,?,?,?)').run(house, name, name, id).lastInsertRowid);
        db.prepare('UPDATE users SET apartment_id = ? WHERE id = ?').run(apartment, id);
      }
      if (admin) db.prepare("INSERT INTO user_house_roles(user_id,house_id,role) VALUES (?,?,'house_admin')").run(id, house);
      return id;
    };
    insert('button-resident', true, false); insert('button-houseadmin', false, true);
    const managed = insert('button-managed', true, false);
    const spareAdmin = insert('button-spareadmin', false, true);
    const unbound = insert('button-unbound', false, false);
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.PLAYWRIGHT_EXECUTABLE_PATH || [
      'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'
    ].find(fs.existsSync);
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const pages = {};
    for (const [role, username] of Object.entries({ resident: 'button-resident', houseadmin: 'button-houseadmin', superadmin: 'button-super' })) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
      await context.route('**/*', route => {
        const url = route.request().url();
        if (url.startsWith(base + '/') || /^(data:|blob:)/.test(url)) return route.continue();
        external.push(url); return route.abort();
      });
      await context.exposeBinding('auditClick', (_, item) => clicks.push({ role, scenario: activeCase, ...item }));
      await context.addInitScript({ content: clockSource });
      await context.addInitScript(() => {
        document.addEventListener('click', event => {
          const e = event.target.closest('button,summary,a.button-link');
          if (e) window.auditClick({ page: location.pathname, id: e.id, text: e.textContent.trim(), form: e.closest('form')?.id || '', target: e.dataset.adminTarget || e.dataset.settingsTarget || '', trusted: event.isTrusted });
        }, true);
        window.print = () => { window.__printCalls = (window.__printCalls || 0) + 1; };
      });
      const page = await context.newPage(); pages[role] = page;
      auditPage = page;
      page.on('pageerror', error => results.push({ role, name: activeCase, status: 'PAGEERROR', error: error.message }));
      await step(role, 'Login button', async () => {
        await page.goto(base + '/login.html');
        await page.route('**/api/version', route => route.fulfill({ json: { release: 'synthetic-login-update', maintenance: { active: false } } }));
        await page.evaluate(() => checkAppStatus());
        await page.unroute('**/api/version');
        const reloaded = page.waitForEvent('domcontentloaded');
        await page.locator('#updateAppButton').click(); await reloaded;
        for (const [button, form] of [['showRegister', 'registerForm'], ['showDeviceLogin', 'deviceLoginForm'], ['showAccessCard', 'accessCardForm'], ['showLogin', 'loginForm'], ['showRecovery', 'recoveryForm']]) {
          await page.locator(`#${button}`).click(); assert(await page.locator(`#${form}`).isVisible());
        }
        await page.locator('#showAccountRecovery').click(); assert(await page.locator('#accountRecoveryForm').isVisible());
        await page.locator('#cancelAccountRecovery').click();
        await page.locator('#showRecovery').click(); await page.locator('#cancelRecovery').click();
        await page.locator('#loginForm input[name=email]').fill(username);
        await page.locator('#loginForm input[name=password]').fill(password);
        await page.locator('#loginForm button[type=submit]').click();
        await page.waitForURL('**/index.html'); await idle(page);
        if (await page.locator('#settingsOverlay').isVisible()) await page.locator('#settingsDoneButton').click();
        if (await page.locator('#whatsNewNotice').isVisible()) await page.locator('#dismissWhatsNewButton').click();
      });
      await step(role, 'Settings tabs, close, done and help', async () => {
        for (const section of ['profile', 'notifications', 'device', 'help', 'security']) {
          await settings(page, section);
          assert.equal(await page.locator(`[data-settings-target="${section}"]`).getAttribute('aria-selected'), 'true');
        }
        await page.locator('#closeSettingsButton').click(); assert(await page.locator('#settingsOverlay').isHidden());
        await settings(page, 'profile'); await page.locator('#settingsDoneButton').click();
        await page.locator('#accountMenuButton').click(); await page.locator('#openKnowledgeButton').click();
        assert(await page.locator('#settingsPanelHelp').isVisible());
        for (const summary of await page.locator('#settingsPanelHelp details > summary').all()) { await summary.click(); assert(await summary.locator('..').evaluate(e => e.open)); await summary.click(); }
        await page.locator('#closeSettingsButton').click();
      });
      await step(role, 'Message center open/close', async () => {
        await page.locator('#messageCenterButton').click(); assert(await page.locator('#messageCenterOverlay').isVisible());
        await page.locator('#closeMessageCenterButton').click(); assert(await page.locator('#messageCenterOverlay').isHidden());
      });
      await step(role, 'Installation button accepted/cancelled (browser prompt boundary stub)', async () => {
        await settings(page, 'device');
        for (const outcome of ['dismissed', 'accepted']) {
          await page.evaluate(outcome => {
            window.auditInstallPrompts = 0;
            deferredInstallPrompt = { prompt: () => { window.auditInstallPrompts++; }, userChoice: Promise.resolve({ outcome }) };
            renderInstallStatus();
          }, outcome);
          await page.locator('#installAppButton').click();
          assert.equal(await page.evaluate(() => window.auditInstallPrompts), 1);
          assert(await page.locator('#installAppButton').isDisabled());
          assert.match(await page.locator('#statusText').textContent(), outcome === 'accepted' ? /installiert/ : /nicht abgeschlossen/);
        }
        await page.locator('#closeSettingsButton').click();
      });
      await step(role, 'Update check and update button reload (synthetic version announcement)', async () => {
        await settings(page, 'device');
        await page.locator('#checkAppUpdateButton').click(); await idle(page);
        if (await page.locator('#settingsOverlay').isVisible()) await page.locator('#closeSettingsButton').click();
        if (await page.locator('#whatsNewNotice').isVisible()) await page.locator('#dismissWhatsNewButton').click();
        await page.evaluate(() => renderReleaseStatus({ version: '0.0.0-test.999', release: 'synthetic-button-update', maintenance: { active: false } }));
        const navigation = page.waitForEvent('domcontentloaded');
        await page.locator('#updateAppButton').click(); await navigation; await idle(page);
        assert.equal(new URL(page.url()).origin, base);
        assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 200);
      });
      await step(role, 'Introduction all chapters, playback, mute, quiz and both close buttons', async () => {
        await settings(page, 'help'); await page.locator('#openIntroButton').click();
        await page.waitForFunction(() => document.querySelector('#recordedIntroVideo').readyState >= 1);
        const videoChapters = page.locator('[data-recorded-chapter]');
        for (let i = 0; i < await videoChapters.count(); i++) {
          await videoChapters.nth(i).click();
          await page.waitForFunction(index => document.querySelector(`[data-recorded-chapter="${index}"]`).getAttribute('aria-current') === 'true', i);
        }
        await page.locator('#recordedIntroVideo').evaluate(e => e.pause());
        await expand(page, '#introChapterList');
        const chapters = page.locator('[data-intro-chapter]');
        for (let i = 0; i < await chapters.count(); i++) {
          await chapters.nth(i).click(); assert.equal(await chapters.nth(i).getAttribute('aria-current'), 'step');
        }
        await chapters.first().click();
        await page.locator('#introVideoNextButton').click(); assert.equal(await chapters.nth(1).getAttribute('aria-current'), 'step');
        await page.locator('#introVideoPreviousButton').click(); assert.equal(await chapters.first().getAttribute('aria-current'), 'step');
        await page.locator('#introVideoPlayButton').click(); await page.locator('#introVideoPlayButton').click();
        await page.locator('#introVideoMuteButton').click(); await page.locator('#introVideoMuteButton').click();
        await page.locator('.video-transcript > summary').click(); assert(await page.locator('#introTranscriptList').isVisible());
        await page.locator('#introQuizForm button').click(); assert.equal(await page.locator('#introQuizForm .is-unanswered').count(), 3);
        for (const value of ['same-slot', 'next-noon', 'release']) await page.locator(`#introQuizForm input[value="${value}"]`).check();
        await page.locator('#introQuizForm button').click(); assert.equal(await page.locator('#introQuizForm .is-correct').count(), 3);
        await page.locator('#closeIntroButton').click(); assert(await page.locator('#introOverlay').isHidden());
        await page.locator('#openIntroButton').click(); await page.locator('#introDoneButton').click(); assert(await page.locator('#introOverlay').isHidden());
        if (await page.locator('#settingsOverlay').isVisible()) await page.locator('#closeSettingsButton').click();
      });
      await step(role, 'Personal data export button', async () => {
        await settings(page, 'security');
        const download = page.waitForEvent('download'); await page.locator('[data-i18n="settings.export"]').click();
        const file = await download; const contents = fs.readFileSync(await file.path(), 'utf8');
        assert.doesNotThrow(() => JSON.parse(contents)); assert(contents.includes(username));
        await page.locator('#closeSettingsButton').click();
      });
      await step(role, 'Profile and notification save buttons with real persistence', async () => {
        await settings(page, 'profile');
        await responseClick(page, page.locator('[data-i18n="settings.saveProfile"]'), '/api/me/notifications', 'PUT');
        await page.locator('[data-settings-target="notifications"]').click();
        await page.locator('#notifyReleases').uncheck();
        await responseClick(page, page.locator('[data-i18n="settings.saveNotifications"]'), '/api/me/notifications', 'PUT');
        assert.equal(db.prepare('SELECT notify_releases FROM users WHERE username=?').get(username).notify_releases, 0);
        await page.locator('#notifyReleases').check();
        await responseClick(page, page.locator('[data-i18n="settings.saveNotifications"]'), '/api/me/notifications', 'PUT');
        assert.equal(db.prepare('SELECT notify_releases FROM users WHERE username=?').get(username).notify_releases, 1);
        await page.locator('#closeSettingsButton').click();
      });
      await step(role, 'Optional primary and secondary email resend buttons to local SMTP', async () => {
        db.prepare('UPDATE users SET email=?,secondary_email=?,email_verified=0,secondary_email_verified=0 WHERE username=?').run(`${username}@example.invalid`, `${username}-second@example.invalid`, username);
        await page.reload(); await idle(page); await settings(page, 'profile');
        for (const id of ['resendVerificationButton', 'resendSecondaryVerificationButton']) {
          const before = mail.length;
          await responseClick(page, page.locator(`#${id}`), '/api/email-verification/resend');
          assert(mail.length > before);
        }
        db.prepare('UPDATE users SET email=NULL,secondary_email=NULL WHERE username=?').run(username);
        await page.reload(); await idle(page);
      });
      if (role === 'resident') {
        await step(role, 'Push enable/disable/denied buttons (browser and provider boundary stubs)', async () => {
          await settings(page, 'device');
          const requests = [];
          let serverActive = false;
          await page.route('**/api/push/subscriptions/status', route => route.fulfill({ json: { active: serverActive } }));
          await page.route('**/api/push/public-key', route => route.fulfill({ json: { configured: true, publicKey: 'AAAA' } }));
          await page.route('**/api/push/subscriptions', route => {
            requests.push({ method: route.request().method(), body: route.request().postDataJSON() });
            serverActive = route.request().method() === 'POST';
            return route.fulfill({ json: { ok: true } });
          });
          await page.evaluate(() => {
            window.auditPushOriginal = { registerServiceWorker, currentPushSubscription, Notification: window.Notification };
            window.auditSubscription = null;
            let generation = 0;
            window.Notification = { permission: 'default', requestPermission: async () => { Notification.permission = 'granted'; return 'granted'; } };
            currentPushSubscription = async () => window.auditSubscription;
            registerServiceWorker = async () => ({ pushManager: {
              getSubscription: currentPushSubscription,
              subscribe: async () => (window.auditSubscription = {
                endpoint: 'https://push.example.invalid/synthetic-' + ++generation,
                toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'synthetic', auth: 'synthetic' } }; },
                unsubscribe: async () => { window.auditSubscription = null; return true; }
              })
            } });
            return renderPushStatus();
          });
          await page.locator('#enablePushButton').click();
          await page.locator('#disablePushButton').waitFor({ state: 'visible' });
          assert.equal(requests.at(-1).method, 'POST');
          assert.equal(requests.at(-1).body.subscription.endpoint, 'https://push.example.invalid/synthetic-1');
          serverActive = false; // Browser retained its subscription after server deactivation.
          await page.evaluate(() => renderPushStatus());
          assert(await page.locator('#disablePushButton').isHidden());
          assert.match(await page.locator('#pushStatusText').innerText(), /nicht mit deinem Konto verbunden/);
          assert.equal(requests.length, 1, 'Opening settings must not rebind a device');
          await page.locator('#enablePushButton').click();
          await page.locator('#disablePushButton').waitFor({ state: 'visible' });
          assert.deepEqual(requests.map(r => r.method), ['POST', 'DELETE', 'POST']);
          assert.equal(requests[1].body.endpoint, 'https://push.example.invalid/synthetic-1');
          assert.equal(requests[2].body.subscription.endpoint, 'https://push.example.invalid/synthetic-2', 'Reconnect requests fresh provider keys');
          await page.locator('#disablePushButton').click(); await page.locator('#disablePushButton').waitFor({ state: 'hidden' });
          assert.equal(requests.at(-1).method, 'DELETE');
          assert.equal(await page.evaluate(() => window.auditSubscription), null);
          await page.evaluate(() => { Notification.requestPermission = async () => { Notification.permission = 'denied'; return 'denied'; }; });
          const count = requests.length;
          await page.locator('#enablePushButton').click(); await idle(page);
          assert.equal(requests.length, count, 'Denied permission does not subscribe');
          assert.match(await page.locator('#pushStatusText').textContent(), /blockiert/);
          assert(await page.locator('#enablePushButton').isDisabled(), 'Blocked browser permission must leave push activation disabled');
          await page.unroute('**/api/push/public-key'); await page.unroute('**/api/push/subscriptions');
          await page.unroute('**/api/push/subscriptions/status');
          await page.evaluate(async () => {
            registerServiceWorker = auditPushOriginal.registerServiceWorker;
            currentPushSubscription = auditPushOriginal.currentPushSubscription;
            window.Notification = auditPushOriginal.Notification;
            delete window.auditPushOriginal; delete window.auditSubscription;
            await renderPushStatus();
          });
          await page.locator('#closeSettingsButton').click();
        });
        await step(role, 'Partner QR creation button', async () => {
          await settings(page, 'device');
          await responseClick(page, page.locator('#createDeviceCodeButton'), '/api/me/device-code', 'POST', 201);
          assert((await page.locator('#devicePairingCode').innerText()).length >= 6);
          assert((await page.locator('#devicePairingQr').getAttribute('src')).startsWith('data:image/'));
          await page.locator('#closeSettingsButton').click();
        });
        await step(role, 'Calendar navigation and all resource filters', async () => {
          await page.locator('#monthViewButton').click();
          await page.waitForFunction(() => document.querySelector('#monthViewButton').getAttribute('aria-pressed') === 'true');
          await page.locator('#nextWeekButton').click(); await idle(page);
          await page.locator('#previousWeekButton').click(); await idle(page);
          await page.locator('#todayButton').click(); await idle(page);
          await page.locator('#weekViewButton').click();
          await page.waitForFunction(() => document.querySelector('#weekViewButton').getAttribute('aria-pressed') === 'true');
          const filterDetails = page.locator('[data-type="washer"]').locator('xpath=ancestor::details[1]');
          if (!(await filterDetails.evaluate(e => e.open))) await filterDetails.locator(':scope > summary').click();
          for (const type of ['washer', 'drying_room', 'tumbler', 'all']) { await page.locator(`[data-type="${type}"]`).click(); assert(await page.locator(`[data-type="${type}"]`).evaluate(e => e.classList.contains('active'))); }
        });
        await step(role, 'Calendar subscription create, replace, copy and revoke', async () => {
          await settings(page, 'device');
          await responseClick(page, page.locator('#createCalendarFeedButton'), '/api/me/calendar-feed', 'POST', 201);
          const first = await page.locator('#calendarFeedUrl').inputValue(); assert(first.startsWith(base));
          await responseClick(page, page.locator('#createCalendarFeedButton'), '/api/me/calendar-feed', 'POST', 201);
          const second = await page.locator('#calendarFeedUrl').inputValue(); assert.notEqual(first, second);
          assert.equal((await fetch(first)).status, 404);
          await context.grantPermissions(['clipboard-read', 'clipboard-write']);
          await page.locator('#copyCalendarFeedButton').click(); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), second);
          await page.evaluate(() => {
            window.auditClipboardWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = async () => { throw new DOMException('Test-only denied clipboard', 'NotAllowedError'); };
          });
          await page.locator('#copyCalendarFeedButton').click();
          assert.match(await page.locator('#calendarFeedStatus').textContent(), /markierte Adresse/);
          assert.equal(await page.locator('#calendarFeedUrl').evaluate(e => e.selectionEnd - e.selectionStart), second.length);
          await page.evaluate(() => { navigator.clipboard.writeText = window.auditClipboardWrite; delete window.auditClipboardWrite; });
          assert.equal(await page.locator('#openCalendarFeedButton').getAttribute('href'), second.replace(/^http:/, 'webcal:'));
          await page.locator('#openCalendarFeedButton').evaluate(e => e.addEventListener('click', event => {
            event.preventDefault(); window.auditWebcalTarget = e.href;
          }, { once: true }));
          await page.locator('#openCalendarFeedButton').click();
          assert.equal(await page.evaluate(() => window.auditWebcalTarget), second.replace(/^http:/, 'webcal:'));
          await responseClick(page, page.locator('#revokeCalendarFeedButton'), '/api/me/calendar-feed', 'DELETE');
          assert.equal((await fetch(second)).status, 404); assert(await page.locator('#calendarFeedUrlWrap').isHidden());
          await page.locator('#closeSettingsButton').click();
        });
        await step(role, 'Calendar preview close, settings overlay and pending hover timer regression', async () => {
          const day = page.locator('.calendar-day[aria-disabled="false"]').first();
          await page.locator('#accountMenuButton').focus(); await day.focus();
          await page.locator('#calendarDayDetails').waitFor({ state: 'visible' });
          await page.locator('#calendarDayDetailsClose').click(); assert(await page.locator('#calendarDayDetails').isHidden());
          await page.locator('#accountMenuButton').focus(); await day.focus();
          await page.locator('#calendarDayDetails').waitFor({ state: 'visible' });
          await settings(page, 'profile'); assert(await page.locator('#calendarDayDetails').isHidden());
          await page.evaluate(() => scheduleCalendarPreview(calendarDays[0], document.querySelector('.calendar-day')));
          await page.waitForTimeout(650);
          assert(await page.locator('#calendarDayDetails').isHidden());
          await page.locator('[data-settings-target=security]').click();
          assert(await page.locator('#settingsPanelSecurity').isVisible());
          await page.locator('#closeSettingsButton').click();
        });
        await step(role, 'Recommendation and all calendar direct-entry button families', async () => {
          await page.reload(); await idle(page);
          const recommendation = await page.evaluate(() => ({ date: currentRecommendation.date, slot: currentRecommendation.slot }));
          await page.locator('#bookingSuggestion button').click(); await idle(page);
          assert.equal(await page.locator('#bookingDate').inputValue(), recommendation.date);
          assert.equal(await page.evaluate(() => bookingFlowState.slot), recommendation.slot);
          await page.reload(); await idle(page);
          await page.locator('.calendar-day.is-recommended').focus();
          await page.locator('[data-calendar-use-recommendation]').click(); await idle(page);
          assert.equal(await page.evaluate(() => bookingFlowState.slot), recommendation.slot);
          await page.reload(); await idle(page);
          const ordinary = page.locator('.calendar-day[aria-disabled="false"]:not(.is-recommended)').first();
          const date = await ordinary.getAttribute('data-calendar-date');
          await ordinary.focus(); await page.locator('[data-calendar-open-day]').click(); await idle(page);
          assert.equal(await page.locator('#bookingDate').inputValue(), date);
          await page.reload(); await idle(page);
          await page.locator('.calendar-day[aria-disabled="false"]').first().focus();
          const washer = page.locator('[data-calendar-book-washer]').first();
          await washer.waitFor({ state: 'visible' });
          const selected = await washer.evaluate(e => ({ id: Number(e.dataset.calendarBookWasher), slot: e.dataset.calendarSlot, date: e.dataset.calendarDate }));
          await washer.click(); await idle(page);
          assert.equal(await page.locator('#bookingDate').inputValue(), selected.date);
          assert.deepEqual(await page.evaluate(() => ({ ids: bookingFlowState.washerIds, slot: bookingFlowState.slot })), { ids: [selected.id], slot: selected.slot });
          await page.reload(); await idle(page);
        });
      }
      if (role !== 'resident') {
        await step(role, 'All seven administration tabs and return', async () => {
          for (const section of ['overview', 'house', 'logbook', 'fixed', 'people', 'analytics', 'system']) {
            await adminSection(page, section); assert(await page.locator(`[data-admin-section="${section}"]`).isVisible());
          }
          await page.locator('#bookingViewButton').click(); assert(!(await page.locator('body').evaluate(e => e.classList.contains('admin-view'))));
        });
        await step(role, 'Equipment create, rename cancel/save, block cancel/confirm, logbook', async () => {
          await adminSection(page, 'house');
          if (role === 'superadmin') await page.locator('#equipmentManagementViewButton').click();
          await expand(page, '#resourceForm');
          await page.locator('#resourceNameInput').fill(`Audit washer ${role}`);
          await responseClick(page, page.locator('#resourceForm button[type=submit]'), '/api/admin/resources', 'POST', 201);
          let row = page.locator('.resource-admin-item').filter({ hasText: `Audit washer ${role}` });
          await row.getByRole('button', { name: 'Umbenennen', exact: true }).click();
          await row.locator('input').fill('Discarded name'); await row.getByRole('button', { name: 'Abbrechen', exact: true }).click();
          assert.equal(db.prepare('SELECT count(*) n FROM resources WHERE name = ?').get('Discarded name').n, 0);
          await row.getByRole('button', { name: 'Umbenennen', exact: true }).click();
          await row.locator('input').fill(`Renamed washer ${role}`);
          const resource = db.prepare('SELECT id FROM resources WHERE name = ?').get(`Audit washer ${role}`);
          await responseClick(page, row.locator('button[type=submit]'), `/api/admin/resources/${resource.id}`, 'PUT');
          row = page.locator('.resource-admin-item').filter({ hasText: `Renamed washer ${role}` });
          await dialogClick(page, row.getByRole('button', { name: 'Sperren', exact: true }), false);
          assert.equal(db.prepare('SELECT active FROM resources WHERE id=?').get(resource.id).active, 1);
          await dialogClick(page, row.getByRole('button', { name: 'Sperren', exact: true }), true, 'Synthetic fault');
          assert.equal(db.prepare('SELECT active FROM resources WHERE id=?').get(resource.id).active, 0);
          await row.getByRole('button', { name: 'Tagebuch öffnen', exact: true }).click();
          assert(await page.locator('[data-admin-section="logbook"]').isVisible());
        });
        await step(role, 'Apartment create, print, edit cancel/save, invite cancel, card create/revoke', async () => {
          await adminSection(page, 'people'); await expand(page, '#apartmentForm');
          await page.locator('#apartmentLabelInput').fill(`Audit apartment ${role}`);
          await page.locator('#apartmentDisplayNameInput').fill(`Audit household ${role}`);
          await responseClick(page, page.locator('#apartmentForm button[type=submit]'), '/api/admin/apartments/access-card', 'POST', 201);
          await page.locator('.access-card-actions button').click(); assert.equal(await page.evaluate(() => window.__printCalls), 1);
          const apartment = db.prepare('SELECT id FROM apartments WHERE label=?').get(`Audit apartment ${role}`);
          let row = page.locator('#apartmentList .user-admin-item').filter({ hasText: `Audit apartment ${role}` });
          assert.match(await row.locator('.user-admin-identity').innerText(), /Offene QR-Karten: 1/);
          assert.doesNotMatch(await row.locator('.user-admin-identity').innerText(), /noch nicht eingeladen/);
          await row.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
          await row.locator('.apartment-edit-form input').fill('Not saved');
          await row.locator('.apartment-edit-form [data-cancel]').click();
          assert.equal(db.prepare('SELECT display_name FROM apartments WHERE id=?').get(apartment.id).display_name, `Audit household ${role}`);
          await row.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
          await row.locator('.apartment-edit-form input').fill(`Changed household ${role}`);
          await responseClick(page, row.locator('.apartment-edit-form button[type=submit]'), `/api/admin/apartments/${apartment.id}`, 'PUT');
          assert.equal(db.prepare('SELECT display_name FROM apartments WHERE id=?').get(apartment.id).display_name, `Changed household ${role}`);
          await row.getByRole('button', { name: 'Per E-Mail einladen', exact: true }).click();
          await row.locator('.apartment-invite-form [data-cancel]').click(); assert(await row.locator('.apartment-invite-form').isHidden());
          await responseClick(page, row.getByRole('button', { name: 'Zugangskarte erstellen', exact: true }), `/api/admin/apartments/${apartment.id}/access-card`, 'POST', 201);
          const revoke = row.getByRole('button', { name: /offene.*Zugangskarte.*sperren/ });
          await dialogClick(page, revoke, false); assert(await revoke.isVisible());
          await dialogClick(page, revoke, true); await revoke.waitFor({ state: 'hidden' }); assert.equal(await revoke.count(), 0);
          for (let attempt = 0; attempt < 2; attempt++) {
            const sent = mail.length;
            await row.getByRole('button', { name: /^(Per E-Mail einladen|E-Mail-Einladung erneuern)$/ }).click();
            await row.locator('.apartment-invite-form input').fill(`invited-${role}@example.invalid`);
            await responseClick(page, row.locator('.apartment-invite-form button[type=submit]'), `/api/admin/apartments/${apartment.id}/invitation`);
            assert(mail.length > sent, 'Invitation and renewal reach the local SMTP sink');
          }
          const managedApartment = db.prepare('SELECT apartment_id FROM users WHERE id=?').get(managed).apartment_id;
          const occupied = page.locator('#apartmentList .user-admin-item').filter({ hasText: 'button-managed' });
          await responseClick(page, occupied.getByRole('button', { name: 'Weitere Person per QR-Karte hinzufügen' }), `/api/admin/apartments/${managedApartment}/access-card`, 'POST', 201);
          assert(await page.locator('.resident-access-card img').isVisible());
          await occupied.getByRole('button', { name: /^(Per E-Mail einladen|E-Mail-Einladung erneuern)$/ }).click();
          await occupied.locator('.apartment-invite-form input').fill(`additional-${role}@example.invalid`);
          const sent = mail.length;
          await responseClick(page, occupied.locator('.apartment-invite-form button[type=submit]'), `/api/admin/apartments/${managedApartment}/invitation`);
          assert(mail.length > sent);
          assert.equal(db.prepare('SELECT claimed_by FROM apartments WHERE id=?').get(managedApartment).claimed_by, managed);
        });
        await step(role, 'Account deactivate/reactivate and recovery cancel/confirm', async () => {
          const row = page.locator('#userList .user-admin-item').filter({ hasText: 'button-managed' });
          await responseClick(page, row.getByRole('button', { name: 'Deaktivieren', exact: true }), `/api/admin/users/${managed}/status`, 'PUT');
          assert.equal(db.prepare('SELECT active FROM users WHERE id=?').get(managed).active, 0);
          await responseClick(page, row.getByRole('button', { name: 'Aktivieren', exact: true }), `/api/admin/users/${managed}/status`, 'PUT');
          assert.equal(db.prepare('SELECT active FROM users WHERE id=?').get(managed).active, 1);
          await dialogClick(page, row.getByRole('button', { name: 'Wiederherstellungscode', exact: true }), false);
          await dialogClick(page, row.getByRole('button', { name: 'Wiederherstellungscode', exact: true }), true);
          assert(await page.locator('#adminAccountRecoveryResult').isVisible());
          assert((await page.locator('#adminAccountRecoveryResult code').innerText()).length > 5);
          if (role === 'houseadmin') {
            const peer = page.locator('#userList .user-admin-item').filter({ hasText: 'button-spareadmin' });
            assert.equal(await peer.locator('button').count(), 0, 'House admins cannot modify peers');
          } else {
            await responseClick(page, row.getByRole('button', { name: 'Haus-Adminrecht geben', exact: true }), `/api/admin/users/${managed}/role`, 'PUT');
            assert(db.prepare('SELECT 1 FROM user_house_roles WHERE user_id=?').get(managed));
            await responseClick(page, row.getByRole('button', { name: 'Adminrecht entziehen', exact: true }), `/api/admin/users/${managed}/role`, 'PUT');
            assert(!db.prepare('SELECT 1 FROM user_house_roles WHERE user_id=?').get(managed));
          }
        });
        await step(role, 'Recurring booking create/remove confirmation and cancellation', async () => {
          await adminSection(page, 'fixed'); await expand(page, '#fixedBookingForm');
          await page.locator('#fixedBookingLabel').fill(`Button series ${role}`);
          const date = await page.evaluate(() => addDaysString(todayString(), 21));
          await page.locator('#fixedBookingStart').fill(date);
          await page.locator('#fixedBookingEndType').selectOption('count'); await page.locator('#fixedBookingCount').fill('1');
          await responseClick(page, page.locator('#fixedBookingSubmit'), '/api/admin/fixed-bookings', 'POST', 201);
          await adminSection(page, 'overview');
          const jumps = await page.locator('[data-admin-jump]').count();
          for (let i = 0; i < jumps; i++) {
            const jump = page.locator('[data-admin-jump]').nth(i);
            const section = await jump.getAttribute('data-admin-jump');
            await jump.click(); assert(await page.locator(`[data-admin-section="${section}"]`).isVisible());
            await adminSection(page, 'overview');
          }
          await adminSection(page, 'fixed');
          const row = page.locator('#fixedBookingList').locator('article').filter({ hasText: `Button series ${role}` });
          const remove = row.getByRole('button', { name: 'Entfernen', exact: true });
          await dialogClick(page, remove, false); assert(await remove.isVisible());
          assert(db.prepare('SELECT id FROM fixed_bookings WHERE label=? AND active=1').get(`Button series ${role}`));
          await dialogClick(page, remove, true); await remove.waitFor({ state: 'hidden' }); assert.equal(await remove.count(), 0);
          assert.equal(db.prepare('SELECT count(*) AS n FROM fixed_bookings WHERE label=? AND active=1').get(`Button series ${role}`).n, 0);
          const resource = db.prepare("SELECT id FROM resources WHERE house_id=? AND active=1 AND type='washer' LIMIT 1").get(house).id;
          const creator = db.prepare('SELECT id FROM users WHERE username=?').get(username).id;
          const legacy = Number(db.prepare("INSERT INTO fixed_bookings(resource_id,weekday,slot,label,active,created_by) VALUES (?,1,'17:00-21:00',?,1,?)").run(resource, `Legacy button ${role}`, creator).lastInsertRowid);
          await page.reload(); await idle(page); await adminSection(page, 'fixed');
          const old = page.locator('#fixedBookingList article').filter({ hasText: `Legacy button ${role}` }).getByRole('button', { name: 'Entfernen', exact: true });
          await dialogClick(page, old, false); assert.equal(db.prepare('SELECT active FROM fixed_bookings WHERE id=?').get(legacy).active, 1);
          await dialogClick(page, old, true); assert.equal(db.prepare('SELECT active FROM fixed_bookings WHERE id=?').get(legacy).active, 0);
        });
        await step(role, 'Local SMTP test button, disabled push and audit disclosure', async () => {
          db.prepare('UPDATE users SET email=?, email_verified=1, email_verified_value=? WHERE username=?').run(`${role}@example.invalid`, `${role}@example.invalid`, username);
          await page.reload(); await idle(page);
          await adminSection(page, 'system');
          const before = mail.length;
          await responseClick(page, page.locator('#adminEmailTestButton'), '/api/admin/email-test');
          assert(mail.length > before, 'UI test mail reaches local SMTP sink');
          assert(await page.locator('#adminPushTestButton').isDisabled());
          await page.locator('.audit-panel > summary').click();
          assert((await page.locator('#auditLog').innerText()).length > 0);
          await page.locator('.audit-panel > summary').click();
        });
        await step(role, 'Admin push target all/person and error (provider boundary stub)', async () => {
          const targets = [];
          await page.route('**/api/admin/overview', async route => {
            const response = await route.fetch(); const data = await response.json();
            await route.fulfill({ response, json: { ...data, push: { enabled: true, configured: true, activeSubscriptions: 1 } } });
          });
          await page.route('**/api/admin/push-devices', route => route.fulfill({ json: { totalDevices: 1, users: [{ id: managed, username: 'button-managed', devices: 1 }] } }));
          let fail = false;
          await page.route('**/api/admin/push-test', route => {
            targets.push(route.request().postDataJSON().userId);
            return route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: 'Synthetic push unavailable' } : { ok: true, message: 'Synthetic push accepted' } });
          });
          await page.reload(); await idle(page); await adminSection(page, 'system');
          for (const target of ['all', String(managed)]) {
            await page.locator('#adminPushTarget').selectOption(target);
            await responseClick(page, page.locator('#adminPushTestButton'), '/api/admin/push-test');
            assert.equal(targets.at(-1), target);
          }
          fail = true;
          await responseClick(page, page.locator('#adminPushTestButton'), '/api/admin/push-test', 'POST', 503);
          assert.match(await page.locator('#statusText').textContent(), /Synthetic push unavailable/);
          for (const path of ['overview', 'push-devices', 'push-test']) await page.unroute(`**/api/admin/${path}`);
          await page.reload(); await idle(page);
        });
      }
    }
    const superPage = pages.superadmin;
    const residentPage = pages.resident;
    for (const role of ['houseadmin', 'superadmin']) {
      const page = pages[role]; auditPage = page;
      await step(role, 'Verified-email account reset button delivers to local SMTP', async () => {
        db.prepare('UPDATE users SET email=?,email_verified=1,email_verified_value=? WHERE id=?').run('managed@example.invalid', 'managed@example.invalid', managed);
        await page.reload(); await idle(page); await adminSection(page, 'people');
        const row = page.locator('#userList .user-admin-item').filter({ hasText: 'button-managed' });
        const before = mail.length;
        await responseClick(page, row.getByRole('button', { name: 'Reset-Link senden', exact: true }), `/api/admin/users/${managed}/password-reset`);
        assert(mail.length > before);
      });
    }
    await step('resident', 'All eight game families, both modes, sound, actual score completion and deletion', async () => {
      auditPage = residentPage;
      await require('./button-game-cases')(residentPage, db, db.prepare('SELECT id FROM users WHERE username=?').get('button-resident').id);
    });
    for (const mode of ['time', 'machine']) {
      await step('resident', `Complete ${mode}-first package wizard, back/select/deselect, package cancellation`, async () => {
        auditPage = residentPage;
        const date = await residentPage.evaluate(offset => {
          let date = addDaysString(todayString(), offset);
          while (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) date = addDaysString(date, 1);
          return date;
        }, mode === 'time' ? 2 : 3);
        await residentPage.locator('#bookingDate').fill(date); await residentPage.locator('#bookingDate').press('Tab'); await idle(residentPage);
        await residentPage.locator(`[data-booking-mode="${mode}"]`).click(); await idle(residentPage);
        const flow = residentPage.locator('#bookingFlowContent');
        if (mode === 'time') await flow.locator('[data-flow-time]:not([disabled])').first().click();
        const washer = flow.locator('[data-flow-washer]').first();
        await washer.click(); assert.equal(await washer.getAttribute('aria-pressed'), 'true');
        await washer.click(); assert.equal(await washer.getAttribute('aria-pressed'), 'false'); await washer.click();
        await flow.getByRole('button', { name: 'Weiter zum Trockenraum', exact: true }).click();
        await flow.locator('[data-flow-drying="none"]').click();
        await flow.locator('[data-flow-drying]:not([data-flow-drying="none"])').first().click();
        await flow.locator('.flow-change-room').click();
        await flow.locator('[data-flow-drying]:not([data-flow-drying="none"])').first().click();
        const duration = flow.locator('.flow-duration select');
        const options = await duration.locator('option').evaluateAll(items => items.map(e => e.value));
        await duration.selectOption(options[options.length - 1]);
        await flow.getByRole('button', { name: 'Weiter zum Tumbler', exact: true }).click();
        await flow.locator('[data-flow-tumbler="none"]').click();
        await flow.locator('[data-flow-tumbler]:not([data-flow-tumbler="none"])').first().click();
        await flow.getByRole('button', { name: /paket pr/i }).click();
        await flow.getByRole('button', { name: /^Zur(ü|ue)ck$/ }).click();
        await flow.getByRole('button', { name: /paket pr/i }).click();
        await responseClick(residentPage, flow.getByRole('button', { name: 'Waschpaket buchen', exact: true }), '/api/booking-package', 'POST', 201);
        const owner = db.prepare('SELECT id FROM users WHERE username=?').get('button-resident').id;
        const stored = db.prepare('SELECT * FROM bookings WHERE user_id=? AND booking_date=?').all(owner, date);
        assert(stored.length >= 3, 'Washer, drying and tumbler must be stored');
        const group = stored.find(b => b.group_id).group_id;
        const row = residentPage.locator('#myBookings .booking-list-item').filter({ hasText: date });
        const remove = mode === 'time' ? row.getByRole('button', { name: /Paket absagen|Absagen.*informieren|Paket.*freigeben/ }) : row.getByRole('button', { name: /Ganzes Paket/ });
        await dialogClick(residentPage, remove, false); assert(db.prepare('SELECT id FROM bookings WHERE group_id=?').get(group));
        await dialogClick(residentPage, remove, true); assert(!db.prepare('SELECT id FROM bookings WHERE group_id=?').get(group));
      });
    }
    await step('resident', 'Remaining slot selection, cancel, tumbler removal and package cancellation', async () => {
      auditPage = residentPage;
      await residentPage.locator('#openRemainingSlotButton').click();
      await residentPage.locator('#remainingSlotForm').waitFor({ state: 'visible' });
      assert(await residentPage.locator('#bookRemainingSlotButton').isDisabled());
      await residentPage.locator('#cancelRemainingSlotButton').click();
      assert(await residentPage.locator('#remainingSlotForm').isHidden());
      await residentPage.locator('#openRemainingSlotButton').click();
      await residentPage.locator('#remainingSlotForm').waitFor({ state: 'visible' });
      await residentPage.locator('#remainingSlotSelfDrying').check();
      assert(!(await residentPage.locator('#bookRemainingSlotButton').isDisabled()));
      await residentPage.locator('#remainingSlotUseTumbler').check();
      await residentPage.locator('#remainingSlotTumbler').selectOption({ index: 1 });
      await responseClick(residentPage, residentPage.locator('#bookRemainingSlotButton'), '/api/remaining-slots', 'POST', 201);
      const item = residentPage.locator('#myBookings .booking-list-item').filter({ hasText: 'Restplatz' });
      const remove = item.getByRole('button', { name: 'Tumbler entfernen', exact: true });
      await dialogClick(residentPage, remove, false); assert(await remove.isVisible());
      await dialogClick(residentPage, remove, true); await remove.waitFor({ state: 'hidden' });
      const cancel = item.getByRole('button', { name: 'Restplatz stornieren', exact: true });
      await dialogClick(residentPage, cancel, false); assert(await cancel.isVisible());
      await dialogClick(residentPage, cancel, true); await item.waitFor({ state: 'hidden' });
    });
    await step('resident', 'Individual booking deletion, cancellation notice and early release', async () => {
      auditPage = residentPage;
      const owner = db.prepare('SELECT id FROM users WHERE username=?').get('button-resident').id;
      const resource = db.prepare("SELECT id FROM resources WHERE house_id=? AND type='washer' AND active=1 LIMIT 1").get(house).id;
      for (const action of ['delete', 'notify', 'release']) {
        const date = await residentPage.evaluate(offset => {
          let date = addDaysString(todayString(), offset);
          while (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) date = addDaysString(date, 1);
          return date;
        }, action === 'release' ? 0 : 1);
        const id = Number(db.prepare('INSERT INTO bookings(user_id,resource_id,booking_date,slot) VALUES (?,?,?,?)').run(owner, resource, date, action === 'release' ? '07:00-12:00' : '12:00-17:00').lastInsertRowid);
        await residentPage.reload(); await idle(residentPage);
        const item = residentPage.locator('#myBookings .booking-list-item').first();
        if (action === 'release') {
          await responseClick(residentPage, item.getByRole('button', { name: /^Fr(ü|ue)her frei$/ }), `/api/bookings/${id}/release`);
          assert(!db.prepare('SELECT id FROM bookings WHERE id=?').get(id));
          assert(db.prepare("SELECT id FROM release_notices WHERE resource_id=? AND kind='early_release'").get(resource));
        } else {
          const button = item.getByRole('button', { name: action === 'delete' ? /^L(ö|oe)schen$/ : 'Absagen & informieren', exact: true });
          await dialogClick(residentPage, button, false); assert(db.prepare('SELECT id FROM bookings WHERE id=?').get(id));
          await dialogClick(residentPage, button, true); assert(!db.prepare('SELECT id FROM bookings WHERE id=?').get(id));
        }
      }
    });
    await step('resident', 'Spotlight, notification detail both close buttons and actual individual booking', async () => {
      const resource = db.prepare("SELECT id,name FROM resources WHERE house_id=? AND type='washer' AND active=1 LIMIT 1").get(house);
      const date = await residentPage.evaluate(() => {
        let date = addDaysString(todayString(), 1);
        while (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) date = addDaysString(date, 1);
        return date;
      });
      db.prepare("INSERT INTO release_notices(resource_id,resource_name,booking_date,slot,kind,message,house_id,created_by) VALUES (?,?,?,'12:00-17:00','cancellation','Synthetic notice',?,?)").run(resource.id, resource.name, date, house, managed);
      await residentPage.reload(); await idle(residentPage);
      await residentPage.locator('#openMessageCenterButton').click();
      await residentPage.locator('#closeMessageCenterButton').click();
      for (const close of ['closeReleaseNoticeButton', 'dismissReleaseNoticeButton']) {
        await residentPage.locator('#releaseSpotlightContent button').click();
        await residentPage.locator(`#${close}`).click(); assert(await residentPage.locator('#releaseNoticeOverlay').isHidden());
      }
      await residentPage.locator('#releaseSpotlightContent button').click();
      await responseClick(residentPage, residentPage.locator('#bookReleaseNoticeButton'), '/api/bookings', 'POST', 201);
      const booking = db.prepare('SELECT id FROM bookings WHERE resource_id=? AND booking_date=?').get(resource.id, date);
      assert(booking); assert(await residentPage.locator('#releaseNoticeOverlay').isHidden());
      await residentPage.locator('#bookingDate').fill(date); await residentPage.locator('#bookingDate').press('Tab'); await idle(residentPage);
      await residentPage.locator(`.calendar-day[data-calendar-date="${date}"]`).hover();
      await residentPage.locator(`[data-calendar-open-package="${date}"]`).first().click();
      const flow = residentPage.locator('#bookingFlowContent');
      await flow.getByRole('button', { name: /Trocknung erg/ }).click();
      await flow.locator('[data-flow-drying="none"]').click();
      await flow.getByRole('button', { name: 'Weiter zum Tumbler', exact: true }).click();
      await flow.locator('[data-flow-tumbler]:not([data-flow-tumbler="none"])').first().click();
      await flow.getByRole('button', { name: /paket pr/i }).click();
      await responseClick(residentPage, flow.getByRole('button', { name: /Erg.*buchen/ }), '/api/booking-package', 'POST', 201);
      const group = db.prepare('SELECT group_id FROM bookings WHERE id=?').get(booking.id).group_id;
      assert(group); assert(db.prepare('SELECT count(*) AS n FROM bookings WHERE group_id=?').get(group).n >= 2);
      await dialogClick(residentPage, residentPage.locator('#myBookings').getByRole('button', { name: /Ganzes Paket/ }), true);
      assert.equal(db.prepare('SELECT count(*) AS n FROM bookings WHERE group_id=?').get(group).n, 0);
    });
    await step('resident', 'Report dialog cancel/close, real report, preferences and personal deletion', async () => {
      auditPage = residentPage;
      await residentPage.locator('#reportIssueButton').click();
      await residentPage.locator('#reportIssueSubject').fill('Cancelled draft');
      await residentPage.locator('#cancelReportIssueButton').click(); assert(await residentPage.locator('#reportIssueOverlay').isHidden());
      await residentPage.locator('#reportIssueButton').click(); await residentPage.locator('#closeReportIssueButton').click();
      await residentPage.locator('#reportIssueButton').click();
      await residentPage.locator('#reportIssueSubject').fill('Audit real resident fault');
      await residentPage.locator('#reportIssueDescription').fill('Synthetic observation, no production equipment.');
      assert(await residentPage.locator('#reportNotifyEmail').isDisabled());
      const response = await responseClick(residentPage, residentPage.locator('#reportIssueForm button[type=submit]'), '/api/maintenance-cases', 'POST', 201);
      const created = await response.json();
      await residentPage.locator('#reportIssueButton').click();
      const row = residentPage.locator('.own-maintenance-item').filter({ hasText: 'Audit real resident fault' });
      const report = db.prepare('SELECT id FROM maintenance_reports WHERE title=?').get('Audit real resident fault');
      await responseClick(residentPage, row.getByRole('button', { name: 'Hinweise speichern', exact: true }), `/api/maintenance-reports/${report.id}/preferences`, 'PUT');
      await dialogClick(residentPage, row.getByRole('button', { name: 'Meine Meldung löschen', exact: true }), false);
      assert(db.prepare('SELECT id FROM maintenance_reports WHERE id=?').get(report.id));
      await dialogClick(residentPage, row.getByRole('button', { name: 'Meine Meldung löschen', exact: true }), true);
      await row.waitFor({ state: 'hidden' });
      assert(!db.prepare('SELECT id FROM maintenance_reports WHERE id=?').get(report.id));
      assert(db.prepare('SELECT id FROM maintenance_cases WHERE id=?').get(created.id), 'Neutral case remains');
      await residentPage.locator('#closeReportIssueButton').click();
    });
    for (const role of ['houseadmin', 'superadmin']) {
      const admin = pages[role]; auditPage = admin;
      await step(role, 'Fault takeover requires decision, blocks equipment, note, repair, failed/successful test', async () => {
        const name = `Audit blocked fault ${role}`;
        await residentPage.locator('#reportIssueButton').click();
        const resourceId = Number(await residentPage.locator('#reportIssueResource').inputValue());
        await residentPage.locator('#reportIssueSubject').fill(name);
        await residentPage.locator('#reportIssueDescription').fill('Synthetic fault workflow');
        const response = await responseClick(residentPage, residentPage.locator('#reportIssueForm button[type=submit]'), '/api/maintenance-cases', 'POST', 201);
        const created = await response.json();
        if (await residentPage.locator('#reportIssueOverlay').isVisible()) await residentPage.locator('#closeReportIssueButton').click();
        await admin.reload(); await idle(admin); await adminSection(admin, 'logbook');
        await admin.locator('#maintenanceStatusFilter').selectOption('new');
        // One open case per resource: a previous neutral report may be merged.
        const resourceName = db.prepare('SELECT name FROM resources WHERE id=?').get(resourceId).name;
        const card = admin.locator('.maintenance-case').filter({ hasText: resourceName }).first();
        await card.locator('textarea').fill('Synthetic takeover');
        await card.locator('button[type=submit]').click();
        assert.equal(db.prepare('SELECT status FROM maintenance_cases WHERE id=?').get(created.id).status, 'reported');
        await card.locator('input[value=block]').check();
        await responseClick(admin, card.locator('button[type=submit]'), `/api/admin/maintenance-cases/${created.id}/actions`);
        assert.equal(db.prepare('SELECT active FROM resources WHERE id=?').get(resourceId).active, 0);
        for (const [action, outcome] of [['note', null], ['repair', null], ['test', 'false'], ['repair', null], ['test', 'true']]) {
          console.log(`${role} maintenance ${created.id}: ${action} ${outcome || ''}`);
          await card.locator('.maintenance-step-field select').selectOption(action);
          if (outcome) await card.locator('.maintenance-test-field select').selectOption(outcome);
          await card.locator('textarea').fill(`Synthetic ${action} ${outcome || ''}`);
          await responseClick(admin, card.locator('button[type=submit]'), `/api/admin/maintenance-cases/${created.id}/actions`);
          if (outcome === 'false') assert.equal(db.prepare('SELECT active FROM resources WHERE id=?').get(resourceId).active, 0);
        }
        assert.equal(db.prepare('SELECT active FROM resources WHERE id=?').get(resourceId).active, 1);
        assert.equal(db.prepare('SELECT status FROM maintenance_cases WHERE id=?').get(created.id).status, 'closed');
        await admin.locator('#maintenanceStatusFilter').selectOption('done');
        assert.equal(await card.locator('button[type=submit]').count(), 0);
        for (const summary of await card.locator('summary').all()) await summary.click();
        await admin.locator('#maintenanceStatusFilter').selectOption('new');
        // Historic tested cases are valid persisted states even though the
        // current successful-test form closes atomically in one operation.
        for (const action of ['release', 'close']) {
          const actor = db.prepare('SELECT id FROM users WHERE username=?').get(`button-${role === 'superadmin' ? 'super' : 'houseadmin'}`).id;
          const legacy = Number(db.prepare("INSERT INTO maintenance_cases(house_id,resource_id,title,description,status) VALUES (?,?,?,?,'tested')").run(house, resourceId, `Legacy ${role} ${action}`, 'Synthetic legacy fixture').lastInsertRowid);
          for (const type of action === 'release' ? ['block', 'repair', 'test_passed'] : ['repair', 'test_passed']) {
            db.prepare('INSERT INTO maintenance_entries(case_id,entry_type,note,created_by) VALUES (?,?,?,?)').run(legacy, type, 'Synthetic verified history', actor);
          }
          db.prepare('UPDATE resources SET active=? WHERE id=?').run(action === 'release' ? 0 : 1, resourceId);
          await admin.reload(); await idle(admin); await adminSection(admin, 'logbook');
          await admin.locator('#maintenanceStatusFilter').selectOption('in_progress');
          const historic = admin.locator('.maintenance-case').filter({ hasText: resourceName }).first();
          await historic.locator('.maintenance-step-field select').selectOption(action);
          await historic.locator('textarea').fill(`Synthetic legacy ${action}`);
          await responseClick(admin, historic.locator('button[type=submit]'), `/api/admin/maintenance-cases/${legacy}/actions`);
          assert.equal(db.prepare('SELECT status FROM maintenance_cases WHERE id=?').get(legacy).status, 'closed');
          assert.equal(db.prepare('SELECT active FROM resources WHERE id=?').get(resourceId).active, 1);
        }
      });
    }
    for (const decision of ['reject', 'accept']) {
      await step('resident/houseadmin', `Name correction ${decision}`, async () => {
        auditPage = residentPage;
        await settings(residentPage, 'profile'); await expand(residentPage, '#requestedDisplayName');
        await residentPage.locator('#requestedDisplayName').fill(`Audit suggestion ${decision}`);
        await residentPage.locator('#displayNameRequestNote').fill('Synthetic correction request');
        await responseClick(residentPage, residentPage.locator('#sendDisplayNameRequestButton'), '/api/me/apartment-name-request', 'POST', 201);
        await residentPage.locator('#closeSettingsButton').click();
        const admin = pages.houseadmin; auditPage = admin;
        await admin.reload(); await idle(admin); await adminSection(admin, 'people');
        const row = admin.locator('#apartmentList .user-admin-item').filter({ hasText: 'button-resident' });
        await row.getByRole('button', { name: 'Vorschlag pruefen', exact: true }).click();
        if (decision === 'reject') {
          await row.locator('[data-reject]').click();
          await row.locator('[data-reject]').waitFor({ state: 'hidden' });
        } else {
          const apartment = db.prepare('SELECT apartment_id FROM users WHERE username=?').get('button-resident').apartment_id;
          await responseClick(admin, row.locator('.apartment-edit-form button[type=submit]'), `/api/admin/apartments/${apartment}`, 'PUT');
          assert.equal(db.prepare('SELECT display_name FROM apartments WHERE id=?').get(apartment).display_name, `Audit suggestion ${decision}`);
        }
      });
    }
    auditPage = superPage;
    await step('superadmin', 'House create, rename cancel/save, mode, deactivate/reactivate', async () => {
      await adminSection(superPage, 'house'); await superPage.locator('#houseManagementViewButton').click();
      await expand(superPage, '#houseForm'); await superPage.locator('#houseNameInput').fill('Audit empty house');
      await responseClick(superPage, superPage.locator('#houseForm button[type=submit]'), '/api/admin/houses', 'POST', 201);
      // Creation deliberately switches the active context. Switch back through the normal selector.
      await superPage.locator('#houseSelect').selectOption(String(house)); await idle(superPage);
      await adminSection(superPage, 'house'); await superPage.locator('#houseManagementViewButton').click();
      let row = superPage.locator('.house-admin-item').filter({ hasText: 'Audit empty house' });
      const id = db.prepare('SELECT id FROM houses WHERE name=?').get('Audit empty house').id;
      await row.getByRole('button', { name: 'Umbenennen', exact: true }).click();
      await row.locator('.house-name-form input').fill('Discard house'); await row.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      assert.equal(db.prepare('SELECT name FROM houses WHERE id=?').get(id).name, 'Audit empty house');
      await row.getByRole('button', { name: 'Umbenennen', exact: true }).click();
      await row.locator('.house-name-form input').fill('Audit renamed house');
      await responseClick(superPage, row.locator('button[type=submit]'), `/api/admin/houses/${id}`, 'PUT');
      row = superPage.locator('.house-admin-item').filter({ hasText: 'Audit renamed house' });
      await row.locator('select').selectOption('liberal'); await idle(superPage);
      assert.equal(db.prepare('SELECT booking_rule_mode FROM houses WHERE id=?').get(id).booking_rule_mode, 'liberal');
      await responseClick(superPage, row.getByRole('button', { name: 'Deaktivieren', exact: true }), `/api/admin/houses/${id}`, 'PUT');
      await until(() => row.getByRole('button', { name: 'Anzeigen', exact: true }).isDisabled());
      await responseClick(superPage, row.getByRole('button', { name: 'Aktivieren', exact: true }), `/api/admin/houses/${id}`, 'PUT');
      await row.getByRole('button', { name: 'Anzeigen', exact: true }).click(); await idle(superPage);
      assert.equal(await superPage.locator('#houseSelect').inputValue(), String(id));
      await superPage.locator('#houseSelect').selectOption(String(house)); await idle(superPage);
      await adminSection(superPage, 'people');
      const user = superPage.locator('#userList .user-admin-item').filter({ hasText: 'button-unbound' });
      await user.locator('select').selectOption(String(id));
      await dialogClick(superPage, user.getByRole('button', { name: 'Verschieben', exact: true }), false);
      assert.equal(db.prepare('SELECT house_id FROM users WHERE id=?').get(unbound).house_id, house);
      await dialogClick(superPage, user.getByRole('button', { name: 'Verschieben', exact: true }), true);
      assert.equal(db.prepare('SELECT house_id FROM users WHERE id=?').get(unbound).house_id, id);
    });
    await step('superadmin', 'Superadmin right grant/revoke, bad password, cancel', async () => {
      await adminSection(superPage, 'system');
      for (const action of ['grant', 'revoke']) {
        await superPage.locator('#superadminPermissionAction').selectOption(action);
        await superPage.locator('#superadminPermissionTarget').selectOption(String(spareAdmin));
        await superPage.locator('#superadminPermissionConfirm').fill(action === 'grant' ? 'SUPERADMINRECHT GEBEN' : 'SUPERADMINRECHT ENTZIEHEN');
        await superPage.locator('#superadminPermissionCurrentPassword').fill('Incorrect-password');
        superPage.once('dialog', dialog => dialog.accept());
        await responseClick(superPage, superPage.locator('#superadminPermissionButton'), `/api/admin/users/${spareAdmin}/superadmin`, 'PUT', 403);
        assert.equal(db.prepare('SELECT is_superadmin FROM users WHERE id=?').get(spareAdmin).is_superadmin, action === 'grant' ? 0 : 1);
        await superPage.locator('#superadminPermissionCurrentPassword').fill(password);
        await dialogClick(superPage, superPage.locator('#superadminPermissionButton'), false);
        assert.equal(db.prepare('SELECT is_superadmin FROM users WHERE id=?').get(spareAdmin).is_superadmin, action === 'grant' ? 0 : 1);
        await dialogClick(superPage, superPage.locator('#superadminPermissionButton'), true);
        assert.equal(db.prepare('SELECT is_superadmin FROM users WHERE id=?').get(spareAdmin).is_superadmin, action === 'grant' ? 1 : 0);
        assert.equal(await superPage.locator('#superadminPermissionCurrentPassword').inputValue(), '');
      }
    });
    await step('superadmin', 'Real backup creation and downloadable SQLite integrity', async () => {
      await responseClick(superPage, superPage.locator('#runBackupButton'), '/api/admin/backup/run');
      const downloaded = superPage.waitForEvent('download'); await superPage.locator('#downloadBackupButton').click();
      const file = await downloaded; const filePath = await file.path();
      const copy = new Database(filePath, { readonly: true });
      assert.equal(copy.pragma('integrity_check', { simple: true }), 'ok'); copy.close();
    });
    await step('superadmin', 'Maintenance missing password/cancel/start/end', async () => {
      await superPage.locator('#toggleMaintenanceButton').click();
      assert.equal(await superPage.locator('#toggleMaintenanceButton').getAttribute('data-active'), 'false');
      await superPage.locator('#maintenanceCurrentPassword').fill(password);
      await dialogClick(superPage, superPage.locator('#toggleMaintenanceButton'), false);
      await dialogClick(superPage, superPage.locator('#toggleMaintenanceButton'), true);
      assert.equal(await superPage.locator('#toggleMaintenanceButton').getAttribute('data-active'), 'true');
      await residentPage.reload(); await idle(residentPage);
      assert(await residentPage.locator('#maintenanceOverlay').isVisible());
      await residentPage.locator('#checkMaintenanceButton').click(); await idle(residentPage);
      assert(await residentPage.locator('#maintenanceOverlay').isVisible());
      await dialogClick(superPage, superPage.locator('#toggleMaintenanceButton'), true);
      assert.equal(await superPage.locator('#toggleMaintenanceButton').getAttribute('data-active'), 'false');
      await residentPage.locator('#checkMaintenanceButton').click(); await idle(residentPage);
      assert(await residentPage.locator('#maintenanceOverlay').isHidden());
    });
    for (const role of ['houseadmin', 'superadmin']) {
      const page = pages[role]; auditPage = page;
      await step(role, 'Booking reset wrong confirmation, cancel and confirmed deletion', async () => {
        const owner = db.prepare('SELECT id FROM users WHERE username=?').get('button-managed').id;
        const resource = db.prepare("SELECT id FROM resources WHERE house_id=? AND type='washer' AND active=1 LIMIT 1").get(house).id;
        const date = await page.evaluate(() => addDaysString(todayString(), 9));
        const booking = Number(db.prepare('INSERT INTO bookings(user_id,resource_id,booking_date,slot) VALUES (?,?,?,?)').run(owner, resource, date, '12:00-17:00').lastInsertRowid);
        await adminSection(page, 'system'); await expand(page, '#resetBookingsConfirm');
        await page.locator('#resetBookingsButton').click(); assert(db.prepare('SELECT id FROM bookings WHERE id=?').get(booking));
        await page.locator('#resetBookingsConfirm').fill('ALLE BUCHUNGEN');
        await page.locator('#resetBookingsCurrentPassword').fill(password);
        await dialogClick(page, page.locator('#resetBookingsButton'), false); assert(db.prepare('SELECT id FROM bookings WHERE id=?').get(booking));
        await dialogClick(page, page.locator('#resetBookingsButton'), true); assert(!db.prepare('SELECT id FROM bookings WHERE id=?').get(booking));
        assert.equal(await page.locator('#resetBookingsCurrentPassword').inputValue(), '');
      });
    }
    for (const [role, username] of Object.entries({ resident: 'button-resident', houseadmin: 'button-houseadmin', superadmin: 'button-super' })) {
      const page = pages[role]; auditPage = page;
      await step(role, 'Session warning stay button renews real local session', async () => {
        await page.evaluate(() => { sessionLastActivityAt = Date.now() - sessionIdleTimeoutMs + 60000; showSessionWarning(); });
        const renewal = page.waitForResponse(r => new URL(r.url()).pathname === '/api/session/keepalive' && r.request().method() === 'POST');
        await page.locator('#sessionStayButton').click();
        assert.equal((await renewal).status(), 200);
        await page.locator('#sessionWarningOverlay').waitFor({ state: 'hidden' });
        assert(await page.evaluate(() => sessionRemainingMs() > sessionIdleTimeoutMs - 10000));
        assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 200);
      });
      await step(role, 'Password mismatch, wrong old password and successful change', async () => {
        await settings(page, 'security');
        await page.locator('#currentPassword').fill(password);
        await page.locator('#newPassword').fill(password + '-new'); await page.locator('#newPasswordConfirmation').fill(password + '-different');
        const before = db.prepare('SELECT password_hash FROM users WHERE username=?').get(username).password_hash;
        await page.locator('#passwordForm button').click();
        assert.equal(db.prepare('SELECT password_hash FROM users WHERE username=?').get(username).password_hash, before);
        await page.locator('#newPasswordConfirmation').fill(password + '-new'); await page.locator('#currentPassword').fill('Incorrect-password');
        await responseClick(page, page.locator('#passwordForm button'), '/api/me/password', 'PUT', 403);
        assert.equal(db.prepare('SELECT password_hash FROM users WHERE username=?').get(username).password_hash, before);
        await page.locator('#currentPassword').fill(password);
        await responseClick(page, page.locator('#passwordForm button'), '/api/me/password', 'PUT');
        assert(bcrypt.compareSync(password + '-new', db.prepare('SELECT password_hash FROM users WHERE username=?').get(username).password_hash));
        assert.equal(await page.locator('#newPassword').inputValue(), '');
        await page.locator('#closeSettingsButton').click();
      });
      const loginIdentifier = await page.locator('#settingsLoginIdentifier').inputValue();
      const identity = db.prepare('SELECT username,email FROM users WHERE username=?').get(username);
      assert.equal(loginIdentifier, /^WZ-/i.test(identity.username) || !identity.email ? identity.username : identity.email);
      await step(role, 'Account menu logout button and invalidated session', async () => {
        await page.locator('#accountMenuButton').click(); await page.locator('#logoutButton').click();
        await page.waitForURL('**/login.html?loggedOut=1');
        assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 401);
      });
      await step(role, 'Session warning logout and self-deletion safety/cancel/confirmation', async () => {
        const login = async () => {
          await page.locator('#loginForm input[name=email]').fill(loginIdentifier);
          await page.locator('#loginForm input[name=password]').fill(password + '-new');
          const authentication = page.waitForResponse(r => new URL(r.url()).pathname === '/api/login' && r.request().method() === 'POST');
          await page.locator('#loginForm button[type=submit]').click();
          assert.equal((await authentication).status(), 200, 'Displayed login identifier must authenticate after logout');
          await page.waitForURL('**/index.html'); await idle(page);
        };
        await login();
        await page.evaluate(() => showSessionWarning());
        await page.route('**/api/logout', route => route.fulfill({ status: 503, json: { error: 'Synthetic logout unavailable' } }));
        await page.locator('#sessionLogoutButton').click(); await idle(page);
        assert(new URL(page.url()).pathname.endsWith('/index.html'), 'Failed logout must not claim success by redirecting');
        assert(await page.locator('#sessionWarningOverlay').isVisible());
        assert(!(await page.locator('#sessionLogoutButton').isDisabled()), 'Failed logout must be retryable');
        await page.waitForTimeout(1100);
        assert.match(await page.locator('#sessionCountdown').textContent(), /erneut/);
        assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 200);
        await page.unroute('**/api/logout');
        await page.locator('#sessionLogoutButton').click();
        await page.waitForURL('**/login.html?loggedOut=1');
        assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 401);
        await login(); await settings(page, 'security');
        await expand(page, '#deleteAccountForm');
        await page.locator('#deleteAccountPassword').fill(password + '-new');
        await dialogClick(page, page.locator('#deleteAccountForm button'), false);
        assert(db.prepare('SELECT id FROM users WHERE username=?').get(username));
        await page.locator('#deleteAccountPassword').fill('Incorrect-password');
        page.once('dialog', d => d.accept());
        await responseClick(page, page.locator('#deleteAccountForm button'), '/api/me', 'DELETE', 403);
        if (role !== 'superadmin') {
          await page.locator('#deleteAccountPassword').fill(password + '-new');
          const accept = dialog => dialog.accept(); page.on('dialog', accept);
          await page.locator('#deleteAccountForm button').click();
          await page.waitForURL('**/login.html'); page.off('dialog', accept);
          assert(!db.prepare('SELECT id FROM users WHERE username=?').get(username));
          assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 401);
        } else {
          await page.locator('#deleteAccountPassword').fill(password + '-new');
          page.once('dialog', d => d.accept());
          await responseClick(page, page.locator('#deleteAccountForm button'), '/api/me', 'DELETE', 400);
          assert(db.prepare('SELECT is_superadmin FROM users WHERE username=?').get(username).is_superadmin);
        }
      });
      if (role === 'resident') await step(role, 'Unassigned legacy account close/reopen/postpone and onboarding logout', async () => {
        await page.locator('#loginForm input[name=email]').fill('button-unbound');
        await page.locator('#loginForm input[name=password]').fill(password);
        await page.locator('#loginForm button[type=submit]').click();
        await page.waitForURL('**/index.html'); await idle(page);
        await page.locator('#closeApartmentSetupButton').click();
        assert(await page.locator('#apartmentSetupOverlay').isHidden());
        if (await page.locator('#settingsOverlay').isVisible()) await page.locator('#settingsDoneButton').click();
        await settings(page, 'profile'); await page.locator('#openApartmentSetupButton').click();
        await page.locator('#postponeApartmentSetupButton').click();
        assert(await page.locator('#apartmentSetupOverlay').isHidden());
        await settings(page, 'profile'); await page.locator('#openApartmentSetupButton').click();
        await page.locator('#apartmentSetupLogoutButton').click();
        await page.waitForURL('**/login.html?loggedOut=1');
        assert.equal((await page.request.get(base + '/api/my-bookings')).status(), 401);
      });
    }
    assert.deepEqual(external, [], 'No external browser requests');
    assert(!results.some(r => r.status !== 'PASS'), 'No browser script errors');
    for (const [file, hash] of Object.entries(candidate.sourceHashes)) {
      assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), hash, `Candidate changed during test: ${file}`);
    }
    console.log(JSON.stringify({ ok: true, scenarios: results.length, clicks: clicks.length, evidence }));
  } finally {
    if (browser) await browser.close();
    if (db) db.close();
    server.kill();
    await new Promise(resolve => smtp.close(resolve));
    fs.writeFileSync(path.join(evidence, 'server.log'), output.join(''));
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ candidate, results, clicks, external }, null, 2));
  }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
