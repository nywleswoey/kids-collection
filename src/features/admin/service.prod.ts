import "server-only";
import { pgProfileStore } from "@/db/stores/profile-store.pg";
import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { pgCatalog } from "@/shared/pool/catalog.pg";
import { makeAdminService } from "./service";

/** Prod-wired admin service: the factory bound to the pg adapters, once. */
export const adminService = makeAdminService({
  profiles: pgProfileStore,
  collections: pgCollectionStore,
  catalog: pgCatalog,
});
