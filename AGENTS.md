# AGENTS.md - Waschmaschinen- und Trockenraum-App

## Projektkontext

Dieses Projekt ist eine Web-App zur Verwaltung von Buchungen fuer Waschmaschinen und Trockenraeume.

Ziel der App ist eine uebersichtliche, stabile und alltagstaugliche Buchungsverwaltung. Buchungsregeln sind zentrale Fachlogik und duerfen bei Aenderungen nicht nebenbei entfernt oder geschwaecht werden.

## Wichtige Funktionen

- Login bzw. Startseite
- Anzeige bestehender Buchungen
- Buchung von Waschmaschinen
- Buchung von Trockenraeumen
- Loeschen eigener Buchungen
- Admin-Funktion zum Hinzufuegen und Loeschen von Buchungen
- Admin-Funktion zum Aktivieren und Deaktivieren von Nutzern
- Persistenz der Buchungsdaten per SQLite
- Render-Deployment mit persistentem Disk-Pfad

## Wichtige API-Routen

- `GET /api/health`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/session`
- `GET /api/resources`
- `GET /api/bookings`
- `POST /api/me/password`
- `POST /api/dev/cleanup` (nur lokal, nicht in Produktion)
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `POST /api/bookings`
- `POST /api/admin/addBooking`
- `POST /api/user/deleteBooking`

Bestehende Routen nicht umbenennen oder entfernen, ohne vorher alle Frontend-Aufrufe zu pruefen.

## Buchungsregeln

Die wichtigste Regel lautet:

`Bitte nur 1 x im Voraus eintragen! Eintragen -> Waschen -> Eintragen!`

Das bedeutet:

- Eine Person darf nur eine offene zukuenftige Buchung haben.
- Erst nach Ablauf der Buchung darf erneut gebucht werden.
- Keine Buchungen am Sonntag.
- Eine Buchung muss eindeutig einer Waschmaschine oder einem Trockenraum zugeordnet sein.
- Bereits belegte Zeitraeume duerfen fuer dieselbe Ressource nicht doppelt gebucht werden.
- Buchungen in der Vergangenheit sind nicht erlaubt.
- Kalender-/Listenanzeige muss mit den gespeicherten Daten uebereinstimmen.

## Arbeitsweise

- Vor Aenderungen zuerst betroffene Dateien vollstaendig lesen.
- Keine Funktionen entfernen, nur weil sie gerade nicht relevant wirken.
- Keine grossen Refactorings ohne konkreten Nutzen.
- Bestehende IDs, Variablennamen und Routen nur aendern, wenn die Abhaengigkeiten klar sind.
- Fehlerbehebung vor Optimierung.
- Nach Aenderungen lokal pruefen, soweit moeglich.

## Render-Hinweise

- Render nutzt `PORT` aus der Umgebung.
- SQLite liegt in Produktion unter `/var/data/washraum.sqlite`.
- `render.yaml` definiert dafuer eine persistente Disk.
- Bei Render-Problemen zuerst Logs, Startkommando, Port und SQLite-Pfad pruefen.
