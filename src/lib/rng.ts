import type { Rng } from "./logic";

/**
 * Shared deterministic RNG helpers (injectable rng ⇒ property-testable). All
 * three primitives clamp against `rng()===1` so an out-of-range index can never
 * be produced, and every consumer stays uniform.
 */

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
