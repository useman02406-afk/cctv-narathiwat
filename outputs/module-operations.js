(() => {
  "use strict";

  const modules = new Map([
    ["station-overview.html", "ภาพรวม สภ."],
    ["camera-center.html", "กล้อง CCTV"],
    ["investigations.html", "เหตุความมั่นคง"],
    ["critical-infrastructure.html", "พื้นที่เศรษฐกิจ"],
    ["risk-persons.html", "ข้อมูลบุคคล"],
    ["vehicle-alerts.html", "รถแจ้งเตือน"],
    ["vehicle-sightings.html", "บันทึกพบรถ"],
    ["mission-planner.html", "วิเคราะห์พื้นที่"],
    ["home-search.html", "ค้นหาบ้าน"],
    ["risk-areas.html", "พื้นที่เสี่ยง"],
    ["case-timeline.html", "ไทม์ไลน์สืบสวน"],
    ["reports.html", "ศูนย์รายงาน"],
  ]);
  const sensitive = new Set(["risk-persons.html", "home-search.html"]);
  const page = location.pathname.split("/").pop().toLowerCase();
  if (!modules.has(page)) return;

  const escapeCsv = (value) =>
    `"${String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/"/g, '""')}"`;

  function visibleTable() {
    return [...document.querySelectorAll("table")].find(
      (table) => table.offsetParent !== null && table.querySelector("tbody tr"),
    );
  }

  function tableCsv(table) {
    const headers = [...table.querySelectorAll("thead th")];
    const included = headers
      .map((header, index) => ({ index, text: header.innerText.trim() }))
      .filter(({ text }) => !/^(จัดการ|การทำงาน|actions?)$/i.test(text));
    const rows = [...table.querySelectorAll("tbody tr")].filter(
      (row) => row.offsetParent !== null,
    );
    return [
      included.map(({ text }) => text),
      ...rows.map((row) => {
        const cells = [...row.children];
        return included.map(({ index }) => cells[index]?.innerText || "");
      }),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
  }

  function downloadCsv(table) {
    const blob = new Blob(["\ufeff" + tableCsv(table)], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${page.replace(".html", "")}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
    window.smartAlert?.(
      "ส่งออกข้อมูลแล้ว",
      `สร้างไฟล์ CSV จากตารางในโมดูล${modules.get(page)}แล้ว`,
      "success",
    );
  }

  function addStyles() {
    if (document.getElementById("module-operations-style")) return;
    const style = document.createElement("style");
    style.id = "module-operations-style";
    style.textContent = `
      .module-operations{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin:8px 0 12px}
      .module-operation-status{display:inline-flex;align-items:center;gap:6px;margin-right:auto;padding:6px 9px;border:1px solid #bbd8ea;border-radius:999px;background:#f0f9ff;color:#075985;font:700 11px/1.2 system-ui,sans-serif}
      .module-operation-status::before{content:"";width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px #10b98122}
      .module-operation-button{border:1px solid #8cbcd5;border-radius:8px;background:#fff;color:#0c4a6e;padding:7px 10px;font:700 12px system-ui,sans-serif;cursor:pointer}
      .module-operation-button:hover{background:#e0f2fe}
      @media(max-width:600px){.module-operations{justify-content:stretch}.module-operation-status{width:100%;margin-right:0}.module-operation-button{flex:1}}
      @media print{.module-operations{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function install(event) {
    const session = event?.detail || window.cctvSession;
    if (!session || document.querySelector(".module-operations")) return;
    addStyles();
    const role = String(session.profile?.role || "").toUpperCase();
    const canExport = !sensitive.has(page) || role === "ADMIN";
    const toolbar = document.createElement("section");
    toolbar.className = "module-operations";
    toolbar.setAttribute("aria-label", "เครื่องมือประจำโมดูล");
    toolbar.innerHTML = `<span class="module-operation-status">พร้อมใช้งาน · ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>`;

    const addButton = (label, icon, action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-operation-button";
      button.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
      button.onclick = action;
      toolbar.appendChild(button);
    };

    const hasExport = document.querySelector(
      "#exportCsv,[data-export],button[id*='export' i],button[id*='excel' i]",
    );
    const hasPrint = document.querySelector(
      "#printReport,[data-print],button[id*='print' i],button[id*='pdf' i]",
    );
    if (canExport && !hasExport) {
      addButton("CSV", "fa-file-csv", () => {
        const table = visibleTable();
        if (!table)
          return window.smartAlert?.(
            "ยังไม่มีตารางให้ส่งออก",
            "โปรดรอให้ข้อมูลโหลดเสร็จหรือเลือกมุมมองตาราง",
            "warning",
          );
        downloadCsv(table);
      });
    }
    if (canExport && !hasPrint)
      addButton("พิมพ์", "fa-print", () => window.print());
    addButton("รีเฟรช", "fa-rotate", () => location.reload());

    const main = document.querySelector("main");
    const anchor = main?.querySelector(":scope > .bar, :scope > .topbar");
    if (anchor) anchor.insertAdjacentElement("afterend", toolbar);
    else if (main) main.prepend(toolbar);
    else document.body.prepend(toolbar);

    document.addEventListener("keydown", (keyboardEvent) => {
      if (
        keyboardEvent.key !== "/" ||
        /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")
      )
        return;
      const search = document.querySelector(
        "input[type='search'],#search,#historySearch,#quickSearch",
      );
      if (!search || search.offsetParent === null) return;
      keyboardEvent.preventDefault();
      search.focus();
    });
  }

  if (window.cctvSession) window.setTimeout(() => install(), 0);
  else window.addEventListener("cctv-auth-ready", install, { once: true });
})();
