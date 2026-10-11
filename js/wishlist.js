loadData(startPage);

function startPage() {
  if (checkCustomer() === null) {
    return;
  }
  showCustomerNavbar('wishlist');

  listenToCards('grid', showWishlist);
  showWishlist();
}

function showWishlist() {
  let user = getCurrentCustomer();
  let html = '';

  for (let i = 0; i < user.wishlist.length; i++) {
    let product = findById(data.products, user.wishlist[i]);
    if (product !== null) {
      // every product here is in the wishlist, so the heart is always filled
      html += productCard(product, true);
    }
  }

  if (html === '') {
    html =
      '<div class="col-12"><div class="alert alert-light border">Your wishlist is empty. ' +
      'Tap the heart on a product to save it here. <a href="index.html">Browse products</a></div></div>';
  }
  document.getElementById('grid').innerHTML = html;
}
