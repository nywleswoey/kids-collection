import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  MAX_PULL_CATEGORIES,
  recentCategories,
} from "@/features/pull/categories";

const themesArb = fc.array(fc.string(), { maxLength: 30 });
const capArb = fc.integer({ min: 1, max: 20 });

describe("recentCategories (property)", () => {
  it("returns min(n, cap) categories", () => {
    fc.assert(
      fc.property(themesArb, capArb, (themes, cap) => {
        expect(recentCategories(themes, cap)).toHaveLength(
          Math.min(themes.length, cap),
        );
      }),
    );
  });

  it("returns the last cap entries — i.e. always the most recent", () => {
    fc.assert(
      fc.property(themesArb, capArb, (themes, cap) => {
        const got = recentCategories(themes, cap);
        expect(got).toEqual(themes.slice(Math.max(0, themes.length - cap)));
      }),
    );
  });

  it("preserves input order and invents nothing", () => {
    // Distinct entries so index lookups are unambiguous.
    fc.assert(
      fc.property(fc.uniqueArray(fc.string(), { maxLength: 30 }), capArb, (themes, cap) => {
        const got = recentCategories(themes, cap);
        const indexes = got.map((t) => themes.indexOf(t));
        expect(indexes.every((i) => i >= 0)).toBe(true);
        expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
      }),
    );
  });

  it("returns the whole list unchanged when n <= cap", () => {
    fc.assert(
      fc.property(themesArb, capArb, (themes, cap) => {
        fc.pre(themes.length <= cap);
        expect(recentCategories(themes, cap)).toEqual(themes);
      }),
    );
  });

  it("never mutates its input", () => {
    fc.assert(
      fc.property(themesArb, capArb, (themes, cap) => {
        const before = [...themes];
        recentCategories(themes, cap);
        expect(themes).toEqual(before);
      }),
    );
  });
});

describe("recentCategories (edges)", () => {
  it("returns [] for an empty list", () => {
    expect(recentCategories([], 8)).toEqual([]);
  });

  it("returns [] for a non-positive cap", () => {
    expect(recentCategories(["a", "b"], 0)).toEqual([]);
    expect(recentCategories(["a", "b"], -3)).toEqual([]);
  });

  it("caps the pull screen at 8 categories, keeping the newest", () => {
    expect(MAX_PULL_CATEGORIES).toBe(8);

    // The live pool, oldest → newest as `listThemes()` orders it.
    const pool = [
      "Animals",
      "Mythic Creatures",
      "Dinosaurs",
      "Superheroes",
      "Country",
      "Famous People",
      "Weird Insects",
      "Special Plants",
      "Spooky Legends",
      "Deep Sea Creatures",
    ];

    expect(recentCategories(pool)).toEqual([
      "Dinosaurs",
      "Superheroes",
      "Country",
      "Famous People",
      "Weird Insects",
      "Special Plants",
      "Spooky Legends",
      "Deep Sea Creatures",
    ]);
  });
});
