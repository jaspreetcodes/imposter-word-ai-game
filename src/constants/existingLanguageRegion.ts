/**
 * Languages and regions that already have word data (sample + Firestore seed).
 * Used to validate "Add new language & region" form: user must enter a *new*
 * language and region not in these lists to proceed.
 * Keep in sync with scripts/newCategoryWords.json and seed data.
 */

/** Normalize for comparison: trim, lowercase. */
export function normalizeForComparison(s: string): string {
  return s.trim().toLowerCase();
}

/** Languages that already exist in our word set. */
export const EXISTING_LANGUAGES: string[] = [
  "English",
  "French",
  "Hindi",
  "Punjabi",
  "Urdu",
  "Spanish",
];

/** Regions that already exist in our word set. */
export const EXISTING_REGIONS: string[] = [
  "US",
  "UK",
  "Canada",
  "France",
  "India",
  "Punjab",
  "London",
  "Mexico",
  "Spain",
  "Toronto",
];

const existingLanguagesLower = new Set(EXISTING_LANGUAGES.map(normalizeForComparison));
const existingRegionsLower = new Set(EXISTING_REGIONS.map(normalizeForComparison));

/** Returns true if this language already exists (case-insensitive). */
export function isExistingLanguage(language: string): boolean {
  return existingLanguagesLower.has(normalizeForComparison(language));
}

/** Returns true if this region already exists (case-insensitive). */
export function isExistingRegion(region: string): boolean {
  return existingRegionsLower.has(normalizeForComparison(region));
}

/**
 * (language, region) pairs that already have words in our word set.
 * Used to decide: on "Generate more words" click, call AI only when combination does not exist.
 * Keep in sync with scripts/newCategoryWords.json and seed data.
 */
const EXISTING_COMBINATIONS_LOWER: Set<string> = new Set(
  [
    ["English", "US"],
    ["English", "UK"],
    ["English", "Canada"],
    ["English", "London"],
    ["English", "Toronto"],
    ["French", "France"],
    ["French", "Canada"],
    ["Hindi", "India"],
    ["Punjabi", "India"],
    ["Punjabi", "Punjab"],
    ["Urdu", "India"],
    ["Spanish", "Mexico"],
    ["Spanish", "Spain"],
  ].map(([lang, reg]) => `${normalizeForComparison(lang)}::${normalizeForComparison(reg)}`)
);

/** Returns true if we already have words for this language + region (case-insensitive). */
export function combinationExists(language: string, region: string): boolean {
  return EXISTING_COMBINATIONS_LOWER.has(
    `${normalizeForComparison(language)}::${normalizeForComparison(region)}`
  );
}
