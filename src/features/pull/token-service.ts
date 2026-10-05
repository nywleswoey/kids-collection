import type { BalanceColumn, ChildStore } from "@/db/stores/child-store";
import type { TicketGrantStore } from "@/db/stores/ticket-grant-store";

export interface TokenDeps {
  children: ChildStore;
  grants: TicketGrantStore;
}

/**
 * Token/ticket balances (U4), parameterized by the ChildStore port. Parent
 * gating now lives at the action layer; this module only validates the delta and
 * delegates the atomic clamp to the store. Every grant through here also writes
 * a `ticket_grants` row (parent-facing activity log) — the only "tickets given"
 * source this module handles; quiz-awarded tickets are granted directly via
 * `ChildStore.incrementColumn` in quiz-service.ts and stay derived from
 * `quiz_completions.awarded` instead. Prod wiring: `token-service.prod.ts`.
 */
export function makeTokenService({ children, grants }: TokenDeps) {
  /** Clamped grant/adjust of one column; validate the delta, delegate the
   *  `GREATEST(0, …)` to the store, then log the delta actually applied. Shared body of the two
   *  grant entry points — both are admin-only (gated at the action layer). */
  async function grantColumn(
    childId: string,
    key: BalanceColumn,
    delta: number,
    label: string,
    grantedBy: string | null,
  ): Promise<number> {
    if (!Number.isInteger(delta)) throw new Error(`${label}: delta must be an integer`);
    const granted = await children.clampedGrant(childId, key, delta);
    if (granted === null) throw new Error(`${label}: child not found`);
    try {
      await grants.record(childId, key, granted.applied, "admin", grantedBy);
    } catch {
      // best-effort — the grant already committed, so a log failure must not
      // surface as a failed grant (a retry would grant twice)
    }
    return granted.balance;
  }

  /** Current pull-token balance (F2). */
  function getBalance(childId: string): Promise<number> {
    return children.readColumn(childId, "pullTokens");
  }

  /** Current unified Easter Egg ticket balance (Inc19). */
  function getEasterEggBalance(childId: string): Promise<number> {
    return children.readColumn(childId, "easterEggTickets");
  }

  /** Grant/adjust tokens (F1). Balance clamped >= 0 (U4-BR8). `grantedBy` is
   *  the parent's display name/email for the activity log, or null if unknown. */
  function grant(childId: string, delta: number, grantedBy: string | null = null): Promise<number> {
    return grantColumn(childId, "pullTokens", delta, "grant", grantedBy);
  }

  /** Grant/adjust the unified Easter Egg ticket (Inc19 FR6). Clamped >= 0. */
  function grantEasterEgg(
    childId: string,
    delta: number,
    grantedBy: string | null = null,
  ): Promise<number> {
    return grantColumn(childId, "easterEggTickets", delta, "grantEasterEgg", grantedBy);
  }

  return { getBalance, getEasterEggBalance, grant, grantEasterEgg };
}

export type TokenService = ReturnType<typeof makeTokenService>;
