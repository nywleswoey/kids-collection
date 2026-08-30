import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { CardImage } from "@/features/card/CardImage";
import { coverCard } from "./category-cover";

/**
 * The galaxy's category picker (#107, densified by #140). A grid of picture
 * tiles — one per category — that the binder lands on. Tapping one enters that
 * category.
 *
 * This replaces the wrapped sticky row of one chip per theme, which grew by one
 * every time the seed runbook shipped 30 more cards and was already three or
 * four wrapped lines on a phone at 16 themes. A tile grid grows *downwards*
 * instead of pushing the cards off screen, so it still reads at 25+; and
 * tapping a picture is the cheap interaction for the youngest player, where
 * reading a row of names is the expensive one.
 *
 * A finished category is called out with the same 🏆 "Set complete!" language
 * the reward modal celebrates it with, so the tile and the celebration are one
 * promise rather than two marks the child has to learn separately.
 *
 * #122: the tile's face is the theme's first legendary — since #123's grid
 * order, the alphabetically first one; `category-cover.ts` owns the rule —
 * owned or not, a LANDMARK showing the same picture on every visit. It used to
 * be the child's rarest owned card, which meant a category they had not started
 * rendered a neutral 🪐 and told them nothing at the one moment they most needed
 * to tell categories apart. That placeholder is gone rather than restyled:
 * `coverCard` is total for any non-empty category, so there is no state left for
 * it to cover.
 *
 * ── #140: the hub keeps `sort_order`, and buys DENSITY instead ───────────────
 * The hub is the last screen this map's destination — "the category selection
 * scales past 16 themes" — had not decided at the tile level. 18 themes today,
 * one more every runbook run, and `CategoryPicker` renders them in
 * `listThemes`' order: oldest first, so the NEWEST category is furthest from the
 * thumb.
 *
 * **That order stays, deliberately.** Re-ranking is zero-sum — something is
 * always last — and the two rankings that would actually help, recency and
 * completion, are the child's own collection state. #122 rejected the rarest-
 * OWNED cover and #123 rejected an owned-first grid on the same rule, *a
 * landmark that moves is not a landmark*; a hub tile is the largest landmark in
 * the app, so the rule binds hardest here. `listThemes` was made **total**
 * (see `pool/service.ts`) so that inherited order is now pinned rather than
 * resting on a query's partial `ORDER BY`.
 *
 * The failure is not reaching the NEWEST category — that is the pull screen's
 * job, and `recentCategories` already shows the last 8 there; a second copy of
 * a tile on the hub is [#110](../trade/board.ts)'s badge noise one level up. The
 * failure is **scanning**: finding one KNOWN category among 32, where a child
 * who cannot hold the grid in working memory re-scans from the top every time.
 * Density is the direct attack on a scan — more pictures per screen, fewer
 * re-scans.
 *
 * Density beat **grouping** (5–6 named groups, turning a linear scan into a
 * tree) on #122's own precedent: a group is a per-theme authored judgment
 * charged forever — a seed field, a runbook step, a taxonomy call — which is
 * exactly the recurring cost #122 refused when it chose a free legendary over
 * authored cover art. And the taxonomy degrades fastest at the scale we are
 * designing for; #122's own worked example was Warriors vs Artillery vs Land
 * Machines, three themes no clean group separates. A tree whose branches the
 * child disagrees with is slower than a list. Grouping is out of scope for this
 * map, tripwired at **36 themes** — 12 rows, where 3-column density stops
 * holding the scroll flat and a 4th column would put art at ~80px, the size #122
 * called mud.
 *
 * ── What density cost, and what paid for it ─────────────────────────────────
 * At 3 columns the art is ~106px on a 390px phone (`max-w-3xl` + `p-6` → 342px
 * of content), well clear of the mud line. The text block does NOT shrink with
 * the column count, so at a 176px tile it is ~40% of the tile — the dominant
 * cost at density, and the thing worth cutting.
 *
 * The visible `18 / 30` is gone: it is the **progress bar's fact stated twice**,
 * the redundancy [#110](../trade/board.ts) stripped every badge for and #123
 * refused band headings for. A hub is where you compare fill, not do arithmetic.
 * Nothing is lost to a screen reader — `aria-label` still says "18 of 30
 * collected", which is why the count could go visible-only.
 *
 * Its line pays for a second NAME line. At ~101px of text width the median
 * 13-character theme name fits on one line, but the longest quarter — Deep Sea
 * Creatures (18), Mythic Creatures (16), Flying Machines (15) — did not, so
 * `line-clamp-1` would have made truncation the norm rather than the exception
 * at exactly the moment names got narrower. The name stays whole: the picture
 * serves the pre-reader, the name serves everyone else, and it is the only text
 * on the screen. The two-line box is fixed height so a one-line name does not
 * raise its tile's bar out of line with its neighbours'.
 *
 * The 🏆 banner keeps its full wording. Measured at a 390px viewport it
 * renders full-size on one line at 3 columns, unclipped; wrapping is left
 * available as headroom rather than being what happens. Shrinking the type
 * (~9.6px, for a child) or cutting to a bare 🏆 would both spend the language
 * match #107 bought, so neither is on the table even if a longer banner ever
 * does wrap — and it would only do so in the completed state, where covering
 * art matters least and a louder tile is the point.
 *
 * Net: 32 themes now scroll ~2,070px, LESS than today's 18 themes at ~2,240px.
 * The pool nearly doubles and the hub does not get longer.
 */
export function CategoryPicker({
  sections,
  onOpen,
}: {
  sections: ThemeSectionData[];
  onOpen: (themeId: string) => void;
}) {
  return (
    <div
      data-testid="galaxy-category-picker"
      className="grid grid-cols-3 gap-3 sm:grid-cols-4"
    >
      {sections.map((section) => (
        <CategoryTile
          key={section.theme.id}
          section={section}
          onOpen={() => onOpen(section.theme.id)}
        />
      ))}
    </div>
  );
}

function CategoryTile({
  section,
  onOpen,
}: {
  section: ThemeSectionData;
  onOpen: () => void;
}) {
  const { theme, progress } = section;
  const cover = coverCard(section);
  const pct = progress.total > 0 ? Math.round((progress.owned / progress.total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`galaxy-category-${theme.id}`}
      aria-label={
        progress.complete
          ? `${theme.name}: set complete, all ${progress.total} collected`
          : `${theme.name}: ${progress.owned} of ${progress.total} collected`
      }
      className="panel slot-pop flex flex-col overflow-hidden p-0 text-left"
    >
      <span className="relative block">
        {cover ? (
          <CardImage src={cover.card.imageUrl} alt="" dim={256} loading="lazy" />
        ) : null}
        {progress.complete ? (
          <span className="absolute inset-x-0 bottom-0 block bg-[color:var(--brand-1)] px-1 py-1 text-center text-[0.7rem] font-black leading-tight text-black">
            🏆 Set complete!
          </span>
        ) : null}
      </span>

      <span className="flex flex-col gap-1.5 p-2.5">
        {/* Fixed two-line box: a one-line name must not lift its tile's bar out
            of line with the two-line names beside it. */}
        <span className="line-clamp-2 min-h-[2.25rem] text-sm font-bold leading-[1.125rem]">
          {theme.name}
        </span>
        <span className="h-2 overflow-hidden rounded-full bg-black/30 ring-1 ring-inset ring-white/10">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,var(--brand-4),var(--brand-1))] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
    </button>
  );
}
