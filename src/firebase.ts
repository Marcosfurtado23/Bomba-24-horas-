import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp | undefined;
let db: Firestore | any;
let auth: Auth | any;

try {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('TODO')) {
    console.warn("Firebase configuration is missing or contains placeholder values. Please check firebase-applet-config.json");
  }
  
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  // Provide mock objects so the app doesn't crash on import
  db = {} as any;
  auth = {} as any;
}

export { db, auth };
