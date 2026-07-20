# WaschZeit Testprotokoll

Datum: 20. Juli 2026
Ausgangsrevision: `de5378ea424ec9b466a55e9654ad8a8e7d322a74`
Pruefstand: Projektzweig `codex/render-design-sync`
Prueferrolle: App- und Integrationstester

## 1. Auftrag und Ergebnis

Geprueft wurden alle zentralen Seiten, Rollen und Funktionsketten. Der Schwerpunkt lag darauf, ob sichtbare Aktionen ein erreichbares Ziel besitzen, ob aufeinanderfolgende Schritte dieselben Daten verwenden und ob Rollen- sowie Hausgrenzen auch serverseitig gelten.

**Gesamtergebnis: bestanden, mit externen Restabnahmen.**

- Das verbindliche Abschluss-Gate `npm run check` ist vollstaendig gruen.
- In den geprueften Kernablaeufen laeuft nach den unten dokumentierten Korrekturen keine sichtbare Hauptaktion ins Leere.
- Sicherheit, Kern-API, Rollen, Buchungsregeln, Hausisolation, Jahreslauf und statische Barrierefreiheit sind gruen.
- Die praktische Browserpruefung bestaetigt die wichtigsten Verbindungen zwischen Oberflaeche, API, Kalender, Mitteilungen und Verwaltung.
- Echte Betriebssystem-Pushs, produktives SMTP, Render-Datentraeger/Revision und PWA-Installation auf realen Mobilgeraeten bleiben Live-Abnahmen.

## 2. Testumgebung

- Windows, Node.js 22, lokale Express-App und SQLite.
- Automatische Tests verwenden jeweils eigene temporaere Datenbanken.
- Der praktische Browsertest verwendete `waschzeit-manual-audit-20260720.sqlite` auf Port 3210.
- Die Browserablaeufe liefen mit Bewohner-, Hausadmin- und Superadmin-Testkonten.
- Ein versehentlicher Start mit dem lokalen Standardpfad wurde unmittelbar vor Testzugriffen beendet. Es wurden dort keine manuellen Testbuchungen oder Konten angelegt.

## 3. Automatische Ergebnisse

| Bereich | Ergebnis | Nachweis |
| --- | --- | --- |
| Syntax | PASS | Alle zentralen Server-, Frontend-, Service-Worker- und Testdateien syntaktisch gueltig |
| Sicherheit und Anmeldung | PASS, 22/22 | Header, Origin-Schutz, Sitzungen, Login, Einladungen, QR-Geraetecode, Passwoerter und Rate-Limits |
| Kernfunktionen | PASS, 31 Bereiche | Konten, Kalender, Waschpaket, Regeln, Mehrhausbetrieb, feste Buchungen, Backups, Audit, E-Mail, Wiederherstellung und Parallelzugriff |
| Rollenmatrix | PASS, 18 Bereiche | Bewohner, reine und kombinierte Hausadmins, Superadmin, Fremdhausgrenzen, QR-Rechte, Wartung und Abmeldung |
| Jahressimulation | PASS | 100 Bewohner, 6 Haeuser, 52 Wochen und 5.200 Waschpakete |
| Hausisolation im Jahreslauf | PASS | 0 hausuebergreifende Verletzungen |
| Simulierte Buchungen | PASS | 5.200 Waschmaschinen-, 5.200 Trockenraum- und 2.704 Tumbler-Buchungen |
| Barrierefreiheit/PWA statisch | PASS | 4 Seiten; Struktur, eindeutige IDs, DOM-Verknuepfung, Alternativtexte, Untertitel, Fokus, reduzierte Bewegung und PWA |
| Backup und Wiederherstellung | PASS | Authentifizierte externe PUT-Kopie, SQLite-Integritaet, Neustart aus Sicherung, Anmeldung und Ressourcenbestand |
| Browser und visuelle Viewports | PASS | QR-Partnerzugang sowie Screenshots bei 390 x 844, 768 x 1024 und 1440 x 900 |

Verbindlicher Abschlussbefehl:

```text
npm run check -> PASS
```

`npm run test:e2e` wurde mit dem vorhandenen System-Chrome und der gebuendelten Playwright-Laufzeit erfolgreich ausgefuehrt. `playwright-core` ist fuer CI reproduzierbar im Lockfile fixiert; ein fehlendes Playwright-Modul oder ein nicht erreichbarer Browser fuehrt nun zu einem Fehler statt zu einem uebersprungenen Test. Die normale lokale Paketinstallation bleibt wegen `UNABLE_TO_VERIFY_LEAF_SIGNATURE` blockiert; die TLS-Pruefung wurde nicht abgeschaltet und der saubere GitHub-Lauf muss die Installation der fixierten Version bestaetigen.

## 4. Praktische Funktionsketten

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
| Mobile Breite | Monatskalender bleibt bei 390 x 844 Pixel ohne horizontales Ueberlaufen lesbar | PASS |

## 5. Gefundene und behobene Fehler

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

## 6. Rollenabnahme

| Funktion | Bewohner | Bewohner + Hausadmin | Reiner Hausadmin | Reiner Superadmin |
| --- | :---: | :---: | :---: | :---: |
| Eigene Wohnung buchen | Ja | Ja | Nein | Nein |
| Stoerung melden | Ja | Ja | Nein | Nein |
| Eigenes Haus verwalten | Nein | Ja | Ja | Ja |
| Fremdes Haus verwalten | Nein | Nein | Nein | Ja, nach Hauswechsel |
| Normale Buchung eines Bewohners loeschen | Nein | Ja, eigenes Haus | Ja, eigenes Haus | Ja, aktives Haus |
| Haus wechseln | Nein | Nein | Nein | Ja |
| Backups und globaler Wartungsmodus | Nein | Nein | Nein | Ja, Wartungsstart mit aktuellem Passwort |
| Superadmin-Verantwortung uebergeben | Nein | Nein | Nein | Ja |

## 7. Offene Live-Abnahmen und Restgrenzen

1. Einen echten Push auf iPhone und Android empfangen und die geschlossene PWA ueber die Nachricht oeffnen.
2. Einladung, Freigabe, Testmail und Passwort-Reset ueber das produktive SMTP-Konto zustellen.
3. Render-Revision mit dem erwarteten Git-Commit vergleichen und den persistenten Pfad `/var/data/washraum.sqlite` bestaetigen.
4. Render-Backup herunterladen, mit SQLite `quick_check` pruefen und eine externe Kopie nachweisen.
5. PWA auf iPhone und Android installieren, Updatehinweis und Touch-Bottom-Sheet auf echten Geraeten abnehmen.
6. Fuer groessere Einfuehrung vorab einen echten Lasttest mit gleichzeitigen Nutzern und Produktionsmetriken planen; die Jahressimulation prueft Logik und Isolation, nicht Render-Durchsatz unter Spitzenlast.

## 8. Freigabeurteil

Der lokal gepruefte Funktionsstand ist fuer einen begrenzten Haus-Piloten fachlich freigabefaehig. Vor einer breiten produktiven Freigabe muessen die Live-Abnahmen aus Abschnitt 7 erledigt und protokolliert werden. Dieses Protokoll bestaetigt keine noch nicht ausgefuehrte Render-Bereitstellung.
