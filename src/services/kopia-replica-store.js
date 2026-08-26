'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KOPIA_PIN = Object.freeze({
  version: '0.23.1',
  releaseCommit: '72ec08f',
  linuxX64ArchiveSha256: '416d0f84a3dbb321a8b2d8f0997b1a0a6e915babe79ee76fa6e4d2bd1e1c5178',
  checksumsSha256: 'ec1089c8309867fb729b981ee77f6ebf57adb154a8094f841c2848ec8e41fb01',
  signatureSha256: '0872308be5ff500b18b47558bca775ed35f69598633619ef3178b65d1252433a'
});

const FULL_SHA256 = /^[0-9a-f]{64}$/;
const REPOSITORY_IDENTITY = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const ACCESS_ROLES = new Set(['APPEND_READ', 'READ_ONLY']);
const LINUX_O_RDONLY = 0;
const LINUX_O_NOFOLLOW = 0x20000;
const LINUX_O_CLOEXEC = 0x80000;
const ALLOWED_ELF_INTERPRETERS = new Set([
  '/lib64/ld-linux-x86-64.so.2',
  '/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2'
]);
const SYSTEM_ENV_ALLOWLIST = [
  'PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'ComSpec', 'PATHEXT',
  'SSL_CERT_FILE', 'SSL_CERT_DIR'
];

class KopiaReplicaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'KopiaReplicaError';
    this.code = code;
  }
}

function samePath(left, right, platform = process.platform) {
  const normalizedLeft = path.resolve(String(left || ''));
  const normalizedRight = path.resolve(String(right || ''));
  return platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function validateLinuxX64Elf(binary) {
  if (binary.length < 64 || binary[0] !== 0x7f || binary[1] !== 0x45
    || binary[2] !== 0x4c || binary[3] !== 0x46) {
    throw new KopiaReplicaError('KOPIA_BINARY_FORMAT', 'Das Kopia-Artefakt ist kein ELF-Binaerprogramm.');
  }
  if (binary[4] !== 2 || binary[5] !== 1 || binary[6] !== 1
    || ![2, 3].includes(binary.readUInt16LE(16))
    || binary.readUInt16LE(18) !== 62 || binary.readUInt32LE(20) !== 1) {
    throw new KopiaReplicaError('KOPIA_BINARY_ARCHITECTURE', 'Das Kopia-Artefakt ist nicht das freigegebene Linux-x64-ELF64-Format.');
  }
  const programOffset = Number(binary.readBigUInt64LE(32));
  const programEntrySize = binary.readUInt16LE(54);
  const programCount = binary.readUInt16LE(56);
  if (!Number.isSafeInteger(programOffset) || (programCount > 0 && programEntrySize < 56)
    || programOffset + (programEntrySize * programCount) > binary.length) {
    throw new KopiaReplicaError('KOPIA_BINARY_FORMAT', 'Die ELF-Programmheader sind nicht kanonisch gebunden.');
  }
  let interpreterCount = 0;
  for (let index = 0; index < programCount; index += 1) {
    const headerOffset = programOffset + (index * programEntrySize);
    if (binary.readUInt32LE(headerOffset) !== 3) continue;
    interpreterCount += 1;
    if (interpreterCount > 1) {
      throw new KopiaReplicaError('KOPIA_BINARY_INTERPRETER', 'Das Kopia-Artefakt besitzt mehrere ELF-Interpreter.');
    }
    const interpreterOffset = Number(binary.readBigUInt64LE(headerOffset + 8));
    const interpreterSize = Number(binary.readBigUInt64LE(headerOffset + 32));
    if (!Number.isSafeInteger(interpreterOffset) || !Number.isSafeInteger(interpreterSize)
      || interpreterSize < 2 || interpreterOffset + interpreterSize > binary.length
      || binary[interpreterOffset + interpreterSize - 1] !== 0) {
      throw new KopiaReplicaError('KOPIA_BINARY_INTERPRETER', 'Der ELF-Interpreter ist nicht sicher lesbar.');
    }
    const interpreter = binary.subarray(interpreterOffset, interpreterOffset + interpreterSize)
      .toString('utf8').replace(/\0+$/, '');
    if (!ALLOWED_ELF_INTERPRETERS.has(interpreter)) {
      throw new KopiaReplicaError('KOPIA_BINARY_INTERPRETER', 'Der ELF-Interpreter ist nicht freigegeben.');
    }
  }
}

function validateKopiaRuntimeContract({
  executablePath,
  runtimePin,
  serverUrl,
  serverCertificateSha256,
  repositoryUsername,
  repositoryHostname,
  accessRole,
  credential,
  systemEnvironment = {},
  expectedBinarySha256,
  commandRunner,
  freshCacheFactory,
  commandTimeoutMs = 120000,
  fsImpl = fs,
  platform = process.platform,
  keepExecutableHandleOpen = false,
  processUid = typeof process.getuid === 'function' ? process.getuid() : null
} = {}) {
  if (!commandRunner || typeof commandRunner.prepare !== 'function' || typeof freshCacheFactory !== 'function') {
    throw new KopiaReplicaError('KOPIA_ADAPTER_INCOMPLETE', 'Kopia benoetigt einen zweiphasigen Prozessstarter und frische Cachegrenzen.');
  }
  if (platform !== 'linux' || commandRunner.executionMode !== 'linux-proc-fd') {
    throw new KopiaReplicaError('KOPIA_EXECUTION_PLATFORM', 'Kopia darf produktiv nur FD-gebunden unter Linux starten.');
  }
  try {
    if (!fsImpl.statSync('/proc/self/fd').isDirectory()) {
      throw new Error('proc fd is not a directory');
    }
  } catch {
    throw new KopiaReplicaError('KOPIA_PROC_FD_UNAVAILABLE', 'Linux /proc/self/fd ist fuer die gebundene Ausfuehrung nicht verfuegbar.');
  }
  if (!runtimePin || Object.keys(KOPIA_PIN).some((key) => runtimePin[key] !== KOPIA_PIN[key])) {
    throw new KopiaReplicaError('KOPIA_PIN_MISMATCH', 'Kopia ist nicht an das vollstaendig freigegebene Releaseartefakt gebunden.');
  }
  if (!Number.isInteger(commandTimeoutMs) || commandTimeoutMs < 5000 || commandTimeoutMs > 150000) {
    throw new KopiaReplicaError('KOPIA_TIMEOUT_CONTRACT', 'Kopia besitzt kein begrenztes Kommandozeitbudget.');
  }
  const canonicalServerUrl = canonicalRepositoryServerUrl(serverUrl);
  const certificateSha256 = String(serverCertificateSha256 || '').trim().toLowerCase();
  if (!FULL_SHA256.test(certificateSha256)) {
    throw new KopiaReplicaError('KOPIA_SERVER_CERTIFICATE', 'Der TLS-Zertifikatsfingerabdruck des Repository Servers fehlt.');
  }
  const username = String(repositoryUsername || '').trim().toLowerCase();
  const hostname = String(repositoryHostname || '').trim().toLowerCase();
  if (!REPOSITORY_IDENTITY.test(username) || !REPOSITORY_IDENTITY.test(hostname)) {
    throw new KopiaReplicaError('KOPIA_SERVER_IDENTITY', 'Die Repository-Server-Identitaet ist ungueltig.');
  }
  if (!ACCESS_ROLES.has(accessRole)) {
    throw new KopiaReplicaError('KOPIA_SERVER_ACL', 'Die Repository-Server-ACL ist nicht freigegeben.');
  }
  const password = String(credential || '');
  if (password.length < 24) {
    throw new KopiaReplicaError('KOPIA_SERVER_CREDENTIAL', 'Das dedizierte Repository-Server-Credential fehlt.');
  }
  const forbiddenProviderBinding = Object.keys(systemEnvironment).find((name) => /^(?:R2_|AWS_|S3_|CF_R2_|CLOUDFLARE_)/i.test(name)
    && String(systemEnvironment[name] || '').trim());
  const forbiddenPrivilegedBinding = Object.keys(systemEnvironment).find((name) => /^KOPIA_REPOSITORY_(?:FULL|OWNER|MAINTENANCE|VERIFIER|RESTORE)_/i.test(name)
    && String(systemEnvironment[name] || '').trim());
  if (forbiddenProviderBinding || forbiddenPrivilegedBinding
    || ['KOPIA_PASSWORD', 'KOPIA_CONFIG_PATH'].some((name) => String(systemEnvironment[name] || '').trim())) {
    throw new KopiaReplicaError('KOPIA_DIRECT_PROVIDER_BINDING', 'Direkte Provider- oder Repositorykonfiguration ist im App-Prozess verboten.');
  }

  const resolvedExecutablePath = path.resolve(String(executablePath || ''));
  if (!path.isAbsolute(String(executablePath || ''))) {
    throw new KopiaReplicaError('KOPIA_COMPONENT_UNAVAILABLE', 'Der Kopia-Binaerpfad ist nicht absolut gebunden.');
  }
  let descriptor;
  let fileStat;
  let canonicalPath;
  let binary;
  try {
    const linkStat = fsImpl.lstatSync(resolvedExecutablePath);
    if (!linkStat.isFile() || linkStat.isSymbolicLink()) {
      throw new KopiaReplicaError('KOPIA_BINARY_TYPE', 'Das Kopia-Artefakt ist keine regulaere, direkte Datei.');
    }
    canonicalPath = fsImpl.realpathSync(resolvedExecutablePath);
    if (!samePath(canonicalPath, resolvedExecutablePath, platform)) {
      throw new KopiaReplicaError('KOPIA_BINARY_PATH_DRIFT', 'Der Kopia-Binaerpfad driftet auf ein anderes Ziel.');
    }
    descriptor = fsImpl.openSync(resolvedExecutablePath,
      LINUX_O_RDONLY | LINUX_O_NOFOLLOW | LINUX_O_CLOEXEC);
    fileStat = fsImpl.fstatSync(descriptor);
    if (!fileStat.isFile() || !Number.isSafeInteger(fileStat.size) || fileStat.size < 64
      || !Number.isFinite(fileStat.dev) || !Number.isFinite(fileStat.ino)
      || !Number.isInteger(fileStat.mode) || !Number.isInteger(fileStat.uid) || !Number.isInteger(fileStat.gid)
      || fileStat.size !== linkStat.size
      || (Number.isFinite(linkStat.ino) && Number.isFinite(fileStat.ino) && linkStat.ino !== fileStat.ino)
      || (Number.isFinite(linkStat.dev) && Number.isFinite(fileStat.dev) && linkStat.dev !== fileStat.dev)) {
      throw new KopiaReplicaError('KOPIA_BINARY_PATH_DRIFT', 'Das geoeffnete Kopia-Artefakt entspricht nicht dem geprueften Pfad.');
    }
    binary = fsImpl.readFileSync(descriptor);
    const afterReadStat = fsImpl.fstatSync(descriptor);
    if (!Buffer.isBuffer(binary) || binary.length !== fileStat.size
      || !afterReadStat.isFile() || afterReadStat.size !== fileStat.size
      || afterReadStat.ino !== fileStat.ino || afterReadStat.dev !== fileStat.dev
      || afterReadStat.mtimeMs !== fileStat.mtimeMs || afterReadStat.ctimeMs !== fileStat.ctimeMs) {
      throw new KopiaReplicaError('KOPIA_BINARY_PATH_DRIFT', 'Das Kopia-Artefakt veraenderte sich waehrend der Handlepruefung.');
    }
  } catch (error) {
    if (descriptor !== undefined) {
      try { fsImpl.closeSync(descriptor); } catch { /* Der Validierungsfehler bleibt vorrangig. */ }
      descriptor = undefined;
    }
    if (error instanceof KopiaReplicaError) throw error;
    throw new KopiaReplicaError('KOPIA_COMPONENT_UNAVAILABLE', 'Das Kopia-Artefakt fehlt oder ist nicht vollstaendig lesbar.');
  }
  const binarySha256 = crypto.createHash('sha256').update(binary).digest('hex');
  const expectedSha256 = String(expectedBinarySha256 || '').trim().toLowerCase();
  try {
    validateLinuxX64Elf(binary);
    if ((fileStat.mode & 0o6000) !== 0 || (fileStat.mode & 0o022) !== 0) {
      throw new KopiaReplicaError('KOPIA_BINARY_PERMISSIONS', 'Das Kopia-Artefakt besitzt gefaehrliche Set-ID- oder Gruppen-/Welt-Schreibrechte.');
    }
    if ((fileStat.mode & 0o222) !== 0 || !Number.isInteger(processUid) || fileStat.uid === processUid) {
      throw new KopiaReplicaError('KOPIA_BINARY_NOT_SEALED', 'Das Kopia-Artefakt ist fuer den App-Prozess nicht nachweislich schreibgeschuetzt.');
    }
    if (!FULL_SHA256.test(expectedSha256) || binarySha256 !== expectedSha256) {
      throw new KopiaReplicaError('KOPIA_BINARY_HASH', 'Die Kopia-Binaerdatei entspricht nicht dem Laufzeitfingerabdruck.');
    }
  } catch (error) {
    try { fsImpl.closeSync(descriptor); } catch { /* Der Hash-/Formatfehler bleibt vorrangig. */ }
    descriptor = undefined;
    throw error;
  }
  const identity = Object.freeze({
    executablePath: resolvedExecutablePath,
    canonicalPath: path.resolve(canonicalPath),
    binarySha256,
    size: fileStat.size,
    device: fileStat.dev,
    inode: fileStat.ino,
    mode: fileStat.mode,
    uid: fileStat.uid,
    gid: fileStat.gid
  });
  const common = {
    ...identity,
    canonicalServerUrl,
    certificateSha256,
    username,
    hostname,
    accessRole,
    password,
    commandTimeoutMs
  };
  if (!keepExecutableHandleOpen) {
    try {
      fsImpl.closeSync(descriptor);
      descriptor = undefined;
    } catch {
      throw new KopiaReplicaError('KOPIA_COMPONENT_UNAVAILABLE', 'Der read-only Kopia-Binaerhandle konnte nicht sicher geschlossen werden.');
    }
    return Object.freeze(common);
  }
  let closed = false;
  const executionHandle = Object.freeze({
    kind: 'validated-kopia-elf-handle',
    parentFd: descriptor,
    childFd: 3,
    procExecutablePath: '/proc/self/fd/3',
    identity,
    closeParentHandle() {
      if (closed) return;
      closed = true;
      fsImpl.closeSync(descriptor);
    }
  });
  return Object.freeze({ ...common, executionHandle });
}

function findSnapshotId(value) {
  if (!value || typeof value !== 'object') return '';
  for (const key of ['id', 'snapshotID', 'snapshotId', 'manifestID', 'manifestId']) {
    const candidate = String(value[key] || '');
    if (/^[a-z0-9._-]{8,}$/i.test(candidate)) return candidate;
  }
  for (const nested of Object.values(value)) {
    const id = findSnapshotId(nested);
    if (id) return id;
  }
  return '';
}

function canonicalRepositoryServerUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    throw new KopiaReplicaError('KOPIA_SERVER_URL', 'Der Repository Server ist nicht kanonisch gebunden.');
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password
    || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
    throw new KopiaReplicaError('KOPIA_SERVER_URL', 'Der Repository Server ist nicht kanonisch TLS-gebunden.');
  }
  return parsed.origin;
}

function createKopiaRepositoryServerStore({
  executablePath,
  runtimePin,
  configPath,
  serverUrl,
  serverCertificateSha256,
  repositoryUsername,
  repositoryHostname,
  accessRole,
  credential,
  commandRunner,
  systemEnvironment = {},
  expectedBinarySha256,
  freshCacheFactory,
  commandTimeoutMs = 120000,
  fsImpl = fs,
  platform = process.platform,
  processUid = typeof process.getuid === 'function' ? process.getuid() : null,
  prevalidatedRuntime = null
} = {}) {
  if (!path.isAbsolute(String(configPath || ''))) {
    throw new KopiaReplicaError('KOPIA_CONFIG_PATH', 'Der isolierte Kopia-Konfigurationspfad ist nicht absolut gebunden.');
  }
  const validationArguments = {
    executablePath, runtimePin, serverUrl, serverCertificateSha256,
    repositoryUsername, repositoryHostname, accessRole, credential,
    commandRunner, systemEnvironment, expectedBinarySha256,
    freshCacheFactory, commandTimeoutMs, fsImpl, platform, processUid
  };
  const runtime = validateKopiaRuntimeContract(validationArguments);
  const identityFields = ['executablePath', 'canonicalPath', 'binarySha256', 'size', 'device', 'inode', 'mode', 'uid', 'gid'];
  if (prevalidatedRuntime && identityFields.some((field) => prevalidatedRuntime[field] !== runtime[field])) {
    throw new KopiaReplicaError('KOPIA_BINARY_PATH_DRIFT', 'Das Kopia-Artefakt wurde nach dem wirkungsfreien Preflight ersetzt.');
  }
  function openValidatedRuntimeHandle() {
    const current = validateKopiaRuntimeContract({
      ...validationArguments,
      keepExecutableHandleOpen: true
    });
    if (identityFields.some((field) => current[field] !== runtime[field])) {
      current.executionHandle.closeParentHandle();
      throw new KopiaReplicaError('KOPIA_BINARY_PATH_DRIFT', 'Das Kopia-Artefakt wurde vor der Ausfuehrung ersetzt.');
    }
    return current;
  }

  const inherited = Object.fromEntries(SYSTEM_ENV_ALLOWLIST
    .filter((name) => String(systemEnvironment[name] || ''))
    .map((name) => [name, String(systemEnvironment[name])]));
  const commandEnvironment = Object.freeze({
    ...inherited,
    KOPIA_PASSWORD: runtime.password,
    KOPIA_CHECK_FOR_UPDATES: 'false'
  });
  let connectionPromise = null;

  async function runRaw(args, { freshCache = false } = {}) {
    const cache = freshCache ? await freshCacheFactory() : null;
    try {
      let result;
      try {
        const preparedCommand = commandRunner.prepare(runtime.executablePath, ['--config-file', configPath, ...args], {
          env: {
            ...commandEnvironment,
            ...(cache ? { KOPIA_CACHE_DIRECTORY: cache.path } : {})
          },
          rejectStdoutSecrets: [runtime.password],
          timeoutMs: runtime.commandTimeoutMs
        });
        if (!preparedCommand || typeof preparedCommand.start !== 'function') {
          throw new KopiaReplicaError('KOPIA_ADAPTER_INCOMPLETE', 'Kopia lieferte keinen synchron startbaren Prozessplan.');
        }
        // Alle injizierbaren Vorbereitungen (einschliesslich Cache/Config/Argumentplan)
        // liegen vor dieser letzten Pruefung. Zwischen Revalidierung und start() gibt es
        // weder await/yield noch einen weiteren Adaptercallback oder FS-Write.
        const finalRuntime = openValidatedRuntimeHandle();
        let runningCommand;
        try {
          runningCommand = preparedCommand.start(finalRuntime.executionHandle);
          if (!runningCommand || typeof runningCommand.then !== 'function'
            || !runningCommand.spawnOutcome || typeof runningCommand.spawnOutcome.then !== 'function') {
            throw new KopiaReplicaError('KOPIA_ADAPTER_INCOMPLETE',
              'Kopia lieferte keinen gebundenen Spawn-/Fehlernachweis.');
          }
          try {
            await runningCommand.spawnOutcome;
          } catch (error) {
            // Der Completion-Promise darf nach einem Spawnfehler nicht unbeobachtet ablehnen.
            runningCommand.catch(() => {});
            throw error;
          }
        } finally {
          // Der Parenthandle bleibt bis zum bestaetigten spawn- oder error-Ereignis offen.
          // Danach wird er in beiden Faellen genau einmal geschlossen.
          finalRuntime.executionHandle.closeParentHandle();
        }
        result = await runningCommand;
      } catch (error) {
        if (error?.code === 'KOPIA_COMMAND_TIMEOUT' || error?.code === 'ETIMEDOUT' || error?.killed === true) {
          const timeout = new KopiaReplicaError('KOPIA_COMMAND_TIMEOUT', 'Kopia ueberschritt das begrenzte Zeitbudget.');
          timeout.retryable = true;
          throw timeout;
        }
        if (error instanceof KopiaReplicaError) throw error;
        throw new KopiaReplicaError('KOPIA_COMMAND_FAILED', 'Kopia schloss den gebundenen Auftrag nicht erfolgreich ab.');
      }
      if (!result || result.exitCode !== 0) {
        throw new KopiaReplicaError('KOPIA_COMMAND_FAILED', 'Kopia schloss den gebundenen Auftrag nicht erfolgreich ab.');
      }
      return result;
    } finally {
      await cache?.dispose?.();
    }
  }

  async function ensureConnected() {
    if (!connectionPromise) {
      const args = [
        'repository', 'connect', 'server', '--url', runtime.canonicalServerUrl,
        '--server-cert-fingerprint', runtime.certificateSha256,
        '--override-username', runtime.username, '--override-hostname', runtime.hostname,
        '--no-enable-actions'
      ];
      if (accessRole === 'READ_ONLY') args.push('--readonly');
      connectionPromise = runRaw(args).then(() => true);
    }
    return connectionPromise;
  }

  async function run(args, options) {
    await ensureConnected();
    return runRaw(args, options);
  }

  async function snapshotDirectory(directoryPath, { tags = {} } = {}) {
    if (accessRole !== 'APPEND_READ') {
      throw new KopiaReplicaError('KOPIA_CAPABILITY_DENIED', 'Das READ_ONLY-Konto darf keinen Snapshot erzeugen.');
    }
    if (typeof directoryPath !== 'string' || Buffer.isBuffer(directoryPath)) {
      throw new KopiaReplicaError('KOPIA_PLAINTEXT_BOUNDARY', 'Kopia akzeptiert nur einen geschuetzten lokalen Pfad, niemals Rohbytes.');
    }
    const tagArguments = Object.entries(tags).sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([key, value]) => ['--tags', `${key}:${value}`]);
    const result = await run([
      'snapshot', 'create', directoryPath, '--json', '--pin',
      '--no-send-snapshot-report', '--force-disable-actions', ...tagArguments
    ]);
    let payload;
    try {
      payload = JSON.parse(result.stdout);
    } catch {
      throw new KopiaReplicaError('KOPIA_JSON', 'Kopia snapshot create lieferte kein kanonisches JSON.');
    }
    const snapshotId = findSnapshotId(payload);
    if (!snapshotId) throw new KopiaReplicaError('KOPIA_SNAPSHOT_ID', 'Kopia lieferte keine Snapshot-ID.');
    return Object.freeze({ snapshotId });
  }

  async function verifySnapshot(snapshotId) {
    const result = await run([
      'snapshot', 'verify', snapshotId, '--verify-files-percent=100',
      '--max-errors=1', '--parallel=1', '--json'
    ], { freshCache: true });
    return Object.freeze({
      ok: true,
      snapshotId,
      outputSha256: crypto.createHash('sha256').update(result.stdout).digest('hex')
    });
  }

  async function restoreToNewPath(snapshotId, targetPath) {
    if (fs.existsSync(targetPath)) {
      throw new KopiaReplicaError('KOPIA_RESTORE_TARGET_EXISTS', 'Readback darf nur in einen neuen isolierten Pfad schreiben.');
    }
    await run([
      'snapshot', 'restore', snapshotId, targetPath,
      '--no-overwrite-files', '--no-overwrite-directories', '--no-overwrite-symlinks',
      '--write-files-atomically', '--flush-files', '--parallel=1'
    ], { freshCache: true });
    return Object.freeze({ ok: true, snapshotId, targetPath });
  }

  const common = {
    kind: 'encrypted-replica',
    implementation: 'kopia-repository-server',
    repositoryTransport: 'server',
    clientSideEncryption: true,
    accessRole,
    deleteCapability: false,
    maintenanceCapability: false,
    providerCredentialsPresent: false,
    pin: KOPIA_PIN,
    retention: Object.freeze({ days: 30, enforcedByExternalPolicy: true, deletionCapabilityUsedByApp: false }),
    verifySnapshot
  };
  if (accessRole === 'APPEND_READ') {
    return Object.freeze({ ...common, snapshotDirectory, readbackSnapshot: restoreToNewPath });
  }
  return Object.freeze({ ...common, restoreSnapshot: restoreToNewPath });
}

function createKopiaReplicaStore(options = {}) {
  return createKopiaRepositoryServerStore({ ...options, accessRole: 'APPEND_READ' });
}

function createKopiaVerifierStore(options = {}) {
  return createKopiaRepositoryServerStore({ ...options, accessRole: 'READ_ONLY' });
}

module.exports = {
  KOPIA_PIN,
  KopiaReplicaError,
  createKopiaReplicaStore,
  createKopiaVerifierStore,
  findSnapshotId,
  validateKopiaRuntimeContract
};
