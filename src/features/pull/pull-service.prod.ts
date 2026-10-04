import "server-only";
import { pgChildStore } from "@/db/stores/child-store.pg";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgClaimStore } from "@/db/stores/claim-store.pg";
import { pgCatalog } from "@/shared/pool/catalog.pg";
import { rewardService } from "@/features/rewards/service.prod";
import { makePullService } from "./pull-service";

/** Prod-wired pull service: the factory bound to the pg adapters, once. */
export const pullService = makePullService({
  children: pgChildStore,
  collections: pgCollectionStore,
  catalog: pgCatalog,
  rewards: rewardService,
  claims: pgClaimStore,
});

/**
 * Start `pull()`'s own catalog/owned-ids reads early, against the SAME pg
 * adapters it's bound to above — see `pull()`'s doc for why a caller (just
 * `pullAction`) does this concurrently with the active-child gate check
 * instead of waiting for it first.
 */
export function prefetchPullReads(childId: string, themeId: string | undefined) {
  return { pool: pgCatalog.listCards(themeId), owned: pgCollectionStore.ownedCardIds(childId) };
}
