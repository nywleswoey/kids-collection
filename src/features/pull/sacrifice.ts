import type { Card, Rarity } from "@/lib/types";
import { RARITIES } from "@/lib/types";
import type { Rng } from "@/lib/logic";

/**
 * Sacrifice-to-upgrade logic (Inc8 FR2). PURE — property-testable so the tier
 * roll and result selection can't be skewed by the client.
 */

/** Copies consumed per sacrifice. */
export const SACRIFICE_COST = 3;

/**
 * Copies you must hold before a sacrifice is possible. Burning SACRIFICE_COST
 * copies is never allowed to take your last one — `pull-service` enforces that
 * with `removeCard(childId, cardId, SACRIFICE_COST, SACRIFICE_COST + 1)`, so a
 * holding of exactly SACRIFICE_COST can't be burned. Every surface that offers
 * or advertises a sacrifice gates on THIS constant, so the card detail page and
 * the galaxy's burn filter are the same expression rather than two that happen
 * to agree (Inc22 D4).
 */
export const SACRIFICE_MIN = SACRIFICE_COST + 1;

/** The next rarity up, capped at the top tier (legendary → legendary). Still used
 *  by the collection-completion reward (rewards/service.ts). */
export function nextTier(r: Rarity): Rarity {
  const i = RARITIES.indexOf(r);
  return RARITIES[Math.min(i + 1, RARITIES.length - 1)];
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
  // Clamp: an rng() that returns exactly 1 would index out of bounds.
  const idx = Math.min(pickFrom.length - 1, Math.floor(rng() * pickFrom.length));
  return pickFrom[idx];
}
