/* SnowScope snow reports: starts the shared site script (ads with Google's consent message, Pro = no ads, analytics),
   fills the Stay22 card for the post's place (date-aware link, Partner label, hidden for Pro) and puts the ad / partner
   labels in the page language. No framework, ~2 KB. */
(() => {
  "use strict";
  const L = JSON.parse(document.getElementById("blog-ui").textContent);
  const fix = (root) => {
    root.querySelectorAll(".adl").forEach((e) => { if (e.textContent !== L.ad) e.textContent = L.ad; });
    root.querySelectorAll(".housead .hl").forEach((e) => { if (e.textContent !== L.sponsored) e.textContent = L.sponsored; });
  };
  new MutationObserver(() => fix(document)).observe(document.body, { childList: true, subtree: true });
  const go = () => {
    if (!window.SS) return;
    SS.start().then(() => {
      document.querySelectorAll("[data-staycard]").forEach((el) => {
        if (SS.staysHidden && SS.staysHidden()) { el.hidden = true; return; }
        const u = SS.stayLink && SS.stayLink(+el.dataset.lat, +el.dataset.lon, el.dataset.place, el.dataset.day || null);
        if (!u) { el.hidden = true; return; }
        const a = el.querySelector("a");
        a.href = u.replace("campaign=snowscope_web", "campaign=snowscope_web_blog");
        el.hidden = false;
      });
    }).catch(() => {});
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  // interactive charts (engine/blog/viz.py): charts.js only when a chart comes near the screen (or the page opens on #chart-x)
  const figs = document.querySelectorAll("figure.ichart[data-src]");
  if (figs.length) {
    let asked = false;
    const load = () => { if (asked) return; asked = true; const s = document.createElement("script"); s.src = figs[0].dataset.src; s.defer = true; document.head.appendChild(s); };
    if (/^#chart-/.test(location.hash) || !("IntersectionObserver" in window)) load();
    else { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "400px" }); figs.forEach((f) => io.observe(f)); }
  }
  document.querySelectorAll("figure.ichart.anim [data-copy]").forEach((b) => b.addEventListener("click", () => {
    const u = b.closest("figure").dataset.share; if (navigator.clipboard) navigator.clipboard.writeText(u).catch(() => {});
    const o = b.querySelector("span:last-child"), t0 = o.textContent; o.textContent = b.dataset.done; setTimeout(() => { o.textContent = t0; }, 1800); }));
  document.querySelectorAll("figure.ichart.anim [data-native]").forEach((b) => { if (navigator.share) { b.hidden = false;
    b.addEventListener("click", () => navigator.share({ title: b.closest("figure").dataset.title, url: b.closest("figure").dataset.share }).catch(() => {})); } });
  // Cite this: today's date as "accessed", copy button
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll("[data-today]").forEach((e) => { e.textContent = today; });
  document.querySelectorAll("[data-cite-copy]").forEach((b) => b.addEventListener("click", () => {
    const t = b.closest(".cite").querySelector("p.c1").textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
    const o = b.querySelector("span:last-child"), t0 = o.textContent; o.textContent = b.dataset.done; setTimeout(() => { o.textContent = t0; }, 1800); }));
})();
