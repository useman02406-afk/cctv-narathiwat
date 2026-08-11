/* Shared full-screen map control for every Leaflet module. */
(() => {
  'use strict';

  const MAP_SELECTORS = '#map, #riskMap, #incidentMap';
  const refreshTimers = new WeakMap();
  const style = document.createElement('style');
  style.textContent = `
    html.cctv-map-fullscreen-open,body.cctv-map-fullscreen-open{overflow:hidden!important;overscroll-behavior:none}
    .map-fullscreen-action{position:absolute;z-index:1200;top:12px;right:12px;border:0;border-radius:12px;padding:10px 13px;background:#078bc9;color:#fff;font:700 14px/1.1 system-ui,-apple-system,"Noto Sans Thai",sans-serif;box-shadow:0 4px 14px #001a3d66;cursor:pointer;display:flex;align-items:center;gap:7px}
    .map-fullscreen-action:hover{background:#056fa5}.map-fullscreen-action:focus-visible{outline:3px solid #ffc62c;outline-offset:2px}
    .cctv-map-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;min-width:100vw!important;height:100vh!important;min-height:100vh!important;max-width:none!important;max-height:none!important;z-index:2147483000!important;margin:0!important;border-radius:0!important;box-shadow:none!important;background:#d9edf6!important;isolation:isolate}
    @supports(height:100dvh){.cctv-map-fullscreen{height:100dvh!important;min-height:100dvh!important}}
    .cctv-map-fullscreen .leaflet-pane,.cctv-map-fullscreen .leaflet-map-pane{will-change:transform}
    .cctv-map-fullscreen .map-fullscreen-action{position:fixed;top:max(14px,env(safe-area-inset-top));right:14px;background:#b91c1c}
    @media(max-width:600px){.map-fullscreen-action{padding:9px 11px;font-size:13px;border-radius:10px}}
  `;
  document.head.appendChild(style);

  const getLeafletMap = element => element && element.__cctvLeafletMap;

  function refreshMap(element, delays = [0, 80, 260]) {
    const leafletMap = getLeafletMap(element);
    if (!leafletMap || typeof leafletMap.invalidateSize !== 'function') return;
    const prior = refreshTimers.get(element) || [];
    prior.forEach(clearTimeout);
    const timers = delays.map(delay => setTimeout(() => {
      requestAnimationFrame(() => {
        try { leafletMap.invalidateSize({ pan: false, debounceMoveend: true }); } catch (_) {}
      });
    }, delay));
    refreshTimers.set(element, timers);
  }

  function notifyParent(active) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'cctv-map-fullscreen', active }, window.location.origin === 'null' ? '*' : window.location.origin);
      }
    } catch (_) {}
  }

  function moveToFullscreenLayer(element, active) {
    if (active) {
      if (element.__cctvFullscreenPlaceholder) return;
      const placeholder = document.createComment('cctv-map-fullscreen-placeholder');
      element.parentNode?.insertBefore(placeholder, element);
      element.__cctvFullscreenPlaceholder = placeholder;
      // A fixed child is clipped on iOS whenever a page card has transform or
      // overflow. Moving only while expanded makes the map a true top-level
      // layer and preserves its original location for the close action.
      document.body.appendChild(element);
      return;
    }
    const placeholder = element.__cctvFullscreenPlaceholder;
    if (placeholder?.parentNode) placeholder.parentNode.replaceChild(element, placeholder);
    delete element.__cctvFullscreenPlaceholder;
  }

  function toggleFullScreen(element, button) {
    const active = !element.classList.contains('cctv-map-fullscreen');
    if (active) moveToFullscreenLayer(element, true);
    element.classList.toggle('cctv-map-fullscreen', active);
    if (!active) moveToFullscreenLayer(element, false);
    document.documentElement.classList.toggle('cctv-map-fullscreen-open', active);
    document.body.classList.toggle('cctv-map-fullscreen-open', active);
    button.textContent = active ? '\u00d7 \u0e1b\u0e34\u0e14\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e40\u0e15\u0e47\u0e21\u0e08\u0e2d' : '\u26f6 \u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e40\u0e15\u0e47\u0e21\u0e08\u0e2d';
    button.setAttribute('aria-label', active ? '\u0e1b\u0e34\u0e14\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e40\u0e15\u0e47\u0e21\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d' : '\u0e40\u0e1b\u0e34\u0e14\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e41\u0e1a\u0e1a\u0e40\u0e15\u0e47\u0e21\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d');
    button.setAttribute('aria-pressed', String(active));
    notifyParent(active);
    refreshMap(element, [0, 60, 180, 420, 800]);
  }

  function attach(element) {
    if (!element || element.dataset.fullscreenReady === 'true') return;
    element.dataset.fullscreenReady = 'true';
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-fullscreen-action';
    button.textContent = '\u26f6 \u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e40\u0e15\u0e47\u0e21\u0e08\u0e2d';
    button.setAttribute('aria-label', '\u0e40\u0e1b\u0e34\u0e14\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e41\u0e1a\u0e1a\u0e40\u0e15\u0e47\u0e21\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); toggleFullScreen(element, button); });
    element.appendChild(button);

    if ('ResizeObserver' in window) {
      let resizePending = false;
      new ResizeObserver(() => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => { resizePending = false; refreshMap(element, [0]); });
      }).observe(element);
    }
  }

  function patchLeaflet() {
    if (!window.L || window.L.__cctvFullscreenPatched) return Boolean(window.L);
    const originalMap = window.L.map;
    window.L.map = function patchedMap(id, options) {
      const instance = originalMap.call(this, id, options);
      const element = typeof id === 'string' ? document.getElementById(id) : id;
      if (element) {
        element.__cctvLeafletMap = instance;
        instance.on('popupopen popupclose', () => refreshMap(element, [0, 120]));
      }
      return instance;
    };
    window.L.__cctvFullscreenPatched = true;
    return true;
  }

  function refreshActiveMap() { document.querySelectorAll(MAP_SELECTORS).forEach(element => refreshMap(element, [0, 120])); }
  function initialise() { patchLeaflet(); document.querySelectorAll(MAP_SELECTORS).forEach(attach); }

  document.addEventListener('DOMContentLoaded', initialise);
  const timer = setInterval(() => { if (patchLeaflet()) clearInterval(timer); }, 50);
  window.addEventListener('resize', refreshActiveMap, { passive: true });
  window.addEventListener('orientationchange', refreshActiveMap, { passive: true });
  window.visualViewport?.addEventListener('resize', refreshActiveMap, { passive: true });
  window.addEventListener('pageshow', refreshActiveMap, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelector('.cctv-map-fullscreen')?.querySelector('.map-fullscreen-action')?.click();
  });
})();
