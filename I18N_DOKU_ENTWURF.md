# Dokumentationsentwurf: Zweisprachiger Betrieb, Einfuehrung und Verwaltungsuebersicht

Status: Entwurf fuer die spaetere Integration durch `CEO_TECHNIK`

Dieser Entwurf beschreibt den vorgesehenen Zielstand fuer Deutsch und Englisch, rollenspezifische Einfuehrungen mit Kapiteln sowie die neue Verwaltungsuebersicht. Er dokumentiert keine bereits abgeschlossene Implementierung. Aussagen ueber Tests, Produktion und Medien duerfen erst nach erfolgreicher technischer Umsetzung und Abnahme in `HANDBUCH.md`, `README.md` oder `TESTPLAN_GESAMTAUDIT.md` als Ist-Stand uebernommen werden.

## 1. Integrationsziel

Die spaetere Dokumentation wird an drei Stellen integriert:

| Zieldokument | Zu uebernehmender Inhalt |
| --- | --- |
| `HANDBUCH.md` | Bedienung des Sprachschalters, Sprachpersistenz, rollenspezifische Einfuehrung, Kapitelnavigation, neue Verwaltungsuebersicht, Rollenmatrixhinweis und Aenderungsprotokoll |
| `README.md` | Technische I18N-Struktur, Medienerzeugung, Konfiguration, Build- und Pruefbefehle |
| `TESTPLAN_GESAMTAUDIT.md` | I18N-, Video-, Kapitel-, Rollen-, Uebersichts-, Barrierefreiheits- und Live-Abnahmen mit eindeutigen IDs |

Verbindliche Zielsprachen:

- `de`: Deutsch, Standardsprache und sicherer Rueckfall
- `en`: Englisch

Nicht Bestandteil dieses Auftrags:

- neue Rollen oder Berechtigungen,
- Aenderungen an Haus- oder Wohnungsgrenzen,
- Aenderungen technischer API-Codes,
- Produktcode, Medienerzeugung oder Deployment.

## 2. Begriffe und Sprachregeln

### 2.1 Verbindliche Begriffe

| Fachbegriff | Deutsch | Englisch |
| --- | --- | --- |
| App-Name | WaschZeit | WaschZeit |
| Bewohner | Bewohner | Resident |
| Haus-Admin | Haus-Admin | Building admin |
| Superadmin | Superadmin | Super admin |
| Mein Waschplan | Mein Waschplan | My laundry schedule |
| Verwalten | Verwalten | Administration |
| Waschmaschine | Waschmaschine | Washing machine |
| Trockenraum | Trockenraum | Drying room |
| Tumbler | Tumbler | Tumble dryer |
| Waschpaket | Waschpaket | Laundry package |
| Dauertermin | Dauertermin | Recurring reservation |
| Stoerungsmeldung | Stoerungsmeldung | Fault report |
| Maschinen- und Raumtagebuch | Maschinen- und Raumtagebuch | Equipment and room logbook |
| Funktionspruefung | Funktionspruefung | Functional check |
| Freigabe | Freigabe | Release |
| Klingelschildname | Klingelschildname | Doorbell name |
| Wohnung | Wohnung | Apartment |
| Mitteilungen | Mitteilungen | Notifications |
| Testversion | Testversion | Test version |

Der Produktname `WaschZeit`, Hausnamen, Klingelschildnamen, Ressourcennamen und technische Kennungen werden nicht uebersetzt. Freie Texte von Bewohnern oder Admins werden unveraendert in ihrer Eingabesprache gespeichert und angezeigt.

### 2.2 Schreib- und Uebersetzungsregeln

- Deutsch bleibt die fachlich fuehrende Sprache und der Rueckfall bei fehlenden oder ungueltigen Schluesseln.
- Sichtbare Texte werden aus zentralen Uebersetzungsschluesseln bezogen. Es werden keine getrennten deutschen und englischen HTML-Seiten gepflegt.
- Technische API-Codes, Statuscodes, Audit-Aktionscodes und Datenbankwerte bleiben sprachneutral und stabil.
- Fehlertexte werden im Client anhand stabiler Codes lokalisiert. Der Server darf zusaetzlich eine deutsche Rueckfallmeldung liefern, aber keine Fachentscheidung aus einem uebersetzten Satz ableiten.
- Platzhalter werden benannt statt positionsbasiert, zum Beispiel `{resource}`, `{date}`, `{slot}` und `{person}`.
- Datum und Uhrzeit werden passend zur Sprache formatiert; die fachliche Zeitzone und die gespeicherten Slotwerte bleiben unveraendert.
- ARIA-Beschriftungen, Alternativtexte, Titel, Statusmeldungen, leere Zustaende, Formularhilfen und Validierungsfehler sind in beiden Sprachen Pflichtbestandteile.
- E-Mail-Betreff, E-Mail-Text, Push-Titel, Push-Text und In-App-Mitteilung verwenden dieselbe fachliche Nachricht, aber getrennte kanalgerechte Uebersetzungsschluessel.
- Eine Uebersetzung darf keine Rechte, Fristen, Buchungsregeln oder Sicherheitsanforderungen abschwaechen oder erweitern.

## 3. Vorgesehene I18N-Struktur und Konfiguration

Die folgenden Namen sind eine Dokumentationsempfehlung. Die technische Gesamtleitung gleicht sie vor der Integration mit der tatsaechlichen Implementierung ab.

### 3.1 Zentrale Quellen

Empfohlene Struktur:

```text
src/i18n/
  index.js
  locales/
    de.json
    en.json
  messages/
    email.de.json
    email.en.json
    push.de.json
    push.en.json
public/assets/intro/
  manifest.json
  resident/
    de/
    en/
  house-admin/
    de/
    en/
  superadmin/
    de/
    en/
```

Die gemeinsame strukturierte Videoquelle enthaelt mindestens:

```json
{
  "role": "resident",
  "locale": "de",
  "titleKey": "intro.resident.title",
  "media": {
    "video": "/assets/intro/resident/de/intro.mp4",
    "poster": "/assets/intro/resident/de/poster.png",
    "captions": "/assets/intro/resident/de/captions.vtt"
  },
  "chapters": [
    {
      "id": "login-setup",
      "titleKey": "intro.resident.chapters.login.title",
      "descriptionKey": "intro.resident.chapters.login.description",
      "startSeconds": 0,
      "role": "resident",
      "locale": "de",
      "transcriptKey": "intro.resident.chapters.login.transcript"
    }
  ]
}
```

Audio, Szene, Untertitel, Transkript, Kapitelzeit und Quiz muessen aus derselben Quelle erzeugt oder dagegen validiert werden. Eine Zeitangabe darf nicht manuell in mehreren Dateien auseinandergepflegt werden.

### 3.2 Sprachwahl und Persistenz

Vorgesehener Ablauf:

1. Vor der Anmeldung liest die App die lokal gespeicherte Sprache.
2. Fehlt sie, wird `de` verwendet. Eine automatische Browsererkennung darf nur als ausdruecklich freigegebene Produktentscheidung ergaenzt werden und darf Deutsch als sicheren Rueckfall nicht ersetzen.
3. Auf der Anmeldeseite kann die Sprache ohne Konto gewechselt werden. Die Wahl wird lokal gespeichert.
4. Nach der Anmeldung hat die kontobezogene Sprache Vorrang und wird auf allen eigenen Geraeten verwendet.
5. Aendert eine angemeldete Person die Sprache, speichert die App die Wahl am Konto und lokal fuer die naechste Anmeldeseite.
6. Nach Abmeldung bleibt die zuletzt gewaehlte Sprache auf diesem Geraet erhalten.
7. Unbekannte Sprachwerte und fehlende Schluessel fallen auf Deutsch zurueck, ohne rohe Schluessel anzuzeigen.

Empfohlene technische Konstanten:

| Einstellung | Zielwert |
| --- | --- |
| unterstuetzte Sprachen | `de,en` |
| Standardsprache | `de` |
| Rueckfallsprache | `de` |
| lokaler Speicherschluessel | `waschzeit.locale` |
| Kontofeld | `locale` mit erlaubten Werten `de` oder `en` |
| HTML-Sprachattribut | dynamisch `lang="de"` oder `lang="en"` |

Fuer den normalen Betrieb ist keine geheime Umgebungsvariable erforderlich. Falls die Sprachen serverseitig konfigurierbar gemacht werden, werden nur nicht geheime Werte verwendet, zum Beispiel:

```text
APP_DEFAULT_LOCALE=de
APP_SUPPORTED_LOCALES=de,en
```

Diese Variablen duerfen erst in `README.md` als erforderlich bezeichnet werden, wenn sie tatsaechlich implementiert sind. Fehlen sie, muss der Build weiterhin sicher mit `de` und `de,en` starten.

### 3.3 Schluesselbereiche

Mindestens folgende Namensraeume sind vorzusehen:

```text
common.*
auth.*
invitation.*
passwordReset.*
resident.*
calendar.*
booking.*
release.*
issueReport.*
logbook.*
notifications.*
settings.*
diaperGame.*
admin.overview.*
admin.houses.*
admin.equipment.*
admin.recurring.*
admin.accounts.*
admin.analytics.*
admin.system.*
maintenance.*
backup.*
privacy.*
help.*
intro.*
email.*
push.*
a11y.*
errors.*
```

Jeder Schluessel muss in `de` und `en` vorhanden sein. Dynamisch zusammengesetzte Satzfragmente sind zu vermeiden, weil Wortstellung und Grammatik zwischen Deutsch und Englisch abweichen.

## 4. Bedienungsentwurf fuer die Sprachwahl

### 4.1 Anmeldeseite

- Sichtbarer Sprachschalter `Deutsch | English` oberhalb oder neben dem Anmeldeformular.
- Der Schalter ist per Tastatur erreichbar, besitzt einen sichtbaren Fokus und meldet den aktuellen Zustand mit `aria-pressed` oder als korrekt beschriftete Auswahl.
- Login, Einladung, Passwort-Wiederherstellung, Datenschutzlink und alle Fehler wechseln unmittelbar in die gewaehlte Sprache.
- Bereits eingegebene E-Mail-Adressen werden beim Sprachwechsel nicht geloescht.

### 4.2 Persoenliche Einstellungen

- Bereich: `Einstellungen > Profil` oder ein eigener klar benannter Abschnitt `Sprache / Language`.
- Auswahl: `Deutsch` oder `English`.
- Nach dem Speichern wechselt die gesamte App ohne erneute Anmeldung.
- E-Mail- und Push-Inhalte werden ab dann in der kontobezogenen Sprache erstellt.
- Der Erfolg wird in derselben neu gewaehlten Sprache bestaetigt.

### 4.3 Adminbereiche

Haus-Admins und Superadmins verwenden ihre persoenliche Kontosprache. Die Sprache veraendert niemals das aktive Haus, den Rollenbereich, Filter oder Rechte. Frei eingegebene Meldungen und Tagebuchnotizen werden nicht automatisch uebersetzt.

## 5. Rollenspezifische Einfuehrungen

Die App bietet genau die zur aktuellen Berechtigung passende Einfuehrung an. Bei kombinierten Rollen gilt:

- Im Bereich `Mein Waschplan` wird die Bewohner-Einfuehrung angeboten.
- Im Bereich `Verwalten` wird die hoechste dort aktive Verwaltungsrolle angeboten.
- Ein Haus-Admin mit zusaetzlichem Superadminrecht erhaelt im Verwaltungsbereich die Superadmin-Einfuehrung.
- Ein QR-Partner erhaelt ausschliesslich die Bewohner-Einfuehrung, weil keine Adminrechte uebertragen werden.

Erforderliche Medienkombinationen:

| ID | Rolle | Sprache | Pflicht |
| --- | --- | --- | :---: |
| VID-RES-DE | Bewohner | Deutsch | Ja |
| VID-RES-EN | Bewohner | Englisch | Ja |
| VID-HADM-DE | Haus-Admin | Deutsch | Ja |
| VID-HADM-EN | Haus-Admin | Englisch | Ja |
| VID-SADM-DE | Superadmin | Deutsch | Ja |
| VID-SADM-EN | Superadmin | Englisch | Ja |

Jede Kombination umfasst MP4, Poster, VTT-Untertitel, vollstaendiges Transkript, Kapitelmetadaten und die zugehoerigen Quiztexte. Fehlende Medien werden nicht durch die falsche Rolle oder Sprache ersetzt. Stattdessen erscheint ein lokalisierter Hinweis mit Zugang zum Transkript und zur normalen Hilfe.

## 6. Kapitelentwurf

Die Zeitwerte sind Produktionsziele und werden nach finaler Vertonung aus der gemeinsamen Szenenquelle neu erzeugt. Dokumentiert und getestet werden die tatsaechlich generierten Startzeiten.

### 6.1 Bewohner

| Nr. | Start | Kapitel DE | Chapter EN | Inhalt |
| ---: | ---: | --- | --- | --- |
| 1 | 00:00 | Willkommen und anmelden | Welcome and sign in | Einladung annehmen, E-Mail und Passwort, erste persoenliche Einrichtung |
| 2 | 00:40 | Kalender verstehen | Understanding the calendar | Wochen- und Monatsansicht, freie, belegte, vergangene und gesperrte Slots |
| 3 | 01:25 | Waschpaket buchen | Booking a laundry package | Ressourcentyp, Datum, Slot, Waschmaschinen, Trockenraum und Tumbler |
| 4 | 02:25 | Eigene Buchungen | Your bookings | Naechste Termine, Details, Regeln und gemeinsames Wohnungskonto |
| 5 | 03:05 | Freigeben, absagen oder loeschen | Release, cancel or delete | Unterschied zwischen stiller Loeschung und Benachrichtigung |
| 6 | 03:50 | Mitteilungen einstellen | Notification settings | In-App, Push, E-Mail und persoenliche Filter |
| 7 | 04:30 | Stoerung melden | Reporting a fault | Sachliche Meldung, Status sehen, keine eigene Sperrentscheidung |
| 8 | 05:05 | Weitere Person per QR einladen | Invite another person by QR code | Eigene Identitaet, gemeinsame Wohnung, keine Uebertragung von Adminrechten |
| 9 | 05:45 | Hilfe, Datenschutz und Abmeldung | Help, privacy and sign out | Einfuehrung erneut oeffnen, Daten, App-Installation und sichere Abmeldung |

### 6.2 Haus-Admin

| Nr. | Start | Kapitel DE | Chapter EN | Inhalt |
| ---: | ---: | --- | --- | --- |
| 1 | 00:00 | Rolle und Bereich wechseln | Switching role and area | Trennung `Mein Waschplan` und `Verwalten`, eigenes Haus als Grenze |
| 2 | 00:45 | Verwaltungsuebersicht | Administration overview | Aufgaben, Warnungen, Informationen und direkte Aktionen |
| 3 | 01:30 | Wohnungen und Einladungen | Apartments and invitations | Wohnung, Klingelschildname, Ziel-E-Mail, offene und abgelaufene Einladungen |
| 4 | 02:25 | Konten und Wiederherstellung | Accounts and recovery | Aktivstatus, Reset-Link, Identitaetspruefung und Einmalcode |
| 5 | 03:15 | Geraete und Raeume | Equipment and rooms | Anlegen, umbenennen, Bestand und begruendete Sperre |
| 6 | 04:00 | Tagebuch und Stoerungsablauf | Logbook and fault workflow | Meldung, Sperre, Reparatur, Funktionspruefung, Freigabe |
| 7 | 05:15 | Dauertermine | Recurring reservations | Geschuetzte Termine, Konflikte und Tumblerreserve |
| 8 | 05:55 | Auswertung und Hausbetrieb | Analytics and building operations | Nutzung, offene Arbeit, Testmail, Testpush und Audit des Hauses |
| 9 | 06:40 | Kritische Aktionen | Critical actions | Aktuelles Passwort, Bestaetigungstext und Protokollierung |
| 10 | 07:20 | Grenzen der Haus-Adminrolle | Limits of the building admin role | Kein Fremdhaus, keine globalen Rollen, keine normalen Bewohnerbuchungen ohne Wohnung |

### 6.3 Superadmin

| Nr. | Start | Kapitel DE | Chapter EN | Inhalt |
| ---: | ---: | --- | --- | --- |
| 1 | 00:00 | Superadminauftrag | Super admin responsibilities | Hausuebergreifender Betrieb, ausgewaehltes Haus und persoenliche Verantwortung |
| 2 | 00:45 | Haeuser wechseln | Switching buildings | Hausauswahl, eindeutiger Hausbezug von Aufgaben und Daten |
| 3 | 01:25 | Haeuser verwalten | Managing buildings | Anlegen, umbenennen, aktivieren, deaktivieren und Voraussetzungen |
| 4 | 02:15 | Rollen verwalten | Managing roles | Haus-Adminrecht sowie zusaetzliches Superadminrecht sicher geben und entziehen |
| 5 | 03:15 | Wohnungen und Umzuege | Apartments and moves | Einladung, Bestandsidentitaet, kommende Buchungen und Rollenruecksetzung beim Umzug |
| 6 | 04:05 | Hausuebergreifendes Tagebuch | Cross-building logbook | Faelle aller Haeuser, gezieltes Eingreifen und Auditspur |
| 7 | 04:50 | Backup und externe Sicherung | Backup and external storage | Integritaet, Download, externe Kopie und Wiederherstellungsprobe |
| 8 | 05:45 | Wartungsmodus | Maintenance mode | Passwort, automatisches Backup, Schreibsperre und Abschlusspruefung |
| 9 | 06:40 | Pilot-Reset | Pilot reset | Zweck, Schutzvoraussetzungen, erhaltener Bestand und Folgen |
| 10 | 07:30 | Audit und Systemstatus | Audit and system status | Auffaellige Ereignisse, Produktionsversion, Releasekennung und Recovery |
| 11 | 08:20 | Sicher kritisch handeln | Handling critical actions safely | Vier-Augen-Prinzip, keine Geheimnisweitergabe, Abschlusskontrolle |

## 7. Kapitelnavigation und Barrierefreiheit

Jedes Kapitelobjekt enthaelt zwingend:

- stabile Kapitel-ID,
- lokalisierten Titel,
- lokalisierte Kurzbeschreibung,
- Startzeit in Sekunden,
- Rollenbezug,
- Sprache,
- Transkriptbezug.

Verbindliches Bedienverhalten:

1. Die sichtbare Kapitelliste steht neben dem Video und auf kleinen Bildschirmen darunter.
2. Ein Kapitel ist als echtes `button`-Element oder gleichwertig zugaengliches Steuerelement umgesetzt.
3. Maus, Touch, `Tab`, `Shift+Tab`, `Enter` und `Leertaste` funktionieren.
4. Das aktive Kapitel besitzt neben Farbe einen Text- oder Symbolstatus und `aria-current="true"`.
5. Ein Klick setzt `currentTime` auf den exakten Kapitelstart und startet die Wiedergabe nur entsprechend der dokumentierten Produktentscheidung.
6. Die aktive Markierung folgt waehrend der Wiedergabe der aktuellen Zeit.
7. `Kapitel neu starten / Restart chapter` setzt auf den Start des aktiven Kapitels zurueck.
8. Untertitel, Transkriptmarkierung und Kapitelstatus folgen derselben Zeitquelle.
9. Bei reduzierter Bewegung entfallen automatische Scroll- und Hervorhebungsanimationen.
10. Bei fehlendem MP4 bleiben Kapitel und Transkript lesbar; bei fehlerhaften Kapitelmetadaten erscheint eine verstaendliche lokalisierte Fehlermeldung.

Die Dokumentation muss fuer jedes Video Dauer, Medienstand, Sprachstimme, Untertitel, Transkript und Kapitelanzahl aus dem generierten Manifest uebernehmen. Schaetzwerte duerfen nicht als finaler Medienstand stehen bleiben.

## 8. Neue Verwaltungsuebersicht

### 8.1 Informationshierarchie

Die Uebersicht verwendet drei, nicht nur farblich erkennbare Prioritaetsstufen:

| Prioritaet | Bedeutung | Beispiele |
| --- | --- | --- |
| 1 - Dringend | Betrieb oder Sicherheit ist unmittelbar betroffen | dringende Stoerung, gesperrtes Geraet, fehlgeschlagene Funktionspruefung |
| 2 - Zu erledigen | benoetigt zeitnahe Adminaktion | offene Einladung, Wiederherstellungsbedarf, anstehender Dauerterminkonflikt |
| 3 - Information | kein unmittelbarer Eingriff erforderlich | Kennzahlen, abgeschlossene Aktionen, normaler Systemstatus |

Reihenfolge der Seite:

1. `Dringend / Urgent`
2. `Zu erledigen / To do`
3. `Informationen / Information`
4. nachgeordnete Kennzahlen

Jede Aufgabe nennt Gegenstand, Hausbezug, Grund, Alter oder Termin und genau eine primaere Aktion. Leere Zustaende bestaetigen klar, dass aktuell nichts zu erledigen ist.

### 8.2 Haus-Admin-Uebersicht

Oben erscheinen ausschliesslich Daten des eigenen Hauses:

- dringende Stoerungen mit `Stoerung bearbeiten / Review fault`,
- gesperrte Geraete mit `Geraet anzeigen / View equipment`,
- offene Funktionspruefungen mit `Funktionspruefung durchfuehren / Perform functional check`,
- offene oder bald ablaufende Einladungen mit `Einladung erneut senden / Resend invitation`,
- Konten mit Wiederherstellungsbedarf mit `Konto pruefen / Review account`,
- bevorstehende Dauertermine oder Konflikte mit `Dauertermine oeffnen / Open recurring reservations`,
- aktuelle Warnungen des eigenen Hauses.

### 8.3 Superadmin-Uebersicht

Zusaetzlich zu den Aufgaben des ausgewaehlten Hauses erscheinen globale Aufgaben mit sichtbarem Hausnamen:

- Haeuser mit kritischen Problemen,
- fehlende oder fehlerhafte Backups,
- Status der externen Sicherung,
- aktiver oder fehlerhafter Wartungsstatus,
- fehlende Admin-Nachfolge,
- auffaellige Audit- oder Systemereignisse,
- Produktionsversion, Releasekennung und Status `Testversion`.

Ein globaler Eintrag darf beim Oeffnen nicht unbemerkt im falschen Haus landen. Der Hauswechsel wird sichtbar bestaetigt oder vor der Navigation angekuendigt.

### 8.4 Responsive Dokumentationsvorgaben

- `390 x 844`: einspaltig, primaere Aktion vollstaendig sichtbar, keine horizontale Scrollleiste.
- `768 x 1024`: Aufgaben und Informationen klar getrennt; Navigation darf zwei vollstaendig sichtbare Zeilen verwenden.
- `1440 x 900`: kompakte Arbeitsoberflaeche ohne uebergrosse Karten; wichtige Aufgaben bleiben im ersten sichtbaren Bereich.
- Texte duerfen nicht abgeschnitten werden. Hausname, Ressource, Status und Aktion bleiben auch bei englischen Langformen lesbar.

## 9. Rollenmatrixauswirkung

Diese Erweiterung fuehrt keine neuen Rechte ein. Sie uebersetzt und ordnet nur bereits vorhandene Funktionen.

| Funktion | Bewohner | Haus-Admin | Superadmin | Aenderung durch I18N/Video/Uebersicht |
| --- | :---: | :---: | :---: | --- |
| Eigene Sprache waehlen | Ja | Ja | Ja | Nur Darstellung und persoenliche Praeferenz |
| Bewohner-Einfuehrung | Ja | Bei aktiver Wohnungsrolle | Bei aktiver Wohnungsrolle | Keine Rechteaenderung |
| Haus-Admin-Einfuehrung | Nein | Ja | Nein, sofern Superadmin-Einfuehrung angeboten wird | Keine Rechteaenderung |
| Superadmin-Einfuehrung | Nein | Nein | Ja | Keine Rechteaenderung |
| Aufgaben des eigenen Hauses sehen | Nein | Ja | Ja | Bestehende Hausgrenze bleibt serverseitig |
| Globale Aufgaben und Systemstatus sehen | Nein | Nein | Ja | Bestehendes Superadminrecht bleibt serverseitig |
| Direkte Aktion aus der Uebersicht | Nein | Im eigenen Haus | Im erlaubten Geltungsbereich | Verlinkung ersetzt keine API-Berechtigungspruefung |

Folgerung fuer die spaetere Integration:

- Die Rollenmatrix in `HANDBUCH.md` erhaelt einen Hinweis auf lokalisierte Sichtbarkeit und rollenspezifische Einfuehrung, aber keine zusaetzlichen Verwaltungsrechte.
- `scripts/role-matrix-test.js` muss nur dann fachlich erweitert werden, wenn neue API-Routen, Datenzugriffe oder Sichtbarkeitsentscheidungen entstehen. Die bestehenden serverseitigen Rollen- und Hausgrenzen muessen als Regression erneut geprueft werden.
- Sprachwerte aus Requests duerfen niemals Rollen- oder Hauskontext beeinflussen.

## 10. Pflichtinformationen in Deutsch und Englisch

Die folgenden Inhalte muessen in beiden Sprachen vollstaendig, direkt erreichbar und inhaltlich gleichwertig sein. Die englische Fassung ist eine Sprachfassung, keine Aenderung des Betreibers oder des anwendbaren Betriebsmodells.

### 10.1 Betreiber und Abgrenzung

Deutsch:

> Betreiber der WaschZeit-App ist Torsten Letsch. Kontakt: torstenletsch@freenet.de. Die GBMZ ist nicht Betreiberin der App. Der offizielle GBMZ-Aushang der Waschkueche bleibt die verbindliche Regelquelle fuer die Nutzung vor Ort.

Englisch:

> The WaschZeit app is operated by Torsten Letsch. Contact: torstenletsch@freenet.de. GBMZ does not operate the app. The official GBMZ notice displayed in the laundry room remains the authoritative source for the on-site usage rules.

Hinweis: Eine vollstaendige rechtliche Anbieterkennzeichnung kann weitere Angaben, insbesondere eine bestaetigte Postanschrift, erfordern. Solche Angaben duerfen nicht erfunden werden. `CEO_TECHNIK` muss den tatsaechlichen Pflichtstand vor jeder Releasefreigabe ausdruecklich bestaetigen; bei rechtlicher Unsicherheit ist eine fachkundige Pruefung erforderlich.

### 10.2 Testversionshinweis

Deutsch:

> Testversion. Diese Version wird im Pilotbetrieb erprobt. Funktionen, Texte und Bedienablaeufe koennen sich vor der Produktivfreigabe noch aendern.

Englisch:

> Test version. This release is being evaluated in a pilot. Features, wording and workflows may still change before production approval.

Die sichtbare SemVer-Vorabversion mit `-test.N`, Releasekennung und Auslieferungsdatum muessen sprachunabhaengig identisch sein.

### 10.3 Datenschutz-Mindestthemen

In beiden Sprachfassungen sind mindestens gleichwertig zu erklaeren:

- Betreiber und Kontakt,
- verarbeitete Konto-, Wohnungs-, Buchungs-, Meldungs-, Audit-, E-Mail- und Push-Daten,
- Zweck und Rechtsgrundlage nach tatsaechlich freigegebenem Rechtsstand,
- Empfaenger und Auftragsverarbeiter einschliesslich Hosting und E-Mail-Dienst, soweit zutreffend,
- Speicher- und Loeschfristen,
- Kontodatenexport und Kontoloeschung samt geschuetzten Adminausnahmen,
- Cookies, Sitzungen, PWA und Push-Abonnements,
- Passwort-Wiederherstellung und Sicherheitsprotokollierung,
- Kontaktweg fuer Datenschutzanfragen,
- Stand beziehungsweise Versionsdatum der Hinweise.

Die englische Fassung darf keine kuerzere Aufbewahrung, weitergehende Zusage oder andere Verantwortlichkeit nennen. Freie Uebersetzungen rechtlicher Pflichttexte werden vor Veroeffentlichung fachlich gegengeprueft.

### 10.4 Hilfe und Barrierefreiheit

In beiden Sprachen sind mindestens bereitzustellen:

- Bedienhilfe fuer Login, Einladung, Buchung, Freigabe, Meldung und Einstellungen,
- rollenspezifische Verwaltungsanleitung,
- Untertitel und vollstaendige Transkripte aller angebotenen Videos,
- Erklaerung der Tastaturbedienung, ohne sie nur als sichtbaren Kurzbefehl-Hinweis vorauszusetzen,
- Kontaktweg bei Barrieren oder unverstaendlichen Inhalten,
- lokalisierte Alternativtexte und zugaengliche Namen.

## 11. Testkatalog fuer `TESTPLAN_GESAMTAUDIT.md`

Die IDs sind fuer die spaetere Integration vorgesehen. Erst ausgefuehrte Pruefungen erhalten `PASS`.

### 11.1 Uebersetzungen und Persistenz

| ID | Pruefung | Soll-Ergebnis | Vorgesehener Weg |
| --- | --- | --- | --- |
| I18N-01 | Schluesselvollstaendigkeit | Jeder produktive Schluessel ist in `de` und `en` vorhanden | automatischer Katalogvergleich |
| I18N-02 | Keine rohen Schluessel | Keine Seite, Mail, Push-Nachricht oder ARIA-Beschriftung zeigt Schluesselnamen | statischer Test und Browserlauf |
| I18N-03 | Sicherer Rueckfall | Fehlender oder ungueltiger englischer Wert zeigt Deutsch und protokolliert den Entwicklungsfehler ohne Nutzerdaten | Unit-/Integrationstest |
| I18N-04 | Standardsprache | Erstaufruf ohne Praeferenz ist Deutsch | Browserlauf |
| I18N-05 | Vor Login speichern | Sprachwahl auf der Anmeldeseite bleibt nach Reload und Navigation erhalten | Browserlauf |
| I18N-06 | Kontosprache speichern | Wahl in Einstellungen bleibt nach Abmeldung, Login und zweitem Geraet erhalten | Integration und Browserlauf |
| I18N-07 | HTML-Sprache | `document.documentElement.lang` entspricht der aktiven Sprache | A11y-Test |
| I18N-08 | Sprachwechsel ohne Datenverlust | Ausgefuellte nicht geheime Formularfelder bleiben erhalten; Sicherheitsfelder folgen der freigegebenen Schutzentscheidung | Browserlauf |
| I18N-09 | Datums- und Zeitformat | Anzeige ist lokalisiert, fachliche Slots und Schweizer Zeit bleiben unveraendert | Unit-/Browserlauf |
| I18N-10 | API-Stabilitaet | Codes, Statuswerte und Berechtigungsentscheidungen sind in `de` und `en` identisch | API-Regression |

### 11.2 Vollstaendige englische Kernablaeufe

| ID | Pruefung | Soll-Ergebnis | Vorgesehener Weg |
| --- | --- | --- | --- |
| EN-01 | Login | Formular, Fehler und Erfolg sind vollstaendig englisch | `test:e2e` |
| EN-02 | Einladung | Einladung, Annahme, Passwort und bestaetigte Zielseite sind englisch | Integration und `test:e2e` |
| EN-03 | Passwort-Reset | Anfrage, E-Mail, Resetformular und Bestaetigung sind englisch | SMTP-Integration |
| EN-04 | Buchung | Kalender, Paketassistent, Regeln, Bestaetigung und Monatsansicht sind englisch | `test:e2e` |
| EN-05 | Freigabe | In-App, Push und E-Mail verwenden passende englische Texte und unveraenderte Filter | Integration |
| EN-06 | Stoerung | Meldung und Status sind englisch; freie Notiz bleibt unveraendert | Integration und Browserlauf |
| EN-07 | Haus-Admin | Eigene Hausaufgaben und Aktionen sind englisch, Fremdhaus bleibt gesperrt | `test:roles`, `test:e2e` |
| EN-08 | Superadmin | Globale Aufgaben, Hausbezug und kritische Bestaetigungen sind englisch; Codes bleiben stabil | `test:roles`, `test:e2e` |
| EN-09 | Windel-Alarm | Spieltexte, Status, Hilfe und zugaengliche Namen sind englisch | Fachtest und A11y-Test |
| EN-10 | Pflichtinformationen | Betreiber-, Datenschutz-, Hilfe- und Testversionshinweise sind vollstaendig englisch | statischer Vergleich und manuelles Review |

### 11.3 Videos und Kapitel

| ID | Pruefung | Soll-Ergebnis | Vorgesehener Weg |
| --- | --- | --- | --- |
| VID-01 | Sechs Kombinationen | Bewohner, Haus-Admin und Superadmin besitzen je `de` und `en` | Manifesttest |
| VID-02 | Rollenauswahl | Jede Rolle sieht nur die passende Einfuehrung; kombinierte Rollen folgen dem aktiven Bereich | `test:roles`, Browserlauf |
| VID-03 | Sprachwahl | Video, Poster, Untertitel, Kapitel, Transkript und Quiz verwenden dieselbe aktive Sprache | Browserlauf |
| VID-04 | Kapitelsprung | Auswahl setzt die exakte generierte Startzeit | Unit-/Browserlauf |
| VID-05 | Aktives Kapitel | Markierung folgt der Wiedergabe vorwaerts, rueckwaerts und nach manuellem Suchen | Browserlauf |
| VID-06 | Bedienwege | Kapitel funktionieren mit Maus, Touch, Tastatur und Screenreader-Namen | `test:a11y`, reale Geraete |
| VID-07 | Synchronitaet | Audio, Szene, Untertitel, Transkript und Kapitel stammen aus derselben Quelle und bleiben innerhalb der freigegebenen Toleranz | Generator-/Manifesttest und manuelles Review |
| VID-08 | Kapitel neu starten | Aktion springt zum aktiven Kapitelstart und bleibt in derselben Sprache | Browserlauf |
| VID-09 | Fehlende Medien | Lokalisierter Fehler, Transkript und Hilfe bleiben erreichbar; kein falsches Rollenvideo | Fehlerfalltest |
| VID-10 | Reduzierte Bewegung | Keine erzwungene Animation oder automatische Bewegung; Bedienung bleibt vollstaendig | `test:a11y` |

### 11.4 Verwaltungsuebersicht

| ID | Pruefung | Soll-Ergebnis | Vorgesehener Weg |
| --- | --- | --- | --- |
| DASH-01 | Priorisierung | Dringendes steht vor Aufgaben, Informationen und Kennzahlen | Browser- und Datenfixture-Test |
| DASH-02 | Haus-Admin-Grenze | Nur eigenes Haus und nur erlaubte Aktionen | `test:roles` |
| DASH-03 | Superadmin-Hausbezug | Jeder globale Eintrag nennt das Haus; Navigation waehlt es kontrolliert | `test:roles`, `test:e2e` |
| DASH-04 | Direkte Aktionen | Jede Aktion fuehrt zum richtigen Datensatz und Bereich, ohne leere Spruenge | `test:e2e` |
| DASH-05 | Leere Zustaende | Beide Sprachen erklaeren eindeutig, dass nichts zu erledigen ist | Browserlauf |
| DASH-06 | Drei Prioritaeten | Status ist zusaetzlich zu Farbe als Text oder Symbol erkennbar | `test:a11y` |
| DASH-07 | Responsive Ansicht | 390 x 844, 768 x 1024 und 1440 x 900 ohne Ueberlauf oder verdeckte Aktionen | `test:e2e`, Screenshotreview |
| DASH-08 | Englische Langformen | Lange Haus-, Ressourcen- und Aktionsnamen bleiben lesbar | visuelle Fixtures |
| DASH-09 | Aktualisierung | Erledigte Aufgaben verschwinden oder wechseln nachvollziehbar den Status | Integration und Browserlauf |
| DASH-10 | Rechte serverseitig | Direkte URL oder manipulierte Aktion umgeht keine Rollen- oder Hausgrenze | `test:security`, `test:roles` |

### 11.5 Verbindliche Regression und Abnahme

Nach technischer Umsetzung bleiben mindestens auszufuehren:

```bash
npm run test:security
npm test
npm run test:roles
npm run test:a11y
npm run test:e2e
npm run check
```

Zusaetzlich erforderlich:

- deutscher kompletter Regressionstest,
- englischer Login-, Einladungs-, Reset- und Buchungsablauf,
- manuelle Sichtpruefung aller sechs Videos,
- reale Touchpruefung auf Mobiltelefon,
- Tastatur- und Screenreader-Stichprobe in beiden Sprachen,
- Gegenlesen der deutschen und englischen Pflichtinformationen,
- unabhaengige Endabnahme durch `TESTING_QA` ohne eigene Fehlerkorrektur.

## 12. Dokumentationsabnahme und Release-Gate

Vor der Integration bestaetigt `DOKUMENTATION`:

- Begriffe und Funktionen stimmen mit dem finalen Produktcode ueberein.
- Alle Links, Befehle, Routen, Konfigurationsnamen und Medienpfade existieren tatsaechlich.
- Medienlaenge, Kapitelzeiten und Kapitelanzahl stammen aus dem finalen Manifest.
- Keine lokale, simulierte oder ausstehende Pruefung wird als live bestanden bezeichnet.
- Rollenmatrix und Hausgrenzen wurden nicht durch Formulierungen erweitert.

Vor einem Push bestaetigt `CEO_TECHNIK`:

- neue sichtbare SemVer-Vorabversion mit `-test.N`,
- sichtbarer Status `Testversion / Test version`,
- vollstaendige deutsche und englische Betreiber-, Datenschutz- und Hilfsinformationen,
- ausdruecklich bekannte rechtliche Restpunkte,
- erfolgreiches `npm run check`,
- unabhaengige Freigabe durch `TESTING_QA`,
- tatsaechlichen Produktionsstand nach einem beauftragten Deployment.

Kein Text dieses Entwurfs ist fuer sich eine Releasefreigabe.

## 13. Vorgesehener Eintrag im Aenderungsprotokoll

Erst nach vollstaendiger Umsetzung und Abnahme kann sinngemaess eingetragen werden:

> WaschZeit vollstaendig auf zentral gepflegte deutsche und englische Oberflaechentexte umgestellt. Sprachwahl vor der Anmeldung lokal und nach der Anmeldung kontobezogen gespeichert; sicherer Rueckfall bleibt Deutsch. Rollenspezifische Einfuehrungen fuer Bewohner, Haus-Admins und Superadmins in beiden Sprachen mit synchronen Kapiteln, Untertiteln, Transkripten und Quiz bereitgestellt. Verwaltungsuebersicht nach dringenden Aufgaben, zu erledigenden Punkten und Informationen neu geordnet, ohne Rollen- oder Hausgrenzen zu aendern. Deutsche und englische Pflichtinformationen sowie I18N-, Video-, Rollen-, Uebersichts- und Barrierefreiheitstests ergaenzt.
