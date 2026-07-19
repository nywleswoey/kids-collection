import { pgRewardStore } from "@/db/stores/reward-store.pg";
import { runRewardStoreContract } from "../tests/contracts/reward-store-contract";
import { resetAll, seedCards, seedChildren, seedThemes } from "./db";

// Same contract as the fake, against the real pg adapter — including the
// insert-first onConflictDoNothing claim over the neon-http proxy. Children,
// themes, and cards must exist (collection_rewards FKs).
runRewardStoreContract("pg adapter", async () => {
  await resetAll();
  await seedChildren({ kid: {}, other: {} });
  await seedThemes(["th", "th2"]);
  await seedCards(["c1", "c2", "c3", "c4"]);
  return pgRewardStore;
});
