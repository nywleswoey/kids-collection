/**
 * Does any card ALREADY IN THE POOL carry a blank frame? (#78)
 *
 * `finishGeneration` now refuses a blank at the seam, which protects every card
 * generated from here on. It says nothing about the ~360 cards already published:
 * `planInserts` only ever plans cards absent from the database, so a published
 * card is never re-generated and never re-audited (`prompt.ts` says so out loud),
 * and its bytes sit in Blob where no seed run will look at them again.
 *
 * #78 asked the question directly — "does anything already published carry one?
 * worth one pass over the pool before assuming not" — and the honest answer needs
 * a measurement rather than the argument that Pollinations has never been seen to
 * do it. This is that pass, made repeatable rather than one-off: any future
 * publish through `--allow-unreviewed`, or from a provider yet to be registered,
 * deserves the same look.
 *
 * ── What the pass found, 2026-08-15 ──────────────────────────────────────────
 * 390 published images, 390 weighed, ZERO below the floor and zero unreadable.
 * So the pool as it stands carries no blank frame, and the ~360-card Pollinations
 * era escaped the failure that #78 measured on Cloudflare SDXL. That is now a
 * measurement rather than an assumption — and the reason to keep this command is
 * that it will stop being true the moment a lane that blanks publishes anything.
 *
 * ── Why a HEAD, and why it is not trusted to work ────────────────────────────
 * The check is a byte count against a pixel count (`blank-frame.ts`), so a
 * `content-length` is the whole measurement — 360 cards at 360 tiny requests
 * rather than ~70 MB of downloads.
 *
 * A HEAD that does not yield one is not taken as an answer, in either of its two
 * shapes: no usable length, or a host that refuses the method outright (a CDN
 * answering 403/405 to HEAD is ordinary). Both fall back to reading the body,
 * because a check that silently skips what it cannot weigh reports "all clear"
 * for the wrong reason — and reports it about the whole pool at once.
 *
 * No retry ladder, unlike `url-check.ts` ("none of them optional" there). That
 * one hammers Wikipedia, which throttles; this reads one origin holding the
 * project's own blobs. If that assumption ever breaks it shows up as entries in
 * `unreadable`, which is a visible non-answer rather than a false all-clear.
 *
 * Every card in the pool is 768x768 (`CARD_SIZE`, the map's invariant), so the
 * size is passed in rather than sniffed: this weighs bytes, and downloading each
 * image to read a header it already knows the answer to would defeat the point.
 *
 * ── An unreadable image is not a blank one ───────────────────────────────────
 * `url-check.ts` learned this at cost: its first build reported ~100 Wikipedia
 * "failures" that were all 429s, and the operator's response to a reported
 * failure is to go and EDIT good data. Same discipline here — a 403, a timeout or
 * a missing blob is reported in its own list, never as a card to republish.
 */
import { belowDensityFloor, bytesPerPixel } from "./blank-frame";
import { cardKey } from "./publish-plan";
import type { ImageSizeRequest } from "./providers/provider";

export type FetchImpl = typeof fetch;

/** One published card's art, as the pool records it. */
export interface PublishedImage {
  theme: string;
  card: string;
  url: string;
}

/** A published image too sparse for its size to be a drawing of anything. */
export interface BlankSuspect extends PublishedImage {
  byteLength: number;
  bytesPerPixel: number;
}

/** A published image the audit could not weigh — NOT a finding about the art. */
export interface UnreadableImage extends PublishedImage {
  reason: string;
}

export interface ImageAuditReport {
  checked: number;
  suspects: BlankSuspect[];
  unreadable: UnreadableImage[];
}

export interface AuditOptions {
  /** Pixel dimensions every card is published at. */
  size: ImageSizeRequest;
  fetchImpl?: FetchImpl;
}

/** Requests in flight. The pool is this project's own blobs, so it is polite. */
const CONCURRENCY = 8;

/** Weigh every published image and report the ones that cannot be pictures. */
export async function auditPublishedImages(
  images: readonly PublishedImage[],
  opts: AuditOptions,
): Promise<ImageAuditReport> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const suspects: BlankSuspect[] = [];
  const unreadable: UnreadableImage[] = [];

  /** Encoded size of one image, or the reason it could not be established. */
  async function weigh(url: string): Promise<number | string> {
    try {
      const head = await fetchImpl(url, { method: "HEAD" });
      if (head.ok) {
        const declared = Number(head.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > 0) return declared;
      }
      // Either no usable length or a host that will not answer HEAD: read the
      // bytes rather than skip the card.
      const body = await fetchImpl(url);
      if (!body.ok) return `GET ${body.status}`;
      return (await body.arrayBuffer()).byteLength;
    } catch (err) {
      return String(err);
    }
  }

  const queue = [...images];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const image = queue.shift()!;
      const weight = await weigh(image.url);
      if (typeof weight !== "number") {
        unreadable.push({ ...image, reason: weight });
        continue;
      }
      if (belowDensityFloor(weight, opts.size)) {
        suspects.push({
          ...image,
          byteLength: weight,
          bytesPerPixel: bytesPerPixel(weight, opts.size),
        });
      }
    }
  });
  await Promise.all(workers);

  // Stable, pool-order output: workers finish out of order, and a report that
  // reshuffles between runs is hard to diff. Keyed with `cardKey` rather than a
  // separator of this module's own choosing, for the reason `publish-plan.ts`
  // gives: any printable one lets ("A-B", "C") and ("A", "B-C") collide.
  const order = new Map(images.map((i, n) => [cardKey(i.theme, i.card), n]));
  const byPoolOrder = <T extends PublishedImage>(a: T, b: T) =>
    (order.get(cardKey(a.theme, a.card)) ?? 0) - (order.get(cardKey(b.theme, b.card)) ?? 0);

  return {
    checked: images.length,
    suspects: suspects.sort(byPoolOrder),
    unreadable: unreadable.sort(byPoolOrder),
  };
}
