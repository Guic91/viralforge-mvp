'use strict';

const admin = require('firebase-admin');

let app;

try {
  app = admin.initializeApp({
    credential: admin.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'photo-beemm',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app',
  });
} catch (e) {
  if (!admin.apps.length) {
    app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'photo-beemm',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'photo-beemm.firebasestorage.app',
    });
  }
}

exports.adminDb = admin.firestore();
exports.adminStorage = admin.storage();
exports.defaultApp = app;
