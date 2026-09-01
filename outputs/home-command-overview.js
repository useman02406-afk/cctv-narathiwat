(() => {
  'use strict';
  if (window.__homeCommandOverview) return;
  window.__homeCommandOverview = true;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pick=(row,...keys)=>keys.map(key=>row?.[key]).find(value=>value!==null&&value!==undefined&&String(value).trim())??'-';
  const stationOf=row=>{const value=pick(row,'police_station','responsible_station','station','area');return value==='-'?'ไม่ระบุ สภ.':String(value).trim()};
  const shortDate=value=>{if(!value)return '-';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('th-TH',{day:'2-digit',month:'short'})};
  const waitClient=()=>new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{const client=window.cctvSession?.client||window.CCTV_SUPABASE;if(client?.from){clearInterval(timer);resolve(client)}else if(++tries>120){clearInterval(timer);reject(new Error('ไม่พบการเชื่อมต่อฐานข้อมูล'))}},100)});
  async function init(){
    const main=document.querySelector('main.shell');if(!main)return;
    const notice=main.querySelector('#notice');
    const section=document.createElement('section');section.className='home-command-overview';section.innerHTML=`<header class="home-command-overview-head"><div><h2><i class="fa-solid fa-tower-broadcast"></i> ภาพรวมสถานการณ์ปฏิบัติการ</h2><p>เหตุการณ์ รถแจ้งเตือน และงานติดตามล่าสุดจากฐานข้อมูลจริง</p></div><span class="home-command-live">ระบบเชื่อมต่อปกติ</span></header><div class="home-command-station-bar"><label for="homeCommandStation"><i class="fa-solid fa-building-shield"></i> แยกข้อมูลราย สภ.</label><select id="homeCommandStation"><option value="__all__">ทุก สภ.</option></select><span id="homeCommandStationSummary">กำลังรวบรวมข้อมูล…</span></div><div class="home-command-overview-grid"><article class="home-command-panel"><h3><i class="fa-solid fa-shield-halved"></i> เหตุการณ์ล่าสุด <b id="homeCommandIncidentShown"></b></h3><div class="home-command-list" id="homeCommandIncidents"><div class="home-command-empty">กำลังโหลด…</div></div></article><article class="home-command-panel"><h3><i class="fa-solid fa-car-on"></i> รถที่กำลังเฝ้าระวัง <b id="homeCommandVehicleShown"></b></h3><div class="home-command-list" id="homeCommandVehicles"><div class="home-command-empty">กำลังโหลด…</div></div></article><article class="home-command-panel"><h3><i class="fa-solid fa-bolt"></i> เข้าสู่พื้นที่ปฏิบัติการ</h3><div class="home-command-mini-stats"><div class="home-command-mini"><span>คดีทั้งหมด</span><b id="homeCommandCases">–</b></div><div class="home-command-mini"><span>บันทึกไทม์ไลน์</span><b id="homeCommandTimeline">–</b></div></div><div class="home-command-actions"><a class="home-command-action" href="case-timeline.html"><i class="fa-solid fa-route"></i>ไทม์ไลน์สืบสวน</a><a class="home-command-action" href="camera-center.html"><i class="fa-solid fa-map-location-dot"></i>แผนที่กล้อง CCTV</a><a class="home-command-action" href="mission-planner.html"><i class="fa-solid fa-location-crosshairs"></i>วิเคราะห์พื้นที่</a></div></article></div>`;
    notice?notice.after(section):main.prepend(section);
    try{
      const db=await waitClient();
      const [incidents,vehicles,caseCount,timelineCount]=await Promise.all([
        db.from('incidents').select('*').order('occurred_at',{ascending:false}).limit(250),
        db.from('vehicle_alerts').select('*').eq('status','ใช้งาน').order('reported_at',{ascending:false}).limit(500),
        db.from('incidents').select('id',{count:'exact',head:true}),
        db.from('case_timeline_entries').select('id',{count:'exact',head:true})
      ]);
      if(incidents.error)throw incidents.error;if(vehicles.error)throw vehicles.error;
      const incidentRows=incidents.data||[],vehicleRows=vehicles.data||[];
      document.getElementById('homeCommandCases').textContent=Number(caseCount.count||0).toLocaleString('th-TH');
      document.getElementById('homeCommandTimeline').textContent=Number(timelineCount.count||0).toLocaleString('th-TH');
      const stationSelect=document.getElementById('homeCommandStation');
      [...new Set([...incidentRows,...vehicleRows].map(stationOf))].sort((a,b)=>a.localeCompare(b,'th')).forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;stationSelect.append(option)});
      const render=()=>{
        const station=stationSelect.value;
        const incidentList=incidentRows.filter(row=>station==='__all__'||stationOf(row)===station).slice(0,6);
        const vehicleList=vehicleRows.filter(row=>station==='__all__'||stationOf(row)===station).slice(0,6);
        document.getElementById('homeCommandIncidentShown').textContent=`${incidentList.length} รายการ`;
        document.getElementById('homeCommandVehicleShown').textContent=`${vehicleList.length} รายการ`;
        document.getElementById('homeCommandStationSummary').textContent=station==='__all__'?`แสดงภาพรวม ${stationSelect.options.length-1} สภ.`:`กำลังแสดงข้อมูล ${station}`;
        document.getElementById('homeCommandIncidents').innerHTML=incidentList.length?incidentList.map(row=>`<a class="home-command-item" href="investigations.html"><div><strong>${esc(pick(row,'case_no','incident_type'))}</strong><small>${esc(pick(row,'location','details'))}</small><em>${esc(stationOf(row))}</em></div><time>${esc(shortDate(pick(row,'occurred_at','created_at')))}</time></a>`).join(''):'<div class="home-command-empty">ไม่พบเหตุการณ์ของ สภ. นี้</div>';
        document.getElementById('homeCommandVehicles').innerHTML=vehicleList.length?vehicleList.map(row=>`<a class="home-command-item" href="vehicle-alerts.html"><div><strong>${esc(pick(row,'plate_number'))} ${esc(pick(row,'province'))}</strong><small>${esc(pick(row,'vehicle_brand','vehicle_type'))} · ${esc(pick(row,'last_location','police_station'))}</small><em>${esc(stationOf(row))}</em></div><span class="home-command-badge alert">${esc(pick(row,'alert_type'))}</span></a>`).join(''):'<div class="home-command-empty">ไม่พบรถเฝ้าระวังของ สภ. นี้</div>';
      };
      stationSelect.addEventListener('change',render);render();
    }catch(error){section.querySelector('.home-command-live').textContent='โหลดข้อมูลบางส่วนไม่สำเร็จ';section.querySelector('.home-command-live').style.color='#ffd0d0';console.error('Home command overview failed:',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
