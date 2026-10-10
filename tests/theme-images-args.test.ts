import { describe, expect, it } from "vitest";
import { parseThemeImagesArgs, ThemeImagesArgsError } from "../scripts/theme-images/args";

describe("parseThemeImagesArgs", () => {
  it("parses a single positional theme name", () => {
    expect(parseThemeImagesArgs(["Ocean Machines"])).toEqual({ themeName: "Ocean Machines" });
  });

  it("throws usage with no positional", () => {
    expect(() => parseThemeImagesArgs([])).toThrow(ThemeImagesArgsError);
  });

  it("throws on an extra positional argument", () => {
    expect(() => parseThemeImagesArgs(["Ocean Machines", "extra"])).toThrow(/extra argument/);
  });

  it("throws on an unrecognized flag", () => {
    expect(() => parseThemeImagesArgs(["Ocean Machines", "--bogus"])).toThrow(ThemeImagesArgsError);
  });
});
