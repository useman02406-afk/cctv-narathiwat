/* Shared full-screen map control for every Leaflet module. */
(() => {
  'use strict';

  const MAP_SELECTORS = '#map, #riskMap, #incidentMap';
  const style = document.createElement('style');
  style.textContent = `
    .map-fullscreen-action{position:absolute;z-index:1200;top:12px;right:12px;border:0;border-radius:12px;padding:10px 13px;background:#078bc9;color:#fff;font:700 14px/1.1 system-ui,-apple-system,"Noto Sans Thai",sans-serif;box-shadow:0 4px 14px #001a3d66;cursor:pointer;display:flex;align-items:center;gap:7px}
    .map-fullscreen-action:hover{background:#056fa5}.map-fullscreen-action:focus-visible{outline:3px solid #ffc62c;outline-offset:2px}
    .cctv-map-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;max-width:none!important;z-index:2147483000!important;margin:0!important;border-radius:0!important;box-shadow:none!important;background:#d9edf6!important}
    .cctv-map-fullscreen .map-fullscreen-action{position:fixed;top:max(14px,env(safe-area-inset-top));right:14px;background:#b91c1c}
    @media(max-width:600px){.map-fullscreen-action{padding:9px 11px;font-size:13px;border-radius:10px}}
  `;
  document.head.appendChild(style);

  function getLeafletMap(element) {
    return element && element.__cctvLeafletMap;
  }

  function refreshMap(element) {
    const leafletMap = getLeafletMap(element);
    if (leafletMap && typeof leafletMap.invalidateSize === 'function') {
      [0, 80, 260].forEach(delay => setTimeout(() => leafletMap.invalidateSize({ pan: false }), delay));
    }
    window.dispatchEvent(new Event('resize'));
  }

  function toggleFullScreen(element, button) {
    const active = element.classList.toggle('cctv-map-fullscreen');
    document.body.classList.toggle('cctv-map-fullscreen-open', active);
    button.innerHTML = active ? '✕ ปิดแผนที่เต็มจอ' : '⛶ แผนที่เต็มจอ';
    button.setAttribute('aria-pressed', String(active));
    refreshMap(element);
  }

  function attach(element) {
    if (!element || element.dataset.fullscreenReady === 'true') return;
    element.dataset.fullscreenReady = 'true';
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-fullscreen-action';
    button.innerHTML = '⛶ แผนที่เต็มจอ';
    button.setAttribute('aria-label', 'เปิดแผนที่แบบเต็มหน้าจอ');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => toggleFullScreen(element, button));
    element.appendChild(button);
  }

  function patchLeaflet() {
    if (!window.L || window.L.__cctvFullscreenPatched) return Boolean(window.L);
    const originalMap = window.L.map;
    window.L.map = function patchedMap(id, options) {
      const instance = originalMap.call(this, id, options);
      const element = typeof id === 'string' ? document.getElementById(id) : id;
      if (element) element.__cctvLeafletMap = instance;
      return instance;
    };
    window.L.__cctvFullscreenPatched = true;
    return true;
  }

  function initialise() {
    document.querySelectorAll(MAP_SELECTORS).forEach(attach);
    patchLeaflet();
  }

  document.addEventListener('DOMContentLoaded', initialise);
  const timer = setInterval(() => { if (patchLeaflet()) clearInterval(timer); }, 50);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const active = document.querySelector('.cctv-map-fullscreen');
    if (!active) return;
    active.querySelector('.map-fullscreen-action')?.click();
  });
})();
