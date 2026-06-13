    const $ = (id) => document.getElementById(id);
    const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhmQKohp7H01gnBpp4hiVYvU4l6QkB82x8EfpaQN5wMLIqX-4D0SJcjOweo195Hwe5/exec';
    const SETTINGS_KEY = 'catstaste_order_settings_v1';
    const PACKING_CACHE_KEY = 'catstaste_packing_dashboard_cache_v1';
    const money = (n) => 'HK$' + (Number(n || 0)).toFixed(2).replace(/\\.00$/, '');
    let latestSheetDashboard = null;
    let currentView = 'packing';
    let packingViewFilter = 'all';
    let packingSortMode = 'qty';

    function htmlEscape(s) {
      return String(s ?? '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
    }

    function loadSettings() {
      const defaults = { syncUrl: DEFAULT_SCRIPT_URL };
      try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return { ...defaults, ...saved, syncUrl: DEFAULT_SCRIPT_URL };
      } catch {
        return defaults;
      }
    }

    function scriptUrl() {
      return (loadSettings().syncUrl || DEFAULT_SCRIPT_URL).trim();
    }

    function jsonp(url, params={}, timeoutMs=15000) {
      return new Promise((resolve, reject) => {
        const cb = 'ct_pack_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        const qs = new URLSearchParams({ ...params, callback: cb, _ts: Date.now() });
        const sep = url.includes('?') ? '&' : '?';
        const script = document.createElement('script');
        let settled = false;
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('讀取逾時，請檢查 Google Apps Script。'));
        }, timeoutMs);
        function cleanup() {
          clearTimeout(timer);
          delete window[cb];
          script.remove();
        }
        window[cb] = (data) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(data);
        };
        script.onerror = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error('網絡或 Script 載入失敗。'));
        };
        script.src = url + sep + qs.toString();
        document.body.appendChild(script);
      });
    }

    function productSeriesTheme(category) {
      const text = String(category || '');
      if (text.includes('Tasty')) return { color: '#F5C842', ink: '#2f2400', soft: 'rgba(245, 200, 66, .13)' };
      if (text.includes('Healthy')) return { color: '#5BAD6F', ink: '#ffffff', soft: 'rgba(91, 173, 111, .12)' };
      if (text.includes('Purrfect') || text.includes('主食罐')) return { color: '#4A90C4', ink: '#ffffff', soft: 'rgba(74, 144, 196, .12)' };
      if (text.includes('Kitten')) return { color: '#F48FB1', ink: '#401124', soft: 'rgba(244, 143, 177, .14)' };
      if (text.includes('Senior')) return { color: '#9B59B6', ink: '#ffffff', soft: 'rgba(155, 89, 182, .12)' };
      if (text.includes('Snack')) return { color: '#F39C12', ink: '#2d1800', soft: 'rgba(243, 156, 18, .14)' };
      return { color: '#6B7A90', ink: '#ffffff', soft: 'rgba(107, 122, 144, .10)' };
    }

    function productSeriesLabel(category) {
      const text = String(category || '');
      if (text.includes('Tasty')) return 'Tasty';
      if (text.includes('Healthy')) return 'Healthy';
      if (text.includes('Purrfect') || text.includes('主食罐')) return 'Purrfect';
      if (text.includes('Kitten')) return 'Kitten';
      if (text.includes('Senior')) return 'Senior 7+';
      if (text.includes('Snack')) return 'Snack';
      return text || '其他';
    }

    function isVerifiedStatus(status) {
      return status === 'verified' || status === 'synced';
    }

    function fulfillmentStatusLabel(status) {
      return status === 'shipped' ? '已寄出' : '未寄出';
    }

    function fulfillmentPillClass(status) {
      return status === 'shipped' ? 'pill ok' : 'pill warn';
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

    function savePackingDashboardCache(data) {
      if (!data || !data.ok) return;
      try {
        localStorage.setItem(PACKING_CACHE_KEY, JSON.stringify({ ...data, cachedAt: new Date().toLocaleString('sv-SE', { hour12: false, timeZone: 'Asia/Hong_Kong' }) }));
      } catch (err) {
        console.warn('cache save failed', err);
      }
    }

    function loadPackingDashboardCache() {
      try {
        const cached = JSON.parse(localStorage.getItem(PACKING_CACHE_KEY) || 'null');
        if (cached && cached.ok) {
          latestSheetDashboard = cached;
          renderPackingPage();
          return true;
        }
      } catch (err) {
        console.warn('cache load failed', err);
      }
      return false;
    }

    function packingDashboardAgeText(data) {
      if (!data) return '未更新';
      const when = data.cachedAt || data.serverTime || '';
      if (!when) return '已快取';
      return String(when).replace('T', ' ').slice(0, 16);
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
                unshippedCount: 0,
                category: item.category || '',
                orders: []
              };
          }
          const qty = Number(item.qty || 0);
          const noteText = [order.notes, order.staffNotes].filter(Boolean).join(' / ');
          map[key].qty += qty;
          map[key].amount += Number(item.lineSubtotal || 0);
          map[key].orderCount += 1;
          if (noteText) map[key].noteCount += 1;
          if (String(order.fulfillmentStatus || 'pending') !== 'shipped') map[key].unshippedCount += 1;
          map[key].orders.push({
            orderId: order.orderId || '',
            customerName: order.customerName || '',
            qty,
            status: order.syncStatus || '',
            fulfillmentStatus: order.fulfillmentStatus || 'pending',
            notes: noteText
          });
        });
      });
      return Object.values(map);
    }

    function matchesPackingFilter(row) {
      if (packingViewFilter === 'box') return row.mode === '原箱';
      if (packingViewFilter === 'unit') return row.mode === '單件';
      if (packingViewFilter === 'note') return row.noteCount > 0;
      if (packingViewFilter === 'unshipped') return row.unshippedCount > 0;
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

    function syncFilterButtons() {
      document.querySelectorAll('#filterRow button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === packingViewFilter);
      });
      $('sortBtn').textContent = packingSortMode === 'qty' ? '數量優先' : 'SKU 排序';
    }

    function syncViewButtons() {
      document.querySelectorAll('#viewSwitch button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentView);
      });
      const packingMode = currentView === 'packing';
      $('packingList').hidden = !packingMode;
      $('ordersBoard').hidden = packingMode;
      $('filterRow').style.display = packingMode ? 'flex' : 'none';
      $('sortBtn').style.display = packingMode ? '' : 'none';
    }

    function buildSheetReceiptText(order) {
      const itemText = (order.items || []).map(item => {
        const mode = item.priceMode === 'box' ? '原箱' : '單件';
        return `- ${item.name || '產品'} ${mode} x${Number(item.qty || 0)}`;
      }).join('\n');
      return `CatsTaste 收據\n\n訂單編號：${order.orderId || ''}\n客人：${order.customerName || ''}\nWhatsApp：${order.phone || ''}\n地址：${order.address || ''}\n\n${itemText}\n\n優惠後應收：${money(order.total || 0)}`;
    }

    function buildPackingWhatsappText(order) {
      if (order.whatsappText) return order.whatsappText;
      const itemText = (order.items || []).map(item => {
        const mode = item.priceMode === 'box' ? '原箱' : '單件';
        return `- ${item.name || '產品'} ${mode} x${Number(item.qty || 0)}`;
      }).join('\n');
      return `Hi ${order.customerName || ''}，以下係你嘅預訂單：\n\n訂單編號：${order.orderId || ''}\n\n${itemText}\n\n優惠後應收：${money(order.total || 0)}\n\n送貨地址：${order.address || ''}\n\n請核對資料，多謝。`;
    }

    async function copyText(text, successMessage) {
      try {
        await navigator.clipboard.writeText(text || '');
        $('statusLine').textContent = successMessage;
      } catch {
        $('statusLine').textContent = '複製失敗，請手動選取文字。';
      }
    }

    async function markOrderShippedOnServer(order) {
      const payload = { action: 'markOrderShipped', orderId: order.orderId };
      await fetch(scriptUrl(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      await new Promise(resolve => setTimeout(resolve, 900));
      const refreshed = await jsonp(scriptUrl(), { action: 'sheetSummary' }, 22000);
      const latest = ((refreshed && refreshed.todayOrderCards) || []).find(o => String(o.orderId) === String(order.orderId));
      if (!latest || String(latest.fulfillmentStatus || 'pending') !== 'shipped') {
        throw new Error('已送出狀態未成功寫入 Google Sheet');
      }
      latestSheetDashboard = refreshed;
      savePackingDashboardCache(refreshed);
      renderPackingPage();
      return refreshed;
    }

    let verifyOrderId = '';

    function closeVerifyModal() {
      $('verifyModal').classList.add('hidden');
      verifyOrderId = '';
    }

    function openVerifyModal(order) {
      verifyOrderId = String(order.orderId || '');
      $('verifyTitle').textContent = `核實賬單 · ${order.orderId || ''}`;
      $('verifyMeta').innerHTML = [
        `客人：${htmlEscape(order.customerName || '未填客人')}`,
        `WhatsApp：${htmlEscape(order.phone || '未填 WhatsApp')}`,
        `地址：${htmlEscape(order.address || '未填地址')}`,
        `應收：${htmlEscape(money(order.total || 0))}`,
        `狀態：${htmlEscape(fulfillmentStatusLabel(order.fulfillmentStatus || 'pending'))}`,
        `同步：${htmlEscape(syncStatusLabel(order.syncStatus || 'pending'))}`
      ].join('<br>');
      $('verifyItems').innerHTML = (order.items || []).map(item => `<div class="verify-item"><div><strong>${htmlEscape(item.name || '產品')}</strong><br><small>${htmlEscape(item.priceMode === 'box' ? '原箱' : '單件')}</small></div><strong>x ${Number(item.qty || 0)}</strong></div>`).join('') || '<div class="empty">呢張單未有商品。</div>';
      $('verifyNotes').innerHTML = [order.notes ? `客人備註：${htmlEscape(order.notes)}` : '', order.staffNotes ? `同事備註：${htmlEscape(order.staffNotes)}` : ''].filter(Boolean).join('<br>') || '未有備註。';
      $('verifyConfirmBtn').textContent = order.fulfillmentStatus === 'shipped' ? '已寄出' : '確認已寄出';
      $('verifyConfirmBtn').disabled = order.fulfillmentStatus === 'shipped';
      $('verifyModal').classList.remove('hidden');
    }

    async function handleOrderAction(action, orderId) {
      const data = latestSheetDashboard;
      const order = ((data && data.todayOrderCards) || []).find(o => String(o.orderId) === String(orderId));
      if (!order) return;
      if (action === 'copyWhatsapp') return copyText(buildPackingWhatsappText(order), `已複製 ${orderId} 嘅 WhatsApp 文字。`);
      if (action === 'copyReceipt') return copyText(buildSheetReceiptText(order), `已複製 ${orderId} 嘅收據文字。`);
      if (action === 'verifyBill') {
        openVerifyModal(order);
        return;
      }
      if (action === 'confirmShipped') {
        if (String(order.fulfillmentStatus || 'pending') === 'shipped') {
          $('statusLine').textContent = `${orderId} 已經標記為已寄出。`;
          return;
        }
        if (!navigator.onLine) {
          $('statusLine').textContent = '目前離線，未能更新寄出狀態。';
          return;
        }
        try {
          $('statusLine').textContent = `正在更新 ${orderId} 為已寄出...`;
          await markOrderShippedOnServer(order);
          $('statusLine').textContent = `${orderId} 已更新為已寄出。`;
          closeVerifyModal();
        } catch (err) {
          $('statusLine').textContent = `更新 ${orderId} 失敗：${String(err && err.message ? err.message : err)}`;
        }
      }
    }

    function renderOrdersBoard(data, filteredOrders) {
      $('ordersBoard').innerHTML = filteredOrders.map(order => {
        const itemRows = (order.items || []).map(item => {
          const mode = item.priceMode === 'box' ? '原箱' : '單件';
          return `<div class="order-item-line">
            <div>
              <strong>${htmlEscape(item.name || item.sku || '')}</strong>
              <span>${htmlEscape(mode)}</span>
            </div>
            <div>x ${Number(item.qty || 0)}</div>
          </div>`;
        }).join('') || '<div class="empty">呢張單未有商品。</div>';
        const notes = [
          order.notes ? `<div class="order-note-block"><strong>客人備註</strong><br>${htmlEscape(order.notes)}</div>` : '',
          order.staffNotes ? `<div class="order-note-block"><strong>同事備註</strong><br>${htmlEscape(order.staffNotes)}</div>` : ''
        ].join('');
        const cls = order.fulfillmentStatus === 'shipped' ? 'verified' : 'sent-check';
        return `<div class="order-card ${cls}">
          <div class="order-card-top">
            <div>
              <div class="order-card-head">
                <strong>${htmlEscape(order.orderId || '')}</strong>
                <span class="${fulfillmentPillClass(order.fulfillmentStatus)}">${htmlEscape(fulfillmentStatusLabel(order.fulfillmentStatus))}</span>
              </div>
              <div class="order-card-meta">${htmlEscape(order.createdAt || '')} · ${htmlEscape(order.staffName || '')} · ${htmlEscape(order.deviceId || '')} · 同步 ${htmlEscape(syncStatusLabel(order.syncStatus))}</div>
            </div>
            <div class="order-card-total">${money(order.total || 0)}<span>${Number(order.itemCount || 0)} 件</span></div>
          </div>
          <div class="order-contact">
            <strong>${htmlEscape(order.customerName || '未填客人')}</strong>
            <div>${htmlEscape(order.phone || '未填 WhatsApp')}</div>
            <div class="order-address">${htmlEscape(order.address || '未填地址')}</div>
          </div>
          <div class="order-items">${itemRows}</div>
          ${notes ? `<div class="order-notes">${notes}</div>` : ''}
          <div class="order-actions">
            <button type="button" class="secondary" onclick="handlePackingOrderAction('verifyBill','${htmlEscape(order.orderId || '')}')">核實賬單</button>
            <button type="button" class="secondary" onclick="handlePackingOrderAction('copyReceipt','${htmlEscape(order.orderId || '')}')">收據</button>
            <button type="button" onclick="handlePackingOrderAction('copyWhatsapp','${htmlEscape(order.orderId || '')}')">WhatsApp文字</button>
          </div>
        </div>`;
      }).join('') || '<div class="empty">搵唔到符合條件嘅訂單。</div>';
    }

    function renderPackingPage() {
      const data = latestSheetDashboard;
      const online = navigator.onLine;
      $('onlinePill').textContent = online ? '連線中' : '離線';
      $('onlinePill').className = online ? 'pill ok' : 'pill warn';
      $('cachePill').textContent = data ? `快取 ${packingDashboardAgeText(data)}` : '未更新';
      $('cacheTime').textContent = data ? packingDashboardAgeText(data).slice(11, 16) || '已更新' : '-';
      syncViewButtons();
      if (!data || !data.ok) {
        $('orderCount').textContent = '0';
        $('skuCount').textContent = '0';
        $('followCount').textContent = '0';
        $('statusLine').textContent = '未下載資料。請有網時按「更新今日執貨清單」，之後冇網都可以開呢頁用最後一次快取。';
        $('packingList').innerHTML = '<div class="empty">未有執貨資料。</div>';
        $('ordersBoard').innerHTML = '<div class="empty">未有訂單資料。</div>';
        return;
      }

      const rows = sortPackingRows(buildPackingRowsForApp(data));
      const orders = ((data && data.todayOrderCards) || []).slice();
      const filtered = rows.filter(row => {
        if (!matchesPackingFilter(row)) return false;
        return true;
      });
      $('orderCount').textContent = Number(data.todayOrders || 0);
      $('skuCount').textContent = rows.length;
      $('followCount').textContent = Number(data.pendingShipment || 0);
      const filterLabel = packingViewFilter === 'all' ? '全部' : packingViewFilter === 'box' ? '原箱' : packingViewFilter === 'unit' ? '單件' : packingViewFilter === 'note' ? '有備註' : '未寄出';
      $('statusLine').textContent = currentView === 'packing'
        ? `${packingDashboardAgeText(data)} · ${online ? '可更新最新資料' : '目前離線，正使用快取'} · ${filterLabel} · 顯示 ${filtered.length}/${rows.length} 個執貨項目`
        : `${packingDashboardAgeText(data)} · ${online ? '可更新最新資料' : '目前離線，正使用快取'} · 顯示 ${orders.length}/${Number(data.todayOrders || 0)} 張訂單`;
      syncFilterButtons();

      $('packingList').innerHTML = filtered.map(row => {
        const theme = productSeriesTheme(row.category);
        const orderRows = row.orders.slice().sort((a, b) => String(a.orderId).localeCompare(String(b.orderId))).map(order => `
          <div class="order-row">
            <div>
              <div class="order-head">
                <span>${htmlEscape(order.orderId)}</span>
                ${order.customerName ? `<span class="person">${htmlEscape(order.customerName)}</span>` : ''}
                <span class="${fulfillmentPillClass(order.fulfillmentStatus)}">${htmlEscape(fulfillmentStatusLabel(order.fulfillmentStatus))}</span>
              </div>
              ${order.notes ? `<div class="order-note">${htmlEscape(order.notes)}</div>` : ''}
            </div>
            <div class="order-qty">x ${Number(order.qty || 0)}<span>${row.mode}</span></div>
          </div>
        `).join('');
        return `
          <div class="packing-item" style="--series-color:${theme.color};--series-soft:${theme.soft}">
            <div class="packing-top">
              <div>
                <div class="packing-sku">
                  <span>${htmlEscape(row.sku)}</span>
                  <span class="packing-badge">${htmlEscape(row.mode)}</span>
                </div>
                <div class="packing-name">${htmlEscape(row.product || '')}</div>
              </div>
              <div class="packing-qty">x ${Number(row.qty || 0)}<span>${money(row.amount || 0)}</span></div>
            </div>
            <div class="packing-meta">
              <span>${htmlEscape(productSeriesLabel(row.category || ''))}</span>
              <span>${row.orderCount} 張單</span>
              ${row.noteCount ? `<span>備註 ${row.noteCount}</span>` : ''}
              ${row.unshippedCount ? `<span>未寄出 ${row.unshippedCount}</span>` : '<span>全部已寄出</span>'}
            </div>
            <div class="order-list">${orderRows}</div>
          </div>
        `;
      }).join('') || '<div class="empty">搵唔到符合條件嘅執貨項目。</div>';
      renderOrdersBoard(data, orders);
    }

    async function refreshSheetDashboard(showMessage = true) {
      if (!scriptUrl()) return;
      if (!navigator.onLine) {
        loadPackingDashboardCache();
        return;
      }
      try {
        $('statusLine').textContent = '正在讀取 Google Sheet 今日執貨資料...';
        const data = await jsonp(scriptUrl(), { action: 'sheetSummary' }, 22000);
        if (!data || !data.ok) throw new Error('讀取資料失敗');
        latestSheetDashboard = data;
        savePackingDashboardCache(data);
        renderPackingPage();
      } catch (err) {
        loadPackingDashboardCache();
        $('statusLine').textContent = '讀取 Google Sheet 失敗，已改用最後一次快取。';
      }
    }

    function registerSW() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
      }
    }

    $('refreshBtn').addEventListener('click', () => refreshSheetDashboard(true));
    $('useCacheBtn').addEventListener('click', () => loadPackingDashboardCache());
    $('reloadPageBtn').addEventListener('click', () => location.reload());
    $('verifyCloseBtn').addEventListener('click', closeVerifyModal);
    $('verifyModal').addEventListener('click', (event) => {
      if (event.target === $('verifyModal')) closeVerifyModal();
    });
    $('verifyConfirmBtn').addEventListener('click', () => {
      if (!verifyOrderId) return;
      handlePackingOrderAction('confirmShipped', verifyOrderId);
    });
    $('scrollTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    $('sortBtn').addEventListener('click', () => {
      packingSortMode = packingSortMode === 'qty' ? 'sku' : 'qty';
      renderPackingPage();
    });
    document.querySelectorAll('#filterRow button').forEach(btn => btn.addEventListener('click', () => {
      packingViewFilter = btn.dataset.filter || 'all';
      renderPackingPage();
    }));
    document.querySelectorAll('#viewSwitch button').forEach(btn => btn.addEventListener('click', () => {
      currentView = btn.dataset.view || 'packing';
      renderPackingPage();
    }));
    window.addEventListener('online', renderPackingPage);
    window.addEventListener('offline', renderPackingPage);
    window.addEventListener('scroll', () => $('scrollTopBtn').classList.toggle('hidden', window.scrollY < 260));
    window.handlePackingOrderAction = handleOrderAction;

    (async function boot() {
      registerSW();
      loadPackingDashboardCache();
      renderPackingPage();
      if (navigator.onLine) refreshSheetDashboard(false);
    })();
