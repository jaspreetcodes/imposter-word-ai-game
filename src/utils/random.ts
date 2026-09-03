/**
 * Pure random helpers. Every caller passes its own source so tests can inject a
 * seeded generator and get a repeatable sequence of picks and shuffles.
 */

export type RandomSource = () => number;

/** mulberry32: small, fast, and stable across runs for the same seed. */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomIndex(length: number, random: RandomSource = Math.random): number {
  if (length <= 0) return -1;
  const index = Math.floor(random() * length);
  return Math.min(length - 1, Math.max(0, index));
}

export function pickOne<T>(items: readonly T[], random: RandomSource = Math.random): T | undefined {
  const index = randomIndex(items.length, random);
  return index === -1 ? undefined : items[index];
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, random);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
