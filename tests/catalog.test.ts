import { describe, it, expect } from "vitest";
import { buildCatalog } from "@/features/admin/catalog-model";
import type { Card, Theme } from "@/lib/types";

const themes: Theme[] = [
  { id: "t1", name: "Animals" },
  { id: "t2", name: "Dinosaurs" },
];

function card(id: string, themeId: string): Card {
  return {
    id,
    themeId,
    name: id,
    rarity: "common",
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
});
