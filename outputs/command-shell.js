(() => {
  'use strict';
  if (window.__commandShellInstalled) return;
  window.__commandShellInstalled = true;
  const page = location.pathname.split('/').pop().toLowerCase();
  if (!page || ['login.html','password-reset.html'].includes(page) || document.querySelector('.home-sidebar')) return;
  const sections = [
    ['ศูนย์บัญชาการ',[
      ['command-center-v2.html#dashboard','fa-chart-line','ภาพรวมศูนย์'],['station-overview.html','fa-building-shield','ภาพรวมราย สภ.'],['command-center-v2.html#live','fa-video','กล้อง CCTV'],['command-center-v2.html#timeline','fa-shield-halved','เหตุความมั่นคง'],['critical-infrastructure.html','fa-building','พื้นที่เศรษฐกิจ']
    ]],
    ['ข้อมูลปฏิบัติการ',[
      ['command-center-v2.html#people','fa-user-shield','ข้อมูลบุคคล'],['command-center-v2.html#vehicles','fa-car-on','รถแจ้งเตือน'],['command-center-v2.html#vehicles','fa-binoculars','บันทึกพบรถ'],['command-center-v2.html#risk','fa-triangle-exclamation','พื้นที่เสี่ยง']
    ]],
    ['วิเคราะห์และรายงาน',[
      ['command-center-v2.html#risk','fa-location-crosshairs','วิเคราะห์พื้นที่'],['home-search.html','fa-house-chimney','ค้นหาบ้าน'],['command-center-v2.html#timeline','fa-route','ไทม์ไลน์สืบสวน'],['command-center-v2.html#reports','fa-file-lines','ศูนย์รายงาน']
    ]]
  ];
  const nav = sections.map(([label,items])=>`<div class="command-shell-label">${label}</div>${items.map(([href,icon,text])=>`<a href="${href}"${page===href?' class="is-active" aria-current="page"':''}><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${text}</span></a>`).join('')}`).join('');
  const shell = document.createElement('aside');
  shell.className = 'command-shell';
  shell.setAttribute('aria-label','เมนูศูนย์บัญชาการ');
  shell.innerHTML = `<div class="command-shell-brand"><div class="command-shell-logo">ภ.จว.</div><div><strong>CCTV COMMAND</strong><small>ตำรวจภูธรจังหวัดนราธิวาส</small></div></div><nav class="command-shell-nav">${nav}</nav><div class="command-shell-foot"><div class="command-shell-status">ระบบทำงานปกติ</div><span class="command-shell-user">กำลังตรวจสอบผู้ใช้…</span></div>`;
  const overlay=document.createElement('div');overlay.className='command-shell-mobile-overlay';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='command-shell-toggle';toggle.setAttribute('aria-label','เปิดหรือย่อเมนูศูนย์บัญชาการ');toggle.innerHTML='<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  document.body.prepend(overlay);document.body.prepend(shell);document.body.prepend(toggle);document.body.classList.add('command-shell-ready');
  const mobile=()=>matchMedia('(max-width:900px)').matches;
  const closeMobile=()=>document.body.classList.remove('command-shell-open');
  toggle.addEventListener('click',()=>{if(mobile())document.body.classList.toggle('command-shell-open');else document.body.classList.toggle('command-shell-collapsed');window.dispatchEvent(new Event('resize'));});
  overlay.addEventListener('click',closeMobile);shell.addEventListener('click',event=>{if(mobile()&&event.target.closest('a'))closeMobile();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobile();});
  const identity=event=>{const session=event?.detail||window.cctvSession;if(!session)return;const profile=session.profile||{};shell.querySelector('.command-shell-user').textContent=`${profile.full_name||session.user?.email||'ผู้ใช้งาน'} · ${profile.role||'VIEWER'}`;};
  identity();window.addEventListener('cctv-auth-ready',identity);
})();
