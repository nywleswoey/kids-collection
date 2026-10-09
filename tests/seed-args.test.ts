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

    it("parses --review --themes=a,b", () => {
      expect(parse(["--review", "--themes=Ice Age Beasts,Robots"])).toEqual({
        kind: "review",
        providers: undefined,
        themes: ["Ice Age Beasts", "Robots"],
      });
    });

    it("parses --sync --themes=a,b", () => {
      expect(parse(["--sync", "--themes=Ice Age Beasts,Robots"])).toEqual({
        kind: "sync",
        allowPrune: false,
        themes: ["Ice Age Beasts", "Robots"],
      });
    });

    it("trims and drops empty entries in --themes", () => {
      expect(parse(["--sync", "--themes= a , ,b "])).toEqual({
        kind: "sync",
        allowPrune: false,
        themes: ["a", "b"],
      });
    });

    it("parses bare --sync", () => {
      expect(parse(["--sync"])).toEqual({
        kind: "sync",
        allowPrune: false,
      });
    });

    it("parses --sync --allow-prune", () => {
      expect(parse(["--sync", "--allow-prune"])).toEqual({
        kind: "sync",
        allowPrune: true,
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
    it("rejects --sync --check-urls together (previously silently ran only --check-urls)", () => {
      rejects(["--sync", "--check-urls"]);
    });

    it("rejects --review --sync together", () => {
      rejects(["--review", "--sync"]);
    });

    it("rejects --supergrok-export combined with --sync", () => {
      rejects(["--supergrok-export", "--sync"]);
    });

    it("rejects --check-images --blob-budget together", () => {
      rejects(["--check-images", "--blob-budget"]);
    });
  });

  describe("modifier flags are scoped to the command that uses them", () => {
    it("rejects --allow-prune without --sync", () => {
      rejects(["--allow-prune"]);
    });

    it("rejects --providers outside --review (previously silently ignored)", () => {
      rejects(["--sync", "--providers=a"]);
    });

    it("rejects --themes outside --review/--sync", () => {
      rejects(["--check-urls", "--themes=a"]);
    });

    it("rejects an empty --themes", () => {
      rejects(["--sync", "--themes="]);
    });
  });

  describe("removed flags are unknown, not silently tolerated", () => {
    it("rejects --publish — the mode was removed (A3)", () => {
      rejects(["--publish"]);
    });

    it("rejects --reset — removed along with --publish (A3)", () => {
      rejects(["--reset"]);
    });

    it("rejects --allow-unreviewed — removed along with its publish-time generation path (A4)", () => {
      rejects(["--sync", "--allow-unreviewed"]);
    });
  });
});
