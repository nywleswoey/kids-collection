/**
 * ClaimStore — the persistence port behind `pull()`'s request-level
 * idempotency (#kcpi). One row per client-generated pull-request id tracks
 * ownership of the deduct-then-draw sequence so a duplicate request (reload,
 * double-tap, retry-after-stuck) can never spend or grant twice, and a request
 * killed after spending can be recovered on retry.
 *
 * `lease` is an opaque fencing token returned by `claimAndSpend`/
 * `takeOverIfStale` and must be passed back into the `finish*` calls verbatim
 * — adapters use it to refuse a write from a caller whose ownership was later
 * stolen by a stale-recovery takeover, which is what makes the takeover safe
 * against a holder that was merely slow rather than dead.
 *
 * Two adapters: `pgClaimStore` (prod) and `inMemoryClaimStore` (tests). Both
 * are exercised through `pull()`'s own idempotency tests — against the fake
 * in tests/pull-service.test.ts, and against real Postgres (no mocks) in
 * tests-pg/pull-idempotency.pg.test.ts — rather than a standalone contract,
 * since every method here is meaningless outside that orchestration.
 */
export interface ClaimStore {
  /**
   * Atomic claim + spend: insert a "granting" row for `requestId` iff one
   * doesn't exist yet, and spend one `pullTokens` for `childId` in the SAME
   * statement. Returns:
   * - `{ kind: "fresh", lease, newBalance }` — newly claimed and spent.
   * - `{ kind: "out_of_tokens" }` — newly claimed but the spend guard failed
   *   (the claim is left terminal; a later call with this id replays the
   *   same out-of-tokens result rather than re-spending).
   * - `{ kind: "duplicate" }` — this id was already claimed by an earlier
   *   call; nothing was touched. Caller should `read` it.
   */
  claimAndSpend(
    requestId: string,
    childId: string,
  ): Promise<
    | { kind: "fresh"; lease: unknown; newBalance: number }
    | { kind: "out_of_tokens" }
    | { kind: "duplicate" }
  >;

  /** Read an existing claim's resolution: the owning child, whether it has
   *  finished ("done", with the replayable `outcome`) or is still being
   *  granted ("granting"). Null if the row is gone (shouldn't happen once
   *  `claimAndSpend` reports "duplicate", but the caller must not assume it). */
  read(
    requestId: string,
  ): Promise<{ childId: string; status: "granting" | "done"; outcome: unknown } | null>;

  /**
   * Take over an abandoned "granting" claim whose `claimedAt` is older than
   * `staleMs` — i.e. the original holder almost certainly died or was killed
   * before finishing. Bumps the fence (invalidating the old holder's lease)
   * and returns a fresh lease + the balance that was spent originally, so the
   * caller can complete the draw for that same spend. Returns null if the
   * claim is no longer "granting" (already done) or isn't stale yet (still
   * genuinely in flight) — the caller must not retry the draw in that case.
   */
  takeOverIfStale(
    requestId: string,
    staleMs: number,
  ): Promise<{ lease: unknown; spentBalance: number } | null>;

  /**
   * Finish a successful normal-card draw: grant one copy of `cardId` and mark
   * the claim "done", storing `{outOfTokens:false, card: cardJson, isDuplicate,
   * newBalance}` (isDuplicate computed from the grant's resulting count, in
   * the SAME statement, so a crash between grant and mark is impossible).
   * Only applies while `lease` is still the live fence — i.e. no stale
   * takeover raced ahead of this caller. Returns the stored outcome on
   * success, or null if the lease was lost (caller should re-`read` the claim).
   */
  finishWithCardGrant(
    lease: unknown,
    requestId: string,
    childId: string,
    cardId: string,
    cardJson: unknown,
    newBalance: number,
  ): Promise<unknown | null>;

  /**
   * Finish an easter-egg draw: refund one `pullTokens` (the egg mechanic
   * re-spends it at claim time) and mark the claim "done" with the given
   * outcome, atomically. Only applies while `lease` is still live. Returns
   * true on success, false if the lease was lost.
   */
  finishWithRefund(
    lease: unknown,
    requestId: string,
    childId: string,
    outcome: unknown,
  ): Promise<boolean>;

  /**
   * Clean up after an in-process draw failure: refund one `pullTokens` and
   * DELETE the claim row (rather than marking it "done"), so the same request
   * id is free to be retried from scratch — there is nothing to replay for a
   * failed attempt. Only applies while `lease` is still live; a no-op if the
   * lease was lost (the new owner is responsible for the eventual outcome).
   */
  cleanupFailure(lease: unknown, requestId: string, childId: string): Promise<void>;

  /**
   * Refund and close every one of `childId`'s "granting" claims untouched for
   * longer than `staleMs` — attempts no retry will ever come back for — other
   * than `excludeRequestId`, the one the caller is about to resolve itself via
   * the duplicate/takeover path, which can still deliver its card. Each is
   * marked "done" with `{outOfTokens:true}` and its fence bumped in the same
   * write (so a late finish/takeover from its old holder no-ops), and the child
   * gets back exactly one `pullTokens` per claim swept. Returns how many.
   */
  sweepAbandoned(childId: string, staleMs: number, excludeRequestId: string): Promise<number>;
}
