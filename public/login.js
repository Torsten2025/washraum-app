const loginForm = document.getElementById("loginForm");
const userNameInput = document.getElementById("userName");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

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
    loginMessage.textContent = "Name oder Passwort stimmt nicht.";
    return;
  }

  sessionStorage.setItem("washraumAuthToken", data.token);
  sessionStorage.setItem("washraumUserName", data.user.userName);
  sessionStorage.setItem("washraumUserRole", data.user.role);
  window.location.href = "/index.html";
});
