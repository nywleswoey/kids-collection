import { inMemoryProfileStore } from "@/db/stores/profile-store.fake";
import { runProfileStoreContract } from "./contracts/profile-store-contract";

runProfileStoreContract("in-memory fake", (seed) => inMemoryProfileStore(seed));
