/**
 * Cloudflare Workers AI adapter — Stable Diffusion XL (#67, shortlisted by #62).
 *
 * ── Read "SDXL", never "FLUX" ────────────────────────────────────────────────
 * #62 corrected the map's own assumption here. `@cf/black-forest-labs/flux-1-schnell`
 * has exactly two schema properties, `prompt` and `steps` — no `width`, no
 * `height` — so it cannot render at 768x768 and cannot satisfy the map's
 * invariant at any wording. `stable-diffusion-xl-base-1.0` takes `width`/`height`
 * in 256..2048 and a `seed`, so the size is exact. `finishGeneration` measures
 * the returned bytes, so if this is ever repointed at a model without size
 * control the lane fails loudly instead of quietly filling the binder with
 * mismatched art.
 *
 * ── The account this runs against ────────────────────────────────────────────
 * #68 binds this to a FRESH, dedicated Cloudflare account with no payment method
 * — not an existing card-free one. The risk it defends against is account
 * contamination: the card-free account IS the whole cost control, so anything
 * that could later attach a card to it must be nowhere near this key. #68 also
 * notes SDXL's published `$0.00/step` is absent from Cloudflare's pricing page,
 * which is a documentation gap, not a promise.
 *
 * ── Rate ─────────────────────────────────────────────────────────────────────
 * 720 requests/minute for text-to-image, so a 30-image burst is latency-bound
 * rather than rate-bound and this lane is the fast one. The nominal 8ms floor is
 * pointless in practice; 100ms keeps a burst polite without being a constraint.
 *
 * ── The frame this lane used to draw, and why the fix is not here (#81) ──────
 * This adapter was where a decorative frame border — a wooden picture frame, a
 * tan mat with a gold rule — got baked into most of its candidates. It reads
 * like an adapter problem and is not: the cause was the words "trading-card" in
 * `ART_STYLE`, which SDXL drew literally while Pollinations' `sana` ignored
 * them. The fix is that edit, and `../prompt.ts` carries the measurements.
 *
 * What belongs here is why this adapter has no `negative_prompt`. It was
 * measured, and it is not inert — it roughly halves the frame rate. It is still
 * not the fix, because deleting two words from the prompt does far better and
 * addresses the cause. And every entry in `params` is hashed into review
 * filenames, so adding one invalidates a folder of reviewed images: a partial
 * fix, at that price, stacked on top of the real one.
 *
 * ── Weight: ~826 KB a card, and why it ships anyway (#79) ───────────────────
 * This lane returns PNG at roughly 10x Pollinations' JPEG — 826 KB against the
 * published pool's measured 77.8 KB mean. #79 asked who pays for that, on two
 * counts, and measurement answered both.
 *
 * The CHILD does not. Every card surface renders through `next/image`, so a
 * browser downloads a re-encoded WebP at the width it asked for and never the
 * stored bytes. Through the production optimizer at `w=512 q=75`, 2026-08-15:
 * a 937.9 KB PNG from here delivered 39.5 KB, a 147.9 KB JPEG delivered 68.4 KB,
 * a 41.5 KB Pollinations JPEG delivered 9.6 KB. The ordering INVERTS — delivered
 * weight tracks how busy the picture is, not how heavy the source was.
 *
 * The STORE does, and `blob-budget.ts` says by how much: 39 more themes from
 * this lane against 415 from Pollinations, out of the same 968 MB. That is a
 * real difference and not yet a constraint, so nothing here re-encodes.
 *
 * There is also no cheaper thing to ask THIS model for. Measured against the
 * live endpoint on the same day: `Accept: image/jpeg` is ignored (PNG back), and
 * an invented `response_format: "jpeg"` is ignored too — SDXL's schema has no
 * output-format parameter and the endpoint drops what it does not know rather
 * than refusing it, so an unrecognised key looks like it worked. The lever that
 * DOES exist is a different model: `@cf/bytedance/stable-diffusion-xl-lightning`
 * answers **JPEG** at 88-148 KB from the identical request. It is not registered
 * here, because a model swap is a quality decision that belongs to a bake-off
 * and to the roster (#69), not to a file-size ticket.
 *
 * ── Provenance ───────────────────────────────────────────────────────────────
 * Cloudflare reports no serving-model header, so `model` comes back undefined
 * and the sidecar records only what was requested. That is an honest gap, and
 * the reason `GeneratedImage.model` is optional rather than required: a provider
 * that cannot witness what drew the card must not be made to invent it.
 */
import {
  assertOk,
  finishGeneration,
  readBytes,
  type FetchImpl,
  type HttpAdapterOptions,
} from "./http";
import type { GeneratedImage, ImageProvider, ImageSizeRequest } from "./provider";

/** Cloudflare Workers AI SDXL adapter (free tier, bake-off lane). */
export function cloudflareSdxl(opts: HttpAdapterOptions = {}): ImageProvider {
  const fetchImpl: FetchImpl = opts.fetchImpl ?? fetch;
  return {
    id: "cloudflare-sdxl",
    role: "lane",
    format: "png",
    params: {
      model: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      num_steps: 20, // the model's documented maximum
      guidance: 7.5,
      seed: 42, // pinned per #64 — never inherit an undocumented default
    },
    minIntervalMs: 100,
    concurrency: 4,
    // #66's six-subject average; corroborated 2026-08-15 at 712-938 KB across
    // four fresh generations. See the weight note above for why this stays.
    typicalCardBytes: 826_000,
    requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    isConfigured: () =>
      Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),

    async generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage> {
      const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
      const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${this.params.model}`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          width: size.width,
          height: size.height,
          num_steps: this.params.num_steps,
          guidance: this.params.guidance,
          seed: this.params.seed,
        }),
      });
      assertOk(this.id, res);
      // A failed run still answers 200 with a JSON error envelope. The format
      // sniff in finishGeneration is what rejects it — deliberately not a
      // content-type check, since the bytes are the only thing worth trusting.
      const bytes = await readBytes(this.id, res);
      return finishGeneration(this, bytes, size);
    },
  };
}
