let user; // the logged-in customer
let orderModal;
let returnModal;
let returningId = null; // the order the customer is asking to return

loadData(startPage);

function startPage() {
  user = checkCustomer();
  if (user === null) {
    return;
  }
  showCustomerNavbar('orders');
  orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
  returnModal = new bootstrap.Modal(document.getElementById('returnModal'));

  document.getElementById('sendReturnBtn').addEventListener('click', sendReturnRequest);

  // The buttons are created by JavaScript, so we listen on the table and on the details window
  document.getElementById('table').addEventListener('click', handleClick);
  document.getElementById('modalFooter').addEventListener('click', handleClick);

  // after checkout we arrive here with ?placed=1005
  let placed = new URLSearchParams(location.search).get('placed');
  if (placed !== null) {
    showMessage('Order ' + placed + ' placed! It is pending until an admin confirms it.');
  }

  showOrders();
}

function handleClick(event) {
  let button = event.target;
  let id = Number(button.dataset.id);

  if (button.classList.contains('view-btn')) {
    viewOrder(id);
  } else if (button.classList.contains('return-btn')) {
    openReturnForm(id);
  }
}

// ---------- the list ----------

function showOrders() {
  // only this customer's orders, newest first
  let orders = [];
  for (let i = 0; i < data.orders.length; i++) {
    if (data.orders[i].customerId === user.id) {
      orders.push(data.orders[i]);
    }
  }
  orders.sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (orders.length === 0) {
    document.getElementById('table').innerHTML =
      '<tr><td colspan="7" class="text-center text-muted py-4">You have not placed any orders yet. <a href="index.html">Start shopping</a></td></tr>';
    return;
  }

  let html = '';
  for (let i = 0; i < orders.length; i++) {
    let o = orders[i];
    let itemCount = 0;
    for (let j = 0; j < o.items.length; j++) {
      itemCount += o.items[j].qty;
    }

    html +=
      '<tr>' +
      '<td>' + o.id + '</td>' +
      '<td>' + formatDate(o.createdAt) + '</td>' +
      '<td class="text-center">' + itemCount + '</td>' +
      '<td class="text-end">' + money(o.total) + '</td>' +
      '<td>' + statusBadge(o.status) + ' ' + returnBadge(o) + '</td>' +
      '<td class="small">' + paymentText(o) + '</td>' +
      '<td class="text-end"><button class="btn btn-sm btn-outline-secondary view-btn" data-id="' + o.id + '">Details</button></td>' +
      '</tr>';
  }
  document.getElementById('table').innerHTML = html;
}

// ---------- returns ----------

// Can this order still be returned?  Returns 'yes', 'expired' or 'no'
function canReturn(order) {
  if (order.status !== 'confirmed' || order.returnStatus) {
    return 'no';
  }
  let confirmedAt = order.resolvedAt || order.createdAt;
  let days = (Date.now() - new Date(confirmedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days > RETURN_DAYS) {
    return 'expired';
  }
  return 'yes';
}

// A sentence that tells the customer where the order is
function statusMessage(order) {
  let paypal = order.payment.method === 'paypal';

  if (order.returnStatus === 'requested') {
    return 'Your return request is waiting for an admin to review it.';
  }
  if (order.returnStatus === 'approved') {
    return 'Your return was approved.' + (paypal ? ' Your PayPal refund is being processed.' : ' The order has been cancelled.');
  }
  if (order.returnStatus === 'rejected') {
    return 'Your return request was rejected.';
  }
  if (order.status === 'pending') {
    return 'Your order is pending. An admin will confirm or reject it soon.';
  }
  if (order.status === 'rejected') {
    return 'This order was rejected by the store.' + (paypal ? ' Your PayPal payment will be refunded.' : '');
  }
  if (canReturn(order) === 'expired') {
    return 'The ' + RETURN_DAYS + '-day return period for this order has passed.';
  }
  return 'Your order is confirmed. You can request a return within ' + RETURN_DAYS + ' days.';
}

function openReturnForm(id) {
  returningId = id;
  document.getElementById('reason').value = '';
  document.getElementById('details').value = '';
  clearErrors();
  document.getElementById('returnTitle').textContent = 'Request a return for order ' + id;

  // Close the details window first, so two windows are never open together.
  // When it has finished closing (the "hidden.bs.modal" event), open the return form.
  // { once: true } means this listener runs one time only.
  document.getElementById('orderModal').addEventListener(
    'hidden.bs.modal',
    function () {
      returnModal.show();
    },
    { once: true }
  );
  orderModal.hide();
}

function sendReturnRequest() {
  clearErrors();
  let reason = document.getElementById('reason').value;
  let details = document.getElementById('details').value.trim();
  let valid = true;

  if (reason === '') {
    showError('reason', 'Please select a reason');
    valid = false;
  }
  if (details === '') {
    showError('details', 'Please explain the problem');
    valid = false;
  } else if (details.length < 10) {
    showError('details', 'Please give at least 10 characters of detail');
    valid = false;
  } else if (details.length > 300) {
    showError('details', 'Details cannot be more than 300 characters');
    valid = false;
  }
  if (!valid) {
    return;
  }

  let order = findById(data.orders, returningId);
  if (canReturn(order) !== 'yes') {
    showMessage('This order can no longer be returned.', 'danger');
    returnModal.hide();
    showOrders();
    return;
  }

  order.returnStatus = 'requested';
  order.returnReason = reason + ': ' + details;
  order.returnRequestedAt = new Date().toISOString();
  saveData();

  returnModal.hide();
  showMessage('Return request sent. We will review it soon.');
  showOrders();
}

// ---------- the details window ----------

function viewOrder(id) {
  let order = findById(data.orders, id);
  let confirmed = order.status === 'confirmed';

  let rows = '';
  for (let i = 0; i < order.items.length; i++) {
    let item = order.items[i];
    let rate = '';
    if (confirmed && findById(data.products, item.productId) !== null) {
      rate = '<a href="product.html?id=' + item.productId + '#reviews">Rate</a>';
    }
    rows +=
      '<tr>' +
      '<td>' + safe(item.name) + '</td>' +
      '<td class="text-end">' + money(item.price) + '</td>' +
      '<td class="text-center">' + item.qty + '</td>' +
      '<td class="text-end">' + money(item.price * item.qty) + '</td>' +
      '<td class="text-end">' + rate + '</td>' +
      '</tr>';
  }

  let returnReason = '';
  if (order.returnReason) {
    returnReason = '<p class="small"><strong>Return reason:</strong> ' + safe(order.returnReason) + '</p>';
  }

  document.getElementById('modalTitle').textContent = 'Order ' + order.id;
  document.getElementById('modalBody').innerHTML =
    '<div class="row mb-3">' +
    '<div class="col-sm-4"><div class="text-muted small">Placed</div>' + formatDate(order.createdAt) + '</div>' +
    '<div class="col-sm-4"><div class="text-muted small">Status</div>' + statusBadge(order.status) + ' ' + returnBadge(order) + '</div>' +
    '<div class="col-sm-4"><div class="text-muted small">Payment</div>' + paymentText(order) + '</div></div>' +
    '<div class="alert alert-light border small">' + statusMessage(order) + '</div>' +
    returnReason +
    '<table class="table table-sm">' +
    '<thead><tr><th>Product</th><th class="text-end">Price</th><th class="text-center">Qty</th><th class="text-end">Subtotal</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">' + money(order.total) + '</th><th></th></tr></tfoot>' +
    '</table>' +
    '<div class="small text-muted">Ship to</div>' +
    '<div>' + safe(order.shipping.fullName) + ', ' + safe(order.shipping.address) + ', ' + safe(order.shipping.city) + ' - ' + safe(order.shipping.phone) + '</div>';

  let footer = '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>';
  if (canReturn(order) === 'yes') {
    footer += ' <button class="btn btn-primary return-btn" data-id="' + order.id + '">Request return</button>';
  }
  document.getElementById('modalFooter').innerHTML = footer;

  orderModal.show();
}
