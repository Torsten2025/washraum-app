const userLine = document.querySelector('#userLine');
const logoutButton = document.querySelector('#logoutButton');
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
const houseCodeForm = document.querySelector('#houseCodeForm');
const houseCodeInput = document.querySelector('#houseCodeInput');
const notificationForm = document.querySelector('#notificationForm');
const notificationEmail = document.querySelector('#notificationEmail');
const notifyReleasesInput = document.querySelector('#notifyReleases');
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
const introVideoProgress = document.querySelector('#introVideoProgress');
const introVideoPlayButton = document.querySelector('#introVideoPlayButton');
const introVideoMuteButton = document.querySelector('#introVideoMuteButton');

let currentUser = null;
let resources = [];
let bookings = [];
let slots = [];
let activeType = 'washer';
let calendarStartDate = '';
let calendarDays = [];
let currentRecommendation = null;
let introVideoElapsedMs = 0;
let introVideoTimer = null;
let introVideoLastTick = 0;
let introVideoPlaying = false;
let introVideoSpokenStep = '';
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
    durationMs: 9500,
    title: 'Willkommen im Waschplan',
    caption: 'Nach dem Einloggen siehst du zuerst deine eigenen Buchungen. Darunter liegt der Buchungsbereich, rechts stehen Regeln und Freigaben.',
    speech: 'Willkommen im Waschplan. Nach dem Einloggen siehst du zuerst deine eigenen Buchungen. Darunter liegt der Bereich zum Buchen. Rechts findest du Regeln und aktuelle Freigaben.'
  },
  {
    id: 'booking',
    durationMs: 10500,
    title: 'Schnell zur Buchung',
    caption: 'Waehle das Datum, dann Waschmaschine, Trockenraum oder Tumbler. Danach klickst du im freien Slot einfach auf Buchen.',
    speech: 'So buchst du am schnellsten: Waehle zuerst das Datum. Dann waehlst du den Bereich, also Waschmaschine, Trockenraum oder Tumbler. In einem freien Slot klickst du auf Buchen.'
  },
  {
    id: 'washer',
    durationMs: 10500,
    title: 'Waschmaschine: ein Zeitfenster',
    caption: 'Pro Waschtag gibt es nur ein Zeitfenster. Wenn du mehrere Waschmaschinen brauchst, buche sie im gleichen Slot.',
    speech: 'Bei den Waschmaschinen gilt: pro Waschtag nur ein Zeitfenster. Wenn du mehrere Waschmaschinen brauchst, ist das im gleichen Slot moeglich.'
  },
  {
    id: 'drying',
    durationMs: 11500,
    title: 'Trockenraum passend zum Waschslot',
    caption: '07:00 darf bis 21:00 trocknen. 12:00 und 17:00 duerfen maximal bis 12:00 am Folgetag trocknen.',
    speech: 'Der Trockenraum passt immer zu deiner Waschmaschinen Buchung. Beim sieben Uhr Slot maximal bis einundzwanzig Uhr. Beim zwoelf Uhr und siebzehn Uhr Slot maximal bis zwoelf Uhr am Folgetag.'
  },
  {
    id: 'tumbler',
    durationMs: 9500,
    title: 'Tumbler, Loeschen und Freigeben',
    caption: 'Ein Tumbler bleibt frei. Eigene Buchungen findest du oben und kannst sie loeschen oder frueher freigeben.',
    speech: 'Beim Tumbler bleibt mindestens ein Geraet frei. Deine eigenen Buchungen findest du oben. Dort kannst du sie loeschen oder frueher freigeben.'
  },
  {
    id: 'cleaning',
    durationMs: 11000,
    title: 'Admins, feste Buchungen und Reinigung',
    caption: 'Admins pflegen Hauscode und feste Buchungen. Nach der Nutzung bitte Filter, Trommel, Boden und gemeinsam genutzte Dinge sauber hinterlassen.',
    speech: 'Admins pflegen den Hauscode und feste Buchungen, zum Beispiel fuer regelmaessige Termine. Und wichtig fuer alle: nach der Nutzung bitte Filter, Trommel, Boden und gemeinsam genutzte Dinge sauber hinterlassen.'
  }
];
const introVideoTotalMs = introVideoSteps.reduce((total, step) => total + step.durationMs, 0);

function todayString() {
  return formatDateString(new Date());
}

function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysString(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}

function startOfWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday + 1);
  return formatDateString(date);
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(`${dateString}T12:00:00`));
}

function formatCalendarRange(from, to) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const startLabel = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short' }).format(start);
  const endLabel = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short' }).format(end);
  return `${startLabel} - ${endLabel}`;
}

function typeLabel(type) {
  if (type === 'washer') return 'Waschmaschine';
  if (type === 'drying_room') return 'Trockenraum';
  if (type === 'tumbler') return 'Tumbler';
  return type;
}

function dateStatus(dateString) {
  const today = new Date(`${todayString()}T00:00:00`);
  const date = new Date(`${dateString}T00:00:00`);
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays < 0) return 'vergangen';
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'morgen';
  return 'geplant';
}

function isPastSlot(dateString, slot) {
  const [, end] = slot.split('-');
  return new Date(`${dateString}T${end}:00`) <= new Date();
}

function showStatus(message, tone = 'ok') {
  statusText.textContent = message;
  statusText.className = `notice ${tone}`;
}

function openIntro() {
  introOverlay.hidden = false;
  document.body.classList.add('modal-open');
  renderIntroVideo();
  closeIntroButton.focus();
}

function closeIntro() {
  pauseIntroVideo();
  introOverlay.hidden = true;
  document.body.classList.remove('modal-open');
}

function introVideoStepForElapsed(elapsedMs) {
  let cursor = 0;
  const cappedElapsed = Math.min(Math.max(elapsedMs, 0), introVideoTotalMs - 1);

  for (let index = 0; index < introVideoSteps.length; index += 1) {
    const step = introVideoSteps[index];
    cursor += step.durationMs;
    if (cappedElapsed < cursor) {
      return { step, index };
    }
  }

  return { step: introVideoSteps[introVideoSteps.length - 1], index: introVideoSteps.length - 1 };
}

function renderIntroVideo() {
  const { step, index } = introVideoStepForElapsed(introVideoElapsedMs);
  const progress = Math.min(1, introVideoElapsedMs / introVideoTotalMs);

  introVideoStage.dataset.step = step.id;
  introVideoChapter.textContent = `Kapitel ${index + 1} von ${introVideoSteps.length}`;
  introVideoTitle.textContent = step.title;
  introVideoCaption.textContent = step.caption;
  introVideoProgress.style.width = `${Math.round(progress * 100)}%`;
  introVideoPlayButton.textContent = introVideoPlaying ? 'Pause' : introVideoElapsedMs >= introVideoTotalMs ? 'Video erneut ansehen' : 'Video starten';

  if (!introVideoSpeechSupported) {
    introVideoMuteButton.textContent = 'Sprecher nicht verfuegbar';
    introVideoMuteButton.disabled = true;
  } else {
    introVideoMuteButton.textContent = introVideoSpeechEnabled ? 'Sprecher an' : 'Sprecher aus';
    introVideoMuteButton.setAttribute('aria-pressed', String(introVideoSpeechEnabled));
  }

  if (introVideoPlaying) {
    speakIntroVideoStep(step);
  }
}

function playIntroVideo() {
  if (introVideoPlaying) {
    pauseIntroVideo();
    renderIntroVideo();
    return;
  }

  if (introVideoElapsedMs >= introVideoTotalMs) {
    introVideoElapsedMs = 0;
    introVideoSpokenStep = '';
  }

  introVideoPlaying = true;
  introVideoLastTick = Date.now();
  renderIntroVideo();

  introVideoTimer = window.setInterval(() => {
    const now = Date.now();
    introVideoElapsedMs += now - introVideoLastTick;
    introVideoLastTick = now;

    if (introVideoElapsedMs >= introVideoTotalMs) {
      introVideoElapsedMs = introVideoTotalMs;
      pauseIntroVideo();
    }

    renderIntroVideo();
  }, 250);
}

function pauseIntroVideo() {
  introVideoPlaying = false;
  if (introVideoTimer) {
    window.clearInterval(introVideoTimer);
    introVideoTimer = null;
  }
  if (introVideoSpeechSupported) {
    window.speechSynthesis.cancel();
  }
}

function speakIntroVideoStep(step) {
  if (!introVideoSpeechSupported || !introVideoSpeechEnabled || introVideoSpokenStep === step.id) {
    return;
  }

  introVideoSpokenStep = step.id;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(step.speech);
  utterance.lang = 'de-CH';
  utterance.rate = 0.96;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function toggleIntroVideoSpeech() {
  if (!introVideoSpeechSupported) {
    return;
  }

  introVideoSpeechEnabled = !introVideoSpeechEnabled;
  introVideoSpokenStep = '';
  window.speechSynthesis.cancel();
  renderIntroVideo();
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
  userLine.textContent = `${currentUser.username} (${currentUser.role})`;
  notificationEmail.value = currentUser.email || '';
  notifyReleasesInput.checked = currentUser.notifyReleases !== false;

  const [resourceData, slotData] = await Promise.all([
    api('/api/resources'),
    api('/api/slots')
  ]);
  resources = resourceData.resources;
  slots = slotData.slots;

  if (currentUser.role === 'admin') {
    await loadAdmin();
  }

  await refreshAll();
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
    return day.availability[activeType] || { free: 0, total: 0 };
  }
  return Object.values(day.availability).reduce((summary, item) => ({
    free: summary.free + item.free,
    total: summary.total + item.total
  }), { free: 0, total: 0 });
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
      `${formatShortDate(day.date)}, ${availability.free} freie Buchungsmoeglichkeiten${day.ownBookings ? `, ${day.ownBookings} eigene Buchungen` : ''}`
    );
    button.innerHTML = `
      <span class="calendar-weekday">${new Intl.DateTimeFormat('de-CH', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`))}</span>
      <strong>${new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit' }).format(new Date(`${day.date}T12:00:00`))}</strong>
      <span class="calendar-availability">${availability.total ? `<b>${availability.free}</b> frei` : 'vorbei'}</span>
      ${day.ownBookings ? `<span class="calendar-own">${day.ownBookings} eigene</span>` : ''}
    `;
    button.addEventListener('click', () => selectBookingDate(day.date));
    weekCalendar.append(button);
  }
}

function renderRecommendation() {
  bookingSuggestion.innerHTML = '';
  const recommendation = currentRecommendation;
  if (!recommendation) {
    bookingSuggestion.innerHTML = '<p class="muted">Noch kein persoenlicher Vorschlag verfuegbar.</p>';
    return;
  }

  const copy = document.createElement('div');
  copy.className = 'suggestion-copy';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'suggestion-label';
  eyebrow.textContent = 'Persoenlicher Vorschlag';
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
  bookingSuggestion.append(copy);

  const actions = document.createElement('div');
  actions.className = 'suggestion-actions';
  if (recommendation.kind === 'booking') {
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
          <strong>${resource.name}</strong>
          <span>${typeLabel(resource.type)}</span>
        </div>
        <p>${booking?.is_fixed ? `Fest: ${owner}` : owner}</p>
      `;

      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = booking?.is_fixed ? 'Geschuetzt' : booking ? 'Loeschen' : 'Buchen';
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

  for (const booking of items) {
    const item = document.createElement('article');
    item.className = 'booking-list-item';
    const status = dateStatus(booking.booking_date);
    item.innerHTML = `
      <div>
        <strong>${booking.resource_name}</strong>
        <span>${booking.booking_date} - ${booking.slot}</span>
      </div>
      <span class="status-chip">${status}</span>
    `;

    const actions = document.createElement('div');
    actions.className = 'inline-actions';

    const releaseButton = document.createElement('button');
    releaseButton.type = 'button';
    releaseButton.className = 'secondary';
    releaseButton.textContent = 'Freigeben';
    releaseButton.addEventListener('click', () => releaseBooking(booking.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary danger';
    deleteButton.textContent = 'Loeschen';
    deleteButton.addEventListener('click', () => deleteBooking(booking.id));

    actions.append(releaseButton, deleteButton);
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
      <strong>${notice.resource_name}</strong>
      <span>${notice.message}</span>
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

async function deleteBooking(id) {
  try {
    const data = await api(`/api/bookings/${id}`, { method: 'DELETE' });
    showStatus(data.message || 'Buchung geloescht.');
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function releaseBooking(id) {
  try {
    const data = await api(`/api/bookings/${id}/release`, { method: 'POST' });
    const emailText = data.emailNotifications?.configured
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
        notifyReleases: notifyReleasesInput.checked
      })
    });
    currentUser = data.user;
    showStatus(data.message || 'Benachrichtigungen gespeichert.');
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function loadAdmin() {
  const [usersData, overviewData, settingsData, fixedData] = await Promise.all([
    api('/api/admin/users'),
    api('/api/admin/overview'),
    api('/api/admin/settings'),
    api('/api/admin/fixed-bookings')
  ]);
  adminBox.hidden = false;
  houseCodeInput.value = settingsData.houseCode;
  populateFixedBookingControls();
  renderFixedBookings(fixedData.fixedBookings);
  adminOverview.innerHTML = `
    <div><strong>${overviewData.users}</strong><span>aktive Nutzer</span></div>
    <div><strong>${overviewData.todayBookings}</strong><span>Buchungen heute</span></div>
    <div><strong>${overviewData.activeResources}</strong><span>aktive Ressourcen</span></div>
    <div><strong>${overviewData.fixedBookings}</strong><span>feste Buchungen</span></div>
    <div><strong>${overviewData.recentReleases}</strong><span>Freigaben 7 Tage</span></div>
    <div class="wide"><strong>E-Mail</strong><span>${overviewData.email.label}</span></div>
  `;
  userList.innerHTML = '';

  for (const user of usersData.users) {
    const item = document.createElement('li');
    const mailInfo = user.email ? `, ${user.email}` : ', keine E-Mail';
    item.textContent = `${user.username} (${user.role}, ${user.active ? 'aktiv' : 'inaktiv'}${mailInfo})`;
    userList.append(item);
  }
}

function populateFixedBookingControls() {
  fixedBookingResource.innerHTML = resources.map((resource) => (
    `<option value="${resource.id}">${resource.name} - ${typeLabel(resource.type)}</option>`
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
        <strong>${booking.label}</strong>
        <span>${weekdayLabels[booking.weekday]} - ${booking.slot}</span>
        <span>${booking.resource_name}</span>
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

bookingDate.addEventListener('change', () => selectBookingDate(bookingDate.value));

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

openIntroButton.addEventListener('click', openIntro);
openKnowledgeButton.addEventListener('click', openIntro);
closeIntroButton.addEventListener('click', closeIntro);
introDoneButton.addEventListener('click', closeIntro);
introVideoPlayButton.addEventListener('click', playIntroVideo);
introVideoMuteButton.addEventListener('click', toggleIntroVideoSpeech);
introOverlay.addEventListener('click', (event) => {
  if (event.target === introOverlay) {
    closeIntro();
  }
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

init().catch((error) => {
  statusText.textContent = error.message;
});
