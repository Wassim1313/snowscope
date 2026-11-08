/* SnowScope blog tools page (engine/blog/tools_pages.py): resort search, temperature + snow vs height with a
   least-squares lapse rate, this winter vs last winter vs the past-winters median, CSV downloads, citation.
   Vanilla JS, no framework. Data from the public API only when a resort is picked or the tools scroll into view;
   charts are drawn by charts.js (window.SSChart), loaded on demand. Every failure shows a plain message. */
(() => {
  "use strict";
  const C = JSON.parse(document.getElementById("tl-cfg").textContent), L = C.L;
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = local ? location.origin : C.api;            // local test: same-origin proxy (CORS allows snowscope.app only)
  const $ = (s) => document.querySelector(s);
  const fmt = (v, d = 0) => v == null || !isFinite(v) ? "–" : (+v).toLocaleString(C.lang === "ar" ? "en-US" : C.locale, { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: C.lang !== "ar" });
  const sgn = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d);
  const LV = ["base", "mid", "top"];
  const cache = new Map();
  const get = (p) => {
    if (cache.has(p)) return cache.get(p);
    const ac = "AbortController" in window ? new AbortController() : null;
    const tm = ac && setTimeout(() => ac.abort(), 30000);
    const pr = fetch(API + p, ac ? { signal: ac.signal } : {}).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(() => tm && clearTimeout(tm));
    pr.catch(() => cache.delete(p));
    cache.set(p, pr);
    return pr;
  };
  let chartsP = null;
  const charts = () => chartsP || (chartsP = new Promise((ok, no) => {
    if (window.SSChart) return ok(window.SSChart);
    const s = document.createElement("script"); s.src = C.charts; s.onload = () => ok(window.SSChart); s.onerror = no; document.head.appendChild(s);
  }));
  const msg = (fig, text) => { const m = fig.querySelector(".tl-msg"); m.textContent = text || ""; m.hidden = !text;
    if (text) { fig.querySelector(".ic-plot").textContent = ""; fig.classList.add("ready"); } };
  const seasonOf = (d) => { const y = d.getUTCFullYear(), cs = d.getUTCMonth() + 1 >= 8 ? y : y - 1;
    return { cur: `${cs}-${String((cs + 1) % 100).padStart(2, "0")}`, last: `${cs - 1}-${String(cs % 100).padStart(2, "0")}` }; };
  const SEASON = seasonOf(new Date());
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll("[data-today]").forEach((e) => { e.textContent = today; });

  // ------------------------------------------------------------------------------------------ state
  const S = { slug: null, name: "", us: false, lapse: null, season: null, h: "mid", sm: "today", det: null };

  // ------------------------------------------------------------------------------------------ search (combobox)
  const q = $("#tl-q"), list = $("#tl-list");
  let idx = null, opts = [], act = -1;
  const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const loadIndex = () => idx || (idx = fetch(C.index).then((r) => r.json()).then((a) => a.map((r) => ({ slug: r[0], name: r[1], country: r[2], domain: r[3], base: r[4], top: r[5], k: norm(r[1] + " " + r[0]) })))
    .catch(() => []));
  const close = () => { list.hidden = true; q.setAttribute("aria-expanded", "false"); q.removeAttribute("aria-activedescendant"); act = -1; };
  const render = () => {
    list.textContent = "";
    if (!opts.length) { const li = document.createElement("li"); li.className = "none"; li.textContent = L.nomatch; list.appendChild(li); }
    opts.forEach((o, i) => { const li = document.createElement("li"); li.id = "tl-o" + i; li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === act ? "true" : "false");
      li.innerHTML = `<b></b><span></span>`; li.firstChild.textContent = o.name; li.lastChild.textContent = `${o.country || ""} · ${fmt(o.base)}–${fmt(o.top)} m`;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); pick(o); }); list.appendChild(li); });
    list.hidden = false; q.setAttribute("aria-expanded", "true");
    if (act >= 0) q.setAttribute("aria-activedescendant", "tl-o" + act); else q.removeAttribute("aria-activedescendant");
  };
  let tq = 0;
  q.addEventListener("focus", loadIndex);
  q.addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(async () => {
    const s = norm(q.value.trim()); if (s.length < 2) { close(); return; }
    const a = await loadIndex(); act = -1;
    if (a.length) {
      const st = [], inn = [];
      for (const o of a) { const i = o.k.indexOf(s); if (i === 0 || o.k.includes(" " + s)) st.push(o); else if (i > 0) inn.push(o); if (st.length >= 8) break; }
      opts = st.concat(inn).slice(0, 8);
    } else {
      try { opts = ((await get(`/v1/resorts?q=${encodeURIComponent(q.value.trim())}&limit=8`)).items || []).map((r) => ({ slug: r.slug, name: r.name, country: r.country, domain: r.domain, base: r.base_m, top: r.top_m })); }
      catch (e) { opts = []; }
    }
    render(); }, 120); });
  q.addEventListener("keydown", (e) => {
    if (list.hidden && e.key !== "Enter") return;
    if (e.key === "ArrowDown") { act = Math.min(opts.length - 1, act + 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { act = Math.max(0, act - 1); render(); e.preventDefault(); }
    else if (e.key === "Enter") { const o = opts[act >= 0 ? act : 0]; if (o && !list.hidden) { pick(o); e.preventDefault(); } }
    else if (e.key === "Escape") close();
  });
  q.addEventListener("blur", () => setTimeout(close, 150));
  const pick = (o) => { close(); q.value = o.name; load(o.slug); };

  // ------------------------------------------------------------------------------------------ fit
  const ols = (pts) => {
    const n = pts.length; if (n < 2) return null;
    const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
    let sxy = 0, sxx = 0; for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }
    if (!sxx) return null;
    const b = sxy / sxx, a = my - b * mx;
    let sse = 0, sst = 0; for (const p of pts) { sse += (p.y - (a + b * p.x)) ** 2; sst += (p.y - my) ** 2; }
    return { a, b, r2: sst ? 1 - sse / sst : null, n };
  };
  const spec = (pts, yunit, fit, vh) => ({ type: "scatter", units: S.us ? "us" : "metric", lang: C.locale, vh: vh || 320,
    data: { points: pts, xunit: "m", yunit, fit: fit ? { a: fit.a, b: fit.b } : null }, L: {} });
  const r2s = (f) => f.r2 == null ? "" : ` · R² ${fmt(f.r2, 2)}`;

  async function drawLapse() {
    const lp = S.lapse; if (!lp) return;
    const ch = await charts().catch(() => null);
    const ft = $("#tl-temp"), fs = $("#tl-snow");
    if (!ch) { msg(ft, L.err); msg(fs, L.err); return; }
    // temperature
    const tp = lp.temp.filter((p) => p.y != null);
    const tf = ols(tp);
    if (tp.length) { msg(ft, ""); ch.draw(ft, spec(tp, "°C", tf)); } else msg(ft, L.err);
    $("#tl-tr").textContent = tf ? `${sgn(tf.b * 1000, 1)} °C/km` : "–";
    $("#tl-tr2").textContent = tf && S.us ? `${sgn(tf.b * 1000 * 0.54864, 1)} °F / 1,000 ft` : "";
    $("#tl-tf").textContent = tf ? `${L.fit}: T(z) = ${fmt(tf.a, 1)} ${tf.b < 0 ? "−" : "+"} ${fmt(Math.abs(tf.b * 1000), 2)}·z °C (${L.where}) · n = ${tf.n}${r2s(tf)}`
      : (tp.length ? L.few : "");
    // snow
    const sp = (S.sm === "usual" ? lp.usual : lp.snow).filter((p) => p.y != null);
    $("#tl-sh").textContent = `${L.s_chart} · ${S.sm === "usual" ? L.m_usual : L.m_today}`;
    if (S.sm === "usual" && !lp.usualLoaded) { msg(fs, L.loading); return; }
    const sf = ols(sp);
    if (!sp.length) msg(fs, L.err);
    else if (sp.every((p) => p.y === 0)) { msg(fs, ""); ch.draw(fs, spec(sp, "cm", null)); const m = fs.querySelector(".tl-msg"); m.textContent = L.nosnow; m.hidden = false; }
    else { msg(fs, ""); ch.draw(fs, spec(sp, "cm", sf)); }
    const okS = sf && !sp.every((p) => p.y === 0);
    $("#tl-sr").textContent = okS ? `${sgn(sf.b * 100, 1)} cm/100 m` : "–";
    $("#tl-sr2").textContent = okS && S.us ? `${sgn(sf.b * 100 / 2.54 * 0.3048, 2)} in / 100 ft` : "";
    $("#tl-sf").textContent = okS ? `${L.fit}: D(z) = ${fmt(sf.a, 0)} ${sf.b < 0 ? "−" : "+"} ${fmt(Math.abs(sf.b * 100), 2)}·z cm (${L.where_s}) · n = ${sf.n}${r2s(sf)}` : "";
    $("#tl-csv1").disabled = false;
  }

  async function loadLapse(slug) {
    const ft = $("#tl-temp"), fs = $("#tl-snow");
    msg(ft, L.loading); msg(fs, L.loading);
    let det;
    try { det = await get(`/v1/resorts/${slug}`); } catch (e) { msg(ft, L.err); msg(fs, L.err); return null; }
    if (slug !== S.slug) return null;
    S.det = det; S.us = det.domain === "US_WEST" || det.domain === "US_NE";
    const lev = (det.snowfall && det.snowfall.levels) || {};
    const elevOf = (lv) => (lev[lv] && lev[lv].elev_m) || (lv === "base" ? det.base_m : lv === "top" ? det.top_m : Math.round((det.base_m + det.top_m) / 2));
    const hr = await Promise.all(LV.map((lv) => get(`/v1/resorts/${slug}/hourly?elevation=${lv}&hours=24&vars=temperature_2m`).catch(() => null)));
    if (slug !== S.slug) return null;
    const temp = LV.map((lv, i) => { const h = hr[i]; const md = h && h.variables && h.variables.temperature_2m && h.variables.temperature_2m.median;
      const v = (md || []).filter((x) => x != null); return { x: (h && h.elevation_m) || elevOf(lv), y: v.length ? v.reduce((s, x) => s + x, 0) / v.length : null, label: L[lv], lv }; });
    const snow = LV.map((lv) => ({ x: elevOf(lv), y: lev[lv] && lev[lv].depth_cm != null ? Math.round(lev[lv].depth_cm * 10) / 10 : null, label: L[lv], lv }));
    S.lapse = { temp, snow, usual: LV.map((lv) => ({ x: elevOf(lv), y: null, label: L[lv], lv })), usualLoaded: false };
    return S.lapse;
  }

  async function loadUsual(slug) {
    const lp = S.lapse; if (!lp || lp.usualLoaded) return;
    const hs = await Promise.all(LV.map((lv) => get(histPath(slug, lv)).catch(() => null)));
    if (slug !== S.slug) return;
    hs.forEach((h, i) => { const c = h && h.compare && h.compare.today; if (h && h.elev_m) lp.usual[i].x = h.elev_m;
      lp.usual[i].y = c && c.normal && c.normal.p50 != null ? Math.round(c.normal.p50 * 10) / 10 : null; });
    lp.usualLoaded = true;
  }
  const histPath = (slug, lv) => `/v1/history/resort/${slug}?elevation=${lv}&season=${SEASON.last}`;

  // ------------------------------------------------------------------------------------------ season (viz.season_from_history)
  const seasonSpec = (hi) => {
    const cl = hi.climatology || {}, mmdd = cl.mmdd || [];
    if (!mmdd.length) return null;
    const keep = ["10", "11", "12", "01", "02", "03", "04", "05"];
    let order = mmdd.filter((m) => keep.includes(m.slice(0, 2)) && m !== "02-29");
    order = order.filter((m) => ["10", "11", "12"].includes(m.slice(0, 2))).concat(order.filter((m) => !["10", "11", "12"].includes(m.slice(0, 2))));
    const ix = {}; mmdd.forEach((m, i) => { ix[m] = i; });
    const col = (k) => order.map((m) => { const a = cl[k] || [], v = a[ix[m]]; return v == null ? null : Math.round(v * 10) / 10; });
    const cur = {}; (hi.current || []).forEach((c) => { if (c.date) cur[c.date.slice(5)] = c.depth_cm; });
    const ps = (hi.past_seasons || [])[0];
    let last = null;
    if (ps && ps.depth_cm) { const bym = {}, st = new Date(ps.start + "T00:00:00Z");
      ps.depth_cm.forEach((v, k) => { const d = new Date(st.getTime() + k * 864e5); bym[d.toISOString().slice(5, 10)] = v == null ? null : Math.round(v * 10) / 10; });
      last = order.map((m) => bym[m] == null ? null : bym[m]); }
    const c = (hi.compare || {}).today || {};
    return { type: "season", units: S.us ? "us" : "metric", lang: C.locale, vh: 340,
      data: { mmdd: order, p10: col("p10"), p25: col("p25"), p50: col("p50"), p75: col("p75"), p90: col("p90"),
        cur: order.map((m) => cur[m] == null ? null : cur[m]), last, cur_label: hi.season, last_label: ps ? ps.season : null,
        elev_m: hi.elev_m, today, n_winters: c.n_winters || 46, period: (hi.era5_land || {}).period },
      L: { cur: L.this_w, last: L.last_w, p50: L.p50, band: L.band } };
  };
  const hTxt = (m) => S.us ? `${fmt(m / 0.3048)} ft (${fmt(m)} m)` : `${fmt(m)} m`;
  const dTxt = (cm) => cm == null ? "–" : S.us ? `${fmt(cm / 2.54, 1)} in (${fmt(cm)} cm)` : `${fmt(cm)} cm`;

  async function loadSeason(slug) {
    const fig = $("#tl-season"); msg(fig, L.loading); $("#tl-sum").textContent = ""; $("#tl-skey").textContent = "";
    let hi;
    try { hi = await get(histPath(slug, S.h)); } catch (e) { if (slug === S.slug) msg(fig, L.err); return; }
    if (slug !== S.slug) return;
    const sp = seasonSpec(hi);
    if (!sp) { msg(fig, L.err); return; }
    S.season = sp;
    const ch = await charts().catch(() => null);
    if (!ch) { msg(fig, L.err); return; }
    const d = sp.data, key = $("#tl-skey");
    key.innerHTML = [["cur", "k-cur", `${L.this_w} (${d.cur_label || ""})`]].concat(d.last ? [["last", "k-last", `${L.last_w} (${d.last_label})`]] : [])
      .concat([["p50", "k-p50", L.p50], ["band", "k-band", L.band]])
      .map(([k, c, t]) => `<button type="button" data-k="${k}" aria-pressed="true"><i class="${c}"></i>${t.replace(/</g, "&lt;")}</button>`).join("");
    fig.dataset.init = ""; msg(fig, ""); ch.draw(fig, sp);
    $("#tl-st").textContent = `${S.name} · ${hTxt(d.elev_m)}`;
    $("#tl-ss").textContent = d.period ? d.period.replace("..", "–") : "";
    const c = (hi.compare || {}).today;
    if (c) $("#tl-sum").textContent = L.today_sum.replace("{h}", hTxt(d.elev_m)).replace("{v}", dTxt(c.value_cm)).replace("{p}", dTxt(c.normal && c.normal.p50)).replace("{n}", c.n_winters || 46);
    $("#tl-csv2").disabled = false;
  }

  // ------------------------------------------------------------------------------------------ load a resort
  async function load(slug) {
    S.slug = slug; S.lapse = null; S.season = null;
    $("#tl-csv1").disabled = true; $("#tl-csv2").disabled = true;
    try { const u = new URL(location.href); u.searchParams.set("r", slug); history.replaceState(null, "", u); } catch (e) { /* */ }
    $("#tl-res").textContent = L.loading;
    const lp = await loadLapse(slug);
    if (slug !== S.slug) return;
    const det = S.det;
    if (!lp || !det) { $("#tl-res").textContent = L.err; loadSeason(slug); return; }
    S.name = (det.name || slug).split(",")[0];
    if (!q.value) q.value = S.name;
    $("#tl-res").textContent = `${S.name} · ${det.country || ""} · ${hTxt(det.base_m)} – ${hTxt(det.top_m)}`;
    $("#tl-map").href = `${C.root}${C.lang === "en" ? "" : "?lang=" + C.lang}#@${det.lat},${det.lon},11`;
    const rc = $("#tl-rc");
    rc.querySelector("span").textContent = `SnowScope (${C.year}), ${S.name}: snow depth and temperature by height, ${C.url}?r=${slug}, ${L.accessed} ${today}`;
    rc.hidden = false;
    if (S.sm === "usual") await loadUsual(slug);
    drawLapse();
    loadSeason(slug);
  }

  document.querySelectorAll('input[name="sm"]').forEach((r) => r.addEventListener("change", async () => {
    S.sm = r.value; if (!S.slug) return;
    if (S.sm === "usual") { drawLapse(); await loadUsual(S.slug); }
    drawLapse(); }));
  document.querySelectorAll('input[name="h"]').forEach((r) => r.addEventListener("change", () => { S.h = r.value; if (S.slug) loadSeason(S.slug); }));

  // ------------------------------------------------------------------------------------------ CSV + cite
  const head = (what, meth) => [`# SnowScope · ${S.name} (${S.slug}) · ${what}`, `# Publisher: SnowScope (Atlas Labs), ${C.site}`,
    `# Cite as: SnowScope (${C.year}), ${S.name}: ${what}, ${C.url}?r=${S.slug}, accessed ${today}`,
    "# Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Weather data Open-Meteo.com (CC BY 4.0, ECMWF, DWD). Past-winter archive contains modified Copernicus Climate Change Service information (ERA5-Land, Munoz Sabater 2019). Ski-area heights OpenSkiMap.org (ODbL).",
    `# Method: ${meth}`, `# Methods page: ${C.url}#method`];
  const save = (name, lines) => {
    const b = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  const v = (x, d = 1) => x == null ? "" : (Math.round(x * 10 ** d) / 10 ** d).toString();
  $("#tl-csv1").addEventListener("click", () => {
    const lp = S.lapse; if (!lp) return;
    const tf = ols(lp.temp.filter((p) => p.y != null)), sf = ols(lp.snow.filter((p) => p.y != null)), uf = ols(lp.usual.filter((p) => p.y != null));
    const L2 = head("snow depth and temperature by height", "temperature = median of the weather models, mean of the next 24 h from the download date, at each height; snow_today = SnowScope snow model analysis; snow_usual = median (p50) of 46 past winters for this calendar day (ERA5-Land, height-corrected); fits = ordinary least squares y = a + b*z, z in m.");
    L2.push(`# temperature fit: a=${v(tf && tf.a, 3)} degC, b=${v(tf && tf.b * 1000, 3)} degC/km, r2=${v(tf && tf.r2, 3)}, n=${tf ? tf.n : 0}`);
    L2.push(`# snow_today fit: a=${v(sf && sf.a, 2)} cm, b=${v(sf && sf.b * 100, 3)} cm/100m, r2=${v(sf && sf.r2, 3)}, n=${sf ? sf.n : 0}`);
    if (lp.usualLoaded) L2.push(`# snow_usual fit: a=${v(uf && uf.a, 2)} cm, b=${v(uf && uf.b * 100, 3)} cm/100m, r2=${v(uf && uf.r2, 3)}, n=${uf ? uf.n : 0}`);
    L2.push("level,height_m,temperature_c_mean_next_24h,snow_today_cm,snow_usual_for_date_cm,temperature_height_m");
    LV.forEach((lv, i) => L2.push([lv, lp.snow[i].x, v(lp.temp[i].y, 2), v(lp.snow[i].y), lp.usualLoaded ? v(lp.usual[i].y) : "", lp.temp[i].x].join(",")));
    save(`snowscope_${S.slug}_by_height_${today}.csv`, L2);
  });
  $("#tl-csv2").addEventListener("click", () => {
    const sp = S.season; if (!sp) return; const d = sp.data;
    const L2 = head(`snow depth this winter vs last winter at ${d.elev_m} m`, "snow depth (cm) at the given height: this winter = SnowScope snow model analysis (and forecast after the download date); past winters = daily ERA5-Land-based archive 1980-81..2025-26 adjusted to the height (percentiles per calendar day); last winter = the same archive.");
    L2.push("month_day,this_winter_cm,last_winter_cm,p10_cm,p25_cm,median_cm,p75_cm,p90_cm");
    d.mmdd.forEach((m, i) => L2.push([m, v(d.cur[i]), v((d.last || [])[i]), v(d.p10[i]), v(d.p25[i]), v(d.p50[i]), v(d.p75[i]), v(d.p90[i])].join(",")));
    save(`snowscope_${S.slug}_season_${d.elev_m}m_${today}.csv`, L2);
  });
  document.querySelectorAll("[data-tl-copy]").forEach((b) => b.addEventListener("click", () => {
    const box = b.closest(".cite"), rc = $("#tl-rc");
    const t = box.querySelector("p.c2").textContent + (rc.hidden ? "" : "\n" + rc.querySelector("span").textContent);
    if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
    const o = b.querySelector("span:last-child"), t0 = o.textContent; o.textContent = b.dataset.done; setTimeout(() => { o.textContent = t0; }, 1800); }));

  // ------------------------------------------------------------------------------------------ start (lazy)
  const first = new URLSearchParams(location.search).get("r") || C.default;
  const start = () => load(/^[a-z0-9_]+$/.test(first) ? first : C.default);
  const sec = $("#lapse");
  if (!("IntersectionObserver" in window) || location.hash) start();
  else { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: "300px" }); io.observe(sec); }
})();
