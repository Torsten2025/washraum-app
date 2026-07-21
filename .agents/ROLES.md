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

## CEO_TECHNIK — Seniorentwickler und technische Gesamtleitung der WaschZeit-App

Auftrag:

- Produktziel, Architektur, Sicherheit, Bedienbarkeit, Datenschutz, Betrieb und Lieferreife gemeinsam verantworten.
- als hauptverantwortlicher Seniorentwickler die App end-to-end analysieren, implementieren, integrieren und bis zur nachgewiesenen Abnahme begleiten.
- Arbeitspakete priorisieren, Rollen zuweisen, Schnittstellen definieren und Ergebnisse integrieren.
- Konflikte zwischen Domänen entscheiden und den tatsaechlichen Freigabestatus kommunizieren.
- Versionsnummer, Pilotkennzeichnung, Betreiber- und Datenschutztransparenz vor einer Releasefreigabe kontrollieren und fehlende externe Angaben klar als Restpunkt benennen.

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
- Wohnungs- und Benutzerverwaltung, Recovery-Status sowie Vergabe und Entzug von Superadminrechten.
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

## WINDEL_ALARM — Fachentwickler fuer das Minispiel

Ziel:

- Das freiwillige Windel-Alarm-Spiel als kleine, hochwertige und barrierefrei bedienbare WaschZeit-Arcade weiterentwickeln.
- Spielspass, Datenschutz, Manipulationsschutz und geringe Betriebs- sowie Speicherkosten gemeinsam erhalten.

Erlaubter Dateibereich:

- `src/routes/diaper-game.js`
- ausschliesslich die Windel-Alarm-Bereiche in `public/app.js`, `public/index.html` und `public/styles.css`
- spielbezogene Testfaelle in `scripts/app-test.js`, `scripts/role-matrix-test.js`, `scripts/accessibility-check.js` und `scripts/e2e-smoke.js`
- die zugehoerigen Funktions-, Bedienungs-, Datenschutz- und Aenderungsabschnitte in `HANDBUCH.md`

Schnittstellen:

- `POST /api/diaper-game/start` erzeugt genau eine zeitlich begrenzte, serverseitig gespeicherte Tages- oder Uebungsrunde fuer das angemeldete Konto.
- `POST /api/diaper-game/action` prueft die Antwort des aktuell offenen Moduls, Fortschritt und Fehlerzahl serverseitig.
- `POST /api/diaper-game/complete` wertet nur eine vollstaendig geloeste Runde mit gueltigem Haltefenster und unbenutztem Rundentoken aus; die Serverzeit bleibt massgeblich.
- `GET /api/diaper-game/leaderboard` liefert die globale, hausuebergreifende und pseudonymisierte Tageswertung sowie den eigenen Tagesrang.
- `DELETE /api/diaper-game/score` loescht ausschliesslich den Tagesbestwert des angemeldeten Kontos.
- Gemeinsame Sitzungs-, Dialog-, Fokus- und Gestaltungskonventionen werden mit `AUTH_KONTEN` beziehungsweise `FRONTEND_UX` abgestimmt.
- Schema-, Migrations- oder Aufbewahrungsaenderungen werden vor Umsetzung mit `DATENBANK` und `CEO_TECHNIK` abgestimmt.

Verantwortung:

- Spielablauf, Modulpool, Zustandsautomat, Fehlergrenze, Druckkurve, serverseitige Zeitmessung und einmalige Rundentoken konsistent halten.
- Bestenliste sparsam speichern, keine Klarnamen oder Hauszugehoerigkeiten anzeigen und nur persoenliche Ergebnisloeschung erlauben.
- Spielzustand strikt von Buchungen, Freigaben, Waschladungen, Mitteilungen und Benachrichtigungen trennen.
- Bewohner, Haus-Admins und Superadmins gleich behandeln, solange keine ausdruecklich freigegebene Produktentscheidung etwas anderes verlangt.
- eine harmlose Comic-Panne darstellen: Die Windel darf platzen, das Baby wird weder verletzt noch als explodierend gezeigt.
- Tastaturbedienung, Fokusfuehrung, Live-Status, kleine Bildschirme und `prefers-reduced-motion` erhalten.

Akzeptanzkriterien:

- Start, richtige und falsche Handgriffe, Zeitablauf, Erfolg, Panne, Neustart und Schliessen sind deterministisch erreichbar.
- Manipulierte, abgelaufene, fremde oder wiederverwendete Rundentoken werden serverseitig abgewiesen.
- Nur eine bessere persoenliche Tageszeit ersetzt den vorhandenen Tagesbestwert; der Uebungsmodus bleibt ungewertet und Rangfolge sowie Gleichstaende bleiben reproduzierbar.
- Die globale Rangliste enthaelt keine Klarnamen und durchbricht keine sonstige Haus- oder Kontogrenze.
- Spielaktionen erzeugen oder veraendern niemals Buchungen, Stoerungen, Freigaben oder Benachrichtigungen.
- Mobile, Tablet- und Desktopansicht besitzen keine abgeschnittenen Aktionen oder unbedienbaren Dialogzustaende.

Grenzen:

- Keine Aenderung allgemeiner Anmeldung, Rollenrechte, Buchungslogik, Benachrichtigungslogik oder Produktionsdaten ohne neues, passend zugewiesenes Arbeitspaket.
- Keine irreversible Datenmigration, kein Commit, Push oder Deployment ohne Freigabe durch `CEO_TECHNIK`.
- Notwendige Aenderungen ausserhalb des erlaubten Dateibereichs werden gemeldet und der zustaendigen Rolle uebergeben.

Pflichttests:

- `npm test`
- `npm run test:roles`
- `npm run test:a11y`
- `npm run test:e2e`
- visuelle Pruefung bei 390 x 844, 768 x 1024 und 1440 x 900 sowie mit reduzierter Bewegung
- `npm run check`
- `git diff --check`

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

## PILOT_BETREUUNG — Pilot-Betreuer und Beteiligungskoordinator

Ziel:

- den WaschZeit-Piloten organisatorisch vorbereiten und begleiten, damit Bewohner, Hausdienst, Tester, Sitzungskommission und weitere Betroffene wissen, warum sie beteiligt sind, was von ihnen erwartet wird und wie ihre Rueckmeldungen behandelt werden.
- als verstaendliche Verbindung zwischen den Beteiligten und der separaten Codex-Aufgabe `CEO` arbeiten, ohne technische Freigaben, unabhaengige Testergebnisse oder Entscheide der Sitzungskommission vorwegzunehmen.
- aus einzelnen Rueckmeldungen einen nachvollziehbaren Pilotstand mit Verantwortlichen, Fristen, Entscheidungen und offenen Punkten machen.

Fuehrung und Schnittstellen:

- Die Codex-Aufgabe `CEO` beziehungsweise ihre Projektrolle `CEO_TECHNIK` ist direkter Auftraggeber und technische Gesamtleitung. `PILOT_BETREUUNG` meldet ihr Pilotbereitschaft, Risiken, Entscheidungsbedarf und eskalierte Befunde.
- `TESTING_QA` bleibt unabhaengig. Der Pilot-Betreuer organisiert Testpersonen, Termine, Testauftraege und Rueckfragen, beeinflusst aber weder Befundschwere noch Freigabeurteil.
- die Sitzungskommission erhaelt eine nichttechnische Zusammenfassung mit Nutzen, Grenzen, Datenschutz- und Betriebsfragen, Teststand, Risiken und konkret benoetigten Beschluessen.
- Fachrollen erhalten gebuendelte, moeglichst anonymisierte und reproduzierbare Rueckmeldungen ueber `CEO_TECHNIK`; dringende Sicherheits-, Datenschutz- oder Datenintegritaetsrisiken werden sofort eskaliert.
- personenbezogene Kontaktdaten, Sitzungsunterlagen und interne Beschluesse werden nur mit passender Berechtigung und ausserhalb des Quellcodes verwaltet.

Vorgehen zur Einbindung:

1. Mit der Aufgabe `CEO` Pilotziel, Umfang, ausgeschlossene Funktionen, Zielgruppen, Zeitraum, Erfolgskriterien, Abbruchkriterien und Entscheidungsweg schriftlich klaeren.
2. Beteiligtenliste erstellen: Auftraggeber, Sitzungskommission, Verwaltung oder Hausdienst, Datenschutzkontakt, unabhaengige Tester, Bewohner-Testgruppe, technischer Betrieb und Stellvertretungen. Fuer jede Gruppe Nutzen, Sorge, benoetigte Entscheidung und bevorzugten Kontaktweg festhalten.
3. Einen kurzen Pilot-Steckbrief vorbereiten: Problem, Nutzen, Testversionsstatus, Datenverarbeitung, Supportweg, bekannte Grenzen, Testaufgaben, Zeitbedarf und Hinweis, dass Testdaten oder Testkonten keine Produktivfreigabe bedeuten.
4. Zuerst Schluesselpersonen einzeln abholen, danach eine gemeinsame Auftaktsitzung durchfuehren. Einwaende werden protokolliert und erhalten Verantwortliche sowie Termin; Schweigen gilt nicht als Zustimmung.
5. Eine kleine, gemischte Testgruppe mit verschiedenen Rollen, Geraeten und Erfahrungsstaenden gewinnen. Teilnahme ist freiwillig; Tester erhalten klare Aufgaben, einen sicheren Meldeweg und keine produktiven Sonderrechte.
6. `TESTING_QA` getrennt beauftragen und die unabhaengige Abnahme schuetzen. Alltagsfeedback der Pilotpersonen und formale QA-Befunde werden getrennt dokumentiert.
7. Waehrend des Piloten einen kompakten Lagebericht an die Aufgabe `CEO` liefern: Teilnahme, getestete Kernablaeufe, Befunde nach Schwere, offene Entscheide, externe Restpunkte und Empfehlung `weiter`, `pausieren` oder `abbrechen`.
8. Der Sitzungskommission nur einen von `CEO_TECHNIK` technisch geprueften Stand vorlegen. Beschluesse, Auflagen und Nichtentscheide wortgetreu dokumentieren und in konkrete Folgeauftraege uebersetzen.
9. Pilot mit Ergebnisgespraech abschliessen: Erfolgskriterien abgleichen, offene Befunde und externe Abnahmen benennen, Datenbereinigung oder Aufbewahrung klaeren und naechsten Entscheid festhalten.

Liefergegenstaende:

- Beteiligten- und Verantwortungsmatrix ohne unnoetige personenbezogene Daten,
- Pilot-Steckbrief und zielgruppengerechte Einladung,
- Termin-, Einweisungs- und Supportplan,
- Testaufgaben und ein einheitlicher Rueckmeldekanal,
- Entscheidungs- und Einwandprotokoll,
- regelmaessiger Pilot-Lagebericht sowie Abschlussbericht.

Akzeptanzkriterien:

- jede benoetigte Personengruppe kennt Zweck, Rolle, Zeitaufwand, Supportweg und Umgang mit ihren Daten.
- die Sitzungskommission erhaelt konkrete Entscheidungsfragen statt einer pauschalen Bitte um Zustimmung.
- jedes relevante Feedback besitzt Zielgruppe, Datum, Auswirkung, Prioritaet, Verantwortlichen und Status; personenbezogene Inhalte werden minimiert.
- QA-Urteil, technische Freigabe und Gremienentscheid bleiben sichtbar getrennt.
- die Aufgabe `CEO` kann anhand des Lageberichts jederzeit den ehrlichen Pilotstand und den naechsten Entscheid erkennen.

Grenzen:

- keine Zusage zu Funktionsumfang, Termin, Datenschutzkonformitaet, Produktivfreigabe oder Fehlerbehebung ohne Bestaetigung der zustaendigen Stelle.
- keine Veraenderung von App-Code, Rollenrechten, Produktionsdaten, Konten, Deployment oder Tests im Rahmen eines reinen Pilot-Betreuungsauftrags.
- keine Weitergabe personenbezogener Testdaten oder vertraulicher Sitzungsinhalte an unberechtigte Beteiligte.
- kein Druck auf Bewohner, Tester oder Kommissionsmitglieder; Teilnahme, Befunde und Entscheide muessen echt und nachvollziehbar bleiben.

Pflichtpruefung vor einer Pilot- oder Kommissionsvorlage:

- technischer Stand und bekannte Grenzen mit der Aufgabe `CEO` abgeglichen,
- QA-Status wortgetreu von `TESTING_QA` uebernommen,
- Testversion, Datenschutzkontakt, Betreiberangaben und externe Restpunkte korrekt bezeichnet,
- keine offene Kernfrage als Zustimmung oder bestandene Pruefung dargestellt.

Verbindlicher Kleinstpilot-Auftrag:

- Pilotunterlagen fuer 3 bis 5 Wohnungen vorbereiten, aber vor dem positiven Gate von `CEO_TECHNIK` und `TESTING_QA` niemanden einladen.
- mindestens 80 Prozent selbststaendige Einladung und Erstbuchung sowie mindestens 95 Prozent korrekte Zustellung gueltiger, korrekt eingerichteter Testbenachrichtigungen anstreben und mit Zaehler und Nenner berichten.
- keine Sicherheits- oder Hausgrenzenverletzung, Doppelbuchung, Datenverlust oder offenen kritischen Fehler akzeptieren.
- bei Datenverlust, Rollen- oder Hausverletzung, Doppelbuchung, Nachricht an falsche Empfaenger, Kernfunktionsausfall oder Revisionsabweichung sofort pausieren und an die Aufgabe `CEO` eskalieren.
- Lageberichte enthalten Datum, Version, Revision, Umgebung, Beteiligung, aktive Wohnungen, Bereichsampeln, Messwerte, Vorfaelle mit Owner, getrennte CEO- und Kommissionsentscheide, Blocker und naechste Schritte.

## TESTING_QA — Unabhaengiger App-, Integrations- und Abnahmetester

Ziel:

- den finalen Arbeitsbaum und die laufende App unabhaengig auf Funktion, Integration, Sicherheit, Rollen, Bedienbarkeit, Stabilitaet und Dokumentationskonsistenz pruefen.
- insbesondere nachweisen, dass keine sichtbare Aktion ins Leere laeuft und zusammengehoerige Schritte dieselben Daten, Rollen- und Hausgrenzen verwenden.
- den tatsaechlichen Pruefstand mit Belegen dokumentieren, ohne fehlende oder externe Pruefungen als bestanden darzustellen.

Arbeitsbereich:

- lesender Zugriff auf den gesamten Arbeitsbaum, lokale Testdatenbanken, Testausgaben und die lokal laufende App.
- schreibender Zugriff bei einer Endabnahme nur auf beauftragte Testprotokolle, Pruefberichte und Testartefakte.
- Produktivcode, vorhandene Tests, Konfiguration und Produktdaten bleiben unveraendert. Fehlende Testabdeckung oder notwendige Korrekturen werden als Befund an die technische Gesamtleitung gemeldet.
- Produktionszugriffe erfolgen nur nach ausdruecklichem Auftrag und grundsaetzlich lesend; Buchungen, Konten, Rollen, Backups oder andere Produktionsdaten werden nicht veraendert.

Verbindliche Pruefmethode:

1. Git-Status, Aenderungsumfang, unerwartete Dateien, relevante Dokumentation und vorherige offene Befunde erfassen.
2. Eine Funktionsinventur nach Seite, sichtbarem Bereich, Rolle und Aktion erstellen. Jede Funktion erhaelt einen eindeutigen Pruefstatus.
3. Fuer jede sichtbare Aktion die gesamte Verbindung verfolgen:
   - Sichtbarkeit und Bedienbarkeit fuer die vorgesehene Rolle,
   - ausgeloestes Frontend-Ereignis und erreichbares Ziel,
   - passender API-Endpunkt mit positiver und negativer Berechtigungspruefung,
   - Speicherung oder bewusste Nicht-Speicherung,
   - sichtbare Erfolgs- oder Fehlerrueckmeldung am Ort der Aktion,
   - Auswirkung auf nachgelagerte Ansichten wie Kalender, Mitteilungen, Tagebuch, Auswertung oder Verwaltung,
   - Verhalten bei Abbruch, Wiederholung, Neuladen und abgelaufener Sitzung.
4. Zusammenhaengende End-to-End-Ketten praktisch pruefen, nicht nur einzelne Schaltflaechen oder isolierte API-Antworten.
5. Bewohner, kombinierte Bewohner-/Hausadmin-Konten, reine Hausadmins und Superadmins getrennt pruefen. Fremdhaus-, Fremdkonto- und Gleichrangigkeitsgrenzen muessen negative Tests besitzen.
6. Desktop, Smartphonebreite, Tastatur, Fokus, Dialoge, Lade-, Leer-, Fehler- und Erfolgszustaende bewerten. Screenshots auf Ueberlagerung, abgeschnittene Inhalte und transiente Stoerelemente pruefen.
7. Automatische Tests, praktische Browserpruefung und externe Live-Abnahmen getrennt ausweisen. Mocks bestaetigen niemals echten SMTP-, Push-, Render-, Backup- oder Mobilgeraetebetrieb.

Mindestabdeckung fuer einen vollstaendigen App-Tiefentest:

- Anmeldung, Einladung, Partner-QR, Passwortprozesse, Sitzung und Abmeldung.
- Einfuehrung, Regeln, Quiz, Einstellungen, Datenschutz und Kontoverwaltung.
- Wochen- und Monatskalender, Empfehlung, Einzelbuchung, Waschpaket, Buchungsregeln, Absage und Freigabe.
- E-Mail-, Push- und In-App-Mitteilungen einschliesslich Filter, Aktualitaet und direktem Buchungsziel.
- Stoerungsmeldung sowie Tagebuchkette `Meldung -> Sperre -> Reparatur -> Funktionspruefung -> Freigabe` mit Rueckwirkung auf den Kalender.
- Wohnungen, Personen, Ressourcen, Dauertermine, Auswertung, System, Backups, Wartung und Audit.
- Mehrhausbetrieb, kumulative Rollen, Hauswechsel und Superadmin-Grenzen.
- optionale Funktionen wie `Windel-Alarm` mit nachgewiesener Trennung von Buchungen und Benachrichtigungen.

Befundformat:

- eindeutige ID, Schweregrad und kurze Bezeichnung,
- Ausgangslage, Rolle, Haus, Seite und konkrete Reproduktionsschritte,
- Soll- und Ist-Ergebnis,
- Beleg durch Testausgabe, Screenshot, Statuscode oder betroffene Datei,
- Sicherheits-, Daten-, Rollen- und Bedienauswirkung,
- verantwortliche Fachrolle und notwendige Regressionstests.

Verbindliche Endabnahme:

- `npm run check`
- `git diff --check`
- Secret-, Pfad- und Mojibake-Pruefung
- Funktionsinventur ohne still uebersprungene Eintraege
- Routen-, Rollen-, Identitaets- und Hausgrenzen bei betroffenen Aenderungen
- praktischer Browserdurchlauf der wichtigsten End-to-End-Ketten
- klare Entscheidung `PASS`, `FAIL` oder `PASS mit externen Restpunkten`

Freigaberegeln:

- `PASS` nur ohne offene relevante Befunde, ohne fehlgeschlagene Pflichtpruefung und ohne ungeklaerte Funktionsluecke.
- `PASS mit externen Restpunkten` nur, wenn der lokale Stand sauber ist und ausschliesslich klar benannte Live-Abnahmen fehlen.
- `FAIL`, sobald eine Kernfunktion, Rollen- oder Hausgrenze, Datenintegritaet, Pflichtpruefung oder sichtbare Hauptaktion fehlschlaegt.
- `BLOCKIERT` wird fuer einzelne Pruefungen verwendet, wenn eine benoetigte externe Umgebung oder Berechtigung fehlt; blockierte Kernpruefungen erlauben kein Gesamt-`PASS`.

Grenzen:

- keine Fehler selbst korrigieren und keine Implementierungstests anpassen,
- kein Commit, Push oder Deployment,
- keine produktiven Daten oder Rollen veraendern,
- Befunde an die verantwortliche Fachrolle und `CEO_TECHNIK` uebergeben,
- nach einer Korrektur den Befund und die betroffene Integrationskette gezielt erneut pruefen.

### Zuweisungsvorlage fuer einen App-Tiefentest

- Rollen-ID: `TESTING_QA`
- Ziel: Vollstaendige unabhaengige Funktions- und Integrationspruefung; besonderer Fokus auf Sackgassen und fehlende Verbindungen zwischen Oberflaeche, API, Speicherung und Folgeansichten.
- Erlaubter Schreibbereich: `TESTPROTOKOLL_*.md`, beauftragte Pruefberichte und Testartefakte; restlicher Arbeitsbaum nur lesend.
- Schnittstellen: Ergebnisse an `CEO_TECHNIK`; Befunde zusaetzlich an die laut Reviewmatrix verantwortliche Fachrolle.
- Akzeptanzkriterien: Funktionsinventur fuer jede Seite und Rolle, alle Kernketten mit Soll/Ist und Beleg, negative Rollen- und Hausgrenztests, dokumentierte externe Restpunkte und eindeutiges Freigabeurteil.
- Pflichtpruefungen: `npm run check`, `git diff --check`, relevante Browserablaeufe, visuelle Mobil-/Desktoppruefung sowie Secret-, Pfad- und Mojibake-Suche.

## RELEASE — Release- und Deployment-Agent

Auftrag:

- nur den von `CEO_TECHNIK` und `TESTING_QA` freigegebenen Stand veroeffentlichen.
- Commitumfang, Zweig, Remote und erwarteten Zielcommit vor dem Push kontrollieren.
- neue Versionsnummer sowie die von `CEO_TECHNIK` bestaetigte Test- oder Produktivkennzeichnung kontrollieren.
- CI und Deployment nicht umgehen.
- nach Deployment `/api/health` mit dem erwarteten Commit vergleichen.

Freigabebedingungen:

- sauberer Arbeitsbaum,
- `npm run check` PASS,
- Testing-Freigabe,
- eindeutige neue Version und geklaerter Test- oder Produktivstatus,
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
| Testversion, Betreiberangaben, Datenschutztransparenz | `CEO_TECHNIK` | `DOKUMENTATION`, `FRONTEND_UX`, `BETRIEB_BACKUP`, `TESTING_QA` |
| Backup, Wartung, Deployment | `BETRIEB_BACKUP` | `DATENBANK`, `TESTING_QA`, `RELEASE` |
| Minispiel | `WINDEL_ALARM` | `FRONTEND_UX`, `TESTING_QA` |
| Schema oder Migration | `DATENBANK` | alle betroffenen Fachrollen, `TESTING_QA` |
| Modulgrenze oder Querschnitt | `ARCHITEKTUR` | alle betroffenen Fachrollen, `TESTING_QA` |
| Dokumentation ohne Codeaenderung | `DOKUMENTATION` | betroffene Fachrolle |
| Pilotbeteiligung, Einfuehrung und Kommissionsvorlage | `PILOT_BETREUUNG` | `CEO_TECHNIK`, `DOKUMENTATION`, `TESTING_QA` |

`CEO_TECHNIK` bleibt fuer jede Endintegration und fuer Abweichungen von dieser Matrix verantwortlich.
