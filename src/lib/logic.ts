/**
 * Pure business logic for U1 (no I/O). The DB-bound services in later units
 * (U4 pull/rewards, U5 binder) call these. Kept pure so they are directly
 * property-testable (PBT extension — see tests/logic.pbt.test.ts).
 */
import {
  type Card,
  type Child,
  type CollectionEntry,
  type Rarity,
  type ThemeProgress,
  RARITIES,
  RARITY_WEIGHTS,
} from "./types";

/** Injectable RNG for deterministic tests. Returns [0, 1). */
export type Rng = () => number;

/**
 * Rarity-weighted random draw from a pool (BR1).
 * 1) pick a rarity by weight, 2) pick uniformly among that rarity's cards.
 * Falls back to any-rarity that actually has cards, so a sparse pool never throws.
 */
export function drawCard(pool: Card[], rng: Rng = Math.random): Card {
  if (pool.length === 0) {
    throw new Error("drawCard: pool is empty");
  }

  const byRarity = groupByRarity(pool);
  const availableRarities = RARITIES.filter((r) => byRarity[r].length > 0);

  // Weighted pick among rarities that have at least one card.
  const totalWeight = availableRarities.reduce(
    (sum, r) => sum + RARITY_WEIGHTS[r],
    0,
  );
  let roll = rng() * totalWeight;
  let chosenRarity: Rarity = availableRarities[availableRarities.length - 1];
  for (const r of availableRarities) {
    roll -= RARITY_WEIGHTS[r];
    if (roll < 0) {
      chosenRarity = r;
      break;
    }
  }

  const candidates = byRarity[chosenRarity];
  const idx = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[idx];
}

function groupByRarity(pool: Card[]): Record<Rarity, Card[]> {
  const groups = { common: [], rare: [], epic: [], legendary: [] } as Record<
    Rarity,
    Card[]
  >;
  for (const card of pool) groups[card.rarity].push(card);
  return groups;
}

/**
 * Apply a pull to a child + their current entry for the drawn card (BR6/BR8/BR9).
 * Pure: returns the updated child and collection entry; caller persists atomically.
 * Precondition (enforced atomically by the caller): child.pullTokens >= 1.
 */
export function applyPull(
  child: Child,
  card: Card,
  existing: CollectionEntry | undefined,
): { child: Child; entry: CollectionEntry; isDuplicate: boolean } {
  if (child.pullTokens < 1) {
    throw new Error("applyPull: no pull tokens");
  }
  const isDuplicate = existing !== undefined;
  const entry: CollectionEntry = existing
    ? { ...existing, count: existing.count + 1 }
    : { childId: child.id, cardId: card.id, count: 1 };

  return {
    child: { ...child, pullTokens: child.pullTokens - 1 }, // exactly one spent
    entry,
    isDuplicate,
  };
}

/** Grant/adjust tokens; balance never goes negative (BR5/BR7). */
export function grantTokens(child: Child, delta: number): Child {
  const next = Math.max(0, child.pullTokens + delta);
  return { ...child, pullTokens: next };
}

/** Theme progress for a child: distinct owned / total (BR11). */
export function themeProgress(
  entries: CollectionEntry[],
  themeCardIds: string[],
): ThemeProgress & { complete: boolean } {
  const owned = new Set(entries.map((e) => e.cardId));
  const distinctOwned = themeCardIds.filter((id) => owned.has(id)).length;
  const total = themeCardIds.length;
  return {
    themeId: "",
    owned: distinctOwned,
    total,
    complete: total > 0 && distinctOwned === total,
  };
}
