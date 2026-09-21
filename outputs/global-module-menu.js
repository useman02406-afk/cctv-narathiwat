(() => {
  'use strict';
  const page = location.pathname.split('/').pop().toLowerCase() || 'home.html';
  if (window.top !== window.self || page === 'home.html' || document.getElementById('cctv-module-launcher')) return;
  const modules = [
    ['ภาพรวมศูนย์','home.html','กล้อง สถานี เหตุเฝ้าระวัง รถ และสถานการณ์ล่าสุด'],
    ['ภาพรวม สภ.','station-overview.html','สถานะกล้องและผลการปฏิบัติงานราย สภ.'],
    ['ข้อมูลกล้อง CCTV','camera-center.html','ทะเบียน พิกัด เครือข่าย และประวัติการซ่อม'],
    ['เหตุความมั่นคง','investigations.html','เหตุ บุคคล รถ หลักฐาน และสถานะดำเนินงาน'],
    ['พื้นที่เศรษฐกิจ','critical-infrastructure.html','ตลาด ย่านการค้า ขนส่ง ด่าน และเส้นทางสำคัญ'],
    ['พื้นที่เสี่ยง / เฝ้าระวัง','risk-areas.html','ระดับความเสี่ยง เหตุย้อนหลัง และมาตรการ'],
    ['ข้อมูลบุคคล','risk-persons.html','รูปพรรณ ที่อยู่ รถ และความเชื่อมโยง'],
    ['รถแจ้งเตือน / พบรถ','vehicle-alerts.html','ทะเบียน จุดแจ้งหาย จุดพบ และเส้นทางตรวจพบ'],
    ['วิเคราะห์พื้นที่ภารกิจ','mission-planner.html','จุดสกัด เส้นทาง กล้อง พื้นที่อับ และกำลัง'],
    ['ค้นหาบ้าน','home-search.html','เลขที่บ้าน เจ้าบ้าน พิกัด และเขต สภ.'],
    ['ไทม์ไลน์สืบสวน','case-timeline.html','เหตุ ภาพ บุคคล รถ และหลักฐานตามเวลา'],
    ['ศูนย์รายงาน','reports.html','รายงานตามเวลา สภ. ประเภทเหตุ และการส่งออก']
  ];
  const render = () => {
    if (!document.body || document.getElementById('cctv-module-launcher')) return;
    const current = location.pathname.split('/').pop() || 'home.html';
    const launcher = document.createElement('button');
    launcher.id = 'cctv-module-launcher';
    launcher.className = 'cctv-module-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.innerHTML = '<i class="fa-solid fa-table-cells-large"></i> เมนู 12 หมวด';
    const overlay = document.createElement('div');
    overlay.className = 'cctv-module-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cctv-module-menu-title');
    overlay.innerHTML = `<section class="cctv-module-dialog"><header><div><h2 id="cctv-module-menu-title">โมดูลระบบ 12 หมวด</h2><p>เลือกเพื่อเปิดโมดูล พร้อมดูคำอธิบายหน้าที่โดยย่อ</p></div><button class="cctv-module-close" type="button" aria-label="ปิดเมนู">×</button></header><nav class="cctv-module-grid">${modules.map((item,index)=>`<a class="cctv-module-card${current===item[1]?' current':''}" href="${item[1]}"><span class="cctv-module-number">${index+1}</span><span><strong>${item[0]}</strong><small>${item[2]}</small></span></a>`).join('')}</nav><div class="cctv-module-foot"><i class="fa-solid fa-lock"></i> ระบบส่วนตัวสำหรับผู้ได้รับอนุญาต · ข้อมูลต้นแบบสำหรับการทดสอบและนำเสนอ</div></section>`;
    const focusable = () => [...overlay.querySelectorAll('a[href],button:not([disabled])')];
    const close = () => {
      overlay.classList.remove('open');
      document.body.style.removeProperty('overflow');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    };
    launcher.setAttribute('aria-expanded', 'false');
    launcher.addEventListener('click', () => {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      launcher.setAttribute('aria-expanded', 'true');
      overlay.querySelector('.cctv-module-close').focus();
    });
    overlay.querySelector('.cctv-module-close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', event => {
      if (!overlay.classList.contains('open')) return;
      if (event.key === 'Escape') return close();
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.body.append(launcher, overlay);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();
