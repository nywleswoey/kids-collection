import { describe, it, expect } from "vitest";
import { runBakeOff, makeGate, type BakeOffJob } from "@/features/pool/bake-off";
import { fakeProvider } from "@/features/pool/providers/fake";
import {
  CARD_SIZE,
  ProviderFailedTerminally,
  ProviderRetryable,
  type GeneratedImage,
  type ImageProvider,
} from "@/features/pool/providers";

/**
 * The eager bake-off runner (#63's shape, #67's mechanics).
 *
 * These are the tests the old `fetchImpl` seam could not express. Retry, pacing
 * and the circuit breaker are scheduling concerns spanning many cards and many
 * providers; stubbing `fetch` could only ever reach one HTTP call at a time.
 * A fake PROVIDER puts the whole lane under test with no wire at all.
 */

type Card = { name: string; imagePrompt: string };

function jobs(...names: string[]): BakeOffJob<Card>[] {
  return names.map((name) => ({ theme: "Warriors", card: { name, imagePrompt: name } }));
}

interface Saved {
  provider: string;
  card: string;
  image: GeneratedImage;
}

function deps(over: Partial<Parameters<typeof runBakeOff<Card>>[2]> = {}) {
  const saved: Saved[] = [];
  const warnings: string[] = [];
  const base = {
    size: CARD_SIZE,
    retries: 2,
    buildPrompt: (card: Card) => card.imagePrompt,
    isReviewed: () => false,
    save: (job: BakeOffJob<Card>, provider: ImageProvider, image: GeneratedImage) => {
      saved.push({ provider: provider.id, card: job.card.name, image });
    },
    log: () => {},
    warn: (m: string) => warnings.push(m),
    error: () => {},
    sleep: async () => {}, // never spend real seconds proving a backoff ramp
  };
  return { deps: { ...base, ...over }, saved, warnings };
}

describe("runBakeOff — fan-out (#63)", () => {
  it("generates every new card from every provider", async () => {
    const a = fakeProvider({ id: "alpha" });
    const b = fakeProvider({ id: "beta" });
    const { deps: d, saved } = deps();

    const outcomes = await runBakeOff(jobs("Longbowman", "Halberdier"), [a, b], d);

    expect(saved).toHaveLength(4);
    expect(outcomes.map((o) => o.generated)).toEqual([2, 2]);
    expect(a.calls).toEqual(["Longbowman", "Halberdier"]);
    expect(b.calls).toEqual(["Longbowman", "Halberdier"]);
  });

  it("resumes: a candidate already on disk is skipped, per lane", async () => {
    // Resume is per (card, provider), not per card — the whole point of the
    // filename carrying the provider. A lane that died mid-run must be able to
    // finish without the surviving lanes redrawing anything.
    const a = fakeProvider({ id: "alpha" });
    const b = fakeProvider({ id: "beta" });
    const { deps: d, saved } = deps({
      isReviewed: (job, provider) => provider.id === "alpha" && job.card.name === "Longbowman",
    });

    const outcomes = await runBakeOff(jobs("Longbowman", "Halberdier"), [a, b], d);

    expect(a.calls).toEqual(["Halberdier"]);
    expect(b.calls).toEqual(["Longbowman", "Halberdier"]);
    expect(outcomes.find((o) => o.providerId === "alpha")).toMatchObject({
      generated: 1,
      skipped: 1,
    });
    expect(saved).toHaveLength(3);
  });

  it("carries the observed model through to the saved candidate", async () => {
    const { deps: d, saved } = deps();
    await runBakeOff(jobs("Longbowman"), [fakeProvider({ model: "sana" })], d);
    expect(saved[0].image.model).toBe("sana");
  });
});

describe("runBakeOff — retry", () => {
  it("retries a ProviderRetryable and succeeds", async () => {
    const p = fakeProvider({ script: [new ProviderRetryable("429")] });
    const { deps: d, saved } = deps({ retries: 2 });
    const [outcome] = await runBakeOff(jobs("Longbowman"), [p], d);
    expect(outcome).toMatchObject({ generated: 1, failed: 0 });
    expect(p.calls).toHaveLength(2);
    expect(saved).toHaveLength(1);
  });

  it("gives up after the retry budget and fails the job terminally", async () => {
    const p = fakeProvider({
      script: [
        new ProviderRetryable("429"),
        new ProviderRetryable("429"),
        new ProviderRetryable("429"),
      ],
    });
    const { deps: d } = deps({ retries: 2 });
    const [outcome] = await runBakeOff(jobs("Longbowman"), [p], d);
    expect(outcome).toMatchObject({ generated: 0, failed: 1 });
    expect(p.calls).toHaveLength(3); // initial + 2 retries
  });

  it("does NOT retry a non-retryable error — a rejected request stays rejected", async () => {
    // Retrying something the provider already judged spends the lane's budget on
    // a guaranteed failure.
    const p = fakeProvider({ script: [new Error("400 rejected prompt")] });
    const { deps: d } = deps({ retries: 5 });
    const [outcome] = await runBakeOff(jobs("Longbowman"), [p], d);
    expect(outcome.failed).toBe(1);
    expect(p.calls).toHaveLength(1);
  });

  it("honours Retry-After over the backoff ramp", async () => {
    const waits: number[] = [];
    const p = fakeProvider({ script: [new ProviderRetryable("429", 2000, true)] });
    const { deps: d } = deps({ retries: 2, sleep: async (ms: number) => void waits.push(ms) });
    await runBakeOff(jobs("Longbowman"), [p], d);
    expect(waits).toContain(2000);
  });

  it("gives a rate limit the long ramp and an ordinary failure the short one", async () => {
    // Providers throttle far harder than they fail, so the two need different
    // orders of magnitude — the tuning the old generateImage carried.
    const limited: number[] = [];
    const p1 = fakeProvider({ script: [new ProviderRetryable("429", undefined, true)] });
    await runBakeOff(
      jobs("A"),
      [p1],
      deps({ retries: 2, sleep: async (ms: number) => void limited.push(ms) }).deps,
    );

    const transient: number[] = [];
    const p2 = fakeProvider({ script: [new ProviderRetryable("500")] });
    await runBakeOff(
      jobs("A"),
      [p2],
      deps({ retries: 2, sleep: async (ms: number) => void transient.push(ms) }).deps,
    );

    expect(limited[0]).toBeGreaterThan(transient[0]);
  });

  it("reports a terminal failure as ProviderFailedTerminally, with no cause classification", async () => {
    // #68: no quota-vs-rate classifier. Whatever went wrong, what escapes is the
    // same type, because the breaker counts these rather than reading them.
    let seen: unknown;
    const p = fakeProvider({ script: [new Error("who knows")] });
    const { deps: d } = deps({ retries: 0, error: (m: string) => void (seen = m) });
    await runBakeOff(jobs("A"), [p], d);
    expect(String(seen)).toContain(ProviderFailedTerminally.name);
  });
});

describe("runBakeOff — circuit breaker (#67)", () => {
  const dead = () => new Error("terminal");

  it("abandons a lane after the threshold of consecutive failures", async () => {
    const p = fakeProvider({ id: "cloudflare-sdxl", script: [dead(), dead(), dead()] });
    const { deps: d, warnings } = deps({ retries: 0, breakerThreshold: 3 });

    const [outcome] = await runBakeOff(jobs("a", "b", "c", "d", "e", "f"), [p], d);

    expect(outcome).toMatchObject({
      abandoned: true,
      failed: 3,
      generated: 0,
      notAttempted: 3,
    });
    // The remaining cards are skipped instantly rather than each paying a full
    // retry ladder against a lane that is already gone.
    expect(p.calls).toHaveLength(3);
    expect(warnings.join()).toContain("abandoned");
  });

  it("counts CONSECUTIVE failures — a success resets the tally", async () => {
    // Scattered failures across a 30-card theme are normal and must not read as
    // exhaustion, or one bad card in ten kills a healthy provider's lane.
    const p = fakeProvider({ script: [dead(), dead(), "ok", dead(), dead()] });
    const { deps: d } = deps({ retries: 0, breakerThreshold: 3 });

    const [outcome] = await runBakeOff(jobs("a", "b", "c", "d", "e", "f"), [p], d);

    expect(outcome.abandoned).toBe(false);
    expect(outcome.failed).toBe(4);
    expect(outcome.generated).toBe(2);
    expect(outcome.notAttempted).toBe(0);
  });

  it("a dead lane does not stop the others — the run completes", async () => {
    // The entire point of N lanes: one provider exhausting its quota costs its
    // own candidates and nothing else.
    const doomed = fakeProvider({ id: "doomed", script: [dead(), dead(), dead()] });
    const healthy = fakeProvider({ id: "healthy" });
    const { deps: d, saved } = deps({ retries: 0, breakerThreshold: 3 });

    const outcomes = await runBakeOff(jobs("a", "b", "c", "d"), [doomed, healthy], d);

    expect(outcomes.find((o) => o.providerId === "doomed")!.abandoned).toBe(true);
    expect(outcomes.find((o) => o.providerId === "healthy")).toMatchObject({
      generated: 4,
      abandoned: false,
    });
    expect(saved.filter((s) => s.provider === "healthy")).toHaveLength(4);
  });

  it("accounts for every job exactly once", async () => {
    const p = fakeProvider({ script: [dead(), dead(), dead()] });
    const { deps: d } = deps({ retries: 0, breakerThreshold: 3 });
    const all = jobs("a", "b", "c", "d", "e");
    const [o] = await runBakeOff(all, [p], d);
    expect(o.generated + o.skipped + o.failed + o.notAttempted).toBe(all.length);
  });
});

describe("makeGate — per-lane pacing (#63's requirement)", () => {
  it("spaces request starts by the lane's own interval", async () => {
    const waits: number[] = [];
    const gate = makeGate(1000, async (ms) => void waits.push(ms));
    await gate();
    await gate();
    await gate();
    // First slot is immediate; each subsequent one waits out the interval. The
    // clock barely advances under an instant sleep, so the waits accumulate.
    expect(waits.filter((w) => w > 0)).toHaveLength(2);
    expect(waits[waits.length - 1]).toBeGreaterThan(waits[0]);
  });

  it("is a closure, so two lanes never share a slot queue", async () => {
    // This is the whole difference from the module-level `nextSlot` it replaces.
    // Under one global gate the eager bake-off costs N x wall-clock and #63's
    // throughput driver is actively harmed.
    const fast: number[] = [];
    const slow: number[] = [];
    const fastGate = makeGate(0, async (ms) => void fast.push(ms));
    const slowGate = makeGate(5000, async (ms) => void slow.push(ms));

    await Promise.all([fastGate(), slowGate(), fastGate(), slowGate()]);

    expect(fast).toHaveLength(0); // no interval, no waiting
    expect(slow.some((w) => w > 0)).toBe(true);
  });

  it("does not pace at all when the interval is zero", async () => {
    const waits: number[] = [];
    const gate = makeGate(0, async (ms) => void waits.push(ms));
    await gate();
    await gate();
    expect(waits).toHaveLength(0);
  });
});
