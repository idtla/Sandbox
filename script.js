document.getElementById('registerForm').addEventListener('submit', function (e) {
  const pwd = document.getElementById('password').value;
  const confirm = document.getElementById('confirmPassword').value;
  if (pwd !== confirm) {
    e.preventDefault();
    alert('Las contraseñas no coinciden.');
  }
});
