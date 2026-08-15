import { describe, it, expect } from "vitest";
import { readImageSize } from "@/features/pool/image-size";
import {
  CARD_SIZE,
  ProviderRetryable,
  paramHash,
  type ImageProvider,
} from "@/features/pool/providers";

/**
 * Shared ImageProvider conformance spec — what makes the provider seam real
 * rather than hypothetical (#67), in the same sense as the Store contracts.
 *
 * ── What can honestly be asserted in common ──────────────────────────────────
 * The Store ports have semantic contracts to pin (`spendOne` null-on-guard-fail,
 * `swapCards` all-or-nothing). Image providers genuinely differ in output, so
 * the temptation is to conclude there is nothing to share. There is, and one
 * item is load-bearing:
 *
 *   1. The image is EXACTLY 768x768. The map names this an invariant no ticket
 *      may break, and it is not hypothetical — `flux-1-schnell` has no `width`
 *      or `height` parameter at all, so an adapter written against it returns a
 *      perfectly plausible image of the wrong size.
 *   2. The bytes are a real image. A provider answering 200 with an HTML or JSON
 *      error page passes every length check and would land in `seed/review/`
 *      looking like a reviewed card.
 *   3. Failures map onto the retry taxonomy: 429 and 5xx retryable, 4xx not.
 *      The lane runner's circuit breaker counts what escapes, so an adapter that
 *      threw raw HTTP errors would make a rate limit look like a dead lane.
 *   4. `paramHash(params)` is stable across processes and independent of key
 *      order. If it were not, a run would invalidate every review file on disk
 *      and demand a full re-review for no reason.
 *
 * Deliberately NOT here: anything about content, style or subject fidelity.
 * That is the bake-off's job (#66) and a human's judgement, not a test's.
 *
 * ── Two halves, because the fake has no wire ─────────────────────────────────
 * Everything structural applies to every provider including the in-memory fake —
 * and running it against the fake is what stops the fake drifting into a
 * stand-in that no real provider resembles, which would quietly invalidate every
 * lane-runner test that leans on it.
 *
 * The wire-behaviour half needs an HTTP transport to fail in specific ways, so
 * it applies only to the HTTP adapters, driven by recorded fixtures.
 *
 * ── Why not run it live in CI ────────────────────────────────────────────────
 * The Store contract's power is that BOTH sides run it — fake in Vitest, pg in
 * Build & Test. The analogue here would put live API calls in CI: quota burned
 * on every push, flakiness by construction, and a direct conflict with #68's
 * "$0 is structural". Hence fixtures here, and the same spec live behind an
 * opt-in script.
 */

/** Fresh provider per call, configured to succeed. */
export type MakeProvider = () => ImageProvider;

/**
 * Structural contract — every provider, fake included.
 */
export function runImageProviderContract(label: string, makeProvider: MakeProvider) {
  describe(`ImageProvider contract: ${label}`, () => {
    it("returns bytes that decode at exactly the requested size", async () => {
      const image = await makeProvider().generate("a friendly panda", CARD_SIZE);
      const measured = readImageSize(image.bytes);
      expect(measured).not.toBeNull();
      expect(measured!.width).toBe(CARD_SIZE.width);
      expect(measured!.height).toBe(CARD_SIZE.height);
    });

    it("reports the format it actually returned, and it matches the declared one", () => {
      // The declared `format` decides the review file's extension, so a
      // disagreement would name files after a format the bytes are not — and the
      // contact sheet's <img> tags would depend on a browser forgiving it.
      const provider = makeProvider();
      return provider.generate("a friendly panda", CARD_SIZE).then((image) => {
        expect(image.format).toBe(provider.format);
        expect(readImageSize(image.bytes)!.format).toBe(image.format);
      });
    });

    it("declares a non-empty, slug-shaped id", () => {
      expect(makeProvider().id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    it("declares flat, scalar params — nothing that could hash unstably", () => {
      const provider = makeProvider();
      for (const [key, value] of Object.entries(provider.params)) {
        expect(
          ["string", "number", "boolean"].includes(typeof value),
          `params.${key} is ${typeof value}`,
        ).toBe(true);
      }
    });

    it("hashes its params stably, and independently of key order", () => {
      const provider = makeProvider();
      expect(paramHash(provider.params)).toBe(paramHash(provider.params));
      const reordered = Object.fromEntries(
        Object.entries(provider.params).reverse(),
      ) as typeof provider.params;
      expect(paramHash(reordered)).toBe(paramHash(provider.params));
      expect(paramHash(provider.params)).toMatch(/^[0-9a-f]{4}$/);
    });

    it("names an env var for every credential it needs", () => {
      const provider = makeProvider();
      if (!provider.isConfigured()) expect(provider.requiredEnv.length).toBeGreaterThan(0);
    });

    it("declares usable pacing", () => {
      const provider = makeProvider();
      expect(provider.minIntervalMs).toBeGreaterThanOrEqual(0);
      expect(provider.concurrency).toBeGreaterThanOrEqual(1);
    });
  });
}

export interface ContractFixtures {
  /** HTTP 200 with a correctly-sized image in this provider's native format. */
  ok(): Response;
  /** HTTP 429, optionally carrying Retry-After. */
  rateLimited(retryAfterSeconds?: number): Response;
  /** HTTP 500. */
  serverError(): Response;
  /** HTTP 400 — a rejected prompt or a bad credential. */
  rejected(): Response;
  /** HTTP 200 whose body is not an image at all. */
  notAnImage(): Response;
  /** HTTP 200 with a real image of the wrong dimensions. */
  wrongSize(): Response;
  /** HTTP 200 with a correctly-sized image in a format the adapter does not declare. */
  wrongFormat(): Response;
}

/** Fresh HTTP adapter per call, wired to the supplied responder. */
export type MakeHttpProvider = (respond: () => Response) => ImageProvider;

/**
 * Wire-behaviour contract — the HTTP adapters only.
 */
export function runHttpProviderContract(
  label: string,
  makeProvider: MakeHttpProvider,
  fixtures: ContractFixtures,
) {
  runImageProviderContract(label, () => makeProvider(fixtures.ok));

  describe(`ImageProvider HTTP contract: ${label}`, () => {
    it("refuses a correctly-formed image of the wrong size", async () => {
      // The 768x768 invariant, enforced rather than assumed.
      const provider = makeProvider(fixtures.wrongSize);
      await expect(provider.generate("x", CARD_SIZE)).rejects.toThrow(/768/);
    });

    it("refuses a 200 response whose body is not an image", async () => {
      const provider = makeProvider(fixtures.notAnImage);
      await expect(provider.generate("x", CARD_SIZE)).rejects.toThrow();
    });

    it("refuses an image in a format it does not declare", async () => {
      // The declared format names the review file, so an adapter declaring png
      // and returning jpeg fills seed/review/ with extensions that lie. Nothing
      // downstream complains — the path is built the same way both times and
      // uploadImage sniffs the bytes — so only this catches it.
      const provider = makeProvider(fixtures.wrongFormat);
      await expect(provider.generate("x", CARD_SIZE)).rejects.toThrow(/declares format/);
    });

    it("throws ProviderRetryable on 429, so a rate limit is not a dead lane", async () => {
      const provider = makeProvider(fixtures.rateLimited);
      await expect(provider.generate("x", CARD_SIZE)).rejects.toBeInstanceOf(
        ProviderRetryable,
      );
    });

    it("carries Retry-After through as milliseconds", async () => {
      const provider = makeProvider(() => fixtures.rateLimited(2));
      const err = await provider.generate("x", CARD_SIZE).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ProviderRetryable);
      expect((err as ProviderRetryable).retryAfterMs).toBe(2000);
    });

    it("marks a 429 as rate-limited so it gets the long backoff ramp", async () => {
      const provider = makeProvider(fixtures.rateLimited);
      const err = await provider.generate("x", CARD_SIZE).catch((e: unknown) => e);
      expect((err as ProviderRetryable).rateLimited).toBe(true);
    });

    it("throws ProviderRetryable on 5xx", async () => {
      const provider = makeProvider(fixtures.serverError);
      await expect(provider.generate("x", CARD_SIZE)).rejects.toBeInstanceOf(
        ProviderRetryable,
      );
    });

    it("does NOT mark a 4xx retryable — a rejected request stays rejected", async () => {
      // Retrying something the provider has already judged spends the lane's
      // budget on a guaranteed failure, so this must fall outside the retryable
      // type rather than merely exhaust its attempts.
      const provider = makeProvider(fixtures.rejected);
      const err = await provider.generate("x", CARD_SIZE).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(ProviderRetryable);
    });
  });
}
