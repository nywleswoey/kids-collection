import "server-only";
import { pgChildStore } from "@/db/stores/child-store.pg";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgCatalog } from "@/features/pool/catalog.pg";
import { rewardService } from "@/features/rewards/service.prod";
import { makePullService } from "./pull-service";

/** Prod-wired pull service: the factory bound to the pg adapters, once. */
export const pullService = makePullService({
  children: pgChildStore,
  collections: pgCollectionStore,
  catalog: pgCatalog,
  rewards: rewardService,
});
