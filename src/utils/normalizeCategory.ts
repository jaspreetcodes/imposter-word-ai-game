import { CATEGORY_META } from "../constants/categoryMeta";

const CANONICAL = Object.keys(CATEGORY_META);

/** Map common LLM / import variants to canonical game category names. */
const ALIASES: Record<string, string> = {
  "movies and tv": "Movies & TV",
  "movies & tv": "Movies & TV",
  "movie & tv": "Movies & TV",
  "sports and games": "Sports & Games",
  "sports & games": "Sports & Games",
  "jobs and professions": "Jobs & Professions",
  "jobs & professions": "Jobs & Professions",
  "objects and things": "Objects & Things",
  "objects & things": "Objects & Things",
  "basic words": "Basic Words",
  "colors and shades": "Colors & Shades",
  "colors & shades": "Colors & Shades",
  "famous people": "Famous People",
};

/** Normalize a raw category string to a canonical name when possible. */
export function normalizeCategoryName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (CATEGORY_META[trimmed]) return trimmed;

  const lower = trimmed.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];

  const exact = CANONICAL.find((c) => c.toLowerCase() === lower);
  return exact ?? trimmed;
}

/** Strip internal suffixes from stored category names before showing players. */
export function formatCategoryLabel(raw: string): string {
  const normalized = normalizeCategoryName(raw);
  const stripped = normalized
    .replace(/\s*\((AI\/Firestore|AI|Firestore)\)\s*/gi, "")
    .trim();
  return stripped || normalized;
}
