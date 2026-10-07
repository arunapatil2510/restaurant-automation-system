/**
 * RESTOSMART Voice Intent Classification Layer
 * Analyzes spoken user transcript BEFORE passing to the menu parser.
 * Distinguishes Conversational Intents (Greeting, Help, Gratitude, Cancel, Confirm)
 * from actual Food Orders, ensuring normal conversational words are NEVER misidentified as food.
 */

import { FOOD_TRANSLATIONS } from './multilingualVoiceEngine.js';

export const INTENT_TYPES = {
  GREETING: 'greeting',
  HELP: 'help',
  GRATITUDE: 'gratitude',
  CONFIRMATION: 'confirmation',
  CANCEL: 'cancel',
  MODIFY: 'modify',
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  FOOD_ORDER: 'food_order',
  UNKNOWN: 'unknown'
};

// Conversational Responses per language
export const INTENT_RESPONSES = {
  greeting: {
    'en-IN': "Hello! Welcome to RESTOSMART. What would you like to order?",
    'kn-IN': "ನಮಸ್ಕಾರ! ರೆಸ್ಟೋಸ್ಮಾರ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "नमस्ते! रेस्टोस्मार्ट में आपका स्वागत है। आप क्या ऑर्डर करना चाहेंगे?"
  },
  help: {
    'en-IN': "You can say something like 'One Masala Dosa and two Cold Coffees', or tap Browse Menu to see all dishes.",
    'kn-IN': "ನೀವು 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಎರಡು ಕೋಲ್ಡ್ ಕಾಫಿ' ಎಂದು ಹೇಳಬಹುದು, ಅಥವಾ ಎಲ್ಲಾ ತಿಂಡಿಗಳನ್ನು ನೋಡಲು ಬ್ರೌಸ್ ಮೆನು ಒತ್ತಿರಿ.",
    'hi-IN': "आप कह सकते हैं 'एक मसाला डोसा और दो कोल्ड कॉफ़ी', या सारे व्यंजन देखने के लिए मेनू ब्राउज़ करें।"
  },
  gratitude: {
    'en-IN': "You're welcome! Is there anything else you'd like to order?",
    'kn-IN': "ಸ್ವಾಗತ! ನೀವು ಬೇರೆ ಏನಾದರೂ ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?",
    'hi-IN': "आपका स्वागत है! क्या आप कुछ और ऑर्डर करना चाहेंगे?"
  },
  cancel: {
    'en-IN': "Okay. What would you like to change?",
    'kn-IN': "ಸರಿ. ನೀವು ಏನನ್ನು ಬದಲಾಯಿಸಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "ठीक है। आप क्या बदलना चाहेंगे?"
  },
  modify: {
    'en-IN': "Okay. What would you like to change?",
    'kn-IN': "ಸರಿ. ನೀವು ಏನನ್ನು ಬದಲಾಯಿಸಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "ठीक है। आप क्या बदलना चाहेंगे?"
  },
  unknown: {
    'en-IN': "I didn't quite catch that. Please tell me what you'd like to eat (e.g. 'One Masala Dosa') or browse the menu.",
    'kn-IN': "ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ನಿಮ್ಮ ತಿಂಡಿಯನ್ನು ಹೇಳಿ (ಉದಾ: 'ಒಂದು ಮಸಾಲ ದೋಸೆ') ಅಥವಾ ಮೆನು ನೋಡಿ.",
    'hi-IN': "मैं समझ नहीं पाया। कृपया अपना ऑर्डर बोलें (उदा: 'एक मसाला डोसा') या मेनू देखें।"
  }
};

// Intent keyword & pattern dictionaries
const GREETING_PATTERNS = [
  // English
  /^(hi|hello|hey|good morning|good afternoon|good evening|namaste|howdy|whats up|how are you)$/i,
  /^(hi|hello|hey)\s+(there|assistant|restosmart|kiosk|budd?y|friend)?$/i,
  // Kannada
  /^(ಹಾಯ್|ಹಲೋ|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|ಶುಭೋದಯ|ಶುಭ ಸಂಜೆ|ಹೇಗಿದ್ದೀರಾ)$/i,
  // Hindi
  /^(हाय|हेलो|नमस्ते|नमस्कार|सुप्रभात|शुभ संध्या|प्रणाम|कैसे हो|क्या हाल है)$/i
];

const HELP_PATTERNS = [
  // English
  /^(help|help me|what can i order|what do you have|show menu|what is available|what is on the menu|suggest something|recommend something|i dont know|i do not know|what to eat)$/i,
  /^(how to order|how does this work|menu please|show me the menu)$/i,
  // Kannada
  /^(ಸಹಾಯ|ಸಹಾಯ ಮಾಡಿ|ಏನು ಆರ್ಡರ್ ಮಾಡಬಹುದು|ಏನಿದೆ|ಮೆನು ತೋರಿಸಿ|ಗೊತ್ತಿಲ್ಲ|ತಿಳಿಸಿ)$/i,
  // Hindi
  /^(मदद|मदद करो|क्या ऑर्डर कर सकते हैं|क्या है|मेनू दिखाओ|पता नहीं|कुछ बताओ|क्या मिलेगा|क्या खाएं)$/i
];

const GRATITUDE_PATTERNS = [
  // English
  /^(thank you|thanks|thanks a lot|thank you so much|thank you very much|awesome|great|cool|perfect)$/i,
  // Kannada
  /^(ಧನ್ಯವಾದ|ಧನ್ಯವಾದಗಳು|ಥ್ಯಾಂಕ್ಸ್|ತುಂಬಾ ಧನ್ಯವಾದಗಳು)$/i,
  // Hindi
  /^(धन्यवाद|शुक्रिया|थैंक यू|बहुत धन्यवाद|बहुत शुक्रिया)$/i
];

const CONFIRM_PATTERNS = [
  // English
  /^(yes|confirm|yes confirm|confirm order|correct|proceed|place order|done|okay|ok|sure|yep|yeah|thats right|that is right)$/i,
  // Kannada
  /^(ಹೌದು|ಸರಿ|ಖಚಿತಪಡಿಸಿ|ಆರ್ಡರ್ ಮಾಡಿ|ಖಚಿತ|ಸರಿಯಾಗಿದೆ|ಹಾ|ಆಯಿತು|yes|confirm)$/i,
  // Hindi
  /^(हाँ|हाँ कन्फर्म|कन्फर्म|कन्फर्म करो|सही है|ऑर्डर करो|ठीक है|हाँ ठीक है|yes|confirm)$/i
];

const CANCEL_PATTERNS = [
  // English
  /^(no|cancel|clear|restart|reset|wrong|stop|change|discard|never mind|dont order|cancel order)$/i,
  // Kannada
  /^(ಬೇಡ|ರದ್ದು|ತಪ್ಪು|ಮತ್ತೆ|ಬೇಡವೇ ಬೇಡ|ಕ್ಯಾನ್ಸಲ್|ರದ್ದು ಮಾಡಿ)$/i,
  // Hindi
  /^(नहीं|रद्द|गलत|वापस|कैंसिल|मत करो|हटाओ|कैंसिल करो|रद्द करो)$/i
];

const DINE_IN_PATTERNS = [
  // English
  /^(dine in|dine-in|table|eat here|eating here|inside|dine in please)$/i,
  /^table\s*#?\s*(\d+)$/i,
  // Kannada
  /^(ಇಲ್ಲೇ ಊಟ|ಡೈನ್ ಇನ್|ಟೇಬಲ್)$/i,
  // Hindi
  /^(डाइन इन|यहीं खाएंगे|यही खाएंगे|टेबल)$/i
];

const TAKEAWAY_PATTERNS = [
  // English
  /^(takeaway|take away|take-away|parcel|pack it|to go|packing|takeout)$/i,
  // Kannada
  /^(ಪಾರ್ಸೆಲ್|ತೆಗೆದುಕೊಂಡು ಹೋಗಿ|ಪ್ಯಾಕ್ ಮಾಡಿ)$/i,
  // Hindi
  /^(टेकअवे|पार्सल|पैक कर दो|ले जाएंगे|पैक)$/i
];

const MODIFY_PATTERNS = [
  // English
  /^(change|modify|change order|modify order|edit|edit order)$/i,
  // Kannada
  /^(ಬದಲಾಯಿಸಿ|ಬದಲಿಸಿ)$/i,
  // Hindi
  /^(बदलो|बदलना है|ऑर्डर बदलो)$/i
];

/**
 * Classifies spoken transcript into an intent.
 * Checks for non-food conversational intents before any food parsing occurs.
 */
export const classifyIntent = (transcript = '', hasPendingOrder = false) => {
  const clean = transcript.toLowerCase().trim().replace(/[.,?!।]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!clean) {
    return { type: INTENT_TYPES.UNKNOWN, text: transcript };
  }

  // 1. If customer is in confirmation stage, check confirmation/cancel/modify first
  if (hasPendingOrder) {
    if (CONFIRM_PATTERNS.some(regex => regex.test(clean))) {
      return { type: INTENT_TYPES.CONFIRMATION, text: clean };
    }
    if (CANCEL_PATTERNS.some(regex => regex.test(clean))) {
      return { type: INTENT_TYPES.CANCEL, text: clean };
    }
    if (MODIFY_PATTERNS.some(regex => regex.test(clean))) {
      return { type: INTENT_TYPES.MODIFY, text: clean };
    }
  }

  // 2. Greeting & Help Checks (including compound phrases like "Hello what can I order?")
  if (
    GREETING_PATTERNS.some(regex => regex.test(clean)) ||
    clean.startsWith('hi ') || 
    clean.startsWith('hello ') || 
    clean.startsWith('hey ') || 
    clean.startsWith('namaste ') ||
    clean.startsWith('ನಮಸ್ಕಾರ ') ||
    clean.startsWith('ಹಲೋ ') ||
    clean.startsWith('नमस्ते ') ||
    clean.startsWith('हेलो ')
  ) {
    if (
      HELP_PATTERNS.some(regex => regex.test(clean)) ||
      clean.includes('what can i order') ||
      clean.includes('what is on the menu') ||
      clean.includes('suggest') ||
      clean.includes('recommend') ||
      clean.includes('help')
    ) {
      return { type: INTENT_TYPES.HELP, text: clean };
    }
    return { type: INTENT_TYPES.GREETING, text: clean };
  }

  // 3. Pure Help / Menu Query Check
  if (
    HELP_PATTERNS.some(regex => regex.test(clean)) ||
    clean.includes('what can i order') ||
    clean.includes('what is available') ||
    clean.includes('show menu')
  ) {
    return { type: INTENT_TYPES.HELP, text: clean };
  }

  // 4. Gratitude Check
  if (GRATITUDE_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.GRATITUDE, text: clean };
  }

  // 5. Dining Mode Commands
  if (DINE_IN_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.DINE_IN, text: clean };
  }
  if (TAKEAWAY_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.TAKEAWAY, text: clean };
  }

  // 6. Cancel / Confirmation when not in pending state
  if (CANCEL_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.CANCEL, text: clean };
  }
  if (CONFIRM_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.CONFIRMATION, text: clean };
  }

  // 6. Food Order vs Unknown Check
  // Check if transcript contains any food keywords, numbers, or order phrasing
  const foodKeys = Object.keys(FOOD_TRANSLATIONS);
  const words = clean.split(' ');

  const hasFoodKeyword = foodKeys.some(fk => clean.includes(fk.toLowerCase()));
  const hasQuantityWord = /^(one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|1|2|3|4|5|6|7|8|9|10|ಒಂದು|ಎರಡು|ಮೂರು|ನಾಲ್ಕು|ಐದು|ಆರು|ಏಳು|ಎಂಟು|ಒಂಬತ್ತು|ಹತ್ತು|೧|೨|೩|೪|೫|೬|೭|೮|೯|೧೦|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|१|२|३|४|५|६|७|८|९|१०)/i.test(clean);
  const hasOrderVerb = /(want|order|give|bring|get|need|take|have|ನನಗೆ|ನಮಗೆ|ಕೊಡಿ|ಆರ್ಡರ್|ಮತ್ತು|मुझे|हमे|दीजिए|लाओ|और)/i.test(clean);

  if (hasFoodKeyword || hasQuantityWord || hasOrderVerb || words.length >= 2) {
    return { type: INTENT_TYPES.FOOD_ORDER, text: clean };
  }

  // Fallback to unknown if single non-food word
  return { type: INTENT_TYPES.UNKNOWN, text: clean };
};

/**
 * Get response text for a conversational intent
 */
export const getConversationalResponse = (intentType, langCode = 'en-IN') => {
  const responses = INTENT_RESPONSES[intentType] || INTENT_RESPONSES.unknown;
  return responses[langCode] || responses['en-IN'] || responses.unknown['en-IN'];
};
