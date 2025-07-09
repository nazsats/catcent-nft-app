require("dotenv").config();
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

if (!process.env.FIREBASE_ADMIN_CREDENTIALS_PATH) {
  throw new Error("FIREBASE_ADMIN_CREDENTIALS_PATH is not defined in .env");
}

const serviceAccountPath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;
const absolutePath = path.resolve(__dirname, "..", serviceAccountPath);
console.log("Service account path:", serviceAccountPath);
console.log("Absolute path:", absolutePath);
if (!fs.existsSync(absolutePath)) {
  throw new Error(`Service account file not found at: ${absolutePath}`);
}
const serviceAccount = require(absolutePath);

const app = initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore(app);

module.exports = { db };