/**
 * Deterministic QA dataset. Every automated suite (Cypress, Newman, k6) seeds the
 * same words and users so assertions can be exact instead of "greater than zero".
 *
 * Locale contract:
 * - Punjabi / Punjab  → every culture-rich category filled to COVERAGE_TARGET (coverage hit).
 * - English / UK      → a few categories filled (gameplay + partial-coverage cases).
 * - Spanish / Spain   → intentionally empty (empty-pool and cache-miss cases).
 */

export interface SeedWord {
  word: string;
  category: string;
  languages: string[];
  regions: string[];
  difficulty: "easy" | "medium" | "hard";
}

export const QA_PROJECT_ID = process.env.QA_FIREBASE_PROJECT_ID ?? "demo-mafiasword";

/** Matches the word-gen server default (WORDGEN_MIN_WORDS_PER_CATEGORY). */
export const COVERAGE_TARGET = 5;

export const QA_LOCALES = {
  covered: { language: "Punjabi", region: "Punjab" },
  partial: { language: "English", region: "UK" },
  empty: { language: "Spanish", region: "Spain" },
  unsupported: { language: "Somali", region: "Somalia" },
} as const;

const PUNJABI_WORDS: Record<string, string[]> = {
  Food: ["makki", "sarson", "lassi", "pinni", "kheer"],
  "Movies & TV": ["carry", "jatt", "chaar", "sufna", "qismat"],
  Music: ["tumbi", "dhol", "boliyan", "chimta", "algoze"],
  Places: ["amritsar", "ludhiana", "patiala", "bathinda", "jalandhar"],
  Literature: ["heer", "waris", "shiv", "amrita", "puran"],
  "Famous People": ["ranjit", "bhagat", "milkha", "gurdas", "sidhu"],
  Artists: ["sobha", "amrita", "jarnail", "sidharth", "devinder"],
  Entertainment: ["mela", "akhara", "jaago", "gidha", "bhangra"],
  "Sports & Games": ["kabaddi", "gatka", "kikli", "pittu", "stapu"],
  Geography: ["satluj", "beas", "ravi", "malwa", "doaba"],
};

const ENGLISH_WORDS: Record<string, string[]> = {
  Food: ["crumpet", "pasty", "trifle", "scone", "haggis"],
  "Movies & TV": ["paddington", "sherlock", "skyfall", "peaky", "gavin"],
  "Colors & Shades": ["scarlet", "teal", "amber", "indigo", "ochre"],
  Technology: ["router", "compiler", "firewall", "kernel", "cache"],
};

function toSeedWords(
  table: Record<string, string[]>,
  language: string,
  region: string
): SeedWord[] {
  return Object.entries(table).flatMap(([category, words]) =>
    words.map((word) => ({
      word,
      category,
      languages: [language],
      regions: [region],
      difficulty: "easy" as const,
    }))
  );
}

export const QA_WORDS: SeedWord[] = [
  ...toSeedWords(PUNJABI_WORDS, QA_LOCALES.covered.language, QA_LOCALES.covered.region),
  ...toSeedWords(ENGLISH_WORDS, QA_LOCALES.partial.language, QA_LOCALES.partial.region),
];

/** Categories that must appear for the covered locale, in stable order. */
export const QA_COVERED_CATEGORIES = Object.keys(PUNJABI_WORDS);
export const QA_PARTIAL_CATEGORIES = Object.keys(ENGLISH_WORDS);

export interface SeedUser {
  email: string;
  password: string;
  displayName: string;
}

export const QA_USERS = {
  existing: {
    email: "qa.player@example.com",
    password: "QaPlayer123!",
    displayName: "QA Player",
  },
  /** Never seeded; sign-up specs create it and the reset step removes it. */
  newSignUp: {
    email: "qa.newcomer@example.com",
    password: "QaNewcomer123!",
    displayName: "QA Newcomer",
  },
} as const satisfies Record<string, SeedUser>;

/** Stable Firestore document id, mirrors makeWordId in src/services/wordsService.ts. */
export function wordDocId(category: string, word: string): string {
  return (
    `${category}__${word}`
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "word"
  );
}
