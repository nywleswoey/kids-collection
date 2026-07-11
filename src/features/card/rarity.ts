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

export interface RarityMeta {
  /** Frame border color (mirrors card.css). */
  frame: string;
  /** Whether the tier gets a glow (epic/legendary). */
  glow: boolean;
  /** Short rarity label for badges (text, not color alone — U5-NFR1). */
  label: string;
}

/**
 * Single source of truth for rarity visuals across binder slots, badges, and
 * the admin expand modal (U5-FR2). Frame colors match card.css. Pure → testable.
 */
export const RARITY_META: Record<Rarity, RarityMeta> = {
  common: { frame: "#9ca3af", glow: false, label: "Common" },
  rare: { frame: "#60a5fa", glow: false, label: "Rare" },
  epic: { frame: "#c084fc", glow: true, label: "Epic" },
  legendary: { frame: "#fbbf24", glow: true, label: "Legendary" },
};

/** True if motion effects should run (respects reduced-motion). Browser-only. */
export function shouldAnimate(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
