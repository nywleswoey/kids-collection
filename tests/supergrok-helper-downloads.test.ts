import { describe, expect, it } from "vitest";
import { isImageFile, pickNewestImageSince } from "../scripts/supergrok-helper/downloads";

describe("isImageFile", () => {
  it("accepts png, jpg, jpeg, and webp, case-insensitively", () => {
    expect(isImageFile("grok-art.png")).toBe(true);
    expect(isImageFile("grok-art.JPG")).toBe(true);
    expect(isImageFile("grok-art.jpeg")).toBe(true);
    expect(isImageFile("grok-art.WEBP")).toBe(true);
  });

  it("rejects everything else, including an in-progress browser download", () => {
    expect(isImageFile("grok-art.png.crdownload")).toBe(false);
    expect(isImageFile("grok-art.download")).toBe(false);
    expect(isImageFile("brief.md")).toBe(false);
    expect(isImageFile("notes.txt")).toBe(false);
  });
});

describe("pickNewestImageSince", () => {
  it("picks the most recently modified image at or after the cutoff", () => {
    const hit = pickNewestImageSince(
      [
        { name: "old.png", mtimeMs: 100 },
        { name: "newer.jpg", mtimeMs: 300 },
        { name: "newest.webp", mtimeMs: 500 },
        { name: "unrelated.txt", mtimeMs: 900 },
      ],
      200,
    );
    expect(hit?.name).toBe("newest.webp");
  });

  it("ignores non-image files even when they are the newest thing present", () => {
    const hit = pickNewestImageSince(
      [
        { name: "art.png", mtimeMs: 200 },
        { name: "readme.txt", mtimeMs: 999 },
      ],
      0,
    );
    expect(hit?.name).toBe("art.png");
  });

  it("returns undefined when nothing qualifies", () => {
    expect(pickNewestImageSince([{ name: "art.png", mtimeMs: 100 }], 500)).toBeUndefined();
    expect(pickNewestImageSince([{ name: "readme.txt", mtimeMs: 999 }], 0)).toBeUndefined();
    expect(pickNewestImageSince([], 0)).toBeUndefined();
  });

  it("is inclusive of the cutoff itself", () => {
    expect(pickNewestImageSince([{ name: "art.png", mtimeMs: 500 }], 500)?.name).toBe("art.png");
  });
});
