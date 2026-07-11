import type { Card, Rarity } from "@/lib/types";
import { RARITIES } from "@/lib/types";
import type { Rng } from "@/lib/logic";

/**
 * Sacrifice-to-upgrade logic (Inc8 FR2). PURE — property-testable so the tier
 * roll and result selection can't be skewed by the client.
 */

/** Copies consumed per sacrifice. */
export const SACRIFICE_COST = 3;

/** The next rarity up, capped at the top tier (legendary → legendary). */
export function nextTier(r: Rarity): Rarity {
  const i = RARITIES.indexOf(r);
  return RARITIES[Math.min(i + 1, RARITIES.length - 1)];
}

/** 50/50: same tier vs one tier higher (legendary stays legendary). */
export function rollUpgradeTier(r: Rarity, rng: Rng = Math.random): Rarity {
  return rng() < 0.5 ? r : nextTier(r);
}

/**
 * Pick a random card of `tier`, preferring a not-yet-owned card; falls back to
 * any card in the tier. Returns null only if the pool has no card of that tier.
 */
export function pickUpgradeCard(
  pool: Card[],
  tier: Rarity,
  ownedIds: Set<string>,
  rng: Rng = Math.random,
): Card | null {
  const inTier = pool.filter((c) => c.rarity === tier);
  if (inTier.length === 0) return null;
  const unowned = inTier.filter((c) => !ownedIds.has(c.id));
  const pickFrom = unowned.length > 0 ? unowned : inTier;
  return pickFrom[Math.floor(rng() * pickFrom.length)];
}
