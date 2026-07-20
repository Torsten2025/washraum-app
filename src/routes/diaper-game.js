const crypto = require('crypto');
const express = require('express');

function createDiaperGameRouter({ db, requireAuth, tokenHash }) {
  const router = express.Router();

  function diaperGameLeaderboard(userId) {
    const rows = db.prepare(`
      SELECT s.user_id, s.best_time_ms, s.achieved_at
      FROM diaper_game_scores s
      JOIN users u ON u.id = s.user_id AND u.active = 1
      ORDER BY s.best_time_ms ASC, s.achieved_at ASC, s.user_id ASC
      LIMIT 10
    `).all();
    const own = db.prepare(`
      SELECT s.user_id, s.best_time_ms, s.achieved_at
      FROM diaper_game_scores s
      JOIN users u ON u.id = s.user_id AND u.active = 1
      WHERE s.user_id = ?
    `).get(userId);
    const formatScore = (score, position = null) => ({
      position,
      player: `Wickelprofi #${score.user_id}`,
      timeMs: score.best_time_ms,
      achievedAt: score.achieved_at,
      isOwn: score.user_id === userId
    });
    const leaderboard = rows.map((row, index) => formatScore(row, index + 1));
    if (!own) return { leaderboard, own: null };
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 AS position
      FROM diaper_game_scores s
      JOIN users u ON u.id = s.user_id AND u.active = 1
      WHERE s.best_time_ms < ?
    `).get(own.best_time_ms).position;
    return { leaderboard, own: formatScore(own, rank) };
  }

  router.get('/api/diaper-game/leaderboard', requireAuth, (req, res) => {
    res.json(diaperGameLeaderboard(req.session.user.id));
  });

  router.post('/api/diaper-game/start', requireAuth, (req, res) => {
    const now = Date.now();
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('DELETE FROM diaper_game_rounds WHERE expires_at_ms < ?').run(now);
    db.prepare('DELETE FROM diaper_game_rounds WHERE user_id = ? AND completed_at_ms IS NULL').run(req.session.user.id);
    db.prepare(`
      INSERT INTO diaper_game_rounds (user_id, token_hash, started_at_ms, expires_at_ms)
      VALUES (?, ?, ?, ?)
    `).run(req.session.user.id, tokenHash(token), now, now + 2 * 60 * 1000);
    res.status(201).json({ token, expiresAt: now + 2 * 60 * 1000 });
  });

  router.post('/api/diaper-game/complete', requireAuth, (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: 'Diese Spielrunde ist ungueltig.' });
    }
    const now = Date.now();
    const round = db.prepare(`
      SELECT id, started_at_ms, expires_at_ms
      FROM diaper_game_rounds
      WHERE user_id = ? AND token_hash = ? AND completed_at_ms IS NULL
    `).get(req.session.user.id, tokenHash(token));
    if (!round || round.expires_at_ms < now) {
      return res.status(409).json({ error: 'Diese Spielrunde ist abgelaufen oder wurde bereits gewertet.' });
    }
    const elapsedMs = now - round.started_at_ms;
    if (elapsedMs < 600 || elapsedMs > 120000) {
      db.prepare('UPDATE diaper_game_rounds SET completed_at_ms = ? WHERE id = ?').run(now, round.id);
      return res.status(409).json({ error: 'Diese Rundenzeit kann nicht gewertet werden.' });
    }
    db.transaction(() => {
      db.prepare('UPDATE diaper_game_rounds SET completed_at_ms = ? WHERE id = ?').run(now, round.id);
      db.prepare(`
        INSERT INTO diaper_game_scores (user_id, house_id, best_time_ms, achieved_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          house_id = excluded.house_id,
          best_time_ms = excluded.best_time_ms,
          achieved_at = CURRENT_TIMESTAMP
        WHERE excluded.best_time_ms < diaper_game_scores.best_time_ms
      `).run(req.session.user.id, req.session.user.houseId || null, elapsedMs);
    })();
    res.json(diaperGameLeaderboard(req.session.user.id));
  });

  router.delete('/api/diaper-game/score', requireAuth, (req, res) => {
    db.prepare('DELETE FROM diaper_game_scores WHERE user_id = ?').run(req.session.user.id);
    res.json(diaperGameLeaderboard(req.session.user.id));
  });

  return router;
}

module.exports = { createDiaperGameRouter };
