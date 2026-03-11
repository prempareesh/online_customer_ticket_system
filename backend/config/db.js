const admin = require('firebase-admin');
const serviceAccount = require('../ticket-ea3de-firebase-adminsdk-fbsvc-519df753fa.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully.');
} catch (error) {
    if (!/already exists/.test(error.message)) {
        console.error('Firebase initialization error', error.stack);
    }
}

const db = admin.firestore();

module.exports = db;
