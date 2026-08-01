"use client";

import { useState } from "react";
import { RARITIES, type Rarity } from "@/lib/types";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { RARITY_META } from "@/features/card/rarity";
import { ThemeSection } from "./ThemeSection";
import { SacrificeGrid } from "./SacrificeGrid";
import { countOwnedByRarity, filterCardsByRarity } from "./rarity-filter";
import { sacrificeReady } from "./sacrifice-filter";

/**
 * Galaxy category view (Inc9 FR1). Sticky tab bar of category chips filters the
 * galaxy to one theme; "★ All" (default) shows every section. Scales as the
 * number of categories grows.
 *
 * Inc13 FR1/FR2: a second chip row filters by rarity and shows the owned count
 * per rarity. Rarity AND-combines with the active category (Q4.1=A); counts are
 * owned-only within the current category selection (Q4.2=A); the filtered view
 * keeps locked cards so the child sees what's left (Q4.3=B).
 *
 * Inc22 FR9/FR11: a "Show" row switches between the galaxy and a flat grid of
 * the cards that can be sacrificed. The burn view is deliberately GLOBAL — it
 * ignores both chip rows, and its count is the total across every category, so
 * "everything I can burn" is never a filtered subset.
 */
type Mode = "all" | "sacrifice";

export function GalaxyView({ sections }: { sections: ThemeSectionData[] }) {
  const [mode, setMode] = useState<Mode>("all");
  const [active, setActive] = useState<string>("all");
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const burnable = sacrificeReady(sections);

  const inCategory =
    active === "all"
      ? sections
      : sections.filter((s) => s.theme.id === active);

  const counts = countOwnedByRarity(inCategory);

  const visible = inCategory
    .map((section) => ({
      ...section,
      cards: filterCardsByRarity(section.cards, rarity),
    }))
    // Hide sections with no cards under the active rarity filter.
    .filter((section) => section.cards.length > 0);

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
      ) : (
        <>
          <nav
            data-testid="galaxy-tabs"
            className="sticky top-24 z-[9] flex flex-wrap gap-2 rounded-[var(--radius)] border border-[color:var(--glass-brd)] p-3 shadow-[var(--shadow-soft)]"
            style={{ background: "var(--bg-1)" }}
          >
            <TabChip
              label="★ All"
              active={active === "all"}
              onClick={() => setActive("all")}
              testid="galaxy-tab-all"
            />
            {sections.map((s) => (
              <TabChip
                key={s.theme.id}
                label={s.theme.name}
                active={active === s.theme.id}
                onClick={() => setActive(s.theme.id)}
                testid={`galaxy-tab-${s.theme.id}`}
              />
            ))}
          </nav>

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

          {visible.map((section) => (
            <ThemeSection key={section.theme.id} section={section} />
          ))}
        </>
      )}
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
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[color:var(--brand-1)] text-black ring-2 ring-[color:var(--brand-1)]"
          : "bg-white/10 text-[color:var(--ink)] hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}
