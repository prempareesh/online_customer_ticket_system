const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../ticket-ea3de-firebase-adminsdk-fbsvc-519df753fa.json');

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully using JSON file.');
    } else {
        // Fallback to environment variable for production (Project ID is minimum)
        admin.initializeApp({
            credential: admin.credential.applicationDefault(), // This works if env vars are set
            projectId: "ticket-ea3de"
        });
        console.log('Firebase Admin initialized using Application Default Credentials (env).');
    }
} catch (error) {
    console.error('Firebase initialization error:', error.message);
}

const db = admin.firestore();

module.exports = db;
