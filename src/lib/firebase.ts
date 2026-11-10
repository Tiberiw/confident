import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const env = import.meta.env;

export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
});

export const auth = getAuth(app);

// Optional report fields are often undefined; skip them instead of failing the write.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

let analyticsStarted: Promise<void> | null = null;

/** Starts Google Analytics. Only called after the visitor accepts the consent banner. */
export function initAnalytics(): Promise<void> {
  analyticsStarted ??= (async () => {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (env.VITE_FIREBASE_MEASUREMENT_ID && (await isSupported())) getAnalytics(app);
  })().catch(() => {
    analyticsStarted = null;
  });
  return analyticsStarted;
}
