let editingId = null; // null means we are adding a new category
let categoryModal;

loadData(startPage);

function startPage() {
  if (checkAdmin() === null) {
    return;
  }
  showAdminNavbar('categories');
  categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));

  document.getElementById('addBtn').addEventListener('click', openAddForm);
  document.getElementById('saveBtn').addEventListener('click', saveCategory);

  // The Edit / Delete buttons are created by JavaScript, so we listen on the whole table
  // and check which button was clicked.
  document.getElementById('table').addEventListener('click', function (event) {
    let id = Number(event.target.dataset.id);
    if (event.target.classList.contains('edit-btn')) {
      editCategory(id);
    } else if (event.target.classList.contains('delete-btn')) {
      deleteCategory(id);
    }
  });

  showCategories();
}

function showCategories() {
  let html = '';

  for (let i = 0; i < data.categories.length; i++) {
    let c = data.categories[i];

    // count the products in this category
    let count = 0;
    for (let j = 0; j < data.products.length; j++) {
      if (data.products[j].categoryId === c.id) {
        count++;
      }
    }

    html +=
      '<tr>' +
      '<td>' + c.id + '</td>' +
      '<td>' + safe(c.name) + '</td>' +
      '<td class="text-muted">' + (safe(c.description) || '-') + '</td>' +
      '<td class="text-center">' + count + '</td>' +
      '<td class="text-end">' +
      '<button class="btn btn-sm btn-outline-primary edit-btn" data-id="' + c.id + '">Edit</button> ' +
      '<button class="btn btn-sm btn-outline-danger delete-btn" data-id="' + c.id + '">Delete</button>' +
      '</td></tr>';
  }

  if (html === '') {
    html = '<tr><td colspan="5" class="text-center text-muted py-4">No categories yet. Add your first one.</td></tr>';
  }
  document.getElementById('table').innerHTML = html;
}

function openAddForm() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add category';
  document.getElementById('name').value = '';
  document.getElementById('description').value = '';
  clearErrors();
  categoryModal.show();
}

function editCategory(id) {
  let category = findById(data.categories, id);

  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit category';
  document.getElementById('name').value = category.name;
  document.getElementById('description').value = category.description;
  clearErrors();
  categoryModal.show();
}

function saveCategory() {
  clearErrors();
  let name = document.getElementById('name').value.trim().replace(/\s+/g, ' ');
  let description = document.getElementById('description').value.trim();
  let valid = true;

  if (name === '') {
    showError('name', 'Category name is required');
    valid = false;
  } else if (name.length < 3) {
    showError('name', 'Category name must be at least 3 characters');
    valid = false;
  } else if (name.length > 50) {
    showError('name', 'Category name cannot be more than 50 characters');
    valid = false;
  } else {
    // the name must be unique
    for (let i = 0; i < data.categories.length; i++) {
      let other = data.categories[i];
      if (other.name.toLowerCase() === name.toLowerCase() && other.id !== editingId) {
        showError('name', 'A category with this name already exists');
        valid = false;
      }
    }
  }

  if (description.length > 200) {
    showError('description', 'Description cannot be more than 200 characters');
    valid = false;
  }

  if (!valid) {
    return;
  }

  if (editingId === null) {
    data.categories.push({ id: getNextId(data.categories), name: name, description: description });
  } else {
    let category = findById(data.categories, editingId);
    category.name = name;
    category.description = description;
  }

  saveData();
  categoryModal.hide();
  showMessage(editingId === null ? 'Category added.' : 'Category updated.');
  showCategories();
}

function deleteCategory(id) {
  // can't delete a category that still has products
  for (let i = 0; i < data.products.length; i++) {
    if (data.products[i].categoryId === id) {
      showMessage('This category still has products. Delete or move them first.', 'danger');
      return;
    }
  }

  if (confirm('Are you sure you want to delete this category?')) {
    removeById(data.categories, id);
    saveData();
    showMessage('Category deleted.');
    showCategories();
  }
}
