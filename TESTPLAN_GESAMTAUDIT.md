# WaschZeit Gesamtaudit

Stand: 19. Juli 2026

Dieser Testplan prueft die App in einer isolierten lokalen Umgebung. Jeder Lauf verwendet eine eigene SQLite-Datei und veraendert keine Produktionsdaten. Externe Live-Dienste wie Render, echtes SMTP, Betriebssystem-Push und App-Installation werden zusaetzlich manuell abgenommen.

## Ausfuehrung

```bash
npm run audit
npm run check
```

`npm run audit` zeigt jeden Teilbereich einzeln mit `PASS`, `FAIL` oder `SKIP`. `npm run check` bleibt das verbindliche Abschluss-Gate des Projekts.

## A. Sicherheit und Transport

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| SEC-01 | CSP, Frame-Schutz, MIME-Schutz, Referrer- und Berechtigungsrichtlinie | Alle Header sind gesetzt; API-Antworten sind `no-store` | `test:security` |
| SEC-02 | POST von fremder Origin, `cross-site` und kaputter Origin | Anfrage wird mit 403 abgelehnt | `test:security` |
| SEC-03 | JSON groesser als 32 KB | Anfrage wird mit 413 abgelehnt | `test:security` |
| SEC-04 | Produktionsmodus | HSTS sowie `Secure`, `HttpOnly` und `SameSite=Lax` am Sitzungscookie | `test:security` |
| SEC-05 | Abhaengigkeiten | Keine bekannte kritische produktive Schwachstelle | `npm audit --omit=dev` |
| SEC-06 | Datenschutzexport und Kontoloeschung | Nur eigene Daten; geschuetzte Admin- und letzte-Admin-Konten bleiben erhalten | `npm test`, `test:roles` |

## B. Anmeldung, Registrierung und Sitzungen

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| AUTH-01 | Gastzugriff auf Ressourcen, Export und Admin-API | 401 oder 403 | `test:security` |
| AUTH-02 | Unbekanntes Konto, falsches Passwort und SQL-artige Eingabe | Einheitliche Meldung ohne Kontoauskunft | `test:security` |
| AUTH-03 | Erfolgreicher Login | Neue Sitzungskennung und sichere Cookie-Attribute | `test:security` |
| AUTH-04 | Adminlogin | Technischer Kontoname bleibt fuer Notfallzugang nutzbar | `test:security` |
| AUTH-05 | Bewohnerlogin | Primaere E-Mail funktioniert ohne Beachtung der Grossschreibung; freier Name nicht | `test:security` |
| AUTH-06 | Zweite E-Mail | Beide Adressen melden dasselbe Wohnungskonto an | `test:security`, `npm test` |
| AUTH-07 | Geraetecode | Zehn Minuten gueltig, kontogebunden und nur einmal verwendbar | `test:security`, `npm test` |
| AUTH-08 | Passwortwechsel | Altes Passwort erforderlich; anderes Passwort; weitere Sitzungen enden | `test:security`, `npm test` |
| AUTH-09 | Passwort-Reset-Anfrage | Bekannte und unbekannte E-Mail erhalten dieselbe Antwort | `test:security` |
| AUTH-10 | Deaktiviertes Konto | Aktive Sitzungen verlieren Zugriff; erneuter Login liefert 403 | `test:security`, `npm test` |
| AUTH-11 | Inaktivitaet | Warnung vor Ablauf, Keepalive und serverseitige Abmeldung | `npm test`, `test:a11y` |
| RATE-01 | 21 falsche Logins derselben Identitaet | 429 mit `Retry-After` | `test:security` |
| RATE-02 | Wiederherstellungsversuche | Eigenes IP-Limit greift | `test:security` |
| RATE-03 | Registrierungsversuche | Eigenes IP-Limit greift | `test:security` |

## C. Wohnungskonto und Identitaet

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| REG-01 | Wohnung anlegen | Stabile Wohnungsbezeichnung, Klingelschildname und zufaelliger Code | `test:security`, `npm test` |
| REG-02 | Falsche E-Mail, schwaches Passwort, falscher Code | Klare 400/403-Antwort | `test:security` |
| REG-03 | Aktivierung | Code erzeugt genau ein gemeinsames Wohnungskonto und ist danach verbraucht | `test:security`, `npm test` |
| REG-04 | Klingelschildkorrektur | Bewohner beantragt; Admin entscheidet; sichtbarer Name aendert sich nicht direkt | `npm test`, `test:roles` |
| REG-05 | Doppelkonten zusammenfuehren | Buchungen, Push und zweite E-Mail gehen kontrolliert an das Zielkonto | `npm test` |
| REG-06 | Umzug | Nur Superadmin; keine kommenden Buchungen; Rolle wird Bewohner | `npm test`, `test:roles` |

## D. Rollen und Hausgrenzen

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| ROLE-01 | Bewohner gegen alle Adminrouten | Zugriff verweigert | `test:security`, `test:roles` |
| ROLE-02 | Haus-Admin | Verwaltung nur im eigenen Haus | `test:roles` |
| ROLE-03 | Gleichrangige Admins | Keine Deaktivierung oder Reset untereinander | `test:roles` |
| ROLE-04 | Superadmin | Hauswechsel, globale Sicherung, Wartung und Rollenwechsel | `test:roles` |
| ROLE-05 | Superadmin-Uebergabe | Nur an aktiven Haus-Admin, altes Konto verliert globale Rechte | `test:roles` |
| ROLE-06 | Notfallwiederherstellung | Seed-Admin wird kontrolliert reaktiviert; Passwort nur mit Break-Glass-Schalter ersetzt | `test:roles` |
| ROLE-07 | Fremdhausdaten | Bewohner und Haus-Admin sehen und aendern keine fremden Konten, Meldungen oder Buchungen | `test:roles`, `test:year` |

## E. Buchungen und Regelwerk

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| BOOK-01 | Vergangenheit und Sonntag | Nicht buchbar und nicht als frei angeboten | `npm test` |
| BOOK-02 | Waschmaschinen | Eine Waschsequenz im Voraus; mehrere Maschinen nur gleicher Slot | `npm test`, `test:year` |
| BOOK-03 | Tumbler | Nur im Waschslot; mindestens ein Tumbler bleibt frei | `npm test`, `test:year` |
| BOOK-04 | Trockenraum | Nur ein Raum gleichzeitig; erlaubtes zusammenhaengendes Trocknungsfenster | `npm test`, `test:year` |
| BOOK-05 | Waschpaket | Atomare Buchung; bei Konflikt wird nichts teilweise gespeichert | `npm test` |
| BOOK-06 | Fremde Buchung | Bewohner kann sie weder loeschen noch erweitern | `npm test` |
| BOOK-07 | Freigabe und Absage | Zeitfenster, Mitteilung, Push-/Mailfilter und neutraler Text stimmen | `npm test` |
| BOOK-08 | Monats-/Wochenkalender | API-Daten, Tagesdetails und eigene Buchungen stimmen ueberein | `npm test`, `test:e2e` |
| BOOK-09 | Dauertermine | Normale Buchung wird blockiert; Tumblerreserve bleibt bestehen | `npm test`, `test:roles` |
| BOOK-10 | Parallelzugriff | Eindeutige Ressourcenbelegung ohne Teilbuchung | `npm test`, `test:year` |

## F. Stoerungen und Maschinentagebuch

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| LOG-01 | Bewohnermeldung | Ressource, Titel und Beobachtung werden unveraenderbar erfasst | `npm test`, `test:roles` |
| LOG-02 | Doppelte Meldung | Wird dem offenen Fall angehaengt statt zweiter Parallelfall | `npm test` |
| LOG-03 | Sperre | Ressource verschwindet aus Buchbarkeit; Grund und Admin werden protokolliert | `npm test`, `test:roles` |
| LOG-04 | Reparatur | Sachliche Pflichtnotiz und Statusfolge | `npm test`, `test:roles` |
| LOG-05 | Funktionspruefung | Fehlgeschlagen bleibt gesperrt; erfolgreich erlaubt Freigabe | `npm test`, `test:roles` |
| LOG-06 | Freigabe | Nur nach erfolgreicher Pruefung und mit Abschlussnotiz | `npm test`, `test:roles` |
| LOG-07 | Unveraenderbarkeit | Keine Loeschroute; alte Chronik bleibt erhalten | `npm test` |
| LOG-08 | Suche und Hausgrenze | Haus-Admin nur eigenes Haus, Superadmin alle Haeuser | `test:roles` |

## G. Benachrichtigungen, PWA und Bedienung

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| NOT-01 | Lokales SMTP | Bestaetigung, Reset, Admin-Reset und Freigabe-Mail werden zugestellt | `npm test` |
| NOT-02 | Push-Abo | Anlegen, gezielter Test, Deaktivierung und ungueltiges Geraet | `npm test` |
| NOT-03 | Freigabe-Mitteilung | Person, Ressource, Datum, Slot und direkte Buchungsfrage | `npm test` |
| PWA-01 | Manifest und Service Worker | Installierbar, Update erst nach Zustimmung, Push-Klick oeffnet Ziel | `test:a11y`, `npm test` |
| UI-01 | Tastatur, Fokus, Dialoge und Untertitel | Zugaengliche Namen, Fokusstatus und reduzierte Bewegung | `test:a11y`, `test:e2e` |
| UI-02 | Mobile und Desktop | Keine Ueberlagerung, lesbare Kalender- und Verwaltungsansicht | Manueller Browsertest |

## H. Betrieb, Daten und Belastung

| ID | Pruefung | Soll-Ergebnis | Automatisierung |
| --- | --- | --- | --- |
| OPS-01 | SQLite-Backup | Datei ist gueltig; Integritaetspruefung erfolgreich | `npm test`, `test:roles` |
| OPS-02 | Wartungsmodus | Backup vor Start, Schreibsperre, Datenbank- und Buchungstest vor Ende | `npm test`, `test:roles` |
| OPS-03 | Auditprotokoll | Kritische Adminaktionen sind mit Haus und Ausloeser nachvollziehbar | `npm test`, `test:roles` |
| OPS-04 | Auswertung | Zeitraum, Ressourcen, Slots und gesperrte Ressourcen korrekt | `npm test` |
| OPS-05 | Mehrhaus-Jahr | 100 Personen, sechs Haeuser, 52 Wochen und 5.200 Waschpakete ohne Kollision | `test:year` |
| OPS-06 | Produktion | `/api/health`, persistenter Pfad, Revision, SMTP, Push und externes Backup | Manueller Live-Test |

## Manuelle Live-Abnahme

1. Render-Revision mit dem erwarteten Git-Commit vergleichen.
2. Mit einem echten Bewohnerkonto anmelden, buchen, Monatsplan pruefen und wieder loeschen.
3. Bewohnermeldung erzeugen und als Haus-Admin Sperre, Reparatur, Pruefung und Freigabe abschliessen.
4. Testpush an ein installiertes Handy senden und App aus der geschlossenen Benachrichtigung oeffnen.
5. Testmail an die gespeicherte Admin-Adresse senden, Adresse bestaetigen und Passwort-Reset vollstaendig durchlaufen.
6. Backup herunterladen, Integritaet pruefen und externe Kopie bestaetigen.
7. App auf iPhone und Android installieren sowie Updatehinweis pruefen.
