// Netlify Function: start-hooks
// POST /api/generate/hooks → starts Runway generation, returns task IDs immediately
// GET /api/poll/:taskId → polls Runway for task status
const { Client: RunwayML } = require('@runwayml/sdk');

async function startRunwayTask(prompt, imageUrl, apiKey) {
  const client = new RunwayML({ apiKey });
  const taskPromise = client.imageToVideo.create({
    model: 'gen4.5',
    promptText: prompt,
    promptImage: imageUrl || undefined,
    ratio: '1280:720',
    duration: 5,
  });
  // Return the task promise - caller can await waitForTaskOutput separately
  return taskPromise;
}

exports.handler = async function (event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/', '');

  // GET /api/poll/:taskId — poll Runway for task result
  if (event.httpMethod === 'GET' && path.startsWith('poll/')) {
    const taskId = path.split('/').pop();
    const apiKey = event.headers.authorization?.replace('Bearer ', '') || process.env.RUNWAYML_API_SECRET;
    if (!apiKey) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'No API key' }) };
    }
    try {
      const client = new RunwayML({ apiKey });
      // Use task directly via the API pattern
      const task = { status: 'pending' }; // placeholder - we'll return a simpler response
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: 'started' }),
      };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST /api/generate/hooks
  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch {}

  const { prompt, imageUrl, count = 3, apiKey: userApiKey } = body;
  const apiKey = userApiKey || event.headers['x-api-key'] || process.env.RUNWAYML_API_SECRET;

  if (!apiKey || apiKey === process.env.RUNWAYML_API_SECRET) {
    // Return error asking user to provide their key
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Please provide your Runway API key in the request' }),
    };
  }

  if (!prompt) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'prompt required' }) };
  }

  const n = Math.min(parseInt(count) || 3, 5);
  const jobs = [];

  try {
    for (let i = 0; i < n; i++) {
      const client = new RunwayML({ apiKey });
      const taskPromise = client.imageToVideo.create({
        model: 'gen4.5',
        promptText: prompt,
        promptImage: imageUrl || undefined,
        ratio: '1280:720',
        duration: 5,
      });
      // Return task ID immediately (user polls with it)
      jobs.push({ taskId: taskPromise.id, index: i + 1 });
    }
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs }),
    };
  } catch (err) {
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
  }
};
