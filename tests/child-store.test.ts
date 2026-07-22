import { inMemoryChildStore } from "@/db/stores/child-store.fake";
import { runChildStoreContract } from "./contracts/child-store-contract";

// The in-memory fake runs the full contract here; the pg adapter runs the SAME
// spec against Postgres in Build & Test. Replaces the old pull.model.test.ts
// mirror — the fake IS the model, and the contract proves it matches Postgres.
runChildStoreContract("in-memory fake", (seed) => inMemoryChildStore(seed));
