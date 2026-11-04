/**
 * RESTOSMART Voice API Routes
 * Secure Backend Proxy for Sarvam AI Speech-to-Text (STT) & Text-to-Speech (TTS)
 * Keeps SARVAM_API_KEY secure on the server and provides graceful fallback indicators.
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/voice/status
 * Check if Sarvam AI or custom voice providers are configured
 */
router.get('/status', (req, res) => {
  const isSarvamConfigured = Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim() !== '' && !process.env.SARVAM_API_KEY.includes('your_sarvam'));
  res.json({
    success: true,
    sarvamConfigured: isSarvamConfigured,
    provider: isSarvamConfigured ? 'sarvam_ai' : 'browser_native',
    supportedLanguages: ['en-IN', 'kn-IN', 'hi-IN'],
    models: {
      stt: 'saaras:v1',
      tts: 'bulbul:v1'
    }
  });
});

/**
 * POST /api/voice/sarvam-stt
 * Speech-to-Text via Sarvam AI
 * Accepts audioBase64 or audio buffer and forwards to Sarvam AI
 */
router.post('/sarvam-stt', async (req, res) => {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_sarvam')) {
      return res.status(200).json({
        success: false,
        useFallback: true,
        message: 'SARVAM_API_KEY is not configured in backend .env. Use client Web Speech API.',
        provider: 'browser_native'
      });
    }

    const { audioBase64, language_code = 'en-IN', mimeType = 'audio/wav' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        message: 'audioBase64 is required for speech recognition'
      });
    }

    // Convert base64 to Blob/Buffer
    const audioBuffer = Buffer.from(audioBase64.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
    const audioBlob = new Blob([audioBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append('file', audioBlob, 'speech_recording.wav');
    formData.append('model', 'saaras:v1');
    formData.append('language_code', language_code);

    const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: formData,
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.error('Sarvam STT API Error:', sarvamRes.status, errText);
      return res.status(sarvamRes.status).json({
        success: false,
        useFallback: true,
        error: `Sarvam STT error (${sarvamRes.status}): ${errText}`
      });
    }

    const sarvamData = await sarvamRes.json();
    return res.json({
      success: true,
      transcript: sarvamData.transcript || '',
      language_code: sarvamData.language_code || language_code,
      provider: 'sarvam_ai'
    });
  } catch (error) {
    console.error('Sarvam STT Exception:', error);
    return res.status(500).json({
      success: false,
      useFallback: true,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/sarvam-tts
 * Text-to-Speech via Sarvam AI
 * Converts prompt text into Indian voice speech audio
 */
router.post('/sarvam-tts', async (req, res) => {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_sarvam')) {
      return res.status(200).json({
        success: false,
        useFallback: true,
        message: 'SARVAM_API_KEY is not configured in backend .env. Use client SpeechSynthesis.',
        provider: 'browser_native'
      });
    }

    const { text, target_language_code = 'en-IN', speaker } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'text is required for speech synthesis'
      });
    }

    // Default high-quality Indian speakers per language
    const speakerMap = {
      'en-IN': 'meera',
      'kn-IN': 'aravind',
      'hi-IN': 'ananya'
    };
    const chosenSpeaker = speaker || speakerMap[target_language_code] || 'meera';

    const sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [text.trim()],
        target_language_code: target_language_code,
        speaker: chosenSpeaker,
        pitch: 0,
        pace: 0.95,
        loudness: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v1'
      })
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.error('Sarvam TTS API Error:', sarvamRes.status, errText);
      return res.status(sarvamRes.status).json({
        success: false,
        useFallback: true,
        error: `Sarvam TTS error (${sarvamRes.status}): ${errText}`
      });
    }

    const sarvamData = await sarvamRes.json();
    const audioBase64 = sarvamData.audios && sarvamData.audios[0] ? sarvamData.audios[0] : null;

    return res.json({
      success: true,
      audioBase64: audioBase64,
      target_language_code: target_language_code,
      provider: 'sarvam_ai'
    });
  } catch (error) {
    console.error('Sarvam TTS Exception:', error);
    return res.status(500).json({
      success: false,
      useFallback: true,
      error: error.message
    });
  }
});

const MenuItem = require('../models/MenuItem');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const { GoogleGenAI } = require('@google/genai');

/**
 * Helper to build intelligent local grounded parsing response
 */
const buildGroundedFallbackResponse = (text, language = 'en-IN', menuItems = [], knowledgeDocs = []) => {
  const lower = text.toLowerCase().trim();

  // 1. Intent Detection
  let intent = 'UNKNOWN';
  if (/^(yes|confirm|correct|proceed|okay|ok|done|haudu|sari|haan|sahi|ಹೌದು|ಸರಿ|ಖಚಿತ|हाँ|सही|कन्फर्म)/i.test(lower)) {
    intent = 'CONFIRM';
    const msg = language === 'kn-IN'
      ? 'ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಕಾರ್ಟ್‌ಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.'
      : language === 'hi-IN'
      ? 'आपके ऑर्डर में जोड़ दिया गया है। कार्ट पर ले जा रहे हैं।'
      : 'Added to your order. Taking you to the cart.';
    return { success: true, intent, items: [], unrecognizedItems: [], confidence: 0.98, response: msg, provider: 'gemini_ai_fallback' };
  }
  if (/^(no|cancel|stop|reset|clear|beda|nahi|ಬೇಡ|ರದ್ದು|ತಪ್ಪು|नहीं|रद्द|गलत)/i.test(lower) || lower.includes('change it') || lower.includes('change') || lower.includes('modify') || lower.includes('ಬದಲಾಯಿಸಿ') || lower.includes('बदलो')) {
    intent = (lower.includes('change') || lower.includes('modify') || lower.includes('ಬದಲಾಯಿಸಿ') || lower.includes('बदಲೋ')) ? 'MODIFY' : 'CANCEL';
    const msg = language === 'kn-IN'
      ? 'ಸರಿ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?'
      : language === 'hi-IN'
      ? 'ठीक है। आप क्या ऑर्डर करना चाहेंगे?'
      : 'Okay. What would you like to order instead?';
    return { success: true, intent, items: [], unrecognizedItems: [], confidence: 0.98, response: msg, provider: 'gemini_ai_fallback' };
  }

  if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('special') || lower.includes('best') || lower.includes('spicy') || lower.includes('mild') || lower.includes('ಸ್ಪೆಷಲ್') || lower.includes('ಖಾರ') || lower.includes('तीखा') || lower.includes('खास')) {
    intent = 'RECOMMENDATION';
    let responseText = '';
    if (lower.includes('not too spicy') || lower.includes("isn't too spicy") || lower.includes('is not too spicy') || lower.includes('mild') || lower.includes('less spicy')) {
      const mildDishes = menuItems.filter(m => m.isAvailable !== false && (m.dietaryTags?.includes('mild') || m.categorySlug === 'desserts' || m.categorySlug === 'beverages' || m.name.includes('Rice') || m.name.includes('Naan') || m.name.includes('Meals') || m.name.includes('Dosa'))).slice(0, 3).map(m => m.name);
      responseText = language === 'kn-IN'
        ? `ಖಾರವಿಲ್ಲದ ಆಯ್ಕೆಗಳಿಗೆ: ${mildDishes.join(', ')} ಉತ್ತಮವಾಗಿದೆ.`
        : language === 'hi-IN'
        ? `कम तीखे व्यंजनों के लिए: ${mildDishes.join(', ')} बेहतरीन विकल्प हैं।`
        : `For mild dishes that aren't too spicy, I recommend: ${mildDishes.join(', ')}.`;
    } else if (lower.includes('spicy') || lower.includes('ಖಾರ') || lower.includes('तीखा')) {
      const spicyDishes = menuItems.filter(m => m.isAvailable !== false && (m.dietaryTags?.includes('spicy') || m.name.includes('Manchurian') || m.name.includes('Kabab') || m.name.includes('Biryani'))).slice(0, 3).map(m => m.name);
      responseText = language === 'kn-IN'
        ? `ಖಾರವಾದ ತಿಂಡಿಗಳಿಗೆ: ${spicyDishes.join(', ')} ಪ್ರಯತ್ನಿಸಿ.`
        : language === 'hi-IN'
        ? `तीखे खाने के शौकीनों के लिए: ${spicyDishes.join(', ')} बहुत लोकप्रिय हैं।`
        : `For spicy favorites, I highly recommend: ${spicyDishes.join(', ')}.`;
    } else {
      const specials = menuItems.filter(m => m.isSpecial && m.isAvailable !== false).slice(0, 3).map(m => m.name);
      responseText = language === 'kn-IN'
        ? `ನಮ್ಮ ಸ್ಪೆಷಲ್ ತಿಂಡಿಗಳು: ${specials.join(', ')}.`
        : language === 'hi-IN'
        ? `हमारे लोकप्रिय शेफ स्पेशल: ${specials.join(', ')} हैं।`
        : `Our chef's top recommendations today are: ${specials.join(', ')}.`;
    }
    return { success: true, intent, items: [], unrecognizedItems: [], confidence: 0.95, response: responseText, provider: 'gemini_ai_fallback' };
  }
  if (lower.includes('menu') || lower.includes('what do you have') || lower.includes('options') || lower.includes('categories') || lower.includes('ಮೆನು') || lower.includes('मेनू')) {
    intent = 'MENU_QUERY';
    const msg = language === 'kn-IN'
      ? 'ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ Starters, Main Course, Biryani & Rice, Beverages ಮತ್ತು Desserts ಲಭ್ಯವಿದೆ.'
      : language === 'hi-IN'
      ? 'हमारे मेनू में Starters, Main Course, Biryani & Rice, Beverages और Desserts शामिल हैं।'
      : 'Our menu features Starters, Main Course Curries, Biryani & Rice, South Indian Beverages, and Desserts.';
    return { success: true, intent, items: [], unrecognizedItems: [], confidence: 0.95, response: msg, provider: 'gemini_ai_fallback' };
  }

  // 2. Food Order Parsing
  intent = 'ORDER';
  const matchedItems = [];
  const unrecognizedItems = [];

  // Multilingual numbers map
  const numMap = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'a': 1, 'an': 1,
    'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, '೧': 1, '೨': 2, '೩': 3, '೪': 4, '೫': 5,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, '१': 1, '२': 2, '೩': 3, '४': 4, '५': 5
  };

  // Synonyms mapping
  const synonymMap = {
    'masala dosa': 'Masala Dosa', 'masale dose': 'Masala Dosa', 'dosa': 'Masala Dosa', 'dose': 'Masala Dosa', 'ಮಸಾಲ ದೋಸೆ': 'Masala Dosa', 'ಮಸಾಲೆ ದೋಸೆ': 'Masala Dosa', 'मसाला डोसा': 'Masala Dosa', 'डोसा': 'Masala Dosa',
    'samosa': 'Crispy Veg Samosa (2 Pcs)', 'veg samosa': 'Crispy Veg Samosa (2 Pcs)', 'crispy samosa': 'Crispy Veg Samosa (2 Pcs)', 'samose': 'Crispy Veg Samosa (2 Pcs)', 'ಸಮೋಸಾ': 'Crispy Veg Samosa (2 Pcs)', 'ಸಮೋಸ': 'Crispy Veg Samosa (2 Pcs)', 'समोसा': 'Crispy Veg Samosa (2 Pcs)',
    'gobi manchurian': 'Gobi Manchurian', 'gobi': 'Gobi Manchurian', 'ಗೋಬಿ': 'Gobi Manchurian', 'गोबी मंचूरियन': 'Gobi Manchurian',
    'chicken kabab': 'Chicken Kabab', 'kabab': 'Chicken Kabab', 'kebab': 'Chicken Kabab', 'ಕಬಾಬ್': 'Chicken Kabab', 'कबाब': 'Chicken Kabab',
    'paneer butter masala': 'Paneer Butter Masala', 'paneer butter': 'Paneer Butter Masala', 'ಪನೀರ್ ಬಟರ್': 'Paneer Butter Masala', 'पनीर बटर': 'Paneer Butter Masala',
    'butter naan': 'Butter Naan', 'naan': 'Butter Naan', 'ನಾನ್': 'Butter Naan', 'नान': 'Butter Naan',
    'dal tadka': 'Dal Tadka', 'dal': 'Dal Tadka', 'ದಾಲ್': 'Dal Tadka', 'ದಾಲ': 'Dal Tadka', 'दाल': 'Dal Tadka',
    'veg biryani': 'Veg Dum Biryani', 'chicken biryani': 'Chicken Dum Biryani', 'dum biryani': 'Chicken Dum Biryani', 'biryani': 'Chicken Dum Biryani', 'ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani', 'बिरयानी': 'Chicken Dum Biryani',
    'jeera rice': 'Jeera Rice', 'fried rice': 'Veg Fried Rice', 'filter coffee': 'South Indian Filter Coffee', 'coffee': 'South Indian Filter Coffee', 'ಕಾಫಿ': 'South Indian Filter Coffee', 'कॉफी': 'South Indian Filter Coffee', 'कॉफ़ी': 'South Indian Filter Coffee',
    'cold coffee': 'Cold Coffee with Ice Cream', 'masala chai': 'Masala Chai', 'chai': 'Masala Chai', 'tea': 'Masala Chai', 'ಚಹಾ': 'Masala Chai', 'चाय': 'Masala Chai', 'lime juice': 'Fresh Lime Juice', 'gulab jamun': 'Gulab Jamun (2 Pcs)', 'brownie': "Sizzling S'mores Brownie",
    'mango lassi': 'Mango Lassi', 'lassi': 'Mango Lassi', 'ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ': 'Mango Lassi', 'ಮಾವಿನ ಹಣ್ಣಿನ ಲಸ್ಸಿ': 'Mango Lassi', 'ಲಸ್ಸಿ': 'Mango Lassi', 'मैंगो लस्सी': 'Mango Lassi', 'आम की लस्सी': 'Mango Lassi', 'लस्सी': 'Mango Lassi'
  };

  // Check for unknown dish requests
  const commonUnknownDishes = [
    { key: 'paneer tikka', name: 'Paneer Tikka' },
    { key: 'tikka', name: 'Tikka' },
    { key: 'pizza', name: 'Pizza' },
    { key: 'burger', name: 'Burger' },
    { key: 'pasta', name: 'Pasta' },
    { key: 'noodles', name: 'Noodles' }
  ];

  for (const unk of commonUnknownDishes) {
    if (lower.includes(unk.key) && !menuItems.some(m => m.name.toLowerCase().includes(unk.key))) {
      unrecognizedItems.push(unk.name);
    }
  }

  // Extract matched menu items
  menuItems.forEach((menuItem) => {
    const dishNameLower = menuItem.name.toLowerCase();
    let found = false;
    let qty = 1;

    // Check direct dish name
    if (lower.includes(dishNameLower)) {
      found = true;
    } else {
      // Check synonyms
      for (const [syn, canonical] of Object.entries(synonymMap)) {
        if (canonical.toLowerCase() === dishNameLower && new RegExp('(^|\\s)' + syn + '($|\\s)', 'i').test(lower)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      // Find quantity in text near dish name
      for (const [word, val] of Object.entries(numMap)) {
        const regex1 = new RegExp('\\b' + word + '\\s+([a-zA-Z\\u0C80-\\u0CFF\\u0900-\\u097F\\s]*)' + dishNameLower.slice(0, 4), 'i');
        const regex2 = new RegExp(dishNameLower.slice(0, 4) + '([a-zA-Z\\u0C80-\\u0CFF\\u0900-\\u097F\\s]*)\\b' + word + '\\b', 'i');
        const digitRegex = new RegExp('(\\d+)\\s+([a-zA-Z\\u0C80-\\u0CFF\\u0900-\\u097F\\s]*)' + dishNameLower.slice(0, 4), 'i');

        if (regex1.test(lower) || regex2.test(lower)) {
          qty = val;
          break;
        }
        const digitMatch = lower.match(digitRegex);
        if (digitMatch && digitMatch[1]) {
          qty = parseInt(digitMatch[1], 10) || 1;
          break;
        }
      }

      // Check customizations
      const cust = [];
      if (lower.includes('no onion') || lower.includes('without onion')) cust.push('No Onion');
      if (lower.includes('no garlic') || lower.includes('without garlic')) cust.push('No Garlic');
      if (lower.includes('extra spicy') || lower.includes('very spicy')) cust.push('Extra Spicy');
      if (lower.includes('less spicy') || lower.includes('mild')) cust.push('Less Spicy');
      if (lower.includes('jain')) cust.push('Jain Preparation');

      matchedItems.push({
        name: menuItem.name,
        menuItemId: menuItem._id ? menuItem._id.toString() : menuItem.id,
        quantity: Math.max(1, qty),
        price: menuItem.price,
        customizations: cust
      });
    }
  });

  const getQuantityWord = (qty, lang) => {
    const num = parseInt(qty, 10) || 1;
    const englishWords = {
      1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
      6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten'
    };
    const kannadaWords = {
      1: 'ಒಂದು', 2: 'ಎರಡು', 3: 'ಮೂರು', 4: 'ನಾಲ್ಕು', 5: 'ಐದು',
      6: 'ಆರು', 7: 'ಏಳು', 8: 'ಎಂಟು', 9: 'ಒಂಬತ್ತು', 10: 'ಹತ್ತು'
    };
    const hindiWords = {
      1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पाँच',
      6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस'
    };

    if (lang === 'kn-IN') return kannadaWords[num] || num.toString();
    if (lang === 'hi-IN') return hindiWords[num] || num.toString();
    return englishWords[num] || num.toString();
  };

  let responseText = '';
  if (matchedItems.length > 0) {
    if (matchedItems.length === 1) {
      const item = matchedItems[0];
      const qtyWord = getQuantityWord(item.quantity, language);
      responseText = language === 'kn-IN'
        ? `ನೀವು ${qtyWord} ${item.name} ಬಯಸಿದ್ದೀರಿ. ಅದನ್ನು ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲೇ?`
        : language === 'hi-IN'
        ? `आप ${qtyWord} ${item.name} चाहते हैं। क्या मैं इसे आपके ऑर्डर में जोड़ दूँ?`
        : `You want ${qtyWord} ${item.name}. Shall I add it to your order?`;
    } else {
      const summaryEn = matchedItems.map(i => `${getQuantityWord(i.quantity, 'en-IN')} ${i.name}`).join(' and ');
      const summaryKn = matchedItems.map(i => `${getQuantityWord(i.quantity, 'kn-IN')} ${i.name}`).join(' ಮತ್ತು ');
      const summaryHi = matchedItems.map(i => `${getQuantityWord(i.quantity, 'hi-IN')} ${i.name}`).join(' और ');

      responseText = language === 'kn-IN'
        ? `ನೀವು ${summaryKn} ಬಯಸಿದ್ದೀರಿ. ಅವುಗಳನ್ನು ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲೇ?`
        : language === 'hi-IN'
        ? `आप ${summaryHi} चाहते हैं। क्या मैं इन्हें आपके ऑर्डर में जोड़ दूँ?`
        : `You want ${summaryEn}. Shall I add them to your order?`;
    }

    if (unrecognizedItems.length > 0) {
      responseText += ` (Note: ${unrecognizedItems.join(', ')} is not on the menu)`;
    }
  } else if (unrecognizedItems.length > 0) {
    responseText = language === 'kn-IN'
      ? `ಕ್ಷಮಿಸಿ, "${unrecognizedItems.join(', ')}" ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.`
      : language === 'hi-IN'
      ? `क्षमा करें, "${unrecognizedItems.join(', ')}" हमारे मेनू में उपलब्ध नहीं है।`
      : "Sorry, I couldn't find that item on the menu.";
  } else {
    intent = 'UNKNOWN';
    responseText = language === 'kn-IN'
      ? "ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ನಿಮ್ಮ ತಿಂಡಿಯನ್ನು ಹೇಳಿ (ಉದಾ: 'ಒಂದು ಮಸಾಲ ದೋಸೆ') ಅಥವಾ ಮೆನು ನೋಡಿ."
      : language === 'hi-IN'
      ? "मैं समझ नहीं पाया। कृपया अपना ऑर्डर बोलें (उदा: 'एक मसाला डोसा') या मेनू देखें।"
      : "I didn't quite catch that. Please specify what you'd like to order (e.g. 'One Masala Dosa') or browse our menu.";
  }

  return {
    success: true,
    intent,
    items: matchedItems,
    unrecognizedItems,
    confidence: matchedItems.length > 0 ? 0.96 : (unrecognizedItems.length > 0 ? 0.85 : 0.4),
    response: responseText,
    provider: 'gemini_ai_fallback'
  };
};

/**
 * POST /api/voice/parse-intent
 * Intelligent Natural Language Understanding (NLU) & Intent Parsing via Google Gemini
 * Strictly grounded against active MongoDB Menu and KnowledgeDoc context.
 */
router.post('/parse-intent', async (req, res) => {
  try {
    const { text, language = 'en-IN', menu: clientMenu = [] } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'text is required for intent parsing'
      });
    }

    let activeMenu = clientMenu;
    if (!Array.isArray(activeMenu) || activeMenu.length === 0) {
      activeMenu = await MenuItem.find({ isAvailable: true }).select('name price categorySlug type isSpecial dietaryTags ingredients description').lean();
    }

    const knowledgeDocs = await KnowledgeDoc.find({}).lean();

    const apiKey = process.env.GEMINI_API_KEY;
    const isGeminiKeyConfigured = Boolean(apiKey && apiKey.trim() !== '' && !apiKey.includes('your_gemini'));

    if (!isGeminiKeyConfigured) {
      const fallbackResult = buildGroundedFallbackResponse(text, language, activeMenu, knowledgeDocs);
      return res.json(fallbackResult);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const menuContext = activeMenu.map(m =>
        `- "${m.name}" (ID: ${m._id || m.id}, Price: ₹${m.price}, Category: ${m.categorySlug}, Type: ${m.type}, Special: ${m.isSpecial ? 'Yes' : 'No'}, Tags: ${m.dietaryTags?.join(', ') || 'none'}, Ingredients: ${m.ingredients?.join(', ') || 'none'})`
      ).join('\n');

      const knowledgeContext = knowledgeDocs.map(k =>
        `- [${k.category.toUpperCase()}] ${k.title}: ${k.content}`
      ).join('\n');

      const systemPrompt = `You are the AI Voice Ordering Assistant for RESTOSMART, an intelligent self-service restaurant kiosk.
Your job is to analyze spoken transcripts in English, Kannada (ಕನ್ನಡ), or Hindi (हिन्दी), classify the customer's intent, extract ordered dishes strictly matching the active menu, and formulate clear confirmation responses.

ACTIVE RESTAURANT MENU (GROUND TRUTH):
${menuContext}

RESTAURANT KNOWLEDGE BASE & GUIDELINES:
${knowledgeContext}

INTENT DEFINITIONS:
- "ORDER": Customer expresses an intention to order dishes or beverages.
- "CONFIRM": Customer confirms detected order (e.g. "yes", "confirm", "correct", "proceed", "ಹೌದು", "ಸರಿ", "हाँ", "कन्फर्म").
- "CANCEL": Customer cancels order (e.g. "no", "cancel", "stop", "ಬೇಡ", "नहीं").
- "MODIFY": Customer wants to change or edit dishes (e.g. "change it", "no change", "modify", "ಬದಲಾಯಿಸಿ", "ಬದಲೋ").
- "RECOMMENDATION": Customer asks for dish suggestions, chef specials, bestsellers, spicy/mild food, or dietary advice.
- "MENU_QUERY": Customer asks about what is on the menu, categories, pricing, or ingredients.
- "HELP": Customer asks for assistance on using the kiosk.
- "UNKNOWN": Gibberish, unrelated conversation, or uninterpretable input.

CRITICAL GROUNDING & CONFIRMATION RULES:
1. NEVER invent or hallucinate dishes that do not exist in the ACTIVE RESTAURANT MENU.
2. If the user asks for a dish that is NOT on the menu (e.g., "Paneer Tikka" or "Burger"), DO NOT place it in "items". Place it in "unrecognizedItems", and set "response" to: "Sorry, I couldn't find that item on the menu." (in ${language === 'kn-IN' ? 'Kannada' : language === 'hi-IN' ? 'Hindi' : 'English'}).
3. For matched dishes in an "ORDER" intent, the "response" MUST follow this exact confirmation pattern:
   - Single item: "You want [quantity word] [Item Name]. Shall I add it to your order?" (e.g. "You want one Masala Dosa. Shall I add it to your order?")
   - Multiple items: "You want [quantity word 1] [Item1] and [quantity word 2] [Item2]. Shall I add them to your order?" (e.g. "You want two Masala Dosa and one Mango Lassi. Shall I add them to your order?")
   Translate naturally if language is kn-IN (Kannada: "ನೀವು ಒಂದು Masala Dosa ಬಯಸಿದ್ದೀರಿ. ಅದನ್ನು ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲೇ?") or hi-IN (Hindi: "आप एक Masala Dosa चाहते हैं। क्या मैं इसे आपके ऑर्डर में जोड़ दूँ?").
4. If customer says "No", "cancel", or "change it", respond with: "Okay. What would you like to order instead?" (in the target language).
5. If customer says "Yes" or confirms, respond with: "Added to your order. Taking you to the cart." (in the target language).
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

      const userContent = `Customer input (${language}): "${text}"`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      const rawText = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text);
      if (rawText) {
        const parsedJson = JSON.parse(rawText.trim());
        return res.json({
          success: true,
          intent: parsedJson.intent || 'UNKNOWN',
          items: Array.isArray(parsedJson.items) ? parsedJson.items : [],
          unrecognizedItems: Array.isArray(parsedJson.unrecognizedItems) ? parsedJson.unrecognizedItems : [],
          confidence: Number(parsedJson.confidence) || 0.9,
          response: parsedJson.response || '',
          provider: 'gemini_ai'
        });
      }
    } catch (geminiErr) {
      console.warn('Gemini API call failed, using grounded fallback parser:', geminiErr.message);
    }

    const fallbackResult = buildGroundedFallbackResponse(text, language, activeMenu, knowledgeDocs);
    return res.json(fallbackResult);
  } catch (error) {
    console.error('Fatal error in /api/voice/parse-intent:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during intent parsing',
      error: error.message
    });
  }
});

module.exports = router;
