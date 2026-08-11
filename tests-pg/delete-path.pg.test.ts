import { describe, it, expect, beforeEach } from "vitest";
import { neon } from "@neondatabase/serverless";
import { pgProfileStore } from "@/db/stores/profile-store.pg";
import {
  countCollections,
  deleteCardsNotIn,
  deleteThemesNotIn,
} from "@/features/pool/writer";
import { resetAll, seedChildren, seedCollections } from "./db";

/**
 * OQ-CS-3, the half a fake cannot state. Every row that disappears from
 * `collections` in production disappears through a CASCADE — `collections`
 * references both `children` and `cards` with ON DELETE CASCADE — and an
 * in-memory store has no cascades to get wrong. The service-layer scoping
 * property lives in tests/delete-path.pbt.test.ts and runs at depth; this file
 * is about the deletes that no service ever asks for.
 *
 * Two paths reach them, and they are NOT equally guarded:
 *
 *   `resetPool()`  — refuses outright while any collection row exists (Inc23
 *                    FR1), and is pinned in pool-writer.pg.test.ts.
 *   the PRUNERS    — `deleteThemesNotIn` / `deleteCardsNotIn`, the `seed --sync`
 *                    delta path. These have NO structural guard. Their only
 *                    protection is at the CLI (`--allow-prune` plus a typed
 *                    confirmation), which is a different layer and a different
 *                    failure mode. Nothing here proposes adding one — a prune
 *                    that could not remove a dropped card would not be a prune —
 *                    but the blast radius should be written down rather than
 *                    discovered, which is what these tests do.
 */
const sql = neon(process.env.DATABASE_URL!);

/** Two themes so the pruners' scoping has something to be wrong about. */
async function seedTwoThemes(): Promise<void> {
  await resetAll();
  await sql`INSERT INTO themes (id, name) VALUES ('t1', 'Animals'), ('t2', 'Vehicles')`;
  await sql`INSERT INTO cards (id, theme_id, name, rarity, image_url, edu_text) VALUES
    ('a1', 't1', 'Ant',   'common'::rarity, '', ''),
    ('a2', 't1', 'Bear',  'common'::rarity, '', ''),
    ('v1', 't2', 'Car',   'common'::rarity, '', ''),
    ('v2', 't2', 'Digger','common'::rarity, '', '')`;
  await seedChildren({ kid1: {}, kid2: {} });
  await seedCollections({ kid1: { a1: 2, a2: 1, v1: 3 }, kid2: { a1: 1, v2: 4 } });
}

const rowsFor = async (cardId: string): Promise<number> => {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM collections WHERE card_id = ${cardId}`;
  return n;
};

const rowsOwnedBy = async (childId: string): Promise<number> => {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM collections WHERE child_id = ${childId}`;
  return n;
};

describe("BR14: deleting a child takes their collection rows and nobody else's", () => {
  beforeEach(seedTwoThemes);

  it("cascades to exactly the removed child's rows", async () => {
    expect(await countCollections()).toBe(5);

    await pgProfileStore.remove("kid1");

    // kid1's three rows are gone; kid2's two are untouched.
    expect(await rowsOwnedBy("kid1")).toBe(0);
    expect(await rowsOwnedBy("kid2")).toBe(2);
    expect(await countCollections()).toBe(2);

    // And the cascade stops at collections — it must not take the pool with it.
    const [{ n: cards }] = await sql`SELECT count(*)::int AS n FROM cards`;
    expect(cards).toBe(4);
  });

  it("leaves a shared card's other owner alone", async () => {
    // Both children hold a1. Removing one must not remove the card, nor the
    // other child's copy of it — the case a per-child delete gets wrong when it
    // reaches for the card instead of the row.
    await pgProfileStore.remove("kid1");
    expect(await rowsFor("a1")).toBe(1);
    expect(await sql`SELECT count(*)::int AS n FROM cards WHERE id = 'a1'`.then((r) => r[0].n)).toBe(1);
  });
});

describe("the seed --sync pruners: scope, and the blast radius when scope is empty", () => {
  beforeEach(seedTwoThemes);

  it("deleteCardsNotIn keeps the collection rows of cards it keeps", async () => {
    // Drop 'Bear' from theme t1, keep 'Ant'. kid1 loses their a2 row and nothing
    // else; the OTHER theme's cards are outside the scope entirely.
    const deleted = await deleteCardsNotIn("t1", ["Ant"]);
    expect(deleted).toBe(1);

    expect(await rowsFor("a2")).toBe(0); // pruned card's rows cascade away
    expect(await rowsFor("a1")).toBe(2); // kept card, BOTH owners intact
    expect(await rowsFor("v1")).toBe(1); // other theme untouched
    expect(await rowsFor("v2")).toBe(1);
    expect(await countCollections()).toBe(4);
  });

  it("deleteCardsNotIn is scoped to its theme — a name shared with another theme survives", async () => {
    // 'Car' exists only in t2. Pruning t1 down to nothing must not reach it.
    await deleteCardsNotIn("t1", []);
    expect(await rowsFor("v1")).toBe(1);
    expect(await rowsFor("v2")).toBe(1);
    expect(await rowsOwnedBy("kid1")).toBe(1); // only v1 left
  });

  it("deleteThemesNotIn removes one theme's cards and their rows, not the other's", async () => {
    const deleted = await deleteThemesNotIn(["Animals"]);
    expect(deleted).toBe(1);

    expect(await rowsFor("a1")).toBe(2);
    expect(await rowsFor("v1")).toBe(0);
    expect(await rowsFor("v2")).toBe(0);
  });

  it("⚠️ an EMPTY keep-list deletes every theme and every collection row, unguarded", async () => {
    // Pinned as behaviour, deliberately, because it is the sharpest edge in this
    // file. `pruneNotIn` treats an empty keep-list as "no filter", so the delete
    // runs unrestricted — and unlike resetPool() there is no owned-rows check to
    // stop it. A seed file that failed to parse into any themes would take every
    // child's entire collection with it, and the only thing standing in the way
    // is the CLI's --allow-prune plus a typed confirmation.
    //
    // If this ever becomes reachable without that confirmation, THIS is the test
    // that should have been read first.
    expect(await countCollections()).toBe(5);

    const deleted = await deleteThemesNotIn([]);

    expect(deleted).toBe(2);
    expect(await countCollections()).toBe(0);
    const [{ n: cards }] = await sql`SELECT count(*)::int AS n FROM cards`;
    expect(cards).toBe(0);
    // The children themselves survive — they own nothing, which is the whole
    // difference between "the pool was reset" and "the binders were emptied".
    const [{ n: kids }] = await sql`SELECT count(*)::int AS n FROM children`;
    expect(kids).toBe(2);
  });
});
