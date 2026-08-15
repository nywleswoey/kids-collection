/**
 * Pollinations adapter — the provider this repo already spoke, now behind the
 * port (#67).
 *
 * ── Anonymous, and why the token is gone ─────────────────────────────────────
 * #62 shortlisted the free registered "seed" tier, and #67 made its token
 * REQUIRED on the reasoning that registration bought 3x the anonymous rate and
 * that falling back silently would hide a threefold slowdown. Measured against
 * the live service while verifying #67, both halves of that premise are false:
 *
 *   - `auth.pollinations.ai` no longer resolves. Auth moved to
 *     `enter.pollinations.ai` and the authenticated image API to
 *     `gen.pollinations.ai`. Pollinations' own APIDOCS still document the dead
 *     host — the same stale-docs pattern #64 caught with FLUX and `sana`.
 *   - The Seed/Flower/Nectar tiers are replaced by **Pollen**, prepaid credit at
 *     roughly $1 = 1 Pollen. Their FAQ still claims "flux: infinite images per
 *     Pollen (always free!)"; `GET gen.pollinations.ai/image/models` prices all
 *     21 image models, `flux` among them at 0.002 Pollen. An authenticated
 *     768x768 request answers `402 PAYMENT_REQUIRED`.
 *
 * Buying Pollen needs a card, which #72 forbids outright and #68 made
 * structural — the card-free account state IS the cost control. So the
 * authenticated path is closed to this map by a decision already taken, not by a
 * missing credential. #69 chose the consequence: stay anonymous on the legacy
 * host, which is free, still works, and drew every one of the ~360 cards already
 * in the pool.
 *
 * No credential is sent. `POLLINATIONS_TOKEN` may still sit in `.env.local` for
 * #65's records, but this host ignores it, and sending a secret to somewhere
 * that ignores it is worse than sending nothing.
 *
 * ── Pacing is a hard serial cap, not a rate ──────────────────────────────────
 * The anonymous limit is no longer #62's documented "one request every 15s". A
 * second concurrent request now answers:
 *
 *     429 {"error":"Too Many Requests","message":"Queue full for IP: …
 *          1 requests already queued (max: 1). Get unlimited access at …"}
 *
 * One queued request per IP — a concurrency cap with an upsell attached, so
 * `concurrency` is 1 and not tunable upward. 15s between starts keeps the lane
 * inside the documented rate as well. This makes Pollinations the slow lane of
 * the bake-off; a 30-card theme costs roughly 8 minutes here against Cloudflare
 * SDXL's latency-bound run. It stays a lane rather than an escape hatch because
 * the map's first driver is IMAGE QUALITY, and a bake-off needs something to
 * compare Cloudflare against.
 *
 * ── Why the seed is pinned ───────────────────────────────────────────────────
 * #64 measured the omitted `seed` taking a fixed server-side default of 42 and
 * proved it real with a genuine cache-MISS regeneration. That default is
 * undocumented, so the map binds this ticket to pin it explicitly rather than
 * inherit it. Pinned in `params`, so it is inside the review filename's hash and
 * changing it invalidates the reviews it would change.
 *
 * ── `x-model-used` is absent on a cache hit ──────────────────────────────────
 * Measured live: a MISS carries `x-model-used`, a HIT carries no model header at
 * all. Pollinations' cache is durable and normalised across users (#64), so a
 * common subject is likely to be served from it — which means the model is
 * unwitnessed precisely when the bytes are oldest and most likely to predate a
 * model swap. `model` is therefore optional, and undefined means "unwitnessed",
 * never "the requested model answered".
 *
 * ── What `model` is for ──────────────────────────────────────────────────────
 * #64 caught Pollinations serving `sana` for a request that asked for `flux`,
 * with no changelog and no announcement — the docs still say FLUX. The only
 * witness was the `x-model-used` response header, so it is read here and carried
 * out on the result. `params.model` records what was ASKED FOR; the header
 * records what actually drew the card, and they are not the same fact. `sana` is
 * not in the new gateway's catalogue at all, so what the legacy host serves for
 * a `flux` request is now doubly unpinned.
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
    // A serial cap with an upsell attached, not a tunable rate — see above.
    minIntervalMs: 15_000,
    concurrency: 1,
    // The published pool's own mean: 390 cards, every one of them drawn by this
    // lane, weighed in Blob 2026-08-15 (median 77.2 KB, max 136.3 KB).
    //
    // A population rather than a sample, which is its strength and its catch.
    // #64 caught this host swapping models underneath a fixed prompt, so those
    // 390 cards span at least two of them and this is the mean of an era rather
    // than of what the lane returns today — fresh generations on the same day
    // came back at 41.5 and 44.1 KB, and #79's own figure was 57 KB. Kept as the
    // HEAVIEST of those numbers on purpose: a headroom projection that
    // over-estimates per-card weight under-estimates how many themes fit, which
    // is the safe direction to be wrong in.
    typicalCardBytes: 77_800,
    // Nothing to configure: the anonymous tier needs no credential, and the
    // credentialled one is behind a paywall this map may not cross (#72).
    requiredEnv: [],
    isConfigured: () => true,

    async generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage> {
      const url =
        `${ENDPOINT}${encodeURIComponent(prompt)}` +
        `?width=${size.width}&height=${size.height}` +
        `&model=${this.params.model}&seed=${this.params.seed}&nologo=${this.params.nologo}`;
      const res = await fetchImpl(url);
      assertOk(this.id, res);
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
