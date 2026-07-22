import "server-only";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgRewardStore } from "@/db/stores/reward-store.pg";
import { pgCatalog } from "@/features/pool/catalog.pg";
import { makeRewardService } from "./service";

/** Prod-wired reward service: the factory bound to the pg adapters, once. Also
 *  satisfies RewardGranter, so pull/trade inject it directly. */
export const rewardService = makeRewardService({
  collections: pgCollectionStore,
  rewards: pgRewardStore,
  catalog: pgCatalog,
});
