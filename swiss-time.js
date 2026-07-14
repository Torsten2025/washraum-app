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

function clockParts(date = new Date()) {
  return Object.fromEntries(
    swissClockFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
}

function swissClockTimestamp(date = new Date()) {
  const parts = clockParts(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function swissDateString(date = new Date()) {
  const parts = clockParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function dateClockTimestamp(dateValue, timeValue = '00:00') {
  const dateMatch = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeValue || '').match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    return null;
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const timestamp = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
    || hour > 23
    || minute > 59
  ) {
    return null;
  }
  return timestamp;
}

function isDateString(value) {
  return dateClockTimestamp(value) !== null;
}

function addDays(dateString, days) {
  const timestamp = dateClockTimestamp(dateString);
  if (timestamp === null) {
    return '';
  }
  const date = new Date(timestamp + Number(days) * 86400000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekdayForDate(dateString) {
  const timestamp = dateClockTimestamp(dateString, '12:00');
  return timestamp === null ? -1 : new Date(timestamp).getUTCDay();
}

function isPastSwissDate(dateString, now = new Date()) {
  return !isDateString(dateString) || dateString < swissDateString(now);
}

function isPastSwissSlot(dateString, slot, now = new Date()) {
  const endTime = String(slot || '').split('-')[1];
  const endsAt = dateClockTimestamp(dateString, endTime);
  return endsAt === null || swissClockTimestamp(now) >= endsAt;
}

module.exports = {
  SWISS_TIME_ZONE,
  addDays,
  dateClockTimestamp,
  isDateString,
  isPastSwissDate,
  isPastSwissSlot,
  swissClockTimestamp,
  swissDateString,
  weekdayForDate
};
