/**
 * RESTOSMART Voice Intent & Natural Language Understanding Service
 * Connects frontend voice components (KioskVoiceSection & VoiceOrderModal)
 * to the backend Gemini 2.5 Flash endpoint (POST /api/voice/parse-intent).
 *
 * Features:
 * - Robust AbortController timeout (4.5s)
 * - Seamless client-side fallback (voiceParser & intentClassifier) when offline or backend unconfigured
 * - Strict grounding: cross-checks every returned dish against active menuItems
 * - Full support for English (en-IN), Kannada (kn-IN), and Hindi (hi-IN)
 * - Normalized response schema guaranteed across all providers
 */

import { matchVoiceOrderWithMenu, calculateSimilarity } from '../utils/voiceParser.js';
import {
  classifyIntent,
  INTENT_TYPES,
  getConversationalResponse,
  isAffirmative,
  isNegative
} from '../utils/intentClassifier.js';
import {
  formatOrderConfirmationPrompt,
  formatUnknownItemPrompt
} from '../utils/multilingualVoiceEngine.js';
import { detectSpokenLanguage } from '../utils/languageDetector.js';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';

const DEFAULT_TIMEOUT_MS = 4500;

/**
 * Normalizes and grounds dishes against the client's currently active menu items.
 * Ensures unverified, unavailable, or hallucinated dishes are NEVER added to order items.
 */
export const groundDishesWithActiveMenu = (rawItems = [], menuItems = []) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { verifiedItems: [], ungroundedItems: [] };
  }

  const verifiedItems = [];
  const ungroundedItems = [];

  for (const rawItem of rawItems) {
    if (!rawItem) continue;

    const rawName = (rawItem.name || '').trim();
    const rawId = rawItem.menuItemId ? String(rawItem.menuItemId).trim() : null;
    const qty = Math.max(1, parseInt(rawItem.quantity, 10) || 1);
    const customizations = Array.isArray(rawItem.customizations) ? rawItem.customizations : [];

    let matchedDish = null;

    // 1. Primary check: match by actual MongoDB _id or id
    if (rawId) {
      matchedDish = menuItems.find(m => {
        const mId = m._id ? String(m._id) : (m.id ? String(m.id) : null);
        return mId && mId === rawId;
      });
    }

    // 2. Secondary check: match by exact dish name
    if (!matchedDish && rawName) {
      const lowerRaw = rawName.toLowerCase();
      matchedDish = menuItems.find(m => m.name && m.name.toLowerCase().trim() === lowerRaw);
    }

    // 3. Tertiary check: fuzzy similarity match (threshold >= 0.70)
    if (!matchedDish && rawName) {
      let highestSim = 0;
      let candidate = null;
      for (const m of menuItems) {
        if (!m.name) continue;
        const sim = calculateSimilarity(m.name, rawName);
        if (sim > highestSim && sim >= 0.70) {
          highestSim = sim;
          candidate = m;
        }
      }
      matchedDish = candidate;
    }

    // Validate dish existence and kitchen availability
    if (matchedDish && matchedDish.isAvailable !== false) {
      const price = Number(matchedDish.price) || Number(rawItem.price) || 0;
      verifiedItems.push({
        dish: matchedDish,
        name: matchedDish.name,
        menuItemId: matchedDish._id ? String(matchedDish._id) : String(matchedDish.id),
        quantity: qty,
        price: price,
        subtotal: price * qty,
        customizations: customizations
      });
    } else {
      ungroundedItems.push(rawName || 'Unknown Dish');
    }
  }

  return { verifiedItems, ungroundedItems };
};

/**
 * Local Client-Side Fallback Execution
 * Seamlessly called when backend is offline, times out, or throws an error.
 * Handles full conversational multi-turn dialogue, pronoun resolution, price/ingredient queries,
 * quantity changes, item removal, and ambiguity clarification.
 */
export const executeLocalFallback = ({
  text,
  language = 'en-IN',
  menuItems = [],
  context = 'GENERAL',
  conversationHistory = [],
  currentOrder = [],
  lastDiscussedDish = null
}) => {
  const clean = (text || '').trim();
  const lower = clean.toLowerCase();

  const getQuantityWord = (qty, lang) => {
    const num = parseInt(qty, 10) || 1;
    const englishWords = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };
    const kannadaWords = { 1: 'ಒಂದು', 2: 'ಎರಡು', 3: 'ಮೂರು', 4: 'ನಾಲ್ಕು', 5: 'ಐದು', 6: 'ಆರು', 7: 'ಏಳು', 8: 'ಎಂಟು', 9: 'ಒಂಬತ್ತು', 10: 'ಹತ್ತು' };
    const hindiWords = { 1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पाँच', 6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस' };
    if (lang === 'kn-IN') return kannadaWords[num] || num.toString();
    if (lang === 'hi-IN') return hindiWords[num] || num.toString();
    return englishWords[num] || num.toString();
  };

  const numMap = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'a': 1, 'an': 1, 'couple': 2,
    'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, '೧': 1, '೨': 2, '೩': 3, '೪': 4, '೫': 5,
    'ondu': 1, 'eradu': 2, 'mooru': 3, 'naalku': 4, 'aidu': 5,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5,
    'ek': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'char': 4, 'paanch': 5, 'panch': 5
  };

  const synonymMap = {
    'masala dosa': 'Masala Dosa', 'masale dose': 'Masala Dosa', 'dosa': 'Masala Dosa', 'dosas': 'Masala Dosa', 'dose': 'Masala Dosa',
    'ಮಸಾಲ ದೋಸೆ': 'Masala Dosa', 'ಮಸಾಲೆ ದೋಸೆ': 'Masala Dosa', 'ದೋಸೆ': 'Masala Dosa', 'मसाला डोसा': 'Masala Dosa', 'डोसा': 'Masala Dosa',
    'samosa': 'Crispy Veg Samosa (2 Pcs)', 'veg samosa': 'Crispy Veg Samosa (2 Pcs)', 'crispy samosa': 'Crispy Veg Samosa (2 Pcs)', 'samose': 'Crispy Veg Samosa (2 Pcs)',
    'ಸಮೋಸಾ': 'Crispy Veg Samosa (2 Pcs)', 'ಸಮೋಸ': 'Crispy Veg Samosa (2 Pcs)', 'समोसा': 'Crispy Veg Samosa (2 Pcs)', 'समोसे': 'Crispy Veg Samosa (2 Pcs)',
    'gobi manchurian': 'Gobi Manchurian', 'gobi': 'Gobi Manchurian', 'ಗೋಬಿ': 'Gobi Manchurian', 'गोबी मंचूरियन': 'Gobi Manchurian', 'गोबी': 'Gobi Manchurian',
    'chicken kabab': 'Chicken Kabab', 'kabab': 'Chicken Kabab', 'kebab': 'Chicken Kabab', 'ಕಬಾಬ್': 'Chicken Kabab', 'कबाब': 'Chicken Kabab',
    'paneer butter masala': 'Paneer Butter Masala', 'paneer butter': 'Paneer Butter Masala', 'paneer masala': 'Paneer Butter Masala', 'ಪನೀರ್ ಬಟರ್': 'Paneer Butter Masala', 'पनीर बटर': 'Paneer Butter Masala',
    'butter naan': 'Butter Naan', 'naan': 'Butter Naan', 'ನಾನ್': 'Butter Naan', 'नान': 'Butter Naan',
    'dal tadka': 'Dal Tadka', 'dal': 'Dal Tadka', 'ದಾಲ್': 'Dal Tadka', 'दाल': 'Dal Tadka',
    'north indian deluxe thali': 'North Indian Deluxe Thali', 'deluxe thali': 'North Indian Deluxe Thali', 'thali': 'North Indian Deluxe Thali', 'ಥಾಲಿ': 'North Indian Deluxe Thali', 'थाली': 'North Indian Deluxe Thali',
    'south indian meals': 'South Indian Meals', 'meals': 'South Indian Meals', 'ಊಟ': 'South Indian Meals',
    'veg fried rice': 'Veg Fried Rice', 'fried rice': 'Veg Fried Rice',
    'veg dum biryani': 'Veg Dum Biryani', 'veg biryani': 'Veg Dum Biryani',
    'chicken dum biryani': 'Chicken Dum Biryani', 'chicken biryani': 'Chicken Dum Biryani', 'biryani': 'Chicken Dum Biryani', 'ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani', 'बिरयानी': 'Chicken Dum Biryani',
    'jeera rice': 'Jeera Rice',
    'south indian filter coffee': 'South Indian Filter Coffee', 'filter coffee': 'South Indian Filter Coffee', 'coffee': 'South Indian Filter Coffee', 'ಕಾಫಿ': 'South Indian Filter Coffee', 'कॉफी': 'South Indian Filter Coffee', 'कॉफ़ी': 'South Indian Filter Coffee',
    'masala chai': 'Masala Chai', 'chai': 'Masala Chai', 'tea': 'Masala Chai', 'ಚಹಾ': 'Masala Chai', 'चाय': 'Masala Chai',
    'fresh lime juice': 'Fresh Lime Juice', 'lime juice': 'Fresh Lime Juice', 'ನಿಂಬೆ ಜ್ಯೂಸ್': 'Fresh Lime Juice', 'नींबू पानी': 'Fresh Lime Juice',
    'cold coffee with ice cream': 'Cold Coffee with Ice Cream', 'cold coffee': 'Cold Coffee with Ice Cream',
    'gulab jamun (2 pcs)': 'Gulab Jamun (2 Pcs)', 'gulab jamun': 'Gulab Jamun (2 Pcs)', 'ಗುಲಾಬ್ ಜಾಮೂನ್': 'Gulab Jamun (2 Pcs)', 'गुलाब जामुन': 'Gulab Jamun (2 Pcs)',
    "sizzling s'mores brownie": "Sizzling S'mores Brownie", 'brownie': "Sizzling S'mores Brownie",
    'hot & sour veg soup': 'Hot & Sour Veg Soup', 'hot and sour soup': 'Hot & Sour Veg Soup', 'soup': 'Hot & Sour Veg Soup', 'ಸೂಪ್': 'Hot & Sour Veg Soup', 'सूप': 'Hot & Sour Veg Soup',
    'peri peri french fries': 'Peri Peri French Fries', 'peri peri fries': 'Peri Peri French Fries', 'french fries': 'Peri Peri French Fries', 'fries': 'Peri Peri French Fries',
    'mango lassi': 'Mango Lassi', 'lassi': 'Mango Lassi', 'ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ': 'Mango Lassi', 'मैंगो लस्सी': 'Mango Lassi', 'लस्सी': 'Mango Lassi'
  };

  // Helper to find a dish in text or resolve pronoun
  const findReferencedDish = (queryText) => {
    const qLower = queryText.toLowerCase();
    for (const [alias, canonical] of Object.entries(synonymMap)) {
      if (new RegExp('(^|\\b|\\s)' + alias + '(\\b|\\s|$)', 'i').test(qLower) || qLower.includes(alias)) {
        return menuItems.find(m => m.name.toLowerCase() === canonical.toLowerCase()) || { name: canonical, price: 80 };
      }
    }
    for (const m of menuItems) {
      if (qLower.includes(m.name.toLowerCase())) return m;
    }
    // Check pronouns
    const isPronoun = /^(it|that|this|the dish|ಅದು|ಇದು|यह|इसे)\b/i.test(qLower) || qLower.includes(' it ') || qLower.includes(' that ');
    if (isPronoun) {
      if (lastDiscussedDish) {
        return menuItems.find(m => m.name.toLowerCase() === lastDiscussedDish.toLowerCase()) || { name: lastDiscussedDish, price: 80 };
      }
      if (currentOrder && currentOrder.length === 1) {
        return menuItems.find(m => m.name.toLowerCase() === (currentOrder[0].name || '').toLowerCase()) || currentOrder[0];
      }
    }
    return null;
  };

  // 1. Natural Greeting
  if (/^(hi|hello|hey|good morning|good evening|good afternoon|namaste)\b/i.test(lower) ||
      /^(ಹಾಯ್|ಹಲೋ|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ)/i.test(lower) ||
      /^(हाय|हेलो|नमस्ते|नमस्कार)/i.test(lower)) {
    return {
      success: true,
      intent: 'GREETING',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.GREETING, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 2. Help
  if (/^(help|how to order|instructions)\b/i.test(lower) || /^(ಸಹಾಯ)/i.test(lower) || /^(मदद)/i.test(lower)) {
    return {
      success: true,
      intent: 'HELP',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.HELP, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 3. Dietary & Spice Specific Recommendations
  const isSpiceToken = lower.includes('spice') || lower.includes('spicy') || lower.includes('khara') ||
    lower.includes('teekha') || lower.includes('tikha') || lower.includes('ಖಾರ') || lower.includes('तीखा');

  const isLowModifier = lower.includes('less') || lower.includes('without') || lower.includes('not') ||
    lower.includes('no') || lower.includes('low') || lower.includes('mild') || lower.includes('swalpa') ||
    lower.includes('kam') || lower.includes('kammi') || lower.includes('tumba kammi') ||
    lower.includes('ಕಮ್ಮಿ') || lower.includes('ಕಡಿಮೆ') || lower.includes('ಇಲ್ಲದ') ||
    lower.includes('कम') || lower.includes('बिना');

  const isLowSpice = (isSpiceToken && isLowModifier) || lower.includes('mild');

  if (isLowSpice) {
    const mildOptions = menuItems.filter(m =>
      m.isAvailable !== false &&
      (m.dietaryTags?.includes('mild') || !m.dietaryTags?.includes('spicy') ||
       ['Idli Vada', 'South Indian Filter Coffee', 'Butter Naan', 'Jeera Rice', 'Gulab Jamun (2 Pcs)'].some(n => m.name.toLowerCase().includes(n.toLowerCase())))
    ).slice(0, 3).map(m => m.name);
    const mildList = mildOptions.length > 0 ? mildOptions.join(', ') : 'Idli Vada, Butter Naan, Gulab Jamun';
    const msg = language === 'kn-IN'
      ? `ಸೌಮ್ಯ ಮತ್ತು ಕಡಿಮೆ ಖಾರದ ತಿನಿಸುಗಳು: ${mildList}. ನೀವು ಯಾವುದನ್ನು ಬಯಸುತ್ತೀರಿ?`
      : language === 'hi-IN'
        ? `कम तीखे और सौम्य विकल्प हैं: ${mildList}। आप क्या लेना चाहेंगे?`
        : `For mild dishes without much spice, I recommend: ${mildList}. Would you like any of these?`;
    return {
      success: true,
      intent: 'RECOMMENDATION',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.96,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  const isOrderingPhrase = /^(i want|please give me|give me|can i get|can i have|could i get|could i have|i'd like|i would like|order|add|bring me|get me|we need|ನನಗೆ|ದಯವಿಟ್ಟು|ಕೊಡಿ|ಹಾಕಿ|ಆರ್ಡರ್|मुझे|कृपया|दीजिए|लाओ|लाइए|ऑर्डर)\b/i.test(lower);

  const isVegQuery = !isOrderingPhrase && (
    lower.includes('vegetarian') || lower.includes('only veg') || lower.includes('pure veg') ||
    lower.includes('veg options') || lower.includes('veg items') || lower.includes('veg food') ||
    lower.includes('veg dishes') || lower.includes('शाकाहारी') || lower.includes('ಶಾಕಾಹಾರಿ') ||
    lower.includes('ವೆಜಿಟೇರಿಯನ್') ||
    (lower.includes('veg') && (lower.includes('what') || lower.includes('show') || lower.includes('have') || lower.includes('suggest') || lower.includes('ಏನಿದೆ') || lower.includes('क्या') || lower.includes('something')))
  );

  if (isVegQuery) {
    const vegOptions = menuItems.filter(m => m.type === 'veg' && m.isAvailable !== false).slice(0, 3).map(m => m.name);
    const vegList = vegOptions.length > 0 ? vegOptions.join(', ') : 'Masala Dosa, Paneer Butter Masala, Crispy Veg Samosa';
    const msg = language === 'kn-IN'
      ? `ನಮ್ಮಲ್ಲಿ ರುಚಿಕರವಾದ ವೆಜಿಟೇರಿಯನ್ ಖಾದ್ಯಗಳು: ${vegList}. ನಿಮಗೆ ಯಾವುದು ಇಷ್ಟ?`
      : language === 'hi-IN'
        ? `हमारे लोकप्रिय शाकाहारी व्यंजन हैं: ${vegList}। आप क्या मंगाना चाहेंगे?`
        : `Here are our popular vegetarian options: ${vegList}. What would you like to try?`;
    return {
      success: true,
      intent: 'RECOMMENDATION',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.96,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 3b. Contextual Alternatives / Changed Mind
  const isAlternative = (
    (lower.includes('changed') && lower.includes('mind')) ||
    lower.includes('something else') || lower.includes('instead') ||
    lower.includes('alternative') || lower.includes('different') ||
    lower.includes('ಬದಲಿಗೆ') || lower.includes('ಬೇರೆ') ||
    (lower.includes('bere') && (lower.includes('kodi') || lower.includes('thindi') || lower.includes('enu') || lower.includes('beku') || lower.includes('beda'))) ||
    lower.includes('badalage') || lower.includes('kuch aur') ||
    lower.includes('kuch alag') || lower.includes('बदलना') || lower.includes('बदले')
  );

  if (isAlternative) {
    const altDishes = menuItems.filter(m => m.isAvailable !== false && (!lastDiscussedDish || m.name.toLowerCase() !== lastDiscussedDish.toLowerCase())).slice(0, 3).map(m => m.name);
    const altList = altDishes.length > 0 ? altDishes.join(', ') : 'Paneer Butter Masala, Veg Dum Biryani, Cold Coffee';
    const msg = language === 'kn-IN'
      ? `ಖಂಡಿತ! ಬದಲಿಗೆ ನೀವು ${altList} ಪ್ರಯತ್ನಿಸಬಹುದು. ನಿಮಗೆ ಯಾವುದು ಬೇಕು?`
      : language === 'hi-IN'
        ? `बिल्कुल! इसके बजाय आप ${altList} आज़मा सकते हैं। आप क्या लेना चाहेंगे?`
        : `No problem at all! Instead, you could try ${altList}. What sounds good to you?`;
    return {
      success: true,
      intent: 'MODIFY',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.95,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 3c. General Recommendations
  if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('special') ||
      lower.includes('bestseller') || lower.includes('popular') || lower.includes('what should i eat') ||
      lower.includes('what is good') || lower.includes('confused') || lower.includes('ಏನು ತಿನ್ನಬೇಕು') ||
      lower.includes('ಶಿಫಾರಸು') || lower.includes('ವಿಶೇಷ') || lower.includes('ಏನು ಚೆನ್ನಾಗಿದೆ') ||
      lower.includes('सलाह') || lower.includes('क्या खाऊं') || lower.includes('क्या अच्छा है')) {
    const specials = menuItems.filter(m => m.isSpecial && m.isAvailable !== false).slice(0, 3).map(m => m.name);
    const msg = language === 'kn-IN'
      ? `ನಮ್ಮ ಇಂದಿನ ಮುಖ್ಯ ಶೆಫ್ ಸ್ಪೆಷಲ್ಸ್: ${specials.join(', ')}.`
      : language === 'hi-IN'
        ? `हमारे शेफ के आज के खास स्पेशल हैं: ${specials.join(', ')}।`
        : `Our chef's top recommendations today are: ${specials.join(', ')}. Would you like to try any?`;
    return {
      success: true,
      intent: 'RECOMMENDATION',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.95,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 4. Menu Queries
  if (lower.includes('what do you have') || lower.includes('show menu') || lower.includes('what is available') ||
      lower.includes('categories') || lower.includes('drinks') || lower.includes('starters') ||
      lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') ||
      lower.includes('ಮೆನು') || lower.includes('ಏನಿದೆ') || lower.includes('ಇದೆ') ||
      lower.includes('ತಿಂಡಿಗೆ') || lower.includes('ಊಟ') || lower.includes('ಏನೆಲ್ಲಾ') ||
      lower.includes('मेनू') || lower.includes('क्या मिलेगा') || lower.includes('क्या है') || lower.includes('नाश्ते')) {
    const msg = language === 'kn-IN'
      ? 'ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ Starters, Main Course Curries, Biryani & Rice, South Indian Beverages ಮತ್ತು Desserts ಲಭ್ಯವಿದೆ. ನಿಮಗೆ ಯಾವುದು ಬೇಕು?'
      : language === 'hi-IN'
        ? 'हमारे मेनू में Starters, Main Course Curries, Biryani & Rice, South Indian Beverages और Desserts शामिल हैं। आप क्या पसंद करेंगे?'
        : 'Our menu features Starters, Main Course Curries, Biryani & Rice, South Indian Beverages, and Desserts. What would you like?';
    return {
      success: true,
      intent: 'MENU_QUERY',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.95,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 5. Price Queries
  if (lower.includes('how much') || lower.includes('price of') || lower.includes('cost of') || lower.includes('cost') ||
      lower.includes('ಬೆಲೆ ಎಷ್ಟು') || lower.includes('ದರ ಎಷ್ಟು') || lower.includes('ಬೆಲೆ') ||
      lower.includes('कीमत क्या') || lower.includes('कितने का है') || lower.includes('कितना') || lower.includes('कीमत')) {
    const dish = findReferencedDish(lower);
    if (dish) {
      const priceVal = dish.price || (menuItems.find(m => m.name.toLowerCase() === dish.name.toLowerCase())?.price) || 80;
      const msg = language === 'kn-IN'
        ? `${dish.name} ಬೆಲೆ ₹${priceVal}. ನೀವು ಇದನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುವಿರಾ?`
        : language === 'hi-IN'
          ? `${dish.name} की कीमत ₹${priceVal} है। क्या आप इसे ऑर्डर करना चाहेंगे?`
          : `${dish.name} is ₹${priceVal}. Would you like to order it?`;
      return {
        success: true,
        intent: 'PRICE_QUERY',
        action: 'NONE',
        items: [],
        updatedOrder: currentOrder,
        targetItem: dish.name,
        requiresClarification: false,
        clarificationQuestion: '',
        unrecognizedItems: [],
        lastDiscussedDish: dish.name,
        confidence: 0.96,
        response: msg,
        provider: 'client_fallback',
        isFallback: true
      };
    }
  }

  // 5. Ingredient & Spicy Query
  if (lower.includes('ingredient') || lower.includes('is it spicy') || lower.includes('does it have') ||
      lower.includes('ಖಾರವೇ') || lower.includes('ಸಾಮಗ್ರಿಗಳು') || lower.includes('तीखा है क्या') || lower.includes('सामग्री')) {
    const dish = findReferencedDish(lower);
    if (dish) {
      const matchedModel = menuItems.find(m => m.name.toLowerCase() === dish.name.toLowerCase()) || dish;
      let reply = '';
      if (lower.includes('spicy') || lower.includes('ಖಾರ') || lower.includes('तीखा')) {
        const isSpicy = matchedModel.dietaryTags?.includes('spicy');
        reply = language === 'kn-IN'
          ? (isSpicy ? `${dish.name} ಸ್ವಲ್ಪ ಖಾರವಾಗಿರುತ್ತದೆ.` : `${dish.name} ಮಧ್ಯಮ ಖಾರ ಅಥವಾ ಸೌಮ್ಯ ರುಚಿಯನ್ನು ಹೊಂದಿದೆ.`)
          : language === 'hi-IN'
            ? (isSpicy ? `${dish.name} मसालेदार और तीखा है।` : `${dish.name} कम तीखा और सौम्य है।`)
            : (isSpicy ? `${dish.name} has a spicy kick.` : `${dish.name} is mildly spiced and not too hot.`);
      } else {
        const ingredients = matchedModel.ingredients && matchedModel.ingredients.length > 0
          ? matchedModel.ingredients.join(', ')
          : 'fresh kitchen spices and traditional recipe ingredients';
        reply = language === 'kn-IN'
          ? `${dish.name} ನಲ್ಲಿ ಬಳಸಲಾದ ಮುಖ್ಯ ಸಾಮಗ್ರಿಗಳು: ${ingredients}.`
          : language === 'hi-IN'
            ? `${dish.name} की मुख्य सामग्री: ${ingredients} है।`
            : `${dish.name} is prepared with: ${ingredients}.`;
      }
      return {
        success: true,
        intent: 'INGREDIENT_QUERY',
        action: 'NONE',
        items: [],
        updatedOrder: currentOrder,
        targetItem: dish.name,
        requiresClarification: false,
        clarificationQuestion: '',
        unrecognizedItems: [],
        lastDiscussedDish: dish.name,
        confidence: 0.95,
        response: reply,
        provider: 'client_fallback',
        isFallback: true
      };
    }
  }


  // 7. Standalone Confirmations (Yes / Confirm / Proceed)
  if (isAffirmative(clean)) {
    return {
      success: true,
      intent: 'CONFIRM',
      action: 'NONE',
      items: currentOrder,
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.CONFIRM, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 7b. Finish Order / "That's all"
  if (lower.includes("that's all") || lower.includes("thats all") || lower.includes("nothing else") ||
      lower.includes("no more") || lower.includes("done") || lower.includes("ಇಷ್ಟೇ") ||
      lower.includes("ಅಷ್ಟೇ") || lower.includes("बस इतना") || lower.includes("और कुछ नहीं") ||
      (context === 'ASK_MORE' && (isNegative(clean) || lower.includes('no')))) {
    return {
      success: true,
      intent: 'FINISH_ORDER',
      action: 'NONE',
      items: currentOrder,
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0.98,
      response: language === 'kn-IN' ? 'ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಆರ್ಡರ್ ಪೂರ್ಣಗೊಂಡಿದೆ.' : language === 'hi-IN' ? 'धन्यवाद! आपका ऑर्डर पूरा हो गया है।' : 'Thank you! Your order is complete.',
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 8. Cancellations and Modifications (No / Cancel / Clear / Change it)
  if (isNegative(clean) || lower.includes('change it') || lower.includes('modify') || lower.includes('बदल') || lower.includes('ಬದಲಾಯಿಸಿ')) {
    const isMod = lower.includes('change') || lower.includes('modify') || lower.includes('बदल') || lower.includes('ಬದಲಾಯಿಸಿ');
    const intent = isMod ? 'MODIFY' : 'CANCEL';
    return {
      success: true,
      intent,
      action: isMod ? 'NONE' : 'CLEAR',
      items: isMod ? currentOrder : [],
      updatedOrder: isMod ? currentOrder : [],
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish: null,
      confidence: 0.98,
      response: getConversationalResponse(isMod ? INTENT_TYPES.MODIFY : INTENT_TYPES.CANCEL, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 9a. Relative Item Removal ("Remove the last item")
  const isRemoveLast = lower.includes('last item') || lower.includes('last dish') ||
    lower.includes('ಕಡೆಯ ಐಟಂ') || lower.includes('ಕೊನೆಯ ಐಟಂ') || lower.includes('ಕೊನೆಯ') ||
    lower.includes('ಆಖರಿ') || lower.includes('आखिरी') || lower.includes('पिछला') ||
    lower.includes('aakhri item') || lower.includes('koneya item');

  if (isRemoveLast && currentOrder && currentOrder.length > 0) {
    const removedItem = currentOrder[currentOrder.length - 1];
    const updated = currentOrder.slice(0, -1);
    const dishName = removedItem.name || (removedItem.dish && removedItem.dish.name) || 'item';
    const msg = language === 'kn-IN'
      ? `ಸರಿ, ಕಡೆಯ ಐಟಂ ${dishName} ಅನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`
      : language === 'hi-IN'
        ? `ज़रूर, मैंने आखिरी आइटम ${dishName} हटा दिया है।`
        : `Sure, I've removed the last item (${dishName}) from your order.`;
    return {
      success: true,
      intent: 'REMOVE_ITEM',
      action: 'REMOVE',
      items: [],
      updatedOrder: updated,
      targetItem: dishName,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish: dishName,
      confidence: 0.96,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 9b. Relative Increment ("Give me one more", "Innondhu kodi", "Ek aur do")
  const isRelativeIncrement = lower.includes('one more') || lower.includes('innondhu') ||
    lower.includes('ಇನ್ನೊಂದು') || lower.includes('ek aur') || lower.includes('एक और') ||
    lower.includes('aur ek') || lower.includes('another one');

  if (isRelativeIncrement && currentOrder && currentOrder.length > 0) {
    const targetItem = lastDiscussedDish
      ? (currentOrder.find(i => (i.name || i.dish?.name || '').toLowerCase().includes(lastDiscussedDish.toLowerCase())) || currentOrder[currentOrder.length - 1])
      : currentOrder[currentOrder.length - 1];
    const targetName = targetItem.name || (targetItem.dish && targetItem.dish.name) || 'item';
    const updated = currentOrder.map(i => {
      const iName = (i.name || i.dish?.name || '').toLowerCase();
      if (iName === targetName.toLowerCase()) {
        const newQty = (i.quantity || 1) + 1;
        const price = i.price || (i.dish && i.dish.price) || 0;
        return { ...i, quantity: newQty, subtotal: price * newQty };
      }
      return i;
    });
    const msg = language === 'kn-IN'
      ? `ಖಂಡಿತ, ಇನ್ನೊಂದು ${targetName} ಸೇರಿಸಲಾಗಿದೆ.`
      : language === 'hi-IN'
        ? `ज़रूर, एक और ${targetName} जोड़ दिया गया है।`
        : `Certainly, added one more ${targetName}.`;
    return {
      success: true,
      intent: 'MODIFY_QUANTITY',
      action: 'UPDATE_QUANTITY',
      items: updated,
      updatedOrder: updated,
      targetItem: targetName,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish: targetName,
      confidence: 0.96,
      response: msg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 9c. Item Removal ("Remove the coffee", "Drop the soup")
  if (lower.includes('remove') || lower.includes('drop') || lower.includes('delete') ||
      lower.includes("don't want") || lower.includes('ತೆಗೆದುಹಾಕಿ') || lower.includes('हटाओ')) {
    let dishToRemove = findReferencedDish(lower);
    if (!dishToRemove && currentOrder && currentOrder.length > 0) {
      dishToRemove = currentOrder.find(item => {
        const iName = (item.name || item.dish?.name || '').toLowerCase();
        return iName.split(/\s+/).some(w => w.length > 3 && lower.includes(w));
      });
    }
    if (dishToRemove && currentOrder && currentOrder.length > 0) {
      const updated = currentOrder.filter(item => {
        const iName = (item.name || item.dish?.name || '').toLowerCase();
        const remName = dishToRemove.name.toLowerCase();
        return !iName.includes(remName) && !remName.includes(iName);
      });
      const msg = language === 'kn-IN'
        ? `ಸರಿ, ನಿಮ್ಮ ಆರ್ಡರ್‌ನಿಂದ ${dishToRemove.name} ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`
        : language === 'hi-IN'
          ? `ज़रूर, मैंने आपके ऑर्डर से ${dishToRemove.name} हटा दिया है।`
          : `Sure, I've removed ${dishToRemove.name} from your order.`;
      return {
        success: true,
        intent: 'REMOVE_ITEM',
        action: 'REMOVE',
        items: [],
        updatedOrder: updated,
        targetItem: dishToRemove.name,
        requiresClarification: false,
        clarificationQuestion: '',
        unrecognizedItems: [],
        lastDiscussedDish: dishToRemove.name,
        confidence: 0.96,
        response: msg,
        provider: 'client_fallback',
        isFallback: true
      };
    }
  }

  // 10. Quantity Modification & Ambiguity ("Actually make that three")
  if (lower.includes('make that') || lower.includes('make it') || lower.includes('change') ||
      lower.includes('instead of') || lower.includes('quantity to') || lower.includes('ಬದಲಾಯಿಸಿ') || lower.includes('बदलो')) {
    let newQty = 1;
    for (const [w, v] of Object.entries(numMap)) {
      if (new RegExp('\\b' + w + '\\b', 'i').test(lower)) {
        newQty = v;
        break;
      }
    }
    const digitMatch = lower.match(/\b(\d+)\b/);
    if (digitMatch) newQty = parseInt(digitMatch[1], 10) || newQty;

    const explicitDish = findReferencedDish(lower);

    // If ambiguous: multiple items in currentOrder and customer did not name dish
    if (!explicitDish && currentOrder && currentOrder.length > 1) {
      const itemNames = currentOrder.map(i => i.name || i.dish?.name);
      const question = language === 'kn-IN'
        ? `ನೀವು 3 ${itemNames.join(' ಅಥವಾ 3 ')} ಎಂದು ಹೇಳುತ್ತಿದ್ದೀರಾ?`
        : language === 'hi-IN'
          ? `क्या आपका मतलब 3 ${itemNames.join(' या 3 ')} से है?`
          : `Do you mean three ${itemNames.join(' or three ')}?`;
      return {
        success: true,
        intent: 'ASK_CLARIFICATION',
        action: 'NONE',
        items: [],
        updatedOrder: currentOrder,
        requiresClarification: true,
        clarificationQuestion: question,
        unrecognizedItems: [],
        lastDiscussedDish,
        confidence: 0.95,
        response: question,
        provider: 'client_fallback',
        isFallback: true
      };
    }

    const targetItemName = explicitDish ? explicitDish.name : (lastDiscussedDish || (currentOrder[0] && (currentOrder[0].name || currentOrder[0].dish?.name)));
    if (targetItemName && currentOrder && currentOrder.length > 0) {
      const updated = currentOrder.map(i => {
        const iName = (i.name || i.dish?.name || '').toLowerCase();
        if (iName.includes(targetItemName.toLowerCase())) {
          const price = i.price || (i.dish && i.dish.price) || 0;
          return { ...i, quantity: newQty, subtotal: price * newQty };
        }
        return i;
      });
      const qtyWord = getQuantityWord(newQty, language);
      const msg = language === 'kn-IN'
        ? `ಸರಿ! ${targetItemName} ಪ್ರಮಾಣವನ್ನು ${qtyWord} ಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.`
        : language === 'hi-IN'
          ? `ठीक है! ${targetItemName} की संख्या बदलकर ${qtyWord} कर दी गई है।`
          : `Got it! Updated ${targetItemName} to ${qtyWord}. Would you like anything else?`;
      return {
        success: true,
        intent: 'MODIFY_QUANTITY',
        action: 'UPDATE_QUANTITY',
        items: updated,
        updatedOrder: updated,
        targetItem: targetItemName,
        requiresClarification: false,
        clarificationQuestion: '',
        unrecognizedItems: [],
        lastDiscussedDish: targetItemName,
        confidence: 0.96,
        response: msg,
        provider: 'client_fallback',
        isFallback: true
      };
    }
  }

  // 11. Food Order Intent & Grounding via matchVoiceOrderWithMenu
  const parseResult = matchVoiceOrderWithMenu(clean, menuItems, language);

  if (parseResult.matchedItems.length > 0) {
    const formattedItems = parseResult.matchedItems.map(m => ({
      name: m.dish.name,
      menuItemId: m.dish._id || m.dish.id,
      quantity: m.quantity,
      price: m.dish.price,
      subtotal: m.dish.price * m.quantity,
      customizations: m.customizations || [],
      dish: m.dish
    }));

    let updatedOrder = [...currentOrder];
    for (const item of formattedItems) {
      const existingIdx = updatedOrder.findIndex(i => (i.name || i.dish?.name || '').toLowerCase() === item.name.toLowerCase());
      if (existingIdx >= 0) {
        updatedOrder[existingIdx] = {
          ...updatedOrder[existingIdx],
          quantity: updatedOrder[existingIdx].quantity + item.quantity,
          subtotal: item.price * (updatedOrder[existingIdx].quantity + item.quantity)
        };
      } else {
        updatedOrder.push(item);
      }
    }

    const spokenConfirmation = formatOrderConfirmationPrompt(parseResult.matchedItems, language);
    return {
      success: true,
      intent: (currentOrder.length > 0 && !lower.includes('want') && !lower.includes('give me') && !lower.includes('ಬೇಕು') && !lower.includes('चाहिए')) ? 'ADD_ITEM' : 'ORDER',
      action: 'ADD',
      items: formattedItems,
      updatedOrder: updatedOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: parseResult.unrecognizedItems.map(u => typeof u === 'string' ? u : (u.query || u.name)),
      lastDiscussedDish: formattedItems[0].name,
      confidence: 0.95,
      response: spokenConfirmation,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  if (parseResult.unrecognizedItems.length > 0) {
    const unMsg = formatUnknownItemPrompt(parseResult.unrecognizedItems, language);
    return {
      success: true,
      intent: 'ORDER',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: parseResult.unrecognizedItems.map(u => typeof u === 'string' ? u : (u.query || u.name)),
      lastDiscussedDish,
      confidence: 0.85,
      response: unMsg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  const unkMsg = getConversationalResponse(INTENT_TYPES.UNKNOWN, language);
  return {
    success: true,
    intent: 'UNKNOWN',
    action: 'NONE',
    items: [],
    updatedOrder: currentOrder,
    requiresClarification: false,
    clarificationQuestion: '',
    unrecognizedItems: [],
    lastDiscussedDish,
    confidence: 0.4,
    response: unkMsg,
    provider: 'client_fallback',
    isFallback: true
  };
};

/**
 * Main Conversational Voice Intent Parsing Function
 * Tries backend Gemini NLU proxy first with multi-turn session context,
 * falls back gracefully to local conversational engine.
 *
 * @param {Object} params
 * @param {string} params.text Spoken speech transcript
 * @param {string} [params.language='en-IN'] Language code ('en-IN', 'kn-IN', 'hi-IN')
 * @param {Array} [params.menuItems=[]] Loaded active menu items for client-side grounding
 * @param {string} [params.context='GENERAL'] Current conversational stage ('CONFIRM_ITEM', 'ASK_MORE', 'GENERAL')
 * @param {Array} [params.conversationHistory=[]] Previous conversation turns
 * @param {Array} [params.currentOrder=[]] Current draft order items
 * @param {string|null} [params.lastDiscussedDish=null] Last discussed dish for pronoun resolution
 * @param {number} [params.timeoutMs=4500] Request timeout before falling back
 * @returns {Promise<Object>} Normalized conversational intent response
 */
export const parseVoiceIntent = async ({
  text,
  language = 'en-IN',
  menuItems = [],
  context = 'GENERAL',
  conversationHistory = [],
  currentOrder = [],
  lastDiscussedDish = null,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const trimmed = (text || '').trim();
  const effectiveLanguage = detectSpokenLanguage(trimmed, language);

  if (!trimmed) {
    return {
      success: false,
      intent: 'UNKNOWN',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish,
      confidence: 0,
      response: getConversationalResponse(INTENT_TYPES.UNKNOWN, effectiveLanguage),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 1. Attempt Backend Gemini Intent Parsing with Conversational Context
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      text: trimmed,
      language: effectiveLanguage,
      menu: [], // Backend automatically fetches active MongoDB dishes and KnowledgeDocs
      conversationHistory: conversationHistory || [],
      currentOrder: (currentOrder || []).map(i => ({
        name: i.name || i.dish?.name,
        menuItemId: i.menuItemId || (i.dish && (i.dish._id || i.dish.id)),
        quantity: i.quantity || 1,
        price: i.price || (i.dish && i.dish.price) || 0,
        customizations: i.customizations || []
      })),
      lastDiscussedDish: lastDiscussedDish || null
    };

    const res = await fetch(`${API_BASE}/voice/parse-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (res.ok) {
      const backendData = await res.json();
      if (backendData && backendData.success) {
        // Ground every returned item strictly against active client menu
        const rawBackendItems = Array.isArray(backendData.items) ? backendData.items : [];
        const { verifiedItems, ungroundedItems } = groundDishesWithActiveMenu(rawBackendItems, menuItems);

        // Ground updatedOrder strictly
        const rawUpdatedOrder = Array.isArray(backendData.updatedOrder) ? backendData.updatedOrder : [];
        const { verifiedItems: verifiedUpdatedOrder } = groundDishesWithActiveMenu(rawUpdatedOrder, menuItems);

        let finalUpdatedOrder = currentOrder;
        if (Array.isArray(backendData.updatedOrder)) {
          if (backendData.action === 'CLEAR' || backendData.action === 'REMOVE') {
            finalUpdatedOrder = verifiedUpdatedOrder;
          } else if (verifiedUpdatedOrder.length > 0) {
            finalUpdatedOrder = verifiedUpdatedOrder;
          }
        }

        // Combine backend unrecognized items with any ungrounded items
        const combinedUnrecognized = Array.from(new Set([
          ...(Array.isArray(backendData.unrecognizedItems) ? backendData.unrecognizedItems : []),
          ...ungroundedItems
        ]));

        // Determine natural response
        let finalResponse = backendData.response || '';
        if (verifiedItems.length > 0 && !finalResponse) {
          finalResponse = formatOrderConfirmationPrompt(verifiedItems, effectiveLanguage);
        } else if (combinedUnrecognized.length > 0 && backendData.intent === 'ORDER' && !finalResponse) {
          finalResponse = formatUnknownItemPrompt(combinedUnrecognized, effectiveLanguage);
        }

        return {
          success: true,
          intent: backendData.intent || 'UNKNOWN',
          action: backendData.action || 'NONE',
          items: verifiedItems,
          updatedOrder: finalUpdatedOrder,
          targetItem: backendData.targetItem || null,
          requiresClarification: Boolean(backendData.requiresClarification),
          clarificationQuestion: backendData.clarificationQuestion || '',
          unrecognizedItems: combinedUnrecognized,
          lastDiscussedDish: backendData.lastDiscussedDish || (verifiedItems[0] ? verifiedItems[0].name : lastDiscussedDish),
          confidence: Number(backendData.confidence) || 0.95,
          response: finalResponse,
          provider: backendData.provider || 'gemini_ai',
          isFallback: Boolean(backendData.provider === 'gemini_ai_fallback'),
          detectedLanguage: effectiveLanguage
        };
      }
    }
  } catch (err) {
    console.debug('[voiceIntentService] Backend parse-intent call did not complete, using local fallback:', err.message);
  }

  // 2. Offline / Server Unavailable / Timeout Fallback
  return executeLocalFallback({
    text: trimmed,
    language: effectiveLanguage,
    menuItems,
    context,
    conversationHistory,
    currentOrder,
    lastDiscussedDish
  });
};

export default {
  parseVoiceIntent,
  groundDishesWithActiveMenu,
  executeLocalFallback
};
