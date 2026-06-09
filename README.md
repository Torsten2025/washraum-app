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
npm run verify
npm run smoke
npm run test:full
npm run test:created-features
npm run hosting:check
npm run pilot:check
npm run publish:check
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
Admins koennen pro Nutzer einen Anzeigenamen und eine Partei-/Wohnungsbezeichnung pflegen, z. B. `Partei 12`.
Admins koennen Sperrtage und Feiertage pflegen.
Admins koennen im Bereich "Betrieb" ein SQLite-Backup herunterladen.
Angemeldete Nutzer koennen ihr eigenes Passwort aendern.
Buchungen in der Vergangenheit werden serverseitig blockiert.
Alle Ressourcen werden ueber feste Slots gebucht: `07:00-12:00`, `12:00-17:00`, `17:00-21:00`.
Standardressourcen: 3 Waschmaschinen, 3 Trockenraeume und 3 Tumbler.
Sonntage und manuell gepflegte Sperrtage sind nicht buchbar.
Die App zeigt eine Aktivitaetsleiste fuer neue Buchungen, geloeschte Buchungen und erfolgreich frueher frei gemeldete Slots.
Frueher frei gemeldete Slots bleiben nachvollziehbar, werden aber in der Verfuegbarkeit als wieder nutzbar markiert.
Wenn Waesche nach einem Slot noch haengt, kann direkt an der Buchung ein neutraler Hinweis in der Aktivitaetsleiste erstellt werden.
Der Monatsplan bildet den analogen Aushang digital ab: je Ressource eine Monatstabelle mit den drei festen Zeitfenstern und markierten Sperrtagen.
Eigene Buchungen koennen ueber "Frueher frei melden" per WhatsApp API an eine hinterlegte Nummer gemeldet werden.
Admins sehen im Bereich "Pilotstart" eine Vorbereitungsliste und eine Kurzanleitung fuer die erste Testrunde.
Bewohnerinnen und Bewohner sehen in der App den Bereich "Hilfe" mit kurzer Buchungsanleitung, Regeln und Test-Guide.
Testpersonen koennen im Bereich "Pilot-Feedback" direkt Rueckmeldungen hinterlassen; Admins sehen alle Rueckmeldungen gesammelt im Pilotstart-Bereich.

Die Start-Logins koennen vor dem ersten Start einer neuen Datenbank ueber Umgebungsvariablen angepasst werden:

- `SEED_ADMIN_NAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_NAME`
- `SEED_USER_PASSWORD`

Der Smoke-Test raeumt seine eigenen Testdaten lokal ueber `/api/dev/cleanup` wieder auf. Diese Route ist in Produktion deaktiviert.

## WhatsApp-Versand

Die App kann eine "frueher frei"-Nachricht serverseitig ueber die WhatsApp Cloud API versenden. Im Pilot laeuft der Versand im Testmodus an eine einzelne Testnummer. Fuer spaeter kann per Umgebungsschalter auf ein separates Produktivziel umgestellt werden.

- `WHATSAPP_ACCESS_TOKEN`: Meta/WhatsApp Cloud API Access Token
- `WHATSAPP_PHONE_NUMBER_ID`: Phone Number ID des WhatsApp-Business-Absenders
- `WHATSAPP_RELEASE_MODE`: `test` fuer Pilot, spaeter `production`
- `WHATSAPP_TEST_TO`: Testnummer im internationalen Format, z. B. `4178...`
- `WHATSAPP_PRODUCTION_TO`: spaeteres Produktivziel, falls die WhatsApp-Loesung dafuer bereit ist
- `WHATSAPP_API_VERSION`: optional, Standard `v20.0`

Ohne `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` und eine Zielnummer fuer den aktiven Modus bleibt der Button sichtbar, meldet aber "WhatsApp-Versand ist noch nicht konfiguriert". Im Adminbereich "Betrieb" wird der aktuelle WhatsApp-Modus mit maskiertem Ziel angezeigt.

Hinweis: Freitext-Nachrichten ueber die WhatsApp Business Platform funktionieren nur innerhalb der von WhatsApp erlaubten Messaging-Regeln. Fuer business-initiierte Nachrichten ausserhalb des erlaubten Fensters kann eine von Meta freigegebene Nachrichtenvorlage notwendig sein. Direkte Nachrichten in normale private WhatsApp-Gruppen sind mit der offiziellen Cloud API nicht der einfache Standardweg; fuer den Pilot wird deshalb an eine einzelne Testnummer gesendet.

### Meta-Daten finden

1. Meta for Developers oeffnen und eine Business-App erstellen.
2. Produkt "WhatsApp" zur App hinzufuegen.
3. Unter "WhatsApp" -> "API Setup" stehen:
   - Temporary access token fuer erste Tests
   - Phone Number ID
   - WhatsApp Business Account ID
4. Die eigene Test-Empfaengernummer im API-Setup als Recipient/To hinzufuegen und bestaetigen.
5. In Render setzen:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_RELEASE_MODE=test`
   - `WHATSAPP_TEST_TO`
6. Nach dem Speichern in Render im Adminbereich "Betrieb" auf "WhatsApp testen" klicken.

Fuer laengeren Betrieb sollte statt des temporaeren Tokens ein dauerhaftes System-User-Token mit `whatsapp_business_messaging` genutzt werden.

## Livegang-Checkliste

- Lokalen Smoke-Test ausfuehren: `npm run smoke`
- Lokalen Verify-Check ausfuehren: `npm run verify`
- Pilot-Readiness gegen Render pruefen: `npm run pilot:check`
- Hosting-Vorcheck ausfuehren: `npm run hosting:check`
- Code in ein Git-Repository pushen, das Render verbinden kann
- Nach dem Einrichten des Git-Remotes `npm run publish:check` ausfuehren
- GitHub Actions CI muss nach dem Push gruen sein
- Lokale Testdaten pruefen und vor Livegang bei Bedarf aus SQLite loeschen
- In Render `SEED_ADMIN_PASSWORD` und `SEED_USER_PASSWORD` als sichere Secret-Werte setzen
- In Render bei Bedarf `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_RELEASE_MODE=test` und `WHATSAPP_TEST_TO` setzen
- Nach dem ersten produktiven Start sofort mit dem Admin anmelden und Passwort aendern
- Nutzerkonten fuer echte Bewohnerinnen und Bewohner anlegen
- Sperrtage/Feiertage im Admin-Bereich kontrollieren und ergaenzen
- `/api/health` pruefen: `sqlitePath` muss `/var/data/washraum.sqlite` sein
- Eine Testbuchung erstellen, Render-Service neu starten und Persistenz pruefen
- Nach dem Deploy ausfuehren: `APP_URL=https://deine-render-url ADMIN_PASSWORD=... npm run production:check`

## Pilotstart mit Bewohnern

Empfohlener Ablauf fuer die erste Testrunde:

- Mit 3 bis 5 Personen starten, nicht sofort mit allen 20 Parteien
- In der Nutzerverwaltung echte Anzeigenamen fuer die Pilotpersonen eintragen
- Partei-/Wohnungsbezeichnung zusaetzlich setzen, z. B. `Partei 04`
- Vor dem Einladen im Bereich "Betrieb" ein Backup herunterladen
- Im Bereich "Pilotstart" die Checkliste pruefen und den Einladungstext kopieren oder drucken
- Jede Testperson prueft Login, freie Buchung, Monatsplan, Loeschen eigener Buchungen und Protokolltagebuch
- Jede Testperson hinterlaesst mindestens eine Rueckmeldung ueber "Pilot-Feedback", auch wenn nur "alles klar" gemeldet wird
- Nach 5 bis 7 Tagen Feedback sammeln und dann erst alle Parteien freischalten

Der Pilot-Check mutiert keine Produktionsdaten:

```bash
npm run pilot:check
```

Mit Admin-Backup-Pruefung:

```bash
APP_URL=https://washraum-app.onrender.com ADMIN_PASSWORD=dein-admin-passwort npm run pilot:check
```

## Erstellte Funktionen testen

Der zentrale Funktionskatalog mit Gesamttest laeuft ueber:

```bash
npm run test:created-features
```

Der Test listet die erstellten Funktionen, fuehrt `verify`, `smoke`, `test:20-parties` und `test:full` aus und prueft zusaetzlich UI-Marker sowie die Live-Readiness.

## GitHub-Push vorbereiten

Dieses lokale Repository hat erst dann einen Remote, wenn ein GitHub-Repository verbunden wurde.

```bash
git remote add origin https://github.com/DEIN-NAME/washraum-app.git
git push -u origin master
npm run publish:check
```

Falls dein GitHub-Standardbranch `main` heissen soll:

```bash
git branch -M main
git push -u origin main
```

## Render

Empfohlene Reihenfolge:

1. GitHub-Repository erstellen und diesen Ordner pushen.
2. In Render "New Blueprint" oder "New Web Service" mit dem GitHub-Repo verbinden.
3. Wenn Render `render.yaml` erkennt, die vorgeschlagenen Werte uebernehmen.
4. `SEED_ADMIN_PASSWORD` und `SEED_USER_PASSWORD` als Secret-Werte setzen.
5. Deploy starten und danach `npm run production:check` mit der Render-URL ausfuehren.

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

Wenn die Produktionsdatenbank noch leer ist und diese Passwoerter fehlen, startet der Server absichtlich nicht. Lokal gibt es weiterhin die Test-Fallbacks aus dem Abschnitt "Test-Login".

Nach dem Deploy kann die Live-App ohne Testdatenmutation geprueft werden:

```bash
APP_URL=https://deine-render-url ADMIN_PASSWORD=dein-admin-passwort npm run production:check
```

Der lokale Smoke-Test ist nicht fuer Produktion gedacht, weil er Testbuchungen und Testnutzer anlegt.

## Backup

SQLite liegt auf dem persistenten Render-Disk-Mount. Fuer den Betrieb gilt:

- Vor groesseren Aenderungen Render-Disk bzw. SQLite-Datei sichern
- Alternativ im Admin-Bereich "Betrieb" ein SQLite-Backup herunterladen
- Nach Deployments `/api/health` und eine vorhandene Buchung kontrollieren
- Keine lokalen Testdaten ungeprueft als Produktionsdaten uebernehmen
