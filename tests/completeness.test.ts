import { describe, it, expect } from "vitest";
import { comparePoolShape, type PublishedCount } from "@/features/pool/completeness";
import type { SeedFile } from "@/features/pool/seed-schema";
import { RARITIES, type Rarity } from "@/lib/types";

/** A theme with the given per-rarity counts. */
const theme = (name: string, counts: Partial<Record<Rarity, number>>) => ({
  name,
  cards: RARITIES.flatMap((r) =>
    Array.from({ length: counts[r] ?? 0 }, (_, i) => ({
      name: `${name}-${r}-${i}`,
      rarity: r,
      eduText: "f",
      imagePrompt: "p",
      sourceUrl: "https://example.com/x",
    })),
  ),
});

const seed = (...themes: ReturnType<typeof theme>[]): SeedFile =>
  ({ themes }) as SeedFile;

const publishedFrom = (file: SeedFile): PublishedCount[] =>
  file.themes.flatMap((t) =>
    RARITIES.map((rarity) => ({
      theme: t.name,
      rarity,
      n: t.cards.filter((c) => c.rarity === rarity).length,
    })).filter((row) => row.n > 0),
  );

describe("comparePoolShape (FR12 — publishing faults, not authoring faults)", () => {
  const pyramid = { common: 15, rare: 8, epic: 5, legendary: 2 };

  it("reports nothing when every theme landed in full", () => {
    const file = seed(theme("Flying Machines", pyramid), theme("Ocean Machines", pyramid));
    expect(comparePoolShape(file, publishedFrom(file))).toEqual([]);
  });

  it("reports a single card that failed to insert", () => {
    // The real failure this exists to catch: one card 429'd out and was skipped,
    // so the theme silently published 29 and its legendary set is unreachable.
    const file = seed(theme("Flying Machines", pyramid));
    const published = publishedFrom(file).map((r) =>
      r.rarity === "legendary" ? { ...r, n: 1 } : r,
    );
    expect(comparePoolShape(file, published)).toEqual([
      { theme: "Flying Machines", rarity: "legendary", expected: 2, found: 1 },
    ]);
  });

  it("reports every rarity when a theme is missing entirely", () => {
    const file = seed(theme("Ocean Machines", pyramid));
    expect(comparePoolShape(file, [])).toEqual([
      { theme: "Ocean Machines", rarity: "common", expected: 15, found: 0 },
      { theme: "Ocean Machines", rarity: "rare", expected: 8, found: 0 },
      { theme: "Ocean Machines", rarity: "epic", expected: 5, found: 0 },
      { theme: "Ocean Machines", rarity: "legendary", expected: 2, found: 0 },
    ]);
  });

  it("does not report over-publishing — a card in the DB but not the file is a PRUNE decision", () => {
    // previewPrune owns that case, with its own guard and its own typed
    // confirmation. Reporting it here would send the operator to the one remedy
    // (re-run --sync) that cannot possibly help.
    const file = seed(theme("Animals", pyramid));
    const published = publishedFrom(file).map((r) =>
      r.rarity === "common" ? { ...r, n: 16 } : r,
    );
    expect(comparePoolShape(file, published)).toEqual([]);
  });

  it("scopes counts per theme — a surplus elsewhere never masks a shortfall", () => {
    const file = seed(theme("A", pyramid), theme("B", pyramid));
    const published = publishedFrom(file).map((r) =>
      r.theme === "B" && r.rarity === "epic" ? { ...r, n: 4 } : r,
    );
    expect(comparePoolShape(file, published)).toEqual([
      { theme: "B", rarity: "epic", expected: 5, found: 4 },
    ]);
  });
});
