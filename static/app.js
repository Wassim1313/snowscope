/* SnowScope public web map. No framework, no cookies, no tracking.
   Data: same-origin /v1 API. Basemap: OpenFreeMap positron (keyless) + AWS Terrain Tiles hillshade. */
(() => {
  "use strict";
  // same origin when served by the API; on GitHub Pages config.js sets window.SNOWSCOPE_API to the
  // current public tunnel URL (rewritten by tunnel/tunnel.sh whenever the tunnel address changes)
  const API = (window.SNOWSCOPE_API || "").replace(/\/$/, "");
  const STYLE = "https://tiles.openfreemap.org/styles/positron";
  const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  const RATE_COL = { great: "#6a3d9a", good: "#2171b5", fair: "#41b6c4", thin: "#9aa3ab" };
  const RATE_TXT = { great: "Great", good: "Good", fair: "Fair", thin: "Thin" };
  const MIN_Z_POINTS = 7;                           // spots + resort pins from this zoom
  const MIN_Z_PISTES = 12;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v, u = "") => (v == null || Number.isNaN(v) ? "–" : Math.round(v) + (u ? " " + u : ""));
  const safeUrl = (u) => (/^https?:\/\//.test(u || "") ? u : "https://www.avalanches.org/");
  const getJSON = async (path, signal) => {
    const r = await fetch(API + path, { signal });
    if (!r.ok) throw new Error(r.status + " " + path);
    return r.json();
  };
  const store = {                                   // per-viewer convenience only; may throw
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // ---------------------------------------------------------------- state
  const st = { grid: null, domains: [], days: [], dayIdx: 0, today: null, spots: new Map(),
    show: { snow: true, spots: true, resorts: true, pistes: true }, pistesIndex: null, pistesLoaded: new Set(),
    pistesFeatures: [], ctl: null, tileNow: {} };

  // initial view: #lat,lon,zoom (resort pages link here) else the Alps
  let center = [8.3, 46.3], zoom = 6;
  const h = location.hash.slice(1).split(",").map(Number);
  if (h.length >= 2 && h.every(Number.isFinite) && Math.abs(h[0]) <= 90) { center = [h[1], h[0]]; zoom = h[2] || 10; }

  const map = new maplibregl.Map({ container: "map", style: STYLE, center, zoom, maxZoom: 15,
    attributionControl: false, dragRotate: false, pitchWithRotate: false });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true,
    customAttribution: "Snow: Atlas Labs model · Weather: Open-Meteo · Ski areas: OpenSkiData · Relief: AWS Terrain Tiles" }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 90 }), "bottom-right");

  const firstSymbol = () => (map.getStyle().layers.find((l) => l.type === "symbol") || {}).id;

  // ---------------------------------------------------------------- day selector (free: today -2..+2)
  function isoLocal(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  function buildDays() {
    const days = st.days;
    const want = isoLocal(new Date());
    let t = days.findIndex((d) => d.date === want);
    if (t < 0) t = Math.max(0, days.findIndex((d) => d.kind === "forecast"));
    st.today = t;
    st.dayIdx = t;
    const box = $("days");
    box.innerHTML = "";
    for (let k = -2; k <= 2; k++) {
      const i = t + k, d = days[i], b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab");
      if (!d) { b.disabled = true; b.innerHTML = "&nbsp;<b>–</b>"; box.appendChild(b); continue; }
      const dt = new Date(d.date + "T12:00:00");
      b.innerHTML = `${dt.toLocaleDateString("en", { weekday: "short" })}<b>${dt.getDate()}</b>`;
      b.dataset.i = i;
      b.onclick = () => setDay(i);
      box.appendChild(b);
    }
    setDay(t);
  }
  function setDay(i) {
    st.dayIdx = i;
    const d = st.days[i];
    for (const b of $("days").children) b.setAttribute("aria-selected", String(+b.dataset.i === i));
    const dt = new Date(d.date + "T12:00:00");
    $("day-label").textContent = (i === st.today ? "Today · " : "") + dt.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" });
    $("day-kind").textContent = d.kind === "analysis" ? "analysis" : "forecast";
    $("legend-meta").textContent = `5 km snow model · ${d.kind} · run ${st.grid.run}`;
    for (const dom of st.domains) {                // each domain indexes its own days list
      const src = map.getSource("snow-" + dom.domain), j = domIdx(dom, d.date);
      const u = j >= 0 ? tileUrl(dom.domain, j) : null;
      if (src && u && st.tileNow[dom.domain] !== u) { st.tileNow[dom.domain] = u; src.setTiles([u]); }
      if (map.getLayer("snow-" + dom.domain)) map.setLayoutProperty("snow-" + dom.domain, "visibility", st.show.snow && j >= 0 ? "visible" : "none");
    }
    updateHint();
  }
  const domIdx = (dom, date) => dom.days.findIndex((x) => x.date === date);
  const tileUrl = (dom, i) => `${API || location.origin}/v1/grid/${dom}/tiles/depth_cm/${i}/{z}/{x}/{y}.png`;

  // ---------------------------------------------------------------- layers
  function addBaseLayers() {
    const before = firstSymbol();
    map.addSource("dem", { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 12 });
    map.addLayer({ id: "hillshade", type: "hillshade", source: "dem",
      paint: { "hillshade-exaggeration": 0.45, "hillshade-shadow-color": "#5b6b7a", "hillshade-highlight-color": "#ffffff",
        "hillshade-accent-color": "#8899a8" } }, before);
    const fc = { type: "FeatureCollection", features: [] };
    map.addSource("pistes", { type: "geojson", data: fc });
    map.addLayer({ id: "pistes", type: "line", source: "pistes", minzoom: MIN_Z_PISTES,
      paint: { "line-width": ["case", ["==", ["get", "_lift"], true], 1.4, 2],
        "line-dasharray": [1, 0],
        "line-color": ["case", ["==", ["get", "_lift"], true], "#333333",
          ["match", ["get", "_diff"], "novice", "#2e9e4f", "easy", "#2171b5", "intermediate", "#d33b2c",
            "advanced", "#111111", "expert", "#111111", "freeride", "#f08c00", "#7a8590"]] } }, before);
    map.addSource("spots", { type: "geojson", data: fc });
    map.addLayer({ id: "touring", type: "circle", source: "spots", minzoom: 8, filter: ["==", ["get", "kind"], "touring"],
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 10, 9],
        "circle-color": ["match", ["get", "rating"], "great", RATE_COL.great, "good", RATE_COL.good, "fair", RATE_COL.fair, RATE_COL.thin],
        "circle-opacity": 0.75, "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
    map.addSource("resorts", { type: "geojson", data: fc });
    map.addLayer({ id: "resort-pins", type: "circle", source: "resorts",
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 10, 11],
        "circle-color": "#ffffff", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 3],
        "circle-stroke-color": ["match", ["get", "rating"], "great", RATE_COL.great, "good", RATE_COL.good, "fair", RATE_COL.fair, "thin", RATE_COL.thin, "#0f8b8d"] } });
    map.addLayer({ id: "resort-depth", type: "symbol", source: "resorts", minzoom: 8,
      layout: { "text-field": ["to-string", ["coalesce", ["get", "depth_cm"], ""]], "text-size": 11,
        "text-font": ["Noto Sans Bold"], "text-allow-overlap": true },
      paint: { "text-color": "#17212b" } });
    map.addLayer({ id: "resort-names", type: "symbol", source: "resorts", minzoom: 9,
      layout: { "text-field": ["get", "name"], "text-size": 12, "text-font": ["Noto Sans Bold"],
        "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true },
      paint: { "text-color": "#0b5f61", "text-halo-color": "#fff", "text-halo-width": 1.6 } });
  }
  function addSnowLayers() {
    const before = map.getLayer("pistes") ? "pistes" : firstSymbol();   // above the relief, below labels
    for (const dom of st.domains) {
      const [w, s, e, n] = dom.bbox;
      st.tileNow[dom.domain] = tileUrl(dom.domain, Math.max(0, domIdx(dom, st.days[st.dayIdx].date)));
      map.addSource("snow-" + dom.domain, { type: "raster", tiles: [st.tileNow[dom.domain]], tileSize: 256,
        bounds: [w, s, e, n], minzoom: 3, maxzoom: 10, attribution: "" });
      map.addLayer({ id: "snow-" + dom.domain, type: "raster", source: "snow-" + dom.domain,
        paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.9, 11, 0.7], "raster-resampling": "nearest", "raster-fade-duration": 0 } }, before);
    }
  }
  function applyVisibility() {
    const vis = (on) => (on ? "visible" : "none");
    for (const dom of st.domains) if (map.getLayer("snow-" + dom.domain)) {
      const j = st.days.length ? domIdx(dom, st.days[st.dayIdx].date) : -1;
      map.setLayoutProperty("snow-" + dom.domain, "visibility", vis(st.show.snow && j >= 0));
    }
    map.setLayoutProperty("touring", "visibility", vis(st.show.spots));
    for (const id of ["resort-pins", "resort-depth", "resort-names"]) map.setLayoutProperty(id, "visibility", vis(st.show.resorts));
    map.setLayoutProperty("pistes", "visibility", vis(st.show.pistes));
    $("legend").style.display = st.show.snow ? "" : "none";
  }

  // ---------------------------------------------------------------- data for the view
  function bboxStr() {
    const b = map.getBounds();
    const c = (v, lo, hi) => Math.min(hi, Math.max(lo, v)).toFixed(3);
    return [c(b.getWest(), -180, 179.9), c(b.getSouth(), -90, 89.9), c(b.getEast(), -179.9, 180), c(b.getNorth(), -89.9, 90)].join(",");
  }
  function updateHint() {
    const z = map.getZoom();
    $("hint").textContent = z < MIN_Z_POINTS ? "Zoom in for resorts" : (st.dayIdx !== st.today ? "Where to ski: today only" : "");
  }
  let timer = 0;
  function refresh() {
    clearTimeout(timer);
    timer = setTimeout(loadView, 250);
  }
  async function loadView() {
    updateHint();
    if (st.ctl) st.ctl.abort();
    const ctl = (st.ctl = new AbortController());
    const empty = { type: "FeatureCollection", features: [] };
    if (map.getZoom() < MIN_Z_POINTS) {
      map.getSource("spots").setData(empty); map.getSource("resorts").setData(empty);
      return;
    }
    const bb = bboxStr();
    const today = st.days[st.today] ? "&day=" + st.days[st.today].date : "";
    const [spots, pins] = await Promise.allSettled([
      getJSON(`/v1/spots.geojson?bbox=${bb}${today}`, ctl.signal),
      getJSON(`/v1/map/resorts.geojson?bbox=${bb}&limit=2000`, ctl.signal)]);
    if (ctl.signal.aborted) return;
    st.spots.clear();
    const sf = spots.status === "fulfilled" ? spots.value.features : [];
    for (const f of sf) if (f.properties.kind === "resort") st.spots.set(f.properties.slug, f.properties);
    map.getSource("spots").setData({ type: "FeatureCollection", features: sf.filter((f) => f.properties.kind === "touring") });
    const pf = pins.status === "fulfilled" ? pins.value.features : [];
    for (const f of pf) {
      const s = st.spots.get(f.properties.slug);
      if (s) Object.assign(f.properties, { rating: s.rating, depth_cm: s.depth_cm });
    }
    map.getSource("resorts").setData({ type: "FeatureCollection", features: pf });
    loadPistes();
  }

  // pistes: optional endpoint; skipped silently when missing
  async function loadPistes() {
    if (!st.show.pistes || map.getZoom() < MIN_Z_PISTES) return;
    if (st.pistesIndex === null) {
      try { st.pistesIndex = await getJSON("/v1/pistes/index"); } catch { st.pistesIndex = false; }
    }
    if (!st.pistesIndex) return;
    const items = Array.isArray(st.pistesIndex) ? st.pistesIndex : (st.pistesIndex.items || st.pistesIndex.resorts || []);
    const b = map.getBounds();
    const hit = items.filter((it) => {
      const bb = it.bbox || (it.lat != null ? [it.lon, it.lat, it.lon, it.lat] : null);
      return bb && !(bb[2] < b.getWest() || bb[0] > b.getEast() || bb[3] < b.getSouth() || bb[1] > b.getNorth());
    }).slice(0, 6);
    let added = false;
    for (const it of hit) {
      const id = it.id || it.slug;
      if (!id || st.pistesLoaded.has(id)) continue;
      st.pistesLoaded.add(id);
      try {
        const g = await getJSON(`/v1/pistes/${encodeURIComponent(id)}.geojson`);
        for (const f of g.features || []) {
          const p = f.properties || {};
          p._lift = !!(p.lift || p.kind === "lift" || p.type === "lift" || p.aerialway || p["aerialway"]);
          p._diff = String(p.difficulty || p["piste:difficulty"] || "").toLowerCase();
          f.properties = p;
          st.pistesFeatures.push(f);
        }
        added = true;
      } catch { /* one resort failed: ignore */ }
    }
    if (added) map.getSource("pistes").setData({ type: "FeatureCollection", features: st.pistesFeatures });
  }

  // ---------------------------------------------------------------- popups
  const popup = new maplibregl.Popup({ maxWidth: "300px", closeButton: true });
  function rateBadge(r) { return r ? `<span class="rate r-${esc(r)}">${esc(RATE_TXT[r] || r)}</span>` : ""; }
  function bulletin(b) {
    return `<div class="bul">Avalanche: <a href="${esc(safeUrl(b && b.url))}" rel="noopener nofollow" target="_blank">${esc((b && b.provider) || "official bulletin")}</a></div>`;
  }
  function resortPopup(p, lngLat) {
    const s = st.spots.get(p.slug) || {};
    const glacier = s.glacier_suspect ? `<p class="note">Glacier firn in this cell: depth unrated.</p>` : "";
    popup.setLngLat(lngLat).setHTML(`<div class="pop"><h3>${esc(p.name)}</h3>
      <div class="sub">${num(p.base_m)}–${num(p.top_m)} m ${rateBadge(s.rating)}</div>
      <dl><dt>Snow depth (5 km cell)</dt><dd>${num(s.depth_cm, "cm")}</dd>
      <dt>Highest part of cell</dt><dd>${num(s.depth_top_cm, "cm")}</dd>
      <dt>New snow 24 h</dt><dd>${num(s.new_24h_cm, "cm")}</dd>
      <dt>New snow 72 h</dt><dd>${num(s.new_72h_cm, "cm")}</dd></dl>${glacier}
      ${bulletin(s.bulletin)}
      <p class="note">Today, model values.</p>
      <a class="btn more" href="/resort/${encodeURIComponent(p.slug)}">7-day forecast</a></div>`).addTo(map);
  }
  map.on("click", "resort-pins", (e) => { e.preventDefault(); resortPopup(e.features[0].properties, e.lngLat); });
  map.on("click", "touring", (e) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    const p = e.features[0].properties;
    const b = typeof p.bulletin === "string" ? JSON.parse(p.bulletin) : p.bulletin;
    popup.setLngLat(e.lngLat).setHTML(`<div class="pop"><h3>Snow-covered high terrain</h3>
      <div class="sub">5 km cell ${rateBadge(p.rating)}</div>
      <dl><dt>Highest part</dt><dd>${num(p.depth_top_cm, "cm")}</dd><dt>Cell mean</dt><dd>${num(p.depth_cm, "cm")}</dd>
      <dt>New 72 h</dt><dd>${num(p.new_72h_cm, "cm")}</dd></dl>
      ${bulletin(b)}<p class="note">${esc(p.disclaimer || "Model snow, not a route and not an avalanche forecast.")}</p></div>`).addTo(map);
  });
  map.on("click", async (e) => {
    if (e.defaultPrevented) return;
    const { lat, lng } = e.lngLat;
    try {
      const v = await getJSON(`/v1/grid/point?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`);
      const want = st.days[st.dayIdx] && st.days[st.dayIdx].date;
      const d = v.days.find((x) => x.date === want) || {};
      popup.setLngLat(e.lngLat).setHTML(`<div class="pop"><h3>${num(d.depth_cm, "cm")} snow</h3>
        <div class="sub">5 km cell · ${esc(d.date)} (${esc(d.kind)})</div>
        <dl><dt>Highest part of cell</dt><dd>${num(d.depth_top_cm, "cm")}</dd><dt>New snow 24 h</dt><dd>${num(d.new_cm, "cm")}</dd>
        <dt>Snow cover</dt><dd>${num(d.cover_pct, "%")}</dd></dl>
        <p class="note">Cell average: tops and valleys differ a lot. 1 km detail in the app.</p></div>`).addTo(map);
    } catch {
      popup.setLngLat(e.lngLat).setHTML(`<div class="pop"><p class="note">No snow model here yet.</p></div>`).addTo(map);
    }
  });
  for (const id of ["resort-pins", "touring"]) {
    map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
  }

  // ---------------------------------------------------------------- search
  let qTimer = 0, qCtl = null, hits = [];
  const res = $("results");
  $("q").addEventListener("input", () => {
    clearTimeout(qTimer);
    const q = $("q").value.trim();
    if (q.length < 2) { res.hidden = true; return; }
    qTimer = setTimeout(async () => {
      if (qCtl) qCtl.abort();
      qCtl = new AbortController();
      try {
        const j = await getJSON(`/v1/resorts?q=${encodeURIComponent(q)}&limit=8`, qCtl.signal);
        hits = j.items || [];
        res.innerHTML = hits.length ? hits.map((r, i) =>
          `<li role="option" data-i="${i}">${esc(r.name)}<small>${esc([r.region, r.country].filter(Boolean).join(", "))}</small></li>`).join("")
          : `<li aria-disabled="true">No resort found</li>`;
        res.hidden = false;
      } catch { /* aborted or offline */ }
    }, 220);
  });
  function go(r) {
    res.hidden = true; $("q").value = r.name; $("q").blur();
    map.flyTo({ center: [r.lon, r.lat], zoom: 11 });
    map.once("moveend", () => setTimeout(() => resortPopup(r, [r.lon, r.lat]), 600));
  }
  res.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) go(hits[+li.dataset.i]); });
  $("search").addEventListener("submit", (e) => { e.preventDefault(); if (hits[0]) go(hits[0]); });
  document.addEventListener("click", (e) => { if (!e.target.closest("#search")) res.hidden = true; });

  // ---------------------------------------------------------------- controls
  $("layers-btn").onclick = () => {
    const p = $("layers"); p.hidden = !p.hidden; $("layers-btn").setAttribute("aria-expanded", String(!p.hidden));
  };
  for (const cb of document.querySelectorAll("#layers input")) cb.onchange = () => {
    st.show[cb.dataset.layer] = cb.checked; applyVisibility(); if (cb.checked) refresh();
  };
  $("locate-btn").onclick = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(
    (p) => map.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 10 }), () => {}, { timeout: 8000 });
  if (store.get("bannerClosed")) $("app-banner").remove();
  else $("banner-x").onclick = () => { store.set("bannerClosed", "1"); $("app-banner").remove(); };
  $("credits-btn").onclick = async () => {
    $("credits").showModal();
    try {
      const a = await getJSON("/v1/attribution");
      const g = st.grid ? st.grid.attribution : "";
      $("credits-body").innerHTML = "<ul>" + [g, a.weather, a.resorts, a.avalanche,
        "Basemap: OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors.",
        "Relief: AWS Terrain Tiles (Mapzen, SRTM, GMTED, ETOPO1 and others)."]
        .filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join("") + "</ul>";
    } catch { $("credits-body").textContent = "Credits unavailable right now."; }
  };

  // ---------------------------------------------------------------- boot
  map.on("load", async () => {
    const at = document.querySelector(".maplibregl-ctrl-attrib");   // start collapsed on phones
    if (at && innerWidth < 900) at.classList.remove("maplibregl-compact-show");
    addBaseLayers();
    try {
      st.grid = await getJSON("/v1/grid");
      st.domains = st.grid.domains.filter((d) => d.status === "ok" && d.days && d.days.length);
      st.days = st.domains.length ? st.domains[0].days : [];
    } catch { $("legend-meta").textContent = "Snow model unavailable right now"; }
    if (st.days.length) { buildDays(); addSnowLayers(); }
    applyVisibility();
    loadView();
    map.on("moveend", () => {
      refresh();
      const c = map.getCenter();
      history.replaceState(null, "", `#${c.lat.toFixed(4)},${c.lng.toFixed(4)},${map.getZoom().toFixed(1)}`);
    });
  });
})();
