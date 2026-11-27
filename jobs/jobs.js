/* SnowScope Ski jobs (docs/JOBS.md): 6-language UI words, search + filters on jobs/index.json, e-mail alerts.
   Language: ?lang= > remembered "ss_lang" > browser language > English (same rule as web/snowweb/i18n.js). */
(function () {
  "use strict";
  var LANGS = { en: "English", fr: "Français", de: "Deutsch", it: "Italiano", es: "Español", ar: "العربية" };
  var root = document.documentElement.getAttribute("data-root") || "/";
  function pickLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS[q]) { try { localStorage.setItem("ss_lang", q); } catch (e) { /* private */ } return q; }
    try { var s = localStorage.getItem("ss_lang"); if (s && LANGS[s]) return s; } catch (e) { /* private */ }
    var ls = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < ls.length; i++) { var k = String(ls[i]).slice(0, 2).toLowerCase(); if (LANGS[k]) return k; }
    return "en";
  }
  var lang = pickLang();
  var I = null, META = null, ROWS = null;
  function tr(group, key) { var g = I && I[group] && I[group][key]; return (g && (g[lang] || g.en)) || null; }
  function T(key) { return tr("t", key) || key; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function translate(el) {
    if (!I || lang === "en") return;
    (el || document).querySelectorAll("[data-t]").forEach(function (n) {
      var v = tr("t", n.getAttribute("data-t")); if (!v) return;
      if (n.children.length && n.lastChild && n.lastChild.nodeType === 3) n.lastChild.textContent = v; else if (!n.children.length) n.textContent = v;
    });
    (el || document).querySelectorAll("[data-tp]").forEach(function (n) { var v = tr("t", n.getAttribute("data-tp")); if (v) { n.placeholder = v; n.setAttribute("aria-label", v); } });
    (el || document).querySelectorAll("[data-c]").forEach(function (n) { if (n.tagName === "OPTION") return; var v = tr("cat", n.getAttribute("data-c")); if (v) n.textContent = v; });
    (el || document).querySelectorAll("[data-e]").forEach(function (n) { if (n.tagName === "OPTION") return; var v = tr("emp", n.getAttribute("data-e")); if (v) n.textContent = v; });
    (el || document).querySelectorAll("[data-l]").forEach(function (n) { var v = tr("lang", n.getAttribute("data-l")); if (v) n.textContent = v; });
    (el || document).querySelectorAll("[data-season]").forEach(function (n) { var v = n.getAttribute("data-season"), w = v.split(" ")[0], tw = tr("t", w); if (tw) n.textContent = v.replace(w, tw); });
    (el || document).querySelectorAll("[data-cc]").forEach(function (n) { var v = tr("country", n.getAttribute("data-cc")); if (v) n.textContent = v; });
  }
  function setLangAttrs() {
    document.documentElement.lang = lang;
    if (lang === "ar") {
      document.documentElement.dir = "rtl";
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400..700&display=swap"; document.head.appendChild(l);
    }
    document.querySelectorAll(".desc").forEach(function (d) { d.dir = "auto"; });
    // internal links keep the language
    if (lang !== "en") document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute("href"); if (!h || /^(https?:|mailto:|#)/.test(h) || h.indexOf("lang=") >= 0) return;
      a.setAttribute("href", h + (h.indexOf("?") >= 0 ? "&" : "?") + "lang=" + lang);
    });
  }
  function langMenu() {
    var b = document.querySelector(".langbtn"); if (!b) return;
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var m = document.querySelector(".langmenu"); if (m) { m.remove(); return; }
      m = document.createElement("div"); m.className = "langmenu"; m.setAttribute("role", "menu");
      m.innerHTML = Object.keys(LANGS).map(function (k) { return '<button lang="' + k + '" data-l2="' + k + '"' + (k === lang ? ' aria-current="true"' : "") + ">" + LANGS[k] + "</button>"; }).join("");
      document.body.appendChild(m);
      m.addEventListener("click", function (e) {
        var k = e.target.getAttribute("data-l2"); if (!k) return;
        try { localStorage.setItem("ss_lang", k); } catch (er) { /* private */ }
        var u = new URL(location.href); u.searchParams.set("lang", k); location.href = u.toString();
      });
      document.addEventListener("click", function () { m.remove(); }, { once: true });
    });
  }

  // ---------------------------------------------------------------------------------------------- the list
  var form = document.getElementById("filters"), list = document.getElementById("list"), more = document.getElementById("more");
  var PAGE = 40, shown = PAGE, matches = [];
  var F = ["q", "country", "area", "cat", "emp", "month", "speaks", "housing", "pass", "paid"];
  function val(n) { var el = form.elements[n]; return el ? (el.type === "checkbox" ? (el.checked ? "1" : "") : el.value) : ""; }
  function fill(sel, items, keep) {
    var cur = keep != null ? keep : sel.value;
    sel.innerHTML = '<option value="">' + esc(T("any")) + "</option>" + items.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + "</option>"; }).join("");
    sel.value = items.some(function (x) { return String(x[0]) === String(cur); }) ? cur : "";
  }
  function counts(idx) { var c = {}; ROWS.forEach(function (r) { var v = r[idx]; (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x !== "" && x !== 0 && x != null) c[x] = (c[x] || 0) + 1; }); }); return c; }
  function options() {
    var mo = (I.months[lang] || I.months.en);
    var cc = counts(4), cat = counts(6), emp = counts(7), mon = counts(9), lg = counts(10);
    fill(form.elements.country, Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; }).map(function (k) { return [k, (tr("country", k) || k) + " (" + cc[k] + ")"]; }));
    areas();
    fill(form.elements.cat, Object.keys(cat).sort(function (a, b) { return cat[b] - cat[a]; }).map(function (k) { return [k, (tr("cat", k) || k) + " (" + cat[k] + ")"]; }));
    fill(form.elements.emp, Object.keys(emp).map(function (k) { return [k, (tr("emp", k) || k) + " (" + emp[k] + ")"]; }));
    fill(form.elements.month, Object.keys(mon).sort(function (a, b) { return a - b; }).map(function (k) { return [k, mo[k - 1] + " (" + mon[k] + ")"]; }));
    fill(form.elements.speaks, Object.keys(lg).map(function (k) { return [k, (tr("lang", k) || k) + " (" + lg[k] + ")"]; }));
  }
  function areas() {
    var c = form.elements.country.value, n = {};
    ROWS.forEach(function (r) { if (!c || r[4] === c) n[r[3]] = (n[r[3]] || 0) + 1; });
    fill(form.elements.area, Object.keys(n).sort(function (a, b) { return (META.areas[a] || [a])[0].localeCompare((META.areas[b] || [b])[0]); })
      .map(function (k) { return [k, (META.areas[k] || [k])[0] + " (" + n[k] + ")"]; }));
  }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function apply() {
    var q = norm(val("q")).trim().split(/\s+/).filter(Boolean), s = {};
    F.forEach(function (k) { s[k] = val(k); });
    matches = ROWS.filter(function (r) {
      if (s.country && r[4] !== s.country) return false;
      if (s.area && r[3] !== s.area) return false;
      if (s.cat && r[6] !== s.cat) return false;
      if (s.emp && r[7].indexOf(s.emp) < 0) return false;
      if (s.month && String(r[9]) !== s.month) return false;
      if (s.speaks && r[10].indexOf(s.speaks) < 0) return false;
      if (s.housing && !(r[8] & 1)) return false;
      if (s.pass && !(r[8] & 2)) return false;
      if (s.paid && !(r[8] & 4)) return false;
      if (q.length) { var h = norm(r[1] + " " + r[2] + " " + r[5] + " " + (META.areas[r[3]] || [""])[0]); for (var i = 0; i < q.length; i++) if (h.indexOf(q[i]) < 0) return false; }
      return true;
    });
    shown = PAGE; draw();
    var u = new URL(location.href), pre = presets();
    F.forEach(function (k) { if (s[k] && s[k] !== pre[k]) u.searchParams.set(k, s[k]); else u.searchParams.delete(k); });
    history.replaceState(null, "", u.toString());
  }
  function card(r) {
    var a = META.areas[r[3]] || [r[3]], tags = ['<span class="tag">' + esc(tr("cat", r[6]) || r[6]) + "</span>"];
    r[7].slice(0, 2).forEach(function (e) { tags.push('<span class="tag">' + esc(tr("emp", e) || e) + "</span>"); });
    if (r[8] & 1) tags.push('<span class="tag good"><span class="ms">bed</span>' + esc(T("housing")) + "</span>");
    if (r[8] & 2) tags.push('<span class="tag good"><span class="ms">downhill_skiing</span>' + esc(T("pass")) + "</span>");
    if (r[11]) tags.push('<span class="tag pay">' + esc(r[11]) + "</span>");
    return '<a class="job" href="' + root + "jobs/j/" + r[0] + ".html" + (lang !== "en" ? "?lang=" + lang : "") + '"><span class="t">' + esc(r[1]) + '</span><span class="m">' +
      esc(a[0]) + " · " + esc(r[5]) + " · " + esc(r[2]) + '</span><span class="tags">' + tags.join("") + "</span></a>";
  }
  function draw() {
    list.innerHTML = matches.length ? matches.slice(0, shown).map(card).join("") : '<p class="empty">' + esc(T("none")) + "</p>";
    more.hidden = matches.length <= shown;
    document.getElementById("count").textContent = matches.length.toLocaleString(lang) + " " + T("results");
  }
  function presets() { var p = {}; form.querySelectorAll("select[data-preset]").forEach(function (s) { if (s.dataset.preset) p[s.name] = s.dataset.preset; }); return p; }
  function initList() {
    Promise.all([fetch(root + "jobs/index.json").then(function (r) { return r.ok ? r.json() : null; }), i18n()]).then(function (res) {
      var d = res[0]; if (!d) return;
      META = d.meta; ROWS = d.rows;
      options();
      var url = new URLSearchParams(location.search), pre = presets();
      F.forEach(function (k) {
        var v = url.get(k) || pre[k] || "", el = form.elements[k]; if (!el || !v) return;
        if (el.type === "checkbox") el.checked = v === "1"; else { if (k === "area") areas(); el.value = v; }
      });
      form.addEventListener("input", function (e) { if (e.target.name === "country") areas(); apply(); });
      form.addEventListener("change", function (e) { if (e.target.name === "country") areas(); apply(); });
      form.querySelector(".reset").addEventListener("click", function () {
        form.reset(); var pre2 = presets(); Object.keys(pre2).forEach(function (k) { form.elements[k].value = pre2[k]; }); areas(); apply();
      });
      more.addEventListener("click", function () { shown += PAGE * 2; draw(); });
      var tg = form.querySelector(".ftoggle");
      if (tg) tg.addEventListener("click", function () { var o = form.classList.toggle("open"); tg.setAttribute("aria-expanded", o ? "true" : "false"); });
      if (F.some(function (k) { return k !== "q" && val(k) && val(k) !== presets()[k]; })) form.classList.add("open");
      apply();
    }).catch(function () { /* the server-rendered list stays */ });
    var af = document.getElementById("alertform"), msg = document.getElementById("alertmsg");
    if (af) af.addEventListener("submit", function (e) {
      e.preventDefault();
      var api = (META && META.api) || "https://api.snowscope.app";
      var body = { email: af.elements.email.value, lang: lang, country: val("country"), area: val("area"), cat: val("cat"),
        housing: !!val("housing"), tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || "") };
      af.querySelector("button").disabled = true;
      fetch(api + "/v1/jobs/alerts/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function () { msg.textContent = T("alert_sent"); af.reset(); })
        .catch(function () { msg.textContent = T("alert_err"); })
        .then(function () { af.querySelector("button").disabled = false; });
    });
  }

  function i18n() {
    return fetch(root + "jobs/i18n.json").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) { I = d; translate(); } return d; }).catch(function () { return null; /* English stays */ });
  }
  setLangAttrs(); langMenu();
  if (form && list) initList();
  else i18n();
})();
