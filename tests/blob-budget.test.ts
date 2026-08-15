import { describe, it, expect } from "vitest";
import {
  BLOB_STORAGE_CEILING_BYTES,
  WARN_FRACTION,
  buildBlobBudget,
  formatBytes,
  readStoreObjects,
  summariseWeights,
  themesThatFit,
  type StoredObject,
} from "@/features/pool/blob-budget";

const CARDS_PER_THEME = 30;

/** A store object the way `list()` reports one. */
function obj(pathname: string, size: number, suffix = "x"): StoredObject {
  return { pathname, size, url: `https://store.example/${pathname}-${suffix}` };
}

describe("weight summary", () => {
  it("reports the shape of a set of weights, not just their total", () => {
    // A mean alone hides the distribution, and the distribution is the thing that
    // decides whether a projection is worth trusting.
    const s = summariseWeights([10, 20, 30, 40, 900]);
    expect(s.count).toBe(5);
    expect(s.totalBytes).toBe(1000);
    expect(s.meanBytes).toBe(200);
    expect(s.medianBytes).toBe(30);
    expect(s.maxBytes).toBe(900);
  });

  it("summarises an empty pool without dividing by zero", () => {
    expect(summariseWeights([])).toEqual({
      count: 0,
      totalBytes: 0,
      meanBytes: 0,
      medianBytes: 0,
      maxBytes: 0,
    });
  });
});

describe("byte formatting", () => {
  it("uses DECIMAL units, so a figure reads across to Vercel's usage page", () => {
    // The store held 31,363,297 bytes on 2026-08-15 and the dashboard printed
    // "31.36 MB / 1 GB". Binary units would print 29.91 and invite an argument
    // about a 5% discrepancy that does not exist.
    expect(formatBytes(31_363_297)).toBe("31.36 MB");
    expect(formatBytes(BLOB_STORAGE_CEILING_BYTES)).toBe("1.00 GB");
  });
});

describe("how many more themes fit", () => {
  it("counts WHOLE themes — half a theme is not a theme you can publish", () => {
    // 2.5 themes' worth of room is two themes and a refusal, because a whole
    // theme is the publish unit and a run that stops at card 17 has failed.
    expect(themesThatFit(2_500, 100, 10)).toBe(2);
  });

  it("is zero when the next theme does not fit, never negative", () => {
    expect(themesThatFit(100, 826_000, CARDS_PER_THEME)).toBe(0);
    expect(themesThatFit(-1, 826_000, CARDS_PER_THEME)).toBe(0);
  });

  it("separates the two lanes by the factor #79 is about", () => {
    // The measured per-card weights: the published pool's own mean against
    // Cloudflare SDXL's. Same free space, an order of magnitude apart in themes.
    const free = 968_600_000;
    expect(themesThatFit(free, 77_800, CARDS_PER_THEME)).toBeGreaterThan(400);
    expect(themesThatFit(free, 826_000, CARDS_PER_THEME)).toBeLessThan(45);
  });
});

describe("blob budget", () => {
  const lanes = [
    { id: "pollinations", typicalCardBytes: 77_800 },
    { id: "cloudflare-sdxl", typicalCardBytes: 826_000 },
  ];

  it("measures the STORE, so bytes no card points at are still bytes stored", () => {
    // The reason this reads `list()` rather than summing the DB's image URLs:
    // a re-publish leaves the old object behind, and the allowance is charged for
    // it either way. Summing what the pool references would under-report.
    const budget = buildBlobBudget({
      objects: [obj("cards/a.jpg", 100), obj("cards/a.jpg", 400, "old"), obj("cards/b.jpg", 500)],
      liveUrls: new Set(["https://store.example/cards/a.jpg-x", "https://store.example/cards/b.jpg-x"]),
      lanes,
      cardsPerTheme: CARDS_PER_THEME,
    });
    expect(budget.store.count).toBe(3);
    expect(budget.store.totalBytes).toBe(1000);
    expect(budget.orphans).toEqual({ count: 1, bytes: 400 });
  });

  it("projects a lane's remaining themes from its own declared weight", () => {
    const budget = buildBlobBudget({
      objects: [obj("cards/a.jpg", 31_363_297)],
      liveUrls: new Set(["https://store.example/cards/a.jpg-x"]),
      lanes,
      cardsPerTheme: CARDS_PER_THEME,
    });
    const sdxl = budget.projections.find((p) => p.id === "cloudflare-sdxl")!;
    expect(sdxl.perCardBytes).toBe(826_000);
    expect(sdxl.themes).toBe(themesThatFit(budget.freeBytes, 826_000, CARDS_PER_THEME));
  });

  it("says UNMEASURED for a lane that declares no weight, rather than guessing one", () => {
    // Same discipline as `provenance.model`: a provider that witnesses nothing
    // gets a null, never a number back-filled from something adjacent.
    const budget = buildBlobBudget({
      objects: [obj("cards/a.jpg", 100)],
      liveUrls: new Set(),
      lanes: [{ id: "ai-horde" }],
      cardsPerTheme: CARDS_PER_THEME,
    });
    expect(budget.projections).toEqual([{ id: "ai-horde", perCardBytes: null, themes: null }]);
  });

  it("raises the warning line before the ceiling, not at it", () => {
    // A report that only speaks up once the store is full is a report about an
    // outage. The whole point is to be told during the run BEFORE the one that
    // fails.
    const nearly = Math.ceil(BLOB_STORAGE_CEILING_BYTES * WARN_FRACTION) + 1;
    const budget = buildBlobBudget({
      objects: [obj("cards/a.jpg", nearly)],
      liveUrls: new Set(),
      lanes,
      cardsPerTheme: CARDS_PER_THEME,
    });
    expect(budget.overWarnLine).toBe(true);
    expect(budget.usedFraction).toBeGreaterThan(WARN_FRACTION);
    expect(budget.freeBytes).toBe(BLOB_STORAGE_CEILING_BYTES - nearly);
  });

  it("does not report negative free space once the ceiling is passed", () => {
    const budget = buildBlobBudget({
      objects: [obj("cards/a.jpg", BLOB_STORAGE_CEILING_BYTES * 2)],
      liveUrls: new Set(),
      lanes,
      cardsPerTheme: CARDS_PER_THEME,
    });
    expect(budget.freeBytes).toBe(0);
    expect(budget.projections.every((p) => p.themes === 0)).toBe(true);
  });
});

describe("reading the store", () => {
  it("follows the cursor, because one page is not the store", () => {
    // 403 objects today against a 1000-object page, so a single-page read would
    // have been right by luck and wrong on the run that mattered.
    const pages = [
      { blobs: [{ pathname: "a", url: "u/a", size: 1 }], cursor: "next" },
      { blobs: [{ pathname: "b", url: "u/b", size: 2 }], cursor: undefined },
    ];
    let n = 0;
    return readStoreObjects(async () => pages[n++]).then((objects) => {
      expect(objects).toEqual([
        { pathname: "a", url: "u/a", size: 1 },
        { pathname: "b", url: "u/b", size: 2 },
      ]);
      expect(n).toBe(2);
    });
  });
});
