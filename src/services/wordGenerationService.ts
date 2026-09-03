/**
 * Client for the local word-generation API.
 *
 * BASE_URL is the **word-gen API server** (our Express server at port 3001), NOT Ollama.
 * Flow: Browser → this fetch → word-gen server (localhost:3001) → server calls Ollama (localhost:11434) → server returns words.
 * The browser never talks to Ollama; only the Node server does (LangChain + ChatOllama).
 *
 * To fix ERR_CONNECTION_REFUSED: run the word-gen server in a separate terminal:
 *   npm run word-gen-server
 * Ollama must be running with phi3.5 (default): e.g. ollama pull phi3.5 and Ollama app or ollama serve.
 *
 * Set VITE_WORDGEN_API_URL in .env to override (default http://localhost:3001).
 */

import type { WordDocumentLike } from "./wordsService";

/** Word-gen API server URL (our Express server). Not Ollama's URL (11434). */
const BASE_URL =
  import.meta.env.VITE_WORDGEN_API_URL ?? "http://localhost:3001";

/** Optional culture pack / feedback for the generate → judge → refine pipeline (word-gen server). */
export interface WordgenCulturePackParams {
  acceptedWords?: string[];
  rejectedWords?: { word: string; reason: string }[];
  cultureNotes?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface GenerateWordsParams {
  language: string;
  region: string;
  countPerCategory?: number;
  culture?: WordgenCulturePackParams;
}

export interface GenerateWordsResult {
  words: WordDocumentLike[];
  coverage?: LocaleCoverageResult;
  useExtendedGrounding?: boolean;
}

export interface LocaleCoverageResult {
  language: string;
  region: string;
  totalWords: number;
  categoryCounts: Record<string, number>;
  missingCategories: string[];
  cacheMiss: boolean;
  minPerCategory: number;
  hasSeedDictionary?: boolean;
}

/** Check Firestore word coverage for a locale (cache miss = needs more words). */
export async function fetchWordCoverage(
  language: string,
  region: string,
  minPerCategory?: number
): Promise<LocaleCoverageResult> {
  const res = await fetch(`${BASE_URL}/api/word-coverage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: language.trim(),
      region: region.trim(),
      minPerCategory,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? res.statusText ?? "Coverage check failed");
  }
  return (await res.json()) as LocaleCoverageResult;
}

/**
 * Call the word-gen API to generate words for all categories for the given language and region.
 * Requires the word-gen server (npm run word-gen-server) and Ollama with the configured model (default phi3.5).
 */
export async function generateWordsFromApi(
  params: GenerateWordsParams
): Promise<GenerateWordsResult> {
  const res = await fetch(`${BASE_URL}/api/generate-words`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: params.language.trim(),
      region: params.region.trim(),
      countPerCategory: params.countPerCategory,
      ...(params.culture ? params.culture : {}),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      data?.message ?? data?.error ?? res.statusText ?? "Generation failed";
    throw new Error(message);
  }

  const data = (await res.json()) as GenerateWordsResult;
  return data;
}

/** Mini: 1 word for the given language/region. Use to unblock UI and let user start game while full generation runs in background. */
export async function generateWordsMiniFromApi(
  params: Pick<GenerateWordsParams, "language" | "region"> & {
    culture?: WordgenCulturePackParams;
  }
): Promise<GenerateWordsResult> {
  const res = await fetch(`${BASE_URL}/api/generate-words-mini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: params.language.trim(),
      region: params.region.trim(),
      ...(params.culture ? params.culture : {}),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? data?.error ?? res.statusText ?? "Mini generation failed");
  }
  return (await res.json()) as GenerateWordsResult;
}

export interface GenerateNicheWordsParams {
  category: string;
  region?: string;
  count?: number;
  culture?: WordgenCulturePackParams;
}

export interface GenerateNicheWordsResult {
  words: WordDocumentLike[];
  category: string;
  language: string;
  region: string;
}

/** English-only niche category generation. */
export async function generateNicheWordsFromApi(
  params: GenerateNicheWordsParams
): Promise<GenerateNicheWordsResult> {
  const res = await fetch(`${BASE_URL}/api/generate-niche-words`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: params.category.trim(),
      region: (params.region ?? "UK").trim(),
      count: params.count,
      ...(params.culture ? params.culture : {}),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data?.message ?? data?.error ?? res.statusText ?? "Niche generation failed"
    );
  }
  return (await res.json()) as GenerateNicheWordsResult;
}
