'use strict';

// Civil-day arithmetic, independent of the host timezone and daylight saving.
const DAY_MS = 86400000;
const mod = (a, b) => ((a % b) + b) % b;
function dayNumber(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) return null;
  return Math.floor(value / DAY_MS);
}
function dateString(day) {
  const result = new Date(Number(day) * DAY_MS).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error('RECURRENCE_DATE_RANGE');
  return result;
}
function firstDay(startDate, weekday) {
  const start = dayNumber(startDate);
  if (start == null) throw new Error('RECURRENCE_DATE');
  return start + mod(Number(weekday) - mod(start + 4, 7), 7);
}
function invalid() {
  const error = new Error('RECURRENCE_INVALID');
  error.status = 400;
  error.code = 'RECURRENCE_INVALID';
  throw error;
}
function normalizeRecurrence(input, { weekday, slot, today, isSlotStarted }) {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) invalid();
  const allowed = new Set(['intervalWeeks', 'startDate', 'endType', 'endDate', 'count']);
  if (Object.keys(input).some(key => !allowed.has(key))) invalid();
  const { intervalWeeks, startDate, endType, endDate, count } = input;
  if (!Number.isInteger(intervalWeeks) || intervalWeeks < 1 || intervalWeeks > 52
    || dayNumber(startDate) == null || startDate < today || !['never', 'date', 'count'].includes(endType)) invalid();
  if ((endType !== 'date' && endDate != null) || (endType !== 'count' && count != null)) invalid();
  const first = firstDay(startDate, weekday);
  let last = null;
  if (endType === 'date') {
    if (dayNumber(endDate) == null || dayNumber(endDate) < first) invalid();
    last = first + Math.floor((dayNumber(endDate) - first) / (7 * intervalWeeks)) * 7 * intervalWeeks;
  }
  if (endType === 'count') {
    if (!Number.isInteger(count) || count < 1 || count > 1000) invalid();
    last = first + (count - 1) * 7 * intervalWeeks;
  }
  let firstDate;
  try { firstDate = dateString(first); if (last != null) dateString(last + 1); } catch { invalid(); }
  if (firstDate === today && isSlotStarted(firstDate, slot)) invalid();
  return { intervalWeeks, startDate, endType, endDate: endType === 'date' ? endDate : null,
    count: endType === 'count' ? count : null, firstOccurrenceDate: firstDate };
}
function recurrenceColumns(recurrence, offset = 0) {
  return { interval_weeks: recurrence?.intervalWeeks || 1, series_start_date: recurrence?.startDate || null,
    series_end_date: recurrence?.endDate || null, occurrence_count: recurrence?.count || null,
    occurrence_day_offset: offset };
}
function sequence(row) {
  if (!row.series_start_date) return { a: BigInt(mod(Number(row.weekday) - 4, 7)), p: 7n, lo: -719162n, hi: null };
  const offset = Number(row.occurrence_day_offset || 0);
  const washDay = mod(Number(row.weekday) - offset, 7);
  const first = firstDay(row.series_start_date, washDay);
  const period = 7 * Number(row.interval_weeks);
  let last = null;
  if (row.series_end_date) last = first + Math.floor((dayNumber(row.series_end_date) - first) / period) * period;
  if (row.occurrence_count != null) last = first + (Number(row.occurrence_count) - 1) * period;
  return { a: BigInt(first + offset), p: BigInt(period), lo: BigInt(first + offset), hi: last == null ? null : BigInt(last + offset) };
}
function occursOn(row, date) {
  const day = dayNumber(date);
  if (day == null) return false;
  const s = sequence(row), d = BigInt(day);
  return d >= s.lo && (s.hi == null || d <= s.hi) && mod(d - s.a, s.p) === 0n;
}
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function inverse(a, m) {
  let [oldR, r, oldS, s] = [a, m, 1n, 0n];
  while (r) { const q = oldR / r; [oldR, r] = [r, oldR - q * r]; [oldS, s] = [s, oldS - q * s]; }
  return mod(oldS, m);
}
function intersect(left, right) {
  if (!left || !right) return null;
  const g = gcd(left.p, right.p), difference = right.a - left.a;
  if (difference % g) return null;
  const q = right.p / g;
  const k = q === 1n ? 0n : mod((difference / g) * inverse(left.p / g, q), q);
  const p = left.p * q, a = mod(left.a + left.p * k, p);
  const lo = left.lo > right.lo ? left.lo : right.lo;
  const hi = left.hi == null ? right.hi : right.hi == null ? left.hi : left.hi < right.hi ? left.hi : right.hi;
  const first = lo + mod(a - lo, p);
  return hi != null && first > hi ? null : { a, p, lo: first, hi };
}
function futureSequence(row, today) {
  const s = sequence(row), lower = BigInt(dayNumber(today));
  s.lo = s.lo > lower ? s.lo : lower;
  return intersect(s, { a: 0n, p: 1n, lo: s.lo, hi: null });
}
function overlap(left, right, today) { return intersect(futureSequence(left, today), futureSequence(right, today)); }
// A candidate plus `limit` distinct other devices would exceed capacity.
// Merge exact progressions rather than expanding a least-common-multiple horizon.
function capacityConflict(candidate, rows, limit, today) {
  const initial = futureSequence(candidate, today);
  if (!initial) return false;
  if (limit <= 0) return true;
  const groups = new Map();
  for (const row of rows) {
    const intersection = intersect(initial, futureSequence(row, today));
    if (!intersection) continue;
    if (!groups.has(row.resource_id)) groups.set(row.resource_id, new Map());
    const key = [intersection.a, intersection.p, intersection.lo, intersection.hi].join(':');
    groups.get(row.resource_id).set(key, intersection);
  }
  const devices = [...groups.values()].map(options => [...options.values()]);
  const failed = new Set();
  function visit(start, needed, current) {
    if (!needed) return true;
    if (devices.length - start < needed) return false;
    const key = [start, needed, current.a, current.p, current.lo, current.hi].join(':');
    if (failed.has(key)) return false;
    for (let i = start; i <= devices.length - needed; i += 1) {
      for (const option of devices[i]) {
        const next = intersect(current, option);
        if (next && visit(i + 1, needed - 1, next)) return true;
      }
    }
    failed.add(key);
    return false;
  }
  return visit(0, limit, initial);
}
function projectRecurrence(row) {
  if (!row.series_start_date) return null;
  const offset = Number(row.occurrence_day_offset || 0), s = sequence(row);
  return { intervalWeeks: Number(row.interval_weeks), startDate: row.series_start_date,
    endType: row.series_end_date ? 'date' : row.occurrence_count != null ? 'count' : 'never',
    endDate: row.series_end_date || null, count: row.occurrence_count == null ? null : Number(row.occurrence_count),
    firstOccurrenceDate: dateString(s.lo - BigInt(offset)),
    lastOccurrenceDate: s.hi == null ? null : dateString(s.hi - BigInt(offset)) };
}
function feedRecurrence(row) {
  const s = sequence(row);
  return { date: dateString(s.lo), rule: `RRULE:FREQ=WEEKLY;INTERVAL=${row.interval_weeks}`
    + (s.hi == null ? '' : `;COUNT=${(s.hi - s.lo) / s.p + 1n}`) };
}
module.exports = { dayNumber, dateString, firstDay, normalizeRecurrence, recurrenceColumns, sequence, occursOn,
  intersect, futureSequence, overlap, capacityConflict, projectRecurrence, feedRecurrence };
