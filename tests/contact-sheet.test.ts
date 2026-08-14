import { describe, it, expect } from "vitest";
import {
  planContactSheet,
  renderContactSheet,
  type SheetDeps,
  type SheetTheme,
} from "@/features/pool/contact-sheet";
import { reviewFileName } from "@/features/pool/review-files";
import { fakeProvider } from "@/features/pool/providers/fake";

/**
 * Checkpoint 2's artifact (#63 Step 7, #67).
 *
 * The regression these exist for: the runbook's previous inline script filtered
 * review files for `.jpg` and took the FIRST match per card. Against #67's
 * filenames that drops every PNG-producing provider and renders one candidate
 * where a bake-off has N — and it reported neither, so the sheet looked complete
 * while showing a single provider. A human would approve a bake-off they never saw.
 */

const jpegProvider = { ...fakeProvider({ id: "pollinations" }), format: "jpeg" as const };
const pngProvider = fakeProvider({ id: "cloudflare-sdxl" }); // fake is png
const PROVIDERS = [jpegProvider, pngProvider];

const cards = [
  { name: "Longbowman", rarity: "common", eduText: "Shot far.", imagePrompt: "a longbowman" },
  { name: "Paladin", rarity: "legendary", eduText: "Rode ahead.", imagePrompt: "a paladin" },
];

function deps(onDisk: readonly string[], sidecars: Record<string, { model?: string }> = {}): SheetDeps {
  const set = new Set(onDisk);
  return {
    exists: (f) => set.has(f),
    readSidecar: (f) => sidecars[f],
    listFiles: () => onDisk,
  };
}

function allFiles(theme: SheetTheme): string[] {
  return theme.cards.flatMap((c) => PROVIDERS.map((p) => reviewFileName(theme.name, c, p)));
}

describe("planContactSheet — the grid (#63)", () => {
  const theme: SheetTheme = { name: "Warriors", provider: "pollinations", cards };

  it("gives every card a cell for every provider", () => {
    const sheet = planContactSheet(theme, PROVIDERS, deps(allFiles(theme)));
    expect(sheet.rows).toHaveLength(2);
    for (const row of sheet.rows) expect(row.candidates.map((c) => c.providerId)).toEqual([
      "pollinations",
      "cloudflare-sdxl",
    ]);
    expect(sheet.missing).toBe(0);
  });

  it("does NOT drop a candidate because of its extension — the old bug", () => {
    // The previous script filtered for `.jpg`, so every Cloudflare PNG vanished
    // and the sheet silently showed one provider.
    const sheet = planContactSheet(theme, PROVIDERS, deps(allFiles(theme)));
    const files = sheet.rows.flatMap((r) => r.candidates.map((c) => c.fileName));
    expect(files.some((f) => f.endsWith(".jpg"))).toBe(true);
    expect(files.some((f) => f.endsWith(".png"))).toBe(true);
    expect(sheet.rows.every((r) => r.candidates.every((c) => c.present))).toBe(true);
  });

  it("orders rows legendary first", () => {
    const sheet = planContactSheet(theme, PROVIDERS, deps(allFiles(theme)));
    expect(sheet.rows.map((r) => r.name)).toEqual(["Paladin", "Longbowman"]);
  });

  it("marks the candidate --sync would publish", () => {
    const sheet = planContactSheet(theme, PROVIDERS, deps(allFiles(theme)));
    for (const row of sheet.rows) {
      expect(row.candidates.filter((c) => c.isPick).map((c) => c.providerId)).toEqual([
        "pollinations",
      ]);
    }
  });

  it("honours a per-card override over the theme default", () => {
    const overridden: SheetTheme = {
      ...theme,
      cards: [{ ...cards[0], provider: "cloudflare-sdxl" }, cards[1]],
    };
    const sheet = planContactSheet(overridden, PROVIDERS, deps(allFiles(overridden)));
    const longbowman = sheet.rows.find((r) => r.name === "Longbowman")!;
    expect(longbowman.resolvedProvider).toBe("cloudflare-sdxl");
  });

  it("labels a cell with the model the response NAMED (#64)", () => {
    const file = reviewFileName("Warriors", cards[0], jpegProvider);
    const sheet = planContactSheet(theme, PROVIDERS, {
      ...deps(allFiles(theme)),
      readSidecar: (f) => (f === file.replace(/\.jpg$/, ".json") ? { model: "sana" } : undefined),
    });
    const cell = sheet.rows
      .find((r) => r.name === "Longbowman")!
      .candidates.find((c) => c.providerId === "pollinations")!;
    expect(cell.model).toBe("sana");
  });
});

describe("planContactSheet — the three absences it must not hide", () => {
  const theme: SheetTheme = { name: "Warriors", provider: "pollinations", cards };

  it("counts a provider that produced nothing, rather than omitting its column", () => {
    // A lane that died or was never run must be visibly empty. Omitting it would
    // read as a bake-off that never meant to include it.
    const onlyJpeg = theme.cards.map((c) => reviewFileName(theme.name, c, jpegProvider));
    const sheet = planContactSheet(theme, PROVIDERS, deps(onlyJpeg));
    expect(sheet.providerIds).toContain("cloudflare-sdxl");
    expect(sheet.missing).toBe(2);
    const cf = sheet.rows.flatMap((r) => r.candidates.filter((c) => c.providerId === "cloudflare-sdxl"));
    expect(cf.every((c) => !c.present)).toBe(true);
  });

  it("counts cards with no pick — the ones --sync will refuse", () => {
    const unjudged: SheetTheme = { name: "Warriors", cards };
    const sheet = planContactSheet(unjudged, PROVIDERS, deps(allFiles(unjudged)));
    expect(sheet.unpicked).toBe(2);
    expect(sheet.rows.every((r) => r.resolvedProvider === undefined)).toBe(true);
  });

  it("reports files belonging to no registered provider", () => {
    // A rename or a retirement leaves candidates behind. Column-driven rendering
    // cannot show them, so they are found by scanning instead.
    const orphan = "warriors-longbowman-deadbeef-ai-horde-1234.webp";
    const sheet = planContactSheet(theme, PROVIDERS, deps([...allFiles(theme), orphan]));
    expect(sheet.orphans).toEqual([orphan]);
  });

  it("does not mistake sidecars or a previous sheet for orphans", () => {
    const sheet = planContactSheet(
      theme,
      PROVIDERS,
      deps([...allFiles(theme), "warriors-longbowman-x-pollinations-1.json", "warriors-review.html"]),
    );
    expect(sheet.orphans).toEqual([]);
  });

  it("ignores files from another theme", () => {
    const sheet = planContactSheet(theme, PROVIDERS, deps([...allFiles(theme), "ocean-machines-alvin-a-b-c.png"]));
    expect(sheet.orphans).toEqual([]);
  });
});

describe("renderContactSheet", () => {
  const theme: SheetTheme = { name: "Warriors", provider: "pollinations", cards };

  it("renders one column per provider and marks the pick", () => {
    const html = renderContactSheet(planContactSheet(theme, PROVIDERS, deps(allFiles(theme))));
    expect(html).toContain("<th>pollinations</th>");
    expect(html).toContain("<th>cloudflare-sdxl</th>");
    expect(html).toContain('class="pick"');
    expect(html).toContain(".png");
    expect(html).toContain(".jpg");
  });

  it("puts each absence on the page, not just in the console", () => {
    const unjudged: SheetTheme = { name: "Warriors", cards };
    const html = renderContactSheet(
      planContactSheet(unjudged, PROVIDERS, deps(["nope.png", "warriors-stray-a-b-c.png"])),
    );
    expect(html).toContain("no provider chosen");
    expect(html).toContain("candidate(s) missing");
    expect(html).toContain("no registered provider");
    expect(html).toContain("MISSING");
  });

  it("escapes card text rather than letting it into the markup", () => {
    const nasty: SheetTheme = {
      name: "Warriors",
      provider: "pollinations",
      cards: [{ name: "<script>x</script>", rarity: "common", eduText: "a & b", imagePrompt: "p" }],
    };
    const html = renderContactSheet(planContactSheet(nasty, PROVIDERS, deps([])));
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b");
  });
});
