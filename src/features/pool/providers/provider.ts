/**
 * The image-provider PORT (#67, on map #61).
 *
 * A port in this repo's sense (`CONTEXT.md` -> Architecture): an interface the
 * caller accepts as a dependency, with real adapters behind it and one shared
 * contract suite proving they agree. Before this, `image.ts` hardcoded one URL
 * and exported `generateImage(prompt, opts)` with a `fetchImpl` escape hatch —
 * a shallow module wearing a deep module's clothes, since the provider was a
 * string constant rather than a parameter.
 *
 * ── What one generate() call owns ────────────────────────────────────────────
 * ONE logical attempt, however many HTTP round-trips that takes. AI Horde
 * submits then polls; that loop lives inside its adapter, so the runner never
 * learns that one provider is asynchronous and the others are not.
 *
 * It does NOT own retry, backoff, concurrency or pacing. #63 made per-provider
 * throttling a requirement rather than an optimisation (a single global gate
 * costs N x wall-clock under an eager bake-off and defeats the map's throughput
 * driver), and a throttle is cross-card scheduling — it cannot live inside a
 * single call. So the adapter DECLARES its pacing as data and the runner in
 * `scripts/seed/index.ts` enforces it.
 *
 * ── The two kinds of provider knowledge, and why they are separate ───────────
 * `params` determines the BYTES and is hashed into the review filename.
 * `minIntervalMs` / `concurrency` are PACING and are not, because tuning
 * throughput must never invalidate a folder of reviewed images and force a
 * re-review for a wall-clock change.
 *
 * ── Why params exists at all ─────────────────────────────────────────────────
 * `promptHash` (keys.ts, D4) content-addresses the full prompt including
 * ART_STYLE, so an ART_STYLE edit cannot leave a stale reviewed image standing
 * in for a new one. Adapter parameters — model, steps, seed, guidance, sampler —
 * determine the bytes just as completely and appear in no prompt. Bumping SDXL
 * from 20 steps to 30 would otherwise leave every review file matching: D4's
 * hole, reopened one level down. Hashing the declared bag closes it.
 *
 * That makes `params` load-bearing in a way worth stating: it must be TOTAL.
 * `generate()` must build its request from `{prompt, size, ...params}` and
 * nothing else, so that "does this adapter read anything outside params?" is a
 * checkable review question rather than a hope.
 *
 * ── What it deliberately does NOT promise ────────────────────────────────────
 * Determinism. #64 measured Pollinations returning byte-identical JPEGs for a
 * repeated prompt, then caught it silently swapping its model (docs say FLUX,
 * responses report `sana`) so that a six-week-old prompt regenerates to
 * different bytes. Reproducibility is a property of a provider's
 * currently-deployed model, never a contract. Hence `model` on the result: the
 * only trustworthy witness of what drew a card is what the response reported,
 * not what the request asked for.
 */
import { createHash } from "node:crypto";
import type { ImageFormat } from "../image-size";

/** Every card renders at this size; a provider that cannot match it is unusable. */
export const CARD_SIZE = { width: 768, height: 768 } as const;

export interface ImageSizeRequest {
  width: number;
  height: number;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  /** Encoded format, sniffed from the bytes rather than trusted from a header. */
  format: ImageFormat;
  /**
   * The model the response actually NAMED, where the provider says so
   * (Pollinations' `x-model-used`, AI Horde's worker model). Undefined when the
   * provider reports nothing. Never the model that was requested — #64 proved
   * those differ, silently.
   */
  model?: string;
}

/**
 * Flat, JSON-serialisable request parameters. Scalars only: the value is hashed,
 * and a nested or non-deterministic value would make the hash unstable and
 * invalidate every review file on the next run.
 */
export type ProviderParams = Readonly<Record<string, string | number | boolean>>;

export interface ImageProvider {
  /** Stable slug, unique in the registry. Appears in review filenames and in `seed/cards.json`. */
  readonly id: string;
  /** What this provider encodes to. Decides the review file's extension. */
  readonly format: ImageFormat;
  /** TOTAL set of request parameters. Hashed into the review filename. */
  readonly params: ProviderParams;
  /** Minimum gap between request STARTS in this provider's lane. Not hashed. */
  readonly minIntervalMs: number;
  /** Workers in this provider's lane. Not hashed. */
  readonly concurrency: number;
  /** True when this provider's credentials are present in the environment. */
  isConfigured(): boolean;
  /** Env vars a caller must set to configure it — used by the startup error. */
  readonly requiredEnv: readonly string[];
  /**
   * One logical attempt. Throws `ProviderRetryable` for transient failures and
   * rate limits; anything else is treated as fatal for this attempt.
   */
  generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage>;
}

/**
 * A failure worth another attempt — a 5xx, a network blip, or a 429 carrying a
 * `Retry-After` the runner should honour.
 *
 * Carrying a retry hint is NOT the quota-vs-rate classifier #68 forbids. That
 * classifier would decide whether a lane is DEAD, and #68 established it would
 * fail open: Cloudflare's exhaustion signal is undocumented and Pollinations'
 * 429 means the opposite thing. Nothing here reads a signal to make that
 * decision — the runner infers a dead lane behaviourally, by counting.
 */
export class ProviderRetryable extends Error {
  constructor(
    message: string,
    readonly retryAfterMs?: number,
    /**
     * Selects the longer backoff ramp. Providers throttle far harder than they
     * fail, so a rate limit needs seconds where a 500 needs milliseconds — the
     * tuning the previous `generateImage` carried, kept.
     *
     * This is backoff length, NOT the liveness decision #68 forbids: nothing
     * reads it to conclude a lane is finished. Being wrong here costs a few
     * seconds of waiting; being wrong about liveness costs a whole provider's
     * contribution to the bake-off, which is why that call is behavioural.
     */
    readonly rateLimited = false,
  ) {
    super(message);
    this.name = "ProviderRetryable";
  }
}

/**
 * What escapes once retries are exhausted, for ANY cause (#68). Deliberately
 * carries no classification of why — the runner's circuit breaker counts these,
 * it never inspects them.
 */
export class ProviderFailedTerminally extends Error {
  constructor(
    readonly providerId: string,
    readonly attempts: number,
    override readonly cause: unknown,
  ) {
    super(`${providerId} failed after ${attempts} attempt(s): ${String(cause)}`);
    this.name = "ProviderFailedTerminally";
  }
}

/**
 * First 4 hex chars of sha256 over the canonicalised params.
 *
 * Keys are sorted so the hash depends on the parameter VALUES rather than on
 * the order someone happened to type them — reordering an object literal must
 * not invalidate a folder of reviewed images.
 */
export function paramHash(params: ProviderParams): string {
  const canonical = JSON.stringify(
    Object.keys(params)
      .sort()
      .map((k) => [k, params[k]]),
  );
  return createHash("sha256").update(canonical).digest("hex").slice(0, 4);
}

/**
 * The provider half of a review filename: `<id>-<paramHash4>`.
 *
 * This is what makes a provider switch behave exactly like an ART_STYLE edit
 * without touching `promptHash`. `--sync` resolves `card.provider ?? theme.provider`,
 * recomputes this segment from the REGISTERED adapter, and looks for that file.
 * Switch provider, or drift a param, and the path misses — so FR9 finds no
 * reviewed image and refuses the insert before any write.
 *
 * Keeping it out of `promptHash` is what lets the contact sheet work: the three
 * bake-off candidates for one prompt share a `promptHash`, so the subject x
 * provider grid (#63) has a row to group by.
 */
export function providerSegment(provider: Pick<ImageProvider, "id" | "params">): string {
  return `${provider.id}-${paramHash(provider.params)}`;
}
