const { dateClockTimestamp, swissClockTimestamp } = require('./swiss-time');

function releaseWindowStatus(bookingDate, slot, now = new Date()) {
  const [startTime, endTime] = String(slot || '').split('-');
  const startsAt = dateClockTimestamp(bookingDate, startTime);
  const endsAt = dateClockTimestamp(bookingDate, endTime);
  if (startsAt === null || endsAt === null) {
    return { eligible: false, reason: 'invalid', hasStarted: false, hasEnded: false };
  }

  const currentTime = swissClockTimestamp(now);
  const hasStarted = currentTime >= startsAt;
  const hasEnded = currentTime >= endsAt;
  const eligible = hasStarted && !hasEnded;

  return {
    eligible,
    reason: eligible ? 'eligible' : hasEnded ? 'ended' : 'not_started',
    hasStarted,
    hasEnded,
    startsInMs: startsAt - currentTime
  };
}

module.exports = {
  releaseWindowStatus
};
