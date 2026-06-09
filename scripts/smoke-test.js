const baseUrl = process.env.APP_URL || "http://localhost:3000";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function run() {
  const cleanupPrefixes = [];
  const admin = await request("/api/login", {
    method: "POST",
    body: {
      userName: "admin",
      password: "admin123"
    }
  });

  assertStatus(admin, 200, "admin login");
  assert(admin.body.token, "admin login returns token");

  await request("/api/dev/cleanup", {
    method: "POST",
    token: admin.body.token,
    body: {
      prefixes: ["Smoke-", "Managed-"]
    }
  });

  const resources = await request("/api/resources");
  assertStatus(resources, 200, "resources");
  const blockedDates = resources.body.blockedDates || [];
  const blockedDateKeys = blockedDates.map((blockedDate) => blockedDate.date);
  assert(resources.body.resources.washer.includes("WM 1"), "resources include WM 1");
  assert(resources.body.resources.washer.includes("WM 2"), "resources include WM 2");
  assert(resources.body.resources.washer.includes("WM 3"), "resources include WM 3");
  assert(resources.body.slots.washer.length === 3, "washer has three configured slots");
  assert(resources.body.resources.drying_room.includes("Trockenraum 1"), "resources include Trockenraum 1");
  assert(resources.body.resources.drying_room.includes("Trockenraum 2"), "resources include Trockenraum 2");
  assert(resources.body.resources.drying_room.includes("Trockenraum 3"), "resources include Trockenraum 3");
  assert(resources.body.slots.drying_room.length === 3, "drying room has three configured slots");
  assert(resources.body.resources.tumbler.includes("Tumbler 1"), "resources include Tumbler 1");
  assert(resources.body.resources.tumbler.includes("Tumbler 2"), "resources include Tumbler 2");
  assert(resources.body.slots.tumbler.length === 3, "tumbler has three configured slots");
  assert(blockedDateKeys.includes("2026-08-01"), "resources include seeded blocked dates");

  const managedUserName = `Managed-${Date.now()}`;
  cleanupPrefixes.push(managedUserName);
  const users = await request("/api/admin/users", {
    token: admin.body.token
  });

  assertStatus(users, 200, "admin lists users");
  assert(Array.isArray(users.body.users), "admin users response is an array");

  const listedBlockedDates = await request("/api/admin/blocked-dates", {
    token: admin.body.token
  });

  assertStatus(listedBlockedDates, 200, "admin lists blocked dates");
  assert(Array.isArray(listedBlockedDates.body.blockedDates), "blocked dates response is an array");

  const backup = await rawRequest("/api/admin/backup", {
    token: admin.body.token
  });

  assertStatus(backup, 200, "admin downloads backup");
  assert(backup.headers.get("content-disposition").includes("washraum-backup"), "backup has download filename");
  assert((await backup.body.arrayBuffer()).byteLength > 0, "backup is not empty");

  const smokeBlockedDate = nextBookableDate(blockedDateKeys, 120);
  const smokeBlockedDateKey = dateKey(smokeBlockedDate);
  await request(`/api/admin/blocked-dates/${smokeBlockedDateKey}`, {
    method: "DELETE",
    token: admin.body.token
  });

  const createBlockedDate = await request("/api/admin/blocked-dates", {
    method: "POST",
    token: admin.body.token,
    body: {
      date: smokeBlockedDateKey,
      label: "Smoke Sperrtag"
    }
  });

  assertStatus(createBlockedDate, 201, "admin creates blocked date");
  assert(createBlockedDate.body.blockedDate.date === smokeBlockedDateKey, "blocked date uses submitted date");

  const createUser = await request("/api/admin/users", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: managedUserName,
      displayName: "Smoke Partei",
      apartmentLabel: "Partei 20",
      password: "secret123",
      role: "user",
      active: true
    }
  });

  assertStatus(createUser, 201, "admin creates user");
  assert(createUser.body.user.user_name === managedUserName, "created user name");
  assert(createUser.body.user.display_name === "Smoke Partei", "created user display name");
  assert(createUser.body.user.apartment_label === "Partei 20", "created user apartment label");

  const updateUser = await request(`/api/admin/users/${createUser.body.user.id}`, {
    method: "PATCH",
    token: admin.body.token,
    body: {
      userName: managedUserName,
      displayName: "Smoke Partei Aktualisiert",
      apartmentLabel: "Partei 21",
      password: "secret456",
      role: "admin",
      active: true
    }
  });

  assertStatus(updateUser, 200, "admin updates user");
  assert(updateUser.body.user.role === "admin", "updated user role");
  assert(updateUser.body.user.display_name === "Smoke Partei Aktualisiert", "updated user display name");
  assert(updateUser.body.user.apartment_label === "Partei 21", "updated user apartment label");

  const managedLogin = await request("/api/login", {
    method: "POST",
    body: {
      userName: managedUserName,
      password: "secret456"
    }
  });

  assertStatus(managedLogin, 200, "managed user can log in with updated password");
  assert(managedLogin.body.user.role === "admin", "managed user updated role is effective");

  const changePassword = await request("/api/me/password", {
    method: "POST",
    token: managedLogin.body.token,
    body: {
      currentPassword: "secret456",
      newPassword: "secret789"
    }
  });

  assertStatus(changePassword, 200, "managed user changes own password");

  const managedLoginAfterPasswordChange = await request("/api/login", {
    method: "POST",
    body: {
      userName: managedUserName,
      password: "secret789"
    }
  });

  assertStatus(managedLoginAfterPasswordChange, 200, "managed user can log in with changed password");

  const deactivateUser = await request(`/api/admin/users/${createUser.body.user.id}`, {
    method: "PATCH",
    token: admin.body.token,
    body: {
      userName: managedUserName,
      role: "admin",
      active: false
    }
  });

  assertStatus(deactivateUser, 200, "admin deactivates managed user");
  assert(deactivateUser.body.user.active === 0, "managed user is inactive");

  const inactiveLogin = await request("/api/login", {
    method: "POST",
    body: {
      userName: managedUserName,
      password: "secret789"
    }
  });

  assertStatus(inactiveLogin, 403, "inactive user cannot log in");
  assert(inactiveLogin.body.error === "user_inactive", "inactive login error code");

  const reactivateUser = await request(`/api/admin/users/${createUser.body.user.id}`, {
    method: "PATCH",
    token: admin.body.token,
    body: {
      userName: managedUserName,
      role: "admin",
      active: true
    }
  });

  assertStatus(reactivateUser, 200, "admin reactivates managed user");

  const uniqueName = `Smoke-${Date.now()}`;
  cleanupPrefixes.push(uniqueName);
  const bookingDate = nextBookableDate([...blockedDateKeys, smokeBlockedDateKey]);
  const slotOne = rangeForDate(bookingDate, "07:00", "12:00");

  const create = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: slotOne.startAt,
      endAt: slotOne.endAt
    }
  });

  assertStatus(create, 201, "admin creates booking");
  assert(create.body.booking.user_name === uniqueName, "admin booking uses target user name");

  const sameSlotOtherWasher = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "washer",
      resourceId: "WM 2",
      startAt: slotOne.startAt,
      endAt: slotOne.endAt
    }
  });

  assertStatus(sameSlotOtherWasher, 201, "same washer slot on another resource is allowed");

  const sameSlotThirdWasher = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "washer",
      resourceId: "WM 3",
      startAt: slotOne.startAt,
      endAt: slotOne.endAt
    }
  });

  assertStatus(sameSlotThirdWasher, 201, "third washer on same day is allowed");

  const duplicateSameWasher = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-other`,
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: slotOne.startAt,
      endAt: slotOne.endAt
    }
  });

  assertStatus(duplicateSameWasher, 400, "same washer same date same slot is blocked");
  assert(duplicateSameWasher.body.error === "time_range_already_booked", "duplicate washer slot error code");

  const slotTwo = rangeForDate(bookingDate, "12:00", "17:00");
  const fourthWasherForUser = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "washer",
      resourceId: "WM 1",
      startAt: slotTwo.startAt,
      endAt: slotTwo.endAt
    }
  });

  assertStatus(fourthWasherForUser, 400, "fourth washer booking on same day is blocked");
  assert(fourthWasherForUser.body.error === "washer_daily_limit_reached", "washer daily limit error code");

  const secondSequenceRange = rangeForDate(nextBookableDate([...blockedDateKeys, smokeBlockedDateKey], 36), "07:00", "12:00");
  const secondFutureSequence = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "washer",
      resourceId: "WM 2",
      startAt: secondSequenceRange.startAt,
      endAt: secondSequenceRange.endAt
    }
  });

  assertStatus(secondFutureSequence, 400, "second future wash sequence is blocked");
  assert(secondFutureSequence.body.error === "only_one_future_sequence_allowed", "future sequence error code");

  const dryingRange = rangeForDate(bookingDate, "12:00", "17:00");
  const dryingAfterWasher = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "drying_room",
      resourceId: "Trockenraum 1",
      startAt: dryingRange.startAt,
      endAt: dryingRange.endAt
    }
  });

  assertStatus(dryingAfterWasher, 201, "drying room booking after washer booking is allowed");

  const dryingName = `${uniqueName}-drying`;
  const dryingDate = nextBookableDate([...blockedDateKeys, smokeBlockedDateKey], 40);
  const dryingSlotOne = rangeForDate(dryingDate, "07:00", "12:00");
  const firstDrying = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: dryingName,
      resourceType: "drying_room",
      resourceId: "Trockenraum 1",
      startAt: dryingSlotOne.startAt,
      endAt: dryingSlotOne.endAt
    }
  });

  assertStatus(firstDrying, 201, "first drying room booking is allowed");

  const sameSlotOtherDryingRoom = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${dryingName}-other-room`,
      resourceType: "drying_room",
      resourceId: "Trockenraum 2",
      startAt: dryingSlotOne.startAt,
      endAt: dryingSlotOne.endAt
    }
  });

  assertStatus(sameSlotOtherDryingRoom, 201, "same drying slot on another resource is allowed");

  const duplicateDryingRoom = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${dryingName}-duplicate`,
      resourceType: "drying_room",
      resourceId: "Trockenraum 1",
      startAt: dryingSlotOne.startAt,
      endAt: dryingSlotOne.endAt
    }
  });

  assertStatus(duplicateDryingRoom, 400, "same drying room same slot is blocked");
  assert(duplicateDryingRoom.body.error === "time_range_already_booked", "duplicate drying room error code");

  const secondDryingRange = rangeForDate(nextBookableDate([...blockedDateKeys, smokeBlockedDateKey], 41), "12:00", "17:00");
  const secondDryingForUser = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: dryingName,
      resourceType: "drying_room",
      resourceId: "Trockenraum 3",
      startAt: secondDryingRange.startAt,
      endAt: secondDryingRange.endAt
    }
  });

  assertStatus(secondDryingForUser, 400, "second future drying room booking is blocked");
  assert(secondDryingForUser.body.error === "only_one_future_sequence_allowed", "drying future booking error code");

  const tumblerName = `${uniqueName}-tumbler`;
  const tumblerDate = nextBookableDate([...blockedDateKeys, smokeBlockedDateKey], 45);
  const tumblerSlotOne = rangeForDate(tumblerDate, "07:00", "12:00");
  const firstTumbler = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: tumblerName,
      resourceType: "tumbler",
      resourceId: "Tumbler 1",
      startAt: tumblerSlotOne.startAt,
      endAt: tumblerSlotOne.endAt
    }
  });

  assertStatus(firstTumbler, 201, "first tumbler booking is allowed");

  const sameSlotOtherTumbler = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${tumblerName}-other`,
      resourceType: "tumbler",
      resourceId: "Tumbler 2",
      startAt: tumblerSlotOne.startAt,
      endAt: tumblerSlotOne.endAt
    }
  });

  assertStatus(sameSlotOtherTumbler, 201, "same tumbler slot on another resource is allowed");

  const secondTumblerRange = rangeForDate(nextBookableDate([...blockedDateKeys, smokeBlockedDateKey], 46), "12:00", "17:00");
  const secondTumblerForUser = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: tumblerName,
      resourceType: "tumbler",
      resourceId: "Tumbler 2",
      startAt: secondTumblerRange.startAt,
      endAt: secondTumblerRange.endAt
    }
  });

  assertStatus(secondTumblerForUser, 400, "second future tumbler booking is blocked");
  assert(secondTumblerForUser.body.error === "only_one_future_sequence_allowed", "tumbler future booking error code");

  const invalidResource = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-invalid`,
      resourceType: "washer",
      resourceId: "WM-99",
      startAt: slotOne.startAt,
      endAt: slotOne.endAt
    }
  });

  assertStatus(invalidResource, 400, "invalid resource is blocked");
  assert(invalidResource.body.error === "invalid_resource_id", "invalid resource error code");

  const past = pastRange();
  const pastBooking = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-past`,
      resourceType: "washer",
      resourceId: "WM 2",
      startAt: past.startAt,
      endAt: past.endAt
    }
  });

  assertStatus(pastBooking, 400, "past booking is blocked");
  assert(pastBooking.body.error === "booking_must_be_in_future", "past booking error code");

  const sunday = nextSundayRange();
  const sundayBooking = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-sunday`,
      resourceType: "drying_room",
      resourceId: "Trockenraum 1",
      startAt: sunday.startAt,
      endAt: sunday.endAt
    }
  });

  assertStatus(sundayBooking, 400, "sunday booking is blocked");
  assert(sundayBooking.body.error === "sunday_not_allowed", "sunday error code");

  const holidayRange = rangeForDate(smokeBlockedDate, "07:00", "12:00");
  const holidayBooking = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-holiday`,
      resourceType: "tumbler",
      resourceId: "Tumbler 1",
      startAt: holidayRange.startAt,
      endAt: holidayRange.endAt
    }
  });

  assertStatus(holidayBooking, 400, "blocked holiday booking is blocked");
  assert(holidayBooking.body.error === "blocked_date", "blocked holiday error code");

  const deleteBlockedDate = await request(`/api/admin/blocked-dates/${smokeBlockedDateKey}`, {
    method: "DELETE",
    token: admin.body.token
  });

  assertStatus(deleteBlockedDate, 200, "admin deletes blocked date");

  const cleanup = await request("/api/dev/cleanup", {
    method: "POST",
    token: admin.body.token,
    body: {
      prefixes: cleanupPrefixes
    }
  });

  if (![200, 404].includes(cleanup.status)) {
    assertStatus(cleanup, 200, "dev cleanup");
  }

  console.log("Smoke test passed");
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

function nextBookableDate(blockedDates = [], baseOffset = 30) {
  const date = new Date();
  date.setDate(date.getDate() + baseOffset + (Date.now() % 7));
  date.setHours(0, 0, 0, 0);

  while (date.getDay() === 0 || blockedDates.includes(dateKey(date))) {
    date.setDate(date.getDate() + 1);
  }

  return date;
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

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function nextBlockedDateRange(blockedDates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const blockedDate of blockedDates) {
    const date = dateFromKey(blockedDate);
    if (date > today && date.getDay() !== 0) {
      return rangeForDate(date, "07:00", "12:00");
    }
  }

  throw new Error("no future non-sunday blocked date configured for smoke test");
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

function nextSundayRange() {
  const date = new Date();
  date.setDate(date.getDate() + ((7 - date.getDay()) || 7));
  date.setHours(10, 0, 0, 0);

  return {
    startAt: date.toISOString(),
    endAt: new Date(date.getTime() + 1000 * 60 * 90).toISOString()
  };
}

function pastRange() {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  date.setHours(10, 0, 0, 0);

  return {
    startAt: date.toISOString(),
    endAt: new Date(date.getTime() + 1000 * 60 * 90).toISOString()
  };
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
