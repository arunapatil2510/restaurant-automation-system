const sampleData = require('../seed/sampleData.json');

async function runVoiceVerification() {
  console.log('🧪 Running Complete RESTOSMART AI Voice Ordering Verification Suite...\n');

  const { matchVoiceOrderWithMenu, segmentTranscript, cleanTranscript } = await import('../../frontend/src/utils/voiceParser.js');
  const { classifyIntent, INTENT_TYPES } = await import('../../frontend/src/utils/intentClassifier.js');
  const {
    formatOrderConfirmationPrompt,
    formatUnknownItemPrompt,
    getQuantityWord,
    isConfirmationVoiceCommand,
    isCancelVoiceCommand
  } = await import('../../frontend/src/utils/multilingualVoiceEngine.js');

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

  // TEST 1: Exact "I want one Masala Dosa" -> Single Item Match & Quantity & Spoken Confirmation
  console.log('--- TEST 1: Single Item "I want one Masala Dosa" ---');
  const input1 = 'I want one Masala Dosa';
  const intent1 = classifyIntent(input1, false);
  assert(intent1.type === INTENT_TYPES.FOOD_ORDER, 'Intent is FOOD_ORDER');

  const match1 = matchVoiceOrderWithMenu(input1, menuItems, 'en-IN');
  assert(match1.matchedItems.length === 1, 'Matched exactly 1 item');
  assert(match1.matchedItems[0].dish.name === 'Masala Dosa', 'Matched dish is Masala Dosa');
  assert(match1.matchedItems[0].quantity === 1, 'Quantity is 1');

  const prompt1 = formatOrderConfirmationPrompt(match1.matchedItems, 'en-IN');
  assert(
    prompt1 === 'You want one Masala Dosa. Shall I add it to your order?',
    `Spoken prompt matches requirement: "${prompt1}"`
  );

  // TEST 2: Quantity word conversion
  console.log('\n--- TEST 2: Quantity Word Generation ---');
  assert(getQuantityWord(1, 'en-IN') === 'one', 'English: 1 -> one');
  assert(getQuantityWord(2, 'en-IN') === 'two', 'English: 2 -> two');
  assert(getQuantityWord(1, 'kn-IN') === 'ಒಂದು', 'Kannada: 1 -> ಒಂದು');
  assert(getQuantityWord(2, 'kn-IN') === 'ಎರಡು', 'Kannada: 2 -> ಎರಡು');
  assert(getQuantityWord(1, 'hi-IN') === 'एक', 'Hindi: 1 -> एक');
  assert(getQuantityWord(2, 'hi-IN') === 'दो', 'Hindi: 2 -> दो');

  // TEST 3: Multi-item Voice Ordering ("one butter naan and one dal tadka")
  console.log('\n--- TEST 3: Multi-Item Ordering ---');
  const input3 = 'one butter naan and one dal tadka';
  const match3 = matchVoiceOrderWithMenu(input3, menuItems, 'en-IN');
  assert(match3.matchedItems.length === 2, 'Matched 2 distinct dishes');
  assert(match3.matchedItems[0].dish.name === 'Butter Naan' && match3.matchedItems[0].quantity === 1, 'Item 1 is 1x Butter Naan');
  assert(match3.matchedItems[1].dish.name === 'Dal Tadka' && match3.matchedItems[1].quantity === 1, 'Item 2 is 1x Dal Tadka');
  const prompt3 = formatOrderConfirmationPrompt(match3.matchedItems, 'en-IN');
  assert(
    prompt3 === 'You want one Butter Naan and one Dal Tadka. Shall I add them to your order?',
    `Multi-item prompt matches: "${prompt3}"`
  );

  // TEST 4: Multilingual Voice Ordering (Kannada & Hindi)
  console.log('\n--- TEST 4: Multilingual Voice Ordering ---');
  const inputKn = 'ಒಂದು ಮಸಾಲ ದೋಸೆ';
  const matchKn = matchVoiceOrderWithMenu(inputKn, menuItems, 'kn-IN');
  assert(matchKn.matchedItems.length === 1 && matchKn.matchedItems[0].dish.name === 'Masala Dosa', 'Kannada matched Masala Dosa');
  const promptKn = formatOrderConfirmationPrompt(matchKn.matchedItems, 'kn-IN');
  assert(promptKn.includes('Masala Dosa') && promptKn.includes('ಒಂದು'), `Kannada prompt formatted: "${promptKn}"`);

  const inputHi = 'दो मसाला डोसा';
  const matchHi = matchVoiceOrderWithMenu(inputHi, menuItems, 'hi-IN');
  assert(matchHi.matchedItems.length === 1 && matchHi.matchedItems[0].quantity === 2, 'Hindi matched 2x Masala Dosa');
  const promptHi = formatOrderConfirmationPrompt(matchHi.matchedItems, 'hi-IN');
  assert(promptHi.includes('Masala Dosa') && promptHi.includes('दो'), `Hindi prompt formatted: "${promptHi}"`);

  // TEST 5: Confirmation Intent Classification
  console.log('\n--- TEST 5: Voice Confirmation Responses (Yes/Confirm) ---');
  const yesPhrases = ['yes', 'confirm', 'okay', 'haan', 'haudu', 'sari', 'sahi', 'sure', 'yes please', 'add it', 'correct'];
  for (const phrase of yesPhrases) {
    const res = classifyIntent(phrase, true);
    assert(res.type === INTENT_TYPES.CONFIRMATION, `"${phrase}" with pending order -> CONFIRMATION`);
  }

  // TEST 6: Rejection / Cancellation Intent Classification
  console.log('\n--- TEST 6: Voice Cancellation Responses (No/Cancel) ---');
  const noPhrases = ['no', 'cancel', 'nahi', 'beda', 'change it', 'clear', 'wrong'];
  for (const phrase of noPhrases) {
    const res = classifyIntent(phrase, true);
    assert(res.type === INTENT_TYPES.CANCEL, `"${phrase}" with pending order -> CANCEL`);
  }

  // TEST 7: Anti-Hallucination on Unknown Food
  console.log('\n--- TEST 7: Anti-Hallucination & Unknown Dishes ---');
  const unknownInput = 'one pizza pepperoni';
  const matchUnknown = matchVoiceOrderWithMenu(unknownInput, menuItems, 'en-IN');
  assert(matchUnknown.matchedItems.length === 0, 'Unknown item produces 0 matched items');
  assert(matchUnknown.unrecognizedItems.length === 1, 'Unknown item recorded in unrecognizedItems');

  console.log(`\n========================================================`);
  console.log(`Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVoiceVerification();
