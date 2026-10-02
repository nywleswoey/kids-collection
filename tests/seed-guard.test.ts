import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { confirmDestructive, DestructiveOperationAborted } from "../scripts/seed/guard";
import type { BlastRadius } from "@/shared/pool/blast-radius";

/**
 * The destructive-operation guard (Inc23 FR4–FR6). Its only input channel is a
 * TTY, so what is testable without one is exactly the part that matters most:
 * a local target is reported and passes, and a production target with no TTY
 * is refused rather than waved through.
 */

const RADIUS: BlastRadius = {
  themes: 1,
  cards: 30,
  collectionRows: 42,
  perChild: [{ name: "Ada", rows: 42 }],
  themeNames: ["Dropped"],
  cardNames: [],
};

let printed: string[];
let isTTY: boolean | undefined;

beforeEach(() => {
  printed = [];
  vi.spyOn(console, "log").mockImplementation((...args) => {
    printed.push(args.join(" "));
  });
  isTTY = process.stdin.isTTY;
  Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process.stdin, "isTTY", { value: isTTY, configurable: true });
});

describe("confirmDestructive", () => {
  it("reports the blast radius and proceeds against a local target", async () => {
    await expect(
      confirmDestructive({ target: "localhost:5499", isProduction: false, radius: RADIUS }),
    ).resolves.toBeUndefined();

    const report = printed.join("\n");
    expect(report).toContain("SEED PRUNE");
    expect(report).toContain("Collection rows lost:  42");
    expect(report).toContain("Ada");
  });

  it("refuses a production prune when stdin is not a terminal", async () => {
    await expect(
      confirmDestructive({ target: "prod.example", isProduction: true, radius: RADIUS }),
    ).rejects.toBeInstanceOf(DestructiveOperationAborted);
    expect(printed.join("\n")).toContain("PRODUCTION");
  });
});
