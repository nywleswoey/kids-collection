import { describe, it, expect, vi, beforeEach } from "vitest";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { preloadCardImage } from "@/shared/card/preload-image";

vi.mock("react-dom", () => ({ preload: vi.fn() }));
const preloadMock = vi.mocked(preload);

const SRC = "https://x.public.blob.vercel-storage.com/card.png";

/** What `CardImage` itself would pass to `getImageProps` for the same src/dim
 *  (see src/shared/card/CardImage.tsx) — the ground truth `preloadCardImage`
 *  must match, rather than building its own URL by hand. */
function cardImageVariant(dim: number) {
  return getImageProps({ src: SRC, alt: "", width: dim, height: dim }).props;
}

/**
 * `preloadCardImage` must hit the exact optimized URL variant `CardImage`
 * will later render (same width/height, default quality) by going through
 * next/image's own `getImageProps` — never a hand-built `/_next/image` URL
 * that could warm the wrong cache entry.
 *
 * vitest's `node` env sets NODE_ENV=test, which makes next/image's default
 * loader skip the `images.remotePatterns` check and fall back to Next's
 * default `imageConfigDefault` sizes/qualities (not next.config.ts's
 * allowlist) — so compare two `getImageProps` calls against each other here,
 * never literal `w=`/`q=` values.
 */
describe("preloadCardImage", () => {
  beforeEach(() => preloadMock.mockClear());

  it("preloads the exact src/srcSet CardImage would render at the same dim", () => {
    preloadCardImage(SRC, 256, "low");

    const expected = cardImageVariant(256);
    expect(preloadMock).toHaveBeenCalledTimes(1);
    const [href, options] = preloadMock.mock.calls[0];
    expect(href).toBe(expected.src);
    expect(options).toMatchObject({
      as: "image",
      imageSrcSet: expected.srcSet,
      fetchPriority: "low",
    });
  });

  it("requests a different variant for a different dim, proving it isn't a fixed hand-built URL", () => {
    preloadCardImage(SRC, 512, "high");

    const small = cardImageVariant(256);
    const large = cardImageVariant(512);
    const [href, options] = preloadMock.mock.calls[0];
    expect(href).toBe(large.src);
    expect(href).not.toBe(small.src);
    expect(options?.fetchPriority).toBe("high");
  });

  it("defaults to a non-urgent fetch priority when none is given", () => {
    preloadCardImage(SRC, 128);

    const [, options] = preloadMock.mock.calls[0];
    expect(options?.fetchPriority).toBe("auto");
  });
});
