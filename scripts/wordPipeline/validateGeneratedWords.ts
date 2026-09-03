/**
 * Automated QA validators for AI-generated word batches.
 */

import { containsNonLatinScript } from "./romanizeWords";
import { hasSeedDictionary, isInSeedDictionary } from "./seedWords";
import type { WordDocumentLike } from "./ollamaWordGenerator";

export interface ValidationIssue {
  word: string;
  category: string;
  rule: string;
  message: string;
}

export interface ValidateOptions {
  expectedCategory?: string;
  expectedLanguage?: string;
  expectedRegion?: string;
  requireLatinScript?: boolean;
  /** When true and seed file exists, native-script words must be in dictionary. */
  checkDictionary?: boolean;
}

const OFFENSIVE_BLOCKLIST = new Set(
  ["slur_placeholder"].map((s) => s.toLowerCase())
);

export function validateGeneratedWords(
  words: WordDocumentLike[],
  options: ValidateOptions = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const w of words) {
    const word = String(w.word ?? "").trim();
    const category = String(w.category ?? "").trim();
    const key = `${category}::${word.toLowerCase()}`;

    if (!word || !category) {
      issues.push({ word, category, rule: "schema", message: "Missing word or category" });
      continue;
    }

    if (word.includes(" ")) {
      issues.push({ word, category, rule: "single_token", message: "Word contains spaces" });
    }
    if (word.length < 2 || word.length > 30) {
      issues.push({ word, category, rule: "length", message: `Length ${word.length} out of range 2–30` });
    }
    if (options.expectedCategory && category !== options.expectedCategory) {
      issues.push({
        word,
        category,
        rule: "category_match",
        message: `Expected ${options.expectedCategory}, got ${category}`,
      });
    }
    if (options.requireLatinScript !== false && containsNonLatinScript(word)) {
      issues.push({ word, category, rule: "latin_script", message: "Non-Latin script in word field" });
    }
    if (OFFENSIVE_BLOCKLIST.has(word.toLowerCase())) {
      issues.push({ word, category, rule: "blocklist", message: "Blocked term" });
    }
    if (seen.has(key)) {
      issues.push({ word, category, rule: "duplicate", message: "Duplicate in batch" });
    }
    seen.add(key);

    if (
      options.checkDictionary &&
      options.expectedLanguage &&
      hasSeedDictionary(options.expectedLanguage) &&
      containsNonLatinScript(word) &&
      !isInSeedDictionary(options.expectedLanguage, word)
    ) {
      issues.push({
        word,
        category,
        rule: "dictionary",
        message: "Not found in seed dictionary",
      });
    }
  }

  return issues;
}

export function assertValidBatch(
  words: WordDocumentLike[],
  options: ValidateOptions = {}
): void {
  const issues = validateGeneratedWords(words, options);
  if (issues.length > 0) {
    const summary = issues
      .slice(0, 5)
      .map((i) => `${i.word} (${i.rule}): ${i.message}`)
      .join("; ");
    throw new Error(`Validation failed (${issues.length} issues): ${summary}`);
  }
}
