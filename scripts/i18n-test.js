const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { mailCopy, translateReleaseSubject, translateReleaseText } = require('../src/services/localization');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadBrowserScript(relativePath, windowObject = {}) {
  const context = {
    window: windowObject,
    document: {
      readyState: 'loading',
      addEventListener() {},
      documentElement: { nodeType: 1 },
      querySelectorAll() { return []; },
      createTreeWalker() { return { nextNode() { return null; } }; }
    },
    localStorage: windowObject.localStorage,
    CustomEvent: class CustomEvent {},
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 },
    MutationObserver: class MutationObserver {},
    URLSearchParams,
    console
  };
  context.globalThis = context;
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
  return context.window;
}

const localValues = new Map();
const i18nWindow = loadBrowserScript('public/i18n.js', {
  localStorage: {
    getItem(key) { return localValues.get(key) || null; },
    setItem(key, value) { localValues.set(key, String(value)); },
    removeItem(key) { localValues.delete(key); }
  },
  addEventListener() {},
  dispatchEvent() {},
  HTMLElement: class HTMLElement {},
  SVGElement: class SVGElement {}
});

const i18n = i18nWindow.WZ_I18N;
assert.ok(i18n, 'central browser i18n API must be exposed');
assert.deepEqual([...i18n.supported], ['de', 'en']);
assert.equal(i18n.language(), 'de', 'German must be the safe default');
for (const [key, entry] of Object.entries(i18n.messages)) {
  assert.ok(entry.de && entry.en, `${key} must contain de and en`);
  assert.notEqual(entry.de, key, `${key} must not expose a raw key in German`);
  assert.notEqual(entry.en, key, `${key} must not expose a raw key in English`);
}
i18n.setLanguage('en');
assert.equal(i18n.language(), 'en');
assert.equal(localValues.get('waschzeit-language'), 'en');
assert.equal(i18n.t('admin.inventoryTotal'), 'Equipment & rooms');
assert.equal(i18n.t('admin.rename'), 'Rename');
assert.equal(i18n.t('admin.block'), 'Block');
assert.equal(i18n.t('admin.onlyOneSuperadmin'), 'Only one superadmin is active. Grant additional superadmin rights to a trusted deputy in good time.');
assert.equal(i18n.translateVisibleText('Nur ein aktiver Superadmin. Gib einer vertrauenswuerdigen Stellvertretung rechtzeitig zusaetzliche Superadminrechte.'), 'Only one superadmin is active. Grant additional superadmin rights to a trusted deputy in good time.');
assert.equal(i18n.translateVisibleText('Bitte einen gueltigen Namen und Bereich waehlen.'), 'Choose a valid name and category.');
assert.equal(i18n.translateVisibleText('Freigabe erst nach einer erfolgreichen Funktionspruefung moeglich.'), 'The resource can only be released after a successful functional test.');
assert.equal(i18n.translateVisibleText('WM 1 wurde gesperrt und im Tagebuch erfasst.'), 'WM 1 was blocked and recorded in the logbook.');
i18n.setLanguage('unsupported');
assert.equal(i18n.language(), 'de', 'unsupported languages must fall back to German');

const introWindow = loadBrowserScript('public/intro-content.js', {});
const catalog = introWindow.WaschZeitIntroCatalog;
assert.ok(catalog, 'intro catalog must be exposed');
for (const role of ['resident', 'house_admin', 'superadmin']) {
  for (const language of ['de', 'en']) {
    const intro = catalog.get(role, language);
    assert.equal(intro.role, role);
    assert.equal(intro.language, language);
    assert.ok(intro.chapters.length >= 9, `${role}/${language} needs a complete chapter set`);
    let previousStart = -1;
    for (const chapter of intro.chapters) {
      assert.ok(chapter.title && chapter.description && chapter.caption && chapter.transcript);
      assert.equal(chapter.role, role);
      assert.equal(chapter.language, language);
      assert.ok(chapter.startTime > previousStart, `${role}/${language} starts must increase`);
      previousStart = chapter.startTime;
    }
  }
}
assert.equal(catalog.get('resident', 'fr').language, 'de', 'intro must safely fall back to German');

loadBrowserScript('public/intro-media.js', introWindow);
const mediaCatalog = introWindow.WaschZeitIntroMedia;
assert.ok(mediaCatalog, 'recorded media catalog must be exposed');
assert.equal(mediaCatalog.packages.length, 6, 'all role/language media packages must exist');
for (const role of ['resident', 'house_admin', 'superadmin']) {
  for (const language of ['de', 'en']) {
    const media = mediaCatalog.get(role, language);
    const intro = catalog.get(role, language);
    assert.equal(media.role, role);
    assert.equal(media.language, language);
    assert.equal(media.duration, intro.totalDuration);
    assert.equal(media.chapters, intro.chapters, `${role}/${language} must share chapter metadata`);
    assert.match(media.video, new RegExp(`${role.replace('_', '-')}-${language}\\.mp4$`));
    assert.match(media.captions, /\.vtt$/);
    assert.match(media.poster, /-poster\.png$/);
    assert.match(media.transcript, /\.txt$/);
  }
}

const indexHtml = read('public/index.html');
const loginHtml = read('public/login.html');
const appSource = read('public/app.js');
assert.ok(indexHtml.includes('/i18n.js?v=__WASCHZEIT_RELEASE__'));
assert.ok(indexHtml.includes('/intro-content.js?v=__WASCHZEIT_RELEASE__'));
assert.ok(indexHtml.includes('/intro-media.js?v=__WASCHZEIT_RELEASE__'));
assert.ok(indexHtml.includes('data-account-language'));
assert.ok(loginHtml.includes('data-local-language'));
assert.ok(appSource.includes("if (currentUser?.isSuperadmin) return 'superadmin'"));
assert.ok(appSource.includes("if (currentUser?.isHouseAdmin) return 'house_admin'"));
assert.ok(appSource.includes("data-intro-chapter"));
assert.ok(appSource.includes("aria-current"));
assert.ok(appSource.includes('jumpIntroVideoStep'));
for (const requiredAdminKey of [
  'admin.newIssueOne',
  'admin.inventoryTotal',
  'admin.invitationOpen',
  'admin.noLogCases',
  'admin.analyticsWindow',
  'admin.emergencyRule'
]) {
  assert.ok(appSource.includes(`'${requiredAdminKey}'`), `${requiredAdminKey} must be used by dynamic admin rendering`);
}
assert.ok(appSource.includes('maintenanceStatusLabel(maintenanceCase.status)'));
assert.ok(appSource.includes('weekdayLabel(booking.weekday)'));

assert.match(mailCopy('en', 'verifySubject'), /Confirm your email/);
assert.match(mailCopy('en', 'resetBody', { name: 'Alex', link: 'https://example.test' }), /one hour/);
assert.match(
  translateReleaseText('Alex hat WM 1 freigegeben. Der Slot ist heute bis 17:00 wieder frei.', 'en'),
  /Alex released WM 1 early/
);
assert.match(translateReleaseSubject('WaschZeit: WM 1 frei', 'en'), /available/);

console.log(`I18N-Test bestanden: ${Object.keys(i18n.messages).length} Schluessel, 6 Rollen-/Sprachfuehrungen.`);
