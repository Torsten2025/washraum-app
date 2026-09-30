'use strict';

const session = require('express-session');
const crypto = require('crypto');

const REMEMBER_MS = 90 * 24 * 60 * 60 * 1000;
const RENEW_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STANDARD_COOKIE_MS = 8 * 60 * 60 * 1000;

function credentialStamp(user) {
  return crypto.createHash('sha256').update(String(user.password_hash)).digest('hex');
}

function remembered(sess) {
  return sess?.rememberDevice === true;
}

function validRememberDeadline(sess, now) {
  return Number.isSafeInteger(sess.rememberExpiresAt)
    && Number.isSafeInteger(sess.rememberRenewedAt)
    && sess.rememberRenewedAt <= now
    && sess.rememberExpiresAt === sess.rememberRenewedAt + REMEMBER_MS
    && sess.rememberExpiresAt > now;
}

function bindRememberCookie(sess) {
  // express-session calls touch immediately before headers/save. Keep its rolling
  // cookie bounded to the server deadline, including slow responses.
  Object.defineProperty(sess, 'touch', {
    configurable: true,
    value() {
      this.cookie.expires = new Date(this.rememberExpiresAt);
      this.cookie.originalMaxAge = Math.max(0, this.rememberExpiresAt - Date.now());
      return this;
    }
  });
  sess.touch();
}

function renewRememberSession(sess, now = Date.now()) {
  if (!remembered(sess) || !validRememberDeadline(sess, now)) return false;
  if (now - sess.rememberRenewedAt >= RENEW_INTERVAL_MS) {
    sess.rememberRenewedAt = now;
    sess.rememberExpiresAt = now + REMEMBER_MS;
  }
  bindRememberCookie(sess);
  return true;
}

class BetterSqliteSessionStore extends session.Store {
  constructor(database, clock = Date.now) {
    super();
    this.db = database;
    this.clock = clock;
  }

  accountValid(sess) {
    const userId = sess.authUserId || sess.user?.id;
    if (!userId) return true;
    const user = this.db.prepare('SELECT active, password_hash FROM users WHERE id = ?').get(userId);
    return Boolean(user?.active && (!sess.authCredentialStamp || sess.authCredentialStamp === credentialStamp(user)));
  }

  get(sid, callback) {
    try {
      const now = this.clock();
      const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?').get(sid, now);
      const sess = row ? JSON.parse(row.sess) : null;
      if (sess && (!this.accountValid(sess) || (remembered(sess) && !validRememberDeadline(sess, now)))) {
        this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        return callback(null, null);
      }
      callback(null, sess);
    } catch (error) { callback(error); }
  }

  set(sid, sess, callback = () => {}) {
    try {
      this.db.transaction(() => {
        const now = this.clock();
        const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?').get(sid, now);
        // Only the explicit authenticated regeneration path creates a row.
        // Neither stale authenticated nor anonymous saves may resurrect a SID.
        if (!row) return;
        const current = JSON.parse(row.sess);
        if (!this.accountValid(sess) || !this.accountValid(current)) {
          this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
          return;
        }
        if (current.authUserId && (Number(sess.authUserId) !== Number(current.authUserId)
            || sess.authCredentialStamp !== current.authCredentialStamp)) return;
        if (remembered(sess)) {
          if (!validRememberDeadline(sess, now)) return;
          if (remembered(current)) {
            if (!validRememberDeadline(current, now)) return;
            if (current.rememberRenewedAt > sess.rememberRenewedAt) {
              sess.rememberRenewedAt = current.rememberRenewedAt;
              sess.rememberExpiresAt = current.rememberExpiresAt;
            }
          }
          sess.cookie.expires = new Date(sess.rememberExpiresAt);
        }
        const expires = remembered(sess) ? sess.rememberExpiresAt
          : sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : now + STANDARD_COOKIE_MS;
        this.db.prepare('UPDATE sessions SET expired = ?, sess = ? WHERE sid = ? AND expired > ?')
          .run(expires, JSON.stringify(sess), sid, now);
      }).immediate();
      callback(null);
    } catch (error) { callback(error); }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback(null);
    } catch (error) { callback(error); }
  }

  touch(sid, sess, callback = () => {}) {
    try {
      const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?').get(sid, this.clock());
      if (!row) return callback(null);
      // An unchanged parallel request must not write its old house/context over
      // a newer session update. Preserve the current row and touch only expiry.
      const current = JSON.parse(row.sess);
      if (remembered(current)) {
        current.cookie.expires = new Date(current.rememberExpiresAt);
      } else {
        current.cookie = sess.cookie;
      }
      this.set(sid, current, callback);
    } catch (error) { callback(error); }
  }
}

module.exports = { BetterSqliteSessionStore, REMEMBER_MS, RENEW_INTERVAL_MS, STANDARD_COOKIE_MS,
  credentialStamp, remembered, validRememberDeadline, bindRememberCookie, renewRememberSession };
