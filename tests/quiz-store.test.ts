import { inMemoryQuizStore } from "@/db/stores/quiz-store.fake";
import { runQuizStoreContract } from "./contracts/quiz-store-contract";

runQuizStoreContract("in-memory fake", (seed) => inMemoryQuizStore(seed));
