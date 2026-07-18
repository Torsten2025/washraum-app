# WaschZeit-Handbuch

Stand: 18. Juli 2026

Dieses Dokument ist die gemeinsame Funktionsuebersicht, Bedienungsanleitung und technische Referenz der WaschZeit-App. Es richtet sich an Bewohner, Haus-Admins, Superadmins und Personen, die die Software weiterentwickeln.

## Dokument pflegen

Bei jeder Aenderung an Funktionen, Rollen, Bedienwegen, Regeln, E-Mails, Daten oder Betrieb gilt:

1. Den betroffenen Abschnitt dieses Handbuchs aktualisieren.
2. Die Rollen- und Funktionsmatrix pruefen.
3. Passende automatische Tests aktualisieren oder ergaenzen.
4. Die Aenderung unten im Aenderungsprotokoll festhalten.

Eine Funktionsaenderung ist erst abgeschlossen, wenn Code, Tests und Handbuch denselben Stand beschreiben.

## Schnellstart fuer Bewohner

1. Auf der Anmeldeseite `Neu hier` waehlen.
2. Benutzername, E-Mail, Passwort und den Hauscode eingeben. Den Hauscode gibt der Haus-Admin weiter; er ordnet das Konto dem richtigen Haus zu.
3. Nach der Anmeldung unter `Buchen` zuerst im Wochen- oder Monatskalender einen freien Waschtag waehlen. Der persoenliche Vorschlag ist im passenden Tag markiert.
4. Im gefuehrten Ablauf zuerst eine bis drei freie Waschmaschinen im gleichen Slot waehlen, danach Trockenraum und Tumbler bei Bedarf ergaenzen und das Paket pruefen.
5. Unter `Meine Buchungen` Termine pruefen, vor Beginn absagen oder waehrend des laufenden Slots frueher freigeben.
6. Oben rechts mit `Abmelden` die Sitzung sicher beenden.

Einzelne Maschinen oder Raeume koennen weiterhin im nachgeordneten Bereich `Einzelnes Geraet separat buchen` reserviert werden. Fuer einen vollstaendigen Waschtag ist der gefuehrte Ablauf der schnellste Weg.

## Rollen

| Rolle | Geltungsbereich | Verwaltungsrechte |
| --- | --- | --- |
| Bewohner | Eigenes Konto und zugeordnetes Haus | Eigene Buchungen, Hinweise und Kontodaten |
| Haus-Admin | Eigenes Haus | Bewohner, Hauscode, Geraete, Dauertermine und Buchungen des Hauses |
| Superadmin | Alle Haeuser | Alle Haus-Admin-Rechte plus Haeuser, Rollen, Umzuege und Backups |

Ein Superadmin arbeitet immer im aktuell ausgewaehlten Haus. Der Hausumschalter in der Kopfzeile legt fest, auf welches Haus sich Kalender und Verwaltung beziehen.

Das konfigurierte Start-Admin-Konto ist der Superadmin. Beim Start stellt die App sicher, dass dieses Konto aktiv ist und die Adminrolle besitzt. In einer aelteren Datenbank ohne Superadmin wird der erste vorhandene Admin einmalig zum Superadmin hochgestuft.

## Seite: Anmeldung (`/login.html`)

| Bereich | Funktion | Zugang |
| --- | --- | --- |
| Landingpage | WaschZeit-Wortmarke, Kurzuebersicht und direkter Einstieg | Oeffentlich |
| Anmelden | Anmeldung mit Benutzername oder E-Mail und Passwort | Oeffentlich |
| Neu hier | Konto mit Benutzername, E-Mail, Passwort und Hauscode erstellen | Oeffentlich |
| Freigabe-Hinweise | E-Mail-Hinweise bei der Registrierung ein- oder ausschalten | Oeffentlich |
| Passwort vergessen | Sicheren Wiederherstellungslink anfordern | Oeffentlich |
| Rueckmeldung | Bestaetigte E-Mail, ungueltiger Link oder erfolgreiche Abmeldung anzeigen | Oeffentlich |
| Datenschutz | Zur Datenschutzerklaerung wechseln | Oeffentlich |

Der Hauscode ist kein persoenliches Passwort. Er sorgt dafuer, dass neue Konten nur dem richtigen Haus beitreten. Haus-Admins und Superadmins koennen ihn in der Verwaltung aendern.

## Seite: Neues Passwort (`/reset.html`)

| Bereich | Funktion | Zugang |
| --- | --- | --- |
| Passwortformular | Neues Passwort zweimal eingeben | Link mit gueltigem Token |
| Tokenpruefung | Abgelaufene oder bereits verwendete Links ablehnen | Automatisch |
| Abschluss | Zur Anmeldung zurueckkehren | Oeffentlich |

## Seite: Datenschutz (`/privacy.html`)

| Bereich | Funktion | Zugang |
| --- | --- | --- |
| Gespeicherte Daten | Kontodaten, Buchungen und technische Daten benennen | Oeffentlich |
| Verwendungszweck | Buchung, Hauszuordnung und Benachrichtigungen erklaeren | Oeffentlich |
| Aufbewahrung | Fristen und Schutzmassnahmen nennen | Oeffentlich |
| Eigene Rechte | Export, Korrektur und Loeschung erklaeren | Oeffentlich |

## Seite: Waschplan (`/index.html`)

### Kopfzeile

| Funktion | Bewohner | Haus-Admin | Superadmin |
| --- | :---: | :---: | :---: |
| Angemeldete Person, Rolle und Haus anzeigen | Ja | Ja | Ja |
| Zwischen `Buchen` und `Verwalten` wechseln | Nein | Ja | Ja |
| Aktives Haus wechseln | Nein | Nein | Ja |
| Sicher abmelden | Ja | Ja | Ja |

`Abmelden` steht als kontrastreicher, dunkelgruener Button oben rechts in der Kopfzeile. Er sendet ein eigenes Abmeldeformular an den Server. Die Sitzung wird dort geloescht, das Cookie entfernt und anschliessend die Anmeldeseite mit einer Abmeldebestaetigung geoeffnet.

Die App tritt unter dem Namen `WaschZeit` auf. In der angemeldeten Ansicht steht die vollstaendige Adresse des aktiven Hauses dauerhaft direkt unter der Wortmarke und wird beim Hauswechsel sofort aktualisiert. Auf oeffentlichen Seiten ohne bekannte Hauszuordnung erscheint stattdessen `Der Waschplan fuer dein Haus`.

### Meine Buchungen

| Funktion | Beschreibung |
| --- | --- |
| Kommende Termine | Eigene Einzelbuchungen und Waschpakete gruppiert anzeigen |
| Frueher frei | Nur waehrend des laufenden Slots freigeben und passende Hinweise ausloesen |
| Absagen und informieren | Vor Slotbeginn loeschen und den Termin wieder anbieten |
| Paket absagen | Alle noch nicht begonnenen Bestandteile gemeinsam freigeben |
| Loeschen | Eigene Buchung oder das gesamte eigene Paket ohne Hinweis entfernen |

### Buchen

| Funktion | Beschreibung |
| --- | --- |
| Kalender zuerst | Direkt nach den eigenen Buchungen freie Waschzeiten in der Wochen- oder Monatsansicht ueberblicken |
| Persoenlicher Vorschlag | Passenden freien Waschslot im Kalender markieren und mit `Termin auswaehlen` oeffnen |
| Schritt 1: Waschmaschine | Nur freie Waschmaschinen nach Zeitfenster anzeigen und eine bis drei Maschinen im gleichen Slot auswaehlen |
| Schritt 2: Trockenraum | Erst nach der Waschmaschinenwahl passende freie Trockenraeume und die erlaubten Trocknungsdauern anzeigen |
| Schritt 3: Tumbler | Danach regelkonform verfuegbare Tumbler anzeigen; mindestens ein Tumbler bleibt frei |
| Schritt 4: Pruefen | Datum, Waschmaschinen, Trockenraum und Tumbler vor der gemeinsamen Buchung zusammenfassen |
| Paket ergaenzen | Eine bereits gebuchte eigene Waschmaschine erkennen und passende Trocknungsoptionen nachtraeglich ergaenzen |
| Optionale Trocknung | Trockenraum und Tumbler koennen in ihren Schritten bewusst ausgelassen werden |
| Wochenansicht | Sieben Tage mit freier Kapazitaet und eigenen Terminen kompakt anzeigen |
| Monatsansicht | Einen vollstaendigen Monat im festen Sechs-Wochen-Raster ueberblicken und einen Tag direkt auswaehlen |
| Ansicht merken | Zuletzt verwendete Wochen- oder Monatsansicht lokal im Browser speichern |
| Drei Statusstreifen | Pro Kalendertag Waschmaschinen, Trockenraeume und Tumbler getrennt anzeigen: gruen frei, gelb teilweise belegt, rot vollstaendig belegt, grau vergangen oder Ruhetag |
| Tagesdetails | Beim Ueberfahren, Tastaturfokus oder Antippen alle drei Slots mit freien, belegten und eigenen Geraeten anzeigen; fremde Namen bleiben verborgen |
| Direkt aus dem Kalender buchen | Eine freie Waschmaschine in den Tagesdetails auswaehlen und Datum, Slot sowie Geraet direkt in das Waschpaket uebernehmen |
| Kalendergroesse | Kalender auf 85, 100 oder 115 Prozent stellen; die Wahl wird lokal im Browser gespeichert |
| Datumsnavigation | Je nach Ansicht zur vorherigen oder naechsten Woche beziehungsweise zum vorherigen oder naechsten Monat wechseln |
| Ruhetage | Sonntage eindeutig als nicht buchbare Ruhetage anzeigen |
| Einzelbuchung | Nachgeordneten Bereich aufklappen und ein einzelnes Geraet weiterhin direkt buchen |
| Belegte Termine | Name der buchenden Person oder geschuetzten Dauertermin anzeigen |
| Admin-Korrektur | Haus-Admin und Superadmin koennen normale Buchungen im aktiven Haus loeschen |

Die App prueft die Buchungsregeln auf dem Server. Eine Anzeige im Browser allein kann die Regeln deshalb nicht umgehen.

### GBMZ-Buchungsregeln

- Pro Tag darf nur ein Waschslot reserviert werden. Innerhalb dieses Slots koennen mehrere Waschmaschinen genutzt werden.
- Der naechste Waschslot kann fruehestens am Tag eines bereits reservierten Waschslots gebucht werden.
- Am Ende des Waschslots muss mindestens ein Tumbler frei bleiben.
- Beim Waschslot `07:00-12:00` darf ein Trockenraum bis hoechstens `21:00` verwendet werden.
- Beim Waschslot `12:00-17:00` darf ein Trockenraum bis hoechstens `12:00` am Folgetag verwendet werden.
- Beim Waschslot `17:00-21:00` darf ein Trockenraum bis hoechstens `12:00` am Folgetag verwendet werden.
- Kuerzeres Trocknen und fruehes Freigeben verbessern die Verfuegbarkeit fuer alle.

### Meine Ansicht

| Bereich | Funktion |
| --- | --- |
| Wissen kompakt | Einfuehrung erneut oeffnen |
| Benachrichtigungen | E-Mail-Adresse und Freigabe-Hinweise verwalten |
| E-Mail-Bestaetigung | Bestaetigungsstatus anzeigen und Link erneut senden |
| Hinweisfilter | Bereich, Wochentag und Zeitfenster eingrenzen |
| Zugang und Sicherheit | Eigenes Passwort mit bisherigem Passwort aendern |
| Meine Daten | Eigene Daten und Buchungen als JSON exportieren |
| Konto loeschen | Eigenes Konto nach Passwortbestaetigung endgueltig entfernen |
| Freigaben und Absagen | Noch relevante wieder freie Termine anzeigen |
| Regeln | Aktuelle Reservierungsregeln nachlesen |
| Reinigung | Reinigungsaufgaben fuer Maschinen, Raeume und Boden nachlesen |

### Einfuehrung und Quiz

| Bereich | Funktion |
| --- | --- |
| Aufgezeichnetes Video | Rund fuenfminuetige Einfuehrung mit Sprecher abspielen |
| Untertitel | Synchronisierte deutsche Untertitel anbieten |
| Interaktive Einfuehrung | Aufbau, Waschpaket und Regeln kapitelweise zeigen und vorlesen |
| Steuerung | Wiedergabe, Stummschaltung, vor und zurueck bedienen |
| Quiz | Drei alltagsnahe Fragen mit freundlicher Rueckmeldung beantworten |

## Verwaltungsansicht

Nach `Verwalten` erscheint oben die eigene Adminrolle und ihr Geltungsbereich. Die Navigation teilt alle Aufgaben in fuenf klar getrennte Arbeitsbereiche. Auf kleinen Bildschirmen kann die Leiste seitlich gescrollt werden.

### 1. Ueberblick

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Aktive Nutzer des ausgewaehlten Hauses | Ja | Ja |
| Heutige Buchungen | Ja | Ja |
| Aktive Geraete und Raeume | Ja | Ja |
| Anzahl Dauertermine und Freigaben | Ja | Ja |
| E-Mail- und Backupstatus | Ja | Ja |

### 2. Haus und Geraete

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Hauscode des aktiven Hauses aendern | Ja | Ja |
| Geraet oder Raum anlegen | Ja | Ja |
| Ressource umbenennen | Ja | Ja |
| Ressource aktivieren oder deaktivieren | Ja | Ja |
| Neues Haus mit Standardressourcen anlegen | Nein | Ja |
| Haus anzeigen, umbenennen, aktivieren oder deaktivieren | Nein | Ja |

Ressourcen und Hauscodes sind immer auf das aktive Haus begrenzt. Ein Haus mit aktiven Konten oder kommenden Buchungen kann nicht deaktiviert werden.

### 3. Dauertermine

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geschuetzten woechentlichen Termin anlegen | Ja | Ja |
| Name, Ressource, Wochentag und Slot festlegen | Ja | Ja |
| Dauertermin entfernen | Ja | Ja |
| Ueberschreiben durch normale Buchung verhindern | Automatisch | Automatisch |

Auch bei festen Tumbler-Terminen bleibt mindestens ein Tumbler frei. Ein Dauertermin wird abgelehnt, wenn bereits eine normale zukuenftige Buchung im gleichen wiederkehrenden Termin liegt.

### 4. Personen

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Konten des aktiven Hauses sehen | Ja | Ja |
| Bewohner aktivieren oder deaktivieren | Ja | Ja |
| Bewohnerpasswort neu setzen | Ja | Ja |
| Anderen Haus-Admin verwalten | Nein | Ja |
| Bewohner zu Haus-Admin machen oder zurueckstufen | Nein | Ja |
| Konto in ein anderes Haus verschieben | Nein | Ja |
| Superadmin-Konto veraendern oder verschieben | Nein | Nein |
| Eigenes Passwort ohne bisheriges Passwort zuruecksetzen | Nein | Nein |

Beim Verschieben muessen kommende Buchungen des Kontos vorher entfernt werden. Nach einem Umzug wird das Konto aus Sicherheitsgruenden wieder Bewohner. Das eigene Passwort wird im Buchungsbereich mit dem bisherigen Passwort geaendert.

### 5. System

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Testmail an eigene hinterlegte Adresse senden | Ja | Ja |
| Letzte Admin-Aktionen des Hauses sehen | Ja | Ja |
| Hausuebergreifendes Admin-Protokoll sehen | Nein | Ja |
| Geprueftes Backup sofort erstellen | Nein | Ja |
| SQLite-Backup herunterladen | Nein | Ja |

## E-Mail-Hinweise

- Eine neue oder geaenderte E-Mail-Adresse muss bestaetigt werden.
- `Frueher frei` ist nur waehrend des aktuell gebuchten Slots moeglich.
- `Absagen und informieren` ist nur vor Beginn des gebuchten Slots moeglich.
- Nach Slotende wird keine Freigabemail mehr ausgeloest.
- Empfaenger muessen im selben Haus sein und passende Filter fuer Bereich, Wochentag und Slot aktiviert haben.
- `Loeschen` entfernt eine Buchung ohne Rundmail.
- Ohne eingerichteten SMTP-Zugang funktioniert die Buchungsapp weiter, versendet aber keine E-Mails.

## Reinigungsuebersicht

Massgebend bleibt der offizielle GBMZ-Aushang im Waschraum.

| Bereich | Nach der Nutzung |
| --- | --- |
| Waschmaschine | Waschmittelschublade reinigen, Trommel und Dichtung auswischen, Filter unten links reinigen, Schmutzwasser entsorgen, Gehaeuse feucht abwischen |
| Tumbler | Trommel auswischen, vier Filter reinigen, Abflussbereich unter den mittleren Filtern und Tuerdichtung auswischen, Gehaeuse feucht abwischen |
| Trockenraum | Tisch und zwei Filter reinigen, Boden wischen und feucht aufnehmen |
| Waschraum | Boden wischen und feucht aufnehmen |
| Besen und Wischmop | Fusseln entfernen, Mop ausspuelen, auswringen und zum Trocknen aufhaengen |

Die Reinigungspflicht gilt auch fuer einzelne Durchgaenge innerhalb eines fremden oder gemeinsam genutzten Slots. Die Bodenreinigung kann mit Mitbenutzern des gleichen Slots abgesprochen werden.

## Funktionspruefung

### Automatisch gepruefte Kernablaeufe

- Registrierung, Hauscode, Anmeldung mit Benutzername oder E-Mail und Abmeldung.
- E-Mail-Bestaetigung, Passwort-Wiederherstellung, Passwortwechsel und echte SMTP-Zustellung eines passenden Freigabe-Hinweises.
- Einzelbuchung, Waschpaket, Vorschlag, Kalender, Freigabe und Absage.
- Waschmaschinen-, Trockenraum- und Tumblerregeln inklusive Parallelzugriff.
- Bewohner-, Haus-Admin- und Superadminrechte sowie Fremdhaus-Isolation.
- Schutz von Haus-Admins vor Eingriffen durch gleichrangige Haus-Admins.
- Feste Buchungen, Benutzerverwaltung, Geraeteverwaltung, Audit und Backups.
- Datenschutzexport, Kontoloeschung, Sicherheitsheader und Barrierefreiheit.
- Mehrhaus-Jahressimulation mit 100 Personen in sechs Haeusern, 52 Wochen und 5.200 Waschpaketen.

### Testbefehle

| Befehl | Zweck |
| --- | --- |
| `npm run verify` | Syntax aller zentralen Dateien pruefen |
| `npm test` | Vollstaendige API- und Funktionsablaeufe pruefen |
| `npm run test:roles` | Rollen, Rechte, Hausisolation und Abmeldung pruefen |
| `npm run test:year` | Ein Jahr mit 100 Bewohnerkonten in sechs getrennten Haeusern simulieren |
| `npm run test:a11y` | Statische Barrierefreiheitspruefung ausfuehren |
| `npm run check` | Alle oben genannten Pruefungen nacheinander ausfuehren |

## Entwicklerreferenz

### Aufbau

| Pfad | Verantwortung |
| --- | --- |
| `server.js` | Express-Server, SQLite-Datenmodell, Sitzungen, Rechte, Buchungsregeln, E-Mail und Backups |
| `swiss-time.js` | Datums- und Slotberechnung in Schweizer Zeit |
| `release-window.js` | Zeitfenster fuer Freigaben und Absagen |
| `public/login.html`, `public/login.js` | Landingpage, Anmeldung und Registrierung |
| `public/index.html`, `public/app.js` | Waschplan, Konto, Einfuehrung und Verwaltung |
| `public/styles.css` | Gemeinsames responsives Erscheinungsbild |
| `scripts/` | Funktions-, Rollen-, Jahres- und Barrierefreiheitstests |
| `render.yaml` | Produktionsdienst und persistenter Datentraeger auf Render |
| `render.staging.yaml` | Vorlage fuer eine getrennte Staging-Umgebung |

### Lokale Umgebung

```bash
npm ci
npm start
```

Danach ist die App unter `http://localhost:3000` erreichbar. Nur lokal werden standardmaessig `admin` / `admin123` und `user` / `user123` angelegt.

### Daten und Isolation

- Produktion verwendet SQLite auf dem persistenten Render-Datentraeger unter `/var/data/washraum.sqlite`.
- Jede Person, Ressource, Buchung und Freigabe ist einem Haus zugeordnet.
- Bewohner und Haus-Admins duerfen keine Daten eines anderen Hauses lesen oder veraendern.
- Nur der Superadmin darf das aktive Haus wechseln und hausuebergreifende Aktionen ausfuehren.
- Rollen- und Hausgrenzen muessen immer serverseitig durchgesetzt und im Rollentest abgedeckt werden.
- `SEED_ADMIN_NAME` bezeichnet das bestehende oder neu anzulegende Superadmin-Konto. Ist `SEED_ADMIN_PASSWORD` gesetzt, wird dieses Konto beim Start als aktiver Superadmin sichergestellt, ohne ein bereits geaendertes Passwort zu ueberschreiben.

### Deployment

Der GitHub-Workflow `.github/workflows/deploy-render.yml` fuehrt zuerst `npm run check` aus. Nur bei Erfolg ruft er den als Repository-Secret gespeicherten Render Deploy Hook auf. Produktion soll erst als aktuell gelten, wenn `/api/health` den erwarteten Git-Commit meldet.

## Aenderungsprotokoll

### 18. Juli 2026

- Abmeldung fehlertolerant gemacht: Das Sitzungs-Cookie wird auch dann entfernt, wenn der SQLite-Sitzungsspeicher kurzzeitig nicht geloescht werden kann.
- SQLite wartet bei einer kurzen Datenbanksperre bis zu fuenf Sekunden, statt den Abmeldevorgang sofort mit einer Serverfehlermeldung abzubrechen.
- Der Abmeldebutton zeigt den laufenden Vorgang an, verhindert Doppelklicks und meldet einen Fehler verstaendlich innerhalb der App.
- Wiederholte Abmeldung, Same-Origin-Pruefung, Cookie-Loeschung, Cache-Schutz und Weiterleitung werden automatisch getestet.
- Test fuer `Waschpaket ergaenzen` datumsunabhaengig gemacht: Ein gebuchter Tumbler wird gezielt entfernt und ueber den Vorschlag erneut zum bestehenden Paket hinzugefuegt.
- Suche fuer intelligente Waschpakete ueber Sonntage hinweg verbessert: Eine nahe Kombination mit Trockenraum wird nicht mehr vorschnell durch ein reines Tumbler-Paket ersetzt.
- Buchungskalender um einen barrierefreien Umschalter fuer Wochen- und Monatsansicht erweitert; ein gewaehlter Tag oeffnet weiterhin direkt die zugehoerigen Slots.
- Monatsansicht als stabiles 42-Tage-Raster umgesetzt und Sonntage im Kalender korrekt als nicht buchbare Ruhetage gekennzeichnet.
- Buchungsoberflaeche auf einen Kalender-zuerst-Ablauf umgestellt: Uebersicht vor persoenlichem Vorschlag und Detailauswahl.
- Gefuehrten Vier-Schritt-Ablauf fuer Waschmaschine, Trockenraum, Tumbler und abschliessende Paketpruefung eingefuehrt.
- Trocknungsoptionen werden erst nach einer freien oder bereits eigenen Waschmaschinen-Buchung geladen; Einzelbuchungen bleiben nachgeordnet erreichbar.
- Zuletzt verwendete Wochen- oder Monatsansicht wird im Browser gespeichert.
- Gesprochenes Einfuehrungsvideo, Poster und Untertitel auf den Kalender-zuerst-Ablauf und die vier Buchungsschritte aktualisiert.
- Kalender um drei beschriftete Verfuegbarkeitsstreifen fuer Waschmaschinen, Trockenraeume und Tumbler mit einheitlichem Farbcode erweitert.
- Slotgenaue Tagesdetails fuer Maus, Tastatur und Touch ergaenzt; fremde Bewohnerdaten werden dabei nicht ausgegeben.
- Direkte Waschmaschinenwahl aus der Tagesansicht mit erneuter serverseitiger Verfuegbarkeitspruefung umgesetzt.
- Drei lokal gespeicherte Kalendergroessen fuer Wochen- und Monatsansicht ergaenzt.
- Einfuehrung und automatisierte Tests an Kalenderfarben, Tagesdetails, Tumbler-Reserve, Zoom und Direktbuchung angepasst.

### 15. Juli 2026

- Verwaltungsansicht in die Bereiche `Ueberblick`, `Haus & Geraete`, `Dauertermine`, `Personen` und `System` gegliedert.
- Rollenhinweis und sichtbarer Geltungsbereich fuer Haus-Admin und Superadmin ergaenzt.
- Personenverwaltung nach Rollen geschaerft: Haus-Admins koennen andere Admins weder deaktivieren noch deren Passwort zuruecksetzen.
- Eigenes Adminpasswort kann nicht ueber den Verwaltungs-Reset ohne bisheriges Passwort ersetzt werden.
- Persoenlicher Vorschlag schliesst bereits begonnene Waschslots aus.
- Eigener Rollen- und Hausisolationstest fuer Bewohner, Haus-Admin und Superadmin ergaenzt.
- Abmeldung fuer Bewohner, Haus-Admin und Superadmin ueber einen serverseitigen Formularweg abgesichert und getestet.
- Bestehendes konfiguriertes Start-Admin-Konto wird beim Start zu einem aktiven Superadmin vervollstaendigt; ein vorhandenes Passwort bleibt unveraendert.
- Jahressimulation auf 100 Bewohner, das bestehende und fuenf weitere Testhaeuser sowie 5.200 Waschpakete erweitert; Hausgrenzen werden dabei fuer jede Buchung kontrolliert.
- Waschpaket mit schneller Auswahl fuer eine bis drei Waschmaschinen sowie direkten Schaltern fuer Trockenraum und Tumbler vereinfacht; alle Bestandteile werden weiterhin atomar und regelkonform gebucht.
- Kontrastfehler in der hellen Kopfzeile behoben: Kontoinformationen sind dunkel lesbar und `Abmelden` ist oben rechts als dunkelgruener Button klar sichtbar.
- App als `WaschZeit` neu benannt und das GBMZ-Bildlogo durch eine Text-Wortmarke ersetzt; die Kopfzeile zeigt dauerhaft die Adresse des aktiven Hauses und aktualisiert sie beim Hauswechsel.
- Mailinfo beim Freigeben zusaetzlich als SMTP-Integrationstest abgesichert: Nur ein bestaetigter Abonnent im selben Haus erhaelt Betreff, Ressource und Freigabehinweis.
- Dieses gemeinsame Benutzer-, Admin- und Entwicklerhandbuch eingefuehrt.

### Pflegehinweis fuer den naechsten Stand

Neue Eintraege werden mit Datum und einer kurzen, pruefbaren Beschreibung oberhalb der bisherigen Eintraege ergaenzt.
