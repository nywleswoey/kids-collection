import { describe, it, expect } from "vitest";
import { makeTokenService } from "@/features/pull/token-service";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";

/** Reachable only because the service now accepts a ChildStore port. */
function setup(seed: ChildSeed) {
  return makeTokenService({ children: inMemoryChildStore(seed) });
}

describe("makeTokenService", () => {
  it("reads normal and special balances", async () => {
    const svc = setup({ kid: { pullTokens: 4, epicTickets: 2, luckyTickets: 1 } });
    expect(await svc.getBalance("kid")).toBe(4);
    expect(await svc.getSpecialBalances("kid")).toEqual({ epic: 2, lucky: 1 });
  });

  it("grant clamps at 0 and returns the new balance", async () => {
    const svc = setup({ kid: { pullTokens: 1 } });
    expect(await svc.grant("kid", 4)).toBe(5);
    expect(await svc.grant("kid", -100)).toBe(0); // clamped, never negative
  });

  it("grantSpecial and grantPickTicket target the right column", async () => {
    const svc = setup({ kid: { pullTokens: 0 } });
    expect(await svc.grantSpecial("kid", "lucky", 3)).toBe(3);
    expect(await svc.grantPickTicket("kid", "epic", 2)).toBe(2);
    expect(await svc.getBalance("kid")).toBe(0); // untouched
  });

  it("rejects a non-integer delta", async () => {
    const svc = setup({ kid: { pullTokens: 1 } });
    await expect(svc.grant("kid", 1.5)).rejects.toThrow("delta must be an integer");
  });

  it("throws when the child does not exist", async () => {
    const svc = setup({});
    await expect(svc.grant("ghost", 1)).rejects.toThrow("child not found");
  });
});
