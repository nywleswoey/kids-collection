import type { BalanceColumn } from "./child-store";
import type { TicketGrantRow } from "@/db/schema";

export type TicketGrantSource = "admin" | "sacrifice";

/**
 * TicketGrantStore — the persistence port for `ticket_grants`, the
 * parent-facing activity log's record of ticket grants that aren't otherwise
 * reconstructable (admin manual grants, sacrifice's payout). Quiz-awarded
 * tickets are NOT recorded here — they stay derived from
 * `quiz_completions.awarded` (see that table's doc comment).
 *
 * Two adapters: `pgTicketGrantStore` (prod) and `inMemoryTicketGrantStore`
 * (tests), kept honest by tests/contracts/ticket-grant-store-contract.ts.
 */
export interface TicketGrantStore {
  /** Append one grant row. `amount` is the signed delta actually applied
   *  (clamping already happened in ChildStore; this just records the ask). */
  record(
    childId: string,
    column: BalanceColumn,
    amount: number,
    source: TicketGrantSource,
    grantedBy: string | null,
  ): Promise<void>;

  /** Most recent grants for one child, newest first. */
  recentForChild(childId: string, limit: number): Promise<TicketGrantRow[]>;
}
