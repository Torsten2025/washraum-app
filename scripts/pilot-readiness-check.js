const http = require("http");
const https = require("https");

const appUrl = String(process.env.APP_URL || "https://washraum-app.onrender.com").replace(/\/$/, "");
const adminUser = process.env.ADMIN_USER || process.env.SEED_ADMIN_NAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "";
let usedTlsFallback = false;

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function run() {
  const results = [];

  const health = await jsonRequest("/api/health");
  results.push(["health endpoint returns ok", health.ok === true]);
  results.push(["production mode is enabled", health.production === true]);
  results.push(["Render SQLite disk is used", health.sqlitePath === "/var/data/washraum.sqlite"]);

  const resources = await jsonRequest("/api/resources");
  results.push(["three default washers are available", ["WM 1", "WM 2", "WM 3"].every((id) => resources.resources.washer.includes(id))]);
  results.push(["default drying rooms are available", ["Trockenraum 1", "Trockenraum 2", "Trockenraum 3"].every((id) => resources.resources.drying_room.includes(id))]);
  results.push(["default tumblers are available", ["Tumbler 1", "Tumbler 2", "Tumbler 3"].every((id) => resources.resources.tumbler.includes(id))]);
  results.push(["blocked dates are exposed", Array.isArray(resources.blockedDates)]);

  if (adminPassword) {
    const login = await jsonRequest("/api/login", {
      method: "POST",
      body: {
        userName: adminUser,
        password: adminPassword
      }
    });
    results.push(["admin login succeeds", login.ok === true && Boolean(login.token)]);

    const backup = await rawRequest("/api/admin/backup", {
      token: login.token
    });
    results.push(["admin backup endpoint responds", backup.status === 200]);
  } else {
    results.push(["admin login and backup check skipped because ADMIN_PASSWORD is not set", true, "WARN"]);
  }

  if (usedTlsFallback) {
    results.push(["TLS certificate verification fallback was used by local Node", true, "WARN"]);
  }

  let failed = false;
  for (const [label, ok, level = "OK"] of results) {
    const prefix = ok ? level : "FAIL";
    console.log(`${prefix} ${label}`);
    failed = failed || !ok;
  }

  if (failed) {
    process.exit(1);
  }

  console.log("");
  console.log(`Pilot readiness check passed for ${appUrl}`);
}

async function jsonRequest(path, options = {}) {
  const response = await rawRequest(path, options);
  const body = JSON.parse(response.body || "{}");
  if (response.status < 200 || response.status >= 300) {
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

  const url = new URL(`${appUrl}${path}`);
  const body = options.body ? JSON.stringify(options.body) : "";
  const client = url.protocol === "http:" ? http : https;

  return requestOnce({ url, client, method: options.method || "GET", headers, body, allowTlsFallback: false })
    .catch((error) => {
      if (url.protocol === "https:" && isCertificateError(error)) {
        usedTlsFallback = true;
        return requestOnce({ url, client, method: options.method || "GET", headers, body, allowTlsFallback: true });
      }

      throw error;
    });
}

function requestOnce({ url, client, method, headers, body, allowTlsFallback }) {
  return new Promise((resolve, reject) => {
    const request = client.request(url, {
      method,
      rejectUnauthorized: !allowTlsFallback,
      headers: {
        ...headers,
        ...(body ? { "Content-Length": Buffer.byteLength(body) } : {})
      }
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode || 0,
          headers: response.headers,
          body: responseBody
        });
      });
    });

    request.on("error", reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function isCertificateError(error) {
  return ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(error.code)
    || String(error.message || "").includes("unable to verify the first certificate");
}
