/**
 * Sarvam AI Multilingual Speech Integration Service
 * Real client-side proxy service calling backend endpoints (/api/voice/sarvam-stt & /api/voice/sarvam-tts)
 * Uses Sarvam AI Indian Speech Models (STT: saaras:v1, TTS: bulbul:v1)
 * Seamlessly falls back to Web Speech API and SpeechSynthesis when backend key is unconfigured.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    greeting: "Hello! Welcome to RESTOSMART. What would you like to order?",
    askChange: "Okay. What would you like to change?",
    orderConfirmed: "Perfect! Your order has been confirmed.",
    listeningHint: "I'm listening... Speak your order naturally",
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
    greeting: "ನಮಸ್ಕಾರ! ರೆಸ್ಟೋಸ್ಮಾರ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    askChange: "ಸರಿ. ನೀವು ಏನನ್ನು ಬದಲಾಯಿಸಲು ಬಯಸುತ್ತೀರಿ?",
    orderConfirmed: "ಉತ್ತಮ! ನಿಮ್ಮ ಆರ್ಡರ್ ಖಚಿತವಾಗಿದೆ.",
    listeningHint: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... ನಿಮ್ಮ ಆರ್ಡರ್ ಹೇಳಿ",
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
    greeting: "नमस्ते! रेस्टोस्मार्ट में आपका स्वागत है। आप क्या ऑर्डर करना चाहेंगे?",
    askChange: "ठीक है। आप क्या बदलना चाहेंगे?",
    orderConfirmed: "बहुत बढ़िया! आपका ऑर्डर कन्फर्म हो गया है।",
    listeningHint: "सुन रहे हैं... कृपया अपना ऑर्डर बोलें",
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
        // Play Sarvam AI audio WAV stream
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
    // Expected fallback when SARVAM_API_KEY is not yet active on local server
    console.debug('Sarvam TTS unavailable, using local browser speech synthesis:', err.message);
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

    utterance.onerror = (e) => {
      console.warn('Browser SpeechSynthesis error:', e);
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Browser SpeechSynthesis execution error:', err);
    if (onEndCallback) onEndCallback();
  }
};
