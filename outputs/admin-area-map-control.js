/* Shared Thailand province/district/subdistrict lookup for every Leaflet map. */
(() => {
  if (!window.L || window.CctvAdminMapControl) return;
  if (document.readyState === 'loading' && !window.ThailandAdmin) document.write('<script src="data/thailand-admin-index.js"></script>');
  const controls = new Set();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const textOf = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const layerText = layer => {
    try {
      return textOf([
        layer.getPopup?.()?.getContent?.(),
        layer.getTooltip?.()?.getContent?.(),
        layer.options?.title,
        layer.options?.alt,
        ...Object.values(layer.feature?.properties || {})
      ].filter(Boolean).join(' '));
    } catch (_) { return ''; }
  };
  const collectLayers = layer => {
    const collected = [];
    if (layer?.getLatLng) collected.push(layer);
    if (layer?.eachLayer) layer.eachLayer(child => collected.push(...collectLayers(child)));
    return collected;
  };
  const coordinate = value => {
    const found = String(value || '').trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!found) return null;
    const lat = Number(found[1]), lng = Number(found[2]);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  };
  const setLayerVisibility = (layer, visible) => {
    if (layer?.setOpacity) layer.setOpacity(visible ? 1 : 0);
    else if (layer?.setStyle) layer.setStyle({ opacity:visible ? 1 : 0, fillOpacity:visible ? .9 : 0 });
  };
  const restorePoints = map => {
    (map.__cctvAdminSearchPoints || []).forEach(layer => setLayerVisibility(layer, true));
    map.__cctvAdminSearchPoints = [];
  };
  const zoomToMatches = (map, item) => {
    const terms = [item.name, item.amphoe, item.province].filter(Boolean).map(textOf);
    const matches = [], points = [];
    map.eachLayer(layer => collectLayers(layer).forEach(point => {
      const content = layerText(point);
      if (!content) return;
      points.push(point);
      const matched = terms.every(term => content.includes(term));
      setLayerVisibility(point, matched);
      if (matched) matches.push(point.getLatLng());
    }));
    map.__cctvAdminSearchPoints = points;
    try { sessionStorage.setItem('cctv_selected_administrative_area', JSON.stringify(item)); } catch (_) {}
    const unique = matches.filter((point, index, list) => index === list.findIndex(other => other.lat === point.lat && other.lng === point.lng));
    if (unique.length) map.fitBounds(L.latLngBounds(unique), { padding:[32,32], maxZoom:15 });
    map.__cctvAdminControl?.__setSelected?.(item, unique.length);
    window.dispatchEvent(new CustomEvent('cctv:administrative-area-selected', { detail:{ ...item, matchingMarkers:unique.length, map } }));
    return unique.length;
  };
  const buildControl = map => {
    const control = L.control({position:'topright'});
    control.onAdd = () => {
      const host = L.DomUtil.create('div', 'cctv-admin-search');
      host.innerHTML = '<button class="admin-toggle" type="button" aria-label="ค้นหาพื้นที่">⌕</button><section class="admin-panel" hidden><strong>ค้นหาพื้นที่ประเทศไทย</strong><div class="admin-current">ยังไม่ได้เลือกพื้นที่</div><input type="search" placeholder="จังหวัด / อำเภอ / ตำบล" autocomplete="off"><div class="admin-results">กำลังเตรียมข้อมูลพื้นที่…</div></section>';
      const button = host.querySelector('.admin-toggle');
      const panel = host.querySelector('.admin-panel');
      const input = host.querySelector('input');
      const results = host.querySelector('.admin-results');
      const current = host.querySelector('.admin-current');
      const render = () => {
        const api = window.ThailandAdmin;
        const query = input.value.trim();
        if (!api) { results.textContent = 'กำลังเตรียมข้อมูลพื้นที่…'; return; }
        if (query.length < 2) { results.textContent = 'พิมพ์อย่างน้อย 2 ตัวอักษร'; return; }
        const point = coordinate(query);
        if (point) {
          results.innerHTML = `<button type="button" class="admin-coordinate">ไปยังพิกัด ${point.lat}, ${point.lng}</button>`;
          results.querySelector('.admin-coordinate').onclick = () => { map.setView([point.lat, point.lng], 16); results.textContent = 'ย้ายแผนที่ไปยังพิกัดแล้ว'; };
          return;
        }
        const found = api.search(query, 15);
        results.innerHTML = found.length ? found.map((row, index) => `<button type="button" data-index="${index}">${esc(row.label)}</button>`).join('') : '<span>ไม่พบชื่อพื้นที่</span>';
        results.querySelectorAll('button').forEach(button => button.onclick = () => {
          const item = found[Number(button.dataset.index)];
          const count = zoomToMatches(map, item);
          input.value = item.label;
          results.innerHTML = `<span>${count ? `แสดงหมุดในพื้นที่ ${count.toLocaleString()} จุด` : 'เลือกพื้นที่แล้ว — หมุดในหน้าปัจจุบันไม่มีข้อมูลตรงกัน'}</span><button type="button" class="admin-reset">ล้างการเลือกพื้นที่</button>`;
          results.querySelector('.admin-reset').onclick = () => { restorePoints(map); try { sessionStorage.removeItem('cctv_selected_administrative_area'); } catch (_) {} input.value = ''; current.textContent = 'ยังไม่ได้เลือกพื้นที่'; results.textContent = 'ล้างการเลือกแล้ว'; };
        });
      };
      button.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); };
      input.addEventListener('input', render);
      input.addEventListener('keydown', event => {
        if (event.key === 'Escape') { panel.hidden = true; button.focus(); }
        if (event.key === 'Enter') { event.preventDefault(); results.querySelector('button')?.click(); }
      });
      L.DomEvent.disableClickPropagation(host);
      L.DomEvent.disableScrollPropagation(host);
      control.__refresh = render;
      control.__setSelected = (item, count) => { input.value = item.label; current.textContent = `พื้นที่ที่เลือก: ${item.label} · ${count.toLocaleString()} หมุด`; };
      controls.add(control);
      return host;
    };
    control.addTo(map);
    map.__cctvAdminControl = control;
  };
  const savedArea = () => { try { return JSON.parse(sessionStorage.getItem('cctv_selected_administrative_area') || 'null'); } catch (_) { return null; } };
  const install = map => {
    if (!map || map.__cctvAdminSearch) return;
    map.__cctvAdminSearch = true;
    buildControl(map);
    // Do not reuse a saved area filter automatically.  A filter selected on
    // another map could hide every marker on a newly opened module even though
    // its data has loaded correctly.  Area filtering now happens only after
    // the user selects an area in this map's own search panel.
  };
  const originalMap = L.map.bind(L);
  L.map = function(...args) { const map = originalMap(...args); install(map); return map; };
  window.addEventListener('thailand-admin-ready', () => controls.forEach(control => control.__refresh?.()));
  const css = document.createElement('style');
  css.textContent = '.cctv-admin-search{display:flex;align-items:flex-start;gap:6px;font:14px/1.35 system-ui,sans-serif}.cctv-admin-search .admin-toggle{width:38px;height:38px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f3d8c;font-size:24px;font-weight:700;box-shadow:0 2px 8px #0f172a26;cursor:pointer}.cctv-admin-search .admin-panel{width:min(300px,calc(100vw - 78px));padding:10px;border:1px solid #bfdbfe;border-radius:11px;background:#fff;box-shadow:0 8px 24px #0f172a2e}.cctv-admin-search strong{display:block;margin-bottom:6px;color:#0f3d8c}.cctv-admin-search .admin-current{margin:0 0 7px;padding:6px 7px;border-radius:7px;background:#eff6ff;color:#1d4e89;font-size:11px;font-weight:700}.cctv-admin-search input{width:100%;padding:8px;border:1px solid #94a3b8;border-radius:7px;font:inherit}.cctv-admin-search .admin-results{max-height:230px;overflow:auto;margin-top:7px;color:#475569;font-size:12px}.cctv-admin-search .admin-results button{display:block;width:100%;padding:8px;border:0;border-bottom:1px solid #e2e8f0;background:#fff;text-align:left;font:inherit;cursor:pointer}.cctv-admin-search .admin-results button:hover{background:#eff6ff;color:#0758b5}.cctv-admin-search .admin-results span{display:block;padding:8px}';
  document.head.appendChild(css);
  window.CctvAdminMapControl = { install };
})();
