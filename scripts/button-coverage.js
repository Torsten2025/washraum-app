'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
function productFingerprint() {
  const hash = createHash('sha256');
  for (const file of ['public/app.js', 'public/i18n.js', 'public/index.html', 'public/styles.css', 'public/login.js', 'public/login.html', 'public/reset.js', 'public/reset.html']) {
    hash.update(file).update(fs.readFileSync(path.resolve(__dirname, '..', file)));
  }
  return hash.digest('hex');
}
// Evidence only. A recorded click is NOT by itself a functional assertion.
async function trackButtons(browser, name) {
  const fingerprint = productFingerprint();
  const entries = [];
  const original = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await original(...args);
    await context.exposeBinding('__recordButton', (_, item) => entries.push(item));
    await context.addInitScript(() => {
      document.addEventListener('click', event => {
        const node = event.target.closest('button, summary, a.button-link');
        if (!node) return;
        let role = 'anonymous';
        try { if (typeof currentUser !== 'undefined' && currentUser) role = currentUser.isSuperadmin ? 'superadmin' : currentUser.isHouseAdmin ? 'houseadmin' : 'resident'; } catch {}
        window.__recordButton({ role, page: location.pathname, id: node.id, form: node.closest('form')?.id || '',
          text: node.textContent.trim(), trusted: event.isTrusted,
          key: node.dataset.i18n || node.dataset.adminTarget || node.dataset.settingsTarget || '',
          visibleIds: [...document.querySelectorAll('button[id]')].filter(e => e.checkVisibility()).map(e => ({ id: e.id, disabled: e.disabled })) });
      }, true);
    });
    return context;
  };
  return () => {
    const directory = path.resolve(__dirname, '..', 'artifacts', 'button-audit');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, `${name}-clicks.json`), JSON.stringify({ productFingerprint: fingerprint, clicks: entries }, null, 2));
  };
}
module.exports = { trackButtons, productFingerprint };
