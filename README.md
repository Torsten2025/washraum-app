# WaschZeit

Schlanke Buchungsapp fuer gemeinsame Waschraeume mit mehreren Hausadressen.

Die vollstaendige Bedienungsanleitung, Rollenmatrix, Funktionsuebersicht, Testreferenz und das Aenderungsprotokoll stehen in [HANDBUCH.md](HANDBUCH.md). Bei Funktionsaenderungen wird dieses Handbuch zusammen mit Code und Tests aktualisiert.

## Enthalten

- Wochenkalender mit Einzelbuchung und persoenlichen Waschpaketen aus Waschrhythmus und aktuell freien Geraeten.
- Waschpakete reservieren per Schnellwahl eine bis drei Waschmaschinen im gleichen Slot, eine waehlbare Trockenraumdauer und den Tumbler gemeinsam und atomar. Alle Bestandteile koennen gemeinsam verwaltet werden.
- Jede Person, jedes Geraet und jede Buchung gehoert zu genau einer Hausnummer.
- Jede Person verwendet genau eine eindeutige E-Mail-Identitaet. Diese kann Bewohner einer Wohnung, Haus-Admin und zusaetzlich Superadmin sein; `Mein Waschplan` und `Verwalten` bleiben dabei klar getrennt.
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
- Produktion: Render mit persistentem Datentraeger unter `/var/data`.

`render.staging.yaml` beschreibt eine getrennte, absichtlich nicht automatisch erzeugte Staging-Instanz. Sie nutzt eine fluechtige Testdatenbank und kann bei Bedarf als zweiter Render-Blueprint angelegt werden, ohne Produktionsdaten zu beruehren.

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

## Wohnungseinladung

Neue Bewohner koennen sich nicht frei registrieren. Haus-Admin oder Superadmin legen Wohnungsbezeichnung, Klingelschildname und Ziel-E-Mail fest. Die App sendet ausschliesslich per SMTP einen sieben Tage gueltigen Einladungslink. Eine neue E-Mail legt eine persoenliche Identitaet an; eine bereits bekannte E-Mail erweitert nach Bestaetigung des vorhandenen Passworts dieselbe Identitaet um die Wohnungsmitgliedschaft. Weitere Familienmitglieder erhalten per zehn Minuten gueltigem QR-Code einen eigenen persoenlichen Bewohnerzugang zur gemeinsamen Wohnung. Der QR-Code kopiert niemals Adminrechte. Alle Mitglieder sehen dieselben Wohnungsbuchungen und teilen die Vorausbuchungsregeln. Ohne funktionierenden E-Mail-Versand kann keine Produktionseinladung erstellt werden.

Beim ersten Start wird `Maneggplatz 18` als Standardhaus angelegt. Das erste Admin-Konto wird zum Superadmin. Weitere Hausnummern erhalten anfangs drei Waschmaschinen, drei Trockenraeume und zwei Tumbler. Namen, aktive Geraete und Hausstatus koennen danach angepasst werden. Ein Bewohner kann nur ohne kommende Buchungen in ein anderes Haus verschoben werden.

## Produktion auf Render

Fuer eine neue Datenbank muessen in Render mindestens gesetzt sein:

- `SEED_ADMIN_PASSWORD`: sicheres erstes Admin-Passwort
- `SEED_ADMIN_FORCE_PASSWORD_RESET`: nur temporaer im Notfall auf `true` setzen, wenn das Seed-Superadmin-Passwort neu gesetzt werden muss
- `SESSION_SECRET`: wird durch `render.yaml` erzeugt
- `HOUSE_NAME`: optionaler Name der ersten Hausnummer
- `PUBLIC_APP_URL`: zum Beispiel `https://washraum-app.onrender.com`

Die SQLite-Daten liegen unter `/var/data/washraum.sqlite`. Bestehende Daten bleiben bei Deployments erhalten. Der Render-Build verwendet reproduzierbar `npm ci`.

Der Workflow `.github/workflows/deploy-render.yml` installiert Chromium, fuehrt `npm run check` einschliesslich verbindlichem Browser- und Screenshot-Test aus und ruft erst danach den geheimen Render Deploy Hook fuer genau den getesteten Commit auf. Die Screenshots fuer Mobiltelefon, Tablet und Desktop bleiben 14 Tage als CI-Artefakt erhalten. GitHub benoetigt das Repository Secret `RENDER_DEPLOY_HOOK_URL`.

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

Die sechs MP4-, Poster-, VTT- und Transkriptpakete entstehen aus derselben Kapitelquelle. Zuerst erzeugt der Browserlauf aktuelle Rollen-/Sprachaufnahmen, danach rendert der Generator die Medien:

```bash
npm run test:e2e
npm run generate:intro-media
npm run test:media
```

Unter Windows nutzt der Generator die installierten deutschen und englischen Systemstimmen sowie FFmpeg aus `FFMPEG_PATH` oder dem lokalen `imageio_ffmpeg`-Paket. Die Medien liegen unter `public/assets/intro/media/`: Bewohner je 04:02 und 9 Kapitel, Haus-Admin je 04:58 und 11 Kapitel, Superadmin je 04:40 und 10 Kapitel. `public/intro-content.js` bleibt die gemeinsame Quelle fuer Kapitelmetadaten, Sprechertext und Transkript; `public/intro-media.js` ordnet Rolle und Sprache den echten Dateien zu.

Poster, Untertitel, Transkripte und Manifest sind offline verfuegbar. Die zusammen rund 9,3 MB grossen MP4-Dateien werden erst bei Wiedergabe geladen und nicht im PWA-Cache gespeichert.

## Einfuehrung im Haus

Ein fertiger Einladungstext und ein Pilotablauf stehen in [HAUSSTART.md](HAUSSTART.md).
