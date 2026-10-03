import { getImageProps } from "next/image";
import { preload } from "react-dom";

/**
 * Warm the browser's cache for a card image at a given square dimension,
 * using next/image's own URL generation (`getImageProps`) so this hits the
 * exact optimized variant `CardImage` will later render (same width/height,
 * default quality) — never a hand-built `/_next/image` URL that could warm
 * the wrong cache entry.
 */
export function preloadCardImage(
  src: string,
  dim: number,
  fetchPriority: "high" | "low" | "auto" = "auto",
): void {
  const {
    props: { src: resolvedSrc, srcSet, sizes },
  } = getImageProps({ src, alt: "", width: dim, height: dim });
  preload(resolvedSrc, {
    as: "image",
    imageSrcSet: srcSet,
    imageSizes: sizes,
    fetchPriority,
  });
}
