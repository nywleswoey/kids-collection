import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hintKey,
  hasSeenSacrificeHint,
  markSacrificeHintSeen,
} from "@/features/pull/sacrifice-hint";

/** Inc13 FR4 — first-duplicate hint gating (per-child localStorage). */

describe("sacrifice-hint key", () => {
  it("namespaces per child", () => {
    expect(hintKey("abc")).toBe("sacrifice-hint-seen:abc");
    expect(hintKey("x")).not.toBe(hintKey("y"));
  });
});

describe("sacrifice-hint gating with a working localStorage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
  });

  it("unseen until marked, then seen — isolated per child", () => {
    expect(hasSeenSacrificeHint("c1")).toBe(false);
    markSacrificeHintSeen("c1");
    expect(hasSeenSacrificeHint("c1")).toBe(true);
    expect(hasSeenSacrificeHint("c2")).toBe(false);
  });
});

describe("sacrifice-hint is SSR/error safe", () => {
  it("returns false with no window (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(hasSeenSacrificeHint("c1")).toBe(false);
    expect(() => markSacrificeHintSeen("c1")).not.toThrow();
  });

  it("returns false when localStorage throws (private mode)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(hasSeenSacrificeHint("c1")).toBe(false);
    expect(() => markSacrificeHintSeen("c1")).not.toThrow();
  });
});
