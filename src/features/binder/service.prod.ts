import "server-only";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgCatalog } from "@/features/pool/catalog.pg";
import { makeBinderService } from "./service";

/** Prod-wired binder service: the factory bound to the pg adapters, once. */
export const binderService = makeBinderService({
  collections: pgCollectionStore,
  catalog: pgCatalog,
});
