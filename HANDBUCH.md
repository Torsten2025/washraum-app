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
2. Wohnung, Klingelschildname und fest zugeordnete E-Mail pruefen und nur noch ein eigenes Passwort festlegen. Erst mit diesem Schritt entsteht das aktive Wohnungskonto; der Link ist danach verbraucht.
3. Weitere Familienmitglieder waehlen `Geraet verbinden`. Ein bereits angemeldetes Geraet erzeugt unter `Einstellungen` > `App & Geraet` einen zehn Minuten gueltigen Einmalcode. So verwenden alle Geraete dasselbe Wohnungskonto, ohne das Passwort weiterzugeben.
4. Nach der Anmeldung unter `Buchen` zuerst im Wochen- oder Monatskalender einen freien Waschtag waehlen. Ein passender Termin ist mit `Empfohlen` und `Buchen` markiert; ein Tipp oeffnet direkt das vorgeschlagene Zeitfenster und die Waschmaschinenwahl.
5. Im Standardweg `Zeit zuerst` ein passendes Zeitfenster mit sichtbarer Verfuegbarkeit waehlen, danach eine bis drei freie Waschmaschinen im gleichen Slot auswaehlen. Wer gezielt nach einer Maschine sucht, kann dauerhaft auf `Maschine zuerst` umstellen.
6. Unter `Meine Buchungen` Termine pruefen, vor Beginn absagen oder waehrend des laufenden Slots frueher freigeben.
7. Beim ersten Start die `Einstellungen` durchgehen: E-Mail pruefen und bei Bedarf unter `App & Geraet` die App installieren sowie Push aktivieren. Fuer schnelle Freigaben ist Push der bevorzugte Kanal, E-Mail bleibt als Fallback moeglich.
8. Oben rechts das Kontomenue oeffnen und mit `Abmelden` die Sitzung sicher beenden.

Einzelne Maschinen oder Raeume koennen weiterhin im nachgeordneten Bereich `Einzelnes Geraet separat buchen` reserviert werden. Fuer einen vollstaendigen Waschtag ist der gefuehrte Ablauf der schnellste Weg.

## Rollen

| Rolle | Geltungsbereich | Verwaltungsrechte |
| --- | --- | --- |
| Bewohner | Gemeinsames Wohnungskonto und zugeordnetes Haus | Eigene Wohnungsbuchungen, Hinweise, Kontodaten und sachliche Stoerungsmeldungen |
| Haus-Admin | Eigenes Haus | Wohnungen und Einladungen, Wohnungskonten, Geraete, Tagebuch, Sperren, Reparaturpruefung, Dauertermine und Buchungen des Hauses |
| Superadmin | Alle Haeuser | Hausuebergreifende Tagebuchsicht, alle Haus-Admin-Rechte plus Haeuser, Rollen, Umzuege, Backups und globaler Wartungsmodus |

Ein Superadmin arbeitet immer im aktuell ausgewaehlten Haus. Der Hausumschalter in der Kopfzeile legt fest, auf welches Haus sich Kalender und Verwaltung beziehen.

Das konfigurierte Start-Admin-Konto ist der Superadmin. Beim Start stellt die App sicher, dass dieses Konto aktiv ist und die Adminrolle besitzt. In einer aelteren Datenbank ohne Superadmin wird der erste vorhandene Admin einmalig zum Superadmin hochgestuft.

### Notfallzugang und Verantwortungsuebergabe

Der Superadmin kann sich nicht selbst loeschen. Er kann die Superadmin-Verantwortung unter `Verwalten` > `System` an ein anderes aktives Haus-Admin-Konto uebergeben. Die Uebergabe verlangt den Bestaetigungstext `SUPERADMIN UEBERGEBEN`, setzt die alte Superadmin-Sitzung auf das eigene Haus zurueck und beendet alte Sitzungen beider beteiligten Konten.

Im Ueberblick zeigt die App den Notfallstatus:

| Pruefung | Bedeutung |
| --- | --- |
| Hausadmins | Mindestens zwei aktive Admin-Konten pro Haus vermeiden Single-Person-Abhaengigkeit |
| Superadmins | Mindestens ein aktiver Superadmin muss vorhanden sein; fuer geplante Ausfaelle rechtzeitig uebergeben |
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
| Einladung | Sieben Tage gueltige Einladung pruefen und das bereits einer Wohnung zugeordnete Konto durch Setzen des Passworts aktivieren | Oeffentlich mit gueltigem Link |
| Geraet verbinden | Weiteres Geraet mit einem zehn Minuten gueltigen Einmalcode am bestehenden Wohnungskonto anmelden | Oeffentlich |
| Freigabe-Hinweise | E-Mail-Hinweise bei der Einladungsannahme ein- oder ausschalten | Oeffentlich |
| Passwort vergessen | Sicheren Wiederherstellungslink anfordern | Oeffentlich |
| Persoenlicher Wiederherstellungscode | Ein Konto ohne bestaetigte E-Mail mit einem 15 Minuten gueltigen, einmaligen Admin-Code, eigener E-Mail und neuem Passwort wiederherstellen | Oeffentlich mit gueltigem Code |
| Rueckmeldung | Bestaetigte E-Mail, ungueltiger Link sowie manuelle oder automatische Abmeldung anzeigen | Oeffentlich |
| Datenschutz | Zur Datenschutzerklaerung wechseln | Oeffentlich |

Die App ist als PWA installierbar. Auf unterstuetzten Geraeten kann sie aus dem Browser zum Home-Bildschirm hinzugefuegt werden und startet danach wie eine normale App.

Einladungstoken sind zufaellig, werden serverseitig nur als SHA-256-Hash gespeichert, gelten sieben Tage und koennen nur einmal verwendet werden. Der Admin legt vorab eine stabile Wohnungsbezeichnung, den Klingelschildnamen und die Ziel-E-Mail fest. Solange der Link nicht angenommen ist, besteht nur eine offene Einladung und noch kein Bewohnerkonto. Beim Oeffnen setzt die eingeladene Person ihr Passwort; wurde der Link tatsaechlich per SMTP an die Zieladresse gesendet, bestaetigt der erfolgreiche E-Mail-Zugriff zugleich die Adresse. Bei persoenlicher Linkuebergabe wegen noch fehlendem SMTP bleibt die Adresse bis zu einer spaeteren Mailbestaetigung unbestaetigt. Freie Registrierung und Wohnungscodes sind in Produktion abgeschaltet. Bestehende technische Alt-Konten ohne Wohnungszuordnung koennen nur noch per Geraetecode mit einem bereits aktivierten Wohnungskonto zusammengefuehrt werden.

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
| Stoerung zu einem Geraet oder Raum melden | Ja | Nein | Nein |
| Kontomenue und persoenliche Einstellungen oeffnen | Ja | Ja | Ja |
| Zwischen `Buchen` und `Verwalten` wechseln | Nein | Ja | Ja |
| Aktives Haus wechseln | Nein | Nein | Ja |
| Sicher abmelden | Ja | Ja | Ja |

Das Kontomenue oben rechts zeigt Benutzername und Rolle. Es fuehrt zu `Einstellungen`, `Hilfe & Einfuehrung` und `Abmelden`. Die Abmeldung sendet ein eigenes Formular an den Server. Die Sitzung wird dort geloescht, das Cookie entfernt und anschliessend die Anmeldeseite mit einer Abmeldebestaetigung geoeffnet. Auch die automatische Inaktivitaetspruefung wird serverseitig durchgesetzt; ein blosses Offenlassen oder Wiederaufrufen eines alten Tabs verlaengert eine abgelaufene Sitzung nicht.

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
| Mitteilungen | Wieder freie Termine und eigene lokale Aktionsbestaetigungen gemeinsam und chronologisch anzeigen |
| Ungelesen-Anzeige | Neue Eintraege am Kopfzeilenbutton zaehlen und beim Oeffnen als gelesen markieren |
| Neu frei | Den aktuellsten wieder freien Termin kompakt zwischen eigenen Buchungen und Kalender hervorheben |
| Freien Termin buchen | Mitteilung mit Person, Geraet, Datum und Slot oeffnen und bei Verfuegbarkeit direkt buchen |
| Kontomenue | Einstellungen, Hilfe und Abmeldung kompakt oben rechts anbieten |
| Profil | Adminverwalteten Klingelschildnamen, stabile Wohnung, Rolle, bis zu zwei getrennt bestaetigte E-Mail-Adressen und bevorzugten Buchungsweg anzeigen bzw. speichern |
| Namenskorrektur | Einen neuen Klingelschildnamen vorschlagen; sichtbar wird er erst nach Pruefung durch den Haus-Admin |
| Benachrichtigungen | Freigabe-Hinweise ein- oder ausschalten und nach Bereich, Wochentag und Zeitfenster filtern |
| App und Geraet | PWA installieren, Push verwalten, Versionsnummer und Stand sehen, nach Updates suchen und einen kurz gueltigen Code fuer ein weiteres Familiengeraet erzeugen |
| Sicherheit und Daten | Passwort aendern, eigene Daten exportieren, Datenschutz oeffnen oder Konto loeschen |
| Hilfe und Regeln | Einfuehrungsvideo, interaktiven Rundgang, Reservierungsregeln und Reinigung gebuendelt in den persoenlichen Einstellungen oeffnen |

Die normale Buchungsansicht verwendet die volle Seitenbreite. Der fruehere rechte Block `Gut zu wissen` wurde entfernt; selten benoetigte Hilfe nimmt dadurch keinen dauerhaften Platz neben Kalender und Waschpaket mehr ein. Der Kontomenuepunkt `Hilfe & Einfuehrung` oeffnet direkt den Einstellungsreiter `Hilfe & Regeln`.

### Einfuehrung und Quiz

| Bereich | Funktion |
| --- | --- |
| Aufgezeichnetes Video | Rund fuenfeinhalbminuetige Einfuehrung mit Sprecher und 28 passend zum Text wechselnden App- und Reinigungsbildern abspielen |
| Untertitel | Synchronisierte deutsche Untertitel anbieten |
| Interaktive Einfuehrung | Aufbau, Waschpaket und Regeln kapitelweise mit denselben echten App-Ansichten zeigen und vorlesen |
| Steuerung | Wiedergabe, Stummschaltung, vor und zurueck bedienen |
| Quiz | Drei alltagsnahe Fragen mit freundlicher Rueckmeldung beantworten |

## Verwaltungsansicht

Nach `Verwalten` erscheint oben die eigene Adminrolle mit einem kurzen Auftrag und ihrem Geltungsbereich. Der Startbereich ordnet konkrete Aufgaben nach Dringlichkeit, fuehrt mit `Oeffnen` direkt zum passenden Arbeitsbereich und zeigt getrennt davon die dauerhaften Verantwortungen der Rolle. Warnzaehler an `Tagebuch`, `Wohnungen`, `Geraete & Haeuser` und `System` machen offene Arbeit sichtbar. Haus-Admins sehen dabei nur Aufgaben, die sie selbst erledigen duerfen; technische Superadmin-Aufgaben werden ihnen nicht zugewiesen. Auf kleinen Bildschirmen wird die Aufgabenansicht einspaltig und die Navigation bricht in gut erreichbare Zeilen um.

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

### 2. Geraete und Haeuser

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geraet oder Raum anlegen | Ja | Ja |
| Ressource umbenennen | Ja | Ja |
| Ressource mit Grund sperren und automatisch im Tagebuch erfassen | Ja | Ja |
| Neues Haus mit Standardressourcen anlegen | Nein | Ja |
| Haus anzeigen, umbenennen, aktivieren oder deaktivieren | Nein | Ja |

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

### 4. Dauertermine

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Geschuetzten woechentlichen Termin anlegen | Ja | Ja |
| Name, Ressource, Wochentag und Slot festlegen | Ja | Ja |
| Dauertermin entfernen | Ja | Ja |
| Ueberschreiben durch normale Buchung verhindern | Automatisch | Automatisch |

Auch bei festen Tumbler-Terminen bleibt mindestens ein Tumbler frei. Ein Dauertermin wird abgelehnt, wenn bereits eine normale zukuenftige Buchung im gleichen wiederkehrenden Termin liegt.

### 5. Wohnungen und Konten

| Funktion | Haus-Admin | Superadmin |
| --- | :---: | :---: |
| Wohnung mit Klingelschildname und Ziel-E-Mail anlegen und einladen | Ja | Ja |
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
| Bewohner zu Haus-Admin machen oder zurueckstufen | Nein | Ja |
| Konto in ein anderes Haus verschieben | Nein | Ja |
| Superadmin-Konto veraendern oder verschieben | Nein | Nein |
| Eigenes Passwort ohne bisheriges Passwort zuruecksetzen | Nein | Nein |
| Pilotbestand nach geprueftem Backup vollstaendig bereinigen | Nein | Ja |

Beim Verschieben muessen kommende Buchungen des Kontos vorher entfernt werden. Nach einem Umzug wird das Konto aus Sicherheitsgruenden wieder Bewohner. Admins koennen fremde Passwoerter weder sehen noch selbst festlegen und fremde E-Mail-Adressen nicht ersetzen. Sie senden nur einen zeitlich begrenzten Link an eine bestaetigte E-Mail-Adresse. Fehlt jede bestaetigte Adresse, darf nach persoenlicher Identitaetspruefung ein 15 Minuten gueltiger Einmalcode erzeugt und direkt an die berechtigte Person ausgegeben werden. Das Erzeugen beendet bestehende Sitzungen und wird auditiert. Erst die Person selbst setzt mit dem Code eine neue E-Mail und ein neues Passwort; Wohnung, Buchungen, Push-Geraete und Protokollbezuege bleiben erhalten. Das eigene Passwort wird im Buchungsbereich mit dem bisherigen Passwort geaendert.

Der Pilot-Reset ist ausschliesslich fuer eine kontrollierte Bereinigung vor dem Echtbetrieb vorgesehen. Er verlangt den exakten Bestaetigungstext `ALLE TESTKONTEN LOESCHEN` und erstellt vorab ein geprueftes SQLite-Backup. Er entfernt alle Bewohner- und normalen Haus-Admin-Konten samt Sitzungen, Buchungen, Push-Geraeten und Wohnungszuordnungen. Superadmin-Konten, Wohnungen, Ressourcen, Dauertermine und technische Protokolle bleiben erhalten. Freie Wohnungen werden anschliessend bewusst neu per E-Mail eingeladen.

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
| Alle normalen Buchungen des aktiven Hauses mit Bestaetigungstext loeschen | Ja | Ja |
| Notfallstatus fuer Admins, Superadmin und Seed-Recovery sehen | Ja | Ja |
| Superadmin-Verantwortung an aktiven Haus-Admin uebergeben | Nein | Ja |
| Hausuebergreifendes Admin-Protokoll sehen | Nein | Ja |
| Geprueftes Backup sofort erstellen | Nein | Ja |
| SQLite-Backup herunterladen | Nein | Ja |
| Globalen Wartungsmodus mit automatischem Backup starten | Nein | Ja |
| Wartung nach Datenbank- und Buchungspruefung beenden | Nein | Ja |
| Warnung bei fehlender externer Backup-Kopie sehen | Ja | Ja |

Der Buchungsreset loescht keine Konten und keine Dauertermine. Er verlangt den Text `ALLE BUCHUNGEN` und wird im Admin-Audit protokolliert.

Die App behaelt lokal die drei neuesten Sicherungen sowie je eine Sicherung pro Tag fuer bis zu 14 Tage. Liegt die externe Kopie auf demselben Render-Datentraeger nicht vor, zeigt der Ueberblick eine Warnung. Fuer einen Ausfall des Render-Datentraegers muss `BACKUP_UPLOAD_URL` auf einen unabhaengigen Speicher zeigen.

### App-Updates und Wartung

- Jede ausgelieferte Seite kennt ihre geladene Releasekennung. Die App fragt den aktuellen Serverstand beim Start, beim Zurueckkehren in die App und danach alle zwei Minuten ab.
- HTML, JavaScript und CSS tragen dieselbe Releasekennung in ihren Asset-URLs. Dadurch kann kein neuer Seitenaufbau versehentlich mit einer alten zwischengespeicherten Programmlogik kombiniert werden.
- Ist ein neuer Stand verfuegbar, erscheint der sichtbare Hinweis `Eine neue Version ist verfuegbar` mit `Jetzt aktualisieren`. Erst nach dieser Zustimmung aktiviert der Service Worker den neuen Stand und laedt die Seite neu.
- Eine bereits begonnene Buchungsauswahl wird nie durch ein Update unterbrochen. Die Zustimmung wird vorgemerkt; das Neuladen erfolgt erst, wenn die Auswahl abgeschlossen oder verworfen wurde.
- Unter `Einstellungen` > `App & Geraet` stehen Versionsnummer und Auslieferungsdatum. `Nach Update suchen` prueft den Stand sofort.
- Fuer groessere Datenbank- oder Betriebsarbeiten startet ausschliesslich der Superadmin unter `Verwalten` > `System` den globalen Wartungsmodus. Vor der Sperre erstellt und prueft der Server automatisch ein SQLite-Backup.
- Waehrend der Wartung bleiben Anmeldung, Abmeldung, Health- und Lesezugriffe erreichbar. Alle anderen schreibenden Anfragen werden serverseitig mit `503 MAINTENANCE_MODE` abgelehnt. Bewohner sehen einen ruhigen Wartungsdialog; bestehende Buchungen bleiben unveraendert.
- Beim Beenden muessen SQLite-`quick_check` und eine sofort wieder entfernte Testbuchung erfolgreich sein. Bei einem Fehler bleibt die Wartung aktiv. Start, erfolgreicher Abschluss und Fehler werden im Admin-Audit festgehalten.
- `/api/health` liefert Version, Releasekennung und Wartungsstatus. `/api/version` stellt denselben Release- und Wartungsstand fuer PWA und Browser bereit.

## E-Mail-Hinweise

- Eine neue oder geaenderte E-Mail-Adresse muss bestaetigt werden.
- Eine erste E-Mail-Adresse ist fuer jedes Wohnungskonto Pflicht; eine zweite Adresse ist optional. Beide werden separat bestaetigt und koennen danach Passwort-Reset und Hinweise empfangen.
- E-Mail-Adressen werden ausschliesslich durch das angemeldete Wohnungskonto oder bei einer persoenlich geprueften Wiederherstellung durch die betroffene Person selbst gesetzt; Admins koennen sie nicht direkt ersetzen.
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

- Wohnungseinladung, siebentaegige und einmalige Aktivierung, bestaetigte Ziel-E-Mail, Geraetecode, Zusammenfuehrung, Anmeldung mit einer der beiden E-Mail-Adressen sowie Sitzungsende.
- E-Mail-Bestaetigung, Passwort-Wiederherstellung, Passwortwechsel und echte SMTP-Zustellung eines passenden Freigabe-Hinweises.
- Admin-ausgeloester Passwort-Reset nur als Link an eine bestaetigte E-Mail; ein Admin kann kein fremdes Passwort festlegen.
- Einzelbuchung, Waschpaket, Vorschlag, Kalender, Freigabe und Absage.
- Waschmaschinen-, Trockenraum- und Tumblerregeln inklusive Parallelzugriff.
- Bewohner-, Haus-Admin- und Superadminrechte sowie Fremdhaus-Isolation.
- Schutz von Haus-Admins vor Eingriffen durch gleichrangige Haus-Admins.
- Feste Buchungen, Benutzerverwaltung, Geraeteverwaltung, Audit und Backups.
- PWA-Dateien, Push-Abo, Push-Test und Freigabe-Hinweise ueber Push.
- Releaseerkennung, bestaetigtes PWA-Update, Wartungsrechte, Schreibsperre, automatisches Backup und Buchungs-Schreibtest.
- Datenschutzexport, Kontoloeschung, Sicherheitsheader und Barrierefreiheit.
- Mehrhaus-Jahressimulation mit 100 Personen in sechs Haeusern, 52 Wochen und 5.200 Waschpaketen.

### Testbefehle

| Befehl | Zweck |
| --- | --- |
| `npm run verify` | Syntax aller zentralen Dateien pruefen |
| `npm run test:security` | Sicherheitsheader, Origin-Schutz, Sitzungen, Einladungen, Anmeldewege, Einmalcodes, Passwortregeln und Rate-Limits dynamisch pruefen |
| `npm test` | Vollstaendige API- und Funktionsablaeufe pruefen |
| `npm run test:roles` | Rollen, Rechte, Hausisolation und Abmeldung pruefen |
| `npm run test:year` | Ein Jahr mit 100 Bewohnerkonten in sechs getrennten Haeusern simulieren |
| `npm run test:e2e` | Optionalen Browser-Smoke-Test fuer Einladungsannahme und persoenliche Einrichtung ausfuehren, wenn Playwright verfuegbar ist |
| `npm run test:a11y` | Statische Barrierefreiheitspruefung ausfuehren |
| `npm run audit` | Den ausfuehrlichen Gesamtaudit Schritt fuer Schritt inklusive optionalem Browsertest ausfuehren |
| `npm run check` | Verbindliches Abschluss-Gate aus Syntax-, Sicherheits-, Funktions-, Rollen-, Jahres- und Barrierefreiheitstest ausfuehren |

Der vollstaendige Katalog mit Pruef-ID, Soll-Ergebnis und Automatisierungsweg steht in `TESTPLAN_GESAMTAUDIT.md`. Externe Live-Dienste und reale Mobilgeraete werden dort als eigener manueller Abnahmeblock gefuehrt und duerfen nicht durch lokale Mocks als produktiv bestaetigt gelten.

## Entwicklerreferenz

### Aufbau

| Pfad | Verantwortung |
| --- | --- |
| `server.js` | Express-Server, SQLite-Datenmodell, Sitzungen, Rechte, Buchungsregeln, E-Mail und Backups |
| `swiss-time.js` | Datums- und Slotberechnung in Schweizer Zeit |
| `release-window.js` | Zeitfenster fuer Freigaben und Absagen |
| `public/login.html`, `public/login.js` | Landingpage, Anmeldung und Einladungsannahme |
| `public/index.html`, `public/app.js` | Waschplan, Konto, Einfuehrung und Verwaltung |
| `public/manifest.webmanifest`, `public/sw.js` | PWA-Installation, Offline-Shell und Push-Anzeige |
| `public/styles.css` | Gemeinsames responsives Erscheinungsbild |
| `scripts/` | Funktions-, Rollen-, Jahres- und Barrierefreiheitstests |
| `TESTPLAN_GESAMTAUDIT.md` | Vollstaendiger Pruefkatalog fuer Sicherheit, Konten, Rollen, Regeln, Betrieb und Live-Abnahme |
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
- `apartments` speichert die stabile Wohnungsbezeichnung, den aenderbaren Klingelschildnamen, Haus und Aktivierungsstatus. `apartment_invitations` speichert Ziel-E-Mail, Ablauf, Versand- und Annahmestatus; Einladungstoken und Geraetecodes liegen ausschliesslich als SHA-256-Hash vor. Klartextlinks werden nur beim Versand beziehungsweise einmalig an den Admin ausgegeben.
- `apartment_name_requests` speichert offene und entschiedene Korrekturwuensche. Ein Bewohnerwunsch aendert den sichtbaren Namen nie direkt; Freigabe oder Ablehnung erfolgt durch einen Admin und wird auditiert.
- `users.apartment_id` bindet ein gemeinsames Konto an genau eine Wohnung. Zusammengefuehrte Alt-Konten werden deaktiviert, personenbezogene Login-Adressen entfernt und ueber `merged_into_user_id` fuer nachvollziehbare Auditbezuege markiert.
- Bewohner und Haus-Admins duerfen keine Daten eines anderen Hauses lesen oder veraendern.
- Nur der Superadmin darf das aktive Haus wechseln und hausuebergreifende Aktionen ausfuehren.
- Rollen- und Hausgrenzen muessen immer serverseitig durchgesetzt und im Rollentest abgedeckt werden.
- `SEED_ADMIN_NAME` bezeichnet das bestehende oder neu anzulegende Superadmin-Konto. Ist `SEED_ADMIN_PASSWORD` gesetzt, wird dieses Konto beim Start als aktiver Superadmin sichergestellt, ohne ein bereits geaendertes Passwort zu ueberschreiben.
- `SEED_ADMIN_FORCE_PASSWORD_RESET=true` darf nur temporaer im Notfall gesetzt werden. Dann wird das Passwort des Seed-Superadmins beim Start auf `SEED_ADMIN_PASSWORD` gesetzt. Danach muss der Schalter wieder entfernt werden.
- `SESSION_IDLE_MINUTES` legt die Inaktivitaetsgrenze in Minuten fest. Standard und Render-Konfiguration sind 30 Minuten; Werte werden aus Sicherheitsgruenden auf 5 bis 480 Minuten begrenzt.

### Deployment

Der GitHub-Workflow `.github/workflows/deploy-render.yml` fuehrt zuerst `npm run check` aus. Nur bei Erfolg ruft er den als Repository-Secret gespeicherten Render Deploy Hook auf. Produktion soll erst als aktuell gelten, wenn `/api/health` den erwarteten Git-Commit meldet.

## Aenderungsprotokoll

### 20. Juli 2026

- Bewohner-Onboarding von frei verteilten Wohnungscodes auf sieben Tage gueltige E-Mail-Einladungen umgestellt. Das Konto entsteht erst beim Setzen des Passworts, ist bereits fest an Wohnung, Klingelschild und bestaetigte E-Mail gebunden und kann nicht doppelt aktiviert werden.
- Adminbereich zeigt offene, abgelaufene und angenommene Einladungen; ein neuer Link widerruft automatisch den vorherigen. Ohne eingerichtetes SMTP wird der Link einmalig zum persoenlichen Weitergeben angezeigt.
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
