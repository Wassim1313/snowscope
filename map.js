/* SnowScope Web main page: snow map + day strip + layers + region cards.
   Free: static pictures and click values from this folder (works while the API is down).
   Pro (signed in, GET /v1/me): live sharper map, all days, new snow, satellite snow, wind, freezing level. */
(async () => {
  "use strict";
  const { esc } = SS;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const dayName = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
  const longDay = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const NEW_RAMP = [[1, [247, 252, 185]], [5, [199, 233, 180]], [10, [127, 205, 187]], [20, [65, 182, 196]], [30, [29, 145, 192]], [50, [34, 94, 168]], [80, [12, 44, 132]]];
  const WIND = [[0, [214, 236, 246]], [10, [158, 210, 226]], [20, [107, 191, 143]], [35, [242, 212, 92]], [50, [242, 155, 63]], [70, [224, 83, 58]], [100, [158, 31, 99]]];
  const FREEZE = [[0, [44, 62, 145]], [1000, [74, 120, 194]], [1500, [111, 168, 220]], [2000, [168, 213, 226]], [2500, [243, 231, 155]], [3000, [246, 178, 107]], [3500, [224, 102, 102]], [4500, [166, 28, 60]]];
  const AVAL = { 1: "#CCFF66", 2: "#FFFF00", 3: "#FF9900", 4: "#FF0000", 5: "#7A0000" };
  const AVAL_NAME = { 1: "Low", 2: "Moderate", 3: "Considerable", 4: "High", 5: "Very high" };
  const LAYERS = [
    { id: "depth", name: "Snow depth", sw: "linear-gradient(135deg,#9ECAE1,#2171B5 60%,#08306B)" },
    { id: "new", name: "New snow", pro: true, sw: "linear-gradient(135deg,#F7FCB9,#41B6C4 55%,#0C2C84)" },
    { id: "sat", name: "Satellite snow", pro: true, sw: "linear-gradient(135deg,#F6FAFF,#A0C4E4 50%,#96693E)" },
    { id: "off", name: "Off", sw: "linear-gradient(135deg,var(--surface2),var(--surface3))" }];
  const OVERLAYS = [
    { id: "pistes", name: "Pistes & lifts", sub: "Coloured by difficulty", icon: "downhill_skiing" },
    { id: "wind", name: "Wind", sub: "Around midday", icon: "air", pro: true, main: true },
    { id: "freeze", name: "Freezing level", sub: "Where 0 °C sits", icon: "device_thermostat", pro: true, main: true },
    { id: "radar", name: "Rain & snow radar", sub: "Right now", icon: "radar", main: true },
    { id: "aval", name: "Avalanche danger", sub: "Official daily levels", icon: "warning", safety: true }];

  const st = { day: null, main: "depth", over: { pistes: false, aval: false }, wx: null, pro: false, proIdx: null, proDates: null,
               fields: {}, pistes: { idx: null, loaded: new Set(), feats: [] }, aval: null, radar: undefined };
  let DATA, map, LIB, popup, toastT, ready = false;

  function toast(t, ms = 3200) {
    const e = $("toast"); e.textContent = t; e.hidden = !t;
    clearTimeout(toastT); if (t) toastT = setTimeout(() => { e.hidden = true; }, ms);
  }
  const rampCss = (stops) => stops.map((s) => "rgb(" + s[1].join(",") + ")");
  function rampAt(stops, v) {
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a);
      return ca.map((x, k) => Math.round(x + (cb[k] - x) * t));
    }
    return stops[stops.length - 1][1];
  }

  // ------------------------------------------------------------------ boot
  const started = SS.start();
  try { DATA = await SS.getJSON("snow/data.json?v=" + Math.floor(Date.now() / 3e5)); }
  catch { $("upd").textContent = "Today's snow could not be loaded. Try again in a minute."; return; }
  st.day = DATA.dates.includes(DATA.today) ? DATA.today : DATA.dates[DATA.dates.length - 1];
  drawUpdated();
  drawRegions();
  drawCards();
  drawDays();
  drawLegend();
  $("layersBtn").onclick = layersSheet;

  const ML = await SS.mapLib();
  LIB = ML.lib;
  const hash = /^#@(-?[\d.]+),(-?[\d.]+),([\d.]+)$/.exec(location.hash);
  const r0 = DATA.regions.find((r) => r.code === homeRegion()) || DATA.regions[0];
  map = new LIB.Map({ container: "map", style: ML.style, center: r0.center, zoom: 5, minZoom: 2, attributionControl: { compact: true },
    transformRequest: (url) => SS.transformRequest(url), ...(ML.mapbox ? { projection: "mercator" } : {}),
    cooperativeGestures: false, dragRotate: false, pitchWithRotate: false });
  map.addControl(new LIB.NavigationControl({ showCompass: false }), "top-right");
  map.touchZoomRotate.disableRotation();
  map.on("load", () => {
    ready = true;
    if (hash) map.jumpTo({ center: [+hash[2], +hash[1]], zoom: +hash[3] });
    else flyRegion(homeRegion(), true);
    addOverlaySources();
    renderMain();
    map.on("click", onClick);
    map.on("moveend", () => {
      const c = map.getCenter();
      if (regionMove) regionMove = false;               // keep the region link (#alps) after a region jump
      else history.replaceState(null, "", "#@" + c.lat.toFixed(3) + "," + c.lng.toFixed(3) + "," + map.getZoom().toFixed(1));
      if (st.over.pistes) loadPistes();
    });
    map.getCanvas().style.cursor = "crosshair";
  });
  await started;
  drawCards();                                   // again, now that the hotel config is known
  SS.onChange(onAccount);
  onAccount(SS.S);

  // ------------------------------------------------------------------ regions, updated time
  const slugOf = (code) => code.toLowerCase().replace("_ne", "-northeast").replace("_", "-");
  let regionMove = false;
  function homeRegion() {
    const h = location.hash.slice(1);
    const fromHash = DATA.regions.find((r) => slugOf(r.code) === h);
    if (fromHash) return fromHash.code;
    const saved = SS.store.get("ss_region");
    if (saved && DATA.regions.some((r) => r.code === saved)) return saved;
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old browser */ }
    const want = /America\/(Los_Angeles|Denver|Boise|Phoenix|Vancouver|Edmonton)/.test(tz) ? "US_WEST"
      : /America\/(New_York|Toronto|Montreal|Detroit)/.test(tz) ? "US_NE" : /Africa\/Casablanca/.test(tz) ? "ATLAS"
      : /Europe\/Madrid|Europe\/Andorra/.test(tz) ? "PYRENEES" : /Europe\/(Oslo|Stockholm|Helsinki)/.test(tz) ? "SCANDES" : "ALPS";
    return DATA.regions.some((r) => r.code === want) ? want : DATA.regions[0].code;
  }
  function flyRegion(code, instant) {
    const r = DATA.regions.find((x) => x.code === code);
    if (!r || !map) return;
    regionMove = true;
    map.fitBounds([r.coords[3], r.coords[1]], { padding: { top: 64, bottom: 40, left: 16, right: 16 }, maxZoom: 7, duration: instant ? 0 : 900, essential: true });
    SS.store.set("ss_region", code);
    history.replaceState(null, "", "#" + slugOf(code));
    document.querySelectorAll("#regions [data-r]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.r === code));
  }
  function drawRegions() {
    const box = $("regions");
    if (!box) return;
    const cur = homeRegion();
    box.innerHTML = DATA.regions.map((r) => '<button class="pill" data-r="' + r.code + '" aria-pressed="' + (r.code === cur) + '">' + esc(r.name) + "</button>").join("") +
      ("geolocation" in navigator ? '<button class="pill" data-me><span class="ms" style="font-size:18px">near_me</span> Near me</button>' : "");
    box.onclick = (e) => {
      const b = e.target.closest("[data-r]");
      if (b) { flyRegion(b.dataset.r); return; }
      if (e.target.closest("[data-me]")) navigator.geolocation.getCurrentPosition(
        (p) => map && map.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 9, duration: 1200 }),
        () => toast("Location not available"), { maximumAge: 6e5, timeout: 10000 });
    };
  }
  function drawUpdated() {
    const t = Date.parse(DATA.built_utc.replace("Z", ":00Z"));
    const e = $("upd");
    if (!isFinite(t)) { e.textContent = ""; return; }
    const d = new Date(t), now = new Date();
    const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const same = d.toDateString() === now.toDateString(), y = new Date(now); y.setDate(now.getDate() - 1);
    e.textContent = "Updated " + (same ? "today " + hm : d.toDateString() === y.toDateString() ? "yesterday " + hm : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + hm);
    e.title = DATA.built_utc;
    e.classList.toggle("stale", now - d > 18 * 3600e3);
  }

  // ------------------------------------------------------------------ account / Pro
  async function onAccount(S) {
    const was = st.pro;
    st.pro = !!S.pro;
    if (st.pro && !st.proIdx) {
      try {
        const [g, grid] = await Promise.all([SS.api("/v1/g500/index"), SS.api("/v1/grid")]);
        st.proIdx = { g500: Object.fromEntries((g.domains || []).map((d) => [d.code, d])),
                      grid: Object.fromEntries((grid.domains || []).filter((d) => d.status === "ok").map((d) => [d.domain, d])) };
        const lo = addDays(DATA.today, -7), hi = addDays(DATA.today, 7), s = new Set();
        for (const src of [st.proIdx.g500, st.proIdx.grid]) for (const d of Object.values(src)) for (const x of d.days || []) if (x.date >= lo && x.date <= hi) s.add(x.date);
        st.proDates = [...s].sort();
      } catch (e) {
        st.proIdx = null; st.proDates = null;
        if (e.down) toast("Pro data is updating, try again in a minute.", 5000);
      }
    }
    if (!st.pro) { if (LAYERS.concat(OVERLAYS).some((l) => l.pro && (st.main === l.id || st.wx === l.id))) { st.main = "depth"; st.wx = null; } if (!DATA.dates.includes(st.day)) st.day = DATA.today; }
    if (was !== st.pro || st.pro) { drawDays(); drawLegend(); if (map && ready) renderMain(); }
  }
  function addDays(d, k) { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); }
  function proLive() { return st.pro && st.proIdx; }

  // ------------------------------------------------------------------ days
  function drawDays() {
    const box = $("days");
    const live = proLive() && st.proDates && st.proDates.length;
    const dates = live ? st.proDates : Array.from({ length: 9 }, (_, i) => addDays(DATA.today, i - 4));
    const wd = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
    const dn = (d) => new Date(d + "T12:00:00Z").getUTCDate();
    box.innerHTML = dates.map((d) => {
      const locked = !live && !DATA.dates.includes(d);
      return '<button class="chip' + (locked ? " locked" : "") + '" data-d="' + d + '"' + (locked ? ' aria-disabled="true" aria-label="' + wd(d) + " " + dn(d) + ', Pro"' : ' aria-pressed="' + (d === st.day) + '"') + ">" +
        "<small>" + (d === DATA.today ? "Today" : wd(d)) + "</small>" + dn(d) + (locked ? '<span class="ms f lk">lock</span>' : "") + "</button>";
    }).join("");
    box.onclick = (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      if (b.getAttribute("aria-disabled") === "true") SS.upsell("See 15 days of snow: the past week and the week ahead");
      else setDay(b.dataset.d);
    };
    const on = box.querySelector('[aria-pressed="true"]');
    if (on) box.scrollLeft = on.offsetLeft - box.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2;   // horizontal only, never the page
  }
  function setDay(d) {
    st.day = d;
    if (popup) popup.remove();
    document.querySelectorAll("#days [data-d]:not([aria-disabled])").forEach((b) => b.setAttribute("aria-pressed", b.dataset.d === d));
    renderMain();
    drawCards();
    drawLegend();
  }

  // ------------------------------------------------------------------ legend
  function drawLegend() {
    const L = $("legend");
    const main = st.wx || st.main;
    const when = st.day > DATA.today ? " · forecast" : "";
    const ramp = (title, stops, ticks) => "<b>" + title + when + '</b><div class="ramp">' + rampCss(stops).map((c) => '<i style="background:' + c + '"></i>').join("") +
      '</div><div class="ramp-l">' + ticks.map((t) => "<span>" + t + "</span>").join("") + "</div>";
    let h = "";
    if (main === "depth") h = ramp("Snow depth", DATA.ramp, ["1", "25", "100", "400+ cm"]);
    else if (main === "new") h = ramp("New snow in 24 h", NEW_RAMP, ["1", "10", "30", "80+ cm"]);
    else if (main === "sat") h = '<b>Seen from space</b><div class="sw"><span><i style="background:#F6FAFF"></i>Snow</span><span><i style="background:#A0C4E4"></i>Patchy</span><span><i style="background:#96693E"></i>No snow</span><span><i style="background:#7D7D8A"></i>Cloud</span></div>';
    else if (main === "wind") h = ramp("Wind at midday", WIND, ["0", "20", "50", "100 km/h"]);
    else if (main === "freeze") h = ramp("Freezing level", FREEZE, ["0", "1,500", "3,000", "4,500 m"]);
    else if (main === "radar") h = "<b>Rain & snow now</b>";
    if (st.over.aval) h += (h ? '<div style="height:7px"></div>' : "") + '<b>Avalanche danger</b><div class="sw">' + [1, 2, 3, 4, 5].map((k) => '<span><i style="background:' + AVAL[k] + '"></i>' + k + "</span>").join("") + "</div>";
    L.innerHTML = h; L.hidden = !h;
  }

  // ------------------------------------------------------------------ layers sheet
  function layersSheet() {
    const tile = (l) => '<button class="tile" data-main="' + l.id + '" aria-pressed="' + (st.main === l.id && !st.wx) + '"><div class="sw2" style="background:' + l.sw + '"></div>' +
      (l.pro && !st.pro ? '<span class="pro"><span class="ms f">lock</span>PRO</span>' : "") + "<span>" + l.name + "</span></button>";
    const row = (o) => {
      const on = o.main ? st.wx === o.id : !!st.over[o.id];
      const dis = o.id === "radar" && st.radar === false;
      return '<button class="row" role="switch" data-over="' + o.id + '" aria-checked="' + on + '"' + (dis ? ' aria-disabled="true"' : "") + '><span class="ic"><span class="ms">' + o.icon + '</span></span><span class="tx"><b>' + o.name +
        (o.pro && !st.pro ? ' <span class="pro"><span class="ms f">lock</span>PRO</span>' : "") + "</b><small>" + (dis ? "Not available right now" : o.sub) + '</small></span><span class="sw-t"></span></button>';
    };
    const m = SS.modal(SS.head("Map layers") + '<div class="over sec">Snow</div><div class="tiles">' + LAYERS.map(tile).join("") + "</div>" +
      (st.pro ? "" : '<p style="color:var(--ink3);font-size:13px;margin:10px 0 0">Pro shows a sharper snow map and 15 days.</p>') +
      '<div class="over sec">On the map</div>' + OVERLAYS.filter((o) => !o.safety).map(row).join("") +
      '<div class="over sec">Safety</div>' + OVERLAYS.filter((o) => o.safety).map(row).join(""));
    m.el.addEventListener("click", async (e) => {
      const t = e.target.closest("[data-main]"), o = e.target.closest("[data-over]");
      if (t) {
        const l = LAYERS.find((x) => x.id === t.dataset.main);
        if (l.pro && !st.pro) { m.close(); SS.upsell(l.name + " is a Pro layer"); return; }
        if (l.pro && !proLive()) { toast("Pro data is updating, try again in a minute."); return; }
        st.main = l.id; st.wx = null;
        m.el.querySelectorAll("[data-main]").forEach((b) => b.setAttribute("aria-pressed", b === t));
        m.el.querySelectorAll("[data-over]").forEach((b) => { const ov = OVERLAYS.find((x) => x.id === b.dataset.over); if (ov.main) b.setAttribute("aria-checked", "false"); });
        renderMain(); drawLegend();
      } else if (o) {
        const ov = OVERLAYS.find((x) => x.id === o.dataset.over);
        if (o.getAttribute("aria-disabled") === "true") return;
        if (ov.pro && !st.pro) { m.close(); SS.upsell(ov.name + " is a Pro layer"); return; }
        if (ov.pro && !proLive()) { toast("Pro data is updating, try again in a minute."); return; }
        if (ov.main) {                                      // wind / freezing / radar replace the snow colours
          st.wx = st.wx === ov.id ? null : ov.id;
          m.el.querySelectorAll("[data-over]").forEach((b) => { const x = OVERLAYS.find((y) => y.id === b.dataset.over); if (x.main) b.setAttribute("aria-checked", st.wx === x.id); });
          m.el.querySelectorAll("[data-main]").forEach((b) => b.setAttribute("aria-pressed", !st.wx && b.dataset.main === st.main));
          renderMain();
        } else {
          st.over[ov.id] = !st.over[ov.id];
          o.setAttribute("aria-checked", st.over[ov.id]);
          applyOverlays();
        }
        drawLegend();
      }
    });
  }

  // ------------------------------------------------------------------ main layer rendering
  function firstSymbol() { const l = (map.getStyle().layers || []).find((x) => x.type === "symbol"); return l ? l.id : undefined; }
  function clearMain() {
    for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_"))) map.removeLayer(l.id);
    for (const id of Object.keys(map.getStyle().sources || {}).filter((x) => x.startsWith("m_"))) map.removeSource(id);
  }
  function beneath() { return map.getLayer("aval_fill") ? "aval_fill" : map.getLayer("pistes") ? "pistes" : firstSymbol(); }
  function addRaster(id, tiles, opt) {
    map.addSource(id, { type: "raster", tiles: [tiles], tileSize: opt.tileSize || 256, bounds: opt.bounds, minzoom: opt.srcMin || 0, maxzoom: opt.srcMax || 10, attribution: opt.attribution || "" });
    map.addLayer({ id, type: "raster", source: id, minzoom: opt.min || 0, maxzoom: opt.max || 24,
      paint: { "raster-opacity": opt.opacity || 0.88, "raster-fade-duration": 0, "raster-resampling": opt.nearest ? "nearest" : "linear" } }, beneath());
  }
  function renderMain() {
    if (!map || !ready) return;
    clearMain();
    const mode = st.wx || st.main;
    if (mode === "off") return;
    if (mode === "wind" || mode === "freeze") { renderField(mode); return; }
    if (mode === "radar") { renderRadar(); return; }
    if (!proLive()) {                                              // free: static pictures
      if (mode !== "depth") return;
      for (const r of DATA.regions) {
        const d = r.days.find((x) => x.date === st.day);
        if (!d) continue;
        map.addSource("m_" + r.code, { type: "image", url: d.img, coordinates: r.coords });
        map.addLayer({ id: "m_" + r.code, type: "raster", source: "m_" + r.code, paint: { "raster-opacity": 0.88, "raster-fade-duration": 0, "raster-resampling": "linear" } }, beneath());
      }
      return;
    }
    const A = SS.S.api;
    for (const code of new Set([...Object.keys(st.proIdx.g500), ...Object.keys(st.proIdx.grid)])) {
      const g = st.proIdx.g500[code], c = st.proIdx.grid[code];
      const gi = g ? g.days.findIndex((x) => x.date === st.day) : -1, ci = c ? c.days.findIndex((x) => x.date === st.day) : -1;
      const fine = gi >= 0;
      if (mode === "sat") {
        if (gi >= 0) addRaster("m_" + code + "_f", A + "/v1/g500/" + code + "/tiles/obs/" + gi + "/{z}/{x}/{y}.png", { bounds: g.bbox, srcMin: 6, srcMax: 12, min: 6, opacity: 0.8 });
        continue;
      }
      if (ci >= 0) addRaster("m_" + code + "_c", A + "/v1/grid/" + code + "/tiles/" + (mode === "new" ? "new_cm" : "depth_cm") + "_hd/" + ci + "/{z}/{x}/{y}.png",
        { bounds: c.bbox, srcMax: 10, max: fine ? 6 : 24 });
      if (gi >= 0) addRaster("m_" + code + "_f", A + "/v1/g500/" + code + "/tiles/" + (mode === "new" ? "new" : "depth") + "/" + gi + "/{z}/{x}/{y}.png",
        { bounds: g.bbox, srcMin: 6, srcMax: 12, min: 6 });
    }
    if (mode === "sat" && map.getZoom() < 6) toast("Zoom in to see satellite snow");
  }

  // wind / freezing level: coarse forecast grids drawn into a picture per region (Pro)
  async function renderField(kind) {
    const var_ = kind === "wind" ? "wind" : "freezing_level";
    const day = st.day, codes = DATA.regions.map((r) => r.code.toLowerCase());
    let any = false;
    await Promise.all(codes.map(async (dom) => {
      try {
        const ix = st.fields[dom] || (st.fields[dom] = await SS.api("/v1/fields/" + dom + "/index"));
        let best = -1, bd = 1e18;
        const want = Date.parse(day + "T12:00:00Z");
        ix.times.forEach((t, i) => { const d = Math.abs(Date.parse(t) - want); if (d < bd && d <= 9 * 3600e3) { bd = d; best = i; } });
        if (best < 0) return;
        const key = dom + "/" + var_ + "/" + best;
        const f = st.fields[key] || (st.fields[key] = await SS.api("/v1/fields/" + dom + "/" + var_ + "/" + best + ".json"));
        if ((st.wx || st.main) !== kind || st.day !== day) return;
        const img = fieldPicture(ix, f, kind);
        const id = "m_fx_" + dom;
        if (map.getSource(id)) return;
        map.addSource(id, { type: "image", url: img.url, coordinates: img.coords });
        map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 0.72, "raster-fade-duration": 0, "raster-resampling": "linear" } }, beneath());
        st.fields["cur_" + dom] = { ix, f, kind };
        any = true;
      } catch (e) { if (e.down) toast("Pro data is updating, try again in a minute."); }
    }));
    if (!any && (st.wx || st.main) === kind && st.day === day) toast("No " + (kind === "wind" ? "wind" : "freezing level") + " forecast for this day");
  }
  function fieldVal(f, kind, r, c) {
    if (kind === "wind") { const u = f.u[r][c], v = f.v[r][c]; return u == null || v == null ? null : Math.hypot(u, v) * 3.6; }
    const z = f.z[r][c]; return z == null ? null : z;
  }
  function fieldPicture(ix, f, kind) {
    const nx = ix.lon.length, ny = ix.lat.length, dl = Math.abs(ix.lon[1] - ix.lon[0]) || 0.25, dt = Math.abs(ix.lat[0] - ix.lat[1]) || 0.25;
    const W = ix.lon[0] - dl / 2, E = ix.lon[nx - 1] + dl / 2, N = ix.lat[0] + dt / 2, S = ix.lat[ny - 1] - dt / 2;
    const k = 6, w = nx * k, h = ny * k, cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"), im = ctx.createImageData(w, h);
    const my = (la) => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));
    const yN = my(N), yS = my(S), stops = kind === "wind" ? WIND : FREEZE;
    for (let y = 0; y < h; y++) {
      const la = (2 * Math.atan(Math.exp(yN - (y + 0.5) / h * (yN - yS))) - Math.PI / 2) * 180 / Math.PI;
      const fr = Math.min(ny - 1.001, Math.max(0, (ix.lat[0] - la) / dt));
      for (let x = 0; x < w; x++) {
        const fc = Math.min(nx - 1.001, Math.max(0, ((x + 0.5) / k) - 0.5));
        const r0 = Math.floor(fr), c0 = Math.floor(fc), tr = fr - r0, tc = fc - c0;
        const q = [fieldVal(f, kind, r0, c0), fieldVal(f, kind, r0, c0 + 1), fieldVal(f, kind, r0 + 1, c0), fieldVal(f, kind, r0 + 1, c0 + 1)];
        if (q.some((v) => v == null)) continue;
        const v = q[0] * (1 - tr) * (1 - tc) + q[1] * (1 - tr) * tc + q[2] * tr * (1 - tc) + q[3] * tr * tc;
        const col = rampAt(stops, v), o = (y * w + x) * 4;
        im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 200;
      }
    }
    ctx.putImageData(im, 0, 0);
    return { url: cv.toDataURL("image/png"), coords: [[W, N], [E, N], [E, S], [W, S]] };
  }
  async function renderRadar() {
    try {
      const r = await SS.api("/v1/radar/frames", { auth: false });
      if (!r.available || !r.frames || !r.frames.length) { st.radar = false; toast("Radar is not available right now"); return; }
      st.radar = true;
      if ((st.wx || st.main) !== "radar") return;
      const fr = r.frames[r.frames.length - 1];
      addRaster("m_radar", fr.tiles, { tileSize: r.tile_size || 256, srcMax: r.max_zoom || 7, opacity: 0.7, attribution: "RainViewer" });
    } catch { toast("Radar is updating, try again in a minute."); }
  }

  // ------------------------------------------------------------------ overlays: pistes + avalanche (free, need the API)
  function addOverlaySources() {
    const fc = { type: "FeatureCollection", features: [] };
    map.addSource("pistes", { type: "geojson", data: fc });
    map.addLayer({ id: "pistes", type: "line", source: "pistes", minzoom: 9, layout: { visibility: "none", "line-cap": "round" },
      paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 3],
        "line-color": ["case", ["==", ["get", "kind"], "lift"], "#333333",
          ["match", ["get", "difficulty"], "novice", "#0B7A53", "easy", "#1463F3", "intermediate", "#D7263D", "advanced", "#111111", "expert", "#111111", "freeride", "#E58A00", "#7A8590"]] } }, firstSymbol());
    map.addSource("aval", { type: "geojson", data: fc });
    map.addLayer({ id: "aval_fill", type: "fill", source: "aval", layout: { visibility: "none" },
      paint: { "fill-color": ["match", ["get", "lvl"], 1, AVAL[1], 2, AVAL[2], 3, AVAL[3], 4, AVAL[4], 5, AVAL[5], "rgba(0,0,0,0)"], "fill-opacity": 0.45 } }, "pistes");
    map.addLayer({ id: "aval_line", type: "line", source: "aval", layout: { visibility: "none" }, paint: { "line-color": "rgba(11,18,32,.35)", "line-width": 0.6 } }, "pistes");
  }
  async function applyOverlays() {
    map.setLayoutProperty("pistes", "visibility", st.over.pistes ? "visible" : "none");
    map.setLayoutProperty("aval_fill", "visibility", st.over.aval ? "visible" : "none");
    map.setLayoutProperty("aval_line", "visibility", st.over.aval ? "visible" : "none");
    if (st.over.pistes) { if (map.getZoom() < 9) toast("Zoom in to see pistes and lifts"); loadPistes(); }
    if (st.over.aval) loadAval();
  }
  async function loadPistes() {
    if (map.getZoom() < 9) return;
    try {
      if (!st.pistes.idx) st.pistes.idx = (await SS.api("/v1/pistes/index", { auth: false })).tiles || [];
    } catch { toast("Pistes are updating, try again in a minute."); return; }
    const b = map.getBounds();
    const hit = st.pistes.idx.filter((t) => !(t.e < b.getWest() || t.w > b.getEast() || t.n < b.getSouth() || t.s > b.getNorth()) && !st.pistes.loaded.has(t.id)).slice(0, 12);
    if (!hit.length) return;
    await Promise.all(hit.map(async (t) => {
      st.pistes.loaded.add(t.id);
      try { const g = await SS.api("/v1/pistes/" + encodeURIComponent(t.id) + ".geojson", { auth: false }); st.pistes.feats.push(...(g.features || [])); }
      catch { st.pistes.loaded.delete(t.id); }
    }));
    map.getSource("pistes").setData({ type: "FeatureCollection", features: st.pistes.feats });
  }
  async function loadAval() {
    try {
      if (!st.aval) {
        const [regions, ratings] = await Promise.all([SS.api("/v1/avalanche/regions.geojson", { auth: false, timeout: 30000 }), SS.api("/v1/avalanche/ratings", { auth: false })]);
        st.aval = { regions, ratings };
      }
    } catch { toast("Avalanche levels are updating, try again in a minute."); return; }
    const days = st.aval.ratings.days || [];
    const d = days.filter((x) => x.date <= st.day).pop() || days[days.length - 1];
    const rt = (d && d.ratings) || {};
    let n = 0;
    for (const f of st.aval.regions.features) { const v = rt[f.properties.id]; f.properties.lvl = v ? v.max : 0; if (f.properties.lvl) n++; }
    map.getSource("aval").setData(st.aval.regions);
    if (!n) toast("No avalanche levels published for this day yet");
  }

  // ------------------------------------------------------------------ click: the value under the finger
  const VALS = {};
  function regionAt(ll) {
    return DATA.regions.find((r) => { const L = r.lattice; return ll.lng >= L.west && ll.lng < L.west + L.nx * L.dlon && ll.lat <= L.north && ll.lat > L.north - L.ny * L.dlat; });
  }
  async function staticValue(r, ll) {
    const L = r.lattice, CH = r.chunk;
    const row = Math.floor((L.north - ll.lat) / L.dlat), col = Math.floor((ll.lng - L.west) / L.dlon);
    const di = r.days.findIndex((x) => x.date === st.day);
    if (di < 0) return null;
    const key = r.code + "/" + Math.floor(row / CH) + "_" + Math.floor(col / CH);
    if (!(key in VALS)) VALS[key] = fetch(r.vals + key.split("/")[1] + ".z?v=" + DATA.digest).then((res) => {
      if (!res.ok) return null;
      return new Response(res.body.pipeThrough(new DecompressionStream("deflate"))).arrayBuffer().then((b) => new Uint8Array(b));
    }).catch(() => null);
    const v = await VALS[key];
    if (!v) return null;
    const at = (k) => v[((di * 2 + k) * CH + (row % CH)) * CH + (col % CH)];
    const dc = at(0), nc = at(1);
    if (dc === 255) return null;
    return { depth: dc <= 150 ? dc : 150 + (dc - 150) * 5, new: nc === 255 ? 0 : nc };
  }
  async function onClick(e) {
    const ll = e.lngLat;
    if (popup) popup.remove();
    popup = new LIB.Popup({ closeButton: true, maxWidth: "260px", offset: 8 }).setLngLat(ll).setHTML('<div class="pv"><span class="k">Loading…</span></div>').addTo(map);
    const when = st.day === DATA.today ? "Today" : longDay(st.day);
    const r = regionAt(ll);
    const mode = st.wx || st.main;
    let h = "";
    if (mode === "wind" || mode === "freeze") {
      const cur = Object.values(st.fields).find((x) => x && x.ix && x.kind === mode && ll.lng >= x.ix.lon[0] - 0.125 && ll.lng <= x.ix.lon[x.ix.lon.length - 1] + 0.125 && ll.lat <= x.ix.lat[0] + 0.125 && ll.lat >= x.ix.lat[x.ix.lat.length - 1] - 0.125);
      if (cur) {
        const c = Math.round((ll.lng - cur.ix.lon[0]) / 0.25), rr = Math.round((cur.ix.lat[0] - ll.lat) / 0.25);
        const v = fieldVal(cur.f, mode, rr, c);
        if (v != null && mode === "wind") {
          const u = cur.f.u[rr][c], vv = cur.f.v[rr][c], dir = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(((Math.atan2(-u, -vv) * 180 / Math.PI) + 360) % 360 / 45) % 8];
          h = '<span class="k">Wind · ' + when + '</span><span class="big">' + Math.round(v) + "<small>km/h</small></span><div class=\"line\">from the " + dir + "</div>";
        } else if (v != null) h = '<span class="k">Freezing level · ' + when + '</span><span class="big">' + fmt(v) + "<small>m</small></span>";
      }
      if (!h) h = '<span class="k">' + when + "</span><div class=\"line\">No forecast here.</div>";
    } else if (mode === "radar" || mode === "off") {
      h = "";
    } else if (proLive()) {
      try {
        const fine = r && st.proIdx.g500[r.code];
        const p = await SS.api(fine ? "/v1/g500/point?lat=" + ll.lat.toFixed(4) + "&lon=" + ll.lng.toFixed(4) : "/v1/grid/point?lat=" + ll.lat.toFixed(4) + "&lon=" + ll.lng.toFixed(4));
        const d = (p.days || []).find((x) => x.date === st.day);
        if (d) {
          const dep = d.depth_cm, nw = d.new_cm;
          h = '<span class="k">Snow on the ground · ' + when + '</span><span class="big">' + (dep >= 1 ? Math.round(dep) + "<small>cm</small>" : "No snow") + "</span>" +
            (nw >= 1 ? '<span class="badge">+' + Math.round(nw) + " cm new</span>" : "") + (p.elev_m ? '<div class="line">at ' + fmt(p.elev_m) + " m</div>" : "");
        }
      } catch (er) { h = er.down ? '<div class="line">Pro data is updating, try again in a minute.</div>' : ""; }
      if (!h) h = '<span class="k">' + when + '</span><div class="line">No snow data here.</div>';
    } else {
      const v = r ? await staticValue(r, ll) : null;
      h = v ? '<span class="k">Snow on the ground · ' + when + '</span><span class="big">' + (v.depth >= 1 ? v.depth + "<small>cm</small>" : "No snow") + "</span>" +
          (v.new >= 1 ? '<span class="badge">+' + v.new + " cm new</span>" : "")
        : '<span class="k">' + when + '</span><div class="line">No snow data here.</div>';
    }
    if (st.over.aval && map.getLayer("aval_fill")) {
      const f = map.queryRenderedFeatures(e.point, { layers: ["aval_fill"] })[0];
      if (f) {
        const lv = f.properties.lvl;
        h += '<div class="av"><span class="k">Avalanche danger</span><div class="line"><b>' + (lv ? lv + " · " + AVAL_NAME[lv] : "No level published") + "</b></div>" +
          (f.properties.url ? '<a href="' + esc(f.properties.url) + '" target="_blank" rel="noopener">Official bulletin · ' + esc(f.properties.provider || "") + "</a>" : "") + "</div>";
      }
    }
    if (!h) { popup.remove(); return; }
    if (mode === "depth" || mode === "new") h += await nearestLine(ll);
    popup.setHTML('<div class="pv" aria-live="polite">' + h + "</div>");
  }

  async function nearestLine(ll) {
    try {
      const { rows } = await SS.resorts();
      const c = Math.cos(ll.lat * Math.PI / 180);
      let best = null, bd = 1e9;
      for (const x of rows) { const d = Math.hypot((x.lon - ll.lng) * c, x.lat - ll.lat) * 111; if (d < bd) { bd = d; best = x; } }
      return best && bd < 25 ? '<a class="near" href="resorts/' + encodeURIComponent(best.slug) + '.html">' + esc(best.name) + " · " + Math.max(1, Math.round(bd)) + " km →</a>" : "";
    } catch { return ""; }
  }

  // ------------------------------------------------------------------ region cards
  function drawCards() {
    const A = $("cardsA"), B = $("cardsB");
    const list = DATA.regions.map((r) => [r, r.days.find((y) => y.date === st.day) || r.days.find((y) => y.date === DATA.today) || r.days[r.days.length - 1]]);
    list.sort((p, q) => (q[1].resorts_with_snow - p[1].resorts_with_snow) || (q[1].max_cm - p[1].max_cm));
    const short = (n) => n.split(/ - | – |, /)[0];
    const cards = list.map(([r, x]) => {
      const best = x.top[0];
      if (!x.resorts_with_snow) {
        return '<article class="card rc empty"><h3><button data-fly="' + r.code + '">' + esc(r.name) + "</button></h3>" +
          '<p class="verdict">No snow at the resorts yet' + (x.max_cm >= 1 ? ". First snow on the high peaks." : ".") + "</p></article>";
      }
      const verdict = (x.date !== st.day ? dayName(x.date) + ": " : "") + fmt(x.resorts_with_snow) + " of " + fmt(r.n_resorts) + " resorts have snow" +
        (best ? " · deepest " + esc(short(best.name)) + " " + best.depth_cm + " cm" : "");
      const rows = '<ul class="rl">' + x.top.map((t) => '<li><a href="resorts/' + encodeURIComponent(t.slug) + '.html"><span>' + esc(short(t.name)) +
        "<small>" + esc(t.country) + '</small></span><span class="v">' + t.depth_cm + " cm" + (t.new_cm >= 1 ? "<em>+" + t.new_cm + "</em>" : "") + "</span></a></li>").join("") + "</ul>";
      return '<article class="card rc"><h3><button data-fly="' + r.code + '">' + esc(r.name) + '</button><button class="open" data-fly="' + r.code + '">Map</button></h3>' +
        '<p class="verdict">' + verdict + "</p>" +
        '<div class="stats"><div class="stat"><b>' + fmt(x.resorts_with_snow) + "</b><small>resorts with snow</small></div>" +
        '<div class="stat"><b>' + (best ? best.depth_cm + "<small>cm</small>" : "—") + "</b><small>deepest resort</small></div>" +
        '<div class="stat"><b>' + (x.new_max_cm >= 1 ? "+" + x.new_max_cm + "<small>cm</small>" : "—") + "</b><small>new snow</small></div></div>" + rows +
        (best ? '<div data-stay="' + esc(best.slug) + '"></div>' : "") + "</article>";
    });
    A.innerHTML = cards.slice(0, 2).join("");
    B.innerHTML = cards.slice(2).join("");
    A.onclick = B.onclick = (e) => {
      const b = e.target.closest("[data-fly]");
      if (!b || !map) return;
      flyRegion(b.dataset.fly);
      document.querySelector(".mapbox").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    // hotels near the deepest resort of each region (coordinates from resorts.json, loaded after first paint)
    const boxes = document.querySelectorAll("[data-stay]");
    if (boxes.length && SS.S.cfg && SS.S.cfg.stay22) SS.resorts().then(({ rows }) => {
      const by = Object.fromEntries(rows.map((x) => [x.slug, x]));
      boxes.forEach((b) => { const x = by[b.dataset.stay]; if (x) b.innerHTML = SS.stayBlock(x.lat, x.lon, x.name, { map: false }); });
    }).catch(() => {});
  }
})();
