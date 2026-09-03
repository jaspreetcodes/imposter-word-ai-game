/**
 * Canonical list of all word categories supported by the game.
 * Used by the category selector and word pipeline so Names, Chemicals, etc. are available
 * even before words exist in Firestore.
 */
export const ALL_CATEGORIES = [
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

export type CategoryName = (typeof ALL_CATEGORIES)[number];

/**
 * Culture-grounded categories: locale-native terms that create interesting clue-giving
 * across languages (movies, food, places, etc.). Used for non-English generation/UI.
 */
export const CULTURE_RICH_CATEGORIES = [
  "Food",
  "Movies & TV",
  "Music",
  "Places",
  "Literature",
  "Famous People",
  "Artists",
  "Entertainment",
  "Sports & Games",
  "Geography",
] as const satisfies readonly CategoryName[];

export type CultureRichCategory = (typeof CULTURE_RICH_CATEGORIES)[number];

/**
 * Universal / translational categories: concepts that collapse across languages
 * (red/laal, doctor/doctor). English-default only for v1.
 */
export const UNIVERSAL_CATEGORIES = [
  "Colors & Shades",
  "Jobs & Professions",
  "Animals",
  "Basic Words",
  "Chemicals",
  "Objects & Things",
  "Names",
  "Science",
  "Technology",
] as const satisfies readonly CategoryName[];

export type UniversalCategory = (typeof UNIVERSAL_CATEGORIES)[number];

const CULTURE_RICH_SET = new Set<string>(CULTURE_RICH_CATEGORIES);
const UNIVERSAL_SET = new Set<string>(UNIVERSAL_CATEGORIES);

export function isCultureRich(category: string): boolean {
  return CULTURE_RICH_SET.has(category.trim());
}

export function isUniversalCategory(category: string): boolean {
  return UNIVERSAL_SET.has(category.trim());
}

export function isEnglishLanguage(language: string): boolean {
  return language.trim().toLowerCase() === "english";
}

/**
 * Categories offered for a locale: culture-rich only for non-English;
 * full canonical list for English.
 */
export function categoriesForLocale(language: string): readonly string[] {
  return isEnglishLanguage(language) ? ALL_CATEGORIES : CULTURE_RICH_CATEGORIES;
}

/** Languages the AI word-gen path supports with acceptable quality. */
export const AI_GENERATION_LANGUAGES = [
  "English",
  "French",
  "Hindi",
  "Punjabi",
  "Urdu",
  "Spanish",
] as const;

const AI_LANG_SET = new Set(
  AI_GENERATION_LANGUAGES.map((l) => l.toLowerCase())
);

export function isAiGenerationLanguage(language: string): boolean {
  return AI_LANG_SET.has(language.trim().toLowerCase());
}

/** Normalize and validate a user-defined English niche category name. */
export function normalizeNicheCategoryName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 48) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9 &'\-/]*$/.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  if (ALL_CATEGORIES.some((c) => c.toLowerCase() === lower)) return null;
  return trimmed;
}
