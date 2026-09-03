/**
 * Report English-like tokens sitting in non-English universal categories.
 * Does not delete — prints a JSON/CSV-style report for manual cleanup.
 *
 * Usage:
 *   npx tsx scripts/wordPipeline/reportEnglishLoanwords.ts
 *   npx tsx scripts/wordPipeline/reportEnglishLoanwords.ts --language=Hindi
 *
 * Requires VITE_FIREBASE_* env for Firestore; otherwise exits with a clear message.
 */
import "dotenv/config";

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  UNIVERSAL_CATEGORIES,
  isEnglishLanguage,
} from "../../src/constants/categories";
import {
  getSeedWordsFromFiles,
  hasSeedDictionary,
} from "./seedWords";

const UNIVERSAL_SET = new Set(
  UNIVERSAL_CATEGORIES.map((c) => c.toLowerCase())
);

/** Small fallback English lexicon when seed file is missing. */
const FALLBACK_ENGLISH = new Set(
  [
    "red",
    "blue",
    "green",
    "yellow",
    "black",
    "white",
    "bread",
    "milk",
    "water",
    "doctor",
    "teacher",
    "farmer",
    "oak",
    "tree",
    "dog",
    "cat",
    "bird",
    "house",
    "car",
    "book",
    "table",
    "chair",
    "apple",
    "orange",
    "school",
    "hospital",
    "police",
    "engineer",
    "scientist",
    "basic",
    "simple",
  ].map((w) => w.toLowerCase())
);

function loadEnglishLexicon(): Set<string> {
  if (hasSeedDictionary("English") || hasSeedDictionary("en")) {
    const seeds = getSeedWordsFromFiles("English", 8000);
    if (seeds.length > 0) {
      return new Set(seeds.map((w) => w.toLowerCase()));
    }
  }
  return FALLBACK_ENGLISH;
}

function parseArgs(): { language?: string } {
  const out: { language?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--language=")) {
      out.language = arg.slice("--language=".length).trim();
    }
  }
  return out;
}

async function main() {
  const { language: filterLang } = parseArgs();
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.error(
      "Firebase env not set (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID). Nothing to scan."
    );
    process.exit(1);
  }

  const app =
    getApps()[0] ??
    initializeApp({
      apiKey,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    });
  const db = getFirestore(app);
  const englishLexicon = loadEnglishLexicon();

  const snap = await getDocs(collection(db, "words"));
  type Hit = {
    id: string;
    word: string;
    category: string;
    languages: string[];
    regions: string[];
  };
  const hits: Hit[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as {
      word?: string;
      category?: string;
      languages?: string[];
      regions?: string[];
    };
    const word = String(data.word ?? "").trim();
    const category = String(data.category ?? "").trim();
    const languages = Array.isArray(data.languages) ? data.languages : [];
    const regions = Array.isArray(data.regions) ? data.regions : [];
    if (!word || !category) return;
    if (!UNIVERSAL_SET.has(category.toLowerCase())) return;

    const nonEnglishLangs = languages.filter((l) => !isEnglishLanguage(l));
    if (nonEnglishLangs.length === 0) return;
    if (
      filterLang &&
      !nonEnglishLangs.some(
        (l) => l.trim().toLowerCase() === filterLang.toLowerCase()
      )
    ) {
      return;
    }

    if (englishLexicon.has(word.toLowerCase())) {
      hits.push({
        id: docSnap.id,
        word,
        category,
        languages: nonEnglishLangs,
        regions,
      });
    }
  });

  hits.sort((a, b) =>
    `${a.category}:${a.word}`.localeCompare(`${b.category}:${b.word}`)
  );

  console.error(
    `Found ${hits.length} English-like tokens in non-English universal categories` +
      (filterLang ? ` (language=${filterLang})` : "")
  );
  console.log(JSON.stringify({ count: hits.length, hits }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
