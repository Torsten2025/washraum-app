const resetForm = document.querySelector('#resetForm');
const resetMessage = document.querySelector('#resetMessage');
const token = new URLSearchParams(window.location.search).get('token') || '';

if (!token) {
  resetMessage.textContent = 'Der Link ist unvollst\u00e4ndig.';
  resetForm.querySelector('button').disabled = true;
}

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(resetForm);
  const password = String(formData.get('password') || '');
  if (password !== formData.get('confirmation')) {
    resetMessage.textContent = 'Die Passw\u00f6rter stimmen nicht \u00fcberein.';
    return;
  }
  const response = await fetch('/api/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword: password })
  });
  const data = await response.json().catch(() => ({}));
  resetMessage.textContent = data.message || data.error || 'Passwort konnte nicht ge\u00e4ndert werden.';
  if (response.ok) {
    resetForm.reset();
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
  }
});
