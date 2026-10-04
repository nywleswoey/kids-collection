import type { ChildStore } from "./child-store";
import type { CollectionStore } from "./collection-store";
import type { OfferClaimStore } from "./offer-claim-store";

/**
 * In-memory OfferClaimStore — delegates the spend/grant side effects to the
 * SAME ChildStore/CollectionStore fakes the rest of a test observes (mirroring
 * the pg adapter, which spends/grants against the same `children`/
 * `collections` tables it claims against), and keeps its own map for the
 * `easter_egg_claims` bookkeeping. See offer-claim-store.ts for the contract.
 */
export function inMemoryOfferClaimStore(
  children: ChildStore,
  collections: CollectionStore,
): OfferClaimStore {
  const claims = new Map<string, unknown>();

  return {
    async claimOffer(jti, childId, column, cardId, cardJson) {
      const existing = claims.get(jti);
      if (existing !== undefined) return { replayed: true, outcome: existing };

      const newBalance = await children.spendOne(childId, column);
      if (newBalance === null) return { outOfTokens: true };

      const { count } = await collections.grantCard(childId, cardId);
      const outcome = { outOfTokens: false, card: cardJson, isDuplicate: count > 1, newBalance };
      claims.set(jti, outcome);
      return { replayed: false, outcome };
    },
  };
}
