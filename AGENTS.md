# Projektregeln

- `HANDBUCH.md` ist die verbindliche Funktions-, Bedienungs- und Entwicklerdokumentation.
- Jede Funktionsaenderung muss den passenden Abschnitt und das Aenderungsprotokoll in `HANDBUCH.md` aktualisieren.
- Rollen- oder Berechtigungsaenderungen muessen zusaetzlich in der Rollenmatrix und in `scripts/role-matrix-test.js` abgebildet werden.
- Jeder Push benoetigt eine neue, sichtbare Versionsnummer. Bis zur ausdruecklichen Produktivfreigabe verwendet WaschZeit eine SemVer-Vorabversion mit `-test.N` und zeigt den Status `Testversion` in der ausgelieferten App.
- Eine Aenderung gilt erst nach passenden Tests und `npm run check` als abgeschlossen.

## Verhaeltnismaessigkeit und Einfachheit

- Neue Infrastruktur, Dienste, Abhaengigkeiten oder Sicherheitsmechanismen brauchen vor der Umsetzung einen konkreten, im Projekt vorhandenen Risikofall und einen messbaren Nutzen.
- Es gilt die kleinste vollstaendige Loesung, die den bestaetigten Bedarf sicher erfuellt. Eine technisch moegliche Erweiterung ist ohne nachgewiesenen Bedarf kein Arbeitsauftrag.
- Vor jeder groesseren Architekturergänzung werden bestehende Plattformfunktionen, vorhandener Produktcode und ein einfacher manueller Betriebsweg geprueft. Eigenbau ist nur zulaessig, wenn diese Wege den Bedarf nicht ausreichend abdecken.
- Eine Loesung darf die Gesamtzuverlaessigkeit nicht durch mehr Betriebs-, Konfigurations- oder Fehlerkomplexitaet verschlechtern als das behandelte Risiko rechtfertigt.
- Budget-, Betriebs- und Pilotumfang sind harte Architekturgrenzen. Kostenpflichtige oder dauerhaft zu betreibende Zusatzdienste werden nicht ohne ausdrueckliche Eigentuemerentscheidung eingeplant.
- Architekturvorschlaege nennen stets: konkretes Problem, Minimalvariante, verworfene groessere Variante, laufende Kosten, neue Fehlerquellen und Rueckbauweg.

# Unternehmens- und technische Gesamtleitung

- Der Nutzer ist Eigentuemer und Auftraggeber. Die Codex-Aufgabe `00 · CEO – Unternehmensleitung` fuehrt die Firma gesamthaft und berichtet direkt an ihn.
- Der technische Hauptagent arbeitet als `10 · CTO – Produkt & Technik` und nimmt aus Kompatibilitaetsgruenden weiterhin die Rollen-ID `CEO_TECHNIK` wahr. Er berichtet an den Unternehmens-CEO.
- Der CTO behaelt Produkt, Architektur, Sicherheit, Bedienbarkeit, Datenschutz, Betrieb, Dokumentation und Tests gemeinsam im Blick.
- Spezialisierte Entwickler fuer Buchungssystem, Windel-Alarm, Verwaltung, Benachrichtigungen, Oberflaeche oder weitere Bereiche erhalten klar abgegrenzte Aufgaben, Schnittstellen und Akzeptanzkriterien.
- In der Test-Fast-Lane integriert der alleinige Builder Ergebnisse spezialisierter Entwickler; der Independent Validator prueft den vollstaendigen Freeze. Engineering Lead, CTO und weitere Fachlinsen reviewen nur bei konkreter Betroffenheit read-only. In der Guarded Lane bleiben die festgelegten Engineering-, CTO- und Fachreviews Pflicht.
- Bestehende oder parallele Aenderungen anderer Entwickler werden nicht ungeprueft ueberschrieben.
- Groessere Vorhaben werden in priorisierte Arbeitspakete zerlegt. Riskante Datenmigrationen, Loeschungen, Produktionsaenderungen und grundlegende Produktentscheidungen benoetigen die festgelegte CTO-, Unternehmens-CEO- oder Eigentuemerfreigabe.
- CTO und Unternehmens-CEO melden den tatsaechlichen Pruefstand ehrlich. Eine Aenderung wird nicht als fertig bezeichnet, solange relevante Tests fehlen oder das verbindliche Projekt-Gate fehlschlaegt.
- `30 · Senior QA – Test & Abnahme` berichtet unabhaengig an den Unternehmens-CEO; technische Befunde gehen gleichzeitig an den CTO.
- `60 · Business & Growth`, `70 · People & Organisation` und `80 · Legal & Compliance` berichten an den Unternehmens-CEO. `90 · External Advisory` berichtet unabhaengig an Unternehmens-CEO und Eigentuemer.

# AI-native Vier-Rollen-Organisation

Fuer Produktlieferungen arbeitet WaschZeit mit vier operativen Hueten. Bestehende Teampositionen und Rollen-IDs bleiben Fach- und Berichtslinien; sie bilden keine dauernde serielle Uebergabekette.

- `Delivery Lead`: koordiniert Ziel, Prioritaet, Scope, Risiken, Freeze und notwendige Eigentuemerentscheide. Der Delivery Lead implementiert, validiert oder released nicht selbst im selben Auftrag.
- `Builder`: ist der alleinige Product-Writer eines Kandidaten. Weitere Rollen arbeiten waehrend der Umsetzung nur read-only und melden Befunde an den Builder.
- `Independent Validator`: bleibt organisatorisch und praktisch vom Builder unabhaengig, prueft den vollstaendigen Freeze und erteilt genau ein gebuendeltes Urteil `PASS` oder `FAIL`. Negative Fach-, Sicherheits-, Datenschutz- oder Rechtsbefunde duerfen nicht abgeschwaecht oder umgestuft werden.
- `Release Runner`: bereitet Testrelease und Betriebsnachweise parallel read-only vor und vollzieht ein Testrelease erst nach einem zum selben Freeze gehoerenden Validator-`PASS` und einem gueltigen Releaseauftrag. Produktion bleibt separat voll gegatet.

Fachrollen wie CTO, Legal, Privacy, Security, Product Operations und External Advisory werden nur bei konkreter Betroffenheit als read-only Fachlinsen zugeschaltet. `OWNER_BRIEFING` uebersetzt bestaetigte Ergebnisse fuer den Eigentuemer, ist aber weder Filter noch Freigabe- oder Prozessgate.

Die `Test-Fast-Lane` gilt nur fuer isolierte, synthetische und reversible Testumgebungen. Die `Guarded Lane` gilt fuer Produktion, reale Daten oder Versand, Migrationen, Kosten sowie Rechts-, Datenschutz- und Sicherheitsrisiken; alle dafuer festgelegten Fach- und Eigentuemer-Gates bleiben erhalten. Der laufende `test.11`-Prozess, sein Recovery-Worktree, bestehende Befunde und STOPs bleiben unveraendert und werden durch Organisationsarbeit weder pausiert noch neu gestartet.

Bei einem Widerspruch mit einer aelteren pauschalen Freigabeklausel hat diese Lane-Trennung fuer den Lieferweg Vorrang: In der Test-Fast-Lane gibt es nach Pflichtgates, vollstaendigem Freeze, Independent-Validator-`PASS` und gueltigem Releaseauftrag keine zusaetzliche serielle Standard-CTO-/CEO-Runde. Harte Security-, Privacy-, Rollen-, Haus-, Datenverlust- oder Rechtsbefunde fuehren dennoch sofort bindend zu `STOP`. Pauschale technische, Unternehmens- und Eigentuemerfreigaben gelten weiterhin fuer die Guarded Lane.

# Verbindliche Agentenrollen

- Der verbindliche Rollenkatalog steht in `.agents/ROLES.md`.
- Jeder Haupt- oder Unteragent liest vor Arbeitsbeginn `AGENTS.md` und den Eintrag seiner zugewiesenen Rollen-ID vollstaendig.
- Jede Delegation nennt mindestens Rollen-ID, Ziel, erlaubten Dateibereich, Schnittstellen, Akzeptanzkriterien und Pflichtpruefungen.
- Ein Agent arbeitet nur innerhalb seines Auftrags. Notwendige Aenderungen ausserhalb seines Bereichs meldet er der technischen Gesamtleitung, statt fremde Arbeit ungeprueft zu ueberschreiben.
- Builder committen, pushen oder deployen nicht selbst. In der Test-Fast-Lane vollzieht ausschliesslich der Release Runner einen klar beauftragten Testrelease nach Pflichtgates und Independent-Validator-`PASS`; in der Guarded Lane gelten zusaetzlich alle erforderlichen technischen, QA-, Unternehmens-, Rechts-/Datenschutz- und Eigentuemerfreigaben. Produktionsdaten werden niemals ueber die Fast Lane veraendert.
- Der Testing-Agent bleibt unabhaengig und nimmt bei einer Endabnahme keine Fehlerkorrekturen selbst vor. Befunde gehen an den verantwortlichen Entwickler und werden danach erneut geprueft.
- Der Release-Agent unterscheidet strikt zwischen Test-Fast-Lane und Guarded Lane: Testrelease nur nach gueltigem Releaseauftrag und `PASS` des unabhaengigen Validators fuer denselben Freeze; Produktion nur nach allen festgelegten technischen, QA-, Unternehmens-, Rechts-/Datenschutz- und Eigentuemer-Gates.
- In der Guarded Lane fuer einen Pilot mit realen Beteiligten bestaetigt der CTO ueber `CEO_TECHNIK` Versionsnummer, Testkennzeichnung und technischen Stand. Unternehmens-CEO, Legal und die erforderliche institutionelle Stelle bestaetigen ihre jeweils eigenen nichttechnischen Gates; keine Rolle ersetzt die andere. Diese Pilotregel ist kein zusaetzliches Standardgate der isolierten Test-Fast-Lane.
