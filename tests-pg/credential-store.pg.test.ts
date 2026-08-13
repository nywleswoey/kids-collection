import { pgAdminCredentialStore } from "@/db/stores/credential-store.pg";
import { runAdminCredentialStoreContract } from "../tests/contracts/credential-store-contract";
import { resetAll } from "./db";

// Same contract as the fake, against the real pg adapter. The contract seeds via
// the store's own create(), so the DB-generated ids are never asserted on.
runAdminCredentialStoreContract("pg adapter", async () => {
  await resetAll();
  return pgAdminCredentialStore;
});
