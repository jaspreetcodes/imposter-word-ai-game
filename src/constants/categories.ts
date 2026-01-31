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
