import type { ThemeSection } from "@/lib/types";

/**
 * Where the binder is (#108). PURE → property-tested.
 *
 * #107 made a category a place you go rather than a chip you tick, and the
 * binder then shows exactly one of three things: the picker (the hub), one
 * category, or the burn pile. Those are mutually exclusive, so they are one
 * value, not a category selection plus a mode flag.
 *
 * That value lives in the URL as `?at=`, for one reason: a card is a link.
 * Every tile deep-links to `/play/binder/<cardId>`, and before #108 coming
 * back landed on the hub — two taps from where you were, on every card read,
 * and worse in the burn pile, which is a loop (burn one, come back, burn the
 * next). A place in the URL survives that round trip, the browser back button,
 * and a refresh.
 *
 * Rarity is deliberately NOT a place. It is a lens applied inside one, it
 * resets on entry, and it is the child's most-changed control — putting it in
 * the URL would fill the history stack with things that are not somewhere you
 * went.
 *
 * `burn` cannot collide with a category: `themes.id` is `gen_random_uuid()`.
 */
export type Place =
  | { kind: "hub" }
  | { kind: "category"; themeId: string }
  | { kind: "burn" };

/** The hub place (category picker). */
export const HUB: Place = { kind: "hub" };
/** The burn pile place (sacrifice-ready cards). */
export const BURN: Place = { kind: "burn" };

/** The reserved `?at=` value for the burn pile. */
export const BURN_PARAM = "burn";

/**
 * Read a place out of `?at=`, resolved against the categories that exist.
 *
 * Anything unrecognised — absent, empty, a theme that has been deleted, a
 * hand-typed value — falls back to the hub rather than erroring. A stale link
 * should land the child on the front door, never on a broken screen.
 */
export function parsePlace(
  at: string | string[] | undefined,
  sections: ThemeSection[],
): Place {
  const raw = Array.isArray(at) ? at[0] : at;
  if (!raw) return HUB;
  if (raw === BURN_PARAM) return BURN;
  return sections.some((s) => s.theme.id === raw)
    ? { kind: "category", themeId: raw }
    : HUB;
}

/**
 * The `?at=` value for a place — `null` at the hub, so the hub's URL is the
 * bare `/play/binder` rather than an empty parameter.
 */
export function placeParam(place: Place): string | null {
  switch (place.kind) {
    case "hub":
      return null;
    case "burn":
      return BURN_PARAM;
    case "category":
      return place.themeId;
  }
}

/** The binder URL for a place. Round-trips with {@link parsePlace}. */
export function placeHref(place: Place): string {
  const param = placeParam(place);
  return param === null ? "/play/binder" : `/play/binder?at=${encodeURIComponent(param)}`;
}

/**
 * Where a card tile should send the child back to: the place they tapped it
 * from, carried as `?from=`. Absent at the hub, which has no card tiles of its
 * own but may gain them.
 */
export function cardHref(cardId: string, from: Place): string {
  const param = placeParam(from);
  const base = `/play/binder/${encodeURIComponent(cardId)}`;
  return param === null ? base : `${base}?from=${encodeURIComponent(param)}`;
}

/**
 * Card detail's back link. Honours `?from=` when the child arrived by tapping
 * a tile; otherwise derives the card's own category, so a deep link, a shared
 * URL or the reward modal still lands somewhere that makes sense rather than
 * on the hub.
 *
 * Deliberately does NOT validate `from` against the catalog — card detail
 * fetches one card, not the whole binder, and validating here would cost it a
 * second query to guard against a hand-edited parameter. It doesn't need to:
 * the binder page resolves `?at=` through {@link parsePlace}, so a junk value
 * degrades to the hub one hop later instead of erroring.
 */
export function backHref(
  from: string | string[] | undefined,
  cardThemeId: string,
): string {
  const raw = Array.isArray(from) ? from[0] : from;
  return `/play/binder?at=${encodeURIComponent(raw || cardThemeId)}`;
}
