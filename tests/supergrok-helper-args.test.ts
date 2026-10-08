import { describe, expect, it } from "vitest";
import { parseSupergrokArgs, SupergrokArgsError } from "../scripts/supergrok-helper/args";

describe("parseSupergrokArgs", () => {
  it("parses the theme name with auto/auto-video defaulting to false", () => {
    expect(parseSupergrokArgs(["Ocean Machines"])).toEqual({
      themeName: "Ocean Machines",
      auto: false,
      autoVideo: false,
    });
  });

  it("parses --auto alongside the theme name, in either order", () => {
    expect(parseSupergrokArgs(["Ocean Machines", "--auto"])).toEqual({
      themeName: "Ocean Machines",
      auto: true,
      autoVideo: false,
    });
    expect(parseSupergrokArgs(["--auto", "Ocean Machines"])).toEqual({
      themeName: "Ocean Machines",
      auto: true,
      autoVideo: false,
    });
  });

  it("parses --auto-video alongside the theme name, in either order", () => {
    expect(parseSupergrokArgs(["Ocean Machines", "--auto-video"])).toEqual({
      themeName: "Ocean Machines",
      auto: false,
      autoVideo: true,
    });
    expect(parseSupergrokArgs(["--auto-video", "Ocean Machines"])).toEqual({
      themeName: "Ocean Machines",
      auto: false,
      autoVideo: true,
    });
  });

  it("throws SupergrokArgsError when --auto and --auto-video are both given", () => {
    expect(() => parseSupergrokArgs(["Ocean Machines", "--auto", "--auto-video"])).toThrow(
      SupergrokArgsError,
    );
  });

  it("throws SupergrokArgsError with no theme name", () => {
    expect(() => parseSupergrokArgs([])).toThrow(SupergrokArgsError);
    expect(() => parseSupergrokArgs(["--auto"])).toThrow(SupergrokArgsError);
  });

  it("throws SupergrokArgsError on an unknown flag", () => {
    expect(() => parseSupergrokArgs(["Ocean Machines", "--bogus"])).toThrow(SupergrokArgsError);
  });

  it("throws SupergrokArgsError on extra positional arguments", () => {
    expect(() => parseSupergrokArgs(["Ocean Machines", "Extra"])).toThrow(SupergrokArgsError);
  });
});
