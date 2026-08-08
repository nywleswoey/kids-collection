/** Shared domain types (technology-agnostic). Mirrors src/db/schema.ts. */

export const RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Fresh zeroed count-per-rarity map. Returns a new object each call so callers
 * that mutate the tally in place don't share module-level state. */
export function zeroRarityCount(): Record<Rarity, number> {
  return { common: 0, rare: 0, epic: 0, legendary: 0 };
}

/** Drop weights for the pull distribution (BR1). Must sum to 100.
 *
 * Inc25 FR1: tightened from 60/25/12/3 now the pool is 360 cards — epic −42%,
 * legendary −33%. Shared with the Easter Egg roll (easter-egg.ts) by design, so
 * both harden together; both sites derive their bands from this object, so a
 * retune needs no call-site change. Picking WITHIN a rarity stays uniform — no
 * duplicate protection (explicitly declined). */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 70,
  rare: 21,
  epic: 7,
  legendary: 2,
};

export interface Theme {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  themeId: string;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  eduText: string;
  /** Source URL backing the fun fact / legend origin. Shown admin-only (U4-FR5). */
  sourceUrl: string;
}

export interface Child {
  id: string;
  name: string;
  avatar: string; // preset avatar key
  pullTokens: number; // >= 0
  // Unified Easter Egg tickets (Inc19): one balance replacing the old epic/lucky
  // and four rarity-pick tickets. Redeemed for a weighted-roll pick-1-of-5. >= 0.
  easterEggTickets: number;
}

/** One row per (childId, cardId); duplicates increment count (BR8/BR9). */
export interface CollectionEntry {
  childId: string;
  cardId: string;
  count: number; // >= 1
}

export interface PullResult {
  card: Card;
  isDuplicate: boolean;
  newBalance: number;
}

export interface ThemeProgress {
  themeId: string;
  owned: number;
  total: number;
}

/** Binder read-model (U5). */
export interface BinderCard {
  card: Card;
  owned: boolean;
  count: number;
}

export interface ThemeSection {
  theme: Theme;
  cards: BinderCard[];
  progress: { owned: number; total: number; complete: boolean };
}

export interface BinderView {
  themes: ThemeSection[];
  totalOwned: number;
  totalCards: number;
}

/** Admin oversight (U7). */
export interface AdminChildRow {
  child: Child;
  balance: number;
  easterEggTickets: number;
  owned: number;
  total: number;
}

export interface AdminOverview {
  children: AdminChildRow[];
  themes: number;
  cards: number;
}
