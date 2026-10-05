import { inMemoryTicketGrantStore } from "@/db/stores/ticket-grant-store.fake";
import { runTicketGrantStoreContract } from "./contracts/ticket-grant-store-contract";

runTicketGrantStoreContract("in-memory fake", () => inMemoryTicketGrantStore());
