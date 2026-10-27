import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { FRAME_COUNT, FRAME_SIZE, synthesizeFrames } from "../scripts/pokemon-anim/frames";

/** A tiny transparent square, standing in for a fetched official-artwork PNG — no network needed. */
async function sampleArtwork(size = 200): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 200, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe("synthesizeFrames", () => {
  it("produces FRAME_COUNT frames, each FRAME_SIZE x FRAME_SIZE PNG", async () => {
    const artwork = await sampleArtwork();
    const frames = await synthesizeFrames(artwork, "electric");

    expect(frames).toHaveLength(FRAME_COUNT);
    for (const frame of frames) {
      const meta = await sharp(frame).metadata();
      expect(meta.width).toBe(FRAME_SIZE);
      expect(meta.height).toBe(FRAME_SIZE);
      expect(meta.format).toBe("png");
    }
  });

  it("honours an explicit size and frame count", async () => {
    const artwork = await sampleArtwork();
    const frames = await synthesizeFrames(artwork, "water", 128, 6);

    expect(frames).toHaveLength(6);
    const meta = await sharp(frames[0]!).metadata();
    expect(meta.width).toBe(128);
    expect(meta.height).toBe(128);
  });

  it("actually varies the frame between the start and a quarter through the loop (motion is present)", async () => {
    const artwork = await sampleArtwork();
    const frames = await synthesizeFrames(artwork, "psychic");

    const first = await sharp(frames[0]!).raw().toBuffer();
    const quarter = await sharp(frames[Math.floor(FRAME_COUNT / 4)]!).raw().toBuffer();
    expect(Buffer.compare(first, quarter)).not.toBe(0);
  });

  it("falls back to a known palette for an unmapped type without throwing", async () => {
    const artwork = await sampleArtwork();
    await expect(synthesizeFrames(artwork, "not-a-real-type")).resolves.toHaveLength(FRAME_COUNT);
  });
});
