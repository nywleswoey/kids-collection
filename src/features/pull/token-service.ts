import type { ChildStore } from "@/db/stores/child-store";
import { pickTicketColumn, specialTicketColumn, type BalanceColumn } from "./pick-tickets";
import type { EggTicket, Rarity } from "@/lib/types";

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

  /** Current special egg-ticket balances (Inc9 FR4). */
  async function getSpecialBalances(
    childId: string,
  ): Promise<{ epic: number; lucky: number }> {
    const [epic, lucky] = await Promise.all([
      children.readColumn(childId, "epicTickets"),
      children.readColumn(childId, "luckyTickets"),
    ]);
    return { epic, lucky };
  }

  /** Grant/adjust tokens (F1). Balance clamped >= 0 (U4-BR8). */
  function grant(childId: string, delta: number): Promise<number> {
    return grantColumn(childId, "pullTokens", delta, "grant");
  }

  /** Grant/adjust a special egg ticket (Inc9 FR4). Clamped >= 0. */
  function grantSpecial(childId: string, kind: EggTicket, delta: number): Promise<number> {
    return grantColumn(childId, specialTicketColumn(kind), delta, "grantSpecial");
  }

  /** Grant/adjust a rarity-pick ticket (Inc16 FR3). Clamped >= 0. */
  function grantPickTicket(childId: string, rarity: Rarity, delta: number): Promise<number> {
    return grantColumn(childId, pickTicketColumn(rarity), delta, "grantPickTicket");
  }

  return { getBalance, getSpecialBalances, grant, grantSpecial, grantPickTicket };
}

export type TokenService = ReturnType<typeof makeTokenService>;
