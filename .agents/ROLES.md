# Verbindlicher Rollenkatalog fuer WaschZeit

Dieser Katalog legt die dauerhaften Verantwortungen aller spezialisierten Entwickler und Agenten fest. Die technische Gesamtleitung weist fuer jedes Arbeitspaket mindestens eine Rollen-ID zu. Dateibereiche bezeichnen die primaere Verantwortung, nicht exklusiven Besitz. Ueberschneidungen werden vor der Bearbeitung mit der technischen Gesamtleitung abgestimmt.

## Gemeinsamer Arbeitsvertrag

Jeder Agent muss vor Arbeitsbeginn:

1. `AGENTS.md`, diesen Rollenkatalog und die relevanten Abschnitte aus `HANDBUCH.md` lesen.
2. Git-Status und vorhandene parallele Aenderungen pruefen.
3. Ziel, erlaubte Dateien, Schnittstellen, Akzeptanzkriterien und Pflichtpruefungen aus dem Auftrag uebernehmen.
4. Bestehende Aenderungen anderer Entwickler erhalten und Konflikte sofort melden.

Jeder Implementierungsagent muss bei der Uebergabe nennen:

- geaenderte Dateien und Verhalten,
- eingehaltene Schnittstellen und Rollenrechte,
- ausgefuehrte Tests mit Ergebnis,
- verbleibende Risiken oder externe Restpunkte,
- ausdruecklich, ob kein Commit, Push oder Deployment ausgefuehrt wurde.

Funktionsaenderungen aktualisieren immer den passenden Abschnitt und das Aenderungsprotokoll in `HANDBUCH.md`. Rollen- oder Berechtigungsaenderungen aktualisieren zusaetzlich Rollenmatrix und `scripts/role-matrix-test.js`. Eine Freigabe verlangt passende Tests und das vollstaendige `npm run check`.

## CEO_TECHNIK — Technische Gesamtleitung

Auftrag:

- Produktziel, Architektur, Sicherheit, Bedienbarkeit, Datenschutz, Betrieb und Lieferreife gemeinsam verantworten.
- Arbeitspakete priorisieren, Rollen zuweisen, Schnittstellen definieren und Ergebnisse integrieren.
- Konflikte zwischen Domänen entscheiden und den tatsaechlichen Freigabestatus kommunizieren.

Exklusive Entscheidungen:

- grundlegende Architektur- und Produktentscheidungen,
- Freigabe eines Integrationscommits,
- Anforderung eines Pushs oder Deployments,
- Freigabe riskanter Migrationen, Loeschungen und Produktionsaktionen.

Pflicht vor Freigabe:

- Review der Gesamtdifferenz,
- unabhaengiges Urteil von `TESTING_QA`,
- sauberes `npm run check`,
- Dokumentations- und Produktionsabgleich.

## ARCHITEKTUR — Architektur- und Integrationsentwickler

Primaerer Bereich:

- `server.js`
- `src/routes/`
- `src/services/`
- Modulgrenzen und Dependency Injection

Verantwortung:

- `server.js` als Composition Root erhalten.
- Domänen ohne Aenderung von API, SQL, Statuscodes, Middleware-Reihenfolge oder Transaktionsgrenzen modularisieren.
- zyklische Importe, versteckte Seiteneffekte und doppelte Fachlogik verhindern.
- Routenanzahl und Routenmenge vor und nach Strukturarbeiten vergleichen.

Pflichttests:

- `npm run verify`
- betroffene Domänentests
- `npm run check`
- `git diff --check`

## AUTH_KONTEN — Entwickler fuer Anmeldung und Konten

Primaerer Bereich:

- `src/routes/accounts.js`
- `src/services/account-security.js`
- `src/services/account-service.js`
- `public/login.html`, `public/login.js`, `public/reset.html`, `public/reset.js`

Verantwortung:

- Login, Logout, Sitzungswechsel und Inaktivitaetsablauf.
- Einladungen, QR-Partnerzugang und persoenliche Identitaeten.
- E-Mail-Bestaetigung, Passwortwechsel, Reset und Wiederherstellung.
- Datenschutzexport und Selbstloeschung.
- Rate-Limits, Token, Cookies und neutrale Fehlerantworten unveraendert sicher halten.

Pflichttests:

- `npm run test:security`
- `npm test`
- `npm run test:roles`
- `npm run check`

## BUCHUNGEN — Entwickler fuer Waschzeiten und Kalender

Primaerer Bereich:

- `src/routes/bookings.js`
- `src/services/booking-rules.js`
- Buchungs- und Kalenderbereiche in `public/app.js` und `public/index.html`
- `swiss-time.js`, `release-window.js`

Verantwortung:

- Kalender, Empfehlungen, Einzelbuchungen und atomare Waschpakete.
- Waschmaschinen-, Trockenraum-, Tumbler-, Sonntags- und Vorausbuchungsregeln.
- Absage, Freigabe, Gruppenbuchungen und Dauertermine.
- Parallelzugriff, Wohnungsgrenzen und kollisionsfreie Transaktionen.

Pflichttests:

- `npm test`
- `npm run test:roles`
- `npm run test:year`
- `npm run test:e2e`
- `npm run check`

## HAEUSER_ROLLEN — Entwickler fuer Haeuser, Rollen und Verwaltung

Primaerer Bereich:

- `src/routes/houses-roles.js`
- `src/services/role-context.js`
- Verwaltungsbereiche fuer Wohnungen, Konten, Haeuser und Rollen
- `scripts/role-matrix-test.js`

Verantwortung:

- Bewohner-, Hausadmin- und Superadminrechte sowie kumulative Rollen.
- Hausisolation, Hauswechsel, Umzug und Rollenwechsel.
- Wohnungs- und Benutzerverwaltung, Recovery-Status und Superadmin-Uebergabe.
- aktuelle Passwortbestaetigung fuer kritische Aktionen.

Pflichttests:

- Rollenmatrix in `HANDBUCH.md`
- `npm run test:security`
- `npm run test:roles`
- `npm run test:year`
- `npm run check`

## GERAETE_TAGEBUCH — Entwickler fuer Ressourcen und Stoerungen

Primaerer Bereich:

- `src/routes/equipment-logbook.js`
- UI fuer Geraete, Stoerungsmeldungen und Maschinentagebuch

Verantwortung:

- Waschmaschinen, Tumbler und Trockenraeume verwalten.
- unveraenderbaren Ablauf Meldung, Sperre, Reparatur, Funktionspruefung und Freigabe sichern.
- gesperrte Ressourcen aus der Buchbarkeit entfernen.
- Hausgrenzen, Pflichtnotizen und Auditspur erhalten.

Pflichttests:

- `npm test`
- `npm run test:roles`
- betroffene Browserpruefung
- `npm run check`

## BENACHRICHTIGUNGEN — Entwickler fuer E-Mail, Push und Mitteilungen

Primaerer Bereich:

- `src/routes/notifications.js`
- `src/services/mail-transport.js`
- `src/services/notifications.js`
- `src/services/push.js`
- Mitteilungszentrum und Benachrichtigungseinstellungen im Frontend

Verantwortung:

- SMTP, Verifikations-, Reset- und Freigabe-E-Mails.
- VAPID, Push-Abos, Payloads und Ziel-URLs.
- nur fremde, aktuelle, buchbare und filterpassende Freigaben im Mitteilungszentrum anzeigen.
- deaktivierte Empfaenger sowie eigene, abgelaufene, belegte oder gesperrte Hinweise ausschliessen.

Pflichttests:

- `npm test`
- `npm run test:security`
- `npm run test:e2e`
- `npm run check`

## FRONTEND_UX — Entwickler fuer Oberflaeche, PWA und Barrierefreiheit

Primaerer Bereich:

- `public/`
- visuelle Screenshots und responsive Layouts
- `scripts/accessibility-check.js`
- `scripts/e2e-smoke.js`

Verantwortung:

- konsistente Bedienablaeufe fuer Mobiltelefon, Tablet und Desktop.
- Tastatur, Fokus, Dialoge, Live-Regionen, Kontrast und reduzierte Bewegung.
- PWA-Installation, Service-Worker-Update und Push-Oeffnung.
- vorhandene API- und Sicherheitsgrenzen niemals nur clientseitig ersetzen.

Pflichttests:

- `npm run test:a11y`
- `npm run test:e2e`
- visuelle Pruefung bei 390 x 844, 768 x 1024 und 1440 x 900
- `npm run check`

## BETRIEB_BACKUP — Entwickler fuer Betrieb, Backup und Wartung

Primaerer Bereich:

- `src/routes/operations.js`
- `src/services/operations.js`
- `src/services/backup.js`
- `render.yaml`, `render.staging.yaml`
- `.github/workflows/deploy-render.yml`

Verantwortung:

- Health, Version, Audit, Ueberblick und Analyse.
- lokale und externe SQLite-Sicherung, Aufbewahrung und Integritaet.
- Wiederherstellungsprobe, Wartungsmodus, Selfcheck und Pilot-Reset.
- Produktionskonfiguration ohne Geheimnisse im Repository dokumentieren.

Pflichttests:

- `npm run test:backup`
- `npm test`
- `npm run test:roles`
- `npm run check`
- manueller Produktions-Health- und Revisionsvergleich bei Releaseauftraegen

## WINDEL_ALARM — Entwickler fuer das Minispiel

Primaerer Bereich:

- `src/routes/diaper-game.js`
- Windel-Alarm-Bereich in `public/app.js`, `public/index.html`, `public/styles.css`

Verantwortung:

- Spielablauf, serverseitige Zeitmessung und einmalige Rundentoken.
- pseudonymisierte globale Bestenliste und Loeschung des eigenen Ergebnisses.
- strikte Trennung von Spiel, echten Buchungen und Benachrichtigungen.
- harmlose Darstellung ohne Verletzung oder explodierendes Baby.

Pflichttests:

- `npm test`
- `npm run test:roles`
- `npm run test:a11y`
- `npm run test:e2e`
- `npm run check`

## DATENBANK — Entwickler fuer Schema und Migrationen

Primaerer Bereich:

- SQLite-Schema, Indizes, Seeds und Legacy-Migrationen
- Sitzungsspeicher und Datenbereinigung

Verantwortung:

- additive, wiederholbar ausfuehrbare und rueckwaertskompatible Migrationen.
- Fremdschluessel, Eindeutigkeit, Hausisolation und bestehende Produktionsdaten erhalten.
- vor riskanten Migrationen Backup- und Ruecksetzplan vorlegen.

Grenze:

- Datenloeschung, irreversible Migration und Produktionslauf nur nach ausdruecklicher Freigabe von `CEO_TECHNIK`.

Pflichttests:

- `npm test`
- `npm run test:roles`
- `npm run test:year`
- `npm run test:backup`
- `npm run check`

## DOKUMENTATION — Dokumentationsentwickler

Primaerer Bereich:

- `HANDBUCH.md`
- `README.md`
- `TESTPLAN_GESAMTAUDIT.md`
- Testprotokolle und Einfuehrungsunterlagen

Verantwortung:

- dokumentiertes Verhalten mit Code, Rollenmatrix und Tests abgleichen.
- Aenderungsprotokoll datiert und pruefbar pflegen.
- keine noch nicht ausgefuehrte Produktions- oder Live-Pruefung als bestanden darstellen.

Pflichtpruefung:

- Links, Befehle, Rollen, Routenbezeichnungen und Testaussagen gegen den aktuellen Stand pruefen.

## TESTING_QA — Unabhaengiger Testing-Agent

Auftrag:

- finalen Arbeitsbaum unabhaengig und ohne Implementierungsaenderung pruefen.
- zuerst Git-Status, Umfang, unerwartete Dateien und Dokumentationskonsistenz kontrollieren.
- positive und negative Sicherheits-, Rollen- und Grenzfaelle bewerten.
- Screenshots visuell auf Ueberlagerungen, abgeschnittene Inhalte und transiente Stoerelemente pruefen.

Verbindliche Endabnahme:

- `npm run check`
- `git diff --check`
- Secret- und Mojibake-Pruefung
- Routen-, Rollen- und Hausgrenzen bei betroffenen Aenderungen
- klare Entscheidung `PASS`, `FAIL` oder `PASS mit externen Restpunkten`

Grenzen:

- keine Fehler selbst korrigieren,
- kein Commit, Push oder Deployment,
- nach einer Korrektur gezielt erneut pruefen.

## RELEASE — Release- und Deployment-Agent

Auftrag:

- nur den von `CEO_TECHNIK` und `TESTING_QA` freigegebenen Stand veroeffentlichen.
- Commitumfang, Zweig, Remote und erwarteten Zielcommit vor dem Push kontrollieren.
- CI und Deployment nicht umgehen.
- nach Deployment `/api/health` mit dem erwarteten Commit vergleichen.

Freigabebedingungen:

- sauberer Arbeitsbaum,
- `npm run check` PASS,
- Testing-Freigabe,
- keine produktiven Geheimnisse im Commit,
- ausdruecklicher Push- beziehungsweise Deploymentauftrag.

Rueckgabe:

- Commit, Branch, Remote, CI-Status, Produktionsrevision und verbleibende externe Punkte melden.

## Zuweisungs- und Reviewmatrix

| Aenderungsart | Fuehrende Rolle | Pflichtreview |
| --- | --- | --- |
| Anmeldung, Einladung, Passwort, Sitzung | `AUTH_KONTEN` | `HAEUSER_ROLLEN`, `TESTING_QA` |
| Buchungsregel, Kalender, Waschpaket | `BUCHUNGEN` | `HAEUSER_ROLLEN`, `TESTING_QA` |
| Rolle, Hausgrenze, Adminaktion | `HAEUSER_ROLLEN` | `AUTH_KONTEN`, `TESTING_QA` |
| Geraet, Sperre, Tagebuch | `GERAETE_TAGEBUCH` | `BUCHUNGEN`, `TESTING_QA` |
| E-Mail, Push, Mitteilungszentrum | `BENACHRICHTIGUNGEN` | `AUTH_KONTEN`, `TESTING_QA` |
| Layout, PWA, Barrierefreiheit | `FRONTEND_UX` | betroffene Fachrolle, `TESTING_QA` |
| Backup, Wartung, Deployment | `BETRIEB_BACKUP` | `DATENBANK`, `TESTING_QA`, `RELEASE` |
| Minispiel | `WINDEL_ALARM` | `FRONTEND_UX`, `TESTING_QA` |
| Schema oder Migration | `DATENBANK` | alle betroffenen Fachrollen, `TESTING_QA` |
| Modulgrenze oder Querschnitt | `ARCHITEKTUR` | alle betroffenen Fachrollen, `TESTING_QA` |
| Dokumentation ohne Codeaenderung | `DOKUMENTATION` | betroffene Fachrolle |

`CEO_TECHNIK` bleibt fuer jede Endintegration und fuer Abweichungen von dieser Matrix verantwortlich.
