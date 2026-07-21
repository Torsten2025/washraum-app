const assert = require('assert/strict');
process.env.ALLOW_LEGACY_HOUSE_REGISTRATION = 'true';
process.env.ALLOW_TEST_INVITATION_LINK = 'true';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

async function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    try {
      return require('playwright-core');
    } catch (packageError) {
      if (process.env.PLAYWRIGHT_MODULE_PATH) {
        try {
          return require(path.resolve(process.env.PLAYWRIGHT_MODULE_PATH));
        } catch (configuredError) {
          throw new Error(`Browser-E2E ist verpflichtend, das konfigurierte Playwright-Modul konnte aber nicht geladen werden: ${configuredError.message}`);
        }
      }
      throw new Error(`Browser-E2E ist verpflichtend, Playwright ist aber nicht installiert: ${packageError.message}`);
    }
  }
}

async function waitForServer(baseUrl, output) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`E2E-Testserver nicht erreichbar.\n${output.join('')}`);
}

function systemBrowserPath() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const visualViewports = [
  { name: 'small-mobile', width: 320, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

const mediaViewports = visualViewports.filter((viewport) => [390, 768, 1440].includes(viewport.width));

const forbiddenEnglishAdminPatterns = [
  /\bAufgaben\b/i,
  /\bWarnungen\b/i,
  /\bInformationen\b/i,
  /Ger[a\u00e4]te\s*&\s*R[a\u00e4]ume/i,
  /\beinsatzbereit\b/i,
  /\bgesperrt\b/i,
  /\bUmbenennen\b/i,
  /\bSperren\b/i,
  /Tagebuch (?:oe|\u00f6)ffnen/i,
  /Wohnungen\s*&\s*Einladungen/i,
  /\bDauertermine\b/i,
  /\bAuswertung\b/i,
  /Noch keine festen Buchungen/i,
  /Keine passenden Tagebuchf[a\u00e4]lle/i,
  /\bSystemstatus\b/i,
  /\bNotfallzugang\b/i,
  /Nur ein aktiver Superadmin/i,
  /\bNotfallregel\b/i,
  /\bDaten sichern\b/i,
  /Wartung (?:starten|beenden)/i,
  /Buchungen zuruecksetzen/i,
  /\bKonten verwalten\b/i,
  /\bAktivieren\b/i,
  /\bDeaktivieren\b/i,
  /\bVerschieben\b/i,
  /\bWiederherstellungscode\b/i
];

async function assertEnglishAdminSection(page, role, section) {
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  const visibleText = await page.locator(`[data-admin-section="${section}"]`).innerText();
  const leaks = forbiddenEnglishAdminPatterns
    .filter((pattern) => pattern.test(visibleText))
    .map((pattern) => pattern.toString());
  assert.deepEqual(leaks, [], `${role}/${section}: deutsche Verwaltungstexte im englischen DOM: ${leaks.join(', ')}`);
}

async function assertResponsiveTopbar(page, viewport, prefix) {
  const result = await page.evaluate(async () => {
    const topbar = document.querySelector('.topbar');
    const address = document.querySelector('#brandHouseName');
    const accountName = document.querySelector('#accountMenuName');
    const actionElements = [
      document.querySelector('#reportIssueButton'),
      document.querySelector('#messageCenterButton'),
      document.querySelector('#accountMenuButton')
    ].filter((element) => element && !element.hidden && getComputedStyle(element).display !== 'none');
    const measure = () => {
      const addressStyle = getComputedStyle(address);
      const addressLineHeight = Number.parseFloat(addressStyle.lineHeight);
      const topbarRect = topbar.getBoundingClientRect();
      return {
        addressClientHeight: address.clientHeight,
        addressLineHeight,
        addressScrollHeight: address.scrollHeight,
        addressWhiteSpace: addressStyle.whiteSpace,
        addressRect: address.getBoundingClientRect().toJSON(),
        topbarRect: topbarRect.toJSON(),
        topbarScrollWidth: topbar.scrollWidth,
        topbarClientWidth: topbar.clientWidth,
        actions: actionElements.map((element) => ({
          id: element.id,
          ...element.getBoundingClientRect().toJSON()
        }))
      };
    };
    const normal = measure();
    const originalAddress = address.textContent;
    const originalAccountName = accountName.textContent;
    address.textContent = 'Wohnueberbauung Maneggplatz Nord 18 Hinterhaus';
    accountName.textContent = 'Alexandra-Maria Mustermann-Walser';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const longNames = measure();
    address.textContent = originalAddress;
    accountName.textContent = originalAccountName;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return { normal, longNames };
  });

  for (const [name, state] of Object.entries(result)) {
    assert.equal(state.addressWhiteSpace, 'nowrap', `${prefix || 'resident'} ${viewport.width}px ${name}: Hausname darf nicht umbrechen`);
    assert.ok(state.addressScrollHeight <= state.addressLineHeight + 1, `${prefix || 'resident'} ${viewport.width}px ${name}: Hausname belegt mehr als eine Textzeile`);
    assert.ok(state.addressClientHeight <= state.addressLineHeight + 1, `${prefix || 'resident'} ${viewport.width}px ${name}: Hausname wird mehrzeilig dargestellt`);
    assert.ok(state.topbarScrollWidth <= state.topbarClientWidth, `${prefix || 'resident'} ${viewport.width}px ${name}: Kopfzeile laeuft horizontal ueber`);
    assert.ok(state.addressRect.left >= state.topbarRect.left && state.addressRect.right <= state.topbarRect.right, `${prefix || 'resident'} ${viewport.width}px ${name}: Hausname verlaesst die Kopfzeile`);
    for (const action of state.actions) {
      assert.ok(action.width >= 44 && action.height >= 44, `${prefix || 'resident'} ${viewport.width}px ${name}: ${action.id} ist kleiner als 44 x 44 Pixel`);
      assert.ok(action.left >= 0 && action.right <= viewport.width, `${prefix || 'resident'} ${viewport.width}px ${name}: ${action.id} liegt ausserhalb des Viewports`);
    }
  }

  const expectedActions = prefix.startsWith('admin-') ? 2 : 3;
  assert.equal(result.normal.actions.length, expectedActions, `${prefix || 'resident'} ${viewport.width}px: unerwartete Zahl sichtbarer Kopfaktionen`);
}

async function captureVisualChecks(page, outputDirectory, prefix = '') {
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const viewport of visualViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await assertResponsiveTopbar(page, viewport, prefix);
    if (prefix === 'game-') {
      const gameHud = await page.evaluate(() => {
        const modal = document.querySelector('.diaper-game-modal');
        const strip = document.querySelector('.diaper-defusal-strip');
        const modalRect = modal?.getBoundingClientRect();
        const stripRect = strip?.getBoundingClientRect();
        return {
          modalScrollTop: modal?.scrollTop,
          modalTop: modalRect?.top,
          modalBottom: modalRect?.bottom,
          stripTop: stripRect?.top,
          stripBottom: stripRect?.bottom
        };
      });
      assert.ok(
        gameHud.stripTop >= gameHud.modalTop && gameHud.stripBottom <= gameHud.modalBottom,
        `${viewport.name}: Windel-Alarm-HUD liegt ausserhalb des sichtbaren Dialogs (${JSON.stringify(gameHud)})`
      );
    }
    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    assert.ok(
      Math.max(layout.bodyWidth, layout.documentWidth) <= layout.viewportWidth,
      `${viewport.name}: Seite ist horizontal breiter als der Viewport (${JSON.stringify(layout)})`
    );
    await page.screenshot({
      path: path.join(outputDirectory, `${prefix}${viewport.name}-${viewport.width}x${viewport.height}.png`),
      fullPage: false,
      animations: 'disabled'
    });
  }
}

async function captureMediaSource(page, outputDirectory, name) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: path.join(outputDirectory, `media-source-${name}.png`),
    fullPage: false,
    animations: 'disabled'
  });
}

async function verifyIntroMediaPackage(page, outputDirectory, expected, screenshotPaths) {
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#accountMenuButton');
  await page.waitForSelector('#accountMenuPanel:not([hidden])');
  await page.click('#openKnowledgeButton');
  await page.waitForSelector('#settingsOverlay:not([hidden])');
  await page.click('#openIntroButton');
  await page.waitForSelector('#introOverlay:not([hidden])');
  await page.waitForFunction(({ id, duration }) => {
    const video = document.querySelector('#recordedIntroVideo');
    return video?.dataset.mediaId === id
      && video.readyState >= 1
      && Math.abs(video.duration - duration) < 0.2;
  }, expected, { timeout: 15000 });

  const mediaState = await page.evaluate(() => {
    const video = document.querySelector('#recordedIntroVideo');
    const source = document.querySelector('#recordedIntroSource');
    const track = document.querySelector('#recordedIntroTrack');
    return {
      mediaId: video?.dataset.mediaId,
      duration: video?.duration,
      source: source?.getAttribute('src'),
      track: track?.getAttribute('src'),
      trackLanguage: track?.getAttribute('srclang'),
      poster: video?.getAttribute('poster'),
      chapters: document.querySelectorAll('#recordedIntroChapters [data-recorded-chapter]').length,
      transcript: document.querySelector('#recordedIntroTranscriptLink')?.getAttribute('href'),
      fallbackHidden: document.querySelector('#recordedIntroFallback')?.hidden
    };
  });
  assert.equal(mediaState.mediaId, expected.id);
  assert.ok(Math.abs(mediaState.duration - expected.duration) < 0.2);
  assert.match(mediaState.source, new RegExp(`${expected.id}\\.mp4`));
  assert.match(mediaState.track, new RegExp(`${expected.id}\\.vtt`));
  assert.equal(mediaState.trackLanguage, expected.language);
  assert.match(mediaState.poster, new RegExp(`${expected.id}-poster\\.png`));
  assert.equal(mediaState.chapters, expected.chapters);
  assert.match(mediaState.transcript, new RegExp(`${expected.id}\\.txt`));
  assert.equal(mediaState.fallbackHidden, true);

  const transcriptStatus = await page.evaluate(() => (
    fetch(document.querySelector('#recordedIntroTranscriptLink').href).then((response) => response.status)
  ));
  assert.equal(transcriptStatus, 200);

  const secondChapter = page.locator('#recordedIntroChapters [data-recorded-chapter="1"]');
  await secondChapter.focus();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.recordedChapter), '1');
  await page.keyboard.press('Enter');
  await page.waitForFunction((startTime) => (
    document.querySelector('#recordedIntroVideo')?.currentTime >= startTime - 0.25
  ), expected.secondStart, { timeout: 10000 });
  await page.locator('#recordedIntroVideo').evaluate((video) => video.pause());
  assert.equal(await secondChapter.getAttribute('aria-current'), 'true');

  for (const viewport of mediaViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const layout = await page.evaluate(() => {
      const modal = document.querySelector('.intro-modal');
      const video = document.querySelector('#recordedIntroVideo');
      const modalRect = modal?.getBoundingClientRect();
      const videoRect = video?.getBoundingClientRect();
      return {
        modalLeft: modalRect?.left,
        modalRight: modalRect?.right,
        viewportWidth: document.documentElement.clientWidth,
        modalClientWidth: modal?.clientWidth,
        modalScrollWidth: modal?.scrollWidth,
        videoWidth: videoRect?.width,
        videoHeight: videoRect?.height
      };
    });
    assert.ok(layout.modalLeft >= -1 && layout.modalRight <= layout.viewportWidth + 1, `${expected.id}/${viewport.name}: Dialog ausserhalb des Viewports`);
    assert.ok(layout.modalScrollWidth <= layout.modalClientWidth + 1, `${expected.id}/${viewport.name}: Dialog hat horizontalen Ueberlauf`);
    assert.ok(Math.abs((layout.videoWidth / layout.videoHeight) - (16 / 9)) < 0.03, `${expected.id}/${viewport.name}: Videoformat ist nicht 16:9`);
    const screenshotPath = path.join(outputDirectory, `media-${expected.id}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' });
    screenshotPaths.push(screenshotPath);
  }

  await page.click('#closeIntroButton');
  await page.waitForFunction(() => document.querySelector('#introOverlay')?.hidden === true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'openIntroButton');
  await page.click('#closeSettingsButton');
  await page.waitForFunction(() => document.querySelector('#settingsOverlay')?.hidden === true);
  if (originalViewport) await page.setViewportSize(originalViewport);
}

async function run() {
  const playwright = await loadPlaywright();
  const port = 34000 + (process.pid % 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const databasePath = path.join(os.tmpdir(), `waschplan-e2e-${process.pid}.sqlite`);
  const screenshotDirectory = path.resolve(
    process.env.E2E_SCREENSHOT_DIR || path.join('artifacts', 'e2e-screenshots')
  );
  const output = [];
  const gameStateScreenshots = [];
  const mediaScreenshots = [];
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      HOUSE_CODE: 'E2E Hauscode 18',
      SEED_ADMIN_NAME: 'e2e-admin',
      SEED_ADMIN_PASSWORD: 'E2E-Admin-2026!',
      SESSION_SECRET: 'e2e-session-secret-at-least-32-characters'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => output.push(chunk.toString()));
  server.stderr.on('data', (chunk) => output.push(chunk.toString()));

  let browser;
  try {
    await waitForServer(baseUrl, output);
    const adminLogin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'e2e-admin', password: 'E2E-Admin-2026!' })
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = String(adminLogin.headers.get('set-cookie') || '').split(';')[0];
    const apartmentResponse = await fetch(`${baseUrl}/api/admin/apartments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        label: 'E2E 2. OG links',
        displayName: 'E2E Familie',
        email: 'e2e@example.test'
      })
    });
    assert.equal(apartmentResponse.status, 201);
    const apartment = await apartmentResponse.json();
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || systemBrowserPath();
    browser = await playwright.chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {})
    });
    const invalidInvitePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await invalidInvitePage.goto(`${baseUrl}/login.html?invite=invalid-e2e-token`, { waitUntil: 'domcontentloaded' });
    await invalidInvitePage.selectOption('[data-language-picker]', 'en');
    await invalidInvitePage.waitForFunction(() => document.documentElement.lang === 'en');
    await invalidInvitePage.waitForFunction(() => document.querySelector('#invitationSummary strong')?.textContent === 'Invitation unavailable');
    assert.match(await invalidInvitePage.locator('#invitationSummary').innerText(), /invalid|expired|already been used/i);
    await invalidInvitePage.close();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(apartment.invitationLink, { waitUntil: 'domcontentloaded' });
    await page.selectOption('[data-language-picker]', 'en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(await page.locator('#registerForm h2').innerText(), 'Activate apartment');
    assert.equal(await page.locator('#registerForm button[type="submit"]').innerText(), 'Accept invitation');
    await page.waitForFunction(() => !document.querySelector('#registerForm button[type="submit"]')?.disabled);
    await page.fill('#registerForm input[name="password"]', 'E2E-Bewohner-2026!');
    await page.fill('#registerForm input[name="passwordConfirmation"]', 'E2E-Bewohner-falsch!');
    await page.click('#registerForm button[type="submit"]');
    assert.equal(await page.locator('#registerMessage').innerText(), 'The two passwords do not match.');
    await page.fill('#registerForm input[name="passwordConfirmation"]', 'E2E-Bewohner-2026!');
    await page.click('#registerForm button[type="submit"]');
    await page.waitForURL('**/index.html?welcome=1', { timeout: 10000 });
    await page.waitForSelector('#settingsOverlay:not([hidden])');
    assert.equal(await page.locator('#settingsTitle').innerText(), 'A quick setup.');
    await page.click('#settingsDoneButton');
    await page.waitForFunction(() => document.querySelector('#settingsOverlay')?.hidden === true);
    await page.click('#accountMenuButton');
    await page.click('#openSettingsButton');
    await page.waitForSelector('#settingsOverlay:not([hidden])');
    assert.ok(await page.locator('#notificationEmail').isVisible());
    await page.click('[data-settings-target="notifications"]');
    assert.ok(await page.locator('#notifyReleases').isVisible());
    await page.click('[data-settings-target="profile"]');
    await page.selectOption('#settingsLanguage', 'en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    await page.waitForFunction(() => fetch('/api/me')
      .then((response) => response.json())
      .then((data) => data.user.language === 'en'));
    assert.equal(await page.locator('#settingsTitle').innerText(), 'Settings');
    await page.click('#closeSettingsButton');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(await page.locator('#settingsLanguage').inputValue(), 'en');
    assert.equal(await page.locator('#bookingPanelTitle').innerText(), 'Book');
    assert.ok(await page.locator('#bookingFlow').isVisible());
    await captureMediaSource(page, screenshotDirectory, 'resident-en-plan');
    await verifyIntroMediaPackage(page, screenshotDirectory, {
      id: 'resident-en', language: 'en', duration: 242, chapters: 9, secondStart: 24
    }, mediaScreenshots);
    await page.click('#accountMenuButton');
    await page.click('#openKnowledgeButton');
    await page.waitForSelector('#settingsOverlay:not([hidden])');
    assert.ok(await page.locator('#settingsPanelHelp').isVisible());
    assert.ok(await page.locator('#openIntroButton').isVisible());
    await page.locator('#openIntroButton').focus();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'openIntroButton');
    await page.click('#openIntroButton');
    await page.waitForSelector('#introOverlay:not([hidden])');
    assert.equal(await page.locator('#introChapterList [data-intro-chapter]').count(), 9);
    await page.click('#introChapterList [data-intro-chapter="1"]');
    assert.equal(
      await page.locator('#introChapterList [data-intro-chapter="1"]').getAttribute('aria-current'),
      'step'
    );
    assert.match(await page.locator('#introVideoTitle').innerText(), /Week|month/i);
    await page.click('#closeIntroButton');
    assert.ok(await page.locator('#settingsPanelHelp').isVisible());
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'openIntroButton');
    await page.click('[data-settings-target="profile"]');
    await page.waitForSelector('#weekCalendar [data-calendar-date]');
    const readLocalizedResidentState = (locale) => page.evaluate((expectedLocale) => {
      const firstDay = document.querySelector('#weekCalendar [data-calendar-date]');
      const date = firstDay?.dataset.calendarDate || '';
      return {
        weekday: firstDay?.querySelector('.calendar-weekday')?.textContent.trim() || '',
        expectedWeekday: date
          ? new Intl.DateTimeFormat(expectedLocale, { weekday: 'short', timeZone: 'UTC' })
            .format(new Date(`${date}T12:00:00Z`))
          : '',
        stable: {
          bookingDate: document.querySelector('#bookingDate')?.value,
          selectedDate: document.querySelector('#weekCalendar [aria-pressed="true"]')?.dataset.calendarDate || '',
          weekPressed: document.querySelector('#weekViewButton')?.getAttribute('aria-pressed'),
          monthPressed: document.querySelector('#monthViewButton')?.getAttribute('aria-pressed'),
          activeHouse: document.querySelector('#houseSelect')?.value || '',
          canBook: !document.querySelector('#bookingFlow')?.hidden,
          canManage: !document.querySelector('#viewSwitcher')?.hidden,
          introChapter: document.querySelector('#introChapterList [aria-current="step"]')?.dataset.introChapter || ''
        }
      };
    }, locale);
    const englishResidentState = await readLocalizedResidentState('en-GB');
    assert.equal(englishResidentState.weekday, englishResidentState.expectedWeekday);
    await page.locator('#settingsLanguage').focus();
    await page.selectOption('#settingsLanguage', 'de');
    await page.waitForFunction(() => document.documentElement.lang === 'de');
    await page.waitForFunction(() => {
      const firstDay = document.querySelector('#weekCalendar [data-calendar-date]');
      const date = firstDay?.dataset.calendarDate;
      if (!date) return false;
      const expected = new Intl.DateTimeFormat('de-CH', { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(`${date}T12:00:00Z`));
      return firstDay.querySelector('.calendar-weekday')?.textContent.trim() === expected;
    });
    const germanResidentState = await readLocalizedResidentState('de-CH');
    assert.equal(germanResidentState.weekday, germanResidentState.expectedWeekday);
    assert.deepEqual(germanResidentState.stable, englishResidentState.stable);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'settingsLanguage');
    await page.selectOption('#settingsLanguage', 'en');
    await page.waitForFunction(() => {
      const firstDay = document.querySelector('#weekCalendar [data-calendar-date]');
      const date = firstDay?.dataset.calendarDate;
      if (!date || document.documentElement.lang !== 'en') return false;
      const expected = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(`${date}T12:00:00Z`));
      return firstDay.querySelector('.calendar-weekday')?.textContent.trim() === expected;
    });
    const englishResidentStateAgain = await readLocalizedResidentState('en-GB');
    assert.equal(englishResidentStateAgain.weekday, englishResidentStateAgain.expectedWeekday);
    assert.deepEqual(englishResidentStateAgain.stable, englishResidentState.stable);
    await page.selectOption('#settingsLanguage', 'de');
    await page.waitForFunction(() => {
      const firstDay = document.querySelector('#weekCalendar [data-calendar-date]');
      const date = firstDay?.dataset.calendarDate;
      if (!date || document.documentElement.lang !== 'de') return false;
      const expected = new Intl.DateTimeFormat('de-CH', { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(`${date}T12:00:00Z`));
      return firstDay.querySelector('.calendar-weekday')?.textContent.trim() === expected;
    });
    await page.click('[data-settings-target="device"]');
    assert.ok(await page.locator('#installAppButton').isVisible());
    await page.click('#createDeviceCodeButton');
    await page.waitForSelector('#devicePairingPanel:not([hidden])');
    await page.waitForFunction(() => {
      const image = document.querySelector('#devicePairingQr');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.match(await page.locator('#devicePairingQr').getAttribute('src'), /^data:image\/png;base64,/);
    const pairingCode = (await page.locator('#devicePairingCode').innerText()).trim();
    const partnerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await partnerPage.goto(`${baseUrl}/login.html?device=${encodeURIComponent(pairingCode)}`, { waitUntil: 'domcontentloaded' });
    assert.equal(await partnerPage.locator('#deviceLoginForm input[name="deviceCode"]').inputValue(), pairingCode);
    await partnerPage.fill('#deviceLoginForm input[name="email"]', 'e2e-partner@example.test');
    await partnerPage.fill('#deviceLoginForm input[name="password"]', 'E2E-Partner-2026!');
    await partnerPage.fill('#deviceLoginForm input[name="passwordConfirmation"]', 'E2E-Partner-2026!');
    await partnerPage.click('#deviceLoginForm button[type="submit"]');
    await partnerPage.waitForURL('**/index.html', { timeout: 10000 });
    const [primaryIdentity, partnerIdentity] = await Promise.all([
      page.evaluate(() => fetch('/api/me').then((response) => response.json())),
      partnerPage.evaluate(() => fetch('/api/me').then((response) => response.json()))
    ]);
    assert.notEqual(partnerIdentity.user.id, primaryIdentity.user.id);
    assert.equal(partnerIdentity.user.apartmentId, primaryIdentity.user.apartmentId);
    assert.deepEqual(partnerIdentity.user.roles, ['resident']);
    const promoteHouseAdmin = await fetch(`${baseUrl}/api/admin/users/${partnerIdentity.user.id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(promoteHouseAdmin.status, 200);
    await partnerPage.close();
    const houseAdminLogin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'e2e-partner@example.test', password: 'E2E-Partner-2026!' })
    });
    assert.equal(houseAdminLogin.status, 200);
    const houseAdminCookie = String(houseAdminLogin.headers.get('set-cookie') || '').split(';')[0];
    await page.click('[data-settings-target="security"]');
    assert.ok(await page.locator('#passwordForm').isVisible());
    await page.click('#closeSettingsButton');
    await page.waitForFunction(() => !String(document.querySelector('#statusText')?.textContent || '').trim());
    await page.click('#accountMenuButton');
    await page.click('#openDiaperGameButton');
    await page.waitForSelector('#diaperGameOverlay:not([hidden])');
    const diaperNetwork = [];
    const diaperPageErrors = [];
    page.on('pageerror', (error) => diaperPageErrors.push(error.stack || error.message));
    page.on('request', (request) => {
      if (request.url().includes('/api/diaper-game/')) diaperNetwork.push(`request ${request.method()} ${request.url()}`);
    });
    page.on('response', (response) => {
      if (response.url().includes('/api/diaper-game/')) diaperNetwork.push(`response ${response.status()} ${response.url()}`);
    });
    assert.equal(await page.locator('#diaperCountdown').innerText(), '00:60.0');
    await page.click('#startDiaperGameButton');
    try {
      await page.waitForSelector('#diaperGameActions [data-game-module]', { timeout: 10000 });
    } catch (error) {
      const gameStartState = await page.evaluate(() => ({
        status: document.querySelector('#diaperGameStatus')?.textContent,
        actions: document.querySelector('#diaperGameActions')?.textContent,
        startDisabled: document.querySelector('#startDiaperGameButton')?.disabled
      }));
      throw new Error(`Windel-Alarm konnte nicht starten: ${JSON.stringify(gameStartState)} Browser: ${diaperPageErrors.join(' | ')} Netzwerk: ${diaperNetwork.join(' | ')} Server: ${output.join('')} (${error.message})`);
    }
    const firstGameModule = await page.locator('#diaperGameActions [data-game-module]').getAttribute('data-game-module');
    assert.ok(['wire', 'signal', 'valve', 'code', 'temperature', 'leak'].includes(firstGameModule));
    await page.waitForTimeout(250);
    assert.notEqual(await page.locator('#diaperCountdown').innerText(), '00:60.0');
    await captureVisualChecks(page, screenshotDirectory, 'game-');

    for (let moduleIndex = 0; moduleIndex < 4; moduleIndex += 1) {
      await page.waitForSelector('#diaperGameActions [data-game-module]');
      const moduleType = await page.locator('#diaperGameActions [data-game-module]').getAttribute('data-game-module');
      const moduleScreenshot = path.join(screenshotDirectory, `game-${moduleType}-state-desktop.png`);
      await page.screenshot({ path: moduleScreenshot, fullPage: false, animations: 'disabled' });
      if (!gameStateScreenshots.includes(moduleScreenshot)) gameStateScreenshots.push(moduleScreenshot);

      if (moduleIndex === 0) {
        if (moduleType === 'wire') {
          const clue = await page.locator('#diaperMissionBrief').innerText();
          const targetSymbol = ['▲', '●', '◆', '■'].find((symbol) => clue.includes(symbol));
          const wireButtons = page.locator('[data-wire-id]');
          for (let index = 0; index < await wireButtons.count(); index += 1) {
            const button = wireButtons.nth(index);
            if (!(await button.innerText()).includes(targetSymbol)) {
              await button.click();
              break;
            }
          }
        } else if (moduleType === 'signal') {
          await page.waitForFunction(() => {
            const button = document.querySelector('[data-signal-id]');
            return button && !button.disabled;
          });
          const sequence = (await page.locator('[data-signal-sequence]').getAttribute('data-signal-sequence')).split(',');
          const wrongSignal = ['coral', 'mint', 'amber', 'blue'].find((signal) => signal !== sequence[0]);
          await page.click(`[data-signal-id="${wrongSignal}"]`);
        } else if (moduleType === 'code') {
          const answer = await page.locator('[data-code-answer]').getAttribute('data-code-answer');
          const wrongFirst = String((Number(answer[0]) % 9) + 1);
          for (const digit of `${wrongFirst}${answer.slice(1)}`) await page.click(`[data-code-digit="${digit}"]`);
          await page.click('[data-code-confirm]');
        } else if (moduleType === 'temperature') {
          const target = Number(await page.locator('[data-temperature-target]').getAttribute('data-temperature-target'));
          const current = Number((await page.locator('[data-temperature-value]').innerText()).replace('\u00b0', ''));
          if (current === target) await page.locator('[data-temperature-step]').first().click();
          await page.click('[data-temperature-confirm]');
        } else if (moduleType === 'leak') {
          const target = Number(await page.locator('[data-reveal-zone]').getAttribute('data-reveal-zone'));
          await page.waitForFunction(() => !document.querySelector('[data-leak-zone]')?.disabled);
          const zoneCount = await page.locator('[data-leak-zone]').count();
          await page.click(`[data-leak-zone="${(target + 1) % zoneCount}"]`);
        } else if (moduleType === 'circuit') {
          const path = (await page.locator('[data-circuit-path]').getAttribute('data-circuit-path')).split(',').map(Number);
          const wrongNode = [0, 1, 2, 3, 4, 5].find((node) => node !== path[0]);
          await page.click(`[data-circuit-node="${wrongNode}"]`);
        } else if (moduleType === 'locks') {
          const targets = (await page.locator('[data-lock-targets]').getAttribute('data-lock-targets')).split(',').map(Number);
          if (targets.every((target) => target === 0)) await page.click('[data-lock-turn="1"][data-lock-index="0"]');
          await page.click('[data-lock-confirm]');
        } else {
          await page.waitForFunction(() => {
            const safe = document.querySelector('.valve-safe')?.getBoundingClientRect();
            const needle = document.querySelector('.valve-needle')?.getBoundingClientRect();
            if (!safe || !needle) return false;
            const needleCenter = needle.left + needle.width / 2;
            if (needleCenter >= safe.left && needleCenter <= safe.right) return false;
            document.querySelector('.diaper-valve-lock')?.click();
            return true;
          });
        }
        await page.waitForFunction(() => document.querySelectorAll('#diaperStrikeLights .is-used').length === 1);
        await page.waitForTimeout(550);
      }

      if (moduleType === 'wire') {
        const clue = await page.locator('#diaperMissionBrief').innerText();
        const targetSymbol = ['▲', '●', '◆', '■'].find((symbol) => clue.includes(symbol));
        const wireButtons = page.locator('[data-wire-id]');
        for (let index = 0; index < await wireButtons.count(); index += 1) {
          const button = wireButtons.nth(index);
          if ((await button.innerText()).includes(targetSymbol)) {
            await button.click();
            break;
          }
        }
      } else if (moduleType === 'signal') {
        await page.waitForFunction(() => {
          const button = document.querySelector('[data-signal-id]');
          return button && !button.disabled;
        });
        const sequence = (await page.locator('[data-signal-sequence]').getAttribute('data-signal-sequence')).split(',');
        for (const signal of sequence) await page.click(`[data-signal-id="${signal}"]`);
      } else if (moduleType === 'code') {
        const answer = await page.locator('[data-code-answer]').getAttribute('data-code-answer');
        for (const digit of answer) await page.click(`[data-code-digit="${digit}"]`);
        await page.click('[data-code-confirm]');
      } else if (moduleType === 'temperature') {
        const state = await page.evaluate(() => ({
          current: Number(document.querySelector('[data-temperature-value]')?.textContent.replace('\u00b0', '')),
          target: Number(document.querySelector('[data-temperature-target]')?.dataset.temperatureTarget),
          steps: [...document.querySelectorAll('[data-temperature-step]')].map((button) => Number(button.dataset.temperatureStep))
        }));
        const queue = [{ value: state.current, path: [] }];
        const visited = new Set([state.current]);
        let solution = null;
        while (queue.length && !solution) {
          const item = queue.shift();
          if (item.value === state.target) {
            solution = item.path;
            break;
          }
          if (item.path.length >= 5) continue;
          for (const step of state.steps) {
            const value = item.value + step;
            if (!visited.has(value)) {
              visited.add(value);
              queue.push({ value, path: [...item.path, step] });
            }
          }
        }
        assert.ok(solution, `Keine Temperaturloesung von ${state.current} nach ${state.target}`);
        for (const step of solution) await page.click(`[data-temperature-step="${step}"]`);
        await page.click('[data-temperature-confirm]');
      } else if (moduleType === 'leak') {
        const target = await page.locator('[data-reveal-zone]').getAttribute('data-reveal-zone');
        await page.waitForFunction(() => !document.querySelector('[data-leak-zone]')?.disabled);
        await page.click(`[data-leak-zone="${target}"]`);
      } else if (moduleType === 'circuit') {
        const path = (await page.locator('[data-circuit-path]').getAttribute('data-circuit-path')).split(',');
        for (const node of path) await page.click(`[data-circuit-node="${node}"]`);
      } else if (moduleType === 'locks') {
        const targets = (await page.locator('[data-lock-targets]').getAttribute('data-lock-targets')).split(',').map(Number);
        for (let ring = 0; ring < targets.length; ring += 1) {
          for (let turn = 0; turn < targets[ring]; turn += 1) {
            await page.click(`[data-lock-turn="1"][data-lock-index="${ring}"]`);
          }
        }
        await page.click('[data-lock-confirm]');
      } else {
        await page.waitForFunction(() => {
          const safe = document.querySelector('.valve-safe')?.getBoundingClientRect();
          const needle = document.querySelector('.valve-needle')?.getBoundingClientRect();
          if (!safe || !needle) return false;
          const needleCenter = needle.left + needle.width / 2;
          if (needleCenter < safe.left || needleCenter > safe.right) return false;
          document.querySelector('.diaper-valve-lock')?.click();
          return true;
        });
      }

      try {
        await page.waitForFunction((expected) => (
          document.querySelectorAll('.diaper-step-rail .is-complete').length >= expected
        ), moduleIndex + 1, { timeout: 5000 });
      } catch {
        const gameState = await page.evaluate(() => ({
          countdown: document.querySelector('#diaperCountdown')?.textContent,
          mood: document.querySelector('#diaperGameStage')?.dataset.mood,
          status: document.querySelector('#diaperGameStatus')?.textContent,
          completed: document.querySelectorAll('.diaper-step-rail .is-complete').length,
          visibleModule: document.querySelector('#diaperGameActions [data-game-module]')?.dataset.gameModule
        }));
        throw new Error(`Windel-Alarm-Modul ${moduleIndex + 1} (${moduleType}) wurde nicht abgeschlossen: ${JSON.stringify(gameState)}`);
      }
      // Version 4 kann zwischen zwei Modulen einen 1,45-s-Zwischenfall abspielen.
      // Der naechste Schleifendurchlauf darf das bereits erledigte Modul nicht erneut greifen.
      await page.waitForTimeout(2100);
    }

    await page.waitForSelector('[data-game-module="final"]');
    const finalGameScreenshot = path.join(screenshotDirectory, 'game-final-state-desktop.png');
    await page.screenshot({ path: finalGameScreenshot, fullPage: false, animations: 'disabled' });
    gameStateScreenshots.push(finalGameScreenshot);
    await page.dispatchEvent('.diaper-final-cut', 'pointerdown');
    await page.waitForTimeout(1100);
    await page.dispatchEvent('.diaper-final-cut', 'pointerup');
    await page.waitForFunction(() => document.querySelector('#diaperGameStage')?.dataset.mood === 'happy');
    await page.waitForFunction(() => !document.querySelector('#diaperOwnRank')?.textContent.includes('Noch keine'));
    await page.click('#closeDiaperGameButton');
    await page.waitForFunction(() => document.querySelector('#diaperGameOverlay')?.hidden === true);
    await page.click('#messageCenterButton');
    await page.waitForSelector('#messageCenterOverlay:not([hidden])');
    assert.ok(await page.locator('#messageCenterList').isVisible());
    await page.click('#closeMessageCenterButton');
    await page.waitForFunction(() => document.querySelector('#messageCenterOverlay')?.hidden === true);
    await page.waitForFunction(() => !String(document.querySelector('#statusText')?.textContent || '').trim());
    await verifyIntroMediaPackage(page, screenshotDirectory, {
      id: 'resident-de', language: 'de', duration: 242, chapters: 9, secondStart: 24
    }, mediaScreenshots);
    await captureMediaSource(page, screenshotDirectory, 'resident-de-plan');
    await captureVisualChecks(page, screenshotDirectory);

    const adminContext = await browser.newContext();
    const cookieSeparator = adminCookie.indexOf('=');
    await adminContext.addCookies([{
      name: adminCookie.slice(0, cookieSeparator),
      value: adminCookie.slice(cookieSeparator + 1),
      url: baseUrl
    }]);
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await adminPage.click('#adminViewButton');
    await adminPage.waitForSelector('body.admin-view');

    await adminPage.click('[data-admin-target="house"]');
    await adminPage.waitForSelector('.resource-admin-group');
    assert.equal(await adminPage.locator('.resource-admin-group').count(), 3);
    await verifyIntroMediaPackage(adminPage, screenshotDirectory, {
      id: 'superadmin-de', language: 'de', duration: 280, chapters: 10, secondStart: 24
    }, mediaScreenshots);
    await captureMediaSource(adminPage, screenshotDirectory, 'superadmin-de-house');
    await captureVisualChecks(adminPage, screenshotDirectory, 'admin-house-');

    const readAdminLanguageState = () => adminPage.evaluate(() => ({
      activeSection: document.querySelector('[data-admin-target][aria-current="page"]')?.dataset.adminTarget || '',
      activeHouse: document.querySelector('#houseSelect')?.value || '',
      adminView: document.body.classList.contains('admin-view'),
      canBook: !document.querySelector('#bookingFlow')?.hidden
    }));
    const germanAdminState = await readAdminLanguageState();
    await adminPage.click('#accountMenuButton');
    await adminPage.click('#openSettingsButton');
    await adminPage.waitForSelector('#settingsOverlay:not([hidden])');
    await adminPage.click('[data-settings-target="profile"]');
    await adminPage.locator('#settingsLanguage').focus();
    await adminPage.selectOption('#settingsLanguage', 'en');
    await adminPage.waitForFunction(() => (
      document.documentElement.lang === 'en'
      && /^Administration\b/.test(document.querySelector('#adminTitle')?.textContent || '')
      && document.querySelector('[data-admin-target][aria-current="page"]')?.dataset.adminTarget === 'house'
    ));
    assert.deepEqual(await readAdminLanguageState(), germanAdminState);
    assert.equal(await adminPage.evaluate(() => document.activeElement?.id), 'settingsLanguage');
    await adminPage.click('#closeSettingsButton');
    await verifyIntroMediaPackage(adminPage, screenshotDirectory, {
      id: 'superadmin-en', language: 'en', duration: 280, chapters: 10, secondStart: 24
    }, mediaScreenshots);
    for (const section of ['overview', 'logbook', 'people', 'house', 'fixed', 'analytics', 'system']) {
      await adminPage.click(`[data-admin-target="${section}"]`);
      await assertEnglishAdminSection(adminPage, 'superadmin', section);
      if (['house', 'people', 'system'].includes(section)) {
        await captureMediaSource(adminPage, screenshotDirectory, `superadmin-en-${section}`);
      }
    }
    await adminPage.click('[data-admin-target="house"]');
    await adminPage.click('#accountMenuButton');
    await adminPage.click('#openSettingsButton');
    await adminPage.waitForSelector('#settingsOverlay:not([hidden])');
    await adminPage.click('[data-settings-target="profile"]');
    await adminPage.locator('#settingsLanguage').focus();
    await adminPage.selectOption('#settingsLanguage', 'de');
    await adminPage.waitForFunction(() => (
      document.documentElement.lang === 'de'
      && /^Verwaltung\b/.test(document.querySelector('#adminTitle')?.textContent || '')
      && document.querySelector('[data-admin-target][aria-current="page"]')?.dataset.adminTarget === 'house'
    ));
    assert.deepEqual(await readAdminLanguageState(), germanAdminState);
    await adminPage.click('#closeSettingsButton');

    await adminPage.click('[data-admin-target="people"]');
    await adminPage.waitForSelector('#adminPeopleSearch');
    await captureMediaSource(adminPage, screenshotDirectory, 'superadmin-de-people');
    await captureVisualChecks(adminPage, screenshotDirectory, 'admin-people-');

    await adminPage.click('[data-admin-target="system"]');
    await adminPage.waitForSelector('.admin-system-group');
    assert.equal(await adminPage.locator('.admin-system-group').count(), 3);
    await captureMediaSource(adminPage, screenshotDirectory, 'superadmin-de-system');
    await captureVisualChecks(adminPage, screenshotDirectory, 'admin-system-');

    const germanSystemState = await readAdminLanguageState();
    await adminPage.click('#accountMenuButton');
    await adminPage.click('#openSettingsButton');
    await adminPage.waitForSelector('#settingsOverlay:not([hidden])');
    await adminPage.click('[data-settings-target="profile"]');
    await adminPage.selectOption('#settingsLanguage', 'en');
    await adminPage.waitForFunction(() => (
      document.documentElement.lang === 'en'
      && document.querySelector('[data-admin-target][aria-current="page"]')?.dataset.adminTarget === 'system'
    ));
    assert.deepEqual(await readAdminLanguageState(), germanSystemState);
    await adminPage.click('#closeSettingsButton');
    for (const section of ['overview', 'logbook', 'people', 'house', 'fixed', 'analytics', 'system']) {
      await adminPage.click(`[data-admin-target="${section}"]`);
      await assertEnglishAdminSection(adminPage, 'superadmin-reloaded-language', section);
    }
    await adminContext.close();

    const houseAdminContext = await browser.newContext();
    const houseAdminCookieSeparator = houseAdminCookie.indexOf('=');
    await houseAdminContext.addCookies([{
      name: houseAdminCookie.slice(0, houseAdminCookieSeparator),
      value: houseAdminCookie.slice(houseAdminCookieSeparator + 1),
      url: baseUrl
    }]);
    const houseAdminPage = await houseAdminContext.newPage();
    await houseAdminPage.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await houseAdminPage.click('#adminViewButton');
    await houseAdminPage.waitForSelector('body.admin-view');
    await verifyIntroMediaPackage(houseAdminPage, screenshotDirectory, {
      id: 'house-admin-de', language: 'de', duration: 298, chapters: 11, secondStart: 24
    }, mediaScreenshots);
    for (const section of ['overview', 'house', 'people', 'fixed', 'analytics', 'logbook']) {
      await houseAdminPage.click(`[data-admin-target="${section}"]`);
      await captureMediaSource(houseAdminPage, screenshotDirectory, `house-admin-de-${section}`);
    }
    await houseAdminPage.click('#accountMenuButton');
    await houseAdminPage.click('#openSettingsButton');
    await houseAdminPage.waitForSelector('#settingsOverlay:not([hidden])');
    await houseAdminPage.click('[data-settings-target="profile"]');
    await houseAdminPage.selectOption('#settingsLanguage', 'en');
    await houseAdminPage.waitForFunction(() => document.documentElement.lang === 'en');
    await houseAdminPage.click('#closeSettingsButton');
    await verifyIntroMediaPackage(houseAdminPage, screenshotDirectory, {
      id: 'house-admin-en', language: 'en', duration: 298, chapters: 11, secondStart: 24
    }, mediaScreenshots);
    for (const section of ['overview', 'house', 'people', 'fixed', 'analytics', 'logbook']) {
      await houseAdminPage.click(`[data-admin-target="${section}"]`);
      await assertEnglishAdminSection(houseAdminPage, 'house-admin', section);
      await captureMediaSource(houseAdminPage, screenshotDirectory, `house-admin-en-${section}`);
    }
    const englishHouseAdminState = await houseAdminPage.evaluate(() => ({
      activeSection: document.querySelector('[data-admin-target][aria-current="page"]')?.dataset.adminTarget || '',
      activeHouse: document.querySelector('#houseSelect')?.value || '',
      adminView: document.body.classList.contains('admin-view')
    }));
    await houseAdminPage.click('#accountMenuButton');
    await houseAdminPage.click('#openSettingsButton');
    await houseAdminPage.waitForSelector('#settingsOverlay:not([hidden])');
    await houseAdminPage.click('[data-settings-target="profile"]');
    await houseAdminPage.selectOption('#settingsLanguage', 'de');
    await houseAdminPage.waitForFunction(() => document.documentElement.lang === 'de');
    await houseAdminPage.selectOption('#settingsLanguage', 'en');
    await houseAdminPage.waitForFunction(() => document.documentElement.lang === 'en');
    assert.deepEqual(await houseAdminPage.evaluate(() => ({
      activeSection: document.querySelector('[data-admin-target][aria-current="page"]')?.dataset.adminTarget || '',
      activeHouse: document.querySelector('#houseSelect')?.value || '',
      adminView: document.body.classList.contains('admin-view')
    })), englishHouseAdminState);
    await houseAdminPage.click('#closeSettingsButton');
    for (const section of ['overview', 'house', 'people', 'fixed', 'analytics', 'logbook']) {
      await houseAdminPage.click(`[data-admin-target="${section}"]`);
      await assertEnglishAdminSection(houseAdminPage, 'house-admin-reloaded-language', section);
    }
    await houseAdminContext.close();
    console.log(JSON.stringify({
      ok: true,
      browser: executablePath ? 'system' : 'playwright',
      screenshots: [''].concat(['game-', 'admin-house-', 'admin-people-', 'admin-system-'])
        .flatMap((prefix) => visualViewports.map((viewport) => (
          path.join(screenshotDirectory, `${prefix}${viewport.name}-${viewport.width}x${viewport.height}.png`)
        ))).concat(gameStateScreenshots, mediaScreenshots)
    }));
  } finally {
    if (browser) await browser.close();
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
  console.error(error.stack || error);
  process.exitCode = 1;
});
