import { inMemoryAdminCredentialStore } from "@/db/stores/credential-store.fake";
import { runAdminCredentialStoreContract } from "./contracts/credential-store-contract";

runAdminCredentialStoreContract("in-memory fake", () => inMemoryAdminCredentialStore());
