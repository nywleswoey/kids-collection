import { pgChildStore } from "@/db/stores/child-store.pg";
import { runChildStoreContract } from "../tests/contracts/child-store-contract";
import { resetAll, seedChildren } from "./db";

// The SAME contract the in-memory fake runs, now against the real pg adapter
// through the neon-http proxy → local Postgres. A child absent from the seed is
// genuinely absent (no row), exercising the null-return paths.
runChildStoreContract(
  "pg adapter",
  async (seed = {}) => {
    await resetAll();
    await seedChildren(seed);
    return pgChildStore;
  },
  { properties: false }, // property fuzzing runs against the fake; pg checks concrete cases
);
