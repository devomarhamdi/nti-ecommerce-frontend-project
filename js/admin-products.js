let editingId = null; // null means we are adding a new product
let uploadedImage = ''; // the picture the admin uploaded (as text)
let productModal;

loadData(startPage);

function startPage() {
  if (checkAdmin() === null) {
    return;
  }
  showAdminNavbar('products');
  productModal = new bootstrap.Modal(document.getElementById('productModal'));

  fillCategories();

  document.getElementById('addBtn').addEventListener('click', openAddForm);
  document.getElementById('saveBtn').addEventListener('click', saveProduct);
  document.getElementById('search').addEventListener('input', showProducts);
  document.getElementById('categoryFilter').addEventListener('change', showProducts);
  document.getElementById('imageFile').addEventListener('change', imageSelected);
  document.getElementById('imageUrl').addEventListener('input', imageUrlChanged);

  // The Edit / Delete buttons are created by JavaScript, so we listen on the whole table
  document.getElementById('table').addEventListener('click', function (event) {
    let id = Number(event.target.dataset.id);
    if (event.target.classList.contains('edit-btn')) {
      editProduct(id);
    } else if (event.target.classList.contains('delete-btn')) {
      deleteProduct(id);
    }
  });

  showProducts();
}

// ---------- show the list ----------

// fill the category dropdowns (the filter above the table and the one in the form)
function fillCategories() {
  let filterHtml = '<option value="">All categories</option>';
  let formHtml = '<option value="">Select a category</option>';

  for (let i = 0; i < data.categories.length; i++) {
    let c = data.categories[i];
    filterHtml += '<option value="' + c.id + '">' + safe(c.name) + '</option>';
    formHtml += '<option value="' + c.id + '">' + safe(c.name) + '</option>';
  }

  document.getElementById('categoryFilter').innerHTML = filterHtml;
  document.getElementById('category').innerHTML = formHtml;
}

function showProducts() {
  let search = document.getElementById('search').value.trim().toLowerCase();
  let categoryId = document.getElementById('categoryFilter').value;
  let html = '';

  for (let i = 0; i < data.products.length; i++) {
    let p = data.products[i];

    // skip products that do not match the search or the category filter
    let matchesSearch = p.name.toLowerCase().includes(search) || String(p.id) === search;
    let matchesCategory = categoryId === '' || String(p.categoryId) === categoryId;
    if (!matchesSearch || !matchesCategory) {
      continue;
    }

    let category = findById(data.categories, p.categoryId);
    let categoryName = category !== null ? safe(category.name) : 'No category';

    let stock = p.stock;
    if (p.stock === 0) {
      stock = '<span class="badge text-bg-danger">Out of stock</span>';
    } else if (p.stock <= 5) {
      stock = '<span class="badge text-bg-warning">' + p.stock + '</span>';
    }

    html +=
      '<tr>' +
      '<td><img src="' + safe(p.image) + '" class="thumb" alt=""></td>' +
      '<td>' + p.id + '</td>' +
      '<td>' + safe(p.name) + '</td>' +
      '<td>' + categoryName + '</td>' +
      '<td class="text-end">' + money(p.price) + '</td>' +
      '<td class="text-center">' + stock + '</td>' +
      '<td class="text-end">' +
      '<button class="btn btn-sm btn-outline-primary edit-btn" data-id="' + p.id + '">Edit</button> ' +
      '<button class="btn btn-sm btn-outline-danger delete-btn" data-id="' + p.id + '">Delete</button>' +
      '</td></tr>';
  }

  if (html === '') {
    html = '<tr><td colspan="7" class="text-center text-muted py-4">No products found.</td></tr>';
  }
  document.getElementById('table').innerHTML = html;
}

// ---------- image ----------

function showPreview(source) {
  let preview = document.getElementById('preview');
  if (source === '') {
    preview.classList.add('d-none');
  } else {
    preview.src = source;
    preview.classList.remove('d-none');
  }
}

// The admin chose a file: read it and turn it into text we can keep in localStorage
function imageSelected() {
  clearErrors();
  let fileInput = document.getElementById('imageFile');
  let file = fileInput.files[0];
  if (file === undefined) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    showError('imageFile', 'This file is not an image');
    fileInput.value = '';
    return;
  }
  if (file.size > 300 * 1024) {
    showError('imageFile', 'Image is too big (max 300 KB). Choose a smaller one or paste a link.');
    fileInput.value = '';
    return;
  }

  let reader = new FileReader();
  reader.addEventListener('load', function () {
    uploadedImage = reader.result;
    document.getElementById('imageUrl').value = '';
    showPreview(uploadedImage);
  });
  reader.readAsDataURL(file);
}

// The admin typed a link: forget the uploaded file
function imageUrlChanged() {
  let url = document.getElementById('imageUrl').value.trim();
  uploadedImage = '';
  document.getElementById('imageFile').value = '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    showPreview(url);
  } else {
    showPreview('');
  }
}

// ---------- add / edit ----------

function openAddForm() {
  if (data.categories.length === 0) {
    showMessage('Please add a category first. Every product needs a category.', 'danger');
    return;
  }
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add product';
  clearForm();
  productModal.show();
}

function editProduct(id) {
  let p = findById(data.products, id);

  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit product ' + p.id;
  clearForm();

  document.getElementById('name').value = p.name;
  document.getElementById('category').value = p.categoryId;
  document.getElementById('price').value = p.price;
  document.getElementById('stock').value = p.stock;
  document.getElementById('description').value = p.description;

  // an uploaded picture starts with "data:", a link starts with "http"
  if (p.image.startsWith('data:')) {
    uploadedImage = p.image;
  } else {
    document.getElementById('imageUrl').value = p.image;
  }
  showPreview(p.image);

  productModal.show();
}

function clearForm() {
  clearErrors();
  document.getElementById('name').value = '';
  document.getElementById('category').value = '';
  document.getElementById('price').value = '';
  document.getElementById('stock').value = '';
  document.getElementById('description').value = '';
  document.getElementById('imageFile').value = '';
  document.getElementById('imageUrl').value = '';
  uploadedImage = '';
  showPreview('');
}

function saveProduct() {
  clearErrors();
  let name = document.getElementById('name').value.trim().replace(/\s+/g, ' ');
  let categoryId = document.getElementById('category').value;
  let price = document.getElementById('price').value;
  let stock = document.getElementById('stock').value;
  let description = document.getElementById('description').value.trim();
  let imageUrl = document.getElementById('imageUrl').value.trim();
  let image = uploadedImage || imageUrl;
  let valid = true;

  // ----- validation -----
  if (name === '') {
    showError('name', 'Product name is required');
    valid = false;
  } else if (name.length < 3) {
    showError('name', 'Product name must be at least 3 characters');
    valid = false;
  } else if (name.length > 100) {
    showError('name', 'Product name cannot be more than 100 characters');
    valid = false;
  } else {
    for (let i = 0; i < data.products.length; i++) {
      let other = data.products[i];
      if (other.name.toLowerCase() === name.toLowerCase() && other.id !== editingId) {
        showError('name', 'A product with this name already exists');
        valid = false;
      }
    }
  }

  if (categoryId === '') {
    showError('category', 'Please select a category');
    valid = false;
  }

  if (price === '') {
    showError('price', 'Price is required');
    valid = false;
  } else if (Number(price) <= 0) {
    showError('price', 'Price must be greater than 0');
    valid = false;
  } else if (Number(price) > 1000000) {
    showError('price', 'Price cannot be more than 1,000,000');
    valid = false;
  }

  if (stock === '') {
    showError('stock', 'Stock quantity is required');
    valid = false;
  } else if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
    showError('stock', 'Stock must be a whole number, 0 or more');
    valid = false;
  }

  if (description === '') {
    showError('description', 'Description is required');
    valid = false;
  } else if (description.length < 10) {
    showError('description', 'Description must be at least 10 characters');
    valid = false;
  } else if (description.length > 500) {
    showError('description', 'Description cannot be more than 500 characters');
    valid = false;
  }

  if (image === '') {
    showError('imageFile', 'Please upload an image or paste an image link');
    valid = false;
  } else if (uploadedImage === '' && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    showError('imageUrl', 'The link must start with http:// or https://');
    valid = false;
  }

  if (!valid) {
    return;
  }

  // ----- save -----
  if (editingId === null) {
    data.products.push({
      id: getNextId(data.products),
      name: name,
      categoryId: Number(categoryId),
      price: Number(price),
      stock: Number(stock),
      description: description,
      image: image,
    });
  } else {
    let p = findById(data.products, editingId);
    p.name = name;
    p.categoryId = Number(categoryId);
    p.price = Number(price);
    p.stock = Number(stock);
    p.description = description;
    p.image = image;
  }

  // saving fails when localStorage is full (big uploaded images)
  if (!saveData()) {
    reloadData();
    showMessage('Could not save: the browser storage is full. Use a smaller image or an image link.', 'danger');
    return;
  }

  productModal.hide();
  showMessage(editingId === null ? 'Product added.' : 'Product updated.');
  showProducts();
}

// ---------- delete ----------

function deleteProduct(id) {
  // can't delete a product that is inside a pending order
  for (let i = 0; i < data.orders.length; i++) {
    let order = data.orders[i];
    if (order.status !== 'pending') {
      continue;
    }
    for (let j = 0; j < order.items.length; j++) {
      if (order.items[j].productId === id) {
        showMessage('This product is in pending order ' + order.id + '. Confirm or reject that order first.', 'danger');
        return;
      }
    }
  }

  if (confirm('Are you sure you want to delete this product?')) {
    removeById(data.products, id);
    saveData();
    showMessage('Product deleted.');
    showProducts();
  }
}
