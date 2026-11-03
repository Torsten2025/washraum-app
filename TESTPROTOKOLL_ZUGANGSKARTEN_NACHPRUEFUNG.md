# Zugangskarten: unabhaengige gezielte Nachpruefung QA01-03

Datum: 03.11.2026. Rolle: TESTING_QA. Umgebung: isolierte lokale synthetische Datenbanken, Chrome headless, Node 22.23.1. Keine Produktion, kein realer Mail-/Pushversand.

## Urteil und Kandidat

**PASS fuer die gezielte funktionale Nachpruefung QA01-03. Keine Gesamt- oder Releasefreigabe.** Die separat gemeldeten kritischen/hohen Dependency-Sicherheitsbefunde sind durch diese Funktionskorrektur nicht behoben. Der anschliessend beauftragte Dependency-Fix braucht einen neuen Freeze und eine passende Wiederpruefung. Der historische Erstabnahmebericht bleibt unveraendert als Nachweis des damaligen FAIL erhalten.

- Version: `0.3.15-test.1`; Basis: `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380`.
- Arbeitsbaum: `C:\Users\Anwender\.codex\worktrees\emailfreier-zugang\WaschplanApp 2`.
- Vorher und nach den Pruefungen: 141 sortierte tracked/untracked Dateien; SHA-256 ueber JSON-Array aus `[Pfad, SHA256(Dateibytes)]`: `304c19ff94eb1ed20ec7c8b80a71e58a43475026428e69b7a6fb5b7cce8fdfee`.
- Vorher und nachher SHA-256 von `git diff --binary`: `3a64e0052aab93c5d191e3e67da5461731c17ab8cd605796f2fe050cb976d7c2`.
- Ignorierte Testartefakte und dieser anschliessend erstellte Bericht sind nicht Teil dieses Produktfingerabdrucks. Kein Produkt- oder Testquelltext wurde von QA geaendert.

## Befundnachpruefung

| Befund | Unabhaengiger Nachweis | Ergebnis |
| --- | --- | --- |
| QA-01: Einstellungen ohne E-Mail nicht speicherbar | Echte Aktivierung einer Karte im Browser; `emailRequired=false`, Feld und Gesamtformular valide; echte Profil- und Filterformulare senden PUT erfolgreich mit 200. Filter und Freigabeauswahl bleiben nach Reload erhalten. Eigene urspruengliche API-Reproduktion liefert ebenfalls 200. | Behoben |
| QA-02: falsche Kennung nach Legacy-Wiederherstellung | Legacy-Testkonto mit nicht bestaetigter bestehender Adresse; persoenlich ausgegebener Wiederherstellungscode, keine neue Adresse. Bestaetigung gibt `legacy@example.test` aus; Login damit 200, alter freier Kontoname weiterhin 401. Echte Browserkette in DE und EN einschliesslich anschliessendem Login bestanden. | Behoben |
| QA-03: Kennung durch Klingelschild verdeckt / Karte zu frueh vernichten | Klingelschild bleibt separat; neues Feld enthaelt die eigene WZ-Kennung, ist schreibgeschuetzt und bleibt nach Reload sowie mit freiwilliger Adresse stabil. DE/EN-Hinweis verlangt Sicherung vor Kartenvernichtung. Feld bei 390/768/1440 px innerhalb des Viewports. PILOTPAKET verlangt Sicherung und erneuten Login vor Vernichten. | Behoben |

Die alte Probe `document.body.innerText.includes(accessId)` bleibt falsch, weil Eingabefeldwerte nicht in `innerText` enthalten sind. Das ist kein erneuter Produktfehler: Wert, readOnly-Eigenschaft und sichtbare Feldgeometrie wurden direkt geprueft.

## Ausgefuehrte Tests und Review

1. `node scripts/emailfree-regression-test.js`, unabhaengig gestartet nach Portabstimmung: **PASS, Exit 0**. Der gesamte Testquelltext wurde vor Ausfuehrung gelesen. Er verwendet echte HTTP-Routen und Browserformulare fuer die Hauptketten.
2. Eigene urspruengliche Reproduktion ueber `artifacts/qa-emailfree-recheck.cjs`: **PASS, Exit 0**. Zusatzbelege fuer Profil, API-Speicherung, Wiederherstellung und weiterhin sichtbare Druckkarte. Das Artefakt liest das urspruengliche QA-Skript, ergaenzt Identitaetsmesswerte und schreibt neue Screenshots statt die historischen zu ersetzen.
3. `git diff --check`: **PASS**, nur bekannte LF/CRLF-Hinweise.
4. Fingerabdruckvergleich: **PASS**, unveraenderter oben genannter Freeze.
5. Source-Review von Profilanzeige, Notifications-Route, Login-/Recovery-Vertrag, Dokumentation und Testintegration: nur eigener `req.session.user.id` beim Speichern; keine neuen Admin-/Hausrechte. Login-Verbot fuer freie Legacy-Namen mit vorhandener E-Mail bleibt praktisch belegt. Adresskollisionen mit anderem Konto bleiben 409; ungueltige Adresse 400.
6. Regressionslauf prueft mehrere NULL-Adressen, erste/zweite optionale Adresse, Bestaetigungsbindung, Entfernen der Adresse samt Token/Bindungswert, Beibehaltung der unveraenderten zweiten Bestaetigung sowie Resend ohne Adresse 409. Das sind echte Routen; Bestaetigungstoken werden gezielt als synthetische SQL-Fixtures vorbereitet.
7. Backupvertrag read-only abgeglichen: Livebindung `0.3.14-test.2`, Kandidat `0.3.15-test.1`. Keine Ausfuehrung eines Produktionsbackups und keine Live-Abnahme.

Der erste Lauf des alten Reproartefakts wurde beim Schreiben eines Screenshots durch Sandbox-EPERM abgebrochen, nachdem Profil/API bereits erfolgreich gemessen waren. Der erneute beauftragte Artefaktlauf mit passender Schreibberechtigung lief vollstaendig mit Exit 0. Dies war kein App-FAIL.

### Pflichtgate und Abdeckungsgrenzen

Der Builder meldete fuer `npm run check` desselben Freeze in Session 34785 nachtraeglich **Exit 1**: `e2e-smoke` konnte den Screenshot `day-dialog-de-390.png` wegen Sandbox-EPERM nicht unter `artifacts` schreiben. Laut Builder waren die vorherigen Gates bis einschliesslich Backup bestanden; es wurde kein fachlicher Assertion-Fehler gemeldet. Das ist trotzdem kein bestandener Fullcheck. Nach Auftrag wurde kein zweiter paralleler Fullcheck gestartet. Der anschliessende Security-Kandidat erhaelt einen vollstaendigen Check mit passender Testartefakt-Schreibberechtigung. Das PASS oben ist ausdruecklich nur das gezielte Funktionsurteil, nicht eine abgeschlossene Gesamtabnahme.

Der Erstbericht enthaelt die umfassende Funktionsinventur und unabhaengige Erstregression aller Rollen. Diese Nachpruefung erweitert sie eng um die drei konkreten Fixketten; sie behauptet keinen neuen manuellen Volltest jeder Admin-/Superadmin-Aktion. Neue Rollenrechte wurden nicht eingefuehrt. Unveraenderte Bereiche und die neue gemeinsame Gesamtregression werden nicht als nochmals manuell getestet ausgegeben.

Der konfigurierte Mailtransportpfad im neuen Regressionstest ist eine aufzeichnende Testfunktion, kein SMTP-Nachweis. SQL-Testtoken sind kein realer E-Mail-Eingang. Externer Mail-/Pushbetrieb, Render, Mobilgeraete, Produktionsbackup/-restore und Pilotfreigaben bleiben getrennte Gates. Die gemeldeten drei Dependency-Sicherheitsbefunde wurden hier nicht erneut auditiert und keinesfalls heruntergestuft.

## Artefakte und Uebergabe

- Neu: dieser Bericht, `artifacts/qa-emailfree-recheck.cjs`, `artifacts/qa-recheck-emailfree-settings.png`, `artifacts/qa-recheck-card-print.png`.
- Profil-Screenshot nach abgeklungener Animation und gezieltem Scrollen visuell gelesen; optionale Adressen und Aufbewahrungshinweis lesbar. Das Kennungsfeld wurde separat durch DOM-Wert und Viewportgrenzen nachgewiesen und liegt oberhalb dieses Screenshot-Ausschnitts.
- Keine Fehlerkorrektur, kein Commit, kein Push, kein Deployment, keine Produktionsdatenwirkung durch TESTING_QA.
- Der QA-Lesefreeze fuer diese Nachpruefung ist beendet. Der alleinige Builder darf den bereits autorisierten eng begrenzten Dependency-Fix beginnen; das ist keine Releasefreigabe.
