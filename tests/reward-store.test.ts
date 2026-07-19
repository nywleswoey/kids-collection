import { inMemoryRewardStore } from "@/db/stores/reward-store.fake";
import { runRewardStoreContract } from "./contracts/reward-store-contract";

runRewardStoreContract("in-memory fake", () => inMemoryRewardStore());
