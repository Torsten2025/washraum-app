const assert = require('assert/strict');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const projectRoot = path.resolve(__dirname, '..');
const adminPassword = 'Backup-Drill-Admin-2026!';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  child.kill();
  return new Promise((resolve) => child.once('exit', resolve));
}

async function waitForApp(baseUrl, output) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Testserver nicht erreichbar.\n${output.join('')}`);
}

async function api(baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function startApp({ databasePath, backupDirectory, port, uploadUrl = '' }) {
  const output = [];
  const child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      DB_PATH: databasePath,
      BACKUP_DIR: backupDirectory,
      BACKUP_UPLOAD_URL: uploadUrl,
      BACKUP_UPLOAD_TOKEN: 'restore-drill-token',
      AUTO_BACKUP: 'false',
      SEED_ADMIN_NAME: 'backup-drill-admin',
      SEED_ADMIN_PASSWORD: adminPassword,
      SESSION_SECRET: 'backup-restore-drill-session-secret-2026'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  return { child, output };
}

async function login(baseUrl) {
  const result = await api(baseUrl, '/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'backup-drill-admin', password: adminPassword })
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return String(result.response.headers.get('set-cookie') || '').split(';')[0];
}

async function run() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-restore-drill-'));
  const resolvedTemporaryRoot = path.resolve(temporaryRoot);
  const resolvedSystemTemp = `${path.resolve(os.tmpdir())}${path.sep}`;
  assert.ok(resolvedTemporaryRoot.startsWith(resolvedSystemTemp));
  assert.ok(path.basename(resolvedTemporaryRoot).startsWith('waschzeit-restore-drill-'));

  const sourceDatabase = path.join(temporaryRoot, 'source.sqlite');
  const restoredDatabase = path.join(temporaryRoot, 'restored.sqlite');
  const backupDirectory = path.join(temporaryRoot, 'backups');
  let uploadedBackup = null;
  let uploadedFilename = '';
  const uploadServer = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      assert.equal(request.method, 'PUT');
      assert.equal(request.headers.authorization, 'Bearer restore-drill-token');
      assert.equal(request.headers['content-type'], 'application/vnd.sqlite3');
      uploadedFilename = decodeURIComponent(String(request.url || '').split('/').pop());
      uploadedBackup = Buffer.concat(chunks);
      response.writeHead(201).end();
    });
  });

  let sourceApp;
  let restoredApp;
  try {
    const uploadPort = await listen(uploadServer);
    const sourcePort = uploadPort + 1;
    const sourceUrl = `http://127.0.0.1:${sourcePort}`;
    sourceApp = startApp({
      databasePath: sourceDatabase,
      backupDirectory,
      port: sourcePort,
      uploadUrl: `http://127.0.0.1:${uploadPort}/external/{filename}`
    });
    await waitForApp(sourceUrl, sourceApp.output);
    const sourceCookie = await login(sourceUrl);
    const resourcesBefore = await api(sourceUrl, '/api/resources', { cookie: sourceCookie });
    assert.equal(resourcesBefore.response.status, 200);

    const backup = await api(sourceUrl, '/api/admin/backup/run', {
      method: 'POST',
      cookie: sourceCookie,
      body: JSON.stringify({ currentPassword: adminPassword })
    });
    assert.equal(backup.response.status, 200, JSON.stringify(backup.body));
    assert.equal(backup.body.status.ok, true);
    assert.equal(backup.body.status.uploaded, true);
    assert.match(uploadedFilename, /^washplan-.+\.sqlite$/);
    assert.ok(uploadedBackup?.length > 0);
    fs.writeFileSync(restoredDatabase, uploadedBackup);

    const restoredCheck = new Database(restoredDatabase, { readonly: true, fileMustExist: true });
    assert.equal(restoredCheck.pragma('integrity_check', { simple: true }), 'ok');
    const restoredCounts = {
      users: restoredCheck.prepare('SELECT COUNT(*) AS count FROM users').get().count,
      houses: restoredCheck.prepare('SELECT COUNT(*) AS count FROM houses').get().count,
      resources: restoredCheck.prepare('SELECT COUNT(*) AS count FROM resources').get().count
    };
    restoredCheck.close();
    assert.ok(restoredCounts.users >= 1);
    assert.ok(restoredCounts.houses >= 1);
    assert.equal(restoredCounts.resources, resourcesBefore.body.resources.length);

    await stopProcess(sourceApp.child);
    sourceApp = null;
    const restoredPort = sourcePort + 1;
    const restoredUrl = `http://127.0.0.1:${restoredPort}`;
    restoredApp = startApp({
      databasePath: restoredDatabase,
      backupDirectory: path.join(temporaryRoot, 'restored-backups'),
      port: restoredPort
    });
    await waitForApp(restoredUrl, restoredApp.output);
    const restoredCookie = await login(restoredUrl);
    const resourcesAfter = await api(restoredUrl, '/api/resources', { cookie: restoredCookie });
    assert.equal(resourcesAfter.response.status, 200);
    assert.equal(resourcesAfter.body.resources.length, resourcesBefore.body.resources.length);

    console.log(JSON.stringify({
      ok: true,
      suite: 'backup-restore',
      externalUpload: true,
      authorizationHeader: true,
      integrityCheck: 'ok',
      restoredApplicationLogin: true,
      restoredCounts
    }));
  } finally {
    await stopProcess(sourceApp?.child);
    await stopProcess(restoredApp?.child);
    if (uploadServer.listening) await closeServer(uploadServer);
    fs.rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
