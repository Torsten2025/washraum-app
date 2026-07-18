const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');
const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#registerMessage');
const showLogin = document.querySelector('#showLogin');
const showRegister = document.querySelector('#showRegister');
const recoveryForm = document.querySelector('#recoveryForm');
const recoveryMessage = document.querySelector('#recoveryMessage');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
const showRecovery = document.querySelector('#showRecovery');
const cancelRecovery = document.querySelector('#cancelRecovery');

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
  form.hidden = isRegister || isRecovery;
  registerForm.hidden = !isRegister;
  recoveryForm.hidden = !isRecovery;
  showLogin.classList.toggle('active', !isRegister && !isRecovery);
  showRegister.classList.toggle('active', isRegister);
  message.textContent = '';
  registerMessage.textContent = '';
}

showLogin.addEventListener('click', () => setMode('login'));
showRegister.addEventListener('click', () => setMode('register'));
showRecovery.addEventListener('click', () => setMode('recovery'));
cancelRecovery.addEventListener('click', () => setMode('login'));

const verification = new URLSearchParams(window.location.search).get('verification');
const loggedOut = new URLSearchParams(window.location.search).get('loggedOut');
if (verification === 'ok') {
  message.textContent = 'E-Mail-Adresse best\u00e4tigt. Du kannst dich jetzt anmelden.';
} else if (verification === 'invalid') {
  message.textContent = 'Der Best\u00e4tigungslink ist ung\u00fcltig oder abgelaufen.';
} else if (loggedOut === '1') {
  message.textContent = 'Du bist abgemeldet.';
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
    houseCode: formData.get('houseCode'),
    notifyReleases: formData.get('notifyReleases') === 'on'
  }, registerMessage);
  if (!data) return;

  window.location.href = '/index.html?welcome=1';
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
