/* SnowScope Web · 3D Studio page (studio.html): demo reels, the signed-in visitor's Premium status, a
   flyover / ski-circuit request form and live job status. All calls are GETs to the SnowScope API; the
   Firebase ID token travels as "Authorization: Bearer" (same as core.js). Strings live here in EN/FR/DE/IT/ES
   (Arabic visitors get English); the page root has data-noi18n so i18n.js leaves it alone.
   Query params: ?slug=<resort> prefills the place, ?kind=flyover|circuit the video type. */
(() => {
  "use strict";
  const { esc } = SS;
  const LANG = ["en", "fr", "de", "it", "es"].includes(window.I18N && I18N.lang) ? I18N.lang : "en";
  const LOC = { en: "en-GB", fr: "fr-FR", de: "de-DE", it: "it-IT", es: "es-ES" }[LANG];
  // [en, fr, de, it, es]
  const D = {
    title: ["3D videos", "Vidéos 3D", "3D-Videos", "Video 3D", "Vídeos 3D"],
    lede: ["Short vertical videos that fly over the mountains with today's snow. Made for your phone and ready to share.",
      "De courtes vidéos verticales qui survolent les montagnes avec la neige du jour. Faites pour votre téléphone, prêtes à partager.",
      "Kurze Hochformat-Videos, die mit dem Schnee von heute über die Berge fliegen. Fürs Handy gemacht und bereit zum Teilen.",
      "Brevi video verticali che sorvolano le montagne con la neve di oggi. Pensati per il telefono e pronti da condividere.",
      "Vídeos verticales cortos que sobrevuelan las montañas con la nieve de hoy. Hechos para tu móvil y listos para compartir."],
    demos: ["Examples", "Exemples", "Beispiele", "Esempi", "Ejemplos"],
    noDemos: ["The examples are being made. Come back in a little while.", "Les exemples sont en préparation. Revenez dans un moment.",
      "Die Beispiele werden gerade erstellt. Schau bald wieder vorbei.", "Gli esempi sono in preparazione. Torna tra poco.",
      "Los ejemplos se están preparando. Vuelve dentro de un rato."],
    flyover: ["3D flyover", "Survol 3D", "3D-Überflug", "Sorvolo 3D", "Sobrevuelo 3D"],
    circuit: ["3D ski circuit", "Circuit de ski 3D", "3D-Skirunde", "Giro sciistico 3D", "Circuito de esquí 3D"],
    flyoverHint: ["A peak, a resort or any point", "Un sommet, une station ou n'importe quel point", "Ein Gipfel, ein Skigebiet oder ein beliebiger Punkt",
      "Una vetta, una stazione o un punto qualsiasi", "Una cumbre, una estación o cualquier punto"],
    circuitHint: ["Your runs at a ski resort", "Vos pistes dans une station", "Deine Pisten in einem Skigebiet", "Le tue piste in una stazione", "Tus pistas en una estación"],
    make: ["Make your own", "Créez la vôtre", "Erstelle dein eigenes", "Crea il tuo", "Crea el tuyo"],
    signInLead: ["Sign in to make your own 3D video. It is part of SnowScope Pro.", "Connectez-vous pour créer votre vidéo 3D. Elle fait partie de SnowScope Pro.",
      "Melde dich an, um dein eigenes 3D-Video zu erstellen. Es gehört zu SnowScope Pro.", "Accedi per creare il tuo video 3D. Fa parte di SnowScope Pro.",
      "Inicia sesión para crear tu propio vídeo 3D. Forma parte de SnowScope Pro."],
    signIn: ["Sign in", "Se connecter", "Anmelden", "Accedi", "Iniciar sesión"],
    createAcc: ["Create an account", "Créer un compte", "Konto erstellen", "Crea un account", "Crear una cuenta"],
    soon: ["Signing in on the website is coming soon. You can make 3D videos in the SnowScope app.", "La connexion sur le site arrive bientôt. Vous pouvez créer des vidéos 3D dans l'application SnowScope.",
      "Die Anmeldung auf der Website kommt bald. 3D-Videos kannst du in der SnowScope-App erstellen.", "L'accesso dal sito arriverà presto. Puoi creare video 3D nell'app SnowScope.",
      "El inicio de sesión en la web llegará pronto. Puedes crear vídeos 3D en la app SnowScope."],
    verify: ["Confirm your e-mail first: we send the finished video there. Open the link in the e-mail we sent you, then come back.",
      "Confirmez d'abord votre e-mail : nous y envoyons la vidéo terminée. Ouvrez le lien de l'e-mail reçu, puis revenez.",
      "Bestätige zuerst deine E-Mail: Wir schicken das fertige Video dorthin. Öffne den Link in unserer E-Mail und komm dann zurück.",
      "Conferma prima la tua e-mail: ti inviamo lì il video finito. Apri il link nell'e-mail che ti abbiamo mandato, poi torna qui.",
      "Primero confirma tu e-mail: allí enviamos el vídeo terminado. Abre el enlace del e-mail que te enviamos y vuelve."],
    myAccount: ["Your account", "Votre compte", "Dein Konto", "Il tuo account", "Tu cuenta"],
    proTitle: ["3D videos are part of SnowScope Pro", "Les vidéos 3D font partie de SnowScope Pro", "3D-Videos gehören zu SnowScope Pro",
      "I video 3D fanno parte di SnowScope Pro", "Los vídeos 3D forman parte de SnowScope Pro"],
    proText: ["Pro also gives you 15-day snow, every map layer and no ads.", "Pro vous donne aussi la neige à 15 jours, toutes les couches de carte et aucune publicité.",
      "Pro bietet außerdem Schnee für 15 Tage, alle Kartenebenen und keine Werbung.", "Pro ti dà anche la neve a 15 giorni, tutti i livelli della mappa e niente pubblicità.",
      "Pro también te da la nieve a 15 días, todas las capas del mapa y sin anuncios."],
    seePlans: ["See Pro plans", "Voir les offres Pro", "Pro-Angebote ansehen", "Vedi i piani Pro", "Ver los planes Pro"],
    left: ["{n} of {m} videos left today", "Encore {n} vidéo(s) sur {m} aujourd'hui", "Heute noch {n} von {m} Videos", "Ancora {n} video su {m} oggi", "Te quedan {n} de {m} vídeos hoy"],
    noneLeft: ["No videos left today. More from {t}.", "Plus de vidéo aujourd'hui. De nouveau à partir de {t}.", "Heute keine Videos mehr. Wieder ab {t}.",
      "Nessun video rimasto oggi. Di nuovo dalle {t}.", "No te quedan vídeos hoy. Más a partir de las {t}."],
    kind: ["Video type", "Type de vidéo", "Videoart", "Tipo di video", "Tipo de vídeo"],
    place: ["Place", "Lieu", "Ort", "Luogo", "Lugar"],
    search: ["Find a ski resort", "Trouver une station", "Skigebiet finden", "Cerca una stazione", "Buscar una estación"],
    myLoc: ["Use my location", "Ma position", "Mein Standort", "Usa la mia posizione", "Usar mi ubicación"],
    locating: ["Finding you…", "Localisation…", "Standort wird gesucht…", "Ricerca posizione…", "Buscando tu ubicación…"],
    locFail: ["We could not get your location.", "Impossible d'obtenir votre position.", "Dein Standort ist nicht verfügbar.", "Non riusciamo a trovare la tua posizione.", "No pudimos obtener tu ubicación."],
    here: ["My location", "Ma position", "Mein Standort", "La mia posizione", "Mi ubicación"],
    change: ["Change", "Modifier", "Ändern", "Cambia", "Cambiar"],
    needResort: ["Pick a ski resort for a ski circuit.", "Choisissez une station pour un circuit de ski.", "Wähle ein Skigebiet für eine Skirunde.",
      "Scegli una stazione per un giro sciistico.", "Elige una estación para un circuito de esquí."],
    needPlace: ["Pick a resort or use your location.", "Choisissez une station ou utilisez votre position.", "Wähle ein Skigebiet oder nutze deinen Standort.",
      "Scegli una stazione o usa la tua posizione.", "Elige una estación o usa tu ubicación."],
    runs: ["Your runs (optional)", "Vos pistes (facultatif)", "Deine Pisten (optional)", "Le tue piste (facoltativo)", "Tus pistas (opcional)"],
    runsHint: ["Tap runs in the order you ski them, up to 12. Leave empty and we pick a nice loop.",
      "Touchez les pistes dans l'ordre où vous les skiez, 12 au plus. Sans choix, nous prenons une belle boucle.",
      "Tippe die Pisten in der Reihenfolge an, in der du sie fährst, höchstens 12. Ohne Auswahl wählen wir eine schöne Runde.",
      "Tocca le piste nell'ordine in cui le scii, fino a 12. Se non scegli, prendiamo un bel giro.",
      "Toca las pistas en el orden en que las esquías, hasta 12. Si no eliges, elegimos un buen recorrido."],
    runsNone: ["No named runs for this resort. We will pick a loop for you.", "Pas de pistes nommées pour cette station. Nous choisirons une boucle.",
      "Keine Pisten mit Namen in diesem Skigebiet. Wir wählen eine Runde für dich.", "Nessuna pista con nome in questa stazione. Scegliamo noi un giro.",
      "No hay pistas con nombre en esta estación. Elegiremos un recorrido."],
    runsFilter: ["Filter runs", "Filtrer les pistes", "Pisten filtern", "Filtra le piste", "Filtrar pistas"],
    clear: ["Clear", "Effacer", "Leeren", "Cancella", "Borrar"],
    loading: ["Loading…", "Chargement…", "Wird geladen…", "Caricamento…", "Cargando…"],
    go: ["Make my video", "Créer ma vidéo", "Mein Video erstellen", "Crea il mio video", "Crear mi vídeo"],
    sending: ["Sending…", "Envoi…", "Wird gesendet…", "Invio…", "Enviando…"],
    queued: ["Waiting in line", "En file d'attente", "In der Warteschlange", "In coda", "En cola"],
    pos: ["number {n} in line", "n° {n} dans la file", "Platz {n} in der Schlange", "n. {n} in coda", "n.º {n} en la cola"],
    running: ["Making your video", "Création de votre vidéo", "Dein Video wird erstellt", "Stiamo creando il tuo video", "Creando tu vídeo"],
    eta: ["about {t} left", "encore environ {t}", "noch etwa {t}", "ancora circa {t}", "faltan unos {t}"],
    min: ["{n} min", "{n} min", "{n} Min.", "{n} min", "{n} min"],
    sec: ["{n} s", "{n} s", "{n} s", "{n} s", "{n} s"],
    done: ["Your video is ready", "Votre vidéo est prête", "Dein Video ist fertig", "Il tuo video è pronto", "Tu vídeo está listo"],
    download: ["Download", "Télécharger", "Herunterladen", "Scarica", "Descargar"],
    mailNote: ["We also sent the link by e-mail. It works for 7 days, and videos are kept for 14 days.",
      "Nous avons aussi envoyé le lien par e-mail. Il fonctionne 7 jours, et les vidéos sont gardées 14 jours.",
      "Wir haben dir den Link auch per E-Mail geschickt. Er funktioniert 7 Tage, die Videos bleiben 14 Tage.",
      "Ti abbiamo inviato il link anche per e-mail. Funziona per 7 giorni e i video restano 14 giorni.",
      "También te enviamos el enlace por e-mail. Funciona 7 días y los vídeos se guardan 14 días."],
    failed: ["This video could not be made.", "Cette vidéo n'a pas pu être créée.", "Dieses Video konnte nicht erstellt werden.", "Non è stato possibile creare questo video.", "No se pudo crear este vídeo."],
    expired: ["Deleted after 14 days", "Supprimée après 14 jours", "Nach 14 Tagen gelöscht", "Eliminato dopo 14 giorni", "Eliminado tras 14 días"],
    recent: ["Your videos", "Vos vidéos", "Deine Videos", "I tuoi video", "Tus vídeos"],
    open: ["Watch", "Regarder", "Ansehen", "Guarda", "Ver"],
    inApp: ["Generate it in the app", "Créez-la dans l'application", "Erstelle es in der App", "Crealo nell'app", "Créalo en la app"],
    netFail: ["We could not reach SnowScope from this page. You can make the same video in the app.",
      "Impossible de joindre SnowScope depuis cette page. Vous pouvez créer la même vidéo dans l'application.",
      "SnowScope ist von dieser Seite aus nicht erreichbar. Dasselbe Video kannst du in der App erstellen.",
      "Non riusciamo a raggiungere SnowScope da questa pagina. Puoi creare lo stesso video nell'app.",
      "No pudimos conectar con SnowScope desde esta página. Puedes crear el mismo vídeo en la app."],
    retry: ["Try again", "Réessayer", "Erneut versuchen", "Riprova", "Reintentar"],
    sec_s: ["{n} s video", "vidéo de {n} s", "{n}-s-Video", "video di {n} s", "vídeo de {n} s"],
  };
  const L = { en: 0, fr: 1, de: 2, it: 3, es: 4 }[LANG];
  const t = (k, v) => { let s = (D[k] && D[k][L]) || (D[k] && D[k][0]) || k; if (v) for (const [a, b] of Object.entries(v)) s = s.replace("{" + a + "}", b); return s; };
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);

  // ---------------------------------------------------------------- state
  const st = { me: null, meErr: null, kind: qs.get("kind") === "circuit" ? "circuit" : "flyover", place: null, pistes: null, pistesFor: null,
               chosen: [], pfilter: "", busy: false, formMsg: null, netFail: false, jobs: new Map(), active: [] };

  // ---------------------------------------------------------------- API (own fetch: we need the error body's detail)
  const S = SS.S;
  const B = (p) => (SS.base ? SS.base(p) : S.api) || "";   // Studio jobs live on the PC until the DB switch
  const abs = (u) => (!u ? "" : /^https?:/.test(u) ? u : B(u) + u);
  async function call1(path, auth) {
    if (!S.api) { const e = new Error("no api"); e.net = true; throw e; }
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
    const headers = { "Accept-Language": LANG };
    if (auth && S.idToken) headers.Authorization = "Bearer " + S.idToken;
    let r;
    try { r = await fetch(B(path) + path, { headers, signal: ctl.signal }); }
    catch (er) { const e = new Error("network"); e.net = true; throw e; }
    finally { clearTimeout(tm); }
    let body = null;
    try { body = await r.json(); } catch { /* empty */ }
    if (!r.ok) {
      const d = body && body.detail && typeof body.detail === "object" ? body.detail : {};
      const e = new Error(d.message || (body && typeof body.detail === "string" ? body.detail : "HTTP " + r.status));
      e.status = r.status; e.code = d.error || null; e.detail = d; throw e;
    }
    return body;
  }
  async function call(path, auth = true) {
    try { return await call1(path, auth); }
    catch (e) {
      if (!e.net || !S.apiAlt) throw e;
      [S.api, S.apiAlt] = [S.apiAlt, S.api];          // same fallback as core.js: the other address, once
      return call1(path, auth);
    }
  }

  // ---------------------------------------------------------------- formatting
  const dur = (s) => (s == null ? "" : s < 90 ? t("sec", { n: Math.max(5, Math.round(s / 5) * 5) }) : t("min", { n: Math.round(s / 60) }));
  const when = (iso) => { try { return new Date(iso).toLocaleString(LOC, { weekday: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const day = (iso) => { try { return new Date(iso).toLocaleDateString(LOC, { day: "numeric", month: "short" }); } catch { return ""; } };
  const appBtn = () => '<a class="btn ski" href="' + esc(SS.appUrl()) + '"><span class="ms">smartphone</span>' + esc(t("inApp")) + "</a>";

  // ---------------------------------------------------------------- demos
  async function drawDemos() {
    const box = $("st-demos");
    box.innerHTML = '<div class="st-demo skel"></div><div class="st-demo skel"></div>';
    let list = [];
    try { list = ((await call("/v1/studio/demos", false)) || {}).demos || []; } catch { list = []; }
    if (!list.length) {      // API / tunnel down: the static covers published with the site (no video, just the pictures)
      let st0 = [];
      try { st0 = ((await (await fetch("studio/demos.json", { cache: "no-cache" })).json()) || {}).demos || []; } catch { st0 = []; }
      if (!st0.length) { box.innerHTML = '<p class="none st-empty">' + esc(t("noDemos")) + "</p>"; return; }
      box.innerHTML = st0.map((d) => '<figure class="st-demo"><div class="st-v"><img src="' + esc(d.cover_url) + '" alt="' + esc(d.title || "") + '" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>' +
        '<figcaption><span class="st-kind">' + esc(t(d.kind === "circuit" ? "circuit" : "flyover")) + "</span><b>" + esc(d.title || "") + "</b>" +
        (d.subtitle ? "<small>" + esc(d.subtitle) + "</small>" : "") + "</figcaption></figure>").join("");
      return;
    }
    box.innerHTML = list.map((d) => '<figure class="st-demo"><div class="st-v">' +
      '<video autoplay muted loop playsinline preload="metadata" poster="' + esc(abs(d.cover_url)) + '" src="' + esc(abs(d.url)) + '" aria-label="' + esc(d.title || "") + '"></video></div>' +
      '<figcaption><span class="st-kind">' + esc(t(d.kind === "circuit" ? "circuit" : "flyover")) + "</span><b>" + esc(d.title || "") + "</b>" +
      (d.subtitle ? "<small>" + esc(d.subtitle) + "</small>" : "") + "</figcaption></figure>").join("");
    // iOS / data-saver may refuse autoplay: start on view, pause off view
    const vids = box.querySelectorAll("video");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target; if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); }), { threshold: 0.25 });
      vids.forEach((v) => io.observe(v));
    }
  }

  // ---------------------------------------------------------------- status
  let meSeq = 0;
  async function loadMe() {
    const seq = ++meSeq;
    if (!S.user || !S.idToken) { st.me = null; st.meErr = null; drawStatus(); return; }
    try { const me = await call("/v1/studio/me"); if (seq !== meSeq) return; st.me = me; st.meErr = null; st.netFail = false; }
    catch (e) { if (seq !== meSeq) return; st.me = null; st.meErr = e; st.netFail = !!e.net; }
    (st.me && st.me.jobs || []).forEach((j) => { st.jobs.set(j.id, j); if (j.status === "queued" || j.status === "running") poll(j.id); });
    drawStatus(); drawJobs();
  }
  function canMake() {
    const m = st.me;
    return !!(m && m.signed_in && m.verified && (m.premium || m.pro_for_all));
  }
  function drawStatus() {
    const box = $("st-status");
    let h = "";
    if (!SS.Auth.enabled()) h = '<div class="card"><p>' + esc(t("soon")) + '</p><div class="st-acts">' + appBtn() + "</div></div>";
    else if (!S.user) h = '<div class="card"><p>' + esc(t("signInLead")) + '</p><div class="st-acts"><button class="btn ink" data-st-in>' + esc(t("signIn")) +
      '</button><button class="btn ghost" data-st-up>' + esc(t("createAcc")) + "</button></div></div>";
    else if (!st.me && !st.meErr) h = '<div class="card"><p class="none">' + esc(t("loading")) + "</p></div>";
    else if (st.meErr) h = '<div class="card"><p class="msg err">' + esc(st.netFail ? t("netFail") : st.meErr.message) + '</p><div class="st-acts"><button class="btn tonal" data-st-retry>' +
      esc(t("retry")) + "</button>" + (st.netFail ? appBtn() : "") + "</div></div>";
    else if (!st.me.verified) h = '<div class="card st-note"><span class="ms">mark_email_unread</span><div><p>' + esc(t("verify")) +
      '</p><div class="st-acts"><a class="btn tonal" href="account.html">' + esc(t("myAccount")) + '</a><button class="btn ghost" data-st-retry>' + esc(t("retry")) + "</button></div></div></div>";
    else if (!st.me.premium && !st.me.pro_for_all) h = '<div class="card st-upsell"><span class="pro"><span class="ms f">workspace_premium</span>PRO</span><h3>' + esc(t("proTitle")) +
      "</h3><p>" + esc(t("proText")) + '</p><div class="st-acts">' + (SS.webPro && SS.webPro() ? '<a class="btn ski" href="pricing.html">' + esc(t("seePlans")) + "</a>" : appBtn()) + "</div></div>";   // free website (FREEMIUM): Pro is in the app
    else {
      const q = st.me.quota;
      if (q && q.limit != null) h = '<p class="st-quota">' + (q.left > 0 ? esc(t("left", { n: q.left, m: q.limit })) : '<span class="warn">' + esc(t("noneLeft", { t: when(q.resets_at) })) + "</span>") + "</p>";
    }
    box.innerHTML = h;
    drawForm();
  }

  // ---------------------------------------------------------------- form
  let RES = null;
  async function resortRows() {
    if (!RES) RES = SS.resorts().then((j) => j.rows).catch(() => null);
    return RES;
  }
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  async function findResorts(q) {
    const rows = await resortRows();
    const n = norm(q);
    if (rows && rows.length) {
      return rows.filter((r) => norm(r.name).includes(n) || norm(r.short).includes(n))
        .sort((a, b) => (norm(a.name).startsWith(n) ? 0 : 1) - (norm(b.name).startsWith(n) ? 0 : 1) || (b.km || 0) - (a.km || 0)).slice(0, 8);
    }
    try {                                              // no site list (dev / first load): ask the API
      const j = await call("/v1/resorts?q=" + encodeURIComponent(q.slice(0, 64)) + "&limit=8", false);
      return (j.items || []).map((r) => ({ slug: r.slug, name: r.name, country: r.country, lat: r.lat, lon: r.lon, km: r.downhill_km }));
    } catch { return []; }
  }
  function drawForm() {
    const box = $("st-form");
    if (!canMake()) { box.innerHTML = ""; return; }
    const out = st.me.quota && st.me.quota.limit != null && st.me.quota.left <= 0;
    const p = st.place;
    const placeH = p ? '<div class="st-picked"><span class="ms">' + (p.slug ? "downhill_skiing" : "my_location") + "</span><span><b>" + esc(p.name) + "</b>" +
      (p.country ? "<small>" + esc(p.country) + "</small>" : "") + '</span><button type="button" class="linkbtn" data-st-change>' + esc(t("change")) + "</button></div>"
      : '<div class="st-find"><span class="ms">search</span><input id="st-q" type="search" autocomplete="off" placeholder="' + esc(t("search")) + '" aria-label="' + esc(t("search")) +
        '"><ul id="st-res" role="listbox" hidden></ul></div>' + (st.kind === "flyover" ? '<button type="button" class="btn ghost st-loc" data-st-loc><span class="ms">my_location</span>' + esc(t("myLoc")) + "</button>" : "");
    let runs = "";
    if (st.kind === "circuit" && p && p.slug) {
      if (st.pistesFor !== p.slug) runs = '<p class="none">' + esc(t("loading")) + "</p>";
      else if (!st.pistes || !st.pistes.length) runs = '<p class="none">' + esc(t("runsNone")) + "</p>";
      else {
        const f = norm(st.pfilter);
        const vis = st.pistes.filter((x) => !f || norm(x.name).includes(f) || st.chosen.includes(x.name));
        runs = '<p class="st-hint">' + esc(t("runsHint")) + "</p>" +
          (st.pistes.length > 10 ? '<div class="st-rfilter"><input id="st-pf" type="search" placeholder="' + esc(t("runsFilter")) + '" aria-label="' + esc(t("runsFilter")) + '" value="' + esc(st.pfilter) + '">' +
            (st.chosen.length ? '<button type="button" class="linkbtn" data-st-clear>' + esc(t("clear")) + "</button>" : "") + "</div>" : "") +
          '<div class="st-runs" role="group" aria-label="' + esc(t("runs")) + '">' + vis.map((x) => {
            const i = st.chosen.indexOf(x.name);
            return '<button type="button" class="st-run' + (i >= 0 ? " on" : "") + '" data-st-run="' + esc(x.name) + '" aria-pressed="' + (i >= 0) + '">' +
              '<span class="st-dot" style="background:' + esc(/^#[0-9a-f]{3,8}$/i.test(x.colour || "") ? x.colour : "var(--ink4)") + '"></span><span class="st-rn">' + esc(x.name) + "</span>" +
              (x.length_m ? "<small>" + esc(SS.U.dist(x.length_m / 1000)) + "</small>" : "") + (i >= 0 ? '<span class="st-n">' + (i + 1) + "</span>" : "") + "</button>";
          }).join("") + "</div>";
      }
      runs = '<div class="st-field"><span class="st-lbl">' + esc(t("runs")) + "</span>" + runs + "</div>";
    }
    const k = (v, ic) => '<button type="button" class="st-kindbtn" data-st-kind="' + v + '" aria-pressed="' + (st.kind === v) + '"><span class="ms">' + ic + "</span><span><b>" +
      esc(t(v)) + "</b><small>" + esc(t(v + "Hint")) + "</small></span></button>";
    const fm = st.formMsg;
    box.innerHTML = '<form class="card st-formcard" novalidate>' +
      '<div class="st-field"><span class="st-lbl">' + esc(t("kind")) + '</span><div class="st-kinds">' + k("flyover", "landscape") + k("circuit", "downhill_skiing") + "</div></div>" +
      '<div class="st-field"><span class="st-lbl">' + esc(t("place")) + "</span>" + placeH + "</div>" + runs +
      (fm ? '<div class="msg ' + (fm.ok ? "ok" : "err") + '">' + esc(fm.text) + (fm.app ? '<div class="st-acts">' + appBtn() + "</div>" : "") + "</div>" : "") +
      '<button class="btn ink big full" type="submit"' + (st.busy || out ? " disabled" : "") + '><span class="ms">movie</span>' + esc(st.busy ? t("sending") : t("go")) + "</button></form>";
    const q = $("st-q");
    if (q) wireSearch(q);
  }
  function wireSearch(inp) {
    const ul = $("st-res");
    let items = [], sel = -1, seq = 0;
    const draw = () => {
      ul.hidden = !items.length;
      ul.innerHTML = items.map((r, i) => '<li role="option" aria-selected="' + (i === sel) + '"><button type="button" data-st-pick="' + i + '"' + (i === sel ? ' class="on"' : "") + "><span>" +
        esc(r.short || r.name) + "</span><small>" + esc(r.country || "") + "</small></button></li>").join("");
    };
    const pick = (r) => { setPlace({ slug: r.slug, name: r.short || r.name, country: r.country, lat: r.lat, lon: r.lon }); };
    inp.addEventListener("input", async () => {
      const v = inp.value.trim(), my = ++seq;
      if (v.length < 2) { items = []; draw(); return; }
      const r = await findResorts(v);
      if (my !== seq) return;
      items = r; sel = -1; draw();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter") { e.preventDefault(); if (items.length) pick(items[Math.max(0, sel)]); }
      else if (e.key === "Escape") { items = []; draw(); }
    });
    ul.addEventListener("mousedown", (e) => e.preventDefault());       // keep focus so the click lands
    ul.addEventListener("click", (e) => { const b = e.target.closest("[data-st-pick]"); if (b) pick(items[+b.dataset.stPick]); });
  }
  function setPlace(p) {
    st.place = p; st.chosen = []; st.pfilter = ""; st.formMsg = null;
    if (p && p.slug && st.kind === "circuit") loadPistes(p.slug);
    drawForm();
  }
  async function loadPistes(slug) {
    if (st.pistesFor === slug) return;
    st.pistesFor = null; st.pistes = null;
    let ps = [];
    try { ps = ((await call("/v1/studio/resorts/" + encodeURIComponent(slug) + "/pistes", false)) || {}).pistes || []; } catch { ps = []; }
    if (!st.place || st.place.slug !== slug) return;
    st.pistes = ps; st.pistesFor = slug; drawForm();
  }
  async function submit() {
    const p = st.place;
    if (!p) { st.formMsg = { text: t(st.kind === "circuit" ? "needResort" : "needPlace") }; drawForm(); return; }
    if (st.kind === "circuit" && !p.slug) { st.formMsg = { text: t("needResort") }; drawForm(); return; }
    const u = new URLSearchParams({ kind: st.kind, lang: LANG });
    if (p.slug) u.set("slug", p.slug); else { u.set("lat", p.lat.toFixed(5)); u.set("lon", p.lon.toFixed(5)); }
    if (st.kind === "circuit" && st.chosen.length) u.set("pistes", st.chosen.join("|"));
    st.busy = true; st.formMsg = null; drawForm();
    try {
      const job = await call("/v1/studio/request?" + u.toString());
      st.jobs.set(job.id, job); st.active.unshift(job.id);
      SS.track && SS.track("studio_request", { kind: st.kind });
      poll(job.id);
      loadMe();
    } catch (e) {
      if (e.net) st.formMsg = { text: t("netFail"), app: true };
      else if (e.status === 401) { st.formMsg = { text: e.message }; SS.signInModal("in"); }
      else if (e.status === 402 && st.me) { st.me.premium = false; st.me.pro_for_all = false; }
      else if (e.status === 429 && e.detail && e.detail.resets_at) st.formMsg = { text: e.message + (e.code === "daily_limit" ? " " + when(e.detail.resets_at) : "") };
      else st.formMsg = { text: e.message || t("failed") };
      if (e.status === 402 || e.status === 403) { st.busy = false; return loadMe(); }
    }
    st.busy = false; drawForm(); drawJobs();
  }

  // ---------------------------------------------------------------- jobs
  const polling = new Set();
  async function poll(id) {
    if (polling.has(id)) return;
    polling.add(id);
    let fails = 0;
    while (true) {
      await new Promise((r) => setTimeout(r, 5000));
      if (!S.idToken) break;
      try { const j = await call("/v1/studio/jobs/" + encodeURIComponent(id)); st.jobs.set(id, j); fails = 0; }
      catch (e) { if (e.status === 404 || ++fails > 6) break; continue; }
      const j = st.jobs.get(id);
      drawJobs();
      if (j.status !== "queued" && j.status !== "running") { if (j.status === "done") loadMe(); break; }
    }
    polling.delete(id);
  }
  function jobCard(j, big) {
    const kind = esc(t(j.kind === "circuit" ? "circuit" : "flyover")), title = esc(j.title || "");
    const head = '<div class="st-jh"><span class="st-kind">' + kind + "</span><b>" + title + "</b><small>" + esc(day(j.created)) + "</small></div>";
    if (j.status === "queued" || j.status === "running") {
      const pr = Math.max(j.status === "queued" ? 0.02 : 0.05, Math.min(1, +j.progress || 0));
      const sub = j.status === "queued" ? (j.position ? t("pos", { n: j.position }) : "") : "";
      const eta = j.eta_s ? t("eta", { t: dur(j.eta_s) }) : "";
      return '<div class="card st-job">' + head + '<p class="st-state"><span class="st-spin" aria-hidden="true"></span>' + esc(t(j.status)) + (sub || eta ? " · " + esc([sub, eta].filter(Boolean).join(" · ")) : "") + "</p>" +
        '<div class="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pr * 100) + '"><i style="width:' + (pr * 100).toFixed(1) + '%"></i></div></div>';
    }
    if (j.status === "done" && j.url) {
      const video = big ? '<video class="st-out" controls playsinline preload="metadata" poster="' + esc(abs(j.cover_url)) + '" src="' + esc(abs(j.url)) + '"></video>' : "";
      return '<div class="card st-job' + (big ? " big" : " row") + '">' + (big ? "" : '<img class="st-thumb" alt="" loading="lazy" src="' + esc(abs(j.cover_url)) + '">') + '<div class="st-jb">' + head +
        (big ? '<p class="st-state ok"><span class="ms f">check_circle</span>' + esc(t("done")) + "</p>" : "") + video +
        '<div class="st-acts"><a class="btn ' + (big ? "ink" : "tonal") + '" href="' + esc(abs(j.url)) + '" download target="_blank" rel="noopener"><span class="ms">download</span>' + esc(t("download")) + "</a>" +
        (big ? "" : '<button type="button" class="btn ghost" data-st-watch="' + esc(j.id) + '"><span class="ms">play_arrow</span>' + esc(t("open")) + "</button>") + "</div>" +
        (big ? '<p class="st-hint">' + esc(t("mailNote")) + "</p>" : "") + "</div></div>";
    }
    if (j.status === "done") return '<div class="card st-job">' + head + '<p class="none">' + esc(t("expired")) + "</p></div>";
    return '<div class="card st-job">' + head + '<p class="msg err">' + esc(j.message || t("failed")) + "</p></div>";
  }
  function drawJobs() {
    const act = st.active.map((id) => st.jobs.get(id)).filter(Boolean);
    $("st-active").innerHTML = act.length ? '<div class="st-jobs">' + act.map((j) => jobCard(j, true)).join("") + "</div>" : "";
    const rest = [...st.jobs.values()].filter((j) => !st.active.includes(j.id)).sort((a, b) => String(b.created).localeCompare(String(a.created)));
    $("st-jobs-sec").hidden = !rest.length;
    $("st-jobs").innerHTML = rest.map((j) => jobCard(j, false)).join("");
  }

  // ---------------------------------------------------------------- events
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button,a");
    if (!b || !$("studio").contains(b)) return;
    if (b.matches("[data-st-in]")) SS.signInModal("in");
    else if (b.matches("[data-st-up]")) SS.signInModal("up");
    else if (b.matches("[data-st-retry]")) { st.me = null; st.meErr = null; drawStatus(); try { if (S.user && S.user.emailVerified === false) await SS.Auth.reload(); } catch { /* ignore */ } loadMe(); }
    else if (b.matches("[data-st-kind]")) {
      st.kind = b.dataset.stKind; st.formMsg = null;
      if (st.kind === "circuit" && st.place && !st.place.slug) st.place = null;
      if (st.kind === "circuit" && st.place && st.place.slug) loadPistes(st.place.slug);
      drawForm();
    }
    else if (b.matches("[data-st-change]")) { setPlace(null); const q = $("st-q"); if (q) q.focus(); }
    else if (b.matches("[data-st-loc]")) {
      if (!navigator.geolocation) { st.formMsg = { text: t("locFail") }; drawForm(); return; }
      b.disabled = true; b.lastChild.textContent = t("locating");
      navigator.geolocation.getCurrentPosition((pos) => setPlace({ name: t("here"), lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => { st.formMsg = { text: t("locFail") }; drawForm(); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    }
    else if (b.matches("[data-st-run]")) {
      const n = b.dataset.stRun, i = st.chosen.indexOf(n);
      if (i >= 0) st.chosen.splice(i, 1); else if (st.chosen.length < 12) st.chosen.push(n);
      drawForm();
    }
    else if (b.matches("[data-st-clear]")) { st.chosen = []; drawForm(); }
    else if (b.matches("[data-st-watch]")) {
      const id = b.dataset.stWatch;
      st.active = [id, ...st.active.filter((x) => x !== id)];
      drawJobs(); $("st-active").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  document.addEventListener("submit", (e) => { if (e.target.closest("#st-form")) { e.preventDefault(); if (!st.busy) submit(); } });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "st-pf") return;
    st.pfilter = e.target.value; const pos = e.target.selectionStart;
    drawForm(); const f = $("st-pf"); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch { /* ignore */ } }
  });

  // ---------------------------------------------------------------- start
  (async () => {
    document.title = t("title") + " · SnowScope";
    $("st-h1").textContent = t("title"); $("st-lede").textContent = t("lede");
    $("st-demos-h").textContent = t("demos"); $("st-make-h").textContent = t("make"); $("st-jobs-h").textContent = t("recent");
    drawStatus();
    await SS.start();
    drawDemos();
    const slug = (qs.get("slug") || "").trim().toLowerCase();
    if (slug && /^[a-z0-9_-]{1,80}$/.test(slug)) {
      const rows = await resortRows();
      const r = rows && rows.find((x) => x.slug === slug);
      st.place = r ? { slug, name: r.short || r.name, country: r.country, lat: r.lat, lon: r.lon } : { slug, name: slug.replace(/[-_]/g, " ") };
      if (st.kind === "circuit") loadPistes(slug);
    }
    let lastTok = null;
    SS.onChange(() => { if (S.idToken !== lastTok || !S.user) { lastTok = S.idToken; loadMe(); } else drawStatus(); });
    lastTok = S.idToken;
    loadMe();
  })();
})();
