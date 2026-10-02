import { describe, it, expect, vi, afterEach } from "vitest";
import { makeRewardService } from "@/features/rewards/service";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import { inMemoryRewardStore } from "@/db/stores/reward-store.fake";
import type { Catalog } from "@/shared/pool/catalog";
import type { Card, Rarity, Theme } from "@/lib/types";

/** The reward cascade orchestration, reachable only because the service accepts
 * ports (CollectionStore + RewardStore + Catalog). */

function card(id: string, rarity: Rarity, themeId: string): Card {
  return { id, themeId, name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
}

function fakeCatalog(cards: Card[], themes: Theme[]): Catalog & { listCardsCalls: number } {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const catalog = {
    listCardsCalls: 0,
    async listCards() {
      catalog.listCardsCalls++;
      return cards;
    },
    async getCard(id: string) {
      return byId.get(id) ?? null;
    },
    async listThemes() {
      return themes;
    },
  };
  return catalog;
}

function setup(seed: CollectionSeed, cards: Card[], themes: Theme[]) {
  const collections = inMemoryCollectionStore(seed);
  const rewards = inMemoryRewardStore();
  const catalog = fakeCatalog(cards, themes);
  const service = makeRewardService({ collections, rewards, catalog });
  return { service, collections, rewards, catalog };
}

// Theme "th" has exactly two rare cards; owning both completes the rare set.
const CARDS = [card("r1", "rare", "th"), card("r2", "rare", "th")];
const THEMES: Theme[] = [{ id: "th", name: "Dinosaurs" }];

afterEach(() => vi.restoreAllMocks());

describe("makeRewardService.grantCompletionRewards", () => {
  it("grants one reward when a rarity set is completed, and claims it once", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // deterministic pickUpgradeCard
    const { service, collections, rewards } = setup({ kid: { r1: 1, r2: 1 } }, CARDS, THEMES);

    const granted = await service.grantCompletionRewards("kid", ["r2"]);

    expect(granted).toHaveLength(1);
    expect(granted[0]).toMatchObject({ themeId: "th", rarity: "rare" });
    expect(await collections.cardCount("kid", granted[0].card.id)).toBe(2); // bonus copy added
    expect(await rewards.listPending("kid")).toHaveLength(1);
  });

  it("is idempotent — a second trigger claims nothing", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { service } = setup({ kid: { r1: 1, r2: 1 } }, CARDS, THEMES);

    await service.grantCompletionRewards("kid", ["r2"]);
    const again = await service.grantCompletionRewards("kid", ["r2"]);

    expect(again).toEqual([]); // set already rewarded
  });

  it("grants nothing when the set is incomplete", async () => {
    const { service, rewards } = setup({ kid: { r1: 1 } }, CARDS, THEMES); // missing r2
    expect(await service.grantCompletionRewards("kid", ["r1"])).toEqual([]);
    expect(await rewards.listPending("kid")).toHaveLength(0);
  });

  it("reuses a caller-supplied pool instead of re-fetching the catalog when nothing completes", async () => {
    const { service, catalog } = setup({ kid: { r1: 1 } }, CARDS, THEMES); // missing r2
    const granted = await service.grantCompletionRewards("kid", ["r1"], CARDS);
    expect(granted).toEqual([]);
    expect(catalog.listCardsCalls).toBe(0); // no internal fetch needed at all
  });

  it("upgrades a caller-supplied (possibly theme-scoped) pool to the full catalog only once a set completes", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // deterministic pickUpgradeCard
    const { service, catalog } = setup({ kid: { r1: 1, r2: 1 } }, CARDS, THEMES);

    // Caller passes exactly the theme-scoped slice it already had on hand — the
    // completeness check above only needed that theme, so this never happens to
    // call the catalog... until the set turns out complete and the bonus card
    // must be pickable from ANY theme, which is the one time it needs to fetch.
    const granted = await service.grantCompletionRewards("kid", ["r2"], CARDS);

    expect(granted).toHaveLength(1);
    expect(catalog.listCardsCalls).toBe(1); // fetched once, only because a set completed
  });

  it("falls back to its own single catalog fetch when the caller passes no pool", async () => {
    const { service, catalog } = setup({ kid: { r1: 1 } }, CARDS, THEMES); // missing r2
    await service.grantCompletionRewards("kid", ["r1"]);
    expect(catalog.listCardsCalls).toBe(1);
  });
});

describe("makeRewardService pending + shown", () => {
  it("surfaces pending rewards with theme name, then hides them once shown", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { service } = setup({ kid: { r1: 1, r2: 1 } }, CARDS, THEMES);
    await service.grantCompletionRewards("kid", ["r2"]);

    const pending = await service.getPendingRewards("kid");
    expect(pending).toHaveLength(1);
    expect(pending[0].themeName).toBe("Dinosaurs");

    await service.markRewardsShown("kid", [pending[0].id]);
    expect(await service.getPendingRewards("kid")).toEqual([]);
  });
});
