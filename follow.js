/* SnowScope follow flow (owner 2026-11-09, engine/follow.py): ★ favourites (kept in this browser only), the free
   morning forecast, powder alerts at a chosen threshold (browser notification or e-mail, double opt-in), the phone
   install banner (Play link with referrer) and the home-screen app (manifest + sw.js). One flow:
   favourite -> daily forecast -> alert threshold -> "get this every morning in the app".
   Used by the map pages (index / resort pages) and every blog post. No framework; every storage access is guarded
   (in-app browsers and private modes can throw). */
(() => {
  "use strict";
  if (window.Follow) return;
  const D = document, W = window;
  const ROOT = (W.SS && SS.ROOT) || new URL(D.documentElement.dataset.root || "./", location.href).href;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LS = {
    get(k) { try { return JSON.parse(W.localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { W.localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked */ } },
  };
  const SSS = {
    get(k) { try { return W.sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { W.sessionStorage.setItem(k, v); } catch { /* blocked */ } },
  };
  const REGIONS = { ALPS: "Alps", PYRENEES: "Pyrenees", US_WEST: "US West", US_NE: "US Northeast", CA_WEST: "Western Canada", SCANDES: "Scandinavia", ATLAS: "Atlas" };
  const T = {
    en: { alert: "Powder alert", for: "For", region: "{r}: the whole region", when: "Tell me when this much new snow is coming", daily: "Every morning: today's and tomorrow's forecast (free)",
      notify: "Turn on notifications", or_email: "or by e-mail", send: "Send me alerts", note: "Free. One-click unsubscribe. We keep only your e-mail address and these choices.",
      ok_push: "Done! Notifications are on for {p}.", ok_mail: "Almost done: check your inbox (it can take a few minutes) and tap the link to confirm.", ok_mail_active: "Done, your alerts are updated.",
      err: "Couldn't sign you up right now. Please try again later.", bad_email: "Please enter a valid e-mail address.", denied: "Notifications are blocked in this browser. Use e-mail instead.",
      later: "Too many tries. Please try again in an hour.", fav: "Favourite", faved: "Favourite", saved: "{p} is in your resorts. Get its snow every morning?",
      your: "Your resorts", app_line: "Get this every morning in the free app", banner: "Get powder alerts for {p}: free app", banner0: "Get powder alerts: free app", install: "Get it", close: "Close", app_h: "Get the free app", app_push: "Get a push the night before a powder day", app_on: "GET IT ON", app_scan: "Scan with your phone",
      new: "new", nosnow: "No snow yet", alerts_on: "Alerts on", pick: "Choose a resort" },
    fr: { alert: "Alerte poudreuse", for: "Pour", region: "{r} : toute la région", when: "Prévenez-moi quand cette quantité de neige fraîche arrive", daily: "Chaque matin : la météo d'aujourd'hui et de demain (gratuit)",
      notify: "Activer les notifications", or_email: "ou par e-mail", send: "Recevoir les alertes", note: "Gratuit. Désinscription en un clic. Nous gardons seulement votre e-mail et ces choix.",
      ok_push: "C'est fait ! Notifications activées pour {p}.", ok_mail: "Presque fini : ouvrez votre boîte mail (cela peut prendre quelques minutes) et touchez le lien pour confirmer.", ok_mail_active: "C'est fait, vos alertes sont à jour.",
      err: "Inscription impossible pour le moment. Réessayez plus tard.", bad_email: "Entrez une adresse e-mail valide.", denied: "Les notifications sont bloquées dans ce navigateur. Utilisez l'e-mail.",
      later: "Trop d'essais. Réessayez dans une heure.", fav: "Favori", faved: "Favori", saved: "{p} est dans vos stations. Recevoir sa neige chaque matin ?",
      your: "Vos stations", app_line: "Recevez-le chaque matin dans l'app gratuite", banner: "Alertes poudreuse pour {p} : app gratuite", banner0: "Alertes poudreuse : app gratuite", install: "Installer", close: "Fermer", app_h: "L'app gratuite", app_push: "Une notification la veille d'un jour de poudreuse", app_on: "DISPONIBLE SUR", app_scan: "Scannez avec votre téléphone",
      new: "fraîche", nosnow: "Pas encore de neige", alerts_on: "Alertes actives", pick: "Choisir une station" },
    de: { alert: "Powder-Alarm", for: "Für", region: "{r}: die ganze Region", when: "Sag mir Bescheid, wenn so viel Neuschnee kommt", daily: "Jeden Morgen: das Wetter für heute und morgen (gratis)",
      notify: "Benachrichtigungen einschalten", or_email: "oder per E-Mail", send: "Alarme senden", note: "Gratis. Abmelden mit einem Klick. Wir speichern nur deine E-Mail-Adresse und diese Wahl.",
      ok_push: "Fertig! Benachrichtigungen für {p} sind an.", ok_mail: "Fast fertig: Schau in dein Postfach (kann ein paar Minuten dauern) und tippe auf den Link zum Bestätigen.", ok_mail_active: "Fertig, deine Alarme sind aktualisiert.",
      err: "Anmeldung gerade nicht möglich. Bitte später nochmal.", bad_email: "Bitte gib eine gültige E-Mail-Adresse ein.", denied: "Benachrichtigungen sind in diesem Browser blockiert. Nimm die E-Mail.",
      later: "Zu viele Versuche. Bitte in einer Stunde nochmal.", fav: "Favorit", faved: "Favorit", saved: "{p} ist in deinen Gebieten. Jeden Morgen den Schnee bekommen?",
      your: "Deine Gebiete", app_line: "Jeden Morgen in der kostenlosen App", banner: "Powder-Alarme für {p}: gratis App", banner0: "Powder-Alarme: gratis App", install: "Holen", close: "Schließen", app_h: "Die kostenlose App", app_push: "Eine Nachricht am Abend vor dem Powder-Tag", app_on: "JETZT BEI", app_scan: "Mit dem Handy scannen",
      new: "neu", nosnow: "Noch kein Schnee", alerts_on: "Alarme an", pick: "Gebiet wählen" },
    it: { alert: "Avviso neve fresca", for: "Per", region: "{r}: tutta la regione", when: "Avvisami quando arriva questa neve fresca", daily: "Ogni mattina: il meteo di oggi e domani (gratis)",
      notify: "Attiva le notifiche", or_email: "o via e-mail", send: "Inviami gli avvisi", note: "Gratis. Disiscrizione con un clic. Conserviamo solo la tua e-mail e queste scelte.",
      ok_push: "Fatto! Notifiche attive per {p}.", ok_mail: "Quasi fatto: controlla la posta (può volerci qualche minuto) e tocca il link per confermare.", ok_mail_active: "Fatto, avvisi aggiornati.",
      err: "Iscrizione non possibile ora. Riprova più tardi.", bad_email: "Inserisci un indirizzo e-mail valido.", denied: "Le notifiche sono bloccate in questo browser. Usa l'e-mail.",
      later: "Troppi tentativi. Riprova tra un'ora.", fav: "Preferito", faved: "Preferito", saved: "{p} è nelle tue località. Ricevere la neve ogni mattina?",
      your: "Le tue località", app_line: "Ricevilo ogni mattina nell'app gratuita", banner: "Avvisi neve per {p}: app gratuita", banner0: "Avvisi neve: app gratuita", install: "Scarica", close: "Chiudi", app_h: "L'app gratuita", app_push: "Un avviso la sera prima di un giorno di powder", app_on: "DISPONIBILE SU", app_scan: "Scansiona con il telefono",
      new: "fresca", nosnow: "Ancora niente neve", alerts_on: "Avvisi attivi", pick: "Scegli una località" },
    es: { alert: "Alerta de nieve polvo", for: "Para", region: "{r}: toda la región", when: "Avísame cuando llegue esta nieve nueva", daily: "Cada mañana: el tiempo de hoy y mañana (gratis)",
      notify: "Activar notificaciones", or_email: "o por correo", send: "Enviadme alertas", note: "Gratis. Baja con un clic. Solo guardamos tu correo y estas opciones.",
      ok_push: "¡Hecho! Notificaciones activas para {p}.", ok_mail: "Casi listo: revisa tu correo (puede tardar unos minutos) y toca el enlace para confirmar.", ok_mail_active: "Hecho, tus alertas están al día.",
      err: "No se pudo completar ahora. Inténtalo más tarde.", bad_email: "Escribe un correo válido.", denied: "Las notificaciones están bloqueadas en este navegador. Usa el correo.",
      later: "Demasiados intentos. Inténtalo en una hora.", fav: "Favorito", faved: "Favorito", saved: "{p} está en tus estaciones. ¿Recibir su nieve cada mañana?",
      your: "Tus estaciones", app_line: "Recíbelo cada mañana en la app gratuita", banner: "Alertas de nieve para {p}: app gratuita", banner0: "Alertas de nieve: app gratuita", install: "Obtener", close: "Cerrar", app_h: "La app gratis", app_push: "Un aviso la noche antes de un día de nieve polvo", app_on: "DISPONIBLE EN", app_scan: "Escanea con tu móvil",
      new: "nueva", nosnow: "Aún sin nieve", alerts_on: "Alertas activas", pick: "Elige una estación" },
  };
  const lang = () => { const l = ((W.I18N && I18N.lang) || D.documentElement.lang || "en").slice(0, 2).toLowerCase(); return T[l] ? l : "en"; };
  const t = (k, v) => { const s = (T[lang()][k] || T.en[k] || k); return v ? s.replace(/\{(\w)\}/g, (_, x) => (v[x] != null ? v[x] : "")) : s; };
  const us = () => { try { return !!(W.SS && SS.U && SS.U.us && SS.U.us()); } catch { return false; } };
  const hit = (p) => { try { if (W.SS && SS.hit) SS.hit(p, "web"); } catch { /* ignore */ } };
  const ANDROID = /Android/i.test(navigator.userAgent || "");
  const IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const IAB = !!(W.SS && SS.IAB);
  const STANDALONE = (() => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch { return false; } })();
  const PUSH_OK = (() => { try { return "serviceWorker" in navigator && "PushManager" in W && "Notification" in W && W.isSecureContext && !IAB; } catch { return false; } })();

  // ---------------------------------------------------------------- where the visitor came from (first page of the visit)
  function source() {
    let s = SSS.get("ss_src");
    if (s) return s;
    let host = "";
    try { host = W.SS && SS.refHost ? SS.refHost() : (D.referrer ? new URL(D.referrer).hostname : ""); } catch { host = ""; }
    host = host.toLowerCase();
    s = /reddit/.test(host) ? "reddit" : /facebook|instagram|fb\.|messenger/.test(host) ? "facebook" : /google|bing|duckduckgo|ecosia|yahoo|qwant/.test(host) ? "google"
      : host && !/snowscope/.test(host) ? "other" : "direct";
    SSS.set("ss_src", s);
    return s;
  }
  source();

  // ---------------------------------------------------------------- favourites (this browser only)
  const favs = () => { const f = LS.get("ss_favs"); return Array.isArray(f) ? f.filter((x) => x && typeof x.s === "string").slice(0, 20) : []; };
  const isFav = (slug) => favs().some((f) => f.s === slug);
  function toggleFav(slug, name, dom) {
    let f = favs();
    const on = !f.some((x) => x.s === slug);
    f = on ? [{ s: slug, n: name || slug, d: dom || "" }].concat(f) : f.filter((x) => x.s !== slug);
    LS.set("ss_favs", f.slice(0, 20));
    hit("/follow/fav/" + (on ? "add" : "remove"));
    paintFavs();
    try { W.dispatchEvent(new CustomEvent("ss:favs")); } catch { /* old browser */ }
    return on;
  }
  const followed = () => LS.get("ss_follow") || {};
  function markFollowed(key, how) { const f = followed(); f[key] = { ...(f[key] || {}), [how]: Date.now() }; LS.set("ss_follow", f); }
  function paintFavs() {
    D.querySelectorAll("[data-fw-fav]").forEach((b) => {
      const on = isFav(b.dataset.fwSlug);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("on", on);
      const ic = b.querySelector(".ms"); if (ic) { ic.textContent = "star"; ic.classList.toggle("f", on); }
    });
  }

  // ---------------------------------------------------------------- Play link with referrer (docs/SHARING.md "Link and referrer")
  function playUrl(slug, campaign) {
    const a = (W.SS && SS.S && SS.S.cfg && SS.S.cfg.app) || {};
    if (!(a.play_live && a.play_package)) return W.SS && SS.appUrl ? SS.appUrl() : ROOT + "download/";
    const ref = "utm_source=web&utm_medium=" + source() + "&utm_campaign=" + (campaign || "web_banner") + "&utm_content=organic" + (slug ? "&utm_term=" + slug : "");
    return "https://play.google.com/store/apps/details?id=" + encodeURIComponent(a.play_package) + "&referrer=" + encodeURIComponent(ref);
  }
  function playClick(slug, campaign) { hit("/r/play/" + source()); hit("/follow/play/" + (campaign || "web_banner")); return playUrl(slug, campaign); }

  // ---------------------------------------------------------------- styles (shared by the map pages and the blog)
  const CSS = `
.fw-big{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0;padding:14px 16px;border:0;border-radius:16px;cursor:pointer;text-align:start;
  background:linear-gradient(135deg,#1463F3,#3B8BFF);color:#fff;font:inherit;box-shadow:0 6px 18px rgba(20,99,243,.28)}
.fw-big .ms{font-size:30px}.fw-big b{display:block;font-size:17px;font-weight:700;line-height:1.2}.fw-big small{display:block;font-size:13px;opacity:.92;margin-top:2px;line-height:1.3}
.fw-big:focus-visible,.fw-go:focus-visible,.fw-fav:focus-visible{outline:3px solid #ffb020;outline-offset:2px}
.fw-pair{display:grid;grid-template-columns:auto 1fr;gap:10px;margin:12px 0}.fw-pair .fw-big{margin:0}
.fw-fav{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:52px;padding:0 18px;border-radius:16px;border:2px solid #f5b400;background:transparent;color:inherit;font:inherit;font-weight:700;font-size:16px;cursor:pointer}
.fw-fav .ms{color:#f5b400;font-size:26px}.fw-fav.on{background:#f5b400;color:#1b1300}.fw-fav.on .ms{color:#1b1300}
.fw-cta{margin:28px 0;padding:18px;border-radius:18px;background:rgba(20,99,243,.08);border:1px solid rgba(20,99,243,.22)}.fw-cta h2{margin:0 0 6px;font-size:20px}.fw-cta p{margin:0 0 12px}
.fw-acts{display:flex;flex-wrap:wrap;gap:10px}.fw-go{display:inline-flex;align-items:center;gap:8px;min-height:52px;padding:0 18px;border:0;border-radius:16px;background:#1463F3;color:#fff;font:inherit;font-weight:700;font-size:16px;cursor:pointer}
.fw-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(5,10,20,.55);display:flex;align-items:flex-end;justify-content:center}
@media(min-width:700px){.fw-scrim{align-items:center}}
.fw-sheet{width:100%;max-width:460px;max-height:92vh;overflow:auto;background:#fff;color:#0d1b2e;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;font:15px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
@media(min-width:700px){.fw-sheet{border-radius:22px}}
@media(prefers-color-scheme:dark){.fw-sheet{background:#121a26;color:#e8eef7}.fw-sheet .fw-in,.fw-sheet select{background:#0b111b;color:#e8eef7;border-color:#2b3a50}.fw-seg button{background:#0b111b;color:#e8eef7;border-color:#2b3a50}}
.fw-sheet h3{margin:0;font-size:20px;display:flex;align-items:center;gap:8px}.fw-x{margin-inline-start:auto;border:0;background:transparent;color:inherit;font-size:26px;line-height:1;cursor:pointer;padding:4px 8px}
.fw-lab{display:block;margin:14px 0 6px;font-weight:600;font-size:14px}.fw-sheet select,.fw-in{width:100%;box-sizing:border-box;min-height:46px;border:1px solid #c9d3e0;border-radius:12px;padding:0 12px;font:inherit;background:#fff;color:#0d1b2e}
.fw-seg{display:flex;gap:8px}.fw-seg button{flex:1;min-height:46px;border:1px solid #c9d3e0;border-radius:12px;background:#fff;color:#0d1b2e;font:inherit;font-weight:700;cursor:pointer}
.fw-seg button[aria-pressed=true]{background:#1463F3;border-color:#1463F3;color:#fff}
.fw-chk{display:flex;gap:10px;align-items:flex-start;margin:14px 0 4px;font-size:15px}.fw-chk input{width:20px;height:20px;margin-top:2px;flex:none}
.fw-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;margin-top:12px;border:0;border-radius:14px;background:#1463F3;color:#fff;font:inherit;font-weight:700;font-size:16px;cursor:pointer}
.fw-btn.alt{background:#0d1b2e}@media(prefers-color-scheme:dark){.fw-btn.alt{background:#e8eef7;color:#0d1b2e}}
.fw-btn[disabled]{opacity:.6}.fw-or{text-align:center;margin:12px 0 0;font-size:13px;opacity:.75}.fw-row2{display:flex;gap:8px;margin-top:8px}.fw-row2 .fw-btn{margin:0;width:auto;padding:0 16px}
.fw-msg{margin:12px 0 0;padding:10px 12px;border-radius:12px;font-weight:600}.fw-msg.ok{background:#e3f6e8;color:#0d5a26}.fw-msg.err{background:#fde8e8;color:#8a1111}
.fw-note{margin:12px 0 0;font-size:12.5px;opacity:.75}.fw-app{display:flex;align-items:center;gap:10px;margin-top:12px;padding:12px;border-radius:14px;background:rgba(20,99,243,.08);color:inherit;text-decoration:none;font-weight:700}
.fw-app{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:12px 0;padding:12px 14px;border-radius:16px;background:var(--surface,#fff);border:1px solid var(--outline,#D3DAE3);box-shadow:0 1px 2px rgba(11,18,32,.06);color:inherit;text-align:start}
.fw-app-ic{width:56px;height:56px;border-radius:14px;flex:none}.fw-app-tx{min-width:0;flex:1 1 150px}.fw-app-tx b{display:block;font-size:16px;font-weight:700;line-height:1.2}.fw-app-tx small{display:block;font-size:13px;opacity:.8;margin-top:2px;line-height:1.3}
.fw-badge{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;margin-top:8px;padding:5px 12px 5px 9px;border-radius:8px;background:#000;color:#fff;text-decoration:none;line-height:1.05;border:1px solid #777}
.fw-badge span{display:block;font-size:16px;font-weight:700;letter-spacing:-.01em}.fw-badge small{display:block;font-size:9px;font-weight:600;letter-spacing:.06em;opacity:.9}
.fw-app-qr{display:none}
@media(hover:hover) and (min-width:700px){.fw-app-qr{display:flex;flex-direction:column;align-items:center;gap:4px;flex:none;margin-inline-start:auto}.fw-app-qr img{width:92px;height:92px;border-radius:8px;background:#fff;padding:3px;box-sizing:border-box}.fw-app-qr small{font-size:11px;opacity:.75}}
.fw-banner{position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top));z-index:2147482000;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 12px;border-radius:16px;
  background:#0d1b2e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);font:14px/1.3 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.fw-banner img{width:36px;height:36px;border-radius:9px;flex:none}.fw-banner b{flex:1;font-weight:700}.fw-banner a{flex:none;background:#3B8BFF;color:#fff;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:12px}
.fw-banner button{flex:none;border:0;background:transparent;color:#fff;font-size:22px;padding:4px 6px;cursor:pointer}
.fw-yr{display:flex;gap:10px;overflow-x:auto;padding:2px 0 8px;margin:0 0 6px;scrollbar-width:thin}.fw-yr a{flex:none;min-width:132px;padding:10px 12px;border-radius:14px;border:1px solid rgba(127,140,160,.35);color:inherit;text-decoration:none}
.fw-yr a b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}.fw-yr a span{display:block;font-size:20px;font-weight:750;margin-top:2px}.fw-yr a em{font-style:normal;font-size:12.5px;color:#1463F3;font-weight:700}
.fw-yh{display:flex;align-items:center;gap:6px;margin:16px 0 8px;font-size:16px}.fw-yh .ms{color:#f5b400}
`;
  function style() { if (D.getElementById("fw-css")) return; const s = D.createElement("style"); s.id = "fw-css"; s.textContent = CSS; (D.head || D.documentElement).appendChild(s); }

  // ---------------------------------------------------------------- API
  const apiBase = () => (W.SS && SS.S && (SS.S.api || "")) || "https://api.snowscope.app";
  async function post(path, body) {
    const r = await fetch(apiBase() + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
    return r.json();
  }
  async function getJ(path) { const r = await fetch(apiBase() + path); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }
  const cfgReady = () => new Promise((ok) => { const t0 = Date.now(); (function w() { if (W.SS && SS.S && SS.S.cfg) ok(); else if (Date.now() - t0 < 12000) setTimeout(w, 150); else ok(); })(); });
  const u8 = (b64) => { const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
  async function swReg() { return navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT }); }
  async function pushSubscribe(sel) {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { const e = new Error("denied"); e.code = "denied"; throw e; }
    const reg = await swReg();
    await navigator.serviceWorker.ready;
    const { key } = await getJ("/v1/alerts/powder/webpush/key");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(key) });
    const j = sub.toJSON();
    return post("/v1/alerts/powder/webpush/subscribe", { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ...sel });
  }

  // ---------------------------------------------------------------- the sheet
  function context() {
    const st = W.SSApp && SSApp.x && SSApp.x.st;
    return { slug: (st && st.slug) || D.body.dataset.slug || "", region: (st && st.region) || "" };
  }
  async function nameOf(slug) {
    try { const r = W.SS && SS.resorts ? await SS.resorts() : null; const x = r && r.rows.find((y) => y.slug === slug); return x ? { n: x.short || x.name, d: x.dom } : null; } catch { return null; }
  }
  // opts: {slug, name, region, via, saved}
  async function open(opts = {}) {
    style();
    const c = context();
    let slug = opts.slug != null ? opts.slug : c.slug, region = opts.region || c.region || "", name = opts.name || "";
    if (slug && !name) { const x = await nameOf(slug); if (x) { name = x.n; region = region || x.d || ""; } }
    if (!slug && name && W.SS && SS.resorts) {          // a post that names its resort without the slug: find it by name
      try { const n = name.toLowerCase(), r = await SS.resorts(), x = r.rows.find((y) => (y.name || "").toLowerCase() === n || (y.short || "").toLowerCase() === n);
        if (x) { slug = x.slug; name = x.short || x.name; region = region || x.dom || ""; } } catch { /* list not reachable */ }
    }
    const via = opts.via || (D.querySelector("article") ? "blog" : slug ? "resort" : "home");
    hit("/follow/open/" + via);
    const opt = [];
    if (slug) opt.push(["r:" + slug, name || slug]);
    if (region && REGIONS[region]) opt.push(["g:" + region, t("region", { r: (W.I18N && I18N.t) ? I18N.t(REGIONS[region]) : REGIONS[region] })]);
    favs().filter((f) => f.s !== slug).forEach((f) => opt.push(["r:" + f.s, "★ " + f.n]));
    Object.keys(REGIONS).filter((k) => k !== region && k !== "ATLAS").forEach((k) => opt.push(["g:" + k, t("region", { r: REGIONS[k] })]));
    const U = us(), TH = [10, 20, 30];
    const sc = D.createElement("div");
    sc.className = "fw-scrim";
    sc.innerHTML = '<div class="fw-sheet" role="dialog" aria-modal="true" aria-labelledby="fw-h"><h3 id="fw-h"><span class="ms f" aria-hidden="true" style="color:#1463F3">notifications_active</span>' + esc(t("alert")) +
      '<button class="fw-x" data-x aria-label="' + esc(t("close")) + '">×</button></h3>' +
      (opts.saved ? '<p style="margin:8px 0 0">' + esc(t("saved", { p: name || slug })) + "</p>" : "") +
      '<label class="fw-lab" for="fw-sel">' + esc(t("for")) + '</label><select id="fw-sel">' + opt.map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + "</option>").join("") + "</select>" +
      '<span class="fw-lab">' + esc(t("when")) + '</span><div class="fw-seg" role="group">' + TH.map((v, i) => '<button type="button" data-t="' + v + '" aria-pressed="' + (i === 1) + '">' + (U ? [4, 8, 12][i] + " in" : v + " cm") + "</button>").join("") + "</div>" +
      '<label class="fw-chk"><input type="checkbox" data-daily checked> <span>' + esc(t("daily")) + "</span></label>" +
      (PUSH_OK ? '<button class="fw-btn" data-push><span class="ms f" aria-hidden="true">notifications</span>' + esc(t("notify")) + '</button><p class="fw-or">' + esc(t("or_email")) + "</p>" : "") +
      '<div class="fw-row2"><input class="fw-in" type="email" data-email autocomplete="email" inputmode="email" placeholder="you@example.com" aria-label="E-mail"><button class="fw-btn' + (PUSH_OK ? " alt" : "") + '" data-mail>' + esc(t("send")) + "</button></div>" +
      '<p class="fw-msg" data-msg hidden role="status"></p><div data-after></div><p class="fw-note">' + esc(t("note")) + "</p></div>";
    D.body.appendChild(sc);
    const el = sc.querySelector(".fw-sheet");
    const close = () => { sc.remove(); D.removeEventListener("keydown", key); };
    const key = (e) => { if (e.key === "Escape") close(); };
    D.addEventListener("keydown", key);
    sc.addEventListener("click", (e) => { if (e.target === sc || e.target.closest("[data-x]")) close(); });
    el.querySelectorAll("[data-t]").forEach((b) => { b.onclick = () => el.querySelectorAll("[data-t]").forEach((q) => q.setAttribute("aria-pressed", q === b ? "true" : "false")); });
    const say = (m, ok) => { const p = el.querySelector("[data-msg]"); p.hidden = false; p.className = "fw-msg " + (ok ? "ok" : "err"); p.textContent = m; };
    const sel = () => {
      const v = el.querySelector("#fw-sel").value, th = +((el.querySelector('[data-t][aria-pressed="true"]') || {}).dataset || {}).t || 20;
      const r = v.startsWith("r:") ? [v.slice(2)] : [], g = v.startsWith("g:") ? [v.slice(2)] : [];
      return { resorts: r, regions: g, threshold: th, daily: el.querySelector("[data-daily]").checked && r.length > 0, alerts: true, via,
        lang: ["fr", "de", "it", "es"].includes(lang()) ? lang() : "en", units: U ? "imperial" : "metric", _key: v, _label: el.querySelector("#fw-sel").selectedOptions[0].textContent.replace(/^★ /, "") };
    };
    const after = (s, how) => {
      markFollowed(s._key, how);
      if (s.resorts[0] && !isFav(s.resorts[0])) toggleFav(s.resorts[0], s._label, region);
      if (ANDROID && !STANDALONE) {
        const box = el.querySelector("[data-after]");
        box.innerHTML = '<a class="fw-app" href="#" data-play><span class="ms f" aria-hidden="true">android</span>' + esc(t("app_line")) + "</a>";
        box.querySelector("[data-play]").onclick = (e) => { e.preventDefault(); location.href = playClick(s.resorts[0], "web_follow"); };
      }
      paintAlerts();
    };
    const pb = el.querySelector("[data-push]");
    if (pb) pb.onclick = async () => {
      const s = sel(); pb.disabled = true;
      try { await pushSubscribe(Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith("_")))); say(t("ok_push", { p: s._label }), true); hit("/follow/push/ok"); after(s, "push"); }
      catch (e) { say(e.code === "denied" ? t("denied") : t("err"), false); hit("/follow/push/" + (e.code === "denied" ? "denied" : "error")); }
      finally { pb.disabled = false; }
    };
    const mb = el.querySelector("[data-mail]");
    mb.onclick = async () => {
      const s = sel(), em = el.querySelector("[data-email]").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { say(t("bad_email"), false); return; }
      mb.disabled = true;
      try {
        const b = Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith("_")));
        const r = await post("/v1/alerts/powder/subscribe", { email: em, storm: true, ...b });
        say(r && r.status === "active" ? t("ok_mail_active") : t("ok_mail"), true); hit("/follow/email/ok"); after(s, "mail");
      } catch (e) { say(e.status === 429 ? t("later") : e.status === 422 ? t("bad_email") : t("err"), false); hit("/follow/email/error"); }
      finally { mb.disabled = false; }
    };
    setTimeout(() => { const f = el.querySelector("[data-push]") || el.querySelector("[data-email]"); if (f) f.focus(); }, 40);
  }

  function paintAlerts() {
    const f = followed();
    D.querySelectorAll("[data-fw-alert][data-fw-slug]").forEach((b) => { if (f["r:" + b.dataset.fwSlug]) b.classList.add("fw-on"); });
  }

  // ---------------------------------------------------------------- "Your resorts" row (map home; app.js passes the snow)
  function yourRow(rows) {      // rows: [{slug, name, depth, fresh}] with numbers already formatted (strings)
    if (!rows || !rows.length) return "";
    style();
    return '<h2 class="fw-yh h2"><span class="ms f" aria-hidden="true">star</span>' + esc(t("your")) + '</h2><div class="fw-yr">' + rows.map((r) =>
      '<a href="' + esc(ROOT + "resorts/" + encodeURIComponent(r.slug) + ".html") + '" data-open="' + esc(r.slug) + '"><b>' + esc(r.name) + "</b><span>" + esc(r.depth || "–") + "</span>" +
      (r.fresh ? "<em>+" + esc(r.fresh) + " " + esc(t("new")) + "</em>" : "<em style=\"color:inherit;opacity:.6;font-weight:500\">" + esc(r.depth ? "" : t("nosnow")) + "</em>") + "</a>").join("") + "</div>";
  }

  // ---------------------------------------------------------------- "Get the app" card (owner 2026-11-12): first screen of the home
  // panel, every resort page and every post. Play badge with the referrer (utm_campaign=web_card, utm_term=<slug>) and, on
  // desktop, a QR (qr/<slug>.svg built by tools/build_web.py -> r/?s=<slug>&m=qr&c=web_card). Not on iPhone (no app there).
  function appCard(o) {
    o = o || {};
    if (IOS) return "";
    const a = (W.SS && SS.S && SS.S.cfg && SS.S.cfg.app) || {};
    if (!(a.play_live && a.play_package)) return "";
    const slug = o.slug || "", url = playUrl(slug, "web_card");
    const qr = ROOT + "qr/" + (slug ? encodeURIComponent(slug) : "app") + ".svg";
    return '<aside class="fw-app" data-fw-app' + (o.via ? ' data-fw-via="' + esc(o.via) + '"' : "") + '><img class="fw-app-ic" src="' + esc(ROOT + "icon-192.png") + '" alt="" width="56" height="56">' +
      '<div class="fw-app-tx"><b>' + esc(t("app_h")) + "</b><small>" + esc(t("app_push")) + "</small>" +
      '<a class="fw-badge" href="' + esc(url) + '" data-fw-play="web_card" rel="noopener"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#00D7FE" d="M3.6 2.2 13 12l-9.4 9.8c-.4-.3-.6-.8-.6-1.4V3.6c0-.6.2-1.1.6-1.4z"/><path fill="#00F076" d="M16.4 8.7 13 12 3.6 2.2c.3-.2.9-.2 1.4.1z"/><path fill="#FF3A44" d="M16.4 15.3 5 21.7c-.5.3-1.1.3-1.4.1L13 12z"/><path fill="#FFD500" d="M20.7 10.6c.9.5.9 1.4 0 1.9l-4.3 2.8L13 12l3.4-3.3z"/></svg><span><small>' + esc(t("app_on")) + "</small>Google Play</span></a></div>" +
      '<div class="fw-app-qr"><img src="' + esc(qr) + '" data-fb="' + esc(ROOT + "qr/app.svg") + '" alt="" width="92" height="92" loading="lazy" data-fw-qr><small>' + esc(t("app_scan")) + "</small></div></aside>";
  }
  function blogCard() {
    if (D.body.classList.contains("app") || D.querySelector(".fw-app")) return;
    const b = D.querySelector('.fw-big[data-fw-alert][data-fw-via="blog"]');
    if (!b) return;
    const h = appCard({ slug: b.dataset.fwSlug || "", name: b.dataset.fwName || "", via: "blog" });
    if (h) { style(); b.insertAdjacentHTML("afterend", h); }
  }
  D.addEventListener("error", (e) => {              // a resort without its QR file: fall back to the generic one
    const i = e.target;
    if (i && i.matches && i.matches("img[data-fw-qr]") && i.dataset.fb && i.getAttribute("src") !== i.dataset.fb) i.src = i.dataset.fb;
  }, true);

  // ---------------------------------------------------------------- phone install banner
  function banner() {
    if (!ANDROID || STANDALONE) return;
    const x = LS.get("ss_banner_x");
    if (typeof x === "number" && Date.now() - x < 7 * 864e5) return;
    const a = (W.SS && SS.S && SS.S.cfg && SS.S.cfg.app) || {};
    if (!(a.play_live && a.play_package)) return;
    const c = context(), btn = D.querySelector("[data-fw-alert][data-fw-slug]");
    const slug = c.slug || (btn && btn.dataset.fwSlug) || (favs()[0] || {}).s || "";
    const show = async () => {
      if (D.querySelector(".fw-banner") || D.querySelector(".fw-scrim") || D.querySelector(".fw-app")) return;   // the card is already on the page
      let name = (btn && btn.dataset.fwSlug === slug && btn.dataset.fwName) || ((favs().find((f) => f.s === slug) || {}).n) || "";
      if (slug && !name && c.slug) { const r = await nameOf(slug); name = r ? r.n : ""; }
      style();
      const b = D.createElement("div");
      b.className = "fw-banner"; b.setAttribute("role", "complementary");
      b.innerHTML = '<img src="' + esc(ROOT + "icon-512.png") + '" alt=""><b>' + esc(name ? t("banner", { p: name }) : t("banner0")) + '</b><a href="#" data-go>' + esc(t("install")) + '</a><button aria-label="' + esc(t("close")) + '" data-x>×</button>';
      b.querySelector("[data-go]").onclick = (e) => { e.preventDefault(); location.href = playClick(slug, "web_banner"); };
      b.querySelector("[data-x]").onclick = () => { LS.set("ss_banner_x", Date.now()); b.remove(); hit("/follow/banner/close"); };
      D.body.appendChild(b);
      hit("/follow/banner/show");
    };
    setTimeout(show, 6000);
  }

  // ---------------------------------------------------------------- clicks (delegated: buttons rendered later work too)
  D.addEventListener("click", (e) => {
    const pl = e.target.closest && e.target.closest("[data-fw-play]");
    if (pl) { hit("/r/play/" + source()); hit("/follow/play/" + (pl.dataset.fwPlay || "web_card")); return; }   // link follows
    const f = e.target.closest && e.target.closest("[data-fw-fav]");
    if (f) {
      e.preventDefault();
      const on = toggleFav(f.dataset.fwSlug, f.dataset.fwName, f.dataset.fwRegion);
      if (on && !followed()["r:" + f.dataset.fwSlug]) open({ slug: f.dataset.fwSlug, name: f.dataset.fwName, region: f.dataset.fwRegion, via: "fav", saved: true });
      return;
    }
    const a = e.target.closest && e.target.closest("[data-fw-alert]");
    if (a) {
      e.preventDefault();
      const ctx = context();
      open({ slug: a.dataset.fwSlug != null ? a.dataset.fwSlug : ctx.slug, name: a.dataset.fwName || "", region: a.dataset.fwRegion || "", via: a.dataset.fwVia || "" });
    }
  });

  // ---------------------------------------------------------------- home-screen app: manifest + service worker
  let swDone = false;
  function sw() {
    try {
      if (swDone || !("serviceWorker" in navigator) || !W.isSecureContext || IAB) return;
      swDone = true;
      const go = () => navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT }).catch(() => {});
      (W.requestIdleCallback || ((f) => setTimeout(f, 2500)))(go);
    } catch { /* ignore */ }
  }
  function manifest() {
    if (D.querySelector('link[rel="manifest"]')) return;
    const l = D.createElement("link"); l.rel = "manifest"; l.href = ROOT + "manifest.webmanifest"; D.head.appendChild(l);
  }

  W.Follow = { open, favs, isFav, toggleFav, yourRow, playUrl, playClick, appCard, source, paintFavs, paintAlerts, style, t };
  const boot = () => { style(); manifest(); paintFavs(); paintAlerts(); cfgReady().then(() => { blogCard(); banner(); }); W.addEventListener("load", sw); if (D.readyState === "complete") sw(); };
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();
})();
