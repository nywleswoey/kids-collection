import { describe, expect, it } from "vitest";
import {
  buildJudgePrompt,
  candidateCacheKey,
  judgeCard,
  parseJudgeCache,
  parseJudgeOutput,
  serializeJudgeCache,
  sha256Hex,
  type JudgeCache,
  type JudgeCandidate,
  type RunJudgeResult,
} from "../src/shared/pool/judge";

const bytesA = new TextEncoder().encode("candidate-a-bytes");
const bytesB = new TextEncoder().encode("candidate-b-bytes");

function candidates(): JudgeCandidate[] {
  return [
    { providerId: "cloudflare-sdxl", path: "/review/a.png", bytes: bytesA },
    { providerId: "supergrok-manual", path: "/review/b.png", bytes: bytesB },
  ];
}

describe("candidateCacheKey", () => {
  it("is order-independent", () => {
    const [a, b] = candidates();
    expect(candidateCacheKey([a!, b!])).toBe(candidateCacheKey([b!, a!]));
  });

  it("changes when a candidate's bytes change", () => {
    const [a, b] = candidates();
    const key1 = candidateCacheKey([a!, b!]);
    const key2 = candidateCacheKey([{ ...a!, bytes: new TextEncoder().encode("different") }, b!]);
    expect(key1).not.toBe(key2);
  });
});

describe("parseJudgeCache / serializeJudgeCache", () => {
  it("round-trips a populated cache", () => {
    const cache: JudgeCache = { abc: { winner: "cloudflare-sdxl", reason: "sharper", judgedAt: "2026-01-01T00:00:00.000Z" } };
    expect(parseJudgeCache(serializeJudgeCache(cache))).toEqual(cache);
  });

  it("reads a missing/corrupt file as empty, never throwing", () => {
    expect(parseJudgeCache("")).toEqual({});
    expect(parseJudgeCache("not json")).toEqual({});
    expect(parseJudgeCache("[1,2,3]")).toEqual({});
  });
});

describe("buildJudgePrompt", () => {
  it("carries the card name, exact prompt, every candidate path, and the rejection criteria", () => {
    const prompt = buildJudgePrompt("Longbowman", "a cheerful archer, ART_STYLE", candidates());
    expect(prompt).toContain("Longbowman");
    expect(prompt).toContain("a cheerful archer, ART_STYLE");
    expect(prompt).toContain("/review/a.png");
    expect(prompt).toContain("/review/b.png");
    expect(prompt).toContain("text baked into the image");
    expect(prompt).toContain("frame or border");
    expect(prompt).toContain("blank or black frame");
    expect(prompt).toContain("wrong subject");
    expect(prompt).toContain("kid-friendly");
  });
});

describe("parseJudgeOutput", () => {
  const validIds = ["cloudflare-sdxl", "supergrok-manual"];

  it("parses a bare JSON object", () => {
    const out = parseJudgeOutput(`{"winner": "cloudflare-sdxl", "reason": "cleaner lines"}`, validIds);
    expect(out).toEqual({ winner: "cloudflare-sdxl", reason: "cleaner lines" });
  });

  it("unwraps a claude --output-format json envelope", () => {
    const envelope = JSON.stringify({
      result: `{"winner": "supergrok-manual", "reason": "better likeness"}`,
    });
    expect(parseJudgeOutput(envelope, validIds)).toEqual({
      winner: "supergrok-manual",
      reason: "better likeness",
    });
  });

  it("scrapes a JSON object out of surrounding prose", () => {
    const out = parseJudgeOutput(
      `Here is my verdict:\n{"winner": "cloudflare-sdxl", "reason": "no border"}\nDone.`,
      validIds,
    );
    expect(out).toEqual({ winner: "cloudflare-sdxl", reason: "no border" });
  });

  it("scrapes a prefaced, code-fenced reply out of a claude --output-format json envelope", () => {
    const envelope = JSON.stringify({
      result: 'Here is my verdict:\n```json\n{"winner": "supergrok-manual", "reason": "no border"}\n```',
    });
    expect(parseJudgeOutput(envelope, validIds)).toEqual({
      winner: "supergrok-manual",
      reason: "no border",
    });
  });

  it("rejects a winner that names an unknown provider", () => {
    expect(parseJudgeOutput(`{"winner": "made-up", "reason": "x"}`, validIds)).toBeUndefined();
  });

  it("is undefined for unparseable garbage", () => {
    expect(parseJudgeOutput("not json at all", validIds)).toBeUndefined();
  });
});

describe("judgeCard", () => {
  it("reports missing with zero candidates, never calling the judge", () => {
    let called = false;
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: [],
      cache: {},
      runJudge: () => {
        called = true;
        return { ok: true, timedOut: false, output: "{}" };
      },
    });
    expect(outcome).toEqual({ status: "missing" });
    expect(called).toBe(false);
  });

  it("picks the only candidate with no judge call", () => {
    let called = false;
    const [a] = candidates();
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: [a!],
      cache: {},
      runJudge: () => {
        called = true;
        return { ok: true, timedOut: false, output: "{}" };
      },
    });
    expect(outcome).toEqual({ status: "single", winner: "cloudflare-sdxl", reason: "only candidate available" });
    expect(called).toBe(false);
  });

  it("is unjudged, not thrown, when runJudge is undefined (no claude on PATH)", () => {
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: candidates(),
      cache: {},
      runJudge: undefined,
    });
    expect(outcome.status).toBe("unjudged");
    if (outcome.status === "unjudged") expect(outcome.reason).toMatch(/not on PATH/);
  });

  it("is unjudged when the runner reports a timeout, and writes nothing to the cache", () => {
    const cache: JudgeCache = {};
    const result: RunJudgeResult = { ok: false, timedOut: true };
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: candidates(),
      cache,
      runJudge: () => result,
    });
    expect(outcome).toEqual({ status: "unjudged", reason: "claude timed out" });
    expect(cache).toEqual({});
  });

  it("is unjudged when the runner throws", () => {
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: candidates(),
      cache: {},
      runJudge: () => {
        throw new Error("ENOENT");
      },
    });
    expect(outcome).toEqual({ status: "unjudged", reason: "ENOENT" });
  });

  it("is unjudged when the runner succeeds but the output has no usable verdict", () => {
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: candidates(),
      cache: {},
      runJudge: () => ({ ok: true, timedOut: false, output: "I refuse to answer" }),
    });
    expect(outcome).toEqual({ status: "unjudged", reason: "claude did not return a usable verdict" });
  });

  it("judges, and writes the cache entry keyed by the candidates' content hashes", () => {
    const cache: JudgeCache = {};
    const [a, b] = candidates();
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: [a!, b!],
      cache,
      runJudge: () => ({
        ok: true,
        timedOut: false,
        output: `{"winner": "cloudflare-sdxl", "reason": "sharper lines"}`,
      }),
      now: () => "2026-01-01T00:00:00.000Z",
    });
    expect(outcome).toEqual({ status: "judged", winner: "cloudflare-sdxl", reason: "sharper lines" });
    const key = candidateCacheKey([a!, b!]);
    expect(cache[key]).toEqual({
      winner: "cloudflare-sdxl",
      reason: "sharper lines",
      judgedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns the cached verdict and never calls the judge again", () => {
    const [a, b] = candidates();
    const key = candidateCacheKey([a!, b!]);
    const cache: JudgeCache = { [key]: { winner: "supergrok-manual", reason: "nicer colors", judgedAt: "x" } };
    let called = false;
    const outcome = judgeCard({
      cardName: "X",
      imagePrompt: "p",
      candidates: [a!, b!],
      cache,
      runJudge: () => {
        called = true;
        return { ok: true, timedOut: false, output: "{}" };
      },
    });
    expect(outcome).toEqual({ status: "cached", winner: "supergrok-manual", reason: "nicer colors" });
    expect(called).toBe(false);
  });

  it("round-trips sha256Hex consistently for identical bytes", () => {
    expect(sha256Hex(bytesA)).toBe(sha256Hex(new Uint8Array(bytesA)));
    expect(sha256Hex(bytesA)).not.toBe(sha256Hex(bytesB));
  });
});
