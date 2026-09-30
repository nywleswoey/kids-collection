import { describe, it, expect, beforeEach } from "vitest";
import { neon } from "@neondatabase/serverless";
import { upsertTheme, updateCardMeta } from "@/shared/pool/writer";
import { listPublishedCardKeys, readPublishedShape } from "@/shared/pool/pool-reads";
import { cardKey } from "@/shared/pool/publish-plan";
import { comparePoolShape } from "@/shared/pool/completeness";
import type { SeedFile } from "@/shared/pool/seed-schema";
import { resetAll } from "./db";

/**
 * D1: the seed-sync write/read paths with no direct test before this —
 * `upsertTheme` (reorder), `updateCardMeta` (text-only update), and the
 * `pool-reads.ts` queries `--sync`'s completeness check (FR12) depends on.
 * Against a REAL database: the reorder and the "no image regen" guarantee are
 * both about which columns a real UPDATE does and does not touch.
 */
const sql = neon(process.env.DATABASE_URL!);

async function insertCard(
  id: string,
  themeId: string,
  name: string,
  opts: { rarity?: string; imageUrl?: string; eduText?: string; sourceUrl?: string } = {},
): Promise<void> {
  await sql`INSERT INTO cards (id, theme_id, name, rarity, image_url, edu_text, source_url)
    VALUES (
      ${id}, ${themeId}, ${name},
      ${opts.rarity ?? "common"}::rarity,
      ${opts.imageUrl ?? "https://blob.example/original.png"},
      ${opts.eduText ?? "original fact"},
      ${opts.sourceUrl ?? "https://example.com/original"}
    )`;
}

beforeEach(async () => {
  await resetAll();
});

describe("upsertTheme — idempotent insert, reorder in place (D1)", () => {
  it("inserts a new theme with the given sortOrder", async () => {
    const id = await upsertTheme("Ocean", 3);
    const [row] = await sql`SELECT name, sort_order FROM themes WHERE id = ${id}`;
    expect(row).toMatchObject({ name: "Ocean", sort_order: 3 });
  });

  it("returns the SAME id on a second call and rewrites sortOrder (reorder, not a duplicate)", async () => {
    const first = await upsertTheme("Ocean", 3);
    const second = await upsertTheme("Ocean", 0);

    expect(second).toBe(first);
    const rows = await sql`SELECT id, sort_order FROM themes WHERE name = 'Ocean'`;
    expect(rows).toHaveLength(1); // no duplicate row
    expect(rows[0].sort_order).toBe(0); // reordered in place
  });

  it("leaves sortOrder untouched when it already matches", async () => {
    const id = await upsertTheme("Ocean", 3);
    await sql`UPDATE themes SET sort_order = 3 WHERE id = ${id}`; // sanity baseline
    await upsertTheme("Ocean", 3);
    const [row] = await sql`SELECT sort_order FROM themes WHERE id = ${id}`;
    expect(row.sort_order).toBe(3);
  });
});

describe("updateCardMeta — text-only update, no image regeneration (D1)", () => {
  it("updates eduText and sourceUrl but never imageUrl", async () => {
    const themeId = await upsertTheme("Ocean", 0);
    await insertCard("card-1", themeId, "Blue Whale", {
      imageUrl: "https://blob.example/whale-original.png",
      eduText: "old fact",
      sourceUrl: "https://example.com/old",
    });

    const result = await updateCardMeta({
      themeId,
      name: "Blue Whale",
      eduText: "new fact",
      sourceUrl: "https://example.com/new",
    });

    expect(result).toBe("updated");
    const [row] = await sql`SELECT edu_text, source_url, image_url FROM cards WHERE id = 'card-1'`;
    expect(row.edu_text).toBe("new fact");
    expect(row.source_url).toBe("https://example.com/new");
    // The whole point: the reviewed art is untouched by a text-only sync.
    expect(row.image_url).toBe("https://blob.example/whale-original.png");
  });

  it("reports 'missing' and writes nothing for a (theme, name) pair that does not exist", async () => {
    const themeId = await upsertTheme("Ocean", 0);
    const result = await updateCardMeta({
      themeId,
      name: "No Such Card",
      eduText: "new fact",
      sourceUrl: "https://example.com/new",
    });
    expect(result).toBe("missing");
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM cards`;
    expect(n).toBe(0);
  });
});

describe("pool-reads — the queries --sync's completeness check depends on (D1)", () => {
  it("listPublishedCardKeys reports every (theme, card) pair already published", async () => {
    const oceanId = await upsertTheme("Ocean", 0);
    const skyId = await upsertTheme("Sky", 1);
    await insertCard("c1", oceanId, "Blue Whale");
    await insertCard("c2", oceanId, "Dolphin");
    await insertCard("c3", skyId, "Eagle");

    const keys = await listPublishedCardKeys();
    expect(keys).toEqual(
      new Set([cardKey("Ocean", "Blue Whale"), cardKey("Ocean", "Dolphin"), cardKey("Sky", "Eagle")]),
    );
  });

  it("readPublishedShape reports per-(theme, rarity) counts, feeding comparePoolShape (FR12)", async () => {
    const oceanId = await upsertTheme("Ocean", 0);
    await insertCard("c1", oceanId, "Blue Whale", { rarity: "common" });
    await insertCard("c2", oceanId, "Dolphin", { rarity: "common" });
    await insertCard("c3", oceanId, "Narwhal", { rarity: "rare" });

    const shape = await readPublishedShape();
    expect(shape).toEqual(
      expect.arrayContaining([
        { theme: "Ocean", rarity: "common", n: 2 },
        { theme: "Ocean", rarity: "rare", n: 1 },
      ]),
    );

    // A seed asking for 2 legendary Ocean cards that never got published is a
    // real shortfall — this is what FR12 checks after every `--sync`.
    const seed: SeedFile = {
      themes: [
        {
          name: "Ocean",
          cards: [
            { name: "a", rarity: "common", eduText: "f", imagePrompt: "p", sourceUrl: "https://x" },
            { name: "b", rarity: "common", eduText: "f", imagePrompt: "p", sourceUrl: "https://x" },
            { name: "c", rarity: "rare", eduText: "f", imagePrompt: "p", sourceUrl: "https://x" },
            {
              name: "d",
              rarity: "legendary",
              eduText: "f",
              imagePrompt: "p",
              sourceUrl: "https://x",
            },
            {
              name: "e",
              rarity: "legendary",
              eduText: "f",
              imagePrompt: "p",
              sourceUrl: "https://x",
            },
          ],
        },
      ],
    } as SeedFile;

    const shortfalls = comparePoolShape(seed, shape);
    expect(shortfalls).toEqual([
      { theme: "Ocean", rarity: "legendary", expected: 2, found: 0 },
    ]);
  });
});
