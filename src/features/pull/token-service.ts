import type { ChildStore } from "@/db/stores/child-store";
import type { BalanceColumn } from "./pick-tickets";

export interface TokenDeps {
  children: ChildStore;
}

/**
 * Token/ticket balances (U4), parameterized by the ChildStore port. Parent
 * gating now lives at the action layer; this module only validates the delta and
 * delegates the atomic clamp to the store. Prod wiring: `token-service.prod.ts`.
 */
export function makeTokenService({ children }: TokenDeps) {
  /** Clamped grant/adjust of one column; validate the delta, delegate the
   *  `GREATEST(0, …)` to the store. Shared body of the three grant entry points. */
  async function grantColumn(
    childId: string,
    key: BalanceColumn,
    delta: number,
    label: string,
  ): Promise<number> {
    if (!Number.isInteger(delta)) throw new Error(`${label}: delta must be an integer`);
    const balance = await children.clampedGrant(childId, key, delta);
    if (balance === null) throw new Error(`${label}: child not found`);
    return balance;
  }

  /** Current pull-token balance (F2). */
  function getBalance(childId: string): Promise<number> {
    return children.readColumn(childId, "pullTokens");
  }

  /** Current unified Easter Egg ticket balance (Inc19). */
  function getEasterEggBalance(childId: string): Promise<number> {
    return children.readColumn(childId, "easterEggTickets");
  }

  /** Grant/adjust tokens (F1). Balance clamped >= 0 (U4-BR8). */
  function grant(childId: string, delta: number): Promise<number> {
    return grantColumn(childId, "pullTokens", delta, "grant");
  }

  /** Grant/adjust the unified Easter Egg ticket (Inc19 FR6). Clamped >= 0. */
  function grantEasterEgg(childId: string, delta: number): Promise<number> {
    return grantColumn(childId, "easterEggTickets", delta, "grantEasterEgg");
  }

  return { getBalance, getEasterEggBalance, grant, grantEasterEgg };
}

export type TokenService = ReturnType<typeof makeTokenService>;
