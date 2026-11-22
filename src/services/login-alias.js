'use strict';

// Store the comparison key explicitly: SQLite NOCASE only handles ASCII,
// while older app/backup processes must be able to open this file without UDFs.
function loginAliasKey(value) {
  return String(value ?? '').trim().normalize('NFC').replace(/ +/g, ' ')
    .replaceAll('’', "'").toUpperCase().replaceAll('ẞ', 'SS').toLowerCase().normalize('NFC');
}

// Both supported fields feed the very same sign-in identity, including when
// an older client sends both. Other flows can have a different field contract.
function submittedLoginIdentifier(body) {
  const value = body?.email || body?.username;
  return typeof value === 'string' ? value : '';
}

const invalid = 'Anmeldename ungültig. Verwende 2–40 Zeichen und beginne mit einem Buchstaben. WZ- ist reserviert.';
const unavailable = 'Dieser Anmeldename ist nicht verfügbar. Bitte wähle einen anderen.';
const conflict = () => Object.assign(new Error(unavailable), { loginAliasStatus: 409 });

function aliasClaimsUsername(db, username) {
  return Boolean(db.prepare('SELECT 1 FROM users WHERE login_alias_key = ?').get(loginAliasKey(username)));
}
function checkedLoginAlias(db, value, ownId = 0) {
  if (value === undefined || value === '') return null;
  const alias = typeof value === 'string' ? value.trim().normalize('NFC').replace(/ +/g, ' ') : null;
  if (alias === '') return null;
  if (!alias || !/^\p{L}[\p{L}\p{M}\p{N} .'’_-]{1,39}$/u.test(alias) || /^wz-/i.test(alias)) {
    throw Object.assign(new Error(invalid), { loginAliasStatus: 400 });
  }
  const key = loginAliasKey(alias);
  if (db.prepare('SELECT 1 FROM users WHERE login_alias_key = ? AND id != ?').get(key, ownId)) throw conflict();
  // Old usernames may use any case/normalization. Do not modify historical
  // rows or re-enable their login; this scan only runs on choosing a name.
  for (const row of db.prepare('SELECT username, email, secondary_email FROM users').iterate()) {
    if ([row.username, row.email, row.secondary_email].some(old => old && loginAliasKey(old) === key)) throw conflict();
  }
  return alias;
}

function sendAliasError(error, res) {
  const conflict = error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('users.login_alias_key');
  if (!error.loginAliasStatus && !conflict) return false;
  res.status(error.loginAliasStatus || 409).json({ error: error.loginAliasStatus ? error.message : unavailable });
  return true;
}

// Must run within the same transaction as any other profile changes.
function updateOwnLoginAlias(db, userId, value) {
  const alias = checkedLoginAlias(db, value, userId);
  db.prepare('UPDATE users SET login_alias = ?, login_alias_key = ? WHERE id = ?')
    .run(alias, alias && loginAliasKey(alias), userId);
  return alias || '';
}

module.exports = { checkedLoginAlias, loginAliasKey, submittedLoginIdentifier, aliasClaimsUsername, sendAliasError, updateOwnLoginAlias };
