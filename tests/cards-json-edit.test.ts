import { describe, expect, it } from "vitest";
import { applyThemePicks } from "../src/shared/pool/cards-json-edit";

/**
 * A small two-theme fixture, hand-formatted the same way the real
 * `scripts/seed/writer.ts` output looks (2-space indent, one field per
 * line, no trailing comma on the last field of an object).
 */
function fixture(): string {
  return `{
  "themes": [
    {
      "name": "Animals",
      "cards": [
        {
          "name": "Red Fox",
          "rarity": "common",
          "eduText": "x",
          "imagePrompt": "a fox",
          "sourceUrl": "https://example.com/fox"
        },
        {
          "name": "Sea Otter",
          "rarity": "common",
          "eduText": "y",
          "imagePrompt": "an otter",
          "sourceUrl": "https://example.com/otter"
        }
      ]
    },
    {
      "name": "Artillery",
      "provider": "cloudflare-sdxl",
      "cards": [
        {
          "name": "Catapult",
          "rarity": "common",
          "eduText": "z",
          "imagePrompt": "a catapult",
          "sourceUrl": "https://example.com/catapult",
          "provider": "pollinations"
        }
      ]
    }
  ]
}
`;
}

describe("applyThemePicks", () => {
  it("inserts the theme provider right after \"name\" and a card provider as the last field", () => {
    const result = applyThemePicks(fixture(), "Animals", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: { "Sea Otter": "supergrok-manual" },
    });

    expect(result).toContain(`"name": "Animals",\n      "provider": "cloudflare-sdxl",\n      "cards": [`);
    expect(result).toContain(
      `"sourceUrl": "https://example.com/otter",\n          "provider": "supergrok-manual"`,
    );
    // Red Fox had no override and gets none.
    expect(result).not.toMatch(/Red Fox[\s\S]{0,200}"provider"/);
    expect(JSON.parse(result)).toEqual({
      themes: [
        {
          name: "Animals",
          provider: "cloudflare-sdxl",
          cards: [
            { name: "Red Fox", rarity: "common", eduText: "x", imagePrompt: "a fox", sourceUrl: "https://example.com/fox" },
            {
              name: "Sea Otter",
              rarity: "common",
              eduText: "y",
              imagePrompt: "an otter",
              sourceUrl: "https://example.com/otter",
              provider: "supergrok-manual",
            },
          ],
        },
        {
          name: "Artillery",
          provider: "cloudflare-sdxl",
          cards: [
            {
              name: "Catapult",
              rarity: "common",
              eduText: "z",
              imagePrompt: "a catapult",
              sourceUrl: "https://example.com/catapult",
              provider: "pollinations",
            },
          ],
        },
      ],
    });
  });

  it("touches no field, no card, and no theme outside the targeted theme", () => {
    const original = fixture();
    const result = applyThemePicks(original, "Animals", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: {},
    });
    // The other theme's text is byte-identical.
    const artilleryStart = result.indexOf('"name": "Artillery"');
    const originalArtilleryStart = original.indexOf('"name": "Artillery"');
    expect(result.slice(artilleryStart)).toBe(original.slice(originalArtilleryStart));
  });

  it("updates an existing theme provider and an existing card provider in place", () => {
    const result = applyThemePicks(fixture(), "Artillery", {
      themeProvider: "supergrok-manual",
      cardOverrides: { Catapult: "supergrok-manual" },
    });
    expect(result).toContain('"name": "Artillery",\n      "provider": "supergrok-manual",\n      "cards"');
    expect(result).toContain('"sourceUrl": "https://example.com/catapult",\n          "provider": "supergrok-manual"');
    expect(JSON.parse(result).themes[1].provider).toBe("supergrok-manual");
    expect(JSON.parse(result).themes[1].cards[0].provider).toBe("supergrok-manual");
  });

  it("removes a card's stale provider override when it's no longer in cardOverrides (idempotent replace)", () => {
    const result = applyThemePicks(fixture(), "Artillery", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: {}, // Catapult's existing "pollinations" override is no longer wanted.
    });
    expect(JSON.parse(result).themes[1].cards[0]).not.toHaveProperty("provider");
    // No trailing comma left behind after "sourceUrl".
    expect(result).toContain('"sourceUrl": "https://example.com/catapult"\n        }');
  });

  it("is idempotent: applying the same picks twice yields the same text", () => {
    const once = applyThemePicks(fixture(), "Animals", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: { "Sea Otter": "supergrok-manual" },
    });
    const twice = applyThemePicks(once, "Animals", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: { "Sea Otter": "supergrok-manual" },
    });
    expect(twice).toBe(once);
  });

  it("replaces a theme's previous picks: a card no longer overridden loses its provider, a new one gains it", () => {
    const first = applyThemePicks(fixture(), "Artillery", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: { Catapult: "pollinations" },
    });
    const second = applyThemePicks(first, "Artillery", {
      themeProvider: "pollinations",
      cardOverrides: {}, // Catapult's override is dropped; theme default takes over.
    });
    const parsed = JSON.parse(second);
    expect(parsed.themes[1].provider).toBe("pollinations");
    expect(parsed.themes[1].cards[0]).not.toHaveProperty("provider");
  });

  it("throws, naming the theme, when no theme with that name exists", () => {
    expect(() =>
      applyThemePicks(fixture(), "Nonexistent Theme", { themeProvider: "cloudflare-sdxl", cardOverrides: {} }),
    ).toThrow(/Nonexistent Theme/);
  });

  it("round-trips through JSON.parse to the same semantic content for an unrelated theme's fields", () => {
    const result = applyThemePicks(fixture(), "Animals", {
      themeProvider: "cloudflare-sdxl",
      cardOverrides: {},
    });
    const before = JSON.parse(fixture());
    const after = JSON.parse(result);
    expect(after.themes[1]).toEqual(before.themes[1]);
  });
});
