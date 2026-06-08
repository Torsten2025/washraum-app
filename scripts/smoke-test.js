const baseUrl = process.env.APP_URL || "http://localhost:3000";

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
  assert(admin.body.token, "admin login returns token");

  const resources = await request("/api/resources");
  assertStatus(resources, 200, "resources");
  assert(resources.body.resources.washer.includes("WM-1"), "resources include WM-1");
  assert(resources.body.resources.drying_room.includes("TR-1"), "resources include TR-1");

  const uniqueName = `Smoke-${Date.now()}`;
  const startAt = nextBookableIso();
  const endAt = new Date(new Date(startAt).getTime() + 1000 * 60 * 90).toISOString();

  const create = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "washer",
      resourceId: "WM-1",
      startAt,
      endAt
    }
  });

  assertStatus(create, 201, "admin creates booking");
  assert(create.body.booking.user_name === uniqueName, "admin booking uses target user name");

  const second = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: uniqueName,
      resourceType: "drying_room",
      resourceId: "TR-1",
      startAt: new Date(new Date(startAt).getTime() + 1000 * 60 * 60 * 3).toISOString(),
      endAt: new Date(new Date(startAt).getTime() + 1000 * 60 * 60 * 4).toISOString()
    }
  });

  assertStatus(second, 400, "second future booking is blocked");
  assert(second.body.error === "only_one_future_booking_allowed", "second booking error code");

  const invalidResource = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-invalid`,
      resourceType: "washer",
      resourceId: "WM-99",
      startAt,
      endAt
    }
  });

  assertStatus(invalidResource, 400, "invalid resource is blocked");
  assert(invalidResource.body.error === "invalid_resource_id", "invalid resource error code");

  const sunday = nextSundayRange();
  const sundayBooking = await request("/api/admin/addBooking", {
    method: "POST",
    token: admin.body.token,
    body: {
      userName: `${uniqueName}-sunday`,
      resourceType: "drying_room",
      resourceId: "TR-1",
      startAt: sunday.startAt,
      endAt: sunday.endAt
    }
  });

  assertStatus(sundayBooking, 400, "sunday booking is blocked");
  assert(sundayBooking.body.error === "sunday_not_allowed", "sunday error code");

  console.log("Smoke test passed");
}

async function request(path, options = {}) {
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

  const body = await response.json();
  return {
    status: response.status,
    body
  };
}

function nextBookableIso() {
  const date = new Date();
  date.setDate(date.getDate() + 30 + (Date.now() % 23));
  date.setHours(8 + (Date.now() % 8), Date.now() % 60, 0, 0);

  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
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
