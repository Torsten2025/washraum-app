// QA01-03: real browser/API regression against an isolated, synthetic local database.
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { createHash, randomBytes } = require('crypto');
const Database = require('better-sqlite3');
const { chromium } = require('playwright-core');

async function run() {
  const root = path.resolve(__dirname, '..');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wz-emailfree-regression-'));
  const port = 39762;
  const base = `http://127.0.0.1:${port}`;
  const password = 'Synthetic-Regression-Password-2026!';
  const server = spawn(process.execPath, ['server.js'], { cwd: root, env: {
    ...process.env, NODE_ENV: 'development', APP_ENV: 'development', PORT: String(port),
    DB_PATH: path.join(temporary, 'test.sqlite'), SEED_ADMIN_NAME: 'regression-admin',
    SEED_ADMIN_PASSWORD: password, SESSION_SECRET: 'synthetic-regression-session-secret-32-characters',
    EMAIL_ENABLED: 'false', PUSH_ENABLED: 'false', BACKUP_ENABLED: 'false', AUTO_BACKUP: 'false'
  }, stdio: 'ignore' });
  let browser;
  let flushButtons;
  let db;
  async function request(route, body, cookie = '', method = 'POST') {
    const response = await fetch(base + route, { method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie };
  }
  try {
    let ready = false;
    for (let i = 0; i < 100; i += 1) {
      try { ready = (await fetch(base + '/api/health')).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'isolated server is ready');
    const admin = await request('/api/login', { username: 'regression-admin', password });
    assert.equal(admin.status, 200);
    const createCard = async label => {
      const result = await request('/api/admin/apartments/access-card', { label, displayName: label }, admin.cookie);
      assert.equal(result.status, 201);
      return { ...result.body.accessCard, apartment: result.body.apartment };
    };
    const card = await createCard('Synthetic household one');
    const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
    ].find(candidate => fs.existsSync(candidate));
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    flushButtons = await require('./button-coverage').trackButtons(browser, 'emailfree');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const screenshots = path.join(root, 'artifacts', 'qr-test2');
    fs.mkdirSync(screenshots, { recursive: true });
    await page.goto(base + '/login.html');
    for (const language of ['de', 'en']) {
      await page.locator('[data-language-picker]').selectOption(language);
      assert.match(await page.locator('#accessCardOnboardingHint').innerText(), language === 'de' ? /keine E-Mail nötig/ : /no email needed/);
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(screenshots, `login-${language}-${width}.png`), fullPage: true });
      }
    }
    const adminContext = await browser.newContext({ viewport: { width: 390, height: 1000 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(base + '/login.html');
    await adminPage.locator('#loginForm input[name=email]').fill('regression-admin');
    await adminPage.locator('#loginForm input[name=password]').fill(password);
    await adminPage.locator('#loginForm button[type=submit]').click();
    await adminPage.waitForURL('**/index.html');
    await adminPage.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
    for (const language of ['de', 'en']) {
      await adminPage.evaluate(async data => {
        window.WZ_I18N.setLanguage(data.language);
        await loadAdmin();
        settingsOverlay.hidden = true;
        setAppView('admin', { userInitiated: true });
        setAdminSection('people');
        showApartmentInvitationResult({ accessCard: data.card }, data.card.apartment);
      }, { language, card });
      const printed = adminPage.locator('.resident-access-card');
      assert.match(await printed.locator('.access-card-manual-url').innerText(), new RegExp(base.replaceAll('.', '\\.') + '/login.html'));
      assert.ok(!(await printed.locator('.access-card-manual-url').innerText()).includes('?access='));
      assert.match(await printed.locator('.access-card-manual-url').innerText(), language === 'de' ? /Zugangskarte/ : /Access card/);
      assert.ok(await printed.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await adminPage.evaluate(() => window.scrollTo(0, 0));
      await adminPage.screenshot({ path: path.join(screenshots, `card-${language}-390.png`), fullPage: true });
      await adminPage.setViewportSize({ width: 794, height: 1123 }); // A4 at 96 CSS dpi
      await adminPage.evaluate(() => document.body.classList.add('printing-access-card'));
      await adminPage.emulateMedia({ media: 'print' });
      assert.equal(await printed.evaluate(el => el.checkVisibility()), true);
      await printed.screenshot({ path: path.join(screenshots, `print-${language}.png`) });
      for (const selector of ['img', '.access-card-manual-url']) {
        const uncovered = await printed.locator(selector).evaluate(el => {
          const r = el.getBoundingClientRect();
          const inset = el.tagName === 'IMG' ? 20 : 2; // QR image has a 14px rounded border.
          return [[r.left + inset, r.top + inset], [r.right - inset, r.top + inset],
            [r.left + inset, r.bottom - inset], [r.right - inset, r.bottom - inset]].map(([x, y]) => {
            const top = document.elementFromPoint(x, y);
            return { x, y, clear: top === el || el.contains(top), top: top?.tagName + '.' + top?.className };
          });
        });
        assert.ok(uncovered.every(point => point.clear), `A4 print ${selector} must not be clipped or covered: ${JSON.stringify(uncovered)}`);
      }
      await printed.screenshot({ path: path.join(screenshots, `print-${language}.png`) });
      await adminPage.emulateMedia({ media: 'screen' });
      await adminPage.evaluate(() => document.body.classList.remove('printing-access-card'));
      await adminPage.setViewportSize({ width: 390, height: 1000 });
    }
    await adminContext.close();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(card.activationUrl);
    await page.locator('#accessCardForm input[name=password]').fill(password);
    await page.locator('#accessCardForm input[name=passwordConfirmation]').fill(password);
    await page.locator('#accessCardForm button[type=submit]').click();
    await page.waitForURL('**/index.html?welcome=1');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
    await page.evaluate(() => openSettings());
    assert.equal(await page.locator('#notificationEmail').getAttribute('required'), null);
    assert.equal(await page.locator('#settingsLoginIdentifier').inputValue(), card.accessId);
    assert.equal(await page.locator('#settingsLoginIdentifier').evaluate(el => el.readOnly), true);
    assert.equal(await page.locator('#settingsUsername').inputValue(), 'Synthetic household one');
    const saved = page.waitForResponse(r => r.url().endsWith('/api/me/notifications') && r.request().method() === 'PUT');
    await page.locator('[data-i18n="settings.saveProfile"]').click();
    assert.equal((await saved).status(), 200, 'actual profile form saves without email');
    await page.evaluate(() => setSettingsSection('notifications'));
    await page.locator('#notifyReleases').uncheck();
    await page.locator('#notificationResourceType').selectOption('washer');
    await page.locator('#notificationWeekday').selectOption('1');
    const filterSaved = page.waitForResponse(r => r.url().endsWith('/api/me/notifications') && r.request().method() === 'PUT');
    await page.locator('[data-i18n="settings.saveNotifications"]').click();
    assert.equal((await filterSaved).status(), 200);
    await page.reload();
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
    await page.evaluate(() => { openSettings(); setSettingsSection('notifications'); });
    assert.equal(await page.locator('#notifyReleases').isChecked(), false);
    assert.equal(await page.locator('#notificationResourceType').inputValue(), 'washer');
    assert.equal(await page.locator('#notificationWeekday').inputValue(), '1');
    for (const language of ['de', 'en']) {
      await page.evaluate(() => setSettingsSection('profile'));
      await page.locator('#settingsLanguage').selectOption(language);
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const identity = page.locator('#settingsLoginIdentifier');
        await identity.scrollIntoViewIfNeeded();
        assert.equal(await identity.inputValue(), card.accessId);
        const box = await identity.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= width, 'ID fits viewport');
        assert.match(await page.locator('#settingsLoginIdentifierHint').textContent(), language === 'en' ? /before destroying/ : /bevor/);
      }
      await page.reload();
      await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
      await page.evaluate(() => openSettings());
      assert.equal(await page.locator('#settingsLoginIdentifier').inputValue(), card.accessId);
    }
    const account = await request('/api/login', { username: card.accessId, password });
    assert.equal(account.status, 200);
    db = new Database(path.join(temporary, 'test.sqlite'));
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(card.accessId);
    const issueVerification = (kind, email) => {
      const token = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO email_verification_tokens (user_id, token_hash, email_kind, email_value, expires_at) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, createHash('sha256').update(token).digest('hex'), kind, email, String(Date.now() + 60000));
      return token;
    };
    const confirmVerification = async (kind, email) => {
      const token = issueVerification(kind, email);
      const response = await fetch(base + '/api/email-verification/confirm?token=' + token, { redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.match(response.headers.get('location'), /verification=ok/);
    };
    const preferences = { email: '', secondaryEmail: '', notifyReleases: false, resourceType: 'washer', weekday: 1, slot: '' };
    const save = body => request('/api/me/notifications', { ...preferences, ...body }, account.cookie, 'PUT');
    assert.equal((await save({ email: 'invalid' })).status, 400);
    assert.equal((await save({ email: 'optional@example.test', secondaryEmail: 'second@example.test' })).status, 200);
    await confirmVerification('primary', 'optional@example.test');
    await confirmVerification('secondary', 'second@example.test');
    await page.reload();
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
    await page.evaluate(() => openSettings());
    assert.equal(await page.locator('#settingsLoginIdentifier').inputValue(), card.accessId, 'WZ ID remains stable with optional email');
    assert.equal((await save({ email: 'changed@example.test', secondaryEmail: 'second@example.test' })).status, 200);
    let record = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    assert.equal(record.email_verified, 0);
    assert.equal(record.email_verified_value, null);
    assert.equal(record.secondary_email_verified, 1);
    assert.equal(record.secondary_email_verified_value, 'second@example.test');
    await confirmVerification('primary', 'changed@example.test');
    issueVerification('primary', 'changed@example.test');
    assert.equal((await save({ secondaryEmail: 'second@example.test' })).status, 200, 'secondary-only allowed');
    record = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    assert.equal(record.email, null);
    assert.equal(record.email_verified, 0);
    assert.equal(record.email_verified_value, null);
    assert.equal(record.secondary_email_verified, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM email_verification_tokens WHERE user_id = ? AND email_kind = 'primary'").get(user.id).n, 0);
    assert.equal((await save({})).status, 200);
    record = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    assert.equal(record.secondary_email, null);
    assert.equal(record.secondary_email_verified, 0);
    assert.equal(record.secondary_email_verified_value, null);
    assert.equal((await request('/api/email-verification/resend', { emailKind: 'primary' }, account.cookie)).status, 409);
    // Configured transport seam: exercise the real route with a recording sender, never SMTP.
    const deliveries = [];
    const { createNotificationRouters } = require('../src/routes/notifications');
    const emailTools = require('../src/services/email-verification');
    const noop = (req, res, next) => next();
    const { preferencesRouter } = createNotificationRouters({ db, env: {}, requireAuth: noop,
      requireAdmin: noop, slots: [], ...emailTools, findEmailOwner: () => null,
      emailStatus: () => ({ configured: true }), sendEmailVerification: async (req, address) => deliveries.push(address.email) });
    const handler = preferencesRouter.stack.find(layer => layer.route?.path === '/api/me/notifications').route.stack.at(-1).handle;
    const syntheticRequest = { body: { ...preferences, email: 'transport@example.test' }, session: { user: { id: user.id, username: card.accessId } } };
    const syntheticResponse = { json() {}, status(code) { throw new Error(`Unexpected route status ${code}`); } };
    await handler(syntheticRequest, syntheticResponse);
    assert.deepEqual(deliveries, ['transport@example.test']);
    syntheticRequest.body.email = '';
    await handler(syntheticRequest, syntheticResponse);
    assert.deepEqual(deliveries, ['transport@example.test'], 'removal never sends mail to an empty address');
    const secondCard = await createCard('Synthetic household two');
    const secondPage = await context.newPage();
    await secondPage.goto(base + '/login.html');
    await secondPage.locator('#showAccessCard').click();
    await secondPage.locator('#accessCardForm input[name=accessId]').fill(secondCard.accessId);
    await secondPage.locator('#accessCardForm input[name=activationCode]').fill(secondCard.activationCode);
    await secondPage.locator('#accessCardForm input[name=password]').fill(password);
    await secondPage.locator('#accessCardForm input[name=passwordConfirmation]').fill(password);
    await secondPage.locator('#accessCardForm button[type=submit]').click();
    await secondPage.waitForURL('**/index.html?welcome=1');
    const secondLogin = await request('/api/login', { username: secondCard.accessId, password });
    assert.equal((await request('/api/me/notifications', preferences, secondLogin.cookie, 'PUT')).status, 200, 'multiple NULL emails');
    assert.equal((await save({ email: 'unique@example.test' })).status, 200);
    assert.equal((await request('/api/me/notifications', { ...preferences, secondaryEmail: 'unique@example.test' }, secondLogin.cookie, 'PUT')).status, 409);
    assert.equal((await save({})).status, 200);
    // Legacy email login contract is deliberately unchanged. Recovery must tell the truth.
    db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?').run('legacy-resident', 'legacy@example.test', user.id);
    const recoveryContext = await browser.newContext();
    const recoveryPage = await recoveryContext.newPage();
    for (const language of ['de', 'en']) {
      const code = await request(`/api/admin/users/${user.id}/recovery-code`, { confirm: 'KONTO WIEDERHERSTELLEN' }, admin.cookie);
      assert.equal(code.status, 201);
      await recoveryPage.goto(base + '/login.html');
      await recoveryPage.evaluate(lang => window.WZ_I18N.setLanguage(lang, { persist: true }), language);
      await recoveryPage.locator('#showRecovery').click();
      await recoveryPage.locator('#showAccountRecovery').click();
      await recoveryPage.locator('#accountRecoveryForm input[name=code]').fill(code.body.code);
      await recoveryPage.locator('#accountRecoveryForm input[name=newPassword]').fill(password);
      await recoveryPage.locator('#accountRecoveryForm input[name=newPasswordConfirmation]').fill(password);
      const response = recoveryPage.waitForResponse(r => r.url().endsWith('/api/account-recovery/confirm'));
      await recoveryPage.locator('#accountRecoveryForm button[type=submit]').click();
      const body = await (await response).json();
      assert.equal(body.loginIdentifier, 'legacy@example.test');
      await recoveryPage.waitForFunction(() => document.querySelector('#accountRecoveryMessage').textContent.includes('legacy@example.test'));
      assert.match(await recoveryPage.locator('#accountRecoveryMessage').textContent(), language === 'en' ? /Sign in with/ : /Melde dich mit/);
      assert.equal((await request('/api/login', { email: body.loginIdentifier, password })).status, 200);
    }
    assert.equal((await request('/api/login', { username: 'legacy-resident', password })).status, 401);
    await recoveryPage.locator('#cancelAccountRecovery').click();
    await recoveryPage.locator('#loginForm input[name=email]').fill('legacy@example.test');
    await recoveryPage.locator('#loginForm input[name=password]').fill(password);
    await recoveryPage.locator('#loginForm button[type=submit]').click();
    await recoveryPage.waitForURL('**/index.html');
    await recoveryPage.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
    await recoveryPage.evaluate(() => openSettings());
    assert.equal(await recoveryPage.locator('#settingsLoginIdentifier').inputValue(), 'legacy@example.test');
    assert.deepEqual(errors, []);
    console.log('Email-free QA01-03 regression PASS: actual forms, NULL uniqueness, optional addresses, verification binding, recovery DE/EN, usable ID at 390/768/1440 and reload.');
  } finally {
    db?.close();
    await browser?.close();
    flushButtons?.();
    if (server.exitCode === null) {
      server.kill();
      await new Promise(resolve => server.once('exit', resolve));
    }
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
