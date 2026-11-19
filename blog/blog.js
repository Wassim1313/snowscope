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
      // budget stays map of price posts (engine/blog/render.staymap_html): Stay22 loads only on tap; chips switch the pick
      document.querySelectorAll("[data-staymap-blog]").forEach((fig) => {
        const c = SS.S && SS.S.cfg && SS.S.cfg.stay22;
        if (!c || !c.aid || (SS.staysHidden && SS.staysHidden())) return;
        fig.hidden = false;
        const box = fig.querySelector(".smbox"), lang = (document.documentElement.lang || "en").slice(0, 2);
        const today = new Date().toISOString().slice(0, 10);
        const url = (b) => {
          const d = b.dataset, q = new URLSearchParams({ aid: c.aid });
          ["address", "nelat", "nelng", "swlat", "swlng", "lat", "lng"].forEach((k) => { if (d[k]) q.set(k, d[k]); });
          let cin = d.cin && d.cin > today ? d.cin : today, cout = d.cout && d.cout > cin ? d.cout : "";
          if (!cout) { const x = new Date(cin + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + 2); cout = x.toISOString().slice(0, 10); }
          q.set("checkin", cin); q.set("checkout", cout); q.set("adults", "2");
          q.set("campaign", "snowscope_web_blog_budgetmap"); q.set("maincolor", "1463F3");
          q.set("hidesettings", "true"); q.set("hidebrandlogo", "true"); q.set("hidefooter", "true");
          q.set("ljs", ["en", "fr", "de", "es", "it"].includes(lang) ? lang : "en");
          q.set("currency", (SS.stayCur && SS.stayCur()) || d.cur || "EUR");
          if (d.max) { q.set("max", d.max); q.set("priceper", "nightly"); }
          return "https://www.stay22.com/embed/gm?" + q.toString();
        };
        // the tap on "Show" is the reader's yes to the partner map, remembered like the site's map tap (core.js PC)
        const show = (b) => { if (SS.partnerSet && !(SS.partnerGranted && SS.partnerGranted())) { SS.partnerSet(true, "blog_map_tap"); const pc = document.getElementById("pcCard"); if (pc) pc.remove(); }
          if (SS.hit) SS.hit("/ad/stay22/blog/budgetmap_open", "stay22");
          box.innerHTML = '<iframe loading="lazy" title="' + SS.esc(b.dataset.place) + '" src="' + SS.esc(url(b)) + '"></iframe>'; };
        fig.querySelectorAll(".smchip").forEach((b) => b.addEventListener("click", () => {
          fig.querySelectorAll(".smchip").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
          if (box.querySelector("iframe")) show(b);
        }));
        const go = fig.querySelector(".smgo");
        if (go) go.addEventListener("click", () => show(fig.querySelector('.smchip[aria-pressed="true"]') || fig.querySelector(".smchip")));
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
