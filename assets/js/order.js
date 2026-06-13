const FALLBACK_PRODUCTS = Array.isArray(window.CATSTASTE_FALLBACK_PRODUCTS)
  ? window.CATSTASTE_FALLBACK_PRODUCTS
  : [];

let products = [];

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhmQKohp7H01gnBpp4hiVYvU4l6QkB82x8EfpaQN5wMLIqX-4D0SJcjOweo195Hwe5/exec';
const CATALOG_CACHE_KEY = 'catstaste_catalog_cache_v1';
const CATALOG_CACHE_META_KEY = 'catstaste_catalog_cache_meta_v1';
const PACKING_CACHE_KEY = 'catstaste_packing_dashboard_cache_v1';
const LOCAL_ADMIN_PIN = '8888';
const ADMIN_SESSION_KEY = 'catstaste_admin_session_v1';
let adminPin = '';
let adminCategoryFilter = '';
let adminPackagingFilter = '';

const DB_NAME = 'catstaste_order_db_v1';
const DB_VERSION = 1;
const ORDER_STORE = 'orders';
const SETTINGS_KEY = 'catstaste_order_settings_v1';

const PROMOS = {
  discountThreshold: 120,
  discountRate: 0.10,
  giftThreshold: 150
};

let db;
let cart = [];
let lastSavedOrder = null;
let latestSheetDashboard = null;
let sheetViewTab = 'orders';
let sheetOrderFilter = 'all';
let packingViewFilter = 'all';
let packingSortMode = 'qty';
let customerEntryMode = false;

const $ = (id) => document.getElementById(id);
const money = (n) => 'HK$' + (Number(n || 0)).toFixed(2).replace(/\.00$/, '');
const hkDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return parts;
};
const todayKey = () => {
  const p = hkDateParts();
  return `${p.year}${p.month}${p.day}`;
};
const nowHK = () => {
  const p = hkDateParts();
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
};
const nowISO = () => new Date().toISOString();
const escapeCsv = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).replaceAll('"', '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(ORDER_STORE)) {
        const store = d.createObjectStore(ORDER_STORE, { keyPath: 'orderId' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('syncStatus', 'syncStatus');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txStore(mode='readonly') {
  return db.transaction(ORDER_STORE, mode).objectStore(ORDER_STORE);
}

function putOrder(order) {
  return new Promise((resolve, reject) => {
    const req = txStore('readwrite').put(order);
    req.onsuccess = () => resolve(order);
    req.onerror = () => reject(req.error);
  });
}

function getAllOrders() {
  return new Promise((resolve, reject) => {
    const req = txStore().getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')));
    req.onerror = () => reject(req.error);
  });
}

function getOrder(orderId) {
  return new Promise((resolve, reject) => {
    const req = txStore().get(orderId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteOrder(orderId) {
  return new Promise((resolve, reject) => {
    const req = txStore('readwrite').delete(orderId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function loadSettings() {
  const defaults = { staffName: '', deviceName: '', deviceCopyNo: '', syncUrl: DEFAULT_SCRIPT_URL };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...defaults, ...saved, syncUrl: DEFAULT_SCRIPT_URL };
  } catch {
    return defaults;
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...settings, syncUrl: DEFAULT_SCRIPT_URL }));
}

function detectDeviceModel() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  if (/iPad/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android Phone' : 'Android Tablet';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return '裝置';
}

function deviceNumberSuffix(no) {
  const n = String(no || '1').trim();
  return n === '1' ? '' : `${n}號`;
}

function currentDeviceId() {
  const settings = loadSettings();
  const name = String(settings.deviceName || '').trim();
  if (name) return name;
  return detectDeviceModel().replace(/\s+/g, '-');
}

function currentStaffName() {
  return (loadSettings().staffName || '').trim();
}

function setupSettingsUI() {
  const settings = loadSettings();
  if ($('staffNameDisplay')) $('staffNameDisplay').value = settings.staffName || '';
  if ($('deviceNameDisplay')) $('deviceNameDisplay').value = settings.deviceName || currentDeviceId();
  if ($('deviceModelDisplay')) $('deviceModelDisplay').value = detectDeviceModel();
  $('syncUrl').value = DEFAULT_SCRIPT_URL;
  $('devicePill').textContent = '設備: ' + currentDeviceId();
}


function normalizeProduct(raw) {
  const p = { ...raw };
  p.id = String(p.id || p.sku || '').trim();
  p.sku = String(p.sku || p.id || '').trim().toUpperCase();
  p.category = String(p.category || '').trim();
  p.name = String(p.name || '').trim();
  p.spec = String(p.spec || '').trim();
  p.texture = String(p.texture || '').trim();
  p.remarks = String(p.remarks || '').trim();
  p.unitPrice = Number(p.unitPrice || 0);
  p.boxPrice = p.boxPrice === '' || p.boxPrice === null || p.boxPrice === undefined ? null : Number(p.boxPrice || 0);
  p.active = p.active === undefined || p.active === null || p.active === '' ? true : !['false','0','no','停用','inactive'].includes(String(p.active).toLowerCase());
  p.updatedAt = String(p.updatedAt || '');
  return p;
}

function visibleProducts() {
  return products.filter(p => p.active !== false);
}

function loadCatalogFromCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
    if (Array.isArray(cached) && cached.length) {
      products = cached.map(normalizeProduct).filter(p => p.sku && p.name);
      return 'cache';
    }
  } catch (err) { console.warn('Catalog cache read failed', err); }
  products = FALLBACK_PRODUCTS.map(normalizeProduct).filter(p => p.sku && p.name);
  return '本機預設備援';
}

function saveCatalogToCache(list) {
  const clean = (list || []).map(normalizeProduct).filter(p => p.sku && p.name);
  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(clean));
  localStorage.setItem(CATALOG_CACHE_META_KEY, JSON.stringify({ updatedAt: nowHK(), count: clean.length }));
  products = clean;
  return clean;
}

function scriptUrl() {
  return (loadSettings().syncUrl || DEFAULT_SCRIPT_URL).trim();
}

function jsonp(url, params={}, timeoutMs=15000) {
  return new Promise((resolve, reject) => {
    const cb = 'ct_cb_' + Date.now() + '_' + Math.random().toString(16).slice(2);
    const qs = new URLSearchParams({ ...params, callback: cb, _ts: Date.now() });
    const sep = url.includes('?') ? '&' : '?';
    const script = document.createElement('script');
    let settled = false;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Request timeout (${Math.round(timeoutMs / 1000)}s). 請檢查 Apps Script Web App 是否已部署為 Anyone、已完成授權，並使用最新 /exec URL。`));
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
    }
    window[cb] = (data) => {
      settled = true;
      cleanup();
      resolve(data);
    };
    script.onload = () => {
      setTimeout(() => {
        if (!settled) {
          cleanup();
          reject(new Error('Apps Script 有回應但不是 JSONP。請檢查 Web App access 是否 Anyone、是否用最新 deployment URL。'));
        }
      }, 250);
    };
    script.onerror = () => { cleanup(); reject(new Error('Network or script load failed. 請檢查網絡及 Apps Script deployment URL。')); };
    script.src = url + sep + qs.toString();
    document.body.appendChild(script);
  });
}

async function refreshCatalogFromSheet(showMessage=true) {
  const url = scriptUrl();
  if (!url) {
    if (showMessage) showSaveMessage('error', '未設定 Google Apps Script URL。');
    return false;
  }
  try {
    const data = await jsonp(url, { action: 'catalog' });
    if (!data || !data.ok || !Array.isArray(data.products)) throw new Error(data && data.error ? data.error : 'Invalid catalog response');
    if (!data.products.length) throw new Error('Catalog sheet has no products');
    const clean = saveCatalogToCache(data.products);
    initProductFilters();
    renderProducts();
    renderCart();
    if (showMessage) showSaveMessage('success', `商品資料已更新：${clean.filter(p => p.active !== false).length} 個啟用 / ${clean.length} 個 SKU。`);
    if ($('adminProductList')) renderAdminProducts();
    return true;
  } catch (err) {
    if (showMessage) showSaveMessage('error', '更新商品資料失敗：' + String(err && err.message ? err.message : err));
    return false;
  }
}

function catalogMetaText() {
  try {
    const meta = JSON.parse(localStorage.getItem(CATALOG_CACHE_META_KEY) || 'null');
    if (meta && meta.updatedAt) return `商品快取：${meta.count || 0} 個 SKU · ${meta.updatedAt}`;
  } catch {}
  return '商品快取：未更新，正使用本機備援';
}

function productPackagingType(product) {
  const spec = String(product.spec || '').trim();
  if (spec.includes('罐')) return '罐裝';
  if (spec.includes('包裝')) return '包裝';
  if (spec.includes('福袋')) return '福袋';
  if (spec.toLowerCase() === 'toy') return '玩具';
  if (String(product.texture || '').includes('肉棒') || String(product.category || '').includes('Snack')) return '小食 / 肉棒';
  return spec || '其他';
}

function productSeriesKey(category) {
  const text = String(category || '');
  const lower = text.toLowerCase();
  if (lower.includes('tasty') || text.includes('美味')) return 'tasty';
  if (lower.includes('healthy') || text.includes('健康')) return 'healthy';
  if (lower.includes('purrfect') || text.includes('主食罐')) return 'purrfect';
  if (lower.includes('kitten') || text.includes('幼貓')) return 'kitten';
  if (lower.includes('senior') || text.includes('老年')) return 'senior';
  if (lower.includes('snack') || text.includes('小食')) return 'snack';
  if (lower.includes('toy') || text.includes('公仔') || text.includes('玩具')) return 'toy';
  return text ? 'other' : '';
}

function productSeriesTheme(category) {
  const key = productSeriesKey(category);
  if (key === 'tasty') return { color: '#F5C842', ink: '#2f2400', soft: 'rgba(245, 200, 66, .13)' };
  if (key === 'healthy') return { color: '#5BAD6F', ink: '#ffffff', soft: 'rgba(91, 173, 111, .12)' };
  if (key === 'purrfect') return { color: '#4A90C4', ink: '#ffffff', soft: 'rgba(74, 144, 196, .12)' };
  if (key === 'kitten') return { color: '#F48FB1', ink: '#401124', soft: 'rgba(244, 143, 177, .14)' };
  if (key === 'senior') return { color: '#9B59B6', ink: '#ffffff', soft: 'rgba(155, 89, 182, .12)' };
  if (key === 'snack') return { color: '#F39C12', ink: '#2d1800', soft: 'rgba(243, 156, 18, .14)' };
  if (key === 'toy') return { color: '#6B8AF2', ink: '#ffffff', soft: 'rgba(107, 138, 242, .12)' };
  return { color: '#6B7A90', ink: '#ffffff', soft: 'rgba(107, 122, 144, .10)' };
}

function productSeriesLabel(category) {
  const key = productSeriesKey(category);
  if (key === 'tasty') return '美味';
  if (key === 'healthy') return '健康';
  if (key === 'purrfect') return '主食罐';
  if (key === 'kitten') return '幼貓';
  if (key === 'senior') return '老年 7+';
  if (key === 'snack') return '小食';
  if (key === 'toy') return '玩具';
  return String(category || '') || '其他';
}

function availableSeriesKeys() {
  const order = ['tasty', 'healthy', 'purrfect', 'kitten', 'senior', 'snack', 'toy', 'other'];
  return [...new Set(products.map(p => productSeriesKey(p.category)).filter(Boolean))]
    .sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)));
}

function initProductFilters() {
  const currentCategory = $('categoryFilter').value || '';
  const currentPackaging = $('packagingFilter').value || '';
  const categories = availableSeriesKeys();
  const packagingTypes = [...new Set(products.map(productPackagingType).filter(Boolean))].sort((a,b) => {
    const order = ['包裝', '罐裝', '小食 / 肉棒', '福袋', '玩具', '其他'];
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'zh-Hant');
  });
  $('categoryFilter').innerHTML = '<option value="">全部系列</option>' + categories.map(c => `<option value="${htmlEscape(c)}">${htmlEscape(productSeriesLabel(c))}</option>`).join('');
  $('packagingFilter').innerHTML = '<option value="">全部包裝類型</option>' + packagingTypes.map(t => `<option value="${htmlEscape(t)}">${htmlEscape(t)}</option>`).join('');
  if ($('categoryQuickChips')) {
    $('categoryQuickChips').innerHTML = [
      `<button type="button" data-category="" onclick="setQuickCategoryFilter('')">全部</button>`,
      ...categories.map(category => {
        const theme = productSeriesTheme(category);
        return `<button type="button" data-category="${htmlEscape(category)}" onclick="setQuickCategoryFilter('${jsString(category)}')" style="border-color:${theme.color};color:${theme.color}">${htmlEscape(productSeriesLabel(category))}</button>`;
      })
    ].join('');
  }
  $('productCount').textContent = `${visibleProducts().length} 個啟用 / ${products.length} 個 SKU`;
  if ($('heroSkuCount')) $('heroSkuCount').textContent = `${visibleProducts().length} SKUs`;
  if ([...$('categoryFilter').options].some(o => o.value === currentCategory)) $('categoryFilter').value = currentCategory;
  if ([...$('packagingFilter').options].some(o => o.value === currentPackaging)) $('packagingFilter').value = currentPackaging;
  if (!$('searchInput').dataset.bound) {
    $('searchInput').addEventListener('input', () => {
      updateSearchClearButton();
      renderProducts({ scrollTop: true });
    });
    $('categoryFilter').addEventListener('change', () => renderProducts({ scrollTop: true }));
    $('packagingFilter').addEventListener('change', () => renderProducts({ scrollTop: true }));
    $('clearSearchBtn').addEventListener('click', () => {
      $('searchInput').value = '';
      updateSearchClearButton();
      renderProducts({ scrollTop: true });
      $('searchInput').focus();
    });
    $('searchInput').dataset.bound = '1';
  }
  updateSearchClearButton();
  renderProducts();
}

function updateQuickFilterChips() {
  const selectedCategory = $('categoryFilter') ? $('categoryFilter').value : '';
  document.querySelectorAll('.quick-filter-chips button[data-category]').forEach(btn => {
    const active = String(btn.dataset.category || '') === String(selectedCategory || '');
    btn.classList.toggle('active', active);
    if (active && btn.dataset.category) {
      const theme = productSeriesTheme(btn.dataset.category);
      btn.style.background = theme.color;
      btn.style.color = theme.ink;
      btn.style.borderColor = theme.color;
    } else if (btn.dataset.category) {
      const theme = productSeriesTheme(btn.dataset.category);
      btn.style.background = '#fff';
      btn.style.color = theme.color;
      btn.style.borderColor = theme.color;
    } else {
      btn.style.background = active ? 'var(--brand-dark)' : '#fff';
      btn.style.color = active ? '#fff' : 'var(--brand-dark)';
      btn.style.borderColor = active ? 'var(--brand-dark)' : '#c9d9fa';
    }
  });
  const selected = $('packagingFilter') ? $('packagingFilter').value : '';
  document.querySelectorAll('.quick-filter-chips button[data-packaging]').forEach(btn => {
    btn.classList.toggle('active', String(btn.dataset.packaging || '') === String(selected || ''));
  });
}

window.setQuickCategoryFilter = function(value) {
  if (!$('categoryFilter')) return;
  $('categoryFilter').value = value || '';
  updateQuickFilterChips();
  renderProducts({ scrollTop: true });
};

window.setQuickPackagingFilter = function(value) {
  if (!$('packagingFilter')) return;
  $('packagingFilter').value = value || '';
  updateQuickFilterChips();
  renderProducts({ scrollTop: true });
};

window.resetProductFilters = function() {
  if ($('searchInput')) $('searchInput').value = '';
  if ($('categoryFilter')) $('categoryFilter').value = '';
  if ($('packagingFilter')) $('packagingFilter').value = '';
  updateSearchClearButton();
  updateQuickFilterChips();
  renderProducts({ scrollTop: true });
};

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function productCartQty(sku, mode='') {
  return cart
    .filter(x => x.sku === sku && (!mode || x.priceMode === mode))
    .reduce((sum, x) => sum + Number(x.qty || 0), 0);
}

function productQtyControlsHtml(product, mode, qty) {
  const disabled = product.active === false ? 'disabled' : '';
  const sku = jsString(product.sku);
  return `<div class="product-qty-controls" aria-label="${htmlEscape(mode === 'box' ? '原箱數量' : '單件數量')}">
    <button type="button" ${disabled} onclick="adjustProduct('${sku}', -1, '${mode}')">-</button>
    <span>${Number(qty || 0)}</span>
    <button type="button" ${disabled} onclick="adjustProduct('${sku}', 1, '${mode}')">+</button>
  </div>`;
}

function scrollToProductResults() {
  const card = document.querySelector('.search-card');
  if (!card) return;
  const top = Math.max(0, window.scrollY + card.getBoundingClientRect().top - 78);
  window.scrollTo({ top, behavior: 'smooth' });
}

function productCardSummaryHtml(product, unitQty, boxQty) {
  const boxPieces = productBoxQty(product);
  const totalPieces = Number(unitQty || 0) + Number(boxQty || 0) * Number(boxPieces || 1);
  const subtotal = round2(Number(unitQty || 0) * Number(product.unitPrice || 0) + Number(boxQty || 0) * Number(product.boxPrice || 0));
  const boxPart = Number(boxQty || 0) ? `｜原箱 ${boxQty} 箱` : '';
  return `<div class="product-card-summary"><div>已選 ${totalPieces} 件${boxPart}</div><div><span>小計</span> ${money(subtotal)}</div></div>`;
}

function productDisplayParts(product) {
  const rawName = String(product.name || '').replace(/\r/g, '').trim();
  const packagingType = productPackagingType(product);
  if (packagingType !== '福袋' || !rawName.includes('\n')) {
    return { title: rawName, subtitle: '' };
  }
  const lines = rawName.split('\n').map(line => line.trim()).filter(Boolean);
  return {
    title: lines[0] || rawName,
    subtitle: lines.slice(1).join('\n')
  };
}

function renderProducts(options={}) {
  updateQuickFilterChips();
  const q = $('searchInput').value.trim().toLowerCase();
  const cat = $('categoryFilter').value;
  const packaging = $('packagingFilter').value;
  const filtered = products.filter(p => {
    const packagingType = productPackagingType(p);
    const text = `${p.sku} ${p.category} ${packagingType} ${p.name} ${p.spec} ${p.texture}`.toLowerCase();
    return (!cat || productSeriesKey(p.category) === cat) && (!packaging || packagingType === packaging) && (!q || text.includes(q));
  }).sort((a, b) => (a.active === false) - (b.active === false) || String(a.sku).localeCompare(String(b.sku))).slice(0, 80);

  $('productList').innerHTML = filtered.map(p => {
    const hasBox = p.boxPrice !== null && p.boxPrice !== undefined && p.boxPrice !== '';
    const theme = productSeriesTheme(p.category);
    const boxSaving = Math.max(0, productBoxSavings(p));
    const unitQty = productCartQty(p.sku, 'unit');
    const boxQty = productCartQty(p.sku, 'box');
    const display = productDisplayParts(p);
    return `
      <div class="product ${p.active === false ? 'inactive' : ''}" style="--series-color:${theme.color}; --series-ink:${theme.ink}; --series-soft:${theme.soft}">
        <div class="product-top">
          <div>
            <div class="product-title">${htmlEscape(display.title)}</div>
            ${display.subtitle ? `<div class="product-subtitle">${htmlEscape(display.subtitle)}</div>` : ''}
            <div class="product-meta compact-prices">
              <span class="tag series-tag"><span class="series-dot" aria-hidden="true"></span>${htmlEscape(productSeriesLabel(p.category))}</span>
              ${hasBox ? `<span class="tag box-saving-tag">原箱優惠 - ${money(boxSaving)}</span>` : ''}
              <span class="tag">單件 ${money(p.unitPrice)}</span>
              ${hasBox ? `<span class="tag">原箱 ${money(p.boxPrice)}</span>` : ''}
              <span class="tag packaging-tag">${htmlEscape(productPackagingType(p))}</span>
              ${p.active === false ? `<span class="tag" style="color:var(--bad);border-color:#ffc9c2;background:#fff2f0">暫停接單</span>` : ''}
            </div>
          </div>
        </div>
        ${p.remarks ? `<div class="small product-remarks">${htmlEscape(p.remarks)}</div>` : ''}
        <div class="product-actions">
          <div class="quick-actions ${hasBox ? 'has-box' : 'no-box'}" aria-label="商品快速加減">
            ${hasBox ? `<button type="button" class="minus" ${p.active === false ? 'disabled' : ''} onclick="adjustProduct('${jsString(p.sku)}', -1, 'box')">箱-1</button>` : ''}
            <button type="button" class="minus" ${p.active === false ? 'disabled' : ''} onclick="adjustProduct('${jsString(p.sku)}', -6, 'unit')">-6</button>
            ${productQtyControlsHtml(p, 'unit', unitQty)}
            <button type="button" class="plus" ${p.active === false ? 'disabled' : ''} onclick="adjustProduct('${jsString(p.sku)}', 6, 'unit')">+6</button>
            ${hasBox ? `<button type="button" class="plus box-plus" ${p.active === false ? 'disabled' : ''} onclick="adjustProduct('${jsString(p.sku)}', 1, 'box')">箱+1</button>` : ''}
          </div>
          ${productCardSummaryHtml(p, unitQty, boxQty)}
        </div>
      </div>
    `;
  }).join('') || `
    <div class="empty-state">
      <div class="empty-state-copy">
        <strong>搵唔到呢件產品</strong>
        <div class="small">你而家揀嘅系列、包裝類型或者搜尋字眼冇對應商品。</div>
      </div>
      <div class="btns">
        <button type="button" onclick="resetProductFilters()">清除篩選</button>
        <button type="button" class="secondary" onclick="document.getElementById('searchInput')?.focus()">重新搜尋</button>
      </div>
    </div>`;
  if (options.scrollTop) setTimeout(scrollToProductResults, 0);
}

function cssId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function jsString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function updateSearchClearButton() {
  const input = $('searchInput');
  const button = $('clearSearchBtn');
  if (!input || !button) return;
  button.classList.toggle('hidden', !input.value.trim());
}

function setCustomerEntryMode(enabled) {
  customerEntryMode = !!enabled;
  document.body.classList.toggle('customer-entry-mode', customerEntryMode);
  const shell = $('customerModeShell');
  if (shell) shell.classList.toggle('active', customerEntryMode);
  const handoffBtn = $('handoffToCustomerBtn');
  if (handoffBtn) handoffBtn.disabled = !cart.length;
  const step = document.querySelector('.flow-step');
  if (step) step.textContent = customerEntryMode ? '第 2 步 · 客人填資料' : '第 1 步 · 選貨';
  updateCustomerModeSummary();
  if (customerEntryMode) {
    setTimeout(() => $('customerName')?.focus(), 80);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateCustomerModeSummary(t = calculateTotals()) {
  const itemCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  if ($('customerModeItemCount')) $('customerModeItemCount').textContent = `${itemCount} 件`;
  if ($('customerModeTotal')) $('customerModeTotal').textContent = money(t.total);
  if ($('customerModeTotalLabel')) $('customerModeTotalLabel').textContent = totalAmountLabel(t);
  if ($('customerModeItems')) {
    $('customerModeItems').innerHTML = cart.map(x => `<div class="customer-mode-item"><span>${htmlEscape(x.name || '產品')}</span><strong>${htmlEscape(x.priceMode === 'box' ? `${Number(x.qty || 0)} 箱` : `${Number(x.qty || 0)} 件`)}</strong></div>`).join('') || '<div class="notice">未有產品。</div>';
  }
}

function hasAnyDiscount(totals) {
  return Number(totals && totals.totalDiscountAmount || 0) > 0;
}

function totalAmountLabel(totals) {
  return hasAnyDiscount(totals) ? '優惠後應收' : '應收總額';
}

function productInputQty(sku) {
  const input = $('qty-' + cssId(sku));
  return Math.max(1, Number(input && input.value ? input.value : 1));
}

function productInputMode(sku) {
  const select = $('mode-' + cssId(sku));
  return select ? select.value : 'unit';
}

function productInputPrice(product, sku) {
  const mode = productInputMode(sku);
  return mode === 'box' ? Number(product.boxPrice || product.unitPrice || 0) : Number(product.unitPrice || 0);
}

function productBoxQty(product) {
  const text = `${product.remarks || ''} ${product.name || ''}`;
  const m = text.match(/(?:1\s*)?箱\s*(\d+)\s*件/);
  if (m) return Number(m[1]);
  if (String(product.spec || '').includes('罐')) return 24;
  if (product.boxPrice) return 48;
  return 1;
}

function productBoxOriginalTotal(product, boxCount = 1) {
  return round2(Number(product.unitPrice || 0) * productBoxQty(product) * Number(boxCount || 1));
}

function productBoxSavings(product, boxCount = 1) {
  if (!product.boxPrice) return 0;
  return round2(productBoxOriginalTotal(product, boxCount) - Number(product.boxPrice || 0) * Number(boxCount || 1));
}

window.updateProductSubtotal = function(sku) {
  const product = products.find(x => x.sku === sku);
  const subtotalEl = $('subtotal-' + cssId(sku));
  if (!product || !subtotalEl) return;
  subtotalEl.textContent = money(productInputQty(sku) * productInputPrice(product, sku));
};

function setProductQtyInCart(sku, mode, delta) {
  const p = products.find(x => x.sku === sku);
  if (!p) return;
  const price = mode === 'box' ? Number(p.boxPrice || p.unitPrice || 0) : Number(p.unitPrice || 0);
  const existing = cart.find(x => x.sku === p.sku && x.priceMode === mode && Number(x.unitPrice) === Number(price));
  if (existing) {
    existing.qty = Math.max(0, Number(existing.qty || 0) + Number(delta || 0));
    if (existing.qty <= 0) {
      cart = cart.filter(x => x !== existing);
      renderCart();
      renderProducts();
      return;
    }
    existing.lineSubtotal = round2(existing.qty * existing.unitPrice);
    if (mode === 'box') {
      existing.boxQty = productBoxQty(p);
      existing.originalLineTotal = productBoxOriginalTotal(p, existing.qty);
      existing.boxSavings = Math.max(0, productBoxSavings(p, existing.qty));
    }
  } else if (Number(delta || 0) > 0) {
    const qty = Number(delta || 0);
    const lineId = `${sku}-${mode}`;
    cart.push({
      lineId,
      sku: p.sku,
      category: p.category,
      name: p.name,
      spec: p.spec,
      texture: p.texture,
      packagingType: productPackagingType(p),
      priceMode: mode,
      qty,
      unitPrice: price,
      originalUnitPrice: p.unitPrice,
      boxPrice: p.boxPrice,
      boxQty: mode === 'box' ? productBoxQty(p) : 1,
      originalLineTotal: mode === 'box' ? productBoxOriginalTotal(p, qty) : qty * Number(p.unitPrice || price),
      boxSavings: mode === 'box' ? Math.max(0, productBoxSavings(p, qty)) : 0,
      lineSubtotal: round2(qty * price),
      discountEligible: mode !== 'box',
      remarks: p.remarks || ''
    });
  }
  renderCart();
  renderProducts();
}

window.adjustProduct = function(sku, delta, mode='unit') {
  setProductQtyInCart(sku, mode, delta);
};

window.addProduct = function(sku) {
  setProductQtyInCart(sku, productInputMode(sku), productInputQty(sku));
};

window.removeLine = function(lineId) {
  const line = cart.find(x => x.lineId === lineId);
  const label = line ? `${line.sku} ${line.name || ''}` : '呢件貨';
  const ok = doubleConfirm('Remove cart item', `將會由目前購物車移除：${label}`);
  if (!ok) return;
  cart = cart.filter(x => x.lineId !== lineId);
  renderCart();
  renderProducts();
};

window.adjustCartLine = function(lineId, delta) {
  const line = cart.find(x => x.lineId === lineId);
  if (!line) return;
  line.qty = Math.max(0, Number(line.qty || 0) + Number(delta || 0));
  if (line.qty <= 0) {
    cart = cart.filter(x => x.lineId !== lineId);
  } else {
    line.lineSubtotal = round2(line.qty * line.unitPrice);
    if (line.priceMode === 'box') {
      const p = products.find(x => x.sku === line.sku) || line;
      line.boxQty = productBoxQty(p);
      line.originalLineTotal = productBoxOriginalTotal(p, line.qty);
      line.boxSavings = Math.max(0, productBoxSavings(p, line.qty));
    }
  }
  renderCart();
  renderProducts();
};

function calculateTotals() {
  const eligibleSubtotal = cart.filter(x => x.discountEligible).reduce((s,x) => s + x.qty*x.unitPrice, 0);
  const nonEligibleSubtotal = cart.filter(x => !x.discountEligible).reduce((s,x) => s + x.qty*x.unitPrice, 0);
  const subtotal = round2(eligibleSubtotal + nonEligibleSubtotal); // actual item subtotal using chosen unit/box prices
  const boxDiscountAmount = round2(cart.reduce((s,x) => s + Number(x.boxSavings || 0), 0));
  const retailSubtotal = round2(subtotal + boxDiscountAmount); // before box offer + 10% discount
  const discountTriggered = subtotal >= PROMOS.discountThreshold;
  const discountAmount = discountTriggered ? round2(eligibleSubtotal * PROMOS.discountRate) : 0;
  const discountedSubtotal = round2(subtotal - discountAmount);
  const giftEligible = discountedSubtotal >= PROMOS.giftThreshold;
  const shippingMethod = $('shippingMethod') ? $('shippingMethod').value : 'SF';
  const totalDiscountAmount = round2(boxDiscountAmount + discountAmount);
  const total = round2(discountedSubtotal);
  return {
    eligibleSubtotal, nonEligibleSubtotal, retailSubtotal, subtotal, boxDiscountAmount, discountTriggered, discountAmount,
    discountedSubtotal, giftEligible, shippingMethod, totalDiscountAmount, total
  };
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function renderCart() {
  const has = cart.length > 0;
  $('cartEmpty').classList.toggle('hidden', has);
  $('cartWrap').classList.toggle('hidden', !has);
  $('cartBody').innerHTML = cart.map(x => `
    <tr>
      <td class="cart-name"><strong>${htmlEscape(x.name || '產品')}</strong><br><span class="small">${htmlEscape(x.priceMode === 'box' ? '原箱' : '單件')} x ${Number(x.qty || 0)}</span></td>
      <td class="num"><div class="cart-qty-controls"><button class="ghost" onclick="adjustCartLine('${x.lineId}', -1)">-</button><span>${x.qty}</span><button class="ghost" onclick="adjustCartLine('${x.lineId}', 1)">+</button></div></td>
      <td class="num">${money(x.unitPrice)}</td>
      <td class="num">${money(x.qty*x.unitPrice)}</td>
      <td class="num"><button class="ghost cart-remove-btn" onclick="removeLine('${x.lineId}')">移除</button></td>
    </tr>
  `).join('');
  renderSummary();
}

function renderSummary() {
  const t = calculateTotals();
  const finalTotalLabel = totalAmountLabel(t);
  const rows = [
    `<div class="summary-row"><span>商品總數</span><span>${money(t.retailSubtotal)}</span></div>`,
    t.boxDiscountAmount > 0 ? `<div class="summary-row"><span>原箱優惠</span><span>-${money(t.boxDiscountAmount)}</span></div>` : '',
    t.discountAmount > 0 ? `<div class="summary-row"><span>滿 HK$120 九折優惠</span><span>-${money(t.discountAmount)}</span></div>` : '',
    t.totalDiscountAmount > 0 ? `<div class="summary-row"><span>總優惠</span><span>-${money(t.totalDiscountAmount)}</span></div>` : '',
    `<div class="summary-row total-row"><span><strong>${finalTotalLabel}</strong></span><span><strong>${money(t.total)}</strong></span></div>`
  ].filter(Boolean).join('');
  $('summary').innerHTML = `
    ${rows}
  `;
  let notes = [];
  if (t.boxDiscountAmount > 0) notes.push(`📦 原箱優惠 - ${money(t.boxDiscountAmount)}。`);
  if (t.discountTriggered && t.eligibleSubtotal > 0) {
    notes.push('✅ 全單已滿 HK$120，所有單件貨品已套用 9 折。');
  } else if (t.discountTriggered) {
    notes.push('ℹ️ 全單已滿 HK$120，但目前只有原箱價 / 不參與九折貨品。');
  } else {
    notes.push(`未達滿 HK$120 9折，全單尚差 ${money(Math.max(0, PROMOS.discountThreshold - t.subtotal))}。`);
  }
  notes.push(t.giftEligible ? '🎁 已達滿 HK$150 送玩具。' : `未達滿 HK$150 送玩具，尚差 ${money(Math.max(0, PROMOS.giftThreshold - t.discountedSubtotal))}。`);
  notes.push(`<strong>即場收款：${money(t.total)}</strong>`);
  $('promoNotice').innerHTML = notes.join('<br>');
  updateCartSummaryUI(t);
  updateCustomerModeSummary(t);
}

function updateCartSummaryUI(t = calculateTotals()) {
  const itemCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const lineCount = cart.length;
  if ($('cartLineCount')) $('cartLineCount').textContent = `${lineCount} 項`;
  const mobileBar = document.querySelector('.mobile-cart-bar');
  if (mobileBar) mobileBar.classList.toggle('hidden', itemCount === 0);
}

['shippingMethod'].forEach(id => document.addEventListener('change', e => {
  if (e.target && e.target.id === id) renderSummary();
}));

function validateOrder() {
  const errors = [];
  if (!cart.length) errors.push('請先加入至少一件產品。');
  if (!$('customerName').value.trim()) errors.push('請填客人姓名。');
  if (!$('phone').value.trim()) errors.push('請填電話 / WhatsApp。');
  if (!$('address').value.trim()) errors.push('Shipping order 必須填地址。');
  return errors;
}

async function nextOrderId() {
  const deviceId = currentDeviceId();
  const key = `seq_${deviceId}_${todayKey()}`;
  const next = Number(localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, String(next));
  return `${deviceId}-${todayKey()}-${String(next).padStart(4, '0')}`;
}

function shippingLabel(v) {
  return {
    SF: '順豐',
    JD: '京東',
    SF_COD: '順豐到付',
    JD_COD: '京東到付'
  }[v] || v;
}

function buildWhatsAppText(order) {
  const lines = order.items.map((x, i) => {
    const boxText = x.priceMode === 'box' ? `（原箱｜原箱優惠 - ${money(x.boxSavings || 0)}）` : '';
    const itemName = String(x.name || '產品').replace(/\n/g, ' ');
    return `${i+1}. ${itemName} x ${x.qty}${x.priceMode === 'box' ? ' 原箱' : ''} = ${money(x.qty*x.unitPrice)}${boxText}`;
  });
  const giftText = order.giftEligible ? '\n🎁 已達滿 HK$150 送玩具' : '';
  const shipText = shippingLabel(order.shippingMethod);
  const noteLines = [];
  if (order.notes) noteLines.push(`客人備註: ${order.notes}`);
  if (order.staffNotes) noteLines.push(`取貨 / 出貨備註: ${order.staffNotes}`);
  const notesText = noteLines.length ? `\n\n備註:\n${noteLines.join('\n')}` : '';
  const finalTotalLabel = totalAmountLabel(order);
  return `Hi ${order.customerName}，以下係你嘅 2026 HK 寵物展預訂單：

訂單編號：${order.orderId}

產品：
${lines.join('\n')}

商品總數: ${money(order.retailSubtotal || order.subtotal)}
原箱優惠 - ${money(order.boxDiscountAmount || 0)}
滿 HK$120 九折優惠: -${money(order.discountAmount)}
總優惠: -${money(order.totalDiscountAmount || ((order.boxDiscountAmount || 0) + (order.discountAmount || 0)))}
${finalTotalLabel}: ${money(order.total)}${giftText}

送貨方式: ${shipText}
地址: ${order.address}
${notesText}

Please confirm, and send us "Yes", 我哋會稍後確認付款及送貨安排，多謝！`;
}


function doubleConfirm(title, detail='') {
  const msg1 = `${title}\n\n${detail}\n\n請先確認一次。`;
  const msg2 = `${title}\n\n最後確認：此動作不能復原。`;
  return window.confirm(msg1) && window.confirm(msg2);
}

function buildOrderReviewText(totals) {
  const itemLines = cart.slice(0, 8).map(x => `• ${x.name || '產品'} ${x.priceMode === 'box' ? '原箱' : '單件'} x ${x.qty} = ${money(x.qty * x.unitPrice)}`);
  const more = cart.length > 8 ? `\n• ...另有 ${cart.length - 8} 項產品` : '';
  return `請核對訂單資料：\n\n客人：${$('customerName').value.trim()}\nWhatsApp：${$('phone').value.trim()}\n地址：${$('address').value.trim()}\n\n產品：\n${itemLines.join('\n')}${more}\n\n商品總數：${money(totals.retailSubtotal)}\n原箱優惠 - ${money(totals.boxDiscountAmount)}\n九折優惠：-${money(totals.discountAmount)}\n總優惠：-${money(totals.totalDiscountAmount)}\n${totalAmountLabel(totals)}：${money(totals.total)}\n\n確認儲存？`;
}

function addressWarningMessage(address) {
  const a = String(address || '').trim();
  if (!a) return '';
  const compact = a.replace(/\s+/g, '');
  const hasDigit = /\d/.test(a);
  if (compact.length < 8 || !hasDigit) {
    return '地址可能太短，請確認有地區 / 大廈 / 樓層 / 單位。';
  }
  return '';
}

function buildOrderReviewHtml(totals) {
  const itemLines = cart.slice(0, 10).map(x => `
    <div class="review-item">
      <span><strong>${htmlEscape(x.name || '產品')}</strong><br><span class="small">${htmlEscape(x.priceMode === 'box' ? '原箱' : '單件')} x ${Number(x.qty || 0)}</span></span>
      <strong>${money(x.qty * x.unitPrice)}</strong>
    </div>`).join('');
  const more = cart.length > 10 ? `<div class="small">另有 ${cart.length - 10} 項產品未顯示，會照樣儲存。</div>` : '';
  const summaryRows = [
    `<div class="summary-row"><span>商品總數</span><span>${money(totals.retailSubtotal)}</span></div>`,
    totals.boxDiscountAmount > 0 ? `<div class="summary-row"><span>原箱優惠</span><span>-${money(totals.boxDiscountAmount)}</span></div>` : '',
    totals.discountAmount > 0 ? `<div class="summary-row"><span>滿 HK$120 九折優惠</span><span>-${money(totals.discountAmount)}</span></div>` : '',
    totals.totalDiscountAmount > 0 ? `<div class="summary-row"><span>總優惠</span><span>-${money(totals.totalDiscountAmount)}</span></div>` : ''
  ].filter(Boolean).join('');
  return `
    <div class="review-keyline">
      <div class="review-field"><span>客人</span>${htmlEscape($('customerName').value.trim())}</div>
      <div class="review-field"><span>WhatsApp</span>${htmlEscape($('phone').value.trim())}</div>
      <div class="review-field"><span>地址</span>${htmlEscape($('address').value.trim())}</div>
      ${$('notes').value.trim() ? `<div class="review-field"><span>備註</span>${htmlEscape($('notes').value.trim())}</div>` : ''}
    </div>
    ${addressWarningMessage($('address').value.trim()) ? `<div class="address-warning">⚠️ ${htmlEscape(addressWarningMessage($('address').value.trim()))}</div>` : ''}
    <div class="review-field"><span>產品清單</span>${cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)} 件</div>
    <div class="review-items">${itemLines}${more}</div>
    <div class="review-keyline">${summaryRows}</div>
    <div class="review-total"><span>${totalAmountLabel(totals)}</span><span>${money(totals.total)}</span></div>`;
}

function showOrderReviewModal(totals) {
  return new Promise(resolve => {
    const modal = $('reviewModal');
    $('reviewBody').innerHTML = buildOrderReviewHtml(totals);
    modal.classList.remove('hidden');
    const close = (value) => {
      modal.classList.add('hidden');
      $('reviewCancelBtn').onclick = null;
      $('reviewConfirmBtn').onclick = null;
      resolve(value);
    };
    $('reviewCancelBtn').onclick = () => close(false);
    $('reviewConfirmBtn').onclick = () => close(true);
  });
}

async function clearLocalTestOrders() {
  const orders = await getAllOrders();
  if (!orders.length) {
    showSaveMessage('notice', '本機暫時冇 saved orders。');
    return;
  }
  const ok = doubleConfirm('清空本機測試單', `將會刪除本機 ${orders.length} 張 saved orders。\n不會刪 Google Sheet 資料。\n正式展覽期間請勿使用。`);
  if (!ok) return;
  await Promise.all(orders.map(o => deleteOrder(o.orderId)));
  $('receiptBox').textContent = '本機測試單已清空。';
  showSaveMessage('success', `已清空本機 ${orders.length} 張 orders。`);
  await refreshOrders();
}

async function showDailySummary() {
  const orders = await getAllOrders();
  const p = hkDateParts();
  const today = `${p.year}-${p.month}-${p.day}`;
  const todayOrders = orders.filter(o => String(o.createdAt || '').slice(0, 10) === today);
  const total = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const pending = todayOrders.filter(o => needsSend(o.syncStatus)).length;
  const unverified = todayOrders.filter(o => o.syncStatus === 'sent_unverified').length;
  const verified = todayOrders.filter(o => isVerifiedStatus(o.syncStatus)).length;
  const qtyBySku = {};
  todayOrders.forEach(o => (o.items || []).forEach(item => {
    const key = item.sku || item.name || 'Unknown';
    qtyBySku[key] = (qtyBySku[key] || 0) + Number(item.qty || 0);
  }));
  const topItems = Object.entries(qtyBySku)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sku, qty], idx) => `${idx + 1}. ${htmlEscape(sku)} x ${qty}`)
    .join('<br>') || '未有商品資料';
  const box = $('dailySummaryBox');
  box.classList.remove('hidden');
  box.innerHTML = `<strong>每日總結 · ${today}</strong><br>
    今日訂單：${todayOrders.length}<br>
    今日總額：${money(total)}<br>
    未送出：${pending}｜待核實：${unverified}｜已核實：${verified}<br>
    <br><strong>熱賣產品</strong><br>${topItems}`;
}

async function showPreEventChecklist() {
  const orders = await getAllOrders();
  let catalogMeta = null;
  try { catalogMeta = JSON.parse(localStorage.getItem(CATALOG_CACHE_META_KEY) || 'null'); } catch {}
  const settings = loadSettings();
  const checks = [
    { label: 'Sync URL 已固定', ok: !!scriptUrl(), detail: scriptUrl() ? 'OK' : '未設定' },
    { label: '同事名已填', ok: !!currentStaffName(), detail: currentStaffName() || '未填' },
    { label: '設備名稱正常', ok: !!currentDeviceId(), detail: currentDeviceId() },
    { label: '商品資料已更新 / 有備援', ok: !!(catalogMeta && catalogMeta.count) || products.length > 0, detail: catalogMeta && catalogMeta.count ? `${catalogMeta.count} 個 SKU · ${catalogMeta.updatedAt || ''}` : `${products.length} 個本機備援 SKU` },
    { label: '本機測試單已清空', ok: orders.length === 0, warn: orders.length > 0, detail: orders.length === 0 ? '0 張訂單' : `${orders.length} 張本機訂單` },
    { label: '目前網絡', ok: navigator.onLine, detail: navigator.onLine ? '連線中' : '離線' },
    { label: '雲端資料已更新', ok: !!(latestSheetDashboard && latestSheetDashboard.ok), warn: !(latestSheetDashboard && latestSheetDashboard.ok), detail: latestSheetDashboard && latestSheetDashboard.ok ? `今日 ${latestSheetDashboard.todayOrders || 0} 張訂單` : '未更新，可按更新今日執貨清單' }
  ];
  const html = `<strong>展前檢查清單</strong><div class="checklist">${checks.map(c => {
    const cls = c.ok ? 'ok' : c.warn ? 'warn' : 'bad';
    const icon = c.ok ? '✅' : c.warn ? '⚠️' : '❌';
    return `<div class="check-item ${cls}"><span>${icon} ${htmlEscape(c.label)}</span><strong>${htmlEscape(c.detail || '')}</strong></div>`;
  }).join('')}</div>`;
  const box = $('preEventChecklistBox');
  box.classList.remove('hidden');
  box.innerHTML = html;
}

async function saveCurrentOrder() {
  const errors = validateOrder();
  if (errors.length) {
    showSaveMessage('error', errors.join('<br>'));
    return;
  }
  const totals = calculateTotals();
  const reviewOk = await showOrderReviewModal(totals);
  if (!reviewOk) {
    showSaveMessage('notice', '已取消儲存，請繼續修改訂單。');
    return;
  }
  const orderId = await nextOrderId();
  const order = {
    orderId,
    deviceId: currentDeviceId(),
    deviceModel: detectDeviceModel(),
    deviceName: currentDeviceId(),
    deviceCopyNo: loadSettings().deviceCopyNo || '',
    staffName: currentStaffName(),
    createdAt: nowHK(),
    customerName: $('customerName').value.trim(),
    phone: $('phone').value.trim(),
    email: $('email').value.trim(),
    address: $('address').value.trim(),
    notes: $('notes').value.trim(),
    staffNotes: $('staffNotes').value.trim(),
    paymentMethod: $('paymentMethod').value,
    paymentStatus: $('paymentStatus').value,
    shippingMethod: totals.shippingMethod,
    items: cart.map(x => ({
      sku: x.sku, category: x.category, packagingType: x.packagingType, name: x.name, spec: x.spec, texture: x.texture,
      priceMode: x.priceMode, qty: x.qty, unitPrice: x.unitPrice, originalUnitPrice: x.originalUnitPrice, boxPrice: x.boxPrice,
      boxQty: x.boxQty, originalLineTotal: round2(x.originalLineTotal || x.qty*x.unitPrice), boxSavings: round2(x.boxSavings || 0),
      lineSubtotal: round2(x.qty*x.unitPrice), discountEligible: x.discountEligible
    })),
    retailSubtotal: round2(totals.retailSubtotal),
    subtotal: round2(totals.subtotal),
    boxDiscountAmount: round2(totals.boxDiscountAmount),
    discountAmount: round2(totals.discountAmount),
    discountedSubtotal: round2(totals.discountedSubtotal),
    totalDiscountAmount: round2(totals.totalDiscountAmount),
    total: round2(totals.total),
    giftEligible: totals.giftEligible,
    fulfillmentStatus: 'pending',
    syncStatus: 'pending',
    syncedAt: '',
    lastSyncError: ''
  };
  order.whatsappText = buildWhatsAppText(order);
  await putOrder(order);
  lastSavedOrder = order;
  cart = [];
  renderCart();
  clearCustomerForm(false);
  setCustomerEntryMode(false);
  await refreshOrders();
  showSaveMessage('notice', `✅ 本機已保存：<strong>${order.orderId}</strong><br>正在送到雲端...`);
  if (navigator.onLine) {
    await sendOrder(order.orderId);
  } else {
    showSaveMessage('error', postSaveActionHtml(order.orderId, false));
  }
}

function clearCustomerForm(clearReceipt=true) {
  ['customerName','phone','email','address','notes'].forEach(id => $(id).value = '');
  $('staffNotes').value = '';
  $('paymentMethod').value = 'Cash';
  $('paymentStatus').value = 'Paid';
  $('shippingMethod').value = 'SF';
  if (clearReceipt) showSaveMessage('', '');
  renderSummary();
}

function showSaveMessage(type, msg) {
  const el = $('saveMessage');
  if (!msg) { el.className = ''; el.innerHTML = ''; return; }
  el.className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'notice';
  el.innerHTML = msg;
}

function postSaveActionHtml(orderId, sent=false) {
  const statusLine = sent
    ? '✅ 本機已保存<br>🟡 已送出到雲端，請核實'
    : '✅ 本機已保存<br>⚠️ 未送出到雲端，請有網時再送出';
  return `<div><strong>${htmlEscape(orderId || '')}</strong><br>${statusLine}</div>
    <div class="post-save-actions">
      <button type="button" onclick="startNewOrderFromPostSave()">開始新單</button>
      <button type="button" class="secondary" onclick="location.href='./packing.html'">前往執貨後台</button>
    </div>`;
}

window.startNewOrderFromPostSave = function() {
  cart = [];
  renderCart();
  clearCustomerForm(false);
  setCustomerEntryMode(false);
  showSaveMessage('success', '已準備新訂單。');
  const productCard = document.querySelector('.search-card');
  if (productCard) productCard.scrollIntoView({ behavior:'smooth', block:'start' });
};

function isVerifiedStatus(status) {
  return status === 'verified' || status === 'synced';
}

function needsSend(status) {
  return !isVerifiedStatus(status) && status !== 'sent_unverified';
}

function syncStatusLabel(status) {
  return {
    pending: '未同步',
    syncing: '送出中',
    failed: '送出失敗',
    sent_unverified: '已送出未核實',
    verified: '已核實',
    synced: '已核實'
  }[status] || status || '未同步';
}

function syncPillClass(status) {
  if (isVerifiedStatus(status)) return 'pill ok';
  if (status === 'sent_unverified') return 'pill info';
  if (status === 'failed') return 'pill bad';
  return 'pill warn';
}

async function refreshOrders() {
  const orders = await getAllOrders();
  const toSend = orders.filter(o => needsSend(o.syncStatus)).length;
  const sentCloud = orders.filter(o => !needsSend(o.syncStatus)).length;
  const verified = orders.filter(o => isVerifiedStatus(o.syncStatus)).length;
  $('pendingPill').textContent = toSend ? `未送出: ${toSend}` : `已送雲端: ${sentCloud}`;
  $('pendingPill').className = toSend ? 'pill warn' : sentCloud ? 'pill info' : 'pill ok';
  if ($('syncSummaryPill')) {
    $('syncSummaryPill').textContent = `未送出: ${toSend}`;
    $('syncSummaryPill').className = toSend ? 'pill warn' : 'pill ok';
  }
  if ($('unverifiedPill')) {
    $('unverifiedPill').textContent = `已送雲端: ${sentCloud}`;
    $('unverifiedPill').className = sentCloud ? 'pill info' : 'pill ok';
  }
  if ($('syncDetail')) {
    $('syncDetail').textContent = `本機共 ${orders.length} 張單；未送出 ${toSend} 張，已送雲端 ${sentCloud} 張，已核實 ${verified} 張。核實賬單、收據同 WhatsApp 文字請喺執貨後台處理。`;
  }
};

window.duplicateOrder = async function(orderId) {
  const o = await getOrder(orderId);
  if (!o) return;
  cart = (o.items || []).map(x => ({
    ...x,
    lineId: `${x.sku}-${Date.now()}-${Math.random()}`,
    lineSubtotal: x.qty*x.unitPrice,
    originalUnitPrice: x.unitPrice,
    boxPrice: x.priceMode === 'box' ? x.unitPrice : null,
    remarks: ''
  }));
  $('customerName').value = o.customerName || '';
  $('phone').value = o.phone || '';
  $('email').value = o.email || '';
  $('address').value = o.address || '';
  $('notes').value = o.notes || '';
  $('staffNotes').value = o.staffNotes || '';
  $('paymentMethod').value = o.paymentMethod || 'Cash';
  $('paymentStatus').value = 'Paid';
  $('shippingMethod').value = o.shippingMethod || 'SF';
  renderCart();
  showSaveMessage('success', '已複製到目前訂單，請確認後再儲存新訂單。');
};

window.markOrderVerified = async function(orderId) {
  const o = await getOrder(orderId);
  if (!o) return;
  const ok = doubleConfirm('Mark Verified', `請確認 Google Sheet 已經見到呢張單：${orderId}`);
  if (!ok) return;
  o.syncStatus = 'verified';
  o.syncedAt = nowHK();
  o.lastSyncError = '';
  await putOrder(o);
  showSaveMessage('notice', `已在本機標記 verified，並嘗試更新 Google Sheet：<strong>${htmlEscape(orderId)}</strong>`);
  if (navigator.onLine) {
    await postOrderToSheet(o, 'verified');
  }
  showSaveMessage('success', `Order verified after Sheet check: <strong>${htmlEscape(orderId)}</strong>`);
  await refreshOrders();
  refreshSheetDashboard(false);
};

window.deleteLocalOrder = async function(orderId) {
  const o = await getOrder(orderId);
  if (!o) return;
  const ok = doubleConfirm('Delete Local Order', `將會從呢部機刪除 ${orderId}。
如果已送到 Google Sheet，需要另行喺 Sheet 刪除 / 取消。`);
  if (!ok) return;
  await deleteOrder(orderId);
  showSaveMessage('success', `Deleted local order: <strong>${htmlEscape(orderId)}</strong>`);
  await refreshOrders();
};

async function postOrderToSheet(order, nextStatus='sent_unverified') {
  const sentAt = nowHK();
  const payloadOrder = { ...order, syncStatus: nextStatus, syncedAt: sentAt, lastSyncError: '' };
  await fetch(scriptUrl(), {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payloadOrder)
  });
  return payloadOrder;
}

async function sendOrder(orderId) {
  if (!scriptUrl()) {
    showSaveMessage('error', '未設定 Google Apps Script Web App URL。可先匯出 CSV。');
    return;
  }
  const order = await getOrder(orderId);
  if (!order) return;
  order.syncStatus = 'syncing';
  await putOrder(order);
  await refreshOrders();
  try {
    const payloadOrder = await postOrderToSheet(order, 'sent_unverified');
    await putOrder(payloadOrder);
    showSaveMessage('success', postSaveActionHtml(orderId, true));
    refreshSheetDashboard(false);
  } catch (err) {
    order.syncStatus = 'failed';
    order.lastSyncError = String(err && err.message ? err.message : err);
    await putOrder(order);
    showSaveMessage('error', `送到 Google Sheet 失敗：${order.lastSyncError}`);
  }
}

function renderSheetDashboard(data) {
  latestSheetDashboard = data;
  savePackingDashboardCache(data);
  renderSheetDashboardView();
  renderPackingApp();
}

function setSheetViewTab(tab) {
  sheetViewTab = tab;
  renderSheetDashboardView();
}

function setSheetOrderFilter(filter) {
  sheetOrderFilter = filter;
  renderSheetDashboardView();
}

function loadPackingDashboardCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(PACKING_CACHE_KEY) || 'null');
    if (cached && cached.ok) {
      latestSheetDashboard = cached;
      renderSheetDashboardView();
      renderPackingApp();
      return true;
    }
  } catch (err) {
    console.warn('Packing cache load failed', err);
  }
  return false;
}

function savePackingDashboardCache(data) {
  if (!data || !data.ok) return;
  try {
    localStorage.setItem(PACKING_CACHE_KEY, JSON.stringify({ ...data, cachedAt: nowHK() }));
  } catch (err) {
    console.warn('Packing cache save failed', err);
  }
}

function packingDashboardAgeText(data) {
  if (!data) return '未更新';
  const when = data.cachedAt || data.serverTime || '';
  if (!when) return '已快取';
  return `最後更新 ${String(when).replace('T', ' ').slice(0, 16)}`;
}

function productThemeForSku(sku) {
  const p = products.find(x => String(x.sku || '').toUpperCase() === String(sku || '').toUpperCase());
  return productSeriesTheme(p && p.category);
}

function buildPackingRowsForApp(data) {
  const map = {};
  const orders = (data && data.todayOrderCards) || [];
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const sku = String(item.sku || '').toUpperCase();
      if (!sku) return;
      const mode = item.priceMode === 'box' ? '原箱' : '單件';
      const key = `${sku}|${mode}`;
      if (!map[key]) {
        map[key] = {
          sku,
          mode,
          product: item.name || '',
          qty: 0,
          amount: 0,
          orderCount: 0,
          noteCount: 0,
          unverifiedCount: 0,
          orders: []
        };
      }
      const qty = Number(item.qty || 0);
      map[key].qty += qty;
      map[key].amount += Number(item.lineSubtotal || 0);
      map[key].orderCount += 1;
      if ([order.notes, order.staffNotes].filter(Boolean).join(' / ')) map[key].noteCount += 1;
      if (!isVerifiedStatus(order.syncStatus)) map[key].unverifiedCount += 1;
      map[key].orders.push({
        orderId: order.orderId || '',
        customerName: order.customerName || '',
        qty,
        mode,
        status: order.syncStatus || '',
        notes: [order.notes, order.staffNotes].filter(Boolean).join(' / ')
      });
    });
  });
  return Object.values(map);
}

function matchesPackingFilter(row) {
  if (packingViewFilter === 'box') return row.mode === '原箱';
  if (packingViewFilter === 'unit') return row.mode === '單件';
  if (packingViewFilter === 'note') return row.noteCount > 0;
  if (packingViewFilter === 'unverified') return row.unverifiedCount > 0;
  return true;
}

function sortPackingRows(rows) {
  const copy = rows.slice();
  if (packingSortMode === 'sku') {
    return copy.sort((a, b) => String(a.sku).localeCompare(String(b.sku)) || String(a.mode).localeCompare(String(b.mode)));
  }
  return copy.sort((a, b) => {
    if (Number(b.qty || 0) !== Number(a.qty || 0)) return Number(b.qty || 0) - Number(a.qty || 0);
    return String(a.sku).localeCompare(String(b.sku)) || String(a.mode).localeCompare(String(b.mode));
  });
}

function syncPackingFilterButtons() {
  document.querySelectorAll('#packingFilterRow button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.packingFilter === packingViewFilter);
  });
  if ($('packingSortBtn')) $('packingSortBtn').textContent = packingSortMode === 'qty' ? '數量優先' : 'SKU 排序';
}

function renderPackingApp() {
  if ($('packingOnlinePill')) $('packingOnlinePill').className = 'pill info';
  if ($('packingCachePill')) $('packingCachePill').textContent = '獨立版面';
  if ($('packingStatusLine')) $('packingStatusLine').textContent = '按上面掣會去另一個執貨版面；有網時更新，冇網時可用快取。';
}

function sheetOrderNeedsFollowUp(o) {
  return !o.phone || !o.address || String(o.syncStatus || '') !== 'verified' || o.notes || o.staffNotes;
}

function followUpReasons(o) {
  const reasons = [];
  if (String(o.syncStatus || '') !== 'verified') reasons.push('未核實');
  if (!o.phone) reasons.push('漏 WhatsApp');
  if (!o.address) reasons.push('漏地址');
  if (o.notes || o.staffNotes) reasons.push('有備註');
  return reasons.join(' · ') || '需要跟進';
}

function buildSheetReceiptText(o) {
  const itemText = (o.items && o.items.length)
    ? o.items.map(i => `- ${String(i.name || i.sku || '').replace(/\n/g, ' ')} x ${Number(i.qty || 0)}${i.priceMode === 'box' ? ' 原箱' : ''} = ${money(i.lineSubtotal || 0)}`).join('\n')
    : (o.itemsText || '');
  return `Hi ${o.customerName || ''}，以下係你嘅 2026 HK 寵物展預訂單：\n\n訂單編號：${o.orderId || ''}\n\n${itemText}\n\n${totalAmountLabel(o)}：${money(o.total || 0)}\n\n送貨地址：${o.address || ''}\n\n請核對資料，確認後回覆「Yes」，我哋會稍後確認付款及送貨安排，多謝。`;
}

async function copySheetReceipt(orderId) {
  const orders = (latestSheetDashboard && latestSheetDashboard.todayOrderCards) || [];
  const o = orders.find(x => x.orderId === orderId) || ((latestSheetDashboard && latestSheetDashboard.followUpOrders) || []).find(x => x.orderId === orderId);
  if (!o) return showSaveMessage('error', '搵唔到呢張 Sheet order。');
  try {
    await navigator.clipboard.writeText(o.whatsappText || buildSheetReceiptText(o));
    showSaveMessage('success', 'Sheet order receipt copied。');
  } catch {
    showSaveMessage('error', '複製唔成功；可以手動複製。');
  }
}

async function copySheetAddress(orderId) {
  const orders = (latestSheetDashboard && latestSheetDashboard.todayOrderCards) || [];
  const o = orders.find(x => x.orderId === orderId) || ((latestSheetDashboard && latestSheetDashboard.followUpOrders) || []).find(x => x.orderId === orderId);
  if (!o) return showSaveMessage('error', '搵唔到呢張 Sheet order。');
  try {
    await navigator.clipboard.writeText(`${o.customerName || ''}\n${o.phone || ''}\n${o.address || ''}`.trim());
    showSaveMessage('success', '客人資料 / 地址 copied。');
  } catch {
    showSaveMessage('error', '複製唔成功；可以手動複製。');
  }
}

function sheetOrderCardHtml(o, isFollow=false) {
  const statusClass = isVerifiedStatus(o.syncStatus) ? 'verified' : o.syncStatus === 'sent_unverified' ? 'sent-check' : 'needs-send';
  const items = (o.items && o.items.length)
    ? o.items.map(i => `${htmlEscape(i.sku)} x ${Number(i.qty || 0)}${i.priceMode === 'box' ? ' 原箱' : ''}`).join('、')
    : htmlEscape(o.itemsText || '');
  return `<div class="sheet-order-card ${statusClass}">
    <div class="sheet-order-head">
      <strong>${htmlEscape(o.orderId || '')}</strong>
      <span class="${syncPillClass(o.syncStatus)}">${htmlEscape(syncStatusLabel(o.syncStatus))}</span>
    </div>
    <div class="sheet-total-line"><span>${htmlEscape(o.customerName || '')} · ${htmlEscape(o.phone || '')}</span><span>${money(o.total || 0)}</span></div>
    <div class="sheet-address">📍 ${htmlEscape(o.address || '未填地址')}</div>
    <div class="sheet-items">📦 ${items || '未有 items'}</div>
    ${(o.notes || o.staffNotes) ? `<div class="sheet-note">📝 ${htmlEscape([o.notes, o.staffNotes].filter(Boolean).join(' / '))}</div>` : ''}
    ${isFollow ? `<div class="follow-reason">⚠️ ${htmlEscape(followUpReasons(o))}</div>` : ''}
    <div class="sheet-card-actions">
      <button class="secondary" type="button" onclick="copySheetReceipt('${jsString(o.orderId || '')}')">複製收據</button>
      <button class="secondary" type="button" onclick="copySheetAddress('${jsString(o.orderId || '')}')">複製地址</button>
    </div>
  </div>`;
}

function renderSheetDashboardView() {
  const box = $('sheetDashboardBox');
  const list = $('sheetRecentOrders');
  const data = latestSheetDashboard;
  if (!box || !list || !data || !data.ok) return;
  const topItems = (data.topItems || []).slice(0, 5).map(x => `${htmlEscape(x.sku)} x ${Number(x.qty || 0)}`).join('、') || '未有';
  box.className = 'success';
  box.innerHTML = `<strong>Google Sheet 今日總覽 · ${htmlEscape(data.today || '')}</strong>
    <div class="sheet-mini">
      <div><span>今日 orders</span><strong>${Number(data.todayOrders || 0)}</strong></div>
      <div><span>今日總額</span><strong>${money(data.todayTotal || 0)}</strong></div>
      <div><span>待核實</span><strong>${Number(data.sentUnverified || 0)}</strong></div>
      <div><span>已核實</span><strong>${Number(data.verified || 0)}</strong></div>
      <div><span>待跟進</span><strong>${Number(data.followUpCount || 0)}</strong></div>
      <div><span>Sheet all</span><strong>${Number(data.allOrders || 0)}</strong></div>
    </div>
    <div style="margin-top:8px">熱賣產品：${topItems}</div>`;
  if ($('sheetOrdersPill')) {
    $('sheetOrdersPill').textContent = `Sheet 今日: ${Number(data.todayOrders || 0)}`;
    $('sheetOrdersPill').className = 'pill ok';
  }

  const tabButtons = `<div class="sheet-tabs">
    <button type="button" class="${sheetViewTab === 'orders' ? 'active' : ''}" onclick="setSheetViewTab('orders')">今日訂單</button>
    <button type="button" class="${sheetViewTab === 'packing' ? 'active' : ''}" onclick="setSheetViewTab('packing')">執貨</button>
    <button type="button" class="${sheetViewTab === 'follow' ? 'active' : ''}" onclick="setSheetViewTab('follow')">跟進</button>
  </div>`;

  let content = '';
  if (sheetViewTab === 'orders') {
    let orders = data.todayOrderCards || data.recentOrders || [];
    const followIds = new Set(((data.followUpOrders || []).map(o => o.orderId)));
    if (sheetOrderFilter === 'unverified') orders = orders.filter(o => !isVerifiedStatus(o.syncStatus));
    if (sheetOrderFilter === 'follow') orders = orders.filter(o => followIds.has(o.orderId) || sheetOrderNeedsFollowUp(o));
    content = `<div class="sheet-filter-row">
      <button type="button" class="${sheetOrderFilter === 'all' ? 'active' : ''}" onclick="setSheetOrderFilter('all')">全部</button>
      <button type="button" class="${sheetOrderFilter === 'unverified' ? 'active' : ''}" onclick="setSheetOrderFilter('unverified')">未核實</button>
      <button type="button" class="${sheetOrderFilter === 'follow' ? 'active' : ''}" onclick="setSheetOrderFilter('follow')">待跟進</button>
    </div>
    <div class="sheet-display">${orders.map(o => sheetOrderCardHtml(o)).join('') || '<div class="notice">今日暫時未有符合條件嘅 Sheet order。</div>'}</div>`;
  } else if (sheetViewTab === 'packing') {
    const rows = data.packingList || [];
    content = `<div class="sheet-display">${rows.map(r => `<div class="packing-card">
      <div><div><span class="packing-sku">${htmlEscape(r.sku || '')}</span><span class="packing-mode">${htmlEscape(r.mode || '')}</span></div><div class="small">${htmlEscape(r.product || '')}</div><div class="small">Amount ${money(r.amount || 0)}</div></div>
      <div class="packing-qty">x ${Number(r.qty || 0)}</div>
    </div>`).join('') || '<div class="notice">今日暫時未有 packing items。</div>'}</div>`;
  } else {
    const rows = data.followUpOrders || [];
    content = `<div class="sheet-display">${rows.map(o => sheetOrderCardHtml(o, true)).join('') || '<div class="success">暫時冇需要跟進嘅 order。</div>'}</div>`;
  }
  list.innerHTML = tabButtons + content;
}

async function refreshSheetDashboard(showMessage=true) {
  if (!scriptUrl()) return;
  if (!navigator.onLine) {
    loadPackingDashboardCache();
    if (showMessage) showSaveMessage('error', '目前離線，不能讀取 Google Sheet；已改用最後一次執貨快取。');
    return;
  }
  try {
    if ($('sheetDashboardBox')) {
      $('sheetDashboardBox').className = 'notice';
      $('sheetDashboardBox').textContent = '正在讀取 Google Sheet 今日總覽...';
    }
    const data = await jsonp(scriptUrl(), { action: 'sheetSummary' }, 22000);
    if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'Invalid sheet summary response');
    renderSheetDashboard(data);
    if (showMessage) showSaveMessage('success', '今日執貨清單 / Google Sheet 總覽已更新，並已離線快取。');
  } catch (err) {
    if ($('sheetDashboardBox')) {
      $('sheetDashboardBox').className = 'error';
      $('sheetDashboardBox').textContent = '讀取 Google Sheet 總覽失敗：' + String(err && err.message ? err.message : err);
    }
    loadPackingDashboardCache();
    if (showMessage) showSaveMessage('error', '讀取 Sheet Dashboard 失敗：' + String(err && err.message ? err.message : err));
  }
}

async function syncAll() {
  const orders = await getAllOrders();
  const pending = orders.filter(o => needsSend(o.syncStatus));
  if (!pending.length) {
    showSaveMessage('success', '冇 pending orders。');
    return;
  }
  for (const o of pending) {
    await sendOrder(o.orderId);
  }
  await refreshOrders();
}

async function exportCsv() {
  const orders = await getAllOrders();
  const headers = [
    'orderId','deviceId','createdAt','customerName','phone','email','address','notes',
    'staffNotes','paymentMethod','paymentStatus','shippingMethod','retailSubtotal','subtotal','boxDiscountAmount','discountAmount',
    'discountedSubtotal','totalDiscountAmount','total','giftEligible',
    'syncStatus','syncedAt','lastSyncError','itemsJson','whatsappText'
  ];
  const rows = orders.map(o => headers.map(h => {
    if (h === 'itemsJson') return JSON.stringify(o.items || []);
    if (h === 'whatsappText') return o.whatsappText || '';
    return o[h] ?? '';
  }));
  const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\r\n');
  downloadBlob(csv, `catstaste-orders-${todayKey()}-${currentDeviceId()}.csv`, 'text/csv;charset=utf-8');
}

async function exportJson() {
  const orders = await getAllOrders();
  downloadBlob(JSON.stringify({ exportedAt: nowISO(), deviceId: currentDeviceId(), orders }, null, 2), `catstaste-orders-backup-${todayKey()}-${currentDeviceId()}.json`, 'application/json;charset=utf-8');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

function updateOnlineStatus() {
  const online = navigator.onLine;
  $('onlinePill').textContent = online ? '連線中' : '離線';
  $('onlinePill').className = online ? 'pill ok' : 'pill bad';
}


function setAdminMessage(type, msg) {
  const el = $('adminMsg');
  if (!el) return;
  if (!msg) { el.className = ''; el.innerHTML = ''; return; }
  el.className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'notice';
  el.innerHTML = msg;
}

function setAdminLoginMessage(type, msg) {
  const el = $('adminLoginMsg');
  if (!el) return;
  el.className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'small';
  el.innerHTML = msg;
}

function saveAdminSession(pin) {
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
      pin: String(pin || ''),
      loggedInAt: nowHK()
    }));
  } catch {}
}

function loadAdminSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || 'null');
    if (!saved || !saved.pin) return '';
    return String(saved.pin || '');
  } catch {
    return '';
  }
}

function clearAdminSession() {
  adminPin = '';
  try { localStorage.removeItem(ADMIN_SESSION_KEY); } catch {}
}

function openAdmin() {
  $('adminModal').classList.remove('hidden');
  const savedPin = loadAdminSession();
  if (savedPin === LOCAL_ADMIN_PIN) {
    adminPin = savedPin;
    $('adminPinInput').value = savedPin;
    $('adminBody').classList.remove('hidden');
    setAdminLoginMessage('success', 'Admin 已登入。');
  } else {
    $('adminBody').classList.add('hidden');
    $('adminPinInput').focus();
  }
  renderAdminProducts();
}

function closeAdmin() {
  $('adminModal').classList.add('hidden');
  if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search);
}

async function verifyAdminPin() {
  const pin = $('adminPinInput').value.trim();
  if (!pin) { setAdminLoginMessage('error', '請輸入 PIN。'); return; }
  if (pin !== LOCAL_ADMIN_PIN) {
    clearAdminSession();
    $('adminBody').classList.add('hidden');
    setAdminLoginMessage('error', 'Admin login failed：PIN incorrect。');
    return;
  }
  adminPin = pin;
  saveAdminSession(pin);
  $('adminBody').classList.remove('hidden');
  setAdminLoginMessage('success', 'Admin login OK。');
  try {
    await refreshCatalogFromSheet(false);
  } catch (err) {
    setAdminMessage('notice', '已登入。暫時未能連線更新 Catalog，會先用本機商品資料。');
  }
  renderAdminProducts();
}

function restoreAdminSessionOnBoot() {
  const savedPin = loadAdminSession();
  if (savedPin === LOCAL_ADMIN_PIN) {
    adminPin = savedPin;
    if ($('adminPinInput')) $('adminPinInput').value = savedPin;
    if ($('adminBody')) $('adminBody').classList.remove('hidden');
    setAdminLoginMessage('success', 'Admin 已登入。');
  }
}

function renderAdminQuickFilters() {
  const categoryHost = $('adminCategoryQuickChips');
  const packagingHost = $('adminPackagingQuickChips');
  if (!categoryHost || !packagingHost) return;
  const categories = availableSeriesKeys();
  const packagingTypes = [...new Set(products.map(productPackagingType).filter(Boolean))].sort((a,b) => {
    const order = ['包裝', '罐裝', '小食 / 肉棒', '福袋', '玩具', '其他'];
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'zh-Hant');
  });
  categoryHost.innerHTML = [
    `<button type="button" data-admin-category="" onclick="setAdminQuickCategoryFilter('')">全部</button>`,
      ...categories.map(category => {
        const theme = productSeriesTheme(category);
        return `<button type="button" data-admin-category="${htmlEscape(category)}" onclick="setAdminQuickCategoryFilter('${jsString(category)}')" style="border-color:${theme.color};color:${theme.color}">${htmlEscape(productSeriesLabel(category))}</button>`;
      })
  ].join('');
  packagingHost.innerHTML = [
    `<button type="button" data-admin-packaging="" onclick="setAdminQuickPackagingFilter('')">全部</button>`,
    ...packagingTypes.map(packaging => `<button type="button" data-admin-packaging="${htmlEscape(packaging)}" onclick="setAdminQuickPackagingFilter('${jsString(packaging)}')">${htmlEscape(packaging === '小食 / 肉棒' ? '小食' : packaging)}</button>`)
  ].join('');
  updateAdminQuickFilterChips();
}

function updateAdminQuickFilterChips() {
  document.querySelectorAll('#adminCategoryQuickChips button[data-admin-category]').forEach(btn => {
    const active = String(btn.dataset.adminCategory || '') === String(adminCategoryFilter || '');
    btn.classList.toggle('active', active);
    if (active && btn.dataset.adminCategory) {
      const theme = productSeriesTheme(btn.dataset.adminCategory);
      btn.style.background = theme.color;
      btn.style.color = theme.ink;
      btn.style.borderColor = theme.color;
    } else if (btn.dataset.adminCategory) {
      const theme = productSeriesTheme(btn.dataset.adminCategory);
      btn.style.background = '#fff';
      btn.style.color = theme.color;
      btn.style.borderColor = theme.color;
    } else {
      btn.style.background = active ? 'var(--brand-dark)' : '#fff';
      btn.style.color = active ? '#fff' : 'var(--brand-dark)';
      btn.style.borderColor = active ? 'var(--brand-dark)' : '#c9d9fa';
    }
  });
  document.querySelectorAll('#adminPackagingQuickChips button[data-admin-packaging]').forEach(btn => {
    btn.classList.toggle('active', String(btn.dataset.adminPackaging || '') === String(adminPackagingFilter || ''));
  });
}

window.setAdminQuickCategoryFilter = function(value) {
  adminCategoryFilter = value || '';
  updateAdminQuickFilterChips();
  renderAdminProducts();
};

window.setAdminQuickPackagingFilter = function(value) {
  adminPackagingFilter = value || '';
  updateAdminQuickFilterChips();
  renderAdminProducts();
};

function renderAdminProducts() {
  if (!$('adminProductList')) return;
  renderAdminQuickFilters();
  const q = ($('adminSearch') && $('adminSearch').value || '').trim().toLowerCase();
  const currentSku = $('adminSku') ? $('adminSku').value.trim().toUpperCase() : '';
  const list = products.filter(p => {
    const text = `${p.sku} ${p.id} ${p.category} ${p.name} ${p.spec} ${p.texture}`.toLowerCase();
    const packagingType = productPackagingType(p);
    return (!adminCategoryFilter || productSeriesKey(p.category) === adminCategoryFilter)
      && (!adminPackagingFilter || packagingType === adminPackagingFilter)
      && (!q || text.includes(q));
  }).sort((a,b) => String(a.sku).localeCompare(String(b.sku)));
  $('adminProductList').innerHTML = list.map(p => `
    <div class="admin-product-row ${p.active === false ? 'inactive' : ''} ${String(p.sku).toUpperCase() === currentSku ? 'selected' : ''}" onclick="adminEditProduct('${jsString(p.sku)}', true)">
      <div class="admin-product-head"><strong>${htmlEscape(p.sku)}</strong><span class="pill ${p.active === false ? 'bad' : 'ok'}">${p.active === false ? '停用' : '啟用'}</span></div>
      <div class="admin-product-name">${htmlEscape(p.name)}</div>
      <div class="small">${htmlEscape(p.category)} · ${htmlEscape(p.spec)} · ${htmlEscape(p.texture)} · ${money(p.unitPrice)}${p.boxPrice ? ' · 原箱 ' + money(p.boxPrice) : ''}</div>
      <div class="btns"><button class="secondary" type="button" onclick="event.stopPropagation(); adminEditProduct('${jsString(p.sku)}', true)">編輯</button><button class="ghost" type="button" onclick="event.stopPropagation(); adminToggleProduct('${jsString(p.sku)}')">${p.active === false ? '啟用' : '停用'}</button></div>
    </div>
  `).join('') || '<div class="notice">搵唔到商品。</div>';
}

function clearAdminForm() {
  ['adminSku','adminId','adminCategory','adminSpec','adminTexture','adminUnitPrice','adminBoxPrice','adminName','adminRemarks'].forEach(id => { if ($(id)) $(id).value = ''; });
  $('adminActive').checked = true;
  setAdminMessage('', '');
}

function setAdminFormVisible(visible, scrollToForm=false) {
  const panel = $('adminProductFormPanel');
  if (!panel) return;
  panel.classList.toggle('hidden', !visible);
  if (visible && scrollToForm) {
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
}

window.adminEditProduct = function(sku, scrollToForm=false) {
  const p = products.find(x => x.sku === sku);
  if (!p) return;
  $('adminSku').value = p.sku || '';
  $('adminId').value = p.id || p.sku || '';
  $('adminCategory').value = p.category || '';
  $('adminName').value = p.name || '';
  $('adminSpec').value = p.spec || '';
  $('adminTexture').value = p.texture || '';
  $('adminUnitPrice').value = p.unitPrice ?? '';
  $('adminBoxPrice').value = p.boxPrice ?? '';
  $('adminRemarks').value = p.remarks || '';
  $('adminActive').checked = p.active !== false;
  setAdminFormVisible(true, false);
  renderAdminProducts();
  setAdminMessage('notice', '正在編輯 ' + htmlEscape(p.sku));
  if (scrollToForm) setAdminFormVisible(true, true);
};

function collectAdminProduct() {
  const sku = $('adminSku').value.trim().toUpperCase();
  const product = {
    active: $('adminActive').checked,
    id: ($('adminId').value.trim() || sku).toUpperCase(),
    sku,
    category: $('adminCategory').value.trim(),
    name: $('adminName').value.trim(),
    spec: $('adminSpec').value.trim(),
    texture: $('adminTexture').value.trim(),
    unitPrice: Number($('adminUnitPrice').value || 0),
    boxPrice: $('adminBoxPrice').value === '' ? '' : Number($('adminBoxPrice').value || 0),
    remarks: $('adminRemarks').value.trim()
  };
  if (!product.sku || !product.id || !product.category || !product.name) throw new Error('SKU、ID、Category、產品名必填。');
  if (!(product.unitPrice >= 0)) throw new Error('單件價不正確。');
  return product;
}

async function postAdminAction(action, payload) {
  if (!adminPin) throw new Error('請先 Admin login。');
  await fetch(scriptUrl(), {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, pin: adminPin, ...payload })
  });
}

function normalizeAdminCompareProduct(p) {
  const n = normalizeProduct(p || {});
  return {
    active: n.active !== false,
    id: String(n.id || '').trim().toUpperCase(),
    sku: String(n.sku || '').trim().toUpperCase(),
    category: String(n.category || '').trim(),
    name: String(n.name || '').replace(/\r\n/g, '\n').trim(),
    spec: String(n.spec || '').trim(),
    texture: String(n.texture || '').trim(),
    unitPrice: Number(n.unitPrice || 0),
    boxPrice: n.boxPrice === '' || n.boxPrice === null || n.boxPrice === undefined ? null : Number(n.boxPrice || 0),
    remarks: String(n.remarks || '').replace(/\r\n/g, '\n').trim()
  };
}

function adminProductMismatch(saved, expected) {
  const a = normalizeAdminCompareProduct(saved);
  const b = normalizeAdminCompareProduct(expected);
  const fields = ['active','id','sku','category','name','spec','texture','unitPrice','boxPrice','remarks'];
  for (const field of fields) {
    if (a[field] !== b[field]) return field;
  }
  return '';
}

async function refreshCatalogAndFindSku(sku) {
  const ok = await refreshCatalogFromSheet(false);
  if (!ok) throw new Error('未能重新讀取 Catalog，請檢查網絡 / Apps Script execution。');
  const saved = products.find(p => String(p.sku || '').toUpperCase() === String(sku || '').toUpperCase());
  if (!saved) throw new Error('儲存後未能在 Catalog 找到該 SKU，請檢查 PIN / Apps Script execution。');
  return saved;
}

async function adminSaveProduct() {
  try {
    const product = collectAdminProduct();
    setAdminMessage('notice', 'Saving product... 送出後會重新讀 Catalog 核實，未核實前不會顯示成功。');
    await postAdminAction('saveProduct', { product });
    await new Promise(r => setTimeout(r, 1100));
    const saved = await refreshCatalogAndFindSku(product.sku);
    const mismatch = adminProductMismatch(saved, product);
    if (mismatch) {
      throw new Error(`已送出但 Catalog 未核實更新欄位：${mismatch}。可能 PIN 錯、Apps Script 未部署新版本，或網絡失敗。`);
    }
    renderAdminProducts();
    renderProducts();
    setAdminMessage('success', `已核實更新 ${htmlEscape(product.sku)}。前台如未見新資料，請按「更新商品資料」。`);
  } catch (err) {
    setAdminMessage('error', 'Save failed：' + String(err && err.message ? err.message : err));
  }
}

window.adminToggleProduct = async function(sku) {
  try {
    const p = products.find(x => x.sku === sku);
    if (!p) return;
    const nextActive = p.active === false;
    const okConfirm = confirm(`${nextActive ? 'Activate' : 'Deactivate'} ${sku}?

商品只會 active=false 停用，不會硬刪除。`);
    if (!okConfirm) return;
    setAdminMessage('notice', `${nextActive ? 'Activating' : 'Deactivating'} ${htmlEscape(sku)}... 送出後會重新讀 Catalog 核實。`);
    await postAdminAction('toggleProduct', { sku, active: nextActive });
    await new Promise(r => setTimeout(r, 1100));
    const saved = await refreshCatalogAndFindSku(sku);
    if ((saved.active !== false) !== Boolean(nextActive)) {
      throw new Error('已送出但 Catalog active 狀態未改變，請檢查 PIN / Apps Script execution。');
    }
    renderAdminProducts();
    renderProducts();
    setAdminMessage('success', `${htmlEscape(sku)} 已核實${nextActive ? '啟用' : '停用'}。`);
  } catch (err) {
    setAdminMessage('error', '切換啟用狀態失敗：' + String(err && err.message ? err.message : err));
  }
};

async function adminToggleCurrentProduct() {
  const sku = $('adminSku').value.trim().toUpperCase();
  if (!sku) { setAdminMessage('error', '請先選擇 / 輸入 SKU。'); return; }
  await window.adminToggleProduct(sku);
}

function setupAdminUI() {
  let logoClicks = 0;
  let logoTimer;
  $('brandLogo').addEventListener('click', () => {
    logoClicks += 1;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 1600);
    if (logoClicks >= 5) { logoClicks = 0; openAdmin(); }
  });
  $('adminCloseBtn').addEventListener('click', closeAdmin);
  $('adminLoginBtn').addEventListener('click', verifyAdminPin);
  $('adminPinInput').addEventListener('keydown', e => { if (e.key === 'Enter') verifyAdminPin(); });
  $('adminRefreshCatalogBtn').addEventListener('click', () => refreshCatalogFromSheet(true));
  $('adminReloadBtn').addEventListener('click', async () => { await refreshCatalogFromSheet(false); renderAdminProducts(); setAdminMessage('success', '商品目錄已重新載入。'); });
  $('adminNewBtn').addEventListener('click', () => {
    clearAdminForm();
    setAdminFormVisible(true, true);
    setAdminMessage('notice', '新增商品模式。');
  });
  $('adminClearFormBtn').addEventListener('click', clearAdminForm);
  $('adminCollapseFormBtn').addEventListener('click', () => setAdminFormVisible(false));
  $('adminSaveProductBtn').addEventListener('click', adminSaveProduct);
  $('adminToggleActiveBtn').addEventListener('click', adminToggleCurrentProduct);
  $('adminSearch').addEventListener('input', renderAdminProducts);
  if (location.hash === '#admin') setTimeout(openAdmin, 350);
  window.addEventListener('hashchange', () => { if (location.hash === '#admin') openAdmin(); });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(err => console.warn('SW registration failed', err));
  }
}

$('saveOrderBtn').addEventListener('click', saveCurrentOrder);
if ($('handoffToCustomerBtn')) $('handoffToCustomerBtn').addEventListener('click', () => {
  if (!cart.length) {
    showSaveMessage('notice', '請先揀貨，再交俾客人填資料。');
    return;
  }
  setCustomerEntryMode(true);
});
if ($('backToStaffModeBtn')) $('backToStaffModeBtn').addEventListener('click', () => setCustomerEntryMode(false));
if ($('mobileCheckoutBtn')) $('mobileCheckoutBtn').addEventListener('click', () => {
  if (!cart.length) return;
  setCustomerEntryMode(true);
});
$('refreshCatalogBtn').addEventListener('click', () => refreshCatalogFromSheet(true));
$('syncAllBtn').addEventListener('click', syncAll);
if ($('syncAllDashboardBtn')) $('syncAllDashboardBtn').addEventListener('click', syncAll);
if ($('refreshSheetBtn')) $('refreshSheetBtn').addEventListener('click', () => refreshSheetDashboard(true));
if ($('openPackingPageBtn')) $('openPackingPageBtn').addEventListener('click', () => { location.href = './packing.html'; });
if ($('openPackingPageNewBtn')) $('openPackingPageNewBtn').addEventListener('click', () => { window.open('./packing.html', '_blank'); });
if ($('reloadPageBtn')) $('reloadPageBtn').addEventListener('click', () => location.reload());
if ($('scrollTopBtn')) $('scrollTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
$('dailySummaryBtn').addEventListener('click', showDailySummary);
$('preEventChecklistBtn').addEventListener('click', showPreEventChecklist);
$('clearTestOrdersBtn').addEventListener('click', clearLocalTestOrders);
$('exportCsvBtn').addEventListener('click', exportCsv);
$('exportJsonBtn').addEventListener('click', exportJson);

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('scroll', () => {
  if (!$('scrollTopBtn')) return;
  $('scrollTopBtn').classList.toggle('hidden', window.scrollY < 260);
});

(async function boot() {
  registerSW();
  db = await openDB();
  loadCatalogFromCache();
  setupSettingsUI();
  setupAdminUI();
  restoreAdminSessionOnBoot();
  initProductFilters();
  updateOnlineStatus();
  setCustomerEntryMode(false);
  renderCart();
  await refreshOrders();
  loadPackingDashboardCache();
  if (navigator.onLine) refreshSheetDashboard(false);
})();
