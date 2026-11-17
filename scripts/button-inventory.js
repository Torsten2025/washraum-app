'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'artifacts', 'button-audit');
const productFingerprint = require('./button-coverage').productFingerprint();
const ignoredStaleEvidence = [];
let clicks = [];
for (const name of ['e2e-clicks.json', 'emailfree-clicks.json', 'results.json']) {
  const file = path.join(directory, name);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if ((data.productFingerprint || data.candidate?.productFingerprint) !== productFingerprint) {
    ignoredStaleEvidence.push(name); continue;
  }
  clicks.push(...(Array.isArray(data) ? data : data.clicks));
}
const buttons = [];
for (const page of ['index.html', 'login.html', 'reset.html', 'privacy.html']) {
  const source = fs.readFileSync(path.join(root, 'public', page), 'utf8');
  for (const match of source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const id = /\bid="([^"]+)"/.exec(match[1])?.[1];
    if (!id) continue;
    const events = clicks.filter(event => event.id === id && event.page === `/${page}` && event.trusted);
    buttons.push({ page, id, text: match[2].replace(/<[^>]+>/g, '').trim(),
      clickedRoles: [...new Set(events.map(e => e.role))], clicks: events.length });
  }
}
const missing = buttons.filter(button => !button.clicks);
const exclusions = [{ page: 'index.html', id: 'openMaintenanceAdminButton', reason: 'Unreachable: applyMaintenanceStatus hides the maintenance overlay for admins and hides this button for residents.' }];
const uncovered = missing.filter(button => !exclusions.some(item => item.page === button.page && item.id === button.id));
const report = { note: 'Click coverage only, not proof of semantic assertions. Dynamic/form buttons additionally require the scenario matrix.',
  productFingerprint, ignoredStaleEvidence, exclusions, buttons, missing, uncovered, tracedClicks: clicks.length };
fs.writeFileSync(path.join(directory, 'button-inventory.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ totalStaticIds: buttons.length, missing: report.missing.map(b => b.id), tracedClicks: clicks.length }, null, 2));
if (uncovered.length) {
  console.error('Uncovered current-candidate buttons; run the full check to refresh all traces:', uncovered.map(b => `${b.page}#${b.id}`).join(', '));
  process.exitCode = 1;
}
