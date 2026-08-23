(() => {
  'use strict';
  if (window.__vehicleMapLoading || window.__vehicleMapLoaded) return;
  window.__vehicleMapLoading = true;
  let db = null;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitForDatabase(timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const client = window.CCTV_SUPABASE;
      if (client && typeof client.from === 'function') return client;
      await sleep(100);
    }
    throw new Error('ไม่พบการเชื่อมต่อฐานข้อมูล Supabase');
  }
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text = (row, ...keys) => keys.map(key => row[key]).find(value => value !== null && value !== undefined && String(value).trim()) ?? '-';
  const coord = value => { const n = Number(String(value ?? '').replace(/,/g, '.').trim()); return Number.isFinite(n) ? n : null; };
  const latitude = row => coord(row.latitude ?? row.lat);
  const longitude = row => coord(row.longitude ?? row.lng);
  const validPoint = row => { const lat=latitude(row), lng=longitude(row); return lat!==null&&lng!==null&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180; };
  const dt = value => { if (!value) return '-'; const d=new Date(value); return Number.isNaN(d.getTime())?String(value):d.toLocaleString('th-TH'); };
  const loadStyle = href => new Promise(resolve => { if ([...document.styleSheets].some(s => (s.href||'').includes(href.split('/').pop()))) return resolve(); const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload=resolve; document.head.appendChild(l); });
  const loadScript = src => new Promise((resolve,reject) => { if ([...document.scripts].some(s => s.src===src)) return resolve(); const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });

  async function ensureLeaflet(){
    await Promise.all([loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),loadStyle('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css'),loadStyle('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css')]);
    if(!window.L) await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    if(!window.L.markerClusterGroup) await loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
  }

  function popup(row){
    const photo = text(row,'photo_url','image_url','evidence_url');
    return `<div class="vehicle-popup"><h3>${esc(text(row,'plate_number'))} ${esc(text(row,'province'))}</h3><dl>
      <dt>ประเภทแจ้ง</dt><dd>${esc(text(row,'alert_type'))}</dd><dt>สถานะ</dt><dd>${esc(text(row,'case_status','status'))}</dd>
      <dt>รถ</dt><dd>${esc([text(row,'vehicle_brand','brand'),text(row,'vehicle_model','model'),text(row,'vehicle_color','color')].filter(v=>v!=='-').join(' ')||'-')}</dd>
      <dt>เลขตัวรถ</dt><dd>${esc(text(row,'chassis_number'))}</dd><dt>สภ.</dt><dd>${esc(text(row,'police_station'))}</dd>
      <dt>วันที่แจ้ง</dt><dd>${esc(dt(row.reported_at))}</dd><dt>สถานที่พบ</dt><dd>${esc(text(row,'last_location','location'))}</dd>
      <dt>พิกัด</dt><dd>${esc(text(row,'latitude','lat'))}, ${esc(text(row,'longitude','lng'))}</dd><dt>รายละเอียด</dt><dd>${esc(text(row,'notes','details','incident_cause'))}</dd>
    </dl>${photo!=='-'?`<img loading="lazy" src="${esc(photo)}" alt="ภาพรถ ${esc(text(row,'plate_number'))}">`:''}</div>`;
  }

  function card(row,index){
    return `<article class="vehicle-card"><h3>${esc(text(row,'plate_number'))} ${esc(text(row,'province'))}</h3><p><b>${esc(text(row,'alert_type'))}</b> · ${esc(text(row,'case_status','status'))}</p><p>${esc(text(row,'vehicle_brand','brand'))} ${esc(text(row,'vehicle_model','model'))} · ${esc(text(row,'vehicle_color','color'))}</p><p>สภ.: ${esc(text(row,'police_station'))}</p><p>${esc(text(row,'last_location','location'))}</p>${validPoint(row)?`<button type="button" data-focus="${index}">ดูบนแผนที่</button>`:''}</article>`;
  }

  async function fetchAll(){
    const all=[]; const size=1000;
    for(let from=0;;from+=size){
      const {data,error}=await db.from('vehicle_alerts').select('*').order('reported_at',{ascending:false}).range(from,from+size-1);
      if(error) throw error; all.push(...(data||[])); if(!data||data.length<size) break;
    }
    return all;
  }

  function hideLegacyDuplicateViews(){
    const root=document.querySelector('main.wrap');
    if(!root)return;
    const children=Array.from(root.children);
    const stats=children.find(el=>el.classList.contains('stats'));
    const history=children.find(el=>{
      if(!el.classList.contains('panel'))return false;
      const heading=Array.from(el.children).find(child=>child.tagName==='H2');
      return heading?.textContent.trim()==='ประวัติการตรวจพบ';
    });
    [stats,history].filter(Boolean).forEach(el=>{
      el.hidden=true;
      el.classList.add('vehicle-legacy-duplicate');
      el.setAttribute('aria-hidden','true');
    });
  }

  async function init(){
    hideLegacyDuplicateViews();
    db = await waitForDatabase();
    const main = document.querySelector('main');
    if(!main) throw new Error('ไม่พบพื้นที่แสดงผลหลัก');
    const section=document.createElement('section'); section.className='vehicle-live-panel';
    section.innerHTML=`<header class="vehicle-live-head"><h2>🚘 แผนที่และรายการพบรถ</h2><p>แสดงรถแจ้งเตือนและบันทึกพบรถ พร้อมพิกัดและรายละเอียดจริง</p></header><div class="vehicle-live-tools"><input id="vehicleLiveSearch" placeholder="ค้นหาทะเบียน ยี่ห้อ รุ่น สถานที่ หรือรายละเอียด"><select id="vehicleLiveStation"><option value="">ทุก สภ.</option></select><select id="vehicleLiveStatus"><option value="">ทุกสถานะ</option></select><select id="vehicleLivePageSize"><option>25</option><option selected>50</option><option>100</option></select></div><div class="vehicle-live-stats"><span class="vehicle-live-stat" id="vehicleLiveTotal">กำลังโหลด…</span><span class="vehicle-live-stat" id="vehicleLiveCoords"></span></div><div class="vehicle-live-grid"><div class="vehicle-map-shell"><div id="vehicleLiveMap" class="vehicle-map"></div><button type="button" class="vehicle-map-full">⛶ แผนที่เต็มจอ</button></div><div id="vehicleLiveList" class="vehicle-list"></div></div><div class="vehicle-pages"><button id="vehiclePrev">ก่อนหน้า</button><b id="vehiclePage"></b><button id="vehicleNext">ถัดไป</button></div>`;
    main.prepend(section);
    try{
      await ensureLeaflet(); const rows=await fetchAll(); let page=1; let filtered=[]; let markers=[];
      const map=L.map('vehicleLiveMap',{preferCanvas:true}).setView([6.42,101.82],10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
      const cluster=L.markerClusterGroup({chunkedLoading:true,chunkInterval:80,chunkDelay:20,removeOutsideVisibleBounds:true,showCoverageOnHover:false,maxClusterRadius:55}); map.addLayer(cluster);
      const station=document.getElementById('vehicleLiveStation'), status=document.getElementById('vehicleLiveStatus');
      [...new Set(rows.map(r=>text(r,'police_station')).filter(v=>v!=='-'))].sort().forEach(v=>station.add(new Option(v,v)));
      [...new Set(rows.map(r=>text(r,'case_status','status')).filter(v=>v!=='-'))].sort().forEach(v=>status.add(new Option(v,v)));
      function render(){
        const q=document.getElementById('vehicleLiveSearch').value.trim().toLowerCase(); const st=station.value, ss=status.value;
        filtered=rows.filter(r=>(!st||text(r,'police_station')===st)&&(!ss||text(r,'case_status','status')===ss)&&(!q||Object.values(r).some(v=>String(v??'').toLowerCase().includes(q))));
        const pageSize=Number(document.getElementById('vehicleLivePageSize').value); const pages=Math.max(1,Math.ceil(filtered.length/pageSize)); page=Math.min(page,pages); const start=(page-1)*pageSize; const slice=filtered.slice(start,start+pageSize);
        document.getElementById('vehicleLiveTotal').textContent=`พบ ${filtered.length.toLocaleString('th-TH')} รายการ`; document.getElementById('vehicleLiveCoords').textContent=`มีพิกัด ${filtered.filter(validPoint).length.toLocaleString('th-TH')} รายการ`;
        document.getElementById('vehicleLiveList').innerHTML=slice.length?slice.map((r,i)=>card(r,i)).join(''):'<div class="vehicle-empty">ไม่พบข้อมูลตามเงื่อนไข</div>'; document.getElementById('vehiclePage').textContent=`หน้า ${page} / ${pages}`; document.getElementById('vehiclePrev').disabled=page<=1; document.getElementById('vehicleNext').disabled=page>=pages;
        cluster.clearLayers(); markers=[]; const markersByIndex=new Map(); slice.forEach((row,index)=>{if(!validPoint(row)) return; const marker=L.marker([latitude(row),longitude(row)]).bindPopup(popup(row),{maxWidth:340}); markers.push(marker); markersByIndex.set(index,marker); cluster.addLayer(marker);});
        if(markers.length){const bounds=cluster.getBounds(); if(bounds.isValid()) map.fitBounds(bounds.pad(.12),{maxZoom:15,animate:false});}
        document.querySelectorAll('[data-focus]').forEach(btn=>btn.onclick=()=>{const marker=markersByIndex.get(Number(btn.dataset.focus)); if(marker){cluster.zoomToShowLayer(marker,()=>marker.openPopup());}});
      }
      ['vehicleLiveSearch','vehicleLiveStation','vehicleLiveStatus','vehicleLivePageSize'].forEach(id=>document.getElementById(id).addEventListener(id==='vehicleLiveSearch'?'input':'change',()=>{page=1;render();}));
      document.getElementById('vehiclePrev').onclick=()=>{page--;render();}; document.getElementById('vehicleNext').onclick=()=>{page++;render();};
      const shell=section.querySelector('.vehicle-map-shell'), full=section.querySelector('.vehicle-map-full'); full.onclick=()=>{shell.classList.toggle('is-full'); full.textContent=shell.classList.contains('is-full')?'× ปิดแผนที่เต็มจอ':'⛶ แผนที่เต็มจอ'; setTimeout(()=>map.invalidateSize({pan:false}),80);};
      render(); setTimeout(()=>map.invalidateSize({pan:false}),120);
    }catch(error){document.getElementById('vehicleLiveTotal').textContent='โหลดข้อมูลไม่สำเร็จ'; document.getElementById('vehicleLiveList').innerHTML=`<div class="vehicle-empty">${esc(error.message||error)}</div>`;}
  }
  async function boot(){
    try {
      await init();
      window.__vehicleMapLoaded = true;
    } catch(error) {
      window.__vehicleMapLoading = false;
      console.error('Vehicle map initialization failed:', error);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
