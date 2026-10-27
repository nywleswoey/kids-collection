/**
 * Encodes synthesized frames into a seamless looping animated WebP via
 * `img2webp` (`brew install webp`). No `ffmpeg` step: unlike the Grok-video
 * lane's `runFfmpegConvert` (`scripts/supergrok-helper/index.ts`), there is no
 * video clip to decode here — `frames.ts` already produced one full motion
 * period of PNG frames directly, so `img2webp` only needs to encode them,
 * with the same flags (`-loop 0 -d 100 -lossy -q 50`) for a consistent file
 * size/quality bar across both animation lanes.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface EncodeResult {
  ok: boolean;
  error?: string;
}

/** True when an executable can be spawned at all (not ENOENT). */
export function executableAvailable(cmd: string): boolean {
  const probe = spawnSync(cmd, ["-version"], { encoding: "utf8" });
  return (probe.error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT";
}

/** Injected so tests never spawn the real `img2webp` process. */
export type Encoder = (frames: readonly Buffer[], outPath: string) => EncodeResult;

/** Real `img2webp` invocation: writes frames to a temp dir, encodes, cleans up. */
export const encodeLoopingWebp: Encoder = (frames, outPath) => {
  if (!executableAvailable("img2webp")) {
    return { ok: false, error: "img2webp is not on PATH — install it with `brew install webp`" };
  }
  const workDir = mkdtempSync(join(tmpdir(), "kcanim-pokemon-"));
  try {
    const framePaths = frames.map((buf, i) => {
      const path = join(workDir, `f${String(i).padStart(3, "0")}.png`);
      writeFileSync(path, buf);
      return path;
    });
    const result = spawnSync(
      "img2webp",
      ["-loop", "0", "-d", "100", "-lossy", "-q", "50", ...framePaths, "-o", outPath],
      { encoding: "utf8" },
    );
    if (result.error) return { ok: false, error: result.error.message };
    if (result.status !== 0) {
      return { ok: false, error: `img2webp exited with status ${result.status}: ${result.stderr?.trim()}` };
    }
    return { ok: true };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
};
