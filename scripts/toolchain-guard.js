'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXPECTED_NODE_VERSION = '22.23.1';
const EXPECTED_NPM_VERSION = '10.9.8';
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function normalizeNodeVersion(value) {
  const normalized = String(value ?? '').trim();
  return normalized.startsWith('v') ? normalized.slice(1) : normalized;
}

function normalizeNpmVersion(value) {
  return String(value ?? '').trim();
}

function classifyVersion(name, actual, expected) {
  if (!actual) return `${name}_VERSION_MISSING`;
  if (!VERSION_PATTERN.test(actual)) return `${name}_VERSION_INVALID`;
  if (actual !== expected) return `${name}_VERSION_MISMATCH`;
  return null;
}

function evaluateToolchain({ nodeVersion, npmVersion }) {
  const actualNode = normalizeNodeVersion(nodeVersion);
  const actualNpm = normalizeNpmVersion(npmVersion);
  const failures = [
    classifyVersion('NODE', actualNode, EXPECTED_NODE_VERSION),
    classifyVersion('NPM', actualNpm, EXPECTED_NPM_VERSION)
  ].filter(Boolean);

  return {
    ok: failures.length === 0,
    expected: {
      node: EXPECTED_NODE_VERSION,
      npm: EXPECTED_NPM_VERSION
    },
    actual: {
      node: actualNode,
      npm: actualNpm
    },
    failures
  };
}

function npmCliCandidates(nodeExecutable = process.execPath) {
  const nodeDirectory = path.dirname(nodeExecutable);
  return [
    path.join(nodeDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(nodeDirectory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ];
}

function detectNpmVersion({
  platform = process.platform,
  nodeExecutable = process.execPath,
  existsSync = fs.existsSync,
  spawnSyncImpl = spawnSync
} = {}) {
  let command = 'npm';
  let args = ['--version'];

  if (platform === 'win32') {
    const npmCli = npmCliCandidates(nodeExecutable).find((candidate) => existsSync(candidate));
    if (!npmCli) {
      return { ok: false, failure: 'NPM_EXECUTABLE_NOT_FOUND', version: '' };
    }
    command = nodeExecutable;
    args = [npmCli, '--version'];
  }

  const result = spawnSyncImpl(command, args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_update_notifier: 'false'
    },
    shell: false,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  if (result.error || result.status !== 0) {
    return { ok: false, failure: 'NPM_VERSION_DETECTION_FAILED', version: '' };
  }
  return { ok: true, failure: null, version: normalizeNpmVersion(result.stdout) };
}

function printableVersion(value) {
  return value || '<empty>';
}

function formatGuardOutput(result) {
  const summary = [
    `expected_node=${EXPECTED_NODE_VERSION}`,
    `actual_node=${printableVersion(result.actual.node)}`,
    `expected_npm=${EXPECTED_NPM_VERSION}`,
    `actual_npm=${printableVersion(result.actual.npm)}`
  ].join(' ');
  if (!result.ok) {
    return `TOOLCHAIN_GUARD_FAIL classes=${result.failures.join(',')} ${summary}`;
  }
  return `TOOLCHAIN_GUARD_OK ${summary}`;
}

function runGuard() {
  const detectedNpm = detectNpmVersion();
  const result = evaluateToolchain({
    nodeVersion: process.version,
    npmVersion: detectedNpm.version
  });
  if (!detectedNpm.ok) {
    result.failures.unshift(detectedNpm.failure);
    result.ok = false;
  }

  const output = `${formatGuardOutput(result)}\n`;
  if (!result.ok) {
    process.stderr.write(output);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(output);
}

module.exports = {
  EXPECTED_NODE_VERSION,
  EXPECTED_NPM_VERSION,
  detectNpmVersion,
  evaluateToolchain,
  formatGuardOutput,
  normalizeNodeVersion,
  normalizeNpmVersion,
  npmCliCandidates
};

if (require.main === module) runGuard();
