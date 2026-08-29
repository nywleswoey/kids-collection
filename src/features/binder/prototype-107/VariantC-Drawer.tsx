"use client";

/**
 * PROTOTYPE — #107, Variant C: "One button, a full sheet behind it."
 *
 * The sticky nav shrinks to a *single* control that names the current
 * selection — `★ All ▾` / `Dinosaurs ▾`. Tapping it throws a full-screen sheet
 * of picture tiles over the page; picking one closes the sheet and filters in
 * place, leaving your scroll position alone.
 *
 * So the filter model survives (`★ All` still works, the rarity row still
 * AND-combines), the sticky cost is one row forever, and the full list is one
 * tap away and *complete* — no off-screen categories. The price is a modal: a
 * child has to open a thing to change categories instead of seeing them.
 *
 * The sheet is the same tile grid as Variant A. That is on purpose — it makes
 * A-vs-C a clean question about whether category browsing is the *page* or a
 * *sheet over the page*, not about which grid looks nicer.
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

export const VARIANT_C_NAME = "Drawer — one button, a sheet behind it";

export function VariantCDrawer({ sections }: { sections: ThemeSectionData[] }) {
  const [mode, setMode] = useState<"all" | "sacrifice">("all");
  const [active, setActive] = useState<string>("all");
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [sheet, setSheet] = useState(false);

  const burnable = sacrificeReady(sections);
  const activeSection = sections.find((s) => s.theme.id === active) ?? null;

  const inCategory = activeSection ? [activeSection] : sections;
  const counts = countOwnedByRarity(inCategory);
  const visible = inCategory
    .map((s) => ({ ...s, cards: filterCardsByRarity(s.cards, rarity) }))
    .filter((s) => s.cards.length > 0);

  const ownedAll = sections.reduce((n, s) => n + s.progress.owned, 0);
  const totalAll = sections.reduce((n, s) => n + s.progress.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <ModeRow mode={mode} setMode={setMode} burnableCount={burnable.length} />

      {mode === "sacrifice" ? (
        <SacrificeGrid cards={burnable} />
      ) : (
        <>
          <div
            className="sticky top-24 z-[9] flex items-center gap-3 rounded-[var(--radius)] border border-[color:var(--glass-brd)] p-3 shadow-[var(--shadow-soft)]"
            style={{ background: "var(--bg-1)" }}
          >
            <button
              type="button"
              onClick={() => setSheet(true)}
              data-testid="galaxy-category-drawer-open"
              className="btn btn--primary flex-1 justify-between text-sm"
            >
              <span className="truncate">
                {activeSection ? activeSection.theme.name : "★ All categories"}
              </span>
              <span aria-hidden>▾</span>
            </button>
            {activeSection ? (
              <button
                type="button"
                onClick={() => setActive("all")}
                className="btn btn--ghost text-sm"
              >
                ✕
              </button>
            ) : null}
          </div>

          <RarityRow rarity={rarity} setRarity={setRarity} counts={counts} />

          {visible.map((s) => (
            <ThemeSection key={s.theme.id} section={s} />
          ))}
        </>
      )}

      {sheet ? (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(4,2,18,0.92)" }}
        >
          <div className="flex items-center gap-3 p-4">
            <h2 className="display text-xl">Pick a category</h2>
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="btn btn--ghost ml-auto text-sm"
            >
              ✕ Close
            </button>
          </div>
          <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
            <button
              type="button"
              onClick={() => {
                setActive("all");
                setSheet(false);
              }}
              className={`panel mb-3 flex w-full items-center gap-3 p-4 text-left ${
                active === "all" ? "ring-2 ring-[color:var(--brand-1)]" : ""
              }`}
            >
              <span className="text-3xl" aria-hidden>
                ★
              </span>
              <span className="font-bold">All categories</span>
              <span className="ml-auto text-sm font-bold tabular-nums text-[color:var(--ink-soft)]">
                {ownedAll}/{totalAll}
              </span>
            </button>
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
                    onClick={() => {
                      setActive(s.theme.id);
                      setSheet(false);
                    }}
                    className={`panel slot-pop flex flex-col overflow-hidden p-0 text-left ${
                      active === s.theme.id
                        ? "ring-2 ring-[color:var(--brand-1)]"
                        : ""
                    }`}
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
        </div>
      ) : null}
    </div>
  );
}
