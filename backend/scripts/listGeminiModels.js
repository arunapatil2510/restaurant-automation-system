require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found.');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log('--- Querying ai.models.list() ---');
  try {
    const response = await ai.models.list();
    // In @google/genai SDK, list() returns an async iterable or array / pager
    const models = [];
    if (Symbol.asyncIterator in Object(response)) {
      for await (const m of response) {
        models.push(m.name || m.id);
      }
    } else if (Array.isArray(response)) {
      models.push(...response.map(m => m.name || m.id));
    } else if (response && response.models) {
      models.push(...response.models.map(m => m.name || m.id));
    } else {
      console.log('Unrecognized list structure:', Object.keys(response || {}));
    }
    console.log('Available models from SDK list():');
    models.forEach(m => console.log(' - ' + m));
  } catch (err) {
    // Sanitize error to avoid leaking key if present in query params
    const sanitizedMsg = (err.message || '').replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED_API_KEY]');
    console.log('SDK ai.models.list() failed:', sanitizedMsg);
  }

  console.log('\n--- Querying REST API endpoint /v1beta/models ---');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      const sanitized = JSON.stringify(data).replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED_API_KEY]');
      console.log(`REST API error (HTTP ${res.status}): ${sanitized}`);
    } else if (data.models) {
      console.log(`Found ${data.models.length} models via REST API:`);
      data.models.forEach(m => {
        const methods = m.supportedGenerationMethods ? m.supportedGenerationMethods.join(', ') : '';
        console.log(` - ${m.name} (${methods})`);
      });
    } else {
      console.log('REST API returned no models array:', data);
    }
  } catch (err) {
    const sanitizedMsg = (err.message || '').replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED_API_KEY]');
    console.log('REST API fetch failed:', sanitizedMsg);
  }
}

listModels();
