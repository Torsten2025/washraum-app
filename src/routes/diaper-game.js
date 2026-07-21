const crypto = require('crypto');
const express = require('express');

const DIAPER_GAME_VERSION = 4;
const DIAPER_GAME_ROUND_MS = 60000;
const DIAPER_GAME_PENALTY_MS = 4500;
const DIAPER_GAME_MAX_MISTAKES = 3;
const DIAPER_GAME_FINAL_HOLD_MIN_MS = 900;
const DIAPER_GAME_FINAL_HOLD_MAX_MS = 1800;

const wireOptions = [
  { id: 'coral', label: 'Koralle', symbol: '▲' },
  { id: 'mint', label: 'Mint', symbol: '●' },
  { id: 'amber', label: 'Bernstein', symbol: '◆' },
  { id: 'blue', label: 'Blau', symbol: '■' }
];
const signalIds = wireOptions.map((option) => option.id);
const decoderSymbols = ['▲', '●', '◆', '■'];

function swissChallengeKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function seededRandom(seedText) {
  const seed = crypto.createHash('sha256').update(seedText).digest();
  let state = seed.readUInt32LE(0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function randomInt(random, maximum) {
  return Math.floor(random() * maximum);
}

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(random, index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildPuzzle(seedText) {
  const random = seededRandom(seedText);
  const wireTarget = wireOptions[randomInt(random, wireOptions.length)];
  const wireVariant = ['symbol', 'color', 'pulse'][randomInt(random, 3)];
  const sequence = [];
  const sequenceLength = 4 + randomInt(random, 3);
  while (sequence.length < sequenceLength) {
    const next = signalIds[randomInt(random, signalIds.length)];
    if (next !== sequence[sequence.length - 1]) sequence.push(next);
  }
  const safeStart = 18 + randomInt(random, 50);
  const decoderDigits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random).slice(0, 4);
  const decoder = Object.fromEntries(decoderSymbols.map((symbol, index) => [symbol, decoderDigits[index]]));
  const codeLength = 3 + randomInt(random, 2);
  const codeSymbols = Array.from({ length: codeLength }, () => decoderSymbols[randomInt(random, decoderSymbols.length)]);
  const temperatureStepSets = [
    [-7, -3, 2, 5, 8],
    [-9, -4, 3, 6, 11],
    [-6, -2, 4, 7, 9]
  ];
  const temperatureSteps = temperatureStepSets[randomInt(random, temperatureStepSets.length)];
  const temperatureStart = 16 + randomInt(random, 9);
  const temperatureSolution = Array.from({ length: 3 }, () => temperatureSteps[randomInt(random, temperatureSteps.length)]);
  const temperatureTarget = temperatureStart + temperatureSolution.reduce((sum, step) => sum + step, 0);
  const leakZones = random() < 0.5 ? 6 : 9;
  const leakZone = randomInt(random, leakZones);
  const circuitPath = shuffle([0, 1, 2, 3, 4, 5], random).slice(0, 4 + randomInt(random, 2));
  const lockTargets = Array.from({ length: 3 }, () => randomInt(random, 8));
  const incidentTypes = ['baby-kick', 'blackout', 'pressure-surge', 'scanner-fog'];
  const incident = {
    type: incidentTypes[randomInt(random, incidentTypes.length)],
    afterModule: 1 + randomInt(random, 2)
  };
  const modules = [
    {
      type: 'wire',
      title: 'Kabelmatrix',
      options: wireOptions,
      targetId: wireTarget.id,
      targetSymbol: wireTarget.symbol,
      targetLabel: wireTarget.label,
      variant: wireVariant
    },
    {
      type: 'signal',
      title: 'Impulsspeicher',
      sequence,
      playbackMs: 360 + randomInt(random, 180)
    },
    {
      type: 'valve',
      title: 'Druckventil',
      safeStart,
      safeEnd: safeStart + 14 + randomInt(random, 10),
      sweepMs: 1250 + randomInt(random, 950)
    },
    {
      type: 'code',
      title: 'Symboldecoder',
      decoder,
      codeSymbols,
      answer: codeSymbols.map((symbol) => decoder[symbol]).join('')
    },
    {
      type: 'temperature',
      title: 'Thermokern',
      start: temperatureStart,
      target: temperatureTarget,
      steps: temperatureSteps
    },
    {
      type: 'leak',
      title: 'Leckscanner',
      zones: leakZones,
      leakZone
    },
    {
      type: 'circuit',
      title: 'Leiterbahn',
      path: circuitPath
    },
    {
      type: 'locks',
      title: 'Sicherungsringe',
      targets: lockTargets
    }
  ];
  return { modules: shuffle(modules, random).slice(0, 4), incident };
}

function publicModule(module) {
  if (module.type === 'wire') {
    return {
      type: module.type,
      title: module.title,
      options: module.options,
      targetSymbol: module.targetSymbol,
      targetLabel: module.targetLabel,
      variant: module.variant
    };
  }
  if (module.type === 'code') {
    return {
      type: module.type,
      title: module.title,
      decoder: module.decoder,
      codeSymbols: module.codeSymbols
    };
  }
  if (module.type === 'leak') {
    return {
      type: module.type,
      title: module.title,
      zones: module.zones,
      revealZone: module.leakZone
    };
  }
  if (module.type === 'circuit') {
    return {
      type: module.type,
      title: module.title,
      path: module.path
    };
  }
  if (module.type === 'locks') {
    return {
      type: module.type,
      title: module.title,
      targets: module.targets
    };
  }
  return { ...module };
}

function safePuzzle(rawPuzzle) {
  try {
    const puzzle = JSON.parse(rawPuzzle || '{}');
    if (!Array.isArray(puzzle.modules) || puzzle.modules.length !== 4) return null;
    if (!puzzle.incident || !Number.isInteger(puzzle.incident.afterModule)) return null;
    return puzzle;
  } catch {
    return null;
  }
}

function moduleAnswerIsCorrect(module, answer) {
  if (!module || !answer || typeof answer !== 'object') return false;
  if (module.type === 'wire') return String(answer.choice || '') === module.targetId;
  if (module.type === 'signal') {
    return Array.isArray(answer.sequence)
      && answer.sequence.length === module.sequence.length
      && answer.sequence.every((entry, index) => entry === module.sequence[index]);
  }
  if (module.type === 'valve') {
    const position = Number(answer.position);
    return Number.isFinite(position) && position >= module.safeStart && position <= module.safeEnd;
  }
  if (module.type === 'code') return String(answer.code || '') === module.answer;
  if (module.type === 'temperature') return Number(answer.value) === module.target;
  if (module.type === 'leak') return Number(answer.zone) === module.leakZone;
  if (module.type === 'circuit') {
    return Array.isArray(answer.path)
      && answer.path.length === module.path.length
      && answer.path.every((entry, index) => Number(entry) === module.path[index]);
  }
  if (module.type === 'locks') {
    return Array.isArray(answer.positions)
      && answer.positions.length === module.targets.length
      && answer.positions.every((entry, index) => Number(entry) === module.targets[index]);
  }
  return false;
}

function createDiaperGameRouter({ db, requireAuth, tokenHash }) {
  const router = express.Router();

  function diaperGameLeaderboard(userId, challengeKey = swissChallengeKey()) {
    const rows = db.prepare(`
      SELECT s.user_id, s.score_time_ms, s.elapsed_time_ms, s.mistakes, s.achieved_at
      FROM diaper_game_challenge_scores s
      JOIN users u ON u.id = s.user_id AND u.active = 1
      WHERE s.game_version = ? AND s.challenge_key = ?
      ORDER BY s.score_time_ms ASC, s.achieved_at ASC, s.user_id ASC
      LIMIT 10
    `).all(DIAPER_GAME_VERSION, challengeKey);
    const own = db.prepare(`
      SELECT s.user_id, s.score_time_ms, s.elapsed_time_ms, s.mistakes, s.achieved_at
      FROM diaper_game_challenge_scores s
      JOIN users u ON u.id = s.user_id AND u.active = 1
      WHERE s.user_id = ? AND s.game_version = ? AND s.challenge_key = ?
    `).get(userId, DIAPER_GAME_VERSION, challengeKey);
    const formatScore = (score, position = null) => ({
      position,
      player: `Wickelprofi #${score.user_id}`,
      timeMs: score.score_time_ms,
      elapsedTimeMs: score.elapsed_time_ms,
      mistakes: score.mistakes,
      achievedAt: score.achieved_at,
      isOwn: score.user_id === userId
    });
    const leaderboard = rows.map((row, index) => formatScore(row, index + 1));
    if (!own) {
      return { gameVersion: DIAPER_GAME_VERSION, challengeKey, leaderboard, own: null };
    }
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 AS position
      FROM diaper_game_challenge_scores s
      JOIN users u ON u.id = s.user_id AND u.active = 1
      WHERE s.game_version = ? AND s.challenge_key = ? AND s.score_time_ms < ?
    `).get(DIAPER_GAME_VERSION, challengeKey, own.score_time_ms).position;
    return { gameVersion: DIAPER_GAME_VERSION, challengeKey, leaderboard, own: formatScore(own, rank) };
  }

  function findActiveRound(userId, token) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare(`
      SELECT * FROM diaper_game_rounds
      WHERE user_id = ? AND token_hash = ? AND game_version = ?
        AND completed_at_ms IS NULL AND failed_at_ms IS NULL
    `).get(userId, tokenHash(token), DIAPER_GAME_VERSION);
  }

  function failRound(round, now) {
    db.prepare('UPDATE diaper_game_rounds SET failed_at_ms = ? WHERE id = ?').run(now, round.id);
  }

  router.get('/api/diaper-game/leaderboard', requireAuth, (req, res) => {
    res.json(diaperGameLeaderboard(req.session.user.id));
  });

  router.post('/api/diaper-game/start', requireAuth, (req, res) => {
    const now = Date.now();
    const mode = req.body?.mode === 'practice' ? 'practice' : 'ranked';
    const token = crypto.randomBytes(32).toString('hex');
    const challengeKey = swissChallengeKey(new Date(now));
    const seedText = mode === 'ranked'
      ? `windel-alarm-v${DIAPER_GAME_VERSION}:${challengeKey}`
      : `windel-alarm-practice-v${DIAPER_GAME_VERSION}:${token}`;
    const puzzle = buildPuzzle(seedText);
    db.prepare('DELETE FROM diaper_game_rounds WHERE expires_at_ms < ?').run(now);
    db.prepare('DELETE FROM diaper_game_rounds WHERE user_id = ? AND completed_at_ms IS NULL').run(req.session.user.id);
    db.prepare(`
      INSERT INTO diaper_game_rounds (
        user_id, token_hash, game_version, mode, challenge_key, puzzle_json,
        progress, mistakes, started_at_ms, expires_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      req.session.user.id,
      tokenHash(token),
      DIAPER_GAME_VERSION,
      mode,
      challengeKey,
      JSON.stringify(puzzle),
      now,
      now + 2 * 60 * 1000
    );
    res.status(201).json({
      token,
      gameVersion: DIAPER_GAME_VERSION,
      mode,
      challengeKey,
      roundMs: DIAPER_GAME_ROUND_MS,
      penaltyMs: DIAPER_GAME_PENALTY_MS,
      maxMistakes: DIAPER_GAME_MAX_MISTAKES,
      modules: puzzle.modules.map(publicModule),
      incident: puzzle.incident,
      expiresAt: now + 2 * 60 * 1000
    });
  });

  router.post('/api/diaper-game/action', requireAuth, (req, res) => {
    const token = String(req.body?.token || '').trim();
    const round = findActiveRound(req.session.user.id, token);
    const now = Date.now();
    if (!round || round.expires_at_ms < now) {
      return res.status(409).json({ error: 'Diese Spielrunde ist abgelaufen oder nicht mehr aktiv.' });
    }
    const puzzle = safePuzzle(round.puzzle_json);
    if (!puzzle || round.progress >= puzzle.modules.length) {
      return res.status(409).json({ error: 'Diese Spielrunde besitzt kein offenes Modul.' });
    }
    if (Number(req.body?.moduleIndex) !== round.progress) {
      return res.status(409).json({ error: 'Dieses Modul ist nicht aktiv.' });
    }
    const module = puzzle.modules[round.progress];
    const correct = moduleAnswerIsCorrect(module, req.body?.answer);
    if (!correct) {
      const mistakes = round.mistakes + 1;
      const failed = mistakes >= DIAPER_GAME_MAX_MISTAKES;
      db.prepare(`
        UPDATE diaper_game_rounds
        SET mistakes = ?, failed_at_ms = CASE WHEN ? THEN ? ELSE failed_at_ms END
        WHERE id = ?
      `).run(mistakes, failed ? 1 : 0, now, round.id);
      return res.json({
        correct: false,
        failed,
        mistakes,
        mistakesLeft: Math.max(0, DIAPER_GAME_MAX_MISTAKES - mistakes),
        progress: round.progress,
        penaltyMs: DIAPER_GAME_PENALTY_MS
      });
    }
    const progress = round.progress + 1;
    db.prepare('UPDATE diaper_game_rounds SET progress = ? WHERE id = ?').run(progress, round.id);
    return res.json({
      correct: true,
      failed: false,
      mistakes: round.mistakes,
      mistakesLeft: DIAPER_GAME_MAX_MISTAKES - round.mistakes,
      progress,
      readyForFinal: progress === puzzle.modules.length
    });
  });

  router.post('/api/diaper-game/complete', requireAuth, (req, res) => {
    const token = String(req.body?.token || '').trim();
    const round = findActiveRound(req.session.user.id, token);
    const now = Date.now();
    if (!round || round.expires_at_ms < now) {
      return res.status(409).json({ error: 'Diese Spielrunde ist abgelaufen oder wurde bereits gewertet.' });
    }
    const puzzle = safePuzzle(round.puzzle_json);
    if (!puzzle || round.progress !== puzzle.modules.length) {
      return res.status(409).json({ error: 'Vor der Wertung muessen alle Module serverseitig bestaetigt sein.' });
    }
    const holdMs = Number(req.body?.holdMs);
    if (!Number.isFinite(holdMs) || holdMs < DIAPER_GAME_FINAL_HOLD_MIN_MS || holdMs > DIAPER_GAME_FINAL_HOLD_MAX_MS) {
      const mistakes = round.mistakes + 1;
      const failed = mistakes >= DIAPER_GAME_MAX_MISTAKES;
      db.prepare(`
        UPDATE diaper_game_rounds
        SET mistakes = ?, failed_at_ms = CASE WHEN ? THEN ? ELSE failed_at_ms END
        WHERE id = ?
      `).run(mistakes, failed ? 1 : 0, now, round.id);
      return res.status(409).json({
        error: failed ? 'Der Zuendkreis wurde ausgeloest.' : 'Halte den Zuendkreis zwischen 0,9 und 1,8 Sekunden.',
        failed,
        mistakes,
        mistakesLeft: Math.max(0, DIAPER_GAME_MAX_MISTAKES - mistakes),
        penaltyMs: DIAPER_GAME_PENALTY_MS
      });
    }
    const elapsedMs = now - round.started_at_ms;
    const scoreTimeMs = elapsedMs + round.mistakes * DIAPER_GAME_PENALTY_MS;
    if (elapsedMs < 2500 || scoreTimeMs > DIAPER_GAME_ROUND_MS + 2000) {
      failRound(round, now);
      return res.status(409).json({ error: 'Diese Rundenzeit kann nicht gewertet werden.' });
    }
    db.transaction(() => {
      db.prepare('UPDATE diaper_game_rounds SET completed_at_ms = ? WHERE id = ?').run(now, round.id);
      if (round.mode !== 'ranked') return;
      db.prepare(`
        INSERT INTO diaper_game_challenge_scores (
          user_id, house_id, game_version, challenge_key,
          score_time_ms, elapsed_time_ms, mistakes, achieved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, game_version, challenge_key) DO UPDATE SET
          house_id = excluded.house_id,
          score_time_ms = excluded.score_time_ms,
          elapsed_time_ms = excluded.elapsed_time_ms,
          mistakes = excluded.mistakes,
          achieved_at = CURRENT_TIMESTAMP
        WHERE excluded.score_time_ms < diaper_game_challenge_scores.score_time_ms
      `).run(
        req.session.user.id,
        req.session.user.houseId || null,
        DIAPER_GAME_VERSION,
        round.challenge_key,
        scoreTimeMs,
        elapsedMs,
        round.mistakes
      );
    })();
    const result = {
      practice: round.mode === 'practice',
      elapsedTimeMs: elapsedMs,
      scoreTimeMs,
      mistakes: round.mistakes
    };
    if (round.mode === 'practice') {
      return res.json({ ...diaperGameLeaderboard(req.session.user.id), result });
    }
    return res.json({ ...diaperGameLeaderboard(req.session.user.id, round.challenge_key), result });
  });

  router.delete('/api/diaper-game/score', requireAuth, (req, res) => {
    const challengeKey = swissChallengeKey();
    db.prepare(`
      DELETE FROM diaper_game_challenge_scores
      WHERE user_id = ? AND game_version = ? AND challenge_key = ?
    `).run(req.session.user.id, DIAPER_GAME_VERSION, challengeKey);
    res.json(diaperGameLeaderboard(req.session.user.id, challengeKey));
  });

  return router;
}

module.exports = {
  createDiaperGameRouter,
  buildPuzzle,
  moduleAnswerIsCorrect,
  publicModule,
  DIAPER_GAME_VERSION,
  DIAPER_GAME_ROUND_MS,
  DIAPER_GAME_PENALTY_MS,
  DIAPER_GAME_MAX_MISTAKES
};
