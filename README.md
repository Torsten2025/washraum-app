# WaschZeit

Schlanke Buchungsapp fuer gemeinsame Waschraeume mit mehreren Hausadressen.

Die vollstaendige Bedienungsanleitung, Rollenmatrix, Funktionsuebersicht, Testreferenz und das Aenderungsprotokoll stehen in [HANDBUCH.md](HANDBUCH.md). Bei Funktionsaenderungen wird dieses Handbuch zusammen mit Code und Tests aktualisiert.

## Enthalten

- Wochenkalender mit Einzelbuchung und persoenlichen Waschpaketen aus Waschrhythmus und aktuell freien Geraeten.
- Waschpakete reservieren per Schnellwahl eine bis drei Waschmaschinen im gleichen Slot, eine waehlbare Trockenraumdauer und den Tumbler gemeinsam und atomar. Alle Bestandteile koennen gemeinsam verwaltet werden.
- Jede Person, jedes Geraet und jede Buchung gehoert zu genau einer Hausnummer.
- Haus-Admins verwalten ihr Haus. Der Superadmin verwaltet Haeuser, Geraete, Rollen und kontrollierte Umzuege zwischen Hausnummern.
- GBMZ-Regeln fuer Waschmaschinen, Tumbler und Trockenraeume werden serverseitig in Schweizer Zeit geprueft.
- Geschuetzte, wiederkehrende Buchungen fuer von Admins betreute Personen.
- Verifizierte, nach Bereich, Wochentag und Slot filterbare E-Mail-Hinweise bei frueher Freigabe oder Absage.
- Neu vertontes 4:46-Minuten-Video mit Schweizer Stimme, synchronen Untertiteln, Lesetext und freundlichem Quiz.
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

Der Check umfasst Syntax, Authentifizierung, E-Mail-Verifikation, echten SMTP-Dialog, Passwort-Wiederherstellung, Buchungsregeln, parallele Buchungsversuche, Waschpakete, eine eigene Rollenmatrix, Mehrhaus-Isolation, feste Buchungen, Datenschutzfunktionen, Audit, gepruefte Backups, Videoassets, Sicherheitsheader und statische Barrierefreiheit. Zusaetzlich simuliert `npm run test:year` mit 100 Bewohnerkonten in sechs getrennten Haeusern 52 Waschwochen und 5.200 Waschpakete.

## Registrierung und Hauscode

Neue Bewohner registrieren sich mit Benutzername, E-Mail, Passwort und Hauscode. Der Code ordnet das Konto der richtigen Hausnummer zu. Er ist nur fuer den Haus-Admin und den Superadmin sichtbar und kann dort geaendert werden. Lokal lautet der Startwert `GBMZ Maneggplatz 18`. In einer neuen Produktion wird ohne `HOUSE_CODE` ein zufaelliger Wert erzeugt.

Beim ersten Start wird `Maneggplatz 18` als Standardhaus angelegt. Das erste Admin-Konto wird zum Superadmin. Weitere Hausnummern erhalten anfangs drei Waschmaschinen, drei Trockenraeume und zwei Tumbler. Namen, aktive Geraete und Hausstatus koennen danach angepasst werden. Ein Bewohner kann nur ohne kommende Buchungen in ein anderes Haus verschoben werden.

## Produktion auf Render

Fuer eine neue Datenbank muessen in Render mindestens gesetzt sein:

- `SEED_ADMIN_PASSWORD`: sicheres erstes Admin-Passwort
- `SESSION_SECRET`: wird durch `render.yaml` erzeugt
- `HOUSE_CODE`: optional; sonst wird ein zufaelliger Wert erzeugt
- `HOUSE_NAME`: optionaler Name der ersten Hausnummer
- `PUBLIC_APP_URL`: zum Beispiel `https://washraum-app.onrender.com`

Die SQLite-Daten liegen unter `/var/data/washraum.sqlite`. Bestehende Daten bleiben bei Deployments erhalten. Der Render-Build verwendet reproduzierbar `npm ci`.

Der Workflow `.github/workflows/deploy-render.yml` fuehrt `npm run check` aus und ruft erst danach den geheimen Render Deploy Hook fuer genau den getesteten Commit auf. GitHub benoetigt das Repository Secret `RENDER_DEPLOY_HOOK_URL`.

## E-Mail-Hinweise

Ohne SMTP-Konfiguration bleibt die App nutzbar; es werden lediglich keine E-Mails versendet. Mit SMTP muss jede neue oder geaenderte Adresse ueber einen 24 Stunden gueltigen Link bestaetigt werden. Passwort-Links gelten eine Stunde.

Im laufenden Zeitfenster meldet `Frueher frei`, dass ein Raum oder Geraet wieder frei ist. Vor Slotbeginn bietet `Absagen & informieren` den Termin wieder an. Benachrichtigt werden nur Personen im selben Haus, deren Filter zu Bereich, Wochentag und Slot passen. Loeschen bleibt die stille Variante. Nach Slotende wird keine Nachricht mehr ausgeloest.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

## Sicherung

Render erstellt bei `AUTO_BACKUP=true` taeglich eine SQLite-Sicherung, prueft sie mit `integrity_check` und behaelt unter `BACKUP_DIR` die drei neuesten Dateien sowie je eine Tagessicherung fuer bis zu 14 Tage. Der Superadmin sieht den Status, kann ein geprueftes Backup ausloesen und eine Datei herunterladen. Der Verwaltungsueberblick warnt, solange keine externe Kopie konfiguriert ist.

Fuer eine unabhaengige Kopie kann `BACKUP_UPLOAD_URL` gesetzt werden. Die App sendet das Backup per `PUT`; `{filename}` wird durch den Dateinamen ersetzt. `BACKUP_UPLOAD_TOKEN` wird optional als Bearer-Token mitgesendet. Eine Wiederherstellungsprobe sollte vor dem breiten Hausstart und danach regelmaessig organisatorisch durchgefuehrt werden.

## Datenschutz

Bewohner koennen ihre Kontodaten und Buchungen exportieren, Benachrichtigungen abschalten und ihr Konto nach Passwortbestaetigung loeschen. Freigabe-Hinweise werden nach 30 Tagen entfernt; Buchungen und Audit-Eintraege nach einem Jahr. Abgelaufene Sitzungen und Sicherheitslinks werden taeglich bereinigt. Die sichtbaren Hinweise stehen unter `/privacy.html`.

## Video neu erzeugen

MP4, Poster und VTT-Untertitel entstehen aus derselben Kapiteldefinition:

```bash
python scripts/build-intro-video.py
```

Dafuer werden lokal `edge-tts`, `imageio-ffmpeg`, `certifi` und `Pillow` benoetigt. Unter Windows verbindet der Generator den Windows-Vertrauensspeicher mit dem Python-Zertifikatsbund. Jedes Kapitel laeuft bis zum Ende der Sprachdatei und erhaelt danach eine kurze Pause.

## Einfuehrung im Haus

Ein fertiger Einladungstext und ein Pilotablauf stehen in [HAUSSTART.md](HAUSSTART.md).
