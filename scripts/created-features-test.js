const { execFileSync } = require("child_process");
const http = require("http");
const https = require("https");

const appUrl = String(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const liveUrl = String(process.env.LIVE_APP_URL || "https://washraum-app.onrender.com").replace(/\/$/, "");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const featureCatalog = [
  "Branding: GBMZ Maneggplatz 18 ohne alte Navigationspunkte",
  "Admin-Onboarding: 20 Parteien mit Uebergabeliste und Erstpasswoertern",
  "Nutzerverwaltung: echte Anzeigenamen, Partei/Wohnung, Aktiv/Inaktiv, Passwort neu",
  "Buchungsmaske: Bereich, Ressource, Datum, feste Slots und freie Slots",
  "Aktivitaeten: Buchung, Loeschung und frueher freie Slots werden bestaetigt",
  "Regelwerk: eine aktive Waschsequenz im Voraus, Sonntage und Sperrtage blockiert",
  "Monatsplan: analoge Monatsuebersicht mit Ressourcen, Slots und Sperrtagen",
  "Betrieb: Health-Status, Produktionswarnungen und SQLite-Backup",
  "Ressourcenverwaltung: Waschmaschine, Trockenraum und Tumbler hinzufuegen",
  "Protokolltagebuch: Eintraege pro Maschine/Raum/Tumbler",
  "Pilot-Feedback: Testpersonen senden Rueckmeldungen, Admin sieht die Liste",
  "WhatsApp-Freimeldung: gebuchte Maschine frueher frei melden",
  "Session/Login: abgelaufene Sitzung, Passwortwechsel, deaktivierte Nutzer",
  "Pilotstart: Bereitschaftsliste, Einladungstext und Pilot-Check"
];

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function run() {
  console.log("Erstellte Funktionen");
  for (const [index, feature] of featureCatalog.entries()) {
    console.log(`${String(index + 1).padStart(2, "0")}. ${feature}`);
  }
  console.log("");

  runNpmScript("verify", "Syntax-, Hosting- und Strukturcheck");
  runNpmScript("smoke", "Basisfunktionen, Admin, Buchungen, Sperrtage und Backup");
  runNpmScript("test:20-parties", "20-Parteien-Regelwerk");
  runNpmScript("test:full", "End-to-End-Funktionen inkl. Ressource, Monatsplan, Logbuch und WhatsApp-Fallback");

  await checkStaticPages();
  await checkLiveReadiness();

  console.log("");
  console.log("Created features test passed");
}

function runNpmScript(scriptName, label) {
  console.log(`\n==> ${label}`);
  execFileSync(npmCommand, ["run", scriptName], {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit"
  });
}

async function checkStaticPages() {
  console.log("\n==> UI-Funktionsmarker");
  const indexHtml = await textRequest(`${appUrl}/index.html`);
  const loginHtml = await textRequest(`${appUrl}/login.html`);

  assert(loginHtml.includes("GBMZ"), "login page shows GBMZ branding");
  assert(loginHtml.includes("Maneggplatz 18"), "login page shows Maneggplatz 18");
  assert(!loginHtml.includes("myGBMZ"), "login page does not contain old myGBMZ navigation");
  assert(indexHtml.includes("seedPartiesButton"), "admin 20-party onboarding exists");
  assert(indexHtml.includes("adminResourcesPanel"), "admin resource management exists");
  assert(indexHtml.includes("machineLogForm"), "machine logbook exists");
  assert(indexHtml.includes("pilotFeedbackForm"), "pilot feedback form exists");
  assert(indexHtml.includes("forgottenLaundryButton"), "forgotten laundry quick action exists");
  assert(indexHtml.includes("adminOpsPanel"), "operations panel exists");
  assert(indexHtml.includes("adminPilotPanel"), "pilot readiness panel exists");
  assert(indexHtml.includes("activityList"), "activity feed exists");
  assert(indexHtml.includes("actionToast"), "action confirmation toast exists");
  assert(indexHtml.includes("monthlyPlanGrid"), "monthly plan exists");
  assert(indexHtml.includes("Benutzung"), "rules panel exists");
  const appJs = await textRequest(`${appUrl}/app.js`);
  assert(appJs.includes("availability-slot-past"), "past slots are marked in availability UI");
  assert(appJs.includes("isPastSlot"), "past slot helper exists");

  console.log("OK UI-Funktionsmarker vorhanden");
}

async function checkLiveReadiness() {
  console.log("\n==> Live-Readiness");
  const health = await jsonRequest(`${liveUrl}/api/health`);
  assert(health.ok === true, "live health endpoint returns ok");
  if (!isLocalUrl(liveUrl)) {
    assert(health.sqlitePath === "/var/data/washraum.sqlite", "live app uses persistent Render SQLite path");
  }

  const liveIndex = await textRequest(`${liveUrl}/index.html`);
  assert(liveIndex.includes("adminPilotPanel"), "live app contains pilot readiness panel");
  assert(liveIndex.includes("adminResourcesPanel"), "live app contains resource management panel");
  assert(liveIndex.includes("machineLogForm"), "live app contains machine logbook");
  assert(liveIndex.includes("pilotFeedbackForm"), "live app contains pilot feedback form");
  assert(liveIndex.includes("activityList"), "live app contains activity feed");

  console.log("OK Live-App ist bereit");
}

function isLocalUrl(value) {
  const url = new URL(value);
  return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

async function jsonRequest(url) {
  const response = await rawRequest(url);
  const body = JSON.parse(response.body || "{}");
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${url}: expected success, got HTTP ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function textRequest(url) {
  const response = await rawRequest(url);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${url}: expected success, got HTTP ${response.status}`);
  }

  return response.body;
}

async function rawRequest(value) {
  const url = new URL(value);
  const client = url.protocol === "http:" ? http : https;

  try {
    return await requestOnce({ url, client, allowTlsFallback: false });
  } catch (error) {
    if (url.protocol === "https:" && isCertificateError(error)) {
      return requestOnce({ url, client, allowTlsFallback: true });
    }

    throw error;
  }
}

function requestOnce({ url, client, allowTlsFallback }) {
  return new Promise((resolve, reject) => {
    const request = client.request(url, {
      method: "GET",
      rejectUnauthorized: !allowTlsFallback
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode || 0,
          body
        });
      });
    });

    request.on("error", reject);
    request.end();
  });
}

function isCertificateError(error) {
  return ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(error.code)
    || String(error.message || "").includes("unable to verify the first certificate");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Created features test failed: ${message}`);
  }
}
