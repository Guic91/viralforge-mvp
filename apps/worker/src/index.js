'use strict';

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { Readable } = require('stream');
const { randomUUID } = require('crypto');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'photo-beemm';
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app';
const JOBS_COLLECTION = 'viral_jobs';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000');

let app;

try {
  app = admin.initializeApp({
    credential: admin.applicationDefault(),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
} catch (e) {
  if (!admin.apps.length) {
    app = admin.initializeApp({
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    });
  }
}

const db = admin.firestore();
const storage = admin.storage();

// ---- HELPERS ----

async function uploadToFirebaseStorage(buffer, destPath, contentType) {
  const bucket = storage.bucket(STORAGE_BUCKET);
  const file = bucket.file(destPath);
  const stream = file.createWriteStream({ metadata: { contentType }, resumable: false });
  await new Promise((resolve, reject) => {
    const readable = Readable.from(buffer);
    readable.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${destPath}`;
}

async function downloadBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Download failed: ' + url);
  const chunks = [];
  for await (const chunk of resp.body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function updateJob(jobId, status, outputUrl, error) {
  const docRef = db.collection(JOBS_COLLECTION).doc(jobId);
  await docRef.update({
    status,
    outputUrl: outputUrl || null,
    error: error || null,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

async function pollRunwayVideo(apiKey, prompt, imageUrl) {
  const { RunwayML } = require('@runwayml/sdk');
  const runway = new RunwayML({ apiKey });
  const task = await runway.imageToVideo.create({
    model: 'gen4.5',
    prompt,
    image: imageUrl || undefined,
  });
  const maxWait = 120000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const status = await runway.imageToVideo.tasks.retrieve(task.id);
      if (status.status === 'succeeded') return status.output;
      if (status.status === 'failed') throw new Error('Runway failed: ' + JSON.stringify(status));
    } catch (e) {
      // keep polling
    }
  }
  throw new Error('Runway video timed out after ' + maxWait + 'ms');
}

async function pollRunwayAudio(apiKey, script, voiceName) {
  const resp = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceName, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('ElevenLabs error: ' + errText);
  }
  const chunks = [];
  for await (const chunk of resp.body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function extractUrl(output) {
  if (!output) return null;
  const urlStr = Array.isArray(output) ? output[0] : output;
  if (typeof urlStr === 'string' && urlStr.startsWith('http')) return urlStr;
  return null;
}

// ---- JOB PROCESSORS ----

async function processHookJob(doc) {
  const { jobId, inputData } = doc.data();
  const { prompt, imageUrl, variant, apiKey } = inputData;
  await updateJob(jobId, 'processing', null, null);
  try {
    const fullPrompt = `${variant}. ${prompt}. High energy, cinematic, scroll-stopping opening.`;
    const output = await pollRunwayVideo(apiKey, fullPrompt, imageUrl);
    const videoUrl = extractUrl(output);
    let outputUrl = videoUrl;
    if (videoUrl) {
      const buffer = await downloadBuffer(videoUrl);
      outputUrl = await uploadToFirebaseStorage(buffer, `viralforge/${jobId}.mp4`, 'video/mp4');
    }
    await updateJob(jobId, 'completed', outputUrl || videoUrl, null);
  } catch (e) {
    console.error('Hook job error', jobId, e.message);
    await updateJob(jobId, 'failed', null, e.message);
  }
}

async function processABTestJob(doc) {
  const { jobId, inputData } = doc.data();
  const { concept, variation, apiKey } = inputData;
  await updateJob(jobId, 'processing', null, null);
  try {
    const fullPrompt = `${variation}. ${concept}. Dynamic cut, engaging visuals, viral potential.`;
    const output = await pollRunwayVideo(apiKey, fullPrompt, null);
    const videoUrl = extractUrl(output);
    let outputUrl = videoUrl;
    if (videoUrl) {
      const buffer = await downloadBuffer(videoUrl);
      outputUrl = await uploadToFirebaseStorage(buffer, `viralforge/${jobId}.mp4`, 'video/mp4');
    }
    await updateJob(jobId, 'completed', outputUrl || videoUrl, null);
  } catch (e) {
    console.error('ABTest job error', jobId, e.message);
    await updateJob(jobId, 'failed', null, e.message);
  }
}

async function processProductVideoJob(doc) {
  const { jobId, inputData } = doc.data();
  const { imageUrl, productName, tagline, apiKey } = inputData;
  await updateJob(jobId, 'processing', null, null);
  try {
    const fullPrompt = `Product showcase: ${productName || ''}. ${tagline || ''}. Elegant reveal, professional lighting, cinematic quality.`;
    const output = await pollRunwayVideo(apiKey, fullPrompt, imageUrl);
    const videoUrl = extractUrl(output);
    let outputUrl = videoUrl;
    if (videoUrl) {
      const buffer = await downloadBuffer(videoUrl);
      outputUrl = await uploadToFirebaseStorage(buffer, `viralforge/${jobId}.mp4`, 'video/mp4');
    }
    await updateJob(jobId, 'completed', outputUrl || videoUrl, null);
  } catch (e) {
    console.error('ProductVideo job error', jobId, e.message);
    await updateJob(jobId, 'failed', null, e.message);
  }
}

async function processVoiceoverJob(doc) {
  const { jobId, inputData } = doc.data();
  const { script, voiceName, apiKey } = inputData;
  await updateJob(jobId, 'processing', null, null);
  try {
    const buffer = await pollRunwayAudio(apiKey, script, voiceName || 'eleven_multilingual_v2');
    const outputUrl = await uploadToFirebaseStorage(buffer, `viralforge/${jobId}.mp3`, 'audio/mpeg');
    await updateJob(jobId, 'completed', outputUrl, null);
  } catch (e) {
    console.error('Voiceover job error', jobId, e.message);
    await updateJob(jobId, 'failed', null, e.message);
  }
}

// ---- MAIN POLL LOOP ----

let isProcessing = false;

async function pollAndProcess() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const snapshot = await db
      .collection(JOBS_COLLECTION)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const doc = snapshot.docs[0];
    const { jobType } = doc.data();

    console.log(`Processing job ${doc.id} (type: ${jobType})`);

    switch (jobType) {
      case 'hooks': await processHookJob(doc); break;
      case 'abtest': await processABTestJob(doc); break;
      case 'product-video': await processProductVideoJob(doc); break;
      case 'voiceover': await processVoiceoverJob(doc); break;
      default:
        console.warn('Unknown job type:', jobType);
        await updateJob(doc.id, 'failed', null, 'Unknown job type: ' + jobType);
    }
  } catch (e) {
    console.error('Poll loop error:', e);
  } finally {
    isProcessing = false;
  }
}

async function start() {
  console.log('ViralForge Worker started');
  console.log('Firebase project:', PROJECT_ID);
  console.log('Storage bucket:', STORAGE_BUCKET);
  console.log('Poll interval:', POLL_INTERVAL_MS, 'ms');

  // Process any jobs already pending on startup
  await pollAndProcess();

  // Poll loop
  setInterval(pollAndProcess, POLL_INTERVAL_MS);
}

start().catch(console.error);
