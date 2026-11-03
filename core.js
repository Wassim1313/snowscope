/* SnowScope Web core: config, ads, Firebase sign-in, Pro entitlement, hotels, app link, shared UI.
   Every page sets <html data-root="">  (or "../" one folder down) and calls SS.start(). */
(() => {
  "use strict";
  // absolute base of the site (pages under /resorts/ say data-root="../"); stays right after history.pushState
  const ROOT = new URL(document.documentElement.dataset.root || "./", location.href).href;
  const FB_VER = "10.14.1";
  const NOADS = document.documentElement.dataset.noads === "1";      // account / sources pages: never ads
  const S = { cfg: null, api: null, apiAlt: null, user: null, idToken: null, me: null, state: "anon", pro: false, noAds: false,
              fb: null, listeners: [] };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  async function getJSON(url, opt) {
    const r = await fetch(url, opt);
    if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
    return r.json();
  }

  // ------------------------------------------------------------------ units (owner 2026-11-02: US units)
  // Data stays metric everywhere; only what is written on screen changes. Metric: cm, m, km, °C, km/h. US: in, ft, mi,
  // °F, mph. Default by the visitor (not the map): a US time zone, or en-US as the first browser language outside
  // Europe / Africa; Canada stays metric. Remembered in localStorage "ss_units". In US mode number and unit are joined
  // by a no-break space so i18n.js can translate "+{a} in new" on its metric key and swap the unit back.
  const U = (() => {
    const US_TZ = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Boise|Detroit|Juneau|Sitka|Nome|Adak|Menominee|Metlakatla|Yakutat|Indiana\/.*|Kentucky\/.*|North_Dakota\/.*)|Pacific\/Honolulu|US\/.*)$/;
    const guess = () => {
      let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old browser */ }
      if (US_TZ.test(tz)) return "us";
      const l0 = String((navigator.languages && navigator.languages[0]) || navigator.language || "");
      return /^en-US$/i.test(l0) && !/^(Europe|Africa|Atlantic\/(Canary|Madeira|Azores|Reykjavik))/.test(tz) && !/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Montreal|Regina|St_Johns|Whitehorse|Yellowknife)/.test(tz) ? "us" : "metric";
    };
    let mode = null;
    try { const v = localStorage.getItem("ss_units"); if (v === "us" || v === "metric") mode = v; } catch { /* private */ }
    if (!mode) mode = guess();
    const us = () => mode === "us";
    const sp = () => (us() ? "\u00a0" : " ");
    const loc = (n) => n.toLocaleString("en-US");
    // depth / new snow: in with 1 decimal under 10 in, whole above; cm whole
    const dep = (cm) => { if (cm == null || isNaN(cm)) return "–"; if (!us()) return String(Math.round(cm)); const i = cm / 2.54; return i < 9.95 ? String(Math.round(i * 10) / 10) : String(Math.round(i)); };
    const du = () => (us() ? "in" : "cm");
    const depth = (cm) => dep(cm) + sp() + du();
    const ev = (m) => (m == null || isNaN(m) ? "–" : loc(Math.round(us() ? m * 3.28084 : m)));
    const eu = () => (us() ? "ft" : "m");
    const elev = (m) => ev(m) + sp() + eu();
    const dv = (km) => { const v = us() ? km / 1.609344 : km; return v < 10 ? String(Math.round(v * 10) / 10) : loc(Math.round(v)); };
    const dvu = () => (us() ? "mi" : "km");
    const dist = (km) => dv(km) + sp() + dvu();
    const tv = (c) => (c == null || isNaN(c) ? null : Math.round(us() ? c * 9 / 5 + 32 : c));
    const tu = () => (us() ? "°F" : "°C");
    const wv = (kmh) => (kmh == null || isNaN(kmh) ? null : Math.round(us() ? kmh / 1.609344 : kmh));
    const wu = () => (us() ? "mph" : "km/h");
    const wind = (kmh) => wv(kmh) + sp() + wu();
    // a "round" number in the display unit for thresholds / scale labels written in metric (25 km -> 15 mi, 100 cm -> 40 in)
    const nice = (v) => { const a = Math.abs(v); const st = a >= 1000 ? 500 : a >= 200 ? 50 : a >= 40 ? 10 : a >= 10 ? 5 : a >= 2 ? 1 : 0.5; return Math.round(v / st) * st; };
    const depN = (cm) => (us() ? nice(cm / 2.54) : cm);          // tick / scale labels
    const elN = (m) => (us() ? nice(m * 3.28084) : m);
    const kmN = (km) => (us() ? nice(km / 1.609344) : km);
    const set = (v) => { mode = v === "us" ? "us" : "metric"; try { localStorage.setItem("ss_units", mode); } catch { /* private */ } };
    return { us, set, mode: () => mode, sp, dep, du, depth, ev, eu, elev, dv, dvu, dist, tv, tu, wv, wu, wind, depN, elN, kmN, nice };
  })();

  // ------------------------------------------------------------------ config
  async function loadConfig() {
    const [cfg, site] = await Promise.all([
      getJSON(ROOT + "web_config.json?v=" + Math.floor(Date.now() / 6e5)).catch(() => ({})),
      getJSON(ROOT + "config.json", { cache: "no-store" }).catch(() => null)]);
    S.cfg = cfg || {};
    const alt = site && (site.fallback || site.api);  // config.json: "api" (apps) + "fallback" = the tunnel (docs/RAILWAY.md)
    const tunnel = alt ? String(alt).replace(/\/$/, "") : null;
    const fixed = S.cfg.site && S.cfg.site.api_url ? String(S.cfg.site.api_url).replace(/\/$/, "") : null;
    S.api = fixed || tunnel;                          // stable API address first, the tunnel as the fallback
    S.apiAlt = fixed && tunnel && tunnel !== fixed ? tunnel : null;
  }
  function appUrl() {
    const a = (S.cfg && S.cfg.app) || {};
    if (a.play_live && a.play_package) return "https://play.google.com/store/apps/details?id=" + encodeURIComponent(a.play_package);
    const u = a.get_app_url || "download/";
    return /^https?:/.test(u) ? u : ROOT + u;
  }

  // ------------------------------------------------------------------ API (Pro data; the free page never needs it)
  async function api(path, opt = {}) {
    try { return await api1(path, opt); }
    catch (e) {
      if (!e.down || !S.apiAlt) throw e;
      [S.api, S.apiAlt] = [S.apiAlt, S.api];           // the other address answered last time: swap and retry once
      return api1(path, opt);
    }
  }
  async function api1(path, { auth = true, timeout = 12000 } = {}) {
    if (!S.api) { const e = new Error("no api"); e.down = true; throw e; }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    const headers = {};
    if (auth && S.idToken) headers.Authorization = "Bearer " + S.idToken;
    try {
      const r = await fetch(S.api + path, { headers, signal: ctl.signal });
      if (r.status === 402) {
        // regional Pro (Morocco lifetime = High Atlas only): {reason:"pro_scope", scope:["ATLAS"], upsell:"subscription"}
        let b = null; try { b = await r.json(); } catch { /* no body */ }
        const d = b && (typeof b.detail === "object" && b.detail ? b.detail : b);
        const scoped = !!d && (d.reason === "pro_scope" || d.detail === "pro_scope");
        const e = new Error(scoped ? "pro_scope" : "pro_required"); e.status = 402; e.scope = scoped ? d.scope : null; throw e;
      }
      if (r.status >= 500 || r.status === 429) { const e = new Error("down"); e.down = true; e.status = r.status; throw e; }
      if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
      return await r.json();
    } catch (e) {
      if (e.name === "AbortError" || e instanceof TypeError) e.down = true;   // network / tunnel / CORS failure
      throw e;
    } finally { clearTimeout(t); }
  }
  // Mapbox / MapLibre: attach the token to Pro tile requests going to our API
  function transformRequest(url) {
    if (S.api && S.idToken && url.startsWith(S.api)) return { url, headers: { Authorization: "Bearer " + S.idToken } };
    return { url };
  }

  // ------------------------------------------------------------------ ads (AdSense, config-driven)
  let houseN = 0;
  function houseAd(el) {
    const d = el.dataset, stay = d.lat && S.cfg && S.cfg.stay22 && !(S.pro && store.get("ss_nostay"));
    const pro = !S.pro;
    const pick = (houseN++ % 2 === 0 && stay) || !pro ? "stay" : "pro";
    if (pick === "stay" && stay) {
      let u = stayLink(+d.lat, +d.lon, d.place || "", d.day || null);
      if (!u) return "";
      u = u.replace("campaign=snowscope_web", "campaign=snowscope_web_slot");
      return '<a class="housead" target="_blank" rel="sponsored noopener" href="' + esc(u) + '"><span class="hl">Sponsored</span><span class="ic"><span class="ms f">hotel</span></span>' +
        "<span><b>Sleep near " + esc(d.place || "the slopes") + "</b><small>Hotels and chalets for your dates</small></span></a>";
    }
    if (!pro) return "";
    return '<a class="housead pro" href="' + ROOT + 'pricing/"><span class="hl">Sponsored</span><span class="ic"><span class="ms f">workspace_premium</span></span>' +
      "<span><b>SnowScope Pro</b><small>15-day snow, every layer, no ads</small></span></a>";
  }
  const Ads = {
    loaded: false,
    client() { const c = ((S.cfg && S.cfg.adsense) || {}).client || ""; return /^ca-pub-\d{10,20}$/.test(c) ? c : ""; },
    allowed() { return !!this.client() && !S.pro && !S.noAds && !NOADS; },
    start() {
      if (!this.allowed()) { this.hideAll(); return; }
      if (!this.loaded) {
        // Google's own consent message (AdSense -> Privacy & messaging, EEA/UK/CH) is served by this tag itself and
        // runs before any personalised ad request; no homemade cookie wall.
        const s = document.createElement("script");
        s.async = true; s.crossOrigin = "anonymous";
        s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(this.client());
        s.onload = () => this.flush();
        document.head.appendChild(s);
        this.loaded = true;
        document.querySelectorAll("[data-ad-choices]").forEach((e) => { e.hidden = false; });
      }
      document.querySelectorAll("[data-ad]").forEach((el) => this.fill(el));
    },
    fill(el) {
      if (!this.allowed() || el.dataset.filled) return;
      const a = S.cfg.adsense || {};
      const slot = a["slot_" + el.dataset.ad];
      // house ad first (until AdSense is approved and fills the unit): a Stay22 card or the Pro card, alternating
      const house = houseAd(el);
      if (!/^\d{5,20}$/.test(slot || "")) {
        el.innerHTML = house; el.hidden = !house; el.dataset.filled = "1"; el.classList.add("filled", "house"); return;
      }
      const fluid = el.dataset.ad === "infeed" && a.infeed_layout_key;
      // the unit keeps its width while collapsed (height 0): Google measures availableWidth at push time and logs an
      // error for a display:none unit; it is unrolled only once Google says "filled", the house ad shows until then
      el.innerHTML = '<div class="adl" hidden>Advertisement</div><div class="housewrap">' + house + '</div><div class="adslot" style="height:0;overflow:hidden">' +
        '<ins class="adsbygoogle" style="display:block;min-height:250px" data-ad-client="' +
        esc(this.client()) + '" data-ad-slot="' + esc(slot) + '"' +
        (fluid ? ' data-ad-format="fluid" data-ad-layout-key="' + esc(a.infeed_layout_key) + '"'
               : ' data-ad-format="auto" data-full-width-responsive="true"') + "></ins></div>";
      el.hidden = false; el.dataset.filled = "1"; el.classList.add("filled");
      this.flush();
      const ins = el.querySelector("ins.adsbygoogle"), hw = el.querySelector(".housewrap"), sl = el.querySelector(".adslot");
      if (ins && hw) new MutationObserver(() => { const f = ins.getAttribute("data-ad-status") === "filled"; hw.hidden = f; sl.style.height = f ? "" : "0"; el.querySelector(".adl").hidden = !f; })
        .observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    },
    flush() {       // one push per <ins> still on the page and not yet served; pushes queued before the tag loaded
      // used to outnumber the units after a panel re-render ("All 'ins' elements ... already have ads")
      const a = (window.adsbygoogle = window.adsbygoogle || []);
      if (!a.loaded) return;                           // the tag flushes itself once loaded (s.onload)
      for (const ins of document.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])")) {
        if (!ins.isConnected) continue;
        try { a.push({}); } catch { return; }
      }
    },
    hideAll() {
      document.querySelectorAll("[data-ad]").forEach((el) => { el.hidden = true; el.innerHTML = ""; delete el.dataset.filled; });
      document.querySelectorAll("ins.adsbygoogle").forEach((el) => el.remove());   // Auto ads placed by Google
      document.querySelectorAll("[data-ad-choices]").forEach((e) => { e.hidden = true; });
    },
    choices() {   // "Privacy & cookie choices": Google's revocation entry point
      window.googlefc = window.googlefc || {}; window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
      window.googlefc.callbackQueue.push(() => { try { window.googlefc.showRevocationMessage(); } catch { /* not in EEA */ } });
    },
  };

  // ------------------------------------------------------------------ Firebase sign-in (same project as the app)
  function fbEnabled() {
    const f = (S.cfg && S.cfg.firebase) || {};
    return !!(f.apiKey && f.authDomain && f.projectId && f.appId);
  }
  let authP = null;
  function ensureAuth() { if (!authP) authP = initAuth().catch((e) => { console.warn("sign-in unavailable", e); authP = null; return false; }); return authP; }
  async function initAuth() {
    if (!fbEnabled()) return false;
    const base = "https://www.gstatic.com/firebasejs/" + FB_VER + "/";
    const [appM, authM] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js")]);
    const f = S.cfg.firebase;
    const app = appM.initializeApp({ apiKey: f.apiKey, authDomain: f.authDomain, projectId: f.projectId, appId: f.appId,
                                     messagingSenderId: f.messagingSenderId || undefined });
    const auth = authM.getAuth(app);
    auth.useDeviceLanguage();
    S.fb = { m: authM, auth };
    return new Promise((resolve) => {
      let first = true;
      authM.onAuthStateChanged(auth, async (u) => {
        S.user = u;
        if (u) { store.set("ss_signed", 1); await refreshToken(); await refreshMe(); }
        else { store.set("ss_signed", null); store.set("ss_ent", null); S.idToken = null; S.me = null; S.state = "anon"; S.pro = false; S.noAds = false; emit(); }
        if (first) { first = false; resolve(true); }
      });
    });
  }
  async function refreshToken(force) {
    if (!S.user) return null;
    try { S.idToken = await S.user.getIdToken(!!force); } catch { S.idToken = null; }
    return S.idToken;
  }
  setInterval(() => { if (S.user) refreshToken(true); }, 45 * 60 * 1000);   // ID tokens live 1 h; tiles read S.idToken
  async function refreshMe() {
    if (!S.user) return;
    S.state = "checking"; emit();
    try {
      const me = await api("/v1/me");
      S.me = me;
      const acc = me.account || {}, ent = me.entitlement || {};
      S.pro = acc.tier === "premium" || ent.tier === "premium" || me.gating === false;
      // where Pro applies (owner 2026-11-03): null = everywhere; ["ATLAS"] = the Morocco lifetime (High Atlas only)
      S.scope = me.gating !== false && Array.isArray(ent.scope) && ent.scope.length ? ent.scope.map((x) => String(x).toUpperCase()) : null;
      S.noAds = S.pro || !!ent.no_ads;
      S.state = "ok";
      store.set("ss_ent", { uid: S.user.uid, pro: S.pro, noAds: S.noAds, t: Date.now() });
    } catch (e) {
      S.me = null;
      S.scope = null;
      if (e.status === 401) { S.state = "no_account"; S.pro = false; S.noAds = false; store.set("ss_ent", null); }
      else {   // API / tunnel down: keep the last known answer for ads only (no Pro data without the API)
        S.state = "api_down";
        const c = store.get("ss_ent");
        S.noAds = !!(c && c.uid === S.user.uid && c.noAds && Date.now() - c.t < 14 * 864e5);
        S.pro = false;
      }
    }
    emit();
  }
  function emit() {
    if (S.pro || S.noAds) Ads.hideAll(); else if (S.started) { Ads.start(); LMA.start(); }
    renderAcct();
    S.listeners.forEach((f) => { try { f(S); } catch (e) { console.error(e); } });
  }
  const errText = (e) => {
    const c = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "Wrong e-mail or password.";
    if (/email-already-in-use/.test(c)) return "An account already uses this e-mail. Sign in instead.";
    if (/weak-password/.test(c)) return "Choose a password of at least 8 characters.";
    if (/invalid-email/.test(c)) return "This e-mail address doesn't look right.";
    if (/too-many-requests/.test(c)) return "Too many tries. Wait a minute and try again.";
    if (/popup-closed|cancelled-popup/.test(c)) return "";
    if (/network/.test(c)) return "No connection. Try again.";
    if (/requires-recent-login/.test(c)) return "Please sign in again first.";
    return "Something went wrong. Try again.";
  };
  const Auth = {
    enabled: fbEnabled,
    async google() { const m = S.fb.m; await m.signInWithPopup(S.fb.auth, new m.GoogleAuthProvider()); },
    async signIn(email, pw) { await S.fb.m.signInWithEmailAndPassword(S.fb.auth, email, pw); },
    async signUp(email, pw, name) {
      const m = S.fb.m;
      const cred = await m.createUserWithEmailAndPassword(S.fb.auth, email, pw);
      if (name) await m.updateProfile(cred.user, { displayName: name });
      await m.sendEmailVerification(cred.user);
      track("sign_up", { method: "password" });
    },
    async reset(email) { await S.fb.m.sendPasswordResetEmail(S.fb.auth, email); },
    async verify() { await S.fb.m.sendEmailVerification(S.user); },
    async reload() { await S.user.reload(); S.user = S.fb.auth.currentUser; await refreshToken(true); await refreshMe(); },
    async rename(name) { await S.fb.m.updateProfile(S.user, { displayName: name }); emit(); },
    async signOut() { await S.fb.m.signOut(S.fb.auth); },
    errText,
  };

  // ------------------------------------------------------------------ hotels (Stay22, engine/affiliates.py)
  function nextWeekend(d = new Date()) {
    const day = d.getDay();                          // 0 Sun .. 6 Sat; check in Friday, out Sunday (as the app)
    const add = day === 6 ? 6 : day === 0 ? 5 : (5 - day + 7) % 7;
    const fri = new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);
    const iso = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
    return [iso(fri), iso(new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 2))];
  }
  function stayLink(lat, lon, place, day) {
    const s = S.cfg && S.cfg.stay22;
    if (!s || !s.link) return null;
    // date-aware: the chosen day as check-in (if not past), else the next weekend
    const today = new Date().toISOString().slice(0, 10);
    let [cin, cout] = nextWeekend();
    if (day && day > today) { cin = day; const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); cout = d.toISOString().slice(0, 10); }
    const lang = (navigator.language || "en").slice(0, 2).toLowerCase();
    const v = { lat: lat.toFixed(4), lon: lon.toFixed(4), place, checkin: cin, checkout: cout, adults: "2", lang };
    return s.link.replace(/\{([a-z_]+)\}/g, (m, k) => (k in v ? encodeURIComponent(v[k]) : m));
  }
  function stayMapUrl(lat, lon, place) {
    const s = S.cfg && S.cfg.stay22;
    if (!s || !s.aid) return null;
    const [cin, cout] = nextWeekend();
    // address + view box, not lat/lng: Stay22 refuses most lat/lng (its reverse geocoder, 2026-11-03, see app.js stayLocs)
    const q = new URLSearchParams({ aid: s.aid, address: place || "", nelat: (lat + 0.035).toFixed(4), nelng: (lon + 0.05).toFixed(4), swlat: (lat - 0.035).toFixed(4), swlng: (lon - 0.05).toFixed(4), checkin: cin,
                                    checkout: cout, adults: "2", campaign: s.campaign || "snowscope_web", maincolor: "1463F3" });
    return "https://www.stay22.com/embed/gm?" + q.toString();
  }
  /** "Stay near <place>" block: affiliate link + a hotels map that only loads when asked (no third-party load before). */
  // Pro members can hide hotel suggestions (You tab); everyone else sees them (useful + they pay for the site)
  const staysHidden = () => !!(S.pro && store.get("ss_nostay"));
  function stayBlock(lat, lon, place, { map = true, day = null, where = "panel" } = {}) {
    if (staysHidden()) return "";
    let href = stayLink(lat, lon, place, day);
    if (href) href = href.replace("campaign=snowscope_web", "campaign=snowscope_web_" + where);
    if (!href) return "";
    const id = "st" + Math.random().toString(36).slice(2, 8);
    return '<div class="stay"><div class="acts">' +
      '<a class="btn tonal" target="_blank" rel="sponsored noopener" href="' + esc(href) + '"><span class="ms">hotel</span><span class="t">Hotels near ' + esc(place) + "</span></a>" +
      (map ? '<button class="btn ghost" type="button" data-staymap="' + id + '" data-lat="' + lat + '" data-lon="' + lon + '" data-place="' + esc(place) + '"><span class="ms">map</span><span class="t">Hotels map</span></button>' : "") +
      '<span class="partner" tabindex="0" title="Partner link: we may earn a commission from bookings">Partner <span class="ms">info</span></span></div><div id="' + id + '"></div></div>';
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-staymap]");
    if (!b) return;
    const box = $(b.dataset.staymap);
    if (box.firstChild) { box.innerHTML = ""; return; }
    const u = stayMapUrl(+b.dataset.lat, +b.dataset.lon, b.dataset.place);
    if (u) box.innerHTML = '<iframe loading="lazy" title="Hotels near ' + esc(b.dataset.place) + '" src="' + esc(u) + '"></iframe>';
  });

  // ------------------------------------------------------------------ Stay22 script ("Let Me Allez"): turns hotel /
  // booking links into affiliate links and adds its own suggestions. It sets affiliate cookies, so it follows the same
  // rule as ads: free visitors only, never on account pages, and in Europe only after consent in Google's message.
  const LMA = {
    loaded: false,
    want() { const s = S.cfg && S.cfg.stay22; return !!(s && s.aid && s.lma) && !S.pro && !S.noAds && !NOADS; },
    europe() { try { return /^(Europe|Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe))/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ""); } catch { return true; } },
    start() {
      if (this.loaded || this.waiting || !this.want()) return;
      this.waiting = true;
      const go = () => { this.waiting = false; if (this.want()) this.load(); };
      let tries = 0;
      const poll = () => {                               // Google's consent message exposes the TCF API (__tcfapi)
        if (typeof window.__tcfapi === "function") {
          window.__tcfapi("addEventListener", 2, (tc, ok) => {
            if (!ok || !tc || this.loaded) return;
            if (tc.eventStatus !== "tcloaded" && tc.eventStatus !== "useractioncomplete") return;
            if (tc.gdprApplies === false || (tc.purpose && tc.purpose.consents && tc.purpose.consents[1])) go();
            else this.waiting = false;
          });
        } else if (++tries < 16) setTimeout(poll, 500);
        else if (!this.europe()) go();                   // no consent tool after 8 s: outside Europe only
        else this.waiting = false;
      };
      poll();
    },
    load() {
      const c = S.cfg.stay22;
      this.loaded = true;
      window.Stay22 = window.Stay22 || {};
      window.Stay22.params = { aid: c.aid, campaign: c.campaign || "snowscope_web", excludes: [], deepStruct: [] };
      const s = document.createElement("script");
      s.async = true; s.src = "https://scripts.stay22.com/letmeallez.js";
      document.head.appendChild(s);
    },
  };

  // may a Stay22 iframe load now? outside Europe yes; in Europe only with Google's consent message saying yes
  // (purpose 1); without an answer the page shows a "load the map" button (an explicit click loads it)
  function stayConsent() {
    return new Promise((ok) => {
      if (!LMA.europe()) { ok(true); return; }
      let done = false, tries = 0;
      const fin = (v) => { if (!done) { done = true; ok(v); } };
      const poll = () => {
        if (typeof window.__tcfapi === "function") {
          window.__tcfapi("addEventListener", 2, (tc, good) => {
            if (!good || !tc) return;
            if (tc.eventStatus !== "tcloaded" && tc.eventStatus !== "useractioncomplete") return;
            fin(tc.gdprApplies === false || !!(tc.purpose && tc.purpose.consents && tc.purpose.consents[1]));
          });
          setTimeout(() => fin(false), 3000);
        } else if (++tries < 6) setTimeout(poll, 400);
        else fin(false);
      };
      poll();
    });
  }

  // consent given later (the visitor answers the Google consent message after the page opened) -> cb() once
  function stayConsentWatch(cb) {
    let done = false, tries = 0;
    const go = () => { if (!done) { done = true; cb(); } };
    const hook = () => {
      if (typeof window.__tcfapi !== "function") { if (++tries < 40) setTimeout(hook, 1500); return; }
      window.__tcfapi("addEventListener", 2, (tc, good) => {
        if (!good || !tc || (tc.eventStatus !== "tcloaded" && tc.eventStatus !== "useractioncomplete")) return;
        if (tc.gdprApplies === false || (tc.purpose && tc.purpose.consents && tc.purpose.consents[1])) go();
      });
    };
    hook();
  }

  // ------------------------------------------------------------------ modals
  function modal(html, { onClose } = {}) {
    const sc = document.createElement("div");
    sc.className = "scrim";
    sc.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + "</div>";
    const close = () => { sc.remove(); document.removeEventListener("keydown", key); if (onClose) onClose(); };
    const key = (e) => { if (e.key === "Escape") close(); };
    sc.addEventListener("click", (e) => { if (e.target === sc || e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", key);
    document.body.appendChild(sc);
    const f = sc.querySelector("input,button:not(.x)"); if (f) setTimeout(() => f.focus(), 30);
    return { el: sc, close };
  }
  const head = (t) => '<div class="hd"><h2>' + t + '</h2><button class="x" data-close aria-label="Close"><span class="ms">close</span></button></div>';

  // Regional Pro (owner 2026-11-03): the Morocco lifetime covers the High Atlas only (engine/domains.py ATLAS box).
  const SCOPE_BOX = { ATLAS: [-10.5, 29.0, -1.5, 36.0] };
  /** Pro at this place ({lat, lng|lon}); everywhere for subscriptions / comp / gating off. */
  // Freemium (owner 2026-11-03, docs/TIERS.md): the website is free for everyone (ads + Stay22 + partners); the old Pro
  // locks and the web checkout come back only with web_config "web_pro_enabled": true (Paddle code kept dormant).
  const webPro = () => !!(S.cfg && S.cfg.web_pro_enabled === true);
  function proHere(c) {
    if (!webPro()) return true;
    if (!S.pro) return false;
    if (!S.scope) return true;
    const lat = c && +c.lat, lon = c && +(c.lng != null ? c.lng : c.lon);
    if (!c || !isFinite(lat) || !isFinite(lon)) return false;
    return S.scope.some((k) => { const b = SCOPE_BOX[k]; return !!b && lon >= b[0] && lat >= b[1] && lon <= b[2] && lat <= b[3]; });
  }
  /** Pro for a domain / region code ("ATLAS", "ALPS", ...). */
  const proIn = (code) => !webPro() || !!S.pro && (!S.scope || S.scope.includes(String(code || "").toUpperCase()));

  function upsell(what) {
    const scoped = !!(S.pro && S.scope);
    const m = modal(head('<span class="pro"><span class="ms f">lock</span>PRO</span>') +
      '<p style="font-size:17px;font-weight:620;margin:6px 0 4px">' + esc(what || "This is a Pro feature") + "</p>" +
      (scoped ? '<p style="margin:0 0 10px"><b>Your Pro covers the High Atlas. Get Pro everywhere</b> (Alps, Pyrenees, North America…) with a subscription.</p>' : "") +
      (!webPro() ? '<p style="color:var(--ink2);margin:0 0 14px">Everything on the website is free. In the Android app, SnowScope Pro names every peak around you, creates 3D videos and removes the ads.</p>' : "") +
      (!webPro() ? "" : '<p style="color:var(--ink2);margin:0 0 14px">SnowScope Pro adds the sharper snow map, 15 days instead of 5, new snow, wind, freezing level, satellite snow and the 7-day resort forecast, without ads. Get it in the Android app, then sign in here with the same account.</p>') +
      (window.SSPay && SSPay.enabled() ? '<button class="btn ski big full" data-buy-pro><span class="ms f">workspace_premium</span>Get Pro</button>' +
        '<a class="btn ghost big full" style="margin-top:8px" href="' + esc(appUrl()) + '"><span class="ms f">downhill_skiing</span>Get the Android app</a>'
        : '<a class="btn ski big full" href="' + esc(appUrl()) + '"><span class="ms f">downhill_skiing</span>Get Pro in the Android app</a>') +
      (fbEnabled() && !S.user ? '<button class="btn ghost big full" style="margin-top:8px" data-signin>Already Pro? Sign in</button>' : "") +
      (S.user && S.state === "no_account" ? '<p class="msg">Open the app once and sign in with this account, then come back.</p>' : "") +
      (S.user && S.state === "api_down" ? '<p class="msg">Pro data is updating, try again in a minute.</p>' : ""));
    m.el.addEventListener("click", (e) => { if (e.target.closest("[data-signin]")) { m.close(); signInModal(); } });
  }

  async function signInModal(mode = "in") {
    if (!fbEnabled()) return;
    if (!S.fb) { await ensureAuth(); if (!S.fb) return; }
    const m = modal(head(mode === "up" ? "Create your account" : "Sign in") +
      '<p style="color:var(--ink2);margin:2px 0 12px">One SnowScope account for the app and the website.</p>' +
      '<button class="btn ghost big full" data-g><img alt="" width="18" height="18" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg">Continue with Google</button>' +
      '<div class="or">or with e-mail</div><form novalidate>' +
      (mode === "up" ? '<label class="field"><span>Name (optional)</span><input name="name" autocomplete="name" maxlength="60"></label>' : "") +
      '<label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label>' +
      '<label class="field"><span>Password</span><input name="pw" type="password" minlength="8" autocomplete="' + (mode === "up" ? "new-password" : "current-password") + '" required></label>' +
      '<div class="msg" hidden></div>' +
      '<button class="btn ink big full" type="submit">' + (mode === "up" ? "Create account" : "Sign in") + "</button></form>" +
      '<div style="display:flex;justify-content:space-between;margin-top:10px">' +
      (mode === "up" ? '<button class="linkbtn" data-mode="in">I have an account</button>'
                     : '<button class="linkbtn" data-reset>Forgot password?</button><button class="linkbtn" data-mode="up">Create an account</button>') + "</div>");
    const msg = m.el.querySelector(".msg"), form = m.el.querySelector("form");
    const show = (t, cls = "err") => { msg.hidden = !t; msg.className = "msg " + cls; msg.textContent = t; };
    m.el.addEventListener("click", async (e) => {
      if (e.target.closest("[data-g]")) {
        try { await Auth.google(); m.close(); } catch (er) { show(errText(er)); }
      } else if (e.target.closest("[data-mode]")) { m.close(); signInModal(e.target.closest("[data-mode]").dataset.mode); }
      else if (e.target.closest("[data-reset]")) {
        const em = form.email.value.trim();
        if (!em) { show("Type your e-mail first."); return; }
        try { await Auth.reset(em); show("If an account exists, a reset link is on its way to " + em + ".", "ok"); } catch (er) { show(errText(er)); }
      }
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const em = form.email.value.trim(), pw = form.pw.value;
      if (!em || pw.length < (mode === "up" ? 8 : 1)) { show(mode === "up" ? "E-mail and a password of at least 8 characters, please." : "E-mail and password, please."); return; }
      form.querySelector("[type=submit]").disabled = true;
      try {
        if (mode === "up") { await Auth.signUp(em, pw, form.name.value.trim()); m.close(); location.href = ROOT + "account.html#verify"; }
        else { await Auth.signIn(em, pw); m.close(); }
      } catch (er) { show(errText(er)); form.querySelector("[type=submit]").disabled = false; }
    });
  }

  // header account widget (#acct)
  function renderAcct() {
    const box = $("acct");
    if (!box) return;
    let h = "";
    if (S.user) {
      const n = (S.user.displayName || S.user.email || "?").trim();
      h = '<a class="avatar" href="' + ROOT + 'account.html" title="Your account" aria-label="Your account">' + esc(n[0].toUpperCase()) + "</a>";
      if (S.pro) h = '<span class="pro hide-s"><span class="ms f">workspace_premium</span>PRO</span>' + h;
    } else if (fbEnabled()) h = '<button class="btn ghost" data-signin>Sign in</button>';
    h += '<a class="btn ink hide-s" href="' + esc(appUrl()) + '">Get the app</a>';
    box.innerHTML = h;
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-signin]") && !e.target.closest(".sheet")) signInModal();
    if (e.target.closest("[data-ad-choices]")) { e.preventDefault(); Ads.choices(); }
    const lb = e.target.closest("[data-lang]"); if (lb && window.I18N) I18N.menu(lb);
    if (e.target.closest("[data-find-open]")) { const f = document.querySelector(".find"); f.classList.add("show"); f.querySelector("input").focus(); }
  });

  // ------------------------------------------------------------------ resort search (header)
  let RES = null;
  async function resorts() {
    if (!RES) RES = getJSON(ROOT + "snow/resorts.json?v=" + Math.floor(Date.now() / 36e5)).then((j) => {
      const F = j.fields;
      return { dates: j.dates, rows: j.rows.map((r) => Object.fromEntries(F.map((k, i) => [k, r[i]]))) };
    });
    return RES;
  }
  function setupFind() {
    const box = document.querySelector(".find");
    if (!box) return;
    const inp = box.querySelector("input"), ul = box.querySelector("ul");
    const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    let sel = -1, items = [];
    const draw = () => {
      ul.hidden = !items.length;
      ul.innerHTML = items.map((r, i) => '<li><a class="' + (i === sel ? "on" : "") + '" href="' + ROOT + "resorts/" + encodeURIComponent(r.slug) + '.html"><span>' +
        esc(r.short || r.name) + "</span><small>" + esc(r.country) + "</small></a></li>").join("");
    };
    const go = (slug) => {
      items = []; draw(); inp.blur(); box.classList.remove("show");
      if (window.SSApp) window.SSApp.open(slug); else location.href = ROOT + "resorts/" + encodeURIComponent(slug) + ".html";
    };
    ul.addEventListener("mousedown", (e) => { const a = e.target.closest("a"); if (a && window.SSApp) { e.preventDefault(); go(decodeURIComponent(a.pathname.split("/").pop().replace(/\.html$/, ""))); } });
    inp.addEventListener("focus", () => resorts());
    inp.addEventListener("input", async () => {
      const q = norm(inp.value.trim());
      if (q.length < 2) { items = []; draw(); return; }
      const { rows } = await resorts();
      items = rows.filter((r) => norm(r.name).includes(q)).sort((a, b) => (norm(a.name).startsWith(q) ? 0 : 1) - (norm(b.name).startsWith(q) ? 0 : 1) || (b.km || 0) - (a.km || 0)).slice(0, 8);
      sel = -1; draw();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && items.length) { go(items[Math.max(0, sel)].slug); }
      else if (e.key === "Escape") { items = []; draw(); box.classList.remove("show"); }
    });
    inp.addEventListener("blur", () => setTimeout(() => { items = []; draw(); box.classList.remove("show"); }, 200));
  }

  // ------------------------------------------------------------------ map library (Mapbox with the owner token, else MapLibre)
  function loadScript(src) { return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
  function loadCss(href) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }
  async function mapLib() {       // MapLibre + free OpenFreeMap styles (no key, no per-load cost)
    loadCss("https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css");
    await loadScript("https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js");
    // Arabic / Hebrew labels (Casablanca, Rabat... on the basemap, Arabic station / resort names): MapLibre shapes
    // right-to-left text only with the RTL plugin (0.2.3: the classic worker build MapLibre 4 can importScripts; 0.3.0 is an ES module and fails); lazy = loaded the first time such a label is on screen
    try {
      const ml = window.maplibregl;
      if (ml && ml.setRTLTextPlugin && (!ml.getRTLTextPluginStatus || ml.getRTLTextPluginStatus() === "unavailable")) {
        const p = ml.setRTLTextPlugin("https://cdn.jsdelivr.net/npm/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", true);
        if (p && p.catch) p.catch(() => {});
      }
    } catch { /* already set / old browser: labels stay as before */ }
    return { lib: window.maplibregl, style: "https://tiles.openfreemap.org/styles/liberty", mapbox: false };
  }


  // ------------------------------------------------------------------ start
  // ------------------------------------------------------------------ analytics: GA4 with Consent Mode v2 + own counter
  const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent);
  const EEA = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL",
    "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH"];
  function analytics() {
    const id = ((S.cfg && S.cfg.analytics) || {}).ga4_id;
    if (!id || !/^G-[A-Z0-9]{6,12}$/.test(id) || BOT) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // denied by default in Europe until Google's consent message (AdSense Privacy & messaging) updates it
    gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", region: EEA, wait_for_update: 500 });
    gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" });
    gtag("js", new Date());
    gtag("config", id, { send_page_view: false });
    const sc = document.createElement("script"); sc.async = true; sc.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(sc);
  }
  function track(name, params) { if (window.gtag && !BOT) try { gtag("event", name, params || {}); } catch { /* ignore */ } }
  let lastPath = null;
  function pageView(path) {
    path = path || location.pathname + location.search;
    if (BOT || path === lastPath) return;
    lastPath = path;
    if (window.gtag) gtag("event", "page_view", { page_location: location.origin + path, page_path: path, page_title: document.title });
    if (S.api && navigator.sendBeacon) {              // first-party counter: no cookie, hashed + daily-rotating id
      try {
        navigator.sendBeacon(S.api + "/v1/hit", new Blob([JSON.stringify({ path: path.slice(0, 200), ref: document.referrer ? new URL(document.referrer).hostname : "",
          src: "web", lang: (window.I18N && I18N.lang) || "" })], { type: "text/plain" }));
      } catch { /* ignore */ }
    }
  }
  // first-party event beacon (same counter as page views, src "stay22"): /ad/stay22/<placement>/<load|view|click|tap>
  // (docs/WEB.md "Stay22 viewability"); no cookie, no personal data
  const HITS = new Set();
  function hit(path, src, once) {
    if (BOT || !S.api || !navigator.sendBeacon) return;
    if (once) { if (HITS.has(once)) return; HITS.add(once); }
    try {
      navigator.sendBeacon(S.api + "/v1/hit", new Blob([JSON.stringify({ path: String(path).slice(0, 200), ref: "", src: src || "web",
        lang: (window.I18N && I18N.lang) || "" })], { type: "text/plain" }));
    } catch { /* ignore */ }
  }
  document.addEventListener("click", (e) => {            // which Stay22 placement works (no personal data)
    const a = e.target.closest('a[href*="stay22.com"]');
    if (a) {
      const m = /campaign=([a-z0-9_]+)/.exec(a.href);
      track("book_click", { placement: m ? m[1] : "web" });
      const pl = a.dataset.s22 || (m ? m[1].replace(/^snowscope_web_?/, "").replace(/(map|allez)$/, "") : "") || "web";
      hit("/ad/stay22/" + pl + "/click", "stay22");
    }
  }, true);
  // icon font guard: until Material Symbols has loaded, its ligature names ("search", "layers") would show as text
  // (slow networks, font blocked): keep the glyph boxes empty instead (.ms is transparent until html.msok)
  try {
    const ok = () => document.documentElement.classList.add("msok");
    if (document.fonts && document.fonts.load) document.fonts.load('24px "Material Symbols Rounded"', "search").then((f) => { if (f && f.length) ok(); }, () => {});
    else ok();
    if (document.fonts && document.fonts.check && document.fonts.check('24px "Material Symbols Rounded"', "search")) ok();
  } catch { document.documentElement.classList.add("msok"); }
  async function start() {
    await loadConfig();
    const cf = ((S.cfg && S.cfg.analytics) || {}).cf_beacon_token;
    if (cf && /^[0-9a-f]{20,40}$/i.test(cf)) {          // Cloudflare Web Analytics: cookieless, no consent needed
      const b = document.createElement("script");
      b.defer = true; b.src = "https://static.cloudflareinsights.com/beacon.min.js";
      b.setAttribute("data-cf-beacon", JSON.stringify({ token: cf }));
      document.head.appendChild(b);
    }
    analytics();
    setupFind();
    // web payments (Paddle overlay checkout, paddle.js): only when the owner config has a client-side token
    if (webPro() && S.cfg.paddle && S.cfg.paddle.client_token) loadScript(ROOT + "paddle.js").catch(() => {});
    document.querySelectorAll("[data-app-link]").forEach((a) => { a.href = appUrl(); });
    // a visitor who was Pro last time: wait (max 4 s) for the sign-in check before any ad loads
    const c = store.get("ss_ent");
    if (c && c.noAds) S.noAds = true;
    renderAcct();
    // Firebase loads only for visitors who signed in before (session restore), on the account page, or on "Sign in"
    const want = fbEnabled() && (store.get("ss_signed") || location.pathname.endsWith("/account.html"));
    const auth = want ? ensureAuth() : Promise.resolve(false);
    if (want) await Promise.race([auth, new Promise((r) => setTimeout(r, 4000))]);
    S.started = true;
    if (!S.user) { S.noAds = false; S.pro = false; }
    emit();
    pageView();
    return S;
  }

  window.SS = { webPro, proHere, proIn, U, S, stayConsent, stayConsentWatch, start, api, refreshMe, ensureAuth, staysHidden, track, pageView, hit, getJSON, esc, appUrl, upsell, signInModal, modal, head, Auth, Ads, stayBlock, stayLink,
                resorts, mapLib, transformRequest, onChange: (f) => S.listeners.push(f), store, ROOT };
})();
