const assert = require('assert/strict');
process.env.ALLOW_LEGACY_HOUSE_REGISTRATION = 'true';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const required = String(process.env.E2E_REQUIRED || '').toLowerCase() === 'true';

async function loadPlaywright() {
  try {
    return require('playwright');
  } catch (packageError) {
    if (process.env.PLAYWRIGHT_MODULE_PATH) {
      try {
        return require(path.resolve(process.env.PLAYWRIGHT_MODULE_PATH));
      } catch (configuredError) {
        if (required) throw configuredError;
      }
    } else if (required) {
      throw packageError;
    }
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'playwright-not-installed' }));
    process.exit(0);
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
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function run() {
  const playwright = await loadPlaywright();
  const port = 34000 + (process.pid % 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const databasePath = path.join(os.tmpdir(), `waschplan-e2e-${process.pid}.sqlite`);
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
      body: JSON.stringify({ label: 'E2E 2. OG links', displayName: 'E2E Familie' })
    });
    assert.equal(apartmentResponse.status, 201);
    const apartment = await apartmentResponse.json();
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || systemBrowserPath();
    browser = await playwright.chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {})
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.click('#showRegister');
    await page.fill('#registerForm input[name="email"]', 'e2e@example.test');
    await page.fill('#registerForm input[name="password"]', 'E2E-Bewohner-2026!');
    await page.fill('#registerForm input[name="apartmentCode"]', apartment.activationCode);
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
    await page.click('[data-settings-target="security"]');
    assert.ok(await page.locator('#passwordForm').isVisible());
    await page.click('#closeSettingsButton');
    await page.click('#messageCenterButton');
    await page.waitForSelector('#messageCenterOverlay:not([hidden])');
    assert.ok(await page.locator('#messageCenterList').isVisible());
    console.log(JSON.stringify({ ok: true, browser: executablePath ? 'system' : 'playwright' }));
  } catch (error) {
    if (/Executable doesn't exist|browserType.launch/.test(error.message) && !required) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'browser-not-installed' }));
      return;
    }
    throw error;
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
