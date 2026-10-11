loadData(startPage);

function startPage() {
  showCustomerNavbar('');

  // already logged in? go on
  if (getCurrentCustomer() !== null) {
    location.href = getNextPage();
    return;
  }

  // came here from a page that needs login? say so
  if (new URLSearchParams(location.search).get('next') !== null) {
    let alertBox = document.getElementById('alert');
    alertBox.className = 'alert alert-info';
    alertBox.textContent = 'Please log in to continue.';
  }

  document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    login();
  });
}

function login() {
  clearErrors();
  let alertBox = document.getElementById('alert');
  alertBox.className = 'alert d-none';

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
  } else if (user.role !== 'customer') {
    alertBox.className = 'alert alert-danger';
    alertBox.innerHTML = 'This is an admin account. Please use the <a href="admin-login.html">admin login</a>.';
  } else {
    setCurrentUser(user);
    location.href = getNextPage();
  }
}
