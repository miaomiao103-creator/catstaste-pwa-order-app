/**
 * CatsTaste PWA Order Sync → Google Sheets
 *
 * Setup:
 * 1) Create a Google Sheet.
 * 2) Extensions → Apps Script.
 * 3) Paste this file.
 * 4) Deploy → New deployment → Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone with the link
 * 5) Copy the /exec URL into the PWA "Google Apps Script Web App URL" field.
 *
 * Important:
 * The PWA sends orders with fetch(..., mode:"no-cors") to avoid browser CORS issues.
 * Browser cannot read the response, so the PWA marks sent orders as "sent_unverified".
 * Spot-check the Sheet, then mark the local order as verified in the PWA.
 * Keep CSV/JSON export as backup during event.
 */

const SHEET_NAME = 'Orders';

const HEADERS = [
  'orderId','deviceId','createdAt','customerName','phone','email','address','notes',
  'paymentMethod','paymentStatus','shippingMethod','subtotal','discountAmount',
  'discountedSubtotal','shippingFee','total','giftEligible','freeShipping','isCod',
  'syncStatus','syncedAt','lastSyncError','itemsJson','whatsappText','serverReceivedAt','staffNotes'
];

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'CatsTaste order sync endpoint is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(ss);
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const order = JSON.parse(body);

    if (!order.orderId) throw new Error('Missing orderId');

    const existingRow = findOrderRow_(sheet, order.orderId);
    const row = HEADERS.map(h => {
      if (h === 'itemsJson') return JSON.stringify(order.items || []);
      if (h === 'serverReceivedAt') return new Date().toISOString();
      return order[h] === undefined || order[h] === null ? '' : order[h];
    });

    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
      return json_({ ok: true, action: 'updated', orderId: order.orderId });
    } else {
      sheet.appendRow(row);
      return json_({ ok: true, action: 'inserted', orderId: order.orderId });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const width = Math.max(HEADERS.length, sheet.getLastColumn() || HEADERS.length);
  const firstRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  const needsHeaders = firstRow.join('') === '' || HEADERS.some((h, i) => firstRow[i] !== h);

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findOrderRow_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(orderId)) return i + 2;
  }
  return null;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
