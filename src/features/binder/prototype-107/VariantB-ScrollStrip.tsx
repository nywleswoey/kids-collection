"use client";

/**
 * PROTOTYPE — #107, Variant B: "One line that swipes."
 *
 * The smallest possible change: the same chips, the same filter model, the same
 * `★ All` default — but the nav is one horizontally-scrolling snap rail instead
 * of a wrapping block. Three or four wrapped lines collapse to one, so the
 * sticky budget stops growing with the theme count.
 *
 * Its cost is exactly what the ticket warned about: most categories are
 * off-screen with no affordance saying how many. This take answers that with
 * (a) a right-edge fade, (b) a "6 / 32" position counter, and (c) the active
 * chip auto-scrolled into view — so you can judge whether those three are
 * enough, or whether hiding the list is fatal at 25+.
 */

import { useEffect, useRef, useState } from "react";
import type { Rarity } from "@/lib/types";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { ThemeSection } from "../ThemeSection";
import { SacrificeGrid } from "../SacrificeGrid";
import { countOwnedByRarity, filterCardsByRarity } from "../rarity-filter";
import { sacrificeReady } from "../sacrifice-filter";
import { ModeRow, RarityRow, TabChip } from "./shared";

export const VARIANT_B_NAME = "Scroll strip — one line that swipes";

export function VariantBScrollStrip({
  sections,
}: {
  sections: ThemeSectionData[];
}) {
  const [mode, setMode] = useState<"all" | "sacrifice">("all");
  const [active, setActive] = useState<string>("all");
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const railRef = useRef<HTMLElement | null>(null);

  const burnable = sacrificeReady(sections);

  const inCategory =
    active === "all" ? sections : sections.filter((s) => s.theme.id === active);
  const counts = countOwnedByRarity(inCategory);
  const visible = inCategory
    .map((s) => ({ ...s, cards: filterCardsByRarity(s.cards, rarity) }))
    .filter((s) => s.cards.length > 0);

  const index = sections.findIndex((s) => s.theme.id === active);

  // Keep the active chip on screen when it is picked from off-rail.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const el = rail.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div className="flex flex-col gap-6">
      <ModeRow mode={mode} setMode={setMode} burnableCount={burnable.length} />

      {mode === "sacrifice" ? (
        <SacrificeGrid cards={burnable} />
      ) : (
        <>
          <div
            className="sticky top-24 z-[9] rounded-[var(--radius)] border border-[color:var(--glass-brd)] shadow-[var(--shadow-soft)]"
            style={{ background: "var(--bg-1)" }}
          >
            <div className="relative">
              <nav
                ref={railRef}
                className="flex snap-x snap-mandatory gap-2 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <span data-active={active === "all"} className="snap-start shrink-0">
                  <TabChip
                    label="★ All"
                    active={active === "all"}
                    onClick={() => setActive("all")}
                    testid="galaxy-tab-all"
                  />
                </span>
                {sections.map((s) => (
                  <span
                    key={s.theme.id}
                    data-active={active === s.theme.id}
                    className="snap-start shrink-0"
                  >
                    <TabChip
                      label={
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          {s.theme.name}
                          {s.progress.complete ? <span>✅</span> : null}
                        </span>
                      }
                      active={active === s.theme.id}
                      onClick={() => setActive(s.theme.id)}
                      testid={`galaxy-tab-${s.theme.id}`}
                    />
                  </span>
                ))}
              </nav>
              {/* Right-edge fade: the "there is more this way" affordance. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-[var(--radius)]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--bg-1) 85%)",
                }}
              />
            </div>
            <p className="px-3 pb-2 text-xs font-semibold text-[color:var(--ink-mute)]">
              {active === "all"
                ? `★ All — ${sections.length} categories, swipe to browse →`
                : `${index + 1} of ${sections.length} categories — swipe for more →`}
            </p>
          </div>

          <RarityRow rarity={rarity} setRarity={setRarity} counts={counts} />

          {visible.map((s) => (
            <ThemeSection key={s.theme.id} section={s} />
          ))}
        </>
      )}
    </div>
  );
}
