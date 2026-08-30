(function () {
  'use strict';

  const HIDDEN_CLASS = 'vehicle-duplicate-hidden';
  const metricIds = ['all', 'today', 'cctv'];

  function installStyle() {
    if (document.getElementById('vehicle-module-cleanup-style')) return;
    const style = document.createElement('style');
    style.id = 'vehicle-module-cleanup-style';
    style.textContent = `.${HIDDEN_CLASS}{display:none!important}`;
    document.head.appendChild(style);
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function renameMapHeading() {
    const oldText = 'แผนที่และรายการรถจากฐานข้อมูล';
    const newText = 'แผนที่และรายการพบรถ';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.includes(oldText)) {
        node.nodeValue = node.nodeValue.replaceAll(oldText, newText);
      }
    }
  }

  function hideMetricCard(element) {
    if (!element) return;
    let target = element;
    let current = element.parentElement;
    while (current && current !== document.body) {
      const metricCount = current.querySelectorAll(metricIds.map((id) => `#${id}`).join(',')).length;
      if (metricCount > 1 || ['MAIN', 'SECTION'].includes(current.tagName)) break;
      target = current;
      current = current.parentElement;
    }
    target.classList.add(HIDDEN_CLASS);
    target.setAttribute('aria-hidden', 'true');
  }

  function hideDuplicateMetrics() {
    metricIds.forEach((id) => hideMetricCard(document.getElementById(id)));
  }

  function hideDuplicateHistory() {
    const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b');
    for (const heading of headings) {
      if (cleanText(heading.textContent) !== 'ประวัติการตรวจพบ') continue;
      let target = heading.parentElement;
      let current = target;
      while (current && current !== document.body) {
        if (current.querySelector('table')) {
          target = current;
          break;
        }
        if (['MAIN'].includes(current.tagName)) break;
        current = current.parentElement;
      }
      if (target && target !== document.body && target.tagName !== 'MAIN') {
        target.classList.add(HIDDEN_CLASS);
        target.setAttribute('aria-hidden', 'true');
      }
    }
  }

  function applyCleanup() {
    installStyle();
    renameMapHeading();
    hideDuplicateMetrics();
    hideDuplicateHistory();
  }

  function start() {
    applyCleanup();
    const observer = new MutationObserver(applyCleanup);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
