# Produktionsmigrationen

Dieses Verzeichnis ist die einzige Allowlist fuer produktionsgebundene Migrationsartefakte.
Ein Releaseartefakt wird erst nach der read-only Produktionsinventur gebildet und bindet
Version, vollen Commit, Vor-/Nach-Schemahash, additive Schritte, Codekompatibilitaet und
seinen kanonischen SHA256. Der aktuelle Kandidat enthaelt bewusst kein geratenes Live-
Schemaartefakt.

Der Runner akzeptiert ausschliesslich `destructive=false`. `DROP`, Daten-Updates,
Backfills, Normalisierung, Bereinigung und Retention sind ausgeschlossen. Ledger und
additive Schritte laufen gemeinsam in genau einer Transaktion; der zweite Lauf ist ein
No-op. Vor dem ersten Datenbankwrite muss ein frisch verifiziertes, clientseitig
verschluesseltes Off-Disk-Backup mit Restore-Readback vorliegen.
