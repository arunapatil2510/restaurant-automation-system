/**
 * RESTOSMART Voice Order Natural Language Parser & Menu Grounding Engine
 * Multilingual Support for English (en-IN), Kannada (kn-IN), and Hindi (hi-IN)
 * Extracts quantities, items, dietary customizations, and strictly grounds against the active MongoDB menu.
 */

import {
  MULTILINGUAL_NUMBERS,
  FOOD_TRANSLATIONS,
  extractCustomizations,
  SUPPORTED_LANGUAGES,
} from './multilingualVoiceEngine.js';

// Filler conversational words across English, Kannada, Hindi
const FILLER_PHRASES = [
  // English
  /^i want\s+/i,
  /^i would like\s+/i,
  /^please give me\s+/i,
  /^give me\s+/i,
  /^can i get\s+/i,
  /^can i have\s+/i,
  /^bring me\s+/i,
  /^order\s+/i,
  /^add\s+/i,
  /^we need\s+/i,
  /^get me\s+/i,
  /^i'll have\s+/i,
  /^i will take\s+/i,
  /^and\s+/i,
  /^also\s+/i,

  // Kannada
  /^ನನಗೆ\s+/i,
  /^ನಮಗೆ\s+/i,
  /^ದಯವಿಟ್ಟು\s+/i,
  /^ಕೊಡಿ\s+/i,
  /^ಆರ್ಡರ್\s+/i,
  /^ಮತ್ತು\s+/i,
  /^ಜೊತೆಗೆ\s+/i,

  // Hindi
  /^मुझे\s+/i,
  /^हमे\s+/i,
  /^कृपया\s+/i,
  /^दीजिए\s+/i,
  /^लाओ\s+/i,
  /^लाइए\s+/i,
  /^और\s+/i,
];

/**
 * Clean and normalize text
 */
export const cleanTranscript = (text = '') => {
  let cleaned = text.toLowerCase().trim();
  cleaned = cleaned.replace(/[.,?!।]/g, ' ');
  return cleaned;
};

/**
 * Calculates string similarity (Levenshtein distance based score from 0 to 1)
 */
export const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
};

/**
 * Splits spoken transcript into candidate food segments across English, Kannada, and Hindi
 */
export const segmentTranscript = (transcript) => {
  let text = cleanTranscript(transcript);

  // Clean conversational prefixes
  for (const filler of FILLER_PHRASES) {
    text = text.replace(filler, '');
  }

  // Split on conjunctions in English ("and", "also", "with"), Kannada ("ಮತ್ತು", "ಜೊತೆಗೆ"), Hindi ("और", "तथा")
  const rawSegments = text
    .split(/\band\b|\balso\b|\bwith\b|\bplus\b|ಮತ್ತು|ಜೊತೆಗೆ|ಮತ್ತೆ|और|तथा|,/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsedSegments = [];

  for (const seg of rawSegments) {
    let cleanSeg = seg;
    for (const filler of FILLER_PHRASES) {
      cleanSeg = cleanSeg.replace(filler, '');
    }
    cleanSeg = cleanSeg.trim();
    if (!cleanSeg) continue;

    let quantity = 1;
    let foodQuery = cleanSeg;

    // Check multilingual number map
    const words = cleanSeg.split(/\s+/);
    if (words.length > 0) {
      const firstWord = words[0].toLowerCase();
      if (MULTILINGUAL_NUMBERS[firstWord] !== undefined) {
        quantity = MULTILINGUAL_NUMBERS[firstWord];
        foodQuery = words.slice(1).join(' ');
      } else if (!isNaN(parseInt(firstWord, 10))) {
        quantity = parseInt(firstWord, 10);
        foodQuery = words.slice(1).join(' ');
      } else {
        // Check if quantity word is at end (e.g. "masala dosa 2" or "ದೋಸೆ ಎರಡು" or "डोसा दो")
        const lastWord = words[words.length - 1].toLowerCase();
        if (MULTILINGUAL_NUMBERS[lastWord] !== undefined) {
          quantity = MULTILINGUAL_NUMBERS[lastWord];
          foodQuery = words.slice(0, -1).join(' ');
        } else if (!isNaN(parseInt(lastWord, 10))) {
          quantity = parseInt(lastWord, 10);
          foodQuery = words.slice(0, -1).join(' ');
        }
      }
    }

    // Clean residual measurement words in English, Kannada, Hindi
    foodQuery = foodQuery
      .replace(/^(plates?|portions?|bowls?|glasses?|cups?|orders?|pieces?|ಪ್ಲೇಟ್|ಕಪ್|ಗ್ಲಾಸ್|प्लेट|कप|ग्लास)\s+(of\s+)?/i, '')
      .trim();

    if (foodQuery.length >= 1) {
      parsedSegments.push({ raw: seg, foodQuery, quantity: Math.max(1, quantity) });
    }
  }

  return parsedSegments;
};

const CONVERSATIONAL_STOP_WORDS = new Set([
  'hi', 'hello', 'hey', 'namaste', 'good', 'morning', 'evening',
  'yes', 'yeah', 'yep', 'confirm', 'sure', 'ok', 'okay', 'correct',
  'no', 'nope', 'cancel', 'stop', 'change',
  'thanks', 'thank', 'you', 'please', 'help', 'what', 'can', 'i', 'we',
  'ಹಾಯ್', 'ಹಲೋ', 'ನಮಸ್ಕಾರ', 'ಹೌದು', 'ಸರಿ', 'ಖಚಿತ', 'ಬೇಡ', 'ಧನ್ಯವಾದ',
  'हाय', 'हेलो', 'नमस्ते', 'हाँ', 'सही', 'नहीं', 'धन्यवाद', 'मदद'
]);

/**
 * Match parsed food segments against REAL database menu items.
 * Uses multilingual synonym lookup + fuzzy token matching.
 */
export const matchVoiceOrderWithMenu = (transcript, menuItems = [], langCode = 'en-IN') => {
  const segments = segmentTranscript(transcript);
  const globalCustomizations = extractCustomizations(transcript);

  const matchedItems = [];
  const unavailableItems = [];
  const unrecognizedItems = [];

  // Sort dictionary keys by length descending to match longest phrases first (e.g. "cold coffee" before "coffee")
  const sortedTranslationEntries = Object.entries(FOOD_TRANSLATIONS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const seg of segments) {
    const { foodQuery, quantity, raw } = seg;
    let canonicalQuery = foodQuery.toLowerCase().trim();

    // Guard: ignore pure conversational stop words
    if (CONVERSATIONAL_STOP_WORDS.has(canonicalQuery)) {
      continue;
    }

    const segCustomizations = extractCustomizations(raw || foodQuery);
    const activeCustomizations = segCustomizations.length > 0 ? segCustomizations : (segments.length === 1 ? globalCustomizations : []);

    // 1. Check direct Multilingual Dictionary match
    if (FOOD_TRANSLATIONS[canonicalQuery]) {
      canonicalQuery = FOOD_TRANSLATIONS[canonicalQuery].toLowerCase();
    } else {
      // Check longest substring match in sorted dictionary
      for (const [key, value] of sortedTranslationEntries) {
        if (canonicalQuery === key || (canonicalQuery.length > 4 && canonicalQuery.includes(key))) {
          canonicalQuery = value.toLowerCase();
          break;
        }
      }
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const item of menuItems) {
      const itemName = item.name.toLowerCase();

      // 1. Exact match
      if (itemName === canonicalQuery) {
        bestMatch = item;
        bestScore = 1.0;
        break;
      }

      // 2. Proportional substring score (only for queries >= 3 chars not in stop words)
      if (canonicalQuery.length >= 3 && !CONVERSATIONAL_STOP_WORDS.has(canonicalQuery)) {
        if (itemName.includes(canonicalQuery) || (canonicalQuery.length >= 4 && canonicalQuery.includes(itemName))) {
          const minLen = Math.min(itemName.length, canonicalQuery.length);
          const maxLen = Math.max(itemName.length, canonicalQuery.length);
          const score = 0.75 + (0.2 * (minLen / maxLen));
          if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
          }
        }
      }

      // 3. Token overlap similarity
      const queryTokens = canonicalQuery.split(/\s+/).filter(Boolean);
      const nameTokens = itemName.split(/\s+/).filter(Boolean);
      let matchCount = 0;
      for (const qt of queryTokens) {
        if (nameTokens.some((nt) => nt === qt || (qt.length >= 4 && nt.includes(qt)))) {
          matchCount++;
        }
      }
      const tokenScore = (matchCount / Math.max(queryTokens.length, nameTokens.length)) * 0.9;
      if (tokenScore > bestScore && tokenScore >= 0.5) {
        bestScore = tokenScore;
        bestMatch = item;
      }

      // 4. String distance similarity
      const similarity = calculateSimilarity(canonicalQuery, itemName);
      if (similarity > bestScore && similarity >= 0.6) {
        bestScore = similarity;
        bestMatch = item;
      }
    }

    // Threshold check
    if (bestMatch && bestScore >= 0.45) {
      if (bestMatch.isAvailable === false) {
        unavailableItems.push({
          dish: bestMatch,
          foodQuery,
          quantity,
          reason: 'Currently Sold Out in Kitchen',
        });
      } else {
        const existing = matchedItems.find((m) => (m.dish.id || m.dish._id) === (bestMatch.id || bestMatch._id));
        if (existing) {
          existing.quantity += quantity;
          existing.subtotal = existing.quantity * existing.dish.price;
        } else {
          matchedItems.push({
            dish: bestMatch,
            quantity,
            price: bestMatch.price,
            subtotal: bestMatch.price * quantity,
            customizations: activeCustomizations,
          });
        }
      }
    } else {
      // ANTI-HALLUCINATION: Spoken food does not exist on restaurant menu
      const suggestions = [...menuItems]
        .filter((m) => m.isAvailable !== false)
        .sort((a, b) => calculateSimilarity(canonicalQuery, b.name) - calculateSimilarity(canonicalQuery, a.name))
        .slice(0, 2)
        .map((m) => m.name);

      unrecognizedItems.push({
        query: foodQuery,
        quantity,
        suggestions,
      });
    }
  }

  return {
    transcript,
    langCode,
    matchedItems,
    unavailableItems,
    unrecognizedItems,
    customizations: globalCustomizations,
    hasValidItems: matchedItems.length > 0,
  };
};
