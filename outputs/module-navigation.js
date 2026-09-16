(() => {
  'use strict';
  const modules = [
    ['ภาพรวมศูนย์','fa-gauge-high','home.html','กล้องออนไลน์ สถานีตำรวจ เหตุเฝ้าระวัง รถแจ้งเตือน แผนที่สถานการณ์ และการแจ้งเตือนล่าสุด'],
    ['ภาพรวม สภ.','fa-building-shield','station-overview.html','เปรียบเทียบจำนวนกล้องออนไลน์และออฟไลน์ พร้อมติดตามความพร้อมและผลการปฏิบัติงานของแต่ละ สภ.'],
    ['ข้อมูลกล้อง CCTV','fa-video','camera-center.html','ทะเบียนกล้อง พิกัด จุดติดตั้ง หน่วยงานเจ้าของ ทิศทางการมอง เครือข่าย และประวัติการซ่อม'],
    ['เหตุความมั่นคง','fa-shield-halved','investigations.html','บันทึกประเภทเหตุ วันเวลา พิกัด บุคคล รถ ภาพจากกล้อง และสถานะการดำเนินงาน'],
    ['พื้นที่เศรษฐกิจ','fa-store','critical-infrastructure.html','เฝ้าระวังตลาด ย่านการค้า สถานีขนส่ง ด่านชายแดน และเส้นทางเศรษฐกิจสำคัญ'],
    ['พื้นที่เสี่ยง / เฝ้าระวัง','fa-triangle-exclamation','risk-areas.html','กำหนดพื้นที่เสี่ยง ระดับความรุนแรง เหตุย้อนหลัง มาตรการ และหน่วยรับผิดชอบบนแผนที่'],
    ['ข้อมูลบุคคล','fa-user-shield','risk-persons.html','จัดเก็บรูปพรรณ ตำหนิ ที่อยู่ ยานพาหนะ เหตุที่เกี่ยวข้อง และความเชื่อมโยงระหว่างบุคคล'],
    ['รถแจ้งเตือน / พบรถ','fa-car-on','vehicle-alerts.html','ติดตามทะเบียน จุดแจ้งหาย จุดพบรถ ระยะทาง ระยะเวลาดำเนินการ และกล้องที่ตรวจพบตามเส้นทาง'],
    ['วิเคราะห์พื้นที่ภารกิจ','fa-bullseye','mission-planner.html','วางแผนจุดสกัด เส้นทางเข้า–ออก ตำแหน่งกล้อง พื้นที่อับสายตา และกำลังเจ้าหน้าที่'],
    ['ค้นหาบ้าน','fa-house-chimney','home-search.html','ค้นหาจากเลขที่บ้าน เจ้าบ้าน พิกัด หมู่บ้าน ตำบล หรือเขตรับผิดชอบของ สภ.'],
    ['ไทม์ไลน์สืบสวน','fa-timeline','case-timeline.html','รวมเหตุ ภาพจากกล้อง บุคคล รถ และหลักฐาน เรียงตามเวลาเพื่อเห็นลำดับการเคลื่อนไหว'],
    ['ศูนย์รายงาน','fa-file-lines','reports.html','จัดทำรายงานรายวัน รายเดือน ราย สภ. และรายประเภทเหตุ พร้อมส่งออกตามสิทธิ์ผู้ใช้งาน']
  ];
  const tabs = document.getElementById('moduleTabs');
  const title = document.getElementById('moduleDetailTitle');
  const text = document.getElementById('moduleDetailText');
  const icon = document.getElementById('moduleDetailIcon');
  const open = document.getElementById('moduleOpen');
  if (!tabs || !title || !text || !icon || !open) return;
  const select = index => {
    const item = modules[index];
    tabs.querySelectorAll('.module-tab').forEach((button, position) => button.setAttribute('aria-selected', String(position === index)));
    title.textContent = `${index + 1}. ${item[0]}`;
    text.textContent = item[3];
    icon.className = `fa-solid ${item[1]}`;
    open.href = item[2];
    open.setAttribute('aria-label', `เปิดโมดูล ${item[0]}`);
  };
  tabs.replaceChildren(...modules.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'module-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');
    button.innerHTML = `<i class="fa-solid ${item[1]}"></i>${index + 1}. ${item[0]}`;
    button.addEventListener('click', () => select(index));
    return button;
  }));
  select(0);
})();
