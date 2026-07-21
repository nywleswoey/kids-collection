import { pgProfileStore } from "@/db/stores/profile-store.pg";
import { runProfileStoreContract } from "../tests/contracts/profile-store-contract";
import { resetAll } from "./db";

// Same contract as the fake, against the real pg adapter. Seed via the store's
// own create() — ids are DB-generated; the contract never asserts a specific id.
runProfileStoreContract("pg adapter", async (seed = []) => {
  await resetAll();
  for (const r of seed) await pgProfileStore.create({ name: r.name, avatar: r.avatar });
  return pgProfileStore;
});
