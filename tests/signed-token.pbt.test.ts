import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { signToken, verifyToken, isSignedPayload, type SignedPayload } from "@/lib/signed-token";

/**
 * Direct coverage of the deep signed-token primitive (previously only exercised
 * indirectly via the offer / gate-token wrappers). Uses the base isSignedPayload
 * guard — the `{ exp }`-only token the admin gate signs.
 */
const secretArb = fc.string({ minLength: 8, maxLength: 40 });
const verify = (t: string | undefined | null, s: string, now: number) =>
  verifyToken<SignedPayload>(t, s, now, isSignedPayload);

describe("signed-token (HMAC sign/verify)", () => {
  it("a freshly signed token verifies before its expiry", async () => {
    await fc.assert(
      fc.asyncProperty(
        secretArb,
        fc.integer({ min: 1_000, max: 10_000_000 }),
        async (secret, ttl) => {
          const now = 1_000_000;
          const token = await signToken({ exp: now + ttl }, secret);
          expect(await verify(token, secret, now)).toEqual({ exp: now + ttl });
        },
      ),
    );
  });

  it("an expired token never verifies", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, fc.integer({ min: 0, max: 5_000 }), async (secret, past) => {
        const exp = 1_000_000;
        const token = await signToken({ exp }, secret);
        expect(await verify(token, secret, exp + past)).toBeNull();
      }),
    );
  });

  it("a token signed with a different secret never verifies", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, secretArb, async (s1, s2) => {
        fc.pre(s1 !== s2);
        const token = await signToken({ exp: 2_000_000 }, s1);
        expect(await verify(token, s2, 1_000_000)).toBeNull();
      }),
    );
  });

  it("a forged token (payload of one, signature of another) never verifies", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, async (secret) => {
        const shortLived = await signToken({ exp: 1_500_000 }, secret);
        const longLived = await signToken({ exp: 9_000_000 }, secret);
        const [payloadLong] = longLived.split(".");
        const [, sigShort] = shortLived.split(".");
        const forged = `${payloadLong}.${sigShort}`;
        expect(await verify(forged, secret, 2_000_000)).toBeNull();
      }),
    );
  });

  it("carries arbitrary payload fields through, guarded by isValid", async () => {
    const token = await signToken({ exp: 2_000_000, childId: "kid", n: 3 }, "secret");
    const guard = (p: unknown): p is SignedPayload & { childId: string } =>
      isSignedPayload(p) && typeof (p as { childId?: unknown }).childId === "string";
    const payload = await verifyToken(token, "secret", 1_000_000, guard);
    expect(payload).toMatchObject({ childId: "kid", n: 3 });
  });

  it("empty / malformed tokens verify null", async () => {
    expect(await verify(undefined, "s", 1)).toBeNull();
    expect(await verify("", "s", 1)).toBeNull();
    expect(await verify("nodot", "s", 1)).toBeNull();
    expect(await verify("a.b", "s", 1)).toBeNull();
  });
});
