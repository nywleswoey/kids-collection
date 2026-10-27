/**
 * Official Pokémon artwork, fetched from PokéAPI's sprites repository.
 *
 * ── Why this lane exists ──────────────────────────────────────────────────────
 * Cloudflare SDXL and the (moderation-restricted) Grok manual lane both drew
 * every Kanto/Johto card, but neither draws an actually-recognisable Pikachu or
 * Charmander — Grok's moderation blocks named Pokémon outright and drew from
 * nameless descriptions instead, and a diffusion model's version of a named
 * creature is, at best, a resemblance. The owner asked for the real thing as a
 * third bake-off candidate for exactly these two themes, with its origin
 * recorded honestly rather than passed off as original art.
 *
 * ── Role: escape hatch, not a lane ───────────────────────────────────────────
 * This provider can only ever draw the ~60 cards in `pokemon-dex-numbers.ts` —
 * every other theme's prompt does not match `resolvePokemonCard` at all, so it
 * answers `ProviderNotDrawn` for all of them. Put in the default fan-out
 * (`role: "lane"`), every future theme's `--review` would carry a column of
 * silent "not drawn" cells forever, for a lane that was only ever meant to
 * settle two themes. `role: "escape-hatch"` keeps it registered — the
 * bake-off, contact sheet, `theme-picks` and `--sync` all resolve it like any
 * other provider — while reaching it still needs naming it explicitly:
 * `--providers=pokeapi-official-artwork`.
 *
 * ── Mapping a prompt back to a card ───────────────────────────────────────────
 * `generate()` only ever receives the built prompt string (`bake-off.ts`), not
 * the card. Every card in these two themes was authored with `imagePrompt`
 * starting `"<Name>, the Pokémon: ..."` (checked by a repo test), so the name is
 * recovered from the prompt itself rather than by re-reading `cards.json` —
 * keeping this adapter as free of filesystem coupling as `cloudflare-sdxl`.
 *
 * A prompt that does not match that shape at all (every other theme) is an
 * honest "not drawn", same as the manual lane's empty drop folder. A prompt
 * that DOES match it but names a Pokémon absent from the table is different: a
 * future card in one of these two themes forgetting to update the table is a
 * mistake worth stopping over, not a silent skip, so that throws a plain
 * (non-retryable) error instead.
 *
 * ── Normalisation ─────────────────────────────────────────────────────────────
 * PokéAPI's official artwork is a transparent PNG, usually smaller than and
 * never exactly 768x768, padded differently per Pokémon. Flattening it onto a
 * plain white square, filled edge to edge, looks flat next to this app's
 * other bright, hand-drawn card art. Instead: the artwork is resized with `fit: "contain"`
 * (never `"cover"`, which the other lanes use, since cropping a named
 * creature is worse than letterboxing it) to `MARGIN_RATIO` of the frame so
 * it has breathing room, composited (still transparent, never flattened to
 * white) centred over a square rasterised from an SVG background: a soft
 * radial gradient — lighter centre, the Pokémon's primary type's colour at
 * the edge (`pokemon-types.ts`). Output stays the same square size/format.
 *
 * ── Provenance ────────────────────────────────────────────────────────────────
 * Nothing here is AI-generated, so there is no served "model" to witness in the
 * sense `#64` means it — but there is something just as important to record
 * honestly: exactly where the picture came from. `GeneratedImage.model` carries
 * the dex number and the literal source URL fetched, so `provenance.json` and
 * the contact sheet both show it per card, verbatim, rather than inventing a
 * model name for a lane that never generated anything.
 */
import {
  assertOk,
  finishGeneration,
  readBytes,
  type FetchImpl,
  type HttpAdapterOptions,
} from "./http";
import {
  ProviderNotDrawn,
  type GeneratedImage,
  type ImageProvider,
  type ImageSizeRequest,
} from "./provider";
import { nationalDexNumber } from "../pokemon-dex-numbers";
import { backgroundForType, primaryType } from "../pokemon-types";
import sharp from "sharp";

/** This lane's registry id - the one definition every caller compares against. */
export const POKEAPI_OFFICIAL_ARTWORK_PROVIDER_ID = "pokeapi-official-artwork";

/** Raw GitHub mirror of PokéAPI's sprite data — no key, no rate limit tier. */
const ARTWORK_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

/**
 * The artwork fills this fraction of the square frame, centred. Exported so
 * `scripts/pokemon-anim/` can recreate this exact framing per animation frame
 * without duplicating the constant.
 */
export const MARGIN_RATIO = 0.82;

/**
 * Rasterise the type-coloured gradient backing square. Exported so
 * `scripts/pokemon-anim/` reuses the identical background rather than
 * duplicating the SVG.
 */
export function buildBackgroundSvg(size: ImageSizeRequest, type: string): string {
  const { center, edge } = backgroundForType(type);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="72%">
        <stop offset="0%" stop-color="${center}" />
        <stop offset="100%" stop-color="${edge}" />
      </radialGradient>
    </defs>
    <rect width="${size.width}" height="${size.height}" fill="url(#bg)" />
  </svg>`;
}

/** Build the exact source URL this lane fetches for a national dex number. */
export function officialArtworkUrl(dexNumber: number): string {
  return `${ARTWORK_BASE_URL}/${dexNumber}.png`;
}

/**
 * Every card in these two themes was authored `"<Name>, the Pokémon: ..."` —
 * pull the name back out of the built prompt (which appends `ART_STYLE` after
 * a comma, so matching only the leading segment is enough).
 */
export function extractPokemonName(prompt: string): string | undefined {
  const match = /^([^,]+), the Pokémon:/.exec(prompt);
  return match?.[1];
}

export type ResolvedPokemonCard =
  | { kind: "mapped"; name: string; dexNumber: number }
  | { kind: "unmapped-name"; name: string }
  | { kind: "no-match" };

/**
 * Pure classification of a prompt, with no network and no filesystem — the
 * part of this adapter worth unit-testing directly rather than only through
 * `generate()`.
 */
export function resolvePokemonCard(prompt: string): ResolvedPokemonCard {
  const name = extractPokemonName(prompt);
  if (name === undefined) return { kind: "no-match" };
  const dexNumber = nationalDexNumber(name);
  if (dexNumber === undefined) return { kind: "unmapped-name", name };
  return { kind: "mapped", name, dexNumber };
}

export interface PokeapiOfficialArtworkOptions extends HttpAdapterOptions {
  /**
   * Override prompt -> dex-number resolution. Tests use this to make the
   * shared provider contract's generic prompts ("a friendly panda", "x")
   * resolve to a fixed dex number, so the contract can drive fixtures the
   * same way it drives every HTTP adapter, without this lane pretending it
   * can draw an arbitrary subject.
   */
  resolveDexNumber?: (prompt: string) => number | undefined;
}

function defaultResolveDexNumber(prompt: string): number | undefined {
  const resolved = resolvePokemonCard(prompt);
  if (resolved.kind === "mapped") return resolved.dexNumber;
  if (resolved.kind === "unmapped-name") {
    throw new Error(
      `pokeapi-official-artwork: "${resolved.name}" has no national dex number mapped in ` +
        `pokemon-dex-numbers.ts — add it before reviewing this card with this lane.`,
    );
  }
  return undefined;
}

export function pokeapiOfficialArtwork(
  opts: PokeapiOfficialArtworkOptions = {},
): ImageProvider {
  const fetchImpl: FetchImpl = opts.fetchImpl ?? fetch;
  const resolveDexNumber = opts.resolveDexNumber ?? defaultResolveDexNumber;
  const provider: ImageProvider = {
    id: POKEAPI_OFFICIAL_ARTWORK_PROVIDER_ID,
    role: "escape-hatch",
    format: "png",
    params: {
      source: "pokeapi-sprites-official-artwork",
      fit: "contain",
      // Bumped from the plain "#ffffff" fill: a type-coloured gradient +
      // margin now determine the bytes, so this must change too — old
      // white-background (or v1 ground-shadow) reviews must never be
      // confused with these.
      background: "type-gradient-v2",
      marginRatio: MARGIN_RATIO,
    },
    minIntervalMs: 50,
    concurrency: 4,
    requiredEnv: [],
    // No key, no quota — a raw GitHub file fetch. Always "configured", same
    // reasoning as the manual lane: naming it is what opts in, not a secret.
    isConfigured: () => true,
    async generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage> {
      const dexNumber = resolveDexNumber(prompt);
      if (dexNumber === undefined) {
        throw new ProviderNotDrawn(
          "pokeapi-official-artwork: not drawn — this prompt is not one of the mapped Pokémon cards",
        );
      }
      const url = officialArtworkUrl(dexNumber);
      const res = await fetchImpl(url);
      assertOk(provider.id, res);
      const raw = await readBytes(provider.id, res);

      const name = extractPokemonName(prompt);
      const type = (name && primaryType(name)) || "normal";
      const background = await sharp(Buffer.from(buildBackgroundSvg(size, type)))
        .png()
        .toBuffer();

      const artworkSize = {
        width: Math.round(size.width * MARGIN_RATIO),
        height: Math.round(size.height * MARGIN_RATIO),
      };
      const artwork = await sharp(raw)
        .resize(artworkSize.width, artworkSize.height, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      const composed = await sharp(background)
        .composite([{ input: artwork, gravity: "center" }])
        .png()
        .toBuffer();

      return finishGeneration(
        provider,
        new Uint8Array(composed),
        size,
        `PokéAPI official artwork (National Dex #${dexNumber}) — ${url}`,
      );
    },
  };
  return provider;
}
