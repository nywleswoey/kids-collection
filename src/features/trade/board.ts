import { RARITIES, type Card } from "@/lib/types";
import { SACRIFICE_MIN } from "@/features/pull/sacrifice";
import type { TradableCard } from "./trade-logic";

/**
 * Friend-first trade board logic (Inc22 FR2/FR4/FR5/FR6/FR7). PURE — no I/O, so
 * every rule the child sees on the board is property-testable and can't drift
 * from what `validateTrade` will allow at commit time.
 */

/**
 * What the swap is worth to whoever RECEIVES this card (#109). Ranked, and
 * mutually exclusive by construction: a receiver holding none can't also hold
 * SACRIFICE_MIN - 1.
 *
 * - `new`      — the receiver owns none of it.
 * - `one-away` — one more copy makes it burnable on the receiver's shelf.
 * - `rest`     — they already have it, and this doesn't unlock anything.
 *
 * Deliberately about the RECEIVER only. Giving away a card you hold
 * SACRIFICE_MIN times costs you a burn, and the board says nothing about that
 * — ruled out of scope on the map: that's a hazard on the giver's tile, not an
 * ordering.
 */
export type SwapTier = "new" | "one-away" | "rest";

const TIER_RANK: Record<SwapTier, number> = { new: 0, "one-away": 1, rest: 2 };

/**
 * One more copy takes this holding to SACRIFICE_MIN, the constant every surface
 * that offers or advertises a sacrifice gates on (Inc22 D4). Written as
 * "one below the minimum" rather than a literal 3 so the PREDICATE can never
 * drift from `sacrifice-filter.ts`'s `canSacrifice`.
 *
 * Its DETECTABILITY is a separate matter, and does not follow the constant:
 * see `buildColumns` on where the receiver's count comes from.
 */
export function oneAwayFromBurn(count: number): boolean {
  return count + 1 === SACRIFICE_MIN;
}

export interface BoardCard {
  card: Card;
  count: number;
  /** What this swap is worth to the party on the OTHER side of the board. */
  tier: SwapTier;
  /**
   * True when the OTHER party doesn't own this card at all. Drives the badge
   * (FR4) and the "only show what's missing" filter (FR5). Deliberately about
   * ownership, not duplicates: what matters is whether the swap gives them
   * something genuinely new.
   */
  newToOther: boolean;
}

/**
 * Tag both inventories against the opposite party's ownership set, and order
 * each column by what the swap is worth to the party who'd RECEIVE it (#109).
 *
 * Both columns are built here, mirrored, so the sort can never be applied to
 * one side and forgotten on the other. The tier-2 test needs the receiver's
 * COUNT, not just their ownership — and it's already here: a holding of
 * SACRIFICE_MIN - 1 is a duplicate, so it's in the opposite inventory with its
 * count. Nothing has to be added to `getTradeBoard`'s payload, and no child
 * learns anything new about a friend's shelf.
 *
 * That last step is why the tier is only OBSERVABLE while SACRIFICE_MIN - 1 is
 * at least 2. The opposite inventory is `tradableDuplicates` — count >= 2 —
 * so a receiver holding fewer copies than that never reaches the board with a
 * count at all, and `tag` reads them as "rest". At SACRIFICE_MIN = 4 the
 * one-away holding is 3 and lands in the list; lower SACRIFICE_COST far enough
 * and the tier stops firing everywhere, silently, with the predicate still
 * correct and the property tests still green — they draw their expectation
 * from the same duplicates-only inventory. Widen the payload before lowering
 * the constant.
 */
export function buildColumns(input: {
  mine: TradableCard[];
  theirs: TradableCard[];
  myOwnedIds: ReadonlySet<string>;
  theirOwnedIds: ReadonlySet<string>;
}): { mine: BoardCard[]; theirs: BoardCard[] } {
  const { mine, theirs, myOwnedIds, theirOwnedIds } = input;
  const myCounts = countsById(mine);
  const theirCounts = countsById(theirs);
  return {
    mine: orderByValue(mine.map((t) => tag(t, theirOwnedIds, theirCounts))),
    theirs: orderByValue(theirs.map((t) => tag(t, myOwnedIds, myCounts))),
  };
}

function countsById(cards: TradableCard[]): ReadonlyMap<string, number> {
  return new Map(cards.map((t) => [t.card.id, t.count]));
}

function tag(
  t: TradableCard,
  otherOwnedIds: ReadonlySet<string>,
  otherCounts: ReadonlyMap<string, number>,
): BoardCard {
  const newToOther = !otherOwnedIds.has(t.card.id);
  const theirCount = otherCounts.get(t.card.id);
  const tier: SwapTier = newToOther
    ? "new"
    : theirCount !== undefined && oneAwayFromBurn(theirCount)
      ? "one-away"
      : "rest";
  return { card: t.card, count: t.count, newToOther, tier };
}

/**
 * Best swap first: tier, then rarest, then card id. A TOTAL order — ties broken
 * all the way down to the id — because a partial one lets tiles reshuffle
 * between renders under a child's thumb. Rarity ahead of id also clusters
 * same-rarity cards, which is what the rarity lock narrows to once a side is
 * picked.
 */
export function orderByValue(cards: BoardCard[]): BoardCard[] {
  return [...cards].sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      RARITIES.indexOf(b.card.rarity) - RARITIES.indexOf(a.card.rarity) ||
      (a.card.id < b.card.id ? -1 : a.card.id > b.card.id ? 1 : 0),
  );
}

/** FR5 — hide the cards the other party already has. `false` is the identity. */
export function applyMissingFilter(cards: BoardCard[], onlyMissing: boolean): BoardCard[] {
  return onlyMissing ? cards.filter((c) => c.newToOther) : cards;
}

/** FR7 — how many of `mine` the given ownership set lacks. Drives the friend chips. */
export function missingCount(
  mine: TradableCard[],
  otherOwnedIds: ReadonlySet<string>,
): number {
  let n = 0;
  for (const t of mine) if (!otherOwnedIds.has(t.card.id)) n += 1;
  return n;
}

/**
 * FR6 — a card is pickable while the other side is still empty, or when the
 * rarities match. Mirrors `validateTrade`'s rarity clause so the board can never
 * offer a pick the server would reject; the server remains the authority.
 */
export function isPickable(card: Card, otherPick: Card | null): boolean {
  return otherPick === null || card.rarity === otherPick.rarity;
}
