const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const pages = ['login.html', 'index.html', 'reset.html', 'privacy.html'];

for (const page of pages) {
  const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
  assert.match(html, /<html lang="de">/, `${page}: Seitensprache fehlt`);
  assert.match(html, /<main[\s>]/, `${page}: main-Region fehlt`);
  assert.match(html, /<h1[\s>]/, `${page}: Hauptueberschrift fehlt`);
  if (['login.html', 'index.html', 'privacy.html'].includes(page)) {
    assert.match(html, /rel="manifest"/, `${page}: PWA-Manifest fehlt`);
    assert.match(html, /name="theme-color"/, `${page}: Theme-Farbe fehlt`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: doppelte id gefunden`);
  for (const image of html.match(/<img\b[^>]*>/g) || []) {
    assert.match(image, /\salt="[^"]*"/, `${page}: Bild ohne alt-Attribut`);
  }
}

const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
assert.match(indexHtml, /<track kind="captions"/, 'Video ohne Untertitelspur');
assert.match(indexHtml, /aria-modal="true"/, 'Dialog ohne modalen Status');
assert.match(indexHtml, /aria-label="Kalenderansicht"/, 'Kalenderansicht ohne Beschriftung');
assert.match(indexHtml, /id="calendarDayDetails"[^>]*aria-labelledby="calendarDayDetailsTitle"[^>]*aria-live="polite"/, 'Tagesdetails ohne zug\u00e4nglichen Namen oder Live-Status');
assert.match(indexHtml, /id="calendarDayDetailsClose"[^>]*aria-label=/, 'Tagesdetails ohne beschriftete Schlie\u00dfen-Aktion');
assert.match(indexHtml, /id="weekViewButton"[^>]*aria-pressed="true"/, 'Wochenansicht ohne Status');
assert.match(indexHtml, /id="monthViewButton"[^>]*aria-pressed="false"/, 'Monatsansicht ohne Status');
assert.match(indexHtml, /id="bookingFlowSteps"[^>]*aria-label="Buchungsschritte"/, 'Buchungsschritte ohne Beschriftung');
assert.match(indexHtml, /class="booking-mode-switch"[^>]*role="group"[^>]*aria-label="Buchungsweg"/, 'Buchungsweg ohne Gruppenbeschriftung');
assert.match(indexHtml, /id="bookingFlowContent"[^>]*aria-live="polite"/, 'Buchungsstatus ohne Live-Region');
assert.match(indexHtml, /id="bookingDate"[^>]*aria-label="Buchungsdatum"/, 'Buchungsdatum ohne Beschriftung');
assert.match(indexHtml, /id="installTitle"/, 'Installationshinweis fuer PWA fehlt');
assert.match(indexHtml, /id="installHelpText"/, 'Installationshilfe ohne Status-Text');
const styles = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
assert.match(styles, /prefers-reduced-motion:\s*reduce/, 'Reduzierte Bewegung wird nicht beruecksichtigt');
assert.match(styles, /:focus-visible/, 'Sichtbarer Tastaturfokus fehlt');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.display, 'standalone', 'PWA-Manifest ist nicht installierbar');
assert.ok(manifest.icons?.some((icon) => icon.src === '/assets/app-icon.svg'), 'PWA-App-Icon fehlt');
const serviceWorker = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
assert.match(serviceWorker, /showNotification/, 'Service Worker zeigt keine Push-Benachrichtigung');

console.log(JSON.stringify({ ok: true, pages, checks: ['structure', 'uniqueIds', 'imageAlternatives', 'captions', 'reducedMotion', 'keyboardFocus', 'pwa'] }));
