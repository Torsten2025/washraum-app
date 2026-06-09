const baseUrl = process.env.APP_URL || "http://localhost:3000";
const testPrefix = "PartyTest-";
const password = "secret123";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function run() {
  const admin = await request("/api/login", {
    method: "POST",
    body: {
      userName: "admin",
      password: "admin123"
    }
  });

  assertStatus(admin, 200, "admin login");
  assert(admin.body.token, "admin token exists");

  await cleanup(admin.body.token);

  const resources = await request("/api/resources");
  assertStatus(resources, 200, "resources");
  assert(resources.body.resources.washer.length === 3, "three washers configured");
  assert(resources.body.resources.drying_room.length === 3, "three drying rooms configured");
  assert(resources.body.resources.tumbler.length === 2, "two tumblers configured");
  assert(resources.body.slots.washer.length === 3, "three washer slots configured");

  const blockedDateKeys = (resources.body.blockedDates || []).map((blockedDate) => blockedDate.date);
  const parties = await createParties(admin.body.token);
  const partyTokens = await loginParties(parties);

  await assertPartyMetadata(admin.body.token, parties);
  await exerciseWasherCapacity({ parties, partyTokens, blockedDateKeys });
  await exerciseFutureLimits({ parties, partyTokens, blockedDateKeys });
  await exerciseClosedDays({ partyToken: partyTokens[0], blockedDateKeys });

  const bookings = await request("/api/bookings");
  assertStatus(bookings, 200, "bookings list");
  const testBookings = bookings.body.bookings.filter((booking) => booking.user_name.startsWith(testPrefix));
  assert(testBookings.length >= 26, "test creates a realistic set of bookings");
  assert(testBookings.some((booking) => booking.apartment_label === "Partei 01"), "bookings include apartment labels");
  assert(testBookings.some((booking) => booking.user_display_name === "Test Partei 01"), "bookings include display names");

  await cleanup(admin.body.token);
  console.log("20-party rule test passed");
}

async function createParties(adminToken) {
  const parties = [];

  for (let index = 1; index <= 20; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const userName = `${testPrefix}${suffix}`;
    const response = await request("/api/admin/users", {
      method: "POST",
      token: adminToken,
      body: {
        userName,
        displayName: `Test Partei ${suffix}`,
        apartmentLabel: `Partei ${suffix}`,
        password,
        role: "user",
        active: true
      }
    });

    assertStatus(response, 201, `create ${userName}`);
    assert(response.body.user.apartment_label === `Partei ${suffix}`, `${userName} apartment label`);
    parties.push({ userName, displayName: `Test Partei ${suffix}`, apartmentLabel: `Partei ${suffix}` });
  }

  return parties;
}

async function loginParties(parties) {
  const tokens = [];

  for (const party of parties) {
    const login = await request("/api/login", {
      method: "POST",
      body: {
        userName: party.userName,
        password
      }
    });

    assertStatus(login, 200, `${party.userName} login`);
    assert(login.body.user.apartmentLabel === party.apartmentLabel, `${party.userName} login apartment label`);
    tokens.push(login.body.token);
  }

  return tokens;
}

async function assertPartyMetadata(adminToken, parties) {
  const users = await request("/api/admin/users", {
    token: adminToken
  });

  assertStatus(users, 200, "admin users");
  const created = users.body.users.filter((user) => user.user_name.startsWith(testPrefix));
  assert(created.length === parties.length, "admin sees all 20 test parties");
  assert(created[0].apartment_label === "Partei 01", "parties sort by apartment label");
}

async function exerciseWasherCapacity({ parties, partyTokens, blockedDateKeys }) {
  const dates = bookableDates(blockedDateKeys, 3, 30);
  const washerSlots = ["07:00|12:00", "12:00|17:00", "17:00|21:00"];
  const washers = ["WM 1", "WM 2", "WM 3"];

  for (let index = 0; index < parties.length; index += 1) {
    const date = dates[Math.floor(index / 9)];
    const slotIndex = index % 9;
    const [start, end] = washerSlots[Math.floor(slotIndex / 3)].split("|");
    const resourceId = washers[slotIndex % 3];
    const range = rangeForDate(date, start, end);

    const booking = await request("/api/bookings", {
      method: "POST",
      token: partyTokens[index],
      body: {
        resourceType: "washer",
        resourceId,
        startAt: range.startAt,
        endAt: range.endAt
      }
    });

    assertStatus(booking, 201, `${parties[index].userName} washer booking`);
  }

  const duplicateRange = rangeForDate(dates[0], "07:00", "12:00");
  const duplicate = await request("/api/bookings", {
    method: "POST",
    token: partyTokens[19],
    body: {
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: duplicateRange.startAt,
      endAt: duplicateRange.endAt
    }
  });

  assertStatus(duplicate, 400, "duplicate washer slot blocked");
  assert(duplicate.body.error === "time_range_already_booked", "duplicate washer error");

  const dailyLimitDate = bookableDates(blockedDateKeys, 1, 70)[0];
  const first = await bookingFor(partyTokens[0], "washer", "WM 1", dailyLimitDate, "07:00", "12:00");
  const second = await bookingFor(partyTokens[0], "washer", "WM 2", dailyLimitDate, "12:00", "17:00");
  const third = await bookingFor(partyTokens[0], "washer", "WM 3", dailyLimitDate, "17:00", "21:00");
  assertStatus(first, 201, "first daily washer booking");
  assertStatus(second, 201, "second daily washer booking");
  assertStatus(third, 201, "third daily washer booking");

  const fourthDateRange = rangeForDate(dailyLimitDate, "17:00", "21:00");
  const fourth = await request("/api/bookings", {
    method: "POST",
    token: partyTokens[0],
    body: {
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: fourthDateRange.startAt,
      endAt: fourthDateRange.endAt
    }
  });

  assertStatus(fourth, 400, "fourth daily washer booking blocked");
  assert(fourth.body.error === "washer_daily_limit_reached", "washer daily limit error");
}

async function exerciseFutureLimits({ parties, partyTokens, blockedDateKeys }) {
  const dates = bookableDates(blockedDateKeys, 4, 90);

  const drying = await bookingFor(partyTokens[1], "drying_room", "Trockenraum 1", dates[0], "07:00", "12:00");
  assertStatus(drying, 201, "first future drying room booking");

  const secondDrying = await bookingFor(partyTokens[1], "drying_room", "Trockenraum 2", dates[1], "12:00", "17:00");
  assertStatus(secondDrying, 400, "second future drying room booking blocked");
  assert(secondDrying.body.error === "only_one_future_booking_allowed", "drying future limit error");

  const tumbler = await bookingFor(partyTokens[2], "tumbler", "Tumbler 1", dates[2], "07:00", "12:00");
  assertStatus(tumbler, 201, "first future tumbler booking");

  const secondTumbler = await bookingFor(partyTokens[2], "tumbler", "Tumbler 2", dates[3], "12:00", "17:00");
  assertStatus(secondTumbler, 400, "second future tumbler booking blocked");
  assert(secondTumbler.body.error === "only_one_future_booking_allowed", "tumbler future limit error");

  const sameSlotOtherDrying = await bookingFor(partyTokens[3], "drying_room", "Trockenraum 2", dates[0], "07:00", "12:00");
  assertStatus(sameSlotOtherDrying, 201, "same drying slot on another room allowed for another party");

  const sameSlotSameDrying = await bookingFor(partyTokens[4], "drying_room", "Trockenraum 1", dates[0], "07:00", "12:00");
  assertStatus(sameSlotSameDrying, 400, "same drying room same slot blocked");
  assert(sameSlotSameDrying.body.error === "time_range_already_booked", "drying duplicate error");

  assert(parties[1].apartmentLabel === "Partei 02", "future limit used expected test party");
}

async function exerciseClosedDays({ partyToken, blockedDateKeys }) {
  const sunday = nextSunday();
  const sundayBooking = await bookingFor(partyToken, "washer", "WM 1", sunday, "07:00", "12:00");
  assertStatus(sundayBooking, 400, "sunday booking blocked");
  assert(sundayBooking.body.error === "sunday_not_allowed", "sunday error");

  const blockedDate = nextFutureBlockedDate(blockedDateKeys);
  if (blockedDate) {
    const blockedBooking = await bookingFor(partyToken, "tumbler", "Tumbler 1", blockedDate, "07:00", "12:00");
    assertStatus(blockedBooking, 400, "blocked date booking blocked");
    assert(blockedBooking.body.error === "blocked_date", "blocked date error");
  }
}

async function bookingFor(token, resourceType, resourceId, date, start, end) {
  const range = rangeForDate(date, start, end);
  return request("/api/bookings", {
    method: "POST",
    token,
    body: {
      resourceType,
      resourceId,
      startAt: range.startAt,
      endAt: range.endAt
    }
  });
}

async function cleanup(adminToken) {
  await request("/api/dev/cleanup", {
    method: "POST",
    token: adminToken,
    body: {
      prefixes: [testPrefix]
    }
  });
}

async function request(path, options = {}) {
  const response = await rawRequest(path, options);
  const body = await response.body.json();
  return {
    status: response.status,
    body,
    headers: response.headers
  };
}

async function rawRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return {
    status: response.status,
    body: response,
    headers: response.headers
  };
}

function bookableDates(blockedDates, count, baseOffset) {
  const dates = [];
  const date = new Date();
  date.setDate(date.getDate() + baseOffset);
  date.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    if (date.getDay() !== 0 && !blockedDates.includes(dateKey(date))) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

function nextSunday() {
  const date = new Date();
  date.setDate(date.getDate() + ((7 - date.getDay()) || 7));
  date.setHours(0, 0, 0, 0);
  return date;
}

function nextFutureBlockedDate(blockedDates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const blockedDate of blockedDates) {
    const date = dateFromKey(blockedDate);
    if (date > today && date.getDay() !== 0) {
      return date;
    }
  }

  return null;
}

function rangeForDate(date, startTime, endTime) {
  return {
    startAt: withTime(date, startTime).toISOString(),
    endAt: withTime(date, endTime).toISOString()
  };
}

function withTime(date, time) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
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

function assertStatus(result, expectedStatus, label) {
  assert(
    result.status === expectedStatus,
    `${label}: expected HTTP ${expectedStatus}, got ${result.status} ${JSON.stringify(result.body)}`
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
