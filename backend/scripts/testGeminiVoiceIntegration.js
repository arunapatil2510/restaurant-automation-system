const sampleData = require('../seed/sampleData.json');

async function runGeminiVoiceIntegrationTests() {
  console.log('🧪 Running RESTOSMART Phase 4 Multilingual Voice Integration Test Suite...\n');

  const {
    parseVoiceIntent,
    groundDishesWithActiveMenu,
    executeLocalFallback
  } = await import('../../frontend/src/services/voiceIntentService.js');

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

  // --- ENGLISH TESTS ---
  console.log('--- 1. ENGLISH TEST CASES ---');

  // 1A. "I want two Masala Dosa."
  const enOrder1 = await parseVoiceIntent({
    text: 'I want two Masala Dosa.',
    language: 'en-IN',
    menuItems
  });
  assert(enOrder1.intent === 'ORDER', 'EN "I want two Masala Dosa." -> Intent ORDER');
  assert(enOrder1.items.length === 1, 'EN Matched exactly 1 dish');
  assert(enOrder1.items[0]?.name === 'Masala Dosa', 'EN Matched dish is Masala Dosa');
  assert(enOrder1.items[0]?.quantity === 2, 'EN Quantity is 2');
  assert(Boolean(enOrder1.items[0]?.dish), 'EN Full dish object is attached');
  assert(enOrder1.items[0]?.subtotal === 160, 'EN Subtotal is 160 (80*2)');

  // 1B. "Add one Mango Lassi."
  const enOrder2 = await parseVoiceIntent({
    text: 'Add one Mango Lassi.',
    language: 'en-IN',
    menuItems
  });
  assert(enOrder2.intent === 'ORDER', 'EN "Add one Mango Lassi." -> Intent ORDER');
  assert(enOrder2.items.length === 1, 'EN Matched 1 dish');
  assert(enOrder2.items[0]?.name === 'Mango Lassi', 'EN Matched dish is Mango Lassi');
  assert(enOrder2.items[0]?.quantity === 1, 'EN Quantity is 1');

  // 1C. "No, change it."
  const enReject = await parseVoiceIntent({
    text: 'No, change it.',
    language: 'en-IN',
    menuItems,
    context: 'CONFIRM_ITEM'
  });
  assert(enReject.intent === 'CANCEL' || enReject.intent === 'MODIFY', `EN "No, change it." -> Rejection/Modification (${enReject.intent})`);

  // 1D. "That's all."
  const enFinish = await parseVoiceIntent({
    text: "That's all.",
    language: 'en-IN',
    menuItems,
    context: 'ASK_MORE'
  });
  assert(enFinish.intent === 'FINISH_ORDER' || enFinish.intent === 'CANCEL', `EN "That's all." -> FINISH_ORDER (${enFinish.intent})`);

  // --- HINDI TESTS ---
  console.log('\n--- 2. HINDI TEST CASES ---');

  // 2A. "मुझे दो मसाला डोसा चाहिए।"
  const hiOrder1 = await parseVoiceIntent({
    text: 'मुझे दो मसाला डोसा चाहिए।',
    language: 'hi-IN',
    menuItems
  });
  assert(hiOrder1.intent === 'ORDER', 'HI "मुझे दो मसाला डोसा चाहिए।" -> Intent ORDER');
  assert(hiOrder1.items.length === 1, 'HI Matched 1 dish');
  assert(hiOrder1.items[0]?.name === 'Masala Dosa', 'HI Matched dish is Masala Dosa');
  assert(hiOrder1.items[0]?.quantity === 2, 'HI Quantity is 2');
  assert(Boolean(hiOrder1.items[0]?.dish), 'HI Dish object grounded to active menu');

  // 2B. "एक मैंगो लस्सी भी जोड़ें।"
  const hiOrder2 = await parseVoiceIntent({
    text: 'एक मैंगो लस्सी भी जोड़ें।',
    language: 'hi-IN',
    menuItems
  });
  assert(hiOrder2.intent === 'ORDER', 'HI "एक मैंगो लस्सी भी जोड़ें।" -> Intent ORDER');
  assert(hiOrder2.items.length === 1, 'HI Matched Mango Lassi');
  assert(hiOrder2.items[0]?.name === 'Mango Lassi', 'HI Dish is Mango Lassi');
  assert(hiOrder2.items[0]?.quantity === 1, 'HI Quantity is 1');

  // 2C. "नहीं, इसे बदल दो।"
  const hiReject = await parseVoiceIntent({
    text: 'नहीं, इसे बदल दो।',
    language: 'hi-IN',
    menuItems,
    context: 'CONFIRM_ITEM'
  });
  assert(hiReject.intent === 'CANCEL' || hiReject.intent === 'MODIFY', `HI "नहीं, इसे बदल दो।" -> Rejection (${hiReject.intent})`);

  // --- KANNADA TESTS ---
  console.log('\n--- 3. KANNADA TEST CASES ---');

  // 3A. "ನನಗೆ ಎರಡು ಮಸಾಲೆ ದೋಸೆ ಬೇಕು."
  const knOrder1 = await parseVoiceIntent({
    text: 'ನನಗೆ ಎರಡು ಮಸಾಲೆ ದೋಸೆ ಬೇಕು.',
    language: 'kn-IN',
    menuItems
  });
  assert(knOrder1.intent === 'ORDER', 'KN "ನನಗೆ ಎರಡು ಮಸಾಲೆ ದೋಸೆ ಬೇಕು." -> Intent ORDER');
  assert(knOrder1.items.length === 1, 'KN Matched 1 dish');
  assert(knOrder1.items[0]?.name === 'Masala Dosa', 'KN Dish is Masala Dosa');
  assert(knOrder1.items[0]?.quantity === 2, 'KN Quantity is 2');

  // 3B. "ಒಂದು ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ ಕೂಡ ಸೇರಿಸಿ."
  const knOrder2 = await parseVoiceIntent({
    text: 'ಒಂದು ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ ಕೂಡ ಸೇರಿಸಿ.',
    language: 'kn-IN',
    menuItems
  });
  assert(knOrder2.intent === 'ORDER', 'KN "ಒಂದು ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ ಕೂಡ ಸೇರಿಸಿ." -> Intent ORDER');
  assert(knOrder2.items.length === 1, 'KN Matched Mango Lassi');
  assert(knOrder2.items[0]?.name === 'Mango Lassi', 'KN Dish is Mango Lassi');
  assert(knOrder2.items[0]?.quantity === 1, 'KN Quantity is 1');

  // 3C. "ಬೇಡ, ಅದನ್ನು ಬದಲಾಯಿಸಿ."
  const knReject = await parseVoiceIntent({
    text: 'ಬೇಡ, ಅದನ್ನು ಬದಲಾಯಿಸಿ.',
    language: 'kn-IN',
    menuItems,
    context: 'CONFIRM_ITEM'
  });
  assert(knReject.intent === 'CANCEL' || knReject.intent === 'MODIFY', `KN "ಬೇಡ, ಅದನ್ನು ಬದಲಾಯಿಸಿ." -> Rejection (${knReject.intent})`);

  // --- EDGE CASES ---
  console.log('\n--- 4. EDGE CASE TESTS ---');

  // 4A. Dish that does not exist in the menu ("One Veg Pizza")
  const offMenu = await parseVoiceIntent({
    text: 'I want one Veg Pizza and Burger.',
    language: 'en-IN',
    menuItems
  });
  assert(offMenu.items.length === 0, 'Off-menu items are NEVER placed into verified items');
  assert(offMenu.unrecognizedItems.length > 0, 'Off-menu items recorded in unrecognizedItems');
  assert(offMenu.response.toLowerCase().includes("couldn't find") || offMenu.response.toLowerCase().includes("not on the menu") || offMenu.response.includes("ಮೆನುವಿನಲ್ಲಿ") || offMenu.response.includes("उपलब्ध नहीं"), 'Response politely informs off-menu status');

  // 4B. Gibberish / unrecognized input
  const gibberish = await parseVoiceIntent({
    text: 'xyzqwerty foo bar baz 12345',
    language: 'en-IN',
    menuItems
  });
  assert(gibberish.items.length === 0, 'Gibberish produces 0 verified items');
  assert(gibberish.intent === 'UNKNOWN' || gibberish.items.length === 0, 'Gibberish treated as UNKNOWN or 0 items');

  // 4C. Empty transcript
  const empty = await parseVoiceIntent({
    text: '   ',
    language: 'en-IN',
    menuItems
  });
  assert(empty.success === false || empty.items.length === 0, 'Empty transcript handled safely without crashing');

  // 4D. Backend unavailable / timeout fallback simulation
  const forcedFallback = executeLocalFallback({
    text: 'two masala dosa and one coffee',
    language: 'en-IN',
    menuItems,
    context: 'GENERAL'
  });
  assert(forcedFallback.isFallback === true, 'Local fallback sets isFallback: true');
  assert(forcedFallback.items.length === 2, 'Local fallback matches both dishes');
  assert(forcedFallback.items[0]?.dish && forcedFallback.items[1]?.dish, 'Local fallback attaches dish objects');

  // 4E. Multi-item ordering ("Two Masala Dosa and one Mango Lassi")
  const multiOrder = await parseVoiceIntent({
    text: 'Two Masala Dosa and one Mango Lassi',
    language: 'en-IN',
    menuItems
  });
  assert(multiOrder.intent === 'ORDER', 'Multi-item intent is ORDER');
  assert(multiOrder.items.length === 2, 'Multi-item matched 2 dishes');
  const d1 = multiOrder.items.find(i => i.name === 'Masala Dosa');
  const d2 = multiOrder.items.find(i => i.name === 'Mango Lassi');
  assert(d1?.quantity === 2, 'First dish has quantity 2');
  assert(d2?.quantity === 1, 'Second dish has quantity 1');

  // 4F. Anti-Hallucination Grounding validation
  const testHallucination = [
    { name: 'Phantom Burger', menuItemId: 'fake-id-123', quantity: 2, price: 999 },
    { name: 'Masala Dosa', menuItemId: '6724b0c2d3080e77d2a89012', quantity: 1, price: 80 }
  ];
  const { verifiedItems, ungroundedItems } = groundDishesWithActiveMenu(testHallucination, menuItems);
  assert(verifiedItems.length === 1, 'Only genuine active menu item passed grounding');
  assert(verifiedItems[0].name === 'Masala Dosa', 'Verified item is genuine Masala Dosa');
  assert(ungroundedItems.includes('Phantom Burger'), 'Phantom dish rejected and placed in ungroundedItems');

  console.log('\n========================================================');
  console.log(`Integration Test Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGeminiVoiceIntegrationTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
