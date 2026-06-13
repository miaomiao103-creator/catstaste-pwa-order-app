    const SETTINGS_KEY = 'catstaste_order_settings_v1';
    const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhmQKohp7H01gnBpp4hiVYvU4l6QkB82x8EfpaQN5wMLIqX-4D0SJcjOweo195Hwe5/exec';
    const VALID_INPUT = /^[A-Za-z0-9]+$/;
    const $ = (id) => document.getElementById(id);

    function loadSettings() {
      const defaults = { staffName: '', deviceName: '', deviceCopyNo: '', syncUrl: DEFAULT_SCRIPT_URL };
      try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return { ...defaults, ...saved, syncUrl: DEFAULT_SCRIPT_URL };
      } catch {
        return defaults;
      }
    }

    function saveSettings(next) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...next, syncUrl: DEFAULT_SCRIPT_URL }));
    }

    function detectDeviceModel() {
      const ua = navigator.userAgent || '';
      const platform = navigator.platform || '';
      const maxTouch = navigator.maxTouchPoints || 0;
      if (/iPad/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1)) return 'iPad';
      if (/iPhone/i.test(ua)) return 'iPhone';
      if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android 手機' : 'Android 平板';
      if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
      if (/Windows/i.test(ua)) return 'Windows';
      return '裝置';
    }

    function cleanInput(value) {
      return String(value || '').replace(/[^A-Za-z0-9]/g, '');
    }

    function showMessage(type, text) {
      const el = $('message');
      el.className = 'message' + (type ? ' ' + type : '');
      el.textContent = text || '';
    }

    function updateOnline() {
      const online = navigator.onLine;
      $('onlinePill').textContent = online ? '連線中' : '離線';
      $('onlinePill').className = online ? 'pill ok' : 'pill';
      $('deviceModelPill').textContent = '裝置: ' + detectDeviceModel();
    }

    function registerSW() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
      }
    }

    function applySavedSettings() {
      const settings = loadSettings();
      $('staffName').value = settings.staffName || '';
      $('deviceName').value = settings.deviceName || '';
    }

    function validateAndSave() {
      const staffName = cleanInput($('staffName').value.trim());
      const deviceName = cleanInput($('deviceName').value.trim()).toUpperCase();
      $('staffName').value = staffName;
      $('deviceName').value = deviceName;

      if (!staffName || !deviceName) {
        showMessage('error', '請先輸入名字同設備名稱。');
        return null;
      }
      if (!VALID_INPUT.test(staffName) || !VALID_INPUT.test(deviceName)) {
        showMessage('error', '名字同設備名稱只接受英文或數字。');
        return null;
      }
      saveSettings({ staffName, deviceName });
      showMessage('success', '已儲存，正在開啟頁面...');
      return { staffName, deviceName };
    }

    $('staffName').addEventListener('input', () => {
      $('staffName').value = cleanInput($('staffName').value);
    });
    $('deviceName').addEventListener('input', () => {
      $('deviceName').value = cleanInput($('deviceName').value).toUpperCase();
    });

    $('openOrderBtn').addEventListener('click', () => {
      if (!validateAndSave()) return;
      location.href = './order.html';
    });

    $('openPackingBtn').addEventListener('click', () => {
      if (!validateAndSave()) return;
      location.href = './packing.html';
    });

    $('reloadPageBtn').addEventListener('click', () => location.reload());
    $('scrollTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('scroll', () => $('scrollTopBtn').classList.toggle('hidden', window.scrollY < 220));

    applySavedSettings();
    updateOnline();
    registerSW();
