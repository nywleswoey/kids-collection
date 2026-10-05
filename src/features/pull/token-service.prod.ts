import "server-only";
import { pgChildStore } from "@/db/stores/child-store.pg";
import { pgTicketGrantStore } from "@/db/stores/ticket-grant-store.pg";
import { makeTokenService } from "./token-service";

/** Prod-wired token service: the factory bound to the pg adapters, once. */
export const tokenService = makeTokenService({
  children: pgChildStore,
  grants: pgTicketGrantStore,
});
