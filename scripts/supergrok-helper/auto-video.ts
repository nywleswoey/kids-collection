/**
 * Pure orchestration for `--auto-video`: drives the signed-in Grok Build
 * CLI's `image_to_video` tool to animate an already-APPROVED legendary still,
 * then converts the clip to a seamless looping animated WebP.
 *
 * Both the Grok invocation and the ffmpeg/img2webp conversion are injected
 * (`GrokVideoRunner` / `VideoConverter`) so this stays spawn-free and
 * testable — `index.ts` wires up the real ones. Hard rule carried over from
 * `auto.ts`: no xAI API key, no HTTP calls of its own — only the `grok` CLI
 * (plus local `ffmpeg`/`img2webp` for the conversion, which call no network).
 *
 * See `data/kcanim/report.md` for the proven recipe this encodes: Grok saves
 * the clip under its own session directory, not the cwd, so locating it is
 * the real runner's job (`findNewestSessionVideo` in `index.ts`), not this
 * module's. The conversion is a bounce loop (forward, then reversed with the
 * first reversed frame dropped) at 2x speed, 384x384, 10fps, lossy WebP q50.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { VideoEntry } from "./video-plan";

export const DEFAULT_AUTO_VIDEO_TIMEOUT_MS = 4 * 60 * 1000;

/**
 * The prompt sent to `grok -p`: proven wording from the captain's real test
 * (`data/kcanim/report.md`'s "Test generation runbook"). Deliberately asks
 * for defaults (6s, 480p) — resolution/duration are tuned at the conversion
 * step instead, so a prompt edit never invalidates the rest of the recipe.
 */
export function buildAutoVideoPrompt(stillAbsolutePath: string): string {
  return (
    `Use image_to_video on ${stillAbsolutePath}: subtle natural motion only ` +
    `(breathing, slight sway, blink), keep subject and framing exactly as shown. Use defaults.`
  );
}

export interface GrokVideoRunResult {
  ok: boolean;
  timedOut: boolean;
  error?: string;
  /** Absolute path of the clip Grok saved. Set only when `ok`. */
  mp4Path?: string;
}

/** Invokes `grok -p` for one card and locates the clip it saved. Injected so tests never spawn the real CLI. */
export type GrokVideoRunner = (prompt: string, timeoutMs: number) => GrokVideoRunResult;

export interface ConvertResult {
  ok: boolean;
  error?: string;
}

/** Converts an MP4 clip to a seamless looping animated WebP at `outPath`. Injected so tests never spawn ffmpeg/img2webp. */
export type VideoConverter = (mp4Path: string, outPath: string) => ConvertResult;

export interface AutoVideoFailure {
  card: string;
  reason: string;
}

export interface AutoVideoSuccess {
  card: string;
  fileName: string;
}

export function isAutoVideoFailure(
  result: AutoVideoSuccess | AutoVideoFailure,
): result is AutoVideoFailure {
  return "reason" in result;
}

export interface RunAutoVideoCardOptions {
  /** Where approved stills already live (`seed-content/review/`). */
  reviewDir: string;
  /** Where the approved animation is written (`seed-content/supergrok-drop-anim/`). */
  dropDir: string;
  runner: GrokVideoRunner;
  converter: VideoConverter;
  timeoutMs?: number;
}

/**
 * Animates one card's already-approved still end to end: invoke `grok`,
 * convert its clip, write the result into the animation drop folder. Never
 * throws.
 */
export function runAutoVideoCard(
  entry: VideoEntry,
  opts: RunAutoVideoCardOptions,
): AutoVideoSuccess | AutoVideoFailure {
  try {
    const stillPath = join(opts.reviewDir, entry.stillReviewFileName);
    if (!existsSync(stillPath)) {
      return {
        card: entry.card,
        reason:
          `no approved still at ${stillPath} yet — run \`pnpm seed --review\` and pick a ` +
          `provider for this card first; image_to_video animates a still, it does not draw one`,
      };
    }

    const prompt = buildAutoVideoPrompt(stillPath);
    const result = opts.runner(prompt, opts.timeoutMs ?? DEFAULT_AUTO_VIDEO_TIMEOUT_MS);
    if (!result.ok || !result.mp4Path) {
      return {
        card: entry.card,
        reason: result.timedOut ? "grok timed out" : result.error ?? "grok CLI failed",
      };
    }

    mkdirSync(opts.dropDir, { recursive: true });
    const outPath = join(opts.dropDir, entry.fileName);
    const converted = opts.converter(result.mp4Path, outPath);
    if (!converted.ok) {
      return { card: entry.card, reason: converted.error ?? "ffmpeg/img2webp conversion failed" };
    }

    return { card: entry.card, fileName: entry.fileName };
  } catch (err) {
    return { card: entry.card, reason: err instanceof Error ? err.message : String(err) };
  }
}
