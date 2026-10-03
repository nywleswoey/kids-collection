import { describe, it, expect } from "vitest";
import {
  FLASH_DIM,
  FLASH_FRAME_COUNT,
  buildFlashDelays,
  boundedFlashPool,
} from "@/features/pull/roulette-schedule";

describe("buildFlashDelays", () => {
  it("fills the full spin duration with an ease-out (growing) schedule", () => {
    const delays = buildFlashDelays(2500);
    expect(delays.length).toBeGreaterThan(1);
    expect(delays.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(2500);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it("caps each delay at 300ms", () => {
    for (const d of buildFlashDelays(2500)) expect(d).toBeLessThanOrEqual(300);
  });
});

describe("FLASH_FRAME_COUNT", () => {
  it("covers the initial frame plus every advance before the landing entry", () => {
    expect(FLASH_FRAME_COUNT).toBe(buildFlashDelays().length);
  });

  it("lets boundedFlashPool keep every pool index the spin shows", () => {
    const delays = buildFlashDelays();
    const shownIndices = [0, ...delays.slice(0, -1).map((_, i) => i + 1)];
    const pool = Array.from({ length: FLASH_FRAME_COUNT + 50 }, (_, i) => i);
    const bounded = boundedFlashPool(pool);
    for (const idx of shownIndices) expect(bounded).toContain(pool[idx]);
  });
});

describe("boundedFlashPool", () => {
  it("trims a larger pool down to only the frames the spin can ever show", () => {
    const bigPool = Array.from({ length: FLASH_FRAME_COUNT + 50 }, (_, i) => ({ id: String(i) }));
    const bounded = boundedFlashPool(bigPool);
    expect(bounded).toHaveLength(FLASH_FRAME_COUNT);
    expect(bounded).toEqual(bigPool.slice(0, FLASH_FRAME_COUNT));
  });

  it("keeps a pool unchanged when it's already smaller than the flash count", () => {
    const smallPool = [{ id: "a" }, { id: "b" }];
    expect(boundedFlashPool(smallPool)).toEqual(smallPool);
  });

  it("uses one of the allowlisted next/image sizes for flash frames", () => {
    // next.config.ts's images.imageSizes allowlist — widening it there without
    // updating this constant would make flash prefetches miss the cache.
    expect([128, 256, 512]).toContain(FLASH_DIM);
    expect(FLASH_DIM).toBeLessThan(512);
  });
});
