/**
 * Publishing a card's bytes to Vercel Blob.
 *
 * Image GENERATION used to live here too, as `generateImage(prompt, opts)` with
 * one hardcoded Pollinations URL and a `fetchImpl` escape hatch. #67 moved it
 * behind the provider port in `./providers/`, which is what makes the provider a
 * parameter rather than a string constant on line 5.
 *
 * Upload deliberately did NOT move. It is the same operation regardless of who
 * drew the bytes, and a provider that could influence where a card is published
 * would break the one-published-object-per-card property `blobKey` exists to
 * guarantee (#63 confirmed this; #67 kept it by leaving `blobKey`'s signature
 * alone — the provider has no path into it).
 */
import { put } from "@vercel/blob";
import { contentTypeFor, readImageSize } from "./image-size";

/**
 * Upload bytes to Vercel Blob; returns the public URL.
 *
 * The pathname keeps its `.jpg` suffix whatever the bytes actually are. That is
 * not a format claim — it is the name ~360 already-published objects carry, and
 * changing it would re-point every existing card's URL for no benefit. The real
 * format is sniffed from the bytes and sent as the content type, which is what a
 * browser honours, so a PNG card from Cloudflare is served as `image/png` from a
 * `.jpg` pathname and renders correctly.
 *
 * Sniffing rather than trusting a caller-supplied type is deliberate: the bytes
 * are the only thing that cannot be wrong.
 */
export async function uploadImage(
  key: string,
  bytes: Uint8Array,
): Promise<string> {
  const measured = readImageSize(bytes);
  if (!measured) {
    throw new Error(`uploadImage(${key}): bytes are not a recognisable PNG/JPEG/WebP`);
  }
  const { url } = await put(`cards/${key}.jpg`, Buffer.from(bytes), {
    access: "public",
    contentType: contentTypeFor(measured.format),
  });
  return url;
}
