/* SnowScope Web post images: 1080x1350 (portrait) and 1080x1080 (square) PNGs with the map, a big number, the
   place, the SnowScope logo, snowscope.app and a QR code back to the exact view; download or share, plus a caption
   to copy. Snow-storm posts are free (marketing); the resort-ranking post is Pro. */
(() => {
  "use strict";
  const ROOT = new URL(document.documentElement.dataset.root || "./", location.href).href;
  const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
  const lang = (window.I18N && I18N.lang) || "en";
  const t = (s) => (window.I18N ? I18N.t(s) : s);
  let qrP = null, logoP = null;
  const loadQR = () => qrP || (qrP = new Promise((ok, ko) => { const s = document.createElement("script"); s.src = QR_SRC; s.onload = () => ok(window.qrcode); s.onerror = ko; document.head.appendChild(s); }));
  const loadImg = (src) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  const CAP = {
    en: "{big} {when} at {place}. Snow depth today and where to ski: snowscope.app #snow #ski #powder #snowscope",
    fr: "{big} {when} à {place}. La neige aujourd'hui et où skier : snowscope.app #neige #ski #poudreuse #snowscope",
    de: "{big} {when} in {place}. Schnee heute und wo Skifahren: snowscope.app #schnee #ski #powder #snowscope",
    it: "{big} {when} a {place}. La neve di oggi e dove sciare: snowscope.app #neve #sci #powder #snowscope",
    es: "{big} {when} en {place}. La nieve de hoy y dónde esquiar: snowscope.app #nieve #esqui #powder #snowscope",
    ar: "{big} {when} في {place}. الثلج اليوم وأين تتزلج: snowscope.app #ثلج #تزلج #snowscope",
  };
  function caption(o) {
    return (o.caption || CAP[lang] || CAP.en).replace("{big}", o.big + (o.big2 ? " " + o.big2 : "")).replace("{when}", t(o.sub || "")).replace("{place}", o.place || "")
      + (o.url ? " " + o.url : "");
  }
  function cover(ctx, img, x, y, w, h) {
    const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  async function render(o, W, H) {
    await Promise.all([document.fonts && document.fonts.load("700 80px Inter"), document.fonts && document.fonts.load("500 30px Inter")].filter(Boolean)).catch(() => {});
    const [qrLib, logo] = await Promise.all([loadQR().catch(() => null), logoP || (logoP = loadImg(ROOT + "icon-512.png"))]);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    c.fillStyle = "#0A0F17"; c.fillRect(0, 0, W, H);
    const mh = Math.round(H * (H >= 1900 ? 0.6 : H > W ? 0.56 : 0.5));
    if (o.snapshot) cover(c, o.snapshot, 0, 0, W, mh);
    let g = c.createLinearGradient(0, mh * 0.55, 0, mh);
    g.addColorStop(0, "rgba(10,15,23,0)"); g.addColorStop(1, "rgba(10,15,23,1)");
    c.fillStyle = g; c.fillRect(0, 0, W, mh + 2);
    g = c.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, "rgba(10,15,23,.75)"); g.addColorStop(1, "rgba(10,15,23,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, 170);
    c.drawImage(logo, 56, 48, 76, 76);
    c.fillStyle = "#fff"; c.font = "700 46px Inter, sans-serif"; c.textBaseline = "middle"; c.fillText("SnowScope", 150, 88);
    const rtl = lang === "ar";
    c.direction = rtl ? "rtl" : "ltr";
    let y = mh - 30;
    c.textBaseline = "alphabetic"; c.textAlign = rtl ? "right" : "left";
    const X = rtl ? W - 64 : 64;
    c.fillStyle = "#fff"; c.font = (o.lines ? "700 108px" : "700 170px") + " Inter, sans-serif"; c.fillText(o.big, X, y + (o.lines ? 80 : 120));
    if (o.big2) { const w = c.measureText(o.big + " ").width; c.fillStyle = "#8DBBFF"; c.font = "700 72px Inter, sans-serif"; c.fillText(o.big2, rtl ? X - w : X + w, y + (o.lines ? 80 : 120)); }
    y += o.lines ? 130 : 180;
    c.fillStyle = "#9FB3CC"; c.font = "500 40px Inter, sans-serif"; c.fillText(t(o.sub || ""), X, y); y += 70;
    c.fillStyle = "#fff"; c.font = "700 58px Inter, sans-serif"; c.fillText(o.place || "", X, y); y += 52;
    c.fillStyle = "#C5CEDA"; c.font = "500 32px Inter, sans-serif"; c.fillText(o.date || "", X, y); y += 40;
    if (o.extra) { y += 18; c.fillStyle = "#8DBBFF"; c.font = "600 34px Inter, sans-serif"; c.fillText(t(o.extra), X, y); y += 30; }
    if (o.lines) {
      c.font = "600 34px Inter, sans-serif";
      for (const [a, b] of o.lines.slice(0, H > W ? 5 : 3)) {
        y += 56;
        c.fillStyle = "#fff"; c.textAlign = rtl ? "right" : "left"; c.fillText(a, X, y);
        c.fillStyle = "#8DBBFF"; c.textAlign = rtl ? "left" : "right"; c.fillText(b, rtl ? 64 + 230 : W - 64 - 230, y);
      }
      c.textAlign = rtl ? "right" : "left";
    }
    // footer: site + QR to the exact view
    const q = 196, qx = rtl ? 56 : W - q - 56, qy = H - q - 56;
    c.fillStyle = "#fff"; rr(c, qx - 12, qy - 12, q + 24, q + 24, 18); c.fill();
    if (qrLib) {
      const qr = qrLib(0, "M"); qr.addData(o.url); qr.make();
      const n = qr.getModuleCount(), s = q / n;
      c.fillStyle = "#0A0F17";
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) c.fillRect(qx + k * s, qy + r * s, Math.ceil(s), Math.ceil(s));
    }
    c.fillStyle = "#fff"; c.font = "700 44px Inter, sans-serif"; c.textAlign = rtl ? "right" : "left";
    c.fillText("snowscope.app", X, H - 92);
    c.fillStyle = "#9FB3CC"; c.font = "500 28px Inter, sans-serif"; c.fillText(t("Snow depth on every slope, every day"), X, H - 52);
    return cv;
  }
  const SIZE = { p: 1350, t: 1920, s: 1080 };
  const blob = (cv) => new Promise((ok) => cv.toBlob(ok, "image/png"));
  /** o: {big, sub, place, date, url, snapshot (canvas/image), lines?, locked?, file} */
  async function open(o) {
    const esc = SS.esc;
    if (SS.track) SS.track(o.lines ? "create_post" : "share_image", { kind: o.file || "post" });
    const m = SS.modal(SS.head(t("Post image")) + '<div class="seg2" role="group" style="margin-bottom:10px"><button data-f="p" aria-pressed="true">4:5</button><button data-f="t" aria-pressed="false">' + t("Story") + '</button><button data-f="s" aria-pressed="false">1:1</button></div>' +
      '<div class="postprev"><p class="none">' + t("Loading…") + "</p></div>" +
      (o.locked ? '<div class="prolock" style="margin-top:10px"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>' + t("Share posts are in Pro") + "</b><br>" + t("Ready-made images with your resorts, for Instagram and TikTok.") + '</p><button class="btn ink" data-up>' + t("Get Pro in the app") + "</button></div>"
        : '<div class="filters" style="margin-top:10px"><button class="btn ink" data-dl><span class="ms">download</span>' + t("Download") + '</button><button class="btn tonal" data-share><span class="ms">share</span>' + t("Share") + "</button></div>" +
          '<label class="field"><span>' + t("Caption") + '</span><textarea rows="3" style="width:100%;border-radius:12px;border:1px solid var(--outline);background:var(--surface2);color:var(--ink);padding:10px;font:inherit">' + esc(caption(o)) + '</textarea></label><div class="filters"><button class="btn ghost" data-copy><span class="ms">content_copy</span>' + t("Copy caption") + "</button>" +
          (o.url ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(caption(o) + " " + o.url) + '"><span class="ms">chat</span>WhatsApp</a>' : "") + "</div>"));
    const prev = m.el.querySelector(".postprev");
    const pics = {};
    const show = async (f) => {
      pics[f] = pics[f] || await render(o, 1080, SIZE[f]);
      const cv = pics[f];
      cv.style.cssText = "width:100%;height:auto;border-radius:14px;display:block" + (o.locked ? ";filter:blur(9px)" : "");
      prev.innerHTML = ""; prev.appendChild(cv);
    };
    let fmt = "p";
    show(fmt);
    m.el.addEventListener("click", async (e) => {
      const f = e.target.closest("[data-f]");
      if (f) { fmt = f.dataset.f; m.el.querySelectorAll("[data-f]").forEach((b) => b.setAttribute("aria-pressed", b === f)); show(fmt); return; }
      if (e.target.closest("[data-up]")) { m.close(); SS.upsell(t("Share posts are in Pro")); return; }
      const name = (o.file || "snowscope") + ({ p: "-4x5", t: "-story", s: "-1x1" })[fmt] + ".png";
      if (e.target.closest("[data-dl]")) {
        const b = await blob(pics[fmt] || await render(o, 1080, SIZE[fmt]));
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      if (e.target.closest("[data-share]")) {
        const b = await blob(pics[fmt]);
        const file = new File([b], name, { type: "image/png" });
        const text = m.el.querySelector("textarea").value + (o.url && !m.el.querySelector("textarea").value.includes(o.url) ? " " + o.url : "");
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); } catch { /* cancelled */ } }
        else { try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); }
      }
      if (e.target.closest("[data-copy]")) {
        try { await navigator.clipboard.writeText(m.el.querySelector("textarea").value); e.target.closest("[data-copy]").lastChild.textContent = t("Copied"); } catch { m.el.querySelector("textarea").select(); }
      }
    });
  }
  window.SSPost = { open, render };
})();
