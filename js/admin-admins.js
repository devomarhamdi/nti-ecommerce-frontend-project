let adminModal;
let me; // the admin who is logged in

loadData(startPage);

function startPage() {
  me = checkAdmin();
  if (me === null) {
    return;
  }
  showAdminNavbar('admins');
  adminModal = new bootstrap.Modal(document.getElementById('adminModal'));

  document.getElementById('addBtn').addEventListener('click', openForm);
  document.getElementById('saveBtn').addEventListener('click', saveAdmin);

  showAdmins();
}

function showAdmins() {
  let html = '';

  for (let i = 0; i < data.users.length; i++) {
    let user = data.users[i];
    if (user.role !== 'admin') {
      continue;
    }
    let you = user.id === me.id ? ' <span class="badge text-bg-secondary">You</span>' : '';
    html += '<tr><td>' + user.id + '</td><td>' + safe(user.name) + you + '</td><td>' + safe(user.email) + '</td></tr>';
  }

  document.getElementById('table').innerHTML = html;
}

function openForm() {
  document.getElementById('name').value = '';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  document.getElementById('confirm').value = '';
  clearErrors();
  adminModal.show();
}

function saveAdmin() {
  // validateNewUser() and createUser() are in data.js (the register page uses them too)
  if (!validateNewUser()) {
    return;
  }

  createUser('admin');
  if (!saveData()) {
    reloadData();
    showMessage('Could not save: the browser storage is full.', 'danger');
    return;
  }

  adminModal.hide();
  showMessage('New admin added.');
  showAdmins();
}
