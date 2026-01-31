/**
 * Load and normalize words from static datasets.
 * Output: cache/raw_words.json (array of strings).
 * Run from project root: npx tsx scripts/wordPipeline/loadStaticLists.ts
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts", "wordPipeline", "cache");
const RAW_WORDS_PATH = path.join(CACHE_DIR, "raw_words.json");

const MIN_LENGTH = 2;
const MAX_LENGTH = 50;

/** Words that are clearly not suitable for the game (fluff, abbreviations, etc.) */
const SKIP_PATTERNS = [
  /^\d+$/,           // only digits
  /^[a-z]{1}$/i,     // single letter
  /^[^a-z]+$/i,      // no letters
];

function normalize(word: string): string {
  return word.trim();
}

function isValid(w: string): boolean {
  if (w.length < MIN_LENGTH || w.length > MAX_LENGTH) return false;
  if (!/[a-zA-Z]/.test(w)) return false;
  for (const re of SKIP_PATTERNS) {
    if (re.test(w)) return false;
  }
  return true;
}

function loadTxt(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split(/\r?\n/)
    .map((line) => normalize(line))
    .filter((line) => line.length > 0);
}

function loadWordListJson(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const obj = JSON.parse(content) as Record<string, unknown>;
  return Object.keys(obj).map((k) => normalize(k)).filter((k) => k.length > 0);
}

function main() {
  const wordsFromTxt = loadTxt(path.join(PUBLIC_DIR, "words_list.txt"));
  const wordsFromTxt2 = loadTxt(path.join(PUBLIC_DIR, "words_list2.txt"));
  const wordsFromJson = loadWordListJson(path.join(PUBLIC_DIR, "word_list.json"));

  const all = [...wordsFromTxt, ...wordsFromTxt2, ...wordsFromJson];
  const seen = new Set<string>();
  const raw: string[] = [];

  for (const w of all) {
    const n = normalize(w);
    if (!isValid(n)) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    raw.push(n);
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(RAW_WORDS_PATH, JSON.stringify(raw, null, 0));
  console.log(`Wrote ${raw.length} unique words to ${RAW_WORDS_PATH}`);
}

main();
