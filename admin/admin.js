document.getElementById('request').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  await fetch('/api/admin/login/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  alert('OTP solicitado (mock)');
});
