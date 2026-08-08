import type { Rng } from "./logic";

/**
 * Shared deterministic RNG helpers (injectable rng ⇒ property-testable). All
 * three primitives clamp against `rng()===1` so an out-of-range index can never
 * be produced, and every consumer stays uniform.
 */

/**
 * A deterministic `Rng` from a string seed (Inc25 D7). Same seed ⇒ same stream,
 * on every machine and every process — which is what lets the daily topic draw
 * be a pure function of (child, day) with no stored state and no reroll on
 * refresh. xmur3 (seed hashing) + mulberry32 (the generator); both are tiny,
 * well-known, and need no dependency.
 */
export function seededRng(seed: string): Rng {
  // xmur3: string → a well-mixed 32-bit seed.
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
  // mulberry32: 32-bit state → uniform doubles in [0,1).
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in `[min, max]` inclusive. Clamps against `rng()===1`. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
}

/** Return a shuffled copy of `arr` (Fisher–Yates); the input is not mutated. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Return up to `n` distinct random items from `arr` (partial Fisher–Yates). */
export function sample<T>(arr: readonly T[], n: number, rng: Rng): T[] {
  const a = [...arr];
  const k = Math.min(n, a.length);
  for (let i = 0; i < k; i++) {
    const j = randInt(rng, i, a.length - 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
