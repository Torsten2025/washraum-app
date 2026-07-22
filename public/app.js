const i18n = window.WZ_I18N;
const translate = (key, fallback, variables = {}) => i18n?.t(key, variables, fallback) || fallback || key;
const activeLocale = () => i18n?.language() === 'en' ? 'en-GB' : 'de-CH';
const localizedSystemText = (value, fallback = '') => {
  const source = String(value || fallback || '');
  if (i18n?.language() !== 'en') return source;
  const localized = i18n.translateVisibleText(source);
  return localized === source && fallback ? fallback : localized;
};

const userLine = document.querySelector('#userLine');
const logoutForm = document.querySelector('#logoutForm');
const logoutButton = document.querySelector('#logoutButton');
const apartmentSetupLogoutForm = document.querySelector('#apartmentSetupLogoutForm');
const apartmentSetupLogoutButton = document.querySelector('#apartmentSetupLogoutButton');
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
const bookingPanelTitle = document.querySelector('#bookingPanelTitle');
const bookingPanelIntro = document.querySelector('#bookingPanelIntro');
const bookingSuggestion = document.querySelector('#bookingSuggestion');
const bookingFlow = document.querySelector('#bookingFlow');
const singleBookingDetails = document.querySelector('#singleBookingDetails');
const bookingFlowContent = document.querySelector('#bookingFlowContent');
const bookingFlowNotice = document.querySelector('#bookingFlowNotice');
const bookingFlowSteps = document.querySelector('#bookingFlowSteps');
const bookingFlowDescription = document.querySelector('#bookingFlowDescription');
const bookingModeButtons = [...document.querySelectorAll('[data-booking-mode]')];
const weekCalendar = document.querySelector('#weekCalendar');
const calendarEmptyState = document.querySelector('#calendarEmptyState');
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
const superadminPermissionOperation = document.querySelector('#superadminPermissionOperation');
const superadminPermissionAction = document.querySelector('#superadminPermissionAction');
const superadminPermissionTarget = document.querySelector('#superadminPermissionTarget');
const superadminPermissionConfirm = document.querySelector('#superadminPermissionConfirm');
const superadminPermissionCurrentPassword = document.querySelector('#superadminPermissionCurrentPassword');
const superadminPermissionButton = document.querySelector('#superadminPermissionButton');
const adminAnalytics = document.querySelector('#adminAnalytics');
const resetBookingsConfirm = document.querySelector('#resetBookingsConfirm');
const resetBookingsCurrentPassword = document.querySelector('#resetBookingsCurrentPassword');
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
const maintenancePasswordLabel = document.querySelector('#maintenancePasswordLabel');
const maintenanceCurrentPassword = document.querySelector('#maintenanceCurrentPassword');
const toggleMaintenanceButton = document.querySelector('#toggleMaintenanceButton');
const apartmentForm = document.querySelector('#apartmentForm');
const apartmentLabelInput = document.querySelector('#apartmentLabelInput');
const apartmentDisplayNameInput = document.querySelector('#apartmentDisplayNameInput');
const apartmentInviteEmailInput = document.querySelector('#apartmentInviteEmailInput');
const apartmentInvitationResult = document.querySelector('#apartmentInvitationResult');
const adminPeopleSearch = document.querySelector('#adminPeopleSearch');
const apartmentList = document.querySelector('#apartmentList');
const superadminBox = document.querySelector('#superadminBox');
const houseForm = document.querySelector('#houseForm');
const houseNameInput = document.querySelector('#houseNameInput');
const houseList = document.querySelector('#houseList');
const resourceForm = document.querySelector('#resourceForm');
const resourceNameInput = document.querySelector('#resourceNameInput');
const resourceTypeInput = document.querySelector('#resourceTypeInput');
const resourceAdminList = document.querySelector('#resourceAdminList');
const resourceOverview = document.querySelector('#resourceOverview');
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
const devicePairingCard = document.querySelector('#devicePairingCard');
const devicePairingPanel = document.querySelector('#devicePairingPanel');
const devicePairingQr = document.querySelector('#devicePairingQr');
const devicePairingApartment = document.querySelector('#devicePairingApartment');
const devicePairingExpires = document.querySelector('#devicePairingExpires');
const notificationResourceType = document.querySelector('#notificationResourceType');
const notificationWeekday = document.querySelector('#notificationWeekday');
const notificationSlot = document.querySelector('#notificationSlot');
const openSettingsButton = document.querySelector('#openSettingsButton');
const openDiaperGameButton = document.querySelector('#openDiaperGameButton');
const diaperGameOverlay = document.querySelector('#diaperGameOverlay');
const closeDiaperGameButton = document.querySelector('#closeDiaperGameButton');
const diaperGameStage = document.querySelector('#diaperGameStage');
const diaperGameActions = document.querySelector('#diaperGameActions');
const diaperGameStatus = document.querySelector('#diaperGameStatus');
const diaperGameProgress = document.querySelector('#diaperGameProgress');
const diaperCountdown = document.querySelector('#diaperCountdown');
const diaperSerial = document.querySelector('#diaperSerial');
const diaperMissionLabel = document.querySelector('#diaperMissionLabel');
const diaperToolTitle = document.querySelector('#diaperToolTitle');
const diaperModuleCounter = document.querySelector('#diaperModuleCounter');
const diaperMissionBrief = document.querySelector('#diaperMissionBrief');
const diaperStrikeLights = document.querySelector('#diaperStrikeLights');
const diaperSoundButton = document.querySelector('#diaperSoundButton');
const diaperLeaderboardList = document.querySelector('#diaperLeaderboardList');
const diaperOwnRank = document.querySelector('#diaperOwnRank');
const diaperStepRailSegments = [...document.querySelectorAll('.diaper-step-rail span')];
const diaperPressureText = document.querySelector('#diaperPressureText');
const diaperPressureBar = document.querySelector('#diaperPressureBar');
const diaperIncident = document.querySelector('#diaperIncident');
const diaperIncidentIcon = document.querySelector('#diaperIncidentIcon');
const diaperIncidentTitle = document.querySelector('#diaperIncidentTitle');
const diaperIncidentText = document.querySelector('#diaperIncidentText');
const startDiaperGameButton = document.querySelector('#startDiaperGameButton');
const resetDiaperBestButton = document.querySelector('#resetDiaperBestButton');
const rankedDiaperModeButton = document.querySelector('#rankedDiaperModeButton');
const practiceDiaperModeButton = document.querySelector('#practiceDiaperModeButton');
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
const introTitle = document.querySelector('#introTitle');
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
const introChapterList = document.querySelector('#introChapterList');
const introTranscriptList = document.querySelector('#introTranscriptList');
const introQuizForm = document.querySelector('#introQuizForm');
const introQuizResult = document.querySelector('#introQuizResult');
const recordedIntroVideo = document.querySelector('#recordedIntroVideo');
const recordedIntroTitle = document.querySelector('#recordedIntroTitle');
const recordedIntroDuration = document.querySelector('#recordedIntroDuration');
const recordedIntroSection = document.querySelector('#recordedIntroSection');
const recordedIntroSource = document.querySelector('#recordedIntroSource');
const recordedIntroTrack = document.querySelector('#recordedIntroTrack');
const recordedIntroChapters = document.querySelector('#recordedIntroChapters');
const recordedIntroFallback = document.querySelector('#recordedIntroFallback');
const recordedIntroTranscriptLink = document.querySelector('#recordedIntroTranscriptLink');
const sessionWarningOverlay = document.querySelector('#sessionWarningOverlay');
const sessionCountdown = document.querySelector('#sessionCountdown');
const sessionStayButton = document.querySelector('#sessionStayButton');
const sessionLogoutButton = document.querySelector('#sessionLogoutButton');

let currentUser = null;
let availableHouses = [];
let resources = [];
let bookings = [];
let myBookingItems = [];
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
let calendarResourceCount = null;
let houseContextRevision = 0;
let appViewRevision = 0;
const staleHouseRequest = Symbol('stale-house-request');
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
let settingsFirstRun = false;
let devicePairingCountdownTimer = null;
let devicePairingApartmentLabel = '';
let currentPushState = 'checking';
let currentPushError = '';
let activeAdminSection = 'overview';
let adminUserDirectory = [];
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

function weekdayLabel(weekday) {
  const date = new Date(Date.UTC(2024, 0, Number(weekday)));
  return new Intl.DateTimeFormat(activeLocale(), { weekday: 'long', timeZone: 'UTC' }).format(date);
}

function introSceneImage(filename) {
  return `<img class="video-scene-image" src="/assets/intro/scenes/${filename}?v=scenes-v1" alt="">`;
}

const defaultIntroVideoSteps = [
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

let introVideoSteps = defaultIntroVideoSteps;
let activeIntroDefinition = null;
let activeIntroMedia = null;

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
  return new Intl.DateTimeFormat(activeLocale(), {
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
  const startLabel = new Intl.DateTimeFormat(activeLocale(), dateOptions).format(start);
  const endLabel = new Intl.DateTimeFormat(activeLocale(), dateOptions).format(end);
  return `${startLabel} - ${endLabel}`;
}

function formatCalendarMonth(dateString) {
  return new Intl.DateTimeFormat(activeLocale(), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${startOfMonth(dateString)}T12:00:00Z`));
}

function typeLabel(type) {
  if (type === 'washer') return translate('resource.washer', 'Waschmaschine');
  if (type === 'drying_room') return translate('resource.dryingRoom', 'Trockenraum');
  if (type === 'tumbler') return translate('resource.dryer', 'Tumbler');
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
  if (diffDays < 0) return translate('app.statusPast', 'vergangen');
  if (diffDays === 0) return translate('app.statusToday', 'heute');
  if (diffDays === 1) return translate('app.statusTomorrow', 'morgen');
  return translate('app.statusPlanned', 'geplant');
}

function isPastSlot(dateString, slot) {
  const [, end] = slot.split('-');
  return Date.parse(`${dateString}T${end}:00Z`) <= swissClockTimestamp();
}

function showStatus(message, tone = 'ok') {
  window.clearTimeout(statusTimer);
  statusText.textContent = i18n?.translateVisibleText(message) || message;
  statusText.className = `notice ${tone}`;
  if (message) {
    statusTimer = window.setTimeout(() => {
      statusText.textContent = '';
      statusText.className = 'notice muted';
    }, tone === 'error' ? 10000 : 7000);
  }
}

function messageReadKey() {
  return currentUser ? `waschzeit-messages-read-${currentUser.id}` : 'waschzeit-messages-read';
}

function messageTimestamp(value) {
  const timestamp = Date.parse(String(value || '').replace(' ', 'T'));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function messageCenterEntries() {
  return releaseNoticeItems.map((notice) => ({
    type: 'release',
    createdAt: notice.created_at,
    notice
  }))
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
  const actor = notice.created_by_name
    ? translate('app.byActor', ` von ${notice.created_by_name}`, { actor: notice.created_by_name })
    : '';
  copy.innerHTML = `
    <span class="suggestion-label">${escapeHtml(translate('app.newlyAvailable', 'Neu frei'))}</span>
    <strong>${escapeHtml(notice.resource_name)} - ${escapeHtml(formatShortDate(notice.booking_date))}, ${escapeHtml(notice.slot)}</strong>
    <small>${escapeHtml(translate('app.releasedBy', `Freigegeben${actor}`, { actor }))}</small>
  `;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'text-button';
  action.textContent = notice.bookable
    ? translate('app.viewAndBook', 'Ansehen und buchen')
    : translate('app.viewOnly', 'Ansehen');
  action.addEventListener('click', () => openReleaseNotice(notice));
  releaseSpotlightContent.append(copy, action);
}

function renderMessageCenter() {
  const entries = messageCenterEntries();
  messageCenterList.innerHTML = '';
  if (!entries.length) {
    messageCenterList.innerHTML = `<div class="message-center-empty"><strong>${escapeHtml(translate('app.allQuiet', 'Alles ruhig.'))}</strong><p>${escapeHtml(translate('app.messageCenterHint', 'Passende freie Termine erscheinen hier, solange sie noch buchbar sind.'))}</p></div>`;
  }

  for (const entry of entries) {
    const item = document.createElement('article');
    item.className = `message-item is-${entry.type}`;
    const createdAt = new Date(messageTimestamp(entry.createdAt));
    const notice = entry.notice;
    const actor = notice.created_by_name || translate('app.someone', 'Jemand');
    item.innerHTML = `
      <div class="message-item-copy">
        <span class="message-kind">${escapeHtml(translate('app.newlyAvailable', 'Neu frei'))}</span>
        <strong>${escapeHtml(translate('app.availableAgain', `${notice.resource_name} ist wieder frei`, { resource: notice.resource_name }))}</strong>
        <p>${escapeHtml(formatShortDate(notice.booking_date))} - ${escapeHtml(notice.slot)} - ${escapeHtml(translate('app.fromActor', `von ${actor}`, { actor }))}</p>
        <small>${escapeHtml(createdAt.toLocaleString(activeLocale()))}</small>
      </div>
    `;
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'secondary';
    action.textContent = translate('app.book', 'Buchen');
    action.addEventListener('click', () => {
      closeMessageCenter();
      openReleaseNotice(notice);
    });
    item.append(action);
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

function maintenanceStatusLabel(status) {
  const labels = {
    reported: ['admin.statusReported', 'Neu gemeldet'],
    blocked: ['admin.statusBlocked', 'Gesperrt'],
    repairing: ['admin.statusRepairing', 'In Reparatur'],
    tested: ['admin.statusTested', 'Pruefung bestanden'],
    closed: ['admin.statusClosed', 'Abgeschlossen']
  };
  return labels[status] ? translate(...labels[status]) : status;
}

function maintenanceEntryLabel(entryType) {
  const labels = {
    report: ['admin.entryReport', 'Meldung'],
    note: ['admin.entryNote', 'Notiz'],
    block: ['admin.entryBlock', 'Sperre'],
    repair: ['admin.entryRepair', 'Reparatur'],
    test_passed: ['admin.entryTestPassed', 'Funktionspruefung bestanden'],
    test_failed: ['admin.entryTestFailed', 'Funktionspruefung nicht bestanden'],
    release: ['admin.entryRelease', 'Freigabe und Abschluss']
  };
  return labels[entryType] ? translate(...labels[entryType]) : entryType;
}

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
      <span class="maintenance-status status-${escapeHtml(item.status)}">${escapeHtml(maintenanceStatusLabel(item.status))}</span>
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
  configureIntroForCurrentUser();
  introOverlay.hidden = false;
  document.body.classList.add('modal-open');
  renderIntroVideo();
  closeIntroButton.focus();
}

function currentIntroRole() {
  if (currentUser?.isSuperadmin) return 'superadmin';
  if (currentUser?.isHouseAdmin) return 'house_admin';
  return 'resident';
}

function introSceneForChapter(chapter) {
  const imageByView = {
    settings: 'settings-profile.png',
    calendar: 'calendar-booking.png',
    'booking-assistant': 'booking-time-focused.png',
    'my-bookings': 'app-full-page.png',
    'booking-details': 'release-dialog.png',
    'message-center': 'message-center.png',
    'issue-report': 'app-full-page.png',
    'house-rules': 'cleaning-tasks.png'
  };
  const filename = imageByView[chapter.visual?.view] || 'app-full-page.png';
  return `<img class="intro-role-visual" src="/assets/intro/scenes/${filename}?v=scenes-v1" alt="">`;
}

function formatMediaDuration(seconds) {
  const rounded = Math.max(0, Math.round(Number(seconds || 0)));
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

function activeRecordedChapterIndex() {
  if (!activeIntroMedia) return 0;
  const currentTime = Number(recordedIntroVideo.currentTime || 0);
  let activeIndex = 0;
  activeIntroMedia.chapters.forEach((chapter, index) => {
    if (currentTime + 0.05 >= chapter.startTime) activeIndex = index;
  });
  return activeIndex;
}

function updateRecordedIntroChapterState() {
  const activeIndex = activeRecordedChapterIndex();
  recordedIntroChapters.querySelectorAll('[data-recorded-chapter]').forEach((button, index) => {
    button.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
  });
}

function seekRecordedIntroChapter(index, { play = false } = {}) {
  const chapter = activeIntroMedia?.chapters?.[Number(index)];
  if (!chapter) return;
  const seek = () => {
    recordedIntroVideo.currentTime = Math.min(chapter.startTime, Math.max(0, recordedIntroVideo.duration - 0.05));
    updateRecordedIntroChapterState();
    if (play) recordedIntroVideo.play().catch(() => {});
  };
  if (recordedIntroVideo.readyState >= 1) seek();
  else recordedIntroVideo.addEventListener('loadedmetadata', seek, { once: true });
}

function configureRecordedIntroMedia(media, { preserveStep = false } = {}) {
  const previousChapterId = preserveStep
    ? activeIntroMedia?.chapters?.[activeRecordedChapterIndex()]?.id
    : '';
  activeIntroMedia = media || null;
  recordedIntroSection.hidden = !activeIntroMedia;
  if (!activeIntroMedia) return;

  const mediaVersion = window.WaschZeitIntroMedia?.version || 'media-v1';
  const mediaUrl = (value) => `${value}?v=${encodeURIComponent(mediaVersion)}`;
  const sourceChanged = recordedIntroVideo.dataset.mediaId !== activeIntroMedia.id;
  recordedIntroVideo.dataset.mediaId = activeIntroMedia.id;
  recordedIntroVideo.poster = mediaUrl(activeIntroMedia.poster);
  recordedIntroSource.src = mediaUrl(activeIntroMedia.video);
  recordedIntroTrack.src = mediaUrl(activeIntroMedia.captions);
  recordedIntroTrack.srclang = activeIntroMedia.language;
  recordedIntroTrack.label = activeIntroMedia.languageLabel;
  recordedIntroTranscriptLink.href = mediaUrl(activeIntroMedia.transcript);
  recordedIntroTitle.textContent = activeIntroMedia.title;
  recordedIntroDuration.textContent = formatMediaDuration(activeIntroMedia.duration);
  recordedIntroChapters.setAttribute('aria-label', translate('intro.videoChapters', 'Videokapitel'));
  recordedIntroFallback.textContent = translate('intro.mediaFallback', 'Das Video ist gerade nicht verfuegbar. Transkript und interaktive Einfuehrung bleiben nutzbar.');
  recordedIntroTranscriptLink.textContent = translate('intro.transcript', 'Text zum Mitlesen');
  recordedIntroFallback.hidden = true;
  recordedIntroChapters.innerHTML = activeIntroMedia.chapters.map((chapter, index) => `
    <button type="button" class="secondary" data-recorded-chapter="${index}" aria-current="${index === 0 ? 'true' : 'false'}">
      <span>${formatMediaDuration(chapter.startTime)}</span>
      <strong>${escapeHtml(chapter.title)}</strong>
    </button>
  `).join('');
  if (sourceChanged) recordedIntroVideo.load();
  const preservedIndex = previousChapterId
    ? activeIntroMedia.chapters.findIndex((chapter) => chapter.id === previousChapterId)
    : -1;
  if (preservedIndex >= 0) seekRecordedIntroChapter(preservedIndex);
}

function configureIntroForCurrentUser({ preserveStep = false } = {}) {
  const language = i18n?.language() || 'de';
  const previousStepId = preserveStep ? introVideoSteps[introVideoStepIndex]?.id : '';
  const definition = window.WaschZeitIntroCatalog?.get(currentIntroRole(), language);
  const media = window.WaschZeitIntroMedia?.get(currentIntroRole(), language);
  activeIntroDefinition = definition || null;
  introVideoSteps = definition
    ? definition.chapters.map((chapter) => ({
        id: chapter.id,
        fallbackDurationMs: chapter.duration * 1000,
        title: chapter.title,
        caption: chapter.caption,
        speech: chapter.tts || chapter.transcript,
        transcript: chapter.transcript,
        description: chapter.description,
        startTime: chapter.startTime,
        visual: introSceneForChapter(chapter)
      }))
    : defaultIntroVideoSteps;

  stopIntroVideo();
  const preservedStepIndex = previousStepId
    ? introVideoSteps.findIndex((step) => step.id === previousStepId)
    : -1;
  introVideoStepIndex = preservedStepIndex >= 0 ? preservedStepIndex : 0;
  introVideoFinished = false;
  introTitle.textContent = definition?.title || translate('intro.title', 'In Ruhe durch den Waschplan.');
  configureRecordedIntroMedia(media, { preserveStep });
  introTranscriptList.innerHTML = introVideoSteps.map((step) => (
    `<li><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.transcript || step.speech)}</span></li>`
  )).join('');
  introChapterList.innerHTML = introVideoSteps.map((step, index) => `
    <button type="button" data-intro-chapter="${index}" aria-current="${index === introVideoStepIndex ? 'step' : 'false'}">
      <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
      <span>${escapeHtml(step.description || step.caption)}</span>
    </button>
  `).join('');
  refreshIntroVideoVoice();
  renderIntroVideo();
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
  return currentPushState === 'active';
}

function renderSettingsSummary() {
  if (!currentUser) return;
  const emailReady = Boolean(currentUser.email && currentUser.emailVerified);
  const installReady = appInstalled();
  const pushReady = pushIsActive();
  const completedCount = [emailReady, installReady, pushReady].filter(Boolean).length;
  settingsProgressText.textContent = translate(
    'settings.progress',
    '{completed} von 3 Schritten erledigt.',
    { completed: completedCount }
  );
  const items = [
    {
      label: translate('settings.summaryEmail', 'E-Mail'),
      value: !currentUser.email
        ? translate('settings.summaryMissing', 'fehlt')
        : currentUser.emailVerified
          ? translate('settings.summaryConfirmed', 'bestaetigt')
          : translate('settings.summaryConfirm', 'bestaetigen')
    },
    {
      label: translate('settings.summaryApp', 'App'),
      value: installReady
        ? translate('settings.summaryInstalled', 'installiert')
        : translate('settings.summaryOptional', 'optional')
    },
    {
      label: translate('settings.summaryPush', 'Push'),
      value: pushReady
        ? translate('settings.summaryActive', 'aktiv')
        : translate('settings.summaryInactive', 'nicht aktiv')
    }
  ];
  settingsSummary.innerHTML = items.map((item) => (
    `<span><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.value)}</span>`
  )).join('');
}

function renderSettingsHeader() {
  settingsEyebrow.textContent = settingsFirstRun
    ? translate('settings.firstStart', 'Erster Start')
    : translate('settings.yourAccount', 'Dein Konto');
  settingsTitle.textContent = settingsFirstRun
    ? translate('settings.firstTitle', 'Einmal kurz einrichten.')
    : translate('common.settings', 'Einstellungen');
  settingsIntroText.textContent = settingsFirstRun
    ? translate('settings.firstHint', 'Pruefe zuerst deine E-Mail. App, Push und weitere Kontofunktionen findest du anschliessend in den Reitern.')
    : translate('settings.intro', 'Profil, Benachrichtigungen, App, Hilfe und Sicherheit sind hier gebuendelt.');
}

function renderApartmentAccountStatus() {
  apartmentAccountStatus.textContent = currentUser.apartmentLabel
    ? translate('settings.apartmentAccount', 'Wohnungskonto: {apartment}', { apartment: currentUser.apartmentLabel })
    : currentUser.canManage
      ? translate('settings.adminWithoutApartment', 'Verwaltungszugang ohne Wohnungszuordnung.')
      : translate('settings.apartmentMissing', 'Wohnung noch nicht zugeordnet.');
}

function renderDevicePairingLabels() {
  createDeviceCodeButton.textContent = devicePairingPanel.hidden
    ? translate('settings.createQr', 'QR-Code erzeugen')
    : translate('settings.createNewQr', 'Neuen QR-Code erzeugen');
  if (!devicePairingPanel.hidden) {
    devicePairingApartment.textContent = devicePairingApartmentLabel
      ? translate('settings.apartmentAccount', 'Wohnungskonto: {apartment}', { apartment: devicePairingApartmentLabel })
      : translate('settings.sharedApartmentAccount', 'Gemeinsames Wohnungskonto');
  }
  if (devicePairingCode.dataset.expired === 'true') {
    devicePairingExpires.textContent = translate('settings.qrExpired', 'Dieser QR-Code ist abgelaufen.');
    devicePairingCode.textContent = translate('settings.expired', 'Abgelaufen');
  }
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
  settingsFirstRun = firstRun;
  renderSettingsHeader();
  settingsUsername.value = currentUser.displayName || currentUser.username;
  settingsApartmentLabel.value = currentUser.apartmentLabel || '';
  settingsApartmentLabelWrap.hidden = !currentUser.apartmentLabel;
  nameCorrectionPanel.hidden = !currentUser.canBook || !currentUser.apartmentLabel;
  requestedDisplayName.value = currentUser.displayName || '';
  settingsRole.value = currentRoleLabel();
  settingsBookingMode.value = bookingMode;
  renderApartmentAccountStatus();
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
  showStatus(translate('settings.saved', 'Persoenliche Einrichtung gespeichert.'));
}

function introVideoStepDuration(step) {
  const spokenWords = step.speech.trim().split(/\s+/).length;
  const naturalReadingTime = Math.ceil((spokenWords / 2.25) * 1000 + 1400);
  return Math.max(step.fallbackDurationMs, naturalReadingTime);
}

function introVoiceScore(voice) {
  const name = voice.name.toLowerCase();
  const language = i18n?.language() || 'de';
  let score = 0;
  if (/natural|online/.test(name)) score += 100;
  if (language === 'en' && voice.lang.toLowerCase().startsWith('en')) score += 35;
  if (language === 'de' && voice.lang.toLowerCase() === 'de-ch') score += 35;
  if (language === 'de' && voice.lang.toLowerCase() === 'de-de') score += 30;
  if (/google|microsoft|apple/.test(name)) score += 20;
  if (voice.default) score += 5;
  return score;
}

function refreshIntroVideoVoice() {
  if (!introVideoSpeechSupported) {
    return;
  }
  const language = i18n?.language() || 'de';
  const matchingVoices = window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((left, right) => introVoiceScore(right) - introVoiceScore(left));
  introVideoPreferredVoice = matchingVoices[0] || null;
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
  introVideoChapter.textContent = translate(
    'intro.chapterCount',
    `Kapitel ${introVideoStepIndex + 1} von ${introVideoSteps.length}`,
    { current: introVideoStepIndex + 1, total: introVideoSteps.length }
  );
  introVideoTitle.textContent = step.title;
  introVideoCaption.textContent = step.caption;
  if (introVideoVisual.dataset.step !== step.id) {
    introVideoVisual.dataset.step = step.id;
    introVideoVisual.innerHTML = step.visual;
  }
  introVideoProgress.style.width = `${Math.round(progress * 100)}%`;
  introVideoProgressTrack.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  introVideoPlayButton.textContent = introVideoPlaying
    ? translate('intro.pause', 'Pause')
    : introVideoFinished
      ? translate('intro.watchAgain', 'Erneut ansehen')
      : introVideoStepElapsedMs > 0
        ? translate('intro.continue', 'Fortsetzen')
        : translate('intro.startGuide', 'Einf\u00fchrung starten');
  introVideoPreviousButton.disabled = introVideoStepIndex === 0;
  introVideoNextButton.disabled = introVideoStepIndex === introVideoSteps.length - 1;
  introChapterList.querySelectorAll('[data-intro-chapter]').forEach((button, index) => {
    button.setAttribute('aria-current', index === introVideoStepIndex ? 'step' : 'false');
  });

  if (!introVideoSpeechSupported) {
    introVideoMuteButton.textContent = translate('intro.voiceUnavailable', 'Stimme nicht verfuegbar');
    introVideoMuteButton.disabled = true;
    introVideoVoiceStatus.textContent = translate('intro.withTranscript', 'Mit Text zum Mitlesen');
  } else {
    const voiceName = introVideoPreferredVoice?.name.toLowerCase() || '';
    const english = i18n?.language() === 'en';
    introVideoMuteButton.textContent = introVideoSpeechEnabled
      ? translate('intro.voiceOff', 'Stimme ausschalten')
      : translate('intro.voiceOn', 'Stimme einschalten');
    introVideoMuteButton.setAttribute('aria-pressed', String(introVideoSpeechEnabled));
    introVideoVoiceStatus.textContent = introVideoSpeechEnabled
      ? (/natural|online/.test(voiceName)
        ? (english ? 'Natural English voice' : 'Nat\u00fcrliche deutsche Stimme')
        : (english ? 'With English voice' : 'Mit deutscher Stimme'))
      : translate('intro.noVoice', 'Ohne Sprachausgabe');
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
    utterance.lang = i18n?.language() === 'en' ? 'en-GB' : 'de-CH';
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

function jumpIntroVideoStep(index) {
  const requestedIndex = Number(index);
  if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= introVideoSteps.length) return;
  const continuePlaying = introVideoPlaying;
  stopIntroVideo();
  introVideoStepIndex = requestedIndex;
  introVideoFinished = false;
  seekRecordedIntroChapter(requestedIndex);
  renderIntroVideo();
  if (continuePlaying) startIntroVideoPlayback();
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
    introQuizResult.textContent = translate('intro.quizMissing', 'Waehle bitte bei jeder Frage eine Antwort. Danach schauen wir sie gemeinsam an.');
    return;
  }
  if (correct === questions.length) {
    introQuizResult.textContent = translate('intro.quizCorrect', 'Passt. Die wichtigsten Punkte sitzen, und du kannst direkt loslegen.');
    return;
  }
  introQuizResult.textContent = i18n?.language() === 'en'
    ? `${correct} of ${questions.length} answers are correct. Review the highlighted questions above. You can still use the app normally.`
    : `${correct} von ${questions.length} Antworten passen schon. Die orange markierten Fragen kannst du oben noch einmal nachlesen. Du kannst die App natuerlich trotzdem nutzen.`;
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
  if (!value) return translate('settings.dateUnknown', 'Datum unbekannt');
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(activeLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  if (currentUser?.canManage) {
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
  const versionLabelFallback = version.includes('-test.') ? 'Testversion' : 'Version';
  const versionLabel = version.includes('-test.')
    ? translate('common.testVersion', versionLabelFallback)
    : translate('settings.version', versionLabelFallback);
  appVersionText.textContent = translate(
    'settings.versionStatus',
    '{label} {version} - Stand {date}',
    { label: versionLabel, version, date: formatReleaseDate(releasedAt) }
  );
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
    if (!response.ok) throw new Error(translate('settings.versionLoadFailed', 'Versionsstatus konnte nicht geladen werden.'));
    latestReleaseStatus = await response.json();
    renderReleaseStatus();
    if (manual) {
      showStatus(latestReleaseStatus.release === loadedAppRelease
        ? translate('settings.versionCurrent', 'Du verwendest bereits die aktuelle Version.')
        : translate('settings.versionReady', 'Eine neue Version ist bereit.'));
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
  const initialAppViewRevision = appViewRevision;
  bookingDate.value = todayString();
  syncCalendarPeriod(bookingDate.value);
  const me = await api('/api/me');
  if (!me || !me.user) {
    window.location.href = '/login.html';
    return;
  }

  if (i18n) await i18n.syncAccount(me.user);
  currentUser = me.user;
  reportIssueButton.hidden = !currentUser.canBook;
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

  const initialHouseRevision = houseContextRevision;
  const [resourceData, slotData] = await Promise.all([
    resolveHouseScopedRequest(initialHouseRevision, api('/api/resources')),
    api('/api/slots')
  ]);
  if (resourceData !== staleHouseRequest) resources = resourceData.resources;
  slots = slotData.slots;

  if (currentUser.canManage) {
    viewSwitcher.hidden = false;
    await loadAdmin();
  }

  await refreshAll();
  if (currentUser.canManage && !currentUser.canBook) {
    setAppView('admin', { expectedRevision: initialAppViewRevision });
  }
  const pageUrl = new URL(window.location.href);
  if (pageUrl.searchParams.get('notice')) {
    await openReleaseNoticeFromUrl(pageUrl);
  }
  if (pageUrl.searchParams.get('welcome') === '1') {
    openSettings(!settingsCompleted());
    window.history.replaceState({}, '', '/index.html');
  }
}

function setAppView(view, { userInitiated = false, expectedRevision = null } = {}) {
  if (expectedRevision !== null && expectedRevision !== appViewRevision) return false;
  if (userInitiated) appViewRevision += 1;
  const adminView = view === 'admin' && currentUser?.canManage;
  document.body.classList.toggle('admin-view', adminView);
  bookingViewButton.classList.toggle('active', !adminView);
  adminViewButton.classList.toggle('active', adminView);
  if (adminView) setAdminSection(activeAdminSection);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return true;
}

function setAdminSection(sectionName) {
  if (!adminSections.some((section) => section.dataset.adminSection === sectionName)) return;
  activeAdminSection = sectionName;
  for (const button of adminSectionButtons) {
    const active = button.dataset.adminTarget === sectionName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
    button.setAttribute('aria-selected', String(active));
    button.setAttribute('tabindex', active ? '0' : '-1');
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

function renderAdminWorkQueue({ overview, recovery, apartments, resources: adminResourceItems, cases, fixedBookings, auditEntries }) {
  const openCases = cases.filter((item) => item.status !== 'closed');
  const reportedCases = openCases.filter((item) => item.status === 'reported');
  const testsDue = openCases.filter((item) => item.status === 'repairing');
  const releasesDue = openCases.filter((item) => item.status === 'tested');
  const blockedResources = adminResourceItems.filter((item) => !item.active);
  const nameRequests = apartments.filter((item) => item.name_request_id);
  const openInvitations = apartments.filter((item) => item.invitationStatus === 'pending');
  const invitationProblems = apartments.filter((item) => ['expired', 'not_sent'].includes(item.invitationStatus));
  const recoveryWarnings = recovery.warnings || [];
  const suspiciousAuditEntries = (auditEntries || []).filter((item) => /failed|denied|reset|delete/i.test(item.action || '')).slice(0, 3);
  const tasks = [];

  const houseSuffix = (items) => {
    if (!currentUser.isSuperadmin) return '';
    const names = [...new Set(items.map((item) => item.house_name).filter(Boolean))];
    return names.length === 1
      ? ` - ${names[0]}`
      : names.length > 1
        ? ` - ${translate('admin.houseSuffixMany', '{count} Haeuser', { count: names.length })}`
        : '';
  };

  if (reportedCases.length) {
    tasks.push({
      level: 'urgent',
      title: translate(reportedCases.length === 1 ? 'admin.newIssueOne' : 'admin.newIssueMany', '{count} neue Stoerungen pruefen', { count: reportedCases.length }),
      text: translate('admin.issueTaskText', 'Meldung lesen, bei Bedarf sperren und den naechsten Schritt dokumentieren.'),
      section: 'logbook',
      action: translate('admin.handleIssue', 'Stoerung bearbeiten'),
      group: 'tasks',
      items: reportedCases
    });
  } else if (openCases.length) {
    tasks.push({
      level: 'attention',
      title: translate(openCases.length === 1 ? 'admin.openLogTaskOne' : 'admin.openLogTaskMany', '{count} offene Tagebuchaufgaben', { count: openCases.length }),
      text: translate('admin.logTaskText', 'Reparatur, Funktionspruefung oder Freigabe nachvollziehbar fortfuehren.'),
      section: 'logbook',
      action: testsDue.length
        ? translate('admin.test', 'Funktionspruefung durchfuehren')
        : releasesDue.length
          ? translate('admin.finishRelease', 'Freigabe abschliessen')
          : translate('admin.continueLogbook', 'Tagebuch fortfuehren'),
      group: 'tasks',
      items: openCases
    });
  }

  if (nameRequests.length) {
    tasks.push({
      level: 'attention',
      title: translate(nameRequests.length === 1 ? 'admin.nameRequestOne' : 'admin.nameRequestMany', '{count} Namenskorrekturen entscheiden', { count: nameRequests.length }),
      text: translate('admin.nameRequestText', 'Klingelschild-Vorschlag pruefen und anschliessend uebernehmen oder ablehnen.'),
      section: 'people',
      action: translate('admin.accountCheck', 'Konto pruefen'),
      group: 'tasks'
    });
  }

  if (invitationProblems.length) {
    tasks.push({
      level: 'attention',
      title: translate(invitationProblems.length === 1 ? 'admin.invitationProblemOne' : 'admin.invitationProblemMany', '{count} Einladungen brauchen Aufmerksamkeit', { count: invitationProblems.length }),
      text: translate('admin.invitationProblemText', 'Abgelaufene oder nicht versendete Einladung pruefen und gezielt erneuern.'),
      section: 'people',
      action: translate('admin.renewInvitation', 'Einladung erneut senden'),
      group: 'tasks'
    });
  }

  if (overview.usersMissingEmail) {
    tasks.push({
      level: 'attention',
      title: translate(overview.usersMissingEmail === 1 ? 'admin.accountMissingEmailOne' : 'admin.accountMissingEmailMany', '{count} Konten ohne E-Mail', { count: overview.usersMissingEmail }),
      text: translate('admin.identityRecoveryText', 'Identitaet persoenlich pruefen und bei Bedarf einen kurz gueltigen Wiederherstellungscode ausgeben.'),
      section: 'people',
      action: translate('admin.accountCheck', 'Konto pruefen'),
      group: 'warnings'
    });
  }

  if (blockedResources.length && !openCases.length) {
    tasks.push({
      level: 'attention',
      title: translate(blockedResources.length === 1 ? 'admin.blockedResourceOne' : 'admin.blockedResourceMany', '{count} gesperrte Ressourcen', { count: blockedResources.length }),
      text: translate('admin.blockedResourceText', 'Sperren bleiben bis zur dokumentierten Funktionspruefung und Freigabe bestehen.'),
      section: 'logbook',
      action: translate('admin.viewEquipment', 'Geraet anzeigen'),
      group: 'warnings'
    });
  }

  if (currentUser.isSuperadmin && recoveryWarnings.length) {
    tasks.push({
      level: recoveryWarnings.some((item) => item.level === 'critical') ? 'urgent' : 'attention',
      title: translate('admin.successorTitle', 'Admin-Nachfolge absichern'),
      text: i18n?.translateVisibleText(recoveryWarnings[0].message) || recoveryWarnings[0].message,
      section: 'system',
      action: translate('admin.successorCheck', 'Nachfolge pruefen'),
      group: 'warnings'
    });
  }

  if (currentUser.isSuperadmin && !overview.externalBackupConfigured) {
    tasks.push({
      level: 'attention',
      title: translate('admin.backupMissing', 'Externes Backup einrichten'),
      text: translate('admin.backupSetupText', 'Die lokale Sicherung schuetzt nicht vor einem Ausfall des Render-Datentraegers.'),
      section: 'system',
      action: translate('admin.backupSetup', 'Backup einrichten'),
      group: 'warnings'
    });
  }

  if (currentUser.isSuperadmin && !overview.email.configured) {
    tasks.push({
      level: 'attention',
      title: translate('admin.emailSetup', 'E-Mail-Versand einrichten'),
      text: translate('admin.emailSetupText', 'SMTP in Render vervollstaendigen und danach eine Testmail senden.'),
      section: 'system',
      action: translate('admin.emailCheck', 'E-Mail pruefen'),
      group: 'warnings'
    });
  }

  if (currentUser.isSuperadmin && overview.maintenance?.active) {
    tasks.push({
      level: 'urgent',
      title: translate('admin.maintenanceActive', 'Wartungsmodus ist aktiv'),
      text: translate('admin.maintenanceActiveText', 'Schreibende Aktionen bleiben gesperrt, bis System- und Buchungspruefung erfolgreich sind.'),
      section: 'system',
      action: translate('admin.checkMaintenance', 'Wartung pruefen'),
      group: 'warnings'
    });
  }

  if (currentUser.isSuperadmin && suspiciousAuditEntries.length) {
    tasks.push({
      level: 'attention',
      title: translate(suspiciousAuditEntries.length === 1 ? 'admin.suspiciousOne' : 'admin.suspiciousMany', '{count} auffaellige Admin-Aktionen pruefen', { count: suspiciousAuditEntries.length }),
      text: translate('admin.suspiciousText', 'Zuruecksetzungen, Loeschungen oder fehlgeschlagene Aktionen im Audit nachvollziehen.'),
      section: 'system',
      action: translate('admin.viewAudit', 'Audit ansehen'),
      group: 'warnings'
    });
  }

  if (openInvitations.length) {
    tasks.push({
      level: 'info',
      title: translate(openInvitations.length === 1 ? 'admin.openInvitationOne' : 'admin.openInvitationMany', '{count} offene Einladungen', { count: openInvitations.length }),
      text: translate('admin.openInvitationText', 'Die Einladungen sind versendet und warten auf Annahme.'),
      section: 'people',
      action: translate('admin.viewInvitations', 'Einladungen ansehen'),
      group: 'info'
    });
  }

  if ((fixedBookings || []).length) {
    tasks.push({
      level: 'info',
      title: translate(fixedBookings.length === 1 ? 'admin.activeFixedOne' : 'admin.activeFixedMany', '{count} aktive Dauerbuchungen', { count: fixedBookings.length }),
      text: translate('admin.activeFixedText', 'Regelmaessige Reservierungen dieses Hauses sind im Kalender vorgemerkt.'),
      section: 'fixed',
      action: translate('admin.viewFixed', 'Dauertermine ansehen'),
      group: 'info'
    });
  }

  if (currentUser.isSuperadmin) {
    tasks.push({
      level: 'info',
      title: `${translate('admin.production', 'Produktionsstand')} ${loadedAppVersion}`,
      text: `${loadedAppRelease}${loadedAppReleasedAt ? ` - ${loadedAppReleasedAt}` : ''}`,
      section: 'system',
      action: translate('admin.systemView', 'Systemstatus ansehen'),
      group: 'info'
    });
  }

  const actionableCount = tasks.filter((task) => task.group !== 'info').length;
  adminTaskSummary.textContent = actionableCount
    ? translate(actionableCount === 1 ? 'admin.openTaskOne' : 'admin.openTaskMany', '{count} Aufgaben offen', { count: actionableCount })
    : translate('admin.noUrgent', 'Keine dringenden Aufgaben');
  const groupLabels = {
    tasks: translate('admin.tasks', 'Aufgaben'),
    warnings: translate('admin.warnings', 'Warnungen'),
    info: translate('admin.information', 'Informationen')
  };
  adminTaskList.innerHTML = tasks.length
    ? ['tasks', 'warnings', 'info'].map((group) => {
      const groupTasks = tasks.filter((task) => task.group === group).slice(0, group === 'info' ? 3 : 6);
      if (!groupTasks.length) return '';
      return `<section class="admin-task-group" aria-labelledby="admin-task-${group}">
        <h4 id="admin-task-${group}">${groupLabels[group]}</h4>
        ${groupTasks.map((task) => `
      <button class="admin-task-item is-${task.level}" type="button" data-admin-jump="${task.section}">
        <span class="admin-task-state" aria-hidden="true"></span>
        <span class="admin-task-copy">
          <strong>${escapeHtml(task.title)}${escapeHtml(houseSuffix(task.items || []))}</strong>
          <span>${escapeHtml(task.text)}</span>
        </span>
        <span class="admin-task-open">${escapeHtml(task.action)}</span>
      </button>
    `).join('')}</section>`;
    }).join('')
    : `
      <div class="admin-task-empty">
        <strong>${escapeHtml(translate('admin.calm', 'Alles im ruhigen Betrieb'))}</strong>
        <span>${escapeHtml(translate('admin.noTaskText', 'Keine neue Stoerung, Kontowarnung oder Systemaufgabe wartet auf dich.'))}</span>
      </div>
    `;

  const responsibilities = currentUser.isSuperadmin
    ? [
        translate('admin.superResponsibilitiesOne', 'Haus-Admins, Rollen und Nachfolge absichern'),
        translate('admin.superResponsibilitiesTwo', 'Haeuser und technische Ressourcen verwalten'),
        translate('admin.superResponsibilitiesThree', 'Tagebuchfaelle hausuebergreifend kontrollieren'),
        translate('admin.superResponsibilitiesFour', 'Backups, Wartung und Systembetrieb verantworten'),
        translate('admin.superResponsibilitiesFive', 'Im gewaehlten Haus nur bei Bedarf eingreifen')
      ]
    : [
        translate('admin.houseResponsibilitiesOne', 'Wohnungen aktivieren und Konten betreuen'),
        translate('admin.houseResponsibilitiesTwo', 'Geraete und Raeume anlegen oder sperren'),
        translate('admin.houseResponsibilitiesThree', 'Stoerungen bis zur Freigabe dokumentieren'),
        translate('admin.houseResponsibilitiesFour', 'Begruendete Dauertermine pflegen'),
        translate('admin.houseResponsibilitiesFive', 'Betrieb des eigenen Hauses im Blick behalten')
      ];
  adminResponsibilityScope.textContent = currentUser.isSuperadmin
    ? translate('admin.scopeAll', 'Alle Haeuser. Alltagsaktionen gelten fuer das oben ausgewaehlte Haus.')
    : translate('admin.selectedBuildingOnly', 'Nur dieses Haus. Bewohner buchen ihre normalen Waschzeiten selbst.');
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
    ? translate('settings.emailRequired', 'E-Mail ist Pflicht: Bitte Adresse eintragen, sonst ist kein Passwort-Reset moeglich.')
    : currentUser.emailVerified
      ? translate('settings.emailVerified', 'E-Mail-Adresse bestaetigt.')
      : translate('settings.emailUnverified', 'Bitte E-Mail-Adresse bestaetigen. Bis dahin sind Passwort-Reset per Mail und Hinweise nicht vollstaendig nutzbar.');
  emailVerificationStatus.classList.toggle('is-verified', Boolean(currentUser.emailVerified));
  resendVerificationButton.hidden = !configuredAddress || Boolean(currentUser.emailVerified);
  const secondaryConfigured = Boolean(currentUser.secondaryEmail);
  secondaryEmailVerificationStatus.textContent = !secondaryConfigured
    ? translate('settings.secondaryEmailHint', 'Optional: Eine zweite Person kann eine eigene Adresse fuer Reset und Hinweise hinterlegen.')
    : currentUser.secondaryEmailVerified
      ? translate('settings.secondaryEmailVerified', 'Zweite E-Mail-Adresse bestaetigt.')
      : translate('settings.secondaryEmailUnverified', 'Bitte auch die zweite E-Mail-Adresse bestaetigen.');
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
    installHelpText.textContent = translate('settings.installOpen', 'WaschZeit ist auf diesem Geraet bereits als App geoeffnet.');
    installAppButton.hidden = true;
    renderSettingsSummary();
    return;
  }
  installAppButton.hidden = false;
  if (deferredInstallPrompt) {
    installHelpText.textContent = translate('settings.installAvailable', 'Du kannst WaschZeit direkt auf diesem Geraet installieren.');
    installAppButton.disabled = false;
    installAppButton.textContent = translate('settings.install', 'App installieren');
    renderSettingsSummary();
    return;
  }
  if (isiOS()) {
    installHelpText.textContent = translate('settings.installIos', 'iPhone/iPad: Im Safari-Teilen-Menue "Zum Home-Bildschirm" waehlen.');
    installAppButton.disabled = true;
    installAppButton.textContent = translate('settings.installSafari', 'Safari-Teilen-Menue nutzen');
    renderSettingsSummary();
    return;
  }
  installHelpText.textContent = translate('settings.installFallback', 'Wenn dein Browser die Installation anbietet, erscheint hier der Installationsbutton. Sonst Browser-Menue verwenden.');
  installAppButton.disabled = true;
  installAppButton.textContent = translate('settings.install', 'App installieren');
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
    showStatus(translate('settings.installComplete', 'WaschZeit wurde als App installiert.'));
  } else {
    showStatus(translate('settings.installCancelled', 'Installation wurde nicht abgeschlossen.'));
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

function renderPushStatusView() {
  const state = {
    checking: ['settings.pushChecking', 'Push-Status wird geprueft.'],
    unsupported: ['settings.pushUnsupported', 'Dieses Geraet unterstuetzt Web-Push leider nicht.'],
    unavailable: ['settings.pushServerUnavailable', 'Push ist auf dem Server noch nicht bereit.'],
    active: ['settings.pushActive', 'Push ist auf diesem Geraet aktiv.'],
    blocked: ['settings.pushBlocked', 'Push wurde im Browser blockiert. Bitte in den Website-Einstellungen erlauben.'],
    inactive: ['settings.pushInactive', 'Push ist bereit, aber auf diesem Geraet noch nicht aktiviert.']
  }[currentPushState];
  pushStatusText.textContent = currentPushState === 'error'
    ? localizedSystemText(currentPushError, translate('app.noConnection', 'Keine Verbindung zur App.'))
    : translate(state?.[0] || 'settings.pushChecking', state?.[1] || 'Push-Status wird geprueft.');
  enablePushButton.textContent = currentPushState === 'active'
    ? translate('settings.pushReconnect', 'Push erneut verbinden')
    : translate('settings.enablePush', 'Push aktivieren');
  renderSettingsSummary();
}

async function renderPushStatus() {
  if (!pushSupported()) {
    currentPushState = 'unsupported';
    currentPushError = '';
    enablePushButton.disabled = true;
    disablePushButton.hidden = true;
    renderPushStatusView();
    return;
  }
  try {
    await registerServiceWorker();
    const pushConfig = await api('/api/push/public-key');
    if (!pushConfig.configured) {
      currentPushState = 'unavailable';
      currentPushError = '';
      enablePushButton.disabled = true;
      disablePushButton.hidden = true;
      renderPushStatusView();
      return;
    }
    const subscription = await currentPushSubscription();
    const permission = Notification.permission;
    if (subscription && permission === 'granted') {
      currentPushState = 'active';
      currentPushError = '';
      enablePushButton.disabled = false;
      disablePushButton.hidden = false;
      renderPushStatusView();
      return;
    }
    if (permission === 'denied') {
      currentPushState = 'blocked';
      currentPushError = '';
      enablePushButton.disabled = true;
      disablePushButton.hidden = true;
      renderPushStatusView();
      return;
    }
    currentPushState = 'inactive';
    currentPushError = '';
    enablePushButton.disabled = false;
    disablePushButton.hidden = true;
  } catch (error) {
    currentPushState = 'error';
    currentPushError = error.message;
    enablePushButton.disabled = true;
    disablePushButton.hidden = true;
  }
  renderPushStatusView();
}

async function enablePushNotifications() {
  if (!pushSupported()) {
    showStatus(translate('settings.pushUnsupported', 'Dieses Geraet unterstuetzt Web-Push leider nicht.'), 'error');
    return;
  }
  enablePushButton.disabled = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showStatus(translate('settings.pushDenied', 'Push wurde nicht erlaubt. Du kannst es spaeter in den Browser-Einstellungen aktivieren.'), 'error');
      await renderPushStatus();
      return;
    }
    const registration = await registerServiceWorker();
    const pushConfig = await api('/api/push/public-key');
    if (!pushConfig.configured || !pushConfig.publicKey) {
      throw new Error(translate('settings.pushServerUnavailable', 'Push ist auf dem Server noch nicht bereit.'));
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
    showStatus(localizedSystemText(data.message, translate('settings.pushEnabled', 'Push-Hinweise sind aktiv.')));
    await renderPushStatus();
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
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
    showStatus(translate('settings.pushDisabled', 'Push-Hinweise wurden auf diesem Geraet deaktiviert.'));
    await renderPushStatus();
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  }
}

function renderHouseContext() {
  const roleLabel = currentRoleLabel();
  const isAdmin = !currentUser.canBook;
  userLine.textContent = roleLabel;
  const accountLabel = currentUser.displayName || currentUser.username;
  accountMenuName.textContent = accountLabel;
  accountMenuRole.textContent = roleLabel;
  accountPanelName.textContent = accountLabel;
  accountPanelMeta.textContent = `${roleLabel} - ${currentUser.houseName}${currentUser.apartmentLabel ? ` - ${currentUser.apartmentLabel}` : ''}`;
  settingsUsername.value = accountLabel;
  settingsApartmentLabel.value = currentUser.apartmentLabel || '';
  settingsApartmentLabelWrap.hidden = !currentUser.apartmentLabel;
  nameCorrectionPanel.hidden = !currentUser.canBook || !currentUser.apartmentLabel;
  devicePairingCard.hidden = !currentUser.canBook;
  settingsRole.value = roleLabel;
  settingsBookingMode.value = bookingMode;
  brandHouseName.textContent = currentUser.houseName;
  brandHouseName.title = translate('app.currentHouse', `Aktuelles Haus: ${currentUser.houseName}`, { house: currentUser.houseName });
  document.title = `WaschZeit | ${currentUser.houseName}`;
  introHouseName.textContent = translate('app.laundryRoomHouse', `Waschraum ${currentUser.houseName}`, { house: currentUser.houseName });
  adminTitle.textContent = `Verwaltung ${currentUser.houseName}`;
  bookingViewButton.textContent = isAdmin
    ? translate('app.calendar', 'Kalender')
    : translate('app.myPlan', 'Mein Waschplan');
  bookingPanelTitle.textContent = isAdmin
    ? translate('app.occupancyPlan', 'Belegungsplan')
    : translate('app.book', 'Buchen');
  bookingPanelIntro.textContent = isAdmin
    ? translate('app.bookingIntroAdmin', 'Belegungen und freie Kapazitaeten ansehen. Normale Waschzeiten buchen Bewohner selbst.')
    : translate('app.bookingIntroResident', 'Verschaffe dir zuerst einen Ueberblick. Danach stellst du dein Waschpaket Schritt fuer Schritt zusammen.');
  bookingSuggestion.hidden = isAdmin;
  bookingFlow.hidden = isAdmin;
  singleBookingDetails.hidden = isAdmin;

  houseSwitcher.hidden = !currentUser.isSuperadmin;
  if (currentUser.isSuperadmin) {
    houseSelect.innerHTML = availableHouses.map((house) => (
      `<option value="${house.id}">${escapeHtml(house.name)}</option>`
    )).join('');
    houseSelect.value = String(currentUser.activeHouseId);
  }
}

function currentRoleLabel() {
  const roles = [];
  if (currentUser.isResident) roles.push(translate('role.resident', 'Bewohner'));
  if (currentUser.isHouseAdmin) roles.push(translate('role.houseAdmin', 'Haus-Admin'));
  if (currentUser.isSuperadmin) roles.push(translate('role.superadmin', 'Superadmin'));
  return roles.join(' \u00b7 ') || (i18n?.language() === 'en' ? 'Personal access' : 'Persoenlicher Zugang');
}

async function refreshCurrentUser() {
  const data = await api('/api/me');
  currentUser = data.user;
  availableHouses = data.houses || [];
  if (i18n) await i18n.syncAccount(currentUser);
  renderHouseContext();
  configureIntroForCurrentUser();
}

async function resolveHouseScopedRequest(revision, request) {
  try {
    const data = await request;
    return revision === houseContextRevision ? data : staleHouseRequest;
  } catch (error) {
    if (revision !== houseContextRevision) return staleHouseRequest;
    throw error;
  }
}

function clearHouseScopedState() {
  resources = [];
  bookings = [];
  myBookingItems = [];
  releaseNoticeItems = [];
  calendarDays = [];
  calendarResourceCount = null;
  currentRecommendation = null;
  bookingFlowOptions = null;
  resetBookingFlowState(bookingDate.value);
  closeCalendarPreview();
  weekCalendar.innerHTML = '';
  calendarEmptyState.hidden = true;
  calendarRange.textContent = '';
  schedule.innerHTML = '';
  myBookings.innerHTML = '';
  bookingSuggestion.innerHTML = '';
  bookingSuggestion.hidden = true;
  bookingFlowContent.innerHTML = '';
  adminBox.hidden = true;
  renderMessageCenter();
}

async function switchHouse(houseId) {
  const revision = ++houseContextRevision;
  houseSelect.disabled = true;
  try {
    const data = await api('/api/me/active-house', {
      method: 'PUT',
      body: JSON.stringify({ houseId: Number(houseId) })
    });
    if (revision !== houseContextRevision) return;
    currentUser = data.user;
    renderHouseContext();
    clearHouseScopedState();
    const resourceData = await api('/api/resources');
    if (revision !== houseContextRevision) return;
    resources = resourceData.resources;
    calendarResourceCount = resources.length;
    await Promise.all([refreshAll(), loadAdmin()]);
    if (revision !== houseContextRevision) return;
    showStatus(data.message);
  } catch (error) {
    if (revision !== houseContextRevision) return;
    houseSelect.value = String(currentUser.activeHouseId);
    showStatus(error.message, 'error');
  } finally {
    if (revision === houseContextRevision) houseSelect.disabled = false;
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
  const revision = houseContextRevision;
  const data = await resolveHouseScopedRequest(
    revision,
    api(`/api/bookings?date=${encodeURIComponent(bookingDate.value)}`)
  );
  if (data === staleHouseRequest) return;
  bookings = data.bookings;
  renderSchedule();
}

async function loadMyBookings() {
  const revision = houseContextRevision;
  const data = await resolveHouseScopedRequest(revision, api('/api/my-bookings'));
  if (data === staleHouseRequest) return;
  myBookingItems = data.bookings;
  renderMyBookings(myBookingItems);
}

async function loadReleaseNotices() {
  const revision = houseContextRevision;
  const data = await resolveHouseScopedRequest(revision, api('/api/release-notices'));
  if (data === staleHouseRequest) return;
  releaseNoticeItems = data.notices || [];
  renderMessageCenter();
}

async function loadCalendar() {
  const revision = houseContextRevision;
  const days = calendarView === 'month' ? 42 : 7;
  const data = await resolveHouseScopedRequest(
    revision,
    api(`/api/calendar?from=${encodeURIComponent(calendarStartDate)}&days=${days}`)
  );
  if (data === staleHouseRequest) return;
  calendarResourceCount = Number(data.resourceCount || 0);
  calendarDays = data.days;
  renderCalendar();
}

async function loadRecommendation() {
  const revision = houseContextRevision;
  const data = await resolveHouseScopedRequest(revision, api('/api/recommendation'));
  if (data === staleHouseRequest) return;
  currentRecommendation = data.recommendation;
  renderRecommendation();
  if (calendarDays.length) renderCalendar();
}

const calendarResourceTypes = [
  { type: 'washer', labelKey: 'app.washers', label: 'Waschmaschinen', shortLabel: 'WM' },
  { type: 'drying_room', labelKey: 'app.dryingRooms', label: 'Trockenr\u00e4ume', shortLabel: 'TR' },
  { type: 'tumbler', labelKey: 'app.tumblers', label: 'Tumbler', shortLabel: 'TU' }
];

function calendarResourceTypeLabel(typeMeta) {
  return translate(typeMeta.labelKey, typeMeta.label);
}

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
  if (day.closed) return translate('app.restDay', 'Ruhetag');
  if (day.date < todayString() || availability.total === 0) return translate('app.unavailable', 'nicht verf\u00fcgbar');
  if (availability.free === 0) return translate('app.fullyBooked', 'vollst\u00e4ndig belegt');
  if (availability.free >= availability.total) return translate('app.freeLower', 'frei');
  return translate('app.freeCount', `${availability.free} von ${availability.total} frei`, {
    free: availability.free,
    total: availability.total
  });
}

function renderCalendarStatusRows(day) {
  return calendarResourceTypes.map((typeMeta) => {
    const { type, shortLabel } = typeMeta;
    const label = calendarResourceTypeLabel(typeMeta);
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
    free: translate('app.freeLower', 'frei'),
    booked: translate('app.occupied', 'belegt'),
    own: translate('app.ownBooking', 'deine Buchung'),
    reserve: translate('app.reservedFree', 'bleibt frei'),
    closed: translate('app.restDay', 'Ruhetag'),
    past: translate('app.past', 'vorbei')
  }[state] || state;
}

function calendarSlotTypeMarkup(day, slotDetail, typeMeta) {
  const detail = slotDetail.types[typeMeta.type];
  const canStartWasher = typeMeta.type === 'washer'
    && currentUser?.canBook
    && !day.closed
    && !slotDetail.past
    && day.ownByType.washer === 0;
  const resourcesMarkup = detail.resources.map((resource) => {
    const stateLabel = calendarResourceStateLabel(resource.state);
    if (canStartWasher && resource.state === 'free') {
      return `<button class="calendar-resource is-free" type="button" data-calendar-book-washer="${resource.resourceId}" data-calendar-date="${day.date}" data-calendar-slot="${slotDetail.slot}"><span>${escapeHtml(resource.resourceName)}</span><strong>${escapeHtml(translate('app.select', 'Ausw\u00e4hlen'))}</strong></button>`;
    }
    return `<span class="calendar-resource is-${resource.state}"><span>${escapeHtml(resource.resourceName)}</span><strong>${escapeHtml(stateLabel)}</strong></span>`;
  }).join('');
  const capacityText = typeMeta.type === 'tumbler'
    ? translate(
      detail.free === 1 ? 'app.moreBookingAvailable' : 'app.moreBookingsAvailable',
      `${detail.free} weitere Buchung${detail.free === 1 ? '' : 'en'} m\u00f6glich, einer bleibt frei`,
      { count: detail.free }
    )
    : translate('app.freeCount', `${detail.free} von ${detail.total} frei`, { free: detail.free, total: detail.total });
  return `
    <div class="calendar-slot-type">
      <div class="calendar-slot-type-head"><strong>${escapeHtml(calendarResourceTypeLabel(typeMeta))}</strong><span>${escapeHtml(capacityText)}</span></div>
      <div class="calendar-resource-list">${resourcesMarkup || `<span class="muted">${escapeHtml(translate('app.noEquipment', 'Keine Ger\u00e4te eingerichtet'))}</span>`}</div>
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
  const recommendedSlot = currentUser?.canBook && currentRecommendation?.date === day.date
    ? currentRecommendation.slot
    : '';
  const slotsMarkup = (day.slotDetails || []).map((slotDetail) => {
    const hasOwnBooking = calendarResourceTypes.some(({ type }) => (
      slotDetail.types[type]?.resources.some((resource) => resource.state === 'own')
    ));
    const slotNote = slotDetail.past
      ? `<span class="calendar-slot-note is-muted">${escapeHtml(translate('app.past', 'Vorbei'))}</span>`
      : recommendedSlot === slotDetail.slot
        ? `<span class="calendar-slot-note is-recommended">${escapeHtml(translate('app.recommended', 'Empfohlen'))}</span>`
        : hasOwnBooking
          ? `<span class="calendar-slot-note is-own">${escapeHtml(translate('app.ownBooking', 'Deine Buchung'))}</span>`
          : '';
    const ownAction = currentUser?.canBook && hasOwnBooking && !slotDetail.past
      ? `<button class="secondary calendar-open-package" type="button" data-calendar-open-package="${day.date}">${escapeHtml(translate('app.addToPackage', 'Waschpaket erg\u00e4nzen'))}</button>`
      : '';
    return `
      <section class="calendar-slot-detail${slotDetail.past ? ' is-past' : ''}">
        <div class="calendar-slot-detail-head"><h4>${escapeHtml(slotDetail.slot)}</h4>${slotNote}${ownAction}</div>
        <div class="calendar-slot-types">${calendarResourceTypes.map((meta) => calendarSlotTypeMarkup(day, slotDetail, meta)).join('')}</div>
      </section>
    `;
  }).join('');
  const openDayAction = currentUser?.canBook && !day.closed && day.date >= todayString()
    ? recommendedSlot
      ? `<button type="button" data-calendar-use-recommendation="${day.date}" data-calendar-slot="${recommendedSlot}">${escapeHtml(translate('app.bookRecommended', 'Empfohlenen Termin buchen'))}</button>`
      : `<button type="button" data-calendar-open-day="${day.date}">${escapeHtml(translate('app.chooseAndBookDay', 'Diesen Tag ausw\u00e4hlen und buchen'))}</button>`
    : '';
  calendarDayDetailsContent.innerHTML = day.closed
    ? `<p class="calendar-detail-empty">${escapeHtml(translate('app.sundayNoBookings', 'Sonntag ist Ruhetag. An diesem Tag sind keine Buchungen m\u00f6glich.'))}</p>`
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
  weekCalendar.hidden = false;
  calendarEmptyState.hidden = true;
  const monthView = calendarView === 'month';
  weekCalendar.classList.toggle('month-calendar', monthView);
  weekCalendar.setAttribute('aria-label', monthView
    ? translate('app.monthCalendar', 'Monatskalender')
    : translate('app.calendarWeek', 'Kalenderwoche'));
  monthWeekdays.hidden = !monthView;
  weekViewButton.classList.toggle('active', !monthView);
  weekViewButton.setAttribute('aria-pressed', String(!monthView));
  monthViewButton.classList.toggle('active', monthView);
  monthViewButton.setAttribute('aria-pressed', String(monthView));

  const previousLabel = monthView
    ? translate('app.previousMonth', 'Vorheriger Monat')
    : translate('app.previousWeek', 'Vorherige Woche');
  const nextLabel = monthView
    ? translate('app.nextMonth', 'Nächster Monat')
    : translate('app.nextWeek', 'Nächste Woche');
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
  if (calendarResourceCount === 0) {
    closeCalendarPreview();
    weekCalendar.hidden = true;
    monthWeekdays.hidden = true;
    calendarEmptyState.hidden = false;
    return;
  }
  const recommendationBadge = i18n?.language() === 'en'
    ? `<span>${escapeHtml(translate('app.recommended', 'Empfohlen'))}</span><b>${escapeHtml(translate('app.book', 'Buchen'))}</b>`
    : '<span>Empfohlen</span><b>Buchen</b>';

  for (const day of calendarDays) {
    const availability = availabilityForDay(day);
    const outsideMonth = monthView && day.date.slice(0, 7) !== calendarAnchorDate.slice(0, 7);
    const closed = Boolean(day.closed);
    const past = day.date < todayString();
    const recommended = currentUser?.canBook && currentRecommendation?.date === day.date;
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
      `${formatShortDate(day.date)}, ${closed
        ? translate('app.restDay', 'Ruhetag')
        : translate('app.freeWashTimes', `${availability.freeSlots} freie Waschzeiten`, { count: availability.freeSlots })}, ${calendarResourceTypes.map((typeMeta) => `${calendarResourceTypeLabel(typeMeta)}: ${calendarAvailabilityText(day, typeMeta.type)}`).join(', ')}${day.ownBookings ? `, ${translate('app.ownBookingsCount', `${day.ownBookings} eigene Buchungen`, { count: day.ownBookings })}` : ''}${recommended ? `, ${translate('app.recommendedTap', 'empfohlener Termin; antippen, um ihn direkt zu buchen')}` : ''}`
    );
    if (recommended) {
      button.title = translate('app.bookRecommendedDirectly', 'Empfohlenen Termin direkt buchen');
    }
    const availabilityLabel = closed
      ? translate('app.restDay', 'Ruhetag')
      : translate(
        availability.freeSlots === 1 ? 'app.washTimeAvailable' : 'app.washTimesAvailable',
        `${availability.freeSlots} ${availability.freeSlots === 1 ? 'Waschzeit' : 'Waschzeiten'} frei`,
        { count: availability.freeSlots }
      );
    const dateLabel = monthView
      ? new Intl.DateTimeFormat(activeLocale(), { day: 'numeric', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))
      : new Intl.DateTimeFormat(activeLocale(), { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`));
    button.innerHTML = `
      <span class="calendar-weekday">${new Intl.DateTimeFormat(activeLocale(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</span>
      <strong>${dateLabel}</strong>
      <span class="calendar-availability">${closed ? availabilityLabel : availability.totalSlots ? availabilityLabel : escapeHtml(translate('app.past', 'vorbei'))}</span>
      <span class="calendar-status-list">${renderCalendarStatusRows(day)}</span>
      ${recommended ? `<span class="calendar-recommended" aria-hidden="true">${recommendationBadge}</span>` : ''}
      ${day.ownBookings ? `<span class="calendar-own">${escapeHtml(translate('app.ownShort', `${day.ownBookings} eigene`, { count: day.ownBookings }))}</span>` : ''}
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
      if (!currentUser?.canBook) {
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
  const revision = houseContextRevision;
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
    const nextBookingFlowOptions = await resolveHouseScopedRequest(
      revision,
      api(`/api/booking-options?date=${encodeURIComponent(date)}${slotQuery}`)
    );
    if (nextBookingFlowOptions === staleHouseRequest) return;
    bookingFlowOptions = nextBookingFlowOptions;
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
    if (revision !== houseContextRevision) return;
    bookingFlowOptions = null;
    showStatus(error.message, 'error');
    showBookingFlowStatus(error.message, 'error');
  } finally {
    if (revision === houseContextRevision) {
      bookingFlowState.loading = false;
      renderBookingFlow();
    }
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
    back.textContent = translate('app.back', 'Zur\u00fcck');
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
      <span>${escapeHtml(translate('app.step', `Schritt ${bookingStep('time')}`, { number: bookingStep('time') }))}</span>
      <h4>${escapeHtml(translate('app.chooseTime', 'Zeitfenster w\u00e4hlen'))}</h4>
      <p>${escapeHtml(formatShortDate(bookingFlowState.date))}</p>
    </div>
  `;
  const existingWashers = bookingFlowOptions?.existingWashers || [];
  if (existingWashers.length) {
    const existing = document.createElement('div');
    existing.className = 'flow-existing-selection';
    existing.innerHTML = `
      <span>${escapeHtml(translate('app.existingTime', 'Bereits gebuchtes Zeitfenster'))}</span>
      <strong>${escapeHtml(existingWashers[0].slot)}</strong>
      <small>${existingWashers.map((washer) => escapeHtml(washer.resourceName)).join(', ')}</small>
    `;
    wrap.append(existing, renderFlowActions(null, 'drying', translate('app.addDrying', 'Trocknung erg\u00e4nzen')));
    return wrap;
  }

  const slotOptions = bookingFlowOptions?.slots || [];
  if (bookingFlowOptions?.closed) {
    const closed = document.createElement('p');
    closed.className = 'flow-empty';
    closed.textContent = translate('app.sundayChooseAnother', 'Sonntag ist Ruhetag. W\u00e4hle bitte einen anderen Tag.');
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
        ${recommended ? `<em>${escapeHtml(translate('app.recommended', 'Empfohlen'))}</em>` : ''}
      </span>
      <span class="flow-time-availability">
        <span>${escapeHtml(translate('app.washersCount', `${slotOption.washers.length} Waschmaschinen`, { count: slotOption.washers.length }))}</span>
        <span>${escapeHtml(translate('app.dryingRoomsCount', `${slotOption.dryingRoomCount || 0} Trockenr\u00e4ume`, { count: slotOption.dryingRoomCount || 0 }))}</span>
        <span>${escapeHtml(translate('app.tumblersToChoose', `${slotOption.tumblerCount || 0} Tumbler zur Auswahl`, { count: slotOption.tumblerCount || 0 }))}</span>
      </span>
      ${available ? `<span class="flow-time-action">${escapeHtml(translate('app.chooseTimeAction', 'Zeitfenster ausw\u00e4hlen'))}</span>` : `<span class="flow-time-unavailable">${escapeHtml(localizedSystemText(slotOption.washerError, translate('app.notBookable', 'Nicht mehr buchbar')))}</span>`}
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
      <span>${escapeHtml(translate('app.step', `Schritt ${bookingStep('washer')}`, { number: bookingStep('washer') }))}</span>
      <h4>${escapeHtml(translate('app.chooseWasher', 'Waschmaschine w\u00e4hlen'))}</h4>
      <p>${escapeHtml(formatShortDate(bookingFlowState.date))}${bookingMode === 'time' && bookingFlowState.slot ? ` - ${escapeHtml(bookingFlowState.slot)}` : ''}</p>
    </div>
  `;
  const existingWashers = bookingFlowOptions?.existingWashers || [];
  if (existingWashers.length) {
    const existing = document.createElement('div');
    existing.className = 'flow-existing-selection';
    existing.innerHTML = `
      <span>${escapeHtml(translate('app.alreadyBooked', 'Bereits gebucht'))}</span>
      <strong>${existingWashers.map((washer) => escapeHtml(washer.resourceName)).join(', ')}</strong>
      <small>${escapeHtml(existingWashers[0].slot)}</small>
    `;
    wrap.append(existing, renderFlowActions(null, 'drying', translate('app.addDrying', 'Trocknung erg\u00e4nzen')));
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
      ? translate('app.sundayChooseAnother', 'Sonntag ist Ruhetag. W\u00e4hle bitte einen anderen Tag.')
      : localizedSystemText(ruleMessage, translate('app.noWasherDay', 'An diesem Tag ist keine Waschmaschine mehr frei. W\u00e4hle einen anderen Tag im Kalender.'));
    wrap.append(empty);
    return wrap;
  }

  for (const slotOption of availableSlots) {
    const group = document.createElement('section');
    group.className = `flow-slot${currentRecommendation?.date === bookingFlowState.date && currentRecommendation?.slot === slotOption.slot ? ' is-recommended' : ''}`;
    const heading = document.createElement('div');
    heading.className = 'flow-slot-heading';
    heading.innerHTML = `<strong>${escapeHtml(slotOption.slot)}</strong>${group.classList.contains('is-recommended') ? `<span>${escapeHtml(translate('app.recommended', 'Empfohlen'))}</span>` : ''}`;
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
      choice.innerHTML = `<strong>${escapeHtml(washer.resourceName)}</strong><span>${selected ? escapeHtml(translate('app.selected', 'Ausgew\u00e4hlt')) : escapeHtml(translate('app.free', 'Frei'))}</span>`;
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
    selection.textContent = translate(
      'app.washerSelection',
      `${selectionCount} ${selectionCount === 1 ? 'Waschmaschine' : 'Waschmaschinen'} im Zeitfenster ${bookingFlowState.slot}`,
      {
        count: selectionCount,
        label: selectionCount === 1 ? typeLabel('washer') : translate('app.washers', 'Waschmaschinen'),
        slot: bookingFlowState.slot
      }
    );
    wrap.append(selection, renderFlowActions(bookingMode === 'time' ? 'time' : null, 'drying', translate('app.continueDryingRoom', 'Weiter zum Trockenraum')));
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
      <span>${escapeHtml(translate('app.step', `Schritt ${bookingStep('drying')}`, { number: bookingStep('drying') }))}</span>
      <h4>${escapeHtml(translate('app.addDryingRoom', 'Trockenraum erg\u00e4nzen'))}</h4>
      <p>${escapeHtml(translate('app.optionalForSlot', `Optional und passend zu ${bookingFlowState.slot}`, { slot: bookingFlowState.slot }))}</p>
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
    without.innerHTML = `<strong>${escapeHtml(translate('app.withoutDryingRoom', 'Ohne Trockenraum'))}</strong><span>${escapeHtml(translate('app.withoutDryingRoomHint', 'Du kannst direkt mit dem Tumbler fortfahren.'))}</span>`;
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
      ? `<span class="flow-option-kicker">${escapeHtml(translate('app.selected', 'Ausgew\u00e4hlt'))}</span><strong>${escapeHtml(room.resourceName)}</strong><span class="flow-option-time">${escapeHtml(currentDuration?.label || '')}</span>`
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
    durationTitle.textContent = translate('app.dryingRoomUse', 'Nutzungszeit des Trockenraums');
    const durationSelect = document.createElement('select');
    durationSelect.setAttribute('aria-label', translate('app.chooseDryingDuration', 'Trocknungsdauer w\u00e4hlen'));
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
    changeRoom.textContent = translate('app.changeDryingRoom', 'Anderen Trockenraum w\u00e4hlen oder entfernen');
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
    empty.textContent = translate('app.noDryingRoom', 'F\u00fcr diesen Waschslot ist kein durchg\u00e4ngig freier Trockenraum verf\u00fcgbar.');
    wrap.append(empty);
  }
  wrap.append(renderFlowActions('washer', 'tumbler', translate('app.continueTumbler', 'Weiter zum Tumbler')));
  return wrap;
}

function renderTumblerStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>${escapeHtml(translate('app.step', `Schritt ${bookingStep('tumbler')}`, { number: bookingStep('tumbler') }))}</span>
      <h4>${escapeHtml(translate('app.addTumbler', 'Tumbler erg\u00e4nzen'))}</h4>
      <p>${escapeHtml(translate('app.tumblerOptional', 'Optional. Einer bleibt f\u00fcr das Haus frei.'))}</p>
    </div>
  `;
  const choices = document.createElement('div');
  choices.className = 'flow-option-list';
  const without = document.createElement('button');
  without.type = 'button';
  without.className = `flow-option${bookingFlowState.tumblerResourceId === null ? ' is-selected' : ''}`;
  without.dataset.flowTumbler = 'none';
  without.setAttribute('aria-pressed', String(bookingFlowState.tumblerResourceId === null));
  without.innerHTML = `<strong>${escapeHtml(translate('app.withoutTumbler', 'Ohne Tumbler'))}</strong><span>${escapeHtml(translate('app.withoutTumblerHint', 'Nur Waschmaschine und gew\u00e4hlter Trockenraum.'))}</span>`;
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
    option.innerHTML = `<strong>${escapeHtml(tumbler.resourceName)}</strong><span>${escapeHtml(translate('app.freeInWashSlot', 'Frei im Waschslot'))}</span>`;
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
    empty.textContent = translate('app.noTumblerReserve', 'Aktuell kann kein Tumbler angeboten werden, weil mindestens einer frei bleiben muss.');
    wrap.append(empty);
  }
  wrap.append(renderFlowActions('drying', 'review', translate('app.reviewPackage', 'Paket pr\u00fcfen')));
  return wrap;
}

function renderReviewStep() {
  const wrap = document.createElement('div');
  wrap.className = 'flow-stage';
  wrap.innerHTML = `
    <div class="flow-stage-heading">
      <span>${escapeHtml(translate('app.step', `Schritt ${bookingStep('review')}`, { number: bookingStep('review') }))}</span>
      <h4>${escapeHtml(translate('app.reviewPackage', 'Waschpaket pr\u00fcfen'))}</h4>
      <p>${escapeHtml(translate('app.finalClickHint', 'Erst mit dem letzten Klick wird verbindlich gebucht.'))}</p>
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
    [translate('app.date', 'Termin'), `${formatShortDate(bookingFlowState.date)} - ${bookingFlowState.slot}`],
    [translate('app.washer', 'Waschmaschine'), `${washerNames.join(', ')}${existingWashers.length ? ` - ${translate('app.alreadyBooked', 'bereits gebucht').toLocaleLowerCase(activeLocale())}` : ''}`],
    [translate('app.dryingRoom', 'Trockenraum'), room && dryingOption ? `${room.resourceName} - ${dryingOption.label}` : translate('app.withoutDryingRoom', 'Ohne Trockenraum')],
    [translate('app.tumblers', 'Tumbler'), tumbler?.name || translate('app.withoutTumblerValue', 'Ohne Tumbler')]
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
  confirm.textContent = existingWashers.length
    ? translate('app.bookAdditions', 'Erg\u00e4nzungen buchen')
    : translate('app.bookPackage', 'Waschpaket buchen');
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
    note.textContent = translate('app.chooseAddition', 'W\u00e4hle mindestens eine Erg\u00e4nzung oder gehe zur\u00fcck zu deinen Buchungen.');
    wrap.append(note);
  }
  return wrap;
}

function renderBookingFlow() {
  bookingFlowContent.innerHTML = '';
  syncBookingModeUi();
  bookingFlowSteps.innerHTML = '';
  const labels = {
    time: translate('app.time', 'Zeit'),
    washer: translate('app.machine', 'Maschine'),
    drying: translate('app.dryingRoom', 'Trockenraum'),
    tumbler: translate('app.tumblers', 'Tumbler'),
    review: translate('app.review', 'Pr\u00fcfen')
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
    bookingFlowContent.innerHTML = `<p class="flow-loading">${escapeHtml(translate('app.checkingOptions', 'Freie Optionen werden gepr\u00fcft...'))}</p>`;
    return;
  }
  if (!bookingFlowOptions) {
    bookingFlowContent.innerHTML = `<p class="flow-empty">${escapeHtml(translate('app.optionsFailed', 'Die Buchungsoptionen konnten nicht geladen werden.'))}</p>`;
    return;
  }
  if (Number(bookingFlowOptions.resourceCount || 0) === 0) {
    bookingFlowSteps.innerHTML = '';
    bookingFlowContent.innerHTML = `<div class="flow-empty"><strong>${escapeHtml(translate('app.noResourcesTitle', 'In diesem Haus sind noch keine Ger\u00e4te eingerichtet.'))}</strong><p>${escapeHtml(translate('app.noResourcesHint', 'Sobald ein Haus-Admin Ressourcen anlegt, erscheint hier der Belegungsplan.'))}</p></div>`;
    return;
  }
  const stage = currentBookingStage();
  if (stage === 'time') bookingFlowContent.append(renderTimeStep());
  else if (stage === 'washer') bookingFlowContent.append(renderWasherStep());
  else if (stage === 'drying') bookingFlowContent.append(renderDryingStep());
  else if (stage === 'tumbler') bookingFlowContent.append(renderTumblerStep());
  else bookingFlowContent.append(renderReviewStep());
}

function localizedRecommendationReason(reason) {
  if (i18n?.language() !== 'en') return reason;
  const clauses = [
    ['app.recommendHabit', 'Dieser freie Termin entspricht deinem bisher h\u00e4ufigsten Waschrhythmus.'],
    ['app.recommendAlternative', 'Dein \u00fcblicher Termin ist belegt. Dies ist die n\u00e4chste passende freie Option.'],
    ['app.recommendFirst', 'Ein fr\u00fcher freier Termin f\u00fcr deinen ersten Waschrhythmus.'],
    ['app.recommendDryingAndTumbler', 'W\u00e4hle den Termin und stelle danach Waschmaschinen, Trockenraum und Tumbler Schritt f\u00fcr Schritt zusammen.'],
    ['app.recommendDrying', 'W\u00e4hle den Termin und erg\u00e4nze danach bei Bedarf einen Trockenraum.'],
    ['app.recommendTumbler', 'W\u00e4hle den Termin und entscheide danach, ob du einen Tumbler brauchst.'],
    ['app.recommendExistingDrying', 'Die Waschmaschine ist bereits gebucht. Im gef\u00fchrten Ablauf kannst du passende Trocknungsoptionen erg\u00e4nzen.'],
    ['app.recommendExistingOptions', 'Die Waschmaschine ist bereits gebucht. Der gef\u00fchrte Ablauf zeigt dir, welche Trocknungsoptionen noch verf\u00fcgbar sind.'],
    ['app.recommendWashPlanned', 'Waschmaschine und sinnvolle Erg\u00e4nzungen sind bereits geplant.']
  ];
  return clauses.reduce((text, [key, source]) => (
    text.replace(source, translate(key, source))
  ), String(reason || ''));
}

function renderRecommendation() {
  bookingSuggestion.innerHTML = '';
  const recommendation = currentRecommendation;
  const canUseRecommendation = currentUser?.canBook && Boolean(recommendation?.date);
  bookingSuggestion.hidden = !canUseRecommendation;
  if (!canUseRecommendation) return;
  const copy = document.createElement('div');
  copy.className = 'suggestion-copy';
  copy.innerHTML = `
    <span class="suggestion-label">${escapeHtml(translate('app.yourRecommendation', 'Deine Empfehlung'))}</span>
    <strong>${escapeHtml(formatShortDate(recommendation.date))} - ${escapeHtml(recommendation.slot)}</strong>
    <p>${escapeHtml(localizedRecommendationReason(recommendation.reason))}</p>
  `;
  const choose = document.createElement('button');
  choose.type = 'button';
  choose.className = 'secondary';
  choose.textContent = translate('app.bookRecommended', 'Empfohlenen Termin buchen');
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

      const owner = booking
        ? booking.username
        : slotIsPast
          ? translate('app.past', 'vorbei')
          : translate('app.freeLower', 'frei');
      const canDelete = booking && !booking.is_fixed && (currentUser.canManage || booking.user_id === currentUser.bookingUserId);
      card.innerHTML = `
        <div>
          <strong>${escapeHtml(resource.name)}</strong>
          <span>${escapeHtml(typeLabel(resource.type))}</span>
        </div>
        <p>${booking?.is_fixed ? escapeHtml(translate('app.fixedPrefix', `Fest: ${owner}`, { owner })) : escapeHtml(owner)}</p>
      `;

      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = booking?.is_fixed
        ? translate('app.protected', 'Gesch\u00fctzt')
        : booking
          ? translate('app.delete', 'L\u00f6schen')
          : translate('app.book', 'Buchen');
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
    myBookings.innerHTML = `<p class="muted">${escapeHtml(translate('app.noUpcomingBookings', 'Du hast aktuell keine kommenden Buchungen.'))}</p>`;
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
        <strong>${isPackage ? escapeHtml(translate('app.laundryPackage', 'Waschpaket')) : escapeHtml(primary.resource_name)}</strong>
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
        releaseButton.textContent = translate('app.releaseEarlyShort', 'Fr\u00fcher frei');
        releaseButton.addEventListener('click', () => releaseBooking(booking.id));
        lineActions.append(releaseButton);
      }
      if (booking.cancellationNoticeEligible && !isPackage) {
        const notifyButton = document.createElement('button');
        notifyButton.type = 'button';
        notifyButton.className = 'secondary';
        notifyButton.textContent = translate('app.cancelAndNotify', 'Absagen & informieren');
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
      notifyButton.textContent = translate('app.cancelPackageAndNotify', 'Paket absagen & informieren');
      notifyButton.addEventListener('click', () => cancelBookingGroupAndNotify(primary.group_id));
      actions.append(notifyButton);
    }
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary danger';
    deleteButton.textContent = isPackage
      ? translate('app.deleteWholePackage', 'Ganzes Paket l\u00f6schen')
      : translate('app.delete', 'L\u00f6schen');
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
    showStatus(localizedSystemText(data.message, translate('settings.notificationsSaved', 'Benachrichtigungen gespeichert.')));
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  }
}

async function resendEmailVerification() {
  try {
    const data = await api('/api/email-verification/resend', {
      method: 'POST',
      body: JSON.stringify({ emailKind: 'primary' })
    });
    showStatus(localizedSystemText(data.message));
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  }
}

async function resendSecondaryEmailVerification() {
  try {
    const data = await api('/api/email-verification/resend', {
      method: 'POST',
      body: JSON.stringify({ emailKind: 'secondary' })
    });
    showStatus(localizedSystemText(data.message));
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  }
}

async function createDevicePairingCode() {
  createDeviceCodeButton.disabled = true;
  if (devicePairingCountdownTimer) window.clearInterval(devicePairingCountdownTimer);
  try {
    const data = await api('/api/me/device-code', { method: 'POST' });
    devicePairingCode.textContent = data.code;
    devicePairingCode.dataset.expired = 'false';
    devicePairingQr.src = data.qrCodeDataUrl;
    devicePairingQr.hidden = false;
    devicePairingApartmentLabel = data.apartmentLabel || '';
    devicePairingPanel.hidden = false;
    renderDevicePairingLabels();
    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((Number(data.expiresAt) - Date.now()) / 1000));
      if (!remainingSeconds) {
        window.clearInterval(devicePairingCountdownTimer);
        devicePairingCountdownTimer = null;
        devicePairingCode.dataset.expired = 'true';
        devicePairingExpires.textContent = translate('settings.qrExpired', 'Dieser QR-Code ist abgelaufen.');
        devicePairingQr.hidden = true;
        devicePairingCode.textContent = translate('settings.expired', 'Abgelaufen');
        return;
      }
      const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
      const seconds = String(remainingSeconds % 60).padStart(2, '0');
      devicePairingExpires.textContent = translate(
        'settings.qrRemaining',
        'Noch {time} gueltig',
        { time: `${minutes}:${seconds}` }
      );
    };
    updateCountdown();
    devicePairingCountdownTimer = window.setInterval(updateCountdown, 1000);
    showStatus(localizedSystemText(data.message, translate('settings.qrCreated', 'Der QR-Code ist zehn Minuten gueltig und kann einmal verwendet werden.')));
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  } finally {
    createDeviceCodeButton.disabled = false;
  }
}

async function createApartment() {
  apartmentInvitationResult.hidden = true;
  try {
    const data = await api('/api/admin/apartments', {
      method: 'POST',
      body: JSON.stringify({
        label: apartmentLabelInput.value,
        displayName: apartmentDisplayNameInput.value,
        email: apartmentInviteEmailInput.value
      })
    });
    apartmentLabelInput.value = '';
    apartmentDisplayNameInput.value = '';
    apartmentInviteEmailInput.value = '';
    showApartmentInvitationResult(data, data.apartment);
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
    await loadAdmin();
  }
}

function showApartmentInvitationResult(data, apartment) {
  const invitation = data.invitation || {};
  apartmentInvitationResult.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = `${apartment.label} - ${apartment.display_name}`;
  const status = document.createElement('span');
  status.textContent = invitation.emailSent
    ? translate('admin.invitationSent', 'Persoenliche Einladung an {email} gesendet.', { email: invitation.email })
    : translate('admin.testInvitationCreated', 'Technische Testeinladung fuer {email} angelegt.', { email: invitation.email });
  apartmentInvitationResult.append(title, status);
  apartmentInvitationResult.hidden = false;
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
    showStatus(localizedSystemText(data.message, translate('settings.correctionSent', 'Dein Korrekturwunsch wurde an die Hausverwaltung weitergegeben.')));
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  } finally {
    sendDisplayNameRequestButton.disabled = false;
  }
}

function renderApartments(apartments) {
  apartmentList.innerHTML = '';
  if (!apartments.length) {
    apartmentList.innerHTML = `<p class="muted">${escapeHtml(translate('admin.noApartments', 'Noch keine Wohnungen angelegt.'))}</p>`;
    return;
  }
  for (const apartment of apartments) {
    const item = document.createElement('article');
    item.className = 'user-admin-item';
    item.dataset.adminSearch = [
      apartment.display_name,
      apartment.label,
      apartment.invitation_email,
      apartment.member_emails
    ].filter(Boolean).join(' ').toLocaleLowerCase('de-CH');
    const identity = document.createElement('div');
    identity.className = 'user-admin-identity';
    const invitationState = apartment.invitationStatus === 'pending'
        ? translate('admin.invitationOpen', 'Einladung offen fuer {email}', { email: apartment.invitation_email })
        : apartment.claimed
          ? translate(apartment.member_count === 1 ? 'admin.peopleConnectedOne' : 'admin.peopleConnectedMany', '{count} Personen verbunden', { count: apartment.member_count })
        : apartment.invitationStatus === 'expired'
          ? translate('admin.invitationExpired', 'Einladung abgelaufen')
          : apartment.invitationStatus === 'not_sent'
            ? translate('admin.invitationNotSent', 'Einladung nicht versendet')
            : translate('admin.notInvited', 'noch nicht eingeladen');
    identity.innerHTML = `<strong>${escapeHtml(apartment.display_name)}</strong><span>${escapeHtml(apartment.label)} &middot; ${escapeHtml(invitationState)}</span>${apartment.member_emails ? `<span>${escapeHtml(apartment.member_emails)}</span>` : ''}${apartment.name_request_id ? `<span class="apartment-name-request">${escapeHtml(translate('admin.correctionRequested', 'Korrektur gewuenscht: {name}', { name: apartment.requested_display_name }))}</span>` : ''}`;
    const actions = document.createElement('div');
    actions.className = 'user-admin-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary';
    editButton.textContent = apartment.name_request_id
      ? translate('admin.reviewSuggestion', 'Vorschlag pruefen')
      : translate('admin.edit', 'Bearbeiten');
    actions.append(editButton);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = apartment.invitationStatus === 'pending'
      ? translate('admin.renew', 'Einladung erneuern')
      : apartment.claimed
        ? translate('admin.additionalPerson', 'Weitere Person')
        : translate('admin.invitePerson', 'Einladen');
    button.addEventListener('click', () => {
      const inviteForm = item.querySelector('.apartment-invite-form');
      inviteForm.hidden = false;
      button.disabled = true;
      inviteForm.querySelector('input')?.focus();
    });
    actions.append(button);

    const inviteForm = document.createElement('form');
    inviteForm.className = 'apartment-invite-form compact-form';
    inviteForm.hidden = true;
    inviteForm.innerHTML = `
      <label>
        ${escapeHtml(translate('admin.personalInvitationEmail', 'Persoenliche E-Mail fuer die Einladung'))}
        <input name="email" type="email" value="" required>
      </label>
      <div class="inline-actions">
        <button type="submit">${escapeHtml(translate('admin.invite', 'Einladung senden'))}</button>
        <button class="secondary" type="button" data-cancel>${escapeHtml(translate('admin.cancel', 'Abbrechen'))}</button>
      </div>
    `;
    inviteForm.querySelector('[data-cancel]').addEventListener('click', () => {
      inviteForm.hidden = true;
      button.disabled = false;
    });
    inviteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = inviteForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      try {
        const data = await api(`/api/admin/apartments/${apartment.id}/invitation`, {
          method: 'POST',
          body: JSON.stringify({ email: new FormData(inviteForm).get('email') })
        });
        showApartmentInvitationResult(data, apartment);
        showStatus(data.message);
        await loadAdmin();
      } catch (error) {
        showStatus(error.message, 'error');
      } finally {
        submitButton.disabled = false;
      }
    });

    const editForm = document.createElement('form');
    editForm.className = 'apartment-edit-form compact-form';
    editForm.hidden = true;
    editForm.innerHTML = `
      <label>
        ${escapeHtml(translate('admin.doorbellName', 'Name am Klingelschild'))}
        <input name="displayName" maxlength="80" value="${escapeHtml(apartment.requested_display_name || apartment.display_name)}" required>
      </label>
      <p class="muted">${escapeHtml(translate('admin.apartmentEmailHint', 'Jede Person verwaltet ihre eigene E-Mail. Die Wohnung bleibt ueber den Klingelschildnamen gemeinsam erkennbar.'))}</p>
      <div class="inline-actions">
        <button type="submit">${escapeHtml(translate('admin.save', 'Speichern'))}</button>
        ${apartment.name_request_id ? `<button class="secondary danger" type="button" data-reject>${escapeHtml(translate('admin.reject', 'Ablehnen'))}</button>` : ''}
        <button class="secondary" type="button" data-cancel>${escapeHtml(translate('admin.cancel', 'Abbrechen'))}</button>
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
    item.append(identity, actions, inviteForm, editForm);
    apartmentList.append(item);
  }
  filterAdminPeople();
}

function filterAdminPeople() {
  const search = adminPeopleSearch.value.trim().toLocaleLowerCase('de-CH');
  for (const item of [...apartmentList.children, ...userList.children]) {
    if (!item.matches('[data-admin-search]')) continue;
    item.hidden = Boolean(search) && !item.dataset.adminSearch.includes(search);
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
    showStatus(translate('settings.passwordMismatch', 'Die beiden neuen Passwoerter stimmen nicht ueberein.'), 'error');
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
    showStatus(localizedSystemText(data.message, translate('settings.passwordChanged', 'Dein Passwort wurde geaendert.')));
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  }
}

async function deleteOwnAccount() {
  if (!window.confirm(translate('settings.deleteConfirm', 'Konto und alle eigenen Buchungen endgueltig loeschen?'))) return;
  try {
    const data = await api('/api/me', {
      method: 'DELETE',
      body: JSON.stringify({ password: deleteAccountPassword.value })
    });
    window.alert(localizedSystemText(data.message, translate('settings.accountDeleted', 'Dein persoenlicher Zugang wurde geloescht. Gemeinsame Wohnungsbuchungen bleiben fuer andere Mitglieder erhalten.')));
    window.location.href = '/login.html';
  } catch (error) {
    showStatus(localizedSystemText(error.message, translate('settings.actionFailed', 'Die Aktion konnte nicht abgeschlossen werden.')), 'error');
  }
}

async function loadAdmin() {
  const revision = houseContextRevision;
  const adminData = await resolveHouseScopedRequest(revision, Promise.all([
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
  ]));
  if (adminData === staleHouseRequest) return;
  const [usersData, overviewData, recoveryData, settingsData, fixedData, housesData, adminResources, auditData, pushDevicesData, analyticsData, apartmentsData, maintenanceData] = adminData;
  adminBox.hidden = false;
  adminTitle.textContent = `${translate('admin.management', 'Verwaltung')} ${settingsData.houseName}`;
  adminRoleLabel.textContent = currentUser.isSuperadmin
    ? translate('role.superadmin', 'Superadmin')
    : translate('role.houseAdmin', 'Haus-Admin');
  adminRoleSummary.textContent = currentUser.isSuperadmin
    ? translate('admin.roleSummarySuper', 'Du sicherst Rollen, Haeuser und den technischen Betrieb.')
    : translate('admin.roleSummaryHouse', 'Du organisierst Wohnungen, Geraete und Stoerungsfaelle.');
  adminScopeText.textContent = currentUser.isSuperadmin
    ? translate('admin.scopeSuper', 'Das Tagebuch gilt hausuebergreifend. Alle anderen Aktionen beziehen sich auf das oben ausgewaehlte Haus.')
    : translate('admin.scopeHouse', 'Dein Geltungsbereich ist dieses Haus. Normale Waschzeiten werden von Bewohnern selbst gebucht.');
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
    <div><strong>${overviewData.users}</strong><span>${escapeHtml(translate('admin.activeUsers', 'aktive Nutzer'))}</span></div>
    <div class="${overviewData.usersMissingEmail ? 'is-warning' : ''}"><strong>${overviewData.usersMissingEmail}</strong><span>${escapeHtml(translate('admin.unverifiedMail', 'ohne bestaetigte E-Mail'))}</span></div>
    <div><strong>${overviewData.todayBookings}</strong><span>${escapeHtml(translate('admin.bookingsToday', 'Buchungen heute'))}</span></div>
    <div><strong>${overviewData.activeResources}</strong><span>${escapeHtml(translate('admin.activeResources', 'aktive Ressourcen'))}</span></div>
    <div><strong>${overviewData.fixedBookings}</strong><span>${escapeHtml(translate('admin.recurringBookings', 'feste Buchungen'))}</span></div>
    <div><strong>${overviewData.recentReleases}</strong><span>${escapeHtml(translate('admin.releasesWeek', 'Freigaben 7 Tage'))}</span></div>
    <div class="${overviewData.openMaintenanceCases ? 'is-warning' : ''}"><strong>${overviewData.openMaintenanceCases}</strong><span>${escapeHtml(translate('admin.openLogCases', 'offene Tagebuchfaelle'))}</span></div>
    <div class="wide"><strong>E-Mail</strong><span>${escapeHtml(i18n?.translateVisibleText(overviewData.email.label) || overviewData.email.label)}</span></div>
    <div class="wide"><strong>Push</strong><span>${escapeHtml(i18n?.translateVisibleText(overviewData.push.label) || overviewData.push.label)} - ${overviewData.push.activeSubscriptions} ${escapeHtml(translate('admin.activeDevices', 'aktive Geraete'))}</span></div>
    <div class="wide ${overviewData.externalBackupConfigured ? '' : 'is-warning'}"><strong>Backup</strong><span>${overviewData.backup?.ok ? `${escapeHtml(translate('admin.backupChecked', 'geprueft am {date}', { date: new Date(overviewData.backup.createdAt).toLocaleString(activeLocale()) }))}${overviewData.backup.uploaded ? ` - ${escapeHtml(translate('admin.externalCopied', 'extern kopiert'))}` : ` - ${escapeHtml(translate('admin.externalCopyMissing', 'externe Kopie fehlt'))}`}` : escapeHtml(i18n?.translateVisibleText(overviewData.backup?.error) || overviewData.backup?.error || translate('admin.backupNone', 'noch nicht automatisch erstellt'))}${overviewData.externalBackupConfigured ? '' : ` \u00b7 ${escapeHtml(translate('admin.externalStorage', 'Externen Speicher in Render einrichten'))}`}</span></div>
  `;
  renderAdminWorkQueue({
    overview: overviewData,
    recovery: recoveryData,
    apartments: apartmentsData.apartments,
    resources: adminResources.resources,
    cases: maintenanceData.cases,
    fixedBookings: fixedData.fixedBookings,
    auditEntries: auditData.entries
  });
  renderAdminRecovery(recoveryData, usersData.users);
  adminEmailTestButton.disabled = !overviewData.email.configured;
  adminEmailTestButton.title = overviewData.email.configured
    ? translate('admin.emailTestReady', 'Testmail an die konfigurierte Testadresse senden')
    : translate('admin.emailTestUnavailable', 'Zuerst SMTP in Render konfigurieren');
  renderAdminPushTargets(pushDevicesData);
  adminPushTestButton.disabled = !overviewData.push.configured || !pushDevicesData.totalDevices;
  adminPushTestButton.title = overviewData.push.configured
    ? translate('admin.pushTestReady', 'Testpush an die ausgewaehlten aktiven Geraete senden')
    : translate('admin.pushTestUnavailable', 'Push ist auf dem Server noch nicht bereit');
  renderAdminUsers(usersData.users);
  setAdminSection(activeAdminSection);
}

function renderAdminAnalytics(data) {
  const totalBookings = data.totals.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const typeLabels = Object.fromEntries(data.totals.map((item) => [item.type, item.count]));
  const busiestSlot = [...data.bySlot].sort((left, right) => Number(right.count) - Number(left.count))[0];
  const blockedList = data.blockedResources.length
    ? data.blockedResources.map((resource) => (
      `<li><strong>${escapeHtml(resource.name)}</strong><span>${escapeHtml(resource.reason || translate('admin.statusBlocked', 'Gesperrt'))}</span></li>`
    )).join('')
    : `<li><span>${escapeHtml(translate('admin.noBlockedResources', 'Keine gesperrten Ressourcen.'))}</span></li>`;
  const resourceRows = data.byResource.slice(0, 8).map((resource) => (
    `<li><strong>${escapeHtml(resource.name)}</strong><span>${escapeHtml(translate(Number(resource.count) === 1 ? 'admin.bookingCountOne' : 'admin.bookingCountMany', '{count} Buchungen', { count: Number(resource.count) }))}</span></li>`
  )).join('');
  const userRows = data.byUser.slice(0, 8).map((user) => (
    `<li><strong>${escapeHtml(user.username)}</strong><span>${escapeHtml(translate(Number(user.count) === 1 ? 'admin.bookingCountOne' : 'admin.bookingCountMany', '{count} Buchungen', { count: Number(user.count) }))}</span></li>`
  )).join('');
  adminAnalytics.innerHTML = `
    <div class="admin-overview">
      <div><strong>${totalBookings}</strong><span>${escapeHtml(translate('admin.analyticsWindow', 'Buchungen im 60-Tage-Fenster'))}</span></div>
      <div><strong>${typeLabels.washer || 0}</strong><span>${escapeHtml(translate('admin.washers', 'Waschmaschinen'))}</span></div>
      <div><strong>${typeLabels.drying_room || 0}</strong><span>${escapeHtml(translate('admin.dryingRooms', 'Trockenraeume'))}</span></div>
      <div><strong>${typeLabels.tumbler || 0}</strong><span>${escapeHtml(translate('admin.dryers', 'Tumbler'))}</span></div>
      <div><strong>${busiestSlot?.slot || '-'}</strong><span>${escapeHtml(translate('admin.busiestSlot', 'staerkster Slot'))}</span></div>
      <div class="${data.blockedResources.length ? 'is-warning' : ''}"><strong>${data.blockedResources.length}</strong><span>${escapeHtml(translate('admin.blockedLower', 'gesperrt'))}</span></div>
    </div>
    <div class="analytics-grid">
      <section><h4>${escapeHtml(translate('admin.resources', 'Geraete'))}</h4><ul>${resourceRows || `<li><span>${escapeHtml(translate('admin.noBookings', 'Noch keine Buchungen.'))}</span></li>`}</ul></section>
      <section><h4>${escapeHtml(translate('admin.users', 'Nutzer'))}</h4><ul>${userRows || `<li><span>${escapeHtml(translate('admin.noBookings', 'Noch keine Buchungen.'))}</span></li>`}</ul></section>
      <section><h4>${escapeHtml(translate('admin.blocks', 'Sperren'))}</h4><ul>${blockedList}</ul></section>
    </div>
  `;
}

function renderAdminRecovery(data, users) {
  const warnings = data.warnings || [];
  const warningRows = warnings.length
    ? warnings.map((warning) => (
      `<li class="${warning.level === 'critical' ? 'is-critical' : 'is-warning'}">${escapeHtml(i18n?.translateVisibleText(warning.message) || warning.message)}</li>`
    )).join('')
    : `<li class="is-ok">${escapeHtml(translate('admin.emergencyPrepared', 'Notfallprozess ist sauber vorbereitet.'))}</li>`;
  const superadminNames = (data.superadmins || [])
    .map((user) => user.email ? `${user.username} (${user.email})` : user.username)
    .join(', ') || translate('admin.none', 'keiner');

  adminRecoveryPanel.innerHTML = `
    <section class="admin-recovery-card">
      <div>
        <strong>${escapeHtml(translate('admin.emergencyAccess', 'Notfallzugang'))}</strong>
        <span>${escapeHtml(translate('admin.emergencyAccessHint', 'Damit die Verwaltung weiterlaeuft, falls das aktuelle Hauptkonto ausfaellt.'))}</span>
      </div>
      <dl>
        <div><dt>${escapeHtml(translate('admin.houseAdmins', 'Hausadmins'))}</dt><dd>${Number(data.houseAdminCount || 0)}</dd></div>
        <div><dt>${escapeHtml(translate('role.superadmin', 'Superadmin'))}</dt><dd>${Number(data.superadminCount || 0)}</dd></div>
        <div><dt>Seed-Admin</dt><dd>${escapeHtml(data.seedAdminName || 'admin')}</dd></div>
        <div><dt>${escapeHtml(translate('admin.renderRecovery', 'Render-Recovery'))}</dt><dd>${escapeHtml(data.seedPasswordResetEnabled ? translate('admin.resetActive', 'Reset aktiv') : data.seedRecoveryConfigured ? translate('admin.prepared', 'vorbereitet') : translate('admin.missing', 'fehlt'))}</dd></div>
      </dl>
      <ul>${warningRows}</ul>
      <p class="muted">${escapeHtml(translate('admin.emergencyRule', 'Notfallregel: Render-Zugang nutzen, SEED_ADMIN_PASSWORD setzen und bei unbekanntem Passwort einmalig SEED_ADMIN_FORCE_PASSWORD_RESET=true aktivieren. Danach neu starten und den Reset-Schalter wieder entfernen.'))}</p>
      <p class="muted">${escapeHtml(translate('admin.activeSuperadmins', 'Aktive Superadmins: {names}', { names: superadminNames }))}</p>
    </section>
  `;

  superadminPermissionOperation.hidden = !currentUser.isSuperadmin;
  if (!currentUser.isSuperadmin) return;

  adminUserDirectory = users;
  renderSuperadminPermissionTargets();
}

function renderSuperadminPermissionTargets() {
  const grant = superadminPermissionAction.value === 'grant';
  const candidates = adminUserDirectory.filter((user) => (
    user.active
      && user.is_house_admin
      && Boolean(user.is_superadmin) !== grant
      && Number(user.id) !== Number(currentUser.id)
      && !user.merged_into_user_id
  ));
  superadminPermissionTarget.innerHTML = '';
  if (!candidates.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = grant
      ? translate('admin.noHouseAdminTarget', 'Kein weiterer Haus-Admin verfuegbar')
      : translate('admin.noSuperadminTarget', 'Kein anderer Superadmin in diesem Haus');
    superadminPermissionTarget.append(option);
  }
  for (const user of candidates) {
    const option = document.createElement('option');
    option.value = String(user.id);
    option.textContent = user.email ? `${user.username} (${user.email})` : user.username;
    superadminPermissionTarget.append(option);
  }
  const confirmation = grant ? 'SUPERADMINRECHT GEBEN' : 'SUPERADMINRECHT ENTZIEHEN';
  superadminPermissionConfirm.placeholder = confirmation;
  superadminPermissionConfirm.value = '';
  superadminPermissionButton.textContent = grant
    ? translate('admin.grantRight', 'Recht geben')
    : translate('admin.revokeRight', 'Recht entziehen');
  superadminPermissionButton.classList.toggle('danger', !grant);
  superadminPermissionTarget.disabled = !candidates.length;
  superadminPermissionConfirm.disabled = !candidates.length;
  superadminPermissionCurrentPassword.disabled = !candidates.length;
  if (!candidates.length) superadminPermissionCurrentPassword.value = '';
  superadminPermissionButton.disabled = !candidates.length;
}

async function updateSuperadminPermission() {
  if (!superadminPermissionCurrentPassword.value) {
    showStatus('Bitte dein aktuelles Passwort eingeben.', 'error');
    superadminPermissionCurrentPassword.focus();
    return;
  }
  const enabled = superadminPermissionAction.value === 'grant';
  const actionText = enabled ? 'Superadminrecht wirklich geben?' : 'Superadminrecht wirklich entziehen?';
  if (!window.confirm(actionText)) return;
  const currentPassword = superadminPermissionCurrentPassword.value;
  superadminPermissionCurrentPassword.value = '';
  superadminPermissionButton.disabled = true;
  try {
    const data = await api(`/api/admin/users/${Number(superadminPermissionTarget.value)}/superadmin`, {
      method: 'PUT',
      body: JSON.stringify({
        enabled,
        confirm: superadminPermissionConfirm.value.trim(),
        currentPassword
      })
    });
    superadminPermissionConfirm.value = '';
    showStatus(data.message);
    await loadAdmin();
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    superadminPermissionButton.disabled = !superadminPermissionTarget.value;
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
    ? translate('admin.allActiveDevices', 'Alle aktiven Geraete ({count})', { count: data.totalDevices })
    : translate('admin.noPushDevices', 'Keine aktiven Push-Geraete');
  adminPushTarget.append(allOption);
  for (const user of users) {
    const option = document.createElement('option');
    option.value = String(user.id);
    option.textContent = `${user.username} (${translate(Number(user.devices) === 1 ? 'admin.deviceOne' : 'admin.deviceMany', '{count} Geraete', { count: user.devices })})`;
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
    ? translate('admin.maintenanceSince', 'Aktiv seit {date}. Schreibende Aktionen sind gesperrt.', { date: new Date(maintenance.startedAt).toLocaleString(activeLocale()) })
    : maintenance.lastCheck?.ok
      ? translate('admin.maintenanceReadyChecked', 'Bereit. Letzte System- und Buchungspruefung: {date}.', { date: new Date(maintenance.lastCheck.checkedAt).toLocaleString(activeLocale()) })
      : translate('admin.maintenanceReady', 'Bereit. Vor dem Start wird automatisch ein geprueftes Backup erstellt.');
  toggleMaintenanceButton.dataset.active = String(active);
  toggleMaintenanceButton.textContent = active
    ? translate('admin.endMaintenance', 'Wartung beenden')
    : translate('admin.startMaintenance', 'Wartung starten');
  toggleMaintenanceButton.classList.toggle('danger', active);
  maintenancePasswordLabel.hidden = active;
  maintenanceCurrentPassword.disabled = active;
  if (active) maintenanceCurrentPassword.value = '';
}

async function toggleMaintenanceMode() {
  const active = toggleMaintenanceButton.dataset.active === 'true';
  if (!active && !maintenanceCurrentPassword.value) {
    showStatus('Bitte dein aktuelles Passwort eingeben.', 'error');
    maintenanceCurrentPassword.focus();
    return;
  }
  const confirmation = active
    ? 'Wartung jetzt beenden? Zuerst laufen Datenbank- und Buchungspruefung.'
    : 'Wartung jetzt starten? Zuerst wird automatisch ein geprueftes Backup erstellt.';
  if (!window.confirm(confirmation)) return;
  const currentPassword = active ? '' : maintenanceCurrentPassword.value;
  maintenanceCurrentPassword.value = '';
  toggleMaintenanceButton.disabled = true;
  try {
    const data = await api('/api/admin/maintenance', {
      method: 'PUT',
      body: JSON.stringify({ active: !active, currentPassword })
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
  if (!resetBookingsCurrentPassword.value) {
    showStatus('Bitte dein aktuelles Passwort eingeben.', 'error');
    resetBookingsCurrentPassword.focus();
    return;
  }
  if (!window.confirm('Alle normalen Buchungen dieses Hauses wirklich loeschen? Dauertermine bleiben erhalten.')) return;
  const currentPassword = resetBookingsCurrentPassword.value;
  resetBookingsCurrentPassword.value = '';
  resetBookingsButton.disabled = true;
  try {
    const data = await api('/api/admin/bookings', {
      method: 'DELETE',
      body: JSON.stringify({
        confirm: resetBookingsConfirm.value.trim(),
        currentPassword
      })
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
    item.dataset.adminSearch = [
      user.apartment_display_name,
      user.apartment_label,
      user.username,
      user.email,
      user.secondary_email
    ].filter(Boolean).join(' ').toLocaleLowerCase('de-CH');

    const identity = document.createElement('div');
    identity.className = 'user-admin-identity';
    const name = document.createElement('strong');
    const visibleName = user.apartment_display_name || user.apartment_label || user.username;
    name.textContent = visibleName;
    const meta = document.createElement('span');
    const roleNames = [
      ...(user.is_resident ? [translate('role.resident', 'Bewohner')] : []),
      ...(user.is_house_admin ? [translate('role.houseAdmin', 'Haus-Admin')] : []),
      ...(user.is_superadmin ? [translate('role.superadmin', 'Superadmin')] : [])
    ];
    const roleName = roleNames.join(' \u00b7 ') || translate('admin.roleUnassigned', 'Ohne Zuordnung');
    const accountState = user.merged_into_user_id
      ? translate('admin.accountMerged', 'zusammengefuehrt')
      : user.active
        ? translate('admin.activeLower', 'aktiv')
        : translate('admin.inactiveLower', 'inaktiv');
    const apartmentName = user.apartment_label ? ` \u00b7 ${user.apartment_label}` : '';
    const secondEmail = user.secondary_email ? ` \u00b7 ${user.secondary_email}` : '';
    meta.textContent = `${roleName} \u00b7 ${accountState}${apartmentName}${user.email ? ` \u00b7 ${user.email}` : ` \u00b7 ${translate('admin.emailMissing', 'E-Mail fehlt')}`}${secondEmail}`;
    identity.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'user-admin-actions';
    const isSelf = Number(user.id) === Number(currentUser.id);
    const canManageAccount = !isSelf
      && !Boolean(user.is_superadmin)
      && !Boolean(user.merged_into_user_id)
      && (currentUser.isSuperadmin || !user.is_house_admin);

    if (canManageAccount) {
      const statusButton = document.createElement('button');
      statusButton.type = 'button';
      statusButton.className = user.active ? 'secondary danger' : 'secondary';
      statusButton.textContent = user.active
        ? translate('admin.deactivate', 'Deaktivieren')
        : translate('admin.activate', 'Aktivieren');
      statusButton.title = `${visibleName} ${statusButton.textContent.toLowerCase()}`;
      statusButton.addEventListener('click', () => updateUserStatus(user.id, !Boolean(user.active)));
      actions.append(statusButton);
    }

    if (currentUser.isSuperadmin && !user.is_superadmin && !user.merged_into_user_id) {
      const roleButton = document.createElement('button');
      roleButton.type = 'button';
      roleButton.className = 'secondary';
      roleButton.textContent = user.is_house_admin
        ? translate('admin.revokeHouseAdmin', 'Adminrecht entziehen')
        : translate('admin.grantHouseAdmin', 'Haus-Adminrecht geben');
      roleButton.addEventListener('click', () => updateUserRole(
        user.id,
        user.is_house_admin ? 'user' : 'admin'
      ));
      actions.append(roleButton);

      const otherHouses = availableHouses.filter((house) => Number(house.id) !== Number(user.house_id));
      if (otherHouses.length) {
        const moveWrap = document.createElement('div');
        moveWrap.className = 'user-move-control';
        const moveSelect = document.createElement('select');
        moveSelect.setAttribute('aria-label', translate('admin.moveToBuilding', '{name} in anderes Haus verschieben', { name: visibleName }));
        moveSelect.innerHTML = otherHouses.map((house) => (
          `<option value="${house.id}">${escapeHtml(house.name)}</option>`
        )).join('');
        const moveButton = document.createElement('button');
        moveButton.type = 'button';
        moveButton.className = 'secondary';
        moveButton.textContent = translate('admin.move', 'Verschieben');
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
        resetButton.textContent = translate('admin.resetLink', 'Reset-Link senden');
        resetButton.title = translate('admin.resetFor', 'Passwort-Link an die bestaetigte Adresse von {name} senden', { name: visibleName });
        resetButton.addEventListener('click', () => requestUserPasswordReset(user.id, resetButton));
        actions.append(resetButton);
      } else if (user.active && user.is_resident && !user.is_house_admin) {
        const recoveryButton = document.createElement('button');
        recoveryButton.type = 'button';
        recoveryButton.className = 'secondary';
        recoveryButton.textContent = translate('admin.recoveryCode', 'Wiederherstellungscode');
        recoveryButton.title = translate('admin.recoveryFor', 'Einmalcode fuer {name} nach persoenlicher Identitaetspruefung erzeugen', { name: visibleName });
        recoveryButton.addEventListener('click', () => requestUserRecoveryCode(user, visibleName, recoveryButton));
        actions.append(recoveryButton);
      }
    }

    if (!actions.childElementCount) {
      const note = document.createElement('span');
      note.className = 'muted admin-account-note';
      note.textContent = isSelf
        ? translate('admin.manageOwnAccount', 'Eigenes Konto unter Buchen verwalten.')
        : translate('admin.managedBySuperadmin', 'Dieses Admin-Konto verwaltet der Superadmin.');
      actions.append(note);
    }
    item.append(identity, actions);
    userList.append(item);
  }
  filterAdminPeople();
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
    copy.className = 'admin-list-identity';
    const title = document.createElement('strong');
    title.textContent = house.name;
    const status = document.createElement('span');
    status.className = `admin-state-chip ${house.active ? 'is-active' : 'is-blocked'}`;
    status.textContent = house.active
      ? translate('admin.active', 'Aktiv')
      : translate('admin.inactive', 'Inaktiv');
    const nameForm = document.createElement('form');
    nameForm.className = 'house-name-form admin-row-edit-form';
    nameForm.hidden = true;
    const name = document.createElement('input');
    name.value = house.name;
    name.maxLength = 80;
    name.setAttribute('aria-label', translate('admin.nameOf', 'Name von {name}', { name: house.name }));
    const saveName = document.createElement('button');
    saveName.type = 'submit';
    saveName.className = 'secondary';
    saveName.textContent = translate('admin.save', 'Speichern');
    const cancelName = document.createElement('button');
    cancelName.type = 'button';
    cancelName.className = 'secondary';
    cancelName.textContent = translate('admin.cancel', 'Abbrechen');
    nameForm.append(name, saveName, cancelName);
    nameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      updateHouse(house.id, { name: name.value });
    });
    const meta = document.createElement('span');
    meta.textContent = translate('admin.peopleEquipment', '{people} Personen / {equipment} Geraete', {
      people: house.users,
      equipment: house.resources
    });
    copy.append(title, meta, status);
    const actions = document.createElement('div');
    actions.className = 'house-admin-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary';
    editButton.textContent = translate('admin.rename', 'Umbenennen');
    editButton.addEventListener('click', () => {
      nameForm.hidden = false;
      editButton.disabled = true;
      name.focus();
      name.select();
    });
    cancelName.addEventListener('click', () => {
      name.value = house.name;
      nameForm.hidden = true;
      editButton.disabled = false;
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = Number(house.id) === Number(currentUser.activeHouseId)
      ? translate('admin.active', 'Aktiv')
      : translate('admin.show', 'Anzeigen');
    button.disabled = !house.active || Number(house.id) === Number(currentUser.activeHouseId);
    button.addEventListener('click', () => switchHouse(house.id));
    const activeButton = document.createElement('button');
    activeButton.type = 'button';
    activeButton.className = house.active ? 'secondary danger' : 'secondary';
    activeButton.textContent = house.active
      ? translate('admin.deactivate', 'Deaktivieren')
      : translate('admin.activate', 'Aktivieren');
    activeButton.disabled = Number(house.id) === Number(currentUser.activeHouseId);
    activeButton.addEventListener('click', () => updateHouse(house.id, { active: !Boolean(house.active) }));
    actions.append(button, editButton, activeButton);
    item.append(copy, actions, nameForm);
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
  const options = [{ value: 'note', label: translate('admin.addNote', 'Notiz ergaenzen') }];
  if (status === 'reported') options.unshift({ value: 'block', label: translate('admin.blockResource', 'Ressource sperren') });
  if (status === 'blocked') options.unshift({ value: 'repair', label: translate('admin.documentRepair', 'Reparatur dokumentieren') });
  if (status === 'repairing') {
    options.unshift({ value: 'test', label: translate('admin.documentTest', 'Funktionspruefung dokumentieren') });
    options.unshift({ value: 'repair', label: translate('admin.documentMoreRepair', 'Weitere Reparatur dokumentieren') });
  }
  if (status === 'tested') options.unshift({ value: 'release', label: translate('admin.release', 'Freigeben und abschliessen') });
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
    maintenanceCaseList.innerHTML = `<div class="maintenance-empty"><strong>${escapeHtml(translate('admin.noLogCases', 'Keine passenden Tagebuchfaelle.'))}</strong><span>${escapeHtml(translate('admin.adjustLogFilter', 'Suche oder Statusfilter anpassen.'))}</span></div>`;
    return;
  }

  const statusPriority = { reported: 0, blocked: 1, repairing: 2, tested: 3, closed: 4 };
  const orderedCases = [...filtered].sort((left, right) => (
    (statusPriority[left.status] ?? 9) - (statusPriority[right.status] ?? 9)
    || new Date(right.created_at) - new Date(left.created_at)
  ));

  for (const maintenanceCase of orderedCases) {
    const article = document.createElement('article');
    article.className = `maintenance-case status-${maintenanceCase.status}`;
    const heading = document.createElement('header');
    heading.className = 'maintenance-case-head';
    heading.innerHTML = `
      <div>
        <span class="maintenance-resource">${escapeHtml(maintenanceCase.resource_name || translate('admin.resourceRemoved', 'Ressource entfernt'))}</span>
        <h4>${escapeHtml(maintenanceCase.title)}</h4>
        <p>${escapeHtml(maintenanceCase.description)}</p>
      </div>
      <span class="maintenance-status status-${escapeHtml(maintenanceCase.status)}">${escapeHtml(maintenanceStatusLabel(maintenanceCase.status))}</span>
    `;
    const meta = document.createElement('div');
    meta.className = 'maintenance-case-meta';
    meta.innerHTML = `
      <span>${escapeHtml(translate('admin.reportedBy', 'Gemeldet von {name}', { name: maintenanceCase.reported_by_name }))}</span>
      <span>${escapeHtml(new Date(maintenanceCase.created_at).toLocaleString(activeLocale()))}</span>
      ${currentUser.isSuperadmin ? `<span>${escapeHtml(maintenanceCase.house_name)}</span>` : ''}
    `;

    const history = document.createElement('details');
    history.className = 'maintenance-history';
    const summary = document.createElement('summary');
    summary.textContent = translate('admin.history', 'Chronik ({count})', { count: maintenanceCase.entries.length });
    const timeline = document.createElement('ol');
    timeline.className = 'maintenance-timeline';
    for (const entry of maintenanceCase.entries) {
      const row = document.createElement('li');
      row.className = `entry-${entry.entry_type}`;
      row.innerHTML = `
        <div><strong>${escapeHtml(maintenanceEntryLabel(entry.entry_type))}</strong><span>${escapeHtml(new Date(entry.created_at).toLocaleString(activeLocale()))}</span></div>
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
    actionLabel.textContent = translate('admin.nextStep', 'Naechster Schritt');
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
    testLabel.textContent = translate('admin.testResult', 'Pruefergebnis');
    const testResult = document.createElement('select');
    testResult.innerHTML = `<option value="true">${escapeHtml(translate('admin.successful', 'Erfolgreich'))}</option><option value="false">${escapeHtml(translate('admin.unsuccessful', 'Nicht erfolgreich'))}</option>`;
    testLabel.append(testResult);
    testLabel.hidden = actionSelect.value !== 'test';
    actionForm.classList.toggle('has-test-result', actionSelect.value === 'test');
    const noteLabel = document.createElement('label');
    noteLabel.className = 'maintenance-note-field';
    noteLabel.textContent = translate('admin.documentation', 'Dokumentation');
    const note = document.createElement('textarea');
    note.rows = 3;
    note.maxLength = 1000;
    note.required = true;
    note.placeholder = maintenanceCase.status === 'tested'
      ? translate('admin.releaseNotePlaceholder', 'Pflicht: ausgefuehrte Arbeit und erfolgreichen Probelauf festhalten.')
      : translate('admin.notePlaceholder', 'Sachlich festhalten, was gemacht oder festgestellt wurde.');
    noteLabel.append(note);
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = translate('admin.saveEntry', 'Eintrag speichern');
    actionSelect.addEventListener('change', () => {
      testLabel.hidden = actionSelect.value !== 'test';
      actionForm.classList.toggle('has-test-result', actionSelect.value === 'test');
      note.placeholder = actionSelect.value === 'release'
        ? translate('admin.releaseNotePlaceholder', 'Pflicht: ausgefuehrte Arbeit und erfolgreichen Probelauf festhalten.')
        : translate('admin.notePlaceholder', 'Sachlich festhalten, was gemacht oder festgestellt wurde.');
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
  const activeCount = items.filter((resource) => resource.active).length;
  const blockedCount = items.length - activeCount;
  resourceOverview.innerHTML = `
    <div><strong>${items.length}</strong><span>${escapeHtml(translate('admin.inventoryTotal', 'Geraete & Raeume'))}</span></div>
    <div><strong>${activeCount}</strong><span>${escapeHtml(translate('admin.readyLower', 'einsatzbereit'))}</span></div>
    <div class="${blockedCount ? 'is-warning' : ''}"><strong>${blockedCount}</strong><span>${escapeHtml(translate('admin.blockedLower', 'gesperrt'))}</span></div>
  `;

  const groups = [
    { type: 'washer', label: translate('admin.washers', 'Waschmaschinen') },
    { type: 'drying_room', label: translate('admin.dryingRooms', 'Trockenraeume') },
    { type: 'tumbler', label: translate('admin.dryers', 'Tumbler') }
  ];

  for (const groupData of groups) {
    const groupItems = items.filter((resource) => resource.type === groupData.type);
    const group = document.createElement('section');
    group.className = 'resource-admin-group';
    const heading = document.createElement('div');
    heading.className = 'admin-list-heading';
    const headingTitle = document.createElement('h4');
    headingTitle.textContent = groupData.label;
    const headingMeta = document.createElement('span');
    const readyCount = groupItems.filter((resource) => resource.active).length;
    headingMeta.textContent = translate('admin.readyCount', '{ready} von {total} einsatzbereit', {
      ready: readyCount,
      total: groupItems.length
    });
    heading.append(headingTitle, headingMeta);
    group.append(heading);

    if (!groupItems.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty-row';
      empty.textContent = translate('admin.noInventoryEntry', 'Noch kein Eintrag in diesem Bereich.');
      group.append(empty);
    }

    for (const resource of groupItems) {
      const item = document.createElement('article');
      item.className = 'resource-admin-item';
      const copy = document.createElement('div');
      copy.className = 'admin-list-identity';
      const title = document.createElement('strong');
      title.textContent = resource.name;
      const status = document.createElement('span');
      status.className = `admin-state-chip ${resource.active ? 'is-active' : 'is-blocked'}`;
      status.textContent = resource.active
        ? translate('admin.ready', 'Einsatzbereit')
        : translate('admin.statusBlocked', 'Gesperrt');
      copy.append(title, status);
      if (!resource.active) {
        const reason = document.createElement('span');
        reason.className = 'admin-block-reason';
        reason.textContent = resource.blocked_reason || translate('admin.noBlockReason', 'Kein Sperrgrund hinterlegt');
        copy.append(reason);
      }

      const actions = document.createElement('div');
      actions.className = 'resource-admin-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary';
      editButton.textContent = translate('admin.rename', 'Umbenennen');
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = resource.active ? 'secondary danger' : 'secondary';
      toggle.textContent = resource.active
        ? translate('admin.block', 'Sperren')
        : translate('admin.openLogbook', 'Tagebuch öffnen');
      toggle.addEventListener('click', () => {
        if (resource.active) {
          const reason = window.prompt(translate('admin.blockPrompt', 'Warum wird dieses Geraet gesperrt? Zum Beispiel: Defekt, Wartung, Reinigung.'));
          if (!reason) return;
          updateResource(resource.id, { active: false, blockReason: reason });
          return;
        }
        maintenanceSearch.value = resource.name;
        maintenanceStatusFilter.value = 'open';
        setAdminSection('logbook');
        renderMaintenanceCases();
      });
      actions.append(editButton, toggle);

      const form = document.createElement('form');
      form.className = 'resource-name-form admin-row-edit-form';
      form.hidden = true;
      const input = document.createElement('input');
      input.value = resource.name;
      input.maxLength = 80;
      input.setAttribute('aria-label', translate('admin.nameOf', 'Name von {name}', { name: resource.name }));
      const save = document.createElement('button');
      save.type = 'submit';
      save.className = 'secondary';
      save.textContent = translate('admin.save', 'Speichern');
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'secondary';
      cancel.textContent = translate('admin.cancel', 'Abbrechen');
      form.append(input, save, cancel);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        updateResource(resource.id, { name: input.value });
      });
      editButton.addEventListener('click', () => {
        form.hidden = false;
        editButton.disabled = true;
        input.focus();
        input.select();
      });
      cancel.addEventListener('click', () => {
        input.value = resource.name;
        form.hidden = true;
        editButton.disabled = false;
      });

      item.append(copy, actions, form);
      group.append(item);
    }
    resourceAdminList.append(group);
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
    'user.status': translate('audit.userStatus', 'Kontostatus geaendert'),
    'user.password_reset_requested': translate('audit.passwordReset', 'Passwort-Link gesendet'),
    'user.recovery_code_created': translate('audit.recoveryCreated', 'Wiederherstellungscode erstellt'),
    'user.recovery_completed': translate('audit.recoveryCompleted', 'Konto wiederhergestellt'),
    'user.role': translate('audit.userRole', 'Rolle geaendert'),
    'user.move': translate('audit.userMove', 'Konto verschoben'),
    'house.create': translate('audit.houseCreate', 'Haus angelegt'),
    'house.update': translate('audit.houseUpdate', 'Haus aktualisiert'),
    'house.code': translate('audit.houseCode', 'Hauscode geaendert'),
    'resource.create': translate('audit.resourceCreate', 'Geraet angelegt'),
    'resource.update': translate('audit.resourceUpdate', 'Geraet aktualisiert'),
    'resource.block': translate('audit.resourceBlock', 'Ressource gesperrt'),
    'resource.unblock': translate('audit.resourceUnblock', 'Ressource freigegeben'),
    'maintenance_case.report': translate('audit.issueReport', 'Stoerung gemeldet'),
    'maintenance_case.note': translate('audit.logNote', 'Tagebuchnotiz ergaenzt'),
    'maintenance_case.block': translate('audit.logBlock', 'Tagebuchsperre gesetzt'),
    'maintenance_case.repair': translate('audit.repair', 'Reparatur dokumentiert'),
    'maintenance_case.test': translate('audit.test', 'Funktionspruefung dokumentiert'),
    'maintenance_case.release': translate('audit.release', 'Ressource geprueft freigegeben'),
    'fixed_booking.create': translate('audit.fixedCreate', 'Feste Buchung angelegt'),
    'fixed_booking.delete': translate('audit.fixedDelete', 'Feste Buchung entfernt'),
    'bookings.reset': translate('audit.bookingsReset', 'Buchungen zurueckgesetzt'),
    'apartment.invitation_created': translate('audit.invitationCreate', 'Wohnungseinladung erstellt'),
    'apartment.invitation_renewed': translate('audit.invitationRenew', 'Wohnungseinladung erneuert'),
    'apartment.invitation_accepted': translate('audit.invitationAccept', 'Wohnungseinladung angenommen'),
    'push.test': translate('audit.pushTest', 'Push-Test gesendet'),
    'superadmin.grant': translate('audit.superGrant', 'Superadminrecht gegeben'),
    'superadmin.revoke': translate('audit.superRevoke', 'Superadminrecht entzogen'),
    'superadmin.transfer': translate('audit.superTransfer', 'Superadmin uebergeben'),
    'backup.download': translate('audit.backupDownload', 'Backup heruntergeladen'),
    'backup.create': translate('audit.backupCreate', 'Backup erstellt'),
    'maintenance.start': translate('audit.maintenanceStart', 'Wartungsmodus gestartet'),
    'maintenance.finish': translate('audit.maintenanceFinish', 'Wartungsmodus beendet'),
    'maintenance.check_failed': translate('audit.maintenanceFailed', 'Wartungspruefung fehlgeschlagen')
  };
  auditLog.innerHTML = entries.length ? '' : `<p class="muted">${escapeHtml(translate('admin.noAudit', 'Noch keine protokollierten Admin-Aktionen.'))}</p>`;
  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = 'audit-item';
    item.innerHTML = `<strong>${escapeHtml(actionLabels[entry.action] || entry.action)}</strong><span>${escapeHtml(entry.actor || translate('admin.systemActor', 'System'))} - ${escapeHtml(new Date(`${entry.created_at}Z`).toLocaleString(activeLocale()))}</span>`;
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
    fixedBookingList.innerHTML = `<p class="muted">${escapeHtml(translate('admin.noFixed', 'Noch keine festen Buchungen.'))}</p>`;
    return;
  }

  const sortedItems = [...items].sort((left, right) => (
    Number(left.weekday) - Number(right.weekday)
    || String(left.slot).localeCompare(String(right.slot), 'de-CH')
    || String(left.resource_name).localeCompare(String(right.resource_name), 'de-CH')
  ));

  for (const booking of sortedItems) {
    const item = document.createElement('article');
    item.className = 'fixed-booking-item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(booking.label)}</strong>
        <span>${escapeHtml(weekdayLabel(booking.weekday))} - ${escapeHtml(booking.slot)}</span>
        <span>${escapeHtml(booking.resource_name)}</span>
      </div>
    `;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary danger';
    deleteButton.textContent = translate('admin.remove', 'Entfernen');
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
let diaperGameRoundMs = 60000;
let diaperGamePenaltyMs = 4500;
let diaperGameMaxMistakes = 3;
const diaperSignalOptions = [
  { id: 'coral', label: 'Rot', symbol: '\u25b2' },
  { id: 'mint', label: 'Gr\u00fcn', symbol: '\u25cf' },
  { id: 'amber', label: 'Gelb', symbol: '\u25c6' },
  { id: 'blue', label: 'Blau', symbol: '\u25a0' }
];
let diaperGameTimer = null;
let diaperGamePressure = 0;
let diaperGameModuleIndex = 0;
let diaperGameModules = [];
let diaperGameStartedAt = 0;
let diaperGameDeadline = 0;
let diaperGameModuleStartedAt = 0;
let diaperValvePosition = 0;
let diaperGameRunning = false;
let diaperGameReturnFocus = null;
let diaperGameRoundToken = null;
let diaperLeaderboardState = { leaderboard: [], own: null };
let diaperGameStartRequest = 0;
let diaperGameTasks = [];
let diaperGameMode = 'ranked';
let diaperGameMistakes = 0;
let diaperGameSubmitting = false;
let diaperGameSoundEnabled = false;
let diaperGameAudioContext = null;
let diaperFinalHoldStartedAt = 0;
let diaperTemperatureValue = 0;
let diaperCodeEntry = '';
let diaperGameIncident = null;
let diaperGameIncidentPlayed = false;
let diaperCircuitPath = [];
let diaperLockPositions = [0, 0, 0];

function diaperGameBest() {
  return diaperLeaderboardState.own ? diaperLeaderboardState.own.timeMs / 1000 : null;
}

function playDiaperTone(frequency, duration = 90, type = 'sine') {
  if (!diaperGameSoundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  diaperGameAudioContext ||= new AudioContext();
  const oscillator = diaperGameAudioContext.createOscillator();
  const gain = diaperGameAudioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.045, diaperGameAudioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, diaperGameAudioContext.currentTime + duration / 1000);
  oscillator.connect(gain).connect(diaperGameAudioContext.destination);
  oscillator.start();
  oscillator.stop(diaperGameAudioContext.currentTime + duration / 1000);
}

function vibrateDiaperGame(pattern) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

function renderDiaperStrikes() {
  const lights = [...diaperStrikeLights.querySelectorAll('i')];
  lights.forEach((light, index) => light.classList.toggle('is-used', index < diaperGameMistakes));
  const remaining = Math.max(0, diaperGameMaxMistakes - diaperGameMistakes);
  diaperStrikeLights.setAttribute('aria-label', `Noch ${remaining} von ${diaperGameMaxMistakes} Fehlern erlaubt`);
}

function setDiaperGameMode(mode) {
  if (diaperGameRunning || diaperGameSubmitting) return;
  diaperGameMode = mode === 'practice' ? 'practice' : 'ranked';
  const ranked = diaperGameMode === 'ranked';
  rankedDiaperModeButton.classList.toggle('active', ranked);
  rankedDiaperModeButton.setAttribute('aria-pressed', String(ranked));
  practiceDiaperModeButton.classList.toggle('active', !ranked);
  practiceDiaperModeButton.setAttribute('aria-pressed', String(!ranked));
  diaperMissionLabel.textContent = ranked ? 'Tagesmission' : '\u00dcbungsmodus';
  diaperMissionBrief.textContent = ranked
    ? 'Heute l\u00f6sen alle H\u00e4user dieselbe Mission samt Zwischenfall. Fehler werden auf die Ranglistenzeit gerechnet.'
    : 'Ungewerteter Einsatz mit neu gemischten Systemvarianten und einem zuf\u00e4lligen Zwischenfall.';
}

function renderDiaperGameProgress() {
  const best = diaperGameBest();
  const moduleCount = diaperGameModules.length || 4;
  const progress = Math.min(diaperGameModuleIndex, moduleCount);
  const phase = diaperGameModuleIndex === moduleCount ? ' \u00b7 Finale' : diaperGameModuleIndex > moduleCount ? ' \u00b7 Entsch\u00e4rft' : '';
  diaperGameProgress.textContent = `${progress} von ${moduleCount} Modulen${phase} \u00b7 Tagesbestwert: ${best ? `${best.toFixed(1)} s` : '\u2013'}`;
  diaperStepRailSegments.forEach((segment, index) => {
    segment.classList.toggle('is-complete', index < diaperGameModuleIndex);
    segment.classList.toggle('is-current', diaperGameRunning && index === diaperGameModuleIndex);
  });
}

function renderDiaperLeaderboard(data) {
  diaperLeaderboardState = data || { leaderboard: [], own: null };
  const entries = diaperLeaderboardState.leaderboard || [];
  diaperLeaderboardList.innerHTML = entries.length ? entries.map((entry) => `
    <li class="${entry.isOwn ? 'is-own' : ''}">
      <strong>${entry.position}.</strong>
      <span>${escapeHtml(entry.isOwn ? 'Du' : entry.player)}</span>
      <b>${(entry.timeMs / 1000).toFixed(1)} s</b>
    </li>
  `).join('') : '<li class="muted">Noch keine gewertete Runde. Hol dir Platz 1!</li>';
  diaperOwnRank.textContent = diaperLeaderboardState.own
    ? `Heute Platz ${diaperLeaderboardState.own.position} \u00b7 ${(diaperLeaderboardState.own.timeMs / 1000).toFixed(1)} s \u00b7 ${diaperLeaderboardState.own.mistakes} Fehler`
    : 'Heute noch keine eigene Zeit';
  renderDiaperGameProgress();
}

async function loadDiaperLeaderboard() {
  try {
    renderDiaperLeaderboard(await api('/api/diaper-game/leaderboard'));
  } catch (error) {
    diaperLeaderboardList.innerHTML = `<li class="muted">${escapeHtml(error.message)}</li>`;
  }
}

function setDiaperPressure(value) {
  diaperGamePressure = Math.max(0, Math.min(100, value));
  diaperGameStage.style.setProperty('--pressure', String(diaperGamePressure));
  diaperPressureBar.style.width = `${diaperGamePressure}%`;
  diaperPressureBar.parentElement.setAttribute('aria-valuenow', String(Math.round(diaperGamePressure)));
  diaperPressureText.textContent = diaperGamePressure >= 82 ? 'Kritisch!' : diaperGamePressure >= 52 ? 'Instabil' : diaperGameRunning ? 'Scharf' : 'Bereit';
  diaperGameStage.dataset.mood = diaperGamePressure >= 75 ? 'danger' : diaperGamePressure >= 45 ? 'nervous' : 'calm';
}

function clearDiaperGameTasks() {
  diaperGameTasks.forEach((task) => window.clearTimeout(task));
  diaperGameTasks = [];
}

function scheduleDiaperGameTask(callback, delay) {
  const task = window.setTimeout(() => {
    diaperGameTasks = diaperGameTasks.filter((entry) => entry !== task);
    callback();
  }, delay);
  diaperGameTasks.push(task);
  return task;
}

function shuffleDiaperGameItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function formatDiaperCountdown(remainingMs) {
  const safeRemaining = Math.max(0, remainingMs);
  const seconds = Math.floor(safeRemaining / 1000);
  const tenths = Math.floor((safeRemaining % 1000) / 100);
  return `00:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function stopDiaperGame() {
  window.clearInterval(diaperGameTimer);
  diaperGameTimer = null;
  clearDiaperGameTasks();
  diaperGameRunning = false;
  diaperGameSubmitting = false;
  diaperFinalHoldStartedAt = 0;
  diaperIncident.hidden = true;
  const gameModal = diaperGameOverlay.querySelector('.diaper-game-modal');
  if (gameModal) gameModal.dataset.gameRunning = 'false';
  rankedDiaperModeButton.disabled = false;
  practiceDiaperModeButton.disabled = false;
  for (const button of diaperGameActions.querySelectorAll('button')) button.disabled = true;
}

function setDiaperStartButton(label, icon = '\u21bb') {
  startDiaperGameButton.innerHTML = `<span aria-hidden="true">${icon}</span> ${label}`;
}

function loseDiaperGame() {
  stopDiaperGame();
  diaperCountdown.textContent = '00:00.0';
  setDiaperPressure(100);
  diaperGameStage.dataset.mood = 'burst';
  diaperMissionLabel.textContent = 'Einsatz gescheitert';
  diaperToolTitle.textContent = 'Die Windel ist geploppt';
  diaperModuleCounter.textContent = diaperGameMistakes >= diaperGameMaxMistakes ? 'Drei Fehler' : 'Zeit abgelaufen';
  diaperMissionBrief.textContent = 'Die Sicherungskette hat ausgel\u00f6st. Das Baby ist sicher, aber zwei Bodys und ein Handtuch gehen in die virtuelle W\u00e4sche.';
  diaperGameStatus.textContent = 'PLOPP! Die Windel war schneller. Das Baby ist sicher, die Windel nicht.';
  playDiaperTone(110, 420, 'sawtooth');
  vibrateDiaperGame([100, 60, 180]);
  setDiaperStartButton('Neuer Einsatz');
}

async function winDiaperGame(holdMs) {
  if (!diaperGameRunning || diaperGameSubmitting) return;
  diaperGameSubmitting = true;
  const finalButton = diaperGameActions.querySelector('.diaper-final-cut');
  if (finalButton) finalButton.disabled = true;
  diaperGameStatus.textContent = 'Z\u00fcndkreis wird serverseitig gepr\u00fcft.';
  try {
    const leaderboard = await api('/api/diaper-game/complete', {
      method: 'POST',
      body: JSON.stringify({ token: diaperGameRoundToken, holdMs })
    });
    diaperGameModuleIndex = diaperGameModules.length + 1;
    stopDiaperGame();
    diaperGameStage.dataset.mood = 'happy';
    diaperGameStage.classList.add('is-defused');
    diaperMissionLabel.textContent = leaderboard.result.practice ? '\u00dcbung geschafft' : 'Tagesmission geschafft';
    diaperToolTitle.textContent = 'Z\u00fcndkreis getrennt';
    diaperModuleCounter.textContent = 'Windel sicher';
    diaperMissionBrief.textContent = leaderboard.result.practice
      ? 'Trainingsrunde abgeschlossen. Der Lauf wurde nicht in die Tageswertung eingetragen.'
      : 'Alle Sicherungen sind gr\u00fcn. Deine gewertete Zeit enth\u00e4lt jede Fehlerstrafe.';
    diaperGameActions.innerHTML = '<div class="diaper-defused-seal" aria-hidden="true"><span>ENTSCH\u00c4RFT</span><i></i></div>';
    renderDiaperLeaderboard(leaderboard);
    diaperGameStatus.textContent = leaderboard.result.practice
      ? `Training geschafft in ${(leaderboard.result.elapsedTimeMs / 1000).toFixed(1)} Sekunden.`
      : `Tagesmission: ${(leaderboard.result.scoreTimeMs / 1000).toFixed(1)} Sekunden inklusive ${leaderboard.result.mistakes} Fehler.`;
    playDiaperTone(660, 120);
    scheduleDiaperGameTask(() => playDiaperTone(880, 220), 100);
    vibrateDiaperGame([40, 40, 80]);
    setDiaperStartButton('Neuer Einsatz');
  } catch (error) {
    diaperGameSubmitting = false;
    diaperGameMistakes += 1;
    diaperGameDeadline -= diaperGamePenaltyMs;
    renderDiaperStrikes();
    diaperGameStage.classList.remove('is-shaking');
    window.requestAnimationFrame(() => diaperGameStage.classList.add('is-shaking'));
    if (diaperGameMistakes >= diaperGameMaxMistakes || diaperGameDeadline <= performance.now()) {
      loseDiaperGame();
      return;
    }
    diaperGameStatus.textContent = `${error.message} Fehler ${diaperGameMistakes} von ${diaperGameMaxMistakes}.`;
    if (finalButton) finalButton.disabled = false;
    playDiaperTone(150, 180, 'square');
  }
}

function diaperGameMistake(result, message) {
  if (!diaperGameRunning) return;
  diaperGameMistakes = Number(result.mistakes ?? diaperGameMistakes + 1);
  diaperGameDeadline -= Number(result.penaltyMs || diaperGamePenaltyMs);
  renderDiaperStrikes();
  diaperGameStatus.textContent = `${message} Fehler ${diaperGameMistakes} von ${diaperGameMaxMistakes}.`;
  diaperGameStage.classList.remove('is-shaking');
  window.requestAnimationFrame(() => diaperGameStage.classList.add('is-shaking'));
  diaperGameActions.classList.remove('is-error');
  window.requestAnimationFrame(() => diaperGameActions.classList.add('is-error'));
  playDiaperTone(145, 180, 'square');
  vibrateDiaperGame([70, 35, 70]);
  if (result.failed || diaperGameMistakes >= diaperGameMaxMistakes || diaperGameDeadline <= performance.now()) loseDiaperGame();
}

async function submitDiaperGameModule(answer) {
  if (!diaperGameRunning || diaperGameSubmitting) return null;
  diaperGameSubmitting = true;
  diaperGameActions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  try {
    return await api('/api/diaper-game/action', {
      method: 'POST',
      body: JSON.stringify({
        token: diaperGameRoundToken,
        moduleIndex: diaperGameModuleIndex,
        answer
      })
    });
  } finally {
    diaperGameSubmitting = false;
  }
}

const diaperIncidentCopy = {
  'baby-kick': {
    icon: '\u2736',
    title: 'Baby strampelt!',
    text: 'Die Windel verrutscht. Bauteile werden neu ausgerichtet.',
    className: 'incident-kick'
  },
  blackout: {
    icon: '\u25d0',
    title: 'Kurzschluss!',
    text: 'Das Licht f\u00e4llt aus. Die Notbeleuchtung springt an.',
    className: 'incident-blackout'
  },
  'pressure-surge': {
    icon: '\u21c8',
    title: 'Druckspitze!',
    text: 'Der Z\u00fcndruck steigt sprunghaft. Ruhig weiterarbeiten.',
    className: 'incident-surge'
  },
  'scanner-fog': {
    icon: '\u25cc',
    title: 'Scanner beschlagen!',
    text: 'Die Sicht kehrt gleich zur\u00fcck. Merke dir die Positionen.',
    className: 'incident-fog'
  }
};

function playDiaperIncident() {
  if (!diaperGameRunning || !diaperGameIncident || diaperGameIncidentPlayed) return false;
  diaperGameIncidentPlayed = true;
  const copy = diaperIncidentCopy[diaperGameIncident.type] || diaperIncidentCopy['baby-kick'];
  diaperIncidentIcon.textContent = copy.icon;
  diaperIncidentTitle.textContent = copy.title;
  diaperIncidentText.textContent = copy.text;
  diaperIncident.className = `diaper-incident ${copy.className}`;
  diaperIncident.hidden = false;
  diaperGameStage.classList.add(copy.className, 'has-incident');
  diaperGameStatus.textContent = `${copy.title} ${copy.text}`;
  playDiaperTone(copy.className === 'incident-blackout' ? 90 : 180, 260, 'sawtooth');
  vibrateDiaperGame([45, 35, 90]);
  scheduleDiaperGameTask(() => {
    diaperIncident.hidden = true;
    diaperGameStage.classList.remove(copy.className, 'has-incident');
    renderCurrentDiaperGameModule();
  }, 1450);
  return true;
}

function completeDiaperGameModule(message) {
  if (!diaperGameRunning) return;
  diaperGameModuleIndex += 1;
  diaperGameStatus.textContent = message;
  diaperGameStage.classList.remove('module-cleared');
  window.requestAnimationFrame(() => diaperGameStage.classList.add('module-cleared'));
  renderDiaperGameProgress();
  for (const button of diaperGameActions.querySelectorAll('button')) button.disabled = true;
  scheduleDiaperGameTask(() => {
    if (diaperGameIncident?.afterModule === diaperGameModuleIndex && playDiaperIncident()) return;
    renderCurrentDiaperGameModule();
  }, 520);
}

async function chooseDiaperWire(wireId) {
  if (!diaperGameRunning) return;
  const module = diaperGameModules[diaperGameModuleIndex];
  if (!module || module.type !== 'wire') return;
  const result = await submitDiaperGameModule({ choice: wireId });
  if (!result) return;
  if (!result.correct) {
    diaperGameMistake(result, 'Falsches Kabel! Der Z\u00fcndkreis springt auf Rot.');
    if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 450);
    return;
  }
  const button = diaperGameActions.querySelector(`[data-wire-id="${wireId}"]`);
  button?.classList.add('is-cut');
  playDiaperTone(520, 100);
  completeDiaperGameModule('Kabel getrennt. Sicherung 1 ist gr\u00fcn.');
}

function playDiaperSignalSequence() {
  const moduleNumber = diaperGameModuleIndex;
  const module = diaperGameModules[moduleNumber];
  if (!diaperGameRunning || !module || module.type !== 'signal') return;
  module.inputIndex = 0;
  module.entered = [];
  module.accepting = false;
  diaperGameStatus.textContent = `Beobachte ${module.sequence.length} Impulse. Noch nichts dr\u00fccken.`;
  diaperGameActions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  module.sequence.forEach((signalId, index) => {
    scheduleDiaperGameTask(() => {
      if (!diaperGameRunning || diaperGameModuleIndex !== moduleNumber) return;
      const lamp = diaperGameActions.querySelector(`[data-signal-lamp="${signalId}"]`);
      lamp?.classList.add('is-active');
      scheduleDiaperGameTask(() => lamp?.classList.remove('is-active'), 260);
    }, 360 + index * module.playbackMs);
  });
  scheduleDiaperGameTask(() => {
    if (!diaperGameRunning || diaperGameModuleIndex !== moduleNumber) return;
    module.accepting = true;
    diaperGameActions.querySelectorAll('button').forEach((button) => { button.disabled = false; });
    diaperGameStatus.textContent = 'Jetzt: Wiederhole die Impulsfolge.';
    diaperGameActions.querySelector('button')?.focus({ preventScroll: true });
  }, 360 + module.sequence.length * module.playbackMs);
}

async function chooseDiaperSignal(signalId) {
  if (!diaperGameRunning) return;
  const module = diaperGameModules[diaperGameModuleIndex];
  if (!module || module.type !== 'signal' || !module.accepting) return;
  const button = diaperGameActions.querySelector(`[data-signal-id="${signalId}"]`);
  button?.classList.add('is-pressed');
  scheduleDiaperGameTask(() => button?.classList.remove('is-pressed'), 150);
  module.entered ||= [];
  module.entered.push(signalId);
  playDiaperTone(280 + diaperSignalOptions.findIndex((signal) => signal.id === signalId) * 90, 70);
  if (signalId !== module.sequence[module.inputIndex]) {
    module.accepting = false;
    diaperGameActions.querySelectorAll('[data-signal-id]').forEach((signalButton) => { signalButton.disabled = true; });
    const result = await submitDiaperGameModule({ sequence: module.entered });
    if (!result) return;
    diaperGameMistake(result, 'Impulsfolge falsch! Das Muster wird neu gesendet.');
    if (diaperGameRunning) scheduleDiaperGameTask(playDiaperSignalSequence, 650);
    return;
  }
  module.inputIndex += 1;
  if (module.inputIndex === module.sequence.length) {
    module.accepting = false;
    const result = await submitDiaperGameModule({ sequence: module.entered });
    if (!result) return;
    if (result.correct) completeDiaperGameModule('Impulsfolge best\u00e4tigt. Speicher verriegelt.');
    else {
      diaperGameMistake(result, 'Impulsfolge vom Server abgewiesen.');
      if (diaperGameRunning) scheduleDiaperGameTask(playDiaperSignalSequence, 650);
    }
  } else {
    diaperGameStatus.textContent = `${module.inputIndex} von ${module.sequence.length} Impulsen korrekt.`;
  }
}

async function lockDiaperPressureValve() {
  if (!diaperGameRunning) return;
  const module = diaperGameModules[diaperGameModuleIndex];
  if (!module || module.type !== 'valve') return;
  const result = await submitDiaperGameModule({ position: diaperValvePosition });
  if (!result) return;
  if (result.correct) {
    completeDiaperGameModule('Ventil im gr\u00fcnen Bereich verriegelt. Druck stabil.');
    return;
  }
  const direction = diaperValvePosition < module.safeStart ? 'zu fr\u00fch' : 'zu sp\u00e4t';
  diaperGameMistake(result, `Ventil ${direction} verriegelt!`);
  diaperGameModuleStartedAt = performance.now();
  if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 450);
}

function updateDiaperCodeDisplay() {
  const display = diaperGameActions.querySelector('[data-code-display]');
  const length = diaperGameModules[diaperGameModuleIndex]?.codeSymbols?.length || 3;
  if (display) display.textContent = diaperCodeEntry.padEnd(length, '\u00b7');
}

async function submitDiaperCode() {
  const length = diaperGameModules[diaperGameModuleIndex]?.codeSymbols?.length || 3;
  if (diaperCodeEntry.length !== length) {
    diaperGameStatus.textContent = `Der Entsch\u00e4rfungscode braucht genau ${length} Ziffern.`;
    return;
  }
  const result = await submitDiaperGameModule({ code: diaperCodeEntry });
  if (!result) return;
  if (result.correct) {
    playDiaperTone(610, 110);
    completeDiaperGameModule('Code akzeptiert. Der Symboldecoder ist verriegelt.');
    return;
  }
  diaperGameMistake(result, 'Code falsch! Der Decoder setzt sich zur\u00fcck.');
  diaperCodeEntry = '';
  if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 450);
}

function changeDiaperTemperature(step) {
  if (!diaperGameRunning || diaperGameSubmitting) return;
  diaperTemperatureValue = Math.max(-20, Math.min(99, diaperTemperatureValue + Number(step)));
  const value = diaperGameActions.querySelector('[data-temperature-value]');
  if (value) value.textContent = `${diaperTemperatureValue}\u00b0`;
  playDiaperTone(step > 0 ? 410 : 250, 55);
}

async function submitDiaperTemperature() {
  const result = await submitDiaperGameModule({ value: diaperTemperatureValue });
  if (!result) return;
  if (result.correct) {
    completeDiaperGameModule('Thermokern stabil. Temperaturfenster gesichert.');
    return;
  }
  diaperGameMistake(result, 'Temperatur falsch kalibriert!');
  if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 450);
}

async function chooseDiaperLeakZone(zone) {
  const result = await submitDiaperGameModule({ zone });
  if (!result) return;
  if (result.correct) {
    completeDiaperGameModule('Leck lokalisiert und versiegelt.');
    return;
  }
  diaperGameMistake(result, 'Falscher Sektor! Das Leck wandert zur\u00fcck in den Scan.');
  if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 450);
}

async function chooseDiaperCircuitNode(node) {
  if (!diaperGameRunning || diaperGameSubmitting) return;
  const module = diaperGameModules[diaperGameModuleIndex];
  if (!module || module.type !== 'circuit') return;
  const expected = module.path[diaperCircuitPath.length];
  const button = diaperGameActions.querySelector(`[data-circuit-node="${node}"]`);
  if (node !== expected) {
    const result = await submitDiaperGameModule({ path: [...diaperCircuitPath, node] });
    if (!result) return;
    diaperCircuitPath = [];
    diaperGameMistake(result, 'Leiterbahn unterbrochen! Die Route wird neu projiziert.');
    if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 480);
    return;
  }
  diaperCircuitPath.push(node);
  button?.classList.add('is-linked');
  button?.setAttribute('aria-pressed', 'true');
  playDiaperTone(320 + diaperCircuitPath.length * 55, 70, 'triangle');
  diaperGameStatus.textContent = `Leiterbahn ${diaperCircuitPath.length} von ${module.path.length} verbunden.`;
  if (diaperCircuitPath.length !== module.path.length) return;
  const result = await submitDiaperGameModule({ path: diaperCircuitPath });
  if (!result) return;
  if (result.correct) completeDiaperGameModule('Energiepfad geschlossen. Leiterbahn stabil.');
  else diaperGameMistake(result, 'Die Leiterbahn wurde vom Server abgewiesen.');
}

function rotateDiaperLock(ring, direction) {
  if (!diaperGameRunning || diaperGameSubmitting) return;
  const index = Number(ring);
  diaperLockPositions[index] = (diaperLockPositions[index] + Number(direction) + 8) % 8;
  const dial = diaperGameActions.querySelector(`[data-lock-ring="${index}"] .lock-dial`);
  const value = diaperGameActions.querySelector(`[data-lock-value="${index}"]`);
  if (dial) dial.style.setProperty('--lock-angle', `${diaperLockPositions[index] * 45}deg`);
  if (value) value.textContent = String(diaperLockPositions[index] + 1);
  playDiaperTone(220 + index * 80, 45, 'square');
}

async function submitDiaperLocks() {
  const result = await submitDiaperGameModule({ positions: diaperLockPositions });
  if (!result) return;
  if (result.correct) {
    completeDiaperGameModule('Alle Sicherungsringe eingerastet. Mechanik verriegelt.');
    return;
  }
  diaperGameMistake(result, 'Ringstellung falsch! Die Mechanik springt zurueck.');
  if (diaperGameRunning) scheduleDiaperGameTask(renderCurrentDiaperGameModule, 480);
}

function beginDiaperFinalHold(event) {
  if (!diaperGameRunning || diaperGameSubmitting || diaperFinalHoldStartedAt) return;
  if (event.type === 'keydown' && ![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  diaperFinalHoldStartedAt = performance.now();
  const button = diaperGameActions.querySelector('.diaper-final-cut');
  button?.classList.add('is-holding');
  diaperGameStatus.textContent = 'Halten ... der gr\u00fcne Bereich beginnt bei 0,9 Sekunden.';
  playDiaperTone(185, 120, 'square');
}

function endDiaperFinalHold(event) {
  if (!diaperFinalHoldStartedAt) return;
  if (event.type === 'keyup' && ![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  const holdMs = Math.round(performance.now() - diaperFinalHoldStartedAt);
  diaperFinalHoldStartedAt = 0;
  const button = diaperGameActions.querySelector('.diaper-final-cut');
  button?.classList.remove('is-holding', 'is-ready', 'is-over');
  button?.style.removeProperty('--hold-progress');
  winDiaperGame(holdMs);
}

function renderCurrentDiaperGameModule() {
  if (!diaperGameRunning) return;
  clearDiaperGameTasks();
  const module = diaperGameModules[diaperGameModuleIndex] || (
    diaperGameModuleIndex === diaperGameModules.length
      ? { type: 'final', title: 'Z\u00fcndkreis' }
      : null
  );
  if (!module) return;
  diaperGameActions.className = `diaper-game-actions module-${module.type}`;
  diaperMissionLabel.textContent = module.type === 'final'
    ? 'Finale Entsch\u00e4rfung'
    : `Modul ${diaperGameModuleIndex + 1} von ${diaperGameModules.length}`;
  diaperToolTitle.textContent = module.title;
  diaperModuleCounter.textContent = module.type === 'final'
    ? 'Z\u00fcndkreis offen'
    : `${diaperGameModules.length - diaperGameModuleIndex} aktiv`;
  diaperGameModuleStartedAt = performance.now();
  renderDiaperGameProgress();

  if (module.type === 'wire') {
    diaperMissionBrief.textContent = module.variant === 'color'
      ? `Farbsensor: Durchtrenne die Leitung ${module.targetLabel}. Ziehe quer durch das Kabel.`
      : module.variant === 'pulse'
        ? `Pulscode: Die Leitung ${module.targetSymbol} ist mit dem Detonator synchron. Mit einer Wischbewegung trennen.`
        : `Scannerhinweis: Trenne nur das Kabel mit dem Symbol ${module.targetSymbol}. Die Farben sind Ablenkung.`;
    diaperGameActions.innerHTML = `<div class="diaper-wire-rack" data-game-module="wire">${shuffleDiaperGameItems(module.options).map((wire, index) => `
      <button class="diaper-wire wire-${wire.id}" type="button" data-wire-id="${wire.id}" style="--order:${index}">
        <span class="wire-terminal" aria-hidden="true"></span><i aria-hidden="true"></i><strong>${wire.symbol}</strong><span>${wire.label}</span>
      </button>
    `).join('')}</div>`;
    diaperGameActions.querySelectorAll('[data-wire-id]').forEach((button) => {
      let pointerStart = null;
      button.addEventListener('pointerdown', (event) => {
        pointerStart = event.clientX;
        button.classList.add('is-grabbed');
      });
      button.addEventListener('pointerup', (event) => {
        button.classList.remove('is-grabbed');
        if (pointerStart !== null && Math.abs(event.clientX - pointerStart) >= 18) {
          button.dataset.swiped = 'true';
          chooseDiaperWire(button.dataset.wireId);
        }
        pointerStart = null;
      });
      button.addEventListener('click', () => {
        if (button.dataset.swiped === 'true') {
          delete button.dataset.swiped;
          return;
        }
        chooseDiaperWire(button.dataset.wireId);
      });
    });
    diaperGameStatus.textContent = 'Ziehe quer durch die richtige Leitung. Tastatur: Leitung ausw\u00e4hlen und Enter dr\u00fccken.';
  } else if (module.type === 'signal') {
    diaperMissionBrief.textContent = `Merke dir die aufblinkende ${module.sequence.length}er-Folge und wiederhole sie exakt auf dem Tastenfeld.`;
    diaperGameActions.innerHTML = `
      <div class="diaper-signal-bank" data-game-module="signal" data-signal-sequence="${module.sequence.join(',')}" aria-label="Impulsspeicher">
        <div class="signal-lamps" aria-hidden="true">${diaperSignalOptions.map((signal) => `<span class="signal-lamp signal-${signal.id}" data-signal-lamp="${signal.id}">${signal.symbol}</span>`).join('')}</div>
        <div class="signal-keys">${diaperSignalOptions.map((signal, index) => `
          <button class="signal-key signal-${signal.id}" type="button" data-signal-id="${signal.id}" style="--order:${index}"><strong>${signal.symbol}</strong><span>${signal.label}</span></button>
        `).join('')}</div>
      </div>`;
    diaperGameActions.querySelectorAll('[data-signal-id]').forEach((button) => {
      button.addEventListener('click', () => chooseDiaperSignal(button.dataset.signalId));
    });
    playDiaperSignalSequence();
  } else if (module.type === 'valve') {
    diaperMissionBrief.textContent = 'Der Zeiger pendelt. Verriegle das Ventil genau im gr\u00fcnen Korridor.';
    diaperGameActions.innerHTML = `
      <div class="diaper-valve-module" data-game-module="valve">
        <div class="diaper-valve-track" aria-label="Pendeldruckanzeige">
          <span class="valve-danger left"></span>
          <span class="valve-safe" style="left:${module.safeStart}%;width:${module.safeEnd - module.safeStart}%"></span>
          <span id="diaperValveNeedle" class="valve-needle"></span>
        </div>
        <div class="valve-scale" aria-hidden="true"><span>0</span><span class="valve-safe-label" style="left:${(module.safeStart + module.safeEnd) / 2}%">SAFE ZONE</span><span>100</span></div>
        <button class="diaper-valve-lock" type="button"><span aria-hidden="true">\u25c9</span> Ventil jetzt verriegeln</button>
      </div>`;
    diaperGameActions.querySelector('.diaper-valve-lock').addEventListener('click', lockDiaperPressureValve);
    diaperGameStatus.textContent = 'Warte auf den gr\u00fcnen Korridor \u2013 dann verriegeln!';
  } else if (module.type === 'code') {
    diaperCodeEntry = '';
    const codeLength = module.codeSymbols.length;
    diaperMissionBrief.textContent = `Entschl\u00fcssle die ${codeLength} Symbole mit der Zuordnung und gib den Code ein.`;
    diaperGameActions.innerHTML = `
      <div class="diaper-code-module" data-game-module="code" data-code-answer="${module.codeSymbols.map((symbol) => module.decoder[symbol]).join('')}">
        <div class="decoder-map" aria-label="Symbol-Ziffer-Zuordnung">${Object.entries(module.decoder).map(([symbol, digit]) => `<span><strong>${symbol}</strong><i>=</i><b>${digit}</b></span>`).join('')}</div>
        <div class="decoder-target" aria-label="Zu entschl\u00fcsselnder Code">${module.codeSymbols.map((symbol) => `<strong>${symbol}</strong>`).join('')}</div>
        <output class="decoder-display" data-code-display aria-live="polite">${'\u00b7'.repeat(codeLength)}</output>
        <div class="decoder-keypad">${[1,2,3,4,5,6,7,8,9].map((digit) => `<button type="button" data-code-digit="${digit}">${digit}</button>`).join('')}
          <button type="button" data-code-delete aria-label="Letzte Ziffer l\u00f6schen">\u232b</button>
          <button class="decoder-confirm" type="button" data-code-confirm>Code pr\u00fcfen</button>
        </div>
      </div>`;
    diaperGameActions.querySelectorAll('[data-code-digit]').forEach((button) => button.addEventListener('click', () => {
      if (diaperCodeEntry.length < codeLength) diaperCodeEntry += button.dataset.codeDigit;
      updateDiaperCodeDisplay();
    }));
    diaperGameActions.querySelector('[data-code-delete]').addEventListener('click', () => {
      diaperCodeEntry = diaperCodeEntry.slice(0, -1);
      updateDiaperCodeDisplay();
    });
    diaperGameActions.querySelector('[data-code-confirm]').addEventListener('click', submitDiaperCode);
    diaperGameStatus.textContent = 'Jedes Symbol steht f\u00fcr genau eine Ziffer.';
  } else if (module.type === 'temperature') {
    diaperTemperatureValue = module.start;
    diaperMissionBrief.textContent = `Bringe den Thermokern von ${module.start}\u00b0 exakt auf ${module.target}\u00b0.`;
    diaperGameActions.innerHTML = `
      <div class="diaper-temperature-module" data-game-module="temperature" data-temperature-target="${module.target}">
        <div class="temperature-readout"><span>IST <strong data-temperature-value>${module.start}\u00b0</strong></span><i aria-hidden="true">\u2192</i><span>ZIEL <strong>${module.target}\u00b0</strong></span></div>
        <div class="temperature-controls">${module.steps.map((step) => `<button type="button" data-temperature-step="${step}">${step > 0 ? '+' : ''}${step}\u00b0</button>`).join('')}</div>
        <button class="temperature-confirm" type="button" data-temperature-confirm>Temperatur verriegeln</button>
      </div>`;
    diaperGameActions.querySelectorAll('[data-temperature-step]').forEach((button) => button.addEventListener('click', () => changeDiaperTemperature(button.dataset.temperatureStep)));
    diaperGameActions.querySelector('[data-temperature-confirm]').addEventListener('click', submitDiaperTemperature);
    diaperGameStatus.textContent = 'Kombiniere die Kalibrierimpulse. Du darfst Tasten mehrfach nutzen.';
  } else if (module.type === 'leak') {
    diaperMissionBrief.textContent = 'Der Scanner markiert das Leck nur kurz. Merke dir den Sektor und versiegle ihn danach.';
    diaperGameActions.innerHTML = `
      <div class="diaper-leak-module is-revealing" data-game-module="leak" data-reveal-zone="${module.revealZone}">
        <div class="leak-grid">${Array.from({ length: module.zones }, (_, zone) => `<button type="button" data-leak-zone="${zone}" ${zone === module.revealZone ? 'class="is-leak"' : ''} disabled><span>${zone + 1}</span><i aria-hidden="true"></i></button>`).join('')}</div>
        <p>SCAN L\u00c4UFT</p>
      </div>`;
    diaperGameStatus.textContent = 'Beobachte den Scan. Gleich wird die Anzeige verdeckt.';
    scheduleDiaperGameTask(() => {
      if (!diaperGameRunning || diaperGameModules[diaperGameModuleIndex]?.type !== 'leak') return;
      const wrapper = diaperGameActions.querySelector('.diaper-leak-module');
      wrapper?.classList.remove('is-revealing');
      wrapper?.querySelector('.is-leak')?.classList.remove('is-leak');
      wrapper?.querySelectorAll('[data-leak-zone]').forEach((button) => { button.disabled = false; });
      if (wrapper?.querySelector('p')) wrapper.querySelector('p').textContent = 'SEKTOR W\u00c4HLEN';
      diaperGameStatus.textContent = 'Welcher Sektor hat pulsiert?';
      wrapper?.querySelector('button')?.focus({ preventScroll: true });
    }, 1200);
    diaperGameActions.querySelectorAll('[data-leak-zone]').forEach((button) => button.addEventListener('click', () => chooseDiaperLeakZone(Number(button.dataset.leakZone))));
  } else if (module.type === 'circuit') {
    diaperCircuitPath = [];
    diaperMissionBrief.textContent = `Verbinde die Energiepunkte in der projizierten Reihenfolge ${module.path.map((node) => node + 1).join(' - ')}.`;
    diaperGameActions.innerHTML = `
      <div class="diaper-circuit-module" data-game-module="circuit" data-circuit-path="${module.path.join(',')}">
        <div class="circuit-energy" aria-hidden="true"><i></i><span>ENERGIEPFAD</span><b></b></div>
        <div class="circuit-board">${Array.from({ length: 6 }, (_, node) => `
          <button type="button" data-circuit-node="${node}" aria-pressed="false" style="--node:${node};--order:${node}"><span>${node + 1}</span><i aria-hidden="true"></i></button>
        `).join('')}</div>
      </div>`;
    diaperGameActions.querySelectorAll('[data-circuit-node]').forEach((button) => {
      button.addEventListener('click', () => chooseDiaperCircuitNode(Number(button.dataset.circuitNode)));
    });
    diaperGameStatus.textContent = 'Starte beim ersten projizierten Punkt und schliesse die Leiterbahn.';
  } else if (module.type === 'locks') {
    diaperLockPositions = [0, 0, 0];
    diaperMissionBrief.textContent = `Drehe die drei Sicherungsringe auf ${module.targets.map((target) => target + 1).join(' - ')}.`;
    diaperGameActions.innerHTML = `
      <div class="diaper-lock-module" data-game-module="locks" data-lock-targets="${module.targets.join(',')}">
        <div class="lock-rings">${module.targets.map((target, ring) => `
          <section data-lock-ring="${ring}" aria-label="Sicherungsring ${ring + 1}, Ziel ${target + 1}">
            <button type="button" data-lock-turn="-1" data-lock-index="${ring}" aria-label="Ring ${ring + 1} nach links drehen">\u2039</button>
            <div class="lock-dial" style="--lock-angle:0deg"><i></i><strong data-lock-value="${ring}">1</strong><span>ZIEL ${target + 1}</span></div>
            <button type="button" data-lock-turn="1" data-lock-index="${ring}" aria-label="Ring ${ring + 1} nach rechts drehen">\u203a</button>
          </section>`).join('')}</div>
        <button class="lock-confirm" type="button" data-lock-confirm>Ringe verriegeln</button>
      </div>`;
    diaperGameActions.querySelectorAll('[data-lock-turn]').forEach((button) => {
      button.addEventListener('click', () => rotateDiaperLock(button.dataset.lockIndex, button.dataset.lockTurn));
    });
    diaperGameActions.querySelector('[data-lock-confirm]').addEventListener('click', submitDiaperLocks);
    diaperGameStatus.textContent = 'Jeder Ring rastet sp\u00fcrbar in acht Positionen ein.';
  } else {
    diaperMissionBrief.textContent = 'Alle vier Sicherungen sind gr\u00fcn. Halte den Z\u00fcndkreis mindestens 0,9 und h\u00f6chstens 1,8 Sekunden.';
    diaperGameActions.innerHTML = `
      <div class="diaper-final-module" data-game-module="final">
        <div class="final-locks" aria-hidden="true"><span></span><span></span><span></span></div>
        <button class="diaper-final-cut" type="button"><i aria-hidden="true"></i><strong>GEDR\u00dcCKT HALTEN</strong><span>0,9 \u2013 1,8 Sekunden</span></button>
      </div>`;
    const finalButton = diaperGameActions.querySelector('.diaper-final-cut');
    finalButton.addEventListener('pointerdown', beginDiaperFinalHold);
    finalButton.addEventListener('pointerup', endDiaperFinalHold);
    finalButton.addEventListener('keydown', beginDiaperFinalHold);
    finalButton.addEventListener('keyup', endDiaperFinalHold);
    diaperGameStatus.textContent = 'Finale! Nicht tippen \u2013 kontrolliert gedr\u00fcckt halten.';
    diaperGameActions.querySelector('button')?.focus({ preventScroll: true });
  }
}

function updateDiaperGameClock() {
  if (!diaperGameRunning) return;
  const now = performance.now();
  const remaining = Math.max(0, diaperGameDeadline - now);
  diaperCountdown.textContent = formatDiaperCountdown(remaining);
  diaperCountdown.classList.toggle('is-critical', remaining <= 10000);
  setDiaperPressure(100 - (remaining / diaperGameRoundMs) * 100);
  const module = diaperGameModules[diaperGameModuleIndex] || (
    diaperGameModuleIndex === diaperGameModules.length ? { type: 'final' } : null
  );
  if (module?.type === 'valve') {
    const sweepMs = Number(module.sweepMs || 1800);
    const phase = ((now - diaperGameModuleStartedAt) % sweepMs) / sweepMs;
    diaperValvePosition = phase <= 0.5 ? phase * 200 : (1 - phase) * 200;
    const needle = diaperGameActions.querySelector('#diaperValveNeedle');
    if (needle) needle.style.left = `${diaperValvePosition}%`;
  }
  if (module?.type === 'final' && diaperFinalHoldStartedAt) {
    const holdMs = now - diaperFinalHoldStartedAt;
    const button = diaperGameActions.querySelector('.diaper-final-cut');
    if (button) {
      button.style.setProperty('--hold-progress', String(Math.min(1, holdMs / 1800)));
      button.classList.toggle('is-ready', holdMs >= 900 && holdMs <= 1800);
      button.classList.toggle('is-over', holdMs > 1800);
    }
    if (holdMs > 1850) endDiaperFinalHold({ type: 'pointerup', preventDefault() {} });
  }
  if (remaining <= 0) loseDiaperGame();
}

async function startDiaperGame() {
  stopDiaperGame();
  const requestId = ++diaperGameStartRequest;
  let round;
  startDiaperGameButton.disabled = true;
  diaperGameStatus.textContent = 'Sichere Spielrunde wird vorbereitet.';
  try {
    round = await api('/api/diaper-game/start', {
      method: 'POST',
      body: JSON.stringify({ mode: diaperGameMode })
    });
    if (requestId !== diaperGameStartRequest || diaperGameOverlay.hidden) {
      startDiaperGameButton.disabled = false;
      return;
    }
    diaperGameRoundToken = round.token;
    diaperGameMode = round.mode;
    diaperGameModules = round.modules;
    diaperGameRoundMs = round.roundMs;
    diaperGamePenaltyMs = round.penaltyMs;
    diaperGameMaxMistakes = round.maxMistakes;
    diaperGameIncident = round.incident;
  } catch (error) {
    diaperGameStatus.textContent = error.message;
    startDiaperGameButton.disabled = false;
    return;
  }
  diaperGameModuleIndex = 0;
  diaperGameMistakes = 0;
  diaperGameIncidentPlayed = false;
  diaperGameRunning = true;
  diaperGameStartedAt = performance.now();
  diaperGameDeadline = diaperGameStartedAt + diaperGameRoundMs;
  diaperGameStage.classList.remove('is-shaking', 'is-defused', 'module-cleared', 'incident-kick', 'incident-blackout', 'incident-surge', 'incident-fog', 'has-incident');
  diaperGameOverlay.querySelector('.diaper-game-modal').dataset.gameRunning = 'true';
  diaperCountdown.classList.remove('is-critical');
  diaperCountdown.textContent = formatDiaperCountdown(diaperGameRoundMs);
  diaperSerial.textContent = diaperGameMode === 'ranked'
    ? `WZ-${round.challengeKey.slice(5).replace('-', '')}`
    : `P-${diaperGameRoundToken.slice(0, 4).toUpperCase()}`;
  setDiaperPressure(0);
  setDiaperStartButton('Einsatz neu starten');
  rankedDiaperModeButton.disabled = true;
  practiceDiaperModeButton.disabled = true;
  renderDiaperStrikes();
  startDiaperGameButton.disabled = false;
  renderDiaperGameProgress();
  renderCurrentDiaperGameModule();
  startDiaperGameButton.blur();
  const gameModal = diaperGameOverlay.querySelector('.diaper-game-modal');
  if (gameModal) {
    gameModal.scrollTop = 0;
    window.requestAnimationFrame(() => { gameModal.scrollTop = 0; });
  }
  diaperGameTimer = window.setInterval(updateDiaperGameClock, 50);
}

function openDiaperGame() {
  closeAccountMenu();
  diaperGameReturnFocus = document.activeElement;
  diaperGameOverlay.hidden = false;
  document.body.classList.add('modal-open');
  if (!diaperGameRunning) {
    diaperGameModuleIndex = 0;
    diaperGameMistakes = 0;
    diaperGameIncidentPlayed = false;
    diaperGameStage.classList.remove('is-shaking', 'is-defused', 'module-cleared', 'incident-kick', 'incident-blackout', 'incident-surge', 'incident-fog', 'has-incident');
    diaperGameStage.dataset.mood = 'calm';
    diaperCountdown.textContent = formatDiaperCountdown(diaperGameRoundMs);
    diaperSerial.textContent = 'WZ-0000';
    setDiaperPressure(0);
    diaperMissionLabel.textContent = 'Einsatzbriefing';
    diaperToolTitle.textContent = 'Windel noch nicht aktiviert';
    diaperModuleCounter.textContent = '4 aus 8 Modulen';
    diaperMissionBrief.textContent = diaperGameMode === 'ranked'
      ? 'Heute spielen alle H\u00e4user dieselben vier Module und denselben Zwischenfall. Drei Fehler l\u00f6sen den Alarm aus.'
      : 'Im Training wechseln vier Systemvarianten und der Zwischenfall. Das Ergebnis wird nicht gewertet.';
    diaperGameActions.className = 'diaper-game-actions';
    diaperGameActions.innerHTML = '<p class="diaper-actions-empty">Dr\u00fccke auf Spiel starten, um den Einsatzcode zu laden.</p>';
    diaperGameStatus.textContent = 'Einsatz bereit. Starte, sobald deine Nerven ruhig sind.';
    setDiaperStartButton('Spiel starten', '\u25b6');
    renderDiaperStrikes();
    setDiaperGameMode(diaperGameMode);
  }
  renderDiaperGameProgress();
  loadDiaperLeaderboard();
  diaperGameOverlay.querySelector('.diaper-game-modal').scrollTop = 0;
  startDiaperGameButton.focus({ preventScroll: true });
}

function closeDiaperGame() {
  diaperGameStartRequest += 1;
  stopDiaperGame();
  diaperGameOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  if (diaperGameReturnFocus instanceof HTMLElement) diaperGameReturnFocus.focus();
}

async function submitLogout(event, button, messageTarget = null) {
  event.preventDefault();
  if (logoutInProgress) return;

  logoutInProgress = true;
  logoutButton.disabled = true;
  apartmentSetupLogoutButton.disabled = true;
  button.textContent = translate('common.loggingOut', 'Wird abgemeldet...');
  if (messageTarget) {
    messageTarget.textContent = '';
    messageTarget.className = 'message';
  }

  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error(translate('auth.logoutFailed', 'Abmelden konnte nicht abgeschlossen werden.'));
    }
    window.location.replace('/login.html?loggedOut=1');
  } catch (error) {
    logoutInProgress = false;
    logoutButton.disabled = false;
    apartmentSetupLogoutButton.disabled = false;
    button.textContent = translate('common.logout', 'Abmelden');
    const message = `${error.message} ${translate('auth.tryAgain', 'Bitte versuche es erneut.')}`;
    if (messageTarget) {
      messageTarget.textContent = message;
      messageTarget.className = 'message error';
    } else {
      showStatus(message, 'error');
    }
  }
}

logoutForm.addEventListener('submit', (event) => submitLogout(event, logoutButton));
apartmentSetupLogoutForm.addEventListener('submit', (event) => (
  submitLogout(event, apartmentSetupLogoutButton, apartmentSetupMessage)
));
bookingViewButton.addEventListener('click', () => setAppView('booking', { userInitiated: true }));
adminViewButton.addEventListener('click', () => setAppView('admin', { userInitiated: true }));
adminSectionButtons.forEach((button) => {
  button.addEventListener('click', () => setAdminSection(button.dataset.adminTarget));
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = adminSectionButtons.indexOf(button);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? adminSectionButtons.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + adminSectionButtons.length)
          % adminSectionButtons.length;
    const nextButton = adminSectionButtons[nextIndex];
    setAdminSection(nextButton.dataset.adminTarget);
    nextButton.focus();
  });
});
adminTaskList.addEventListener('click', (event) => {
  const target = event.target.closest('[data-admin-jump]');
  if (!target) return;
  setAdminSection(target.dataset.adminJump);
  const section = document.querySelector(`[data-admin-section="${target.dataset.adminJump}"]`);
  section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  const heading = section?.querySelector('h3');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
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
adminPeopleSearch.addEventListener('input', filterAdminPeople);

adminEmailTestButton.addEventListener('click', sendAdminTestEmail);
adminPushTestButton.addEventListener('click', sendAdminTestPush);
runBackupButton.addEventListener('click', runBackupNow);
toggleMaintenanceButton.addEventListener('click', toggleMaintenanceMode);
resetBookingsButton.addEventListener('click', resetAllBookings);
superadminPermissionAction.addEventListener('change', renderSuperadminPermissionTargets);
superadminPermissionButton.addEventListener('click', updateSuperadminPermission);
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
  setAppView('admin', { userInitiated: true });
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
function postponeApartmentSetup() {
  apartmentSetupOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  showStatus(translate(
    'onboarding.postponed',
    'Vor der naechsten Buchung muss das Konto noch einer Wohnung zugeordnet werden.'
  ), 'error');
}
closeApartmentSetupButton.addEventListener('click', postponeApartmentSetup);
postponeApartmentSetupButton.addEventListener('click', postponeApartmentSetup);

openIntroButton.addEventListener('click', openIntro);
openDiaperGameButton.addEventListener('click', openDiaperGame);
closeDiaperGameButton.addEventListener('click', closeDiaperGame);
startDiaperGameButton.addEventListener('click', startDiaperGame);
resetDiaperBestButton.addEventListener('click', async () => {
  resetDiaperBestButton.disabled = true;
  try {
    renderDiaperLeaderboard(await api('/api/diaper-game/score', { method: 'DELETE' }));
    diaperGameStatus.textContent = 'Dein heutiger globaler Bestwert wurde gel\u00f6scht.';
  } catch (error) {
    diaperGameStatus.textContent = error.message;
  } finally {
    resetDiaperBestButton.disabled = false;
  }
});
rankedDiaperModeButton.addEventListener('click', () => setDiaperGameMode('ranked'));
practiceDiaperModeButton.addEventListener('click', () => setDiaperGameMode('practice'));
diaperSoundButton.addEventListener('click', async () => {
  diaperGameSoundEnabled = !diaperGameSoundEnabled;
  diaperSoundButton.setAttribute('aria-pressed', String(diaperGameSoundEnabled));
  diaperSoundButton.textContent = diaperGameSoundEnabled ? 'Ton an' : 'Ton aus';
  if (diaperGameSoundEnabled) {
    if (diaperGameAudioContext?.state === 'suspended') await diaperGameAudioContext.resume();
    playDiaperTone(520, 100);
  }
});
diaperGameOverlay.addEventListener('click', (event) => {
  if (event.target === diaperGameOverlay) closeDiaperGame();
});
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
introChapterList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-intro-chapter]');
  if (button) jumpIntroVideoStep(button.dataset.introChapter);
});
recordedIntroChapters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-recorded-chapter]');
  if (!button) return;
  seekRecordedIntroChapter(button.dataset.recordedChapter, { play: true });
});
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
  if (event.key === 'Escape' && !diaperGameOverlay.hidden) {
    closeDiaperGame();
    return;
  }
  if (event.key === 'Tab' && !diaperGameOverlay.hidden) {
    const focusable = [...diaperGameOverlay.querySelectorAll('button:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0);
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
  recordedIntroDuration.textContent = formatMediaDuration(recordedIntroVideo.duration);
  updateRecordedIntroChapterState();
});
recordedIntroVideo.addEventListener('timeupdate', updateRecordedIntroChapterState);
recordedIntroVideo.addEventListener('loadeddata', () => { recordedIntroFallback.hidden = true; });
recordedIntroVideo.addEventListener('error', () => { recordedIntroFallback.hidden = false; });

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderInstallStatus();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  renderInstallStatus();
  showStatus(translate('settings.installComplete', 'WaschZeit wurde als App installiert.'));
});

function renderLocalizedSettingsState() {
  renderSettingsHeader();
  renderApartmentAccountStatus();
  renderEmailVerificationStatus();
  renderInstallStatus();
  renderPushStatusView();
  renderDevicePairingLabels();
  renderReleaseStatus();
  renderSettingsSummary();
}

async function refreshLocalizedDynamicViews() {
  const focusedElement = document.activeElement;
  renderHouseContext();
  renderMessageCenter();
  renderCalendar();
  renderRecommendation();
  renderSchedule();
  renderMyBookings(myBookingItems);
  renderBookingFlow();
  renderReleaseStatus();
  if (activeReleaseNotice) renderReleaseNoticeDetail(activeReleaseNotice);
  configureIntroForCurrentUser({ preserveStep: true });
  renderLocalizedSettingsState();
  i18n?.apply(document.documentElement);

  if (currentUser.canManage) {
    await loadAdmin();
    i18n?.apply(adminBox);
  }

  if (focusedElement instanceof HTMLElement && focusedElement.isConnected) {
    focusedElement.focus({ preventScroll: true });
  }
}

window.addEventListener('waschzeit:languagechange', () => {
  if (!currentUser) return;
  refreshLocalizedDynamicViews().catch((error) => {
    showStatus(error.message || translate('app.noConnection', 'Keine Verbindung zur App.'), 'error');
  });
});

window.addEventListener('waschzeit:i18nerror', (event) => {
  showStatus(event.detail?.message || translate('app.noConnection', 'Keine Verbindung zur App.'), 'error');
});

if (introVideoSpeechSupported) {
  window.speechSynthesis.addEventListener('voiceschanged', refreshIntroVideoVoice);
  refreshIntroVideoVoice();
}

init().catch((error) => {
  statusText.textContent = error.message;
});
