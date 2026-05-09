'use strict';

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { adminDb, adminFieldValue } = require('./firebase');
const { randomUUID } = require('crypto');

const PORT = parseInt(process.env.PORT || '3001');
const JOBS_COLLECTION = 'viral_jobs';

// ---- IN-MEMORY JOB STORE (fallback when Firebase unavailable) ----
const inMemoryJobs = new Map();

function jobTypeToPrefix(type) {
  const map = { hooks: 'hook', abtest: 'ab', 'product-video': 'prod', voiceover: 'vo' };
  return map[type] || 'job';
}

async function createJobDoc(jobType, userId, inputData) {
  const prefix = jobTypeToPrefix(jobType);
  const jobId = prefix + '_' + randomUUID().slice(0, 12);
  
  const jobData = {
    jobId,
    jobType,
    userId,
    status: 'pending',
    inputData,
    outputUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  if (adminDb) {
    try {
      const docRef = adminDb.collection(JOBS_COLLECTION).doc(jobId);
      const ts = adminFieldValue ? adminFieldValue.serverTimestamp() : new Date();
      await docRef.set({ ...jobData, createdAt: ts, updatedAt: ts });
    } catch (e) {
      fastify.log.warn('Firestore write failed, using in-memory:', e.message);
      inMemoryJobs.set(jobId, jobData);
    }
  } else {
    inMemoryJobs.set(jobId, jobData);
  }
  
  return jobId;
}

async function updateJobStatus(jobId, status, outputUrl, error) {
  const update = { status, updatedAt: new Date().toISOString() };
  if (outputUrl) update.outputUrl = outputUrl;
  if (error) update.error = error;
  
  if (adminDb) {
    try {
      const docRef = adminDb.collection(JOBS_COLLECTION).doc(jobId);
      const ts = adminFieldValue ? adminFieldValue.serverTimestamp() : new Date();
      await docRef.update({ ...update, updatedAt: ts });
    } catch (e) {
      const job = inMemoryJobs.get(jobId);
      if (job) Object.assign(job, update);
    }
  } else {
    const job = inMemoryJobs.get(jobId);
    if (job) Object.assign(job, update);
  }
}

async function getJob(jobId) {
  if (adminDb) {
    try {
      const doc = await adminDb.collection(JOBS_COLLECTION).doc(jobId).get();
      return doc.exists ? doc.data() : null;
    } catch (e) {
      return inMemoryJobs.get(jobId) || null;
    }
  }
  return inMemoryJobs.get(jobId) || null;
}

// ---- ROUTES ----

fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
});

fastify.get('/api/health', () => ({ ok: true }));

// GET /api/credits?apiKey=xxx — proxy to Runway org API
fastify.get('/api/credits', async (req, reply) => {
  const apiKey = req.query.apiKey || req.headers['x-api-key'] || '';
  if (!apiKey) return reply.status(400).send({ error: 'apiKey required' });
  try {
    const { RunwayML } = require('@runwayml/sdk');
    const runway = new RunwayML({ apiKey });
    const org = await runway.organizations.get('');
    return { credits: org.creditsRemaining ?? 0 };
  } catch (e) {
    fastify.log.error(e);
    return { credits: 0, error: e.message };
  }
});

// POST /api/generate/hooks — body: {prompt, imageUrl?, count?, userId, apiKey}
fastify.post('/api/generate/hooks', async (req, reply) => {
  const { prompt, imageUrl, count = 3, userId, apiKey } = req.body || {};
  if (!prompt || !userId || !apiKey) {
    return reply.status(400).send({ error: 'prompt, userId, and apiKey are required' });
  }

  const variations = [
    'Opens with a surprising fact or question',
    'Starts with an emotional hook',
    'Begins with bold statement',
  ];

  const jobIds = [];
  for (let i = 0; i < count; i++) {
    const jobId = await createJobDoc('hooks', userId, {
      prompt,
      imageUrl: imageUrl || null,
      variant: variations[i % variations.length],
      count,
      apiKey,
      userId,
    });
    jobIds.push(jobId);
  }

  return { jobIds };
});

// POST /api/generate/ab-test — body: {concept, count?, userId, apiKey}
fastify.post('/api/generate/ab-test', async (req, reply) => {
  const { concept, count = 5, userId, apiKey } = req.body || {};
  if (!concept || !userId || !apiKey) {
    return reply.status(400).send({ error: 'concept, userId, and apiKey are required' });
  }

  const variations = [
    'Opens with a surprising fact or question',
    'Starts with customer testimonial',
    'Begins with dramatic before/after',
    'Opens with a bold statement',
    'Starts with problem-solution hook',
    'Opens with a humorous angle',
    'Starts with a shocking statistic',
    'Begins with audience hook',
    'Opens with trend reference',
    'Starts with product reveal',
  ];

  const jobIds = [];
  for (let i = 0; i < count; i++) {
    const jobId = await createJobDoc('abtest', userId, {
      concept,
      variation: variations[i % variations.length],
      count,
      apiKey,
      userId,
    });
    jobIds.push(jobId);
  }

  return { jobIds };
});

// POST /api/generate/product-video — body: {imageUrl, productName, tagline?, brandColor?, userId, apiKey}
fastify.post('/api/generate/product-video', async (req, reply) => {
  const { imageUrl, productName, tagline, brandColor, userId, apiKey } = req.body || {};
  if (!imageUrl || !userId || !apiKey) {
    return reply.status(400).send({ error: 'imageUrl, userId, and apiKey are required' });
  }

  const jobId = await createJobDoc('product-video', userId, {
    imageUrl,
    productName: productName || '',
    tagline: tagline || '',
    brandColor: brandColor || '#FF4D00',
    apiKey,
    userId,
  });

  return { jobId };
});

// POST /api/generate/voiceover — body: {script, voiceName?, userId, apiKey}
fastify.post('/api/generate/voiceover', async (req, reply) => {
  const { script, voiceName = 'eleven_multilingual_v2', userId, apiKey } = req.body || {};
  if (!script || !userId || !apiKey) {
    return reply.status(400).send({ error: 'script, userId, and apiKey are required' });
  }

  const jobId = await createJobDoc('voiceover', userId, {
    script,
    voiceName,
    apiKey,
    userId,
  });

  return { jobId };
});

// GET /api/poll/:jobId — check job status
fastify.get('/api/poll/:jobId', async (req, reply) => {
  const { jobId } = req.params;
  const job = await getJob(jobId);
  if (!job) return reply.status(404).send({ error: 'Job not found' });
  return job;
});

// ---- START ----
async function start() {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log('ViralForge API running on port', PORT);
}

start().catch(console.error);