/**
 * Pure core of `pnpm reconcile` — detects completed rarity-set rewards
 * (`collection_rewards`) whose set the child no longer fully owns. Extracted
 * so this detection logic can be property-tested without a database; see
 * scripts/reconcile/index.ts for why the signal exists and its one honest
 * caveat (a legitimate sacrifice looks identical to a lost-card bug).
 */
import { isRaritySetComplete } from "@/features/rewards/collection-reward";
import type { Card, Rarity } from "@/lib/types";

export interface RewardRow {
  childId: string;
  themeId: string;
  rarity: Rarity;
}

export interface BrokenSet {
  childId: string;
  childName: string;
  themeId: string;
  themeName: string;
  rarity: Rarity;
  missing: { id: string; name: string }[];
}

export function findBrokenSets(input: {
  pool: Card[];
  rewardRows: RewardRow[];
  ownedByChild: Map<string, Set<string>>;
  themeName: Map<string, string>;
  childName: Map<string, string>;
}): BrokenSet[] {
  const { pool, rewardRows, ownedByChild, themeName, childName } = input;
  const broken: BrokenSet[] = [];
  for (const rw of rewardRows) {
    const owned = ownedByChild.get(rw.childId) ?? new Set<string>();
    if (isRaritySetComplete(pool, rw.themeId, rw.rarity, owned)) continue; // intact
    const missing = pool
      .filter((c) => c.themeId === rw.themeId && c.rarity === rw.rarity && !owned.has(c.id))
      .map((c) => ({ id: c.id, name: c.name }));
    if (missing.length === 0) continue; // set became empty (cards pruned) — not a loss
    broken.push({
      childId: rw.childId,
      childName: childName.get(rw.childId) ?? rw.childId,
      themeId: rw.themeId,
      themeName: themeName.get(rw.themeId) ?? rw.themeId,
      rarity: rw.rarity,
      missing,
    });
  }
  return broken;
}
