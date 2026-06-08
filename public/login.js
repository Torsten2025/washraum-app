const loginForm = document.getElementById("loginForm");
const userNameInput = document.getElementById("userName");
const userRoleInput = document.getElementById("userRole");

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const userName = userNameInput.value.trim();
  const role = userRoleInput.value;

  if (!userName) {
    userNameInput.focus();
    return;
  }

  sessionStorage.setItem("washraumUserName", userName);
  sessionStorage.setItem("washraumUserRole", role);
  window.location.href = "/index.html";
});
