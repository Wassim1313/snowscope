/* SnowScope Web expert chrome (docs/web/EXPERT_PORTAL.md): the layer rail, the fluid timeline (scrub, hour steps,
   radar frames, play), the hour-by-hour meteogram in the point panel, keyboard shortcuts and the light / dark switch.
   app.js owns the map and the data; it hands this file a small bridge (window.SSApp.x) and calls SSX.init / refresh /
   onDay / onDeck / meteogram. Loaded before app.js; everything here degrades to the plain app when it fails. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const t = (s) => (window.I18N ? I18N.t(s) : s);
  const phone = () => innerWidth <= 760;
  let X = null;

  // ------------------------------------------------------------------ theme (applied at parse time: no flash)
  const THEME_KEY = "ss_theme";
  const themeGet = () => { try { return localStorage.getItem(THEME_KEY) || ""; } catch { return ""; } };
  function themeApply(v) {
    if (v === "dark" || v === "light") document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme;
    try { v ? localStorage.setItem(THEME_KEY, v) : localStorage.removeItem(THEME_KEY); } catch { /* private */ }
    const b = $("themeBtn");
    if (b) { b.querySelector(".ms").textContent = isDark() ? "light_mode" : "dark_mode"; b.setAttribute("aria-label", isDark() ? "Light theme" : "Dark theme"); }
  }
  const isDark = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  themeApply(themeGet());

  // ------------------------------------------------------------------ layer rail
  // id = app.js layer id; main = exclusive snow / weather picture; the rest are switches. key = keyboard shortcut.
  const RAIL = [
    { id: "depth", icon: "ac_unit", label: "Snow", key: "1" },
    { id: "powder", icon: "cloudy_snowing", label: "New snow", key: "2" },
    { id: "nw48", icon: "weather_snowy", label: "48 h", key: "3" },
    { id: "nw7", icon: "weather_snowy", label: "7 days", key: "w" },
    { id: "sat", icon: "satellite_alt", label: "Satellite", key: "4" },
    { id: "s30", icon: "grid_on", label: "Sharp 30 m", key: "s" },
    { sep: true },
    { id: "wind", icon: "air", label: "Wind", key: "5", pro: true },
    { id: "freeze", icon: "device_thermostat", label: SS.U.us() ? "32 °F" : "0 °C", key: "6", pro: true },
    { id: "radar", icon: "radar", label: "Radar", key: "7" },
    { sep: true },
    { id: "stn", icon: "sensors", label: "Measured", key: "8" },
    { id: "pins", icon: "location_on", label: "Resorts", key: "9" },
    { id: "pistes", icon: "downhill_skiing", label: "Pistes", key: "0" },
    { id: "aval", icon: "warning", label: "Avalanche", key: "a" },
    { sep: true },
    { id: "terrain", icon: "landscape", label: "3D", key: "t" },
    { id: "more", icon: "layers", label: "More", key: "l" },
  ];
  // v2 (owner: "14 tiny icons"): the rail shows 5 primary layers + More; every other layer (and its keyboard key) lives
  // in the layers sheet
  const PRIMARY = ["depth", "powder", "radar", "sat", "stn", "pistes", "more"];   // v3: + open radar (LIVE-DATA)
  function buildRail() {
    if ($("rail")) return;
    const nav = document.createElement("nav");
    nav.id = "rail"; nav.className = "rail glass"; nav.setAttribute("aria-label", "Map layers");
    nav.innerHTML = RAIL.filter((r) => !r.sep && PRIMARY.includes(r.id)).map((r) => r.sep ? '<i class="sep"></i>'
      : '<button class="rb" data-l="' + r.id + '" aria-pressed="false" title="' + esc(r.label) + (r.key ? " (" + r.key.toUpperCase() + ")" : "") + '"><span class="ms">' + r.icon + '</span><span class="rl">' + esc(r.label) + '</span>' +
        (r.pro ? '<span class="ms f lk" aria-label="Pro">lock</span>' : "") + "</button>").join("");
    nav.addEventListener("click", (e) => {
      const b = e.target.closest("[data-l]"); if (!b) return;
      if (b.dataset.l === "more") { X.layersSheet(); return; }
      X.toggleOver(b.dataset.l);
    });
    $("timeline").insertAdjacentElement("beforebegin", nav);
    // v2: the legend is a slim row inside the timeline card (one chrome less)
    const lg = $("legend"), tl = $("timeline"); if (lg && tl && lg.parentNode !== tl) tl.insertBefore(lg, tl.firstChild);
  }
  function refresh() {
    if (!X) return;
    const st = X.st;
    document.querySelectorAll("#rail [data-l]").forEach((b) => {
      const id = b.dataset.l, def = RAIL.find((r) => r.id === id) || {};
      b.hidden = !X.has(id);
      b.setAttribute("aria-pressed", id === "more" ? "false" : String(X.overOn(id)));
      const lk = b.querySelector(".lk"); if (lk) lk.hidden = !(def.pro && !st.pro);
    });
    drawHours();
    syncKnob();
    const pl = $("play"); if (pl) pl.innerHTML = '<span class="ms f">' + (playing || X.isPlaying() ? "pause" : "play_arrow") + "</span>";
  }

  // ------------------------------------------------------------------ timeline: scrub + hour row + play
  let playing = 0, scrubbing = false, raf = 0;
  const dates = () => [...document.querySelectorAll("#days [data-d]:not([aria-disabled])")].map((b) => b.dataset.d);
  function buildTimeline() {
    const tl = $("timeline"); if (!tl || $("scrub")) return;
    tl.insertAdjacentHTML("beforeend", '<div class="scrub" id="scrub" role="slider" aria-label="Day" tabindex="0" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><div class="trk"></div><div class="ticks" id="ticks"></div><div class="knob" id="knob"><span class="tip" id="tip"></span></div></div>' +
      '<div class="hours" id="hours" hidden></div>');
    const sc = $("scrub");
    const posOf = (clientX) => { const r = sc.getBoundingClientRect(), n = dates().length; let f = (clientX - r.left) / Math.max(1, r.width); if (document.documentElement.dir === "rtl") f = 1 - f; return Math.max(0, Math.min(n - 1, f * (n - 1))); };
    let pos = 0;
    const show = (p) => { const ds = dates(), i = Math.floor(p), f = p - i; X.scrub(ds[i], ds[i + 1], f); knobAt(p, ds[Math.round(p)]); };
    sc.addEventListener("pointerdown", (e) => { if (dates().length < 2) return; stopPlay(); scrubbing = true; sc.setPointerCapture(e.pointerId); pos = posOf(e.clientX); show(pos); e.preventDefault(); });
    sc.addEventListener("pointermove", (e) => { if (!scrubbing) return; pos = posOf(e.clientX); cancelAnimationFrame(raf); raf = requestAnimationFrame(() => show(pos)); });
    const up = () => { if (!scrubbing) return; scrubbing = false; cancelAnimationFrame(raf); const ds = dates(); X.settle(ds[Math.round(pos)]); syncKnob(); };
    sc.addEventListener("pointerup", up); sc.addEventListener("pointercancel", up);
    sc.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { stepDay((e.key === "ArrowRight") === (document.documentElement.dir !== "rtl") ? 1 : -1); e.preventDefault(); } });
    $("hours").addEventListener("click", (e) => {
      const b = e.target.closest("[data-h]"), f = e.target.closest("[data-f]");
      if (b) { stopPlay(); X.st.hour = +b.dataset.h; X.renderMain(); drawHours(); }
      if (f) { stopPlay(); X.radarFrame(+f.dataset.f); drawHours(); }
    });
    $("play").addEventListener("click", (e) => { e.stopImmediatePropagation(); togglePlay(); });
    if (window.ResizeObserver) new ResizeObserver(() => document.body.style.setProperty("--tl", tl.offsetHeight + "px")).observe(tl);
    // v2: the day strip itself scrubs (drag across the days); the separate slider row is hidden
    const dz = $("days");
    if (dz) {
      let drag = false;
      const at = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); const b = el && el.closest && el.closest("#days [data-d]"); return b && b.getAttribute("aria-disabled") !== "true" ? b.dataset.d : null; };
      dz.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; drag = true; stopPlay(); });
      dz.addEventListener("pointermove", (e) => { if (!drag || (e.pointerType === "mouse" && !e.buttons)) return; const d = at(e); if (d && d !== X.st.day) X.setDay(d); });
      const end = () => { drag = false; };
      dz.addEventListener("pointerup", end); dz.addEventListener("pointercancel", end); dz.addEventListener("pointerleave", end);
    }
  }
  function knobAt(p, label) {
    const ds = dates(), n = ds.length, k = $("knob"), sc = $("scrub");
    if (!k) return;
    const pct = n > 1 ? (p / (n - 1)) * 100 : 0;
    k.style.insetInlineStart = pct + "%";
    sc.setAttribute("aria-valuenow", String(Math.round(p))); sc.setAttribute("aria-valuemax", String(Math.max(0, n - 1)));
    const DATA = X.data();
    $("tip").textContent = label ? (label === DATA.today ? t("Today") : X.wd(label) + " " + X.dnum(label)) : "";
  }
  function syncKnob() {
    const ds = dates(), i = ds.indexOf(X.st.day), tk = $("ticks");
    if (!tk) return;
    const DATA = X.data();
    tk.innerHTML = ds.map((d, k) => '<i style="inset-inline-start:' + (ds.length > 1 ? (k / (ds.length - 1)) * 100 : 0) + '%" class="' + (d === DATA.today ? "today" : "") + (X.isStatic(d) ? "" : " live") + '"></i>').join("");
    $("scrub").hidden = ds.length < 2;
    if (i >= 0) knobAt(i, ds[i]);
  }
  function stepDay(k) {
    const ds = dates(), i = ds.indexOf(X.st.day), j = i + k;
    if (j < 0 || j >= ds.length) { if (!X.st.pro) SS.upsell("See 15 days of snow: the past week and the week ahead"); return; }
    X.setDay(ds[j]);
  }
  function hoursList() {                 // Pro wind / freezing level: the 3-hour steps of the day; radar: its frames
    const st = X.st;
    if (st.main === "radar" && st.radarFrames) return { kind: "f", items: st.radarFrames.map((f, i) => [i, new Date(f.time * 1000).toLocaleTimeString(X.LOC, { hour: "2-digit", minute: "2-digit" })]) };
    if ((st.main === "wind" || st.main === "freeze") && X.proLive()) {
      const ix = Object.values(st.fields).find((f) => f && f.times);
      const hs = ix ? [...new Set(ix.times.filter((x) => x.startsWith(st.day)).map((x) => +x.slice(11, 13)))] : [0, 3, 6, 9, 12, 15, 18, 21];
      return { kind: "h", items: hs.map((h) => [h, String(h).padStart(2, "0") + ":00"]) };
    }
    return null;
  }
  function drawHours() {
    const box = $("hours"); if (!box) return;
    const L = hoursList(), st = X.st;
    box.hidden = !L;
    if (!L) return;
    const cur = L.kind === "f" ? st.frame : (st.hour == null ? 12 : st.hour);
    box.innerHTML = (L.kind === "f" ? '<span class="hl">' + esc(t("Last 2 hours")) + "</span>" : "") +
      L.items.map(([v, lbl]) => '<button data-' + L.kind + '="' + v + '" aria-pressed="' + (v === cur) + '">' + lbl + "</button>").join("");
  }
  function stepHour(k) {
    const L = hoursList(); if (!L) return false;
    const vals = L.items.map((x) => x[0]), st = X.st, cur = L.kind === "f" ? st.frame : (st.hour == null ? 12 : st.hour);
    let i = vals.indexOf(cur) + k;
    if (i < 0 || i >= vals.length) { if (L.kind === "f") return true; stepDay(k); st.hour = vals[i < 0 ? vals.length - 1 : 0]; X.renderMain(); drawHours(); return true; }
    if (L.kind === "f") X.radarFrame(vals[i]); else { st.hour = vals[i]; X.renderMain(); }
    drawHours();
    return true;
  }
  // play: the deck fades from day to day at 60 fps; radar runs its frames; hour layers step every 1.2 s
  function togglePlay() { if (playing) stopPlay(); else startPlay(); refresh(); }
  let playPos = -1;
  function stopPlay() {
    if (!playing) return;
    cancelAnimationFrame(playing); clearInterval(playing); playing = 0;
    const ds = dates(), i = playPos >= 0 ? Math.round(playPos) : ds.indexOf(X.st.day);
    playPos = -1;
    if (i >= 0 && ds[i]) { X.settle(ds[i]); knobAt(i, ds[i]); }
    refresh();
  }
  const markChips = (d) => document.querySelectorAll("#days [data-d]:not([aria-disabled])").forEach((b) => b.setAttribute("aria-pressed", b.dataset.d === d));
  function startPlay() {
    const st = X.st, L = hoursList();
    if (L) { playing = setInterval(() => { if (!stepHour(1)) stopPlay(); else if (L.kind === "f" && st.frame === st.radarFrames.length - 1) X.radarFrame(0); }, L.kind === "f" ? 450 : 1200); return; }
    const ds = dates(); if (ds.length < 2) return;
    let p = Math.max(0, ds.indexOf(st.day)), last = performance.now();
    const SPEED = 1 / 1100;                             // days per ms
    const tick = (now) => {
      p += (now - last) * SPEED; last = now;
      if (p >= ds.length - 1 + 0.6) p = 0;                // a short hold on the last day, then loop
      playPos = Math.min(p, ds.length - 1);
      const i = Math.floor(playPos), f = playPos - i;
      const smooth = X.st.deck && X.isStatic(ds[i]) && X.isStatic(ds[i + 1] || ds[i]);
      if (smooth) { X.scrub(ds[i], ds[i + 1], f); knobAt(playPos, ds[Math.round(playPos)]); markChips(ds[Math.round(playPos)]); }
      else { const d = ds[Math.round(playPos)]; if (d !== X.st.day) X.setDay(d); knobAt(Math.round(playPos), d); }
      playing = requestAnimationFrame(tick);
    };
    playing = requestAnimationFrame(tick);
  }
  function onDay() { if (!scrubbing) syncKnob(); drawHours(); }
  function onDeck() { syncKnob(); }

  // ------------------------------------------------------------------ keyboard shortcuts
  const SHORTCUTS = [["←  →", "Previous / next day"], ["Shift + ←  →", "Previous / next hour"], ["Space", "Play / pause"], ["1 … 0", "Layers, in the order of the rail"],
    ["A", "Avalanche danger"], ["T", "3D mountains"], ["L", "All layers"], ["F  or  /", "Find a resort"], ["D", "Light / dark"], ["Esc", "Close the panel"], ["?", "This list"]];
  function keyboard() {
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tg = e.target;
      if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) { if (e.key === "Escape") tg.blur(); return; }
      if (document.querySelector(".scrim")) return;
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight") { const dir = (k === "ArrowRight") === (document.documentElement.dir !== "rtl") ? 1 : -1; if (!(e.shiftKey && stepHour(dir))) stepDay(dir); e.preventDefault(); return; }
      if (k === " ") { togglePlay(); e.preventDefault(); return; }
      if (k === "Escape") { if (X.st.point) X.closePoint(); else if (X.st.slug) history.back(); return; }
      if (k === "?") { help(); return; }
      if (k === "f" || k === "/") { const f = document.querySelector(".find"); if (f) { f.classList.add("show"); f.querySelector("input").focus(); e.preventDefault(); } return; }
      if (k === "d") { themeApply(isDark() ? "light" : "dark"); return; }
      const r = RAIL.find((x) => x.key === k.toLowerCase());
      if (r) { if (r.id === "more") X.layersSheet(); else X.toggleOver(r.id); }
    });
  }
  function help() {
    SS.modal(SS.head(t("Keyboard shortcuts")) + '<table class="keys">' + SHORTCUTS.map(([k, w]) => "<tr><td><kbd>" + esc(k) + "</kbd></td><td>" + esc(w) + "</td></tr>").join("") + "</table>" +
      '<p class="none" style="margin-top:10px">' + esc(t("Tap anywhere on the map for the snow and the hour-by-hour forecast at that spot.")) + "</p>");
  }

  // ------------------------------------------------------------------ meteogram (point panel): hour by hour at a spot
  const FC = new Map();
  async function meteogram(pt, days, region) {
    const box = $("ptMeteo"); if (!box) return;
    const st = X.st, key = pt.lat + "," + pt.lon;
    if (!FC.has(key)) FC.set(key, SS.api("/v1/point/forecast?lat=" + pt.lat + "&lon=" + pt.lon + "&hours=168", { auth: true, timeout: 25000 }).catch((e) => ({ err: e })));
    if (FC.size > 24) FC.delete(FC.keys().next().value);
    const fc = await FC.get(key);
    if (!$("ptMeteo") || st.point !== pt) return;
    if (!fc || fc.err || !fc.times || !fc.times.length) {
      FC.delete(key);                     // never keep a failure (v3): the next open / Retry asks again
      $("ptMeteo").innerHTML = '<p class="none">' + esc(t("Couldn't load the hour-by-hour forecast.")) + ' <button class="linkbtn" data-mretry>' + esc(t("Retry")) + "</button></p>";
      const rb = $("ptMeteo").querySelector("[data-mretry]");
      if (rb) rb.onclick = () => { $("ptMeteo").innerHTML = '<div class="skel" style="height:230px"></div>'; meteogram(pt, days, region); };
      return;
    }
    const draw = (cmp) => { $("ptMeteo").innerHTML = meteoHtml(fc, days, cmp); bind(); };
    const bind = () => {
      const b = $("ptMeteo").querySelector("[data-cmp]"); if (b) b.onclick = () => draw(b.getAttribute("aria-pressed") !== "true");
      const u = $("ptMeteo").querySelector("[data-up]"); if (u) u.onclick = () => SS.upsell("The whole week, hour by hour, is in Pro");
      const sc = $("ptMeteo").querySelector(".meteo"); if (sc && document.documentElement.dir === "rtl") sc.scrollLeft = 0;
    };
    draw(false);
  }
  const sum = (a) => a.reduce((s, v) => s + (v || 0), 0);
  const avg = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  function meteoHtml(fc, days, cmp) {
    const st = X.st, DATA = X.data(), V = fc.variables || {}, T = fc.times, pro = st.pro;
    const hours = Math.min(T.length, pro ? 168 : 72), nb = Math.floor(hours / 3);
    if (nb < 4) return '<p class="none">' + esc(t("The hour-by-hour forecast is updating, try again in a minute.")) + "</p>";
    const med = (v, i) => (V[v] && V[v].median ? V[v].median[i] : null), lo = (v, i) => (V[v] && V[v].lo ? V[v].lo[i] : null), hi = (v, i) => (V[v] && V[v].hi ? V[v].hi[i] : null);
    const bins = [];
    for (let k = 0; k < nb; k++) {
      const I = [3 * k, 3 * k + 1, 3 * k + 2].filter((i) => i < T.length);
      bins.push({ t: T[3 * k], h: +T[3 * k].slice(11, 13), day: T[3 * k].slice(0, 10),
        snow: sum(I.map((i) => med("snowfall", i))), snowHi: sum(I.map((i) => hi("snowfall", i))), snowLo: sum(I.map((i) => lo("snowfall", i))),
        rain: sum(I.map((i) => med("precipitation", i))) - sum(I.map((i) => med("snowfall", i))) * 0.1 * 10 / 10,
        temp: avg(I.map((i) => med("temperature_2m", i))), tlo: avg(I.map((i) => lo("temperature_2m", i))), thi: avg(I.map((i) => hi("temperature_2m", i))),
        fz: avg(I.map((i) => med("freezing_level_height", i))), wind: Math.max(0, ...I.map((i) => med("wind_speed_10m", i) || 0)), gust: Math.max(0, ...I.map((i) => med("wind_gusts_10m", i) || 0)),
        dir: med("wind_direction_10m", I[Math.floor(I.length / 2)]), cloud: avg(I.map((i) => med("cloud_cover", i))) });
    }
    const BW = 14, W = nb * BW + 30, PAD = 30, rows = { hd: [0, 22], sn: [26, 84], tp: [92, 150], fz: [158, 196], wd: [202, 236], ax: [240, 258] }, H = 262;
    const x = (k) => PAD + k * BW;
    let s = '<svg class="mg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("Hour by hour: new snow, temperature, freezing level and wind")) + '">';
    // night shading + day separators + header per day
    const dayList = [...new Set(bins.map((b) => b.day))];
    for (const b of bins) if (b.h >= 18 || b.h < 6) s += '<rect x="' + x(bins.indexOf(b)) + '" y="' + rows.sn[0] + '" width="' + BW + '" height="' + (rows.ax[0] - rows.sn[0]) + '" fill="var(--ink)" opacity=".045"/>';
    for (const d of dayList) {
      const k0 = bins.findIndex((b) => b.day === d), k1 = bins.length - 1 - [...bins].reverse().findIndex((b) => b.day === d), xm = (x(k0) + x(k1) + BW) / 2;
      if (k0 > 0) s += '<line x1="' + x(k0) + '" x2="' + x(k0) + '" y1="' + rows.hd[0] + '" y2="' + rows.ax[1] + '" stroke="var(--hair)"/>';
      const dd = (days || []).find((q) => q.date === d), tot = sum(bins.filter((b) => b.day === d).map((b) => b.snow));
      const label = (d === DATA.today ? t("Today") : X.wd(d) + " " + X.dnum(d));
      s += '<text class="lbl" x="' + xm + '" y="10" text-anchor="middle">' + esc(label) + "</text>";
      const sub = [dd && dd.dep != null ? SS.U.depth(dd.dep) : "", tot >= 0.5 ? "+" + SS.U.dep(tot) : ""].filter(Boolean).join(" · ");
      if (sub) s += '<text x="' + xm + '" y="21" text-anchor="middle" style="' + (tot >= 0.5 ? "fill:var(--accent-ink);font-weight:650" : "") + '">' + esc(sub) + "</text>";
    }
    // new snow bars (cm per 3 h), spread as a lighter extension
    const smax = Math.max(3, ...bins.map((b) => b.snowHi || b.snow)), sy = (v) => rows.sn[1] - (Math.min(v, smax) / smax) * (rows.sn[1] - rows.sn[0] - 10);
    bins.forEach((b, k) => {
      if (b.snowHi >= 0.1) s += '<rect x="' + (x(k) + 2) + '" y="' + sy(b.snowHi) + '" width="' + (BW - 4) + '" height="' + (rows.sn[1] - sy(b.snowHi)) + '" rx="2" fill="var(--accent-tint)"/>';
      if (b.snow >= 0.1) s += '<rect x="' + (x(k) + 2) + '" y="' + sy(b.snow) + '" width="' + (BW - 4) + '" height="' + (rows.sn[1] - sy(b.snow)) + '" rx="2" fill="var(--accent)"/>';
      if (b.rain >= 0.3 && b.snow < 0.1) s += '<circle cx="' + (x(k) + BW / 2) + '" cy="' + (rows.sn[1] - 3) + '" r="1.8" fill="var(--ink3)"/>';
    });
    s += '<text x="' + (PAD - 4) + '" y="' + (rows.sn[0] + 9) + '" text-anchor="end">' + SS.U.depth(smax) + "</text><text x=\"" + (PAD - 4) + '" y="' + (rows.sn[1] - 1) + '" text-anchor="end">' + esc(t("snow")) + "</text>";
    // temperature: band lo-hi, median line, 0 degree line
    const temps = bins.flatMap((b) => [b.tlo, b.thi, b.temp]).filter((v) => v != null);
    if (temps.length) {
      const tmin = Math.floor(Math.min(0, ...temps) - 1), tmax = Math.ceil(Math.max(2, ...temps) + 1), ty = (v) => rows.tp[1] - ((v - tmin) / (tmax - tmin)) * (rows.tp[1] - rows.tp[0]);
      let band = "", back = "", line = "";
      bins.forEach((b, k) => { if (b.tlo == null || b.thi == null) return; const xc = x(k) + BW / 2; band += (band ? "L" : "M") + xc + "," + ty(b.thi).toFixed(1); back = "L" + xc + "," + ty(b.tlo).toFixed(1) + back; });
      bins.forEach((b, k) => { if (b.temp != null) line += (line ? "L" : "M") + (x(k) + BW / 2) + "," + ty(b.temp).toFixed(1); });
      s += (band ? '<path d="' + band + back + 'Z" fill="var(--fair)" opacity=".16"/>' : "") +
        '<line x1="' + PAD + '" x2="' + (W - 2) + '" y1="' + ty(0).toFixed(1) + '" y2="' + ty(0).toFixed(1) + '" stroke="var(--ink3)" stroke-dasharray="3 3"/>' +
        '<path d="' + line + '" fill="none" stroke="var(--fair)" stroke-width="2" stroke-linejoin="round"/>';
      if (cmp && V.temperature_2m && V.temperature_2m.per_model) {
        const DASH = ["", "4 3", "1.5 2.5", "6 2 1 2"];
        Object.values(V.temperature_2m.per_model).forEach((arr, m) => {
          let p = ""; bins.forEach((b, k) => { const v = avg([arr[3 * k], arr[3 * k + 1], arr[3 * k + 2]]); if (v != null) p += (p ? "L" : "M") + (x(k) + BW / 2) + "," + ty(v).toFixed(1); });
          s += '<path d="' + p + '" fill="none" stroke="var(--ink2)" stroke-width="1" stroke-dasharray="' + (DASH[m % DASH.length]) + '" opacity=".9"/>';
        });
      }
      s += '<text x="' + (PAD - 4) + '" y="' + (rows.tp[0] + 9) + '" text-anchor="end">' + SS.U.tv(tmax) + "°</text><text x=\"" + (PAD - 4) + '" y="' + (rows.tp[1] - 1) + '" text-anchor="end">' + SS.U.tv(tmin) + "°</text>" +
        '<text x="' + (PAD - 4) + '" y="' + (ty(0) + 3).toFixed(1) + '" text-anchor="end" class="lbl">' + SS.U.tv(0) + "°</text>";
    }
    // freezing level vs the height of this spot: snow falls here when the line is above the spot
    const fzs = bins.map((b) => b.fz).filter((v) => v != null), elev = fc.elevation_m;
    if (fzs.length) {
      const fmin = Math.max(0, Math.floor((Math.min(...fzs, elev || 1e9) - 300) / 500) * 500), fmax = Math.ceil((Math.max(...fzs, elev || 0) + 300) / 500) * 500;
      const fy = (v) => rows.fz[1] - ((Math.min(fmax, Math.max(fmin, v)) - fmin) / Math.max(1, fmax - fmin)) * (rows.fz[1] - rows.fz[0]);
      let p = ""; bins.forEach((b, k) => { if (b.fz != null) p += (p ? "L" : "M") + (x(k) + BW / 2) + "," + fy(b.fz).toFixed(1); });
      bins.forEach((b, k) => { if (elev && b.fz != null && b.fz <= elev + 150 && (b.snow >= 0.1 || b.rain >= 0.3)) s += '<rect x="' + x(k) + '" y="' + rows.fz[0] + '" width="' + BW + '" height="' + (rows.fz[1] - rows.fz[0]) + '" fill="var(--accent)" opacity=".10"/>'; });
      if (elev) s += '<line x1="' + PAD + '" x2="' + (W - 2) + '" y1="' + fy(elev).toFixed(1) + '" y2="' + fy(elev).toFixed(1) + '" stroke="var(--ink)" stroke-dasharray="2 3" opacity=".7"/>' +
        '<text x="' + (W - 2) + '" y="' + (fy(elev) - 3).toFixed(1) + '" text-anchor="end" class="lbl">' + esc(t("here") + " " + SS.U.elev(elev)) + "</text>";
      s += '<path d="' + p + '" fill="none" stroke="var(--accent-ink)" stroke-width="1.8"/>' +
        '<text x="' + (PAD - 4) + '" y="' + (rows.fz[0] + 9) + '" text-anchor="end">' + SS.U.ev(fmax) + "</text><text x=\"" + (PAD - 4) + '" y="' + (rows.fz[1] - 1) + '" text-anchor="end">' + SS.U.ev(fmin) + "</text>";
    }
    // wind: arrows (direction the wind blows to), speed every second bin, gusts as a thin tail
    const wmax = Math.max(20, ...bins.map((b) => b.gust || b.wind));
    bins.forEach((b, k) => {
      const xc = x(k) + BW / 2, yc = rows.wd[0] + 12, L = 5 + 7 * Math.min(1, b.wind / wmax);
      if (b.dir != null) s += '<g transform="translate(' + xc + ' ' + yc + ') rotate(' + (b.dir + 180) + ')"><line x1="0" y1="' + L + '" x2="0" y2="' + -L + '" stroke="var(--ink2)" stroke-width="1.5"/><path d="M-3.5,' + (-L + 4) + ' L0,' + -L + ' L3.5,' + (-L + 4) + '" fill="none" stroke="var(--ink2)" stroke-width="1.5"/></g>';
      else s += '<rect x="' + (xc - 2) + '" y="' + (yc - L) + '" width="4" height="' + (2 * L) + '" rx="2" fill="var(--ink3)"/>';
      if (k % 2 === 0) s += '<text x="' + xc + '" y="' + (rows.wd[1] - 2) + '" text-anchor="middle">' + SS.U.wv(b.wind) + "</text>";
    });
    s += '<text x="' + (PAD - 4) + '" y="' + (rows.wd[1] - 2) + '" text-anchor="end">' + SS.U.wu() + "</text>";
    // time axis
    bins.forEach((b, k) => { if (b.h % 6 === 0) s += '<text x="' + (x(k) + BW / 2) + '" y="' + (rows.ax[1] - 4) + '" text-anchor="middle">' + String(b.h).padStart(2, "0") + "</text>"; });
    s += "</svg>";
    // per-forecast agreement (plain words, no model names on the main screens: they live on About & sources)
    let agree = "";
    const pm = V.snowfall && V.snowfall.per_model;
    if (pm) {
      const tots = Object.values(pm).map((arr) => sum(arr.slice(0, hours))).sort((a, b) => a - b);
      if (tots.length >= 2) {
        const lo2 = Math.round(tots[0]), hi2 = Math.round(tots[tots.length - 1]);
        agree = hi2 < 1 ? t("No snow in sight in any forecast.") : hi2 - lo2 <= Math.max(3, hi2 * 0.3) ? I18N.tu("{a} forecasts agree: {b} cm over this period.", tots.length, lo2 === hi2 ? SS.U.dep(hi2) : SS.U.dep(lo2) + "–" + SS.U.dep(hi2))
          : I18N.tu("{a} forecasts differ: {b} cm over this period.", tots.length, SS.U.dep(lo2) + "–" + SS.U.dep(hi2));
        if (cmp) agree += " " + tots.map((v, i) => t("Forecast") + " " + (i + 1) + ": " + SS.U.depth(v)).join(" · ");
      }
    }
    return '<div class="meteo">' + s + "</div>" +
      '<div class="keyrow"><span><i style="background:var(--accent)"></i>' + esc(t("new snow")) + '</span><span><i style="background:var(--fair)"></i>' + esc(t("temperature")) + '</span><span><i style="background:var(--accent-ink);height:2px"></i>' + esc(t("freezing level")) + "</span><span>↑ " + esc(t("wind")) + "</span></div>" +
      (agree ? '<p class="agree">' + esc(agree) + (pm && Object.keys(pm).length >= 2 ? ' <button class="linkbtn" data-cmp aria-pressed="' + cmp + '">' + esc(cmp ? t("Hide the comparison") : t("Compare forecasts")) + "</button>" : "") + "</p>" : "") +
      (pro ? "" : '<div class="prolock" style="margin-top:8px"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>' + esc(t("3 days are free.")) + "</b> " + esc(t("Pro shows the whole week, hour by hour.")) + '</p><button class="btn ink" data-up>' + esc(t("See the week")) + "</button></div>");
  }

  // ------------------------------------------------------------------ init
  function init(x) {
    X = x;
    buildRail(); buildTimeline(); keyboard();
    const lang = document.querySelector(".appbar .langbtn");
    if (lang && !$("themeBtn")) lang.insertAdjacentHTML("beforebegin", '<button class="btn icon langbtn" id="themeBtn" aria-label="Dark theme"><span class="ms">dark_mode</span></button>');
    const tb = $("themeBtn"); if (tb) { tb.onclick = () => themeApply(isDark() ? "light" : "dark"); themeApply(themeGet()); }
    const L = $("legend");
    if (L) L.addEventListener("click", (e) => { if (phone() && !e.target.closest("button")) L.classList.toggle("open"); });
    refresh();
  }
  window.SSX = { init, refresh, onDay, onDeck, meteogram, help, theme: themeApply };
})();
