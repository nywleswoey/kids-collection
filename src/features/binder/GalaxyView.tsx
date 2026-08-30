"use client";

import { useCallback, useEffect, useState } from "react";
import { RARITIES, type Rarity } from "@/lib/types";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { RARITY_META } from "@/features/card/rarity";
import { ThemeSection } from "./ThemeSection";
import { SacrificeGrid } from "./SacrificeGrid";
import { CategoryPicker } from "./CategoryPicker";
import { coverCard } from "./category-cover";
import { CardImage } from "@/features/card/CardImage";
import { countOwnedByRarity, filterCardsByRarity } from "./rarity-filter";
import { sacrificeReady } from "./sacrifice-filter";
import { BURN, HUB, type Place, parsePlace, placeHref } from "./binder-place";

/**
 * Galaxy category view (Inc9 FR1).
 *
 * #107: a category is a **place you go**, not a chip you tick. The binder lands
 * on `CategoryPicker` — a grid of picture tiles — and tapping one enters that
 * category, which is where the rarity row and the cards live. The old shape
 * rendered `★ All` plus one chip per theme in a single wrapped sticky `<nav>`;
 * that row grew by one every seed run and never shrank, and was already three
 * or four wrapped lines under a sticky header on a phone. A tile grid grows
 * downwards instead of pushing the cards off screen, so it still reads at 25+.
 *
 * #108 finished the shape around it. The binder is in exactly one **place** —
 * the hub, one category, or the burn pile — and that place lives in the URL as
 * `?at=` (see `binder-place.ts` for why). Three consequences:
 *
 *   - **The picker is the hub.** Both other places carry a `← All categories`
 *     bar, so there is exactly one way back and it is the same one everywhere.
 *   - **The burn pile is a door on the hub, not a mode above every screen.**
 *     Inc22 FR11 made the burn view global — it ignores category and rarity and
 *     counts across the whole galaxy — so a `🌌 All cards | 🔥 Ready to
 *     sacrifice` pair rendered *inside* Dinosaurs lit "All cards" while the
 *     child was plainly somewhere specific. It is now one entry on the hub,
 *     muted at zero rather than hidden: `SacrificeGrid`'s empty state is where
 *     a child learns the 4-copies rule, so it has to stay reachable before they
 *     have anything to burn.
 *   - **`★ All` is gone.** "Every category at once" is a filter, not a
 *     destination, and 480 slots in one scroll was never a view anyone read.
 *
 * **Sticky budget: two layers, ever** — the page header, plus one place bar
 * inside a category or the burn pile. The rarity row deliberately scrolls away:
 * it is set on arrival and rarely changed mid-scroll, and a third sticky line
 * on a phone would re-open exactly the crowding #107 set out to fix.
 *
 * Rarity AND-combines with the category (Inc13 Q4.1=A) with counts scoped to
 * the current selection (Q4.2=A); with no "all categories" selection left that
 * now simply means "within this category". The filtered view still keeps locked
 * cards so the child sees what's left (Q4.3=B).
 */
export function GalaxyView({
  sections,
  initialPlace,
}: {
  sections: ThemeSectionData[];
  /** Resolved from `?at=` on the server, so a refresh or deep link lands right. */
  initialPlace: Place;
}) {
  const [place, setPlace] = useState<Place>(initialPlace);
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const burnable = sacrificeReady(sections);

  /**
   * Going somewhere is a history push, not a re-render of the server page. All
   * the sections are already in hand, so re-running the route to change `?at=`
   * would trade an instant switch for a round trip; `history.pushState` gives
   * the URL and the back button without one (supported directly in Next 15).
   */
  const go = useCallback((next: Place) => {
    window.history.pushState(null, "", placeHref(next));
    setPlace(next);
    // Rarity is scoped to a category, so every arrival starts unfiltered.
    setRarity(null);
    window.scrollTo({ top: 0 });
  }, []);

  // The back button moves between places rather than off the binder entirely.
  useEffect(() => {
    function onPop() {
      const at = new URLSearchParams(window.location.search).get("at");
      setPlace(parsePlace(at ?? undefined, sections));
      setRarity(null);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [sections]);

  if (place.kind === "burn") {
    return (
      <div className="flex flex-col gap-6">
        <PlaceBar
          title={`🔥 ${burnable.length} ${burnable.length === 1 ? "card" : "cards"}`}
          onBack={() => go(HUB)}
        />
        <SacrificeGrid cards={burnable} />
      </div>
    );
  }

  const open =
    place.kind === "category"
      ? (sections.find((s) => s.theme.id === place.themeId) ?? null)
      : null;

  if (open) {
    const counts = countOwnedByRarity([open]);
    const cards = filterCardsByRarity(open.cards, rarity);

    return (
      <div className="flex flex-col gap-6">
        <PlaceBar
          title={open.theme.name}
          cover={coverCard(open)?.card.imageUrl}
          progress={open.progress}
          onBack={() => go(HUB)}
        />

        <div data-testid="galaxy-rarity-filter" className="flex flex-wrap gap-2">
          <TabChip
            label="All rarities"
            active={rarity === null}
            onClick={() => setRarity(null)}
            testid="galaxy-rarity-all"
          />
          {RARITIES.map((r) => (
            <TabChip
              key={r}
              label={`${RARITY_META[r].label} ${counts[r]}`}
              active={rarity === r}
              onClick={() => setRarity(r)}
              testid={`galaxy-rarity-${r}`}
              frame={RARITY_META[r].frame}
            />
          ))}
        </div>

        {/* The place bar is this screen's header, so the section's own is off:
            one name, one progress bar, one 🏆 within a single screen. */}
        <ThemeSection section={{ ...open, cards }} from={place} heading={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BurnDoor count={burnable.length} onOpen={() => go(BURN)} />
      <CategoryPicker
        sections={sections}
        onOpen={(themeId) => go({ kind: "category", themeId })}
      />
    </div>
  );
}

/**
 * The way into the burn pile, on the hub only. Loud while there is something
 * to burn, quiet at zero — but never hidden, or the rule behind it could never
 * be discovered before the day it first applies.
 */
function BurnDoor({ count, onOpen }: { count: number; onOpen: () => void }) {
  const ready = count > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="galaxy-burn-door"
      className={`flex items-center gap-3 rounded-[var(--radius)] px-4 py-3 text-left font-bold transition ${
        ready
          ? "bg-[#f97316] text-black shadow-[var(--shadow-soft)] hover:brightness-110"
          : "bg-white/10 text-[color:var(--ink-soft)] hover:bg-white/20"
      }`}
    >
      <span aria-hidden>🔥</span>
      <span className="flex-1">Ready to sacrifice {count}</span>
      <span aria-hidden>→</span>
    </button>
  );
}

/** The one sticky layer a place is allowed: the way back, and where you are. */
/**
 * The sticky bar inside a category or the burn pile: one way back, where you
 * are, and how far along.
 *
 * #122 gave it the category's cover thumbnail. The bar was pure text, and #108
 * moved the category heading INTO it — so for a child who cannot yet read the
 * name, it said nothing about where they were standing. It is sticky, so it
 * persists through a 30-card scroll: not arrival confirmation (they just tapped
 * the tile) but a persistent *where am I*, which is exactly when a picture beats
 * a word. Decorative (`alt=""`) because `title` already carries the name, and no
 * new sticky layer — the two-layer budget is untouched.
 */
function PlaceBar({
  title,
  cover,
  progress,
  onBack,
}: {
  title: string;
  /** The category's cover art; absent for the burn pile, which is no category. */
  cover?: string;
  progress?: { owned: number; total: number; complete: boolean };
  onBack: () => void;
}) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.owned / progress.total) * 100)
      : 0;

  return (
    <div
      data-testid="galaxy-place-bar"
      className="sticky top-24 z-[9] flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[color:var(--glass-brd)] p-3 shadow-[var(--shadow-soft)]"
      style={{ background: "var(--bg-1)" }}
    >
      <button
        type="button"
        onClick={onBack}
        data-testid="galaxy-place-back"
        className="btn btn--ghost text-sm"
      >
        ← All categories
      </button>
      {cover ? (
        <CardImage
          src={cover}
          alt=""
          dim={64}
          loading="lazy"
          className="h-7 w-7 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <span className="display min-w-0 flex-1 truncate text-lg">{title}</span>
      {progress ? (
        <span
          className="flex items-center gap-2"
          data-testid="galaxy-place-progress"
        >
          <span className="h-2.5 w-24 overflow-hidden rounded-full bg-black/30 ring-1 ring-inset ring-white/10">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,var(--brand-4),var(--brand-1))] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="text-sm font-bold tabular-nums text-[color:var(--ink-soft)]">
            {progress.owned} / {progress.total}
          </span>
          {progress.complete ? <span aria-label="Set complete">🏆</span> : null}
        </span>
      ) : null}
    </div>
  );
}

function TabChip({
  label,
  active,
  onClick,
  testid,
  frame,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testid: string;
  frame?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testid}
      style={active && frame ? { background: frame, color: "#000" } : undefined}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[color:var(--brand-1)] text-black ring-2 ring-[color:var(--brand-1)]"
          : "bg-white/10 text-[color:var(--ink)] hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}
