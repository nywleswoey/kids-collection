import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildAutoPrompt,
  isAutoCardFailure,
  pickProducedImage,
  runAutoCard,
  type GrokRunResult,
  type GrokRunner,
} from "../scripts/supergrok-helper/auto";
import type { ManualBriefEntry } from "../src/shared/pool/manual-brief";

describe("buildAutoPrompt", () => {
  it("carries the exact card prompt verbatim plus square/save-path instructions", () => {
    const prompt = buildAutoPrompt("a cheerful archer, ART_STYLE", "/tmp/out/foo.png");
    expect(prompt).toContain("a cheerful archer, ART_STYLE");
    expect(prompt).toContain("square (1:1 aspect ratio)");
    expect(prompt).toContain("/tmp/out/foo.png");
  });
});

describe("pickProducedImage", () => {
  it("prefers the exact expected name when present", () => {
    expect(pickProducedImage(["card.png", "card.jpg"], "card.png")).toBe("card.png");
  });

  it("falls back to the sole image file when the expected name is missing", () => {
    expect(pickProducedImage(["card.jpg"], "card.png")).toBe("card.jpg");
  });

  it("is undefined with no image files", () => {
    expect(pickProducedImage(["notes.txt"], "card.png")).toBeUndefined();
  });

  it("is undefined when ambiguous (multiple stray images, none matching)", () => {
    expect(pickProducedImage(["a.jpg", "b.webp"], "card.png")).toBeUndefined();
  });
});

describe("runAutoCard", () => {
  const entry: ManualBriefEntry = {
    theme: "Warriors",
    card: "Longbowman",
    prompt: "a cheerful archer",
    fileName: "warriors-longbowman-abcd1234.png",
  };

  let dropDir: string;

  afterEach(() => {
    if (dropDir) rmSync(dropDir, { recursive: true, force: true });
  });

  it("moves the produced image into the drop folder on success", () => {
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-drop-"));
    const runner: GrokRunner = (_prompt, cwd): GrokRunResult => {
      writeFileSync(join(cwd, entry.fileName), "fake-png-bytes");
      return { ok: true, timedOut: false };
    };

    const result = runAutoCard(entry, { dropDir, runner });
    expect(isAutoCardFailure(result)).toBe(false);
    if (!isAutoCardFailure(result)) {
      expect(result.fileName).toBe(entry.fileName);
    }
  });

  it("keeps the downloaded extension when it differs from the suggested one", () => {
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-drop-"));
    const runner: GrokRunner = (_prompt, cwd): GrokRunResult => {
      writeFileSync(join(cwd, "whatever.jpg"), "fake-jpg-bytes");
      return { ok: true, timedOut: false };
    };

    const result = runAutoCard(entry, { dropDir, runner });
    expect(isAutoCardFailure(result)).toBe(false);
    if (!isAutoCardFailure(result)) {
      expect(result.fileName).toBe("warriors-longbowman-abcd1234.jpg");
    }
  });

  it("reports a failure, without moving anything, when the runner times out", () => {
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-drop-"));
    const runner: GrokRunner = (): GrokRunResult => ({ ok: false, timedOut: true });

    const result = runAutoCard(entry, { dropDir, runner });
    expect(isAutoCardFailure(result)).toBe(true);
    if (isAutoCardFailure(result)) {
      expect(result.card).toBe("Longbowman");
      expect(result.reason).toMatch(/timed out/);
    }
  });

  it("reports a failure when the runner fails", () => {
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-drop-"));
    const runner: GrokRunner = (): GrokRunResult => ({
      ok: false,
      timedOut: false,
      error: "grok exited with status 1",
    });

    const result = runAutoCard(entry, { dropDir, runner });
    expect(isAutoCardFailure(result)).toBe(true);
    if (isAutoCardFailure(result)) {
      expect(result.reason).toBe("grok exited with status 1");
    }
  });

  it("reports a failure when grok exits ok but produces no image", () => {
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-drop-"));
    const runner: GrokRunner = (): GrokRunResult => ({ ok: true, timedOut: false });

    const result = runAutoCard(entry, { dropDir, runner });
    expect(isAutoCardFailure(result)).toBe(true);
    if (isAutoCardFailure(result)) {
      expect(result.reason).toMatch(/did not save/);
    }
  });
});
