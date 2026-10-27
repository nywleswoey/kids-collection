/**
 * Synthesises one seamless motion period's worth of animation frames for a
 * Pokémon card — pure pixel work via `sharp` (already a project dependency),
 * no external binary and no AI. Recomposites from the SAME transparent
 * official-artwork PNG and type-gradient background the still provider
 * (`providers/pokeapi-official-artwork.ts`) builds, rather than decomposing
 * the already-flattened still, so the motion is never degraded by a second
 * lossy round trip.
 *
 * Every motion curve below is driven by `t` in [0, 1) at an integer multiple
 * of one full revolution, so frame 0 and the frame after the last one are
 * numerically identical — the loop is seamless with no bounce/reverse trick,
 * unlike the Grok-video lane's `runFfmpegConvert` (which animates an
 * arbitrary clip and needs one). Gentle, kid-friendly amplitudes: a vertical
 * float, a breathing scale pulse, a soft sway, and a few twinkling sparkles
 * in the card's type colour drifting around it - drawn BEHIND the artwork, so
 * they show only around the Pokémon's silhouette, never across its body.
 */
import sharp from "sharp";
import { accentColorForType } from "@/shared/pool/pokemon-types";
import {
  buildBackgroundSvg,
  MARGIN_RATIO,
} from "@/shared/pool/providers/pokeapi-official-artwork";

/** Matches the Grok-video lane's `scale=384:384` so both animation lanes render identically in `Card.tsx`. */
export const FRAME_SIZE = 384;
/** 20 frames at 10fps (same cadence as the Grok-video lane) = a 2s loop. */
export const FRAME_COUNT = 20;

const FLOAT_AMPLITUDE_RATIO = 0.03; // vertical float, fraction of frame height
const BREATH_AMPLITUDE_RATIO = 0.02; // scale pulse, fraction of artwork size
const SWAY_DEGREES = 2.5; // sway, degrees of rotation
const SPARKLE_COUNT = 4;
const SPARKLE_ORBIT_RATIO = 0.42; // fraction of frame size
const SPARKLE_RADIUS_RATIO = 0.04; // fraction of frame size
const SPARKLE_STROKE_RATIO = 0.005; // fraction of frame size
const SPARKLE_HIGHLIGHT_RATIO = 0.18; // white glint, fraction of the sparkle's own radius
/** Darkened so pale accents (electric yellow, ice) still read against the gradient's lightest stop. */
const SPARKLE_RIM_DARKEN_AMOUNT = 0.35;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Blend a `#rrggbb` colour toward black by `amount` (0-1) - the sparkle's thin rim. */
function darken(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (shift: number) => {
    const channel = (n >> shift) & 255;
    return Math.round(channel * (1 - amount));
  };
  return `rgb(${mix(16)}, ${mix(8)}, ${mix(0)})`;
}

/** A small 4-point glint/star shape, centred at (cx, cy), spanning `r` to its outer points. */
function sparklePath(cx: number, cy: number, r: number): string {
  const inner = r * 0.32;
  const pts = [
    [cx, cy - r],
    [cx + inner, cy - inner],
    [cx + r, cy],
    [cx + inner, cy + inner],
    [cx, cy + r],
    [cx - inner, cy + inner],
    [cx - r, cy],
    [cx - inner, cy - inner],
  ];
  return `M ${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L ")} Z`;
}

function sparkleSvg(size: number, accentColor: string, t: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const orbitRadius = size * SPARKLE_ORBIT_RATIO;
  const baseRadius = size * SPARKLE_RADIUS_RATIO;
  const rimColor = darken(accentColor, SPARKLE_RIM_DARKEN_AMOUNT);
  const strokeWidth = (size * SPARKLE_STROKE_RATIO).toFixed(1);
  let glints = "";
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const phase = (i / SPARKLE_COUNT) * 2 * Math.PI;
    const angle = t * 2 * Math.PI + phase;
    const radius = orbitRadius * (0.85 + 0.15 * Math.sin(angle * 2));
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const twinkle = Math.abs(Math.sin(t * 4 * Math.PI + phase));
    const opacity = (0.4 + 0.6 * twinkle).toFixed(2);
    const scaledRadius = baseRadius * (0.6 + 0.4 * twinkle);
    const highlightRadius = (scaledRadius * SPARKLE_HIGHLIGHT_RATIO).toFixed(1);
    glints +=
      `<g opacity="${opacity}">` +
      `<path d="${sparklePath(x, y, scaledRadius)}" fill="${accentColor}" stroke="${rimColor}" stroke-width="${strokeWidth}" />` +
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${highlightRadius}" fill="white" />` +
      `</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${glints}</svg>`;
}

/**
 * One frame: the static type-gradient background, this moment's sparkles,
 * then the artwork transformed by this moment's float/breathe/sway on top.
 */
async function renderFrame(
  background: Buffer,
  artworkPng: Uint8Array,
  type: string,
  size: number,
  t: number,
): Promise<Buffer> {
  const theta = t * 2 * Math.PI;
  const floatPx = Math.round(Math.sin(theta) * FLOAT_AMPLITUDE_RATIO * size);
  const scale = 1 + Math.sin(theta * 2) * BREATH_AMPLITUDE_RATIO;
  const swayDeg = Math.sin(theta + Math.PI / 3) * SWAY_DEGREES;

  const baseArtworkSize = Math.round(size * MARGIN_RATIO);
  const frameArtworkSize = Math.round(baseArtworkSize * scale);

  const resized = await sharp(artworkPng)
    .resize(frameArtworkSize, frameArtworkSize, { fit: "contain", background: TRANSPARENT })
    .toBuffer();
  const rotated = await sharp(resized)
    .rotate(swayDeg, { background: TRANSPARENT })
    .png()
    .toBuffer();
  const rotatedMeta = await sharp(rotated).metadata();
  const layerWidth = rotatedMeta.width ?? frameArtworkSize;
  const layerHeight = rotatedMeta.height ?? frameArtworkSize;

  const sparkles = await sharp(Buffer.from(sparkleSvg(size, accentColorForType(type), t))).png().toBuffer();

  return sharp(background)
    .composite([
      { input: sparkles, left: 0, top: 0 },
      {
        input: rotated,
        left: Math.round((size - layerWidth) / 2),
        top: Math.round((size - layerHeight) / 2 + floatPx),
      },
    ])
    .png()
    .toBuffer();
}

/**
 * `frameCount` frames of `size`x`size`, one full motion period, for the given
 * transparent artwork PNG and Pokémon type. Pure aside from `sharp`'s native
 * image work — no filesystem, no network, no external process — so this is
 * exercised directly by tests with no `img2webp` install required.
 */
export async function synthesizeFrames(
  artworkPng: Uint8Array,
  type: string,
  size: number = FRAME_SIZE,
  frameCount: number = FRAME_COUNT,
): Promise<Buffer[]> {
  const background = await sharp(Buffer.from(buildBackgroundSvg({ width: size, height: size }, type)))
    .png()
    .toBuffer();

  const frames: Buffer[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(await renderFrame(background, artworkPng, type, size, i / frameCount));
  }
  return frames;
}
