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
})();
