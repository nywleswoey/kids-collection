import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeToken, verifyGateToken } from "@/features/admin/gate-token";

/**
 * Smoke coverage for the gate-token wrapper (the `{ exp }`-only adapter over
 * signed-token). The full sign/verify guarantees are proven in
 * signed-token.pbt.test.ts; here we just confirm the wrapper round-trips.
 */
const secretArb = fc.string({ minLength: 8, maxLength: 40 });

describe("admin gate token (U4-FR1)", () => {
  it("a freshly signed token verifies before its expiry, and not after", async () => {
    await fc.assert(
      fc.asyncProperty(
        secretArb,
        fc.integer({ min: 1_000, max: 10_000_000 }),
        async (secret, ttl) => {
          const now = 1_000_000;
          const token = await makeToken(now + ttl, secret);
          expect(await verifyGateToken(token, secret, now)).toBe(true);
          expect(await verifyGateToken(token, secret, now + ttl)).toBe(false); // expired
        },
      ),
    );
  });

  it("empty / malformed tokens verify false", async () => {
    expect(await verifyGateToken(undefined, "s", 1)).toBe(false);
    expect(await verifyGateToken("", "s", 1)).toBe(false);
    expect(await verifyGateToken("a.b", "s", 1)).toBe(false);
  });
});
