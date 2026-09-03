/**
 * Sample random words from public/seed for offline pipeline.
 * Streams from .txt.gz for large languages (no full RAM load).
 *
 * Usage: LANGUAGE=punjabi SAMPLE_SIZE=5000 npx tsx scripts/wordPipeline/sampleSeedWords.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  normalizeSeedKey,
  parseWordListText,
  readAllWords,
  reservoirSampleFromGzip,
  seedFileExists,
  seedPaths,
} from "./seedStorage";

const CACHE_DIR = path.join(process.cwd(), "scripts", "wordPipeline", "cache");
const RAW_WORDS_PATH = path.join(CACHE_DIR, "raw_words.json");

async function sampleWords(language: string, n: number): Promise<string[]> {
  const key = normalizeSeedKey(language);
  const paths = seedPaths(key);

  if (fs.existsSync(paths.gzip)) {
    return reservoirSampleFromGzip(paths.gzip, n);
  }
  if (fs.existsSync(paths.txt)) {
    const all = parseWordListText(fs.readFileSync(paths.txt, "utf-8"));
    if (all.length <= n) return all;
    const used = new Set<number>();
    const out: string[] = [];
    while (out.length < n) {
      const i = Math.floor(Math.random() * all.length);
      if (used.has(i)) continue;
      used.add(i);
      out.push(all[i]);
    }
    return out;
  }

  const all = readAllWords(language);
  if (all.length <= n) return all;
  const used = new Set<number>();
  const out: string[] = [];
  while (out.length < n) {
    const i = Math.floor(Math.random() * all.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(all[i]);
  }
  return out;
}

async function main() {
  const language = process.env.LANGUAGE ?? process.argv[2] ?? "punjabi";
  const sampleSize = Number(process.env.SAMPLE_SIZE ?? process.argv[3] ?? 5000);

  if (!seedFileExists(language)) {
    console.error(
      `No seed file for "${language}". Run: npm run seed:download -- ${normalizeSeedKey(language)}`
    );
    process.exit(1);
  }

  const sampled = await sampleWords(language, sampleSize);

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(RAW_WORDS_PATH, JSON.stringify(sampled, null, 2));
  console.log(
    `Wrote ${sampled.length} words from seed/${normalizeSeedKey(language)} → ${RAW_WORDS_PATH}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
