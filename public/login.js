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

  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userName,
      password,
      displayName: registerDisplayNameInput.value.trim(),
      apartmentLabel: registerApartmentLabelInput.value.trim()
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

function setAuthMode(mode) {
  const registerMode = mode === "register";
  loginForm.classList.toggle("hidden", registerMode);
  registerForm.classList.toggle("hidden", !registerMode);
  showLoginButton.classList.toggle("is-active", !registerMode);
  showRegisterButton.classList.toggle("is-active", registerMode);
  loginMessage.textContent = "";
  registerMessage.textContent = "";
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
    user_already_exists: "Dieser Name ist bereits vergeben."
  };

  return messages[error] || "Die Aktion konnte nicht ausgefuehrt werden.";
}
