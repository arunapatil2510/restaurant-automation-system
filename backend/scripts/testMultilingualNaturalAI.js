/**
 * Comprehensive Automated Verification Suite for Natural Multilingual Conversational AI
 * Tests natural conversational variations across Kannada, Hindi, and English:
 * - Recommendations & Menu Inquiries
 * - Dietary & Low-Spice Inquiries
 * - Contextual Alternatives & Changed Mind
 * - Relative Order Modifications ("give me one more", "remove the last item")
 * - Transliterated / Romanized code-switching (Kanglish & Hinglish)
 * - Strict Grounding against active menu items
 */

const { parseVoiceIntent } = require('../../frontend/src/services/voiceIntentService.js');
const { detectSpokenLanguage } = require('../../frontend/src/utils/languageDetector.js');
const { menuItems } = require('../../frontend/src/data/mockData.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

async function runTestSuite() {
  console.log('🧪 Starting RESTOSMART Natural Multilingual AI Automated Test Suite...\n');

  // ==========================================
  // SECTION 1: Language & Script Detection
  // ==========================================
  console.log('--- SECTION 1: Intelligent Language & Script Detection ---');
  assert(detectSpokenLanguage('ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ', 'en-IN') === 'kn-IN', 'Native Kannada script detected as kn-IN');
  assert(detectSpokenLanguage('एक मसाला डोसा दीजिए', 'en-IN') === 'hi-IN', 'Native Devanagari script detected as hi-IN');
  assert(detectSpokenLanguage('ondu masala dosa kodi', 'en-IN') === 'kn-IN', 'Romanized Kanglish detected as kn-IN');
  assert(detectSpokenLanguage('ek masala dosa dena', 'en-IN') === 'hi-IN', 'Romanized Hinglish detected as hi-IN');
  assert(detectSpokenLanguage('Two Masala Dosas please', 'kn-IN') === 'kn-IN', 'Standard English preserves selected UI locale when no marker');

  // ==========================================
  // SECTION 2: Natural Kannada Conversational Flow
  // ==========================================
  console.log('\n--- SECTION 2: Natural Kannada Conversational Flow (Native & Kanglish) ---');

  // 2A: Native Ordering
  const knOrder = await parseVoiceIntent({
    text: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ',
    language: 'kn-IN',
    menuItems
  });
  assert(knOrder.items.length === 1 && knOrder.items[0].name === 'Masala Dosa', 'KN Native: "ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ" ordered 1x Masala Dosa');

  // 2B: Romanized Kanglish Ordering
  const kanglishOrder = await parseVoiceIntent({
    text: 'ondu masala dosa kodi',
    language: 'en-IN',
    menuItems
  });
  assert(kanglishOrder.items.length === 1 && kanglishOrder.items[0].name === 'Masala Dosa', 'Kanglish: "ondu masala dosa kodi" ordered 1x Masala Dosa');

  // 2C: Low-Spice Inquiry in Kannada
  const knLowSpice = await parseVoiceIntent({
    text: 'ಸ್ವಲ್ಪ ಖಾರ ಕಮ್ಮಿ ಏನಿದೆ?',
    language: 'kn-IN',
    menuItems
  });
  assert(knLowSpice.intent === 'RECOMMENDATION', 'KN: "ಸ್ವಲ್ಪ ಖಾರ ಕಮ್ಮಿ ಏನಿದೆ?" -> RECOMMENDATION');
  assert(knLowSpice.response.length > 10, 'KN: Low spice response provides recommendations');

  // 2D: Kanglish Low-Spice Inquiry
  const kanglishLowSpice = await parseVoiceIntent({
    text: 'swalpa khara kammi enide',
    language: 'kn-IN',
    menuItems
  });
  assert(kanglishLowSpice.intent === 'RECOMMENDATION', 'Kanglish: "swalpa khara kammi enide" -> RECOMMENDATION');

  // 2E: Vegetarian Inquiry in Kannada
  const knVeg = await parseVoiceIntent({
    text: 'ವೆಜಿಟೇರಿಯನ್ ಏನಿದೆ?',
    language: 'kn-IN',
    menuItems
  });
  assert(knVeg.intent === 'RECOMMENDATION', 'KN: "ವೆಜಿಟೇರಿಯನ್ ಏನಿದೆ?" -> RECOMMENDATION');
  assert(knVeg.response.includes('ವೆಜಿಟೇರಿಯನ್') || knVeg.response.includes('Masala Dosa'), 'KN: Veg response lists vegetarian options');

  // 2F: Relative Increment in Kannada ("ಇನ್ನೊಂದು ಕೊಡಿ")
  const knOrderState = [{ name: 'Masala Dosa', quantity: 1, price: 80, subtotal: 80 }];
  const knIncrement = await parseVoiceIntent({
    text: 'ಇನ್ನೊಂದು ಕೊಡಿ',
    language: 'kn-IN',
    menuItems,
    currentOrder: knOrderState,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(knIncrement.intent === 'MODIFY_QUANTITY', 'KN: "ಇನ್ನೊಂದು ಕೊಡಿ" -> MODIFY_QUANTITY');
  assert(knIncrement.updatedOrder[0].quantity === 2, 'KN: Relative increment increased quantity from 1 to 2');

  // 2G: Relative Item Removal in Kannada ("ಕೊನೆಯ ಐಟಂ ತೆಗೆದುಹಾಕಿ")
  const knMultiOrder = [
    { name: 'Masala Dosa', quantity: 1, price: 80, subtotal: 80 },
    { name: 'South Indian Filter Coffee', quantity: 1, price: 40, subtotal: 40 }
  ];
  const knRemoveLast = await parseVoiceIntent({
    text: 'ಕೊನೆಯ ಐಟಂ ತೆಗೆದುಹಾಕಿ',
    language: 'kn-IN',
    menuItems,
    currentOrder: knMultiOrder
  });
  assert(knRemoveLast.intent === 'REMOVE_ITEM', 'KN: "ಕೊನೆಯ ಐಟಂ ತೆಗೆದುಹಾಕಿ" -> REMOVE_ITEM');
  assert(knRemoveLast.updatedOrder.length === 1 && knRemoveLast.updatedOrder[0].name === 'Masala Dosa', 'KN: Last item (Coffee) removed, Masala Dosa retained');

  // 2H: Contextual Alternatives / Changed Mind in Kannada
  const knChangeMind = await parseVoiceIntent({
    text: 'ಬದಲಿಗೆ ಬೇರೆ ಏನಾದರೂ ಕೊಡಿ',
    language: 'kn-IN',
    menuItems,
    currentOrder: knOrderState,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(knChangeMind.intent === 'MODIFY', 'KN: "ಬದಲಿಗೆ ಬೇರೆ ಏನಾದರೂ ಕೊಡಿ" -> MODIFY');
  assert(knChangeMind.response.length > 10, 'KN: Changed mind provides alternatives');

  // ==========================================
  // SECTION 3: Natural Hindi Conversational Flow
  // ==========================================
  console.log('\n--- SECTION 3: Natural Hindi Conversational Flow (Native & Hinglish) ---');

  // 3A: Native Hindi Ordering
  const hiOrder = await parseVoiceIntent({
    text: 'एक मसाला डोसा देना',
    language: 'hi-IN',
    menuItems
  });
  assert(hiOrder.items.length === 1 && hiOrder.items[0].name === 'Masala Dosa', 'HI Native: "एक मसाला डोसा देना" ordered 1x Masala Dosa');

  // 3B: Romanized Hinglish Ordering
  const hinglishOrder = await parseVoiceIntent({
    text: 'ek masala dosa dena',
    language: 'en-IN',
    menuItems
  });
  assert(hinglishOrder.items.length === 1 && hinglishOrder.items[0].name === 'Masala Dosa', 'Hinglish: "ek masala dosa dena" ordered 1x Masala Dosa');

  // 3C: Low-Spice Inquiry in Hindi
  const hiLowSpice = await parseVoiceIntent({
    text: 'कम तीखा कुछ बताओ',
    language: 'hi-IN',
    menuItems
  });
  assert(hiLowSpice.intent === 'RECOMMENDATION', 'HI: "कम तीखा कुछ बताओ" -> RECOMMENDATION');
  assert(hiLowSpice.response.includes('कम तीखे') || hiLowSpice.response.includes('सौम्य'), 'HI: Low-spice response provides gentle dishes');

  // 3D: Hinglish Low-Spice Inquiry
  const hinglishLowSpice = await parseVoiceIntent({
    text: 'kuch kam teekha batao',
    language: 'hi-IN',
    menuItems
  });
  assert(hinglishLowSpice.intent === 'RECOMMENDATION', 'Hinglish: "kuch kam teekha batao" -> RECOMMENDATION');

  // 3E: Vegetarian Inquiry in Hindi
  const hiVeg = await parseVoiceIntent({
    text: 'शाकाहारी में क्या है?',
    language: 'hi-IN',
    menuItems
  });
  assert(hiVeg.intent === 'RECOMMENDATION', 'HI: "शाकाहारी में क्या है?" -> RECOMMENDATION');
  assert(hiVeg.response.includes('शाकाहारी'), 'HI: Veg response lists vegetarian specialties');

  // 3F: Relative Increment in Hindi ("एक और दो")
  const hiOrderState = [{ name: 'Masala Dosa', quantity: 1, price: 80, subtotal: 80 }];
  const hiIncrement = await parseVoiceIntent({
    text: 'एक और दो',
    language: 'hi-IN',
    menuItems,
    currentOrder: hiOrderState,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(hiIncrement.intent === 'MODIFY_QUANTITY', 'HI: "एक और दो" -> MODIFY_QUANTITY');
  assert(hiIncrement.updatedOrder[0].quantity === 2, 'HI: Increment updated quantity from 1 to 2');

  // 3G: Relative Item Removal in Hindi ("आखिरी आइटम हटाओ")
  const hiMultiOrder = [
    { name: 'Masala Dosa', quantity: 1, price: 80, subtotal: 80 },
    { name: 'South Indian Filter Coffee', quantity: 1, price: 40, subtotal: 40 }
  ];
  const hiRemoveLast = await parseVoiceIntent({
    text: 'आखिरी आइटम हटाओ',
    language: 'hi-IN',
    menuItems,
    currentOrder: hiMultiOrder
  });
  assert(hiRemoveLast.intent === 'REMOVE_ITEM', 'HI: "आखिरी आइटम हटाओ" -> REMOVE_ITEM');
  assert(hiRemoveLast.updatedOrder.length === 1 && hiRemoveLast.updatedOrder[0].name === 'Masala Dosa', 'HI: Last item (Coffee) removed, Masala Dosa retained');

  // 3H: Contextual Alternatives / Changed Mind in Hindi
  const hiChangeMind = await parseVoiceIntent({
    text: 'कुछ और बताओ इसके बदले',
    language: 'hi-IN',
    menuItems,
    currentOrder: hiOrderState,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(hiChangeMind.intent === 'MODIFY', 'HI: "कुछ और बताओ इसके बदले" -> MODIFY');
  assert(hiChangeMind.response.length > 10, 'HI: Changed mind provides alternative options');

  // ==========================================
  // SECTION 4: Natural English Conversational Flow
  // ==========================================
  console.log('\n--- SECTION 4: Natural English Conversational Flow ---');

  // 4A: Natural Recommendations
  const enRec1 = await parseVoiceIntent({ text: 'What do you recommend?', language: 'en-IN', menuItems });
  assert(enRec1.intent === 'RECOMMENDATION', 'EN: "What do you recommend?" -> RECOMMENDATION');

  const enRec2 = await parseVoiceIntent({ text: 'What should I eat?', language: 'en-IN', menuItems });
  assert(enRec2.intent === 'RECOMMENDATION', 'EN: "What should I eat?" -> RECOMMENDATION');

  const enRec3 = await parseVoiceIntent({ text: "I'm confused. What is good here?", language: 'en-IN', menuItems });
  assert(enRec3.intent === 'RECOMMENDATION', 'EN: "I\'m confused. What is good here?" -> RECOMMENDATION');

  // 4B: Vegetarian Query
  const enVeg = await parseVoiceIntent({ text: 'Show me something vegetarian.', language: 'en-IN', menuItems });
  assert(enVeg.intent === 'RECOMMENDATION', 'EN: "Show me something vegetarian." -> RECOMMENDATION');
  assert(enVeg.response.toLowerCase().includes('vegetarian'), 'EN: Veg response mentions vegetarian options');

  // 4C: Low-Spice Query
  const enLowSpice = await parseVoiceIntent({ text: 'Do you have anything without much spice?', language: 'en-IN', menuItems });
  assert(enLowSpice.intent === 'RECOMMENDATION', 'EN: "Do you have anything without much spice?" -> RECOMMENDATION');
  assert(enLowSpice.response.toLowerCase().includes('without much spice') || enLowSpice.response.toLowerCase().includes('mild'), 'EN: Low spice response suggests mild items');

  // 4D: Relative Increment ("Give me one more")
  const enOrderState = [{ name: 'Masala Dosa', quantity: 1, price: 80, subtotal: 80 }];
  const enInc = await parseVoiceIntent({
    text: 'Give me one more.',
    language: 'en-IN',
    menuItems,
    currentOrder: enOrderState,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(enInc.intent === 'MODIFY_QUANTITY', 'EN: "Give me one more." -> MODIFY_QUANTITY');
  assert(enInc.updatedOrder[0].quantity === 2, 'EN: Increased quantity from 1 to 2');

  // 4E: Relative Removal ("Remove the last item")
  const enMultiOrder = [
    { name: 'Masala Dosa', quantity: 1, price: 80, subtotal: 80 },
    { name: 'South Indian Filter Coffee', quantity: 1, price: 40, subtotal: 40 }
  ];
  const enRemoveLast = await parseVoiceIntent({
    text: 'Remove the last item.',
    language: 'en-IN',
    menuItems,
    currentOrder: enMultiOrder
  });
  assert(enRemoveLast.intent === 'REMOVE_ITEM', 'EN: "Remove the last item." -> REMOVE_ITEM');
  assert(enRemoveLast.updatedOrder.length === 1 && enRemoveLast.updatedOrder[0].name === 'Masala Dosa', 'EN: Last item removed successfully');

  // 4F: Changed Mind / Contextual Alternative
  const enChangeMind = await parseVoiceIntent({
    text: 'I changed my mind. Can I have something else instead?',
    language: 'en-IN',
    menuItems,
    currentOrder: enOrderState,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(enChangeMind.intent === 'MODIFY', 'EN: "I changed my mind. Can I have something else instead?" -> MODIFY');

  // ==========================================
  // SECTION 5: Strict Grounding & Anti-Hallucination
  // ==========================================
  console.log('\n--- SECTION 5: Strict Grounding & Anti-Hallucination ---');
  const offMenu = await parseVoiceIntent({
    text: 'I want two Pizzas and a Burger.',
    language: 'en-IN',
    menuItems
  });
  assert(offMenu.items.length === 0, 'Off-menu items produce 0 verified order items');
  assert(offMenu.unrecognizedItems.length > 0, 'Off-menu items flagged in unrecognizedItems');

  console.log('\n========================================================');
  console.log(`Test Suite Finished: ${passedTests} passed, ${failedTests} failed out of ${totalTests} tests`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

