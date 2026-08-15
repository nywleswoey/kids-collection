import { describe, it, expect } from "vitest";
import { parseSeed } from "@/features/pool/loader";
import { RARITY_PYRAMID } from "@/features/pool/seed-schema";
import { buildPrompt, ART_STYLE } from "@/features/pool/prompt";
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

  /**
   * #81 — ART_STYLE must not name the object a card's picture sits inside.
   *
   * The style string used to read "cartoon TRADING-CARD illustration", and
   * `cloudflare-sdxl` drew that literally: a wooden picture frame, a tan mat
   * with a gold rule, a rounded panel, with the subject inset inside it. The
   * measurements, and why a negative prompt is not the fix, are in
   * `src/features/pool/prompt.ts`.
   *
   * This is a REGRESSION GUARD, not a restatement of the constant. The removed
   * words are the natural way to describe what these images are for, so the
   * likeliest future edit — someone making the style read better — is exactly
   * the one that brings the frames back, and it would be invisible: a framed
   * card is a valid 768x768 PNG, so `finishGeneration` passes it and only a
   * human at checkpoint 2 sees it.
   *
   * Scope, stated so the gap is deliberate rather than forgotten: this guards
   * `ART_STYLE` only. The same rule binds a card author writing an
   * `imagePrompt`, and nothing enforces it there — `seed-schema.ts` takes any
   * non-empty string. That stays a runbook instruction under Step 3, because a
   * blocklist over free-text prompts would fail both ways: "a knight holding a
   * shield" is fine and "a card" never appears literally.
   */
  it("names no card, frame, border or mat — the objects SDXL draws literally (#81)", () => {
    expect(ART_STYLE).not.toMatch(/\bcards?\b|\bfram(e|es|ed|ing)\b|\bborders?\b|\bmat(te|tes|ted)?\b/i);
  });
});

// generateImage retry moved out with the provider seam (#67): retry, backoff and
// the circuit breaker are the lane runner's job now, covered in bake-off.test.ts,
// and each adapter's HTTP behaviour is covered by the shared provider contract in
// image-provider.test.ts.
