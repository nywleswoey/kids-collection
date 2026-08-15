import { describe, it, expect } from "vitest";
import { picturePng, solidPng } from "@/features/pool/providers/fake";
import {
  MIN_BYTES_PER_PIXEL,
  bytesPerPixel,
  looksBlank,
} from "@/features/pool/blank-frame";

const CARD = { width: 768, height: 768 };

describe("blank-frame detector (#78)", () => {
  it("reads a flat 768x768 PNG as blank — the shape Cloudflare actually returned", () => {
    // `solidPng` encodes zeroed scanlines, i.e. an all-black frame, and lands at
    // ~1.7 KB. #78 measured Cloudflare SDXL's blank at 1.8 KB: the same artefact.
    expect(looksBlank(solidPng(CARD.width, CARD.height), CARD)).toBe(true);
  });

  it("does not read a picture-dense image as blank", () => {
    expect(looksBlank(picturePng(CARD.width, CARD.height), CARD)).toBe(false);
  });

  it("judges density rather than file size, so the floor follows the frame", () => {
    // 6 KB is a plausible small illustration at 256x256 (0.092 B/px) and nothing
    // at all spread over a card (0.010 B/px). A flat byte-count floor would have
    // to pick one of those and be wrong about the other.
    const bytes = new Uint8Array(6_000);
    expect(looksBlank(bytes, { width: 256, height: 256 })).toBe(false);
    expect(looksBlank(bytes, CARD)).toBe(true);
  });

  it("keeps the floor inside the band #78 measured, with room on both sides", () => {
    // The threshold is a judgement call, so this is the guard that stops it
    // drifting silently: it pins the floor between the two ends of the measured
    // evidence rather than pinning the number itself (which would assert only
    // that someone typed it twice).
    //
    // Below — the failure: an all-black 768x768 frame, which is what Cloudflare
    // SDXL returned and what `solidPng` encodes.
    const blank = bytesPerPixel(solidPng(CARD.width, CARD.height).byteLength, CARD);
    // Above — the sparsest LEGITIMATE image measurable on a live lane. Asking
    // Pollinations for "a completely flat solid mid-grey field" still comes back
    // at 30 KB, and "a single small red dot on a plain white background" at
    // 27 KB, because a diffusion model draws texture even when told not to.
    const sparsestLegitimate = 27_077 / (CARD.width * CARD.height);

    expect(MIN_BYTES_PER_PIXEL).toBeGreaterThan(blank * 3);
    expect(MIN_BYTES_PER_PIXEL).toBeLessThan(sparsestLegitimate / 2);
  });
});
