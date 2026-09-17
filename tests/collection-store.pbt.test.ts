import { inMemoryCollectionStore } from "@/db/stores/collection-store.fake";
import { runCollectionStoreContract } from "./contracts/collection-store-contract";

// The in-memory fake runs the full contract here in Vitest. The pg adapter runs
// the SAME spec against Postgres in Build & Test — see deepening-candidates.md.
runCollectionStoreContract("in-memory fake", (seed) => inMemoryCollectionStore(seed));
