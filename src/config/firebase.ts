import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";

/** Emulator mode lets tests run against local Firebase without real project credentials. */
export const useFirebaseEmulators =
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const firestoreEmulatorPort = Number(
  import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080
);
const authEmulatorPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099);

// Emulators accept any well-formed config, so fall back to the demo project.
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    (useFirebaseEmulators ? "demo-api-key" : ""),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (useFirebaseEmulators ? `${emulatorHost}` : ""),
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    (useFirebaseEmulators ? "demo-mafiasword" : ""),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:449890687762:web:72652b2b8a3aebd9c7f1cb",
  measurementId: "G-07BCWLB673",
};

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.authDomain) &&
  Boolean(firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

if (useFirebaseEmulators) {
  connectFirestoreEmulator(db, emulatorHost, firestoreEmulatorPort);
  connectAuthEmulator(auth, `http://${emulatorHost}:${authEmulatorPort}`, {
    disableWarnings: true,
  });
}

export default app;
