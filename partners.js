/* SnowScope partners: "Plan your trip" row + one contextual chip in the resort panel (MONETIZATION 2026-11-03).
 *
 * docs/MONETIZATION_PLAN_2026-11.md §3 (GEO rules) and §6 (framework). Owned by the MONETIZATION agent; app.js / core.js
 * are not touched. Hook: this file only needs to be loaded after core.js (index.html + resort pages + build_web.py
 * PAGES_FILES / cache-busting, request in progress/data_requests.md "MONETIZATION -> UX-V3"). It mounts itself right
 * after the resort panel's Stays card (details.stays[data-where="panel"]), or into any element <div data-ptrip
 * data-lat data-lon data-place data-where data-day> a page provides.
 *
 * Rules (server: engine/affiliates.select_offers, GET /v1/affiliates?ctx=):
 * - one partner unit per screen next to Stay22: the row IS that unit (chip inside it), never a second block;
 * - lazy: nothing is fetched until the row's place is on screen; links only, no partner script, no cookie set by us;
 * - every link rel="sponsored", a visible "Partner" label; Pro members never see the row (Stay22 card rules unchanged);
 * - until the owner pastes network ids the server returns only Stay22 (+ Stay22-routed lessons) -> no dead links;
 * - counters: first-party /v1/hit /ad/<partner>/<placement>/<load|view|click> (src "partner").
 */
(() => {
  "use strict";
  const T = {
    en: { s_title: "Storm coming {w}: +{n} cm", s_stay: "Stays for those dates", s_rent: "Rent skis for {d}", h: "Plan your trip", partner: "Partner", stay: "Stays", rental: "Rentals", transfer: "Transfers", pass: "Lift pass",
          lesson: "Lessons", insurance: "Insurance", gear: "Gear",
          c_rental_powder: "Fresh snow at {r}: rent skis", c_rental: "Rent skis at {r}", c_lesson: "Lessons & tours at {r}",
          c_transfer: "Airport transfer to {r} · {d}", c_pass: "Lift pass & ski packages · {r}", c_stay: "Stays near {r} · {d}",
          c_insurance: "Ski travel insurance for {d}", c_gear: "Ski gear for next winter", note: "Partner links: we may earn a commission." },
    fr: { s_title: "Tempête attendue {w} : +{n} cm", s_stay: "Logements pour ces dates", s_rent: "Louer ses skis pour {d}", h: "Préparer le séjour", partner: "Partenaire", stay: "Logements", rental: "Location", transfer: "Transferts", pass: "Forfait",
          lesson: "Cours", insurance: "Assurance", gear: "Matériel",
          c_rental_powder: "Neige fraîche à {r} : louez vos skis", c_rental: "Louer ses skis à {r}", c_lesson: "Cours et sorties à {r}",
          c_transfer: "Transfert aéroport vers {r} · {d}", c_pass: "Forfaits et séjours ski · {r}", c_stay: "Logements près de {r} · {d}",
          c_insurance: "Assurance voyage ski pour le {d}", c_gear: "Matériel de ski pour l'hiver prochain", note: "Liens partenaires : nous pouvons toucher une commission." },
    de: { s_title: "Sturm im Anmarsch {w}: +{n} cm", s_stay: "Unterkünfte für diese Tage", s_rent: "Ski leihen für {d}", h: "Reise planen", partner: "Partner", stay: "Unterkünfte", rental: "Skiverleih", transfer: "Transfers", pass: "Skipass",
          lesson: "Skikurse", insurance: "Versicherung", gear: "Ausrüstung",
          c_rental_powder: "Neuschnee in {r}: Ski leihen", c_rental: "Ski leihen in {r}", c_lesson: "Kurse & Touren in {r}",
          c_transfer: "Flughafentransfer nach {r} · {d}", c_pass: "Skipass & Skireisen · {r}", c_stay: "Unterkünfte bei {r} · {d}",
          c_insurance: "Ski-Reiseversicherung für {d}", c_gear: "Skiausrüstung für den nächsten Winter", note: "Partnerlinks: wir erhalten ggf. eine Provision." },
    it: { s_title: "In arrivo una nevicata {w}: +{n} cm", s_stay: "Alloggi per quelle date", s_rent: "Noleggia gli sci per {d}", h: "Organizza il viaggio", partner: "Partner", stay: "Alloggi", rental: "Noleggio", transfer: "Transfer", pass: "Skipass",
          lesson: "Lezioni", insurance: "Assicurazione", gear: "Attrezzatura",
          c_rental_powder: "Neve fresca a {r}: noleggia gli sci", c_rental: "Noleggia gli sci a {r}", c_lesson: "Lezioni e tour a {r}",
          c_transfer: "Transfer dall'aeroporto a {r} · {d}", c_pass: "Skipass e pacchetti · {r}", c_stay: "Alloggi vicino a {r} · {d}",
          c_insurance: "Assicurazione viaggio sci per il {d}", c_gear: "Attrezzatura per il prossimo inverno", note: "Link partner: potremmo ricevere una commissione." },
    es: { s_title: "Llega una tormenta {w}: +{n} cm", s_stay: "Alojamiento para esas fechas", s_rent: "Alquila esquís para {d}", h: "Planifica el viaje", partner: "Socio", stay: "Alojamiento", rental: "Alquiler", transfer: "Traslados", pass: "Forfait",
          lesson: "Clases", insurance: "Seguro", gear: "Material",
          c_rental_powder: "Nieve fresca en {r}: alquila esquís", c_rental: "Alquila esquís en {r}", c_lesson: "Clases y excursiones en {r}",
          c_transfer: "Traslado desde el aeropuerto a {r} · {d}", c_pass: "Forfaits y paquetes de esquí · {r}", c_stay: "Alojamiento cerca de {r} · {d}",
          c_insurance: "Seguro de viaje de esquí para el {d}", c_gear: "Material de esquí para el próximo invierno", note: "Enlaces de socios: podemos recibir una comisión." },
    ar: { s_title: "عاصفة ثلجية قادمة {w}: +{n} سم", s_stay: "إقامة لهذه التواريخ", s_rent: "اكتري الزلاجات ليوم {d}", h: "خطّط لرحلتك", partner: "شريك", stay: "الإقامة", rental: "كراء المعدات", transfer: "النقل", pass: "تذكرة المصاعد",
          lesson: "دروس", insurance: "تأمين", gear: "معدات",
          c_rental_powder: "ثلج جديد في {r}: اكتري الزلاجات", c_rental: "اكتري الزلاجات في {r}", c_lesson: "دروس وجولات في {r}",
          c_transfer: "النقل من المطار إلى {r} · {d}", c_pass: "تذاكر وعروض التزلج · {r}", c_stay: "إقامة قرب {r} · {d}",
          c_insurance: "تأمين سفر للتزلج ليوم {d}", c_gear: "معدات التزلج للشتاء المقبل", note: "روابط شركاء: قد نحصل على عمولة." },
    // Nordic (owner 2026-11-13)
    sv: { s_title: "Snöoväder på väg {w}: +{n} cm", s_stay: "Boende för de dagarna", s_rent: "Hyr skidor för {d}", h: "Planera resan", partner: "Partner", stay: "Boende", rental: "Skiduthyrning", transfer: "Transfer", pass: "Liftkort",
          lesson: "Skidskola", insurance: "Försäkring", gear: "Utrustning",
          c_rental_powder: "Nysnö i {r}: hyr skidor", c_rental: "Hyr skidor i {r}", c_lesson: "Skidskola och turer i {r}",
          c_transfer: "Flygplatstransfer till {r} · {d}", c_pass: "Liftkort och skidpaket · {r}", c_stay: "Boende nära {r} · {d}",
          c_insurance: "Reseförsäkring för skidåkning, {d}", c_gear: "Skidutrustning för nästa vinter", note: "Partnerlänkar: vi kan få en provision." },
    nb: { s_title: "Snøstorm på vei {w}: +{n} cm", s_stay: "Overnatting for de dagene", s_rent: "Lei ski for {d}", h: "Planlegg turen", partner: "Partner", stay: "Overnatting", rental: "Skiutleie", transfer: "Transfer", pass: "Heiskort",
          lesson: "Skiskole", insurance: "Forsikring", gear: "Utstyr",
          c_rental_powder: "Nysnø i {r}: lei ski", c_rental: "Lei ski i {r}", c_lesson: "Skiskole og turer i {r}",
          c_transfer: "Flyplasstransfer til {r} · {d}", c_pass: "Heiskort og skipakker · {r}", c_stay: "Overnatting nær {r} · {d}",
          c_insurance: "Reiseforsikring for skiferie, {d}", c_gear: "Skiutstyr til neste vinter", note: "Partnerlenker: vi kan få en provisjon." },
    fi: { s_title: "Lumimyräkkä tulossa {w}: +{n} cm", s_stay: "Majoitus niille päiville", s_rent: "Vuokraa sukset: {d}", h: "Suunnittele matka", partner: "Kumppani", stay: "Majoitus", rental: "Välinevuokraus", transfer: "Kuljetukset", pass: "Hissilippu",
          lesson: "Hiihtokoulu", insurance: "Vakuutus", gear: "Varusteet",
          c_rental_powder: "Uutta lunta, {r}: vuokraa sukset", c_rental: "Vuokraa sukset, {r}", c_lesson: "Hiihtokoulu ja retket, {r}",
          c_transfer: "Lentokenttäkuljetus, {r} · {d}", c_pass: "Hissiliput ja hiihtopaketit · {r}", c_stay: "Majoitus lähellä, {r} · {d}",
          c_insurance: "Hiihtomatkan matkavakuutus, {d}", c_gear: "Hiihtovarusteet ensi talveksi", note: "Kumppanilinkit: voimme saada palkkion." },
  };
  const STORM_CM = 20, STORM_DAY_CM = 3;
  const ICON = { stay: "hotel", rental: "downhill_skiing", transfer: "airport_shuttle", pass: "confirmation_number", lesson: "school",
                 insurance: "health_and_safety", gear: "shopping_bag" };
  const lang = () => { const l = ((window.I18N && I18N.lang) || "en").slice(0, 2); return T[l] ? l : "en"; };
  const t = (k, v = {}) => (T[lang()][k] || T.en[k] || k).replace(/\{(\w)\}/g, (m, x) => (v[x] != null ? v[x] : ""));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
               set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const ab = () => { let v = ls.get("ss_pab"); if (v !== "a" && v !== "b") { v = Math.random() < 0.5 ? "a" : "b"; ls.set("ss_pab", v); } return v; };

  // who never sees partner rows: Pro members (and anyone who hid hotel suggestions), bots, no API
  function hidden() {
    const SS = window.SS;
    if (!SS || !SS.S || !SS.S.api) return true;
    if (SS.S.pro || SS.S.noAds) return true;
    return typeof SS.staysHidden === "function" && SS.staysHidden();
  }

  // frequency cap for the chip (rules from the server: chip_per_day, chip_same_partner_per_day)
  function capOk(id, rules) {
    const c = ls.get("ss_pcap"), d = today();
    const st = c && c.d === d ? c : { d, n: 0, ids: {} };
    if (st.n >= (rules.chip_per_day || 2) || (st.ids[id] || 0) >= (rules.chip_same_partner_per_day || 1)) return false;
    st.n++; st.ids[id] = (st.ids[id] || 0) + 1; ls.set("ss_pcap", st);
    return true;
  }

  let RES = null;
  async function resortAt(lat, lon) {
    try {
      if (!RES) RES = await window.SS.resorts();
      let best = null, bd = 1e9;
      for (const x of RES.rows) { const dd = Math.abs(x.lat - lat) + Math.abs(x.lon - lon); if (dd < bd) { bd = dd; best = x; } }
      return bd < 0.03 ? best : null;
    } catch { return null; }
  }

  // storm window from the static resort table: the run of days (from today, 7 days) with >= 3 cm of new snow each
  // and the largest total; >= 20 cm -> {cm, from, to} (the server decides the card: engine/affiliates STORM_CM)
  function stormOf(x) {
    const i0 = RES.dates.indexOf(today());
    if (i0 < 0) return null;
    let best = null, cur = null;
    for (let i = i0; i < Math.min(RES.dates.length, i0 + 8); i++) {
      const n = (x.snow[i] || [])[1] || 0;
      if (n >= STORM_DAY_CM) { cur = cur || { cm: 0, from: RES.dates[i] }; cur.cm += n; cur.to = RES.dates[i]; }
      else cur = null;
      if (cur && (!best || cur.cm > best.cm)) best = { ...cur };
    }
    return best && best.cm >= STORM_CM ? { cm: Math.round(best.cm), from: best.from, to: best.to } : null;
  }
  function fmtRange(a, b) {
    const f = (iso) => { try { return new Date(iso + "T12:00:00").toLocaleDateString((window.I18N && I18N.locale) || undefined, { weekday: "short" }); } catch { return iso; } };
    return a === b ? f(a) : f(a) + "–" + f(b);
  }
  // "Stays for those dates": set the resort panel's Stays card to the storm dates (its own change listener reloads
  // the Stay22 map), open it and scroll to it; without a card the Allez link opens instead
  function presetStays(from, to) {
    const st = document.querySelector("details.stays");
    if (!st) return false;
    const ci = st.querySelector("[data-cin]"), co = st.querySelector("[data-cout]");
    if (ci && co) { ci.value = from; co.value = to; co.min = from; co.dispatchEvent(new Event("change", { bubbles: true })); }
    st.open = true; st.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function fmtDay(iso) {
    try { return new Date(iso + "T12:00:00").toLocaleDateString((window.I18N && I18N.locale) || undefined, { weekday: "short", day: "numeric", month: "short" }); }
    catch { return iso; }
  }

  async function ctxOf(el) {
    const lat = +el.dataset.lat, lon = +el.dataset.lon, place = el.dataset.place || "";
    const card = el.matches("details.stays") ? el : null;
    let qd = ""; try { qd = new URLSearchParams(location.search).get("d") || ""; } catch { /* old browser */ }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(qd) || qd < today()) qd = "";
    // a powder-alert deep link (?d=<storm date>) wins over the card's default date
    const cin = qd || el.dataset.day || (card && card.querySelector("[data-cin]") && card.querySelector("[data-cin]").value) || "";
    const x = await resortAt(lat, lon);
    const c = { resort: (x && x.short) || place, lat: lat.toFixed(4), lon: lon.toFixed(4), lang: lang(), placement: el.dataset.where || "panel",
                src: "web", ab: ab() };
    if (x) { c.slug = x.slug; c.country = x.country; c.region = x.region; }
    if (cin) c.day = cin;
    if (x && RES && cin) {
      const i = RES.dates.indexOf(cin), j = RES.dates.indexOf(today());
      const s = x.snow[i >= 0 ? i : j] || [];
      if (s[1] != null) c.new24 = s[1];
      if (s[2] != null) c.new72 = s[2];
    }
    const sw = x && RES ? stormOf(x) : null;
    if (sw) { c.storm_cm = sw.cm; c.storm_from = sw.from; c.storm_to = sw.to; }
    return Object.entries(c).map(([k, v]) => k + ":" + String(v).replace(/[,:]/g, " ")).join(",");
  }

  const SENT = new Set();
  function hit(id, pl, ev, once) {
    const path = "/ad/" + id + "/" + pl + "/" + ev;
    try {
      if (typeof window.SS.hit === "function") { window.SS.hit(path, "partner", once); return; }
      if (once) { if (SENT.has(once)) return; SENT.add(once); }        // older core.js without SS.hit: same beacon
      if (navigator.sendBeacon && window.SS.S.api && !/bot|crawl|spider|headless/i.test(navigator.userAgent))
        navigator.sendBeacon((window.SS.base ? window.SS.base("/v1/hit") : window.SS.S.api) + "/v1/hit", new Blob([JSON.stringify({ path, ref: "", src: "partner", lang: lang() })], { type: "text/plain" }));
    } catch { /* ignore */ }
  }

  function render(box, off, place) {
    const chipOnly = box.dataset.ptripMode === "chip";          // Powder tab / storm cards: the highlight only
    const storm = off.storm || null;
    let row = chipOnly ? [] : off.row || [];
    if (storm && row.length === 1 && row[0].category === "stay") row = [];   // the storm card already offers the stays
    const chip = !storm && off.chip && capOk(off.chip.id, off.rules || {}) ? off.chip : null;
    if (!row.length && !chip && !storm) { box.remove(); return; }
    const d = fmtDay((off.ctx && off.ctx.checkin) || today()), r = (off.ctx && off.ctx.resort) || place;
    const ckey = chip ? (chip.category === "rental" && chip.reason === "powder" ? "c_rental_powder" : "c_" + chip.category) : "";
    const a = (o, cls, inner, pl) => '<a class="' + cls + '" href="' + esc(o.url) + '" target="_blank" rel="' + esc(o.rel || "sponsored noopener") +
      '" data-pid="' + esc(o.id) + '" data-ppl="' + esc(pl) + '"' + (o.network === "stay22" ? ' data-s22="' + esc(pl) + '"' : "") + ">" + inner + "</a>";
    const pl = (o) => (o.track || "").split("/")[3] || "panel";
    let h = '<div class="ptrip-h"><span class="ptrip-t">' + esc(t("h")) + '</span><span class="partner" tabindex="0" title="' + esc(t("note")) + '">' + esc(t("partner")) + "</span></div>";
    if (storm) {
      h += '<div class="pstorm"><div class="pst-h"><span class="ms">weather_snowy</span><b>' + esc(t("s_title", { w: fmtRange(storm.from, storm.to), n: storm.cm })) + "</b></div><div class=\"pst-a\">";
      if (storm.stay) h += document.querySelector("details.stays") && !chipOnly
        ? '<button type="button" class="pchip" data-pstorm data-from="' + esc(storm.from) + '" data-to="' + esc(storm.powder_day) + '" data-pid="' + esc(storm.stay.id) + '" data-ppl="' + esc(pl(storm.stay)) + '" data-href="' + esc(storm.stay.url) + '"><span class="ms">hotel</span><span>' + esc(t("s_stay")) + '</span><span class="ms go">arrow_forward</span></button>'
        : a(storm.stay, "pchip", '<span class="ms">hotel</span><span>' + esc(t("s_stay")) + '</span><span class="ms go">arrow_forward</span>', pl(storm.stay));
      if (storm.rental) h += a(storm.rental, "pchip alt", '<span class="ms">downhill_skiing</span><span>' + esc(t("s_rent", { d: fmtDay(storm.powder_day) })) + "</span><small>" + esc(storm.rental.label) + "</small>", pl(storm.rental));
      h += "</div></div>";
    }
    if (chip) h += a(chip, "pchip", '<span class="ms">' + ICON[chip.category] + "</span><span>" + esc(t(ckey, { r, d })) + '</span><span class="ms go">arrow_forward</span>', pl(chip));
    if (row.length) h += '<div class="ptrip-row">' + row.map((o) => {
      const inner = '<span class="ms">' + ICON[o.category] + '</span><span class="pl"><b>' + esc(t(o.category)) + "</b>" + (o.neutral ? "" : "<small>" + esc(o.label) + "</small>") + "</span>";
      if (o.category === "stay" && document.querySelector("details.stays")) return '<button type="button" class="pslot" data-pstays data-pid="' + esc(o.id) + '" data-ppl="' + esc(pl(o)) + '">' + inner + "</button>";
      return a(o, "pslot", inner, pl(o));
    }).join("") + "</div>";
    if (storm) box.classList.add("storm");
    box.innerHTML = h;
    box.classList.remove("pending");
    const items = [...box.querySelectorAll("[data-pid]")];
    items.forEach((e) => hit(e.dataset.pid, e.dataset.ppl, "load", "pl|" + e.dataset.pid + "|" + e.dataset.ppl + "|" + r));
    box.addEventListener("click", (ev) => {
      const e = ev.target.closest("[data-pid]");
      if (!e) return;
      hit(e.dataset.pid, e.dataset.ppl, "click");
      if (e.matches("[data-pstorm]") && !presetStays(e.dataset.from, e.dataset.to)) window.open(e.dataset.href, "_blank", "noopener");
      if (e.matches("[data-pstays]")) {
        const st = document.querySelector("details.stays");
        if (st) { st.open = true; st.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
    });
    if ("IntersectionObserver" in window) {        // "view" = half on screen for 1 s, once per partner + resort
      let tm = 0;
      const io = new IntersectionObserver((es) => {
        const v = es[es.length - 1].intersectionRatio >= 0.5;
        clearTimeout(tm);
        if (v) tm = setTimeout(() => { items.forEach((e) => hit(e.dataset.pid, e.dataset.ppl, "view", "pv|" + e.dataset.pid + "|" + e.dataset.ppl + "|" + r)); io.disconnect(); }, 1000);
      }, { threshold: [0, 0.5] });
      io.observe(box);
    }
  }

  async function fill(box, src) {
    if (box.dataset.pdone) return;
    box.dataset.pdone = "1";
    try {
      const ctx = await ctxOf(src);
      const u = window.SS.S.api + "/v1/affiliates?ctx=" + encodeURIComponent(ctx);
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
      const j = await fetch(u, { signal: ctl.signal, credentials: "omit" }).then((x) => (x.ok ? x.json() : null));
      clearTimeout(tm);
      if (!j || !j.offers || hidden()) { box.remove(); return; }
      render(box, j.offers, src.dataset.place || "");
    } catch { box.remove(); }
  }

  // lazy: the API is asked only when the row's slot comes near the screen
  function arm(box, src) {
    if (!("IntersectionObserver" in window)) { fill(box, src); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fill(box, src); } }, { rootMargin: "120px 0px" });
    io.observe(box);
  }

  function mount(root) {
    if (hidden()) return;
    const hasSlot = !!document.querySelector("[data-ptrip]");     // UX-V3 placeholder under the snow strip wins
    (root || document).querySelectorAll('details.stays[data-where="panel"], [data-ptrip]').forEach((src) => {
      if (src.dataset.pmounted || (hasSlot && src.matches("details.stays"))) return;
      src.dataset.pmounted = "1";
      let box = src.matches("[data-ptrip]") ? src : null;
      if (!box) {
        if (src.nextElementSibling && src.nextElementSibling.classList.contains("ptrip")) return;
        box = document.createElement("section");
        src.after(box);
      }
      box.classList.add("ptrip");
      box.setAttribute("aria-label", t("h"));
      box.classList.add("pending");               // zero-size but laid out: IntersectionObserver still fires
      arm(box, src);
    });
  }

  function start() {
    if (!window.SS) { setTimeout(start, 300); return; }
    if (!document.querySelector('link[href*="partners.css"]')) {
      const s = document.querySelector('script[src*="partners.js"]');
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = s ? s.src.replace(/partners\.js(\?.*)?$/, "partners.css$1") : "partners.css";
      document.head.appendChild(l);
    }
    mount();
    new MutationObserver((ms) => { if (ms.some((m) => m.addedNodes.length)) mount(); }).observe(document.body, { childList: true, subtree: true });
    if (window.SS.onChange) window.SS.onChange(() => { if (hidden()) document.querySelectorAll(".ptrip").forEach((b) => b.remove()); });
  }
  window.Partners = { mount, version: 1 };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
