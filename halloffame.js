/* Hall of Fame page (web/snowweb/halloffame.html, docs/HALL_OF_FAME.md): season ranking from GET /v1/halloffame,
   "I went! Prove it" upload = POST /v1/obs/web_upload with trip_proof=1 (same queue as the snow measurements,
   10 / day / IP), share card per entry through share.js (SSShare). English strings, translated by i18n.js. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var state = { file: null, exif: null, resorts: null, pick: null, hall: null };
  function T(s) { try { return window.I18N && I18N.t ? I18N.t(s) : s; } catch (e) { return s; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function apiBase() {
    try { var b = window.SS && SS.base && SS.base("/v1/halloffame"); if (b) return String(b).replace(/\/$/, ""); } catch (e) { /* core not ready */ }
    return "https://api.snowscope.app";
  }
  function root() { return (window.SS && SS.ROOT) || ""; }
  function hit(p) { try { if (window.SS && SS.hit) SS.hit(p, "hall"); } catch (e) { /* counter only */ } }
  function units() { try { return window.SS && SS.U && SS.U.mode ? SS.U.mode() : "metric"; } catch (e) { return "metric"; } }
  function fmtSnow(cm) { return units() === "us" ? Math.round(cm / 2.54) + "″" : Math.round(cm) + " cm"; }

  // ---------------------------------------------------------------- ranking
  function row(e) {
    var li = document.createElement("li");
    li.className = e.rank <= 3 ? "top" + e.rank : "";
    var thumb = e.thumb ? apiBase() + e.thumb : "";
    li.innerHTML = '<div class="rk px">' + (e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : "#" + e.rank) + "</div>" +
      (thumb ? '<img class="th" src="' + esc(thumb) + '" alt="" width="72" height="72" loading="lazy" decoding="async">' : '<div class="th"></div>') +
      '<div class="who"><b class="px">' + esc(e.handle || T("anonymous skier")) + '</b><div class="rs"><span class="flag"></span><span>' + esc(e.resort || "") + (e.country ? ", " + esc(e.country) : "") + "</span></div>" +
      '<div class="meta">' + (e.cm != null ? esc(fmtSnow(e.cm)) + " · " : "") + esc(e.date || "") + (e.verified ? ' · <span class="ok">' + esc(T("verified at the resort")) + "</span>" : "") + "</div></div>" +
      '<div class="sc"><b class="px">' + e.score + " pts</b><small>" + (e.cm != null ? e.cm + " + " : "") + "50" + (e.handle ? " + 20" : "") + '</small><button type="button" class="px" data-share>' + esc(T("Share")) + "</button></div>";
    try { if (window.SSShare && SSShare.flagCanvas) li.querySelector(".flag").appendChild(SSShare.flagCanvas(e.country, 22, 15)); } catch (x) { /* no flag */ }
    li.querySelector("[data-share]").addEventListener("click", function () {
      var slot = li.querySelector(".shareslot");
      if (slot) { slot.remove(); return; }
      slot = document.createElement("div"); slot.className = "shareslot"; li.appendChild(slot);
      hit("/hall/share");
      SSShare.mount(slot, { kind: "hall", handle: e.handle, resort: { label: e.resort, slug: e.resort_slug, country: e.country, units: units() }, cm: e.cm, rank: e.rank, score: e.score, date: e.date });
    });
    return li;
  }
  function renderHall(j) {
    var ol = $("board"); ol.innerHTML = "";
    if (j && j.season) $("seasonTitle").textContent = T("SEASON RANKING") + " " + j.season;
    var items = (j && j.items) || [];
    if (!items.length) {
      ol.innerHTML = '<li class="empty"><b class="px">' + esc(T("Nobody yet. Be the first!")) + "</b>" + esc(T("Play the Ski Grand Prix, book, go, and send your photo from the resort.")) + "</li>";
      return;
    }
    items.forEach(function (e) { ol.appendChild(row(e)); });
  }
  function loadHall() {
    fetch(apiBase() + "/v1/halloffame", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { state.hall = j; renderHall(j); })
      .catch(function () { $("board").innerHTML = '<li class="empty">' + esc(T("The ranking is taking a nap. Please try again in a minute.")) + "</li>"; });
  }

  // ---------------------------------------------------------------- resorts search (site resorts.json: slug, name, short, country, lat, lon)
  function loadResorts() {
    if (state.resorts) return Promise.resolve(state.resorts);
    return fetch(root() + "snow/resorts.json").then(function (r) { return r.json(); }).then(function (j) {
      var f = j.fields, iS = f.indexOf("slug"), iN = f.indexOf("name"), iH = f.indexOf("short"), iC = f.indexOf("country"), iLa = f.indexOf("lat"), iLo = f.indexOf("lon");
      state.resorts = j.rows.map(function (r) { return { slug: r[iS], name: r[iH] || r[iN], full: r[iN], country: r[iC], lat: r[iLa], lon: r[iLo], k: (r[iN] + " " + (r[iH] || "") + " " + r[iC]).toLowerCase() }; });
      return state.resorts;
    });
  }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function searchResorts(q) {
    q = norm(q).trim(); if (q.length < 2) return [];
    var words = q.split(/\s+/), out = [];
    for (var i = 0; i < state.resorts.length && out.length < 8; i++) {
      var r = state.resorts[i], k = norm(r.k), ok = true;
      for (var w = 0; w < words.length; w++) if (k.indexOf(words[w]) < 0) { ok = false; break; }
      if (ok) out.push(r);
    }
    out.sort(function (a, b) { var sa = norm(a.name).indexOf(q) === 0 ? 0 : 1, sb = norm(b.name).indexOf(q) === 0 ? 0 : 1; return sa - sb || a.name.localeCompare(b.name); });
    return out;
  }
  function showList(items) {
    var ul = $("resortList"); ul.innerHTML = "";
    if (!items.length) { ul.hidden = true; return; }
    items.forEach(function (r) {
      var li = document.createElement("li"); li.setAttribute("role", "option"); li.dataset.slug = r.slug;
      li.innerHTML = esc(r.name) + "<small>" + esc(r.country || "") + "</small>";
      li.addEventListener("mousedown", function (ev) { ev.preventDefault(); pick(r); });
      ul.appendChild(li);
    });
    ul.hidden = false;
  }
  function pick(r) { state.pick = r; $("resort_slug").value = r.slug; $("resortQ").value = r.name + (r.country ? ", " + r.country : ""); $("resortList").hidden = true; checkDistance(); }
  $("resortQ").addEventListener("focus", function () { loadResorts().catch(function () { }); });
  $("resortQ").addEventListener("input", function () {
    var q = this.value; state.pick = null; $("resort_slug").value = "";
    loadResorts().then(function () { showList(searchResorts(q)); }).catch(function () { });
  });
  $("resortQ").addEventListener("keydown", function (ev) {
    var ul = $("resortList"), cur = ul.querySelector("[aria-selected=true]"), items = Array.prototype.slice.call(ul.children);
    if (ul.hidden || !items.length) return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); var i = cur ? items.indexOf(cur) : -1; i = (i + (ev.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items.forEach(function (li) { li.removeAttribute("aria-selected"); }); items[i].setAttribute("aria-selected", "true"); }
    if (ev.key === "Enter") { ev.preventDefault(); var li = cur || items[0]; pick(state.resorts.filter(function (r) { return r.slug === li.dataset.slug; })[0]); }
    if (ev.key === "Escape") ul.hidden = true;
  });
  document.addEventListener("click", function (ev) { if (!ev.target.closest(".pick")) $("resortList").hidden = true; });

  // ---------------------------------------------------------------- EXIF: GPS + date from the JPEG (same reader as measure.html)
  function readExif(buf) {
    var d = new DataView(buf), n = d.byteLength, out = { lat: null, lon: null, taken: null };
    if (n < 4 || d.getUint16(0) !== 0xFFD8) return out;
    var p = 2;
    while (p + 4 <= n) {
      var marker = d.getUint16(p); p += 2;
      if (marker === 0xFFDA || marker === 0xFFD9) break;
      if ((marker & 0xFF00) !== 0xFF00) break;
      var len = d.getUint16(p);
      if (marker === 0xFFE1 && p + 10 <= n && d.getUint32(p + 2) === 0x45786966) { parseTiff(d, p + 8, Math.min(n, p + len), out); break; }
      p += len;
    }
    return out;
  }
  function parseTiff(d, t, end, out) {
    if (t + 8 > end) return;
    var le = d.getUint16(t) === 0x4949;
    var u16 = function (o) { return d.getUint16(o, le); }, u32 = function (o) { return d.getUint32(o, le); };
    if (u16(t + 2) !== 42) return;
    var ifd0 = t + u32(t + 4), gpsOff = null, exifOff = null;
    function walk(ifd, fn) { if (ifd + 2 > end) return; var cnt = u16(ifd); for (var i = 0; i < cnt; i++) { var e = ifd + 2 + i * 12; if (e + 12 > end) return; fn(u16(e), u16(e + 2), u32(e + 4), e + 8); } }
    function val(type, cnt, at) {
      var size = type === 2 ? 1 : type === 5 ? 8 : 4, o = size * cnt > 4 ? t + u32(at) : at;
      if (o + size * cnt > end) return null;
      if (type === 2) { var s = ""; for (var i = 0; i < cnt; i++) { var c = d.getUint8(o + i); if (!c) break; s += String.fromCharCode(c); } return s; }
      if (type === 5) { var r = []; for (var j = 0; j < cnt; j++) { var den = u32(o + j * 8 + 4); r.push(den ? u32(o + j * 8) / den : 0); } return r; }
      return null;
    }
    walk(ifd0, function (tag, type, cnt, at) { if (tag === 0x8825) gpsOff = t + u32(at); if (tag === 0x8769) exifOff = t + u32(at); });
    if (exifOff) walk(exifOff, function (tag, type, cnt, at) { if (tag === 0x9003) out.taken = val(type, cnt, at); });
    if (gpsOff) {
      var g = {};
      walk(gpsOff, function (tag, type, cnt, at) { if (tag >= 1 && tag <= 4) g[tag] = val(type, cnt, at); });
      var dms = function (a) { return a && a.length === 3 ? a[0] + a[1] / 60 + a[2] / 3600 : null; };
      var lat = dms(g[2]), lon = dms(g[4]);
      if (lat != null && lon != null && (lat || lon)) {
        if (String(g[1] || "N").charAt(0) === "S") lat = -lat;
        if (String(g[3] || "E").charAt(0) === "W") lon = -lon;
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { out.lat = lat; out.lon = lon; }
      }
    }
  }
  function km(a, b, c, d) { var R = 6371, p1 = a * Math.PI / 180, p2 = c * Math.PI / 180, x = Math.sin((p2 - p1) / 2), y = Math.sin((d - b) * Math.PI / 360); return 2 * R * Math.asin(Math.sqrt(x * x + Math.cos(p1) * Math.cos(p2) * y * y)); }
  function showLoc(kind, text) { var el = $("loc"); el.hidden = false; el.className = "loc " + kind; $("locText").textContent = text; el.querySelector(".ms").textContent = kind === "ok" ? "location_on" : "location_off"; }
  function checkDistance() {
    var ex = state.exif, r = state.pick;
    if (!ex || ex.lat == null) { if (state.file) showLoc("warn", T("No location in this photo: it will be checked by hand.")); return; }
    if (!r) { showLoc("ok", T("Location found in the photo.")); return; }
    var d = km(ex.lat, ex.lon, r.lat, r.lon);
    if (d <= 15) showLoc("ok", T("Location found: at the resort.")); else showLoc("warn", T("The photo was taken far from this resort: it will be checked by hand."));
  }
  $("photo").addEventListener("change", function () {
    var f = this.files && this.files[0]; state.file = f || null; state.exif = null; $("err").hidden = true;
    if (!f) return;
    if (/\.hei[cf]$/i.test(f.name) || /hei[cf]/i.test(f.type)) showErr(T("This photo is in HEIC format. Please choose a JPEG (on iPhone: Settings > Camera > Formats > Most Compatible)."));
    var img = $("preview"); img.src = URL.createObjectURL(f); img.hidden = false;
    $("dropIcon").hidden = true; $("dropText").innerHTML = "<b>" + esc(T("Photo chosen")) + "</b> · " + esc(T("tap to change"));
    var r = new FileReader();
    r.onload = function () { try { state.exif = readExif(r.result); } catch (e) { state.exif = null; } checkDistance(); };
    r.readAsArrayBuffer(f.slice(0, 256 * 1024));
  });
  function showErr(t) { var e = $("err"); e.textContent = t; e.hidden = false; e.scrollIntoView({ behavior: "smooth", block: "nearest" }); }

  // ---------------------------------------------------------------- send
  $("f").addEventListener("submit", function (ev) {
    ev.preventDefault(); $("err").hidden = true;
    var f = state.file, r = state.pick;
    if (!f) return showErr(T("Please add the photo first."));
    if (/\.hei[cf]$/i.test(f.name) || /hei[cf]/i.test(f.type)) return showErr(T("Please choose a JPEG photo (HEIC cannot be read here)."));
    if (f.size > 12 * 1024 * 1024) return showErr(T("The photo is too big (over 12 MB). Please send a smaller copy."));
    if (!r) return showErr(T("Please pick the ski resort from the list."));
    var handle = $("handle").value.trim();
    if (handle && !/^@?[A-Za-z0-9._]{2,30}$/.test(handle)) return showErr(T("The handle should look like @name (letters, numbers, dots)."));
    if (!$("consent").checked) return showErr(T("Please tick the box so we can show your trip."));
    var fd = new FormData();
    fd.append("image", f, f.name || "trip.jpg");
    fd.append("trip_proof", "1"); fd.append("resort_slug", r.slug);
    if (handle) fd.append("handle", handle);
    if ($("depth_cm").value) fd.append("depth_cm", $("depth_cm").value);
    var ex = state.exif;
    if (ex && ex.lat != null) { fd.append("lat", String(ex.lat)); fd.append("lon", String(ex.lon)); if (ex.taken) fd.append("taken_at", ex.taken); }
    else { fd.append("lat", String(r.lat)); fd.append("lon", String(r.lon)); }      // no EXIF: the resort itself (flagged for review on the server)
    try { var app = new URLSearchParams(location.search).get("install"); if (app && /^[A-Za-z0-9_.:-]{8,64}$/.test(app)) fd.append("install_id", app); } catch (e) { /* no reward link */ }
    fd.append("consent", "true"); fd.append("lang", (document.documentElement.lang || "en").slice(0, 8));
    $("send").disabled = true; $("busy").hidden = false;
    fetch(apiBase() + "/v1/obs/web_upload", { method: "POST", body: fd })
      .then(function (x) { return x.json().catch(function () { return {}; }).then(function (j) { return { s: x.status, j: j }; }); })
      .then(function (x) {
        $("send").disabled = false; $("busy").hidden = true;
        if (x.s === 200 && x.j && x.j.ok) {
          $("f").hidden = true; $("done").hidden = false; $("done").scrollIntoView({ behavior: "smooth", block: "start" });
          hit("/hall/sent");
          var cm = $("depth_cm").value ? Number($("depth_cm").value) : null;
          $("doneShare").innerHTML = "";
          SSShare.mount($("doneShare"), { kind: "hall", handle: handle ? "@" + handle.replace(/^@/, "") : "", resort: { label: r.name, slug: r.slug, country: r.country, units: units() }, cm: cm, score: x.j.score_if_approved });
          return;
        }
        if (x.s === 429) return showErr(T("That is enough for today, thank you! Come back tomorrow."));
        showErr((x.j && x.j.message) || T("Sorry, the photo did not go through. Please try again in a minute."));
      })
      .catch(function () { $("send").disabled = false; $("busy").hidden = true; showErr(T("No connection right now. Please try again in a minute.")); });
  });
  $("again").addEventListener("click", function () {
    $("done").hidden = true; $("f").hidden = false; $("f").reset(); state.file = null; state.exif = null; state.pick = null;
    $("preview").hidden = true; $("dropIcon").hidden = false; $("dropText").innerHTML = "<b>" + esc(T("Take or choose the photo")) + "</b><br>" + esc(T("A JPEG from your camera, taken at the resort, with location on"));
    $("loc").hidden = true; $("resort_slug").value = "";
    $("prove").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------------------------------------------------------------- go
  loadHall();
  try { if (new URLSearchParams(location.search).get("ref")) hit("/hall/ref"); } catch (e) { /* ignore */ }
  if (window.SS && SS.start) SS.start().catch(function () { /* the page works without config */ });
})();
