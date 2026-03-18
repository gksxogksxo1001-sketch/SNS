import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate environment variables
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value && key !== "measurementId")
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase().replace(/[A-Z]/g, letter => `_${letter}`)}`);

if (missingKeys.length > 0) {
  console.error("[Firebase Config] Missing values:", missingKeys);
} else {
  console.log("[Firebase Config] All mandatory keys loaded for project:", firebaseConfig.projectId);
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Messaging initialization (conditional for SSR)
export const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export default app;
