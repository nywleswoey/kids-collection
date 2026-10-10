import { describe, expect, it } from "vitest";
import { parseThemePicksArgs, ThemePicksArgsError } from "../scripts/theme-picks/args";

describe("parseThemePicksArgs", () => {
  it("parses a single positional theme name with no overrides", () => {
    expect(parseThemePicksArgs(["Ocean Machines"])).toEqual({ themeName: "Ocean Machines", uses: [] });
  });

  it("parses one --use override, splitting on the first '='", () => {
    expect(parseThemePicksArgs(["Artillery", "--use", "Mons Meg=cloudflare-sdxl"])).toEqual({
      themeName: "Artillery",
      uses: [{ cardName: "Mons Meg", providerRaw: "cloudflare-sdxl" }],
    });
  });

  it("accepts repeated --use flags", () => {
    expect(
      parseThemePicksArgs(["Artillery", "--use", "Mons Meg=grok", "--use", "Catapult=cloudflare"]),
    ).toEqual({
      themeName: "Artillery",
      uses: [
        { cardName: "Mons Meg", providerRaw: "grok" },
        { cardName: "Catapult", providerRaw: "cloudflare" },
      ],
    });
  });

  it("splits only on the first '=' so a provider id with '=' in it is preserved", () => {
    expect(parseThemePicksArgs(["Artillery", "--use", "Mons Meg=a=b"])).toEqual({
      themeName: "Artillery",
      uses: [{ cardName: "Mons Meg", providerRaw: "a=b" }],
    });
  });

  it("throws usage with no positional", () => {
    expect(() => parseThemePicksArgs([])).toThrow(ThemePicksArgsError);
  });

  it("throws on an extra positional argument", () => {
    expect(() => parseThemePicksArgs(["Artillery", "extra"])).toThrow(/extra argument/);
  });

  it("throws on an unrecognized flag", () => {
    expect(() => parseThemePicksArgs(["Artillery", "--bogus"])).toThrow(ThemePicksArgsError);
  });

  it("throws on a --use with no '='", () => {
    expect(() => parseThemePicksArgs(["Artillery", "--use", "Mons Meg"])).toThrow(/must be of the form/);
  });

  it("throws on a --use with an empty card name or empty provider", () => {
    expect(() => parseThemePicksArgs(["Artillery", "--use", "=cloudflare-sdxl"])).toThrow(ThemePicksArgsError);
    expect(() => parseThemePicksArgs(["Artillery", "--use", "Mons Meg="])).toThrow(ThemePicksArgsError);
  });
});
