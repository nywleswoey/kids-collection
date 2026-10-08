import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildAutoVideoPrompt,
  isAutoVideoFailure,
  runAutoVideoCard,
  type ConvertResult,
  type GrokVideoRunResult,
  type GrokVideoRunner,
  type VideoConverter,
} from "../scripts/supergrok-helper/auto-video";
import type { VideoEntry } from "../scripts/supergrok-helper/video-plan";

describe("buildAutoVideoPrompt", () => {
  it("carries the still's absolute path and the proven motion wording", () => {
    const prompt = buildAutoVideoPrompt("/tmp/review/paladin-still.png");
    expect(prompt).toContain("/tmp/review/paladin-still.png");
    expect(prompt).toContain("image_to_video");
    expect(prompt).toContain("subtle natural motion only");
    expect(prompt).toContain("Use defaults");
  });
});

describe("runAutoVideoCard", () => {
  const entry: VideoEntry = {
    theme: "Warriors",
    card: "Paladin",
    prompt: "a noble paladin",
    stillReviewFileName: "warriors-paladin-abcd1234-cloudflare-sdxl-ff01.png",
    fileName: "warriors-paladin-abcd1234.webp",
  };

  let reviewDir: string;
  let dropDir: string;

  afterEach(() => {
    if (reviewDir) rmSync(reviewDir, { recursive: true, force: true });
    if (dropDir) rmSync(dropDir, { recursive: true, force: true });
  });

  function setup(): void {
    reviewDir = mkdtempSync(join(tmpdir(), "supergrok-auto-video-review-"));
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-video-drop-"));
    writeFileSync(join(reviewDir, entry.stillReviewFileName), "fake-still-bytes");
  }

  it("converts the clip into the drop folder on success", () => {
    setup();
    const runner: GrokVideoRunner = (): GrokVideoRunResult => ({
      ok: true,
      timedOut: false,
      mp4Path: "/tmp/fake-session/videos/1.mp4",
    });
    const converter: VideoConverter = (mp4Path, outPath): ConvertResult => {
      expect(mp4Path).toBe("/tmp/fake-session/videos/1.mp4");
      writeFileSync(outPath, "fake-webp-bytes");
      return { ok: true };
    };

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(isAutoVideoFailure(result)).toBe(false);
    if (!isAutoVideoFailure(result)) {
      expect(result.fileName).toBe(entry.fileName);
    }
  });

  it("passes the still's absolute path to the prompt builder via the runner", () => {
    setup();
    let seenPrompt = "";
    const runner: GrokVideoRunner = (prompt): GrokVideoRunResult => {
      seenPrompt = prompt;
      return { ok: true, timedOut: false, mp4Path: "/tmp/fake-session/videos/1.mp4" };
    };
    const converter: VideoConverter = (_mp4Path, outPath): ConvertResult => {
      writeFileSync(outPath, "fake-webp-bytes");
      return { ok: true };
    };

    runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(seenPrompt).toContain(join(reviewDir, entry.stillReviewFileName));
  });

  it("reports a failure without calling the runner when no approved still exists yet", () => {
    reviewDir = mkdtempSync(join(tmpdir(), "supergrok-auto-video-review-"));
    dropDir = mkdtempSync(join(tmpdir(), "supergrok-auto-video-drop-"));
    let called = false;
    const runner: GrokVideoRunner = (): GrokVideoRunResult => {
      called = true;
      return { ok: true, timedOut: false, mp4Path: "/tmp/x.mp4" };
    };
    const converter: VideoConverter = (): ConvertResult => ({ ok: true });

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(called).toBe(false);
    expect(isAutoVideoFailure(result)).toBe(true);
    if (isAutoVideoFailure(result)) {
      expect(result.reason).toMatch(/no approved still/);
    }
  });

  it("reports a failure when the runner times out", () => {
    setup();
    const runner: GrokVideoRunner = (): GrokVideoRunResult => ({ ok: false, timedOut: true });
    const converter: VideoConverter = (): ConvertResult => ({ ok: true });

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(isAutoVideoFailure(result)).toBe(true);
    if (isAutoVideoFailure(result)) {
      expect(result.reason).toMatch(/timed out/);
    }
  });

  it("reports a failure when the runner fails", () => {
    setup();
    const runner: GrokVideoRunner = (): GrokVideoRunResult => ({
      ok: false,
      timedOut: false,
      error: "grok exited with status 1",
    });
    const converter: VideoConverter = (): ConvertResult => ({ ok: true });

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(isAutoVideoFailure(result)).toBe(true);
    if (isAutoVideoFailure(result)) {
      expect(result.reason).toBe("grok exited with status 1");
    }
  });

  it("reports a failure when grok exits ok but no clip path was found", () => {
    setup();
    const runner: GrokVideoRunner = (): GrokVideoRunResult => ({ ok: true, timedOut: false });
    const converter: VideoConverter = (): ConvertResult => ({ ok: true });

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(isAutoVideoFailure(result)).toBe(true);
  });

  it("reports a failure when the conversion fails", () => {
    setup();
    const runner: GrokVideoRunner = (): GrokVideoRunResult => ({
      ok: true,
      timedOut: false,
      mp4Path: "/tmp/fake-session/videos/1.mp4",
    });
    const converter: VideoConverter = (): ConvertResult => ({
      ok: false,
      error: "ffmpeg exited with status 1",
    });

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(isAutoVideoFailure(result)).toBe(true);
    if (isAutoVideoFailure(result)) {
      expect(result.reason).toBe("ffmpeg exited with status 1");
    }
  });

  it("reports a failure instead of throwing when the runner throws", () => {
    setup();
    const runner: GrokVideoRunner = (): GrokVideoRunResult => {
      throw new Error("ENOENT: grok not found");
    };
    const converter: VideoConverter = (): ConvertResult => ({ ok: true });

    const result = runAutoVideoCard(entry, { reviewDir, dropDir, runner, converter });
    expect(isAutoVideoFailure(result)).toBe(true);
    if (isAutoVideoFailure(result)) {
      expect(result.reason).toMatch(/ENOENT/);
    }
  });
});
