const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');
const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#registerMessage');
const showLogin = document.querySelector('#showLogin');
const showRegister = document.querySelector('#showRegister');
const showDeviceLogin = document.querySelector('#showDeviceLogin');
const deviceLoginForm = document.querySelector('#deviceLoginForm');
const deviceLoginMessage = document.querySelector('#deviceLoginMessage');
const recoveryForm = document.querySelector('#recoveryForm');
const recoveryMessage = document.querySelector('#recoveryMessage');
const appUpdateNotice = document.querySelector('#appUpdateNotice');
const updateAppButton = document.querySelector('#updateAppButton');
const loginMaintenanceNotice = document.querySelector('#loginMaintenanceNotice');
const loadedAppRelease = document.querySelector('meta[name="waschzeit-release"]')?.content || '';

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
  const isDeviceLogin = mode === 'device';
  form.hidden = isRegister || isRecovery || isDeviceLogin;
  registerForm.hidden = !isRegister;
  recoveryForm.hidden = !isRecovery;
  deviceLoginForm.hidden = !isDeviceLogin;
  showLogin.classList.toggle('active', !isRegister && !isRecovery && !isDeviceLogin);
  showRegister.classList.toggle('active', isRegister);
  showDeviceLogin.classList.toggle('active', isDeviceLogin);
  message.textContent = '';
  registerMessage.textContent = '';
  deviceLoginMessage.textContent = '';
}

showLogin.addEventListener('click', () => setMode('login'));
showRegister.addEventListener('click', () => setMode('register'));
showDeviceLogin.addEventListener('click', () => setMode('device'));
showRecovery.addEventListener('click', () => setMode('recovery'));
cancelRecovery.addEventListener('click', () => setMode('login'));

const verification = new URLSearchParams(window.location.search).get('verification');
const loggedOut = new URLSearchParams(window.location.search).get('loggedOut');
const sessionExpired = new URLSearchParams(window.location.search).get('sessionExpired');
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
    username: formData.get('username'),
    password: formData.get('password')
  }, message);
  if (!data) return;

  window.location.href = '/index.html';
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerMessage.textContent = '';

  const formData = new FormData(registerForm);
  const data = await submitJson(registerForm, '/api/register', {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    apartmentCode: formData.get('apartmentCode'),
    notifyReleases: formData.get('notifyReleases') === 'on'
  }, registerMessage);
  if (!data) return;

  window.location.href = '/index.html?welcome=1';
});

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
