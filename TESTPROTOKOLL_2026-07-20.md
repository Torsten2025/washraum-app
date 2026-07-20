# WaschZeit Testprotokoll

Datum: 20. Juli 2026
Ausgangsrevision: `9714facb8efd336c2502d404b860c3655d98e91e`
Pruefstand: Projektzweig `codex/render-design-sync`
Prueferrolle: App- und Integrationstester

## 1. Auftrag und Ergebnis

Geprueft wurden alle zentralen Seiten, Rollen und Funktionsketten. Der Schwerpunkt lag darauf, ob sichtbare Aktionen ein erreichbares Ziel besitzen, ob aufeinanderfolgende Schritte dieselben Daten verwenden und ob Rollen- sowie Hausgrenzen auch serverseitig gelten.

**Gesamtergebnis: PASS mit externen Restpunkten.**

- Der vollstaendige Gesamtaudit und das verbindliche Abschluss-Gate `npm run check` sind mit allen acht Teststufen gruen.
- In den geprueften Kernablaeufen laeuft keine sichtbare Hauptaktion ins Leere.
- Sicherheit, Kern-API, Rollen, Buchungsregeln, Hausisolation, Jahreslauf und statische Barrierefreiheit sind gruen.
- Die praktische Browserpruefung bestaetigt die wichtigsten Verbindungen zwischen Oberflaeche, API, Kalender, Mitteilungen und Verwaltung.
- Der responsive Befund `QA-UI-01` ist geschlossen: Bewohner- und Adminkopf wurden bei 320 x 720, 390 x 844, 768 x 1024 und 1440 x 900 Pixeln erneut geprueft. Hausadressen bleiben einzeilig, lange Haus- und Kontonamen erzeugen kein Ueberlaufen und alle sichtbaren Kopfaktionen besitzen mindestens 44 x 44 Pixel grosse Bedienflaechen.
- Echte Betriebssystem-Pushs, produktives SMTP, Render-Datentraeger/Revision und PWA-Installation auf realen Mobilgeraeten bleiben Live-Abnahmen.

## 2. Testumgebung

- Windows, Node.js 22, lokale Express-App und SQLite.
- Automatische Tests verwenden jeweils eigene temporaere Datenbanken.
- Alle automatischen Tests verwendeten isolierte temporaere SQLite-Datenbanken.
- Der Browsertest lief headless mit dem vorhandenen System-Chrome und getrennten Bewohner-, Hausadmin- und Superadmin-Testkonten.
- Es wurden keine Produktionsdaten, produktiven Rollen oder Render-Einstellungen veraendert.

## 3. Automatische Ergebnisse

| Bereich | Ergebnis | Nachweis |
| --- | --- | --- |
| Syntax | PASS | Alle zentralen Server-, Frontend-, Service-Worker- und Testdateien syntaktisch gueltig |
| Sicherheit und Anmeldung | PASS, 22/22 | Header, Origin-Schutz, Sitzungen, Login, Einladungen, QR-Geraetecode, Passwoerter und Rate-Limits |
| Kernfunktionen | PASS, 32 Bereiche | Konten, Kalender, Waschpaket, Regeln, Mehrhausbetrieb, feste Buchungen, Backups, Audit, E-Mail, Wiederherstellung und Parallelzugriff |
| Rollenmatrix | PASS, 19 Bereiche | Bewohner, reine und kombinierte Hausadmins, Superadmin, Fremdhausgrenzen, QR-Rechte, Wartung und Abmeldung |
| Jahressimulation | PASS | 100 Bewohner, 6 Haeuser, 52 Wochen und 5.200 Waschpakete |
| Hausisolation im Jahreslauf | PASS | 0 hausuebergreifende Verletzungen |
| Simulierte Buchungen | PASS | 5.200 Waschmaschinen-, 5.200 Trockenraum- und 2.704 Tumbler-Buchungen |
| Barrierefreiheit/PWA statisch | PASS | 4 Seiten; Struktur, eindeutige IDs, DOM-Verknuepfung, Alternativtexte, Untertitel, Fokus, reduzierte Bewegung und PWA |
| Backup und Wiederherstellung | PASS | Authentifizierte externe PUT-Kopie, SQLite-Integritaet, Neustart aus Sicherung, Anmeldung und Ressourcenbestand |
| Browser und visuelle Viewports | PASS | QR-Partnerzugang, Bewohner- und Adminkopf sowie Windel-Alarm bei 320 x 720, 390 x 844, 768 x 1024 und 1440 x 900 |
| Repository-Hygiene | PASS | `git diff --check` ohne Fehler; Secret-, lokaler Pfad- und Mojibake-Suche ohne Treffer |

Verbindlicher Abschlussbefehl:

```text
npm run check -> PASS
```

`npm run test:e2e` wurde mit dem vorhandenen System-Chrome und der gebuendelten Playwright-Laufzeit erfolgreich ausgefuehrt. 24 Screenshots decken Bewohner-, Spiel- und Verwaltungsansichten bei 320 x 720, 390 x 844, 768 x 1024 und 1440 x 900 ab. Die Bilder wurden einzeln visuell auf Ueberlagerung, abgeschnittene Aktionen, horizontales Ueberlaufen und unleserliche Kopfbereiche kontrolliert. Zusaetzliche Browserassertionen setzen aussergewoehnlich lange Haus- und Kontonamen ein und bestaetigen fuer Bewohner- und Adminkopf eine einzeilige Hausadresse, Viewportgrenzen und mindestens 44 x 44 Pixel grosse Kopfaktionen. Die scheinbar nach oben gescrollten Windel-Alarm-Bilder entstehen erst nach der automatischen Bedienung des tiefer liegenden Startknopfs; beim Oeffnen setzt die App den Dialog nachweislich auf den Anfang und bietet Schliessen-Schaltflaeche, Escape und Aussenklick an.

`git diff --check` ist ohne Fehler beendet worden; die ausgegebenen LF-/CRLF-Hinweise sind reine Arbeitskopie-Hinweise und kein Whitespace-Befund. Die Suche im versionierten Stand nach typischen privaten Schluesseln, API-Token und fest eingetragenen Geheimnissen sowie nach lokalen Benutzerpfaden und den gaengigen Mojibake-Mustern blieb ohne Treffer.

Der zusaetzliche Aufruf `npm audit --omit=dev` war durch die lokale Zertifikatskette mit `UNABLE_TO_VERIFY_LEAF_SIGNATURE` blockiert. Die TLS-Pruefung wurde nicht abgeschaltet. Das verbindliche Sicherheits-Testpaket selbst ist mit 22 von 22 Bereichen bestanden; die Abfrage aktueller npm-Advisories muss in CI oder einer korrekt konfigurierten Netzwerkumgebung wiederholt werden.

## 4. Seiten- und Bereichsinventur

| Seite oder Bereich | Gepruefter Umfang | Ergebnis |
| --- | --- | --- |
| Anmeldung | Login per E-Mail oder technischem Kontonamen, neutrale Fehler, Rate-Limit, Haus-Einladung und Weiterleitung | PASS |
| Neues Passwort | Tokenpruefung, Passwortregeln, Wiederholung, verbrauchter Token und erneute Anmeldung | PASS |
| Datenschutz | Oeffentliche Erreichbarkeit, Zweck, Datenarten, Speicherdauer und Kontaktweg | PASS |
| Kopf und Kontomenue | Rollenanzeige, Hauswechsel, Mitteilungen, Stoerung, Einstellungen, Hilfe, Windel-Alarm und Abmeldung | PASS; `QA-UI-01` geschlossen |
| Eigene Buchungen | Kommende Termine, Paketgruppierung, Absage, optionale Freigabe und Folgeanzeige | PASS |
| Kalender Woche/Monat | Kapazitaeten, Ruhetag, Vergangenheit, Statusstreifen, Tagesdetails, Empfehlung und Direktwahl | PASS |
| Waschpaket | Slot-zuerst und Geraet-zuerst, Waschmaschine, optionaler Trockenraum mit Dauer, optionaler Tumbler, Pruefen und atomare Buchung | PASS |
| Einzelbuchung und Regeln | Tagesgrenze, Folgeslot, Tumblerreserve, Trockenraumdauer, Fremdbelegung und Parallelzugriff | PASS |
| Mitteilungen und Filter | In-App-Freigaben, Ressource, Wochentag, Zeitfenster, Aktualitaet, eigenes Ereignis und Buchungsziel | PASS |
| Einstellungen und Konto | Profil, E-Mail, Passwort, Benachrichtigungen, PWA/Geraet, Export und Loeschung | PASS |
| Einfuehrung und Quiz | Kapitel, echte App-Ansichten, Sprecher-/Untertitelstruktur, Regeln und freundlicher Abschluss | PASS automatisiert; echte Medienabnahme offen |
| Windel-Alarm | Tages- und Uebungsmodus, Module, Fehler, Zeit, Finale, Rang, Loeschung und Trennung von Buchungen | PASS |
| Verwaltung: Ueberblick | Hauskontext, Kennzahlen, Aufgaben und rollenabhaengige Hinweise | PASS |
| Verwaltung: Haus und Geraete | Ressourcen, Status, Anlage, Bearbeitung, Stoerung, Sperre, Reparatur, Test und Freigabe | PASS |
| Verwaltung: Tagebuch | Offene und historische Faelle, Hausgrenzen und kompletter Zustandsablauf | PASS |
| Verwaltung: Dauertermine | Anlage, Konflikte, Tumblerreserve, geschuetzte Buchung und Entfernung | PASS |
| Verwaltung: Wohnungen und Konten | Einladung, Wohnungskonto, Partnergeraet, Rollen, Umzug, Aktivierung und Gleichrangigkeitsschutz | PASS |
| Verwaltung: Auswertung | Kennzahlen und Bezug auf das aktive Haus | PASS |
| Verwaltung: System | Health, Version, Testmail/-push, Audit, Backup, Wartung, Buchungsreset und Pilot-Reset | PASS lokal; Live-Dienste offen |

## 5. Praktische Funktionsketten

| Kette | Gepruefte Verbindung | Ergebnis |
| --- | --- | --- |
| Einladung -> Konto -> erster Start | Einladungsannahme erzeugt festes Wohnungskonto und oeffnet die persoenliche Einrichtung | PASS |
| Anmeldung -> Sitzung -> Abmeldung | Bewohner und Superadmin gelangen in ihre Ansicht; Abmeldung endet auf `login.html?loggedOut=1` mit Bestaetigung | PASS |
| Partnergeraet | QR und manueller Einmalcode melden ein zweites Geraet am selben Wohnungskonto an | PASS |
| Hilfe -> Einfuehrung -> Quiz | Regelinhalt ist erreichbar; drei richtige Antworten erzeugen eine freundliche Abschlussmeldung | PASS |
| Benachrichtigungsfilter | Ressourcentyp, Wochentag und Zeitfenster werden gespeichert und wieder angezeigt | PASS |
| Kalender -> Waschpaket | Datum und Slot fuehren zu Waschmaschine, optionalem Trockenraum, Nutzungsdauer, Tumbler und gemeinsamer Bestaetigung | PASS |
| Waschpaket -> Kalender | Vier Paketbestandteile erscheinen in den eigenen Buchungen und reduzieren die Kalenderkapazitaet | PASS |
| Paketabsage -> Mitteilung | Paket wird entfernt; der freigegebene Termin erscheint als `Neu frei` | PASS |
| Stoerung -> Tagebuch | Bewohnermeldung erscheint beim Hausadmin mit Ressource, Beschreibung und Absender | PASS |
| Tagebuch -> Sperre -> Kalender | Adminsperre reduziert die freie Waschmaschinenkapazitaet von drei auf zwei | PASS |
| Reparatur -> Probelauf -> Freigabe | Chronik bleibt erhalten; erst bestandener Probelauf erlaubt Abschluss; danach ist die Kapazitaet wieder frei | PASS |
| Adminnavigation | Start, Tagebuch, Wohnungen, Geraete und Haeuser, Dauertermine, Auswertung und System sind erreichbar | PASS |
| Mehrhausbetrieb | Zweites Haus besitzt eigene Ressourcen; Hauswechsel aktualisiert Daten und Kontext | PASS |
| Reiner Superadmin | Verwaltung ist Standard; Kalender ist lesend und enthaelt weder Empfehlung noch Buchungsassistent oder Einzelbuchung | PASS |
| Bewohner plus Hausadmin | `Mein Waschplan` und `Verwalten` sind getrennt erreichbar; Bewohner- und Verwaltungsrechte bleiben gleichzeitig erhalten | PASS |
| Windel-Alarm | Start, Reihenfolge, serverseitige Zeit, eigener Rang und Bestenliste sind verbunden; keine Waschbuchung wird erzeugt | PASS |
| Mobile Breite | Bewohner- und Adminkopf bei 320 und 390 Pixeln, lange Haus-/Kontonamen, Touch-Ziele und horizontale Breite | PASS; `QA-UI-01` geschlossen |

## 6. Geschlossener Befund

### QA-UI-01 - P3 - Hausname im mobilen Bewohnerkopf unleserlich umgebrochen - GESCHLOSSEN

**Ausgangslage:** Bewohnerkonto `E2E Familie`, Haus `Maneggplatz 18`, Seite `/index.html`, Viewport 390 x 844 Pixel.

**Reproduktion:** Als Bewohner anmelden und die normale Waschplanansicht bei 390 Pixel Breite oeffnen. Im Kopf stehen gleichzeitig `Stoerung melden`, `Mitteilungen` und das Kontomenue.

**Soll:** Der Hausname bleibt als zusammengehoerige, gut lesbare Ortsangabe erkennbar oder wird bei Platzmangel bewusst ausgeblendet beziehungsweise in eine eigene Zeile verschoben.

**Urspruengliches Ist:** `MANEGGPLATZ 18` zerfiel links unter dem Logo in sehr schmale Fragmente (`MAN`, `EGG`, `PLATZ`, `18`).

**Korrektur:** Unter 480 Pixeln besitzen Marke und Hausadresse eine eigene Kopfzeile ueber den Aktionen. Die Adresse bleibt einzeilig und wird nur bei aussergewoehnlicher Laenge kontrolliert mit Auslassungspunkten gekuerzt. Die Kopfaktionen verteilen sich auf eine eigene Zeile und besitzen mindestens 44 Pixel Hoehe.

**Nachpruefung:** PASS bei 320 x 720, 390 x 844, 768 x 1024 und 1440 x 900 fuer Bewohner und Admin. Die Screenshots `small-mobile-320x720.png`, `mobile-390x844.png`, `tablet-768x1024.png`, `desktop-1440x900.png` sowie die entsprechenden `admin-house-*`-Bilder zeigen keine Wortfragmente, Ueberlagerung oder abgeschnittene Kopfaktion. Automatisierte DOM-Messungen bestaetigen dies zusaetzlich mit langen Haus- und Kontonamen.

**Auswirkung:** Keine Sicherheits-, Rollen- oder Datenwirkung; niedrige Bedien- und Qualitaetswirkung auf Smartphones.

**Zustaendigkeit:** `FRONTEND_UX` mit Review durch `TESTING_QA`.

**Regression:** Die Browserpruefung deckt Bewohner- und Adminkopf dauerhaft bei 320, 390, 768 und 1440 Pixel Breite ab; lange Hausnamen, lange Kontonamen, sichtbare Aktionsknoepfe, Touch-Ziele und fehlende horizontale Seitenausdehnung werden bei jedem Lauf gemessen.

## 7. Bereits vorhandene und erneut bestandene Regressionen

### F-01 Reine Admins konnten an Bewohner-Buchungsrouten gelangen

**Risiko:** Rollen- und Bedienkonzept waren nicht eindeutig; reine Adminkonten konnten normale Buchungen anstossen.
**Korrektur:** Normale Einzel- und Paketbuchungen verlangen jetzt ein aktives Wohnungskonto. Reine Admins erhalten einen lesenden Kalender. Kombinierte Bewohner-/Hausadmin-Konten behalten bewusst beide Rollen.
**Regression:** `test:roles` prueft reine Hausadmins, Superadmins und kombinierte Rollen getrennt.

### F-02 Admin-Kalender zeigte irrefuehrende Buchungsempfehlungen

**Risiko:** `Empfohlenen Termin buchen` fuehrte fuer reine Admins in einen gesperrten Ablauf.
**Korrektur:** Empfehlung, Direktbuchungstext, Waschpaket und Einzelbuchung werden nur bei vorhandener Bewohnerberechtigung erzeugt.
**Nachpruefung:** Reiner Superadmin sieht Belegungsplan und Kapazitaeten, aber keine Buchungsaktion.

### F-03 Stoerungsmeldung und Buchung verwendeten unterschiedliche Bewohnerpruefungen

**Risiko:** Ein zulassiges Bewohnerkonto konnte buchen, aber beim Melden einer Stoerung faelschlich abgewiesen werden.
**Korrektur:** Buchung und Stoerungsmeldung verwenden dieselbe Bewohner-/Wohnungskontogrenze; reine Admins bleiben ausgeschlossen.
**Regression:** Rollen- und Tagebuchtests laufen gruen.

### F-04 Fehlende statische HTML-Ziele waren nicht allgemein abgesichert

**Risiko:** Ein umbenanntes oder geloeschtes Element konnte eine Frontend-Initialisierung unbemerkt ins Leere laufen lassen.
**Korrektur:** `test:a11y` gleicht alle statischen `document.querySelector('#...')`-Ziele aus `app.js`, `login.js` und `reset.js` mit dem jeweiligen HTML ab.
**Regression:** `scriptDomLinks` ist Bestandteil des verbindlichen Abschluss-Gates.

## 8. Rollenabnahme

| Funktion | Bewohner | Bewohner + Hausadmin | Reiner Hausadmin | Reiner Superadmin |
| --- | :---: | :---: | :---: | :---: |
| Eigene Wohnung buchen | Ja | Ja | Nein | Nein |
| Stoerung melden | Ja | Ja | Nein | Nein |
| Eigenes Haus verwalten | Nein | Ja | Ja | Ja |
| Fremdes Haus verwalten | Nein | Nein | Nein | Ja, nach Hauswechsel |
| Normale Buchung eines Bewohners loeschen | Nein | Ja, eigenes Haus | Ja, eigenes Haus | Ja, aktives Haus |
| Haus wechseln | Nein | Nein | Nein | Ja |
| Backups und globaler Wartungsmodus | Nein | Nein | Nein | Ja, Wartungsstart mit aktuellem Passwort |
| Superadminrechte vergeben oder entziehen | Nein | Nein | Nein | Ja, mit aktuellem Passwort; eigenes Recht bleibt bestehen |

## 9. Offene Live-Abnahmen und Restgrenzen

1. Einen echten Push auf iPhone und Android empfangen und die geschlossene PWA ueber die Nachricht oeffnen.
2. Einladung, Freigabe, Testmail und Passwort-Reset ueber das produktive SMTP-Konto zustellen.
3. Render-Revision mit dem erwarteten Git-Commit vergleichen und den persistenten Pfad `/var/data/washraum.sqlite` bestaetigen.
4. Render-Backup herunterladen, mit SQLite `quick_check` pruefen und eine externe Kopie nachweisen.
5. PWA auf iPhone und Android installieren, Updatehinweis und Touch-Bottom-Sheet auf echten Geraeten abnehmen.
6. Fuer groessere Einfuehrung vorab einen echten Lasttest mit gleichzeitigen Nutzern und Produktionsmetriken planen; die Jahressimulation prueft Logik und Isolation, nicht Render-Durchsatz unter Spitzenlast.
7. `npm audit --omit=dev` in CI oder einer Umgebung mit gueltiger npm-Zertifikatskette wiederholen.

## 10. Freigabeurteil

Der vollstaendige lokale Stand von `0.3.0-test.2` erhaelt das Urteil **PASS mit externen Restpunkten**. Der reine Versionsdelta gegen den zuvor geprueften Stand wurde in Paketmanifest, Lockfile, ausgelieferter Versionsanzeige, Health-/Versions-API, Cache-Kennungen, Testassertions und Handbuch abgeglichen; das vollstaendige `npm run check` wurde fuer `0.3.0-test.2` erneut mit Exit 0 ausgefuehrt. `QA-UI-01` ist nach der gezielten Regression geschlossen; alle Pflichtpruefungen, Rollen- und Hausgrenzen sowie die visuellen Bewohner-, Admin- und Windel-Alarm-Pruefungen sind bestanden. Die Spielroute schreibt ausschliesslich in `diaper_game_rounds` und `diaper_game_challenge_scores`; der Browserlauf erreicht nach dem Spiel das unveraenderte Mitteilungszentrum und die Rollen-/Kernpruefungen bestaetigen die Trennung von echten Buchungen. Vor einer breiten produktiven Freigabe bleiben ausschliesslich die Live-Abnahmen aus Abschnitt 9 zu erledigen. Dieses Protokoll bestaetigt noch keine Render-Bereitstellung.
