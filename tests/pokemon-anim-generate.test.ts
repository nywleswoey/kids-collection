import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { generatePokemonAnim, isGenerateFailure } from "../scripts/pokemon-anim/generate";
import type { PokemonAnimEntry } from "../scripts/pokemon-anim/plan";
import type { ArtworkFetcher } from "../scripts/pokemon-anim/artwork";
import type { Encoder, EncodeResult } from "../scripts/pokemon-anim/encode";

const entry: PokemonAnimEntry = {
  theme: "Kanto Pokémon",
  card: "Pikachu",
  prompt: "Pikachu, the Pokémon: an electric mouse",
  stillReviewFileName: "kanto-pokemon-pikachu-abcd1234-pokeapi-official-artwork-ff01.png",
  fileName: "kanto-pokemon-pikachu-abcd1234-pokeapi-official-artwork.webp",
};

async function tinyPng(): Promise<Uint8Array> {
  const buf = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 255, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buf);
}

describe("generatePokemonAnim", () => {
  let reviewDir: string;
  let dropDir: string;

  afterEach(() => {
    if (reviewDir) rmSync(reviewDir, { recursive: true, force: true });
    if (dropDir) rmSync(dropDir, { recursive: true, force: true });
  });

  function setup(): void {
    reviewDir = mkdtempSync(join(tmpdir(), "pokemon-anim-review-"));
    dropDir = mkdtempSync(join(tmpdir(), "pokemon-anim-drop-"));
    writeFileSync(join(reviewDir, entry.stillReviewFileName), "fake-still-bytes");
  }

  it("fetches the artwork, synthesizes frames, and encodes into the drop folder on success", async () => {
    setup();
    let seenDexNumber: number | undefined;
    const fetchArtwork: ArtworkFetcher = async (dexNumber) => {
      seenDexNumber = dexNumber;
      return tinyPng();
    };
    let encodedOutPath = "";
    let frameCountSeen = 0;
    const encoder: Encoder = (frames, outPath): EncodeResult => {
      frameCountSeen = frames.length;
      encodedOutPath = outPath;
      writeFileSync(outPath, "fake-webp-bytes");
      return { ok: true };
    };

    const result = await generatePokemonAnim(entry, { reviewDir, dropDir, fetchArtwork, encoder });

    expect(isGenerateFailure(result)).toBe(false);
    if (!isGenerateFailure(result)) {
      expect(result.fileName).toBe(entry.fileName);
    }
    expect(seenDexNumber).toBe(25); // Pikachu's national dex number
    expect(encodedOutPath).toBe(join(dropDir, entry.fileName));
    expect(frameCountSeen).toBeGreaterThan(0);
  });

  it("reports a failure without fetching artwork when no approved still exists yet", async () => {
    reviewDir = mkdtempSync(join(tmpdir(), "pokemon-anim-review-"));
    dropDir = mkdtempSync(join(tmpdir(), "pokemon-anim-drop-"));
    let called = false;
    const fetchArtwork: ArtworkFetcher = async () => {
      called = true;
      return tinyPng();
    };
    const encoder: Encoder = (): EncodeResult => ({ ok: true });

    const result = await generatePokemonAnim(entry, { reviewDir, dropDir, fetchArtwork, encoder });

    expect(called).toBe(false);
    expect(isGenerateFailure(result)).toBe(true);
    if (isGenerateFailure(result)) {
      expect(result.reason).toMatch(/no approved still/);
    }
  });

  it("reports a failure for a card absent from pokemon-dex-numbers.ts, never fabricating one", async () => {
    setup();
    const unmapped: PokemonAnimEntry = { ...entry, card: "NotARealPokemon" };
    let called = false;
    const fetchArtwork: ArtworkFetcher = async () => {
      called = true;
      return tinyPng();
    };
    const encoder: Encoder = (): EncodeResult => ({ ok: true });

    const result = await generatePokemonAnim(unmapped, { reviewDir, dropDir, fetchArtwork, encoder });

    expect(called).toBe(false);
    expect(isGenerateFailure(result)).toBe(true);
    if (isGenerateFailure(result)) {
      expect(result.reason).toMatch(/no national dex number mapped/);
    }
  });

  it("reports a failure when the encoder fails", async () => {
    setup();
    const fetchArtwork: ArtworkFetcher = async () => tinyPng();
    const encoder: Encoder = (): EncodeResult => ({
      ok: false,
      error: "img2webp is not on PATH — install it with `brew install webp`",
    });

    const result = await generatePokemonAnim(entry, { reviewDir, dropDir, fetchArtwork, encoder });

    expect(isGenerateFailure(result)).toBe(true);
    if (isGenerateFailure(result)) {
      expect(result.reason).toMatch(/img2webp/);
    }
  });

  it("reports a failure instead of throwing when the artwork fetch throws", async () => {
    setup();
    const fetchArtwork: ArtworkFetcher = async () => {
      throw new Error("fetch failed: 404");
    };
    const encoder: Encoder = (): EncodeResult => ({ ok: true });

    const result = await generatePokemonAnim(entry, { reviewDir, dropDir, fetchArtwork, encoder });

    expect(isGenerateFailure(result)).toBe(true);
    if (isGenerateFailure(result)) {
      expect(result.reason).toMatch(/fetch failed/);
    }
  });
});
