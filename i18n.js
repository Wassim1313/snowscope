/* SnowScope Web languages: EN (source) · FR · DE · IT · ES · AR (right-to-left).
   One table: English text -> translation. Patterns with {a} {b} keep numbers and names as they are (resort names are
   never translated). The page is written in English; a MutationObserver translates every text node, placeholder,
   title and aria-label as it appears, so all screens go through this one table.
   Language: ?lang= > remembered choice > browser language > English. */
(() => {
  "use strict";
  const LANGS = { en: "English", fr: "Français", de: "Deutsch", it: "Italiano", es: "Español", ar: "العربية" };
  const LOCALE = { en: "en-GB", fr: "fr-FR", de: "de-DE", it: "it-IT", es: "es-ES", ar: "ar-MA" };
  // columns: fr, de, it, es, ar
  const T = {
    "Units": ["Unités", "Einheiten", "Unità", "Unidades", "الوحدات"],
    "Metric": ["Métrique", "Metrisch", "Metrico", "Métrico", "متري"],
    "US units": ["Unités US", "US-Einheiten", "Unità USA", "Unidades EE. UU.", "وحدات أمريكية"],
    "Metric · cm, m, km, °C": ["Métrique · cm, m, km, °C", "Metrisch · cm, m, km, °C", "Metrico · cm, m, km, °C", "Métrico · cm, m, km, °C", "متري · سم، م، كم، °م"],
    "US · in, ft, mi, °F": ["US · in, ft, mi, °F", "US · in, ft, mi, °F", "USA · in, ft, mi, °F", "EE. UU. · in, ft, mi, °F", "أمريكي · إنش، قدم، ميل، °ف"],
    "Compared with past winters": ["Comparé aux hivers passés", "Im Vergleich zu früheren Wintern", "Rispetto agli inverni passati", "Comparado con inviernos pasados", "مقارنة بالشتاءات السابقة"],
    "Closest measured station": ["Station de mesure la plus proche", "Nächste Messstation", "Stazione di misura più vicina", "Estación de medida más cercana", "أقرب محطة قياس"],
    "More than usual": ["Plus que d'habitude", "Mehr als üblich", "Più del solito", "Más de lo habitual", "أكثر من المعتاد"],
    "Less than usual": ["Moins que d'habitude", "Weniger als üblich", "Meno del solito", "Menos de lo habitual", "أقل من المعتاد"],
    "About usual": ["Dans la normale", "Etwa wie üblich", "Nella norma", "Lo habitual", "قريب من المعتاد"],
    "No snow here on this date in past winters either.": ["Pas de neige ici à cette date les hivers passés non plus.", "Auch in früheren Wintern lag hier an diesem Tag kein Schnee.", "Nessuna neve qui in questa data neanche negli inverni passati.", "Tampoco había nieve aquí en esta fecha en inviernos pasados.", "لا ثلج هنا في هذا التاريخ في الشتاءات السابقة أيضًا."],
    "No snow yet, like most past winters on this date.": ["Pas encore de neige, comme la plupart des hivers passés à cette date.", "Noch kein Schnee, wie in den meisten früheren Wintern an diesem Tag.", "Ancora niente neve, come nella maggior parte degli inverni passati in questa data.", "Aún sin nieve, como en la mayoría de inviernos pasados en esta fecha.", "لا ثلج بعد، كما في معظم الشتاءات السابقة في هذا التاريخ."],
    "Deeper than every past winter on this date.": ["Plus épais que tous les hivers passés à cette date.", "Mehr als in jedem früheren Winter an diesem Tag.", "Più alta di ogni inverno passato in questa data.", "Más espesa que en todos los inviernos pasados en esta fecha.", "أعمق من كل الشتاءات السابقة في هذا التاريخ."],
    "Less snow than every past winter on this date.": ["Moins de neige que tous les hivers passés à cette date.", "Weniger Schnee als in jedem früheren Winter an diesem Tag.", "Meno neve di ogni inverno passato in questa data.", "Menos nieve que en todos los inviernos pasados en esta fecha.", "ثلج أقل من كل الشتاءات السابقة في هذا التاريخ."],
    "Deeper than nearly every past winter on this date.": ["Plus épais que presque tous les hivers passés à cette date.", "Mehr als in fast allen früheren Wintern an diesem Tag.", "Più alta di quasi tutti gli inverni passati in questa data.", "Más espesa que en casi todos los inviernos pasados en esta fecha.", "أعمق من كل الشتاءات السابقة تقريبًا في هذا التاريخ."],
    "Less snow than nearly every past winter on this date.": ["Moins de neige que presque tous les hivers passés à cette date.", "Weniger Schnee als in fast allen früheren Wintern an diesem Tag.", "Meno neve di quasi tutti gli inverni passati in questa data.", "Menos nieve que en casi todos los inviernos pasados en esta fecha.", "ثلج أقل من كل الشتاءات السابقة تقريبًا في هذا التاريخ."],
    "Same as usual": ["Comme d'habitude", "Wie üblich", "Come al solito", "Como de costumbre", "كالمعتاد"],
    "Usual on this date": ["Habituel à cette date", "Üblich an diesem Tag", "Solito in questa data", "Habitual en esta fecha", "المعتاد في هذا التاريخ"],
    "Normal range": ["Plage normale", "Normaler Bereich", "Intervallo normale", "Rango normal", "النطاق المعتاد"],
    "Lowest – highest": ["Minimum – maximum", "Tiefster – höchster", "Minimo – massimo", "Mínimo – máximo", "الأدنى – الأعلى"],
    "Snowiest winter": ["Hiver le plus enneigé", "Schneereichster Winter", "Inverno più nevoso", "Invierno más nevado", "أكثر شتاء ثلجًا"],
    "Leanest winter": ["Hiver le plus pauvre", "Schneeärmster Winter", "Inverno meno nevoso", "Invierno con menos nieve", "أقل شتاء ثلجًا"],
    "Past winters are estimated for the mountain around this spot, so take the comparison as a guide.": ["Les hivers passés sont estimés pour la montagne autour de ce point : comparaison indicative.", "Frühere Winter sind für den Berg um diesen Punkt geschätzt: der Vergleich ist ein Richtwert.", "Gli inverni passati sono stimati per la montagna intorno a questo punto: confronto indicativo.", "Los inviernos pasados se estiman para la montaña alrededor de este punto: comparación orientativa.", "الشتاءات السابقة مقدرة للجبل المحيط بهذه النقطة، فخذ المقارنة كمؤشر."],
    "No past winters for this spot.": ["Pas d'hivers passés pour ce point.", "Keine früheren Winter für diesen Punkt.", "Nessun inverno passato per questo punto.", "Sin inviernos pasados para este punto.", "لا شتاءات سابقة لهذه النقطة."],
    "Modelled here": ["Modélisé ici", "Hier berechnet", "Modellata qui", "Modelado aquí", "محسوب هنا"],
    "modelled here": ["modélisé ici", "hier berechnet", "modellata qui", "modelado aquí", "محسوب هنا"],
    "measured at the station": ["mesuré à la station", "an der Station gemessen", "misurata alla stazione", "medido en la estación", "مقاس في المحطة"],
    "Distance": ["Distance", "Entfernung", "Distanza", "Distancia", "المسافة"],
    "Station height": ["Altitude de la station", "Höhe der Station", "Quota della stazione", "Altitud de la estación", "ارتفاع المحطة"],
    "Measured at": ["Mesuré à", "Gemessen um", "Misurata alle", "Medido a las", "وقت القياس"],
    "Compared with {a} past winters.": ["Comparé à {a} hivers passés.", "Verglichen mit {a} früheren Wintern.", "Confrontato con {a} inverni passati.", "Comparado con {a} inviernos pasados.", "مقارنة بـ {a} شتاءً سابقًا."],
    "No measured station within {a} km": ["Aucune station de mesure à moins de {a} km", "Keine Messstation im Umkreis von {a} km", "Nessuna stazione di misura entro {a} km", "Ninguna estación de medida a menos de {a} km", "لا محطة قياس ضمن {a} كم"],
    "Deepest winter peak": ["Pic d'hiver le plus haut", "Höchster Winter-Höchststand", "Picco invernale più alto", "Pico invernal más alto", "أعلى ذروة شتوية"],
    "Lowest winter peak": ["Pic d'hiver le plus bas", "Niedrigster Winter-Höchststand", "Picco invernale più basso", "Pico invernal más bajo", "أدنى ذروة شتوية"],
    "No snow yet, while {a} of 10 past winters had snow on this date.": ["Pas encore de neige, alors que {a} hivers passés sur 10 en avaient à cette date.", "Noch kein Schnee, obwohl {a} von 10 früheren Wintern an diesem Tag Schnee hatten.", "Ancora niente neve, mentre {a} inverni passati su 10 ne avevano in questa data.", "Aún sin nieve, mientras que {a} de cada 10 inviernos pasados tenían nieve en esta fecha.", "لا ثلج بعد، بينما كان في {a} من كل 10 شتاءات سابقة ثلج في هذا التاريخ."],
    "Past winters for this spot are being prepared. Try again tomorrow.": ["Les hivers passés de ce point sont en préparation. Réessayez demain.", "Die früheren Winter für diesen Punkt werden vorbereitet. Versuche es morgen wieder.", "Gli inverni passati per questo punto sono in preparazione. Riprova domani.", "Los inviernos pasados de este punto se están preparando. Inténtalo mañana.", "يجري تجهيز الشتاءات السابقة لهذه النقطة. حاول غدًا."],
    "3D videos": ["Vidéos 3D", "3D-Videos", "Video 3D", "Vídeos 3D", "فيديوهات ثلاثية الأبعاد"],
    "Create a 3D video": ["Créer une vidéo 3D", "Ein 3D-Video erstellen", "Crea un video 3D", "Crear un vídeo 3D", "أنشئ فيديو ثلاثي الأبعاد"],
    "See the 3D demos": ["Voir les démos 3D", "3D-Beispiele ansehen", "Guarda le demo 3D", "Ver las demos 3D", "شاهد العروض ثلاثية الأبعاد"],
    "A flyover of any summit or ski circuit with today's snow.": ["Un survol de n'importe quel sommet ou circuit de ski avec la neige du jour.", "Ein Flug über jeden Gipfel oder jede Skirunde mit dem Schnee von heute.", "Un sorvolo di qualsiasi vetta o giro sciistico con la neve di oggi.", "Un vuelo sobre cualquier cumbre o circuito de esquí con la nieve de hoy.", "تحليق فوق أي قمة أو مسار تزلج مع ثلج اليوم."],
    "Stays near the slopes": ["Logements près des pistes", "Unterkünfte nahe der Piste", "Alloggi vicino alle piste", "Alojamiento cerca de las pistas", "أماكن إقامة قرب المنحدرات"],
    "Partner · we may earn a commission from bookings.": ["Partenaire · nous pouvons toucher une commission sur les réservations.", "Partner · wir erhalten eventuell eine Provision für Buchungen.", "Partner · potremmo ricevere una commissione sulle prenotazioni.", "Socio · podemos recibir una comisión por las reservas.", "شريك · قد نحصل على عمولة من الحجوزات."],
    "Check-in": ["Arrivée", "Anreise", "Arrivo", "Llegada", "الوصول"],
    "Check-out": ["Départ", "Abreise", "Partenza", "Salida", "المغادرة"],
    "Guests": ["Voyageurs", "Gäste", "Ospiti", "Huéspedes", "الضيوف"],
    "Chalets & apartments": ["Chalets et appartements", "Chalets & Ferienwohnungen", "Chalet e appartamenti", "Chalets y apartamentos", "شاليهات وشقق"],
    "Top rated": ["Les mieux notés", "Top bewertet", "I più votati", "Mejor valorados", "الأعلى تقييمًا"],
    "The map of places to stay comes from our booking partner.": ["La carte des logements vient de notre partenaire de réservation.", "Die Unterkunftskarte kommt von unserem Buchungspartner.", "La mappa degli alloggi proviene dal nostro partner di prenotazione.", "El mapa de alojamientos viene de nuestro socio de reservas.", "خريطة أماكن الإقامة من شريك الحجز لدينا."],
    "Show the map": ["Afficher la carte", "Karte anzeigen", "Mostra la mappa", "Mostrar el mapa", "اعرض الخريطة"],
    "Open the full map": ["Ouvrir la carte complète", "Ganze Karte öffnen", "Apri la mappa completa", "Abrir el mapa completo", "افتح الخريطة كاملة"],
    "Places to stay near": ["Logements près de", "Unterkünfte nahe", "Alloggi vicino a", "Alojamiento cerca de", "أماكن إقامة قرب"],
    "Deepest snow today": ["La neige la plus épaisse aujourd'hui", "Am meisten Schnee heute", "La neve più alta oggi", "La nieve más espesa hoy", "أعمق ثلج اليوم"],
    "deepest": ["le plus épais", "am meisten", "la più alta", "la más espesa", "الأعمق"],
    "Fresh snow, last days and next days": ["Neige fraîche, jours passés et à venir", "Neuschnee, letzte und nächste Tage", "Neve fresca, giorni passati e prossimi", "Nieve nueva, días pasados y próximos", "الثلج الجديد، الأيام الماضية والقادمة"],
    "No snow yet": ["Pas encore de neige", "Noch kein Schnee", "Ancora niente neve", "Aún sin nieve", "لا ثلج بعد"],
    "More snow than {a} of {b} past winters on this date.": ["Plus de neige que {a} des {b} hivers passés à cette date.", "Mehr Schnee als in {a} von {b} früheren Wintern an diesem Tag.", "Più neve di {a} dei {b} inverni passati in questa data.", "Más nieve que en {a} de {b} inviernos pasados en esta fecha.", "ثلج أكثر من {a} من أصل {b} شتاءً سابقًا في هذا التاريخ."],
    "Most snow on this date": ["Le plus de neige à cette date", "Am meisten Schnee an diesem Tag", "Più neve in questa data", "Más nieve en esta fecha", "أكثر ثلج في هذا التاريخ"],
    "Least snow on this date": ["Le moins de neige à cette date", "Am wenigsten Schnee an diesem Tag", "Meno neve in questa data", "Menos nieve en esta fecha", "أقل ثلج في هذا التاريخ"],
    "Check opening dates": ["Vérifier les dates d'ouverture", "Öffnungsdaten prüfen", "Verifica le date di apertura", "Comprobar fechas de apertura", "تحقق من مواعيد الافتتاح"],
    "Season dates": ["Dates de la saison", "Saisondaten", "Date della stagione", "Fechas de temporada", "مواعيد الموسم"],
    "Season dates not published yet": ["Dates de saison pas encore publiées", "Saisondaten noch nicht veröffentlicht", "Date della stagione non ancora pubblicate", "Fechas de temporada aún no publicadas", "لم تُنشر مواعيد الموسم بعد"],
    "Opens": ["Ouvre le", "Öffnet am", "Apre il", "Abre el", "يفتح"],
    "closes": ["ferme le", "schließt am", "chiude il", "cierra el", "يغلق"],
    "Source": ["Source", "Quelle", "Fonte", "Fuente", "المصدر"],
    "No dates found yet.": ["Aucune date trouvée pour l'instant.", "Noch keine Daten gefunden.", "Nessuna data trovata per ora.", "Aún no se han encontrado fechas.", "لم يُعثر على مواعيد بعد."],
    "Looking this up on the web, this takes about half a minute.": ["Recherche sur le web, environ une demi-minute.", "Wir suchen im Web, das dauert etwa eine halbe Minute.", "Cerchiamo sul web, ci vuole circa mezzo minuto.", "Buscando en la web, tarda medio minuto.", "نبحث على الويب، يستغرق ذلك نحو نصف دقيقة."],
    "We could not check the dates right now, try again later.": ["Impossible de vérifier les dates pour l'instant, réessayez plus tard.", "Die Daten konnten gerade nicht geprüft werden, versuche es später.", "Impossibile verificare le date ora, riprova più tardi.", "No pudimos comprobar las fechas ahora, inténtalo más tarde.", "تعذّر التحقق من المواعيد الآن، حاول لاحقًا."],
    "Try again": ["Réessayer", "Erneut versuchen", "Riprova", "Reintentar", "حاول مجددًا"],
    "Checking…": ["Vérification…", "Wird geprüft…", "Verifica…", "Comprobando…", "جارٍ التحقق…"],
    "Not available right now.": ["Indisponible pour l'instant.", "Gerade nicht verfügbar.", "Non disponibile ora.", "No disponible ahora.", "غير متاح الآن."],
    "Where to ski tomorrow": ["Où skier demain", "Wo morgen Ski fahren", "Dove sciare domani", "Dónde esquiar mañana", "أين تتزلج غدًا"],
    "Tomorrow": ["Demain", "Morgen", "Domani", "Mañana", "غدًا"],
    "City or resort": ["Ville ou station", "Stadt oder Skigebiet", "Città o stazione", "Ciudad o estación", "مدينة أو محطة"],
    "Use my location": ["Utiliser ma position", "Meinen Standort nutzen", "Usa la mia posizione", "Usar mi ubicación", "استخدم موقعي"],
    "Anywhere": ["Partout", "Überall", "Ovunque", "En cualquier lugar", "في أي مكان"],
    "Any snow": ["Toute neige", "Jeder Schnee", "Qualsiasi neve", "Cualquier nieve", "أي ثلج"],
    "Fresh snow only": ["Neige fraîche seulement", "Nur Neuschnee", "Solo neve fresca", "Solo nieve nueva", "الثلج الجديد فقط"],
    "Around you": ["Autour de vous", "In deiner Nähe", "Intorno a te", "A tu alrededor", "حولك"],
    "Powder near you": ["Poudreuse près de vous", "Pulverschnee in deiner Nähe", "Neve fresca vicino a te", "Nieve polvo cerca de ti", "ثلج طازج بالقرب منك"],
    "No fresh snow near you": ["Pas de neige fraîche près de vous", "Kein Neuschnee in deiner Nähe", "Niente neve fresca vicino a te", "Sin nieve nueva cerca de ti", "لا ثلج جديد بالقرب منك"],
    "upper slopes": ["haut des pistes", "oben am Berg", "alta quota", "cotas altas", "المنحدرات العليا"],
    "new, 24 h": ["fraîche, 24 h", "neu, 24 h", "fresca, 24 h", "nueva, 24 h", "جديد، 24 ساعة"],
    "new, 3 days": ["fraîche, 3 jours", "neu, 3 Tage", "fresca, 3 giorni", "nueva, 3 días", "جديد، 3 أيام"],
    "Best day:": ["Meilleur jour :", "Bester Tag:", "Giorno migliore:", "Mejor día:", "أفضل يوم:"],
    "Directions": ["Itinéraire", "Route", "Indicazioni", "Cómo llegar", "الاتجاهات"],
    "Details": ["Détails", "Details", "Dettagli", "Detalles", "التفاصيل"],
    "Share with friends": ["Partager avec des amis", "Mit Freunden teilen", "Condividi con gli amici", "Compartir con amigos", "شارك مع الأصدقاء"],
    "Copy link": ["Copier le lien", "Link kopieren", "Copia il link", "Copiar enlace", "انسخ الرابط"],
    "on the upper slopes": ["en haut des pistes", "oben am Berg", "in alta quota", "en cotas altas", "في المنحدرات العليا"],
    "new": ["de fraîche", "neu", "di fresca", "nueva", "جديد"],
    "snow report": ["bulletin neige", "Schneebericht", "bollettino neve", "parte de nieve", "تقرير الثلج"],
    "Powder day: lots of fresh snow.": ["Jour de poudreuse : beaucoup de neige fraîche.", "Powdertag: viel Neuschnee.", "Giornata di neve fresca: tanta neve nuova.", "Día de nieve polvo: mucha nieve nueva.", "يوم ثلج طازج: ثلج جديد كثير."],
    "Fresh snow in the last days.": ["De la neige fraîche ces derniers jours.", "Neuschnee in den letzten Tagen.", "Neve fresca negli ultimi giorni.", "Nieve nueva en los últimos días.", "ثلج جديد في الأيام الأخيرة."],
    "This day is further than the free days.": ["Ce jour dépasse les jours gratuits.", "Dieser Tag liegt nach den Gratis-Tagen.", "Questo giorno è oltre i giorni gratuiti.", "Este día queda fuera de los días gratis.", "هذا اليوم خارج الأيام المجانية."],
    "Snow here": ["Neige ici", "Schnee hier", "Neve qui", "Nieve aquí", "الثلج هنا"],
    "This season and the next days": ["Cette saison et les prochains jours", "Diese Saison und die nächsten Tage", "Questa stagione e i prossimi giorni", "Esta temporada y los próximos días", "هذا الموسم والأيام القادمة"],
    "past winters": ["hivers passés", "frühere Winter", "inverni passati", "inviernos pasados", "الشتاءات الماضية"],
    "- - next days": ["- - prochains jours", "- - nächste Tage", "- - prossimi giorni", "- - próximos días", "- - الأيام القادمة"],
    "The next 3 days are free.": ["Les 3 prochains jours sont gratuits.", "Die nächsten 3 Tage sind gratis.", "I prossimi 3 giorni sono gratis.", "Los próximos 3 días son gratis.", "الأيام الثلاثة القادمة مجانية."],
    "Pro adds the whole week ahead and the outlook.": ["Pro ajoute toute la semaine et la tendance.", "Pro zeigt die ganze Woche und den Ausblick.", "Pro aggiunge tutta la settimana e la tendenza.", "Pro añade toda la semana y la tendencia.", "يضيف Pro الأسبوع كاملًا والتوقعات."],
    "Unlock the week": ["Débloquer la semaine", "Woche freischalten", "Sblocca la settimana", "Desbloquear la semana", "افتح الأسبوع"],
    "Past winters are updating, try again in a minute.": ["Les hivers passés se mettent à jour, réessayez dans une minute.", "Frühere Winter werden aktualisiert, versuche es gleich nochmal.", "Gli inverni passati si aggiornano, riprova tra un minuto.", "Los inviernos pasados se actualizan, inténtalo en un minuto.", "بيانات الشتاءات الماضية قيد التحديث، حاول بعد دقيقة."],
    "Stay": ["Dormir", "Hotel", "Dormire", "Alojarse", "إقامة"],
    "This spot": ["Cet endroit", "Dieser Ort", "Questo punto", "Este lugar", "هذا المكان"],
    "BOOK chips on resorts · Partner": ["Bouton BOOK sur les stations · Partenaire", "BOOK-Knopf an Skigebieten · Partner", "Pulsante BOOK sulle stazioni · Partner", "Botón BOOK en las estaciones · Socio", "زر BOOK على المحطات · شريك"],
    "Places to stay": ["Où dormir", "Unterkünfte", "Dove dormire", "Alojamiento", "أماكن الإقامة"],
    "Hotels and chalets near resorts · Partner": ["Hôtels et chalets près des stations · Partenaire", "Hotels und Chalets bei Skigebieten · Partner", "Hotel e chalet vicino alle stazioni · Partner", "Hoteles y chalets cerca de las estaciones · Socio", "فنادق وشاليهات قرب المحطات · شريك"],
    "Powder this weekend?": ["De la poudreuse ce week-end ?", "Pulverschnee am Wochenende?", "Neve fresca questo weekend?", "¿Nieve polvo este fin de semana?", "ثلج طازج في نهاية الأسبوع؟"],
    "Hotel suggestions": ["Suggestions d'hôtels", "Hotelvorschläge", "Suggerimenti hotel", "Sugerencias de hoteles", "اقتراحات الفنادق"],
    "Places to stay near resorts": ["Où dormir près des stations", "Unterkünfte bei Skigebieten", "Dove dormire vicino alle stazioni", "Alojamiento cerca de las estaciones", "أماكن إقامة قرب المحطات"],
    "Story": ["Story", "Story", "Storia", "Historia", "قصة"],
    "Snow on the ground": ["Neige au sol", "Schnee am Boden", "Neve al suolo", "Nieve en el suelo", "الثلج على الأرض"],
    "Latest clear view": ["Dernière vue dégagée", "Letzte klare Sicht", "Ultima vista serena", "Última vista despejada", "آخر رؤية صافية"],
    "Clear view up to": ["Vue dégagée jusqu'au", "Klare Sicht bis", "Vista serena fino al", "Vista despejada hasta el", "رؤية صافية حتى"],
    "No satellite view here.": ["Pas de vue satellite ici.", "Hier keine Satellitensicht.", "Nessuna vista satellite qui.", "Sin vista de satélite aquí.", "لا توجد صورة قمر صناعي هنا."],
    "No clear view in the last 10 days.": ["Pas de vue dégagée depuis 10 jours.", "Keine klare Sicht in den letzten 10 Tagen.", "Nessuna vista serena negli ultimi 10 giorni.", "Sin vista despejada en los últimos 10 días.", "لا رؤية صافية خلال آخر 10 أيام."],
    "Sponsored": ["Sponsorisé", "Anzeige", "Sponsorizzato", "Patrocinado", "مُموَّل"],
    "SnowScope Pro": ["SnowScope Pro", "SnowScope Pro", "SnowScope Pro", "SnowScope Pro", "SnowScope Pro"],
    "15-day snow, every layer, no ads": ["La neige sur 15 jours, tous les calques, sans pub", "15 Tage Schnee, alle Ebenen, ohne Werbung", "Neve a 15 giorni, tutti i livelli, senza pubblicità", "Nieve a 15 días, todas las capas, sin anuncios", "ثلج 15 يومًا، كل الطبقات، بلا إعلانات"],
    "Hotels and chalets for your dates": ["Hôtels et chalets pour vos dates", "Hotels und Chalets für deine Daten", "Hotel e chalet per le tue date", "Hoteles y chalets para tus fechas", "فنادق وشاليهات لتواريخك"],
    "Stays near": ["Hébergements près de", "Unterkünfte bei", "Alloggi vicino a", "Alojamiento cerca de", "إقامة قرب"],
    "Book": ["Réserver", "Buchen", "Prenota", "Reservar", "احجز"],
    "See other deals": ["Voir d'autres offres", "Weitere Angebote", "Altre offerte", "Ver otras ofertas", "عروض أخرى"],
    "Measured": ["Mesuré", "Gemessen", "Misurato", "Medido", "مقاس"],
    "Measured snow": ["Neige mesurée", "Gemessener Schnee", "Neve misurata", "Nieve medida", "الثلج المقاس"],
    "Snow depth measured at stations": ["Hauteur de neige mesurée aux stations", "An Stationen gemessene Schneehöhe", "Altezza neve misurata alle stazioni", "Espesor medido en estaciones", "سمك الثلج المقاس في المحطات"],
    "Sleep near": ["Dormir à proximité", "Übernachten", "Dormire vicino", "Dormir cerca", "نم بالقرب"],
    "Measured snow in view": ["Neige mesurée dans la vue", "Gemessener Schnee im Ausschnitt", "Neve misurata nella vista", "Nieve medida en la vista", "الثلج المقاس في هذا العرض"],
    "Station": ["Station", "Station", "Stazione", "Estación", "المحطة"],
    "Elev.": ["Alt.", "Höhe", "Alt.", "Alt.", "الارتفاع"],
    "Depth": ["Hauteur", "Höhe", "Altezza", "Espesor", "السمك"],
    "New": ["Fraîche", "Neu", "Fresca", "Nueva", "جديد"],
    "Time": ["Heure", "Zeit", "Ora", "Hora", "الوقت"],
    "Station page": ["Page de la station", "Stationsseite", "Pagina della stazione", "Página de la estación", "صفحة المحطة"],
    "No measuring station in this view.": ["Aucune station de mesure dans cette vue.", "Keine Messstation in diesem Ausschnitt.", "Nessuna stazione di misura in questa vista.", "Ninguna estación de medida en esta vista.", "لا توجد محطة قياس في هذا العرض."],
    "Showing the 30 deepest of {a} stations in view": ["Les 30 plus enneigées des {a} stations dans la vue", "Die 30 schneereichsten von {a} Stationen im Ausschnitt", "Le 30 più innevate delle {a} stazioni nella vista", "Las 30 con más nieve de {a} estaciones en la vista", "أعمق 30 من {a} محطة في هذا العرض"],
    "Deepest measured": ["Plus forte mesure", "Höchste Messung", "Misura più alta", "Mayor medida", "أعمق قياس"],
    "Measured only": ["Mesures seules", "Nur Messungen", "Solo misure", "Solo medidas", "القياسات فقط"],
    "Measured nearby": ["Mesuré à proximité", "In der Nähe gemessen", "Misurato nelle vicinanze", "Medido cerca", "مقاس بالقرب"],
    "No measurement within 25 km": ["Aucune mesure à moins de 25 km", "Keine Messung im Umkreis von 25 km", "Nessuna misura entro 25 km", "Ninguna medida a menos de 25 km", "لا قياس ضمن 25 كم"],
    "{a} m higher": ["{a} m plus haut", "{a} m höher", "{a} m più in alto", "{a} m más alto", "أعلى بـ {a} م"],
    "{a} m lower": ["{a} m plus bas", "{a} m tiefer", "{a} m più in basso", "{a} m más bajo", "أدنى بـ {a} م"],
    "Last {a} days": ["{a} derniers jours", "Letzte {a} Tage", "Ultimi {a} giorni", "Últimos {a} días", "آخر {a} أيام"],
    "Sharp 30 m": ["Net 30 m", "Scharf 30 m", "Nitido 30 m", "Nítido 30 m", "دقيق 30 م"],
    "The sharpest snow picture, where available": ["L'image de neige la plus fine, là où elle existe", "Das schärfste Schneebild, wo vorhanden", "L'immagine della neve più nitida, dove disponibile", "La imagen de nieve más nítida, donde existe", "أدق صورة للثلج حيثما توفرت"],
    "Best powder today": ["Meilleure poudreuse aujourd'hui", "Bester Pulverschnee heute", "Miglior neve fresca oggi", "Mejor nieve polvo hoy", "أفضل ثلج طازج اليوم"],
    "Best powder, 3 days": ["Meilleure poudreuse sur 3 jours", "Bester Pulverschnee, 3 Tage", "Miglior neve fresca, 3 giorni", "Mejor nieve polvo, 3 días", "أفضل ثلج طازج، 3 أيام"],
    "Nearest fresh snow": ["Neige fraîche la plus proche", "Nächster Neuschnee", "Neve fresca più vicina", "Nieve nueva más cercana", "أقرب ثلج جديد"],
    "Nearest powder from your position": ["Poudreuse la plus proche de votre position", "Nächster Pulverschnee von deiner Position", "Neve fresca più vicina alla tua posizione", "Nieve polvo más cercana a tu posición", "أقرب ثلج طازج من موقعك"],
    "Period": ["Période", "Zeitraum", "Periodo", "Periodo", "الفترة"],
    "3D view": ["Vue 3D", "3D-Ansicht", "Vista 3D", "Vista 3D", "عرض ثلاثي الأبعاد"],
    "Snow storms": ["Tempêtes de neige", "Schneestürme", "Bufere di neve", "Temporales de nieve", "عواصف ثلجية"],
    "Create post": ["Créer une publication", "Beitrag erstellen", "Crea un post", "Crear publicación", "أنشئ منشورًا"],
    "Create post image": ["Créer une image", "Bild erstellen", "Crea un'immagine", "Crear imagen", "أنشئ صورة"],
    "Post of this map view": ["Publication de cette vue", "Beitrag dieser Kartenansicht", "Post di questa vista", "Publicación de esta vista", "منشور لهذا العرض"],
    "Post image": ["Image à publier", "Beitragsbild", "Immagine del post", "Imagen para publicar", "صورة المنشور"],
    "Download": ["Télécharger", "Herunterladen", "Scarica", "Descargar", "تنزيل"],
    "Share": ["Partager", "Teilen", "Condividi", "Compartir", "مشاركة"],
    "Caption": ["Légende", "Bildtext", "Didascalia", "Texto", "النص"],
    "Copy caption": ["Copier la légende", "Text kopieren", "Copia il testo", "Copiar texto", "انسخ النص"],
    "Copied": ["Copié", "Kopiert", "Copiato", "Copiado", "تم النسخ"],
    "in 3 days": ["en 3 jours", "in 3 Tagen", "in 3 giorni", "en 3 días", "خلال 3 أيام"],
    "Preparing the image…": ["Préparation de l'image…", "Bild wird erstellt…", "Preparazione dell'immagine…", "Preparando la imagen…", "جارٍ تجهيز الصورة…"],
    "No snow storm right now (20 cm or more).": ["Pas de tempête de neige en ce moment (20 cm ou plus).", "Gerade kein Schneesturm (20 cm oder mehr).", "Nessuna bufera di neve ora (20 cm o più).", "Ningún temporal de nieve ahora (20 cm o más).", "لا عاصفة ثلجية الآن (20 سم أو أكثر)."],
    "Share posts are in Pro": ["Les publications sont dans Pro", "Beiträge gibt es mit Pro", "I post sono in Pro", "Las publicaciones están en Pro", "المنشورات متاحة في Pro"],
    "Ready-made images with your resorts, for Instagram and TikTok.": ["Des images prêtes avec vos stations, pour Instagram et TikTok.", "Fertige Bilder mit deinen Skigebieten, für Instagram und TikTok.", "Immagini pronte con le tue stazioni, per Instagram e TikTok.", "Imágenes listas con tus estaciones, para Instagram y TikTok.", "صور جاهزة بمحطاتك لإنستغرام وتيك توك."],
    "Snow depth on every slope, every day": ["La neige sur chaque pente, chaque jour", "Schnee an jedem Hang, jeden Tag", "La neve su ogni pendio, ogni giorno", "La nieve en cada ladera, cada día", "الثلج على كل منحدر، كل يوم"],
    "Snow today": ["Neige aujourd'hui", "Schnee heute", "Neve oggi", "Nieve hoy", "الثلج اليوم"],
    "Where to ski": ["Où skier", "Skifinder", "Dove sciare", "Dónde esquiar", "أين تتزلج"],
    "Powder": ["Poudreuse", "Pulverschnee", "Neve fresca", "Nieve polvo", "ثلج طازج"],
    "You": ["Moi", "Ich", "Tu", "Tú", "حسابي"],
    "Map": ["Carte", "Karte", "Mappa", "Mapa", "الخريطة"],
    "Layers": ["Calques", "Ebenen", "Livelli", "Capas", "الطبقات"],
    "Map layers": ["Calques de la carte", "Kartenebenen", "Livelli della mappa", "Capas del mapa", "طبقات الخريطة"],
    "Find a ski resort": ["Trouver une station", "Skigebiet suchen", "Cerca una stazione", "Buscar una estación", "ابحث عن محطة تزلج"],
    "Sign in": ["Se connecter", "Anmelden", "Accedi", "Iniciar sesión", "تسجيل الدخول"],
    "Get the app": ["Obtenir l'appli", "App holen", "Scarica l'app", "Descargar la app", "حمّل التطبيق"],
    "Today": ["Aujourd'hui", "Heute", "Oggi", "Hoy", "اليوم"],
    "Near me": ["Près de moi", "In meiner Nähe", "Vicino a me", "Cerca de mí", "بالقرب مني"],
    "Alps": ["Alpes", "Alpen", "Alpi", "Alpes", "جبال الألب"],
    "Pyrenees": ["Pyrénées", "Pyrenäen", "Pirenei", "Pirineos", "جبال البرانس"],
    "US West": ["Ouest des États-Unis", "US-Westen", "Ovest USA", "Oeste de EE. UU.", "غرب الولايات المتحدة"],
    "US Northeast": ["Nord-Est des États-Unis", "US-Nordosten", "Nord-est USA", "Noreste de EE. UU.", "شمال شرق الولايات المتحدة"],
    "Atlas (Morocco)": ["Atlas (Maroc)", "Atlas (Marokko)", "Atlante (Marocco)", "Atlas (Marruecos)", "الأطلس (المغرب)"],
    "Snow depth": ["Hauteur de neige", "Schneehöhe", "Altezza neve", "Espesor de nieve", "سمك الثلج"],
    "Satellite snow": ["Neige vue par satellite", "Schnee vom Satelliten", "Neve da satellite", "Nieve por satélite", "الثلج من القمر الصناعي"],
    "Off": ["Aucun", "Aus", "Nessuno", "Ninguno", "إيقاف"],
    "Wind": ["Vent", "Wind", "Vento", "Viento", "الرياح"],
    "Around midday": ["Vers midi", "Gegen Mittag", "Verso mezzogiorno", "Hacia mediodía", "قرابة منتصف النهار"],
    "Freezing level": ["Isotherme 0 °C", "Nullgradgrenze", "Zero termico", "Cota de congelación", "مستوى التجمد"],
    "Where 0 °C sits": ["Altitude du 0 °C", "Wo 0 °C liegt", "Dove si trova lo 0 °C", "Dónde está el 0 °C", "ارتفاع درجة الصفر"],
    "Rain & snow radar": ["Radar pluie et neige", "Regen- und Schneeradar", "Radar pioggia e neve", "Radar de lluvia y nieve", "رادار المطر والثلج"],
    "Right now": ["En ce moment", "Jetzt", "Adesso", "Ahora", "الآن"],
    "3-day snow": ["Neige sur 3 jours", "Schnee in 3 Tagen", "Neve in 3 giorni", "Nieve en 3 días", "ثلج 3 أيام"],
    "Powder over 3 days": ["Poudreuse sur 3 jours", "Neuschnee in 3 Tagen", "Neve fresca in 3 giorni", "Nieve polvo en 3 días", "ثلج طازج خلال 3 أيام"],
    "Resorts": ["Stations", "Skigebiete", "Stazioni", "Estaciones", "المحطات"],
    "Name and snow on each resort": ["Nom et neige de chaque station", "Name und Schnee jedes Skigebiets", "Nome e neve di ogni stazione", "Nombre y nieve de cada estación", "اسم كل محطة وثلجها"],
    "Pistes & lifts": ["Pistes et remontées", "Pisten und Lifte", "Piste e impianti", "Pistas y remontes", "المسارات والمصاعد"],
    "Coloured by difficulty": ["Couleur selon la difficulté", "Nach Schwierigkeit gefärbt", "Colorate per difficoltà", "Color según dificultad", "ملونة حسب الصعوبة"],
    "Avalanche danger": ["Risque d'avalanche", "Lawinengefahr", "Pericolo valanghe", "Peligro de aludes", "خطر الانهيارات الثلجية"],
    "Official daily levels": ["Niveaux officiels du jour", "Offizielle Tagesstufen", "Livelli ufficiali del giorno", "Niveles oficiales del día", "المستويات الرسمية اليومية"],
    "Snow": ["Neige", "Schnee", "Neve", "Nieve", "الثلج"],
    "Weather and more": ["Météo et plus", "Wetter und mehr", "Meteo e altro", "Tiempo y más", "الطقس والمزيد"],
    "On the map": ["Sur la carte", "Auf der Karte", "Sulla mappa", "En el mapa", "على الخريطة"],
    "Safety": ["Sécurité", "Sicherheit", "Sicurezza", "Seguridad", "السلامة"],
    "Snow colours": ["Couleurs de la neige", "Schneefarben", "Colori della neve", "Colores de la nieve", "ألوان الثلج"],
    "Clear": ["Doux", "Weich", "Morbido", "Suave", "ناعم"],
    "Sharp": ["Net", "Scharf", "Nitido", "Nítido", "حاد"],
    "Outdoors": ["Plein air", "Outdoor", "Outdoor", "Exterior", "تضاريس"],
    "Satellite": ["Satellite", "Satellit", "Satellite", "Satélite", "قمر صناعي"],
    "Light": ["Clair", "Hell", "Chiaro", "Claro", "فاتح"],
    "3D mountains": ["Montagnes en 3D", "Berge in 3D", "Montagne in 3D", "Montañas en 3D", "جبال ثلاثية الأبعاد"],
    "Tilt the map with two fingers or right-drag": ["Inclinez la carte à deux doigts ou clic droit", "Karte mit zwei Fingern oder Rechtsklick neigen", "Inclina la mappa con due dita o tasto destro", "Inclina el mapa con dos dedos o clic derecho", "أمل الخريطة بإصبعين أو بالزر الأيمن"],
    "Not available right now": ["Indisponible pour le moment", "Gerade nicht verfügbar", "Non disponibile ora", "No disponible ahora", "غير متاح حاليًا"],
    "Powder is free for today. Pro adds every day, 3-day snow and the layers with a lock.": ["La poudreuse est gratuite pour aujourd'hui. Pro ajoute tous les jours, la neige sur 3 jours et les calques avec un cadenas.", "Pulverschnee ist heute gratis. Pro bringt alle Tage, Schnee in 3 Tagen und die Ebenen mit Schloss.", "La neve fresca di oggi è gratis. Pro aggiunge tutti i giorni, la neve in 3 giorni e i livelli con il lucchetto.", "La nieve polvo de hoy es gratis. Pro añade todos los días, la nieve en 3 días y las capas con candado.", "الثلج الطازج مجاني لليوم. يضيف Pro كل الأيام وثلج 3 أيام والطبقات المقفلة."],
    "New snow, 24 h": ["Neige fraîche, 24 h", "Neuschnee, 24 h", "Neve fresca, 24 h", "Nieve nueva, 24 h", "ثلج جديد، 24 ساعة"],
    "New snow, 3 days": ["Neige fraîche, 3 jours", "Neuschnee, 3 Tage", "Neve fresca, 3 giorni", "Nieve nueva, 3 días", "ثلج جديد، 3 أيام"],
    "Wind at midday": ["Vent à midi", "Wind am Mittag", "Vento a mezzogiorno", "Viento a mediodía", "الرياح عند الظهر"],
    "Seen from space": ["Vu de l'espace", "Aus dem All gesehen", "Visto dallo spazio", "Visto desde el espacio", "كما يُرى من الفضاء"],
    "Patchy": ["Par plaques", "Fleckig", "A chiazze", "Irregular", "متقطع"],
    "No snow": ["Pas de neige", "Kein Schnee", "Niente neve", "Sin nieve", "لا ثلج"],
    "Cloud": ["Nuage", "Wolke", "Nuvola", "Nube", "غيوم"],
    "Rain & snow now": ["Pluie et neige maintenant", "Regen und Schnee jetzt", "Pioggia e neve ora", "Lluvia y nieve ahora", "المطر والثلج الآن"],
    "Snow on the ground": ["Neige au sol", "Schnee am Boden", "Neve al suolo", "Nieve en el suelo", "الثلج على الأرض"],
    "No snow data here.": ["Pas de données de neige ici.", "Hier keine Schneedaten.", "Nessun dato neve qui.", "Sin datos de nieve aquí.", "لا توجد بيانات ثلج هنا."],
    "No snow on the ground": ["Pas de neige au sol", "Kein Schnee am Boden", "Niente neve al suolo", "Sin nieve en el suelo", "لا ثلج على الأرض"],
    "None": ["Aucune", "Keiner", "Nessuna", "Nada", "لا شيء"],
    "Low": ["Faible", "Gering", "Debole", "Débil", "ضعيف"],
    "Moderate": ["Limité", "Mäßig", "Moderato", "Limitado", "معتدل"],
    "Considerable": ["Marqué", "Erheblich", "Marcato", "Notable", "ملحوظ"],
    "High": ["Fort", "Groß", "Forte", "Fuerte", "مرتفع"],
    "Very high": ["Très fort", "Sehr groß", "Molto forte", "Muy fuerte", "مرتفع جدًا"],
    "No level published": ["Aucun niveau publié", "Keine Stufe veröffentlicht", "Nessun livello pubblicato", "Ningún nivel publicado", "لم يُنشر أي مستوى"],
    "Deepest snow on the upper slopes": ["Le plus de neige en haut des pistes", "Am meisten Schnee oben am Berg", "Più neve in alta quota", "Más nieve en las cotas altas", "أعمق ثلج في المنحدرات العليا"],
    "Other regions": ["Autres régions", "Andere Regionen", "Altre regioni", "Otras regiones", "مناطق أخرى"],
    "resorts with snow": ["stations enneigées", "Skigebiete mit Schnee", "stazioni con neve", "estaciones con nieve", "محطات بها ثلج"],
    "deepest resort": ["station la plus enneigée", "tiefster Schnee", "stazione più innevata", "estación con más nieve", "أعمق محطة"],
    "new snow": ["neige fraîche", "Neuschnee", "neve fresca", "nieve nueva", "ثلج جديد"],
    "No resort has snow yet.": ["Aucune station n'a encore de neige.", "Noch kein Skigebiet hat Schnee.", "Nessuna stazione ha ancora neve.", "Ninguna estación tiene nieve aún.", "لا توجد محطة بها ثلج بعد."],
    "No snow at the resorts yet": ["Pas encore de neige dans les stations", "Noch kein Schnee in den Skigebieten", "Ancora niente neve nelle stazioni", "Aún sin nieve en las estaciones", "لا ثلج في المحطات بعد"],
    "Every slope, every day": ["Chaque piste, chaque jour", "Jeder Hang, jeden Tag", "Ogni pista, ogni giorno", "Cada pista, cada día", "كل منحدر، كل يوم"],
    "The sharpest snow map, powder alerts and Peak finder in the app.": ["La carte de neige la plus précise, les alertes poudreuse et le Peak finder dans l'appli.", "Die schärfste Schneekarte, Pulverschnee-Alarme und der Gipfelfinder in der App.", "La mappa della neve più nitida, gli avvisi di neve fresca e il trova vette nell'app.", "El mapa de nieve más nítido, alertas de nieve polvo y el buscador de cumbres en la app.", "أدق خريطة للثلج وتنبيهات الثلج الطازج ومكتشف القمم في التطبيق."],
    "Tap the map for the snow on any slope.": ["Touchez la carte pour voir la neige sur n'importe quelle pente.", "Tippe auf die Karte für den Schnee an jedem Hang.", "Tocca la mappa per la neve su qualsiasi pendio.", "Toca el mapa para ver la nieve en cualquier ladera.", "المس الخريطة لمعرفة الثلج على أي منحدر."],
    "Ski finder": ["Où skier", "Skifinder", "Dove sciare", "Dónde esquiar", "أين تتزلج"],
    "Where to ski today": ["Où skier aujourd'hui", "Wo heute Ski fahren", "Dove sciare oggi", "Dónde esquiar hoy", "أين تتزلج اليوم"],
    "Where to ski this weekend": ["Où skier ce week-end", "Wo am Wochenende Ski fahren", "Dove sciare questo weekend", "Dónde esquiar este fin de semana", "أين تتزلج في نهاية الأسبوع"],
    "Resorts with the most snow, fresh snow counts more.": ["Les stations les plus enneigées ; la neige fraîche compte double.", "Skigebiete mit dem meisten Schnee; Neuschnee zählt mehr.", "Le stazioni con più neve; la neve fresca conta di più.", "Las estaciones con más nieve; la nieve nueva cuenta más.", "المحطات الأكثر ثلجًا، والثلج الجديد يُحسب أكثر."],
    "All countries": ["Tous les pays", "Alle Länder", "Tutti i paesi", "Todos los países", "كل البلدان"],
    "Weekend": ["Week-end", "Wochenende", "Weekend", "Fin de semana", "نهاية الأسبوع"],
    "The weekend is further than the free days.": ["Le week-end dépasse les jours gratuits.", "Das Wochenende liegt nach den Gratis-Tagen.", "Il weekend è oltre i giorni gratuiti.", "El fin de semana queda fuera de los días gratis.", "نهاية الأسبوع خارج الأيام المجانية."],
    "Pro shows the full week ahead.": ["Pro montre toute la semaine à venir.", "Pro zeigt die ganze kommende Woche.", "Pro mostra tutta la settimana.", "Pro muestra toda la semana.", "يعرض Pro الأسبوع القادم كاملًا."],
    "No resort has snow here yet.": ["Aucune station n'a encore de neige ici.", "Hier hat noch kein Skigebiet Schnee.", "Nessuna stazione qui ha ancora neve.", "Ninguna estación tiene nieve aquí aún.", "لا توجد محطة بها ثلج هنا بعد."],
    "Fresh snow today": ["Neige fraîche aujourd'hui", "Neuschnee heute", "Neve fresca oggi", "Nieve nueva hoy", "ثلج جديد اليوم"],
    "No fresh snow today": ["Pas de neige fraîche aujourd'hui", "Heute kein Neuschnee", "Niente neve fresca oggi", "Sin nieve nueva hoy", "لا ثلج جديد اليوم"],
    "24 hours": ["24 heures", "24 Stunden", "24 ore", "24 horas", "24 ساعة"],
    "3 days": ["3 jours", "3 Tage", "3 giorni", "3 días", "3 أيام"],
    "Show on the map": ["Voir sur la carte", "Auf der Karte zeigen", "Mostra sulla mappa", "Ver en el mapa", "اعرض على الخريطة"],
    "Powder alerts": ["Alertes poudreuse", "Pulverschnee-Alarme", "Avvisi neve fresca", "Alertas de nieve polvo", "تنبيهات الثلج الطازج"],
    "Get a message when fresh snow is coming to your resorts. In the app.": ["Recevez un message quand la neige arrive sur vos stations. Dans l'appli.", "Eine Nachricht, wenn Neuschnee in deine Skigebiete kommt. In der App.", "Un messaggio quando arriva neve fresca nelle tue stazioni. Nell'app.", "Un aviso cuando llega nieve a tus estaciones. En la app.", "رسالة عندما يقترب ثلج جديد من محطاتك. في التطبيق."],
    "Your SnowScope": ["Votre SnowScope", "Dein SnowScope", "Il tuo SnowScope", "Tu SnowScope", "SnowScope الخاص بك"],
    "Only in the app": ["Seulement dans l'appli", "Nur in der App", "Solo nell'app", "Solo en la app", "في التطبيق فقط"],
    "Peak finder": ["Peak finder", "Gipfelfinder", "Trova vette", "Buscador de cumbres", "مكتشف القمم"],
    "Point your camera at the mountains to name every summit.": ["Pointez la caméra vers les montagnes pour nommer chaque sommet.", "Richte die Kamera auf die Berge und sieh jeden Gipfelnamen.", "Punta la fotocamera sulle montagne per conoscere ogni vetta.", "Apunta la cámara a las montañas para ver el nombre de cada cumbre.", "وجّه الكاميرا نحو الجبال لتعرف اسم كل قمة."],
    "Ski days": ["Journées ski", "Skitage", "Giornate", "Días de esquí", "أيام التزلج"],
    "Record your day: distance, runs, vertical.": ["Enregistrez votre journée : distance, descentes, dénivelé.", "Zeichne deinen Tag auf: Strecke, Abfahrten, Höhenmeter.", "Registra la giornata: distanza, discese, dislivello.", "Graba tu día: distancia, bajadas, desnivel.", "سجّل يومك: المسافة والنزلات والارتفاع."],
    "A message when fresh snow is coming.": ["Un message quand la neige arrive.", "Eine Nachricht, wenn Neuschnee kommt.", "Un messaggio quando arriva la neve.", "Un aviso cuando llega la nieve.", "رسالة عند اقتراب الثلج."],
    "Manage account": ["Gérer le compte", "Konto verwalten", "Gestisci account", "Gestionar cuenta", "إدارة الحساب"],
    "Create an account": ["Créer un compte", "Konto erstellen", "Crea un account", "Crear una cuenta", "أنشئ حسابًا"],
    "One account for the app and the website": ["Un seul compte pour l'appli et le site", "Ein Konto für App und Website", "Un account per l'app e il sito", "Una cuenta para la app y la web", "حساب واحد للتطبيق والموقع"],
    "Sign in to remove ads and unlock Pro if you have it.": ["Connectez-vous pour retirer les pubs et débloquer Pro si vous l'avez.", "Melde dich an, um Werbung zu entfernen und Pro freizuschalten, falls du es hast.", "Accedi per togliere la pubblicità e sbloccare Pro se lo hai.", "Inicia sesión para quitar anuncios y desbloquear Pro si lo tienes.", "سجّل الدخول لإزالة الإعلانات وفتح Pro إن كان لديك."],
    "Free plan": ["Formule gratuite", "Gratis-Version", "Piano gratuito", "Plan gratuito", "الخطة المجانية"],
    "Get Pro in the app": ["Passer Pro dans l'appli", "Pro in der App holen", "Passa a Pro nell'app", "Consigue Pro en la app", "احصل على Pro في التطبيق"],
    "Get Pro in the Android app": ["Passer Pro dans l'appli Android", "Pro in der Android-App holen", "Passa a Pro nell'app Android", "Consigue Pro en la app Android", "احصل على Pro في تطبيق أندرويد"],
    "Already Pro? Sign in": ["Déjà Pro ? Connectez-vous", "Schon Pro? Anmelden", "Hai già Pro? Accedi", "¿Ya eres Pro? Inicia sesión", "لديك Pro؟ سجّل الدخول"],
    "Upper slopes today": ["En haut des pistes aujourd'hui", "Oben am Berg heute", "In alta quota oggi", "Cotas altas hoy", "المنحدرات العليا اليوم"],
    "New snow": ["Neige fraîche", "Neuschnee", "Neve fresca", "Nieve nueva", "ثلج جديد"],
    "in 24 hours": ["en 24 heures", "in 24 Stunden", "in 24 ore", "en 24 horas", "خلال 24 ساعة"],
    "No new snow in 24 h": ["Pas de neige fraîche en 24 h", "Kein Neuschnee in 24 h", "Niente neve fresca in 24 h", "Sin nieve nueva en 24 h", "لا ثلج جديد خلال 24 ساعة"],
    "Snow depth on the upper slopes, cm": ["Hauteur de neige en haut des pistes, cm", "Schneehöhe oben am Berg, cm", "Altezza neve in alta quota, cm", "Espesor de nieve en cotas altas, cm", "سمك الثلج في المنحدرات العليا، سم"],
    "This season vs past winters": ["Cette saison face aux hivers passés", "Diese Saison im Vergleich", "Questa stagione e gli inverni passati", "Esta temporada frente a otros inviernos", "هذا الموسم مقارنة بالشتاءات الماضية"],
    "Next 7 days": ["7 prochains jours", "Nächste 7 Tage", "Prossimi 7 giorni", "Próximos 7 días", "الأيام السبعة القادمة"],
    "Nearby resorts": ["Stations proches", "Skigebiete in der Nähe", "Stazioni vicine", "Estaciones cercanas", "محطات قريبة"],
    "Deep snow.": ["Neige profonde.", "Viel Schnee.", "Neve abbondante.", "Nieve abundante.", "ثلج عميق."],
    "Good snow cover.": ["Bon enneigement.", "Gute Schneelage.", "Buon innevamento.", "Buena capa de nieve.", "غطاء ثلجي جيد."],
    "Some snow.": ["Un peu de neige.", "Etwas Schnee.", "Un po' di neve.", "Algo de nieve.", "بعض الثلج."],
    "A thin layer.": ["Une fine couche.", "Eine dünne Schicht.", "Uno strato sottile.", "Una capa fina.", "طبقة رقيقة."],
    "No snow yet.": ["Pas encore de neige.", "Noch kein Schnee.", "Ancora niente neve.", "Aún sin nieve.", "لا ثلج بعد."],
    "No snow data here yet.": ["Pas encore de données de neige ici.", "Hier noch keine Schneedaten.", "Ancora nessun dato neve qui.", "Aún sin datos de nieve aquí.", "لا توجد بيانات ثلج هنا بعد."],
    "past": ["passé", "vergangen", "passato", "pasado", "ماضٍ"],
    "forecast": ["prévision", "Prognose", "previsione", "previsión", "توقعات"],
    "this season": ["cette saison", "diese Saison", "questa stagione", "esta temporada", "هذا الموسم"],
    "usual": ["habituel", "üblich", "solito", "habitual", "المعتاد"],
    "most winters": ["la plupart des hivers", "die meisten Winter", "la maggior parte degli inverni", "la mayoría de inviernos", "معظم الشتاءات"],
    "Much more snow than usual for this time of year.": ["Beaucoup plus de neige que d'habitude à cette période.", "Viel mehr Schnee als sonst um diese Zeit.", "Molta più neve del solito in questo periodo.", "Mucha más nieve de lo habitual en esta época.", "ثلج أكثر بكثير من المعتاد في هذا الوقت من السنة."],
    "More snow than usual for this time of year.": ["Plus de neige que d'habitude à cette période.", "Mehr Schnee als sonst um diese Zeit.", "Più neve del solito in questo periodo.", "Más nieve de lo habitual en esta época.", "ثلج أكثر من المعتاد في هذا الوقت من السنة."],
    "Less snow than usual for this time of year.": ["Moins de neige que d'habitude à cette période.", "Weniger Schnee als sonst um diese Zeit.", "Meno neve del solito in questo periodo.", "Menos nieve de lo habitual en esta época.", "ثلج أقل من المعتاد في هذا الوقت من السنة."],
    "Much less snow than usual for this time of year.": ["Beaucoup moins de neige que d'habitude à cette période.", "Viel weniger Schnee als sonst um diese Zeit.", "Molta meno neve del solito in questo periodo.", "Mucha menos nieve de lo habitual en esta época.", "ثلج أقل بكثير من المعتاد في هذا الوقت من السنة."],
    "About as much snow as usual for this time of year.": ["Autant de neige que d'habitude à cette période.", "Etwa so viel Schnee wie sonst um diese Zeit.", "Neve nella media per questo periodo.", "Nieve como de costumbre en esta época.", "ثلج قريب من المعتاد في هذا الوقت من السنة."],
    "Usually the best time to go:": ["Meilleure période en général :", "Meist die beste Zeit:", "Di solito il periodo migliore:", "Normalmente la mejor época:", "أفضل وقت للذهاب عادةً:"],
    "Advertisement": ["Publicité", "Anzeige", "Pubblicità", "Publicidad", "إعلان"],
    "Hotels map": ["Carte des hôtels", "Hotelkarte", "Mappa hotel", "Mapa de hoteles", "خريطة الفنادق"],
    "Partner": ["Partenaire", "Partner", "Partner", "Socio", "شريك"],
    "All resorts": ["Toutes les stations", "Alle Skigebiete", "Tutte le stazioni", "Todas las estaciones", "كل المحطات"],
    "About & sources": ["À propos et sources", "Über uns und Quellen", "Info e fonti", "Acerca de y fuentes", "حول الموقع والمصادر"],
    "Your account": ["Votre compte", "Dein Konto", "Il tuo account", "Tu cuenta", "حسابك"],
    "Privacy": ["Confidentialité", "Datenschutz", "Privacy", "Privacidad", "الخصوصية"],
    "Terms": ["Conditions", "Bedingungen", "Termini", "Condiciones", "الشروط"],
    "Help": ["Aide", "Hilfe", "Aiuto", "Ayuda", "مساعدة"],
    "Cookie settings": ["Paramètres des cookies", "Cookie-Einstellungen", "Impostazioni cookie", "Ajustes de cookies", "إعدادات ملفات تعريف الارتباط"],
    "Pro data is updating, try again in a minute.": ["Les données Pro se mettent à jour, réessayez dans une minute.", "Pro-Daten werden aktualisiert, versuche es gleich nochmal.", "I dati Pro si stanno aggiornando, riprova tra un minuto.", "Los datos Pro se están actualizando, inténtalo en un minuto.", "بيانات Pro قيد التحديث، حاول بعد دقيقة."],
    "Zoom in to see pistes and lifts": ["Zoomez pour voir pistes et remontées", "Hineinzoomen für Pisten und Lifte", "Ingrandisci per vedere piste e impianti", "Acércate para ver pistas y remontes", "قرّب لرؤية المسارات والمصاعد"],
    "Zoom in to see satellite snow": ["Zoomez pour voir la neige satellite", "Hineinzoomen für Satellitenschnee", "Ingrandisci per la neve da satellite", "Acércate para ver la nieve por satélite", "قرّب لرؤية الثلج من القمر الصناعي"],
    "Location not available": ["Position indisponible", "Standort nicht verfügbar", "Posizione non disponibile", "Ubicación no disponible", "الموقع غير متاح"],
    "Close": ["Fermer", "Schließen", "Chiudi", "Cerrar", "إغلاق"],
    "Loading…": ["Chargement…", "Wird geladen…", "Caricamento…", "Cargando…", "جارٍ التحميل…"],
    "Day": ["Jour", "Tag", "Giorno", "Día", "اليوم"],
    "Region": ["Région", "Region", "Regione", "Región", "المنطقة"],
    "Country": ["Pays", "Land", "Paese", "País", "البلد"],
    "Back": ["Retour", "Zurück", "Indietro", "Atrás", "رجوع"],
    "Language": ["Langue", "Sprache", "Lingua", "Idioma", "اللغة"],
    "Official bulletin ·": ["Bulletin officiel ·", "Offizieller Lagebericht ·", "Bollettino ufficiale ·", "Boletín oficial ·", "النشرة الرسمية ·"],
    "Official avalanche bulletin ·": ["Bulletin d'avalanche officiel ·", "Offizieller Lawinenlagebericht ·", "Bollettino valanghe ufficiale ·", "Boletín oficial de aludes ·", "نشرة الانهيارات الرسمية ·"],
    "Day": ["Jour", "Tag", "Giorno", "Día", "اليوم"],
    "Low / high": ["Min / max", "Tief / hoch", "Min / max", "Mín / máx", "الصغرى / الكبرى"],
    "Skip to the snow list": ["Aller à la liste", "Zur Liste springen", "Vai all'elenco", "Ir a la lista", "انتقل إلى القائمة"],
    "Ski resort": ["Station de ski", "Skigebiet", "Stazione sciistica", "Estación de esquí", "محطة تزلج"],
    "You have SnowScope Pro.": ["Vous avez SnowScope Pro.", "Du hast SnowScope Pro.", "Hai SnowScope Pro.", "Tienes SnowScope Pro.", "لديك SnowScope Pro."],
    "Hotel links marked “Partner” may earn us a commission. © 2026 SnowScope · Atlas Labs": ["Les liens d'hôtels marqués « Partenaire » peuvent nous rapporter une commission. © 2026 SnowScope · Atlas Labs", "Mit „Partner“ markierte Hotel-Links können uns eine Provision bringen. © 2026 SnowScope · Atlas Labs", "I link hotel segnati «Partner» possono farci guadagnare una commissione. © 2026 SnowScope · Atlas Labs", "Los enlaces de hoteles marcados «Socio» pueden darnos una comisión. © 2026 SnowScope · Atlas Labs", "قد تمنحنا روابط الفنادق المعلّمة «شريك» عمولة. © 2026 SnowScope · Atlas Labs"],
    // expert portal (expert.js): layer rail, timeline, meteogram, shortcuts
    "Radar": ["Radar", "Radar", "Radar", "Radar", "الرادار"],
    "Pistes": ["Pistes", "Pisten", "Piste", "Pistas", "المسارات"],
    "Avalanche": ["Avalanche", "Lawinen", "Valanghe", "Avalanchas", "الانهيار الثلجي"],
    "More": ["Plus", "Mehr", "Altro", "Más", "المزيد"],
    "Last 2 hours": ["2 dernières heures", "Letzte 2 Stunden", "Ultime 2 ore", "Últimas 2 horas", "آخر ساعتين"],
    "Keyboard shortcuts": ["Raccourcis clavier", "Tastenkürzel", "Scorciatoie da tastiera", "Atajos de teclado", "اختصارات لوحة المفاتيح"],
    "Previous / next day": ["Jour précédent / suivant", "Vorheriger / nächster Tag", "Giorno precedente / successivo", "Día anterior / siguiente", "اليوم السابق / التالي"],
    "Previous / next hour": ["Heure précédente / suivante", "Vorherige / nächste Stunde", "Ora precedente / successiva", "Hora anterior / siguiente", "الساعة السابقة / التالية"],
    "Play / pause": ["Lecture / pause", "Abspielen / Pause", "Riproduci / pausa", "Reproducir / pausa", "تشغيل / إيقاف"],
    "Layers, in the order of the rail": ["Calques, dans l'ordre de la barre", "Ebenen, in der Reihenfolge der Leiste", "Livelli, nell'ordine della barra", "Capas, en el orden de la barra", "الطبقات بترتيب الشريط"],
    "All layers": ["Tous les calques", "Alle Ebenen", "Tutti i livelli", "Todas las capas", "كل الطبقات"],
    "Find a resort": ["Trouver une station", "Skigebiet finden", "Trova una stazione", "Buscar una estación", "ابحث عن محطة"],
    "Light / dark": ["Clair / sombre", "Hell / dunkel", "Chiaro / scuro", "Claro / oscuro", "فاتح / داكن"],
    "Close the panel": ["Fermer le panneau", "Panel schließen", "Chiudi il pannello", "Cerrar el panel", "أغلق اللوحة"],
    "This list": ["Cette liste", "Diese Liste", "Questo elenco", "Esta lista", "هذه القائمة"],
    "Light theme": ["Thème clair", "Helles Design", "Tema chiaro", "Tema claro", "المظهر الفاتح"],
    "Dark theme": ["Thème sombre", "Dunkles Design", "Tema scuro", "Tema oscuro", "المظهر الداكن"],
    "Tap anywhere on the map for the snow and the hour-by-hour forecast at that spot.": ["Touchez la carte pour la neige et la prévision heure par heure à cet endroit.", "Tippe auf die Karte für Schnee und Stundenprognose an dieser Stelle.", "Tocca la mappa per la neve e la previsione ora per ora in quel punto.", "Toca el mapa para ver la nieve y la previsión hora a hora en ese punto.", "اضغط على الخريطة لمعرفة الثلج والتوقعات ساعة بساعة في تلك النقطة."],
    "Hour by hour": ["Heure par heure", "Stunde für Stunde", "Ora per ora", "Hora a hora", "ساعة بساعة"],
    "The hour-by-hour forecast is updating, try again in a minute.": ["La prévision heure par heure se met à jour, réessayez dans une minute.", "Die Stundenprognose wird aktualisiert, versuche es gleich nochmal.", "La previsione ora per ora si aggiorna, riprova tra un minuto.", "La previsión hora a hora se actualiza, inténtalo en un minuto.", "التوقعات ساعة بساعة قيد التحديث، حاول مجددًا بعد دقيقة."],
    "Hour by hour: new snow, temperature, freezing level and wind": ["Heure par heure : neige fraîche, température, isotherme 0 °C et vent", "Stunde für Stunde: Neuschnee, Temperatur, Nullgradgrenze und Wind", "Ora per ora: neve fresca, temperatura, zero termico e vento", "Hora a hora: nieve nueva, temperatura, cota de 0 °C y viento", "ساعة بساعة: الثلج الجديد والحرارة ومستوى التجمد والرياح"],
    "snow": ["neige", "Schnee", "neve", "nieve", "ثلج"],
    "here": ["ici", "hier", "qui", "aquí", "هنا"],
    "temperature": ["température", "Temperatur", "temperatura", "temperatura", "الحرارة"],
    "freezing level": ["isotherme 0 °C", "Nullgradgrenze", "zero termico", "cota de 0 °C", "مستوى التجمد"],
    "wind": ["vent", "Wind", "vento", "viento", "الرياح"],
    "No snow in sight in any forecast.": ["Aucune neige en vue dans les prévisions.", "In keiner Prognose ist Schnee in Sicht.", "Nessuna neve in vista in nessuna previsione.", "Ninguna previsión ve nieve.", "لا ثلج متوقع في أي توقع."],
    "{a} forecasts agree: {b} cm over this period.": ["{a} prévisions d'accord : {b} cm sur la période.", "{a} Prognosen sind sich einig: {b} cm in diesem Zeitraum.", "{a} previsioni concordano: {b} cm nel periodo.", "{a} previsiones coinciden: {b} cm en este periodo.", "{a} توقعات متفقة: {b} سم خلال هذه الفترة."],
    "{a} forecasts differ: {b} cm over this period.": ["{a} prévisions divergent : {b} cm sur la période.", "{a} Prognosen weichen ab: {b} cm in diesem Zeitraum.", "{a} previsioni divergono: {b} cm nel periodo.", "{a} previsiones difieren: {b} cm en este periodo.", "{a} توقعات مختلفة: {b} سم خلال هذه الفترة."],
    "Forecast": ["Prévision", "Prognose", "Previsione", "Previsión", "توقع"],
    "Hide the comparison": ["Masquer la comparaison", "Vergleich ausblenden", "Nascondi il confronto", "Ocultar la comparación", "إخفاء المقارنة"],
    "Compare forecasts": ["Comparer les prévisions", "Prognosen vergleichen", "Confronta le previsioni", "Comparar previsiones", "قارن التوقعات"],
    "3 days are free.": ["3 jours sont gratuits.", "3 Tage sind gratis.", "3 giorni sono gratis.", "3 días son gratis.", "3 أيام مجانية."],
    "Pro shows the whole week, hour by hour.": ["Pro affiche toute la semaine, heure par heure.", "Pro zeigt die ganze Woche, Stunde für Stunde.", "Pro mostra tutta la settimana, ora per ora.", "Pro muestra toda la semana, hora a hora.", "يعرض Pro الأسبوع كاملًا ساعة بساعة."],
    "See the week": ["Voir la semaine", "Woche ansehen", "Vedi la settimana", "Ver la semana", "اعرض الأسبوع"],
    "The whole week, hour by hour, is in Pro": ["Toute la semaine, heure par heure, est dans Pro", "Die ganze Woche, Stunde für Stunde, gibt es mit Pro", "Tutta la settimana, ora per ora, è in Pro", "Toda la semana, hora a hora, está en Pro", "الأسبوع كاملًا ساعة بساعة في Pro"],
  };
  // patterns: {a} {b} are kept (numbers, names); a captured value found in T is translated too
  const P = {
    "checked {a}": ["vérifié le {a}", "geprüft am {a}", "verificato il {a}", "comprobado el {a}", "تم التحقق {a}"],
    "{a} resorts with snow": ["{a} stations enneigées", "{a} Skigebiete mit Schnee", "{a} stazioni con neve", "{a} estaciones con nieve", "{a} محطة بها ثلج"],
    "Fresh snow in {a}": ["Neige fraîche – {a}", "Neuschnee – {a}", "Neve fresca – {a}", "Nieve nueva – {a}", "ثلج جديد في {a}"],
    "Deepest snow in {a}": ["Neige la plus épaisse – {a}", "Am meisten Schnee – {a}", "Neve più alta – {a}", "Nieve más espesa – {a}", "أعمق ثلج في {a}"],
    "On the high peaks of {a}": ["Sur les hauts sommets – {a}", "Auf den hohen Gipfeln – {a}", "Sulle vette – {a}", "En las cumbres – {a}", "على القمم العالية في {a}"],
    "Under {a}": ["Moins de {a}", "Unter {a}", "Sotto {a}", "Menos de {a}", "أقل من {a}"],
    "A short flyover of {a} with today's snow": ["Un court survol de {a} avec la neige du jour", "Ein kurzer Flug über {a} mit dem Schnee von heute", "Un breve sorvolo di {a} con la neve di oggi", "Un breve vuelo sobre {a} con la nieve de hoy", "تحليق قصير فوق {a} مع ثلج اليوم"],
    "Deeper than {a} of 10 past winters on this date.": ["Plus épais que {a} hivers passés sur 10 à cette date.", "Mehr als in {a} von 10 früheren Wintern an diesem Tag.", "Più alta di {a} inverni passati su 10 in questa data.", "Más espesa que en {a} de cada 10 inviernos pasados en esta fecha.", "أعمق من {a} من كل 10 شتاءات سابقة في هذا التاريخ."],
    "{a} vs usual": ["{a} par rapport à l'habitude", "{a} gegenüber üblich", "{a} rispetto al solito", "{a} frente a lo habitual", "{a} مقارنة بالمعتاد"],
    "Around {a}": ["Autour de {a}", "Rund um {a}", "Intorno a {a}", "Alrededor de {a}", "حول {a}"],
    "In {a}": ["{a}", "{a}", "{a}", "{a}", "{a}"],
    "within {a} km": ["à {a} km", "bis {a} km", "entro {a} km", "a {a} km", "ضمن {a} كم"],
    "{a} vs yesterday": ["{a} vs hier", "{a} zu gestern", "{a} rispetto a ieri", "{a} vs ayer", "{a} مقارنة بالأمس"],
    "+{a} in 3 days": ["+{a} en 3 jours", "+{a} in 3 Tagen", "+{a} in 3 giorni", "+{a} en 3 días", "+{a} في 3 أيام"],
    "+{a} in 24 h": ["+{a} en 24 h", "+{a} in 24 h", "+{a} in 24 h", "+{a} en 24 h", "+{a} في 24 س"],
    "{a} km away": ["à {a} km", "{a} km entfernt", "a {a} km", "a {a} km", "على بعد {a} كم"],
    "{a} resorts": ["{a} stations", "{a} Skigebiete", "{a} stazioni", "{a} estaciones", "{a} محطة"],
    "top {a} m": ["sommet {a} m", "Gipfel {a} m", "vetta {a} m", "cima {a} m", "القمة {a} م"],
    "Near {a}": ["Près de {a}", "Bei {a}", "Vicino a {a}", "Cerca de {a}", "قرب {a}"],
    "Above normal for {a}.": ["Au-dessus de la normale pour {a}.", "Über dem Normalwert für {a}.", "Sopra la norma per {a}.", "Por encima de lo normal para {a}.", "فوق المعدل في {a}."],
    "Below normal for {a}.": ["En dessous de la normale pour {a}.", "Unter dem Normalwert für {a}.", "Sotto la norma per {a}.", "Por debajo de lo normal para {a}.", "دون المعدل في {a}."],
    "About normal for {a}.": ["Proche de la normale pour {a}.", "Etwa normal für {a}.", "Nella norma per {a}.", "Cerca de lo normal para {a}.", "قريب من المعدل في {a}."],
    "Snow expected {a}: +{b} cm": ["Neige attendue {a} : +{b} cm", "Schnee erwartet {a}: +{b} cm", "Neve prevista {a}: +{b} cm", "Nieve prevista el {a}: +{b} cm", "ثلج متوقع {a}: ‎+{b}‎ سم"],
    "Book a bed near {a} ·": ["Réservez un lit près de {a} ·", "Bett buchen bei {a} ·", "Prenota un letto vicino a {a} ·", "Reserva cama cerca de {a} ·", "احجز سريرًا قرب {a} ·"],
    "Best day: {a}": ["Meilleur jour : {a}", "Bester Tag: {a}", "Giorno migliore: {a}", "Mejor día: {a}", "أفضل يوم: {a}"],
    "Seen snow-covered on {a}": ["Vu enneigé le {a}", "Schneebedeckt gesehen am {a}", "Visto innevato il {a}", "Visto nevado el {a}", "شوهد مغطى بالثلج في {a}"],
    "Seen without snow on {a}": ["Vu sans neige le {a}", "Ohne Schnee gesehen am {a}", "Visto senza neve il {a}", "Visto sin nieve el {a}", "شوهد بلا ثلج في {a}"],
    "Patchy snow seen on {a}": ["Neige éparse vue le {a}", "Fleckiger Schnee gesehen am {a}", "Neve a chiazze vista il {a}", "Nieve irregular vista el {a}", "ثلج متقطع شوهد في {a}"],
    "Sleep near {a}": ["Dormir près de {a}", "Übernachten bei {a}", "Dormire vicino a {a}", "Dormir cerca de {a}", "نم قرب {a}"],
    "Fresh snow in {a}: up to +{b} cm": ["Neige fraîche – {a} : jusqu'à +{b} cm", "Neuschnee – {a}: bis +{b} cm", "Neve fresca – {a}: fino a +{b} cm", "Nieve nueva – {a}: hasta +{b} cm", "ثلج جديد في {a}: حتى ‎+{b}‎ سم"],
    "Snow at {a} resorts in {b} today": ["{b} : neige dans {a} stations aujourd'hui", "{b}: heute Schnee in {a} Skigebieten", "{b}: neve oggi in {a} stazioni", "{b}: nieve hoy en {a} estaciones", "{b}: ثلج اليوم في {a} محطة"],
    "Snow at {a} resorts in {b}": ["{b} : neige dans {a} stations", "{b}: Schnee in {a} Skigebieten", "{b}: neve in {a} stazioni", "{b}: nieve en {a} estaciones", "{b}: ثلج في {a} محطة"],
    "Snow on the high peaks in {a}, up to {b} cm": ["{a} : neige sur les hauts sommets, jusqu'à {b} cm", "{a}: Schnee auf den hohen Gipfeln, bis {b} cm", "{a}: neve sulle vette, fino a {b} cm", "{a}: nieve en las cumbres, hasta {b} cm", "{a}: ثلج على القمم العالية حتى {b} سم"],
    "No snow in {a} yet": ["{a} : pas encore de neige", "{a}: noch kein Schnee", "{a}: ancora niente neve", "{a}: aún sin nieve", "{a}: لا ثلج بعد"],
    "Biggest snowfall elsewhere: {a}, +{b} cm.": ["Plus forte chute ailleurs : {a}, +{b} cm.", "Am meisten Neuschnee anderswo: {a}, +{b} cm.", "Nevicata maggiore altrove: {a}, +{b} cm.", "Mayor nevada en otra zona: {a}, +{b} cm.", "أكبر تساقط في مكان آخر: {a}، ‎+{b}‎ سم."],
    "{a} resorts have snow": ["{a} stations enneigées", "{a} Skigebiete mit Schnee", "{a} stazioni con neve", "{a} estaciones con nieve", "{a} محطة بها ثلج"],
    "+{a} cm new": ["+{a} cm de fraîche", "+{a} cm neu", "+{a} cm di fresca", "+{a} cm nueva", "‎+{a}‎ سم جديد"],
    "{a} cm deep": ["{a} cm au sol", "{a} cm hoch", "{a} cm al suolo", "{a} cm de espesor", "{a} سم سمكًا"],
    "{a} cm on the ground": ["{a} cm au sol", "{a} cm am Boden", "{a} cm al suolo", "{a} cm en el suelo", "{a} سم على الأرض"],
    "Hotels near {a}": ["Hôtels près de {a}", "Hotels bei {a}", "Hotel vicino a {a}", "Hoteles cerca de {a}", "فنادق قرب {a}"],
    "Stay near {a}": ["Dormir près de {a}", "Übernachten bei {a}", "Dormire vicino a {a}", "Alojarse cerca de {a}", "الإقامة قرب {a}"],
    "Show all {a}": ["Tout afficher ({a})", "Alle {a} zeigen", "Mostra tutte ({a})", "Ver las {a}", "اعرض الكل ({a})"],
    "Nothing over 1 cm in the last {a}. Check tomorrow.": ["Rien au-dessus de 1 cm sur les dernières {a}. Revenez demain.", "Nichts über 1 cm in den letzten {a}. Schau morgen wieder.", "Niente oltre 1 cm nelle ultime {a}. Riprova domani.", "Nada por encima de 1 cm en las últimas {a}. Vuelve mañana.", "لا شيء فوق 1 سم خلال آخر {a}. عد غدًا."],
    "New snow · {a}": ["Neige fraîche · {a}", "Neuschnee · {a}", "Neve fresca · {a}", "Nieve nueva · {a}", "ثلج جديد · {a}"],
    "Snow on the ground · {a}": ["Neige au sol · {a}", "Schnee am Boden · {a}", "Neve al suolo · {a}", "Nieve en el suelo · {a}", "الثلج على الأرض · {a}"],
    "Wind at midday · {a}": ["Vent à midi · {a}", "Wind am Mittag · {a}", "Vento a mezzogiorno · {a}", "Viento a mediodía · {a}", "الرياح ظهرًا · {a}"],
    "Freezing level · {a}": ["Isotherme 0 °C · {a}", "Nullgradgrenze · {a}", "Zero termico · {a}", "Cota de congelación · {a}", "مستوى التجمد · {a}"],
    "Snow depth · {a}": ["Hauteur de neige · {a}", "Schneehöhe · {a}", "Altezza neve · {a}", "Espesor de nieve · {a}", "سمك الثلج · {a}"],
    "{a} · forecast": ["{a} · prévision", "{a} · Prognose", "{a} · previsione", "{a} · previsión", "{a} · توقعات"],
    "from the {a}": ["du {a}", "aus {a}", "da {a}", "del {a}", "من {a}"],
    "{a} is a Pro layer": ["{a} est un calque Pro", "{a} ist eine Pro-Ebene", "{a} è un livello Pro", "{a} es una capa Pro", "{a} طبقة Pro"],
    "{a} is in Pro": ["{a} est dans Pro", "{a} gibt es mit Pro", "{a} è in Pro", "{a} está en Pro", "{a} متاح في Pro"],
    "Stay near {a}·": ["Dormir près de {a}", "Übernachten bei {a}", "Dormire vicino a {a}", "Alojarse cerca de {a}", "الإقامة قرب {a}"],
    "7 more days at {a}": ["7 jours de plus à {a}", "7 weitere Tage in {a}", "7 giorni in più a {a}", "7 días más en {a}", "7 أيام أخرى في {a}"],
    "15 days at {a}": ["15 jours à {a}", "15 Tage in {a}", "15 giorni a {a}", "15 días en {a}", "15 يومًا في {a}"],
  };
  // US units (core.js SS.U): templates derived from the metric keys (numbers become {a} / {b}, units swap on output)
  const der = (from, to, f) => { if (T[from] && !T[to]) T[to] = T[from].map(f); };
  der("No measurement within 25 km", "No measurement within {a} km", (x) => x.replace("25", "{a}"));
  der("Snow depth on the upper slopes, cm", "Snow depth on the upper slopes, in", (x) => x.replace(/cm$/, "in").replace("سم", "إنش"));
  der("Snow, cm", "Snow, in", (x) => x.replace(/cm$/, "in").replace("سم", "إنش"));
  der("Where 0 °C sits", "Where 32 °F sits", (x) => x.replace("0 °C", "32 °F"));
  for (const [k, v] of Object.entries(P)) {
    if (k === "No snow storm right now (20 cm or more).") T["No snow storm right now ({a} cm or more)."] = v.map((x) => x.replace(/20/, "{a}"));
  }
  if (T["No snow storm right now (20 cm or more)."] && !T["No snow storm right now ({a} cm or more)."]) T["No snow storm right now ({a} cm or more)."] = T["No snow storm right now (20 cm or more)."].map((x) => x.replace(/20/, "{a}"));
  for (const src of [T, P]) {
    const q = src["Nothing over 1 cm in the last {a}. Check tomorrow."];
    if (q && !T["Nothing over {b} cm in the last {a}. Check tomorrow."]) T["Nothing over {b} cm in the last {a}. Check tomorrow."] = q.map((x) => x.replace(/1(?=\s?(cm|سم))/, "{b}"));
  }
  const usOn = () => !!(window.SS && SS.U && SS.U.us());
  const US_IN = /\u00a0(in|ft|mi|mph|°F)(?![\w])/;
  const toMetric = (k) => k.replace(/\u00a0mph(?![\w])/g, " km/h").replace(/\u00a0in(?![\w])/g, " cm").replace(/\u00a0ft(?![\w])/g, " m").replace(/\u00a0mi(?![\w])/g, " km");
  const toUS = (r) => r.replace(/ km\/h(?![\w])/g, "\u00a0mph").replace(/ cm(?![\w])/g, "\u00a0in").replace(/ km(?![\w])/g, "\u00a0mi").replace(/ m(?![\w])/g, "\u00a0ft")
    .replace(/كم\/س/g, "ميل/س").replace(/سم/g, "إنش").replace(/كم/g, "ميل").replace(/(^|\s)م(?=\s|$|[.,،])/g, "$1قدم");
  const COL = { fr: 0, de: 1, it: 2, es: 3, ar: 4 };
  const pick = () => {
    let q = null;
    try { q = new URLSearchParams(location.search).get("lang"); } catch { /* ignore */ }
    if (q && LANGS[q]) { try { localStorage.setItem("ss_lang", q); } catch { /* private */ } return q; }
    try { const s = localStorage.getItem("ss_lang"); if (s && LANGS[s]) return s; } catch { /* private */ }
    for (const l of navigator.languages || [navigator.language || "en"]) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS[k]) return k; }
    return "en";
  };
  const lang = pick();
  const col = COL[lang];
  document.documentElement.lang = lang;
  if (lang === "ar") document.documentElement.dir = "rtl";
  const pats = col == null ? [] : Object.entries(P).map(([k, v]) => {
    const names = [];
    const re = new RegExp("^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{([a-z])\}/g, (_, n) => { names.push(n); return "(.+?)"; }) + "$");
    return [re, names, v[col]];
  });
  function tr(s) {
    if (col == null) return s;
    const k0 = s.trim();
    if (!k0 || k0.length > 400) return s;
    const us = US_IN.test(k0), k = us ? toMetric(k0) : k0;     // "+4.7 in new" is translated on "+4.7 cm new"
    const hit = T[k];
    if (hit) return s.replace(k0, us ? toUS(hit[col]) : hit[col]);
    for (const [re, names, out] of pats) {
      const m = re.exec(k);
      if (m) {
        let r = out;
        names.forEach((n, i) => { const v = m[i + 1], tv = T[v] || T[v.replace(/^the /, "")]; r = r.replace("{" + n + "}", tv ? tv[col] : v); });
        return s.replace(k0, us ? toUS(r) : r);
      }
    }
    return s;
  }
  // a template with metric units ("{a} m higher"), translated, units swapped when US is on, then filled
  function tu(tpl, ...vals) {
    let r = col == null ? tpl : (T[tpl] ? T[tpl][col] : tr(tpl));
    if (usOn()) r = toUS(r);
    vals.forEach((v, i) => { r = r.replace("{" + "ab"[i] + "}", v); });
    return r;
  }
  const ATTRS = ["placeholder", "title", "aria-label"];
  function walk(node) {
    if (col == null) return;
    if (node.nodeType === 3) { const v = tr(node.nodeValue); if (v !== node.nodeValue) node.nodeValue = v; return; }
    if (node.nodeType !== 1 || node.matches("script,style,svg text.lbl,.ms,[data-noi18n]")) return;
    for (const a of ATTRS) if (node.hasAttribute(a)) { const v = tr(node.getAttribute(a)); if (v !== node.getAttribute(a)) node.setAttribute(a, v); }
    for (const c of node.childNodes) walk(c);
  }
  if (col != null) {
    const go = () => {
      walk(document.body);
      new MutationObserver((ms) => {
        for (const m of ms) {
          if (m.type === "characterData") walk(m.target);
          else if (m.type === "attributes") walk(m.target);
          else m.addedNodes.forEach(walk);
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    };
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }
  function menu(anchor) {
    const ul = document.createElement("div");
    ul.className = "langmenu glass";
    const um = window.SS && SS.U ? SS.U.mode() : "metric";
    ul.innerHTML = Object.entries(LANGS).map(([k, v]) => '<button data-l="' + k + '"' + (k === lang ? ' aria-current="true"' : "") + ' lang="' + k + '">' + v + "</button>").join("") +
      '<hr><div class="unitsrow" role="group" aria-label="' + tr("Units") + '"><button data-u="metric"' + (um === "metric" ? ' aria-current="true"' : "") + ">" + tr("Metric") + '</button><button data-u="us"' + (um === "us" ? ' aria-current="true"' : "") + ">" + tr("US units") + "</button></div>";
    document.body.appendChild(ul);
    const r = anchor.getBoundingClientRect();
    ul.style.top = r.bottom + 6 + "px";
    if (document.documentElement.dir === "rtl") ul.style.left = r.left + "px"; else ul.style.right = (innerWidth - r.right) + "px";
    const close = (e) => { if (!ul.contains(e.target)) { ul.remove(); document.removeEventListener("click", close, true); } };
    setTimeout(() => document.addEventListener("click", close, true));
    ul.onclick = (e) => {
      const ub = e.target.closest("[data-u]");
      if (ub) { if (window.SS && SS.U && ub.dataset.u !== SS.U.mode()) { SS.U.set(ub.dataset.u); location.reload(); } return; }
      const b = e.target.closest("[data-l]");
      if (!b) return;
      try { localStorage.setItem("ss_lang", b.dataset.l); } catch { /* private */ }
      const u = new URL(location.href); u.searchParams.set("lang", b.dataset.l); location.href = u.href;
    };
  }
  window.I18N = { lang, locale: LOCALE[lang], t: tr, tu, menu, LANGS };
})();
