/**
 * Client for the local word-generation API.
 *
 * BASE_URL is the **word-gen API server** (our Express server at port 3001), NOT Ollama.
 * Flow: Browser → this fetch → word-gen server (localhost:3001) → server calls Ollama (localhost:11434) → server returns words.
 * The browser never talks to Ollama; only the Node server does (LangChain + ChatOllama).
 *
 * To fix ERR_CONNECTION_REFUSED: run the word-gen server in a separate terminal:
 *   npm run word-gen-server
 * (Ollama must also be running: ollama run mistral-small3.2)
 *
 * Set VITE_WORDGEN_API_URL in .env to override (default http://localhost:3001).
 */

import type { WordDocumentLike } from "./wordsService";

/** Word-gen API server URL (our Express server). Not Ollama's URL (11434). */
const BASE_URL =
  import.meta.env.VITE_WORDGEN_API_URL ?? "http://localhost:3001";

export interface GenerateWordsParams {
  language: string;
  region: string;
  countPerCategory?: number;
}

export interface GenerateWordsResult {
  words: WordDocumentLike[];
}

/**
 * Call the word-gen API to generate words for all categories for the given language and region.
 * Requires the word-gen server to be running (npm run word-gen-server) and Ollama with mistral-small3.2.
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
  params: Pick<GenerateWordsParams, "language" | "region">
): Promise<GenerateWordsResult> {
  const res = await fetch(`${BASE_URL}/api/generate-words-mini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: params.language.trim(),
      region: params.region.trim(),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? data?.error ?? res.statusText ?? "Mini generation failed");
  }
  return (await res.json()) as GenerateWordsResult;
}
