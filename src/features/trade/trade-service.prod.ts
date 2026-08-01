import "server-only";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgCatalog } from "@/features/pool/catalog.pg";
import { rewardService } from "@/features/rewards/service.prod";
import { profileService } from "@/features/profiles/service.prod";
import { makeTradeService } from "./trade-service";

/** Prod-wired trade service: the factory bound to the pg adapters, once. */
export const tradeService = makeTradeService({
  collections: pgCollectionStore,
  catalog: pgCatalog,
  rewards: rewardService,
  profiles: profileService,
});
