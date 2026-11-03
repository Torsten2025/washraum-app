# Unabhaengige Abnahme: emailfreier Zugang und Gesamtregression

Datum: 3. November 2026. Rolle: TESTING_QA / Independent Validator.

## Urteil: FAIL – keine Freigabe

Das unveraenderte Projektgate `npm run check` besteht vollstaendig (Exit 0). Zusaetzliche unabhaengige Browser-/API-Pruefungen weisen jedoch drei relevante Luecken in den neuen emailfreien Benutzerketten nach. Ein gruener automatischer Lauf ersetzt diese Befunde nicht. Kein Commit, Push, Deployment oder Produktionszugriff.

## Kandidat und Identitaet

- Pfad: `C:\Users\Anwender\.codex\worktrees\emailfreier-zugang\WaschplanApp 2`
- Basis-HEAD: `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380`
- Version: `0.3.15-test.1`, uncommitteter Builderstand, 54 geaenderte getrackte Dateien.
- Produktfingerabdruck vor und nach Pruefung identisch: `fd92cdd4c3d73edc4f86a14802ea96e50c861849c2418301d9774a243bb497cc`.
- Verfahren: 135 `git ls-files -z`-Pfade sortiert, SHA256 ueber je UTF-8-Pfad + NUL + originale Dateibytes + NUL. Neuer Bericht und ignorierte Testartefakte sind nicht enthalten.
- Node 22.23.1 / npm 10.9.8, lokaler Chrome, synthetische SQLite-Datenbanken; keine realen Bewohnerdaten.

## Bestaetigte Befunde

### QA-01 / P1: Emailfreie Bewohner koennen Profil und Hinweisfilter nicht speichern

Rolle: neuer Bewohner aus Zugangskarte, eigenes Haus. Reproduktion: Admin erzeugt Karte, Person aktiviert sie im Browser ohne E-Mail, oeffnet Einstellungen/Profil und versucht ohne Adresse zu speichern beziehungsweise Hinweisfilter zu aendern.

Soll: E-Mail ist freiwillig; persoenliche Einstellungen und Filter bleiben ohne Adresse speicherbar.

Ist: `#notificationEmail.required=true`, `checkValidity()=false`, gesamtes `notificationForm.checkValidity()=false`. Der direkte reale `PUT /api/me/notifications` mit leerer Adresse, `notifyReleases:false`, `resourceType:washer`, `weekday:1` liefert 400 und `Bitte eine gueltige E-Mail-Adresse eintragen`. Frontend und API erzwingen weiterhin E-Mail. Damit sind auch Push-/In-App-Filter beziehungsweise deren Abschaltung fuer emailfreie Konten nicht vollstaendig bedienbar.

Belege: `public/index.html:895`, `src/routes/notifications.js:107`, `public/app.js` gemeinsamer Speicherweg; `artifacts/qa-access-review.cjs`, `artifacts/qa-emailfree-settings.png`. Verantwortung AUTH_KONTEN / BENACHRICHTIGUNGEN / FRONTEND_UX. Regression: echte Kartenaktivierung, Profil- und Filteraenderung ohne E-Mail, Reload/Persistenz, freiwillige Adresse hinzufuegen/entfernen, DE/EN, keine Rechteaenderung.

### QA-02 / P2: Wiederherstellung nennt fuer Bestandskonten einen unbrauchbaren Login

Rolle: aktiver Bewohner mit unbestaetigter bestehender E-Mail und altem Benutzernamen. Synthetischer Bestandsfall wird in der isolierten Testdatenbank hergestellt, danach ausschliesslich reale APIs benutzt. Admin erstellt persoenlichen Recoverycode (201). Bewohner bestaetigt Code und neues Passwort, laesst die neue E-Mail leer (200).

Soll: Abschluss nennt eine tatsaechlich erlaubte Anmeldekennung.

Ist: Antwort fordert `legacy-user` und neues Passwort. Login mit dieser Kennung liefert 401; derselbe neue Passwortwert mit erhaltener E-Mail liefert 200. Der Loginvertrag verbietet alte freie Namen bei vorhandener E-Mail weiterhin korrekt, aber der neue Wiederherstellungstext widerspricht ihm.

Belege: `src/routes/accounts.js:726` gegen Loginabfrage im selben Modul, realer Reproduktionslauf `artifacts/qa-access-review.cjs`. Verantwortung AUTH_KONTEN / FRONTEND_UX. Regression: Recovery ohne neue Adresse sowohl fuer WZ-Kartenkonten als auch fuer Legacy-Konten mit unbestaetigter Adresse, anschliessender Login genau nach angezeigter Anweisung.

### QA-03 / P2: Dauerhafte Zugangskennung verschwindet aus der Bedienkette

Rolle: neuer Kartenbewohner. Nach QR-Aktivierung zeigt das sichtbare Profil nur `QA Klingelschild`; `document.body.innerText.includes(currentUser.username)` ist false. `settingsUsername` wird durch den Klingelschildnamen belegt. Die Aktivierungsseite zeigt die Kennung vorher, fordert im Kartenweg aber keine gesicherte Aufbewahrung. Gleichzeitig verlangt `PILOTPAKET.md` nach Aktivierung und gezeigter Abmeldung die Vernichtung der Karte.

Soll: Die fuer alle spaeteren Anmeldungen benoetigte zufaellige Kennung muss vor Kartenvernichtung gesichert und im eigenen Konto wieder auffindbar sein.

Ist: Wer dem beschriebenen Onboarding folgt und die Karte vernichtet, hat danach keinen sichtbaren Weg zur Kennung; bei Abmeldung droht eine vermeidbare Support-/Wiederherstellungsschleife. Kein nachgewiesener Datenverlust, aber relevante Onboardingluecke.

Belege: `public/app.js:1282` und `:2635`, `public/login.js` Kartenabschluss, `PILOTPAKET.md:25` und `:36`; Browserreproduktion im QA-Artefakt. Verantwortung FRONTEND_UX / AUTH_KONTEN / DOKUMENTATION. Regression: Kennung nach Aktivierung sichtbar/sicherbar, Profil erneut oeffnen, Reload, Kartenvernichtung erst nach Sicherung, Abmelden und erneutes Anmelden.

## Funktionsinventur und tatsaechliche Pruefstaende

PASS in dieser Tabelle bedeutet: die genannten automatischen beziehungsweise gezielten lokalen Ketten bestanden. Es bedeutet nicht, dass jede moegliche Kombination jeder Schaltflaeche auf jedem realen Geraet manuell abgenommen wurde. B=Bewohner, H=Hausadmin, S=Superadmin, K=kombinierte Bewohner-/Adminrolle.

| Bereich / Aktionen | Rollen | Stand und Beleg |
| --- | --- | --- |
| Gastschutz, Login, Fehler, Origin, Cookie, Rate-Limits | B/H/S | PASS security 24/24 |
| E-Mail-Einladung anlegen/annehmen, Einmaligkeit, vorhandene Identitaet | B/H/S/K | PASS security/app/roles/E2E; SMTP nur lokaler Testserver |
| Karte erzeugen/aktivieren, manuelle Kennung, Widerruf, Hausgrenze | B/H/S | PASS security/roles/E2E; Folgeketten QA-01/03 FAIL |
| Partner-QR, eigener Zugang, keine Adminrechte kopieren | B/K | PASS security/app/roles/E2E |
| Passwortwechsel, Reset, Sperre, Wiederherstellung | B/H/S | PASS vorhandene Regression; Legacy-Recovery QA-02 FAIL |
| 30-Minuten-Sitzung, 90-Tage-Geraet, Renewal, Logout, Fehlversuch/Retry | alle | PASS echter persistenter Browser DE/EN und Session-Store-Rennen |
| Profil, Sprache, Buchungsmodus, Hinweisfilter | alle | DE/EN/Persistenztests PASS; emailfreier Speicherweg QA-01 FAIL |
| Wochen-/Monatskalender, Tagesdetails, Empfehlung, Einzel-/Paketbuchung | B/K; Admin lesend | PASS app/E2E/Jahr |
| GBMZ/Liberal, Vergangenheit, Sonntage, Tumbler, Trockenraum | B/K; S konfiguriert | PASS app/roles/Jahr |
| Restplaetze, Selbsttrocknung, Konflikt, Storno, Idempotenz | B/K | PASS remaining-slots/app/E2E |
| Absage, fruehe Freigabe, Loeschen, Mitteilungsziel | B/K/H/S nach Rechten | PASS app/roles/E2E; externe Zustellung nicht bestaetigt |
| Persoenlicher ICS-Feed, Rotation, Widerruf, Privacy | B/K | PASS app/roles/E2E |
| Stoerung, eigene Berichte, Opt-ins, Export | B/K | PASS maintenance/app/roles/E2E |
| Tagebuch: Uebernehmen/Sperre, Reparatur, Test, Freigabe | H/S | PASS maintenance/app/roles; negative Hausgrenzen |
| Wohnungen/Klingelschild, Namenskorrektur, Konten/Sperren | H/S | PASS app/roles/E2E, Zugangsketten siehe Befunde |
| Hausanlage, Aktivstatus, Hauswechsel und Regelmodus | S | PASS roles/app/E2E; H/B negative Tests |
| Ressourcen anlegen/umbenennen/sperren, leeres Haus | H/S | PASS app/roles/E2E |
| Dauertermine/Serien, Vorschau, Rueckmeldung, Entfernen | H/S | PASS 2847 recurrence checks und Serienbrowser; Teile des Browser-POST sind explizit gemockt, API-Pruefung getrennt |
| Auswertung, Audit, Notfallstatus | H/S | PASS app/roles/E2E |
| Zusatzrollen, Peer-Schutz, Superadminrechte, Umzug | S/H/K | PASS roles; keine Hausverletzung in Jahressimulation |
| Backup, Restore, Wartung, Reset/Kill-Switches | S bzw. H nach Vertrag | PASS app/roles/backup/safety/production-release lokal; Produktionsvollzug ungeprueft |
| Datenschutzseite, Export, Loeschen, geschuetzte Konten | alle | PASS app/maintenance/roles/a11y |
| Einfuehrung, Quiz, Kapitel, sechs DE/EN-Medienpakete | alle | PASS i18n/media/E2E; keine neue subjektive Komplettabhoerung aller Sprecheraufnahmen |
| Windel-Alarm, Tages-/Uebungsrunde, Rangliste, Fehler/Finale | alle | PASS app/roles/E2E; keine Spielcodeaenderung |
| PWA, Update, Offline-Shell, Installation/Push | alle | lokale Verträge PASS; echtes iOS/Android/Push/Installieren extern offen |
| Zugangskarte Druckansicht | H/S | Print-Media nach vollstaendigem Adminladen sichtbar, QR/Text lesbar; physischer Ausdruck nicht getestet |

## Pflichtpruefungen

- `npm run check`: unabhaengig erneut vollstaendig ausgefuehrt, Exit 0. Alle enthaltenen 16 Schritte PASS.
- `test:security`: 24/24; Session-/Remember-Browser ebenfalls PASS.
- `test:roles`: Bewohner, Hausadmin, Superadmin, kombinierte Rollen, Fremdhaus und Peer-Schutz PASS.
- `test:year`: 6 Haeuser, 100 Bewohner, 52 Wochen, 5200 Waschpakete, 0 Hausverletzungen, 94.2 Sekunden.
- `test:i18n`: 1111 Schluessel und 6 Rollen-/Sprachfuehrungen.
- `test:media`: sechs Pakete, zusammen 9300471 Videobytes.
- `test:maintenance`, `test:remaining-slots`, `test:fixture`, `test:safety`, `test:production-release`, `npm test`, `test:a11y`, `test:backup`: PASS.
- `test:e2e`: PASS, echter Systembrowser, DE/EN und 320/390/760/768/1024/1048/1440 je jeweiliger Suite; Serien-, Rollen-, Haus-, Einstellungs-, Medien- und Spielketten.
- `git diff --check`: Exit 0; nur Zeilenende-Hinweise.
- Gezielt `node artifacts/qa-access-review.cjs`: reproduziert QA-01/02/03, erzeugt stabile Screenshots nach Initialisierung/Animation. Exit 0 bedeutet erfolgreichen Reproduktionslauf, NICHT bestandene Produktabnahme.
- Quellscan `public`, `src`, `server.js`: keine Treffer fuer typische Mojibake-Folgen, private-key-Header, GitHub-PAT-/AWS-Keymuster oder lokale Windows-Benutzerpfade. Musterscan ist kein umfassender Geheimnisdetektor.
- Sichtpruefung neuer Settings-/Print-Screenshots sowie Admin-Mobil-/Desktopbeispiele erfolgt. Voruebergehende Einblendzustaende wurden nicht als Produktfehler gewertet.

## Abdeckungsgrenzen und externe Restpunkte

- Aktuelle externe Schwachstellendatenbank (`npm audit --omit=dev`, SEC-05) in diesem Lauf nicht abgefragt; kein Audit-PASS behauptet.
- Reale Render-Auslieferung, Produktionsmigration, Disk-/Backup-Proof, Providerzustellung, echter Handy-Push, Kamera-QR und physischer Ausdruck nicht durch lokale Mocks ersetzt.
- Die drei-fache Wiederholung der historischen Race-Spezialabnahme BOOK-13 wurde in dieser unabhaengigen Runde nicht erneut beansprucht; ein kompletter aktueller Check mit E2E wurde ausgefuehrt.
- Druckdarstellung ist nicht leer: ein anfangs zu frueh vor `loadAdmin` aufgenommenes Ergebnis wurde verworfen. Karte wird sichtbar gedruckt, aber manuelle Einstiegs-URL fehlt; dies ist ein Bedienhinweis, kein separater blockierender Druckbefund.
- Handbuch/Testplan sind umfangreicher als der automatisierte Gatebeweis; ungetestete externe oder manuelle Varianten erhalten hier kein stilles PASS.

## Uebergabe

Enger Korrekturauftrag empfohlen: QA-01 bis QA-03 beheben, gezielte Regression ergaenzen, neuen Freeze bilden und unabhaengig erneut pruefen. Endurteil bleibt bis dahin FAIL. Es wurde ausschliesslich dieser Bericht sowie ignorierte QA-Testartefakte geschrieben; vorhandene Produktdateien, Tests, Konfiguration und Medien wurden nicht veraendert.
