import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGeneratedWords } from "./validateGeneratedWords";

describe("validateGeneratedWords", () => {
  it("passes valid latin words", () => {
    const issues = validateGeneratedWords(
      [{ word: "roti", category: "Food", languages: ["Punjabi"], regions: ["Punjab"] }],
      { expectedCategory: "Food", requireLatinScript: true }
    );
    assert.equal(issues.length, 0);
  });

  it("flags multi-word entries", () => {
    const issues = validateGeneratedWords(
      [{ word: "ice cream", category: "Food" }],
      {}
    );
    assert.ok(issues.some((i) => i.rule === "single_token"));
  });

  it("flags wrong category", () => {
    const issues = validateGeneratedWords(
      [{ word: "dog", category: "Animals" }],
      { expectedCategory: "Food" }
    );
    assert.ok(issues.some((i) => i.rule === "category_match"));
  });

  it("flags duplicates in batch", () => {
    const issues = validateGeneratedWords(
      [
        { word: "roti", category: "Food" },
        { word: "roti", category: "Food" },
      ],
      {}
    );
    assert.ok(issues.some((i) => i.rule === "duplicate"));
  });
});
