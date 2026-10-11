// ===================================================================
// Shared code for ALL pages (admin and customer).
//
// How the data works:
//   1. The first time the site opens, we read data/data.json with XMLHttpRequest.
//   2. We copy it into localStorage, because a browser cannot write to a file.
//   3. After that, every page reads and saves from localStorage.
//
// All the data lives in one object called "data":
//   data.users, data.categories, data.products, data.orders, data.reviews
// ===================================================================

let data = { users: [], categories: [], products: [], orders: [], reviews: [] };

// A customer can return a confirmed order within this many days
const RETURN_DAYS = 14;

// ---------- loading and saving ----------

// Every page starts with:  loadData(startPage);
// "callback" is the function to run once the data is ready.
function loadData(callback) {
  let saved = localStorage.getItem('shopData');

  // Already in localStorage? Use it.
  if (saved !== null) {
    data = JSON.parse(saved);
    callback();
    return;
  }

  // First visit: ask for the JSON file
  let request = new XMLHttpRequest();
  request.open('GET', 'data/data.json');

  request.addEventListener('load', function () {
    if (request.status === 200) {
      data = JSON.parse(request.responseText);
      saveData();
      callback();
    } else {
      showLoadError();
    }
  });

  request.addEventListener('error', showLoadError);

  request.send();
}

// Saves the "data" object in localStorage. Returns false if the storage is full.
function saveData() {
  try {
    localStorage.setItem('shopData', JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

// Throw away unsaved changes (used when saveData fails)
function reloadData() {
  data = JSON.parse(localStorage.getItem('shopData'));
}

function showLoadError() {
  let box = document.createElement('div');
  box.className = 'alert alert-danger m-4';
  box.innerHTML =
    '<strong>Could not load data/data.json.</strong> ' +
    'The browser blocks this when you open the page by double-clicking the file. ' +
    'Open the project with a local server instead, for example the VS Code "Live Server" extension.';
  document.body.prepend(box);
}

// ---------- small helpers ----------

// Finds the item with this id inside a list. Returns null if it is not there.
function findById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list[i];
    }
  }
  return null;
}

// Removes the item with this id from a list
function removeById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list.splice(i, 1);
      return;
    }
  }
}

// The next free id for a list (highest id + 1)
function getNextId(list) {
  let max = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id > max) {
      max = list[i].id;
    }
  }
  return max + 1;
}

// Makes text safe to put inside innerHTML (so "<b>" shows as text, not as HTML)
function safe(text) {
  let div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/"/g, '&quot;');
}

function money(number) {
  return '$' + Number(number).toFixed(2);
}

function formatDate(isoText) {
  return new Date(isoText).toLocaleString();
}

// A small message in the top-right corner that disappears after 3.5 seconds
function showMessage(text, type) {
  let box = document.createElement('div');
  box.className = 'alert alert-' + (type || 'success') + ' position-fixed top-0 end-0 m-3 shadow';
  box.style.zIndex = 3000;
  box.textContent = text;
  document.body.appendChild(box);
  setTimeout(function () {
    box.remove();
  }, 3500);
}

// ---------- form errors ----------
// showError('name', 'Name is required') puts a red message under the input with id="name"

function showError(inputId, message) {
  let input = document.getElementById(inputId);
  input.classList.add('is-invalid');

  let feedback = input.parentElement.querySelector('.invalid-feedback');
  if (feedback === null) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    input.parentElement.appendChild(feedback);
  }
  feedback.textContent = message;
}

function clearErrors() {
  let inputs = document.querySelectorAll('.is-invalid');
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].classList.remove('is-invalid');
  }
}

// ---------- the logged-in user ----------

function getCurrentUser() {
  let id = Number(localStorage.getItem('currentUserId'));
  return findById(data.users, id); // null if nobody is logged in
}

function setCurrentUser(user) {
  localStorage.setItem('currentUserId', user.id);
}

function logout() {
  localStorage.removeItem('currentUserId');
}

// Put at the top of every admin page: sends you to the admin login if you are not an admin
function checkAdmin() {
  let user = getCurrentUser();
  if (user === null || user.role !== 'admin') {
    location.href = 'admin-login.html';
    return null;
  }
  return user;
}

// ---------- register / add admin: shared validation ----------
// The form must have inputs with the ids: name, email, password, confirm
// Returns true when everything is valid.

function validateNewUser() {
  clearErrors();
  let name = document.getElementById('name').value.trim();
  let email = document.getElementById('email').value.trim();
  let password = document.getElementById('password').value;
  let confirmPassword = document.getElementById('confirm').value;
  let valid = true;

  if (name === '') {
    showError('name', 'Name is required');
    valid = false;
  } else if (name.length < 2) {
    showError('name', 'Name must be at least 2 characters');
    valid = false;
  } else if (name.length > 50) {
    showError('name', 'Name cannot be more than 50 characters');
    valid = false;
  }

  if (email === '') {
    showError('email', 'Email is required');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('email', 'Enter a valid email, for example name@example.com');
    valid = false;
  } else if (emailExists(email)) {
    showError('email', 'An account with this email already exists');
    valid = false;
  }

  if (password === '') {
    showError('password', 'Password is required');
    valid = false;
  } else if (password.length < 8) {
    showError('password', 'Password must be at least 8 characters');
    valid = false;
  } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    showError('password', 'Password must contain at least one letter and one number');
    valid = false;
  } else if (confirmPassword === '') {
    showError('confirm', 'Please confirm your password');
    valid = false;
  } else if (confirmPassword !== password) {
    showError('confirm', 'Passwords do not match');
    valid = false;
  }

  return valid;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailExists(email) {
  for (let i = 0; i < data.users.length; i++) {
    if (data.users[i].email.toLowerCase() === email.toLowerCase()) {
      return true;
    }
  }
  return false;
}

// Adds a new user to data.users (the form must be valid first). Returns the new user.
function createUser(role) {
  let user = {
    id: getNextId(data.users),
    name: document.getElementById('name').value.trim().replace(/\s+/g, ' '),
    email: document.getElementById('email').value.trim().toLowerCase(),
    password: document.getElementById('password').value,
    role: role,
    cart: [],
    wishlist: [],
  };
  data.users.push(user);
  return user;
}

// ---------- order labels (used by admin and customer pages) ----------

function statusBadge(status) {
  let color = 'warning';
  if (status === 'confirmed') {
    color = 'success';
  } else if (status === 'rejected') {
    color = 'danger';
  }
  return '<span class="badge text-bg-' + color + '">' + status + '</span>';
}

function returnBadge(order) {
  if (order.returnStatus === 'requested') {
    return '<span class="badge text-bg-info">Return requested</span>';
  }
  if (order.returnStatus === 'approved') {
    return '<span class="badge text-bg-secondary">Returned</span>';
  }
  if (order.returnStatus === 'rejected') {
    return '<span class="badge text-bg-dark">Return rejected</span>';
  }
  return '';
}

function paymentText(order) {
  if (order.payment.method !== 'paypal') {
    return 'Cash on delivery';
  }
  if (order.payment.status === 'refund_due') {
    return 'PayPal - refund due';
  }
  return 'PayPal - paid';
}

// ---------- navbars ----------
// Each page has an empty <nav id="navbar" ...></nav>. These functions fill it.

function showAdminNavbar(active) {
  let user = getCurrentUser();

  // the number on "Orders": pending orders + return requests
  let attention = 0;
  for (let i = 0; i < data.orders.length; i++) {
    if (data.orders[i].status === 'pending' || data.orders[i].returnStatus === 'requested') {
      attention++;
    }
  }

  // [key, text, page]
  let links = [
    ['dashboard', 'Dashboard', 'admin-dashboard.html'],
    ['products', 'Products', 'admin-products.html'],
    ['categories', 'Categories', 'admin-categories.html'],
    ['orders', 'Orders', 'admin-orders.html'],
    ['admins', 'Admins', 'admin-admins.html'],
  ];

  let linksHtml = '';
  for (let i = 0; i < links.length; i++) {
    let activeClass = links[i][0] === active ? ' active' : '';
    let badge = '';
    if (links[i][0] === 'orders' && attention > 0) {
      badge = ' <span class="badge text-bg-warning">' + attention + '</span>';
    }
    linksHtml += '<a class="nav-link' + activeClass + '" href="' + links[i][2] + '">' + links[i][1] + badge + '</a>';
  }

  document.getElementById('navbar').innerHTML =
    '<a class="navbar-brand" href="admin-dashboard.html">Shop Admin</a>' +
    '<div class="navbar-nav me-auto flex-wrap">' + linksHtml + '</div>' +
    '<a class="btn btn-outline-light btn-sm me-2" href="index.html">View store</a>' +
    '<span class="navbar-text me-3">' + safe(user.name) + '</span>' +
    '<button class="btn btn-outline-light btn-sm" id="logoutBtn">Logout</button>';

  document.getElementById('logoutBtn').addEventListener('click', function () {
    logout();
    location.href = 'admin-login.html';
  });
}

let currentNav = ''; // remembers which link is active, so we can redraw the navbar

function showCustomerNavbar(active) {
  if (active !== undefined) {
    currentNav = active;
  }
  let user = getCurrentUser();

  let wishCount = 0;
  let cartCount = 0;
  if (user !== null && user.role === 'customer') {
    wishCount = user.wishlist.length;
    for (let i = 0; i < user.cart.length; i++) {
      cartCount += user.cart[i].qty;
    }
  }

  // [key, text, page, number shown in the badge, badge color]
  let links = [
    ['home', 'Products', 'index.html', 0, ''],
    ['wishlist', 'Wishlist', 'wishlist.html', wishCount, 'danger'],
    ['cart', 'Cart', 'cart.html', cartCount, 'primary'],
    ['orders', 'My orders', 'my-orders.html', 0, ''],
  ];

  let linksHtml = '';
  for (let i = 0; i < links.length; i++) {
    let activeClass = links[i][0] === currentNav ? ' active' : '';
    let badge = '';
    if (links[i][3] > 0) {
      badge = ' <span class="badge text-bg-' + links[i][4] + '">' + links[i][3] + '</span>';
    }
    linksHtml += '<a class="nav-link' + activeClass + '" href="' + links[i][2] + '">' + links[i][1] + badge + '</a>';
  }

  // right side: logged in or not?
  let account = '';
  if (user !== null) {
    account = '<span class="navbar-text me-3">' + safe(user.name) + '</span>';
    if (user.role === 'admin') {
      account += '<a class="btn btn-outline-light btn-sm me-2" href="admin-dashboard.html">Admin panel</a>';
    }
    account += '<button class="btn btn-outline-light btn-sm" id="logoutBtn">Logout</button>';
  } else {
    account =
      '<a class="btn btn-outline-light btn-sm me-2" href="login.html">Login</a>' +
      '<a class="btn btn-primary btn-sm" href="register.html">Register</a>';
  }

  document.getElementById('navbar').innerHTML =
    '<a class="navbar-brand" href="index.html">Shop</a>' +
    '<div class="navbar-nav me-auto flex-wrap">' + linksHtml + '</div>' +
    account;

  let logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn !== null) {
    logoutBtn.addEventListener('click', function () {
      logout();
      location.href = 'index.html';
    });
  }
}
