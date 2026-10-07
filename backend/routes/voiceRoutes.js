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

module.exports = router;
