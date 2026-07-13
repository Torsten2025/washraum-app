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
const registerVideoStage = document.getElementById("registerVideoStage");
const registerVideoProgress = document.getElementById("registerVideoProgress");
const registerVideoStatus = document.getElementById("registerVideoStatus");
const registerOnboardingMessage = document.getElementById("registerOnboardingMessage");

let registerOnboardingWatched = false;
let registerVideoTimer = null;

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
  if (registerVideoTimer) {
    window.clearTimeout(registerVideoTimer);
  }

  registerOnboardingWatched = false;
  registerVideoStage.classList.remove("is-complete");
  registerVideoStage.classList.remove("is-playing");
  registerVideoProgress.style.animation = "none";
  registerVideoProgress.offsetHeight;
  registerVideoProgress.style.animation = "";
  registerVideoStage.classList.add("is-playing");
  playRegisterOnboardingVideoButton.disabled = true;
  playRegisterOnboardingVideoButton.textContent = "Intro laeuft";
  registerVideoStatus.textContent = "Slot waehlen, Trocknung pruefen, sauber freigeben.";
  registerOnboardingMessage.textContent = "";

  registerVideoTimer = window.setTimeout(() => {
    registerOnboardingWatched = true;
    registerVideoStage.classList.remove("is-playing");
    registerVideoStage.classList.add("is-complete");
    playRegisterOnboardingVideoButton.disabled = false;
    playRegisterOnboardingVideoButton.textContent = "Intro erneut ansehen";
    registerVideoStatus.textContent = "Intro angesehen. Jetzt fehlen nur noch die drei Fragen.";
  }, 8200);
}

function registerOnboardingResult() {
  const morningDrying = document.querySelector("input[name='registerQuizMorningDrying']:checked")?.value || "";
  const lateDrying = document.querySelector("input[name='registerQuizLateDrying']:checked")?.value || "";
  const tumbler = document.querySelector("input[name='registerQuizTumbler']:checked")?.value || "";
  const answers = { morningDrying, lateDrying, tumbler };

  if (!registerOnboardingWatched) {
    return {
      ok: false,
      message: "Fast da: Bitte starte kurz das Intro, dann ist der Account bereit.",
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
