import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Card images are served from Vercel Blob; allow its public hostname.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Seed-time image source (U3) — Pollinations.ai
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
    // Card art in Blob is immutable, so cache each optimized variant for a
    // year — avoids repeat transformations and cache writes on every request.
    minimumCacheTTL: 31536000,
    // Emit one format instead of the default avif+webp pair; halves the number
    // of transformations per image.
    formats: ["image/webp"],
    // Every <Image> uses the default quality (75); allowlisting it keeps the
    // transformation set from fanning out across arbitrary qualities.
    qualities: [75],
    // Cards are square thumbnails rendered at dim 110/200/256/512 (1x/2x).
    // Trim the size allowlists to those widths so we don't cache-write the
    // large default device sizes that these images never request.
    imageSizes: [128, 256, 512],
    deviceSizes: [640, 1080],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
