loadData(startPage);

function startPage() {
  if (checkAdmin() === null) {
    return;
  }
  showAdminNavbar('dashboard');

  // count some things
  let pending = 0;
  let returns = 0;
  for (let i = 0; i < data.orders.length; i++) {
    if (data.orders[i].status === 'pending') {
      pending++;
    }
    if (data.orders[i].returnStatus === 'requested') {
      returns++;
    }
  }

  let lowStock = 0;
  for (let i = 0; i < data.products.length; i++) {
    if (data.products[i].stock <= 5) {
      lowStock++;
    }
  }

  let admins = 0;
  for (let i = 0; i < data.users.length; i++) {
    if (data.users[i].role === 'admin') {
      admins++;
    }
  }

  // each card: [title, number, link, color]
  let cards = [
    ['Products', data.products.length, 'admin-products.html', 'primary'],
    ['Categories', data.categories.length, 'admin-categories.html', 'primary'],
    ['Pending orders', pending, 'admin-orders.html?status=pending', 'warning'],
    ['Return requests', returns, 'admin-orders.html?status=returns', 'info'],
    ['Low / out of stock', lowStock, 'admin-products.html', 'danger'],
    ['Admins', admins, 'admin-admins.html', 'success'],
  ];

  let html = '';
  for (let i = 0; i < cards.length; i++) {
    html +=
      '<div class="col-6 col-lg-4">' +
      '<a href="' + cards[i][2] + '" class="text-decoration-none">' +
      '<div class="card shadow-sm"><div class="card-body">' +
      '<div class="text-muted">' + cards[i][0] + '</div>' +
      '<div class="display-6 text-' + cards[i][3] + '">' + cards[i][1] + '</div>' +
      '</div></div></a></div>';
  }
  document.getElementById('cards').innerHTML = html;
}
