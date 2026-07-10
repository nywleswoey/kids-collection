import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { themeProgress } from "@/lib/logic";
import type { Card, CollectionEntry } from "@/lib/types";

/**
 * U5 binder assembly logic (owned/locked mapping + progress). Mirrors
 * getBinder's in-memory merge without the DB (the query is thin; the
 * mapping is what matters).
 */
function mapSection(themeCards: Card[], owned: Map<string, number>) {
  const entries: CollectionEntry[] = [...owned.entries()].map(([cardId, count]) => ({
    childId: "c",
    cardId,
    count,
  }));
  const binderCards = themeCards.map((card) => {
    const count = owned.get(card.id) ?? 0;
    return { card, owned: count > 0, count };
  });
  const progress = themeProgress(entries, themeCards.map((c) => c.id));
  return { binderCards, progress };
}

function card(id: string): Card {
  return { id, themeId: "t", name: id, rarity: "common", imageUrl: "x", eduText: "y" };
}

describe("binder mapping (U5-BR2/BR3)", () => {
  it("owned cards marked owned with count; others locked with count 0", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 12 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (ids, frac) => {
          const cards = ids.map(card);
          const ownCount = Math.floor(ids.length * frac);
          const owned = new Map(ids.slice(0, ownCount).map((id) => [id, 1]));
          const { binderCards, progress } = mapSection(cards, owned);

          for (const bc of binderCards) {
            const has = owned.has(bc.card.id);
            expect(bc.owned).toBe(has);
            expect(bc.count).toBe(has ? 1 : 0);
          }
          expect(progress.owned).toBe(ownCount);
          expect(progress.total).toBe(ids.length);
          expect(progress.complete).toBe(ownCount === ids.length);
        },
      ),
    );
  });

  it("duplicate count preserved", () => {
    const cards = [card("a"), card("b")];
    const owned = new Map([["a", 3]]);
    const { binderCards } = mapSection(cards, owned);
    expect(binderCards.find((b) => b.card.id === "a")!.count).toBe(3);
    expect(binderCards.find((b) => b.card.id === "b")!.owned).toBe(false);
  });
});
