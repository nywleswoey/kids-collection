import { inMemoryTradeEventStore } from "@/db/stores/trade-event-store.fake";
import { runTradeEventStoreContract } from "./contracts/trade-event-store-contract";

runTradeEventStoreContract("in-memory fake", () => inMemoryTradeEventStore());
