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
  const testWasher = `${testPrefix}WM-${Date.now()}`;
  const createResource = await request("/api/admin/resources", {
    method: "POST",
    token: admin.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher
    }
  });
  assertStatus(createResource, 201, "admin creates additional washer");

  const resourcesAfterCreate = await request("/api/resources");
  assertStatus(resourcesAfterCreate, 200, "resources reload after additional washer");
  assert(resourcesAfterCreate.body.resources.washer.includes(testWasher), "additional washer appears in resources");

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
  assert(user.user.onboardingSeenAt === "", "new user has not seen onboarding");

  const markOnboardingSeen = await request("/api/me/onboarding-seen", {
    method: "POST",
    token: user.token
  });
  assertStatus(markOnboardingSeen, 200, "user completes onboarding");
  assert(markOnboardingSeen.body.onboardingSeenAt, "onboarding completion timestamp returned");

  const sessionAfterOnboarding = await request("/api/session", {
    token: user.token
  });
  assertStatus(sessionAfterOnboarding, 200, "session loads after onboarding");
  assert(sessionAfterOnboarding.body.user.onboardingSeenAt, "session reports onboarding as seen");

  const bookingDate = nextBookableDate(blockedDateKeys, 35);
  const washerRange = localRangeForDate(bookingDate, "07:00", "12:00");
  const blockResource = await request(`/api/admin/resources/${createResource.body.resource.id}/availability`, {
    method: "PATCH",
    token: admin.token,
    body: {
      unavailable: true,
      reason: "FullTest: Wartung"
    }
  });
  assertStatus(blockResource, 200, "admin blocks unavailable resource");
  assert(blockResource.body.resource.unavailable_reason.includes("Wartung"), "blocked resource reason is stored");

  const resourcesAfterBlock = await request("/api/resources");
  assertStatus(resourcesAfterBlock, 200, "resources reload after block");
  assert(!resourcesAfterBlock.body.resources.washer.includes(testWasher), "blocked washer is not bookable");
  assert(resourcesAfterBlock.body.allResources.washer.includes(testWasher), "blocked washer remains visible as known resource");

  const blockedWasherBooking = await request("/api/bookings", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
      startAt: washerRange.startAt,
      endAt: washerRange.endAt
    }
  });
  assertStatus(blockedWasherBooking, 400, "blocked washer cannot be booked");
  assert(blockedWasherBooking.body.error === "resource_unavailable", "blocked washer error code");

  const releaseResource = await request(`/api/admin/resources/${createResource.body.resource.id}/availability`, {
    method: "PATCH",
    token: admin.token,
    body: {
      unavailable: false
    }
  });
  assertStatus(releaseResource, 200, "admin releases unavailable resource");

  const washerBooking = await request("/api/bookings", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
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
  assert(monthProjectionHasBooking(savedWasher, testWasher, bookingDate, "07:00", "12:00"), "monthly plan projection contains washer booking");

  const activityAfterBooking = await request("/api/activity", {
    token: user.token
  });
  assertStatus(activityAfterBooking, 200, "activity loads after booking");
  assert(activityAfterBooking.body.activities.some((entry) => {
    return entry.event_type === "booking_created"
      && entry.resource_id === testWasher
      && entry.message.includes("wurde gebucht");
  }), "booking confirmation appears in activity feed");

  const createLog = await request("/api/machine-logs", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
      eventDate: dateKey(bookingDate),
      note: "FullTest-Protokoll: Maschine vibrierte stark beim Schleudern."
    }
  });
  assertStatus(createLog, 201, "user creates machine log entry");

  const logs = await request("/api/machine-logs", {
    token: user.token
  });
  assertStatus(logs, 200, "machine logs load");
  assert(logs.body.logs.some((entry) => entry.resource_id === testWasher && entry.note.includes("vibrierte")), "machine log appears in logbook");

  const blockFromLog = await request("/api/machine-logs", {
    method: "POST",
    token: admin.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
      eventDate: dateKey(bookingDate),
      availabilityAction: "block_resource",
      note: "FullTest-Protokoll: Wasser tritt unten aus."
    }
  });
  assertStatus(blockFromLog, 201, "admin blocks resource from logbook");
  assert(blockFromLog.body.availabilityAction === "block_resource", "logbook block action is returned");
  assert(blockFromLog.body.logEntry.note.includes("[Gesperrt]"), "logbook block entry is marked");

  const resourcesAfterLogBlock = await request("/api/resources");
  assertStatus(resourcesAfterLogBlock, 200, "resources reload after logbook block");
  assert(!resourcesAfterLogBlock.body.resources.washer.includes(testWasher), "logbook-blocked washer is not bookable");

  const releaseFromLog = await request("/api/machine-logs", {
    method: "POST",
    token: admin.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
      eventDate: dateKey(bookingDate),
      availabilityAction: "release_resource",
      note: "FullTest-Protokoll: Dichtung ersetzt, Probelauf ok."
    }
  });
  assertStatus(releaseFromLog, 201, "admin releases resource from logbook");
  assert(releaseFromLog.body.availabilityAction === "release_resource", "logbook release action is returned");
  assert(releaseFromLog.body.logEntry.note.includes("[Freigegeben]"), "logbook release entry is marked");

  const resourcesAfterLogRelease = await request("/api/resources");
  assertStatus(resourcesAfterLogRelease, 200, "resources reload after logbook release");
  assert(resourcesAfterLogRelease.body.resources.washer.includes(testWasher), "logbook-released washer is bookable again");

  const createFeedback = await request("/api/pilot-feedback", {
    method: "POST",
    token: user.token,
    body: {
      message: "FullTest-Feedback: Buchung war verstaendlich, Monatsplan bitte weiter gut sichtbar lassen."
    }
  });
  assertStatus(createFeedback, 201, "user creates pilot feedback");

  const ownFeedback = await request("/api/pilot-feedback", {
    token: user.token
  });
  assertStatus(ownFeedback, 200, "user pilot feedback loads");
  assert(ownFeedback.body.feedback.some((entry) => entry.message.includes("Monatsplan")), "own feedback appears for user");

  const adminFeedback = await request("/api/pilot-feedback", {
    token: admin.token
  });
  assertStatus(adminFeedback, 200, "admin pilot feedback loads");
  assert(adminFeedback.body.feedback.some((entry) => entry.user_name === userName), "admin sees pilot feedback");

  const duplicate = await request("/api/bookings", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
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
  const adminWhatsappTest = await request("/api/admin/whatsapp-test", {
    method: "POST",
    token: admin.token
  });
  if (whatsappConfiguredForTest()) {
    assertStatus(release, 200, "WhatsApp release sends when configured");
    assert(release.body.activity.message.includes("frueher frei"), "release confirmation is returned");
    assertStatus(adminWhatsappTest, 200, "admin WhatsApp test sends when configured");
  } else {
    assertStatus(release, 503, "WhatsApp release reports missing configuration");
    assert(release.body.error === "whatsapp_not_configured", "WhatsApp missing config error code");
    assertStatus(adminWhatsappTest, 503, "admin WhatsApp test reports missing configuration");
    assert(adminWhatsappTest.body.error === "whatsapp_not_configured", "admin WhatsApp missing config error code");
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
  assert(ownDelete.body.activity.message.includes("wurde geloescht"), "delete confirmation is returned");

  const activityAfterDelete = await request("/api/activity", {
    token: user.token
  });
  assertStatus(activityAfterDelete, 200, "activity loads after delete");
  assert(activityAfterDelete.body.activities.some((entry) => {
    return entry.event_type === "booking_deleted"
      && entry.resource_id === testWasher
      && entry.message.includes("wurde geloescht");
  }), "delete confirmation appears in activity feed");

  const overview = await request("/api/admin/overview", {
    token: admin.token
  });
  assertStatus(overview, 200, "admin overview loads");
  assert(overview.body.status.resources.washers >= 4, "overview includes additional washer count");
  assert(overview.body.status.activities >= 2, "overview includes activity count");

  const analytics = await request("/api/admin/analytics?days=365", {
    token: admin.token
  });
  assertStatus(analytics, 200, "admin analytics loads");
  assert(analytics.body.analytics.usage.some((entry) => entry.resourceType === "washer"), "analytics includes washer usage");
  assert(analytics.body.analytics.totals.activeParties >= 1, "analytics includes active party count");

  const resetCandidate = await request("/api/bookings", {
    method: "POST",
    token: user.token,
    body: {
      resourceType: "washer",
      resourceId: testWasher,
      startAt: washerRange.startAt,
      endAt: washerRange.endAt
    }
  });
  assertStatus(resetCandidate, 201, "user creates booking for admin reset test");

  const invalidReset = await request("/api/admin/bookings/reset", {
    method: "POST",
    token: admin.token,
    body: {
      confirmation: "RESET"
    }
  });
  assertStatus(invalidReset, 400, "admin reset requires exact confirmation");
  assert(invalidReset.body.error === "invalid_reset_confirmation", "reset confirmation error code");

  const resetAllBookings = await request("/api/admin/bookings/reset", {
    method: "POST",
    token: admin.token,
    body: {
      confirmation: "ZURUECKSETZEN"
    }
  });
  assertStatus(resetAllBookings, 200, "admin resets all bookings");
  assert(resetAllBookings.body.deletedBookings >= 1, "admin reset reports deleted bookings");

  const bookingsAfterReset = await request("/api/bookings");
  assertStatus(bookingsAfterReset, 200, "bookings load after admin reset");
  assert(!bookingsAfterReset.body.bookings.some((entry) => entry.resource_id === testWasher), "admin reset removed test bookings");

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

function monthProjectionHasBooking(booking, resourceId, date, startTime, endTime) {
  return booking.resource_type === "washer"
    && booking.resource_id === resourceId
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

function whatsappConfiguredForTest() {
  const mode = process.env.WHATSAPP_RELEASE_MODE === "production" ? "production" : "test";
  const testTarget = process.env.WHATSAPP_TEST_TO || process.env.WHATSAPP_RELEASE_TO || "";
  const productionTarget = process.env.WHATSAPP_PRODUCTION_TO || process.env.WHATSAPP_GROUP_TO || "";
  const target = mode === "production" ? productionTarget : testTarget;

  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && target);
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
