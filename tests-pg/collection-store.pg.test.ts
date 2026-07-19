import { pgCollectionStore } from "@/db/stores/collection-store.pg";
import { runCollectionStoreContract } from "../tests/contracts/collection-store-contract";
import { resetAll, seedCards, seedChildren, seedCollections } from "./db";

// The SAME contract the in-memory fake runs, now against the real pg adapter —
// including swapCards' guarded `db.batch` over the neon-http proxy. Every card id
// the contract touches must exist (collections FK); children are the seed keys.
const CONTRACT_CARDS = ["a", "b", "c", "x", "y"];

runCollectionStoreContract(
  "pg adapter",
  async (seed = {}) => {
    await resetAll();
    await seedCards(CONTRACT_CARDS);
    await seedChildren(Object.fromEntries(Object.keys(seed).map((id) => [id, {}])));
    await seedCollections(seed);
    return pgCollectionStore;
  },
  { properties: false },
);
