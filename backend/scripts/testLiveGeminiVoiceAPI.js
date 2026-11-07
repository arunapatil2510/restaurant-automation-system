require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sampleData = require('../seed/sampleData.json');
const { GoogleGenAI } = require('@google/genai');

async function testLiveGeminiVoiceAPI() {
  console.log('================================================================');
  console.log('ðŸ¤– RESTOSMART LIVE GEMINI 2.5 FLASH VOICE NLU TEST SUITE');
  console.log('================================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini') || apiKey.length < 15;

  if (isPlaceholder) {
    console.warn('âš ï¸  NOTICE: GEMINI_API_KEY in backend/.env is still set to placeholder.');
    console.warn('   Please paste your Google AI Studio API key into backend/.env first:');
    console.warn('   GEMINI_API_KEY=AIzaSy...\n');
    process.exit(1);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  console.log(`âœ“ API Key detected (length: ${apiKey.length} characters)`);
  console.log(`âœ“ Model: ${modelName}\n`);

  const menuItems = sampleData.menuItems;
  const menuContext = menuItems.map(m =>
    `- "${m.name}" (ID: ${m._id || m.id}, Price: â‚¹${m.price}, Category: ${m.categorySlug}, Type: ${m.type}, Special: ${m.isSpecial ? 'Yes' : 'No'}, Tags: ${m.dietaryTags?.join(', ') || 'none'}, Ingredients: ${m.ingredients?.join(', ') || 'none'})`
  ).join('\n');

  const systemPrompt = `You are the AI Voice Ordering Assistant for RESTOSMART, an intelligent self-service restaurant kiosk.
Your job is to analyze spoken transcripts in English, Kannada (à²•à²¨à³à²¨à²¡), or Hindi (à¤¹à¤¿à¤¨à¥à¤¦à¥€), classify the customer's intent, extract ordered dishes strictly matching the active menu, and formulate clear confirmation responses.

ACTIVE RESTAURANT MENU (GROUND TRUTH):
${menuContext}

INTENT DEFINITIONS:
- "ORDER": Customer expresses an intention to order dishes or beverages.
- "CONFIRM": Customer confirms detected order (e.g. "yes", "confirm", "correct", "proceed", "à²¹à³Œà²¦à³", "à²¸à²°à²¿", "à¤¹à¤¾à¤", "à¤•à¤¨à¥à¤«à¤°à¥à¤®").
- "CANCEL": Customer cancels order (e.g. "no", "cancel", "stop", "à²¬à³‡à²¡", "à¤¨à¤¹à¥€à¤‚").
- "MODIFY": Customer wants to change or edit dishes (e.g. "change it", "no change", "modify", "à²¬à²¦à²²à²¾à²¯à²¿à²¸à²¿", "à²¬à²¦à²²à³‹").
- "RECOMMENDATION": Customer asks for dish suggestions, chef specials, bestsellers, spicy/mild food, or dietary advice.
- "MENU_QUERY": Customer asks about what is on the menu, categories, pricing, or ingredients.
- "HELP": Customer asks for assistance on using the kiosk.
- "UNKNOWN": Gibberish, unrelated conversation, or uninterpretable input.

CRITICAL GROUNDING & CONFIRMATION RULES:
1. NEVER invent or hallucinate dishes that do not exist in the ACTIVE RESTAURANT MENU.
2. If the user asks for a dish that is NOT on the menu (e.g., "Paneer Tikka" or "Burger"), DO NOT place it in "items". Place it in "unrecognizedItems", and set "response" to: "Sorry, I couldn't find that item on the menu."
3. For matched dishes in an "ORDER" intent, the "response" MUST follow this exact confirmation pattern:
   - Single item: "You want [quantity word] [Item Name]. Shall I add it to your order?"
   - Multiple items: "You want [quantity word 1] [Item1] and [quantity word 2] [Item2]. Shall I add them to your order?"
   Translate naturally if language is kn-IN (Kannada) or hi-IN (Hindi).
4. If customer says "No", "cancel", or "change it", respond with: "Okay. What would you like to order instead?"
5. If customer says "Yes" or confirms, respond with: "Added to your order. Taking you to the cart."
6. "confidence": A float between 0.0 and 1.0.

Return strictly a valid JSON object matching this structure:
{
  "intent": "ORDER" | "CONFIRM" | "CANCEL" | "MODIFY" | "RECOMMENDATION" | "MENU_QUERY" | "HELP" | "UNKNOWN",
  "items": [
    {
      "name": "string",
      "menuItemId": "string",
      "quantity": 1,
      "price": 80,
      "customizations": ["string"]
    }
  ],
  "unrecognizedItems": ["string"],
  "confidence": 0.95,
  "response": "string"
}`;

  const ai = new GoogleGenAI({ apiKey });
  let passed = 0;
  let failed = 0;

  async function queryGemini(transcript, lang) {
    const userContent = `Customer input (${lang}): "${transcript}"`;
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const rawText = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text);
    return JSON.parse(rawText.trim());
  }

  function assert(condition, message) {
    if (condition) {
      console.log(`  âœ“ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  âœ— FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: English single dish
    console.log('--- 1. Live Gemini: English Single Item ---');
    const t1 = await queryGemini('I want two Masala Dosa.', 'en-IN');
    assert(t1.intent === 'ORDER', `Intent is ORDER (got: ${t1.intent})`);
    assert(t1.items?.length === 1, `Items length is 1 (got: ${t1.items?.length})`);
    assert(t1.items?.[0]?.name === 'Masala Dosa', `Dish is Masala Dosa (got: ${t1.items?.[0]?.name})`);
    assert(t1.items?.[0]?.quantity === 2, `Quantity is 2 (got: ${t1.items?.[0]?.quantity})`);
    console.log(`    Gemini response: "${t1.response}"`);

    // TEST 2: English multi-dish and quantities
    console.log('\n--- 2. Live Gemini: English Multiple Dishes & Quantities ---');
    const t2 = await queryGemini('Two Masala Dosa and one Mango Lassi.', 'en-IN');
    assert(t2.intent === 'ORDER', `Intent is ORDER`);
    assert(t2.items?.length === 2, `Items length is 2 (got: ${t2.items?.length})`);
    const dosa = t2.items?.find(i => i.name.toLowerCase().includes('dosa'));
    const lassi = t2.items?.find(i => i.name.toLowerCase().includes('lassi'));
    assert(dosa && dosa.quantity === 2, `Masala Dosa has quantity 2`);
    assert(lassi && lassi.quantity === 1, `Mango Lassi has quantity 1`);
    console.log(`    Gemini response: "${t2.response}"`);

    // TEST 3: Kannada food ordering
    console.log('\n--- 3. Live Gemini: Kannada Food Ordering ---');
    const t3 = await queryGemini('à²¨à²¨à²—à³† à²Žà²°à²¡à³ à²®à²¸à²¾à²²à³† à²¦à³‹à²¸à³† à²¬à³‡à²•à³.', 'kn-IN');
    assert(t3.intent === 'ORDER', `Intent is ORDER (got: ${t3.intent})`);
    assert(t3.items?.[0]?.name === 'Masala Dosa', `Dish is Masala Dosa (got: ${t3.items?.[0]?.name})`);
    assert(t3.items?.[0]?.quantity === 2, `Quantity is 2 (got: ${t3.items?.[0]?.quantity})`);
    console.log(`    Gemini response: "${t3.response}"`);

    // TEST 4: Hindi food ordering
    console.log('\n--- 4. Live Gemini: Hindi Food Ordering ---');
    const t4 = await queryGemini('à¤®à¥à¤à¥‡ à¤¦à¥‹ à¤®à¤¸à¤¾à¤²à¤¾ à¤¡à¥‹à¤¸à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤', 'hi-IN');
    assert(t4.intent === 'ORDER', `Intent is ORDER (got: ${t4.intent})`);
    assert(t4.items?.[0]?.name === 'Masala Dosa', `Dish is Masala Dosa (got: ${t4.items?.[0]?.name})`);
    assert(t4.items?.[0]?.quantity === 2, `Quantity is 2 (got: ${t4.items?.[0]?.quantity})`);
    console.log(`    Gemini response: "${t4.response}"`);

    // TEST 5: Off-menu dish rejection
    console.log('\n--- 5. Live Gemini: Off-Menu Dish Rejection ---');
    const t5 = await queryGemini('I want one Veg Pizza and one Burger.', 'en-IN');
    assert(t5.items?.length === 0, `0 items matched from menu (got: ${t5.items?.length})`);
    assert(t5.unrecognizedItems?.length > 0, `Unrecognized items recorded: ${t5.unrecognizedItems?.join(', ')}`);
    console.log(`    Gemini response: "${t5.response}"`);

    // TEST 6: Failure Fallback Verification
    console.log('\n--- 6. Gemini Failure Fallback Verification ---');
    const { parseVoiceIntent } = await import('../../frontend/src/services/voiceIntentService.js');
    // Calling with timeoutMs: 1 simulates a failed/slow API call and verifies fallback kicks in
    const fallbackTest = await parseVoiceIntent({
      text: 'two masala dosa and one mango lassi',
      language: 'en-IN',
      menuItems: sampleData.menuItems,
      timeoutMs: 1
    });
    assert(fallbackTest.success === true, 'Fallback succeeded');
    assert(fallbackTest.items.length === 2, 'Fallback parsed both items');
    assert(fallbackTest.provider === 'client_fallback', `Provider is client_fallback (got: ${fallbackTest.provider})`);

    console.log('\n================================================================');
    console.log(`Live Gemini Test Summary: ${passed} passed, ${failed} failed`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Gemini API call failed with error:', err.message);
    process.exit(1);
  }
}

testLiveGeminiVoiceAPI();
