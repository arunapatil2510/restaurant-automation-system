require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function testMinimal() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY is missing in backend/.env');
    process.exit(1);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const ai = new GoogleGenAI({ apiKey });

  console.log(`Sending minimal test request to Gemini model: ${model}`);
  console.log('Prompt: Reply with exactly "RESTOSMART GEMINI CONNECTED"\n');

  const maxRetries = 3;
  let delay = 2000; // start with 2s

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: 'Reply with exactly: RESTOSMART GEMINI CONNECTED' }] }
        ],
        config: {
          temperature: 0.1,
        }
      });

      const reply = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text);
      console.log(`âœ“ SUCCESS (Attempt ${attempt}): Received response from Gemini!`);
      console.log(`Response content: "${reply ? reply.trim() : ''}"`);
      process.exit(0);
    } catch (err) {
      const statusMatch = (err.message || '').match(/"code":\s*(\d+)/);
      const httpStatus = statusMatch ? statusMatch[1] : (err.status || 'UNKNOWN');
      const sanitizedMsg = (err.message || '').replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED_API_KEY]');

      console.error(`âœ— Attempt ${attempt} failed: HTTP Status ${httpStatus}`);
      console.error(`  Sanitized error: ${sanitizedMsg}`);

      if (httpStatus === '503' && attempt <= maxRetries) {
        console.log(`  503 UNAVAILABLE encountered. Retrying in ${delay / 1000}s (exponential backoff)...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      } else {
        console.error(`\nNo further retries. Failed on attempt ${attempt}.`);
        process.exit(1);
      }
    }
  }
}

testMinimal();
