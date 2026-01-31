/**
 * Generate Sample Data for Firebase
 * 
 * This script generates additional sample words with languages and regions
 * to demonstrate the new filtering capabilities
 * 
 * Run: npx tsx scripts/generateSampleData.ts
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc as docRef, Timestamp } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const sampleWords = [
  // Punjabi words
  { word: "Roti", category: "Food", languages: ["Punjabi", "Hindi", "Urdu"], regions: ["Punjab", "India"] },
  { word: "Paratha", category: "Food", languages: ["Punjabi", "Hindi"], regions: ["Punjab", "India"] },
  { word: "Lassi", category: "Food", languages: ["Punjabi", "Hindi"], regions: ["Punjab", "India"] },
  { word: "Sarson", category: "Food", languages: ["Punjabi"], regions: ["Punjab", "India"] },
  
  // Hindi words
  { word: "Namaste", category: "Objects & Things", languages: ["Hindi"], regions: ["India"] },
  { word: "Chai", category: "Food", languages: ["Hindi", "Urdu"], regions: ["India"] },
  { word: "Biryani", category: "Food", languages: ["Hindi", "Urdu"], regions: ["India"] },
  
  // UK slang
  { word: "Roadman", category: "Jobs & Professions", languages: ["English"], regions: ["UK", "London"] },
  { word: "Bruv", category: "Objects & Things", languages: ["English"], regions: ["UK", "London"] },
  { word: "Crisps", category: "Food", languages: ["English"], regions: ["UK"] },
  
  // Toronto/Canadian
  { word: "Poutine", category: "Food", languages: ["English", "French"], regions: ["Toronto", "Canada"] },
  { word: "Tim Hortons", category: "Places", languages: ["English"], regions: ["Toronto", "Canada"] },
  { word: "Toque", category: "Objects & Things", languages: ["English", "French"], regions: ["Canada"] },
  
  // Spanish words
  { word: "Taco", category: "Food", languages: ["Spanish", "English"], regions: ["Mexico"] },
  { word: "Fiesta", category: "Places", languages: ["Spanish"], regions: ["Mexico", "Spain"] },
  { word: "Amigo", category: "Objects & Things", languages: ["Spanish"], regions: ["Mexico", "Spain"] },
  
  // French words
  { word: "Croissant", category: "Food", languages: ["French", "English"], regions: ["France"] },
  { word: "Bonjour", category: "Objects & Things", languages: ["French"], regions: ["France"] },
  { word: "Baguette", category: "Food", languages: ["French"], regions: ["France"] },
];

// New category words: loaded from scripts/newCategoryWords.json (20 per category: 10 English, 5 French, 5 Indian)
const newCategoryWords: Array<{ word: string; category: string; languages: string[]; regions: string[] }> = JSON.parse(
  readFileSync(join(__dirname, "newCategoryWords.json"), "utf-8")
);

const allWordsToSeed = [...sampleWords, ...newCategoryWords];

async function generateSampleData() {
  try {
    console.log("Generating sample data...");
    const wordsRef = collection(db, "words");
    const now = Timestamp.now();
    const batch = writeBatch(db);
    let ops = 0;

    for (const wordData of allWordsToSeed) {
      const payload: any = {
        word: wordData.word,
        category: wordData.category,
        difficulty: "medium",
        createdAt: now,
        updatedAt: now,
      };
      
      // Only add optional fields if they exist
      if (wordData.languages && wordData.languages.length > 0) {
        payload.languages = wordData.languages;
      }
      if (wordData.regions && wordData.regions.length > 0) {
        payload.regions = wordData.regions;
      }

      batch.set(docRef(wordsRef), payload);
      ops++;
    }

    if (ops > 0) {
      await batch.commit();
    }

    console.log(`✅ Generated ${allWordsToSeed.length} sample words with languages and regions (${sampleWords.length} original + ${newCategoryWords.length} new category words).`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  }
}

generateSampleData();
