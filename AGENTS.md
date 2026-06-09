# AGENTS.md - Waschmaschinen- und Trockenraum-App

## Projektkontext

Dieses Projekt ist eine Web-App zur Verwaltung von Buchungen fuer Waschmaschinen, Trockenraeume und Tumbler.

Ziel der App ist eine uebersichtliche, stabile und alltagstaugliche Buchungsverwaltung. Buchungsregeln sind zentrale Fachlogik und duerfen bei Aenderungen nicht nebenbei entfernt oder geschwaecht werden.

## Wichtige Funktionen

- Login bzw. Startseite
- Anzeige bestehender Buchungen
- Buchung von Waschmaschinen
- Buchung von Trockenraeumen
- Buchung von Tumblern
- Loeschen eigener Buchungen
- Admin-Funktion zum Hinzufuegen und Loeschen von Buchungen
- Admin-Funktion zum Aktivieren und Deaktivieren von Nutzern
- Admin-Funktion zum Pflegen von Sperrtagen und Feiertagen
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
- `GET /api/admin/blocked-dates`
- `POST /api/admin/blocked-dates`
- `DELETE /api/admin/blocked-dates/:date`
- `POST /api/bookings`
- `POST /api/admin/addBooking`
- `POST /api/user/deleteBooking`

Bestehende Routen nicht umbenennen oder entfernen, ohne vorher alle Frontend-Aufrufe zu pruefen.

## Buchungsregeln

Die wichtigste Regel lautet:

`Bitte nur 1 x im Voraus eintragen! Eintragen -> Waschen -> Eintragen!`

Das bedeutet:

- Die analogen Ressourcen sind `WM 1` bis `WM 3`, `Trockenraum 1` bis `Trockenraum 3` und `Tumbler 1` bis `Tumbler 2`.
- Alle Ressourcen verwenden die Slots `07:00-12:00`, `12:00-17:00` und `17:00-21:00`.
- Die Voraus-Regel gilt pro Vorgang: Waschen, Trockenraum und Tumbler werden getrennt bewertet.
- Pro Person und Kalendertag sind maximal drei Waschmaschinen-Buchungen erlaubt.
- Pro Person ist maximal eine offene zukuenftige Trockenraum-Buchung erlaubt.
- Pro Person ist maximal eine offene zukuenftige Tumbler-Buchung erlaubt.
- Keine Buchungen am Sonntag.
- Manuell gepflegte Feiertage/Sperrtage sind nicht buchbar.
- Eine Buchung muss eindeutig einer Waschmaschine, einem Trockenraum oder einem Tumbler zugeordnet sein.
- Bereits belegte Zeitraeume duerfen fuer dieselbe Ressource nicht doppelt gebucht werden.
- Gleicher Tag und gleicher Slot auf einer anderen Ressource ist erlaubt, sofern die Nutzerregel nicht verletzt wird.
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
