import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeToken, verifyToken } from "@/features/admin/gate-token";

const secretArb = fc.string({ minLength: 8, maxLength: 40 });

describe("admin gate token (U4-FR1)", () => {
  it("a freshly signed token verifies before its expiry", async () => {
    await fc.assert(
      fc.asyncProperty(
        secretArb,
        fc.integer({ min: 1_000, max: 10_000_000 }),
        async (secret, ttl) => {
          const now = 1_000_000;
          const token = await makeToken(now + ttl, secret);
          expect(await verifyToken(token, secret, now)).toBe(true);
        },
      ),
    );
  });

  it("an expired token never verifies", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, fc.integer({ min: 0, max: 5_000 }), async (secret, past) => {
        const exp = 1_000_000;
        const token = await makeToken(exp, secret);
        expect(await verifyToken(token, secret, exp + past)).toBe(false);
      }),
    );
  });

  it("a token signed with a different secret never verifies", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, secretArb, async (s1, s2) => {
        fc.pre(s1 !== s2);
        const token = await makeToken(2_000_000, s1);
        expect(await verifyToken(token, s2, 1_000_000)).toBe(false);
      }),
    );
  });

  it("a forged token (payload of one, signature of another) never verifies", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, async (secret) => {
        // Extend the expiry but keep the old signature → must fail.
        const shortLived = await makeToken(1_500_000, secret);
        const longLived = await makeToken(9_000_000, secret);
        const [payloadLong] = longLived.split(".");
        const [, sigShort] = shortLived.split(".");
        const forged = `${payloadLong}.${sigShort}`;
        expect(await verifyToken(forged, secret, 2_000_000)).toBe(false);
      }),
    );
  });

  it("empty / malformed tokens verify false", async () => {
    expect(await verifyToken(undefined, "s", 1)).toBe(false);
    expect(await verifyToken("", "s", 1)).toBe(false);
    expect(await verifyToken("nodot", "s", 1)).toBe(false);
    expect(await verifyToken("a.b", "s", 1)).toBe(false);
  });
});
