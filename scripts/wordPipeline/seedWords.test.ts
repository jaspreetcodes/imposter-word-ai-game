import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSeedWords, getRandomSeedWords, isInSeedDictionary, hasSeedDictionary } from "./seedWords";

describe("getSeedWords", () => {
  it("returns curated anchors for a known language", () => {
    const seeds = getSeedWords("Punjabi", 5);
    assert.equal(seeds.length, 5);
    seeds.forEach((w) => assert.ok(w.length > 1));
  });

  it("is case-insensitive on language name", () => {
    assert.equal(getSeedWords("ENGLISH", 3).length, 3);
  });

  it("falls back to English anchors for an unknown language", () => {
    assert.equal(getSeedWords("Klingon", 4).length, 4);
  });

  it("never returns more than requested", () => {
    assert.ok(getSeedWords("Hindi", 3).length <= 3);
  });
});

describe("getRandomSeedWords", () => {
  it("returns up to requested count", () => {
    assert.ok(getRandomSeedWords("Punjabi", 5).length <= 5);
  });

  it("can return more than light anchor count when embedded fallback used", () => {
    const words = getRandomSeedWords("Klingon", 8);
    assert.ok(words.length <= 8);
    assert.ok(words.length >= 1);
  });
});

describe("seed dictionary validation", () => {
  it("does not reject words when no dictionary file is present", () => {
    assert.equal(hasSeedDictionary("Klingon"), false);
    assert.equal(isInSeedDictionary("Klingon", "anything"), true);
  });
});
