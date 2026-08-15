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
 * tan mat with a gold rule — got baked into roughly a third of its candidates.
 * It reads like an adapter problem and is not: the cause was the words
 * "trading-card" in `ART_STYLE` (`../prompt.ts`), which SDXL drew literally
 * while Pollinations' `sana` ignored them. The fix is that edit, not a parameter
 * here. #81 measured `negative_prompt` at 5/20 against a 7/20 baseline, so it
 * buys nothing — and every entry in `params` is hashed into review filenames, so
 * a parameter that buys nothing still costs a folder of reviewed images.
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
