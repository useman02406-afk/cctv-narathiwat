/* Shared Leaflet marker design for every map in the command-center. */
if (document.readyState === 'loading' && !window.CctvAdminMapControl) document.write('<script src="admin-area-map-control.js"></script>');
(() => {
  const types = {
    camera:       { color: '#0ea5e9', symbol: '📹', label: 'กล้อง CCTV' },
    economic:     { color: '#d97706', symbol: '🏪', label: 'พื้นที่เศรษฐกิจ' },
    checkpoint:   { color: '#7c3aed', symbol: '🚧', label: 'จุดตรวจ' },
    incident:     { color: '#dc2626', symbol: '⚠', label: 'เหตุการณ์' },
    risk:         { color: '#9333ea', symbol: '◆', label: 'พื้นที่เสี่ยง' },
    surveillance: { color: '#be185d', symbol: '◈', label: 'พื้นที่เฝ้าระวัง' },
    flood:        { color: '#2563eb', symbol: '🌧', label: 'จุดน้ำท่วม' },
    area:         { color: '#0f766e', symbol: '⚑', label: 'เขตพื้นที่' },
    boundary:     { color: '#9a3412', symbol: '⇄', label: 'เขตรอยต่อ' },
    underpass:    { color: '#6d28d9', symbol: '⌁', label: 'ท่อลอด / คอสะพาน' },
    route:        { color: '#475569', symbol: '🛣', label: 'เส้นทาง' },
    person:       { color: '#9f1239', symbol: '👤', label: 'บุคคลกลุ่มเสี่ยง' },
    vehicle:      { color: '#1d4ed8', symbol: '🚗', label: 'รถแจ้งเตือน' },
    home:         { color: '#15803d', symbol: '⌂', label: 'ข้อมูลบ้าน' },
    generic:      { color: '#475569', symbol: '•', label: 'จุดข้อมูล' }
  };
  const incidentColors = { EXPLOSION: '#f97316', SHOOTING: '#db2777', ARSON: '#dc2626', DISTURBANCE: '#7c3aed' };
  const subtypeSymbol = (kind, value) => {
    const text = String(value || '').toLowerCase();
    if (kind === 'camera') {
      if (/wi-?fi/.test(text)) return 'fa-wifi';
      if (/4g/.test(text)) return 'fa-tower-cell';
      if (/ยุทธ|tactical/.test(text)) return 'fa-crosshairs';
      if (/กอ\.รมน|6.?เมือง/.test(text)) return 'fa-video';
      if (/มหาดไทย|สป\.มท/.test(text)) return 'fa-camera';
      if (/เอกชน|private/.test(text)) return 'fa-building';
    }
    if (kind === 'incident') {
      if (/explosion|ระเบิด/.test(text)) return 'fa-bomb';
      if (/shooting|ยิง/.test(text)) return 'fa-crosshairs';
      if (/arson|เผา/.test(text)) return 'fa-fire';
      if (/disturbance|ก่อกวน/.test(text)) return 'fa-triangle-exclamation';
      if (/theft|ลักทรัพย์/.test(text)) return 'fa-lock';
      if (/snatching|วิ่งราว/.test(text)) return 'fa-person-running';
      if (/robbery|ชิงทรัพย์|ปล้น/.test(text)) return 'fa-mask-face';
      if (/traffic|จราจร/.test(text)) return 'fa-car-burst';
    }
    return '';
  };
  const codeToType = { CAMERA: 'camera', ECONOMIC: 'economic', CHECKPOINT: 'checkpoint', INCIDENT: 'incident', RISK: 'risk', SURVEILLANCE: 'surveillance', FLOOD: 'flood', AREA: 'area', BOUNDARY: 'boundary', UNDERPASS: 'underpass', ROUTE: 'route', PERSON: 'person', VEHICLE: 'vehicle', HOME: 'home' };
  const typeToCode = Object.fromEntries(Object.entries(codeToType).map(([code, type]) => [type, code]));
  const categoryProfiles = Object.create(null);
  const applyCategory = row => {
    const code = String(row?.code || '').toUpperCase();
    if (!code) return;
    categoryProfiles[code] = { label: row.name || code, color: row.marker_color || '#475569', symbol: row.marker_symbol || '●', categoryCode: code };
    const type = codeToType[code];
    if (type && types[type]) types[type] = { ...types[type], label: row.name || types[type].label, color: row.marker_color || types[type].color, symbol: row.marker_symbol || types[type].symbol };
  };
  try { JSON.parse(sessionStorage.getItem('cctv_marker_categories') || '[]').forEach(applyCategory); } catch (_) {}
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const symbolHtml = value => {
    const symbol = String(value || '•').trim();
    return /^fa-[a-z0-9-]+$/i.test(symbol) ? `<i class="fa-solid ${safe(symbol)}"></i>` : safe(symbol);
  };
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
    document.head.appendChild(css);
  }
  const profile = (kind, options = {}) => {
    const base = types[kind] || types.generic;
    const requestedCode = String(options.categoryCode || '').toUpperCase();
    const code = requestedCode || typeToCode[kind] || '';
    const category = categoryProfiles[code] || {};
    const subtype = subtypeSymbol(kind, options.subtype);
    const explicit = { ...options };
    delete explicit.color; delete explicit.symbol;
    return { ...base, ...category, ...explicit,
      symbol: options.symbol || (requestedCode && category.symbol) || subtype || category.symbol || base.symbol,
      color: options.color || (kind === 'incident' && incidentColors[options.subtype]) || (requestedCode && category.color) || category.color || base.color };
  };
  const icon = (kind, options = {}) => {
    if (!window.L) return null;
    const item = profile(kind, options);
    const text = options.text || options.uid || '';
    return L.divIcon({
      className: 'cctv-unified-marker-host',
      html: `<div style="position:relative;display:flex;align-items:center;flex-direction:column;min-width:34px;filter:drop-shadow(0 2px 3px #17203388)"><span style="display:grid;place-items:center;width:34px;height:34px;border:2px solid #fff;border-radius:50% 50% 50% 0;background:${safe(item.color)};color:#fff;font:700 16px/1 system-ui;transform:rotate(-45deg)"><b style="transform:rotate(45deg);font:inherit">${symbolHtml(item.symbol)}</b></span>${text ? `<small style="margin-top:2px;max-width:108px;padding:1px 5px;border-radius:5px;background:#fff;color:#172033;border:1px solid #cbd5e1;font:700 10px/1.25 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safe(text)}</small>` : ''}</div>`,
      iconSize: [text ? 112 : 34, text ? 53 : 38],
      iconAnchor: [text ? 56 : 17, text ? 39 : 34],
      popupAnchor: [0, text ? -40 : -34]
    });
  };
  const pointStyle = (kind, options = {}) => {
    const item = profile(kind, options);
    return { radius: options.radius || 8, color: item.color, fillColor: item.color, fillOpacity: .9, weight: 2 };
  };
  const clearCategories = () => Object.keys(categoryProfiles).forEach(code => delete categoryProfiles[code]);
  const hydrate = async client => {
    if (!client?.from) return [];
    const { data, error } = await client.from('map_marker_categories').select('code,name,marker_color,marker_symbol,is_active').eq('is_active', true);
    if (error) throw error;
    // Supabase is the source of truth. Remove stale browser cache entries
    // before applying the current active category list.
    clearCategories();
    (data || []).forEach(applyCategory);
    try { sessionStorage.setItem('cctv_marker_categories', JSON.stringify(data || [])); } catch (_) {}
    window.dispatchEvent(new CustomEvent('cctv-markers-ready', { detail: data || [] }));
    return data || [];
  };
  window.CCTVMarkerSystem = Object.freeze({ types, profile, icon, pointStyle, safe, symbolHtml, subtypeSymbol, hydrate, codeToType, typeToCode, categories: categoryProfiles });
  const boot = event => hydrate(event?.detail?.client || window.cctvSession?.client).catch(() => {});
  if (window.cctvSession?.client) boot(); else window.addEventListener('cctv-auth-ready', boot, { once: true });
})();
