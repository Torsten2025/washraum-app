'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');

async function runFixedSeriesStartChecks(page) {
  const results = await page.evaluate(() => {
    const NativeDate = Date;
    let now = 0;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    };
    const rows = [];
    try {
      slots = ['07:00-12:00', '12:00-17:00', '17:00-21:00'];
      houseSelect.disabled = false;
      adminApartmentDirectory = [];
      for (const mode of ['gbmz', 'liberal']) {
        currentBookingRuleMode = mode;
        for (const [date, offset] of [['2026-10-05', '+02:00'], ['2026-03-30', '+02:00'], ['2026-10-26', '+01:00'], ['2027-01-04', '+01:00']]) {
          for (const time of ['06:59:59', '07:00:00', '07:00:01', '11:59:59', '12:00:00']) {
            now = NativeDate.parse(`${date}T${time}${offset}`);
            populateFixedBookingControls([{ id: 71, name: 'Synthetic washer', type: 'washer', active: 1 }]);
            fixedBookingLabel.value = 'Start boundary';
            fixedBookingWeekday.value = '1';
            fixedBookingStart.value = date;
            fixedBookingInterval.value = '2';
            fixedBookingEndType.value = 'count';
            fixedBookingCount.value = '2';
            const valid = syncFixedRecurrence();
            const disabled = fixedBookingSubmit.disabled;
            const normalPast = isPastSlot(date, '07:00-12:00');
            fixedBookingWeekday.value = '2';
            rows.push({ mode, date, time, valid, disabled, normalPast, futureWeekdayValid: syncFixedRecurrence() });
          }
        }
      }
    } finally { window.Date = NativeDate; }
    return rows;
  });
  for (const row of results) {
    assert.equal(row.valid, row.time < '07:00:00', `Series first BEGIN ${JSON.stringify(row)}`);
    assert.equal(row.disabled, !row.valid);
    assert.equal(row.normalPast, row.time >= '12:00:00', 'Normal-booking END semantics remain unchanged');
    assert(row.futureWeekdayValid, 'Today as lower bound permits a future first selected weekday');
  }
  return results.length;
}

async function runFixedSeriesFeedbackChecks(page, evidence, locale) {
  // Actual markup/handlers with explicit transport/read-error mocks; real POST/DB coverage is separate.
  for (const outcome of ['success', 'admin-refresh', 'bookings-refresh', 'post-error', 'network', 'old-house']) {
    let release;
    let requests = 0;
    const hold = new Promise(resolve => { release = resolve; });
    await page.evaluate(outcome => {
      document.querySelectorAll('[data-admin-section]').forEach(e => { e.hidden = e.dataset.adminSection !== 'fixed'; });
      document.querySelector('#adminSectionFixed details').open = true;
      houseSelect.disabled = false;
      slots = ['07:00-12:00', '12:00-17:00', '17:00-21:00'];
      delete window.finishSeriesRead;
      currentBookingRuleMode = outcome === 'success' ? 'liberal' : 'gbmz';
      fixedBookingWeekday.querySelector('[data-liberal-weekday]').hidden = currentBookingRuleMode !== 'liberal';
      adminApartmentDirectory = [];
      populateFixedBookingControls([{ id: 71, name: 'Synthetic washer', type: 'washer', active: 1 }]);
      fixedBookingLabel.value = 'Synthetic series feedback';
      fixedBookingWeekday.value = '1';
      fixedBookingStart.value = '2099-10-05';
      fixedBookingInterval.value = '3';
      fixedBookingEndType.value = 'count';
      fixedBookingCount.value = '3';
      syncFixedRecurrence();
      loadAdmin = async () => {
        if (outcome === 'admin-refresh') throw new Error('Synthetic admin GET failure');
        populateFixedBookingControls([{ id: 71, name: 'Synthetic washer', type: 'washer', active: 1 }]);
      };
      loadBookings = async () => {
        if (outcome === 'bookings-refresh') throw new Error('Synthetic bookings GET failure');
        if (outcome === 'admin-refresh') await new Promise(resolve => { window.finishSeriesRead = resolve; });
      };
    }, outcome);
    if (outcome === 'success') await page.selectOption('#fixedBookingWeekday', '0');
    await page.route('**/api/admin/fixed-bookings', async route => {
      assert.equal(route.request().postDataJSON().weekday, outcome === 'success' ? 0 : 1);
      requests += 1;
      await hold;
      if (outcome === 'network') return route.abort('failed');
      await route.fulfill({ status: outcome === 'post-error' ? 409 : 201,
        json: outcome === 'post-error' ? { error: 'Synthetic save conflict' } : { message: 'Dauerpaket gespeichert.' } });
    });
    await page.locator('#fixedBookingSubmit').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => fixedBookingPending);
    await page.waitForTimeout(120);
    await page.keyboard.press('Enter');
    await page.evaluate(() => { syncFixedRecurrence(); void createFixedBooking(); });
    assert(await page.locator('#fixedBookingSubmit').isDisabled(), 'Recurrence sync must not unlock a pending save');
    assert.match(await page.locator('#fixedBookingActionStatus').innerText(), locale === 'de' ? /wird gespeichert/ : /Saving series/);
    if (outcome === 'old-house') {
      await page.evaluate(() => {
        houseContextRevision += 1;
        fixedBookingActionStatus.textContent = 'New house status';
        showStatus('New house status');
        fixedBookingLabel.value = 'New house draft';
        populateFixedBookingControls([{ id: 72, name: 'Other house washer', type: 'washer', active: 1 }]);
      });
    }
    release();
    if (outcome === 'admin-refresh') {
      await page.waitForFunction(() => typeof window.finishSeriesRead === 'function');
      assert(await page.locator('#fixedBookingSubmit').isDisabled(), 'Lock covers the second, still pending read');
      assert.match(await page.locator('#fixedBookingActionStatus').innerText(), locale === 'de' ? /gespeichert/ : /saved/i);
      await page.evaluate(() => window.finishSeriesRead());
    }
    await page.waitForFunction(() => !fixedBookingPending);
    assert.equal(requests, 1, 'Repeated keyboard/direct submission must issue one POST');
    assert.equal(await page.locator('#fixedBookingForm').getAttribute('aria-busy'), 'false');
    const feedback = await page.locator('#fixedBookingActionStatus').innerText();
    if (outcome === 'old-house') {
      assert.equal(feedback, 'New house status');
      assert.equal(await page.locator('#statusText').innerText(), 'New house status');
      assert.equal(await page.locator('#fixedBookingLabel').inputValue(), 'New house draft');
      assert.equal(await page.locator('#fixedBookingWasher').inputValue(), '72');
    } else if (outcome === 'post-error' || outcome === 'network') {
      assert.doesNotMatch(feedback, /gespeichert|saved/i);
      assert(await page.locator('#fixedBookingSubmit').isEnabled(), 'First request error is retryable');
      assert.equal(await page.locator('#fixedBookingLabel').inputValue(), 'Synthetic series feedback');
      assert.equal(await page.locator('#fixedBookingStart').inputValue(), '2099-10-05');
      assert(await page.locator('#fixedBookingCountWrap').isVisible());
      await page.evaluate(() => createFixedBooking());
      assert.equal(requests, 2, 'A deliberate retry after the first failure is sent');
      assert.equal(await page.evaluate(() => fixedBookingPending), false);
    } else {
      assert.match(feedback, locale === 'de' ? /gespeichert/ : /saved/i);
      if (outcome.endsWith('refresh')) assert.match(feedback, locale === 'de' ? /Ansichten.*nicht aktualisiert.*nicht erneut/ : /views.*not.*refreshed.*not create/i);
      assert.equal(await page.locator('#fixedBookingLabel').inputValue(), '');
      assert.equal(await page.locator('#fixedBookingStart').inputValue(), await page.evaluate(() => todayString()));
      assert.equal(await page.locator('#fixedBookingEndType').inputValue(), 'never');
      assert.equal(await page.locator('#fixedBookingWeekday').inputValue(), '1', 'Reset uses Monday in GBMZ and Liberal');
      assert(await page.locator('#fixedBookingCountWrap').isHidden());
      assert(await page.locator('#fixedBookingEndDateWrap').isHidden());
      assert.doesNotMatch(await page.locator('#fixedBookingPreview').innerText(), /2099/);
      assert.equal(await page.locator('#fixedBookingSubmit').isDisabled(), await page.evaluate(() => !syncFixedRecurrence() || !fixedBookingWasher.value));
    }
    await page.locator('#fixedBookingActionStatus').scrollIntoViewIfNeeded();
    await page.locator('#fixedBookingActionStatus').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: path.join(evidence, `${locale}-series-${outcome}.png`) });
    assert(await page.locator('#fixedBookingActionStatus').evaluate(e => {
      const r = e.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.width > 0 && e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    }), `Series feedback is actually painted and reachable: ${locale}/${outcome}, ${evidence}`);
    await page.unroute('**/api/admin/fixed-bookings');
  }
  await page.evaluate(async () => {
    const request = api;
    try {
      api = async () => null; // Existing API contract after its 401 redirect.
      fixedBookingStart.value = '2099-10-05';
      fixedBookingLabel.value = 'Session draft';
      await createFixedBooking();
    } finally { api = request; }
  });
  assert.equal(await page.evaluate(() => fixedBookingPending), false);
  assert.match(await page.locator('#fixedBookingActionStatus').innerText(), locale === 'de' ? /Sitzung.*beendet/ : /session.*ended/i);
  assert.equal(await page.locator('#fixedBookingLabel').inputValue(), 'Session draft');
  await page.evaluate(() => { loadAdmin = async () => {}; loadBookings = async () => {}; });
}

async function runUiFeedbackRegression({ reproduce = false, baseline = false } = {}) {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium']
    .find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'waschzeit-ui-feedback-'));
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1048, height: 900 } });
    // Real markup/styles/functions; deterministic synthetic data and no server mutations.
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://ui.synthetic') return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
      const file = path.resolve(root, 'public', '.' + url.pathname);
      if (!file.startsWith(path.join(root, 'public') + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      const ext = path.extname(file);
      let body = baseline && ['.html', '.js', '.css'].includes(ext)
        ? execFileSync('git', ['show', `b82fcbaba079264dfb15bb0e9013798f28d0de55:public${url.pathname}`], { cwd: root }) : fs.readFileSync(file);
      if (ext === '.js' && path.basename(file) === 'app.js') {
        body = body.toString().replace(/init\(\)\.catch\(\(error\) => \{[\s\S]*?\}\);\s*$/, '');
      }
      await route.fulfill({ body, contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[ext] || 'application/octet-stream' });
    });
    await page.goto('http://ui.synthetic/index.html');
    await page.waitForFunction(() => typeof renderAdminUsers === 'function');
    for (const locale of ['de', 'en']) {
      await page.evaluate(locale => {
        currentUser = { id: 1, isSuperadmin: true, isAdmin: true, canManage: true, canBook: true, houseId: 1 };
        availableHouses = [{ id: 1, name: 'Quellhaus' }, { id: 2, name: 'Zielhaus mit sehr langer synthetischer Adresse und Hausnummer 999' }];
        adminIntegrationState.backup = true;
        loadAdmin = async () => {};
        i18n.setLanguage(locale, { persist: false });
        document.body.classList.add('admin-view');
        adminBox.hidden = false;
        document.querySelector('.app-wordmark').textContent = 'WaschZeit';
        viewSwitcher.hidden = false;
        houseSwitcher.hidden = false;
        reportIssueButton.hidden = false;
        houseSelect.innerHTML = '<option>Haus mit einer langen synthetischen Adresse 999</option>';
        accountMenuName.textContent = 'Synthetisches sehr langes Administratorkonto';
        document.querySelectorAll('[data-admin-section]').forEach(e => { e.hidden = e.dataset.adminSection !== 'system'; });
        showStatus('Synthetic admin result');
      }, locale);
      const statusVisible = await page.locator('#statusText').isVisible();
      results.push({ locale, statusVisible });
      if (!reproduce) {
        assert(statusVisible, 'BUG-BACKUP-002: admin status must be visible');
        assert(await page.locator('#statusText').evaluate(e => {
          const r = e.getBoundingClientRect();
          return e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }), 'Admin status must actually be painted, not covered');
      }
      await page.screenshot({ path: path.join(evidence, `${locale}-admin-status.png`) });

      // Actual handlers with deferred network result: pending/success/error/maintenance.
      for (const outcome of ['success', 'error', 'maintenance', 'network', 'refresh']) {
        let release;
        let requests = 0;
        const successful = outcome === 'success' || outcome === 'refresh';
        await page.evaluate(fail => { loadAdmin = async () => { if (fail) throw new Error('Synthetic refresh failure'); }; }, outcome === 'refresh');
        const hold = new Promise(resolve => { release = resolve; });
        await page.route('**/api/admin/backup/run', async route => {
          requests += 1;
          await hold;
          if (outcome === 'network') return route.abort('failed');
          await route.fulfill({ status: successful ? 200 : outcome === 'maintenance' ? 503 : 500,
            json: successful ? { status: { ok: true, createdAt: '2026-09-06T10:00:00.000Z' }, message: 'Backup wurde erstellt und geprüft.' }
              : { code: outcome === 'maintenance' ? 'MAINTENANCE_MODE' : 'BACKUP_FAILED', error: outcome === 'maintenance' ? 'Maintenance active' : 'Synthetic backup failure', maintenance: { active: true } } });
        });
        await page.locator('#runBackupButton').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => runBackupButton.disabled);
        const pending = await page.locator('#backupActionStatus').count()
          ? await page.locator('#backupActionStatus').isVisible() && /erstellt|Creating/i.test(await page.locator('#backupActionStatus').innerText()) : false;
        if (!reproduce) assert(pending, 'Pending backup must be visibly described');
        if (!baseline) await page.evaluate(() => runBackupNow());
        release();
        await page.waitForFunction(() => !runBackupButton.disabled);
        if (!reproduce) {
          assert.equal(requests, 1, 'Pending backup must not start a second request');
          assert(await page.locator('#backupActionStatus').isVisible());
          assert(await page.locator('#statusText').isVisible());
          const text = await page.locator('#backupActionStatus').innerText();
          assert.match(text, successful ? /2026/ : outcome === 'network' ? /Verbindung|connect|network/i : locale === 'en' ? /request could not be completed|Maintenance active/ : outcome === 'maintenance' ? /Maintenance active/ : /Synthetic backup failure/);
          if (outcome === 'refresh') {
            assert.match(text, locale === 'de' ? /Verwaltungsansicht.*nicht.*geladen/ : /admin view.*not.*reload/i);
            assert.match(await page.locator('#backupLastStatus').innerText(), /2026/);
          }
          await page.locator('#backupActionStatus').scrollIntoViewIfNeeded();
          assert(await page.locator('#backupActionStatus').evaluate(e => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          }), 'Inline backup result must be visible and not covered');
        }
        await page.unroute('**/api/admin/backup/run');
      }
      await page.evaluate(() => { loadAdmin = async () => {}; });
      await page.evaluate(() => {
        document.querySelectorAll('[data-admin-section]').forEach(e => { e.hidden = e.dataset.adminSection !== 'people'; });
        renderAdminUsers([
          { id: 2, username: 'synthetic-bound', apartment_label: 'Wohnung mit sehr langer synthetischer Bezeichnung 101', is_resident: 1, active: 1, house_id: 1 },
          { id: 3, username: 'synthetic-unbound', is_resident: 0, active: 1, house_id: 1 }
        ]);
      });
      const bound = page.locator('.user-admin-item').nth(0);
      const offeredForBound = await bound.locator('.user-move-control select').count();
      results.push({ locale, offeredForBound });
      if (!reproduce) {
        assert.equal(offeredForBound, 0);
        assert(await bound.locator('.user-move-note').isVisible());
        assert.equal(await page.locator('.user-admin-item').nth(1).locator('.user-move-control select').count(), 1);
        const unbound = page.locator('.user-admin-item').nth(1);
        assert(await unbound.locator('.user-move-control label').isVisible());
        let confirmed = false;
        page.once('dialog', async dialog => {
          assert.match(dialog.message(), /Zielhaus mit sehr langer/);
          assert.match(dialog.message(), locale === 'de' ? /Adminrechte.*Sitzungen/s : /admin rights.*sessions/s);
          confirmed = true;
          await dialog.dismiss();
        });
        await unbound.locator('.user-move-control button').focus();
        await page.keyboard.press('Enter');
        assert(confirmed);
        let moves = 0;
        await page.route('**/api/admin/users/3/house', async route => {
          assert.equal(route.request().method(), 'PUT');
          assert.deepEqual(route.request().postDataJSON(), { houseId: 2 });
          moves += 1;
          await route.fulfill({ json: { message: 'Synthetic move completed' } });
        });
        page.once('dialog', dialog => dialog.accept());
        await unbound.locator('.user-move-control button').click();
        await page.waitForFunction(() => statusText.textContent === 'Synthetic move completed');
        assert.equal(moves, 1);
        assert(await page.locator('#statusText').isVisible());
        await page.unroute('**/api/admin/users/3/house');
      }
      if (!reproduce && !baseline) {
        await page.setViewportSize({ width: locale === 'en' ? 320 : 390, height: 900 });
        results.push({ locale, section: 'series-start-boundary', cases: await runFixedSeriesStartChecks(page), status: 'PASS' });
        await runFixedSeriesFeedbackChecks(page, evidence, locale);
        results.push({ locale, section: 'series-feedback', scenarios: 7, status: 'PASS' });
      }
      for (const width of [320, 390, 760, 768, 1024, 1048, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const section of ['people', 'house']) {
          await page.evaluate(section => {
            document.body.classList.add('admin-view');
            document.querySelectorAll('[data-admin-section]').forEach(e => { e.hidden = e.dataset.adminSection !== section; });
            renderAdminResources([{ id: 10, name: 'Waschmaschine mit besonders langer synthetischer Ressourcenbezeichnung', type: 'washer', active: 1 }]);
          }, section);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          const outside = await page.locator('.topbar button, .topbar select, [data-admin-section]:not([hidden]) button, [data-admin-section]:not([hidden]) select').evaluateAll(elements => elements.filter(e => {
            const r = e.getBoundingClientRect();
            return e.checkVisibility() && r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
          }).map(e => ({ id: e.id, class: e.className, text: e.textContent.slice(0, 80), right: e.getBoundingClientRect().right, parent: e.parentElement.className })));
          results.push({ locale, width, section, overflow, outside });
          if (!reproduce) assert(overflow <= 1, `${section}/${locale}/${width}: page overflow ${overflow}`);
          if (!reproduce) assert.deepEqual(outside, [], `${section}/${locale}/${width}: clipped actions`);
          await page.screenshot({ path: path.join(evidence, `${locale}-${section}-${width}.png`) });
        }
        await page.evaluate(() => {
          document.body.classList.remove('admin-view');
          const types = Object.fromEntries(calendarResourceTypes.map(({ type }, n) => [type, { total: 3, free: 1, resources: [
            { resourceId: n * 3 + 1, resourceName: 'Ressourcenname'.repeat(8), state: 'booked', ownerDisplayName: 'Familienname'.repeat(12) },
            { resourceId: n * 3 + 2, resourceName: 'Eigene Ressource', state: 'own' },
            { resourceId: n * 3 + 3, resourceName: 'Freie Ressource', state: 'free' }
          ] }]));
          calendarDays = [{ date: '2099-09-07', closed: false, ownByType: { washer: 0 }, slotDetails: ['07:00-12:00', '12:00-17:00', '17:00-22:00'].map(slot => ({ slot, past: false, types })) }];
          openCalendarPreview(calendarDays[0], document.querySelector('#bookingViewButton'), { pinned: true });
        });
        await page.waitForTimeout(220);
        const bounds = await page.locator('#calendarDayDetails').evaluate(e => ({ left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right,
          contentOverflow: document.querySelector('#calendarDayDetailsContent').scrollWidth - document.querySelector('#calendarDayDetailsContent').clientWidth,
          width: innerWidth }));
        results.push({ locale, width, section: 'day', ...bounds });
        if (!reproduce) {
          assert(bounds.left >= 0 && bounds.right <= width + 1, `day outside viewport ${JSON.stringify(bounds)}`);
          assert(bounds.contentOverflow <= 1, `day content clips ${JSON.stringify(bounds)}`);
          for (const button of await page.locator('#calendarDayDetails button').all()) {
            await button.focus();
            const box = await button.boundingBox();
            assert(box && box.x >= 0 && box.x + box.width <= width + 1, 'Focused day action must be reachable');
          }
        }
        await page.screenshot({ path: path.join(evidence, `${locale}-day-${width}.png`) });
        if (!reproduce && width === 1440) {
          for (const resizedWidth of [1024, 760, 390, 768, 1440]) {
            await page.setViewportSize({ width: resizedWidth, height: 700 });
            await page.waitForTimeout(100);
            const r = await page.locator('#calendarDayDetails').boundingBox();
            assert(r && r.x >= 0 && r.x + r.width <= resizedWidth + 1, `Open day dialog must follow resize ${resizedWidth}: ${JSON.stringify(r)}`);
          }
        }
        await page.evaluate(() => closeCalendarPreview());
      }
    }
    console.log(JSON.stringify({ suite: 'ui-feedback-regression', reproduce, baseline, results, evidence }));
    return { evidence, checks: results.length };
  } finally { await browser.close(); }
}
module.exports = { runUiFeedbackRegression };
if (require.main === module) runUiFeedbackRegression({ reproduce: process.argv.includes('--reproduce'), baseline: process.argv.includes('--baseline') }).catch(error => { console.error(error); process.exitCode = 1; });
