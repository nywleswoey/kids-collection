/**
 * Shared HTTP plumbing for the provider adapters (#67).
 *
 * `fetchImpl` used to be a parameter of the domain-level `generateImage`, which
 * is the wrong altitude once there are N providers: tests then had to know every
 * provider's wire format to stub it. It lives HERE instead, as each adapter's
 * private constructor argument, so the contract suite can drive a real adapter
 * from recorded fixtures while the seed runner injects a whole fake *provider*.
 */
import { readImageSize } from "../image-size";
import {
  ProviderRetryable,
  type GeneratedImage,
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

/** Decode a base64 payload (AI Horde returns images inline rather than as bytes). */
export function fromBase64(providerId: string, b64: string): Uint8Array {
  const bytes = new Uint8Array(Buffer.from(b64, "base64"));
  if (bytes.byteLength === 0) throw new ProviderRetryable(`${providerId}: empty payload`);
  return bytes;
}

/**
 * Turn raw bytes into a `GeneratedImage`, refusing anything that is not a usable
 * card. Every adapter ends here, which is what makes these two checks uniform
 * rather than something each adapter's author had to remember.
 *
 * The format sniff also catches the sneakiest failure: a provider returning an
 * HTML or JSON error page with HTTP 200. That has a non-zero length, so the
 * empty-body check waves it through and it would land in `seed/review/` looking
 * for all the world like a reviewed card.
 *
 * The size check enforces the map's 768x768 invariant at runtime, and is not
 * hypothetical: `flux-1-schnell` has no `width`/`height` parameter at all, so an
 * adapter written against it returns a plausible image of the wrong size.
 */
export function finishGeneration(
  providerId: string,
  bytes: Uint8Array,
  size: ImageSizeRequest,
  model?: string,
): GeneratedImage {
  const measured = readImageSize(bytes);
  if (!measured) {
    throw new Error(
      `${providerId}: response was not a recognisable PNG/JPEG/WebP (${bytes.byteLength} bytes)`,
    );
  }
  if (measured.width !== size.width || measured.height !== size.height) {
    throw new Error(
      `${providerId}: returned ${measured.width}x${measured.height}, expected ${size.width}x${size.height}`,
    );
  }
  return { bytes, format: measured.format, model };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
