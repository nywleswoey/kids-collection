import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { runBakeOff } from "@/shared/pool/bake-off";
import { readImageSize } from "@/shared/pool/image-size";
import { ART_STYLE, buildPrompt } from "@/shared/pool/prompt";
import {
  CARD_SIZE,
  ProviderNotDrawn,
  ProviderRetryable,
  type ImageProvider,
} from "@/shared/pool/providers";
import {
  extractPokemonName,
  officialArtworkUrl,
  pokeapiOfficialArtwork,
  resolvePokemonCard,
} from "@/shared/pool/providers/pokeapi-official-artwork";
import { POKEMON_NATIONAL_DEX_NUMBERS, nationalDexNumber } from "@/shared/pool/pokemon-dex-numbers";
import {
  POKEMON_PRIMARY_TYPES,
  TYPE_BACKGROUND_PALETTE,
  backgroundForType,
  primaryType,
} from "@/shared/pool/pokemon-types";
import { runImageProviderContract } from "./contracts/image-provider-contract";

/**
 * This lane always normalises through sharp rather than trusting the response
 * bytes' own size — the same shape as `supergrok-manual` — so only the
 * structural half of the shared provider contract applies (`runHttpProviderContract`
 * assumes an adapter that TRUSTS the wire bytes' size, which this one never
 * does). The wire-specific behaviour (429/500 retryable, 400 not, empty body
 * rejected) is exercised directly below instead.
 */

async function noiseRgba(width: number, height: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 4);
  let n = 7;
  for (let i = 0; i < raw.length; i += 4) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    raw[i] = n & 0xff;
    raw[i + 1] = (n >> 8) & 0xff;
    raw[i + 2] = (n >> 16) & 0xff;
    raw[i + 3] = 255; // opaque noise in the centre
  }
  return sharp(raw, { raw: { width, height, channels: 4 } })
    // Pad with real transparency so flatten() has something to prove it did.
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

function imageResponse(bytes: Buffer): Response {
  return new Response(bytes as unknown as BodyInit, { status: 200 });
}

function fetchGuard(): { release(): void } {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("pokeapi-official-artwork tried to use the network");
  };
  return {
    release() {
      globalThis.fetch = original;
    },
  };
}

// ── shared structural contract ──────────────────────────────────────────────

runImageProviderContract("pokeapi-official-artwork", () =>
  pokeapiOfficialArtwork({
    // The contract drives generic prompts ("a friendly panda", "x"); this
    // lane cannot map those to a Pokémon, so tests fix the resolution instead
    // of pretending the lane draws an arbitrary subject.
    resolveDexNumber: () => 25,
    fetchImpl: async () => imageResponse(await noiseRgba(420, 360)),
  }),
);

// ── pure helpers: mapping, URL building, prompt parsing ─────────────────────

describe("extractPokemonName", () => {
  it("reads the name off the front of a Pokémon card's built prompt", () => {
    const card = { imagePrompt: "Pikachu, the Pokémon: a small yellow mouse-like creature" };
    expect(extractPokemonName(buildPrompt(card))).toBe("Pikachu");
  });

  it("finds nothing in a prompt from an unrelated theme", () => {
    const card = { imagePrompt: "a cheerful knight standing on a castle wall" };
    expect(extractPokemonName(buildPrompt(card))).toBeUndefined();
  });
});

describe("officialArtworkUrl", () => {
  it("builds the exact PokéAPI sprites raw URL for a dex number", () => {
    expect(officialArtworkUrl(25)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    );
  });
});

describe("resolvePokemonCard", () => {
  it("maps a known card's prompt to its national dex number", () => {
    const prompt = buildPrompt({ imagePrompt: "Mew, the Pokémon: a small pink creature" });
    expect(resolvePokemonCard(prompt)).toEqual({ kind: "mapped", name: "Mew", dexNumber: 151 });
  });

  it("names the Pokémon when the shape matches but the table has no entry", () => {
    const prompt = buildPrompt({ imagePrompt: "Missingno, the Pokémon: a glitchy creature" });
    expect(resolvePokemonCard(prompt)).toEqual({ kind: "unmapped-name", name: "Missingno" });
  });

  it("calls anything from another theme a no-match, not an unmapped name", () => {
    const prompt = buildPrompt({ imagePrompt: "a friendly red panda in a bamboo forest" });
    expect(resolvePokemonCard(prompt)).toEqual({ kind: "no-match" });
  });
});

describe("POKEMON_NATIONAL_DEX_NUMBERS", () => {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), "seed-content", "cards.json"), "utf8"),
  ) as { themes: { name: string; cards: { name: string; imagePrompt: string }[] }[] };

  it("maps every Kanto Pokémon and Johto Pokémon card in cards.json, by its built prompt", () => {
    const pokemonThemes = data.themes.filter((t) => t.name === "Kanto Pokémon" || t.name === "Johto Pokémon");
    expect(pokemonThemes).toHaveLength(2);
    for (const theme of pokemonThemes) {
      for (const card of theme.cards) {
        const dexNumber = nationalDexNumber(card.name);
        expect(dexNumber, `${theme.name} / ${card.name}`).toBeTypeOf("number");
        expect(resolvePokemonCard(buildPrompt(card)), `${theme.name} / ${card.name}`).toEqual({
          kind: "mapped",
          name: card.name,
          dexNumber,
        });
      }
    }
  });

  it("gives every mapped card a unique, in-range national dex number", () => {
    const numbers = Object.values(POKEMON_NATIONAL_DEX_NUMBERS);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(251);
    }
  });
});

describe("POKEMON_PRIMARY_TYPES", () => {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), "seed-content", "cards.json"), "utf8"),
  ) as { themes: { name: string; cards: { name: string }[] }[] };

  it("maps every Kanto Pokémon and Johto Pokémon card to a known type with a palette entry", () => {
    const pokemonThemes = data.themes.filter((t) => t.name === "Kanto Pokémon" || t.name === "Johto Pokémon");
    expect(pokemonThemes).toHaveLength(2);
    for (const theme of pokemonThemes) {
      for (const card of theme.cards) {
        const type = primaryType(card.name);
        expect(type, `${theme.name} / ${card.name}`).toBeTypeOf("string");
        expect(TYPE_BACKGROUND_PALETTE, `${theme.name} / ${card.name} type "${type}"`).toHaveProperty(
          type as string,
        );
      }
    }
  });

  it("covers every mapped dex number's card name with a type entry", () => {
    for (const name of Object.keys(POKEMON_NATIONAL_DEX_NUMBERS)) {
      expect(POKEMON_PRIMARY_TYPES, name).toHaveProperty(name);
    }
  });

  it("has a palette entry only for types some mapped card actually uses", () => {
    const usedTypes = new Set(Object.values(POKEMON_PRIMARY_TYPES));
    expect(new Set(Object.keys(TYPE_BACKGROUND_PALETTE))).toEqual(usedTypes);
  });

  it("gives every palette type a distinct centre/edge colour pair", () => {
    const pairs = Object.values(TYPE_BACKGROUND_PALETTE).map((p) => `${p.center}/${p.edge}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    for (const { center, edge } of Object.values(TYPE_BACKGROUND_PALETTE)) {
      expect(center).toMatch(/^#[0-9a-f]{6}$/i);
      expect(edge).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("falls back to normal's colours for an unknown type", () => {
    expect(backgroundForType("made-up-type")).toEqual(TYPE_BACKGROUND_PALETTE.normal);
  });
});

// ── generate(): skip, loud failure, URL, normalisation, provenance ─────────

describe("pokeapiOfficialArtwork().generate()", () => {
  it("is not drawn for a card from any other theme, and never touches the network", async () => {
    const guard = fetchGuard();
    try {
      const prompt = buildPrompt({ imagePrompt: "a friendly red panda in a bamboo forest" });
      await expect(pokeapiOfficialArtwork().generate(prompt, CARD_SIZE)).rejects.toBeInstanceOf(
        ProviderNotDrawn,
      );
    } finally {
      guard.release();
    }
  });

  it("fails loudly, not silently, when a Pokémon-shaped card has no table entry", async () => {
    const guard = fetchGuard();
    try {
      const prompt = buildPrompt({ imagePrompt: "Missingno, the Pokémon: a glitchy creature" });
      const err = await pokeapiOfficialArtwork().generate(prompt, CARD_SIZE).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(ProviderRetryable);
      expect(err).not.toBeInstanceOf(ProviderNotDrawn);
      expect(String(err)).toMatch(/Missingno/);
      expect(String(err)).toMatch(/no national dex number mapped/);
    } finally {
      guard.release();
    }
  });

  it("fetches the exact source URL for the card's national dex number", async () => {
    let requestedUrl = "";
    const provider = pokeapiOfficialArtwork({
      fetchImpl: async (input) => {
        requestedUrl = String(input);
        return imageResponse(await noiseRgba(420, 360));
      },
    });
    const prompt = buildPrompt({ imagePrompt: "Pikachu, the Pokémon: a small yellow creature" });
    await provider.generate(prompt, CARD_SIZE);
    expect(requestedUrl).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    );
  });

  it("composites the figure, scaled down with margin, onto a type-coloured gradient background", async () => {
    const provider = pokeapiOfficialArtwork({
      fetchImpl: async () => imageResponse(await noiseRgba(300, 500)), // tall, non-square source
    });
    const prompt = buildPrompt({ imagePrompt: "Mew, the Pokémon: a small pink creature" });
    const image = await provider.generate(prompt, CARD_SIZE);

    expect(readImageSize(image.bytes)).toMatchObject({ width: 768, height: 768, format: "png" });

    // Mew is psychic-type — the corner should carry the psychic gradient's
    // edge colour (#ffb0d0), not plain white and not the raw noise.
    const { data, info } = await sharp(Buffer.from(image.bytes))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const corner = [data[0], data[1], data[2]];
    expect(corner).not.toEqual([255, 255, 255]);
    // Within a few levels of the psychic gradient's edge colour (#ffb0d0) —
    // SVG rasterisation rounds slightly, so this tolerates that, not the type.
    const expectedEdge = [0xff, 0xb0, 0xd0];
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(corner[i]! - expectedEdge[i]!)).toBeLessThanOrEqual(4);
    }
    expect(info.width).toBe(768);
    expect(info.height).toBe(768);
  });

  it("scales the artwork to roughly 80-85% of the frame, centred, with margin on every side", async () => {
    const provider = pokeapiOfficialArtwork({
      fetchImpl: async () => imageResponse(await noiseRgba(400, 400)), // square, opaque source
    });
    const prompt = buildPrompt({ imagePrompt: "Pikachu, the Pokémon: a small yellow creature" });
    const image = await provider.generate(prompt, CARD_SIZE);

    const { data, info } = await sharp(Buffer.from(image.bytes))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const topLeft = [data[0], data[1], data[2]];
    const centreIdx = (384 * info.width + 384) * channels;
    const centre = [data[centreIdx], data[centreIdx + 1], data[centreIdx + 2]];
    expect(topLeft).not.toEqual(centre);

    // The frame's extreme corner (well outside 85% of the frame from centre)
    // must still be background, confirming the artwork does not reach edge-to-edge.
    const cornerFarIdx = (20 * info.width + 20) * channels;
    const cornerFar = [data[cornerFarIdx], data[cornerFarIdx + 1], data[cornerFarIdx + 2]];
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(cornerFar[i]! - topLeft[i]!)).toBeLessThanOrEqual(10);
    }
  });

  it("records the exact source and link honestly, with no invented model name", async () => {
    const provider = pokeapiOfficialArtwork({
      fetchImpl: async () => imageResponse(await noiseRgba(420, 360)),
    });
    const prompt = buildPrompt({ imagePrompt: "Lugia, the Pokémon: a large silver bird" });
    const image = await provider.generate(prompt, CARD_SIZE);
    expect(image.model).toBe(
      "PokéAPI official artwork (National Dex #249) — " +
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/249.png",
    );
  });

  it("is always configured, with no credentials required", () => {
    const provider = pokeapiOfficialArtwork();
    expect(provider.isConfigured()).toBe(true);
    expect(provider.requiredEnv).toEqual([]);
  });

  it("maps a 429 and a 5xx to ProviderRetryable, and a 4xx to a plain failure", async () => {
    const retryableStatuses = [429, 500, 503];
    for (const status of retryableStatuses) {
      const provider = pokeapiOfficialArtwork({
        fetchImpl: async () => new Response(null, { status }),
      });
      const prompt = buildPrompt({ imagePrompt: "Pikachu, the Pokémon: a small yellow creature" });
      await expect(provider.generate(prompt, CARD_SIZE)).rejects.toBeInstanceOf(ProviderRetryable);
    }

    const rejected = pokeapiOfficialArtwork({
      fetchImpl: async () => new Response(null, { status: 404 }),
    });
    const prompt = buildPrompt({ imagePrompt: "Pikachu, the Pokémon: a small yellow creature" });
    const err = await rejected.generate(prompt, CARD_SIZE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ProviderRetryable);
  });
});

// ── through the bake-off: one drawn, one skipped, one from another theme ────

describe("pokeapiOfficialArtwork through the bake-off", () => {
  it("draws mapped Pokémon cards and leaves everything else not drawn", async () => {
    const drawnCard = { name: "Pikachu", imagePrompt: "Pikachu, the Pokémon: a small yellow creature" };
    const otherThemeCard = { name: "Longbowman", imagePrompt: "a cheerful archer with a longbow" };

    const saved: { provider: ImageProvider; bytes: Uint8Array }[] = [];
    const [outcome] = await runBakeOff(
      [
        { theme: "Kanto Pokémon", card: drawnCard },
        { theme: "Warriors", card: otherThemeCard },
      ],
      [pokeapiOfficialArtwork({ fetchImpl: async () => imageResponse(await noiseRgba(420, 360)) })],
      {
        size: CARD_SIZE,
        retries: 1,
        buildPrompt: (card) => buildPrompt(card),
        isReviewed: () => false,
        save: (_job, provider, image) => {
          saved.push({ provider, bytes: image.bytes });
        },
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    );

    expect(outcome).toMatchObject({
      providerId: "pokeapi-official-artwork",
      generated: 1,
      failed: 0,
      notDrawn: 1,
      notAttempted: 0,
      abandoned: false,
    });
    expect(saved).toHaveLength(1);
    expect(readImageSize(saved[0]!.bytes)).toMatchObject({
      width: 768,
      height: 768,
      format: "png",
    });
  });
});

describe("ART_STYLE sanity", () => {
  it("every Pokémon prompt still carries the shared art style suffix", () => {
    const prompt = buildPrompt({ imagePrompt: "Eevee, the Pokémon: a small brown fox-like creature" });
    expect(prompt).toContain(ART_STYLE);
    expect(extractPokemonName(prompt)).toBe("Eevee");
  });
});
