'use strict';

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

function verifiedEmailForKind(user, emailKind = 'primary') {
  if (!user || Number(user.active) !== 1) return '';
  const secondary = emailKind === 'secondary';
  const current = normalizeEmail(secondary ? user.secondary_email : user.email);
  const verified = Number(secondary ? user.secondary_email_verified : user.email_verified) === 1;
  const bound = normalizeEmail(
    secondary ? user.secondary_email_verified_value : user.email_verified_value
  );
  if (!verified || !current || !bound || current !== bound || !isValidEmail(current)) return '';
  return current;
}

function verifiedEmailForUser(user) {
  return verifiedEmailForKind(user, 'primary') || verifiedEmailForKind(user, 'secondary');
}

module.exports = {
  isValidEmail,
  normalizeEmail,
  verifiedEmailForKind,
  verifiedEmailForUser
};
