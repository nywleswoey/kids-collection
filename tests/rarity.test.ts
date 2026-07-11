import { describe, it, expect } from "vitest";
import { RARITY_META } from "@/features/card/rarity";
import { RARITIES } from "@/lib/types";

describe("RARITY_META (U5-FR2)", () => {
  it("covers every rarity with a valid hex frame and non-empty label", () => {
    for (const r of RARITIES) {
      const meta = RARITY_META[r];
      expect(meta).toBeDefined();
      expect(meta.frame).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(meta.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("glows only on epic and legendary", () => {
    const glowing = RARITIES.filter((r) => RARITY_META[r].glow);
    expect(glowing.sort()).toEqual(["epic", "legendary"]);
  });

  it("frames are distinct per rarity", () => {
    const frames = RARITIES.map((r) => RARITY_META[r].frame);
    expect(new Set(frames).size).toBe(RARITIES.length);
  });
});
