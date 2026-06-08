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

## Demo-Login

- Nutzer: beliebiger Name
- Rolle: Nutzer oder Admin im Login auswaehlen

Die Demo-Login-Logik ist bewusst einfach gehalten und sollte vor echtem Betrieb gehaertet werden.

## Render

Die Datei `render.yaml` enthaelt eine Web-Service-Konfiguration mit persistentem Disk-Mount:

```text
/var/data
```

Die Produktionsdatenbank soll dort liegen:

```text
/var/data/washraum.sqlite
```
