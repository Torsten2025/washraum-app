const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');
const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#registerMessage');
const showLogin = document.querySelector('#showLogin');
const showRegister = document.querySelector('#showRegister');

function setMode(mode) {
  const isRegister = mode === 'register';
  form.hidden = isRegister;
  registerForm.hidden = !isRegister;
  showLogin.classList.toggle('active', !isRegister);
  showRegister.classList.toggle('active', isRegister);
  message.textContent = '';
  registerMessage.textContent = '';
}

showLogin.addEventListener('click', () => setMode('login'));
showRegister.addEventListener('click', () => setMode('register'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';

  const formData = new FormData(form);
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: formData.get('username'),
      password: formData.get('password')
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    message.textContent = data.error || 'Login fehlgeschlagen';
    return;
  }

  window.location.href = '/index.html';
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerMessage.textContent = '';

  const formData = new FormData(registerForm);
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      houseCode: formData.get('houseCode'),
      notifyReleases: formData.get('notifyReleases') === 'on'
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    registerMessage.textContent = data.error || 'Registrierung fehlgeschlagen';
    return;
  }

  window.location.href = '/index.html?welcome=1';
});
