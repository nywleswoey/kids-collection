"use client";

import { useEffect, useRef } from "react";

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
 */
export function MoreGalaxiesModal({
  themes,
  onPick,
  onClose,
}: {
  themes: { id: string; name: string }[];
  onPick: (themeId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

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
            🪐 More galaxies
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
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              data-testid={`more-galaxy-${t.id}`}
              className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-[color:var(--ink)] hover:bg-white/20"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
