import { describe, it, expect, vi } from "vitest";
import { parseSeed } from "@/features/pool/loader";
import { buildPrompt, ART_STYLE } from "@/features/pool/prompt";
import { generateImage } from "@/features/pool/image";

describe("loader / seed validation (U3-BR1/BR2)", () => {
  it("accepts a valid seed", () => {
    const ok = {
      themes: [
        {
          name: "Animals",
          cards: [
            { name: "Fox", rarity: "common", eduText: "Fact.", imagePrompt: "a fox" },
          ],
        },
      ],
    };
    expect(() => parseSeed(ok)).not.toThrow();
  });

  it("rejects invalid rarity", () => {
    const bad = {
      themes: [
        { name: "A", cards: [{ name: "X", rarity: "mythic", eduText: "f", imagePrompt: "p" }] },
      ],
    };
    expect(() => parseSeed(bad)).toThrow();
  });

  it("rejects empty theme / missing fields", () => {
    expect(() => parseSeed({ themes: [] })).toThrow();
    expect(() =>
      parseSeed({ themes: [{ name: "A", cards: [{ name: "", rarity: "common", eduText: "f", imagePrompt: "p" }] }] }),
    ).toThrow();
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
