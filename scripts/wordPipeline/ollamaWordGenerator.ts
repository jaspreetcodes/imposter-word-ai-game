/**
 * Generate words for all listed categories (Food, Movies & TV, etc.) for a given language and region
 * using Ollama via LangChain. Default model: Phi-3.5 Mini (phi3.5) for faster runs; override with OLLAMA_MODEL.
 * Produces 20 words per category by default (faster with Phi); override with countPerCategory.
 * Requires Ollama running: ollama run phi3.5  (or ollama run mistral-small3.2 if OLLAMA_MODEL set)
 * Usage: npx tsx scripts/wordPipeline/ollamaWordGenerator.ts [language] [region] [countPerCategory]
 */

import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  categoriesForLocale,
  normalizeNicheCategoryName,
} from "../../src/constants/categories";
import {
  getRandomSeedWordsFromFiles,
  getSeedWordsFromFiles,
  hasSeedDictionary,
  isInSeedDictionary,
  logSeedPromptSamples,
  normalizeSeedKey,
  EXTENDED_GROUNDING_COUNT,
} from "./seedWords";
import { romanizeWordDocuments } from "./romanizeWords";
import { validateGeneratedWords } from "./validateGeneratedWords";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
/** Default: Phi-3.5 Mini for speed (~3.8B). Set OLLAMA_MODEL=mistral-small3.2 for larger model. */
const MODEL = process.env.OLLAMA_MODEL ?? "phi3.5";
const DEFAULT_COUNT_PER_CATEGORY = Number(process.env.WORDGEN_COUNT_PER_CATEGORY) || 20;
/** Set WORDGEN_USE_PIPELINE=0 to skip judge/refine (faster, lower quality). */
const WORDGEN_USE_PIPELINE = process.env.WORDGEN_USE_PIPELINE !== "0";
/** Words per category at or above this use generate→judge→refine (3 LLM calls). Below = single call. */
const PIPELINE_MIN_COUNT = Number(process.env.WORDGEN_PIPELINE_MIN_COUNT) || 20;

/** Categories to generate for a language (culture-rich only when non-English). */
function categoriesForGeneration(
  language: string,
  categoriesToFill?: string[]
): string[] {
  const allowed = categoriesForLocale(language);
  if (categoriesToFill && categoriesToFill.length > 0) {
    const allowSet = new Set(allowed.map((c) => c.toLowerCase()));
    return categoriesToFill.filter((c) => allowSet.has(c.trim().toLowerCase()));
  }
  return [...allowed];
}

/** Optional culture / feedback loop inputs (API can pass these between rounds). */
export interface WordgenCulturePack {
  acceptedWords?: string[];
  rejectedWords?: { word: string; reason: string }[];
  cultureNotes?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface GenerateWordsInput {
  category: string;
  language: string;
  region: string;
  count?: number;
  culture?: WordgenCulturePack;
  /** When true (Firestore cache miss), inject 40–50 random seed words as extended grounding. */
  useExtendedGrounding?: boolean;
}

/** Input for generating words for all categories (language + region; N per category, default 20). */
export interface GenerateWordsForAllCategoriesInput {
  language: string;
  region: string;
  countPerCategory?: number;
  culture?: WordgenCulturePack;
  useExtendedGrounding?: boolean;
  /** When set, only generate for these categories (coverage-driven partial fill). */
  categoriesToFill?: string[];
}

export interface GeneratedWordItem {
  word: string;
  category: string;
  language: string;
  region: string;
}

/** Word document shape for Firestore (languages/regions arrays). */
export interface WordDocumentLike {
  word: string;
  category: string;
  languages?: string[];
  regions?: string[];
  difficulty?: "easy" | "medium" | "hard";
}

/** Smaller ctx / predict for light requests reduces memory pressure (helps avoid Ollama runner crashes on some Macs). */
function createWordgenLlm(numPredict: number, numCtx?: number): ChatOllama {
  return new ChatOllama({
    baseUrl: OLLAMA_BASE_URL,
    model: MODEL,
    temperature: 0.4,
    numPredict,
    ...(numCtx != null ? { numCtx } : {}),
  });
}

const SYSTEM_PROMPT = `You are a word list generator for a multilingual party word game. Output valid JSON only (one array or object as instructed). No markdown fences, no commentary.

Quality bar:
- Each "word" is vocabulary FOR the requested language, grounded in how that language is used in the requested region (everyday life, school-level familiarity, current culture — not only dictionary rarities).
- Prefer region-native or strongly associated terms over bland international defaults when the category allows.
- For non-English languages: prefer culture-specific terms (local films, dishes, places, artists). Avoid transparent English glosses of universal concepts (e.g. do NOT emit "bread", "red", "doctor", "oak" as Hindi/Punjabi/French words when a native or region-true form exists).
- Single token only (no spaces). All ages appropriate. No slurs or sexual/violent terms.

Script (Latin output for the "word" field):
- Prompts are in English; "word" values must still be in the target language, written in Latin/Roman letters for this game.
- Non-Latin languages (Hindi, Punjabi, Urdu, etc.): use familiar romanization as used in that region (e.g. roti, ghar, vikram — NEVER Tamil/Devanagari/Arabic script in the word field).
- Latin-script languages (French, Spanish, English): normal orthography including accents (e.g. confiture, café).

Each array item object must have exactly: "word", "category", "language", "region" matching the user request.`;

const JUDGE_SYSTEM = `You are a strict editor for a party-game word list. Output ONE JSON object only. No markdown, no extra text.
Shape: {"accepted":["word1",...],"rejected":[{"word":"w","reason":"short reason"},...]}
- "accepted" lists word strings that are strong: correct category, fair difficulty, region-plausible, Latin script per rules, single token, inoffensive, and native to the requested language (not a transparent English translation).
- "rejected" lists weak entries with a brief reason. Reject: too obscure; wrong category; generic English loanword when a native form exists (e.g. "bread"/"red"/"doctor" for Hindi or Punjabi); non-Latin script; multi-word; bland international default with no regional flavor.
- When language is not English, reject words that are identical to common English vocabulary unless they are truly used as-is in that language/region with no better native alternative (rare).
Every candidate word must appear in exactly one of accepted or rejected.`;

const REFINE_SYSTEM = `You replace weak words in a party word list. Output ONE JSON array only. No markdown.
Each element: {"word","category","language","region"} with the exact category, language, region from the user message.
Words must be new (not in the accepted list), single token, Latin script per language rules, culture-native (not English glosses), and fix the rejection reasons given.`;

function buildSeedVocabularyParagraph(
  language: string,
  region: string,
  seeds: string[]
): string {
  const langKey = normalizeSeedKey(language);
  return `These are some random words from the ${language} vocabulary list (public/seed/${langKey}.txt.gz).
Use them only to understand and identify the correct language, dialect, and word-shape for ${region}.
Do NOT copy them verbatim unless they truly fit the requested category.

${seeds.join(", ")}`;
}

function buildCultureBlock(
  language: string,
  region: string,
  culture?: WordgenCulturePack,
  useExtendedGrounding = false,
  skipSeedGrounding = false,
  logContext?: string
): string {
  const base = `Regional focus: terms should feel natural for ${language} as used in ${region} — what locals would recognize in conversation, media, and school; prefer region-relevant flavor over generic "world English" defaults when the category allows.`;
  const parts: string[] = [base];

  // Ground the model in REAL vocabulary from on-disk seed files only (no embedded fallback).
  if (!skipSeedGrounding) {
    const sampleCount = useExtendedGrounding ? EXTENDED_GROUNDING_COUNT : 10;
    const seeds = useExtendedGrounding
      ? getRandomSeedWordsFromFiles(language, sampleCount)
      : getSeedWordsFromFiles(language, sampleCount);
    if (seeds.length > 0) {
      logSeedPromptSamples(language, region, seeds, {
        useExtendedGrounding,
        logContext,
      });
      parts.push(buildSeedVocabularyParagraph(language, region, seeds));
    }
  } else if (logContext) {
    console.error(
      `[seed-prompt] [${logContext}] ${language} / ${region}: no vocabulary samples (skipped)`
    );
  }

  if (
    !culture ||
    (!culture.cultureNotes &&
      !culture.difficulty &&
      !(culture.acceptedWords?.length) &&
      !(culture.rejectedWords?.length))
  ) {
    return parts.join("\n");
  }
  if (culture.difficulty) {
    parts.push(
      `Difficulty: ${culture.difficulty} — easy = very common; medium = broader but fair; hard = trickier but still fair for fluent players in that region.`
    );
  }
  if (culture.cultureNotes) {
    parts.push(`Culture / trend pack (follow closely): ${culture.cultureNotes}`);
  }
  if (culture.acceptedWords?.length) {
    parts.push(
      `Examples of accepted vibe (match style): ${culture.acceptedWords.join(", ")}`
    );
  }
  if (culture.rejectedWords?.length) {
    parts.push(
      `Prior rejections — avoid similar mistakes: ${culture.rejectedWords.map((r) => `${r.word}: ${r.reason}`).join("; ")}`
    );
  }
  return parts.join("\n");
}

function buildUserPrompt(input: GenerateWordsInput): string {
  const count = input.count ?? DEFAULT_COUNT_PER_CATEGORY;
  const cultureText = buildCultureBlock(
    input.language,
    input.region,
    input.culture,
    input.useExtendedGrounding,
    false,
    input.category
  );
  return `Generate exactly ${count} single-word items for the category "${input.category}" only.

- Category: ${input.category} (all ${count} words must belong to this category only)
- Language: ${input.language}
- Region: ${input.region}

${cultureText}

Output a JSON array of objects. Each object: "word", "category", "language", "region".
Use category="${input.category}", language="${input.language}", region="${input.region}" for every item.

Example format (only the array, no other text):
[{"word":"apple","category":"${input.category}","language":"${input.language}","region":"${input.region}"},{"word":"bread","category":"${input.category}","language":"${input.language}","region":"${input.region}"}]`;
}

/** One prompt: 1 word per category. Used for fast "mini" response so user can redirect. */
function buildOneWordPerCategoryPrompt(
  language: string,
  region: string,
  categories: readonly string[],
  culture?: WordgenCulturePack,
  useExtendedGrounding = false,
  skipSeedGrounding = false,
  logContext?: string
): string {
  const categoriesList = categories.join(", ");
  const cultureText = buildCultureBlock(
    language,
    region,
    culture,
    useExtendedGrounding,
    skipSeedGrounding,
    logContext ?? "mini"
  );
  return `Generate exactly one single word for each of these categories. Language: ${language}. Region: ${region}.

${cultureText}

Categories (one word per category, in this order): ${categoriesList}

Output a JSON array of exactly ${categories.length} objects. Each object: "word", "category", "language", "region".
Use language="${language}" and region="${region}" for every item. Category must be one of: ${categoriesList}.
Use Latin/Roman letters for each "word" per the script rules in the system message.
For non-English languages prefer culture-native terms (local food, films, places) — not English translations.

Example format (only the array, no other text):
[{"word":"roti","category":"Food","language":"${language}","region":"${region}"},...]`;
}

/**
 * Extract a JSON array from model output (handles markdown code blocks and extra text).
 */
export function parseJsonArray(text: string): GeneratedWordItem[] {
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
        language: String(item.language ?? "").trim(),
        region: String(item.region ?? "").trim(),
      }))
      .filter((item) => item.word.length > 0);
  } catch {
    return [];
  }
}

export function parseJudgeResult(text: string): {
  accepted: string[];
  rejected: { word: string; reason: string }[];
} {
  const normalized = text.replace(/\s+/g, " ").trim();
  let jsonStr = normalized;
  const codeBlockMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      jsonStr = normalized.slice(start, end + 1);
    }
  }
  try {
    const o = JSON.parse(jsonStr) as {
      accepted?: unknown;
      rejected?: unknown;
    };
    const accepted = Array.isArray(o.accepted)
      ? o.accepted.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const rejected = Array.isArray(o.rejected)
      ? o.rejected
          .map((r: unknown) => {
            if (r && typeof r === "object" && "word" in r) {
              const rec = r as Record<string, unknown>;
              return {
                word: String(rec.word ?? "").trim(),
                reason: String(rec.reason ?? "").trim(),
              };
            }
            return { word: "", reason: "" };
          })
          .filter((x) => x.word.length > 0)
      : [];
    return { accepted, rejected };
  } catch {
    return { accepted: [], rejected: [] };
  }
}

async function invokeWordModel(
  system: string,
  user: string,
  numPredict: number,
  numCtx?: number
): Promise<string> {
  const llm = createWordgenLlm(numPredict, numCtx);
  const response = await llm.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);
  return typeof response.content === "string"
    ? response.content
    : String(response.content ?? "");
}

function toWordDocs(items: GeneratedWordItem[]): WordDocumentLike[] {
  return items.map((item) => ({
    word: item.word,
    category: item.category,
    languages: [item.language],
    regions: [item.region],
  }));
}

/** Flag native-script words not in seed dictionary for judge/refine rejection. */
function applyDictionaryValidation(
  docs: WordDocumentLike[],
  language: string
): { accepted: WordDocumentLike[]; rejected: { word: string; reason: string }[] } {
  if (!hasSeedDictionary(language)) {
    return { accepted: docs, rejected: [] };
  }
  const accepted: WordDocumentLike[] = [];
  const rejected: { word: string; reason: string }[] = [];
  for (const d of docs) {
    const needsCheck = /[^\u0000-\u024F\u1E00-\u1EFF]/.test(d.word);
    if (needsCheck && !isInSeedDictionary(language, d.word)) {
      rejected.push({ word: d.word, reason: "not in seed dictionary" });
    } else {
      accepted.push(d);
    }
  }
  return { accepted, rejected };
}

function logValidationIssues(
  words: WordDocumentLike[],
  language: string,
  category?: string
): void {
  const issues = validateGeneratedWords(words, {
    expectedCategory: category,
    expectedLanguage: language,
    checkDictionary: hasSeedDictionary(language),
  });
  if (issues.length > 0) {
    console.error(
      `  QA: ${issues.length} issue(s) —`,
      issues.slice(0, 3).map((i) => `${i.word}:${i.rule}`).join(", ")
    );
  }
}

/** Stage 1 generate → stage 2 judge → stage 3 refine (replacements only). */
async function generateWordsPipeline(
  input: GenerateWordsInput,
  count: number
): Promise<WordDocumentLike[]> {
  let numPredict: number;
  let numCtx: number | undefined;
  if (count <= 10) {
    numPredict = 2560;
    numCtx = 6144;
  } else {
    numPredict = 3072;
    numCtx = undefined;
  }

  const stage1User = buildUserPrompt({ ...input, count });
  const raw1 = await invokeWordModel(SYSTEM_PROMPT, stage1User, numPredict, numCtx);
  const candItems = parseJsonArray(raw1);
  let candidates = toWordDocs(candItems);
  if (candidates.length === 0) return [];

  candidates = candidates.slice(0, count);

  const dictCheck = applyDictionaryValidation(candidates, input.language);
  if (dictCheck.rejected.length > 0) {
    candidates = dictCheck.accepted;
    console.error(
      `  Dictionary rejected ${dictCheck.rejected.length} candidate(s) not in seed file`
    );
  }

  const judgeUser = `${buildCultureBlock(input.language, input.region, input.culture, input.useExtendedGrounding, false, `${input.category} judge`)}

Category: ${input.category}
Language: ${input.language}
Region: ${input.region}

Candidates (JSON array of {word,category,language,region}):
${JSON.stringify(candItems)}

Return {"accepted":["..."],"rejected":[{"word":"...","reason":"..."}]}. Every candidate word must appear exactly once in either accepted or rejected.`;

  const raw2 = await invokeWordModel(JUDGE_SYSTEM, judgeUser, 2048, 6144);
  const judge = parseJudgeResult(raw2);

  const byLower = new Map(candidates.map((c) => [c.word.toLowerCase(), c]));
  const acceptedDocs: WordDocumentLike[] = judge.accepted
    .map((w) => byLower.get(w.toLowerCase()))
    .filter((x): x is WordDocumentLike => x != null);

  if (acceptedDocs.length === 0 && judge.rejected.length === 0) {
    return candidates.slice(0, count);
  }

  const rejected = judge.rejected;
  if (rejected.length === 0) {
    return acceptedDocs.slice(0, count);
  }

  const acceptedLower = new Set(
    acceptedDocs.map((d) => d.word.toLowerCase())
  );

  const refineUser = `${buildCultureBlock(input.language, input.region, input.culture, input.useExtendedGrounding, false, `${input.category} refine`)}

Category: ${input.category}
Language: ${input.language}
Region: ${input.region}

Accepted words from round 1 (do not repeat): ${JSON.stringify(judge.accepted)}

Rejected with reasons — produce one replacement per rejection:
${JSON.stringify(rejected)}

Output a JSON array of exactly ${rejected.length} objects with keys word, category, language, region.
Use category="${input.category}", language="${input.language}", region="${input.region}" for every item. Each word must be new and address the rejection reason.`;

  const raw3 = await invokeWordModel(REFINE_SYSTEM, refineUser, 2048, 6144);
  const replacementItems = parseJsonArray(raw3);
  const replacements = toWordDocs(replacementItems);

  const merged: WordDocumentLike[] = [...acceptedDocs];
  const seen = new Set(merged.map((m) => m.word.toLowerCase()));

  for (const rep of replacements) {
    if (!rep.word) continue;
    const low = rep.word.toLowerCase();
    if (seen.has(low) || acceptedLower.has(low)) continue;
    merged.push(rep);
    seen.add(low);
    if (merged.length >= count) break;
  }

  for (const c of candidates) {
    if (merged.length >= count) break;
    const low = c.word.toLowerCase();
    if (!seen.has(low)) {
      merged.push(c);
      seen.add(low);
    }
  }

  const result = merged.slice(0, count);
  logValidationIssues(result, input.language, input.category);
  return result;
}

async function generateWordsSingleShot(
  input: GenerateWordsInput,
  count: number
): Promise<WordDocumentLike[]> {
  let numPredict: number;
  let numCtx: number | undefined;
  if (count <= 1) {
    numPredict = 512;
    numCtx = 2048;
  } else if (count <= 10) {
    numPredict = 1536;
    numCtx = 4096;
  } else {
    numPredict = 2048;
    numCtx = undefined;
  }

  const userPrompt = buildUserPrompt({ ...input, count });
  const content = await invokeWordModel(SYSTEM_PROMPT, userPrompt, numPredict, numCtx);
  const items = parseJsonArray(content);
  return toWordDocs(items);
}

/**
 * Generate words via Ollama. Uses generate → judge → refine when count >= PIPELINE_MIN_COUNT and WORDGEN_USE_PIPELINE.
 */
export async function generateWords(
  input: GenerateWordsInput
): Promise<WordDocumentLike[]> {
  const count = input.count ?? DEFAULT_COUNT_PER_CATEGORY;
  if (
    WORDGEN_USE_PIPELINE &&
    count >= PIPELINE_MIN_COUNT
  ) {
    return generateWordsPipeline(input, count);
  }
  return generateWordsSingleShot(input, count);
}

async function invokeOneWordPerCategory(
  input: {
    language: string;
    region: string;
    culture?: WordgenCulturePack;
    categories?: readonly string[];
  },
  options: { useExtendedGrounding?: boolean; skipSeedGrounding?: boolean; logContext?: string }
): Promise<WordDocumentLike[]> {
  const categories = input.categories?.length
    ? input.categories
    : categoriesForGeneration(input.language);
  const llm = createWordgenLlm(1200, 4096);
  const userPrompt = buildOneWordPerCategoryPrompt(
    input.language,
    input.region,
    categories,
    input.culture,
    options.useExtendedGrounding,
    options.skipSeedGrounding,
    options.logContext ?? "mini"
  );
  const response = await llm.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userPrompt),
  ]);
  const content =
    typeof response.content === "string"
      ? response.content
      : String(response.content ?? "");
  const items = parseJsonArray(content);
  const allowSet = new Set(categories.map((c) => c.toLowerCase()));
  let docs = toWordDocs(items).filter((w) =>
    allowSet.has(w.category.trim().toLowerCase())
  );
  const dictCheck = applyDictionaryValidation(docs, input.language);
  if (dictCheck.rejected.length > 0) {
    docs = dictCheck.accepted;
  }
  logValidationIssues(docs, input.language);
  return romanizeWordDocuments(docs, input.language, input.region);
}

/**
 * Phase 1 only: one Ollama call → 1 word per culture-appropriate category. Fast mini path.
 * Retries without vocabulary samples when the first pass returns 0 words or seed files are empty.
 */
export async function generateOneWordPerCategory(input: {
  language: string;
  region: string;
  culture?: WordgenCulturePack;
  useExtendedGrounding?: boolean;
  categoriesToFill?: string[];
}): Promise<WordDocumentLike[]> {
  const categories = categoriesForGeneration(input.language, input.categoriesToFill);
  const seedsAvailable = getSeedWordsFromFiles(input.language, 1).length > 0;

  const useGrounding =
    !seedsAvailable ? false : Boolean(input.useExtendedGrounding);

  if (input.useExtendedGrounding && !seedsAvailable) {
    console.error(
      "  Mini: no seed vocabulary on disk — generating without sample words"
    );
  }

  const invokeInput = {
    language: input.language,
    region: input.region,
    culture: input.culture,
    categories,
  };

  let docs = await invokeOneWordPerCategory(invokeInput, {
    useExtendedGrounding: useGrounding,
    skipSeedGrounding: !seedsAvailable,
    logContext: "mini",
  });

  if (docs.length === 0) {
    console.error(
      "  Mini: 0 words from first pass — retrying without vocabulary sample words"
    );
    docs = await invokeOneWordPerCategory(invokeInput, {
      useExtendedGrounding: false,
      skipSeedGrounding: true,
      logContext: "mini-retry",
    });
  }

  return docs;
}

/**
 * Generate N words per category: phase 1 = one word × N categories, then fill remaining.
 */
export async function generateWordsForAllCategoriesTwoPhase(
  input: GenerateWordsForAllCategoriesInput
): Promise<WordDocumentLike[]> {
  const countPerCategory = input.countPerCategory ?? DEFAULT_COUNT_PER_CATEGORY;
  const categories = categoriesForGeneration(
    input.language,
    input.categoriesToFill
  );

  const phase1 = await generateOneWordPerCategory({
    language: input.language,
    region: input.region,
    culture: input.culture,
    useExtendedGrounding: input.useExtendedGrounding,
    categoriesToFill: categories,
  });
  const phase1Filtered = phase1.filter((w) =>
    categories.some((c) => c.toLowerCase() === w.category.trim().toLowerCase())
  );
  console.error(`  Phase 1 (1 word × ${categories.length} categories): ${phase1Filtered.length} words`);
  const fillCount = Math.max(0, countPerCategory - 1);
  const allWords: WordDocumentLike[] = [...phase1Filtered];
  if (fillCount === 0) return romanizeWordDocuments(allWords, input.language, input.region);
  for (const category of categories) {
    const words = await generateWords({
      category,
      language: input.language,
      region: input.region,
      count: fillCount,
      culture: input.culture,
      useExtendedGrounding: input.useExtendedGrounding,
    });
    allWords.push(...words);
    console.error(`  ${category}: +${words.length} words (target ${countPerCategory} total)`);
  }
  return romanizeWordDocuments(allWords, input.language, input.region);
}

/**
 * Generate N words per culture-appropriate category via sequential calls.
 */
export async function generateWordsForAllCategories(
  input: GenerateWordsForAllCategoriesInput
): Promise<WordDocumentLike[]> {
  const countPerCategory = input.countPerCategory ?? DEFAULT_COUNT_PER_CATEGORY;
  const categories = categoriesForGeneration(
    input.language,
    input.categoriesToFill
  );
  const allWords: WordDocumentLike[] = [];

  for (const category of categories) {
    const words = await generateWords({
      category,
      language: input.language,
      region: input.region,
      count: countPerCategory,
      culture: input.culture,
      useExtendedGrounding: input.useExtendedGrounding,
    });
    allWords.push(...words);
    console.error(
      `  ${category}: ${words.length} words (target ${countPerCategory})`
    );
  }

  return romanizeWordDocuments(allWords, input.language, input.region);
}

/**
 * English-only niche category: generate N words for a user-defined category name.
 */
export async function generateWordsForNicheCategory(input: {
  category: string;
  region: string;
  count?: number;
  culture?: WordgenCulturePack;
}): Promise<WordDocumentLike[]> {
  const category = normalizeNicheCategoryName(input.category);
  if (!category) {
    throw new Error(
      "Invalid niche category. Use 2–48 letters/numbers (not a reserved game category)."
    );
  }
  const count = input.count ?? DEFAULT_COUNT_PER_CATEGORY;
  const words = await generateWords({
    category,
    language: "English",
    region: input.region.trim() || "UK",
    count,
    culture: {
      ...input.culture,
      cultureNotes: [
        input.culture?.cultureNotes,
        `Niche English category "${category}": specialized vocabulary (jargon, proper names, or domain terms) suitable for a party word game.`,
      ]
        .filter(Boolean)
        .join(" "),
    },
  });
  return romanizeWordDocuments(words, "English", input.region.trim() || "UK");
}

async function main() {
  const [language, region, countStr] = process.argv.slice(2);
  const input: GenerateWordsForAllCategoriesInput = {
    language: language ?? "English",
    region: region ?? "UK",
    countPerCategory: countStr ? parseInt(countStr, 10) : DEFAULT_COUNT_PER_CATEGORY,
  };

  console.error(
    `Generating words for locale categories (${input.countPerCategory ?? DEFAULT_COUNT_PER_CATEGORY} per category) with Ollama (${MODEL})...`,
    { language: input.language, region: input.region, countPerCategory: input.countPerCategory }
  );
  const words = await generateWordsForAllCategories(input);
  const catCount = categoriesForGeneration(input.language ?? "English").length;
  console.error(`Total: ${words.length} words across ${catCount} categories.`);
  console.log(JSON.stringify(words, null, 2));
}

const isRunAsScript = process.argv[1]?.includes("ollamaWordGenerator");
if (isRunAsScript) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
