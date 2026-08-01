import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canSacrifice, sacrificeReady } from "@/features/binder/sacrifice-filter";
import { SACRIFICE_COST, SACRIFICE_MIN } from "@/features/pull/sacrifice";
import { RARITIES, type Rarity } from "@/lib/types";
import type { BinderCard, ThemeSection } from "@/lib/types";

function bcard(id: string, count: number, rarity: Rarity = "common"): BinderCard {
  return {
    card: { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" },
    owned: count > 0,
    count,
  };
}

const cardArb = fc
  .tuple(fc.string({ minLength: 1 }), fc.integer({ min: 0, max: 12 }), fc.constantFrom<Rarity>(...RARITIES))
  .map(([id, count, r]) => bcard(id, count, r));

const sectionArb: fc.Arbitrary<ThemeSection> = fc
  .tuple(fc.string({ minLength: 1 }), fc.array(cardArb, { maxLength: 20 }))
  .map(([id, cards]) => ({
    theme: { id, name: id },
    cards,
    progress: { owned: cards.filter((c) => c.owned).length, total: cards.length, complete: false },
  }));

describe("canSacrifice (Inc22 FR10 — 4+ copies: burn 3, keep 1)", () => {
  it("SACRIFICE_MIN is one more than the burn cost", () => {
    expect(SACRIFICE_MIN).toBe(SACRIFICE_COST + 1);
  });

  it("is false at or below the burn cost — a pile of exactly 3 cannot be burned", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: SACRIFICE_COST }), (count) => {
        expect(canSacrifice(bcard("c", count))).toBe(false);
      }),
    );
  });

  it("is true above the burn cost", () => {
    fc.assert(
      fc.property(fc.integer({ min: SACRIFICE_MIN, max: 200 }), (count) => {
        expect(canSacrifice(bcard("c", count))).toBe(true);
      }),
    );
  });

  it("agrees with the card detail page's gate for every holding — no dead ends", () => {
    // app/play/binder/[cardId]/page.tsx renders SacrificePanel iff
    // `detail.count >= SACRIFICE_MIN`. Any card this filter surfaces MUST open a
    // detail page that actually offers the sacrifice (acceptance criterion 11).
    fc.assert(
      fc.property(cardArb, (entry) => {
        expect(canSacrifice(entry)).toBe(entry.owned && entry.count >= SACRIFICE_MIN);
      }),
    );
  });

  it("implies owned", () => {
    fc.assert(
      fc.property(cardArb, (entry) => {
        if (canSacrifice(entry)) expect(entry.owned).toBe(true);
      }),
    );
  });
});

describe("sacrificeReady (Inc22 FR11 — global, ignores every chip)", () => {
  it("returns exactly the burnable cards", () => {
    fc.assert(
      fc.property(fc.array(sectionArb, { maxLength: 6 }), (sections) => {
        const out = sacrificeReady(sections);
        expect(out.every(canSacrifice)).toBe(true);
        expect(out.length).toBe(sections.flatMap((s) => s.cards).filter(canSacrifice).length);
      }),
    );
  });

  it("is invariant under how the cards are split across sections", () => {
    // The same cards regrouped into one section must yield the same list — this
    // is what makes the count safe to show globally while a category chip is active.
    fc.assert(
      fc.property(fc.array(sectionArb, { maxLength: 6 }), (sections) => {
        const merged: ThemeSection = {
          theme: { id: "merged", name: "merged" },
          cards: sections.flatMap((s) => s.cards),
          progress: { owned: 0, total: 0, complete: false },
        };
        expect(sacrificeReady([merged]).map((c) => c.card.id)).toEqual(
          sacrificeReady(sections).map((c) => c.card.id),
        );
      }),
    );
  });

  it("ignores empty sections", () => {
    const empty: ThemeSection = {
      theme: { id: "e", name: "e" },
      cards: [],
      progress: { owned: 0, total: 0, complete: false },
    };
    expect(sacrificeReady([empty])).toEqual([]);
  });
});
