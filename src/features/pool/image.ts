import { put } from "@vercel/blob";

export type FetchImpl = typeof fetch;

const POLLINATIONS = "https://image.pollinations.ai/prompt/";

/** Thrown internally on HTTP 429 so backoff can honor Retry-After. */
class RateLimitError extends Error {
  constructor(readonly retryAfterMs?: number) {
    super("Pollinations 429");
    this.name = "RateLimitError";
  }
}

/**
 * Generate an image via Pollinations.ai with bounded retry + backoff (U3-RES-1).
 * Throws after exhausting retries → caller skips the card (not published).
 *
 * Rate limiting (HTTP 429) gets a longer backoff than other transient errors
 * and honors the server's Retry-After header — the anonymous tier throttles
 * hard, so the ordinary 0.5/1/2s ramp is too aggressive to recover from it.
 */
export async function generateImage(
  prompt: string,
  opts: {
    fetchImpl?: FetchImpl;
    retries?: number;
    width?: number;
    height?: number;
    baseDelayMs?: number;
    rateLimitDelayMs?: number;
  } = {},
): Promise<Uint8Array> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const w = opts.width ?? 768;
  const h = opts.height ?? 768;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const rateLimitDelayMs = opts.rateLimitDelayMs ?? 8000;
  const url = `${POLLINATIONS}${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true`;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url);
      if (res.status === 429) throw new RateLimitError(parseRetryAfter(res.headers));
      if (!res.ok) throw new Error(`Pollinations ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength === 0) throw new Error("empty image");
      return buf;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay =
          err instanceof RateLimitError
            ? err.retryAfterMs ?? rateLimitDelayMs * 2 ** attempt // 8s, 16s, 32s
            : baseDelayMs * 2 ** attempt; // 0.5s, 1s, 2s
        await sleep(delay);
      }
    }
  }
  throw new Error(
    `generateImage failed after ${retries + 1} attempts: ${String(lastErr)}`,
  );
}

/** Parse a Retry-After header (seconds) into ms; undefined if absent/unparseable. */
function parseRetryAfter(headers?: Headers): number | undefined {
  const raw = headers?.get?.("retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  return Number.isFinite(secs) && secs >= 0 ? secs * 1000 : undefined;
}

/** Upload bytes to Vercel Blob; returns the public URL. */
export async function uploadImage(
  key: string,
  bytes: Uint8Array,
): Promise<string> {
  const { url } = await put(`cards/${key}.jpg`, Buffer.from(bytes), {
    access: "public",
    contentType: "image/jpeg",
  });
  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
