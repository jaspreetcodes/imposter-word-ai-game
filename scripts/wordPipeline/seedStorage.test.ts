import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseWordListText,
  pickRandomSubset,
  isValidSeedWord,
} from "./seedStorage";

describe("parseWordListText", () => {
  it("splits comma-separated upstream format", () => {
    const words = parseWordListText("apple,banana,cherry");
    assert.deepEqual(words, ["apple", "banana", "cherry"]);
  });

  it("splits newline format", () => {
    const words = parseWordListText("apple\nbanana\n");
    assert.deepEqual(words, ["apple", "banana"]);
  });

  it("filters single-char and digit-only", () => {
    const words = parseWordListText("a,12,ok");
    assert.deepEqual(words, ["ok"]);
  });
});

describe("pickRandomSubset", () => {
  it("returns at most n items", () => {
    const arr = Array.from({ length: 100 }, (_, i) => `w${i}`);
    assert.equal(pickRandomSubset(arr, 10).length, 10);
  });

  it("returns all when array smaller than n", () => {
    assert.equal(pickRandomSubset(["a", "b"], 5).length, 2);
  });
});

describe("isValidSeedWord", () => {
  it("rejects too short", () => {
    assert.equal(isValidSeedWord("a"), false);
  });
  it("accepts normal words", () => {
    assert.equal(isValidSeedWord("roti"), true);
  });
});
