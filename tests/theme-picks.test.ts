import { describe, expect, it } from "vitest";
import { deriveThemePicks, resolveProviderAlias, ThemePicksError, type CardRecommendation } from "../src/shared/pool/theme-picks";

const PROVIDER_IDS = ["cloudflare-sdxl", "supergrok-manual"];

function recs(entries: Record<string, string | undefined>): Map<string, CardRecommendation> {
  return new Map(Object.entries(entries).map(([name, providerId]) => [name, { providerId }]));
}

describe("resolveProviderAlias", () => {
  it("passes through an already-registered id unchanged", () => {
    expect(resolveProviderAlias("cloudflare-sdxl", PROVIDER_IDS)).toBe("cloudflare-sdxl");
  });

  it("resolves the grok and cloudflare aliases", () => {
    expect(resolveProviderAlias("grok", PROVIDER_IDS)).toBe("supergrok-manual");
    expect(resolveProviderAlias("cloudflare", PROVIDER_IDS)).toBe("cloudflare-sdxl");
  });

  it("returns an unknown token unchanged so the caller's validation names it", () => {
    expect(resolveProviderAlias("bogus", PROVIDER_IDS)).toBe("bogus");
  });
});

describe("deriveThemePicks", () => {
  const cardNames = ["A", "B", "C"];

  it("picks the majority provider as the theme default, with no card overrides when all agree", () => {
    const result = deriveThemePicks({
      cardNames,
      recommendations: recs({ A: "cloudflare-sdxl", B: "cloudflare-sdxl", C: "cloudflare-sdxl" }),
      overrides: new Map(),
      providerIds: PROVIDER_IDS,
    });
    expect(result.themeProvider).toBe("cloudflare-sdxl");
    expect(result.cardOverrides).toEqual({});
    expect(result.counts).toEqual({ total: 3, fromOverride: 0, differFromThemeProvider: 0 });
  });

  it("records a sparse override only for the card(s) that differ from the majority", () => {
    const result = deriveThemePicks({
      cardNames,
      recommendations: recs({ A: "cloudflare-sdxl", B: "cloudflare-sdxl", C: "supergrok-manual" }),
      overrides: new Map(),
      providerIds: PROVIDER_IDS,
    });
    expect(result.themeProvider).toBe("cloudflare-sdxl");
    expect(result.cardOverrides).toEqual({ C: "supergrok-manual" });
  });

  it("breaks a genuine tie toward whichever provider reaches the max count first, in theme order", () => {
    const fourCards = ["A", "B", "C", "D"];
    const result = deriveThemePicks({
      cardNames: fourCards,
      // A, C -> supergrok-manual; B, D -> cloudflare-sdxl: a 2-2 tie, but
      // supergrok-manual reaches 2 at card C, before cloudflare-sdxl reaches
      // 2 at card D.
      recommendations: recs({
        A: "supergrok-manual",
        B: "cloudflare-sdxl",
        C: "supergrok-manual",
        D: "cloudflare-sdxl",
      }),
      overrides: new Map(),
      providerIds: PROVIDER_IDS,
    });
    expect(result.themeProvider).toBe("supergrok-manual");
    expect(result.cardOverrides).toEqual({ B: "cloudflare-sdxl", D: "cloudflare-sdxl" });
  });

  it("an --use override wins over the judge's recommendation for that card", () => {
    const result = deriveThemePicks({
      cardNames,
      recommendations: recs({ A: "cloudflare-sdxl", B: "cloudflare-sdxl", C: "cloudflare-sdxl" }),
      overrides: new Map([["C", "supergrok-manual"]]),
      providerIds: PROVIDER_IDS,
    });
    expect(result.themeProvider).toBe("cloudflare-sdxl");
    expect(result.cardOverrides).toEqual({ C: "supergrok-manual" });
    expect(result.counts.fromOverride).toBe(1);
  });

  it("refuses, naming every unjudged/missing card with no override, and writes nothing", () => {
    expect(() =>
      deriveThemePicks({
        cardNames,
        recommendations: recs({ A: "cloudflare-sdxl", B: undefined, C: undefined }),
        overrides: new Map(),
        providerIds: PROVIDER_IDS,
      }),
    ).toThrow(ThemePicksError);

    try {
      deriveThemePicks({
        cardNames,
        recommendations: recs({ A: "cloudflare-sdxl", B: undefined, C: undefined }),
        overrides: new Map(),
        providerIds: PROVIDER_IDS,
      });
    } catch (err) {
      expect((err as Error).message).toContain("B");
      expect((err as Error).message).toContain("C");
    }
  });

  it("does not refuse when every unjudged card has an override", () => {
    const result = deriveThemePicks({
      cardNames,
      recommendations: recs({ A: "cloudflare-sdxl", B: undefined, C: undefined }),
      overrides: new Map([
        ["B", "supergrok-manual"],
        ["C", "supergrok-manual"],
      ]),
      providerIds: PROVIDER_IDS,
    });
    expect(result.themeProvider).toBe("supergrok-manual");
    expect(result.cardOverrides).toEqual({ A: "cloudflare-sdxl" });
  });

  it("refuses an --use naming a card not in this theme, by name", () => {
    expect(() =>
      deriveThemePicks({
        cardNames,
        recommendations: recs({ A: "cloudflare-sdxl", B: "cloudflare-sdxl", C: "cloudflare-sdxl" }),
        overrides: new Map([["Nonexistent Card", "cloudflare-sdxl"]]),
        providerIds: PROVIDER_IDS,
      }),
    ).toThrow(/Nonexistent Card/);
  });

  it("refuses an --use naming an unregistered provider id, by name", () => {
    expect(() =>
      deriveThemePicks({
        cardNames,
        recommendations: recs({ A: "cloudflare-sdxl", B: "cloudflare-sdxl", C: "cloudflare-sdxl" }),
        overrides: new Map([["A", "not-a-real-provider"]]),
        providerIds: PROVIDER_IDS,
      }),
    ).toThrow(/not-a-real-provider/);
  });
});
