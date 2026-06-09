# Waschraum-App

Web-App zur Verwaltung von Buchungen fuer Waschmaschinen, Trockenraeume und Tumbler.

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
npm run smoke
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
- Ressourcen-, Slot- und Sperrtage-Konfiguration aktuell in `server.js`

## Test-Login

- Admin: `admin` / `admin123`
- Nutzer: `user` / `user123`

Die Login-Daten werden beim ersten Start in SQLite angelegt. Die Passwoerter sind gehasht gespeichert.
Admins koennen im Buchungsformular optional einen anderen Namen eintragen.
Admins koennen ausserdem Nutzer anlegen und bestehende Nutzer bearbeiten.
Admins koennen Nutzer deaktivieren, ohne deren Buchungshistorie zu loeschen.
Admins koennen Sperrtage und Feiertage pflegen.
Angemeldete Nutzer koennen ihr eigenes Passwort aendern.
Buchungen in der Vergangenheit werden serverseitig blockiert.
Alle Ressourcen werden ueber feste Slots gebucht: `07:00-12:00`, `12:00-17:00`, `17:00-21:00`.
Sonntage und manuell gepflegte Sperrtage sind nicht buchbar.

Die Start-Logins koennen vor dem ersten Start einer neuen Datenbank ueber Umgebungsvariablen angepasst werden:

- `SEED_ADMIN_NAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_NAME`
- `SEED_USER_PASSWORD`

Der Smoke-Test raeumt seine eigenen Testdaten lokal ueber `/api/dev/cleanup` wieder auf. Diese Route ist in Produktion deaktiviert.

## Livegang-Checkliste

- Lokalen Smoke-Test ausfuehren: `npm run smoke`
- Lokale Testdaten pruefen und vor Livegang bei Bedarf aus SQLite loeschen
- In Render `SEED_ADMIN_PASSWORD` und `SEED_USER_PASSWORD` als sichere Secret-Werte setzen
- Nach dem ersten produktiven Start sofort mit dem Admin anmelden und Passwort aendern
- Nutzerkonten fuer echte Bewohnerinnen und Bewohner anlegen
- Sperrtage/Feiertage im Admin-Bereich kontrollieren und ergaenzen
- `/api/health` pruefen: `sqlitePath` muss `/var/data/washraum.sqlite` sein
- Eine Testbuchung erstellen, Render-Service neu starten und Persistenz pruefen

## Render

Die Datei `render.yaml` enthaelt eine Web-Service-Konfiguration mit persistentem Disk-Mount:

```text
/var/data
```

Die Produktionsdatenbank soll dort liegen:

```text
/var/data/washraum.sqlite
```

Die Seed-Passwoerter werden nicht im Repository gespeichert. Sie muessen in Render als Secret-Umgebungsvariablen gesetzt werden:

- `SEED_ADMIN_PASSWORD`
- `SEED_USER_PASSWORD`

## Backup

SQLite liegt auf dem persistenten Render-Disk-Mount. Fuer den Betrieb gilt:

- Vor groesseren Aenderungen Render-Disk bzw. SQLite-Datei sichern
- Nach Deployments `/api/health` und eine vorhandene Buchung kontrollieren
- Keine lokalen Testdaten ungeprueft als Produktionsdaten uebernehmen
