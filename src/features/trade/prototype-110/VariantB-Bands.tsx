"use client";

/**
 * PROTOTYPE — #110, take B: no per-tile mark at all. The column is cut into
 * three labelled bands, so the sort #109 already ships becomes legible without
 * putting a single pixel on the art.
 *
 * The bet: the tier is a property of a GROUP, not of a card, and saying it
 * once in a full sentence is cheaper than saying it 8 times in 4 words. It
 * also kills the tier-1 badge — the band says that too.
 *
 * The risk: three headings per column doubles the vertical chrome on a phone,
 * and a band of one card looks like a mistake.
 */

import type { Card } from "@/lib/types";
import type { BoardCard, SwapTier } from "../board";
import {
  BaseTile,
  ColumnShell,
  MY_COLUMN,
  THEIR_COLUMN,
  TileGrid,
  stubColumns,
  type Mix,
} from "./shared";

export const VARIANT_B_NAME = "B — bands: the column says it, the tile stays clean";

const BAND_ORDER: SwapTier[] = ["new", "one-away", "rest"];

function bandTitle(tier: SwapTier, receiver: string): string {
  const they = receiver === "you" ? "you" : receiver;
  const has = receiver === "you" ? "you already have" : `${receiver} already has`;
  if (tier === "new") return `🎁 New for ${they}`;
  if (tier === "one-away") return `🔥 One more and ${they} can burn it`;
  return `${has} these`;
}

function Bands({ cards, receiver }: { cards: BoardCard[]; receiver: string }) {
  return (
    <div className="flex flex-col gap-3">
      {BAND_ORDER.map((tier) => {
        const inBand = cards.filter((c) => c.tier === tier);
        if (inBand.length === 0) return null;
        return (
          <div key={tier} className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--ink-soft)]">
              {bandTitle(tier, receiver)} ({inBand.length})
            </h3>
            <TileGrid>
              {inBand.map((c) => (
                <BaseTile key={c.card.id} entry={c} />
              ))}
            </TileGrid>
          </div>
        );
      })}
    </div>
  );
}

export function VariantBBands({ pool, mix }: { pool: Card[]; mix: Mix }) {
  const cols = stubColumns(pool, mix);
  return (
    <div className="grid w-full gap-5 md:grid-cols-2">
      {[
        { col: MY_COLUMN, cards: cols.mine },
        { col: THEIR_COLUMN, cards: cols.theirs },
      ].map(({ col, cards }) => (
        <ColumnShell key={col.title} {...col}>
          <Bands cards={cards} receiver={col.receiver} />
        </ColumnShell>
      ))}
    </div>
  );
}
