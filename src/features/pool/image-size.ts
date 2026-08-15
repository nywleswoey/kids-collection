/**
 * Read an encoded image's pixel dimensions from its header bytes. Pure, no I/O,
 * no dependency (#67).
 *
 * This exists for ONE load-bearing assertion: cards render at 768x768, and the
 * map's invariant list says a provider that cannot match it changes how the
 * binder looks. Research on the shortlisted providers found exactly that trap —
 * Cloudflare's `flux-1-schnell` has no `width`/`height` parameter at all, so an
 * adapter written against it would silently return the wrong size. The provider
 * contract suite decodes what each adapter actually returns and refuses it.
 *
 * Three formats, because the shortlisted providers disagree: Pollinations serves
 * JPEG, Cloudflare Workers AI serves PNG, AI Horde serves WebP. Sniffing the
 * bytes is also how `uploadImage` learns a card's real content type, so a PNG
 * card is never published announcing itself as a JPEG.
 *
 * Returns null for anything it does not recognise — callers treat that as "not a
 * usable image", which is the same outcome as a zero-length body.
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export interface ImageSize {
  width: number;
  height: number;
  format: ImageFormat;
}

const CONTENT_TYPES: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** File extension for a format — what a review file is named. */
export const EXTENSIONS: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/** The HTTP content type for a format. */
export function contentTypeFor(format: ImageFormat): string {
  return CONTENT_TYPES[format];
}

/** Dimensions + format of an encoded image, or null if unrecognised/truncated. */
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  return readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}

// ── PNG ──────────────────────────────────────────────────────────────────────
// 8-byte signature, then an IHDR chunk whose first two fields are the dimensions
// as big-endian uint32. Fixed offsets; nothing to scan.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readPng(b: Uint8Array): ImageSize | null {
  if (b.length < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (b[i] !== PNG_SIGNATURE[i]) return null;
  }
  return { width: be32(b, 16), height: be32(b, 20), format: "png" };
}

// ── JPEG ─────────────────────────────────────────────────────────────────────
// A marker walk, not a fixed offset: the dimensions live in a Start-Of-Frame
// segment which sits after a variable number of metadata segments (JFIF, EXIF,
// quantisation tables). Pollinations writes EXIF, so those segments are real.
function readJpeg(b: Uint8Array): ImageSize | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) {
      i++; // fill byte or padding between segments
      continue;
    }
    const marker = b[i + 1];
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / start of scan
    const length = be16(b, i + 2);
    if (length < 2) return null;
    // SOF0..SOF15 hold the frame header. C4 (Huffman tables), C8 (JPEG
    // extensions) and CC (arithmetic coding) share the range but are not frames.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      if (i + 9 >= b.length) return null;
      // segment: FF marker len(2) precision(1) height(2) width(2)
      return { height: be16(b, i + 5), width: be16(b, i + 7), format: "jpeg" };
    }
    i += 2 + length;
  }
  return null;
}

// ── WebP ─────────────────────────────────────────────────────────────────────
// RIFF container with three possible payload chunks, each storing the size
// differently. AI Horde returns WebP, and which chunk it uses depends on whether
// the worker encoded lossy, lossless or extended.
function readWebp(b: Uint8Array): ImageSize | null {
  if (b.length < 16) return null;
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const chunk = ascii(b, 12, 4);

  // VP8X (extended): 24-bit little-endian canvas dimensions, stored minus one.
  if (chunk === "VP8X" && b.length >= 30) {
    return { width: le24(b, 24) + 1, height: le24(b, 27) + 1, format: "webp" };
  }

  // VP8 (lossy): a 3-byte frame tag, the start code 9D 01 2A, then 14-bit
  // dimensions in the low bits of two little-endian uint16s.
  if (chunk === "VP8 " && b.length >= 30) {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return {
      width: le16(b, 26) & 0x3fff,
      height: le16(b, 28) & 0x3fff,
      format: "webp",
    };
  }

  // VP8L (lossless): signature byte 0x2F, then 14 bits of width-1 and 14 bits of
  // height-1 packed into the following little-endian uint32.
  if (chunk === "VP8L" && b.length >= 25) {
    if (b[20] !== 0x2f) return null;
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
      format: "webp",
    };
  }
  return null;
}

// ── byte readers ─────────────────────────────────────────────────────────────
function be16(b: Uint8Array, i: number): number {
  return (b[i] << 8) | b[i + 1];
}

function be32(b: Uint8Array, i: number): number {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}

function le16(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8);
}

function le24(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
}

function ascii(b: Uint8Array, i: number, len: number): string {
  let s = "";
  for (let k = 0; k < len; k++) s += String.fromCharCode(b[i + k]);
  return s;
}
