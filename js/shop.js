// ===================================================================
// Code shared by the CUSTOMER pages (load it after data.js).
// ===================================================================

// The logged-in customer, or null (guests and admins count as "no customer")
function getCurrentCustomer() {
  let user = getCurrentUser();
  if (user !== null && user.role === 'customer') {
    return user;
  }
  return null;
}

// The current page name with its query, e.g. "product.html?id=3"
function getCurrentPage() {
  return location.pathname.split('/').pop() + location.search;
}

function goToLogin() {
  location.href = 'login.html?next=' + encodeURIComponent(getCurrentPage());
}

// Put at the top of pages only a customer may see (cart, wishlist, orders...)
function checkCustomer() {
  let user = getCurrentCustomer();
  if (user === null) {
    goToLogin();
  }
  return user;
}

// After login we go back to the page the customer came from (only plain page names are allowed)
function getNextPage() {
  let next = new URLSearchParams(location.search).get('next');
  if (next !== null && /^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(next)) {
    return next;
  }
  return 'index.html';
}

// ---------- ratings ----------

function getRating(productId) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < data.reviews.length; i++) {
    if (data.reviews[i].productId === productId) {
      total += data.reviews[i].rating;
      count++;
    }
  }
  let average = 0;
  if (count > 0) {
    average = total / count;
  }
  return { average: average, count: count };
}

// 4 -> ★★★★☆
function starsHtml(number) {
  let full = Math.round(number);
  return '<span class="text-warning">' + '★'.repeat(full) + '☆'.repeat(5 - full) + '</span>';
}

function ratingHtml(productId) {
  let rating = getRating(productId);
  if (rating.count === 0) {
    return '<small class="text-muted">No reviews yet</small>';
  }
  return starsHtml(rating.average) + ' <small class="text-muted">' + rating.average.toFixed(1) + ' (' + rating.count + ')</small>';
}

// Has this customer bought the product (a confirmed order)? Needed to write a review.
function hasBought(user, productId) {
  for (let i = 0; i < data.orders.length; i++) {
    let order = data.orders[i];
    if (order.customerId === user.id && order.status === 'confirmed') {
      for (let j = 0; j < order.items.length; j++) {
        if (order.items[j].productId === productId) {
          return true;
        }
      }
    }
  }
  return false;
}

// ---------- wishlist ----------

function isInWishlist(user, productId) {
  return user.wishlist.indexOf(productId) !== -1;
}

// Adds the product to the wishlist, or removes it if it is already there
function toggleWishlist(productId) {
  let user = getCurrentCustomer();
  if (user === null) {
    goToLogin();
    return;
  }

  let index = user.wishlist.indexOf(productId);
  if (index === -1) {
    user.wishlist.push(productId);
    showMessage('Added to your wishlist.');
  } else {
    user.wishlist.splice(index, 1);
    showMessage('Removed from your wishlist.');
  }
  saveData();
  showCustomerNavbar();
}

// ---------- cart ----------
// user.cart is a list like [ { productId: 3, qty: 2 }, ... ]

function addToCart(productId, qty) {
  let user = getCurrentCustomer();
  if (user === null) {
    goToLogin();
    return false;
  }

  let product = findById(data.products, productId);
  if (product === null) {
    showMessage('This product is no longer available.', 'danger');
    return false;
  }
  if (product.stock < 1) {
    showMessage('"' + product.name + '" is out of stock.', 'danger');
    return false;
  }

  // is it already in the cart?
  let line = null;
  for (let i = 0; i < user.cart.length; i++) {
    if (user.cart[i].productId === productId) {
      line = user.cart[i];
    }
  }

  let newQty = qty;
  if (line !== null) {
    newQty = line.qty + qty;
  }
  if (newQty > product.stock) {
    showMessage('Only ' + product.stock + ' of "' + product.name + '" available.', 'danger');
    return false;
  }

  if (line !== null) {
    line.qty = newQty;
  } else {
    user.cart.push({ productId: productId, qty: qty });
  }
  saveData();
  showMessage('"' + product.name + '" added to your cart.');
  showCustomerNavbar();
  return true;
}

// The cart with the real product data and the total.
// Returns { lines: [ { product, qty, subtotal, problem } ], total, hasProblem }
function getCartDetails(user) {
  let lines = [];
  let keep = [];
  let total = 0;
  let hasProblem = false;

  for (let i = 0; i < user.cart.length; i++) {
    let item = user.cart[i];
    let product = findById(data.products, item.productId);
    if (product === null) {
      continue; // the admin deleted this product: drop it from the cart
    }

    let problem = '';
    if (product.stock < 1) {
      problem = 'Out of stock';
    } else if (item.qty > product.stock) {
      problem = 'Only ' + product.stock + ' in stock';
    }
    if (problem !== '') {
      hasProblem = true;
    }

    keep.push(item);
    total += product.price * item.qty;
    lines.push({ product: product, qty: item.qty, subtotal: product.price * item.qty, problem: problem });
  }

  if (keep.length !== user.cart.length) {
    user.cart = keep;
    saveData();
    showMessage('Some products in your cart are no longer available and were removed.', 'warning');
  }

  return { lines: lines, total: Math.round(total * 100) / 100, hasProblem: hasProblem };
}

// ---------- orders ----------

// Creates a pending order from the cart and empties the cart.
// Returns the new order, or null if something is wrong.
// checkStock is false after a PayPal payment, because the money is already taken.
function placeOrder(user, shipping, payment, checkStock) {
  let cart = getCartDetails(user);

  if (cart.lines.length === 0) {
    showMessage('Your cart is empty.', 'danger');
    return null;
  }
  if (checkStock && cart.hasProblem) {
    showMessage('Some items are not available in the quantity you chose. Please update your cart.', 'danger');
    return null;
  }

  let items = [];
  for (let i = 0; i < cart.lines.length; i++) {
    let line = cart.lines[i];
    items.push({ productId: line.product.id, name: line.product.name, price: line.product.price, qty: line.qty });
  }

  let order = {
    id: getNextId(data.orders),
    customerId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    items: items,
    total: cart.total,
    status: 'pending', // stays pending until an admin confirms or rejects it
    createdAt: new Date().toISOString(),
    shipping: shipping,
    payment: payment,
  };
  data.orders.push(order);
  user.cart = [];

  if (!saveData()) {
    reloadData();
    showMessage('Could not place the order: the browser storage is full.', 'danger');
    return null;
  }
  return order;
}

// ---------- product cards (home page and wishlist page) ----------

function productCard(product, wished) {
  let category = findById(data.categories, product.categoryId);
  let categoryName = category !== null ? safe(category.name) : 'No category';

  let stockBadge = '<span class="badge text-bg-success">In stock</span>';
  if (product.stock < 1) {
    stockBadge = '<span class="badge text-bg-danger">Out of stock</span>';
  } else if (product.stock <= 5) {
    stockBadge = '<span class="badge text-bg-warning">Only ' + product.stock + ' left</span>';
  }

  let link = 'product.html?id=' + product.id;
  let disabled = product.stock < 1 ? ' disabled' : '';
  let heart = wished ? '♥' : '♡';
  let heartClass = wished ? 'btn-danger' : 'btn-outline-danger';

  return (
    '<div class="col"><div class="card h-100 shadow-sm">' +
    '<a href="' + link + '"><img class="card-img-top card-image" src="' + safe(product.image) + '" alt="' + safe(product.name) + '"></a>' +
    '<div class="card-body d-flex flex-column">' +
    '<span class="badge text-bg-light border align-self-start mb-2">' + categoryName + '</span>' +
    '<h2 class="h6"><a class="text-reset text-decoration-none" href="' + link + '">' + safe(product.name) + '</a></h2>' +
    '<div class="small mb-2">' + ratingHtml(product.id) + '</div>' +
    '<div class="mt-auto d-flex justify-content-between align-items-center">' +
    '<strong>' + money(product.price) + '</strong>' + stockBadge +
    '</div></div>' +
    '<div class="card-footer bg-white d-flex gap-2">' +
    '<button class="btn btn-primary btn-sm flex-grow-1 cart-btn" data-id="' + product.id + '"' + disabled + '>Add to cart</button>' +
    '<button class="btn btn-sm wish-btn ' + heartClass + '" data-id="' + product.id + '">' + heart + '</button>' +
    '</div></div></div>'
  );
}

// Makes the "Add to cart" and heart buttons inside a container work.
// "refresh" is the function that redraws the cards.
function listenToCards(containerId, refresh) {
  document.getElementById(containerId).addEventListener('click', function (event) {
    let button = event.target;
    let id = Number(button.dataset.id);

    if (button.classList.contains('cart-btn')) {
      addToCart(id, 1);
    } else if (button.classList.contains('wish-btn')) {
      toggleWishlist(id);
      refresh();
    }
  });
}
