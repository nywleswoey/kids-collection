import { pgQuizStore } from "@/db/stores/quiz-store.pg";
import { runQuizStoreContract } from "../tests/contracts/quiz-store-contract";
import { resetAll, seedChildren, seedQuizCompletions } from "./db";

// Same contract as the fake, against the real pg adapter. Children referenced by
// seeded AND recorded completions must exist (quiz_completions FK), so create the
// contract's fixed set regardless of seed.
runQuizStoreContract("pg adapter", async (seed = []) => {
  await resetAll();
  await seedChildren({ kid: {}, other: {} });
  await seedQuizCompletions(seed);
  return pgQuizStore;
});
