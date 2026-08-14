import { describe, it, expect } from "vitest";
import { readImageSize, contentTypeFor, EXTENSIONS } from "@/features/pool/image-size";
import { solidPng } from "@/features/pool/providers/fake";

/**
 * Header sniffing exists for one load-bearing assertion: cards render at
 * 768x768, and the shortlisted providers disagree on format — Pollinations
 * serves JPEG, Cloudflare Workers AI serves PNG, AI Horde serves WebP. It is
 * also how `uploadImage` learns a card's real content type, so a PNG card is
 * never published announcing itself as a JPEG.
 */

function jpeg(width: number, height: number, opts: { withApp0?: boolean } = {}): Uint8Array {
  const app0 = opts.withApp0 ? [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00] : [];
  return new Uint8Array([
    0xff, 0xd8,
    ...app0,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);
}

function riff(chunk: string, payload: number[]): Uint8Array {
  const head = [...Buffer.from("RIFF", "ascii"), 0, 0, 0, 0, ...Buffer.from("WEBP", "ascii")];
  return new Uint8Array([
    ...head,
    ...Buffer.from(chunk, "ascii"),
    0, 0, 0, 0, // chunk size — unread
    ...payload,
  ]);
}

function webpVp8x(width: number, height: number): Uint8Array {
  const w = width - 1;
  const h = height - 1;
  return riff("VP8X", [
    0, 0, 0, 0, // flags + reserved
    w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff,
    h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff,
  ]);
}

function webpVp8Lossy(width: number, height: number): Uint8Array {
  return riff("VP8 ", [
    0, 0, 0, // frame tag
    0x9d, 0x01, 0x2a, // start code
    width & 0xff, (width >> 8) & 0x3f,
    height & 0xff, (height >> 8) & 0x3f,
  ]);
}

function webpVp8Lossless(width: number, height: number): Uint8Array {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  return riff("VP8L", [
    0x2f,
    bits & 0xff, (bits >>> 8) & 0xff, (bits >>> 16) & 0xff, (bits >>> 24) & 0xff,
  ]);
}

describe("readImageSize", () => {
  it("reads a PNG", () => {
    expect(readImageSize(solidPng(768, 768))).toEqual({
      width: 768,
      height: 768,
      format: "png",
    });
  });

  it("reads a JPEG, stepping over metadata segments to find the frame header", () => {
    // Not a fixed offset: a real Pollinations response carries EXIF ahead of the
    // frame, so the reader has to walk markers rather than index into the bytes.
    expect(readImageSize(jpeg(768, 768, { withApp0: true }))).toEqual({
      width: 768,
      height: 768,
      format: "jpeg",
    });
    expect(readImageSize(jpeg(1024, 512))).toEqual({
      width: 1024,
      height: 512,
      format: "jpeg",
    });
  });

  it("reads all three WebP payload chunks", () => {
    // Which one a worker produces depends on how it encoded, so an adapter
    // cannot assume any single variant.
    expect(readImageSize(webpVp8x(768, 768))).toEqual({ width: 768, height: 768, format: "webp" });
    expect(readImageSize(webpVp8Lossy(768, 768))).toEqual({ width: 768, height: 768, format: "webp" });
    expect(readImageSize(webpVp8Lossless(768, 768))).toEqual({ width: 768, height: 768, format: "webp" });
  });

  it("returns null for an HTML error page served with HTTP 200", () => {
    // The failure the empty-body check waves through: it has a non-zero length,
    // so without this it would land in seed/review/ looking like a reviewed card.
    const html = new TextEncoder().encode("<html><body>rate limited</body></html>");
    expect(readImageSize(html)).toBeNull();
  });

  it("returns null for empty and truncated input", () => {
    expect(readImageSize(new Uint8Array(0))).toBeNull();
    expect(readImageSize(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(readImageSize(solidPng(768, 768).slice(0, 12))).toBeNull();
  });
});

describe("format metadata", () => {
  it("maps each format to its extension and content type", () => {
    expect(EXTENSIONS).toEqual({ jpeg: "jpg", png: "png", webp: "webp" });
    expect(contentTypeFor("jpeg")).toBe("image/jpeg");
    expect(contentTypeFor("png")).toBe("image/png");
    expect(contentTypeFor("webp")).toBe("image/webp");
  });
});
