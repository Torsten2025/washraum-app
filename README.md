# Waschplan App

Schlanke Buchungsapp fuer den GBMZ-Waschraum am Maneggplatz 18.

## Enthalten

- Wochenkalender mit direkter Buchung und persoenlichen Vorschlaegen aus dem bisherigen Waschrhythmus.
- GBMZ-Regeln fuer Waschmaschinen, Tumbler und Trockenraeume, serverseitig geprueft.
- Geschuetzte, wiederkehrende Buchungen fuer von Admins betreute Personen.
- E-Mail-Hinweise, wenn eine Buchung frueher freigegeben wird.
- Vertontes Einfuehrungsvideo mit deutschen Untertiteln, interaktivem Rundgang und freundlichem Quiz.
- Passwortwechsel, Admin-Kontoverwaltung und SQLite-Backup.

## Umgebungen

Die App hat drei getrennte Betriebsebenen:

- Entwicklung: lokaler Server mit `npm start` und lokaler SQLite-Datei unter `data/`.
- Test: `npm test` startet einen isolierten Server mit temporaerer Datenbank. GitHub Actions fuehrt diesen Test vor jedem Render-Deploy aus.
- Produktion: Render mit persistentem Datentraeger unter `/var/data`.

Eine zusaetzliche online erreichbare Staging-Instanz gibt es bewusst noch nicht. Sie ist erst sinnvoll, wenn mehrere Personen regelmaessig entwickeln oder Aenderungen vor der Hausfreigabe online abgenommen werden muessen.

## Lokal starten

```bash
npm install
npm start
```

Danach `http://localhost:3000` oeffnen. Nur lokal werden diese Konten automatisch angelegt:

- Admin: `admin` / `admin123`
- Nutzer: `user` / `user123`

## Pruefen

```bash
npm run check
```

Der Check umfasst Syntax, Authentifizierung, Passwortverwaltung, Buchungsregeln, Kalender, Empfehlungen, feste Buchungen, Kontoverwaltung, Backup, Videoassets und Sicherheitsheader.

## Registrierung und Hauscode

Neue Bewohner registrieren sich mit Benutzername, E-Mail, Passwort und Hauscode. Der aktuelle Hauscode ist nur fuer Admins im Adminbereich sichtbar und kann dort geaendert werden. Lokal lautet der Startwert `GBMZ Maneggplatz 18`. In einer neuen Produktion wird ohne `HOUSE_CODE` ein zufaelliger Startwert erzeugt.

## Produktion auf Render

Fuer eine neue Datenbank muessen in Render mindestens gesetzt sein:

- `SEED_ADMIN_PASSWORD`: sicheres erstes Admin-Passwort.
- `SESSION_SECRET`: wird durch `render.yaml` automatisch erzeugt.
- `HOUSE_CODE`: optional; sonst wird beim ersten Start ein zufaelliger Wert erzeugt.
- `PUBLIC_APP_URL`: z. B. `https://washraum-app.onrender.com`.

Die SQLite-Daten liegen persistent unter `/var/data/washraum.sqlite`. Bestehende Datenbanken und Konten werden bei Deployments weiterverwendet.

Der Workflow `.github/workflows/deploy-render.yml` fuehrt `npm run check` aus und ruft erst danach den geheimen Render Deploy Hook fuer genau den getesteten Commit auf. Anschliessend wartet GitHub, bis `/api/health` genau diesen Commit als live meldet. GitHub benoetigt dafuer das Repository Secret `RENDER_DEPLOY_HOOK_URL`.

## E-Mail-Hinweise

Ohne SMTP-Konfiguration bleibt die App normal nutzbar; es werden lediglich keine E-Mails versendet. Fuer den Versand dienen:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

## Sicherung

Admins koennen im Adminbereich jederzeit eine konsistente SQLite-Sicherung herunterladen. Vor groesseren Aenderungen oder einem breiten Hausstart sollte eine Sicherung erstellt werden.

## Einfuehrung im Haus

Ein fertiger Einladungstext und ein kleiner Pilotablauf stehen in [HAUSSTART.md](HAUSSTART.md).
