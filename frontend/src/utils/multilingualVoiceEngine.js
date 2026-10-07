/**
 * RESTOSMART Multilingual Voice Ordering & Speech Synthesis Engine
 * Supports English (en-IN), Kannada (kn-IN), and Hindi (hi-IN) with extensible
 * architecture for future Indian languages (Telugu, Tamil, Marathi, Bengali, etc.)
 */

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en-IN',
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    subtext: 'Speak in English',
    speechLang: 'en-IN',
    ttsLang: 'en-IN',
    greeting: 'Welcome! What would you like to order today?',
    confirmPrompt: 'Is this order correct? Say "Yes, confirm" or tap Confirm.',
    listeningPrompt: 'Listening... Speak your food order naturally',
    tryExample: 'e.g. "One Masala Dosa and two Cold Coffees"',
    confirmKeywords: ['yes', 'confirm', 'correct', 'proceed', 'okay', 'ok', 'place order', 'done', 'yes confirm'],
    cancelKeywords: ['no', 'cancel', 'reset', 'clear', 'wrong', 'restart'],
  },
  {
    code: 'kn-IN',
    id: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    subtext: 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ',
    speechLang: 'kn-IN',
    ttsLang: 'kn-IN',
    greeting: 'ಸ್ವಾಗತ! ಇಂದು ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    confirmPrompt: 'ಈ ಆರ್ಡರ್ ಸರಿಯಾಗಿದೆಯೇ? "ಹೌದು" ಎಂದು ಹೇಳಿ ಅಥವಾ ಕನ್ಫರ್ಮ್ ಒತ್ತಿರಿ.',
    listeningPrompt: 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... ನಿಮ್ಮ ಆರ್ಡರ್ ಅನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ',
    tryExample: 'ಉದಾ: "ಒಂದು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಎರಡು ಕೋಲ್ಡ್ ಕಾಫಿ"',
    confirmKeywords: ['ಹೌದು', 'ಸರಿ', 'ಖಚಿತಪಡಿಸಿ', 'ಆರ್ಡರ್', 'ಖಚಿತ', 'ಸರಿಯಾಗಿದೆ', 'ಆರ್ಡರ್ ಮಾಡಿ', 'yes', 'confirm', 'haudu', 'sari'],
    cancelKeywords: ['ಬೇಡ', 'ರದ್ದು', 'ತಪ್ಪು', 'ಮತ್ತೆ', 'ಬೇಡವೇ ಬೇಡ', 'no', 'cancel'],
  },
  {
    code: 'hi-IN',
    id: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    subtext: 'हिन्दी में बोलें',
    speechLang: 'hi-IN',
    ttsLang: 'hi-IN',
    greeting: 'नमस्ते! आज आप क्या ऑर्डर करना चाहेंगे?',
    confirmPrompt: 'क्या यह ऑर्डर सही है? "हाँ" कहें या कन्फर्म पर टैप करें।',
    listeningPrompt: 'सुन रहे हैं... कृपया अपना खाना का ऑर्डर बोलें',
    tryExample: 'उदा: "एक मसाला डोसा और दो कोल्ड कॉफ़ी"',
    confirmKeywords: ['हाँ', 'सही', 'कन्फर्म', 'ऑर्डर', 'करो', 'ठीक है', 'हाँ कन्फर्म', 'yes', 'confirm', 'haan', 'sahi'],
    cancelKeywords: ['नहीं', 'रद्द', 'गलत', 'वापस', 'no', 'cancel', 'nahi'],
  }
];

// Multilingual Number Word Dictionary
export const MULTILINGUAL_NUMBERS = {
  // English
  'a': 1,
  'an': 1,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'couple': 2,
  'dozen': 12,
  'half dozen': 6,

  // Kannada (Words & Numerals)
  '೧': 1,
  '೨': 2,
  '೩': 3,
  '೪': 4,
  '೫': 5,
  '೬': 6,
  '೭': 7,
  '೮': 8,
  '೯': 9,
  '೧೦': 10,
  'ಒಂದು': 1,
  'ಎರಡು': 2,
  'ಮೂರು': 3,
  'ನಾಲ್ಕು': 4,
  'ಐದು': 5,
  'ಆರು': 6,
  'ಏಳು': 7,
  'ಎಂಟು': 8,
  'ಒಂಬತ್ತು': 9,
  'ಹತ್ತು': 10,
  'ondu': 1,
  'eradu': 2,
  'mooru': 3,
  'naalku': 4,
  'aidu': 5,

  // Hindi (Words & Numerals)
  '१': 1,
  '२': 2,
  '३': 3,
  '४': 4,
  '५': 5,
  '६': 6,
  '७': 7,
  '८': 8,
  '९': 9,
  '१०': 10,
  'एक': 1,
  'दो': 2,
  'तीन': 3,
  'चार': 4,
  'पांच': 5,
  'पाँच': 5,
  'छह': 6,
  'सात': 7,
  'आठ': 8,
  'नौ': 9,
  'दस': 10,
  'ek': 1,
  'do': 2,
  'teen': 3,
  'char': 4,
  'paanch': 5,
};

// Multilingual Food Name Synonyms & Translations
export const FOOD_TRANSLATIONS = {
  // Masala Dosa
  'masala dosa': 'Masala Dosa',
  'masale dose': 'Masala Dosa',
  'dosa': 'Masala Dosa',
  'dose': 'Masala Dosa',
  'ಮಸಾಲ ದೋಸೆ': 'Masala Dosa',
  'ಮಸಾಲೆ ದೋಸೆ': 'Masala Dosa',
  'ದೋಸೆ': 'Masala Dosa',
  'मसाला डोसा': 'Masala Dosa',
  'डोसा': 'Masala Dosa',

  // Gobi Manchurian
  'gobi manchurian': 'Gobi Manchurian',
  'gobi manchuri': 'Gobi Manchurian',
  'gobi': 'Gobi Manchurian',
  'ಗೋಬಿ ಮಂಚೂರಿಯನ್': 'Gobi Manchurian',
  'ಗೋಬಿ ಮಂಚೂರಿ': 'Gobi Manchurian',
  'ಗೋಬಿ': 'Gobi Manchurian',
  'गोबी मंचूरियन': 'Gobi Manchurian',
  'गोभी मंचूरियन': 'Gobi Manchurian',

  // Chicken Kabab
  'chicken kabab': 'Chicken Kabab',
  'chicken kebab': 'Chicken Kabab',
  'kabab': 'Chicken Kabab',
  'kebab': 'Chicken Kabab',
  'ಚಿಕನ್ ಕಬಾಬ್': 'Chicken Kabab',
  'ಕಬಾಬ್': 'Chicken Kabab',
  'चिकन कबाब': 'Chicken Kabab',
  'कबाब': 'Chicken Kabab',

  // Hot & Sour Veg Soup
  'hot and sour veg soup': 'Hot & Sour Veg Soup',
  'hot and sour soup': 'Hot & Sour Veg Soup',
  'veg soup': 'Hot & Sour Veg Soup',
  'soup': 'Hot & Sour Veg Soup',
  'ಹಾಟ್ ಅಂಡ್ ಸೋರ್ ಸೂಪ್': 'Hot & Sour Veg Soup',
  'ವೆಜ್ ಸೂಪ್': 'Hot & Sour Veg Soup',
  'ಸೂಪ್': 'Hot & Sour Veg Soup',
  'हॉट एंड सॉर सूप': 'Hot & Sour Veg Soup',
  'वेज सूप': 'Hot & Sour Veg Soup',
  'सूप': 'Hot & Sour Veg Soup',

  // Peri Peri French Fries
  'peri peri french fries': 'Peri Peri French Fries',
  'peri peri fries': 'Peri Peri French Fries',
  'french fries': 'Peri Peri French Fries',
  'fries': 'Peri Peri French Fries',
  'ಪೆರಿ ಪೆರಿ ಫ್ರೈಸ್': 'Peri Peri French Fries',
  'ಫ್ರೆಂಚ್ ಫ್ರೈಸ್': 'Peri Peri French Fries',
  'ಫ್ರೈಸ್': 'Peri Peri French Fries',
  'पेरी पेरी फ्राइज़': 'Peri Peri French Fries',
  'फ्रेंच फ्राइज': 'Peri Peri French Fries',
  'फ्राइज़': 'Peri Peri French Fries',

  // Paneer Butter Masala
  'paneer butter masala': 'Paneer Butter Masala',
  'paneer butter': 'Paneer Butter Masala',
  'paneer masala': 'Paneer Butter Masala',
  'paneer': 'Paneer Butter Masala',
  'ಪನೀರ್ ಬಟರ್ ಮಸಾಲ': 'Paneer Butter Masala',
  'ಪನೀರ್ ಮಸಾಲ': 'Paneer Butter Masala',
  'ಪನೀರ್': 'Paneer Butter Masala',
  'पनीर बटर मसाला': 'Paneer Butter Masala',
  'पनीर मसाला': 'Paneer Butter Masala',
  'पनीर': 'Paneer Butter Masala',

  // Butter Naan
  'butter naan': 'Butter Naan',
  'naan': 'Butter Naan',
  'roti': 'Butter Naan',
  'ಬಟರ್ ನಾನ್': 'Butter Naan',
  'ನಾನ್': 'Butter Naan',
  'ರೊಟ್ಟಿ': 'Butter Naan',
  'बटर नान': 'Butter Naan',
  'नान': 'Butter Naan',
  'रोटी': 'Butter Naan',

  // Dal Tadka
  'dal tadka': 'Dal Tadka',
  'dal': 'Dal Tadka',
  'daal': 'Dal Tadka',
  'ದಾಲ್ ತಡ್ಕಾ': 'Dal Tadka',
  'ದಾಲ್': 'Dal Tadka',
  'ಬೇಳೆ ಸಾರು': 'Dal Tadka',
  'दाल तड़का': 'Dal Tadka',
  'दाल': 'Dal Tadka',

  // South Indian Meals
  'south indian meals': 'South Indian Meals',
  'south indian thali': 'South Indian Meals',
  'meals': 'South Indian Meals',
  'ಊಟ': 'South Indian Meals',
  'ಸೌತ್ ಇಂಡಿಯನ್ ಊಟ': 'South Indian Meals',
  'ಮಿಲ್ಸ್': 'South Indian Meals',
  'साउथ इंडियन मील्स': 'South Indian Meals',
  'साउथ इंडियन थाली': 'South Indian Meals',
  'भोजन': 'South Indian Meals',

  // Veg Fried Rice
  'veg fried rice': 'Veg Fried Rice',
  'fried rice': 'Veg Fried Rice',
  'ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್': 'Veg Fried Rice',
  'ಫ್ರೈಡ್ ರೈಸ್': 'Veg Fried Rice',
  'वेज फ्राइड राइस': 'Veg Fried Rice',
  'फ्राइड राइस': 'Veg Fried Rice',

  // Veg Dum Biryani
  'veg dum biryani': 'Veg Dum Biryani',
  'veg biryani': 'Veg Dum Biryani',
  'ವೆಜ್ ಬಿರಿಯಾನಿ': 'Veg Dum Biryani',
  'ವೆಜ್ ದಮ್ ಬಿರಿಯಾನಿ': 'Veg Dum Biryani',
  'वेज बिरयानी': 'Veg Dum Biryani',
  'वेज दम बिरयानी': 'Veg Dum Biryani',

  // Chicken Dum Biryani
  'chicken dum biryani': 'Chicken Dum Biryani',
  'chicken biryani': 'Chicken Dum Biryani',
  'biryani': 'Chicken Dum Biryani',
  'ಚಿಕನ್ ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani',
  'ಚಿಕನ್ ದಮ್ ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani',
  'ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani',
  'चिकन बिरयानी': 'Chicken Dum Biryani',
  'चिकन दम बिरयानी': 'Chicken Dum Biryani',
  'बिरयानी': 'Chicken Dum Biryani',

  // Jeera Rice
  'jeera rice': 'Jeera Rice',
  'zeera rice': 'Jeera Rice',
  'ಜೀರಾ ರೈಸ್': 'Jeera Rice',
  'ಜೀರಿಗೆ ಅನ್ನ': 'Jeera Rice',
  'जीरा राइस': 'Jeera Rice',
  'जीरा चावल': 'Jeera Rice',

  // South Indian Filter Coffee
  'south indian filter coffee': 'South Indian Filter Coffee',
  'filter coffee': 'South Indian Filter Coffee',
  'filter coffees': 'South Indian Filter Coffee',
  'coffee': 'South Indian Filter Coffee',
  'coffees': 'South Indian Filter Coffee',
  'ಫಿಲ್ಟರ್ ಕಾಫಿ': 'South Indian Filter Coffee',
  'ಕಾಫಿ': 'South Indian Filter Coffee',
  'फ़िल्टर कॉफ़ी': 'South Indian Filter Coffee',
  'फ़िल्टर कॉफी': 'South Indian Filter Coffee',
  'कॉफ़ी': 'South Indian Filter Coffee',
  'कॉफी': 'South Indian Filter Coffee',

  // Masala Chai
  'masala chai': 'Masala Chai',
  'chai': 'Masala Chai',
  'tea': 'Masala Chai',
  'teas': 'Masala Chai',
  'ಮಸಾಲ ಚಹಾ': 'Masala Chai',
  'ಚಹಾ': 'Masala Chai',
  'ಟೀ': 'Masala Chai',
  'मसाला चाय': 'Masala Chai',
  'चाय': 'Masala Chai',
  'टी': 'Masala Chai',

  // Fresh Lime Juice
  'fresh lime juice': 'Fresh Lime Juice',
  'lime juice': 'Fresh Lime Juice',
  'lemon juice': 'Fresh Lime Juice',
  'ನಿಂಬೆಹಣ್ಣಿನ ಜ್ಯೂಸ್': 'Fresh Lime Juice',
  'ಲೈಮ್ ಜ್ಯೂಸ್': 'Fresh Lime Juice',
  'निम्बू पानी': 'Fresh Lime Juice',
  'नींबू पानी': 'Fresh Lime Juice',
  'लाइम जूस': 'Fresh Lime Juice',

  // Cold Coffee with Ice Cream
  'cold coffee with ice cream': 'Cold Coffee with Ice Cream',
  'cold coffees': 'Cold Coffee with Ice Cream',
  'cold coffee': 'Cold Coffee with Ice Cream',
  'ice cream coffee': 'Cold Coffee with Ice Cream',
  'iced coffee': 'Cold Coffee with Ice Cream',
  'ಕೋಲ್ಡ್ ಕಾಫಿ': 'Cold Coffee with Ice Cream',
  'ಕೋಲ್ಡ್ ಕಾಫಿಗಳು': 'Cold Coffee with Ice Cream',
  'ಐಸ್ ಕ್ರೀಮ್ ಕಾಫಿ': 'Cold Coffee with Ice Cream',
  'कोल्ड कॉफी': 'Cold Coffee with Ice Cream',
  'कोल्ड कॉफ़ी': 'Cold Coffee with Ice Cream',
  'कोल्ड कॉफ़ीस': 'Cold Coffee with Ice Cream',

  // Masala Dosa
  'masala dosas': 'Masala Dosa',
  'dosas': 'Masala Dosa',

  // Gulab Jamun
  'gulab jamun': 'Gulab Jamun (2 Pcs)',
  'jamun': 'Gulab Jamun (2 Pcs)',
  'ಗುಲಾಬ್ ಜಾಮೂನ್': 'Gulab Jamun (2 Pcs)',
  'ಜಾಮೂನ್': 'Gulab Jamun (2 Pcs)',
  'गुलाब जामुन': 'Gulab Jamun (2 Pcs)',
  'जामुन': 'Gulab Jamun (2 Pcs)',

  // Sizzling S'mores Brownie
  'sizzling brownie': "Sizzling S'mores Brownie",
  'brownie': "Sizzling S'mores Brownie",
  'ಬ್ರೌನಿ': "Sizzling S'mores Brownie",
  'ब्राउनी': "Sizzling S'mores Brownie",

  // North Indian Deluxe Thali
  'north indian thali': 'North Indian Deluxe Thali',
  'deluxe thali': 'North Indian Deluxe Thali',
  'thali': 'North Indian Deluxe Thali',
  'ಥಾಲಿ': 'North Indian Deluxe Thali',
  'थाली': 'North Indian Deluxe Thali'
};

// Customization phrase mappings across English, Kannada, Hindi
export const CUSTOMIZATION_RULES = [
  {
    tag: 'Extra Spicy',
    patterns: [
      /extra spicy/i, /more spicy/i, /make it spicy/i, /very spicy/i,
      /ಖಾರ ಜಾಸ್ತಿ/i, /ತುಂಬಾ ಖಾರ/i, /ಹೆಚ್ಚು ಖಾರ/i,
      /ज़्यादा तीखा/i, /ज्यादा तीखा/i, /बहुत तीखा/i, /स्पाइसी/i
    ]
  },
  {
    tag: 'Less Spicy / Mild',
    patterns: [
      /less spicy/i, /mild/i, /not spicy/i, /no spice/i,
      /ಖಾರ ಕಡಿಮೆ/i, /ಸ್ವಲ್ಪ ಖಾರ/i, /ಕಡಿಮೆ ಖಾರ/i,
      /कम तीखा/i, /तीखा कम/i, /हल्का तीखा/i, /मीडियम तीखा/i
    ]
  },
  {
    tag: 'Jain / No Onion Garlic',
    patterns: [
      /jain/i, /no onion/i, /no garlic/i, /without onion/i,
      /ಜೈನ್/i, /ಈರುಳ್ಳಿ ಬೆಳ್ಳುಳ್ಳಿ ಬೇಡ/i,
      /जैन/i, /बिना प्याज लहसुन/i, /बिना प्याज/i
    ]
  },
  {
    tag: 'Extra Butter / Ghee',
    patterns: [
      /extra butter/i, /extra ghee/i, /more butter/i,
      /ಬೆಣ್ಣೆ ಜಾಸ್ತಿ/i, /ತುಪ್ಪ ಜಾಸ್ತಿ/i,
      /ज्यादा मक्खन/i, /मक्खन ज्यादा/i, /एक्स्ट्रा बटर/i
    ]
  },
  {
    tag: 'Less Ice',
    patterns: [
      /less ice/i, /no ice/i, /without ice/i,
      /ಕಡಿಮೆ ಐಸ್/i, /ಐಸ್ ಬೇಡ/i,
      /कम बर्फ/i, /बर्फ नहीं/i, /बिना बर्फ/i
    ]
  }
];

/**
 * Extract Customizations from spoken transcript
 */
export const extractCustomizations = (transcript = '') => {
  const detectedTags = [];
  for (const rule of CUSTOMIZATION_RULES) {
    if (rule.patterns.some(regex => regex.test(transcript))) {
      detectedTags.push(rule.tag);
    }
  }
  return detectedTags;
};

/**
 * Check if the spoken text represents a Voice Confirmation (Yes/Confirm)
 */
export const isConfirmationVoiceCommand = (transcript = '', langCode = 'en-IN') => {
  const clean = transcript.toLowerCase().trim();
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  
  // Check against language specific keywords
  return langConfig.confirmKeywords.some(keyword => {
    return clean === keyword.toLowerCase() || clean.includes(keyword.toLowerCase());
  });
};

/**
 * Text-to-Speech (TTS) Voice Prompt Generator
 */
export const speakKioskPrompt = (text, langCode = 'en-IN') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95; // Slightly slower for clear kiosk environment
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const matchVoice = voices.find(v => v.lang === langCode || v.lang.startsWith(langCode.slice(0, 2)));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS playback error:', err);
  }
};
