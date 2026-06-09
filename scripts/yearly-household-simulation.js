const resources = {
  washer: ["WM 1", "WM 2", "WM 3"],
  drying_room: ["Trockenraum 1", "Trockenraum 2", "Trockenraum 3"],
  tumbler: ["Tumbler 1", "Tumbler 2", "Tumbler 3"]
};

const slots = [
  { id: "morning", label: "07:00-12:00" },
  { id: "midday", label: "12:00-17:00" },
  { id: "evening", label: "17:00-21:00" }
];

const blockedDates = new Set([
  "2026-08-01",
  "2026-12-25",
  "2026-12-26",
  "2027-01-01",
  "2027-03-26",
  "2027-03-29",
  "2027-05-01",
  "2027-05-06",
  "2027-05-17",
  "2027-08-01"
]);

const households = [
  profile("Partei 01", "Familie Keller", "Familie mit 6 Kindern", 5.8, 0.45, 0.55, ["evening", "midday", "morning"], 0.04, 0.08, 0.12, 0.08, [[46, 14]]),
  profile("Partei 02", "Familie Yilmaz", "Familie mit 4 Kindern", 4.8, 0.5, 0.45, ["evening", "midday", "morning"], 0.03, 0.06, 0.1, 0.06, [[29, 10]]),
  profile("Partei 03", "Familie Rossi", "Familie mit 2 Kindern", 3.2, 0.45, 0.4, ["midday", "evening", "morning"], 0.02, 0.04, 0.08, 0.04, [[30, 14]]),
  profile("Partei 04", "Familie Meier", "Familie mit Baby", 4.2, 0.6, 0.35, ["morning", "midday", "evening"], 0.02, 0.05, 0.11, 0.05, [[36, 7]]),
  profile("Partei 05", "Familie Schneider", "Alleinerziehend mit 2 Kindern", 3.4, 0.5, 0.38, ["evening", "morning", "midday"], 0.04, 0.05, 0.09, 0.07, [[31, 7]]),
  profile("Partei 06", "WG Nord", "4er-WG", 3.8, 0.35, 0.35, ["evening", "midday", "morning"], 0.09, 0.1, 0.07, 0.12, [[27, 21]]),
  profile("Partei 07", "WG Sued", "3er-WG", 2.9, 0.3, 0.42, ["evening", "midday", "morning"], 0.08, 0.09, 0.08, 0.1, [[39, 14]]),
  profile("Partei 08", "Herr Baumann", "Single berufstaetig", 1.2, 0.45, 0.3, ["evening", "morning", "midday"], 0.03, 0.03, 0.05, 0.05, [[33, 14]]),
  profile("Partei 09", "Frau Novak", "Single Schichtarbeit", 1.4, 0.28, 0.55, ["morning", "evening", "midday"], 0.05, 0.04, 0.08, 0.07, [[25, 10]]),
  profile("Partei 10", "Paar Frei", "Paar ohne Kinder", 1.9, 0.4, 0.35, ["midday", "evening", "morning"], 0.02, 0.03, 0.08, 0.03, [[41, 14]]),
  profile("Partei 11", "Paar Nguyen", "Paar im Homeoffice", 2.0, 0.35, 0.42, ["midday", "morning", "evening"], 0.02, 0.03, 0.07, 0.02, [[28, 7]]),
  profile("Partei 12", "Herr Huber", "Senior allein", 1.1, 0.18, 0.58, ["morning", "midday", "evening"], 0.01, 0.04, 0.04, 0.02, [[34, 21]]),
  profile("Partei 13", "Frau Graf", "Seniorin allein", 1.0, 0.15, 0.62, ["morning", "midday", "evening"], 0.01, 0.05, 0.04, 0.02, [[35, 21]]),
  profile("Partei 14", "Familie Petrova", "Familie mit 1 Kind", 2.7, 0.42, 0.45, ["midday", "evening", "morning"], 0.02, 0.04, 0.08, 0.04, [[32, 10]]),
  profile("Partei 15", "Familie Weber", "Familie mit 3 Kindern", 4.1, 0.48, 0.42, ["evening", "midday", "morning"], 0.03, 0.06, 0.09, 0.06, [[30, 14]]),
  profile("Partei 16", "Atelier Klein", "Single mit Arbeitskleidung", 2.4, 0.55, 0.25, ["evening", "morning", "midday"], 0.06, 0.04, 0.1, 0.08, [[38, 7]]),
  profile("Partei 17", "Paar Ali", "Paar mit Sport/Hobby", 2.5, 0.5, 0.32, ["evening", "midday", "morning"], 0.03, 0.04, 0.09, 0.05, [[26, 14]]),
  profile("Partei 18", "Frau Singh", "Single mit Kleinkind-Besuch", 1.8, 0.45, 0.38, ["midday", "morning", "evening"], 0.04, 0.04, 0.08, 0.05, [[44, 10]]),
  profile("Partei 19", "Familie Silva", "Familie mit 2 Kindern und Pflegefall", 4.6, 0.55, 0.35, ["morning", "midday", "evening"], 0.03, 0.07, 0.1, 0.05, [[37, 7]]),
  profile("Partei 20", "Herr Moser", "unregelmaessiger Nutzer", 0.8, 0.35, 0.3, ["evening", "morning", "midday"], 0.12, 0.03, 0.05, 0.16, [[24, 28]])
];

const rng = mulberry32(20260609);
const startDate = dateFromKey("2026-07-01");
const endDate = dateFromKey("2027-06-30");
const calendars = {
  washer: new Map(),
  drying_room: new Map(),
  tumbler: new Map()
};
const stats = {
  days: 0,
  bookableDays: 0,
  washerDemand: 0,
  washerBooked: 0,
  washerUnserved: 0,
  washerDelayedDays: 0,
  dryingDemand: 0,
  dryingBooked: 0,
  dryingUnserved: 0,
  unauthorizedUses: 0,
  unauthorizedConflicts: 0,
  forgottenLaundry: 0,
  forgottenLaundryConflicts: 0,
  vacationNoCancel: 0,
  earlyReleaseSignals: 0,
  earlyReleasePotentialSlots: 0
};

const householdStats = households.map((household) => ({
  party: household.party,
  name: household.name,
  role: household.role,
  demand: 0,
  booked: 0,
  unserved: 0,
  unauthorized: 0,
  forgotten: 0,
  vacationNoCancel: 0
}));

run();

function run() {
  for (const day of eachDay(startDate, endDate)) {
    stats.days += 1;
    if (!isBookableDay(day)) {
      continue;
    }

    stats.bookableDays += 1;
    simulateDay(day);
  }

  const report = buildReport();
  printReport(report);
}

function simulateDay(day) {
  const week = weekOfYear(day);
  const dayScore = dayPreferenceScore(day);

  for (const [index, household] of households.entries()) {
    if (isInVacation(household, week)) {
      maybeVacationNoCancel(day, household, index);
      continue;
    }

    maybeUnauthorizedUse(day, household, index);

    const demandProbability = Math.min(0.95, (household.washerPerWeek / 6) * dayScore);
    if (rng() > demandProbability) {
      continue;
    }

    stats.washerDemand += 1;
    householdStats[index].demand += 1;

    const booking = bookWasher(day, household);
    if (!booking) {
      stats.washerUnserved += 1;
      householdStats[index].unserved += 1;
      continue;
    }

    stats.washerBooked += 1;
    householdStats[index].booked += 1;
    if (rng() < household.earlyReleaseRate) {
      stats.earlyReleaseSignals += 1;
      if (booking.slot !== "evening") {
        stats.earlyReleasePotentialSlots += 1;
      }
    }

    maybeBookDrying(day, household, index, booking.slot);
  }
}

function bookWasher(day, household) {
  const searchDays = [0, 1, 2, 3].map((offset) => addDays(day, offset)).filter(isBookableDay);
  for (const candidateDay of searchDays) {
    for (const slotId of household.slotPreference) {
      for (const resourceId of shuffled(resources.washer)) {
        if (reserve("washer", candidateDay, slotId, resourceId, household.party)) {
          stats.washerDelayedDays += Math.max(0, dayDiff(day, candidateDay));
          return { day: candidateDay, slot: slotId, resourceId };
        }
      }
    }
  }

  return null;
}

function maybeBookDrying(day, household, index, washerSlot) {
  const wantsTumbler = rng() < household.tumblerRate;
  const wantsDryingRoom = rng() < household.dryingRoomRate;
  if (!wantsTumbler && !wantsDryingRoom) {
    return;
  }

  stats.dryingDemand += 1;
  const type = wantsTumbler ? "tumbler" : "drying_room";
  const slotOrder = dryingSlotOrder(washerSlot);
  const days = [day, addDays(day, 1)].filter(isBookableDay);

  for (const candidateDay of days) {
    for (const slotId of slotOrder) {
      for (const resourceId of shuffled(resources[type])) {
        if (reserve(type, candidateDay, slotId, resourceId, household.party)) {
          stats.dryingBooked += 1;
          if (type === "drying_room" && rng() < household.forgetLaundryRate) {
            stats.forgottenLaundry += 1;
            householdStats[index].forgotten += 1;
            blockNextDryingSlot(candidateDay, slotId, resourceId);
          }
          return;
        }
      }
    }
  }

  stats.dryingUnserved += 1;
}

function maybeUnauthorizedUse(day, household, index) {
  if (rng() > household.walkInRate / 6) {
    return;
  }

  stats.unauthorizedUses += 1;
  householdStats[index].unauthorized += 1;
  const slotId = pick(household.slotPreference);
  const resourceId = pick(resources.washer);
  const key = calendarKey(day, slotId, resourceId);
  if (calendars.washer.has(key)) {
    stats.unauthorizedConflicts += 1;
  } else {
    reserve("washer", day, slotId, resourceId, `${household.party}-walkin`);
  }
}

function maybeVacationNoCancel(day, household, index) {
  if (rng() > 0.008) {
    return;
  }

  const slotId = pick(household.slotPreference);
  const resourceId = pick(resources.washer);
  if (reserve("washer", day, slotId, resourceId, `${household.party}-vacation-no-cancel`)) {
    stats.vacationNoCancel += 1;
    householdStats[index].vacationNoCancel += 1;
  }
}

function blockNextDryingSlot(day, slotId, resourceId) {
  const slotIndex = slots.findIndex((slot) => slot.id === slotId);
  if (slotIndex < 0 || slotIndex >= slots.length - 1) {
    return;
  }

  const nextSlot = slots[slotIndex + 1].id;
  const key = calendarKey(day, nextSlot, resourceId);
  if (calendars.drying_room.has(key)) {
    stats.forgottenLaundryConflicts += 1;
  } else {
    calendars.drying_room.set(key, "blocked-by-forgotten-laundry");
  }
}

function reserve(type, day, slotId, resourceId, party) {
  const key = calendarKey(day, slotId, resourceId);
  if (calendars[type].has(key)) {
    return false;
  }

  calendars[type].set(key, party);
  return true;
}

function buildReport() {
  const capacity = {
    washer: stats.bookableDays * resources.washer.length * slots.length,
    dryingRoom: stats.bookableDays * resources.drying_room.length * slots.length,
    tumbler: stats.bookableDays * resources.tumbler.length * slots.length
  };
  const used = {
    washer: calendars.washer.size,
    dryingRoom: calendars.drying_room.size,
    tumbler: calendars.tumbler.size
  };
  const peak = peakUsage();
  const topUnserved = [...householdStats].sort((left, right) => right.unserved - left.unserved).slice(0, 5);
  const topDemand = [...householdStats].sort((left, right) => right.demand - left.demand).slice(0, 5);

  return {
    period: `${dateKey(startDate)} bis ${dateKey(endDate)}`,
    parties: households.length,
    capacity,
    used,
    utilization: {
      washer: percent(used.washer, capacity.washer),
      dryingRoom: percent(used.dryingRoom, capacity.dryingRoom),
      tumbler: percent(used.tumbler, capacity.tumbler)
    },
    demand: {
      washer: stats.washerDemand,
      washerBooked: stats.washerBooked,
      washerUnserved: stats.washerUnserved,
      washerFulfillment: percent(stats.washerBooked, stats.washerDemand),
      averageDelayDays: Number((stats.washerDelayedDays / Math.max(1, stats.washerBooked)).toFixed(2)),
      drying: stats.dryingDemand,
      dryingBooked: stats.dryingBooked,
      dryingUnserved: stats.dryingUnserved,
      dryingFulfillment: percent(stats.dryingBooked, stats.dryingDemand)
    },
    behaviorIncidents: {
      unauthorizedUses: stats.unauthorizedUses,
      unauthorizedConflicts: stats.unauthorizedConflicts,
      forgottenLaundry: stats.forgottenLaundry,
      forgottenLaundryConflicts: stats.forgottenLaundryConflicts,
      vacationNoCancel: stats.vacationNoCancel,
      earlyReleaseSignals: stats.earlyReleaseSignals,
      earlyReleasePotentialSlots: stats.earlyReleasePotentialSlots
    },
    peak,
    topDemand,
    topUnserved,
    households: householdStats
  };
}

function printReport(report) {
  console.log("Jahressimulation Waschraum-App");
  console.log(`Zeitraum: ${report.period}`);
  console.log(`Parteien: ${report.parties}`);
  console.log("");
  console.log("Kapazitaet und Nutzung");
  console.log(`- Waschmaschinen: ${report.used.washer}/${report.capacity.washer} Slots (${report.utilization.washer})`);
  console.log(`- Trockenraeume: ${report.used.dryingRoom}/${report.capacity.dryingRoom} Slots (${report.utilization.dryingRoom})`);
  console.log(`- Tumbler: ${report.used.tumbler}/${report.capacity.tumbler} Slots (${report.utilization.tumbler})`);
  console.log("");
  console.log("Nachfrage");
  console.log(`- Waschbedarf: ${report.demand.washer}, gebucht: ${report.demand.washerBooked}, unversorgt: ${report.demand.washerUnserved}, Erfuellung: ${report.demand.washerFulfillment}`);
  console.log(`- Durchschnittliche Verschiebung: ${report.demand.averageDelayDays} Tage`);
  console.log(`- Trocknungsbedarf: ${report.demand.drying}, gebucht: ${report.demand.dryingBooked}, unversorgt: ${report.demand.dryingUnserved}, Erfuellung: ${report.demand.dryingFulfillment}`);
  console.log("");
  console.log("Verhalten / Stoerfaelle");
  console.log(`- Ohne Eintrag genutzt: ${report.behaviorIncidents.unauthorizedUses}, davon Konflikte: ${report.behaviorIncidents.unauthorizedConflicts}`);
  console.log(`- Waesche vergessen: ${report.behaviorIncidents.forgottenLaundry}, direkte Folgekonflikte: ${report.behaviorIncidents.forgottenLaundryConflicts}`);
  console.log(`- Urlaub / nicht geloeschte Reservierungen: ${report.behaviorIncidents.vacationNoCancel}`);
  console.log(`- Frueher-frei-Signale: ${report.behaviorIncidents.earlyReleaseSignals}, davon real nutzbare Potenziale: ${report.behaviorIncidents.earlyReleasePotentialSlots}`);
  console.log("");
  console.log("Spitzenlast");
  for (const item of report.peak) {
    console.log(`- ${item.label}: ${item.value} belegte Slots`);
  }
  console.log("");
  console.log("Top-Nachfrage");
  for (const household of report.topDemand) {
    console.log(`- ${household.party} ${household.name} (${household.role}): ${household.demand} Bedarf, ${household.booked} gebucht, ${household.unserved} unversorgt`);
  }
  console.log("");
  console.log("Am meisten unversorgt");
  for (const household of report.topUnserved) {
    console.log(`- ${household.party} ${household.name} (${household.role}): ${household.unserved} unversorgt`);
  }
  console.log("");
  console.log("JSON");
  console.log(JSON.stringify(report, null, 2));
}

function peakUsage() {
  const counts = new Map();
  for (const [type, calendar] of Object.entries(calendars)) {
    for (const key of calendar.keys()) {
      const [date, slot] = key.split("|");
      const peakKey = `${type}|${date}|${slot}`;
      counts.set(peakKey, (counts.get(peakKey) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([key, value]) => {
      const [type, date, slot] = key.split("|");
      return { label: `${typeLabel(type)} ${date} ${slotLabel(slot)}`, value };
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
}

function profile(party, name, role, washerPerWeek, tumblerRate, dryingRoomRate, slotPreference, walkInRate, forgetLaundryRate, earlyReleaseRate, noShowRisk, vacations) {
  return { party, name, role, washerPerWeek, tumblerRate, dryingRoomRate, slotPreference, walkInRate, forgetLaundryRate, earlyReleaseRate, noShowRisk, vacations };
}

function dayPreferenceScore(day) {
  const weekday = day.getDay();
  if (weekday === 6) {
    return 1.35;
  }
  if (weekday === 1 || weekday === 5) {
    return 1.08;
  }
  return 0.92;
}

function dryingSlotOrder(washerSlot) {
  if (washerSlot === "morning") {
    return ["midday", "evening", "morning"];
  }
  if (washerSlot === "midday") {
    return ["evening", "midday", "morning"];
  }
  return ["evening", "morning", "midday"];
}

function isInVacation(household, week) {
  return household.vacations.some(([startWeek, duration]) => week >= startWeek && week < startWeek + duration);
}

function isBookableDay(day) {
  return day.getDay() !== 0 && !blockedDates.has(dateKey(day));
}

function calendarKey(day, slotId, resourceId) {
  return `${dateKey(day)}|${slotId}|${resourceId}`;
}

function typeLabel(type) {
  return {
    washer: "Waschmaschine",
    drying_room: "Trockenraum",
    tumbler: "Tumbler"
  }[type] || type;
}

function slotLabel(slotId) {
  return slots.find((slot) => slot.id === slotId)?.label || slotId;
}

function percent(value, total) {
  return `${((value / Math.max(1, total)) * 100).toFixed(1)}%`;
}

function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function pick(values) {
  return values[Math.floor(rng() * values.length)];
}

function eachDay(start, end) {
  const days = [];
  const day = new Date(start);
  while (day <= end) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  return days;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function dayDiff(left, right) {
  return Math.round((right - left) / 86400000);
}

function weekOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor(dayDiff(start, date) / 7) + 1;
}

function dateFromKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function mulberry32(seed) {
  return function next() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
