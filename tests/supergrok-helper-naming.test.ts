import { describe, expect, it } from "vitest";
import { destFileName } from "../scripts/supergrok-helper/naming";

describe("destFileName", () => {
  it("keeps the entry's stem but swaps in the downloaded file's own extension", () => {
    const entry = { fileName: "warriors-longbowman-abcd1234.png" };
    expect(destFileName(entry, "image.jpeg")).toBe("warriors-longbowman-abcd1234.jpeg");
    expect(destFileName(entry, "IMG_001.WEBP")).toBe("warriors-longbowman-abcd1234.webp");
    expect(destFileName(entry, "image.png")).toBe("warriors-longbowman-abcd1234.png");
  });

  it("handles a stem with dots in the card name without truncating it", () => {
    const entry = { fileName: "country-u-s-a-abcd1234.png" };
    expect(destFileName(entry, "photo.jpg")).toBe("country-u-s-a-abcd1234.jpg");
  });
});
