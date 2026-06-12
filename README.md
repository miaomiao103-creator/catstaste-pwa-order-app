# CatsTaste Offline-first PWA Order App

This prototype was generated for the 2026 HK Pet Expo shipping-only pre-order flow.

## Included files

- `index.html` — single-page PWA order app
- `manifest.webmanifest` — PWA manifest
- `service-worker.js` — offline cache
- `google_apps_script.gs` — Google Sheets sync endpoint
- `brand-logo.png` — CatsTaste logo used in the app header
- `apple-touch-icon.png` / `icon-192.png` / `icon-512.png` — app icons generated from the CatsTaste company logo

## Business rules included

- Shipping only
- HK$120+ full order subtotal → 10% off unit-price items
- Original box price items are not included in the 10% discount
- HK$150+ → toy gift flag
- HK$800+ → free shipping for 順豐 / 京東 prepaid shipping
- 順豐到付 / 京東到付 → shipping fee not included in order total
- Payment methods: Cash, FPS, PayMe, Alipay, WeChat Pay, Deposit
- Payment statuses: Paid, Unpaid, Deposit paid, Pending confirmation
- Product filters: Category + 包裝類型（包裝 / 罐裝 / 小食 / 福袋 / 玩具）
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
7. Use Send Unsynced Orders when network is available.
8. Orders sent through Google Apps Script are marked `sent_unverified` because browser `no-cors` responses cannot be read.
9. Spot-check the Google Sheet, then tap Mark Verified in the PWA.
10. Export CSV/JSON backup at least every half day and after the event.

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
This means the browser cannot read the server response. The app no longer marks these requests as fully synced. It uses:

- `pending` / `failed` — needs sending
- `sent_unverified` — request was sent, but Sheet must be checked
- `verified` — staff confirmed the order exists in Google Sheet

Order numbers use Hong Kong date (`Asia/Hong_Kong`) so late-night event orders do not roll back to the previous UTC date.

## Product catalog

Loaded from `CatsTaste_productlist(1).xlsx`, sheet `Catalog`, range `A1:H63`.

Detected product count: 62 SKUs.
