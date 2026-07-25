import { describe, it, expect } from "vitest";
import { makeAdminService } from "@/features/admin/service";
import { inMemoryProfileStore } from "@/db/stores/profile-store.fake";
import { inMemoryCollectionStore } from "@/db/stores/collection-store.fake";
import type { Catalog } from "@/features/pool/catalog";
import type { Card, Theme } from "@/lib/types";

function card(id: string, themeId: string): Card {
  return { id, themeId, name: id, rarity: "common", imageUrl: "", eduText: "", sourceUrl: "" };
}

function fakeCatalog(cards: Card[], themes: Theme[]): Catalog {
  return {
    async listCards() {
      return cards;
    },
    async getCard(id) {
      return cards.find((c) => c.id === id) ?? null;
    },
    async listThemes() {
      return themes;
    },
  };
}

describe("makeAdminService.getAdminOverview", () => {
  it("aggregates each child's balances + distinct-owned against pool totals", async () => {
    const profiles = inMemoryProfileStore([
      { id: "k1", name: "Bea", avatar: "owl", pullTokens: 5, easterEggTickets: 3 },
      { id: "k2", name: "Ada", avatar: "cat", pullTokens: 0 },
    ]);
    const collections = inMemoryCollectionStore({ k1: { a: 2, b: 1 }, k2: { a: 1 } });
    const catalog = fakeCatalog([card("a", "t1"), card("b", "t1"), card("c", "t2")], [
      { id: "t1", name: "Animals" },
      { id: "t2", name: "Space" },
    ]);

    const overview = await makeAdminService({ profiles, collections, catalog }).getAdminOverview();

    expect(overview.cards).toBe(3);
    expect(overview.themes).toBe(2);
    // Name-ordered: Ada before Bea.
    expect(overview.children.map((r) => r.child.name)).toEqual(["Ada", "Bea"]);

    const bea = overview.children.find((r) => r.child.name === "Bea")!;
    expect(bea).toMatchObject({ balance: 5, easterEggTickets: 3, owned: 2, total: 3 });

    const ada = overview.children.find((r) => r.child.name === "Ada")!;
    expect(ada).toMatchObject({ balance: 0, owned: 1, total: 3 });
  });
});
