"use client";

import { useEffect, useRef, useState } from "react";
import {
  groupThemesByFranchise,
  isThemeFranchiseGroup,
  type ThemeFranchiseGroup,
} from "@/features/binder/franchise";
import type { Theme } from "@/lib/types";

/**
 * "More galaxies" picker (#kcmg). The pull screen's chip row only shows the
 * most recent `MAX_PULL_CATEGORIES` themes (categories.ts), so this is the
 * only way to choose an older one for a pull - Random and ticket flows could
 * already draw from the whole pool, but a child could never pick one on
 * purpose. Picking a category here sets the exact same `themeId` state the
 * chip row would, so it drives the identical pull (same cost, odds,
 * validation) through `PullButton`'s existing flow.
 *
 * A scrollable full-height sheet rather than `CenteredModal`'s fixed small
 * card: the list it holds grows with the catalog (18+ themes today) and a
 * `max-w-sm` box would clip it.
 *
 * #kcpullgroup: `themes` here is always `moreThemes` (PullButton), itself
 * `remainingCategories(allThemes)` - the chip row already shows the most
 * recent `MAX_PULL_CATEGORIES`, so a Pokémon region among those chips never
 * reaches this list, same as any other theme. The Pokémon regions that DO
 * reach it collapse behind one "Pokémon" entry, reusing the binder hub's
 * exact franchise-grouping signal (`franchise.ts`'s `groupThemesByFranchise`,
 * the flat-list sibling of the hub's `groupFranchises`) rather than a second
 * grouping algorithm. Picking a region from inside the group behaves exactly
 * like picking any other entry - `onPick` only ever sees a real `themeId`.
 */
export function MoreGalaxiesModal({
  themes,
  onPick,
  onClose,
}: {
  themes: Theme[];
  onPick: (themeId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [openFranchise, setOpenFranchise] = useState<ThemeFranchiseGroup<Theme> | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const entries = groupThemesByFranchise(themes);
  const visibleEntries = openFranchise ? openFranchise.members : entries;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="more-galaxies-title"
      data-testid="more-galaxies-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        data-testid="more-galaxies-backdrop"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      {/* Solid `--bg-1`, not the glassy default: the sheet sits right on top
          of the chip row, which would otherwise show through its tiles. */}
      <div
        className="panel relative z-10 flex max-h-[80vh] w-full max-w-sm flex-col gap-3 p-4"
        style={{ background: "var(--bg-1)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="more-galaxies-title" className="text-lg font-bold">
            {openFranchise ? (
              <button
                type="button"
                onClick={() => setOpenFranchise(null)}
                data-testid="more-galaxies-back"
                className="mr-1 text-base font-bold text-[color:var(--ink-soft)]"
              >
                ←
              </button>
            ) : null}
            {openFranchise ? openFranchise.label : "🪐 More galaxies"}
          </h2>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            data-testid="more-galaxies-close"
            className="btn btn--ghost px-3 py-1 text-sm"
          >
            ✕ Close
          </button>
        </div>

        <div
          className="grid grid-cols-2 gap-2 overflow-y-auto"
          data-testid="more-galaxies-list"
        >
          {visibleEntries.map((entry) =>
            isThemeFranchiseGroup(entry) ? (
              <button
                key={entry.key}
                type="button"
                onClick={() => setOpenFranchise(entry)}
                data-testid={`more-galaxy-franchise-${entry.key}`}
                className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-[color:var(--ink)] hover:bg-white/20"
              >
                {entry.label} ›
              </button>
            ) : (
              <button
                key={entry.id}
                type="button"
                onClick={() => onPick(entry.id)}
                data-testid={`more-galaxy-${entry.id}`}
                className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-[color:var(--ink)] hover:bg-white/20"
              >
                {entry.name}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
