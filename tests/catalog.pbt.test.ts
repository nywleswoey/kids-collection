import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildCatalog } from "@/features/admin/catalog-model";
import { RARITIES, type Rarity } from "@/lib/types";
import type { Card, Theme } from "@/lib/types";

const themes: Theme[] = [
  { id: "t1", name: "Animals" },
  { id: "t2", name: "Dinosaurs" },
];

function card(
  id: string,
  themeId: string,
  rarity: Rarity = "common",
  name = id,
): Card {
  return {
    id,
    themeId,
    name,
    rarity,
    imageUrl: "x",
    eduText: "y",
    sourceUrl: "https://example/s",
  };
}

const cards: Card[] = [
  card("a1", "t1"),
  card("a2", "t1"),
  card("d1", "t2"),
];

describe("buildCatalog (U4-FR2)", () => {
  it("marks every card owned with count 1", () => {
    const view = buildCatalog(themes, cards);
    const entries = view.themes.flatMap((s) => s.cards);
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.owned && e.count === 1)).toBe(true);
  });

  it("totals equal the whole pool and each theme is complete", () => {
    const view = buildCatalog(themes, cards);
    expect(view.totalOwned).toBe(3);
    expect(view.totalCards).toBe(3);
    expect(view.themes.every((s) => s.progress.complete)).toBe(true);
    expect(view.themes[0].progress).toEqual({ owned: 2, total: 2, complete: true });
  });

  it("keeps sourceUrl on catalog cards (admin fact-check)", () => {
    const view = buildCatalog(themes, cards);
    expect(view.themes[0].cards[0].card.sourceUrl).toBe("https://example/s");
  });

  it("lays each section out in the child's card order (#123)", () => {
    const view = buildCatalog([themes[0]!], [
      card("x1", "t1", "legendary", "Zephyr"),
      card("x2", "t1", "common", "Beetle"),
      card("x3", "t1", "epic", "Marlin"),
      card("x4", "t1", "common", "Ant"),
    ]);
    expect(view.themes[0]!.cards.map((c) => c.card.name)).toEqual([
      "Ant",
      "Beetle",
      "Marlin",
      "Zephyr",
    ]);
  });

  it("never lets rarity decrease down a preview section", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 6 }),
            fc.constantFrom<Rarity>(...RARITIES),
          ),
          { maxLength: 30 },
        ),
        (specs) => {
          const pool = specs.map(([name, rarity], i) =>
            card(`c${i}`, "t1", rarity, name),
          );
          const view = buildCatalog([themes[0]!], pool);
          const ranks = view.themes[0]!.cards.map((c) =>
            RARITIES.indexOf(c.card.rarity),
          );
          for (let i = 1; i < ranks.length; i += 1) {
            expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
          }
        },
      ),
    );
  });
});
