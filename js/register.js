loadData(startPage);

function startPage() {
  showCustomerNavbar('');

  document.getElementById('registerForm').addEventListener('submit', function (event) {
    event.preventDefault();
    register();
  });
}

function register() {
  // validateNewUser() and createUser() are in data.js (the "add admin" page uses them too)
  if (!validateNewUser()) {
    return;
  }

  let user = createUser('customer');
  if (!saveData()) {
    reloadData();
    showMessage('Could not create the account: the browser storage is full.', 'danger');
    return;
  }

  setCurrentUser(user); // log the new customer in
  location.href = 'index.html';
}
