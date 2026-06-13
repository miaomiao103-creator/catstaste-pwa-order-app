# CatsTaste Offline-first PWA Order App v17

All-in-one postal order app for the 2026 HK Pet Expo, with v17 UX polish, sticky cart bar, larger review modal, and in-app Google Sheet display.


## v17 UX polish

- Sticky mobile cart bar across the bottom with quick jump buttons.
- Hot item product cards are cleaner and more compact for busy staff.
- Checkout flow has clearer step labels: 選貨 / 客人資料 / 確認並送出.
- Save review is now a large mobile-friendly modal instead of a tiny browser confirm.
- Sheet orders remain in app tabs: 今日訂單 / 執貨 / 跟進.
- Status colors stay consistent: pending red, sent-unverified blue/yellow, verified green.

## Main idea

- Every order is saved locally first, so weak network will not lose an order.
- After local save, the app immediately attempts to send the order to Google Sheet.
- Google Sheet is the central database for all devices.
- Local storage is only backup / queue, not the final source of truth.

## Staff-facing app features

- Busy Hot Item mode: all products show quick buttons `-12 / -6 / -1 / +1 / +6 / +12`.
- Same SKU + same price mode merges into one cart line.
- Simple postal order customer form: 客人姓名, WhatsApp, 地址, 備註.
- Save + Send to Google Sheet button.
- Local dashboard: local orders, pending sends, unverified, verified, today's local total.
- Sheet dashboard: all devices' Google Sheet summary, recent orders, top items.
- Double confirmation for dangerous actions: clear current order, delete local order, mark verified, clear local test orders.
- Disabled products stay visible as 暫停接單 but cannot be added.

## Google Sheet tabs created by Apps Script

- `Orders`: raw synced order data.
- `Orders_View`: easy staff order view.
- `Packing_List`: total item quantity for packing.
- `Follow_Up`: missing / unverified / notes orders.
- `Daily_Summary`: daily totals and top items.
- `Catalog`: product source for admin catalog.

## Deployment

Upload these files to GitHub Pages root:

- `index.html`
- `service-worker.js`
- `manifest.webmanifest`
- `README.md`
- `google_apps_script.gs`

Then update Apps Script with `google_apps_script.gs` and deploy a new Web App version.

Test URL:

```text
https://miaomiao103-creator.github.io/catstaste-pwa-order-app/?v=16
```

## Important event workflow

1. Open PWA on each device while online.
2. Add to Home Screen.
3. Set Staff Name and Device copy number.
4. Update Product Catalog manually before event.
5. Save + Send each postal order.
6. If order stays red / pending, press Send All to Sheet when online.
7. Spot-check Google Sheet and Mark Verified.
8. Use Packing_List for fulfillment.


## v17 Event Ready UX changes

- Save result now shows clear next-step actions: Copy WhatsApp, New Order, View Sheet Orders.
- Success status copy uses: 本機已保存 / 已送出到雲端，請核實.
- Product quick filter chips added: 全部 / 罐裝 / 包裝 / 小食 / 福袋 / 玩具.
- Cart item Remove now uses double confirmation.
- Address short-warning appears in review popup without blocking save.
- WhatsApp receipt displays full product names and quantities, not only SKU.
- Pre-event Checklist added in Settings.
