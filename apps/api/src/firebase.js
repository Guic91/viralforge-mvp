'use strict';

const admin = require('firebase-admin');

let db;
try {
  // Try default credentials first (for GCP environments)
  const app = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'photo-beemm',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app',
  });
  db = admin.firestore();
} catch (e) {
  // Already initialized, use existing app
  if (admin.apps.length > 0) {
    db = admin.firestore();
  } else {
    // Fallback: initialize with credentials from env
    const app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'photo-beemm',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app',
    });
    db = admin.firestore();
  }
}

// Use FieldValue server timestamp
const FieldValue = admin.firestore.FieldValue;

exports.adminDb = db;
exports.adminStorage = admin.storage();
exports.adminFieldValue = FieldValue;
