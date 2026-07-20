function createBackupService({ db, Database, fs, path, env, dbDir, setSetting, fetchImpl }) {
  function backupDirectory() {
    return path.resolve(env.BACKUP_DIR || (
      env.RENDER === 'true' ? '/var/data/backups' : path.join(dbDir, 'backups')
    ));
  }

  async function createVerifiedBackup() {
    const directory = backupDirectory();
    fs.mkdirSync(directory, { recursive: true });
    const filename = `washplan-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
    const backupPath = path.join(directory, filename);
    await db.backup(backupPath);
    const verificationDb = new Database(backupPath, { readonly: true, fileMustExist: true });
    const integrity = verificationDb.pragma('integrity_check', { simple: true });
    verificationDb.close();
    if (integrity !== 'ok') {
      fs.rmSync(backupPath, { force: true });
      throw new Error(`Backup-Integrit\u00e4tspr\u00fcfung: ${integrity}`);
    }

    const backups = fs.readdirSync(directory)
      .filter((name) => name.startsWith('washplan-') && name.endsWith('.sqlite'))
      .sort()
      .reverse();
    const retainedBackups = new Set(backups.slice(0, 3));
    const retainedDays = new Set();
    for (const backupName of backups) {
      const day = backupName.slice('washplan-'.length, 'washplan-'.length + 10);
      if (retainedDays.size >= 14 || retainedDays.has(day)) continue;
      retainedDays.add(day);
      retainedBackups.add(backupName);
    }
    for (const oldName of backups) {
      if (!retainedBackups.has(oldName)) fs.rmSync(path.join(directory, oldName), { force: true });
    }

    let uploaded = false;
    const uploadUrl = String(env.BACKUP_UPLOAD_URL || '').trim();
    if (uploadUrl) {
      const target = uploadUrl.includes('{filename}')
        ? uploadUrl.replace('{filename}', encodeURIComponent(filename))
        : uploadUrl;
      const response = await fetchImpl(target, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/vnd.sqlite3',
          ...(env.BACKUP_UPLOAD_TOKEN
            ? { Authorization: `Bearer ${env.BACKUP_UPLOAD_TOKEN}` }
            : {})
        },
        body: fs.readFileSync(backupPath)
      });
      if (!response.ok) {
        throw new Error(`Externe Backup-Kopie fehlgeschlagen (${response.status})`);
      }
      uploaded = true;
    }
    const status = { ok: true, filename, createdAt: new Date().toISOString(), uploaded };
    setSetting('backup_status', JSON.stringify(status));
    return status;
  }

  return { backupDirectory, createVerifiedBackup };
}

module.exports = { createBackupService };
