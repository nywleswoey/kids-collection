import { describe, it, expect, beforeEach } from "vitest";
import { neon } from "@neondatabase/serverless";
import { listThemes } from "@/features/pool/service";
import { resetAll } from "./db";

/**
 * Pins #140's total theme order against a REAL database, which is the only
 * place it can be proven: the tie-break IS the `ORDER BY`, so a fake catalog
 * that returns a hand-ordered array would assert nothing. What is being tested
 * is that Postgres is no longer free to choose.
 *
 * `themes.sort_order` is `integer NOT NULL DEFAULT 0` with no unique
 * constraint, so equal values are reachable by construction — `seedThemes`
 * inserts without one and every row lands on 0. Before #140 the order among
 * them was heap order.
 */
const sql = neon(process.env.DATABASE_URL!);

async function insertTheme(id: string, name: string, sortOrder?: number) {
  await sql`INSERT INTO themes (id, name, sort_order)
    VALUES (${id}, ${name}, ${sortOrder ?? 0})`;
}

describe("listThemes — the order is total, not just by sort_order", () => {
  beforeEach(resetAll);

  it("orders by sort_order first", async () => {
    await insertTheme("t-c", "Aardvarks", 3);
    await insertTheme("t-a", "Zebras", 1);
    await insertTheme("t-b", "Mammoths", 2);

    expect((await listThemes()).map((t) => t.name)).toEqual([
      "Zebras",
      "Mammoths",
      "Aardvarks",
    ]);
  });

  it("breaks a sort_order tie by name, not by insertion order", async () => {
    // Inserted in reverse of the answer, so heap order cannot produce it.
    await insertTheme("t-1", "Zebras");
    await insertTheme("t-2", "Mammoths");
    await insertTheme("t-3", "Aardvarks");

    expect((await listThemes()).map((t) => t.name)).toEqual([
      "Aardvarks",
      "Mammoths",
      "Zebras",
    ]);
  });

  it("compares names by code unit, so case is not folded away", async () => {
    // Under a locale collation "aardvarks" sorts beside "Aardvarks"; under
    // COLLATE "C" every uppercase letter precedes every lowercase one. The
    // point is not which answer is prettier — it is that the answer does not
    // depend on the cluster's collation.
    await insertTheme("t-1", "aardvarks");
    await insertTheme("t-2", "Zebras");

    expect((await listThemes()).map((t) => t.name)).toEqual(["Zebras", "aardvarks"]);
  });

  it("is stable across repeated reads of the same tied rows", async () => {
    // Inserted DESCENDING, so heap order is the exact reverse of the answer —
    // otherwise this test would pass against a bare `ORDER BY sort_order` and
    // prove nothing.
    for (let i = 7; i >= 0; i--) await insertTheme(`t-${i}`, `Theme ${i}`);

    const once = (await listThemes()).map((t) => t.id);
    const twice = (await listThemes()).map((t) => t.id);
    expect(twice).toEqual(once);
    // And it is the name order, ascending — nothing about insertion survives.
    expect(once).toEqual([...once].sort());
  });
});
