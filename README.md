# Waschraum-App

Web-App zur Verwaltung von Buchungen fuer Waschmaschinen und Trockenraeume.

## Lokal starten

```bash
npm install
npm start
```

Die App laeuft standardmaessig auf:

```text
http://localhost:3000
```

## Lokaler Schnelltest

Wenn der Server laeuft:

```bash
npm run health
npm run bookings
```

Oder im Browser oeffnen:

```text
http://localhost:3000
```

## Wichtige Pfade

- Backend: `server.js`
- Frontend: `public/`
- Lokale SQLite-Datenbank: `data/washraum.sqlite`
- Render SQLite-Pfad: `/var/data/washraum.sqlite`
- Projektregeln fuer Codex: `AGENTS.md`
- Ressourcen-Konfiguration aktuell in `server.js`

## Test-Login

- Admin: `admin` / `admin123`
- Nutzer: `user` / `user123`

Die Login-Daten werden beim ersten Start in SQLite angelegt. Die Passwoerter sind gehasht gespeichert.
Admins koennen im Buchungsformular optional einen anderen Namen eintragen.
Admins koennen ausserdem Nutzer anlegen und bestehende Nutzer bearbeiten.

## Render

Die Datei `render.yaml` enthaelt eine Web-Service-Konfiguration mit persistentem Disk-Mount:

```text
/var/data
```

Die Produktionsdatenbank soll dort liegen:

```text
/var/data/washraum.sqlite
```
