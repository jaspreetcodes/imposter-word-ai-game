/**
 * On-disk seed dictionary layout (gitignored under public/seed/):
 *
 *   <lang>.txt.gz          — full word list, one word per line (gzip)
 *   <lang>.meta.json       — { wordCount, format, compressedBytes, language }
 *   <lang>.grounding.json.gz — ~8k random words for fast AI prompt sampling (large langs)
 *
 * Legacy plain <lang>.txt is still read if present.
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

export const SEED_DIR = path.join(process.cwd(), "public", "seed");

/** Words above this get a separate grounding pool; full dict is not loaded into RAM. */
export const LARGE_DICT_THRESHOLD = Number(process.env.SEED_LARGE_DICT_THRESHOLD) || 50_000;

/** Random words kept in grounding pool for prompt injection. */
export const GROUNDING_POOL_SIZE = Number(process.env.SEED_GROUNDING_POOL_SIZE) || 8_000;

export const SEED_FORMAT = "gzip-lines-v1" as const;

export interface SeedMeta {
  language: string;
  wordCount: number;
  format: typeof SEED_FORMAT;
  compressedBytes: number;
  groundingPoolSize?: number;
}

export function normalizeSeedKey(language: string): string {
  return language.trim().toLowerCase();
}

export function isValidSeedWord(w: string): boolean {
  return w.length > 1 && w.length < 80 && !/^\d+$/.test(w);
}

export function parseWordListText(text: string): string[] {
  return text
    .split(/[\r\n,]+/)
    .map((w) => w.trim())
    .filter(isValidSeedWord);
}

export function seedPaths(key: string): {
  txt: string;
  gzip: string;
  meta: string;
  grounding: string;
} {
  const base = path.join(SEED_DIR, key);
  return {
    txt: `${base}.txt`,
    gzip: `${base}.txt.gz`,
    meta: `${base}.meta.json`,
    grounding: `${base}.grounding.json.gz`,
  };
}

export function seedFileExists(language: string): boolean {
  const key = normalizeSeedKey(language);
  const p = seedPaths(key);
  return (
    fs.existsSync(p.gzip) ||
    fs.existsSync(p.txt) ||
    fs.existsSync(p.grounding)
  );
}

export function readSeedMeta(language: string): SeedMeta | null {
  const key = normalizeSeedKey(language);
  const metaPath = seedPaths(key).meta;
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as SeedMeta;
  } catch {
    return null;
  }
}

export function writeSeedMeta(language: string, meta: SeedMeta): void {
  const key = normalizeSeedKey(language);
  if (!fs.existsSync(SEED_DIR)) fs.mkdirSync(SEED_DIR, { recursive: true });
  fs.writeFileSync(seedPaths(key).meta, JSON.stringify(meta, null, 2));
}

/** Gzip a newline-separated word list. */
export function writeWordsGzip(filePath: string, words: string[]): void {
  const body = words.join("\n") + (words.length ? "\n" : "");
  const compressed = zlib.gzipSync(Buffer.from(body, "utf-8"), { level: 9 });
  fs.writeFileSync(filePath, compressed);
}

/** Gzip a JSON string array (grounding pool). */
export function writeJsonGzip(filePath: string, words: string[]): void {
  const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(words), "utf-8"), {
    level: 9,
  });
  fs.writeFileSync(filePath, compressed);
}

export function readJsonGzip<T>(filePath: string): T {
  const raw = zlib.gunzipSync(fs.readFileSync(filePath));
  return JSON.parse(raw.toString("utf-8")) as T;
}

/** Read full word list from .txt.gz or legacy .txt (loads into memory). */
export function readAllWords(language: string): string[] {
  const key = normalizeSeedKey(language);
  const p = seedPaths(key);
  if (fs.existsSync(p.txt)) {
    return parseWordListText(fs.readFileSync(p.txt, "utf-8"));
  }
  if (fs.existsSync(p.gzip)) {
    const raw = zlib.gunzipSync(fs.readFileSync(p.gzip));
    return parseWordListText(raw.toString("utf-8"));
  }
  return [];
}

/** Reservoir-sample `count` words by streaming a gzip file (no full RAM load). */
export async function reservoirSampleFromGzip(
  gzipPath: string,
  count: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reservoir: string[] = [];
    let seen = 0;
    let buf = "";

    fs.createReadStream(gzipPath)
      .pipe(zlib.createGunzip())
      .on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf-8");
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const word = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!isValidSeedWord(word)) continue;
          seen++;
          if (reservoir.length < count) reservoir.push(word);
          else {
            const j = Math.floor(Math.random() * seen);
            if (j < count) reservoir[j] = word;
          }
        }
      })
      .on("end", () => {
        const tail = buf.trim();
        if (isValidSeedWord(tail)) {
          seen++;
          if (reservoir.length < count) reservoir.push(tail);
          else {
            const j = Math.floor(Math.random() * seen);
            if (j < count) reservoir[j] = tail;
          }
        }
        resolve(reservoir);
      })
      .on("error", reject);
  });
}

/** Sync read of grounding pool (small gzip JSON). */
export function readGroundingPool(language: string): string[] {
  const key = normalizeSeedKey(language);
  const groundingPath = seedPaths(key).grounding;
  if (!fs.existsSync(groundingPath)) return [];
  try {
    return readJsonGzip<string[]>(groundingPath);
  } catch {
    return [];
  }
}

/** Pick `poolSize` random words from an array (Fisher-Yates partial shuffle). */
export function pickRandomSubset(words: string[], poolSize: number): string[] {
  if (words.length <= poolSize) return [...words];
  const copy = [...words];
  const n = poolSize;
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Build grounding pool + meta after download. */
export function persistSeedBundle(
  language: string,
  words: string[]
): { meta: SeedMeta; paths: ReturnType<typeof seedPaths> } {
  const key = normalizeSeedKey(language);
  const paths = seedPaths(key);
  if (!fs.existsSync(SEED_DIR)) fs.mkdirSync(SEED_DIR, { recursive: true });

  writeWordsGzip(paths.gzip, words);

  let groundingPoolSize: number | undefined;
  if (words.length > LARGE_DICT_THRESHOLD) {
    const pool = pickRandomSubset(words, GROUNDING_POOL_SIZE);
    writeJsonGzip(paths.grounding, pool);
    groundingPoolSize = pool.length;
  }

  const meta: SeedMeta = {
    language: key,
    wordCount: words.length,
    format: SEED_FORMAT,
    compressedBytes: fs.statSync(paths.gzip).size,
    ...(groundingPoolSize != null ? { groundingPoolSize } : {}),
  };
  writeSeedMeta(language, meta);

  return { meta, paths };
}

/** Migrate legacy plain .txt → .txt.gz (+ optional grounding pool). */
export function migratePlainTxtToGzip(language: string): SeedMeta | null {
  const key = normalizeSeedKey(language);
  const paths = seedPaths(key);
  if (!fs.existsSync(paths.txt) || fs.existsSync(paths.gzip)) return readSeedMeta(language);

  const words = parseWordListText(fs.readFileSync(paths.txt, "utf-8"));
  const { meta } = persistSeedBundle(language, words);
  fs.unlinkSync(paths.txt);
  return meta;
}
