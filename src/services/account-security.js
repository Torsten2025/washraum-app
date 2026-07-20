'use strict';

function createAccountSecurity({ bcrypt, crypto }) {
  function isBcryptHash(hash) {
    return /^\$2[aby]\$\d{2}\$/.test(String(hash || ''));
  }

  function verifyStoredPassword(password, storedHash) {
    const hash = String(storedHash || '');
    if (isBcryptHash(hash)) {
      return bcrypt.compareSync(password, hash);
    }

    const [salt, legacyHash] = hash.split(':');
    if (!salt || !/^[a-f\d]{128}$/i.test(legacyHash || '')) {
      return false;
    }

    try {
      const candidate = crypto.scryptSync(password, salt, 64);
      const expected = Buffer.from(legacyHash, 'hex');
      return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
    } catch {
      return false;
    }
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isValidEmail(value) {
    const email = String(value || '').trim();
    if (!email || email.length > 254 || /[\s\u0000-\u001f\u007f<>"\\]/.test(email)) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [localPart, domain] = parts;
    if (
      !localPart
      || localPart.length > 64
      || localPart.startsWith('.')
      || localPart.endsWith('.')
      || localPart.includes('..')
      || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)
    ) return false;
    const labels = domain.split('.');
    return labels.length >= 2 && labels.every((label) => (
      label.length >= 1
      && label.length <= 63
      && /^[A-Za-z0-9-]+$/.test(label)
      && !label.startsWith('-')
      && !label.endsWith('-')
    ));
  }

  function verifiedEmailForUser(user) {
    if (user?.email_verified && isValidEmail(user.email)) return normalizeEmail(user.email);
    if (user?.secondary_email_verified && isValidEmail(user.secondary_email)) {
      return normalizeEmail(user.secondary_email);
    }
    return '';
  }

  function normalizeAccessCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '');
  }

  function generateReadableCode(prefix = '') {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let value = '';
    for (let index = 0; index < 10; index += 1) {
      value += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    const groups = `${value.slice(0, 5)}-${value.slice(5)}`;
    return prefix ? `${prefix}-${groups}` : groups;
  }

  function isValidUsername(value) {
    return /^[\p{L}\p{N}][\p{L}\p{N} ._'\u2019-]{2,39}$/u.test(String(value || ''));
  }

  function isValidPassword(value) {
    const length = String(value || '').length;
    return length >= 12 && length <= 128;
  }

  const authRateBuckets = new Map();
  const authRateWindowMs = 15 * 60 * 1000;
  const authRateMaxAttempts = 20;

  function authRateLimit(req, res, next) {
    const now = Date.now();
    const identity = normalizeEmail(req.body?.username || req.body?.email || 'unknown');
    const key = `${String(req.ip || req.socket.remoteAddress || 'unknown')}|${identity}`;
    let bucket = authRateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { attempts: 0, resetAt: now + authRateWindowMs };
    }
    bucket.attempts += 1;
    authRateBuckets.set(key, bucket);
    req.authRateKey = key;

    if (bucket.attempts > authRateMaxAttempts) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte versuche es in einigen Minuten erneut.' });
    }

    if (authRateBuckets.size > 500) {
      for (const [bucketKey, value] of authRateBuckets) {
        if (value.resetAt <= now) {
          authRateBuckets.delete(bucketKey);
        }
      }
      if (authRateBuckets.size > 1000) {
        authRateBuckets.delete(authRateBuckets.keys().next().value);
      }
    }
    next();
  }

  function ipRateLimit({ windowMs, maxAttempts, message }) {
    const buckets = new Map();
    return (req, res, next) => {
      const now = Date.now();
      const key = String(req.ip || req.socket.remoteAddress || 'unknown');
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { attempts: 0, resetAt: now + windowMs };
      }
      bucket.attempts += 1;
      buckets.set(key, bucket);
      if (bucket.attempts > maxAttempts) {
        res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
        return res.status(429).json({ error: message });
      }
      if (buckets.size > 1000) {
        for (const [bucketKey, value] of buckets) {
          if (value.resetAt <= now) buckets.delete(bucketKey);
        }
      }
      next();
    };
  }

  const registrationRateLimit = ipRateLimit({
    windowMs: 60 * 60 * 1000,
    maxAttempts: 30,
    message: 'Zu viele Einladungsversuche. Bitte versuche es spaeter erneut.'
  });
  const recoveryRateLimit = ipRateLimit({
    windowMs: 60 * 60 * 1000,
    maxAttempts: 12,
    message: 'Zu viele Wiederherstellungsversuche. Bitte versuche es sp\u00e4ter erneut.'
  });
  const adminRecoveryRateLimit = ipRateLimit({
    windowMs: 60 * 60 * 1000,
    maxAttempts: 30,
    message: 'Zu viele Admin-Wiederherstellungsversuche. Bitte versuche es spaeter erneut.'
  });

  function clearAuthRateLimit(req) {
    if (req.authRateKey) {
      authRateBuckets.delete(req.authRateKey);
    }
  }

  return {
    isBcryptHash,
    verifyStoredPassword,
    authRateLimit,
    registrationRateLimit,
    recoveryRateLimit,
    adminRecoveryRateLimit,
    clearAuthRateLimit,
    normalizeEmail,
    isValidEmail,
    verifiedEmailForUser,
    normalizeAccessCode,
    generateReadableCode,
    isValidUsername,
    isValidPassword
  };
}

module.exports = { createAccountSecurity };
