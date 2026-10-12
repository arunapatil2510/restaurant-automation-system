/**
 * RESTOSMART Voice API Routes
 * Secure Backend Proxy for Sarvam AI Speech-to-Text (STT) & Text-to-Speech (TTS)
 * Keeps SARVAM_API_KEY secure on the server and provides graceful fallback indicators.
 */

const express = require('express');
const router = express.Router();

// Helper to determine if Sarvam AI is configured with a real key
const isConfiguredKey = (key) => {
  return Boolean(
    key &&
    key.trim() !== '' &&
    !key.includes('your_sarvam')
  );
};

/**
 * @route   GET /api/voice/status
 * @desc    Check if Sarvam AI or custom voice providers are configured
 * @access  Public
 */
router.get('/status', (req, res) => {
  const isSarvamConfigured = isConfiguredKey(process.env.SARVAM_API_KEY);
  res.status(200).json({
    success: true,
    sarvamConfigured: isSarvamConfigured,
    provider: isSarvamConfigured ? 'sarvam_ai' : 'browser_native',
    supportedLanguages: ['en-IN', 'kn-IN', 'hi-IN'],
    models: {
      stt: 'saaras:v1',
      tts: 'bulbul:v1',
    },
  });
});

/**
 * @route   POST /api/voice/sarvam-stt
 * @desc    Speech-to-Text via Sarvam AI (proxy)
 * @access  Public
 */
router.post('/sarvam-stt', async (req, res) => {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!isConfiguredKey(apiKey)) {
      return res.status(200).json({
        success: false,
        useFallback: true,
        message: 'SARVAM_API_KEY is not configured in backend .env. Use client Web Speech API.',
        provider: 'browser_native',
      });
    }

    const { audioBase64, language_code = 'en-IN', mimeType = 'audio/wav' } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      return res.status(400).json({
        success: false,
        message: 'audioBase64 is required for speech recognition',
      });
    }

    // Robustly strip data URL prefix (including any parameters like codecs or hyphenated MIME types) and whitespace
    const cleanBase64 = audioBase64.replace(/^data:[^,]*;base64,/i, '').replace(/\s+/g, '');
    if (!cleanBase64) {
      return res.status(400).json({
        success: false,
        message: 'audioBase64 is required for speech recognition',
      });
    }

    // Validate Base64 characters (standard Base64 or URL-safe Base64)
    if (!/^[A-Za-z0-9+/=_-]+$/.test(cleanBase64)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Base64 audio format provided',
      });
    }

    // Convert base64 to Blob/Buffer
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    if (audioBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Decoded audio data cannot be empty',
      });
    }

    const dataUrlMatch = audioBase64.match(/^data:([^;,]+)/i);
    const resolvedMimeType = mimeType || (dataUrlMatch ? dataUrlMatch[1] : 'audio/wav');
    const audioBlob = new Blob([audioBuffer], { type: resolvedMimeType });

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
      console.error(`Sarvam STT API Error: HTTP ${sarvamRes.status}`);
      return res.status(sarvamRes.status).json({
        success: false,
        useFallback: true,
        error: `Sarvam STT error (${sarvamRes.status})`,
      });
    }

    const sarvamData = await sarvamRes.json();
    return res.status(200).json({
      success: true,
      transcript: sarvamData.transcript || '',
      language_code: sarvamData.language_code || language_code,
      provider: 'sarvam_ai',
    });
  } catch (error) {
    console.error('Sarvam STT Exception:', error.message);
    return res.status(500).json({
      success: false,
      useFallback: true,
      error: 'Server error while processing speech recognition',
    });
  }
});

/**
 * @route   POST /api/voice/sarvam-tts
 * @desc    Text-to-Speech via Sarvam AI (proxy)
 * @access  Public
 */
router.post('/sarvam-tts', async (req, res) => {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!isConfiguredKey(apiKey)) {
      return res.status(200).json({
        success: false,
        useFallback: true,
        message: 'SARVAM_API_KEY is not configured in backend .env. Use client SpeechSynthesis.',
        provider: 'browser_native',
      });
    }

    const { text, target_language_code = 'en-IN', speaker } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'text is required for speech synthesis',
      });
    }

    // Default high-quality Indian speakers per language
    const speakerMap = {
      'en-IN': 'meera',
      'kn-IN': 'aravind',
      'hi-IN': 'ananya',
    };
    const chosenSpeaker = speaker || speakerMap[target_language_code] || 'meera';

    const sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
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
        model: 'bulbul:v1',
      }),
    });

    if (!sarvamRes.ok) {
      console.error(`Sarvam TTS API Error: HTTP ${sarvamRes.status}`);
      return res.status(sarvamRes.status).json({
        success: false,
        useFallback: true,
        error: `Sarvam TTS error (${sarvamRes.status})`,
      });
    }

    const sarvamData = await sarvamRes.json();
    const audioBase64 = sarvamData.audios && sarvamData.audios[0] ? sarvamData.audios[0] : null;

    return res.status(200).json({
      success: true,
      audioBase64: audioBase64,
      target_language_code: target_language_code,
      provider: 'sarvam_ai',
    });
  } catch (error) {
    console.error('Sarvam TTS Exception:', error.message);
    return res.status(500).json({
      success: false,
      useFallback: true,
      error: 'Server error while processing speech synthesis',
    });
  }
});

module.exports = router;
