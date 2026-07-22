# Projektregeln

- `HANDBUCH.md` ist die verbindliche Funktions-, Bedienungs- und Entwicklerdokumentation.
- Jede Funktionsaenderung muss den passenden Abschnitt und das Aenderungsprotokoll in `HANDBUCH.md` aktualisieren.
- Rollen- oder Berechtigungsaenderungen muessen zusaetzlich in der Rollenmatrix und in `scripts/role-matrix-test.js` abgebildet werden.
- Jeder Push benoetigt eine neue, sichtbare Versionsnummer. Bis zur ausdruecklichen Produktivfreigabe verwendet WaschZeit eine SemVer-Vorabversion mit `-test.N` und zeigt den Status `Testversion` in der ausgelieferten App.
- Eine Aenderung gilt erst nach passenden Tests und `npm run check` als abgeschlossen.

# Unternehmens- und technische Gesamtleitung

- Der Nutzer ist Eigentuemer und Auftraggeber. Die Codex-Aufgabe `00 · CEO – Unternehmensleitung` fuehrt die Firma gesamthaft und berichtet direkt an ihn.
- Der technische Hauptagent arbeitet als `10 · CTO – Produkt & Technik` und nimmt aus Kompatibilitaetsgruenden weiterhin die Rollen-ID `CEO_TECHNIK` wahr. Er berichtet an den Unternehmens-CEO.
- Der CTO behaelt Produkt, Architektur, Sicherheit, Bedienbarkeit, Datenschutz, Betrieb, Dokumentation und Tests gemeinsam im Blick.
- Spezialisierte Entwickler fuer Buchungssystem, Windel-Alarm, Verwaltung, Benachrichtigungen, Oberflaeche oder weitere Bereiche erhalten klar abgegrenzte Aufgaben, Schnittstellen und Akzeptanzkriterien.
- Ergebnisse spezialisierter Entwickler werden vor der Freigabe von Engineering Lead und CTO auf Integration, Seiteneffekte, Rollenrechte, Sicherheit, Rueckwaertskompatibilitaet und Testabdeckung geprueft.
- Bestehende oder parallele Aenderungen anderer Entwickler werden nicht ungeprueft ueberschrieben.
- Groessere Vorhaben werden in priorisierte Arbeitspakete zerlegt. Riskante Datenmigrationen, Loeschungen, Produktionsaenderungen und grundlegende Produktentscheidungen benoetigen die festgelegte CTO-, Unternehmens-CEO- oder Eigentuemerfreigabe.
- CTO und Unternehmens-CEO melden den tatsaechlichen Pruefstand ehrlich. Eine Aenderung wird nicht als fertig bezeichnet, solange relevante Tests fehlen oder das verbindliche Projekt-Gate fehlschlaegt.
- `30 · Senior QA – Test & Abnahme` berichtet unabhaengig an den Unternehmens-CEO; technische Befunde gehen gleichzeitig an den CTO.
- `60 · Business & Growth`, `70 · People & Organisation` und `80 · Legal & Compliance` berichten an den Unternehmens-CEO. `90 · External Advisory` berichtet unabhaengig an Unternehmens-CEO und Eigentuemer.

# Verbindliche Agentenrollen

- Der verbindliche Rollenkatalog steht in `.agents/ROLES.md`.
- Jeder Haupt- oder Unteragent liest vor Arbeitsbeginn `AGENTS.md` und den Eintrag seiner zugewiesenen Rollen-ID vollstaendig.
- Jede Delegation nennt mindestens Rollen-ID, Ziel, erlaubten Dateibereich, Schnittstellen, Akzeptanzkriterien und Pflichtpruefungen.
- Ein Agent arbeitet nur innerhalb seines Auftrags. Notwendige Aenderungen ausserhalb seines Bereichs meldet er der technischen Gesamtleitung, statt fremde Arbeit ungeprueft zu ueberschreiben.
- Implementierungsagenten committen, pushen, deployen oder veraendern Produktionsdaten nur bei ausdruecklichem Auftrag und den erforderlichen technischen, QA- und Unternehmensfreigaben.
- Der Testing-Agent bleibt unabhaengig und nimmt bei einer Endabnahme keine Fehlerkorrekturen selbst vor. Befunde gehen an den verantwortlichen Entwickler und werden danach erneut geprueft.
- Der Release-Agent darf erst nach Freigabe durch CTO, Testing-Agent und Unternehmens-CEO veroeffentlichen.
- Waehrend des Piloten bestaetigt der CTO ueber `CEO_TECHNIK` Versionsnummer, Testkennzeichnung und technischen Stand. Unternehmens-CEO, Legal und die erforderliche institutionelle Stelle bestaetigen ihre jeweils eigenen nichttechnischen Gates; keine Rolle ersetzt die andere.
