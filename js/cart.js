let user; // the logged-in customer

loadData(startPage);

function startPage() {
  user = checkCustomer();
  if (user === null) {
    return;
  }
  showCustomerNavbar('cart');

  // The quantity boxes and buttons are created by JavaScript, so we listen on the whole content
  let content = document.getElementById('content');
  content.addEventListener('change', quantityChanged);
  content.addEventListener('click', handleClick);

  showCart();
}

function showCart() {
  let cart = getCartDetails(user);
  showCustomerNavbar();

  if (cart.lines.length === 0) {
    document.getElementById('content').innerHTML =
      '<div class="alert alert-light border">Your cart is empty. <a href="index.html">Continue shopping</a></div>';
    return;
  }

  let rows = '';
  for (let i = 0; i < cart.lines.length; i++) {
    let line = cart.lines[i];
    let problem = '';
    if (line.problem !== '') {
      problem = '<div class="small text-danger">' + line.problem + '. Please lower the quantity or remove it.</div>';
    }

    rows +=
      '<tr>' +
      '<td><div class="d-flex align-items-center gap-3">' +
      '<img class="thumb" src="' + safe(line.product.image) + '" alt="">' +
      '<div><a class="text-reset fw-medium" href="product.html?id=' + line.product.id + '">' + safe(line.product.name) + '</a>' + problem + '</div>' +
      '</div></td>' +
      '<td class="text-end">' + money(line.product.price) + '</td>' +
      '<td><div><input type="number" class="form-control qty-input" id="qty-' + line.product.id + '" min="1" value="' + line.qty + '" data-id="' + line.product.id + '"></div></td>' +
      '<td class="text-end">' + money(line.subtotal) + '</td>' +
      '<td class="text-end"><button class="btn btn-sm btn-outline-danger remove-btn" data-id="' + line.product.id + '">Remove</button></td>' +
      '</tr>';
  }

  let warning = '';
  let checkoutClass = '';
  if (cart.hasProblem) {
    warning = '<div class="alert alert-danger py-2 small">Fix the items marked in red before checking out.</div>';
    checkoutClass = ' disabled';
  }

  document.getElementById('content').innerHTML =
    '<div class="row g-4">' +
    '<div class="col-12 col-lg-8"><div class="card shadow-sm"><div class="table-responsive">' +
    '<table class="table mb-0"><thead class="table-light"><tr><th>Product</th><th class="text-end">Price</th><th>Quantity</th><th class="text-end">Subtotal</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div></div></div>' +
    '<div class="col-12 col-lg-4"><div class="card shadow-sm"><div class="card-body">' +
    '<h5>Order summary</h5>' +
    '<div class="d-flex justify-content-between mb-3"><span>Total</span><strong>' + money(cart.total) + '</strong></div>' +
    warning +
    '<a class="btn btn-primary w-100 mb-2' + checkoutClass + '" href="checkout.html">Proceed to checkout</a>' +
    '<button class="btn btn-outline-secondary w-100" id="clearBtn">Clear cart</button>' +
    '</div></div></div></div>';
}

// the customer typed a new quantity
function quantityChanged(event) {
  if (!event.target.classList.contains('qty-input')) {
    return;
  }
  clearErrors();

  let input = event.target;
  let productId = Number(input.dataset.id);
  let qty = Number(input.value);
  let product = findById(data.products, productId);

  if (!Number.isInteger(qty) || qty < 1) {
    showError(input.id, 'Enter a whole number of 1 or more');
    return;
  }
  if (product !== null && qty > product.stock) {
    showError(input.id, 'Only ' + product.stock + ' available');
    return;
  }

  for (let i = 0; i < user.cart.length; i++) {
    if (user.cart[i].productId === productId) {
      user.cart[i].qty = qty;
    }
  }
  saveData();
  showCart();
}

function handleClick(event) {
  let button = event.target;

  if (button.classList.contains('remove-btn')) {
    let productId = Number(button.dataset.id);
    let keep = [];
    for (let i = 0; i < user.cart.length; i++) {
      if (user.cart[i].productId !== productId) {
        keep.push(user.cart[i]);
      }
    }
    user.cart = keep;
    saveData();
    showCart();
  } else if (button.id === 'clearBtn') {
    if (confirm('Remove all items from your cart?')) {
      user.cart = [];
      saveData();
      showCart();
    }
  }
}
