/**
 * Pure orchestration for `--auto`: drives the locally installed Grok Build
 * CLI (`grok`, signed in with the owner's SuperGrok subscription) instead of
 * the clipboard/Downloads walk, one card at a time.
 *
 * The actual `grok -p` invocation is injected as a `GrokRunner` so this stays
 * testable without spawning a process — `index.ts` wires up the real one.
 * Hard rule carried over from the manual lane: no xAI API key, no HTTP calls
 * of its own — only the `grok` CLI, and only a prompt built from the card's
 * exact prompt text plus square-output/save-path instructions.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ManualBriefEntry } from "@/shared/pool/manual-brief";
import { isImageFile } from "./downloads";
import { destFileName } from "./naming";

export const DEFAULT_AUTO_TIMEOUT_MS = 4 * 60 * 1000;

/**
 * The prompt sent to `grok -p`: the card's exact prompt (unchanged, so the
 * picture matches what every other lane was asked to draw) plus instructions
 * for square output and an exact save path, so this script can find the
 * result without parsing Grok's prose reply.
 */
export function buildAutoPrompt(prompt: string, savePath: string): string {
  return (
    `${prompt}\n\n` +
    `Generate this as a square (1:1 aspect ratio) image, matching the subject and style described above exactly.\n` +
    `Save the final image file at exactly this path: ${savePath} ` +
    `(create parent directories if needed; overwrite if it already exists). ` +
    `Do not save it anywhere else, and do not save any other files.\n` +
    `After saving, print only the line: DONE`
  );
}

export interface GrokRunResult {
  ok: boolean;
  timedOut: boolean;
  error?: string;
}

/** Invokes `grok -p` for one card. Injected so tests never spawn the real CLI. */
export type GrokRunner = (prompt: string, cwd: string, timeoutMs: number) => GrokRunResult;

/**
 * Picks the produced image out of a (post-run) directory listing: the exact
 * requested name if present, else the sole image file found (in case Grok
 * ignored the requested extension but still saved only one picture).
 * Ambiguous (more than one stray image, none matching) or empty is reported
 * as "not found" rather than guessed at.
 */
export function pickProducedImage(fileNames: readonly string[], expectedName: string): string | undefined {
  if (fileNames.includes(expectedName)) return expectedName;
  const images = fileNames.filter(isImageFile);
  return images.length === 1 ? images[0] : undefined;
}

export interface AutoCardFailure {
  card: string;
  reason: string;
}

export interface AutoCardSuccess {
  card: string;
  fileName: string;
}

export function isAutoCardFailure(
  result: AutoCardSuccess | AutoCardFailure,
): result is AutoCardFailure {
  return "reason" in result;
}

export interface RunAutoCardOptions {
  dropDir: string;
  runner: GrokRunner;
  timeoutMs?: number;
}

/** Runs one card end to end: invoke `grok`, locate the picture, move it into the drop folder. */
export function runAutoCard(
  entry: ManualBriefEntry,
  opts: RunAutoCardOptions,
): AutoCardSuccess | AutoCardFailure {
  const workDir = mkdtempSync(join(tmpdir(), "supergrok-auto-"));
  try {
    const savePath = join(workDir, entry.fileName);
    const prompt = buildAutoPrompt(entry.prompt, savePath);
    const result = opts.runner(prompt, workDir, opts.timeoutMs ?? DEFAULT_AUTO_TIMEOUT_MS);
    if (!result.ok) {
      return {
        card: entry.card,
        reason: result.timedOut ? "grok timed out" : result.error ?? "grok CLI failed",
      };
    }

    const files = existsSync(workDir) ? readdirSync(workDir) : [];
    const picked = pickProducedImage(files, entry.fileName);
    if (!picked) {
      return { card: entry.card, reason: "grok did not save a usable image file" };
    }

    mkdirSync(opts.dropDir, { recursive: true });
    const dest = destFileName(entry, picked);
    renameSync(join(workDir, picked), join(opts.dropDir, dest));
    return { card: entry.card, fileName: dest };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
