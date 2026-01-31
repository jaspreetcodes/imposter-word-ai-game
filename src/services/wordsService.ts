/**
 * Words Service - Firebase integration
 * 
 * Data Structure:
 * Each word is stored as a document with metadata:
 * {
 *   word: string,
 *   category: string,
 *   difficulty?: "easy" | "medium" | "hard",
 *   languages?: string[],  // e.g., ["English", "Punjabi", "Hindi"]
 *   regions?: string[],    // e.g., ["Punjab", "Toronto", "UK"]
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 * 
 * This flat structure allows efficient querying:
 * - Filter by category
 * - Filter by language
 * - Filter by region
 * - Combine multiple filters
 * - Easy to add new metadata fields
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  QueryConstraint,
  Timestamp 
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";

export interface WordDocument {
  word: string;
  category: string;
  difficulty?: "easy" | "medium" | "hard";
  languages?: string[];
  regions?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WordFilters {
  categories?: string[];
  languages?: string[];
  regions?: string[];
  difficulty?: "easy" | "medium" | "hard";
}

/**
 * Fetch words from Firebase with optional filters
 */
export async function fetchWords(filters?: WordFilters): Promise<WordDocument[]> {
  try {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured");
    }

    const wordsRef = collection(db, "words");
    const constraints: QueryConstraint[] = [];

    console.log("🔍 Fetching words with filters:", filters);

    // Apply filters
    // Note: Firestore "in" query has a limit of 10 items
    if (filters?.categories && filters.categories.length > 0) {
      if (filters.categories.length <= 10) {
        constraints.push(where("category", "in", filters.categories));
        console.log("✅ Added category filter:", filters.categories);
      } else {
        // If more than 10 categories, split into multiple queries
        // For now, just use the first 10
        constraints.push(where("category", "in", filters.categories.slice(0, 10)));
        console.log("⚠️ Category filter limited to first 10:", filters.categories.slice(0, 10));
      }
    }

    /**
     * IMPORTANT Firestore limitation:
     * You cannot use two `array-contains-any` filters on different fields in the same query.
     * So if both languages + regions are provided, we query with ONE (prefer languages),
     * then post-filter in-memory for the other.
     */
    const wantLanguages = filters?.languages && filters.languages.length > 0 ? filters.languages : undefined;
    const wantRegions = filters?.regions && filters.regions.length > 0 ? filters.regions : undefined;

    const useLanguagesInQuery = Boolean(wantLanguages?.length);
    const useRegionsInQuery = !useLanguagesInQuery && Boolean(wantRegions?.length);

    if (useLanguagesInQuery && wantLanguages) {
      constraints.push(where("languages", "array-contains-any", wantLanguages.slice(0, 10)));
      console.log("✅ Added language filter (query):", wantLanguages);
    } else if (useRegionsInQuery && wantRegions) {
      constraints.push(where("regions", "array-contains-any", wantRegions.slice(0, 10)));
      console.log("✅ Added region filter (query):", wantRegions);
    }

    if (filters?.difficulty) {
      constraints.push(where("difficulty", "==", filters.difficulty));
      console.log("✅ Added difficulty filter:", filters.difficulty);
    }

    // Build query
    const q = constraints.length > 0 
      ? query(wordsRef, ...constraints)
      : query(wordsRef);

    console.log("📊 Executing Firestore query with", constraints.length, "constraints");
    const querySnapshot = await getDocs(q);
    const words: WordDocument[] = [];

    querySnapshot.forEach((doc) => {
      words.push(doc.data() as WordDocument);
    });

    // Post-filter (for the filter we couldn't apply in query)
    let filtered = words;
    if (useLanguagesInQuery && wantRegions) {
      filtered = filtered.filter((w) => (w.regions ?? []).some((r) => wantRegions.includes(r)));
    }
    if (useRegionsInQuery && wantLanguages) {
      filtered = filtered.filter((w) => (w.languages ?? []).some((l) => wantLanguages.includes(l)));
    }

    // If both were provided and neither was used in query (shouldn't happen), filter both
    if (!useLanguagesInQuery && !useRegionsInQuery) {
      if (wantLanguages) {
        filtered = filtered.filter((w) => (w.languages ?? []).some((l) => wantLanguages.includes(l)));
      }
      if (wantRegions) {
        filtered = filtered.filter((w) => (w.regions ?? []).some((r) => wantRegions.includes(r)));
      }
    }

    console.log(`✅ Found ${words.length} words matching filters`);
    if (filtered.length > 0) {
      console.log(`✅ After post-filter: ${filtered.length} words`);
      console.log("📝 Sample words:", filtered.slice(0, 3).map(w => `${w.word} (${w.category})`));
    }

    return filtered;
  } catch (error) {
    console.error("Error fetching words from Firebase:", error);
    throw error;
  }
}

/**
 * Get all unique categories from Firebase
 */
export async function fetchCategories(): Promise<string[]> {
  try {
    const wordsRef = collection(db, "words");
    const querySnapshot = await getDocs(query(wordsRef));
    const categories = new Set<string>();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.category) {
        categories.add(data.category);
      }
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error("Error fetching categories from Firebase:", error);
    throw error;
  }
}

/**
 * Legacy format converter - converts Firebase words to old format for compatibility
 * This maintains backward compatibility with existing code
 */
export function convertToLegacyFormat(words: WordDocument[]): Array<{
  name: string;
  difficulty?: string;
  words: string[];
  region?: string;
}> {
  const grouped: Record<string, Record<string, string[]>> = {};

  words.forEach((wordDoc) => {
    const category = wordDoc.category;
    const difficulty = wordDoc.difficulty || "easy";
    
    if (!grouped[category]) {
      grouped[category] = {};
    }
    if (!grouped[category][difficulty]) {
      grouped[category][difficulty] = [];
    }
    
    grouped[category][difficulty].push(wordDoc.word);
  });

  const result: Array<{
    name: string;
    difficulty?: string;
    words: string[];
    region?: string;
  }> = [];

  Object.entries(grouped).forEach(([category, difficulties]) => {
    Object.entries(difficulties).forEach(([difficulty, words]) => {
      result.push({
        name: category,
        difficulty,
        words,
      });
    });
  });

  return result;
}
