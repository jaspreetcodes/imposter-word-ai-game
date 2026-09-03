/**
 * Download language word lists from eymenefealtun/all-words-in-all-languages
 * into compressed public/seed/<language>.txt.gz (+ .meta.json, optional .grounding.json.gz).
 *
 * Usage (from project root):
 *   npm run seed:download -- punjabi hindi
 *   npm run seed:download -- --all
 *   npm run seed:download -- --list
 *   npm run seed:download -- --migrate   # compress existing .txt → .gz and remove .txt
 */

import * as fs from "fs";
import * as path from "path";
import {
  SEED_DIR,
  migratePlainTxtToGzip,
  parseWordListText,
  persistSeedBundle,
  seedPaths,
} from "./seedStorage";

const REPO = "eymenefealtun/all-words-in-all-languages";
const BRANCH = "main";

const LANGUAGE_ALIASES: Record<string, string> = {
  english: "English",
  punjabi: "Punjabi",
  hindi: "Hindi",
  urdu: "Urdu",
  tamil: "Tamil",
  spanish: "Spanish",
  french: "French",
  arabic: "Arabic",
  bengali: "Bengali",
  gujarati: "Gujarati",
  marathi: "Marathi",
  telugu: "Telugu",
  kannada: "Kannada",
  malayalam: "Malayalam",
  chinese: "Chinese",
  japanese: "Japanese",
  korean: "Korean",
  persian: "Persian",
  turkish: "Turkish",
  vietnamese: "Vietnamese",
  swahili: "Swahili",
  filipino: "Filipino",
  "haitian creole": "Haitian Creole",
  "scots gaelic": "Scots Gaelic",
  ukrainian: "Ukranian",
  ukranian: "Ukranian",
};

function normalizeKey(language: string): string {
  return language.trim().toLowerCase();
}

function repoFolderName(language: string): string {
  const key = normalizeKey(language);
  if (LANGUAGE_ALIASES[key]) return LANGUAGE_ALIASES[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function rawUrl(repoFolder: string): string {
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${encodeURIComponent(repoFolder)}/${encodeURIComponent(repoFolder)}.txt`;
}

async function listRepoLanguages(): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents?ref=${BRANCH}`
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const items = (await res.json()) as Array<{ name: string; type: string }>;
  return items
    .filter((i) => i.type === "dir" && i.name !== "how_to_use")
    .map((i) => i.name)
    .sort();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadLanguage(
  language: string,
  repoFolderOverride?: string
): Promise<{ ok: boolean; lines: number; gzipBytes: number; error?: string }> {
  const repoFolder = repoFolderOverride ?? repoFolderName(language);
  const url = rawUrl(repoFolder);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, lines: 0, gzipBytes: 0, error: `HTTP ${res.status} for ${url}` };
    }
    const text = await res.text();
    const words = parseWordListText(text);
    const { meta } = persistSeedBundle(language, words);

    const key = normalizeKey(language);
    const txtPath = seedPaths(key).txt;
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);

    return { ok: true, lines: words.length, gzipBytes: meta.compressedBytes };
  } catch (e) {
    return {
      ok: false,
      lines: 0,
      gzipBytes: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function migrateAllPlainTxt(): void {
  if (!fs.existsSync(SEED_DIR)) {
    console.log("No seed directory yet.");
    return;
  }
  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) {
    console.log("No plain .txt files to migrate.");
    return;
  }
  for (const file of files) {
    const lang = file.replace(/\.txt$/, "");
    const meta = migratePlainTxtToGzip(lang);
    if (meta) {
      console.log(
        `  ${lang}: ${meta.wordCount} words → ${formatBytes(meta.compressedBytes)} .txt.gz`
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    const langs = await listRepoLanguages();
    console.log(`Available upstream languages (${langs.length}):`);
    for (const l of langs) console.log(`  ${l}`);
    return;
  }

  if (args.includes("--migrate")) {
    console.log("Migrating plain .txt seed files to .txt.gz…");
    migrateAllPlainTxt();
    return;
  }

  let languages: string[];
  let repoFolders: string[] | undefined;
  if (args.includes("--all")) {
    repoFolders = await listRepoLanguages();
    languages = repoFolders.map((l) => l.toLowerCase());
    console.log(`Downloading ${languages.length} languages (gzip)…`);
  } else if (args.length === 0) {
    languages = ["punjabi", "hindi", "urdu"];
    console.log("No languages specified; defaulting to punjabi, hindi, urdu");
  } else {
    languages = args.filter((a) => !a.startsWith("--"));
  }

  let ok = 0;
  let fail = 0;
  let totalBytes = 0;

  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];
    const folder = repoFolders?.[i];
    process.stdout.write(`  ${lang}… `);
    const result = await downloadLanguage(lang, folder);
    if (result.ok) {
      console.log(
        `✓ ${result.lines} words, ${formatBytes(result.gzipBytes)} → public/seed/${normalizeKey(lang)}.txt.gz`
      );
      totalBytes += result.gzipBytes;
      ok++;
    } else {
      console.log(`✗ ${result.error}`);
      fail++;
    }
  }

  console.log(
    `Done: ${ok} ok, ${fail} failed, total compressed ${formatBytes(totalBytes)} in public/seed/`
  );
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
