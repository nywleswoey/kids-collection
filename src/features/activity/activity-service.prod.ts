import "server-only";
import { pgClaimStore } from "@/db/stores/claim-store.pg";
import { pgOfferClaimStore } from "@/db/stores/offer-claim-store.pg";
import { pgRewardStore } from "@/db/stores/reward-store.pg";
import { pgQuizStore } from "@/db/stores/quiz-store.pg";
import { pgTicketGrantStore } from "@/db/stores/ticket-grant-store.pg";
import { pgTradeEventStore } from "@/db/stores/trade-event-store.pg";
import { pgCatalog } from "@/shared/pool/catalog.pg";
import { profileService } from "@/features/profiles/service.prod";
import { makeActivityService } from "./activity-service";

/** Prod-wired activity service: the factory bound to the pg adapters, once. */
export const activityService = makeActivityService({
  claims: pgClaimStore,
  offerClaims: pgOfferClaimStore,
  rewards: pgRewardStore,
  quiz: pgQuizStore,
  grants: pgTicketGrantStore,
  trades: pgTradeEventStore,
  catalog: pgCatalog,
  profiles: profileService,
});
