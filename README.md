# CatsTaste PWA v19 入口 / 落單 / 執貨

呢個版本將 app 分成 3 個頁面，方便 iPhone / iPad / Android 手機現場使用：

- `index.html`：入口首頁  
  先輸入 `名字` 同 `設備名稱`，兩個欄位只接受英文字母或數字。
- `order.html`：落單台  
  同事只負責揀貨、睇目前訂單、交俾客人填收貨資料。
- `packing.html`：執貨後台  
  集中處理 `核實賬單 / 收據 / WhatsApp文字` 同埋今日執貨清單。
- `assets/css/*.css`：各頁面樣式
- `assets/data/catalog-data.js`：本機 fallback 商品資料
- `assets/js/*.js`：各頁面互動邏輯

## 主要流程

1. 開 app 先到 `index.html`
2. 輸入名字 + 設備名稱
3. 按 `新送貨單` 進入 `order.html`
4. 揀貨後按 `結帳`，切入客人填資料模式
5. 儲存後訂單先寫入本機，再嘗試送去 Google Sheet
6. 同事喺 `packing.html` 核實賬單，之後按 `確認已寄出`

## 本機設定

儲存在 `localStorage`：

- `staffName`
- `deviceName`
- `syncUrl`

`staffName` 同 `deviceName` 驗證規則：

```text
/^[A-Za-z0-9]+$/
```

## 訂單狀態

### `syncStatus`
技術同步狀態，用嚟表示本機訂單有冇成功送到 Google Sheet。

常見值：

- `pending`
- `syncing`
- `sent_unverified`
- `verified`
- `failed`

### `fulfillmentStatus`
出貨狀態，俾執貨後台主流程使用。

- `pending` = 未寄出
- `shipped` = 已寄出

兩者分開處理，互不覆蓋。

## Google Apps Script

今版新增 / 使用：

- `markOrderShipped`

執貨後台按 `確認已寄出` 會更新 Google Sheet 內對應訂單嘅 `fulfillmentStatus`。

## PWA / 離線

- `manifest.webmanifest` 入口係 `index.html`
- `service-worker.js` 會快取：
  - `index.html`
  - `order.html`
  - `packing.html`
  - manifest / icon / logo
- 冇網時：
  - 落單台可照用本機已快取頁面同本機訂單
  - 執貨後台可用最後一次 `sheetSummary` 快取

## 部署時記得帶上

- `index.html`
- `order.html`
- `packing.html`
- `service-worker.js`
- `manifest.webmanifest`
- `google_apps_script.gs`
- `assets/css/`
- `assets/data/`
- `assets/js/`
- `brand-logo.png`
- `icon-192.png`
- `icon-512.png`
