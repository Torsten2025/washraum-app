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
  assert(resources.body.resources.tumbler.length === 3, "three tumblers configured");
  assert(resources.body.slots.washer.length === 3, "three washer slots configured");

  const blockedDateKeys = (resources.body.blockedDates || []).map((blockedDate) => blockedDate.date);
  const parties = await createParties(admin.body.token);
  const partyTokens = await loginParties(parties);

  await assertPartyMetadata(admin.body.token, parties);
  await exerciseWasherCapacity({ parties, partyTokens, blockedDateKeys });
  await exerciseFutureLimits({ parties, partyTokens, blockedDateKeys });
  await exerciseClosedDays({ partyToken: partyTokens[0], blockedDateKeys });
  await exerciseDeletePermissions({ partyTokens, blockedDateKeys });
  await exerciseAdminBooking({ adminToken: admin.body.token, parties, blockedDateKeys });
  await exerciseInactiveUser({ adminToken: admin.body.token, party: parties[8], partyToken: partyTokens[8], blockedDateKeys });
  await exercisePasswordSessionInvalidation({ party: parties[9], blockedDateKeys });

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

  const dailyLimitDate = bookableDates(blockedDateKeys, 1, 70)[0];
  const first = await bookingFor(partyTokens[0], "washer", "WM 1", dailyLimitDate, "07:00", "12:00");
  const second = await bookingFor(partyTokens[0], "washer", "WM 2", dailyLimitDate, "12:00", "17:00");
  const third = await bookingFor(partyTokens[0], "washer", "WM 3", dailyLimitDate, "17:00", "21:00");
  assertStatus(first, 201, "first daily washer booking");
  assertStatus(second, 201, "second daily washer booking");
  assertStatus(third, 201, "third daily washer booking");

  const duplicate = await bookingFor(partyTokens[1], "washer", "WM 1", dailyLimitDate, "07:00", "12:00");
  assertStatus(duplicate, 400, "duplicate washer slot blocked");
  assert(duplicate.body.error === "time_range_already_booked", "duplicate washer error");

  const fourth = await bookingFor(partyTokens[0], "washer", "WM 1", dailyLimitDate, "17:00", "21:00");
  assertStatus(fourth, 400, "fourth daily washer booking blocked");
  assert(fourth.body.error === "washer_daily_limit_reached", "washer daily limit error");

  for (let index = 1; index < parties.length; index += 1) {
    const bookingIndex = index - 1;
    const date = dates[Math.floor(bookingIndex / 9)];
    const slotIndex = bookingIndex % 9;
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
}

async function exerciseFutureLimits({ parties, partyTokens, blockedDateKeys }) {
  const dates = bookableDates(blockedDateKeys, 4, 30);

  const drying = await bookingFor(partyTokens[1], "drying_room", "Trockenraum 1", dates[0], "07:00", "12:00");
  assertStatus(drying, 201, "same-day drying room belongs to the active wash sequence");

  const parallelDrying = await bookingFor(partyTokens[1], "drying_room", "Trockenraum 2", dates[0], "07:00", "12:00");
  assertStatus(parallelDrying, 400, "same party cannot book two drying rooms at the same time");
  assert(parallelDrying.body.error === "drying_room_parallel_limit_reached", "parallel drying room error");

  const secondDrying = await bookingFor(partyTokens[1], "drying_room", "Trockenraum 2", dates[1], "12:00", "17:00");
  assertStatus(secondDrying, 400, "second future drying room booking blocked");
  assert(secondDrying.body.error === "only_one_future_sequence_allowed", "drying future limit error");

  const tumbler = await bookingFor(partyTokens[2], "tumbler", "Tumbler 1", dates[2], "07:00", "12:00");
  assertStatus(tumbler, 400, "tumbler on another future date is blocked by active sequence");
  assert(tumbler.body.error === "only_one_future_sequence_allowed", "tumbler different-day sequence error");

  const sameDayTumbler = await bookingFor(partyTokens[2], "tumbler", "Tumbler 1", dates[0], "12:00", "17:00");
  assertStatus(sameDayTumbler, 201, "same-day tumbler belongs to the active wash sequence");

  const secondTumbler = await bookingFor(partyTokens[2], "tumbler", "Tumbler 2", dates[3], "12:00", "17:00");
  assertStatus(secondTumbler, 400, "second future tumbler booking blocked");
  assert(secondTumbler.body.error === "only_one_future_sequence_allowed", "tumbler future limit error");

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

async function exerciseDeletePermissions({ partyTokens, blockedDateKeys }) {
  const date = bookableDates(blockedDateKeys, 1, 30)[0];
  const booking = await bookingFor(partyTokens[5], "drying_room", "Trockenraum 3", date, "17:00", "21:00");
  assertStatus(booking, 201, "booking for delete permission test");

  const foreignDelete = await deleteBooking(partyTokens[6], booking.body.booking.id);
  assertStatus(foreignDelete, 403, "foreign user cannot delete booking");
  assert(foreignDelete.body.error === "not_allowed", "foreign delete error");

  const ownDelete = await deleteBooking(partyTokens[5], booking.body.booking.id);
  assertStatus(ownDelete, 200, "owner can delete own booking");
}

async function exerciseAdminBooking({ adminToken, parties, blockedDateKeys }) {
  const date = bookableDates(blockedDateKeys, 1, 30)[0];
  const range = rangeForDate(date, "12:00", "17:00");
  const booking = await request("/api/admin/addBooking", {
    method: "POST",
    token: adminToken,
    body: {
      userName: parties[7].userName,
      resourceType: "drying_room",
      resourceId: "Trockenraum 1",
      startAt: range.startAt,
      endAt: range.endAt
    }
  });

  assertStatus(booking, 201, "admin books for another party");
  assert(booking.body.booking.user_name === parties[7].userName, "admin booking belongs to target party");
}

async function exerciseInactiveUser({ adminToken, party, partyToken, blockedDateKeys }) {
  const users = await request("/api/admin/users", {
    token: adminToken
  });
  const target = users.body.users.find((user) => user.user_name === party.userName);
  assert(target, "inactive test user exists");

  const deactivate = await request(`/api/admin/users/${target.id}`, {
    method: "PATCH",
    token: adminToken,
    body: {
      userName: party.userName,
      displayName: party.displayName,
      apartmentLabel: party.apartmentLabel,
      role: "user",
      active: false
    }
  });
  assertStatus(deactivate, 200, "deactivate user");

  const login = await request("/api/login", {
    method: "POST",
    body: {
      userName: party.userName,
      password
    }
  });
  assertStatus(login, 403, "inactive user cannot login");
  assert(login.body.error === "user_inactive", "inactive login error");

  const date = bookableDates(blockedDateKeys, 1, 30)[0];
  const booking = await bookingFor(partyToken, "drying_room", "Trockenraum 2", date, "17:00", "21:00");
  assertStatus(booking, 401, "inactive user's old session cannot book");
}

async function exercisePasswordSessionInvalidation({ party, blockedDateKeys }) {
  const firstLogin = await request("/api/login", {
    method: "POST",
    body: {
      userName: party.userName,
      password
    }
  });
  assertStatus(firstLogin, 200, "first password-session login");

  const secondLogin = await request("/api/login", {
    method: "POST",
    body: {
      userName: party.userName,
      password
    }
  });
  assertStatus(secondLogin, 200, "second password-session login");

  const newPassword = "secret456";
  const change = await request("/api/me/password", {
    method: "POST",
    token: secondLogin.body.token,
    body: {
      currentPassword: password,
      newPassword
    }
  });
  assertStatus(change, 200, "password change");

  const oldSession = await request("/api/session", {
    token: firstLogin.body.token
  });
  assertStatus(oldSession, 401, "older session invalidated");

  const loginWithOldPassword = await request("/api/login", {
    method: "POST",
    body: {
      userName: party.userName,
      password
    }
  });
  assertStatus(loginWithOldPassword, 401, "old password rejected");

  const loginWithNewPassword = await request("/api/login", {
    method: "POST",
    body: {
      userName: party.userName,
      password: newPassword
    }
  });
  assertStatus(loginWithNewPassword, 200, "new password accepted");

  const date = bookableDates(blockedDateKeys, 1, 30)[0];
  const booking = await bookingFor(loginWithNewPassword.body.token, "tumbler", "Tumbler 2", date, "17:00", "21:00");
  assertStatus(booking, 201, "new password session can book");
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

async function deleteBooking(token, id) {
  return request("/api/user/deleteBooking", {
    method: "POST",
    token,
    body: { id }
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
