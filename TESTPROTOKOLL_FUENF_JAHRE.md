# Fuenfjahres-Simulation mit 20 Bewohneridentitaeten

Datum: 3. November 2026. Rolle: TESTING_QA. Kandidat: `0.3.15-test.1`, Basis `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380`.

## Ergebnis

Der final eingefrorene Langzeittest ist **PASS, Exit 0**, Laufzeit 226,1 Sekunden. Er durchlaeuft 261 Wochenzyklen zwischen 1. Januar 2027 und 31. Dezember 2031 mit einer virtuell fortschreitenden JavaScript-Serveruhr. Dies ist eine beschleunigte, deterministische Stichprobensimulation, kein fuenf Jahre ununterbrochener Echtbetrieb.

Die Gesamtfreigabe bleibt **FAIL** wegen der bereits dokumentierten offenen Befunde QA-01 bis QA-03: E-Mail-Zwang beim Speichern von Profil/Hinweisfiltern, falsche Loginanweisung bei Legacy-Recovery, fehlende sichtbare dauerhafte Zugangskennung. Diese wurden nicht korrigiert und werden durch den Langzeittest nicht aufgehoben.

## Population und Haushalte

- Genau 20 Bewohneridentitaeten, davon 18 wohnungsgebunden in acht Haushalten und zwei bewusst ungebundene Legacy-Identitaeten fuer den bestehenden Umzugsweg.
- Zusaetzlich drei technische Verwaltungskonten: ein Superadmin und zwei reine Hausadmins. Die 20 Bewohneridentitaeten bleiben zahlenmaessig konstant; zwei Legacy-Identitaeten erhalten waehrend der Umzugspruefung voruebergehend Hausadminrechte, die beim Umzug entfallen.
- Drei getrennte Haeuser mit eigenen Ressourcen, keine echten Personen oder Produktionsdaten.
- Acht Wohnungsmodelle: Single (1 erwachsenes Konto), Paar (2), Alleinerziehend mit Kindern (1), Eltern mit Kindern (2), Dreier-WG (3), Mehrgenerationenhaushalt (3), Patchwork mit drei erwachsenen Nutzern (3), WG mit befristeter Abwesenheit (3).
- Kinder werden nicht als neue Berechtigungsart modelliert. Familienmodelle bedeuten hier unterschiedliche Wohnungsmitgliedschaften und Nutzung, nicht eine nicht vorhandene familienrechtliche Fachlogik.
- Acht Erstzugangsaktivierungen erfolgen ueber die reale Zugangskarten-API, zehn weitere Mitglieder ueber den realen Partner-QR-Weg. Die zwei Legacy-Identitaeten und die beiden Hausadmins werden transparent als synthetischer Datenbankbestand vorbereitet; der vorhandene lokale Entwicklungs-Seedbewohner wird dabei wiederverwendet.

## Last und Jahresergebnisse

Singles und der Ein-Erwachsenen-Haushalt buchen alle zwei Wochen. Mehrpersonen-Haushalte buchen woechentlich, mit wechselnder handelnder Person; Dreipersonenhaushalte nutzen zwei Waschmaschinen. Tumbler werden in jeder zweiten Woche zusaetzlich gebucht. Alle vier Wochen werden Pakete durch ein berechtigtes Wohnungsmitglied storniert und erneut gebucht. Alle Haushalte bleiben in diesem Szenario im Regelmodus GBMZ.

| Kalenderjahr | Wochenzyklen | Erzeugte Pakete inklusive Ersatz nach Storno | Erfolgreiche Legacy-Hausumzuege |
| --- | ---: | ---: | ---: |
| 2027 | 52 | 468 | 8 |
| 2028 | 52 | 468 | 8 |
| 2029 | 53 | 484 | 10 |
| 2030 | 52 | 468 | 8 |
| 2031 | 52 | 468 | 8 |
| Gesamt | 261 | 2356 | 42 |

Weitere gemessene Ergebnisse:

- 13.584 echte lokale HTTP-Anfragen des Testclients; Server-Health-Polling nicht mitgezaehlt.
- 1.828 regulaere Erstpakete und 528 Storno-/Ersatzketten, zusammen 2.356 erzeugte Pakete.
- 1.828 erfolgreiche Pruefungen der gemeinsamen Wohnungsbuchungsansicht.
- Je 1.828 abgewehrte Doppelbuchungs-, Vorausbuchungsquoten- und Fremdhausversuche.
- 168 Kalender-/Datensparsamkeitsstichproben und 168 persoenliche Exporte.
- Sechs fruehe Freigaben waehrend eines tatsaechlich nach virtueller Schweizer Zeit laufenden Slots, nicht elf halbjaehrliche Freigaben.
- Ein nach sieben Tagen abgelaufener Zugangskarten-Token wird abgewiesen; ein Buchungsversuch im Jahr 2027 wird am Ende 2031 als vergangen abgewiesen.
- Am Ende 5.784 gespeicherte Buchungszeilen, einschliesslich erhaltener synthetischer Legacy-Historie; stornierte/ersetzte Buchungen sind nicht doppelt als Bestand gezaehlt.
- SQLite `integrity_check=ok`, keine Fremdschluesselverletzung und keine doppelte Ressourcenbelegung.
- Keine aktuelle oder zukuenftige Buchung im falschen Haus. Historische Legacybuchungen bleiben absichtlich im frueheren Haus; sie sind keine Hausverletzung. Das Rohfeld `crossHouseBookings: 0` bezeichnet ausschliesslich diese aktuelle/zukuenftige Invariante, nicht alle historischen Zeilen.

## Abwesenheit, Rueckkehr und Umzuege

Ein WG-Mitglied wird alle 13 Wochen deaktiviert und vier Wochen spaeter reaktiviert. Jede der 80 abgeschlossenen Abwesenheits-Kontowochen prueft erneut `GET /api/my-bookings -> 401` und Login `-> 403`. Reaktivierung belebt das alte Sitzungscookie nicht; eine neue Anmeldung ist erforderlich. Es gab 21 Deaktivierungen und 20 Rueckkehren. Die letzte Abwesenheit beginnt in der letzten Simulationswoche und bleibt zum Ende offen. Es handelt sich um Zugangsentzug/Abwesenheit und Rueckkehr derselben Person in derselben Wohnung, nicht um einen bewiesenen echten Wohnungswechsel.

Die zwei ungebundenen Legacy-Identitaeten durchlaufen insgesamt 42 reale Umzugs-API-Ketten. Vor jeder Kette wird eine vergangene und eine zukuenftige Buchung **explizit per SQL als Altbestand** vorbereitet. Das ist kein erfolgreicher normaler Buchungsvorgang: Konten ohne Wohnung koennen hier nicht normal buchen. Die zusaetzliche negative Buchungsprobe erfolgt nach Erteilung der reinen Adminrolle und belegt daher genau diese Rolle ohne Wohnung, nicht separat den ungebundenen Bewohnerzustand.

Anschliessend laufen ausschliesslich reale APIs: Umzug mit zukuenftiger Buchung `409`; Adminstorno der zukuenftigen Buchung `200`; danach Umzug `200`. Der historische Datensatz bleibt erhalten. Saemtliche Hausadminbindungen entfallen, die alte Sitzung ist ungueltig, die neue Anmeldung besitzt nur Bewohnerrechte im Zielhaus. Dies wurde fuer alle 42 Umzuege nachgewiesen, einschliesslich historischer Erhaltung und neuer Hauszuordnung.

Wohnungsgebundene Konten werden 21-mal mit dem bestehenden Umzugsweg verschoben: korrektes Ergebnis nach aktuellem Handbuch ist jeweils `409`. **Die App unterstuetzt damit keinen direkten Umzug einer aktivierten Zugangskartenidentitaet in eine andere Wohnung oder ein anderes Haus.** Der Test umgeht diese Produktgrenze nicht durch heimliche SQL-Neuzuordnung. Ein echter familienbezogener Ein-/Auszugs- und Nachmieterprozess bleibt daher fachlich ungeprueft beziehungsweise im vorhandenen Produktweg nicht abbildbar. Dies ist eine wesentliche Grenze fuer den vom Nutzer gewuenschten Alltagszyklus, kein behaupteter PASS fuer alle Umzugsarten.

## Zeitmodell und Grenzen

`five-year-test-clock.cjs` ist ein ausschliesslich testbezogener Preload im separat gestarteten Entwicklungsprozess. Er setzt JavaScript `Date`/`Date.now` auf eine per IPC monoton fortschreitende Zeit. Anmeldung, Tokenfristen, Kalender-/Buchungsdatum, Schweizer Tages-/Slotlogik und monatliche explizite 90-Tage-Geraeteverlaengerung laufen damit durch die Jahre. Bestehende Produktdateien werden nicht geaendert.

SQLite `CURRENT_TIMESTAMP`, SQL `date('now')` und reale Timer behalten ihre echte Laufzeituhr. Daher wird **kein** fuenfjaehriger Nachweis fuer automatische Aufbewahrung/Loeschung, Cleanup-Scheduler, Crashwiederanlauf, Speicherdruck oder durchgehende Verfuegbarkeit behauptet. Sommer-/Winterperioden und das Schaltjahr 2028 werden datumsseitig durchlaufen; die Minuten des DST-Umschaltpunkts werden nicht lueckenlos getestet. Provider, physische Smartphones, Kamera-QR, Drucker und Produktion werden nicht kontaktiert.

Dies ist kein manuelles Fuenfjahres-Browserdurchspielen jeder Schaltflaeche. Die uebrigen User-/Admin-/Superadmin-Funktionen werden durch das separat erneut ausgefuehrte unveraenderte Projektgate und den vorhandenen unabhaengigen Abnahmebericht abgedeckt, mit deren ausgewiesenen Einschraenkungen.

## Tests, Artefakte und Ausfuehrung

- Neuer Langzeittest unter Node 22.23.1: PASS, Exit 0, 226,1 Sekunden.
- `node --check scripts/five-year-household-test.js`: PASS.
- `node --check scripts/five-year-test-clock.cjs`: PASS.
- `git diff --check`: PASS; nur bestehende LF/CRLF-Hinweise.
- Der koordinierende Hauptagent meldet fuer denselben unveraenderten Produktkandidaten erneut `npm run check`: PASS, Exit 0, inklusive Security 24/24, Rollen, Browser-E2E, Jahreslasttest mit 5.200 Waschpaketen, Backup/Restore und A11y. Das ersetzt die drei konkreten offenen QA-Befunde nicht.
- Rohresultat: `artifacts/five-year-household-result.json`.
- Ausfuehrung mit der Projektlaufzeit: `node scripts/five-year-household-test.js`. Das Skript waehlt einen freien lokalen Port, erstellt eine neue temporaere synthetische Datenbank und entfernt nach dem Lauf ausschliesslich sein eigenes Testverzeichnis.
- Zwei vorbereitende Laeufe wurden nach je einem bestandenen Jahr abgebrochen, um den Testumfang zu vervollstaendigen; sie werden nicht als Vollabnahme gezaehlt. Nur der finale 261-Wochen-Lauf zaehlt hier.

## Aenderungsgrenze

Neu erstellt wurden nur `scripts/five-year-household-test.js`, `scripts/five-year-test-clock.cjs`, dieser Bericht und ignorierte Testartefakte. Keine vorhandene Produktdatei, kein bestehender Test, keine Konfiguration und keine Produktionsdaten wurden veraendert. Kein Commit, Push oder Deployment.
