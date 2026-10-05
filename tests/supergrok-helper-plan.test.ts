import { describe, expect, it } from "vitest";
import { planThemeEntries, ThemeNotFoundError } from "../scripts/supergrok-helper/plan";
import { buildPrompt } from "@/shared/pool/prompt";
import { manualDropStem } from "@/shared/pool/manual-brief";
import type { SeedFile } from "@/shared/pool/seed-schema";

const seed = {
  themes: [
    {
      name: "Warriors",
      cards: [
        { name: "Longbowman", imagePrompt: "a cheerful archer" },
        { name: "Paladin", imagePrompt: "a knight on grass" },
      ],
    },
    {
      name: "Outer Space",
      cards: [{ name: "Voyager 1", imagePrompt: "a space probe" }],
    },
  ],
} as SeedFile;

describe("planThemeEntries", () => {
  it("lists every card of the named theme, in seed order, regardless of published status", () => {
    const entries = planThemeEntries(seed, "Warriors");
    expect(entries.map((e) => e.card)).toEqual(["Longbowman", "Paladin"]);
    expect(entries[0]!.theme).toBe("Warriors");
    expect(entries[0]!.prompt).toBe(buildPrompt(seed.themes[0]!.cards[0]!));
    expect(entries[0]!.fileName).toBe(
      `${manualDropStem("Warriors", "Longbowman", entries[0]!.prompt)}.png`,
    );
  });

  it("never includes cards from a different theme", () => {
    const entries = planThemeEntries(seed, "Outer Space");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.card).toBe("Voyager 1");
  });

  it("throws ThemeNotFoundError, naming every known theme, for an unknown name", () => {
    expect(() => planThemeEntries(seed, "Sea Life")).toThrow(ThemeNotFoundError);
    try {
      planThemeEntries(seed, "Sea Life");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ThemeNotFoundError);
      expect((err as ThemeNotFoundError).knownThemes).toEqual(["Warriors", "Outer Space"]);
    }
  });

  it("returns an empty list for a theme with no cards", () => {
    const empty = { themes: [{ name: "Empty", cards: [] }] } as SeedFile;
    expect(planThemeEntries(empty, "Empty")).toEqual([]);
  });
});
