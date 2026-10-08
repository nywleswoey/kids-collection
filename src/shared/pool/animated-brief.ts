/**
 * Manual animation lane — a short looping WebP the owner generates by hand
 * from an already-APPROVED legendary still (`pnpm supergrok --auto-video`,
 * driving the signed-in Grok Build CLI's `image_to_video` tool), not from a
 * text prompt. See `data/kcanim/report.md` for the full pipeline mapping.
 *
 * There is no bake-off here: `image_to_video` animates whichever still
 * `--review` already picked, so this lane has no prompt of its own and no
 * provider of its own. It is keyed to the SAME prompt hash as the still it
 * animates (`manualDropStem`/`promptDigest`, reused rather than duplicated)
 * so `--review`/`--sync` can find "does this card have an approved animation"
 * without inventing a second identity space.
 *
 * A missing file is "no animation yet" for that card, not a failure — the
 * same `ProviderNotDrawn`-shaped absence `supergrok-manual.ts` already treats
 * as normal for stills.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { manualDropStem, promptDigest } from "./manual-brief";

/** Where the owner saves approved animations. Gitignored, parallel to `supergrok-drop/`. */
export const ANIMATED_DROP_DIR = "seed-content/supergrok-drop-anim";

/** The approved animation's filename stem — same identity as the still it animates. */
export function animatedStem(themeName: string, cardName: string, prompt: string): string {
  return manualDropStem(themeName, cardName, prompt);
}

/** The name an approved animation takes once imported into `seed-content/review/`. */
export function animatedReviewFileName(themeName: string, cardName: string, prompt: string): string {
  return `${animatedStem(themeName, cardName, prompt)}.anim.webp`;
}

export type AnimatedDropMatch =
  | { kind: "one"; fileName: string }
  | { kind: "none"; hash: string }
  | { kind: "many"; fileNames: string[] };

/**
 * Find the owner's approved animation for this exact still prompt among drop-
 * folder names. WebP only — the conversion recipe (ffmpeg + `img2webp`) always
 * encodes WebP, so an unrelated file extension is never a candidate here.
 */
export function findAnimatedDropFile(
  prompt: string,
  fileNames: readonly string[],
): AnimatedDropMatch {
  const hash = promptDigest(prompt);
  const hits = fileNames.filter((name) => name.toLowerCase().endsWith(`-${hash}.webp`));
  if (hits.length === 0) return { kind: "none", hash };
  if (hits.length === 1) return { kind: "one", fileName: hits[0]! };
  return { kind: "many", fileNames: [...hits].sort() };
}

/**
 * Read bytes for the owner's approved animation, or `undefined` if none
 * exists. Throws if more than one drop file matches this prompt — ambiguous,
 * never silently picked, same rule `supergrok-manual.ts` applies to stills.
 */
export function readApprovedAnimation(
  prompt: string,
  dropDir: string = join(process.cwd(), ANIMATED_DROP_DIR),
): Uint8Array | undefined {
  const names = existsSync(dropDir)
    ? readdirSync(dropDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    : [];
  const found = findAnimatedDropFile(prompt, names);
  if (found.kind === "none") return undefined;
  if (found.kind === "many") {
    throw new Error(
      `animated-brief: ${found.fileNames.length} drop file(s) match this prompt ` +
        `(${found.fileNames.join(", ")}). Leave one.`,
    );
  }
  return new Uint8Array(readFileSync(join(dropDir, found.fileName)));
}
