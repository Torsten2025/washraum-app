'use strict';

const crypto = require('crypto');

const {
  BACKUP_CONTRACT_VERSION,
  COMMIT_PATTERN,
  HASH_PATTERN,
  EXPECTED_CANDIDATE_VERSION,
  EXPECTED_LIVE_VERSION,
  PRODUCTION_BACKUP_DIR,
  PRODUCTION_DB_PATH,
  PRODUCTION_DOMAIN,
  PRODUCTION_RENDER_SERVICE_ID,
  PRODUCTION_SERVICE,
  SCHEMA_CONTRACT_VERSION,
  SIGNED_PROOF_CONTRACT_VERSION,
  ProductionBackupError,
  expectedTargetPath,
  verifySignedBackupProof
} = require('./production-backup-contract');

const MAX_BACKUP_AGE_MS = 30 * 60 * 1000;
const GITHUB_REPOSITORY = 'Torsten2025/washraum-app';

function reject(code) {
  throw new ProductionBackupError(code);
}

function validateProof(proof, candidateCommit, now = Date.now()) {
  if (!Number.isFinite(now)) reject('BACKUP_FRESHNESS');
  if (!COMMIT_PATTERN.test(candidateCommit)) reject('CANDIDATE_COMMIT');
  if (proof.ok !== true || proof.contract !== BACKUP_CONTRACT_VERSION
    || proof.signedProofContract !== SIGNED_PROOF_CONTRACT_VERSION) reject('BACKUP_PROOF');
  if (proof.service !== PRODUCTION_SERVICE || proof.serviceId !== PRODUCTION_RENDER_SERVICE_ID
    || proof.domain !== PRODUCTION_DOMAIN || proof.databasePath !== PRODUCTION_DB_PATH
    || proof.backupPath !== expectedTargetPath(candidateCommit)) reject('TARGET_SERVICE');
  if (!COMMIT_PATTERN.test(String(proof.sourceCommit || '')) || proof.candidateCommit !== candidateCommit
    || proof.sourceVersion !== EXPECTED_LIVE_VERSION || proof.candidateVersion !== EXPECTED_CANDIDATE_VERSION) {
    reject('BACKUP_BINDING');
  }
  if (proof.bootstrapObserved !== true || proof.backupArtifactObserved !== true
    || !/^[0-9a-f]{64}$/.test(String(proof.executionNonce || ''))) reject('BACKUP_PROOF');
  if (!HASH_PATTERN.test(String(proof.sha256 || ''))
    || !HASH_PATTERN.test(String(proof.schemaSha256 || ''))
    || !HASH_PATTERN.test(String(proof.tableCountsSha256 || ''))) reject('BACKUP_PROOF');
  if (proof.integrityCheck !== 'ok' || proof.foreignKeyViolations !== 0 || proof.personalDataPrinted !== false) {
    reject('BACKUP_PROOF');
  }
  if (proof.schemaContract !== SCHEMA_CONTRACT_VERSION
    || proof.sourceOpenedReadOnly !== true
    || proof.targetCreatedExactlyOnce !== true) reject('BACKUP_PROOF');
  if (!proof.restoreDrill || proof.restoreDrill.ok !== true
    || proof.restoreDrill.sha256 !== proof.sha256
    || proof.restoreDrill.schemaSha256 !== proof.schemaSha256
    || proof.restoreDrill.tableCountsSha256 !== proof.tableCountsSha256) reject('RESTORE_PROOF');
  const createdAt = Date.parse(String(proof.createdAt || ''));
  if (!Number.isFinite(createdAt) || createdAt > now || now - createdAt > MAX_BACKUP_AGE_MS) reject('BACKUP_FRESHNESS');

  return proof;
}

async function observeLiveEndpoint(proof, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  let response;
  try {
    response = await fetchImpl(`https://${PRODUCTION_DOMAIN}/api/health`, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs || 20_000),
      headers: { Accept: 'application/json' }
    });
  } catch {
    reject('LIVE_ENDPOINT');
  }
  if (response.status !== 200) reject('LIVE_ENDPOINT');
  let body;
  try { body = await response.json(); } catch { reject('LIVE_ENDPOINT'); }
  if (body?.ok !== true || body?.revision !== proof.sourceCommit || body?.version !== proof.sourceVersion) {
    reject('LIVE_ENDPOINT');
  }
  return { observed: true };
}

function validateRenderHookUrl(rawUrl, candidateCommit) {
  let hookUrl;
  try {
    hookUrl = new URL(String(rawUrl || ''));
  } catch {
    reject('HOOK_URL');
  }
  if (hookUrl.protocol !== 'https:' || hookUrl.hostname !== 'api.render.com') reject('HOOK_URL');
  if (hookUrl.pathname !== `/deploy/${PRODUCTION_RENDER_SERVICE_ID}`) reject('HOOK_URL');
  if (!hookUrl.searchParams.get('key') || hookUrl.searchParams.has('ref')) reject('HOOK_URL');
  hookUrl.searchParams.set('ref', candidateCommit);
  return hookUrl;
}

function proofConsumptionRef(proof) {
  const digest = crypto.createHash('sha256')
    .update(`${proof.executionNonce}:${proof.candidateCommit}`)
    .digest('hex');
  return `refs/tags/waschzeit-release-proof-${digest}`;
}

async function consumeProofOnce(proof, input, options = {}) {
  const repository = String(input.githubRepository || '').trim();
  const token = String(input.githubToken || '');
  if (repository !== GITHUB_REPOSITORY || !token) reject('REPLAY_LEDGER_CONFIG');
  const fetchImpl = options.fetchImpl || fetch;
  let response;
  try {
    response = await fetchImpl(`https://api.github.com/repos/${GITHUB_REPOSITORY}/git/refs`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs || 20_000),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({ ref: proofConsumptionRef(proof), sha: proof.candidateCommit })
    });
  } catch {
    // An uncertain transport result may already have consumed the proof. Never retry.
    reject('REPLAY_LEDGER_TRANSPORT');
  }
  if (response.status === 422) reject('PROOF_REPLAY');
  if (response.status !== 201) reject('REPLAY_LEDGER_STATUS');
  return { consumed: true };
}

async function sendSingleDeployRequest(hookUrl, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 20_000;
  let response;
  try {
    response = await fetchImpl(hookUrl, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' }
    });
  } catch {
    reject('HOOK_TRANSPORT');
  }
  if (response.status !== 200) reject(response.status === 202 ? 'HOOK_PARALLEL' : 'HOOK_STATUS');
  let body;
  try {
    body = await response.json();
  } catch {
    reject('HOOK_BODY');
  }
  const deployId = String(body?.deploy?.id || '');
  if (!/^dep-[a-z0-9]+$/i.test(deployId)) reject('HOOK_BODY');
  return { ok: true, requestCount: 1, deployAccepted: true };
}

async function runDeployment(input, options = {}) {
  const candidateCommit = String(input.candidateCommit || '').trim().toLowerCase();
  if (input.parallelActions !== 'none') reject('PARALLEL_ACTION');
  if (input.autoDeploy !== 'off') reject('AUTO_DEPLOY');
  const proof = validateProof(
    verifySignedBackupProof(input.proofToken, input.proofKey),
    candidateCommit,
    options.now === undefined ? Date.now() : options.now
  );
  const consumeImpl = options.consumeProofImpl || consumeProofOnce;
  await consumeImpl(proof, input, {
    fetchImpl: options.ledgerFetchImpl,
    timeoutMs: options.timeoutMs
  });
  await observeLiveEndpoint(proof, { fetchImpl: options.liveFetchImpl, timeoutMs: options.timeoutMs });
  const hookUrl = validateRenderHookUrl(input.hookUrl, candidateCommit);
  const result = await sendSingleDeployRequest(hookUrl, {
    fetchImpl: options.hookFetchImpl,
    timeoutMs: options.timeoutMs
  });
  return { ...result, backupArtifactObserved: true, liveEndpointObserved: true };
}

async function main() {
  try {
    const result = await runDeployment({
      candidateCommit: process.env.PRODUCTION_CANDIDATE_COMMIT,
      parallelActions: process.env.PRODUCTION_PARALLEL_ACTIONS,
      autoDeploy: process.env.PRODUCTION_AUTO_DEPLOY,
      proofToken: process.env.PRODUCTION_BACKUP_PROOF,
      proofKey: process.env.PRODUCTION_RELEASE_PROOF_KEY,
      githubRepository: process.env.GITHUB_REPOSITORY,
      githubToken: process.env.GITHUB_TOKEN,
      hookUrl: process.env.RENDER_DEPLOY_HOOK_URL
    });
    process.stdout.write(`PRODUCTION_DEPLOY_TRIGGER_PASS requestCount=${result.requestCount}\n`);
  } catch (error) {
    const code = error instanceof ProductionBackupError ? error.code : 'UNEXPECTED';
    process.stderr.write(`PRODUCTION_DEPLOY_TRIGGER_STOP class=${code}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  MAX_BACKUP_AGE_MS,
  consumeProofOnce,
  observeLiveEndpoint,
  proofConsumptionRef,
  runDeployment,
  sendSingleDeployRequest,
  validateProof,
  validateRenderHookUrl
};

if (require.main === module) main();
