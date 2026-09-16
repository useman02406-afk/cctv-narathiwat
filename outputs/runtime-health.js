(() => {
  'use strict';
  if (window.CCTV_RUNTIME_HEALTH) return;

  const state = { online: navigator.onLine, errors: [], resourceFailures: [] };
  window.CCTV_RUNTIME_HEALTH = state;
  const clean = value => String(value || 'Unknown error').replace(/https?:\/\/[^\s]+/g, '[external resource]').slice(0, 240);

  function remember(type, message) {
    const entry = { type, message: clean(message), page: location.pathname.split('/').pop(), at: new Date().toISOString() };
    state.errors.push(entry);
    if (state.errors.length > 20) state.errors.shift();
    try { sessionStorage.setItem('cctv-runtime-errors', JSON.stringify(state.errors)); } catch {}
  }

  function banner(message, level = 'warning') {
    const render = () => {
      let node = document.getElementById('runtime-health-banner');
      if (!node) {
        node = document.createElement('aside');
        node.id = 'runtime-health-banner';
        node.setAttribute('role', 'status');
        node.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483645;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:10px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;box-shadow:0 8px 24px #0f172a35;font:600 13px/1.5 "Noto Sans Thai",Sarabun,system-ui,sans-serif';
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'ปิด';
        close.style.cssText = 'border:0;border-radius:7px;padding:5px 9px;background:#9a3412;color:#fff;cursor:pointer';
        close.onclick = () => node.remove();
        node.append(document.createElement('span'), close);
        document.body.appendChild(node);
      }
      node.firstElementChild.textContent = message;
      node.dataset.level = level;
    };
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render, { once: true });
  }

  addEventListener('online', () => {
    state.online = true;
    document.getElementById('runtime-health-banner')?.remove();
  });
  addEventListener('offline', () => {
    state.online = false;
    remember('network', 'Browser is offline');
    banner('ขณะนี้ออฟไลน์ — กรุณาตรวจสอบเครือข่ายก่อนบันทึกข้อมูล');
  });
  addEventListener('error', event => {
    const target = event.target;
    if (target && target !== window && ['SCRIPT', 'LINK', 'IMG'].includes(target.tagName)) {
      const source = target.src || target.href || 'resource';
      state.resourceFailures.push(clean(source));
      remember('resource', source);
      banner('โหลดส่วนประกอบภายนอกบางรายการไม่สำเร็จ กรุณารีเฟรชหรือตรวจสอบอินเทอร์เน็ต');
      return;
    }
    remember('javascript', event.message || event.error?.message);
  }, true);
  addEventListener('unhandledrejection', event => remember('promise', event.reason?.message || event.reason));
})();
