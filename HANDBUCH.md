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
2. Benutzername, E-Mail, Passwort und den Hauscode eingeben. Die E-Mail ist Pflicht, weil Passwort-Reset und wichtige Kontohinweise sonst nicht funktionieren. Den Hauscode gibt der Haus-Admin weiter; er ordnet das Konto dem richtigen Haus zu.
3. Nach der Anmeldung unter `Buchen` zuerst im Wochen- oder Monatskalender einen freien Waschtag waehlen. Der persoenliche Vorschlag ist im passenden Tag markiert.
4. Im Standardweg `Zeit zuerst` ein passendes Zeitfenster mit sichtbarer Verfuegbarkeit waehlen, danach eine bis drei freie Waschmaschinen im gleichen Slot auswaehlen. Wer gezielt nach einer Maschine sucht, kann dauerhaft auf `Maschine zuerst` umstellen.
5. Unter `Meine Buchungen` Termine pruefen, vor Beginn absagen oder waehrend des laufenden Slots frueher freigeben.
6. Beim ersten Start die `Persoenliche Einrichtung` durchgehen: E-Mail pruefen, App-Installation nutzen und bei Bedarf Push aufs Handy aktivieren. Fuer schnelle Freigaben ist Push der bevorzugte Kanal, E-Mail bleibt als Fallback moeglich.
7. Oben rechts mit `Abmelden` die Sitzung sicher beenden.

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
| Neu hier | Konto mit Benutzername, Pflicht-E-Mail, Passwort und Hauscode erstellen | Oeffentlich |
| Freigabe-Hinweise | E-Mail-Hinweise bei der Registrierung ein- oder ausschalten | Oeffentlich |
| Passwort vergessen | Sicheren Wiederherstellungslink anfordern | Oeffentlich |
| Rueckmeldung | Bestaetigte E-Mail, ungueltiger Link oder erfolgreiche Abmeldung anzeigen | Oeffentlich |
| Datenschutz | Zur Datenschutzerklaerung wechseln | Oeffentlich |

Die App ist als PWA installierbar. Auf unterstuetzten Geraeten kann sie aus dem Browser zum Home-Bildschirm hinzugefuegt werden und startet danach wie eine normale App.

Der Hauscode ist kein persoenliches Passwort. Er sorgt dafuer, dass neue Konten nur dem richtigen Haus beitreten. Haus-Admins und Superadmins koennen ihn in der Verwaltung aendern.

Passwoerter muessen 12 bis 128 Zeichen lang sein. Nach Anmeldung und Registrierung wird die Sitzungskennung erneuert. Anmelde-, Registrierungs- und Resetformulare sperren den Senden-Button waehrend der Anfrage und melden einen Verbindungsabbruch verstaendlich.

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
| Buchungsweg waehlen | Zwischen `Zeit zuerst` und `Maschine zuerst` wechseln; die Auswahl wird im Benutzerkonto gespeichert und gilt auf allen Geraeten |
| Zeit zuerst | Standardweg mit fuenf Schritten: Zeitfenster, Waschmaschine, Trockenraum, Tumbler und Pruefen |
| Zeitfenster | Alle drei Slots zuerst gross anzeigen; pro Slot die aktuell waehlbaren Waschmaschinen, Trockenraeume und Tumbler zusammenfassen |
| Maschine zuerst | Bisherigen Vier-Schritt-Weg mit nach Zeitfenstern gruppierten Waschmaschinen beibehalten |
| Waschmaschine | Nur freie Waschmaschinen anzeigen und eine bis drei Maschinen im gleichen Slot auswaehlen |
| Trockenraum | Erst nach der Waschmaschinenwahl passende freie Trockenraeume und die erlaubten Trocknungsdauern anzeigen |
| Tumbler | Danach regelkonform verfuegbare Tumbler anzeigen; mindestens ein Tumbler bleibt frei |
| Pruefen | Datum, Waschmaschinen, Trockenraum und Tumbler vor der gemeinsamen Buchung zusammenfassen |
| Paket ergaenzen | Eine bereits gebuchte eigene Waschmaschine erkennen und passende Trocknungsoptionen nachtraeglich ergaenzen |
| Optionale Trocknung | Trockenraum und Tumbler koennen in ihren Schritten bewusst ausgelassen werden |
| Fokussierte Trockenraumwahl | Nach der Auswahl nur den gewaehlten Trockenraum anzeigen; ueber `Anderen Trockenraum waehlen oder entfernen` kann die Auswahl wieder geoeffnet werden |
| Sichtbare Nutzungszeit | Die erlaubte Nutzungszeit direkt beim Trockenraum gross und kontrastreich anzeigen |
| Buchungsfehler am Ort der Aktion | Fehler direkt im Waschpaket anzeigen und zusaetzlich kurz als gut sichtbaren Hinweis am oberen Bildschirmrand einblenden |
| Kompakter Bildkopf | Das dekorative Waschraumfoto als schmale Kopfleiste anzeigen; zusaetzliche Infomarken werden zugunsten von Kalender und Buchung ausgeblendet |
| Wochenansicht | Sieben Tage mit freier Kapazitaet und eigenen Terminen kompakt anzeigen |
| Monatsansicht | Einen vollstaendigen Monat im festen Sechs-Wochen-Raster ueberblicken und einen Tag direkt auswaehlen |
| Ansicht merken | Zuletzt verwendete Wochen- oder Monatsansicht lokal im Browser speichern |
| Drei Statusstreifen | Pro Kalendertag Waschmaschinen, Trockenraeume und Tumbler getrennt anzeigen: gruen frei, gelb teilweise belegt, rot vollstaendig belegt, grau vergangen oder Ruhetag |
| Tagesdetails | Beim Ueberfahren, Tastaturfokus oder Antippen alle drei Slots mit freien, belegten und eigenen Geraeten anzeigen; fremde Namen bleiben verborgen |
| Direkt aus dem Kalender buchen | Eine freie Waschmaschine in den Tagesdetails auswaehlen und Datum, Slot sowie Geraet direkt in das Waschpaket uebernehmen |
| Vergroesserte Tagesvorschau | Nach kurzem Verweilen mit der Maus den einzelnen Kalendertag als lesbare, schwebende Detailkarte oeffnen; per Tastatur beim Fokus und mobil durch Antippen |
| Mobile Tagesansicht | Auf Smartphones als grosses Bottom-Sheet oeffnen, den gewaehlten Tag markieren und die feste Buchungsaktion ohne Scrollen erreichbar halten |
| Mobile Bedienung | Tagesansicht ueber Schliessen, Antippen ausserhalb oder Herunterwischen beenden; relevante Touchflaechen sind mindestens 44 Pixel hoch |
| Klick in die Buchung | Einen buchbaren Kalendertag anklicken und direkt zur zugehoerigen Waschpaket-Oberflaeche wechseln |
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
| Persoenliche Einrichtung | Kompakten Status fuer E-Mail, App-Installation und Push anzeigen |
| Einstellungen oeffnen | Gefuehrten Dialog fuer E-Mail-Adresse, Freigabe-Hinweise, PWA-Installation, Push und Hinweisfilter oeffnen |
| E-Mail-Bestaetigung | Im Einstellungsdialog Pflichtadresse und Bestaetigungsstatus anzeigen sowie Link erneut senden |
| Als App installieren | Im Einstellungsdialog Installationsbutton oder iPhone-Hinweis fuer den Home-Bildschirm anzeigen |
| Push aufs Handy | Im Einstellungsdialog Push-Hinweise auf dem aktuellen Geraet aktivieren oder deaktivieren |
| Hinweisfilter | Im Einstellungsdialog Bereich, Wochentag und Zeitfenster eingrenzen |
| Zugang und Sicherheit | Eigenes Passwort mit bisherigem Passwort aendern |
| Meine Daten | Eigene Daten und Buchungen als JSON exportieren |
| Konto loeschen | Eigenes Konto nach Passwortbestaetigung endgueltig entfernen |
| Freigaben und Absagen | Noch relevante wieder freie Termine anzeigen |
| Letzte Hinweise | Eigene lokale Aktionsbestaetigungen dieses Geraets anzeigen |
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

Nach `Verwalten` erscheint oben die eigene Adminrolle und ihr Geltungsbereich. Die Navigation teilt alle Aufgaben in fuenf klar getrennte Arbeitsbereiche. Auf kleinen Bildschirmen bricht die Navigation in gut erreichbare Zeilen um; Kontraste bleiben auch in der hellen Verwaltungsansicht lesbar.

### 1. Ueberblick

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Aktive Nutzer des ausgewaehlten Hauses | Ja | Ja |
| Konten ohne E-Mail als Warnung anzeigen | Ja | Ja |
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
| Ressource mit Grund sperren oder wieder freigeben | Ja | Ja |
| Neues Haus mit Standardressourcen anlegen | Nein | Ja |
| Haus anzeigen, umbenennen, aktivieren oder deaktivieren | Nein | Ja |

Ressourcen und Hauscodes sind immer auf das aktive Haus begrenzt. Eine gesperrte Ressource ist fuer neue Buchungen nicht mehr verfuegbar und erscheint in der Admin-Auswertung mit Sperrgrund. Ein Haus mit aktiven Konten oder kommenden Buchungen kann nicht deaktiviert werden.

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
| Reset-Link an bestaetigte Bewohner-E-Mail senden | Ja | Ja |
| Anderen Haus-Admin verwalten | Nein | Ja |
| Bewohner zu Haus-Admin machen oder zurueckstufen | Nein | Ja |
| Konto in ein anderes Haus verschieben | Nein | Ja |
| Superadmin-Konto veraendern oder verschieben | Nein | Nein |
| Eigenes Passwort ohne bisheriges Passwort zuruecksetzen | Nein | Nein |

Beim Verschieben muessen kommende Buchungen des Kontos vorher entfernt werden. Nach einem Umzug wird das Konto aus Sicherheitsgruenden wieder Bewohner. Admins koennen fremde Passwoerter weder sehen noch selbst festlegen. Sie senden nur einen zeitlich begrenzten Link an eine bestaetigte E-Mail-Adresse. Das eigene Passwort wird im Buchungsbereich mit dem bisherigen Passwort geaendert.

### 5. Auswertung

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Buchungszahlen der letzten und naechsten 30 Tage sehen | Ja | Ja |
| Nutzung nach Ressource, Bereich und Slot sehen | Ja | Ja |
| Aktivste Nutzer des Hauses sehen | Ja | Ja |
| Gesperrte Ressourcen mit Grund sehen | Ja | Ja |

Die Auswertung dient der Betriebsuebersicht im Haus. Sie ist kein Bewohner-Ranking fuer den Aushang.

### 6. System

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Testmail an eigene hinterlegte Adresse senden | Ja | Ja |
| Aktive Push-Geraete des Hauses sehen und Testpush senden | Ja | Ja |
| Letzte Admin-Aktionen des Hauses sehen | Ja | Ja |
| Alle normalen Buchungen des aktiven Hauses mit Bestaetigungstext loeschen | Ja | Ja |
| Hausuebergreifendes Admin-Protokoll sehen | Nein | Ja |
| Geprueftes Backup sofort erstellen | Nein | Ja |
| SQLite-Backup herunterladen | Nein | Ja |
| Warnung bei fehlender externer Backup-Kopie sehen | Ja | Ja |

Der Buchungsreset loescht keine Konten und keine Dauertermine. Er verlangt den Text `ALLE BUCHUNGEN` und wird im Admin-Audit protokolliert.

Die App behaelt lokal die drei neuesten Sicherungen sowie je eine Sicherung pro Tag fuer bis zu 14 Tage. Liegt die externe Kopie auf demselben Render-Datentraeger nicht vor, zeigt der Ueberblick eine Warnung. Fuer einen Ausfall des Render-Datentraegers muss `BACKUP_UPLOAD_URL` auf einen unabhaengigen Speicher zeigen.

## E-Mail-Hinweise

- Eine neue oder geaenderte E-Mail-Adresse muss bestaetigt werden.
- Eine E-Mail-Adresse ist fuer jedes Konto Pflicht, damit Passwort-Reset und wichtige Kontohinweise moeglich bleiben.
- Ohne Bestaetigung werden keine Freigabe-Hinweise und keine Passwort-Reset-Links versendet.
- `Frueher frei` ist nur waehrend des aktuell gebuchten Slots moeglich.
- `Absagen und informieren` ist nur vor Beginn des gebuchten Slots moeglich.
- Nach Slotende wird keine Freigabemail mehr ausgeloest.
- Empfaenger muessen im selben Haus sein und passende Filter fuer Bereich, Wochentag und Slot aktiviert haben.
- `Loeschen` entfernt eine Buchung ohne Rundmail.
- Ohne eingerichteten SMTP-Zugang funktioniert die Buchungsapp weiter, versendet aber keine E-Mails.

## Push-Hinweise und PWA

- Die App besitzt ein Web-App-Manifest und einen Service Worker. Dadurch kann sie auf unterstuetzten Smartphones und Desktops als PWA installiert werden.
- Beim ersten Start und spaeter unter `Persoenliche Einrichtung` zeigt `Als App installieren` entweder den direkten Browser-Installationsdialog oder den passenden iPhone-Hinweis.
- Push-Hinweise sind pro Browser/Geraet freiwillig. Bewohner muessen Push im Browser erlauben und koennen das Abo in der App wieder deaktivieren.
- Push nutzt dieselben Filter wie E-Mail: Haus, Bereich, Wochentag, Zeitfenster und aktivierte Freigabe-Hinweise.
- Freigaben und Absagen senden Push an passende aktive Abos im selben Haus, nicht an die Person, die den Termin freigegeben hat.
- Push-Texte nennen neutral, wer den Termin freigegeben oder abgesagt hat. Beim Antippen oeffnet die App einen Detaildialog mit Person, Ressource, Datum, Slot und Buchungsfrage.
- Der Dialog bucht den Slot ueber die normale Buchungspruefung. Ist der Slot inzwischen vergeben, abgelaufen oder die Ressource gesperrt, wird das im Dialog angezeigt.
- Der Server erzeugt VAPID-Schluessel automatisch und speichert sie in SQLite, falls keine `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` gesetzt sind. Fuer dauerhafte Produktionsschluessel koennen diese Werte in Render als Environment Variables hinterlegt werden.
- Im Adminbereich zeigt der Ueberblick den Push-Status und die Anzahl aktiver Geraete. Unter `System` kann ein Testpush an alle aktiven Push-Geraete im Haus oder gezielt an eine Person mit aktivem Push-Geraet gesendet werden.
- Auf iOS funktionieren PWA-Push-Hinweise nur, wenn die App zum Home-Bildschirm hinzugefuegt wurde und Benachrichtigungen erlaubt sind.

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
- Admin-ausgeloester Passwort-Reset nur als Link an eine bestaetigte E-Mail; ein Admin kann kein fremdes Passwort festlegen.
- Einzelbuchung, Waschpaket, Vorschlag, Kalender, Freigabe und Absage.
- Waschmaschinen-, Trockenraum- und Tumblerregeln inklusive Parallelzugriff.
- Bewohner-, Haus-Admin- und Superadminrechte sowie Fremdhaus-Isolation.
- Schutz von Haus-Admins vor Eingriffen durch gleichrangige Haus-Admins.
- Feste Buchungen, Benutzerverwaltung, Geraeteverwaltung, Audit und Backups.
- PWA-Dateien, Push-Abo, Push-Test und Freigabe-Hinweise ueber Push.
- Datenschutzexport, Kontoloeschung, Sicherheitsheader und Barrierefreiheit.
- Mehrhaus-Jahressimulation mit 100 Personen in sechs Haeusern, 52 Wochen und 5.200 Waschpaketen.

### Testbefehle

| Befehl | Zweck |
| --- | --- |
| `npm run verify` | Syntax aller zentralen Dateien pruefen |
| `npm test` | Vollstaendige API- und Funktionsablaeufe pruefen |
| `npm run test:roles` | Rollen, Rechte, Hausisolation und Abmeldung pruefen |
| `npm run test:year` | Ein Jahr mit 100 Bewohnerkonten in sechs getrennten Haeusern simulieren |
| `npm run test:e2e` | Optionalen Browser-Smoke-Test fuer Registrierung und persoenliche Einrichtung ausfuehren, wenn Playwright verfuegbar ist |
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
| `public/manifest.webmanifest`, `public/sw.js` | PWA-Installation, Offline-Shell und Push-Anzeige |
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

- Admin-Auswertung fuer Nutzung nach Bereich, Slot, Ressource, Nutzer und gesperrte Ressourcen ergaenzt.
- Push-Freigaben erweitert: Benachrichtigungen nennen die freigebende Person und oeffnen beim Antippen einen Buchungsdialog fuer den konkreten Slot.
- Gesprochenes Einfuehrungsvideo, Poster, Untertitel, Lesetext und interaktiver Rundgang auf Push-Freigaben und direkte Slotbuchung nach Push aktualisiert.
- Betriebssperren fuer Geraete und Raeume mit Sperrgrund eingefuehrt; gesperrte Ressourcen sind fuer neue Buchungen nicht verfuegbar und werden im Audit festgehalten.
- Abgesicherten Admin-Reset fuer normale Buchungen des aktiven Hauses ergaenzt; Dauertermine und Konten bleiben erhalten.
- Lokales Hinweis-Journal unter `Meine Ansicht` ergaenzt, damit Bewohner die letzten eigenen Aktionsbestaetigungen wiederfinden.
- Optionalen Browser-E2E-Smoke-Test fuer Registrierung und persoenliche Einrichtung ergaenzt.
- Persoenliche Einrichtung als gefuehrten Dialog eingefuehrt: Nach Registrierung erscheinen E-Mail, PWA-Installation, Push und Hinweisfilter gebuendelt; die Seitenleiste zeigt nur noch eine kompakte Statuskarte.
- Sichtbaren Installationsbereich `Als App installieren` ergaenzt, damit Bewohner die PWA nicht im Browsermenue suchen muessen; iPhone-Nutzer erhalten den Hinweis auf `Teilen` und `Zum Home-Bildschirm`.
- E-Mail-Pflicht fuer Konten deutlicher gemacht: Registrierung und eigene Benachrichtigungen verlangen eine gueltige Adresse; bestehende Konten ohne E-Mail werden in App und Adminuebersicht sichtbar gewarnt.
- PWA-Basis eingefuehrt: Manifest, App-Icon und Service Worker machen WaschZeit installierbar und stellen die App-Shell offline bereit.
- Web-Push fuer Freigaben und Absagen ergaenzt: Bewohner koennen Push pro Geraet aktivieren, deaktivieren und mit denselben Filtern wie E-Mail nutzen.
- Adminbereich um Push-Status, Empfaengerauswahl und Testpush an aktive Geraete im Haus erweitert; VAPID-Schluessel werden automatisch in SQLite erzeugt oder optional aus Render-Umgebungsvariablen gelesen.
- Datenschutz, Konfiguration und automatische Tests um Push-Abos, PWA-Dateien und neue Push-Routen erweitert.
- Zwei gespeicherte Buchungswege eingefuehrt: `Zeit zuerst` als Standard mit eigenem Zeitfenster-Schritt und `Maschine zuerst` als weiterhin verfuegbare Alternative.
- Zeitfenster zeigen vor der Geraetewahl die aktuellen Zahlen fuer Waschmaschinen, Trockenraeume und waehlbare Tumbler; beide Wege verwenden danach dasselbe regelkonforme Waschpaket.
- Buchungsfehler aus der Seitenleiste an den aktiven Buchungsschritt geholt und fuer alle Ansichten als zeitlich begrenzten, gut sichtbaren Hinweis ergaenzt.
- Trockenraumauswahl fokussiert: Nach einer Wahl werden andere Raeume ausgeblendet, bleiben aber ueber eine klare Aenderungsaktion erreichbar.
- Nutzungszeit des Trockenraums visuell hervorgehoben, den dekorativen Bildkopf deutlich verkleinert und grosse Leerraeume zwischen Kalender, Buchung und Rueckmeldungen entfernt.
- Mobile Kalenderdetails als Bottom-Sheet mit fester Buchungsaktion, Hintergrundklick, Wischgeste, markiertem Tag und grossen Touchflaechen vervollstaendigt.
- Wochenstatus auf schmalen Bildschirmen verdichtet und die Verwaltungsnavigation, Hausauswahl sowie Kennzahl-Kontraste fuer Mobilgeraete korrigiert.
- Login, Registrierung und Passwort-Reset gegen Mehrfachklicks abgesichert und um verstaendliche Netzwerkfehlermeldungen ergaenzt.
- IP-Limits fuer Registrierung, allgemeine Wiederherstellung und Admin-Reset getrennt, damit normale Registrierung keinen spaeteren Reset blockiert.
- Unerwartete Serverfehler beim Erstellen eines Waschpakets werden kontrolliert an den zentralen Fehlerhandler weitergegeben.
- Sitzungskennung nach erfolgreicher Anmeldung und Registrierung erneuert und API-Antworten gegen Browser-Zwischenspeicherung abgesichert.
- Mindestlaenge neuer Passwoerter und neuer Hauscodes auf 12 Zeichen angehoben; Namen und E-Mail-Kopfzeilen werden gegen Steuerzeichen geprueft.
- Direkte Admin-Passwortvergabe entfernt: Admins koennen nur noch einen zeitlich begrenzten Reset-Link an eine bestaetigte Adresse senden.
- Neue oder geaenderte E-Mail-Adressen gelten auch ohne SMTP niemals automatisch als bestaetigt.
- Lokale Backup-Aufbewahrung auf drei neueste sowie je eine Tagessicherung fuer 14 Tage umgestellt; die Verwaltung warnt sichtbar bei fehlender externer Kopie.
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
- Die zunaechst umgesetzte globale Kalendergroesse nach Rueckmeldung entfernt und durch eine vergroesserte Vorschau des einzelnen Tages nach kurzem Verweilen ersetzt.
- Klick auf einen buchbaren Kalendertag fuehrt direkt in die passende Waschpaket-Oberflaeche; Tastaturfokus und mobiles Antippen oeffnen dieselben Tagesdetails.
- Einfuehrung und automatisierte Tests an Kalenderfarben, Tagesvorschau, Tumbler-Reserve und Direktbuchung angepasst.

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
