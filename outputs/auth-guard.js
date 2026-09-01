﻿(function () {
  'use strict';
  const URL = 'https://rbahodbdbxfvftfxeipe.supabase.co';
  const KEY = 'sb_publishable_s0s17pRAf8q75VOjl5TtZQ_tB1gd8b4';
  // Some legacy modules were created without a viewport declaration. Add one
  // centrally so every protected screen uses the device width on phones.
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(viewport);
  }
  if (!document.getElementById('jis-ui-theme')) {
    const theme = document.createElement('link');
    theme.id = 'jis-ui-theme';
    theme.rel = 'stylesheet';
    theme.href = 'jis-ui-theme.css';
    document.head.appendChild(theme);
  }
  // Smart Alerts are available on every protected module. The shared script
  // also records successful CRUD operations in the notification centre.
  if (!document.getElementById('smart-alert-script')) {
    const alertScript = document.createElement('script');
    alertScript.id = 'smart-alert-script';
    alertScript.src = 'smart-alert.js';
    document.head.appendChild(alertScript);
  }
  // Several older pages contain inline styles after this guard. Moving the
  // shared theme to the end of <head> once parsing finishes keeps its
  // responsive command-center rules consistent across every module.
  const prioritizeTheme = () => {
    const theme = document.getElementById('jis-ui-theme');
    if (theme) document.head.appendChild(theme);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prioritizeTheme, { once: true });
  else prioritizeTheme();

  // Every Leaflet screen gets the same two basemaps.  The pages still create
  // their normal OpenStreetMap layer themselves; this small adapter detects
  // that layer and adds a compact control for switching to satellite imagery.
  // Keeping it here prevents map modules from drifting into different UI.
  function installSharedMapLayers() {
    const leaflet = window.L;
    if (!leaflet || leaflet.__cctvSharedMapLayers) return Boolean(leaflet);
    leaflet.__cctvSharedMapLayers = true;

    let newestMap = null;
    const createMap = leaflet.map;
    const createTileLayer = leaflet.tileLayer;

    leaflet.map = function () {
      newestMap = createMap.apply(this, arguments);
      return newestMap;
    };

    leaflet.tileLayer = function (url, options) {
      const roadLayer = createTileLayer.call(this, url, options);
      const isOsmRoad = typeof url === 'string' && /tile\.openstreetmap\.org/i.test(url);
      if (isOsmRoad && newestMap && !newestMap.__cctvBasemapControl && leaflet.control?.layers) {
        const satelliteLayer = createTileLayer.call(this,
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: '&copy; Esri, Maxar, Earthstar Geographics and the GIS User Community'
          });
        const selector = leaflet.control.layers(
          { 'แผนที่ปกติ': roadLayer, 'ภาพถ่ายดาวเทียม': satelliteLayer },
          null,
          { position: 'topright', collapsed: true }
        );
        selector.addTo(newestMap);
        newestMap.__cctvBasemapControl = selector;
      }
      return roadLayer;
    };

    if (!document.getElementById('shared-map-layer-style')) {
      const style = document.createElement('style');
      style.id = 'shared-map-layer-style';
      style.textContent = '.leaflet-control-layers{border:0!important;border-radius:12px!important;box-shadow:0 5px 16px #07112655!important;font-family:Sarabun,system-ui,sans-serif!important}.leaflet-control-layers-expanded{padding:8px 10px!important;font-size:13px!important;line-height:1.65!important}.leaflet-control-layers-toggle{width:38px!important;height:38px!important;border-radius:12px!important;background-color:#fff!important;background-size:23px 23px!important}';
      document.head.appendChild(style);
    }
    return true;
  }

  let sharedMapLayerAttempts = 0;
  const sharedMapLayerTimer = setInterval(() => {
    if (installSharedMapLayers() || ++sharedMapLayerAttempts > 120) clearInterval(sharedMapLayerTimer);
  }, 80);

  // The legacy command-center route redirects to home.html above. Every
  // active module therefore uses the same protected loading behavior.
  const isDashboard = false;
  // Pages are commonly opened directly from disk during local operation.  A
  // file:// page can wait on the auth SDK before the body exists, which used
  // to hide every visible element and leave a blank white screen.  Keep the
  // shell visible locally; access checks and redirects still run as normal.
  const isLocalFile = location.protocol === 'file:';
  if (!isDashboard && !isLocalFile) {
    const pendingStyle = document.createElement('style');
    pendingStyle.id = 'auth-pending-style';
    pendingStyle.textContent = 'html.auth-pending body>*:not(#auth-loading){visibility:hidden!important}#auth-loading{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#071126;color:#fff;font:700 16px/1.5 Sarabun,system-ui,sans-serif}#auth-loading span{display:grid;gap:10px;justify-items:center;padding:24px}#auth-loading i{width:34px;height:34px;border:4px solid #ffffff38;border-top-color:#f2b62f;border-radius:50%;animation:authSpin .8s linear infinite}@keyframes authSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(pendingStyle);
    document.documentElement.classList.add('auth-pending');
  }
  const client = window.supabase.createClient(URL, KEY);
  // Shared read client for page enhancements that are loaded after auth-guard.
  window.CCTV_SUPABASE = window.CCTV_SUPABASE || client;

  function loadVehicleMapEnhancement() {
    if (!/vehicle-(alerts|sightings)\.html$/i.test(location.pathname)) return;
    if (!document.querySelector('link[data-vehicle-map]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = new URL('vehicle-map.css', location.href).href;
      style.dataset.vehicleMap = 'true';
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-vehicle-map]')) {
      const script = document.createElement('script');
      script.src = new URL('vehicle-map.js', location.href).href;
      script.defer = true;
      script.dataset.vehicleMap = 'true';
      document.head.appendChild(script);
    }
  }
  function loadCommandShell() {
    if (/\/(login|password-reset)\.html$/i.test(location.pathname)) return;
    if (!document.querySelector('link[data-command-shell]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = new URL('command-shell.css?v=1', location.href).href;
      style.dataset.commandShell = 'true';
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-command-shell]')) {
      const script = document.createElement('script');
      script.src = new URL('command-shell.js?v=1', location.href).href;
      script.defer = true;
      script.dataset.commandShell = 'true';
      document.head.appendChild(script);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { loadVehicleMapEnhancement(); loadCommandShell(); }, { once: true });
  } else {
    loadVehicleMapEnhancement();
    loadCommandShell();
  }
  let localSignOutInProgress = false;
  client.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT' || localSignOutInProgress || location.pathname.toLowerCase().endsWith('/login.html')) return;
    location.replace('login.html?error=session');
  });

  function showAuthLoading() {
    if (isDashboard || document.getElementById('auth-loading')) return;
    const render = () => {
      if (!document.documentElement.classList.contains('auth-pending') || document.getElementById('auth-loading')) return;
      const loader = document.createElement('div');
      loader.id = 'auth-loading';
      loader.setAttribute('role', 'status');
      loader.setAttribute('aria-live', 'polite');
      loader.innerHTML = '<span><i aria-hidden="true"></i>กำลังตรวจสอบสิทธิ์การใช้งาน…</span>';
      document.body.appendChild(loader);
    };
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  function hideAuthLoading() {
    document.documentElement.classList.remove('auth-pending');
    document.getElementById('auth-loading')?.remove();
    document.getElementById('auth-pending-style')?.remove();
  }

  showAuthLoading();


  function bindLogout() {
    const button = document.getElementById('logout');
    if (!button || button.dataset.logoutBound) return Boolean(button);
    button.dataset.logoutBound = 'true';
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      button.disabled = true;
      try {
        // Local sign-out clears this browser session without waiting to revoke every device.
        localSignOutInProgress = true;
        await client.auth.signOut({ scope: 'local' });
      } finally {
        location.replace('login.html');
      }
    });
    return true;
  }

  function addConnectionStatus() {
    if (document.getElementById('connection-status')) return;
    const render = () => {
      if (document.getElementById('connection-status')) return;
      const status = document.createElement('aside');
      status.id = 'connection-status';
      status.className = 'connection-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      const message = document.createElement('span');
      status.append(message);
      document.body.appendChild(status);
      const update = () => {
        const offline = !navigator.onLine;
        status.hidden = !offline;
        message.textContent = offline ? 'ขณะนี้ออฟไลน์ — ข้อมูลใหม่อาจยังไม่ถูกบันทึก' : '';
      };
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      update();
    };
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  // A lightweight health check makes a failed data connection visible as a
  // normal page message instead of leaving the user with an empty section.
  // It uses a small count-only query, so it does not load camera records.
  function addSystemHealth(session) {
    if (window.cctvHealth) return;
    const show = (text, level = 'error') => {
      const render = () => {
        let banner = document.getElementById('system-health-banner');
        if (!banner) {
          banner = document.createElement('aside');
          banner.id = 'system-health-banner';
          banner.setAttribute('role', 'alert');
          banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:1280px;margin:12px auto;padding:10px 14px;border:1px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#92400e;font:600 13px/1.5 "Noto Sans Thai",Sarabun,system-ui,sans-serif';
          const main = document.querySelector('main');
          (main?.parentElement || document.body).insertBefore(banner, main || null);
        }
        banner.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ${String(text)}</span><button type="button" style="border:0;border-radius:7px;padding:6px 9px;background:#92400e;color:#fff;font:inherit;cursor:pointer">ตรวจสอบใหม่</button>`;
        banner.querySelector('button').onclick = () => check();
      };
      if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
    };
    const clear = () => document.getElementById('system-health-banner')?.remove();
    const check = async () => {
      if (!navigator.onLine) return show('ออฟไลน์อยู่ — ยังตรวจสอบฐานข้อมูลไม่ได้');
      try {
        const result = await session.client.from('cctv_locations').select('id', { count: 'estimated', head: true });
        if (result.error) throw result.error;
        clear();
        return { ok: true, count: result.count ?? null };
      } catch (error) {
        const detail = String(error?.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
        show(`ตรวจสอบฐานข้อมูลไม่สำเร็จ: ${detail}`);
        return { ok: false, error: detail };
      }
    };
    window.cctvHealth = { check };
    window.addEventListener('online', check);
    window.addEventListener('error', event => {
      if (event.target !== window || !event.message) return;
      show(`พบปัญหาในการแสดงผล: ${event.message}`);
    });
    window.addEventListener('unhandledrejection', event => {
      const message = event.reason?.message || '';
      if (message) show(`พบปัญหาในการโหลดข้อมูล: ${message}`);
    });
    check();
  }

  function addSkipToContent() {
    if (document.getElementById('skip-to-content')) return;
    const render = () => {
      if (document.getElementById('skip-to-content')) return;
      const content = document.querySelector('main, .content, .main, .page');
      if (!content) return;
      if (!content.id) content.id = 'main-content';
      content.setAttribute('tabindex', '-1');
      const link = document.createElement('a');
      link.id = 'skip-to-content';
      link.className = 'skip-to-content';
      link.href = '#' + content.id;
      link.textContent = 'ข้ามไปยังเนื้อหาหลัก';
      document.body.insertBefore(link, document.body.firstChild);
    };
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  function addBackToTop() {
    if (document.getElementById('back-to-top')) return;
    const render = () => {
      if (document.getElementById('back-to-top')) return;
      const button = document.createElement('button');
      button.id = 'back-to-top';
      button.type = 'button';
      button.className = 'back-to-top';
      button.setAttribute('aria-label', 'กลับขึ้นด้านบน');
      button.innerHTML = '<span aria-hidden="true">↑</span><span>บนสุด</span>';
      button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      const update = () => { button.hidden = window.scrollY < 420; };
      window.addEventListener('scroll', update, { passive: true });
      update();
      document.body.appendChild(button);
    };
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  function removeRetiredModuleLinks() {
    const retired = new Set([
      'admin-documents.html',
      'duty-schedule.html',
      'installation-map.html',
      'notification-center.html',
      'global-search.html'
    ]);
    const cleanup = () => {
      document.querySelectorAll('a[href], [data-go], [data-page]').forEach((node) => {
        const target = node.getAttribute('href') || node.dataset.go || node.dataset.page || '';
        const targetPage = String(target).split(/[?#]/)[0];
        if (!retired.has(targetPage)) return;
        const container = node.closest('li, article, .card, .nav-group');
        (container || node).remove();
      });
    };
    cleanup();
    const observeCleanup = () => {
      if (!document.body) return window.setTimeout(observeCleanup, 0);
      const observer = new MutationObserver(cleanup);
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => observer.disconnect(), 8000);
    };
    observeCleanup();
  }


  function decorateUserIdentity(session) {
    const profile = session?.profile;
    if (!profile) return;
    const roleLabels = { ADMIN: 'ผู้ดูแลระบบ', OFFICER: 'เจ้าหน้าที่', VIEWER: 'ผู้ใช้งาน' };
    const name = profile.full_name || session.user?.email || 'ผู้ใช้งาน';
    document.querySelectorAll('.user').forEach((node) => {
      node.dataset.role = profile.role || 'VIEWER';
      node.textContent = `${name} · ${roleLabels[profile.role] || 'ผู้ใช้งาน'}`;
      node.setAttribute('aria-label', `บัญชี ${name}, สิทธิ์ ${roleLabels[profile.role] || 'ผู้ใช้งาน'}`);
    });
  }


  function addQuickHelp() {
    const header = document.querySelector('.topbar, .top');
    if (!header || document.getElementById('header-help-button')) return;
    let actions = header.querySelector('.header-actions, .header-identity-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'header-identity-actions';
      header.appendChild(actions);
    }
    const dialog = document.createElement('dialog');
    dialog.id = 'quick-help-dialog';
    dialog.className = 'quick-help-dialog';
    dialog.innerHTML = '<form method="dialog"><button class="quick-help-close" aria-label="ปิด">×</button><h2>คีย์ลัดการใช้งาน</h2><dl><dt>Esc</dt><dd>ปิดเมนูมือถือที่เปิดอยู่</dd><dt>Tab</dt><dd>เข้าถึงปุ่มข้ามไปยังเนื้อหาหลัก</dd></dl><button class="quick-help-done" value="close">เข้าใจแล้ว</button></form>';
    document.body.appendChild(dialog);
    const button = document.createElement('button');
    button.id = 'header-help-button';
    button.type = 'button';
    button.className = 'header-help-button';
    button.title = 'วิธีใช้งานและคีย์ลัด';
    button.setAttribute('aria-label', 'เปิดวิธีใช้งานและคีย์ลัด');
    button.textContent = '?';
    button.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    document.addEventListener('keydown', (event) => {
      if (!((event.ctrlKey || event.metaKey) && event.key === '/')) return;
      event.preventDefault();
      if (!dialog.open) dialog.showModal();
    });
    actions.prepend(button);
  }


  function refreshMapLayouts() {
    // Leaflet listens for window resize and recalculates its tile/marker area.
    // Trigger twice because mobile browsers finish orientation/layout changes
    // a moment after the menu animation/layout has completed.
    window.dispatchEvent(new Event('resize'));
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
  }

  // Keep the navigation usable on phones: one clear menu button opens the
  // complete category list instead of squeezing many tiny icons into the bar.
  function addMobileNavToggle() {
    const sidebar = document.querySelector('.sidebar');
    const nav = sidebar && sidebar.querySelector('.nav');
    if (!sidebar || !nav || document.getElementById('mobile-nav-toggle')) return;
    const toggle = document.createElement('button');
    toggle.id = 'mobile-nav-toggle';
    toggle.type = 'button';
    toggle.className = 'mobile-nav-toggle';
    toggle.setAttribute('aria-label', 'เปิดเมนูหลัก');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i><span>เมนู</span>';
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('mobile-nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก');
      refreshMapLayouts();
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('button, a')) {
        document.body.classList.remove('mobile-nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'เปิดเมนูหลัก');
        refreshMapLayouts();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !document.body.classList.contains('mobile-nav-open')) return;
      document.body.classList.remove('mobile-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'เปิดเมนูหลัก');
      toggle.focus();
      refreshMapLayouts();
    });
    window.addEventListener('orientationchange', refreshMapLayouts);
    sidebar.insertBefore(toggle, nav);
  }

  function addHomeSearchNavigation(profile) {
    if (!['ADMIN', 'OFFICER', 'VIEWER'].includes(profile?.role)) return;
    if (!location.pathname.toLowerCase().endsWith('/command-center.html')) return;
    const add = () => {
      if (document.getElementById('home-search-nav')) return;
      const group = [...document.querySelectorAll('.nav-group')].find(node => node.textContent.includes('วิเคราะห์พื้นที่'));
      const target = group?.querySelector('.group-items');
      if (!target) return;
      const button = document.createElement('button');
      button.id = 'home-search-nav';
      button.type = 'button';
      button.innerHTML = '<i class="fa-solid fa-house-chimney"></i><span>ค้นหาบ้าน</span>';
      button.addEventListener('click', () => location.href = 'home-search.html');
      target.appendChild(button);
    };
    if (document.body) add(); else document.addEventListener('DOMContentLoaded', add, { once: true });
  }

  function addHomeSearchDashboardSummary(session) {
    if (!location.pathname.toLowerCase().endsWith('/command-center.html')) return;
    if (!['ADMIN', 'OFFICER', 'VIEWER'].includes(session?.profile?.role)) return;
    let total = null;
    const render = () => {
      const grid = document.getElementById('overviewGrid');
      if (!grid || total === null || document.getElementById('home-search-summary')) return;
      const card = document.createElement('article');
      card.id = 'home-search-summary';
      card.className = 'overview-card';
      card.dataset.go = 'home-search.html';
      card.innerHTML = '<i class="fa-solid fa-house-chimney"></i>ฐานข้อมูลค้นหาบ้าน<b>' + total.toLocaleString('th-TH') + '</b><small>ค้นหาด้วย PEANO ชื่อ ที่อยู่ หรือพิกัด</small>';
      card.addEventListener('click', () => location.href = 'home-search.html');
      grid.appendChild(card);
    };
    const observe = () => {
      const grid = document.getElementById('overviewGrid');
      if (!grid) return setTimeout(observe, 100);
      new MutationObserver(render).observe(grid, { childList: true });
      render();
    };
    observe();
    session.client.from('home_search_records').select('id', { count: 'exact', head: true }).then(({ count, error }) => {
      if (!error) { total = count || 0; render(); }
    });
  }

  function applyCameraSearchQuery() {
    const path = location.pathname.toLowerCase();
    if (!path.endsWith('/camera-management.html') && !path.endsWith('/camera-record-browser.html') && !path.endsWith('/investigations.html')) return;
    const query = new URLSearchParams(location.search).get('search');
    if (!query) return;
    let attempts = 0;
    const apply = () => {
      const input = document.getElementById('search');
      if (input) {
        input.value = query;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      if (++attempts < 20) setTimeout(apply, 100);
    };
    apply();
  }

  function normalizeCameraOwnerOptions() {
    if (!location.pathname.toLowerCase().endsWith('/camera-management.html')) return;
    const replacements = new Map([
      ['กล้อง ผบช.ภ9', 'กล้อง ผบช.ภ.9'],
      ['กล้อง เอกชน', 'กล้องเอกชน']
    ]);
    const normalize = () => document.querySelectorAll('#ownershipCategory option, #filterOwner option').forEach(option => {
      const corrected = replacements.get(option.value) || replacements.get(option.textContent.trim());
      if (!corrected) return;
      option.value = corrected;
      option.textContent = corrected;
    });
    new MutationObserver(normalize).observe(document.documentElement, { childList: true, subtree: true });
    normalize();
  }

  function enableRiskPersonPdfPrint() {
    if (!location.pathname.toLowerCase().endsWith('/risk-persons.html')) return;
    const style = document.createElement('style');
    style.textContent = '@media print{.top{background:#fff!important;color:#172033!important}.top p{color:#475569!important}.bar,.filters,.actions,.btn,#notice,.toast{display:none!important}.wrap{max-width:none!important;margin:0!important;padding:0!important}.panel{box-shadow:none!important;border:0!important}.panel h2{padding-left:0!important}table{font-size:10px!important}th,td{padding:5px!important}.photo{width:36px!important;height:36px!important}}';
    document.head.appendChild(style);
    let attempts = 0;
    const bind = () => {
      const button = document.getElementById('pdf');
      if (button) {
        button.onclick = () => window.print();
        return;
      }
      if (++attempts < 30) setTimeout(bind, 100);
    };
    bind();
  }

  async function repairDashboardRecentCameraOwners(session) {
    if (!location.pathname.toLowerCase().endsWith('/command-center.html')) return;
    const tableBody = document.getElementById('recentCameras');
    if (!tableBody) {
      setTimeout(() => repairDashboardRecentCameraOwners(session), 100);
      return;
    }
    const rows = [];
    for (let from = 0; ; from += 500) {
      const result = await session.client.from('cctv_locations').select('uid,camera_name,name,ownership_category').order('id').range(from, from + 499);
      if (result.error) return;
      rows.push(...(result.data || []));
      if ((result.data || []).length < 500) break;
    }
    const byUid = new Map(rows.filter(row => row.uid).map(row => [String(row.uid).trim(), row.ownership_category || 'ไม่ระบุ']));
    const byName = new Map(rows.filter(row => row.camera_name || row.name).map(row => [String(row.camera_name || row.name).trim(), row.ownership_category || 'ไม่ระบุ']));
    const fix = () => document.querySelectorAll('#recentCameras tr').forEach(row => {
      if (row.dataset.ownerInserted === 'true') return;
      const cells = row.querySelectorAll('td');
      if (cells.length !== 5) return;
      const owner = byUid.get(cells[1].textContent.trim()) || byName.get(cells[0].textContent.trim()) || 'ไม่ระบุ';
      const cell = document.createElement('td');
      cell.textContent = owner;
      row.insertBefore(cell, cells[3]);
      row.dataset.ownerInserted = 'true';
    });
    new MutationObserver(fix).observe(tableBody, { childList: true, subtree: true });
    fix();
  }

  // Maintenance and inspection forms historically loaded only 2,000 camera
  // options.  Keep their native CRUD code intact, then replace the selector
  // with the complete paged result once authentication is ready.
  async function hydrateFullCameraSelect(session) {
    if (!/\/(camera-maintenance|camera-inspections)\.html$/i.test(location.pathname)) return;
    const select = document.getElementById('camera');
    if (!select) return;
    const rows = [];
    for (let from = 0; ; from += 500) {
      const result = await session.client
        .from('cctv_locations')
        .select('id,uid,camera_name,name,area')
        .order('id')
        .range(from, from + 499);
      if (result.error) return;
      rows.push(...(result.data || []));
      if ((result.data || []).length < 500) break;
    }
    const current = select.value;
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const label = camera => [camera.uid, camera.camera_name || camera.name, camera.area].filter(Boolean).join(' · ') || `กล้อง #${camera.id}`;
    select.innerHTML = '<option value="">เลือกจุดกล้อง</option>' + rows.map(camera => `<option value="${camera.id}">${escape(label(camera))}</option>`).join('');
    select.value = current;
    const notice = document.getElementById('notice');
    if (notice) notice.textContent = `${notice.textContent.replace(/ · จุดกล้องที่เลือกได้ \d+ จุด$/, '')} · เลือกจุดกล้องได้ ${rows.length.toLocaleString()} จุด`;
  }

  // One permission model across every module. UI controls are only a
  // convenience layer; PostgreSQL RLS enforces the same rule server-side.
  function applyRolePermissions(session) {
    const canManage = ['ADMIN', 'OFFICER'].includes(session?.profile?.role);
    window.cctvPermissions = Object.freeze({
      canView: Boolean(session?.profile?.active),
      canManage,
      role: session?.profile?.role || 'VIEWER'
    });
    document.documentElement.dataset.userRole = window.cctvPermissions.role;
    if (canManage) return;
    const hideMutationControls = () => {
      document.querySelectorAll([
        '#new', '#save', '#importPanel', '#importData',
        '[data-edit]', '[data-del]', '[data-delete]',
        '[data-system-edit]', '[data-system-delete]', '[data-draw]',
        '.create-action', '.edit-action', '.delete-action'
      ].join(',')).forEach((node) => {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
      });
    };
    hideMutationControls();
    const observeMutationControls = () => {
      if (!document.body) return window.setTimeout(observeMutationControls, 0);
      new MutationObserver(hideMutationControls).observe(document.body, { childList: true, subtree: true });
      hideMutationControls();
    };
    observeMutationControls();
  }

  // The auth check is asynchronous, so DOMContentLoaded may already have fired
  // by the time it completes. Bind now and also retry after the DOM is ready.
  if (!bindLogout()) document.addEventListener('DOMContentLoaded', bindLogout, { once: true });

  async function verifyAccess() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return location.replace('login.html');
    const { data: profile, error } = await client.from('profiles').select('full_name, role, active').eq('id', session.user.id).single();
    if (error || !profile || !profile.active) {
      localSignOutInProgress = true;
      await client.auth.signOut();
      return location.replace('login.html?error=access');
    }
    document.querySelectorAll('select option').forEach((option) => {
      if (option.value === 'กล้อง ผบช.ภ9' || option.textContent === 'กล้อง ผบช.ภ9') {
        option.value = 'กล้อง ผบช.ภ.9';
        option.textContent = 'กล้อง ผบช.ภ.9';
      }
      if (option.value === 'กล้อง เอกชน' || option.textContent === 'กล้อง เอกชน') {
        option.value = 'กล้องเอกชน';
        option.textContent = 'กล้องเอกชน';
      }
    });
    window.cctvSession = { user: session.user, profile, client };
    applyRolePermissions(window.cctvSession);
    window.dispatchEvent(new CustomEvent('cctv-auth-ready', { detail: window.cctvSession }));
    hideAuthLoading();
    document.documentElement.style.visibility = 'visible';
    bindLogout();
    addConnectionStatus();
    addSystemHealth(window.cctvSession);
    addSkipToContent();
    addBackToTop();
    removeRetiredModuleLinks();
    decorateUserIdentity(window.cctvSession);
    addQuickHelp();
    addMobileNavToggle();
    addHomeSearchNavigation(profile);
    addHomeSearchDashboardSummary(window.cctvSession);
    applyCameraSearchQuery();
    normalizeCameraOwnerOptions();
    enableRiskPersonPdfPrint();
    repairDashboardRecentCameraOwners(window.cctvSession);
    hydrateFullCameraSelect(window.cctvSession);
  }

  function showAccessError() {
    if (document.getElementById('auth-connection-error')) return;
    const render = () => {
      if (document.getElementById('auth-connection-error')) return;
      hideAuthLoading();
      document.documentElement.style.visibility = 'visible';
      const card = document.createElement('main');
      card.id = 'auth-connection-error';
      card.setAttribute('role', 'alert');
      card.innerHTML = '<h1>ไม่สามารถเปิดระบบได้</h1><p>ไม่สามารถตรวจสอบการเชื่อมต่อหรือสิทธิ์การใช้งานได้ในขณะนี้</p><div><button type="button" id="auth-retry">ลองใหม่</button><a href="login.html">เข้าสู่ระบบใหม่</a></div>';
      card.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:12px;padding:28px;background:#071126;color:#fff;font:500 16px/1.5 Sarabun,system-ui,sans-serif;text-align:center';
      card.querySelector('h1').style.cssText = 'margin:0;color:#f2b62f;font-size:25px';
      card.querySelector('p').style.margin = '0';
      card.querySelector('div').style.cssText = 'display:flex;justify-content:center;gap:10px;flex-wrap:wrap';
      card.querySelector('button').style.cssText = 'border:0;border-radius:10px;padding:10px 16px;background:#22b8f2;color:#071126;font:700 15px Sarabun,system-ui,sans-serif;cursor:pointer';
      card.querySelector('a').style.cssText = 'border:1px solid #ffffff66;border-radius:10px;padding:10px 16px;color:#fff;text-decoration:none';
      card.querySelector('#auth-retry').onclick = () => location.reload();
      document.body.appendChild(card);
    };
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  const accessCheck = verifyAccess();
  accessCheck.catch((error) => {
    console.error('Authentication check failed', error);
    showAccessError();
  });
  window.setTimeout(() => {
    if (document.documentElement.classList.contains('auth-pending') || (isLocalFile && !window.cctvSession)) showAccessError();
  }, 12000);
})();


