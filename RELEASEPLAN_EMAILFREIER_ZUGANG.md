# Releaseplan: E-Mail-freier Zugang

Status: **VORBEREITUNG – KEINE RELEASEFREIGABE**

Rolle: RELEASE. Dieser Bericht dokumentiert den lesenden Preflight vom 03.11.2026 (Abschluss der lokalen Quellenpruefung gegen 22:29 Uhr Europe/Berlin). Die anschliessende Schreibfreigabe betrifft ausschliesslich diesen neuen Bericht. Produktdateien, Tests, Providerkonfiguration und Produktionsdaten wurden durch RELEASE nicht veraendert. Kein Commit, Push oder Deployment wurde ausgefuehrt.

## Auftrag und Kandidatenstand

- Vorbereitung des E-Mail-freien Zugangs auf Basis von Commit `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380` im getrennten Kandidatenarbeitsbaum.
- Kandidatenversion zum Pruefzeitpunkt: `0.3.15-test.1`, Kennzeichnung `Testversion`, noch nicht eingefrorener Arbeitsstand. Der einzige Produkt-Writer bearbeitet parallel die vereinbarten Korrekturen.
- Dieser Bericht ist weder eine Diff-Abnahme noch ein Nachweis fuer bestandene Tests des spaeteren Freeze. Builderabschluss und erneute unabhaengige QA stehen fuer diesen Bericht noch aus.
- Nutzerauftrag umfasst Korrekturen, erneute QA und Push-/Deploymentvorbereitung. Die abschliessende Produktionsfreigabe sowie Backup-/Wartungsgates bleiben gesondert erforderlich.

## Historischer Live- und Remotebeleg

Am 03.11.2026 wurde der oeffentliche Endpunkt `https://washraum-app.onrender.com/api/health` lesend abgefragt. Er meldete:

| Feld | Beobachteter Wert |
| --- | --- |
| ok | true |
| version | `0.3.14-test.2` |
| environment | `production` |
| revision | `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380` |
| release | `a3c1f58a6a53ffd7b5bc5d7e5703745ade6ec380` |

Dies ist eine Zeitpunktbeobachtung, keine fortlaufende Betriebs- oder Funktionsabnahme. Ein fehlendes Wartungsfeld im Health ist kein Nachweis fuer den Wartungszustand.

`git ls-remote --heads origin` gegen `https://github.com/Torsten2025/washraum-app.git` ergab denselben Commit fuer `master` und `codex/remember-device-20260930`. `codex/emailfreier-zugang` existierte nicht. Remote- und Liveidentitaet muessen unmittelbar vor der spaeteren Freigabe erneut abgeglichen werden.

Der zum Preflight gelesene `scripts/production-backup-contract.js` erwartete noch Liveversion `0.3.12`; auch der aktive Bootstrapabschnitt im HANDBUCH verwendete diesen alten Wert. Das widerspricht dem beobachteten Livehealth. Der enge Korrekturauftrag fuer exakte Versionsbindung, zugehoerige Tests, Handbuch und Bundlemanifest wurde an den einzigen Builder uebergeben. Dieser Bericht bestaetigt nicht dessen Erledigung. Die Schutzpruefungen duerfen fuer die Korrektur nicht gelockert werden.

## Deploymenttrigger und vorgeschlagener Kandidatenzweig

Lesend gepruefte Quellen: `.github/workflows/deploy-render.yml`, `render.yaml`, `render.staging.yaml`, `render.agent-test.yaml` und `scripts/trigger-production-deploy.js`.

| Quelle | Beobachteter Vertrag |
| --- | --- |
| Einziger vorhandener GitHub-Workflow `deploy-render.yml` | Nur `workflow_dispatch`, kein Pushtrigger; verlangt `master` und exakte Gleichheit von Kandidatencommit und Workflow-SHA. |
| `render.yaml` | Produktionszweig `master`; keine ausdrueckliche AutoDeploy-Einstellung in dieser Datei. |
| `render.staging.yaml` | Zweig `codex/staging`, `autoDeployTrigger: off`. |
| `render.agent-test.yaml` | Zweig `codex/agent-test`, `autoDeployTrigger: commit`. |

Diese Workflow-/Blueprintdateien waren beim Preflight gegenueber HEAD unveraendert. Der vorgeschlagene neue Zweig `codex/emailfreier-zugang` ist an keinen dieser repositorydefinierten Deploymenttrigger gebunden.

**Offener externer Nachweis:** Das Repository beweist nicht die tatsaechlichen Render-Einstellungen, zusaetzliche Services, Previewregeln oder externe Webhooks. Eine unabhaengige Providerbestaetigung, dass der Kandidatenzweig nicht automatisch deployt, fehlt. Ein Render-Connector stand fuer diesen Preflight nicht zur Verfuegung. Vor dem Kandidatenpush ist dieser Punkt lesend zu klaeren; eine sichere Nichtdeploy-Garantie wird hier nicht behauptet.

Nach frischem QA-PASS koennen Commit-Aequivalenz und Kandidatenpush entsprechend dem Nutzerauftrag vorbereitet werden. Tatsaechlicher Push erst nach dem erforderlichen Triggernachweis und den geltenden Projektfreigaben. Nicht auf `master`, `codex/agent-test` oder einen anderen deployverbundenen Zweig ausweichen.

## Verbindliche Reihenfolge und fehlende Gates

1. Builder beendet die engen Fixes einschliesslich der exakten Liveversionsbindung. Kandidatenversion, Dokumentation, Tests und Backup-Bundlemanifest stimmen ueberein; exakter Freeze wird uebergeben.
2. Passende Regressionen und `npm run check` bestehen auf diesem Freeze. Unabhaengige QA prueft erneut und meldet PASS oder FAIL. Dieser Preflight ersetzt keinen dieser Nachweise.
3. CTO bestaetigt Version, Testkennzeichnung und technischen Kandidaten. Die erforderlichen Unternehmens- und sonstigen sachlich einschlaegigen Freigaben werden mit konkretem Stand dokumentiert. Dieser Bericht weist keine bereits erteilte aktuelle CTO-/Unternehmensfreigabe nach.
4. Release-Agent prueft Commit-Aequivalenz, Dateiumfang, Remote, Zweig und externen Triggerzustand. Danach kann der freigegebene Kandidat auf `codex/emailfreier-zugang` gepusht werden; Remote-SHA und Commitidentitaet sind anschliessend zu bestaetigen.
5. Produktionspreflight getrennt: tatsaechliches Render-AutoDeploy aus, keine parallelen Aktionen, genehmigtes Wartungsfenster und Wartungszustand. Keine Provider-/Environmentaenderung aufgrund dieses Berichts.
6. Backup nach verbindlichem HANDBUCH: verifizierte SQLite-Sicherung, unabhaengige Kopie, Integritaets-/Fremdschluessel-/Schema-/Hash-/Zaehlerpruefungen, isolierte Restorepruefung und sichtbare Bestaetigung des aktuellen Render-Disk-Snapshots. Keine Produktionsdaten als Testfixture verwenden.
7. Bootstrap-Bundle ausschliesslich aus dem exakt geprueften Kandidatencommit beziehen und Manifest samt Artefakten verifizieren. Frischen signierten Einmalnachweis mit exakter Live-/Kandidatenidentitaet erzeugen. Signierschluessel und Tokens bleiben geheim. Laut aktuellem Werkzeugvertrag ist der Nachweis maximal 30 Minuten gueltig; einmalige Nonce-Verwendung und Fail-closed-Verhalten duerfen nicht umgangen werden.
8. Unmittelbar vor finalem Produktionsdeploy die ausdrueckliche Eigentuemerbestaetigung einholen. Kontrollierter `master`-Schritt und manueller Workflow erst nach allen erforderlichen Gates; kein automatischer Abschluss aus einem QA-PASS ableiten.
9. CI einschliesslich Security-Audit, `npm run check` und Browserpruefungen besteht; kein Gate umgehen. Deploymenthook nur einmal gemaess Werkzeugvertrag, keine unkontrollierten Wiederholungen.
10. Nach Deployment Livehealth auf exakte erwartete Version und Revision pruefen, vereinbarte Live-Funktionspruefung durchfuehren und Wartungsabschluss kontrollieren. Erst diese Belege erlauben eine Aussage zur tatsaechlichen Veroeffentlichung.

## Weitere Abgrenzungen

- Der im HANDBUCH separat dokumentierte veraltete Agent-Test-Blueprint ist ein Bestandsproblem, kein Bestandteil dieser Freigabe und keine Erlaubnis fuer einen Push auf `codex/agent-test`.
- Keine Zugangsdaten oder Geheimwerte wurden gelesen oder ausgegeben. Keine Produktionsdaten wurden abgefragt oder veraendert.
- Keine neuen Tests wurden fuer diesen Bericht ausgefuehrt; er beruht auf dem bereits durchgefuehrten lesenden Preflight. Historische Testerfolge anderer Kandidaten werden nicht als aktuelle Freigabe verwendet.
- Nach Builderabschluss und QA ist der tatsaechliche Stand erneut an das Cockpit zu melden. Dieser Bericht erteilt auch dann nicht automatisch eine Releasefreigabe.

## Quellen

- `AGENTS.md` und `.agents/ROLES.md`, Rollenvertrag RELEASE.
- `HANDBUCH.md`, Deployment-/Produktionsbootstrapabschnitte (beim Preflight insbesondere Zeilen 708–778).
- `.github/workflows/deploy-render.yml`, `render.yaml`, `render.staging.yaml`, `render.agent-test.yaml`.
- `scripts/production-backup-contract.js`, `scripts/trigger-production-deploy.js`, `package.json`, `public/sw.js`.
- Lesende Remoteabfrage `git ls-remote --heads origin` und oeffentlicher Livehealth vom 03.11.2026.

## Nachtrag vom 03.11.2026, 22:54 Uhr Europe/Berlin

Status bleibt **VORBEREITUNG – KEINE RELEASEFREIGABE**. Die oben dokumentierten historischen Befunde bleiben erhalten. Folgende Fortschritte stammen aus der aktuellen Cockpit-Uebergabe; RELEASE hat dafuer keine weiteren Produkt-, Provider- oder Testaktionen ausgefuehrt:

- Enges Security-Minor-/Patch-Delta umgesetzt: Express `4.22.3`, body-parser `1.20.9`, proxy-addr `2.0.8`, qs `6.16.2`. Aktuell gemeldetes `npm audit`: **0 Schwachstellen**. Der zuvor festgestellte Auditblocker ist damit laut Uebergabe behoben; dies ersetzt nicht das noch laufende gesamte Projektgate.
- Backup-Liveversionsbindung auf die beobachtete Liveversion `0.3.14-test.2` korrigiert. Vor einer Produktionsaktion bleibt die erneute Pruefung der dann tatsaechlichen Liveidentitaet erforderlich.
- Der von QA gefundene CRLF-/Git-Bundle-Mismatch wurde durch `.gitattributes`, LF-Normalisierung und angepasstes Manifest korrigiert. Dieser Fix wird derzeit unabhaengig geprueft; eine finale QA-Freigabe liegt noch nicht vor.
- Gemeldeter Produkt-Finalfreeze: **143 Dateien**, Matrixfingerabdruck `80e989cef4631d99656a177ad072b7de34a44f6482873dde9180050b9a8a1605`; tracked-diff-Fingerabdruck `b164c2708cfd8f6057c2012333ce239e8b865fd9f35433973f7482a21fb1ce42`.
- **Das vollstaendige Projektgate laeuft noch.** Die Bezeichnung Finalfreeze bezeichnet den zur Pruefung vorgelegten Stand, keinen abgeschlossenen PASS und keine Releasefreigabe.
- Erneuter Fuenfjahreslauf laut Cockpit: **Exit 0**, **228,4 Sekunden**, **261 Wochen**, **20 Bewohner**, **13.584 Requests**. Im Lauf wurden keine Produktdateien veraendert. Dieser Simulationsnachweis ist keine Produktions-Liveabnahme.
- Der tatsaechliche Render-Zugang wurde im In-App-Browser geprueft: `https://dashboard.render.com` leitete auf `login-next` weiter; es bestand keine Anmeldung. Der Nutzer wurde gebeten, sich selbst anzumelden. Keine Zugangsdaten wurden angefordert oder gelesen und keine Providerkonfiguration wurde geaendert. Der externe Triggernachweis bleibt offen.

### Fingerabdruckabgrenzung fuer QA

Dieser Bericht war bereits Bestandteil der oben genannten alten Matrix. Der vorliegende, ausschliesslich dokumentarische Nachtrag wurde **nach** diesem Fingerabdruck ergaenzt und ist deshalb als separates Berichtdelta auszuweisen. Die genannten Fingerabdruecke duerfen nicht als Hash des Arbeitsbaums inklusive dieses Nachtrags bezeichnet werden. QA wird ueber diese Abgrenzung informiert; das Cockpit muss bei der abschliessenden Commit-Aequivalenz auch dieses Berichtdelta beruecksichtigen. Es erfolgte keine Produkt- oder Testaenderung durch RELEASE.

### Weiterhin offene Freigabepunkte

1. Abschluss des laufenden vollstaendigen Gates und eindeutiges unabhaengiges QA-Ergebnis fuer den exakt benannten Kandidaten, einschliesslich Git-Bundle-/Manifestkorrektur und separatem Berichtdelta.
2. Dokumentierte technische und erforderliche Unternehmensfreigaben sowie Commit-Aequivalenz. Ein Simulations-PASS oder Audit mit null Befunden ersetzt diese nicht.
3. Externe Render-Anmeldung durch den Nutzer und lesender Nachweis, dass `codex/emailfreier-zugang` nicht automatisch deployt. Vorher keine sichere Nichtdeploy-Garantie und kein Kandidatenpush aufgrund dieses Berichts.
4. Unveraendert saemtliche Produktionsgates: tatsaechliches AutoDeploy aus, keine parallelen Aktionen, freigegebenes Wartungsfenster, kontrollierter Wartungszustand, verifiziertes unabhaengiges Backup mit Restorepruefung und Snapshotbestaetigung, frischer signierter Einmalnachweis sowie ausdrueckliche finale Eigentuemerbestaetigung.
5. Nach einem gesondert freigegebenen Deployment exakte Health-/Versions-/Revisionskontrolle und vereinbarte Live-Funktionsabnahme.

Schreibumfang dieses Nachtrags: ausschliesslich `RELEASEPLAN_EMAILFREIER_ZUGANG.md`. Kein Commit, Push, Deployment, Providerzugriff oder Produktionsdatenzugriff durch RELEASE. Die angeforderte Pflichtpruefung ist auf `git diff --check -- RELEASEPLAN_EMAILFREIER_ZUGANG.md` begrenzt; ihr tatsaechliches Ergebnis wird separat an das Cockpit gemeldet.
