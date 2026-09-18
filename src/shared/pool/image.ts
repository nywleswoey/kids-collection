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
 *
 * ── No re-encoding here, and it is not only about FR8 (#79) ──────────────────
 * Cloudflare SDXL's cards are ~10x heavier than Pollinations', and the obvious
 * remedy is to JPEG-encode on the way past. It does not happen here, and the
 * first reason is the rule: publish ships the bytes a parent APPROVED, so
 * re-encoding at this line hands a child bytes no one reviewed. Re-encoding at
 * REVIEW time would keep the rule intact and is the better change if one is ever
 * needed.
 *
 * The second reason is that none is needed yet, which is the measurement rather
 * than the principle. `blob-budget.ts` weighed the store against its allowance:
 * 3% spent, 39 more Cloudflare-weight themes of room. And the child was never
 * downloading these bytes anyway — every card renders through `next/image`, so a
 * 937.9 KB PNG reaches a browser as a 39.5 KB WebP. An encoder would be a new
 * dependency (#67 kept this seam dependency-free) bought to fix a number nobody
 * is paying.
 */
export async function uploadImage(
  key: string,
  bytes: Uint8Array,
): Promise<string> {
  const measured = readImageSize(bytes);
  if (!measured) {
    throw new Error(`uploadImage(${key}): bytes are not a recognisable PNG/JPEG/WebP`);
  }
  // The pathname below is what is ASKED for, not what the object is called. No
  // naming options are passed, so the SERVICE decides — and which default it
  // applies is selected by the `x-api-version` header the client library sends,
  // not by anything visible here. Under `@vercel/blob@0.27`'s version 9 that
  // default appends a random suffix, so the store creates
  // `cards/<key>-<random>.jpg` and that suffixed URL is what `cards.imageUrl`
  // holds, which is also why `--blob-budget` reconciles the store against the
  // pool instead of trusting these URLs. v1.0 sends version 10, whose default
  // takes the pathname literally.
  //
  // That makes the bump invisible at this call site: same arguments, same
  // headers, different published name. `tests/blob-naming.test.ts` (#102) pins
  // the version so it fails instead. Whether the default is the right one — and
  // what happens to the ~390 URLs already written under version 9's — is #91's.
  const { url } = await put(`cards/${key}.jpg`, Buffer.from(bytes), {
    access: "public",
    contentType: contentTypeFor(measured.format),
  });
  return url;
}
