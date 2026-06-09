const baseUrl = process.env.APP_URL || "http://localhost:3000";
const testPrefix = "FullTest-";
const password = "secret123";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function run() {
  const admin = await login("admin", "admin123");
  await cleanup(admin.token);

  const resources = await request("/api/resources");
  assertStatus(resources, 200, "resources load");
  assert(resources.body.resources.washer.length === 3, "three washers");
  assert(resources.body.resources.drying_room.length === 3, "three drying rooms");
  assert(resources.body.resources.tumbler.length === 2, "two tumblers");

  const blockedDateKeys = (resources.body.blockedDates || []).map((entry) => entry.date);
  const userName = `${testPrefix}${Date.now()}`;
  const createUser = await request("/api/admin/users", {
    method: "POST",
    token: admin.token,
    body: {
      userName,
      displayName: "Full Test Partei",
      apartmentLabel: "Partei Test",
      password,
      role: "user",
      active: true
    }
  });
  assertStatus(createUser, 201, "admin creates test user");

  const resetPassword = await request(`/api/admin/users/${createUser.body.user.id}/reset-password`, {
    method: "POST",
    token: admin.token
  });
  assertStatus(resetPassword, 200, "admin resets password");
  assert(resetPassword.body.password.length >= 6, "reset password returned once");

  const user = await login(userName, resetPassword.body.password);
  const bookingDate = nextBookableDate(blockedDateKeys, 35);
  const washerRange = localRangeForDate(bookingDate, "07:00", "12:00");
  const washerBooking = await request("/api/bookings", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: washerRange.startAt,
      endAt: washerRange.endAt
    }
  });
  assertStatus(washerBooking, 201, "user books washer with browser-style local datetime");

  const bookings = await request("/api/bookings");
  assertStatus(bookings, 200, "bookings load");
  const savedWasher = bookings.body.bookings.find((entry) => entry.id === washerBooking.body.booking.id);
  assert(savedWasher, "saved washer booking appears in /api/bookings");
  assert(zonedTimeKey(savedWasher.start_at) === "07:00", "saved washer starts at 07:00 in Zurich time");
  assert(zonedTimeKey(savedWasher.end_at) === "12:00", "saved washer ends at 12:00 in Zurich time");
  assert(monthProjectionHasBooking(savedWasher, bookingDate, "07:00", "12:00"), "monthly plan projection contains washer booking");

  const duplicate = await request("/api/bookings", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: washerRange.startAt,
      endAt: washerRange.endAt
    }
  });
  assertStatus(duplicate, 400, "duplicate washer slot is blocked");
  assert(duplicate.body.error === "time_range_already_booked", "duplicate washer error code");

  const release = await request("/api/user/releaseBooking", {
    method: "POST",
    token: user.token,
    body: { id: savedWasher.id }
  });
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    assertStatus(release, 200, "WhatsApp release sends when configured");
  } else {
    assertStatus(release, 503, "WhatsApp release reports missing configuration");
    assert(release.body.error === "whatsapp_not_configured", "WhatsApp missing config error code");
  }

  const otherUserName = `${testPrefix}${Date.now()}-other`;
  const createOther = await request("/api/admin/users", {
    method: "POST",
    token: admin.token,
    body: {
      userName: otherUserName,
      displayName: "Full Test Andere Partei",
      apartmentLabel: "Partei Andere",
      password,
      role: "user",
      active: true
    }
  });
  assertStatus(createOther, 201, "admin creates second user");
  const other = await login(otherUserName, password);

  const foreignDelete = await request("/api/user/deleteBooking", {
    method: "POST",
    token: other.token,
    body: { id: savedWasher.id }
  });
  assertStatus(foreignDelete, 403, "foreign user cannot delete washer booking");

  const ownDelete = await request("/api/user/deleteBooking", {
    method: "POST",
    token: user.token,
    body: { id: savedWasher.id }
  });
  assertStatus(ownDelete, 200, "owner deletes washer booking");

  const overview = await request("/api/admin/overview", {
    token: admin.token
  });
  assertStatus(overview, 200, "admin overview loads");
  assert(overview.body.status.resources.washers === 3, "overview has washer count");

  const backup = await rawRequest("/api/admin/backup", {
    token: admin.token
  });
  assertStatus(backup, 200, "admin backup downloads");
  assert((await backup.body.arrayBuffer()).byteLength > 0, "backup has bytes");

  const deactivate = await request(`/api/admin/users/${createOther.body.user.id}`, {
    method: "PATCH",
    token: admin.token,
    body: {
      userName: otherUserName,
      role: "user",
      active: false
    }
  });
  assertStatus(deactivate, 200, "admin deactivates user");

  const inactiveLogin = await request("/api/login", {
    method: "POST",
    body: {
      userName: otherUserName,
      password
    }
  });
  assertStatus(inactiveLogin, 403, "inactive user cannot login");

  await cleanup(admin.token);
  console.log("Full app test passed");
}

async function login(userName, passwordValue) {
  const response = await request("/api/login", {
    method: "POST",
    body: {
      userName,
      password: passwordValue
    }
  });
  assertStatus(response, 200, `${userName} login`);
  assert(response.body.token, `${userName} login token`);
  return response.body;
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

function nextBookableDate(blockedDates, baseOffset) {
  const date = new Date();
  date.setDate(date.getDate() + baseOffset);
  date.setHours(0, 0, 0, 0);

  while (date.getDay() === 0 || blockedDates.includes(dateKey(date))) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function localRangeForDate(date, startTime, endTime) {
  return {
    startAt: `${dateKey(date)}T${startTime}`,
    endAt: `${dateKey(date)}T${endTime}`
  };
}

function monthProjectionHasBooking(booking, date, startTime, endTime) {
  return booking.resource_type === "washer"
    && booking.resource_id === "WM 1"
    && (dateKey(new Date(booking.start_at)) === dateKey(date) || utcDateKey(new Date(booking.start_at)) === dateKey(date))
    && (zonedTimeKey(booking.start_at) === startTime || utcTimeKey(booking.start_at) === startTime)
    && (zonedTimeKey(booking.end_at) === endTime || utcTimeKey(booking.end_at) === endTime);
}

function zonedTimeKey(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
}

function utcTimeKey(value) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function utcDateKey(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
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
