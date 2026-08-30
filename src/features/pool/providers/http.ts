/**
 * Shared HTTP plumbing for the provider adapters (#67).
 *
 * `fetchImpl` used to be a parameter of the domain-level `generateImage`, which
 * is the wrong altitude once there are N providers: tests then had to know every
 * provider's wire format to stub it. It lives HERE instead, as each adapter's
 * private constructor argument, so the contract suite can drive a real adapter
 * from recorded fixtures while the seed runner injects a whole fake *provider*.
 */
import { MIN_BYTES_PER_PIXEL, bytesPerPixel, looksBlank } from "../blank-frame";
import { readImageSize } from "../image-size";
import {
  ProviderRetryable,
  type GeneratedImage,
  type ImageProvider,
  type ImageSizeRequest,
} from "./provider";

export type FetchImpl = typeof fetch;

export interface HttpAdapterOptions {
  fetchImpl?: FetchImpl;
}

/**
 * Map a response status onto the retry taxonomy.
 *
 * 429 and 5xx are retryable; a 4xx is not, because retrying a rejected prompt or
 * a bad credential just burns the lane's budget on a guaranteed failure. The
 * runner turns whatever escapes into `ProviderFailedTerminally` either way.
 */
export function assertOk(providerId: string, res: { status: number; ok: boolean; headers?: Headers }): void {
  if (res.ok) return;
  if (res.status === 429) {
    throw new ProviderRetryable(
      `${providerId}: rate limited (429)`,
      parseRetryAfter(res.headers),
      true,
    );
  }
  if (res.status >= 500) {
    throw new ProviderRetryable(`${providerId}: upstream ${res.status}`);
  }
  throw new Error(`${providerId}: HTTP ${res.status}`);
}

/** Parse a Retry-After header (seconds) into ms; undefined if absent/unparseable. */
export function parseRetryAfter(headers?: Headers): number | undefined {
  const raw = headers?.get?.("retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  return Number.isFinite(secs) && secs >= 0 ? secs * 1000 : undefined;
}

/**
 * Read a response body as image bytes, rejecting an empty one.
 *
 * The empty check is inherited from the previous `generateImage` and is worth
 * keeping: a zero-length body written to `seed/review/` looks like a reviewed
 * card to `existsSync`, which is precisely the confusion FR9 exists to prevent.
 * The contract suite's size assertion catches the subtler version — a provider
 * returning an HTML error page with HTTP 200.
 */
export async function readBytes(
  providerId: string,
  res: { arrayBuffer(): Promise<ArrayBuffer> },
): Promise<Uint8Array> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new ProviderRetryable(`${providerId}: empty body`);
  return bytes;
}

/**
 * Turn raw bytes into a `GeneratedImage`, refusing anything that is not a usable
 * card. Every adapter ends here, which is what makes these checks uniform rather
 * than something each adapter's author had to remember.
 *
 * The format sniff also catches the sneakiest failure: a provider returning an
 * HTML or JSON error page with HTTP 200. That has a non-zero length, so the
 * empty-body check waves it through and it would land in `seed/review/` looking
 * for all the world like a reviewed card.
 *
 * The size check enforces the map's 768x768 invariant at runtime, and is not
 * hypothetical: `flux-1-schnell` has no `width`/`height` parameter at all, so an
 * adapter written against it returns a plausible image of the wrong size.
 *
 * The blank check (#78) is the one that judges the picture rather than the
 * envelope. Everything above proves an image is WELL-FORMED, and a pure black
 * 768x768 PNG is well-formed — Cloudflare SDXL returned one for ~40% of attempts
 * on a shipped prompt, and it reached `seed/review/` looking like a candidate.
 * `../blank-frame.ts` holds the threshold and the measurements behind it.
 */
export function finishGeneration(
  provider: Pick<ImageProvider, "id" | "format">,
  bytes: Uint8Array,
  size: ImageSizeRequest,
  model?: string,
): GeneratedImage {
  const measured = readImageSize(bytes);
  if (!measured) {
    throw new Error(
      `${provider.id}: response was not a recognisable PNG/JPEG/WebP (${bytes.byteLength} bytes)`,
    );
  }
  if (measured.width !== size.width || measured.height !== size.height) {
    throw new Error(
      `${provider.id}: returned ${measured.width}x${measured.height}, expected ${size.width}x${size.height}`,
    );
  }
  // The DECLARED format is not decoration — `reviewFileName` names the file from
  // it, so an adapter that declares png and returns jpeg produces a folder of
  // files whose extensions lie. Publishing survives (the path is built the same
  // way both times, and `uploadImage` sniffs the bytes for the content type), so
  // nothing downstream would ever complain; a human reading seed/review/ would
  // simply be misled, indefinitely.
  //
  // Adapter formats are written from provider docs and cannot be verified until
  // a key exists, so this is the check that catches a wrong one on the first
  // real generation rather than leaving it resting on a live test nobody has run.
  if (measured.format !== provider.format) {
    throw new Error(
      `${provider.id}: declares format "${provider.format}" but returned ${measured.format}. ` +
        `Fix the adapter's \`format\` — review filenames are named from it.`,
    );
  }
  // Last, because it is the only check here that judges the PICTURE rather than
  // the envelope, and the checks above give sharper messages when they apply.
  //
  // Retryable, on measurement rather than principle: #78 saw ~40% of attempts on
  // one prompt come back blank and attempt 2 succeed both times it was tried, so
  // another attempt is a real remedy where the 4xx above is not. A lane that
  // blanks persistently is not retried forever — `withRetry` exhausts the same
  // SEED_RETRIES ladder every other transient failure gets, and what escapes is
  // the `ProviderFailedTerminally` the circuit breaker counts.
  if (looksBlank(bytes, size)) {
    throw new ProviderRetryable(
      `${provider.id}: returned a blank frame — ${bytes.byteLength} bytes for ` +
        `${size.width}x${size.height} is ${bytesPerPixel(bytes.byteLength, size).toFixed(4)} bytes/pixel, ` +
        `below the ${MIN_BYTES_PER_PIXEL} floor, so it carries no subject`,
    );
  }
  return { bytes, format: measured.format, model };
}

/** Sleep helper for async provider polling (injectable for testing). */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
