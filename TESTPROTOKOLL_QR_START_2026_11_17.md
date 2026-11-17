# Unabhaengige Abnahme: QR-Startvorbereitung vom 17.11.2026

Rolle: TESTING_QA / Independent Validator.

## Urteil

**PASS mit externen Restpunkten fuer die lokale QR-Startvorbereitung `0.3.15-test.2`.** Der neue DE/EN-Einstiegshinweis und der Druckkarten-Fallback funktionieren. Kartenaktivierung und nachgelagerte Kontofunktionen benoetigen keine E-Mail; eine freiwillige Adresse kann hinzugefuegt und entfernt werden. Das vollstaendige Projektgate ist bestanden.

**Kein Datenneustart getestet oder ausgefuehrt, kein Resettool implementiert, keine Produktionsfreigabe und kein Deployment durch diese Abnahme.** Aktuelle reale Klingelschilder sind noch vom Eigentuemer zu bestaetigen. Die Konten-/Datenbereinigung ist ausschliesslich ein gesonderter Plan.

## Kandidat und Identitaet

- Worktree: `C:\Users\Anwender\.codex\worktrees\emailfreier-zugang\WaschplanApp 2`.
- Basis-HEAD: `e21502002120d74bb48b2a1e6ba7c7b064d0ea66`.
- Finaler Freeze: 144 Dateien, persistente Pfad-/SHA256-Matrix `artifacts/qr-test2-final-freeze.json`.
- SHA256 des sortierten JSON-Arrays `[Pfad, SHA256(Dateibytes)]`: `aa0878f7f5e7217824cb129d0722fe277f84a1e7d72c3bde3aace365cd9b0bdc`.
- SHA256 von `git diff --binary`: `79ffa76ea69aa512e30200c21889ee3d3c5d59d1947499c232ff670c571d9124`.
- QA hat vor und nach Abschluss des Gesamtgates alle 144 Dateibytes mit der Matrix verglichen: keine Abweichung. Dieser danach erstellte Bericht und ignorierte QA-Artefakte gehoeren nicht zum genannten Freezehash und werden separat uebergeben.
- Eigene Browserpruefung lief auf dem unmittelbaren Vorfreeze `601f91c914d4c7939596a9695cc86b0c9ff99cd3df8cda5151f0c3b7a9eb92d3`. Der unabhaengige Matrixvergleich belegt als einziges Folgedelta `scripts/e2e-smoke.js`: zwei veraltete Versionsregexwerte `test.1 -> test.2`. Keine Produktdatei oder Pruefbedingung wurde dabei geaendert beziehungsweise entfernt. Die eigenen Produktbelege gelten deshalb unveraendert fuer den Schlussstand.

## Eigene praktische Pruefung

Ausgefuehrt: `node artifacts/qa-qr-start-review.cjs`, **Exit 0**. Node 22.23.1, lokaler Chrome headless, neue temporaere synthetische SQLite-Datenbank, E-Mail/Push/Backup deaktiviert. Port 39762 war mit dem Builder abgestimmt und vor dessen abschliessendem Browsertest wieder frei. Die Kandidaten-Junction zeigt eine eigene isolierte Tempinstallation; die Hauptinstallation wurde nicht verwendet oder veraendert.

Das QA-Artefakt liest den vorher vollstaendig reviewten bestehenden Regressionstest, fuehrt ihn ohne Testdateiaenderung aus und ergaenzt zwei unabhaengige Ketten. Screenshots werden separat unter `artifacts/qa-qr-start-2026-11-17` gespeichert, nicht ueber Builder-Belege geschrieben.

| Kette | Tatsaechlicher Beleg | Ergebnis |
| --- | --- | --- |
| Bestehender Klingelschild-/Wohnungseintrag zu neuer persoenlicher Karte | Echten Button `Create access card` in der Admin-Wohnungsliste betaetigt; POST 201; neue Kennung und richtige synthetische Wohnung erscheinen in der Karte. Keine blosse direkte Renderfunktionspruefung fuer diese Zusatzkette. | PASS |
| QR-Link-Aktivierung ohne E-Mail | Aktivierungsadresse aus persoenlicher Karte im Browser geoeffnet, eigenes Passwort gesetzt, eingeloggte App erreicht. | PASS |
| Manueller Fallback | Loginseite oeffnen, Zugangskarte waehlen, Kennung und Aktivierungscode eingeben, Passwort setzen, App erreichen. | PASS |
| Einstiegshinweis DE/EN | Keine Pflicht-E-Mail, einmalige Aktivierung, eigenes Passwort, spaeter WZ-Kennung/Passwort und freiwillige Profil-Mail korrekt erklaert; 390/768/1440 px ohne horizontalen Ueberlauf. | PASS |
| Druckkarte DE/EN | A4-Print-Media bei 794 CSS px: kompletter QR, Wohnung, Klingelschild, Kennung, Einmalcode, Ablauf und Basis-Loginadresse sichtbar. QR-/URL-Innenpunkte liegen nicht unter verdeckenden Elementen. Eigene Druckbilder visuell gelesen. | PASS |
| E-Mail-freies Profil und Hinweisfilter | Echte Formulare speichern mit PUT 200; Filter und Auswahl bleiben nach Reload erhalten; eigene Kennung bleibt separat sichtbar. | PASS |
| Freiwillige erste/zweite E-Mail | Hinzufuegen, Aendern und Entfernen; mehrere NULL-Adressen; Bestaetigungsbindung und Tokenentwertung; ungueltige Adresse 400 und fremde Adresskollision 409. | PASS |
| Persoenlich gepruefte Wiederherstellung ohne E-Mail | Zusatzkette: WZ-Konto ohne Adresse, Admincode, echtes Recoveryformular ohne Adresse, Antwort nennt WZ-Kennung, anschliessender Login 200; DB-Adresse bleibt NULL. | PASS |
| Legacy-Recovery DE/EN | Bestehende unbestaetigte Adresse ohne neue Adresse wiederherstellen; angezeigte Login-E-Mail funktioniert, alter unzulaessiger freier Kontoname bleibt gesperrt. | PASS |

Visuell selbst gelesen: `print-de.png`, `print-en.png`, `login-de-390.png`, `login-en-390.png`, `login-de-768.png`, `login-en-1440.png` und `actual-card-button-390.png`. Alle sechs Loginbreiten-/Sprachkombinationen wurden automatisiert geprueft. Die neuen Texte sind vollstaendig und lesbar. Der fruehe 390px-Print-Screenshot aus der Vorpruefung war keine passende A4-Druckflaeche; das Endurteil stuetzt sich auf die eigenen vollstaendigen A4-Printbelege, nicht auf `checkVisibility` allein.

## Gesamtgate, Source- und Sicherheitsreview

- **Finales `npm run check`: PASS, Exit 0, 384,2 Sekunden**, Builder-Session 62177. QA hat `artifacts/qr-test2-final-check.log` selbst bis zum erfolgreichen E2E-Abschluss und letzten `Email-free QA01-03 regression PASS` gelesen. Exit und Dauer stammen vom Prozessfuehrer. Kein zweiter paralleler Fullcheck wurde gestartet.
- Enthalten: Verify, Fixture, Restplaetze, Sicherheits-/Integrationsgrenzen, Produktionsrelease-Tooling, I18N/Medien, Security/Remember-Device, Wartung, Kern-App, Rollen, Jahreslast, A11y, Backup/Restore und Browserketten. Damit bleiben die vorhandenen lokalen Bewohner-/Hausadmin-/Superadmin-Kernregressionen einschliesslich Buchung, Benachrichtigung und Windel-Alarm erhalten. Jahreslast: sechs Haeuser, 100 Bewohner, 5200 Pakete, keine Hausverletzung.
- Der vorherige Lauf 95453 war ein echtes **FAIL** wegen einer alten test.1-Assertion bei korrekt angezeigter test.2-Version. Er bleibt historisch FAIL. Nach engem Versionsfixture-Fix bestanden der gezielte E2E-Lauf und danach der neue vollstaendige Lauf 62177.
- `git diff --check`: PASS; nur bekannte LF/CRLF-Hinweise. Matrix-/Diffidentitaet: PASS.
- Source-Review: 20 geaenderte Dateien; keine Aenderung an Authrouten, Rollenrechten, Buchungsregeln oder Resetlogik. Fixture-/Backup-/PWA-/Testbindungen wurden ausschliesslich auf die Kandidatenversion fortgeschrieben. Paketversion und Lockwurzel passen; keine Dependencyversion geaendert.
- Begrenzter Secret-/Pfad-Diffscan: 136 hinzugefuegte Zeilen, keine Treffer fuer typische Private-Key-, PAT-, AWS-Key- oder lokale Benutzerpfadmuster. Produktquellscan ohne typische Mojibake-Treffer. Das ist kein umfassender Geheimnisdetektor.
- Audit mit null bekannten Schwachstellen wurde heute vom Builder gemeldet; QA hat in dieser engen Runde keinen eigenen neuen Registry-Audit ausgefuehrt.
- Backupmanifest und drei LF-Skripte stimmen bytegenau ueberein. Neuer Manifest-SHA256: `a727b168847b46b6526af80b21ce60c9e49a329fbb211fd77c8ba0fb02b1545c`. Liveversionsbindung bleibt `0.3.14-test.2`, Kandidat `0.3.15-test.2`; kein Schutz wurde gelockert.

Geaenderte Kandidatendateien: HANDBUCH.md, PILOTPAKET.md, RELEASEPLAN_EMAILFREIER_ZUGANG.md, TESTPLAN_GESAMTAUDIT.md, package.json, package-lock.json, public/app.js, public/i18n.js, public/index.html, public/login.html, public/styles.css, public/sw.js, scripts/app-test.js, scripts/e2e-smoke.js, scripts/emailfree-regression-test.js, scripts/production-backup-bundle.sha256, scripts/production-backup-contract.js, scripts/production-release-tooling-test.js, scripts/runtime-safety-test.js, src/services/agent-test-fixture.js. Diese Aenderungen stammen vom Builder, nicht von QA.

## Begrenzungen, Bestandsdetail und externe Restpunkte

- Nichtblockierende Bestandsbeobachtung: Bei englischer Admin-Kartenerstellung bleibt der kurze Erfolgstoast deutsch. Ursache ist der unveraenderte direkte `showStatus(data.message)`-Weg. Neue Einstiegshinweise und saemtliche neuen Druckkartentexte sind korrekt DE/EN. Der Befund wurde dem Delivery Lead gemeldet; er beeintraechtigt weder Ausgabe noch Aktivierung der Karte und wird nicht als neue Produktkorrektur in diesen Freeze aufgenommen.
- QR-Link wurde im Browser benutzt; physische Kameraerkennung und realer Papierausdruck wurden nicht getestet. Mailverifizierung nutzt synthetische Testtoken; der konfigurierte Senderpfad ist eine aufzeichnende Testfunktion, kein echter SMTP-Nachweis. Reale Push-/Mailzustellung und Geraete-/Installationsabnahme bleiben separat.
- Die umfangreiche bestehende Rollen-Funktionsinventur wird durch den neuen Gesamtcheck regressiert; dies ist kein erneuter manueller Volltest jeder Schaltflaechenvariante. Gemockte Serien-POSTs oder lokale Upload-Testserver sind keine Produktionsbelege.
- Kein neuer Fuenfjahreslauf in diesem Auftrag. Fruehere Langzeitsimulationen werden nicht als heutige neue Ausfuehrung ausgegeben.
- Resetplan gelesen: genau eine bestaetigte Owneridentitaet, Altzugriffe einschliesslich Wohnungskarten/-quoten, Seed-Wiederanlage und persoenliche Meldungsschicht sind explizit abgegrenzt. Dauertermine bleiben eine offene fachliche Entscheidung. Einrichtung, Sperren, technisches Tagebuch und Audit werden nicht ungefragt geloescht. Der Produktions-Pilotreset bleibt gesperrt. **Der Plan ist keine nachgewiesen funktionsfaehige Resetimplementierung.**
- Vor Veroeffentlichung verbleiben Commit-Aequivalenz, erforderliche Release-/Owner-Gates, aktueller Provider-/Livezustand, Wartungs-/Backup-/Restore-/Snapshotnachweise, frischer kandidatengenauer Einmalproof und anschliessende Livepruefung. Alte test.1-Owner-Skripte und Pruefsummen sind keine Freigabe fuer test.2.

## Uebergabe

QA schrieb ausschliesslich diesen Bericht sowie ignoriertes QA-Testartefakt und synthetische Screenshots. Kein Produkt-/Testquelltext wurde korrigiert; kein Commit, Push, Deployment, Produktionszugriff oder Datenreset durch QA. Der lokale Kandidat ist fuer die anschliessende Commit-Aequivalenz und Releasevorbereitung uebergeben, nicht als bereits veroeffentlicht bezeichnet.
