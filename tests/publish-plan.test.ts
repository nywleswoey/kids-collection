import { describe, it, expect } from "vitest";
import { cardKey, planInserts } from "@/features/pool/publish-plan";
import type { SeedFile } from "@/features/pool/seed-schema";

/** Minimal shape — planInserts only reads theme.name and card.name. */
const seed = (themes: Record<string, string[]>): SeedFile =>
  ({
    themes: Object.entries(themes).map(([name, cards]) => ({
      name,
      cards: cards.map((c) => ({
        name: c,
        rarity: "common",
        eduText: "f",
        imagePrompt: "p",
        sourceUrl: "https://example.com/x",
      })),
    })),
  }) as SeedFile;

describe("cardKey", () => {
  it("cannot confuse a dash in a theme name with one in a card name", () => {
    // A printable separator would make these two pairs collide.
    expect(cardKey("A-B", "C")).not.toBe(cardKey("A", "B-C"));
  });

  it("is stable for the same pair", () => {
    expect(cardKey("Flying Machines", "Concorde")).toBe(
      cardKey("Flying Machines", "Concorde"),
    );
  });
});

describe("planInserts (FR9 + FR10 — one set, two callers)", () => {
  it("plans nothing when everything is already published", () => {
    const file = seed({ Animals: ["Fox", "Bee"] });
    const published = new Set([cardKey("Animals", "Fox"), cardKey("Animals", "Bee")]);
    expect(planInserts(file, published)).toEqual([]);
  });

  it("plans every card of a theme that does not exist yet", () => {
    // The load-bearing case: a brand-new theme has no row, and the set-difference
    // design needs no theme id to say so — which is what keeps --review write-free.
    const file = seed({ "Flying Machines": ["Concorde", "Spitfire", "Voyager 1"] });
    expect(planInserts(file, new Set())).toEqual([
      { theme: "Flying Machines", card: "Concorde" },
      { theme: "Flying Machines", card: "Spitfire" },
      { theme: "Flying Machines", card: "Voyager 1" },
    ]);
  });

  it("plans only the unpublished cards of a partly-published theme", () => {
    const file = seed({ Animals: ["Fox", "Bee", "Owl"] });
    const published = new Set([cardKey("Animals", "Fox")]);
    expect(planInserts(file, published)).toEqual([
      { theme: "Animals", card: "Bee" },
      { theme: "Animals", card: "Owl" },
    ]);
  });

  it("ignores published cards that are not in the seed file (that is a prune decision)", () => {
    const file = seed({ Animals: ["Fox"] });
    const published = new Set([
      cardKey("Animals", "Fox"),
      cardKey("Animals", "Dodo"), // dropped from the seed — previewPrune's problem
    ]);
    expect(planInserts(file, published)).toEqual([]);
  });

  it("preserves seed-file order across themes", () => {
    const file = seed({ Animals: ["Fox"], "Ocean Machines": ["Alvin"] });
    expect(planInserts(file, new Set())).toEqual([
      { theme: "Animals", card: "Fox" },
      { theme: "Ocean Machines", card: "Alvin" },
    ]);
  });

  it("treats the same card name in different themes as different cards", () => {
    const file = seed({ A: ["Shared"], B: ["Shared"] });
    const published = new Set([cardKey("A", "Shared")]);
    expect(planInserts(file, published)).toEqual([{ theme: "B", card: "Shared" }]);
  });
});
