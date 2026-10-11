loadData(startPage);

function startPage() {
  showCustomerNavbar('home');

  // fill the category dropdown
  let html = '<option value="">All categories</option>';
  for (let i = 0; i < data.categories.length; i++) {
    html += '<option value="' + data.categories[i].id + '">' + safe(data.categories[i].name) + '</option>';
  }
  document.getElementById('categoryFilter').innerHTML = html;

  // any change in a filter redraws the products
  document.getElementById('search').addEventListener('input', showProducts);
  document.getElementById('categoryFilter').addEventListener('change', showProducts);
  document.getElementById('minPrice').addEventListener('input', showProducts);
  document.getElementById('maxPrice').addEventListener('input', showProducts);
  document.getElementById('sort').addEventListener('change', showProducts);
  document.getElementById('inStock').addEventListener('change', showProducts);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);

  // make the "Add to cart" and heart buttons work
  listenToCards('grid', showProducts);

  showProducts();
}

function resetFilters() {
  document.getElementById('search').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('sort').value = 'newest';
  document.getElementById('inStock').checked = false;
  showProducts();
}

function showProducts() {
  clearErrors();
  let search = document.getElementById('search').value.trim().toLowerCase();
  let categoryId = document.getElementById('categoryFilter').value;
  let minText = document.getElementById('minPrice').value.trim();
  let maxText = document.getElementById('maxPrice').value.trim();
  let sortBy = document.getElementById('sort').value;
  let inStockOnly = document.getElementById('inStock').checked;

  // check the price filters (an invalid one is ignored)
  let min = null;
  let max = null;
  if (minText !== '') {
    if (Number(minText) < 0) {
      showError('minPrice', 'Cannot be negative');
    } else {
      min = Number(minText);
    }
  }
  if (maxText !== '') {
    if (Number(maxText) < 0) {
      showError('maxPrice', 'Cannot be negative');
    } else if (min !== null && Number(maxText) < min) {
      showError('maxPrice', 'Must be at least the minimum price');
    } else {
      max = Number(maxText);
    }
  }

  // keep only the products that match every filter
  let products = [];
  for (let i = 0; i < data.products.length; i++) {
    let p = data.products[i];
    let matchesSearch = p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search);
    let matchesCategory = categoryId === '' || String(p.categoryId) === categoryId;
    let matchesMin = min === null || p.price >= min;
    let matchesMax = max === null || p.price <= max;
    let matchesStock = !inStockOnly || p.stock > 0;

    if (matchesSearch && matchesCategory && matchesMin && matchesMax && matchesStock) {
      products.push(p);
    }
  }

  // sort them
  products.sort(function (a, b) {
    if (sortBy === 'price-asc') {
      return a.price - b.price;
    }
    if (sortBy === 'price-desc') {
      return b.price - a.price;
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'rating') {
      return getRating(b.id).average - getRating(a.id).average;
    }
    return b.id - a.id; // newest first
  });

  document.getElementById('resultCount').textContent = products.length + ' product(s) found';

  if (products.length === 0) {
    document.getElementById('grid').innerHTML =
      '<div class="col-12"><div class="alert alert-light border">No products match your filters.</div></div>';
    return;
  }

  let user = getCurrentCustomer();
  let cards = '';
  for (let i = 0; i < products.length; i++) {
    let wished = user !== null && isInWishlist(user, products[i].id);
    cards += productCard(products[i], wished);
  }
  document.getElementById('grid').innerHTML = cards;
}
