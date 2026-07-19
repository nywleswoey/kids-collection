import type { CollectionStore } from "./collection-store";

/** Seed shape: `{ [childId]: { [cardId]: count } }`. */
export type CollectionSeed = Record<string, Record<string, number>>;

/**
 * In-memory CollectionStore — the second adapter that makes the seam real.
 * Emulates the *observable* Postgres contract: the `count >= minHeld` guard on
 * removes, the `count >= 1` invariant (reducing below 1 throws, as the DB CHECK
 * would), and the guarded partial-apply of `swapCards`. Kept honest against the
 * pg adapter by the shared contract suite.
 */
export function inMemoryCollectionStore(seed: CollectionSeed = {}): CollectionStore {
  const state = new Map<string, Map<string, number>>();
  for (const [childId, cards] of Object.entries(seed)) {
    state.set(childId, new Map(Object.entries(cards)));
  }

  const held = (childId: string, cardId: string): number =>
    state.get(childId)?.get(cardId) ?? 0;

  const setCount = (childId: string, cardId: string, n: number): void => {
    if (n < 1) {
      throw new Error("collections count CHECK violation (count >= 1)");
    }
    let row = state.get(childId);
    if (!row) {
      row = new Map();
      state.set(childId, row);
    }
    row.set(cardId, n);
  };

  /** One guarded give: −1 only while held as a duplicate (>= 2), else no-op. */
  const giveOne = (childId: string, cardId: string): void => {
    if (held(childId, cardId) >= 2) setCount(childId, cardId, held(childId, cardId) - 1);
  };

  return {
    async grantCard(childId, cardId) {
      const n = held(childId, cardId) + 1;
      setCount(childId, cardId, n);
      return { count: n };
    },

    async removeCard(childId, cardId, count = 1, minHeld = count + 1) {
      const h = held(childId, cardId);
      if (h < minHeld) return null; // guard fails → no rows changed
      const n = h - count;
      setCount(childId, cardId, n); // throws below 1, matching the DB CHECK
      return { count: n };
    },

    async swapCards({ aChildId, aCardId, bChildId, bCardId }) {
      giveOne(aChildId, aCardId);
      setCount(aChildId, bCardId, held(aChildId, bCardId) + 1);
      giveOne(bChildId, bCardId);
      setCount(bChildId, aCardId, held(bChildId, aCardId) + 1);
      return true;
    },

    async ownedCounts(childId, cardIds) {
      const counts: Record<string, number> = {};
      for (const id of cardIds) counts[id] = held(childId, id);
      return counts;
    },

    async cardCount(childId, cardId) {
      return held(childId, cardId);
    },

    async ownedCardIds(childId) {
      const row = state.get(childId);
      return new Set(row ? row.keys() : []);
    },

    async tradableDuplicates(childId) {
      const row = state.get(childId);
      if (!row) return [];
      const out: Array<{ cardId: string; count: number }> = [];
      for (const [cardId, count] of row) {
        if (count >= 2) out.push({ cardId, count });
      }
      return out;
    },
  };
}
