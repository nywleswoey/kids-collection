/**
 * Pure orchestration for one card: synthesize frames from its already-APPROVED
 * still's source artwork, encode them, write the result into the animation
 * drop folder. Never throws. Mirrors
 * `scripts/supergrok-helper/auto-video.ts`'s `runAutoVideoCard` shape — the
 * Grok runner and ffmpeg converter there are injected the same way the
 * artwork fetcher and encoder are injected here, so neither lane's tests ever
 * spawn a real process or make a real network call.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { nationalDexNumber } from "@/shared/pool/pokemon-dex-numbers";
import { primaryType } from "@/shared/pool/pokemon-types";
import { synthesizeFrames } from "./frames";
import type { ArtworkFetcher } from "./artwork";
import type { Encoder } from "./encode";
import type { PokemonAnimEntry } from "./plan";

export interface GenerateFailure {
  card: string;
  reason: string;
}

export interface GenerateSuccess {
  card: string;
  fileName: string;
}

export function isGenerateFailure(
  result: GenerateSuccess | GenerateFailure,
): result is GenerateFailure {
  return "reason" in result;
}

export interface GeneratePokemonAnimOptions {
  /** Where approved stills already live (`seed-content/review/`). */
  reviewDir: string;
  /** Where the generated animation is written (`seed-content/supergrok-drop-anim/`). */
  dropDir: string;
  fetchArtwork: ArtworkFetcher;
  encoder: Encoder;
}

export async function generatePokemonAnim(
  entry: PokemonAnimEntry,
  opts: GeneratePokemonAnimOptions,
): Promise<GenerateSuccess | GenerateFailure> {
  try {
    const stillPath = join(opts.reviewDir, entry.stillReviewFileName);
    if (!existsSync(stillPath)) {
      return {
        card: entry.card,
        reason:
          `no approved still at ${stillPath} yet — run \`pnpm seed --review ` +
          `--providers=pokeapi-official-artwork\` and pick it for this card first`,
      };
    }

    const dexNumber = nationalDexNumber(entry.card);
    if (dexNumber === undefined) {
      return {
        card: entry.card,
        reason: `"${entry.card}" has no national dex number mapped in pokemon-dex-numbers.ts`,
      };
    }

    const type = primaryType(entry.card) ?? "normal";
    const artwork = await opts.fetchArtwork(dexNumber);
    const frames = await synthesizeFrames(artwork, type);

    mkdirSync(opts.dropDir, { recursive: true });
    const outPath = join(opts.dropDir, entry.fileName);
    const encoded = opts.encoder(frames, outPath);
    if (!encoded.ok) {
      return { card: entry.card, reason: encoded.error ?? "img2webp encoding failed" };
    }

    return { card: entry.card, fileName: entry.fileName };
  } catch (err) {
    return { card: entry.card, reason: err instanceof Error ? err.message : String(err) };
  }
}

