# CatsTaste Offline-first PWA Order App — v6 Admin Catalog

This version adds a hidden Admin product manager and Google Sheet Catalog source while keeping the front desk app offline-first.

## Included files

- `index.html` — single-page PWA order app + hidden Admin panel
- `manifest.webmanifest` — PWA manifest
- `service-worker.js` — offline cache, version v6
- `google_apps_script.gs` — Orders sync + Catalog API/Admin endpoint
- optional logo/icon files may stay in GitHub repo: `brand-logo.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`

## Google Apps Script URL

The PWA is configured to use:

```text
https://script.google.com/macros/s/AKfycbxhmQKohp7H01gnBpp4hiVYvU4l6QkB82x8EfpaQN5wMLIqX-4D0SJcjOweo195Hwe5/exec
```

The front desk cannot edit this URL in Settings.

## Catalog management

Hidden Admin entry:

- Tap the header logo 5 times, or
- Open the app URL with `#admin`

Admin PIN is verified by Google Apps Script server-side. It is **not** hard-coded in the front-end.

Set PIN in Apps Script:

1. Apps Script → Project Settings
2. Script properties → Add property
3. Name: `ADMIN_PIN`
4. Value: your PIN

## Google Sheet tabs

### Orders

Used for order sync, same as previous versions.

### Catalog

Created automatically by `google_apps_script.gs` on first use. Fixed columns:

```text
active, id, sku, category, name, spec, texture, unitPrice, boxPrice, remarks, updatedAt
```

Products are not hard-deleted. Admin should set `active=false` to disable an item while preserving old SKU history.

## Front desk behavior

- The app loads catalog from local cache first.
- If no cache exists, it uses the built-in fallback catalog.
- Prices/SKUs do **not** auto-update.
- Staff must press **更新商品資料** to manually pull the latest Catalog from Google Sheet.
- Orders remain offline-first: saved to local IndexedDB first, then manually sent to Google Sheet.
- Sent orders are marked `sent_unverified`; staff should spot-check Sheet and then tap Mark Verified.

## Test plan

1. Offline: open app, search products, add to cart, calculate HK$120 discount, save order.
2. Online: press 更新商品資料; Catalog products should load from Google Sheet.
3. Admin: login with PIN, edit a product price, save, reload catalog, verify price changed.
4. Admin: deactivate a product; front desk update catalog and product should disappear from search.
5. Wrong PIN: cannot save/toggle products.
6. iPhone/iPad: admin modal should be usable without horizontal overflow.
