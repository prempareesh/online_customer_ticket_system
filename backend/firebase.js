const admin = require("firebase-admin");

let serviceAccount;
try {
  let envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVar) {
    try {
      // First try standard parse (works if user passed valid collapsed JSON string)
      serviceAccount = JSON.parse(envVar);
    } catch (e1) {
      try {
        // Render sometimes passes it as a stringified string "{\n...}" rather than raw JSON
        serviceAccount = JSON.parse(JSON.parse(envVar));
      } catch (e2) {
        // Hardest fallback: repair a broken raw JSON string's newlines before parsing
        // We replace newlines with literal '\n' characters so it is valid JSON
        let fixedEnv = envVar.replace(/\n/g, '\\n');
        serviceAccount = JSON.parse(fixedEnv);
      }
    }
  } else {
    serviceAccount = require("./firebase/serviceAccount.json");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ticket-ea3de.appspot.com"
  });
} catch (error) {
  console.error("Firebase initialization failed:", error.message);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, bucket };

