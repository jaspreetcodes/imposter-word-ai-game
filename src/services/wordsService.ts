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
  doc,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  QueryConstraint,
  Timestamp,
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

    const pending = getPendingWordsForFilters(filters);
    if (pending.length > 0) {
      console.log(`✅ Merged ${pending.length} pending (session) words for this language/region`);
      return [...filtered, ...pending];
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

/** Stable doc ID for a word (category + word). */
function makeWordId(category: string, word: string): string {
  const raw = `${category}__${word}`.toLowerCase().trim();
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "word";
}

export interface WordDocumentLike {
  word: string;
  category: string;
  languages?: string[];
  regions?: string[];
  difficulty?: "easy" | "medium" | "hard";
}

/** Session storage key for pending AI-generated words (language::region → words). Used so user can play with new language while full generation runs in background. */
const PENDING_WORDS_KEY = "wordgame_pending_words";

function pendingKey(language: string, region: string): string {
  return `${language.trim().toLowerCase()}::${region.trim().toLowerCase()}`;
}

/** Get all pending words from sessionStorage. */
export function getPendingWords(): Record<string, WordDocumentLike[]> {
  try {
    const raw = sessionStorage.getItem(PENDING_WORDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, WordDocumentLike[]>) : {};
  } catch {
    return {};
  }
}

/** Merge words for a language/region into pending cache (replaces existing for that key). */
export function setPendingWordsEntry(language: string, region: string, words: WordDocumentLike[]): void {
  const store = getPendingWords();
  store[pendingKey(language, region)] = words;
  sessionStorage.setItem(PENDING_WORDS_KEY, JSON.stringify(store));
}

/** Get pending words that match the given filters (language/region). Returns WordDocument[] for merging with Firestore results. */
export function getPendingWordsForFilters(filters?: WordFilters): WordDocument[] {
  const store = getPendingWords();
  const wantLanguages = filters?.languages?.length ? filters.languages : undefined;
  const wantRegions = filters?.regions?.length ? filters.regions : undefined;
  if (!wantLanguages && !wantRegions) return [];
  const out: WordDocument[] = [];
  for (const [key, words] of Object.entries(store)) {
    const [lang, reg] = key.split("::");
    const langMatch = !wantLanguages || wantLanguages.some((l) => l.trim().toLowerCase() === lang);
    const regMatch = !wantRegions || wantRegions.some((r) => r.trim().toLowerCase() === reg);
    if (langMatch && regMatch) {
      for (const w of words) {
        out.push({
          word: w.word,
          category: w.category,
          languages: w.languages,
          regions: w.regions,
          difficulty: w.difficulty,
        });
      }
    }
  }
  return out;
}

const BATCH_LIMIT = 400;

/**
 * Add generated words to Firestore. Uses merge so existing docs are updated.
 * Call from frontend after receiving words from the word-gen API.
 */
export async function addWordsToFirestore(
  words: WordDocumentLike[]
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const wordsRef = collection(db, "words");
  let batch = writeBatch(db);
  let ops = 0;

  for (const w of words) {
    const category = String(w.category ?? "").trim();
    const word = String(w.word ?? "").trim();
    if (!category || !word) continue;

    try {
      const id = makeWordId(category, word);
      const payload: Record<string, unknown> = {
        word,
        category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (w.difficulty) payload.difficulty = w.difficulty;
      if (w.languages?.length) payload.languages = w.languages;
      if (w.regions?.length) payload.regions = w.regions;

      batch.set(doc(wordsRef, id), payload, { merge: true });
      ops++;

      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    } catch (e) {
      errors.push(`${category}/${word}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (ops > 0) await batch.commit();
  return { added: words.length - errors.length, errors };
}
