'use strict';
const assert = require('node:assert/strict');
const { buildPuzzle, publicModule } = require('../src/routes/diaper-game');

// Fixture-controlled puzzles in the caller's disposable database only. All
// answers and completion still pass through the real local game endpoints.
module.exports = async function testGameButtons(page, db, userId) {
  const families = new Map();
  for (let seed = 0; seed < 100 && families.size < 8; seed++) {
    for (const module of buildPuzzle(`button-audit-${seed}`).modules) families.set(module.type, module);
  }
  assert.equal(families.size, 8);
  let puzzle;
  await page.route('**/api/diaper-game/start', async route => {
    const response = await route.fetch(); const data = await response.json();
    assert.equal(response.status(), 201);
    db.prepare('UPDATE diaper_game_rounds SET puzzle_json=? WHERE user_id=? AND completed_at_ms IS NULL').run(JSON.stringify(puzzle), userId);
    await route.fulfill({ response, json: { ...data, modules: puzzle.modules.map(publicModule), incident: puzzle.incident } });
  });
  await page.locator('#accountMenuButton').click(); await page.locator('#openDiaperGameButton').click();
  await page.locator('#diaperSoundButton').click(); await page.locator('#diaperSoundButton').click();
  for (const [round, types] of [['ranked', ['wire', 'code', 'locks', 'temperature']], ['practice', ['signal', 'leak', 'circuit', 'valve']]]) {
    puzzle = { modules: types.map(type => families.get(type)), incident: { type: 'baby-kick', afterModule: 2 } };
    await page.locator(round === 'ranked' ? '#rankedDiaperModeButton' : '#practiceDiaperModeButton').click();
    await page.locator('#startDiaperGameButton').click();
    for (const [index, module] of puzzle.modules.entries()) {
      await page.locator(`[data-game-module="${module.type}"]`).waitFor({ state: 'visible' });
      if (module.type === 'wire') await page.locator(`[data-wire-id="${module.targetId}"]`).click();
      if (module.type === 'code') {
        for (let digit = 1; digit <= 9; digit++) {
          await page.locator(`[data-code-digit="${digit}"]`).click(); await page.locator('[data-code-delete]').click();
        }
        assert.equal(await page.locator('[data-code-display]').innerText(), '·'.repeat(module.answer.length));
        for (const digit of module.answer) await page.locator(`[data-code-digit="${digit}"]`).click();
        await page.locator('[data-code-confirm]').click();
      }
      if (module.type === 'locks') {
        for (let ring = 0; ring < 3; ring++) {
          await page.locator(`[data-lock-turn="-1"][data-lock-index="${ring}"]`).click();
          assert.equal(await page.locator(`[data-lock-value="${ring}"]`).innerText(), '8');
          await page.locator(`[data-lock-turn="1"][data-lock-index="${ring}"]`).click();
          for (let turn = 0; turn < module.targets[ring]; turn++) await page.locator(`[data-lock-turn="1"][data-lock-index="${ring}"]`).click();
        }
        await page.locator('[data-lock-confirm]').click();
      }
      if (module.type === 'temperature') {
        const queue = [{ value: module.start, path: [] }], seen = new Set(); let solution;
        while (queue.length) {
          const item = queue.shift();
          if (item.value === module.target) { solution = item.path; break; }
          if (seen.has(item.value) || item.path.length > 7) continue;
          seen.add(item.value);
          for (const delta of module.steps) queue.push({ value: item.value + delta, path: [...item.path, delta] });
        }
        assert(solution);
        for (const delta of solution) await page.locator(`[data-temperature-step="${delta}"]`).click();
        await page.locator('[data-temperature-confirm]').click();
      }
      if (module.type === 'signal') for (const signal of module.sequence) await page.locator(`[data-signal-id="${signal}"]`).click();
      if (module.type === 'leak') await page.locator(`[data-leak-zone="${module.leakZone}"]`).click();
      if (module.type === 'circuit') for (const node of module.path) await page.locator(`[data-circuit-node="${node}"]`).click();
      if (module.type === 'valve') {
        const valve = page.locator('.diaper-valve-lock');
        await valve.scrollIntoViewIfNeeded();
        const button = await valve.boundingBox();
        await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
        await page.waitForFunction(() => {
          const safe = document.querySelector('.valve-safe').getBoundingClientRect();
          const needle = document.querySelector('.valve-needle').getBoundingClientRect();
          return needle.left > safe.left + safe.width * 0.35 && needle.right < safe.right - safe.width * 0.35;
        }, null, { polling: 'raf' });
        await page.mouse.down(); await page.mouse.up();
      }
      await page.waitForFunction(expected => document.querySelectorAll('.diaper-step-rail .is-complete').length >= expected, index + 1);
      assert.equal(db.prepare('SELECT progress FROM diaper_game_rounds WHERE user_id=? ORDER BY id DESC LIMIT 1').get(userId).progress, index + 1);
    }
    const final = page.locator('.diaper-final-cut'); await final.waitFor({ state: 'visible' });
    const box = await final.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(1100); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('#diaperGameStage').dataset.mood === 'happy');
    assert(db.prepare('SELECT completed_at_ms FROM diaper_game_rounds WHERE user_id=? ORDER BY id DESC LIMIT 1').get(userId).completed_at_ms);
  }
  const removal = page.waitForResponse(r => r.url().endsWith('/api/diaper-game/score') && r.request().method() === 'DELETE');
  await page.locator('#resetDiaperBestButton').click(); assert.equal((await removal).status(), 200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM diaper_game_challenge_scores WHERE user_id=?').get(userId).n, 0);
  await page.locator('#closeDiaperGameButton').click();
  await page.unroute('**/api/diaper-game/start');
};
