const userLine = document.querySelector('#userLine');
const logoutForm = document.querySelector('#logoutForm');
const logoutButton = document.querySelector('#logoutButton');
const accountMenuButton = document.querySelector('#accountMenuButton');
const accountMenuName = document.querySelector('#accountMenuName');
const accountMenuRole = document.querySelector('#accountMenuRole');
const accountMenuPanel = document.querySelector('#accountMenuPanel');
const accountPanelName = document.querySelector('#accountPanelName');
const accountPanelMeta = document.querySelector('#accountPanelMeta');
const messageCenterButton = document.querySelector('#messageCenterButton');
const messageCountBadge = document.querySelector('#messageCountBadge');
const messageCenterOverlay = document.querySelector('#messageCenterOverlay');
const closeMessageCenterButton = document.querySelector('#closeMessageCenterButton');
const messageCenterList = document.querySelector('#messageCenterList');
const openMessageCenterButton = document.querySelector('#openMessageCenterButton');
const reportIssueButton = document.querySelector('#reportIssueButton');
const reportIssueOverlay = document.querySelector('#reportIssueOverlay');
const closeReportIssueButton = document.querySelector('#closeReportIssueButton');
const cancelReportIssueButton = document.querySelector('#cancelReportIssueButton');
const reportIssueForm = document.querySelector('#reportIssueForm');
const reportIssueResource = document.querySelector('#reportIssueResource');
const reportIssueSubject = document.querySelector('#reportIssueSubject');
const reportIssueDescription = document.querySelector('#reportIssueDescription');
const ownMaintenanceCases = document.querySelector('#ownMaintenanceCases');
const releaseSpotlight = document.querySelector('#releaseSpotlight');
const releaseSpotlightContent = document.querySelector('#releaseSpotlightContent');
const brandHouseName = document.querySelector('#brandHouseName');
const introHouseName = document.querySelector('#introHouseName');
const houseSwitcher = document.querySelector('#houseSwitcher');
const houseSelect = document.querySelector('#houseSelect');
const viewSwitcher = document.querySelector('#viewSwitcher');
const bookingViewButton = document.querySelector('#bookingViewButton');
const adminViewButton = document.querySelector('#adminViewButton');
const bookingDate = document.querySelector('#bookingDate');
const bookingSuggestion = document.querySelector('#bookingSuggestion');
const bookingFlow = document.querySelector('#bookingFlow');
const bookingFlowContent = document.querySelector('#bookingFlowContent');
const bookingFlowNotice = document.querySelector('#bookingFlowNotice');
const bookingFlowSteps = document.querySelector('#bookingFlowSteps');
const bookingFlowDescription = document.querySelector('#bookingFlowDescription');
const bookingModeButtons = [...document.querySelectorAll('[data-booking-mode]')];
const weekCalendar = document.querySelector('#weekCalendar');
const calendarRange = document.querySelector('#calendarRange');
const weekViewButton = document.querySelector('#weekViewButton');
const monthViewButton = document.querySelector('#monthViewButton');
const monthWeekdays = document.querySelector('#monthWeekdays');
const calendarDayDetails = document.querySelector('#calendarDayDetails');
const calendarDayDetailsTitle = document.querySelector('#calendarDayDetailsTitle');
const calendarDayDetailsContent = document.querySelector('#calendarDayDetailsContent');
const calendarDayDetailsActions = document.querySelector('#calendarDayDetailsActions');
const calendarDayDetailsClose = document.querySelector('#calendarDayDetailsClose');
const calendarDayDetailsBackdrop = document.querySelector('#calendarDayDetailsBackdrop');
document.body.append(calendarDayDetailsBackdrop, calendarDayDetails);
const previousWeekButton = document.querySelector('#previousWeekButton');
const nextWeekButton = document.querySelector('#nextWeekButton');
const todayButton = document.querySelector('#todayButton');
const schedule = document.querySelector('#schedule');
const statusText = document.querySelector('#statusText');
const adminBox = document.querySelector('#adminBox');
const adminOverview = document.querySelector('#adminOverview');
const adminRecoveryPanel = document.querySelector('#adminRecoveryPanel');
const adminEmailTestButton = document.querySelector('#adminEmailTestButton');
const adminPushTestButton = document.querySelector('#adminPushTestButton');
const adminPushTarget = document.querySelector('#adminPushTarget');
const superadminTransferOperation = document.querySelector('#superadminTransferOperation');
const superadminTransferTarget = document.querySelector('#superadminTransferTarget');
const superadminTransferConfirm = document.querySelector('#superadminTransferConfirm');
const superadminTransferButton = document.querySelector('#superadminTransferButton');
const adminAnalytics = document.querySelector('#adminAnalytics');
const resetBookingsConfirm = document.querySelector('#resetBookingsConfirm');
const resetBookingsButton = document.querySelector('#resetBookingsButton');
const adminTitle = document.querySelector('#adminTitle');
const adminRoleLabel = document.querySelector('#adminRoleLabel');
const adminRoleSummary = document.querySelector('#adminRoleSummary');
const adminScopeText = document.querySelector('#adminScopeText');
const adminTaskSummary = document.querySelector('#adminTaskSummary');
const adminTaskList = document.querySelector('#adminTaskList');
const adminResponsibilityScope = document.querySelector('#adminResponsibilityScope');
const adminResponsibilityList = document.querySelector('#adminResponsibilityList');
const adminLogbookCount = document.querySelector('#adminLogbookCount');
const adminPeopleCount = document.querySelector('#adminPeopleCount');
const adminHouseCount = document.querySelector('#adminHouseCount');
const adminSystemCount = document.querySelector('#adminSystemCount');
const adminSectionButtons = [...document.querySelectorAll('.admin-section-tab')];
const adminSections = [...document.querySelectorAll('[data-admin-section]')];
const backupOperation = document.querySelector('#backupOperation');
const runBackupButton = document.querySelector('#runBackupButton');
const maintenanceOperation = document.querySelector('#maintenanceOperation');
const maintenanceAdminStatus = document.querySelector('#maintenanceAdminStatus');
const toggleMaintenanceButton = document.querySelector('#toggleMaintenanceButton');
const apartmentForm = document.querySelector('#apartmentForm');
const apartmentLabelInput = document.querySelector('#apartmentLabelInput');
const apartmentDisplayNameInput = document.querySelector('#apartmentDisplayNameInput');
const apartmentCodeResult = document.querySelector('#apartmentCodeResult');
const apartmentList = document.querySelector('#apartmentList');
const superadminBox = document.querySelector('#superadminBox');
const houseForm = document.querySelector('#houseForm');
const houseNameInput = document.querySelector('#houseNameInput');
const houseList = document.querySelector('#houseList');
const resourceForm = document.querySelector('#resourceForm');
const resourceNameInput = document.querySelector('#resourceNameInput');
const resourceTypeInput = document.querySelector('#resourceTypeInput');
const resourceAdminList = document.querySelector('#resourceAdminList');
const maintenanceSearch = document.querySelector('#maintenanceSearch');
const maintenanceStatusFilter = document.querySelector('#maintenanceStatusFilter');
const maintenanceCaseList = document.querySelector('#maintenanceCaseList');
const auditLog = document.querySelector('#auditLog');
const appUpdateNotice = document.querySelector('#appUpdateNotice');
const appUpdateText = document.querySelector('#appUpdateText');
const updateAppButton = document.querySelector('#updateAppButton');
const appVersionText = document.querySelector('#appVersionText');
const checkAppUpdateButton = document.querySelector('#checkAppUpdateButton');
const maintenanceOverlay = document.querySelector('#maintenanceOverlay');
const maintenanceText = document.querySelector('#maintenanceText');
const checkMaintenanceButton = document.querySelector('#checkMaintenanceButton');
const openMaintenanceAdminButton = document.querySelector('#openMaintenanceAdminButton');
const notificationForm = document.querySelector('#notificationForm');
const notificationEmail = document.querySelector('#notificationEmail');
const secondaryNotificationEmail = document.querySelector('#secondaryNotificationEmail');
const notifyReleasesInput = document.querySelector('#notifyReleases');
const emailVerificationStatus = document.querySelector('#emailVerificationStatus');
const resendVerificationButton = document.querySelector('#resendVerificationButton');
const secondaryEmailVerificationStatus = document.querySelector('#secondaryEmailVerificationStatus');
const resendSecondaryVerificationButton = document.querySelector('#resendSecondaryVerificationButton');
const installHelpText = document.querySelector('#installHelpText');
const installAppButton = document.querySelector('#installAppButton');
const pushStatusText = document.querySelector('#pushStatusText');
const enablePushButton = document.querySelector('#enablePushButton');
const disablePushButton = document.querySelector('#disablePushButton');
const createDeviceCodeButton = document.querySelector('#createDeviceCodeButton');
const devicePairingCode = document.querySelector('#devicePairingCode');
const notificationResourceType = document.querySelector('#notificationResourceType');
const notificationWeekday = document.querySelector('#notificationWeekday');
const notificationSlot = document.querySelector('#notificationSlot');
const openSettingsButton = document.querySelector('#openSettingsButton');
const settingsSummary = document.querySelector('#settingsSummary');
const settingsProgressText = document.querySelector('#settingsProgressText');
const settingsOverlay = document.querySelector('#settingsOverlay');
const closeSettingsButton = document.querySelector('#closeSettingsButton');
const settingsDoneButton = document.querySelector('#settingsDoneButton');
const settingsEyebrow = document.querySelector('#settingsEyebrow');
const settingsTitle = document.querySelector('#settingsTitle');
const settingsIntroText = document.querySelector('#settingsIntroText');
const settingsUsername = document.querySelector('#settingsUsername');
const settingsApartmentLabel = document.querySelector('#settingsApartmentLabel');
const settingsApartmentLabelWrap = document.querySelector('#settingsApartmentLabelWrap');
const settingsRole = document.querySelector('#settingsRole');
const nameCorrectionPanel = document.querySelector('#nameCorrectionPanel');
const requestedDisplayName = document.querySelector('#requestedDisplayName');
const displayNameRequestNote = document.querySelector('#displayNameRequestNote');
const sendDisplayNameRequestButton = document.querySelector('#sendDisplayNameRequestButton');
const apartmentAccountStatus = document.querySelector('#apartmentAccountStatus');
const openApartmentSetupButton = document.querySelector('#openApartmentSetupButton');
const settingsBookingMode = document.querySelector('#settingsBookingMode');
const settingsTabButtons = [...document.querySelectorAll('.settings-tab')];
const settingsPanels = [...document.querySelectorAll('[data-settings-section]')];
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
const adminAccountRecoveryResult = document.querySelector('#adminAccountRecoveryResult');
const apartmentSetupOverlay = document.querySelector('#apartmentSetupOverlay');
const claimApartmentForm = document.querySelector('#claimApartmentForm');
const joinApartmentForm = document.querySelector('#joinApartmentForm');
const existingApartmentCode = document.querySelector('#existingApartmentCode');
const existingDeviceCode = document.querySelector('#existingDeviceCode');
const apartmentSetupMessage = document.querySelector('#apartmentSetupMessage');
const closeApartmentSetupButton = document.querySelector('#closeApartmentSetupButton');
const postponeApartmentSetupButton = document.querySelector('#postponeApartmentSetupButton');
const myBookings = document.querySelector('#myBookings');
const releaseNoticeOverlay = document.querySelector('#releaseNoticeOverlay');
const closeReleaseNoticeButton = document.querySelector('#closeReleaseNoticeButton');
const dismissReleaseNoticeButton = document.querySelector('#dismissReleaseNoticeButton');
const releaseNoticeEyebrow = document.querySelector('#releaseNoticeEyebrow');
const releaseNoticeTitle = document.querySelector('#releaseNoticeTitle');
const releaseNoticeIntro = document.querySelector('#releaseNoticeIntro');
const releaseNoticeDetail = document.querySelector('#releaseNoticeDetail');
const bookReleaseNoticeButton = document.querySelector('#bookReleaseNoticeButton');
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
const sessionWarningOverlay = document.querySelector('#sessionWarningOverlay');
const sessionCountdown = document.querySelector('#sessionCountdown');
const sessionStayButton = document.querySelector('#sessionStayButton');
const sessionLogoutButton = document.querySelector('#sessionLogoutButton');

let currentUser = null;
let availableHouses = [];
let resources = [];
let bookings = [];
let slots = [];
let releaseNoticeItems = [];
let activeReleaseNotice = null;
let maintenanceCases = [];
let activeType = 'washer';
let deferredInstallPrompt = null;
let calendarView = (() => {
  try {
    return window.localStorage.getItem('waschzeit-calendar-view') === 'month' ? 'month' : 'week';
  } catch {
    return 'week';
  }
})();
let calendarAnchorDate = '';
let calendarStartDate = '';
let calendarDays = [];
let calendarDetailDate = '';
let calendarDetailAnchor = null;
let calendarDetailPinned = false;
let calendarPreviewTimer = null;
let calendarPreviewCloseTimer = null;
let calendarPreviewSuppressFocus = false;
let calendarPointerFocus = false;
let calendarSheetDragStart = null;
let statusTimer = null;
let currentRecommendation = null;
let bookingFlowOptions = null;
let bookingMode = 'time';
let latestReleaseStatus = null;
let updateReloadApproved = false;
let appVersionPollTimer = null;
const loadedAppVersion = document.querySelector('meta[name="waschzeit-version"]')?.content || 'unbekannt';
const loadedAppRelease = document.querySelector('meta[name="waschzeit-release"]')?.content || loadedAppVersion;
const loadedAppReleasedAt = document.querySelector('meta[name="waschzeit-released-at"]')?.content || '';
let bookingFlowState = {
  date: '',
  step: 1,
  slot: '',
  washerIds: [],
  existingWasherId: null,
  dryingResourceId: null,
  dryingOptionId: '',
  tumblerResourceId: null,
  companions: null,
  loading: false
};
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
let settingsReturnFocus = null;
let messageCenterReturnFocus = null;
let activeSettingsSection = 'profile';
let activeAdminSection = 'overview';
let logoutInProgress = false;
let sessionIdleTimeoutMs = 0;
let sessionWarningMs = 0;
let sessionLastActivityAt = 0;
let sessionLastKeepaliveAt = 0;
let sessionWarningTimer = null;
let sessionExpiryTimer = null;
let sessionCountdownTimer = null;
let sessionKeepalivePromise = null;
let sessionActivityListenersReady = false;
let sessionActivityThrottleAt = 0;
let sessionEnding = false;
let sessionReturnFocus = null;
const sessionKeepaliveIntervalMs = 30 * 1000;
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

function introSceneImage(filename) {
  return `<img class="video-scene-image" src="/assets/intro/scenes/${filename}?v=scenes-v1" alt="">`;
}

const introVideoSteps = [
  {
    id: 'overview',
    fallbackDurationMs: 18000,
    title: 'Willkommen bei WaschZeit',
    caption: 'Drei Farbstreifen zeigen die Verf\u00fcgbarkeit. Bleibe kurz auf einem Tag, um ihn vergr\u00f6\u00dfert zu sehen.',
    speech: 'Hallo und willkommen. Ich zeige dir kurz, wie du hier einen Waschtermin buchst. Oben findest du deine n\u00e4chsten Buchungen. Direkt darunter siehst du den Kalender. Drei beschriftete Farbstreifen zeigen dir Waschmaschinen, Trockenr\u00e4ume und Tumbler getrennt. Gr\u00fcn bedeutet frei, Gelb teilweise belegt und Rot voll belegt. Du kannst zwischen Woche und Monat wechseln. Wenn du mit der Maus kurz auf einem Tag bleibst, vergr\u00f6\u00dfert sich seine Tagesansicht und zeigt alle Zeitfenster und Ger\u00e4te. Mit der Tastatur erscheint sie beim Fokus, auf dem Smartphone durch Antippen.',
    visual: introSceneImage('app-overview.png')
  },
  {
    id: 'booking',
    fallbackDurationMs: 21000,
    title: 'Zeit oder Maschine zuerst',
    caption: 'Du entscheidest, welcher Buchungsweg f\u00fcr dich schneller ist.',
    speech: 'F\u00fcr eine Buchung \u00f6ffnest du zuerst einen Tag im Kalender. Standardm\u00e4\u00dfig stehen danach die drei Zeitfenster im Mittelpunkt. Zu jeder Uhrzeit siehst du sofort, wie viele Waschmaschinen, Trockenr\u00e4ume und Tumbler zur Auswahl stehen. Nach der Zeit w\u00e4hlst du eine oder mehrere Waschmaschinen und erg\u00e4nzt bei Bedarf die Trocknung. Wenn dir eine bestimmte Maschine wichtiger ist, wechselst du zu Maschine zuerst. Die App merkt sich deine Auswahl f\u00fcr den n\u00e4chsten Besuch.',
    visual: introSceneImage('booking-time-focused.png')
  },
  {
    id: 'suggestion',
    fallbackDurationMs: 31000,
    title: 'Deine pers\u00f6nliche Empfehlung',
    caption: 'Ein passender freier Termin f\u00fchrt dich direkt zur Waschmaschinenwahl.',
    speech: 'Die pers\u00f6nliche Empfehlung verbindet deinen bisherigen Waschrhythmus mit den freien Zeiten. Der passende Tag ist im Kalender mit Empfohlen und Buchen markiert. Ein Tipp darauf setzt das Zeitfenster und \u00f6ffnet direkt die freien Waschmaschinen. Trockenraum und Tumbler kannst du Schritt f\u00fcr Schritt erg\u00e4nzen oder auslassen. Beim Trockenraum w\u00e4hlst du die erlaubte Nutzungsdauer. Mit Waschpaket buchen werden alle ausgew\u00e4hlten Bestandteile gemeinsam reserviert und sp\u00e4ter als ein Paket angezeigt.',
    visual: introSceneImage('booking-washers-focused.png')
  },
  {
    id: 'washer',
    fallbackDurationMs: 24000,
    title: 'Waschmaschine: ein Zeitfenster',
    caption: 'Mehrere Maschinen sind m\u00f6glich, aber nur gemeinsam im selben Zeitfenster.',
    speech: 'Bei den Waschmaschinen gilt: Du reservierst pro Waschtag nur ein Zeitfenster. Brauchst du mehrere Maschinen, buchst du sie im selben Zeitfenster. Einen weiteren zuk\u00fcnftigen Waschtag kannst du erst reservieren, wenn dein bereits gebuchter Waschtag erreicht ist. Die App pr\u00fcft das automatisch.',
    visual: introSceneImage('booking-washers.png')
  },
  {
    id: 'drying',
    fallbackDurationMs: 28000,
    title: 'Trockenraum passend einplanen',
    caption: 'Die erlaubte Dauer richtet sich danach, wann dein Waschslot beginnt.',
    speech: 'Der Trockenraum wird passend zu deiner Waschmaschinen-Buchung reserviert. Wenn du morgens von sieben bis zw\u00f6lf w\u00e4schst, kannst du den Raum bis sp\u00e4testens einundzwanzig Uhr nutzen. Beim Slot von zw\u00f6lf bis siebzehn Uhr und beim Abend-Slot bis einundzwanzig Uhr endet die Nutzung sp\u00e4testens am folgenden Tag um zw\u00f6lf Uhr. Im Waschpaket kannst du bewusst eine k\u00fcrzere Dauer ausw\u00e4hlen. Wenn die W\u00e4sche trocken ist, gibst du den Raum am besten direkt frei.',
    visual: introSceneImage('booking-drying-focused.png')
  },
  {
    id: 'tumbler',
    fallbackDurationMs: 26000,
    title: 'Tumbler mit Reserve',
    caption: 'Ein Tumbler bleibt frei. Der Tumbler geh\u00f6rt zum gleichen Slot wie die Waschmaschine.',
    speech: 'F\u00fcr die Tumbler gilt: Am Ende eines Waschslots muss mindestens ein Tumbler frei bleiben. Deshalb kann die App eine Buchung ablehnen, obwohl noch ein Ger\u00e4t angezeigt wird. Der Tumbler geh\u00f6rt zum gleichen Zeitfenster wie deine Waschmaschine. Wenn du keinen Tumbler brauchst, l\u00e4sst du ihn einfach weg. So bleibt f\u00fcr spontane F\u00e4lle immer eine kleine Reserve.',
    visual: introSceneImage('booking-tumbler-focused.png')
  },
  {
    id: 'push',
    fallbackDurationMs: 34000,
    title: 'Freigeben, Push antippen, buchen',
    caption: 'Push nennt neutral die Person und \u00f6ffnet direkt den passenden Buchungsdialog.',
    speech: 'Wenn du w\u00e4hrend deines Slots fr\u00fcher fertig bist, w\u00e4hlst du Fr\u00fcher frei. Vor Beginn nutzt du Absagen und informieren. Das normale L\u00f6schen sendet keine Nachricht. Wer Push auf dem Handy aktiviert hat, bekommt eine neutrale Meldung mit dem Namen der Person. Die Nachricht geht nicht an die Person, die selbst freigibt. Tippst du auf die Push-Nachricht, \u00f6ffnet die App ein Detailfenster mit Person, Ger\u00e4t, Datum und Zeitfenster. Dort kannst du den Slot direkt buchen. Ist er inzwischen weg, zeigt die App das sauber an.',
    visual: introSceneImage('release-dialog.png')
  },
  {
    id: 'cleaning',
    fallbackDurationMs: 28000,
    title: 'Sauber fertig werden',
    caption: 'Reinigen geh\u00f6rt zu jeder Nutzung, auch bei einem einzelnen Waschgang.',
    speech: 'Zum Schluss noch das, was den Alltag f\u00fcr alle angenehmer macht. Bitte reinige nach der Nutzung Trommel, Dichtungen und Filter. Wische die benutzten Fl\u00e4chen und den Boden, und h\u00e4nge den ausgesp\u00fclten Wischmopp zum Trocknen auf. Das gilt auch, wenn du nur einen einzelnen Waschgang machst. Die vollst\u00e4ndige \u00dcbersicht findest du jederzeit im Wissensbereich. Und damit bist du startklar.',
    visual: introSceneImage('cleaning-tasks.png')
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

function startOfMonth(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

function addMonthsString(dateString, months) {
  const date = new Date(`${startOfMonth(dateString)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatDateString(date);
}

function calendarPeriodStart(dateString = calendarAnchorDate) {
  return calendarView === 'month'
    ? startOfWeek(startOfMonth(dateString))
    : startOfWeek(dateString);
}

function syncCalendarPeriod(dateString) {
  calendarAnchorDate = dateString;
  calendarStartDate = calendarPeriodStart(dateString);
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

function formatCalendarMonth(dateString) {
  return new Intl.DateTimeFormat('de-CH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${startOfMonth(dateString)}T12:00:00Z`));
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
  window.clearTimeout(statusTimer);
  statusText.textContent = message;
  statusText.className = `notice ${tone}`;
  if (message && tone !== 'error') {
    rememberNotice(message);
  }
  if (message) {
    statusTimer = window.setTimeout(() => {
      statusText.textContent = '';
      statusText.className = 'notice muted';
    }, tone === 'error' ? 10000 : 7000);
  }
}

function noticeJournalKey() {
  return currentUser ? `waschzeit-notices-${currentUser.id}` : 'waschzeit-notices';
}

function readNoticeJournal() {
  try {
    return JSON.parse(window.localStorage.getItem(noticeJournalKey()) || '[]');
  } catch {
    return [];
  }
}

function rememberNotice(message) {
  if (!currentUser) return;
  const notices = readNoticeJournal();
  notices.unshift({ message, createdAt: new Date().toISOString() });
  window.localStorage.setItem(noticeJournalKey(), JSON.stringify(notices.slice(0, 8)));
  renderMessageCenter();
}

function messageReadKey() {
  return currentUser ? `waschzeit-messages-read-${currentUser.id}` : 'waschzeit-messages-read';
}

function messageTimestamp(value) {
  const timestamp = Date.parse(String(value || '').replace(' ', 'T'));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function messageCenterEntries() {
  const releases = releaseNoticeItems.map((notice) => ({
    type: 'release',
    createdAt: notice.created_at,
    notice
  }));
  const activity = readNoticeJournal().map((notice) => ({
    type: 'activity',
    createdAt: notice.createdAt,
    message: notice.message
  }));
  return [...releases, ...activity]
    .sort((left, right) => messageTimestamp(right.createdAt) - messageTimestamp(left.createdAt));
}

function lastMessageReadAt() {
  try {
    return messageTimestamp(window.localStorage.getItem(messageReadKey()));
  } catch {
    return 0;
  }
}

function updateMessageCount(entries = messageCenterEntries()) {
  const readAt = lastMessageReadAt();
  const unread = entries.filter((entry) => messageTimestamp(entry.createdAt) > readAt).length;
  messageCountBadge.hidden = unread === 0;
  messageCountBadge.textContent = unread > 9 ? '9+' : String(unread);
  messageCenterButton.classList.toggle('has-unread', unread > 0);
}

function renderReleaseSpotlight() {
  const notice = releaseNoticeItems.find((item) => item.bookable) || releaseNoticeItems[0];
  releaseSpotlight.hidden = !notice;
  releaseSpotlightContent.innerHTML = '';
  if (!notice) return;

  const copy = document.createElement('div');
  const actor = notice.created_by_name ? ` von ${notice.created_by_name}` : '';
  copy.innerHTML = `
    <span class="suggestion-label">Neu frei</span>
    <strong>${escapeHtml(notice.resource_name)} - ${escapeHtml(formatShortDate(notice.booking_date))}, ${escapeHtml(notice.slot)}</strong>
    <small>Freigegeben${escapeHtml(actor)}</small>
  `;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'text-button';
  action.textContent = notice.bookable ? 'Ansehen und buchen' : 'Ansehen';
  action.addEventListener('click', () => openReleaseNotice(notice));
  releaseSpotlightContent.append(copy, action);
}

function renderMessageCenter() {
  const entries = messageCenterEntries();
  messageCenterList.innerHTML = '';
  if (!entries.length) {
    messageCenterList.innerHTML = '<div class="message-center-empty"><strong>Alles ruhig.</strong><p>Neue Freigaben und deine letzten Aktionen erscheinen hier.</p></div>';
  }

  for (const entry of entries) {
    const item = document.createElement('article');
    item.className = `message-item is-${entry.type}`;
    const createdAt = new Date(messageTimestamp(entry.createdAt));
    if (entry.type === 'release') {
      const notice = entry.notice;
      const actor = notice.created_by_name || 'Jemand';
      item.innerHTML = `
        <div class="message-item-copy">
          <span class="message-kind">Neu frei</span>
          <strong>${escapeHtml(notice.resource_name)} ist wieder frei</strong>
          <p>${escapeHtml(formatShortDate(notice.booking_date))} - ${escapeHtml(notice.slot)} - von ${escapeHtml(actor)}</p>
          <small>${escapeHtml(createdAt.toLocaleString('de-CH'))}</small>
        </div>
      `;
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'secondary';
      action.textContent = notice.bookable ? 'Buchen' : 'Ansehen';
      action.addEventListener('click', () => {
        closeMessageCenter();
        openReleaseNotice(notice);
      });
      item.append(action);
    } else {
      item.innerHTML = `
        <div class="message-item-copy">
          <span class="message-kind">Deine Aktivit&auml;t</span>
          <strong>${escapeHtml(entry.message)}</strong>
          <small>${escapeHtml(createdAt.toLocaleString('de-CH'))}</small>
        </div>
      `;
    }
    messageCenterList.append(item);
  }
  updateMessageCount(entries);
  renderReleaseSpotlight();
}

function openMessageCenter() {
  closeAccountMenu();
  messageCenterReturnFocus = document.activeElement;
  messageCenterOverlay.hidden = false;
  messageCenterButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('modal-open');
  renderMessageCenter();
  try {
    window.localStorage.setItem(messageReadKey(), new Date().toISOString());
  } catch {}
  updateMessageCount();
  closeMessageCenterButton.focus();
}

function closeMessageCenter() {
  messageCenterOverlay.hidden = true;
  messageCenterButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('modal-open');
  if (messageCenterReturnFocus instanceof HTMLElement) {
    messageCenterReturnFocus.focus();
  }
}

const maintenanceStatusLabels = {
  reported: 'Neu gemeldet',
  blocked: 'Gesperrt',
  repairing: 'In Reparatur',
  tested: 'Pr\u00fcfung bestanden',
  closed: 'Abgeschlossen'
};

const maintenanceEntryLabels = {
  report: 'Meldung',
  note: 'Notiz',
  block: 'Sperre',
  repair: 'Reparatur',
  test_passed: 'Funktionspr\u00fcfung bestanden',
  test_failed: 'Funktionspr\u00fcfung nicht bestanden',
  release: 'Freigabe und Abschluss'
};

function renderOwnMaintenanceCases(cases) {
  ownMaintenanceCases.innerHTML = '';
  if (!cases.length) {
    ownMaintenanceCases.innerHTML = '<p class="muted">Du hast noch keine St\u00f6rung gemeldet.</p>';
    return;
  }
  for (const item of cases.slice(0, 8)) {
    const row = document.createElement('div');
    row.className = 'own-maintenance-item';
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.resource_name || 'Nicht mehr vorhandene Ressource')}</strong>
        <span>${escapeHtml(item.title)}</span>
      </div>
      <span class="maintenance-status status-${escapeHtml(item.status)}">${escapeHtml(maintenanceStatusLabels[item.status] || item.status)}</span>
    `;
    ownMaintenanceCases.append(row);
  }
}

async function openReportIssue() {
  closeAccountMenu();
  try {
    const [resourceData, caseData] = await Promise.all([
      api('/api/maintenance-resources'),
      api('/api/maintenance-cases')
    ]);
    reportIssueResource.innerHTML = '';
    for (const resource of resourceData.resources) {
      const option = document.createElement('option');
      option.value = String(resource.id);
      option.textContent = `${resource.name}${resource.active ? '' : ' (bereits gesperrt)'}`;
      reportIssueResource.append(option);
    }
    renderOwnMaintenanceCases(caseData.cases);
    reportIssueOverlay.hidden = false;
    document.body.classList.add('modal-open');
    reportIssueResource.focus();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function closeReportIssue() {
  reportIssueOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  reportIssueButton.focus();
}

async function submitIssueReport() {
  const submitButton = reportIssueForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const data = await api('/api/maintenance-cases', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: Number(reportIssueResource.value),
        title: reportIssueSubject.value,
        description: reportIssueDescription.value
      })
    });
    reportIssueForm.reset();
    closeReportIssue();
    showStatus(data.message);
    rememberNotice(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

function openAccountMenu() {
  const open = accountMenuPanel.hidden;
  accountMenuPanel.hidden = !open;
  accountMenuButton.setAttribute('aria-expanded', String(open));
}

function closeAccountMenu() {
  accountMenuPanel.hidden = true;
  accountMenuButton.setAttribute('aria-expanded', 'false');
}

function showBookingFlowStatus(message, tone = 'error') {
  bookingFlowNotice.textContent = message;
  bookingFlowNotice.className = `booking-flow-notice notice ${tone}`;
  bookingFlowNotice.hidden = !message;
  if (message) {
    window.requestAnimationFrame(() => {
      bookingFlowNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (tone === 'error') bookingFlowNotice.focus({ preventScroll: true });
    });
  }
}

function clearBookingFlowStatus() {
  showBookingFlowStatus('', 'muted');
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
  if (settingsOverlay.hidden) document.body.classList.remove('modal-open');
  if (introReturnFocus instanceof HTMLElement) {
    introReturnFocus.focus();
  }
}

function settingsStorageKey() {
  return currentUser ? `waschzeit-personal-setup-${currentUser.id}` : 'waschzeit-personal-setup';
}

function settingsCompleted() {
  try {
    return window.localStorage.getItem(settingsStorageKey()) === 'done';
  } catch {
    return false;
  }
}

function markSettingsCompleted() {
  try {
    window.localStorage.setItem(settingsStorageKey(), 'done');
  } catch {}
}

function pushIsActive() {
  return pushStatusText.textContent.includes('auf diesem Geraet aktiv');
}

function renderSettingsSummary() {
  if (!currentUser) return;
  const emailReady = Boolean(currentUser.email && currentUser.emailVerified);
  const installReady = appInstalled();
  const pushReady = pushIsActive();
  const completedCount = [emailReady, installReady, pushReady].filter(Boolean).length;
  settingsProgressText.textContent = `${completedCount} von 3 Schritten erledigt.`;
  const items = [
    {
      label: 'E-Mail',
      value: !currentUser.email ? 'fehlt' : currentUser.emailVerified ? 'bestaetigt' : 'bestaetigen'
    },
    {
      label: 'App',
      value: installReady ? 'installiert' : 'optional'
    },
    {
      label: 'Push',
      value: pushReady ? 'aktiv' : 'nicht aktiv'
    }
  ];
  settingsSummary.innerHTML = items.map((item) => (
    `<span><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.value)}</span>`
  )).join('');
}

function setSettingsSection(sectionName) {
  if (!settingsPanels.some((panel) => panel.dataset.settingsSection === sectionName)) return;
  activeSettingsSection = sectionName;
  for (const button of settingsTabButtons) {
    const active = button.dataset.settingsTarget === sectionName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  }
  for (const panel of settingsPanels) {
    panel.hidden = panel.dataset.settingsSection !== sectionName;
  }
}

function openSettings(firstRun = false) {
  closeAccountMenu();
  settingsReturnFocus = document.activeElement;
  settingsEyebrow.textContent = firstRun ? 'Erster Start' : 'Dein Konto';
  settingsTitle.textContent = firstRun ? 'Einmal kurz einrichten.' : 'Einstellungen';
  settingsIntroText.textContent = firstRun
    ? 'Pruefe zuerst deine E-Mail. App, Push und weitere Kontofunktionen findest du anschliessend in den Reitern.'
    : 'Profil, Benachrichtigungen, App, Hilfe und Sicherheit sind hier gebuendelt.';
  settingsUsername.value = currentUser.displayName || currentUser.username;
  settingsApartmentLabel.value = currentUser.apartmentLabel || '';
  settingsApartmentLabelWrap.hidden = !currentUser.apartmentLabel;
  nameCorrectionPanel.hidden = currentUser.role !== 'user' || !currentUser.apartmentLabel;
  requestedDisplayName.value = currentUser.displayName || '';
  settingsRole.value = currentRoleLabel();
  settingsBookingMode.value = bookingMode;
  apartmentAccountStatus.textContent = currentUser.apartmentLabel
    ? `Wohnungskonto: ${currentUser.apartmentLabel}`
    : currentUser.role === 'user' ? 'Wohnung noch nicht zugeordnet.' : 'Admin-Konto ohne Wohnungszuordnung.';
  openApartmentSetupButton.hidden = !currentUser.apartmentSetupRequired;
  setSettingsSection(firstRun ? 'profile' : activeSettingsSection);
  settingsOverlay.hidden = false;
  document.body.classList.add('modal-open');
  renderSettingsSummary();
  closeSettingsButton.focus();
}

function closeSettings() {
  settingsOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  if (settingsReturnFocus instanceof HTMLElement) {
    settingsReturnFocus.focus();
  }
}

function finishSettings() {
  markSettingsCompleted();
  closeSettings();
  showStatus('Persoenliche Einrichtung gespeichert.');
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

function sessionLoginUrl(expired = false) {
  return expired ? '/login.html?sessionExpired=1' : '/login.html';
}

function clearSessionTimers() {
  window.clearTimeout(sessionWarningTimer);
  window.clearTimeout(sessionExpiryTimer);
  window.clearInterval(sessionCountdownTimer);
  sessionWarningTimer = null;
  sessionExpiryTimer = null;
  sessionCountdownTimer = null;
}

function hideSessionWarning(restoreFocus = false) {
  sessionWarningOverlay.hidden = true;
  window.clearInterval(sessionCountdownTimer);
  sessionCountdownTimer = null;
  if (restoreFocus && sessionReturnFocus instanceof HTMLElement) {
    sessionReturnFocus.focus();
  }
  sessionReturnFocus = null;
}

function sessionRemainingMs() {
  return Math.max(0, sessionIdleTimeoutMs - (Date.now() - sessionLastActivityAt));
}

function updateSessionCountdown() {
  const remainingSeconds = Math.max(0, Math.ceil(sessionRemainingMs() / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  sessionCountdown.textContent = `Abmeldung in ${minutes}:${seconds} Minuten`;
}

async function endInactiveSession() {
  if (sessionEnding) return;
  sessionEnding = true;
  clearSessionTimers();
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
  } catch {}
  window.location.replace(sessionLoginUrl(true));
}

function showSessionWarning() {
  if (sessionEnding || !currentUser || !sessionWarningOverlay.hidden) return;
  sessionReturnFocus = document.activeElement;
  sessionWarningOverlay.hidden = false;
  updateSessionCountdown();
  sessionCountdownTimer = window.setInterval(updateSessionCountdown, 1000);
  sessionStayButton.focus();
}

function scheduleSessionTimeout() {
  clearSessionTimers();
  if (!currentUser || !sessionIdleTimeoutMs || sessionEnding) return;
  const remainingMs = sessionRemainingMs();
  if (remainingMs <= 0) {
    endInactiveSession();
    return;
  }
  sessionWarningTimer = window.setTimeout(showSessionWarning, Math.max(0, remainingMs - sessionWarningMs));
  sessionExpiryTimer = window.setTimeout(endInactiveSession, remainingMs);
}

async function keepSessionAlive(force = false) {
  if (!currentUser || sessionEnding) return false;
  if (sessionKeepalivePromise) {
    return force ? sessionKeepalivePromise : false;
  }
  const now = Date.now();
  if (!force && now - sessionLastKeepaliveAt < sessionKeepaliveIntervalMs) return false;
  sessionKeepalivePromise = (async () => {
    try {
      const response = await fetch('/api/session/keepalive', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.replace(sessionLoginUrl(data.code === 'SESSION_IDLE_TIMEOUT'));
        return false;
      }
      if (!response.ok) return false;
      sessionLastKeepaliveAt = Date.now();
      sessionLastActivityAt = sessionLastKeepaliveAt;
      scheduleSessionTimeout();
      return true;
    } catch {
      // Eine kurze Verbindungsunterbrechung beendet die lokale Sitzung nicht vorzeitig.
      return false;
    }
  })();
  try {
    return await sessionKeepalivePromise;
  } finally {
    sessionKeepalivePromise = null;
  }
}

function recordSessionActivity(event) {
  if (!event.isTrusted) return;
  if (!currentUser || sessionEnding || !sessionWarningOverlay.hidden) return;
  const now = Date.now();
  if (now - sessionActivityThrottleAt < 1000) return;
  sessionActivityThrottleAt = now;
  sessionLastActivityAt = now;
  scheduleSessionTimeout();
  keepSessionAlive();
}

function checkSessionDeadline() {
  if (!currentUser || sessionEnding) return;
  const remainingMs = sessionRemainingMs();
  if (remainingMs <= 0) {
    endInactiveSession();
    return;
  }
  if (!sessionWarningOverlay.hidden) {
    updateSessionCountdown();
    window.clearTimeout(sessionExpiryTimer);
    sessionExpiryTimer = window.setTimeout(endInactiveSession, remainingMs);
    return;
  }
  scheduleSessionTimeout();
}

function configureSessionTimeout(sessionConfig = {}) {
  sessionIdleTimeoutMs = Number(sessionConfig.idleTimeoutMs || 0);
  sessionWarningMs = Number(sessionConfig.warningMs || 0);
  sessionLastActivityAt = Number(sessionConfig.lastActivityAt || Date.now());
  sessionLastKeepaliveAt = sessionLastActivityAt;
  if (!sessionActivityListenersReady) {
    sessionActivityListenersReady = true;
    document.addEventListener('pointerdown', recordSessionActivity, { passive: true });
    document.addEventListener('keydown', recordSessionActivity);
    document.addEventListener('touchstart', recordSessionActivity, { passive: true });
    document.addEventListener('scroll', recordSessionActivity, { passive: true, capture: true });
    window.addEventListener('focus', checkSessionDeadline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkSessionDeadline();
    });
  }
  scheduleSessionTimeout();
}

function formatReleaseDate(value) {
  if (!value) return 'Datum unbekannt';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function bookingSelectionInProgress() {
  return Boolean(
    bookingFlowState.washerIds?.length
    || bookingFlowState.dryingResourceId
    || bookingFlowState.tumblerResourceId
    || (bookingFlowState.slot && bookingFlowState.step > 1)
  );
}

function syncModalStateAfterMaintenance() {
  const anotherModalOpen = [
    settingsOverlay,
    introOverlay,
    messageCenterOverlay,
    releaseNoticeOverlay,
    apartmentSetupOverlay,
    sessionWarningOverlay
  ].some((overlay) => overlay && !overlay.hidden);
  document.body.classList.toggle('modal-open', anotherModalOpen);
}

function applyMaintenanceStatus(maintenance = {}) {
  const active = Boolean(maintenance.active);
  if (!active) {
    maintenanceOverlay.hidden = true;
    syncModalStateAfterMaintenance();
    return;
  }
  maintenanceText.textContent = maintenance.message
    || 'WaschZeit wird gerade sicher aktualisiert. Deine bestehenden Buchungen bleiben erhalten.';
  if (currentUser?.role === 'admin') {
    maintenanceOverlay.hidden = true;
    syncModalStateAfterMaintenance();
    return;
  }
  openMaintenanceAdminButton.hidden = true;
  maintenanceOverlay.hidden = false;
  document.body.classList.add('modal-open');
}

function renderReleaseStatus(status = latestReleaseStatus) {
  const version = status?.version || loadedAppVersion;
  const releasedAt = status?.releasedAt || loadedAppReleasedAt;
  appVersionText.textContent = `Version ${version} - Stand ${formatReleaseDate(releasedAt)}`;
  const updateAvailable = Boolean(status?.release && status.release !== loadedAppRelease);
  appUpdateNotice.hidden = !updateAvailable;
  if (updateAvailable) {
    appUpdateText.textContent = bookingSelectionInProgress()
      ? 'Deine Auswahl bleibt offen. Nach Abschluss der Buchung wird aktualisiert.'
      : `Version ${version} kann jetzt geladen werden.`;
  }
  applyMaintenanceStatus(status?.maintenance || {});
}

async function checkAppVersion({ manual = false } = {}) {
  if (manual) checkAppUpdateButton.disabled = true;
  try {
    const response = await fetch('/api/version', { cache: 'no-store' });
    if (!response.ok) throw new Error('Versionsstatus konnte nicht geladen werden.');
    latestReleaseStatus = await response.json();
    renderReleaseStatus();
    if (manual) {
      showStatus(latestReleaseStatus.release === loadedAppRelease
        ? 'Du verwendest bereits die aktuelle Version.'
        : 'Eine neue Version ist bereit.');
    }
    return latestReleaseStatus;
  } catch (error) {
    if (manual) showStatus(error.message, 'error');
    return null;
  } finally {
    if (manual) checkAppUpdateButton.disabled = false;
  }
}

async function performAppUpdate() {
  updateAppButton.disabled = true;
  updateAppButton.textContent = 'Aktualisiere...';
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
      if (registration?.waiting) {
        const controllerChanged = new Promise((resolve) => {
          const timeout = window.setTimeout(resolve, 2000);
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        await controllerChanged;
      }
    }
  } finally {
    window.location.reload();
  }
}

async function requestAppUpdate() {
  if (bookingSelectionInProgress()) {
    updateReloadApproved = true;
    appUpdateText.textContent = 'Aktualisierung vorgemerkt. Sie startet automatisch, sobald deine Buchung abgeschlossen oder verworfen ist.';
    showBookingFlowNotice('Die neue Version wird erst nach deiner aktuellen Auswahl geladen.', 'info');
    bookingFlow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  await performAppUpdate();
}

function scheduleAppVersionChecks() {
  window.clearInterval(appVersionPollTimer);
  appVersionPollTimer = window.setInterval(() => checkAppVersion(), 2 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkAppVersion();
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_ACTIVATED') checkAppVersion();
    });
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
  } catch {
    throw new Error('Keine Verbindung zur App. Bitte pr\u00fcfe deine Internetverbindung und versuche es erneut.');
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.replace(sessionLoginUrl(data.code === 'SESSION_IDLE_TIMEOUT'));
    return null;
  }
  if (response.status === 503 && data.code === 'MAINTENANCE_MODE') {
    applyMaintenanceStatus(data.maintenance || { active: true, message: data.error });
  }
  if (!response.ok) {
    throw new Error(data.error || 'Anfrage fehlgeschlagen');
  }
  return data;
}

async function init() {
  bookingDate.value = todayString();
  syncCalendarPeriod(bookingDate.value);
  const me = await api('/api/me');
  if (!me || !me.user) {
    window.location.href = '/login.html';
    return;
  }

  currentUser = me.user;
  reportIssueButton.hidden = currentUser.role !== 'user';
  await checkAppVersion();
  scheduleAppVersionChecks();
  configureSessionTimeout(me.session);
  bookingMode = currentUser.bookingMode === 'machine' ? 'machine' : 'time';
  availableHouses = me.houses || [];
  renderHouseContext();
  renderMessageCenter();
  notificationEmail.value = currentUser.email || '';
  secondaryNotificationEmail.value = currentUser.secondaryEmail || '';
  notifyReleasesInput.checked = currentUser.notifyReleases !== false;
  notificationResourceType.value = me.notificationPreferences?.resourceType || 'all';
  notificationWeekday.value = String(me.notificationPreferences?.weekday || '');
  notificationSlot.value = me.notificationPreferences?.slot || '';
  renderEmailVerificationStatus();
  renderInstallStatus();
  await renderPushStatus();
  renderSettingsSummary();
  apartmentSetupOverlay.hidden = !currentUser.apartmentSetupRequired;
  if (currentUser.apartmentSetupRequired) document.body.classList.add('modal-open');

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
  if (pageUrl.searchParams.get('notice')) {
    await openReleaseNoticeFromUrl(pageUrl);
  }
  if (pageUrl.searchParams.get('welcome') === '1') {
    openSettings(!settingsCompleted());
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

function setAdminTabCount(element, count) {
  const safeCount = Math.max(0, Number(count || 0));
  element.hidden = safeCount === 0;
  element.textContent = safeCount > 99 ? '99+' : String(safeCount);
}

function renderAdminWorkQueue({ overview, recovery, apartments, resources: adminResourceItems, cases }) {
  const openCases = cases.filter((item) => item.status !== 'closed');
  const reportedCases = openCases.filter((item) => item.status === 'reported');
  const blockedResources = adminResourceItems.filter((item) => !item.active);
  const nameRequests = apartments.filter((item) => item.name_request_id);
  const recoveryWarnings = recovery.warnings || [];
  const tasks = [];

  if (reportedCases.length) {
    tasks.push({
      level: 'urgent',
      title: `${reportedCases.length} neue ${reportedCases.length === 1 ? 'St\u00f6rung' : 'St\u00f6rungen'} pr\u00fcfen`,
      text: 'Meldung lesen, bei Bedarf sperren und den n\u00e4chsten Schritt dokumentieren.',
      section: 'logbook'
    });
  } else if (openCases.length) {
    tasks.push({
      level: 'attention',
      title: `${openCases.length} offene ${openCases.length === 1 ? 'Tagebuchaufgabe' : 'Tagebuchaufgaben'}`,
      text: 'Reparatur, Funktionspr\u00fcfung oder Freigabe nachvollziehbar fortf\u00fchren.',
      section: 'logbook'
    });
  }

  if (nameRequests.length) {
    tasks.push({
      level: 'attention',
      title: `${nameRequests.length} ${nameRequests.length === 1 ? 'Namenskorrektur' : 'Namenskorrekturen'} entscheiden`,
      text: 'Klingelschild-Vorschlag pr\u00fcfen und anschliessend \u00fcbernehmen oder ablehnen.',
      section: 'people'
    });
  }

  if (overview.usersMissingEmail) {
    tasks.push({
      level: 'attention',
      title: `${overview.usersMissingEmail} ${overview.usersMissingEmail === 1 ? 'Konto' : 'Konten'} ohne E-Mail`,
      text: 'Identitaet persoenlich pruefen und bei Bedarf einen kurz gueltigen Wiederherstellungscode ausgeben.',
      section: 'people'
    });
  }

  if (blockedResources.length && !openCases.length) {
    tasks.push({
      level: 'attention',
      title: `${blockedResources.length} gesperrte ${blockedResources.length === 1 ? 'Ressource' : 'Ressourcen'}`,
      text: 'Sperren bleiben bis zur dokumentierten Funktionspr\u00fcfung und Freigabe bestehen.',
      section: 'logbook'
    });
  }

  if (currentUser.isSuperadmin && recoveryWarnings.length) {
    tasks.push({
      level: recoveryWarnings.some((item) => item.level === 'critical') ? 'urgent' : 'attention',
      title: 'Admin-Nachfolge absichern',
      text: recoveryWarnings[0].message,
      section: 'system'
    });
  }

  if (currentUser.isSuperadmin && !overview.externalBackupConfigured) {
    tasks.push({
      level: 'attention',
      title: 'Externes Backup einrichten',
      text: 'Die lokale Sicherung sch\u00fctzt nicht vor einem Ausfall des Render-Datentr\u00e4gers.',
      section: 'system'
    });
  }

  if (currentUser.isSuperadmin && !overview.email.configured) {
    tasks.push({
      level: 'attention',
      title: 'E-Mail-Versand einrichten',
      text: 'SMTP in Render vervollst\u00e4ndigen und danach eine Testmail senden.',
      section: 'system'
    });
  }

  adminTaskSummary.textContent = tasks.length
    ? `${tasks.length} ${tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} offen`
    : 'Keine dringenden Aufgaben';
  adminTaskList.innerHTML = tasks.length
    ? tasks.slice(0, 6).map((task) => `
      <button class="admin-task-item is-${task.level}" type="button" data-admin-jump="${task.section}">
        <span class="admin-task-state" aria-hidden="true"></span>
        <span class="admin-task-copy">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.text)}</span>
        </span>
        <span class="admin-task-open">\u00d6ffnen</span>
      </button>
    `).join('')
    : `
      <div class="admin-task-empty">
        <strong>Alles im ruhigen Betrieb</strong>
        <span>Keine neue St\u00f6rung, Kontowarnung oder Systemaufgabe wartet auf dich.</span>
      </div>
    `;

  const responsibilities = currentUser.isSuperadmin
    ? [
        'Haus-Admins, Rollen und Nachfolge absichern',
        'H\u00e4user und technische Ressourcen verwalten',
        'Tagebuchf\u00e4lle haus\u00fcbergreifend kontrollieren',
        'Backups, Wartung und Systembetrieb verantworten',
        'Im gew\u00e4hlten Haus nur bei Bedarf eingreifen'
      ]
    : [
        'Wohnungen aktivieren und Konten betreuen',
        'Ger\u00e4te und R\u00e4ume anlegen oder sperren',
        'St\u00f6rungen bis zur Freigabe dokumentieren',
        'Begr\u00fcndete Dauertermine pflegen',
        'Betrieb des eigenen Hauses im Blick behalten'
      ];
  adminResponsibilityScope.textContent = currentUser.isSuperadmin
    ? 'Alle H\u00e4user. Alltagsaktionen gelten f\u00fcr das oben ausgew\u00e4hlte Haus.'
    : 'Nur dieses Haus. Bewohner buchen ihre normalen Waschzeiten selbst.';
  adminResponsibilityList.innerHTML = responsibilities
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  setAdminTabCount(adminLogbookCount, openCases.length);
  setAdminTabCount(adminPeopleCount, Number(overview.usersMissingEmail || 0) + nameRequests.length);
  setAdminTabCount(adminHouseCount, blockedResources.length);
  setAdminTabCount(
    adminSystemCount,
    currentUser.isSuperadmin
      ? recoveryWarnings.length
        + (!overview.externalBackupConfigured ? 1 : 0)
        + (!overview.email.configured ? 1 : 0)
      : 0
  );
}

function renderEmailVerificationStatus() {
  const configuredAddress = Boolean(currentUser.email);
  emailVerificationStatus.textContent = !configuredAddress
    ? 'E-Mail ist Pflicht: Bitte Adresse eintragen, sonst ist kein Passwort-Reset moeglich.'
    : currentUser.emailVerified
      ? 'E-Mail-Adresse best\u00e4tigt.'
      : 'Bitte E-Mail-Adresse bestaetigen. Bis dahin sind Passwort-Reset per Mail und Hinweise nicht vollstaendig nutzbar.';
  emailVerificationStatus.classList.toggle('is-verified', Boolean(currentUser.emailVerified));
  resendVerificationButton.hidden = !configuredAddress || Boolean(currentUser.emailVerified);
  const secondaryConfigured = Boolean(currentUser.secondaryEmail);
  secondaryEmailVerificationStatus.textContent = !secondaryConfigured
    ? 'Optional: Eine zweite Person kann eine eigene Adresse f\u00fcr Reset und Hinweise hinterlegen.'
    : currentUser.secondaryEmailVerified
      ? 'Zweite E-Mail-Adresse best\u00e4tigt.'
      : 'Bitte auch die zweite E-Mail-Adresse best\u00e4tigen.';
  secondaryEmailVerificationStatus.classList.toggle('is-verified', Boolean(currentUser.secondaryEmailVerified));
  resendSecondaryVerificationButton.hidden = !secondaryConfigured || Boolean(currentUser.secondaryEmailVerified);
  renderSettingsSummary();
}

function appInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isiOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
}

function renderInstallStatus() {
  if (appInstalled()) {
    installHelpText.textContent = 'WaschZeit ist auf diesem Geraet bereits als App geoeffnet.';
    installAppButton.hidden = true;
    renderSettingsSummary();
    return;
  }
  installAppButton.hidden = false;
  if (deferredInstallPrompt) {
    installHelpText.textContent = 'Du kannst WaschZeit direkt auf diesem Geraet installieren.';
    installAppButton.disabled = false;
    installAppButton.textContent = 'App installieren';
    renderSettingsSummary();
    return;
  }
  if (isiOS()) {
    installHelpText.textContent = 'iPhone/iPad: Im Safari-Teilen-Menue "Zum Home-Bildschirm" waehlen.';
    installAppButton.disabled = true;
    installAppButton.textContent = 'Safari-Teilen-Menue nutzen';
    renderSettingsSummary();
    return;
  }
  installHelpText.textContent = 'Wenn dein Browser die Installation anbietet, erscheint hier der Installationsbutton. Sonst Browser-Menue verwenden.';
  installAppButton.disabled = true;
  renderSettingsSummary();
}

async function installApp() {
  if (!deferredInstallPrompt) {
    renderInstallStatus();
    return;
  }
  installAppButton.disabled = true;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
  if (choice?.outcome === 'accepted') {
    showStatus('WaschZeit wurde als App installiert.');
  } else {
    showStatus('Installation wurde nicht abgeschlossen.');
  }
  renderInstallStatus();
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  return navigator.serviceWorker.register('/sw.js');
}

async function currentPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function renderPushStatus() {
  if (!pushSupported()) {
    pushStatusText.textContent = 'Dieses Geraet unterstuetzt Web-Push leider nicht.';
    enablePushButton.disabled = true;
    disablePushButton.hidden = true;
    renderSettingsSummary();
    return;
  }
  try {
    await registerServiceWorker();
    const pushConfig = await api('/api/push/public-key');
    if (!pushConfig.configured) {
      pushStatusText.textContent = 'Push ist auf dem Server noch nicht bereit.';
      enablePushButton.disabled = true;
      disablePushButton.hidden = true;
      renderSettingsSummary();
      return;
    }
    const subscription = await currentPushSubscription();
    const permission = Notification.permission;
    if (subscription && permission === 'granted') {
      pushStatusText.textContent = 'Push ist auf diesem Geraet aktiv.';
      enablePushButton.textContent = 'Push erneut verbinden';
      enablePushButton.disabled = false;
      disablePushButton.hidden = false;
      renderSettingsSummary();
      return;
    }
    if (permission === 'denied') {
      pushStatusText.textContent = 'Push wurde im Browser blockiert. Bitte in den Website-Einstellungen erlauben.';
      enablePushButton.disabled = true;
      disablePushButton.hidden = true;
      renderSettingsSummary();
      return;
    }
    pushStatusText.textContent = 'Push ist bereit, aber auf diesem Geraet noch nicht aktiviert.';
    enablePushButton.textContent = 'Push aktivieren';
    enablePushButton.disabled = false;
    disablePushButton.hidden = true;
  } catch (error) {
    pushStatusText.textContent = error.message;
    enablePushButton.disabled = true;
    disablePushButton.hidden = true;
  }
  renderSettingsSummary();
}

async function enablePushNotifications() {
  if (!pushSupported()) {
    showStatus('Dieses Geraet unterstuetzt Web-Push leider nicht.', 'error');
    return;
  }
  enablePushButton.disabled = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showStatus('Push wurde nicht erlaubt. Du kannst es spaeter in den Browser-Einstellungen aktivieren.', 'error');
      await renderPushStatus();
      return;
    }
    const registration = await registerServiceWorker();
    const pushConfig = await api('/api/push/public-key');
    if (!pushConfig.configured || !pushConfig.publicKey) {
      throw new Error('Push ist auf dem Server noch nicht bereit.');
    }
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey)
      });
    }
    const data = await api('/api/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ subscription })
    });
    showStatus(data.message || 'Push-Hinweise sind aktiv.');
    await renderPushStatus();
  } catch (error) {
    showStatus(error.message, 'error');
    await renderPushStatus();
  } finally {
    enablePushButton.disabled = false;
  }
}

async function disablePushNotifications() {
  try {
    const subscription = await currentPushSubscription();
    await api('/api/push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription?.endpoint || '' })
    });
    if (subscription) {
      await subscription.unsubscribe();
    }
    showStatus('Push-Hinweise wurden auf diesem Geraet deaktiviert.');
    await renderPushStatus();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function renderHouseContext() {
  const roleLabel = currentRoleLabel();
  userLine.textContent = roleLabel;
  const accountLabel = currentUser.displayName || currentUser.username;
  accountMenuName.textContent = accountLabel;
  accountMenuRole.textContent = roleLabel;
  accountPanelName.textContent = accountLabel;
  accountPanelMeta.textContent = `${roleLabel} - ${currentUser.houseName}${currentUser.apartmentLabel ? ` - ${currentUser.apartmentLabel}` : ''}`;
  settingsUsername.value = accountLabel;
  settingsApartmentLabel.value = currentUser.apartmentLabel || '';
  settingsApartmentLabelWrap.hidden = !currentUser.apartmentLabel;
  nameCorrectionPanel.hidden = currentUser.role !== 'user' || !currentUser.apartmentLabel;
  settingsRole.value = roleLabel;
  settingsBookingMode.value = bookingMode;
  brandHouseName.textContent = currentUser.houseName;
  brandHouseName.title = `Aktuelles Haus: ${currentUser.houseName}`;
  document.title = `WaschZeit | ${currentUser.houseName}`;
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

function currentRoleLabel() {
  return currentUser.isSuperadmin
    ? 'Superadmin'
    : currentUser.role === 'admin'
      ? 'Haus-Admin'
      : 'Bewohner';
}

async function refreshCurrentUser() {
  const data = await api('/api/me');
  currentUser = data.user;
  availableHouses = data.houses || [];
  renderHouseContext();
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
  await loadBookingFlowOptions();
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
  releaseNoticeItems = data.notices || [];
  renderMessageCenter();
}

async function loadCalendar() {
  const days = calendarView === 'month' ? 42 : 7;
  const data = await api(`/api/calendar?from=${encodeURIComponent(calendarStartDate)}&days=${days}`);
  calendarDays = data.days;
  renderCalendar();
}

async function loadRecommendation() {
  const data = await api('/api/recommendation');
  currentRecommendation = data.recommendation;
  renderRecommendation();
  if (calendarDays.length) renderCalendar();
}

const calendarResourceTypes = [
  { type: 'washer', label: 'Waschmaschinen', shortLabel: 'WM' },
  { type: 'drying_room', label: 'Trockenr\u00e4ume', shortLabel: 'TR' },
  { type: 'tumbler', label: 'Tumbler', shortLabel: 'TU' }
];

function availabilityForDay(day, type = 'washer') {
  return day.availability[type] || { free: 0, total: 0, freeSlots: 0, totalSlots: 0 };
}

function calendarAvailabilityState(day, type) {
  const availability = availabilityForDay(day, type);
  if (day.closed || day.date < todayString() || availability.total === 0) return 'muted';
  if (availability.free === 0) return 'full';
  if (availability.free >= availability.total) return 'free';
  return 'partial';
}

function calendarAvailabilityText(day, type) {
  const availability = availabilityForDay(day, type);
  if (day.closed) return 'Ruhetag';
  if (day.date < todayString() || availability.total === 0) return 'nicht verf\u00fcgbar';
  if (availability.free === 0) return 'vollst\u00e4ndig belegt';
  if (availability.free >= availability.total) return 'frei';
  return `${availability.free} von ${availability.total} frei`;
}

function renderCalendarStatusRows(day) {
  return calendarResourceTypes.map(({ type, label, shortLabel }) => {
    const availability = availabilityForDay(day, type);
    const state = calendarAvailabilityState(day, type);
    const text = calendarAvailabilityText(day, type);
    const percent = availability.total ? Math.round((availability.free / availability.total) * 100) : 0;
    return `
      <span class="calendar-status is-${state}" aria-label="${escapeHtml(label)}: ${escapeHtml(text)}">
        <span class="calendar-status-label"><span class="calendar-status-label-full">${escapeHtml(label)}</span><span class="calendar-status-label-short">${shortLabel}</span></span>
        <span class="calendar-status-track" aria-hidden="true"><span style="width:${percent}%"></span></span>
        <span class="calendar-status-value">${availability.free}/${availability.total}</span>
      </span>
    `;
  }).join('');
}

function calendarResourceStateLabel(state) {
  return {
    free: 'frei',
    booked: 'belegt',
    own: 'deine Buchung',
    reserve: 'bleibt frei',
    closed: 'Ruhetag',
    past: 'vorbei'
  }[state] || state;
}

function calendarSlotTypeMarkup(day, slotDetail, typeMeta) {
  const detail = slotDetail.types[typeMeta.type];
  const canStartWasher = typeMeta.type === 'washer'
    && !day.closed
    && !slotDetail.past
    && day.ownByType.washer === 0;
  const resourcesMarkup = detail.resources.map((resource) => {
    const stateLabel = calendarResourceStateLabel(resource.state);
    if (canStartWasher && resource.state === 'free') {
      return `<button class="calendar-resource is-free" type="button" data-calendar-book-washer="${resource.resourceId}" data-calendar-date="${day.date}" data-calendar-slot="${slotDetail.slot}"><span>${escapeHtml(resource.resourceName)}</span><strong>Ausw\u00e4hlen</strong></button>`;
    }
    return `<span class="calendar-resource is-${resource.state}"><span>${escapeHtml(resource.resourceName)}</span><strong>${escapeHtml(stateLabel)}</strong></span>`;
  }).join('');
  const capacityText = typeMeta.type === 'tumbler'
    ? `${detail.free} weitere Buchung${detail.free === 1 ? '' : 'en'} m\u00f6glich, einer bleibt frei`
    : `${detail.free} von ${detail.total} frei`;
  return `
    <div class="calendar-slot-type">
      <div class="calendar-slot-type-head"><strong>${escapeHtml(typeMeta.label)}</strong><span>${escapeHtml(capacityText)}</span></div>
      <div class="calendar-resource-list">${resourcesMarkup || '<span class="muted">Keine Ger\u00e4te eingerichtet</span>'}</div>
    </div>
  `;
}

function clearCalendarPreviewTimers() {
  window.clearTimeout(calendarPreviewTimer);
  window.clearTimeout(calendarPreviewCloseTimer);
  calendarPreviewTimer = null;
  calendarPreviewCloseTimer = null;
}

function positionCalendarDayDetails() {
  if (calendarDayDetails.hidden || !calendarDetailAnchor || window.innerWidth <= 760) return;
  const anchorRect = calendarDetailAnchor.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(720, window.innerWidth - (margin * 2));
  calendarDayDetails.style.width = `${width}px`;
  const detailHeight = Math.min(calendarDayDetails.scrollHeight, window.innerHeight - (margin * 2));
  const left = Math.max(margin, Math.min(
    window.innerWidth - width - margin,
    anchorRect.left + (anchorRect.width / 2) - (width / 2)
  ));
  const below = anchorRect.bottom + 10;
  const preferredTop = below + detailHeight <= window.innerHeight - margin
    ? below
    : Math.max(margin, anchorRect.top - detailHeight - 10);
  const top = Math.max(margin, Math.min(
    window.innerHeight - detailHeight - margin,
    preferredTop
  ));
  calendarDayDetails.style.left = `${left}px`;
  calendarDayDetails.style.top = `${top}px`;
}

function openCalendarPreview(day, anchor, { pinned = false } = {}) {
  clearCalendarPreviewTimers();
  calendarDetailAnchor?.classList.remove('is-previewed');
  calendarDetailAnchor?.setAttribute('aria-expanded', 'false');
  calendarDetailDate = day.date;
  calendarDetailAnchor = anchor;
  calendarDetailPinned = pinned;
  anchor.classList.add('is-previewed');
  anchor.setAttribute('aria-expanded', 'true');
  calendarDayDetailsBackdrop.hidden = false;
  renderCalendarDayDetails();
}

function scheduleCalendarPreview(day, anchor) {
  clearCalendarPreviewTimers();
  calendarPreviewTimer = window.setTimeout(() => {
    openCalendarPreview(day, anchor);
  }, 550);
}

function scheduleCalendarPreviewClose() {
  window.clearTimeout(calendarPreviewTimer);
  if (calendarDetailPinned) return;
  window.clearTimeout(calendarPreviewCloseTimer);
  calendarPreviewCloseTimer = window.setTimeout(() => {
    closeCalendarPreview();
  }, 180);
}

function closeCalendarPreview() {
  clearCalendarPreviewTimers();
  calendarDetailAnchor?.classList.remove('is-previewed');
  calendarDetailAnchor?.setAttribute('aria-expanded', 'false');
  calendarDetailDate = '';
  calendarDetailAnchor = null;
  calendarDetailPinned = false;
  calendarDayDetails.hidden = true;
  calendarDayDetailsBackdrop.hidden = true;
  calendarDayDetailsContent.innerHTML = '';
  calendarDayDetailsActions.innerHTML = '';
  calendarDayDetailsActions.hidden = true;
  calendarDayDetails.style.removeProperty('transform');
  calendarDayDetails.style.removeProperty('left');
  calendarDayDetails.style.removeProperty('top');
  calendarDayDetails.style.removeProperty('width');
}

function renderCalendarDayDetails() {
  const day = calendarDays.find((item) => item.date === calendarDetailDate);
  if (!day) {
    calendarDayDetails.hidden = true;
    calendarDayDetailsContent.innerHTML = '';
    return;
  }

  calendarDayDetails.hidden = false;
  calendarDayDetailsTitle.textContent = formatShortDate(day.date);
  const recommendedSlot = currentRecommendation?.date === day.date ? currentRecommendation.slot : '';
  const slotsMarkup = (day.slotDetails || []).map((slotDetail) => {
    const hasOwnBooking = calendarResourceTypes.some(({ type }) => (
      slotDetail.types[type]?.resources.some((resource) => resource.state === 'own')
    ));
    const slotNote = slotDetail.past
      ? '<span class="calendar-slot-note is-muted">Vorbei</span>'
      : recommendedSlot === slotDetail.slot
        ? '<span class="calendar-slot-note is-recommended">Empfohlen</span>'
        : hasOwnBooking
          ? '<span class="calendar-slot-note is-own">Deine Buchung</span>'
          : '';
    const ownAction = hasOwnBooking && !slotDetail.past
      ? `<button class="secondary calendar-open-package" type="button" data-calendar-open-package="${day.date}">Waschpaket erg\u00e4nzen</button>`
      : '';
    return `
      <section class="calendar-slot-detail${slotDetail.past ? ' is-past' : ''}">
        <div class="calendar-slot-detail-head"><h4>${escapeHtml(slotDetail.slot)}</h4>${slotNote}${ownAction}</div>
        <div class="calendar-slot-types">${calendarResourceTypes.map((meta) => calendarSlotTypeMarkup(day, slotDetail, meta)).join('')}</div>
      </section>
    `;
  }).join('');
  const openDayAction = !day.closed && day.date >= todayString()
    ? recommendedSlot
      ? `<button type="button" data-calendar-use-recommendation="${day.date}" data-calendar-slot="${recommendedSlot}">Empfohlenen Termin buchen</button>`
      : `<button type="button" data-calendar-open-day="${day.date}">Diesen Tag ausw\u00e4hlen und buchen</button>`
    : '';
  calendarDayDetailsContent.innerHTML = day.closed
    ? '<p class="calendar-detail-empty">Sonntag ist Ruhetag. An diesem Tag sind keine Buchungen m\u00f6glich.</p>'
    : slotsMarkup;
  calendarDayDetailsActions.innerHTML = openDayAction;
  calendarDayDetailsActions.hidden = !openDayAction;

  calendarDayDetails.querySelectorAll('[data-calendar-book-washer]').forEach((button) => {
    button.addEventListener('click', () => {
      const date = button.dataset.calendarDate;
      const slot = button.dataset.calendarSlot;
      const resourceId = Number(button.dataset.calendarBookWasher);
      closeCalendarPreview();
      startCalendarWasherBooking(date, slot, resourceId);
    });
  });
  calendarDayDetails.querySelectorAll('[data-calendar-open-package]').forEach((button) => {
    button.addEventListener('click', () => {
      const date = button.dataset.calendarOpenPackage;
      closeCalendarPreview();
      openCalendarPackage(date);
    });
  });
  calendarDayDetails.querySelectorAll('[data-calendar-open-day]').forEach((button) => {
    button.addEventListener('click', () => {
      const date = button.dataset.calendarOpenDay;
      closeCalendarPreview();
      openCalendarPackage(date);
    });
  });
  calendarDayDetails.querySelectorAll('[data-calendar-use-recommendation]').forEach((button) => {
    button.addEventListener('click', () => {
      const date = button.dataset.calendarUseRecommendation;
      const slot = button.dataset.calendarSlot;
      closeCalendarPreview();
      openRecommendedCalendarPackage(date, slot);
    });
  });
  positionCalendarDayDetails();
}

function renderCalendar() {
  weekCalendar.innerHTML = '';
  const monthView = calendarView === 'month';
  weekCalendar.classList.toggle('month-calendar', monthView);
  weekCalendar.setAttribute('aria-label', monthView ? 'Monatskalender' : 'Kalenderwoche');
  monthWeekdays.hidden = !monthView;
  weekViewButton.classList.toggle('active', !monthView);
  weekViewButton.setAttribute('aria-pressed', String(!monthView));
  monthViewButton.classList.toggle('active', monthView);
  monthViewButton.setAttribute('aria-pressed', String(monthView));

  const previousLabel = monthView ? 'Vorheriger Monat' : 'Vorherige Woche';
  const nextLabel = monthView ? 'Nächster Monat' : 'Nächste Woche';
  previousWeekButton.setAttribute('aria-label', previousLabel);
  previousWeekButton.title = previousLabel;
  nextWeekButton.setAttribute('aria-label', nextLabel);
  nextWeekButton.title = nextLabel;

  if (!calendarDays.length) {
    calendarRange.textContent = '';
    return;
  }

  calendarRange.textContent = monthView
    ? formatCalendarMonth(calendarAnchorDate)
    : formatCalendarRange(calendarDays[0].date, calendarDays[calendarDays.length - 1].date);
  previousWeekButton.disabled = monthView
    ? startOfMonth(calendarAnchorDate) <= startOfMonth(todayString())
    : calendarStartDate <= startOfWeek(todayString());

  for (const day of calendarDays) {
    const availability = availabilityForDay(day);
    const outsideMonth = monthView && day.date.slice(0, 7) !== calendarAnchorDate.slice(0, 7);
    const closed = Boolean(day.closed);
    const past = day.date < todayString();
    const recommended = currentRecommendation?.date === day.date;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.classList.toggle('is-month-day', monthView);
    button.classList.toggle('is-outside-month', outsideMonth);
    button.classList.toggle('is-closed', closed);
    button.classList.toggle('is-selected', day.date === bookingDate.value);
    button.classList.toggle('is-today', day.date === todayString());
    button.classList.toggle('has-own-booking', day.ownBookings > 0);
    button.classList.toggle('is-recommended', recommended);
    button.dataset.calendarDate = day.date;
    button.setAttribute('aria-disabled', String(past || closed));
    button.setAttribute('aria-pressed', String(day.date === bookingDate.value));
    button.setAttribute('aria-controls', 'calendarDayDetails');
    button.setAttribute('aria-expanded', String(day.date === calendarDetailDate));
    button.setAttribute(
      'aria-label',
      `${formatShortDate(day.date)}, ${closed ? 'Ruhetag' : `${availability.freeSlots} freie Waschzeiten`}, ${calendarResourceTypes.map(({ type, label }) => `${label}: ${calendarAvailabilityText(day, type)}`).join(', ')}${day.ownBookings ? `, ${day.ownBookings} eigene Buchungen` : ''}${recommended ? ', empfohlener Termin; antippen, um ihn direkt zu buchen' : ''}`
    );
    if (recommended) {
      button.title = 'Empfohlenen Termin direkt buchen';
    }
    const availabilityLabel = closed
      ? 'Ruhetag'
      : `${availability.freeSlots} ${availability.freeSlots === 1 ? 'Waschzeit' : 'Waschzeiten'} frei`;
    const dateLabel = monthView
      ? new Intl.DateTimeFormat('de-CH', { day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))
      : new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`));
    button.innerHTML = `
      <span class="calendar-weekday">${new Intl.DateTimeFormat('de-CH', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</span>
      <strong>${dateLabel}</strong>
      <span class="calendar-availability">${closed ? availabilityLabel : availability.totalSlots ? availabilityLabel : 'vorbei'}</span>
      <span class="calendar-status-list">${renderCalendarStatusRows(day)}</span>
      ${recommended ? '<span class="calendar-recommended" aria-hidden="true"><span>Empfohlen</span><b>Buchen</b></span>' : ''}
      ${day.ownBookings ? `<span class="calendar-own">${day.ownBookings} eigene</span>` : ''}
    `;
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') scheduleCalendarPreview(day, button);
    });
    button.addEventListener('pointerdown', () => {
      calendarPointerFocus = true;
    });
    button.addEventListener('pointercancel', () => {
      calendarPointerFocus = false;
    });
    button.addEventListener('pointerup', () => {
      window.setTimeout(() => {
        calendarPointerFocus = false;
      }, 0);
    });
    button.addEventListener('pointerleave', () => {
      scheduleCalendarPreviewClose();
    });
    button.addEventListener('focus', () => {
      if (calendarPointerFocus) return;
      if (calendarPreviewSuppressFocus) {
        calendarPreviewSuppressFocus = false;
        return;
      }
      openCalendarPreview(day, button);
    });
    button.addEventListener('blur', () => {
      scheduleCalendarPreviewClose();
    });
    button.addEventListener('click', async () => {
      calendarPointerFocus = false;
      if (past || closed) {
        openCalendarPreview(day, button, { pinned: true });
        return;
      }
      if (recommended) {
        closeCalendarPreview();
        await openRecommendedCalendarPackage(day.date, currentRecommendation.slot);
        return;
      }
      if (window.matchMedia('(hover: none)').matches && !calendarDetailPinned) {
        openCalendarPreview(day, button, { pinned: true });
        return;
      }
      closeCalendarPreview();
      await openCalendarPackage(day.date);
    });
    weekCalendar.append(button);
  }
  if (calendarDetailDate) {
    calendarDetailAnchor = weekCalendar.querySelector(`[data-calendar-date="${calendarDetailDate}"]`);
    if (calendarDetailAnchor) renderCalendarDayDetails();
    else closeCalendarPreview();
  } else {
    calendarDayDetails.hidden = true;
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

function renderRecommendationLegacy() {
  bookingSuggestion.innerHTML = '';
  const recommendation = currentRecommendation;
  if (!recommendation) {
    bookingSuggestion.innerHTML = '<p class="muted">Noch keine pers\u00f6nliche Empfehlung verf\u00fcgbar.</p>';
    return;
  }

  const copy = document.createElement('div');
  copy.className = 'suggestion-copy';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'suggestion-label';
  eyebrow.textContent = 'Pers\u00f6nliche Empfehlung';
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

function bookingStageOrder() {
  return bookingMode === 'time'
    ? ['time', 'washer', 'drying', 'tumbler', 'review']
    : ['washer', 'drying', 'tumbler', 'review'];
}

function bookingStep(stage) {
  return bookingStageOrder().indexOf(stage) + 1;
}

function currentBookingStage() {
  return bookingStageOrder()[bookingFlowState.step - 1] || bookingStageOrder()[0];
}

function syncBookingModeUi() {
  for (const button of bookingModeButtons) {
    const active = button.dataset.bookingMode === bookingMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  bookingFlowSteps.classList.toggle('is-time-first', bookingMode === 'time');
  bookingFlowDescription.textContent = bookingMode === 'time'
    ? 'Zeitfenster zuerst, Ger\u00e4te danach.'
    : 'Waschmaschine zuerst, Trocknung danach.';
}

async function setBookingMode(mode, focusFlow = true) {
  if (!['time', 'machine'].includes(mode) || mode === bookingMode) return;
  for (const button of bookingModeButtons) button.disabled = true;
  try {
    const data = await api('/api/me/booking-mode', {
      method: 'PUT',
      body: JSON.stringify({ bookingMode: mode })
    });
    bookingMode = data.user.bookingMode;
    currentUser.bookingMode = bookingMode;
    resetBookingFlowState(bookingDate.value);
    renderBookingFlow();
    if (focusFlow) focusBookingFlowHeading();
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    for (const button of bookingModeButtons) button.disabled = false;
    syncBookingModeUi();
    settingsBookingMode.value = bookingMode;
  }
}

function resetBookingFlowState(date = bookingDate.value) {
  clearBookingFlowStatus();
  bookingFlowState = {
    date,
    step: 1,
    slot: '',
    washerIds: [],
    existingWasherId: null,
    dryingResourceId: null,
    dryingOptionId: '',
    tumblerResourceId: null,
    companions: null,
    loading: false
  };
  if (updateReloadApproved) {
    updateReloadApproved = false;
    window.setTimeout(() => performAppUpdate(), 0);
  }
}

function persistCalendarView() {
  try {
    window.localStorage.setItem('waschzeit-calendar-view', calendarView);
  } catch {
    // Die Kalenderansicht funktioniert auch ohne lokalen Speicher.
  }
}

async function startCalendarWasherBooking(date, slot, resourceId) {
  await selectBookingDate(date);
  const availableWasher = (bookingFlowOptions?.slots || [])
    .find((item) => item.slot === slot)
    ?.washers.find((washer) => washer.resourceId === resourceId);
  if (!availableWasher) {
    showStatus('Diese Waschmaschine ist gerade nicht mehr verf\u00fcgbar. Der Kalender wurde aktualisiert.', 'error');
    showBookingFlowStatus('Diese Waschmaschine ist gerade nicht mehr verf\u00fcgbar. Bitte w\u00e4hle eine andere freie Maschine.', 'error');
    await loadCalendar();
    return;
  }

  bookingFlowState.slot = slot;
  bookingFlowState.washerIds = [resourceId];
  bookingFlowState.existingWasherId = null;
  bookingFlowState.dryingResourceId = null;
  bookingFlowState.dryingOptionId = '';
  bookingFlowState.tumblerResourceId = null;
  bookingFlowState.companions = null;
  bookingFlowState.step = bookingStep('washer');
  clearBookingFlowStatus();
  renderBookingFlow();
  bookingFlow.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showStatus(`${availableWasher.resourceName} ist f\u00fcr ${slot} ausgew\u00e4hlt. Du kannst jetzt die Trocknung erg\u00e4nzen.`);
}

async function openCalendarPackage(date) {
  await selectBookingDate(date);
  bookingFlow.scrollIntoView({ behavior: 'smooth', block: 'start' });
  focusBookingFlowHeading();
}

async function openRecommendedCalendarPackage(date, slot) {
  await selectBookingDate(date);
  const existingWasher = (bookingFlowOptions?.existingWashers || [])
    .find((washer) => washer.slot === slot);
  if (!existingWasher) {
    const slotOption = (bookingFlowOptions?.slots || []).find((item) => item.slot === slot);
    if (!slotOption?.washers.length) {
      const message = slotOption?.washerError
        || 'Dieser empfohlene Termin ist inzwischen nicht mehr verf\u00fcgbar. Bitte w\u00e4hle einen anderen freien Termin.';
      showStatus(message, 'error');
      showBookingFlowStatus(message, 'error');
      await loadCalendar();
      return;
    }
    selectFlowTime(slot);
  }
  bookingFlow.scrollIntoView({ behavior: 'smooth', block: 'start' });
  focusBookingFlowHeading();
  showStatus(existingWasher
    ? `Dein Waschpaket f\u00fcr ${slot} ist ge\u00f6ffnet. Du kannst jetzt die Trocknung erg\u00e4nzen.`
    : `Empfohlener Termin ${slot} ge\u00f6ffnet. W\u00e4hle jetzt deine Waschmaschine.`);
}

function resourceById(resourceId) {
  return resources.find((resource) => resource.id === Number(resourceId));
}

function selectedDryingRoom() {
  return bookingFlowState.companions?.dryingRooms?.find((room) => (
    room.resourceId === bookingFlowState.dryingResourceId
  )) || null;
}

function selectedDryingOption() {
  const room = selectedDryingRoom();
  return room?.bookingOptions?.find((option) => option.id === bookingFlowState.dryingOptionId)
    || room?.bookingOptions?.[0]
    || null;
}

function bookingFlowItems() {
  const items = bookingFlowState.existingWasherId
    ? []
    : bookingFlowState.washerIds.map((resourceId) => ({
      resourceId,
      date: bookingFlowState.date,
      slot: bookingFlowState.slot
    }));
  const dryingOption = selectedDryingOption();
  if (dryingOption) items.push(...dryingOption.bookings);
  if (bookingFlowState.tumblerResourceId) {
    items.push({
      resourceId: bookingFlowState.tumblerResourceId,
      date: bookingFlowState.date,
      slot: bookingFlowState.slot
    });
  }
  return items;
}

function focusBookingFlowHeading() {
  const heading = bookingFlowContent.querySelector('h4');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

async function loadBookingFlowOptions({ preserveSelection = false } = {}) {
  const date = bookingDate.value;
  if (!preserveSelection || bookingFlowState.date !== date) {
    resetBookingFlowState(date);
  }
  bookingFlowState.loading = true;
  renderBookingFlow();
  try {
    const slotQuery = preserveSelection && bookingFlowState.slot
      ? `&slot=${encodeURIComponent(bookingFlowState.slot)}`
      : '';
    bookingFlowOptions = await api(`/api/booking-options?date=${encodeURIComponent(date)}${slotQuery}`);
    const existingWashers = bookingFlowOptions.existingWashers || [];
    if (existingWashers.length) {
      bookingFlowState.slot = existingWashers[0].slot;
      bookingFlowState.existingWasherId = existingWashers[0].bookingId;
      bookingFlowState.washerIds = [];
    } else {
      bookingFlowState.existingWasherId = null;
      const availableIds = new Set(
        (bookingFlowOptions.slots || [])
          .find((item) => item.slot === bookingFlowState.slot)
          ?.washers.map((washer) => washer.resourceId) || []
      );
      bookingFlowState.washerIds = bookingFlowState.washerIds.filter((id) => availableIds.has(id));
      if (!bookingFlowState.washerIds.length && preserveSelection) {
        bookingFlowState.slot = '';
        bookingFlowState.step = 1;
      }
    }
    bookingFlowState.companions = bookingFlowOptions.companions;
  } catch (error) {
    bookingFlowOptions = null;
    showStatus(error.message, 'error');
    showBookingFlowStatus(error.message, 'error');
  } finally {
    bookingFlowState.loading = false;
    renderBookingFlow();
  }
}

async function openBookingFlowStep(step) {
  clearBookingFlowStatus();
  const targetStage = bookingStageOrder()[step - 1];
  if (!targetStage) return;
  if (targetStage === 'time' || targetStage === 'washer') {
    bookingFlowState.step = step;
    renderBookingFlow();
    focusBookingFlowHeading();
    return;
  }
  if (!bookingFlowState.slot) return;
  if (!bookingFlowState.companions) {
    bookingFlowState.step = bookingStep('drying');
    bookingFlowState.loading = true;
    renderBookingFlow();
    try {
      bookingFlowOptions = await api(
        `/api/booking-options?date=${encodeURIComponent(bookingFlowState.date)}&slot=${encodeURIComponent(bookingFlowState.slot)}`
      );
      bookingFlowState.companions = bookingFlowOptions.companions || { dryingRooms: [], tumblers: [] };
    } catch (error) {
      bookingFlowState.step = bookingStep('washer');
      showStatus(error.message, 'error');
      showBookingFlowStatus(error.message, 'error');
    } finally {
      bookingFlowState.loading = false;
    }
  } else {
    bookingFlowState.step = step;
  }
  renderBookingFlow();
  focusBookingFlowHeading();
}

function toggleFlowWasher(resourceId, slot) {
  clearBookingFlowStatus();
  if (bookingFlowState.slot !== slot) {
    bookingFlowState.slot = slot;
    bookingFlowState.washerIds = [];
  }
  bookingFlowState.washerIds = bookingFlowState.washerIds.includes(resourceId)
    ? bookingFlowState.washerIds.filter((id) => id !== resourceId)
    : [...bookingFlowState.washerIds, resourceId].slice(0, 3);
  if (!bookingFlowState.washerIds.length && bookingMode === 'machine') bookingFlowState.slot = '';
  bookingFlowState.dryingResourceId = null;
  bookingFlowState.dryingOptionId = '';
  bookingFlowState.tumblerResourceId = null;
  bookingFlowState.companions = null;
  renderBookingFlow();
  bookingFlowContent.querySelector(
    `[data-flow-washer="${resourceId}"][data-flow-slot="${slot}"]`
  )?.focus({ preventScroll: true });
}

function renderFlowActions(backStage, nextStage, nextLabel) {
  const actions = document.createElement('div');
  actions.className = 'booking-flow-actions';
  if (backStage) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'secondary';
    back.textContent = 'Zur\u00fcck';
    back.addEventListener('click', () => openBookingFlowStep(bookingStep(backStage)));
    actions.append(back);
  }
  if (nextStage) {
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = nextLabel;
    next.addEventListener('click', () => openBookingFlowStep(bookingStep(nextStage)));
    actions.append(next);
  }
  return actions;
}

function selectFlowTime(slot) {
  const slotOption = (bookingFlowOptions?.slots || []).find((item) => item.slot === slot);
  if (!slotOption?.washers.length) {
    showBookingFlowStatus(slotOption?.washerError || 'In diesem Zeitfenster ist keine Waschmaschine frei.', 'error');
    return;
  }
  clearBookingFlowStatus();
  bookingFlowState.slot = slot;
  bookingFlowState.washerIds = [];
  bookingFlowState.dryingResourceId = null;
  bookingFlowState.dryingOptionId = '';
  bookingFlowState.tumblerResourceId = null;
  bookingFlowState.companions = null;
  bookingFlowState.step = bookingStep('washer');
  renderBookingFlow();
  focusBookingFlowHeading();
}

function renderTimeStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>Schritt ${bookingStep('time')}</span>
      <h4>Zeitfenster w\u00e4hlen</h4>
      <p>${escapeHtml(formatShortDate(bookingFlowState.date))}</p>
    </div>
  `;
  const existingWashers = bookingFlowOptions?.existingWashers || [];
  if (existingWashers.length) {
    const existing = document.createElement('div');
    existing.className = 'flow-existing-selection';
    existing.innerHTML = `
      <span>Bereits gebuchtes Zeitfenster</span>
      <strong>${escapeHtml(existingWashers[0].slot)}</strong>
      <small>${existingWashers.map((washer) => escapeHtml(washer.resourceName)).join(', ')}</small>
    `;
    wrap.append(existing, renderFlowActions(null, 'drying', 'Trocknung erg\u00e4nzen'));
    return wrap;
  }

  const slotOptions = bookingFlowOptions?.slots || [];
  if (bookingFlowOptions?.closed) {
    const closed = document.createElement('p');
    closed.className = 'flow-empty';
    closed.textContent = 'Sonntag ist Ruhetag. W\u00e4hle bitte einen anderen Tag.';
    wrap.append(closed);
    return wrap;
  }

  const choices = document.createElement('div');
  choices.className = 'flow-time-list';
  for (const slotOption of slotOptions) {
    const available = slotOption.washers.length > 0;
    const recommended = currentRecommendation?.date === bookingFlowState.date
      && currentRecommendation?.slot === slotOption.slot;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `flow-time-choice${recommended ? ' is-recommended' : ''}`;
    button.dataset.flowTime = slotOption.slot;
    button.disabled = !available;
    button.innerHTML = `
      <span class="flow-time-main">
        <strong>${escapeHtml(slotOption.slot)}</strong>
        ${recommended ? '<em>Empfohlen</em>' : ''}
      </span>
      <span class="flow-time-availability">
        <span><b>${slotOption.washers.length}</b> Waschmaschinen</span>
        <span><b>${slotOption.dryingRoomCount || 0}</b> Trockenr\u00e4ume</span>
        <span><b>${slotOption.tumblerCount || 0}</b> Tumbler zur Auswahl</span>
      </span>
      ${available ? '<span class="flow-time-action">Zeitfenster ausw\u00e4hlen</span>' : `<span class="flow-time-unavailable">${escapeHtml(slotOption.washerError || 'Nicht mehr buchbar')}</span>`}
    `;
    button.addEventListener('click', () => selectFlowTime(slotOption.slot));
    choices.append(button);
  }
  wrap.append(choices);
  return wrap;
}

function renderWasherStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>Schritt ${bookingStep('washer')}</span>
      <h4>Waschmaschine w\u00e4hlen</h4>
      <p>${escapeHtml(formatShortDate(bookingFlowState.date))}${bookingMode === 'time' && bookingFlowState.slot ? ` - ${escapeHtml(bookingFlowState.slot)}` : ''}</p>
    </div>
  `;
  const existingWashers = bookingFlowOptions?.existingWashers || [];
  if (existingWashers.length) {
    const existing = document.createElement('div');
    existing.className = 'flow-existing-selection';
    existing.innerHTML = `
      <span>Bereits gebucht</span>
      <strong>${existingWashers.map((washer) => escapeHtml(washer.resourceName)).join(', ')}</strong>
      <small>${escapeHtml(existingWashers[0].slot)}</small>
    `;
    wrap.append(existing, renderFlowActions(null, 'drying', 'Trocknung erg\u00e4nzen'));
    return wrap;
  }

  const availableSlots = (bookingFlowOptions?.slots || []).filter((item) => (
    item.washers.length && (bookingMode === 'machine' || item.slot === bookingFlowState.slot)
  ));
  if (!availableSlots.length) {
    const ruleMessage = (bookingFlowOptions?.slots || []).find((item) => item.washerError)?.washerError;
    const empty = document.createElement('p');
    empty.className = 'flow-empty';
    empty.textContent = bookingFlowOptions?.closed
      ? 'Sonntag ist Ruhetag. W\u00e4hle bitte einen anderen Tag.'
      : ruleMessage || 'An diesem Tag ist keine Waschmaschine mehr frei. W\u00e4hle einen anderen Tag im Kalender.';
    wrap.append(empty);
    return wrap;
  }

  for (const slotOption of availableSlots) {
    const group = document.createElement('section');
    group.className = `flow-slot${currentRecommendation?.date === bookingFlowState.date && currentRecommendation?.slot === slotOption.slot ? ' is-recommended' : ''}`;
    const heading = document.createElement('div');
    heading.className = 'flow-slot-heading';
    heading.innerHTML = `<strong>${escapeHtml(slotOption.slot)}</strong>${group.classList.contains('is-recommended') ? '<span>Empfohlen</span>' : ''}`;
    const choices = document.createElement('div');
    choices.className = 'flow-choice-grid';
    for (const washer of slotOption.washers) {
      const selected = bookingFlowState.slot === slotOption.slot
        && bookingFlowState.washerIds.includes(washer.resourceId);
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = `flow-choice${selected ? ' is-selected' : ''}`;
      choice.dataset.flowWasher = String(washer.resourceId);
      choice.dataset.flowSlot = slotOption.slot;
      choice.setAttribute('aria-pressed', String(selected));
      choice.innerHTML = `<strong>${escapeHtml(washer.resourceName)}</strong><span>${selected ? 'Ausgew\u00e4hlt' : 'Frei'}</span>`;
      choice.addEventListener('click', () => toggleFlowWasher(washer.resourceId, slotOption.slot));
      choices.append(choice);
    }
    group.append(heading, choices);
    wrap.append(group);
  }

  const selectionCount = bookingFlowState.washerIds.length;
  if (selectionCount) {
    const selection = document.createElement('p');
    selection.className = 'flow-selection-note';
    selection.textContent = `${selectionCount} ${selectionCount === 1 ? 'Waschmaschine' : 'Waschmaschinen'} im Zeitfenster ${bookingFlowState.slot}`;
    wrap.append(selection, renderFlowActions(bookingMode === 'time' ? 'time' : null, 'drying', 'Weiter zum Trockenraum'));
  } else if (bookingMode === 'time') {
    wrap.append(renderFlowActions('time', null, ''));
  }
  return wrap;
}

function renderDryingStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>Schritt ${bookingStep('drying')}</span>
      <h4>Trockenraum erg\u00e4nzen</h4>
      <p>Optional und passend zu ${escapeHtml(bookingFlowState.slot)}</p>
    </div>
  `;
  const choices = document.createElement('div');
  choices.className = 'flow-option-list';
  const selectedRoom = selectedDryingRoom();
  const visibleRooms = selectedRoom
    ? [selectedRoom]
    : bookingFlowState.companions?.dryingRooms || [];

  if (!selectedRoom) {
    const without = document.createElement('button');
    without.type = 'button';
    without.className = 'flow-option is-selected';
    without.dataset.flowDrying = 'none';
    without.setAttribute('aria-pressed', 'true');
    without.innerHTML = '<strong>Ohne Trockenraum</strong><span>Du kannst direkt mit dem Tumbler fortfahren.</span>';
    without.addEventListener('click', () => {
      clearBookingFlowStatus();
      bookingFlowState.dryingResourceId = null;
      bookingFlowState.dryingOptionId = '';
      renderBookingFlow();
      bookingFlowContent.querySelector('[data-flow-drying="none"]')?.focus({ preventScroll: true });
    });
    choices.append(without);
  }

  for (const room of visibleRooms) {
    const selected = bookingFlowState.dryingResourceId === room.resourceId;
    const option = document.createElement('button');
    option.type = 'button';
    option.className = `flow-option${selected ? ' is-selected' : ''}`;
    option.dataset.flowDrying = String(room.resourceId);
    option.setAttribute('aria-pressed', String(selected));
    const currentDuration = room.bookingOptions.find((duration) => duration.id === bookingFlowState.dryingOptionId)
      || room.bookingOptions[0];
    option.innerHTML = selected
      ? `<span class="flow-option-kicker">Ausgew\u00e4hlt</span><strong>${escapeHtml(room.resourceName)}</strong><span class="flow-option-time">${escapeHtml(currentDuration?.label || '')}</span>`
      : `<strong>${escapeHtml(room.resourceName)}</strong><span class="flow-option-time">${escapeHtml(room.bookingOptions.map((duration) => duration.label).join(' \u00b7 '))}</span>`;
    option.addEventListener('click', () => {
      clearBookingFlowStatus();
      bookingFlowState.dryingResourceId = room.resourceId;
      bookingFlowState.dryingOptionId = room.selectedOption || room.bookingOptions[0]?.id || '';
      renderBookingFlow();
      bookingFlowContent.querySelector(`[data-flow-drying="${room.resourceId}"]`)?.focus({ preventScroll: true });
    });
    choices.append(option);
  }
  wrap.append(choices);

  const room = selectedRoom;
  if (room) {
    const durationLabel = document.createElement('label');
    durationLabel.className = 'flow-duration';
    const durationTitle = document.createElement('span');
    durationTitle.textContent = 'Nutzungszeit des Trockenraums';
    const durationSelect = document.createElement('select');
    durationSelect.setAttribute('aria-label', 'Trocknungsdauer w\u00e4hlen');
    for (const duration of room.bookingOptions) {
      const option = document.createElement('option');
      option.value = duration.id;
      option.textContent = duration.label;
      option.selected = duration.id === bookingFlowState.dryingOptionId;
      durationSelect.append(option);
    }
    durationSelect.addEventListener('change', () => {
      bookingFlowState.dryingOptionId = durationSelect.value;
      clearBookingFlowStatus();
      renderBookingFlow();
      bookingFlowContent.querySelector('.flow-duration select')?.focus({ preventScroll: true });
    });
    durationLabel.append(durationTitle, durationSelect);
    const changeRoom = document.createElement('button');
    changeRoom.type = 'button';
    changeRoom.className = 'text-button flow-change-room';
    changeRoom.textContent = 'Anderen Trockenraum w\u00e4hlen oder entfernen';
    changeRoom.addEventListener('click', () => {
      clearBookingFlowStatus();
      bookingFlowState.dryingResourceId = null;
      bookingFlowState.dryingOptionId = '';
      renderBookingFlow();
      bookingFlowContent.querySelector('[data-flow-drying="none"]')?.focus({ preventScroll: true });
    });
    wrap.append(durationLabel, changeRoom);
  } else if (!(bookingFlowState.companions?.dryingRooms || []).length) {
    const empty = document.createElement('p');
    empty.className = 'flow-empty compact';
    empty.textContent = 'F\u00fcr diesen Waschslot ist kein durchg\u00e4ngig freier Trockenraum verf\u00fcgbar.';
    wrap.append(empty);
  }
  wrap.append(renderFlowActions('washer', 'tumbler', 'Weiter zum Tumbler'));
  return wrap;
}

function renderTumblerStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>Schritt ${bookingStep('tumbler')}</span>
      <h4>Tumbler erg\u00e4nzen</h4>
      <p>Optional. Einer bleibt f\u00fcr das Haus frei.</p>
    </div>
  `;
  const choices = document.createElement('div');
  choices.className = 'flow-option-list';
  const without = document.createElement('button');
  without.type = 'button';
  without.className = `flow-option${bookingFlowState.tumblerResourceId === null ? ' is-selected' : ''}`;
  without.dataset.flowTumbler = 'none';
  without.setAttribute('aria-pressed', String(bookingFlowState.tumblerResourceId === null));
  without.innerHTML = '<strong>Ohne Tumbler</strong><span>Nur Waschmaschine und gew\u00e4hlter Trockenraum.</span>';
  without.addEventListener('click', () => {
    clearBookingFlowStatus();
    bookingFlowState.tumblerResourceId = null;
    renderBookingFlow();
    bookingFlowContent.querySelector('[data-flow-tumbler="none"]')?.focus({ preventScroll: true });
  });
  choices.append(without);
  for (const tumbler of bookingFlowState.companions?.tumblers || []) {
    const selected = bookingFlowState.tumblerResourceId === tumbler.resourceId;
    const option = document.createElement('button');
    option.type = 'button';
    option.className = `flow-option${selected ? ' is-selected' : ''}`;
    option.dataset.flowTumbler = String(tumbler.resourceId);
    option.setAttribute('aria-pressed', String(selected));
    option.innerHTML = `<strong>${escapeHtml(tumbler.resourceName)}</strong><span>Frei im Waschslot</span>`;
    option.addEventListener('click', () => {
      clearBookingFlowStatus();
      bookingFlowState.tumblerResourceId = tumbler.resourceId;
      renderBookingFlow();
      bookingFlowContent.querySelector(`[data-flow-tumbler="${tumbler.resourceId}"]`)?.focus({ preventScroll: true });
    });
    choices.append(option);
  }
  wrap.append(choices);
  if (!(bookingFlowState.companions?.tumblers || []).length) {
    const empty = document.createElement('p');
    empty.className = 'flow-empty compact';
    empty.textContent = 'Aktuell kann kein Tumbler angeboten werden, weil mindestens einer frei bleiben muss.';
    wrap.append(empty);
  }
  wrap.append(renderFlowActions('drying', 'review', 'Paket pr\u00fcfen'));
  return wrap;
}

function renderReviewStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>Schritt ${bookingStep('review')}</span>
      <h4>Waschpaket pr\u00fcfen</h4>
      <p>Erst mit dem letzten Klick wird verbindlich gebucht.</p>
    </div>
  `;
  const summary = document.createElement('div');
  summary.className = 'flow-review';
  const existingWashers = bookingFlowOptions?.existingWashers || [];
  const washerNames = existingWashers.length
    ? existingWashers.map((washer) => washer.resourceName)
    : bookingFlowState.washerIds.map((id) => resourceById(id)?.name).filter(Boolean);
  const room = selectedDryingRoom();
  const dryingOption = selectedDryingOption();
  const tumbler = resourceById(bookingFlowState.tumblerResourceId);
  const rows = [
    ['Termin', `${formatShortDate(bookingFlowState.date)} - ${bookingFlowState.slot}`],
    ['Waschmaschine', `${washerNames.join(', ')}${existingWashers.length ? ' - bereits gebucht' : ''}`],
    ['Trockenraum', room && dryingOption ? `${room.resourceName} - ${dryingOption.label}` : 'Ohne Trockenraum'],
    ['Tumbler', tumbler?.name || 'Ohne Tumbler']
  ];
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    summary.append(row);
  }
  wrap.append(summary);
  const actions = renderFlowActions('tumbler', null, '');
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.textContent = existingWashers.length ? 'Erg\u00e4nzungen buchen' : 'Waschpaket buchen';
  const items = bookingFlowItems();
  confirm.disabled = Boolean(existingWashers.length && !items.length);
  confirm.addEventListener('click', () => createBookingPackage(items, {
    date: bookingFlowState.date,
    slot: bookingFlowState.slot,
    washerBookingId: bookingFlowState.existingWasherId
  }));
  actions.append(confirm);
  wrap.append(actions);
  if (confirm.disabled) {
    const note = document.createElement('p');
    note.className = 'flow-empty compact';
    note.textContent = 'W\u00e4hle mindestens eine Erg\u00e4nzung oder gehe zur\u00fcck zu deinen Buchungen.';
    wrap.append(note);
  }
  return wrap;
}

function renderBookingFlow() {
  bookingFlowContent.innerHTML = '';
  syncBookingModeUi();
  bookingFlowSteps.innerHTML = '';
  const labels = {
    time: 'Zeit',
    washer: 'Maschine',
    drying: 'Trockenraum',
    tumbler: 'Tumbler',
    review: 'Pr\u00fcfen'
  };
  for (const [index, stage] of bookingStageOrder().entries()) {
    const step = index + 1;
    const item = document.createElement('li');
    item.dataset.flowStep = String(step);
    item.classList.toggle('active', step === bookingFlowState.step);
    item.classList.toggle('complete', step < bookingFlowState.step);
    item.innerHTML = `<span>${step}</span> ${labels[stage]}`;
    if (step === bookingFlowState.step) item.setAttribute('aria-current', 'step');
    bookingFlowSteps.append(item);
  }
  if (bookingFlowState.loading) {
    bookingFlowContent.innerHTML = '<p class="flow-loading">Freie Optionen werden gepr\u00fcft...</p>';
    return;
  }
  if (!bookingFlowOptions) {
    bookingFlowContent.innerHTML = '<p class="flow-empty">Die Buchungsoptionen konnten nicht geladen werden.</p>';
    return;
  }
  const stage = currentBookingStage();
  if (stage === 'time') bookingFlowContent.append(renderTimeStep());
  else if (stage === 'washer') bookingFlowContent.append(renderWasherStep());
  else if (stage === 'drying') bookingFlowContent.append(renderDryingStep());
  else if (stage === 'tumbler') bookingFlowContent.append(renderTumblerStep());
  else bookingFlowContent.append(renderReviewStep());
}

function renderRecommendation() {
  bookingSuggestion.innerHTML = '';
  const recommendation = currentRecommendation;
  bookingSuggestion.hidden = !recommendation?.date;
  if (!recommendation?.date) return;
  const copy = document.createElement('div');
  copy.className = 'suggestion-copy';
  copy.innerHTML = `
    <span class="suggestion-label">Deine Empfehlung</span>
    <strong>${escapeHtml(formatShortDate(recommendation.date))} - ${escapeHtml(recommendation.slot)}</strong>
    <p>${escapeHtml(recommendation.reason)}</p>
  `;
  const choose = document.createElement('button');
  choose.type = 'button';
  choose.className = 'secondary';
  choose.textContent = 'Empfohlenen Termin buchen';
  choose.addEventListener('click', () => openRecommendedCalendarPackage(
    recommendation.date,
    recommendation.slot
  ));
  bookingSuggestion.append(copy, choose);
}

function setActiveType(type) {
  activeType = type;
  filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.type === type));
  renderSchedule();
}

async function selectBookingDate(date, type = '') {
  bookingDate.value = date;
  resetBookingFlowState(date);
  const selectedPeriod = calendarPeriodStart(date);
  calendarAnchorDate = date;
  if (selectedPeriod !== calendarStartDate) {
    calendarStartDate = selectedPeriod;
    await Promise.all([loadBookings(), loadCalendar()]);
  } else {
    await loadBookings();
    renderCalendar();
  }
  await loadBookingFlowOptions();
  if (type) {
    setActiveType(type);
  }
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

function releaseNoticeStatusText(notice) {
  if (notice.bookable) return 'Der Slot ist aktuell frei und kann gebucht werden.';
  if (notice.alreadyBooked) return 'Dieser Slot wurde inzwischen gebucht.';
  if (!notice.resourceActive) return 'Diese Ressource ist aktuell gesperrt.';
  if (notice.expired) return 'Diese Freigabe ist nicht mehr aktuell.';
  return 'Dieser Slot ist gerade nicht buchbar.';
}

function renderReleaseNoticeDetail(notice) {
  const actor = notice.created_by_name || 'Jemand';
  releaseNoticeEyebrow.textContent = notice.kind === 'cancellation' ? 'Absage' : 'Frueher frei';
  releaseNoticeTitle.textContent = `${notice.resource_name} ist wieder frei`;
  releaseNoticeIntro.textContent = `${actor} hat diesen Termin freigegeben. Bitte buche ihn nur, wenn du ihn wirklich nutzen moechtest.`;
  releaseNoticeDetail.innerHTML = `
    <dl class="release-notice-facts">
      <div><dt>Freigegeben von</dt><dd>${escapeHtml(actor)}</dd></div>
      <div><dt>Bereich</dt><dd>${escapeHtml(notice.resource_name)}</dd></div>
      <div><dt>Datum</dt><dd>${escapeHtml(formatShortDate(notice.booking_date))}</dd></div>
      <div><dt>Zeitfenster</dt><dd>${escapeHtml(notice.slot)}</dd></div>
      <div><dt>Status</dt><dd>${escapeHtml(releaseNoticeStatusText(notice))}</dd></div>
    </dl>
    <p>${escapeHtml(notice.message)}</p>
  `;
  bookReleaseNoticeButton.disabled = !notice.bookable;
  bookReleaseNoticeButton.textContent = notice.bookable ? 'Diesen Slot buchen' : 'Nicht mehr buchbar';
}

function openReleaseNotice(notice) {
  activeReleaseNotice = notice;
  renderReleaseNoticeDetail(notice);
  releaseNoticeOverlay.hidden = false;
  document.body.classList.add('modal-open');
  bookReleaseNoticeButton.focus();
}

function closeReleaseNotice() {
  releaseNoticeOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  activeReleaseNotice = null;
}

async function openReleaseNoticeFromUrl(pageUrl) {
  const noticeId = Number(pageUrl.searchParams.get('notice'));
  if (!Number.isInteger(noticeId) || noticeId <= 0) return;
  try {
    const cached = releaseNoticeItems.find((notice) => Number(notice.id) === noticeId);
    const notice = cached || (await api(`/api/release-notices/${noticeId}`)).notice;
    await selectBookingDate(notice.booking_date);
    openReleaseNotice(notice);
    window.history.replaceState({}, '', `/index.html?date=${encodeURIComponent(notice.booking_date)}`);
  } catch (error) {
    showStatus(error.message, 'error');
    window.history.replaceState({}, '', '/index.html');
  }
}

async function bookActiveReleaseNotice() {
  if (!activeReleaseNotice?.bookable) return;
  bookReleaseNoticeButton.disabled = true;
  const booked = await createBooking(
    activeReleaseNotice.resource_id,
    activeReleaseNotice.slot,
    activeReleaseNotice.booking_date
  );
  if (booked) {
    closeReleaseNotice();
  } else {
    const noticeId = activeReleaseNotice.id;
    try {
      const fresh = await api(`/api/release-notices/${noticeId}`);
      activeReleaseNotice = fresh.notice;
      renderReleaseNoticeDetail(activeReleaseNotice);
    } catch {
      bookReleaseNoticeButton.disabled = false;
    }
  }
}

async function createBooking(resourceId, slot, date = bookingDate.value, type = '') {
  try {
    const data = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ resourceId, date, slot })
    });
    bookingDate.value = date;
    syncCalendarPeriod(date);
    if (type) {
      activeType = type;
      filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.type === type));
    }
    showStatus(data.message || 'Buchung gespeichert.');
    await refreshAll();
    return true;
  } catch (error) {
    showStatus(error.message, 'error');
    return false;
  }
}

async function createBookingPackage(items, recommendation) {
  clearBookingFlowStatus();
  try {
    const data = await api('/api/booking-package', {
      method: 'POST',
      body: JSON.stringify({
        washerBookingId: recommendation.washerBookingId || null,
        items
      })
    });
    bookingDate.value = recommendation.date;
    syncCalendarPeriod(recommendation.date);
    activeType = 'washer';
    filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.type === 'washer'));
    resetBookingFlowState(recommendation.date);
    showStatus(data.message || 'Waschpaket gespeichert.');
    await refreshAll();
    return true;
  } catch (error) {
    showStatus(error.message, 'error');
    await loadBookingFlowOptions({ preserveSelection: true });
    showBookingFlowStatus(error.message, 'error');
    return false;
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
    showStatus(`${data.message || 'Slot wurde freigegeben.'}${notificationResultText(data)}`);
    await refreshAll();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function notificationResultText(data) {
  if (!data.releaseNoticeCreated) {
    return '';
  }
  const parts = [];
  if (data.pushNotifications?.configured) {
    parts.push(`Push: ${data.pushNotifications.sent}`);
  } else {
    parts.push('Push noch nicht aktiv');
  }
  if (data.emailNotifications?.configured) {
    parts.push(`E-Mail: ${data.emailNotifications.sent}`);
  } else {
    parts.push('E-Mail-Versand noch nicht konfiguriert');
  }
  return parts.length ? ` ${parts.join(' · ')}.` : '';
}

async function saveNotifications() {
  try {
    const data = await api('/api/me/notifications', {
      method: 'PUT',
      body: JSON.stringify({
        email: notificationEmail.value,
        secondaryEmail: secondaryNotificationEmail.value,
        notifyReleases: notifyReleasesInput.checked,
        resourceType: notificationResourceType.value,
        weekday: notificationWeekday.value,
        slot: notificationSlot.value
      })
    });
    currentUser = data.user;
    renderEmailVerificationStatus();
    renderSettingsSummary();
    showStatus(data.message || 'Benachrichtigungen gespeichert.');
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function resendEmailVerification() {
  try {
    const data = await api('/api/email-verification/resend', {
      method: 'POST',
      body: JSON.stringify({ emailKind: 'primary' })
    });
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function resendSecondaryEmailVerification() {
  try {
    const data = await api('/api/email-verification/resend', {
      method: 'POST',
      body: JSON.stringify({ emailKind: 'secondary' })
    });
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function createDevicePairingCode() {
  createDeviceCodeButton.disabled = true;
  try {
    const data = await api('/api/me/device-code', { method: 'POST' });
    devicePairingCode.textContent = data.code;
    devicePairingCode.hidden = false;
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    createDeviceCodeButton.disabled = false;
  }
}

async function finishApartmentSetup(path, body) {
  apartmentSetupMessage.textContent = '';
  try {
    const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
    currentUser = data.user;
    apartmentSetupOverlay.hidden = true;
    document.body.classList.remove('modal-open');
    renderHouseContext();
    notificationEmail.value = currentUser.email || '';
    secondaryNotificationEmail.value = currentUser.secondaryEmail || '';
    showStatus(data.message);
    await refreshAll();
  } catch (error) {
    apartmentSetupMessage.textContent = error.message;
  }
}

async function createApartment() {
  apartmentCodeResult.hidden = true;
  try {
    const data = await api('/api/admin/apartments', {
      method: 'POST',
      body: JSON.stringify({
        label: apartmentLabelInput.value,
        displayName: apartmentDisplayNameInput.value
      })
    });
    apartmentLabelInput.value = '';
    apartmentDisplayNameInput.value = '';
    apartmentCodeResult.innerHTML = `<strong>${escapeHtml(data.apartment.label)} - ${escapeHtml(data.apartment.display_name)}:</strong> <code>${escapeHtml(data.activationCode)}</code><br><span>Diesen Code jetzt sicher weitergeben. Er wird nicht erneut angezeigt.</span>`;
    apartmentCodeResult.hidden = false;
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function sendDisplayNameRequest() {
  sendDisplayNameRequestButton.disabled = true;
  try {
    const data = await api('/api/me/apartment-name-request', {
      method: 'POST',
      body: JSON.stringify({
        displayName: requestedDisplayName.value,
        note: displayNameRequestNote.value
      })
    });
    displayNameRequestNote.value = '';
    nameCorrectionPanel.open = false;
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    sendDisplayNameRequestButton.disabled = false;
  }
}

function renderApartments(apartments) {
  apartmentList.innerHTML = '';
  if (!apartments.length) {
    apartmentList.innerHTML = '<p class="muted">Noch keine Wohnungen angelegt.</p>';
    return;
  }
  for (const apartment of apartments) {
    const item = document.createElement('article');
    item.className = 'user-admin-item';
    const identity = document.createElement('div');
    identity.className = 'user-admin-identity';
    identity.innerHTML = `<strong>${escapeHtml(apartment.display_name)}</strong><span>${escapeHtml(apartment.label)} · ${apartment.claimed ? 'aktiviert' : 'noch nicht aktiviert'}</span>${apartment.name_request_id ? `<span class="apartment-name-request">Korrektur gew&uuml;nscht: ${escapeHtml(apartment.requested_display_name)}</span>` : ''}`;
    const actions = document.createElement('div');
    actions.className = 'user-admin-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary';
    editButton.textContent = apartment.name_request_id ? 'Vorschlag prüfen' : 'Bearbeiten';
    actions.append(editButton);
    if (!apartment.claimed) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Neuen Code';
      button.addEventListener('click', async () => {
        try {
          const data = await api(`/api/admin/apartments/${apartment.id}/new-code`, { method: 'POST' });
          apartmentCodeResult.innerHTML = `<strong>${escapeHtml(apartment.label)} - ${escapeHtml(apartment.display_name)}:</strong> <code>${escapeHtml(data.activationCode)}</code><br><span>Der alte Code ist ung&uuml;ltig.</span>`;
          apartmentCodeResult.hidden = false;
          showStatus(data.message);
        } catch (error) {
          showStatus(error.message, 'error');
        }
      });
      actions.append(button);
    }

    const editForm = document.createElement('form');
    editForm.className = 'apartment-edit-form compact-form';
    editForm.hidden = true;
    editForm.innerHTML = `
      <label>
        Name am Klingelschild
        <input name="displayName" maxlength="80" value="${escapeHtml(apartment.requested_display_name || apartment.display_name)}" required>
      </label>
      <p class="muted">E-Mail-Adressen gehoeren zum geschuetzten Wohnungskonto und werden nur dort geaendert.</p>
      <div class="inline-actions">
        <button type="submit">Speichern</button>
        ${apartment.name_request_id ? '<button class="secondary danger" type="button" data-reject>Ablehnen</button>' : ''}
        <button class="secondary" type="button" data-cancel>Abbrechen</button>
      </div>
    `;
    editButton.addEventListener('click', () => {
      editForm.hidden = false;
      editButton.disabled = true;
      editForm.querySelector('input')?.focus();
    });
    editForm.querySelector('[data-cancel]').addEventListener('click', () => {
      editForm.hidden = true;
      editButton.disabled = false;
    });
    editForm.querySelector('[data-reject]')?.addEventListener('click', async () => {
      try {
        const data = await api(`/api/admin/apartments/${apartment.id}/name-request/${apartment.name_request_id}/reject`, {
          method: 'POST'
        });
        showStatus(data.message);
        await loadAdmin();
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(editForm);
      try {
        const data = await api(`/api/admin/apartments/${apartment.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            displayName: formData.get('displayName')
          })
        });
        showStatus(data.message);
        await loadAdmin();
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });
    item.append(identity, actions, editForm);
    apartmentList.append(item);
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
    showStatus(`${data.message}${notificationResultText(data)}`);
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
    showStatus(`${data.message}${notificationResultText(data)}`);
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
  const [usersData, overviewData, recoveryData, settingsData, fixedData, housesData, adminResources, auditData, pushDevicesData, analyticsData, apartmentsData, maintenanceData] = await Promise.all([
    api('/api/admin/users'),
    api('/api/admin/overview'),
    api('/api/admin/recovery-status'),
    api('/api/admin/settings'),
    api('/api/admin/fixed-bookings'),
    currentUser.isSuperadmin ? api('/api/admin/houses') : Promise.resolve({ houses: [] }),
    api('/api/admin/resources'),
    api('/api/admin/audit-log'),
    api('/api/admin/push-devices'),
    api('/api/admin/analytics?days=30'),
    api('/api/admin/apartments'),
    api('/api/admin/maintenance-cases')
  ]);
  adminBox.hidden = false;
  adminTitle.textContent = `Verwaltung ${settingsData.houseName}`;
  adminRoleLabel.textContent = currentUser.isSuperadmin ? 'Superadmin' : 'Haus-Admin';
  adminRoleSummary.textContent = currentUser.isSuperadmin
    ? 'Du sicherst Rollen, H\u00e4user und den technischen Betrieb.'
    : 'Du organisierst Wohnungen, Ger\u00e4te und St\u00f6rungsf\u00e4lle.';
  adminScopeText.textContent = currentUser.isSuperadmin
    ? 'Das Tagebuch gilt haus\u00fcbergreifend. Alle anderen Aktionen beziehen sich auf das oben ausgew\u00e4hlte Haus.'
    : 'Dein Geltungsbereich ist dieses Haus. Normale Waschzeiten werden von Bewohnern selbst gebucht.';
  backupOperation.hidden = !currentUser.isSuperadmin;
  maintenanceOperation.hidden = !currentUser.isSuperadmin;
  superadminBox.hidden = !currentUser.isSuperadmin;
  if (currentUser.isSuperadmin) {
    availableHouses = housesData.houses.filter((house) => house.active);
    renderHouseContext();
    renderHouses(housesData.houses);
  }
  populateFixedBookingControls();
  renderFixedBookings(fixedData.fixedBookings);
  renderAdminResources(adminResources.resources);
  maintenanceCases = maintenanceData.cases;
  renderMaintenanceCases();
  renderApartments(apartmentsData.apartments);
  renderAdminAnalytics(analyticsData);
  renderAuditLog(auditData.entries);
  if (currentUser.isSuperadmin) renderAdminMaintenance(overviewData.maintenance);
  adminOverview.innerHTML = `
    <div><strong>${overviewData.users}</strong><span>aktive Nutzer</span></div>
    <div class="${overviewData.usersMissingEmail ? 'is-warning' : ''}"><strong>${overviewData.usersMissingEmail}</strong><span>ohne bestaetigte E-Mail</span></div>
    <div><strong>${overviewData.todayBookings}</strong><span>Buchungen heute</span></div>
    <div><strong>${overviewData.activeResources}</strong><span>aktive Ressourcen</span></div>
    <div><strong>${overviewData.fixedBookings}</strong><span>feste Buchungen</span></div>
    <div><strong>${overviewData.recentReleases}</strong><span>Freigaben 7 Tage</span></div>
    <div class="${overviewData.openMaintenanceCases ? 'is-warning' : ''}"><strong>${overviewData.openMaintenanceCases}</strong><span>offene Tagebuchf\u00e4lle</span></div>
    <div class="wide"><strong>E-Mail</strong><span>${overviewData.email.label}</span></div>
    <div class="wide"><strong>Push</strong><span>${overviewData.push.label} - ${overviewData.push.activeSubscriptions} aktive Geraete</span></div>
    <div class="wide ${overviewData.externalBackupConfigured ? '' : 'is-warning'}"><strong>Backup</strong><span>${overviewData.backup?.ok ? `gepr\u00fcft am ${new Date(overviewData.backup.createdAt).toLocaleString('de-CH')}${overviewData.backup.uploaded ? ' - extern kopiert' : ' - externe Kopie fehlt'}` : overviewData.backup?.error || 'noch nicht automatisch erstellt'}${overviewData.externalBackupConfigured ? '' : ' · Externen Speicher in Render einrichten'}</span></div>
  `;
  renderAdminWorkQueue({
    overview: overviewData,
    recovery: recoveryData,
    apartments: apartmentsData.apartments,
    resources: adminResources.resources,
    cases: maintenanceData.cases
  });
  renderAdminRecovery(recoveryData, usersData.users);
  adminEmailTestButton.disabled = !overviewData.email.configured;
  adminEmailTestButton.title = overviewData.email.configured
    ? 'Testmail an die konfigurierte Testadresse senden'
    : 'Zuerst SMTP in Render konfigurieren';
  renderAdminPushTargets(pushDevicesData);
  adminPushTestButton.disabled = !overviewData.push.configured || !pushDevicesData.totalDevices;
  adminPushTestButton.title = overviewData.push.configured
    ? 'Testpush an die ausgewaehlten aktiven Geraete senden'
    : 'Push ist auf dem Server noch nicht bereit';
  renderAdminUsers(usersData.users);
  setAdminSection(activeAdminSection);
}

function renderAdminAnalytics(data) {
  const totalBookings = data.totals.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const typeLabels = Object.fromEntries(data.totals.map((item) => [item.type, item.count]));
  const busiestSlot = [...data.bySlot].sort((left, right) => Number(right.count) - Number(left.count))[0];
  const blockedList = data.blockedResources.length
    ? data.blockedResources.map((resource) => (
      `<li><strong>${escapeHtml(resource.name)}</strong><span>${escapeHtml(resource.reason || 'Gesperrt')}</span></li>`
    )).join('')
    : '<li><span>Keine gesperrten Ressourcen.</span></li>';
  const resourceRows = data.byResource.slice(0, 8).map((resource) => (
    `<li><strong>${escapeHtml(resource.name)}</strong><span>${Number(resource.count)} Buchungen</span></li>`
  )).join('');
  const userRows = data.byUser.slice(0, 8).map((user) => (
    `<li><strong>${escapeHtml(user.username)}</strong><span>${Number(user.count)} Buchungen</span></li>`
  )).join('');
  adminAnalytics.innerHTML = `
    <div class="admin-overview">
      <div><strong>${totalBookings}</strong><span>Buchungen im 60-Tage-Fenster</span></div>
      <div><strong>${typeLabels.washer || 0}</strong><span>Waschmaschinen</span></div>
      <div><strong>${typeLabels.drying_room || 0}</strong><span>Trockenraeume</span></div>
      <div><strong>${typeLabels.tumbler || 0}</strong><span>Tumbler</span></div>
      <div><strong>${busiestSlot?.slot || '-'}</strong><span>staerkster Slot</span></div>
      <div class="${data.blockedResources.length ? 'is-warning' : ''}"><strong>${data.blockedResources.length}</strong><span>gesperrt</span></div>
    </div>
    <div class="analytics-grid">
      <section><h4>Geraete</h4><ul>${resourceRows || '<li><span>Noch keine Buchungen.</span></li>'}</ul></section>
      <section><h4>Nutzer</h4><ul>${userRows || '<li><span>Noch keine Buchungen.</span></li>'}</ul></section>
      <section><h4>Sperren</h4><ul>${blockedList}</ul></section>
    </div>
  `;
}

function renderAdminRecovery(data, users) {
  const warnings = data.warnings || [];
  const warningRows = warnings.length
    ? warnings.map((warning) => (
      `<li class="${warning.level === 'critical' ? 'is-critical' : 'is-warning'}">${escapeHtml(warning.message)}</li>`
    )).join('')
    : '<li class="is-ok">Notfallprozess ist sauber vorbereitet.</li>';
  const superadminNames = (data.superadmins || [])
    .map((user) => user.email ? `${user.username} (${user.email})` : user.username)
    .join(', ') || 'keiner';

  adminRecoveryPanel.innerHTML = `
    <section class="admin-recovery-card">
      <div>
        <strong>Notfallzugang</strong>
        <span>Damit die Verwaltung weiterl&auml;uft, falls das aktuelle Hauptkonto ausf&auml;llt.</span>
      </div>
      <dl>
        <div><dt>Hausadmins</dt><dd>${Number(data.houseAdminCount || 0)}</dd></div>
        <div><dt>Superadmins</dt><dd>${Number(data.superadminCount || 0)}</dd></div>
        <div><dt>Seed-Admin</dt><dd>${escapeHtml(data.seedAdminName || 'admin')}</dd></div>
        <div><dt>Render-Recovery</dt><dd>${data.seedPasswordResetEnabled ? 'Reset aktiv' : data.seedRecoveryConfigured ? 'vorbereitet' : 'fehlt'}</dd></div>
      </dl>
      <ul>${warningRows}</ul>
      <p class="muted">Notfallregel: Render-Zugang nutzen, <code>SEED_ADMIN_PASSWORD</code> setzen und bei unbekanntem Passwort einmalig <code>SEED_ADMIN_FORCE_PASSWORD_RESET=true</code> aktivieren. Danach neu starten und den Reset-Schalter wieder entfernen.</p>
      <p class="muted">Aktive Superadmins: ${escapeHtml(superadminNames)}</p>
    </section>
  `;

  superadminTransferOperation.hidden = !currentUser.isSuperadmin;
  if (!currentUser.isSuperadmin) return;

  const candidates = users.filter((user) => (
    user.active
      && user.role === 'admin'
      && !user.is_superadmin
      && Number(user.id) !== Number(currentUser.id)
  ));
  superadminTransferTarget.innerHTML = '';
  if (!candidates.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Kein aktiver Haus-Admin verfuegbar';
    superadminTransferTarget.append(option);
  }
  for (const user of candidates) {
    const option = document.createElement('option');
    option.value = String(user.id);
    option.textContent = user.email ? `${user.username} (${user.email})` : user.username;
    superadminTransferTarget.append(option);
  }
  superadminTransferTarget.disabled = !candidates.length;
  superadminTransferConfirm.disabled = !candidates.length;
  superadminTransferButton.disabled = !candidates.length;
}

async function transferSuperadmin() {
  if (!window.confirm('Superadmin-Verantwortung wirklich an dieses Konto uebergeben? Deine hausuebergreifenden Rechte enden danach.')) return;
  superadminTransferButton.disabled = true;
  try {
    const data = await api('/api/admin/superadmin-transfer', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: Number(superadminTransferTarget.value),
        confirm: superadminTransferConfirm.value.trim()
      })
    });
    superadminTransferConfirm.value = '';
    showStatus(data.message);
    await refreshCurrentUser();
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    superadminTransferButton.disabled = false;
  }
}

async function sendAdminTestEmail() {
  try {
    const data = await api('/api/admin/email-test', { method: 'POST' });
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

async function sendAdminTestPush() {
  try {
    const data = await api('/api/admin/push-test', {
      method: 'POST',
      body: JSON.stringify({ userId: adminPushTarget.value || 'all' })
    });
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function renderAdminPushTargets(data) {
  const users = data.users || [];
  adminPushTarget.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = data.totalDevices
    ? `Alle aktiven Geraete (${data.totalDevices})`
    : 'Keine aktiven Push-Geraete';
  adminPushTarget.append(allOption);
  for (const user of users) {
    const option = document.createElement('option');
    option.value = String(user.id);
    option.textContent = `${user.username} (${user.devices} ${Number(user.devices) === 1 ? 'Geraet' : 'Geraete'})`;
    adminPushTarget.append(option);
  }
  adminPushTarget.disabled = !data.totalDevices;
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

function renderAdminMaintenance(maintenance = {}) {
  const active = Boolean(maintenance.active);
  maintenanceAdminStatus.textContent = active
    ? `Aktiv seit ${new Date(maintenance.startedAt).toLocaleString('de-CH')}. Schreibende Aktionen sind gesperrt.`
    : maintenance.lastCheck?.ok
      ? `Bereit. Letzte System- und Buchungspruefung: ${new Date(maintenance.lastCheck.checkedAt).toLocaleString('de-CH')}.`
      : 'Bereit. Vor dem Start wird automatisch ein geprueftes Backup erstellt.';
  toggleMaintenanceButton.dataset.active = String(active);
  toggleMaintenanceButton.textContent = active ? 'Wartung beenden' : 'Wartung starten';
  toggleMaintenanceButton.classList.toggle('danger', active);
}

async function toggleMaintenanceMode() {
  const active = toggleMaintenanceButton.dataset.active === 'true';
  const confirmation = active
    ? 'Wartung jetzt beenden? Zuerst laufen Datenbank- und Buchungspruefung.'
    : 'Wartung jetzt starten? Zuerst wird automatisch ein geprueftes Backup erstellt.';
  if (!window.confirm(confirmation)) return;
  toggleMaintenanceButton.disabled = true;
  try {
    const data = await api('/api/admin/maintenance', {
      method: 'PUT',
      body: JSON.stringify({ active: !active })
    });
    renderAdminMaintenance(data.maintenance);
    if (latestReleaseStatus) latestReleaseStatus.maintenance = data.maintenance;
    applyMaintenanceStatus(data.maintenance);
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    toggleMaintenanceButton.disabled = false;
  }
}

async function resetAllBookings() {
  if (resetBookingsConfirm.value.trim() !== 'ALLE BUCHUNGEN') {
    showStatus('Bitte ALLE BUCHUNGEN als Bestaetigung eingeben.', 'error');
    return;
  }
  if (!window.confirm('Alle normalen Buchungen dieses Hauses wirklich loeschen? Dauertermine bleiben erhalten.')) return;
  resetBookingsButton.disabled = true;
  try {
    const data = await api('/api/admin/bookings', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: resetBookingsConfirm.value.trim() })
    });
    resetBookingsConfirm.value = '';
    showStatus(data.message);
    await Promise.all([loadAdmin(), refreshAll()]);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    resetBookingsButton.disabled = false;
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
    const visibleName = user.apartment_display_name || user.apartment_label || user.username;
    name.textContent = visibleName;
    const meta = document.createElement('span');
    const roleName = user.is_superadmin ? 'Superadmin' : user.role === 'admin' ? 'Haus-Admin' : 'Bewohner';
    const accountState = user.merged_into_user_id ? 'zusammengefuehrt' : user.active ? 'aktiv' : 'inaktiv';
    const apartmentName = user.apartment_label ? ` \u00b7 ${user.apartment_label}` : '';
    const secondEmail = user.secondary_email ? ` \u00b7 ${user.secondary_email}` : '';
    meta.textContent = `${roleName} \u00b7 ${accountState}${apartmentName}${user.email ? ` \u00b7 ${user.email}` : ' \u00b7 E-Mail fehlt'}${secondEmail}`;
    identity.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'user-admin-actions';
    const isSelf = Number(user.id) === Number(currentUser.id);
    const canManageAccount = !isSelf
      && !Boolean(user.is_superadmin)
      && !Boolean(user.merged_into_user_id)
      && (currentUser.isSuperadmin || user.role === 'user');

    if (canManageAccount) {
      const statusButton = document.createElement('button');
      statusButton.type = 'button';
      statusButton.className = user.active ? 'secondary danger' : 'secondary';
      statusButton.textContent = user.active ? 'Deaktivieren' : 'Aktivieren';
      statusButton.title = `${visibleName} ${statusButton.textContent.toLowerCase()}`;
      statusButton.addEventListener('click', () => updateUserStatus(user.id, !Boolean(user.active)));
      actions.append(statusButton);
    }

    if (currentUser.isSuperadmin && !user.is_superadmin && !user.merged_into_user_id) {
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
        moveSelect.setAttribute('aria-label', `${visibleName} in anderes Haus verschieben`);
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
      const hasVerifiedEmail = Boolean(
        (user.email_verified && user.email) || (user.secondary_email_verified && user.secondary_email)
      );
      if (hasVerifiedEmail) {
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'secondary';
        resetButton.textContent = 'Reset-Link senden';
        resetButton.title = `Passwort-Link an die best\u00e4tigte Adresse von ${visibleName} senden`;
        resetButton.addEventListener('click', () => requestUserPasswordReset(user.id, resetButton));
        actions.append(resetButton);
      } else if (user.active && user.role === 'user') {
        const recoveryButton = document.createElement('button');
        recoveryButton.type = 'button';
        recoveryButton.className = 'secondary';
        recoveryButton.textContent = 'Wiederherstellungscode';
        recoveryButton.title = `Einmalcode fuer ${visibleName} nach persoenlicher Identitaetspruefung erzeugen`;
        recoveryButton.addEventListener('click', () => requestUserRecoveryCode(user, visibleName, recoveryButton));
        actions.append(recoveryButton);
      }
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

function maintenanceActionOptions(status) {
  const options = [{ value: 'note', label: 'Notiz erg\u00e4nzen' }];
  if (status === 'reported') options.unshift({ value: 'block', label: 'Ressource sperren' });
  if (status === 'blocked') options.unshift({ value: 'repair', label: 'Reparatur dokumentieren' });
  if (status === 'repairing') {
    options.unshift({ value: 'test', label: 'Funktionspr\u00fcfung dokumentieren' });
    options.unshift({ value: 'repair', label: 'Weitere Reparatur dokumentieren' });
  }
  if (status === 'tested') options.unshift({ value: 'release', label: 'Freigeben und abschliessen' });
  return options;
}

function renderMaintenanceCases() {
  const search = maintenanceSearch.value.trim().toLocaleLowerCase('de-CH');
  const status = maintenanceStatusFilter.value;
  const filtered = maintenanceCases.filter((item) => {
    if (status === 'open' && item.status === 'closed') return false;
    if (!['open', 'all'].includes(status) && item.status !== status) return false;
    if (!search) return true;
    const searchable = [
      item.resource_name,
      item.title,
      item.description,
      item.reported_by_name,
      item.house_name,
      ...(item.entries || []).flatMap((entry) => [entry.note, entry.created_by_name])
    ].filter(Boolean).join(' ').toLocaleLowerCase('de-CH');
    return searchable.includes(search);
  });

  maintenanceCaseList.innerHTML = '';
  if (!filtered.length) {
    maintenanceCaseList.innerHTML = '<div class="maintenance-empty"><strong>Keine passenden Tagebuchf\u00e4lle.</strong><span>Suche oder Statusfilter anpassen.</span></div>';
    return;
  }

  for (const maintenanceCase of filtered) {
    const article = document.createElement('article');
    article.className = `maintenance-case status-${maintenanceCase.status}`;
    const heading = document.createElement('header');
    heading.className = 'maintenance-case-head';
    heading.innerHTML = `
      <div>
        <span class="maintenance-resource">${escapeHtml(maintenanceCase.resource_name || 'Ressource entfernt')}</span>
        <h4>${escapeHtml(maintenanceCase.title)}</h4>
        <p>${escapeHtml(maintenanceCase.description)}</p>
      </div>
      <span class="maintenance-status status-${escapeHtml(maintenanceCase.status)}">${escapeHtml(maintenanceStatusLabels[maintenanceCase.status] || maintenanceCase.status)}</span>
    `;
    const meta = document.createElement('div');
    meta.className = 'maintenance-case-meta';
    meta.innerHTML = `
      <span>Gemeldet von ${escapeHtml(maintenanceCase.reported_by_name)}</span>
      <span>${escapeHtml(new Date(maintenanceCase.created_at).toLocaleString('de-CH'))}</span>
      ${currentUser.isSuperadmin ? `<span>${escapeHtml(maintenanceCase.house_name)}</span>` : ''}
    `;

    const history = document.createElement('details');
    history.className = 'maintenance-history';
    history.open = maintenanceCase.status !== 'closed';
    const summary = document.createElement('summary');
    summary.textContent = `Chronik (${maintenanceCase.entries.length})`;
    const timeline = document.createElement('ol');
    timeline.className = 'maintenance-timeline';
    for (const entry of maintenanceCase.entries) {
      const row = document.createElement('li');
      row.className = `entry-${entry.entry_type}`;
      row.innerHTML = `
        <div><strong>${escapeHtml(maintenanceEntryLabels[entry.entry_type] || entry.entry_type)}</strong><span>${escapeHtml(new Date(entry.created_at).toLocaleString('de-CH'))}</span></div>
        <p>${escapeHtml(entry.note)}</p>
        <small>${escapeHtml(entry.created_by_name)}</small>
      `;
      timeline.append(row);
    }
    history.append(summary, timeline);

    const actionForm = document.createElement('form');
    actionForm.className = 'maintenance-action-form';
    const actionLabel = document.createElement('label');
    actionLabel.className = 'maintenance-step-field';
    actionLabel.textContent = 'N\u00e4chster Schritt';
    const actionSelect = document.createElement('select');
    for (const optionData of maintenanceActionOptions(maintenanceCase.status)) {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label;
      actionSelect.append(option);
    }
    actionLabel.append(actionSelect);
    const testLabel = document.createElement('label');
    testLabel.className = 'maintenance-test-field';
    testLabel.textContent = 'Pr\u00fcfergebnis';
    const testResult = document.createElement('select');
    testResult.innerHTML = '<option value="true">Erfolgreich</option><option value="false">Nicht erfolgreich</option>';
    testLabel.append(testResult);
    testLabel.hidden = actionSelect.value !== 'test';
    actionForm.classList.toggle('has-test-result', actionSelect.value === 'test');
    const noteLabel = document.createElement('label');
    noteLabel.className = 'maintenance-note-field';
    noteLabel.textContent = 'Dokumentation';
    const note = document.createElement('textarea');
    note.rows = 3;
    note.maxLength = 1000;
    note.required = true;
    note.placeholder = maintenanceCase.status === 'tested'
      ? 'Pflicht: ausgefuehrte Arbeit und erfolgreichen Probelauf festhalten.'
      : 'Sachlich festhalten, was gemacht oder festgestellt wurde.';
    noteLabel.append(note);
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Eintrag speichern';
    actionSelect.addEventListener('change', () => {
      testLabel.hidden = actionSelect.value !== 'test';
      actionForm.classList.toggle('has-test-result', actionSelect.value === 'test');
      note.placeholder = actionSelect.value === 'release'
        ? 'Pflicht: ausgefuehrte Arbeit und erfolgreichen Probelauf festhalten.'
        : 'Sachlich festhalten, was gemacht oder festgestellt wurde.';
    });
    actionForm.append(actionLabel, testLabel, noteLabel, submit);
    actionForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      try {
        const data = await api(`/api/admin/maintenance-cases/${maintenanceCase.id}/actions`, {
          method: 'POST',
          body: JSON.stringify({
            action: actionSelect.value,
            note: note.value,
            successful: actionSelect.value === 'test' ? testResult.value === 'true' : undefined
          })
        });
        const resourceData = await api('/api/resources');
        resources = resourceData.resources;
        showStatus(data.message);
        await Promise.all([loadAdmin(), refreshAll()]);
      } catch (error) {
        showStatus(error.message, 'error');
        submit.disabled = false;
      }
    });

    article.append(heading, meta, history, actionForm);
    maintenanceCaseList.append(article);
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
    meta.textContent = `${typeLabel(resource.type)} - ${resource.active ? 'aktiv' : `gesperrt: ${resource.blocked_reason || 'ohne Grund'}`}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = resource.active ? 'secondary danger' : 'secondary';
    toggle.textContent = resource.active ? 'Sperren' : 'Im Tagebuch';
    toggle.addEventListener('click', () => {
      if (resource.active) {
        const reason = window.prompt('Warum wird dieses Geraet gesperrt? Zum Beispiel: Defekt, Wartung, Reinigung.');
        if (!reason) return;
        updateResource(resource.id, { active: false, blockReason: reason });
        return;
      }
      maintenanceSearch.value = resource.name;
      maintenanceStatusFilter.value = 'open';
      setAdminSection('logbook');
      renderMaintenanceCases();
    });
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
    'user.password_reset_requested': 'Passwort-Link gesendet',
    'user.recovery_code_created': 'Wiederherstellungscode erstellt',
    'user.recovery_completed': 'Konto wiederhergestellt',
    'user.role': 'Rolle ge\u00e4ndert',
    'user.move': 'Konto verschoben',
    'house.create': 'Haus angelegt',
    'house.update': 'Haus aktualisiert',
    'house.code': 'Hauscode ge\u00e4ndert',
    'resource.create': 'Ger\u00e4t angelegt',
    'resource.update': 'Ger\u00e4t aktualisiert',
    'resource.block': 'Ressource gesperrt',
    'resource.unblock': 'Ressource freigegeben',
    'maintenance_case.report': 'St\u00f6rung gemeldet',
    'maintenance_case.note': 'Tagebuchnotiz ergaenzt',
    'maintenance_case.block': 'Tagebuchsperre gesetzt',
    'maintenance_case.repair': 'Reparatur dokumentiert',
    'maintenance_case.test': 'Funktionspruefung dokumentiert',
    'maintenance_case.release': 'Ressource geprueft freigegeben',
    'fixed_booking.create': 'Feste Buchung angelegt',
    'fixed_booking.delete': 'Feste Buchung entfernt',
    'bookings.reset': 'Buchungen zurueckgesetzt',
    'push.test': 'Push-Test gesendet',
    'superadmin.transfer': 'Superadmin uebergeben',
    'backup.download': 'Backup heruntergeladen',
    'backup.create': 'Backup erstellt',
    'maintenance.start': 'Wartungsmodus gestartet',
    'maintenance.finish': 'Wartungsmodus beendet',
    'maintenance.check_failed': 'Wartungspruefung fehlgeschlagen'
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

async function requestUserPasswordReset(userId, button) {
  button.disabled = true;
  try {
    const data = await api(`/api/admin/users/${userId}/password-reset`, { method: 'POST' });
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function requestUserRecoveryCode(user, visibleName, button) {
  if (!window.confirm(
    `Hast du die Identitaet von ${visibleName} persoenlich geprueft? Der Code beendet bestehende Sitzungen und darf nur der berechtigten Person direkt uebergeben werden.`
  )) return;
  button.disabled = true;
  adminAccountRecoveryResult.hidden = true;
  try {
    const data = await api(`/api/admin/users/${user.id}/recovery-code`, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'KONTO WIEDERHERSTELLEN' })
    });
    adminAccountRecoveryResult.innerHTML = `
      <strong>${escapeHtml(visibleName)}:</strong>
      <code>${escapeHtml(data.code)}</code>
      <span>${escapeHtml(data.message)}</span>
    `;
    adminAccountRecoveryResult.hidden = false;
    showStatus('Wiederherstellungscode erstellt und im Kontenbereich angezeigt.');
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    button.disabled = false;
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
        name: houseNameInput.value
      })
    });
    houseForm.reset();
    await switchHouse(data.house.id);
    showStatus(data.message);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

bookingModeButtons.forEach((button) => {
  button.addEventListener('click', () => setBookingMode(button.dataset.bookingMode));
});

bookingDate.addEventListener('change', () => selectBookingDate(bookingDate.value));
weekViewButton.addEventListener('click', async () => {
  if (calendarView === 'week') return;
  calendarView = 'week';
  persistCalendarView();
  syncCalendarPeriod(bookingDate.value);
  try {
    await loadCalendar();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});
monthViewButton.addEventListener('click', async () => {
  if (calendarView === 'month') return;
  calendarView = 'month';
  persistCalendarView();
  syncCalendarPeriod(bookingDate.value);
  try {
    await loadCalendar();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});
calendarDayDetailsClose.addEventListener('click', () => {
  const returnFocus = calendarDetailAnchor;
  closeCalendarPreview();
  calendarPreviewSuppressFocus = true;
  returnFocus?.focus({ preventScroll: true });
});
calendarDayDetailsBackdrop.addEventListener('click', closeCalendarPreview);
calendarDayDetails.addEventListener('pointerdown', (event) => {
  if (window.innerWidth > 760 || !event.target.closest('.calendar-day-details-head') || event.target.closest('button')) return;
  calendarSheetDragStart = { pointerId: event.pointerId, y: event.clientY };
  calendarDayDetails.setPointerCapture?.(event.pointerId);
});
calendarDayDetails.addEventListener('pointermove', (event) => {
  if (!calendarSheetDragStart || event.pointerId !== calendarSheetDragStart.pointerId) return;
  const distance = Math.max(0, event.clientY - calendarSheetDragStart.y);
  calendarDayDetails.style.transform = `translateY(${Math.min(distance, 180)}px)`;
});
calendarDayDetails.addEventListener('pointerup', (event) => {
  if (!calendarSheetDragStart || event.pointerId !== calendarSheetDragStart.pointerId) return;
  const distance = Math.max(0, event.clientY - calendarSheetDragStart.y);
  calendarSheetDragStart = null;
  calendarDayDetails.releasePointerCapture?.(event.pointerId);
  if (distance >= 80) closeCalendarPreview();
  else calendarDayDetails.style.removeProperty('transform');
});
calendarDayDetails.addEventListener('pointercancel', () => {
  calendarSheetDragStart = null;
  calendarDayDetails.style.removeProperty('transform');
});
calendarDayDetails.addEventListener('pointerenter', () => {
  window.clearTimeout(calendarPreviewCloseTimer);
});
calendarDayDetails.addEventListener('pointerleave', () => {
  scheduleCalendarPreviewClose();
});
calendarDayDetails.addEventListener('focusin', () => {
  window.clearTimeout(calendarPreviewCloseTimer);
});
calendarDayDetails.addEventListener('focusout', () => {
  scheduleCalendarPreviewClose();
});
window.addEventListener('resize', positionCalendarDayDetails);
sessionStayButton.addEventListener('click', async () => {
  sessionStayButton.disabled = true;
  sessionStayButton.textContent = 'Sitzung wird verl\u00e4ngert...';
  const keptAlive = await keepSessionAlive(true);
  sessionStayButton.disabled = false;
  sessionStayButton.textContent = 'Angemeldet bleiben';
  if (keptAlive) {
    hideSessionWarning(true);
  } else {
    sessionCountdown.textContent = 'Verbindung fehlgeschlagen. Bitte versuche es noch einmal.';
  }
});
sessionLogoutButton.addEventListener('click', async () => {
  sessionEnding = true;
  clearSessionTimers();
  sessionLogoutButton.disabled = true;
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
  } catch {}
  window.location.replace('/login.html?loggedOut=1');
});
logoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (logoutInProgress) return;

  logoutInProgress = true;
  logoutButton.disabled = true;
  logoutButton.textContent = 'Wird abgemeldet...';

  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Abmelden konnte nicht abgeschlossen werden.');
    }
    window.location.replace('/login.html?loggedOut=1');
  } catch (error) {
    logoutInProgress = false;
    logoutButton.disabled = false;
    logoutButton.textContent = 'Abmelden';
    showStatus(`${error.message} Bitte versuche es noch einmal.`, 'error');
  }
});
bookingViewButton.addEventListener('click', () => setAppView('booking'));
adminViewButton.addEventListener('click', () => setAppView('admin'));
adminSectionButtons.forEach((button) => {
  button.addEventListener('click', () => setAdminSection(button.dataset.adminTarget));
});
adminTaskList.addEventListener('click', (event) => {
  const target = event.target.closest('[data-admin-jump]');
  if (!target) return;
  setAdminSection(target.dataset.adminJump);
  document.querySelector(`[data-admin-section="${target.dataset.adminJump}"]`)
    ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
});

previousWeekButton.addEventListener('click', async () => {
  if (calendarView === 'month') {
    syncCalendarPeriod(addMonthsString(calendarAnchorDate, -1));
    try {
      await loadCalendar();
    } catch (error) {
      showStatus(error.message, 'error');
    }
    return;
  }
  await selectBookingDate(addDaysString(calendarStartDate, -7));
});

nextWeekButton.addEventListener('click', async () => {
  if (calendarView === 'month') {
    syncCalendarPeriod(addMonthsString(calendarAnchorDate, 1));
    try {
      await loadCalendar();
    } catch (error) {
      showStatus(error.message, 'error');
    }
    return;
  }
  await selectBookingDate(addDaysString(calendarStartDate, 7));
});

todayButton.addEventListener('click', () => {
  selectBookingDate(todayString());
});

apartmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createApartment();
});
sendDisplayNameRequestButton.addEventListener('click', sendDisplayNameRequest);

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
resendSecondaryVerificationButton.addEventListener('click', resendSecondaryEmailVerification);
installAppButton.addEventListener('click', installApp);
enablePushButton.addEventListener('click', enablePushNotifications);
disablePushButton.addEventListener('click', disablePushNotifications);
createDeviceCodeButton.addEventListener('click', createDevicePairingCode);
bookReleaseNoticeButton.addEventListener('click', bookActiveReleaseNotice);
closeReleaseNoticeButton.addEventListener('click', closeReleaseNotice);
dismissReleaseNoticeButton.addEventListener('click', closeReleaseNotice);
releaseNoticeOverlay.addEventListener('click', (event) => {
  if (event.target === releaseNoticeOverlay) {
    closeReleaseNotice();
  }
});
messageCenterButton.addEventListener('click', openMessageCenter);
openMessageCenterButton.addEventListener('click', openMessageCenter);
closeMessageCenterButton.addEventListener('click', closeMessageCenter);
messageCenterOverlay.addEventListener('click', (event) => {
  if (event.target === messageCenterOverlay) closeMessageCenter();
});
reportIssueButton.addEventListener('click', openReportIssue);
closeReportIssueButton.addEventListener('click', closeReportIssue);
cancelReportIssueButton.addEventListener('click', closeReportIssue);
reportIssueOverlay.addEventListener('click', (event) => {
  if (event.target === reportIssueOverlay) closeReportIssue();
});
reportIssueForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitIssueReport();
});
accountMenuButton.addEventListener('click', openAccountMenu);
openSettingsButton.addEventListener('click', () => openSettings(false));
openApartmentSetupButton.addEventListener('click', () => {
  closeSettings();
  apartmentSetupOverlay.hidden = false;
  document.body.classList.add('modal-open');
});
closeSettingsButton.addEventListener('click', closeSettings);
settingsDoneButton.addEventListener('click', finishSettings);
settingsTabButtons.forEach((button) => {
  button.addEventListener('click', () => setSettingsSection(button.dataset.settingsTarget));
});
settingsBookingMode.addEventListener('change', () => setBookingMode(settingsBookingMode.value, false));
settingsOverlay.addEventListener('click', (event) => {
  if (event.target === settingsOverlay) {
    closeSettings();
  }
});

houseSelect.addEventListener('change', () => switchHouse(houseSelect.value));

houseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createHouse();
});
resourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await createResource();
});
maintenanceSearch.addEventListener('input', renderMaintenanceCases);
maintenanceStatusFilter.addEventListener('change', renderMaintenanceCases);

adminEmailTestButton.addEventListener('click', sendAdminTestEmail);
adminPushTestButton.addEventListener('click', sendAdminTestPush);
runBackupButton.addEventListener('click', runBackupNow);
toggleMaintenanceButton.addEventListener('click', toggleMaintenanceMode);
resetBookingsButton.addEventListener('click', resetAllBookings);
superadminTransferButton.addEventListener('click', transferSuperadmin);
updateAppButton.addEventListener('click', requestAppUpdate);
checkAppUpdateButton.addEventListener('click', () => checkAppVersion({ manual: true }));
checkMaintenanceButton.addEventListener('click', async () => {
  checkMaintenanceButton.disabled = true;
  const status = await checkAppVersion({ manual: true });
  if (status && !status.maintenance?.active) {
    maintenanceOverlay.hidden = true;
    syncModalStateAfterMaintenance();
    await refreshAll();
  }
  checkMaintenanceButton.disabled = false;
});
openMaintenanceAdminButton.addEventListener('click', () => {
  maintenanceOverlay.hidden = true;
  setAppView('admin');
  setAdminSection('system');
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await changePassword();
});
deleteAccountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await deleteOwnAccount();
});
claimApartmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await finishApartmentSetup('/api/me/apartment/claim', { apartmentCode: existingApartmentCode.value });
});
joinApartmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!window.confirm('Dieses bisherige Konto wird mit dem gemeinsamen Wohnungskonto zusammengefuehrt. Buchungen und Push-Geraete bleiben erhalten. Fortfahren?')) return;
  await finishApartmentSetup('/api/me/apartment/join', { deviceCode: existingDeviceCode.value });
});
function postponeApartmentSetup() {
  apartmentSetupOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  showStatus('Vor der naechsten Buchung muss das Konto noch einer Wohnung zugeordnet werden.', 'error');
}
closeApartmentSetupButton.addEventListener('click', postponeApartmentSetup);
postponeApartmentSetupButton.addEventListener('click', postponeApartmentSetup);

openIntroButton.addEventListener('click', openIntro);
openKnowledgeButton.addEventListener('click', () => {
  closeAccountMenu();
  activeSettingsSection = 'help';
  openSettings(false);
});
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
document.addEventListener('click', (event) => {
  if (!accountMenuPanel.hidden && !event.target.closest('.account-menu')) {
    closeAccountMenu();
  }
});
document.addEventListener('keydown', (event) => {
  if (!sessionWarningOverlay.hidden) {
    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [sessionStayButton, sessionLogoutButton].filter((element) => !element.disabled);
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
    return;
  }
  if (event.key === 'Escape' && !accountMenuPanel.hidden) {
    closeAccountMenu();
    accountMenuButton.focus();
    return;
  }
  if (event.key === 'Escape' && !messageCenterOverlay.hidden) {
    closeMessageCenter();
    return;
  }
  if (event.key === 'Tab' && !messageCenterOverlay.hidden) {
    const focusable = [...messageCenterOverlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
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
    return;
  }
  if (event.key === 'Escape' && !reportIssueOverlay.hidden) {
    closeReportIssue();
    return;
  }
  if (event.key === 'Tab' && !reportIssueOverlay.hidden) {
    const focusable = [...reportIssueOverlay.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
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
    return;
  }
  if (event.key === 'Escape' && !releaseNoticeOverlay.hidden) {
    closeReleaseNotice();
    return;
  }
  if (event.key === 'Tab' && !releaseNoticeOverlay.hidden) {
    const focusable = [...releaseNoticeOverlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
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
    return;
  }
  if (event.key === 'Escape' && !settingsOverlay.hidden) {
    closeSettings();
    return;
  }
  if (event.key === 'Tab' && !settingsOverlay.hidden) {
    const focusable = [...settingsOverlay.querySelectorAll('button, summary, input, select, [href], [tabindex]:not([tabindex="-1"])')]
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
    return;
  }
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

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderInstallStatus();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  renderInstallStatus();
  showStatus('WaschZeit wurde als App installiert.');
});

if (introVideoSpeechSupported) {
  window.speechSynthesis.addEventListener('voiceschanged', refreshIntroVideoVoice);
  refreshIntroVideoVoice();
}

init().catch((error) => {
  statusText.textContent = error.message;
});
