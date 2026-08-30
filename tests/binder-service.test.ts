import { describe, it, expect } from "vitest";
import { makeBinderService } from "@/features/binder/service";
import { coverCard } from "@/features/binder/category-cover";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import type { Catalog } from "@/features/pool/catalog";
import type { Card, Rarity, Theme } from "@/lib/types";

/** Binder assembly (owned/locked, progress, totals) through the ports. */
function card(id: string, themeId: string, rarity: Rarity = "common"): Card {
  return { id, themeId, name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
}

function fakeCatalog(cards: Card[], themes: Theme[]): Catalog {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return {
    async listCards(themeId?: string) {
      return themeId ? cards.filter((c) => c.themeId === themeId) : cards;
    },
    async getCard(id) {
      return byId.get(id) ?? null;
    },
    async listThemes() {
      return themes;
    },
  };
}

const THEMES: Theme[] = [
  { id: "t1", name: "Animals" },
  { id: "t2", name: "Space" },
];
const CARDS = [card("a", "t1"), card("b", "t1"), card("c", "t2")];

function setup(seed: CollectionSeed) {
  const collections = inMemoryCollectionStore(seed);
  return makeBinderService({ collections, catalog: fakeCatalog(CARDS, THEMES) });
}

describe("makeBinderService.getBinder", () => {
  it("marks owned vs locked cards and tallies progress + totals", async () => {
    const service = setup({ kid: { a: 2, c: 1 } }); // owns a and c, not b

    const binder = await service.getBinder("kid");

    expect(binder.totalCards).toBe(3);
    expect(binder.totalOwned).toBe(2);

    const animals = binder.themes.find((s) => s.theme.id === "t1")!;
    expect(animals.progress).toMatchObject({ owned: 1, total: 2, complete: false });
    expect(animals.cards.find((c) => c.card.id === "a")!.owned).toBe(true);
    expect(animals.cards.find((c) => c.card.id === "b")!.owned).toBe(false);

    const space = binder.themes.find((s) => s.theme.id === "t2")!;
    expect(space.progress).toMatchObject({ owned: 1, total: 1, complete: true });
  });
});

describe("makeBinderService card order (#123)", () => {
  it("hands every consumer one order: rarity ascending, then name", async () => {
    // Deliberately catalog-hostile: the fake returns them best-first, the way an
    // unordered `listCards` is free to.
    const shuffled: Card[] = [
      card("l", "t1", "legendary"),
      card("e", "t1", "epic"),
      card("c2", "t1"),
      card("r", "t1", "rare"),
      card("c1", "t1"),
    ];
    const collections = inMemoryCollectionStore({ kid: { l: 1 } });
    const service = makeBinderService({
      collections,
      catalog: fakeCatalog(shuffled, [THEMES[0]!]),
    });

    const binder = await service.getBinder("kid");
    const section = binder.themes[0]!;

    expect(section.cards.map((c) => c.card.id)).toEqual(["c1", "c2", "r", "e", "l"]);
    expect(section.cards.map((c) => c.card.rarity)).toEqual([
      "common",
      "common",
      "rare",
      "epic",
      "legendary",
    ]);
  });

  it("backs coverCard's 'the same card every time' (#122)", async () => {
    const collections = inMemoryCollectionStore({ kid: {} });
    const forwards = [card("z", "t1", "legendary"), card("a", "t1", "legendary")];
    const one = await makeBinderService({
      collections,
      catalog: fakeCatalog(forwards, [THEMES[0]!]),
    }).getBinder("kid");
    const other = await makeBinderService({
      collections,
      catalog: fakeCatalog([...forwards].reverse(), [THEMES[0]!]),
    }).getBinder("kid");

    expect(coverCard(one.themes[0]!)!.card.id).toBe("a");
    expect(coverCard(other.themes[0]!)!.card.id).toBe("a");
  });
});

describe("makeBinderService.getCardDetail", () => {
  it("returns the card when owned, null when not", async () => {
    const service = setup({ kid: { a: 3 } });
    expect(await service.getCardDetail("kid", "a")).toEqual({ card: CARDS[0], count: 3 });
    expect(await service.getCardDetail("kid", "b")).toBeNull(); // not owned
  });
});
