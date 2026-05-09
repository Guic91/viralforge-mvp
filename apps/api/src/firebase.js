'use strict';

const admin = require('firebase-admin');

// Initialize with credentials from env var (JSON string) or fallback to default
let db;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'photo-beemm';
  const credentialsJson = process.env.FIREBASE_CREDENTIALS_JSON;
  
  if (credentialsJson) {
    // Use provided credentials JSON
    const creds = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
    const app = admin.initializeApp({
      credential: admin.credential.cert(creds),
      projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app',
    });
  } else {
    // Try default credentials (for local dev or GCP)
    try {
      const app = admin.initializeApp({
        projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app',
      });
    } catch (initErr) {
      // Already initialized - use existing
    }
  }
  
  db = admin.firestore();
} catch (e) {
  console.warn('Firebase init failed:', e.message);
  // Create a mock db for development without Firebase
  db = null;
}

// Use FieldValue server timestamp
const FieldValue = admin.firestore ? admin.firestore.FieldValue : null;

exports.adminDb = db;
exports.adminStorage = admin.storage ? admin.storage() : null;
exports.adminFieldValue = FieldValue;