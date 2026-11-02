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
  };
  // patterns: {a} {b} are kept (numbers, names); a captured value found in T is translated too
  const P = {
    "Around {a}": ["Autour de {a}", "Rund um {a}", "Intorno a {a}", "Alrededor de {a}", "حول {a}"],
    "In {a}": ["{a}", "{a}", "{a}", "{a}", "{a}"],
    "within {a} km": ["à {a} km", "bis {a} km", "entro {a} km", "a {a} km", "ضمن {a} كم"],
    "{a} km away": ["à {a} km", "{a} km entfernt", "a {a} km", "a {a} km", "على بعد {a} كم"],
    "{a} resorts": ["{a} stations", "{a} Skigebiete", "{a} stazioni", "{a} estaciones", "{a} محطة"],
    "top {a} m": ["sommet {a} m", "Gipfel {a} m", "vetta {a} m", "cima {a} m", "القمة {a} م"],
    "Near {a}": ["Près de {a}", "Bei {a}", "Vicino a {a}", "Cerca de {a}", "قرب {a}"],
    "Above normal for {a}.": ["Au-dessus de la normale pour {a}.", "Über dem Normalwert für {a}.", "Sopra la norma per {a}.", "Por encima de lo normal para {a}.", "فوق المعدل في {a}."],
    "Below normal for {a}.": ["En dessous de la normale pour {a}.", "Unter dem Normalwert für {a}.", "Sotto la norma per {a}.", "Por debajo de lo normal para {a}.", "دون المعدل في {a}."],
    "About normal for {a}.": ["Proche de la normale pour {a}.", "Etwa normal für {a}.", "Nella norma per {a}.", "Cerca de lo normal para {a}.", "قريب من المعدل في {a}."],
    "Snow expected {a}: +{b} cm": ["Neige attendue {a} : +{b} cm", "Schnee erwartet {a}: +{b} cm", "Neve prevista {a}: +{b} cm", "Nieve prevista el {a}: +{b} cm", "ثلج متوقع {a}: ‎+{b}‎ سم"],
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
    const k = s.trim();
    if (!k || k.length > 400) return s;
    const hit = T[k];
    if (hit) return s.replace(k, hit[col]);
    for (const [re, names, out] of pats) {
      const m = re.exec(k);
      if (m) {
        let r = out;
        names.forEach((n, i) => { const v = m[i + 1], tv = T[v] || T[v.replace(/^the /, "")]; r = r.replace("{" + n + "}", tv ? tv[col] : v); });
        return s.replace(k, r);
      }
    }
    return s;
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
    ul.innerHTML = Object.entries(LANGS).map(([k, v]) => '<button data-l="' + k + '"' + (k === lang ? ' aria-current="true"' : "") + ' lang="' + k + '">' + v + "</button>").join("");
    document.body.appendChild(ul);
    const r = anchor.getBoundingClientRect();
    ul.style.top = r.bottom + 6 + "px";
    if (document.documentElement.dir === "rtl") ul.style.left = r.left + "px"; else ul.style.right = (innerWidth - r.right) + "px";
    const close = (e) => { if (!ul.contains(e.target)) { ul.remove(); document.removeEventListener("click", close, true); } };
    setTimeout(() => document.addEventListener("click", close, true));
    ul.onclick = (e) => {
      const b = e.target.closest("[data-l]");
      if (!b) return;
      try { localStorage.setItem("ss_lang", b.dataset.l); } catch { /* private */ }
      const u = new URL(location.href); u.searchParams.set("lang", b.dataset.l); location.href = u.href;
    };
  }
  window.I18N = { lang, locale: LOCALE[lang], t: tr, menu, LANGS };
})();
