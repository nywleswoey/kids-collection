import { describe, it, expect, vi } from "vitest";
import { parseSeed } from "@/features/pool/loader";
import { RARITY_PYRAMID } from "@/features/pool/seed-schema";
import { buildPrompt, ART_STYLE } from "@/features/pool/prompt";
import { generateImage } from "@/features/pool/image";
import { RARITIES, type Rarity } from "@/lib/types";

/**
 * Fixture builder (Inc24).
 *
 * Before Inc24 every fixture here was a ONE-card theme, which the FR2 count rule
 * now rejects outright. That broke the positive test and — worse — would have left
 * the negative tests passing for the wrong reason: `parseSeed` would throw on the
 * card count before ever reaching the rarity enum, so the assertions would have
 * been vacuous while still green.
 *
 * Each negative case below is therefore "a valid file with exactly one thing
 * wrong", which is the only shape that stays meaningful once the schema holds
 * several independent rules.
 */
function validTheme(name = "Animals", cardPrefix = name) {
  const cards = RARITIES.flatMap((rarity) =>
    Array.from({ length: RARITY_PYRAMID[rarity] }, (_, i) => ({
      name: `${cardPrefix} ${rarity} ${i}`,
      rarity: rarity as string,
      eduText: `A true fact about ${cardPrefix} ${rarity} ${i}.`,
      imagePrompt: `a ${cardPrefix}`,
      sourceUrl: `https://example.com/${rarity}/${i}`,
    })),
  );
  return { name, cards };
}

const validFile = () => ({ themes: [validTheme()] });

describe("loader / seed validation (U3-BR1/BR2)", () => {
  it("accepts a valid seed", () => {
    expect(() => parseSeed(validFile())).not.toThrow();
  });

  it("rejects invalid rarity", () => {
    const file = validFile();
    file.themes[0].cards[0].rarity = "mythic";
    expect(() => parseSeed(file)).toThrow();
  });

  it("rejects an empty themes array", () => {
    expect(() => parseSeed({ themes: [] })).toThrow();
  });

  it("rejects a blank card name", () => {
    const file = validFile();
    file.themes[0].cards[0].name = "";
    expect(() => parseSeed(file)).toThrow();
  });

  it("rejects a missing or non-URL sourceUrl (U4-FR5)", () => {
    const missing = validFile();
    // @ts-expect-error — deleting a required field is the case under test
    delete missing.themes[0].cards[0].sourceUrl;
    expect(() => parseSeed(missing)).toThrow();

    const malformed = validFile();
    malformed.themes[0].cards[0].sourceUrl = "not-a-url";
    expect(() => parseSeed(malformed)).toThrow();
  });

  // The four Inc24 authoring rules (FR2–FR5) are property-tested in
  // tests/seed-rules.pbt.test.ts, which closes OQ-VT-J1. Spot-checks here keep
  // this suite honest about which gate is doing the work.
  it("rejects a theme that is not exactly 30 cards (FR2)", () => {
    const file = validFile();
    file.themes[0].cards.pop();
    expect(() => parseSeed(file)).toThrow(/expected 30 cards, found 29/);
  });

  it("rejects a theme that is off the 15/8/5/2 pyramid (FR3)", () => {
    const file = validFile();
    file.themes[0].cards[0].rarity = "legendary" satisfies Rarity;
    expect(() => parseSeed(file)).toThrow(/expected 15\/8\/5\/2/);
  });

  it("rejects a card name reused in another theme (FR4)", () => {
    const file = { themes: [validTheme("Animals"), validTheme("Dinosaurs")] };
    file.themes[1].cards[0].name = file.themes[0].cards[0].name;
    expect(() => parseSeed(file)).toThrow(/duplicate card name/);
  });

  it("rejects eduText longer than 120 characters (FR5)", () => {
    const file = validFile();
    file.themes[0].cards[0].eduText = "f".repeat(121);
    expect(() => parseSeed(file)).toThrow();
  });
});

describe("buildPrompt (U3-BR5)", () => {
  it("appends the kid-friendly art style", () => {
    const p = buildPrompt({ imagePrompt: "a panda" });
    expect(p).toContain("a panda");
    expect(p).toContain(ART_STYLE);
  });
});

describe("generateImage retry (U3-RES-1)", () => {
  it("retries then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      });
    const bytes = await generateImage("x", { fetchImpl: fetchImpl as never, retries: 3 });
    expect(bytes.byteLength).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      generateImage("x", { fetchImpl: fetchImpl as never, retries: 1 }),
    ).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it("retries through a 429 rate limit", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([9]).buffer,
      });
    const bytes = await generateImage("x", {
      fetchImpl: fetchImpl as never,
      retries: 3,
      rateLimitDelayMs: 1, // keep the test fast
    });
    expect(bytes.byteLength).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("honors the Retry-After header on 429", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, headers: new Headers({ "retry-after": "2" }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([7]).buffer,
      });
    const sleeps: number[] = [];
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void, ms?: number) => {
      sleeps.push(ms ?? 0);
      fn();
      return 0 as never;
    }) as never);
    try {
      await generateImage("x", { fetchImpl: fetchImpl as never, retries: 3 });
    } finally {
      spy.mockRestore();
    }
    expect(sleeps).toContain(2000); // Retry-After: 2s → 2000ms
  });
});
