(() => {
  let db,
    session,
    items = [],
    incidents = [],
    cameras = [],
    selected = null,
    editId = null,
    map,
    routeLayer,
    markerLayer,
    cameraLayer,
    camerasVisible = false,
    searchRadius = 250,
    playTimer;
  const $ = (id) => document.getElementById(id),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[m],
      ),
    date = (v) => (v ? new Date(v) : new Date()),
    fmt = (v) =>
      date(v).toLocaleString("th-TH", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    time = (v) =>
      date(v).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    canEdit = () => ["ADMIN", "OFFICER"].includes(session?.profile?.role);
  function initMap() {
    map = L.map("map").setView([6.4255, 101.8253], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    cameraLayer = L.layerGroup().addTo(map);
  }
  function coords(item, index) {
    const incident = item.incidents || {},
      lat = Number(item.latitude || incident.latitude || incident.lat),
      lng = Number(
        item.longitude || incident.longitude || incident.lng || incident.lon,
      );
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    const angle = index * 0.82,
      radius = 0.018 + 0.006 * (index % 3);
    return [
      6.4255 + Math.sin(angle) * radius,
      101.8253 + Math.cos(angle) * radius,
    ];
  }
  function kind(item, index, total) {
    const type = String(item.entry_type || "");
    if (type.includes("สิ้นสุด") || index === total - 1) return "end";
    if (type.includes("สำคัญ") || type.includes("เหตุ")) return "critical";
    if (index === 0 || type.includes("เริ่ม")) return "start";
    return "middle";
  }
  const color = (type) =>
    ({
      start: "#20d995",
      middle: "#ffca48",
      critical: "#ff5366",
      end: "#9b7cff",
    })[type];
  function markerIcon(type) {
    return L.divIcon({
      className: "",
      html: `<span class="custom-marker" style="background:${color(type)}"><i class="fa-solid ${type === "critical" ? "fa-burst" : type === "end" ? "fa-flag-checkered" : type === "start" ? "fa-play" : "fa-video"}"></i></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  }
  function cameraIcon(status) {
    const value = String(status || ""),
      online = value.includes("ออนไลน์") && !value.includes("ออฟไลน์");
    return L.divIcon({
      className: "",
      html: `<span class="custom-marker" style="width:24px;height:24px;background:${online ? "#078bc9" : "#667786"}"><i class="fa-solid fa-video"></i></span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  }
  function cameraCoords(camera) {
    const lat = Number(camera.lat ?? camera.latitude),
      lng = Number(camera.lng ?? camera.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  }
  function distanceMeters(a, b) {
    const rad = (value) => (value * Math.PI) / 180,
      earth = 6371000,
      dLat = rad(b[0] - a[0]),
      dLng = rad(b[1] - a[1]),
      value =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a[0])) *
          Math.cos(rad(b[0])) *
          Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }
  function routeDistance(points = filtered().map(coords)) {
    return points.slice(1).reduce((total, point, index) => {
      return total + distanceMeters(points[index], point);
    }, 0);
  }
  function camerasNearRoute() {
    const points = filtered().map(coords);
    if (!points.length) return [];
    return cameras
      .map((camera) => ({ camera, point: cameraCoords(camera) }))
      .filter(({ point }) => point)
      .map(({ camera, point }) => ({
        camera,
        point,
        distance: Math.min(...points.map((route) => distanceMeters(route, point))),
      }))
      .filter(({ distance }) => distance <= searchRadius)
      .sort((a, b) => a.distance - b.distance);
  }
  function drawCameras() {
    cameraLayer.clearLayers();
    const nearby = camerasNearRoute();
    if (!camerasVisible) return nearby;
    nearby.forEach(({ camera, point, distance }) => {
      const marker = L.marker(point, { icon: cameraIcon(camera.status) }).addTo(
        cameraLayer,
      );
      marker.bindPopup(
        `<b>${esc(camera.uid || camera.camera_name || camera.name || "กล้อง CCTV")}</b><br>${esc(camera.area || "ไม่ระบุพื้นที่")}<br>${esc(camera.status || "ไม่ระบุสถานะ")} · ${Math.round(distance).toLocaleString()} ม.`,
      );
    });
    return nearby;
  }
  function filtered() {
    const id = $("caseSelect").value;
    return items
      .filter((x) => !id || String(x.incident_id) === id)
      .sort((a, b) => date(a.entry_at) - date(b.entry_at));
  }
  function draw() {
    const list = filtered();
    routeLayer.clearLayers();
    markerLayer.clearLayers();
    const points = list.map(coords);
    if (points.length > 1)
      L.polyline(points, { color: "#ff5366", weight: 4, opacity: 0.9 }).addTo(
        routeLayer,
      );
    list.forEach((item, index) => {
      const type = kind(item, index, list.length),
        marker = L.marker(points[index], { icon: markerIcon(type) }).addTo(
          markerLayer,
        );
      marker.bindTooltip(
        `${index + 1}. ${item.entry_type || "บันทึกติดตาม"} · ${time(item.entry_at)}`,
      );
      marker.on("click", () => select(item.id));
      item.__coords = points[index];
    });
    if (points.length)
      map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 15 });
    drawCameras();
    renderList();
    updatePlayback();
  }
  function renderList() {
    const list = filtered();
    $("timelineSummary").textContent =
      `${list.length} จุด · ${new Set(list.map((x) => x.incident_id)).size} แฟ้มคดี`;
    $("timelineList").innerHTML = list.length
      ? list
          .map((item, index) => {
            const type = kind(item, index, list.length);
            return `<article class="timeline-point ${type} ${selected === item.id ? "active" : ""}" data-id="${item.id}"><span class="point-no">${type === "end" ? '<i class="fa-solid fa-flag-checkered"></i>' : index + 1}</span><span><span class="point-title">${esc(item.entry_type || "บันทึกติดตาม")}</span><span class="point-meta">${fmt(item.entry_at)} · ${esc(item.incidents?.case_no || item.incidents?.incident_type || "ไม่ระบุคดี")}</span><span class="point-detail">${esc(item.detail || "ไม่มีรายละเอียด")}</span></span></article>`;
          })
          .join("")
      : '<div class="empty">ยังไม่มีจุดในไทม์ไลน์สำหรับแฟ้มนี้</div>';
    document
      .querySelectorAll(".timeline-point")
      .forEach((node) => (node.onclick = () => select(node.dataset.id)));
  }
  function select(id) {
    selected = id;
    const item = items.find((x) => String(x.id) === String(id));
    if (!item) return;
    renderList();
    if (item.__coords) map.flyTo(item.__coords, 15);
    const nearbyCount = item.__coords
      ? cameras.filter((camera) => {
          const point = cameraCoords(camera);
          return point && distanceMeters(item.__coords, point) <= searchRadius;
        }).length
      : 0;
    $("detail").innerHTML =
      `<div class="evidence-preview"><i class="fa-solid fa-video"></i></div><h3>${esc(item.entry_type || "บันทึกติดตาม")} <span class="status"><i class="fa-solid fa-circle-check"></i> ${String(item.entry_type).includes("คาดการณ์") ? "ข้อสันนิษฐาน" : "บันทึกในระบบ"}</span></h3><div class="info"><span>คดี/เหตุ</span><b>${esc(item.incidents?.case_no || item.incidents?.incident_type || "–")}</b></div><div class="info"><span>วันเวลา</span><b>${fmt(item.entry_at)}</b></div><div class="info"><span>สถานะคดี</span><b>${esc(item.incidents?.status || "รอตรวจสอบ")}</b></div><div class="info"><span>พิกัด</span><b>${item.__coords?.map((x) => x.toFixed(6)).join(", ") || "–"}</b></div><div class="info"><span>การมองเห็น</span><b>${esc(item.visibility || "ภายในหน่วย")}</b></div><h3>รายละเอียดพฤติการณ์</h3><div class="evidence-card"><b>${esc(item.detail || "ไม่มีรายละเอียด")}</b><small>${esc(item.next_action ? `ขั้นตอนถัดไป: ${item.next_action}` : "ยังไม่ได้ระบุขั้นตอนถัดไป")}</small></div><h3>หลักฐานที่เกี่ยวข้อง</h3><div class="evidence-card"><b><i class="fa-solid fa-camera"></i> กล้องตามเส้นทาง ${nearbyCount.toLocaleString()} จุด</b><small>กล้องที่อยู่ในรัศมี ${searchRadius.toLocaleString()} เมตรจากจุดที่เลือก</small></div><div class="evidence-card"><b><i class="fa-solid fa-shield"></i> Chain of custody</b><small>เลขหลักฐาน แหล่งที่มา Hash และประวัติการเข้าถึงจะแสดงเมื่อเชื่อมคลังหลักฐาน</small></div>${canEdit() ? `<div class="actions"><button class="btn" id="editEntry"><i class="fa-solid fa-pen"></i> แก้ไข</button><button class="btn danger" id="deleteEntry"><i class="fa-solid fa-trash"></i> ลบ</button></div>` : ``}`;
    if (canEdit()) {
      document.getElementById("editEntry").onclick = () => openForm(item);
      document.getElementById("deleteEntry").onclick = () =>
        removeEntry(item.id);
    }
  }
  function updatePlayback() {
    const list = filtered();
    $("playRange").max = Math.max(0, list.length - 1);
    $("playRange").value = 0;
    $("playTime").textContent = list[0] ? time(list[0].entry_at) : "--:--";
    $("playEnd").textContent = list.at(-1)
      ? time(list.at(-1).entry_at)
      : "--:--";
    $("distanceSummary").textContent =
      `เส้นทาง ${list.length} จุด · ระยะทาง ${(
        routeDistance(list.map(coords)) / 1000
      ).toFixed(2)} กม.`;
    $("gapSummary").textContent =
      `ช่วงข้อมูลขาดหาย ${Math.max(0, list.filter((x) => !x.next_action).length - 1)} ช่วง`;
  }
  $("playRange").oninput = (e) => {
    const item = filtered()[Number(e.target.value)];
    if (item) {
      $("playTime").textContent = time(item.entry_at);
      select(item.id);
    }
  };
  $("play").onclick = () => {
    clearInterval(playTimer);
    let i = Number($("playRange").value),
      list = filtered();
    if (!list.length) return;
    $("play").innerHTML = '<i class="fa-solid fa-pause"></i>';
    playTimer = setInterval(() => {
      if (i >= list.length) {
        clearInterval(playTimer);
        $("play").innerHTML = '<i class="fa-solid fa-play"></i>';
        return;
      }
      $("playRange").value = i;
      select(list[i].id);
      $("playTime").textContent = time(list[i].entry_at);
      i++;
    }, 900);
  };
  function options() {
    const html =
      '<option value="">เลือกเหตุ / คดี</option>' +
      incidents
        .map(
          (i) =>
            `<option value="${i.id}">${esc(i.case_no || i.incident_type || "เหตุ")} · ${esc(i.status || "")}</option>`,
        )
        .join("");
    $("incident").innerHTML = html;
    $("caseSelect").innerHTML =
      '<option value="">ทุกคดี</option>' +
      html.replace('<option value="">เลือกเหตุ / คดี</option>', "");
  }
  async function load() {
    const [a, b, c] = await Promise.all([
      db
        .from("incidents")
        .select("*")
        .in("district", ["เมือง", "เมืองนราธิวาส", "มืองนราธิวาส", "อ.เมืองนราธิวาส"])
        .order("updated_at", { ascending: false })
        .limit(200),
      db
        .from("case_timeline_entries")
        .select("*,incidents(*)")
        .order("entry_at", { ascending: true })
        .limit(500),
      db
        .from("cctv_locations")
        .select("id,uid,camera_name,name,area,lat,lng,status")
        .eq("area", "สภ.เมืองนราธิวาส")
        .limit(5000),
    ]);
    if (a.error || b.error || c.error) {
      $("timelineList").innerHTML =
        `<div class="empty">โหลดข้อมูลไม่สำเร็จ: ${esc((a.error || b.error || c.error).message)}</div>`;
      return;
    }
    incidents = a.data || [];
    items = b.data || [];
    cameras = c.data || [];
    options();
    draw();
    if (filtered()[0]) select(filtered()[0].id);
  }
  function localDate(value) {
    const d = value ? new Date(value) : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  function openForm(item = null) {
    if (!canEdit()) return alert("บัญชีนี้มีสิทธิ์ดูข้อมูลเท่านั้น");
    editId = item?.id || null;
    $("dialogTitle").innerHTML =
      `<i class="fa-solid fa-location-dot"></i> ${editId ? "แก้ไขจุดในไทม์ไลน์" : "บันทึกจุดในไทม์ไลน์"}`;
    $("incident").value = item?.incident_id || $("caseSelect").value || "";
    $("entryAt").value = localDate(item?.entry_at);
    $("entryType").value = item?.entry_type || "จุดเริ่มต้น";
    $("visibility").value = item?.visibility || "ภายในหน่วย";
    $("detailInput").value = item?.detail || "";
    $("nextAction").value = item?.next_action || "";
    $("modal").classList.remove("hidden");
  }
  async function save() {
    const payload = {
      incident_id: $("incident").value,
      entry_at: new Date($("entryAt").value).toISOString(),
      entry_type: $("entryType").value,
      visibility: $("visibility").value,
      detail: $("detailInput").value.trim(),
      next_action: $("nextAction").value.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (!payload.incident_id || !payload.detail)
      return alert("กรุณาเลือกคดีและระบุรายละเอียด");
    $("save").disabled = true;
    const result = editId
      ? await db.from("case_timeline_entries").update(payload).eq("id", editId)
      : await db.from("case_timeline_entries").insert(payload);
    $("save").disabled = false;
    if (result.error) return alert("บันทึกไม่สำเร็จ: " + result.error.message);
    editId = null;
    $("modal").classList.add("hidden");
    await load();
  }
  async function removeEntry(id) {
    if (
      !canEdit() ||
      !confirm("ลบจุดไทม์ไลน์นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้")
    )
      return;
    const result = await db.from("case_timeline_entries").delete().eq("id", id);
    if (result.error) return alert("ลบไม่สำเร็จ: " + result.error.message);
    selected = null;
    await load();
  }
  function exportCsv() {
    const rows = filtered(),
      headers = [
        "ลำดับ",
        "เลขคดี",
        "วันเวลา",
        "ประเภทจุด",
        "รายละเอียด",
        "ขั้นตอนถัดไป",
        "ระดับการมองเห็น",
      ],
      quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`,
      lines = [
        headers,
        ...rows.map((row, index) => [
          index + 1,
          row.incidents?.case_no || row.incidents?.incident_type || "",
          fmt(row.entry_at),
          row.entry_type,
          row.detail,
          row.next_action,
          row.visibility,
        ]),
      ].map((row) => row.map(quote).join(",")),
      blob = new Blob(["\ufeff" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `cctv-case-timeline-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function start(event) {
    session = event.detail || window.cctvSession;
    if (!session) return;
    db = session.client;
    $("user").textContent =
      `${session.profile.full_name || session.user.email} · ${session.profile.role}`;
    initMap();
    $("new").onclick = () => openForm();
    $("cancel").onclick = () => {
      $("modal").classList.add("hidden");
      editId = null;
    };
    $("save").onclick = save;
    $("exportCsv").onclick = exportCsv;
    $("printReport").onclick = () => window.print();
    $("caseSelect").onchange = () => {
      selected = null;
      draw();
      if (filtered()[0]) select(filtered()[0].id);
    };
    $("fitRoute").onclick = draw;
    $("toggleCameras").onclick = () => {
      camerasVisible = !camerasVisible;
      const nearby = drawCameras();
      $("toggleCameras").classList.toggle("green", camerasVisible);
      $("toggleCameras").innerHTML =
        `<i class="fa-solid fa-video"></i> ${camerasVisible ? `ซ่อนกล้อง (${nearby.length.toLocaleString()})` : "กล้องใกล้เส้นทาง"}`;
    };
    $("measure").onclick = () => {
      const list = filtered(),
        meters = routeDistance(list.map(coords));
      alert(
        list.length > 1
          ? `ระยะทางรวมระหว่าง ${list.length.toLocaleString()} จุด เท่ากับ ${(meters / 1000).toFixed(2)} กิโลเมตร`
          : "ต้องมีอย่างน้อย 2 จุดในไทม์ไลน์เพื่อคำนวณระยะทาง",
      );
    };
    $("searchRadius").onclick = () => {
      const choices = [50, 100, 250, 500],
        index = choices.indexOf(searchRadius);
      searchRadius = choices[(index + 1) % choices.length];
      $("searchRadius").innerHTML =
        `<i class="fa-solid fa-circle-dot"></i> รัศมี ${searchRadius.toLocaleString()} ม.`;
      const nearby = drawCameras();
      if (camerasVisible)
        $("toggleCameras").innerHTML =
          `<i class="fa-solid fa-video"></i> ซ่อนกล้อง (${nearby.length.toLocaleString()})`;
      if (selected) select(selected);
    };
    load();
  }
  if (window.cctvSession) start({ detail: window.cctvSession });
  else window.addEventListener("cctv-auth-ready", start, { once: true });
})();
