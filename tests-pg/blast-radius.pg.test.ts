import { describe, it, expect, beforeEach } from "vitest";
import { neon } from "@neondatabase/serverless";
import { previewPrune } from "@/shared/pool/blast-radius";
import { upsertTheme, deleteCardsNotIn, deleteThemesNotIn, countCollections } from "@/shared/pool/writer";
import type { SeedFile } from "@/shared/pool/seed-schema";
import { resetAll, seedChildren } from "./db";

/**
 * Pins A1: `previewPrune` had no test at all, fast or pg, despite the
 * blast-radius header's claim that it "resolve[s] the SAME predicate the
 * pruners use, so the report can never be narrower than the deletion". Proven
 * here against a REAL database by running the preview, then running the
 * actual pruners `scripts/seed/index.ts` runs for `--sync`, and asserting the
 * preview's numbers equal what was actually destroyed.
 */
const sql = neon(process.env.DATABASE_URL!);

async function insertTheme(id: string, name: string, sortOrder: number): Promise<void> {
  await sql`INSERT INTO themes (id, name, sort_order) VALUES (${id}, ${name}, ${sortOrder})`;
}

async function insertCard(id: string, themeId: string, name: string): Promise<void> {
  await sql`INSERT INTO cards (id, theme_id, name, rarity, image_url, edu_text)
    VALUES (${id}, ${themeId}, ${name}, 'common'::rarity, '', '')`;
}

/** Minimal SeedFile — previewPrune and the pruners only read theme/card names. */
function seed(themes: { name: string; cards: string[] }[]): SeedFile {
  return {
    themes: themes.map((t) => ({
      name: t.name,
      cards: t.cards.map((name) => ({
        name,
        rarity: "common",
        eduText: "f",
        imagePrompt: "p",
        sourceUrl: "https://example.com",
      })),
    })),
  } as SeedFile;
}

/** What `--sync` does with a seed file's pruning: per-theme card prune, then
 *  whole-theme prune — the same order scripts/seed/index.ts's main() runs. */
async function runPruners(seedFile: SeedFile): Promise<void> {
  for (const [sortOrder, theme] of seedFile.themes.entries()) {
    const themeId = await upsertTheme(theme.name, sortOrder);
    await deleteCardsNotIn(
      themeId,
      theme.cards.map((c) => c.name),
    );
  }
  await deleteThemesNotIn(seedFile.themes.map((t) => t.name));
}

describe("previewPrune — the report cannot be narrower than the delete (A1)", () => {
  beforeEach(async () => {
    await resetAll();
    await seedChildren({ kid1: {}, kid2: {} });

    // "Ocean" survives but drops card B; "Space" is dropped entirely.
    await insertTheme("ocean", "Ocean", 0);
    await insertCard("a", "ocean", "A");
    await insertCard("b", "ocean", "B");
    await insertCard("c", "ocean", "C");

    await insertTheme("space", "Space", 1);
    await insertCard("x", "space", "X");
    await insertCard("y", "space", "Y");

    // kid1 owns A (survives) and B (dropped-card case); kid2 owns X and Y
    // (dropped-theme case) — one row per (child, card) pair, `count` is just
    // the owned quantity and irrelevant to how many ROWS get destroyed.
    await sql`INSERT INTO collections (child_id, card_id, count) VALUES ('kid1', 'a', 1)`;
    await sql`INSERT INTO collections (child_id, card_id, count) VALUES ('kid1', 'b', 1)`;
    await sql`INSERT INTO collections (child_id, card_id, count) VALUES ('kid2', 'x', 1)`;
    await sql`INSERT INTO collections (child_id, card_id, count) VALUES ('kid2', 'y', 1)`;
  });

  it("reports exactly what the pruners destroy — dropped card, dropped theme, new theme", async () => {
    // "Sky" is a brand-new theme (new-theme case): nothing of it exists yet, so
    // it must contribute nothing to the radius.
    const seedFile = seed([
      { name: "Ocean", cards: ["A", "C"] }, // drops B
      { name: "Sky", cards: ["Z"] }, // new theme, nothing to prune
      // "Space" absent entirely — dropped-theme case.
    ]);

    const before = await countCollections();
    const radius = await previewPrune(seedFile);

    // Report contents, before anything is touched.
    expect(radius.themes).toBe(1); // Space
    expect(radius.cards).toBe(3); // B, X, Y
    expect(radius.collectionRows).toBe(3); // kid1's row on B + kid2's rows on X and Y
    expect(radius.themeNames).toEqual(["Space"]);
    expect(radius.perChild.reduce((n, c) => n + c.rows, 0)).toBe(radius.collectionRows);
    const byCard = (a: { card: string }, b: { card: string }) => a.card.localeCompare(b.card);
    expect([...radius.cardNames].sort(byCard)).toEqual(
      [
        { theme: "Space", card: "X" },
        { theme: "Space", card: "Y" },
        { theme: "Ocean", card: "B" },
      ].sort(byCard),
    );

    // Now actually run the pruners and prove the preview was not narrower.
    await runPruners(seedFile);

    const after = await countCollections();
    expect(before - after).toBe(radius.collectionRows);

    const [{ n: remainingCards }] = await sql`SELECT count(*)::int AS n FROM cards`;
    const [{ n: remainingThemes }] = await sql`
      SELECT count(*)::int AS n FROM themes WHERE name IN ('Ocean', 'Space')
    `;
    // A, C survive under Ocean; B, X, Y are gone; Space itself is gone.
    expect(remainingCards).toBe(2);
    expect(remainingThemes).toBe(1);
  });

  it("reports zero when the seed matches the pool exactly", async () => {
    const seedFile = seed([
      { name: "Ocean", cards: ["A", "B", "C"] },
      { name: "Space", cards: ["X", "Y"] },
    ]);
    const radius = await previewPrune(seedFile);
    expect(radius).toMatchObject({ themes: 0, cards: 0, collectionRows: 0 });

    const before = await countCollections();
    await runPruners(seedFile);
    expect(await countCollections()).toBe(before);
  });
});
