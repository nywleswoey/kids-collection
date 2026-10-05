import { describe, it, expect } from "vitest";
import { makeTokenService } from "@/features/pull/token-service";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { inMemoryTicketGrantStore } from "@/db/stores/ticket-grant-store.fake";

/** Reachable only because the service now accepts a ChildStore port. */
function setup(seed: ChildSeed) {
  const grants = inMemoryTicketGrantStore();
  return { svc: makeTokenService({ children: inMemoryChildStore(seed), grants }), grants };
}

describe("makeTokenService", () => {
  it("reads normal and Easter Egg balances", async () => {
    const { svc } = setup({ kid: { pullTokens: 4, easterEggTickets: 3 } });
    expect(await svc.getBalance("kid")).toBe(4);
    expect(await svc.getEasterEggBalance("kid")).toBe(3);
  });

  it("grant clamps at 0 and returns the new balance", async () => {
    const { svc } = setup({ kid: { pullTokens: 1 } });
    expect(await svc.grant("kid", 4)).toBe(5);
    expect(await svc.grant("kid", -100)).toBe(0); // clamped, never negative
  });

  it("grantEasterEgg targets the Easter Egg column, clamped at 0", async () => {
    const { svc } = setup({ kid: { pullTokens: 0 } });
    expect(await svc.grantEasterEgg("kid", 3)).toBe(3);
    expect(await svc.grantEasterEgg("kid", -100)).toBe(0); // clamped
    expect(await svc.getBalance("kid")).toBe(0); // untouched
  });

  it("rejects a non-integer delta", async () => {
    const { svc } = setup({ kid: { pullTokens: 1 } });
    await expect(svc.grant("kid", 1.5)).rejects.toThrow("delta must be an integer");
  });

  it("throws when the child does not exist", async () => {
    const { svc } = setup({});
    await expect(svc.grant("ghost", 1)).rejects.toThrow("child not found");
  });

  it("records an admin grant in the activity log (#kcact)", async () => {
    const { svc, grants } = setup({ kid: { pullTokens: 1 } });
    await svc.grant("kid", 4, "parent@example.com");
    const [row] = await grants.recentForChild("kid", 10);
    expect(row).toMatchObject({
      childId: "kid",
      column: "pullTokens",
      amount: 4,
      source: "admin",
      grantedBy: "parent@example.com",
    });
  });

  it("records an Easter Egg grant with no grantedBy as null", async () => {
    const { svc, grants } = setup({ kid: { pullTokens: 0 } });
    await svc.grantEasterEgg("kid", 2);
    const [row] = await grants.recentForChild("kid", 10);
    expect(row).toMatchObject({ column: "easterEggTickets", amount: 2, source: "admin", grantedBy: null });
  });
});
