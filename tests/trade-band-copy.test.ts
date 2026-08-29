import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ME, bandCopy, type Receiver } from "@/features/trade/band-copy";
import type { SwapTier } from "@/features/trade/board";

const ANA: Receiver = { kind: "friend", name: "Ana" };
/** A friend whose name is the word the second-person copy uses. */
const FRIEND_CALLED_YOU: Receiver = { kind: "friend", name: "You" };

const TIERS: SwapTier[] = ["new", "one-away", "rest"];

describe("bandCopy (#110 — the sentence a band says)", () => {
  it("says exactly what the board says today", () => {
    expect(bandCopy("new", ANA).heading).toBe("🎁 New for Ana");
    expect(bandCopy("new", ME).heading).toBe("🆕 New for you");
    expect(bandCopy("one-away", ANA).heading).toBe("🔥 One more and Ana can burn it");
    expect(bandCopy("one-away", ME).heading).toBe("🔥 One more and you can burn it");
    expect(bandCopy("rest", ANA).heading).toBe("Ana already has these");
    expect(bandCopy("rest", ME).heading).toBe("You already have these");

    expect(bandCopy("new", ANA).phrase).toBe("new for Ana");
    expect(bandCopy("new", ME).phrase).toBe("new for you");
    expect(bandCopy("one-away", ANA).phrase).toBe("one more and Ana can burn it");
    expect(bandCopy("one-away", ME).phrase).toBe("one more and you can burn it");
    expect(bandCopy("rest", ANA).phrase).toBe("Ana already has this");
    expect(bandCopy("rest", ME).phrase).toBe("you already have this");
  });

  it("heading and tile phrase are the same sentence, so they can't drift", () => {
    // The heading is seen and the phrase is heard; a reader and a listener must
    // not be told different things about the same band.
    fc.assert(
      fc.property(fc.constantFrom(...TIERS), fc.string({ minLength: 1 }), (tier, name) => {
        for (const receiver of [{ kind: "friend", name } as Receiver, ME]) {
          const { heading, phrase } = bandCopy(tier, receiver);
          expect(phrase).not.toBe("");
          // The heading counts a band and the phrase names one card, so `rest`
          // differs by its number alone — every other tier is the same words.
          const singular = heading.toLowerCase().replace(/these$/, "this");
          expect(singular.endsWith(phrase.toLowerCase())).toBe(true);
        }
      }),
    );
  });

  it("picks the person by the discriminant, not by the receiver's name", () => {
    // A friend literally called "You" is still a third party. Deciding person by
    // comparing the name against "you" would flip this column into the child's
    // own voice and tell them the friend's shelf is theirs.
    for (const tier of TIERS) {
      expect(bandCopy(tier, FRIEND_CALLED_YOU)).not.toEqual(bandCopy(tier, ME));
    }
    expect(bandCopy("rest", FRIEND_CALLED_YOU).heading).toBe("You already has these");
    expect(bandCopy("rest", ME).heading).toBe("You already have these");
    expect(bandCopy("new", FRIEND_CALLED_YOU).heading).toBe("🎁 New for You");
    expect(bandCopy("new", ME).heading).toBe("🆕 New for you");
  });

  it("the receiver's own column always speaks in the second person", () => {
    for (const tier of TIERS) {
      const { heading, phrase } = bandCopy(tier, ME);
      expect(`${heading} ${phrase}`.toLowerCase()).toContain("you");
    }
  });

  it("a friend's band always names that friend, whatever they are called", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        for (const tier of TIERS) {
          const { heading } = bandCopy(tier, { kind: "friend", name });
          expect(heading).toContain(name);
        }
      }),
    );
  });

  it("never leaves a band without a heading", () => {
    fc.assert(
      fc.property(fc.constantFrom(...TIERS), fc.string({ minLength: 1 }), (tier, name) => {
        for (const receiver of [{ kind: "friend", name } as Receiver, ME]) {
          expect(bandCopy(tier, receiver).heading.trim().length).toBeGreaterThan(0);
        }
      }),
    );
  });
});
