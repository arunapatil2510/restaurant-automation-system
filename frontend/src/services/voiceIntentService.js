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
  getConversationalResponse
} from '../utils/intentClassifier.js';
import {
  formatOrderConfirmationPrompt,
  formatUnknownItemPrompt
} from '../utils/multilingualVoiceEngine.js';

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
 */
export const executeLocalFallback = ({ text, language = 'en-IN', menuItems = [], context = 'GENERAL' }) => {
  const clean = (text || '').trim();
  const classified = classifyIntent(clean, context);

  // 1. Food Order Intent
  if (classified.type === INTENT_TYPES.FOOD_ORDER) {
    const parseResult = matchVoiceOrderWithMenu(clean, menuItems, language);

    if (parseResult.matchedItems.length > 0) {
      const spokenConfirmation = formatOrderConfirmationPrompt(parseResult.matchedItems, language);
      return {
        success: true,
        intent: 'ORDER',
        items: parseResult.matchedItems,
        unrecognizedItems: parseResult.unrecognizedItems.map(u => typeof u === 'string' ? u : (u.query || u.name)),
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
        items: [],
        unrecognizedItems: parseResult.unrecognizedItems.map(u => typeof u === 'string' ? u : (u.query || u.name)),
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
      items: [],
      unrecognizedItems: [],
      confidence: 0.4,
      response: unkMsg,
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 2. Affirmative / Confirmation Intent
  if (classified.type === INTENT_TYPES.CONFIRMATION) {
    return {
      success: true,
      intent: 'CONFIRM',
      items: [],
      unrecognizedItems: [],
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.CONFIRMATION, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 3. Negative / Cancel / Reject Intent
  if (classified.type === INTENT_TYPES.CANCEL) {
    return {
      success: true,
      intent: 'CANCEL',
      items: [],
      unrecognizedItems: [],
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.CANCEL, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 4. Modify Intent
  if (classified.type === INTENT_TYPES.MODIFY) {
    return {
      success: true,
      intent: 'MODIFY',
      items: [],
      unrecognizedItems: [],
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.MODIFY, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 5. Finish Order Intent
  if (classified.type === INTENT_TYPES.FINISH_ORDER) {
    return {
      success: true,
      intent: 'FINISH_ORDER',
      items: [],
      unrecognizedItems: [],
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.FINISH_ORDER, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 6. Add More Intent
  if (classified.type === INTENT_TYPES.ADD_MORE) {
    return {
      success: true,
      intent: 'ADD_MORE',
      items: [],
      unrecognizedItems: [],
      confidence: 0.98,
      response: getConversationalResponse(INTENT_TYPES.ADD_MORE, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 7. Conversational Intents (Greeting, Help, Gratitude)
  if (
    classified.type === INTENT_TYPES.GREETING ||
    classified.type === INTENT_TYPES.HELP ||
    classified.type === INTENT_TYPES.GRATITUDE
  ) {
    return {
      success: true,
      intent: classified.type,
      items: [],
      unrecognizedItems: [],
      confidence: 0.95,
      response: getConversationalResponse(classified.type, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 8. Unknown / Uninterpretable Input
  return {
    success: true,
    intent: 'UNKNOWN',
    items: [],
    unrecognizedItems: [],
    confidence: 0.4,
    response: getConversationalResponse(INTENT_TYPES.UNKNOWN, language),
    provider: 'client_fallback',
    isFallback: true
  };
};

/**
 * Main Voice Intent Parsing Function
 * Tries backend Gemini 2.5 Flash NLU proxy first, falls back gracefully to local parser.
 *
 * @param {Object} params
 * @param {string} params.text Spoken speech transcript
 * @param {string} [params.language='en-IN'] Language code ('en-IN', 'kn-IN', 'hi-IN')
 * @param {Array} [params.menuItems=[]] Loaded active menu items for client-side grounding
 * @param {string} [params.context='GENERAL'] Current conversational stage ('CONFIRM_ITEM', 'ASK_MORE', 'GENERAL')
 * @param {number} [params.timeoutMs=4500] Request timeout before falling back
 * @returns {Promise<Object>} Normalized intent response
 */
export const parseVoiceIntent = async ({
  text,
  language = 'en-IN',
  menuItems = [],
  context = 'GENERAL',
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      success: false,
      intent: 'UNKNOWN',
      items: [],
      unrecognizedItems: [],
      confidence: 0,
      response: getConversationalResponse(INTENT_TYPES.UNKNOWN, language),
      provider: 'client_fallback',
      isFallback: true
    };
  }

  // 1. Attempt Backend Gemini Intent Parsing
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      text: trimmed,
      language: language,
      menu: [] // Backend automatically fetches active MongoDB dishes and KnowledgeDocs
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

        // Combine backend unrecognized items with any ungrounded items
        const combinedUnrecognized = Array.from(new Set([
          ...(Array.isArray(backendData.unrecognizedItems) ? backendData.unrecognizedItems : []),
          ...ungroundedItems
        ]));

        // Determine natural confirmation response
        let finalResponse = backendData.response || '';
        if (verifiedItems.length > 0) {
          if (!finalResponse) {
            finalResponse = formatOrderConfirmationPrompt(verifiedItems, language);
          }
        } else if (combinedUnrecognized.length > 0 && backendData.intent === 'ORDER') {
          finalResponse = formatUnknownItemPrompt(combinedUnrecognized, language);
        }

        return {
          success: true,
          intent: backendData.intent || 'UNKNOWN',
          items: verifiedItems,
          unrecognizedItems: combinedUnrecognized,
          confidence: Number(backendData.confidence) || 0.95,
          response: finalResponse,
          provider: backendData.provider || 'gemini_ai',
          isFallback: Boolean(backendData.provider === 'gemini_ai_fallback')
        };
      }
    }
  } catch (err) {
    console.debug('[voiceIntentService] Backend parse-intent call did not complete, using local fallback:', err.message);
  }

  // 2. Offline / Server Unavailable / Timeout Fallback
  return executeLocalFallback({ text: trimmed, language, menuItems, context });
};

export default {
  parseVoiceIntent,
  groundDishesWithActiveMenu,
  executeLocalFallback
};
