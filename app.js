/* SnowScope Web app: full-screen map + panel (desktop) / bottom sheet (phone), timeline, layers, Ski finder,
   Powder, You, resort panel with shareable URLs (history.pushState to the static resort pages).
   Free: static pictures in snow/ (500 m where there is snow, 1 km overview), values read from the same pixels.
   Pro (signed in, GET /v1/me): 15 days, satellite snow, wind, freezing level, 3-day snow, forecasts, past winters. */
(async () => {
  "use strict";
  const { esc } = SS;
  const $ = (id) => document.getElementById(id);
  const LOC = (window.I18N && I18N.locale) || "en-GB";
  const BASE = new URL(document.documentElement.dataset.root || "./", location.href).href;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const U = SS.U, cmS = (v) => U.dep(v) + "<small>" + U.du() + "</small>";   // US units: one formatter (core.js SS.U)
  const D = (d) => new Date(d + "T12:00:00Z");
  const wd = (d) => D(d).toLocaleDateString(LOC, { weekday: "short", timeZone: "UTC" });
  const dnum = (d) => D(d).getUTCDate();
  const longDay = (d) => D(d).toLocaleDateString(LOC, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const addDays = (d, k) => { const x = D(d); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const store = SS.store;
  const DEPTH = [[1, [198, 219, 239]], [10, [158, 202, 225]], [25, [107, 174, 214]], [50, [66, 146, 198]], [100, [33, 113, 181]], [150, [8, 81, 156]], [250, [8, 48, 107]], [400, [37, 0, 79]]];
  const NEW = [[1, [247, 252, 185]], [5, [199, 233, 180]], [10, [127, 205, 187]], [20, [65, 182, 196]], [30, [29, 145, 192]], [50, [34, 94, 168]], [80, [12, 44, 132]]];
  const WIND = [[0, [214, 236, 246]], [10, [158, 210, 226]], [20, [107, 191, 143]], [35, [242, 212, 92]], [50, [242, 155, 63]], [70, [224, 83, 58]], [100, [158, 31, 99]]];
  const FREEZE = [[0, [44, 62, 145]], [1000, [74, 120, 194]], [1500, [111, 168, 220]], [2000, [168, 213, 226]], [2500, [243, 231, 155]], [3000, [246, 178, 107]], [3500, [224, 102, 102]], [4500, [166, 28, 60]]];
  const AVAL = { 1: "#CCFF66", 2: "#FFFF00", 3: "#FF9900", 4: "#FF0000", 5: "#7A0000" };
  const AVAL_NAME = { 1: "Low", 2: "Moderate", 3: "Considerable", 4: "High", 5: "Very high" };
  const NAMES = { ALPS: "Alps", PYRENEES: "Pyrenees", US_WEST: "US West", US_NE: "US Northeast", ATLAS: "Atlas (Morocco)", SCANDES: "Scandinavia", CA_WEST: "Canada West" };
  // free, no-key basemaps (owner 2026-11-02: no Mapbox): OpenFreeMap vector styles + AWS Terrain Tiles (terrarium) for
  // relief and 3D. No satellite basemap (no free source that allows a site with ads).
  const STYLES = { outdoors: ["Outdoors", "https://tiles.openfreemap.org/styles/liberty"], light: ["Light", "https://tiles.openfreemap.org/styles/positron"] };
  const DEM = { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14,
    attribution: "Terrain: Mapzen, AWS Open Data" };
  const ensureDem = () => { if (!map.getSource("dem")) map.addSource("dem", DEM); };
  const get = (k, d) => { const v = store.get(k); return v == null ? d : v; };

  const st = { day: null, main: "depth", p72: false, over: { pistes: !!get("ss_pistes", 0), aval: false, pins: true, stays: !!get("ss_stays", 1), stn: !!get("ss_stn", 1), s30: !!get("ss_s30", 1) }, monly: !!get("ss_monly", 0), s30: undefined, s30fail: false, s30loaded: false, covered: false, scale: get("ss_scale", 100),
    sharp: !!get("ss_sharp", false), style: get("ss_style", "outdoors"), terrain: !!get("ss_terrain", false), tab: "map", slug: null,
    region: null, pro: false, proIdx: null, proDates: null, gen: 0, fields: {}, pistes: { idx: null, loaded: new Set(), feats: [] },
    aval: null, radar: undefined, sheet: "peek", pushed: false, ski: { region: null, country: "", when: "today", radius: get("ss_radius", 200), min: 0, fresh: false, q: "" },
    origin: get("ss_origin", null), hour: null, deck: null, radarFrames: null, frame: null };
  let DATA, RES, BY = {}, map, LIB, ML, popup, toastT, ready = false, initialSlug = null;

  function toast(t, ms = 3200) { const e = $("toast"); e.textContent = t; e.hidden = !t; clearTimeout(toastT); if (t) toastT = setTimeout(() => { e.hidden = true; }, ms); }
  const rampAt = (stops, v) => {
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a); return ca.map((x, k) => Math.round(x + (cb[k] - x) * t)); }
    return stops[stops.length - 1][1];
  };
  const depthStops = () => DEPTH.map(([v, c], i) => [i === 0 ? 1 : v * st.scale / 400, c]);
  const p72on = () => st.p72 && st.day === DATA.today;      // 3-day snow pictures exist for today
  const newStops = () => (p72on() ? NEW.map(([v, c], i) => [i === 0 ? 1 : v * 1.5, c]) : NEW);
  const decDepth = (c) => (c <= 150 ? c : 150 + (c - 150) * 5);
  const prod = () => (st.main === "powder" ? (p72on() ? "n3" : "n") : "d");

  function styleUrl() {
    return (STYLES[st.style] || STYLES.outdoors)[1];
  }
  function onStyle() {
    ready = true;
    // quieter basemap (W22): no admin-1 / POI labels; snow is the only strong colour
    for (const l of map.getStyle().layers || []) {
      if (l.type === "symbol" && /state|poi|settlement-subdivision|airport|transit/.test(l.id)) map.setLayoutProperty(l.id, "visibility", "none");
    }
    ensureDem();
    if (st.style === "outdoors" && !map.getLayer("hill")) {     // relief shading under the labels and the snow
      map.addLayer({ id: "hill", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#4b5b6b" } }, firstSymbol());
    }
    if (st.terrain) map.setTerrain({ source: "dem", exaggeration: 1.4 });
    addOverlaySources();
    renderMain();
    applyOverlays(true);
    drawPins(); drawStays(); drawBest(); drawStations();
  }

  // ------------------------------------------------------------------ regions
  const slugOf = (code) => code.toLowerCase().replace("_ne", "-northeast").replace("_", "-");
  let regionMove = false;
  // start region (v2): link > a region the visitor picked > the region with the most resorts with snow today
  // (the time zone no longer decides: a Moroccan visitor saw an empty Atlas map)
  function homeRegion() {
    const h = location.hash.slice(1);
    const fh = DATA.regions.find((r) => slugOf(r.code) === h);
    if (fh) return fh.code;
    const saved = store.get("ss_region");
    if (saved && store.get("ss_region_pick") && DATA.regions.some((r) => r.code === saved)) return saved;
    const today = (r) => r.days.find((y) => y.date === DATA.today) || r.days[r.days.length - 1] || {};
    return DATA.regions.slice().sort((a, b) => (today(b).resorts_with_snow || 0) - (today(a).resorts_with_snow || 0) || (today(b).max_cm || 0) - (today(a).max_cm || 0))[0].code;
  }
  // framed on the snow: the snowiest cluster (resorts with snow within ~150 km of the deepest one), else the region
  function snowBounds(r) {
    const day = r.days.find((y) => y.date === DATA.today) || r.days[r.days.length - 1] || { top: [] };
    const all = (day.top || []).slice(0, 12).map((t) => BY[t.slug]).filter(Boolean);
    const c0 = all[0], pts = c0 ? all.filter((x) => Math.hypot((x.lon - c0.lon) * Math.cos(c0.lat * Math.PI / 180), x.lat - c0.lat) * 111 <= 150) : [];
    if (pts.length < 2) return [r.coords[3], r.coords[1]];
    const lo = pts.map((x) => x.lon), la = pts.map((x) => x.lat);
    return [[Math.min(...lo) - 0.35, Math.min(...la) - 0.25], [Math.max(...lo) + 0.35, Math.max(...la) + 0.25]];
  }
  const startPad = () => ({ top: 90, bottom: innerWidth > 760 ? 150 : 320, left: (innerWidth > 760 ? 424 : 0) + 16, right: 80 });
  function flyRegion(code, instant) {
    const r = DATA.regions.find((x) => x.code === code);
    if (!r) return;
    st.region = code; st.ski.region = code;
    store.set("ss_region", code);
    if ($("regName")) $("regName").textContent = r.name;
    if (map) {
      regionMove = true;
      map.fitBounds(snowBounds(r), { padding: startPad(), maxZoom: 8.2, duration: instant ? 0 : 1100, essential: true });
    }
    if (!st.slug) history.replaceState(null, "", location.pathname + "#" + slugOf(code));
    if (!st.slug && (st.tab === "map" || st.tab === "ski" || st.tab === "powder")) renderPanel();
  }
  // region picker (v2): one "Alps ▾" button in the top bar opens a menu (the chip row is gone)
  function drawRegions() {
    const bar = document.querySelector(".appbar"), brand = bar && bar.querySelector(".brand");
    let btn = $("regBtn");
    if (!btn && brand) {
      brand.insertAdjacentHTML("afterend", '<button class="regbtn" id="regBtn" aria-haspopup="menu" aria-expanded="false"><span class="ms">landscape</span><span class="rn" id="regName"></span><span class="ms">expand_more</span></button>');
      btn = $("regBtn");
      btn.onclick = (e) => { e.stopPropagation(); regionMenu(); };
    }
    const r = DATA.regions.find((x) => x.code === st.region);
    if ($("regName")) $("regName").textContent = r ? r.name : "Region";
    const box = $("regions"); if (box) box.innerHTML = "";
  }
  function regionMenu() {
    const old = $("regMenu"); if (old) { old.remove(); $("regBtn").setAttribute("aria-expanded", "false"); return; }
    const m = document.createElement("div");
    m.id = "regMenu"; m.className = "regmenu glass"; m.setAttribute("role", "menu");
    const today = (r) => r.days.find((y) => y.date === DATA.today) || r.days[r.days.length - 1] || {};
    m.innerHTML = DATA.regions.map((r) => { const z = today(r);
      return '<button role="menuitemradio" data-r="' + r.code + '" aria-checked="' + (r.code === st.region) + '"><span class="nm"><b>' + esc(r.name) + "</b><small>" +
        (z.resorts_with_snow ? esc(I18N.tu("{a} resorts with snow", fmt(z.resorts_with_snow))) : esc(I18N.t("No snow at the resorts yet"))) + "</small></span>" +
        (z.new_max_cm >= 1 ? '<em class="nw">+' + U.depth(z.new_max_cm) + "</em>" : "") + "</button>"; }).join("") +
      ("geolocation" in navigator ? '<button role="menuitem" data-me><span class="nm"><b><span class="ms">near_me</span> Near me</b></span></button>' : "");
    document.body.appendChild(m);
    const b = $("regBtn").getBoundingClientRect();
    m.style.top = b.bottom + 8 + "px";
    if (document.documentElement.dir === "rtl") m.style.right = (innerWidth - b.right) + "px"; else m.style.left = Math.max(8, b.left) + "px";
    $("regBtn").setAttribute("aria-expanded", "true");
    const close = (e) => { if (e && m.contains(e.target)) return; m.remove(); $("regBtn").setAttribute("aria-expanded", "false"); document.removeEventListener("click", close, true); };
    setTimeout(() => document.addEventListener("click", close, true));
    m.onclick = (e) => {
      const it = e.target.closest("[data-r]");
      if (it) { store.set("ss_region_pick", 1); if (st.slug) closeResort(); flyRegion(it.dataset.r); close(); return; }
      if (e.target.closest("[data-me]")) { close(); navigator.geolocation.getCurrentPosition((p) => map && map.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 9, duration: 1400 }), () => toast("Location not available"), { maximumAge: 6e5, timeout: 10000 }); }
    };
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
        const lo = addDays(DATA.today, -7), hi = addDays(DATA.today, 7), s = new Set(DATA.dates);
        for (const src of [st.proIdx.g500, st.proIdx.grid]) for (const d of Object.values(src)) for (const x of d.days || []) if (x.date >= lo && x.date <= hi) s.add(x.date);
        st.proDates = [...s].sort();
      } catch (e) { st.proIdx = null; st.proDates = null; if (e.down) toast("Pro data is updating, try again in a minute.", 5000); }
    }
    if (!st.pro) {
      if (["sat", "wind", "freeze"].includes(st.main)) st.main = "depth";
      st.p72 = false;
      if (!DATA.dates.includes(st.day)) st.day = DATA.today;
    }
    if (was !== st.pro || st.pro) { drawDays(); drawLegend(); if (ready) renderMain(); }
    renderPanel();
    if (window.SSX) SSX.refresh();
  }
  const proLive = () => st.pro && st.proIdx;
  const isStatic = (d) => DATA.dates.includes(d);

  // ------------------------------------------------------------------ timeline
  function dayLocked(d) {
    if (st.pro) return false;
    if (st.main === "powder") return d !== DATA.today;
    return !isStatic(d);
  }
  function drawDays() {
    const box = $("days");
    const dates = proLive() && st.proDates ? st.proDates : Array.from({ length: 9 }, (_, i) => addDays(DATA.today, i - 4));
    box.innerHTML = dates.map((d) => {
      const lk = dayLocked(d);
      return '<button class="chip' + (lk ? " locked" : "") + (d === DATA.today ? " today" : "") + '" data-d="' + d + '"' + (lk ? ' aria-disabled="true" aria-label="' + wd(d) + " " + dnum(d) + ', Pro"' : ' aria-pressed="' + (d === st.day) + '"') + ">" +
        "<small>" + (d === DATA.today ? "Today" : wd(d)) + "</small>" + dnum(d) + (lk ? '<span class="ms f lk">lock</span>' : "") + "</button>";
    }).join("");
    box.onclick = (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      if (b.getAttribute("aria-disabled") === "true") SS.upsell(st.main === "powder" ? "Powder on other days is in Pro" : "See 15 days of snow: the past week and the week ahead");
      else setDay(b.dataset.d);
    };
    const on = box.querySelector('[aria-pressed="true"]');
    if (on) box.scrollLeft = on.offsetLeft - box.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2;
  }
  function setDay(d) {
    st.day = d;
    if (popup) popup.remove();
    document.querySelectorAll("#days [data-d]:not([aria-disabled])").forEach((b) => b.setAttribute("aria-pressed", b.dataset.d === d));
    // every free day is already on the map (the "deck", renderStatic): switching is an opacity change, no decode
    if (deckReady(d)) { deckShow(d); clearFine(); loadFine(); refreshS30(); } else renderMain();
    drawLegend(); drawPins(); drawBest();
    if (!st.slug && st.tab === "map") renderPanel();
    prefetchAround(d);
    if (window.SSX) SSX.onDay();
  }
  const deckKey = () => prod() + ":" + st.scale + ":" + p72on();
  const deckReady = (d) => !!(st.deck && ["depth", "powder"].includes(st.main) && st.deck.key === deckKey() && st.deck.dates.includes(d) && st.deck.done.has(d));
  function deckShow(d, next, t) {       // t in [0,1): cross-fade from day d to day next (timeline scrub)
    if (!st.deck) return;
    // only the two days taking part stay visible; the others are switched off so a frame costs two layers
    for (const dd of st.deck.dates) {
      const op = dd === d ? 0.95 * (1 - (t || 0)) : dd === next ? 0.95 * t : 0;
      for (const r of DATA.regions) {
        const id = "m_" + r.code + "_" + dd;
        if (!map.getLayer(id)) continue;
        const vis = op > 0 ? "visible" : "none";
        if (map.getLayoutProperty(id, "visibility") !== vis) map.setLayoutProperty(id, "visibility", vis);
        if (op > 0) map.setPaintProperty(id, "raster-opacity", st.covered ? 0 : op);
      }
    }
  }
  // ------------------------------------------------------------------ "Sharp 30 m": the 30 m snow tiles (free, from z9) over the static picture
  const firstS30 = () => { const l = (map.getStyle().layers || []).find((x) => x.id.startsWith("m_s30_")); return l ? l.id : undefined; };
  function s30Day() {            // the tile day for the selected day, or null when the 30 m product has none
    const c = st.s30; if (!c || !c.enabled) return null;
    if ((c.days || []).includes(st.day)) return st.day;
    return st.day === DATA.today ? "latest" : null;
  }
  function addS30() {
    const c = st.s30, day = s30Day();
    if (!c || !day || st.s30fail || !st.over.s30 || st.main !== "depth" || !SS.S.api || firstS30()) { chip30(); return; }
    for (const d of c.domains || []) {
      addRaster("m_s30_" + d.code, SS.S.api + (c.tiles || "/v1/snow30/tiles/{product}/{day}/{z}/{x}/{y}.png").replace("{product}", c.product || "depth").replace("{day}", day),
        { bounds: d.bbox, srcMin: c.min_zoom || 9, srcMax: c.max_zoom || 14, min: c.min_zoom || 9, opacity: 0.95, tileSize: 256 });
    }
    chip30();
  }
  function removeS30() {
    st.s30loaded = false;
    for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_s30_"))) map.removeLayer(l.id);
    for (const id of Object.keys(map.getStyle().sources || {}).filter((x) => x.startsWith("m_s30_"))) map.removeSource(id);
  }
  function refreshS30() { if (!ready) return; removeS30(); if (isStatic(st.day)) addS30(); else chip30(); }
  function s30InView() {
    const c = st.s30; if (!c || !map || !firstS30() || map.getZoom() < (c.min_zoom || 9)) return false;
    const b = map.getBounds();
    return (c.domains || []).some((d) => d.bbox[0] < b.getEast() && d.bbox[2] > b.getWest() && d.bbox[1] < b.getNorth() && d.bbox[3] > b.getSouth());
  }
  function chip30() {            // legend chip + the swap: the 1 km / 500 m pictures fade out once the first 30 m tiles are on screen
    const on = s30InView();
    const e = $("chip30"); if (e) e.hidden = !on;
    const cover = on && st.s30loaded;
    if (cover === st.covered) return;
    st.covered = cover;
    for (const l of (map.getStyle().layers || []).filter((x) => x.type === "raster" && x.id.startsWith("m_") && !x.id.startsWith("m_s30_"))) {
      const vis = map.getLayoutProperty(l.id, "visibility") !== "none";
      if (vis) map.setPaintProperty(l.id, "raster-opacity", cover ? 0 : 0.95 * (st.monly ? 0.22 : 1));
    }
  }
  const s30Enabled = () => !!(SS.S.cfg && SS.S.cfg.snow30_enabled);     // owner switch (data/web_config.json): off = no 30 m anywhere
  async function loadS30() {
    if (!SS.S.api || !s30Enabled()) { st.s30 = null; return; }
    try { const c = await SS.api("/v1/config", { auth: false, timeout: 12000 }); st.s30 = c && c.snow30 && c.snow30.enabled ? c.snow30 : null; } catch { st.s30 = null; }
    if (st.s30) refreshS30();
  }
  async function s30Point(lat, lon) {     // "Sharp 30 m: 42 cm" for the point panel (null when not covered)
    if (!st.s30 || !SS.S.api) return null;
    try {
      const r = await SS.api("/v1/snow30/point?lat=" + lat + "&lon=" + lon, { auth: false, timeout: 12000 });
      return r && r.depth_cm != null && !(r.flags && r.flags.water) ? r : null;
    } catch { return null; }
  }
  function clearFine() {
    for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_f_"))) map.removeLayer(l.id);
    for (const id of Object.keys(map.getStyle().sources || {}).filter((x) => x.startsWith("m_f_"))) map.removeSource(id);
  }
  function scrub(a, b, t) {             // fluid timeline: fade between two days that are both on the deck; else snap
    if (!deckReady(a) || (b && !deckReady(b))) { const d = t < 0.5 || !b ? a : b; if (d !== st.day) setDay(d); return; }
    for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_f_"))) map.setPaintProperty(l.id, "raster-opacity", 0);
    deckShow(a, b, t);
  }
  function settle(d) {                  // scrub released
    if (d !== st.day) { setDay(d); return; }
    if (deckReady(d)) { deckShow(d); for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_f_"))) map.setPaintProperty(l.id, "raster-opacity", 0.95); loadFine(); }
  }
  function prefetchAround(d) {     // the next / previous day open instantly (pictures decoded in the background)
    const i = DATA.dates.indexOf(d), p = prod();
    for (const k of [i + 1, i - 1]) {
      const dd = DATA.dates[k];
      if (!dd) continue;
      const run = () => DATA.regions.forEach((r) => { const x = r.days.find((y) => y.date === dd); if (x && x.ov[p]) coloured(BASE + x.ov[p], p); });
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 300);
    }
  }
  let playT = 0;
  function play() {
    const btn = $("play");
    if (playT) { clearInterval(playT); playT = 0; btn.innerHTML = '<span class="ms f">play_arrow</span>'; return; }
    const ds = [...document.querySelectorAll("#days [data-d]:not([aria-disabled])")].map((b) => b.dataset.d);
    if (ds.length < 2) return;
    btn.innerHTML = '<span class="ms f">pause</span>';
    playT = setInterval(() => { const i = ds.indexOf(st.day); setDay(ds[(i + 1) % ds.length]); }, 1400);
  }

  // ------------------------------------------------------------------ legend: scale + Clear / Sharp
  function drawLegend() {
    const L = $("legend");
    const mode = st.main;
    const when = st.day > DATA.today ? " · forecast" : "";
    const ramp = (title, stops, ticks) => "<b>" + title + when + '</b><div class="ramp">' + stops.map((s) => '<i style="background:rgb(' + s[1].join(",") + ')"></i>').join("") +
      '</div><div class="ramp-l">' + ticks.map((t) => "<span>" + t + "</span>").join("") + "</div>";
    const live = !isStatic(st.day);
    const ticks = (a) => a.map((v, i) => { const n = U.depN(v); return (n < 1 ? String(n) : fmt(n)) + (i === a.length - 1 ? "+ " + U.du() : ""); });
    let h = "";
    if (mode === "depth") {
      const m = st.scale;
      h = ramp("Snow depth", depthStops(), ticks(live ? [1, 25, 100, 400] : [1, m / 4, m / 2, m])).replace("</b>", ' <span class="chip30" id="chip30" hidden>30 m</span></b>');
      h += '<div class="row2">';            // v2: colour scale + Clear / Sharp live in the layers sheet only
    } else if (mode === "powder") {
      h = ramp(p72on() ? "New snow, 3 days" : "New snow, 24 h", newStops(), ticks(p72on() ? [1, 15, 45, 120] : [1, 10, 30, 80])) + '<div class="row2">';
    } else if (mode === "sat") h = '<b>Latest clear view</b>' + (DATA.regions.find((r) => r.sat) ? '<small class="none" style="padding:0 0 4px;display:block">' + esc(I18N.t("Clear view up to") + " " + D(DATA.regions.find((r) => r.sat).sat.asof).toLocaleDateString(LOC, { day: "numeric", month: "short", timeZone: "UTC" })) + "</small>" : "") + '<div class="sw"><span><i style="background:#F6FAFF"></i>Snow</span><span><i style="background:#A0C4E4"></i>Patchy</span><span><i style="background:#96693E"></i>No snow</span><span><i style="background:#7D7D8A"></i>Cloud</span></div><div class="row2">';
    else if (mode === "wind") h = ramp("Wind at midday", WIND, [0, 20, 50, 100].map((v, i, a) => U.wv(v) + (i === a.length - 1 ? " " + U.wu() : ""))) + '<div class="row2">';
    else if (mode === "freeze") h = ramp("Freezing level", FREEZE, [0, 1500, 3000, 4500].map((v, i, a) => U.ev(v) + (i === a.length - 1 ? " " + U.eu() : ""))) + '<div class="row2">';
    else if (mode === "radar") h = "<b>Rain & snow now</b><div class=\"row2\">";
    // v2: Clear / Sharp only in the layers sheet
    if (h) h += "</div>";
    if (st.over.aval) h += (h ? '<div style="height:7px"></div>' : "") + '<b>Avalanche danger</b><div class="sw">' + [1, 2, 3, 4, 5].map((k) => '<span><i style="background:' + AVAL[k] + '"></i>' + k + "</span>").join("") + "</div>";
    L.innerHTML = h; L.hidden = !h;
    if (map) chip30();
    L.onclick = (e) => {
      const s = e.target.closest("[data-scale]"), sh = e.target.closest("[data-sharp]");
      if (s) { st.scale = +s.dataset.scale; store.set("ss_scale", st.scale); drawLegend(); recolour(); }
      if (sh) { st.sharp = sh.dataset.sharp === "1"; store.set("ss_sharp", st.sharp); drawLegend(); setResampling(); }
    };
  }

  // ------------------------------------------------------------------ static pictures: codes -> colours on the page
  const CODES = new Map();
  function codesOf(url) {
    if (!CODES.has(url)) CODES.set(url, new Promise((ok) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0);
        const px = x.getImageData(0, 0, c.width, c.height).data, n = c.width * c.height, a = new Uint8Array(n);
        for (let i = 0; i < n; i++) a[i] = px[i * 4];
        ok({ w: c.width, h: c.height, c: a });
      };
      im.onerror = () => ok(null);
      im.src = url;
    }));
    if (CODES.size > 160) CODES.delete(CODES.keys().next().value);
    return CODES.get(url);
  }
  const LUTS = {};
  function lut(p) {
    const key = p + ":" + st.scale + ":" + p72on();
    if (LUTS[key]) return LUTS[key];
    const t = new Uint8ClampedArray(256 * 4), stops = p === "d" ? depthStops() : newStops();
    if (p === "sat") {
      const COL = { 1: [236, 244, 255], 2: [150, 105, 62], 3: [140, 186, 228] };
      for (let c = 0; c < 255; c++) {
        const s0 = c & 3, age = c >> 2;
        if (s0 === 0) t.set([125, 125, 138, 90], c * 4);
        else t.set([...COL[s0], Math.max(110, 235 - 12 * age)], c * 4);
      }
      return (LUTS[key] = t);
    }
    for (let c = 1; c < 255; c++) {
      const v = p === "d" ? decDepth(c) : c;
      if (v < 1) continue;
      const col = rampAt(stops, v);
      t.set([col[0], col[1], col[2], 238], c * 4);
    }
    return (LUTS[key] = t);
  }
  function paint(cd, p) {
    const cv = document.createElement("canvas"); cv.width = cd.w; cv.height = cd.h;
    const x = cv.getContext("2d"), im = x.createImageData(cd.w, cd.h), L = lut(p), o = im.data, a = cd.c;
    for (let i = 0, n = a.length; i < n; i++) { const k = a[i] * 4; if (L[k + 3]) { const j = i * 4; o[j] = L[k]; o[j + 1] = L[k + 1]; o[j + 2] = L[k + 2]; o[j + 3] = L[k + 3]; } }
    x.putImageData(im, 0, 0);
    return cv;
  }
  const fineUrl = (r, d, p, cr, cc) => BASE + "snow/img/" + r.code + "/" + d + "_" + p + "_" + cr + "_" + cc + ".png";
  function chunkBox(r, cr, cc) {
    const L = r.lattice500, CH = r.chunk;
    const n = L.north - cr * CH * L.dlat, w = L.west + cc * CH * L.dlon;
    const rows = Math.min(CH, L.ny - cr * CH), cols = Math.min(CH, L.nx - cc * CH);
    return { n, s: n - rows * L.dlat, w, e: w + cols * L.dlon };
  }
  const corners = (b) => [[b.w, b.n], [b.e, b.n], [b.e, b.s], [b.w, b.s]];

  // ------------------------------------------------------------------ main layer
  function firstSymbol() { const l = (map.getStyle().layers || []).find((x) => x.type === "symbol"); return l ? l.id : undefined; }
  function beneath() { return map.getLayer("aval_fill") ? "aval_fill" : map.getLayer("pistes") ? "pistes" : firstSymbol(); }
  function clearMain() {
    st.deck = null;
    for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_"))) map.removeLayer(l.id);
    for (const id of Object.keys(map.getStyle().sources || {}).filter((x) => x.startsWith("m_"))) map.removeSource(id);
  }
  // coloured picture (object URL) per picture + colour scale, painted once and kept: the deck and the scrub reuse it
  const BLOBS = new Map();
  function coloured(url, p, coords) {   // -> { url, coords } (padded to non-power-of-two, see npot)
    const key = url + "|" + p + ":" + st.scale + ":" + p72on();
    if (!BLOBS.has(key)) BLOBS.set(key, codesOf(url).then((cd) => cd && new Promise((ok) => { const [cv, cc] = npot(paint(cd, p), coords); cv.toBlob((b) => ok(b ? { url: URL.createObjectURL(b), coords: cc } : null), "image/png"); })));
    if (BLOBS.size > 200) BLOBS.delete(BLOBS.keys().next().value);
    return BLOBS.get(key);
  }
  const rasterPaint = (op) => ({ "raster-opacity": st.covered ? 0 : op * (st.monly ? 0.22 : 1), "raster-opacity-transition": { duration: 300 }, "raster-fade-duration": 0, "raster-resampling": st.sharp ? "nearest" : "linear" });
  function setResampling() {
    for (const l of (map.getStyle().layers || []).filter((x) => x.id.startsWith("m_") && x.type === "raster")) map.setPaintProperty(l.id, "raster-resampling", st.sharp ? "nearest" : "linear");
  }
  function addCanvas(id, cv, coords, opt = {}) { addImage(id, cv, coords, opt); }   // see addImage (MapLibre canvas = black)

  // MapLibre (4.7 and 5.6 alike): an image source whose width or height is a power of two (the 1024 px chunks) is
  // uploaded with mipmaps, and drawn with "nearest" resampling (Sharp) it samples as an opaque BLACK texture
  // (the owner's "zoom in on the Alps: black"). One transparent column / row makes every picture non-power-of-two.
  const pot = (n) => n > 0 && (n & (n - 1)) === 0;
  function npot(cv, coords) {
    if (!pot(cv.width) && !pot(cv.height)) return [cv, coords];
    const w = cv.width + (pot(cv.width) ? 1 : 0), h = cv.height + (pot(cv.height) ? 1 : 0);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(cv, 0, 0);
    const [[W, N], , [E, S]] = coords;
    const E2 = W + (E - W) * w / cv.width, yN = mercY(N), yS2 = yN - (yN - mercY(S)) * h / cv.height;
    const S2 = (2 * Math.atan(Math.exp(yS2)) - Math.PI / 2) * 180 / Math.PI;
    return [c, [[W, N], [E2, N], [E2, S2], [W, S2]]];
  }
  function addImage(id, cv0, coords0, opt = {}) {
    const gen = st.gen, [cv, coords] = npot(cv0, coords0);
    cv.toBlob((b) => {
      if (!b || map.getSource(id) || gen !== st.gen) return;
      map.addSource(id, { type: "image", url: URL.createObjectURL(b), coordinates: coords });
      map.addLayer({ id, type: "raster", source: id, minzoom: opt.min || 0, maxzoom: opt.max || 24, paint: rasterPaint(0.95) }, firstS30() || beneath());
    }, "image/png");
  }
  function addRaster(id, tiles, opt) {
    map.addSource(id, { type: "raster", tiles: [tiles], tileSize: opt.tileSize || 256, bounds: opt.bounds, minzoom: opt.srcMin || 0, maxzoom: opt.srcMax || 10, attribution: opt.attribution || "" });
    map.addLayer({ id, type: "raster", source: id, minzoom: opt.min || 0, maxzoom: opt.max || 24, paint: rasterPaint(opt.opacity || 0.9) }, beneath());
  }
  function renderMain() {
    if (!ready) return;
    st.gen++;
    clearMain();
    const mode = st.main;
    if (mode === "off") return;
    if (mode === "wind" || mode === "freeze") { renderField(mode); return; }
    if (mode === "radar") { renderRadar(); return; }
    if (mode === "sat") { renderSat(); return; }
    if (isStatic(st.day)) { renderStatic(); return; }
    if (proLive()) renderLive(mode);
  }
  async function renderSat() {      // latest clear satellite view (free, static, same for every day)
    const gen = st.gen;
    await Promise.all(DATA.regions.filter((r) => r.sat).map(async (r) => {
      const cd = await codesOf(BASE + r.sat.img);
      if (cd && gen === st.gen) addCanvas("m_sat_" + r.code, paint(cd, "sat"), r.coords);
    }));
  }
  async function renderStatic() {
    // the deck: the selected day first, then every other free day of the same product at opacity 0, so the timeline
    // (chips, keys, scrub, play) only changes opacities afterwards: no decode, no upload, no layout shift
    const gen = st.gen, p = prod();
    const dates = DATA.dates.filter((d0) => DATA.regions.some((r) => { const d = r.days.find((x) => x.date === d0); return d && d.ov[p]; }));
    st.deck = { key: deckKey(), dates, done: new Set() };
    const addDay = async (d0) => {
      await Promise.all(DATA.regions.map(async (r) => {
        const d = r.days.find((x) => x.date === d0);
        if (!d || !d.ov[p]) return;
        const pic = await coloured(BASE + d.ov[p], p, r.coords);
        const id = "m_" + r.code + "_" + d0;
        if (!pic || gen !== st.gen || map.getSource(id)) return;
        map.addSource(id, { type: "image", url: pic.url, coordinates: pic.coords });          // no max zoom: upsampled at z13-16
        map.addLayer({ id, type: "raster", source: id, layout: { visibility: d0 === st.day ? "visible" : "none" }, paint: rasterPaint(0.95) }, firstS30() || beneath());
      }));
      if (gen === st.gen && st.deck) st.deck.done.add(d0);
    };
    await addDay(st.day);
    if (gen === st.gen) addS30();
    loadFine();
    // the other days only after the first complete render: MapLibre's "load" event (URL view, click wiring) waits
    // for every source, so adding 40 pictures up front would hold the whole page back
    if (!map.loaded()) await new Promise((ok) => { map.once("load", ok); setTimeout(ok, 15000); });
    const rest = dates.filter((d) => d !== st.day).sort((a, b) => Math.abs(D(a) - D(st.day)) - Math.abs(D(b) - D(st.day)));
    for (const d0 of rest) { if (gen !== st.gen) return; await addDay(d0); await new Promise((ok) => setTimeout(ok, 120)); }
    if (window.SSX && gen === st.gen) SSX.onDeck();
  }
  async function loadFine() {
    if (!ready || !isStatic(st.day) || !["depth", "powder"].includes(st.main) || map.getZoom() < 7) return;
    const gen = st.gen, p = prod(), b = map.getBounds();
    for (const r of DATA.regions) {
      if (!r.fine) continue;
      const d = r.days.find((x) => x.date === st.day);
      for (const [cr, cc] of (d && d.fine[p]) || []) {
        const bx = chunkBox(r, cr, cc), id = "m_f_" + r.code + "_" + cr + "_" + cc;
        if (bx.e < b.getWest() || bx.w > b.getEast() || bx.n < b.getSouth() || bx.s > b.getNorth() || map.getSource(id)) continue;
        // MapLibre draws late-added canvas sources black: hand the coloured chunk over as an image instead
        codesOf(fineUrl(r, st.day, p, cr, cc)).then((cd) => { if (cd && gen === st.gen) addImage(id, paint(cd, p), corners(bx), { min: 7 }); });
      }
    }
  }
  function recolour() { if (isStatic(st.day)) renderMain(); stnRecolour(); }
  function renderLive(mode) {
    if (!proLive()) return;
    const A = SS.S.api;
    for (const code of new Set([...Object.keys(st.proIdx.g500), ...Object.keys(st.proIdx.grid)])) {
      const g = st.proIdx.g500[code], c = st.proIdx.grid[code];
      const gi = g ? g.days.findIndex((x) => x.date === st.day) : -1, ci = c ? c.days.findIndex((x) => x.date === st.day) : -1;
      if (mode === "sat") { if (gi >= 0) addRaster("m_" + code + "_f", A + "/v1/g500/" + code + "/tiles/obs/" + gi + "/{z}/{x}/{y}.png", { bounds: g.bbox, srcMin: 6, srcMax: 12, min: 6, opacity: 0.85 }); continue; }
      const nw = mode === "powder";
      if (ci >= 0) addRaster("m_" + code + "_c", A + "/v1/grid/" + code + "/tiles/" + (nw ? "new_cm" : "depth_cm") + "_hd/" + ci + "/{z}/{x}/{y}.png", { bounds: c.bbox, srcMax: 10, max: gi >= 0 ? 6 : 24 });
      if (gi >= 0) addRaster("m_" + code + "_f", A + "/v1/g500/" + code + "/tiles/" + (nw ? "new" : "depth") + "/" + gi + "/{z}/{x}/{y}.png", { bounds: g.bbox, srcMin: 6, srcMax: 12, min: 6 });
    }
    if (mode === "sat" && map.getZoom() < 6) toast("Zoom in to see satellite snow");
    if (mode === "powder" && st.p72) toast("3-day snow is shown for today");
  }
  async function renderField(kind) {
    const v = kind === "wind" ? "wind" : "freezing_level", day = st.day, gen = st.gen;
    let any = false;
    await Promise.all(DATA.regions.map(async (r) => {
      const dom = r.code.toLowerCase();
      try {
        const ix = st.fields[dom] || (st.fields[dom] = await SS.api("/v1/fields/" + dom + "/index"));
        // midday by default; the timeline's hour row (expert.js) sets st.hour (0..23 UTC) for 3-hour steps
        let best = -1, bd = 1e18; const want = Date.parse(day + "T" + String(st.hour == null ? 12 : st.hour).padStart(2, "0") + ":00:00Z");
        ix.times.forEach((t, i) => { const d = Math.abs(Date.parse(t) - want); if (d < bd && d <= 9 * 3600e3) { bd = d; best = i; } });
        if (best < 0) return;
        const key = dom + "/" + v + "/" + best;
        const f = st.fields[key] || (st.fields[key] = await SS.api("/v1/fields/" + dom + "/" + v + "/" + best + ".json"));
        if (gen !== st.gen) return;
        const pic = fieldPicture(ix, f, kind);
        addCanvas("m_fx_" + dom, pic.cv, pic.coords);
        st.fields["cur_" + dom] = { ix, f, kind };
        any = true;
      } catch (e) { if (e.down) toast("Pro data is updating, try again in a minute."); }
    }));
    if (!any && gen === st.gen) toast("No " + (kind === "wind" ? "wind" : "freezing level") + " forecast for this day");
  }
  function fieldVal(f, kind, r, c) {
    if (kind === "wind") { const u = f.u[r] && f.u[r][c], v = f.v[r] && f.v[r][c]; return u == null || v == null ? null : Math.hypot(u, v) * 3.6; }
    const z = f.z[r] && f.z[r][c]; return z == null ? null : z;
  }
  function fieldPicture(ix, f, kind) {
    const nx = ix.lon.length, ny = ix.lat.length, dl = Math.abs(ix.lon[1] - ix.lon[0]) || 0.25, dt = Math.abs(ix.lat[0] - ix.lat[1]) || 0.25;
    const W = ix.lon[0] - dl / 2, E = ix.lon[nx - 1] + dl / 2, N = ix.lat[0] + dt / 2, S = ix.lat[ny - 1] - dt / 2;
    const k = 6, w = nx * k, h = ny * k, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"), im = ctx.createImageData(w, h), yN = mercY(N), yS = mercY(S), stops = kind === "wind" ? WIND : FREEZE;
    for (let y = 0; y < h; y++) {
      const la = (2 * Math.atan(Math.exp(yN - (y + 0.5) / h * (yN - yS))) - Math.PI / 2) * 180 / Math.PI;
      const fr = Math.min(ny - 1.001, Math.max(0, (ix.lat[0] - la) / dt));
      for (let x = 0; x < w; x++) {
        const fc = Math.min(nx - 1.001, Math.max(0, (x + 0.5) / k - 0.5)), r0 = Math.floor(fr), c0 = Math.floor(fc), tr = fr - r0, tc = fc - c0;
        const q = [fieldVal(f, kind, r0, c0), fieldVal(f, kind, r0, c0 + 1), fieldVal(f, kind, r0 + 1, c0), fieldVal(f, kind, r0 + 1, c0 + 1)];
        if (q.some((v) => v == null)) continue;
        const v = q[0] * (1 - tr) * (1 - tc) + q[1] * (1 - tr) * tc + q[2] * tr * (1 - tc) + q[3] * tr * tc, col = rampAt(stops, v), o = (y * w + x) * 4;
        im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 190;
      }
    }
    ctx.putImageData(im, 0, 0);
    return { cv, coords: [[W, N], [E, N], [E, S], [W, S]] };
  }
  async function renderRadar() {
    try {
      const r = await SS.api("/v1/radar/frames", { auth: false });
      if (!r.available || !r.frames || !r.frames.length) { st.radar = false; toast("Radar is not available right now"); return; }
      st.radar = true;
      if (st.main !== "radar") return;
      st.radarFrames = r.frames.slice(-8); st.radarMeta = { tileSize: r.tile_size || 256, srcMax: r.max_zoom || 7 };
      st.frame = st.radarFrames.length - 1;
      radarFrame(st.frame);
      if (window.SSX) SSX.onDay();
    } catch { toast("Radar is updating, try again in a minute."); }
  }
  function radarFrame(i) {              // the last ~2 h of radar, one tile layer per frame, shown by opacity
    if (!st.radarFrames || st.main !== "radar") return;
    st.frame = i;
    st.radarFrames.forEach((f, k) => {
      const id = "m_radar_" + k;
      if (!map.getLayer(id) && (k === i || Math.abs(k - i) <= 1)) addRaster(id, f.tiles, { ...st.radarMeta, opacity: k === i ? 0.7 : 0, attribution: "RainViewer" });
      if (map.getLayer(id)) map.setPaintProperty(id, "raster-opacity", k === i ? 0.7 : 0);
    });
  }

  // ------------------------------------------------------------------ overlays (pistes, avalanche, resort pins)
  function addOverlaySources() {
    const fc = { type: "FeatureCollection", features: [] };
    if (map.getSource("pistes")) return;
    map.addSource("pistes", { type: "geojson", data: fc });
    map.addLayer({ id: "pistes", type: "line", source: "pistes", minzoom: 9, layout: { visibility: "none", "line-cap": "round" },
      paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 3],
        "line-color": ["case", ["==", ["get", "kind"], "lift"], "#333333", ["match", ["get", "difficulty"], "novice", "#0B7A53", "easy", "#1463F3", "intermediate", "#D7263D", "advanced", "#111111", "expert", "#111111", "freeride", "#E58A00", "#7A8590"]] } }, firstSymbol());
    map.addSource("aval", { type: "geojson", data: fc });
    map.addLayer({ id: "aval_fill", type: "fill", source: "aval", layout: { visibility: "none" },
      paint: { "fill-color": ["match", ["get", "lvl"], 1, AVAL[1], 2, AVAL[2], 3, AVAL[3], 4, AVAL[4], 5, AVAL[5], "rgba(0,0,0,0)"], "fill-opacity": 0.45 } }, "pistes");
    map.addLayer({ id: "aval_line", type: "line", source: "aval", layout: { visibility: "none" }, paint: { "line-color": "rgba(11,18,32,.35)", "line-width": 0.6 } }, "pistes");
    map.addSource("pt", { type: "geojson", data: fc });
    map.addLayer({ id: "pt", type: "circle", source: "pt", paint: { "circle-radius": 7, "circle-color": "#0B1220", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
    // zoomed out: the best places to ski today (top 5 per region), ranked badges, tap -> resort panel
    map.addSource("best", { type: "geojson", data: fc });
    map.addLayer({ id: "best", type: "circle", source: "best", maxzoom: 7,
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 7, 6, 11], "circle-color": ["case", [">=", ["get", "nw"], 5], "#1463F3", "#0B1220"],
        "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    map.addLayer({ id: "best_lbl", type: "symbol", source: "best", maxzoom: 7,
      layout: { "text-field": ["concat", ["get", "rk"], ""], "text-size": 11, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true },
      paint: { "text-color": "#fff" } });
    map.addLayer({ id: "best_name", type: "symbol", source: "best", minzoom: 4, maxzoom: 7,
      layout: { "text-field": ["get", "t"], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-offset": [0, 1.2], "text-anchor": "top", "text-optional": true },
      paint: { "text-color": "#0B1220", "text-halo-color": "#fff", "text-halo-width": 1.8 } });
    for (const id of ["best", "best_lbl", "best_name"]) {
      map.on("click", id, (e) => { const f = e.features && e.features[0]; if (f) { st.stayClick = Date.now(); openResort(f.properties.s); } });
      map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
    }
    // measured snow at stations (free, static snow/stations.json): depth-coloured pill badges "42 cm" with the station
    // name + elevation under them from z8.5, 50 km clusters (max depth, count) at z5-8, the 10 deepest per region
    // below z5, a "+12" chip for >= 5 cm since yesterday. Added before the resort pins so resort labels win collisions.
    pillImages();
    map.addSource("stn", { type: "geojson", data: fc, cluster: true, clusterRadius: 46, clusterMaxZoom: 7,
      clusterProperties: { max: ["max", ["get", "d"]] } });
    map.addSource("stn_top", { type: "geojson", data: fc });
    map.addSource("stn_hi", { type: "geojson", data: fc });
    map.addSource("pt_line", { type: "geojson", data: fc });
    const svis = { visibility: st.over.stn ? "visible" : "none" };
    const nameText = ["format", ["get", "nu"], { "font-scale": 0.9, "text-font": ["literal", ["Noto Sans Bold"]] }, "\n", {}, ["get", "el"], { "font-scale": 0.86, "text-color": "#8A94A6" }];
    // the badge ("42 cm" in a depth-coloured pill) is the icon, the name + elevation the optional text: a station
    // without room for its badge is dropped whole, a badge without room for its name keeps the badge
    const badge = (id, src, min, max, dField, filter, text) => map.addLayer({ id, type: "symbol", source: src, minzoom: min, maxzoom: max, ...(filter ? { filter } : {}),
      layout: { ...svis, "icon-image": badgeExpr(dField), "icon-anchor": "center", "text-field": text, "text-size": 11.5, "text-font": ["Noto Sans Regular"], "text-anchor": "top",
        "text-offset": [0, 1.25], "text-optional": true, "text-max-width": 9, "text-letter-spacing": 0.05, "text-padding": 1, "symbol-sort-key": ["-", 2000, ["get", dField]] },
      paint: { "text-color": "#4B5563", "text-halo-color": "#ffffff", "text-halo-width": 1.4 } });
    badge("stn_top", "stn_top", 0, 5, "d", null, nameText);
    badge("stn_cl", "stn", 5, 8.5, "max", ["all", ["has", "point_count"], [">=", ["get", "max"], 1]], ["concat", "× ", ["get", "point_count"]]);
    badge("stn_badge", "stn", 5, 24, "d", ["all", ["!", ["has", "point_count"]], [">=", ["get", "d"], 1]], nameText);
    map.setLayoutProperty("stn_badge", "text-field", ["step", ["zoom"], "", 8.5, nameText]);
    map.addLayer({ id: "stn_new", type: "symbol", source: "stn", minzoom: 8, filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "n2"], 5]],
      layout: { ...svis, "icon-image": "pill_new", "icon-text-fit": "both", "icon-text-fit-padding": [0, 3, 0, 3], "text-field": ["concat", "+", ["get", "n2s"]], "text-font": ["Noto Sans Bold"], "text-size": 10,
        "text-offset": [1.3, -1.5], "text-anchor": "bottom-left", "icon-allow-overlap": true, "text-allow-overlap": true, "icon-ignore-placement": true, "text-ignore-placement": true },
      paint: { "text-color": "#ffffff" } });
    map.addLayer({ id: "pt_line", type: "line", source: "pt_line", paint: { "line-color": "#1463F3", "line-width": 1.6, "line-dasharray": [2, 2] } });
    map.addLayer({ id: "stn_hi", type: "circle", source: "stn_hi", paint: { "circle-radius": 20, "circle-color": "rgba(20,99,243,.12)", "circle-stroke-color": "#1463F3", "circle-stroke-width": 2.5 } });
    for (const id of ["stn_badge", "stn_top"]) {
      map.on("click", id, (e) => { const f = e.features && e.features[0]; if (!f) return; st.stayClick = Date.now(); stnCard(f.properties.i, false); });
      map.on("mouseenter", id, (e) => { map.getCanvas().style.cursor = "pointer"; const f = e.features && e.features[0]; if (f && matchMedia("(hover:hover)").matches && !popupPinned) stnCard(f.properties.i, true); });
      map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; if (popup && popupHover) { popup.remove(); popup = null; } });
    }
    map.on("click", "stn_cl", (e) => { const f = e.features && e.features[0]; if (!f) return; st.stayClick = Date.now(); map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(map.getZoom() + 2.5, 10), duration: 700 }); });
    map.on("mouseenter", "stn_cl", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "stn_cl", () => { map.getCanvas().style.cursor = ""; });
    map.addSource("stays", { type: "geojson", data: fc });
    // "BOOK" chip under each resort label from zoom 10 (Stay22, dates = the selected day); collides like labels
    map.addLayer({ id: "stays", type: "symbol", source: "stays", minzoom: 10.5,
      layout: { "text-field": "BOOK", "text-size": 10.5, "text-offset": [0, 3.2], "text-anchor": "top", "text-letter-spacing": 0.08,
        "text-allow-overlap": true, "text-ignore-placement": true,
        "text-font": ["Noto Sans Bold"] },
      paint: { "text-color": "#fff", "text-halo-color": "#1463F3", "text-halo-width": 3.5 } });
    map.on("click", "stays", (e) => {
      const f = e.features && e.features[0]; if (!f) return;
      st.stayClick = Date.now();
      // BOOK chip -> the resort panel with "Stays near the slopes" open (owner 2026-11-02), the old popup as fallback
      if (f.properties.s && BY[f.properties.s] && stayModule(0, 0, "", "x")) { st.openStays = true; openResort(f.properties.s); if (innerWidth <= 760) setSheet("full"); return; }
      const [lon, lat] = f.geometry.coordinates, n = f.properties.n, u = stayHref(lat, lon, n, "mappin");
      const other = stayMapHref(lat, lon, n);
      if (!u) return;
      if (popup) popup.remove();
      popup = new LIB.Popup({ closeButton: true, maxWidth: "260px", offset: 14 }).setLngLat([lon, lat]).setHTML('<div class="pv staycard"><span class="k">' +
        esc(I18N.t("Stays near") + " " + n) + ' · <span class="partner">Partner</span></span><div class="line">' + esc(D(st.day > DATA.today ? st.day : DATA.today).toLocaleDateString(LOC, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })) +
        '</div><div class="acts3" style="margin-top:8px"><a class="btn ink" target="_blank" rel="sponsored noopener" href="' + esc(u) + '">' + esc(I18N.t("Book")) + "</a>" +
        (other ? '<a class="btn tonal" target="_blank" rel="sponsored noopener" href="' + esc(other) + '">' + esc(I18N.t("See other deals")) + "</a>" : "") + "</div></div>").addTo(map);
    });
    // resort pins: a value chip ("42 cm" with the depth colour as a dot) on a pointer, sized by the resort's size (km of
    // pistes) and placed in that order so the big resorts win collisions; the name under it only when there is room;
    // "+N" chip for fresh snow; a soft halo under the hovered pin; dark / light chip follows the page theme
    map.addSource("pins", { type: "geojson", data: fc });
    map.addSource("pin_hover", { type: "geojson", data: fc });
    map.addLayer({ id: "pin_halo", type: "circle", source: "pin_hover", paint: { "circle-radius": 26, "circle-color": "rgba(20,99,243,.14)", "circle-blur": 0.6 } });
    map.addLayer({ id: "pins", type: "circle", source: "pins", minzoom: 7, filter: ["!", ["has", "v"]],
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 10, 4.5], "circle-color": "#0B1220", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5, "circle-opacity": 0.7 } });
    map.addLayer({ id: "pin_lbl", type: "symbol", source: "pins", minzoom: 10, filter: ["!", ["has", "v"]],
      layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Regular"], "text-size": 11.5, "text-offset": [0, 0.9], "text-anchor": "top", "text-optional": true },
      paint: { "text-color": "#4B5563", "text-halo-color": "#fff", "text-halo-width": 1.4 } });
    map.addLayer({ id: "pin_chip", type: "symbol", source: "pins", minzoom: 7, filter: ["has", "v"],
      layout: { "icon-image": ["concat", "pin", ["get", "th"], "_", ["to-string", ["get", "v"]]], "icon-anchor": "bottom", "icon-padding": 1,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, ["*", 0.6, ["get", "sz"]], 10, ["*", 0.86, ["get", "sz"]], 13, ["get", "sz"]],
        "symbol-sort-key": ["-", 100000, ["get", "km"]], "text-field": ["step", ["zoom"], "", 9.5, ["get", "n"]], "text-font": ["Noto Sans Bold"], "text-size": 12,
        "text-anchor": "top", "text-offset": [0, 0.35], "text-optional": true, "text-max-width": 9, "text-letter-spacing": 0.02 },
      paint: { "text-color": "#0B1220", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
    map.addLayer({ id: "pin_new", type: "symbol", source: "pins", minzoom: 8, filter: ["all", ["has", "v"], [">=", ["get", "nw"], 3]],
      layout: { "icon-image": "pill_new", "icon-text-fit": "both", "icon-text-fit-padding": [0, 3, 0, 3], "text-field": ["concat", "+", ["get", "nws"]], "text-font": ["Noto Sans Bold"], "text-size": 10,
        "text-offset": [1.4, -3.4], "text-anchor": "bottom-left", "icon-allow-overlap": true, "text-allow-overlap": true, "icon-ignore-placement": true, "text-ignore-placement": true },
      paint: { "text-color": "#ffffff" } });
    for (const id of ["pins", "pin_lbl", "pin_chip"]) {
      map.on("mouseenter", id, (e) => { map.getCanvas().style.cursor = "pointer"; const f = e.features && e.features[0]; if (f) map.getSource("pin_hover").setData(f); });
      map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; map.getSource("pin_hover").setData(fc); });
    }
    // powder bubbles (map mode "New snow"): sized and coloured by the fresh snow, the number inside, top 3 with a glow
    map.addSource("pow", { type: "geojson", data: fc });
    map.addLayer({ id: "pow", type: "symbol", source: "pow", minzoom: 4,
      layout: { "icon-image": ["concat", "pw", ["case", ["<=", ["get", "rk"], 3], "g", ""], U.us() ? "u" : "", "_", ["to-string", ["get", "n"]]], "icon-size": ["interpolate", ["linear"], ["zoom"], 4, ["*", 0.7, ["interpolate", ["linear"], ["get", "n"], 1, 0.8, 30, 1, 80, 1.2]], 8, ["*", 0.9, ["interpolate", ["linear"], ["get", "n"], 1, 0.8, 30, 1, 80, 1.2]], 12, ["interpolate", ["linear"], ["get", "n"], 1, 0.8, 30, 1, 80, 1.2]],
        "symbol-sort-key": ["-", 1000, ["get", "n"]], "text-field": ["step", ["zoom"], "", 8, ["get", "t"]], "text-font": ["Noto Sans Bold"], "text-size": 11.5, "text-anchor": "top", "text-offset": [0, 1.9], "text-optional": true, "text-max-width": 9 },
      paint: { "text-color": "#0B1220", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
    map.on("click", "pow", (e) => { const f = e.features && e.features[0]; if (f) { st.stayClick = Date.now(); openResort(f.properties.s); } });
    map.on("mouseenter", "pow", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "pow", () => { map.getCanvas().style.cursor = ""; });
  }
  // pin / bubble images (2x), one per value and theme, drawn on demand
  const PINS = new Set();
  const isDarkTheme = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  function pinImage(v, th) {
    const id = "pin" + th + "_" + v;
    if (PINS.has(id) || !map) return;
    const c = document.createElement("canvas"), g = c.getContext("2d"), dark = th[0] === "d", vs = U.dep(v), un = U.du();
    g.font = "600 24px Inter, system-ui, sans-serif"; const tw = Math.ceil(g.measureText(vs).width);
    g.font = "500 16px Inter, system-ui, sans-serif"; const uw = Math.ceil(g.measureText(un).width);
    const W = 16 + 12 + 8 + tw + 4 + uw + 16 + 8, H = 44 + 10 + 10, R = 16; c.width = W; c.height = H;
    g.shadowColor = "rgba(11,18,32,.28)"; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.fillStyle = dark ? "#F4F6FA" : "#0B1220"; roundRect(g, 4, 2, W - 8, 44, R); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 7, 45); g.lineTo(W / 2 + 7, 45); g.lineTo(W / 2, 54); g.closePath(); g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = depthCol(v); g.beginPath(); g.arc(4 + 16 + 6, 24, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.5; g.stroke();
    g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = dark ? "#0B1220" : "#ffffff";
    g.font = "600 24px Inter, system-ui, sans-serif"; g.fillText(vs, 4 + 16 + 12 + 8, 25);
    g.fillStyle = dark ? "#5B6473" : "#B8C0CC"; g.font = "500 16px Inter, system-ui, sans-serif"; g.fillText(un, 4 + 16 + 12 + 8 + tw + 4, 26);
    map.addImage(id, g.getImageData(0, 0, W, H), { pixelRatio: 2 });
    PINS.add(id);
  }
  function bubbleImage(n, glow) {
    const id = "pw" + (glow ? "g" : "") + (U.us() ? "u" : "") + "_" + n;
    if (PINS.has(id) || !map) return;
    const c = document.createElement("canvas"), g = c.getContext("2d"), S = 72, pad = glow ? 14 : 6, W = S + pad * 2; c.width = c.height = W;
    const col = rampAt(NEW, n);
    if (glow) { g.shadowColor = "rgba(" + col.join(",") + ",.75)"; g.shadowBlur = 16; }
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(W / 2, W / 2, S / 2, 0, Math.PI * 2); g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = "rgb(" + col.join(",") + ")"; g.beginPath(); g.arc(W / 2, W / 2, S / 2 - 2.5, 0, Math.PI * 2); g.fill();
    g.textBaseline = "middle"; g.textAlign = "center"; g.fillStyle = n >= 20 ? "#ffffff" : "#0B1220";
    g.font = "700 24px Inter, system-ui, sans-serif"; g.fillText("+" + U.dep(n), W / 2, W / 2 + 1);
    map.addImage(id, g.getImageData(0, 0, W, W), { pixelRatio: 2 });
    PINS.add(id);
  }
  // ------------------------------------------------------------------ measured snow at stations
  // snow/stations.json rows [lat, lon, name, elev_m, depth_cm, time_utc, network, url, new_cm]; stations_hist.json 14-day series
  let stnLoad = null, histLoad = null, popupHover = false, popupPinned = false;
  const STN_LAYERS = ["stn_top", "stn_cl", "stn_badge", "stn_new"];
  function loadStations() {
    if (!stnLoad) stnLoad = SS.getJSON(BASE + "snow/stations.json?v=" + DATA.digest).catch(() => ({ rows: [] })).then((j) => { st.stations = j; refreshStations(); fillMeasured(); return j; });
    return stnLoad;
  }
  function loadHist() {
    if (!histLoad) histLoad = SS.getJSON(BASE + "snow/stations_hist.json?v=" + DATA.digest).catch(() => ({ dates: [], rows: [] })).then((j) => { st.stnHist = j; return j; });
    return histLoad;
  }
  const depthCol = (v) => "rgb(" + rampAt(depthStops(), v).join(",") + ")";
  // badge images: "42 cm" baked into a depth-coloured pill (8 px radius, 1.2 px white rim), one image per depth value
  // and colour scale ("b<scale>_<cm>"); the "+12" new-snow chip is a stretchable plain pill
  const BADGES = new Set();
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function pillImages() {
    if (map.hasImage("pill_new")) return;
    const W = 72, H = 56, R = 16, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    g.fillStyle = "#fff"; roundRect(g, 6, 6, W - 12, H - 12, R + 2.5); g.fill(); g.fillStyle = "#1463F3"; roundRect(g, 8.5, 8.5, W - 17, H - 17, R); g.fill();
    map.addImage("pill_new", g.getImageData(0, 0, W, H), { pixelRatio: 2, stretchX: [[R + 8, W - R - 8]], stretchY: [[R + 8, H - R - 8]], content: [10, 10, W - 10, H - 10] });
    BADGES.clear();
  }
  const badgeKey = () => "b" + st.scale + (U.us() ? "u" : "") + "_";
  function badgeImage(d) {
    const id = badgeKey() + d;
    if (BADGES.has(id) || !map) return;
    const c = document.createElement("canvas"), g = c.getContext("2d"), txt = U.depth(d);
    g.font = "600 26px Inter, system-ui, sans-serif";
    const tw = Math.ceil(g.measureText(txt).width), W = tw + 36, H = 50, R = 16;
    c.width = W; c.height = H; g.font = "600 26px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#fff"; roundRect(g, 1, 1, W - 2, H - 2, R + 2.5); g.fill();
    g.fillStyle = depthCol(d); roundRect(g, 3.4, 3.4, W - 6.8, H - 6.8, R); g.fill();
    g.fillStyle = d < depthStops()[3][0] ? "#0B1220" : "#ffffff"; g.fillText(txt, W / 2, H / 2 + 1);
    map.addImage(id, g.getImageData(0, 0, W, H), { pixelRatio: 2 });
    BADGES.add(id);
  }
  const badgeExpr = (field) => ["concat", badgeKey(), ["to-string", ["get", field]]];
  function stnRecolour() {
    if (!ready || !map.getLayer("stn_badge") || !st.stations) return;
    for (const r of st.stations.rows) badgeImage(r[4]);
    for (const [id, f] of [["stn_top", "d"], ["stn_cl", "max"], ["stn_badge", "d"]]) map.setLayoutProperty(id, "icon-image", badgeExpr(f));
  }
  const inBox = (c, lat, lon) => lon >= c[0][0] && lon <= c[1][0] && lat <= c[0][1] && lat >= c[2][1];
  async function drawStations() {
    if (!ready || !map.getSource("stn")) return;
    const j = await loadStations();
    pillImages();
    for (const r of j.rows) badgeImage(r[4]);
    const feat = (r, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r[1], r[0]] },
      properties: { i, n: r[2], nu: r[2].toUpperCase(), e: r[3] || 0, el: r[3] ? U.elev(r[3]) : "", d: r[4], tm: r[5], u: r[7] || "", n2: r[8] || 0, n2s: U.dep(r[8] || 0) } });
    map.getSource("stn").setData({ type: "FeatureCollection", features: j.rows.map(feat) });
    const top = [];
    for (const r of DATA.regions) {
      const c = r.coords; if (!c) continue;
      top.push(...j.rows.map((x, i) => [x, i]).filter(([x]) => inBox(c, x[0], x[1])).sort((p, q) => q[0][4] - p[0][4]).slice(0, 10).map(([x, i]) => feat(x, i)));
    }
    map.getSource("stn_top").setData({ type: "FeatureCollection", features: top });
    for (const id of STN_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", st.over.stn ? "visible" : "none");
    refreshStations();
  }
  const stnTime = (tm) => { const t = new Date(tm); return isNaN(t) ? "" : (tm.slice(0, 10) === DATA.today ? t.toLocaleTimeString(LOC, { hour: "2-digit", minute: "2-digit" }) : t.toLocaleDateString(LOC, { day: "numeric", month: "short" })); };
  const newChip = (n) => (n >= 1 ? '<em class="nw"><span class="ms">arrow_upward</span>+' + U.dep(n) + "</em>" : "");
  function sparkline(i) {        // 14-day depth of one station (from stations_hist.json)
    const h = st.stnHist; if (!h || !h.rows[i]) return "";
    const v = h.rows[i], W = 220, H = 44, n = v.length, max = Math.max(5, ...v.filter((x) => x != null));
    const X = (k) => (n > 1 ? (k / (n - 1)) * (W - 8) + 4 : W / 2), Y = (x) => H - 4 - (x / max) * (H - 12);
    let d = "", pen = false, last = null;
    v.forEach((x, k) => { if (x == null) { pen = false; return; } d += (pen ? "L" : "M") + X(k).toFixed(1) + "," + Y(x).toFixed(1); pen = true; last = k; });
    if (!d) return "";
    return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>' +
      (last != null ? '<circle cx="' + X(last) + '" cy="' + Y(v[last]) + '" r="3" fill="var(--ink)"/>' : "") +
      '<text x="' + (W - 2) + '" y="10" text-anchor="end" class="lbl">' + U.depth(max) + "</text></svg>" +
      '<div class="line" style="font-size:11.5px">' + esc(I18N.t("Last {a} days").replace("{a}", n)) + "</div>";
  }
  function stnCardHtml(i) {
    const r = st.stations.rows[i];
    return '<div class="pv stn"><span class="k">' + esc(I18N.t("Measured")) + " · " + esc(stnTime(r[5])) + '</span>' +
      '<div class="stnhead"><i class="chip" style="background:' + depthCol(r[4]) + '"></i><b class="dep">' + cmS(r[4]) + "</b>" + newChip(r[8]) + "</div>" +
      '<div class="stnname">' + esc(r[2]) + "</div>" + (r[3] ? '<div class="line light">' + U.elev(r[3]) + "</div>" : "") +
      '<div id="stnSpark">' + sparkline(i) + "</div>" +
      (r[7] ? '<a class="near" href="' + esc(r[7]) + '" target="_blank" rel="noopener">' + esc(I18N.t("Station page")) + "</a>" : "") + "</div>";
  }
  function stnCard(i, hover) {   // hover card (desktop) or pinned card (tap / table row)
    const r = st.stations && st.stations.rows[i]; if (!r) return;
    if (popup) popup.remove();
    popupHover = !!hover; popupPinned = !hover;
    popup = new LIB.Popup({ closeButton: !hover, closeOnClick: !hover, maxWidth: "280px", offset: 16, className: hover ? "hovercard" : "" }).setLngLat([r[1], r[0]]).setHTML(stnCardHtml(i)).addTo(map);
    popup.on("close", () => { popupPinned = false; popupHover = false; });
    if (!st.stnHist) loadHist().then(() => { const e = $("stnSpark"); if (e && popup) e.innerHTML = sparkline(i); });
  }
  // the stations in view as a table in the panel (desktop) / bottom sheet (phone): deepest first, a row flies there
  function stationsHtml(hideEmpty) {
    if (!st.over.stn) return "";
    if (hideEmpty !== undefined) st.stnHideEmpty = !!hideEmpty;
    if (!st.stations) { loadStations(); return '<div id="stnbox"></div>'; }
    const b = map.getBounds();
    const rows = st.stations.rows.map((r, i) => [r, i]).filter(([r]) => r[0] >= b.getSouth() && r[0] <= b.getNorth() && r[1] >= b.getWest() && r[1] <= b.getEast())
      .sort((a, c) => c[0][4] - a[0][4]);
    let h = '<div id="stnbox"><h2 class="h2">Measured snow in view</h2>';
    if (!rows.length) return st.stnHideEmpty ? '<div id="stnbox"></div>' : h + '<p class="none">No measuring station in this view.</p></div>';
    const t = rows[0][0];
    h += '<div class="stntop"><div><div class="over">Deepest measured</div><b>' + esc(t[2]) + '</b><small>' + (t[3] ? U.elev(t[3]) + " · " : "") + esc(stnTime(t[5])) + "</small></div>" +
      '<span class="val" data-stn="' + rows[0][1] + '"><i class="chip" style="background:' + depthCol(t[4]) + '"></i><b>' + cmS(t[4]) + "</b>" + newChip(t[8]) + "</span></div>" +
      '<div class="mini" role="group" aria-label="Map layers"><button data-monly aria-pressed="' + st.monly + '"><span class="ms">sensors</span>Measured only</button></div>';
    h += '<table class="fc stn"><thead><tr><th>Station</th><th>Elev.</th><th>Depth</th><th>New</th><th>Time</th><th></th></tr></thead><tbody>' +
      rows.slice(0, 30).map(([r, i]) => '<tr data-stn="' + i + '"><td class="nm" title="' + esc(r[2]) + '"><i class="chip" style="background:' + depthCol(r[4]) + '"></i>' + esc(r[2]) + "</td><td>" + (r[3] ? U.elev(r[3]) : "–") + "</td><td><b>" + U.dep(r[4]) + "</b> " + U.du() + "</td><td>" +
        (newChip(r[8]) || "–") + "</td><td>" + esc(stnTime(r[5])) + "</td><td>" +
        (r[7] ? '<a href="' + esc(r[7]) + '" target="_blank" rel="noopener" title="Station page" data-stop><span class="ms">open_in_new</span></a>' : "") + "</td></tr>").join("") +
      "</tbody></table>" + (rows.length > 30 ? '<p class="none">' + esc(I18N.t("Showing the 30 deepest of {a} stations in view").replace("{a}", rows.length)) + "</p>" : "");
    return h + "</div>";
  }
  function bindStations(box) {
    box.querySelectorAll("[data-stn]").forEach((tr) => { tr.onclick = (e) => {
      if (e.target.closest("[data-stop]")) return;
      const r = st.stations.rows[+tr.dataset.stn]; if (!r) return;
      st.stayClick = Date.now();
      map.flyTo({ center: [r[1], r[0]], zoom: Math.max(map.getZoom(), 11), duration: 900 });
      stnCard(+tr.dataset.stn, false);
      if (innerWidth <= 760) setSheet("peek");
    }; });
    box.querySelectorAll("[data-stnfly]").forEach((el) => { el.onclick = () => { const r = st.stations.rows[+el.dataset.stnfly]; if (!r) return; map.flyTo({ center: [r[1], r[0]], zoom: Math.max(map.getZoom(), 11), duration: 900 }); stnCard(+el.dataset.stnfly, false); }; });
    const mo = box.querySelector("[data-monly]");
    if (mo) mo.onclick = () => { st.monly = !st.monly; store.set("ss_monly", st.monly ? 1 : 0); mo.setAttribute("aria-pressed", st.monly); renderMain(); };
  }
  function refreshStations() {           // on map move: only the table section is rewritten (no panel flicker)
    const box = $("stnbox");
    if (!box || st.slug || st.tab !== "map" || !map) return;
    const h = stationsHtml();
    if (!h) { box.remove(); return; }
    box.outerHTML = h;
    bindStations($("pbody"));
  }
  // nearest measuring station to a modelled value: within 25 km and 36 h; when two are within 5 km of each other the one
  // in the same elevation band (± 400 m) wins
  const kmLL = (a1, o1, a2, o2) => { const q = Math.sin((a2 - a1) * Math.PI / 360) ** 2 + Math.cos(a1 * Math.PI / 180) * Math.cos(a2 * Math.PI / 180) * Math.sin((o2 - o1) * Math.PI / 360) ** 2; return 12742 * Math.asin(Math.sqrt(q)); };
  function nearestStation(lat, lon, refElev) {
    if (!st.stations) return undefined;
    const fresh = Date.now() - 36 * 3600e3, c = [];
    st.stations.rows.forEach((r, i) => {
      if (Math.abs(r[0] - lat) > 0.25 || Math.abs(r[1] - lon) > 0.4) return;
      const t = Date.parse(r[5]); if (isNaN(t) || t < fresh) return;
      const km = kmLL(lat, lon, r[0], r[1]); if (km <= 25) c.push({ r, i, km });
    });
    if (!c.length) return null;
    c.sort((a, b) => a.km - b.km);
    let best = c[0];
    if (refElev != null && c.length > 1 && c[1].km - c[0].km <= 5 && c[0].r[3] && c[1].r[3] && Math.abs(c[0].r[3] - refElev) > 400 && Math.abs(c[1].r[3] - refElev) <= 400) best = c[1];
    return best;
  }
  const kmText = (km) => U.dist(km) + " away";
  function measuredHtml(lat, lon, refElev, short) {
    const n = nearestStation(lat, lon, refElev);
    if (n === undefined) return '<p class="measured" data-measured="' + lat + "," + lon + "," + (refElev == null ? "" : refElev) + "," + (short ? 1 : 0) + '"></p>';
    if (!n) return '<p class="measured none">' + esc(I18N.tu("No measurement within {a} km", U.kmN(25))) + "</p>";
    const r = n.r, dE = refElev != null && r[3] ? Math.round((r[3] - refElev) / 10) * 10 : null;
    return '<p class="measured" data-stnfly="' + n.i + '"><span class="k">Measured nearby</span> <i class="chip" style="background:' + depthCol(r[4]) + '"></i><b>' + esc(r[2]) + " " + U.depth(r[4]) + "</b>" +
      (short ? " · " + kmText(n.km) : " · " + (r[3] ? U.elev(r[3]) + " · " : "") + kmText(n.km) + " · " + esc(stnTime(r[5])) +
        (dE != null && Math.abs(dE) >= 50 ? " · " + esc(I18N.tu(dE > 0 ? "{a} m higher" : "{a} m lower", U.ev(Math.abs(dE)))) : "")) + "</p>";
  }
  function fillMeasured() {              // placeholders written before stations.json had arrived
    document.querySelectorAll("[data-measured]").forEach((el) => { const [la, lo, e, sh] = el.dataset.measured.split(","); el.outerHTML = measuredHtml(+la, +lo, e === "" ? null : +e, sh === "1"); });
    bindStations($("pbody"));
  }
  function showMeasuredLink(pt, n) {     // tapped point -> dashed line to its nearest station + highlighted badge
    if (!map || !map.getSource("pt_line")) return;
    const r = n && n.r;
    map.getSource("pt_line").setData(r ? { type: "Feature", geometry: { type: "LineString", coordinates: [[pt.lon, pt.lat], [r[1], r[0]]] } } : { type: "FeatureCollection", features: [] });
    map.getSource("stn_hi").setData(r ? { type: "Feature", geometry: { type: "Point", coordinates: [r[1], r[0]] } } : { type: "FeatureCollection", features: [] });
  }
  const DEMC = new Map();
  async function elevAt(lat, lon) {      // ground height from the relief tiles (one 256 px tile, cached)
    const z = 11, n = 2 ** z, x = Math.floor((lon + 180) / 360 * n), yf = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n, y = Math.floor(yf), key = x + "/" + y;
    if (!DEMC.has(key)) DEMC.set(key, new Promise((ok) => { const im = new Image(); im.crossOrigin = "anonymous";
      im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.drawImage(im, 0, 0); ok(g.getImageData(0, 0, 256, 256).data); };
      im.onerror = () => ok(null); im.src = DEM.tiles[0].replace("{z}", z).replace("{x}", x).replace("{y}", y); }));
    const d = await DEMC.get(key); if (!d) return null;
    const px = Math.min(255, Math.floor(((lon + 180) / 360 * n - x) * 256)), py = Math.min(255, Math.floor((yf - y) * 256)), i = (py * 256 + px) * 4;
    return Math.round(d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768);
  }
  async function drawBest() {
    if (!ready || !map.getSource("best")) return;
    const feats = [];
    for (const r of DATA.regions) {
      const d = r.days.find((y) => y.date === st.day) || r.days.find((y) => y.date === DATA.today);
      (d ? d.top.slice(0, 5) : []).forEach((t, i) => {
        const x = BY[t.slug]; if (!x) return;
        feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [x.lon, x.lat] }, properties: { s: t.slug, rk: i + 1, nw: t.new_cm || 0,
          t: t.name + " · " + U.depth(t.depth_cm) + (t.new_cm >= 1 ? " +" + U.dep(t.new_cm) : "") } });
      });
    }
    map.getSource("best").setData({ type: "FeatureCollection", features: feats });
  }
  async function drawStays() {
    if (!ready || !map.getSource("stays")) return;
    const res = await RES.catch(() => null);
    const on = st.over.stays && !SS.staysHidden() && res && map.getZoom() >= 10;
    // owner rule: never more than one stay chip on screen -> the resort nearest the centre of the view
    let best = null;
    if (on) {
      const c = map.getCenter(), b = map.getBounds(), k = Math.cos(c.lat * Math.PI / 180);
      let bd = 1e9;
      for (const x of res.rows) {
        if (x.lon < b.getWest() || x.lon > b.getEast() || x.lat < b.getSouth() || x.lat > b.getNorth()) continue;
        const d = Math.hypot((x.lon - c.lng) * k, x.lat - c.lat);
        if (d < bd) { bd = d; best = x; }
      }
    }
    map.getSource("stays").setData({ type: "FeatureCollection", features: best ? [{ type: "Feature",
      geometry: { type: "Point", coordinates: [best.lon, best.lat] }, properties: { n: best.short, s: best.slug } }] : [] });
  }
  async function drawPins() {
    if (!ready || !map.getSource("pins")) return;
    const res = await RES.catch(() => null);
    if (!res) return;
    const i = res.dates.indexOf(st.day), th = (isDarkTheme() ? "d" : "l") + (U.us() ? "u" : ""), on = st.over.pins && st.main !== "powder";
    if (map.hasImage && !map.hasImage("pill_new")) pillImages();
    const feats = on ? res.rows.map((x) => {
      const v = i >= 0 && x.snow[i] ? x.snow[i][0] : null, nw = i >= 0 && x.snow[i] ? x.snow[i][1] || 0 : 0;
      const pr = { s: x.slug, n: x.short, km: x.km || 0, sz: x.km >= 100 ? 1 : x.km >= 30 ? 0.9 : 0.8, nw, nws: U.dep(nw), th };
      if (v) { pr.v = v; pinImage(v, th); }
      return { type: "Feature", geometry: { type: "Point", coordinates: [x.lon, x.lat] }, properties: pr };
    }) : [];
    map.getSource("pins").setData({ type: "FeatureCollection", features: feats });
    drawPowder(res);
  }
  function drawPowder(res) {        // map mode "New snow": bubbles for every resort with fresh snow on the selected day
    if (!ready || !map.getSource("pow") || !res) return;
    const i = res.dates.indexOf(st.day), k = p72on() ? 2 : 1;
    const rows = st.main === "powder" && i >= 0 ? res.rows.filter((x) => x.snow[i] && x.snow[i][k] >= 1).sort((a, b) => b.snow[i][k] - a.snow[i][k]) : [];
    for (const id of ["best", "best_lbl", "best_name"]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", st.main === "powder" ? "none" : "visible");
    map.getSource("pow").setData({ type: "FeatureCollection", features: rows.map((x, rk) => {
      const n = x.snow[i][k]; bubbleImage(n, rk < 3);
      return { type: "Feature", geometry: { type: "Point", coordinates: [x.lon, x.lat] }, properties: { s: x.slug, n, rk: rk + 1, t: x.short } };
    }) });
  }
  const themeWatch = new MutationObserver(() => { if (ready) drawPins(); });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (ready) drawPins(); });
  function applyOverlays(quiet) {
    const vis = (on) => (on ? "visible" : "none");
    map.setLayoutProperty("pistes", "visibility", vis(st.over.pistes));
    map.setLayoutProperty("aval_fill", "visibility", vis(st.over.aval));
    map.setLayoutProperty("aval_line", "visibility", vis(st.over.aval));
    if (st.over.pistes) { if (map.getZoom() < 9 && !quiet) toast("Zoom in to see pistes and lifts"); st.pistes.loaded.clear(); st.pistes.feats = []; st.pistes.gen = (st.pistes.gen || 0) + 1; loadPistes(); }
    if (st.over.aval) loadAval(quiet);
  }
  // pistes: 0.5 degree GeoJSON tiles from the API, loaded for the view from z9 (on toggle, on every moveend and once
  // after the start view: a shared link / remembered choice switches them on while the map still sits at z5).
  // A failed tile is retried (3 times, 4 s apart) instead of waiting for the next pan.
  async function loadPistes(retry = 0) {
    if (!map || !ready || !st.over.pistes || !map.getSource("pistes") || map.getZoom() < 9) return;
    const gen = st.pistes.gen;
    try { if (!st.pistes.idx) st.pistes.idx = (await SS.api("/v1/pistes/index", { auth: false, timeout: 20000 })).tiles || []; }
    catch {
      if (retry < 3) { clearTimeout(st.pistes.rt); st.pistes.rt = setTimeout(() => loadPistes(retry + 1), 4000); }
      else toast("Pistes are updating, try again in a minute.");
      return;
    }
    const b = map.getBounds();
    const hit = st.pistes.idx.filter((t) => !(t.e < b.getWest() || t.w > b.getEast() || t.n < b.getSouth() || t.s > b.getNorth()) && !st.pistes.loaded.has(t.id)).slice(0, 12);
    if (!hit.length) return;
    let failed = 0;
    await Promise.all(hit.map(async (t) => {
      st.pistes.loaded.add(t.id);
      try {
        const g = await SS.api("/v1/pistes/" + encodeURIComponent(t.id) + ".geojson", { auth: false, timeout: 25000 });
        if (gen === st.pistes.gen) st.pistes.feats.push(...(g.features || []));
      } catch { st.pistes.loaded.delete(t.id); failed++; }
    }));
    if (gen !== st.pistes.gen || !map.getSource("pistes")) return;     // switched off / style reloaded meanwhile
    map.getSource("pistes").setData({ type: "FeatureCollection", features: st.pistes.feats });
    if (failed && retry < 3) { clearTimeout(st.pistes.rt); st.pistes.rt = setTimeout(() => loadPistes(retry + 1), 4000); }
  }
  async function loadAval(quiet) {
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
    if (!n && !quiet) toast("No avalanche levels published for this day yet");
  }

  // ------------------------------------------------------------------ tap: the value under the finger
  function regionAt(ll) {
    return DATA.regions.find((r) => { const L = r.lattice; return ll.lng >= L.west && ll.lng < L.west + L.nx * L.dlon && ll.lat <= L.north && ll.lat > L.north - L.ny * L.dlat; });
  }
  async function codeAt(r, p, ll, date = st.day, fineZoom = map && map.getZoom() >= 7) {
    const d = r.days.find((x) => x.date === date);
    if (!d) return null;
    const pick = async (url, n, s, w, e) => {
      const cd = await codesOf(url);
      if (!cd) return null;
      const row = Math.floor((mercY(n) - mercY(ll.lat)) / (mercY(n) - mercY(s)) * cd.h), col = Math.floor((ll.lng - w) / (e - w) * cd.w);
      return row >= 0 && row < cd.h && col >= 0 && col < cd.w ? cd.c[row * cd.w + col] : null;
    };
    if (!d.ov[p]) return null;
    if (r.fine && fineZoom && d.fine[p]) {
      const L = r.lattice500, CH = r.chunk;
      const cr = Math.floor((L.north - ll.lat) / L.dlat / CH), cc = Math.floor((ll.lng - L.west) / L.dlon / CH);
      if (!(d.fine[p] || []).some(([a, b]) => a === cr && b === cc)) return p === "d" ? await pick(BASE + d.ov.d, r.coords[0][1], r.coords[2][1], r.coords[0][0], r.coords[1][0]) : 0;
      const bx = chunkBox(r, cr, cc);
      return pick(fineUrl(r, date, p, cr, cc), bx.n, bx.s, bx.w, bx.e);
    }
    return pick(BASE + d.ov[p], r.coords[0][1], r.coords[2][1], r.coords[0][0], r.coords[1][0]);
  }
  async function nearest(ll) {
    const res = await RES.catch(() => null);
    if (!res) return null;
    const c = Math.cos(ll.lat * Math.PI / 180);
    let best = null, bd = 1e9;
    for (const x of res.rows) { const d = Math.hypot((x.lon - ll.lng) * c, x.lat - ll.lat) * 111; if (d < bd) { bd = d; best = x; } }
    return best && bd < 25 ? [best, bd] : null;
  }
  async function onClick(e) {
    if (st.stayClick && Date.now() - st.stayClick < 400) return;
    const pin = map.queryRenderedFeatures(e.point, { layers: ["pins", "pin_lbl"].filter((l) => map.getLayer(l)) })[0];
    if (pin) { openResort(pin.properties.s); return; }
    const ll = e.lngLat;
    if (popup) popup.remove();
    const avalHit = st.over.aval && map.getLayer("aval_fill") && map.queryRenderedFeatures(e.point, { layers: ["aval_fill"] })[0];
    if ((st.main === "depth" || st.main === "powder") && !avalHit) { openPoint({ lat: ll.lat, lon: ll.lng }); return; }
    popup = new LIB.Popup({ closeButton: true, maxWidth: "280px", offset: 8 }).setLngLat(ll).setHTML('<div class="pv"><span class="k">Loading…</span></div>').addTo(map);
    const when = st.day === DATA.today ? "Today" : longDay(st.day);
    const r = regionAt(ll), mode = st.main;
    let h = "";
    if (mode === "wind" || mode === "freeze") {
      const cur = Object.values(st.fields).find((x) => x && x.ix && x.kind === mode && ll.lng >= x.ix.lon[0] - 0.125 && ll.lng <= x.ix.lon[x.ix.lon.length - 1] + 0.125 && ll.lat <= x.ix.lat[0] + 0.125 && ll.lat >= x.ix.lat[x.ix.lat.length - 1] - 0.125);
      if (cur) {
        const c = Math.round((ll.lng - cur.ix.lon[0]) / 0.25), rr = Math.round((cur.ix.lat[0] - ll.lat) / 0.25), v = fieldVal(cur.f, mode, rr, c);
        if (v != null && mode === "wind") {
          const dir = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(((Math.atan2(-cur.f.u[rr][c], -cur.f.v[rr][c]) * 180 / Math.PI) + 360) % 360 / 45) % 8];
          h = '<span class="k">Wind at midday · ' + when + '</span><span class="big">' + U.wv(v) + '<small>' + U.wu() + '</small></span><div class="line">from the ' + dir + "</div>";
        } else if (v != null) h = '<span class="k">Freezing level · ' + when + '</span><span class="big">' + U.ev(v) + "<small>" + U.eu() + "</small></span>";
      }
    } else if (mode === "sat") {
      const rr = r && r.sat ? r : null;
      if (rr) {
        const cd = await codesOf(BASE + rr.sat.img);
        const row = cd && Math.floor((mercY(rr.coords[0][1]) - mercY(ll.lat)) / (mercY(rr.coords[0][1]) - mercY(rr.coords[2][1])) * cd.h);
        const col = cd && Math.floor((ll.lng - rr.coords[0][0]) / (rr.coords[1][0] - rr.coords[0][0]) * cd.w);
        const c = cd && row >= 0 && row < cd.h && col >= 0 && col < cd.w ? cd.c[row * cd.w + col] : 255;
        const seen = addDays(rr.sat.asof, -(c >> 2)), when2 = D(seen).toLocaleDateString(LOC, { day: "numeric", month: "short", timeZone: "UTC" });
        h = '<span class="k">Latest clear view</span><div class="line"><b>' + (c === 255 ? "No satellite view here." : (c & 3) === 0 ? "No clear view in the last 10 days." :
          ({ 1: "Seen snow-covered on ", 2: "Seen without snow on ", 3: "Patchy snow seen on " })[c & 3] + when2) + "</b></div>";
      }
    } else if (mode === "depth" || mode === "powder") {
      if (isStatic(st.day) && r) {
        const [cd, cn] = await Promise.all([codeAt(r, "d", ll), codeAt(r, p72on() ? "n3" : "n", ll)]);
        if (cd != null && cd !== 255) {
          const dep = decDepth(cd), nw = cn != null && cn !== 255 ? cn : 0;
          if (mode === "powder") h = '<span class="k">New snow' + (p72on() ? ", 3 days" : "") + " · " + when + '</span><span class="big">' + (nw >= 1 ? "+" + cmS(nw) : "None") + '</span><div class="line">' + (dep >= 1 ? U.depth(dep) + " on the ground" : "No snow on the ground") + "</div>";
          else h = '<span class="k">Snow on the ground · ' + when + '</span><span class="big">' + (dep >= 1 ? cmS(dep) : "No snow") + "</span>" + (nw >= 1 ? '<span class="badge">+' + U.depth(nw) + " new</span>" : "");
        }
      } else if (proLive()) {
        try {
          const fine = r && st.proIdx.g500[r.code];
          const p = await SS.api((fine ? "/v1/g500/point" : "/v1/grid/point") + "?lat=" + ll.lat.toFixed(4) + "&lon=" + ll.lng.toFixed(4));
          const d = (p.days || []).find((x) => x.date === st.day);
          if (d) h = '<span class="k">Snow on the ground · ' + when + '</span><span class="big">' + (d.depth_cm >= 1 ? cmS(Math.round(d.depth_cm)) : "No snow") + "</span>" +
            (d.new_cm >= 1 ? '<span class="badge">+' + U.depth(Math.round(d.new_cm)) + " new</span>" : "") + (p.elev_m ? '<div class="line">at ' + U.elev(p.elev_m) + "</div>" : "");
        } catch (er) { h = er.down ? '<div class="line">Pro data is updating, try again in a minute.</div>' : ""; }
      }
      if (!h) h = '<span class="k">' + when + '</span><div class="line">No snow data here.</div>';
      const n = await nearest(ll);
      if (n) h += '<button class="near linkbtn" data-open="' + esc(n[0].slug) + '">' + esc(n[0].short) + " · " + U.dist(Math.max(1, Math.round(n[1]))) + " →</button>";
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
    popup.setHTML('<div class="pv" aria-live="polite">' + h + "</div>");
    const b = popup.getElement().querySelector("[data-open]");
    if (b) b.onclick = () => openResort(b.dataset.open);
  }

  // ------------------------------------------------------------------ layers sheet
  function layersSheet() {
    const tiles = [["depth", "Snow depth", "linear-gradient(135deg,#9ECAE1,#2171B5 60%,#08306B)"],
      ["powder", "Powder", "linear-gradient(135deg,#F7FCB9,#41B6C4 55%,#0C2C84)"],
      ["sat", "Satellite snow", "linear-gradient(135deg,#F6FAFF,#A0C4E4 50%,#96693E)"],
      ["off", "Off", "linear-gradient(135deg,var(--surface2),var(--surface3))"]];
    const tile = ([id, name, sw, pro]) => '<button class="tile" data-main="' + id + '" aria-pressed="' + (st.main === id) + '"><div class="sw2" style="background:' + sw + '"></div>' +
      (pro && !st.pro ? '<span class="pro"><span class="ms f">lock</span>PRO</span>' : "") + "<span>" + name + "</span></button>";
    const rows = [["wind", "Wind", "Around midday", "air", true, true], ["freeze", "Freezing level", U.us() ? "Where 32 °F sits" : "Where 0 °C sits", "device_thermostat", true, true],
      ["radar", "Rain & snow radar", "Right now", "radar", false, true], ["p72", "3-day snow", "Powder over 3 days", "ac_unit", true],
      ...(s30Enabled() ? [["s30", "Sharp 30 m", "The sharpest snow picture, where available", "grid_on"]] : []), ["stn", "Measured snow", "Snow depth measured at stations", "sensors"], ["pins", "Resorts", "Name and snow on each resort", "location_on"], ["stays", "Places to stay", "BOOK chips on resorts · Partner", "hotel"], ["pistes", "Pistes & lifts", "Coloured by difficulty", "downhill_skiing"]];
    const row = ([id, name, sub, icon, pro, main]) => {
      const on = main ? st.main === id : id === "p72" ? st.p72 : !!st.over[id];
      const dis = id === "radar" && st.radar === false;
      return '<button class="row" role="switch" data-over="' + id + '" aria-checked="' + on + '"' + (dis ? ' aria-disabled="true"' : "") + '><span class="ic"><span class="ms">' + icon + '</span></span><span class="tx"><b>' + name +
        (pro && !st.pro ? ' <span class="pro"><span class="ms f">lock</span>PRO</span>' : "") + "</b><small>" + (dis ? "Not available right now" : sub) + '</small></span><span class="sw-t"></span></button>';
    };
    const styles = true ? '<div class="over sec">Map</div><div class="seg2" role="group">' + Object.entries(STYLES).map(([k, v]) => '<button data-style="' + k + '" aria-pressed="' + (st.style === k) + '">' + v[0] + "</button>").join("") + "</div>" +
      '<button class="row" role="switch" data-over="terrain" aria-checked="' + st.terrain + '"><span class="ic"><span class="ms">landscape</span></span><span class="tx"><b>3D mountains</b><small>Tilt the map with two fingers or right-drag</small></span><span class="sw-t"></span></button>' : "";
    const m = SS.modal(SS.head("Map layers") + '<div class="over sec">Snow</div><div class="tiles">' + tiles.map(tile).join("") + "</div>" +
      (st.pro ? "" : '<p style="color:var(--ink3);font-size:13px;margin:10px 0 0">Powder is free for today. Pro adds every day, 3-day snow and the layers with a lock.</p>') +
      '<div class="over sec">Weather and more</div>' + rows.map(row).join("") +
      '<div class="over sec">Safety</div>' + row(["aval", "Avalanche danger", "Official daily levels", "warning"]) +
      '<div class="over sec">Snow colours</div><div class="filters"><div class="seg2" role="group" aria-label="Colour scale">' + [100, 200, 400].map((v) => '<button data-scale="' + v + '" aria-pressed="' + (st.scale === v) + '">0–' + U.depN(v) + " " + U.du() + "</button>").join("") +
      '</div><div class="seg2" role="group" aria-label="Look"><button data-sharp="0" aria-pressed="' + !st.sharp + '">Clear</button><button data-sharp="1" aria-pressed="' + st.sharp + '">Sharp</button></div></div>' + styles);
    m.el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-main]"), o = e.target.closest("[data-over]"), sy = e.target.closest("[data-style]");
      const sc = e.target.closest("[data-scale]"), sh = e.target.closest("[data-sharp]");
      if (sc) { st.scale = +sc.dataset.scale; store.set("ss_scale", st.scale); m.el.querySelectorAll("[data-scale]").forEach((b) => b.setAttribute("aria-pressed", b === sc)); drawLegend(); recolour(); return; }
      if (sh) { st.sharp = sh.dataset.sharp === "1"; store.set("ss_sharp", st.sharp); m.el.querySelectorAll("[data-sharp]").forEach((b) => b.setAttribute("aria-pressed", b === sh)); drawLegend(); setResampling(); return; }
      if (t) {
        const id = t.dataset.main;
        setMain(id);
        m.el.querySelectorAll("[data-main]").forEach((b) => b.setAttribute("aria-pressed", b === t));
      } else if (o) {
        const id = o.dataset.over;
        if (o.getAttribute("aria-disabled") === "true") return;
        if (["wind", "freeze", "p72"].includes(id) && !st.pro) { m.close(); SS.upsell(o.querySelector("b").firstChild.textContent.trim() + " is in Pro"); return; }
        if (["wind", "freeze"].includes(id) && !proLive()) { toast("Pro data is updating, try again in a minute."); return; }
        if (["wind", "freeze", "radar"].includes(id)) { setMain(st.main === id ? "depth" : id); }
        else if (id === "p72") { st.p72 = !st.p72; if (st.p72) st.main = "powder"; renderMain(); drawLegend(); drawDays(); }
        else if (id === "terrain") { st.terrain = !st.terrain; store.set("ss_terrain", st.terrain); applyTerrain(); }
        else { st.over[id] = !st.over[id]; if (id === "pistes") store.set("ss_pistes", st.over.pistes ? 1 : 0); if (id === "pins") drawPins(); else if (id === "stays") { store.set("ss_stays", st.over.stays ? 1 : 0); drawStays(); }
          else if (id === "stn") { store.set("ss_stn", st.over.stn ? 1 : 0); drawStations(); if (!st.slug && st.tab === "map") renderPanel(); }
          else if (id === "s30") { store.set("ss_s30", st.over.s30 ? 1 : 0); refreshS30(); } else applyOverlays(); drawLegend(); }
        m.el.querySelectorAll("[data-over]").forEach((b) => { const x = b.dataset.over; b.setAttribute("aria-checked", ["wind", "freeze", "radar"].includes(x) ? st.main === x : x === "p72" ? st.p72 : x === "terrain" ? st.terrain : !!st.over[x]); });
        m.el.querySelectorAll("[data-main]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.main === st.main));
      } else if (sy) {
        st.style = sy.dataset.style; store.set("ss_style", st.style);
        m.el.querySelectorAll("[data-style]").forEach((b) => b.setAttribute("aria-pressed", b === sy));
        // full reload: MapLibre 4 diffs by default, which drops every source / layer we added without firing
        // style.load (pistes, stations, snow gone after a basemap switch); onStyle re-adds everything on style.load
        map.setStyle(styleUrl(), { diff: false });
      }
    });
  }
  function setMain(id) {
    st.main = id;
    if (id === "powder" && !st.pro && st.day !== DATA.today) st.day = DATA.today;
    if (id !== "powder") st.p72 = false;
    if (id !== "wind" && id !== "freeze") st.hour = null;
    drawDays(); drawLegend(); renderMain(); drawPins();
    if (window.SSX) SSX.refresh();
  }
  // one switch for every layer, used by the layers sheet, the layer rail (expert.js) and the keyboard
  function toggleOver(id) {
    if (["wind", "freeze"].includes(id) && !st.pro) { SS.upsell({ wind: "Wind", freeze: "Freezing level" }[id] + " is in Pro"); return false; }
    if (["wind", "freeze"].includes(id) && !proLive()) { toast("Pro data is updating, try again in a minute."); return false; }
    if (id === "radar" && st.radar === false) { toast("Radar is not available right now"); return false; }
    if (["depth", "powder", "sat", "wind", "freeze", "radar"].includes(id)) { setMain(st.main === id && id !== "depth" ? "depth" : id); return true; }
    if (id === "p72") { st.p72 = !st.p72; if (st.p72) st.main = "powder"; renderMain(); drawLegend(); drawDays(); }
    else if (id === "terrain") { st.terrain = !st.terrain; store.set("ss_terrain", st.terrain); applyTerrain(); const b = $("btn3d"); if (b) b.setAttribute("aria-pressed", st.terrain); }
    else if (id in st.over) {
      st.over[id] = !st.over[id];
      if (id === "pistes") store.set("ss_pistes", st.over.pistes ? 1 : 0);
      if (!map || !ready) { if (window.SSX) SSX.refresh(); return true; }   // applied by onStyle once the map is up
      if (id === "pins") drawPins();
      else if (id === "stays") { store.set("ss_stays", st.over.stays ? 1 : 0); drawStays(); }
      else if (id === "stn") { store.set("ss_stn", st.over.stn ? 1 : 0); if (typeof drawStations === "function") drawStations(); if (!st.slug && st.tab === "map" && !st.point) renderPanel(); }
      else if (id === "s30") { store.set("ss_s30", st.over.s30 ? 1 : 0); refreshS30(); }
      else applyOverlays();
      drawLegend();
    } else return false;
    if (window.SSX) SSX.refresh();
    return true;
  }
  const overOn = (id) => (["depth", "powder", "sat", "wind", "freeze", "radar"].includes(id) ? st.main === id : id === "p72" ? st.p72 : id === "terrain" ? st.terrain : !!st.over[id]);
  function applyTerrain() {
    if (st.terrain) { ensureDem(); map.setTerrain({ source: "dem", exaggeration: 1.5 }); map.easeTo({ pitch: 60, duration: 900 }); }
    else { map.setTerrain(null); map.easeTo({ pitch: 0, duration: 600 }); }
  }


  // ------------------------------------------------------------------ panel / sheet / tabs
  function setupTabs() {
    const go = (e) => {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      st.tab = b.dataset.tab;
      SS.pageView("/#" + st.tab);
      if (st.slug) closeResort(true);
      st.point = null;
      renderPanel();
      if (innerWidth <= 760) setSheet(st.sheet === "peek" || st.tab !== "map" ? "half" : st.sheet);
    };
    $("tabs").onclick = go; $("bnav").onclick = go;
  }
  function setSheet(s) {
    st.sheet = s;
    $("panel").classList.toggle("half", s === "half");
    $("panel").classList.toggle("full", s === "full");
  }
  function setupSheet() {
    const g = $("grab"), order = ["peek", "half", "full"];
    const P = $("panel");
    let y0 = null, t0 = 0, base = 0, moved = false;
    const posOf = (name) => { const h = P.offsetHeight, peek = 168; return name === "full" ? 0 : name === "half" ? h * 0.45 : h - peek; };
    const down = (e) => { if (innerWidth > 760) return; y0 = e.clientY; t0 = performance.now(); base = posOf(st.sheet); moved = false; P.style.transition = "none"; try { g.setPointerCapture(e.pointerId); } catch { /* old browser */ } };
    const move = (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0;
      if (Math.abs(dy) > 4) moved = true;
      P.style.transform = "translateY(" + Math.max(0, Math.min(posOf("peek"), base + dy)) + "px)";
    };
    const up = (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0, v = dy / Math.max(1, performance.now() - t0);   // px per ms; a flick wins
      y0 = null; P.style.transition = ""; P.style.transform = "";
      if (!moved) return;
      const y = base + dy + v * 180;
      setSheet(order.map((n) => [n, Math.abs(posOf(n) - y)]).sort((a, b) => a[1] - b[1])[0][0]);
      g.dataset.dragged = "1"; setTimeout(() => { delete g.dataset.dragged; }, 50);
    };
    g.onclick = () => { if (!g.dataset.dragged) setSheet(order[(order.indexOf(st.sheet) + 1) % 3]); };
    g.addEventListener("pointerdown", down); g.addEventListener("pointermove", move); g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
    $("pbody").addEventListener("scroll", () => { if (innerWidth <= 760 && st.sheet === "peek" && $("pbody").scrollTop > 10) setSheet("half"); });
  }
  function markTabs() {
    for (const n of ["tabs", "bnav"]) $(n).querySelectorAll("[data-tab]").forEach((b) => {
      const on = b.dataset.tab === st.tab;
      on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
      const ic = b.querySelector(".ms"); if (ic && n === "bnav") ic.classList.toggle("f", on);
    });
  }
  async function renderPanel() {
    markTabs();
    const box = $("pbody");
    if (st.slug) { await resortView(st.slug); return; }
    if (st.point) { await pointView(st.point); return; }
    if (st.tab === "ski") box.innerHTML = await skiView();
    else if (st.tab === "powder") box.innerHTML = await powderView();
    else if (st.tab === "you") box.innerHTML = youView();
    else box.innerHTML = mapView();
    afterRender();
  }
  function afterRender() {
    const box = $("pbody");
    fillDemos();
    bindFolds(box); bindStays(box);
    box.querySelectorAll("[data-open]").forEach((b) => { b.onclick = (e) => { e.preventDefault(); openResort(b.dataset.open); }; });
    box.querySelectorAll("[data-goregion]").forEach((b) => { b.onclick = () => { store.set("ss_region_pick", 1); flyRegion(b.dataset.goregion); }; });
    bindStations(box);
    if (SS.S.started) SS.Ads.start();
  }
  function adSlot(kind, x, day) {    // place + dates for the house ad (Stay22) until AdSense fills the unit
    return '<aside class="ad' + (kind === "infeed" ? " infeed" : "") + '" data-ad="' + kind + '" aria-label="Advertisement" hidden' +
      (x ? ' data-lat="' + x.lat + '" data-lon="' + x.lon + '" data-place="' + esc(x.short || x.name || "") + '" data-day="' + (day || st.day) + '"' : "") + "></aside>";
  }
  const footer = () => {
    const c = (SS.S.cfg && SS.S.cfg.contact) || {};
    return '<nav class="flinks"><a href="' + BASE + 'resorts/">All resorts</a><a href="' + BASE + 'sources.html">About &amp; sources</a>' +
      (SS.Auth.enabled() ? '<a href="' + BASE + 'account.html">Your account</a>' : "") + '<a href="' + BASE + 'pricing.html">Pricing</a><a href="' + BASE + 'terms/">Terms</a><a href="' + BASE + 'privacy/">Privacy</a><a href="' + BASE + 'refund.html">Refund</a>' +
      (c.support ? '<a href="mailto:' + esc(c.support) + '">Help</a>' : "") + '<a href="#" data-ad-choices hidden>Cookie settings</a>' +
      '<span>Hotel links marked “Partner” may earn us a commission. © 2026 SnowScope · Atlas Labs</span></nav>';
  };
  const dayOf = (r) => r.days.find((y) => y.date === st.day) || r.days.find((y) => y.date === DATA.today) || r.days[r.days.length - 1];
  const the = (n) => (n === "Alps" || n === "Pyrenees" ? "the " + n : n);
  const resRow = (x, i, v, sub, nw) => '<a class="rrow' + (v ? "" : " dim") + '" href="' + BASE + "resorts/" + encodeURIComponent(x.slug) + '.html" data-open="' + esc(x.slug) + '">' +
    (i != null ? '<span class="rk">' + (i + 1) + "</span>" : "") + '<span class="nm"><b>' + esc(x.short || x.name) + "</b><small>" + esc(sub) + '</small></span><span class="val"><b>' + (v != null ? cmS(v) : "–") + "</b>" + (nw ? "<em>+" + U.dep(nw) + " new</em>" : "") + "</span></a>";

  // v2 home panel: ONE hero (big number + place + date + 7-day fresh-snow bars), a ranked list with visual weight,
  // compact region chips; empty sections are not shown
  function mapView() {
    const r = DATA.regions.find((x) => x.code === st.region) || DATA.regions[0], x = dayOf(r);
    const best = x.top[0], fresh = x.new_max_cm >= 5;
    const when = st.day === DATA.today ? I18N.t("Today") : longDay(st.day);
    const big = fresh ? "+" + cmS(x.new_max_cm) : best ? cmS(best.depth_cm) : cmS(x.max_cm || 0);
    const what = fresh ? "Fresh snow in " + the(r.name) : best ? "Deepest snow in " + the(r.name) : x.max_cm >= 1 ? "On the high peaks of " + the(r.name) : "No snow in " + the(r.name) + " yet";
    const where = fresh ? "" : best ? best.name : "";
    // 7 days of the region's biggest fresh snow (bars), today / the shown day highlighted
    const ds = r.days.slice(-9), mx = Math.max(5, ...ds.map((y) => y.new_max_cm || 0));
    const bars = '<div class="hbars" aria-hidden="true">' + ds.map((y) => '<span class="' + (y.date === st.day ? "on" : "") + (y.date > DATA.today ? " fc" : "") + '"><i style="height:' + Math.max(3, Math.round(((y.new_max_cm || 0) / mx) * 44)) + 'px"></i><b>' +
      (y.new_max_cm >= 1 ? U.dep(y.new_max_cm) : "") + "</b><small>" + (y.date === DATA.today ? esc(I18N.t("Today")) : wd(y.date)) + "</small></span>").join("") + "</div>";
    let h = '<section class="rhero"><div class="hk">' + esc(when) + " · " + esc(I18N.t(r.name)) + '</div><div class="hn">' + big + '</div><div class="hw">' + esc(what) + (where ? ' <span class="hp">' + esc(where) + "</span>" : "") + "</div>" +
      '<div class="hs"><span><b>' + fmt(x.resorts_with_snow || 0) + "</b> " + esc(I18N.t("resorts with snow")) + "</span>" + (fresh && best ? "<span><b>" + U.depth(best.depth_cm) + "</b> " + esc(I18N.t("deepest")) + "</span>" : "") + "</div>" +
      '<div class="hc"><div class="hk2">' + esc(I18N.t("Fresh snow, last days and next days")) + "</div>" + bars + "</div></section>";
    if (x.top.length) {
      const dmax = Math.max(...x.top.map((t) => t.depth_cm || 0), 1);
      h += '<h2 class="h2">Deepest snow today</h2><ol class="rank">' + x.top.map((t, i) => '<li><a href="' + BASE + "resorts/" + encodeURIComponent(t.slug) + '.html" data-open="' + esc(t.slug) + '">' +
        '<span class="rk">' + (i + 1) + '</span><span class="nm"><b>' + esc(t.name) + "</b><small>" + esc(t.country || "") + (t.new_cm >= 1 ? ' · <em class="nw">+' + U.depth(t.new_cm) + "</em>" : "") + "</small>" +
        '<span class="bar"><i style="width:' + Math.round((t.depth_cm / dmax) * 100) + "%;background:" + depthCol(t.depth_cm) + '"></i></span></span><span class="v">' + cmS(t.depth_cm) + "</span></a></li>").join("") + "</ol>";
    }
    h += stationsHtml(true);
    h += adSlot("infeed", best && BY[best.slug]);
    h += '<h2 class="h2">Other regions</h2><div class="regchips">' + DATA.regions.filter((y) => y.code !== r.code).map((y) => {
      const z = dayOf(y);
      return '<button data-goregion="' + y.code + '"><b>' + esc(y.name) + "</b><small>" + (z.new_max_cm >= 1 ? "+" + U.depth(z.new_max_cm) : z.resorts_with_snow ? esc(I18N.tu("{a} resorts with snow", fmt(z.resorts_with_snow))) : esc(I18N.t("No snow yet"))) + "</small></button>";
    }).join("") + "</div>";
    return h + appCard() + footer();
  }
  function appCard() {
    return '<a class="teaser" href="' + esc(SS.appUrl()) + '" style="margin-top:18px"><span class="ic" style="background:linear-gradient(160deg,#3B8BFF,#1463F3)"><span class="ms f">android</span></span><span><b>Every slope, every day</b><small>The sharpest snow map, powder alerts and Peak finder in the app.</small></span></a>';
  }
  // ------------------------------------------------------------------ recommender (Where to ski / Powder near you)
  const RADII = [50, 100, 200, 400, 0];
  const nextSat = () => { for (let k = 1; k < 8; k++) { const d = addDays(DATA.today, k); if (D(d).getUTCDay() === 6) return d; } return null; };
  const kmTo = (o, x) => Math.hypot((x.lon - o.lon) * Math.cos(o.lat * Math.PI / 180), x.lat - o.lat) * 111.2;
  const dayIdx = (res, when) => {
    if (when === "tomorrow") return res.dates.indexOf(addDays(DATA.today, 1));
    if (when === "weekend") { for (let k = 0; k < 7; k++) { const d = addDays(DATA.today, k); if (D(d).getUTCDay() === 6) return res.dates.indexOf(d); } return -1; }
    return res.dates.indexOf(DATA.today);
  };
  function setOrigin(o) { st.origin = o; store.set("ss_origin", o); renderPanel(); if (map && o) map.flyTo({ center: [o.lon, o.lat], zoom: o.zoom || 8, duration: 1200 }); }
  function locate(quiet) {
    if (!("geolocation" in navigator)) { if (!quiet) toast("Location not available"); return; }
    navigator.geolocation.getCurrentPosition((p) => setOrigin({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), label: "Near me", me: true }),
      () => { st.geoDenied = true; if (!quiet) toast("Location not available"); renderPanel(); }, { maximumAge: 6e5, timeout: 10000 });
  }
  function zoomControls() {
    if ($("zoomctl")) return;
    const z = document.createElement("div");
    z.id = "zoomctl"; z.className = "zoomctl glass"; z.setAttribute("role", "group"); z.setAttribute("aria-label", "Map controls");
    z.innerHTML = '<button data-z="1" aria-label="Zoom in" title="Zoom in"><span class="ms">add</span></button><span class="sep"></span>' +
      '<button data-z="-1" aria-label="Zoom out" title="Zoom out"><span class="ms">remove</span></button>' +
      '<button id="northBtn" aria-label="Reset north" title="Reset north" hidden><span class="ms" id="northIc">navigation</span></button>' +
      '<button data-me aria-label="Show my position" title="Show my position"><span class="ms">my_location</span></button>' +
      '<button data-3d aria-pressed="' + !!st.terrain + '" aria-label="3D view" title="3D view (T)"><span class="t3">3D</span></button>';
    $("panel").parentNode.appendChild(z);
    z.onclick = (e) => {
      const b = e.target.closest("button"); if (!b || !map) return;
      if (b.dataset.z) map.easeTo({ zoom: map.getZoom() + +b.dataset.z, duration: 260 });
      else if (b.id === "northBtn") map.easeTo({ bearing: 0, pitch: 0, duration: 500 });
      else if (b.hasAttribute("data-3d")) { toggleOver("terrain"); b.setAttribute("aria-pressed", !!st.terrain); }
      else if (b.hasAttribute("data-me")) {
        if (!("geolocation" in navigator)) { toast("Location not available"); return; }
        b.classList.add("busy");
        navigator.geolocation.getCurrentPosition((p) => { b.classList.remove("busy"); setOrigin({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), label: "Near me", me: true, zoom: Math.max(10, map.getZoom()) }); },
          () => { b.classList.remove("busy"); toast("Location not available"); }, { maximumAge: 6e5, timeout: 10000 });
      }
    };
    const north = () => { const nb = $("northBtn"); if (!nb) return; const r = Math.abs(map.getBearing()) > 0.5 || map.getPitch() > 1; nb.hidden = !r; $("northIc").style.transform = "rotate(" + (-map.getBearing()) + "deg)"; };
    map.on("rotate", north); map.on("pitch", north); map.on("load", north);
  }
  function verdictOf(dep, n24, n72) {
    if (n24 >= 20) return "Powder day: lots of fresh snow.";
    if (n72 >= 20) return "Fresh snow in the last days.";
    if (dep >= 100) return "Deep snow.";
    if (dep >= 40) return "Good snow cover.";
    if (dep >= 10) return "Some snow.";
    return dep >= 1 ? "A thin layer." : "No snow yet.";
  }
  function bestDay(res, x) {
    let b = null;
    res.dates.forEach((d, i) => { if (d < DATA.today) return; const s = x.snow[i] || []; const v = (s[1] || 0) * 3 + (s[0] || 0); if (s[0] != null && (!b || v > b[1])) b = [d, v]; });
    return b ? (b[0] === DATA.today ? "Today" : wd(b[0]) + " " + dnum(b[0])) : "";
  }
  function card(res, x, i, ti, dist) {
    const s = x.snow[ti] || [], n72 = (x.snow[res.dates.indexOf(DATA.today)] || [])[2];
    return '<article class="card reco"><div class="rh"><span class="rk">' + (i + 1) + '</span><span class="nm"><b>' + esc(x.short) + "</b><small>" +
      esc([x.country, dist != null ? U.dist(Math.round(dist)) + " away" : "", x.top_m ? "top " + U.elev(x.top_m) : ""].filter(Boolean).join(" · ")) + "</small></span></div>" +
      '<p class="verdict">' + verdictOf(s[0] || 0, s[1] || 0, n72 || 0) + "</p>" +
      '<div class="stats"><div class="stat"><b>' + (s[0] != null ? cmS(s[0]) : "–") + "</b><small>upper slopes</small></div>" +
      '<div class="stat"><b>' + (s[1] ? "+" + cmS(s[1]) : "–") + "</b><small>new, 24 h</small></div>" +
      '<div class="stat"><b>' + (n72 ? "+" + cmS(n72) : "–") + "</b><small>new, 3 days</small></div></div>" +
      (bestDay(res, x) ? '<p class="none" style="padding:0 0 8px">Best day: <b style="color:var(--ink)">' + bestDay(res, x) + "</b></p>" : "") +
      '<div class="acts3"><a class="btn tonal" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + x.lat + "," + x.lon + '"><span class="ms">directions_car</span>Directions</a>' +
      (stayHref(x.lat, x.lon, x.short, "card", res.dates[ti]) ? '<a class="btn tonal staychip" target="_blank" rel="sponsored noopener" title="Partner link: we may earn a commission" href="' + esc(stayHref(x.lat, x.lon, x.short, "card", res.dates[ti])) + '"><span class="ms">hotel</span>Stay</a>' : "") +
      '<button class="btn tonal" data-open="' + esc(x.slug) + '"><span class="ms">info</span>Details</button>' +
      '<button class="btn ink" data-share="' + esc(x.slug) + '" data-sd="' + (res.dates[ti] || DATA.today) + '"><span class="ms">share</span>Share</button></div></article>';
  }
  function originBar(res) {
    const o = st.origin, S2 = st.ski;
    return '<div class="origin"><span class="ms">' + (o && o.me ? "near_me" : "location_on") + '</span><div class="find2"><input id="skiQ" type="search" autocomplete="off" placeholder="City or resort" aria-label="City or resort" value="' +
      esc(o && !o.me ? o.label : "") + '"><ul id="skiQl" hidden></ul></div><button class="btn tonal" data-locate><span class="ms">my_location</span>' + (o && o.me ? "Near me" : "Use my location") + "</button></div>" +
      '<div class="pills inl" role="group" aria-label="Distance">' + RADII.map((r) => '<button class="pill" data-radius="' + r + '" aria-pressed="' + (S2.radius === r) + '">' + (r ? "within " + U.dist(r) : "Anywhere") + "</button>").join("") + "</div>";
  }
  async function placeSearch(q) {
    const res = await RES.catch(() => null), norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), nq = norm(q);
    const out = res ? res.rows.filter((x) => norm(x.name).includes(nq)).slice(0, 4).map((x) => ({ label: x.short, sub: x.country, lat: x.lat, lon: x.lon })) : [];
    if (q.length >= 3) {              // Photon (komoot, OpenStreetMap data): free place search, no key
      try {
        const lg = ["en", "de", "fr", "it"].includes((window.I18N && I18N.lang) || "en") ? I18N.lang : "en";
        const j = await SS.getJSON("https://photon.komoot.io/api/?limit=5&lang=" + lg + "&q=" + encodeURIComponent(q));
        for (const f of j.features || []) {
          const pr = f.properties || {};
          out.push({ label: pr.name || q, sub: [pr.state, pr.country].filter(Boolean).join(", "), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] });
        }
      } catch { /* resorts only */ }
    }
    return out.slice(0, 8);
  }
  async function skiView() {
    const res = await RES.catch(() => null);
    if (!res) return '<p class="msg">Resorts are loading…</p>';
    const S2 = st.ski, o = st.origin;
    if (!o && !st.geoDenied && !st.geoAsked) { st.geoAsked = true; locate(true); }
    const ti = dayIdx(res, S2.when);
    let h = '<div class="over">Ski finder</div><h1>Where to ski ' + ({ today: "today", tomorrow: "tomorrow", weekend: "this weekend" })[S2.when] + "</h1>" + originBar(res) +
      '<div class="filters"><div class="seg2" role="group" aria-label="Day">' + ["today", "tomorrow", "weekend"].map((w) => '<button data-when="' + w + '" aria-pressed="' + (S2.when === w) + '">' + ({ today: "Today", tomorrow: "Tomorrow", weekend: "Weekend" })[w] + "</button>").join("") + "</div>" +
      '<div class="seg2" role="group" aria-label="Snow on the upper slopes">' + [0, 10, 30, 60].map((v) => '<button data-min="' + v + '" aria-pressed="' + (S2.min === v) + '">' + (v ? U.dep(v) + "+ " + U.du() : "Any snow") + "</button>").join("") + "</div>" +
      '<button class="pill" data-fresh aria-pressed="' + S2.fresh + '">Fresh snow only</button></div>';
    if (ti < 0) return h + '<div class="prolock"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>This day is further than the free days.</b> Pro shows the full week ahead.</p></div>' + footer();
    const t3 = res.dates.indexOf(DATA.today);
    let rows = res.rows.map((x) => [x, o ? kmTo(o, x) : null]).filter(([x, d]) => {
      const sn = x.snow[ti] || [];
      if (sn[0] == null || sn[0] < Math.max(1, S2.min)) return false;
      if (S2.fresh && !((sn[1] || 0) >= 1 || ((x.snow[t3] || [])[2] || 0) >= 1)) return false;
      if (!o) return x.dom === st.region;
      return !S2.radius || d <= S2.radius;
    });
    const score = ([x, d]) => { const sn = x.snow[ti] || []; return (sn[0] || 0) + 3 * (sn[1] || 0) + 1.5 * ((x.snow[t3] || [])[2] || 0) - (d != null && S2.radius ? d / 10 : 0); };
    rows.sort((a, b) => score(b) - score(a));
    rows = rows.slice(0, 25);
    h += '<p class="none" style="padding:2px 0 8px"><span>' + (o ? (o.me ? "Around you" : "Around " + esc(o.label)) : esc(NAMES[st.region] || "")) + "</span> · <span>" + rows.length + " resorts</span></p>";
    if (!rows.length) h += '<p class="none">No resort with snow matches. Try a bigger distance or "Anywhere".</p>';
    h += rows.map(([x, d], i) => (i === 5 ? adSlot("banner", rows[0][0], res.dates[ti]) : "") + card(res, x, i, ti, d)).join("");
    if (rows.length) h += '<button class="btn ghost" data-propost="ski" style="margin:4px 0 8px"><span class="ms">add_photo_alternate</span>Create post' + (st.pro ? "" : ' <span class="pro">PRO</span>') + "</button>";
    return h + footer();
  }
  const FLAG = { Switzerland: "🇨🇭", "United States": "🇺🇸", Austria: "🇦🇹", Norway: "🇳🇴", France: "🇫🇷", Italy: "🇮🇹", Germany: "🇩🇪", Finland: "🇫🇮", Sweden: "🇸🇪", Canada: "🇨🇦",
    Slovenia: "🇸🇮", Spain: "🇪🇸", Andorra: "🇦🇩", Morocco: "🇲🇦", Liechtenstein: "🇱🇮", Croatia: "🇭🇷", Estonia: "🇪🇪", Russia: "🇷🇺" };
  const flagOf = (c) => (c || "").split(" / ").map((x) => FLAG[x.trim()] || "").join("");
  const newTier = (n) => (n >= 30 ? "#0C2C84" : n >= 10 ? "var(--accent-ink)" : "var(--ink)");
  function strip7(res, x) {         // fresh snow per day over the free window: small bars with the day letters
    const n = res.dates.length, W = 300, H = 54, bw = W / n, vals = res.dates.map((d, i) => (x.snow[i] || [])[1] || 0), max = Math.max(5, ...vals);
    let o = '<svg class="strip7" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">';
    res.dates.forEach((d, i) => { const h = (vals[i] / max) * 24, today = d === DATA.today;
      o += '<rect x="' + (i * bw + bw * 0.2) + '" y="' + (36 - h) + '" width="' + bw * 0.6 + '" height="' + Math.max(h, 1.5) + '" rx="2" fill="' + (today ? "var(--ink)" : d > DATA.today ? "var(--accent-tint)" : "var(--accent)") + '"/>' +
        (vals[i] >= 1 ? '<text x="' + (i * bw + bw / 2) + '" y="' + (32 - h) + '" text-anchor="middle" class="lbl">+' + U.dep(vals[i]) + "</text>" : "") +
        '<text x="' + (i * bw + bw / 2) + '" y="50" text-anchor="middle">' + esc(today ? "Today" : wd(d).slice(0, 2)) + "</text>"; });
    return o + "</svg>";
  }
  const trendOf = (x, ti) => { const a = (x.snow[ti] || [])[0], b = (x.snow[ti - 1] || [])[0]; if (a == null || b == null) return ""; const d = a - b;
    return d >= 1 ? '<em class="nw"><span class="ms">arrow_upward</span>' + U.dep(d) + " vs yesterday</em>" : d <= -1 ? '<em class="dn"><span class="ms">arrow_downward</span>' + U.dep(-d) + " vs yesterday</em>" : ""; };
  async function powderView() {
    const res = await RES.catch(() => null);
    if (!res) return '<p class="msg">Resorts are loading…</p>';
    await loadStations();
    const ti = res.dates.indexOf(DATA.today), k = st.p72 ? 2 : 1, o = st.origin, R = st.ski.radius;
    const fresh = res.rows.filter((x) => x.snow[ti] && x.snow[ti][k] >= 1);
    let rows = fresh.filter((x) => !o || !R || kmTo(o, x) <= R).sort((a, b) => b.snow[ti][k] - a.snow[ti][k]).slice(0, 25);
    let title = rows.length ? (o ? "Powder near you" : "Fresh snow today") : (o ? "No fresh snow near you" : "No fresh snow today"), far = false;
    if (o && !rows.length && fresh.length) {       // outside the snow regions (or nothing within the radius): the nearest fresh snow from the position
      rows = fresh.sort((a, b) => kmTo(o, a) - kmTo(o, b)).slice(0, 25); far = true; title = "Nearest powder from your position";
    }
    const top = rows[0];
    let h = '<div class="over">Powder</div><h1>' + title + '</h1><div class="nopills">' + originBar(res) + "</div>";
    const ri = RADII.indexOf(R) < 0 ? 2 : RADII.indexOf(R);
    h += '<div class="filters"><div class="seg2" role="group" aria-label="Period"><button data-p72="0" aria-pressed="' + !st.p72 + '">24 hours</button><button data-p72="1" aria-pressed="' + st.p72 + '">3 days</button></div>' +
      '<button class="btn tonal" data-showpowder><span class="ms">map</span>Show on the map</button></div>' +
      '<label class="range"><span>' + (R ? "within " + U.dist(R) : "Anywhere") + '</span><input type="range" min="0" max="' + (RADII.length - 1) + '" step="1" value="' + ri + '" data-radius-range aria-label="Distance"></label>';
    if (top) {
      const tsn = top.snow[ti] || [], n72 = tsn[2] || 0;
      h += '<article class="card pwhero"><div class="over">' + (far ? "Nearest fresh snow" : st.p72 ? "Best powder, 3 days" : "Best powder today") + '</div>' +
        '<div class="pwtop"><div class="nm"><b>' + esc(top.short) + "</b><small>" + flagOf(top.country) + " " + esc([top.country, o ? U.dist(Math.round(kmTo(o, top))) + " away" : ""].filter(Boolean).join(" · ")) + "</small></div>" +
        '<b class="big" style="color:' + newTier(tsn[k]) + '">+' + cmS(tsn[k]) + "</b></div>" +
        '<div class="stats"><div class="stat"><b>' + (tsn[0] != null ? cmS(tsn[0]) : "–") + "</b><small>on the upper slopes</small></div>" +
        '<div class="stat"><b>' + (st.p72 ? (tsn[1] ? "+" + cmS(tsn[1]) : "–") : (n72 ? "+" + cmS(n72) : "–")) + "</b><small>" + (st.p72 ? "in 24 hours" : "in 3 days") + "</small></div>" +
        '<div class="stat"><b>' + (top.top_m ? fmt(top.top_m) + "<small>m</small>" : "–") + "</b><small>upper slopes</small></div></div>" +
        strip7(res, top) + measuredHtml(top.lat, top.lon, top.top_m || null, false) +
        '<div class="acts3"><button class="btn ink" data-open="' + esc(top.slug) + '"><span class="ms">info</span>Details</button><a class="btn tonal" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + top.lat + "," + top.lon + '"><span class="ms">directions_car</span>Directions</a>' +
        '<button class="btn tonal" data-share="' + esc(top.slug) + '" data-sd="' + DATA.today + '"><span class="ms">share</span>Share</button></div></article>';
    }
    h += rows.length ? rows.map((x, i) => (i === 5 ? adSlot("infeed", rows[0], DATA.today) : "") + '<a class="rrow pw" href="' + BASE + "resorts/" + encodeURIComponent(x.slug) + '.html" data-open="' + esc(x.slug) + '"><span class="rk' + (i < 3 ? " top" : "") + '">' + (i + 1) + '</span><span class="nm"><b>' + flagOf(x.country) + " " + esc(x.short) + "</b><small>" +
      esc([x.country, o ? U.dist(Math.round(kmTo(o, x))) + " away" : NAMES[x.dom] || ""].filter(Boolean).join(" · ")) + " " + trendOf(x, ti) + '</small>' + measuredHtml(x.lat, x.lon, x.top_m || null, true) + '</span>' +
      '<span class="val"><b style="color:' + newTier(x.snow[ti][k]) + '">+' + cmS(x.snow[ti][k]) + "</b><em>" + (st.p72 ? "+" + U.dep(x.snow[ti][1] || 0) + " in 24 h" : "+" + U.dep(x.snow[ti][2] || 0) + " in 3 days") + " · " + U.depth(x.snow[ti][0] || 0) + " deep</em></span></a>").join("")
      : '<p class="none">' + esc(I18N.tu("Nothing over {b} cm in the last {a}. Check tomorrow.", I18N.t(st.p72 ? "3 days" : "24 hours"), U.dep(1))) + "</p>";
    if (rows.length) h += '<button class="btn ghost" data-propost="powder" style="margin-top:10px"><span class="ms">add_photo_alternate</span>Create post' + (st.pro ? "" : ' <span class="pro">PRO</span>') + "</button>";
    const storms = (DATA.storms || []).map((x, i) => [x, i]).sort((a, b) => b[0].cm - a[0].cm).slice(0, 8);
    h += '<div class="sect">Snow storms</div>' + (storms.length ? storms.map(([x, i]) => '<article class="card storm"><div class="over">' + esc((x.date === DATA.today ? "Today" : wd(x.date) + " " + dnum(x.date)) + " · " + (NAMES[x.region] || "")) + '</div>' +
      '<div class="pwtop"><div class="nm"><b>' + esc(x.place || NAMES[x.region] || x.region) + "</b><small>" + (x.hours === 72 ? "in 3 days" : "in 24 hours") + "</small></div><b class=\"big\" style=\"color:" + newTier(x.cm) + '">+' + cmS(x.cm) + "</b></div>" +
      measuredHtml(x.lat, x.lon, null, true) + '<div class="acts3">' + (x.slug ? '<button class="btn tonal" data-open="' + esc(x.slug) + '"><span class="ms">info</span>Details</button>' : "") +
      '<a class="btn tonal" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + x.lat + "," + x.lon + '"><span class="ms">directions_car</span>Directions</a>' +
      '<button class="btn ink" data-storm="' + i + '"><span class="ms">add_photo_alternate</span>Post image</button></div></article>').join("")
      : '<p class="none">' + esc(I18N.tu("No snow storm right now ({a} cm or more).", U.depN(20))) + "</p>");
    h += '<button class="btn ghost" data-viewpost style="margin-top:10px"><span class="ms">photo_camera</span>Post of this map view</button>';
    h += '<div id="demos3d"></div>';
    let shown = false; try { shown = !!sessionStorage.getItem("ss_stormstay"); } catch { /* private */ }
    const s0 = (DATA.storms || []).find((x) => x.slug);
    if (s0 && !shown && stayHref(s0.lat, s0.lon, s0.place, "storm")) {
      try { sessionStorage.setItem("ss_stormstay", "1"); } catch { /* private */ }
      h += '<a class="teaser" target="_blank" rel="sponsored noopener" href="' + esc(stayHref(s0.lat, s0.lon, s0.place, "storm", nextSat())) + '" style="margin-top:12px"><span class="ic" style="background:linear-gradient(160deg,#3B8BFF,#1463F3)"><span class="ms f">hotel</span></span><span><b>Powder this weekend?</b><small>Book a bed near ' + esc(s0.place) + ' · <span class="partner">Partner</span></small></span></a>';
    }
    h += '<a class="teaser" href="' + esc(SS.appUrl()) + '" style="margin-top:16px"><span class="ic" style="background:linear-gradient(160deg,#3B8BFF,#1463F3)"><span class="ms f">notifications</span></span><span><b>Powder alerts</b><small>Get a message when fresh snow is coming to your resorts. In the app.</small></span></a>';
    return h + footer();
  }
  function youView() {
    const S = SS.S, u = S.user;
    let acc;
    if (!SS.Auth.enabled()) acc = '<div class="card"><b>Your SnowScope account</b><p class="none" style="padding:4px 0 0">Your account and Pro live in the app. Signing in here is coming soon.</p></div>';
    else if (!u) acc = '<div class="card"><b>One account for the app and the website</b><p class="none" style="padding:4px 0 8px">Sign in to remove ads and unlock Pro if you have it.</p><button class="btn ink" data-signin>Sign in</button> <button class="btn ghost" data-signup>Create an account</button></div>';
    else acc = '<div class="card"><b>' + esc(u.displayName || u.email || "Signed in") + '</b><p class="none" style="padding:2px 0 8px">' + (S.pro ? '<span class="pro"><span class="ms f">workspace_premium</span>PRO</span> You have SnowScope Pro.' : S.state === "no_account" ? "Open the app once with this account to connect it." : S.state === "api_down" ? "Pro data is updating, try again in a minute." : "Free plan") + '</p><a class="btn tonal" href="' + BASE + 'account.html">Manage account</a></div>';
    const pro = S.pro ? "" : '<div class="card"><span class="pro"><span class="ms f">workspace_premium</span>PRO</span><p style="margin:8px 0;font-size:14px;color:var(--ink2)">No ads, the sharpest snow map, 15 days, powder on every day, wind, freezing level, satellite snow, 7-day resort forecasts and past winters.</p>' + (window.SSPay && SSPay.enabled() ? '<button class="btn ink" data-buy-pro>Get Pro</button>' : '<a class="btn ink" href="' + esc(SS.appUrl()) + '">Get Pro in the app</a>') + '</div>';
    const teaser = (icon, bg, t, s) => '<a class="teaser" href="' + esc(SS.appUrl()) + '"><span class="ic" style="background:' + bg + '"><span class="ms f">' + icon + "</span></span><span><b>" + t + "</b><small>" + s + "</small></span></a>";
    const hide = S.pro ? '<button class="row" role="switch" data-nostay aria-checked="' + !store.get("ss_nostay") + '"><span class="ic"><span class="ms">hotel</span></span><span class="tx"><b>Hotel suggestions</b><small>Places to stay near resorts</small></span><span class="sw-t"></span></button>' : "";
    const units = '<div class="sect">Units</div><div class="seg2" role="group" aria-label="Units"><button data-units="metric" aria-pressed="' + !U.us() + '">Metric · cm, m, km, °C</button><button data-units="us" aria-pressed="' + U.us() + '">US · in, ft, mi, °F</button></div>';
    return '<div class="over">You</div><h1>Your SnowScope</h1>' + acc + pro + hide + units + '<div class="sect">3D videos</div>' +
      '<a class="teaser" href="' + BASE + 'studio.html"><span class="ic" style="background:linear-gradient(160deg,#6E59F2,#4330C9)"><span class="ms f">movie</span></span><span><b>Create a 3D video</b><small>A flyover of any summit or ski circuit with today\'s snow.</small></span></a>' +
      '<div class="sect">Only in the app</div>' +
      teaser("landscape", "linear-gradient(160deg,#F2662B,#C9381A)", "Peak finder", "Point your camera at the mountains to name every summit.") +
      teaser("timeline", "linear-gradient(160deg,#3B8BFF,#1463F3)", "Ski days", "Record your day: distance, runs, vertical.") +
      teaser("notifications", "linear-gradient(160deg,#3B8BFF,#1463F3)", "Powder alerts", "A message when fresh snow is coming.") + footer();
  }
  $("pbody").addEventListener("click", (e) => {
    const w = e.target.closest("[data-when]"), p7 = e.target.closest("[data-p72]");
    if (w) { st.ski.when = w.dataset.when; renderPanel(); }
    const rb = e.target.closest("[data-radius]"); if (rb) { st.ski.radius = +rb.dataset.radius; store.set("ss_radius", st.ski.radius); renderPanel(); }
    const rr = e.target.closest("[data-radius-range]"); if (rr) { st.ski.radius = RADII[+rr.value] || 0; store.set("ss_radius", st.ski.radius); renderPanel(); }
    const mb = e.target.closest("[data-min]"); if (mb) { st.ski.min = +mb.dataset.min; renderPanel(); }
    if (e.target.closest("[data-fresh]")) { st.ski.fresh = !st.ski.fresh; renderPanel(); }
    if (e.target.closest("[data-locate]")) locate(false);
    const shb = e.target.closest("[data-share]"); if (shb) { e.preventDefault(); shareResort(shb.dataset.share, shb.dataset.sd); }
    const ql = e.target.closest("[data-place]"); if (ql) { const pl = st.places[+ql.dataset.place]; setOrigin({ lat: pl.lat, lon: pl.lon, label: pl.label, zoom: 8 }); }
    if (p7) { const on = p7.dataset.p72 === "1"; st.p72 = on; renderPanel(); drawPins(); if (st.main === "powder") { renderMain(); drawLegend(); } }
    if (e.target.closest("[data-showpowder]")) { setMain("powder"); if (innerWidth <= 760) setSheet("peek"); }
    if (e.target.closest("[data-signup]")) SS.signInModal("up");
    const ub = e.target.closest("[data-units]"); if (ub && ub.dataset.units !== U.mode()) { U.set(ub.dataset.units); location.reload(); }
    if (e.target.closest("[data-nostay]")) { store.set("ss_nostay", store.get("ss_nostay") ? null : 1); drawStays(); renderPanel(); }
    const sb = e.target.closest("[data-storm]");
    if (sb) stormPost(DATA.storms[+sb.dataset.storm]);
    if (e.target.closest("[data-viewpost]")) viewPost();
    const pp = e.target.closest("[data-propost]");
    if (pp) proPost(pp.dataset.propost);
  });
  let qT = 0;
  $("pbody").addEventListener("input", (e) => {
    if (e.target.id !== "skiQ") return;
    clearTimeout(qT);
    const q = e.target.value.trim();
    qT = setTimeout(async () => {
      const ul = $("skiQl"); if (!ul) return;
      if (q.length < 2) { ul.hidden = true; return; }
      st.places = await placeSearch(q);
      ul.innerHTML = st.places.map((p, i) => '<li><button data-place="' + i + '"><b>' + esc(p.label) + "</b> <small>" + esc(p.sub || "") + "</small></button></li>").join("");
      ul.hidden = !st.places.length;
    }, 250);
  });
  $("pbody").addEventListener("change", (e) => {
    if (e.target.id === "skiRegion") { st.ski.region = e.target.value; st.ski.country = ""; renderPanel(); }
    if (e.target.id === "skiCountry") { st.ski.country = e.target.value; renderPanel(); }
  });

  // ------------------------------------------------------------------ any point: season vs past winters + next days
  function openPoint(pt, { quiet = false } = {}) {
    st.point = { lat: +pt.lat.toFixed(4), lon: +pt.lon.toFixed(4) }; st.slug = null;
    history.replaceState(null, "", BASE + "?p=" + st.point.lat + "," + st.point.lon + (st.day !== DATA.today ? "&d=" + st.day : "") + location.hash.replace(/^#@.*/, ""));
    if (map && map.getSource("pt")) map.getSource("pt").setData({ type: "Feature", geometry: { type: "Point", coordinates: [st.point.lon, st.point.lat] } });
    if (innerWidth <= 760 && !quiet) setSheet("half");
    $("pbody").scrollTop = 0;
    renderPanel();
    SS.pageView("/?p=" + st.point.lat + "," + st.point.lon);
  }
  function closePoint() {
    st.point = null;
    showMeasuredLink(null, null);
    if (map && map.getSource("pt")) map.getSource("pt").setData({ type: "FeatureCollection", features: [] });
    history.replaceState(null, "", BASE + "#" + slugOf(st.region));
    renderPanel();
  }
  async function pointView(pt) {
    const box = $("pbody"), ll = { lat: pt.lat, lng: pt.lon }, r = regionAt(ll);
    const days = r ? await Promise.all(DATA.dates.map(async (d) => {
      const [cd, cn] = await Promise.all([codeAt(r, "d", ll, d, true), codeAt(r, "n", ll, d, true)]);
      return { date: d, dep: cd == null || cd === 255 ? null : decDepth(cd), nw: cn == null || cn === 255 ? 0 : cn };
    })) : [];
    if (st.point !== pt) return;
    const today = days.find((d) => d.date === DATA.today) || {};
    const n = await nearest(ll);
    await loadStations();
    const [elev, s30] = await Promise.all([elevAt(pt.lat, pt.lon).catch(() => null), s30Point(pt.lat, pt.lon)]);
    if (st.point !== pt) return;
    const ns = nearestStation(pt.lat, pt.lon, elev);
    showMeasuredLink(pt, ns);
    const head = '<div class="phead"><button class="back" data-back><span class="ms">arrow_back</span>' + esc(r ? r.name : "Back") + "</button>" +
      '<div class="over">Snow here</div><h1>' + (n ? "Near " + esc(n[0].short) : esc(r ? r.name : "This spot")) + '</h1><p class="lede" id="ptMeta">' +
      (elev != null ? '<span class="ms">landscape</span>' + U.elev(elev) + " · " : "") + pt.lat.toFixed(3) + ", " + pt.lon.toFixed(3) + "</p></div>";
    box.innerHTML = head +
      '<div class="hero2"><div class="card"><div class="over">Snow today</div><b class="n">' + (today.dep == null ? "–" : today.dep >= 1 ? cmS(today.dep) : cmS(0)) + '</b><small class="none" id="ptRank"><span class="skel" style="display:block;height:14px;width:80%"></span></small></div>' +
      '<div class="card"><div class="over">New snow, 24 h</div>' + (today.nw >= 1 ? '<b class="n acc">+' + cmS(today.nw) + "</b>" : '<b class="n">–</b>') + '<small class="none" id="ptNext"></small></div></div>' +
      (s30 ? '<p class="measured s30"><span class="k">Sharp 30 m</span> <b>' + U.depth(Math.round(s30.depth_cm)) + "</b>" + (s30.elevation_m ? " · " + U.elev(s30.elevation_m) : "") + "</p>" : "") +
      fold("past", "Compared with past winters", '<div id="ptPast"><div class="skel" style="height:118px"></div></div><div id="ptChart"><div class="skel" style="height:190px;margin-top:10px"></div></div>') +
      fold("stn", "Closest measured station", '<div id="ptStn"><div class="skel" style="height:120px"></div></div>') +
      (window.SSX ? fold("hours", "Hour by hour", '<div id="ptMeteo"><div class="skel" style="height:230px"></div></div>') : "") +
      '<div class="acts3" style="margin-top:14px"><a class="btn tonal" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + pt.lat + "," + pt.lon + '"><span class="ms">directions_car</span>Directions</a>' +
      '<button class="btn tonal" data-sharept><span class="ms">share</span>Share</button>' +
      (SS.stayLink(pt.lat, pt.lon, n ? n[0].short : "") ? '<a class="btn tonal" target="_blank" rel="sponsored noopener" href="' + esc(stayHref(pt.lat, pt.lon, n ? n[0].short : "", "point")) + '"><span class="ms">hotel</span>Stay</a>' : "") + "</div>" +
      (n ? '<button class="rrow" style="width:100%;border:0;background:none;text-align:start;margin-top:8px" data-open="' + esc(n[0].slug) + '"><span class="nm"><b>' + esc(n[0].short) + "</b><small>" + U.dist(Math.round(n[1])) + '</small></span><span class="ms">chevron_right</span></button>' : "") + footer();
    box.querySelector("[data-back]").onclick = closePoint;
    box.querySelector("[data-sharept]").onclick = () => sharePoint(pt, n, today);
    afterRender();
    if (window.SSX) SSX.meteogram(pt, days, r);
    pointChart(pt, days, { elev, ns });
  }
  async function pointChart(pt, days, ctx = {}) {
    const box = $("ptChart");
    let h = null, live = null;
    let herr = null;
    try { h = await SS.api("/v1/history/point?lat=" + pt.lat + "&lon=" + pt.lon, { auth: true, timeout: 20000 }); } catch (e) { h = null; herr = e; }
    if (st.pro && proLive()) {
      try {
        const fine = DATA.regions.some((r) => r.fine && regionAt({ lat: pt.lat, lng: pt.lon }) === r);
        const p = await SS.api((fine ? "/v1/g500/point" : "/v1/grid/point") + "?lat=" + pt.lat + "&lon=" + pt.lon);
        live = (p.days || []).map((d) => ({ date: d.date, dep: d.depth_cm == null ? null : Math.round(d.depth_cm), nw: Math.round(d.new_cm || 0) }));
        if (p.elev_m && !ctx.elev && $("ptMeta")) $("ptMeta").textContent = U.elev(p.elev_m);
      } catch { live = null; }
    }
    if (!box || st.point !== pt) return;
    // series: past from the history "current", then the free days, then (Pro) the live days up to +7
    const byDate = {};
    if (h) for (const q of h.current || []) if (q.depth_cm != null) byDate[q.date] = { dep: q.depth_cm, past: true };
    for (const d of days) if (d.dep != null) byDate[d.date] = { dep: d.dep, nw: d.nw };
    for (const d of live || []) if (d.dep != null && (d.date > DATA.today || !byDate[d.date])) byDate[d.date] = { dep: d.dep, nw: d.nw };
    const freeEnd = addDays(DATA.today, 3), end = addDays(DATA.today, 15);
    const year = +DATA.today.slice(0, 4), m = +DATA.today.slice(5, 7);
    const start = (m >= 8 ? year : year - 1) + "-10-01";
    const nDays = Math.round((D(end) - D(start)) / 864e5);
    const X = (d) => Math.round((D(d) - D(start)) / 864e5);
    const clim = h && h.climatology, idx = clim ? Object.fromEntries(clim.mmdd.map((k, i) => [k, i])) : {};
    const at = (key, d) => (clim && clim[key] ? clim[key][idx[d.slice(5)]] : null);
    const W = 360, H = 190, top = 14, bot = 24;
    const all = Object.values(byDate).map((v) => v.dep);
    let max = Math.max(20, ...all);
    for (let k = 0; k <= nDays; k += 3) { const v = at("max", addDays(start, k)) ?? at("p90", addDays(start, k)); if (v != null) max = Math.max(max, Math.min(v, Math.max(...all, 20) * 3)); }
    max *= 1.08;
    const px = (k) => (k / nDays) * W, py = (v) => H - bot - (Math.min(v, max) / max) * (H - bot - top);
    const band = (lo, hi) => {
      let a = "", b = "";
      for (let k = 0; k <= nDays; k++) { const d = addDays(start, k), l = at(lo, d), u = at(hi, d); if (l == null || u == null) continue; a += (a ? "L" : "M") + px(k).toFixed(1) + "," + py(u).toFixed(1); b = "L" + px(k).toFixed(1) + "," + py(l).toFixed(1) + b; }
      return a ? a + b + "Z" : "";
    };
    const line = (key) => { let a = ""; for (let k = 0; k <= nDays; k++) { const v = at(key, addDays(start, k)); if (v != null) a += (a ? "L" : "M") + px(k).toFixed(1) + "," + py(v).toFixed(1); } return a; };
    const pts = Object.keys(byDate).filter((d) => d >= start && d <= end).sort();
    const path = (from, to) => pts.filter((d) => d >= from && d <= to).map((d, i) => (i ? "L" : "M") + px(X(d)).toFixed(1) + "," + py(byDate[d].dep).toFixed(1)).join("");
    const lockX = px(X(freeEnd));
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Snow depth this season compared with past winters">' +
      (clim ? '<path d="' + band("min", "max") + '" fill="var(--accent-tint)" opacity=".55"/><path d="' + band("p25", "p75") + '" fill="var(--accent-tint)"/><path d="' + line("p50") + '" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/>' : "") +
      '<path d="' + path(start, DATA.today) + '" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="' + path(DATA.today, st.pro ? end : freeEnd) + '" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-dasharray="5 4"/>' +
      '<line x1="' + px(X(DATA.today)) + '" x2="' + px(X(DATA.today)) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke="var(--ink3)" stroke-dasharray="2 3"/>' +
      (byDate[DATA.today] ? '<circle cx="' + px(X(DATA.today)).toFixed(1) + '" cy="' + py(byDate[DATA.today].dep).toFixed(1) + '" r="4.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/>' : "") +
      (!st.pro ? '<rect x="' + lockX + '" y="' + top + '" width="' + (W - lockX) + '" height="' + (H - bot - top) + '" fill="var(--surface2)" opacity=".85"/><text x="' + ((lockX + W) / 2) + '" y="' + (H / 2) + '" text-anchor="middle" class="lbl">PRO</text>' : "");
    const mn = [["10-01", "Oct"], ["11-01", "Nov"], ["12-01", "Dec"], ["01-01", "Jan"], ["02-01", "Feb"], ["03-01", "Mar"], ["04-01", "Apr"], ["05-01", "May"]];
    for (let k = 0; k <= nDays; k++) { const d = addDays(start, k), q = mn.find((x) => x[0] === d.slice(5)); if (q) s += '<text x="' + px(k) + '" y="' + (H - 6) + '">' + q[1] + "</text>"; }
    s += '<text x="' + (W - 2) + '" y="11" text-anchor="end">' + U.depth(Math.round(max / 1.08)) + "</text></svg>";
    const next = Object.keys(byDate).sort().find((d) => d > DATA.today && d <= (st.pro ? end : freeEnd) && (byDate[d].nw || 0) >= 5);
    if ($("ptNext")) $("ptNext").textContent = next ? "Snow expected " + D(next).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }) + ": +" + U.depth(byDate[next].nw) : "";
    pastBlock(h, byDate, at, herr);
    stationBlock(pt, ctx, byDate);
    box.innerHTML = s + '<div class="keyrow"><span><i style="background:var(--ink)"></i>this season</span><span><i style="background:var(--accent)"></i>usual</span><span><i style="background:var(--accent-tint)"></i>past winters</span><span>- - next days</span></div>' +
      (!st.pro ? '<div class="prolock" style="margin-top:10px"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>The next 3 days are free.</b><br>Pro adds the whole week ahead and the outlook.</p><button class="btn ink" data-up>Unlock the week</button></div>' : "");
    const up = box.querySelector("[data-up]"); if (up) up.onclick = () => SS.upsell("The week ahead is in Pro");
  }
  // collapsible sections (point / resort panels): <details> with the open state remembered per section
  const fold = (key, title, body, open) => {
    const o = get("ss_fold_" + key, open === false ? 0 : 1);
    return '<details class="fold" data-fold="' + key + '"' + (o ? " open" : "") + '><summary>' + title + "</summary>" + body + "</details>";
  };
  function bindFolds(box) {
    box.querySelectorAll("details[data-fold]").forEach((d) => d.addEventListener("toggle", () => store.set("ss_fold_" + d.dataset.fold, d.open ? 1 : 0)));
  }
  // today vs the same calendar day in past winters: percentile from the climatology bands, anomaly, range bar, table,
  // snowiest / leanest winter by peak (exact per-winter values on this date: progress/data_requests.md, day_values)
  function pastBlock(h, byDate, at, herr) {
    const box = $("ptPast"), rk = $("ptRank");
    if (!box) return;
    const t0 = byDate[DATA.today];
    const B = ["min", "p10", "p25", "p50", "p75", "p90", "max"].map((k) => at(k, DATA.today));
    if (!h || !t0 || B.some((v) => v == null)) {
      box.innerHTML = '<p class="none">' + (!h ? (herr && herr.status === 503 ? "Past winters for this spot are being prepared. Try again tomorrow." : "Past winters are updating, try again in a minute.") : "No past winters for this spot.") + "</p>";
      if (rk) rk.textContent = "";
      return;
    }
    const [mn, p10, p25, p50, p75, p90, mx] = B, v = t0.dep, P = [0, 10, 25, 50, 75, 90, 100];
    // share of past winters below a depth x (interpolated between the bands; ties count as "not below")
    const below = (x) => { if (x <= B[0]) return 0; if (x > B[6]) return 100; for (let i = 0; i < 6; i++) if (x > B[i] && x <= B[i + 1]) return P[i] + (P[i + 1] - P[i]) * (x - B[i]) / (B[i + 1] - B[i]); return 100; };
    const pct = mx < 1 && v < 1 ? null : below(v), k10 = pct == null ? null : Math.round(pct / 10);
    const had = Math.round((100 - below(1)) / 10);          // past winters (of 10) with snow on this date
    const verdict = pct == null ? "No snow here on this date in past winters either."
      : v < 1 ? (had <= 2 ? "No snow yet, like most past winters on this date." : I18N.tu("No snow yet, while {a} of 10 past winters had snow on this date.", had))
      : v > mx ? "Deeper than every past winter on this date."
      : v < mn ? "Less snow than every past winter on this date."
      : k10 >= 10 ? "Deeper than nearly every past winter on this date."
      : k10 <= 0 ? "Less snow than nearly every past winter on this date."
      : "Deeper than " + k10 + " of 10 past winters on this date.";
    const d = v - p50, dp = p50 >= 5 ? Math.round(100 * d / p50) : null;
    const sign = (x) => (x > 0 ? "+" : x < 0 ? "−" : "±");
    const anom = Math.abs(d) < 1 ? "Same as usual" : sign(d) + U.depth(Math.abs(d)) + (dp != null ? " (" + sign(dp) + Math.abs(dp) + " %)" : "") + " vs usual";
    if (rk) rk.textContent = pct == null || (v < 1 && had <= 2) ? "" : k10 >= 7 ? "More than usual" : k10 <= 3 ? "Less than usual" : "About usual";
    // range bar: min..max, 25-75 % band, median tick, today's marker (clamped)
    const hi = Math.max(mx, v, 1), X = (x) => Math.max(0, Math.min(100, (x / hi) * 100)).toFixed(1) + "%";
    const bar = '<div class="pbar" role="img" aria-label="' + esc(verdict) + '"><span class="rng" style="left:' + X(mn) + ";width:calc(" + X(mx) + " - " + X(mn) + ')"></span>' +
      '<span class="iq" style="left:' + X(p25) + ";width:calc(" + X(p75) + " - " + X(p25) + ')"></span><span class="md" style="left:' + X(p50) + '"></span>' +
      '<span class="me" style="left:' + X(v) + '"></span></div><div class="pbar-l"><span>' + U.depth(mn) + "</span><span>" + U.depth(mx) + "</span></div>";
    const seas = (h.seasons || []).filter((x) => x.max_depth_cm != null);
    const wet = seas.filter((x) => x.max_depth_cm > 0);
    const best = wet.length ? wet.reduce((a, b) => (b.max_depth_cm > a.max_depth_cm ? b : a)) : null;
    const worst = seas.length ? seas.reduce((a, b) => (b.max_depth_cm < a.max_depth_cm ? b : a)) : null;
    const sz = (x) => x.season.replace("-", "–");
    const row = (k, val) => "<tr><td>" + k + "</td><td>" + val + "</td></tr>";
    const far = (h.note_codes || []).includes("far_elevation");
    if (pct == null) { box.innerHTML = '<p class="verdict">' + esc(verdict) + "</p>" + (seas.length ? '<p class="note">' + esc(I18N.tu("Compared with {a} past winters.", seas.length)) + "</p>" : ""); return; }
    box.innerHTML = '<p class="verdict">' + esc(verdict) + '</p><p class="anom">' + esc(anom) + "</p>" + bar +
      '<table class="kv">' + row("Today", U.depth(v)) + row("Usual on this date", U.depth(p50)) + row("Normal range", U.dep(p25) + "–" + U.depth(p75)) +
      row("Lowest – highest", U.dep(mn) + "–" + U.depth(mx)) +
      (best ? row("Deepest winter peak", U.depth(best.max_depth_cm) + ' <small class="none">' + sz(best) + "</small>") : "") + (worst && best && worst !== best ? row("Lowest winter peak", U.depth(worst.max_depth_cm) + ' <small class="none">' + sz(worst) + "</small>") : "") + "</table>" +
      (seas.length ? '<p class="note">' + esc(I18N.tu("Compared with {a} past winters.", seas.length)) + (far ? " " + esc(I18N.t("Past winters are estimated for the mountain around this spot, so take the comparison as a guide.")) : "") + "</p>" : "");
  }
  // the nearest QC-ok measuring station (25 km, 36 h) next to the model at this spot: values, distance, height
  // difference and both last days side by side (measured at the station vs modelled here)
  async function stationBlock(pt, ctx, byDate) {
    const box = $("ptStn"); if (!box) return;
    const ns = ctx.ns === undefined ? nearestStation(pt.lat, pt.lon, ctx.elev) : ctx.ns;
    if (!ns) { box.innerHTML = '<p class="none">' + esc(I18N.tu("No measured station within {a} km", U.kmN(25))) + "</p>"; return; }
    const r = ns.r, hist = await loadHist();
    if (!$("ptStn")) return;
    const dE = ctx.elev != null && r[3] ? Math.round((r[3] - ctx.elev) / 10) * 10 : null;
    const dates = hist.dates || [], mv = (hist.rows && hist.rows[ns.i]) || [];
    const mod = dates.map((d) => (byDate[d] ? byDate[d].dep : null));
    let chart = "";
    const all = [...mv, ...mod].filter((x) => x != null);
    if (dates.length > 1 && all.length) {
      const W = 340, H = 120, L = 30, T = 10, B = 22, R = 18, mxv = Math.max(10, ...all) * 1.12;
      const x = (k) => L + (k / (dates.length - 1)) * (W - L - R), y = (q) => H - B - (q / mxv) * (H - B - T);
      const ln = (arr) => { let a = "", pen = false; arr.forEach((q, k) => { if (q == null) { pen = false; return; } a += (pen ? "L" : "M") + x(k).toFixed(1) + "," + y(q).toFixed(1); pen = true; }); return a; };
      const dots = (arr, f) => arr.map((q, k) => (q == null ? "" : '<circle cx="' + x(k).toFixed(1) + '" cy="' + y(q).toFixed(1) + '" r="2.6" fill="' + f + '"/>')).join("");
      chart = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Measured at the station and modelled here, last days">' +
        '<line x1="' + L + '" x2="' + W + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="var(--hair)"/>' +
        '<text x="' + (L - 4) + '" y="' + (T + 4) + '" text-anchor="end">' + U.dep(mxv / 1.12) + "</text><text x=\"" + (L - 4) + '" y="' + (H - B) + '" text-anchor="end">0</text>' +
        '<path d="' + ln(mod) + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 3"/>' + dots(mod, "var(--accent)") +
        '<path d="' + ln(mv) + '" fill="none" stroke="var(--ink)" stroke-width="2.2"/>' + dots(mv, "var(--ink)") +
        dates.map((d, k) => (k % 2 === (dates.length - 1) % 2 ? '<text x="' + x(k).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + (d === DATA.today ? esc(I18N.t("Today")) : dnum(d)) + "</text>" : "")).join("") + "</svg>" +
        '<div class="keyrow"><span><i style="background:var(--ink)"></i>measured at the station</span><span><i style="background:var(--accent)"></i>modelled here</span></div>';
    }
    const tm = byDate[DATA.today];
    box.innerHTML = '<div class="stncmp" data-stnfly="' + ns.i + '"><div class="sv"><div class="over">Measured</div><b>' + cmS(r[4]) + "</b><small>" + esc(r[2]) + "</small></div>" +
      '<div class="sv"><div class="over">Modelled here</div><b>' + (tm ? cmS(tm.dep) : "–") + "</b><small>" + (ctx.elev != null ? U.elev(ctx.elev) : "") + "</small></div></div>" +
      '<table class="kv">' + "<tr><td>Distance</td><td>" + U.dist(ns.km) + "</td></tr>" +
      (r[3] ? "<tr><td>Station height</td><td>" + U.elev(r[3]) + (dE != null && Math.abs(dE) >= 50 ? ' <small class="none">' + esc(I18N.tu(dE > 0 ? "{a} m higher" : "{a} m lower", U.ev(Math.abs(dE)))) + "</small>" : "") + "</td></tr>" : "") +
      "<tr><td>Measured at</td><td>" + esc(stnTime(r[5])) + "</td></tr></table>" + chart;
    bindStations($("pbody"));
  }
  async function sharePoint(pt, n, today) {
    const url = "https://snowscope.app/?p=" + pt.lat + "," + pt.lon + "&d=" + st.day;
    if (window.SSPost) {
      toast("Preparing the image…", 3000);
      const snap = await shot3d(pt.lat, pt.lon);
      const ms = nearestStation(pt.lat, pt.lon, null);
      window.SSPost.open({ big: today.dep != null ? U.depth(today.dep) : "–", big2: today.nw ? "+" + U.depth(today.nw) : "", sub: "Snow on the ground" + (ms ? " · " + I18N.t("Measured nearby") + ": " + ms.r[2] + " " + U.depth(ms.r[4]) : ""),
        place: n ? "Near " + n[0].short : "", date: longDay(st.day), snapshot: snap, file: "snowscope-spot", url });
      return;
    }
    const text = (n ? n[0].short + ": " : "") + (today.dep != null ? U.depth(today.dep) : "") + (today.nw ? ", +" + U.depth(today.nw) + " new" : "");
    if (navigator.share && matchMedia("(pointer:coarse)").matches) { try { await navigator.share({ title: "SnowScope", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    shareModal(text, url);
  }
  function stayMapHref(lat, lon, place) {      // "See other deals": the Stay22 map of the area for the selected dates
    const c = SS.S.cfg && SS.S.cfg.stay22;
    if (!c || !c.aid || SS.staysHidden()) return "";
    const day = st.day > DATA.today ? st.day : DATA.today;
    const q = new URLSearchParams({ aid: c.aid, lat: lat.toFixed(4), lng: lon.toFixed(4), venue: place, checkin: day, checkout: addDays(day, 1),
      adults: "2", campaign: "snowscope_web_mappin_map" });
    return "https://www.stay22.com/embed/gm?" + q.toString();
  }
  // "Stays near the slopes": the Stay22 map of places to stay around a resort / piste, inside a collapsible card
  // (collapsed by default on phones, open state remembered), dates + guests + 3 quick filters drive the embed URL,
  // the iframe loads only when the card is open (and, in Europe, after consent or an explicit click)
  const STAYF = { budget: "Under {a}", rentals: "Chalets & apartments", rated: "Top rated" };
  function stayUrl(o) {
    const c = SS.S.cfg && SS.S.cfg.stay22;
    if (!c || !c.aid) return "";
    const q = new URLSearchParams({ aid: c.aid, lat: o.lat.toFixed(5), lng: o.lon.toFixed(5), venue: o.place, checkin: o.cin, checkout: o.cout, adults: String(o.adults),
      campaign: "snowscope_web_" + o.where + "map", maincolor: "1463F3", zoom: "13", hidesettings: "true", hidebrandlogo: "true", hidefooter: "true",
      ljs: (I18N.lang || "en"), currency: U.us() ? "USD" : "EUR", unitsystem: U.us() ? "imperial" : "metric", mapstyle: isDarkTheme() ? "dark" : "light" });
    if (o.f.budget) { q.set("max", "150"); q.set("priceper", "nightly"); }
    if (o.f.rentals) q.set("showhotels", "false");
    if (o.f.rated) q.set("minguestrating", "8");
    return "https://www.stay22.com/embed/gm?" + q.toString();
  }
  function stayModule(lat, lon, place, where) {
    if (SS.staysHidden() || !(SS.S.cfg && SS.S.cfg.stay22 && SS.S.cfg.stay22.aid)) return "";
    const cin0 = st.day > DATA.today ? st.day : DATA.today;
    const sv = (() => { try { return JSON.parse(sessionStorage.getItem("ss_staysel") || "null") || {}; } catch { return {}; } })();
    const cin = sv.cin && sv.cin >= DATA.today ? sv.cin : cin0, cout = sv.cout && sv.cout > cin ? sv.cout : addDays(cin, 1), ad = sv.adults || 2;
    const open = get("ss_fold_stays", innerWidth > 760 ? 1 : 0);
    return '<details class="fold stays" data-fold="stays" data-lat="' + lat + '" data-lon="' + lon + '" data-place="' + esc(place) + '" data-where="' + where + '"' + (open ? " open" : "") + ">" +
      '<summary>Stays near the slopes<span class="partner">Partner</span></summary>' +
      '<p class="note" style="margin:0 0 8px">Partner · we may earn a commission from bookings.</p>' +
      '<div class="stayctl"><label><span>Check-in</span><input type="date" data-cin value="' + cin + '" min="' + DATA.today + '"></label>' +
      '<label><span>Check-out</span><input type="date" data-cout value="' + cout + '" min="' + addDays(cin, 1) + '"></label>' +
      '<label><span>Guests</span><select data-adults>' + [1, 2, 3, 4, 5, 6, 8].map((n) => '<option value="' + n + '"' + (n === ad ? " selected" : "") + ">" + n + "</option>").join("") + "</select></label></div>" +
      '<div class="pills inl stayf" role="group" aria-label="Filters">' + Object.entries(STAYF).map(([k, v]) => '<button class="pill" data-sf="' + k + '" aria-pressed="' + !!(sv.f && sv.f[k]) + '">' +
        esc(k === "budget" ? I18N.tu(v, U.us() ? "$150" : "€150") : v) + "</button>").join("") + "</div>" +
      '<div class="staymap" data-staybox><div class="skel"></div></div>' +
      '<a class="btn tonal stayout" target="_blank" rel="sponsored noopener" data-stayout href="#"><span class="ms">open_in_new</span>Open the full map</a></details>';
  }
  function bindStays(box) {
    box.querySelectorAll("details.stays").forEach((d) => {
      const read = () => ({ lat: +d.dataset.lat, lon: +d.dataset.lon, place: d.dataset.place, where: d.dataset.where,
        cin: d.querySelector("[data-cin]").value || DATA.today, cout: d.querySelector("[data-cout]").value, adults: +d.querySelector("[data-adults]").value || 2,
        f: Object.fromEntries([...d.querySelectorAll("[data-sf]")].map((b) => [b.dataset.sf, b.getAttribute("aria-pressed") === "true"])) });
      let consent = null;
      const load = async (force) => {
        if (!d.open) return;
        const o = read();
        if (!o.cout || o.cout <= o.cin) { o.cout = addDays(o.cin, 1); d.querySelector("[data-cout]").value = o.cout; }
        d.querySelector("[data-cout]").min = addDays(o.cin, 1);
        try { sessionStorage.setItem("ss_staysel", JSON.stringify({ cin: o.cin, cout: o.cout, adults: o.adults, f: o.f })); } catch { /* private */ }
        const u = stayUrl(o), a = d.querySelector("[data-stayout]"); if (a) a.href = u;
        const sb = d.querySelector("[data-staybox]");
        if (consent === null) consent = await SS.stayConsent();
        if (!consent && !force) {
          sb.innerHTML = '<div class="stayask"><span class="ms">map</span><p>The map of places to stay comes from our booking partner.</p><button class="btn ink" data-stayload>Show the map</button></div>';
          sb.querySelector("[data-stayload]").onclick = () => { consent = true; load(true); };
          return;
        }
        const f = sb.querySelector("iframe");
        if (f) { if (f.src !== u) f.src = u; return; }
        sb.innerHTML = '<iframe loading="lazy" title="' + esc(I18N.t("Places to stay near") + " " + o.place) + '" src="' + esc(u) + '" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
      };
      d.addEventListener("toggle", () => { if (d.open) load(); });
      d.addEventListener("change", (e) => { if (e.target.matches("input,select")) load(); });
      d.querySelectorAll("[data-sf]").forEach((b) => { b.onclick = () => { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); load(); }; });
      if (d.open) load();
      if (st.openStays) { st.openStays = false; d.open = true; load(); setTimeout(() => d.scrollIntoView({ behavior: "smooth", block: "start" }), 250); }
    });
  }
  function stayHref(lat, lon, place, where, day) {
    if (SS.staysHidden()) return "";
    const u = SS.stayLink(lat, lon, place, day || st.day);
    return u ? u.replace("campaign=snowscope_web", "campaign=snowscope_web_" + where) : "";
  }

  // ------------------------------------------------------------------ share a resort with friends
  async function shot3d(lat, lon) {
    // the map itself, flown to the spot: pitched 3D terrain (Mapbox) with the snow draped on it, then restored
    const cam = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    const hadTerrain = st.terrain;
    if (!hadTerrain) { ensureDem(); map.setTerrain({ source: "dem", exaggeration: 1.5 }); }
    map.jumpTo({ center: [lon, lat], zoom: 11.2, pitch: 62, bearing: -18 });
    if (map.getSource("pt")) map.getSource("pt").setData({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] } });
    loadFine();
    await idle(); await new Promise((r) => setTimeout(r, 250));
    const img = snapshot();
    if (!hadTerrain) map.setTerrain(null);
    map.jumpTo(cam);
    return img;
  }
  async function shareResort(slug, date) {
    const res = await RES.catch(() => null), x = BY[slug];
    if (!x || !res) return;
    const i0 = res.dates.indexOf(date), sn = x.snow[i0 >= 0 ? i0 : res.dates.indexOf(DATA.today)] || [];
    toast("Preparing the image…", 3000);
    const snap = await shot3d(x.lat, x.lon);
    const bd = bestDay(res, x);
    window.SSPost.open({ big: sn[0] != null ? U.depth(sn[0]) : "–", big2: sn[1] ? "+" + U.depth(sn[1]) : "", sub: "on the upper slopes", place: x.short,
      date: longDay(date), extra: bd ? "Best day: " + bd : "", snapshot: snap, file: "snowscope-" + slug,
      url: "https://snowscope.app/resorts/" + encodeURIComponent(slug) + ".html?d=" + date });
  }
  async function shareResortLink(slug, date) {
    const res = await RES.catch(() => null), x = BY[slug];
    if (!x || !res) return;
    const i = res.dates.indexOf(date), s = x.snow[i >= 0 ? i : res.dates.indexOf(DATA.today)] || [];
    const url = "https://snowscope.app/resorts/" + encodeURIComponent(slug) + ".html?d=" + date;
    const t = (q) => (window.I18N ? I18N.t(q) : q);
    const text = x.short + ": " + (s[0] != null ? U.depth(s[0]) + " " + t("on the upper slopes") : t("snow report")) + (s[1] ? ", +" + U.depth(s[1]) + " " + t("new") : "") +
      " (" + (date === DATA.today ? t("Today") : wd(date) + " " + dnum(date)) + ")";
    if (navigator.share && matchMedia("(pointer:coarse)").matches) { try { await navigator.share({ title: "SnowScope", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    shareModal(text, url);
  }
  function shareModal(text, url) {
    const t = (q) => (window.I18N ? I18N.t(q) : q);
    const m = SS.modal(SS.head(t("Share with friends")) + '<p style="margin:0 0 10px">' + esc(text) + '</p><div class="filters"><a class="btn ink" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text + " " + url) +
      '"><span class="ms">chat</span>WhatsApp</a><button class="btn tonal" data-copylink><span class="ms">link</span>' + t("Copy link") + "</button></div>" +
      '<input readonly class="filter" style="max-width:none;width:100%" value="' + esc(url) + '">');
    m.el.querySelector("[data-copylink]").onclick = async (e) => { try { await navigator.clipboard.writeText(text + " " + url); e.currentTarget.lastChild.textContent = t("Copied"); } catch { m.el.querySelector("input").select(); } };
  }

  // ------------------------------------------------------------------ post images (post.js)
  function snapshot() {
    const src = map.getCanvas(), c = document.createElement("canvas");
    c.width = src.width; c.height = src.height; c.getContext("2d").drawImage(src, 0, 0);
    return c;
  }
  const idle = () => new Promise((ok) => { let done = false; const f = () => { if (!done) { done = true; ok(); } }; map.once("idle", f); setTimeout(f, 6000); });
  async function stormPost(x) {
    if (!x || !map) return;
    toast("Preparing the image…", 4000);
    st.day = x.date; st.main = "powder"; st.p72 = x.hours === 72; drawDays(); drawLegend();
    map.jumpTo({ center: [x.lon, x.lat], zoom: 8 });
    renderMain(); await idle(); await new Promise((r) => setTimeout(r, 400));
    const place = x.place || NAMES[x.region] || "";
    SSPost.open({ big: "+" + U.depth(x.cm), sub: x.hours === 72 ? "in 3 days" : "in 24 hours", place, date: longDay(x.date),
      url: "https://snowscope.app/?r=" + (x.slug || x.lat + "," + x.lon), snapshot: snapshot(), file: "snowscope-storm-" + (x.slug || x.region.toLowerCase()) });
    if (!st.pro) { st.p72 = false; }
  }
  async function viewPost() {
    await idle();
    const r = regionAt(map.getCenter()) || DATA.regions.find((y) => y.code === st.region), d = r ? dayOf(r) : null;
    const big = d ? (st.main === "powder" ? "+" + U.depth(d.new_max_cm) : (d.top[0] ? U.depth(d.top[0].depth_cm) : "–")) : "–";
    const c = map.getCenter();
    SSPost.open({ big, sub: st.main === "powder" ? "New snow" : "Snow depth", place: r ? r.name : "", date: longDay(st.day),
      url: "https://snowscope.app/#@" + c.lat.toFixed(3) + "," + c.lng.toFixed(3) + "," + map.getZoom().toFixed(1), snapshot: snapshot(), file: "snowscope-map" });
  }
  async function proPost(kind) {
    const res = await RES.catch(() => null);
    if (!res) return;
    const ti = res.dates.indexOf(DATA.today);
    const r = DATA.regions.find((y) => y.code === (kind === "ski" ? st.ski.region : st.region)) || DATA.regions[0];
    let rows;
    if (kind === "powder") rows = res.rows.filter((x) => x.snow[ti] && x.snow[ti][st.p72 ? 2 : 1] >= 1).sort((a, b) => b.snow[ti][st.p72 ? 2 : 1] - a.snow[ti][st.p72 ? 2 : 1]).slice(0, 5)
      .map((x) => [x.short, "+" + U.depth(x.snow[ti][st.p72 ? 2 : 1]) + " · " + U.depth(x.snow[ti][0] || 0)]);
    else rows = res.rows.filter((x) => x.dom === r.code && x.snow[ti] && x.snow[ti][0] != null).sort((a, b) => (b.snow[ti][0] + 3 * (b.snow[ti][1] || 0)) - (a.snow[ti][0] + 3 * (a.snow[ti][1] || 0))).slice(0, 5)
      .map((x) => [x.short, U.depth(x.snow[ti][0]) + (x.snow[ti][1] ? " · +" + U.dep(x.snow[ti][1]) : "")]);
    const d = dayOf(r);
    const best = (() => { let b = null; for (const y of r.days) if (y.date >= DATA.today && (!b || y.new_max_cm > b.new_max_cm)) b = y; return b; })();
    await idle();
    SSPost.open({ big: kind === "powder" ? "+" + U.depth(d.new_max_cm || 0) : (d.top[0] ? U.depth(d.top[0].depth_cm) : "–"),
      sub: kind === "powder" ? "Fresh snow today" : "Where to ski today", place: r.name,
      date: longDay(DATA.today) + (best && best.new_max_cm >= 5 ? " · " + wd(best.date) + " +" + U.depth(best.new_max_cm) : ""),
      lines: rows, url: "https://snowscope.app/#" + slugOf(r.code), snapshot: snapshot(), locked: !st.pro, file: "snowscope-" + kind,
      caption: null });
  }

  // ------------------------------------------------------------------ resort panel
  function openResort(slug, { push = true } = {}) {
    const x = BY[slug];
    st.slug = slug;
    if (push) { history.pushState({ slug }, "", BASE + "resorts/" + encodeURIComponent(slug) + ".html"); st.pushed = true; }
    setTimeout(() => SS.pageView(), 50);
    if (popup) popup.remove();
    if (x && map) map.flyTo({ center: [x.lon, x.lat], zoom: Math.max(map.getZoom(), 10), duration: 1100, padding: innerWidth > 760 ? { left: 420 } : { bottom: 300 } });
    if (innerWidth <= 760) setSheet("half");
    $("pbody").scrollTop = 0;
    renderPanel();
  }
  function closeResort(silent) {
    st.slug = null;
    document.title = "SnowScope · Snow depth today in the Alps, Pyrenees and North America";
    if (st.pushed) { st.pushed = false; history.pushState(null, "", BASE + "#" + slugOf(st.region)); }
    else history.replaceState(null, "", BASE + "#" + slugOf(st.region));
    if (!silent) renderPanel();
  }
  const seasonBest = (weeks) => {
    const name = (w) => { const d = new Date(Date.UTC(2027, 0, 4 + (w - 1) * 7)); const m = d.toLocaleDateString(LOC, { month: "long", timeZone: "UTC" }); const day = d.getUTCDate(); return (day <= 10 ? "early " : day <= 20 ? "mid " : "late ") + m; };
    return [...new Set(weeks.map(name))].slice(0, 2).join(" and ");
  };
  async function resortView(slug) {
    const box = $("pbody");
    const res = await RES.catch(() => null);
    await loadStations();
    const x = res && BY[slug];
    const s30 = x ? await s30Point(x.lat, x.lon) : null;
    if (st.slug !== slug) return;
    if (!x) { box.innerHTML = '<button class="back" data-back><span class="ms">arrow_back</span>Back</button><p class="msg">This resort could not be loaded.</p>'; box.querySelector("[data-back]").onclick = () => closeResort(); return; }
    document.title = x.short + " snow depth today · SnowScope";
    const ti = res.dates.indexOf(DATA.today) >= 0 ? res.dates.indexOf(DATA.today) : 2;
    const [d0, n0] = x.snow[ti] || [];
    const verdict = d0 == null ? "No snow data here yet." : d0 >= 100 ? "Deep snow." : d0 >= 40 ? "Good snow cover." : d0 >= 10 ? "Some snow." : d0 >= 1 ? "A thin layer." : "No snow yet.";
    const near = res.rows.filter((y) => y.dom === x.dom && y.slug !== slug).map((y) => [Math.hypot((y.lon - x.lon) * Math.cos(x.lat * Math.PI / 180), y.lat - x.lat) * 111, y]).sort((a, b) => a[0] - b[0]).slice(0, 6);
    box.innerHTML = '<button class="back" data-back><span class="ms">arrow_back</span>' + esc(NAMES[x.dom] || "Back") + "</button>" +
      '<div class="over">' + esc([x.region, x.country].filter(Boolean).join(" · ")) + "</div><h1>" + esc(x.short) + '</h1><p class="lede">' + esc(x.name !== x.short ? x.name : "") +
      (x.base_m && x.top_m ? (x.name !== x.short ? " · " : "") + U.ev(x.base_m) + "–" + U.elev(x.top_m) : "") + "</p>" +
      '<div class="hero2"><div class="card"><div class="over">Upper slopes today</div><b class="n">' + (d0 == null ? "–" : cmS(d0)) + '</b><small class="none">' + verdict + "</small></div>" +
      '<div class="card"><div class="over">New snow</div>' + (n0 >= 1 ? '<b class="n acc">+' + cmS(n0) + "</b><small class=\"none\">in 24 hours</small>" : '<b class="n">–</b><small class="none">No new snow in 24 h</small>') + "</div></div>" +
      (s30 ? '<p class="measured s30"><span class="k">Sharp 30 m</span> <b>' + U.depth(Math.round(s30.depth_cm)) + "</b>" + (s30.elevation_m ? " · " + U.elev(s30.elevation_m) : "") + "</p>" : "") +
      measuredHtml(x.lat, x.lon, x.top_m || null, false) +
      '<div class="sect">Snow depth on the upper slopes, ' + U.du() + '</div><div id="rDays"></div>' +
      adSlot("resort", x) +
      '<div class="sect">This season vs past winters</div><div id="rHist"></div>' +
      '<div class="sect">Next 7 days</div><div id="rFc"></div>' +
      stayModule(x.lat, x.lon, x.short, "panel") +
      '<div class="sect">Nearby resorts</div>' + near.map(([km, y]) => resRow(y, null, (y.snow[ti] || [])[0], U.dist(Math.round(km)), (y.snow[ti] || [])[1])).join("") + appCard() + footer();
    box.querySelector("[data-back]").onclick = () => (st.pushed ? history.back() : closeResort());
    box.querySelector(".hero2").insertAdjacentHTML("afterend", '<div class="acts3" style="margin-bottom:6px"><a class="btn tonal" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + x.lat + "," + x.lon + '"><span class="ms">directions_car</span>Directions</a><button class="btn ink" data-share="' + esc(slug) + '" data-sd="' + st.day + '"><span class="ms">share</span>Share</button>' +
      (stayModule(0, 0, "", "x") ? '<button class="btn tonal" data-gostays><span class="ms">hotel</span>Stays</button>' : "") + "</div>" +
      '<a class="rowlink" href="' + BASE + "studio.html?slug=" + encodeURIComponent(slug) + '"><span class="ms">movie</span><span><b>Create a 3D video</b><small>A short flyover of ' + esc(x.short) + ' with today\'s snow</small></span><span class="ms">chevron_right</span></a>');
    const gs = box.querySelector("[data-gostays]");
    if (gs) gs.onclick = () => { const d = box.querySelector("details.stays"); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } };
    afterRender();
    daysChart(x, res);
    histChart(x);
    forecast(x);
  }
  // "3D videos" card (Powder tab): the first demo cover from the static studio/demos.json, opens the 3D Studio page
  let demosLoad = null;
  function fillDemos() {
    const el = $("demos3d"); if (!el) return;
    if (!demosLoad) demosLoad = SS.getJSON(BASE + "studio/demos.json").catch(() => ({ demos: [] }));
    demosLoad.then((j) => {
      const e2 = $("demos3d"), d = (j.demos || [])[0]; if (!e2 || !d) return;
      e2.innerHTML = '<a class="card demo3d" href="' + BASE + 'studio.html"><img src="' + esc(BASE + d.cover_url) + '" alt="" loading="lazy"><span class="tx"><span class="over">3D videos</span><b>' + esc(d.title) + "</b><small>" +
        esc((d.subtitle || "").replace(/(\d+(?:\.\d+)?) ?cm\b/g, (m, v) => U.depth(+v))) + '</small><span class="lnk">See the 3D demos<span class="ms">chevron_right</span></span></span></a>';
    });
  }
  function svgBars(days, todayD, locked) {
    const W = 360, H = 150, n = days.length, bw = W / n, max = Math.max(20, ...days.map((d) => d.dep || 0)) * 1.15;
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Snow depth per day">';
    days.forEach((d, i) => {
      const x = i * bw, h = d.dep ? (d.dep / max) * (H - 46) : 0, today = d.date === todayD;
      const col = d.date > todayD ? "var(--accent-tint)" : "var(--accent)";
      s += '<rect x="' + (x + bw * 0.18) + '" y="' + (H - 30 - h) + '" width="' + bw * 0.64 + '" height="' + Math.max(h, 1) + '" rx="3" fill="' + (today ? "var(--ink)" : col) + '"' + (d.date > todayD ? ' stroke="var(--accent)" stroke-width="1"' : "") + "/>";
      if (d.dep != null) s += '<text class="lbl" x="' + (x + bw / 2) + '" y="' + (H - 34 - h) + '" text-anchor="middle">' + U.dep(d.dep) + "</text>";
      if (d.nw >= 1) s += '<text x="' + (x + bw / 2) + '" y="' + 12 + '" text-anchor="middle" style="fill:var(--accent-ink);font-weight:650">+' + U.dep(d.nw) + "</text>";
      s += '<text x="' + (x + bw / 2) + '" y="' + (H - 16) + '" text-anchor="middle">' + (today ? "Today" : wd(d.date)) + '</text><text x="' + (x + bw / 2) + '" y="' + (H - 3) + '" text-anchor="middle">' + dnum(d.date) + "</text>";
    });
    return s + "</svg>" + '<div class="keyrow"><span><i style="background:var(--accent)"></i>past</span><span><i style="background:var(--accent-tint);outline:1px solid var(--accent)"></i>forecast</span><span style="color:var(--accent-ink)">+N new snow</span></div>' + (locked || "");
  }
  async function daysChart(x, res) {
    const box = $("rDays");
    const stat = res.dates.map((d, i) => ({ date: d, dep: (x.snow[i] || [])[0], nw: (x.snow[i] || [])[1] }));
    const lock = '<div class="prolock" style="margin-top:10px"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>15 days at ' + esc(x.short) + "</b><br>The past week and the week ahead.</p><button class=\"btn ink\" data-up>See 15 days</button></div>";
    if (!st.pro) { box.innerHTML = svgBars(stat, DATA.today, lock); box.querySelector("[data-up]").onclick = () => SS.upsell("15 days of snow at " + x.short + " are in Pro"); return; }
    box.innerHTML = svgBars(stat, DATA.today);
    try {
      const fine = DATA.regions.some((r) => r.code === x.dom && r.fine);
      const p = await SS.api((fine ? "/v1/g500/point" : "/v1/grid/point") + "?lat=" + x.lat + "&lon=" + x.lon);
      const days = (p.days || []).filter((d) => d.date >= addDays(DATA.today, -7) && d.date <= addDays(DATA.today, 7)).map((d) => ({ date: d.date, dep: d.depth_cm == null ? null : Math.round(d.depth_cm), nw: Math.round(d.new_cm || 0) }));
      if (days.length > stat.length && st.slug === x.slug) box.innerHTML = svgBars(days, DATA.today);
    } catch { /* keep the free days */ }
  }
  async function histChart(x) {
    const box = $("rHist");
    let h = null;
    if (x.h) { try { h = await SS.getJSON(BASE + "snow/hist/" + encodeURIComponent(x.slug) + ".json?v=" + DATA.digest); } catch { h = null; } }
    if (!h && st.pro) {
      try {
        const v = await SS.api("/v1/history/resort/" + encodeURIComponent(x.slug));
        const c = v.climatology, keep = c.mmdd.map((m, i) => [m, i]).filter(([m]) => m >= "10-01" || m <= "05-31");
        h = { mmdd: keep.map(([m]) => m), p10: keep.map(([, i]) => c.p10[i]), p50: keep.map(([, i]) => c.p50[i]), p90: keep.map(([, i]) => c.p90[i]),
          current: v.current.map((q) => [q.date, q.depth_cm]), best_weeks: v.best_weeks.slice(0, 3).map((w) => w.week) };
      } catch (e) { box.innerHTML = '<p class="msg">' + (e.down ? "Pro data is updating, try again in a minute." : "No past winters for this resort yet.") + "</p>"; return; }
    }
    if (!h) {
      box.innerHTML = '<div class="prolock"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>Is this a good winter?</b><br>This season against the last 34 winters, and the best weeks to go.</p><button class="btn ink" data-up>See past winters</button></div>';
      box.querySelector("[data-up]").onclick = () => SS.upsell("Past winters at " + x.short + " are in Pro");
      return;
    }
    const W = 360, H = 170, n = h.mmdd.length, idx = Object.fromEntries(h.mmdd.map((m, i) => [m, i]));
    const cur = h.current.filter(([d, v]) => v != null && idx[d.slice(5)] != null).map(([d, v]) => [idx[d.slice(5)], v]);
    const max = Math.max(30, ...h.p90.filter((v) => v != null), ...cur.map((c) => c[1])) * 1.1;
    const X = (i) => (i / (n - 1)) * W, Y = (v) => H - 22 - (v / max) * (H - 30);
    let band = "", med = "";
    h.mmdd.forEach((m, i) => { if (h.p90[i] != null) band += (band ? "L" : "M") + X(i).toFixed(1) + "," + Y(h.p90[i]).toFixed(1); });
    for (let i = n - 1; i >= 0; i--) if (h.p10[i] != null) band += "L" + X(i).toFixed(1) + "," + Y(h.p10[i]).toFixed(1);
    h.mmdd.forEach((m, i) => { if (h.p50[i] != null) med += (med ? "L" : "M") + X(i).toFixed(1) + "," + Y(h.p50[i]).toFixed(1); });
    const line = cur.map(([i, v], k) => (k ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1)).join("");
    const months = ["10-01", "11-01", "12-01", "01-01", "02-01", "03-01", "04-01", "05-01"], mn = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    const ti = idx[DATA.today.slice(5)];
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Snow depth this season compared with past winters">' +
      '<path d="' + band + 'Z" fill="var(--accent-tint)"/><path d="' + med + '" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      (line ? '<path d="' + line + '" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>' : "") +
      (ti != null ? '<line x1="' + X(ti) + '" x2="' + X(ti) + '" y1="4" y2="' + (H - 22) + '" stroke="var(--ink3)" stroke-dasharray="2 3"/>' : "") +
      months.map((m, k) => (idx[m] != null ? '<text x="' + X(idx[m]) + '" y="' + (H - 6) + '">' + mn[k] + "</text>" : "")).join("") +
      '<text x="' + (W - 2) + '" y="12" text-anchor="end">' + U.depth(Math.round(max / 1.1)) + "</text></svg>";
    const last = cur[cur.length - 1];
    let verdict = "";
    if (last && h.p50[last[0]] != null) {
      const p50 = h.p50[last[0]], p10 = h.p10[last[0]], p90 = h.p90[last[0]];
      verdict = last[1] > p90 ? "Much more snow than usual for this time of year." : last[1] > p50 * 1.2 + 2 ? "More snow than usual for this time of year."
        : last[1] < p10 ? "Much less snow than usual for this time of year." : last[1] < p50 * 0.8 - 2 ? "Less snow than usual for this time of year." : "About as much snow as usual for this time of year.";
    }
    box.innerHTML = (verdict ? '<p style="margin:0 0 8px;font-weight:620">' + verdict + "</p>" : "") + s +
      '<div class="keyrow"><span><i style="background:var(--ink)"></i>this season</span><span><i style="background:var(--accent)"></i>usual</span><span><i style="background:var(--accent-tint)"></i>most winters</span></div>' +
      (h.best_weeks && h.best_weeks.length ? '<p style="margin:10px 0 0;font-size:14px"><span class="ms" style="font-size:18px;color:var(--accent)">event</span> Usually the best time to go: <b>' + seasonBest(h.best_weeks) + "</b></p>" : "");
  }
  async function forecast(x) {
    const box = $("rFc");
    if (!st.pro) {
      box.innerHTML = '<div class="prolock"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>7 more days at ' + esc(x.short) + "</b><br>New snow, temperature and wind for each day.</p><button class=\"btn ink\" data-up>See 7 days</button></div>";
      box.querySelector("[data-up]").onclick = () => SS.upsell("The 7-day forecast for " + x.short + " is in Pro");
      return;
    }
    box.innerHTML = '<p class="none">Loading…</p>';
    try {
      const rep = await SS.api("/v1/resorts/" + encodeURIComponent(x.slug) + "/report");
      const m = (q) => (q && q.median != null ? q.median : null);
      box.innerHTML = (rep.powder_score ? '<p style="margin:0 0 8px">Powder score today: <b>' + (Math.round(rep.powder_score.score * 10) / 10) + " / 10</b></p>" : "") +
        '<table class="fc"><thead><tr><th>Day</th><th>New snow</th><th>Low / high</th><th>Wind</th></tr></thead><tbody>' +
        (rep.outlook || []).map((d) => "<tr><td>" + wd(d.date) + " " + dnum(d.date) + "</td><td>" + (m(d.snowfall_cm) >= 1 ? U.depth(Math.round(m(d.snowfall_cm))) + "" : "–") + "</td><td>" +
          (m(d.temp_min_c) != null ? U.tv(m(d.temp_min_c)) + "° / " + U.tv(m(d.temp_max_c)) + "°" : "–") + "</td><td>" + (m(d.wind_max_kmh) != null ? U.wind(m(d.wind_max_kmh)) : "–") + "</td></tr>").join("") + "</tbody></table>" +
        (rep.bulletin && rep.bulletin.url ? '<p style="margin:8px 0 0;font-size:13.5px"><a target="_blank" rel="noopener" href="' + esc(rep.bulletin.url) + '">Official avalanche bulletin · ' + esc(rep.bulletin.provider || "") + "</a></p>" : "");
    } catch (e) { box.innerHTML = '<p class="msg">' + (e.status === 422 ? "No forecast for this resort yet." : "Pro data is updating, try again in a minute.") + "</p>"; }
  }
  // ------------------------------------------------------------------ boot (runs after every helper is defined)
  async function main() {
  const started = SS.start();
  try { DATA = await SS.getJSON(BASE + "snow/data.json?v=" + Math.floor(Date.now() / 3e5)); }
  catch { toast("Today's snow could not be loaded. Try again in a minute.", 8000); return; }
  RES = SS.resorts().then((r) => { BY = Object.fromEntries(r.rows.map((x) => [x.slug, x])); return r; });
  st.day = DATA.dates.includes(DATA.today) ? DATA.today : DATA.dates[DATA.dates.length - 1];
  const dq = new URLSearchParams(location.search).get("d");
  if (dq && DATA.dates.includes(dq)) st.day = dq;
  st.region = homeRegion();
  st.ski.region = st.region;
  initialSlug = document.body.dataset.slug || null;
  window.SSApp = { open: (slug) => openResort(slug) };
  // bridge for the expert chrome (expert.js: layer rail, timeline scrub, hour steps, meteogram, keyboard, theme)
  window.SSApp.x = { st, data: () => DATA, map: () => map, setMain, setDay, toggleOver, overOn, layersSheet, play, isPlaying: () => !!playT, scrub, settle, radarFrame,
    isStatic, dayLocked, proLive, addDays, wd, dnum, longDay, D, fmt, toast, codeAt, regionAt, decDepth, renderMain, drawLegend, openPoint, closePoint,
    has: (id) => id === "stn" ? typeof drawStations === "function" : id === "s30" ? s30Enabled() : true, LOC, DEPTH, NEW, rampAt };
  drawRegions(); drawDays(); drawLegend(); setupSheet(); setupTabs();
  if (window.SSX) SSX.init(window.SSApp.x);
  $("layersBtn").onclick = layersSheet;
  $("btn3d").onclick = () => { st.terrain = !st.terrain; store.set("ss_terrain", st.terrain); $("btn3d").setAttribute("aria-pressed", st.terrain); applyTerrain(); };
  $("btn3d").setAttribute("aria-pressed", st.terrain);
  $("play").onclick = play;
  if (initialSlug) { st.slug = initialSlug; await RES.catch(() => null); }
  renderPanel();

  ML = await SS.mapLib();
  LIB = ML.lib;
  const R0 = DATA.regions.find((r) => r.code === st.region) || DATA.regions[0];
  const hash = /^#@(-?[\d.]+),(-?[\d.]+),([\d.]+)$/.exec(location.hash);
  // first paint already framed on the snow (no z5 overview that waits for the "load" event before jumping)
  const plain = !hash && !initialSlug && !new URLSearchParams(location.search).get("p") && !new URLSearchParams(location.search).get("r");
  if (plain) await Promise.race([RES.catch(() => null), new Promise((ok) => setTimeout(ok, 2500))]);
  const b0 = plain ? snowBounds(R0) : null;
  map = new LIB.Map({ container: "map", style: styleUrl(), center: R0.center, zoom: 5, minZoom: 2, attributionControl: { compact: true },
    ...(b0 ? { bounds: b0, fitBoundsOptions: { padding: startPad(), maxZoom: 8.2 } } : {}),
    transformRequest: (url) => SS.transformRequest(url), preserveDrawingBuffer: true, maxPitch: 75, dragRotate: true, pitchWithRotate: true });
  window.SSApp.map = map;
  zoomControls();   // own + / − / north / locate stack (owner 2026-11-02 "zoom in / zoom out, add them"), replaces the small MapLibre control
  map.on("style.load", onStyle);
  map.on("load", () => {
    const r = initialSlug && BY[initialSlug];
    const pq = /^(-?[\d.]+),(-?[\d.]+)$/.exec(new URLSearchParams(location.search).get("p") || "");
    if (pq) { map.jumpTo({ center: [+pq[2], +pq[1]], zoom: 9 }); openPoint({ lat: +pq[1], lon: +pq[2] }, { quiet: true }); }
    const rq = new URLSearchParams(location.search).get("r");
    const rll = rq && /^(-?[\d.]+),(-?[\d.]+)$/.exec(rq);
    if (rq && BY[rq] && !r) openResort(rq, { push: false });
    else if (rll) { map.jumpTo({ center: [+rll[2], +rll[1]], zoom: 8.5 }); setMain("powder"); }
    if (r) map.jumpTo({ center: [r.lon, r.lat], zoom: 10 });
    else if (hash) map.jumpTo({ center: [+hash[2], +hash[1]], zoom: +hash[3] });
    else if (!new URLSearchParams(location.search).get("p") && !new URLSearchParams(location.search).get("r")) RES.finally(() => flyRegion(st.region, true));   // framed on the snowy resorts
    map.on("click", onClick);
    map.on("error", (e) => {      // tiles refused (not signed in on a Pro-only server): the static map stays, chip off
      if (e && e.sourceId && String(e.sourceId).startsWith("m_s30_") && !st.s30fail && e.error && [401, 402, 403].includes(e.error.status)) { st.s30fail = true; removeS30(); chip30(); }
    });
    map.on("sourcedata", (e) => { if (e && e.sourceId && String(e.sourceId).startsWith("m_s30_") && e.isSourceLoaded && map.getSource(e.sourceId)) { st.s30loaded = true; chip30(); } });
    map.on("zoom", chip30);
    map.on("moveend", () => {
      chip30();
      if (!st.slug && !regionMove) history.replaceState(history.state, "", location.pathname + location.search + "#@" + map.getCenter().lat.toFixed(3) + "," + map.getCenter().lng.toFixed(3) + "," + map.getZoom().toFixed(1));
      regionMove = false;
      if (st.over.pistes) loadPistes();
      drawStays();
      refreshStations();
      loadFine();
    });
    refreshStations();                 // the start view was set above, before this listener existed
    loadFine();
    if (st.over.pistes) loadPistes();  // same: onStyle ran at the z5 start view
  });
  await started;
  SS.onChange(onAccount);
  onAccount(SS.S);
  loadS30();
  window.addEventListener("popstate", (e) => {
    const s = (e.state && e.state.slug) || null;
    if (s) openResort(s, { push: false }); else { st.slug = null; renderPanel(); }
  });
  }
  main();
})();
