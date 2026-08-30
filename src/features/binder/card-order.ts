import { RARITIES } from "@/lib/types";
import type { BinderCard } from "@/lib/types";

/**
 * The order the 30 cards of a category are laid out in (#123). PURE →
 * property-tested.
 *
 * ── There was no order to preserve ──────────────────────────────────────────
 * Until this module, the grid rendered whatever `listCards` handed back, and
 * `listCards` carried **no `ORDER BY`** — a bare `SELECT` from `cards`, a table
 * with no `sort_order` column and a `gen_random_uuid()` primary key. Nothing
 * persisted the seed file's array position, so the on-screen order was Postgres
 * heap order: insertion order in practice for an insert-only table, guaranteed
 * by nothing, and free to change the first time a card row is updated.
 *
 * That was defensible while a category was one of 16 sections streaming past in
 * a single scroll. #107 made a category a **place you go**, so its 30 tiles are
 * now a screen the child arrives at deliberately, and the layout of a screen
 * should not be an accident of storage.
 *
 * Reordering destroys nothing the runbook built. `NEW-THEME-RUNBOOK.md` guards
 * the *themes* array explicitly — "array position **is** the theme's display
 * order… never reorder existing entries — that reshuffles what the children
 * already know" — and says nothing at all about the `cards` array inside a
 * theme. The schema draws the same line: `themes.sort_order` is persisted,
 * `cards` has no counterpart.
 *
 * ── Why rarity, and why ascending ───────────────────────────────────────────
 * The fork was intrinsic vs. collection state: order by a property of the card,
 * or float the child's owned cards (a trophy shelf) or their missing ones (a
 * to-do list). Intrinsic wins for the reason #122 rejected the rarest-OWNED
 * cover: **a landmark that moves is not a landmark.** An owned/locked split
 * reshuffles the whole grid on every pull, so "the one in the corner" stops
 * meaning anything — and it re-encodes what the tile already says out loud,
 * since owned art and a `❔` silhouette are not remotely alike.
 *
 * Ascending, because it is what the grid already shows. Every theme in
 * `seed/cards.json` is authored commons-first — `seed-schema.ts` enforces the
 * 15/8/5/2 pyramid, and all 18 themes read `ccccccccccccccc rrrrrrrr eeeee ll`
 * — so heap order has been reproducing rarity-ascending all along. Pinning it
 * moves not one tile a child already knows, and it opens a category on the
 * slots most likely to be filled rather than on two anonymous legendaries.
 *
 * ── Total, or the tiles reshuffle under a thumb ─────────────────────────────
 * Rarity, then name, then id — ties broken all the way down, the same rule
 * [#109's swap order](board.ts `orderByValue`) took for the same reason. Names
 * are unique across the whole pool (a runbook schema rule), so the id clause is
 * unreachable on real data; it is here so the order is total for a fixture too,
 * and so the comparator can never return 0 for two distinct cards.
 *
 * Rank comes from `RARITIES` rather than a literal list, so the order cannot
 * drift from the rarity vocabulary — the constants-not-coincidence rule Inc22
 * D4 set for every surface that reasons about rarity. Comparison is by code
 * unit, not `localeCompare`: an order rendered once on the server has to be the
 * same order everywhere, and ICU collation is not a constant.
 *
 * ── What it costs: position now carries rarity ──────────────────────────────
 * `CardSlot` renders a locked slot with no rarity hint (U5-Q5) — no frame, no
 * glow, no badge. Grouping by rarity means its **position** says what the tile
 * refuses to: the last two `❔` of a category are its legendaries. Taken
 * deliberately, not overlooked. The rule as codified is about the tile's own
 * decoration and survives untouched; the leak is only legible to someone who
 * knows the pyramid; and it is what the grid has shown by accident since the
 * first seed run. #122 had already made the larger version of this trade,
 * fronting the hub with every theme's legendary art.
 *
 * The grid is deliberately NOT cut into labelled bands the way [#110's swap
 * columns](board.ts `bandsByTier`) were. That precedent exists because the tier
 * was invisible — #110 had stripped every badge, so nothing on a tile said
 * which band it sat in. Rarity is the opposite: already visible on every owned
 * tile as a frame, a glow and a corner badge (U5-FR2). Headings would restate
 * it, break a 30-tile grid into four ragged stubs, and state outright the one
 * thing the `❔` is meant not to say.
 */
export function orderCategoryCards(cards: BinderCard[]): BinderCard[] {
  return [...cards].sort(
    (a, b) =>
      RARITIES.indexOf(a.card.rarity) - RARITIES.indexOf(b.card.rarity) ||
      cmp(a.card.name, b.card.name) ||
      cmp(a.card.id, b.card.id),
  );
}

/** Code-unit comparison — deterministic across runtimes, unlike `localeCompare`. */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
