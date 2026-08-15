/**
 * Is an encoded image a drawing of ANYTHING? Pure, no I/O, no dependency (#78).
 *
 * `finishGeneration` proves an image is well-formed. It does not prove it is a
 * picture. #78 caught Cloudflare SDXL answering HTTP 200 with a pure black
 * 768x768 PNG for an entirely innocuous prompt: a real PNG, exactly the size the
 * map's invariant demands, non-empty, in the declared format — so it was written
 * to `seed/review/` under a normal candidate filename, with a normal sidecar, and
 * counted as a drawn cell on the contact sheet. The only thing that flagged it
 * was a human noticing the file was 400x smaller than its neighbours.
 *
 * Not rare, and not Cloudflare's documented NSFW filter (that answers error 3030,
 * and #66 confirmed it never fired): 2 blanks in 5 attempts on one shipped prompt
 * against 0 in 9 across every other prompt tried, with HTTP 200 and no signal.
 *
 * ── Why bytes-per-pixel and not pixel variance ───────────────────────────────
 * The class being caught is "a frame carrying no subject" — uniform or nearly
 * so, of any colour. The direct test is pixel variance, and it costs a decoder
 * for PNG, JPEG and WebP; `readImageSize` next door is a header reader by design
 * and this repo carries no image dependency at all.
 *
 * The proxy used instead is what every codec has in common: a uniform frame
 * carries almost no information, so it compresses to almost nothing whatever the
 * encoding. Encoded bytes divided by pixel count measures exactly that, needs no
 * decoder, and — the reason it is worth preferring even if a decoder were free —
 * it applies to a format nobody has written a decoder for yet, so a future
 * adapter inherits the guard on the day it is registered.
 *
 * Be honest about what that means: this measures the ENCODING, not the pixels.
 * It cannot say whether the blank is black, white or beige, and it does not
 * claim to. A variance test would swap one threshold for another, not remove the
 * need for one.
 *
 * ── The floor, and the measurements that set it ──────────────────────────────
 * All at 768x768, measured 2026-08-15 while resolving #78. The Pollinations rows
 * are live generations; the Cloudflare rows are #78's own observations.
 *
 *   what                                                   encoded    bytes/px
 *   all-black PNG — the failure (`solidPng` reproduces it)   1.8 KB      0.003
 *   "a completely flat solid mid-grey field"                30.2 KB      0.051
 *   "a single small red dot on plain white, minimalist"      27.1 KB      0.046
 *   an ordinary card prompt (Pollinations, JPEG)             70.1 KB      0.119
 *   an ordinary card (Cloudflare SDXL, PNG)                750-900 KB  1.27-1.53
 *
 * The floor is 0.02 bytes/pixel — about 11.8 KB for a card. It sits ~7x above
 * the failure and ~2.3x below the sparsest legitimate image that could be
 * obtained from a live lane on purpose.
 *
 * That second margin is the one #78 worried about ("a threshold too eager
 * rejects a legitimately minimal illustration"), and the measurement is the
 * answer: you cannot prompt a diffusion model into a blank frame. Asking in
 * plain words for a flat grey field returns 30 KB of texture anyway. The sparse
 * end of legitimate output is not adjacent to blank — it is an order of
 * magnitude away, and the floor sits in the gap.
 *
 * ── What it deliberately does not catch ──────────────────────────────────────
 * A picture of the wrong subject, a badly drawn one, a framed one, a photoreal
 * one. Those are judgements about content, they are CHECKPOINT 2's job
 * (`seed/NEW-THEME-RUNBOOK.md`) and a human's, and the provider contract says so
 * explicitly: "deliberately NOT here: anything about content, style or subject
 * fidelity."
 *
 * ── What would invalidate the number ─────────────────────────────────────────
 * A new adapter in a far more efficient format — AVIF, or lossless WebP at a low
 * effort setting — could put an ordinary card nearer the floor than a JPEG does.
 * Re-measure that adapter's ordinary output before registering it. A change of
 * card SIZE needs nothing: the floor is per-pixel precisely so it follows the
 * frame.
 */
import type { ImageSizeRequest } from "./providers/provider";

/**
 * Encoded bytes per pixel below which an image is judged to carry no subject.
 * See the header for the measurements this sits between.
 */
export const MIN_BYTES_PER_PIXEL = 0.02;

/**
 * Encoded size over pixel count — the density the floor is set against.
 *
 * Takes a LENGTH rather than the bytes, because that is all it needs and it is
 * all `blank-audit.ts` has: a `content-length` from a HEAD against Blob, with
 * the image itself never downloaded.
 */
export function bytesPerPixel(byteLength: number, size: ImageSizeRequest): number {
  const pixels = size.width * size.height;
  return pixels > 0 ? byteLength / pixels : 0;
}

/**
 * The comparison itself, over a length — the ONE place the floor is applied.
 *
 * `blank-audit.ts` weighs published images it never downloads, so it cannot hold
 * bytes and must ask the question this way. Both callers going through here is
 * what keeps the threshold a single fact rather than two that can drift.
 *
 * A frame with no pixels is not judged blank: a zero or negative size is a
 * caller's bug rather than a provider's, and `finishGeneration` has already
 * refused anything whose measured size is not the card's.
 */
export function belowDensityFloor(byteLength: number, size: ImageSizeRequest): boolean {
  if (size.width * size.height <= 0) return false;
  return bytesPerPixel(byteLength, size) < MIN_BYTES_PER_PIXEL;
}

/**
 * True when the bytes are too sparse to be a drawing of anything.
 *
 * What the SEAM asks, and it takes the bytes rather than their length so that a
 * later decision to decode pixels for real changes this file and nothing else.
 * The audit's question stays length-only either way: it never has the bytes.
 */
export function looksBlank(bytes: Uint8Array, size: ImageSizeRequest): boolean {
  return belowDensityFloor(bytes.byteLength, size);
}
