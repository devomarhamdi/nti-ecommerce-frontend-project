loadData(startPage);

function startPage() {
  // already logged in as admin? go to the dashboard
  let user = getCurrentUser();
  if (user !== null && user.role === 'admin') {
    location.href = 'admin-dashboard.html';
    return;
  }

  document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault(); // stop the page from reloading
    login();
  });
}

function login() {
  clearErrors();
  document.getElementById('alert').classList.add('d-none');

  let email = document.getElementById('email').value.trim();
  let password = document.getElementById('password').value;
  let valid = true;

  if (email === '') {
    showError('email', 'Email is required');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('email', 'Enter a valid email, for example name@example.com');
    valid = false;
  }
  if (password === '') {
    showError('password', 'Password is required');
    valid = false;
  }
  if (!valid) {
    return;
  }

  // look for a user with this email
  let user = null;
  for (let i = 0; i < data.users.length; i++) {
    if (data.users[i].email.toLowerCase() === email.toLowerCase()) {
      user = data.users[i];
    }
  }

  if (user === null) {
    showError('email', 'No account was found with this email');
  } else if (user.password !== password) {
    showError('password', 'Incorrect password, please try again');
  } else if (user.role !== 'admin') {
    let alertBox = document.getElementById('alert');
    alertBox.textContent = 'This account is not an admin. Only admins can log in here.';
    alertBox.classList.remove('d-none');
  } else {
    setCurrentUser(user);
    location.href = 'admin-dashboard.html';
  }
}
