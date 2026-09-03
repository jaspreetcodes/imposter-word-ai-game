/**
 * Export cache/words_processed.json to Firestore or to a seed JSON file.
 * Run from project root: npx tsx scripts/wordPipeline/exportToFirestore.ts
 * Env: Set VITE_FIREBASE_* for Firestore upload; otherwise writes scripts/wordPipeline/cache/words_seed.json.
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts", "wordPipeline", "cache");
const PROCESSED_PATH = path.join(CACHE_DIR, "words_processed.json");
const SEED_JSON_PATH = path.join(CACHE_DIR, "words_seed.json");

interface ProcessedWord {
  word: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  recognized?: boolean;
}

export interface SeedWordDoc {
  word: string;
  category: string;
  difficulty?: "easy" | "medium" | "hard";
  languages: string[];
  regions: string[];
}

const DEFAULT_LANGUAGES = ["English"];
const DEFAULT_REGIONS = ["US", "UK", "Canada"];

function makeSeedDocs(processed: ProcessedWord[]): SeedWordDoc[] {
  const languages = process.env.LANGUAGE
    ? [process.env.LANGUAGE.trim()]
    : DEFAULT_LANGUAGES;
  const regions = process.env.REGION
    ? [process.env.REGION.trim()]
    : process.env.REGIONS
      ? process.env.REGIONS.split(",").map((r) => r.trim()).filter(Boolean)
      : DEFAULT_REGIONS;

  return processed.map((p) => ({
    word: p.word.trim(),
    category: p.category.trim(),
    difficulty: p.difficulty ?? "medium",
    languages: [...languages],
    regions: [...regions],
  }));
}

async function main() {
  if (!fs.existsSync(PROCESSED_PATH)) {
    console.error("Run filterByRecognizability.ts first to create", PROCESSED_PATH);
    process.exit(1);
  }

  const processed = JSON.parse(fs.readFileSync(PROCESSED_PATH, "utf-8")) as ProcessedWord[];
  const seedDocs = makeSeedDocs(processed);

  // Always write seed JSON (can be imported by seedFirestore or a one-off script)
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(SEED_JSON_PATH, JSON.stringify(seedDocs, null, 2));
  console.log(`Wrote ${seedDocs.length} seed documents to ${SEED_JSON_PATH}`);

  // Optional: upload to Firestore if Firebase env is set
  const hasFirebase =
    process.env.VITE_FIREBASE_API_KEY &&
    process.env.VITE_FIREBASE_PROJECT_ID;

  if (hasFirebase) {
    const { initializeApp } = await import("firebase/app");
    const { getFirestore, collection, doc, writeBatch, serverTimestamp } = await import("firebase/firestore");

    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    function makeWordId(category: string, word: string): string {
      const raw = `${category}__${word}`.toLowerCase().trim();
      return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 180);
    }

    const wordsRef = collection(db, "words");
    let fbBatch = writeBatch(db);
    let ops = 0;
    const BATCH_LIMIT = 400;

    for (const d of seedDocs) {
      const id = makeWordId(d.category, d.word);
      fbBatch.set(doc(wordsRef, id), {
        word: d.word,
        category: d.category,
        difficulty: d.difficulty ?? "medium",
        languages: d.languages,
        regions: d.regions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops++;
      if (ops >= BATCH_LIMIT) {
        await fbBatch.commit();
        fbBatch = writeBatch(db);
        ops = 0;
      }
    }
    if (ops > 0) {
      await fbBatch.commit();
    }
    console.log(`Uploaded ${seedDocs.length} words to Firestore.`);
  } else {
    console.log("Firebase env not set; only seed JSON was written. Set VITE_FIREBASE_* to upload to Firestore.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
