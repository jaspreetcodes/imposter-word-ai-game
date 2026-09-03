import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeMafiaCount } from "./mafiaCount";

describe("computeMafiaCount", () => {
  it("returns 0 for too-few players", () => {
    assert.equal(computeMafiaCount(0), 0);
    assert.equal(computeMafiaCount(1), 0);
  });

  it("returns 1 mafia for 2-4 players", () => {
    assert.equal(computeMafiaCount(2), 1);
    assert.equal(computeMafiaCount(3), 1);
    assert.equal(computeMafiaCount(4), 1);
  });

  it("scales at ~1 mafia per 4 players for 5+", () => {
    assert.equal(computeMafiaCount(5), 1);
    assert.equal(computeMafiaCount(8), 2);
    assert.equal(computeMafiaCount(12), 3);
    assert.equal(computeMafiaCount(25), 6);
  });

  it("never leaves a game without crewmates", () => {
    for (let n = 2; n <= 25; n++) {
      assert.ok(computeMafiaCount(n) < n);
    }
  });
});
