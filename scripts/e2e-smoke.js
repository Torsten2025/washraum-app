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
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(apartment.invitationLink, { waitUntil: 'domcontentloaded' });
    await page.fill('#registerForm input[name="password"]', 'E2E-Bewohner-2026!');
    await page.fill('#registerForm input[name="passwordConfirmation"]', 'E2E-Bewohner-2026!');
    await page.click('#registerForm button[type="submit"]');
    await page.waitForURL('**/index.html?welcome=1', { timeout: 10000 });
    await page.waitForSelector('#settingsOverlay:not([hidden])');
    assert.equal(await page.locator('#settingsTitle').innerText(), 'Einmal kurz einrichten.');
    await page.click('#settingsDoneButton');
    await page.waitForFunction(() => document.querySelector('#settingsOverlay')?.hidden === true);
    await page.click('#accountMenuButton');
    await page.click('#openSettingsButton');
    await page.waitForSelector('#settingsOverlay:not([hidden])');
    assert.ok(await page.locator('#notificationEmail').isVisible());
    await page.click('[data-settings-target="notifications"]');
    assert.ok(await page.locator('#notifyReleases').isVisible());
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
    assert.equal(await page.locator('#diaperCountdown').innerText(), '00:45.0');
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
    assert.notEqual(await page.locator('#diaperCountdown').innerText(), '00:45.0');
    await captureVisualChecks(page, screenshotDirectory, 'game-');

    for (let moduleIndex = 0; moduleIndex < 3; moduleIndex += 1) {
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
          await page.click(`[data-leak-zone="${(target + 1) % 6}"]`);
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
      await page.waitForTimeout(500);
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
    await captureVisualChecks(adminPage, screenshotDirectory, 'admin-house-');

    await adminPage.click('[data-admin-target="people"]');
    await adminPage.waitForSelector('#adminPeopleSearch');
    await captureVisualChecks(adminPage, screenshotDirectory, 'admin-people-');

    await adminPage.click('[data-admin-target="system"]');
    await adminPage.waitForSelector('.admin-system-group');
    assert.equal(await adminPage.locator('.admin-system-group').count(), 3);
    await captureVisualChecks(adminPage, screenshotDirectory, 'admin-system-');
    await adminContext.close();
    console.log(JSON.stringify({
      ok: true,
      browser: executablePath ? 'system' : 'playwright',
      screenshots: [''].concat(['game-', 'admin-house-', 'admin-people-', 'admin-system-'])
        .flatMap((prefix) => visualViewports.map((viewport) => (
          path.join(screenshotDirectory, `${prefix}${viewport.name}-${viewport.width}x${viewport.height}.png`)
        ))).concat(gameStateScreenshots)
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
