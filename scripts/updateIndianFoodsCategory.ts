/**
 * Script to update "Indian Foods" category to "Food" in Firestore
 * 
 * Run with: npx tsx scripts/updateIndianFoodsCategory.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

// Firebase configuration - uses environment variables from .env file
// Make sure to set these in your .env file before running
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: "1:449890687762:web:72652b2b8a3aebd9c7f1cb",
  measurementId: "G-07BCWLB673",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateIndianFoodsCategory() {
  try {
    console.log("🔄 Starting category update: 'Indian Foods' → 'Food'");

    // Query all documents with category "Indian Foods"
    const wordsRef = collection(db, "words");
    const q = query(wordsRef, where("category", "==", "Indian Foods"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ No documents found with category 'Indian Foods'. Nothing to update.");
      return;
    }

    console.log(`📝 Found ${querySnapshot.size} document(s) to update`);

    // Batch update (Firestore allows up to 500 operations per batch)
    let batch = writeBatch(db);
    let count = 0;
    const BATCH_LIMIT = 400;

    querySnapshot.forEach((docSnapshot) => {
      const docRef = doc(db, "words", docSnapshot.id);
      batch.update(docRef, { category: "Food" });
      count++;

      // Commit batch if we reach the limit
      if (count >= BATCH_LIMIT) {
        batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    });

    // Commit remaining updates
    if (count > 0) {
      await batch.commit();
    }

    console.log(`✅ Successfully updated ${querySnapshot.size} document(s) from 'Indian Foods' to 'Food'`);
    console.log("🎉 Category merge complete!");
  } catch (error) {
    console.error("❌ Error updating category:", error);
    process.exit(1);
  }
}

updateIndianFoodsCategory()
  .then(() => {
    console.log("✨ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

