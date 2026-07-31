/**
 * Pull-screen category selection (Inc21 FR3/FR4).
 *
 * The catalog keeps growing (10 themes and counting), but the pull screen's chip
 * row has to stay readable on a small phone. Show only the most recent ones —
 * "recent" being the theme order `listThemes()` now guarantees via
 * `themes.sort_order` (oldest first, newest last).
 *
 * Hiding a category here is presentation-only: 🎲 Random and every ticket flow
 * still draw from the whole pool, so nothing becomes uncollectable.
 */

/** Max category chips on the pull screen, excluding the 🎲 Random chip. */
export const MAX_PULL_CATEGORIES = 8;

/**
 * The most recent `cap` categories, order preserved.
 *
 * `themes` MUST already be ordered oldest → newest, as `listThemes()` returns
 * it. Generic in `T` so it stays pure and free of any `Theme` dependency.
 */
export function recentCategories<T>(
  themes: T[],
  cap: number = MAX_PULL_CATEGORIES,
): T[] {
  if (cap <= 0) return [];
  return themes.length <= cap ? [...themes] : themes.slice(-cap);
}
