"use client";

/**
 * PROTOTYPE — #107, Variant A: "A category is a place, not a filter."
 *
 * The binder lands on a grid of big category tiles — borrowed art, name,
 * progress. Tap one and you *go there*: the picker is replaced by that one
 * category's cards with a back bar. There is no sticky category nav at all,
 * because there is no category list on screen once you are inside one.
 *
 * Scales indefinitely: the tile grid just gets taller, and a taller grid of
 * pictures is a thing a 5-year-old can already scroll. `★ All` cannot survive
 * here — "every category at once" is not a destination — which is exactly the
 * collision #108 has to settle.
 */

import { useState } from "react";
import Image from "next/image";
import type { Rarity } from "@/lib/types";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { ThemeSection } from "../ThemeSection";
import { SacrificeGrid } from "../SacrificeGrid";
import { countOwnedByRarity, filterCardsByRarity } from "../rarity-filter";
import { sacrificeReady } from "../sacrifice-filter";
import { ModeRow, RarityRow, coverFor } from "./shared";

export const VARIANT_A_NAME = "Picker screen — a category is a place";

export function VariantAPickerScreen({
  sections,
}: {
  sections: ThemeSectionData[];
}) {
  const [mode, setMode] = useState<"all" | "sacrifice">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const burnable = sacrificeReady(sections);
  const open = sections.find((s) => s.theme.id === openId) ?? null;

  if (mode === "sacrifice") {
    return (
      <div className="flex flex-col gap-6">
        <ModeRow mode={mode} setMode={setMode} burnableCount={burnable.length} />
        <SacrificeGrid cards={burnable} />
      </div>
    );
  }

  // ── Inside a category ────────────────────────────────────────────────────
  if (open) {
    const counts = countOwnedByRarity([open]);
    const cards = filterCardsByRarity(open.cards, rarity);
    return (
      <div className="flex flex-col gap-6">
        <div
          className="sticky top-24 z-[9] flex items-center gap-3 rounded-[var(--radius)] border border-[color:var(--glass-brd)] p-3 shadow-[var(--shadow-soft)]"
          style={{ background: "var(--bg-1)" }}
        >
          <button
            type="button"
            onClick={() => {
              setOpenId(null);
              setRarity(null);
            }}
            className="btn btn--ghost text-sm"
          >
            ← All categories
          </button>
          <span className="display text-lg">{open.theme.name}</span>
          <span className="ml-auto text-sm font-bold tabular-nums text-[color:var(--ink-soft)]">
            {open.progress.owned}/{open.progress.total}
          </span>
        </div>

        <ModeRow mode={mode} setMode={setMode} burnableCount={burnable.length} />
        <RarityRow rarity={rarity} setRarity={setRarity} counts={counts} />

        <ThemeSection section={{ ...open, cards }} />
      </div>
    );
  }

  // ── The picker ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <ModeRow mode={mode} setMode={setMode} burnableCount={burnable.length} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sections.map((s) => {
          const cover = coverFor(s);
          const pct =
            s.progress.total > 0
              ? Math.round((s.progress.owned / s.progress.total) * 100)
              : 0;
          return (
            <button
              key={s.theme.id}
              type="button"
              onClick={() => setOpenId(s.theme.id)}
              className="panel slot-pop flex flex-col overflow-hidden p-0 text-left"
            >
              <span className="relative block">
                {cover.src ? (
                  <Image
                    src={cover.src}
                    alt=""
                    width={256}
                    height={256}
                    loading="lazy"
                    className={`aspect-square w-full object-cover ${
                      cover.owned ? "" : "opacity-25 grayscale"
                    }`}
                  />
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center text-4xl">
                    🪐
                  </span>
                )}
                {s.progress.complete ? (
                  <span className="absolute right-1 top-1 text-xl">✅</span>
                ) : null}
              </span>
              <span className="flex flex-col gap-1 p-2">
                <span className="line-clamp-1 text-sm font-bold">
                  {s.theme.name}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-black/30 ring-1 ring-inset ring-white/10">
                  <span
                    className="block h-full rounded-full bg-[linear-gradient(90deg,var(--brand-4),var(--brand-1))]"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-xs font-bold tabular-nums text-[color:var(--ink-soft)]">
                  {s.progress.owned}/{s.progress.total}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
