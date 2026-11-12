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

const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const { GoogleGenAI } = require('@google/genai');

/**
 * Helper to build intelligent local grounded parsing response
 * Full conversational fallback with multi-turn context, pronoun resolution,
 * price/ingredient queries, quantity changes, item removal, and ambiguity clarification.
 */
const buildGroundedFallbackResponse = (
  text,
  language = 'en-IN',
  menuItems = [],
  knowledgeDocs = [],
  conversationHistory = [],
  currentOrder = [],
  lastDiscussedDish = null
) => {
  const clean = (text || '').trim();
  const lower = clean.toLowerCase();

  // Helper for language script/token detection
  const detectSpokenLanguage = (text = '', preferredLocale = 'en-IN') => {
    if (!text || typeof text !== 'string') return preferredLocale;
    const trimmed = text.trim();
    if (/[\u0C80-\u0CFF]/.test(trimmed)) return 'kn-IN';
    if (/[\u0900-\u097F]/.test(trimmed)) return 'hi-IN';
    const lower = trimmed.toLowerCase();
    const words = lower.split(/[\s,?.!।;:"'()-]+/).filter(Boolean);
    const knMarkers = ['nanage', 'namage', 'ondu', 'eradu', 'mooru', 'naalku', 'aidu', 'beku', 'beda', 'kodi', 'haaki', 'serisi', 'maadi', 'thindi', 'oota', 'khara', 'swalpa', 'chennagide', 'hegide', 'enu', 'yavudhu', 'yavudu', 'isthe', 'aste', 'ivattina', 'suchisi', 'gondalavide', 'sahaya', 'shifarassu', 'vishesha'];
    const hiMarkers = ['mujhe', 'hume', 'hame', 'chahiye', 'dijiye', 'kripya', 'batao', 'khana', 'peena', 'thoda', 'teekha', 'meetha', 'bhaiya', 'kya', 'hai', 'hain', 'nahi', 'haan', 'bhi', 'aur', 'kuch', 'achha', 'accha', 'badhiya', 'lao', 'dena', 'karo', 'hatao', 'badlo', 'shakahari', 'madad', 'bataiye', 'lagao'];
    let kn = 0, hi = 0;
    for (const w of words) {
      if (knMarkers.includes(w)) kn++;
      if (hiMarkers.includes(w)) hi++;
    }
    if (kn > 0 && kn >= hi) return 'kn-IN';
    if (hi > 0 && hi > kn) return 'hi-IN';
    return preferredLocale;
  };

  const detectedLang = detectSpokenLanguage(clean, language);
  const activeLang = language || detectedLang || 'en-IN';

  // Helper for quantity words
  const getQuantityWord = (qty, lang) => {
    const num = parseInt(qty, 10) || 1;
    const englishWords = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };
    const kannadaWords = { 1: 'ಒಂದು', 2: 'ಎರಡು', 3: 'ಮೂರು', 4: 'ನಾಲ್ಕು', 5: 'ಐದು', 6: 'ಆರು', 7: 'ಏಳು', 8: 'ಎಂಟು', 9: 'ಒಂಬತ್ತು', 10: 'ಹತ್ತು' };
    const hindiWords = { 1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पाँच', 6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस' };
    if (lang === 'kn-IN') return kannadaWords[num] || num.toString();
    if (lang === 'hi-IN') return hindiWords[num] || num.toString();
    return englishWords[num] || num.toString();
  };

  // Synonyms and dish aliases
  const synonymMap = {
    'masala dosa': 'Masala Dosa', 'masale dose': 'Masala Dosa', 'dosa': 'Masala Dosa', 'dosas': 'Masala Dosa', 'dose': 'Masala Dosa',
    'ಮಸಾಲ ದೋಸೆ': 'Masala Dosa', 'ಮಸಾಲೆ ದೋಸೆ': 'Masala Dosa', 'ದೋಸೆ': 'Masala Dosa', 'मसाला डोसा': 'Masala Dosa', 'डोसा': 'Masala Dosa',
    'samosa': 'Crispy Veg Samosa (2 Pcs)', 'veg samosa': 'Crispy Veg Samosa (2 Pcs)', 'crispy samosa': 'Crispy Veg Samosa (2 Pcs)', 'samose': 'Crispy Veg Samosa (2 Pcs)',
    'ಸಮೋಸಾ': 'Crispy Veg Samosa (2 Pcs)', 'ಸಮೋಸ': 'Crispy Veg Samosa (2 Pcs)', 'समोसा': 'Crispy Veg Samosa (2 Pcs)', 'समोसे': 'Crispy Veg Samosa (2 Pcs)',
    'gobi manchurian': 'Gobi Manchurian', 'gobi': 'Gobi Manchurian', 'ಗೋಬಿ': 'Gobi Manchurian', 'गोबी मंचूरियन': 'Gobi Manchurian', 'गोबी': 'Gobi Manchurian',
    'chicken kabab': 'Chicken Kabab', 'kabab': 'Chicken Kabab', 'kebab': 'Chicken Kabab', 'ಕಬಾಬ್': 'Chicken Kabab', 'कबाब': 'Chicken Kabab',
    'paneer butter masala': 'Paneer Butter Masala', 'paneer butter': 'Paneer Butter Masala', 'paneer masala': 'Paneer Butter Masala', 'paneer': 'Paneer Butter Masala', 'ಪನೀರ್ ಬಟರ್': 'Paneer Butter Masala', 'ಪನೀರ್': 'Paneer Butter Masala', 'पनीर बटर': 'Paneer Butter Masala', 'पनीर': 'Paneer Butter Masala',
    'butter naan': 'Butter Naan', 'naan': 'Butter Naan', 'ನಾನ್': 'Butter Naan', 'नान': 'Butter Naan',
    'dal tadka': 'Dal Tadka', 'dal': 'Dal Tadka', 'dal fry': 'Dal Tadka', 'ದಾಲ್': 'Dal Tadka', 'दाल': 'Dal Tadka',
    'north indian deluxe thali': 'North Indian Deluxe Thali', 'deluxe thali': 'North Indian Deluxe Thali', 'thali': 'North Indian Deluxe Thali', 'ಥಾಲಿ': 'North Indian Deluxe Thali', 'थाली': 'North Indian Deluxe Thali',
    'south indian meals': 'South Indian Meals', 'meals': 'South Indian Meals', 'oota': 'South Indian Meals', 'ಊಟ': 'South Indian Meals',
    'veg fried rice': 'Veg Fried Rice', 'fried rice': 'Veg Fried Rice',
    'veg dum biryani': 'Veg Dum Biryani', 'veg biryani': 'Veg Dum Biryani',
    'chicken dum biryani': 'Chicken Dum Biryani', 'chicken biryani': 'Chicken Dum Biryani', 'biryani': 'Chicken Dum Biryani', 'ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani', 'बिरयानी': 'Chicken Dum Biryani',
    'jeera rice': 'Jeera Rice',
    'south indian filter coffee': 'South Indian Filter Coffee', 'filter coffee': 'South Indian Filter Coffee', 'coffee': 'South Indian Filter Coffee', 'kaapi': 'South Indian Filter Coffee', 'ಕಾಫಿ': 'South Indian Filter Coffee', 'कॉफी': 'South Indian Filter Coffee', 'कॉफ़ी': 'South Indian Filter Coffee',
    'masala chai': 'Masala Chai', 'chai': 'Masala Chai', 'tea': 'Masala Chai', 'chaha': 'Masala Chai', 'ಚಹಾ': 'Masala Chai', 'चाय': 'Masala Chai',
    'fresh lime juice': 'Fresh Lime Juice', 'lime juice': 'Fresh Lime Juice', 'ನಿಂಬೆ ಜ್ಯೂಸ್': 'Fresh Lime Juice', 'नींबू पानी': 'Fresh Lime Juice',
    'cold coffee with ice cream': 'Cold Coffee with Ice Cream', 'cold coffee': 'Cold Coffee with Ice Cream',
    'gulab jamun (2 pcs)': 'Gulab Jamun (2 Pcs)', 'gulab jamun': 'Gulab Jamun (2 Pcs)', 'ಗುಲಾಬ್ ಜಾಮೂನ್': 'Gulab Jamun (2 Pcs)', 'गुलाब जामुन': 'Gulab Jamun (2 Pcs)',
    "sizzling s'mores brownie": "Sizzling S'mores Brownie", 'brownie': "Sizzling S'mores Brownie",
    'hot & sour veg soup': 'Hot & Sour Veg Soup', 'hot and sour soup': 'Hot & Sour Veg Soup', 'soup': 'Hot & Sour Veg Soup', 'ಸೂಪ್': 'Hot & Sour Veg Soup', 'ಸೂಪ್': 'Hot & Sour Veg Soup',
    'peri peri french fries': 'Peri Peri French Fries', 'peri peri fries': 'Peri Peri French Fries', 'french fries': 'Peri Peri French Fries', 'fries': 'Peri Peri French Fries',
    'mango lassi': 'Mango Lassi', 'lassi': 'Mango Lassi', 'ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ': 'Mango Lassi', 'मैंगो लस्सी': 'Mango Lassi', 'लस्सी': 'Mango Lassi'
  };

  const numMap = {
    'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'couple': 2, 'pair': 2,
    'ondu': 1, 'eradu': 2, 'mooru': 3, 'naalku': 4, 'aidu': 5,
    'ek': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'paanch': 5,
    'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, '೧': 1, '೨': 2, '೩': 3, '೪': 4, '೫': 5,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5
  };

  // Helper to find a dish in text or resolve pronoun
  const findReferencedDish = (queryText) => {
    const qLower = queryText.toLowerCase();
    for (const [alias, canonical] of Object.entries(synonymMap)) {
      if (new RegExp('(^|\\b|\\s)' + alias + '(\\b|\\s|$)', 'i').test(qLower)) {
        return menuItems.find(m => m.name.toLowerCase() === canonical.toLowerCase()) || { name: canonical };
      }
    }
    // Check if pronoun references last discussed dish or single item in order
    const isPronoun = /^(it|that|this|the dish|ಅದು|ಇದು|यह|इसे|वो)\b/i.test(qLower) || qLower.includes(' it ') || qLower.includes(' that ');
    if (isPronoun) {
      if (lastDiscussedDish) {
        return menuItems.find(m => m.name.toLowerCase() === lastDiscussedDish.toLowerCase()) || { name: lastDiscussedDish };
      }
      if (currentOrder && currentOrder.length === 1) {
        return menuItems.find(m => m.name.toLowerCase() === (currentOrder[0].name || '').toLowerCase()) || currentOrder[0];
      }
    }
    return null;
  };

  // 1. GREETING
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i.test(lower) ||
      /^(ಹಾಯ್|ಹಲೋ|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|ಶುಭೋದಯ|ಶುಭ ಸಂಜೆ)/i.test(lower) ||
      /^(हाय|हेलो|नमस्ते|नमस्कार|सुप्रभात|प्रणाम)/i.test(lower)) {
    const msg = language === 'kn-IN'
      ? 'ನಮಸ್ಕಾರ! ರೆಸ್ಟೋಸ್ಮಾರ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ. ಇಂದು ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?'
      : language === 'hi-IN'
        ? 'नमस्ते! रेस्टोस्मार्ट में आपका स्वागत है। आज आप क्या खाना चाहेंगे?'
        : 'Hello! Welcome to RESTOSMART. What would you like to order today?';
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
      response: msg,
      provider: 'gemini_ai_fallback'
    };
  }

  // 2. HELP
  if (/^(help|how do i order|how does this work|assist me|instructions)\b/i.test(lower) ||
      /^(ಸಹಾಯ|ಹೇಗೆ ಆರ್ಡರ್ ಮಾಡಬೇಕು|ತಿಳಿಸಿ)/i.test(lower) ||
      /^(मदद|कैसे ऑर्डर करें|बताओ)/i.test(lower)) {
    const msg = language === 'kn-IN'
      ? 'ನೀವು ನಿಮ್ಮ ತಿಂಡಿಗಳನ್ನು ನೇರವಾಗಿ ಹೇಳಿ ಆರ್ಡರ್ ಮಾಡಬಹುದು (ಉದಾ: "ಎರಡು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಒಂದು ಕಾಫಿ"), ಅಥವಾ ಬೆಲೆ ಮತ್ತು ಶಿಫಾರಸುಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು.'
      : language === 'hi-IN'
        ? 'आप बोलकर सीधे ऑर्डर कर सकते हैं (जैसे: "दो मसाला डोसा और एक कॉफ़ी"), या व्यंजनों की कीमत और सलाह पूछ सकते हैं।'
        : "You can order naturally by speaking (e.g., 'Two Masala Dosas and one Filter Coffee'), ask about prices, or request recommendations.";
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
      response: msg,
      provider: 'gemini_ai_fallback'
    };
  }

  // 2.5 CONTEXTUAL ALTERNATIVES / LESS SPICY REQUESTS
  const isAlternativeRequest = (
    lower.includes('then give me') || lower.includes('give me something') || lower.includes('suggest an alternative') ||
    lower.includes('less spicy') || lower.includes('something mild') || lower.includes('ಹಾಗಾದರೆ') ||
    lower.includes('ಖಾರ ಕಡಿಮೆ') || lower.includes('ಸೌಮ್ಯ') || lower.includes('तो फिर') || lower.includes('कम तीखा')
  );
  if (isAlternativeRequest && (lower.includes('less spicy') || lower.includes('mild') || lower.includes('ಖಾರ ಕಡಿಮೆ') || lower.includes('ಸೌಮ್ಯ') || lower.includes('कम तीखा'))) {
    const milds = menuItems.filter(m => m.isAvailable !== false && (!m.dietaryTags?.includes('spicy') || m.dietaryTags?.includes('mild') || m.categorySlug === 'desserts' || m.categorySlug === 'beverages')).slice(0, 3).map(m => m.name);
    const msg = activeLang === 'kn-IN'
      ? `ಖಾರ ಕಡಿಮೆ ಇರುವ ಸೌಮ್ಯ ಆಯ್ಕೆಗಳಿಗೆ: ${milds.join(', ')} ಅತ್ಯುತ್ತಮ. ಯಾವುದನ್ನು ಸೇರಿಸಲೇ?`
      : activeLang === 'hi-IN'
        ? `कम तीखे और सादे व्यंजनों में: ${milds.join(', ')} बढ़िया विकल्प हैं। क्या इनमें से कुछ जोड़ दूँ?`
        : `For milder dishes with less spice, I recommend: ${milds.join(', ')}. Would you like me to add one of these?`;
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
      provider: 'gemini_ai_fallback'
    };
  }

  // 3. MENU QUERY (What is available / Categories / Dietary / Low Spice)
  if (lower.includes('what do you have') || lower.includes('show menu') || lower.includes('what is available') ||
      lower.includes('menu options') || lower.includes('categories') || lower.includes('what drinks') ||
      lower.includes('what starters') || lower.includes('what desserts') ||
      lower.includes('vegetarian') || lower.includes('pure veg') || lower.includes('veg food') || lower.includes('something vegetarian') ||
      lower.includes('without much spice') || lower.includes('not spicy') || lower.includes('anything mild') ||
      lower.includes('ಮೆನು') || lower.includes('ಏನಿದೆ') || lower.includes('ಏನು ಸಿಗುತ್ತೆ') || lower.includes('ತಿಂಡಿಗೆ') || lower.includes('ಶಾಕಾಹಾರಿ') || lower.includes('ಸಸ್ಯಾಹಾರಿ') || lower.includes('ಖಾರ ಕಡಿಮೆ ಇರುವುದು') || lower.includes('ಖಾರ ಇಲ್ಲದ') ||
      lower.includes('मेनू') || lower.includes('क्या मिलेगा') || lower.includes('क्या उपलब्ध है') || lower.includes('शाकाहारी') || lower.includes('बिना तीखे') || lower.includes('कम तीखा')) {
    let msg = '';
    if (lower.includes('vegetarian') || lower.includes('pure veg') || lower.includes('veg food') || lower.includes('something vegetarian') || lower.includes('ಶಾಕಾಹಾರಿ') || lower.includes('ಸಸ್ಯಾಹಾರಿ') || lower.includes('शाकाहारी') || lower.includes('वेज')) {
      const vegDishes = menuItems.filter(m => m.type === 'veg' && m.isAvailable !== false).slice(0, 4).map(m => m.name);
      msg = activeLang === 'kn-IN'
        ? `ನಮ್ಮಲ್ಲಿ ಲಭ್ಯವಿರುವ ಮುಖ್ಯ ಶಾಕಾಹಾರಿ ತಿಂಡಿಗಳು: ${vegDishes.join(', ')}. ನೀವು ಯಾವುದು ಬಯಸುತ್ತೀರಿ?`
        : activeLang === 'hi-IN'
          ? `हमारे मुख्य शाकाहारी व्यंजनों में शामिल हैं: ${vegDishes.join(', ')}। आप क्या पसंद करेंगे?`
          : `Our pure vegetarian specialties include: ${vegDishes.join(', ')}. What would you like to order?`;
    } else if (lower.includes('without much spice') || lower.includes('less spice') || lower.includes('not spicy') || lower.includes('anything mild') || lower.includes('ಖಾರ ಕಡಿಮೆ ಇರುವುದು') || lower.includes('ಖಾರ ಇಲ್ಲದ') || lower.includes('बिना तीखे') || lower.includes('कम तीखा')) {
      const mildDishes = menuItems.filter(m => m.isAvailable !== false && (!m.dietaryTags?.includes('spicy') || m.dietaryTags?.includes('mild') || m.categorySlug === 'desserts')).slice(0, 3).map(m => m.name);
      msg = activeLang === 'kn-IN'
        ? `ಖಾರವಿಲ್ಲದ ಸೌಮ್ಯ ತಿಂಡಿಗಳಿಗೆ: ${mildDishes.join(', ')} ಅತ್ಯುತ್ತಮ. ನೀವು ಯಾವುದನ್ನು ಆದೇಶಿಸಲು ಬಯಸುತ್ತೀರಿ?`
        : activeLang === 'hi-IN'
          ? `कम तीखे और सादे व्यंजनों में: ${mildDishes.join(', ')} बढ़िया विकल्प हैं। आप क्या लेना चाहेंगे?`
          : `For mild dishes without much spice, we have: ${mildDishes.join(', ')}. Which one would you prefer?`;
    } else if (lower.includes('drink') || lower.includes('beverage') || lower.includes('ಕುಡಿಯಲು') || lower.includes('पेय')) {
      const drinks = menuItems.filter(m => m.categorySlug === 'beverages' && m.isAvailable !== false).map(m => m.name);
      msg = activeLang === 'kn-IN'
        ? `ನಮ್ಮಲ್ಲಿ ಲಭ್ಯವಿರುವ ಪಾನೀಯಗಳು: ${drinks.join(', ')}.`
        : activeLang === 'hi-IN'
          ? `हमारे पेय पदार्थों में शामिल हैं: ${drinks.join(', ')}।`
          : `Our available beverages include: ${drinks.join(', ')}.`;
    } else if (lower.includes('starter') || lower.includes('ತಿಂಡಿ') || lower.includes('स्टार्टर')) {
      const starters = menuItems.filter(m => m.categorySlug === 'starters' && m.isAvailable !== false).map(m => m.name);
      msg = activeLang === 'kn-IN'
        ? `ನಮ್ಮ ಸ್ಟಾರ್ಟರ್ಸ್‌ಗಳು: ${starters.join(', ')}.`
        : activeLang === 'hi-IN'
          ? `हमारे स्टार्टर्स में शामिल हैं: ${starters.join(', ')}।`
          : `Our starters include: ${starters.join(', ')}.`;
    } else if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('ಸಿಹಿ') || lower.includes('मीठा')) {
      const desserts = menuItems.filter(m => m.categorySlug === 'desserts' && m.isAvailable !== false).map(m => m.name);
      msg = activeLang === 'kn-IN'
        ? `ನಮ್ಮ ಸಿಹಿ ತಿನಿಸುಗಳು: ${desserts.join(', ')}.`
        : activeLang === 'hi-IN'
          ? `हमारे मीठे व्यंजनों में शामिल हैं: ${desserts.join(', ')}।`
          : `Our desserts include: ${desserts.join(', ')}.`;
    } else {
      msg = activeLang === 'kn-IN'
        ? 'ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ Starters, Main Course, Biryani & Rice, South Indian Beverages ಮತ್ತು Desserts ಲಭ್ಯವಿದೆ. ನಿಮಗೆ ಯಾವುದು ಬೇಕು?'
        : activeLang === 'hi-IN'
          ? 'हमारे मेनू में Starters, Main Course, Biryani & Rice, South Indian Beverages और Desserts उपलब्ध हैं। आप क्या पसंद करेंगे?'
          : 'Our menu features Starters, Main Course Curries, Biryani & Rice, South Indian Beverages, and Desserts. What would you like?';
    }
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
      provider: 'gemini_ai_fallback'
    };
  }

  // 4. PRICE QUERY ("How much is...", "Price of...", "Cost of...")
  if (lower.includes('how much') || lower.includes('price of') || lower.includes('cost of') || lower.includes('rate of') ||
      lower.includes('ಬೆಲೆ ಎಷ್ಟು') || lower.includes('ದರ ಎಷ್ಟು') || lower.includes('ರೇಟ್ ಎಷ್ಟು') ||
      lower.includes('कीमत क्या') || lower.includes('कितने का है') || lower.includes('रेट क्या')) {
    const dish = findReferencedDish(lower);
    if (dish && dish.price) {
      const msg = language === 'kn-IN'
        ? `${dish.name} ಬೆಲೆ ₹${dish.price}. ನೀವು ಇದನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುವಿರಾ?`
        : language === 'hi-IN'
          ? `${dish.name} की कीमत ₹${dish.price} है। क्या आप इसे ऑर्डर करना चाहेंगे?`
          : `${dish.name} is ₹${dish.price}. Would you like to order it?`;
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
        provider: 'gemini_ai_fallback'
      };
    }
  }

  // 5. INGREDIENT & ALLERGEN & SPICE QUERY ("Is it spicy?", "Does it have nuts?", "Ingredients in...")
  if (lower.includes('ingredient') || lower.includes('is it spicy') || lower.includes('is it mild') ||
      lower.includes('does it have') || lower.includes('contain') || lower.includes('made of') ||
      lower.includes('is it veg') || lower.includes('is it jain') ||
      lower.includes('ಖಾರವೇ') || lower.includes('ಸಾಮಗ್ರಿಗಳು') || lower.includes('ಅಡಕಗಳು') ||
      lower.includes('तीखा है क्या') || lower.includes('क्या इसमें') || lower.includes('सामग्री')) {
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
      } else if (lower.includes('veg') || lower.includes('nonveg') || lower.includes('ಶಾಕಾಹಾರಿ') || lower.includes('शाकाहारी')) {
        const isVeg = matchedModel.type === 'veg';
        reply = language === 'kn-IN'
          ? `${dish.name} ${isVeg ? 'ಸಂಪೂರ್ಣ ಶಾಕಾಹಾರಿ (Pure Veg)' : 'ಮಾಂಸಾಹಾರಿ (Non-Veg)'} ಆಗಿದೆ.`
          : language === 'hi-IN'
            ? `${dish.name} ${isVeg ? 'शुद्ध शाकाहारी (Pure Veg)' : 'मांसाहारी (Non-Veg)'} है।`
            : `${dish.name} is ${isVeg ? '100% vegetarian' : 'non-vegetarian'}.`;
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
        provider: 'gemini_ai_fallback'
      };
    }
  }

  // 6. RECOMMENDATIONS (Natural queries: "What should I eat?", "Suggest something nice", "I'm confused", etc.)
  if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('special') ||
      lower.includes('bestseller') || lower.includes('popular') || lower.includes('what should i') ||
      lower.includes('suggest something') || lower.includes('what is good') || lower.includes('confused') || lower.includes('what to eat') ||
      lower.includes('ಶಿಫಾರಸು') || lower.includes('ಸ್ಪೆಷಲ್') || lower.includes('ಸೂಚಿಸಿ') || lower.includes('ತಿನ್ನಲು') ||
      lower.includes('ಒಳ್ಳೆಯದನ್ನು') || lower.includes('ಚೆನ್ನಾಗಿದೆ') || lower.includes('ಗೊಂದಲ') || lower.includes('ಯಾವುದು ತಗೋಳಿ') ||
      lower.includes('सलाह') || lower.includes('स्पेशल') || lower.includes('क्या खाना चाहिए') || lower.includes('क्या खाऊँ') ||
      lower.includes('कुछ अच्छा') || lower.includes('बढ़िया') || lower.includes('यहाँ क्या अच्छा है') || lower.includes('कन्फ्यूज') ||
      lower.includes('olleyadu') || lower.includes('chennagide') || lower.includes('suchisi') || lower.includes('achha batao') || lower.includes('badhiya')) {
    let responseText = '';
    if (lower.includes('mild') || lower.includes('not too spicy') || lower.includes('less spicy') || lower.includes('sweet') || lower.includes('ಸಿಹಿ')) {
      const mildDishes = menuItems.filter(m => m.isAvailable !== false && (m.dietaryTags?.includes('mild') || m.categorySlug === 'desserts' || m.name.includes('Dosa'))).slice(0, 3).map(m => m.name);
      responseText = activeLang === 'kn-IN'
        ? `ಖಾರವಿಲ್ಲದ ಸೌಮ್ಯ ಆಯ್ಕೆಗಳಿಗೆ: ${mildDishes.join(', ')} ಅತ್ಯುತ್ತಮ.`
        : activeLang === 'hi-IN'
          ? `कम तीखे और हल्के व्यंजनों के लिए: ${mildDishes.join(', ')} बढ़िया विकल्प हैं।`
          : `For mild dishes that aren't too spicy, I recommend: ${mildDishes.join(', ')}.`;
    } else if (lower.includes('spicy') || lower.includes('ಖಾರ') || lower.includes('तीखा')) {
      const spicyDishes = menuItems.filter(m => m.isAvailable !== false && (m.dietaryTags?.includes('spicy') || m.name.includes('Manchurian') || m.name.includes('Kabab') || m.name.includes('Biryani'))).slice(0, 3).map(m => m.name);
      responseText = activeLang === 'kn-IN'
        ? `ಖಾರವಾದ ರುಚಿಗೆ: ${spicyDishes.join(', ')} ಪ್ರಯತ್ನಿಸಿ.`
        : activeLang === 'hi-IN'
          ? `तीखे खाने के शौकीनों के लिए: ${spicyDishes.join(', ')} बेहद लोकप्रिय हैं।`
          : `For spicy favorites, I highly recommend: ${spicyDishes.join(', ')}.`;
    } else {
      const specials = menuItems.filter(m => m.isSpecial && m.isAvailable !== false).slice(0, 3).map(m => m.name);
      responseText = activeLang === 'kn-IN'
        ? `ನಮ್ಮ ಇಂದಿನ ಮುಖ್ಯ ಶೆಫ್ ಸ್ಪೆಷಲ್ಸ್: ${specials.join(', ')}.`
        : activeLang === 'hi-IN'
          ? `हमारे शेफ के आज के खास स्पेशल: ${specials.join(', ')} हैं।`
          : `Our chef's top recommendations today are: ${specials.join(', ')}. Would you like to try any?`;
    }
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
      response: responseText,
      provider: 'gemini_ai_fallback'
    };
  }

  // 7. CONFIRM ("Yes", "Confirm", "Proceed", "Place order")
  if (/^(yes|confirm|correct|proceed|okay|ok|done|place order|add it|add them|yes please|sure|yep|yeah)\b/i.test(lower) ||
      /^(ಹೌದು|ಸರಿ|ಖಚಿತ|ಆರ್ಡರ್ ಮಾಡಿ|ಖಚಿತಪಡಿಸಿ|ಆಯಿತು|ಹಾ)/i.test(lower) ||
      /^(हाँ|हाँजी|हाँ जी|कन्फर्म|सही है|ऑर्डर करो|ठीक है|हाँ ठीक है|हां)/i.test(lower)) {
    const msg = activeLang === 'kn-IN'
      ? 'ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ. ಕಾರ್ಟ್‌ಗೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.'
      : activeLang === 'hi-IN'
        ? 'आपका ऑर्डर कन्फर्म हो गया है। कार्ट पर ले जा रहे हैं।'
        : 'Your order is confirmed. Taking you to the cart.';
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
      response: msg,
      provider: 'gemini_ai_fallback'
    };
  }

  // 7.5 MIND CHANGE / REPLACEMENT ("I changed my mind", "Can I have something else instead?")
  if (lower.includes('changed my mind') || lower.includes('change my mind') || lower.includes('something else instead') ||
      lower.includes('ಮನಸ್ಸು ಬದಲಾಗಿದೆ') || lower.includes('ಯೋಚನೆ ಬದಲಾಗಿದೆ') || lower.includes('ಬೇರೆ ಏನಾದರೂ ಕೊಡಿ') ||
      lower.includes('मन बदल गया') || lower.includes('इसके बदले कुछ और')) {
    const msg = activeLang === 'kn-IN'
      ? 'ಖಂಡಿತ, ನಿಮ್ಮ ಮನಸ್ಸು ಬದಲಾಗಿದ್ದರೆ ಪರವಾಗಿಲ್ಲ! ಬದಲಿಗೆ ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?'
      : activeLang === 'hi-IN'
        ? 'कोई बात नहीं! आप इसके बदले क्या ऑर्डर करना चाहेंगे?'
        : 'No problem at all! What would you like to order instead?';
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
      confidence: 0.96,
      response: msg,
      provider: 'gemini_ai_fallback'
    };
  }

  // 8. CANCEL / CLEAR ("No", "Cancel", "Clear", "Reset", "Never mind", "Discard")
  if (/^(no|cancel|stop|reset|clear|discard|never mind|cancel order|dont order|beda|nahi)\b/i.test(lower) ||
      /^(ಬೇಡ|ರದ್ದು|ತಪ್ಪು|ಬೇಡವೇ ಬೇಡ|ಕ್ಯಾನ್ಸಲ್)/i.test(lower) ||
      /^(नहीं|रद्द|गलत|वापस|कैंसिल|मत करो|कैंसिल करो)/i.test(lower)) {
    const msg = language === 'kn-IN'
      ? 'ಸರಿ, ಆರ್ಡರ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಬದಲಿಗೆ ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?'
      : language === 'hi-IN'
        ? 'ठीक है, ऑर्डर रद्द कर दिया गया है। आप इसके बदले क्या लेना चाहेंगे?'
        : 'Okay, order cancelled. What would you like to order instead?';
    return {
      success: true,
      intent: 'CANCEL',
      action: 'CLEAR',
      items: [],
      updatedOrder: [],
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems: [],
      lastDiscussedDish: null,
      confidence: 0.98,
      response: msg,
      provider: 'gemini_ai_fallback'
    };
  }

  // 9. REMOVE ITEM ("Remove the coffee", "Drop the soup", "Remove the last item", "ಕೊನೆಯ ತಿಂಡಿ ತೆಗೆದುಹಾಕಿ")
  if (lower.includes('remove') || lower.includes('drop') || lower.includes('delete') ||
      lower.includes("don't want") || lower.includes('dont want') || lower.includes('take off') ||
      lower.includes('ತೆಗೆದುಹಾಕಿ') || lower.includes('ಬೇಡ') || lower.includes('ಹಟಾವೋ') || lower.includes('हटाओ') || lower.includes('निकाल दो')) {
    // Relative last item removal
    const isLastItemRemoval = lower.includes('last item') || lower.includes('last one') || lower.includes('ಕೊನೆಯ') || lower.includes('आखिरी') || lower.includes('लास्ट');
    if (isLastItemRemoval && currentOrder && currentOrder.length > 0) {
      const removedDish = currentOrder[currentOrder.length - 1];
      const targetName = removedDish.name || removedDish.dish?.name;
      const updated = currentOrder.slice(0, -1);
      const msg = activeLang === 'kn-IN'
        ? `ಸರಿ, ನಿಮ್ಮ ಆರ್ಡರ್‌ನಿಂದ ${targetName} ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`
        : activeLang === 'hi-IN'
          ? `ज़रूर, मैंने आपके ऑर्डर से ${targetName} हटा दिया है।`
          : `Sure, I've removed ${targetName} from your order.`;
      return {
        success: true,
        intent: 'REMOVE_ITEM',
        action: 'REMOVE',
        items: [],
        updatedOrder: updated,
        targetItem: targetName,
        requiresClarification: false,
        clarificationQuestion: '',
        unrecognizedItems: [],
        lastDiscussedDish: null,
        confidence: 0.98,
        response: msg,
        provider: 'gemini_ai_fallback'
      };
    }

    let dishToRemove = findReferencedDish(lower);
    if (!dishToRemove && currentOrder && currentOrder.length > 0) {
      dishToRemove = currentOrder.find(item => {
        const iName = (item.name || item.dish?.name || '').toLowerCase();
        return iName.split(/\s+/).some(w => w.length > 3 && lower.includes(w));
      });
    }

    if (dishToRemove && currentOrder && currentOrder.length > 0) {
      const remName = (dishToRemove.name || '').toLowerCase();
      const updated = currentOrder.filter(item => {
        const iName = (item.name || item.dish?.name || '').toLowerCase();
        return !iName.includes(remName) && !remName.includes(iName);
      });
      const msg = activeLang === 'kn-IN'
        ? `ಸರಿ, ನಿಮ್ಮ ಆರ್ಡರ್‌ನಿಂದ ${dishToRemove.name} ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`
        : activeLang === 'hi-IN'
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
        provider: 'gemini_ai_fallback'
      };
    }
  }

  // 10. QUANTITY MODIFICATION & INCREMENTS ("Give me one more", "Make that three", "Change dosa to 2")
  const isIncrementOne = (
    lower.includes('one more') || lower.includes('give me one more') || lower.includes('add one more') ||
    lower.includes('ಇನ್ನೊಂದು ಕೊಡಿ') || lower.includes('ಇನ್ನೊಂದು') || lower.includes('ಒಂದು ಹೆಚ್ಚು') ||
    lower.includes('एक और दो') || lower.includes('एक और') || lower.includes('ek aur')
  );

  if (isIncrementOne && currentOrder && currentOrder.length > 0) {
    const targetItem = findReferencedDish(lower) || (lastDiscussedDish ? menuItems.find(m => m.name.toLowerCase() === lastDiscussedDish.toLowerCase()) : null) || currentOrder[currentOrder.length - 1];
    const targetName = targetItem.name || targetItem.dish?.name;
    const updated = currentOrder.map(i => {
      const iName = (i.name || i.dish?.name || '').toLowerCase();
      if (iName.includes(targetName.toLowerCase()) || targetName.toLowerCase().includes(iName)) {
        const newQ = (i.quantity || 1) + 1;
        const price = i.price || (i.dish && i.dish.price) || 0;
        return { ...i, quantity: newQ, subtotal: price * newQ };
      }
      return i;
    });
    const updatedItem = updated.find(i => (i.name || i.dish?.name || '').toLowerCase().includes(targetName.toLowerCase())) || updated[0];
    const msg = activeLang === 'kn-IN'
      ? `ಖಂಡಿತ! ಇನ್ನೊಂದು ${targetName} ಸೇರಿಸಲಾಗಿದೆ, ಈಗ ನಿಮ್ಮ ಆರ್ಡರ್‌ನಲ್ಲಿ ಒಟ್ಟು ${updatedItem.quantity}.`
      : activeLang === 'hi-IN'
        ? `ज़रूर! एक और ${targetName} जोड़ दिया है, अब आपके ऑर्डर में कुल ${updatedItem.quantity} हैं।`
        : `Certainly! I've added one more ${targetName}, making it ${updatedItem.quantity} in your order.`;
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
      provider: 'gemini_ai_fallback'
    };
  }

  if (lower.includes('make that') || lower.includes('make it') || lower.includes('change') ||
      lower.includes('instead of') || lower.includes('quantity to') || lower.includes('ಬದಲಾಯಿಸಿ') || lower.includes('ಮಾಡಿ') || lower.includes('बदलो') || lower.includes('कर दो')) {
    // Extract new quantity number
    let newQty = 1;
    for (const [w, v] of Object.entries(numMap)) {
      if (new RegExp('\\b' + w + '\\b', 'i').test(lower)) {
        newQty = v;
        break;
      }
    }
    const digitMatch = lower.match(/\b(\d+)\b/);
    if (digitMatch) newQty = parseInt(digitMatch[1], 10) || newQty;

    // Check which item is targeted
    const explicitDish = findReferencedDish(lower);

    // If ambiguous: multiple items in currentOrder and customer says "make that three" without naming dish
    if (!explicitDish && currentOrder && currentOrder.length > 1) {
      const itemNames = currentOrder.map(i => i.name || i.dish?.name);
      const question = activeLang === 'kn-IN'
        ? `ನೀವು 3 ${itemNames.join(' ಅಥವಾ 3 ')} ಎಂದು ಹೇಳುತ್ತಿದ್ದೀರಾ?`
        : activeLang === 'hi-IN'
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
        provider: 'gemini_ai_fallback'
      };
    }

    // Unambiguous: either target dish is explicitly named or only 1 item in order or resolved by lastDiscussedDish
    const targetItemName = explicitDish ? explicitDish.name : (lastDiscussedDish || (currentOrder[0] && (currentOrder[0].name || currentOrder[0].dish?.name)));
    if (targetItemName && currentOrder && currentOrder.length > 0) {
      const updated = currentOrder.map(i => {
        const iName = (i.name || i.dish?.name || '').toLowerCase();
        if (iName.includes(targetItemName.toLowerCase()) || targetItemName.toLowerCase().includes(iName)) {
          const price = i.price || (i.dish && i.dish.price) || 0;
          return { ...i, quantity: newQty, subtotal: price * newQty };
        }
        return i;
      });
      const qtyWord = getQuantityWord(newQty, activeLang);
      const msg = activeLang === 'kn-IN'
        ? `ಸರಿ! ${targetItemName} ಪ್ರಮಾಣವನ್ನು ${qtyWord} ಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.`
        : activeLang === 'hi-IN'
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
        provider: 'gemini_ai_fallback'
      };
    }
  }

  // 11. CHECK FOR OFF-MENU REQUESTS (Pizza, Burger, Pasta, etc.)
  const commonUnknownDishes = [
    { key: 'paneer tikka', name: 'Paneer Tikka', alt: 'Paneer Butter Masala' },
    { key: 'tikka', name: 'Tikka', alt: 'Chicken Kabab' },
    { key: 'pizza', name: 'Pizza', alt: 'Crispy Veg Samosa' },
    { key: 'burger', name: 'Burger', alt: 'Crispy Veg Samosa or Peri Peri French Fries' },
    { key: 'pasta', name: 'Pasta', alt: 'Veg Fried Rice' },
    { key: 'noodles', name: 'Noodles', alt: 'Veg Fried Rice' },
    { key: 'ice cream', name: 'Ice Cream', alt: 'Cold Coffee with Ice Cream' }
  ];

  const unrecognizedItems = [];
  let suggestedAlternative = '';
  for (const unk of commonUnknownDishes) {
    if (lower.includes(unk.key) && !menuItems.some(m => m.name.toLowerCase().includes(unk.key))) {
      unrecognizedItems.push(unk.name);
      if (!suggestedAlternative) suggestedAlternative = unk.alt;
    }
  }

  // 12. FOOD ORDER PARSING (Single or multiple items, additions, grounding)
  const matchedItems = [];
  menuItems.forEach((menuItem) => {
    const dishNameLower = menuItem.name.toLowerCase();
    let found = false;
    let qty = 1;

    if (lower.includes(dishNameLower)) {
      found = true;
    } else {
      for (const [syn, canonical] of Object.entries(synonymMap)) {
        if (canonical.toLowerCase() === dishNameLower && new RegExp('(^|\\s|\\b)' + syn + '(\\b|\\s|$)', 'i').test(lower)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      // Find quantity associated with this dish
      for (const [word, val] of Object.entries(numMap)) {
        const regex1 = new RegExp('\\b' + word + '\\s+([a-zA-Z\\u0C80-\\u0CFF\\u0900-\\u097F\\s]*)' + dishNameLower.slice(0, 4), 'i');
        const regex2 = new RegExp(dishNameLower.slice(0, 4) + '([a-zA-Z\\u0C80-\\u0CFF\\u0900-\\u097F\\s]*)\\b' + word + '\\b', 'i');
        if (regex1.test(lower) || regex2.test(lower)) {
          qty = val;
          break;
        }
        const digitRegex = new RegExp('(\\d+)\\s+([a-zA-Z\\u0C80-\\u0CFF\\u0900-\\u097F\\s]*)' + dishNameLower.slice(0, 4), 'i');
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
      if (lower.includes('less ice') || lower.includes('no ice')) cust.push('Less Ice');

      matchedItems.push({
        name: menuItem.name,
        menuItemId: menuItem._id ? menuItem._id.toString() : menuItem.id,
        quantity: Math.max(1, qty),
        price: menuItem.price,
        customizations: cust
      });
    }
  });

  // If items were matched from menu
  if (matchedItems.length > 0) {
    // Merge with currentOrder if an existing draft exists
    let updatedOrder = [...currentOrder];
    for (const matched of matchedItems) {
      const existingIdx = updatedOrder.findIndex(i => (i.name || i.dish?.name || '').toLowerCase() === matched.name.toLowerCase());
      if (existingIdx >= 0) {
        updatedOrder[existingIdx] = {
          ...updatedOrder[existingIdx],
          quantity: updatedOrder[existingIdx].quantity + matched.quantity,
          subtotal: matched.price * (updatedOrder[existingIdx].quantity + matched.quantity)
        };
      } else {
        updatedOrder.push({
          ...matched,
          subtotal: matched.price * matched.quantity
        });
      }
    }

    let responseText = '';
    if (matchedItems.length === 1) {
      const item = matchedItems[0];
      const qtyWord = getQuantityWord(item.quantity, language);
      responseText = language === 'kn-IN'
        ? `ಖಂಡಿತ! ${qtyWord} ${item.name}. ಇನ್ನೇನಾದರೂ ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?`
        : language === 'hi-IN'
          ? `ज़रूर! ${qtyWord} ${item.name} जोड़ दिया है। क्या आप कुछ और लेना चाहेंगे?`
          : `Sure! ${qtyWord} ${item.name}. Would you like anything else with that?`;
    } else {
      const summaryEn = matchedItems.map(i => `${getQuantityWord(i.quantity, 'en-IN')} ${i.name}`).join(' and ');
      const summaryKn = matchedItems.map(i => `${getQuantityWord(i.quantity, 'kn-IN')} ${i.name}`).join(' ಮತ್ತು ');
      const summaryHi = matchedItems.map(i => `${getQuantityWord(i.quantity, 'hi-IN')} ${i.name}`).join(' और ');
      responseText = language === 'kn-IN'
        ? `ಖಂಡಿತ! ${summaryKn} ಸೇರಿಸಲಾಗಿದೆ. ಇನ್ನೇನಾದರೂ ಬೇಕೇ?`
        : language === 'hi-IN'
          ? `ज़रूर! ${summaryHi} जोड़ दिए हैं। क्या आप कुछ और लेना चाहेंगे?`
          : `Certainly! ${summaryEn}. Would you like anything else?`;
    }

    if (unrecognizedItems.length > 0) {
      responseText += language === 'kn-IN'
        ? ` (ಗಮನಿಸಿ: "${unrecognizedItems.join(', ')}" ಲಭ್ಯವಿಲ್ಲ${suggestedAlternative ? `, ಬದಲಿಗೆ ${suggestedAlternative} ಪ್ರಯತ್ನಿಸಬಹುದು` : ''})`
        : language === 'hi-IN'
          ? ` (ध्यान दें: "${unrecognizedItems.join(', ')}" उपलब्ध नहीं है${suggestedAlternative ? `, इसके बदले ${suggestedAlternative} ले सकते हैं` : ''})`
          : ` (Note: ${unrecognizedItems.join(', ')} is not on the menu${suggestedAlternative ? `, but our ${suggestedAlternative} is a great alternative` : ''})`;
    }

    return {
      success: true,
      intent: currentOrder.length > 0 ? 'ADD_ITEM' : 'ORDER',
      action: 'ADD',
      items: matchedItems,
      updatedOrder: updatedOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems,
      lastDiscussedDish: matchedItems[0].name,
      confidence: 0.96,
      response: responseText,
      provider: 'gemini_ai_fallback'
    };
  }

  // If customer requested an off-menu item with 0 menu matches
  if (unrecognizedItems.length > 0) {
    const unMsg = language === 'kn-IN'
      ? `ಕ್ಷಮಿಸಿ, "${unrecognizedItems.join(', ')}" ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.${suggestedAlternative ? ` ನೀವು ${suggestedAlternative} ಪ್ರಯತ್ನಿಸಲು ಬಯಸುತ್ತೀರಾ?` : ''}`
      : language === 'hi-IN'
        ? `क्षमा करें, "${unrecognizedItems.join(', ')}" हमारे मेनू में उपलब्ध नहीं है।${suggestedAlternative ? ` क्या आप ${suggestedAlternative} आज़माना चाहेंगे?` : ''}`
        : `Sorry, we don't serve ${unrecognizedItems.join(', ')} on our menu.${suggestedAlternative ? ` Would you like to try our popular ${suggestedAlternative} instead?` : ''}`;
    return {
      success: true,
      intent: 'ORDER',
      action: 'NONE',
      items: [],
      updatedOrder: currentOrder,
      requiresClarification: false,
      clarificationQuestion: '',
      unrecognizedItems,
      lastDiscussedDish,
      confidence: 0.88,
      response: unMsg,
      provider: 'gemini_ai_fallback'
    };
  }

  // Fallback for uninterpretable input
  const unkMsg = language === 'kn-IN'
    ? "ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ನಿಮ್ಮ ತಿಂಡಿಯನ್ನು ಹೇಳಿ (ಉದಾ: 'ಎರಡು ಮಸಾಲ ದೋಸೆ') ಅಥವಾ ಶಿಫಾರಸು ಕೇಳಿ."
    : language === 'hi-IN'
      ? "मैं समझ नहीं पाया। कृपया अपना ऑर्डर बोलें (जैसे: 'दो मसाला डोसा') या मेनू की जानकारी लें।"
      : "I didn't quite catch that. You can tell me what you'd like to eat (e.g. 'Two Masala Dosas') or ask for recommendations.";

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
    provider: 'gemini_ai_fallback'
  };
};

/**
 * POST /api/voice/parse-intent
 * Intelligent Natural Language Understanding (NLU) & Conversational Assistant via Google Gemini
 * Strictly grounded against active MongoDB Menu, KnowledgeDocs, and full multi-turn conversation session.
 */
router.post('/parse-intent', async (req, res) => {
  try {
    const {
      text,
      language = 'en-IN',
      menu: clientMenu = [],
      conversationHistory = [],
      currentOrder = [],
      lastDiscussedDish = null
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'text is required for intent parsing'
      });
    }

    let activeMenu = clientMenu;
    let knowledgeDocs = [];

    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        if (!Array.isArray(activeMenu) || activeMenu.length === 0) {
          activeMenu = await MenuItem.find({ isAvailable: true })
            .select('name price categorySlug type isSpecial dietaryTags ingredients description')
            .lean();
        }
        knowledgeDocs = await KnowledgeDoc.find({}).lean();
      }
    } catch (dbErr) {
      console.warn('[voiceRoutes] MongoDB read error, continuing with fallback menu:', dbErr.message);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isGeminiKeyConfigured = Boolean(
      apiKey && apiKey.trim() !== '' && !apiKey.includes('your_gemini')
    );

    if (!isGeminiKeyConfigured) {
      const fallbackResult = buildGroundedFallbackResponse(
        text,
        language,
        activeMenu,
        knowledgeDocs,
        conversationHistory,
        currentOrder,
        lastDiscussedDish
      );
      return res.json(fallbackResult);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const menuContext = activeMenu.map(m =>
        `- "${m.name}" (ID: ${m._id || m.id}, Price: ₹${m.price}, Category: ${m.categorySlug}, Type: ${m.type}, Special: ${m.isSpecial ? 'Yes' : 'No'}, Tags: ${m.dietaryTags?.join(', ') || 'none'}, Ingredients: ${m.ingredients?.join(', ') || 'none'}, Description: ${m.description || ''})`
      ).join('\n');

      const knowledgeContext = knowledgeDocs.map(k =>
        `- [${k.category.toUpperCase()}] ${k.title}: ${k.content}`
      ).join('\n');

      const historyContext = conversationHistory && conversationHistory.length > 0
        ? conversationHistory.slice(-8).map(h => `${h.role === 'user' ? 'Customer' : 'Assistant'}: "${h.text}"`).join('\n')
        : 'None (Start of conversation)';

      const currentOrderContext = currentOrder && currentOrder.length > 0
        ? currentOrder.map(i => `- ${i.quantity}x "${i.name || i.dish?.name}" (₹${i.price || (i.dish && i.dish.price) || 0}) ${i.customizations?.length ? `[${i.customizations.join(', ')}]` : ''}`).join('\n')
        : 'Empty (No items in draft)';

      const systemPrompt = `You are RESTOSMART's Natural Conversational Restaurant Voice Assistant for an intelligent self-service kiosk.
You act like a warm, attentive, expert restaurant waiter. Customers can speak naturally, ask questions about dishes and prices, change quantities, remove items, request dietary advice, and switch their minds.

ACTIVE RESTAURANT MENU (STRICT GROUND TRUTH):
${menuContext}

RESTAURANT KNOWLEDGE BASE & POLICIES:
${knowledgeContext}

CONVERSATION SESSION CONTEXT:
Customer Selected Language: ${language} (en-IN: Indian English, kn-IN: Kannada, hi-IN: Hindi)
Previous Conversation Turns:
${historyContext}

Current Draft Order:
${currentOrderContext}

Last Discussed Dish: ${lastDiscussedDish || 'None'}

CONVERSATIONAL & GROUNDING RULES:
1. STRICT GROUNDING: ONLY recognize dishes present in the ACTIVE RESTAURANT MENU. Never invent dishes, prices, ingredients, or availability.
2. OFF-MENU REQUESTS: If customer asks for items NOT on the menu (e.g. Pizza, Burger, Pasta, Paneer Tikka), place them in "unrecognizedItems", DO NOT add them to order, politely explain unavailable, and suggest a real available menu item.
3. PRONOUN RESOLUTION: Resolve "it", "that", "this", "ಅದು", "ಇದು", "यह", "इसे" using Last Discussed Dish or the single item in Current Draft Order.
4. AMBIGUOUS QUANTITY CORRECTIONS: If customer says "make that three" or "actually three", and Current Draft Order contains MORE THAN ONE item and text does not name which item, set "intent" to "ASK_CLARIFICATION", "requiresClarification" to true, and ask a polite clarifying question (e.g. "Do you mean three Masala Dosas or three coffees?"). DO NOT alter quantities until clarified.
5. QUANTITY CHANGES: If customer says "actually make that three" and the target dish is unambiguous, set intent to "MODIFY_QUANTITY", action to "UPDATE_QUANTITY", and update the quantity in "updatedOrder".
6. ITEM REMOVAL: If customer says "remove the coffee" or "drop the soup", set intent to "REMOVE_ITEM", action to "REMOVE", and remove that dish from "updatedOrder".
7. INGREDIENTS & ALLERGENS: Answer truthfully using menu ingredients and dietary tags. If not listed, state that kitchen staff can confirm.
8. NATURAL LANGUAGE RESPONSES: Respond naturally in the customer's selected language (${language === 'kn-IN' ? 'Kannada (ಕನ್ನಡ)' : language === 'hi-IN' ? 'Hindi (हिन्दी)' : 'English'}). Be polite, friendly, and helpful like a real waiter. Avoid robotic boilerplate.

STRUCTURED INTENTS:
- "GREETING", "MENU_QUERY", "ITEM_QUERY", "PRICE_QUERY", "INGREDIENT_QUERY", "RECOMMENDATION", "ORDER", "ADD_ITEM", "MODIFY_QUANTITY", "REMOVE_ITEM", "MODIFY_CUSTOMIZATION", "CONFIRM", "CANCEL", "ASK_CLARIFICATION", "HELP", "UNKNOWN"

ACTIONS:
- "ADD", "REMOVE", "UPDATE_QUANTITY", "UPDATE_CUSTOMIZATION", "CLEAR", "NONE"

Return strictly a valid JSON object matching this schema:
{
  "intent": "GREETING" | "MENU_QUERY" | "ITEM_QUERY" | "PRICE_QUERY" | "INGREDIENT_QUERY" | "RECOMMENDATION" | "ORDER" | "ADD_ITEM" | "MODIFY_QUANTITY" | "REMOVE_ITEM" | "MODIFY_CUSTOMIZATION" | "CONFIRM" | "CANCEL" | "ASK_CLARIFICATION" | "HELP" | "UNKNOWN",
  "action": "ADD" | "REMOVE" | "UPDATE_QUANTITY" | "UPDATE_CUSTOMIZATION" | "CLEAR" | "NONE",
  "items": [
    {
      "name": "string",
      "menuItemId": "string",
      "quantity": 1,
      "price": 80,
      "customizations": ["string"]
    }
  ],
  "updatedOrder": [
    {
      "name": "string",
      "menuItemId": "string",
      "quantity": 1,
      "price": 80,
      "customizations": ["string"]
    }
  ],
  "targetItem": "string or null",
  "requiresClarification": false,
  "clarificationQuestion": "string",
  "unrecognizedItems": ["string"],
  "lastDiscussedDish": "string or null",
  "confidence": 0.95,
  "response": "string"
}`;

      const userContent = `Customer input (${language}): "${text}"`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
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
          action: parsedJson.action || 'NONE',
          items: Array.isArray(parsedJson.items) ? parsedJson.items : [],
          updatedOrder: Array.isArray(parsedJson.updatedOrder) ? parsedJson.updatedOrder : currentOrder,
          targetItem: parsedJson.targetItem || null,
          requiresClarification: Boolean(parsedJson.requiresClarification),
          clarificationQuestion: parsedJson.clarificationQuestion || '',
          unrecognizedItems: Array.isArray(parsedJson.unrecognizedItems) ? parsedJson.unrecognizedItems : [],
          lastDiscussedDish: parsedJson.lastDiscussedDish || lastDiscussedDish,
          confidence: Number(parsedJson.confidence) || 0.9,
          response: parsedJson.response || '',
          provider: 'gemini_ai'
        });
      }
    } catch (geminiErr) {
      console.warn('Gemini API call failed, using grounded fallback parser:', geminiErr.message);
    }

    const fallbackResult = buildGroundedFallbackResponse(
      text,
      language,
      activeMenu,
      knowledgeDocs,
      conversationHistory,
      currentOrder,
      lastDiscussedDish
    );
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
