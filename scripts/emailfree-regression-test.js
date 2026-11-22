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
    const errors = [];
    const longAlias = '𐐀'.repeat(40); // 40 letters, 80 UTF-16 code units
    async function checkAliasInput(input, restore = '') {
      await input.fill('');
      await input.focus();
      await input.page().keyboard.insertText(longAlias);
      assert.equal(await input.inputValue(), longAlias, 'native browser input accepts 40 non-BMP letters');
      await input.fill(restore);
    }
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(card.activationUrl);
    const cardAlias = page.locator('#accessCardForm input[name=loginAlias]');
    assert.equal(await cardAlias.getAttribute('required'), null);
    await checkAliasInput(cardAlias);
    await cardAlias.fill('Regression-Admin');
    await page.locator('#accessCardForm input[name=password]').fill(password);
    await page.locator('#accessCardForm input[name=passwordConfirmation]').fill(password);
    const rejected = page.waitForResponse(r => r.url().endsWith('/api/access-cards/activate'));
    await page.locator('#accessCardForm button[type=submit]').click();
    assert.equal((await rejected).status(), 409, 'a technical username is reserved across accounts');
    await page.waitForFunction(() => /unavailable/i.test(document.querySelector('#accessCardMessage').textContent));
    await cardAlias.fill('Le\u0301a Meier'); // keyboard in decomposed Unicode
    await page.locator('#accessCardForm button[type=submit]').click();
    // The real welcome flow opens the profile after its initial requests and
    // then removes ?welcome=1. Do not open it a second time from the test.
    await page.waitForURL('**/index.html');
    await page.locator('#settingsOverlay').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#notificationEmail').getAttribute('required'), null);
    assert.equal(await page.locator('#settingsLoginIdentifier').inputValue(), card.accessId);
    assert.equal(await page.locator('#settingsLoginIdentifier').evaluate(el => el.readOnly), true);
    assert.equal(await page.locator('#settingsUsername').inputValue(), 'Synthetic household one');
    assert.equal(await page.locator('#settingsLoginAlias').inputValue(), 'Léa Meier');
    await checkAliasInput(page.locator('#settingsLoginAlias'), 'Léa Meier');
    const firstAlias = await request('/api/login', { username: '  LÉA MEIER ', password });
    assert.equal(firstAlias.status, 200);
    await page.locator('#settingsLoginAlias').fill('Müller');
    const saved = page.waitForResponse(r => r.url().endsWith('/api/me/notifications') && r.request().method() === 'PUT');
    await page.locator('[data-i18n="settings.saveProfile"]').click();
    assert.equal((await saved).status(), 200, 'actual profile form saves without email');
    await page.waitForFunction(() => /Profil gespeichert|Profile saved/.test(document.querySelector('#profileSaveFeedback').textContent));
    assert.equal((await request('/api/login', { username: 'Léa Meier', password })).status, 401);
    const aliasLogin = await request('/api/login', { username: 'MU\u0308LLER', password });
    assert.equal(aliasLogin.body.user.id, firstAlias.body.user.id);
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
      assert.equal(await page.locator('#settingsLoginAlias').inputValue(), 'Müller');
    }
    const account = await request('/api/login', { username: card.accessId, password });
    assert.equal(account.status, 200);
    db = new Database(path.join(temporary, 'test.sqlite'));
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(card.accessId);
    // Real resident UI -> QR link -> second browser -> real sign-in with the generated ID.
    const ownerId = db.prepare('SELECT claimed_by FROM apartments WHERE id=?').get(card.apartment.id).claimed_by;
    assert.equal(ownerId, user.id);
    // The previously email-only admin action must issue a usable personal QR card without SMTP.
    await adminPage.evaluate(() => loadAdmin());
    const row = adminPage.locator('#apartmentList .user-admin-item').filter({ hasText: 'Synthetic household one' });
    const issuedCard = adminPage.waitForResponse(r => r.url().endsWith(`/api/admin/apartments/${card.apartment.id}/access-card`) && r.request().method() === 'POST');
    await row.getByRole('button', { name: /Add a person with a QR card|Weitere Person per QR-Karte/ }).click();
    const extraCard = (await (await issuedCard).json()).accessCard;
    assert.match(extraCard.qrCodeDataUrl, /^data:image\/png;base64,/);
    const cardContext = await browser.newContext({ serviceWorkers: 'block' });
    const cardPage = await cardContext.newPage();
    await cardPage.goto(extraCard.activationUrl);
    await cardPage.locator('#accessCardForm [name=password]').fill(password);
    await cardPage.locator('#accessCardForm [name=passwordConfirmation]').fill(password);
    // Slow down one real start-up request without replacing its response.
    // On a slow connection the account menu already works before welcome opens.
    let releaseSlots;
    const holdSlots = new Promise(resolve => { releaseSlots = resolve; });
    await cardPage.route('**/api/slots', async route => { await holdSlots; await route.continue(); }, { times: 1 });
    const slotsRequested = cardPage.waitForRequest('**/api/slots');
    await cardPage.locator('#accessCardForm button[type=submit]').click();
    await slotsRequested;
    const earlyInput = cardPage.locator('#settingsLoginAlias');
    try {
      await cardPage.locator('#accountMenuButton').click();
      await cardPage.locator('#openSettingsButton').click();
      await earlyInput.click();
      await cardPage.keyboard.insertText(longAlias);
      assert.equal(await earlyInput.inputValue(), longAlias);
    } finally {
      releaseSlots();
    }
    await cardPage.waitForURL('**/index.html');
    assert.equal(await earlyInput.inputValue(), longAlias, 'welcome preserves an already open profile draft');
    assert.equal(await earlyInput.evaluate(el => document.activeElement === el), true, 'welcome leaves focus in the edited field');
    const extra = await request('/api/login', { username: extraCard.accessId, password });
    assert.equal(extra.status, 200);
    assert.equal(extra.body.user.apartmentId, card.apartment.id);
    assert.deepEqual(extra.body.user.roles, ['resident']);
    assert.notEqual(extra.body.user.id, ownerId);
    assert.equal(extra.body.user.loginAlias, '', 'blank is still the default');
    const profile = (body, cookie = extra.cookie) => request('/api/me/notifications', body, cookie, 'PUT');
    assert.equal((await profile({ loginAlias: 'Müller' }, '')).status, 401);
    for (const invalid of ['8abc', 'WZ-future', 'mail@example.test', 'xy\nxy', { alias: 'abc' }, 'a'.repeat(41)]) {
      assert.equal((await profile({ loginAlias: invalid })).status, 400);
    }
    assert.equal((await profile({ loginAlias: 'MU\u0308LLER', email: 'changed@example.test' })).status, 409);
    assert.equal(db.prepare('SELECT email FROM users WHERE id=?').get(extra.body.user.id).email, null);
    const scoped = await profile({ loginAlias: 'Renée', userId: ownerId, role: 'admin' });
    assert.equal(scoped.status, 200);
    assert.equal(scoped.body.user.id, extra.body.user.id);
    assert.deepEqual(scoped.body.user.roles, ['resident']);
    assert.equal(db.prepare('SELECT login_alias FROM users WHERE id=?').get(ownerId).login_alias, 'Müller');
    assert.doesNotMatch(JSON.stringify((await request('/api/admin/users', null, admin.cookie, 'GET')).body), /Müller|Renée|login_alias|loginAlias/);
    assert.doesNotMatch(JSON.stringify((await request('/api/me/export', null, extra.cookie, 'GET')).body), /Müller/);
    assert.equal((await request('/api/login', { username: 'RENÉE', password })).body.user.id, extra.body.user.id);
    assert.equal((await profile({ loginAlias: '' })).status, 200);
    assert.equal((await request('/api/login', { username: 'RENÉE', password })).status, 401);
    assert.equal((await request('/api/login', { username: extraCard.accessId, password })).status, 200);
    assert.equal((await profile({ loginAlias: longAlias })).status, 200);
    assert.equal((await profile({ loginAlias: longAlias + '𐐀' })).status, 400);
    assert.equal((await request('/api/login', { username: longAlias, password })).body.user.id, extra.body.user.id);
    assert.equal((await profile({ loginAlias: 'STRAẞE' })).status, 200);
    for (const variant of ['Straße', 'STRAẞE', 'STRASSE']) {
      assert.equal((await request('/api/login', { username: variant, password })).body.user.id, extra.body.user.id);
      assert.equal((await profile({ loginAlias: variant }, account.cookie)).status, 409);
    }
    assert.equal((await profile({ loginAlias: '' })).status, 200);
    await cardContext.close();
    await adminContext.close();
    for (const language of ['de', 'en']) {
      await page.locator('[data-settings-target="profile"]').click();
      await page.locator('#settingsLanguage').selectOption(language);
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      assert.match(await page.locator('#settingsProgressText').innerText(), language === 'en' ? /optional/ : /freiwillig/);
      await page.locator('#openHouseholdQr').click();
      assert.match(await page.locator('[data-i18n="settings.pairingHint"]').innerText(), language === 'en' ? /no email needed/i : /E-Mail ist nicht nötig/);
      const issue = page.waitForResponse(r => r.url().endsWith('/api/me/device-code') && r.request().method() === 'POST');
      await page.locator('#createDeviceCodeButton').click();
      const pairing = await (await issue).json();
      assert.match(pairing.qrCodeDataUrl, /^data:image\/png;base64,/);
      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      try {
        await memberPage.goto(pairing.loginUrl);
        await memberPage.locator('[data-language-picker]').selectOption(language);
        const form = memberPage.locator('#deviceLoginForm');
        assert.equal(await form.locator('[name=deviceCode]').inputValue(), pairing.code);
        assert.match(await form.locator('[data-i18n="auth.partnerHint"]').innerText(), language === 'en' ? /leave .* blank/i : /Lass .* leer/i);
        const memberAlias = language === 'en' ? 'Jane Green' : 'Anna Grün';
        await checkAliasInput(form.locator('[name=loginAlias]'));
        await form.locator('[name=loginAlias]').fill('MU\u0308LLER');
        await form.locator('[name=password]').fill(password);
        await form.locator('[name=passwordConfirmation]').fill(password);
        const conflict = memberPage.waitForResponse(r => r.url().endsWith('/api/device-login'));
        await form.locator('button[type=submit]').click();
        assert.equal((await conflict).status(), 409);
        await form.locator('[name=loginAlias]').fill(memberAlias);
        let savedId;
        memberPage.once('dialog', async dialog => {
          savedId = dialog.message().match(/WZ-[A-Z0-9-]+/i)?.[0];
          await dialog.accept();
        });
        const join = memberPage.waitForResponse(r => r.url().endsWith('/api/device-login'));
        await form.locator('button[type=submit]').click();
        const result = await join;
        assert.equal(result.status(), 200);
        await memberPage.waitForURL('**/index.html');
        await memberPage.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
        const member = await memberPage.evaluate(() => currentUser);
        assert.equal(savedId, member.username);
        assert.deepEqual(member.roles, ['resident']);
        assert.equal(member.apartmentId, card.apartment.id);
        assert.notEqual(member.id, ownerId);
        assert.equal(member.loginAlias, memberAlias);
        assert.equal(db.prepare('SELECT email FROM users WHERE id=?').get(member.id).email, null);
        assert.equal((await request('/api/login', { username: savedId, password })).body.user.id, member.id);
        // Reuse an existing sign-in with the manual household code; never create another account.
        const next = await request('/api/me/device-code', {}, account.cookie);
        await memberPage.goto(base + '/login.html');
        await memberPage.locator('#showDeviceLogin').click();
        await form.locator('[name=deviceCode]').fill(next.body.code);
        await form.locator('[name=identifier]').fill(language === 'en' ? memberAlias : savedId);
        await form.locator('[name=loginAlias]').fill('Not a rename');
        await form.locator('[name=password]').fill(password);
        const reconnect = memberPage.waitForResponse(r => r.url().endsWith('/api/device-login'));
        await form.locator('button[type=submit]').click();
        assert.equal((await reconnect).status(), 200);
        await memberPage.waitForURL('**/index.html');
        await memberPage.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
        assert.equal(await memberPage.evaluate(() => currentUser.id), member.id);
        assert.equal(await memberPage.evaluate(() => currentUser.loginAlias), memberAlias);
        assert.equal(db.prepare('SELECT claimed_by FROM apartments WHERE id=?').get(card.apartment.id).claimed_by, ownerId);
      } finally { await memberContext.close(); }
    }
    // Only this disposable synthetic DB is modified to model account and house moves.
    const house = account.body.user.houseId;
    const otherHouse = Number(db.prepare('INSERT INTO houses(name,code) VALUES (?,?)').run('QR test house', 'QRTEST22').lastInsertRowid);
    const otherFlat = (await createCard('Other QR test flat')).apartment.id;
    const makeLegacy = (name, houseId, flat) => Number(db.prepare(`
      INSERT INTO users(username,role,password_hash,house_id,apartment_id,active)
      SELECT ?, 'user', password_hash, ?, ?, 1 FROM users WHERE id=?`).run(name, houseId, flat, ownerId).lastInsertRowid);
    const unassignedId = makeLegacy('qr-unassigned', house, null);
    const foreignId = makeLegacy('qr-other-house', otherHouse, null);
    const noHouseId = makeLegacy('qr-no-house', null, null);
    const otherId = makeLegacy('qr-other-flat', house, otherFlat);
    const legacyStreet = makeLegacy('straße-alt', house, null);
    assert.equal((await request('/api/login', { username: ' Straße-alt ', password })).body.user.id, legacyStreet);
    assert.equal((await request('/api/login', { username: 'STRASSE-ALT', password })).status, 401, 'no implicit alias on legacy accounts');
    assert.equal((await profile({ loginAlias: 'STRAẞE-ALT' })).status, 409, 'all equivalent forms of old technical names are reserved');
    makeLegacy('ZoË Müller', otherHouse, null);
    assert.equal((await profile({ loginAlias: 'Zoe\u0308 Mu\u0308ller' })).status, 409, 'foreign-house historical names remain reserved');
    const issueCode = async () => {
      const issued = await request('/api/me/device-code', {}, account.cookie);
      assert.equal(issued.status, 201);
      return issued.body.code;
    };
    const code = await issueCode();
    const attach = (deviceCode, username, pass = password) => request('/api/device-login', { deviceCode, username, password: pass });
    const countAccounts = () => db.prepare('SELECT count(*) AS n FROM users').get().n;
    const countBefore = countAccounts();
    assert.equal((await attach(code, 'qr-unassigned', 'incorrect-password')).status, 401);
    assert.equal((await attach(code, 'qr-other-house')).status, 409);
    assert.equal((await attach(code, 'qr-no-house')).status, 409);
    assert.equal(db.prepare('SELECT house_id FROM users WHERE id=?').get(noHouseId).house_id, null);
    assert.equal((await attach(code, 'qr-other-flat')).status, 409);
    assert.equal(db.prepare('SELECT apartment_id FROM users WHERE id=?').get(foreignId).apartment_id, null);
    assert.equal(db.prepare('SELECT apartment_id FROM users WHERE id=?').get(otherId).apartment_id, otherFlat);
    const linked = await attach(code, 'qr-unassigned');
    assert.equal(linked.status, 200);
    assert.equal(linked.body.user.id, unassignedId);
    assert.equal(linked.body.user.apartmentId, card.apartment.id);
    assert.deepEqual(linked.body.user.roles, ['resident']);
    assert.equal((await attach(code, 'qr-unassigned')).status, 400);
    const stale = await issueCode();
    db.prepare('UPDATE users SET apartment_id=? WHERE id=?').run(otherFlat, ownerId);
    assert.equal((await attach(stale, 'qr-unassigned')).status, 400);
    db.prepare('UPDATE users SET apartment_id=? WHERE id=?').run(card.apartment.id, ownerId);
    assert.equal(countAccounts(), countBefore);
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
    const persistedProfile = () => ({
      values: db.prepare('SELECT email, secondary_email, email_verified_value, secondary_email_verified_value, email_verified, secondary_email_verified, notify_releases FROM users WHERE id=?').get(ownerId),
      prefs: db.prepare('SELECT * FROM notification_preferences WHERE user_id=?').get(ownerId),
      tokens: db.prepare('SELECT * FROM email_verification_tokens WHERE user_id=? ORDER BY id').all(ownerId)
    });
    const unchanged = persistedProfile();
    assert.equal((await profile({ loginAlias: 'Müller' }, account.cookie)).status, 200);
    assert.deepEqual(persistedProfile(), unchanged, 'alias-only PUT preserves addresses, verification bindings and filters');
    for (const identifier of ['Müller', card.accessId, 'optional@example.test', 'second@example.test']) {
      assert.equal((await request('/api/login', { username: identifier, password })).body.user.id, ownerId);
    }
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
    syntheticRequest.body = { loginAlias: 'Müller' };
    await handler(syntheticRequest, syntheticResponse);
    assert.deepEqual(deliveries, ['transport@example.test'], 'alias-only save does not invoke even a configured mail transport');
    syntheticRequest.body = { ...preferences, email: 'transport@example.test' };
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
    const aliasContext = await browser.newContext();
    const aliasPage = await aliasContext.newPage();
    await aliasPage.goto(base + '/login.html');
    await aliasPage.locator('#loginForm input[name=email]').fill('MÜLLER');
    await aliasPage.locator('#loginForm input[name=password]').fill(password);
    await aliasPage.locator('#loginForm button[type=submit]').click();
    await aliasPage.waitForURL('**/index.html');
    await aliasPage.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser);
    assert.equal(await aliasPage.evaluate(() => currentUser.id), ownerId);
    await aliasContext.close();
    assert.deepEqual(errors, []);
    console.log('Email-free regression PASS: card and household QR, optional Unicode sign-in name, private profile rename/removal, ID/email compatibility, conflict retries, household boundaries, recovery and responsive DE/EN UI.');
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
