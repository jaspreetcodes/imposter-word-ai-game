/**
 * Filter words by part of speech / game suitability. Drops verbs, adverbs, etc.
 * Reads cache/words_categorized.json; writes cache/words_pos_filtered.json.
 *
 * Run: npx tsx scripts/wordPipeline/filterPartOfSpeech.ts
 * Env: HF_TOKEN. Optional: SAMPLE_SIZE, LANGUAGE (for prompt context).
 */

import * as fs from "fs";
import * as path from "path";
import { prompt } from "./mistralClient";

const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts", "wordPipeline", "cache");
const CATEGORIZED_PATH = path.join(CACHE_DIR, "words_categorized.json");
const FILTERED_PATH = path.join(CACHE_DIR, "words_pos_filtered.json");

const BATCH_SIZE = 25;

interface CategorizedWord {
  word: string;
  category: string;
}

interface PosResult {
  word: string;
  category: string;
  pos?: string;
  keep: boolean;
  reason?: string;
}

const SYSTEM = `You filter vocabulary for a party word guessing game (imposter/mafia style).
For each word, decide if it is suitable: nouns, proper nouns, and fixed lexical items that players can describe.
REJECT (keep=false): verbs, adverbs, prepositions, conjunctions, pronouns, grammar particles, infinitives, multi-word phrases, obscure grammar forms.
Reply with ONLY a JSON array: [{"word":"...","keep":true|false,"pos":"noun|verb|...","reason":"brief"}]. No other text.`;

function parseBatchResponse(text: string, batch: CategorizedWord[]): PosResult[] {
  const normalized = text.replace(/[\s\n]/g, " ").trim();
  const start = normalized.indexOf("[");
  const end = normalized.lastIndexOf("]");
  const jsonStr = start !== -1 && end > start ? normalized.slice(start, end + 1) : normalized;
  try {
    const arr = JSON.parse(jsonStr) as Array<{
      word?: string;
      keep?: boolean;
      pos?: string;
      reason?: string;
    }>;
    if (!Array.isArray(arr)) throw new Error("not array");
    const byWord = new Map(batch.map((b) => [b.word.toLowerCase(), b]));
    return arr.map((item) => {
      const word = String(item.word ?? "").trim();
      const src = byWord.get(word.toLowerCase());
      return {
        word,
        category: src?.category ?? "Objects & Things",
        pos: item.pos,
        keep: item.keep === true,
        reason: item.reason,
      };
    });
  } catch {
    return batch.map((b) => ({
      word: b.word,
      category: b.category,
      keep: true,
      reason: "parse_fallback",
    }));
  }
}

async function main() {
  if (!fs.existsSync(CATEGORIZED_PATH)) {
    console.error("Run categorizeWithMistral.ts first:", CATEGORIZED_PATH);
    process.exit(1);
  }

  const language = process.env.LANGUAGE ?? "English";
  let words = JSON.parse(fs.readFileSync(CATEGORIZED_PATH, "utf-8")) as CategorizedWord[];
  const sampleSize = process.env.SAMPLE_SIZE ? Number(process.env.SAMPLE_SIZE) : 0;
  if (sampleSize > 0) words = words.slice(0, sampleSize);

  const kept: CategorizedWord[] = [];
  const rejected: PosResult[] = [];

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const userPrompt = `Language context: ${language}. Category assignments are already set — only filter by POS/suitability.\n\nWords:\n${JSON.stringify(batch)}`;
    const text = await prompt(userPrompt, SYSTEM, { maxTokens: 1024 });
    const results = parseBatchResponse(text, batch);
    for (const r of results) {
      if (r.keep) {
        kept.push({ word: r.word, category: r.category });
      } else {
        rejected.push(r);
      }
    }
    console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: kept ${kept.length}, rejected ${rejected.length}`);
  }

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(FILTERED_PATH, JSON.stringify(kept, null, 2));
  fs.writeFileSync(
    path.join(CACHE_DIR, "words_pos_rejected.json"),
    JSON.stringify(rejected, null, 2)
  );
  console.log(`Kept ${kept.length} / ${words.length} → ${FILTERED_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
