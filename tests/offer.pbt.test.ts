import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeOffer, verifyOffer } from "@/features/pull/offer";

const secretArb = fc.string({ minLength: 8, maxLength: 40 });
const idsArb = fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 5 });

describe("easter-egg offer (U6-FR2, Security)", () => {
  it("a fresh offer round-trips before expiry", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, fc.string({ minLength: 1 }), idsArb, async (secret, childId, cardIds) => {
        const now = 1_000_000;
        const token = await makeOffer({ childId, cardIds, exp: now + 60_000 }, secret);
        const p = await verifyOffer(token, secret, now);
        expect(p).not.toBeNull();
        expect(p!.childId).toBe(childId);
        expect(p!.cardIds).toEqual(cardIds);
      }),
    );
  });

  it("an expired offer verifies null", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, async (secret) => {
        const token = await makeOffer({ childId: "k", cardIds: ["a"], exp: 1000 }, secret);
        expect(await verifyOffer(token, secret, 2000)).toBeNull();
      }),
    );
  });

  it("wrong secret verifies null", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, secretArb, async (s1, s2) => {
        fc.pre(s1 !== s2);
        const token = await makeOffer({ childId: "k", cardIds: ["a"], exp: 9_000_000 }, s1);
        expect(await verifyOffer(token, s2, 1_000_000)).toBeNull();
      }),
    );
  });

  it("a forged payload (kept signature) verifies null", async () => {
    await fc.assert(
      fc.asyncProperty(secretArb, async (secret) => {
        const token = await makeOffer({ childId: "k", cardIds: ["a"], exp: 9_000_000 }, secret);
        const [, sig] = token.split(".");
        // Swap in a different payload but keep the old signature.
        const forgedPayload = btoa(JSON.stringify({ childId: "k", cardIds: ["HACK"], exp: 9_000_000 }))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        expect(await verifyOffer(`${forgedPayload}.${sig}`, secret, 1_000_000)).toBeNull();
      }),
    );
  });

  it("malformed tokens verify null", async () => {
    expect(await verifyOffer(undefined, "s", 1)).toBeNull();
    expect(await verifyOffer("", "s", 1)).toBeNull();
    expect(await verifyOffer("nodot", "s", 1)).toBeNull();
  });
});
