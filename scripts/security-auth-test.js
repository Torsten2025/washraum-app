const assert = require('assert/strict');
process.env.ALLOW_TEST_INVITATION_LINK = 'true';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const port = 35000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `waschzeit-security-${process.pid}.sqlite`);
const serverOutput = [];
const results = [];

class ApiClient {
  constructor(cookie = '') {
    this.cookie = cookie;
    this.lastSetCookie = '';
  }

  async request(urlPath, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) headers.Cookie = this.cookie;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${baseUrl}${urlPath}`, { ...options, headers });
    this.lastSetCookie = response.headers.get('set-cookie') || '';
    if (this.lastSetCookie) this.cookie = this.lastSetCookie.split(';', 1)[0];
    const contentType = response.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = Buffer.from(await response.arrayBuffer());
    }
    return { response, body };
  }
}

async function expectStatus(client, urlPath, expected, options = {}) {
  const result = await client.request(urlPath, options);
  assert.equal(
    result.response.status,
    expected,
    `${options.method || 'GET'} ${urlPath}: ${JSON.stringify(result.body)}`
  );
  return result;
}

async function check(id, title, callback) {
  const startedAt = Date.now();
  try {
    await callback();
    const durationMs = Date.now() - startedAt;
    results.push({ id, title, status: 'PASS', durationMs });
    console.log(`[PASS] ${id} ${title} (${durationMs} ms)`);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    results.push({ id, title, status: 'FAIL', durationMs, error: error.message });
    console.error(`[FAIL] ${id} ${title}: ${error.message}`);
    throw error;
  }
}

async function waitForServer(url, output) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Testserver nicht erreichbar.\n${output.join('')}`);
}

function removeDatabase(filePath) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${filePath}${suffix}`, { force: true });
}

async function verifyProductionHeaders() {
  const productionPort = port + 1;
  const productionUrl = `http://127.0.0.1:${productionPort}`;
  const productionDatabase = path.join(os.tmpdir(), `waschzeit-security-production-${process.pid}.sqlite`);
  const output = [];
  const productionServer = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(productionPort),
      DB_PATH: productionDatabase,
      SEED_ADMIN_NAME: 'security-prod-admin',
      SEED_ADMIN_PASSWORD: 'Security-Prod-Admin-2026!',
      SESSION_SECRET: 'security-production-session-secret-at-least-32-characters',
      ALLOW_LEGACY_HOUSE_REGISTRATION: 'false',
      ALLOW_TEST_INVITATION_LINK: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  productionServer.stdout.on('data', (chunk) => output.push(chunk.toString()));
  productionServer.stderr.on('data', (chunk) => output.push(chunk.toString()));

  try {
    await waitForServer(productionUrl, output);
    const health = await fetch(`${productionUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.match(health.headers.get('strict-transport-security') || '', /max-age=31536000/);
    const login = await fetch(`${productionUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
      body: JSON.stringify({ username: 'security-prod-admin', password: 'Security-Prod-Admin-2026!' })
    });
    assert.equal(login.status, 200, await login.text());
    const cookie = login.headers.get('set-cookie') || '';
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Secure/i);
    const invitationWithoutEmail = await fetch(`${productionUrl}/api/admin/apartments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie.split(';', 1)[0],
        'X-Forwarded-Proto': 'https'
      },
      body: JSON.stringify({
        label: 'Produktiv 2. OG links',
        displayName: 'Produktiv Familie',
        email: 'produktiv@example.test'
      })
    });
    assert.equal(invitationWithoutEmail.status, 503);
    const invitationError = await invitationWithoutEmail.json();
    assert.match(invitationError.error, /E-Mail-Versand ist noch nicht eingerichtet/);
    const apartmentsAfterFailure = await fetch(`${productionUrl}/api/admin/apartments`, {
      headers: { Cookie: cookie.split(';', 1)[0], 'X-Forwarded-Proto': 'https' }
    });
    assert.equal(apartmentsAfterFailure.status, 200);
    const apartmentList = await apartmentsAfterFailure.json();
    assert.ok(!apartmentList.apartments.some((entry) => entry.label === 'Produktiv 2. OG links'));
  } finally {
    if (productionServer.exitCode === null) {
      productionServer.kill();
      await new Promise((resolve) => productionServer.once('exit', resolve));
    }
    removeDatabase(productionDatabase);
  }
}

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      SEED_ADMIN_NAME: 'security-admin',
      SEED_ADMIN_PASSWORD: 'Security-Admin-2026!',
      SESSION_SECRET: 'security-test-session-secret-at-least-32-characters',
      SESSION_IDLE_MINUTES: '30'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
  server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

  const guest = new ApiClient();
  const admin = new ApiClient('connect.sid=s%3Afixed-attacker-session.invalid');
  const resident = new ApiClient();
  let apartment;
  let residentId;

  try {
    await waitForServer(baseUrl, serverOutput);

    await check('SEC-01', 'Sicherheitsheader und API-Cache-Schutz', async () => {
      const result = await expectStatus(guest, '/api/health', 200);
      const headers = result.response.headers;
      assert.match(headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
      assert.match(headers.get('content-security-policy') || '', /object-src 'none'/);
      assert.equal(headers.get('x-frame-options'), 'DENY');
      assert.equal(headers.get('x-content-type-options'), 'nosniff');
      assert.equal(headers.get('referrer-policy'), 'no-referrer');
      assert.match(headers.get('permissions-policy') || '', /camera=\(\)/);
      assert.equal(headers.get('cache-control'), 'no-store');
    });

    await check('SEC-02', 'Fremde und fehlerhafte Anfrage-Urspruenge werden blockiert', async () => {
      await expectStatus(guest, '/api/login', 403, {
        method: 'POST',
        headers: { Origin: 'https://attacker.invalid' },
        body: JSON.stringify({ username: 'security-admin', password: 'Security-Admin-2026!' })
      });
      await expectStatus(guest, '/api/login', 403, {
        method: 'POST',
        headers: { 'Sec-Fetch-Site': 'cross-site' },
        body: JSON.stringify({ username: 'security-admin', password: 'Security-Admin-2026!' })
      });
      await expectStatus(guest, '/api/login', 403, {
        method: 'POST',
        headers: { Origin: 'not a url' },
        body: JSON.stringify({ username: 'security-admin', password: 'Security-Admin-2026!' })
      });
      await expectStatus(guest, '/api/logout', 200, {
        method: 'POST',
        headers: { Origin: baseUrl, 'Sec-Fetch-Site': 'same-origin' }
      });
    });

    await check('SEC-03', 'JSON-Nutzlast ist auf 32 KB begrenzt', async () => {
      const oversized = JSON.stringify({ email: `${'a'.repeat(34 * 1024)}@example.test` });
      const response = await fetch(`${baseUrl}/api/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: oversized
      });
      assert.equal(response.status, 413);
      assert.equal((await response.json()).error, 'Die Anfrage ist zu gross.');
      const malformed = await fetch(`${baseUrl}/api/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email":'
      });
      assert.equal(malformed.status, 400);
      assert.equal((await malformed.json()).error, 'Die Anfrage enthaelt ungueltiges JSON.');
    });

    await check('AUTH-01', 'Gaeste erhalten keinen Zugriff auf geschuetzte Daten', async () => {
      await expectStatus(guest, '/api/resources', 401);
      await expectStatus(guest, '/api/maintenance-resources', 401);
      await expectStatus(guest, '/api/admin/users', 403);
      await expectStatus(guest, '/api/me/export', 401);
    });

    await check('AUTH-02', 'Loginfehler verraten weder Kontoexistenz noch Passwortstatus', async () => {
      const unknown = await expectStatus(new ApiClient(), '/api/login', 401, {
        method: 'POST',
        body: JSON.stringify({ username: 'unknown@example.test', password: 'Falsches-Passwort-2026!' })
      });
      const wrongPassword = await expectStatus(new ApiClient(), '/api/login', 401, {
        method: 'POST',
        body: JSON.stringify({ username: 'security-admin', password: 'Falsches-Passwort-2026!' })
      });
      const injection = await expectStatus(new ApiClient(), '/api/login', 401, {
        method: 'POST',
        body: JSON.stringify({ username: "' OR 1=1 --", password: 'Falsches-Passwort-2026!' })
      });
      assert.equal(unknown.body.error, wrongPassword.body.error);
      assert.equal(injection.body.error, wrongPassword.body.error);
    });

    await check('AUTH-03', 'Adminlogin erneuert die Sitzung und setzt sichere Cookie-Attribute', async () => {
      const fixedCookie = admin.cookie;
      const login = await expectStatus(admin, '/api/login', 200, {
        method: 'POST',
        body: JSON.stringify({ username: 'security-admin', password: 'Security-Admin-2026!' })
      });
      assert.equal(login.body.user.role, 'admin');
      assert.equal(login.body.user.isSuperadmin, true);
      assert.notEqual(admin.cookie, fixedCookie);
      assert.match(admin.lastSetCookie, /HttpOnly/i);
      assert.match(admin.lastSetCookie, /SameSite=Lax/i);
    });

    await check('AUTH-04', 'Superadmin darf die globale Hausverwaltung erreichen', async () => {
      const houses = await expectStatus(admin, '/api/admin/houses', 200);
      assert.ok(houses.body.houses.length >= 1);
      await expectStatus(admin, '/api/admin/backup/run', 200, { method: 'POST' });
    });

    await check('REG-01', 'Wohnung wird mit fester E-Mail und einmaligem Einladungslink angelegt', async () => {
      const created = await expectStatus(admin, '/api/admin/apartments', 201, {
        method: 'POST',
        body: JSON.stringify({
          label: 'Audit 2. OG links',
          displayName: 'Audit Familie',
          email: 'audit-familie@example.test'
        })
      });
      assert.equal(created.body.invitation.email, 'audit-familie@example.test');
      assert.equal(created.body.invitation.emailSent, false);
      const invitationLifetime = new Date(created.body.invitation.expiresAt).getTime() - Date.now();
      assert.ok(invitationLifetime > 6.9 * 24 * 60 * 60 * 1000);
      assert.ok(invitationLifetime <= (7 * 24 * 60 * 60 * 1000) + 1000);
      assert.match(created.body.invitationLink, /\/login\.html\?invite=[a-f0-9]{64}$/);
      assert.equal(created.body.apartment.label, 'Audit 2. OG links');
      apartment = created.body;
      await expectStatus(admin, '/api/admin/apartments', 400, {
        method: 'POST',
        body: JSON.stringify({
          label: 'Audit ungueltig',
          displayName: 'Bad\r\nHeader',
          email: 'audit-bad@example.test'
        })
      });
    });

    await check('REG-02', 'Einladung weist freie Registrierung, schwaches Passwort und falsche Links ab', async () => {
      await expectStatus(new ApiClient(), '/api/register', 410, {
        method: 'POST',
        body: JSON.stringify({
          email: 'frei@example.test',
          password: 'Audit-Passwort-2026!',
          apartmentCode: 'W-ALT-CODE'
        })
      });
      await expectStatus(admin, '/api/admin/apartments', 400, {
        method: 'POST',
        body: JSON.stringify({
          label: 'Audit falsche Mail',
          displayName: 'Audit Falsch',
          email: 'adresse@example.test\r\nBcc:angriff@example.test'
        })
      });
      const invitationToken = new URL(apartment.invitationLink).searchParams.get('invite');
      await expectStatus(new ApiClient(), '/api/invitations/ungueltig', 404);
      await expectStatus(new ApiClient(), '/api/invitations/accept', 400, {
        method: 'POST',
        body: JSON.stringify({
          token: invitationToken,
          password: 'kurz'
        })
      });
      await expectStatus(new ApiClient(), '/api/invitations/accept', 400, {
        method: 'POST',
        body: JSON.stringify({
          token: 'f'.repeat(64),
          password: 'Audit-Passwort-2026!'
        })
      });
    });

    await check('REG-03', 'Einladungslink erzeugt genau ein fest gebundenes Wohnungskonto', async () => {
      const invitationToken = new URL(apartment.invitationLink).searchParams.get('invite');
      const preview = await expectStatus(new ApiClient(), `/api/invitations/${invitationToken}`, 200);
      assert.equal(preview.body.invitation.email, 'audit-familie@example.test');
      assert.equal(preview.body.invitation.apartmentLabel, 'Audit 2. OG links');
      const registration = await expectStatus(resident, '/api/invitations/accept', 201, {
        method: 'POST',
        body: JSON.stringify({
          token: invitationToken,
          password: 'Audit-Passwort-2026!',
          notifyReleases: true
        })
      });
      residentId = registration.body.user.id;
      assert.equal(registration.body.user.role, 'user');
      assert.equal(registration.body.user.apartmentLabel, 'Audit 2. OG links');
      assert.equal(registration.body.user.displayName, 'Audit Familie');
      assert.equal(registration.body.user.emailVerified, false);
      await expectStatus(new ApiClient(), '/api/invitations/accept', 400, {
        method: 'POST',
        body: JSON.stringify({
          token: invitationToken,
          password: 'Zweites-Passwort-2026!'
        })
      });
    });

    await check('AUTH-05A', 'Admin kann die E-Mail eines fremden Wohnungskontos nicht uebernehmen', async () => {
      await expectStatus(admin, `/api/admin/apartments/${apartment.apartment.id}`, 403, {
        method: 'PUT',
        body: JSON.stringify({
          displayName: 'Audit Familie',
          email: 'security-admin@example.test',
          secondaryEmail: ''
        })
      });
      const residentState = await expectStatus(resident, '/api/me', 200);
      assert.equal(residentState.body.user.email, 'audit-familie@example.test');
      assert.equal(residentState.body.user.apartmentLabel, 'Audit 2. OG links');
    });

    await check('AUTH-05', 'Bewohnerlogin erfolgt per E-Mail, nicht per frei gewaehltem Namen', async () => {
      await expectStatus(new ApiClient(), '/api/login', 401, {
        method: 'POST',
        body: JSON.stringify({
          username: 'frei-gewaehlter-name-wird-ignoriert',
          password: 'Audit-Passwort-2026!'
        })
      });
      const emailLogin = await expectStatus(new ApiClient(), '/api/login', 200, {
        method: 'POST',
        body: JSON.stringify({
          email: 'AUDIT-FAMILIE@EXAMPLE.TEST',
          password: 'Audit-Passwort-2026!'
        })
      });
      assert.equal(emailLogin.body.user.id, residentId);
    });

    await check('AUTH-06', 'Zweite Wohnungs-E-Mail kann sich mit demselben Konto anmelden', async () => {
      const updated = await expectStatus(resident, '/api/me/notifications', 200, {
        method: 'PUT',
        body: JSON.stringify({
          email: 'audit-familie@example.test',
          secondaryEmail: 'audit-partner@example.test',
          notifyReleases: true,
          resourceType: 'all',
          weekday: '',
          slot: ''
        })
      });
      assert.equal(updated.body.user.secondaryEmail, 'audit-partner@example.test');
      const secondaryLogin = await expectStatus(new ApiClient(), '/api/login', 200, {
        method: 'POST',
        body: JSON.stringify({
          email: 'audit-partner@example.test',
          password: 'Audit-Passwort-2026!'
        })
      });
      assert.equal(secondaryLogin.body.user.id, residentId);
    });

    await check('AUTH-07', 'Geraetecode ist kurzlebig, kontogebunden und nur einmal verwendbar', async () => {
      const code = await expectStatus(resident, '/api/me/device-code', 201, { method: 'POST' });
      assert.match(code.body.code, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
      assert.equal(new URL(code.body.loginUrl).searchParams.get('device'), code.body.code);
      assert.match(code.body.qrCodeDataUrl, /^data:image\/png;base64,/);
      const paired = await expectStatus(new ApiClient(), '/api/device-login', 200, {
        method: 'POST',
        body: JSON.stringify({ deviceCode: code.body.code })
      });
      assert.equal(paired.body.user.id, residentId);
      await expectStatus(new ApiClient(), '/api/device-login', 400, {
        method: 'POST',
        body: JSON.stringify({ deviceCode: code.body.code })
      });
      await expectStatus(new ApiClient(), '/api/device-login', 400, {
        method: 'POST',
        body: JSON.stringify({ deviceCode: 'W-UNGUELTIG' })
      });
    });

    await check('ROLE-01', 'Bewohner kann keine Admin- oder Superadminaktionen ausfuehren', async () => {
      await expectStatus(resident, '/api/admin/users', 403);
      await expectStatus(resident, '/api/admin/resources', 403);
      await expectStatus(resident, '/api/admin/houses', 403);
      await expectStatus(resident, '/api/admin/backup', 403);
      await expectStatus(resident, '/api/admin/pilot-accounts', 403, {
        method: 'DELETE',
        body: JSON.stringify({ confirm: 'ALLE TESTKONTEN LOESCHEN' })
      });
      await expectStatus(resident, `/api/admin/users/${residentId}/recovery-code`, 403, {
        method: 'POST',
        body: JSON.stringify({ confirm: 'KONTO WIEDERHERSTELLEN' })
      });
      await expectStatus(resident, '/api/me/active-house', 403, {
        method: 'PUT',
        body: JSON.stringify({ houseId: 1 })
      });
    });

    await check('AUTH-08', 'Passwortwechsel prueft das alte Passwort und beendet andere Sitzungen', async () => {
      const parallel = new ApiClient();
      await expectStatus(parallel, '/api/login', 200, {
        method: 'POST',
        body: JSON.stringify({ email: 'audit-familie@example.test', password: 'Audit-Passwort-2026!' })
      });
      await expectStatus(resident, '/api/me/password', 403, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'Falsch-2026!', newPassword: 'Audit-Neues-Passwort-2026!' })
      });
      await expectStatus(resident, '/api/me/password', 400, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'Audit-Passwort-2026!', newPassword: 'Audit-Passwort-2026!' })
      });
      await expectStatus(resident, '/api/me/password', 200, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'Audit-Passwort-2026!', newPassword: 'Audit-Neues-Passwort-2026!' })
      });
      const expiredParallel = await expectStatus(parallel, '/api/me', 200);
      assert.equal(expiredParallel.body.user, null);
      await expectStatus(new ApiClient(), '/api/login', 401, {
        method: 'POST',
        body: JSON.stringify({ email: 'audit-familie@example.test', password: 'Audit-Passwort-2026!' })
      });
      await expectStatus(new ApiClient(), '/api/login', 200, {
        method: 'POST',
        body: JSON.stringify({ email: 'audit-familie@example.test', password: 'Audit-Neues-Passwort-2026!' })
      });
    });

    await check('AUTH-09', 'Passwort-Reset antwortet fuer bekannte und unbekannte E-Mail gleich', async () => {
      const known = await expectStatus(new ApiClient(), '/api/password-reset/request', 200, {
        method: 'POST',
        body: JSON.stringify({ email: 'audit-familie@example.test' })
      });
      const unknown = await expectStatus(new ApiClient(), '/api/password-reset/request', 200, {
        method: 'POST',
        body: JSON.stringify({ email: 'nicht-vorhanden@example.test' })
      });
      assert.equal(known.body.message, unknown.body.message);
    });

    await check('AUTH-10', 'Deaktivierung beendet Sitzungen und blockiert weitere Anmeldung', async () => {
      const activeClient = new ApiClient();
      await expectStatus(activeClient, '/api/login', 200, {
        method: 'POST',
        body: JSON.stringify({ email: 'audit-familie@example.test', password: 'Audit-Neues-Passwort-2026!' })
      });
      await expectStatus(admin, `/api/admin/users/${residentId}/status`, 200, {
        method: 'PUT',
        body: JSON.stringify({ active: false })
      });
      const afterDeactivation = await expectStatus(activeClient, '/api/me', 200);
      assert.equal(afterDeactivation.body.user, null);
      await expectStatus(new ApiClient(), '/api/login', 403, {
        method: 'POST',
        body: JSON.stringify({ email: 'audit-familie@example.test', password: 'Audit-Neues-Passwort-2026!' })
      });
      await expectStatus(admin, `/api/admin/users/${residentId}/status`, 200, {
        method: 'PUT',
        body: JSON.stringify({ active: true })
      });
    });

    await check('RATE-01', 'Anmeldeversuche werden pro IP und Identitaet begrenzt', async () => {
      let limited = null;
      for (let attempt = 1; attempt <= 21; attempt += 1) {
        const response = await new ApiClient().request('/api/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'rate-limit@example.test', password: `Falsch-${attempt}-2026!` })
        });
        if (response.response.status === 429) {
          limited = response;
          break;
        }
        assert.equal(response.response.status, 401);
      }
      assert.ok(limited, 'Das Anmeldelimit wurde nach 21 Versuchen nicht erreicht.');
      assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
    });

    await check('RATE-02', 'Passwort-Wiederherstellung besitzt ein eigenes IP-Limit', async () => {
      let limited = null;
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const response = await new ApiClient().request('/api/password-reset/request', {
          method: 'POST',
          body: JSON.stringify({ email: `recovery-${attempt}@example.test` })
        });
        if (response.response.status === 429) {
          limited = response;
          break;
        }
        assert.equal(response.response.status, 200);
      }
      assert.ok(limited, 'Das Wiederherstellungslimit wurde nicht erreicht.');
      assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
    });

    await check('RATE-03', 'Einladungsannahme besitzt ein separates IP-Limit', async () => {
      let limited = null;
      for (let attempt = 0; attempt < 35; attempt += 1) {
        const response = await new ApiClient().request('/api/invitations/accept', {
          method: 'POST',
          body: JSON.stringify({
            token: attempt.toString(16).padStart(64, '0'),
            password: 'Registrierung-Audit-2026!'
          })
        });
        if (response.response.status === 429) {
          limited = response;
          break;
        }
        assert.equal(response.response.status, 400);
      }
      assert.ok(limited, 'Das Registrierungslimit wurde nicht erreicht.');
      assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
    });

    await check('SEC-04', 'Produktion erzwingt HSTS und Secure-Cookies', verifyProductionHeaders);

    const summary = {
      ok: true,
      suite: 'security-auth',
      checks: results.length,
      passed: results.filter((result) => result.status === 'PASS').length,
      failed: results.filter((result) => result.status === 'FAIL').length,
      durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
      areas: ['security-headers', 'origin-protection', 'sessions', 'login', 'invitations', 'device-code', 'roles', 'passwords', 'rate-limits']
    };
    console.log(JSON.stringify(summary));
  } finally {
    if (server.exitCode === null) {
      server.kill();
      await new Promise((resolve) => server.once('exit', resolve));
    }
    removeDatabase(databasePath);
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  console.error(serverOutput.join(''));
  process.exitCode = 1;
});
