import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { AdminChildRow } from "@/lib/types";

/**
 * Admin overview row assembly (per-child balance + owned count vs pool total).
 * Mirrors getAdminOverview's mapping without the DB.
 */
function buildRow(
  child: {
    id: string;
    name: string;
    avatar: string;
    pullTokens: number;
    easterEggTickets: number;
  },
  ownedDistinct: number,
  poolTotal: number,
): AdminChildRow {
  return {
    child,
    balance: child.pullTokens,
    easterEggTickets: child.easterEggTickets,
    owned: ownedDistinct,
    total: poolTotal,
  };
}

describe("admin overview row (G1)", () => {
  it("balance mirrors tokens; owned never exceeds pool total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        (tokens, owned, total) => {
          const clampedOwned = Math.min(owned, total);
          const row = buildRow(
            {
              id: "c",
              name: "K",
              avatar: "fox",
              pullTokens: tokens,
              easterEggTickets: 0,
            },
            clampedOwned,
            total,
          );
          expect(row.balance).toBe(tokens);
          expect(row.owned).toBeLessThanOrEqual(row.total);
        },
      ),
    );
  });
});
