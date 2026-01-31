/**
 * Language / Region / Category combinations that do not yet have word data.
 * Used to train or prompt an LLM/NLP model to generate words in real-time (upcoming feature).
 * Names only — no word lists here.
 */

export type MissingCombination = {
  language: string;
  region: string;
  category: string;
};

/** Combinations we currently have no words for (diverse languages and regions). */
export const MISSING_LANGUAGE_REGION_CATEGORY: MissingCombination[] = [
  { language: "Arabic", region: "Saudi Arabia", category: "Food" },
  { language: "Mandarin", region: "China", category: "Animals" },
  { language: "Japanese", region: "Japan", category: "Technology" },
  { language: "Swahili", region: "Kenya", category: "Geography" },
  { language: "Portuguese", region: "Brazil", category: "Music" },
  { language: "German", region: "Germany", category: "Science" },
  { language: "Italian", region: "Italy", category: "Literature" },
  { language: "Korean", region: "South Korea", category: "Entertainment" },
  { language: "Turkish", region: "Turkey", category: "Famous People" },
  { language: "Russian", region: "Russia", category: "Sports & Games" },
  { language: "Vietnamese", region: "Vietnam", category: "Colors & Shades" },
  { language: "Thai", region: "Thailand", category: "Movies & TV" },
  { language: "Indonesian", region: "Indonesia", category: "Places" },
  { language: "Polish", region: "Poland", category: "Names" },
  { language: "Dutch", region: "Netherlands", category: "Objects & Things" },
  { language: "Greek", region: "Greece", category: "Chemicals" },
  { language: "Hebrew", region: "Israel", category: "Basic Words" },
  { language: "Bengali", region: "Bangladesh", category: "Jobs & Professions" },
  { language: "Malay", region: "Malaysia", category: "Artists" },
  { language: "Tagalog", region: "Philippines", category: "Food" },
];
