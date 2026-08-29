import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseSeed } from "@/features/pool/loader";
import { CARDS_PER_THEME, RARITY_PYRAMID } from "@/features/pool/seed-schema";
import { RARITIES, type Rarity } from "@/lib/types";

/**
 * The seed file's authoring rules (Inc24 FR2–FR5), property-tested — closes
 * OQ-VT-J1.
 *
 * The parent technical environment makes property-based tests REQUIRED and
 * BLOCKING for "every invariant that protects the children's data". Breaking the
 * 15/8/5/2 pyramid makes a (theme, rarity) set-completion reward permanently
 * unreachable, denying a child a bonus card they would otherwise earn — squarely
 * inside that definition.
 *
 * Asserted through `parseSeed`, the gate that actually runs on every seed command,
 * rather than against a separately-exported predicate: a test that agrees with a
 * helper while the real gate disagrees would prove nothing.
 *
 * Both directions are asserted. A one-directional property ("valid files are
 * accepted") is satisfied by a schema that accepts everything; its mirror ("invalid
 * files are rejected") is satisfied by one that accepts nothing.
 */

type Card = {
  name: string;
  rarity: string;
  eduText: string;
  imagePrompt: string;
  sourceUrl: string;
};
type Theme = { name: string; coverPrompt: string; cards: Card[] };
type File = { themes: Theme[] };

const clone = (f: File): File => JSON.parse(JSON.stringify(f)) as File;

/** The exact multiset of rarities every theme must hold. */
const PYRAMID: Rarity[] = RARITIES.flatMap((r) =>
  Array.from({ length: RARITY_PYRAMID[r] }, () => r),
);

/** 1..120 chars — the whole legal range for eduText (FR5). */
const eduTextArb = fc.integer({ min: 1, max: 120 }).map((n) => "f".repeat(n));

/**
 * A theme that satisfies every rule: 30 cards, the exact pyramid in a shuffled
 * order, and names made unique by the theme index so a multi-theme file is
 * globally unique by construction.
 */
const themeArb = (i: number) =>
  fc
    .tuple(
      fc.shuffledSubarray(PYRAMID, {
        minLength: CARDS_PER_THEME,
        maxLength: CARDS_PER_THEME,
      }),
      fc.array(eduTextArb, {
        minLength: CARDS_PER_THEME,
        maxLength: CARDS_PER_THEME,
      }),
    )
    .map(([rarities, texts]) => ({
      name: `Theme ${i}`,
      // Required since #122 — a theme with no cover prompt is not a valid theme,
      // because the picker has no landmark to draw its tile with.
      coverPrompt: `a wide open place ${i}`,
      cards: rarities.map((rarity, j) => ({
        name: `t${i}c${j}`,
        rarity: rarity as string,
        eduText: texts[j],
        imagePrompt: `subject ${i}-${j}`,
        sourceUrl: `https://example.com/${i}/${j}`,
      })),
    }));

const seedFileArb = (min = 1, max = 3) =>
  fc
    .integer({ min, max })
    .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => themeArb(i))))
    .map((themes) => ({ themes: themes as Theme[] }));

/** Index of some theme / some card inside a generated file. */
const pickArb = fc.nat({ max: 0xffff });
const pick = (n: number, len: number) => n % len;

describe("seed schema — accepted (FR2–FR5)", () => {
  it("accepts any file with 30 cards, the 15/8/5/2 pyramid, unique names and eduText <= 120", () => {
    fc.assert(
      fc.property(seedFileArb(), (file) => {
        expect(() => parseSeed(file)).not.toThrow();
      }),
    );
  });

  it("accepts eduText at exactly the 120-char boundary", () => {
    fc.assert(
      fc.property(seedFileArb(1, 1), pickArb, (file, p) => {
        const cards = file.themes[0].cards;
        cards[pick(p, cards.length)].eduText = "f".repeat(120);
        expect(() => parseSeed(file)).not.toThrow();
      }),
    );
  });
});

describe("seed schema — rejected: exactly one invariant broken", () => {
  it("FR2 — rejects a theme with 29 cards", () => {
    fc.assert(
      fc.property(seedFileArb(), pickArb, (valid, p) => {
        const file = clone(valid);
        file.themes[pick(p, file.themes.length)].cards.pop();
        expect(() => parseSeed(file)).toThrow();
      }),
    );
  });

  it("FR2 — rejects a theme with 31 cards", () => {
    fc.assert(
      fc.property(seedFileArb(), pickArb, (valid, p) => {
        const file = clone(valid);
        const t = pick(p, file.themes.length);
        file.themes[t].cards.push({
          name: `extra-${t}`,
          rarity: "common",
          eduText: "an extra card",
          imagePrompt: "extra",
          sourceUrl: "https://example.com/extra",
        });
        expect(() => parseSeed(file)).toThrow();
      }),
    );
  });

  it("FR3 — rejects a broken pyramid (one card's rarity flipped)", () => {
    fc.assert(
      fc.property(
        seedFileArb(),
        pickArb,
        pickArb,
        fc.constantFrom(...RARITIES),
        (valid, tp, cp, to) => {
          const file = clone(valid);
          const theme = file.themes[pick(tp, file.themes.length)];
          const card = theme.cards[pick(cp, theme.cards.length)];
          fc.pre(card.rarity !== to); // a flip to the same tier changes nothing
          card.rarity = to;
          // Count stays 30; exactly one tier is now over and one under.
          expect(() => parseSeed(file)).toThrow();
        },
      ),
    );
  });

  it("FR4 — rejects a card name reused in another theme", () => {
    fc.assert(
      fc.property(seedFileArb(2, 4), pickArb, pickArb, (valid, ap, bp) => {
        const file = clone(valid);
        const a = file.themes[0].cards[pick(ap, file.themes[0].cards.length)];
        const other = file.themes[1];
        other.cards[pick(bp, other.cards.length)].name = a.name;
        // Every theme still holds 30 cards and the exact pyramid.
        expect(() => parseSeed(file)).toThrow();
      }),
    );
  });

  it("FR4 — rejects a card name reused within one theme", () => {
    fc.assert(
      fc.property(seedFileArb(1, 1), (valid) => {
        const file = clone(valid);
        const cards = file.themes[0].cards;
        cards[1].name = cards[0].name;
        expect(() => parseSeed(file)).toThrow();
      }),
    );
  });

  it("FR5 — rejects eduText of 121 characters", () => {
    fc.assert(
      fc.property(seedFileArb(), pickArb, pickArb, (valid, tp, cp) => {
        const file = clone(valid);
        const theme = file.themes[pick(tp, file.themes.length)];
        theme.cards[pick(cp, theme.cards.length)].eduText = "f".repeat(121);
        expect(() => parseSeed(file)).toThrow();
      }),
    );
  });
});

describe("seed schema — the committed pool satisfies the rules", () => {
  it("the real seed/cards.json parses (the rules are forward guards, not retro-fixes)", async () => {
    const { loadSeed } = await import("@/features/pool/loader");
    const { join } = await import("node:path");
    const seed = loadSeed(join(process.cwd(), "seed", "cards.json"));
    for (const theme of seed.themes) {
      expect(theme.cards.length).toBe(CARDS_PER_THEME);
    }
    const names = seed.themes.flatMap((t) => t.cards.map((c) => c.name));
    expect(new Set(names).size).toBe(names.length);
  });
});
