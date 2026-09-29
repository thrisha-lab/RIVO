/**
 * RiderGuard i18n — lightweight translation system.
 *
 * Supports English (default) and Hindi. The language is stored in localStorage
 * and applies to all static UI strings. Dynamic data (weather descriptions,
 * AI explanations) remain in English for now.
 *
 * Usage:
 *   const { t, lang, setLang } = useI18n();
 *   t("risk.assessment")  // → "Trip Risk Assessment" / "यात्रा जोखिम मूल्यांकन"
 */

export type Lang = "en" | "hi";

export const LANGS: { code: Lang; label: string; nativeLabel: string; flag: string }[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
];

// Translation dictionary. Nested keys via dot notation.
type Dict = Record<string, string>;

const en: Dict = {
  // Header
  "app.name": "RiderGuard",
  "app.tagline": "AI weather safety co-pilot",

  // GPS
  "gps.title": "GPS & Location",
  "gps.tracking": "Tracking",
  "gps.located": "Located",
  "gps.off": "Off",
  "gps.blocked": "Blocked",
  "gps.startTracking": "Start tracking",
  "gps.stop": "Stop",
  "gps.findMe": "Find me",
  "gps.currentPosition": "Current position",
  "gps.noFix": "No GPS fix yet. Grant location access to begin.",
  "gps.permissionDenied": "Location permission was denied. Enable it in your browser settings to use live tracking.",
  "gps.privacyNote": "GPS positions are stored separately from your searched destinations and only linked to your anonymous rider ID.",

  // Risk
  "risk.assessment": "Trip Risk Assessment",
  "risk.score": "Risk score",
  "risk.contributingFactors": "Contributing factors",
  "risk.recommendation": "Recommendation",
  "risk.setDestination": "Set your location and a destination to compute a deterministic risk score.",
  "risk.engineNote": "The risk engine is the single source of truth — AI only explains it.",
  "risk.analysing": "Analysing weather, hazards & route…",
  "risk.askAI": "Ask AI co-pilot to explain",
  "risk.askingAI": "Asking AI co-pilot…",
  "risk.low": "Low Risk",
  "risk.moderate": "Moderate Risk",
  "risk.high": "High Risk",
  "risk.severe": "Severe Risk",

  // Weather
  "weather.live": "Live Weather",
  "weather.loadsOnDest": "Weather loads when you set a destination",
  "weather.tapHint": "Tap \"Find me\" or pick a destination on the map",
  "weather.rainNow": "Rain now",
  "weather.falling": "falling",
  "weather.chance": "chance",
  "weather.wind": "Wind",
  "weather.gust": "gust",
  "weather.visibility": "Visibility",
  "weather.humidity": "Humidity",
  "weather.humid": "humid",
  "weather.ok": "ok",
  "weather.feelsLike": "feels",
  "weather.rainHint": "Rain isn't falling yet, but there's a chance in the next few hours. Carry wet-weather gear.",

  // Forecast
  "forecast.title": "12-Hour Forecast",
  "forecast.bestDepart": "Best time to depart",
  "forecast.riskByHour": "Risk by hour",
  "forecast.unavailable": "Forecast unavailable for this location.",

  // Delivery impact
  "impact.title": "Delivery Impact",
  "impact.estimatedTime": "Estimated time",
  "impact.baseline": "min baseline",
  "impact.slowdown": "Slowdown",
  "impact.worthIt": "Worth it",
  "impact.caution": "Proceed with caution",
  "impact.notWorth": "Not worth it",

  // AI
  "ai.title": "AI Co-pilot",
  "ai.empty": "Tap \"Ask AI co-pilot to explain\" to get a plain-language breakdown of your trip risk and tailored safety tips. The AI only explains the deterministic risk score — it cannot change it.",
  "ai.safetyTips": "Safety tips",
  "ai.advisory": "AI explanation is advisory. The risk score is computed deterministically and is the source of truth.",

  // Tabs
  "tab.feed": "Feed",
  "tab.stops": "Stops",
  "tab.report": "Report",
  "tab.stats": "Stats",
  "tab.trips": "Trips",
  "tab.top": "Top",
  "tab.badges": "Badges",

  // Feed
  "feed.title": "Rider Network Feed",
  "feed.empty": "No nearby activity yet.",
  "feed.emptySub": "Be the first to report a hazard.",
  "feed.confirm": "Confirm",
  "feed.resolved": "Resolved",
  "feed.showOnMap": "Show on map",
  "feed.loading": "Loading community intelligence…",

  // Safe stops
  "stops.title": "Safe Stops Nearby",
  "stops.empty": "No safe stops within range. Try widening your search.",
  "stops.loading": "Finding safe stops…",

  // Hazard report
  "report.title": "Report a Hazard",
  "report.type": "Type",
  "report.severity": "Severity",
  "report.details": "Details (optional)",
  "report.detailsPlaceholder": "e.g. large water-filled pothole near the junction",
  "report.photo": "Photo (optional)",
  "report.tapPhoto": "Tap to add a photo",
  "report.photoHint": "JPEG, PNG, WebP · max 4MB",
  "report.pin": "Pin",
  "report.noLocation": "no location set",
  "report.submit": "Submit report",
  "report.submitting": "Submitting…",
  "report.reported": "Reported!",
  "report.setLocationFirst": "Set a location first (find me or tap the map).",

  // Route
  "route.summary": "Route summary",
  "route.options": "Route Options",
  "route.found": "found",
  "route.fastest": "Fastest",
  "route.shortest": "Shortest",
  "route.safest": "Safest",
  "route.recommended": "Recommended",
  "route.ride": "Ride",
  "route.share": "Share",
  "route.etdNow": "ETD now",
  "route.comparing": "Comparing routes…",

  // SOS
  "sos.title": "Emergency SOS",
  "sos.triggerAssist": "Trigger emergency assistance",
  "sos.warning": "Triggering SOS will alert your emergency contacts and nearby riders with your live location. Use only in genuine emergencies.",
  "sos.activate": "Activate SOS",
  "sos.activating": "Activating SOS…",
  "sos.call112": "Call 112 directly",
  "sos.call112Emergency": "Call 112 (Emergency)",
  "sos.contacts": "Emergency contacts",
  "sos.manage": "Manage",
  "sos.hide": "Hide",
  "sos.noContacts": "No contacts yet. Add someone you trust.",
  "sos.addContact": "Add contact",
  "sos.contactName": "Name",
  "sos.contactPhone": "Phone",
  "sos.imSafe": "I'm safe — cancel SOS",
  "sos.sosActive": "SOS ACTIVE — help is alerted",
  "sos.liveLocation": "Your live location is being shared with your emergency contacts and nearby riders. Stay where you are if it's safe.",
  "sos.locationRequired": "Location required — tap \"Find me\" first so we know where to send help.",

  // Ride mode
  "ride.riding": "Riding",
  "ride.exit": "Exit",

  // Footer
  "footer.deterministic": "Risk scores are deterministic. AI explains only — never overrides safety.",
  "footer.weather": "Weather: Open-Meteo",
  "footer.maps": "Maps: OpenStreetMap",
  "footer.routing": "Routing: OSRM",
  "footer.ai": "AI: Z.ai",
  "footer.realtime": "Realtime: Socket.io",

  // Onboarding
  "onboard.welcome": "Welcome to RiderGuard",
  "onboard.welcomeBody": "Your AI weather safety co-pilot. We help delivery riders make safer travel decisions with real-time intelligence.",
  "onboard.setLocation": "Set your location & destination",
  "onboard.setLocationBody": "Tap \"Find me\" to share your GPS, then search or tap the map to set a destination. We'll compute a deterministic risk score for your trip.",
  "onboard.weather": "Weather & route intelligence",
  "onboard.weatherBody": "Live weather, 12-hour forecast, best departure time, and route-aware hazard sampling — all feeding a transparent risk score.",
  "onboard.community": "Community rider network",
  "onboard.communityBody": "Report hazards, confirm or dispute others' reports, and earn reputation. The leaderboard celebrates top safety contributors.",
  "onboard.emergency": "Emergency SOS",
  "onboard.emergencyBody": "The red SOS button (bottom-right) alerts your emergency contacts and nearby riders with your live location. Add trusted contacts in the SOS panel.",
  "onboard.aiContract": "AI explains, never overrides",
  "onboard.aiContractBody": "The deterministic risk engine is the source of truth. The AI co-pilot only explains the score and offers tailored safety tips.",
  "onboard.skip": "Skip tour",
  "onboard.skipOnboarding": "Skip onboarding",
  "onboard.next": "Next",
  "onboard.back": "Back",
  "onboard.getStarted": "Get started",

  // Stats
  "stats.title": "Weekly Stats",
  "stats.trips": "Trips",
  "stats.distance": "Distance",
  "stats.reports": "Reports",
  "stats.votes": "Votes",
  "stats.streak": "Current streak",
  "stats.activeDays": "active days (14d)",
  "stats.tripsThisWeek": "Trips this week",
  "stats.riskDistribution": "Risk distribution",
  "stats.allTrips": "All trips",
  "stats.allReports": "All reports",
  "stats.reputation": "Reputation",

  // Common
  "common.loading": "Loading…",
  "common.refresh": "Refresh",
  "common.settings": "Settings",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.away": "away",
};

const hi: Dict = {
  "app.name": "RiderGuard",
  "app.tagline": "एआई मौसम सुरक्षा सहायक",

  "gps.title": "जीपीएस और स्थान",
  "gps.tracking": "ट्रैकिंग",
  "gps.located": "स्थित",
  "gps.off": "बंद",
  "gps.blocked": "अवरुद्ध",
  "gps.startTracking": "ट्रैकिंग शुरू करें",
  "gps.stop": "रोकें",
  "gps.findMe": "मुझे खोजें",
  "gps.currentPosition": "वर्तमान स्थिति",
  "gps.noFix": "अभी तक जीपीएस नहीं मिला। शुरू करने के लिए स्थान एक्सेस प्रदान करें।",
  "gps.permissionDenied": "स्थान अनुमति अस्वीकृत। लाइव ट्रैकिंग के लिए ब्राउज़र सेटिंग्स में इसे सक्षम करें।",
  "gps.privacyNote": "जीपीएस स्थितियाँ आपकी खोजी गंतव्यों से अलग संग्रहीत होती हैं और केवल आपके गुमनाम राइडर आईडी से जुड़ी हैं।",

  "risk.assessment": "यात्रा जोखिम मूल्यांकन",
  "risk.score": "जोखिम स्कोर",
  "risk.contributingFactors": "योगदान कारक",
  "risk.recommendation": "अनुशंसा",
  "risk.setDestination": "निर्धारित जोखिम स्कोर की गणना के लिए अपना स्थान और गंतव्य सेट करें।",
  "risk.engineNote": "जोखिम इंजन सत्य का एकमात्र स्रोत है — एआई केवल इसे समझाता है।",
  "risk.analysing": "मौसम, खतरों और मार्ग का विश्लेषण…",
  "risk.askAI": "एआई सह-पायलट से समझाने को कहें",
  "risk.askingAI": "एआई सह-पायलट से पूछ रहे हैं…",
  "risk.low": "कम जोखिम",
  "risk.moderate": "मध्यम जोखिम",
  "risk.high": "उच्च जोखिम",
  "risk.severe": "गंभीर जोखिम",

  "weather.live": "लाइव मौसम",
  "weather.loadsOnDest": "गंतव्य सेट होने पर मौसम लोड होगा",
  "weather.tapHint": "\"मुझे खोजें\" टैप करें या मानचित्र पर गंतव्य चुनें",
  "weather.rainNow": "अभी बारिश",
  "weather.falling": "हो रही है",
  "weather.chance": "संभावना",
  "weather.wind": "हवा",
  "weather.gust": "झोंका",
  "weather.visibility": "दृश्यता",
  "weather.humidity": "नमी",
  "weather.humid": "आर्द्र",
  "weather.ok": "ठीक",
  "weather.feelsLike": "महसूस",
  "weather.rainHint": "अभी बारिश नहीं हो रही, लेकिन अगले कुछ घंटों में संभावना है। गीले मौसम का सामान लें।",

  "forecast.title": "12-घंटे का पूर्वानुमान",
  "forecast.bestDepart": "प्रस्थान का सर्वोत्तम समय",
  "forecast.riskByHour": "घंटे अनुसार जोखिम",
  "forecast.unavailable": "इस स्थान के लिए पूर्वानुमान अनुपलब्ध।",

  "impact.title": "डिलीवरी प्रभाव",
  "impact.estimatedTime": "अनुमानित समय",
  "impact.baseline": "मिनट आधार",
  "impact.slowdown": "धीमा",
  "impact.worthIt": "उपयुक्त",
  "impact.caution": "सावधानी से आगे बढ़ें",
  "impact.notWorth": "उपयुक्त नहीं",

  "ai.title": "एआई सह-पायलट",
  "ai.empty": "अपनी यात्रा जोखिम और अनुरूप सुरक्षा युक्तियों का स्पष्ट विवरण पाने के लिए \"एआई सह-पायलट से समझाने को कहें\" टैप करें। एआई केवल निर्धारित जोखिम स्कोर को समझाता है — इसे बदल नहीं सकता।",
  "ai.safetyTips": "सुरक्षा युक्तियाँ",
  "ai.advisory": "एआई व्याख्या सलाहकारी है। जोखिम स्कोर निर्धारित रूप से गणना की जाती है और सत्य का स्रोत है।",

  "tab.feed": "फ़ीड",
  "tab.stops": "स्टॉप",
  "tab.report": "रिपोर्ट",
  "tab.stats": "आँकड़े",
  "tab.trips": "यात्राएँ",
  "tab.top": "शीर्ष",
  "tab.badges": "बैज",

  "feed.title": "राइडर नेटवर्क फ़ीड",
  "feed.empty": "अभी तक कोई आस-पास गतिविधि नहीं।",
  "feed.emptySub": "खतरा रिपोर्ट करने वाले पहले बनें।",
  "feed.confirm": "पुष्टि",
  "feed.resolved": "हल हुआ",
  "feed.showOnMap": "मानचित्र पर दिखाएँ",
  "feed.loading": "सामुदायिक खुफिया जानकारी लोड हो रही है…",

  "stops.title": "पास में सुरक्षित स्टॉप",
  "stops.empty": "श्रेणी में कोई सुरक्षित स्टॉप नहीं। अपनी खोज विस्तृत करें।",
  "stops.loading": "सुरक्षित स्टॉप खोज रहे हैं…",

  "report.title": "खतरा रिपोर्ट करें",
  "report.type": "प्रकार",
  "report.severity": "गंभीरता",
  "report.details": "विवरण (वैकल्पिक)",
  "report.detailsPlaceholder": "जैसे चौराहे के पास बड़ा पानी भरा गड्ढा",
  "report.photo": "फ़ोटो (वैकल्पिक)",
  "report.tapPhoto": "फ़ोटो जोड़ने के लिए टैप करें",
  "report.photoHint": "JPEG, PNG, WebP · अधिकतम 4MB",
  "report.pin": "पिन",
  "report.noLocation": "कोई स्थान सेट नहीं",
  "report.submit": "रिपोर्ट सबमिट करें",
  "report.submitting": "सबमिट हो रहा है…",
  "report.reported": "रिपोर्ट हुई!",
  "report.setLocationFirst": "पहले स्थान सेट करें (मुझे खोजें या मानचित्र टैप करें)।",

  "route.summary": "मार्ग सारांश",
  "route.options": "मार्ग विकल्प",
  "route.found": "मिले",
  "route.fastest": "सबसे तेज़",
  "route.shortest": "सबसे छोटा",
  "route.safest": "सबसे सुरक्षित",
  "route.recommended": "अनुशंसित",
  "route.ride": "राइड",
  "route.share": "साझा",
  "route.etdNow": "अभी प्रस्थान",
  "route.comparing": "मार्गों की तुलना…",

  "sos.title": "आपातकालीन SOS",
  "sos.triggerAssist": "आपातकालीन सहायता ट्रिगर करें",
  "sos.warning": "SOS ट्रिगर करने से आपके आपातकालीन संपर्क और आस-पास के राइडरों को आपका लाइव स्थान भेजा जाएगा। केवल वास्तविक आपातकाल में उपयोग करें।",
  "sos.activate": "SOS सक्रिय करें",
  "sos.activating": "SOS सक्रिय हो रहा है…",
  "sos.call112": "112 पर सीधे कॉल करें",
  "sos.call112Emergency": "112 कॉल करें (आपातकालीन)",
  "sos.contacts": "आपातकालीन संपर्क",
  "sos.manage": "प्रबंधित",
  "sos.hide": "छिपाएँ",
  "sos.noContacts": "अभी कोई संपर्क नहीं। किसी भरोसेमंद व्यक्ति को जोड़ें।",
  "sos.addContact": "संपर्क जोड़ें",
  "sos.contactName": "नाम",
  "sos.contactPhone": "फ़ोन",
  "sos.imSafe": "मैं सुरक्षित हूँ — SOS रद्द करें",
  "sos.sosActive": "SOS सक्रिय — सहायता सूचित",
  "sos.liveLocation": "आपका लाइव स्थान आपके आपातकालीन संपर्कों और आस-पास के राइडरों के साथ साझा किया जा रहा है। सुरक्षित होने पर वहीं रुकें।",
  "sos.locationRequired": "स्थान आवश्यक — हमें पता हो कि मदद कहाँ भेजनी है, इसके लिए पहले \"मुझे खोजें\" टैप करें।",

  "ride.riding": "राइडिंग",
  "ride.exit": "बाहर",

  "footer.deterministic": "जोखिम स्कोर निर्धारित हैं। एआई केवल समझाता है — सुरक्षा कभी ओवरराइड नहीं।",
  "footer.weather": "मौसम: Open-Meteo",
  "footer.maps": "मानचित्र: OpenStreetMap",
  "footer.routing": "रूटिंग: OSRM",
  "footer.ai": "एआई: Z.ai",
  "footer.realtime": "रीयलटाइम: Socket.io",

  "onboard.welcome": "RiderGuard में आपका स्वागत है",
  "onboard.welcomeBody": "आपका एआई मौसम सुरक्षा सह-पायलट। हम डिलीवरी राइडरों को वास्तविक समय खुफिया जानकारी के साथ सुरक्षित यात्रा निर्णय लेने में मदद करते हैं।",
  "onboard.setLocation": "अपना स्थान और गंतव्य सेट करें",
  "onboard.setLocationBody": "\"मुझे खोजें\" टैप करके अपना जीपीएस साझा करें, फिर गंतव्य सेट करने के लिए खोजें या मानचित्र टैप करें। हम आपकी यात्रा के लिए निर्धारित जोखिम स्कोर की गणना करेंगे।",
  "onboard.weather": "मौसम और मार्ग खुफिया जानकारी",
  "onboard.weatherBody": "लाइव मौसम, 12-घंटे का पूर्वानुमान, प्रस्थान का सर्वोत्तम समय, और मार्ग-जागरूक खतरा नमूनाकरण — सब एक पारदर्शी जोखिम स्कोर में।",
  "onboard.community": "सामुदायिक राइडर नेटवर्क",
  "onboard.communityBody": "खतरे रिपोर्ट करें, दूसरों की रिपोर्ट की पुष्टि या विवाद करें, और प्रतिष्ठा अर्जित करें। लीडरबोर्ड शीर्ष सुरक्षा योगदानकर्ताओं का सम्मान करता है।",
  "onboard.emergency": "आपातकालीन SOS",
  "onboard.emergencyBody": "लाल SOS बटन (निचला-दाएँ) आपके आपातकालीन संपर्कों और आस-पास के राइडरों को आपके लाइव स्थान के साथ सूचित करता है। SOS पैनल में भरोसेमंद संपर्क जोड़ें।",
  "onboard.aiContract": "एआई समझाता है, ओवरराइड नहीं",
  "onboard.aiContractBody": "निर्धारित जोखिम इंजन सत्य का स्रोत है। एआई सह-पायलट केवल स्कोर समझाता है और अनुरूप सुरक्षा युक्तियाँ देता है।",
  "onboard.skip": "टूर छोड़ें",
  "onboard.skipOnboarding": "ऑनबोर्डिंग छोड़ें",
  "onboard.next": "अगला",
  "onboard.back": "पीछे",
  "onboard.getStarted": "शुरू करें",

  "stats.title": "साप्ताहिक आँकड़े",
  "stats.trips": "यात्राएँ",
  "stats.distance": "दूरी",
  "stats.reports": "रिपोर्ट",
  "stats.votes": "वोट",
  "stats.streak": "वर्तमान श्रृंखला",
  "stats.activeDays": "सक्रिय दिन (14दि)",
  "stats.tripsThisWeek": "इस सप्ताह यात्राएँ",
  "stats.riskDistribution": "जोखिम वितरण",
  "stats.allTrips": "कुल यात्राएँ",
  "stats.allReports": "कुल रिपोर्ट",
  "stats.reputation": "प्रतिष्ठा",

  "common.loading": "लोड हो रहा है…",
  "common.refresh": "ताज़ा",
  "common.settings": "सेटिंग्स",
  "common.close": "बंद",
  "common.cancel": "रद्द",
  "common.save": "सहेजें",
  "common.delete": "हटाएँ",
  "common.away": "दूर",
};

const dicts: Record<Lang, Dict> = { en, hi };

export function translate(lang: Lang, key: string): string {
  return dicts[lang]?.[key] ?? dicts.en[key] ?? key;
}
