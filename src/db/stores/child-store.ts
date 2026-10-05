/**
 * Spendable/grantable integer columns on the `children` table (Inc19): the normal
 * pull token and the unified Easter Egg ticket. Shared by token-service (grant),
 * pull-service (spend), and the ChildStore adapters, which drive atomic per-column
 * updates off this string key.
 */
export type BalanceColumn = "pullTokens" | "easterEggTickets";

/**
 * ChildStore — the persistence port for a child's spendable integer columns on
 * the `children` table (normal `pullTokens` and the unified `easterEggTickets`).
 * Deep by design: each method is one atomic column
 * operation, so the compare-and-swap and clamp semantics live behind the seam
 * and can be unit-tested against the in-memory fake.
 *
 * Two adapters: `pgChildStore` (prod) and `inMemoryChildStore` (tests), kept
 * honest by tests/contracts/child-store-contract.ts.
 */
export interface ChildStore {
  /**
   * Atomic guarded −1 of one spendable column (single-use spend/claim): apply
   * only while the column is >= 1. Returns the child's resulting *normal token*
   * balance (`pullTokens`) — spending a ticket column leaves that unchanged — or
   * `null` when the guard failed (nothing spent) or the child is absent.
   */
  spendOne(childId: string, column: BalanceColumn): Promise<number | null>;

  /** Atomic `column += by` (token refund, sacrifice-ticket grant). No-op if the
   *  child is absent. */
  incrementColumn(childId: string, column: BalanceColumn, by: number): Promise<void>;

  /**
   * Parent-facing clamped grant/adjust: apply `GREATEST(0, column + delta)`
   * atomically and return the new `balance` plus the delta actually `applied`
   * (differs from `delta` when the floor kicked in), or `null` if the child is
   * absent. (Caller validates that `delta` is an integer.)
   */
  clampedGrant(
    childId: string,
    column: BalanceColumn,
    delta: number,
  ): Promise<{ balance: number; applied: number } | null>;

  /** Current value of one spendable column, 0 if the child is absent. */
  readColumn(childId: string, column: BalanceColumn): Promise<number>;
}
