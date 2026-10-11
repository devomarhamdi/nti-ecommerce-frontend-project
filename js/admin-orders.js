let orderModal;

loadData(startPage);

function startPage() {
  if (checkAdmin() === null) {
    return;
  }
  showAdminNavbar('orders');
  orderModal = new bootstrap.Modal(document.getElementById('orderModal'));

  // the dashboard links here with ?status=pending or ?status=returns
  let status = new URLSearchParams(location.search).get('status');
  if (status !== null) {
    document.getElementById('statusFilter').value = status;
  }

  document.getElementById('search').addEventListener('input', showOrders);
  document.getElementById('statusFilter').addEventListener('change', showOrders);

  // The buttons are created by JavaScript, so we listen on the table and on the details window
  document.getElementById('table').addEventListener('click', handleClick);
  document.getElementById('modalFooter').addEventListener('click', handleClick);

  showOrders();
}

// One function for every button. The button's class says what to do, data-id says which order.
function handleClick(event) {
  let button = event.target;
  let id = Number(button.dataset.id);

  if (button.classList.contains('view-btn')) {
    viewOrder(id);
  } else if (button.classList.contains('confirm-btn')) {
    confirmOrder(id);
  } else if (button.classList.contains('reject-btn')) {
    rejectOrder(id);
  } else if (button.classList.contains('approve-return-btn')) {
    approveReturn(id);
  } else if (button.classList.contains('reject-return-btn')) {
    rejectReturn(id);
  }
}

// ---------- the list ----------

// the buttons that fit the order: pending orders and return requests need an answer
function actionButtons(order) {
  if (order.status === 'pending') {
    return (
      '<button class="btn btn-sm btn-success confirm-btn" data-id="' + order.id + '">Confirm</button> ' +
      '<button class="btn btn-sm btn-outline-danger reject-btn" data-id="' + order.id + '">Reject</button>'
    );
  }
  if (order.returnStatus === 'requested') {
    return (
      '<button class="btn btn-sm btn-success approve-return-btn" data-id="' + order.id + '">Approve return</button> ' +
      '<button class="btn btn-sm btn-outline-danger reject-return-btn" data-id="' + order.id + '">Reject return</button>'
    );
  }
  return '';
}

function showOrders() {
  let search = document.getElementById('search').value.trim().toLowerCase();
  let status = document.getElementById('statusFilter').value;
  let html = '';

  // newest first (copy the list so we do not change the real order of data.orders)
  let orders = data.orders.slice();
  orders.sort(function (a, b) {
    return b.createdAt.localeCompare(a.createdAt);
  });

  for (let i = 0; i < orders.length; i++) {
    let o = orders[i];

    let matchesSearch =
      String(o.id).includes(search) ||
      o.customerName.toLowerCase().includes(search) ||
      o.customerEmail.toLowerCase().includes(search);

    let matchesStatus = true;
    if (status === 'returns') {
      matchesStatus = o.returnStatus === 'requested';
    } else if (status !== '') {
      matchesStatus = o.status === status;
    }

    if (!matchesSearch || !matchesStatus) {
      continue;
    }

    let itemCount = 0;
    for (let j = 0; j < o.items.length; j++) {
      itemCount += o.items[j].qty;
    }

    html +=
      '<tr>' +
      '<td>' + o.id + '</td>' +
      '<td>' + safe(o.customerName) + '<div class="small text-muted">' + safe(o.customerEmail) + '</div></td>' +
      '<td>' + formatDate(o.createdAt) + '</td>' +
      '<td class="text-center">' + itemCount + '</td>' +
      '<td class="text-end">' + money(o.total) + '</td>' +
      '<td>' + statusBadge(o.status) + ' ' + returnBadge(o) + '</td>' +
      '<td class="text-end">' +
      '<button class="btn btn-sm btn-outline-secondary view-btn" data-id="' + o.id + '">View</button> ' +
      actionButtons(o) +
      '</td></tr>';
  }

  if (html === '') {
    html = '<tr><td colspan="7" class="text-center text-muted py-4">No orders found.</td></tr>';
  }
  document.getElementById('table').innerHTML = html;
}

// ---------- the details window ----------

function viewOrder(id) {
  let order = findById(data.orders, id);

  let rows = '';
  for (let i = 0; i < order.items.length; i++) {
    let item = order.items[i];
    let product = findById(data.products, item.productId);
    let stock = product !== null ? product.stock : 'Removed';
    // show the stock in red when there is not enough for a pending order
    let red = '';
    if (order.status === 'pending' && (product === null || product.stock < item.qty)) {
      red = 'text-danger fw-bold';
    }

    rows +=
      '<tr>' +
      '<td>' + safe(item.name) + '</td>' +
      '<td class="text-end">' + money(item.price) + '</td>' +
      '<td class="text-center">' + item.qty + '</td>' +
      '<td class="text-end">' + money(item.price * item.qty) + '</td>' +
      '<td class="text-center ' + red + '">' + stock + '</td>' +
      '</tr>';
  }

  let paypalId = '';
  if (order.payment.method === 'paypal' && order.payment.paypalOrderId) {
    paypalId = ' <span class="text-muted small">(' + safe(order.payment.paypalOrderId) + ')</span>';
  }

  let returnInfo = '';
  if (order.returnStatus) {
    returnInfo =
      '<div class="alert alert-info py-2 small"><strong>Return ' + order.returnStatus + '.</strong> ' +
      safe(order.returnReason) + '</div>';
  }

  document.getElementById('modalTitle').textContent = 'Order ' + order.id;
  document.getElementById('modalBody').innerHTML =
    '<div class="row mb-3 g-2">' +
    '<div class="col-sm-6"><div class="text-muted small">Customer</div>' + safe(order.customerName) + ' (' + safe(order.customerEmail) + ')</div>' +
    '<div class="col-sm-3"><div class="text-muted small">Date</div>' + formatDate(order.createdAt) + '</div>' +
    '<div class="col-sm-3"><div class="text-muted small">Status</div>' + statusBadge(order.status) + ' ' + returnBadge(order) + '</div>' +
    '<div class="col-sm-6"><div class="text-muted small">Payment</div>' + paymentText(order) + paypalId + '</div>' +
    '<div class="col-sm-6"><div class="text-muted small">Ship to</div>' +
    safe(order.shipping.fullName) + ', ' + safe(order.shipping.address) + ', ' + safe(order.shipping.city) + '<br>' + safe(order.shipping.phone) + '</div>' +
    '</div>' +
    returnInfo +
    '<table class="table table-sm">' +
    '<thead><tr><th>Product</th><th class="text-end">Price</th><th class="text-center">Qty</th><th class="text-end">Subtotal</th><th class="text-center">In stock</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr><th colspan="3" class="text-end">Total</th><th class="text-end">' + money(order.total) + '</th><th></th></tr></tfoot>' +
    '</table>';

  document.getElementById('modalFooter').innerHTML =
    '<button class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button> ' + actionButtons(order);

  orderModal.show();
}

// ---------- the actions ----------

function confirmOrder(id) {
  let order = findById(data.orders, id);

  // 1. check that there is enough stock for every item
  for (let i = 0; i < order.items.length; i++) {
    let item = order.items[i];
    let product = findById(data.products, item.productId);
    if (product === null) {
      showMessage('Cannot confirm: "' + item.name + '" no longer exists. You can reject this order.', 'danger');
      return;
    }
    if (product.stock < item.qty) {
      showMessage(
        'Cannot confirm: "' + item.name + '" has only ' + product.stock + ' in stock (ordered ' + item.qty + '). Restock it or reject the order.',
        'danger'
      );
      return;
    }
  }

  if (!confirm('Confirm order ' + id + '? The stock will be reduced.')) {
    return;
  }

  // 2. reduce the stock
  for (let i = 0; i < order.items.length; i++) {
    let product = findById(data.products, order.items[i].productId);
    product.stock = product.stock - order.items[i].qty;
  }

  // 3. update the order and save
  order.status = 'confirmed';
  order.resolvedAt = new Date().toISOString();
  saveData();
  showMessage('Order ' + id + ' confirmed.');
  finishAction();
}

function rejectOrder(id) {
  let order = findById(data.orders, id);

  let note = '';
  if (order.payment.method === 'paypal') {
    note = ' The PayPal payment will be marked "refund due" (refund it from your PayPal sandbox account).';
  }
  if (!confirm('Reject order ' + id + '?' + note)) {
    return;
  }

  order.status = 'rejected';
  order.resolvedAt = new Date().toISOString();
  if (order.payment.method === 'paypal') {
    order.payment.status = 'refund_due';
  }
  saveData();
  showMessage('Order ' + id + ' rejected.');
  finishAction();
}

function approveReturn(id) {
  let order = findById(data.orders, id);

  let note = '';
  if (order.payment.method === 'paypal') {
    note = ' The PayPal payment will be marked "refund due".';
  }
  if (!confirm('Approve the return of order ' + id + '? The items go back into stock.' + note)) {
    return;
  }

  // put the items back in stock (skip products that were deleted)
  for (let i = 0; i < order.items.length; i++) {
    let product = findById(data.products, order.items[i].productId);
    if (product !== null) {
      product.stock = product.stock + order.items[i].qty;
    }
  }

  order.returnStatus = 'approved';
  order.returnResolvedAt = new Date().toISOString();
  if (order.payment.method === 'paypal') {
    order.payment.status = 'refund_due';
  }
  saveData();
  showMessage('Return for order ' + id + ' approved.');
  finishAction();
}

function rejectReturn(id) {
  let order = findById(data.orders, id);

  if (!confirm('Reject the return request for order ' + id + '?')) {
    return;
  }

  order.returnStatus = 'rejected';
  order.returnResolvedAt = new Date().toISOString();
  saveData();
  showMessage('Return for order ' + id + ' rejected.');
  finishAction();
}

// close the details window, redraw the table and the navbar badge
function finishAction() {
  orderModal.hide();
  showOrders();
  showAdminNavbar('orders');
}
