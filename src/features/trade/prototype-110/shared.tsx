"use client";

/**
 * PROTOTYPE — #110. Throwaway. Do not import this from production code.
 *
 * Shared scaffolding for the four takes: a stub board built from REAL pool
 * cards (so every take is judged against real art, real tile density and the
 * real rarity frames), plus the column shell and the base tile the variants
 * decorate.
 *
 * The stub exists because the tier-2 holding is invisible in most dev data —
 * it needs a friend who holds EXACTLY SACRIFICE_MIN - 1 of a card I have
 * spare. The question here is what a tile SAYS, not whether the tier is
 * computed right (that shipped with #109 and is property-tested), so the mix
 * is dialled by hand.
 */

import type { ReactNode } from "react";
import type { Card } from "@/lib/types";
import { CardImage } from "@/features/card/CardImage";
import { RARITY_META } from "@/features/card/rarity";
import { orderByValue, type BoardCard, type SwapTier } from "../board";

/** The friend on the other side of the stub board. */
export const FRIEND = "Ana";

/** How much of the column is one-away — the noise test. */
export const MIXES = ["real", "many", "one", "none"] as const;
export type Mix = (typeof MIXES)[number];

export const MIX_LABEL: Record<Mix, string> = {
  real: "a normal board — a few of each",
  many: "half the column is one-away",
  one: "exactly one one-away card",
  none: "no one-away cards at all",
};

/** Deterministic per-card pick, so a variant switch doesn't reshuffle the board. */
function hash(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}

function tierFor(mix: Mix, i: number): SwapTier {
  if (mix === "none") return i % 3 === 0 ? "new" : "rest";
  if (mix === "one") return i === 0 ? "one-away" : i % 3 === 0 ? "new" : "rest";
  if (mix === "many") return i % 2 === 0 ? "one-away" : i % 5 === 0 ? "new" : "rest";
  return i % 4 === 0 ? "new" : i % 5 === 1 ? "one-away" : "rest";
}

/**
 * Two mirrored stub columns from the real pool, ordered by the real
 * `orderByValue` so position — the cue #109 already shipped — is exactly what
 * production does.
 */
export function stubColumns(pool: Card[], mix: Mix): { mine: BoardCard[]; theirs: BoardCard[] } {
  const take = (offset: number, n: number) =>
    orderByValue(
      pool.slice(offset, offset + n).map((card, i) => ({
        card,
        count: 2 + (hash(card.id) % 4),
        tier: tierFor(mix, i),
        newToOther: tierFor(mix, i) === "new",
      })),
    );
  return { mine: take(0, 15), theirs: take(60, 15) };
}

/** The column chrome as it ships today: title, tier-1 count pill, opt-in filter. */
export function ColumnShell({
  title,
  badgeSummary,
  filterLabel,
  legend,
  children,
}: {
  title: string;
  badgeSummary: string;
  filterLabel: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="pill pill--gold text-xs">{badgeSummary}</span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" readOnly checked={false} />
        {filterLabel}
      </label>
      {legend ? (
        <p className="text-xs text-[color:var(--ink-soft)]">{legend}</p>
      ) : null}
      {children}
    </section>
  );
}

/** The tile grid at production density. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{children}</div>;
}

/**
 * Today's tile, with slots the variants fill: `badge` (top-left, where the
 * 🎁/🆕 tier-1 pill lives), `footer` (a full-width strip above the bottom
 * edge) and `frameClass` (extra ring/edge classes).
 */
export function BaseTile({
  entry,
  badge,
  footer,
  frameClass = "",
  countClass = "pill",
}: {
  entry: BoardCard;
  badge?: ReactNode;
  footer?: ReactNode;
  frameClass?: string;
  countClass?: string;
}) {
  const meta = RARITY_META[entry.card.rarity];
  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 bg-white/10 ${frameClass}`}
      style={{ borderColor: meta.frame }}
    >
      {badge ? <span className="absolute left-1 top-1 z-10">{badge}</span> : null}
      <CardImage src={entry.card.imageUrl} alt={entry.card.name} dim={200} />
      {footer ? <span className="absolute inset-x-0 bottom-0 z-10">{footer}</span> : null}
      <span className={`${countClass} absolute bottom-1 right-1 text-xs`}>×{entry.count}</span>
      <span className="rarity-badge">{meta.label}</span>
    </div>
  );
}

/** The tier-1 badge exactly as it ships today. */
export function NewBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#22c55e] px-1.5 py-0.5 text-[0.6rem] font-black leading-tight text-black">
      {label}
    </span>
  );
}

/** The two receivers, named — every variant has to say WHOSE shelf it means. */
export const MY_COLUMN = {
  title: "Your doubles",
  badgeSummary: `🎁 4 new for ${FRIEND}`,
  filterLabel: `Only show what ${FRIEND} is missing`,
  newLabel: `🎁 New for ${FRIEND}`,
  receiver: FRIEND,
} as const;

export const THEIR_COLUMN = {
  title: `${FRIEND}'s doubles`,
  badgeSummary: "🆕 4 new for you",
  filterLabel: "Only show what you're missing",
  newLabel: "🆕 New for you",
  receiver: "you",
} as const;
