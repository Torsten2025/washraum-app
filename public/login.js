const loginForm = document.getElementById("loginForm");
const userNameInput = document.getElementById("userName");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const registerForm = document.getElementById("registerForm");
const registerUserNameInput = document.getElementById("registerUserName");
const registerDisplayNameInput = document.getElementById("registerDisplayName");
const registerApartmentLabelInput = document.getElementById("registerApartmentLabel");
const registerPasswordInput = document.getElementById("registerPassword");
const registerMessage = document.getElementById("registerMessage");
const showLoginButton = document.getElementById("showLoginButton");
const showRegisterButton = document.getElementById("showRegisterButton");
const playRegisterOnboardingVideoButton = document.getElementById("playRegisterOnboardingVideo");
const toggleRegisterNarrationButton = document.getElementById("toggleRegisterNarration");
const markRegisterOnboardingReadButton = document.getElementById("markRegisterOnboardingRead");
const registerVideoStage = document.getElementById("registerVideoStage");
const registerVideoProgress = document.getElementById("registerVideoProgress");
const registerVideoProgressTrack = document.getElementById("registerVideoProgressTrack");
const registerVideoStatus = document.getElementById("registerVideoStatus");
const registerAudioStatus = document.getElementById("registerAudioStatus");
const registerVideoTitle = document.getElementById("registerVideoTitle");
const registerVideoCaption = document.getElementById("registerVideoCaption");
const registerVideoStepLabel = document.getElementById("registerVideoStepLabel");
const registerVideoStepMarkers = Array.from(document.querySelectorAll("[data-register-video-step]"));
const registerOnboardingMessage = document.getElementById("registerOnboardingMessage");

let registerOnboardingWatched = false;
let registerIntroElapsedMs = 0;
let registerIntroTimer = null;
let registerIntroLastTick = 0;
let registerIntroPlaying = false;
const registerNarrationSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
let registerNarrationEnabled = registerNarrationSupported;
let registerNarrationStepId = "";

const registerIntroSteps = [
  {
    id: "plan",
    durationMs: 12500,
    title: "Erst planen, dann buchen",
    caption: "Waehle zuerst deinen Waschslot. Wenn du mehrere Waschmaschinen brauchst, bleiben sie am gleichen Tag im selben Zeitfenster. Eine weitere Zukunftssequenz buchst du erst am Waschtag.",
    speech: "Waehle zuerst deinen Waschslot. Wenn du mehrere Waschmaschinen brauchst, bleiben sie am gleichen Tag im selben Zeitfenster. Eine weitere Zukunftssequenz buchst du erst am Waschtag."
  },
  {
    id: "washer",
    durationMs: 12500,
    title: "Waschmaschinen bleiben im Slot",
    caption: "Pro Tag wird nur innerhalb eines Slots reserviert. Praktisch heisst das: 07:00-12:00, 12:00-17:00 oder 17:00-21:00, aber nicht am gleichen Tag gemischt.",
    speech: "Pro Tag wird nur innerhalb eines Slots reserviert. Praktisch heisst das: sieben bis zwoelf Uhr, zwoelf bis siebzehn Uhr oder siebzehn bis einundzwanzig Uhr, aber nicht am gleichen Tag gemischt."
  },
  {
    id: "drying",
    durationMs: 12500,
    title: "Trockenraum passend zum Waschslot",
    caption: "Beim 07:00-Slot darf der Trockenraum bis 21:00 am gleichen Tag genutzt werden. Beim 12:00- oder 17:00-Slot ist maximal 12:00 am Folgetag erlaubt. Frueher freigeben hilft allen.",
    speech: "Beim sieben Uhr Slot darf der Trockenraum bis einundzwanzig Uhr am gleichen Tag genutzt werden. Beim zwoelf Uhr oder siebzehn Uhr Slot ist maximal zwoelf Uhr am Folgetag erlaubt. Frueher freigeben hilft allen."
  },
  {
    id: "tumbler",
    durationMs: 12500,
    title: "Tumbler nur zum eigenen Waschslot",
    caption: "Ein Tumbler passt nur waehrend deines gebuchten Waschmaschinen-Slots. Am Ende des Waschslots muss mindestens ein Tumbler frei bleiben.",
    speech: "Ein Tumbler passt nur waehrend deines gebuchten Waschmaschinen Slots. Am Ende des Waschslots muss mindestens ein Tumbler frei bleiben."
  },
  {
    id: "cleaning",
    durationMs: 12500,
    title: "Sauber abschliessen",
    caption: "Nach der Nutzung bitte Waschmittelschublade, Trommel, Dichtungen und Filter reinigen. Beim Tumbler gehoeren alle vier Filter dazu; im Trockenraum auch Filter, Tisch und Boden.",
    speech: "Nach der Nutzung bitte Waschmittelschublade, Trommel, Dichtungen und Filter reinigen. Beim Tumbler gehoeren alle vier Filter dazu. Im Trockenraum auch Filter, Tisch und Boden."
  },
  {
    id: "fairness",
    durationMs: 12500,
    title: "Kurz fair bleiben",
    caption: "Auch kurze Zwischendurch-Waeschen muessen gereinigt werden. Sonn- und gepflegte Sperrtage sind geschlossen. Feste Admin-Buchungen bleiben reserviert und koennen nicht ueberschrieben werden.",
    speech: "Auch kurze Zwischendurch Waeschen muessen gereinigt werden. Sonn- und gepflegte Sperrtage sind geschlossen. Feste Admin Buchungen bleiben reserviert und koennen nicht ueberschrieben werden."
  }
];

const registerIntroTotalMs = registerIntroSteps.reduce((total, step) => total + step.durationMs, 0);

const sessionNotice = sessionStorage.getItem("washraumSessionNotice");
if (sessionNotice) {
  loginMessage.textContent = sessionNotice;
  sessionStorage.removeItem("washraumSessionNotice");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  const userName = userNameInput.value.trim();
  const password = passwordInput.value;

  if (!userName || !password) {
    userNameInput.focus();
    return;
  }

  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userName, password })
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    loginMessage.textContent = messageForError(data.error);
    return;
  }

  storeSessionAndContinue(data);
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMessage.textContent = "";

  const userName = registerUserNameInput.value.trim();
  const password = registerPasswordInput.value;

  if (!userName || !password) {
    registerUserNameInput.focus();
    return;
  }

  const onboarding = registerOnboardingResult();
  if (!onboarding.ok) {
    registerOnboardingMessage.textContent = onboarding.message;
    return;
  }

  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userName,
      password,
      displayName: registerDisplayNameInput.value.trim(),
      apartmentLabel: registerApartmentLabelInput.value.trim(),
      onboardingIntroSeen: true,
      onboardingAnswers: onboarding.answers
    })
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    registerMessage.textContent = messageForError(data.error);
    return;
  }

  storeSessionAndContinue(data);
});

showLoginButton.addEventListener("click", () => setAuthMode("login"));
showRegisterButton.addEventListener("click", () => setAuthMode("register"));
playRegisterOnboardingVideoButton.addEventListener("click", playRegisterOnboardingVideo);
toggleRegisterNarrationButton.addEventListener("click", toggleRegisterNarration);
markRegisterOnboardingReadButton.addEventListener("click", markRegisterOnboardingRead);
updateRegisterNarrationControl();
renderRegisterIntro();

function setAuthMode(mode) {
  const registerMode = mode === "register";
  loginForm.classList.toggle("hidden", registerMode);
  registerForm.classList.toggle("hidden", !registerMode);
  showLoginButton.classList.toggle("is-active", !registerMode);
  showRegisterButton.classList.toggle("is-active", registerMode);
  loginMessage.textContent = "";
  registerMessage.textContent = "";
  registerOnboardingMessage.textContent = "";
  if (registerMode) {
    registerUserNameInput.focus();
  } else {
    userNameInput.focus();
  }
}

function storeSessionAndContinue(data) {
  sessionStorage.setItem("washraumAuthToken", data.token);
  sessionStorage.setItem("washraumUserName", data.user.userName);
  sessionStorage.setItem("washraumUserRole", data.user.role);
  window.location.href = "/index.html";
}

function playRegisterOnboardingVideo() {
  if (registerIntroPlaying) {
    pauseRegisterIntro();
    return;
  }

  if (registerOnboardingWatched || registerIntroElapsedMs >= registerIntroTotalMs) {
    registerIntroElapsedMs = 0;
    registerOnboardingWatched = false;
    registerVideoStage.classList.remove("is-complete");
  }

  startRegisterIntro();
}

function startRegisterIntro() {
  clearRegisterIntroTimer();
  registerIntroPlaying = true;
  registerIntroLastTick = Date.now();
  registerNarrationStepId = "";
  registerVideoStage.classList.add("is-playing");
  playRegisterOnboardingVideoButton.textContent = "Intro pausieren";
  markRegisterOnboardingReadButton.textContent = "Als gelesen markieren";
  registerOnboardingMessage.textContent = "";
  renderRegisterIntro();

  registerIntroTimer = window.setInterval(() => {
    const now = Date.now();
    registerIntroElapsedMs = Math.min(registerIntroTotalMs, registerIntroElapsedMs + now - registerIntroLastTick);
    registerIntroLastTick = now;
    renderRegisterIntro();

    if (registerIntroElapsedMs >= registerIntroTotalMs) {
      completeRegisterIntro("Intro angesehen. Jetzt fehlen nur noch die drei Fragen.");
    }
  }, 200);
}

function pauseRegisterIntro() {
  clearRegisterIntroTimer();
  registerIntroPlaying = false;
  pauseRegisterNarration();
  registerVideoStage.classList.remove("is-playing");
  playRegisterOnboardingVideoButton.textContent = "Intro fortsetzen";
  renderRegisterIntro();
}

function markRegisterOnboardingRead() {
  cancelRegisterNarration();
  completeRegisterIntro("Einfuehrung als gelesen markiert. Jetzt fehlen nur noch die drei Fragen.");
}

function completeRegisterIntro(message) {
  clearRegisterIntroTimer();
  cancelRegisterNarration();
  registerIntroPlaying = false;
  registerOnboardingWatched = true;
  registerIntroElapsedMs = registerIntroTotalMs;
  registerVideoStage.classList.remove("is-playing");
  registerVideoStage.classList.add("is-complete");
  playRegisterOnboardingVideoButton.textContent = "Intro erneut ansehen";
  markRegisterOnboardingReadButton.textContent = "Gelesen";
  registerVideoStatus.textContent = message;
  renderRegisterIntro();
}

function clearRegisterIntroTimer() {
  if (registerIntroTimer) {
    window.clearInterval(registerIntroTimer);
    registerIntroTimer = null;
  }
}

function renderRegisterIntro() {
  const stepState = registerIntroStepForElapsed(registerIntroElapsedMs);
  const progress = Math.min(1, registerIntroElapsedMs / registerIntroTotalMs);
  const percent = Math.round(progress * 100);

  registerVideoStage.dataset.activeStep = stepState.step.id;
  registerVideoProgress.style.transform = `scaleX(${progress})`;
  registerVideoProgressTrack.setAttribute("aria-valuenow", String(percent));
  registerVideoTitle.textContent = stepState.step.title;
  registerVideoCaption.textContent = stepState.step.caption;
  registerVideoStepLabel.textContent = `Kapitel ${stepState.index + 1} von ${registerIntroSteps.length}`;

  for (const marker of registerVideoStepMarkers) {
    const markerIndex = registerIntroSteps.findIndex((step) => step.id === marker.dataset.registerVideoStep);
    marker.classList.toggle("is-active", markerIndex === stepState.index);
    marker.classList.toggle("is-done", markerIndex >= 0 && markerIndex < stepState.index);
  }

  if (registerOnboardingWatched) {
    registerVideoStatus.textContent = "Einfuehrung erledigt. Du kannst sie bei Bedarf erneut ansehen.";
    return;
  }

  if (registerIntroPlaying) {
    speakRegisterIntroStep(stepState.step);
    registerVideoStatus.textContent = `Laeuft: ${stepState.step.title}`;
    return;
  }

  if (registerIntroElapsedMs > 0) {
    registerVideoStatus.textContent = "Pausiert. Du kannst fortsetzen oder das Transkript lesen.";
    return;
  }

  registerVideoStatus.textContent = "Dauert etwa 75 Sekunden. Das Transkript steht direkt darunter.";
}

function toggleRegisterNarration() {
  if (!registerNarrationSupported) {
    registerAudioStatus.textContent = "Sprachausgabe wird von diesem Browser leider nicht unterstuetzt. Untertitel und Transkript bleiben verfuegbar.";
    return;
  }

  registerNarrationEnabled = !registerNarrationEnabled;
  updateRegisterNarrationControl();

  if (!registerNarrationEnabled) {
    cancelRegisterNarration();
    registerAudioStatus.textContent = "Ton ist aus. Untertitel und Transkript bleiben sichtbar.";
    return;
  }

  registerAudioStatus.textContent = "Ton ist an. Beim Start oder Fortsetzen wird das aktuelle Kapitel vorgelesen.";
  if (registerIntroPlaying) {
    registerNarrationStepId = "";
    speakRegisterIntroStep(registerIntroStepForElapsed(registerIntroElapsedMs).step);
  }
}

function updateRegisterNarrationControl() {
  toggleRegisterNarrationButton.disabled = !registerNarrationSupported;
  toggleRegisterNarrationButton.setAttribute("aria-pressed", registerNarrationEnabled ? "true" : "false");
  toggleRegisterNarrationButton.textContent = registerNarrationSupported
    ? registerNarrationEnabled ? "Ton an" : "Ton aus"
    : "Ton nicht verfuegbar";

  if (!registerNarrationSupported) {
    registerAudioStatus.textContent = "Sprachausgabe wird von diesem Browser nicht unterstuetzt. Untertitel und Transkript sind weiterhin verfuegbar.";
  }
}

function speakRegisterIntroStep(step) {
  if (!registerNarrationSupported || !registerNarrationEnabled || !registerIntroPlaying) {
    return;
  }

  if (registerNarrationStepId === step.id) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${step.title}. ${step.speech || step.caption}`);
  utterance.lang = "de-CH";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voice = preferredRegisterNarrationVoice();
  if (voice) {
    utterance.voice = voice;
  }
  utterance.onstart = () => {
    registerAudioStatus.textContent = `Wird gesprochen: ${step.title}`;
  };
  utterance.onend = () => {
    if (registerIntroPlaying && registerNarrationStepId === step.id) {
      registerAudioStatus.textContent = "Naechstes Kapitel wird automatisch vorgelesen.";
    }
  };
  utterance.onerror = () => {
    registerAudioStatus.textContent = "Die Sprachausgabe konnte gerade nicht gestartet werden. Untertitel und Transkript bleiben sichtbar.";
  };
  registerNarrationStepId = step.id;
  window.speechSynthesis.speak(utterance);
}

function preferredRegisterNarrationVoice() {
  if (!registerNarrationSupported) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === "de-CH")
    || voices.find((voice) => voice.lang === "de-DE")
    || voices.find((voice) => voice.lang && voice.lang.startsWith("de"))
    || null;
}

function pauseRegisterNarration() {
  if (registerNarrationSupported && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
}

function cancelRegisterNarration() {
  if (registerNarrationSupported) {
    window.speechSynthesis.cancel();
  }
  registerNarrationStepId = "";
}

function registerIntroStepForElapsed(elapsedMs) {
  let cursor = 0;
  for (let index = 0; index < registerIntroSteps.length; index += 1) {
    const step = registerIntroSteps[index];
    cursor += step.durationMs;
    if (elapsedMs < cursor || index === registerIntroSteps.length - 1) {
      return { step, index };
    }
  }

  return { step: registerIntroSteps[0], index: 0 };
}

function registerOnboardingResult() {
  const morningDrying = document.querySelector("input[name='registerQuizMorningDrying']:checked")?.value || "";
  const lateDrying = document.querySelector("input[name='registerQuizLateDrying']:checked")?.value || "";
  const tumbler = document.querySelector("input[name='registerQuizTumbler']:checked")?.value || "";
  const answers = { morningDrying, lateDrying, tumbler };

  if (!registerOnboardingWatched) {
    return {
      ok: false,
      message: "Fast da: Bitte starte die Einfuehrung oder lies das Transkript und markiere es als gelesen.",
      answers
    };
  }

  if (!morningDrying || !lateDrying || !tumbler) {
    return {
      ok: false,
      message: "Kleiner letzter Schritt: Bitte beantworte noch alle drei Fragen.",
      answers
    };
  }

  if (morningDrying !== "same-day-21" || lateDrying !== "next-day-12" || tumbler !== "own-slot-free") {
    return {
      ok: false,
      message: "Noch ein kurzer Feinschliff: 07:00-Waschslot -> Trockenraum bis 21:00; 12:00/17:00-Waschslot -> maximal bis 12:00 am Folgetag; Tumbler nur zum eigenen Waschslot und ein Tumbler bleibt frei.",
      answers
    };
  }

  return { ok: true, answers };
}

function messageForError(error) {
  const messages = {
    missing_login_fields: "Bitte Name und Passwort eingeben.",
    invalid_login: "Name oder Passwort stimmt nicht.",
    user_inactive: "Dieses Konto ist deaktiviert.",
    missing_user_fields: "Bitte Name und Passwort eingeben.",
    invalid_user_name: "Der Name muss 2 bis 60 Zeichen lang sein.",
    invalid_display_name: "Der Anzeigename darf maximal 80 Zeichen lang sein.",
    invalid_apartment_label: "Partei/Wohnung darf maximal 40 Zeichen lang sein.",
    password_too_short: "Das Passwort braucht mindestens 6 Zeichen.",
    user_already_exists: "Dieser Name ist bereits vergeben.",
    onboarding_required: "Bitte zuerst das Intro anschauen und das Mini-Quiz ausfuellen.",
    onboarding_quiz_retry: "Das Mini-Quiz braucht noch eine kleine Korrektur."
  };

  return messages[error] || "Die Aktion konnte nicht ausgefuehrt werden.";
}
