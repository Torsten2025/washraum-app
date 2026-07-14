const SWISS_TIME_ZONE = 'Europe/Zurich';

const swissClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SWISS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function swissClockTimestamp(date = new Date()) {
  const parts = Object.fromEntries(
    swissClockFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function bookingClockTimestamp(dateValue, timeValue) {
  const dateMatch = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeValue || '').match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    return null;
  }
  return Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );
}

function releaseWindowStatus(bookingDate, slot, now = new Date()) {
  const [startTime, endTime] = String(slot || '').split('-');
  const startsAt = bookingClockTimestamp(bookingDate, startTime);
  const endsAt = bookingClockTimestamp(bookingDate, endTime);
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
