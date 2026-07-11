import type { Card, Rarity } from "@/lib/types";
import type { Rng } from "@/lib/logic";

/**
 * Easter-egg logic (U6-FR2). PURE — server-side trigger + choice selection,
 * property-testable so the odds/selection can't be skewed by the client.
 */

/** Chance per discover that the pick-1-of-5 easter egg fires (~1%). */
export const EGG_CHANCE = 0.01;

const EPIC_PLUS: readonly Rarity[] = ["epic", "legendary"];

/** True with probability EGG_CHANCE. */
export function rollEasterEgg(rng: Rng = Math.random): boolean {
  return rng() < EGG_CHANCE;
}

/**
 * Pick up to `n` distinct epic+ cards at random (mixed epic/legendary, owned
 * allowed). Fewer than `n` epic+ in the pool → returns as many as exist.
 */
export function pickEasterEggChoices(
  pool: Card[],
  n = 5,
  rng: Rng = Math.random,
): Card[] {
  const epicPlus = pool.filter((c) => EPIC_PLUS.includes(c.rarity));
  // Fisher–Yates on a copy.
  for (let i = epicPlus.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [epicPlus[i], epicPlus[j]] = [epicPlus[j], epicPlus[i]];
  }
  return epicPlus.slice(0, Math.min(n, epicPlus.length));
}
