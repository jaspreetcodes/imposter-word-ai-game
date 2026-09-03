import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALL_CATEGORIES,
  AI_GENERATION_LANGUAGES,
  CULTURE_RICH_CATEGORIES,
  UNIVERSAL_CATEGORIES,
  categoriesForLocale,
  isAiGenerationLanguage,
  isCultureRich,
  isEnglishLanguage,
  isUniversalCategory,
  normalizeNicheCategoryName,
} from "../../src/constants/categories.ts";

describe("category taxonomy", () => {
  it("partitions ALL_CATEGORIES into culture-rich + universal without overlap", () => {
    const rich = new Set(CULTURE_RICH_CATEGORIES);
    const univ = new Set(UNIVERSAL_CATEGORIES);
    for (const c of CULTURE_RICH_CATEGORIES) {
      assert.ok(!univ.has(c as (typeof UNIVERSAL_CATEGORIES)[number]));
    }
    for (const c of UNIVERSAL_CATEGORIES) {
      assert.ok(!rich.has(c as (typeof CULTURE_RICH_CATEGORIES)[number]));
    }
    assert.equal(
      CULTURE_RICH_CATEGORIES.length + UNIVERSAL_CATEGORIES.length,
      ALL_CATEGORIES.length
    );
  });

  it("categoriesForLocale returns culture-rich for Hindi and full list for English", () => {
    const hindi = categoriesForLocale("Hindi");
    assert.deepEqual([...hindi], [...CULTURE_RICH_CATEGORIES]);
    assert.ok(!hindi.includes("Colors & Shades"));
    assert.ok(hindi.includes("Food"));

    const english = categoriesForLocale("English");
    assert.equal(english.length, ALL_CATEGORIES.length);
  });

  it("isCultureRich / isUniversalCategory helpers", () => {
    assert.equal(isCultureRich("Movies & TV"), true);
    assert.equal(isUniversalCategory("Colors & Shades"), true);
    assert.equal(isCultureRich("Colors & Shades"), false);
  });

  it("AI language allowlist", () => {
    assert.equal(isAiGenerationLanguage("Punjabi"), true);
    assert.equal(isAiGenerationLanguage("somali"), false);
    assert.equal(isAiGenerationLanguage("Tamil"), false);
    assert.ok(AI_GENERATION_LANGUAGES.includes("Hindi"));
  });

  it("isEnglishLanguage is case-insensitive", () => {
    assert.equal(isEnglishLanguage("English"), true);
    assert.equal(isEnglishLanguage("english"), true);
    assert.equal(isEnglishLanguage("Hindi"), false);
  });

  it("normalizeNicheCategoryName rejects reserved and invalid names", () => {
    assert.equal(normalizeNicheCategoryName("Football jargon"), "Football jargon");
    assert.equal(normalizeNicheCategoryName("Food"), null);
    assert.equal(normalizeNicheCategoryName("a"), null);
    assert.equal(normalizeNicheCategoryName("!!!"), null);
  });
});
