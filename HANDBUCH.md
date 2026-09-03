# WaschZeit-Handbuch

Stand: 11. August 2026

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

Ein `Restplatz` ist ein getrennter Weg fuer einen noch nicht begonnenen freien Waschslot am heutigen Schweizer Kalendertag. Er enthaelt genau eine Waschmaschine, optional einen Tumbler im selben Slot und niemals einen Trockenraum. Ohne Tumbler muss die selbst organisierte Trocknung vor dem Abschluss ausdruecklich gewaehlt werden.

## Rollen

| Rolle | Geltungsbereich | Verwaltungsrechte |
| --- | --- | --- |
| Bewohner | Persoenliche Identitaet, gemeinsame Wohnung und zugeordnetes Haus | Gemeinsame Wohnungsbuchungen, persoenliche Hinweise und Kontodaten sowie sachliche Stoerungsmeldungen |
| Haus-Admin | Eigenes Haus | Wohnungen und Einladungen, Wohnungskonten, Geraete, Tagebuch, Sperren, Reparaturpruefung, Dauertermine sowie Buchungen des Hauses einsehen und bei Bedarf loeschen |
| Superadmin | Alle Haeuser, Aktionen immer im bewusst aktiven Haus | Alle Haus-Admin-Rechte plus Haeuser, Rollen, Umzuege, Backups und globaler Wartungsmodus |

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
2. Das vorhandene Seed-Passwort ausschliesslich aus dem freigegebenen Passwortmanager verwenden; ein blosses Neusetzen von `SEED_ADMIN_PASSWORD` ueberschreibt kein bestehendes Passwort.
3. `SEED_ADMIN_FORCE_PASSWORD_RESET` in Produktion niemals aktivieren. Der Produktionsguard stoppt bereits vor Dateisystem- oder Datenbankwirkung, wenn dieser Schalter nicht fehlt oder exakt `false` ist.
4. Ist kein gueltiger Superadminzugang mehr vorhanden, den Dienst unveraendert lassen und einen separaten Recovery-Kandidaten mit Datenbackup, Vier-Augen-Freigabe und unabhaengigem Test bilden. Ein normaler Deploy oder Neustart ist kein Passwort-Recoveryweg.
5. Nach einer separat freigegebenen Wiederherstellung ein normales Admin- oder Superadmin-Nachfolgekonzept wiederherstellen und den Notfallzugriff dokumentieren.

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

Bewohnerkonten melden sich mit der ersten oder zweiten hinterlegten E-Mail-Adresse an. Ein alter Bewohner-Benutzername ist bei vorhandener E-Mail kein Login mehr. Nur bestehende Bewohnerkonten ohne jede E-Mail duerfen ihren alten Kontonamen uebergangsweise verwenden. Admins duerfen eine fremde Konto-E-Mail nicht eintragen oder ersetzen. Ist auch das Passwort unbekannt und keine bestaetigte Adresse vorhanden, prueft der Admin die Person ausserhalb der App und erzeugt danach einen einmaligen Wiederherstellungscode. Die Person traegt Code, eigene E-Mail und neues Passwort selbst auf der Loginseite ein. Fuer Reset und Benachrichtigungen reicht ein technisches Bestaetigungsflag nicht: Der normalisierte aktuelle Adresswert muss exakt dem dauerhaft gespeicherten, bei der Bestaetigung gebundenen Wert entsprechen. Ein Legacy-Flag ohne Bindungswert oder eine danach geaenderte beziehungsweise geloeschte Adresse gilt fail-closed als unbestaetigt. Admin- und Superadmin-Konten behalten ihren technischen Kontonamen fuer Betrieb und Notfallzugang.

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

Das Kontomenue oben rechts zeigt Benutzername und Rolle. Es fuehrt zu `Einstellungen`, `Hilfe & Einfuehrung` und `Abmelden`. Kontomenue und Wohnungszuordnungsdialog verwenden denselben geschuetzten API-Abmeldeweg. Die Sitzung wird dort geloescht, das Cookie entfernt und anschliessend die Anmeldeseite mit einer Abmeldebestaetigung geoeffnet. Waehrend der Anfrage ist eine zweite Abmeldung gesperrt; bei einem Fehler bleibt der jeweilige Button bedienbar und die Meldung erscheint am ausloesenden Bereich. Auch die automatische Inaktivitaetspruefung wird serverseitig durchgesetzt; ein blosses Offenlassen oder Wiederaufrufen eines alten Tabs verlaengert eine abgelaufene Sitzung nicht.

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
| Restplatz absagen | Das gesamte noch nicht begonnene Restplatzpaket gemeinsam stornieren |
| Restplatz-Tumbler entfernen | Vor Beginn nur den optionalen Tumbler entfernen und die Selbsttrocknung erneut ausdruecklich bestaetigen |

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
| Tumbler | Danach regelkonform verfuegbare Tumbler anzeigen; im Modus `GBMZ-Regeln` bleibt mindestens ein Tumbler frei, im Modus `Liberal` gilt diese Reserve nicht |
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
| Ruhetage | Im Modus `GBMZ-Regeln` Sonntage eindeutig als nicht buchbare Ruhetage anzeigen; im Modus `Liberal` Sonntag wie jeden anderen Tag anbieten |
| Einzelbuchung | Nachgeordneten Bereich aufklappen und ein einzelnes Geraet weiterhin direkt buchen |
| Belegte Termine | Name der buchenden Person oder geschuetzten Dauertermin anzeigen |
| Lesender Admin-Kalender | Reinen Admin-Konten ohne aktive Wohnung Belegungen und Kapazitaeten ohne Empfehlung, Buchungsassistent oder Einzelbuchung zeigen |
| Admin-Korrektur | Haus-Admin und Superadmin koennen normale Buchungen im aktiven Haus loeschen |

#### Restplatz am selben Tag

Der getrennte Einstieg `Restplatz buchen` verwendet ausschliesslich die serverseitige Schweizer Zeit (`Europe/Zurich`). Angeboten werden freie Slots des heutigen Tages, deren Beginn noch nicht erreicht ist. Auch ein vollstaendig freier Slot ist zulaessig. Browserdatum, Geraetezeit und ein alter geoeffneter Entwurf koennen die Tages- oder Startgrenze nicht verschieben; bei Tages- oder Hauswechsel wird der Entwurf verworfen.

Buchungspartei ist die aktive Wohnung im aktiven Haus. Mehrere Konten derselben Wohnung teilen die Tagesgrenze. Es gibt keine neue personenbezogene Verknuepfung ueber mehrere Haeuser. Eine Partei mit einem heutigen Waschslot kann keinen Restplatz buchen. Dazu zaehlen normale Buchungen, Waschpakete, zurechenbare Dauertermine, Restplaetze sowie begonnene, abgeschlossene oder waehrend der Nutzung frueher freigegebene Slots. Eine vollstaendig vor Beginn stornierte und ungenutzte Waschbuchung sperrt danach nicht mehr; eine fehlgeschlagene oder nur teilweise bestaetigte Stornierung stellt die Berechtigung nicht wieder her. Normale Buchungen an spaeteren Tagen und das normale Vorausbuchungsrecht bleiben vom Restplatz in beide Richtungen unveraendert.

Ein Restplatz enthaelt exakt eine aktive freie Waschmaschine. Optional kann exakt ein aktiver, freier und konfliktfreier Tumbler desselben Hauses im selben Slot gewaehlt werden; die bestehende Reserve von mindestens einem freien Tumbler gilt weiter. Trockenraeume und Waeschestaender sind in diesem Weg ausgeschlossen. Ohne Tumbler ist vor jedem Abschluss die nicht vorausgewaehlte Selbsttrocknung zu bestaetigen. Diese Bestaetigung wird weder gespeichert noch exportiert oder auditiert. Der sichtbare Pflichttext lautet: `Restplatz fuer eine kleine Waesche. Es ist kein Trockenraum enthalten. Ohne Tumblerbuchung muss die Trocknung selbst organisiert werden.` Die englische Fassung lautet: `Remaining slot for a small load of laundry. No drying room is included. If you do not book a tumble dryer, you must arrange drying yourself.`

Restplaetze gehoeren ausschliesslich zum Modus `GBMZ-Regeln`; deshalb bleiben sie sonntags gesperrt. Im Modus `Liberal` ist Sonntag wie jeder andere gueltige freie Tag normal buchbar, Restplaetze werden dort jedoch nicht angeboten.

Waschmaschine und gewaehlter Tumbler werden in einer Transaktion angelegt. Ein Konflikt erzeugt kein stilles Paket ohne Tumbler. Ein wohnungsgebundener Idempotenzschluessel verhindert Doppelbuchungen durch Doppelklick, Retry oder eine unklare Antwort; derselbe Schluessel mit abweichender Auswahl wird abgelehnt. Vor Slotbeginn kann das ganze Paket storniert werden. Der Tumbler kann einzeln entfernt werden, wenn die Selbsttrocknung erneut bestaetigt wird. Maschine, Datum und Slot koennen nicht direkt gewechselt und ein Tumbler kann in `test.11` nicht nachtraeglich hinzugefuegt oder ausgetauscht werden. Restplaetze erzeugen keine neue E-Mail, Push-Mitteilung, Erinnerung oder Empfaengergruppe. Der persoenliche Export enthaelt nur Buchungsart, eigenes Haus, Datum, Slot, Waschmaschine und gegebenenfalls Tumbler.

Ressourcen, Kapazitaeten, Belegungen und Buchungsoptionen stammen immer aus dem serverseitig aktiven Haus. Neu angelegte Haeuser starten bewusst ohne Geraete oder Raeume; ein Haus-Admin richtet die tatsaechlich vorhandenen Ressourcen anschliessend ein. Solange ein Haus keine Ressourcen besitzt, zeigt der Bewohnerbereich einen zweisprachigen Leerzustand statt eines Belegungsplans und bietet keine Buchungsaktion an. Ein Hauswechsel leert zuvor geladene Hausdaten sofort und laedt sie erst fuer den serverseitig bestaetigten neuen Hauskontext neu. Gesperrte Ressourcen bleiben von diesem Leerzustand getrennt: Sie sind eingerichtet, liefern aber keine aktive Buchungskapazitaet.

Der Produktfix loescht keine vorhandenen Ressourcen. Haeuser, die vor dieser Korrektur angelegt wurden, koennen daher weiterhin die damals automatisch erzeugten acht Datensaetze enthalten. Vor der Live-Abnahme ist zuerst ein Backup zu erstellen und der Bestand kontrolliert mit der tatsaechlichen Ausstattung, vorhandenen Buchungen und Tagebucheintraegen abzugleichen. Genau drei Eintraege mit Standardnamen `Waschmaschine 1` bis `3`, drei `Trockenraum 1` bis `3` und zwei `Tumbler 1` bis `2` sind lediglich ein Diagnosehinweis auf den frueheren Seed, niemals ein automatischer Loeschgrund. Eine Bereinigung oder manuelle Neueinrichtung erfolgt nur nach ausdruecklicher Freigabe; umbenannte, verwendete oder historisch verknuepfte Ressourcen duerfen nicht heuristisch entfernt werden.

Ansichts- und Hauswechsel sind revisionsgesichert. Waehlt ein Nutzer nach Freigabe der Navigation bewusst Kalender oder Verwaltung, darf ein spaeter Abschluss der Initialisierung diese Auswahl nicht ueberschreiben; ohne Nutzerwahl gilt weiterhin die rollenbezogene Startansicht. Jede hausgebundene Anfrage traegt die beim Start aktive Hausrevision. Sowohl verspaetete Antworten als auch Netzfehler eines inzwischen verlassenen Hauses werden ohne sichtbare oder interne Zustandsaenderung verworfen. Fehler des weiterhin aktiven Hauses bleiben dagegen sichtbar. Dieser Vertrag umfasst Ressourcen, Buchungen, eigene Buchungen, Freigabehinweise, Kalender, Empfehlungen, Buchungsoptionen und Verwaltungsdaten.

Die App prueft die Buchungsregeln auf dem Server. Eine Anzeige im Browser allein kann die Regeln deshalb nicht umgehen.

### Stoerung melden

Bewohner waehlen in der Kopfzeile `Stoerung melden`, das betroffene Geraet oder den Raum und beschreiben die Beobachtung sachlich. Sie sehen den Status ihrer eigenen Meldungen, koennen aber weder eine Ressource sperren noch Tagebucheintraege bearbeiten. Auch bereits gesperrte Ressourcen bleiben als meldbar sichtbar, damit neue Beobachtungen nicht verloren gehen.

Jede einzelne Meldung wird als persoenlicher, loeschbarer Bericht gespeichert. Mehrere Personen oder dieselbe Person mit einer weiteren Beobachtung koennen denselben neutralen Betriebsfall ergaenzen, ohne ihre Texte, Namen, Kontakte oder Benachrichtigungswuensche gegenseitig zu sehen. Das dauerhafte Tagebuch speichert ausschliesslich Ressource, Betriebsstatus, Zeitpunkte und sachliche Adminmassnahmen. Beim Loeschen einer eigenen Meldung verschwinden deren Text, Zuordnung, Opt-ins und ausstehende Reporterzustellungen; der neutrale Betriebsnachweis bleibt bestehen.

Die Erstellung verlangt einen pro Konto gebundenen Idempotenzschluessel. Derselbe Schluessel mit denselben normalisierten Angaben liefert denselben Erfolg, ohne einen zweiten Bericht, Audit- oder Benachrichtigungseintrag anzulegen. Abweichende Angaben mit demselben Schluessel werden als Konflikt abgelehnt. Ein Fehler vor dem Datenbank-Commit hinterlaesst keine Teilmutation. Ein Providerfehler nach dem Commit aendert den fachlichen Erfolg nicht und wird getrennt als Zustellstatus ausgewiesen. Ohne verbindliche Provider-Idempotenz behauptet WaschZeit keine externe Genau-einmal-Zustellung.

Statusmeldungen an die meldende Person sind pro Einzelmeldung und Kanal standardmaessig aus. Push ist nur mit einer aktuell `active` markierten Subscription desselben Kontos im Haus der konkreten Meldung waehlbar; ein blosses historisches `enabled`, ein inaktives oder fremdhausgebundenes Geraet reicht nicht. E-Mail ist nur fuer ein aktives Konto waehlbar, wenn die normalisierte primaere Adresse nichtleer ist und exakt ihrem dauerhaft gespeicherten Bestaetigungswert entspricht oder ersatzweise eine Zweitadresse denselben Bindungsvertrag erfuellt. Ein veraltetes Flag, ein fehlender Bindungswert oder eine nach der Bestaetigung geaenderte Adresse aktiviert den Kanal nicht. Nur ein tatsaechlicher Wechsel auf `In Bearbeitung` oder `Erledigt` erzeugt je gewaehltem Kanal genau ein generisches Ereignis; Notizen, Reloads und erneutes Speichern desselben Status senden nichts. Unmittelbar vor einer Reporterzustellung werden Konto, Hausbindung, Opt-in und Ereignistyp sowie bei Push Subscription-Eigentuemer und Endpoint-Hash beziehungsweise bei E-Mail die aktuell passende bestaetigte Adresse erneut geprueft. Jeder Outboxdatensatz wird zunaechst atomar beansprucht. Unmittelbar vor dem ersten moeglichen Providerkontakt wird der Versuch dauerhaft markiert. Ab diesem Zeitpunkt fuehren Timeout, Prozessabbruch, Leaseablauf, Providerfehler oder ein fehlgeschlagenes lokales Settlement terminal zu `Zustellausgang unklar`; derselbe Datensatz wird nie automatisch erneut an den Provider gegeben. Nur ein nachweislich vor dem Provideraufruf gescheiterter Vorbereitungsschritt bleibt wieder planbar. Der Fallstatus und das Opt-in bleiben unveraendert, und der In-App-Status bleibt die verlaessliche Quelle. Die Ansicht zeigt alle eigenen Meldungen in stabiler Reihenfolge samt eigenem Beschreibungstext und besitzt keine stille Acht-Eintraege-Grenze. Die Bewohner-API liefert strukturell nur eigene Reportfelder, den projizierten Hauptstatus und neutralen Ressourcenkontext; technische Fallstatus, gemeinsame Fall-IDs und interne Zeit-, Admin-, Audit- oder Zustellfelder fehlen. Der persoenliche Export enthaelt alle eigenen Meldungen auch nach einem Hauswechsel als feste Allowlist aus eigenem Inhalt, eigenen Zeitpunkten, eigenen Push-/E-Mail-Opt-ins, Hauptstatus und neutralem Haus-/Ressourcenkontext. Fremde Meldungen, gemeinsame Fallzeitpunkte, Kontakte, Adminnotizen, Audit-, Provider-, Queue-, Delivery- oder Outboxfelder werden nicht exportiert; die internen Adressbindungswerte werden ebenfalls nie ausgegeben.

### Hausregelmodus

Der Superadmin waehlt beim Anlegen eines Hauses exakt `GBMZ-Regeln` oder `Liberal` und kann diese Auswahl spaeter aendern. Bestehende Haeuser bleiben ohne ausdrueckliche Aenderung im Modus `GBMZ-Regeln`. Ein Moduswechsel veraendert oder loescht keine vorhandene Buchung und wird im Auditprotokoll sichtbar. Haus-Admins und Bewohner koennen den Modus weder anlegen noch aendern.

Im Modus `Liberal` darf ein Bewohner jede aktive und noch freie Ressource seines aktiven Hauses in jedem gueltigen, noch nicht vergangenen Slot direkt buchen. Sonntagsruhe, Waschslot-Tagesgrenze, Grenze eines kuenftigen Waschtags, Waschbezug und Zeitfenster fuer Trockenraeume sowie Tumblerreserve entfallen. Restplaetze werden nicht angeboten, weil der normale freie Buchungsweg bereits gilt. Anmeldung, aktive Bewohner-/Wohnungsbindung, Rollen- und Hausisolation, aktive Ressourcen, Vergangenheitsgrenze, normale und feste Ressourcenkollisionen, atomare Speicherung, Idempotenz- und Wartungsgrenzen bleiben unveraendert. Empfehlungen suchen auch bei bereits vorhandenen heutigen oder kuenftigen Waschbuchungen weiter nach einer freien Option.

Im Modus `GBMZ-Regeln` gelten unveraendert diese Regeln:

- Sonntage sind nicht buchbare Ruhetage.
- Pro Tag darf nur ein Waschslot reserviert werden. Innerhalb dieses Slots koennen mehrere Waschmaschinen genutzt werden.
- Der naechste Waschslot kann fruehestens am Tag eines bereits reservierten Waschslots gebucht werden.
- Am Ende des Waschslots muss mindestens ein Tumbler frei bleiben.
- Beim Waschslot `07:00-12:00` darf ein Trockenraum bis hoechstens `21:00` verwendet werden.
- Beim Waschslot `12:00-17:00` darf ein Trockenraum bis hoechstens `12:00` am Folgetag verwendet werden.
- Beim Waschslot `17:00-21:00` darf ein Trockenraum bis hoechstens `12:00` am Folgetag verwendet werden.
- Kuerzeres Trocknen und fruehes Freigeben verbessern die Verfuegbarkeit fuer alle.

Der persoenliche Kalenderfeed unter `Einstellungen -> Benachrichtigungen` ist nur fuer aktive Bewohnerkonten mit aktiver Wohnung verfuegbar; dies schliesst kombinierte Bewohner-/Hausadmin-Konten ein, reine Admin-Konten aber aus. Er enthaelt eigene beziehungsweise gemeinsam ueber die Wohnung gebuchte Normalbuchungen und der Wohnung zugeordnete Dauertermine. Die geheime Adresse wird ausschliesslich unmittelbar nach Erstellen oder Ersetzen angezeigt und beim Schliessen, erneuten Oeffnen, Statusneuladen und Abmelden aus der Oberflaeche entfernt. Serverseitig liegt nur ihr SHA-256-Hash. Ersetzen widerruft die alte Adresse, Widerrufen sperrt sie sofort. Unicode-Bezeichnungen werden RFC-5545-konform und ohne Zeichenbeschaedigung gefaltet; fremde Namen, Kontakte und Buchungen fehlen.

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

Vor jeder Runde erzeugt der Server einen einmaligen, zwei Minuten gueltigen Rundennachweis, speichert die vier Module, ihre Varianten und den Zwischenfall und prueft jeden Modulabschluss sowie das finale Haltefenster. Die Serverzeit bleibt massgeblich. In der `Tagesmission` erhalten alle Haeuser am selben Schweizer Kalendertag dieselbe deterministische Aufgabe; die Wertungszeit besteht aus Laufzeit plus 4,5 Sekunden je Fehler. Gibt es eine alternative Mission, ist die vollstaendige Tagesmission am Folgetag garantiert verschieden. Nur die beste persoenliche Tageszeit wird gespeichert. Die zehn schnellsten Konten aller Haeuser erscheinen in der gemeinsamen Tageswertung; zusaetzlich sieht jede Person den eigenen globalen Tagesrang. Andere Konten werden ausschliesslich als `Wickelprofi #Nummer` gezeigt, nicht mit Klingelschild-, Wohnungs- oder Hausnamen. `Bestwert loeschen` entfernt nur den eigenen heutigen Eintrag. Der Modus `Ueben` mischt eine neue Aufgabe, vermeidet unmittelbar dieselbe vollstaendige Aufgabenfolge und Ergebnisformulierung, verwendet dieselben Regeln und schreibt keinen Highscore. Ein Reload umgeht diese Wiederholungssperre nicht, weil die letzte abgeschlossene Uebungsrunde serverseitig beruecksichtigt wird. Bewohner, Haus-Admins und Superadmins haben dieselben Spielrechte. Das Spiel erzeugt keine echten Waschladungen, Buchungen, Freigaben, Mitteilungen oder Benachrichtigungen. Ergebnisse der Spielversion 4 werden getrennt von frueheren Spielversionen gewertet.

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

Fuer die PWA werden Manifest, Poster, Untertitel und Transkripte in die Offline-Shell aufgenommen. Die sechs MP4-Dateien umfassen zusammen rund 8,5 MB und werden weder vorab noch im Laufzeitcache gespeichert. Dadurch bleibt ein App-Update klein; ohne Netz erscheint der Transkript-Fallback, waehrend ein bereits vom Browser gepuffertes Video nicht als verlaessliche Offline-Funktion versprochen wird.

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

Der Haus-Admin-Auftrag umfasst Wohnungsaktivierung, Kontobetreuung, Geraete und Raeume, den vollstaendigen Stoerungsablauf, begruendete Dauertermine sowie die Betriebskontrolle des eigenen Hauses. Normale Bewohnerbuchungen gehoeren ausdruecklich nicht zu seinen Aufgaben. Der Superadmin verantwortet zusaetzlich Haeuser, Rollen, Nachfolge, Backups und Wartung. Fuer Tagebuch und andere Hausaktionen wechselt er bewusst in das betroffene Haus; die Ansicht mischt niemals mehrere Haeuser.

### 2. Haus und Geraete

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geraet oder Raum anlegen | Ja | Ja |
| Ressource umbenennen | Ja | Ja |
| Ressource mit Grund sperren und automatisch im Tagebuch erfassen | Ja | Ja |
| Neues, leeres Haus anlegen und anschliessend Ressourcen einrichten | Nein | Ja |
| Haus anzeigen, umbenennen, aktivieren oder deaktivieren | Nein | Ja |

Die Oberflaeche trennt `Haus` und `Geraete` mit einem eindeutigen Umschalter und zeigt immer nur den gewaehlten Inhalt. Haus-Admins starten bei `Geraete` ihres eigenen Hauses und erhalten weder eine Mehrhausauswahl noch die Hausanlage. Superadmins starten bei `Haus`; erst nach bewusstem Wechsel zu `Geraete` sehen sie ausschliesslich den Bestand des serverseitig aktiven Hauses. Die letzte Auswahl wird nur fuer dieselbe Rollen- und Hauskombination gemerkt. Ein Hauswechsel leert die alte Auswahl und ihre Inhalte sofort. Der Geraetebereich zeigt Gesamtbestand, einsatzbereite und gesperrte Ressourcen und ordnet den Bestand in Waschmaschinen, Trockenraeume und Tumbler. Anlage- und Umbenennungsformulare bleiben geschlossen, bis sie bewusst geoeffnet werden. Gesperrte Ressourcen zeigen Grund und direkten Sprung in das Tagebuch.

Ressourcen, Wohnungen und Einladungen sind immer auf das aktive Haus begrenzt. Die interne Wohnungsbezeichnung bleibt bei einem Bewohnerwechsel bestehen. Der Haus-Admin verwaltet den Klingelschildnamen; eine Konto-E-Mail wird bei der Einladung festgelegt und danach nur durch das geschuetzte Wohnungskonto selbst geaendert. Eine Sicherheitssperre ist auch bei kommenden Buchungen moeglich, nimmt die Ressource sofort aus der Buchungsauswahl und erzeugt einen Tagebuchfall. Die betroffenen kommenden Buchungen werden dem Admin nur lesend angezeigt und weder geloescht noch verschoben oder still benachrichtigt. Eine direkte Aktivierung ist danach gesperrt; die Freigabe erfolgt ausschliesslich ueber den geprueften Tagebuchablauf. Ein Haus mit aktiven Konten oder kommenden Buchungen kann nicht deaktiviert werden.

### 3. Maschinen- und Raumtagebuch

| Funktion | Bewohner | Haus-Admin | Superadmin |
| --- | :---: | :---: | :---: |
| Stoerung mit Ressource, Titel und Beobachtung melden | Ja | Nein | Nein |
| Status eigener Meldungen sehen | Ja | Nein | Nein |
| Alle Faelle des eigenen Hauses sehen und durchsuchen | Nein | Ja | Ja |
| Faelle eines anderen Hauses nach bewusstem Wechsel des aktiven Hauses sehen | Nein | Nein | Ja |
| Ressource sperren | Nein | Ja | Ja |
| Reparatur dokumentieren | Nein | Ja | Ja |
| Funktionspruefung als erfolgreich oder nicht erfolgreich dokumentieren | Nein | Ja | Ja |
| Nach erfolgreicher Pruefung mit Abschlussnotiz freigeben | Nein | Ja | Ja |
| Bestehende Eintraege loeschen oder veraendern | Nein | Nein | Nein |
| Zu einem abgeschlossenen Fall eine spaetere Notiz ergaenzen | Nein | Nein | Nein |

Nach aussen gibt es ausschliesslich die drei Hauptstatus `Neu`, `In Bearbeitung` und `Erledigt`. Beim Uebernehmen eines neuen Falls waehlt der Admin ohne Vorauswahl ausdruecklich `Ressource sperren` oder `Ressource nicht sperren`; Auswahl, Statuswechsel und eine optionale Sperre werden gemeinsam gespeichert. Der erste Wechsel aus `Neu` ist ausschliesslich ueber diese atomare Uebernahme erlaubt. Eine direkte Tagebuchaktion `block` oder eine allgemeine Ressourcenbearbeitung darf den Entscheid weder ersetzen noch den Fall implizit uebernehmen; bei einem offenen neuen Fall wird der Umgehungsversuch ohne Teilmutation abgewiesen. Eine Sperre ist damit kein eigener Hauptstatus. Danach folgt der verbindliche Betriebsnachweis `Reparatur -> Funktionspruefung -> Abschlussnotiz`. Die Oberflaeche bietet die Funktionspruefung erst an, nachdem mindestens eine Reparatur dokumentiert wurde; so kann auch ein ohne Sperre uebernommener Fall nicht versehentlich einen ungueltigen Schritt absenden. Eine nicht erfolgreiche Funktionspruefung setzt den Fall nicht weiter. War die Ressource fallbezogen gesperrt, wird sie erst nach dokumentierter Reparatur und erfolgreicher Pruefung atomar freigegeben und der Fall abgeschlossen. War sie nie gesperrt, bleibt sie aktiv und nur der gepruefte Fall wird abgeschlossen. Abgeschlossene Faelle koennen nicht mehr ergaenzt, veraendert oder geloescht werden. Weitere Bewohnermeldungen zur gleichen Ressource werden dem bereits offenen neutralen Fall zugeordnet, bleiben aber als getrennte persoenliche Berichte erhalten. Der Haus-Admin arbeitet nur im eigenen Haus. Der Superadmin waehlt ein Haus bewusst aus und sieht oder bearbeitet danach ausschliesslich dessen Faelle; ein globales Superadminrecht allein erweitert weder die aktive Hausabfrage noch die Admin-Push-Empfaengergruppe.

Eine neue Meldung reserviert genau ein Admin-Push-Ereignis je aktivem, eindeutigem Endpoint eines fuer dieses Haus ausdruecklich zugeordneten Haus-Admins. Globale Superadmins, fremde oder inaktive Haus-Admins erhalten ohne diese Hausrolle nichts. Jeder Outboxdatensatz wird atomar beansprucht und unmittelbar vor seinem einzigen moeglichen Provideraufruf erneut gegen aktives Konto, aktive Subscription, Hausbindung, Endpoint-Hash und aktuelle Haus-Adminrolle geprueft. Aendert sich eine spaetere Empfaengerberechtigung waehrend eines Batches, erhaelt dieses Ziel keinen Aufruf und wird terminal als nicht verfuegbar markiert. Nach dem dauerhaft markierten Versuchsbeginn gibt es fuer denselben Datensatz keinen Retry; ein unklarer Ausgang bleibt neutral sichtbar. Solange der sichtbare Hauptstatus `Neu` bleibt, wird nach zwei Stunden und danach fuer jedes erreichte Zweistundenfenster hoechstens eine aktuelle Erinnerung je Meldung und Endpoint reserviert; jedes Fenster ist ein eigenes Ereignis, nach einer Unterbrechung entsteht keine Nachholflut. Nur sicher vor jedem Providerkontakt gescheiterte Vorbereitungen koennen erneut geplant werden. Der Vorgang veraendert weder Fall noch Meldung und wird mit pseudonymer Adminreferenz auditiert.

Adminnamen, E-Mail-Adressen und Reportertexte werden nicht in den neutralen Auditkern kopiert. Administrative Tagebuchaktionen verwenden nur einen mit einem datenbanklokalen Zufallssalz stabil pseudonymisierten `actorRef`, eine Rollenkennung, einen neutralen Aktionscode und fachlich erforderliche Statusflags. Bewohner-API und persoenlicher Export loesen diese Referenz nie zu einer Person auf.

In der Verwaltung stehen neu gemeldete Faelle vor Reparatur- und Prueffaellen. Die Chronik bleibt zunaechst geschlossen, damit auch viele Eintraege scanbar bleiben, und kann pro Fall geoeffnet werden. Suche und Statusfilter bleiben gleichzeitig nutzbar.

### 4. Dauertermine

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geschuetztes woechentliches Waschpaket anlegen | Ja | Ja |
| Genau eine Waschmaschine, optional Trockenraum/Tumbler und Trocknungsdauer festlegen | Ja | Ja |
| Vollstaendiges kuenftiges Dauerpaket entfernen | Ja | Ja |
| Ueberschreiben durch normale Buchung verhindern | Automatisch | Automatisch |

Ein neues Dauerpaket enthaelt genau eine Waschmaschine sowie optional hoechstens einen Trockenraum und einen Tumbler. Seine Bestandteile besitzen eine gemeinsame Gruppenkennung; auch ein Paket nur mit Waschmaschine erhaelt diese Kennung. Im Modus `GBMZ-Regeln` wird beim Trockenraum die zusammenhaengende Nutzungsdauer als Anzahl der fuer den Waschslot erlaubten Zeitfenster gespeichert; Sonntagsfenster werden abgewiesen und auch bei festen Tumbler-Terminen bleibt mindestens ein Tumbler frei. Im Modus `Liberal` darf ein Dauertermin sonntags liegen, der Trockenraum belegt nur den ausgewaehlten Slot und es gilt keine Tumblerreserve. In beiden Modi werden Hauszuordnung, aktive Ressourcen, doppelte Angaben sowie bestehende normale und feste Buchungen vor und innerhalb der Transaktion erneut geprueft. Ein Konflikt speichert keinen Bestandteil. Beim Entfernen wird das vollstaendige aktive Paket desselben Hauses deaktiviert. Historische Legacy-Einzeltermine mit `group_id = NULL` bleiben separat les- und entfernbar.

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

### Betriebliche Kill-Switches

- `BACKUP_ENABLED`, `EMAIL_ENABLED` und `PUSH_ENABLED` sind harte serverseitige Schalter. Eine Integration ist ausschliesslich bei explizitem `true` aktiv. `false`, ein fehlender oder leerer Wert sowie jede ungueltige Eingabe deaktivieren sie sicherheitshalber.
- Gross-/Kleinschreibung und aeussere Leerzeichen werden normalisiert. Ein ungueltiger Wert schreibt nur den Variablennamen, niemals den eingegebenen Wert oder Zugangsdaten, ins Serverlog. Auch direkt erzeugte Transport-Services bleiben ohne ausdrueckliches `enabled: true` deaktiviert.
- `BACKUP_ENABLED=false` hat Vorrang vor `AUTO_BACKUP`, manuellem Backup, Wartungsstart und Pilot-Reset. Diese Betriebswege legen keine Backupdatei an und kontaktieren `BACKUP_UPLOAD_URL` nicht; backupabhaengige Adminaktionen antworten mit `503 BACKUP_DISABLED`. Davon getrennt erstellt eine tatsaechlich erforderliche einmalige Produktionsmigration vor der ersten Datenbereinigung zwingend eine lokale, integritaetsgepruefte Vor-Migrationskopie auf der persistenten Disk. Dieser interne Schutzweg aktiviert weder automatische Backups noch Uploads oder Providerkontakte.
- `EMAIL_ENABLED=false` hat Vorrang vor allen vorhandenen SMTP-Werten. SMTP-Sockets werden nicht geoeffnet; Verifizierung, Reset, Einladung, Freigabe- und Testmail koennen nichts extern senden. E-Mail-abhaengige Fachablaeufe melden den deaktivierten beziehungsweise nicht verfuegbaren Versand.
- Der SMTP-Transport schreibt Header und Nachrichtentext durchgehend mit `CRLF`-Zeilenenden und begrenzt dadurch auch laengere zweisprachige Wohnungseinladungen auf einzelne RFC-konforme Datenzeilen. Punkte am Zeilenanfang werden erst nach dieser Normalisierung SMTP-konform maskiert.
- `PUSH_ENABLED=false` hat Vorrang vor vorhandenen VAPID-Werten und Abos. Es werden keine VAPID-Schluessel erzeugt oder gespeichert, keine Abos neu angelegt und keine Push-Providerverbindung aufgebaut. Pushabhaengige Schreib- und Testrouten antworten mit `503 PUSH_DISABLED`.
- `/api/health`, `/api/version` und die Adminuebersicht zeigen ausschliesslich den aktivierten/deaktivierten Zustand der drei Integrationen; Geheimnisse und Providerwerte werden nie ausgegeben.
- In `Verwalten` zeigen Ueberblick und Systemreiter einen deaktivierten Kanal in Deutsch oder Englisch ausdruecklich als `Deaktiviert` beziehungsweise `Disabled`. Bei deaktiviertem Backup erscheinen weder der Hinweis auf ein noch nicht automatisch erstelltes Backup noch eine Aufforderung zur Providerkonfiguration. Manuelles Erstellen, Herunterladen und der backupabhaengige Wartungsstart sind dann als nicht verfuegbare, deaktivierte Bedienelemente ausgegeben. Direkte oder veraltete Clients erhalten weiterhin kontrolliert `503 BACKUP_DISABLED`, `503 EMAIL_DISABLED` oder `503 PUSH_DISABLED`.
- Automatisierte Funktionspruefungen, die einen aktiven Transportvertrag benoetigen, starten ihren isolierten Kindprozess ueber den Safety-Runner mit allen drei Schaltern explizit auf `true`. Der eigentliche No-Send-Test verwendet diese Testhilfe nicht.

Die Produktion besitzt eine zusaetzliche harte Hold-Grenze: `BACKUP_ENABLED` muss explizit `true` oder `false` sein. Bei `true` ist ausschliesslich das manuelle lokale Backup unter `/var/data/backups` fuer Download, Einzelbackup und Wartungsstart freigegeben; `AUTO_BACKUP` muss weiterhin exakt `false` sein. Der globale Pilot-/Testkonten-Reset bleibt in Produktion unabhaengig vom Backupschalter vor Passwort-, Backup- und Datenbankwirkung gesperrt. E-Mail darf nur mit `EMAIL_ENABLED=true`, `PRODUCTION_EMAIL_APPROVED=true` und einer vollstaendigen SMTP-Konfiguration aus Host, Port, TLS-Modus, Benutzer, Passwort und Absender starten. Push darf nur mit `PUSH_ENABLED=true` und gleichzeitig `PRODUCTION_PUSH_APPROVED=true` starten. Ohne die jeweilige doppelte Freigabe bleibt der Kanal deaktiviert oder der Start stoppt vor Wirkung. Test-Fixture, Testlink, Legacy-Registrierung und Seed-Passwortreset muessen fehlen oder exakt `false` sein. Externe Backup-Upload-, VAPID-, R2-, S3-, AWS-, Cloudflare- oder Kopia-Bindungen bleiben vollstaendig verboten; bei aktiv freigegebener E-Mail sind ausschliesslich die dokumentierten SMTP-Schluessel zulaessig. Bei einer Abweichung endet der Start vor Verzeichnisanlage, SQLite, WAL, Schema, Seed, Cleanup, Scheduler oder Providerkontakt.

Der Systemreiter gliedert die vorhandenen Funktionen in `Betrieb`, `Benachrichtigungen` sowie `Verantwortung & Protokoll`. Gefaehrliche Aktionen bleiben geschlossen und optisch von Testmail und Testpush getrennt.

### App-Updates und Wartung

- Jeder Push erhoeht die sichtbare Versionsnummer. Testkandidaten verwenden Vorabversionen nach dem Schema `0.3.0-test.1`, `0.3.0-test.2` und so weiter und zeigen den Status `Testversion`. Die ausdrueckliche Produktfreigabe erlaubt eine stabile SemVer-Version ohne Testkennzeichnung; der erste freigegebene Pilotstand ist `0.3.0`.
- Der ausgelieferte App-Name wird serverseitig aus der Umgebung bestimmt. Nur `APP_ENV=production` zusammen mit `NODE_ENV=production` liefert `WaschZeit`. Agent-Test, Staging, lokale Entwicklung sowie fehlende, leere oder unbekannte Werte liefern fail-safe `WaschZeit Test`. Seitentitel, Kopfzeile, Manifest, installierter PWA-Name, `/api/health` und `/api/version` verwenden denselben Zustand. Auch nach Anmeldung, Navigation, Sprach- oder Hauswechsel baut der Browser den Seitentitel aus diesem geladenen App-Namen auf und verliert die Testkennzeichnung nicht.
- Jede ausgelieferte Seite kennt ihre geladene Releasekennung. Die App fragt den aktuellen Serverstand beim Start, beim Zurueckkehren in die App und danach alle zwei Minuten ab.
- HTML, JavaScript und CSS tragen dieselbe Releasekennung in ihren Asset-URLs. Dadurch kann kein neuer Seitenaufbau versehentlich mit einer alten zwischengespeicherten Programmlogik kombiniert werden.
- Ist ein neuer Stand verfuegbar, erscheint der sichtbare Hinweis `Eine neue Version ist verfuegbar` mit `Jetzt aktualisieren`. Erst nach dieser Zustimmung aktiviert der Service Worker den neuen Stand und laedt die Seite neu.
- Eine bereits begonnene Buchungsauswahl wird nie durch ein Update unterbrochen. Die Zustimmung wird vorgemerkt; das Neuladen erfolgt erst, wenn die Auswahl abgeschlossen oder verworfen wurde.
- Unter `Einstellungen` > `App & Geraet` stehen Versionsnummer und Auslieferungsdatum. `Nach Update suchen` prueft den Stand sofort.
- Fuer groessere Datenbank- oder Betriebsarbeiten startet ausschliesslich der Superadmin unter `Verwalten` > `System` den globalen Wartungsmodus. Der Start verlangt zur erneuten Bestaetigung das aktuelle Superadmin-Passwort. Vor der Sperre erstellt und prueft der Server automatisch ein SQLite-Backup. Bei `BACKUP_ENABLED=false` bleibt der Wartungsstart gesperrt, weil der Sicherheitsvertrag ohne vorherige Sicherung nicht erfuellt ist.
- Waehrend der Wartung bleiben Anmeldung, Abmeldung, Health- und Lesezugriffe erreichbar. Alle anderen schreibenden Anfragen werden serverseitig mit `503 MAINTENANCE_MODE` abgelehnt. Bewohner sehen einen ruhigen Wartungsdialog; bestehende Buchungen bleiben unveraendert.
- Beim Beenden muessen SQLite-`quick_check` und eine sofort wieder entfernte Testbuchung erfolgreich sein. Bei einem Fehler bleibt die Wartung aktiv. Start, erfolgreicher Abschluss und Fehler werden im Admin-Audit festgehalten.
- `/api/health` liefert Version, Releasekennung und Wartungsstatus. `/api/version` stellt denselben Release- und Wartungsstand fuer PWA und Browser bereit.

## E-Mail-Hinweise

- Eine neue oder geaenderte E-Mail-Adresse muss bestaetigt werden.
- Die Bestaetigung speichert den normalisierten bestaetigten Adresswert dauerhaft, bevor der Einmaltoken entfernt wird. Reset, Opt-in, Queue und Versand akzeptieren die Adresse nur bei exakter Uebereinstimmung mit diesem Wert und aktivem Konto.
- Aendern oder Loeschen einer primaeren oder zweiten Adresse entfernt sofort Flag und Bindungswert. Altdaten mit Flag, aber ohne belastbaren Bindungswert werden beim Start entwertet; es wird kein vermeintlicher Bestaetigungswert hergeleitet.
- Eine erste E-Mail-Adresse ist fuer jede persoenliche Identitaet Pflicht; eine zweite eigene Wiederherstellungsadresse ist optional. Eine Adresse kann systemweit nur einer Identitaet gehoeren.
- E-Mail-Adressen werden ausschliesslich durch die angemeldete Person oder bei einer persoenlich geprueften Wiederherstellung durch die betroffene Person selbst gesetzt; Admins koennen sie nicht direkt ersetzen.
- Ohne Bestaetigung werden keine Freigabe-Hinweise und keine Passwort-Reset-Links versendet.
- Bei Freigabe-E-Mails wird jeder einzelne Empfaenger unmittelbar vor dem Provideraufruf erneut aus der Datenbank geladen. Kontoaktivitaet, Haus, Freigabe-Opt-in, Filter und die exakt gebundene aktuelle Primaer- oder Zweitadresse muessen weiterhin gueltig sein; ein Entzug zwischen zwei Fuenferbatches fuehrt fuer dieses Ziel zu keinem Providerattempt.
- `Frueher frei` ist nur waehrend des aktuell gebuchten Slots moeglich.
- `Absagen und informieren` ist nur vor Beginn des gebuchten Slots moeglich.
- Nach Slotende wird keine Freigabemail mehr ausgeloest.
- Empfaenger muessen im selben Haus sein und passende Filter fuer Bereich, Wochentag und Slot aktiviert haben.
- `Loeschen` entfernt eine Buchung ohne Rundmail.
- Ohne eingerichteten SMTP-Zugang funktioniert die bestehende Buchungsapp weiter, versendet aber keine E-Mails und kann keine neuen Wohnungskonten einladen.
- `EMAIL_ENABLED=false` blockiert den SMTP-Transport auch dann vollstaendig, wenn SMTP-Zugangsdaten vorhanden sind.

## Push-Hinweise und PWA

- Die App besitzt ein Web-App-Manifest und einen Service Worker. Dadurch kann sie auf unterstuetzten Smartphones und Desktops als PWA installiert werden.
- Beim ersten Start und spaeter unter `Persoenliche Einrichtung` zeigt `Als App installieren` entweder den direkten Browser-Installationsdialog oder den passenden iPhone-Hinweis.
- Push-Hinweise sind pro Browser/Geraet freiwillig. Bewohner muessen Push im Browser erlauben und koennen das Abo in der App wieder deaktivieren.
- Push nutzt dieselben Filter wie E-Mail: Haus, Bereich, Wochentag, Zeitfenster und aktivierte Freigabe-Hinweise.
- Freigaben und Absagen senden Push an passende aktive Abos im selben Haus, nicht an die Person, die den Termin freigegeben hat.
- Push-Texte nennen neutral, wer den Termin freigegeben oder abgesagt hat. Beim Antippen oeffnet die App einen Detaildialog mit Person, Ressource, Datum, Slot und Buchungsfrage.
- Der Dialog bucht den Slot ueber die normale Buchungspruefung. Ist der Slot inzwischen vergeben, abgelaufen oder die Ressource gesperrt, wird das im Dialog angezeigt.
- Der Server erzeugt VAPID-Schluessel automatisch und speichert sie in SQLite, falls keine `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` gesetzt sind. Fuer dauerhafte Produktionsschluessel koennen diese Werte in Render als Environment Variables hinterlegt werden.
- Bei `PUSH_ENABLED=false` werden weder vorhandene VAPID-Werte verwendet noch neue Schluessel oder Abos gespeichert.
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
- Restplaetze nur am heutigen Schweizer Tag mit genau einer Waschmaschine, optional einem Tumbler, ausdruecklicher nicht gespeicherter Selbsttrocknung, wohnungsweiter Tagesgrenze, Atomaritaet und Idempotenz.
- Waschmaschinen-, Trockenraum- und Tumblerregeln inklusive Parallelzugriff.
- Bewohner-, Haus-Admin- und Superadminrechte sowie Fremdhaus-Isolation.
- Kombinierte Bewohner-/Hausadmin-Rolle sowie die gesperrte Buchungserstellung fuer reine Admin- und Superadmin-Konten.
- Schutz von Haus-Admins vor Eingriffen durch gleichrangige Haus-Admins.
- Feste Buchungen, Benutzerverwaltung, Geraeteverwaltung, Audit und Backups.
- PWA-Dateien, Push-Abo, Push-Test und Freigabe-Hinweise ueber Push.
- Harte No-Send-Schalter fuer Backup, E-Mail und Push inklusive direkter und indirekter Adminpfade, vorhandener Providerwerte und null externen Verbindungsversuchen.
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
| `npm run test:fixture` | Agent-Test-Identitaetsgates, transaktionalen deterministischen Fixture-Neuaufbau, exklusive Rollen, No-PII und No-Send pruefen |
| `npm run test:remaining-slots` | Tages-, Partei-, Ressourcen-, Atomaritaets-, Idempotenz-, Storno- und Exportgrenzen der Restplaetze pruefen |
| `npm run test:security` | Sicherheitsheader, Origin-Schutz, Sitzungen, Einladungen, Anmeldewege, Einmalcodes, Passwortregeln und Rate-Limits dynamisch pruefen |
| `npm run test:i18n` | Deutsche und englische Schluessel, Rueckfall, Persistenzvertrag, sechs Rollenfuehrungen, Kapitel und Benachrichtigungsvorlagen pruefen |
| `npm run test:media` | Sechs MP4/VTT/Poster/Transkript-Pakete, H.264/AAC-Marker, Format, Laufzeit, Textvollstaendigkeit und PWA-Cachegrenzen pruefen |
| `npm test` | Vollstaendige API- und Funktionsablaeufe pruefen |
| `npm run test:roles` | Rollen, Rechte, Hausisolation und Abmeldung pruefen |
| `npm run test:year` | Ein Jahr mit 100 Bewohnerkonten in sechs getrennten Haeusern simulieren |
| `npm run test:backup` | Externe PUT-Kopie, Tokenuebertragung, SQLite-Integritaet und den Neustart aus einer wiederhergestellten Sicherung pruefen |
| `npm run test:safety` | Strikte Kill-Switches, Render-Blueprints und null Backup-/SMTP-/Push-Providerkontakte bei deaktivierten Integrationen pruefen |
| `npm run test:e2e` | Verbindlichen Browserlauf fuer Einladung, persoenlichen QR-Zugang, alle sechs Medienpakete mit Kapitelsprung sowie visuelle Layoutpruefung bei 390 x 844, 768 x 1024 und 1440 x 900 ausfuehren |
| `npm run test:a11y` | Statische Barrierefreiheitspruefung ausfuehren |
| `npm run audit` | Den ausfuehrlichen Gesamtaudit inklusive Backup-Wiederherstellung und verbindlichem Browsertest Schritt fuer Schritt ausfuehren |
| `npm run check` | Verbindliches Abschluss-Gate aus Syntax-, Sicherheits-, Funktions-, Rollen-, Jahres-, Barrierefreiheits-, Backup- und Browsertest ausfuehren |

Der vollstaendige Katalog mit Pruef-ID, Soll-Ergebnis und Automatisierungsweg steht in `TESTPLAN_GESAMTAUDIT.md`. Externe Live-Dienste und reale Mobilgeraete werden dort als eigener manueller Abnahmeblock gefuehrt und duerfen nicht durch lokale Mocks als produktiv bestaetigt gelten.

## Entwicklerreferenz

### Agentenrollen

Der verbindliche Katalog fuer Unternehmensleitung, Technik, Entwicklung, Pilot, Business, Organisation, Recht, unabhaengige Endabnahme und externe Beratung steht in `.agents/ROLES.md`. Der Nutzer bleibt Eigentuemer und Auftraggeber. Die bestehenden technischen Aufgaben wurden in die neue Hierarchie ueberfuehrt; fuer die sechs neuen Unternehmensfunktionen bestehen eigene Codex-Aufgaben:

| Nr. | Codex-Aufgabe | Berichtslinie |
| --- | --- | --- |
| `00` | `00 · CEO – Unternehmensleitung` | direkt an Eigentuemer/Auftraggeber |
| `05` | `05 · Eigentuemer-Briefing – Einfacher Ueberblick` | direkt an Eigentuemer; Zusammenarbeit mit Unternehmens-CEO ohne Vorzensur |
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

#### AI-native Vier-Rollen-Organisation

Produktlieferungen verwenden vier operative Huete statt einer dauernden seriellen Kette aus allen Fachrollen:

| Hut | Aufgabe | Grenze |
| --- | --- | --- |
| `Delivery Lead` | Ziel, Prioritaet, Scope, Risiken, Freeze und Eigentuemerentscheide koordinieren | implementiert, validiert und released nicht selbst im selben Auftrag |
| `Builder` | als alleiniger Product-Writer den Kandidaten umsetzen und den Freeze belegen | kein eigenes Endurteil und keine parallelen Product-Writer |
| `Independent Validator` | den vollstaendigen Freeze unabhaengig pruefen und gebuendelt `PASS` oder `FAIL` urteilen | keine Selbstabnahme oder Fehlerkorrektur; Negativbefunde bleiben bindend |
| `Release Runner` | Testrelease parallel read-only vorbereiten und einen freigegebenen Freeze ausrollen | kein Kandidatenwrite; Testrelease erst nach gueltigem Auftrag und Validator-`PASS` |

CTO, Legal, Privacy, Security, Product Operations, Business und External Advisory werden nur bei konkreter Betroffenheit als read-only Fachlinsen zugeschaltet. Ihre bestaetigten negativen Urteile duerfen nicht abgeschwaecht oder umgestuft werden. `OWNER_BRIEFING` bleibt eine nicht blockierende Uebersetzungsfunktion und weder Filter noch Freigabe- oder Prozessgate.

Die `Test-Fast-Lane` gilt ausschliesslich fuer isolierte, synthetische, reversible und kostenkontrollierte Testumgebungen ohne reale Daten-, Versand- oder Produktionswirkung. Nach vollstaendig identifiziertem Freeze, Validator-`PASS` und gueltigem Releaseauftrag darf der Release Runner das Testrelease ohne weitere operative Zwischenrunde vollziehen. Die `Guarded Lane` umfasst Produktion, reale Daten und Nachrichten, Migrationen, irreversible Aktionen, externe Kosten sowie Rechts-, Datenschutz- und Sicherheitsrisiken; alle dafuer festgelegten Fach-, Unternehmens- und Eigentuemer-Gates bleiben zwingend.

Diese Lane-Regel hat fuer den Lieferweg Vorrang vor aelteren pauschalen Freigabeformulierungen. In der Test-Fast-Lane sind CTO und weitere Fachrollen nur bei konkreter Betroffenheit read-only beteiligt; harte Security-, Privacy-, Rollen-, Haus-, Datenverlust- oder Rechtsbefunde stoppen den Freeze sofort und bindend. Eine zusaetzliche serielle Standard-CTO-/CEO-Runde nach Validator-`PASS` ist nicht vorgesehen. Pauschale CTO-, Unternehmens-, Rechts-/Datenschutz-, Kosten-, institutionelle und Eigentuemer-Gates gelten weiterhin vollstaendig fuer die Guarded Lane.

Der laufende `test.11`-Prozess bleibt unveraendert: Recovery-Worktree, Checkpoints, Befunde und STOPs werden weder kopiert noch zurueckgesetzt oder neu begonnen. Dieser Organisationskandidat laeuft in einem getrennten, nicht deploy-verbundenen Zweig, erzeugt keine neue test.11-Anforderung und darf Produktarbeit, QA oder Testdeployment nicht pausieren oder blockieren. Eine spaetere Integration muss den dann finalen HANDBUCH-Stand read-only abgleichen.

`OWNER_BRIEFING` ist die reine Stabs- und Uebersetzungsfunktion `05 · Eigentuemer-Briefing – Einfacher Ueberblick`. Sie beantwortet in Alltagssprache vier Fragen: Stand, Aenderung, wichtigstes Risiko oder offener Punkt sowie den jetzt noetigen Eigentuemerentscheid. Bereichsampeln werden getrennt als `GRUEN`, `GELB`, `ROT` oder `GRAU` mit Quelle, Datum und relevantem Versions-/Revisionsstand gezeigt; es gibt keine automatisch berechnete Gesamtampel und keine eigene Umstufung von QA-, Legal-, Security- oder Finanzurteilen. Waehrend aktiver Entwicklung oder Pilotvorbereitung berichtet die Funktion nach jeder wesentlichen Lageaenderung und mindestens woechentlich, ausserdem vor Eigentuemerentscheiden und bei bestaetigten roten Befunden; ausserhalb aktiver Phasen monatlich oder auf Anfrage. Sie fuehrt, prueft, filtert, genehmigt, ermittelt und kontaktiert nicht, ersetzt keine direkte Eskalation und besitzt weder App-Benutzerrolle noch App-Rechte.

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
| `src/services/remaining-slots.js` | Serverseitige Schweizer Tagesgrenze, Wohnungspartei, Optionen, atomare Restplatzbuchung, Idempotenz und erlaubte Stornowege |
| `src/services/agent-test-fixture.js` | Fail-closed Agent-Test-Identitaet und transaktionaler deterministischer Aufbau ausschliesslich synthetischer Fixturedaten |
| `src/services/mail-transport.js` | SMTP-Konfiguration und Transport fuer ausgehende E-Mails |
| `src/services/localization.js` | Serverseitige `de/en`-Vorlagen fuer Verifizierung, Reset, Freigabe, Testmail und Push |
| `src/services/notifications.js` | E-Mail-Bestaetigung, Passwortreset und gemeinsame Freigabe-Benachrichtigungen |
| `src/services/maintenance-reporting.js` | Getrennte persoenliche Stoerungsmeldungen, neutraler Tagebuchkern, Migration, Idempotenz, Opt-ins sowie Admin- und Reporter-Outbox |
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
| `render.agent-test.yaml` | Wiederverwendbare synthetische Agent-Testumgebung auf Render |

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
- `users` speichert genau eine persoenliche Identitaet pro eindeutiger E-Mail. `email_verified_value` und `secondary_email_verified_value` binden den Bestaetigungsnachweis getrennt an den normalisierten tatsaechlich bestaetigten Adresswert; sie sind interne Sicherheitswerte und fehlen in persoenlichen Exporten sowie Benachrichtigungspayloads. `users.apartment_id` bindet mehrere Identitaeten an dieselbe Wohnung; `apartments.claimed_by` bezeichnet nur den stabilen technischen Buchungseigentuemer. Dadurch teilen alle Mitglieder Buchungen und Vorausbuchungsgrenzen.
- `users.language` speichert ausschliesslich `de` oder `en` mit Standard `de`. Die additive Migration setzt bestehende und ungueltige Werte sicher auf Deutsch zurueck.
- `user_house_roles` speichert Haus-Adminrechte unabhaengig von der Wohnungsmitgliedschaft. `users.is_superadmin` bleibt die globale Zusatzberechtigung. QR-Partnercodes schreiben ausschliesslich die Wohnungszuordnung und niemals eine Admin- oder Superadminberechtigung.
- `maintenance_cases` und `maintenance_entries` bilden den neutralen, nicht loeschbaren Betriebsnachweis. `maintenance_reports` speichert pro Einsendung den loeschbaren persoenlichen Titel und Freitext; Einstellungen und Zustellzeilen verweisen per Fremdschluessel auf diesen Bericht und werden bei dessen oder der Kontoloeschung mit entfernt. Reportername und Kontakt werden nicht in den Fallkern kopiert.
- Die alte Route `POST /api/me/apartment/join` bleibt mit `410` dauerhaft gesperrt; der unerreichbare fruehere Merge-Code wurde entfernt. Partner erhalten ueber QR eine eigene Identitaet. Ein abgelehnter Legacy-Aufruf veraendert weder Konto noch persoenliche Meldungen.
- Die additive Migration `maintenance_reports_v1_migrated` laeuft einmalig und transaktional. Eindeutig zuordenbare alte Meldungen werden in die persoenliche Schicht verschoben; Fallkopf, alte Meldungs-Chronikzeilen und Wartungs-Audits werden danach von Reporter-PII bereinigt. Ein zweiter Lauf veraendert keine Zaehler. Erkennt der Server in Produktion zu migrierende Bestandsdaten, lauscht er erst nach einem erfolgreich erstellten und integritaetsgeprueften Vor-Migrationsbackup. Deaktiviertes Backup oder ein Backupfehler bricht den Serverstart vor jeder PII-Bereinigung ab. Eine frische Datenbank ohne Migrationsdaten benoetigt kein leeres Sicherungsartefakt. Zaehlervergleich und separater CTO-/QA-/Betriebsentscheid bleiben vor einem Produktionsvollzug Pflicht; dieser Kandidat fuehrt keine Produktionsmigration aus.
- Bewohner und Haus-Admins duerfen keine Daten eines anderen Hauses lesen oder veraendern.
- Nur der Superadmin darf das aktive Haus wechseln. Hausbezogene Aktionen bleiben danach strikt auf dieses serverseitig aktive Haus begrenzt.
- Rollen- und Hausgrenzen muessen immer serverseitig durchgesetzt und im Rollentest abgedeckt werden.
- `SEED_ADMIN_NAME` bezeichnet das bestehende oder neu anzulegende Superadmin-Konto. Ist `SEED_ADMIN_PASSWORD` gesetzt, wird dieses Konto beim Start als aktiver Superadmin sichergestellt, ohne ein bereits geaendertes Passwort zu ueberschreiben.
- `SEED_ADMIN_FORCE_PASSWORD_RESET=true` ist im normalen lokalen Entwicklungsmodus ein technischer Recoverymechanismus. Der Produktionsguard lehnt ihn vor jeder Wirkung ab; eine produktive Passwortwiederherstellung benoetigt einen getrennten, voll gegateten Recovery-Kandidaten.
- `SESSION_IDLE_MINUTES` legt die Inaktivitaetsgrenze in Minuten fest. Standard und Render-Konfiguration sind 30 Minuten; Werte werden aus Sicherheitsgruenden auf 5 bis 480 Minuten begrenzt.

### Deployment

`render.staging.yaml` beschreibt einen getrennten kostenlosen Render-Dienst `waschplan-staging-test7` auf dem eindeutigen Zweig `codex/staging`. Auto-Deploy ist aus; der erste Freeze wird bewusst manuell gestartet. Staging installiert mit `npm ci`, prueft `/api/health`, verwendet ausschliesslich die fluechtige Datenbank `/tmp/waschplan-staging.sqlite`, besitzt keine Disk und keine Produktions-Env-Gruppe. `BACKUP_ENABLED`, `EMAIL_ENABLED`, `PUSH_ENABLED` und `AUTO_BACKUP` stehen dort auf `false`; SMTP-, VAPID- und Backup-Upload-Werte werden nicht hinterlegt. Eigene Staging-Geheimnisse wie `SESSION_SECRET`, Seed-Passwort, Hauscode und spaetere Basis-URL bleiben `sync: false`.

`render.agent-test.yaml` beschreibt den dauerhaft wiederverwendbaren Free-Dienst `waschzeit-agent-test` in Frankfurt auf dem Releasezweig `codex/agent-test`. Seine Datenbank liegt ausschliesslich unter `/tmp/waschzeit-agent-test.sqlite`; es gibt keine Disk, Produktions-Env-Gruppe, Providerwerte oder reale Daten. Nur dieser Agent-Testdienst pinnt seine Render-Laufzeit ueber `NODE_VERSION` exakt auf Node `22.23.1`. Diese offizielle Node-Version enthaelt npm `10.9.8`; `packageManager: npm@10.9.8` dokumentiert diese Kombination im Paket. Der netzwerkfreie `scripts/toolchain-guard.js` prueft Node und npm vor `npm ci` exakt und bricht bei fehlenden, ungueltigen oder abweichenden Versionen ab. Er installiert nichts und verwendet weder globale npm-Installation noch `npx`, Corepack oder einen sonstigen Bootstrap. Der Pin dient ausschliesslich der reproduzierbaren Laufzeit- und Ressourcenhaertung. Linux-`npm ci` bestand zuvor sowohl unter Node `22.23.1` als auch unter Node `24.14.1`; deshalb beweist der Pin keine Ursache des fehlgeschlagenen Render-Builds. Die Node-24-Hypothese und die tatsaechliche Render-Ursache bleiben unbestaetigt.

Die Lean-A-Fixture wird nur bei explizitem `AGENT_TEST_FIXTURE_ENABLED=true` aktiv und prueft vor dem Anlegen des Datenbankverzeichnisses fail-closed `NODE_ENV=production`, den Agent-Test-Umgebungsnamen, die exakte Service-ID und den Servicenamen, Host, HTTPS-Ursprung, Release `agent-v0.3.7`, Paketversion, Releasezweig, die identische erwartete und tatsaechliche Commitrevision, Node-/Renderkontext, den fluechtigen Datenbankpfad und alle No-Send-/No-Backup-Schalter. Legacy-Hausregistrierung, Test-Einladungslinks und erzwungener Seed-Passwortreset muessen fehlen oder exakt `false` sein. SMTP-, VAPID-, Backup-Upload- oder andere Providerbindungen muessen fehlen. Sie entfernt ausschliesslich ihre markierten synthetischen Daten und baut Initialschema, Standard-Seeds und Fixture in einer Transaktion auf; ein Fehler hinterlaesst keinen Teilzustand. Vor `ready` gelten globale Datenbankinvarianten: exakt zwei Haeuser, vier Konten, fuenf Ressourcen, eine Wohnung, die festgelegten zwei Hausadminbindungen und keine Sitzung. Unmarkierte weitere Haeuser, Konten, Ressourcen, Wohnungen oder Rollenbindungen stoppen den Start; markierte Fixture-Daten werden nur innerhalb der transaktionalen Reset-Allowlist erneuert. Jeder Neustart entfernt innerhalb derselben Transaktion saemtliche Sitzungen, auch die des kombinierten Bestandskontos und unlesbare Alt-Sitzungen. Das bestehende kombinierte Seed-Admin-Konto bleibt ansonsten unveraendert.

Die drei Fixture-Passwoerter und das Seed-Admin-Passwort sind vier getrennte Owner-Runtimewerte (`sync: false`), werden nie ausgegeben oder fuer einen Readback angefordert und liegen ausschliesslich im freigegebenen Passwortmanager. Die Runtime-Diagnose prueft Staerke und gegenseitige Verschiedenheit ausschliesslich im Speicher und erzeugt dabei weder Hash noch Secretmerkmal. Credentialfehler werden ohne Zuordnung zu einem einzelnen Wert als vollstaendige Bitmaske ausgegeben: `0x1` Fixture-Policy, `0x2` fehlende paarweise Fixture-Verschiedenheit, `0x4` Seed-Policy und `0x8` Fixture-Seed-Ueberschneidung. Alle vier Praedikate werden immer ausgewertet und OR-kombiniert; `0x0` erzeugt keinen Fehler. Bei einer frischen fluechtigen DB wird der Seed-Wert ausschliesslich als Passwort-Hash des neu angelegten kombinierten Kontos gespeichert. Bei einem vorhandenen Konto und `SEED_ADMIN_FORCE_PASSWORD_RESET=false` wird der verdeckte Legacy-Wert weder gehasht noch auf das Konto geschrieben. Fuer den naechsten Predeploy genuegt das unveraendert verdeckt vorhandene `SEED_ADMIN_PASSWORD`; allein wegen fehlender Lesbarkeit ist kein owner-seitiges Neusetzen erforderlich. Nur wenn Render abstrakt `nicht vorhanden` meldet oder der Owner unabhaengig weiss, dass der Wert den unveraenderten Vertrag nicht erfuellt, ist vor einem spaeteren Deploy ein neuer gesonderter Environment-Vertrag erforderlich. `SEED_ADMIN_FORCE_PASSWORD_RESET` bleibt dabei `false`; es gibt keine stille Lockerung und keine Aenderung des kombinierten Kontos.

Der lokale Fixture-Sink ist in die tatsaechlichen E-Mail- und Pushprovidergrenzen eingeschaltet und enthaelt nur abstrakte Statusereignisse. `externalAttempts` ist kein konstanter Sollwert, sondern der am Provider-Wrapper vor einem echten Aufruf gemessene Prozesszaehler; `ready` verlangt seinen tatsaechlichen Wert `0`. E-Mail, Push, externe Provider und Backups bleiben hart deaktiviert. Der Prozess startet ueber `startup.js`. Jeder synchrone Guard-, Storage-, Fixture-, Migrations- oder Listenerfehler erzeugt hoechstens eine allowlistete Zeile. Credentialfehler verwenden exakt `STARTUP_ABORT class=GUARD_CREDENTIALS failMask=0xN`; alle anderen Klassen behalten `WASCHZEIT_STARTFAIL class=...`. Stack, Pfad, Env-Name/-Wert, Credentialzuordnung, Wert, Hash, tatsaechliche Laenge, Zeichenklasse, Secretmerkmal, Hook, ID und PII werden nicht ausgegeben. Der kurze Marker wird vollstaendig und synchron auf den Standardfehler-Dateideskriptor geschrieben, damit er auch vor einem unmittelbaren Exit in einer gepipeten Render-Laufzeit erhalten bleibt. Eine unbehandelte Exception oder Promise-Ablehnung beendet den Prozess danach unmittelbar mit Nichtnullcode. Auch ein Marker-Schreibfehler darf den Exit nicht verhindern. Ein Listener darf in einem unbekannten Prozesszustand weder Health noch andere HTTP-Anfragen weiter bedienen.

Der Free-Dienst besitzt keine persistente Disk. Restart, Deploy oder Spin-down duerfen die `/tmp`-Daten verlieren; beim naechsten Start wird die markierte synthetische Baseline deterministisch neu aufgebaut. Das ist eine ausdrueckliche Testgrenze und kein Produktions-Backup-/Restore- oder Retentionvertrag. Die Fixture ist weder UI-Funktion noch oeffentliche Resetroute und ausserhalb der exakt gebundenen Agent-Testidentitaet nicht lauffaehig.

Der einzige zulaessige Releaseweg fuer `0.3.7` beginnt erst nach identischem Freeze, lokalem linearem Releasecommit, technischem Review, unabhaengigem Validator-PASS und Owner-GO. Blueprint Auto Sync bleibt pausiert und Service AutoDeploy bleibt `On Commit`. Danach werden die drei dedizierten Owner-Fixturesecrets, `AGENT_TEST_EXPECTED_COMMIT` und alle gefrorenen Guardwerte in genau einem Environment-Vorgang mit der sichtbar eindeutigen Option `Save only` gespeichert. Es muessen danach null neue Deploys existieren und der bisherige freigegebene Agent-Test-Commit weiterhin live sein. Erst dann folgt genau ein normaler Fast-forward-Push des exakten `0.3.7`-Commits auf `refs/heads/codex/agent-test`; dieser Push ist der einzige Deploytrigger und muss genau eine neue AutoDeploy-ID erzeugen. AutoDeploy wird nicht umgeschaltet; Manual Deploy, Restart, Deploy-Hook, Blueprint-Sync, zweiter Push oder Retry gehoeren nicht zu diesem Vertrag. Jede Abweichung stoppt den Lauf. Produktion und `master` bleiben technisch und organisatorisch getrennt.

`render.yaml` beschreibt ausschliesslich einen spaeteren, getrennt freizugebenden Produktionsdeploy auf `master`, installiert ebenfalls mit `npm ci` und behaelt SQLite sowie lokale Backups auf der persistenten Disk unter `/var/data`. Bei `NODE_ENV=production` muss `APP_ENV` exakt `production` sein; fehlende, leere, unbekannte oder andere Zielidentitaeten stoppen vor Dateisystem und Datenbank. Der exakte Datenbankpfad und `WEB_CONCURRENCY=1` werden ebenfalls vor dem ersten Datenbankzugriff geprueft. Der separat vollstaendig identitaetsgebundene Agent-Test bleibt seinem eigenen Guard unterstellt. Agent-Test-Fixture, Legacy-Registrierung, Testlinks, Seed-Passwortreset, automatisches Backup, E-Mail und Push bleiben beim ersten Produktionsstart hart deaktiviert. Das lokale manuelle Backup ist fuer Superadmin und Wartungsstart aktiviert; externe Providerbindungen muessen fehlen. `SESSION_SECRET` wird nie im Repository erzeugt oder gespeichert, sondern bleibt im Blueprint `sync: false`.

Vor jedem Produktionsdeploy aktiviert der Betreiber im noch laufenden freigegebenen Bestand den vorhandenen Wartungsmodus. Der Wartungsstart erstellt genau ein neues lokales SQLite-Backup, prueft dessen Integritaet und setzt erst danach die globale Schreibsperre. Der Betreiber laedt genau dieses Artefakt als unabhaengige Kopie auf einen verschluesselten Owner-Datentraeger. `node scripts/verify-production-backup.js <backup.sqlite>` prueft die heruntergeladene Kopie ausschliesslich read-only auf SQLite-Integritaet, Fremdschluessel, Datei-SHA256, den allowlisteten WaschZeit-Strukturvertrag samt Schema-SHA256 und aggregierte Tabellenzaehler. Fremde Tabellen oder fehlende Kernspalten werden abgelehnt; Inhalte, Namen und sonstige PII werden nicht ausgegeben. Der Deploy bleibt gesperrt, bis diese Pruefung PASS ist und der aktuelle Render-Disk-Snapshot sichtbar bestaetigt wurde. Das lokale manuelle Backup bleibt aktiv; wegen `AUTO_BACKUP=false` startet kein Scheduler. Externe Uploads bleiben mangels erlaubter Bindung gesperrt. Es gibt fuer den Pilotbetrieb keinen Kopia-/R2-/Repository-Server, keine Fuenf-Minuten-Replikation und keine globale Backup-Frische-Schreibsperre. Eine spaetere Automatisierung benoetigt einen neuen nachgewiesenen Bedarf und eine eigene Kosten-/Architekturentscheidung.

Stop-/Ruecksetzregel: Staging wird bei unerwartetem externem Verbindungsversuch, falscher Version, nichtfluechtigem Speicher, fehlgeschlagenem Healthcheck oder nicht exakt deaktiviertem Kill-Switch sofort gestoppt. Ein Ruecksetzen erfolgt durch Stoppen des Dienstes und Verwerfen der fluechtigen `/tmp`-Datenbank; Produktionsdaten werden dafuer niemals kopiert oder veraendert. Der Free-Plan kann schlafen und ist nicht fuer Verfuegbarkeits- oder Lastzusagen geeignet.

Der GitHub-Workflow `.github/workflows/deploy-render.yml` installiert Chromium und fuehrt `npm run check` aus. Der verbindliche Browserlauf erzeugt Screenshots fuer Mobiltelefon, Tablet und Desktop; GitHub bewahrt sie 14 Tage als Testartefakt auf. Nur bei vollstaendigem Erfolg ruft der Workflow den als Repository-Secret gespeicherten Render Deploy Hook auf. Produktion soll erst als aktuell gelten, wenn `/api/health` den erwarteten Git-Commit meldet.

## Aenderungsprotokoll

- Produktionskandidat `0.3.7` zeigt in belegten Kalenderslots datensparsam den verwalteten Klingelschild-/Wohnungsnamen der Buchungspartei, jedoch nur im serverseitig autorisierten aktiven Haus. Die eigene gemeinsame Wohnungspartei erscheint lokalisiert als `Du`/`You`; ohne aktive Wohnungszuordnung bleibt neutral `Belegt`/`Occupied`. Loginname, E-Mail, Kontakt- und technische Identitaetsfelder werden nicht an die Kalenderansicht ausgegeben. Kalenderfeed, Audit, Export, Benachrichtigungen und Speicherung bleiben unveraendert.

- Produktionsversion `0.3.6` loest den widerspruechlichen Backup-Hold: In Produktion darf `BACKUP_ENABLED=true` ausschliesslich Download, Einzelbackup und Wartungsstart mit lokalen, integritaetsgeprueften Sicherungen unter `/var/data/backups` freigeben. Der globale Pilot-/Testkonten-Reset bleibt unabhaengig davon vor jeder Passwort-, Backup- oder Datenbankwirkung gesperrt. `AUTO_BACKUP` bleibt zwingend `false`; externe Backup-, R2-, S3-, Cloudflare- und Kopia-Bindungen bleiben vor Start gesperrt. Der Superadmin-Wartungsstart erstellt genau ein geprueftes Backup, bevor die globale Schreibsperre gesetzt wird.
- Produktionsversion `0.3.5` uebernimmt den in `0.3.5-test.16` geprueften persoenlichen abonnierbaren ICS-Kalenderfeed und die beiden Hausregelmodi ohne weitere Funktionsaenderung. Die 256-Bit-Adresse wird nur einmal angezeigt, serverseitig ausschliesslich als SHA-256-Hash gespeichert und kann jederzeit ersetzt oder sofort widerrufen werden. Der Feed bleibt an das aktive Konto, die Wohnung und das Haus des Ausstellungszeitpunkts gebunden, liefert nur eigene beziehungsweise gemeinsam gebuchte Wohnungstermine, verwendet `Europe/Zurich` und `no-store` und enthaelt keine Namen, E-Mail-Adressen oder fremden Kennungen. Die Adresse ist wie ein Passwort zu behandeln.
- Haeuser besitzen den sichtbaren Regelmodus `GBMZ-Regeln` oder `Liberal`. Bestehende und neue Haeuser verwenden ohne ausdrueckliche Superadminwahl `GBMZ-Regeln`. Nur Superadmins duerfen den Modus anlegen oder spaeter aendern; die Aenderung wird auditiert und veraendert keine bestehende Buchung. `Liberal` entfernt ausschliesslich Sonntagsruhe, Waschslot-Tagesgrenze, Grenze eines kuenftigen Waschtags, GBMZ-Trockenraumkopplung/-fenster/-Doppelgrenze und Tumblerreserve. Anmeldung, Rollen- und Hausisolation, aktive Ressourcen, nicht vergangene Slots, normale und feste Konflikte, Atomaritaet, Idempotenz und Wartung bleiben unveraendert. Restplaetze sind in diesem Modus weder sichtbar noch per API anwendbar. Dauertermine koennen im liberalen Modus sonntags liegen; ein Trockenraum belegt dabei nur den gewaehlten Slot. Die additive Schemaerweiterung von Wochentag `1-6` auf `0-6` kopiert alle bestehenden Dauertermine unveraendert.

### 2. September 2026

- Produktionsversion `0.3.4` korrigiert die Schrittwahl im Stoerungstagebuch: Bei einem ohne Sperre uebernommenen Fall erscheint die Funktionspruefung erst nach einer gespeicherten Reparatur. Der Serververtrag und die bestehenden Betriebsdaten bleiben unveraendert.

### 1. September 2026

- Produktionsversion `0.3.3` normalisiert den gesamten SMTP-Nachrichtentext vor dem Versand auf `CRLF`. Dadurch akzeptieren strikte SMTP-Anbieter auch die laengere zweisprachige Wohnungseinladung; ein lokaler strenger SMTP-Regressionstest weist korrekte Zeilengrenzen und die erfolgreiche Einladung nach.

### 26. August 2026

- Produktionsversion `0.3.2` ordnet aktive Push-Geraete dem Haus des gespeicherten Abonnements zu. Damit bleiben kombinierte Bewohner-/Admin-Konten in der Hausverwaltung als Push-Empfaenger sichtbar, auch wenn ihr globales Kontofeld nicht das aktive Haus traegt.
- Produktionsversion `0.3.1` ergaenzt die kontrollierte E-Mail-Aktivierung: Nur `EMAIL_ENABLED=true` zusammen mit `PRODUCTION_EMAIL_APPROVED=true` und einer vollstaendigen SMTP-Konfiguration wird zugelassen. Unvollstaendige, unbekannte oder nicht freigegebene Providerbindungen stoppen vor Wirkung. Push bleibt aktiv; Backup und automatisches Backup bleiben deaktiviert.
- Produktionsversion `0.3.0` entfernt die sichtbare Testkennzeichnung. Push kann ausschliesslich durch die doppelte Produktionsfreigabe `PUSH_ENABLED=true` und `PRODUCTION_PUSH_APPROVED=true` aktiviert werden; externe VAPID-/Providerwerte bleiben verboten. Ohne bestehende Abonnements erfolgt beim Aktivieren kein Versand. Backup, automatisches Backup und E-Mail bleiben deaktiviert.
- Vorabversion `0.3.0-test.17` erweitert den read-only Produktionsbackup-Vertrag um die fuenf bekannten Legacy-Tabellen `activity_entries`, `blocked_dates`, `machine_log_entries`, `pilot_feedback_entries` und `resource_entries`. Der reale Produktionsdownload bleibt bei Integritaet und Fremdschluesseln gruen; unbekannte Tabellen werden weiterhin fail-closed abgelehnt.
- Vorabversion `0.3.0-test.18` trennt den deaktivierten laufenden Backupkanal vom zwingenden lokalen Vor-Migrationsschutz: Nur bei tatsaechlich vorhandenen Legacy-Migrationsdaten wird vor deren transaktionaler Bereinigung eine integritaetsgepruefte SQLite-Kopie unter dem persistenten Backupverzeichnis erstellt. Der Weg fuehrt keinen Upload aus, kontaktiert keinen Provider und laesst manuelle sowie automatische Backups deaktiviert.
- Vorabversion `0.3.0-test.16` als verhaeltnismaessigen Produktionsschutz vorbereitet: eindeutige Produktionszielidentitaet, persistente SQLite-Disk und Einzelinstanz werden vor Dateisystem und Datenbank fail-closed gebunden; Agent-Test-Fixture, Legacy-/Testwege, Seed-Passwortreset, Backup/Scheduler, E-Mail, Push und vorhandene Providerbindungen bleiben beim ersten Produktionsstart deaktiviert beziehungsweise verboten. Ein kleines read-only Werkzeug prueft die vorhandene heruntergeladene SQLite-Sicherung auf Integritaet, Fremdschluessel, Datei- und Schema-SHA256, allowlistete WaschZeit-Struktur und aggregierte Zaehler; eine fremde Einzeltabelle wird abgelehnt. Der verworfene Kopia-/R2-/Repository-Server-, Fuenf-Minuten-Scheduler- und globale Schreibsperrenpfad ist nicht enthalten.
- Verbindliche Architekturregel ergaenzt: Neue Infrastruktur muss einen konkreten Bedarf, messbaren Mehrwert, vertretbare Gesamtrisiken, Budgeteinhaltung und einen Rueckbauweg nachweisen; standardmaessig gilt die kleinste vollstaendige Loesung.

### 18. August 2026

- Vorabversion `0.3.0-test.12` fuer die eng begrenzte Credentialdiagnose vorbereitet. Der unveraenderte Credentialvertrag wird vor jeder Dateisystemwirkung als vollstaendige Vier-Bit-Maske ausgewertet und in genau einem synchronen, wertfreien Marker ausgegeben; Wahrheitstabelle, Policygrenzen, Mehrfachfehler, Fatalexit und Redaktions-Canaries sind direkt regressiert. Keine Fixture-, Rollen-, Haus-, Restplatz-, Provider- oder Produktsemantik wurde geaendert.

### 11. August 2026

- Startupmarker nach IV-START-02 fuer Pipe-/Render-Laufzeiten dauerhaft gemacht: Die allowlistete Einzeile wird synchron und vollstaendig auf Dateideskriptor 2 geschrieben, bevor der Fatalexit erfolgt. Pipe-Kindprozessregressionen pruefen beide Fatalereignisse sowie einen Schreibfehler; der Dienst beendet sich in allen Faellen und Health bleibt danach unerreichbar.
- Den zentralen Startup-Wrapper nach IV-START-01 fail-closed gemacht: `uncaughtException` und `unhandledRejection` schreiben jeweils hoechstens den sicheren Einzeilenmarker und beenden den Prozess anschliessend tatsaechlich mit Nichtnullcode. Echte Kindprozessregressionen belegen den zuvor erreichbaren Listener, den fristgerechten Exit und die danach fehlende Health-Erreichbarkeit.
- Den Agent-Test-Start nach dem fehlgeschlagenen ersten test.11-Deploy weiter fail-closed gehaertet: Health und Fixture pruefen globale DB-Sollzaehler und exakte Rollenbindungen, jeder Neustart entfernt alle Sitzungen transaktional, fremde unmarkierte Fixture-relevante Daten blockieren `ready`, externe Attempts werden am realen Provider-Wrapper gemessen und ein zentraler Startup-Wrapper gibt nur eine redigierte Fehlerklasse aus. Legacy-Registrierung, Test-Einladungslinks und Seed-Passwortreset sind vor jeder Filesystemwirkung gesperrt; verdeckte Owner-Secrets werden nur intern und ohne Readback geprueft.
- Neuen Testkandidaten `0.3.0-test.11` in einem isolierten Arbeitszweig vorbereitet; der spaetere, separat gegatete Release darf ausschliesslich als exakter Fast-forward auf `codex/agent-test` erfolgen. Paket, Lockdatei, Service Worker, sichtbare Releasekennung, Tests und Agent-Test-Blueprint verwenden dieselbe Vorabversion; `test.10` und Produktion bleiben unveraendert.
- Agent-Test-Start und Ein-Deploy-Choreografie gehaertet: exakte Service-/URL-/Release-/Commit-/DB-Identitaet, fehlende Providerbindungen und vier getrennte Runtimepasswoerter werden vor jeder DB-Mutation geprueft. Der einzige spaetere Releaseweg ist ein gemeinsames `Save only` ohne Deploy, gefolgt von genau einem Fast-forward-Push und genau einem AutoDeploy; in dieser Korrekturrunde wurde keine Renderaktion ausgefuehrt.
- Lean-A-Fixture fuer den Free-/ephemeral-Agent-Testdienst ergaenzt: exakte serverseitige Identitaetsbindung, drei Owner-seitige Runtime-Credentials, transaktionaler und idempotenter Neuaufbau von zwei rein synthetischen Haeusern, minimalen Ressourcen und drei exklusiven Rollenkonten. Kombiniertes Bestandskonto, Produktion und Provider bleiben unangetastet; Backup, E-Mail und Push sind aus.
- Restplatzweg fuer freie, noch nicht begonnene Slots des heutigen Schweizer Tages ergaenzt. Exakt eine Waschmaschine und optional ein Tumbler werden atomar und idempotent gebucht; Trockenraum, neue Benachrichtigungen und dauerhafte Selbsttrocknungsdaten sind ausgeschlossen. Wohnungsweite Tagesgrenze, Storno-/Aenderungsgrenzen, Hausisolation, Konkurrenz, DE/EN, Export und mobile Bedienung sind automatisiert abgedeckt.

### 10. August 2026

- R1 der neuen Rekonstruktion fuer `0.3.0-test.10` vorbereitet: personenbezogene Einzelmeldungen, kanalgetrennte Opt-ins und Zustellstatus sind vom neutralen Maschinen- und Raumtagebuch getrennt und einzeln loeschbar. Multi-Reporter-Ansichten und persoenlicher Export enthalten ausschliesslich eigene Inhalte; Kontoloeschung entfernt die persoenliche Schicht, ohne den Betriebsnachweis zu verfaelschen.
- Meldungserstellung haus- und kontogebunden idempotent gemacht. Fachmutation, neutraler Audit und Outboxabsicht werden gemeinsam gespeichert; Providerfehler nach dem Commit bleiben ein eindeutiger fachlicher Erfolg mit getrenntem Zustellergebnis. Nur vor dem ersten Providerkontakt sicher gescheiterte Vorbereitungen bleiben planbar; nach Versuchsbeginn wird derselbe Datensatz nicht erneut versendet.
- Admin-Push auf ausdruecklich hauszugeordnete aktive Haus-Admins und eindeutige Endpoints begrenzt. Zweistunden-Erinnerungen gelten nur fuer neue Meldungen und erzeugen nach Unterbrechung keine Nachholflut. Wartungs-Audits enthalten keine Reporter- oder Adminnamen, Kontakte oder freien Meldungstexte, sondern nur pseudonyme Akteurreferenz, Rolle und neutralen Aktionskontext.
- Historische personenbezogene Meldungsinhalte werden durch eine markerbasierte, transaktionale und wiederholbare Migration in die loeschbare Berichtsschicht ueberfuehrt. Der Kandidat nimmt keine Produktionsdatenaktion vor; Backup-, Zaehler- und Freigabegates bleiben vor einem Livevollzug offen.
- Den Produktionsstart fuer eine notwendige Bestandsmigration technisch fail-closed gemacht: Vor der PII-Bereinigung muss ein verifiziertes Backup erfolgreich sein; bei deaktiviertem Backup oder Sicherungsfehler startet kein Listener und die Bestandsdaten bleiben unveraendert. Der dauerhaft gesperrte alte Konten-Merge wurde samt unerreichbarer Mutation entfernt, sodass ein `410`-Aufruf keine persoenlichen Reports am Quellkonto verlieren kann.
- R2-Tagebuchvertrag ergaenzt: Eine neue Meldung kann nur mit ausdruecklicher Entscheidung `sperren` oder `verfuegbar lassen` uebernommen werden. Kommende Buchungen werden bei einer Sperre unveraendert ausgewiesen. Ein Abschluss verlangt dokumentierte Reparatur, erfolgreiche Funktionspruefung und Abschlussnotiz; eine fallbezogene Sperre wird dabei atomar freigegeben, ein ungesperrter Fall ohne Ressourcenmutation beendet.
- Dauertermine als atomare Waschpakete modelliert: exakt eine Waschmaschine, optional je ein Trockenraum und Tumbler, gespeicherte Trocknungsdauer, gemeinsame Gruppenkennung auch bei reinen Waschmaschinenpaketen, hausgebundene Komplettloeschung und konfliktfreie Legacy-Kompatibilitaet. Gemischte, doppelte, fremde, gesperrte oder unvollstaendige Payloads werden ohne Teilwirkung abgewiesen; im damals allein geltenden Modus `GBMZ-Regeln` galt dies auch fuer Sonntagsfenster.
- R3-Oberflaeche und Sprache auf den neuen Vertrag gebracht: Bewohner sehen pro eigener Meldung drei Hauptstatus, getrennte Push-/E-Mail-Opt-ins und den Nicht-Notfallhinweis. Admins erhalten die Drei-Status-Uebersicht, ausdrueckliche Sperrentscheidung, lesende Anzeige betroffener Buchungen und den getrennten Umschalter `Haus`/`Geraete` mit rollenbezogenem Startzustand.
- Testumgebungen fail-safe als `WaschZeit Test` gekennzeichnet. Titel, Kopfzeile, Manifest, installierter PWA-Name sowie Health-/Versionsantwort folgen derselben Umgebungsauflosung; nur ein ausdruecklich bekannter Produktionskontext darf `WaschZeit` ausliefern.
- Windel-Alarm variiert abgeschlossene Uebungsrunden ohne unmittelbare Wiederholung von Gesamtaufgabe oder Ergebnisformulierung. Die Tagesmission bleibt innerhalb desselben Schweizer Tages fuer alle identisch und ist am Folgetag bei vorhandener Alternative garantiert verschieden.
- Die sechs DE/EN-Rollenfuehrungen inhaltlich auf getrennte persoenliche Meldungen, Drei-Status-Tagebuch, ausdrueckliche Sperrentscheidung, unveraenderte bestehende Buchungen, atomare Dauerpakete und Haus-/Geraetetrennung aktualisiert. Die zugehoerigen MP4-/VTT-/Poster-/Transkriptpakete wurden mit lokalen deutschen und englischen Windows-SAPI-Stimmen reproduzierbar neu erzeugt; zusammen umfassen die Videos rund 8,5 MB.
- Foto-Upload, Fotoablage, EXIF-Verarbeitung sowie jede GBMZ-Schaltflaeche, Attrappe, Verlinkung oder Datenuebertragung bleiben ausserhalb von `0.3.0-test.10`. Eine spaetere Fotofunktion benoetigt einen eigenen Legal-/Security-Vertrag; GBMZ benoetigt ein separates Institution-, Legal-, Owner- und QA-Gate.
- CTO-/QA-Datenschutzkorrektur fuer `0.3.0-test.10`: Reporter-Pushziele werden beim tatsaechlichen Versand erneut gegen Eigentuemerkonto, gespeicherten Endpoint-Hash, Haus, aktiven Opt-in und Ereignistyp validiert. Bewohner-API und eigener Export verwenden explizite Feld-Allowlists ohne technischen Fallstatus, gemeinsame Fallzeitpunkte, Admin-, Audit-, Provider-, Queue-, Delivery- oder Outboxdaten. Die eigene Meldungsansicht zeigt alle Eintraege statt nur acht und ordnet den eigenen Beschreibungstext sichtbar zu. Service-, API- und Browserregressionen decken Endpoint-Uebernahme, Hash-/Haus-/Opt-in-Drift, Multi-Reporter-/Fremdhausisolation sowie zehn eigene Meldungen in DE/EN und Mobil/Desktop ab.
- CTO-/QA-Zustell- und Workflowkorrektur fuer `0.3.0-test.10`: Reporter-Push ist nur bei einer aktiven Subscription im Haus der konkreten Meldung waehlbar. Admin- und Reporter-Outbox werden mit einem atomaren Lease-Claim gegen parallele Doppelzustellung geschuetzt; jeder Empfaenger wird unmittelbar vor seinem Provideraufruf frisch revalidiert. Neue Faelle koennen weder durch `action=block` noch durch eine allgemeine Ressourcenbearbeitung ohne ausdruecklichen Sperrentscheid uebernommen werden. Angemeldete Testansichten behalten `WaschZeit Test` auch nach Reload, Navigation, Sprach- und Hauswechsel im Seitentitel. Konkurrenz-, Mid-Batch-, Fremdhaus-, Inaktiv-/Historien-, API-Umgehungs- und Browserregressionen sichern diese Grenzen ab.
- R11/R12-Zustellkorrektur fuer `0.3.0-test.10`: Pro Outbox-Ereignis und Empfaenger wird hoechstens ein externer Providerattempt begonnen. Versuchsbeginn ist dauerhaft markiert; Timeout, Prozessabbruch, Leaseablauf, Providerfehler oder Settlement-Drift enden als `Zustellausgang unklar` und werden nicht automatisch erneut versendet. Nur sicher vor dem Providerkontakt gescheiterte Vorbereitung bleibt planbar. E-Mail-Verfuegbarkeit, Erstellung, Praeferenz, Queue und Versand verwenden denselben fail-closed Adressresolver: aktive Konten und exakte Uebereinstimmung der normalisierten aktuellen Primaer- oder Fallback-Zweitadresse mit ihrem dauerhaft gespeicherten Bestaetigungswert. Adressaenderung und -loeschung entwerten Flag und Bindung; Legacy-Flags ohne Bindung werden nicht migriert, sondern gesperrt. Service-, API-, UI-, Startup-Migrations-, Recovery-, Export-, Konkurrenz- und No-Send-Tests decken beide Vertraege ab.
- R13-Freigabe-E-Mail-Haertung fuer `0.3.0-test.10`: Auch bei mehr als fuenf Empfaengern wird unmittelbar vor jedem einzelnen Provideraufruf ein aktueller Datenbankstand geprueft. Adressaenderung oder -leerung, Deaktivierung, Hauswechsel, Opt-in-Entzug, Bindungsdrift und verschwundene Zielidentitaet zwischen den Batches erzeugen exakt keinen Versuch; unveraenderte berechtigte Ziele behalten die bestehende Batch- und Deduplizierungssemantik.

### 18. August 2026

- AI-native Vier-Rollen-Organisation fuer Produktlieferungen dokumentiert: Delivery Lead koordiniert, Builder bleibt alleiniger Product-Writer, Independent Validator urteilt unabhaengig gebuendelt und Release Runner bereitet parallel vor. Test-Fast-Lane und Guarded Lane sind strikt getrennt; negative Fachbefunde bleiben bindend, OWNER_BRIEFING bleibt nicht blockierend und Fachrollen werden bedarfsbezogen read-only zugeschaltet. Der laufende `test.11`-Prozess, Produktcode, Tests, App-Rollen, Outputs, Release und Produktion bleiben unveraendert.
- Pauschale Altfreigabeklauseln lane-spezifisch qualifiziert: Die isolierte Test-Fast-Lane benoetigt nach Pflichtgates, Freeze und Independent-Validator-`PASS` nur den gueltigen Releaseauftrag; CTO-/CEO-Standardzwischenrunden entfallen. Guarded-Lane-Gates und bindende Hard-Risk-STOPs bleiben vollstaendig erhalten.

### 31. Juli 2026

- Kleinsten technischen Kandidaten `0.3.0-test.9` auf Basis des unveraenderten Agent-Teststands vorbereitet. Nur der Agent-Test-Blueprint pinnt Render exakt auf Node `22.23.1`; dessen offizielle Distribution enthaelt npm `10.9.8`. `packageManager` dokumentiert diese Kombination, und ein repositoryeigener Offline-Guard erzwingt sie vor `npm ci`, ohne npm nachzuinstallieren oder Corepack, `npx` beziehungsweise Netzwerkzugriff zu verwenden. Dies ist Reproduzierbarkeits- und Ressourcenhaertung, keine nachtraegliche Ursachenbehauptung fuer den fehlgeschlagenen `0.3.0-test.8`-Build.
- Versionskette fuer Paket, Lockdatei, Health-/Versionsantwort, Assets, PWA-Cache, Testvertraege und Agent-Test-Releasekennung auf `0.3.0-test.9` angehoben. Die sichtbare Kennzeichnung bleibt `Testversion`; Produktion, `master`, der vorhandene `test.8`-Teilservice und die allgemeinen Staging-/Produktions-Blueprints bleiben unveraendert. Es wurde kein Commit, Push, Render-Zugriff oder Deployment ausgefuehrt.
- Kandidatenstand auf `0.3.0-test.8` angehoben und als `Testversion` belassen. Paket, Health-/Versionsantwort, Assetkennung, Tests und PWA-Cache verwenden denselben Vorabstand.
- Dedizierte Agent-Testumgebung `waschzeit-agent-test` fuer Frankfurt vorbereitet: Free-Plan, eigener Zweig `codex/agent-test`, `npm ci`, fluechtige `/tmp`-Datenbank, keine Disk und alle Backup-/E-Mail-/Push-Schalter aus. Render erzeugt Sitzungsgeheimnis und Hauscode; das synthetische Seed-Admin-Passwort bleibt ausserhalb des Repositorys im Passwortmanager.
- Auto-Deploy fuer den Agent-Testzweig dokumentiert und statisch abgesichert. Die Automatik startet erst nach einem nach Projektregel versionierten, vollstaendig geprueften und unabhaengig freigegebenen Push und beruehrt weder `master` noch Produktion.
- Deaktivierte Backup-, E-Mail- und Push-Kanaele im Adminueberblick und Systemreiter vollstaendig auf Deutsch und Englisch gekennzeichnet. Backup-Providerhinweise werden bei ausgeschaltetem Kanal nicht mehr behauptet; Erstellen, Download, Testversand und backupabhaengiger Wartungsstart sind bereits in der Oberflaeche unbedienbar. Kontrollierte `503`-Antworten bleiben als zweite Schutzschicht lokalisiert und die No-Send-Semantik unveraendert.

### 30. Juli 2026

- Technischen Kandidaten `0.3.0-test.7` als weiterhin sichtbare `Testversion` vorbereitet. Paket, Health-/Versionsantwort, ausgelieferte Assetkennung, automatisierte Tests und PWA-Cache verwenden denselben Vorabstand.
- Harte, fehlersicher geparste Kill-Switches `BACKUP_ENABLED`, `EMAIL_ENABLED` und `PUSH_ENABLED` eingefuehrt. Nur explizites `true` aktiviert den jeweiligen Transport. `false`, fehlende oder leere Werte und ungueltige Eingaben blockieren auch bei vorhandenen Providerwerten jeden direkten, manuellen, zeitgesteuerten oder indirekten Transport. Dieselbe Fail-Closed-Vorgabe gilt fuer direkt erzeugte Service-Factories. Health, Versionsantwort, Adminstatus und geheimnisfreie Startlogs zeigen den Zustand.
- Isolierten Free-Staging-Blueprint fuer `codex/staging` mit manueller Ausloesung, `npm ci`, `/api/health`, fluechtiger `/tmp`-Datenbank, ohne Disk und mit dreifachem No-Send erstellt. Produktions-Blueprint auf `master`, `npm ci`, persistente Disk und `SESSION_SECRET` als `sync: false` harmonisiert; es wurde keine Render- oder Produktionsaktion ausgefuehrt.
- `npm run test:safety` ergaenzt: Pro Kanal werden explizites `false`, fehlende und leere Werte, ungueltige Eingaben sowie direkte Factory-Nutzung ohne `enabled` geprueft. Synthetische Providerwerte und direkte sowie indirekte Adminpfade muessen dabei null Backup-Dateien, null Tokens/Abos/Auditwirkungen, null DNS-/Netzwerkversuche und null Backup-/SMTP-/Push-Providerkontakte erzeugen. Explizites `true` wird im Sicherheitstest nur als Parser- und In-Memory-Statusvertrag bestaetigt.
- Medienpakettest plattformneutralisiert: Gueltige `WEBVTT`-Dateien werden bei unveraenderten Medienbytes sowohl mit LF- als auch mit Windows-CRLF-Zeilenenden geprueft.

### 22. Juli 2026

- Kandidatenstand auf `0.3.0-test.6` angehoben und weiterhin sichtbar als `Testversion` gekennzeichnet. App, `/api/health`, `/api/version`, ausgelieferte Assetkennung, Tests und PWA-Cache verwenden denselben Vorabstand.
- Wohnungszuordnungsdialog vollstaendig auf Deutsch und Englisch lokalisiert und seine Abmeldung an den sicheren, bereits fuer das Kontomenue verwendeten `POST /api/logout`-Ablauf angebunden. Die gespeicherte Kontosprache wird beim ersten Seitenaufbau vor dem sichtbaren Pflichtdialog angewendet. Beide Abmeldewege verhindern Doppelabsenden, loeschen Sitzung und Cookie und fuehren zur Abmeldebestaetigung; Fehler stellen den ausloesenden Button mit lokalisierter Meldung wieder her. Der Browserlauf prueft den N0-Onboarding-Weg in Englisch und Deutsch, den normalen Kontomenueweg sowie die bestehende N0/H1-Hausisolation. Origin- und CSRF-Schutz bleiben unveraendert.
- Reine Organisationsrolle `05 · Eigentuemer-Briefing – Einfacher Ueberblick` mit Rollen-ID `OWNER_BRIEFING` dokumentiert. Sie berichtet direkt an den Eigentuemer, uebersetzt bestaetigte Berichte anhand von vier Fragen und getrennten `GRUEN`/`GELB`/`ROT`/`GRAU`-Bereichsampeln und besitzt weder Fuehrungs-, Pruef-, Filter-, Freigabe- noch App-Rechte. Direkte Eskalationen und die App-Rollen Bewohner, Haus-Admin und Superadmin bleiben unveraendert.
- Hausisolationskandidat als sichtbare `0.3.0-test.5` vorbereitet. App, `/api/health`, `/api/version`, ausgelieferte Asset-Releasekennung und PWA-Cache verwenden denselben Vorabstand; die sichtbare Kennzeichnung bleibt `Testversion` beziehungsweise `Test version`. Der Bump veraendert keine Haus-, Ressourcen-, Rollen- oder Buchungslogik und fuehrt keine Produktionsdatenaktion aus.
- Hausisolation des Bewohnerplans gehaertet: Neue Haeuser erhalten keine automatisch erzeugten Standardressourcen mehr. Kalender, Buchungsoptionen und Kapazitaeten werden ausschliesslich aus dem serverseitig aktiven Haus berechnet; ein Haus ohne Ressourcen zeigt DE/EN einen klaren Leerzustand ohne Buchungsaktion. Beim Hauswechsel werden alte Ressourcen-, Kalender-, Buchungs- und Empfehlungsdaten sofort verworfen, und verspaetete Antworten oder Netzfehler eines vorherigen Hauskontexts koennen die neue Ansicht nicht mehr ueberschreiben oder einen Fehlerstatus ausloesen. Eine Ansichtsrevision schuetzt eine bewusste Nutzerwahl vor dem spaeten Initialisierungsabschluss, waehrend ohne Interaktion die rollenbezogene Startansicht erhalten bleibt. Konfigurierte und aktive Ressourcen werden getrennt gezaehlt, damit eine voruebergehende Vollsperre nicht faelschlich als unkonfiguriertes Haus erscheint. Der DE/EN-Erfolgstext der Hausanlage ist dynamisch lokalisiert. Vor dem Fix erzeugte, unmarkierte Standardressourcen bleiben aus Sicherheitsgruenden unveraendert und muessen nach Backup sowie ausdruecklicher Freigabe kontrolliert geprueft und gegebenenfalls bereinigt werden.
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
- Monatsansicht als stabiles 42-Tage-Raster umgesetzt und Sonntage im damals allein geltenden Modus `GBMZ-Regeln` korrekt als nicht buchbare Ruhetage gekennzeichnet.
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
