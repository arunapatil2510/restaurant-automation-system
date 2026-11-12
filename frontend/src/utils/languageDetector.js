/**
 * RESTOSMART Intelligent Spoken Language & Script Detector
 * Detects whether customer speech is English, Kannada, or Hindi,
 * supporting both native scripts (Devanagari, Kannada) and romanized code-switching (Hinglish, Kanglish).
 */

export const SUPPORTED_LOCALES = {
  ENGLISH: 'en-IN',
  KANNADA: 'kn-IN',
  HINDI: 'hi-IN'
};

// Unicode Ranges
const KANNADA_SCRIPT_REGEX = /[\u0C80-\u0CFF]/;
const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;

// Transliterated / Romanized Keyword Markers
const KANNADA_ROMAN_MARKERS = new Set([
  'nanage', 'namage', 'ondu', 'eradu', 'mooru', 'naalku', 'aidu', 'aaru', 'yelu', 'entu', 'ombattu', 'hattu',
  'beku', 'beda', 'kodi', 'haaki', 'serisi', 'maadi', 'thindi', 'oota', 'khara', 'swalpa', 'chennagide',
  'hegide', 'enu', 'yavudhu', 'yavudu', 'isthe', 'aste', 'ivattina', 'suchisi', 'gondalavide', 'sahaya',
  'matte', 'jothege', 'thago', 'thindige', 'tumba', 'olleyadu', 'shifarassu', 'vishesha'
]);

const HINDI_ROMAN_MARKERS = new Set([
  'mujhe', 'hume', 'hame', 'chahiye', 'dijiye', 'kripya', 'batao', 'khana', 'peena', 'thoda', 'teekha',
  'meetha', 'bhaiya', 'kya', 'hai', 'hain', 'nahi', 'haan', 'bhi', 'aur', 'kuch', 'achha', 'accha',
  'badhiya', 'lao', 'dena', 'karo', 'hatao', 'badlo', 'shakahari', 'madad', 'bataiye', 'lagao', 'kahan',
  'kitna', 'kitne', 'itna', 'aaj', 'special'
]);

/**
 * Detect the spoken language of an utterance
 * @param {string} text Input speech transcript
 * @param {string} [preferredLocale='en-IN'] User's currently selected UI language
 * @returns {string} Detected BCP-47 locale ('en-IN', 'kn-IN', or 'hi-IN')
 */
export const detectSpokenLanguage = (text = '', preferredLocale = 'en-IN') => {
  if (!text || typeof text !== 'string') return preferredLocale;
  const trimmed = text.trim();
  if (!trimmed) return preferredLocale;

  // 1. Script-level detection (100% deterministic for native scripts)
  if (KANNADA_SCRIPT_REGEX.test(trimmed)) {
    return SUPPORTED_LOCALES.KANNADA;
  }
  if (DEVANAGARI_SCRIPT_REGEX.test(trimmed)) {
    return SUPPORTED_LOCALES.HINDI;
  }

  // 2. Transliterated / Romanized vocabulary token scoring
  const lower = trimmed.toLowerCase();
  const words = lower.split(/[\s,?.!।;:"'()-]+/).filter(Boolean);

  let knMatches = 0;
  let hiMatches = 0;

  for (const word of words) {
    if (KANNADA_ROMAN_MARKERS.has(word)) knMatches++;
    if (HINDI_ROMAN_MARKERS.has(word)) hiMatches++;
  }

  if (knMatches > 0 && knMatches >= hiMatches) {
    return SUPPORTED_LOCALES.KANNADA;
  }
  if (hiMatches > 0 && hiMatches > knMatches) {
    return SUPPORTED_LOCALES.HINDI;
  }

  // Fallback to customer's chosen UI locale or English
  return preferredLocale || SUPPORTED_LOCALES.ENGLISH;
};

/**
 * Get language metadata and label
 */
export const getLanguageMeta = (langCode = 'en-IN') => {
  switch (langCode) {
    case 'kn-IN':
      return { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' };
    case 'hi-IN':
      return { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' };
    default:
      return { code: 'en-IN', name: 'English', nativeName: 'English', flag: '🇬🇧' };
  }
};

