import type { BalanceColumn } from "./child-store";

/**
 * OfferClaimStore — the persistence port behind `claimEasterEgg`'s single-use
 * redemption of a signed easter-egg offer (U6-FR2 overcharge fix). Each signed
 * offer carries a server-generated `jti`; this store makes "spend one `column`
 * and grant one copy of `cardId`" happen AT MOST ONCE per `jti`, mirroring
 * `pull_claims`'/`ClaimStore`'s request-id dedup but for the claim step rather
 * than the roll step — there is no draw here (the card is already chosen), so
 * one `claimOffer` call covers claim+spend+grant (the pg adapter still runs it
 * as two statements internally — see offer-claim-store.pg.ts).
 *
 * Two adapters: `pgOfferClaimStore` (prod) and `inMemoryOfferClaimStore`
 * (tests). Exercised through `pull-service.ts`'s own `claimEasterEgg` tests
 * rather than a standalone contract, since every method here is meaningless
 * outside that orchestration.
 */
export interface OfferClaimStore {
  /**
   * Atomically redeem offer `jti` for `childId`:
   * - If `jti` was already claimed (by this call's own race-losing concurrent
   *   twin, an earlier double-tap, or a retry), nothing is spent or granted —
   *   returns `{ replayed: true, outcome }` with the ORIGINAL stored outcome.
   * - Else, if `column` has no balance to spend, returns `{ outOfTokens: true }`
   *   — nothing touched.
   * - Else, spends one `column`, grants one copy of `cardId`, stores the
   *   resulting outcome keyed by `jti`, and returns `{ replayed: false, outcome }`.
   *
   * `newBalance` inside the returned outcome always reports the child's
   * `pullTokens` balance (unchanged when `column` is `easterEggTickets`) —
   * matching `ChildStore.spendOne`'s existing contract, so the figure shown to
   * the child doesn't change shape depending on which ticket was spent.
   */
  claimOffer(
    jti: string,
    childId: string,
    column: BalanceColumn,
    cardId: string,
    cardJson: unknown,
  ): Promise<{ replayed: boolean; outcome: unknown } | { outOfTokens: true }>;
}
