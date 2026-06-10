const { execFileSync } = require("child_process");
const http = require("http");
const https = require("https");

const appUrl = String(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const liveUrl = String(process.env.LIVE_APP_URL || "https://washraum-app.onrender.com").replace(/\/$/, "");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const featureCatalog = [
  "Branding: GBMZ Maneggplatz 18 ohne alte Navigationspunkte",
  "Registrierung: Bewohner erstellen ihren Account auf der Loginseite selbst",
  "Nutzerverwaltung: echte Anzeigenamen, Partei/Wohnung, Aktiv/Inaktiv, Passwort neu",
  "Nutzerverwaltung: Parteien aktiv/inaktiv schalten, Eintraege bleiben erhalten",
  "Buchungsmaske: Bereich, Ressource, Datum, feste Slots und freie Slots",
  "Aktivitaeten: Buchung, Loeschung und frueher freie Slots werden bestaetigt",
  "Regelwerk: eine aktive Waschsequenz im Voraus, Sonntage und Sperrtage blockiert",
  "Regelwerk: pro Partei nur ein Trockenraum gleichzeitig",
  "Regelwerk: Tumbler nur waehrend eigener Waschmaschinen-Slots",
  "Monatsplan: analoge Monatsuebersicht mit Ressourcen, Slots und Sperrtagen",
  "Betrieb: Health-Status, Produktionswarnungen und SQLite-Backup",
  "Betrieb: alle Buchungen mit Tipp-Bestaetigung zuruecksetzen",
  "Auswertung: Nutzung, Auslastung, Spitzenzeiten und inaktive Parteien",
  "Ressourcenverwaltung: Waschmaschine, Trockenraum und Tumbler hinzufuegen",
  "Ressourcen: Standardbetrieb mit 3 Waschmaschinen, 3 Trockenraeumen und 2 Tumblern",
  "Ressourcensperre: defekte Maschine oder Raum sperren und wieder freigeben",
  "Protokoll-Sperre: Admin sperrt oder gibt Ressourcen direkt aus dem Protokolltagebuch frei",
  "Protokolltagebuch: Eintraege pro Maschine/Raum/Tumbler",
  "Alltagshinweis: Waesche haengt noch direkt an einer Buchung melden",
  "Pilot-Feedback: Testpersonen senden Rueckmeldungen, Admin sieht die Liste",
  "WhatsApp-Freimeldung: gebuchte Maschine frueher frei melden",
  "Session/Login: abgelaufene Sitzung, Passwortwechsel, deaktivierte Nutzer",
  "Pilotstart: Bereitschaftsliste, Einladungstext und Pilot-Check",
  "Hilfe: Bewohner-Anleitung und Test-Guide direkt in der App",
  "Willkommen: einmalige Landingpage mit Hallo, Regeln und Handhabung pro Konto",
  "Navigation: klare Reiter fuer Waschraum, Buchungen, Regeln und Hilfe ohne Sprungmarken"
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
  const appJs = await textRequest(`${appUrl}/app.js`);
  const resources = await jsonRequest(`${appUrl}/api/resources`);

  assert(loginHtml.includes("GBMZ"), "login page shows GBMZ branding");
  assert(loginHtml.includes("Maneggplatz 18"), "login page shows Maneggplatz 18");
  assert(!loginHtml.includes("myGBMZ"), "login page does not contain old myGBMZ navigation");
  assert(loginHtml.includes("registerForm"), "login page contains registration form");
  assert(loginHtml.includes("Account erstellen"), "login page offers account registration");
  assert(appJs.includes("adminDashboardNav"), "admin dashboard navigation exists");
  assert(indexHtml.includes("data-view=\"admin\""), "admin main tab exists");
  assert(indexHtml.includes("data-admin-panel=\"adminUsersPanel\""), "admin user subtab exists");
  assert(appJs.includes("toggleUserActive(user)"), "admin user active toggle action exists");
  assert(appJs.includes("Deaktivieren"), "admin user deactivate button exists");
  assert(appJs.includes("Aktivieren"), "admin user activate button exists");
  assert(appJs.includes("Bestehende Eintraege bleiben erhalten"), "admin user toggle preserves entry message exists");
  assert(appJs.includes("Alle Geraete abmelden"), "admin can log out all devices for a user");
  assert(appJs.includes("active_sessions"), "admin user cards show active device count");
  assert(appJs.includes("last_seen_at"), "admin user cards show last activity");
  assert(indexHtml.includes("adminResourcesPanel"), "admin resource management exists");
  assert(resources.resources.tumbler.length === 2, "two tumblers are configured");
  assert(!resources.resources.tumbler.includes("Tumbler 3"), "retired Tumbler 3 is not bookable");
  assert(appJs.includes("/api/admin/resources/") && appJs.includes("/availability"), "admin resource availability action exists");
  assert(appJs.includes("availability-slot-unavailable"), "unavailable resource slots are marked");
  assert(appJs.includes("resource_unavailable"), "unavailable resource error is handled");
  assert(indexHtml.includes("machineLogForm"), "machine logbook exists");
  assert(indexHtml.includes("data-view=\"logbook\""), "logbook main tab exists");
  assert(indexHtml.includes("machineLogSearch"), "machine log search exists");
  assert(indexHtml.includes("machineLogTagFilter"), "machine log tag filter exists");
  assert(indexHtml.includes("machineLogSummary"), "machine log summary exists");
  assert(appJs.includes("filteredMachineLogs"), "machine log filtering exists");
  assert(appJs.includes("machineLogTags"), "machine log tags exist");
  assert(indexHtml.includes("machineLogAction"), "machine logbook availability action exists");
  assert(indexHtml.includes("Protokollieren und sperren"), "machine logbook can block resources");
  assert(indexHtml.includes("Protokollieren und freigeben"), "machine logbook can release resources");
  assert(appJs.includes("updateMachineLogActionOptions"), "machine log action options are synced with resource status");
  assert(appJs.includes("availabilityAction"), "machine log submits availability action");
  assert(appJs.includes("Protokolleintrag gespeichert und Ressource gesperrt"), "machine log block confirmation exists");
  assert(indexHtml.includes("pilotFeedbackForm"), "pilot feedback form exists");
  assert(indexHtml.includes("data-view=\"feedback\""), "feedback main tab exists");
  assert(indexHtml.includes("pilotFeedbackSearch"), "pilot feedback search exists");
  assert(appJs.includes("filteredPilotFeedback"), "pilot feedback filtering exists");
  assert(!indexHtml.includes("forgottenLaundryButton"), "old forgotten laundry logbook shortcut is removed");
  assert(appJs.includes("reportLaundryLeft"), "laundry-left booking action exists");
  assert(indexHtml.includes("adminOpsPanel"), "operations panel exists");
  assert(indexHtml.includes("resetBookingsButton"), "admin booking reset button exists");
  assert(indexHtml.includes("resetBookingsConfirmation"), "admin booking reset confirmation exists");
  assert(indexHtml.includes("adminAnalyticsPanel"), "admin analytics panel exists");
  assert(indexHtml.includes("analyticsRange"), "admin analytics range selector exists");
  assert(appJs.includes("/api/admin/bookings/reset"), "admin booking reset endpoint is used");
  assert(appJs.includes("/api/admin/analytics"), "admin analytics endpoint is used");
  assert(appJs.includes("renderAnalytics"), "admin analytics renderer exists");
  assert(indexHtml.includes("adminPilotPanel"), "pilot readiness panel exists");
  assert(indexHtml.includes("activityList"), "activity feed exists");
  assert(indexHtml.includes("actionToast"), "action confirmation toast exists");
  assert(indexHtml.includes("monthlyPlanGrid"), "monthly plan exists");
  assert(indexHtml.includes("Benutzung"), "rules panel exists");
  assert(indexHtml.includes("helpPanel"), "resident help panel exists");
  assert(indexHtml.includes("Test-Guide"), "resident test guide exists");
  assert(indexHtml.includes("onboardingOverlay"), "one-time onboarding landing page exists");
  assert(indexHtml.includes("Hallo und willkommen im Haus"), "onboarding welcomes neighbors");
  assert(indexHtml.includes("role=\"tablist\""), "main navigation behaves as tabs");
  assert(indexHtml.includes("data-view=\"washraum\""), "washroom tab exists");
  assert(indexHtml.includes("data-view=\"bookings\""), "bookings tab exists");
  assert(indexHtml.includes("data-view=\"rules\""), "rules tab exists");
  assert(indexHtml.includes("data-view=\"help\""), "help tab exists");
  assert(!indexHtml.includes("href=\"#bookingForm\""), "old washroom jump link is removed");
  assert(!indexHtml.includes("href=\"#rulesPanel\""), "old rules jump link is removed");
  assert(appJs.includes("setActiveView"), "tab view switching logic exists");
  assert(appJs.includes("initialViewFromHash"), "old hashes are mapped to clear views");
  assert(appJs.includes("/api/me/onboarding-seen"), "onboarding completion endpoint is used");
  assert(appJs.includes("showOnboarding"), "onboarding display logic exists");
  assert(appJs.includes("availability-slot-past"), "past slots are marked in availability UI");
  assert(appJs.includes("isPastSlot"), "past slot helper exists");
  assert(appJs.includes("drying_room_parallel_limit_reached"), "parallel drying room error is handled");
  assert(appJs.includes("nur einen Trockenraum"), "parallel drying room message is specific");
  assert(appJs.includes("tumbler_requires_washer_slot"), "tumbler washer-slot error is handled");
  assert(appJs.includes("Nur mit eigenem WM-Slot"), "tumbler availability UI marks missing washer slot");
  assert(appJs.includes("userHasWasherSlotForSlot"), "tumbler availability checks washer slots");

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
