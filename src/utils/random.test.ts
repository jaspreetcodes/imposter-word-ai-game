import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRandom, pickOne, randomIndex, shuffle } from "./random";

test("seeded random repeats the same sequence for the same seed", () => {
  const a = createSeededRandom(42);
  const b = createSeededRandom(42);
  const first = Array.from({ length: 8 }, () => a());
  const second = Array.from({ length: 8 }, () => b());
  assert.deepEqual(first, second);
});

test("seeded random differs across seeds", () => {
  const a = createSeededRandom(1);
  const b = createSeededRandom(2);
  assert.notEqual(a(), b());
});

test("seeded random stays inside [0, 1)", () => {
  const rng = createSeededRandom(7);
  for (let i = 0; i < 500; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1, `value out of range: ${value}`);
  }
});

test("randomIndex never exceeds the collection bounds", () => {
  const rng = createSeededRandom(99);
  for (let i = 0; i < 200; i++) {
    const index = randomIndex(5, rng);
    assert.ok(index >= 0 && index < 5);
  }
  assert.equal(randomIndex(0, rng), -1);
});

test("pickOne is deterministic under a seeded source", () => {
  const items = ["a", "b", "c", "d"];
  const first = pickOne(items, createSeededRandom(2024));
  const second = pickOne(items, createSeededRandom(2024));
  assert.equal(first, second);
  assert.ok(items.includes(first as string));
});

test("shuffle keeps every element and does not mutate the input", () => {
  const items = [1, 2, 3, 4, 5, 6];
  const shuffled = shuffle(items, createSeededRandom(11));
  assert.deepEqual([...shuffled].sort((x, y) => x - y), items);
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6]);
});

test("shuffle is deterministic under a seeded source", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(
    shuffle(items, createSeededRandom(5)),
    shuffle(items, createSeededRandom(5))
  );
});
