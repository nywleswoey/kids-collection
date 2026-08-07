import { describe, it, expect, vi } from "vitest";
import { checkSourceUrls, USER_AGENT } from "@/features/pool/url-check";
import type { SeedFile } from "@/features/pool/seed-schema";

const seed = (urls: Record<string, Record<string, string>>): SeedFile =>
  ({
    themes: Object.entries(urls).map(([name, cards]) => ({
      name,
      cards: Object.entries(cards).map(([card, sourceUrl]) => ({
        name: card,
        rarity: "common",
        eduText: "f",
        imagePrompt: "p",
        sourceUrl,
      })),
    })),
  }) as SeedFile;

const file = seed({
  "Flying Machines": {
    Concorde: "https://example.com/concorde",
    Spitfire: "https://example.com/spitfire",
  },
  "Ocean Machines": { Alvin: "https://example.com/alvin" },
});

/** Per-URL script of responses, consumed one per attempt; last entry repeats. */
const fetchScript = (script: Record<string, (number | Error)[]>) => {
  const calls: Record<string, number> = {};
  return vi.fn(async (url: string) => {
    const seq = script[url] ?? [200];
    const i = Math.min(calls[url] ?? 0, seq.length - 1);
    calls[url] = (calls[url] ?? 0) + 1;
    const s = seq[i];
    if (s instanceof Error) throw s;
    return { status: s, headers: new Headers() } as Response;
  });
};

/** Retries are exercised with zero backoff so the suite stays fast. */
const fast = { baseDelayMs: 0 } as const;

describe("checkSourceUrls (FR11)", () => {
  it("reports nothing when every URL answers 200", async () => {
    const fetchImpl = fetchScript({});
    expect(
      await checkSourceUrls(file, { fetchImpl: fetchImpl as never, ...fast }),
    ).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("reports a 404 immediately — a real rot is final, not retried", async () => {
    const fetchImpl = fetchScript({ "https://example.com/spitfire": [404] });
    const failures = await checkSourceUrls(file, {
      fetchImpl: fetchImpl as never,
      ...fast,
    });
    expect(failures).toEqual([
      {
        theme: "Flying Machines",
        card: "Spitfire",
        url: "https://example.com/spitfire",
        status: 404,
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // no retry burned on a 404
  });

  it("does NOT report a 429 that later succeeds — rate limiting is not rot", async () => {
    // The failure this check was rebuilt to avoid: Wikipedia 429s a burst of
    // requests, and reporting those as failures sends the operator off to edit
    // URLs that were never broken.
    const fetchImpl = fetchScript({ "https://example.com/alvin": [429, 429, 200] });
    expect(
      await checkSourceUrls(file, { fetchImpl: fetchImpl as never, ...fast }),
    ).toEqual([]);
  });

  it("reports a 429 only once it survives every retry", async () => {
    const fetchImpl = fetchScript({ "https://example.com/alvin": [429] });
    const failures = await checkSourceUrls(file, {
      fetchImpl: fetchImpl as never,
      retries: 2,
      ...fast,
    });
    expect(failures.map((f) => f.status)).toEqual([429]);
  });

  it("retries a 5xx and a network error too", async () => {
    const fetchImpl = fetchScript({
      "https://example.com/concorde": [503, 200],
      "https://example.com/spitfire": [new Error("ENOTFOUND"), 200],
    });
    expect(
      await checkSourceUrls(file, { fetchImpl: fetchImpl as never, ...fast }),
    ).toEqual([]);
  });

  it("reports a request that never completed, rather than throwing", async () => {
    const fetchImpl = fetchScript({
      "https://example.com/concorde": [new Error("ENOTFOUND")],
    });
    const failures = await checkSourceUrls(file, {
      fetchImpl: fetchImpl as never,
      retries: 1,
      ...fast,
    });
    expect(failures).toHaveLength(1);
    expect(String(failures[0].status)).toContain("ENOTFOUND");
  });

  it("honours Retry-After over the backoff ramp", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, headers: new Headers({ "retry-after": "3" }) })
      .mockResolvedValue({ status: 200, headers: new Headers() });
    const sleeps: number[] = [];
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms?: number,
    ) => {
      sleeps.push(ms ?? 0);
      fn();
      return 0 as never;
    }) as never);
    try {
      await checkSourceUrls(seed({ T: { C: "https://example.com/c" } }), {
        fetchImpl: fetchImpl as never,
      });
    } finally {
      spy.mockRestore();
    }
    expect(sleeps).toContain(3000);
  });

  it("sends a descriptive user-agent and follows redirects", async () => {
    // Both are load-bearing against Wikipedia: a generic agent gets throttled,
    // and an unfollowed redirect reads as a failure the human would never see.
    const fetchImpl = fetchScript({});
    await checkSourceUrls(file, { fetchImpl: fetchImpl as never, ...fast });
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
    });
  });

  it("reports failures in seed-file order regardless of which worker finished first", async () => {
    const fetchImpl = fetchScript({
      "https://example.com/alvin": [404],
      "https://example.com/concorde": [404],
    });
    const failures = await checkSourceUrls(file, {
      fetchImpl: fetchImpl as never,
      concurrency: 3,
      ...fast,
    });
    expect(failures.map((f) => f.card)).toEqual(["Concorde", "Alvin"]);
  });
});
