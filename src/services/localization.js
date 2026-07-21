const SUPPORTED_LANGUAGES = new Set(['de', 'en']);

function normalizeLanguage(value) {
  const language = String(value || '').trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(language) ? language : 'de';
}

function mailCopy(language, key, values = {}) {
  const lang = normalizeLanguage(language);
  const copy = {
    verifySubject: {
      de: 'WaschZeit: E-Mail-Adresse bestaetigen',
      en: 'WaschZeit: Confirm your email address'
    },
    verifyBody: {
      de: `Hallo {name}\n\nBitte bestaetige deine E-Mail-Adresse. Erst danach werden Freigabe-Hinweise an diese Adresse gesendet.\n\n{link}\n\nDer Link ist 24 Stunden gueltig.`,
      en: `Hello {name}\n\nPlease confirm your email address. Release notifications will only be sent to this address after confirmation.\n\n{link}\n\nThe link is valid for 24 hours.`
    },
    resetSubject: {
      de: 'WaschZeit: Passwort neu setzen',
      en: 'WaschZeit: Reset your password'
    },
    resetBody: {
      de: `Hallo {name}\n\nMit diesem Link kannst du ein neues Passwort setzen:\n\n{link}\n\nDer Link ist eine Stunde gueltig. Falls du nichts angefordert hast, kannst du diese Mail ignorieren.`,
      en: `Hello {name}\n\nUse this link to set a new password:\n\n{link}\n\nThe link is valid for one hour. If you did not request it, you can ignore this email.`
    },
    releaseBody: {
      de: `Hallo {name}\n\n{message}\n\nDu kannst den Slot jetzt im Waschplan ansehen und buchen: {url}\n\nViele Gruesse\nWaschZeit {house}`,
      en: `Hello {name}\n\n{message}\n\nYou can now view and book the slot in the laundry schedule: {url}\n\nKind regards\nWaschZeit {house}`
    },
    testSubject: {
      de: 'WaschZeit: Testmail',
      en: 'WaschZeit: Test email'
    },
    testBody: {
      de: `Hallo {name}\n\nDer E-Mail-Versand des Waschplans funktioniert.\n\nViele Gruesse\nWaschZeit {house}`,
      en: `Hello {name}\n\nEmail delivery for the laundry schedule is working.\n\nKind regards\nWaschZeit {house}`
    }
  };
  const template = copy[key]?.[lang] || copy[key]?.de || key;
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value ?? '')),
    template
  ).trim();
}

function translateReleaseText(message, language) {
  if (normalizeLanguage(language) !== 'en') return String(message || '');
  const source = String(message || '');
  const patterns = [
    [/^(.+) hat ein Waschpaket am (.+) im Zeitfenster (.+) abgesagt\. Die enthaltenen Termine sind wieder buchbar\.$/, '$1 cancelled a laundry package on $2 in time slot $3. The included bookings are available again.'],
    [/^(.+) hat (.+) am (.+) im Zeitfenster (.+) abgesagt\. Der Slot ist wieder buchbar\.$/, '$1 cancelled $2 on $3 in time slot $4. The slot is available again.'],
    [/^(.+) hat (.+) freigegeben\. Der Slot ist heute bis (.+) wieder frei\.$/, '$1 released $2 early. The slot is available again today until $3.'],
    [/^(.+) hat (.+) freigegeben\. Der Slot ist am (.+) im Zeitfenster (.+) wieder frei\.$/, '$1 released $2. The slot is available again on $3 in time slot $4.']
  ];
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(source)) return source.replace(pattern, replacement);
  }
  return source;
}

function translateReleaseSubject(subject, language) {
  if (normalizeLanguage(language) !== 'en') return String(subject || '').replace(/^Waschplan:/, 'WaschZeit:');
  const source = String(subject || '').replace(/^Waschplan:/, 'WaschZeit:');
  return source
    .replace(/Waschpaket wieder frei/, 'Laundry package available again')
    .replace(/Termin fuer (.+) wieder frei/, 'Booking for $1 available again')
    .replace(/(.+) frueher frei/, '$1 released early')
    .replace(/(.+) frei$/, '$1 available');
}

module.exports = {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  mailCopy,
  translateReleaseText,
  translateReleaseSubject
};
