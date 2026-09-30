import { describe, it, expect } from "vitest";
import { parseSeedArgs, SeedArgsError, type Command } from "../scripts/seed/args";

function parse(argv: string[]): Command {
  return parseSeedArgs(argv);
}

function rejects(argv: string[]): string {
  try {
    parseSeedArgs(argv);
  } catch (err) {
    expect(err).toBeInstanceOf(SeedArgsError);
    return (err as SeedArgsError).message;
  }
  throw new Error(`expected parseSeedArgs(${JSON.stringify(argv)}) to throw`);
}

describe("parseSeedArgs (A2)", () => {
  describe("commands", () => {
    it("defaults to review with no flags", () => {
      expect(parse([])).toEqual({ kind: "review", providers: undefined });
    });

    it("accepts an explicit --review", () => {
      expect(parse(["--review"])).toEqual({ kind: "review", providers: undefined });
    });

    it("parses --review --providers=a,b", () => {
      expect(parse(["--review", "--providers=a,b"])).toEqual({
        kind: "review",
        providers: ["a", "b"],
      });
    });

    it("trims and drops empty entries in --providers", () => {
      expect(parse(["--review", "--providers= a , ,b "])).toEqual({
        kind: "review",
        providers: ["a", "b"],
      });
    });

    it("parses bare --publish", () => {
      expect(parse(["--publish"])).toEqual({
        kind: "publish",
        reset: false,
        allowUnreviewed: false,
      });
    });

    it("parses --publish --reset", () => {
      expect(parse(["--publish", "--reset"])).toEqual({
        kind: "publish",
        reset: true,
        allowUnreviewed: false,
      });
    });

    it("parses --publish --allow-unreviewed", () => {
      expect(parse(["--publish", "--allow-unreviewed"])).toEqual({
        kind: "publish",
        reset: false,
        allowUnreviewed: true,
      });
    });

    it("parses bare --sync", () => {
      expect(parse(["--sync"])).toEqual({
        kind: "sync",
        allowPrune: false,
        allowUnreviewed: false,
      });
    });

    it("parses --sync --allow-prune --allow-unreviewed", () => {
      expect(parse(["--sync", "--allow-prune", "--allow-unreviewed"])).toEqual({
        kind: "sync",
        allowPrune: true,
        allowUnreviewed: true,
      });
    });

    for (const flag of ["check-images", "blob-budget", "check-urls", "supergrok-export"] as const) {
      it(`parses standalone --${flag}`, () => {
        expect(parse([`--${flag}`])).toEqual({ kind: flag });
      });
    }
  });

  describe("unknown flags are rejected, not silently accepted", () => {
    it("rejects a typo'd mode flag instead of defaulting to review", () => {
      rejects(["--sycn"]);
    });

    it("rejects an unrecognized flag entirely", () => {
      rejects(["--nonsense"]);
    });

    it("rejects a stray positional argument", () => {
      rejects(["review"]);
    });
  });

  describe("conflicting command flags are rejected, not resolved by line order", () => {
    it("rejects --sync --publish together", () => {
      rejects(["--sync", "--publish"]);
    });

    it("rejects --sync --check-urls together (previously silently ran only --check-urls)", () => {
      rejects(["--sync", "--check-urls"]);
    });

    it("rejects --review --sync together", () => {
      rejects(["--review", "--sync"]);
    });

    it("rejects --supergrok-export combined with --sync", () => {
      rejects(["--supergrok-export", "--sync"]);
    });

    it("rejects --supergrok-export combined with --publish", () => {
      rejects(["--supergrok-export", "--publish"]);
    });

    it("rejects --check-images --blob-budget together", () => {
      rejects(["--check-images", "--blob-budget"]);
    });
  });

  describe("modifier flags are scoped to the command that uses them", () => {
    it("rejects --reset without --publish", () => {
      rejects(["--reset"]);
    });

    it("rejects --sync --reset", () => {
      rejects(["--sync", "--reset"]);
    });

    it("rejects --allow-prune without --sync", () => {
      rejects(["--allow-prune"]);
    });

    it("rejects --publish --allow-prune", () => {
      rejects(["--publish", "--allow-prune"]);
    });

    it("rejects --allow-unreviewed on a command that never inserts", () => {
      rejects(["--check-urls", "--allow-unreviewed"]);
    });

    it("rejects bare --allow-unreviewed (defaults to review, which never inserts)", () => {
      rejects(["--allow-unreviewed"]);
    });

    it("rejects --providers outside --review (previously silently ignored)", () => {
      rejects(["--sync", "--providers=a"]);
    });

    it("rejects --publish --providers=a", () => {
      rejects(["--publish", "--providers=a"]);
    });
  });
});
