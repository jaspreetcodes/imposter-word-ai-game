/**
 * Seed vocabulary for grounding the word generator.
 *
 * On disk (gitignored): public/seed/<lang>.txt.gz + .meta.json + optional .grounding.json.gz
 * Download: npm run seed:download -- --all
 */

import * as fs from "fs";
import {
  LARGE_DICT_THRESHOLD,
  normalizeSeedKey,
  readAllWords,
  readGroundingPool,
  readSeedMeta,
  seedFileExists,
  seedPaths,
} from "./seedStorage";

/** Default count for extended grounding prompt (cache-miss path). */
export const EXTENDED_GROUNDING_COUNT = Number(process.env.SEED_GROUNDING_COUNT) || 50;

const EMBEDDED_SEED: Record<string, string[]> = {
  english: ["bread", "river", "school", "doctor", "guitar", "market", "winter", "garden", "letter", "engine"],
  punjabi: ["roti", "paani", "ghar", "kitaab", "doodh", "khet", "sardi", "pind", "chah", "makaan"],
  hindi: ["roti", "paani", "ghar", "kitaab", "doodh", "sadak", "sardi", "school", "chai", "bazaar"],
  urdu: ["roti", "paani", "ghar", "kitaab", "doodh", "sarak", "sardi", "school", "chai", "bazaar"],
  spanish: ["pan", "rio", "escuela", "medico", "guitarra", "mercado", "invierno", "jardin", "carta", "motor"],
  french: ["pain", "riviere", "ecole", "medecin", "guitare", "marche", "hiver", "jardin", "lettre", "moteur"],
};

const smallFileCache = new Map<string, string[]>();

function scatterSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n) {
    const i = Math.floor(Math.random() * arr.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }
  return out;
}

function sampleRandomWindow(words: string[], count: number): string[] {
  if (words.length <= count) return [...words];
  const start = Math.floor(Math.random() * words.length);
  const window: string[] = [];
  for (let i = 0; i < count; i++) {
    window.push(words[(start + i) % words.length]);
  }
  const unique = [...new Set(window)];
  if (unique.length >= count) return unique.slice(0, count);
  const extra = scatterSample(
    words.filter((w) => !unique.includes(w)),
    count - unique.length
  );
  return [...unique, ...extra];
}

/** Words for sampling: grounding pool (large langs) or full list (small langs). */
function getSamplingPool(language: string): string[] {
  const key = normalizeSeedKey(language);
  if (smallFileCache.has(key)) return smallFileCache.get(key)!;

  const grounding = readGroundingPool(language);
  if (grounding.length > 0) {
    smallFileCache.set(key, grounding);
    return grounding;
  }

  const meta = readSeedMeta(language);
  if (meta && meta.wordCount > LARGE_DICT_THRESHOLD) {
    return [];
  }

  const all = readAllWords(language);
  if (all.length > 0 && all.length <= LARGE_DICT_THRESHOLD) {
    smallFileCache.set(key, all);
  }
  return all;
}

function embeddedFallback(language: string, count: number): string[] {
  const key = normalizeSeedKey(language);
  if (EMBEDDED_SEED[key]) return scatterSample(EMBEDDED_SEED[key], count);
  return scatterSample(EMBEDDED_SEED.english, count);
}

export function getSeedSamplingSource(
  language: string
): "grounding.json.gz" | "txt.gz" | null {
  const key = normalizeSeedKey(language);
  const paths = seedPaths(key);
  if (fs.existsSync(paths.grounding)) return "grounding.json.gz";
  if (fs.existsSync(paths.gzip) || fs.existsSync(paths.txt)) return "txt.gz";
  return null;
}

/** Log sample words injected into the AI prompt (word-gen server stderr). */
export function logSeedPromptSamples(
  language: string,
  region: string,
  seeds: string[],
  options: { useExtendedGrounding: boolean; logContext?: string }
): void {
  if (seeds.length === 0) return;
  const langKey = normalizeSeedKey(language);
  const source = getSeedSamplingSource(language) ?? "txt.gz";
  const sourcePath =
    source === "grounding.json.gz"
      ? `public/seed/${langKey}.grounding.json.gz`
      : `public/seed/${langKey}.txt.gz`;
  const mode = options.useExtendedGrounding ? "extended" : "light";
  const ctx = options.logContext ? ` [${options.logContext}]` : "";
  console.error(
    `[seed-prompt]${ctx} ${language} / ${region} (${mode}, from ${sourcePath}, ${seeds.length} words):`
  );
  console.error(`  ${seeds.join(", ")}`);
}

export { normalizeSeedKey };

export function getSeedWords(language: string, count = 10): string[] {
  const pool = getSamplingPool(language);
  if (pool.length > 0) return scatterSample(pool, count);
  return embeddedFallback(language, count);
}

export function getRandomSeedWords(language: string, count = EXTENDED_GROUNDING_COUNT): string[] {
  const pool = getSamplingPool(language);
  if (pool.length > 0) return sampleRandomWindow(pool, count);
  return embeddedFallback(language, Math.min(count, 10));
}

/** Sample from on-disk seed files only (.txt.gz / .grounding.json.gz). No embedded fallback. */
export function getSeedWordsFromFiles(language: string, count = 10): string[] {
  const pool = getSamplingPool(language);
  if (pool.length === 0) return [];
  return scatterSample(pool, count);
}

/** Random window from on-disk seed files only. No embedded fallback. */
export function getRandomSeedWordsFromFiles(
  language: string,
  count = EXTENDED_GROUNDING_COUNT
): string[] {
  const pool = getSamplingPool(language);
  if (pool.length === 0) return [];
  return sampleRandomWindow(pool, count);
}

export function getSeedLineCount(language: string): number {
  const meta = readSeedMeta(language);
  if (meta) return meta.wordCount;
  return getSamplingPool(language).length;
}

export function clearSeedCache(): void {
  smallFileCache.clear();
}

export function hasSeedDictionary(language: string): boolean {
  return seedFileExists(language);
}

/**
 * Dictionary existence check. Skipped for very large lists (would require full RAM scan).
 */
export function isInSeedDictionary(language: string, word: string): boolean {
  const meta = readSeedMeta(language);
  if (meta && meta.wordCount > LARGE_DICT_THRESHOLD) return true;

  const dict = getSamplingPool(language);
  if (dict.length === 0) return true;
  const w = word.trim().normalize("NFC").toLowerCase();
  return dict.some((d) => d.normalize("NFC").toLowerCase() === w);
}
