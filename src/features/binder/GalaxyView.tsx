"use client";

import { useState } from "react";
import { RARITIES, type Rarity } from "@/lib/types";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { RARITY_META } from "@/features/card/rarity";
import { ThemeSection } from "./ThemeSection";
import { SacrificeGrid } from "./SacrificeGrid";
import { CategoryPicker } from "./CategoryPicker";
import { countOwnedByRarity, filterCardsByRarity } from "./rarity-filter";
import { sacrificeReady } from "./sacrifice-filter";

/**
 * Galaxy category view (Inc9 FR1).
 *
 * #107: a category is now a **place you go**, not a chip you tick. The binder
 * lands on `CategoryPicker` — a grid of picture tiles — and tapping one enters
 * that category, which is where the rarity row and the cards live. The old
 * shape rendered `★ All` plus one chip per theme in a single wrapped sticky
 * `<nav>`; that row grew by one every seed run and never shrank, and was
 * already three or four wrapped lines under a sticky header on a phone. A tile
 * grid grows downwards instead of pushing the cards off screen, so it still
 * reads at 25+ themes.
 *
 * Two consequences of that swap, both deliberate:
 *   - **`★ All` is gone.** "Every category at once" is a filter, not a
 *     destination, and 480 slots in one scroll was never a view anyone read.
 *   - **The rarity row moved inside a category.** It AND-combines with the
 *     active category (Inc13 Q4.1=A) and its counts are scoped to the current
 *     selection (Q4.2=A); with no "all categories" selection left, "within the
 *     current selection" now simply means "within this category". The filtered
 *     view still keeps locked cards so the child sees what's left (Q4.3=B).
 *
 * Inc22 FR9/FR11: the "Show" row switches between the galaxy and a flat grid of
 * the cards that can be sacrificed. The burn view is deliberately GLOBAL — it
 * ignores the category and rarity selections, and its count is the total across
 * every category, so "everything I can burn" is never a filtered subset. That
 * is why the mode row sits *above* the picker rather than inside a category:
 * it must never read as a filter applied within one.
 */
type Mode = "all" | "sacrifice";

export function GalaxyView({ sections }: { sections: ThemeSectionData[] }) {
  const [mode, setMode] = useState<Mode>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const burnable = sacrificeReady(sections);
  const open = sections.find((s) => s.theme.id === openId) ?? null;

  function openCategory(themeId: string) {
    setOpenId(themeId);
    // Rarity is scoped to a category, so entering one starts unfiltered.
    setRarity(null);
  }

  function closeCategory() {
    setOpenId(null);
    setRarity(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div data-testid="galaxy-mode-filter" className="flex flex-wrap gap-2">
        <TabChip
          label="🌌 All cards"
          active={mode === "all"}
          onClick={() => setMode("all")}
          testid="galaxy-mode-all"
        />
        <TabChip
          label={`🔥 Ready to sacrifice ${burnable.length}`}
          active={mode === "sacrifice"}
          onClick={() => setMode("sacrifice")}
          testid="galaxy-mode-sacrifice"
          frame="#f97316"
        />
      </div>

      {mode === "sacrifice" ? (
        <SacrificeGrid cards={burnable} />
      ) : open === null ? (
        <CategoryPicker sections={sections} onOpen={openCategory} />
      ) : (
        <OpenCategory
          section={open}
          rarity={rarity}
          setRarity={setRarity}
          onBack={closeCategory}
        />
      )}
    </div>
  );
}

/** One category as a destination: a back bar, the rarity row, and the cards. */
function OpenCategory({
  section,
  rarity,
  setRarity,
  onBack,
}: {
  section: ThemeSectionData;
  rarity: Rarity | null;
  setRarity: (r: Rarity | null) => void;
  onBack: () => void;
}) {
  const counts = countOwnedByRarity([section]);
  const cards = filterCardsByRarity(section.cards, rarity);

  return (
    <>
      <div
        data-testid="galaxy-category-bar"
        className="sticky top-24 z-[9] flex items-center gap-3 rounded-[var(--radius)] border border-[color:var(--glass-brd)] p-3 shadow-[var(--shadow-soft)]"
        style={{ background: "var(--bg-1)" }}
      >
        <button
          type="button"
          onClick={onBack}
          data-testid="galaxy-category-back"
          className="btn btn--ghost text-sm"
        >
          ← All categories
        </button>
        {/* The name only. The section header below carries the progress bar
            and its 🏆, so the mark is not repeated within one screen. */}
        <span className="display truncate text-lg">{section.theme.name}</span>
      </div>

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

      <ThemeSection section={{ ...section, cards }} />
    </>
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
