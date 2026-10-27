/**
 * Pull-screen category selection (Inc21 FR3/FR4, extended by #kcmg).
 *
 * The catalog keeps growing (18 themes and counting), but the pull screen's chip
 * row has to stay readable on a small phone. Show only the most recent ones as
 * chips - "recent" being the theme order `listThemes()` now guarantees via
 * `themes.sort_order` (oldest first, newest last) - and surface every other
 * category through the "More galaxies" picker instead of hiding it outright.
 *
 * Choosing a category is never restricted to the visible 8: `pull()` always
 * accepted any `themeId` in the catalog (it just filters the draw pool), so
 * capping here was always presentation-only and the server needed no change
 * to accept a category reached through the picker instead of a chip.
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

/**
 * The complement of `recentCategories`: every category NOT shown as a chip,
 * oldest → newest, for the "More galaxies" picker. Same cap/order contract as
 * `recentCategories`, so the two always partition `themes` with no overlap and
 * no gap.
 */
export function remainingCategories<T>(
  themes: T[],
  cap: number = MAX_PULL_CATEGORIES,
): T[] {
  if (cap <= 0) return [...themes];
  return themes.length <= cap ? [] : themes.slice(0, themes.length - cap);
}
