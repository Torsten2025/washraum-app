# Zugangskarten: finale unabhaengige Abnahme

Datum: 03.11.2026. Rolle: TESTING_QA / Independent Validator.

## Endurteil

**PASS mit externen Restpunkten fuer den unten eindeutig bezeichneten lokalen Kandidaten.** Die drei funktionalen Erstbefunde QA-01 bis QA-03, die gemeldeten Dependency-Auditbefunde und der spaeter entdeckte Git-/Backup-Bundle-Zeilenendfehler sind fuer diesen Stand geschlossen. Das vollstaendige Projektgate ist bestanden. Dies ist keine Produktions-, Push- oder Deploymentfreigabe und keine Behauptung, jede moegliche Bedienkombination auf jedem realen Geraet manuell getestet zu haben.

Die historischen Berichte bleiben unveraendert. Ihr damaliges FAIL beziehungsweise ihr damaliger unvollstaendiger Fullcheck sind durch diese datierte Nachpruefung eingeordnet, nicht aus der Historie entfernt.

## Exakter Kandidat und dokumentarische Ausnahme

- Version `0.3.15-test.1`, Basis-HEAD `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380`.
- Worktree: `C:\Users\Anwender\.codex\worktrees\emailfreier-zugang\WaschplanApp 2`.
- Persistenter Builder-Freeze: `artifacts/builder-final-freeze.json`, 143 sortierte `[Pfad, SHA256(Dateibytes)]`-Eintraege. SHA-256 ihres JSON-Arrays: `80e989cef4631d99656a177ad072b7de34a44f6482873dde9180050b9a8a1605`.
- SHA-256 von `git diff --binary`: `b164c2708cfd8f6057c2012333ce239e8b865fd9f35433973f7482a21fb1ce42`.
- QA hat diese Matrix zunaechst vollstaendig identisch reproduziert. Nach allen Pruefungen weicht ausschliesslich der erlaubte dokumentarische Nachtrag in `RELEASEPLAN_EMAILFREIER_ZUGANG.md` ab: vorher `954b9bc154dac296d76fcefc5d33b18ab4bbfebbfea5a1f70399a19bdbb6ab82`, nachher `a7cb656db95f606fa0659cd353eac564011008bfd9e49782b22fb2d7ebcf58f8`.
- Die ersten 8108 Bytes dieses Berichts ergeben exakt seinen alten Hash: Der Nachtrag ist nachweislich ein reiner Append. Er wurde gelesen, weist seinen Quellenzeitpunkt und fehlende Releasefreigabe korrekt aus. Alle anderen Matrixeintraege bleiben bytegleich. Der tracked-diff-Hash bleibt identisch.
- Dieser neue QA-Bericht und ignorierte Laufartefakte werden separat uebergeben und sind nicht im genannten 143er Hash enthalten. Bei Commit-Aequivalenz muss der Release-Agent beide Berichtsanteile gesondert beruecksichtigen; der 143er Hash ist nicht der Hash des um Berichte erweiterten Gesamtarbeitsbaums.

## Geschlossene Befunde

| Befund | Nachweis | Ergebnis |
| --- | --- | --- |
| QA-01: Profil/Filter erzwangen E-Mail | Unabhaengig ausgefuehrte echte Browserformulare und eigene urspruengliche API-Reproduktion: leerer Wert erlaubt, PUT 200, Reload/Persistenz korrekt; ungueltige Adresse 400, fremde Adresskollision 409. | Geschlossen |
| QA-02: Legacy-Recovery nannte falsche Kennung | Wiederherstellung ohne neue Adresse nennt bestehende Login-E-Mail; damit Login 200, freier Legacy-Name bleibt 401. Echte DE/EN-Browserkette bestanden. | Geschlossen |
| QA-03: Kennung im Profil/Onboarding nicht gesichert | Eigenes schreibgeschuetztes Kennungsfeld getrennt vom Klingelschild; Reload und freiwillige Adresse erhalten WZ-Kennung; DE/EN-Hinweis und Pilotanleitung verlangen Sicherung vor Kartenvernichtung. | Geschlossen |
| Bekannte Dependency-Sicherheitsbefunde | Eigenstaendig ausgefuehrtes `npm audit --json` mit System-CA: Exit 0, alle Kategorien einschliesslich high/critical und dev gleich 0. | Geschlossen im aktuellen Auditdatenbestand |
| Backup-Bundle hatte Windows-Pruefsummen statt Git-Auslieferungsbytes | Alle vier Dateien besitzen exakten LF-Vertrag; reale Bytes enthalten kein CR. Ungefilterter Git-Blobhash und mit Pfadregeln berechneter Git-Blobhash stimmen jeweils ueberein. Drei Skript-SHA256 passen Manifest. | Geschlossen |

Die gezielten Funktionsbelege stehen ausfuehrlich in `TESTPROTOKOLL_ZUGANGSKARTEN_NACHPRUEFUNG.md`. Sie wurden unabhaengig vom Builder praktisch ausgefuehrt; die spaetere Aenderung betraf nur Abhaengigkeiten beziehungsweise Backup-Tooling. Die neue Gesamtregression bestaetigt diese Ketten auch auf dem Schlussstand.

## Sicherheits- und Toolingdelta

Die Lockdatei hat gegenueber der Basis genau vier geaenderte Paketversionen: Express `4.22.2 -> 4.22.3`, body-parser `1.20.6 -> 1.20.9`, proxy-addr `2.0.7 -> 2.0.8`, qs `6.15.3 -> 6.16.2`. Kein Majorwechsel und kein Override. Direkte Express-Range jetzt `^4.22.3`; erforderliche abhaengige Metadaten/Integritaetswerte wurden mitgepflegt.

QA hat alle 152 installierten Paketversionen mit dem Lock verglichen: keine Abweichung. Die Inputs der isolierten Installation sind bytegleich mit package.json/Lock im Kandidaten. Die Junction verweist auf eine eigene temporaere Installation. Im Hauptprojekt sind die vier vorherigen Versionen weiterhin vorhanden; es wurde nicht auf dessen Installation gepatcht. Das neue `npm ci` stammt vom Builder; der Installations-/Lockvergleich und das neue vollstaendige Audit stammen von QA. Null bekannte Auditbefunde sind kein Nachweis gegen unbekannte Sicherheitsluecken.

Der LF-Fix betrifft ausschliesslich vier explizite `.gitattributes`-Pfade, ihre LF-Bytes/Manifest, passende Assertions in `scripts/production-release-tooling-test.js` und den Handbuchnachtrag. Die bestehende SHA-Pruefung blieb erhalten; neue Assertions verlangen den exakten LF-Vertrag und CR-freie Dateibytes. Keine Auth-, Origin-, Payload-, Rollen-, Haus-, Backup- oder Release-Schutzbedingung wurde zur Erreichung eines PASS abgeschaltet.

Pruefsumme des jetzt bytekonsistenten `scripts/production-backup-bundle.sha256`:

`0844ce3bee29aa23f033d28e9632ed76faf3bc35e7291051c3729265fdd4a4f2`

Der Liveversionsvertrag bleibt `0.3.14-test.2`, Kandidat `0.3.15-test.1`; vor realem Vollzug muss die dann aktuelle Liveidentitaet erneut geprueft werden.

## Tests und belegte Herkunft

- **Finales `npm run check`: PASS, Exit 0, 335,9 Sekunden**, Builder-Session 14577. QA hat den persistenten Laufbericht `artifacts/builder-final-check.log` bis zum erfolgreichen Browserabschluss und nachgelagerten `Email-free QA01-03 regression PASS` selbst gelesen. Exit/Dauer wurden vom Prozessfuehrer uebergeben. Es wurde auftragsgemaess kein zweiter paralleler Fullcheck gestartet.
- Enthalten sind Verify, Fixtures, Restplaetze, Integrations-Killswitches, Produktionsrelease-Tooling, I18N, Medien, Security/Remember-Device, Wartung, Kern-App, Rollen, Jahressimulation, A11y, Backup/Restore und E2E einschliesslich der Zugangskartenregression. Jahreslauf: 5200 Waschpakete, null Hausverletzungen, 98,6 Sekunden.
- Vorangegangene eigene gezielte Ausfuehrung `scripts/emailfree-regression-test.js`: PASS, Exit 0. Eigene urspruengliche Reproketten: PASS nach Fix; Details und Screenshots im Nachpruefbericht.
- Eigenes Audit, Installations-/Lockvergleich, LF-/Git-Blob-/Manifestvergleich, Freezevergleich und `git diff --check`: PASS. LF/CRLF-Hinweise anderer Medien-/Textdateien sind keine Fehler des geprueften Bundlevertrags.
- Erneuter begrenzter Musterscan in public/src/server.js ohne Treffer fuer typische private-key-/PAT-/AWS-Keymuster, lokale Windows-Benutzerpfade oder typische Mojibake-Folgen. Dies ist kein vollstaendiger Geheimnisdetektor.

Der fruehere Fullcheck 34785 scheiterte an Sandbox-EPERM beim Schreiben eines Screenshots. Dieser Abbruch wird nicht zu einem PASS umgedeutet; der neue vollstaendige Lauf 14577 mit passenden Artefaktrechten ersetzt ihn fuer den finalen Kandidaten.

## Funktionsabdeckung und Fuenfjahreslauf

Die ausfuehrliche rollenbezogene Funktionsinventur in `TESTPROTOKOLL_ZUGANGSKARTEN_ABNAHME.md` bleibt die Abdeckungsbasis: Bewohner, Hausadmin, reine/kombinierte Adminrollen und Superadmin; Zugang/Passwort/Sitzung, Einstellungen, Kalender/Buchung/Absage/Freigabe, Rollen-/Hausgrenzen, Mitteilungen, Stoerung/Tagebuch, Ressourcen/Wohnungen/Personen, Serien/Auswertung/Audit, Wartung/Backup, Datenschutz, Einfuehrung/PWA und Windel-Alarm. Die dort aufgefuehrten QA-01/02/03-Fehler sind durch diese Nachpruefung geschlossen. Die ausgewiesenen Mock- und Live-Abgrenzungen bleiben bestehen; nicht jede visuelle Schaltflaechenvariante wurde erneut manuell bedient.

Neuer Fuenfjahreslauf des Cockpits, Session 97731: Exit 0, 228,4 Sekunden; Artefakt `artifacts/five-year-household-result.json` selbst gelesen. Er lief mit den finalen Sicherheitsabhaengigkeiten; parallel wurden nur die LF-Toolingdateien geaendert, nicht App, Dependencies oder Simulationsquelle.

- 2027 bis 2031, 261 Wochen, 20 Bewohnerkonten plus drei technische Admins, 13584 Requests, 2356 Waschpakete, 528 Absagen, 42 Legacy-Umzuege.
- SQLite-Integritaet ok, keine Fremdschluesselverletzung und keine Ressourcenkollision. Null Fremdhausbuchungen gilt ausdruecklich fuer aktuelle/kuenftige Termine; erlaubte historische Termine bleiben im frueheren Haus.
- JavaScript-Zeit ist virtuell, SQLite-Uhr und Timer sind nicht fuenf Jahre beschleunigt. Kein Fuenfjahres-Dauerbetriebs-, Retention- oder Schedulerbeweis.
- Wohnungsgebundene Umzuege werden nach bestehendem Produktvertrag abgewiesen. Reaktivierung betrifft dieselbe Person/Wohnung, nicht einen vollstaendig implementierten Nachmieterprozess. Historische/kuenftige Legacytermine sind deklarierte SQL-Fixtures; Storno und Umzuege laufen ueber echte APIs. Sechs Freigabestichproben; letzte Abwesenheit bleibt am Simulationsende offen.
- Der statische Satz im Rohartefakt, QA-01/02/03 seien offen, stammt aus der historischen Testquelle. Er ist fuer den aktuellen Befundstatus ueberholt; verbindlich sind die oben dokumentierten unabhaengigen Nachpruefungen, nicht dieser unveraenderte historische Hinweis.

## Externe Restpunkte und Uebergabe

Nicht durch dieses lokale PASS ersetzt werden: tatsaechliche Render-Trigger-/Nichtdeploypruefung und Zugang, Commit-Aequivalenz inklusive Berichtsdelta, noetige Freigaben, reale Produktionsmigration, Wartungsfenster, unabhaengiges Produktionsbackup mit Restore/Render-Snapshot, frischer signierter Einmalnachweis, unmittelbare Eigentuemerfreigabe vor Produktion sowie anschliessende Health-/Revisions-/Livefunktionsabnahme. Reale SMTP-/Pushzustellung, Kamera-QR, physischer Ausdruck und echte Mobilgeraete bleiben eigene Livepruefungen. Die vorhandene Druckkarte wurde lokal sichtbar geprueft; die fehlende manuelle Einstiegs-URL bleibt ein nichtblockierender Bedienhinweis.

Keine weiteren Produktkorrekturen durch QA. In dieser finalen Runde ausschliesslich dieser Bericht geschrieben; kein Commit, Push, Deployment oder Produktionsdatenzugriff. Der eindeutig gepruefte lokale Kandidat kann nun in die Commit-Aequivalenz/Release-Vorbereitung uebergeben werden; er ist dadurch noch nicht veroeffentlicht.
