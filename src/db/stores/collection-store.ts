/**
 * CollectionStore — the persistence port for a child's owned cards
 * (`collections` table). Deep by design: one method per atomic unit of
 * persistence, so no transaction ever crosses the seam. Services accept this
 * port instead of importing the `db` singleton, which makes their orchestration
 * unit-testable against the in-memory fake and keeps the pg adapter the only
 * `server-only` code.
 *
 * Two adapters satisfy it — `pgCollectionStore` (prod) and
 * `inMemoryCollectionStore` (tests) — kept honest by the shared contract suite
 * in tests/contracts/collection-store-contract.ts.
 */

export interface SwapInput {
  aChildId: string;
  aCardId: string;
  bChildId: string;
  bCardId: string;
}

export interface CollectionStore {
  /** Add one copy of a card; returns the new owned count for (child, card). */
  grantCard(childId: string, cardId: string): Promise<{ count: number }>;

  /**
   * Guarded decrement of `count` copies, applied only while the child still
   * holds at least `minHeld` (default `count + 1` — never give away the last
   * copy). Returns the new count, or `null` when the guard fails (no rows
   * changed). Decrementing to exactly 0 deletes the row (0 copies = absence,
   * since `count >= 1` is a CHECK) and returns `{ count: 0 }`.
   */
  removeCard(
    childId: string,
    cardId: string,
    count?: number,
    minHeld?: number,
  ): Promise<{ count: number } | null>;

  /**
   * Two-sided swap: A gives aCard, B gives bCard, each receives the other's.
   * All-or-nothing — either all four writes apply, or none do. Returns `false`
   * when the swap could not commit atomically (a side no longer held a duplicate,
   * or the store errored), leaving state untouched.
   */
  swapCards(input: SwapInput): Promise<boolean>;

  /** Owned count per card id (0 for any not held). */
  ownedCounts(
    childId: string,
    cardIds: string[],
  ): Promise<Record<string, number>>;

  /** Owned count for one (child, card), 0 if absent. */
  cardCount(childId: string, cardId: string): Promise<number>;

  /** The set of card ids the child owns (count >= 1). */
  ownedCardIds(childId: string): Promise<Set<string>>;

  /** Cards the child holds as duplicates (count >= 2), as raw (cardId, count). */
  tradableDuplicates(
    childId: string,
  ): Promise<Array<{ cardId: string; count: number }>>;
}
