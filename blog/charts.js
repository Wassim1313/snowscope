/* SnowScope blog: interactive, shareable charts (engine/blog/viz.py). No framework, loaded lazily by blog.js when a
   chart comes near the screen. Each <figure class="ichart"> carries its data in <script type="application/json"
   class="ic-data">; the box keeps its size before and after drawing (aspect-ratio set by the server: no layout shift).
   Also exposes window.SSChart.draw(el, spec) for the tools pages (web/blog/tools.js).
   Types: season (this winter vs last winter vs past winters band), bands (snow / mixed / rain by height, stacked %),
   bars (grouped bars per day), scatter (values vs height + fitted line). Keyboard: focus the chart, arrows move. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const W = 640;
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const fmt = (v, d = 0) => v == null || !isFinite(v) ? "–" : (+v).toLocaleString(document.documentElement.lang || "en", { maximumFractionDigits: d });
  const rtl = () => document.documentElement.dir === "rtl";
  const us = (s) => s.units === "us";
  const cm = (s, v) => v == null ? null : (us(s) ? v / 2.54 : v);
  const cmU = (s) => us(s) ? "in" : "cm";
  const mm = (s, v) => v == null ? null : (us(s) ? v / 0.3048 : v);
  const mU = (s) => us(s) ? "ft" : "m";
  const ticks = (lo, hi, n = 5) => {
    const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => span / x <= n) || mag * 10;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out;
  };
  const MON = (lang, m) => { try { return new Date(Date.UTC(2001, m - 1, 1)).toLocaleString(lang, { month: "short", timeZone: "UTC" }); } catch (e) { return m; } };
  const dateLab = (lang, iso) => { try { return new Date(iso + "T12:00:00Z").toLocaleDateString(lang, { day: "numeric", month: "short", timeZone: "UTC" }); } catch (e) { return iso; } };

  function frame(box, vh) {
    box.textContent = "";
    const svg = el("svg", { viewBox: `0 0 ${W} ${vh}`, class: "ic-svg", "aria-hidden": "true", focusable: "false" }, box);
    const tip = document.createElement("div"); tip.className = "ic-tip"; tip.hidden = true; box.appendChild(tip);
    return { svg, tip };
  }

  // ------------------------------------------------------------------------------------------- season
  function season(box, s, st) {
    const d = s.data, L = s.L, vh = s.vh || 360, lang = s.lang;
    const l = 46, r = 12, t = 14, b = 30;
    const n = d.mmdd.length;
    const ser = { cur: d.cur, last: d.last, p50: d.p50 };
    let vmax = 10;
    for (const k of ["p90", "cur", "last"]) for (const v of d[k] || []) if (v != null && v > vmax) vmax = v;
    vmax = cm(s, vmax) * 1.08;
    const X = (i) => l + (i / (n - 1)) * (W - l - r), Y = (v) => t + (1 - cm(s, v) / vmax) * (vh - t - b);
    const { svg, tip } = frame(box, vh);
    for (const v of ticks(0, vmax, 4)) {
      const y = t + (1 - v / vmax) * (vh - t - b);
      el("line", { x1: l, x2: W - r, y1: y, y2: y, class: "gl" }, svg);
      el("text", { x: l - 6, y: y + 4, "text-anchor": "end", class: "ax" }, svg).textContent = fmt(v);
    }
    el("text", { x: l - 6, y: t - 2, "text-anchor": "end", class: "ax u" }, svg).textContent = cmU(s);
    d.mmdd.forEach((m, i) => { if (m.endsWith("-01")) {
      el("line", { x1: X(i), x2: X(i), y1: t, y2: vh - b, class: "gl" }, svg);
      el("text", { x: X(i) + 3, y: vh - 10, class: "ax" }, svg).textContent = MON(lang, +m.slice(0, 2));
    } });
    const area = (lo, hi) => { let p = ""; for (let i = 0; i < n; i++) if (hi[i] != null) p += `${X(i).toFixed(1)},${Y(hi[i]).toFixed(1)} `;
      for (let i = n - 1; i >= 0; i--) if (lo[i] != null) p += `${X(i).toFixed(1)},${Y(lo[i]).toFixed(1)} `; return p; };
    const line = (a) => { let p = "", on = false; for (let i = 0; i < n; i++) { if (a[i] == null) { on = false; continue; }
      p += (on ? "L" : "M") + X(i).toFixed(1) + "," + Y(a[i]).toFixed(1); on = true; } return p; };
    const g = {};
    g.band = el("g", { "data-k": "band" }, svg);
    el("polygon", { points: area(d.p10, d.p90), class: "s-band" }, g.band);
    el("polygon", { points: area(d.p25, d.p75), class: "s-band2" }, g.band);
    g.p50 = el("path", { d: line(d.p50), class: "s-med", "data-k": "p50" }, svg);
    if (d.last) g.last = el("path", { d: line(d.last), class: "s-last", "data-k": "last" }, svg);
    g.cur = el("path", { d: line(d.cur), class: "s-cur", "data-k": "cur" }, svg);
    const ti = d.mmdd.indexOf((d.today || "").slice(5));
    if (ti >= 0) { el("line", { x1: X(ti), x2: X(ti), y1: t, y2: vh - b, class: "today" }, svg); }
    const rule = el("line", { x1: 0, x2: 0, y1: t, y2: vh - b, class: "rule", visibility: "hidden" }, svg);
    const dots = ["cur", "last", "p50"].map((k) => el("circle", { r: 4, class: "dot d-" + k, visibility: "hidden" }, svg));
    st.vis = (k, on) => { const x = g[k]; if (x) x.style.display = on ? "" : "none"; };
    st.n = n;
    st.def = ti >= 0 ? ti : n - 1;
    st.show = (i) => {
      rule.setAttribute("x1", X(i)); rule.setAttribute("x2", X(i)); rule.setAttribute("visibility", "visible");
      ["cur", "last", "p50"].forEach((k, j) => { const v = (ser[k] || [])[i]; const ok = v != null && (!g[k] || g[k].style.display !== "none");
        dots[j].setAttribute("visibility", ok ? "visible" : "hidden"); if (ok) { dots[j].setAttribute("cx", X(i)); dots[j].setAttribute("cy", Y(v)); } });
      const u = cmU(s), row = (lab, v, c) => v == null ? "" : `<div><i class="${c}"></i>${lab}: <b>${fmt(cm(s, v))} ${u}</b></div>`;
      const yr = (d.cur_label || "").slice(0, 4);
      return { x: X(i) / W, html: `<b>${dateLab(lang, `${(+d.mmdd[i].slice(0, 2) >= 9 ? yr : +yr + 1)}-${d.mmdd[i]}`)}</b>` +
        row(L.cur, d.cur[i], "k-cur") + (d.last ? row(L.last, d.last[i], "k-last") : "") + row(L.p50, d.p50[i], "k-p50") +
        (d.p10[i] != null ? `<div class="m">${L.band}: ${fmt(cm(s, d.p10[i]))}–${fmt(cm(s, d.p90[i]))} ${u}</div>` : "") };
    };
    st.hide = () => { rule.setAttribute("visibility", "hidden"); dots.forEach((x) => x.setAttribute("visibility", "hidden")); };
    st.idx = (fx) => Math.max(0, Math.min(n - 1, Math.round(((fx * W) - l) / (W - l - r) * (n - 1))));
    return { svg, tip };
  }

  // ------------------------------------------------------------------------------------------- bands (stacked %)
  const PH = ["snow", "mixed", "rain"];
  function bands(box, s, st) {
    const d = s.data, L = s.L, rows = d.rows.slice().reverse(), vh = s.vh || 40 + rows.length * 30;
    const l = 64, r = 12, t = 8, rh = (vh - t - 26) / rows.length;
    const { svg, tip } = frame(box, vh);
    const X = (p) => l + p / 100 * (W - l - r);
    for (const p of [0, 25, 50, 75, 100]) { el("line", { x1: X(p), x2: X(p), y1: t, y2: vh - 22, class: "gl" }, svg);
      el("text", { x: X(p), y: vh - 6, "text-anchor": "middle", class: "ax" }, svg).textContent = p + " %"; }
    const hl = el("rect", { x: 0, y: 0, width: W, height: rh, class: "hl", visibility: "hidden" }, svg);
    rows.forEach((row, k) => {
      const y = t + k * rh;
      el("text", { x: l - 8, y: y + rh / 2 + 4, "text-anchor": "end", class: "lb" }, svg).textContent = fmt(mm(s, row.elev_m)) + " " + mU(s);
      let x0 = 0;
      for (const ph of PH) { const v = row[ph + "_pct"] || 0; if (v > 0) el("rect", { x: X(x0), y: y + 3, width: Math.max(0.5, X(x0 + v) - X(x0)), height: rh - 6, class: "ph-" + ph, rx: 2 }, svg); x0 += v; }
    });
    st.n = rows.length; st.def = 0;
    st.show = (i) => { const row = rows[i]; hl.setAttribute("y", t + i * rh); hl.setAttribute("visibility", "visible");
      return { x: 0.5, y: (t + i * rh) / vh, html: `<b>${fmt(mm(s, row.elev_m))} ${mU(s)}</b>` + PH.map((ph) => `<div><i class="ph-${ph}"></i>${L[ph]}: <b>${row[ph + "_pct"]} %</b></div>`).join("") }; };
    st.hide = () => hl.setAttribute("visibility", "hidden");
    st.idx = (fx, fy) => Math.max(0, Math.min(rows.length - 1, Math.floor((fy * vh - t) / rh)));
    st.vertical = true;
    return { svg, tip };
  }

  // ------------------------------------------------------------------------------------------- bars (grouped by day)
  function bars(box, s, st) {
    const d = s.data, L = s.L, vh = s.vh || 300, lang = s.lang;
    const l = 40, r = 10, t = 12, b = 44, nd = d.dates.length, nr = d.rows.length;
    let vmax = 1; d.rows.forEach((row) => row.values.forEach((v) => { if (v > vmax) vmax = v; }));
    const conv = (v) => d.unit === "cm" ? cm(s, v) : d.unit === "mm" && us(s) ? v / 25.4 : v;
    const unit = d.unit === "cm" ? cmU(s) : d.unit === "mm" && us(s) ? "in" : d.unit;
    vmax = conv(vmax) * 1.1;
    const cw = (W - l - r) / nd, bw = Math.min(26, (cw - 8) / nr);
    const Y = (v) => t + (1 - conv(v) / vmax) * (vh - t - b);
    const { svg, tip } = frame(box, vh);
    for (const v of ticks(0, vmax, 4)) { const y = t + (1 - v / vmax) * (vh - t - b);
      el("line", { x1: l, x2: W - r, y1: y, y2: y, class: "gl" }, svg);
      el("text", { x: l - 6, y: y + 4, "text-anchor": "end", class: "ax" }, svg).textContent = fmt(v, unit === "in" ? 1 : 0); }
    el("text", { x: l - 6, y: t - 2, "text-anchor": "end", class: "ax u" }, svg).textContent = unit;
    const hl = el("rect", { x: 0, y: t, width: cw, height: vh - t - b, class: "hl", visibility: "hidden" }, svg);
    d.dates.forEach((dt, j) => {
      const x0 = l + j * cw + (cw - bw * nr) / 2;
      el("text", { x: l + j * cw + cw / 2, y: vh - b + 16, "text-anchor": "middle", class: "ax" + (dt > d.today ? " fc" : "") }, svg).textContent = dateLab(lang, dt);
      d.rows.forEach((row, k) => { const v = row.values[j] || 0;
        el("rect", { x: x0 + k * bw + 1, y: Y(v), width: bw - 2, height: Math.max(0, vh - b - Y(v)), rx: 2,
          class: `sr sr${k}` + (dt > d.today ? " fc" : ""), "data-k": "r" + k }, svg); });
    });
    st.vis = (k, on) => svg.querySelectorAll(`[data-k="${k}"]`).forEach((x) => { x.style.display = on ? "" : "none"; });
    st.n = nd; st.def = Math.max(0, d.dates.findIndex((x) => x > d.today));
    st.show = (j) => { hl.setAttribute("x", l + j * cw); hl.setAttribute("visibility", "visible");
      return { x: (l + j * cw + cw / 2) / W, html: `<b>${dateLab(lang, d.dates[j])}${d.dates[j] > d.today ? " · " + L.forecast : ""}</b>` +
        d.rows.map((row, k) => `<div><i class="sr${k}"></i>${row.name}: <b>${fmt(conv(row.values[j] || 0), unit === "in" ? 1 : 0)} ${unit}</b></div>`).join("") }; };
    st.hide = () => hl.setAttribute("visibility", "hidden");
    st.idx = (fx) => Math.max(0, Math.min(nd - 1, Math.floor((fx * W - l) / cw)));
    return { svg, tip };
  }

  // ------------------------------------------------------------------------------------------- scatter + fit
  function scatter(box, s, st) {
    const d = s.data, L = s.L, vh = s.vh || 360;
    const l = 52, r = 14, t = 14, b = 34;
    const pts = d.points.filter((p) => p.x != null && p.y != null);
    const cx = (v) => d.xunit === "m" ? mm(s, v) : v, cy = (v) => d.yunit === "cm" ? cm(s, v) : v;
    const xu = d.xunit === "m" ? mU(s) : d.xunit, yu = d.yunit === "cm" ? cmU(s) : d.yunit;
    const xs = pts.map((p) => cx(p.x)), ys = pts.map((p) => cy(p.y));
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(...ys);
    const px = (x1 - x0) * 0.06 || 50, py = (y1 - y0) * 0.1 || 1; x0 -= px; x1 += px; y1 += py; if (y0 < 0) y0 -= py;
    const X = (v) => l + (v - x0) / (x1 - x0) * (W - l - r), Y = (v) => t + (1 - (v - y0) / (y1 - y0)) * (vh - t - b);
    const { svg, tip } = frame(box, vh);
    for (const v of ticks(y0, y1, 4)) { el("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), class: "gl" + (v === 0 ? " z" : "") }, svg);
      el("text", { x: l - 6, y: Y(v) + 4, "text-anchor": "end", class: "ax" }, svg).textContent = fmt(v, Math.abs(y1 - y0) < 10 ? 1 : 0); }
    for (const v of ticks(x0, x1, 5)) el("text", { x: X(v), y: vh - 12, "text-anchor": "middle", class: "ax" }, svg).textContent = fmt(v);
    el("text", { x: l - 6, y: t - 2, "text-anchor": "end", class: "ax u" }, svg).textContent = yu;
    el("text", { x: W - r, y: vh - 12 - 14, "text-anchor": "end", class: "ax u" }, svg).textContent = xu;
    if (d.fit) { const a = d.fit.a, k = d.fit.b; const xa = Math.min(...pts.map((p) => p.x)), xb = Math.max(...pts.map((p) => p.x));
      el("line", { x1: X(cx(xa)), y1: Y(cy(a + k * xa)), x2: X(cx(xb)), y2: Y(cy(a + k * xb)), class: "fit" }, svg); }
    const ring = el("circle", { r: 8, class: "ring", visibility: "hidden" }, svg);
    const order = pts.map((p, i) => i).sort((i, j) => pts[i].x - pts[j].x);
    order.forEach((i) => el("circle", { cx: X(cx(pts[i].x)), cy: Y(cy(pts[i].y)), r: 5, class: "pt " + (pts[i].kind || "model") }, svg));
    st.n = order.length; st.def = 0;
    st.show = (k) => { const p = pts[order[k]]; ring.setAttribute("cx", X(cx(p.x))); ring.setAttribute("cy", Y(cy(p.y))); ring.setAttribute("visibility", "visible");
      return { x: X(cx(p.x)) / W, html: `<b>${p.label || ""}</b><div>${fmt(cx(p.x))} ${xu} · <b>${fmt(cy(p.y), 1)} ${yu}</b></div>` + (p.note ? `<div class="m">${p.note}</div>` : "") }; };
    st.hide = () => ring.setAttribute("visibility", "hidden");
    st.idx = (fx) => { const x = x0 + (fx * W - l) / (W - l - r) * (x1 - x0); let best = 0, bd = 1e18;
      order.forEach((i, k) => { const dd = Math.abs(cx(pts[i].x) - x); if (dd < bd) { bd = dd; best = k; } }); return best; };
    return { svg, tip };
  }

  const TYPES = { season, bands, bars, scatter };

  function draw(fig, spec) {
    const box = fig.querySelector(".ic-plot");
    if (!box || !TYPES[spec.type]) return;
    const st = {};
    const { tip } = TYPES[spec.type](box, spec, st);
    const live = fig.querySelector(".ic-live");
    let cur = -1;
    const show = (i, keep) => { cur = i; const r = st.show(i); tip.innerHTML = r.html; tip.hidden = false;
      const left = r.x * box.clientWidth, w = tip.offsetWidth;
      let x = left + 12; if (x + w > box.clientWidth - 4) x = left - w - 12; tip.style.left = Math.max(4, x) + "px";
      tip.style.top = (st.vertical ? Math.min(box.clientHeight - tip.offsetHeight - 4, (r.y || 0) * box.clientHeight + 30) : 6) + "px";
      if (live && keep) live.textContent = tip.textContent; };
    const hide = () => { tip.hidden = true; st.hide(); };
    box.addEventListener("pointermove", (e) => { const b = box.getBoundingClientRect(); let fx = (e.clientX - b.left) / b.width; if (rtl() && spec.type !== "bands") fx = fx;
      show(st.idx(fx, (e.clientY - b.top) / b.height)); });
    box.addEventListener("pointerleave", hide);
    box.addEventListener("focus", () => show(cur >= 0 ? cur : st.def, true));
    box.addEventListener("blur", hide);
    box.addEventListener("keydown", (e) => {
      const k = e.key, step = e.shiftKey ? 7 : 1;
      let i = cur >= 0 ? cur : st.def;
      const fwd = st.vertical ? "ArrowDown" : "ArrowRight", back = st.vertical ? "ArrowUp" : "ArrowLeft";
      if (k === fwd) i += step; else if (k === back) i -= step; else if (k === "Home") i = 0; else if (k === "End") i = st.n - 1;
      else if (k === "Escape") { hide(); return; } else return;
      e.preventDefault(); show(Math.max(0, Math.min(st.n - 1, i)), true);
    });
    fig.querySelectorAll(".ic-key button[data-k]").forEach((bt) => bt.addEventListener("click", () => {
      const on = bt.getAttribute("aria-pressed") !== "true"; bt.setAttribute("aria-pressed", on); if (st.vis) st.vis(bt.dataset.k, on); }));
    fig.classList.add("ready");
  }

  function share(fig) {
    const url = fig.dataset.share, title = fig.dataset.title || document.title;
    const cp = fig.querySelector("[data-copy]");
    if (cp) cp.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(url); } catch (e) {
        const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (x) { /* */ } ta.remove(); }
      const o = cp.querySelector("span:last-child"), t0 = o.textContent; o.textContent = cp.dataset.done; setTimeout(() => { o.textContent = t0; }, 1800);
    });
    const nat = fig.querySelector("[data-native]");
    if (nat && navigator.share) { nat.hidden = false; nat.addEventListener("click", () => navigator.share({ title, url }).catch(() => {})); }
  }

  function init(fig) {
    if (fig.dataset.init) return; fig.dataset.init = "1";
    const js = fig.querySelector("script.ic-data");
    if (js) { try { draw(fig, JSON.parse(js.textContent)); } catch (e) { /* the table + PNG stay */ } }
    share(fig);
  }

  window.SSChart = { draw: (fig, spec) => { draw(fig, spec); }, init };
  document.querySelectorAll("figure.ichart").forEach(init);
})();
