/* SnowScope Web charts (DATAVIZ 2026-11-03, style guide docs/web/CHARTS.md). Hand-built SVG, no chart library.
   One message per chart: every chart returns { title, html } where the title states the takeaway in plain words
   ("Deeper than usual for early November"). Direct labels instead of legends, this season / today highlighted,
   past winters muted, the snow ramp for depth, the theme tokens of site.css (light + dark), tabular numbers, units
   through SS.U (metric / US), a screen-reader table under every chart, hover + keyboard tooltips (SSC.bind).
   The chart roots carry data-noi18n: charts.js translates its own strings (table T below) so the page translator
   never touches them twice.  API: window.SSC = { season, strip, verdict, rankBars, bands, week, elev, fallCell, fallTitle, paired, powder, bind, t }. */
(() => {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const U = () => window.SS.U;
  const LANG = () => (window.I18N && I18N.lang) || "en";
  const LOC = () => (window.I18N && I18N.locale) || "en-GB";
  const D = (d) => new Date(d + "T00:00:00Z");
  const addDays = (d, k) => { const x = D(d); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
  const days = (a, b) => Math.round((D(b) - D(a)) / 864e5);
  const f1 = (v) => (+v).toFixed(1);
  // ---- strings: English key -> fr, de, it, es, ar (Moroccan Darija, Arabic script, Western digits)
  const COL = { fr: 0, de: 1, it: 2, es: 3, ar: 4 };
  const T = {
    "for early {a}": ["début {a}", "Anfang {a}", "a inizio {a}", "a principios de {a}", "فبداية {a}"],
    "for mid {a}": ["mi-{a}", "Mitte {a}", "a metà {a}", "a mediados de {a}", "فوسط {a}"],
    "for late {a}": ["fin {a}", "Ende {a}", "a fine {a}", "a finales de {a}", "فآخر {a}"],
    "Much deeper than usual {a}": ["Bien plus de neige que d'habitude {a}", "Viel mehr Schnee als üblich {a}", "Molta più neve del solito {a}", "Mucha más nieve de lo habitual {a}", "تلج كثر بزاف من العادة {a}"],
    "Deeper than usual {a}": ["Plus de neige que d'habitude {a}", "Mehr Schnee als üblich {a}", "Più neve del solito {a}", "Más nieve de lo habitual {a}", "تلج كثر من العادة {a}"],
    "About as much snow as usual {a}": ["Autant de neige que d'habitude {a}", "So viel Schnee wie üblich {a}", "Neve come al solito {a}", "Tanta nieve como de costumbre {a}", "التلج بحال العادة {a}"],
    "Less snow than usual {a}": ["Moins de neige que d'habitude {a}", "Weniger Schnee als üblich {a}", "Meno neve del solito {a}", "Menos nieve de lo habitual {a}", "تلج قل من العادة {a}"],
    "Much less snow than usual {a}": ["Bien moins de neige que d'habitude {a}", "Viel weniger Schnee als üblich {a}", "Molta meno neve del solito {a}", "Mucha menos nieve de lo habitual {a}", "تلج قل بزاف من العادة {a}"],
    "Snow comes and goes here {a}": ["Ici la neige va et vient {a}", "Hier kommt und geht der Schnee {a}", "Qui la neve va e viene {a}", "Aquí la nieve va y viene {a}", "هنا التلج كيجي ويمشي {a}"],
    "No snow yet, as usual {a}": ["Pas encore de neige, comme d'habitude {a}", "Noch kein Schnee, wie üblich {a}", "Ancora niente neve, come al solito {a}", "Aún sin nieve, como de costumbre {a}", "مازال ما كاينش التلج، بحال العادة {a}"],
    "This season so far": ["Cette saison jusqu'ici", "Diese Saison bisher", "Questa stagione finora", "Esta temporada hasta ahora", "هاد الموسم حتى لدابا"],
    "this season": ["cette saison", "diese Saison", "questa stagione", "esta temporada", "هاد الموسم"],
    "usual": ["habituel", "üblich", "solito", "habitual", "العادة"],
    "usual when snowy": ["habituel quand il neige", "üblich, wenn Schnee liegt", "solito quando c'è neve", "habitual cuando hay nieve", "العادة ملي كاين التلج"],
    "past winters": ["hivers passés", "frühere Winter", "inverni passati", "inviernos pasados", "الشتوات اللي فاتو"],
    "most winters": ["la plupart des hivers", "die meisten Winter", "la maggior parte degli inverni", "la mayoría de inviernos", "أغلب الشتوات"],
    "winters with snow": ["hivers avec neige", "Winter mit Schnee", "inverni con neve", "inviernos con nieve", "شتوات فيهم التلج"],
    "next days": ["prochains jours", "nächste Tage", "prossimi giorni", "próximos días", "الأيام الجايين"],
    "Today": ["Aujourd'hui", "Heute", "Oggi", "Hoy", "اليوم"],
    "Date": ["Date", "Datum", "Data", "Fecha", "التاريخ"],
    "Snow depth": ["Hauteur de neige", "Schneehöhe", "Altezza neve", "Espesor de nieve", "العلو ديال التلج"],
    "Snow depth this season compared with past winters": ["Hauteur de neige cette saison comparée aux hivers passés", "Schneehöhe dieser Saison im Vergleich zu früheren Wintern", "Altezza neve di questa stagione rispetto agli inverni passati", "Espesor de nieve de esta temporada comparado con inviernos pasados", "العلو ديال التلج هاد الموسم مقارن مع الشتوات اللي فاتو"],
    "Past winters, lowest – highest": ["Hivers passés, du plus bas au plus haut", "Frühere Winter, niedrigster – höchster", "Inverni passati, minimo – massimo", "Inviernos pasados, mínimo – máximo", "الشتوات اللي فاتو، من القل للكثر"],
    // winter strip
    "best": ["le plus", "am meisten", "il più", "el mejor", "الكثر"],
    "least": ["le moins", "am wenigsten", "il meno", "el peor", "القل"],
    "last winter": ["l'hiver dernier", "letzter Winter", "l'inverno scorso", "el invierno pasado", "الشتا اللي فاتت"],
    "Winter": ["Hiver", "Winter", "Inverno", "Invierno", "الشتا"],
    "Depth on this date": ["Hauteur à cette date", "Höhe an diesem Tag", "Altezza in questa data", "Espesor en esta fecha", "العلو فهاد النهار"],
    // past-winters verdict + rank bars + band chart (owner 2026-11-06: plain answers, "is there more or less snow than usual?")
    "Snow is unusual here {a}": ["Neige inhabituelle ici {a}", "Schnee ist hier ungewöhnlich {a}", "Neve insolita qui {a}", "Nieve poco habitual aquí {a}", "التلج ماشي عادي هنا {a}"],
    "No snow yet, though most winters have some by now": ["Pas encore de neige, alors que la plupart des hivers en ont déjà", "Noch kein Schnee, obwohl die meisten Winter jetzt schon welchen haben", "Ancora niente neve, mentre quasi tutti gli inverni ne hanno già", "Aún sin nieve, cuando la mayoría de inviernos ya tienen", "مازال ما كاينش التلج، وأغلب الشتوات كيكون فيهم دابا"],
    "Much more snow than usual {a}": ["Beaucoup plus de neige que d'habitude {a}", "Viel mehr Schnee als üblich {a}", "Molta più neve del solito {a}", "Mucha más nieve de lo habitual {a}", "تلج كثر بزاف من العادة {a}"],
    "More snow than usual {a}": ["Plus de neige que d'habitude {a}", "Mehr Schnee als üblich {a}", "Più neve del solito {a}", "Más nieve de lo habitual {a}", "تلج كثر من العادة {a}"],
    "Today {a} · usually about {b} on {c}": ["Aujourd'hui {a} · d'habitude environ {b} le {c}", "Heute {a} · sonst meist etwa {b} am {c}", "Oggi {a} · di solito circa {b} il {c}", "Hoy {a} · lo habitual, unos {b} el {c}", "اليوم {a} · العادة تقريبا {b} نهار {c}"],
    "Today {a} · most winters have none on {b}": ["Aujourd'hui {a} · la plupart des hivers n'en ont pas le {b}", "Heute {a} · die meisten Winter haben am {b} keinen", "Oggi {a} · quasi tutti gli inverni non ne hanno il {b}", "Hoy {a} · la mayoría de inviernos no tienen el {b}", "اليوم {a} · أغلب الشتوات ما فيهمش التلج نهار {b}"],
    "Usually about {a} on {b}": ["D'habitude environ {a} le {b}", "Sonst meist etwa {a} am {b}", "Di solito circa {a} il {b}", "Lo habitual: unos {a} el {b}", "العادة تقريبا {a} نهار {b}"],
    "When there was snow on {a}, usually about {b}": ["Quand il y avait de la neige le {a} : environ {b}", "Wenn am {a} Schnee lag, meist etwa {b}", "Quando c'era neve il {a}, di solito circa {b}", "Cuando hubo nieve el {a}, unos {b}", "ملي كان التلج نهار {a}، العادة تقريبا {b}"],
    "More snow than {a} in 10 past winters": ["Plus de neige que {a} sur 10 des hivers passés", "Mehr Schnee als {a} von 10 früheren Wintern", "Più neve di {a} su 10 inverni passati", "Más nieve que {a} de cada 10 inviernos pasados", "تلج كثر من {a} من 10 ديال الشتوات اللي فاتو"],
    "Less snow than {a} in 10 past winters": ["Moins de neige que {a} sur 10 des hivers passés", "Weniger Schnee als {a} von 10 früheren Wintern", "Meno neve di {a} su 10 inverni passati", "Menos nieve que {a} de cada 10 inviernos pasados", "تلج قل من {a} من 10 ديال الشتوات اللي فاتو"],
    "More snow than any past winter on this date": ["Plus de neige que tous les hivers passés à cette date", "Mehr Schnee als jeder frühere Winter an diesem Tag", "Più neve di ogni inverno passato in questa data", "Más nieve que cualquier invierno pasado en esta fecha", "تلج كثر من حتى شتا فاتت فهاد النهار"],
    "Less snow than any past winter on this date": ["Moins de neige que tous les hivers passés à cette date", "Weniger Schnee als jeder frühere Winter an diesem Tag", "Meno neve di ogni inverno passato in questa data", "Menos nieve que cualquier invierno pasado en esta fecha", "تلج قل من حتى شتا فاتت فهاد النهار"],
    "Only {a} in 10 winters had snow on this date": ["Seulement {a} sur 10 des hivers passés avaient de la neige à cette date", "Nur {a} von 10 Wintern hatten an diesem Tag Schnee", "Solo {a} su 10 inverni avevano neve in questa data", "Solo {a} de cada 10 inviernos tenían nieve en esta fecha", "غير {a} من 10 ديال الشتوات كان فيهم التلج فهاد النهار"],
    "Only {a} of the last {b} winters had snow on this date": ["Seulement {a} des {b} derniers hivers avaient de la neige à cette date", "Nur {a} der letzten {b} Winter hatten an diesem Tag Schnee", "Solo {a} degli ultimi {b} inverni avevano neve in questa data", "Solo {a} de los últimos {b} inviernos tenían nieve en esta fecha", "غير {a} من آخر {b} شتوات كان فيهم التلج فهاد النهار"],
    "No past winter had snow on this date": ["Aucun hiver passé n'avait de neige à cette date", "Kein früherer Winter hatte an diesem Tag Schnee", "Nessun inverno passato aveva neve in questa data", "Ningún invierno pasado tenía nieve en esta fecha", "حتى شتا فاتت ما كان فيها التلج فهاد النهار"],
    "{a} in 10 winters had snow on this date": ["{a} sur 10 des hivers passés avaient de la neige à cette date", "{a} von 10 Wintern hatten an diesem Tag Schnee", "{a} su 10 inverni avevano neve in questa data", "{a} de cada 10 inviernos tenían nieve en esta fecha", "{a} من 10 ديال الشتوات كان فيهم التلج فهاد النهار"],
    "Every past winter had snow on this date": ["Tous les hivers passés avaient de la neige à cette date", "Jeder frühere Winter hatte an diesem Tag Schnee", "Ogni inverno passato aveva neve in questa data", "Todos los inviernos pasados tenían nieve en esta fecha", "كل الشتوات اللي فاتو كان فيهم التلج فهاد النهار"],
    "One bar per past winter on {a}, least to most snow": ["Une barre par hiver passé, le {a}, du moins au plus de neige", "Ein Balken pro früherem Winter am {a}, von wenig zu viel Schnee", "Una barra per ogni inverno passato il {a}, da meno a più neve", "Una barra por invierno pasado el {a}, de menos a más nieve", "عمود لكل شتا فاتت نهار {a}، من القل للكثر"],
    "Right in the middle of past winters": ["Pile dans la moyenne des hivers passés", "Genau in der Mitte früherer Winter", "Proprio nella media degli inverni passati", "Justo en la media de los inviernos pasados", "بالضبط فالوسط ديال الشتوات اللي فاتو"],
    "no snow": ["pas de neige", "kein Schnee", "niente neve", "sin nieve", "بلا تلج"],
    "least snow": ["moins de neige", "wenig Schnee", "meno neve", "menos nieve", "قل تلج"],
    "most snow": ["plus de neige", "viel Schnee", "più neve", "más nieve", "كثر تلج"],
    "This winter against past winters": ["Cet hiver face aux hivers passés", "Dieser Winter im Vergleich zu früheren Wintern", "Quest'inverno rispetto agli inverni passati", "Este invierno frente a inviernos pasados", "هاد الشتا مقارنة مع الشتوات اللي فاتو"],
    "The whole season": ["Toute la saison", "Die ganze Saison", "Tutta la stagione", "Toda la temporada", "الموسم كامل"],
    "this winter": ["cet hiver", "dieser Winter", "quest'inverno", "este invierno", "هاد الشتا"],
    "forecast": ["prévision", "Vorhersage", "previsione", "previsión", "التوقعات"],
    "normal (half of winters)": ["normal (un hiver sur deux)", "normal (jeder zweite Winter)", "normale (metà degli inverni)", "normal (la mitad de los inviernos)", "عادي (نص الشتوات)"],
    "8 in 10 winters": ["8 hivers sur 10", "8 von 10 Wintern", "8 inverni su 10", "8 de cada 10 inviernos", "8 شتوات من 10"],
    "normal": ["normal", "normal", "normale", "normal", "عادي"],
    // week ahead
    "Snow on {a}: +{b}": ["Neige {a} : +{b}", "Schnee am {a}: +{b}", "Neve {a}: +{b}", "Nieve el {a}: +{b}", "التلج نهار {a}: +{b}"],
    "rain below {a}": ["pluie sous {a}", "Regen unter {a}", "pioggia sotto {a}", "lluvia por debajo de {a}", "الشتا تحت {a}"],
    "snow down to the base": ["neige jusqu'en bas", "Schnee bis ins Tal", "neve fino in basso", "nieve hasta la base", "التلج حتى للتحت"],
    "No real snow in the next 7 days": ["Pas vraiment de neige dans les 7 prochains jours", "Kaum Schnee in den nächsten 7 Tagen", "Quasi niente neve nei prossimi 7 giorni", "Casi sin nieve en los próximos 7 días", "تقريبا ما كاينش التلج فالسبع أيام الجايين"],
    "New snow": ["Neige fraîche", "Neuschnee", "Neve fresca", "Nieve nueva", "تلج جديد"],
    "forecasts range": ["écart des prévisions", "Spanne der Vorhersagen", "intervallo delle previsioni", "rango de las previsiones", "الفرق بين التوقعات"],
    "Snow line": ["Limite de la neige", "Schneegrenze", "Limite della neve", "Cota de nieve", "الحد ديال التلج"],
    "snow line": ["limite de la neige", "Schneegrenze", "limite della neve", "cota de nieve", "الحد ديال التلج"],
    "rain": ["pluie", "Regen", "pioggia", "lluvia", "الشتا"],
    "Day": ["Jour", "Tag", "Giorno", "Día", "النهار"],
    "New snow and snow line, next 7 days": ["Neige fraîche et limite de la neige, 7 prochains jours", "Neuschnee und Schneegrenze, nächste 7 Tage", "Neve fresca e limite della neve, prossimi 7 giorni", "Nieve nueva y cota de nieve, próximos 7 días", "تلج جديد والحد ديال التلج، السبع أيام الجايين"],
    // elevation profile
    "Snow starts at ~{a} and adds ~{b} every 100 m higher": ["La neige commence vers {a} et gagne ~{b} tous les 100 m", "Schnee ab ~{a}, ~{b} mehr alle 100 m höher", "La neve inizia a ~{a} e aumenta di ~{b} ogni 100 m", "La nieve empieza a ~{a} y suma ~{b} cada 100 m más arriba", "التلج كيبدا من ~{a} وكيزيد ~{b} فكل 100 م لفوق"],
    "Snow all the way down, ~{b} more every 100 m higher": ["Neige jusqu'en bas, ~{b} de plus tous les 100 m", "Schnee bis ganz unten, ~{b} mehr alle 100 m höher", "Neve fino in basso, ~{b} in più ogni 100 m", "Nieve hasta abajo, ~{b} más cada 100 m más arriba", "التلج حتى للتحت، ~{b} زايدة فكل 100 م لفوق"],
    "Snow from ~{a} up": ["Neige à partir de ~{a}", "Schnee ab ~{a}", "Neve da ~{a} in su", "Nieve desde ~{a}", "التلج من ~{a} لفوق"],
    "No snow at any height here yet": ["Pas encore de neige, à aucune altitude", "Noch in keiner Höhe Schnee", "Ancora niente neve a nessuna quota", "Aún sin nieve a ninguna altura", "مازال ما كاينش التلج فحتى علو"],
    "More snow higher up": ["Plus de neige en altitude", "Mehr Schnee weiter oben", "Più neve in alto", "Más nieve más arriba", "التلج كثر فالفوق"],
    "Snow depth by height": ["Hauteur de neige selon l'altitude", "Schneehöhe nach Höhe", "Altezza neve per quota", "Espesor de nieve según la altura", "العلو ديال التلج على حساب العلو"],
    "Height": ["Altitude", "Höhe", "Quota", "Altura", "العلو"],
    "measured": ["mesuré", "gemessen", "misurato", "medido", "مقاس"],
    "our map": ["notre carte", "unsere Karte", "la nostra mappa", "nuestro mapa", "الخريطة ديالنا"],
    "here": ["ici", "hier", "qui", "aquí", "هنا"],
    "Base": ["Bas", "Tal", "Base", "Base", "التحت"],
    "Mid": ["Milieu", "Mitte", "Metà", "Medio", "الوسط"],
    "Top": ["Sommet", "Oben", "In alto", "Arriba", "الفوق"],
    "low ground": ["terrain bas", "tiefes Gelände", "terreno basso", "terreno bajo", "الأرض الهابطة"],
    "middle": ["milieu", "Mitte", "medio", "medio", "الوسط"],
    "high ground": ["terrain haut", "hohes Gelände", "terreno alto", "terreno alto", "الأرض العالية"],
    // new-snow bullets
    "big day": ["grosse journée", "großer Tag", "giornata grande", "gran día", "نهار كبير"],
    "Most new snow: +{a} {b}": ["Le plus de neige fraîche : +{a} {b}", "Am meisten Neuschnee: +{a} {b}", "Più neve fresca: +{a} {b}", "Más nieve nueva: +{a} {b}", "كثر تلج جديد: +{a} {b}"],
    "No new snow in the last 7 days": ["Pas de neige fraîche ces 7 derniers jours", "Kein Neuschnee in den letzten 7 Tagen", "Niente neve fresca negli ultimi 7 giorni", "Sin nieve nueva en los últimos 7 días", "ما كاينش تلج جديد فالسبع أيام اللي فاتو"],
    "No new snow expected in the next 7 days": ["Pas de neige fraîche attendue dans les 7 prochains jours", "Kein Neuschnee in den nächsten 7 Tagen erwartet", "Niente neve fresca prevista nei prossimi 7 giorni", "Sin nieve nueva prevista en los próximos 7 días", "ما متوقعش تلج جديد فالسبع أيام الجايين"],
    "at the top": ["au sommet", "oben", "in alto", "arriba", "فالفوق"],
    "at mid-mountain": ["à mi-montagne", "auf halber Höhe", "a metà montagna", "a media montaña", "فالوسط"],
    "at the base": ["en bas", "im Tal", "in basso", "en la base", "فالتحت"],
    "in 24 h": ["en 24 h", "in 24 Std.", "in 24 h", "en 24 h", "ف24 ساعة"],
    "in 48 h": ["en 48 h", "in 48 Std.", "in 48 h", "en 48 h", "ف48 ساعة"],
    "in 7 days": ["en 7 jours", "in 7 Tagen", "in 7 giorni", "en 7 días", "ف7 أيام"],
    // measured vs model
    "Our map agrees within {a} of the station": ["Notre carte est à {a} près de la station", "Unsere Karte liegt bis auf {a} bei der Station", "La nostra mappa è entro {a} dalla stazione", "Nuestro mapa coincide con la estación con {a} de diferencia", "الخريطة ديالنا قريبة من المحطة بـ {a}"],
    "Our map shows ~{a} more than the station": ["Notre carte montre ~{a} de plus que la station", "Unsere Karte zeigt ~{a} mehr als die Station", "La nostra mappa mostra ~{a} in più della stazione", "Nuestro mapa muestra ~{a} más que la estación", "الخريطة ديالنا كتبين ~{a} كثر من المحطة"],
    "Our map shows ~{a} less than the station": ["Notre carte montre ~{a} de moins que la station", "Unsere Karte zeigt ~{a} weniger als die Station", "La nostra mappa mostra ~{a} in meno della stazione", "Nuestro mapa muestra ~{a} menos que la estación", "الخريطة ديالنا كتبين ~{a} قل من المحطة"],
    "Measured at the station": ["Mesuré à la station", "An der Station gemessen", "Misurato alla stazione", "Medido en la estación", "مقاس فالمحطة"],
    "Our map here": ["Notre carte ici", "Unsere Karte hier", "La nostra mappa qui", "Nuestro mapa aquí", "الخريطة ديالنا هنا"],
    "Measured at the station and our map here, last days": ["Mesuré à la station et notre carte ici, derniers jours", "An der Station gemessen und unsere Karte hier, letzte Tage", "Misurato alla stazione e la nostra mappa qui, ultimi giorni", "Medido en la estación y nuestro mapa aquí, últimos días", "مقاس فالمحطة والخريطة ديالنا هنا، الأيام اللي فاتو"],
    // powder ranking
    "{a} got the most: +{b} {c}": ["{a} en a eu le plus : +{b} {c}", "{a} hat am meisten: +{b} {c}", "{a} ne ha avuta di più: +{b} {c}", "{a} recibió más: +{b} {c}", "{a} جاه الكثر: +{b} {c}"],
    "in 3 days": ["en 3 jours", "in 3 Tagen", "in 3 giorni", "en 3 días", "ف3 أيام"],
    "24 h": ["24 h", "24 Std.", "24 h", "24 h", "24 ساعة"],
    "3 days": ["3 jours", "3 Tage", "3 giorni", "3 días", "3 أيام"],
    "48 h": ["48 h", "48 Std.", "48 h", "48 h", "48 ساعة"],
    "7 days": ["7 jours", "7 Tage", "7 giorni", "7 días", "7 أيام"],
    "deep": ["de fond", "Schneehöhe", "di fondo", "de espesor", "علو"],
    "Top 10 for new snow": ["Top 10 neige fraîche", "Top 10 Neuschnee", "Top 10 neve fresca", "Top 10 nieve nueva", "أحسن 10 فالتلج الجديد"],
  };
  // a template -> the visitor's language, then {a} {b} {c} filled (values come already formatted with their units)
  function t(k, ...v) {
    const c = COL[LANG()];
    let r = c == null ? k : T[k] ? T[k][c] : window.I18N ? I18N.t(k) : k;
    v.forEach((x, i) => { r = r.split("{" + "abc"[i] + "}").join(x); });
    return r;
  }
  const dep = (cm) => U().depth(Math.max(0, Math.round(cm)));
  const el = (m) => U().elev(Math.round(m / 10) * 10);
  const monShort = (d) => D(d).toLocaleDateString(LOC(), { month: "short", timeZone: "UTC" }).replace(/\.$/, "");
  const dayMon = (d) => D(d).toLocaleDateString(LOC(), { day: "numeric", month: "short", timeZone: "UTC" });
  const wdS = (d) => D(d).toLocaleDateString(LOC(), { weekday: "short", timeZone: "UTC" }).replace(/\.$/, "");
  const wdL = (d) => D(d).toLocaleDateString(LOC(), { weekday: "long", timeZone: "UTC" });
  const period = (d) => { const n = D(d).getUTCDate(), m = D(d).toLocaleDateString(LOC(), { month: "long", timeZone: "UTC" });
    return t(n <= 10 ? "for early {a}" : n <= 20 ? "for mid {a}" : "for late {a}", m); };
  // nice round ticks 0..max (2-3 lines)
  function ticks(max, n = 3) {
    const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9)))), s = [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => q >= raw) || 10 * p;
    const out = []; for (let v = s; v < max * 0.98; v += s) out.push(v); return out;
  }
  // chart width = the real box width, so text stays 11-12 px on a phone (no viewBox shrink)
  const width = (box, min = 280, max = 560) => Math.max(min, Math.min(max, Math.round((box && box.clientWidth) || 340)));
  let SEQ = 0;
  const REG = new Map();          // chart id -> { xs:[px], tips:[html] } for the crosshair
  const wrap = (cls, title, svg, table, id, sub) => '<figure class="ssc ' + cls + '" data-noi18n' + (id ? ' data-ssc="' + id + '" tabindex="0"' : "") + ">" +
    (title ? '<figcaption class="ssc-t">' + esc(title) + (sub ? '<small>' + esc(sub) + "</small>" : "") + "</figcaption>" : "") + '<div class="ssc-p">' + svg + '<div class="ssc-tip" hidden></div></div>' +
    (table ? '<table class="sr">' + table + "</table>" : "") + "</figure>";
  const trow = (cells, th) => "<tr>" + cells.map((c, i) => (th || i === 0 ? "<th>" : "<td>") + esc(c) + (th || i === 0 ? "</th>" : "</td>")).join("") + "</tr>";
  // label collision boxes
  const hits = (boxes, b) => boxes.some((q) => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y);
  const tw = (s, px = 11) => String(s).length * px * 0.56;

  // ======================================================================== 1. season curve vs past winters
  // o: { box, start, end, today, series:[{d, v, fc}], clim(key, date) -> value | null, lockFrom (date, free users), H }
  const EPI = 50;     // HISTORY rule: below 50 % of winters with snow on a date -> the "when snowy" band
  function season(o) {
    const W = o.W || width(o.box, 280, 620), H = o.H || 210, top = 16, bot = 22, L = 4, R = 6;
    const start = o.start, end = o.end, n = days(start, end), today = o.today;
    const g = (k, d) => (o.clim ? o.clim(k, d) : null);
    const ser = o.series.filter((p) => p.v != null && p.d >= start && p.d <= end).sort((a, b) => (a.d < b.d ? -1 : 1));
    const sv = ser.map((p) => p.v);
    const strip = o.clim && Array.from({ length: n + 1 }, (_, k) => g("snow_days_pct", addDays(start, k))).some((f) => f != null && f < EPI);
    const SH = strip ? 10 : 0;        // the "winters with snow" strip under the axis (its own panel, not a 2nd axis)
    let max = Math.max(10, ...sv);      // scale: this season and the 10-90 % band; the lowest-highest envelope may run off the top
    for (let k = 0; k <= n; k += 3) { const v = g("p90", addDays(start, k)); if (v != null) max = Math.max(max, v); }
    max *= 1.12;
    const y0 = H - bot - SH;
    const X = (d) => L + (days(start, d) / n) * (W - L - R), Y = (v) => y0 - (Math.min(Math.max(v, 0), max) / max) * (y0 - top);
    const epi = (d) => { const f = g("snow_days_pct", d); return f != null && f < EPI && g("wet_p25", d) != null; };
    const band = (lo, hi, want) => {
      let out = "", a = "", b = "";
      const flush = () => { if (a) out += a + b + "Z"; a = ""; b = ""; };
      for (let k = 0; k <= n; k++) {
        const d = addDays(start, k), l = g(lo, d), u = g(hi, d);
        if (l == null || u == null || (want != null && epi(d) !== want)) { flush(); continue; }
        a += (a ? "L" : "M") + f1(X(d)) + "," + f1(Y(u)); b = "L" + f1(X(d)) + "," + f1(Y(l)) + b;
      }
      flush(); return out;
    };
    const line = (key, want) => { let s = "", on = false; for (let k = 0; k <= n; k++) { const d = addDays(start, k), v = g(key, d); if (v == null || (want != null && epi(d) !== want)) { on = false; continue; } s += (on ? "L" : "M") + f1(X(d)) + "," + f1(Y(v)); on = true; } return s; };
    const path = (pts) => pts.map((p, i) => (i ? "L" : "M") + f1(X(p.d)) + "," + f1(Y(p.v))).join("");
    const past = ser.filter((p) => p.d <= today && !p.fc), fut = ser.filter((p) => p.d >= today && (p.fc || p.d > today));
    const now = past.length ? past[past.length - 1] : null;
    if (now && fut.length && fut[0].d > now.d) fut.unshift(now);
    // takeaway title
    let title = t("This season so far");
    const tv = now && now.d >= addDays(today, -2) ? now.v : null;
    if (o.clim && tv != null) {
      const p10 = g("p10", today), p25 = g("p25", today), p50 = g("p50", today), p75 = g("p75", today), p90 = g("p90", today), pr = period(today);
      if (epi(today)) title = tv < 1 && (g("snow_days_pct", today) || 0) < 20 ? t("No snow yet, as usual {a}", pr) : t("Snow comes and goes here {a}", pr);
      else if (p50 != null) {
        const lo = p25 != null ? p25 : p50 * 0.8 - 2, hi = p75 != null ? p75 : p50 * 1.2 + 2;
        title = tv < 1 && p50 < 1 ? t("No snow yet, as usual {a}", pr) : p90 != null && tv > p90 ? t("Much deeper than usual {a}", pr) : tv > hi ? t("Deeper than usual {a}", pr)
          : p10 != null && tv < p10 ? t("Much less snow than usual {a}", pr) : tv < lo ? t("Less snow than usual {a}", pr) : t("About as much snow as usual {a}", pr);
      }
    }
    if (o.title) title = o.title;
    let s = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(title + ". " + t("Snow depth this season compared with past winters")) + '">';
    // grid
    const boxes = [];
    for (const v of ticks(max / 1.12)) { s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '"/><text class="ax" x="' + (L + 1) + '" y="' + f1(Y(v) - 3) + '">' + esc(dep(v)) + "</text>"; boxes.push({ x: L, y: Y(v) - 13, w: tw(dep(v)) + 4, h: 12 }); }
    if (o.clim) {
      s += '<path class="b0" d="' + band("min", "max") + '"/><path class="b1" d="' + band("p10", "p90") + '"/>' +
        '<path class="b2" d="' + band("p25", "p75", false) + '"/><path class="b2 wet" d="' + band("wet_p25", "wet_p75", true) + '"/>' +
        '<path class="md" d="' + line("p50", false) + '"/><path class="md wet" d="' + line("typical_when_snowy_cm", true) + '"/>';
    }
    s += '<line class="ax0" x1="' + L + '" x2="' + (W - R) + '" y1="' + y0 + '" y2="' + y0 + '"/>';
    // month ticks
    for (let k = 0; k <= n; k++) { const d = addDays(start, k); if (d.slice(8) === "01" && X(d) < W - 18) s += '<text class="ax" x="' + f1(X(d) + 2) + '" y="' + (H - 6) + '">' + esc(monShort(d)) + "</text>"; }
    // the "winters with snow" strip: one cell per 3 days, darker = more winters with snow on that date
    if (strip) {
      for (let k = 0; k <= n; k += 3) { const d = addDays(start, k), f = g("snow_days_pct", d); if (f == null) continue;
        s += '<rect class="fq" x="' + f1(X(d)) + '" y="' + (y0 + 3) + '" width="' + f1(Math.max(1, (3 / n) * (W - L - R))) + '" height="5" style="opacity:' + (0.08 + 0.92 * f / 100).toFixed(2) + '"/>'; }
    }
    // today
    const tx = X(today);
    s += '<line class="tl" x1="' + f1(tx) + '" x2="' + f1(tx) + '" y1="' + top + '" y2="' + y0 + '"/>';
    // forecast continuation (+ its range when given)
    if (fut.length > 1) {
      const rg = fut.filter((p) => p.lo != null && p.hi != null);
      if (rg.length > 1) s += '<path class="fcb" d="M' + rg.map((p) => f1(X(p.d)) + "," + f1(Y(p.hi))).join("L") + "L" + rg.slice().reverse().map((p) => f1(X(p.d)) + "," + f1(Y(p.lo))).join("L") + 'Z"/>';
      s += '<path class="fc" d="' + path(fut) + '"/>';
    }
    if (past.length) s += '<path class="cur" d="' + path(past) + '"/>';
    // lock (free users: days beyond the free window)
    if (o.lockFrom && o.lockFrom < end) { const lx = X(o.lockFrom); s += '<rect class="lock" x="' + f1(lx) + '" y="' + top + '" width="' + f1(W - R - lx) + '" height="' + (y0 - top) + '"/><text class="lbl" x="' + f1((lx + W) / 2) + '" y="' + f1((top + y0) / 2) + '" text-anchor="middle">PRO</text>'; }
    // annotations: today's value, the 2-3 biggest storms this season (past days only), direct labels for the bands
    if (now) {
      const lab = t("Today") + " " + dep(now.v), w = tw(lab, 12) + 4, ny = Y(now.v), ly = ny - 10 < top + 8 ? ny + 20 : ny - 10;
      const lx = Math.min(W - R - w, Math.max(L, X(now.d) - w / 2));
      s += '<circle class="now" cx="' + f1(X(now.d)) + '" cy="' + f1(ny) + '" r="5"/><text class="vl" x="' + f1(lx) + '" y="' + f1(ly) + '">' + esc(lab) + "</text>";
      boxes.push({ x: lx, y: ly - 12, w, h: 14 }, { x: X(now.d) - 6, y: ny - 6, w: 12, h: 12 });
    }
    const storms = stormsOf(ser.filter((p) => p.d <= today && !p.fc)).slice(0, 3);
    for (const q of storms) {
      const x = X(q.d), y = Y(q.v), lab = "+" + dep(q.gain) + " · " + dayMon(q.d), w = tw(lab, 10.5) + 2;
      const lx = Math.min(W - R - w, Math.max(L, x - w / 2)), ly = y - 9 < top + 4 ? y + 16 : y - 9, b = { x: lx, y: ly - 10, w, h: 12 };
      if (hits(boxes, b)) continue;
      boxes.push(b);
      s += '<circle class="st" cx="' + f1(x) + '" cy="' + f1(y) + '" r="3"/><text class="an" x="' + f1(lx) + '" y="' + f1(ly) + '">' + esc(lab) + "</text>";
    }
    if (o.clim) {     // "past winters" inside the 10-90 band at its widest point, "usual" on the median there
      let bk = -1, bw = 0;
      for (let k = 0; k <= n; k += 2) { const d = addDays(start, k), a = g("p90", d), b = g("p10", d); if (a != null && b != null && a - b > bw && X(d) > 50 && X(d) < W - 90 && Math.abs(X(d) - tx) > 60) { bw = a - b; bk = k; } }
      if (bk >= 0) {
        const d = addDays(start, bk), x = X(d) - 20;
        const ly1 = Y(g("p90", d)) + 13, lb1 = { x, y: ly1 - 10, w: tw(t("past winters"), 10.5), h: 12 };
        if (Y(g("p10", d)) - Y(g("p90", d)) > 34 && !hits(boxes, lb1)) { s += '<text class="bl" x="' + f1(x) + '" y="' + f1(ly1) + '">' + esc(t("past winters")) + "</text>"; boxes.push(lb1); }
        const ep = epi(d), mv = g(ep ? "typical_when_snowy_cm" : "p50", d);
        if (mv != null) { const ly2 = Y(mv) - 5, lb2 = { x, y: ly2 - 10, w: tw(t("usual"), 10.5), h: 12 };
          if (!hits(boxes, lb2) && Math.abs(ly2 - ly1) > 12) { s += '<text class="ul" x="' + f1(x) + '" y="' + f1(ly2) + '">' + esc(t(ep ? "usual when snowy" : "usual")) + "</text>"; boxes.push(lb2); } }
      }
    }
    if (strip) s += '<text class="ax sm" x="' + f1(W - R) + '" y="' + (y0 + 17) + '" text-anchor="end">' + esc(t("winters with snow")) + "</text>";
    s += "</svg>";
    // crosshair data + the screen-reader table (1st and 15th of each month up to the last value)
    const id = "s" + ++SEQ, xs = [], tips = [], byD = Object.fromEntries(ser.map((p) => [p.d, p])), rows = [];
    const lastD = ser.length ? ser[ser.length - 1].d : today;
    for (let k = 0; k <= n; k++) {
      const d = addDays(start, k), p = byD[d], ep = epi(d), u = g(ep ? "typical_when_snowy_cm" : "p50", d), lo = g("p10", d), hi = g("p90", d);
      xs.push(X(d));
      tips.push("<b>" + esc(dayMon(d)) + "</b>" + (p ? "<span><i class=\"k cur\"></i>" + esc(t("this season")) + " " + esc(dep(p.v)) + "</span>" : "") +
        (u != null ? '<span><i class="k md"></i>' + esc(t(ep ? "usual when snowy" : "usual")) + " " + esc(dep(u)) + "</span>" : "") +
        (lo != null && hi != null ? '<span><i class="k b1"></i>' + esc(t("most winters")) + " " + esc(U().dep(lo) + "–" + dep(hi)) + "</span>" : ""));
      if ((d.slice(8) === "01" || d.slice(8) === "15") && d <= lastD) rows.push(trow([dayMon(d), p ? dep(p.v) : "–", u != null ? dep(u) : "–", lo != null && hi != null ? U().dep(lo) + "–" + dep(hi) : "–"]));
    }
    REG.set(id, { xs, tips, y0: top, y1: y0 });
    const table = "<caption>" + esc(t("Snow depth this season compared with past winters")) + "</caption>" + trow([t("Date"), t("this season"), t("usual"), t("most winters")], true) + rows.join("");
    const key = o.key ? '<div class="ssc-key"><span><i class="k cur"></i>' + esc(t("this season")) + '</span><span><i class="k md"></i>' + esc(t("usual")) + '</span><span><i class="k b2"></i>25–75 %</span><span><i class="k b1"></i>10–90 %</span><span><i class="k b0"></i>' +
      esc(t("Past winters, lowest – highest")) + "</span></div>" : "";
    return { title, html: wrap("c-season", title, s, table, id).replace("</figure>", key + "</figure>") };
  }
  // storms: runs of rising depth (or the given new snow), the gain over each run, biggest first
  function stormsOf(ser) {
    const out = [];
    let run = null;
    for (let i = 1; i < ser.length; i++) {
      const a = ser[i - 1], b = ser[i], nw = b.nw != null && b.nw >= 1 ? b.nw : null, up = nw != null ? nw : b.v - a.v;
      if (up >= 2 && days(a.d, b.d) <= 2) { if (!run) run = { gain: 0 }; run.gain += up; run.d = b.d; run.v = b.v; }
      else if (run) { out.push(run); run = null; }
    }
    if (run) out.push(run);
    return out.filter((q) => q.gain >= 5).sort((a, b) => b.gain - a.gain);
  }

  // ======================================================================== 2. winter strip (one dot per past winter)
  // o: { box, by:[{season, today_cm}], v (today), q25, q50, q75, wetOn, title (the rank sentence), lastSeason }
  function strip(o) {
    const W = o.W || width(o.box, 280, 620), r = 4.6, L = 10, R = 10;
    const ys = o.by.map((y) => y.today_cm), mx = Math.max(10, o.v, ...ys) * 1.05;
    const X = (cm) => L + (Math.max(0, cm) / mx) * (W - L - R);
    // beeswarm: dots sorted by depth, each sits as low as it can without touching a neighbour
    const placed = [], dots = o.by.map((y) => ({ y, x: X(y.today_cm) })).sort((a, b) => a.x - b.x);
    const MAXR = 5, more = [];      // a pile taller than 6 dots (many winters at 0) is capped, "+N" on top
    for (const d of dots) {
      let row = 0;
      while (placed.some((p) => p.row === row && Math.abs(p.x - d.x) < 2 * r + 1) && row <= MAXR) row++;
      if (row > MAXR) { d.hide = true; const m = more.find((q) => Math.abs(q.x - d.x) < 2 * r + 1); if (m) m.n++; else more.push({ x: d.x, n: 1 }); continue; }
      d.row = row; placed.push(d);
    }
    const rows = Math.max(1, ...dots.filter((d) => !d.hide).map((d) => d.row + 1)) + (more.length ? 1 : 0), top = 30, base = top + rows * (2 * r + 1) + 6, H = base + 36;
    const sz = (s) => String(s).replace("-", "–");
    let s = '<svg class="chart wstrip" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="' + esc(o.title) + '">';
    if (o.q25 != null && o.q75 != null) s += '<rect class="ws-iq" x="' + f1(X(o.q25)) + '" y="' + (top - 4) + '" width="' + f1(Math.max(2, X(o.q75) - X(o.q25))) + '" height="' + (base - top + 8) + '" rx="6"/>';
    s += '<line class="ws-ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + (base + 4) + '" y2="' + (base + 4) + '"/>';
    if (o.q50 != null) s += '<line class="ws-md" x1="' + f1(X(o.q50)) + '" x2="' + f1(X(o.q50)) + '" y1="' + (top - 6) + '" y2="' + (base + 8) + '"/>';
    const best = dots.reduce((a, b) => (b.y.today_cm > a.y.today_cm ? b : a), dots[0]);
    const worst = dots.reduce((a, b) => (b.y.today_cm < a.y.today_cm ? b : a), dots[0]);
    const last = o.lastSeason ? dots.find((d) => d.y.season === o.lastSeason) : null;
    for (const m of more) s += '<text class="ws-t b" x="' + f1(m.x) + '" y="' + f1(base - 2 * r - (MAXR + 1) * (2 * r + 1) + 6) + '" text-anchor="middle">+' + m.n + "</text>";
    for (const d of dots) {
      if (d.hide) continue;
      const lab = sz(d.y.season) + ": " + dep(d.y.today_cm);
      s += '<circle cx="' + f1(d.x) + '" cy="' + f1(base - r - d.row * (2 * r + 1)) + '" r="' + r + '" fill="' + o.col(d.y.today_cm) + '" class="ws-dot' + (d === last ? " last" : "") + '" tabindex="0" role="button" data-ws="' + esc(lab) + '" data-tip="' + esc(lab) + '" aria-label="' + esc(lab) + '"/>';
    }
    // labels under the axis: last winter first, then best, then least; skipped when they would overlap
    const boxes = [], tx = X(o.v);
    const put = (d, k) => {
      if (!d) return;
      const a = t(k), b = sz(d.y.season) + " · " + dep(d.y.today_cm), w = Math.max(tw(a, 10.5), tw(b, 10.5)) + 4;
      const x = Math.min(W - R - w, Math.max(L, d.x - w / 2)), bx = { x, y: base + 8, w, h: 26 };
      if (hits(boxes, bx)) return;
      boxes.push(bx);
      s += '<line class="ws-ld" x1="' + f1(d.x) + '" x2="' + f1(d.x) + '" y1="' + (base + 4) + '" y2="' + (base + 9) + '"/><text class="ws-t" x="' + f1(x) + '" y="' + (base + 19) + '">' + esc(a) + '</text><text class="ws-t b" x="' + f1(x) + '" y="' + (base + 31) + '">' + esc(b) + "</text>";
    };
    put(last, "last winter");
    if (best && best.y.today_cm >= 1) put(best, "best");
    if (worst && worst !== best && dots.filter((d) => Math.abs(d.y.today_cm - worst.y.today_cm) < 0.5).length < 3) put(worst, "least");
    // today: the big marker, its value on top
    const lab = t("Today") + " " + dep(o.v), w = tw(lab, 13) + 4, lx = Math.min(W - R - w, Math.max(L, tx - w / 2));
    s += '<line class="ws-ml" x1="' + f1(tx) + '" x2="' + f1(tx) + '" y1="16" y2="' + (base + 4) + '"/><circle cx="' + f1(tx) + '" cy="' + f1(base - r) + '" r="8.5" fill="' + o.col(o.v) + '" class="ws-me"/>' +
      '<text class="ws-v" x="' + f1(lx) + '" y="12">' + esc(lab) + "</text>";
    if (o.q50 != null && Math.abs(X(o.q50) - tx) > 40) s += '<text class="ws-u" x="' + f1(X(o.q50) + 4) + '" y="' + (top + 4) + '">' + esc(t(o.wetOn ? "usual when snowy" : "usual")) + "</text>";
    s += "</svg>";
    const table = "<caption>" + esc(o.title) + "</caption>" + trow([t("Winter"), t("Depth on this date")], true) +
      o.by.slice().sort((a, b) => b.today_cm - a.today_cm).map((y) => trow([sz(y.season), dep(y.today_cm)])).join("");
    return { title: o.title, html: wrap("c-strip", "", s, table, null) };
  }

  // ======================================================================== 2b. past winters on this date (owner 2026-11-06)
  // One plain answer to "is there more or less snow than usual here today?", from the exact per-winter values on this
  // date (compare.by_year). o: { by:[{season, today_cm}], v (today, cm), date } -> { head, sub, rank, ... } | null.
  // Rare-snow dates (fewer than half of the winters had snow) are said plainly ("Only 2 in 10 winters had snow...").
  const qtl = (s, q) => { if (!s.length) return null; const i = (s.length - 1) * q, a = Math.floor(i), b = Math.ceil(i); return s[a] + (s[b] - s[a]) * (i - a); };
  function verdict(o) {
    const ys = (o.by || []).map((y) => y.today_cm).filter((y) => y != null), n = ys.length;
    if (n < 3 || o.v == null) return null;
    const v = Math.max(0, o.v), has = v >= 1, srt = ys.slice().sort((a, b) => a - b), mx = srt[n - 1];
    const snowy = ys.filter((y) => y >= 1).length, wet = srt.filter((y) => y >= 1), med = qtl(srt, 0.5), wetMed = qtl(wet, 0.5);
    const less = has ? ys.filter((y) => y < v - 0.5).length : 0, more = ys.filter((y) => y >= 1 && y > v + 0.5).length, ties = n - less - more;
    const p = (less + ties / 2) / n, pr = period(o.date), day = dayMon(o.date);
    const in10 = (k) => Math.min(9, Math.max(1, Math.round((10 * k) / n)));
    let head, sub = "", rank, tone;
    if (snowy / n < 0.5) {          // snow is the exception on this date
      head = has ? t("Snow is unusual here {a}", pr) : t("No snow yet, as usual {a}", pr);
      tone = has ? "more" : "same";
      sub = has ? t("Today {a} · most winters have none on {b}", dep(v), day) : snowy && wetMed != null ? t("When there was snow on {a}, usually about {b}", day, dep(wetMed)) : "";
      rank = !snowy ? t("No past winter had snow on this date") : snowy <= 3 ? t("Only {a} of the last {b} winters had snow on this date", snowy, n) : t("Only {a} in 10 winters had snow on this date", in10(snowy));
      if (has && v > mx + 0.5) rank = t("More snow than any past winter on this date");
    } else if (!has) {
      head = t("No snow yet, though most winters have some by now"); tone = "less";
      const u = med >= 1 ? med : wetMed;
      sub = u != null ? t("Usually about {a} on {b}", dep(u), day) : "";
      rank = snowy === n ? t("Every past winter had snow on this date") : t("{a} in 10 winters had snow on this date", in10(snowy));
    } else {
      head = t(p >= 0.9 ? "Much more snow than usual {a}" : p >= 0.6 ? "More snow than usual {a}" : p > 0.4 ? "About as much snow as usual {a}" : p > 0.1 ? "Less snow than usual {a}" : "Much less snow than usual {a}", pr);
      tone = p >= 0.6 ? "more" : p > 0.4 ? "same" : "less";
      sub = t("Today {a} · usually about {b} on {c}", dep(v), dep(Math.max(med, 0)), day);
      rank = less === n ? t("More snow than any past winter on this date") : more === n ? t("Less snow than any past winter on this date")
        : p >= 0.45 && p <= 0.55 ? t("Right in the middle of past winters")
        : p >= 0.5 ? t("More snow than {a} in 10 past winters", in10(less)) : t("Less snow than {a} in 10 past winters", in10(more));
    }
    return { head, sub, rank, tone, n, snowy, less, more, med, wetMed, v };
  }
  // rounded-top column anchored to the baseline
  const col = (x, y0, w, h, r) => { r = Math.min(r, w / 2, h); return "M" + f1(x) + "," + f1(y0) + "V" + f1(y0 - h + r) + "Q" + f1(x) + "," + f1(y0 - h) + " " + f1(x + r) + "," + f1(y0 - h) +
    "H" + f1(x + w - r) + "Q" + f1(x + w) + "," + f1(y0 - h) + " " + f1(x + w) + "," + f1(y0 - h + r) + "V" + f1(y0) + "Z"; };
  // the rank bars: every past winter on this date as one column, sorted from least to most snow, today's column in the
  // accent at its rank, the usual depth as a hairline. o: { W, by, v, date, lastSeason, title }
  function rankBars(o) {
    const W = o.W || width(o.box, 280, 620), by = o.by.filter((y) => y.today_cm != null), vd = verdict(o);
    if (!vd) return { html: "" };
    const v = Math.max(0, o.v), past = by.slice().sort((a, b) => a.today_cm - b.today_cm);
    const at = vd.less + Math.floor((by.length - vd.less - vd.more) / 2) * (v >= 1 ? 1 : 0);
    const items = past.map((y) => ({ cm: y.today_cm, season: y.season })); items.splice(v >= 1 ? at : 0, 0, { cm: v, me: true });
    const N = items.length, top = 22, ph = 104, y0 = top + ph, H = y0 + 26, slot = W / N, gap = slot >= 6 ? 2 : 1, bw = Math.max(1.5, slot - gap);
    const mx = Math.max(5, ...items.map((q) => q.cm)) * 1.08, Y = (cm) => Math.max(0, Math.min(1, cm / mx)) * ph;
    const sz = (s) => String(s).replace("-", "–");
    let s = '<svg class="chart rbars" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.title || vd.rank) + '">';
    const boxes = [];
    items.forEach((q, i) => {
      const x = i * slot + gap / 2, h = q.cm >= 1 ? Math.max(3, Y(q.cm)) : 2, lab = q.me ? t("Today") + " " + dep(q.cm) : sz(q.season) + ": " + dep(q.cm);
      s += '<g class="hit" data-tip="' + esc(lab) + '"><rect class="hb" x="' + f1(i * slot) + '" y="' + top + '" width="' + f1(slot) + '" height="' + ph + '"/>' +
        '<path class="rb' + (q.me ? " me" : q.cm < 1 ? " z" : "") + (q.season && q.season === o.lastSeason ? " last" : "") + '" d="' + col(x, y0, bw, h, 2) + '"/></g>';
      q.x = x + bw / 2; q.h = h;
    });
    s += '<line class="ax0" x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '"/>';
    // the usual depth on this date (median of past winters) as a hairline, labelled at the end with the most room
    if (vd.med >= 1) {
      const uy = y0 - Y(vd.med), lab = t("usual") + " " + dep(vd.med), w = tw(lab, 10.5) + 4;
      s += '<line class="ru" x1="0" x2="' + W + '" y1="' + f1(uy) + '" y2="' + f1(uy) + '"/>';
      const meX = (items.findIndex((q) => q.me) + 0.5) * slot, lx = meX < W / 2 ? W - w : 2, b = { x: lx, y: uy - 13, w, h: 12 };
      s += '<text class="ul" x="' + lx + '" y="' + f1(uy - 4) + '">' + esc(lab) + "</text>"; boxes.push(b);
    }
    // today: label above its column (marker dot when the column is only a stub)
    const me = items.find((q) => q.me), lab = t("Today") + " " + dep(v), w = tw(lab, 12) + 4;
    const ly = Math.max(12, y0 - me.h - 6), lx = Math.min(W - w, Math.max(0, me.x - w / 2));
    // label at the top of the plot, a leader down to today's column (so it never sits on the usual line)
    const ty = 12;
    s += '<line class="rld" x1="' + f1(me.x) + '" x2="' + f1(me.x) + '" y1="' + (ty + 4) + '" y2="' + f1(y0 - me.h - 2) + '"/>';
    if (me.h < 4) s += '<circle class="rme" cx="' + f1(me.x) + '" cy="' + f1(y0 - 5) + '" r="4"/>';
    s += '<text class="vl" x="' + f1(lx) + '" y="' + ty + '">' + esc(lab) + "</text>";
    boxes.push({ x: lx, y: 0, w, h: 16 });
    // the snowiest past winter, labelled on its column when there is room
    const best = items.filter((q) => !q.me).slice(-1)[0];
    if (best && best.cm >= 1) {
      const bl = sz(best.season) + " · " + dep(best.cm), bw2 = tw(bl, 10.5) + 4, bx = Math.min(W - bw2, Math.max(0, best.x - bw2 / 2)), by2 = Math.max(10, y0 - best.h - 5), bb = { x: bx, y: by2 - 11, w: bw2, h: 12 };
      if (!hits(boxes, bb)) { s += '<text class="an" x="' + f1(bx) + '" y="' + f1(by2) + '">' + esc(bl) + "</text>"; boxes.push(bb); }
    }
    // under the axis: the run of winters with no snow, then the reading direction
    const zs = items.filter((q) => !q.me && q.cm < 1).length, zi = items.map((q, i) => (!q.me && q.cm < 1 ? i : -1)).filter((i) => i >= 0);
    let zb = null;
    if (zs >= 3) {
      const x1 = zi[0] * slot + 1, x2 = (zi[zi.length - 1] + 1) * slot - 1, zl = t("no snow") + " (" + zs + ")";
      s += '<path class="zbr" d="M' + f1(x1) + "," + (y0 + 5) + "V" + (y0 + 9) + "H" + f1(x2) + "V" + (y0 + 5) + '"/>';
      const zx = Math.min(W - tw(zl, 10.5) - 2, Math.max(0, (x1 + x2) / 2 - tw(zl, 10.5) / 2));
      s += '<text class="bl" x="' + f1(zx) + '" y="' + (y0 + 21) + '">' + esc(zl) + "</text>"; zb = { x: zx, w: tw(zl, 10.5) };
    }
    const ll = t("least snow"), rl = t("most snow") + " →";
    if (!zb || zb.x > tw("← " + ll, 10.5) + 8) s += '<text class="ax" x="0" y="' + (y0 + 21) + '">' + esc("← " + ll) + "</text>";
    if (!zb || zb.x + zb.w < W - tw(rl, 10.5) - 8) s += '<text class="ax" x="' + W + '" y="' + (y0 + 21) + '" text-anchor="end">' + esc(rl) + "</text>";
    s += "</svg>";
    const table = "<caption>" + esc(o.title || vd.rank) + "</caption>" + trow([t("Winter"), t("Depth on this date")], true) + trow([t("Today"), dep(v)]) +
      past.slice().reverse().map((y) => trow([sz(y.season), dep(y.today_cm)])).join("");
    return { title: o.title || vd.rank, html: wrap("c-rank", o.title || vd.rank, s, table, null, t("One bar per past winter on {a}, least to most snow", dayMon(o.date))), verdict: vd };
  }
  // the season as percentile bands of past winters (10-90 % and 25-75 %), the usual line, this winter, its forecast and
  // today. Window: ~8 weeks either side of today inside the season (o.start / o.end override, e.g. the whole season).
  // o: { W, today, series:[{d, v, fc}], clim(key, date), lockFrom, start, end, title, H }
  function bands(o) {
    const W = o.W || width(o.box, 280, 620), H = o.H || 200, top = 12, bot = 22, L = 4, R = 6, today = o.today;
    const sy = +today.slice(0, 4) - (+today.slice(5, 7) >= 8 ? 0 : 1), s0 = sy + "-10-01", s1 = (sy + 1) + "-06-15";
    const fcEnd = (o.series || []).reduce((m, p) => (p.d > m ? p.d : m), today);
    let start = o.start || (addDays(today, -42) < s0 ? s0 : addDays(today, -42));
    let end = o.end || (addDays(today, 42) > s1 ? s1 : addDays(today, 42));
    if (!o.end && fcEnd > end) end = fcEnd;
    if (!o.start && days(start, end) < 84) start = addDays(end, -84) < s0 ? s0 : addDays(end, -84);
    if (!o.end && days(start, end) < 84) end = addDays(start, 84);
    const n = days(start, end), g = (k, d) => (o.clim ? o.clim(k, d) : null);
    const ser = (o.series || []).filter((p) => p.v != null && p.d >= start && p.d <= end).sort((a, b) => (a.d < b.d ? -1 : 1));
    let max = Math.max(10, ...ser.map((p) => p.v));
    for (let k = 0; k <= n; k += 2) { const v = g("p90", addDays(start, k)); if (v != null) max = Math.max(max, v); }
    max *= 1.1;
    const y0 = H - bot, X = (d) => L + (days(start, d) / n) * (W - L - R), Y = (v) => y0 - (Math.min(Math.max(v, 0), max) / max) * (y0 - top);
    const band = (lo, hi) => { let a = "", b = "", out = "";
      for (let k = 0; k <= n; k++) { const d = addDays(start, k), l = g(lo, d), u = g(hi, d); if (l == null || u == null) { if (a) out += a + b + "Z"; a = b = ""; continue; }
        a += (a ? "L" : "M") + f1(X(d)) + "," + f1(Y(u)); b = "L" + f1(X(d)) + "," + f1(Y(l)) + b; }
      return a ? out + a + b + "Z" : out; };
    const line = (key) => { let s = "", on = false; for (let k = 0; k <= n; k++) { const d = addDays(start, k), v = g(key, d); if (v == null) { on = false; continue; } s += (on ? "L" : "M") + f1(X(d)) + "," + f1(Y(v)); on = true; } return s; };
    const path = (pts) => pts.map((p, i) => (i ? "L" : "M") + f1(X(p.d)) + "," + f1(Y(p.v))).join("");
    const past = ser.filter((p) => p.d <= today && !p.fc), fut = ser.filter((p) => p.d > today || p.fc);
    const now = past.length ? past[past.length - 1] : null;
    if (now && fut.length && fut[0].d > now.d) fut.unshift(now);
    const title = o.title || t("This winter against past winters");
    let s = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(title) + '">';
    const boxes = [];
    const dt = U().us() ? ticks(max / 1.1 / 2.54).map((i) => i * 2.54) : ticks(max / 1.1);      // round numbers in the shown unit
    for (const v of dt) { s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '"/><text class="ax" x="' + (L + 1) + '" y="' + f1(Y(v) - 3) + '">' + esc(dep(v)) + "</text>"; boxes.push({ x: L, y: Y(v) - 13, w: tw(dep(v)) + 4, h: 12 }); }
    const has25 = !!line("p25");
    if (o.clim) s += '<path class="q1" d="' + band("p10", "p90") + '"/>' + (has25 ? '<path class="q2" d="' + band("p25", "p75") + '"/>' : "") + '<path class="q50" d="' + line("p50") + '"/>';
    s += '<line class="ax0" x1="' + L + '" x2="' + (W - R) + '" y1="' + y0 + '" y2="' + y0 + '"/>';
    const span = n > 160;
    for (let k = 0; k <= n; k++) { const d = addDays(start, k); if ((d.slice(8) === "01" || (!span && d.slice(8) === "15")) && X(d) < W - 22 && X(d) > 14) s += '<line class="tk" x1="' + f1(X(d)) + '" x2="' + f1(X(d)) + '" y1="' + y0 + '" y2="' + (y0 + 4) + '"/><text class="ax" x="' + f1(X(d)) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.slice(8) === "01" ? monShort(d) : dayMon(d)) + "</text>"; }
    if (o.lockFrom && o.lockFrom < end) { const lx = X(o.lockFrom); s += '<rect class="lock" x="' + f1(lx) + '" y="' + top + '" width="' + f1(W - R - lx) + '" height="' + (y0 - top) + '"/><text class="lbl" x="' + f1((lx + W) / 2) + '" y="' + f1((top + y0) / 2) + '" text-anchor="middle">PRO</text>'; }
    const tx = X(today);
    if (tx >= L && tx <= W - R) s += '<line class="tl" x1="' + f1(tx) + '" x2="' + f1(tx) + '" y1="' + top + '" y2="' + y0 + '"/>';
    if (fut.length > 1) s += '<path class="fc" d="' + path(fut) + '"/>';
    if (past.length) s += '<path class="cur" d="' + path(past) + '"/>';
    if (now) {
      const lab = t("Today") + " " + dep(now.v), w = tw(lab, 12) + 4, ny = Y(now.v), ly = ny - 10 < top + 10 ? ny + 20 : ny - 10;
      const lx = Math.min(W - R - w, Math.max(L, X(now.d) - w / 2));
      s += '<circle class="now" cx="' + f1(X(now.d)) + '" cy="' + f1(ny) + '" r="5"/><text class="vl" x="' + f1(lx) + '" y="' + f1(ly) + '">' + esc(lab) + "</text>";
      boxes.push({ x: lx, y: ly - 12, w, h: 14 }, { x: X(now.d) - 6, y: ny - 6, w: 12, h: 12 });
    }
    // direct labels: "usual" on the median, "normal" inside the 25-75 band, at the widest point away from today
    if (o.clim) {
      let bk = -1, bw = 0;
      for (let k = 0; k <= n; k += 2) { const d = addDays(start, k), a = g("p75", d), b = g("p25", d); if (a != null && b != null && a - b > bw && X(d) > 40 && X(d) < W - 70 && Math.abs(X(d) - tx) > 56) { bw = a - b; bk = k; } }
      if (bk >= 0) {
        const d = addDays(start, bk), x = X(d) - 18, m = g("p50", d);
        if (m != null && m >= 1) { const ly = Y(m) - 5, b = { x, y: ly - 10, w: tw(t("usual"), 10.5), h: 12 }; if (!hits(boxes, b)) { s += '<text class="ul" x="' + f1(x) + '" y="' + f1(ly) + '">' + esc(t("usual")) + "</text>"; boxes.push(b); } }
        const ny = Y(g("p75", d)) + 12, nb = { x, y: ny - 10, w: tw(t("normal"), 10.5), h: 12 };
        if (Y(g("p25", d)) - Y(g("p75", d)) > 30 && Math.abs(ny - (Y(m || 0) - 5)) > 12 && !hits(boxes, nb)) { s += '<text class="bl" x="' + f1(x) + '" y="' + f1(ny) + '">' + esc(t("normal")) + "</text>"; boxes.push(nb); }
      }
    }
    s += "</svg>";
    const id = "s" + ++SEQ, xs = [], tips = [], byD = Object.fromEntries(ser.map((p) => [p.d, p])), rows = [];
    for (let k = 0; k <= n; k++) {
      const d = addDays(start, k), p = byD[d], u = g("p50", d), q25 = g("p25", d), q75 = g("p75", d), lo = g("p10", d), hi = g("p90", d);
      xs.push(X(d));
      tips.push("<b>" + esc(dayMon(d)) + "</b>" + (p ? '<span><i class="k ' + (p.d > today || p.fc ? "fc" : "cur") + '"></i>' + esc(t(p.d > today || p.fc ? "forecast" : "this winter")) + " " + esc(dep(p.v)) + "</span>" : "") +
        (u != null ? '<span><i class="k q50"></i>' + esc(t("usual")) + " " + esc(dep(u)) + "</span>" : "") +
        (q25 != null && q75 != null ? '<span><i class="k q2"></i>' + esc(t("normal")) + " " + esc(U().dep(q25) + "–" + dep(q75)) + "</span>" : "") +
        (lo != null && hi != null ? '<span><i class="k q1"></i>' + esc(t("8 in 10 winters")) + " " + esc(U().dep(lo) + "–" + dep(hi)) + "</span>" : ""));
      if (k % 7 === 0) rows.push(trow([dayMon(d), p ? dep(p.v) : "–", u != null ? dep(u) : "–", q25 != null && q75 != null ? U().dep(q25) + "–" + dep(q75) : "–", lo != null && hi != null ? U().dep(lo) + "–" + dep(hi) : "–"]));
    }
    REG.set(id, { xs, tips, y0: top, y1: y0 });
    const table = "<caption>" + esc(title) + "</caption>" + trow([t("Date"), t("this winter"), t("usual"), t("normal (half of winters)"), t("8 in 10 winters")], true) + rows.join("");
    const key = '<div class="ssc-key"><span><i class="k cur"></i>' + esc(t("this winter")) + "</span>" + (fut.length > 1 ? '<span><i class="k fc"></i>' + esc(t("forecast")) + "</span>" : "") +
      (o.clim ? '<span><i class="k q50"></i>' + esc(t("usual")) + "</span>" + (has25 ? '<span><i class="k q2"></i>' + esc(t("normal (half of winters)")) + "</span>" : "") + '<span><i class="k q1"></i>' + esc(t("8 in 10 winters")) + "</span>" : "") + "</div>";
    return { title, html: wrap("c-bands", title, s, table, id).replace("</figure>", key + "</figure>") };
  }

  // ======================================================================== 3. next 7 days: new snow + snow line
  // o: { box, days:[{date, sn:{median,lo,hi}, fl:{median,lo,hi}}], base, mid, top (m) }
  const SL = 300;        // snow line ~300 m under the freezing level (docs/web/CHARTS.md)
  function week(o) {
    const W = o.W || width(o.box, 280, 620), n = o.days.length, L = 4, R = 4, bw = (W - L - R) / n;
    const v = (q) => (q && q.median != null ? q.median : null);
    const sn = o.days.map((d) => Math.max(0, v(d.sn) || 0)), hi = o.days.map((d) => (d.sn && d.sn.hi != null ? d.sn.hi : null));
    const smax = Math.max(10, ...sn, ...hi.filter((x) => x != null)) * 1.15;
    const HA = 96, A0 = 18, aY = (x) => A0 + HA - (x / smax) * HA;
    const sl = o.days.map((d) => (v(d.fl) != null ? Math.round((v(d.fl) - SL) / 50) * 50 : null));
    const has = sl.some((x) => x != null), refs = [["top", o.top], ["mid", o.mid], ["base", o.base]].filter(([, m]) => m);
    const B0 = A0 + HA + 46, HB = has ? 96 : 0, H = B0 + HB + (has ? 12 : 8);
    const zs = [...sl.filter((x) => x != null), ...o.days.flatMap((d) => (d.fl && d.fl.lo != null ? [d.fl.lo - SL, d.fl.hi - SL] : [])), ...refs.map(([, m]) => m)];
    const zlo = Math.max(0, Math.min(...zs) - 150), zhi = Math.max(...zs) + 150;
    const bY = (z) => B0 + HB - ((z - zlo) / Math.max(1, zhi - zlo)) * HB;
    const cx = (i) => L + bw * i + bw / 2;
    // title: the first day with real snow (+ where it rains), else a dry week
    const big = sn.findIndex((x) => x >= 3);
    let title;
    if (big >= 0) {
      const d = o.days[big].date, s0 = sl[big];
      title = t("Snow on {a}: +{b}", wdL(d), dep(sn[big])) + (s0 != null && o.base ? " · " + (s0 > o.base ? t("rain below {a}", el(s0)) : t("snow down to the base")) : "");
    } else title = t("No real snow in the next 7 days");
    let s = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(title + ". " + t("New snow and snow line, next 7 days")) + '">';
    s += '<text class="ph" x="' + L + '" y="11">' + esc(t("New snow")) + " · " + esc(U().du()) + "</text>";
    s += '<line class="ax0" x1="' + L + '" x2="' + (W - R) + '" y1="' + aY(0) + '" y2="' + aY(0) + '"/>';
    o.days.forEach((d, i) => {
      const x = cx(i), h = Math.max(sn[i] >= 0.5 ? 2 : 0, aY(0) - aY(sn[i])), w = Math.min(28, bw * 0.56), lo = d.sn && d.sn.lo != null ? d.sn.lo : null;
      const tip = "<b>" + esc(wdL(d.date) + " " + dayMon(d.date)) + "</b><span>" + esc(t("New snow")) + " " + esc(sn[i] >= 0.5 ? "+" + dep(sn[i]) : "0") + "</span>" +
        (lo != null && hi[i] != null && hi[i] - lo >= 1 ? "<span>" + esc(t("forecasts range")) + " " + esc(U().dep(lo) + "–" + dep(hi[i])) + "</span>" : "") +
        (sl[i] != null ? "<span>" + esc(t("snow line")) + " ~" + esc(el(sl[i])) + "</span>" : "");
      s += '<g class="hit" tabindex="0" data-tip="' + esc(tip) + '"><rect class="hb" x="' + f1(x - bw / 2) + '" y="' + A0 + '" width="' + f1(bw) + '" height="' + (H - A0) + '"/>';
      if (h > 0) s += '<path class="bar" d="M' + f1(x - w / 2) + "," + f1(aY(0)) + "V" + f1(aY(0) - h + 3) + "q0,-3 3,-3h" + f1(w - 6) + "q3,0 3,3V" + f1(aY(0)) + 'Z"/>';
      if (lo != null && hi[i] != null && hi[i] - lo >= 1) s += '<line class="wh" x1="' + f1(x) + '" x2="' + f1(x) + '" y1="' + f1(aY(lo)) + '" y2="' + f1(aY(hi[i])) + '"/><line class="wh" x1="' + f1(x - 3) + '" x2="' + f1(x + 3) + '" y1="' + f1(aY(hi[i])) + '" y2="' + f1(aY(hi[i])) + '"/>';
      if (sn[i] >= 1) s += '<text class="vl c" x="' + f1(x) + '" y="' + f1(Math.min(aY(sn[i]), hi[i] != null ? aY(hi[i]) : 1e9) - 5) + '" text-anchor="middle">+' + esc(U().dep(sn[i])) + "</text>";
      s += '<text class="ax" x="' + f1(x) + '" y="' + (aY(0) + 14) + '" text-anchor="middle">' + esc(i === 0 ? t("Today") : wdS(d.date)) + "</text></g>";
    });
    if (has) {
      s += '<text class="ph" x="' + L + '" y="' + (B0 - 8) + '">' + esc(t("Snow line")) + " · " + esc(U().du() === "in" ? "ft" : "m") + "</text>";
      // rain zone = under the snow line (hatched), the line itself, the forecasts range around it
      const pts = sl.map((z, i) => (z == null ? null : [cx(i), bY(z)])).filter(Boolean);
      const xl = L + bw / 2, xr = W - R - bw / 2;
      if (pts.length > 1) {
        s += '<path class="rain" d="M' + f1(pts[0][0]) + "," + (B0 + HB) + pts.map((p) => "L" + f1(p[0]) + "," + f1(p[1])).join("") + "L" + f1(pts[pts.length - 1][0]) + "," + (B0 + HB) + 'Z"/>';
        const rg = o.days.map((d, i) => (d.fl && d.fl.lo != null && d.fl.hi != null && d.fl.hi - d.fl.lo >= 50 ? [cx(i), bY(d.fl.hi - SL), bY(d.fl.lo - SL)] : null)).filter(Boolean);
        if (rg.length > 1) s += '<path class="slb" d="M' + rg.map((p) => f1(p[0]) + "," + f1(p[1])).join("L") + "L" + rg.slice().reverse().map((p) => f1(p[0]) + "," + f1(p[2])).join("L") + 'Z"/>';
        s += '<path class="sl" d="M' + pts.map((p) => f1(p[0]) + "," + f1(p[1])).join("L") + '"/>';
        pts.forEach((p) => { s += '<circle class="sld" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="2.5"/>'; });
        const lp = pts[0], ly = lp[1] + 13 > B0 + HB - 2 ? lp[1] - 6 : lp[1] + 13;
        s += '<text class="an" x="' + f1(lp[0] + 4) + '" y="' + f1(ly) + '">' + esc(t("rain")) + " ↓</text>";
      }
      for (const [k, m] of refs) {
        const y = bY(m), lab = t(k === "top" ? "Top" : k === "mid" ? "Mid" : "Base") + " " + el(m);
        s += '<line class="ref" x1="' + f1(xl - bw / 2) + '" x2="' + f1(xr + bw / 2) + '" y1="' + f1(y) + '" y2="' + f1(y) + '"/><text class="rfl" x="' + f1(W - R) + '" y="' + f1(y - 3) + '" text-anchor="end">' + esc(lab) + "</text>";
      }
    }
    s += "</svg>";
    const id = "w" + ++SEQ;
    const table = "<caption>" + esc(t("New snow and snow line, next 7 days")) + "</caption>" + trow([t("Day"), t("New snow"), t("forecasts range"), t("snow line")], true) +
      o.days.map((d, i) => trow([wdL(d.date) + " " + dayMon(d.date), sn[i] >= 0.5 ? "+" + dep(sn[i]) : "0", d.sn && d.sn.lo != null ? U().dep(d.sn.lo) + "–" + dep(d.sn.hi) : "–", sl[i] != null ? el(sl[i]) : "–"])).join("");
    return { title, html: wrap("c-week", title, s, table, id) };
  }

  // ======================================================================== 4. elevation profile (depth vs height)
  // o: { box, fit:{b, snowline} | null, pts:[{elev, cm, kind, name}], stations:[{name, elev, cm}], here:{elev, cm} }
  function elev(o) {
    const W = o.W || width(o.box, 280, 620), H = 220, L = 6, R = 10, top = 12, bot = 22;
    const P = (o.pts || []).filter((p) => p.elev != null && p.cm != null), S = (o.stations || []).filter((p) => p.elev != null && p.cm != null);
    const all = [...P, ...S, ...(o.here && o.here.elev != null && o.here.cm != null ? [o.here] : [])];
    if (all.length < 2) return null;
    let fit = o.fit && o.fit.b != null && o.fit.snowline != null ? { b: o.fit.b, sl: o.fit.snowline } : null;
    if (!fit) {        // least squares on the snowy points (depth vs height), snow line where the line meets 0
      const q = P.filter((p) => p.cm >= 1);
      if (q.length >= 2) {
        const mx = q.reduce((a, p) => a + p.elev, 0) / q.length, my = q.reduce((a, p) => a + p.cm, 0) / q.length;
        const sxx = q.reduce((a, p) => a + (p.elev - mx) ** 2, 0), sxy = q.reduce((a, p) => a + (p.elev - mx) * (p.cm - my), 0);
        if (sxx > 0 && sxy > 0) { const b = (sxy / sxx) * 100; fit = { b, sl: mx - (my / b) * 100 }; }
      }
    }
    const zmin0 = Math.min(...all.map((p) => p.elev)), zmax0 = Math.max(...all.map((p) => p.elev));
    // the height range: the points, the snow line, and at least ~600 m so the local height line reads as a line
    let zlo = Math.min(zmin0, fit && fit.sl > zmin0 - 400 ? fit.sl : zmin0) - 100, zhi = Math.max(zmax0, fit && fit.sl < zmax0 + 400 ? fit.sl : zmax0) + 100;
    if (zhi - zlo < 600) { const c = (zhi + zlo) / 2; zlo = c - 300; zhi = c + 300; }
    const cmax = Math.max(10, ...all.map((p) => p.cm), fit ? fit.b * (zhi - fit.sl) / 100 : 0) * 1.1;
    const X = (cm) => L + (Math.max(0, cm) / cmax) * (W - L - R), Y = (z) => top + (1 - (z - zlo) / Math.max(1, zhi - zlo)) * (H - top - bot);
    const anySnow = all.some((p) => p.cm >= 1);
    let title;
    const bTxt = fit ? dep(Math.max(1, fit.b)) : "";
    // the regional line must agree with the local points, else the title says only what the points say
    const lowSnow = Math.min(...all.filter((p) => p.cm >= 1).map((p) => p.elev));
    if (fit && all.some((p) => (p.elev < fit.sl - 50 && p.cm >= 3) || (p.elev > fit.sl + 150 && p.cm < 1))) fit = { ...fit, local: false };
    // the regional height line is drawn only where it really goes through this spot's points (owner 2026-11-13:
    // a line beside the points "has no sense"); otherwise no line, the points speak for themselves
    const own = [...P, ...(o.here && o.here.elev != null && o.here.cm != null ? [o.here] : [])].sort((a, b) => a.elev - b.elev);
    if (fit && fit.local !== false && fit.b >= 0.5 && own.some((p) => { const m = Math.max(0, fit.b * (p.elev - fit.sl) / 100);
      return Math.abs(m - p.cm) > Math.max(4, 0.25 * Math.max(m, p.cm)); })) fit = { ...fit, local: false };
    if (!anySnow) title = t("No snow at any height here yet");
    else if (fit && fit.local === false) title = all.some((p) => p.cm < 1) ? t("Snow from ~{a} up", el(Math.round(lowSnow / 50) * 50)) : t("More snow higher up");
    else if (fit && fit.b >= 0.5 && fit.sl <= zmin0) title = t("Snow all the way down, ~{b} more every 100 m higher", "", bTxt);
    else if (fit && fit.b >= 0.5) title = t("Snow starts at ~{a} and adds ~{b} every 100 m higher", el(Math.round(fit.sl / 50) * 50), bTxt);
    else if (fit) title = t("Snow from ~{a} up", el(Math.round(fit.sl / 50) * 50));
    else title = t("More snow higher up");
    if (U().us()) title = title.replace(/100 m/g, "330 ft").replace(/100 م/g, "330 قدم");
    let s = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(title + ". " + t("Snow depth by height")) + '">';
    for (const v of ticks(cmax / 1.1)) s += '<line class="g" x1="' + f1(X(v)) + '" x2="' + f1(X(v)) + '" y1="' + (H - bot) + '" y2="' + (H - bot + 4) + '"/><text class="ax" x="' + f1(X(v)) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(dep(v)) + "</text>";
    s += '<line class="ax0" x1="' + X(0) + '" x2="' + X(0) + '" y1="' + top + '" y2="' + (H - bot) + '"/><text class="ax" x="' + f1(X(0)) + '" y="' + (H - 6) + '">0</text>';
    let slLab = null;
    if (fit && fit.local !== false && fit.b >= 0.5) {
      const z0 = Math.max(zlo, fit.sl), c1 = fit.b * (zhi - fit.sl) / 100;
      s += '<path class="lapse" d="M' + f1(X(fit.b * (z0 - fit.sl) / 100)) + "," + f1(Y(z0)) + "L" + f1(X(c1)) + "," + f1(Y(zhi)) + '"/>';
      if (fit.sl > zlo + 20 && fit.sl < zhi - 20) {
        const y = Y(fit.sl);
        s += '<rect class="nos" x="' + L + '" y="' + f1(y) + '" width="' + (W - L - R) + '" height="' + f1(H - bot - y) + '"/><line class="slh" x1="' + L + '" x2="' + (W - R) + '" y1="' + f1(y) + '" y2="' + f1(y) + '"/>';
        slLab = [y, t("snow line") + " ~" + el(Math.round(fit.sl / 50) * 50)];
      }
    }
    const boxes = [], zs = (zhi - zlo) > 1400 ? 500 : (zhi - zlo) > 600 ? 200 : 100;
    for (let z = Math.ceil(zlo / zs) * zs; z < zhi; z += zs) { const y = Y(z), lb = el(z), w = tw(lb, 10) + 4;
      s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + f1(y) + '" y2="' + f1(y) + '"/><text class="ax sm" x="' + (W - R) + '" y="' + f1(y - 3) + '" text-anchor="end">' + esc(lb) + "</text>";
      boxes.push({ x: W - R - w, y: y - 13, w, h: 12 }); }
    const lab = (x, y, txt, cls) => {     // right of the mark, else left of it, else no label (the tooltip still has it)
      const w = tw(txt, 10.5) + 4;
      for (const lx of [x + 8, x - 8 - w]) { if (lx < L || lx + w > W - R) continue; const b = { x: lx, y: y - 9, w, h: 12 }; if (hits(boxes, b)) continue; boxes.push(b); return '<text class="' + cls + '" x="' + f1(lx) + '" y="' + f1(y + 3) + '">' + esc(txt) + "</text>"; }
      return "";
    };
    const NM = { base: "Base", mid: "Mid", top: "Top", low: "low ground", median: "middle", high: "high ground" };
    const marks = [];
    if (o.here && o.here.elev != null && o.here.cm != null) marks.push(["here", o.here, t("here") + " " + dep(o.here.cm)]);
    for (const p of P) marks.push(["mod", p, (NM[p.kind] ? t(NM[p.kind]) + " " : "") + dep(p.cm)]);
    for (const p of S) marks.push(["stn", p, p.name + " " + dep(p.cm)]);
    let dots = "", texts = "";
    for (const [k, p, txt] of marks) {
      const x = X(p.cm), y = Y(p.elev), tip = "<b>" + esc(k === "stn" ? p.name : txt.replace(/ [^ ]+ [^ ]+$/, "")) + "</b><span>" + esc(el(p.elev)) + " · " + esc(dep(p.cm)) + "</span>" + (k === "stn" ? "<span>" + esc(t("measured")) + "</span>" : "");
      dots += k === "stn" ? '<rect class="stn" x="' + f1(x - 4) + '" y="' + f1(y - 4) + '" width="8" height="8" rx="1.5" tabindex="0" data-tip="' + esc(tip) + '"/>'
        : '<circle class="' + (k === "here" ? "here" : "mod") + '" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (k === "here" ? 5.5 : 4.5) + '" tabindex="0" data-tip="' + esc(tip) + '"/>';
      texts += lab(x, y, txt, k === "here" ? "vl" : k === "stn" ? "sn" : "an");
    }
    if (slLab) {         // the snow line label: centred, under the line, else above it
      const w = tw(slLab[1], 10.5) + 4, x = (W - w) / 2;
      for (const y of [slLab[0] + 14, slLab[0] - 5]) { const b = { x, y: y - 10, w, h: 12 }; if (!hits(boxes, b)) { boxes.push(b); texts += '<text class="rfl" x="' + f1(x) + '" y="' + f1(y) + '">' + esc(slLab[1]) + "</text>"; break; } }
    }
    s += dots + texts;
    s += "</svg>";
    const key = '<div class="ssc-key"><span><i class="k here"></i>' + esc(t("here")) + '</span><span><i class="k mod"></i>' + esc(t("our map")) + "</span>" + (S.length ? '<span><i class="k stn"></i>' + esc(t("measured")) + "</span>" : "") + "</div>";
    const table = "<caption>" + esc(t("Snow depth by height")) + "</caption>" + trow([t("Height"), t("Snow depth"), ""], true) +
      marks.slice().sort((a, b) => b[1].elev - a[1].elev).map(([k, p, txt]) => trow([el(p.elev), dep(p.cm), k === "stn" ? p.name + " (" + t("measured") + ")" : txt])).join("");
    return { title, html: wrap("c-elev", title, s, table, "e" + ++SEQ).replace("</figure>", key + "</figure>") };
  }

  // ======================================================================== 5. new-snow totals: bullet bars
  const BIG = { "24h": 20, "48h": 30, "7d": 50 };      // "big day" marks (cm), docs/web/CHARTS.md
  function fallCell(cm, win, max, measured) {
    const v = cm == null ? null : Math.max(0, Math.round(cm)), big = BIG[win] || 20, M = Math.max(big * 1.25, max || 0);
    if (v == null) return '<td class="bb">–</td>';
    return '<td class="bb' + (v >= big ? " big" : "") + '"><span class="bbv" dir="ltr">' + (v >= 1 ? "<b>" + esc(U().dep(v)) + "</b>" : '<span class="z">0</span>') + (measured ? '<i class="mdot"></i>' : "") + "</span>" +
      '<span class="bbt" aria-hidden="true"><i style="width:' + Math.min(100, (v / M) * 100).toFixed(1) + '%"></i><em style="left:' + ((big / M) * 100).toFixed(1) + '%"></em></span></td>';
  }
  function fallTitle(L, lv, mode) {
    const W = mode === "next" ? [["next_24h", "in 24 h"], ["next_48h", "in 48 h"], ["next_7d", "in 7 days"]] : [["past_24h", "in 24 h"], ["past_48h", "in 48 h"], ["past_7d", "in 7 days"]];
    const WH = { base: "at the base", mid: "at mid-mountain", top: "at the top" };
    let best = null;
    for (const [k, lab] of W) for (const l of lv) { const q = L[l].windows && L[l].windows[k]; if (q && q.cm != null && q.cm >= 1 && (!best || q.cm > best.cm + 0.5)) best = { cm: q.cm, lab, l }; }
    if (!best) return t(mode === "next" ? "No new snow expected in the next 7 days" : "No new snow in the last 7 days");
    return t("Most new snow: +{a} {b}", dep(best.cm), t(WH[best.l]) + " " + t(best.lab));
  }

  // ======================================================================== 6. measured vs our map (dumbbells)
  // o: { box, dates:[], mv:[], mod:[], today }
  function paired(o) {
    const pairs = o.dates.map((d, i) => [d, o.mv[i], o.mod[i]]).filter(([, a, b]) => a != null || b != null);
    if (pairs.length < 2) return null;
    const both = pairs.filter(([, a, b]) => a != null && b != null);
    let title = t("Measured at the station and our map here, last days");
    if (both.length >= 2) {
      const mad = both.reduce((s, [, a, b]) => s + Math.abs(b - a), 0) / both.length, bias = both.reduce((s, [, a, b]) => s + (b - a), 0) / both.length;
      title = mad <= 5 ? t("Our map agrees within {a} of the station", dep(Math.max(1, Math.ceil(mad)))) : bias > 0 ? t("Our map shows ~{a} more than the station", dep(bias)) : t("Our map shows ~{a} less than the station", dep(-bias));
    }
    const W = o.W || width(o.box, 280, 620), H = 150, L = 6, R = 6, top = 10, bot = 22, n = o.dates.length;
    const all = pairs.flatMap(([, a, b]) => [a, b]).filter((x) => x != null), mx = Math.max(10, ...all) * 1.12;
    const X = (i) => L + 14 + (i / Math.max(1, n - 1)) * (W - L - R - 28), Y = (v) => H - bot - (v / mx) * (H - bot - top);
    let s = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(title) + '">';
    for (const v of ticks(mx / 1.12)) s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '"/><text class="ax" x="' + (L + 1) + '" y="' + f1(Y(v) - 3) + '">' + esc(dep(v)) + "</text>";
    s += '<line class="ax0" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
    o.dates.forEach((d, i) => {
      const a = o.mv[i], b = o.mod[i], x = X(i);
      const tip = "<b>" + esc(dayMon(d)) + "</b><span><i class=\"k stn\"></i>" + esc(t("Measured at the station")) + " " + esc(a != null ? dep(a) : "–") + '</span><span><i class="k mod"></i>' + esc(t("Our map here")) + " " + esc(b != null ? dep(b) : "–") + "</span>";
      s += '<g class="hit" tabindex="0" data-tip="' + esc(tip) + '"><rect class="hb" x="' + f1(x - 10) + '" y="' + top + '" width="20" height="' + (H - top - bot) + '"/>';
      if (a != null && b != null) s += '<line class="dl" x1="' + f1(x) + '" x2="' + f1(x) + '" y1="' + f1(Y(a)) + '" y2="' + f1(Y(b)) + '"/>';
      if (b != null) s += '<circle class="mod" cx="' + f1(x) + '" cy="' + f1(Y(b)) + '" r="4"/>';
      if (a != null) s += '<rect class="stn" x="' + f1(x - 3.5) + '" y="' + f1(Y(a) - 3.5) + '" width="7" height="7" rx="1.5"/>';
      if (i % 2 === (n - 1) % 2) s += '<text class="ax" x="' + f1(x) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d === o.today ? t("Today") : String(D(d).getUTCDate())) + "</text>";
      s += "</g>";
    });
    s += "</svg>";
    const key = '<div class="ssc-key"><span><i class="k stn"></i>' + esc(t("Measured at the station")) + '</span><span><i class="k mod"></i>' + esc(t("Our map here")) + "</span></div>";
    const table = "<caption>" + esc(t("Measured at the station and our map here, last days")) + "</caption>" + trow([t("Date"), t("Measured at the station"), t("Our map here")], true) +
      pairs.map(([d, a, b]) => trow([dayMon(d), a != null ? dep(a) : "–", b != null ? dep(b) : "–"])).join("");
    return { title, html: wrap("c-paired", title, s, table, "p" + ++SEQ).replace("</figure>", key + "</figure>") };
  }

  // ======================================================================== 7. powder ranking (HTML bars, RTL-safe)
  // rows: [{slug, name, n24, nw, dep, href}], win = the chosen new-snow window in days (1 = 24 h, 2 = 48 h, 7 = 7 days;
  // true = the old 3-day call, n72), col(cm) = snow ramp. The bars stack the last 24 h + the rest of the chosen window.
  function powder(rows, win, col) {
    const R = rows.slice(0, 10);
    if (R.length < 3) return "";
    const w = win === true ? 3 : +win > 1 ? +win : 1;
    const WK = { 1: ["24 h", "in 24 h"], 2: ["48 h", "in 48 h"], 3: ["3 days", "in 3 days"], 7: ["7 days", "in 7 days"] }[w] || ["24 h", "in 24 h"];
    const tot0 = (r) => (w === 1 ? r.n24 || 0 : r.nw != null ? r.nw : r.n72 || 0);
    const mx = Math.max(5, ...R.map((r) => Math.max(r.n24 || 0, tot0(r))));
    const title = t("{a} got the most: +{b} {c}", R[0].name, dep(tot0(R[0])), t(WK[1]));
    const li = R.map((r, i) => {
      const a = Math.max(0, r.n24 || 0), b = w === 1 ? 0 : Math.max(0, tot0(r) - a), tot = a + b;
      return '<li><a href="' + esc(r.href) + '" data-open="' + esc(r.slug) + '"><span class="pn"><span class="rk">' + (i + 1) + '</span><bdi dir="auto">' + esc(r.name) + '</bdi></span><span class="pb" aria-hidden="true">' +
        '<i class="s24" style="width:' + ((a / mx) * 100).toFixed(1) + '%"></i>' + (b >= 0.5 ? '<i class="s72" style="width:' + ((b / mx) * 100).toFixed(1) + '%"></i>' : "") + '<b dir="ltr">+' + esc(U().dep(tot)) + "</b></span>" +
        '<span class="pd" dir="ltr"><i style="background:' + col(r.dep) + '"></i>' + esc(dep(r.dep || 0)) + '</span><span class="sr">' + esc("+" + dep(a) + " " + t("in 24 h") + (w > 1 ? ", +" + dep(tot) + " " + t(WK[1]) : "") + ", " + dep(r.dep || 0) + " " + t("deep")) + "</span></a></li>";
    }).join("");
    return '<figure class="ssc pwr" data-noi18n><figcaption class="ssc-t">' + esc(title) + "<small>" + esc(t("Top 10 for new snow")) + "</small></figcaption>" +
      '<div class="ssc-key"><span><i class="k s24"></i>' + esc(t("24 h")) + "</span>" + (w > 1 ? '<span><i class="k s72"></i>' + esc(t(WK[0])) + "</span>" : "") + '<span class="kr"><i class="k dd"></i>' + esc(t("Snow depth")) + "</span></div><ol>" + li + "</ol></figure>";
  }

  // ======================================================================== hover / keyboard tooltips
  function bind(root) {
    if (!root) return;
    root.querySelectorAll(".ssc").forEach((fig) => {
      if (fig.dataset.bound) return;
      fig.dataset.bound = "1";
      const pane = fig.querySelector(".ssc-p"), tip = fig.querySelector(".ssc-tip"), svg = pane && pane.querySelector("svg");
      if (!pane || !tip || !svg) return;
      const show = (html, x, y) => {
        tip.innerHTML = html; tip.hidden = false;
        const pw = pane.clientWidth, w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.max(0, Math.min(pw - w, x - w / 2)) + "px";
        tip.style.top = Math.max(-h - 4, y - h - 10) + "px";
      };
      const hide = () => { tip.hidden = true; const c = svg.querySelector(".xh"); if (c) c.remove(); };
      const reg = REG.get(fig.dataset.ssc);
      if (reg && reg.xs) {        // crosshair: nearest day under the pointer, arrows with the keyboard
        let idx = -1;
        const at = (i) => {
          idx = Math.max(0, Math.min(reg.xs.length - 1, i));
          let c = svg.querySelector(".xh");
          if (!c) { c = document.createElementNS("http://www.w3.org/2000/svg", "line"); c.setAttribute("class", "xh"); svg.appendChild(c); }
          const x = reg.xs[idx]; c.setAttribute("x1", x); c.setAttribute("x2", x); c.setAttribute("y1", reg.y0); c.setAttribute("y2", reg.y1);
          show(reg.tips[idx], x * (pane.clientWidth / svg.viewBox.baseVal.width), reg.y0 + 6);
        };
        const near = (e) => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (svg.viewBox.baseVal.width / r.width); let b = 0; reg.xs.forEach((q, i) => { if (Math.abs(q - x) < Math.abs(reg.xs[b] - x)) b = i; }); return b; };
        svg.addEventListener("pointermove", (e) => at(near(e)));
        svg.addEventListener("pointerdown", (e) => at(near(e)));
        svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
        fig.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); at((idx < 0 ? reg.xs.length - 1 : idx) + (e.key === "ArrowRight" ? 1 : -1)); }
          else if (e.key === "Escape") hide();
        });
        fig.addEventListener("blur", hide);
        return;
      }
      svg.querySelectorAll("[data-tip]").forEach((m) => {
        const on = () => { const r = m.getBoundingClientRect(), pr = pane.getBoundingClientRect(); svg.querySelectorAll(".on").forEach((q) => q.classList.remove("on")); m.classList.add("on"); show(m.dataset.tip, r.left - pr.left + r.width / 2, r.top - pr.top); };
        m.addEventListener("pointerenter", on); m.addEventListener("focus", on); m.addEventListener("click", on);
        m.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { m.classList.remove("on"); hide(); } });
        m.addEventListener("blur", () => { m.classList.remove("on"); hide(); });
      });
    });
  }

  // ======================================================================== styles (theme tokens of site.css)
  const css = `
.ssc{margin:6px 0 4px;padding:0;position:relative}
.ssc:focus-visible{outline:2px solid var(--accent);outline-offset:4px;border-radius:6px}
.ssc-t{font-size:15px;line-height:20px;font-weight:700;color:var(--ink);margin:0 0 6px;text-wrap:balance}
.ssc-t small{display:block;font-size:12px;font-weight:500;color:var(--ink3);margin-top:1px}
.ssc-p{position:relative}
.ssc svg.chart{display:block;width:100%;height:auto;overflow:visible;direction:ltr;font-variant-numeric:tabular-nums}
.ssc svg text{font:11px Inter,system-ui,sans-serif;fill:var(--ink3);unicode-bidi:plaintext}
.ssc svg text.ax.sm{font-size:10px}
.ssc svg .g{stroke:var(--hair);stroke-width:1}
.ssc svg .ax0{stroke:var(--outline);stroke-width:1}
.ssc svg .b0{fill:var(--accent-tint);opacity:.5}
.ssc svg .b1{fill:var(--accent-tint)}
.ssc svg .b2{fill:var(--accent);opacity:.16}
.ssc svg .b2.wet{opacity:.26}
.ssc svg .md{fill:none;stroke:var(--accent);stroke-width:1.5;stroke-dasharray:4 3}
.ssc svg .md.wet{stroke-dasharray:1.5 2.5;stroke-width:2;stroke-linecap:round}
.ssc svg .cur{fill:none;stroke:var(--ink);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
.ssc svg .fc{fill:none;stroke:var(--ink);stroke-width:2;stroke-dasharray:5 4;stroke-linecap:round}
.ssc svg .fcb{fill:var(--ink);opacity:.08}
.ssc svg .tl{stroke:var(--ink4);stroke-width:1;stroke-dasharray:2 3}
.ssc svg .now{fill:var(--ink);stroke:var(--surface);stroke-width:2.5}
.ssc svg .st{fill:var(--surface);stroke:var(--ink2);stroke-width:1.5}
.ssc svg text.vl{font-size:12px;font-weight:700;fill:var(--ink)}
.ssc svg text.vl.c{font-size:11.5px;fill:var(--accent-ink)}
.ssc svg text.an{font-size:10.5px;font-weight:600;fill:var(--ink2)}
.ssc svg text.bl{font-size:10.5px;fill:var(--ink3)}
.ssc svg text.ul{font-size:10.5px;font-weight:650;fill:var(--accent-ink)}
.ssc svg text.lbl{font-weight:650;fill:var(--ink)}
.ssc svg .fq{fill:var(--accent)}
.ssc svg .lock{fill:var(--surface2);opacity:.85}
.ssc svg .xh{stroke:var(--ink2);stroke-width:1;pointer-events:none}
.ssc svg text.ph{font-size:11px;font-weight:700;fill:var(--ink2)}
.ssc svg .bar{fill:var(--accent)}
.ssc svg .wh{stroke:var(--ink3);stroke-width:1.2}
.ssc svg .hb{fill:transparent}
.ssc svg .hit{outline:none;cursor:default}
.ssc svg .hit:hover .hb,.ssc svg .hit:focus .hb,.ssc svg .hit.on .hb{fill:var(--ink);opacity:.05}
.ssc svg .rain{fill:var(--ink3);opacity:.10}
.ssc svg .sl{fill:none;stroke:var(--ink2);stroke-width:2;stroke-linejoin:round}
.ssc svg .sld{fill:var(--ink2)}
.ssc svg .slb{fill:var(--ink2);opacity:.12}
.ssc svg .ref{stroke:var(--accent);stroke-width:1;stroke-dasharray:3 3;opacity:.7}
.ssc svg text.rfl{font-size:10.5px;font-weight:600;fill:var(--accent-ink)}
.ssc svg .lapse{stroke:var(--accent);stroke-width:2;fill:none;stroke-linecap:round}
.ssc svg .nos{fill:var(--ink3);opacity:.07}
.ssc svg .slh{stroke:var(--ink2);stroke-width:1;stroke-dasharray:4 3}
.ssc svg .mod{fill:var(--surface);stroke:var(--accent);stroke-width:2;outline:none}
.ssc svg .here{fill:var(--accent);stroke:var(--surface);stroke-width:2;outline:none}
.ssc svg .stn{fill:var(--ink);stroke:var(--surface);stroke-width:1.5;outline:none}
.ssc svg .dl{stroke:var(--ink4);stroke-width:2}
.ssc svg text.sn{font-size:10.5px;font-weight:600;fill:var(--ink)}
.ssc svg .mod.on,.ssc svg .here.on,.ssc svg .stn.on,.ssc svg .mod:focus,.ssc svg .stn:focus{stroke-width:3}
.ssc-tip{position:absolute;z-index:5;pointer-events:none;background:var(--surface);color:var(--ink);box-shadow:var(--e2);border-radius:10px;padding:6px 9px;font-size:12.5px;line-height:17px;white-space:nowrap;font-variant-numeric:tabular-nums}
.ssc-tip b{display:block;font-weight:700}
.ssc-tip span{display:block;color:var(--ink2)}
.ssc .k,.ssc-tip .k{display:inline-block;width:12px;height:8px;border-radius:2px;margin-inline-end:5px;vertical-align:0}
.ssc .k.cur{background:var(--ink);height:3px;vertical-align:2px}.ssc .k.md{border-top:2px dashed var(--accent);height:0;vertical-align:3px}.ssc .k.b1{background:var(--accent-tint)}.ssc .k.b2{background:color-mix(in srgb,var(--accent) 22%,var(--accent-tint))}.ssc .k.b0{background:var(--accent-tint);opacity:.55}
.ssc .k.here{background:var(--accent);border-radius:50%;width:9px;height:9px}.ssc .k.mod{border:2px solid var(--accent);border-radius:50%;width:9px;height:9px}
.ssc .k.stn{background:var(--ink);width:8px;height:8px}
.ssc .k.s24{background:var(--accent)}.ssc .k.s72{background:var(--accent);opacity:.38}.ssc .k.dd{background:rgb(33,113,181);border-radius:50%;width:9px;height:9px}
.ssc-key{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--ink3);margin-top:4px}
.ssc-key .kr{margin-inline-start:auto}
.ssc.c-bands{margin-top:16px}
.ssc svg .q1{fill:var(--accent-tint)}
.ssc svg .q2{fill:var(--accent);opacity:.2}
.ssc svg .q50{fill:none;stroke:var(--accent-ink);stroke-width:1.5;stroke-linejoin:round}
.ssc svg .tk{stroke:var(--outline);stroke-width:1}
.ssc svg .rb{fill:var(--ink4);opacity:.5}
.ssc svg .rb.z{opacity:.35}
.ssc svg .rb.me{fill:var(--accent);opacity:1}
.ssc svg .rld{stroke:var(--accent);stroke-width:1.2}
.ssc svg text.ul,.ssc svg text.vl,.ssc svg text.an,.ssc svg text.bl{paint-order:stroke;stroke:var(--surface);stroke-width:3px;stroke-linejoin:round}
.ssc svg .rme{fill:var(--accent);stroke:var(--surface);stroke-width:2}
.ssc svg .ru{stroke:var(--accent-ink);stroke-width:1;opacity:.75}
.ssc svg .zbr{fill:none;stroke:var(--ink4);stroke-width:1}
.ssc svg .hit:hover .rb,.ssc svg .hit.on .rb{opacity:.85}
.ssc .k.q1,.ssc-tip .k.q1{background:var(--accent-tint);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 25%,transparent)}
.ssc .k.q2,.ssc-tip .k.q2{background:color-mix(in srgb,var(--accent) 24%,var(--surface))}
.ssc .k.q50,.ssc-tip .k.q50{background:var(--accent-ink);height:2px;vertical-align:3px}
.ssc .k.fc,.ssc-tip .k.fc{background:none;border-top:2px dashed var(--ink);height:0;vertical-align:3px}
.ssc-tip .k.cur{background:var(--ink);height:3px;vertical-align:2px}
.ptverd .ptsub{display:block;margin-top:4px;font-size:14px;line-height:1.35;font-weight:500;color:var(--ink2)}
.ssc.c-strip .wstrip text.ws-t{font-size:10.5px;fill:var(--ink3)}
.ssc.c-strip .wstrip text.ws-t.b{font-weight:650;fill:var(--ink2)}
.ssc.c-strip .wstrip text.ws-u{font-size:10.5px;font-weight:650;fill:var(--accent-ink)}
.ssc.c-strip .wstrip .ws-ld{stroke:var(--ink3);stroke-width:1}
.ssc.c-strip .wstrip .ws-dot.last{stroke:var(--ink);stroke-width:2}
/* new-snow bullets (resort): value + bar + the big-day mark */
table.falltb td.bb{vertical-align:top}
.bbv{display:block}
.bbt{display:block;position:relative;height:6px;margin:4px 0 2px auto;width:min(84px,100%);border-radius:3px;background:var(--surface3)}
.bbt i{position:absolute;inset-inline-start:0;top:0;bottom:0;border-radius:3px;background:var(--accent)}
.bbt em{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:var(--ink2);border-radius:1px}
[dir="rtl"] .bbt em{margin-left:0;margin-right:-1px;left:auto!important}
td.bb.big .bbt i{background:var(--accent-ink)}
.ssc-key .kbig{display:inline-block;width:2px;height:11px;background:var(--ink2);border-radius:1px;margin-inline-end:6px;vertical-align:-1px}
.falltt{margin:8px 0 2px;font-size:14px}
/* powder ranking */
.ssc.pwr ol{list-style:none;margin:6px 0 0;padding:0}
.ssc.pwr li a{display:grid;grid-template-columns:minmax(96px,34%) 1fr auto;align-items:center;gap:8px;padding:5px 2px;color:var(--ink);text-decoration:none;border-radius:8px;min-height:32px}
.ssc.pwr li a:hover{background:var(--surface2)}
.ssc.pwr .pn{font-size:13px;font-weight:620;white-space:nowrap;display:flex;gap:6px;align-items:center;min-width:0}.ssc.pwr .pn bdi{overflow:hidden;text-overflow:ellipsis;min-width:0}
.ssc.pwr .pn .rk{flex:none;width:18px;color:var(--ink3);font-weight:700;font-size:12px;font-variant-numeric:tabular-nums}
.ssc.pwr .pb{display:flex;align-items:center;gap:2px;min-width:0}
.ssc.pwr .pb i{display:block;height:12px;border-radius:2px;min-width:2px}
.ssc.pwr .pb i.s24{background:var(--accent)}
.ssc.pwr .pb i.s72{background:var(--accent);opacity:.38}
.ssc.pwr .pb i:first-child{border-start-start-radius:3px;border-end-start-radius:3px}
.ssc.pwr .pb b{font-size:12.5px;font-weight:700;margin-inline-start:5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.ssc.pwr .pd{font-size:12px;color:var(--ink2);font-variant-numeric:tabular-nums;white-space:nowrap;display:flex;align-items:center;gap:5px;min-width:56px;justify-content:flex-end}
.ssc.pwr .pd i{width:9px;height:9px;border-radius:50%}
`;
  if (!document.getElementById("ssc-css")) { const st = document.createElement("style"); st.id = "ssc-css"; st.textContent = css; document.head.appendChild(st); }

  window.SSC = { season, strip, verdict, rankBars, bands, week, elev, fallCell, fallTitle, paired, powder, bind, t, stormsOf };
})();
