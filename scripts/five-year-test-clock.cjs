'use strict';
// Test-only preload. It is never imported by the production app.
if (process.env.WZ_FIVE_YEAR_TEST !== 'synthetic-local-only'
    || process.env.NODE_ENV !== 'development' || !process.send) {
  throw new Error('FIVE_YEAR_CLOCK_REQUIRES_ISOLATED_CHILD');
}
const NativeDate = Date;
let instant = NativeDate.parse('2027-01-01T00:05:00Z');
function SimulatedDate(...args) {
  if (!new.target) return new NativeDate(instant).toString();
  return Reflect.construct(NativeDate, args.length ? args : [instant], new.target);
}
Object.setPrototypeOf(SimulatedDate, NativeDate);
SimulatedDate.prototype = NativeDate.prototype;
SimulatedDate.now = () => instant;
global.Date = SimulatedDate;
process.on('message', (message) => {
  if (message?.type !== 'five-year-clock') return;
  const next = NativeDate.parse(message.iso);
  if (!Number.isFinite(next) || next < instant) throw new Error('TEST_CLOCK_MUST_ADVANCE');
  instant = next;
  process.send({ type: 'five-year-clock-ready', id: message.id, iso: new NativeDate(instant).toISOString() });
});
