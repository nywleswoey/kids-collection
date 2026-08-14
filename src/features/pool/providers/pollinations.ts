/**
 * Pollinations adapter — the provider this repo already spoke, now behind the
 * port (#67).
 *
 * ── Why the token is REQUIRED, not optional ──────────────────────────────────
 * Pollinations works anonymously, so an optional token is tempting. It is the
 * wrong call. The registered "seed" tier is one request per 5s against the
 * anonymous tier's one per 15s (#62), so falling back silently would make the
 * lane three times slower with nothing on screen to say why — and #67 rejected
 * exactly that class of invisible narrowing when it chose a code registry over
 * credential auto-detection. Registration is free and takes no payment method,
 * which is what keeps #68's "$0 is structural" intact.
 *
 * ── Why the seed is pinned ───────────────────────────────────────────────────
 * #64 measured the omitted `seed` taking a fixed server-side default of 42 and
 * proved it real with a genuine cache-MISS regeneration. That default is
 * undocumented, so the map binds this ticket to pin it explicitly rather than
 * inherit it. Pinned in `params`, so it is inside the review filename's hash and
 * changing it invalidates the reviews it would change.
 *
 * ── `x-model-used` is absent on a cache hit ──────────────────────────────────
 * Measured live: a MISS carries `x-model-used`, a HIT carries no auth or model
 * headers at all. Pollinations' cache is durable and normalised across users
 * (#64), so a common subject is likely to be served from it — which means the
 * model is unwitnessed precisely when the bytes are oldest and most likely to
 * predate a model swap. `model` is therefore optional and undefined means
 * "unwitnessed", never "the requested model answered".
 *
 * ── What `model` is for ──────────────────────────────────────────────────────
 * #64 caught Pollinations serving `sana` for a request that asked for `flux`,
 * with no changelog and no announcement — the docs still say FLUX. The only
 * witness was the `x-model-used` response header, so it is read here and carried
 * out on the result. `params.model` records what was ASKED FOR; the header
 * records what actually drew the card, and they are not the same fact.
 */
import {
  assertOk,
  finishGeneration,
  readBytes,
  type FetchImpl,
  type HttpAdapterOptions,
} from "./http";
import type { GeneratedImage, ImageProvider, ImageSizeRequest } from "./provider";

const ENDPOINT = "https://image.pollinations.ai/prompt/";

/**
 * Refuse a response that says, in as many words, that the token did not work.
 *
 * A key being SET is not a key being ACCEPTED, and the gap between those two is
 * not cosmetic here: the registered tier is one request per 5s where anonymous
 * is one per 15s, and this adapter declares 5s pacing. Running unauthenticated
 * on seed-tier pacing means pushing three times the permitted rate, so the lane
 * spends the whole run in 429 backoff — and the seam's own startup check would
 * have passed, because `isConfigured()` can only see that the variable is
 * non-empty.
 *
 * Non-retryable on purpose: a rejected credential is rejected on every attempt,
 * so the retry ladder would only delay the diagnosis.
 *
 * Only fires on an EXPLICIT `unauthenticated`. A cache hit carries no auth
 * headers at all, and absence must not be read as failure.
 */
function assertAuthenticated(headers?: Headers): void {
  if (headers?.get?.("x-auth-status") !== "unauthenticated") return;
  throw new Error(
    "pollinations: POLLINATIONS_TOKEN was rejected (x-auth-status: unauthenticated). " +
      "The request ran on the anonymous tier, which is rate-limited 3x harder than the " +
      "pacing this adapter declares. Check the token at auth.pollinations.ai.",
  );
}

export function pollinations(opts: HttpAdapterOptions = {}): ImageProvider {
  const fetchImpl: FetchImpl = opts.fetchImpl ?? fetch;
  return {
    id: "pollinations",
    role: "lane",
    format: "jpeg",
    params: {
      model: "flux",
      // Pinned rather than inherited — see the header note. #64.
      seed: 42,
      nologo: true,
    },
    // Registered "seed" tier: one request every 5s. Serial by construction, so
    // one worker is all the lane can use.
    minIntervalMs: 5_000,
    concurrency: 1,
    requiredEnv: ["POLLINATIONS_TOKEN"],
    isConfigured: () => Boolean(process.env.POLLINATIONS_TOKEN),

    async generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage> {
      const url =
        `${ENDPOINT}${encodeURIComponent(prompt)}` +
        `?width=${size.width}&height=${size.height}` +
        `&model=${this.params.model}&seed=${this.params.seed}&nologo=${this.params.nologo}`;
      const res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${process.env.POLLINATIONS_TOKEN ?? ""}` },
      });
      assertOk(this.id, res);
      assertAuthenticated(res.headers);
      const bytes = await readBytes(this.id, res);
      // Absent on a cache hit — see the header note. Undefined then means
      // "unwitnessed", never "the requested model answered".
      return finishGeneration(
        this,
        bytes,
        size,
        res.headers?.get?.("x-model-used") ?? undefined,
      );
    },
  };
}
