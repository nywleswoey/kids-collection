import { put } from "@vercel/blob";

export type FetchImpl = typeof fetch;

const POLLINATIONS = "https://image.pollinations.ai/prompt/";

/**
 * Generate an image via Pollinations.ai with bounded retry + backoff (U3-RES-1).
 * Throws after exhausting retries → caller skips the card (not published).
 */
export async function generateImage(
  prompt: string,
  opts: { fetchImpl?: FetchImpl; retries?: number; width?: number; height?: number } = {},
): Promise<Uint8Array> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const w = opts.width ?? 768;
  const h = opts.height ?? 768;
  const url = `${POLLINATIONS}${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true`;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`Pollinations ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength === 0) throw new Error("empty image");
      return buf;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt); // 0.5s, 1s, 2s
      }
    }
  }
  throw new Error(
    `generateImage failed after ${retries + 1} attempts: ${String(lastErr)}`,
  );
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
