import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { languageMatches, regionMatches, parsePendingLocaleKey } from "./localeMatch";

describe("languageMatches", () => {
  it("is case-insensitive", () => {
    assert.equal(languageMatches("Tamil", "tamil"), true);
  });
});

describe("regionMatches", () => {
  it("matches exact region", () => {
    assert.equal(regionMatches("Sri Lanka", "Sri Lanka"), true);
  });

  it("matches Geoapify long form to short preset", () => {
    assert.equal(
      regionMatches("Sri Lanka, Western Province, Sri Lanka", "Sri Lanka"),
      true
    );
  });

  it("does not match unrelated regions", () => {
    assert.equal(regionMatches("India", "Sri Lanka"), false);
  });
});

describe("parsePendingLocaleKey", () => {
  it("splits language and region on first ::", () => {
    assert.deepEqual(parsePendingLocaleKey("tamil::sri lanka, colombo"), {
      language: "tamil",
      region: "sri lanka, colombo",
    });
  });
});
