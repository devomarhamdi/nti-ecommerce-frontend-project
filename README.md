# E-Commerce Project (HTML, CSS, JavaScript, Bootstrap 5)

A small online shop with two kinds of users (Admin, Customer), built without any JavaScript framework.

## How the data works

- `data/data.json` holds the starting data (users, categories, products, orders, reviews).
- The first time a page opens, JavaScript reads that file with **XMLHttpRequest** and copies it into **localStorage**.
- After that every page reads and saves from localStorage (a browser cannot write to a file).

To reset the shop to the starting data: clear the site's localStorage (DevTools > Application > Local Storage > Clear).
To change the starting data: edit `data/data.json`, then clear localStorage.

## Run it

Browsers block XMLHttpRequest on files opened by double-click, so use a small local server:

- **VS Code:** install the "Live Server" extension, right-click `index.html`, choose "Open with Live Server", or
- **Terminal:** in this folder run `python3 -m http.server 8000` and open <http://localhost:8000>

An internet connection is needed for Bootstrap (CDN) and for the PayPal button.

| Role     | Email              | Password       | Log in at          |
|----------|--------------------|----------------|--------------------|
| Admin    | admin@shop.com     | Admin@123      | `admin-login.html` |
| Customer | customer@shop.com  | Customer@123   | `login.html`       |

## Features

**Everyone**
- Two user types: Admin and Customer
- Validation on every form with a clear message under each field
- Login and logout

**Customer** (`index.html`)
- Register and log in
- Browse products with filters: search, category, price range, in-stock only, sorting
- Wishlist
- Shopping cart with stock checks
- Checkout: orders stay **pending** until an admin confirms or rejects them
- See previous orders and their status

**Admin** (`admin-*.html`)
- Log in, and add other admins
- Full CRUD on products (ID, name, image, category, price, description, stock) and categories
- See all orders, confirm or reject them (confirming reduces the stock)
- Dashboard with quick numbers

**Bonus**
- **PayPal sandbox** payment at checkout
- **Feedback and rating** for products (only customers with a confirmed order of that product can review)
- **Returning orders**: a customer can request a return of a confirmed order within 14 days; the admin approves
  (items go back into stock) or rejects it

## PayPal sandbox

`js/checkout.js` starts with `const PAYPAL_CLIENT_ID = 'test'`, PayPal's public demo ID, so the button works straight away.
For your own sandbox, create an app at <https://developer.paypal.com/dashboard/applications/sandbox>, paste its
**Client ID** there, and pay with a sandbox *personal* account.

A front-end-only app cannot issue real refunds. When an admin rejects a paid order or approves a return, the
order is marked **"refund due"** and the refund is done from the PayPal dashboard.

## Files

```
data/data.json          starting data (loaded with XMLHttpRequest)
js/data.js              shared by all pages: load/save data, login helpers, navbars, form errors
js/shop.js              shared by customer pages: ratings, cart, wishlist, product cards, placing orders
js/<page>.js            one script per page

Customer pages:  index, product, wishlist, cart, checkout, my-orders, login, register
Admin pages:     admin-login, admin-dashboard, admin-products, admin-categories, admin-orders, admin-admins
```

Every page script has the same shape:

```js
loadData(startPage);          // 1. load the data, then run startPage

function startPage() {        // 2. check who is logged in, draw the page, add event listeners
  ...
}
```

## Notes

- Passwords are stored in plain text in localStorage. That is fine for a course project, never for a real shop.
- localStorage holds about 5 MB. Uploaded product images are limited to 300 KB each; image links use no space.
- The sample orders in `data.json` have fixed dates, so the 14-day return window of the sample orders runs out over time.

## Upload to GitHub

```bash
git init
git add .
git commit -m "E-commerce project"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

To publish it as a website: repository **Settings > Pages > Deploy from branch > main**
(GitHub Pages is a real server, so the XMLHttpRequest will work there).
