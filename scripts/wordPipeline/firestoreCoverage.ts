/**
 * Server-side Firestore coverage check for a (language, region) locale.
 * Used before AI generation to decide cache miss vs hit and extended grounding.
 * Non-English locales only require culture-rich categories.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  getDocs,
  type Firestore,
} from "firebase/firestore";
import {
  ALL_CATEGORIES,
  categoriesForLocale,
} from "../../src/constants/categories";

/** @deprecated Prefer categoriesForLocale(language); kept for callers expecting the full list. */
export const GAME_CATEGORIES = ALL_CATEGORIES;

export interface LocaleCoverageResult {
  language: string;
  region: string;
  totalWords: number;
  categoryCounts: Record<string, number>;
  missingCategories: string[];
  cacheMiss: boolean;
  minPerCategory: number;
}

const DEFAULT_MIN_PER_CATEGORY = Number(process.env.WORDGEN_MIN_WORDS_PER_CATEGORY) || 5;

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

/** Set by the Firebase emulator suite, e.g. "127.0.0.1:8080". */
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

function getDb(): Firestore | null {
  // Against the emulator any well-formed config works, so tests do not need real keys.
  const apiKey =
    process.env.VITE_FIREBASE_API_KEY || (emulatorHost ? "demo-api-key" : undefined);
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    (emulatorHost ? process.env.QA_FIREBASE_PROJECT_ID || "demo-mafiasword" : undefined);
  if (!apiKey || !projectId) return null;

  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        apiKey,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
      });
    db = getFirestore(app);
    if (emulatorHost) {
      const [host, port] = emulatorHost.split(":");
      connectFirestoreEmulator(db, host, Number(port) || 8080);
      console.log(`Coverage check using Firestore emulator at ${emulatorHost}`);
    }
  }
  return db ?? null;
}

function normalizeCategory(category: string): string {
  return category.trim();
}

/**
 * Count words per category for a locale. Returns cacheMiss=true when any required
 * category for that language has fewer than minPerCategory words.
 */
export async function checkLocaleCoverage(
  language: string,
  region: string,
  minPerCategory = DEFAULT_MIN_PER_CATEGORY
): Promise<LocaleCoverageResult> {
  const lang = language.trim();
  const reg = region.trim();
  const requiredCategories = [...categoriesForLocale(lang)];
  const categoryCounts: Record<string, number> = {};
  for (const c of requiredCategories) categoryCounts[c] = 0;

  const firestore = getDb();
  if (!firestore) {
    return {
      language: lang,
      region: reg,
      totalWords: 0,
      categoryCounts,
      missingCategories: [...requiredCategories],
      cacheMiss: true,
      minPerCategory,
    };
  }

  try {
    const wordsRef = collection(firestore, "words");
    const q = query(wordsRef, where("languages", "array-contains", lang));
    const snap = await getDocs(q);

    const seen = new Set<string>();
    let totalWords = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as {
        word?: string;
        category?: string;
        regions?: string[];
      };
      const word = String(data.word ?? "").trim();
      const category = normalizeCategory(String(data.category ?? ""));
      const regions = Array.isArray(data.regions) ? data.regions : [];
      if (!word || !category) return;
      const regionMatch =
        regions.length === 0 ||
        regions.some((r) => r.toLowerCase() === reg.toLowerCase());
      if (!regionMatch) return;

      const dedupe = `${category}::${word.toLowerCase()}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      totalWords++;
      if (category in categoryCounts) {
        categoryCounts[category]++;
      } else {
        // Niche / extra categories still counted for totals
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      }
    });

    const missingCategories = requiredCategories.filter(
      (c) => (categoryCounts[c] ?? 0) < minPerCategory
    );

    return {
      language: lang,
      region: reg,
      totalWords,
      categoryCounts,
      missingCategories,
      cacheMiss: missingCategories.length > 0,
      minPerCategory,
    };
  } catch (e) {
    console.error("Firestore coverage check failed:", e);
    return {
      language: lang,
      region: reg,
      totalWords: 0,
      categoryCounts,
      missingCategories: [...requiredCategories],
      cacheMiss: true,
      minPerCategory,
    };
  }
}
