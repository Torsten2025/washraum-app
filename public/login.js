const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');
const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#registerMessage');
const invitationSummary = document.querySelector('#invitationSummary');
const showLogin = document.querySelector('#showLogin');
const showRegister = document.querySelector('#showRegister');
const showDeviceLogin = document.querySelector('#showDeviceLogin');
const deviceLoginForm = document.querySelector('#deviceLoginForm');
const deviceLoginMessage = document.querySelector('#deviceLoginMessage');
const recoveryForm = document.querySelector('#recoveryForm');
const recoveryMessage = document.querySelector('#recoveryMessage');
const accountRecoveryForm = document.querySelector('#accountRecoveryForm');
const accountRecoveryMessage = document.querySelector('#accountRecoveryMessage');
const showAccountRecovery = document.querySelector('#showAccountRecovery');
const cancelAccountRecovery = document.querySelector('#cancelAccountRecovery');
const appUpdateNotice = document.querySelector('#appUpdateNotice');
const updateAppButton = document.querySelector('#updateAppButton');
const loginMaintenanceNotice = document.querySelector('#loginMaintenanceNotice');
const loadedAppRelease = document.querySelector('meta[name="waschzeit-release"]')?.content || '';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
const showRecovery = document.querySelector('#showRecovery');
const cancelRecovery = document.querySelector('#cancelRecovery');

async function checkAppStatus() {
  try {
    const response = await fetch('/api/version', { cache: 'no-store' });
    if (!response.ok) return;
    const status = await response.json();
    appUpdateNotice.hidden = !status.release || status.release === loadedAppRelease;
    loginMaintenanceNotice.hidden = !status.maintenance?.active;
  } catch {
    // Anmeldung bleibt auch bei einer kurzen Status-Unterbrechung nutzbar.
  }
}

async function updateApp() {
  updateAppButton.disabled = true;
  updateAppButton.textContent = 'Aktualisiere...';
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
      if (registration?.waiting) {
        const changed = new Promise((resolve) => {
          const timeout = window.setTimeout(resolve, 2000);
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        await changed;
      }
    }
  } finally {
    window.location.reload();
  }
}

updateAppButton.addEventListener('click', updateApp);
window.setInterval(checkAppStatus, 2 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkAppStatus();
});
checkAppStatus();

async function submitJson(formElement, path, body, messageElement) {
  const submitButton = formElement.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      messageElement.textContent = data.error || 'Die Anfrage konnte nicht abgeschlossen werden.';
      return null;
    }
    return data;
  } catch {
    messageElement.textContent = 'Keine Verbindung zur App. Bitte pruefe deine Internetverbindung und versuche es erneut.';
    return null;
  } finally {
    submitButton.disabled = false;
  }
}

function setMode(mode) {
  const isRegister = mode === 'register';
  const isRecovery = mode === 'recovery';
  const isAccountRecovery = mode === 'account-recovery';
  const isDeviceLogin = mode === 'device';
  form.hidden = isRegister || isRecovery || isAccountRecovery || isDeviceLogin;
  registerForm.hidden = !isRegister;
  recoveryForm.hidden = !isRecovery;
  accountRecoveryForm.hidden = !isAccountRecovery;
  deviceLoginForm.hidden = !isDeviceLogin;
  showLogin.classList.toggle('active', !isRegister && !isRecovery && !isAccountRecovery && !isDeviceLogin);
  showRegister.classList.toggle('active', isRegister);
  showDeviceLogin.classList.toggle('active', isDeviceLogin);
  message.textContent = '';
  registerMessage.textContent = '';
  deviceLoginMessage.textContent = '';
  recoveryMessage.textContent = '';
  accountRecoveryMessage.textContent = '';
}

showLogin.addEventListener('click', () => setMode('login'));
showRegister.addEventListener('click', () => setMode('register'));
showDeviceLogin.addEventListener('click', () => setMode('device'));
showRecovery.addEventListener('click', () => setMode('recovery'));
showAccountRecovery.addEventListener('click', () => setMode('account-recovery'));
cancelRecovery.addEventListener('click', () => setMode('login'));
cancelAccountRecovery.addEventListener('click', () => setMode('login'));

const urlParameters = new URLSearchParams(window.location.search);
const verification = urlParameters.get('verification');
const loggedOut = urlParameters.get('loggedOut');
const sessionExpired = urlParameters.get('sessionExpired');
const invitationToken = urlParameters.get('invite');
const devicePairingToken = urlParameters.get('device');
if (verification === 'ok') {
  message.textContent = 'E-Mail-Adresse best\u00e4tigt. Du kannst dich jetzt anmelden.';
} else if (verification === 'invalid') {
  message.textContent = 'Der Best\u00e4tigungslink ist ung\u00fcltig oder abgelaufen.';
} else if (loggedOut === '1') {
  message.textContent = 'Du bist abgemeldet.';
} else if (sessionExpired === '1') {
  message.textContent = 'Deine Sitzung wurde wegen Inaktivit\u00e4t automatisch beendet. Bitte melde dich erneut an.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';

  const formData = new FormData(form);
  const data = await submitJson(form, '/api/login', {
    email: formData.get('email'),
    password: formData.get('password')
  }, message);
  if (!data) return;

  window.location.href = '/index.html';
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerMessage.textContent = '';

  const formData = new FormData(registerForm);
  if (formData.get('password') !== formData.get('passwordConfirmation')) {
    registerMessage.textContent = 'Die beiden Passwoerter stimmen nicht ueberein.';
    return;
  }
  const data = await submitJson(registerForm, '/api/invitations/accept', {
    token: formData.get('token'),
    password: formData.get('password'),
    notifyReleases: formData.get('notifyReleases') === 'on'
  }, registerMessage);
  if (!data) return;

  window.location.href = '/index.html?welcome=1';
});

async function loadInvitation(token) {
  setMode('register');
  const submitButton = registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  registerForm.elements.token.value = token || '';
  if (!token) return;
  try {
    const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      invitationSummary.innerHTML = `<strong>Einladung nicht verf&uuml;gbar</strong><span>${escapeHtml(data.error || 'Bitte fordere eine neue Einladung an.')}</span>`;
      return;
    }
    const invitation = data.invitation;
    invitationSummary.innerHTML = `
      <strong>${escapeHtml(invitation.displayName)}</strong>
      <span>${escapeHtml(invitation.apartmentLabel)} &middot; ${escapeHtml(invitation.houseName)}</span>
      <span>${escapeHtml(invitation.email)}</span>
    `;
    submitButton.disabled = false;
  } catch {
    invitationSummary.innerHTML = '<strong>Einladung konnte nicht geladen werden</strong><span>Bitte versuche es erneut.</span>';
  }
}

if (invitationToken) {
  loadInvitation(invitationToken);
} else if (devicePairingToken) {
  setMode('device');
  deviceLoginForm.elements.deviceCode.value = devicePairingToken;
  deviceLoginMessage.textContent = 'QR-Code erkannt. Bitte bestaetige jetzt die Verbindung zum Wohnungskonto.';
}

deviceLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  deviceLoginMessage.textContent = '';
  const formData = new FormData(deviceLoginForm);
  const data = await submitJson(deviceLoginForm, '/api/device-login', {
    deviceCode: formData.get('deviceCode')
  }, deviceLoginMessage);
  if (!data) return;
  window.location.href = '/index.html';
});

recoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  recoveryMessage.textContent = '';
  const formData = new FormData(recoveryForm);
  const data = await submitJson(recoveryForm, '/api/password-reset/request', {
    email: formData.get('email')
  }, recoveryMessage);
  if (data) {
    recoveryMessage.textContent = data.message || 'Die Anfrage wurde verarbeitet.';
  }
});

accountRecoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountRecoveryMessage.textContent = '';
  const formData = new FormData(accountRecoveryForm);
  if (formData.get('newPassword') !== formData.get('newPasswordConfirmation')) {
    accountRecoveryMessage.textContent = 'Die beiden neuen Passwoerter stimmen nicht ueberein.';
    return;
  }
  const data = await submitJson(accountRecoveryForm, '/api/account-recovery/confirm', {
    code: formData.get('code'),
    email: formData.get('email'),
    newPassword: formData.get('newPassword')
  }, accountRecoveryMessage);
  if (data) {
    accountRecoveryForm.reset();
    accountRecoveryMessage.textContent = data.message || 'Das Konto wurde wiederhergestellt.';
  }
});
