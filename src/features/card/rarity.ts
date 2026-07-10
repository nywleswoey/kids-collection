import type { Rarity } from "@/lib/types";

/** Per-rarity CSS class (frame + effect intensity). Pure → testable. */
export function rarityClass(rarity: Rarity): string {
  return `card--${rarity}`;
}

/** Human label + emoji per rarity (conveyed as text, not color alone). */
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary ★",
};

/** True if motion effects should run (respects reduced-motion). Browser-only. */
export function shouldAnimate(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
