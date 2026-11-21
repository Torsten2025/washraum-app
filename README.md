# WaschZeit

Schlanke Buchungsapp fuer gemeinsame Waschraeume mit mehreren Hausadressen.

Die vollstaendige Bedienungsanleitung, Rollenmatrix, Funktionsuebersicht, Testreferenz und das Aenderungsprotokoll stehen in [HANDBUCH.md](HANDBUCH.md). Bei Funktionsaenderungen wird dieses Handbuch zusammen mit Code und Tests aktualisiert.

## Enthalten

- Wochenkalender mit Einzelbuchung und persoenlichen Waschpaketen aus Waschrhythmus und aktuell freien Geraeten.
- Waschpakete reservieren per Schnellwahl eine bis drei Waschmaschinen im gleichen Slot, eine waehlbare Trockenraumdauer und den Tumbler gemeinsam und atomar. Alle Bestandteile koennen gemeinsam verwaltet werden.
- Restplaetze buchen fuer einen freien, noch nicht begonnenen Slot am heutigen Schweizer Tag exakt eine Waschmaschine und optional einen Tumbler; Trockenraum und neue Benachrichtigungen bleiben ausgeschlossen.
- Jede Person, jedes Geraet und jede Buchung gehoert zu genau einer Hausnummer.
- Jede Person verwendet einen eigenen Zugang mit zufaelliger Zugangskennung; eine E-Mail-Adresse ist freiwillig. Dieselbe Identitaet kann Bewohner einer Wohnung, Haus-Admin und zusaetzlich Superadmin sein; `Mein Waschplan` und `Verwalten` bleiben dabei klar getrennt.
- Zentrale deutsche und englische Oberflaeche mit lokaler Sprachwahl vor Login und kontobezogener Persistenz nach Login; Deutsch bleibt der sichere Rueckfall.
- Haus-Admins verwalten ihr Haus. Der Superadmin verwaltet Haeuser, Geraete, additive Rollen und kontrollierte Umzuege zwischen Hausnummern.
- GBMZ-Regeln fuer Waschmaschinen, Tumbler und Trockenraeume werden serverseitig in Schweizer Zeit geprueft.
- Geschuetzte, wiederkehrende Buchungen fuer von Admins betreute Personen.
- Verifizierte, nach Bereich, Wochentag und Slot filterbare E-Mail-Hinweise bei frueher Freigabe oder Absage.
- Sechs echte rollen- und sprachspezifische H.264/AAC-Videos fuer Bewohner, Haus-Admins und Superadmins in Deutsch und Englisch mit passenden App-Szenen, synchronen VTT-Untertiteln, Poster, Transkript und anklickbaren Kapiteln.
- Die englische Verwaltung wird einschliesslich dynamischer Aufgaben, Ressourcen, Einladungen, Tagebuch, Auswertung und Systemstatus direkt aus dem I18N-Katalog aufgebaut; der Browsertest prueft alle Reiter fuer Haus-Admin und Superadmin sowie EN -> DE -> EN ohne Reload.
- Sechs ergaenzende interaktive Fuehrungen mit derselben gemeinsamen Kapitel-, Sprecher- und Transkriptquelle.
- Passwort-Wiederherstellung, Datenexport, Kontoloeschung und Admin-Auditprotokoll.
- Taegliche, auf Integritaet gepruefte SQLite-Backups mit optionaler externer Kopie.

## Umgebungen

- Entwicklung: lokaler Server mit lokaler SQLite-Datei unter `data/`.
- Test: isolierte Server mit temporaeren Datenbanken und lokalem SMTP-Testserver. Eine statische Barrierefreiheitspruefung ist ebenfalls enthalten.
- Agent-Test: eigener Render-Free-Dienst `waschzeit-agent-test` in Frankfurt mit fluechtiger Datenbank, ohne Disk, E-Mail, Push oder Backup. Der gepruefte Releasecommit wird ausschliesslich per Fast-forward auf `codex/agent-test` veroeffentlicht.
- Produktion: Render mit persistentem Datentraeger unter `/var/data`.

`render.staging.yaml` beschreibt eine getrennte, absichtlich nicht automatisch erzeugte Staging-Instanz. Sie nutzt eine fluechtige Testdatenbank und kann bei Bedarf als zweiter Render-Blueprint angelegt werden, ohne Produktionsdaten zu beruehren.

`render.agent-test.yaml` beschreibt die dauerhaft wiederverwendbare, vollstaendig synthetische Agent-Testumgebung. Nur ein zuvor vollstaendig gepruefter Fast-forward-Push auf `codex/agent-test` darf den AutoDeploy ausloesen. Unmittelbar davor werden die drei Owner-Fixturesecrets, der erwartete Commit und die gefrorenen Guardwerte in genau einem Render-Environment-Vorgang mit `Save only` vorgemerkt; dieser Vorgang darf keinen Deploy ausloesen. Nur dieser Dienst pinnt Node `22.23.1`; das deklarative `packageManager: npm@10.9.8` wird vor `npm ci` durch `scripts/toolchain-guard.js` offline und ohne Installation geprueft. Der Pin verbessert die Reproduzierbarkeit, beweist aber weder die Node-24-Hypothese noch die weiterhin unbekannte Ursache des vorigen Render-Fehlers.

Die test.11-Fixture ist vor jedem Datenbankzugriff an die exakte Agent-Test-Identitaet gebunden. Sie baut im fluechtigen `/tmp`-Speicher zwei synthetische Haeuser, minimale Ressourcen und je ein exklusives Bewohner-, Haus-Admin- und Superadminkonto deterministisch neu auf. Das kombinierte Seed-Admin-Konto bleibt unveraendert. Alle vier Passwoerter sind getrennte Owner-Runtimewerte ausserhalb des Repositorys; E-Mail, Push, Backup und externe Provider bleiben ausgeschaltet. Ein Neustart kann alle fluechtigen Daten verlieren und erstellt danach die Fixture neu. Dieser Testvertrag ist kein Produktions-Persistenz- oder Backupkonzept.

## Lokal starten

```bash
npm ci
npm start
```

Danach `http://localhost:3000` oeffnen. Nur lokal werden diese Konten automatisch angelegt:

- Admin: `admin` / `admin123`
- Nutzer: `user` / `user123`

## Pruefen

```bash
npm run check
```

Der Check umfasst Syntax, I18N-Vollstaendigkeit, Sprachpersistenz, sechs Rollenfuehrungen, sechs echte Medienpakete, Authentifizierung, E-Mail-Verifikation, echten SMTP-Dialog, Passwort-Wiederherstellung, Buchungsregeln, parallele Buchungsversuche, Waschpakete, Rollenmatrix, Mehrhaus-Isolation, Datenschutz, Audit, Backup-Wiederherstellung, Sicherheitsheader, Barrierefreiheit und einen verbindlichen Browserlauf mit drei Viewports. Zusaetzlich simuliert `npm run test:year` mit 100 Bewohnerkonten in sechs getrennten Haeusern 52 Waschwochen und 5.200 Waschpakete.

Der gezielte Sprachtest kann separat gestartet werden:

```bash
npm run test:i18n
```

Die Sprachwahl benoetigt keine Umgebungsvariable. Der Browserkatalog liegt in `public/i18n.js`; serverseitige E-Mail- und Push-Texte liegen in `src/services/localization.js`. `users.language` akzeptiert nur `de` oder `en`.

## Bewohnerzugang

Neue Bewohner koennen sich nicht frei registrieren. Haus-Admin oder Superadmin legen Wohnungsbezeichnung und Klingelschildname fest und erzeugen pro Person eine sieben Tage gueltige Zugangskarte. QR-Token und lesbarer Aktivierungscode werden nur gehasht gespeichert und einmalig verbraucht; die Person setzt ihr Passwort selbst und meldet sich danach mit der zufaelligen Zugangskennung an. E-Mail bleibt fuer Einladung, Reset und Hinweise optional. Weitere Familienmitglieder erhalten eine eigene Karte oder per zehn Minuten gueltigem Partner-QR einen eigenen Bewohnerzugang zur gemeinsamen Wohnung. Kein Karten- oder QR-Weg kopiert Adminrechte. Alle Mitglieder sehen dieselben Wohnungsbuchungen und teilen die Vorausbuchungsregeln. Ohne SMTP bleiben Zugangskarten, Anmeldung, Push und In-App-Funktionen nutzbar.

Beim ersten Start wird `Maneggplatz 18` als Standardhaus angelegt. Das erste Admin-Konto wird zum Superadmin. Weitere Hausnummern erhalten anfangs drei Waschmaschinen, drei Trockenraeume und zwei Tumbler. Namen, aktive Geraete und Hausstatus koennen danach angepasst werden. Ein Bewohner kann nur ohne kommende Buchungen in ein anderes Haus verschoben werden.

## Produktion auf Render

Fuer eine neue Datenbank muessen in Render mindestens gesetzt sein:

- `SEED_ADMIN_PASSWORD`: sicheres erstes Admin-Passwort
- `SEED_ADMIN_FORCE_PASSWORD_RESET`: nur temporaer im Notfall auf `true` setzen, wenn das Seed-Superadmin-Passwort neu gesetzt werden muss
- `SESSION_SECRET`: wird durch `render.yaml` erzeugt
- `HOUSE_NAME`: optionaler Name der ersten Hausnummer
- `PUBLIC_APP_URL`: zum Beispiel `https://washraum-app.onrender.com`

Die SQLite-Daten liegen unter `/var/data/washraum.sqlite`. Bestehende Daten bleiben bei Deployments erhalten. Der Render-Build verwendet reproduzierbar `npm ci`.

Der Workflow `.github/workflows/deploy-render.yml` wird ausschliesslich manuell nach dem Produktionsgate gestartet. Er akzeptiert nur den kryptografisch signierten Nachweis des tatsaechlich in der Render-Laufzeit erzeugten und isoliert wiederhergestellten SQLite-Backups, gleicht den signierten Livecommit und die Liveversion nochmals mit `/api/health` ab, installiert Chromium, fuehrt `npm run check` einschliesslich Browser- und Screenshot-Test aus und sendet danach exakt einen Render-Deploy-Hookrequest ohne Retry oder Redirect. Freie Hash-/PASS-Eingaben, ungueltige oder alte Nachweise und jeder unklare Zustand stoppen vor dem Hook. Die Screenshots fuer Mobiltelefon, Tablet und Desktop bleiben 14 Tage als CI-Artefakt erhalten. GitHub benoetigt die getrennten Repository-Secrets `RENDER_DEPLOY_HOOK_URL` und `PRODUCTION_RELEASE_PROOF_KEY`.

## E-Mail-Hinweise

Ohne SMTP-Konfiguration bleibt die bestehende Buchungsapp nutzbar, neue Wohnungskonten koennen jedoch nicht eingeladen werden. Mit SMTP muss jede neue oder geaenderte Adresse ueber einen 24 Stunden gueltigen Link bestaetigt werden. Passwort-Links gelten eine Stunde.

Im laufenden Zeitfenster meldet `Frueher frei`, dass ein Raum oder Geraet wieder frei ist. Vor Slotbeginn bietet `Absagen & informieren` den Termin wieder an. Benachrichtigt werden nur Personen im selben Haus, deren Filter zu Bereich, Wochentag und Slot passen. Loeschen bleibt die stille Variante. Nach Slotende wird keine Nachricht mehr ausgeloest.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_TEST_TO` (optional; feste Zieladresse fuer den Admin-Testbutton, ohne sie wird die Konto-E-Mail des angemeldeten Admins verwendet)

## Sicherung

Render erstellt bei `AUTO_BACKUP=true` taeglich eine SQLite-Sicherung, prueft sie mit `integrity_check` und behaelt unter `BACKUP_DIR` die drei neuesten Dateien sowie je eine Tagessicherung fuer bis zu 14 Tage. Der Superadmin sieht den Status, kann ein geprueftes Backup ausloesen und eine Datei herunterladen. Der Verwaltungsueberblick warnt, solange keine externe Kopie konfiguriert ist.

Fuer eine unabhaengige Kopie kann `BACKUP_UPLOAD_URL` gesetzt werden. Die App sendet das Backup per `PUT`; `{filename}` wird durch den Dateinamen ersetzt. `BACKUP_UPLOAD_TOKEN` wird optional als Bearer-Token mitgesendet. Eine Wiederherstellungsprobe sollte vor dem breiten Hausstart und danach regelmaessig organisatorisch durchgefuehrt werden.

## Datenschutz

Bewohner koennen ihre Kontodaten und Buchungen exportieren, Benachrichtigungen abschalten und ihr Konto nach Passwortbestaetigung loeschen. Freigabe-Hinweise werden nach 30 Tagen entfernt; Buchungen und Audit-Eintraege nach einem Jahr. Abgelaufene Sitzungen und Sicherheitslinks werden taeglich bereinigt. Die sichtbaren Hinweise stehen unter `/privacy.html`.

## Videos neu erzeugen

Die sechs Rollenfilme (Bewohner, Hausadmin, Superadmin; je DE und EN) werden in einer lokalen WaschZeit-Instanz mit erfundenen Haushalten aufgezeichnet. Für die normale App oder ihre Tests ist keine Sprachsoftware nötig. Wer neue Filme produziert, braucht zusätzlich Chromium, FFmpeg und eine lokale Python-Umgebung mit Piper. Vor dem Aufruf `PIPER_PYTHON`, `PIPER_MODELS` und `FFMPEG_PATH` auf die lokalen Werkzeuge bzw. das Modellverzeichnis setzen. Für beide Produktionsschritte dasselbe neue, private Arbeitsverzeichnis in `INTRO_WORK_DIR` angeben. Stimmen, Lizenzquellen und Hinweise: [Produktion der Rollenfilme](public/assets/intro/media/PRODUCTION-NOTES.txt).

```bash
npm run generate:intro-media
npm run generate:intro-media -- --finalize-existing
npm run test:media
npm run test:e2e
```

Unter `public/assets/intro/media/` liegen MP4, Poster, Untertitel, Transkript und Manifest. Bewohner haben neun Kapitel, Hausadmins elf und Superadmins zehn. Kapitelstarts, Untertitel und Transkripte folgen der tatsächlichen Sprachfassung; deshalb dürfen DE und EN unterschiedlich lang sein. Bei der Aufnahme werden keine Bewohnerdaten verwendet und keine Nachrichten an echte Geräte versendet.

Poster, Untertitel, Transkripte und Manifest stehen auch offline zur Verfügung. Die MP4-Dateien werden nicht mit der App vorab geladen und nicht im PWA-Cache gespeichert.

## Einfuehrung im Haus

Ein fertiger Einladungstext und ein Pilotablauf stehen in [HAUSSTART.md](HAUSSTART.md).
