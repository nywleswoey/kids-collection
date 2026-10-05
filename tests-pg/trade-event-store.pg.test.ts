import { pgTradeEventStore } from "@/db/stores/trade-event-store.pg";
import { runTradeEventStoreContract } from "../tests/contracts/trade-event-store-contract";
import { resetAll, seedCards, seedChildren } from "./db";

runTradeEventStoreContract("pg adapter", async () => {
  await resetAll();
  await seedChildren({ a: {}, b: {}, c: {} });
  await seedCards(["x", "y", "x1", "y1", "x2", "y2", "x3", "y3"]);
  return pgTradeEventStore;
});
