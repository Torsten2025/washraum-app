const { spawnSync } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  { id: 'AUD-01', title: 'Syntax und statische JavaScript-Pruefung', args: ['run', 'verify'] },
  { id: 'AUD-02', title: 'Sicherheit, Sitzungen und Anmeldeverfahren', args: ['run', 'test:security'] },
  { id: 'AUD-03', title: 'API, Buchungen, Konten, Meldungen, E-Mail, Push und Betrieb', args: ['test'] },
  { id: 'AUD-04', title: 'Rollenmatrix und Hausisolation', args: ['run', 'test:roles'] },
  { id: 'AUD-05', title: 'Jahres- und Lastsimulation', args: ['run', 'test:year'] },
  { id: 'AUD-06', title: 'Barrierefreiheit und PWA-Struktur', args: ['run', 'test:a11y'] },
  { id: 'AUD-07', title: 'Externe Backup-Kopie und Wiederherstellungsprobe', args: ['run', 'test:backup'] },
  { id: 'AUD-08', title: 'Verbindlicher Browser- und visueller Regressionstest', args: ['run', 'test:e2e'] }
];

const results = [];
console.log('WaschZeit Gesamtaudit');
console.log('=====================');

for (const step of steps) {
  console.log(`\n[START] ${step.id} ${step.title}`);
  const startedAt = Date.now();
  const result = spawnSync(npmCommand, step.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 20 * 1024 * 1024
  });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`;
  if (output.trim()) console.log(output.trim());
  const status = result.status === 0 ? 'PASS' : 'FAIL';
  const durationMs = Date.now() - startedAt;
  results.push({ id: step.id, title: step.title, status, durationMs });
  console.log(`[${status}] ${step.id} (${(durationMs / 1000).toFixed(1)} s)`);
  if (status === 'FAIL') break;
}

const summary = {
  ok: !results.some((result) => result.status === 'FAIL'),
  suite: 'full-audit',
  executed: results.length,
  passed: results.filter((result) => result.status === 'PASS').length,
  skipped: results.filter((result) => result.status === 'SKIP').length,
  failed: results.filter((result) => result.status === 'FAIL').length,
  durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
  results
};

console.log('\nGesamtergebnis');
console.log('--------------');
console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
