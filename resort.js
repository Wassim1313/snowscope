/* Resort page: today's snow + the free week from resorts.json (static), hotels, nearby resorts;
   Pro: the 7-day resort forecast live from the API. */
(async () => {
  "use strict";
  const { esc } = SS;
  const $ = (id) => document.getElementById(id);
  const slug = document.body.dataset.slug;
  const dayName = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const dayNum = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const started = SS.start();
  let all;
  try { all = await SS.resorts(); } catch { $("vd").textContent = "Snow data could not be loaded. Try again in a minute."; return; }
  const r = all.rows.find((x) => x.slug === slug);
  if (!r) return;
  const today = new Date().toISOString().slice(0, 10);
  const di = Math.max(0, all.dates.indexOf(all.dates.includes(today) ? today : all.dates[Math.min(2, all.dates.length - 1)]));
  const snow = (i) => (r.snow && r.snow[i]) || [null, null];
  const [d0, n0] = snow(di);
  $("dep").innerHTML = d0 == null ? "—" : d0 >= 1 ? d0 + "<small>cm</small>" : "0<small>cm</small>";
  $("vd").textContent = d0 == null ? "No snow data here yet." : d0 >= 100 ? "Deep snow." : d0 >= 40 ? "Good snow cover." : d0 >= 10 ? "Some snow." : d0 >= 1 ? "A thin layer." : "No snow yet.";
  $("nw").innerHTML = n0 >= 1 ? "+" + n0 + "<small>cm</small>" : "0<small>cm</small>";
  $("week").innerHTML = all.dates.map((d, i) => {
    const [dd, nn] = snow(i);
    return '<div class="d' + (i === di ? " on" : "") + '"><small>' + (i === di ? "Today" : dayName(d)) + " " + dayNum(d) + "</small><b>" + (dd == null ? "—" : dd + "") +
      '</b><small>cm</small><em>' + (nn >= 1 ? "+" + nn + " new" : "&nbsp;") + "</em></div>";
  }).join("");
  // nearby: 6 closest resorts of the same region
  const rad = Math.PI / 180, dist = (a) => Math.hypot((a.lon - r.lon) * Math.cos(r.lat * rad), a.lat - r.lat) * 111;
  const near = all.rows.filter((x) => x.slug !== r.slug && x.dom === r.dom).map((x) => [dist(x), x]).sort((a, b) => a[0] - b[0]).slice(0, 6);
  $("near").innerHTML = near.map(([km, x]) => { const v = (x.snow && x.snow[di]) || []; return '<li><a href="' + encodeURIComponent(x.slug) + '.html"><span>' + esc(x.name) +
    "<small>" + Math.round(km) + ' km</small></span><span class="v">' + (v[0] != null ? v[0] + " cm" : "—") + "</span></a></li>"; }).join("");

  await started;
  $("stay").innerHTML = SS.stayBlock(r.lat, r.lon, r.name) || '<p class="none">No partner here yet.</p>';
  SS.onChange(forecast);
  forecast(SS.S);

  async function forecast(S) {
    const box = $("fcb");
    if (!S.pro) {
      box.innerHTML = '<div class="lockcard"><span class="pro"><span class="ms f">lock</span>PRO</span><p><b>The next 7 days at ' + esc(r.name) +
        '</b><br>New snow, temperatures and wind each day.</p></div><button class="btn ski big full" style="margin-top:10px" data-up>See the forecast with Pro</button>';
      box.querySelector("[data-up]").onclick = () => SS.upsell("The 7-day forecast for " + r.name + " is in Pro");
      return;
    }
    box.innerHTML = '<p class="none">Loading…</p>';
    try {
      const rep = await SS.api("/v1/resorts/" + encodeURIComponent(r.slug) + "/report");
      const o = rep.outlook || [];
      const m = (x) => (x && x.median != null ? x.median : null);
      const ps = rep.powder_score;
      box.innerHTML = (ps ? '<p class="verdict" style="margin:0 0 8px">Powder score today: <b>' + (Math.round(ps.score * 10) / 10) + " / 10</b></p>" : "") +
        '<table class="fc"><thead><tr><th>Day</th><th>New snow</th><th>Low / high</th><th>Wind</th></tr></thead><tbody>' +
        o.map((d) => "<tr><td>" + dayName(d.date) + " " + dayNum(d.date) + "</td><td>" + (m(d.snowfall_cm) >= 1 ? Math.round(m(d.snowfall_cm)) + " cm" : "—") +
          "</td><td>" + (m(d.temp_min_c) != null ? Math.round(m(d.temp_min_c)) + "° / " + Math.round(m(d.temp_max_c)) + "°" : "—") +
          "</td><td>" + (m(d.wind_max_kmh) != null ? Math.round(m(d.wind_max_kmh)) + " km/h" : "—") + "</td></tr>").join("") + "</tbody></table>" +
        (rep.elevation_m ? '<p class="none">At ' + Math.round(rep.elevation_m).toLocaleString("en-US") + " m.</p>" : "") +
        (rep.bulletin && rep.bulletin.url ? '<p style="margin:6px 0 0;font-size:13.5px"><a target="_blank" rel="noopener" href="' + esc(rep.bulletin.url) + '">Official avalanche bulletin · ' + esc(rep.bulletin.provider || "") + "</a></p>" : "");
    } catch (e) {
      box.innerHTML = '<p class="msg">' + (e.status === 422 ? "No forecast for this resort yet." : "Pro data is updating, try again in a minute.") + "</p>";
    }
  }
})();
