const admin = require("firebase-admin");
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, "./ticket-ea3de-firebase-adminsdk-fbsvc-519df753fa.json");

if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized via JSON file.");
    } else {
        // Fallback for Railway if env vars are set properly
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: "ticket-ea3de"
        });
        console.log("Firebase Admin initialized via Application Default Credentials.");
    }
}

const db = admin.firestore();

module.exports = db;
