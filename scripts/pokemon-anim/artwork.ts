/**
 * Fetches the raw transparent official-artwork PNG for a national dex
 * number — the exact same request `providers/pokeapi-official-artwork.ts`
 * makes for the still, reused here rather than re-fetching through the
 * provider port. The only network call this lane makes.
 */
import { officialArtworkUrl } from "@/shared/pool/providers/pokeapi-official-artwork";

export type ArtworkFetcher = (dexNumber: number) => Promise<Uint8Array>;

export const fetchOfficialArtwork: ArtworkFetcher = async (dexNumber) => {
  const url = officialArtworkUrl(dexNumber);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
};
