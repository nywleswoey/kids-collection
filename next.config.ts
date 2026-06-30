import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Card images are served from Vercel Blob; allow its public hostname.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Seed-time image source (U3) — Pollinations.ai
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
  },
};

export default nextConfig;
