const userLine = document.querySelector('#userLine');
const brandHouseName = document.querySelector('#brandHouseName');
const introHouseName = document.querySelector('#introHouseName');
const houseSwitcher = document.querySelector('#houseSwitcher');
const houseSelect = document.querySelector('#houseSelect');
const viewSwitcher = document.querySelector('#viewSwitcher');
const bookingViewButton = document.querySelector('#bookingViewButton');
const adminViewButton = document.querySelector('#adminViewButton');
const bookingDate = document.querySelector('#bookingDate');
const bookingSuggestion = document.querySelector('#bookingSuggestion');
const weekCalendar = document.querySelector('#weekCalendar');
const calendarRange = document.querySelector('#calendarRange');
const previousWeekButton = document.querySelector('#previousWeekButton');
const nextWeekButton = document.querySelector('#nextWeekButton');
const todayButton = document.querySelector('#todayButton');
const schedule = document.querySelector('#schedule');
const statusText = document.querySelector('#statusText');
const adminBox = document.querySelector('#adminBox');
const adminOverview = document.querySelector('#adminOverview');
const adminEmailTestButton = document.querySelector('#adminEmailTestButton');
const adminTitle = document.querySelector('#adminTitle');
const adminRoleLabel = document.querySelector('#adminRoleLabel');
const adminScopeText = document.querySelector('#adminScopeText');
const adminSectionButtons = [...document.querySelectorAll('.admin-section-tab')];
const adminSections = [...document.querySelectorAll('[data-admin-section]')];
const backupOperation = document.querySelector('#backupOperation');
const runBackupButton = document.querySelector('#runBackupButton');
const houseCodeForm = document.querySelector('#houseCodeForm');
const houseCodeInput = document.querySelector('#houseCodeInput');
const superadminBox = document.querySelector('#superadminBox');
const houseForm = document.querySelector('#houseForm');
const houseNameInput = document.querySelector('#houseNameInput');
const newHouseCodeInput = document.querySelector('#newHouseCodeInput');
const houseList = document.querySelector('#houseList');
const resourceForm = document.querySelector('#resourceForm');
const resourceNameInput = document.querySelector('#resourceNameInput');
const resourceTypeInput = document.querySelector('#resourceTypeInput');
const resourceAdminList = document.querySelector('#resourceAdminList');
const auditLog = document.querySelector('#auditLog');
const notificationForm = document.querySelector('#notificationForm');
const notificationEmail = document.querySelector('#notificationEmail');
const notifyReleasesInput = document.querySelector('#notifyReleases');
const emailVerificationStatus = document.querySelector('#emailVerificationStatus');
const resendVerificationButton = document.querySelector('#resendVerificationButton');
const notificationResourceType = document.querySelector('#notificationResourceType');
const notificationWeekday = document.querySelector('#notificationWeekday');
const notificationSlot = document.querySelector('#notificationSlot');
const passwordForm = document.querySelector('#passwordForm');
const currentPasswordInput = document.querySelector('#currentPassword');
const newPasswordInput = document.querySelector('#newPassword');
const newPasswordConfirmation = document.querySelector('#newPasswordConfirmation');
const deleteAccountForm = document.querySelector('#deleteAccountForm');
const deleteAccountPassword = document.querySelector('#deleteAccountPassword');
const fixedBookingForm = document.querySelector('#fixedBookingForm');
const fixedBookingLabel = document.querySelector('#fixedBookingLabel');
const fixedBookingResource = document.querySelector('#fixedBookingResource');
const fixedBookingWeekday = document.querySelector('#fixedBookingWeekday');
const fixedBookingSlot = document.querySelector('#fixedBookingSlot');
const fixedBookingList = document.querySelector('#fixedBookingList');
const userList = document.querySelector('#userList');
const myBookings = document.querySelector('#myBookings');
const releaseNotices = document.querySelector('#releaseNotices');
const filterButtons = [...document.querySelectorAll('.filter')];
const openIntroButton = document.querySelector('#openIntroButton');
const openKnowledgeButton = document.querySelector('#openKnowledgeButton');
const introOverlay = document.querySelector('#introOverlay');
const closeIntroButton = document.querySelector('#closeIntroButton');
const introDoneButton = document.querySelector('#introDoneButton');
const introVideoStage = document.querySelector('#introVideoStage');
const introVideoChapter = document.querySelector('#introVideoChapter');
const introVideoTitle = document.querySelector('#introVideoTitle');
const introVideoCaption = document.querySelector('#introVideoCaption');
const introVideoVisual = document.querySelector('#introVideoVisual');
const introVideoProgress = document.querySelector('#introVideoProgress');
const introVideoProgressTrack = document.querySelector('#introVideoProgressTrack');
const introVideoPlayButton = document.querySelector('#introVideoPlayButton');
const introVideoMuteButton = document.querySelector('#introVideoMuteButton');
const introVideoPreviousButton = document.querySelector('#introVideoPreviousButton');
const introVideoNextButton = document.querySelector('#introVideoNextButton');
const introVideoVoiceStatus = document.querySelector('#introVideoVoiceStatus');
const introQuizForm = document.querySelector('#introQuizForm');
const introQuizResult = document.querySelector('#introQuizResult');
const recordedIntroVideo = document.querySelector('#recordedIntroVideo');
const recordedIntroDuration = document.querySelector('#recordedIntroDuration');

let currentUser = null;
let availableHouses = [];
let resources = [];
let bookings = [];
let slots = [];
let activeType = 'washer';
let calendarStartDate = '';
let calendarDays = [];
let currentRecommendation = null;
let introVideoStepIndex = 0;
let introVideoStepElapsedMs = 0;
let introVideoTimer = null;
let introVideoLastTick = 0;
let introVideoPlaying = false;
let introVideoFinished = false;
let introVideoUtterance = null;
let introVideoSpeechPaused = false;
let introVideoSpeechRun = 0;
let introVideoPreferredVoice = null;
let introReturnFocus = null;
let activeAdminSection = 'overview';
const introVideoSpeechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let introVideoSpeechEnabled = introVideoSpeechSupported;

const weekdayLabels = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag'
};

const introVideoSteps = [
  {
    id: 'overview',
    fallbackDurationMs: 18000,
    title: 'Willkommen im Waschplan',
    caption: 'Deine Termine, ein passendes Waschpaket und die freien Tage liegen direkt beieinander.',
    speech: 'Hallo und willkommen. Ich zeige dir kurz, wie du hier einen Waschtermin buchst. Oben findest du deine n\u00e4chsten Buchungen. Direkt darunter stellt dir die App ein passendes Waschpaket zusammen. Im Wochenkalender siehst du, an welchen Tagen noch etwas frei ist.',
    visual: `
      <div class="scene-overview">
        <div class="scene-bar"><span>Hallo, Anna</span><span>Meine Ansicht</span></div>
        <div class="scene-grid">
          <div class="scene-panel"><small>Meine Buchung</small><strong>Di, 07:00</strong><span>Waschmaschine 2</span></div>
          <div class="scene-panel scene-accent"><small>Pers\u00f6nliches Waschpaket</small><strong>Do, 12:00</strong><span>Gemeinsam buchen</span></div>
          <div class="scene-panel"><small>Diese Woche</small><strong>5 Tage frei</strong><span>Kalender ansehen</span></div>
        </div>
      </div>`
  },
  {
    id: 'booking',
    fallbackDurationMs: 21000,
    title: 'In drei Schritten buchen',
    caption: 'Tag ausw\u00e4hlen, Bereich festlegen und im freien Zeitfenster auf Buchen klicken.',
    speech: 'F\u00fcr eine Buchung gehst du so vor. W\u00e4hle im Kalender den gew\u00fcnschten Tag. Danach w\u00e4hlst du Waschmaschine, Trockenraum oder Tumbler. Freie Zeiten haben eine Schaltfl\u00e4che mit der Aufschrift Buchen. Ein Klick gen\u00fcgt. Danach erscheint der Termin unter Meine Buchungen.',
    visual: `
      <div class="scene-booking">
        <div class="scene-days"><span>Mo<br><b>15</b></span><span class="active">Di<br><b>16</b></span><span>Mi<br><b>17</b></span><span>Do<br><b>18</b></span></div>
        <div class="scene-tabs"><span class="active">Waschmaschine</span><span>Trockenraum</span><span>Tumbler</span></div>
        <div class="scene-slot"><span><small>Waschmaschine 2</small><strong>12:00 - 17:00</strong></span><b>Buchen</b></div>
      </div>`
  },
  {
    id: 'suggestion',
    fallbackDurationMs: 31000,
    title: 'Dein pers\u00f6nliches Waschpaket',
    caption: 'Ein passender freier Termin l\u00e4sst sich direkt buchen oder vorher anpassen.',
    speech: 'Das pers\u00f6nliche Waschpaket nimmt dir mehrere einzelne Buchungen ab. Die App verbindet deinen bisherigen Waschrhythmus mit den freien Zeiten. Du stellst mit einer schnellen Auswahl ein, ob du eine, zwei oder drei Waschmaschinen brauchst. Trockenraum und Tumbler kannst du direkt ein- oder ausschalten. Beim Trockenraum w\u00e4hlst du kurz, Standard oder die maximal erlaubte Dauer. Mit Waschpaket buchen werden alle ausgew\u00e4hlten Bestandteile gemeinsam reserviert und sp\u00e4ter als ein Paket angezeigt.',
    visual: `
      <div class="scene-suggestion">
        <div class="scene-suggestion-head"><span><small>Pers\u00f6nliches Waschpaket</small><strong>Passt wahrscheinlich gut</strong></span><b>Frei</b></div>
        <div class="scene-slot scene-suggestion-slot"><span><small>Donnerstag, 16. Juli</small><strong>12:00 - 17:00</strong><em>Waschmaschine 2 + Trockenraum</em></span><b>Paket buchen</b></div>
        <div class="scene-suggestion-steps"><span><b>1</b>Pr\u00fcfen</span><span><b>2</b>Zus\u00e4tze w\u00e4hlen</span><span><b>3</b>Gemeinsam buchen</span></div>
      </div>`
  },
  {
    id: 'washer',
    fallbackDurationMs: 24000,
    title: 'Waschmaschine: ein Zeitfenster',
    caption: 'Mehrere Maschinen sind m\u00f6glich, aber nur gemeinsam im selben Zeitfenster.',
    speech: 'Bei den Waschmaschinen gilt: Du reservierst pro Waschtag nur ein Zeitfenster. Brauchst du mehrere Maschinen, buchst du sie im selben Zeitfenster. Einen weiteren zuk\u00fcnftigen Waschtag kannst du erst reservieren, wenn dein bereits gebuchter Waschtag erreicht ist. Die App pr\u00fcft das automatisch.',
    visual: `
      <div class="scene-washer">
        <div class="scene-time"><small>Dein Waschtag</small><strong>12:00 - 17:00</strong></div>
        <div class="scene-machines"><span class="booked">WM 1<br><b>Gebucht</b></span><span class="booked">WM 2<br><b>Gebucht</b></span><span>WM 3<br><b>Frei</b></span></div>
        <div class="scene-rule">Ein Tag. Ein Zeitfenster. Mehrere Maschinen sind hier m\u00f6glich.</div>
      </div>`
  },
  {
    id: 'drying',
    fallbackDurationMs: 28000,
    title: 'Trockenraum passend einplanen',
    caption: 'Die erlaubte Dauer richtet sich danach, wann dein Waschslot beginnt.',
    speech: 'Der Trockenraum wird passend zu deiner Waschmaschinen-Buchung reserviert. Wenn du morgens von sieben bis zw\u00f6lf w\u00e4schst, kannst du den Raum bis sp\u00e4testens einundzwanzig Uhr nutzen. Beim Slot von zw\u00f6lf bis siebzehn Uhr und beim Abend-Slot bis einundzwanzig Uhr endet die Nutzung sp\u00e4testens am folgenden Tag um zw\u00f6lf Uhr. Im Waschpaket kannst du bewusst eine k\u00fcrzere Dauer ausw\u00e4hlen. Wenn die W\u00e4sche trocken ist, gibst du den Raum am besten direkt frei.',
    visual: `
      <div class="scene-drying">
        <div><span>Waschen 07:00</span><i></i><strong>bis 21:00</strong></div>
        <div><span>Waschen 12:00</span><i></i><strong>bis Folgetag 12:00</strong></div>
        <div><span>Waschen 17:00</span><i></i><strong>bis Folgetag 12:00</strong></div>
      </div>`
  },
  {
    id: 'tumbler',
    fallbackDurationMs: 26000,
    title: 'Tumbler und fr\u00fche Freigabe',
    caption: 'Ein Tumbler bleibt frei. Nicht mehr ben\u00f6tigte Termine gibst du f\u00fcr andere frei.',
    speech: 'F\u00fcr die Tumbler gilt: Am Ende eines Waschslots muss mindestens ein Tumbler frei bleiben. Deshalb kann die App eine Buchung ablehnen, obwohl noch ein Ger\u00e4t angezeigt wird. Wenn du w\u00e4hrend deines Slots fr\u00fcher fertig bist, w\u00e4hlst du Fr\u00fcher frei. Vor Slotbeginn nutzt du Absagen und informieren. E-Mails gehen nur an Personen mit best\u00e4tigter Adresse und passend gew\u00e4hltem Interesse.',
    visual: `
      <div class="scene-tumbler">
        <div class="scene-machines"><span class="booked">Tumbler 1<br><b>Gebucht</b></span><span>Tumbler 2<br><b>Bleibt frei</b></span></div>
        <div class="scene-release"><span><small>Du bist fr\u00fcher fertig?</small><strong>Termin wieder freigeben</strong></span><b>Freigeben</b></div>
      </div>`
  },
  {
    id: 'cleaning',
    fallbackDurationMs: 28000,
    title: 'Sauber fertig werden',
    caption: 'Reinigen geh\u00f6rt zu jeder Nutzung, auch bei einem einzelnen Waschgang.',
    speech: 'Zum Schluss noch das, was den Alltag f\u00fcr alle angenehmer macht. Bitte reinige nach der Nutzung Trommel, Dichtungen und Filter. Wische die benutzten Fl\u00e4chen und den Boden, und h\u00e4nge den ausgesp\u00fclten Wischmopp zum Trocknen auf. Das gilt auch, wenn du nur einen einzelnen Waschgang machst. Die vollst\u00e4ndige \u00dcbersicht findest du jederzeit im Wissensbereich. Und damit bist du startklar.',
    visual: `
      <div class="scene-cleaning">
        <span><b>1</b>Trommel und Dichtungen</span>
        <span><b>2</b>Filter und Fl\u00e4chen</span>
        <span><b>3</b>Boden und Wischmopp</span>
        <strong>Danke, dass du den Waschraum sauber hinterl\u00e4sst.</strong>
      </div>`
  }
];

const swissClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function swissClockParts(date = new Date()) {
  return Object.fromEntries(swissClockFormatter.formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
}

function swissClockTimestamp(date = new Date()) {
  const parts = swissClockParts(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function todayString() {
  const parts = swissClockParts();
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function formatDateString(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysString(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateString(date);
}

function startOfWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return formatDateString(date);
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC'
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function formatCalendarRange(from, to) {
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  const dateOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  const startLabel = new Intl.DateTimeFormat('de-CH', dateOptions).format(start);
  const endLabel = new Intl.DateTimeFormat('de-CH', dateOptions).format(end);
  return `${startLabel} - ${endLabel}`;
}

function typeLabel(type) {
  if (type === 'washer') return 'Waschmaschine';
  if (type === 'drying_room') return 'Trockenraum';
  if (type === 'tumbler') return 'Tumbler';
  return type;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function dateStatus(dateString) {
  const diffDays = Math.round((Date.parse(`${dateString}T00:00:00Z`) - Date.parse(`${todayString()}T00:00:00Z`)) / 86400000);
  if (diffDays < 0) return 'vergangen';
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'morgen';
  return 'geplant';
}

function isPastSlot(dateString, slot) {
  const [, end] = slot.split('-');
  return Date.parse(`${dateString}T${end}:00Z`) <= swissClockTimestamp();
}

function showStatus(message, tone = 'ok') {
  statusText.textContent = message;
  statusText.className = `notice ${tone}`;
}

function openIntro() {
  introReturnFocus = document.activeElement;
  introOverlay.hidden = false;
  document.body.classList.add('modal-open');
  renderIntroVideo();
  closeIntroButton.focus();
}

function closeIntro() {
  stopIntroVideo();
  recordedIntroVideo.pause();
  introOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  if (introReturnFocus instanceof HTMLElement) {
    introReturnFocus.focus();
  }
}

function introVideoStepDuration(step) {
  const spokenWords = step.speech.trim().split(/\s+/).length;
  const naturalReadingTime = Math.ceil((spokenWords / 2.25) * 1000 + 1400);
  return Math.max(step.fallbackDurationMs, naturalReadingTime);
}

function introVoiceScore(voice) {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (/natural|online/.test(name)) score += 100;
  if (voice.lang.toLowerCase() === 'de-ch') score += 35;
  if (voice.lang.toLowerCase() === 'de-de') score += 30;
  if (/google|microsoft|apple/.test(name)) score += 20;
  if (voice.default) score += 5;
  return score;
}

function refreshIntroVideoVoice() {
  if (!introVideoSpeechSupported) {
    return;
  }
  const germanVoices = window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('de'))
    .sort((left, right) => introVoiceScore(right) - introVoiceScore(left));
  introVideoPreferredVoice = germanVoices[0] || null;
  renderIntroVideo();
}

function clearIntroVideoTimer() {
  if (introVideoTimer) {
    window.clearInterval(introVideoTimer);
    introVideoTimer = null;
  }
}

function cancelIntroVideoSpeech() {
  introVideoSpeechRun += 1;
  introVideoSpeechPaused = false;
  introVideoUtterance = null;
  if (introVideoSpeechSupported) {
    window.speechSynthesis.cancel();
  }
}

function renderIntroVideo() {
  const step = introVideoSteps[introVideoStepIndex];
  const duration = introVideoStepDuration(step);
  const rawStepProgress = Math.min(1, introVideoStepElapsedMs / duration);
  const stepProgress = introVideoSpeechSupported && introVideoSpeechEnabled && !introVideoFinished
    ? Math.min(0.94, rawStepProgress)
    : rawStepProgress;
  const progress = introVideoFinished
    ? 1
    : (introVideoStepIndex + stepProgress) / introVideoSteps.length;

  introVideoStage.dataset.step = step.id;
  introVideoChapter.textContent = `Kapitel ${introVideoStepIndex + 1} von ${introVideoSteps.length}`;
  introVideoTitle.textContent = step.title;
  introVideoCaption.textContent = step.caption;
  if (introVideoVisual.dataset.step !== step.id) {
    introVideoVisual.dataset.step = step.id;
    introVideoVisual.innerHTML = step.visual;
  }
  introVideoProgress.style.width = `${Math.round(progress * 100)}%`;
  introVideoProgressTrack.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  introVideoPlayButton.textContent = introVideoPlaying
    ? 'Pause'
    : introVideoFinished
      ? 'Erneut ansehen'
      : introVideoStepElapsedMs > 0
        ? 'Fortsetzen'
        : 'Einf\u00fchrung starten';
  introVideoPreviousButton.disabled = introVideoStepIndex === 0;
  introVideoNextButton.disabled = introVideoStepIndex === introVideoSteps.length - 1;

  if (!introVideoSpeechSupported) {
    introVideoMuteButton.textContent = 'Stimme nicht verf\u00fcgbar';
    introVideoMuteButton.disabled = true;
    introVideoVoiceStatus.textContent = 'Mit Text zum Mitlesen';
  } else {
    const voiceName = introVideoPreferredVoice?.name.toLowerCase() || '';
    introVideoMuteButton.textContent = introVideoSpeechEnabled ? 'Stimme ausschalten' : 'Stimme einschalten';
    introVideoMuteButton.setAttribute('aria-pressed', String(introVideoSpeechEnabled));
    introVideoVoiceStatus.textContent = introVideoSpeechEnabled
      ? (/natural|online/.test(voiceName) ? 'Nat\u00fcrliche deutsche Stimme' : 'Mit deutscher Stimme')
      : 'Ohne Sprachausgabe';
  }
}

function startIntroVideoTimer() {
  clearIntroVideoTimer();
  introVideoLastTick = Date.now();
  introVideoTimer = window.setInterval(() => {
    const now = Date.now();
    introVideoStepElapsedMs += now - introVideoLastTick;
    introVideoLastTick = now;

    const step = introVideoSteps[introVideoStepIndex];
    const speechControlsChapter = introVideoSpeechSupported
      && introVideoSpeechEnabled
      && Boolean(introVideoUtterance);
    if (!speechControlsChapter && introVideoStepElapsedMs >= introVideoStepDuration(step)) {
      advanceIntroVideoStep();
      return;
    }
    renderIntroVideo();
  }, 200);
}

function speakIntroVideoStep(step) {
  if (!introVideoSpeechSupported || !introVideoSpeechEnabled) {
    return;
  }

  cancelIntroVideoSpeech();
  const speechRun = introVideoSpeechRun;
  const utterance = new SpeechSynthesisUtterance(step.speech);
  introVideoUtterance = utterance;
  if (introVideoPreferredVoice) {
    utterance.voice = introVideoPreferredVoice;
    utterance.lang = introVideoPreferredVoice.lang;
  } else {
    utterance.lang = 'de-DE';
  }
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onend = () => {
    if (speechRun !== introVideoSpeechRun || !introVideoPlaying) {
      return;
    }
    introVideoUtterance = null;
    introVideoSpeechPaused = false;
    introVideoStepElapsedMs = introVideoStepDuration(step);
    advanceIntroVideoStep(true);
  };
  utterance.onerror = (event) => {
    if (speechRun !== introVideoSpeechRun || ['canceled', 'interrupted'].includes(event.error)) {
      return;
    }
    introVideoUtterance = null;
    introVideoSpeechPaused = false;
    introVideoSpeechEnabled = false;
    introVideoLastTick = Date.now();
    renderIntroVideo();
  };
  window.speechSynthesis.speak(utterance);
}

function startIntroVideoPlayback() {
  recordedIntroVideo.pause();
  introVideoPlaying = true;
  introVideoFinished = false;
  renderIntroVideo();
  if (introVideoSpeechSupported && introVideoSpeechEnabled) {
    if (introVideoSpeechPaused && introVideoUtterance) {
      window.speechSynthesis.resume();
      introVideoSpeechPaused = false;
    } else {
      speakIntroVideoStep(introVideoSteps[introVideoStepIndex]);
    }
  }
  startIntroVideoTimer();
}

function playIntroVideo() {
  if (introVideoPlaying) {
    pauseIntroVideo();
    renderIntroVideo();
    return;
  }

  if (introVideoFinished) {
    introVideoStepIndex = 0;
    introVideoStepElapsedMs = 0;
    introVideoFinished = false;
  }
  startIntroVideoPlayback();
}

function pauseIntroVideo() {
  introVideoPlaying = false;
  clearIntroVideoTimer();
  if (introVideoSpeechSupported && introVideoUtterance) {
    window.speechSynthesis.pause();
    introVideoSpeechPaused = true;
  }
}

function stopIntroVideo() {
  introVideoPlaying = false;
  introVideoStepElapsedMs = 0;
  clearIntroVideoTimer();
  cancelIntroVideoSpeech();
}

function advanceIntroVideoStep(fromSpeech = false) {
  const continuePlaying = introVideoPlaying;
  clearIntroVideoTimer();
  introVideoSpeechRun += 1;
  introVideoSpeechPaused = false;
  introVideoUtterance = null;
  if (!fromSpeech && introVideoSpeechSupported) {
    window.speechSynthesis.cancel();
  }

  if (introVideoStepIndex >= introVideoSteps.length - 1) {
    introVideoStepElapsedMs = introVideoStepDuration(introVideoSteps[introVideoStepIndex]);
    introVideoFinished = true;
    introVideoPlaying = false;
    renderIntroVideo();
    return;
  }

  introVideoStepIndex += 1;
  introVideoStepElapsedMs = 0;
  renderIntroVideo();
  if (continuePlaying) {
    startIntroVideoPlayback();
  }
}

function moveIntroVideoStep(direction) {
  const continuePlaying = introVideoPlaying;
  stopIntroVideo();
  introVideoStepIndex = Math.min(
    introVideoSteps.length - 1,
    Math.max(0, introVideoStepIndex + direction)
  );
  introVideoStepElapsedMs = 0;
  introVideoFinished = false;
  renderIntroVideo();
  if (continuePlaying) {
    startIntroVideoPlayback();
  }
}

function toggleIntroVideoSpeech() {
  if (!introVideoSpeechSupported) {
    return;
  }

  introVideoSpeechEnabled = !introVideoSpeechEnabled;
  cancelIntroVideoSpeech();
  if (introVideoPlaying) {
    introVideoStepElapsedMs = 0;
    introVideoLastTick = Date.now();
    if (introVideoSpeechEnabled) {
      speakIntroVideoStep(introVideoSteps[introVideoStepIndex]);
    }
  }
  renderIntroVideo();
}

function checkIntroQuiz(event) {
  event.preventDefault();
  const questions = [...introQuizForm.querySelectorAll('fieldset[data-answer]')];
  let answered = 0;
  let correct = 0;

  for (const question of questions) {
    const selected = question.querySelector('input:checked');
    question.classList.remove('is-correct', 'needs-review', 'is-unanswered');
    if (!selected) {
      question.classList.add('is-unanswered');
      continue;
    }
    answered += 1;
    if (selected.value === question.dataset.answer) {
      correct += 1;
      question.classList.add('is-correct');
    } else {
      question.classList.add('needs-review');
    }
  }

  if (answered < questions.length) {
    introQuizResult.textContent = 'W\u00e4hle bitte bei jeder Frage eine Antwort. Danach schauen wir sie gemeinsam an.';
    return;
  }
  if (correct === questions.length) {
    introQuizResult.textContent = 'Passt. Die wichtigsten Punkte sitzen, und du kannst direkt loslegen.';
    return;
  }
  introQuizResult.textContent = `${correct} von ${questions.length} Antworten passen schon. Die orange markierten Fragen kannst du oben noch einmal nachlesen. Du kannst die App nat\u00fcrlich trotzdem nutzen.`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  if (response.status === 401) {
    window.location.href = '/login.html';
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Anfrage fehlgeschlagen');
  }
  return data;
}

async function init() {
  bookingDate.value = todayString();
  calendarStartDate = startOfWeek(bookingDate.value);
  const me = await api('/api/me');
  if (!me || !me.user) {
    window.location.href = '/login.html';
    return;
  }

  currentUser = me.user;
  availableHouses = me.houses || [];
  renderHouseContext();
  notificationEmail.value = currentUser.email || '';
  notifyReleasesInput.checked = currentUser.notifyReleases !== false;
  notificationResourceType.value = me.notificationPreferences?.resourceType || 'all';
  notificationWeekday.value = String(me.notificationPreferences?.weekday || '');
  notificationSlot.value = me.notificationPreferences?.slot || '';
  renderEmailVerificationStatus();

  const [resourceData, slotData] = await Promise.all([
    api('/api/resources'),
    api('/api/slots')
  ]);
  resources = resourceData.resources;
  slots = slotData.slots;

  if (currentUser.role === 'admin') {
    viewSwitcher.hidden = false;
    await loadAdmin();
  }

  await refreshAll();
  const pageUrl = new URL(window.location.href);
  if (pageUrl.searchParams.get('welcome') === '1') {
    openIntro();
    window.history.replaceState({}, '', '/index.html');
  }
}

function setAppView(view) {
  const adminView = view === 'admin' && currentUser?.role === 'admin';
  document.body.classList.toggle('admin-view', adminView);
  bookingViewButton.classList.toggle('active', !adminView);
  adminViewButton.classList.toggle('active', adminView);
  if (adminView) setAdminSection(activeAdminSection);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setAdminSection(sectionName) {
  if (!adminSections.some((section) => section.dataset.adminSection === sectionName)) return;
  activeAdminSection = sectionName;
  for (const button of adminSectionButtons) {
    const active = button.dataset.adminTarget === sectionName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  for (const section of adminSections) {
    section.hidden = section.dataset.adminSection !== sectionName;
  }
}

function renderEmailVerificationStatus() {
  const configuredAddress = Boolean(currentUser.email);
  emailVerificationStatus.textContent = !configuredAddress
    ? 'Noch keine E-Mail-Adresse hinterlegt.'
    : currentUser.emailVerified
      ? 'E-Mail-Adresse best\u00e4tigt.'
      : 'Bitte E-Mail-Adresse best\u00e4tigen. Bis dahin werden keine Hinweise gesendet.';
  emailVerificationStatus.classList.toggle('is-verified', Boolean(currentUser.emailVerified));
  resendVerificationButton.hidden = !configuredAddress || Boolean(currentUser.emailVerified);
}

function renderHouseContext() {
  const roleLabel = currentUser.isSuperadmin
    ? 'Superadmin'
    : currentUser.role === 'admin'
      ? 'Haus-Admin'
      : 'Bewohner';
  userLine.textContent = `${currentUser.username} - ${roleLabel} - ${currentUser.houseName}`;
  brandHouseName.textContent = currentUser.houseName;
  introHouseName.textContent = `Waschraum ${currentUser.houseName}`;
  adminTitle.textContent = `Verwaltung ${currentUser.houseName}`;

  houseSwitcher.hidden = !currentUser.isSuperadmin;
  if (currentUser.isSuperadmin) {
    houseSelect.innerHTML = availableHouses.map((house) => (
      `<option value="${house.id}">${escapeHtml(house.name)}</option>`
    )).join('');
    houseSelect.value = String(currentUser.activeHouseId);
  }
}

async function switchHouse(houseId) {
  try {
    const data = await api('/api/me/active-house', {
      method: 'PUT',
      body: JSON.stringify({ houseId: Number(houseId) })
    });
    currentUser = data.user;
    renderHouseContext();
    const resourceData = await api('/api/resources');
    resources = resourceData.resources;
    await Promise.all([refreshAll(), loadAdmin()]);
    showStatus(data.message);
  } catch (error) {
    houseSelect.value = String(currentUser.activeHouseId);
    showStatus(error.message, 'error');
  }
}

async function refreshAll() {
  await Promise.all([
    loadBookings(),
    loadMyBookings(),
    loadReleaseNotices(),
    loadCalendar(),
    loadRecommendation()
  ]);
}

async function loadBookings() {
  const data = await api(`/api/bookings?date=${encodeURIComponent(bookingDate.value)}`);
  bookings = data.bookings;
  renderSchedule();
}

async function loadMyBookings() {
  const data = await api('/api/my-bookings');
  renderMyBookings(data.bookings);
}

async function loadReleaseNotices() {
  const data = await api('/api/release-notices');
  renderReleaseNotices(data.notices);
}

async function loadCalendar() {
  const data = await api(`/api/calendar?from=${encodeURIComponent(calendarStartDate)}&days=7`);
  calendarDays = data.days;
  renderCalendar();
}

async function loadRecommendation() {
  const data = await api('/api/recommendation');
  currentRecommendation = data.recommendation;
  renderRecommendation();
}

function availabilityForDay(day) {
  if (activeType !== 'all') {
    return day.availability[activeType] || { free: 0, total: 0, freeSlots: 0, totalSlots: 0 };
  }
  return Object.values(day.availability).reduce((summary, item) => ({
    free: summary.free + item.free,
    total: summary.total + item.total,
    freeSlots: summary.freeSlots + item.freeSlots,
    totalSlots: summary.totalSlots + item.totalSlots
  }), { free: 0, total: 0, freeSlots: 0, totalSlots: 0 });
}

function renderCalendar() {
  weekCalendar.innerHTML = '';
  if (!calendarDays.length) {
    calendarRange.textContent = '';
    return;
  }

  calendarRange.textContent = formatCalendarRange(
    calendarDays[0].date,
    calendarDays[calendarDays.length - 1].date
  );
  previousWeekButton.disabled = calendarStartDate <= startOfWeek(todayString());

  for (const day of calendarDays) {
    const availability = availabilityForDay(day);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.classList.toggle('is-selected', day.date === bookingDate.value);
    button.classList.toggle('is-today', day.date === todayString());
    button.classList.toggle('has-own-booking', day.ownBookings > 0);
    button.disabled = day.date < todayString();
    button.setAttribute('aria-pressed', String(day.date === bookingDate.value));
    button.setAttribute(
      'aria-label',
      `${formatShortDate(day.date)}, ${availability.freeSlots} freie Zeitfenster${day.ownBookings ? `, ${day.ownBookings} eigene Buchungen` : ''}`
    );
    const availabilityLabel = activeType === 'all'
      ? `${availability.freeSlots} Optionen frei`
      : `${availability.freeSlots} ${availability.freeSlots === 1 ? 'Slot' : 'Slots'} frei`;
    button.innerHTML = `
      <span class="calendar-weekday">${new Intl.DateTimeFormat('de-CH', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</span>
      <strong>${new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</strong>
      <span class="calendar-availability">${availability.totalSlots ? availabilityLabel : 'vorbei'}</span>
      ${day.ownBookings ? `<span class="calendar-own">${day.ownBookings} eigene</span>` : ''}
    `;
    button.addEventListener('click', () => selectBookingDate(day.date));
    weekCalendar.append(button);
  }
}

function packageComponentDetail(component, recommendation, bookings = component.bookings || []) {
  const componentBookings = bookings;
  if (component.existing) {
    return `${component.resourceName} - ${formatShortDate(recommendation.date)} - ${recommendation.slot} - bereits gebucht`;
  }
  const firstBooking = componentBookings[0];
  if (!firstBooking) {
    return component.resourceName;
  }
  if (component.type !== 'drying_room' || componentBookings.length === 1) {
    return `${component.resourceName} - ${formatShortDate(firstBooking.date)} - ${firstBooking.slot}`;
  }
  const lastBooking = componentBookings[componentBookings.length - 1];
  const endTime = lastBooking.slot.split('-')[1];
  const endLabel = lastBooking.date === firstBooking.date
    ? endTime
    : `${formatShortDate(lastBooking.date)}, ${endTime}`;
  return `${component.resourceName} - ab ${firstBooking.slot.split('-')[0]} bis ${endLabel}`;
}

function renderRecommendation() {
  bookingSuggestion.innerHTML = '';
  const recommendation = currentRecommendation;
  if (!recommendation) {
    bookingSuggestion.innerHTML = '<p class="muted">Noch kein pers\u00f6nlicher Vorschlag verf\u00fcgbar.</p>';
    return;
  }

  const copy = document.createElement('div');
  copy.className = 'suggestion-copy';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'suggestion-label';
  eyebrow.textContent = 'Pers\u00f6nlicher Vorschlag';
  const title = document.createElement('h3');
  title.textContent = recommendation.title;
  const detail = document.createElement('p');
  detail.className = 'suggestion-detail';
  detail.textContent = recommendation.resourceName
    ? `${recommendation.resourceName} - ${formatShortDate(recommendation.date)} - ${recommendation.slot}`
    : recommendation.date
      ? `${formatShortDate(recommendation.date)} - ${recommendation.slot}`
      : '';
  const reason = document.createElement('p');
  reason.className = 'muted';
  reason.textContent = recommendation.reason;
  copy.append(eyebrow, title);
  if (detail.textContent) {
    copy.append(detail);
  }
  copy.append(reason);

  const packageSelections = new Map();
  let washerCountSelect = null;
  if (recommendation.kind === 'package') {
    const packageOptions = document.createElement('div');
    packageOptions.className = 'package-options';
    const washerComponents = (recommendation.components || [])
      .filter((component) => component.type === 'washer');
    if (washerComponents.length) {
      const washerControl = document.createElement('label');
      washerControl.className = 'package-washer-control';
      const washerCopy = document.createElement('span');
      const washerTitle = document.createElement('strong');
      washerTitle.textContent = 'Waschmaschinen';
      const washerDetail = document.createElement('small');
      washerDetail.textContent = washerComponents.some((component) => component.existing)
        ? `${washerComponents[0].resourceName} ist bereits gebucht`
        : `${washerComponents.length} im vorgeschlagenen Slot frei`;
      washerCopy.append(washerTitle, washerDetail);
      washerCountSelect = document.createElement('select');
      washerCountSelect.setAttribute('aria-label', 'Anzahl Waschmaschinen waehlen');
      for (let count = 1; count <= washerComponents.length; count += 1) {
        const countOption = document.createElement('option');
        countOption.value = String(count);
        countOption.textContent = `${count} ${count === 1 ? 'Maschine' : 'Maschinen'}`;
        washerCountSelect.append(countOption);
      }
      washerCountSelect.disabled = washerComponents.length === 1;
      washerControl.append(washerCopy, washerCountSelect);
      packageOptions.append(washerControl);
    }
    for (const component of recommendation.components || []) {
      const option = document.createElement(component.required ? 'div' : 'label');
      option.className = `package-option${component.required ? ' is-required' : ''}${component.type === 'washer' ? ' is-washer-detail' : ''}`;

      if (component.required) {
        const status = document.createElement('span');
        status.className = 'package-option-status';
        status.textContent = component.existing ? 'Gebucht' : 'Dabei';
        option.append(status);
      } else {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = component.selectedByDefault !== false;
        input.setAttribute('aria-label', `${typeLabel(component.type)} in das Waschpaket aufnehmen`);
        packageSelections.set(component.id, { checkbox: input, select: null });
        option.append(input);
      }

      const optionCopy = document.createElement('span');
      const optionTitle = document.createElement('strong');
      optionTitle.textContent = typeLabel(component.type);
      const optionDetail = document.createElement('small');
      optionDetail.textContent = packageComponentDetail(component, recommendation);
      optionCopy.append(optionTitle, optionDetail);
      if (component.type === 'drying_room' && component.bookingOptions?.length > 1) {
        const durationLabel = document.createElement('span');
        durationLabel.className = 'package-duration-label';
        durationLabel.textContent = 'Trocknungsdauer';
        const durationSelect = document.createElement('select');
        durationSelect.setAttribute('aria-label', 'Trocknungsdauer w\u00e4hlen');
        for (const duration of component.bookingOptions) {
          const durationOption = document.createElement('option');
          durationOption.value = duration.id;
          durationOption.textContent = duration.label;
          durationOption.selected = duration.id === component.selectedOption;
          durationSelect.append(durationOption);
        }
        durationSelect.addEventListener('change', () => {
          const duration = component.bookingOptions.find((item) => item.id === durationSelect.value);
          optionDetail.textContent = packageComponentDetail(component, recommendation, duration?.bookings || component.bookings);
        });
        optionCopy.append(durationLabel, durationSelect);
        const selection = packageSelections.get(component.id);
        if (selection) {
          selection.select = durationSelect;
        }
      }
      option.append(optionCopy);
      if (!component.required) {
        const optionBadge = document.createElement('span');
        optionBadge.className = `package-option-badge${component.selectedByDefault ? ' is-recommended' : ''}`;
        optionBadge.textContent = component.recommendationLabel
          || (component.selectedByDefault ? 'Empfohlen' : 'Optional');
        option.append(optionBadge);
      }
      packageOptions.append(option);
    }
    if (washerCountSelect) {
      const syncWasherSelection = () => {
        const selectedCount = Number(washerCountSelect.value);
        washerComponents.forEach((component, index) => {
          const selection = packageSelections.get(component.id);
          if (selection?.checkbox) {
            selection.checkbox.checked = index < selectedCount;
          }
        });
      };
      washerCountSelect.addEventListener('change', syncWasherSelection);
      syncWasherSelection();
    }
    copy.append(packageOptions);
  }
  bookingSuggestion.append(copy);

  const actions = document.createElement('div');
  actions.className = 'suggestion-actions';
  if (recommendation.kind === 'package') {
    const packageButton = document.createElement('button');
    packageButton.type = 'button';
    packageButton.textContent = recommendation.actionLabel || 'Waschpaket buchen';
    packageButton.addEventListener('click', () => {
      const selectedComponents = (recommendation.components || []).filter((component) => (
        component.required || packageSelections.get(component.id)?.checkbox.checked
      ));
      const items = selectedComponents.flatMap((component) => {
        const selectedDuration = packageSelections.get(component.id)?.select?.value;
        const duration = component.bookingOptions?.find((item) => item.id === selectedDuration);
        return duration?.bookings || component.bookings || [];
      });
      createBookingPackage(items, recommendation);
    });
    actions.append(packageButton);
  } else if (recommendation.kind === 'booking') {
    const bookButton = document.createElement('button');
    bookButton.type = 'button';
    bookButton.textContent = recommendation.actionLabel || 'Direkt buchen';
    bookButton.addEventListener('click', () => createBooking(
      recommendation.resourceId,
      recommendation.slot,
      recommendation.date,
      recommendation.resourceType
    ));
    actions.append(bookButton);
  }
  if (recommendation.date) {
    const showButton = document.createElement('button');
    showButton.type = 'button';
    showButton.className = 'secondary';
    showButton.textContent = 'Im Kalender zeigen';
    showButton.addEventListener('click', () => selectBookingDate(
      recommendation.date,
      recommendation.resourceType
    ));
    actions.append(showButton);
  }
  if (actions.childElementCount) {
    bookingSuggestion.append(actions);
  }
}

function setActiveType(type) {
  activeType = type;
  filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.type === type));
  renderSchedule();
  renderCalendar();
}

async function selectBookingDate(date, type = '') {
  bookingDate.value = date;
  const selectedWeek = startOfWeek(date);
  if (selectedWeek !== calendarStartDate) {
    calendarStartDate = selectedWeek;
    await Promise.all([loadBookings(), loadCalendar()]);
  } else {
    await loadBookings();
    renderCalendar();
  }
  if (type) {
    setActiveType(type);
  }
  document.querySelector('.booking-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSchedule() {
  const visibleResources = resources.filter((resource) => activeType === 'all' || resource.type === activeType);
  schedule.innerHTML = '';

  for (const slot of slots) {
    const slotGroup = document.createElement('section');
    slotGroup.className = 'slot-group';
    slotGroup.innerHTML = `<h3>${slot}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'resource-grid';

    for (const resource of visibleResources) {
      const booking = bookings.find((item) => item.slot === slot && item.resource_id === resource.id);
      const slotIsPast = isPastSlot(bookingDate.value, slot);
      const card = document.createElement('article');
      card.className = `booking-card ${booking ? 'is-booked' : ''} ${booking?.is_fixed ? 'is-fixed' : ''} ${slotIsPast ? 'is-disabled' : ''}`;

      const owner = booking ? booking.username : slotIsPast ? 'vorbei' : 'frei';
      const canDelete = booking && !booking.is_fixed && (currentUser.role === 'admin' || booking.user_id === currentUser.id);
      card.innerHTML = `
        <div>
          <strong>${escapeHtml(resource.name)}</strong>
          <span>${escapeHtml(typeLabel(resource.type))}</span>
        </div>
        <p>${booking?.is_fixed ? `Fest: ${escapeHtml(owner)}` : escapeHtml(owner)}</p>
      `;

      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = booking?.is_fixed ? 'Gesch\u00fctzt' : booking ? 'L\u00f6schen' : 'Buchen';
      action.disabled = Boolean(slotIsPast || booking?.is_fixed || (booking && !canDelete));
      action.addEventListener('click', () => booking ? deleteBooking(booking.id) : createBooking(resource.id, slot));
      card.append(action);
      grid.append(card);
    }

    slotGroup.append(grid);
    schedule.append(slotGroup);
  }
}

function renderMyBookings(items) {
  myBookings.innerHTML = '';
  if (!items.length) {
    myBookings.innerHTML = '<p class="muted">Du hast aktuell keine kommenden Buchungen.</p>';
    return;
  }

  const groups = new Map();
  for (const booking of items) {
    const key = booking.group_id ? `group-${booking.group_id}` : `booking-${booking.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(booking);
  }

  for (const group of groups.values()) {
    const isPackage = Boolean(group[0].group_id);
    const primary = group.find((booking) => booking.resource_type === 'washer') || group[0];
    const item = document.createElement('article');
    item.className = `booking-list-item${isPackage ? ' booking-package-item' : ''}`;
    const status = dateStatus(primary.booking_date);
    item.innerHTML = `
      <div>
        <strong>${isPackage ? 'Waschpaket' : escapeHtml(primary.resource_name)}</strong>
        <span>${escapeHtml(primary.booking_date)} - ${escapeHtml(primary.slot)}</span>
      </div>
      <span class="status-chip">${escapeHtml(status)}</span>
    `;

    const bookingLines = document.createElement('div');
    bookingLines.className = 'package-booking-lines';
    for (const booking of group) {
      const line = document.createElement('div');
      line.className = 'package-booking-line';
      line.innerHTML = `<span><strong>${escapeHtml(booking.resource_name)}</strong><small>${escapeHtml(booking.booking_date)} - ${escapeHtml(booking.slot)}</small></span>`;
      const lineActions = document.createElement('div');
      lineActions.className = 'inline-actions compact-actions';
      if (booking.releaseEligible) {
        const releaseButton = document.createElement('button');
        releaseButton.type = 'button';
        releaseButton.className = 'secondary';
        releaseButton.textContent = 'Fr\u00fcher frei';
        releaseButton.addEventListener('click', () => releaseBooking(booking.id));
        lineActions.append(releaseButton);
      }
      if (booking.cancellationNoticeEligible && !isPackage) {
        const notifyButton = document.createElement('button');
        notifyButton.type = 'button';
        notifyButton.className = 'secondary';
        notifyButton.textContent = 'Absagen & informieren';
        notifyButton.addEventListener('click', () => cancelBookingAndNotify(booking.id));
        lineActions.append(notifyButton);
      }
      line.append(lineActions);
      bookingLines.append(line);
    }
    item.append(bookingLines);

    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    if (isPackage && primary.cancellationNoticeEligible) {
      const notifyButton = document.createElement('button');
      notifyButton.type = 'button';
      notifyButton.className = 'secondary';
      notifyButton.textContent = 'Paket absagen & informieren';
      notifyButton.addEventListener('click', () => cancelBookingGroupAndNotify(primary.group_id));
      actions.append(notifyButton);
    }
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary danger';
    deleteButton.textContent = isPackage ? 'Ganzes Paket l\u00f6schen' : 'L\u00f6schen';
    deleteButton.addEventListener('click', () => (
      isPackage ? deleteBookingGroup(primary.group_id) : deleteBooking(primary.id)
    ));
    actions.append(deleteButton);
    item.append(actions);
    myBookings.append(item);
  }
}

function renderReleaseNotices(items) {
  releaseNotices.innerHTML = '';
  if (!items.length) {
    releaseNotices.innerHTML = '<p class="muted">Keine aktuellen Freigaben.</p>';
    return;
  }

  for (const notice of items) {
    const item = document.createElement('article');
    item.className = 'release-item';
    item.innerHTML = `
      <strong>${escapeHtml(notice.resource_name)}</strong>
      <span>${escapeHtml(notice.message)}</span>
    `;
    releaseNotices.append(item);
  }
}

async function createBooking(resourceId, slot, date = bookingDate.value, type = '') {
  try {
    const data = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ resourceId, date, slot })
    });
    bookingDate.value = date;
    calendarStartDate = startOfWeek(date);
    if (type) {
      activeType = type;
      filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.type === type));
    }
    showStatus(data.message || 'Buchung gespeichert.');
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function createBookingPackage(items, recommendation) {
  try {
    const data = await api('/api/booking-package', {
      method: 'POST',
      body: JSON.stringify({
        washerBookingId: recommendation.washerBookingId || null,
        items
      })
    });
    bookingDate.value = recommendation.date;
    calendarStartDate = startOfWeek(recommendation.date);
    activeType = 'washer';
    filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.type === 'washer'));
    showStatus(data.message || 'Waschpaket gespeichert.');
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function deleteBooking(id) {
  if (!window.confirm('Diese Buchung wirklich l\u00f6schen?')) {
    return;
  }
  try {
    const data = await api(`/api/bookings/${id}`, { method: 'DELETE' });
    showStatus(data.message || 'Buchung gel\u00f6scht.');
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function releaseBooking(id) {
  try {
    const data = await api(`/api/bookings/${id}/release`, { method: 'POST' });
    const emailText = !data.releaseNoticeCreated
      ? ''
      : data.emailNotifications?.configured
        ? ` E-Mail-Hinweise: ${data.emailNotifications.sent}.`
        : ' E-Mail-Versand ist noch nicht konfiguriert.';
    showStatus(`${data.message || 'Slot wurde freigegeben.'}${emailText}`);
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function saveNotifications() {
  try {
    const data = await api('/api/me/notifications', {
      method: 'PUT',
      body: JSON.stringify({
        email: notificationEmail.value,
        notifyReleases: notifyReleasesInput.checked,
        resourceType: notificationResourceType.value,
        weekday: notificationWeekday.value,
        slot: notificationSlot.value
      })
    });
    currentUser = data.user;
    renderEmailVerificationStatus();
    showStatus(data.message || 'Benachrichtigungen gespeichert.');
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function resendEmailVerification() {
  try {
    const data = await api('/api/email-verification/resend', { method: 'POST' });
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function deleteBookingGroup(groupId) {
  if (!window.confirm('Das gesamte Waschpaket mit allen Bestandteilen l\u00f6schen?')) {
    return;
  }
  try {
    const data = await api(`/api/booking-groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' });
    showStatus(data.message || 'Waschpaket gel\u00f6scht.');
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function cancelBookingGroupAndNotify(groupId) {
  if (!window.confirm('Das ganze Waschpaket absagen und den Waschslot wieder anbieten?')) return;
  try {
    const data = await api(`/api/booking-groups/${encodeURIComponent(groupId)}/cancel-notify`, { method: 'POST' });
    const emailText = data.emailNotifications?.configured
      ? ` E-Mail-Hinweise: ${data.emailNotifications.sent}.`
      : ' E-Mail-Versand ist noch nicht konfiguriert.';
    showStatus(`${data.message}${emailText}`);
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function cancelBookingAndNotify(id) {
  const confirmed = window.confirm(
    'Termin absagen und alle Personen mit aktivierten Freigabe-Hinweisen informieren?'
  );
  if (!confirmed) return;

  try {
    const data = await api(`/api/bookings/${id}/cancel-notify`, { method: 'POST' });
    const emailText = data.emailNotifications?.configured
      ? ` E-Mail-Hinweise: ${data.emailNotifications.sent}.`
      : ' E-Mail-Versand ist noch nicht konfiguriert.';
    showStatus(`${data.message}${emailText}`);
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function changePassword() {
  if (newPasswordInput.value !== newPasswordConfirmation.value) {
    showStatus('Die beiden neuen Passw\u00f6rter stimmen nicht \u00fcberein.', 'error');
    newPasswordConfirmation.focus();
    return;
  }

  try {
    const data = await api('/api/me/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: currentPasswordInput.value,
        newPassword: newPasswordInput.value
      })
    });
    passwordForm.reset();
    showStatus(data.message || 'Dein Passwort wurde ge\u00e4ndert.');
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function deleteOwnAccount() {
  if (!window.confirm('Konto und alle eigenen Buchungen endg\u00fcltig l\u00f6schen?')) return;
  try {
    const data = await api('/api/me', {
      method: 'DELETE',
      body: JSON.stringify({ password: deleteAccountPassword.value })
    });
    window.alert(data.message);
    window.location.href = '/login.html';
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function loadAdmin() {
  const [usersData, overviewData, settingsData, fixedData, housesData, adminResources, auditData] = await Promise.all([
    api('/api/admin/users'),
    api('/api/admin/overview'),
    api('/api/admin/settings'),
    api('/api/admin/fixed-bookings'),
    currentUser.isSuperadmin ? api('/api/admin/houses') : Promise.resolve({ houses: [] }),
    api('/api/admin/resources'),
    api('/api/admin/audit-log')
  ]);
  adminBox.hidden = false;
  adminTitle.textContent = `Verwaltung ${settingsData.houseName}`;
  adminRoleLabel.textContent = currentUser.isSuperadmin ? 'Superadmin' : 'Haus-Admin';
  adminScopeText.textContent = currentUser.isSuperadmin
    ? 'Haus\u00fcbergreifende Verwaltung. Aktionen beziehen sich auf das oben ausgew\u00e4hlte Haus.'
    : 'Verwaltung der Personen, Ger\u00e4te und Dauertermine dieses Hauses.';
  houseCodeInput.value = settingsData.houseCode;
  backupOperation.hidden = !currentUser.isSuperadmin;
  superadminBox.hidden = !currentUser.isSuperadmin;
  if (currentUser.isSuperadmin) {
    availableHouses = housesData.houses.filter((house) => house.active);
    renderHouseContext();
    renderHouses(housesData.houses);
  }
  populateFixedBookingControls();
  renderFixedBookings(fixedData.fixedBookings);
  renderAdminResources(adminResources.resources);
  renderAuditLog(auditData.entries);
  adminOverview.innerHTML = `
    <div><strong>${overviewData.users}</strong><span>aktive Nutzer</span></div>
    <div><strong>${overviewData.todayBookings}</strong><span>Buchungen heute</span></div>
    <div><strong>${overviewData.activeResources}</strong><span>aktive Ressourcen</span></div>
    <div><strong>${overviewData.fixedBookings}</strong><span>feste Buchungen</span></div>
    <div><strong>${overviewData.recentReleases}</strong><span>Freigaben 7 Tage</span></div>
    <div class="wide"><strong>E-Mail</strong><span>${overviewData.email.label}</span></div>
    <div class="wide"><strong>Backup</strong><span>${overviewData.backup?.ok ? `gepr\u00fcft am ${new Date(overviewData.backup.createdAt).toLocaleString('de-CH')}${overviewData.backup.uploaded ? ' - extern kopiert' : ''}` : overviewData.backup?.error || 'noch nicht automatisch erstellt'}</span></div>
  `;
  adminEmailTestButton.disabled = !overviewData.email.configured;
  adminEmailTestButton.title = overviewData.email.configured
    ? 'Testmail an deine hinterlegte Adresse senden'
    : 'Zuerst SMTP in Render konfigurieren';
  renderAdminUsers(usersData.users);
  setAdminSection(activeAdminSection);
}

async function sendAdminTestEmail() {
  try {
    const data = await api('/api/admin/email-test', { method: 'POST' });
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function runBackupNow() {
  runBackupButton.disabled = true;
  try {
    const data = await api('/api/admin/backup/run', { method: 'POST' });
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    runBackupButton.disabled = false;
  }
}

function renderAdminUsers(users) {
  userList.innerHTML = '';

  for (const user of users) {
    const item = document.createElement('article');
    item.className = 'user-admin-item';

    const identity = document.createElement('div');
    identity.className = 'user-admin-identity';
    const name = document.createElement('strong');
    name.textContent = user.username;
    const meta = document.createElement('span');
    const roleName = user.is_superadmin ? 'Superadmin' : user.role === 'admin' ? 'Haus-Admin' : 'Bewohner';
    meta.textContent = `${roleName} \u00b7 ${user.active ? 'aktiv' : 'inaktiv'}${user.email ? ` \u00b7 ${user.email}` : ''}`;
    identity.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'user-admin-actions';
    const isSelf = Number(user.id) === Number(currentUser.id);
    const canManageAccount = !isSelf
      && !Boolean(user.is_superadmin)
      && (currentUser.isSuperadmin || user.role === 'user');

    if (canManageAccount) {
      const statusButton = document.createElement('button');
      statusButton.type = 'button';
      statusButton.className = user.active ? 'secondary danger' : 'secondary';
      statusButton.textContent = user.active ? 'Deaktivieren' : 'Aktivieren';
      statusButton.title = `${user.username} ${statusButton.textContent.toLowerCase()}`;
      statusButton.addEventListener('click', () => updateUserStatus(user.id, !Boolean(user.active)));
      actions.append(statusButton);
    }

    if (currentUser.isSuperadmin && !user.is_superadmin) {
      const roleButton = document.createElement('button');
      roleButton.type = 'button';
      roleButton.className = 'secondary';
      roleButton.textContent = user.role === 'admin' ? 'Zu Bewohner' : 'Zu Haus-Admin';
      roleButton.addEventListener('click', () => updateUserRole(
        user.id,
        user.role === 'admin' ? 'user' : 'admin'
      ));
      actions.append(roleButton);

      const otherHouses = availableHouses.filter((house) => Number(house.id) !== Number(user.house_id));
      if (otherHouses.length) {
        const moveWrap = document.createElement('div');
        moveWrap.className = 'user-move-control';
        const moveSelect = document.createElement('select');
        moveSelect.setAttribute('aria-label', `${user.username} in anderes Haus verschieben`);
        moveSelect.innerHTML = otherHouses.map((house) => (
          `<option value="${house.id}">${escapeHtml(house.name)}</option>`
        )).join('');
        const moveButton = document.createElement('button');
        moveButton.type = 'button';
        moveButton.className = 'secondary';
        moveButton.textContent = 'Verschieben';
        moveButton.addEventListener('click', () => moveUserToHouse(user.id, moveSelect.value));
        moveWrap.append(moveSelect, moveButton);
        actions.append(moveWrap);
      }
    }

    if (canManageAccount) {
      const resetForm = document.createElement('form');
      resetForm.className = 'user-password-reset';
      const password = document.createElement('input');
      password.type = 'password';
      password.autocomplete = 'new-password';
      password.minLength = 8;
      password.maxLength = 128;
      password.placeholder = 'Neues Passwort';
      password.setAttribute('aria-label', `Neues Passwort f\u00fcr ${user.username}`);
      password.required = true;
      const resetButton = document.createElement('button');
      resetButton.type = 'submit';
      resetButton.className = 'secondary';
      resetButton.textContent = 'Neu setzen';
      resetForm.append(password, resetButton);
      resetForm.addEventListener('submit', (event) => {
        event.preventDefault();
        resetUserPassword(user.id, password.value, resetForm);
      });
      actions.append(resetForm);
    }

    if (!actions.childElementCount) {
      const note = document.createElement('span');
      note.className = 'muted admin-account-note';
      note.textContent = isSelf
        ? 'Eigenes Konto unter Buchen verwalten.'
        : 'Dieses Admin-Konto verwaltet der Superadmin.';
      actions.append(note);
    }
    item.append(identity, actions);
    userList.append(item);
  }
}

async function moveUserToHouse(userId, houseId) {
  if (!window.confirm('Konto in das gew\u00e4hlte Haus verschieben? Kommende Buchungen m\u00fcssen vorher gel\u00f6scht sein.')) return;
  try {
    const data = await api(`/api/admin/users/${userId}/house`, {
      method: 'PUT',
      body: JSON.stringify({ houseId: Number(houseId) })
    });
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function renderHouses(houses) {
  houseList.innerHTML = '';
  for (const house of houses) {
    const item = document.createElement('article');
    item.className = 'house-admin-item';
    const copy = document.createElement('div');
    const nameForm = document.createElement('form');
    nameForm.className = 'house-name-form';
    const name = document.createElement('input');
    name.value = house.name;
    name.maxLength = 80;
    name.setAttribute('aria-label', `Name von ${house.name}`);
    const saveName = document.createElement('button');
    saveName.type = 'submit';
    saveName.className = 'secondary';
    saveName.textContent = 'Speichern';
    nameForm.append(name, saveName);
    nameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      updateHouse(house.id, { name: name.value });
    });
    const meta = document.createElement('span');
    meta.textContent = `${house.users} Personen - ${house.resources} Ger\u00e4te - ${house.active ? 'aktiv' : 'inaktiv'}`;
    copy.append(nameForm, meta);
    const actions = document.createElement('div');
    actions.className = 'house-admin-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = Number(house.id) === Number(currentUser.activeHouseId) ? 'Aktiv' : 'Anzeigen';
    button.disabled = !house.active || Number(house.id) === Number(currentUser.activeHouseId);
    button.addEventListener('click', () => switchHouse(house.id));
    const activeButton = document.createElement('button');
    activeButton.type = 'button';
    activeButton.className = house.active ? 'secondary danger' : 'secondary';
    activeButton.textContent = house.active ? 'Deaktivieren' : 'Aktivieren';
    activeButton.disabled = Number(house.id) === Number(currentUser.activeHouseId);
    activeButton.addEventListener('click', () => updateHouse(house.id, { active: !Boolean(house.active) }));
    actions.append(button, activeButton);
    item.append(copy, actions);
    houseList.append(item);
  }
}

async function updateHouse(houseId, changes) {
  try {
    const data = await api(`/api/admin/houses/${houseId}`, {
      method: 'PUT',
      body: JSON.stringify(changes)
    });
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function renderAdminResources(items) {
  resourceAdminList.innerHTML = '';
  for (const resource of items) {
    const item = document.createElement('article');
    item.className = 'resource-admin-item';
    const form = document.createElement('form');
    form.className = 'resource-name-form';
    const input = document.createElement('input');
    input.value = resource.name;
    input.maxLength = 80;
    input.setAttribute('aria-label', `Name von ${resource.name}`);
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'secondary';
    save.textContent = 'Speichern';
    form.append(input, save);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateResource(resource.id, { name: input.value });
    });
    const meta = document.createElement('span');
    meta.textContent = `${typeLabel(resource.type)} - ${resource.active ? 'aktiv' : 'inaktiv'}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = resource.active ? 'secondary danger' : 'secondary';
    toggle.textContent = resource.active ? 'Deaktivieren' : 'Aktivieren';
    toggle.addEventListener('click', () => updateResource(resource.id, { active: !Boolean(resource.active) }));
    const copy = document.createElement('div');
    copy.append(form, meta);
    item.append(copy, toggle);
    resourceAdminList.append(item);
  }
}

async function updateResource(resourceId, changes) {
  try {
    const data = await api(`/api/admin/resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(changes)
    });
    const resourceData = await api('/api/resources');
    resources = resourceData.resources;
    showStatus(data.message);
    await Promise.all([loadAdmin(), refreshAll()]);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function createResource() {
  try {
    const data = await api('/api/admin/resources', {
      method: 'POST',
      body: JSON.stringify({ name: resourceNameInput.value, type: resourceTypeInput.value })
    });
    resourceForm.reset();
    const resourceData = await api('/api/resources');
    resources = resourceData.resources;
    showStatus(data.message);
    await Promise.all([loadAdmin(), refreshAll()]);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function renderAuditLog(entries) {
  const actionLabels = {
    'user.status': 'Kontostatus ge\u00e4ndert',
    'user.password_reset': 'Passwort neu gesetzt',
    'user.role': 'Rolle ge\u00e4ndert',
    'user.move': 'Konto verschoben',
    'house.create': 'Haus angelegt',
    'house.update': 'Haus aktualisiert',
    'house.code': 'Hauscode ge\u00e4ndert',
    'resource.create': 'Ger\u00e4t angelegt',
    'resource.update': 'Ger\u00e4t aktualisiert',
    'fixed_booking.create': 'Feste Buchung angelegt',
    'fixed_booking.delete': 'Feste Buchung entfernt',
    'backup.download': 'Backup erstellt'
  };
  auditLog.innerHTML = entries.length ? '' : '<p class="muted">Noch keine protokollierten Admin-Aktionen.</p>';
  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = 'audit-item';
    item.innerHTML = `<strong>${escapeHtml(actionLabels[entry.action] || entry.action)}</strong><span>${escapeHtml(entry.actor || 'System')} - ${escapeHtml(new Date(`${entry.created_at}Z`).toLocaleString('de-CH'))}</span>`;
    auditLog.append(item);
  }
}

async function updateUserStatus(userId, active) {
  try {
    const data = await api(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ active })
    });
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function updateUserRole(userId, role) {
  try {
    const data = await api(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function resetUserPassword(userId, newPassword, form) {
  try {
    const data = await api(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
    form.reset();
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function populateFixedBookingControls() {
  fixedBookingResource.innerHTML = resources.map((resource) => (
    `<option value="${resource.id}">${escapeHtml(resource.name)} - ${escapeHtml(typeLabel(resource.type))}</option>`
  )).join('');

  fixedBookingSlot.innerHTML = slots.map((slot) => (
    `<option value="${slot}">${slot}</option>`
  )).join('');
}

function renderFixedBookings(items) {
  fixedBookingList.innerHTML = '';
  if (!items.length) {
    fixedBookingList.innerHTML = '<p class="muted">Noch keine festen Buchungen.</p>';
    return;
  }

  for (const booking of items) {
    const item = document.createElement('article');
    item.className = 'fixed-booking-item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(booking.label)}</strong>
        <span>${escapeHtml(weekdayLabels[booking.weekday])} - ${escapeHtml(booking.slot)}</span>
        <span>${escapeHtml(booking.resource_name)}</span>
      </div>
    `;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary danger';
    deleteButton.textContent = 'Entfernen';
    deleteButton.addEventListener('click', () => deleteFixedBooking(booking.id));

    item.append(deleteButton);
    fixedBookingList.append(item);
  }
}

async function createFixedBooking() {
  try {
    const data = await api('/api/admin/fixed-bookings', {
      method: 'POST',
      body: JSON.stringify({
        label: fixedBookingLabel.value,
        resourceId: Number(fixedBookingResource.value),
        weekday: Number(fixedBookingWeekday.value),
        slot: fixedBookingSlot.value
      })
    });
    fixedBookingForm.reset();
    showStatus(data.message || 'Feste Buchung gespeichert.');
    await Promise.all([loadAdmin(), loadBookings()]);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function deleteFixedBooking(id) {
  try {
    const data = await api(`/api/admin/fixed-bookings/${id}`, { method: 'DELETE' });
    showStatus(data.message || 'Feste Buchung entfernt.');
    await Promise.all([loadAdmin(), loadBookings()]);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function createHouse() {
  try {
    const data = await api('/api/admin/houses', {
      method: 'POST',
      body: JSON.stringify({
        name: houseNameInput.value,
        code: newHouseCodeInput.value
      })
    });
    houseForm.reset();
    await switchHouse(data.house.id);
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

bookingDate.addEventListener('change', () => selectBookingDate(bookingDate.value));
bookingViewButton.addEventListener('click', () => setAppView('booking'));
adminViewButton.addEventListener('click', () => setAppView('admin'));
adminSectionButtons.forEach((button) => {
  button.addEventListener('click', () => setAdminSection(button.dataset.adminTarget));
});

previousWeekButton.addEventListener('click', () => {
  selectBookingDate(addDaysString(calendarStartDate, -7));
});

nextWeekButton.addEventListener('click', () => {
  selectBookingDate(addDaysString(calendarStartDate, 7));
});

todayButton.addEventListener('click', () => {
  selectBookingDate(todayString());
});

houseCodeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('/api/admin/settings/house-code', {
      method: 'PUT',
      body: JSON.stringify({ houseCode: houseCodeInput.value })
    });
    showStatus(data.message || 'Hauscode gespeichert.');
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

notificationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveNotifications();
});

fixedBookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createFixedBooking();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveType(button.dataset.type);
  });
});
resendVerificationButton.addEventListener('click', resendEmailVerification);

houseSelect.addEventListener('change', () => switchHouse(houseSelect.value));

houseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createHouse();
});
resourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createResource();
});

adminEmailTestButton.addEventListener('click', sendAdminTestEmail);
runBackupButton.addEventListener('click', runBackupNow);

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await changePassword();
});
deleteAccountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await deleteOwnAccount();
});

openIntroButton.addEventListener('click', openIntro);
openKnowledgeButton.addEventListener('click', openIntro);
closeIntroButton.addEventListener('click', closeIntro);
introDoneButton.addEventListener('click', closeIntro);
introVideoPlayButton.addEventListener('click', playIntroVideo);
introVideoMuteButton.addEventListener('click', toggleIntroVideoSpeech);
introVideoPreviousButton.addEventListener('click', () => moveIntroVideoStep(-1));
introVideoNextButton.addEventListener('click', () => moveIntroVideoStep(1));
introQuizForm.addEventListener('submit', checkIntroQuiz);
introOverlay.addEventListener('click', (event) => {
  if (event.target === introOverlay) {
    closeIntro();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !introOverlay.hidden) {
    closeIntro();
    return;
  }
  if (event.key === 'Tab' && !introOverlay.hidden) {
    const focusable = [...introOverlay.querySelectorAll('button, summary, input, video, [href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.disabled && element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

recordedIntroVideo.addEventListener('play', stopIntroVideo);
recordedIntroVideo.addEventListener('loadedmetadata', () => {
  const minutes = Math.floor(recordedIntroVideo.duration / 60);
  const seconds = Math.round(recordedIntroVideo.duration % 60);
  recordedIntroDuration.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

if (introVideoSpeechSupported) {
  window.speechSynthesis.addEventListener('voiceschanged', refreshIntroVideoVoice);
  refreshIntroVideoVoice();
}

init().catch((error) => {
  statusText.textContent = error.message;
});
