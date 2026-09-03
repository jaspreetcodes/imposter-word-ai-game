/**
 * Browser-side hooks that let automated tests pin down the two non-deterministic
 * parts of local gameplay: role/word randomness and the reveal auto-hide timer.
 *
 * Tests set `window.__MAFIA_TEST__` before the app boots (Cypress does this in
 * `onBeforeLoad`). The hooks are ignored unless the bundle was built for testing,
 * so production keeps real randomness and the real timer.
 */

import { createSeededRandom, type RandomSource } from "./random";

export interface TestHookOverrides {
  /** Fixes word choice and Mafia assignment for a page load. */
  seed?: number;
  /** Overrides the player reveal auto-hide delay, in milliseconds. */
  revealTimeoutMs?: number;
}

declare global {
  interface Window {
    __MAFIA_TEST__?: TestHookOverrides;
  }
}

export const DEFAULT_REVEAL_TIMEOUT_MS = 10_000;

const env = import.meta.env as Record<string, unknown> | undefined;

/** Test hooks are compiled in for dev servers and for builds made with VITE_E2E=true. */
export const testHooksEnabled = env?.VITE_E2E === "true" || env?.DEV === true;

function overrides(): TestHookOverrides | undefined {
  if (!testHooksEnabled || typeof window === "undefined") return undefined;
  return window.__MAFIA_TEST__;
}

let seeded: { seed: number; random: RandomSource } | undefined;

/**
 * Random source for gameplay. Returns a seeded generator when a test supplied a
 * seed, otherwise `Math.random`.
 */
export function gameRandom(): RandomSource {
  const seed = overrides()?.seed;
  if (typeof seed !== "number" || !Number.isFinite(seed)) return Math.random;
  if (!seeded || seeded.seed !== seed) {
    seeded = { seed, random: createSeededRandom(seed) };
  }
  return seeded.random;
}

/** Delay before a player's word auto-hides on the reveal screen. */
export function revealTimeoutMs(): number {
  const value = overrides()?.revealTimeoutMs;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_REVEAL_TIMEOUT_MS;
  }
  return value;
}
