import { describe, it, expect, beforeEach } from "vitest";
import { neon } from "@neondatabase/serverless";
import {
  resetPool,
  countCollections,
  PoolResetBlockedError,
} from "@/features/pool/writer";
import { previewReset } from "@/features/pool/blast-radius";
import { resetAll, seedChildren, seedCards, seedCollections } from "./db";

/**
 * Pins Inc23 FR1 against a REAL database, which is the only place it can be
 * proven: `writer.ts` imports the `db` singleton, and — more to the point — the
 * defect being fixed is a CASCADE. A fake store cannot demonstrate that deleting
 * cards does or does not take the children's rows with it.
 */
const sql = neon(process.env.DATABASE_URL!);

async function seedPoolAndOwners(): Promise<void> {
  await resetAll();
  await seedChildren({ kid1: {}, kid2: {} });
  await seedCards(["c1", "c2", "c3"]);
  await seedCollections({ kid1: { c1: 2, c2: 1 }, kid2: { c3: 5 } });
}

describe("resetPool — a pool reset must never delete collections rows", () => {
  beforeEach(async () => {
    await seedPoolAndOwners();
  });

  it("refuses when any child owns a card, and writes nothing", async () => {
    await expect(resetPool()).rejects.toBeInstanceOf(PoolResetBlockedError);

    // The whole point: nothing was destroyed on the way to the refusal.
    expect(await countCollections()).toBe(3);
    const [{ n: cards }] = await sql`SELECT count(*)::int AS n FROM cards`;
    const [{ n: themes }] = await sql`SELECT count(*)::int AS n FROM themes`;
    expect(cards).toBe(3);
    expect(themes).toBe(1);
  });

  it("reports how many rows it protected", async () => {
    await expect(resetPool()).rejects.toThrow(/3 collection row/);
  });

  it("still clears an unowned pool", async () => {
    await sql`DELETE FROM collections`;
    await resetPool();

    const [{ n: cards }] = await sql`SELECT count(*)::int AS n FROM cards`;
    const [{ n: themes }] = await sql`SELECT count(*)::int AS n FROM themes`;
    expect(cards).toBe(0);
    expect(themes).toBe(0);
  });

  it("does not delete collections directly — the cascade is what it guards", async () => {
    // With no cards at all, a reset is a no-op that must leave children intact.
    await sql`DELETE FROM collections`;
    await resetPool();
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM children`;
    expect(n).toBe(2);
  });
});

describe("previewReset — the report cannot be narrower than the delete", () => {
  beforeEach(async () => {
    await seedPoolAndOwners();
  });

  it("counts every collection row a reset would destroy, per child", async () => {
    const radius = await previewReset();
    expect(radius.collectionRows).toBe(await countCollections());
    expect(radius.cards).toBe(3);
    expect(radius.themes).toBe(1);
    // Both children appear; the number the operator types is the total.
    expect(radius.perChild.reduce((n, c) => n + c.rows, 0)).toBe(radius.collectionRows);
    expect(radius.perChild).toHaveLength(2);
  });

  it("reports zero for an empty pool", async () => {
    await sql`DELETE FROM collections`;
    await sql`DELETE FROM cards`;
    await sql`DELETE FROM themes`;
    const radius = await previewReset();
    expect(radius).toMatchObject({ themes: 0, cards: 0, collectionRows: 0 });
  });
});
