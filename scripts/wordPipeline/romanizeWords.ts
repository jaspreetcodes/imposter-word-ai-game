/**
 * Post-generation romanization pass for non-Latin script words.
 * Generation prompts ask for Latin output, but models (esp. phi3.5) often emit
 * native script for categories like Movies & TV. This pass transliterates them.
 */
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { WordDocumentLike } from "./ollamaWordGenerator";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "phi3.5";
const WORDGEN_ROMANIZE = process.env.WORDGEN_ROMANIZE !== "0";
const ROMANIZE_BATCH_SIZE = Number(process.env.WORDGEN_ROMANIZE_BATCH_SIZE) || 40;

/** Unicode blocks for scripts that must be romanized for this game. */
const NON_LATIN_SCRIPT =
  /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\u31F0-\u31FF\uAC00-\uD7AF\u0E00-\u0E7F\u1100-\u11FF\u1780-\u17FF]/;

export function containsNonLatinScript(text: string): boolean {
  return NON_LATIN_SCRIPT.test(text);
}

export function wordsNeedingRomanization(words: WordDocumentLike[]): WordDocumentLike[] {
  return words.filter((w) => containsNonLatinScript(w.word));
}

const ROMANIZE_SYSTEM = `You transliterate vocabulary for a multilingual party word game. Output valid JSON only — one array, no markdown, no commentary.

Task: convert each input "word" to Latin/Roman letters while keeping the same language (transliterate, never translate to English).

Rules:
- Output exactly one object per input item, same order, same "category" value unchanged.
- Each "word" must be a single token (no spaces, no hyphens unless part of a common romanized form).
- Use familiar romanization for the given language and region (e.g. Tamil in Sri Lanka: "kozhi" not Tamil script; Hindi: "roti" not Devanagari).
- If a word is already in Latin letters, copy it unchanged.
- Preserve accents for Latin-script languages (café, naïve).
- Party-game friendly: common spellings locals would recognize in subtitles, signage, or conversation.

Each output object must have exactly: "word", "category".`;

function buildRomanizeUserPrompt(
  language: string,
  region: string,
  items: WordDocumentLike[]
): string {
  const payload = items.map((w) => ({ word: w.word, category: w.category }));
  return `Language: ${language}
Region: ${region}

Transliterate every "word" below to Latin/Roman letters per the system rules. Keep category unchanged.

Input (${items.length} items):
${JSON.stringify(payload)}

Output a JSON array of exactly ${items.length} objects with keys "word" and "category" only.`;
}

function parseRomanizeArray(text: string): { word: string; category: string }[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  let jsonStr = normalized;
  const codeBlockMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    const start = normalized.indexOf("[");
    const end = normalized.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      jsonStr = normalized.slice(start, end + 1);
    }
  }
  try {
    const arr = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object"
      )
      .map((item) => ({
        word: String(item.word ?? "").trim(),
        category: String(item.category ?? "").trim(),
      }))
      .filter((item) => item.word.length > 0);
  } catch {
    return [];
  }
}

async function invokeRomanizeModel(user: string): Promise<string> {
  const llm = new ChatOllama({
    baseUrl: OLLAMA_BASE_URL,
    model: MODEL,
    temperature: 0.1,
    numPredict: 2048,
    numCtx: 6144,
  });
  const response = await llm.invoke([
    new SystemMessage(ROMANIZE_SYSTEM),
    new HumanMessage(user),
  ]);
  return typeof response.content === "string"
    ? response.content
    : String(response.content ?? "");
}

async function romanizeBatch(
  language: string,
  region: string,
  items: WordDocumentLike[]
): Promise<Map<string, string>> {
  const userPrompt = buildRomanizeUserPrompt(language, region, items);
  const raw = await invokeRomanizeModel(userPrompt);
  const parsed = parseRomanizeArray(raw);
  const out = new Map<string, string>();

  for (let i = 0; i < items.length; i++) {
    const src = items[i];
    const key = `${src.category}::${src.word}`;
    const candidate = parsed[i]?.word ?? parsed.find((p) => p.category === src.category)?.word;
    if (candidate && !containsNonLatinScript(candidate)) {
      out.set(key, candidate);
    } else if (candidate && candidate !== src.word) {
      // Model returned something; prefer it over native script even if still imperfect
      out.set(key, candidate);
    }
  }

  return out;
}

/**
 * Final pass: romanize any words still in native script (Tamil, Devanagari, etc.).
 * Skipped when WORDGEN_ROMANIZE=0 or when no words need it.
 */
export async function romanizeWordDocuments(
  words: WordDocumentLike[],
  language: string,
  region: string
): Promise<WordDocumentLike[]> {
  if (!WORDGEN_ROMANIZE || words.length === 0) return words;

  const needsWork = wordsNeedingRomanization(words);
  if (needsWork.length === 0) return words;

  console.error(
    `[romanize] ${needsWork.length}/${words.length} words in native script — running transliteration pass (${language}, ${region})`
  );

  const replacements = new Map<string, string>();

  for (let i = 0; i < needsWork.length; i += ROMANIZE_BATCH_SIZE) {
    const batch = needsWork.slice(i, i + ROMANIZE_BATCH_SIZE);
    try {
      const batchMap = await romanizeBatch(language, region, batch);
      for (const [k, v] of batchMap) replacements.set(k, v);
    } catch (err) {
      console.error("[romanize] batch failed:", err instanceof Error ? err.message : err);
    }
  }

  if (replacements.size === 0) {
    console.error("[romanize] no replacements applied — keeping originals");
    return words;
  }

  const result = words.map((w) => {
    const key = `${w.category}::${w.word}`;
    const romanized = replacements.get(key);
    if (!romanized || romanized === w.word) return w;
    console.error(`  ${w.word} → ${romanized} (${w.category})`);
    return { ...w, word: romanized };
  });

  const remaining = wordsNeedingRomanization(result).length;
  if (remaining > 0) {
    console.error(`[romanize] warning: ${remaining} words still contain non-Latin script`);
  }

  return result;
}
