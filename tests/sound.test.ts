import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";
import { RARITIES } from "@/lib/types";
import { sfxSpec, revealIntensity, isBigReveal, rewardFanfare, type SfxName } from "@/features/sound/sfx";
import {
  getSfxEnabled,
  getBgmEnabled,
  setSfxEnabled,
  setBgmEnabled,
} from "@/features/sound/settings";

const ALL_SFX: SfxName[] = [
  "click",
  "packOpen",
  "flip",
  "reveal",
  "tokenChime",
  "denied",
  "slotFill",
  "setComplete",
  "epicFanfare",
  "legendaryFanfare",
  "easterEgg",
];

describe("sfxSpec", () => {
  it("returns a valid recipe for every SFX name", () => {
    for (const name of ALL_SFX) {
      const spec = sfxSpec(name);
      expect(spec.freqs.length).toBeGreaterThan(0);
      expect(spec.durationMs).toBeGreaterThan(0);
      expect(spec.gain).toBeGreaterThan(0);
      expect(spec.gain).toBeLessThanOrEqual(1);
    }
  });
});

describe("reward fanfares (Inc15 FR2)", () => {
  it("legendary fanfare is bigger than epic (longer, more notes)", () => {
    const epic = sfxSpec("epicFanfare");
    const leg = sfxSpec("legendaryFanfare");
    expect(leg.durationMs).toBeGreaterThanOrEqual(epic.durationMs);
    expect(leg.freqs.length).toBeGreaterThanOrEqual(epic.freqs.length);
  });

  it("rewardFanfare maps only epic/legendary to a fanfare", () => {
    expect(rewardFanfare("legendary")).toBe("legendaryFanfare");
    expect(rewardFanfare("epic")).toBe("epicFanfare");
    expect(rewardFanfare("rare")).toBeNull();
    expect(rewardFanfare("common")).toBeNull();
  });
});

describe("revealIntensity (property)", () => {
  it("is always within [0,1]", () => {
    fc.assert(
      fc.property(fc.constantFrom(...RARITIES), (r) => {
        const v = revealIntensity(r);
        return v >= 0 && v <= 1;
      }),
    );
  });

  it("is monotonic by rarity tier (common ≤ rare ≤ epic ≤ legendary)", () => {
    const order = RARITIES.map(revealIntensity);
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThanOrEqual(order[i - 1]);
    }
    expect(revealIntensity("legendary")).toBe(1);
  });
});

describe("isBigReveal", () => {
  it("fires only for epic and legendary", () => {
    expect(isBigReveal("common")).toBe(false);
    expect(isBigReveal("rare")).toBe(false);
    expect(isBigReveal("epic")).toBe(true);
    expect(isBigReveal("legendary")).toBe(true);
  });
});

describe("settings persistence", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  it("defaults: SFX on, BGM off", () => {
    expect(getSfxEnabled()).toBe(true);
    expect(getBgmEnabled()).toBe(false);
  });

  it("round-trips both toggles (property)", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (sfx, bgm) => {
        setSfxEnabled(sfx);
        setBgmEnabled(bgm);
        return getSfxEnabled() === sfx && getBgmEnabled() === bgm;
      }),
    );
  });
});
