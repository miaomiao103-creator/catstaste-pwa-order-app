# CatsTaste Offline-first PWA Order App

This prototype was generated for the 2026 HK Pet Expo shipping-only pre-order flow.

## Included files

- `index.html` — single-page PWA order app
- `manifest.webmanifest` — PWA manifest
- `service-worker.js` — offline cache
- `google_apps_script.gs` — Google Sheets sync endpoint
- `icon-192.svg` / `icon-512.svg` — app icons

## Business rules included

- Shipping only
- $120+ → 10% off eligible unit-price items
- Original box price items are treated as not eligible for the 10% discount
- $150+ → toy gift flag
- $800+ → free shipping for 順豐 / 京東 prepaid shipping
- 順豐到付 / 京東到付 → shipping fee not included in order total
- Payment methods: Cash, FPS, PayMe, Alipay, WeChat Pay, Deposit
- Payment statuses: Paid, Unpaid, Deposit paid, Pending confirmation
- Device prefixes: CT-A, CT-B, CT-C

## Important event workflow

1. Host the folder on HTTPS before the event. Good free options:
   - GitHub Pages
   - Cloudflare Pages
   - Netlify
2. Open the app once on each iPhone/iPad while online.
3. Add it to the Home Screen.
4. Set a different Device Prefix per device:
   - Device 1: CT-A
   - Device 2: CT-B
   - Device 3: CT-C
5. Test with Airplane Mode.
6. During the event, orders are saved locally first.
7. Use Sync Pending Orders when network is available.
8. Export CSV/JSON backup at least every half day and after the event.

## Google Sheets sync setup

1. Create a Google Sheet.
2. Open Extensions → Apps Script.
3. Paste `google_apps_script.gs`.
4. Deploy → New deployment → Web app.
5. Execute as: Me.
6. Who has access: Anyone with the link.
7. Copy the `/exec` URL.
8. Paste it in the PWA settings field.

## CORS note

The PWA sends sync requests using `mode:"no-cors"` for Google Apps Script compatibility. 
This means the browser cannot fully read the server response. The app marks a sync request as sent after the request finishes, but you should spot-check the Google Sheet and keep CSV/JSON backups.

## Product catalog

Loaded from `CatsTaste_productlist(1).xlsx`, sheet `Catalog`, range `A1:H63`.

Detected product count: 62 SKUs.
