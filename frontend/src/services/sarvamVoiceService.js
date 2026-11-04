/**
 * Sarvam AI Multilingual Speech Integration Service
 * Real client-side proxy service calling backend endpoints (/api/voice/sarvam-stt & /api/voice/sarvam-tts)
 * Uses Sarvam AI Indian Speech Models (STT: saaras:v1, TTS: bulbul:v1)
 * Seamlessly falls back to Web Speech API and SpeechSynthesis when backend key is unconfigured.
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';

export const SARVAM_SUPPORTED_LANGUAGES = [
  {
    code: 'en-IN',
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    sarvamSttCode: 'en-IN',
    sarvamTtsCode: 'en-IN',
    sarvamVoice: 'meera',
    greeting: "Welcome! What would you like to order today?",
    askChange: "Okay. What would you like to order instead?",
    addedAskAnythingElse: "Added to your order. Would you like anything else?",
    orderConfirmed: "Added to your order. Would you like anything else?",
    orderFinalized: "Your order is confirmed. Taking you to the cart to review.",
    askWhatElse: "What else would you like to order?",
    itemRejected: "Okay, I won't add that. What would you like instead?",
    unknownItem: "Sorry, I couldn't find that item on the menu.",
    tryExample: 'Two Masala Dosa and one Mango Lassi',
    listeningHint: "I'm listening... Speak your order naturally",
    listeningConfirmHint: "Listening for confirmation... Say 'Yes' or 'No'",
    listeningAskMoreHint: "Would you like anything else? Say 'Yes' or 'No'"
  },
  {
    code: 'kn-IN',
    id: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    sarvamSttCode: 'kn-IN',
    sarvamTtsCode: 'kn-IN',
    sarvamVoice: 'aravind',
    greeting: "ಸ್ವಾಗತ! ಇಂದು ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    askChange: "ಸರಿ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    addedAskAnythingElse: "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ?",
    orderConfirmed: "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ?",
    orderFinalized: "ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ. ಕಾರ್ಟ್ ಪರಿಶೀಲಿಸಲು ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.",
    askWhatElse: "ನೀವು ಮತ್ತೇನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    itemRejected: "ಸರಿ, ಅದನ್ನು ಸೇರಿಸುತ್ತಿಲ್ಲ. ನೀವು ಬದಲಿಗೆ ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    unknownItem: "ಕ್ಷಮಿಸಿ, ಆ ತಿಂಡಿ ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.",
    tryExample: 'ಎರಡು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಒಂದು ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ',
    listeningHint: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... ನಿಮ್ಮ ಆರ್ಡರ್ ಹೇಳಿ",
    listeningConfirmHint: "ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... 'ಹೌದು' ಅಥವಾ 'ಬೇಡ' ಎಂದು ಹೇಳಿ",
    listeningAskMoreHint: "ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ? 'ಹೌದು' ಅಥವಾ 'ಬೇಡ' ಎಂದು ಹೇಳಿ"
  },
  {
    code: 'hi-IN',
    id: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    sarvamSttCode: 'hi-IN',
    sarvamTtsCode: 'hi-IN',
    sarvamVoice: 'ananya',
    greeting: "नमस्ते! आज आप क्या ऑर्डर करना चाहेंगे?",
    askChange: "ठीक है। आप क्या ऑर्डर करना चाहेंगे?",
    addedAskAnythingElse: "आपके ऑर्डर में जोड़ दिया गया है। क्या आप कुछ और लेना चाहेंगे?",
    orderConfirmed: "आपके ऑर्डर में जोड़ दिया गया है। क्या आप कुछ और लेना चाहेंगे?",
    orderFinalized: "आपका ऑर्डर कन्फर्म हो गया है। कार्ट देखने के लिए ले जा रहे हैं।",
    askWhatElse: "आप और क्या ऑर्डर करना चाहेंगे?",
    itemRejected: "ठीक है, इसे नहीं जोड़ेंगे। आप इसके बदले क्या लेना चाहेंगे?",
    unknownItem: "क्षमा करें, यह व्यंजन हमारे मेनू में उपलब्ध नहीं है।",
    tryExample: 'दो मसाला डोसा और एक मैंगो लस्सी',
    listeningHint: "सुन रहे हैं... कृपया अपना ऑर्डर बोलें",
    listeningConfirmHint: "पुष्टि के लिए सुन रहे हैं... 'हाँ' या 'नहीं' कहें",
    listeningAskMoreHint: "क्या आप कुछ और लेना चाहेंगे? 'हाँ' या 'नहीं' कहें"
  }
];

let activeAudioElement = null;

/**
 * Check backend voice provider status
 */
export const getVoiceBackendStatus = async () => {
  try {
    const res = await fetch(`${API_BASE}/voice/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not query voice status from backend:', err.message);
  }
  return { sarvamConfigured: false, provider: 'browser_native' };
};

/**
 * Real Sarvam AI Speech-to-Text call via Backend Proxy
 */
export const transcribeAudioViaSarvam = async (audioBlob, languageCode = 'en-IN') => {
  try {
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(audioBlob);
    });
    const audioBase64 = await base64Promise;

    const res = await fetch(`${API_BASE}/voice/sarvam-stt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        language_code: languageCode,
        mimeType: audioBlob.type || 'audio/wav'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.transcript) {
        return { success: true, transcript: data.transcript, provider: 'sarvam_ai' };
      }
    }
  } catch (err) {
    console.warn('Sarvam STT network error:', err);
  }
  return { success: false, useFallback: true };
};

/**
 * Text-to-Speech (TTS) Execution
 * Tries Sarvam AI Indian TTS through backend proxy, falls back cleanly to browser SpeechSynthesis.
 */
export const speakKioskSpeech = async (text, langCode = 'en-IN', onEndCallback = null) => {
  if (!text || !text.trim()) {
    if (onEndCallback) onEndCallback();
    return;
  }

  // 1. Try Backend Sarvam AI TTS
  try {
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement = null;
    }

    const langConf = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SARVAM_SUPPORTED_LANGUAGES[0];
    const res = await fetch(`${API_BASE}/voice/sarvam-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        target_language_code: langConf.sarvamTtsCode,
        speaker: langConf.sarvamVoice
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audioBase64) {
        const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        activeAudioElement = audio;

        audio.onended = () => {
          activeAudioElement = null;
          if (onEndCallback) onEndCallback();
        };

        audio.onerror = () => {
          activeAudioElement = null;
          fallbackBrowserTTS(text, langCode, onEndCallback);
        };

        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.debug('Sarvam TTS fallback:', err.message);
  }

  // 2. Fallback: Browser Native SpeechSynthesis
  fallbackBrowserTTS(text, langCode, onEndCallback);
};

/**
 * Local Browser SpeechSynthesis Fallback
 */
const fallbackBrowserTTS = (text, langCode = 'en-IN', onEndCallback = null) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEndCallback) onEndCallback();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const matchVoice = voices.find(v => v.lang === langCode || v.lang.startsWith(langCode.slice(0, 2)));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
    }

    utterance.onend = () => {
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Browser SpeechSynthesis execution error:', err);
    if (onEndCallback) onEndCallback();
  }
};
