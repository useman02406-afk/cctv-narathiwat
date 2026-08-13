(() => {
  'use strict';
  if (window.__cctvSweetAlertsInstalled) return;
  window.__cctvSweetAlertsInstalled = true;
  let sweetAlertReady;
  let fetchBound = false;
  let lastAutomaticSuccessAt = 0;
  let allowOneNativeConfirm = false;
  const nativeConfirm = window.confirm.bind(window);
  const recent = new Map();
  function loadSweetAlert() {
    if (window.Swal) return Promise.resolve(window.Swal);
    if (sweetAlertReady) return sweetAlertReady;
    sweetAlertReady = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
      script.onload = () => resolve(window.Swal);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return sweetAlertReady;
  }
  function fallback(title, message) { window.console?.info(`${title}: ${message}`); }
  function showSweet(title, message = '', type = 'success', options = {}) {
    return loadSweetAlert().then((Swal) => {
      if (!Swal) return fallback(title, message);
      return Swal.fire({
        icon: type,
        title,
        text: message,
        toast: options.toast ?? true,
        position: options.position || 'top-end',
        showConfirmButton: options.confirm ?? false,
        timer: options.timer ?? 3000,
        timerProgressBar: options.progress ?? true,
        allowOutsideClick: true,
        didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
      });
    });
  }
  window.smartAlert = (title, message = '', type = 'success', duration = 3000) => {
    if (type === 'success' && Date.now() - lastAutomaticSuccessAt < 1000) return Promise.resolve();
    return showSweet(title, message, type, { timer: duration });
  };
  window.cctvNotify = (action, options = {}) => {
    lastAutomaticSuccessAt = Date.now();
    return showSweet(action, options.message || options.module || 'ดำเนินการเรียบร้อยแล้ว', options.type || 'success', { timer: options.duration || 3000 });
  };
  window.cctvConfirm = async (title, message = '', confirmText = 'ยืนยัน') => {
    const Swal = await loadSweetAlert();
    if (!Swal) return window.confirm(message || title);
    const result = await Swal.fire({
      icon: 'warning', title, text: message, showCancelButton: true,
      confirmButtonText: confirmText, cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626', reverseButtons: true, focusCancel: true
    });
    return result.isConfirmed;
  };
  window.alert = (message) => showSweet('แจ้งเตือน', String(message), 'warning', { toast: false, confirm: true, timer: undefined, progress: false });
  window.confirm = (message) => {
    if (allowOneNativeConfirm) { allowOneNativeConfirm = false; return true; }
    return nativeConfirm(message);
  };
  function actionLabel(method) { return method === 'POST' ? 'เพิ่มข้อมูลสำเร็จ' : method === 'DELETE' ? 'ลบข้อมูลสำเร็จ' : 'บันทึกการแก้ไขสำเร็จ'; }
  function moduleName() { return document.querySelector('h1')?.textContent?.trim() || document.title.replace(/\s*[|—-].*$/, '') || 'ระบบ CCTV POLICE9'; }
  function bindMutationAlerts() {
    if (fetchBound) return;
    fetchBound = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const input = args[0]; const init = args[1] || {};
      const requestUrl = typeof input === 'string' ? input : input?.url;
      const method = String(init.method || input?.method || 'GET').toUpperCase();
      const isRestMutation = requestUrl && ['POST','PATCH','PUT','DELETE'].includes(method) && String(requestUrl).includes('/rest/v1/');
      const requestPath = isRestMutation ? new URL(requestUrl, location.href).pathname : '';
      const tableName = requestPath ? requestPath.split('/').pop() : '';
      const track = Boolean(isRestMutation && tableName && tableName !== 'smart_alerts' && !requestPath.includes('/rpc/'));
      const loading = track ? loadSweetAlert().then((Swal) => {
        if (!Swal) return null;
        Swal.fire({ title: 'กำลังบันทึกข้อมูล…', text: 'โปรดรอสักครู่', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
        return Swal;
      }) : null;
      let response;
      try {
        response = await nativeFetch(...args);
      } catch (error) {
        const Swal = loading ? await loading : null;
        Swal?.close();
        throw error;
      }
      const Swal = loading ? await loading : null;
      Swal?.close();
      try {
        if (!response.ok || !track) return response;
        const key = `${method}:${tableName}`; const now = Date.now();
        if ((recent.get(key) || 0) + 800 > now) return response;
        recent.set(key, now);
        window.cctvNotify(actionLabel(method), { module: moduleName(), message: `${moduleName()} · ${tableName}` });
      } catch (error) { console.warn('SweetAlert action tracking unavailable', error); }
      return response;
    };
  }
  function bindDeleteConfirmation() {
    document.addEventListener('click', async (event) => {
      if (location.pathname.toLowerCase().endsWith('/admin-console.html')) return;
      const isRiskAreaCancellation = location.pathname.toLowerCase().endsWith('/risk-areas.html')
        && Boolean(event.target.closest?.('[data-cancel]'));
      const button = event.target.closest?.('[data-delete], [data-del], [data-system-delete]')
        || (isRiskAreaCancellation ? event.target.closest?.('[data-cancel]') : null);
      if (!button || button.disabled) return;
      if (button.dataset.sweetConfirmed === 'true') {
        delete button.dataset.sweetConfirmed;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const label = button.getAttribute('aria-label') || button.title || 'รายการนี้';
      if (isRiskAreaCancellation) {
        const approvedCancellation = await window.cctvConfirm(
          'ยืนยันการยกเลิกพื้นที่',
          `${label}\nพื้นที่จะถูกยกเลิกและเก็บไว้ในประวัติ`,
          'ยกเลิกพื้นที่'
        );
        if (!approvedCancellation) return;
        button.dataset.sweetConfirmed = 'true';
        allowOneNativeConfirm = true;
        button.click();
        window.setTimeout(() => { allowOneNativeConfirm = false; }, 0);
        return;
      }
      const approved = await window.cctvConfirm('ยืนยันการลบข้อมูล', `${label}\nข้อมูลที่ลบไม่สามารถย้อนกลับได้`, 'ลบข้อมูล');
      if (!approved) return;
      button.dataset.sweetConfirmed = 'true';
      allowOneNativeConfirm = true;
      button.click();
      window.setTimeout(() => { allowOneNativeConfirm = false; }, 0);
    }, true);
  }
  function bindFormConfirmation() {
    document.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('[data-sweet-confirm]')) return;
      if (form.dataset.sweetConfirmed === 'true') {
        delete form.dataset.sweetConfirmed;
        return;
      }
      if (form.dataset.sweetConfirmBusy === 'true') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      form.dataset.sweetConfirmBusy = 'true';
      const approved = await window.cctvConfirm(
        form.dataset.sweetTitle || 'ยืนยันการบันทึกข้อมูล',
        form.dataset.sweetMessage || 'โปรดตรวจสอบข้อมูลก่อนบันทึก',
        form.dataset.sweetConfirmText || 'บันทึกข้อมูล'
      );
      delete form.dataset.sweetConfirmBusy;
      if (!approved) return;
      form.dataset.sweetConfirmed = 'true';
      if (typeof form.requestSubmit === 'function') form.requestSubmit(event.submitter || undefined);
      else form.submit();
    }, true);
  }
  bindMutationAlerts();
  bindDeleteConfirmation();
  bindFormConfirmation();
})();
