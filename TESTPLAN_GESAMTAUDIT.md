# WaschZeit Gesamtaudit

Stand: 11. August 2026

Dieser Testplan prueft die App in einer isolierten lokalen Umgebung. Jeder Lauf verwendet eine eigene SQLite-Datei und veraendert keine Produktionsdaten. Externe Live-Dienste wie Render, echtes SMTP, Betriebssystem-Push und App-Installation werden zusaetzlich manuell abgenommen.

## Ausfuehrung

```bash
npm run audit
npm run check
```

`npm run audit` zeigt jeden Teilbereich einzeln mit `PASS`, `FAIL` oder `SKIP`. `npm run check` bleibt das verbindliche Abschluss-Gate des Projekts.

## A. Sicherheit und Transport

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| SEC-01 | CSP, Frame-Schutz, MIME-Schutz, Referrer- und Berechtigungsrichtlinie | Alle Header sind gesetzt; API-Antworten sind `no-store` | `test:security` |
| SEC-02 | POST von fremder Origin, `cross-site` und kaputter Origin | Anfrage wird mit 403 abgelehnt | `test:security` |
| SEC-03 | JSON groesser als 32 KB | Anfrage wird mit 413 abgelehnt | `test:security` |
| SEC-04 | Produktionsmodus | HSTS sowie `Secure`, `HttpOnly` und `SameSite=Lax` am Sitzungscookie | `test:security` |
| SEC-05 | Abhaengigkeiten | Keine bekannte kritische produktive Schwachstelle | `npm audit --omit=dev` |
| SEC-06 | Datenschutzexport und Kontoloeschung | Nur eigene Daten; eigene Meldungen hausuebergreifend, aber ohne fremde Reports, Kontakte, Admin-/Audit-/Outboxfelder; Report- oder Kontoloeschung entfernt die persoenliche Meldungsschicht und erhaelt den neutralen Betriebsfall; geschuetzte Admin- und letzte-Admin-Konten bleiben erhalten | `npm test`, `node scripts/maintenance-reporting-test.js`, `test:roles` |
| SEC-07 | Harte Betriebs-Kill-Switches | Nur explizites, trim-/case-insensitives `true` aktiviert Backup, E-Mail oder Push. Pro Kanal bleiben `false`, fehlend, leer, ungueltig und direkte Factory-Nutzung ohne `enabled` trotz gesetzter Providerwerte fail-closed; direkte und indirekte Pfade erzeugen null Dateien, DB-Kopien, Queue-/Token-/Abo-/Auditwirkungen sowie null DNS-, Netzwerk- oder Providerverbindungen. Die Adminoberflaeche zeigt DE/EN eindeutig `Deaktiviert`/`Disabled`, blendet irrefuehrende Providerhinweise aus und macht Backup-Erstellung, Download, Testversand sowie Wartungsstart unbedienbar; direkte API-Pfade bleiben `503` | `test:safety`, `test:i18n`, `test:a11y`, `test:e2e` |

## B. Anmeldung, Einladung und Sitzungen

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| AUTH-01 | Gastzugriff auf Ressourcen, Export und Admin-API | 401 oder 403 | `test:security` |
| AUTH-02 | Unbekanntes Konto, falsches Passwort und SQL-artige Eingabe | Einheitliche Meldung ohne Kontoauskunft | `test:security` |
| AUTH-03 | Erfolgreicher Login | Neue Sitzungskennung und sichere Cookie-Attribute | `test:security` |
| AUTH-04 | Adminlogin | Technischer Kontoname bleibt fuer Notfallzugang nutzbar | `test:security` |
| AUTH-05 | Bewohnerlogin | Primaere E-Mail funktioniert ohne Beachtung der Grossschreibung; freier Name nicht | `test:security` |
| AUTH-06 | Zweite E-Mail | Beide Adressen melden dasselbe Wohnungskonto an | `test:security`, `npm test` |
| AUTH-07 | Partnerzugang per QR | QR enthaelt die vorausgefuellte Loginadresse; Partner nutzt eigene E-Mail und eigenes Passwort; Token ist zehn Minuten gueltig und einmalig; Adminrechte werden nicht uebertragen | `test:security`, `npm test`, `test:roles`, `test:e2e` |
| AUTH-08 | Passwortwechsel | Altes Passwort erforderlich; anderes Passwort; weitere Sitzungen enden | `test:security`, `npm test` |
| AUTH-09 | Passwort-Reset-Anfrage | Bekannte und unbekannte E-Mail erhalten dieselbe Antwort | `test:security` |
| AUTH-10 | Deaktiviertes Konto | Aktive Sitzungen verlieren Zugriff; erneuter Login liefert 403 | `test:security`, `npm test` |
| AUTH-11 | Inaktivitaet | Warnung vor Ablauf, Keepalive und serverseitige Abmeldung | `npm test`, `test:a11y` |
| RATE-01 | 21 falsche Logins derselben Identitaet | 429 mit `Retry-After` | `test:security` |
| RATE-02 | Wiederherstellungsversuche | Eigenes IP-Limit greift | `test:security` |
| RATE-03 | Einladungsannahme | Eigenes IP-Limit greift | `test:security` |

## C. Wohnungskonto und Identitaet

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| REG-01 | Wohnung einladen | Stabile Wohnungsbezeichnung, Klingelschildname, feste Ziel-E-Mail und gehashter Sieben-Tage-Link; produktiv ausschliesslich nach erfolgreichem SMTP-Versand | `test:security`, `npm test` |
| REG-02 | Freie Registrierung, schwaches Passwort oder falscher Link | Klare 400/404/410-Antwort | `test:security` |
| REG-03 | Einladungsannahme mit neuer E-Mail | Link erzeugt genau eine persoenliche Identitaet mit fester Wohnungsmitgliedschaft und ist danach verbraucht; SMTP-Versand bestaetigt zusaetzlich die E-Mail | `test:security`, `npm test` |
| REG-04 | Klingelschildkorrektur | Bewohner beantragt; Admin entscheidet; sichtbarer Name aendert sich nicht direkt | `npm test`, `test:roles` |
| REG-05 | Alter Zusammenfuehrungsweg | Wird mit 410 abgelehnt; Konto, Sitzung und persoenliche Reports bleiben unveraendert; neue Partner verwenden eigene Identitaeten | `npm test` |
| REG-06 | Umzug | Nur Superadmin; keine kommenden Buchungen; Rolle wird Bewohner | `npm test`, `test:roles` |
| REG-07 | Einladung mit bestehender E-Mail | Vorhandenes Passwort wird geprueft; dieselbe Identitaet erhaelt die Wohnung, ohne zweites Konto oder Rollenverlust | `test:roles` |

## D. Rollen und Hausgrenzen

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| ROLE-01 | Bewohner gegen alle Adminrouten | Zugriff verweigert | `test:security`, `test:roles` |
| ROLE-02 | Haus-Admin | Verwaltung nur im eigenen Haus | `test:roles` |
| ROLE-03 | Gleichrangige Admins | Keine Deaktivierung oder Reset untereinander | `test:roles` |
| ROLE-04 | Superadmin | Hauswechsel, globale Sicherung, Wartung und Rollenwechsel | `test:roles` |
| ROLE-05 | Superadmin-Uebergabe | Nur an aktiven Haus-Admin, altes Konto verliert globale Rechte | `test:roles` |
| ROLE-06 | Notfallwiederherstellung | Seed-Admin wird kontrolliert reaktiviert; Passwort nur mit Break-Glass-Schalter ersetzt | `test:roles` |
| ROLE-07 | Fremdhausdaten | Bewohner und Haus-Admin sehen und aendern keine fremden Konten, Meldungen oder Buchungen | `test:roles`, `test:year` |
| ROLE-08 | Kombinierte und reine Adminrollen | Wohnungskonto plus Hausrolle darf getrennt buchen und verwalten; reine Admins und Superadmins ohne Wohnung koennen keine normale Buchung erzeugen | `test:roles`, manueller Browsertest |
| ROLE-09 | QR von Bewohner-Hausadmin | Partner erhaelt eigene Identitaet und nur Bewohnerrecht; gemeinsame Buchungen und Vorausbuchungsgrenze gelten wohnungsweit | `test:roles`, `npm test` |
| ROLE-10 | Null-Ressourcen-Haus und Fremdhausparameter | Ein serverseitig aktives Haus ohne Ressourcen liefert auch bei manipuliertem `houseId` weder fremde Ressourcen noch Kapazitaeten oder Buchungsmoeglichkeiten | `npm test`, `test:roles`, `test:e2e` |

## E. Buchungen und Regelwerk

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| BOOK-01 | Vergangenheit und Sonntag | Nicht buchbar und nicht als frei angeboten | `npm test` |
| BOOK-02 | Waschmaschinen | Eine Waschsequenz im Voraus; mehrere Maschinen nur gleicher Slot | `npm test`, `test:year` |
| BOOK-03 | Tumbler | Nur im Waschslot; mindestens ein Tumbler bleibt frei | `npm test`, `test:year` |
| BOOK-04 | Trockenraum | Nur ein Raum gleichzeitig; erlaubtes zusammenhaengendes Trocknungsfenster | `npm test`, `test:year` |
| BOOK-05 | Waschpaket | Atomare Buchung; bei Konflikt wird nichts teilweise gespeichert | `npm test` |
| BOOK-06 | Fremde Buchung | Bewohner kann sie weder loeschen noch erweitern | `npm test` |
| BOOK-07 | Freigabe und Absage | Zeitfenster, Mitteilung, Push-/Mailfilter und neutraler Text stimmen | `npm test` |
| BOOK-08 | Monats-/Wochenkalender | API-Daten, Tagesdetails und eigene Buchungen stimmen ueberein | `npm test`, `test:e2e` |
| BOOK-09 | Dauerpaket | `resourceIds` erzeugt atomar genau eine WM, optional hoechstens einen TR/Tumbler, gemeinsame Gruppenkennung auch WM-only und modellierte Trocknungsdauer; Konflikt/zweite WM/Mischpayload/Fremdhaus/Sonntagsfenster speichert nichts, Tumblerreserve bleibt bestehen | `npm test`, `test:roles` |
| BOOK-10 | Parallelzugriff | Eindeutige Ressourcenbelegung ohne Teilbuchung | `npm test`, `test:year` |
| BOOK-11 | Hauswechsel mit leerem Haus | Haus A zeigt nur eigene Ressourcen; Haus B ohne Ressourcen zeigt 0 Kapazitaet, einen DE/EN-Leerzustand und keine Buchungsaktion; Rueckwechsel und Reload erben keine alten Daten | `npm test`, `test:roles`, `test:i18n`, `test:e2e` |
| BOOK-12 | Bestehende Ressourcen beim Hausanlegen | Vorhandene Ressourcen und ihre IDs bleiben vor, waehrend und nach Anlage sowie Wechsel zu einem leeren Haus unveraendert; es gibt keine heuristische Bestandsbereinigung | `npm test` |
| BOOK-13 | Initialisierungs- und Hauswechselrennen | Bewusste Kalenderwahl waehrend verzoegerter Admininitialisierung bleibt erhalten; ohne Klick startet der reine Admin in der Verwaltung. Verspaeteter Erfolg und Netzfehler aus Haus A veraendern Haus B nicht, ein aktueller B-Fehler bleibt sichtbar | `test:e2e` dreimal hintereinander, `npm run check` zweimal |

### Restplaetze `RP-01` bis `RP-25`

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| RP-01 | Lokaler Tag | Nur der heutige Kalendertag in `Europe/Zurich`; gestern und morgen werden weder angeboten noch akzeptiert | `test:remaining-slots`, `npm test` |
| RP-02 | Slotbeginn | Abschluss strikt vor Beginn; genau zum oder nach Beginn abgelehnt; Clientzeit wirkungslos | `test:remaining-slots`, `test:e2e` |
| RP-03 | Wohnungspartei | Konten derselben aktiven Wohnung teilen die Tagesgrenze; keine hausuebergreifende Personenpruefung | `test:remaining-slots`, `test:roles` |
| RP-04 | Tagesnutzung/Storno | Jede heutige Waschbuchungsart sowie begonnene oder frueher freigegebene Nutzung sperrt; nur vollstaendig vor Beginn stornierte ungenutzte Buchung gibt wieder frei | `test:remaining-slots`, `npm test` |
| RP-05 | Vorausbuchungsrecht | Spaetere Normalbuchung und heutiger Restplatz bleiben in beide Richtungen neutral | `test:remaining-slots`, `npm test` |
| RP-06 | Vollstaendig freier Slot | Freier heutiger, noch nicht begonnener Slot ist auch ohne Teilbelegung zulaessig | `test:remaining-slots` |
| RP-07 | Eine Waschmaschine | Exakt eine; null, zweite oder dritte Maschine ueber UI und API abgelehnt | `test:remaining-slots`, `test:e2e` |
| RP-08 | Kein Trockenraum | Kein Trockenraum in Option, Persistenz, Gruppe, Export, Audit oder Kalenderwirkung | `test:remaining-slots`, `npm test` |
| RP-09 | Optionaler Tumbler | Hoechstens ein aktiver, hausgleicher, freier Tumbler im selben Slot | `test:remaining-slots` |
| RP-10 | Tumblerreserve | Bestehende Konflikte und Dauertermine beruecksichtigt; mindestens ein Tumbler bleibt frei | `test:remaining-slots`, `npm test` |
| RP-11 | Ohne Tumbler | Explizite, nicht vorausgewaehlte Selbsttrocknung erforderlich und nicht dauerhaft gespeichert | `test:remaining-slots`, `test:e2e` |
| RP-12 | Atomaritaet | Waschmaschine und Tumbler gemeinsam oder gar nicht; kein stilles Downgrade | `test:remaining-slots` |
| RP-13 | Parallelitaet | Parteien, Geraete und Normalbuchung gegen Restplatz erzeugen genau einen konfliktfreien Gewinner | `test:remaining-slots`, `npm test` |
| RP-14 | Wiederholung | Doppelklick, Retry und unklare Antwort erzeugen keine Doppelbuchung; abweichendes Payload zum gleichen Schluessel scheitert | `test:remaining-slots`, `test:e2e` |
| RP-15 | Rollen | Nur aktiver Bewohner mit aktiver Wohnung; reine Admins, Superadmins und Konten ohne Wohnung abgelehnt | `npm test`, `test:roles` |
| RP-16 | Hausisolation | Fremdhausparameter abgelehnt, Entwurf bei Hauswechsel verworfen, spaete Antwort wirkungslos | `npm test`, `test:e2e` |
| RP-17 | Sperren/Dauertermine | Gesperrte, deaktivierte, fest oder inzwischen belegte Ressource fail-closed | `test:remaining-slots`, `npm test` |
| RP-18 | Nichtverdraengung | Normalbuchungen, Waschpakete, Dauertermine, Trockenraeume, Sperren und Ressourcenbestand unveraendert | `test:remaining-slots`, `npm test` |
| RP-19 | Storno/Aenderung | Vor Beginn Ganzstorno; Tumblerentfernung nur mit neuer Selbsttrocknungswahl; kein Wechsel oder Hinzufuegen | `test:remaining-slots`, `test:e2e` |
| RP-20 | Leer-/Fehlerzustaende | Keine Option, heutige Nutzung, Sitzung, Netz, Tag, Haus und Konflikt klar und ohne Teilwirkung | `test:e2e`, `npm test` |
| RP-21 | DE/EN | Pflichttext und alle Titel, Optionen, Status- und Fehlertexte vollstaendig ohne rohe Schluessel | `test:i18n`, `test:e2e` |
| RP-22 | Mobil/A11y | Tastatur, Fokus, Live-Status, Fieldset, Touch und schmale Ansicht ohne Ueberlagerung | `test:a11y`, `test:e2e` |
| RP-23 | Privacy/Export | Nur eigene Buchungsart, Haus, Datum, Slot, Waschmaschine und optional Tumbler; keine Selbsttrocknungs- oder Fremddaten | `npm test`, `test:remaining-slots` |
| RP-24 | Audit/Fixture-Trennung | Keine personenbezogene Ueberwachung; Fixture unsichtbar und ausserhalb Agent-Test fail-closed | `test:fixture`, `test:safety`, Quellscan |
| RP-25 | Releasegrenze | Sichtbar `0.3.0-test.17`; Fixture und Produktfunktion getrennt belegt; keine Produktionswirkung | `test:safety`, `npm run check` |

### Lean-A-Fixture `FA-01` bis `FA-12`

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| FA-01 | Zieldienst | Exakt `waschzeit-agent-test` im Free-/ephemeral-Vertrag | `test:fixture`, `test:safety` |
| FA-02 | Infrastruktur | Keine Disk, kein Planwechsel, kein Infrastruktur-Backup/Restore | `test:safety`, Blueprintreview |
| FA-03 | Persistenzgrenze | `/tmp`-Verlust dokumentiert; Neustart baut markierte Baseline reproduzierbar neu und entfernt innerhalb derselben Transaktion alle kombinierten, Fixture- und unlesbaren Sitzungen | `test:fixture`, Handbuchreview |
| FA-04 | Fail-closed Identitaet | NODE_ENV, APP_ENV, Service-ID/-Name, Host, HTTPS-Origin, Release/Paket, Branch, erwarteter=tatsaechlicher Commit, DB-Pfad und Renderkontext vor DB-Anlage exakt; Legacy-Registrierung, Test-Einladungslink und Seed-Passwortreset fehlen oder sind exakt false | `test:fixture`, `test:safety` |
| FA-05 | Synthetischer Umfang | Globale DB-Invariante mit exakt zwei Haeusern, vier Konten, fuenf Ressourcen, einer Wohnung und zwei erlaubten Hausadminbindungen; jedes unmarkierte weitere Fixture-relevante Objekt stoppt `ready` | `test:fixture` |
| FA-06 | Exklusive Rollen | Bewohner, Haus-Admin und Superadmin jeweils exklusiv; kombiniertes Bestandskonto unveraendert | `test:fixture`, `test:roles` |
| FA-07 | Credentials | Drei getrennte Owner-Runtimewerte; kein Wert in Code, Ausgabe oder Artefakt | `test:fixture`, Quellscan |
| FA-08 | Fake-Sink | Tatsaechliche E-Mail-/Pushprovidergrenzen laufen nur in den abstrakten lokalen Sink; Providerbindungen fehlen und der direkt am Provider-Wrapper gemessene Zaehler fuer externe Provider-, DNS-, E-Mail-, Push- oder Backupattempts bleibt null | `test:fixture`, `test:safety` |
| FA-09 | No-PII | Keine reale Adresse, Kontakt-, Push-, Opt-in-, Outbox- oder Personendaten | `test:fixture`, Quellscan |
| FA-10 | Gemeinsame Version | Fixture und Restplatz verwenden exakt `0.3.0-test.17` | `test:safety` |
| FA-11 | Bestand | Bestehender kombinierter Seed-Admin wird nicht geaendert; test.10 bleibt ausserhalb | `test:fixture`, Identitaetsgate |
| FA-12 | Produktion | Fehlende oder abweichende Identitaet stoppt vor Dateisystem/DB; keinerlei Produktionspfad | `test:fixture`, `test:safety` |

Startupdiagnose: Guard-, Storage-, Fixture-, Migrations- und Listenerfehler muessen ueber `startup.js` in genau eine allowlistete Zeile abgebildet werden. Credentialfehler verwenden exakt `STARTUP_ABORT class=GUARD_CREDENTIALS failMask=0xN`: `0x1` Fixture-Policy, `0x2` fehlende paarweise Fixture-Verschiedenheit, `0x4` Seed-Policy und `0x8` Fixture-Seed-Ueberschneidung. Alle vier Praedikate werden unabhaengig ausgewertet und OR-kombiniert; `0x0` ist kein Fehler. Andere Fehlerklassen behalten `WASCHZEIT_STARTFAIL class=...`. Die Einzeile muss vor dem Fatalexit vollstaendig ueber einen synchronen FD-2-Schreibpfad ausgegeben werden. Canaries pruefen, dass weder Credentialzuordnung, Wert, Hash, tatsaechliche Laenge, Zeichenklasse, Stack, Pfad, Env-Name/-Wert, Secretmerkmal, Hook, ID noch PII ausgegeben werden. Fuer `uncaughtException` und `unhandledRejection` prueft je ein echter Node-22.23.1-Kindprozess mit gepipetem stdout/stderr einen vor dem Ereignis erreichbaren HTTP-Listener, den vollstaendig empfangenen Einzelmarker, Nichtnull-Exit innerhalb der Frist, terminales Prozessende und danach fehlende Health-Erreichbarkeit. Ein erzwungener synchroner Schreibfehler muss ebenfalls terminal und ohne erreichbaren Health-Endpunkt enden. Das verdeckte `SEED_ADMIN_PASSWORD` wird ohne Readback und ohne Hashausgabe nur intern gegen den unveraenderten Staerke-/Distinctness-Vertrag geprueft.

Das Releasegate prueft zusaetzlich die einzige erlaubte Choreografie: ein gemeinsames Render-Environment-`Save only` fuer drei Owner-Fixturesecrets, erwarteten Commit und Guardwerte muss null Deploys erzeugen; danach darf genau ein Fast-forward-Push auf `refs/heads/codex/agent-test` genau eine AutoDeploy-ID ausloesen. AutoDeploy-Umschaltung, Manual Deploy, Restart, Hook, Blueprint-Sync, zweiter Push oder Retry sind ausgeschlossen. Diese Schritte sind kein Bestandteil lokaler Tests und werden erst nach Freeze, CTO-, QA- und Owner-GO durch DevOps nachgewiesen.

## F. Stoerungen und Maschinentagebuch

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| LOG-01 | Bewohnermeldung | Ressource liegt im neutralen Fall; persoenlicher Titel und Beobachtung liegen getrennt und loeschbar im eigenen Report | `npm test`, `node scripts/maintenance-reporting-test.js`, `test:roles` |
| LOG-02 | Weitere Meldung | Erzeugt einen eigenen Report am offenen neutralen Fall statt eines zweiten Parallelfalls oder einer vermischten Reporterchronik | `npm test`, `node scripts/maintenance-reporting-test.js` |
| LOG-03 | Uebernahme/Sperre | Ohne explizite Wahl `sperren`/`verfuegbar lassen` keine Mutation; Wahl und Statuswechsel atomar. `action=block`, allgemeine Ressourcenbearbeitung, fehlende/ungueltige Wahl, Fremdhaus und parallele Uebernahme koennen den ersten Wechsel aus Neu nicht umgehen. Eine Sperre entfernt/verschiebt keine bestehende Buchungszeile und weist Betroffenheit nur lesend aus | `npm test`, `test:roles` |
| LOG-04 | Reparatur | Sachliche Pflichtnotiz und Statusfolge fuer gesperrte wie verfuegbare Faelle; kein Abschluss direkt aus Bearbeitung | `npm test`, `test:roles` |
| LOG-05 | Funktionspruefung | Erst nach dokumentierter Reparatur; fehlgeschlagen bleibt in Bearbeitung, erfolgreich erlaubt den passenden Abschluss | `npm test`, `test:roles` |
| LOG-06 | Freigabe/Abschluss | Nur nach Reparatur, erfolgreicher Pruefung und Abschlussnotiz; fallbezogene Sperre atomar freigeben, sonst Ressource unveraendert aktiv lassen | `npm test`, `test:roles` |
| LOG-07 | Unveraenderbarkeit | Keine Loeschroute; alte Chronik bleibt erhalten | `npm test` |
| LOG-08 | Suche und Hausgrenze | Haus-Admin nur eigenes Haus; Superadmin ausschliesslich das serverseitig aktiv gewaehlte Haus, Fremdhaus-ID liefert 404 ohne Seiteneffekt | `test:roles` |
| LOG-09 | Idempotente Erstellung | Gleicher kontogebundener Schluessel und gleiches normalisiertes Payload liefern dieselbe report_id ohne zweite Mutation; abweichendes Payload liefert 409; Pre-Commit-Fehler speichert nichts | `npm test`, `node scripts/maintenance-reporting-test.js` |
| LOG-10 | Multi-Reporter-Privacy | Zwei Personen am selben Fall sehen jeweils nur eigene Texte, Report-IDs und Opt-ins; Bewohnerantworten enthalten strukturell weder technischen Fallstatus noch gemeinsame Fall-IDs/-zeitpunkte, Admin-, Audit-, Reparatur-, Zustell- oder fremde Reporterfelder. Manipulierte Report-/Fall-/Haus-ID gibt keine Fremddaten oder Existenzinformation preis | `npm test`, `node scripts/maintenance-reporting-test.js`, `test:roles` |
| LOG-11 | Neutraler Auditkern | Kein Reportername, Kontakt, Freitext oder Adminname/-kontakt in Fallkern, Chronik oder Wartungs-Audit; erlaubt sind neutraler Aktionscode, Statusflag, actorRef und Rolle | `npm test`, `node scripts/maintenance-reporting-test.js` |
| LOG-12 | Legacy-Migration | Markerbasierte Transaktion verschiebt eindeutig zuordenbare PII in Reports, scrubbt Kern/Chronik/Audit und ist beim zweiten Lauf zaehlerstabil; kein Produktionsvollzug | `node scripts/maintenance-reporting-test.js` |
| LOG-13 | Reporter-Opt-ins und E-Mail-Verfuegbarkeit | Pro Report standardmaessig Push/E-Mail aus; Push nur bei `active` Subscription desselben Kontos im Meldungshaus. E-Mail nur fuer ein aktives Konto, wenn die normalisierte aktuelle Primaeradresse exakt ihrem dauerhaft gespeicherten Bestaetigungswert entspricht, sonst entsprechend gebundene Zweitadresse als Fallback. Flag ohne Bindungswert, nach Bestaetigung geaenderte nichtleere Adresse, geloeschte, unbestaetigte, fremde oder inaktive Adresse bleibt in Projektion, Erstellung, Praeferenz, Queue und Versand unavailable. Aenderung/Loeschung entfernt Flag und Bindung; Startup-Migration entwertet Legacy-Flags ohne belastbaren Wert; Export und Payloads enthalten keine Bindungswerte. Statusereignis nur bei echtem Statuswechsel; Notiz/Reload/Same-Status erzeugt nichts | `node scripts/maintenance-reporting-test.js`, `npm test`, `test:e2e` |
| LOG-14 | At-most-one Providerattempt und atomarer Claim | Fachmutation bleibt eindeutig erfolgreich; Zustellfehler ist getrennt. Admin- und Reporter-Outbox werden atomar beansprucht und Versuchsbeginn wird vor dem ersten moeglichen Providerkontakt dauerhaft markiert. Synchron gestartete Worker, Leaseablauf, Timeout, Providerfehler, Prozess-Recovery und Settlement-Token-Drift erzeugen insgesamt hoechstens einen Providerattempt je Ereignis/Empfaenger/Kanal; unklarer Ausgang ist terminal sichtbar und nie automatisch retrybar. Nur sicher vor Providerkontakt gescheiterte Vorbereitung bleibt planbar. `summary.sent` steigt nur nach erfolgreichem claimgebundenem Settlement. Mid-Batch-Revalidierung und getrennte Reminderfenster bleiben erhalten | `node scripts/maintenance-reporting-test.js`, `test:roles` |
| LOG-15 | Produktionsmigration | Zu migrierende Bestands-PII bleibt bei deaktiviertem Backup oder Backupfehler byte-/feldgleich und der Server startet keinen Listener; erst ein verifiziertes Vor-Migrationsbackup erlaubt die transaktionale Bereinigung | `node scripts/maintenance-reporting-test.js`, `npm test` |
| LOG-16 | Eigener Export und vollstaendige Ansicht | Export-Allowlist enthaelt nur eigenen Meldungsinhalt, eigenen Zeitpunkt, eigene Push-/E-Mail-Opt-ins, drei Hauptstatus und neutralen Haus-/Ressourcenkontext; keine gemeinsamen Fallzeitpunkte, Admin-, Audit-, Provider-, Queue-, Delivery- oder Outboxfelder. Mehr als acht eigene Meldungen bleiben stabil sortiert vollstaendig erreichbar und zeigen jeweils die eigene Beschreibung; fremde Personen und Haeuser bleiben unsichtbar | `npm test`, `node scripts/maintenance-reporting-test.js`, `test:e2e` |

## G. Benachrichtigungen, PWA und Bedienung

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| NOT-01 | Lokales SMTP | Wohnungseinladung, Bestaetigung, Reset, Admin-Reset und Freigabe-Mail werden zugestellt | `npm test` |
| NOT-01A | Freigabe-E-Mail-Revalidierung je Empfaenger | Bei mehr als fuenf Zielen werden Aktivstatus, Haus, Opt-in, Filter, aktuelle Adresse, Flag und exakter Bindungswert unmittelbar vor jedem Provideraufruf frisch geprueft. Aendern, Leeren, Deaktivieren, Haus-/Opt-in-/Bindungsentzug oder verschwundene Ziel-ID waehrend Batch 1 ergibt fuer spaetere Batches null Providerattempts; unveraenderte Ziele bleiben dedupliziert zustellbar | `npm test`, `test:safety` |
| NOT-02 | Push-Abo | Anlegen, gezielter Test, Deaktivierung und ungueltiges Geraet; fehlerhafter Kurvenschluessel wird still deaktiviert | `npm test` |
| NOT-03 | Freigabe-Mitteilung | Person, Ressource, Datum, Slot und direkte Buchungsfrage | `npm test` |
| NOT-04 | Adminmeldung und Erinnerung | Je neuer Einzelmeldung genau ein Ereignis pro aktivem Endpoint eines ausdruecklich hauszugeordneten Admins. Vor jedem einzelnen Provideraufruf werden Rolle, Haus, Subscription, Endpoint und Hash frisch validiert; Mid-Batch-Entzug oder Reassignment ergibt null spaetere Versuche. 1:59:59 ohne Erinnerung, 2:00 genau eine, bis unter 4h keine weitere, 4:00 naechstes Fenster; nach Unterbruch keine Nachholflut und nach Statuswechsel keine Erinnerung | `node scripts/maintenance-reporting-test.js`, `test:roles` |
| PWA-01 | Manifest und Service Worker | Installierbar, Update erst nach Zustimmung, Push-Klick oeffnet Ziel | `test:a11y`, `npm test` |
| PWA-02 | Test-/Produktname | Missing, leer, unbekannt, lokal, Staging und Agent-Test liefern in HTML, Kopfzeile, Manifest, Health, Version, Offline-Shell und angemeldetem `document.title` `WaschZeit Test`; Login, Reload, Navigation, Sprache, Session- und Hauswechsel verlieren die Kennzeichnung nicht. Nur explizites `APP_ENV=production` plus `NODE_ENV=production` liefert `WaschZeit` | `npm test`, `test:e2e`, `test:media` |
| UI-01 | Tastatur, Fokus, Dialoge und Untertitel | Zugaengliche Namen, Fokusstatus und reduzierte Bewegung | `test:a11y`, `test:e2e` |
| UI-02 | Mobile und Desktop | Kein horizontales Ueberlaufen; Screenshots bei 390 x 844, 768 x 1024 und 1440 x 900 | `test:e2e`, manuelle Sichtpruefung der Artefakte |
| UI-03 | Skript- und HTML-Verknuepfung | Alle statischen `querySelector`-Ziele der Anmelde-, Waschplan- und Reset-Skripte existieren im zugehoerigen HTML | `test:a11y` |

## H. Sprache, Rollenfuehrungen und Verwaltungsuebersicht

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| I18N-01 | Katalogvollstaendigkeit | Jeder zentrale sichtbare Schluessel besitzt `de` und `en`; kein roher Schluessel wird ausgegeben | `test:i18n` |
| I18N-02 | Standard und Rueckfall | Ohne gueltige Wahl gilt Deutsch; unbekannte Werte fallen auf Deutsch zurueck | `test:i18n`, `test:security` |
| I18N-03 | Vor Login persistent | Auswahl auf `/login.html` oder der Einladung bleibt nach Reload und Navigation erhalten und wird bei Kontoaktivierung uebernommen | `test:e2e`, manueller Browserlauf |
| I18N-04 | Kontosprache persistent | `PUT /api/me/language` akzeptiert nur `de/en`; Wert bleibt nach Logout/Login erhalten und aendert keine Rolle | `test:security` |
| I18N-05 | Englische Kernseiten | Login, Einladung, Reset, Datenschutz, Waschplan sowie alle Haus-Admin- und Superadminreiter mit dynamischen Aufgaben, Ressourcen, Einladungen, Tagebuch, Auswertung, Leer-, Lade-, Fehler- und Erfolgszustaenden sind englisch; bekannte deutsche Admintexte werden im englischen DOM abgewiesen | `test:e2e`, manuelles Review |
| I18N-06 | Benachrichtigungen | Verifizierung, Reset, Freigabe, Testmail und Push verwenden Empfaengersprache; Einladung vor Kontoaktivierung ist zweisprachig | `test:i18n`, `npm test` |
| I18N-07 | Sprachwechsel ohne Reload | DE zu EN und EN zu DE aktualisieren den vollstaendig gerenderten Bewohnerbereich mit Hero, eigenen Buchungen, Leerzustand, Kalender, Empfehlung, Buchungsassistent und Mitteilungen sowie alle dynamischen Verwaltungsansichten sofort; ein Gesamtseiten-Leakdetektor weist bekannte deutsche Systemtexte im englischen Zustand ab. Haus, Rechte, Kalender- und Buchungszustand, Einstellungsreiter, Eingaben, Fokus, Verwaltungsreiter und Einfuehrungskapitel bleiben erhalten; Haus-Admin und Superadmin durchlaufen zusaetzlich EN -> DE -> EN | `test:i18n`, `test:e2e` |
| I18N-08 | Einstellungen vollstaendig | Alle fuenf Einstellungsreiter, ihre dynamischen Statuszeilen und nativen Optionen wechseln DE -> EN -> DE ohne Reload; aktiver Reiter, Fokus, Nutzerdaten, ungespeicherte Eingaben und technische Select-Werte bleiben erhalten; bekannte deutsche Resttexte werden im englischen Dialog abgewiesen | `test:i18n`, `test:a11y`, `test:e2e`, Screenshotreview bei 390 x 844, 768 x 1024 und 1440 x 900 |
| VID-01 | Sechs Kombinationen | Bewohner, Haus-Admin und Superadmin besitzen je `de` und `en` als echtes MP4/VTT/Poster/Transkript-Paket und als interaktive Fuehrung | `test:i18n`, `test:media` |
| VID-02 | Rollenwahl | Superadmin, Haus-Admin und Bewohner erhalten nur das passende Medienpaket; Sprache folgt Kontosprache | `test:i18n`, `test:e2e` |
| VID-03 | Kapitel | Startzeiten steigen, Titel/Beschreibung/Rolle/Sprache/Transkript sind vollstaendig; Maus, Touch und Tastatur springen an die korrekte MP4-Zeit und markieren das aktive Kapitel | `test:i18n`, `test:a11y`, `test:e2e` |
| VID-04 | Medienformat | Alle sechs MP4s sind 1280 x 720, enthalten H.264/AAC-Marker und besitzen exakt passende Laufzeit; VTT-Zeiten sind bei LF- und CRLF-Checkout geordnet, ueberlappungsfrei und textvollstaendig | `test:media` |
| VID-05 | Fallback und PWA | Transkript und Untertitel bleiben in der Offline-Shell; MP4s werden wegen Dateigroesse weder vorab noch im Laufzeitcache gespeichert; Fehlerstatus verweist auf die Alternativen | `test:media`, `test:a11y`, `test:e2e` |
| VID-06 | Responsive Medienansicht | Jedes der sechs Pakete laedt und bleibt bei 390 x 844, 768 x 1024 und 1440 x 900 ohne horizontalen Dialogueberlauf bedienbar | `test:e2e`, Screenshotreview |
| DASH-01 | Priorisierung | Aufgaben, Warnungen und Informationen sind getrennt und besitzen konkrete Aktionen | `test:e2e`, Browserreview |
| DASH-02 | Haus- und Rollenbereich | Haus-Admin bleibt im eigenen Haus; Superadmin sieht bei globalen Tagebuchfaellen den Hausnamen | `test:roles`, `test:e2e` |
| DASH-03 | Responsive | 390 x 844, 768 x 1024 und 1440 x 900 ohne horizontalen Ueberlauf oder abgeschnittene Aktion | `test:e2e`, Screenshotreview |
| DASH-04 | Haus/Geraete-Trennung | Haus-Admin startet ausschliesslich bei eigenen Geraeten; Superadmin startet bei Haus und sieht nach Umschaltung nur Geraete des aktiven Hauses. Sprach-/Reloadwechsel erhaelt nur einen zur Rolle und zum Haus passenden Zustand | `test:roles`, `test:e2e`, Screenshotreview |
| GAME-01 | Uebungsvariation | Zwei abgeschlossene Uebungsrunden wiederholen weder die vollstaendige Aufgabe noch die Ergebnisformulierung unmittelbar; Reload umgeht den serverseitigen Vergleich nicht | `npm test`, `test:e2e` |
| GAME-02 | Faire Tagesmission | Derselbe Europe/Zurich-Tag liefert fuer alle dieselbe Mission; der Folgetag liefert bei vorhandener Alternative garantiert eine andere vollstaendige Mission | `npm test` |
| SCOPE-01 | Foto und GBMZ abwesend | Keine Foto-DB, Uploadroute, Foto-UI, EXIF-Pipeline, GBMZ-Schaltflaeche, Attrappe, Verlinkung, Einbettung oder Datenuebertragung im Kandidaten | `npm test`, `test:security`, Quellscan |

Hinweis: Dieser neue Block ergaenzt die nachfolgenden Betriebspruefungen. Die Buchstabenbezeichnung der bestehenden Abschnitte bleibt fuer historische Pruefverweise erhalten.

## I. Betrieb, Daten und Belastung

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| OPS-01 | SQLite-Backup und Restore | Externe PUT-Kopie mit optionalem Token ist gueltig; Integritaetspruefung, Neustart, Anmeldung und Ressourcenbestand sind erfolgreich | `npm test`, `test:roles`, `test:backup` |
| OPS-02 | Wartungsmodus | Aktuelles Superadmin-Passwort und Backup vor Start, Schreibsperre, Datenbank- und Buchungstest vor Ende; bei deaktiviertem Backup ist der Start bereits im UI nicht verfuegbar, eine laufende Wartung kann weiterhin sicher beendet werden | `npm test`, `test:roles`, `test:e2e` |
| OPS-03 | Auditprotokoll | Kritische Adminaktionen sind mit Haus und Ausloeser nachvollziehbar | `npm test`, `test:roles` |
| OPS-04 | Auswertung | Zeitraum, Ressourcen, Slots und gesperrte Ressourcen korrekt | `npm test` |
| OPS-05 | Mehrhaus-Jahr | 100 Personen, sechs Haeuser, 52 Wochen und 5.200 Waschpakete ohne Kollision | `test:year` |
| OPS-06 | Produktion | `/api/health`, persistenter Pfad, Revision, SMTP, Push und externes Backup | Manueller Live-Test |
| OPS-07 | Isoliertes Staging | Eigener Dienst und Zweig, Auto-Deploy aus, `npm ci`, Healthcheck, fluechtige `/tmp`-DB, keine Disk/Produktions-Env-Gruppe und alle drei Kill-Switches exakt `false` | `test:safety`, Blueprintreview |
| OPS-08 | Lean-Produktionsstart | Fehlende/falsche Produktionsidentitaet, Seed-Force-Reset, aktive Backup-/Nachrichtenflags oder vorhandene Upload-/Providerbindungen stoppen vor Dateisystem/SQLite; `AUTO_BACKUP=false` startet auch in Produktion keinen Scheduler. Der Offline-Pruefer akzeptiert nur den allowlisteten WaschZeit-Schemakern, meldet ausschliesslich Hashes/Zaehler und lehnt eine fremde Einzeltabelle ohne Inhaltsausgabe ab | `test:safety`, `npm test` |

## Manuelle Live-Abnahme

1. Render-Revision mit dem erwarteten Git-Commit vergleichen.
2. Mit einem echten Bewohnerkonto anmelden, buchen, Monatsplan pruefen und wieder loeschen.
3. Bewohnermeldung erzeugen und als Haus-Admin Sperre, Reparatur, Pruefung und Freigabe abschliessen.
4. Testpush an ein installiertes Handy senden und App aus der geschlossenen Benachrichtigung oeffnen.
5. Testmail an die gespeicherte Admin-Adresse senden, Adresse bestaetigen und Passwort-Reset vollstaendig durchlaufen.
6. Backup herunterladen, Integritaet pruefen und externe Kopie bestaetigen.
7. App auf iPhone und Android installieren sowie Updatehinweis pruefen.
