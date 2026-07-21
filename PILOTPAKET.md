# WaschZeit-Pilotpaket

Status: Vorbereitung, noch keine Einladung freigegeben

Verantwortliche Rolle: `PILOT_BETREUUNG`

Auftraggeber: separate Codex-Aufgabe `CEO` / `CEO_TECHNIK`

Pilotumfang: 3 bis 5 Wohnungen

Dieses Dokument ist die organisatorische Arbeitsvorlage fuer den Kleinstpiloten. Es enthaelt keine personenbezogenen Kontaktdaten. Namen, E-Mail-Adressen, Telefonnummern und vertrauliche Sitzungsunterlagen werden ausschliesslich in einem dafuer freigegebenen externen Ablageort verwaltet.

## 1. Pilot-Gate vor jeder Einladung

Der Status bleibt `NICHT FREIGEGEBEN`, bis alle fuer den konkreten Hauspiloten erforderlichen Stellen ihren getrennten Entscheid dokumentiert haben:

| Gate | Benoetigter Nachweis | Entscheid | Datum/Referenz |
| --- | --- | --- | --- |
| Technische Gesamtleitung | `CEO_TECHNIK` bestaetigt Version, Revision, Umgebung, Testkennzeichnung, bekannte Grenzen und Betriebsbereitschaft | Offen | — |
| Unabhaengige Qualitaetssicherung | `TESTING_QA` meldet `PASS` oder ein vom CEO akzeptiertes `PASS mit externen Restpunkten` | Offen | — |
| Institutionelle Zustimmung | Sitzungskommission oder tatsaechlich zustaendige Verwaltung bestaetigt den Hauspiloten, sofern ihre Zustimmung erforderlich ist; Zustaendigkeit und Entscheid muessen belegt sein | Offen | — |
| Pilot-Betreuung | Unterlagen, Supportweg, Messung, Pausenprozess und Beteiligtenrollen sind vorbereitet | Vorbereitet | Dieses Dokument |

CEO- und QA-Gate ersetzen keinen Gremien- oder Verwaltungsentscheid. Solange die institutionelle Zustaendigkeit ungeklaert, eine erforderliche Zustimmung offen oder eines der anderen Pflichtfelder offen ist, werden keine Pilotpersonen angesprochen, eingeladen, registriert oder mit Testzugangsdaten versorgt.

### Finales Gateformular

Alle Pflichtfelder muessen konkret ausgefuellt und mit einer externen Referenz belegt sein. `Offen`, ein leeres Feld oder eine ungeklaerte Zustaendigkeit blockiert jede Einladung.

| Pflichtfeld | Eintrag | Status | Verantwortlich | Nachweis/Referenz |
| --- | --- | --- | --- | --- |
| Pilotzeitraum von/bis | Offen | Blockiert | `CEO_TECHNIK` / institutionelle Stelle | Offen |
| Pilot-Haus und abgegrenzter Geltungsbereich | Offen | Blockiert | institutionelle Stelle | Offen |
| Anzahl und neutrale Kennungen der 3–5 Wohnungen | Offen | Blockiert | `PILOT_BETREUUNG` | Offen |
| Supportzeiten und Reaktionsfenster | Offen | Blockiert | Supportverantwortliche Person | Offen |
| externer Kontakt- und Feedbackweg | Offen | Blockiert | `PILOT_BETREUUNG` | Offen |
| freigegebener externer Ablageort | Offen | Blockiert | Datenverantwortliche Person | Offen |
| zugriffsberechtigte Rollen fuer die externe Ablage | Offen | Blockiert | Datenverantwortliche Person | Offen |
| Aufbewahrungsfrist fuer Kontakt-, Feedback- und Pilotdaten | Offen | Blockiert | Datenverantwortliche Person | Offen |
| Loesch-/Bereinigungsweg und verantwortliche Person | Offen | Blockiert | Datenverantwortliche Person | Offen |
| sichtbare Version und Testkennzeichnung | Offen | Blockiert | `CEO_TECHNIK` | Offen |
| freigegebene Revision | Offen | Blockiert | `CEO_TECHNIK` | Offen |
| freigegebene Umgebung und Health-Nachweis | Offen | Blockiert | technischer Betrieb | Offen |
| Backup-/Restore-Nachweis fuer die Pilotumgebung | Offen | Blockiert | technischer Betrieb / `TESTING_QA` | Offen |
| verantwortliche Person `CEO_TECHNIK` | Offen | Blockiert | `CEO_TECHNIK` | Offen |
| verantwortliche Person `TESTING_QA` | Offen | Blockiert | `TESTING_QA` | Offen |
| verantwortliche Pilot-Betreuung und Stellvertretung | Offen | Blockiert | `PILOT_BETREUUNG` | Offen |
| verantwortliche institutionelle Stelle | Offen | Blockiert | Sitzungskommission/Verwaltung | Offen |
| CEO-Gate | Offen | Blockiert | `CEO_TECHNIK` | Offen |
| QA-Gate | Offen | Blockiert | `TESTING_QA` | Offen |
| institutioneller Entscheid oder belegte Feststellung, dass kein solcher Entscheid erforderlich ist | Offen | Blockiert | zustaendige institutionelle Stelle | Offen |

### Externe Kontakt-, Feedback- und Datenablage

Vor dem Pilotstart werden ausserhalb des Repositorys konkret dokumentiert:

- Bezeichnung und Ort des freigegebenen Kontakt- und Feedbackkanals,
- Bezeichnung und Ort der freigegebenen Ablage fuer Kontaktdaten, Einwilligungen, Belege, Feedback und Sitzungsunterlagen,
- namentlich beziehungsweise funktional zugriffsberechtigte Rollen nach dem Minimalprinzip,
- Aufbewahrungsfrist je Datenart und ausloesendes Ereignis fuer den Fristbeginn,
- Loesch-, Anonymisierungs- oder Bereinigungsweg je Datenart,
- verantwortliche Person fuer Zugriffskontrolle und fristgerechte Bereinigung,
- Vorgehen bei Teilnahmeabbruch, Pilotende und Sicherheitsvorfall.

Im Repository stehen nur neutrale Kennungen, Status, Messwerte und Befunde ohne unnoetige personenbezogene Inhalte. Bis Ablageort, Berechtigungen, Fristen und Bereinigungsweg im Gateformular konkret ausgefuellt sind, bleibt das Gate blockiert.

## 2. Pilot-Steckbrief

### Zweck

WaschZeit soll mit einer kleinen, gemischten Gruppe unter realistischen Alltagsbedingungen erprobt werden. Geprueft werden vor allem selbststaendige Einladung und Erstbuchung, korrekte Haus- und Wohnungsgrenzen, mobile Bedienbarkeit, Benachrichtigungen, Buchungsregeln und Stoerungsmeldungen.

### Umfang

- 3 bis 5 freiwillig teilnehmende Wohnungen eines vom CEO freigegebenen Hauses,
- moeglichst unterschiedliche Mobilgeraete und Erfahrungsstaende,
- Bewohnerablaeufe; Adminablaeufe nur durch ausdruecklich bestimmte und eingewiesene Personen,
- zeitlich begrenzter Pilotzeitraum, der erst im CEO-Startentscheid festgelegt wird.

### Nicht Bestandteil

- keine allgemeine Freigabe fuer alle Bewohner oder weitere Haeuser,
- keine stillschweigende Produktivfreigabe,
- keine Vergabe zusaetzlicher Admin- oder Superadminrechte an Pilotpersonen,
- keine technischen Experimente, Datenmigrationen oder Loeschaktionen ausserhalb eines separat freigegebenen Auftrags,
- keine Rechts- oder Datenschutzfreigabe durch Pilot-Betreuer oder Testpersonen.

### Kernaufgaben der Pilotpersonen

1. Einladung auf dem eigenen Geraet oeffnen und Konto selbststaendig aktivieren.
2. Anmelden, Haus und Wohnung kontrollieren und die Einfuehrung nutzen.
3. Einen freien, regelkonformen Waschzeitpunkt finden und eine Erstbuchung abschliessen.
4. Eigene Buchung kontrollieren; je nach Testauftrag absagen oder frueher freigeben.
5. E-Mail und optional Push korrekt einrichten und eine freigegebene Testbenachrichtigung pruefen.
6. Eine sachliche Test-Stoerungsmeldung nur dann anlegen, wenn CEO und Hausdienst den Testfall vorher freigegeben haben.
7. Rueckmeldung ueber den festgelegten Supportweg geben; keine personenbezogenen Daten anderer Bewohner mitsenden.

### Verbindliche Teilnahmeinformation

Jede Pilotperson erhaelt vor Annahme der Einladung in verstaendlicher Form:

- den Hinweis, dass die Teilnahme freiwillig ist und ohne Nachteil abgelehnt werden kann,
- den Weg, die Teilnahme jederzeit zu beenden, sowie die Folgen fuer noch benoetigte und bereits erhobene Pilotdaten,
- die klare Kennzeichnung als Testversion und die bekannten Grenzen,
- Pilotzweck, Zeitraum, ungefaehren Zeitaufwand und erwartete Testaufgaben,
- den freigegebenen Support- und Sofortmeldeweg samt Supportzeiten,
- welche Pilot-, Kontakt- und Feedbackdaten wofuer verarbeitet, wo sie extern abgelegt, wer darauf zugreifen darf und wann beziehungsweise wie sie geloescht oder bereinigt werden,
- welche Belege erlaubt sind: nur fuer den Test notwendige Screenshots oder Angaben, moeglichst zugeschnitten und ohne Daten anderer Bewohner,
- welche Belege nicht uebermittelt werden duerfen: Passwoerter, vollstaendige Einladungslinks, fremde Namen, fremde Buchungsdaten oder andere nicht erforderliche personenbezogene Inhalte,
- den Hinweis, dass ein falsches Haus, fremde Daten, Doppelbuchung, falsche Nachricht, Datenverlust oder Kernfunktionsausfall sofort ueber den Supportweg gemeldet werden muss.

Die ausgegebene Fassung, ihr Stand und die dokumentierte Bestaetigung werden im freigegebenen externen Ablageort nach den festgelegten Fristen verwaltet, nicht im Repository.

### Erfolgskriterien

| Kennzahl | Erfolgsschwelle | Messung |
| --- | --- | --- |
| Sicherheits-, Rollen- oder Hausgrenzenverletzungen | 0 | bestaetigte Vorfaelle aus QA, Audit und Pilotrueckmeldungen |
| Doppelbuchung oder Datenverlust | 0 | bestaetigte Vorfaelle und Abgleich der betroffenen Buchungen |
| Selbststaendige Einladung und Erstbuchung | mindestens 80 % der teilnehmenden Wohnungen | Wohnungen ohne direkte Bedienuebernahme geteilt durch alle gestarteten Wohnungen |
| Korrekt zugestellte E-Mail-Testbenachrichtigungen | mindestens 95 % der korrekt eingerichteten und freigegebenen E-Mail-Testsendungen | richtige E-Mail-Zustellungen geteilt durch alle gueltigen E-Mail-Testsendungen |
| Korrekt zugestellte Push-Testbenachrichtigungen | mindestens 95 % der korrekt eingerichteten und freigegebenen Push-Testsendungen | richtige Push-Zustellungen geteilt durch alle gueltigen Push-Testsendungen |
| Nachricht an einen falschen Empfaenger | 0 | jede falsche E-Mail-, Push- oder In-App-Zustellung ist unabhaengig von jeder Prozentquote sofort Rot |
| Kritische offene Fehler zum Entscheidungszeitpunkt | 0 | offene Befunde mit Schweregrad `kritisch` |

### Sofort pausieren und eskalieren

Der Pilot-Betreuer setzt die Ampel auf Rot, stoppt weitere Einladungen und neue Testschritte und informiert sofort `CEO_TECHNIK`, wenn mindestens eines eintritt:

- Datenverlust oder Verdacht auf Datenverlust,
- Rollen- oder Hausgrenzenverletzung,
- Doppelbuchung,
- E-Mail, Push oder In-App-Nachricht an einen falschen Empfaenger,
- Ausfall einer Kernfunktion wie Einladung, Anmeldung, Buchung oder Abmeldung,
- Abweichung zwischen freigegebener und tatsaechlich ausgelieferter Version oder Revision.

Bestehende Daten werden nicht eigenmaechtig korrigiert oder geloescht. `CEO_TECHNIK` entscheidet mit den zustaendigen Fachrollen ueber Sicherung, Untersuchung, Wiederaufnahme oder Abbruch.

## 3. Beteiligtenmatrix

Personen werden nur ueber neutrale Kennungen wie `W01` oder `T01` referenziert.

| Beteiligung | Kennung/Anzahl | Verantwortung | Wird wann eingebunden | Entscheidungsrecht | Kontaktablage |
| --- | --- | --- | --- | --- | --- |
| `CEO_TECHNIK` | CEO | technischer Stand, Pilot-Gate, Pausen- und Wiederaufnahmeentscheid | vor Start und bei jedem Rot-Ereignis | technische Freigabe | separate Codex-Aufgabe `CEO` |
| `TESTING_QA` | QA | unabhaengiges Pilot-Gate und Befundurteil | vor erster Einladung und nach relevanten Korrekturen | QA-Urteil | separate Testing-Aufgabe |
| `PILOT_BETREUUNG` | PB | Koordination, Unterlagen, Einweisung, Lageberichte und Eskalation | durchgehend | organisatorische Empfehlung, keine Freigabe | dieses Arbeitspaket |
| Sitzungskommission | SK | Auftrag, Auflagen und institutionelle Entscheide | mit entscheidungsreifer CEO-Vorlage | Gremienentscheid | externe vertrauliche Ablage |
| Hausdienst/Verwaltung | HV | Hausregeln, Betriebsfenster, Stoerungs- und Supportweg | vor Pilotstart und bei Betriebsfragen | fachliche Bestaetigung im eigenen Bereich | externe vertrauliche Ablage |
| Datenschutzkontakt | DS | Pruefung offener Datenschutzfragen | vor Start, falls vom CEO als erforderlich markiert | fachliche Stellungnahme | externe vertrauliche Ablage |
| Pilotwohnungen | W01–W05 | freiwillige Alltagstests und Rueckmeldungen | erst nach positivem Pilot-Gate | Teilnahme und eigenes Feedback | externe vertrauliche Ablage |
| technischer Betrieb | TB | Umgebung, Health, Revision, Backup und Stoerungsannahme | vor Start und bei Rot-Ereignis | Betriebsentscheid im Auftrag des CEO | externe Betriebsablaege |

Vor Gate-Freigabe auszufuellen: tatsaechliche Anzahl Pilotwohnungen, Stellvertretungen, zugelassene Umgebung, Supportzeiten und externer Kontaktweg.

## 4. Einladungs- und Einweisungsplan fuer 3 bis 5 Wohnungen

### Phase A — Vorbereitung

1. CEO-, QA- und erforderliches institutionelles Gate dokumentieren; eine ungeklaerte institutionelle Zustaendigkeit blockiert den Start.
2. Freigegebene Version, Revision und Umgebung in den Lagebericht uebernehmen.
3. Hausdienst bestaetigt Pilotzeitraum, geltende Hausregeln und Umgang mit Test-Stoerungen.
4. Drei bis fuenf Wohnungen anhand freiwilliger Teilnahme und gemischter Geraete auswaehlen; keine Kontaktdaten ins Repository schreiben.
5. Pro Wohnung eine Kennung `W01` bis `W05` vergeben und nur den Teilnahme-/Messstatus dokumentieren.
6. Supportkanal, Reaktionszeiten und Eskalationsweg bekanntgeben.
7. Externen Ablageort, Zugriffsrollen, Aufbewahrungsfristen und Bereinigungsweg gemaess finalem Gateformular bestaetigen.
8. Verbindliche Teilnahmeinformation in der freigegebenen Fassung bereitstellen.

### Phase B — Gestaffelte Einladung

| Welle | Umfang | Voraussetzung | Beobachtungsfenster vor naechster Welle |
| --- | --- | --- | --- |
| 1 | eine Wohnung | Gate gruen, Health und Revision unmittelbar vorher bestaetigt | Einladung, Anmeldung, Erstbuchung und Abmeldung erfolgreich oder bewertet |
| 2 | zwei weitere Wohnungen | keine rote Ampel und keine kritischen offenen Befunde aus Welle 1 | mindestens ein vollstaendiger Kernablauf je Wohnung |
| 3 | bis zu zwei weitere Wohnungen | CEO bestaetigt Fortsetzung nach kurzem Lagebericht | bis alle vorgesehenen Messungen vorliegen |

Bei gelber Ampel entscheidet der CEO vor der naechsten Welle. Bei roter Ampel gilt der Sofort-Pausenprozess.

### Phase C — Einweisung, etwa 20 Minuten

1. Zweck, Freiwilligkeit und Testversionsstatus erklaeren.
2. Keine echten Passwoerter teilen; Einladung persoenlich und einmalig verwenden.
3. Haus und Wohnung nach Anmeldung sichtbar kontrollieren.
4. Einfuehrung zeigen, dann Einladung und Erstbuchung moeglichst ohne Bedienuebernahme erledigen lassen.
5. E-Mail und optional Push einrichten; Einwilligung und Geraeteentscheidung der Person respektieren.
6. Rueckmeldeweg, erlaubte Screenshots und Verbot fremder personenbezogener Daten erklaeren.
7. Sofortmeldegruende nennen: falsches Haus, fremde Daten, Doppelbuchung, falsche Nachricht, Datenverlust oder Kernfunktionsausfall.

### Einladungsvorlage — erst nach Gate-Freigabe verwenden

> Betreff: Freiwillige Teilnahme am kleinen WaschZeit-Pilot
>
> Wir erproben WaschZeit zunaechst mit 3 bis 5 Wohnungen. Ziel ist zu pruefen, ob Einladung, Anmeldung, erste Buchung und Benachrichtigungen im Alltag verstaendlich und zuverlaessig funktionieren. Die Teilnahme ist freiwillig, kann ohne Nachteil abgelehnt und jederzeit beendet werden. Die App ist eine Testversion. Vor Ihrer Entscheidung erhalten Sie die Teilnahmeinformation mit bekannten Grenzen, Testaufgaben, erlaubten Belegen, Supportweg sowie dem Umgang mit Pilotdaten. Bitte verwenden Sie ausschliesslich Ihre persoenliche Einladung und senden Sie keine Daten anderer Bewohner in Rueckmeldungen. Starttermin und Einladungslink werden erst nach technischer, unabhaengiger QA- und gegebenenfalls erforderlicher institutioneller Freigabe versendet.

## 5. Feedbackprotokoll

Alltagsfeedback ist kein formaler QA-Befund. Sicherheits- und Funktionsbefunde werden an `CEO_TECHNIK` gegeben, der die unabhaengige Nachpruefung durch `TESTING_QA` koordiniert.

| Feedback-ID | Datum/Zeit | Wohnung/Rolle | Bereich und Geraet | Beobachtung | Erwartung | Auswirkung | Prioritaet | Beleg ohne Fremddaten | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FB-001 | — | W__ / Bewohner | — | — | — | — | — | — | — | Offen |

Prioritaeten:

- `kritisch`: Sicherheit, Hausgrenze, Datenverlust, Doppelbuchung, falscher Empfaenger oder Kernfunktionsausfall; sofort pausieren.
- `hoch`: wichtiger Ablauf fuer mindestens eine Pilotwohnung nicht abschliessbar.
- `mittel`: Ablauf abschliessbar, aber missverstaendlich oder deutlich erschwert.
- `niedrig`: Wunsch oder kleine Verbesserung ohne Pilotblockade.

## 6. Entscheidungs- und Einwandprotokoll

CEO-Entscheide und Kommissionsentscheide werden getrennt gefuehrt. Schweigen oder ein fehlender Entscheid gilt nie als Zustimmung.

| Entscheid-ID | Datum | Entscheidungsebene | Frage/Einwand | Entscheid oder Status | Auflagen | Owner | Frist | Beleg/Referenz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CEO-001 | — | `CEO_TECHNIK` | Pilot-Gate fuer Version/Revision/Umgebung | Offen | — | CEO | — | — |
| SK-001 | — | Sitzungskommission | Pilotauftrag und Rahmen fuer 3–5 Wohnungen | Offen | — | SK | — | — |

Zulaessige Statuswerte: `Offen`, `Vertagt`, `Freigegeben`, `Freigegeben mit Auflagen`, `Abgelehnt`, `Aufgehoben`.

### Organisatorisches Kontaktprotokoll

Das Protokoll verwendet ausschliesslich neutrale Kennungen. Namen, Kontaktdaten, Nachrichteninhalte und andere personenbezogene Angaben gehoeren nicht ins Repository.

| Kontakt-ID | Datum | Art | Thema | Uebermittelt | Einordnung | CEO-Status | Naechster erlaubter Schritt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| K-001 | 21. Juli 2026 | vorgezogene unverbindliche Kontaktaufnahme durch den Nutzer | moegliches spaeteres Gespraech ueber den Prototyp und ein gestuftes Vorgehen | kein Zugang, Link, Termin, Testdatum oder Pilotauftrag | kein Pilotstart und keine institutionelle Zustimmung | Transparenzmeldung bestaetigt; Pilot `NICHT FREIGEGEBEN` | keine weitere Kontaktaufnahme; bei Eingang einer Antwort nur Eingang, Thema und moeglichen Entscheidungsbedarf intern an `CEO_TECHNIK` melden |

Fuer `K-001` gilt bis zu einer neuen ausdruecklichen CEO-Freigabe:

- keine Antwort oder Unterlage versenden,
- keine Einladung, Termin- oder Leistungszusage machen,
- keine Aussage zu Produktivreife, Datenschutzfreigabe oder Zustimmung der Sitzungskommission beziehungsweise Verwaltung treffen,
- eine eingehende Antwort nicht inhaltlich im Repository speichern, sondern nur pseudonymisiert nach Eingang, Thema und moeglichem Entscheidungsbedarf an `CEO_TECHNIK` melden.

## 7. Lageberichtvorlage an CEO

### Pilot-Lagebericht [Nummer] — [Datum]

**Version / Revision / Umgebung**

- sichtbare Version und Teststatus:
- Git-/Produktionsrevision:
- Umgebung und Health-Zeitpunkt:
- Abweichung zur CEO-Freigabe: Nein / Ja, sofort pausiert

**Beteiligung**

- vorgesehene Wohnungen: __
- eingeladen: __
- aktiviert: __
- aktive Wohnungen im Berichtszeitraum: __
- Abmeldungen/Teilnahme beendet: __

**Ampeln**

| Bereich | Ampel | Messwert/Beleg | Befund oder naechste Aktion |
| --- | --- | --- | --- |
| Einladung und Kontoaktivierung | Grau | — | Noch nicht gestartet |
| Anmeldung und Erstbuchung | Grau | — | Noch nicht gestartet |
| Mobile Bedienung | Grau | — | Noch nicht gestartet |
| E-Mail | Grau | — | Noch nicht gestartet |
| Push | Grau | — | Noch nicht gestartet |
| Buchungs- und Hausregeln | Grau | — | Noch nicht gestartet |
| Stoerungsmeldungen | Grau | — | Noch nicht gestartet |

Ampellogik: `Gruen` = Ziel erreicht, kein relevanter offener Befund; `Gelb` = nutzbar mit offenem nichtkritischem Risiko oder fehlender Messung; `Rot` = Sofort-Pausenkriterium oder kritischer Befund; `Grau` = noch nicht geprueft.

**Messwerte**

| Kennzahl | Zaehler/Nenner | Ergebnis | Ziel | Status |
| --- | --- | --- | --- | --- |
| selbststaendige Einladung und Erstbuchung | __ / __ Wohnungen | __ % | mindestens 80 % | Grau |
| korrekte E-Mail-Testzustellung | __ / __ gueltige Sendungen | __ % | mindestens 95 % | Grau |
| korrekte Push-Testzustellung | __ / __ gueltige Sendungen | __ % | mindestens 95 % | Grau |
| Sicherheits-/Hausgrenzenverletzungen | __ | __ | 0 | Grau |
| Doppelbuchungen/Datenverluste | __ | __ | 0 | Grau |
| offene kritische Fehler | __ | __ | 0 | Grau |

**Vorfalle und Befunde**

| ID | Schweregrad | Kurzbeschreibung | Betroffen | Owner | Status | Pausenwirkung |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | Keine gemeldet | — | — | — | — |

**Getrennte Entscheide**

- offener oder erfolgter CEO-Entscheid:
- offener oder erfolgter Kommissionsentscheid:
- offener oder erfolgter Verwaltungsentscheid beziehungsweise geklaerte institutionelle Zustaendigkeit:
- QA-Urteil, wortgetreu und mit Referenz:

**Blocker und naechste Schritte**

- Blocker:
- naechster verantwortlicher Schritt:
- Owner und Termin:
- Empfehlung `weiter`, `pausieren` oder `abbrechen`:

## 8. Abschlusskriterien und Abschlussbericht

Der Pilot endet erst mit einem dokumentierten CEO-Entscheid. Der Abschlussbericht enthaelt:

1. freigegebene und tatsaechlich getestete Version, Revision und Umgebung,
2. Beteiligung und Abbruchquote ohne personenbezogene Kontaktdaten,
3. alle Erfolgsmesswerte mit Zaehler und Nenner,
4. Ampelverlauf und alle roten Ereignisse,
5. offene und geschlossene Befunde mit Verantwortlichen,
6. wortgetreues QA-Urteil,
7. getrennte CEO- und Kommissionsentscheide,
8. Entscheidung zu Fortsetzung, Erweiterung, Pause oder Abbruch,
9. geklaerte Aufbewahrung oder Bereinigung der Pilotdaten.
