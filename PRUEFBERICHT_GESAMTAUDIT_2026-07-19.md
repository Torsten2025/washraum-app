# Pruefbericht WaschZeit Gesamtaudit

Datum: 19. Juli 2026
Pruefumgebung: lokale isolierte SQLite-Datenbanken, Node.js, System-Chrome, statische Quellcodepruefung sowie Live-Abnahme auf Render und Brevo
Produktionsdaten wurden nur fuer die ausdruecklich beauftragte SMTP-Konfiguration und den Versand von Test-/Reset-Mails veraendert.

## Gesamturteil

Die Anwendung ist lokal in den geprueften Kernablaeufen stabil und fuer einen kontrollierten Pilot grundsaetzlich geeignet. Sicherheit, Wohnungskonten, Sitzungen, Rollen- und Hausgrenzen, Buchungsregeln, Tagebuch, Backup, Wartung, PWA-Grundstruktur und die Jahreslastsimulation sind automatisiert gruen.

Eine vollstaendige Produktionsfreigabe ist noch nicht erreicht. Der echte SMTP-Versand samt Passwort-Reset ist inzwischen live nachgewiesen. Vor dem Bewohnerpilot bleiben insbesondere ein unbekanntes starkes Produktions-Adminpasswort und eine externe Backup-Kopie offen. Ausserdem widerspricht die derzeitige technische Buchungsberechtigung der Adminrollen dem zuletzt festgelegten Betriebsmodell.

## Ausgefuehrte Pruefungen

| Stufe | Ergebnis | Nachweis |
| --- | --- | --- |
| Syntax und statische JavaScript-Pruefung | PASS | Alle zentralen Server-, Frontend- und Testdateien syntaktisch gueltig |
| Sicherheit und Anmeldung | PASS | 21 von 21 dynamischen Checks bestanden |
| API und Kernfunktionen | PASS | 29 Funktionsgruppen bestanden, inklusive lokalem SMTP-Test |
| Rollenmatrix | PASS | Bewohner, Haus-Admin und Superadmin; neun Rechte- und Isolationgruppen |
| Jahressimulation | PASS | 100 Bewohner, 6 Haeuser, 52 Wochen, 5.200 Waschpakete |
| Datenisolation unter Last | PASS | 0 Fremdhausverletzungen und 0 doppelte Ressourcenbelegungen |
| Barrierefreiheit und PWA-Struktur | PASS | Vier Seiten und sieben Pruefbereiche bestanden |
| Browser-Smoke-Test | PASS | System-Chrome, mobiles 390-x-844-Viewport, Registrierung und persoenliche Bereiche |
| Verbindliches Projekt-Gate | PASS | `npm run check` vollstaendig bestanden |
| Produktiver E-Mail-Versand | PASS | Brevo kostenlos aktiviert, SMTP auf Render gesetzt, `/api/health` gruen und Passwort-Reset im Brevo-Log als zugestellt nachgewiesen |
| Online-Abhaengigkeitsaudit | OFFEN | npm-Advisory-Endpunkt wegen lokaler Zertifikatskette nicht erreichbar; TLS wurde nicht umgangen |

Die detaillierten Soll-Ergebnisse stehen in `TESTPLAN_GESAMTAUDIT.md`. Der schrittweise Lauf erfolgt mit `npm run audit`.

## Im Audit gefundene und behobene Fehler

### 1. Falscher Serverstatus bei zu grossen oder kaputten JSON-Anfragen

Vorher wurden Anfragen ueber 32 KB sowie syntaktisch ungueltiges JSON als `500 Interner Serverfehler` gemeldet. Die Groessenbegrenzung wirkte zwar, aber Antwort und Protokoll waren falsch.

Behoben:

- zu grosse JSON-Anfrage liefert kontrolliert `413 Die Anfrage ist zu gross.`
- ungueltiges JSON liefert kontrolliert `400 Die Anfrage enthaelt ungueltiges JSON.`
- beide Faelle sind als Regressionstest enthalten

### 2. Zu lockere E-Mail-Validierung

Die bisherige einfache Pruefung akzeptierte ungeeignete Werte wie `<script>@example.test`. Eine direkte Skriptausfuehrung wurde zwar durch Ausgabe-Escapes und CSP verhindert, der Wert war aber fuer Loginidentitaet und Mailheader nicht akzeptabel.

Behoben:

- HTML-/Headerzeichen, Steuer- und Leerzeichen werden abgelehnt
- mehrfache `@`, doppelte Punkte und ungueltige Domainsegmente werden abgelehnt
- Primaer- und Zweitadresse verwenden dieselbe zentrale Validierung
- mehrere Missbrauchsvarianten sind als Regressionstest enthalten

## Was besonders gut funktioniert

### Konten und Anmeldung

- Ein Wohnungscode erzeugt genau ein gemeinsames Wohnungskonto und ist danach verbraucht.
- Bewohner melden sich mit erster oder zweiter E-Mail an; ein frei gewaehlter Name wird nicht zur Identitaet.
- Geraetecodes sind zufaellig, kurzlebig und nur einmal verwendbar.
- Login und Registrierung erneuern die Sitzungskennung.
- Cookies sind `HttpOnly`, `SameSite=Lax` und in Produktion `Secure`; HSTS ist aktiv.
- Passwortwechsel verlangt das alte Passwort und beendet parallele Sitzungen.
- Reset-Anfragen verraten nicht, ob eine E-Mail-Adresse existiert.
- Deaktivierte Konten verlieren laufende Sitzungen und koennen sich nicht erneut anmelden.

### Rollen und Datenisolation

- Bewohner erreichen keine Adminrouten.
- Haus-Admins bleiben auf ihr eigenes Haus begrenzt und koennen gleichrangige Admins nicht verwalten.
- Nur der Superadmin kann Haeuser wechseln, globale Sicherungen ausloesen, Wartung steuern und Rollen verschieben.
- Die Superadmin-Uebergabe und der kontrollierte Break-Glass-Prozess sind getestet.
- In der Jahressimulation trat keine Fremdhausverletzung auf.

### Buchungen und Betrieb

- Waschpakete werden atomar gespeichert; Parallelzugriffe erzeugen keine Doppelbelegung.
- Waschmaschine, Tumblerreserve, Trockenraumfenster, Sonntag und Vergangenheit werden technisch erzwungen.
- Bewohnermeldung, Sperre, Reparatur, Funktionspruefung und Freigabe sind unveraenderbar nachvollziehbar.
- Backups werden als echte SQLite-Dateien geprueft.
- Der Wartungsmodus sperrt Schreibvorgaenge und endet erst nach Datenbank- und Buchungstest.
- Die Lastsimulation erzeugte 5.200 Waschmaschinen-, 5.200 Trockenraum- und 2.704 Tumblerbuchungen ohne Kollision.

## Offene Punkte und Anpassungsvorschlaege

### Prioritaet 0: vor dem Bewohnerpilot

#### P0.1 Echter E-Mail-Versand und Passwort-Reset

Status: abgeschlossen. Das Brevo-Konto ist bestaetigt, der kostenlose Tarif ist aktiv, der Absender `torstenletsch@freenet.de` ist verifiziert und Render verwendet den eigenen SMTP-Schluessel ueber Port 587. Der Live-Healthcheck meldete `ok: true`. Passwort-Reset-Mails an das bestaetigte Torsten-Konto wurden von der App versendet und im Brevo-Protokoll als zugestellt nachgewiesen.

Umgesetzt:

1. Brevo-Konto, Absender und kostenloser Tarif aktiviert.
2. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` und `SMTP_FROM` in Render gesetzt.
3. Mit `SMTP_TEST_TO` eine betriebliche Testadresse getrennt von Login- und Wohnungsidentitaet eingefuehrt.
4. Lokalen SMTP-Integrationstest um den Admin ohne eigene Konto-E-Mail erweitert.
5. Echten Passwort-Reset bis zur Zustellung live nachgewiesen; das Passwort selbst wurde nicht veraendert.

#### P0.2 Produktions-Admin absichern

Status: kritisch. Das in frueheren Live-Tests verwendete Adminpasswort ist bekannt und wirkt wie ein Startpasswort. Ein kompromittierter Superadmin haette Zugriff auf alle Haeuser, Backups, Rollen und Wartung.

Anpassung:

- sofort ein neues, einzigartiges Passwort mit mindestens 20 zufaelligen Zeichen setzen
- Passwort nur in einem Passwortmanager speichern
- einen zweiten vertrauenswuerdigen Haus-Admin als Nachfolgeoption aktiv halten
- mittelfristig Zwei-Faktor-Anmeldung oder einen zweiten Sicherheitsfaktor fuer Superadminaktionen einfuehren

#### P0.3 Adminrollen aus normalen Buchungen entfernen

Status: fachliche Abweichung. Die Oberflaeche und die Routen `/api/bookings` sowie `/api/booking-package` erlauben derzeit auch Admin- und Superadmin-Sitzungen als normale Buchende. Das widerspricht dem gewuenschten Modell: Admins verwalten Sperren, Tagebuch und Dauertermine, buchen aber keine persoenlichen Slots.

Anpassung:

- serverseitige Bewohnerberechtigung fuer alle normalen Erstell-, Freigabe- und Absagerouten verlangen
- fuer Admins die Ansicht `Buchen` ausblenden
- Kalenderansicht fuer Admins rein lesend lassen
- geplante Bewohnertermine weiterhin ausschliesslich ueber `Dauertermine` verwalten
- Rollenmatrix um positive und negative Buchungspruefungen je Rolle erweitern

#### P0.4 Externe Sicherung

Status: offen. Lokale Render-Sicherungen funktionieren, im Live-Ueberblick fehlte zuletzt aber eine externe Kopie. Ein Fehler des persistenten Datentraegers waere damit ein Einzelrisiko.

Anpassung:

- `BACKUP_UPLOAD_URL` und `BACKUP_UPLOAD_TOKEN` fuer einen getrennten Speicher einrichten
- taeglichen Upload und Wiederherstellungstest dokumentieren
- Warnung erst nach einer nachweislich erfolgreichen externen Kopie ausblenden

### Prioritaet 1: vor dem Vollbetrieb mit 20 Wohnungen

#### P1.1 Online-Abhaengigkeitspruefung in CI

Status: nicht beweisbar. `npm audit --omit=dev` scheiterte lokal an `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Das Deaktivieren der TLS-Pruefung waere unsicher und wurde bewusst nicht gemacht.

Anpassung:

- Zertifikatskette des Rechners/npm-Proxys korrekt einrichten
- `npm audit --omit=dev --audit-level=high` in GitHub Actions ausfuehren
- Dependabot fuer npm aktivieren
- hohe und kritische Funde als blockierendes Deployment-Gate behandeln

#### P1.2 Browser-E2E verbindlich und reproduzierbar machen

Status: lokal mit vorhandener Playwright-Laufzeit und System-Chrome bestanden; im normalen Projektlauf wird ohne Playwright derzeit `SKIP` gemeldet.

Anpassung:

- `playwright-core` als feste Entwicklungsabhaengigkeit aufnehmen, sobald die npm-Zertifikatskette repariert ist
- System-Chromium in CI bereitstellen oder einen kontrollierten Browsercache verwenden
- `E2E_REQUIRED=true` im Deployment-Workflow setzen, damit ein Skip dort als Fehler gilt

#### P1.3 Visuelle Regression auf Mobilgeraeten

Status: Bedienpfade und Sichtbarkeit sind getestet, aber keine Pixel-/Screenshotvergleiche fuer mehrere Viewports.

Anpassung:

- Screenshots fuer 390 x 844, 768 x 1024 und 1440 x 900 aufnehmen
- Kalender, Buchungsdialog, Einstellungen, Tagebuch und lange Nutzerlisten vergleichen
- Ueberlagerung, abgeschnittene Texte und Touchflaechen automatisch markieren

### Prioritaet 2: Haertung nach dem Pilot

#### P2.1 Persistente Rate-Limits

Die aktuellen Limits sind korrekt getestet, liegen aber im Speicher des einzelnen Node-Prozesses. Ein Neustart setzt sie zurueck; mehrere Instanzen teilen sie nicht.

Anpassung: Zaehler fuer Login und Wiederherstellung bei wachsendem Betrieb in SQLite oder einem gemeinsamen Store halten. Fuer den heutigen einzelnen Render-Prozess ist das Risiko begrenzt.

#### P2.2 Schrittweise Bestaetigung kritischer Adminaktionen

Anpassung: Superadmin-Uebergabe, globaler Buchungsreset, Wartungsstart und Hausdeaktivierung zusaetzlich mit erneutem Passwort oder Einmalcode bestaetigen. Das reduziert Schaden bei einer kurz unbeaufsichtigten Adminsitzung.

#### P2.3 Physische Regelverstoesse bleiben ausserhalb der App

Nicht eingetragenes Waschen und vergessene Waesche koennen ohne Sensoren nicht automatisch erkannt werden. Das Tagebuch erfasst Folgen, beweist aber nicht sicher, wer eine Maschine ausserhalb seines Slots benutzt hat.

Anpassung:

- kurze neutrale Hausregel am Waschraum anbringen
- Vorfaelle nur sachlich im Tagebuch erfassen
- bei anhaltenden Problemen optional Maschinenstrom-/Tuersensoren mit klarer Datenschutzpruefung erwägen
- keine automatischen Schuldzuweisungen allein aus dem Buchungsplan ableiten

## Empfohlene Reihenfolge

1. Produktions-Adminpasswort aendern.
2. Externes Backup einrichten.
3. Normales Buchen fuer Adminrollen server- und clientseitig sperren.
4. npm-Zertifikatskette und verpflichtenden Browserlauf in CI einrichten.
5. Mit 3 bis 5 Bewohnern pilotieren und Bedienfeedback sammeln.
6. Erst danach alle 20 Wohnungen aktivieren.

## Reproduzierbarkeit

```bash
npm run audit
npm run check
npm audit --omit=dev
```

Der letzte Befehl ist erst aussagekraeftig, wenn die lokale Zertifikatskette repariert ist. Bis dahin darf aus dem fehlenden Ergebnis weder Sicherheit noch Unsicherheit der Abhaengigkeiten abgeleitet werden.
