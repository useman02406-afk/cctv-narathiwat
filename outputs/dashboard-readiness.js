(function () {
  'use strict';
  const number = (text) => Number(String(text || '').replace(/[^0-9]/g, '')) || 0;

  function render() {
    const list = document.getElementById('summaryList');
    const cards = document.querySelector('#dashboard .cards');
    if (!list || !cards || document.getElementById('systemReadiness')) return;
    const total = number(document.getElementById('allCount')?.textContent);
    if (!total || !list.children.length) return;

    const rows = [...list.children].map((row) => {
      const label = row.querySelector('span')?.textContent || 'ไม่ระบุ';
      const count = number(row.querySelector('b')?.textContent);
      const kind = /ปกติ|online|พร้อม/i.test(label) ? 'ok' : /ไม่ระบุ|ซ่อม|ขัดข้อง|offline/i.test(label) ? 'warning' : 'danger';
      return { label, count, kind, pct: Math.round((count * 100) / total) };
    });
    const normal = rows.filter((row) => row.kind === 'ok').reduce((sum, row) => sum + row.count, 0);
    const score = Math.round((normal * 100) / total);
    const panel = document.createElement('section');
    panel.id = 'systemReadiness';
    panel.className = 'readiness-panel';
    panel.innerHTML = `<div class="readiness-score"><div><b>${score}%</b><small>ความพร้อมกล้อง</small></div></div><div class="readiness-copy"><h2>สถานะความพร้อมระบบกล้อง</h2><p>สรุปจากสถานะกล้องที่บันทึกในระบบ ณ เวลาปัจจุบัน</p><div class="readiness-rows">${rows.slice(0, 5).map((row) => `<div class="readiness-row ${row.kind}"><span>${row.label}</span><div class="readiness-track"><div class="readiness-fill" style="width:${Math.max(row.pct, 3)}%">${row.pct}%</div></div><span class="readiness-count">${row.count.toLocaleString()}</span></div>`).join('')}</div></div>`;
    cards.insertAdjacentElement('afterend', panel);
  }

  const listen = () => {
    const list = document.getElementById('summaryList');
    if (list) new MutationObserver(render).observe(list, { childList: true });
    setTimeout(render, 300);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listen, { once: true });
  else listen();
})();
