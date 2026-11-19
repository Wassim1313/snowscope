/* SnowScope share module (owner 2026-11-20, docs/HALL_OF_FAME.md): the Ski Grand Prix result card + Hall of Fame card.
   Self-contained: a 1080x1920 pixel-style card drawn on <canvas>, an own tiny QR encoder (byte mode, level M, no
   third-party script), a ~6 s animated clip recorded with MediaRecorder (MP4 where the browser records MP4, else WebM,
   else the PNG only), Web Share with files, download + caption. Strings are English and go through I18N.t().

   HOOK (called by planner.html / christmas.html at the end of the game):
     SSShare.resultCard({region: "ALPS", resort: {slug, label, country, week_total, currency, left, snow_p50_cm, units},
                         player: {code}})            -> Promise<{blob, dataUrl, caption, link, canvas}> (the PNG card)
     SSShare.mount(container[, data])                 -> renders the preview + Share / Download / Copy caption buttons
                                                        into `container` (data = the same object; default: the last
                                                        resultCard() call). Returns the panel element.
     SSShare.hallLink()                               -> URL of the Hall of Fame page (string)
     SSShare.playerCode()                             -> the 6-character player code (localStorage "ss_player")
     SSShare.hallCard({handle, resort, country, cm, rank, score, date}) + mount(container, {kind:"hall", ...}) do the
     same for a Hall of Fame entry ("I'm on the SnowScope Hall of Fame").
   Fields: week_total / left are numbers in `currency` ("€", "$", "CHF"...; left < 0 = "need +X"), snow_p50_cm a number
   (cm), units "metric" | "us" (inches on the card), label the resort name shown, country the English country name.
   Beacons (core.js SS.hit, first-party counter): /share/open, /share/file, /share/download, src "share". */
(function () {
  "use strict";
  var W = 1080, H = 1920, SITE = "https://snowscope.app/";
  var NAVY = "#0B1E4A", NAVY2 = "#13295E", GOLD = "#FFD23F", RED = "#D63A3F", GREEN = "#1E9E5A", SNOW = "#F4F8FF";
  var FONT = '"Press Start 2P", ui-monospace, Menlo, monospace';
  var last = null;

  function T(s) { try { return window.I18N && I18N.t ? I18N.t(s) : s; } catch (e) { return s; } }
  function hit(path) { try { if (window.SS && SS.hit) SS.hit(path, "share"); } catch (e) { /* counter only */ } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ------------------------------------------------------------------ player code (6 chars, no vowels / lookalikes)
  function playerCode() {
    var k = "ss_player", v = null;
    try { v = localStorage.getItem(k); } catch (e) { /* private mode */ }
    if (v && /^[A-Z0-9]{6}$/.test(v)) return v;
    var al = "BCDFGHJKMNPQRSTVWXYZ23456789", a = new Uint8Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (var i = 0; i < 6; i++) a[i] = Math.random() * 256;
    v = ""; for (var j = 0; j < 6; j++) v += al[a[j] % al.length];
    try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
    return v;
  }
  function hallLink() {
    var root = (window.SS && SS.ROOT) || "";
    return root + "halloffame.html";
  }

  // ------------------------------------------------------------------ QR encoder (byte mode, ECC level M, versions 1-40)
  // Port of the public-domain-style qrcodegen algorithm (Nayuki, MIT) reduced to what a URL needs.
  var QR = (function () {
    var EC_CW = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
    var EC_BLK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
    function rawModules(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; } return r; }
    function dataCW(v) { return Math.floor(rawModules(v) / 8) - EC_CW[v] * EC_BLK[v]; }
    function gfMul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
    function rsDivisor(deg) { var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1); var root = 1; for (var k = 0; k < deg; k++) { for (var j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); } return r; }
    function rsRemainder(data, div) { var res = div.map(function () { return 0; }); data.forEach(function (b) { var f = b ^ res.shift(); res.push(0); div.forEach(function (c, i) { res[i] ^= gfMul(c, f); }); }); return res; }
    function bit(x, i) { return ((x >>> i) & 1) !== 0; }
    function utf8(s) {
      if (window.TextEncoder) return Array.prototype.slice.call(new TextEncoder().encode(s));
      var out = [], e = encodeURIComponent(s); for (var i = 0; i < e.length; i++) { if (e[i] === "%") { out.push(parseInt(e.substr(i + 1, 2), 16)); i += 2; } else out.push(e.charCodeAt(i)); } return out;
    }
    function encode(text) {
      var bytes = utf8(text), v;
      for (v = 1; v <= 40; v++) { if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCW(v) * 8) break; }
      if (v > 40) throw new Error("QR: too long");
      var bb = [];
      function put(val, n) { for (var i = n - 1; i >= 0; i--) bb.push((val >>> i) & 1); }
      put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
      var cap = dataCW(v) * 8;
      put(0, Math.min(4, cap - bb.length)); put(0, (8 - bb.length % 8) % 8);
      for (var pad = 0xEC; bb.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
      var data = []; for (var i = 0; i < bb.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = (x << 1) | bb[i + j]; data.push(x); }
      // ---- modules
      var size = v * 4 + 17, mod = [], fun = [];
      for (var y = 0; y < size; y++) { mod.push(new Array(size).fill(false)); fun.push(new Array(size).fill(false)); }
      function setF(x, y, d) { mod[y][x] = d; fun[y][x] = true; }
      function finder(x, y) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < size && yy < size) setF(xx, yy, d !== 2 && d !== 4); } }
      function align(x, y) { for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
      function formatBits(mask) {
        var d = (0 << 3) | mask, rem = d;                      // level M = 0b00
        for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        var bits = ((d << 10) | rem) ^ 0x5412;
        for (var a = 0; a <= 5; a++) setF(8, a, bit(bits, a));
        setF(8, 7, bit(bits, 6)); setF(8, 8, bit(bits, 7)); setF(7, 8, bit(bits, 8));
        for (var b = 9; b < 15; b++) setF(14 - b, 8, bit(bits, b));
        for (var c = 0; c < 8; c++) setF(size - 1 - c, 8, bit(bits, c));
        for (var e = 8; e < 15; e++) setF(8, size - 15 + e, bit(bits, e));
        setF(8, size - 8, true);
      }
      function version() {
        if (v < 7) return;
        var rem = v; for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        var bits = (v << 12) | rem;
        for (var k = 0; k < 18; k++) { var b = bit(bits, k), a = size - 11 + k % 3, c = Math.floor(k / 3); setF(a, c, b); setF(c, a, b); }
      }
      for (var t = 0; t < size; t++) { setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
      finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
      var pos = [];
      if (v > 1) { var na = Math.floor(v / 7) + 2, step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2; pos = [6]; for (var p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p); }
      for (var i2 = 0; i2 < pos.length; i2++) for (var j2 = 0; j2 < pos.length; j2++) { if (!((i2 === 0 && j2 === 0) || (i2 === 0 && j2 === pos.length - 1) || (i2 === pos.length - 1 && j2 === 0))) align(pos[i2], pos[j2]); }
      formatBits(0); version();
      // ---- ECC + interleave
      var nb = EC_BLK[v], el = EC_CW[v], raw = Math.floor(rawModules(v) / 8), nshort = nb - raw % nb, slen = Math.floor(raw / nb), blocks = [], div = rsDivisor(el);
      for (var bi = 0, k0 = 0; bi < nb; bi++) { var dat = data.slice(k0, k0 + slen - el + (bi < nshort ? 0 : 1)); k0 += dat.length; var ecc = rsRemainder(dat, div); if (bi < nshort) dat.push(0); blocks.push(dat.concat(ecc)); }
      var all = [];
      for (var ii = 0; ii < blocks[0].length; ii++) blocks.forEach(function (blk, jj) { if (ii !== slen - el || jj >= nshort) all.push(blk[ii]); });
      // ---- place data
      var idx = 0;
      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) for (var jx = 0; jx < 2; jx++) {
          var px = right - jx, up = ((right + 1) & 2) === 0, py = up ? size - 1 - vert : vert;
          if (!fun[py][px] && idx < all.length * 8) { mod[py][px] = bit(all[idx >>> 3], 7 - (idx & 7)); idx++; }
        }
      }
      function applyMask(m) {
        for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
          var inv;
          switch (m) { case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break; case 3: inv = (x + y) % 3 === 0; break;
            case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; case 5: inv = x * y % 2 + x * y % 3 === 0; break;
            case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break; default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0; }
          if (!fun[y][x] && inv) mod[y][x] = !mod[y][x];
        }
      }
      function addHist(len, h) { if (h[0] === 0) len += size; h.pop(); h.unshift(len); }
      function countPat(h) { var n = h[1], core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n; return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0) + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0); }
      function termCount(col, len, h) { if (col) { addHist(len, h); len = 0; } len += size; addHist(len, h); return countPat(h); }
      function penalty() {
        var r = 0, y, x, c, run, h;
        for (y = 0; y < size; y++) { c = false; run = 0; h = [0, 0, 0, 0, 0, 0, 0]; for (x = 0; x < size; x++) { if (mod[y][x] === c) { run++; if (run === 5) r += 3; else if (run > 5) r++; } else { addHist(run, h); if (!c) r += countPat(h) * 40; c = mod[y][x]; run = 1; } } r += termCount(c, run, h) * 40; }
        for (x = 0; x < size; x++) { c = false; run = 0; h = [0, 0, 0, 0, 0, 0, 0]; for (y = 0; y < size; y++) { if (mod[y][x] === c) { run++; if (run === 5) r += 3; else if (run > 5) r++; } else { addHist(run, h); if (!c) r += countPat(h) * 40; c = mod[y][x]; run = 1; } } r += termCount(c, run, h) * 40; }
        for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var cc = mod[y][x]; if (cc === mod[y][x + 1] && cc === mod[y + 1][x] && cc === mod[y + 1][x + 1]) r += 3; }
        var dark = 0; for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mod[y][x]) dark++;
        var tot = size * size, k = Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1; return r + k * 10;
      }
      var best = 0, bestPen = Infinity;
      for (var m = 0; m < 8; m++) { applyMask(m); formatBits(m); var pen = penalty(); if (pen < bestPen) { bestPen = pen; best = m; } applyMask(m); }
      applyMask(best); formatBits(best);
      return { size: size, version: v, mask: best, get: function (x, y) { return mod[y][x]; }, rows: mod };
    }
    return { encode: encode };
  })();

  // ------------------------------------------------------------------ pixel art: skier (christmas.html sprite), flags
  var PAL = { a: RED, b: "#FFFFFF", c: "#F2C9A0", d: "#14233F", e: "#8A5A2B", f: "#1E63D6", g: "#24324F", h: GOLD };
  var SK_BODY = ["................", "......a.........", ".....aaa........", "....aaaaa.......", "....bbbbb.......", "....cccdc.......", "....ccccc.......", "..eefffff.......", "..eefffffc......", "..eefffff.......", "...efffff.......", "....ggggg.......", "................", "................", "................", "................"];
  var SK_A = ["...gg...gg......", "..gg.....gg.....", "hhhhhhhhhhhhh...", "................"];      // legs frame A (rows 12-15)
  var SK_B = ["....gg.gg.......", "....gg.gg.......", ".hhhhhhhhhhhhh..", "................"];      // legs frame B
  function skier(cx, x, y, s, frame, jacket) {
    var rows = SK_BODY.slice(0, 12).concat(frame ? SK_B : SK_A);
    for (var r = 0; r < 16; r++) for (var c = 0; c < 16; c++) {
      var k = rows[r][c]; if (k === ".") continue;
      cx.fillStyle = (k === "f" && jacket) ? jacket : PAL[k];
      cx.fillRect(x + c * s, y + r * s, s, s);
    }
  }
  // country -> [ISO2, flag spec]; spec: ["v"|"h", colours...] stripes, ["nordic", bg, cross], ["ch"], ["ca"], ["us"], ["ma"], ["jp"], ["tr"]
  var FLAGS = { "France": ["FR", ["v", "#0055A4", "#FFFFFF", "#EF4135"]], "Italy": ["IT", ["v", "#009246", "#FFFFFF", "#CE2B37"]],
    "Germany": ["DE", ["h", "#000000", "#DD0000", "#FFCE00"]], "Austria": ["AT", ["h", "#ED2939", "#FFFFFF", "#ED2939"]],
    "Switzerland": ["CH", ["ch"]], "Spain": ["ES", ["h", "#AA151B", "#F1BF00", "#F1BF00", "#AA151B"]], "Andorra": ["AD", ["v", "#10069F", "#FEDD00", "#D50032"]],
    "Norway": ["NO", ["nordic", "#BA0C2F", "#FFFFFF", "#00205B"]], "Sweden": ["SE", ["nordic", "#006AA7", "#FECC02"]], "Finland": ["FI", ["nordic", "#FFFFFF", "#002F6C"]],
    "Iceland": ["IS", ["nordic", "#02529C", "#FFFFFF", "#DC1E35"]], "Denmark": ["DK", ["nordic", "#C60C30", "#FFFFFF"]],
    "United States": ["US", ["us"]], "USA": ["US", ["us"]], "Canada": ["CA", ["ca"]], "Morocco": ["MA", ["ma"]], "Japan": ["JP", ["jp"]],
    "Slovenia": ["SI", ["h", "#FFFFFF", "#0000FF", "#FF0000"]], "Slovakia": ["SK", ["h", "#FFFFFF", "#0B4EA2", "#EE1C25"]],
    "Czechia": ["CZ", ["h", "#FFFFFF", "#D7141A"]], "Czech Republic": ["CZ", ["h", "#FFFFFF", "#D7141A"]], "Poland": ["PL", ["h", "#FFFFFF", "#DC143C"]],
    "Bulgaria": ["BG", ["h", "#FFFFFF", "#00966E", "#D62612"]], "Romania": ["RO", ["v", "#002B7F", "#FCD116", "#CE1126"]],
    "Greece": ["GR", ["h", "#0D5EAF", "#FFFFFF", "#0D5EAF", "#FFFFFF", "#0D5EAF"]], "Türkiye": ["TR", ["tr"]], "Turkey": ["TR", ["tr"]],
    "Liechtenstein": ["LI", ["h", "#002B7F", "#CE1126"]], "Australia": ["AU", ["h", "#00008B", "#00008B"]], "New Zealand": ["NZ", ["h", "#00247D", "#00247D"]],
    "Chile": ["CL", ["h", "#FFFFFF", "#D52B1E"]], "Argentina": ["AR", ["h", "#74ACDF", "#FFFFFF", "#74ACDF"]], "Georgia": ["GE", ["nordic", "#FFFFFF", "#FF0000"]],
    "Bosnia and Herzegovina": ["BA", ["h", "#002395", "#FECB00", "#002395"]], "Serbia": ["RS", ["h", "#C6363C", "#0C4076", "#FFFFFF"]],
    "Montenegro": ["ME", ["h", "#C40308", "#C40308"]], "North Macedonia": ["MK", ["h", "#D20000", "#FFE600", "#D20000"]], "Albania": ["AL", ["h", "#E41E20", "#E41E20"]],
    "United Kingdom": ["GB", ["nordic", "#012169", "#FFFFFF", "#C8102E"]], "Scotland": ["GB", ["nordic", "#0065BF", "#FFFFFF"]],
    "India": ["IN", ["h", "#FF9933", "#FFFFFF", "#138808"]], "Kazakhstan": ["KZ", ["h", "#00AFCA", "#00AFCA"]], "China": ["CN", ["h", "#DE2910", "#DE2910"]],
    "South Korea": ["KR", ["h", "#FFFFFF", "#FFFFFF"]], "Iran": ["IR", ["h", "#239F40", "#FFFFFF", "#DA0000"]], "Russia": ["RU", ["h", "#FFFFFF", "#0039A6", "#D52B1E"]],
    "Ukraine": ["UA", ["h", "#0057B7", "#FFD700"]], "Belgium": ["BE", ["v", "#000000", "#FDDA24", "#EF3340"]], "Netherlands": ["NL", ["h", "#AE1C28", "#FFFFFF", "#21468B"]],
    "Portugal": ["PT", ["v", "#006600", "#FF0000", "#FF0000"]], "Lebanon": null, "Croatia": ["HR", ["h", "#FF0000", "#FFFFFF", "#171796"]], "Hungary": ["HU", ["h", "#CE2939", "#FFFFFF", "#477050"]] };
  function flagEmoji(country) { var f = FLAGS[country]; if (!f) return ""; return String.fromCodePoint.apply(null, f[0].split("").map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; })); }
  function flag(cx, x, y, w, h, country) {
    var f = FLAGS[country], spec = f ? f[1] : null, u = Math.max(2, Math.round(w / 24)), i;
    cx.fillStyle = "#000"; cx.fillRect(x - u, y - u, w + 2 * u, h + 2 * u);               // pixel border
    if (!spec) {                                                                             // unknown: pixel mountain badge
      cx.fillStyle = "#4A74C9"; cx.fillRect(x, y, w, h); cx.fillStyle = SNOW;
      for (i = 0; i < 6; i++) cx.fillRect(x + w / 2 - (i + 1) * u, y + h * .25 + i * u, (i + 1) * 2 * u, u);
      cx.fillStyle = "#1E4FB8"; for (i = 6; i < 11; i++) cx.fillRect(x + w / 2 - (i + 1) * u, y + h * .25 + i * u, (i + 1) * 2 * u, u);
      return;
    }
    var kind = spec[0], cols = spec.slice(1);
    if (kind === "v" || kind === "h") {
      var n = cols.length;
      for (i = 0; i < n; i++) { cx.fillStyle = cols[i]; if (kind === "v") cx.fillRect(x + Math.round(i * w / n), y, Math.ceil(w / n), h); else cx.fillRect(x, y + Math.round(i * h / n), w, Math.ceil(h / n)); }
      if (country === "Spain") { cx.fillStyle = "#AD1519"; cx.fillRect(x + w * .3, y + h * .38, w * .12, h * .24); }
      if (country === "Canada" || country === "Australia" || country === "New Zealand") { /* handled below */ }
      return;
    }
    if (kind === "nordic") { cx.fillStyle = cols[0]; cx.fillRect(x, y, w, h); var cw = Math.round(h / 6), cxp = x + Math.round(w * .36);
      cx.fillStyle = cols[1]; cx.fillRect(cxp - cw, y, cw * 2, h); cx.fillRect(x, y + h / 2 - cw, w, cw * 2);
      if (cols[2]) { cx.fillStyle = cols[2]; cx.fillRect(cxp - cw / 2, y, cw, h); cx.fillRect(x, y + h / 2 - cw / 2, w, cw); } return; }
    if (kind === "ch") { cx.fillStyle = "#FF0000"; cx.fillRect(x, y, w, h); cx.fillStyle = "#FFF"; var a = h / 5; cx.fillRect(x + w / 2 - a / 2, y + h / 2 - a * 1.5, a, a * 3); cx.fillRect(x + w / 2 - a * 1.5, y + h / 2 - a / 2, a * 3, a); return; }
    if (kind === "ca") { cx.fillStyle = "#FFF"; cx.fillRect(x, y, w, h); cx.fillStyle = "#FF0000"; cx.fillRect(x, y, w / 4, h); cx.fillRect(x + w * .75, y, w / 4, h);
      var m = [".....#.....", "....###....", "..#######..", ".#########.", "...#####...", ".....#.....", ".....#....."], s = Math.floor(h / 12), ox = x + w / 2 - 5.5 * s, oy = y + h / 2 - 3.5 * s;
      m.forEach(function (row, r) { for (var c = 0; c < row.length; c++) if (row[c] === "#") cx.fillRect(ox + c * s, oy + r * s, s, s); }); return; }
    if (kind === "us") { for (i = 0; i < 13; i++) { cx.fillStyle = i % 2 ? "#FFF" : "#B22234"; cx.fillRect(x, y + i * h / 13, w, h / 13 + 1); }
      cx.fillStyle = "#3C3B6E"; cx.fillRect(x, y, w * .4, h * 7 / 13); cx.fillStyle = "#FFF"; var d = Math.max(2, Math.round(w / 30));
      for (var r2 = 0; r2 < 5; r2++) for (var c2 = 0; c2 < 6; c2++) cx.fillRect(x + d + c2 * (w * .4 - 2 * d) / 5.5 + (r2 % 2) * d, y + d + r2 * (h * 7 / 13 - 2 * d) / 4.5, d, d); return; }
    if (kind === "ma") { cx.fillStyle = "#C1272D"; cx.fillRect(x, y, w, h); cx.fillStyle = "#006233"; var st = ["....#....", "....#....", "#########", ".#.....#.", "..#...#..", "..#.#.#..", ".#.....#."], ss = Math.floor(h / 10), sx = x + w / 2 - 4.5 * ss, sy = y + h / 2 - 3.5 * ss;
      st.forEach(function (row, r) { for (var c = 0; c < row.length; c++) if (row[c] === "#") cx.fillRect(sx + c * ss, sy + r * ss, ss, ss); }); return; }
    if (kind === "jp") { cx.fillStyle = "#FFF"; cx.fillRect(x, y, w, h); cx.fillStyle = "#BC002D"; var rr = h * .3; for (var yy = -rr; yy < rr; yy += u) { var hw = Math.sqrt(rr * rr - yy * yy); cx.fillRect(x + w / 2 - hw, y + h / 2 + yy, hw * 2, u + .5); } return; }
    if (kind === "tr") { cx.fillStyle = "#E30A17"; cx.fillRect(x, y, w, h); cx.fillStyle = "#FFF"; var rt = h * .3; for (var y2 = -rt; y2 < rt; y2 += u) { var hw2 = Math.sqrt(rt * rt - y2 * y2); cx.fillRect(x + w * .35 - hw2, y + h / 2 + y2, hw2 * 2, u + .5); }
      cx.fillStyle = "#E30A17"; var rt2 = rt * .8; for (var y3 = -rt2; y3 < rt2; y3 += u) { var hw3 = Math.sqrt(rt2 * rt2 - y3 * y3); cx.fillRect(x + w * .4 - hw3, y + h / 2 + y3, hw3 * 2, u + .5); }
      cx.fillStyle = "#FFF"; cx.fillRect(x + w * .55, y + h / 2 - u * 2, u * 4, u * 4); return; }
  }

  // ------------------------------------------------------------------ numbers
  function fmtMoney(v, cur) {
    v = Math.round(Math.abs(Number(v) || 0)); var s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    cur = cur || "€";
    return /^[A-Z]{3}$/.test(cur) || cur === "$" || cur === "£" ? (cur === "$" || cur === "£" ? cur + s : cur + " " + s) : s + " " + cur;
  }
  function fmtSnow(cm, units) {
    cm = Number(cm) || 0;
    if (units === "us") return Math.round(cm / 2.54) + "″";
    return Math.round(cm) + " cm";
  }
  function fitFont(cx, text, maxW, start, min) { for (var s = start; s >= min; s -= 2) { cx.font = s + "px " + FONT; if (cx.measureText(text).width <= maxW) return s; } cx.font = min + "px " + FONT; return min; }
  function wrap(cx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (cx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur); return lines.slice(0, 2);
  }
  function pxText(cx, text, x, y, size, color, align, shadow) {
    cx.font = size + "px " + FONT; cx.textAlign = align || "left"; cx.textBaseline = "alphabetic";
    if (shadow !== false) { cx.fillStyle = "#000"; cx.fillText(text, x + Math.max(2, size / 10), y + Math.max(2, size / 10)); }
    cx.fillStyle = color; cx.fillText(text, x, y);
  }
  // deterministic pseudo-random (same confetti on every frame of a given seed)
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ------------------------------------------------------------------ the card
  function normalise(d) {
    d = d || {};
    var r = d.resort || {}, kind = d.kind || (d.handle || r.handle ? "hall" : "result");
    var out = { kind: kind, region: String(d.region || r.region || "").toUpperCase(), code: (d.player && d.player.code) || d.code || playerCode(),
      label: r.label || r.name || d.resort_name || (typeof d.resort === "string" ? d.resort : "") || "", slug: r.slug || d.resort_slug || "",
      country: r.country || d.country || "", units: r.units || d.units || ((window.SS && SS.U && SS.U.mode && SS.U.mode()) || "metric"),
      currency: r.currency || d.currency || "€", total: r.week_total != null ? Number(r.week_total) : null, left: r.left != null ? Number(r.left) : null,
      snow: r.snow_p50_cm != null ? Number(r.snow_p50_cm) : (d.cm != null ? Number(d.cm) : null),
      handle: d.handle || r.handle || "", rank: d.rank, score: d.score, date: d.date || "" };
    var q = "?ref=" + encodeURIComponent(out.code) + (out.region ? "&region=" + encodeURIComponent(out.region) : "") + (out.slug ? "&resort=" + encodeURIComponent(out.slug) : "");
    out.link = kind === "hall" ? SITE + "halloffame.html?ref=" + encodeURIComponent(out.code) : SITE + "planner.html" + q;
    return out;
  }
  function caption(n) {
    var fe = flagEmoji(n.country), tag = n.slug ? " #" + n.slug.replace(/[^a-z0-9]/gi, "") : "";
    if (n.kind === "hall") {
      return T("I'm on the SnowScope Hall of Fame") + (n.rank ? " · #" + n.rank : "") + "\n" + (n.handle ? n.handle + " · " : "") + n.label + (fe ? " " + fe : "")
        + (n.snow != null ? " · " + fmtSnow(n.snow, n.units) : "") + (n.score != null ? " · " + n.score + " pts" : "") + "\n" + T("I went! Prove it too:") + " " + n.link + "\n#SkiGrandPrix #snowscope #ski" + tag;
    }
    var money = n.total != null ? T("week") + " " + fmtMoney(n.total, n.currency) + (n.left != null ? (n.left >= 0 ? " · " + fmtMoney(n.left, n.currency) + " " + T("left") : " · " + T("need") + " +" + fmtMoney(-n.left, n.currency)) : "") : "";
    return "🎿 " + T("Ski Grand Prix") + (n.region ? " · " + n.region : "") + "\n" + n.label + (fe ? " " + fe : "") + (n.snow != null ? ": ~" + fmtSnow(n.snow, n.units) + " " + T("at Christmas") : "")
      + (money ? "\n" + money : "") + "\n" + T("Play & book your Christmas ski week") + " 👉 " + n.link + "\n#SkiGrandPrix #snowscope #ski" + tag;
  }
  function draw(cx, n, qr, t) {
    // t = animation time in ms (null = still card)
    var anim = t != null, R = rng(7), i;
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, NAVY); g.addColorStop(1, NAVY2);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // stars / snow dots
    for (i = 0; i < 90; i++) { var sx = R() * W, sy = R() * H * .55, sz = R() < .2 ? 6 : 4, dy = anim ? ((t / 1000) * (40 + R() * 60) + sy) % (H * .6) : sy; cx.fillStyle = "rgba(255,255,255," + (0.35 + R() * .5) + ")"; cx.fillRect(Math.round(sx / 6) * 6, Math.round(dy / 6) * 6, sz, sz); }
    // pixel mountains (two ranges) + piste
    var u = 12, base = 1430;
    cx.fillStyle = "#1E4FB8"; for (var x = 0; x < W; x += u) { var hh = 120 + 80 * Math.sin(x / 150) + 60 * Math.sin(x / 47 + 2); cx.fillRect(x, base - hh, u, hh + 10); }
    cx.fillStyle = "#4A74C9"; for (var x2 = 0; x2 < W; x2 += u) { var h2 = 70 + 50 * Math.sin(x2 / 90 + 1) + 30 * Math.sin(x2 / 31); cx.fillRect(x2, base + 20 - h2, u, h2); }
    cx.fillStyle = SNOW; for (var x3 = 0; x3 < W; x3 += u) { var h3 = 120 + 80 * Math.sin(x3 / 150) + 60 * Math.sin(x3 / 47 + 2); if (h3 > 170) cx.fillRect(x3, base - h3, u, (h3 - 170) * .9); }
    cx.fillStyle = SNOW; cx.fillRect(0, base + 20, W, H - base - 20);
    cx.fillStyle = "#DCE8FF"; for (i = 0; i < 40; i++) cx.fillRect(Math.round(R() * W / u) * u, base + 40 + Math.round(R() * (H - base - 80) / u) * u, u * (1 + Math.round(R() * 3)), u);
    // title
    var title = n.kind === "hall" ? T("HALL OF FAME") : T("SKI GRAND PRIX");
    pxText(cx, title, W / 2, 170, fitFont(cx, title, W - 120, 64, 36), GOLD, "center");
    pxText(cx, n.kind === "hall" ? "SnowScope" + (n.rank ? "  ·  #" + n.rank : "") : "SnowScope" + (n.region ? "  ·  " + n.region : ""), W / 2, 240, 28, "#CFE0FF", "center");
    // white panel
    var py = 300, ph = 760, px0 = 60, pw = W - 120;
    cx.fillStyle = "#000"; cx.fillRect(px0 + 14, py + 14, pw, ph); cx.fillStyle = "#fff"; cx.fillRect(px0, py, pw, ph); cx.fillStyle = NAVY; cx.fillRect(px0 + 10, py + 10, pw - 20, ph - 20); cx.fillStyle = "#fff"; cx.fillRect(px0 + 18, py + 18, pw - 36, ph - 36);
    // resort + flag
    cx.font = "44px " + FONT; var lines = wrap(cx, n.label || "", pw - 260); var fs = lines.length > 1 ? 36 : fitFont(cx, lines[0] || "", pw - 260, 48, 28);
    flag(cx, px0 + 50, py + 54, 120, 80, n.country);
    lines.forEach(function (ln, k) { pxText(cx, ln, px0 + 200, py + 100 + k * (fs + 14) - (lines.length > 1 ? 14 : 0), fs, NAVY, "left", false); });
    pxText(cx, n.country || "", px0 + 200, py + 100 + (lines.length > 1 ? fs + 36 : 44), 20, "#4F607F", "left", false);
    // snow (big)
    var yb = py + 300;
    if (n.snow != null) {
      var big = (n.kind === "hall" ? "" : "~") + fmtSnow(n.snow, n.units);
      pxText(cx, big, px0 + 50, yb + 20, fitFont(cx, big, pw - 100, 104, 60), "#1E4FB8", "left", false);
      pxText(cx, n.kind === "hall" ? T("measured on the spot") : T("at Christmas"), px0 + 50, yb + 70, 24, "#4F607F", "left", false);
    } else if (n.kind === "hall") { pxText(cx, T("I went!"), px0 + 50, yb + 20, 72, "#1E4FB8", "left", false); }
    // money / score line
    var y2 = py + 470;
    if (n.kind === "hall") {
      if (n.score != null) { pxText(cx, n.score + " pts", px0 + 50, y2, 48, GREEN, "left", false); pxText(cx, T("Hall of Fame score"), px0 + 50, y2 + 44, 22, "#4F607F", "left", false); }
      if (n.date) pxText(cx, n.date, px0 + 50, y2 + 110, 22, "#4F607F", "left", false);
    } else if (n.total != null) {
      pxText(cx, T("week") + " " + fmtMoney(n.total, n.currency), px0 + 50, y2, 40, NAVY, "left", false);
      if (n.left != null) {
        var ok = n.left >= 0, txt = ok ? fmtMoney(n.left, n.currency) + " " + T("left") : T("need") + " +" + fmtMoney(-n.left, n.currency);
        cx.fillStyle = ok ? GREEN : RED; cx.fillRect(px0 + 50, y2 + 24, cx.measureText(txt).width * 0.95 + 40, 60);
        pxText(cx, txt, px0 + 70, y2 + 66, 30, "#fff", "left", false);
      }
    }
    // player / handle code chip
    var chip = n.kind === "hall" ? (n.handle || T("PLAYER") + " " + n.code) : T("PLAYER") + " " + n.code;
    cx.font = "26px " + FONT; var cwid = cx.measureText(chip).width + 60;
    cx.fillStyle = NAVY; cx.fillRect(px0 + 50, py + ph - 130, cwid, 70); cx.fillStyle = "#000"; cx.fillRect(px0 + 56, py + ph - 124, cwid, 70); cx.fillStyle = NAVY; cx.fillRect(px0 + 50, py + ph - 130, cwid, 70);
    pxText(cx, chip, px0 + 80, py + ph - 84, 26, GOLD, "left", false);
    // skier (bobbing when animated), with tracks
    var sk = 14, skx = W - 60 - 16 * sk, sky = 1135, bob = anim ? Math.round(Math.sin(t / 140) * 8) : 0, frame = anim ? Math.floor(t / 180) % 2 : 0;
    cx.fillStyle = "rgba(11,30,74,.25)"; for (i = 0; i < 6; i++) cx.fillRect(skx - 40 - i * 34, sky + 14 * sk + 6 + i * 5, 26, 5);
    skier(cx, skx, sky + bob, sk, frame, n.kind === "hall" ? "#1E9E5A" : null);
    // QR block (white quiet zone, 4 modules)
    var qs = 330, qx = 70, qy = 1500, cell = Math.floor(qs / (qr.size + 8)), qw = cell * (qr.size + 8);
    cx.fillStyle = "#000"; cx.fillRect(qx + 10, qy + 10, qw, qw); cx.fillStyle = "#fff"; cx.fillRect(qx, qy, qw, qw);
    cx.fillStyle = "#000"; for (var yy = 0; yy < qr.size; yy++) for (var xx = 0; xx < qr.size; xx++) if (qr.get(xx, yy)) cx.fillRect(qx + (xx + 4) * cell, qy + (yy + 4) * cell, cell, cell);
    var tx = qx + qw + 40, tw = W - tx - 50;
    cx.font = "26px " + FONT; var scan = wrap(cx, n.kind === "hall" ? T("Scan to see the ranking") : T("Scan to play & book"), tw);
    scan.forEach(function (ln, k) { pxText(cx, ln, tx, qy + 70 + k * 40, 26, NAVY, "left", false); });
    cx.font = "20px " + FONT; var lk = n.link.replace(/^https?:\/\//, "").split("?")[0], lk2 = wrap(cx, lk, tw);
    lk2.forEach(function (ln, k) { pxText(cx, ln, tx, qy + 180 + k * 30, 20, "#4F607F", "left", false); });
    if (n.kind !== "hall") { cx.font = "18px " + FONT; var mo = wrap(cx, T("Play, then go: your photo enters the Hall of Fame"), tw); mo.forEach(function (ln, k) { pxText(cx, ln, tx, qy + 260 + k * 28, 18, GREEN, "left", false); }); }
    // footer
    pxText(cx, "#SkiGrandPrix · snowscope.app", W / 2, H - 50, 26, NAVY, "center", false);
    // confetti + falling snow in the animation
    if (anim) {
      var R2 = rng(99), cols = [GOLD, RED, "#1E63D6", "#fff", GREEN];
      for (i = 0; i < 70; i++) { var cxp = R2() * W, spd = 180 + R2() * 260, ph0 = R2() * H, cy = (ph0 + t / 1000 * spd) % (H + 40) - 20, col = cols[Math.floor(R2() * cols.length)], sz2 = 10 + Math.floor(R2() * 10); cx.fillStyle = col; cx.fillRect(Math.round(cxp + Math.sin(t / 300 + i) * 20), Math.round(cy), sz2, sz2 * (R2() < .5 ? 1 : .6)); }
      for (i = 0; i < 60; i++) { var fx = R2() * W, fs2 = 60 + R2() * 90, fy = (R2() * H + t / 1000 * fs2) % H; cx.fillStyle = "rgba(255,255,255,.9)"; cx.fillRect(Math.round(fx), Math.round(fy), 6, 6); }
    }
  }
  function fontsReady() {
    try { if (document.fonts && document.fonts.load) return Promise.all([document.fonts.load('32px "Press Start 2P"'), document.fonts.ready]).catch(function () { }); } catch (e) { /* no font API */ }
    return Promise.resolve();
  }
  function render(data) {
    var n = normalise(data), qr = QR.encode(n.link);
    return fontsReady().then(function () {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      draw(cx, n, qr, null);
      return new Promise(function (res) {
        var done = function (blob) { res({ blob: blob, dataUrl: c.toDataURL("image/png"), caption: caption(n), link: n.link, canvas: c, n: n, qr: qr }); };
        if (c.toBlob) c.toBlob(done, "image/png"); else done(null);
      });
    });
  }
  function resultCard(data) { last = data; return render(data); }
  function hallCard(data) { data = Object.assign({ kind: "hall" }, data || {}); last = data; return render(data); }

  // ------------------------------------------------------------------ ~6 s clip (MediaRecorder: MP4 where possible, else WebM)
  function videoMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return null;
    var cands = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (var i = 0; i < cands.length; i++) if (MediaRecorder.isTypeSupported(cands[i])) return cands[i];
    return null;
  }
  function clip(card, seconds, onProgress) {
    var mime = videoMime();
    if (!mime || !card.canvas.captureStream) return Promise.resolve(null);
    return new Promise(function (res) {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      draw(cx, card.n, card.qr, 0);
      var stream = c.captureStream(30), chunks = [], rec;
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 }); } catch (e) { return res(null); }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () { stream.getTracks().forEach(function (t) { t.stop(); }); var ext = /mp4/.test(mime) ? "mp4" : "webm"; res(chunks.length ? { blob: new Blob(chunks, { type: mime.split(";")[0] }), ext: ext, mime: mime.split(";")[0] } : null); };
      rec.onerror = function () { res(null); };
      var t0 = performance.now(), dur = (seconds || 6) * 1000;
      rec.start(250);
      (function frame(now) {
        var t = now - t0;
        draw(cx, card.n, card.qr, t);
        if (onProgress) onProgress(Math.min(1, t / dur));
        if (t < dur) requestAnimationFrame(frame); else { try { rec.stop(); } catch (e) { res(null); } }
      })(t0);
    });
  }

  // ------------------------------------------------------------------ share / download / caption
  function fileName(n, ext) { return "snowscope-" + (n.kind === "hall" ? "halloffame" : "skigrandprix") + "-" + (n.slug || "card").slice(0, 30) + "." + ext; }
  function download(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.rel = "noopener"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) { try { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok; } catch (e) { return false; } }
  function canShareFiles(files) { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: files })); } catch (e) { return false; } }

  function mount(container, data) {
    container = typeof container === "string" ? document.querySelector(container) : container;
    if (!container) return null;
    data = data || last;
    var panel = document.createElement("div"); panel.className = "ssshare";
    panel.innerHTML = '<div class="ssshare-prev"><img alt="" hidden><div class="ssshare-wait">' + esc(T("Drawing your card…")) + '</div></div>' +
      '<div class="ssshare-side"><p class="ssshare-h">' + esc(T("Post it. Trend it.")) + '</p><p class="ssshare-p">' + esc(T("Your card with a QR code: friends scan it, play and book too.")) + '</p>' +
      '<div class="ssshare-btns"><button type="button" class="ssshare-b main" data-act="share">' + esc(T("Share to TikTok / Instagram")) + '</button>' +
      '<button type="button" class="ssshare-b" data-act="download">' + esc(T("Download")) + '</button>' +
      '<button type="button" class="ssshare-b" data-act="clip" hidden>' + esc(T("Video clip")) + '</button>' +
      '<button type="button" class="ssshare-b" data-act="caption">' + esc(T("Copy caption")) + '</button></div>' +
      '<p class="ssshare-status" role="status"></p><textarea class="ssshare-cap" readonly rows="4"></textarea>' +
      '<a class="ssshare-hall" href="' + esc(hallLink()) + '">' + esc(T("Went there? Enter the Hall of Fame")) + ' ›</a></div>';
    container.appendChild(panel);
    var img = panel.querySelector("img"), wait = panel.querySelector(".ssshare-wait"), status = panel.querySelector(".ssshare-status"), cap = panel.querySelector(".ssshare-cap"), clipBtn = panel.querySelector('[data-act="clip"]');
    var card = null, vid = null, making = null;
    hit("/share/open");
    function say(s) { status.textContent = s; }
    function ensureClip() {
      if (vid) return Promise.resolve(vid);
      if (making) return making;
      if (!videoMime()) return Promise.resolve(null);
      say(T("Making your clip…") + " 6 s");
      making = clip(card, 6, function (p) { say(T("Making your clip…") + " " + Math.round(p * 100) + "%"); }).then(function (v) { vid = v; making = null; return v; });
      return making;
    }
    render(data).then(function (c) {
      card = c; img.src = c.dataUrl; img.hidden = false; wait.hidden = true; cap.value = c.caption;
      if (videoMime() && c.canvas.captureStream) clipBtn.hidden = false;
    }).catch(function () { wait.textContent = T("Sorry, the card could not be drawn."); });
    panel.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-act]"); if (!b || !card) return;
      var act = b.dataset.act, n = card.n;
      if (act === "caption") { copy(card.caption).then(function (ok) { say(ok ? T("Caption copied. Open TikTok or Instagram and paste it.") : T("Select the text below and copy it.")); if (!ok) { cap.focus(); cap.select(); } }); return; }
      if (act === "download") { download(card.blob, fileName(n, "png")); hit("/share/download"); say(T("Saved. Post it with the caption!")); copy(card.caption); return; }
      if (act === "clip") { b.disabled = true; ensureClip().then(function (v) { b.disabled = false; if (!v) return say(T("This browser cannot record the clip; the picture is ready to post.")); download(v.blob, fileName(n, v.ext)); hit("/share/download"); say(T("Saved. Post it with the caption!")); copy(card.caption); }); return; }
      if (act === "share") {
        b.disabled = true;
        ensureClip().then(function (v) {
          var files = [new File([card.blob], fileName(n, "png"), { type: "image/png" })];
          if (v) files.unshift(new File([v.blob], fileName(n, v.ext), { type: v.mime }));
          var tryShare = function (fl) {
            if (!canShareFiles(fl)) return Promise.reject(new Error("noshare"));
            return navigator.share({ files: fl, text: card.caption, title: n.kind === "hall" ? T("I'm on the SnowScope Hall of Fame") : T("Ski Grand Prix") });
          };
          return tryShare(files).catch(function (e) { if (e && e.name === "AbortError") throw e; return files.length > 1 ? tryShare([files[1]]) : Promise.reject(e); })
            .then(function () { hit("/share/file"); say(T("Shared. Thank you!")); })
            .catch(function (e) {
              if (e && e.name === "AbortError") return say("");
              download(v ? v.blob : card.blob, fileName(n, v ? v.ext : "png")); hit("/share/download");
              copy(card.caption).then(function (ok) { say(ok ? T("Saved to your phone and caption copied: open TikTok or Instagram, pick the file, paste the caption.") : T("Saved to your phone. Copy the caption below, then open TikTok or Instagram.")); });
            });
        }).then(function () { b.disabled = false; }, function () { b.disabled = false; });
      }
    });
    return panel;
  }

  function flagCanvas(country, w, h) { var c = document.createElement("canvas"); c.width = w || 24; c.height = h || 16; flag(c.getContext("2d"), 2, 2, c.width - 4, c.height - 4, country); return c; }

  window.SSShare = { resultCard: resultCard, hallCard: hallCard, mount: mount, hallLink: hallLink, playerCode: playerCode,
                     caption: function (d) { return caption(normalise(d)); }, qr: QR.encode, flagEmoji: flagEmoji, flagCanvas: flagCanvas, _draw: draw, _normalise: normalise };
})();
