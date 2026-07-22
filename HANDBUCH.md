# WaschZeit-Handbuch

Stand: 20. Juli 2026

Dieses Dokument ist die gemeinsame Funktionsuebersicht, Bedienungsanleitung und technische Referenz der WaschZeit-App. Es richtet sich an Bewohner, Haus-Admins, Superadmins und Personen, die die Software weiterentwickeln.

## Dokument pflegen

Bei jeder Aenderung an Funktionen, Rollen, Bedienwegen, Regeln, E-Mails, Daten oder Betrieb gilt:

1. Den betroffenen Abschnitt dieses Handbuchs aktualisieren.
2. Die Rollen- und Funktionsmatrix pruefen.
3. Passende automatische Tests aktualisieren oder ergaenzen.
4. Die Aenderung unten im Aenderungsprotokoll festhalten.

Eine Funktionsaenderung ist erst abgeschlossen, wenn Code, Tests und Handbuch denselben Stand beschreiben.

## Schnellstart fuer Bewohner

1. Den sieben Tage gueltigen Einladungslink aus der E-Mail der Hausverwaltung oeffnen.
2. Wohnung, Klingelschildname und fest zugeordnete E-Mail pruefen und ein persoenliches Passwort festlegen. Bei einer neuen E-Mail entsteht eine persoenliche Identitaet mit Wohnungsmitgliedschaft. Besteht die E-Mail bereits, wird nach Bestaetigung des vorhandenen Passworts dieselbe Identitaet ergaenzt; der Link ist danach verbraucht.
3. Weitere Familienmitglieder waehlen `Geraet verbinden`. Ein bereits angemeldetes Bewohnergeraet erzeugt unter `Einstellungen` > `App & Geraet` einen zehn Minuten gueltigen QR-Code. Der Partner scannt ihn, traegt die eigene E-Mail und ein persoenliches Passwort ein und erhaelt einen eigenen Bewohnerzugang zur gemeinsamen Wohnung. Der lesbare Einmalcode bleibt als manuelle Reserve sichtbar.
4. Nach der Anmeldung unter `Buchen` zuerst im Wochen- oder Monatskalender einen freien Waschtag waehlen. Ein passender Termin ist mit `Empfohlen` und `Buchen` markiert; ein Tipp oeffnet direkt das vorgeschlagene Zeitfenster und die Waschmaschinenwahl.
5. Im Standardweg `Zeit zuerst` ein passendes Zeitfenster mit sichtbarer Verfuegbarkeit waehlen, danach eine bis drei freie Waschmaschinen im gleichen Slot auswaehlen. Wer gezielt nach einer Maschine sucht, kann dauerhaft auf `Maschine zuerst` umstellen.
6. Unter `Meine Buchungen` Termine pruefen, vor Beginn absagen oder waehrend des laufenden Slots frueher freigeben.
7. Beim ersten Start die `Einstellungen` durchgehen: E-Mail pruefen und bei Bedarf unter `App & Geraet` die App installieren sowie Push aktivieren. Fuer schnelle Freigaben ist Push der bevorzugte Kanal, E-Mail bleibt als Fallback moeglich.
8. Oben rechts das Kontomenue oeffnen und mit `Abmelden` die Sitzung sicher beenden.

Einzelne Maschinen oder Raeume koennen weiterhin im nachgeordneten Bereich `Einzelnes Geraet separat buchen` reserviert werden. Fuer einen vollstaendigen Waschtag ist der gefuehrte Ablauf der schnellste Weg.

## Rollen

| Rolle | Geltungsbereich | Verwaltungsrechte |
| --- | --- | --- |
| Bewohner | Persoenliche Identitaet, gemeinsame Wohnung und zugeordnetes Haus | Gemeinsame Wohnungsbuchungen, persoenliche Hinweise und Kontodaten sowie sachliche Stoerungsmeldungen |
| Haus-Admin | Eigenes Haus | Wohnungen und Einladungen, Wohnungskonten, Geraete, Tagebuch, Sperren, Reparaturpruefung, Dauertermine sowie Buchungen des Hauses einsehen und bei Bedarf loeschen |
| Superadmin | Alle Haeuser | Hausuebergreifende Tagebuchsicht, alle Haus-Admin-Rechte plus Haeuser, Rollen, Umzuege, Backups und globaler Wartungsmodus |

Ein Superadmin arbeitet immer im aktuell ausgewaehlten Haus. Der Hausumschalter in der Kopfzeile legt fest, auf welches Haus sich Kalender und Verwaltung beziehen.

Die Rollen sind kombinierbar: Ein Haus-Admin kann zugleich Bewohner einer aktivierten Wohnung sein. In diesem Fall stehen getrennt `Mein Waschplan` fuer die eigenen Bewohneraufgaben und `Verwalten` fuer das Haus zur Verfuegung. Reine Admin- und Superadmin-Konten ohne aktive Wohnung sehen im Kalender nur die Belegung und koennen keine normalen Bewohnerbuchungen oder Stoerungsmeldungen anlegen. Diese Grenze wird serverseitig durchgesetzt.

Die QR-Partnerverbindung ist ausschliesslich fuer eine aktive Wohnungsmitgliedschaft freigegeben. Sie erzeugt oder verbindet eine eigene persoenliche Identitaet und vergibt nur Bewohnerrechte. Haus-Admin- oder Superadminrechte der erzeugenden Person werden nie kopiert. Ein Admin ohne eigene Wohnungsmitgliedschaft kann keinen solchen QR-Code erzeugen.

Das konfigurierte Start-Admin-Konto ist der Superadmin. Beim Start stellt die App sicher, dass dieses Konto aktiv ist und die Adminrolle besitzt. In einer aelteren Datenbank ohne Superadmin wird der erste vorhandene Admin einmalig zum Superadmin hochgestuft.

### Notfallzugang und Superadminrechte

Der Superadmin kann sich nicht selbst loeschen oder das eigene Superadminrecht entziehen. Unter `Verwalten` > `System` kann er einem anderen aktiven Haus-Admin zusaetzlich Superadminrechte geben. Der bisherige Superadmin behaelt seine Rechte. Ein Superadmin kann die Zusatzberechtigung eines anderen Superadmins spaeter wieder entziehen; dessen Haus-Adminrecht bleibt bestehen. Beide Aktionen verlangen das aktuelle Passwort und den exakten Bestaetigungstext `SUPERADMINRECHT GEBEN` beziehungsweise `SUPERADMINRECHT ENTZIEHEN`. Alle Sitzungen des Zielkontos werden beendet, damit die neue Berechtigung erst nach einer sicheren Neuanmeldung gilt.

Im Ueberblick zeigt die App den Notfallstatus:

| Pruefung | Bedeutung |
| --- | --- |
| Hausadmins | Mindestens zwei aktive Admin-Konten pro Haus vermeiden Single-Person-Abhaengigkeit |
| Superadmins | Mindestens ein aktiver Superadmin muss vorhanden sein; fuer Stellvertretung werden zwei aktive Superadmins empfohlen |
| Seed-Admin | Name des technischen Start-Admin-Kontos |
| Render-Recovery | Zeigt, ob `SEED_ADMIN_PASSWORD` als technischer Notfallanker gesetzt ist |

Organisatorischer Notfallprozess:

1. Render-Zugang einer zweiten vertrauenswuerdigen Stelle bekannt machen oder versiegelt hinterlegen.
2. In Render `SEED_ADMIN_PASSWORD` auf ein neues starkes Passwort setzen.
3. Wenn niemand das bisherige Seed-Passwort kennt, nur fuer diesen Notfall zusaetzlich `SEED_ADMIN_FORCE_PASSWORD_RESET=true` setzen.
4. Render-Service neu starten oder neu deployen.
5. Mit `SEED_ADMIN_NAME` und dem neuen Seed-Passwort anmelden. Das Seed-Konto wird aktiv als Superadmin sichergestellt.
6. Sofort danach `SEED_ADMIN_FORCE_PASSWORD_RESET` wieder entfernen und den Service erneut starten. `SEED_ADMIN_PASSWORD` kann als Notfallanker gesetzt bleiben.
7. Nach der Anmeldung ein normales Admin- oder Superadmin-Nachfolgekonzept wiederherstellen und den Notfallzugriff dokumentieren.

## Seite: Anmeldung (`/login.html`)

| Bereich | Funktion | Zugang |
| --- | --- | --- |
| Landingpage | WaschZeit-Wortmarke, Kurzuebersicht und direkter Einstieg | Oeffentlich |
| Anmelden | Bewohner mit einer hinterlegten E-Mail und Passwort; Admins alternativ mit technischem Kontonamen | Oeffentlich |
| Einladung | Unter der Ueberschrift `Wohnung aktivieren` / `Activate apartment` eine sieben Tage gueltige Einladung mit der eindeutigen Aktion `Einladung annehmen` / `Accept invitation` pruefen; neue Identitaet anlegen oder bestehende Identitaet nach Passwortbestaetigung derselben Wohnung zuordnen | Oeffentlich mit gueltigem Link |
| Geraet verbinden | QR-Code scannen oder lesbaren Einmalcode eingeben und mit eigener E-Mail sowie persoenlichem Passwort einen Bewohnerzugang derselben Wohnung anlegen | Oeffentlich mit zehn Minuten gueltigem Token |
| Freigabe-Hinweise | E-Mail-Hinweise bei der Einladungsannahme ein- oder ausschalten | Oeffentlich |
| Passwort vergessen | Sicheren Wiederherstellungslink anfordern | Oeffentlich |
| Persoenlicher Wiederherstellungscode | Ein Konto ohne bestaetigte E-Mail mit einem 15 Minuten gueltigen, einmaligen Admin-Code, eigener E-Mail und neuem Passwort wiederherstellen | Oeffentlich mit gueltigem Code |
| Rueckmeldung | Bestaetigte E-Mail, ungueltiger Link sowie manuelle oder automatische Abmeldung anzeigen | Oeffentlich |
| Datenschutz | Zur Datenschutzerklaerung wechseln | Oeffentlich |

Die App ist als PWA installierbar. Auf unterstuetzten Geraeten kann sie aus dem Browser zum Home-Bildschirm hinzugefuegt werden und startet danach wie eine normale App.

### Sprache

WaschZeit unterstuetzt zentral Deutsch (`de`) und Englisch (`en`). Deutsch ist Standard und sicherer Rueckfall. Auf der Anmeldeseite wird die Auswahl unter `waschzeit-language` lokal gespeichert. Nach der Anmeldung speichert `PUT /api/me/language` ausschliesslich `de` oder `en` am persoenlichen Konto; ein anderer Wert wird abgelehnt und veraendert weder Rolle noch aktives Haus. Die Kontosprache hat beim naechsten Login Vorrang und kann unter `Einstellungen > Profil > Sprache` geaendert werden. Freie Namen, Stoerungstexte und Tagebuchnotizen werden nicht automatisch uebersetzt.

Ein Sprachwechsel aktualisiert ohne manuellen Reload auch bereits aufgebaute dynamische Ansichten. Dazu gehoeren die vollstaendige Bewohnerseite mit Hero, eigenen Buchungen, Leerzustaenden, Kalender und Datumskoepfen, Empfehlungen, gefuehrtem Buchungsablauf und Mitteilungsbereichen sowie die sichtbare Verwaltung und die passende Rollenfuehrung. Die dynamischen Renderer beziehen ihre Systemtexte aus dem zentralen Sprachkatalog; serverseitig gelieferte Empfehlungssaetze werden aus bekannten, strukturierten Textbausteinen lokalisiert. Freie Namen und technische Werte bleiben unveraendert. Aktives Haus, Rollenrechte, Woche oder Monat, gewaehltes Datum, laufende Buchungsauswahl, Verwaltungsreiter und ausgewaehltes Einfuehrungskapitel bleiben dabei erhalten.

Der geoeffnete Einstellungsdialog folgt demselben Vertrag in allen fuenf Reitern. Ueberschriften, Hilfetexte, Formularbeschriftungen, Optionen, E-Mail-, Installations-, Push-, QR-, Versions- und Fortschrittsstatus wechseln sofort zwischen Deutsch und Englisch. Der aktive Reiter, Fokus, geoeffnete Detailbereiche, ungespeicherte Formulareingaben und ausgewaehlte Filter bleiben erhalten. Technische Select-Werte wie `washer`, `drying_room`, Wochentagsnummern und Slots werden nicht veraendert; Klingelschild-, Wohnungs-, Haus- und Ressourcennamen sowie E-Mail-Adressen bleiben freie Nutzerdaten und werden nicht uebersetzt.

Die sichtbaren Pflichtseiten, Kernablaeufe, zugaenglichen Namen sowie Verifizierungs-, Reset-, Freigabe- und Testbenachrichtigungen besitzen deutsche und englische Fassungen. Wohnungseinladungen werden zweisprachig versendet, weil vor der ersten Kontoaktivierung noch keine persoenliche Kontosprache existiert. Technische API-Werte, Audit-Aktionscodes, Slots und die Schweizer Fachzeit bleiben sprachunabhaengig stabil.

Einladungstoken sind zufaellig, werden serverseitig nur als SHA-256-Hash gespeichert, gelten sieben Tage und koennen nur einmal verwendet werden. Der Admin legt vorab eine stabile Wohnungsbezeichnung, den Klingelschildnamen und die beim Einzug erhaltene Ziel-E-Mail fest. Die App versendet den Link ausschliesslich an diese Adresse und zeigt ihn im Produktivbetrieb niemals dem Admin an. Bei einer neuen E-Mail legt die Person ihr Passwort fest; bei einer bereits vorhandenen Identitaet bestaetigt sie ihr vorhandenes Passwort. Dadurch kann insbesondere ein Haus- oder Superadmin Bewohner derselben Wohnung werden, ohne ein zweites Konto anzulegen. Ohne funktionierenden SMTP-Versand wird keine Produktionseinladung erstellt und kein unsicherer Ersatzlink angeboten. Freie Registrierung, Wohnungscodes und Kontenzusammenfuehrung sind in Produktion abgeschaltet.

Bewohnerkonten melden sich mit der ersten oder zweiten hinterlegten E-Mail-Adresse an. Ein alter Bewohner-Benutzername ist bei vorhandener E-Mail kein Login mehr. Nur bestehende Bewohnerkonten ohne jede E-Mail duerfen ihren alten Kontonamen uebergangsweise verwenden. Admins duerfen eine fremde Konto-E-Mail nicht eintragen oder ersetzen. Ist auch das Passwort unbekannt und keine bestaetigte Adresse vorhanden, prueft der Admin die Person ausserhalb der App und erzeugt danach einen einmaligen Wiederherstellungscode. Die Person traegt Code, eigene E-Mail und neues Passwort selbst auf der Loginseite ein. Ein alter technischer Bestaetigungsstatus ohne tatsaechlich hinterlegte Adresse gilt immer als `E-Mail fehlt` und berechtigt nie zu einem Reset-Link. Admin- und Superadmin-Konten behalten ihren technischen Kontonamen fuer Betrieb und Notfallzugang.

Passwoerter muessen 12 bis 128 Zeichen lang sein. Nach Anmeldung und Einladungsannahme wird die Sitzungskennung erneuert. Nach 30 Minuten ohne Bedienaktivitaet endet die Sitzung automatisch; zwei Minuten vorher fragt ein Dialog, ob die Person angemeldet bleiben moechte. Maus, Tastatur, Touch und Scrollen gelten als Aktivitaet und werden ueber einen sparsamen Keepalive serverseitig bestaetigt. Anmelde-, Einladungs- und Resetformulare sperren den Senden-Button waehrend der Anfrage und melden einen Verbindungsabbruch verstaendlich.

## Seite: Neues Passwort (`/reset.html`)

| Bereich | Funktion | Zugang |
| --- | --- | --- |
| Passwortformular | Neues Passwort zweimal eingeben | Link mit gueltigem Token |
| Tokenpruefung | Abgelaufene oder bereits verwendete Links ablehnen | Automatisch |
| Abschluss | Zur Anmeldung zurueckkehren | Oeffentlich |

## Seite: Datenschutz (`/privacy.html`)

| Bereich | Funktion | Zugang |
| --- | --- | --- |
| Betreiber und Kontakt | Torsten Letsch und `torstenletsch@freenet.de` als App-Betreiber nennen; GBMZ ausdruecklich davon abgrenzen | Oeffentlich |
| Gespeicherte Daten | Kontodaten, Buchungen und technische Daten benennen | Oeffentlich |
| Verwendungszweck | Buchung, Hauszuordnung und Benachrichtigungen erklaeren | Oeffentlich |
| Aufbewahrung | Fristen und Schutzmassnahmen nennen | Oeffentlich |
| Eigene Rechte | Export, Korrektur und Loeschung erklaeren | Oeffentlich |

## Seite: Waschplan (`/index.html`)

### Kopfzeile

| Funktion | Bewohner | Haus-Admin | Superadmin |
| --- | :---: | :---: | :---: |
| Angemeldete Person, Rolle und Haus anzeigen | Ja | Ja | Ja |
| Mitteilungszentrum mit Ungelesen-Anzeige oeffnen | Ja | Ja | Ja |
| Stoerung zu einem Geraet oder Raum melden | Ja | Mit Bewohnerrolle | Mit Bewohnerrolle |
| Kontomenue und persoenliche Einstellungen oeffnen | Ja | Ja | Ja |
| Windel-Alarm spielen und globale Bestenliste nutzen | Ja | Ja | Ja |
| Zwischen `Mein Waschplan` und `Verwalten` wechseln | Nein | Ja, mit eigener Wohnungsmitgliedschaft | Ja, mit eigener Wohnungsmitgliedschaft |
| Aktives Haus wechseln | Nein | Nein | Ja |
| Sicher abmelden | Ja | Ja | Ja |

Das Kontomenue oben rechts zeigt Benutzername und Rolle. Es fuehrt zu `Einstellungen`, `Hilfe & Einfuehrung` und `Abmelden`. Die Abmeldung sendet ein eigenes Formular an den Server. Die Sitzung wird dort geloescht, das Cookie entfernt und anschliessend die Anmeldeseite mit einer Abmeldebestaetigung geoeffnet. Auch die automatische Inaktivitaetspruefung wird serverseitig durchgesetzt; ein blosses Offenlassen oder Wiederaufrufen eines alten Tabs verlaengert eine abgelaufene Sitzung nicht.

Die App tritt unter dem Namen `WaschZeit` auf. In der angemeldeten Ansicht steht die vollstaendige Adresse des aktiven Hauses dauerhaft direkt unter der Wortmarke und wird beim Hauswechsel sofort aktualisiert. Auf oeffentlichen Seiten ohne bekannte Hauszuordnung erscheint stattdessen `Der Waschplan fuer dein Haus`.

Auf kleinen Smartphones stehen Wortmarke und Hausadresse bewusst in einer eigenen Zeile ueber den Kopfaktionen. Die Adresse bleibt dabei als zusammengehoerige Ortsangabe einzeilig; nur aussergewoehnlich lange Hausnamen werden am Zeilenende gekuerzt. `Stoerung melden`, `Mitteilungen` und das Kontomenue bleiben fuer Bewohner sichtbar und besitzen mindestens 44 x 44 Pixel grosse Bedienflaechen. Reine Adminkonten sehen weiterhin nur die fuer ihre Rolle zulaessigen Kopfaktionen.

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
| Empfohlener Termin | Passenden freien Waschslot mit `Empfohlen` und `Buchen` markieren und per Tipp direkt in der Waschmaschinenwahl oeffnen |
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
| Lesender Admin-Kalender | Reinen Admin-Konten ohne aktive Wohnung Belegungen und Kapazitaeten ohne Empfehlung, Buchungsassistent oder Einzelbuchung zeigen |
| Admin-Korrektur | Haus-Admin und Superadmin koennen normale Buchungen im aktiven Haus loeschen |

Die App prueft die Buchungsregeln auf dem Server. Eine Anzeige im Browser allein kann die Regeln deshalb nicht umgehen.

### Stoerung melden

Bewohner waehlen in der Kopfzeile `Stoerung melden`, das betroffene Geraet oder den Raum und beschreiben die Beobachtung sachlich. Sie sehen den Status ihrer eigenen Meldungen, koennen aber weder eine Ressource sperren noch Tagebucheintraege bearbeiten. Auch bereits gesperrte Ressourcen bleiben als meldbar sichtbar, damit neue Beobachtungen nicht verloren gehen.

### GBMZ-Buchungsregeln

- Pro Tag darf nur ein Waschslot reserviert werden. Innerhalb dieses Slots koennen mehrere Waschmaschinen genutzt werden.
- Der naechste Waschslot kann fruehestens am Tag eines bereits reservierten Waschslots gebucht werden.
- Am Ende des Waschslots muss mindestens ein Tumbler frei bleiben.
- Beim Waschslot `07:00-12:00` darf ein Trockenraum bis hoechstens `21:00` verwendet werden.
- Beim Waschslot `12:00-17:00` darf ein Trockenraum bis hoechstens `12:00` am Folgetag verwendet werden.
- Beim Waschslot `17:00-21:00` darf ein Trockenraum bis hoechstens `12:00` am Folgetag verwendet werden.
- Kuerzeres Trocknen und fruehes Freigeben verbessern die Verfuegbarkeit fuer alle.

### Mitteilungen und Einstellungen

| Bereich | Funktion |
| --- | --- |
| Mitteilungen | Nur fremde, noch buchbare Freigaben anzeigen, die zu den persoenlichen Bereichs-, Wochentag- und Zeitfensterfiltern passen |
| Ungelesen-Anzeige | Neue Eintraege am Kopfzeilenbutton zaehlen und beim Oeffnen als gelesen markieren |
| Neu frei | Den aktuellsten wieder freien Termin kompakt zwischen eigenen Buchungen und Kalender hervorheben |
| Freien Termin buchen | Mitteilung mit Person, Geraet, Datum und Slot oeffnen und bei Verfuegbarkeit direkt buchen |
| Kontomenue | Einstellungen, Hilfe, das optionale Minispiel und Abmeldung kompakt oben rechts anbieten |
| Profil | Adminverwalteten Klingelschildnamen, stabile Wohnung, Rolle, bis zu zwei getrennt bestaetigte E-Mail-Adressen und bevorzugten Buchungsweg anzeigen bzw. speichern |
| Namenskorrektur | Einen neuen Klingelschildnamen vorschlagen; sichtbar wird er erst nach Pruefung durch den Haus-Admin |
| Benachrichtigungen | Freigabe-Hinweise ein- oder ausschalten und nach Bereich, Wochentag und Zeitfenster filtern |
| App und Geraet | PWA installieren, Push verwalten, Versionsnummer und Stand sehen, nach Updates suchen und per kurz gueltigem QR-Code einen persoenlichen Partnerzugang zur Wohnung einladen |
| Sicherheit und Daten | Passwort aendern, eigene Daten exportieren, Datenschutz oeffnen oder Konto loeschen |
| Hilfe und Regeln | Einfuehrungsvideo, interaktiven Rundgang, Reservierungsregeln und Reinigung gebuendelt in den persoenlichen Einstellungen oeffnen |

Die normale Buchungsansicht verwendet die volle Seitenbreite. Der fruehere rechte Block `Gut zu wissen` wurde entfernt; selten benoetigte Hilfe nimmt dadurch keinen dauerhaften Platz neben Kalender und Waschpaket mehr ein. Der Kontomenuepunkt `Hilfe & Einfuehrung` oeffnet direkt den Einstellungsreiter `Hilfe & Regeln`.

Die Benachrichtigungsfilter zeigen sprachabhaengige Optionsnamen, speichern aber weiterhin unveraendert denselben Bereichs-, Wochentag- und Slotwert. Der Push-Schritt in der Fusszeile wird aus dem tatsaechlichen Pushzustand bestimmt und haengt nicht von einem deutschen oder englischen Anzeigesatz ab.

### Minispiel Windel-Alarm

`Windel-Alarm spielen` im Kontomenue oeffnet ein freiwilliges Entschaerfungsspiel der Spielversion 4. Nach dem Start bleiben 60 Sekunden fuer vier zufaellig ausgewaehlte Module aus acht Systemfamilien: `Kabelmatrix`, `Impulsspeicher`, `Druckventil`, `Symboldecoder`, `Thermokern`, `Leckscanner`, `Leiterbahn` und `Sicherungsringe`. Kabel, Impulsfolge, Ventilkorridor, Codelaenge, Kalibrierimpulse und Scannerfelder besitzen mehrere serverseitig bestimmte Varianten. Nach dem ersten oder zweiten Modul unterbricht genau ein ebenfalls serverseitig vorgegebener Zwischenfall den Ablauf: Das Baby strampelt, die Beleuchtung faellt kurz aus, der Druck steigt oder der Scanner beschlaegt. Danach wird der finale rote Zuendkreis freigelegt. Er muss kontrolliert zwischen 0,9 und 1,8 Sekunden gehalten werden; ein einfacher Klick reicht nicht. Ein Fehler zieht 4,5 Sekunden vom Countdown ab und verbraucht eine von drei sichtbaren Chancen. Beim dritten Fehler oder bei null Sekunden platzt ausschliesslich die gezeichnete Comic-Windel; das Baby wird weder verletzt noch als explodierend dargestellt.

Vor jeder Runde erzeugt der Server einen einmaligen, zwei Minuten gueltigen Rundennachweis, speichert die vier Module, ihre Varianten und den Zwischenfall und prueft jeden Modulabschluss sowie das finale Haltefenster. Die Serverzeit bleibt massgeblich. In der `Tagesmission` erhalten alle Haeuser am selben Schweizer Kalendertag dieselbe Aufgabe; die Wertungszeit besteht aus Laufzeit plus 4,5 Sekunden je Fehler. Nur die beste persoenliche Tageszeit wird gespeichert. Die zehn schnellsten Konten aller Haeuser erscheinen in der gemeinsamen Tageswertung; zusaetzlich sieht jede Person den eigenen globalen Tagesrang. Andere Konten werden ausschliesslich als `Wickelprofi #Nummer` gezeigt, nicht mit Klingelschild-, Wohnungs- oder Hausnamen. `Bestwert loeschen` entfernt nur den eigenen heutigen Eintrag. Der Modus `Ueben` mischt eine neue Aufgabe, verwendet dieselben Regeln und schreibt keinen Highscore. Bewohner, Haus-Admins und Superadmins haben dieselben Spielrechte. Das Spiel erzeugt keine echten Waschladungen, Buchungen, Freigaben, Mitteilungen oder Benachrichtigungen. Ergebnisse der Spielversion 4 werden getrennt von frueheren Spielversionen gewertet.

Es kann jederzeit mit `Escape`, der Schliessen-Schaltflaeche oder einem Klick ausserhalb beendet werden; die Tastaturbedienung bleibt im geoeffneten Dialog.

Die Spieloberflaeche verwendet waehrend eines Einsatzes eine bildschirmfuellende responsive 2D-Spielbuehne statt der normalen Kartenoptik. Babyfigur, Handschuhe, Schalttafel, Hintergrundraster, Zwischenfaelle, Modulwechsel, Fehler und Finale reagieren animiert. Kabel lassen sich per Wischbewegung trennen, bleiben aber ebenso per Tastatur ausloesbar; Leiterbahn und Sicherungsringe besitzen beschriftete Tastenalternativen. Der Countdown wechselt in den letzten zehn Sekunden sichtbar in den kritischen Zustand. Optionaler, standardmaessig ausgeschalteter Synthesizer-Ton und kurze Geraetevibrationen verstaerken Treffer und Alarm ohne externe Mediendateien. Die globale Tageswertung wird waehrend des laufenden Einsatzes ausgeblendet und erst davor beziehungsweise danach gezeigt. Bei einer Betriebssystemeinstellung fuer reduzierte Bewegung werden Animationen und Uebergaenge automatisch auf ein Minimum gesetzt; alle Module bleiben per Tastatur bedienbar und Statuswechsel werden als Text ausgegeben.

### Einfuehrung und Quiz

| Bereich | Funktion |
| --- | --- |
| Aufgezeichnete Videos | Sechs echte MP4-Pakete mit rollen- und sprachgerechter AAC-Vertonung, passenden App-Szenen, VTT-Untertiteln, Poster und vollstaendigem Transkript abspielen |
| Rollenauswahl | Bewohner, Haus-Admin und Superadmin erhalten automatisch das passende deutsche oder englische Medienpaket und dieselbe interaktive Einfuehrung; bei kombinierten Verwaltungsrollen hat Superadmin Vorrang |
| Gemeinsame Quelle | Kapitel, Rollenbezug, Sprache, Startzeit, Kurzbeschreibung, Sprechertext und Transkript fuer Medien und interaktiven Rundgang aus `public/intro-content.js` beziehen |
| Kapitelnavigation | Sichtbare Kapitel im MP4 und im interaktiven Rundgang per Maus, Touch und Tastatur direkt waehlen; aktives Kapitel mit `aria-current` markieren |
| Sprachausgabe und Lesetext | Das MP4 mit deutscher oder englischer AAC-Vertonung abspielen; die optionale Browser-Sprachausgabe und derselbe vollstaendige Lesetext bleiben als Ergaenzung erhalten |
| Steuerung | Wiedergabe, Stummschaltung, vor und zurueck sowie direkten Kapitelsprung bedienen |
| Quiz | Drei alltagsnahe Fragen mit freundlicher Rueckmeldung beantworten |

Der aktuelle Kandidat besitzt sechs vollstaendige echte Medienpakete und sechs gleich aufgebaute interaktive Rollen-/Sprachfuehrungen:

| Paket | Datei | Dauer | Kapitel |
| --- | --- | ---: | ---: |
| Bewohner Deutsch | `resident-de.mp4` | 04:02 | 9 |
| Bewohner Englisch | `resident-en.mp4` | 04:02 | 9 |
| Haus-Admin Deutsch | `house-admin-de.mp4` | 04:58 | 11 |
| Haus-Admin Englisch | `house-admin-en.mp4` | 04:58 | 11 |
| Superadmin Deutsch | `superadmin-de.mp4` | 04:40 | 10 |
| Superadmin Englisch | `superadmin-en.mp4` | 04:40 | 10 |

Alle Videos liegen als H.264 High, 1280 x 720 und AAC-LC mono vor. Zu jedem MP4 gehoeren gleichnamige `.vtt`-Untertitel, ein `-poster.png` und ein `.txt`-Transkript unter `public/assets/intro/media/`. `public/intro-media.js` verbindet die Dateien mit den gemeinsamen Kapitelstarts. Ein Sprachwechsel waehlt das neue Paket ohne Reload und erhaelt nach Moeglichkeit das Kapitel mit derselben ID.

Fuer die PWA werden Manifest, Poster, Untertitel und Transkripte in die Offline-Shell aufgenommen. Die sechs MP4-Dateien umfassen zusammen rund 9,3 MB und werden weder vorab noch im Laufzeitcache gespeichert. Dadurch bleibt ein App-Update klein; ohne Netz erscheint der Transkript-Fallback, waehrend ein bereits vom Browser gepuffertes Video nicht als verlaessliche Offline-Funktion versprochen wird.

## Verwaltungsansicht

Nach `Verwalten` erscheint oben die eigene Adminrolle mit einem kurzen Auftrag und ihrem Geltungsbereich. Der Startbereich trennt `Aufgaben`, `Warnungen` und `Informationen` mit hoechstens drei Prioritaetsstufen. Jede Zeile nennt eine konkrete naechste Aktion wie `Stoerung bearbeiten`, `Funktionspruefung durchfuehren`, `Einladung erneut senden`, `Konto pruefen` oder `Geraet anzeigen` und springt direkt in den passenden Arbeitsbereich. Offene Einladungen und Dauertermine erscheinen als Information; fehlende E-Mail, gesperrte Ressourcen, Nachfolge, E-Mail, Backup, Wartung und auffaellige Auditaktionen als passende Warnung. Superadmins sehen ausserdem Version und Releasekennung; globale Tagebuchaufgaben nennen das betroffene Haus. Haus-Admins sehen nur Aufgaben, die sie im eigenen Haus erledigen duerfen. Auf Tablets verteilt sich die Navigation auf zwei vollstaendig sichtbare Zeilen, auf kleinen Bildschirmen wird auch die Aufgabenansicht einspaltig. Die Reiter lassen sich zusaetzlich mit den Pfeiltasten wechseln.

### 1. Ueberblick

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Aktive Nutzer des ausgewaehlten Hauses | Ja | Ja |
| Konten ohne E-Mail als Warnung anzeigen | Ja | Ja |
| Heutige Buchungen | Ja | Ja |
| Aktive Geraete und Raeume | Ja | Ja |
| Anzahl Dauertermine und Freigaben | Ja | Ja |
| Offene Tagebuchfaelle | Ja | Ja |
| E-Mail- und Backupstatus | Ja | Ja |
| Rollenbezogene Aufgaben nach Dringlichkeit | Ja | Ja |
| Direkter Sprung von einer Aufgabe zum Arbeitsbereich | Ja | Ja |
| Dauerhafte Verantwortungen der eigenen Rolle | Ja | Ja |

Der Haus-Admin-Auftrag umfasst Wohnungsaktivierung, Kontobetreuung, Geraete und Raeume, den vollstaendigen Stoerungsablauf, begruendete Dauertermine sowie die Betriebskontrolle des eigenen Hauses. Normale Bewohnerbuchungen gehoeren ausdruecklich nicht zu seinen Aufgaben. Der Superadmin verantwortet zusaetzlich Haeuser, Rollen, Nachfolge, Backups, Wartung und den hausuebergreifenden Tagebuchblick; Alltagsaktionen gelten weiterhin fuer das oben ausgewaehlte Haus.

### 2. Haus und Geraete

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geraet oder Raum anlegen | Ja | Ja |
| Ressource umbenennen | Ja | Ja |
| Ressource mit Grund sperren und automatisch im Tagebuch erfassen | Ja | Ja |
| Neues Haus mit Standardressourcen anlegen | Nein | Ja |
| Haus anzeigen, umbenennen, aktivieren oder deaktivieren | Nein | Ja |

Die Oberflaeche zeigt zuerst Gesamtbestand, einsatzbereite und gesperrte Ressourcen und ordnet den Bestand danach in Waschmaschinen, Trockenraeume und Tumbler. Anlage- und Umbenennungsformulare bleiben geschlossen, bis sie bewusst geoeffnet werden. Gesperrte Ressourcen zeigen Grund und direkten Sprung in das Tagebuch. Die Hausliste ist davon getrennt und nur fuer Superadmins sichtbar.

Ressourcen, Wohnungen und Einladungen sind immer auf das aktive Haus begrenzt. Die interne Wohnungsbezeichnung bleibt bei einem Bewohnerwechsel bestehen. Der Haus-Admin verwaltet den Klingelschildnamen; eine Konto-E-Mail wird bei der Einladung festgelegt und danach nur durch das geschuetzte Wohnungskonto selbst geaendert. Eine Sicherheitssperre ist auch bei kommenden Buchungen moeglich, nimmt die Ressource sofort aus der Buchungsauswahl und erzeugt einen Tagebuchfall. Eine direkte Aktivierung ist danach gesperrt; die Freigabe erfolgt ausschliesslich ueber den geprueften Tagebuchablauf. Ein Haus mit aktiven Konten oder kommenden Buchungen kann nicht deaktiviert werden.

### 3. Maschinen- und Raumtagebuch

| Funktion | Bewohner | Haus-Admin | Superadmin |
| --- | :---: | :---: | :---: |
| Stoerung mit Ressource, Titel und Beobachtung melden | Ja | Nein | Nein |
| Status eigener Meldungen sehen | Ja | Nein | Nein |
| Alle Faelle des eigenen Hauses sehen und durchsuchen | Nein | Ja | Ja |
| Faelle aller Haeuser sehen | Nein | Nein | Ja |
| Ressource sperren | Nein | Ja | Ja |
| Reparatur dokumentieren | Nein | Ja | Ja |
| Funktionspruefung als erfolgreich oder nicht erfolgreich dokumentieren | Nein | Ja | Ja |
| Nach erfolgreicher Pruefung mit Abschlussnotiz freigeben | Nein | Ja | Ja |
| Bestehende Eintraege loeschen oder veraendern | Nein | Nein | Nein |
| Zu einem abgeschlossenen Fall eine spaetere Notiz ergaenzen | Nein | Ja | Ja |

Der technische Ablauf ist verbindlich: `Meldung -> Sperre -> Reparatur -> Funktionspruefung -> Freigabe`. Weitere Bewohnermeldungen zur gleichen Ressource werden in den bereits offenen Fall aufgenommen, statt konkurrierende Faelle zu erzeugen; jede meldende Wohnung sieht diesen Fall bei den eigenen Meldungen. Eine nicht erfolgreiche Funktionspruefung setzt den Fall nicht weiter und die Ressource bleibt gesperrt. Erst eine erfolgreiche Pruefung schaltet die Aktion `Freigeben und abschliessen` frei. Jede Aktion verlangt eine sachliche Notiz; bei der Freigabe dient sie als Abschlussnotiz, zum Beispiel `Ablaufpumpe ersetzt, Probelauf erfolgreich`. Faelle und Chronikzeilen besitzen absichtlich keine Loeschschnittstelle. Der Haus-Admin arbeitet nur im eigenen Haus. Der Superadmin sieht alle Haeuser und darf bei Bedarf eingreifen; sein Eingriff wird dem betroffenen Haus zugeordnet und auditiert.

In der Verwaltung stehen neu gemeldete Faelle vor Reparatur- und Prueffaellen. Die Chronik bleibt zunaechst geschlossen, damit auch viele Eintraege scanbar bleiben, und kann pro Fall geoeffnet werden. Suche und Statusfilter bleiben gleichzeitig nutzbar.

### 4. Dauertermine

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geschuetzten woechentlichen Termin anlegen | Ja | Ja |
| Name, Ressource, Wochentag und Slot festlegen | Ja | Ja |
| Dauertermin entfernen | Ja | Ja |
| Ueberschreiben durch normale Buchung verhindern | Automatisch | Automatisch |

Auch bei festen Tumbler-Terminen bleibt mindestens ein Tumbler frei. Ein Dauertermin wird abgelehnt, wenn bereits eine normale zukuenftige Buchung im gleichen wiederkehrenden Termin liegt.

Das Anlageformular ist im Alltag eingeklappt. Bestehende Dauertermine werden nach Wochentag, Uhrzeit und Ressource sortiert.

### 5. Wohnungen und Konten

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Wohnung mit Klingelschildname und Ziel-E-Mail anlegen und einladen | Ja | Ja |
| Weitere Person mit eigener E-Mail in eine aktive Wohnung einladen | Ja | Ja |
| Stabile Wohnungsbezeichnung und Klingelschildname getrennt festlegen | Ja | Ja |
| Klingelschildname eines Wohnungskontos aktualisieren | Ja | Ja |
| E-Mail-Adressen eines fremden Wohnungskontos ersetzen | Nein | Nein |
| Namenskorrektur eines Bewohners uebernehmen oder ablehnen | Ja | Ja |
| Offene oder abgelaufene Einladung durch einen neuen Link ersetzen | Ja | Ja |
| Konten des aktiven Hauses sehen | Ja | Ja |
| Bewohner aktivieren oder deaktivieren | Ja | Ja |
| Reset-Link an bestaetigte Bewohner-E-Mail senden | Ja | Ja |
| Nach persoenlicher Identitaetspruefung einen Einmalcode fuer Bewohner ohne bestaetigte E-Mail erzeugen | Ja | Ja |
| Anderen Haus-Admin verwalten | Nein | Ja |
| Einer Identitaet das zusaetzliche Haus-Adminrecht geben oder entziehen | Nein | Ja |
| Aktivem Haus-Admin zusaetzliche Superadminrechte geben oder wieder entziehen | Nein | Ja |
| Konto in ein anderes Haus verschieben | Nein | Ja |
| Superadmin-Konto deaktivieren, verschieben oder fremde E-Mail aendern | Nein | Nein |
| Eigenes Passwort ohne bisheriges Passwort zuruecksetzen | Nein | Nein |
| Pilotbestand nach geprueftem Backup, Bestaetigungstext und aktuellem Passwort vollstaendig bereinigen | Nein | Ja |

Beim Verschieben muessen kommende Buchungen des Kontos vorher entfernt werden. Nach einem Umzug wird das Konto aus Sicherheitsgruenden wieder Bewohner. Admins koennen fremde Passwoerter weder sehen noch selbst festlegen und fremde E-Mail-Adressen nicht ersetzen. Sie senden nur einen zeitlich begrenzten Link an eine bestaetigte E-Mail-Adresse. Fehlt jede bestaetigte Adresse, darf nach persoenlicher Identitaetspruefung ein 15 Minuten gueltiger Einmalcode erzeugt und direkt an die berechtigte Person ausgegeben werden. Das Erzeugen beendet bestehende Sitzungen und wird auditiert. Erst die Person selbst setzt mit dem Code eine neue E-Mail und ein neues Passwort; Wohnung, Buchungen, Push-Geraete und Protokollbezuege bleiben erhalten. Das eigene Passwort wird im Buchungsbereich mit dem bisherigen Passwort geaendert.

Der Pilot-Reset ist ausschliesslich fuer eine kontrollierte Bereinigung vor dem Echtbetrieb vorgesehen. Er verlangt das aktuelle Passwort des handelnden Superadmins und den exakten Bestaetigungstext `ALLE TESTKONTEN LOESCHEN` und erstellt vorab ein geprueftes SQLite-Backup. Er entfernt alle Bewohner- und normalen Haus-Admin-Konten samt Sitzungen, Buchungen, Push-Geraeten und Wohnungszuordnungen. Superadmin-Konten, Wohnungen, Ressourcen, Dauertermine und technische Protokolle bleiben erhalten. Freie Wohnungen werden anschliessend bewusst neu per E-Mail eingeladen.

Das Formular fuer eine neue Wohnung ist eingeklappt. Eine gemeinsame Suche filtert Wohnungs- und Kontenlisten nach Klingelschildname, Wohnungsbezeichnung oder E-Mail-Adresse.

### 6. Auswertung

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Buchungszahlen der letzten und naechsten 30 Tage sehen | Ja | Ja |
| Nutzung nach Ressource, Bereich und Slot sehen | Ja | Ja |
| Aktivste Nutzer des Hauses sehen | Ja | Ja |
| Gesperrte Ressourcen mit Grund sehen | Ja | Ja |

Die Auswertung dient der Betriebsuebersicht im Haus. Sie ist kein Bewohner-Ranking fuer den Aushang.

### 7. System

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Testmail an die konfigurierte Betriebsadresse oder eigene hinterlegte Adresse senden | Ja | Ja |
| Aktive Push-Geraete des Hauses sehen und Testpush senden | Ja | Ja |
| Letzte Admin-Aktionen des Hauses sehen | Ja | Ja |
| Alle normalen Buchungen des aktiven Hauses mit Bestaetigungstext und aktuellem Passwort loeschen | Ja | Ja |
| Notfallstatus fuer Admins, Superadmin und Seed-Recovery sehen | Ja | Ja |
| Superadminrecht mit aktuellem Passwort einem aktiven Haus-Admin geben oder entziehen | Nein | Ja |
| Hausuebergreifendes Admin-Protokoll sehen | Nein | Ja |
| Geprueftes Backup sofort erstellen | Nein | Ja |
| SQLite-Backup herunterladen | Nein | Ja |
| Globalen Wartungsmodus mit aktuellem Passwort und automatischem Backup starten | Nein | Ja |
| Wartung nach Datenbank- und Buchungspruefung beenden | Nein | Ja |
| Warnung bei fehlender externer Backup-Kopie sehen | Ja | Ja |

Der Buchungsreset loescht keine Konten und keine Dauertermine. Er verlangt das aktuelle Passwort des handelnden Admins sowie den Text `ALLE BUCHUNGEN` und wird im Admin-Audit protokolliert. Auch Vergabe oder Entzug von Superadminrechten, Pilot-Reset und Start des globalen Wartungsmodus pruefen das aktuelle Passwort serverseitig unmittelbar vor der Aktion. Die Oberflaeche speichert diese Passwoerter nicht und leert das jeweilige Eingabefeld beim Ausloesen der Aktion. Das Beenden einer bereits laufenden Wartung bleibt nach erfolgreicher System- und Buchungspruefung ohne erneute Passworteingabe moeglich.

Die App behaelt lokal die drei neuesten Sicherungen sowie je eine Sicherung pro Tag fuer bis zu 14 Tage. Liegt die externe Kopie auf demselben Render-Datentraeger nicht vor, zeigt der Ueberblick eine Warnung. Fuer einen Ausfall des Render-Datentraegers muss `BACKUP_UPLOAD_URL` auf einen unabhaengigen Speicher zeigen.

Der Systemreiter gliedert die vorhandenen Funktionen in `Betrieb`, `Benachrichtigungen` sowie `Verantwortung & Protokoll`. Gefaehrliche Aktionen bleiben geschlossen und optisch von Testmail und Testpush getrennt.

### App-Updates und Wartung

- Jeder Push erhoeht die sichtbare Versionsnummer. Waehrend des Piloten verwendet die App Vorabversionen nach dem Schema `0.3.0-test.1`, `0.3.0-test.2` und so weiter und zeigt den Status `Testversion`. Erst eine ausdrueckliche Produktfreigabe erlaubt den Wechsel auf `1.0.0`.
- Jede ausgelieferte Seite kennt ihre geladene Releasekennung. Die App fragt den aktuellen Serverstand beim Start, beim Zurueckkehren in die App und danach alle zwei Minuten ab.
- HTML, JavaScript und CSS tragen dieselbe Releasekennung in ihren Asset-URLs. Dadurch kann kein neuer Seitenaufbau versehentlich mit einer alten zwischengespeicherten Programmlogik kombiniert werden.
- Ist ein neuer Stand verfuegbar, erscheint der sichtbare Hinweis `Eine neue Version ist verfuegbar` mit `Jetzt aktualisieren`. Erst nach dieser Zustimmung aktiviert der Service Worker den neuen Stand und laedt die Seite neu.
- Eine bereits begonnene Buchungsauswahl wird nie durch ein Update unterbrochen. Die Zustimmung wird vorgemerkt; das Neuladen erfolgt erst, wenn die Auswahl abgeschlossen oder verworfen wurde.
- Unter `Einstellungen` > `App & Geraet` stehen Versionsnummer und Auslieferungsdatum. `Nach Update suchen` prueft den Stand sofort.
- Fuer groessere Datenbank- oder Betriebsarbeiten startet ausschliesslich der Superadmin unter `Verwalten` > `System` den globalen Wartungsmodus. Der Start verlangt zur erneuten Bestaetigung das aktuelle Superadmin-Passwort. Vor der Sperre erstellt und prueft der Server automatisch ein SQLite-Backup.
- Waehrend der Wartung bleiben Anmeldung, Abmeldung, Health- und Lesezugriffe erreichbar. Alle anderen schreibenden Anfragen werden serverseitig mit `503 MAINTENANCE_MODE` abgelehnt. Bewohner sehen einen ruhigen Wartungsdialog; bestehende Buchungen bleiben unveraendert.
- Beim Beenden muessen SQLite-`quick_check` und eine sofort wieder entfernte Testbuchung erfolgreich sein. Bei einem Fehler bleibt die Wartung aktiv. Start, erfolgreicher Abschluss und Fehler werden im Admin-Audit festgehalten.
- `/api/health` liefert Version, Releasekennung und Wartungsstatus. `/api/version` stellt denselben Release- und Wartungsstand fuer PWA und Browser bereit.

## E-Mail-Hinweise

- Eine neue oder geaenderte E-Mail-Adresse muss bestaetigt werden.
- Eine erste E-Mail-Adresse ist fuer jede persoenliche Identitaet Pflicht; eine zweite eigene Wiederherstellungsadresse ist optional. Eine Adresse kann systemweit nur einer Identitaet gehoeren.
- E-Mail-Adressen werden ausschliesslich durch die angemeldete Person oder bei einer persoenlich geprueften Wiederherstellung durch die betroffene Person selbst gesetzt; Admins koennen sie nicht direkt ersetzen.
- Ohne Bestaetigung werden keine Freigabe-Hinweise und keine Passwort-Reset-Links versendet.
- `Frueher frei` ist nur waehrend des aktuell gebuchten Slots moeglich.
- `Absagen und informieren` ist nur vor Beginn des gebuchten Slots moeglich.
- Nach Slotende wird keine Freigabemail mehr ausgeloest.
- Empfaenger muessen im selben Haus sein und passende Filter fuer Bereich, Wochentag und Slot aktiviert haben.
- `Loeschen` entfernt eine Buchung ohne Rundmail.
- Ohne eingerichteten SMTP-Zugang funktioniert die bestehende Buchungsapp weiter, versendet aber keine E-Mails und kann keine neuen Wohnungskonten einladen.

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

- Wohnungseinladung, siebentaegige und einmalige Aktivierung, bestaetigte Ziel-E-Mail, persoenlicher Partner-QR, einmalige Codeverwendung, bestehende Identitaet sowie Sitzungsende.
- E-Mail-Bestaetigung, Passwort-Wiederherstellung, Passwortwechsel und echte SMTP-Zustellung eines passenden Freigabe-Hinweises.
- Admin-ausgeloester Passwort-Reset nur als Link an eine bestaetigte E-Mail; ein Admin kann kein fremdes Passwort festlegen.
- Einzelbuchung, Waschpaket, Vorschlag, Kalender, Freigabe und Absage.
- Waschmaschinen-, Trockenraum- und Tumblerregeln inklusive Parallelzugriff.
- Bewohner-, Haus-Admin- und Superadminrechte sowie Fremdhaus-Isolation.
- Kombinierte Bewohner-/Hausadmin-Rolle sowie die gesperrte Buchungserstellung fuer reine Admin- und Superadmin-Konten.
- Schutz von Haus-Admins vor Eingriffen durch gleichrangige Haus-Admins.
- Feste Buchungen, Benutzerverwaltung, Geraeteverwaltung, Audit und Backups.
- PWA-Dateien, Push-Abo, Push-Test und Freigabe-Hinweise ueber Push.
- Releaseerkennung, bestaetigtes PWA-Update, Wartungsrechte, Schreibsperre, automatisches Backup und Buchungs-Schreibtest.
- Datenschutzexport, Kontoloeschung, Sicherheitsheader und Barrierefreiheit.
- Verknuepfung statischer JavaScript-Ziele mit tatsaechlich vorhandenen HTML-Elementen auf Anmelde-, Waschplan- und Reset-Seite.
- Vollstaendigkeit der zentralen `de/en`-Schluessel, deutscher Rueckfall, lokale und kontobezogene Sprachpersistenz, sechs Rollen-/Sprachfuehrungen, Kapitelmetadaten sowie englische Mail- und Push-Vorlagen.
- Sechs echte MP4/VTT/Poster/Transkript-Pakete, Codecmarker, 1280-x-720-Format, Laufzeiten, Untertitelzeitfolge, Textvollstaendigkeit und PWA-Groessenvertrag.
- Mehrhaus-Jahressimulation mit 100 Personen in sechs Haeusern, 52 Wochen und 5.200 Waschpaketen.

### Testbefehle

| Befehl | Zweck |
| --- | --- |
| `npm run verify` | Syntax aller zentralen Dateien pruefen |
| `npm run test:security` | Sicherheitsheader, Origin-Schutz, Sitzungen, Einladungen, Anmeldewege, Einmalcodes, Passwortregeln und Rate-Limits dynamisch pruefen |
| `npm run test:i18n` | Deutsche und englische Schluessel, Rueckfall, Persistenzvertrag, sechs Rollenfuehrungen, Kapitel und Benachrichtigungsvorlagen pruefen |
| `npm run test:media` | Sechs MP4/VTT/Poster/Transkript-Pakete, H.264/AAC-Marker, Format, Laufzeit, Textvollstaendigkeit und PWA-Cachegrenzen pruefen |
| `npm test` | Vollstaendige API- und Funktionsablaeufe pruefen |
| `npm run test:roles` | Rollen, Rechte, Hausisolation und Abmeldung pruefen |
| `npm run test:year` | Ein Jahr mit 100 Bewohnerkonten in sechs getrennten Haeusern simulieren |
| `npm run test:backup` | Externe PUT-Kopie, Tokenuebertragung, SQLite-Integritaet und den Neustart aus einer wiederhergestellten Sicherung pruefen |
| `npm run test:e2e` | Verbindlichen Browserlauf fuer Einladung, persoenlichen QR-Zugang, alle sechs Medienpakete mit Kapitelsprung sowie visuelle Layoutpruefung bei 390 x 844, 768 x 1024 und 1440 x 900 ausfuehren |
| `npm run test:a11y` | Statische Barrierefreiheitspruefung ausfuehren |
| `npm run audit` | Den ausfuehrlichen Gesamtaudit inklusive Backup-Wiederherstellung und verbindlichem Browsertest Schritt fuer Schritt ausfuehren |
| `npm run check` | Verbindliches Abschluss-Gate aus Syntax-, Sicherheits-, Funktions-, Rollen-, Jahres-, Barrierefreiheits-, Backup- und Browsertest ausfuehren |

Der vollstaendige Katalog mit Pruef-ID, Soll-Ergebnis und Automatisierungsweg steht in `TESTPLAN_GESAMTAUDIT.md`. Externe Live-Dienste und reale Mobilgeraete werden dort als eigener manueller Abnahmeblock gefuehrt und duerfen nicht durch lokale Mocks als produktiv bestaetigt gelten.

## Entwicklerreferenz

### Agentenrollen

Der verbindliche Katalog fuer Unternehmensleitung, Technik, Entwicklung, Pilot, Business, Organisation, Recht, unabhaengige Endabnahme und externe Beratung steht in `.agents/ROLES.md`. Der Nutzer bleibt Eigentuemer und Auftraggeber. Die bestehenden technischen Aufgaben wurden in die neue Hierarchie ueberfuehrt; fuer die fuenf neuen Unternehmensfunktionen bestehen eigene Codex-Aufgaben:

| Nr. | Codex-Aufgabe | Berichtslinie |
| --- | --- | --- |
| `00` | `00 · CEO – Unternehmensleitung` | direkt an Eigentuemer/Auftraggeber |
| `10` | `10 · CTO – Produkt & Technik` | an Unternehmens-CEO |
| `20` | `20 · Engineering Lead – Senior Full-Stack` | an CTO |
| `21` | `21 · Junior Developer – Bugfix & Wartung` | an Engineering Lead; kritische Befunde auch an CTO |
| `22` | `22 · Specialist Developer – Frontend & Windel-Alarm` | fuer Integration an Engineering Lead |
| `30` | `30 · Senior QA – Test & Abnahme` | unabhaengig direkt an Unternehmens-CEO; technische Befunde an CTO |
| `40` | `40 · DevOps & Integration – E-Mail, Push & Betrieb` | an CTO |
| `50` | `50 · Product Operations – Pilot & Beteiligte` | direkt an Unternehmens-CEO |
| `60` | `60 · Business & Growth – Finanzen & Vermarktung` | an Unternehmens-CEO |
| `70` | `70 · People & Organisation – HR & Rollen` | an Unternehmens-CEO |
| `80` | `80 · Legal & Compliance – Recht & Datenschutz` | an Unternehmens-CEO; kritische Rechtsrisiken auch an Eigentuemer |
| `90` | `90 · External Advisory – Unabhaengiges Review` | unabhaengig an Eigentuemer und Unternehmens-CEO |

Die Teambezeichnungen steuern Fuehrung und Kommunikation. Fachliche Rollen-IDs wie `BUCHUNGEN`, `FRONTEND_UX`, `BENACHRICHTIGUNGEN` oder `RELEASE` werden weiterhin je Arbeitspaket ausdruecklich zugewiesen. Sie sind keine Benutzerrollen der App und erzeugen keine zusaetzlichen Produkt-, Datei- oder Produktionsrechte. Die historische technische Rollen-ID `CEO_TECHNIK` bleibt bestehen und wird vom CTO wahrgenommen. Der Unternehmens-CEO koordiniert die Gesamtfirma, ersetzt aber weder CTO-, QA-, Rechts- noch Eigentuemerentscheide.

`BUGFIXER` ist die Rollen-ID des Junior Developers fuer kleine, klar abgegrenzte Fehlerkorrekturen. Der CTO priorisiert den technischen Befund; Engineering Lead konkretisiert den Auftrag, prueft Domaenengrenzen und fuehrt das Fachreview. Kritische Sicherheits-, Datenschutz-, Daten-, Rollen-, Hausgrenzen- oder Produktionsbefunde gehen sofort auch an den CTO. Die unabhaengige Endabnahme verbleibt bei Senior QA; der Junior gibt niemals selbst frei.

`PILOT_BETREUUNG` wird durch `50 · Product Operations – Pilot & Beteiligte` wahrgenommen und berichtet an den Unternehmens-CEO. Die Rolle holt Bewohner, Hausdienst, Tester, Sitzungskommission und weitere Beteiligte ins Boot. Alltagsfeedback, QA-Urteil, technische CTO-Freigabe, Rechtspruefung und institutioneller Entscheid bleiben getrennt.

Business & Growth verantwortet wirtschaftliche Modelle und Vermarktung, People & Organisation die regelmaessige Rollenpruefung und Legal & Compliance die Rechts- und Datenschutzpruefung. Keine dieser Rollen darf ohne Freigabe externe Zusagen, Rollen- oder Produktveraenderungen vornehmen. External Advisory bleibt ausserhalb der Befehlskette und liefert mindestens quartalsweise sowie vor Pilot-/Live-Entscheiden einen unabhaengigen Blick an Eigentuemer und CEO.

Fuer Arbeiten am Minispiel ist `WINDEL_ALARM` die fuehrende Rollen-ID von `22 · Specialist Developer – Frontend & Windel-Alarm`. Gemeinsame Oberflaechen und Integrationspunkte werden mit Engineering Lead abgestimmt. Aenderungen an Schema, allgemeinen Rollenrechten, Buchungen oder Produktion erfordern eine zusaetzliche Zuweisung und Freigabe durch den CTO.

### Aufbau

| Pfad | Verantwortung |
| --- | --- |
| `server.js` | Composition Root, SQLite-Datenmodell, globale Sitzungs- und Rechtepruefung sowie Einhaengen der Fachmodule |
| `src/routes/accounts.js` | Gekapselte Anmeldung, Einladung, QR-Zugang, Verifikation, Wiederherstellung und persoenliche Kontorouten |
| `src/routes/bookings.js` | Gekapselte Kalender-, Buchungs-, Waschpaket-, Freigabe- und Dauerterminrouten |
| `src/routes/diaper-game.js` | Gekapselte API-Routen, serverseitige Rundenwertung und Bestenliste des Windel-Alarms |
| `src/routes/equipment-logbook.js` | Gekapselte Bewohner- und Verwaltungsrouten fuer Geraete, Stoerungsmeldungen und das Maschinentagebuch |
| `src/routes/houses-roles.js` | Gekapselte Haus-, Wohnungs-, Benutzer-, Rollen-, Recovery- und Superadmin-Berechtigungsrouten |
| `src/routes/notifications.js` | Gekapselte Push-, Hinweis-, Freigabe- und Admin-Testrouten fuer Benachrichtigungen |
| `src/routes/operations.js` | Gekapselte Health-, Versions-, Audit-, Backup-, Wartungs-, Uebersichts-, Analyse- und Pilot-Reset-Routen |
| `src/services/account-security.js` | Passwortpruefung, Authentifizierungs-Rate-Limits sowie E-Mail-, Passwort- und Zugangscode-Validierung |
| `src/services/account-service.js` | Wohnungs- und Einladungszuordnung, Kontonamen sowie Regeneration und Invalidierung von Sitzungen |
| `src/services/backup.js` | Gekapselte Erstellung, Integritaetspruefung, Aufbewahrung und externe Kopie von SQLite-Backups |
| `src/services/booking-rules.js` | Buchungsregeln, Kalenderkapazitaeten, Waschpaketoptionen und Terminempfehlungen |
| `src/services/mail-transport.js` | SMTP-Konfiguration und Transport fuer ausgehende E-Mails |
| `src/services/localization.js` | Serverseitige `de/en`-Vorlagen fuer Verifizierung, Reset, Freigabe, Testmail und Push |
| `src/services/notifications.js` | E-Mail-Bestaetigung, Passwortreset und gemeinsame Freigabe-Benachrichtigungen |
| `src/services/operations.js` | Wartungsstatus, Freigabestand, Selbstpruefung, zeitgesteuerte Backups und betriebliche Datenbereinigung |
| `src/services/push.js` | VAPID-Konfiguration, Push-Payloads, Geraetezustand und Push-Versand |
| `src/services/role-context.js` | Kumulativer Rollen-, Haus-, Wohnungs- und Sitzungskontext sowie Admin-Wiederherstellungsstatus |
| `swiss-time.js` | Datums- und Slotberechnung in Schweizer Zeit |
| `release-window.js` | Zeitfenster fuer Freigaben und Absagen |
| `public/login.html`, `public/login.js` | Landingpage, Anmeldung und Einladungsannahme |
| `public/i18n.js` | Zentraler Browserkatalog, deutscher Rueckfall, DOM-Lokalisierung und lokale/kontobezogene Sprachwahl |
| `public/intro-content.js` | Strukturierte Kapitelquelle fuer sechs Rollen-/Sprachfuehrungen |
| `public/intro-media.js`, `public/assets/intro/media/` | Medienmanifest und sechs echte H.264/AAC-Pakete mit VTT, Poster und Transkript |
| `public/index.html`, `public/app.js` | Waschplan, Konto, rollenbezogene Einfuehrung und priorisierte Verwaltung |
| `public/manifest.webmanifest`, `public/sw.js` | PWA-Installation, Offline-Shell und Push-Anzeige |
| `public/styles.css` | Gemeinsames responsives Erscheinungsbild |
| `scripts/` | Funktions-, Rollen-, Jahres-, Medien- und Barrierefreiheitstests sowie reproduzierbarer Mediengenerator |
| `.agents/ROLES.md` | Verbindliche Rollen, Dateibereiche, Schnittstellen, Akzeptanzkriterien und Pflichtpruefungen fuer technische Arbeitspakete |
| `PILOTPAKET.md` | Technisches, unabhaengiges QA- und erforderliches institutionelles Gate, externe Datenablagepflichten, Teilnahmeinformation, Beteiligtenmatrix, Einladungs- und Einweisungsplan sowie Feedback-, Entscheidungs- und Lageberichtvorlagen fuer den Kleinstpiloten mit 3 bis 5 Wohnungen |
| `TESTPLAN_GESAMTAUDIT.md` | Vollstaendiger Pruefkatalog fuer Sicherheit, Konten, Rollen, Regeln, Betrieb und Live-Abnahme |
| `TESTPROTOKOLL_2026-07-20.md` | Ausgefuehrter Tiefentest mit automatischen Ergebnissen, praktischen Funktionsketten, Befunden und Restgrenzen |
| `PRUEFBERICHT_GESAMTAUDIT_2026-07-19.md` | Ausgefuehrte Ergebnisse, behobene Fehler, Restrisiken und priorisierte Anpassungsvorschlaege |
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
- Jede Wohnung, jedes Konto, jede Ressource, Buchung und Freigabe ist einem Haus zugeordnet. Oeffentliche Buchungsnamen verwenden ausschliesslich den adminverwalteten Klingelschildnamen.
- `apartments` speichert die stabile Wohnungsbezeichnung, den aenderbaren Klingelschildnamen, Haus und Aktivierungsstatus. `apartment_invitations` speichert Ziel-E-Mail, Ablauf, Versand- und Annahmestatus; Einladungstoken und Geraetecodes liegen ausschliesslich als SHA-256-Hash vor. Der Klartextlink wird im Produktivbetrieb nur fuer die E-Mail erzeugt und nie ueber die Admin-API ausgegeben. Isolierte Entwicklungstests duerfen ihn mit `ALLOW_TEST_INVITATION_LINK=true` erhalten; der Schalter wird im Produktionsmodus immer ignoriert und aktiviert die alte Registrierung nicht.
- `apartment_name_requests` speichert offene und entschiedene Korrekturwuensche. Ein Bewohnerwunsch aendert den sichtbaren Namen nie direkt; Freigabe oder Ablehnung erfolgt durch einen Admin und wird auditiert.
- `users` speichert genau eine persoenliche Identitaet pro eindeutiger E-Mail. `users.apartment_id` bindet mehrere Identitaeten an dieselbe Wohnung; `apartments.claimed_by` bezeichnet nur den stabilen technischen Buchungseigentuemer. Dadurch teilen alle Mitglieder Buchungen und Vorausbuchungsgrenzen.
- `users.language` speichert ausschliesslich `de` oder `en` mit Standard `de`. Die additive Migration setzt bestehende und ungueltige Werte sicher auf Deutsch zurueck.
- `user_house_roles` speichert Haus-Adminrechte unabhaengig von der Wohnungsmitgliedschaft. `users.is_superadmin` bleibt die globale Zusatzberechtigung. QR-Partnercodes schreiben ausschliesslich die Wohnungszuordnung und niemals eine Admin- oder Superadminberechtigung.
- Bewohner und Haus-Admins duerfen keine Daten eines anderen Hauses lesen oder veraendern.
- Nur der Superadmin darf das aktive Haus wechseln und hausuebergreifende Aktionen ausfuehren.
- Rollen- und Hausgrenzen muessen immer serverseitig durchgesetzt und im Rollentest abgedeckt werden.
- `SEED_ADMIN_NAME` bezeichnet das bestehende oder neu anzulegende Superadmin-Konto. Ist `SEED_ADMIN_PASSWORD` gesetzt, wird dieses Konto beim Start als aktiver Superadmin sichergestellt, ohne ein bereits geaendertes Passwort zu ueberschreiben.
- `SEED_ADMIN_FORCE_PASSWORD_RESET=true` darf nur temporaer im Notfall gesetzt werden. Dann wird das Passwort des Seed-Superadmins beim Start auf `SEED_ADMIN_PASSWORD` gesetzt. Danach muss der Schalter wieder entfernt werden.
- `SESSION_IDLE_MINUTES` legt die Inaktivitaetsgrenze in Minuten fest. Standard und Render-Konfiguration sind 30 Minuten; Werte werden aus Sicherheitsgruenden auf 5 bis 480 Minuten begrenzt.

### Deployment

Der GitHub-Workflow `.github/workflows/deploy-render.yml` installiert Chromium und fuehrt `npm run check` aus. Der verbindliche Browserlauf erzeugt Screenshots fuer Mobiltelefon, Tablet und Desktop; GitHub bewahrt sie 14 Tage als Testartefakt auf. Nur bei vollstaendigem Erfolg ruft der Workflow den als Repository-Secret gespeicherten Render Deploy Hook auf. Produktion soll erst als aktuell gelten, wenn `/api/health` den erwarteten Git-Commit meldet.

## Aenderungsprotokoll

### 22. Juli 2026

- I18N-P2 im Bewohnerbereich geschlossen: Hero, `Meine Buchungen`, Leerzustand, Kalenderstatus, persoenliche Empfehlung, Buchungsassistent, Einzelbuchung und sichtbare Freigabehinweise werden bei DE -> EN und EN -> DE ohne Reload neu lokalisiert. Der E2E-Leakdetektor prueft nun den gesamten sichtbaren Bewohnerbereich und weist die vier QA-Ausgangstexte sowie weitere bekannte deutsche Systemtexte im englischen Zustand ab; Haus, Rolle, Kalender, Buchungsauswahl, Einstellungsreiter, Eingaben und Fokus bleiben erhalten.
- Unternehmensorganisation erweitert und vollstaendig verbunden: Der Nutzer ist Eigentuemer, `00 · CEO – Unternehmensleitung` fuehrt die Firma, und die bisherige technische Gesamtleitung arbeitet als `10 · CTO – Produkt & Technik`. Bestehende Entwicklung, QA, DevOps und Pilotbetreuung wurden neu nummeriert; eigene Aufgaben fuer Business & Growth, People & Organisation, Legal & Compliance und unabhaengige externe Beratung wurden angelegt. QA-, Rechts- und Beratungsunabhaengigkeit, kritische Eskalationen sowie technische, unternehmerische und Eigentuemer-Gates sind getrennt dokumentiert. App-Benutzerrollen und Berechtigungen bleiben unveraendert.
- Die Rollen-ID `BUGFIXER` fuer den bestehenden Fehleranalyse- und Korrekturchat eingefuehrt. Der Vertrag regelt Auftrag, Schweregrade, Reproduktion, Ursachenanalyse, minimalen Korrekturumfang, Regressionstests, Soforteskalation kritischer Befunde sowie die getrennten Verantwortungen von CTO, Fachrollen und `TESTING_QA`. Die Teamordnung fuehrt diesen Chat als Junior Developer unter dem Fachreview des Engineering Lead; App-Benutzerrollen und Berechtigungen bleiben unveraendert.
- Den vollstaendigen Einstellungsdialog in allen fuenf Reitern nachlokalisiert. Statische Beschriftungen, native Select-Optionen und dynamische Profil-, E-Mail-, PWA-, Push-, QR-, Versions-, Validierungs- und Fortschrittszustaende wechseln nun DE -> EN und EN -> DE ohne Reload; aktive Reiter, Fokus, Nutzerdaten, ungespeicherte Eingaben und technische Filterwerte bleiben erhalten. Der Browserlauf weist bekannte deutsche Resttexte im englischen Dialog ab und erzeugt je Reiter Screenshots bei 390 x 844, 768 x 1024 und 1440 x 900.
- Sichtbare Testversion auf `0.3.0-test.4` angehoben. Der verbindliche Browsertest erkennt das richtige Windel-Alarm-Kabel nun sowohl aus dem sichtbaren Farbhinweis als auch aus dem Symbolhinweis; dadurch ist der zufaellig gewaehlte Kabelmodus im Linux-CI-Lauf deterministisch abgedeckt. Produkt- und Spielregeln bleiben unveraendert.

### 21. Juli 2026

- Windel-Alarm als Spielversion 4 auf einen konsistenten Kandidatenvertrag stabilisiert: 60 Sekunden, vier Module aus acht Systemfamilien, genau ein serverseitig vorgegebener Zwischenfall, drei Fehlerchancen und das bestehende Haltefinale. Bildschirmfuellende 2D-Spielbuehne, direkte Kabelgeste, Leiterbahn, Sicherungsringe und reaktive Zustandsanimationen ersetzen die bisherige Kartenwirkung; Bestenliste, Rollenrechte, Pseudonymisierung und Trennung von Buchungen sowie Benachrichtigungen bleiben erhalten.
- Pilotpaket fuer 3 bis 5 Wohnungen praezisiert: Einladungen bleiben bis zur getrennten Freigabe durch `CEO_TECHNIK`, `TESTING_QA` und, soweit erforderlich, Sitzungskommission oder zustaendige Verwaltung gesperrt. Das finale Gate verlangt konkrete Angaben zu Zeitraum, Haus, Support, externer Kontakt- und Feedbackablage, Zugriffsrollen, Aufbewahrung, Bereinigung, Version, Revision, Umgebung, Backup/Restore und Verantwortlichen. Teilnahmeinformation, getrennte E-Mail-/Push-Messung und falsche Empfaenger als sofortiges Rot-Kriterium sind verbindlich.
- Kandidatenstand auf `0.3.0-test.3` angehoben und weiterhin sichtbar als `Testversion` gekennzeichnet; kein Push oder Deployment durch dieses Arbeitspaket.
- Zentrale deutsche/englische Oberflaechenschicht mit Sprachwahl vor Login und kontobezogener Persistenz eingefuehrt. Verifizierung, Passwortreset, Freigabe-Mail, Push und Admin-Testnachrichten verwenden die Sprache des Empfaengerkontos; Einladungen sind vor der Kontoaktivierung zweisprachig.
- Sechs strukturierte Rollen-/Sprachfuehrungen mit sichtbarer, tastaturbedienbarer Kapitelliste, Startzeiten, aktivem Kapitel, Transkript, Szenenbezug und passender Systemstimme integriert.
- Sechs echte Medienpakete fuer Bewohner, Haus-Admin und Superadmin in Deutsch und Englisch fertiggestellt: je ein abspielbares 1280-x-720-H.264/AAC-MP4, vollstaendige VTT-Untertitel, Poster, Transkript und gemeinsame anklickbare Kapitelstarts. Laufzeiten sind 04:02, 04:58 und 04:40 je Rolle; die Browserabnahme prueft alle Pakete in drei Viewports.
- Englische Haus-Admin- und Superadminansichten vollstaendig nachlokalisiert: Aufgaben, Warnungen, Verantwortungen, Kennzahlen, Ressourcenstatus und -aktionen, Wohnungen und Einladungen, Tagebuch, Dauertermine, Auswertung, Systembetrieb, Recovery und Audit werden auch nach dynamischem Neuladen ausschliesslich in der Kontosprache aufgebaut. Der Browserlauf oeffnet fuer beide Rollen jeden Verwaltungsreiter, erkennt bekannte deutsche Resttexte und wiederholt EN -> DE -> EN ohne Reload. `house-admin-en.mp4` und `superadmin-en.mp4` sowie ihre Poster, Untertitel, Transkripte und Manifestdaten wurden aus dem korrigierten Browserstand neu erzeugt.
- Verwaltungsstart nach Aufgaben, Warnungen und Informationen geordnet; konkrete Aktionsnamen, Einladungs-, Wiederherstellungs-, Dauertermin-, Stoerungs-, Sperr-, Backup-, Wartungs-, Audit- und Versionshinweise ergaenzt. Rollen- und Hausrechte wurden nicht erweitert.
- PWA-Cache auf den sichtbaren Kandidatenstand versioniert und neue I18N-/Einfuehrungsdateien sowie kleine Medienbegleitdateien in die Offline-Shell aufgenommen. MP4-Dateien bleiben bewusst ausserhalb des PWA-Caches.
- `npm run test:i18n` prueft 608 zweisprachige Schluessel, deutschen Rueckfall, Sprachspeicherung, sechs Fuehrungen, Medienzuordnung, Kapitelkonsistenz und serverseitige Benachrichtigungsvorlagen. `npm run test:media` validiert Dateien, Format, Laufzeiten, Untertitel und PWA-Groessenvertrag. Der Browserlauf deckt zusaetzlich alle sechs realen Medienpakete, Tastatur-Kapitelspruenge, die englischen Verwaltungsreiter und drei Zielviewports ab.
- Hilfe und Einfuehrung folgen auch nach einem Sprachwechsel dem vorgesehenen Weg ueber das Kontomenue. Beim Schliessen des Rundgangs bleibt der Hilfe-Reiter offen und der Fokus kehrt zum ausloesenden Button zurueck.
- Der englische Einladungsablauf trennt Zustand und Aktion eindeutig: `Activate apartment` ist die Ueberschrift, `Accept invitation` der Button. Ungueltige, abgelaufene, bereits verwendete und wegen abweichender Passwoerter abgewiesene Einladungen bleiben in der gewaehlten Sprache.
- Ungueltige Push-Testabos mit fehlerhaftem `p256dh`-Schluessel werden als nicht mehr verwendbar deaktiviert. Der absichtlich ungueltige Testdatensatz bleibt ein negativer Testpfad, erzeugt aber keine unkontrollierte Fehlermeldung mehr; echte VAPID-Geheimnisse bleiben ausserhalb des Repositorys.
- Dynamische sprachabhaengige Ansichten werden nach jedem Wechsel Deutsch/Englisch zustandsschonend neu aufgebaut. Der Browserlauf prueft beide Richtungen ohne Reload, locale-korrekte Kalenderwochentage sowie den Erhalt von Haus, Rechten, Kalenderauswahl, Verwaltungsreiter und Einfuehrungskapitel.
- Neue organisatorische Rolle `PILOT_BETREUUNG` eingefuehrt und mit der separaten Codex-Aufgabe `CEO` verbunden: Sie bindet Bewohner, Hausdienst, unabhaengige Tester, Sitzungskommission und weitere Beteiligte strukturiert ein und trennt Alltagsfeedback, QA-Urteil, technische Freigabe und Gremienentscheid verbindlich.

### 20. Juli 2026

- Nach der mobilen Kopfzeilen-Korrektur sichtbare Pilotversion fuer den Live-Push auf `0.3.0-test.2` angehoben.
- Mobilen App-Kopf korrigiert: Hausadressen zerfallen bei 320 oder 390 Pixel Breite nicht mehr in Wortfragmente, sondern erhalten eine eigene einzeilige Markenebene. Kopfaktionen bleiben mit mindestens 44 x 44 Pixel grossen Bedienflaechen erreichbar; die Browserregression prueft Bewohner- und Adminkopf bei 320, 390, 768 und 1440 Pixeln sowie mit langen Haus- und Kontonamen.
- Sichtbare Pilotversion fuer diesen Push auf `0.3.0-test.1` angehoben; App, Health-Endpunkt und Cache-Kennungen verwenden dieselbe Testversionsnummer.
- Windel-Alarm als Tagesmission der Spielversion 3 vertieft: drei aus sechs serverseitig vorgegebenen Modulen, drei Fehlerchancen, Tages- und Uebungsmodus, servergepruefte Modulfortschritte, Fehleraufschlaege in der Wertungszeit und ein praezises Haltefinale ersetzen den wiederholbaren Drei-Modul-Ablauf. Neue Decoder-, Temperatur- und Leckmodule, Fehlerleuchten, optionaler Synthesizer-Ton und responsive Animationen steigern Abwechslung und Spannung; alte Spielwerte bleiben getrennt erhalten.
- Betreibertransparenz ergaenzt: Torsten Letsch und `torstenletsch@freenet.de` stehen oeffentlich als Betreiber- und Datenschutzkontakt; die GBMZ wird ausdruecklich nur von der App-Betreiberschaft abgegrenzt, waehrend ihr offizieller Hausaushang als Regelquelle bestehen bleibt.
- Kumulative Superadminrechte eingefuehrt: Ein Superadmin kann einem aktiven Haus-Admin die globale Zusatzberechtigung geben, ohne die eigenen Rechte zu verlieren, und sie einem anderen Superadmin wieder entziehen. Aktuelles Passwort, exakter Bestaetigungstext, Ziel-Sitzungsende, Auditspur und negative Rollenpruefungen sichern beide Aktionen ab.
- Superadmin-Schutz gegen veraltete Sitzungen gehaertet: Globale Routen gleichen den Sitzungswert bei jedem Zugriff mit dem aktiven Datenbankkonto ab; Rollenwechsel und Pflicht-Audit werden atomar gespeichert und Passwortversuche der kritischen Aktion begrenzt.
- Die fruehere exklusive Superadmin-Uebergabe entfernt. Superadminrechte werden nur noch additiv vergeben oder einem anderen Superadmin entzogen; das handelnde Konto behaelt seine globale Berechtigung.
- Windel-Alarm vom wiederholten Reihenfolge-Klicken zu einer variablen Entschaerfungsmission ausgebaut: 35-Sekunden-Countdown, zufaellig angeordnete Kabel-, Impuls- und Druckmodule, wechselnde Zielwerte, Fehlerstrafen, kritische Endphase und animierter finaler Zuendkreis erzeugen echten Zeitdruck. Die neue Spielversion besitzt eine faire eigene globale Wertung; serverseitige Rundentoken, Rollenrechte und die Trennung von Waschbuchungen bleiben unveraendert.
- Hauptrolle `CEO_TECHNIK` als Seniorentwickler der gesamten WaschZeit-App geschaerft: Jeder Push benoetigt eine neue sichtbare `-test.N`-Version; Pilotstatus sowie Betreiber- und Datenschutztransparenz gehoeren zur Gesamtverantwortung und werden vor einer Pilotveroeffentlichung zusammen mit QA und Release geprueft.
- Technische Fachrolle `WINDEL_ALARM` verbindlich ausformuliert: erlaubter Dateibereich, API- und Team-Schnittstellen, Datenschutz- und Sicherheitsgrenzen, Akzeptanzkriterien sowie Pflichtpruefungen fuer Spielaenderungen sind jetzt in `.agents/ROLES.md` festgelegt.
- Verwaltung visuell und responsiv geordnet: Ressourcen nach Typ und Status gruppiert, seltene Anlage- und Bearbeitungsformulare eingeklappt, Haeuser klar getrennt, Wohnungen und Konten durchsuchbar, Tagebuchfaelle verdichtet, Dauertermine sortiert und Systemfunktionen nach Aufgabe gegliedert; Rollen und APIs bleiben unveraendert.
- Mitteilungszentrum auf relevante Freigaben reduziert: eigene Aktionsbestaetigungen bleiben kurz eingeblendete Statusmeldungen, eigene Freigaben sowie bereits belegte oder abgelaufene Termine werden ausgeblendet, und die In-App-Liste verwendet dieselben persoenlichen Filter wie Push und E-Mail.
- Health, Version, Audit, Betriebsuebersicht, Analyse, Backup, Wartung und Pilot-Reset samt Selbstpruefung, geplantem Backup und Datenbereinigung als achte Backend-Modularisierungsstufe getrennt; Timer, Serverstart und globale Fehlerbehandlung bleiben im Composition Root, waehrend API, SQL, Bestaetigungen und Statuscodes unveraendert bleiben.
- Haus-, Wohnungs- und Benutzerverwaltung, kumulativer Rollen- und Sitzungskontext, Hauswechsel, Recovery-Status und Superadmin-Uebergabe als siebte Backend-Modularisierungsstufe getrennt; API, SQL, Middleware-Reihenfolge, Sitzungsdaten, QR-Rechtegrenzen und Statuscodes bleiben unveraendert.
- Anmeldung, persoenliche Konten, Einladungsannahme, Partner-QR, E-Mail-Bestaetigung, Passwortwiederherstellung und Datenschutzaktionen als sechste Backend-Modularisierungsstufe getrennt; Routenreihenfolge, SQL, Sitzungsregeneration, Cookies, Rate-Limits, Statuscodes und Sicherheitsverhalten bleiben unveraendert.
- Kalender, Buchungsregeln, Empfehlungen, Waschpakete, Absagen, Freigaben, Dauertermine und Admin-Buchungsreset als fuenfte Backend-Modularisierungsstufe getrennt; API, SQL, Regeln, Transaktionen, Statuscodes und Benachrichtigungsanbindung bleiben unveraendert.
- Mailtransport, Push-Infrastruktur, fachliche Benachrichtigungen und zugehoerige API-Routen als vierte Backend-Modularisierungsstufe getrennt; bestehende Mailtexte, Push-Payloads, Filter, Statuscodes und Berechtigungen bleiben unveraendert.
- Geraete, Bewohner-Stoerungsmeldungen und das administrative Maschinentagebuch als dritte Backend-Modularisierungsstufe in eine injizierbare Router-Fabrik ausgelagert; API, SQL, Rollen- und Hausgrenzen bleiben unveraendert.
- Abschluss-Gate und Gesamtaudit um die praktische Backup-Wiederherstellung sowie den verpflichtenden Browser- und visuellen Regressionstest erweitert; CI installiert Chromium, prueft drei feste Viewports und bewahrt Screenshots 14 Tage auf.
- Backup-Erstellung als zweite risikoarme Backend-Modularisierung in einen injizierbaren Service ausgelagert; lokale Aufbewahrung, SQLite-Integritaetspruefung, optionale externe Kopie und Statusspeicherung bleiben unveraendert.
- Erste risikoarme Backend-Modularisierung umgesetzt: Windel-Alarm-Routen, serverseitige Rundenwertung und globale Bestenliste aus `server.js` in eine injizierbare Router-Fabrik ausgelagert; API und Rollenverhalten bleiben unveraendert.
- Kritische Adminaktionen gegen uebernommene Sitzungen gehaertet: Superadmin-Uebergabe, Pilot-Reset, Wartungsstart und hausweiter Buchungsreset verlangen zusaetzlich zum Bestaetigungstext das aktuelle Passwort des handelnden Kontos; negative und positive Rollentests decken die serverseitige Pruefung ab.
- Identitaets- und Rollenmodell auf persoenliche Logins mit kumulativen Berechtigungen umgestellt: eine eindeutige E-Mail pro Person, gemeinsame Wohnungsmitgliedschaft, separates Haus-Adminrecht und optionale Superadminberechtigung am selben Konto.
- Wohnungseinladungen koennen auch eine bestehende Identitaet nach Bestaetigung ihres vorhandenen Passworts aufnehmen. So verwendet ein Bewohner-Hausadmin nur einen Login und wechselt zwischen `Mein Waschplan` und `Verwalten`.
- Partner-QR auf persoenliche Bewohnerzugaenge gehaertet: eigene E-Mail und eigenes Passwort sind Pflicht, Adminrechte werden nie kopiert, und alle Wohnungsmitglieder teilen Buchungen sowie Vorausbuchungsgrenzen.
- Vollstaendigen Tiefentest in `TESTPROTOKOLL_2026-07-20.md` dokumentiert: automatisierte Kern-, Sicherheits-, Rollen-, Jahres- und Barrierefreiheitstests sowie praktische Browserketten fuer Einladung, Buchung, Freigabe, Stoerung, Verwaltung, Mehrhausbetrieb, Rollenwechsel und Abmeldung.
- Rollenmodell fuer kombinierte Bewohner-/Hausadmin-Konten geschaerft: Bewohnerfunktionen bleiben mit aktiver Wohnung nutzbar; reine Admin- und Superadmin-Konten erhalten nur einen lesenden Kalender. Normale Buchungen und Stoerungsmeldungen sind fuer reine Adminkonten auch serverseitig gesperrt.
- Statischen DOM-Verknuepfungstest ergaenzt, der JavaScript-Ziele auf Anmelde-, Waschplan- und Reset-Seite gegen die vorhandenen HTML-Elemente prueft und damit ins Leere laufende Initialisierungen frueh erkennt.
- Rollentest an die erneute Passwortbestaetigung beim Start des globalen Wartungsmodus angepasst.
- Optionales, barrierefrei bedienbares Minispiel `Windel-Alarm` im Kontomenue ergaenzt: fuenf Handgriffe gegen ein ansteigendes Pups-O-Meter, harmlose Comic-Panne und keinerlei Auswirkung auf echte Buchungen oder Waschladungen. Eine serverseitig gemessene, datensparsam pseudonymisierte Bestenliste vergleicht Bestzeiten ueber alle Haeuser hinweg und ist fuer alle drei Rollen gleichberechtigt erreichbar.
- Windel-Alarm visuell als eigenstaendige WaschZeit-Arcade ausgebaut: hochwertige responsive Spielbuehne, animierte Figur und Sensorik, gestaffelte Werkzeugkarten, klar erkennbare Druck-, Gewinn- und Pannenzustaende sowie bewegungsreduzierte Darstellung bei entsprechender Systemeinstellung.
- Bewohner-Onboarding von frei verteilten Wohnungscodes auf sieben Tage gueltige E-Mail-Einladungen umgestellt. Das Konto entsteht erst beim Setzen des Passworts, ist bereits fest an Wohnung, Klingelschild und bestaetigte E-Mail gebunden und kann nicht doppelt aktiviert werden.
- Adminbereich zeigt offene, abgelaufene und angenommene Einladungen; ein erfolgreich versendeter neuer Link widerruft automatisch den vorherigen. Im Produktivbetrieb ist E-Mail der einzige Einladungsweg: Ohne SMTP wird keine Einladung angelegt und kein Link angezeigt.
- Partnergeraete lassen sich per lokal erzeugtem QR-Code mit vorausgefuellter Bestaetigungsseite verbinden. QR-Code und lesbarer Ersatzcode gelten zehn Minuten und einmal; Admin- und Superadminrechte sind von diesem Weg serverseitig ausgeschlossen.
- Abgesicherten Pilot-Reset fuer den Superadmin ergaenzt: geprueftes Backup vor Ausfuehrung, exakter Bestaetigungstext und vollstaendige Entfernung aller Nicht-Superadmin-Konten samt Sitzungen, Buchungen, Push-Geraeten und Wohnungszuordnungen bei Erhalt technischer Protokolle.
- Direkte Admin-Aenderung fremder Bewohner-E-Mails gesperrt. Damit kann ein Admin keine eigene Adresse mehr in ein Wohnungskonto eintragen, bestaetigen und anschliessend dessen Passwort uebernehmen.
- Persoenlich geprueften Kontowiederherstellungsprozess fuer Bewohner ohne bestaetigte E-Mail eingefuehrt: protokollierter Einmalcode, 15 Minuten Laufzeit, einmalige Verwendung, sofortiges Sitzungsende und selbststaendige Eingabe von E-Mail und neuem Passwort durch die betroffene Person.
- Widerspruechliche Altdaten mit gesetztem Bestaetigungsstatus, aber ohne hinterlegte E-Mail werden bereinigt und koennen keinen Reset-Link mehr vortaeuschen.
- Regressionstests sichern ab, dass die Wiederherstellung Wohnungszuordnung, Buchungsidentitaet und Rollenbindung nicht veraendert und dass Bewohner keine Admin-Codes fuer sich oder andere erzeugen koennen.
- Die Admin-Warnzahl zaehlt nur noch aktive Bewohnerkonten ohne irgendeine bestaetigte E-Mail; technische Admin-Konten werden nicht faelschlich als Bewohner-Recovery-Aufgabe angezeigt.
- Jahressimulation zeitunabhaengig gemacht: Liegt der gelernte Lieblingsslot am aktuellen Tag bereits in der Vergangenheit, wird auch die naechste regelkonforme Alternative als korrekt geprueft.

### 19. Juli 2026

- Adminbereich als rollenbezogene Arbeitsoberflaeche neu geordnet: priorisierte Aufgaben mit Direktsprung, sichtbare Verantwortungen fuer Haus-Admin und Superadmin, Warnzaehler an betroffenen Bereichen sowie klare Trennung von `Wohnungen` und `Geraete & Haeuser`. Technischer Notfallzugang steht nur noch im Bereich `System`, normale Bewohnerbuchungen werden im Haus-Admin-Auftrag ausdruecklich ausgeschlossen.
- Admin-Testmail vom Benutzerkonto entkoppelt: `SMTP_TEST_TO` kann eine feste betriebliche Zieladresse vorgeben. Ohne diese Variable bleibt die eigene Admin-Adresse der Rueckfall, sodass Wohnungs-E-Mails weiterhin eindeutig genau einem Konto gehoeren.
- Reproduzierbaren Gesamtaudit ergaenzt: eigener dynamischer Sicherheits- und Anmeldetest, schrittweiser Audit-Runner sowie vollstaendiger Pruefkatalog mit Soll-Ergebnissen und getrennt ausgewiesener Live-Abnahme. `npm run check` enthaelt den Sicherheitstest jetzt verbindlich.
- Fehlerbehandlung fuer Eingaben geschaerft: JSON-Anfragen ueber 32 KB liefern kontrolliert `413`, fehlerhaftes JSON kontrolliert `400`, statt beide Faelle als internen Serverfehler zu melden.
- E-Mail-Validierung gegen HTML-/Headerzeichen, Steuer- und Leerzeichen, mehrfache `@`, doppelte Punkte sowie ungueltige Domainsegmente gehaertet. Dadurch koennen ungeeignete Login- und Mailheaderwerte nicht mehr als Wohnungsadresse gespeichert werden.
- Unveraenderbares Maschinen- und Raumtagebuch eingefuehrt: Bewohner melden Stoerungen, Haus-Admins fuehren den verbindlichen Ablauf `Meldung -> Sperre -> Reparatur -> Funktionspruefung -> Freigabe`, und eine Freigabe verlangt erfolgreiche Pruefung sowie Abschlussnotiz. Suche, Statusfilter, eigene Meldungsstatus, Hausgrenzen und hausuebergreifende Superadmin-Sicht sind in Rollen- und Funktionstests abgesichert.
- Wohnungsidentitaet getrennt: stabile interne Wohnungsbezeichnung, adminverwalteter Klingelschildname und E-Mail als Bewohnerlogin. Buchungen, Freigaben, E-Mails, Push-Auswahl und Auswertung zeigen den Klingelschildnamen statt eines frei gewaehlten Benutzernamens.
- Adminbearbeitung fuer Klingelschildname und bis zu zwei Wohnungs-E-Mails ergaenzt; geaenderte E-Mails werden erneut bestaetigt und alte Bewohner-Sitzungen beendet.
- Kontrollierten Korrekturwunsch eingefuehrt: Bewohner koennen einen Klingelschildnamen vorschlagen, Haus-Admins koennen ihn pruefen, uebernehmen oder ablehnen, ohne dass Bewohner fremde Namen selbst setzen koennen.
- Kontrollierte PWA-Updates eingefuehrt: sichtbarer Updatehinweis, Aktualisierung erst nach Zustimmung, Schutz laufender Buchungsauswahlen sowie Versionsnummer und Auslieferungsdatum unter `App & Geraet`.
- Globalen Superadmin-Wartungsmodus ergaenzt: automatisches geprueftes Backup beim Start, serverseitige Schreibsperre, Bewohnerdialog und Freigabe erst nach SQLite- und Buchungs-Schreibtest.
- Health-, Versions-, Rollen-, Funktions- und Barrierefreiheitstests um Releasekennung, Wartungsstatus und Service-Worker-Aktivierung erweitert.
- Wohnungskonto-Prinzip eingefuehrt: pro Wohnung ein gemeinsames Konto, zufaellige einmalige Wohnungscodes, Adminstatus nur als aktiviert/nicht aktiviert und verpflichtende Zuordnungsabfrage fuer bestehende Bewohnerkonten.
- Beim Anlegen weiterer Haeuser wird der interne eindeutige Hausschluessel automatisch erzeugt und nicht mehr als Bewohnercode dargestellt.
- Kurzlebige Geraetecodes ergaenzt: Weitere Handys koennen zehn Minuten lang und genau einmal ohne Passwortweitergabe verbunden werden; versehentliche Doppelkonten lassen sich samt Buchungen und Push-Geraeten sicher zusammenfuehren.
- Zwei separat bestaetigte E-Mail-Adressen pro Wohnungskonto ergaenzt. Beide Adressen koennen fuer Passwort-Reset und Freigabe-Hinweise genutzt werden; Login ist ebenfalls mit beiden Adressen moeglich.
- Rollenmatrix und automatische Tests um Wohnungserzeugung, Einmalcode-Verbrauch, Bestandszuordnung, Geraetekopplung und Admin-/Bewohnergrenzen erweitert.
- Automatische Sitzungsabmeldung eingefuehrt: Nach 30 Minuten ohne Aktivitaet wird das serverseitige Konto-Cookie geloescht; zwei Minuten vorher erscheint ein barrierefreier Countdown mit den klaren Aktionen `Angemeldet bleiben` und `Jetzt abmelden`. Ablauf, Keepalive, Cookie-Loeschung und Login-Rueckmeldung werden automatisch getestet.
- Empfohlenen Kalendertermin eindeutig nutzbar gemacht: Die bisher passive Markierung `Vorschlag` zeigt nun `Empfohlen` und `Buchen`; Klick oder Tipp oeffnet direkt das empfohlene Zeitfenster in der Waschmaschinenwahl. Auch Tagesvorschau und Empfehlungsbereich verwenden die klare Aktion `Empfohlenen Termin buchen`.
- Buchungsansicht verbreitert: Den dauerhaften Block `Gut zu wissen` entfernt und Einfuehrung, Hausregeln sowie Reinigung in einem neuen Einstellungsreiter `Hilfe & Regeln` gebuendelt.

### 18. Juli 2026

- Einfuehrungsvideo visuell synchronisiert: 28 kurze Szenen zeigen jeweils die zum Sprechertext passende Kalender-, Buchungs-, Freigabe-, Einstellungs- oder Reinigungsansicht; auch der interaktive Rundgang verwendet nun echte App-Aufnahmen statt abstrahierter Platzhalter.
- Bewohnernavigation aufgeraeumt: Kontomenue in der Kopfzeile, gemeinsames Mitteilungszentrum statt getrennter Freigabe- und Hinweislisten, kompakter `Neu frei`-Hinweis und vier Einstellungsbereiche fuer Profil, Benachrichtigungen, App/Geraet sowie Sicherheit/Daten.
- Notfallprozess fuer Superadmin-Ausfall ergaenzt: sichtbarer Recovery-Status, Superadmin-Uebergabe an aktive Haus-Admins, Seed-Passwort-Reset nur mit temporaerem Break-Glass-Schalter und Rollentest-Abdeckung.
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
- Eine abgelaufene Sitzung verursacht beim direkten Oeffnen der Loginseite keinen Serverfehler mehr; dieser Ablauf ist als Regressionstest abgesichert.
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
