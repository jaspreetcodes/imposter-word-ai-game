/**
 * Migration Script: Migrate words from words.tsx to Firebase
 * 
 * Run this script to populate Firebase with words from the local words.tsx file
 * 
 * Usage:
 * 1. Set up Firebase project and get config
 * 2. Add Firebase config to .env file
 * 3. Run: npx tsx scripts/migrateWordsToFirebase.ts
 * 
 * This script converts the old nested structure to the new flat structure:
 * Old: { name: "Food", difficulty: "easy", words: ["Pizza", "Apple"] }
 * New: [{ word: "Pizza", category: "Food", difficulty: "easy" }, ...]
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc, Timestamp } from "firebase/firestore";
import { words } from "../src/assets/words";

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.VITE_FIREBASE_APP_ID || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface WordEntry {
  name: string;
  difficulty?: string;
  words: string[];
  region?: string;
}

/**
 * Convert old format to new Firebase format
 */
function convertToFirebaseFormat(entry: WordEntry): Array<{
  word: string;
  category: string;
  difficulty?: "easy" | "medium" | "hard";
  languages?: string[];
  regions?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}> {
  // Create timestamp - use Date and convert to Firestore Timestamp
  const now = Timestamp.fromDate(new Date());
  const category = entry.name;
  const difficulty = entry.difficulty as "easy" | "medium" | "hard" | undefined;
  
  // Determine languages and regions based on category and region
  const languages: string[] = [];
  const regions: string[] = [];
  
  // Always add English as default language
  languages.push("English");
  
  // If region is specified, add it
  if (entry.region) {
    regions.push(entry.region);
  }
  
  // Add region-specific languages and regions
  if (entry.region === "India" || (category === "Food" && entry.region === "India")) {
    languages.push("Hindi", "Punjabi", "Urdu");
    if (!regions.includes("India")) {
      regions.push("India");
    }
    // Add common Indian regions
    if (!regions.includes("Punjab")) {
      regions.push("Punjab");
    }
  }
  
  // For all words, add common regions where English is spoken
  // This ensures words are findable when users select common regions
  if (!regions.includes("US")) {
    regions.push("US");
  }
  if (!regions.includes("UK")) {
    regions.push("UK");
  }
  if (!regions.includes("Canada")) {
    regions.push("Canada");
  }

  return entry.words.map((word) => {
    // Validate word is not empty
    if (!word || typeof word !== 'string' || word.trim() === '') {
      return null;
    }
    
    const doc: any = {
      word: word.trim(),
      category: category.trim(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Only add optional fields if they have valid values (Firestore doesn't allow undefined or empty arrays)
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      doc.difficulty = difficulty;
    }
    
    // Filter out empty strings from arrays and only add if not empty
    const validLanguages = languages.filter(lang => lang && typeof lang === 'string' && lang.trim() !== '');
    if (validLanguages.length > 0) {
      doc.languages = validLanguages.map(lang => lang.trim());
    }
    
    const validRegions = regions.filter(region => region && typeof region === 'string' && region.trim() !== '');
    if (validRegions.length > 0) {
      doc.regions = validRegions.map(region => region.trim());
    }
    
    return doc;
  }).filter((doc): doc is NonNullable<typeof doc> => doc !== null);
}

/**
 * Migrate all words to Firebase
 */
async function migrateWords() {
  try {
    console.log("Starting migration...");
    const wordsRef = collection(db, "words");
    let totalWords = 0;
    let failedWords = 0;
    let batch = writeBatch(db);
    let batchOps = 0;
    const BATCH_LIMIT = 400; // Firestore hard limit is 500 writes per batch

    for (const entry of words as WordEntry[]) {
      const firebaseWords = convertToFirebaseFormat(entry);
      
      for (const wordDoc of firebaseWords) {
        try {
          // Final validation before adding
          if (!wordDoc || !wordDoc.word || !wordDoc.category) {
            console.error(`❌ Skipping invalid document:`, wordDoc);
            failedWords++;
            continue;
          }
          
          // Create a clean document object, ensuring no undefined values
          const cleanDoc: any = {
            word: String(wordDoc.word).trim(),
            category: String(wordDoc.category).trim(),
            createdAt: wordDoc.createdAt,
            updatedAt: wordDoc.updatedAt,
          };
          
          // Only add optional fields if they exist and are valid
          if (wordDoc.difficulty && ['easy', 'medium', 'hard'].includes(wordDoc.difficulty)) {
            cleanDoc.difficulty = wordDoc.difficulty;
          }
          
          if (wordDoc.languages && Array.isArray(wordDoc.languages) && wordDoc.languages.length > 0) {
            cleanDoc.languages = wordDoc.languages.filter(lang => lang && typeof lang === 'string').map(lang => String(lang).trim());
          }
          
          if (wordDoc.regions && Array.isArray(wordDoc.regions) && wordDoc.regions.length > 0) {
            cleanDoc.regions = wordDoc.regions.filter(region => region && typeof region === 'string').map(region => String(region).trim());
          }
          
          // Validate the clean document one more time
          if (!cleanDoc.word || cleanDoc.word === '' || !cleanDoc.category || cleanDoc.category === '') {
            console.error(`❌ Skipping document with empty word or category:`, cleanDoc);
            failedWords++;
            continue;
          }
          
          // Log first few documents for debugging
          if (totalWords < 3) {
            console.log(`📝 Sample document being added:`, {
              word: cleanDoc.word,
              category: cleanDoc.category,
              difficulty: cleanDoc.difficulty,
              languages: cleanDoc.languages,
              regions: cleanDoc.regions,
              hasTimestamps: !!cleanDoc.createdAt && !!cleanDoc.updatedAt,
            });
          }

          // Queue in batch (bulk insert)
          const ref = doc(wordsRef);
          batch.set(ref, cleanDoc);
          batchOps++;
          totalWords++;

          // Commit periodically
          if (batchOps >= BATCH_LIMIT) {
            console.log(`📦 Committing batch... (${totalWords} queued so far)`);
            await batch.commit();
            batch = writeBatch(db);
            batchOps = 0;
          }

          if (totalWords % 50 === 0) {
            console.log(`Migrated ${totalWords} words...`);
          }
        } catch (error: any) {
          console.error(`❌ Failed to migrate word "${wordDoc?.word || 'unknown'}":`, error.message);
          console.error("Error code:", error.code);
          console.error("Full error:", error);
          
          // Try to identify which field is problematic
          if (wordDoc) {
            console.error("Problematic document structure:");
            console.error("- word:", typeof wordDoc.word, wordDoc.word);
            console.error("- category:", typeof wordDoc.category, wordDoc.category);
            console.error("- difficulty:", typeof wordDoc.difficulty, wordDoc.difficulty);
            console.error("- languages:", Array.isArray(wordDoc.languages), wordDoc.languages);
            console.error("- regions:", Array.isArray(wordDoc.regions), wordDoc.regions);
            console.error("- createdAt:", wordDoc.createdAt?.constructor?.name);
            console.error("- updatedAt:", wordDoc.updatedAt?.constructor?.name);
          }
          
          failedWords++;
          
          // Stop after 5 failures to avoid spam
          if (failedWords >= 5) {
            console.error("❌ Too many failures. Stopping migration. Please check the errors above.");
            break;
          }
        }
      }
    }

    // Commit remaining ops
    if (batchOps > 0) {
      console.log(`📦 Committing final batch... (${batchOps} ops)`);
      await batch.commit();
    }

    console.log(`✅ Migration complete! Migrated ${totalWords} words to Firebase.`);
    if (failedWords > 0) {
      console.log(`⚠️  ${failedWords} words failed to migrate.`);
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateWords();
