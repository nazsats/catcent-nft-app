import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Note: Implement Firebase security rules to restrict access to authorized users only.
// Example rules:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /whitelists/{type} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == "<ADMIN_UID>";
//     }
//     match /mintingEvents/{event} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null;
//     }
//     match /walletConnections/{event} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null;
//     }
//     match /errors/{event} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null;
//     }
//   }
// }