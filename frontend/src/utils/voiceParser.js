/**
 * RESTOSMART Voice Order Natural Language Parser & Menu Grounding Engine
 * Multilingual Support for English (en-IN), Kannada (kn-IN), and Hindi (hi-IN)
 * Extracts quantities, items, dietary customizations, and strictly grounds against active menu.
 */

import {
  MULTILINGUAL_NUMBERS,
  FOOD_TRANSLATIONS,
  extractCustomizations,
} from './multilingualVoiceEngine.js';
import { menuItems as fallbackMenuItems } from '../data/mockData.js';

// Filler conversational words across English, Kannada, Hindi
const FILLER_PHRASES = [
  // English
  /^i want to order\s+/i,
  /^i want to have\s+/i,
  /^i want\s+/i,
  /^i would like to order\s+/i,
  /^i would like to have\s+/i,
  /^i would like\s+/i,
  /^i'd like to order\s+/i,
  /^i'd like to have\s+/i,
  /^i'd like\s+/i,
  /^please give me\s+/i,
  /^give me\s+/i,
  /^can i get\s+/i,
  /^can i have\s+/i,
  /^can i order\s+/i,
  /^could i get\s+/i,
  /^could i have\s+/i,
  /^can you add\s+/i,
  /^bring me\s+/i,
  /^order\s+/i,
  /^add\s+/i,
  /^we need\s+/i,
  /^get me\s+/i,
  /^i'll have\s+/i,
  /^i will take\s+/i,
  /^and\s+/i,
  /^also\s+/i,

  // Kannada (Native & Kanglish)
  /^ನನಗೆ ಆರ್ಡರ್ ಬೇಕು\s+/i,
  /^ನನಗೆ\s+/i,
  /^ನಮಗೆ\s+/i,
  /^ದಯವಿಟ್ಟು\s+/i,
  /^ಕೊಡಿ\s+/i,
  /^ಆರ್ಡರ್ ಮಾಡಿ\s+/i,
  /^ಆರ್ಡರ್\s+/i,
  /^ಮತ್ತು\s+/i,
  /^ಜೊತೆಗೆ\s+/i,
  /^nanage\s+/i,
  /^namage\s+/i,
  /^dayavittu\s+/i,
  /^kodi\s+/i,
  /^beku\s+/i,
  /^ondu\s+nimisha\s+/i,

  // Hindi (Native & Hinglish)
  /^मुझे ऑर्डर करना है\s+/i,
  /^मुझे\s+/i,
  /^हमे\s+/i,
  /^कृपया\s+/i,
  /^दीजिए\s+/i,
  /^लाओ\s+/i,
  /^लाइए\s+/i,
  /^ऑर्डर\s+/i,
  /^और\s+/i,
  /^भैया\s+/i,
  /^अन्ना\s+/i,
  /^bhaiya\s+/i,
  /^anna\s+/i,
  /^boss\s+/i,
  /^mujhe\s+/i,
  /^hume\s+/i,
  /^kripya\s+/i,
  /^dena\s+/i,
  /^de do\s+/i,
  /^chahiye\s+/i,
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
 * Levenshtein distance for fuzzy string matching
 */
export const calculateSimilarity = (s1, s2) => {
  const str1 = cleanTranscript(s1);
  const str2 = cleanTranscript(s2);

  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
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

  // Normalize colloquial quantities like "a couple of" or "a pair of" to "2 "
  text = text.replace(/\b(a\s+)?couple\s+(of\s+)?/gi, '2 ');
  text = text.replace(/\b(a\s+)?pair\s+(of\s+)?/gi, '2 ');

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
      } else if (words.length > 1 && MULTILINGUAL_NUMBERS[words[1].toLowerCase()] !== undefined) {
        quantity = MULTILINGUAL_NUMBERS[words[1].toLowerCase()];
        foodQuery = [words[0], ...words.slice(2)].join(' ');
      } else if (words.length > 1 && !isNaN(parseInt(words[1], 10))) {
        quantity = parseInt(words[1], 10);
        foodQuery = [words[0], ...words.slice(2)].join(' ');
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

    // Clean residual measurement words and trailing verbal suffixes
    foodQuery = foodQuery
      .replace(/^(plates?|portions?|bowls?|glasses?|cups?|orders?|pieces?|ಪ್ಲೇಟ್|ಕಪ್|ಗ್ಲಾಸ್|ಪ್ಲೇಟ್ಸ್|प्लेट|कप|ग्लास)\s+(of\s+)?/i, '')
      .replace(/\s+(laga do|la do|de do|dena|karo|bataiye|batao|thanni|tanni|kodi|maadi|beku|chahiye)$/i, '')
      .replace(/^(bhaiya|anna|boss|kripya|dayavittu|please)\s+/i, '')
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
  'no', 'nope', 'cancel', 'stop', 'change', 'change it',
  'nothing', 'nothing else', 'no thanks', 'thats all', "that's all", 'done', 'finish', 'checkout', 'go to cart', 'view cart',
  'thanks', 'thank', 'you', 'please', 'help', 'what', 'can', 'i', 'we',
  'ಹಾಯ್', 'ಹಲೋ', 'ನಮಸ್ಕಾರ', 'ಹೌದು', 'ಸರಿ', 'ಖಚಿತ', 'ಬೇಡ', 'ಧನ್ಯವಾದ', 'ಸಾಕು', 'ಇನ್ನೇನು ಬೇಡ', 'ಅಷ್ಟೇ', 'ಮುಗಿಯಿತು',
  'हाय', 'हेलो', 'नमस्ते', 'हाँ', 'सही', 'नहीं', 'धन्यवाद', 'मदद', 'कुछ नहीं', 'और नहीं', 'बस', 'काफी है', 'हो गया'
]);

/**
 * Match parsed food segments against REAL database menu items.
 * Uses multilingual synonym lookup + fuzzy token matching.
 */
export const matchVoiceOrderWithMenu = (transcript, menuItems = [], langCode = 'en-IN') => {
  const activeMenu = (menuItems && menuItems.length > 0) ? menuItems : fallbackMenuItems;
  const segments = segmentTranscript(transcript);
  const globalCustomizations = extractCustomizations(transcript);

  const matchedItems = [];
  const unavailableItems = [];
  const unrecognizedItems = [];

  // Sort dictionary keys by length descending to match longest phrases first
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

    for (const item of activeMenu) {
      const itemName = item.name.toLowerCase();

      // 1. Exact match
      if (itemName === canonicalQuery) {
        bestMatch = item;
        bestScore = 1.0;
        break;
      }

      // 2. Proportional substring score
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
        const existing = matchedItems.find((m) => {
          const mId = m.dish.id || m.dish._id;
          const bId = bestMatch.id || bestMatch._id;
          if (mId && bId) return String(mId) === String(bId);
          return m.dish.name.toLowerCase().trim() === bestMatch.name.toLowerCase().trim();
        });
        if (existing) {
          existing.quantity += quantity;
          existing.subtotal = existing.quantity * existing.dish.price;
        } else {
          matchedItems.push({
            dish: bestMatch,
            name: bestMatch.name,
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

/**
 * Merges newly confirmed items into existing confirmed order items.
 * If dish is already present, increases quantity and updates subtotal.
 */
export const mergeOrderItems = (existingList = [], newItems = []) => {
  const merged = existingList.map((item) => ({ ...item }));
  for (const newItem of newItems) {
    const nId = newItem.dish?.id || newItem.dish?._id || newItem.dish?.name || newItem.name;
    const existingIndex = merged.findIndex((item) => {
      const eId = item.dish?.id || item.dish?._id || item.dish?.name || item.name;
      if (eId && nId) return String(eId) === String(nId);
      return (
        (item.dish?.name || item.name || '').toLowerCase().trim() ===
        (newItem.dish?.name || newItem.name || '').toLowerCase().trim()
      );
    });

    if (existingIndex >= 0) {
      merged[existingIndex].quantity += newItem.quantity;
      const unitPrice = merged[existingIndex].dish?.price || merged[existingIndex].price || 0;
      merged[existingIndex].subtotal = unitPrice * merged[existingIndex].quantity;
      if (newItem.customizations && newItem.customizations.length > 0) {
        merged[existingIndex].customizations = Array.from(
          new Set([...(merged[existingIndex].customizations || []), ...newItem.customizations])
        );
      }
    } else {
      merged.push({ ...newItem });
    }
  }
  return merged;
};
