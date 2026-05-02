/**
 * Generate words for all categories (Food, Movies & TV, etc.) for a given language and region
 * using Groq API. Default model: GPT OSS 120B (81+ languages, high quality).
 * Set GROQ_API_KEY in .env. Override model with GROQ_MODEL (e.g. llama-3.1-8b-instant for cheaper).
 * Usage: npx tsx scripts/wordPipeline/wordGenerator.ts [language] [region] [countPerCategory]
 */

import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
/** Default: GPT OSS 120B for quality + multilingual. Override with GROQ_MODEL. */
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const DEFAULT_COUNT_PER_CATEGORY = Number(process.env.WORDGEN_COUNT_PER_CATEGORY) || 20;

/** All game categories — generate N words per category (default 20) for the given language/region. */
const ALL_CATEGORIES = [
  "Food",
  "Animals",
  "Movies & TV",
  "Sports & Games",
  "Places",
  "Jobs & Professions",
  "Objects & Things",
  "Names",
  "Chemicals",
  "Music",
  "Science",
  "Basic Words",
  "Colors & Shades",
  "Entertainment",
  "Famous People",
  "Geography",
  "Literature",
  "Artists",
  "Technology",
] as const;

export interface GenerateWordsInput {
  category: string;
  language: string;
  region: string;
  count?: number;
}

/** Input for generating words for all categories (language + region; N per category, default 20). */
export interface GenerateWordsForAllCategoriesInput {
  language: string;
  region: string;
  countPerCategory?: number;
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

const SYSTEM_PROMPT = `You are a word list generator for a party word game. Your job is to output valid JSON only.

Rules:
- Output exactly one JSON array. No other text, no markdown, no explanation.
- Each item must be a single word (no phrases, no compound words with spaces).
- Words must be appropriate for all ages and cultures.
- Words must be real and commonly understood in the given language and region.
- Do not repeat the same word. Do not include offensive or inappropriate words.
- Each object in the array must have exactly these keys: "word", "category", "language", "region".
- Use the exact category, language, and region values provided in the user request.`;

function buildUserPrompt(input: GenerateWordsInput): string {
  const count = input.count ?? DEFAULT_COUNT_PER_CATEGORY;
  return `Generate exactly ${count} single-word items for the category "${input.category}" only.

- Category: ${input.category} (all ${count} words must belong to this category only)
- Language: ${input.language}
- Region: ${input.region}

Output a JSON array of objects. Each object must have: "word", "category", "language", "region".
Use category="${input.category}", language="${input.language}", region="${input.region}" for every item.
Words must be typical for "${input.category}" and commonly understood in ${input.language} (${input.region}).

Example format (only the array, no other text):
[{"word":"apple","category":"${input.category}","language":"${input.language}","region":"${input.region}"},{"word":"bread","category":"${input.category}","language":"${input.language}","region":"${input.region}"}]`;
}

/** One prompt: 1 word per category for all categories. Used for fast "mini" response so user can redirect. */
function buildOneWordPerCategoryPrompt(language: string, region: string): string {
  const categoriesList = ALL_CATEGORIES.join(", ");
  return `Generate exactly one single word for each of these categories. Language: ${language}. Region: ${region}.

Categories (one word per category, in this order): ${categoriesList}

Output a JSON array of exactly ${ALL_CATEGORIES.length} objects. Each object: "word", "category", "language", "region".
Use language="${language}" and region="${region}" for every item. Category must be one of: ${categoriesList}.

Example format (only the array, no other text):
[{"word":"apple","category":"Food","language":"${language}","region":"${region}"},{"word":"dog","category":"Animals","language":"${language}","region":"${region}"},...]`;
}

/**
 * Extract a JSON array from model output (handles markdown code blocks and extra text).
 */
function parseJsonArray(text: string): GeneratedWordItem[] {
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

function getClient(): Groq {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env for word generation.");
  }
  return new Groq({ apiKey: GROQ_API_KEY });
}

async function chat(systemPrompt: string, userPrompt: string, maxTokens = 2048): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: maxTokens,
  });
  const content = completion.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

/**
 * Generate words using Groq. Returns items shaped for Firestore (languages/regions arrays).
 */
export async function generateWords(
  input: GenerateWordsInput
): Promise<WordDocumentLike[]> {
  const userPrompt = buildUserPrompt(input);
  const content = await chat(SYSTEM_PROMPT, userPrompt, 2048);
  const items = parseJsonArray(content);

  return items.map((item) => ({
    word: item.word,
    category: item.category,
    languages: [item.language],
    regions: [item.region],
  }));
}

/**
 * Phase 1 only: one call → 1 word per category (19 words). Fast; use for mini so user can redirect.
 */
export async function generateOneWordPerCategory(input: {
  language: string;
  region: string;
}): Promise<WordDocumentLike[]> {
  const userPrompt = buildOneWordPerCategoryPrompt(input.language, input.region);
  const content = await chat(SYSTEM_PROMPT, userPrompt, 1024);
  const items = parseJsonArray(content);
  return items.map((item) => ({
    word: item.word,
    category: item.category,
    languages: [item.language],
    regions: [item.region],
  }));
}

/**
 * Generate 20 words per category: phase 1 = one call (1 word × 19 categories), then phase 2 = 19 calls (19 more per category).
 */
export async function generateWordsForAllCategoriesTwoPhase(
  input: GenerateWordsForAllCategoriesInput
): Promise<WordDocumentLike[]> {
  const countPerCategory = input.countPerCategory ?? DEFAULT_COUNT_PER_CATEGORY;
  const phase1 = await generateOneWordPerCategory({
    language: input.language,
    region: input.region,
  });
  console.error(`  Phase 1 (1 word × ${ALL_CATEGORIES.length} categories): ${phase1.length} words`);
  const fillCount = Math.max(0, countPerCategory - 1);
  const allWords: WordDocumentLike[] = [...phase1];
  if (fillCount === 0) return allWords;
  for (const category of ALL_CATEGORIES) {
    const words = await generateWords({
      category,
      language: input.language,
      region: input.region,
      count: fillCount,
    });
    allWords.push(...words);
    console.error(`  ${category}: +${words.length} words (target ${countPerCategory} total)`);
  }
  return allWords;
}

/**
 * Generate words for all categories via sequential calls (19 categories × N words).
 */
export async function generateWordsForAllCategories(
  input: GenerateWordsForAllCategoriesInput
): Promise<WordDocumentLike[]> {
  const countPerCategory = input.countPerCategory ?? DEFAULT_COUNT_PER_CATEGORY;
  const allWords: WordDocumentLike[] = [];

  for (const category of ALL_CATEGORIES) {
    const words = await generateWords({
      category,
      language: input.language,
      region: input.region,
      count: countPerCategory,
    });
    allWords.push(...words);
    console.error(
      `  ${category}: ${words.length} words (target ${countPerCategory})`
    );
  }

  return allWords;
}

async function main() {
  const [language, region, countStr] = process.argv.slice(2);
  const input: GenerateWordsForAllCategoriesInput = {
    language: language ?? "English",
    region: region ?? "UK",
    countPerCategory: countStr ? parseInt(countStr, 10) : DEFAULT_COUNT_PER_CATEGORY,
  };

  console.error(
    `Generating words for all categories (${input.countPerCategory ?? DEFAULT_COUNT_PER_CATEGORY} per category) with Groq (${MODEL})...`,
    { language: input.language, region: input.region, countPerCategory: input.countPerCategory }
  );
  const words = await generateWordsForAllCategories(input);
  console.error(`Total: ${words.length} words across ${ALL_CATEGORIES.length} categories.`);
  console.log(JSON.stringify(words, null, 2));
}

const isRunAsScript = process.argv[1]?.includes("wordGenerator");
if (isRunAsScript) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
