/**
 * RESTOSMART Voice Intent Classification & Grounded Dialogue System
 * Accurately routes customer voice commands to appropriate kiosk actions.
 */

import { FOOD_TRANSLATIONS } from './multilingualVoiceEngine.js';

export const INTENT_TYPES = {
  // Conversational & NLU standard intents
  GREETING: 'GREETING',
  MENU_QUERY: 'MENU_QUERY',
  ITEM_QUERY: 'ITEM_QUERY',
  PRICE_QUERY: 'PRICE_QUERY',
  INGREDIENT_QUERY: 'INGREDIENT_QUERY',
  RECOMMENDATION: 'RECOMMENDATION',
  ORDER: 'ORDER',
  ADD_ITEM: 'ADD_ITEM',
  MODIFY_QUANTITY: 'MODIFY_QUANTITY',
  REMOVE_ITEM: 'REMOVE_ITEM',
  MODIFY_CUSTOMIZATION: 'MODIFY_CUSTOMIZATION',
  CONFIRM: 'CONFIRM',
  CANCEL: 'CANCEL',
  ASK_CLARIFICATION: 'ASK_CLARIFICATION',
  HELP: 'HELP',
  GRATITUDE: 'GRATITUDE',
  UNKNOWN: 'UNKNOWN',

  // Legacy mappings for backwards compatibility with existing UI handlers
  FOOD_ORDER: 'FOOD_ORDER',
  CONFIRMATION: 'CONFIRMATION',
  MODIFY: 'MODIFY',
  DINE_IN: 'DINE_IN',
  TAKEAWAY: 'TAKEAWAY',
  FINISH_ORDER: 'FINISH_ORDER',
  ADD_MORE: 'ADD_MORE'
};

// Conversational responses across English, Kannada, Hindi
export const INTENT_RESPONSES = {
  [INTENT_TYPES.GREETING]: {
    'en-IN': "Hello! Welcome to RESTOSMART. What would you like to order today?",
    'kn-IN': "ನಮಸ್ಕಾರ! ರೆಸ್ಟೋಸ್ಮಾರ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "नमस्ते! रेस्टोस्मार्ट में आपका स्वागत है। आप क्या खाना चाहेंगे?"
  },
  [INTENT_TYPES.HELP]: {
    'en-IN': "You can order directly by speaking your dishes, like 'Two Masala Dosa and one Mango Lassi', or ask for prices and recommendations.",
    'kn-IN': "ನೀವು ನಿಮ್ಮ ತಿಂಡಿಗಳನ್ನು ನೇರವಾಗಿ ಹೇಳಬಹುದು (ಉದಾ: 'ಎರಡು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಒಂದು ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ'), ಅಥವಾ ಬೆಲೆ ಮತ್ತು ಶಿಫಾರಸುಗಳನ್ನು ಕೇಳಬಹುದು.",
    'hi-IN': "आप बोलकर सीधे ऑर्डर कर सकते हैं (जैसे: 'दो मसाला डोसा और एक मैंगो लस्सी'), या कीमत और सलाह पूछ सकते हैं।"
  },
  [INTENT_TYPES.MENU_QUERY]: {
    'en-IN': "Our menu features Starters, Main Course Curries, Biryani & Rice, South Indian Beverages, and Desserts. What would you like?",
    'kn-IN': "ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ Starters, Main Course, Biryani & Rice, South Indian Beverages ಮತ್ತು Desserts ಲಭ್ಯವಿದೆ. ನಿಮಗೆ ಯಾವುದು ಬೇಕು?",
    'hi-IN': "हमारे मेनू में Starters, Main Course, Biryani & Rice, South Indian Beverages और Desserts शामिल हैं। आप क्या पसंद करेंगे?"
  },
  [INTENT_TYPES.RECOMMENDATION]: {
    'en-IN': "Our popular specials today are Masala Dosa, Paneer Butter Masala, and Chicken Dum Biryani. Would you like to try any of these?",
    'kn-IN': "ನಮ್ಮ ಇಂದಿನ ಜನಪ್ರಿಯ ಸ್ಪೆಷಲ್ಸ್: ಮಸಾಲ ದೋಸೆ, ಪನೀರ್ ಬಟರ್ ಮಸಾಲ ಮತ್ತು ಚಿಕನ್ ದಮ್ ಬಿರಿಯಾನಿ. ನೀವು ಇವುಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಬಯಸುವಿರಾ?",
    'hi-IN': "हमारे लोकप्रिय शेफ स्पेशल हैं: मसाला डोसा, पनीर बटर मसाला और चिकन दम बिरयानी। क्या आप इनमें से कुछ लेना चाहेंगे?"
  },
  [INTENT_TYPES.GRATITUDE]: {
    'en-IN': "You're very welcome! Enjoy your meal at RESTOSMART.",
    'kn-IN': "ಧನ್ಯವಾದಗಳು! ರೆಸ್ಟೋಸ್ಮಾರ್ಟ್‌ನಲ್ಲಿ ರುಚಿಕರ ಊಟವನ್ನು ಆನಂದಿಸಿ.",
    'hi-IN': "आपका स्वागत है! रेस्टोस्मार्ट में अपने भोजन का आनंद लें।"
  },
  [INTENT_TYPES.CONFIRMATION]: {
    'en-IN': "Added to your order. Would you like anything else?",
    'kn-IN': "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ?",
    'hi-IN': "आपके ऑर्डर में जोड़ दिया गया है। क्या आप कुछ और लेना चाहेंगे?"
  },
  [INTENT_TYPES.CONFIRM]: {
    'en-IN': "Your order is confirmed. Taking you to the cart to review.",
    'kn-IN': "ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ. ಕಾರ್ಟ್ ಪರಿಶೀಲಿಸಲು ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.",
    'hi-IN': "आपका ऑर्डर कन्फर्म हो गया है। कार्ट देखने के लिए ले जा रहे हैं।"
  },
  [INTENT_TYPES.FINISH_ORDER]: {
    'en-IN': "Your order is confirmed. Taking you to the cart to review.",
    'kn-IN': "ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ. ಕಾರ್ಟ್ ಪರಿಶೀಲಿಸಲು ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.",
    'hi-IN': "आपका ऑर्डर कन्फर्म हो गया है। कार्ट देखने के लिए ले जा रहे हैं।"
  },
  [INTENT_TYPES.ADD_MORE]: {
    'en-IN': "What else would you like to order?",
    'kn-IN': "ನೀವು ಮತ್ತೇನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "आप और क्या ऑर्डर करना चाहेंगे?"
  },
  [INTENT_TYPES.CANCEL]: {
    'en-IN': "Okay. What would you like to order instead?",
    'kn-IN': "ಸರಿ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "ठीक है। आप क्या ऑर्डर करना चाहेंगे?"
  },
  [INTENT_TYPES.MODIFY]: {
    'en-IN': "Okay. What would you like to order instead?",
    'kn-IN': "ಸರಿ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    'hi-IN': "ठीक है। आप क्या ऑर्डर करना चाहेंगे?"
  },
  [INTENT_TYPES.UNKNOWN]: {
    'en-IN': "Sorry, I couldn't find that item on the menu.",
    'kn-IN': "ಕ್ಷಮಿಸಿ, ಆ ತಿಂಡಿ ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.",
    'hi-IN': "क्षमा करें, यह व्यंजन हमारे मेनू में उपलब्ध नहीं है।"
  }
};

const GREETING_PATTERNS = [
  /^(hi|hello|hey)\s*(there|assistant|restosmart|kiosk|buddy|friend)?$/i,
  /^(ಹಾಯ್|ಹಲೋ|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|ಶುಭೋದಯ|ಶುಭ ಸಂಜೆ|ಹೇಗಿದ್ದೀರಾ)$/i,
  /^(हाय|हेलो|नमस्ते|नमस्कार|सुप्रभात|शुभ संध्या|प्रणाम|कैसे हो|क्या हाल है)$/i
];

const HELP_PATTERNS = [
  /^(help|help me|what can i order|what do you have|show menu|what is available|what is on the menu|suggest something|recommend something|i dont know|what to eat)$/i,
  /^(how to order|how does this work|menu please|show me the menu)$/i,
  /^(ಸಹಾಯ|ಸಹಾಯ ಮಾಡಿ|ಏನು ಆರ್ಡರ್ ಮಾಡಬಹುದು|ಏನಿದೆ|ಮೆನು ತೋರಿಸಿ|ಗೊತ್ತಿಲ್ಲ|ತಿಳಿಸಿ)$/i,
  /^(मदद|मदद करो|क्या ऑर्डर कर सकते हैं|क्या है|मेनू दिखाओ|पता नहीं|कुछ बताओ|क्या मिलेगा|क्या खाएं)$/i
];

const GRATITUDE_PATTERNS = [
  /^(thank you|thanks|thanks a lot|thank you so much|thank you very much|awesome|great|cool|perfect)$/i,
  /^(ಧನ್ಯವಾದ|ಧನ್ಯವಾದಗಳು|ಥ್ಯಾಂಕ್ಸ್|ತುಂಬಾ ಧನ್ಯವಾದಗಳು)$/i,
  /^(धन्यवाद|शुक्रिया|थैंक यू|बहुत धन्यवाद|बहुत शुक्रिया)$/i
];

const CONFIRM_PATTERNS = [
  /^(yes|yes please|please|confirm|yes confirm|confirm order|correct|proceed|yes proceed|place order|done|okay|ok|sure|sure please|yep|yeah|thats right|that is right|add it|add them|yes add it|yes add them|add to cart|yes add to cart|haan|haudu|sari|sahi|add more|one more|more|want more)$/i,
  /^(ಹೌದು|ಸರಿ|ಖಚಿತಪಡಿಸಿ|ಆರ್ಡರ್ ಮಾಡಿ|ಖಚಿತ|ಸರಿಯಾಗಿದೆ|ಹಾ|ಆಯಿತು|ಇನ್ನೊಂದು|ಬೇಕು|yes|confirm)$/i,
  /^(हाँ|हाँ कन्फर्म|कन्फर्म|कन्फर्म करो|सही है|ऑर्डर करो|ठीक है|हाँ ठीक है|हां|और|और चाहिए|एक और|yes|confirm)$/i
];

const CANCEL_PATTERNS = [
  /^(no|cancel|clear|restart|reset|wrong|stop|change|discard|never mind|dont order|cancel order|change it|beda|nahi|nothing|nothing else|no thanks|nope|no more|thats all|that's all|finish|finished|checkout|go to cart|view cart|all done|i am done|im done)$/i,
  /^(ಬೇಡ|ರದ್ದು|ತಪ್ಪು|ಮತ್ತೆ|ಬೇಡವೇ ಬೇಡ|ಕ್ಯಾನ್ಸಲ್|ರದ್ದು ಮಾಡಿ|ಇನ್ನೇನು ಬೇಡ|ಸಾಕು|ಅಷ್ಟೇ|ಮುಗಿಯಿತು)$/i,
  /^(नहीं|रद्द|गलत|वापस|कैंसिल|मत करो|हटाओ|कैंसिल करो|रद्द करो|कुछ नहीं|और नहीं|बस|काफी है|काफ़ी है|हो गया)$/i
];

const MODIFY_PATTERNS = [
  /(change|modify|change order|modify order|edit|edit order|change it)/i,
  /(ಬದಲಾಯಿಸಿ|ಬದಲಿಸಿ|ಬದಲು)/i,
  /(बदलो|बदलना है|ऑर्डर बदलो|बदल)/i
];

export const isAffirmative = (clean = '') => {
  return CONFIRM_PATTERNS.some(regex => regex.test(clean)) ||
    /^(yes|yeah|yep|sure|ok|okay|add more|one more|more|want more|confirm|proceed|correct)\b/i.test(clean) ||
    /^(ಹೌದು|ಸರಿ|ಖಚಿತಪಡಿಸಿ|ಖಚಿತ|ಸರಿಯಾಗಿದೆ|ಆಯಿತು|ಹಾ)/i.test(clean) ||
    /^(हाँ|हाँजी|हाँ जी|सही|कन्फर्म|ठीक है|हां)/i.test(clean) ||
    clean === 'yes' || clean === 'haudu' || clean === 'haan' || clean === 'sari' || clean === 'sahi';
};

export const isNegative = (clean = '') => {
  return CANCEL_PATTERNS.some(regex => regex.test(clean)) ||
    /^(no|nope|nothing|nothing else|no thanks|no more|thats all|that's all|done|finish|finished|checkout|go to cart|view cart|all done|i am done|im done|stop|cancel)\b/i.test(clean) ||
    /^(ಬೇಡ|ರದ್ದು|ತಪ್ಪು|ಮತ್ತೆ|ಇನ್ನೇನು ಬೇಡ|ಸಾಕು|ಅಷ್ಟೇ|ಮುಗಿಯಿತು)/i.test(clean) ||
    /^(नहीं|रद्द|गलत|वापस|कैंसिल|मत करो|हटाओ|कुछ नहीं|और नहीं|बस|काफी है)/i.test(clean) ||
    clean.includes('change it') || clean.includes('ಬದಲಾಯಿಸಿ') || clean.includes('ಬದಲಿಸಿ') || clean.includes('बदलो') || clean.includes('बदल') ||
    clean === 'no' || clean === 'nahi' || clean === 'beda' || clean === 'saaku' || clean === 'bas' || clean === 'kuch nahi';
};

/**
 * Classifies spoken transcript into an intent.
 * Handles stages: 'CONFIRM_ITEM', 'ASK_MORE', or general order flow.
 */
export const classifyIntent = (transcript = '', context = false) => {
  const clean = transcript.toLowerCase().trim().replace(/[.,?!।]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!clean) {
    return { type: INTENT_TYPES.UNKNOWN, text: transcript };
  }

  const stage = typeof context === 'string'
    ? context
    : (typeof context === 'object' && context !== null ? context.stage : (context ? 'CONFIRM_ITEM' : 'GENERAL'));
  const hasPendingOrder = typeof context === 'boolean' ? context : Boolean(context?.hasPendingOrder);

  // 1. In ASK_MORE stage ("Added to your order. Would you like anything else?")
  if (stage === 'ASK_MORE') {
    if (isNegative(clean)) {
      return { type: INTENT_TYPES.FINISH_ORDER, text: clean };
    }
    if (isAffirmative(clean)) {
      return { type: INTENT_TYPES.ADD_MORE, text: clean };
    }
    // If not yes/no, customer might directly speak next food item!
  }

  // 2. In CONFIRM_ITEM stage ("Shall I add it to your order?")
  if (stage === 'CONFIRM_ITEM' || hasPendingOrder) {
    if (isAffirmative(clean)) {
      return { type: INTENT_TYPES.CONFIRMATION, text: clean };
    }
    if (isNegative(clean) || clean.includes('change it')) {
      return { type: INTENT_TYPES.CANCEL, text: clean };
    }
    if (MODIFY_PATTERNS.some(regex => regex.test(clean))) {
      return { type: INTENT_TYPES.MODIFY, text: clean };
    }
  }

  // 2. Greeting & Help Checks
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

  // 5. Standalone Cancel / Confirmation when not in pending state
  if (CONFIRM_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.CONFIRMATION, text: clean };
  }
  if (CANCEL_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.CANCEL, text: clean };
  }
  if (MODIFY_PATTERNS.some(regex => regex.test(clean))) {
    return { type: INTENT_TYPES.MODIFY, text: clean };
  }

  // 6. Food Order vs Unknown Check
  const foodKeys = Object.keys(FOOD_TRANSLATIONS);
  const words = clean.split(' ');

  const hasFoodKeyword = foodKeys.some(fk => clean.includes(fk.toLowerCase()));
  const hasQuantityWord = /(one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|1|2|3|4|5|6|7|8|9|10|ಒಂದು|ಎರಡು|ಮೂರು|ನಾಲ್ಕು|ಐದು|೧|೨|೩|೪|೫|एक|दो|तीन|चार|पांच|पाँच|१|२|३|४|५)/i.test(clean);
  const hasOrderVerb = /(want|order|give|bring|get|need|take|have|ನನಗೆ|ನಮಗೆ|ಕೊಡಿ|ಆರ್ಡರ್|ಮತ್ತು|मुझे|हमे|दीजिए|लाओ|और)/i.test(clean);

  if (hasFoodKeyword || hasQuantityWord || hasOrderVerb || words.length >= 2) {
    return { type: INTENT_TYPES.FOOD_ORDER, text: clean };
  }

  return { type: INTENT_TYPES.UNKNOWN, text: clean };
};

/**
 * Get response text for a conversational intent
 */
export const getConversationalResponse = (intentType, langCode = 'en-IN') => {
  const responses = INTENT_RESPONSES[intentType] || INTENT_RESPONSES[INTENT_TYPES.UNKNOWN];
  return responses[langCode] || responses['en-IN'] || INTENT_RESPONSES[INTENT_TYPES.UNKNOWN]['en-IN'];
};
