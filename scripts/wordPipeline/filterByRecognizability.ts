/**
 * Filter categorized words by recognizability and assign difficulty (easy/medium/hard).
 * Writes cache/words_processed.json.
 * Run from project root: npx tsx scripts/wordPipeline/filterByRecognizability.ts
 * Env: HF_TOKEN. Optional: SAMPLE_SIZE to limit input from words_categorized.json.
 */

import * as fs from "fs";
import * as path from "path";
import { prompt } from "./mistralClient";

const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts", "wordPipeline", "cache");
const CATEGORIZED_PATH = path.join(CACHE_DIR, "words_categorized.json");
const POS_FILTERED_PATH = path.join(CACHE_DIR, "words_pos_filtered.json");
const PROCESSED_PATH = path.join(CACHE_DIR, "words_processed.json");

const BATCH_SIZE = 30;

export interface ProcessedWord {
  word: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  recognized: boolean;
}

interface CategorizedWord {
  word: string;
  category: string;
}

const SYSTEM = `You evaluate words for a party word game (imposter style). Most players should recognize the word.
For each word, output:
1. "recognized": true if widely known by general players, false if obscure or niche.
2. "difficulty": "easy" (very common), "medium" (known by many), "hard" (less common but still recognizable).
Reply with only a JSON array of objects with keys: word, recognized (boolean), difficulty ("easy"|"medium"|"hard"). No other text.`;

function parseBatchResponse(text: string, batch: CategorizedWord[]): ProcessedWord[] {
  const out: ProcessedWord[] = [];
  const normalized = text.replace(/[\s\n]/g, " ").trim();
  const start = normalized.indexOf("[");
  const end = normalized.lastIndexOf("]");
  const jsonStr = start !== -1 && end !== -1 && end > start ? normalized.slice(start, end + 1) : normalized;
  const validDiff = new Set(["easy", "medium", "hard"]);
  try {
    const arr = JSON.parse(jsonStr) as Array<{
      word?: string;
      recognized?: boolean;
      difficulty?: string;
    }>;
    if (!Array.isArray(arr)) return out;
    for (const item of arr) {
      const word = typeof item.word === "string" ? item.word.trim() : "";
      const recognized = typeof item.recognized === "boolean" ? item.recognized : true;
      let difficulty = typeof item.difficulty === "string" ? item.difficulty.toLowerCase() : "medium";
      if (!validDiff.has(difficulty)) difficulty = "medium";
      out.push({
        word,
        category: batch.find((b) => b.word === word)?.category ?? "Objects & Things",
        difficulty: difficulty as "easy" | "medium" | "hard",
        recognized,
      });
    }
  } catch {
    for (const b of batch) {
      out.push({
        word: b.word,
        category: b.category,
        difficulty: "medium",
        recognized: true,
      });
    }
  }
  return out;
}

async function main() {
  const inputPath = fs.existsSync(POS_FILTERED_PATH) ? POS_FILTERED_PATH : CATEGORIZED_PATH;
  if (!fs.existsSync(inputPath)) {
    console.error("Run categorizeWithMistral.ts (and optionally filterPartOfSpeech.ts) first:", inputPath);
    process.exit(1);
  }
  if (inputPath === POS_FILTERED_PATH) {
    console.log("Using POS-filtered input:", POS_FILTERED_PATH);
  }

  const categorized = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as CategorizedWord[];
  const sampleSize = process.env.SAMPLE_SIZE ? parseInt(process.env.SAMPLE_SIZE, 10) : categorized.length;
  const words = categorized.slice(0, Number.isNaN(sampleSize) ? categorized.length : sampleSize);

  const results: ProcessedWord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const batchList = batch.map((w) => w.word).join(", ");
    const userPrompt = `Evaluate these words for a party game. For each, set "recognized" (true/false) and "difficulty" (easy/medium/hard). Reply with a JSON array of { "word": "...", "recognized": true/false, "difficulty": "easy"|"medium"|"hard" }.\nWords: ${batchList}`;

    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)} (${batch.length} words)`);
    const reply = await prompt(userPrompt, SYSTEM, { maxTokens: 1024, temperature: 0.2 });
    const parsed = parseBatchResponse(reply, batch);
    for (const p of parsed) {
      const key = p.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(p);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  // Optional: filter to recognized only (so obscure words are excluded from the final list)
  const recognizedOnly = process.env.INCLUDE_UNRECOGNIZED === "true" ? results : results.filter((w) => w.recognized);

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(recognizedOnly, null, 2));
  console.log(`Wrote ${recognizedOnly.length} processed words to ${PROCESSED_PATH} (${results.length - recognizedOnly.length} excluded as unrecognized)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
