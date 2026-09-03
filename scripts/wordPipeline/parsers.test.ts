import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseJsonArray, parseJudgeResult } from "./ollamaWordGenerator";

describe("parseJsonArray", () => {
  it("parses a clean JSON array", () => {
    const out = parseJsonArray(
      '[{"word":"roti","category":"Food","language":"Punjabi","region":"India"}]'
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].word, "roti");
    assert.equal(out[0].category, "Food");
  });

  it("parses an array wrapped in ```json fences", () => {
    const text = '```json\n[{"word":"paani","category":"Food","language":"Hindi","region":"India"}]\n```';
    const out = parseJsonArray(text);
    assert.equal(out.length, 1);
    assert.equal(out[0].word, "paani");
  });

  it("parses an array surrounded by model prose", () => {
    const text =
      'Sure! Here are the words:\n[{"word":"ghar","category":"Objects & Things","language":"Urdu","region":"India"}]\nHope that helps!';
    const out = parseJsonArray(text);
    assert.equal(out.length, 1);
    assert.equal(out[0].word, "ghar");
  });

  it("drops items with an empty word", () => {
    const out = parseJsonArray(
      '[{"word":"","category":"Food","language":"x","region":"y"},{"word":"doodh","category":"Food","language":"x","region":"y"}]'
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].word, "doodh");
  });

  it("coerces missing fields to empty strings without throwing", () => {
    const out = parseJsonArray('[{"word":"chai"}]');
    assert.equal(out.length, 1);
    assert.equal(out[0].word, "chai");
    assert.equal(out[0].category, "");
    assert.equal(out[0].language, "");
  });

  it("returns [] for malformed JSON", () => {
    assert.deepEqual(parseJsonArray('[{"word":"roti", oops]'), []);
  });

  it("returns [] for non-array JSON", () => {
    assert.deepEqual(parseJsonArray('{"word":"roti"}'), []);
  });

  it("returns [] for empty / non-JSON text", () => {
    assert.deepEqual(parseJsonArray(""), []);
    assert.deepEqual(parseJsonArray("no json here"), []);
  });
});

describe("parseJudgeResult", () => {
  it("parses accepted and rejected", () => {
    const out = parseJudgeResult(
      '{"accepted":["roti","doodh"],"rejected":[{"word":"xyz","reason":"not a word"}]}'
    );
    assert.deepEqual(out.accepted, ["roti", "doodh"]);
    assert.equal(out.rejected.length, 1);
    assert.equal(out.rejected[0].word, "xyz");
    assert.equal(out.rejected[0].reason, "not a word");
  });

  it("parses a fenced + prose-wrapped object", () => {
    const text =
      'Here is my review:\n```json\n{"accepted":["paani"],"rejected":[]}\n```';
    const out = parseJudgeResult(text);
    assert.deepEqual(out.accepted, ["paani"]);
    assert.deepEqual(out.rejected, []);
  });

  it("drops rejected entries with empty word", () => {
    const out = parseJudgeResult(
      '{"accepted":[],"rejected":[{"word":"","reason":"blank"},{"word":"q","reason":"obscure"}]}'
    );
    assert.equal(out.rejected.length, 1);
    assert.equal(out.rejected[0].word, "q");
  });

  it("returns empty arrays for malformed JSON", () => {
    const out = parseJudgeResult("totally broken { ");
    assert.deepEqual(out.accepted, []);
    assert.deepEqual(out.rejected, []);
  });

  it("tolerates missing keys", () => {
    const out = parseJudgeResult("{}");
    assert.deepEqual(out.accepted, []);
    assert.deepEqual(out.rejected, []);
  });
});
