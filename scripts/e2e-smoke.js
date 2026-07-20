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
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

async function captureVisualChecks(page, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const viewport of visualViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      window.scrollTo(0, 0);
    });
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
      path: path.join(outputDirectory, `${viewport.name}-${viewport.width}x${viewport.height}.png`),
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
    await page.click('#messageCenterButton');
    await page.waitForSelector('#messageCenterOverlay:not([hidden])');
    assert.ok(await page.locator('#messageCenterList').isVisible());
    await page.click('#closeMessageCenterButton');
    await page.waitForFunction(() => document.querySelector('#messageCenterOverlay')?.hidden === true);
    await captureVisualChecks(page, screenshotDirectory);
    console.log(JSON.stringify({
      ok: true,
      browser: executablePath ? 'system' : 'playwright',
      screenshots: visualViewports.map((viewport) => (
        path.join(screenshotDirectory, `${viewport.name}-${viewport.width}x${viewport.height}.png`)
      ))
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
