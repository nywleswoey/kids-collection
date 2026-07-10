/** Shared domain types (technology-agnostic). Mirrors src/db/schema.ts. */

export const RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Drop weights for the pull distribution (BR1). Must sum to 100. */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
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
}

export interface Child {
  id: string;
  name: string;
  avatar: string; // preset avatar key
  pullTokens: number; // >= 0
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
