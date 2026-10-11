// PayPal SANDBOX client id. "test" works for a quick demo.
// For your own sandbox: create an app at https://developer.paypal.com/dashboard/applications/sandbox
// and paste its Client ID here.
const PAYPAL_CLIENT_ID = 'test';

let user; // the logged-in customer
let paypalLoaded = false;
let paypalShipping = null; // the shipping details that were validated when the PayPal button was clicked

loadData(startPage);

function startPage() {
  user = checkCustomer();
  if (user === null) {
    return;
  }

  // nothing to buy, or a problem in the cart: go back to the cart
  let cart = getCartDetails(user);
  if (cart.lines.length === 0 || cart.hasProblem) {
    location.href = 'cart.html';
    return;
  }
  showCustomerNavbar('cart');
  showSummary(cart);

  document.getElementById('fullName').value = user.name;

  document.getElementById('placeBtn').addEventListener('click', placeCashOrder);
  document.getElementById('payCod').addEventListener('change', paymentChanged);
  document.getElementById('payPaypal').addEventListener('change', paymentChanged);
}

function showSummary(cart) {
  let html = '<h5 class="mb-3">Your order</h5><ul class="list-group list-group-flush mb-3">';
  for (let i = 0; i < cart.lines.length; i++) {
    let line = cart.lines[i];
    html +=
      '<li class="list-group-item d-flex justify-content-between px-0">' +
      '<span>' + safe(line.product.name) + ' <span class="text-muted">x ' + line.qty + '</span></span>' +
      '<span>' + money(line.subtotal) + '</span></li>';
  }
  html +=
    '</ul><div class="d-flex justify-content-between"><span>Total</span><strong>' + money(cart.total) + '</strong></div>' +
    '<p class="small text-muted mt-3 mb-0">Your order stays <strong>pending</strong> until an admin confirms or rejects it.</p>';
  document.getElementById('summary').innerHTML = html;
}

// ---------- shipping form ----------

// Checks the shipping form. Returns the details, or null if something is wrong.
function readShipping() {
  clearErrors();
  let fullName = document.getElementById('fullName').value.trim().replace(/\s+/g, ' ');
  let phone = document.getElementById('phone').value.trim();
  let address = document.getElementById('address').value.trim();
  let city = document.getElementById('city').value.trim();
  let valid = true;

  if (fullName === '') {
    showError('fullName', 'Full name is required');
    valid = false;
  } else if (fullName.length < 2) {
    showError('fullName', 'Full name must be at least 2 characters');
    valid = false;
  }

  if (phone === '') {
    showError('phone', 'Phone number is required');
    valid = false;
  } else if (!/^\+?[\d\s-]{8,15}$/.test(phone)) {
    showError('phone', 'Enter a valid phone number (8 to 15 digits)');
    valid = false;
  }

  if (address === '') {
    showError('address', 'Address is required');
    valid = false;
  } else if (address.length < 5) {
    showError('address', 'Address must be at least 5 characters');
    valid = false;
  } else if (address.length > 200) {
    showError('address', 'Address cannot be more than 200 characters');
    valid = false;
  }

  if (city === '') {
    showError('city', 'City is required');
    valid = false;
  } else if (city.length < 2) {
    showError('city', 'City must be at least 2 characters');
    valid = false;
  }

  if (!valid) {
    return null;
  }
  return { fullName: fullName, phone: phone, address: address, city: city };
}

// ---------- cash on delivery ----------

function placeCashOrder() {
  let shipping = readShipping();
  if (shipping === null) {
    return;
  }

  let order = placeOrder(user, shipping, { method: 'cod', status: 'unpaid' }, true);
  if (order !== null) {
    location.href = 'my-orders.html?placed=' + order.id;
  }
}

// ---------- PayPal ----------

// the customer switched between "Cash on delivery" and "PayPal"
function paymentChanged() {
  let usePaypal = document.getElementById('payPaypal').checked;

  if (usePaypal) {
    document.getElementById('codArea').classList.add('d-none');
    document.getElementById('paypalArea').classList.remove('d-none');
    loadPaypal();
  } else {
    document.getElementById('codArea').classList.remove('d-none');
    document.getElementById('paypalArea').classList.add('d-none');
  }
}

// Load the PayPal script (only once), then draw the PayPal buttons
function loadPaypal() {
  if (paypalLoaded) {
    return;
  }

  let script = document.createElement('script');
  script.src = 'https://www.paypal.com/sdk/js?client-id=' + PAYPAL_CLIENT_ID + '&currency=USD';

  script.addEventListener('load', function () {
    paypalLoaded = true;
    showPaypalButtons();
  });
  script.addEventListener('error', function () {
    showMessage('Could not load PayPal. Check your internet connection or choose cash on delivery.', 'danger');
  });

  document.head.appendChild(script);
}

function showPaypalButtons() {
  paypal.Buttons({
    // 1. Before the PayPal window opens: stop if the shipping form is not valid
    onClick: function (data, actions) {
      paypalShipping = readShipping();
      if (paypalShipping === null) {
        return actions.reject();
      }
      return actions.resolve();
    },

    // 2. Tell PayPal how much to charge
    createOrder: function (data, actions) {
      let cart = getCartDetails(user);
      return actions.order.create({
        purchase_units: [{ amount: { currency_code: 'USD', value: cart.total.toFixed(2) } }],
      });
    },

    // 3. The customer paid: save our order
    onApprove: function (data, actions) {
      return actions.order.capture().then(function (details) {
        let payment = { method: 'paypal', status: 'paid', paypalOrderId: details.id };
        let order = placeOrder(user, paypalShipping, payment, false);
        if (order !== null) {
          location.href = 'my-orders.html?placed=' + order.id;
        }
      });
    },

    onCancel: function () {
      showMessage('Payment cancelled. Your cart has not been changed.', 'warning');
    },
    onError: function () {
      showMessage('PayPal could not process the payment. Please try again.', 'danger');
    },
  }).render('#paypalButtons');
}
