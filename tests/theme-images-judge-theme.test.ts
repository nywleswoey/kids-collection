import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { judgeTheme } from "../scripts/theme-images/judge-theme";
import { PROVIDERS } from "../src/shared/pool/providers";
import { reviewFileName } from "../src/shared/pool/review-files";
import type { ThemeSeed } from "../src/shared/pool/seed-schema";
import type { JudgeCache } from "../src/shared/pool/judge";

const theme: ThemeSeed = {
  name: "Warriors",
  cards: [
    { name: "Longbowman", rarity: "common", eduText: "x", imagePrompt: "a cheerful archer", sourceUrl: "https://example.com" },
    { name: "Shieldmaiden", rarity: "rare", eduText: "x", imagePrompt: "a brave shieldmaiden", sourceUrl: "https://example.com" },
  ],
};

const [cloudflare, supergrok] = PROVIDERS;

function fakeFs(files: Record<string, string>) {
  return {
    exists: (path: string) => path in files,
    read: (path: string) => new TextEncoder().encode(files[path]),
  };
}

describe("judgeTheme", () => {
  it("picks the single candidate for a card with only one provider present, with no judge call", () => {
    let called = false;
    const path = join("/review", reviewFileName(theme.name, theme.cards[0]!, cloudflare!));
    const rows = judgeTheme(
      theme,
      PROVIDERS,
      "/review",
      join,
      fakeFs({ [path]: "bytes" }),
      {},
      () => {
        called = true;
        return { ok: true, timedOut: false, output: "{}" };
      },
    );
    expect(called).toBe(false);
    const row = rows.find((r) => r.name === "Longbowman")!;
    expect(row.outcome.status).toBe("single");
    expect(row.candidates.find((c) => c.providerId === cloudflare!.id)?.fileName).toBeDefined();
    expect(row.candidates.find((c) => c.providerId === supergrok!.id)?.fileName).toBeUndefined();
  });

  it("reports missing for a card with no candidate from any provider", () => {
    const rows = judgeTheme(theme, PROVIDERS, "/review", join, fakeFs({}), {}, undefined);
    for (const row of rows) {
      expect(row.outcome.status).toBe("missing");
      expect(row.candidates.every((c) => c.fileName === undefined)).toBe(true);
    }
  });

  it("judges a card with candidates from both providers and reuses the cache on the next call", () => {
    const cache: JudgeCache = {};
    // Every provider's review file "exists", keyed by its own (distinct) path, so each
    // candidate's content hash differs — that's what makes the cache key card-specific.
    const fs = {
      exists: () => true,
      read: (path: string) => new TextEncoder().encode(path),
    };

    let calls = 0;
    const runJudge = () => {
      calls++;
      return {
        ok: true,
        timedOut: false,
        output: `{"winner": "${cloudflare!.id}", "reason": "sharper"}`,
      };
    };

    const rows1 = judgeTheme(theme, PROVIDERS, "/review", join, fs, cache, runJudge);
    expect(rows1.every((r) => r.outcome.status === "judged")).toBe(true);
    expect(calls).toBe(theme.cards.length);

    const rows2 = judgeTheme(theme, PROVIDERS, "/review", join, fs, cache, runJudge);
    expect(rows2.every((r) => r.outcome.status === "cached")).toBe(true);
    expect(calls).toBe(theme.cards.length); // no new calls on the second pass
  });
});
