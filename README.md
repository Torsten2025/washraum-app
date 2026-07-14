# Waschplan App

Schlanke Buchungsapp fuer GBMZ-Waschraeume mit mehreren Hausnummern.

## Enthalten

- Wochenkalender mit Einzelbuchung und persoenlichen Waschpaketen aus Waschrhythmus und aktuell freien Geraeten.
- Ein Waschpaket reserviert die ausgewaehlte Waschmaschine, den vorgeschlagenen Trockenraum und optional einen Tumbler gemeinsam und atomar.
- Jede Person, jedes Geraet und jede Buchung gehoert zu genau einer Hausnummer.
- Haus-Admins verwalten nur ihr Haus. Der Superadmin kann Haeuser anlegen, wechseln und Bewohner zu Haus-Admins machen.
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

Neue Bewohner registrieren sich mit Benutzername, E-Mail, Passwort und Hauscode. Der Code ordnet das Konto automatisch der richtigen Hausnummer zu. Der jeweilige Code ist nur fuer den Haus-Admin und den Superadmin sichtbar und kann dort geaendert werden. Lokal lautet der Startwert `GBMZ Maneggplatz 18`. In einer neuen Produktion wird ohne `HOUSE_CODE` ein zufaelliger Startwert erzeugt.

Beim ersten Start wird `Maneggplatz 18` als Standardhaus angelegt. Das vorhandene erste Admin-Konto wird zum Superadmin. Weitere Hausnummern legt der Superadmin im Adminbereich an; jedes neue Haus erhaelt automatisch drei Waschmaschinen, drei Trockenraeume und zwei Tumbler.

## Produktion auf Render

Fuer eine neue Datenbank muessen in Render mindestens gesetzt sein:

- `SEED_ADMIN_PASSWORD`: sicheres erstes Admin-Passwort.
- `SESSION_SECRET`: wird durch `render.yaml` automatisch erzeugt.
- `HOUSE_CODE`: optional; sonst wird beim ersten Start ein zufaelliger Wert erzeugt.
- `HOUSE_NAME`: optionaler Name der ersten Hausnummer, Standard `Maneggplatz 18`.
- `PUBLIC_APP_URL`: z. B. `https://washraum-app.onrender.com`.

Die SQLite-Daten liegen persistent unter `/var/data/washraum.sqlite`. Bestehende Datenbanken und Konten werden bei Deployments weiterverwendet.

Der Workflow `.github/workflows/deploy-render.yml` fuehrt `npm run check` aus und ruft erst danach den geheimen Render Deploy Hook fuer genau den getesteten Commit auf. Anschliessend wartet GitHub, bis `/api/health` genau diesen Commit als live meldet. GitHub benoetigt dafuer das Repository Secret `RENDER_DEPLOY_HOOK_URL`.

## E-Mail-Hinweise

Ohne SMTP-Konfiguration bleibt die App normal nutzbar; es werden lediglich keine E-Mails versendet. Fuer den Versand dienen:

Im laufenden Zeitfenster meldet `Freigeben`, dass ein Raum oder Geraet vor dem gebuchten Ende wieder frei ist. Vor Slotbeginn bietet `Absagen & informieren` den vollstaendigen Termin wieder an und benachrichtigt Personen mit aktivierten Hinweisen. `Nur loeschen` bleibt in beiden Faellen die stille Variante ohne Nachricht. Nach Slotende wird keine Benachrichtigung mehr ausgeloest; abgelaufene Hinweise werden nicht mehr angezeigt.

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
