import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  CHALLENGE_TTL_MS,
  signChallenge,
  verifyChallenge,
} from "@/features/admin/webauthn/challenge";

const SECRET = "test-secret";
const PARENT = "google-sub-1";
const NOW = 1_700_000_000_000;

describe("passkey challenge token", () => {
  it("round-trips the challenge for the right purpose and parent", async () => {
    const token = await signChallenge("chal-1", "auth", PARENT, SECRET, NOW);
    expect(await verifyChallenge(token, "auth", PARENT, SECRET, NOW + 1)).toBe("chal-1");
  });

  it("refuses a challenge minted for the other purpose", async () => {
    // The property that stops an enrolment challenge being replayed into the
    // unlock ceremony.
    const token = await signChallenge("chal-1", "enrol", PARENT, SECRET, NOW);
    expect(await verifyChallenge(token, "auth", PARENT, SECRET, NOW + 1)).toBeNull();
  });

  it("refuses a challenge minted for a different parent", async () => {
    const token = await signChallenge("chal-1", "auth", PARENT, SECRET, NOW);
    expect(await verifyChallenge(token, "auth", "someone-else", SECRET, NOW + 1)).toBeNull();
  });

  it("expires after the TTL", async () => {
    const token = await signChallenge("chal-1", "auth", PARENT, SECRET, NOW);
    expect(await verifyChallenge(token, "auth", PARENT, SECRET, NOW + CHALLENGE_TTL_MS - 1)).toBe(
      "chal-1",
    );
    expect(
      await verifyChallenge(token, "auth", PARENT, SECRET, NOW + CHALLENGE_TTL_MS + 1),
    ).toBeNull();
  });

  it("refuses a token signed with a different secret", async () => {
    const token = await signChallenge("chal-1", "auth", PARENT, SECRET, NOW);
    expect(await verifyChallenge(token, "auth", PARENT, "other-secret", NOW + 1)).toBeNull();
  });

  it("refuses malformed and absent tokens", async () => {
    for (const bad of [undefined, null, "", "nodot", "a.b", "....."]) {
      expect(await verifyChallenge(bad, "auth", PARENT, SECRET, NOW)).toBeNull();
    }
  });

  it("refuses a tampered payload", async () => {
    const token = await signChallenge("chal-1", "auth", PARENT, SECRET, NOW);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(
      JSON.stringify({ ch: "attacker", pur: "auth", sub: PARENT, exp: NOW + 1000 }),
    ).toString("base64url")}.${sig}`;
    expect(await verifyChallenge(forged, "auth", PARENT, SECRET, NOW + 1)).toBeNull();
  });

  it("property: a token verifies iff purpose, parent and secret all match, and it is unexpired", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom("auth" as const, "enrol" as const),
        fc.constantFrom("auth" as const, "enrol" as const),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 0, max: CHALLENGE_TTL_MS * 2 }),
        async (challenge, minted, checked, parentA, parentB, elapsed) => {
          const token = await signChallenge(challenge, minted, parentA, SECRET, NOW);
          const result = await verifyChallenge(token, checked, parentB, SECRET, NOW + elapsed);

          const shouldPass =
            minted === checked && parentA === parentB && elapsed < CHALLENGE_TTL_MS;
          expect(result).toBe(shouldPass ? challenge : null);
        },
      ),
      { numRuns: 200 },
    );
  });
});
