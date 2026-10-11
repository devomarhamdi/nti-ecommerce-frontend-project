let product = null; // the product shown on this page

loadData(startPage);

function startPage() {
  showCustomerNavbar('home');
  let content = document.getElementById('content');

  // which product? the link looks like product.html?id=3
  let id = Number(new URLSearchParams(location.search).get('id'));
  product = findById(data.products, id);

  if (product === null) {
    content.innerHTML = '<div class="alert alert-warning">This product was not found. <a href="index.html">Back to products</a></div>';
    return;
  }
  document.title = product.name + ' - Shop';

  // the page layout. The three empty boxes are filled by the functions below.
  content.innerHTML =
    '<nav><ol class="breadcrumb">' +
    '<li class="breadcrumb-item"><a href="index.html">Products</a></li>' +
    '<li class="breadcrumb-item active">' + safe(product.name) + '</li></ol></nav>' +
    '<div class="row g-4">' +
    '<div class="col-12 col-md-5"><img class="detail-image" src="' + safe(product.image) + '" alt="' + safe(product.name) + '"></div>' +
    '<div class="col-12 col-md-7" id="info"></div></div>' +
    '<hr class="my-4">' +
    '<div class="row g-4">' +
    '<div class="col-12 col-lg-7"><h2 class="h5" id="reviews">Customer reviews</h2><div id="reviewList"></div></div>' +
    '<div class="col-12 col-lg-5" id="reviewFormArea"></div></div>';

  // The buttons and the form are created later by JavaScript, so we listen on the whole page.
  content.addEventListener('click', handleClick);
  content.addEventListener('submit', function (event) {
    event.preventDefault(); // stop the page from reloading
    saveReview();
  });

  showAll();
}

function showAll() {
  showInfo();
  showReviews();
  showReviewForm();
}

function handleClick(event) {
  let buttonId = event.target.id;

  if (buttonId === 'addBtn') {
    clearErrors();
    let qtyInput = document.getElementById('qty');
    let qty = Number(qtyInput.value);
    if (!Number.isInteger(qty) || qty < 1) {
      showError('qty', 'Enter a whole number of 1 or more');
      return;
    }
    addToCart(product.id, qty);
  } else if (buttonId === 'wishBtn') {
    toggleWishlist(product.id);
    showInfo();
  } else if (buttonId === 'deleteReview') {
    deleteReview();
  }
}

// ---------- product info ----------

function showInfo() {
  let user = getCurrentCustomer();
  let wished = user !== null && isInWishlist(user, product.id);
  let category = findById(data.categories, product.categoryId);
  let out = product.stock < 1;

  let stockText = '<span class="badge text-bg-success">In stock</span> <span class="text-muted small">' + product.stock + ' available</span>';
  if (out) {
    stockText = '<span class="badge text-bg-danger">Out of stock</span>';
  }

  document.getElementById('info').innerHTML =
    '<span class="badge text-bg-light border mb-2">' + (category !== null ? safe(category.name) : 'No category') + '</span>' +
    '<h1 class="h3">' + safe(product.name) + '</h1>' +
    '<div class="mb-2">' + ratingHtml(product.id) + '</div>' +
    '<div class="h4 mb-3">' + money(product.price) + '</div>' +
    '<p>' + safe(product.description) + '</p>' +
    '<p>' + stockText + '</p>' +
    '<div class="d-flex flex-wrap gap-2 align-items-start">' +
    '<div><input type="number" id="qty" class="form-control qty-input" value="1" min="1"' + (out ? ' disabled' : '') + '></div>' +
    '<button class="btn btn-primary" id="addBtn"' + (out ? ' disabled' : '') + '>Add to cart</button>' +
    '<button class="btn ' + (wished ? 'btn-danger' : 'btn-outline-danger') + '" id="wishBtn">' +
    (wished ? '♥ In wishlist' : '♡ Add to wishlist') + '</button>' +
    '</div>';
}

// ---------- reviews ----------

function showReviews() {
  // newest first
  let reviews = [];
  for (let i = 0; i < data.reviews.length; i++) {
    if (data.reviews[i].productId === product.id) {
      reviews.push(data.reviews[i]);
    }
  }
  reviews.sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (reviews.length === 0) {
    document.getElementById('reviewList').innerHTML = '<p class="text-muted">No reviews yet. Be the first to review this product.</p>';
    return;
  }

  let html = '';
  for (let i = 0; i < reviews.length; i++) {
    let r = reviews[i];
    html +=
      '<div class="card mb-2"><div class="card-body py-2">' +
      '<div class="d-flex justify-content-between"><strong>' + safe(r.userName) + '</strong>' +
      '<small class="text-muted">' + formatDate(r.createdAt) + '</small></div>' +
      '<div>' + starsHtml(r.rating) + '</div>' +
      '<p class="mb-0">' + safe(r.comment) + '</p></div></div>';
  }
  document.getElementById('reviewList').innerHTML = html;
}

// the review of the logged-in customer for this product (or null)
function getMyReview(user) {
  for (let i = 0; i < data.reviews.length; i++) {
    if (data.reviews[i].productId === product.id && data.reviews[i].userId === user.id) {
      return data.reviews[i];
    }
  }
  return null;
}

function showReviewForm() {
  let area = document.getElementById('reviewFormArea');
  let user = getCurrentCustomer();

  if (user === null) {
    area.innerHTML = '<div class="alert alert-light border">Please <a href="login.html?next=' +
      encodeURIComponent(getCurrentPage()) + '">log in</a> to write a review.</div>';
    return;
  }
  if (!hasBought(user, product.id)) {
    area.innerHTML = '<div class="alert alert-light border">Only customers who bought this product (confirmed order) can review it.</div>';
    return;
  }

  let mine = getMyReview(user);
  area.innerHTML =
    '<div class="card"><div class="card-body">' +
    '<h2 class="h5">' + (mine !== null ? 'Edit your review' : 'Write a review') + '</h2>' +
    '<form id="reviewForm" novalidate>' +
    '<div class="mb-3"><label for="rating" class="form-label">Rating</label>' +
    '<select id="rating" class="form-select">' +
    '<option value="">Select a rating</option>' +
    '<option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option>' +
    '<option value="2">2 - Poor</option><option value="1">1 - Terrible</option></select></div>' +
    '<div class="mb-3"><label for="comment" class="form-label">Your review</label>' +
    '<textarea id="comment" class="form-control" rows="3"></textarea></div>' +
    '<button type="submit" class="btn btn-primary">' + (mine !== null ? 'Update review' : 'Submit review') + '</button>' +
    (mine !== null ? ' <button type="button" class="btn btn-outline-danger" id="deleteReview">Delete</button>' : '') +
    '</form></div></div>';

  if (mine !== null) {
    document.getElementById('rating').value = mine.rating;
    document.getElementById('comment').value = mine.comment;
  }
}

function saveReview() {
  let user = getCurrentCustomer();
  if (user === null) {
    return;
  }

  clearErrors();
  let rating = document.getElementById('rating').value;
  let comment = document.getElementById('comment').value.trim();
  let valid = true;

  if (rating === '') {
    showError('rating', 'Please choose a rating from 1 to 5');
    valid = false;
  }
  if (comment === '') {
    showError('comment', 'Please write a short review');
    valid = false;
  } else if (comment.length < 5) {
    showError('comment', 'Your review must be at least 5 characters');
    valid = false;
  } else if (comment.length > 500) {
    showError('comment', 'Your review cannot be more than 500 characters');
    valid = false;
  }
  if (!valid) {
    return;
  }

  let mine = getMyReview(user);
  if (mine !== null) {
    mine.rating = Number(rating);
    mine.comment = comment;
    mine.createdAt = new Date().toISOString();
  } else {
    data.reviews.push({
      id: getNextId(data.reviews),
      productId: product.id,
      userId: user.id,
      userName: user.name,
      rating: Number(rating),
      comment: comment,
      createdAt: new Date().toISOString(),
    });
  }

  saveData();
  showMessage(mine !== null ? 'Review updated.' : 'Thanks for your review!');
  showAll();
}

function deleteReview() {
  let user = getCurrentCustomer();
  let mine = getMyReview(user);

  if (confirm('Delete your review?')) {
    removeById(data.reviews, mine.id);
    saveData();
    showMessage('Review deleted.');
    showAll();
  }
}
