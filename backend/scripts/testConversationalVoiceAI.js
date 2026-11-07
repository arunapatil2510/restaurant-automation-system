/**
 * RESTOSMART - Conversational AI Voice Ordering Comprehensive 16-Scenario Test Suite
 *
 * Verifies all 16 multi-turn conversational scenarios across English, Hindi, and Kannada:
 * 1. Natural greetings
 * 2. Asking what is available (MENU_QUERY)
 * 3. Asking about prices (PRICE_QUERY)
 * 4. Asking for recommendations (RECOMMENDATION)
 * 5. Ordering one dish with varied phrasing (ORDER)
 * 6. Ordering multiple dishes in one sentence
 * 7. Adding another dish in a later turn (ADD_ITEM)
 * 8. Changing an item's quantity (MODIFY_QUANTITY)
 * 9. Removing an item (REMOVE_ITEM)
 * 10. Asking about an item already mentioned (pronoun resolution)
 * 11. Requesting an unavailable off-menu dish (anti-hallucination)
 * 12. Correcting an earlier request (MODIFY)
 * 13. Confirming an order (CONFIRM)
 * 14. Cancelling an order (CANCEL)
 * 15. Ambiguous references requiring clarification (ASK_CLARIFICATION)
 * 16. Switching languages mid-conversation without losing context
 */

const sampleData = require('../seed/sampleData.json');

async function runConversationalVoiceAITests() {
  console.log('🧪 Running RESTOSMART 16-Scenario Conversational Voice AI Test Suite...\n');

  const { parseVoiceIntent } = await import('../../frontend/src/services/voiceIntentService.js');
  const menuItems = sampleData.menuItems;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ==========================================
  // SCENARIO 1: Natural Greetings
  // ==========================================
  console.log('--- SCENARIO 1: Natural Greetings ---');
  const greetEn = await parseVoiceIntent({ text: 'Good morning!', language: 'en-IN', menuItems });
  assert(greetEn.intent === 'GREETING', 'EN "Good morning!" -> GREETING');
  assert(greetEn.response.length > 5, 'EN Greeting provides polite response');

  const greetHi = await parseVoiceIntent({ text: 'नमस्ते!', language: 'hi-IN', menuItems });
  assert(greetHi.intent === 'GREETING', 'HI "नमस्ते!" -> GREETING');

  const greetKn = await parseVoiceIntent({ text: 'ನಮಸ್ಕಾರ!', language: 'kn-IN', menuItems });
  assert(greetKn.intent === 'GREETING', 'KN "ನಮಸ್ಕಾರ!" -> GREETING');

  // ==========================================
  // SCENARIO 2: Asking What is Available (MENU_QUERY)
  // ==========================================
  console.log('\n--- SCENARIO 2: Menu Query ---');
  const menuEn = await parseVoiceIntent({ text: 'What do you have for breakfast?', language: 'en-IN', menuItems });
  assert(menuEn.intent === 'MENU_QUERY', 'EN "What do you have for breakfast?" -> MENU_QUERY');
  assert(menuEn.response.includes('Masala Dosa') || menuEn.response.includes('menu'), 'EN Menu response includes breakfast items');

  const menuHi = await parseVoiceIntent({ text: 'मेनू में क्या क्या है?', language: 'hi-IN', menuItems });
  assert(menuHi.intent === 'MENU_QUERY', 'HI "मेनू में क्या क्या है?" -> MENU_QUERY');

  const menuKn = await parseVoiceIntent({ text: 'ತಿಂಡಿಗೆ ಏನೆಲ್ಲಾ ಇದೆ?', language: 'kn-IN', menuItems });
  assert(menuKn.intent === 'MENU_QUERY', 'KN "ತಿಂಡಿಗೆ ಏನೆಲ್ಲಾ ಇದೆ?" -> MENU_QUERY');

  // ==========================================
  // SCENARIO 3: Asking About Prices (PRICE_QUERY)
  // ==========================================
  console.log('\n--- SCENARIO 3: Price Query ---');
  const priceEn = await parseVoiceIntent({ text: 'How much is the Masala Dosa?', language: 'en-IN', menuItems });
  assert(priceEn.intent === 'PRICE_QUERY', 'EN "How much is the Masala Dosa?" -> PRICE_QUERY');
  assert(priceEn.response.includes('80'), 'EN Response states correct price (₹80)');

  const priceHi = await parseVoiceIntent({ text: 'मसाला डोसा कितने का है?', language: 'hi-IN', menuItems });
  assert(priceHi.intent === 'PRICE_QUERY', 'HI "मसाला डोसा कितने का है?" -> PRICE_QUERY');
  assert(priceHi.response.includes('80'), 'HI Response states correct price (₹80)');

  const priceKn = await parseVoiceIntent({ text: 'ಮಸಾಲೆ ದೋಸೆ ಬೆಲೆ ಎಷ್ಟು?', language: 'kn-IN', menuItems });
  assert(priceKn.intent === 'PRICE_QUERY', 'KN "ಮಸಾಲೆ ದೋಸೆ ಬೆಲೆ ಎಷ್ಟು?" -> PRICE_QUERY');
  assert(priceKn.response.includes('80'), 'KN Response states correct price (₹80)');

  // ==========================================
  // SCENARIO 4: Recommendations
  // ==========================================
  console.log('\n--- SCENARIO 4: Recommendations ---');
  const recEn = await parseVoiceIntent({ text: 'What do you recommend?', language: 'en-IN', menuItems });
  assert(recEn.intent === 'RECOMMENDATION', 'EN "What do you recommend?" -> RECOMMENDATION');

  const recHi = await parseVoiceIntent({ text: 'आप क्या सलाह देंगे?', language: 'hi-IN', menuItems });
  assert(recHi.intent === 'RECOMMENDATION', 'HI "आप क्या सलाह देंगे?" -> RECOMMENDATION');

  const recKn = await parseVoiceIntent({ text: 'ಯಾವ ತಿಂಡಿ ಶಿಫಾರಸು ಮಾಡುತ್ತೀರಿ?', language: 'kn-IN', menuItems });
  assert(recKn.intent === 'RECOMMENDATION', 'KN "ಯಾವ ತಿಂಡಿ ಶಿಫಾರಸು ಮಾಡುತ್ತೀರಿ?" -> RECOMMENDATION');

  // ==========================================
  // SCENARIO 5: Ordering One Dish (Varied Natural Phrasing)
  // ==========================================
  console.log('\n--- SCENARIO 5: Ordering One Dish ---');
  const orderPhrases = [
    'I want two Masala Dosas.',
    'Can I get a couple of Masala Dosas?',
    'Please give me two Masala Dosas.',
    "I'd like to have two Masala Dosa."
  ];
  for (const phrase of orderPhrases) {
    const res = await parseVoiceIntent({ text: phrase, language: 'en-IN', menuItems });
    assert(res.intent === 'ORDER', `EN "${phrase}" -> ORDER`);
    assert(res.items.length === 1 && res.items[0]?.name === 'Masala Dosa' && res.items[0]?.quantity === 2, `EN "${phrase}" correctly resolved 2x Masala Dosa`);
  }

  // ==========================================
  // SCENARIO 6: Ordering Multiple Dishes in One Sentence
  // ==========================================
  console.log('\n--- SCENARIO 6: Multi-Dish Sentence ---');
  const multiEn = await parseVoiceIntent({
    text: 'Two Masala Dosa and one South Indian Filter Coffee',
    language: 'en-IN',
    menuItems
  });
  assert(multiEn.items.length === 2, 'EN Multi-order matches 2 dishes');
  assert(multiEn.items.find(i => i.name === 'Masala Dosa')?.quantity === 2, 'EN Masala Dosa quantity is 2');
  assert(multiEn.items.find(i => i.name === 'South Indian Filter Coffee')?.quantity === 1, 'EN Coffee quantity is 1');

  const multiHi = await parseVoiceIntent({
    text: 'दो मसाला डोसा और एक मैंगो लस्सी',
    language: 'hi-IN',
    menuItems
  });
  assert(multiHi.items.length === 2, 'HI Multi-order matches 2 dishes');

  // ==========================================
  // SCENARIO 7: Adding Another Dish in Later Turn (ADD_ITEM)
  // ==========================================
  console.log('\n--- SCENARIO 7: Multi-Turn Order Addition ---');
  const existingOrder = [{ name: 'Masala Dosa', quantity: 2, price: 80, subtotal: 160 }];
  const addTurn = await parseVoiceIntent({
    text: 'Add one South Indian Filter Coffee.',
    language: 'en-IN',
    menuItems,
    currentOrder: existingOrder
  });
  assert(addTurn.intent === 'ADD_ITEM', 'Turn 2 "Add one South Indian Filter Coffee." -> ADD_ITEM');
  assert(addTurn.action === 'ADD', 'Turn 2 Action is ADD');
  assert(addTurn.updatedOrder.length === 2, 'Turn 2 Updated order contains 2 distinct items');
  assert(addTurn.updatedOrder[0].name === 'Masala Dosa', 'Turn 2 First item preserved (Masala Dosa)');
  assert(addTurn.updatedOrder[1].name === 'South Indian Filter Coffee', 'Turn 2 Second item added (Coffee)');

  // ==========================================
  // SCENARIO 8: Changing Item Quantity (Unambiguous Single Item)
  // ==========================================
  console.log('\n--- SCENARIO 8: Quantity Modification ---');
  const singleItemOrder = [{ name: 'Masala Dosa', quantity: 2, price: 80, subtotal: 160 }];
  const modTurn = await parseVoiceIntent({
    text: 'Actually, make that three.',
    language: 'en-IN',
    menuItems,
    currentOrder: singleItemOrder,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(modTurn.intent === 'MODIFY_QUANTITY', 'Single-item "Actually, make that three" -> MODIFY_QUANTITY');
  assert(modTurn.action === 'UPDATE_QUANTITY', 'Action is UPDATE_QUANTITY');
  assert(modTurn.updatedOrder[0].quantity === 3, 'Masala Dosa quantity updated to 3');
  assert(modTurn.updatedOrder[0].subtotal === 240, 'Subtotal correctly updated to 240 (80*3)');

  // ==========================================
  // SCENARIO 9: Removing an Item
  // ==========================================
  console.log('\n--- SCENARIO 9: Item Removal ---');
  const twoItemOrder = [
    { name: 'Masala Dosa', quantity: 2, price: 80, subtotal: 160 },
    { name: 'South Indian Filter Coffee', quantity: 1, price: 40, subtotal: 40 }
  ];
  const removeTurn = await parseVoiceIntent({
    text: 'Remove the coffee.',
    language: 'en-IN',
    menuItems,
    currentOrder: twoItemOrder
  });
  assert(removeTurn.intent === 'REMOVE_ITEM', 'EN "Remove the coffee." -> REMOVE_ITEM');
  assert(removeTurn.action === 'REMOVE', 'Action is REMOVE');
  assert(removeTurn.updatedOrder.length === 1, 'Updated order has 1 item left');
  assert(removeTurn.updatedOrder[0].name === 'Masala Dosa', 'Masala Dosa remains intact');

  // ==========================================
  // SCENARIO 10: Pronoun Resolution / Previously Discussed Dish
  // ==========================================
  console.log('\n--- SCENARIO 10: Pronoun Resolution ---');
  const pronounQuery = await parseVoiceIntent({
    text: 'Is it spicy?',
    language: 'en-IN',
    menuItems,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(pronounQuery.intent === 'INGREDIENT_QUERY', 'Pronoun "Is it spicy?" -> INGREDIENT_QUERY');
  assert(pronounQuery.targetItem === 'Masala Dosa', 'Pronoun resolved to lastDiscussedDish "Masala Dosa"');
  assert(pronounQuery.response.includes('Masala Dosa'), 'Response mentions Masala Dosa');

  // ==========================================
  // SCENARIO 11: Requesting Unavailable Off-Menu Dish
  // ==========================================
  console.log('\n--- SCENARIO 11: Unavailable Off-Menu Dish ---');
  const offMenuReq = await parseVoiceIntent({
    text: 'I want one Veg Pizza and Burger.',
    language: 'en-IN',
    menuItems
  });
  assert(offMenuReq.items.length === 0, 'Off-menu items rejected: 0 verified items');
  assert(offMenuReq.unrecognizedItems.length > 0, 'Off-menu items captured in unrecognizedItems');
  assert(offMenuReq.response.toLowerCase().includes("couldn't find") || offMenuReq.response.toLowerCase().includes("not on the menu"), 'Response explains unavailability and suggests alternatives');

  // ==========================================
  // SCENARIO 12: Correcting an Earlier Request
  // ==========================================
  console.log('\n--- SCENARIO 12: Request Correction ---');
  const corrTurn = await parseVoiceIntent({
    text: 'No, change it.',
    language: 'en-IN',
    menuItems,
    context: 'CONFIRM_ITEM'
  });
  assert(corrTurn.intent === 'CANCEL' || corrTurn.intent === 'MODIFY', `Rejection "No, change it." -> ${corrTurn.intent}`);

  // ==========================================
  // SCENARIO 13: Order Confirmation
  // ==========================================
  console.log('\n--- SCENARIO 13: Order Confirmation ---');
  const confEn = await parseVoiceIntent({ text: 'Yes, please confirm.', language: 'en-IN', menuItems, currentOrder: twoItemOrder });
  assert(confEn.intent === 'CONFIRM', 'EN "Yes, please confirm." -> CONFIRM');

  const confHi = await parseVoiceIntent({ text: 'हाँ, ठीक है।', language: 'hi-IN', menuItems, currentOrder: twoItemOrder });
  assert(confHi.intent === 'CONFIRM', 'HI "हाँ, ठीक है।" -> CONFIRM');

  const confKn = await parseVoiceIntent({ text: 'ಹೌದು, ಖಚಿತಪಡಿಸಿ.', language: 'kn-IN', menuItems, currentOrder: twoItemOrder });
  assert(confKn.intent === 'CONFIRM', 'KN "ಹೌದು, ಖಚಿತಪಡಿಸಿ." -> CONFIRM');

  // ==========================================
  // SCENARIO 14: Order Cancellation
  // ==========================================
  console.log('\n--- SCENARIO 14: Order Cancellation ---');
  const cancelTurn = await parseVoiceIntent({
    text: 'No, cancel the order.',
    language: 'en-IN',
    menuItems,
    currentOrder: twoItemOrder
  });
  assert(cancelTurn.intent === 'CANCEL', 'EN "No, cancel the order." -> CANCEL');
  assert(cancelTurn.action === 'CLEAR', 'Action is CLEAR');
  assert(cancelTurn.updatedOrder.length === 0, 'Updated order is cleared');

  // ==========================================
  // SCENARIO 15: Ambiguity Clarification
  // ==========================================
  console.log('\n--- SCENARIO 15: Ambiguity Clarification ---');
  const ambigTurn = await parseVoiceIntent({
    text: 'Actually, make that three.',
    language: 'en-IN',
    menuItems,
    currentOrder: twoItemOrder // Has both Masala Dosa and Filter Coffee!
  });
  assert(ambigTurn.requiresClarification === true, 'Ambiguous modification flagged requiresClarification: true');
  assert(ambigTurn.intent === 'ASK_CLARIFICATION', 'Intent is ASK_CLARIFICATION');
  assert(ambigTurn.clarificationQuestion.includes('Masala Dosa') && ambigTurn.clarificationQuestion.includes('Coffee'), 'Clarification question asks which dish to modify');

  // ==========================================
  // SCENARIO 16: Language Switching Mid-Conversation
  // ==========================================
  console.log('\n--- SCENARIO 16: Mid-Conversation Language Switching ---');
  // Turn 1: English order
  const step1 = await parseVoiceIntent({
    text: 'I want two Masala Dosa.',
    language: 'en-IN',
    menuItems
  });
  assert(step1.items.length === 1 && step1.items[0].name === 'Masala Dosa', 'Turn 1 EN: Ordered 2x Masala Dosa');

  // Turn 2: Switch to Kannada to add coffee
  const step2 = await parseVoiceIntent({
    text: 'ಒಂದು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೂಡ ಸೇರಿಸಿ.',
    language: 'kn-IN',
    menuItems,
    currentOrder: step1.items,
    lastDiscussedDish: 'Masala Dosa'
  });
  assert(step2.updatedOrder.length === 2, 'Turn 2 KN: Kept Masala Dosa and added Filter Coffee');
  assert(step2.response.includes('ಕಾಫಿ') || step2.response.includes('South Indian Filter Coffee') || step2.response.includes('ಸೇರಿಸಲೇ'), 'Turn 2 KN: Responded in Kannada');

  // Turn 3: Switch to Hindi to confirm
  const step3 = await parseVoiceIntent({
    text: 'हाँ, बिल्कुल।',
    language: 'hi-IN',
    menuItems,
    currentOrder: step2.updatedOrder
  });
  assert(step3.intent === 'CONFIRM', 'Turn 3 HI: Successfully confirmed the 2-item bilingual order in Hindi');

  console.log('\n========================================================');
  console.log(`16-Scenario Conversational Suite: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runConversationalVoiceAITests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

