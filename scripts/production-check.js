const appUrl = String(process.env.APP_URL || "").replace(/\/$/, "");
const adminUser = process.env.ADMIN_USER || process.env.SEED_ADMIN_NAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "";

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function run() {
  if (!appUrl) {
    throw new Error("APP_URL must be set, for example https://washraum-app.onrender.com");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD or SEED_ADMIN_PASSWORD must be set for production check login");
  }

  const health = await jsonRequest("/api/health");
  assert(health.ok === true, "health endpoint returns ok");
  assert(health.production === true, "health endpoint reports production mode");
  assert(health.sqlitePath === "/var/data/washraum.sqlite", "health endpoint uses Render SQLite path");

  const resources = await jsonRequest("/api/resources");
  assert(resources.resources.washer.includes("WM 1"), "resources include washers");
  assert(resources.resources.drying_room.includes("Trockenraum 1"), "resources include drying rooms");
  assert(resources.resources.tumbler.includes("Tumbler 1"), "resources include tumblers");
  assert(Array.isArray(resources.blockedDates), "resources include blocked dates");

  const login = await jsonRequest("/api/login", {
    method: "POST",
    body: {
      userName: adminUser,
      password: adminPassword
    }
  });
  assert(login.ok === true && login.token, "admin login succeeds");

  const session = await jsonRequest("/api/session", {
    token: login.token
  });
  assert(session.ok === true, "authenticated session succeeds");
  assert(session.user.role === "admin", "production check user is admin");

  const backup = await rawRequest("/api/admin/backup", {
    token: login.token
  });
  assert(backup.status === 200, "admin backup endpoint responds");
  assert(backup.headers.get("content-disposition").includes("washraum-backup"), "backup response has filename");

  console.log("Production check passed");
}

async function jsonRequest(path, options = {}) {
  const response = await rawRequest(path, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path}: expected success, got HTTP ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function rawRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return fetch(`${appUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Production check failed: ${message}`);
  }
}
