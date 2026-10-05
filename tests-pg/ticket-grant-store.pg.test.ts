import { pgTicketGrantStore } from "@/db/stores/ticket-grant-store.pg";
import { runTicketGrantStoreContract } from "../tests/contracts/ticket-grant-store-contract";
import { resetAll, seedChildren } from "./db";

runTicketGrantStoreContract("pg adapter", async () => {
  await resetAll();
  await seedChildren({ kid: {}, other: {} });
  return pgTicketGrantStore;
});
