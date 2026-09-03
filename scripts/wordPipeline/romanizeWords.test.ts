import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  containsNonLatinScript,
  wordsNeedingRomanization,
} from "./romanizeWords";

describe("containsNonLatinScript", () => {
  it("detects Tamil script", () => {
    assert.equal(containsNonLatinScript("விக்ரம்"), true);
    assert.equal(containsNonLatinScript("kozhi"), false);
  });

  it("detects Devanagari", () => {
    assert.equal(containsNonLatinScript("रोटी"), true);
    assert.equal(containsNonLatinScript("roti"), false);
  });

  it("allows Latin with accents", () => {
    assert.equal(containsNonLatinScript("café"), false);
    assert.equal(containsNonLatinScript("naïve"), false);
  });

  it("detects CJK", () => {
    assert.equal(containsNonLatinScript("寿司"), true);
  });
});

describe("wordsNeedingRomanization", () => {
  it("filters only native-script entries", () => {
    const words = [
      { word: "apple", category: "Food" },
      { word: "விக்ரம்", category: "Movies & TV" },
    ];
    const need = wordsNeedingRomanization(words);
    assert.equal(need.length, 1);
    assert.equal(need[0].word, "விக்ரம்");
  });
});
