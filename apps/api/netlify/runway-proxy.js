const { Client: RunwayML } = require('@runwayml/sdk');

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

// CORS proxy + API key passthrough for Runway
// Runway blocks browser CORS, so we proxy here
exports.handler = async function (event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch {}
  const apiKey = event.headers['x-api-key'] || event.queryStringParameters?.apiKey || body.apiKey || process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No Runway API key' }) };
  }

  const path = event.path.replace('/.netlify/functions/', '');

  // GET /api/credits
  if (path === 'credits' || path === 'api/credits') {
    const key = event.queryStringParameters?.apiKey || process.env.RUNWAYML_API_SECRET;
    if (!key) {
      return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No Runway API key' }) };
    }
    try {
      const resp = await fetch(`${RUNWAY_API_BASE}/organization`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await resp.json();
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ creditBalance: data.creditBalance, credits: data.creditBalance }) };
    } catch (err) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST /api/generate/hooks → proxy to Runway image_to_video
  if (path === 'generate/hooks' || path === 'api/generate/hooks') {
    let body = {};
    try { if (event.body) body = JSON.parse(event.body); } catch {}
    const { prompt, imageUrl, count = 3 } = body;

    if (!prompt) return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'prompt required' }) };

    const n = Math.min(parseInt(count) || 3, 5);
    const jobs = [];

    try {
      for (let i = 0; i < n; i++) {
        const resp = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gen4.5',
            promptText: prompt,
            ...(imageUrl ? { promptImage: imageUrl } : {}),
            ratio: '1280:720',
            duration: 5,
          }),
        });
        const data = await resp.json();
        jobs.push({ taskId: data.id, index: i + 1 });
      }
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ jobs }) };
    } catch (err) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  }

  // GET /api/poll/:taskId → poll Runway task
  if (path.startsWith('poll/') || path.startsWith('api/poll/')) {
    const taskId = path.split('/').pop();
    try {
      const resp = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await resp.json();
      const status = data.status === 'SUCCEEDED' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'processing';
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, output: data.output?.[0] ? { url: data.output[0] } : null }),
      };
    } catch (err) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST /api/generate/voiceover → proxy to Runway TTS
  if (path === 'generate/voiceover' || path === 'api/generate/voiceover') {
    let body = {};
    try { if (event.body) body = JSON.parse(event.body); } catch {}
    const { script } = body;
    if (!script) return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'script required' }) };

    try {
      const resp = await fetch(`${RUNWAY_API_BASE}/text_to_speech`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'eleven_multilingual_v2', promptText: script }),
      });
      const data = await resp.json();
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: data.id }) };
    } catch (err) {
      return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found' }) };
};
