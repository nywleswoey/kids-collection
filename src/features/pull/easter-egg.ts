import { RARITIES, RARITY_WEIGHTS, type Card, type Rarity } from "@/lib/types";
import type { Rng } from "@/lib/logic";
import { sample } from "@/lib/rng";

/**
 * Easter-egg logic (U6-FR2). PURE — server-side trigger + choice selection,
 * property-testable so the odds/selection can't be skewed by the client.
 */

/** Chance per discover that the pick-1-of-5 easter egg fires (~1%). */
export const EGG_CHANCE = 0.01;

/**
 * Roll a rarity by the normal pull odds (Inc19 FR3): weighted by RARITY_WEIGHTS
 * (common 60 / rare 25 / epic 12 / legendary 3). PURE so the unified Easter Egg
 * ticket's tier distribution is property-testable and client-tamper-proof.
 */
export function rollWeightedRarity(rng: Rng = Math.random): Rarity {
  const total = RARITIES.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= RARITY_WEIGHTS[r];
    if (roll < 0) return r;
  }
  return RARITIES[RARITIES.length - 1]; // rng()===1 fallback
}

const EPIC_PLUS: readonly Rarity[] = ["epic", "legendary"];
const COMMON_RARE: readonly Rarity[] = ["common", "rare"];

/** True with probability EGG_CHANCE. */
export function rollEasterEgg(rng: Rng = Math.random): boolean {
  return rng() < EGG_CHANCE;
}

/** Pick up to `n` distinct random cards whose rarity is in `tiers`. */
function pickChoicesByTier(
  pool: Card[],
  tiers: readonly Rarity[],
  n: number,
  rng: Rng,
): Card[] {
  const eligible = pool.filter((c) => tiers.includes(c.rarity));
  return sample(eligible, n, rng);
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
  return pickChoicesByTier(pool, EPIC_PLUS, n, rng);
}

/**
 * Pick up to `n` distinct common/rare cards at random (Inc8 FR1 second egg,
 * owned allowed). Fewer than `n` in the pool → returns as many as exist.
 */
export function pickCommonRareChoices(
  pool: Card[],
  n = 5,
  rng: Rng = Math.random,
): Card[] {
  return pickChoicesByTier(pool, COMMON_RARE, n, rng);
}

/**
 * Pick up to `n` distinct cards of ONE exact rarity (Inc16 FR2 rarity-pick
 * ticket redemption). Owned allowed. Fewer than `n` in that tier → as many as exist.
 */
export function pickRarityChoices(
  pool: Card[],
  rarity: Rarity,
  n = 5,
  rng: Rng = Math.random,
): Card[] {
  return pickChoicesByTier(pool, [rarity], n, rng);
}
