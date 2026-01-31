/**
 * Test script to identify the exact issue with Firestore writes
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrites() {
  const wordsRef = collection(db, "words");
  
  console.log("Testing different document structures...\n");
  
  // Test 1: Minimal document
  try {
    console.log("Test 1: Minimal document (word + category only)");
    await addDoc(wordsRef, {
      word: "TestWord",
      category: "Test",
    });
    console.log("✅ Test 1 passed\n");
  } catch (error: any) {
    console.error("❌ Test 1 failed:", error.message);
  }
  
  // Test 2: With Timestamp.now()
  try {
    console.log("Test 2: With Timestamp.now()");
    await addDoc(wordsRef, {
      word: "TestWord2",
      category: "Test",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log("✅ Test 2 passed\n");
  } catch (error: any) {
    console.error("❌ Test 2 failed:", error.message);
  }
  
  // Test 3: With serverTimestamp()
  try {
    console.log("Test 3: With serverTimestamp()");
    await addDoc(wordsRef, {
      word: "TestWord3",
      category: "Test",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("✅ Test 3 passed\n");
  } catch (error: any) {
    console.error("❌ Test 3 failed:", error.message);
  }
  
  // Test 4: With arrays
  try {
    console.log("Test 4: With languages and regions arrays");
    await addDoc(wordsRef, {
      word: "TestWord4",
      category: "Test",
      languages: ["English"],
      regions: ["US"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log("✅ Test 4 passed\n");
  } catch (error: any) {
    console.error("❌ Test 4 failed:", error.message);
  }
  
  // Test 5: With difficulty
  try {
    console.log("Test 5: With difficulty field");
    await addDoc(wordsRef, {
      word: "TestWord5",
      category: "Test",
      difficulty: "easy",
      languages: ["English"],
      regions: ["US", "UK"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log("✅ Test 5 passed\n");
  } catch (error: any) {
    console.error("❌ Test 5 failed:", error.message);
  }
  
  // Test 6: With special characters
  try {
    console.log("Test 6: Word with special characters (Ice Cream)");
    await addDoc(wordsRef, {
      word: "Ice Cream",
      category: "Food",
      difficulty: "easy",
      languages: ["English"],
      regions: ["US", "UK", "Canada"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log("✅ Test 6 passed\n");
  } catch (error: any) {
    console.error("❌ Test 6 failed:", error.message);
  }
  
  console.log("Tests complete!");
  process.exit(0);
}

testWrites().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

