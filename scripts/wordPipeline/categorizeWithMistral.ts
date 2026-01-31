/**
 * Categorize raw words with Mistral 7B (batched). Writes cache/words_categorized.json.
 * Run from project root: npx tsx scripts/wordPipeline/categorizeWithMistral.ts
 * Env: HF_TOKEN. Optional: SAMPLE_SIZE=200 to process only first N words.
 */

import * as fs from "fs";
import * as path from "path";
import { prompt } from "./mistralClient";

const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts", "wordPipeline", "cache");
const RAW_WORDS_PATH = path.join(CACHE_DIR, "raw_words.json");
const CATEGORIZED_PATH = path.join(CACHE_DIR, "words_categorized.json");

const CATEGORIES = [
  "Food",
  "Animals",
  "Movies & TV",
  "Sports & Games",
  "Places",
  "Jobs & Professions",
  "Objects & Things",
  "Names",
  "Chemicals",
  "Music",
  "Science",
  "Basic Words",
  "Colors & Shades",
  "Entertainment",
  "Famous People",
  "Geography",
  "Literature",
  "Artists",
  "Technology",
];

const BATCH_SIZE = 25;

export interface CategorizedWord {
  word: string;
  category: string;
}

const SYSTEM = `You are a classifier for a party word game. Assign each word to exactly one of these categories: ${CATEGORIES.join(", ")}.
If a word does not clearly fit any category, use "Objects & Things".
Reply with only a JSON array of objects, each with keys "word" and "category". No other text.`;

function parseBatchResponse(text: string, batchWords: string[]): CategorizedWord[] {
  const out: CategorizedWord[] = [];
  const normalized = text.replace(/[\s\n]/g, " ").trim();
  let jsonStr = normalized;
  const start = normalized.indexOf("[");
  const end = normalized.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    jsonStr = normalized.slice(start, end + 1);
  }
  try {
    const arr = JSON.parse(jsonStr) as Array<{ word?: string; category?: string }>;
    if (!Array.isArray(arr)) return out;
    const validCategories = new Set(CATEGORIES);
    for (const item of arr) {
      const word = typeof item.word === "string" ? item.word.trim() : "";
      const category = typeof item.category === "string" ? item.category.trim() : "";
      if (!word) continue;
      const cat = validCategories.has(category) ? category : "Objects & Things";
      out.push({ word, category: cat });
    }
  } catch {
    // Fallback: assign all batch words to Objects & Things
    for (const w of batchWords) {
      out.push({ word: w, category: "Objects & Things" });
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(RAW_WORDS_PATH)) {
    console.error("Run loadStaticLists.ts first to create", RAW_WORDS_PATH);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(RAW_WORDS_PATH, "utf-8")) as string[];
  const sampleSize = process.env.SAMPLE_SIZE ? parseInt(process.env.SAMPLE_SIZE, 10) : raw.length;
  const words = raw.slice(0, Number.isNaN(sampleSize) ? raw.length : sampleSize);

  const results: CategorizedWord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const batchList = batch.map((w) => `"${w.replace(/"/g, '\\"')}"`).join(", ");
    const userPrompt = `Classify these words into the given categories. Reply with a JSON array of { "word": "...", "category": "..." } for each.\nWords: ${batchList}`;

    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)} (${batch.length} words)`);
    const reply = await prompt(userPrompt, SYSTEM, { maxTokens: 1024, temperature: 0.2 });
    const parsed = parseBatchResponse(reply, batch);
    for (const p of parsed) {
      const key = p.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(p);
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(CATEGORIZED_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} categorized words to ${CATEGORIZED_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
