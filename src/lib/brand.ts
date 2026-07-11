/**
 * Central branding constants (Increment 3 — galaxy theme).
 * User-facing name, action verbs, and icon motif live here so wording/icons
 * change in one place. Pure module: no side effects, SSR-safe.
 */
export const APP_NAME = "Star Catchers";

/** Verb for getting a new card (replaces "Pull"). Economy/logic unchanged. */
export const DISCOVER_LABEL = "Discover";

/** Name of the collection screen (replaces "Binder"). */
export const GALAXY_LABEL = "My Galaxy";

/** Child-friendly space icons (replace poker-card glyphs 🃏 / 🎴). */
export const ICON = {
  rocket: "🚀",
  planet: "🪐",
  star: "⭐",
} as const;
