import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeTradeService } from "@/features/trade/trade-service";
import { makePullService } from "@/features/pull/pull-service";
import { SACRIFICE_COST } from "@/features/pull/sacrifice";
import { inMemoryCollectionStore, type CollectionSeed } from "@/db/stores/collection-store.fake";
import { inMemoryChildStore } from "@/db/stores/child-store.fake";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import type { Card, Child, Rarity } from "@/lib/types";

/**
 * OQ-CS-3 — "no service path can delete a `collections` row it doesn't own."
 *
 * The definition documents carried this as a GAP for the whole of Increment 23:
 * Property-Based Testing is a *blocking* constraint, `resetPool()` got a narrow
 * guard and a narrow test (T7 choice d), and the general statement was deferred
 * with the note that "that reasoning should be re-examined, not inherited."
 * This file is the re-examination.
 *
 * WHAT "OWN" MEANS HERE, because the word is doing all the work. A service call
 * names its participants — sacrifice names one (child, card); a trade names two
 * children and two cards. Every OTHER (child, card) pair is a bystander, and the
 * property is that bystanders are untouched. Not "nothing is ever deleted": the
 * invariant is about SCOPE.
 *
 * WHAT THIS FILE CANNOT REACH, stated so nobody reads it as wider than it is.
 * The store's row-DELETE branch (`removeCard` reaching exactly 0) is
 * unreachable from any service: sacrifice passes `minHeld = SACRIFICE_COST + 1`
 * so it always keeps a copy, and a swap requires `held >= 2` on both givers. A
 * mutation that dropped the `child_id` predicate from that DELETE was NOT caught
 * here — it was caught by the concrete bystander cases in the shared store
 * contract, which call the store directly and run against real Postgres too.
 * Each catches a class the other structurally cannot; neither subsumes the other.
 * That asymmetry is the reason both exist, and it was found by mutating rather
 * than by reasoning.
 *
 * Runs against the in-memory fake, which is where the depth is: CI sets
 * FC_NUM_RUNS=1000.
 */

/** One rarity for every card ON PURPOSE — see the reachability guards below. */
const TRADE_RARITY: Rarity = "rare";

function card(id: string, rarity: Rarity = TRADE_RARITY): Card {
  return { id, themeId: "t1", name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" };
}

function fakeCatalog(cards: Card[]): Catalog {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return {
    async listCards() {
      return cards;
    },
    async getCard(id) {
      return byId.get(id) ?? null;
    },
    async listThemes() {
      return [];
    },
  };
}

/** Rewards are best-effort in both services; a no-op keeps the property on the seam. */
const noRewards: RewardGranter = {
  async grantCompletionRewards() {
    return [];
  },
};

/**
 * The whole world as a flat `child/card -> count` map. Flat on purpose: the
 * assertion is a set-difference over KEYS, so a copy that moved between children
 * shows up as two changed keys rather than hiding inside a nested compare.
 */
type Snapshot = Map<string, number>;
const key = (childId: string, cardId: string) => `${childId}/${cardId}`;

async function snapshot(
  store: CollectionStore,
  childIds: readonly string[],
  cardIds: readonly string[],
): Promise<Snapshot> {
  const out: Snapshot = new Map();
  for (const childId of childIds) {
    const counts = await store.ownedCounts(childId, [...cardIds]);
    for (const cardId of cardIds) out.set(key(childId, cardId), counts[cardId] ?? 0);
  }
  return out;
}

/** Keys whose count differs between two snapshots of the same world. */
function changedKeys(before: Snapshot, after: Snapshot): string[] {
  const changed: string[] = [];
  for (const [k, v] of before) {
    if (after.get(k) !== v) changed.push(k);
  }
  return changed.sort();
}

// --- Generators --------------------------------------------------------------

const CHILD_IDS = ["kid1", "kid2", "kid3", "kid4"] as const;
const CARD_IDS = ["c1", "c2", "c3", "c4"] as const;
const ALL_CARDS = CARD_IDS.map((id) => card(id));

/**
 * A populated world: every child holds a (possibly zero) count of every card.
 * Counts reach SACRIFICE_COST + 2 so a sacrifice is sometimes affordable and
 * sometimes refused — both branches have to keep bystanders safe, and a
 * generator that only produced refusals would prove nothing about the path that
 * actually writes.
 */
const worldArb: fc.Arbitrary<CollectionSeed> = fc
  .tuple(
    ...CHILD_IDS.map(() =>
      fc.tuple(...CARD_IDS.map(() => fc.integer({ min: 0, max: SACRIFICE_COST + 2 }))),
    ),
  )
  .map((rows) => {
    const seed: CollectionSeed = {};
    rows.forEach((counts, ci) => {
      const cards: Record<string, number> = {};
      counts.forEach((n, di) => {
        if (n > 0) cards[CARD_IDS[di]] = n;
      });
      seed[CHILD_IDS[ci]] = cards;
    });
    return seed;
  });

const childArb = fc.constantFrom(...CHILD_IDS);
const cardArb = fc.constantFrom(...CARD_IDS);

/**
 * All four children, ACTIVE. `executeTrade` refuses a participant that is not in
 * this directory (#97), so an empty one would refuse every generated trade — the
 * exact silent-no-op the reachability guards below exist to catch, and did.
 */
const ALL_ACTIVE: Child[] = CHILD_IDS.map((id) => ({
  id,
  name: id,
  avatar: "fox",
  pullTokens: 0,
  easterEggTickets: 0,
}));

function makeTrade(collections: CollectionStore) {
  return makeTradeService({
    collections,
    catalog: fakeCatalog(ALL_CARDS),
    rewards: noRewards,
    profiles: { async listChildren() { return ALL_ACTIVE; } },
  });
}

function makePull(collections: CollectionStore) {
  return makePullService({
    children: inMemoryChildStore(
      Object.fromEntries(CHILD_IDS.map((id) => [id, { easterEggTickets: 0, pullTokens: 0 }])),
    ),
    collections,
    catalog: fakeCatalog(ALL_CARDS),
    rewards: noRewards,
  });
}

describe("OQ-CS-3: no service path touches a collections row outside its named scope", () => {
  it("property: sacrifice changes only the (child, card) it names", async () => {
    // REACHABILITY GUARD. An earlier draft of this file gave the four cards four
    // different rarities, which made `validateTrade` reject every generated trade
    // — three green properties that exercised nothing. Counting the writes and
    // asserting the count is non-zero is what turns "it passed" into "it ran".
    let burned = 0;

    await fc.assert(
      fc.asyncProperty(worldArb, childArb, cardArb, async (world, childId, cardId) => {
        const collections = inMemoryCollectionStore(world);
        const pull = makePull(collections);

        const before = await snapshot(collections, CHILD_IDS, CARD_IDS);
        // A refusal is a legitimate outcome, not a failure — the invariant holds
        // on BOTH branches, so the throw is absorbed and the same assertions run.
        const ok = await pull
          .sacrifice(childId, cardId)
          .then(() => true)
          .catch(() => false);
        const after = await snapshot(collections, CHILD_IDS, CARD_IDS);
        if (ok) burned++;

        for (const k of changedKeys(before, after)) {
          expect(k).toBe(key(childId, cardId));
        }

        // Down by exactly the cost, never below the one copy the child keeps.
        const b = before.get(key(childId, cardId))!;
        const a = after.get(key(childId, cardId))!;
        expect(a === b || a === b - SACRIFICE_COST).toBe(true);
        if (a !== b) expect(a).toBeGreaterThanOrEqual(1);
      }),
    );

    expect(burned).toBeGreaterThan(0);
  });

  it("property: a trade changes only the four (child, card) pairs it names", async () => {
    let applied = 0;

    await fc.assert(
      fc.asyncProperty(
        worldArb,
        childArb,
        cardArb,
        childArb,
        cardArb,
        async (world, aChildId, aCardId, bChildId, bCardId) => {
          const collections = inMemoryCollectionStore(world);
          const before = await snapshot(collections, CHILD_IDS, CARD_IDS);
          const res = await makeTrade(collections).executeTrade({
            aChildId,
            aCardId,
            bChildId,
            bCardId,
          });
          const after = await snapshot(collections, CHILD_IDS, CARD_IDS);
          if (res.ok) applied++;

          const named = new Set([
            key(aChildId, aCardId),
            key(aChildId, bCardId),
            key(bChildId, aCardId),
            key(bChildId, bCardId),
          ]);
          for (const k of changedKeys(before, after)) {
            expect(named.has(k)).toBe(true);
          }
        },
      ),
    );

    expect(applied).toBeGreaterThan(0);
  });

  it("property: a trade never reduces a bystander child's total holdings", async () => {
    // Stated over TOTALS as well as per-card keys on purpose. A bug that moved a
    // copy between two of a bystander's OWN cards leaves every per-card key
    // changed-but-balanced; a bug that deleted one does not.
    let applied = 0;

    await fc.assert(
      fc.asyncProperty(
        worldArb,
        childArb,
        cardArb,
        childArb,
        cardArb,
        async (world, aChildId, aCardId, bChildId, bCardId) => {
          const collections = inMemoryCollectionStore(world);
          const total = async (childId: string) =>
            (await collections.entries(childId)).reduce((n, e) => n + e.count, 0);

          const bystanders = CHILD_IDS.filter((id) => id !== aChildId && id !== bChildId);
          const before = new Map<string, number>();
          for (const id of bystanders) before.set(id, await total(id));

          const res = await makeTrade(collections).executeTrade({
            aChildId,
            aCardId,
            bChildId,
            bCardId,
          });
          if (res.ok) applied++;

          for (const id of bystanders) {
            expect(await total(id)).toBe(before.get(id));
          }
        },
      ),
    );

    expect(applied).toBeGreaterThan(0);
  });

  it("property: no service path ever removes a (child, card) row", async () => {
    // The strong form, and true today: sacrifice keeps a copy and a swap needs a
    // duplicate, so a row can APPEAR (the receiving side of a trade) but never
    // disappear. Every row that vanishes in production does so through a CASCADE
    // — child deleted, or card/theme pruned — which is pinned in tests-pg where
    // a cascade can actually be observed. If a future service ever needs to burn
    // a last copy, this property is the one that should be argued with first.
    let acted = 0;

    await fc.assert(
      fc.asyncProperty(
        worldArb,
        childArb,
        cardArb,
        childArb,
        cardArb,
        async (world, aChildId, aCardId, bChildId, bCardId) => {
          const collections = inMemoryCollectionStore(world);
          const heldKeys = async () => {
            const out = new Set<string>();
            for (const id of CHILD_IDS) {
              for (const e of await collections.entries(id)) out.add(key(id, e.cardId));
            }
            return out;
          };

          const before = await heldKeys();
          const trade = await makeTrade(collections).executeTrade({
            aChildId,
            aCardId,
            bChildId,
            bCardId,
          });
          const sac = await makePull(collections)
            .sacrifice(aChildId, aCardId)
            .then(() => true)
            .catch(() => false);
          if (trade.ok || sac) acted++;

          const after = await heldKeys();
          for (const k of before) expect(after.has(k)).toBe(true);
        },
      ),
    );

    expect(acted).toBeGreaterThan(0);
  });
});
