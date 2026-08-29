"use client";

/**
 * PROTOTYPE — #110, take C: no new badge — a progress strip along the bottom
 * of the tile showing the RECEIVER's shelf: "Ana 3 → 4 🔥".
 *
 * The bet: the confusion the ticket names ("whose benefit?") is answered by
 * naming the shelf and showing the arithmetic, and a child who reads ×3 on
 * their own tiles already knows what a count means. It never claims "burnable
 * now", because it shows the gap.
 *
 * The risk: two numbers on one tile — my ×N bottom-right, their 3 → 4 along
 * the bottom — is exactly the kind of thing a 6-year-old reads as one number.
 */

import type { Card } from "@/lib/types";
import { SACRIFICE_MIN } from "@/features/pull/sacrifice";
import {
  BaseTile,
  ColumnShell,
  MY_COLUMN,
  NewBadge,
  THEIR_COLUMN,
  TileGrid,
  stubColumns,
  type Mix,
} from "./shared";

export const VARIANT_C_NAME = "C — their shelf: Ana 3 → 4 🔥 along the bottom";

export function VariantCProgress({ pool, mix }: { pool: Card[]; mix: Mix }) {
  const cols = stubColumns(pool, mix);
  return (
    <div className="grid w-full gap-5 md:grid-cols-2">
      {[
        { col: MY_COLUMN, cards: cols.mine },
        { col: THEIR_COLUMN, cards: cols.theirs },
      ].map(({ col, cards }) => (
        <ColumnShell key={col.title} {...col}>
          <TileGrid>
            {cards.map((c) => (
              <BaseTile
                key={c.card.id}
                entry={c}
                badge={c.tier === "new" ? <NewBadge label={col.newLabel} /> : undefined}
                footer={
                  c.tier === "one-away" ? (
                    <span className="block bg-[#f59e0b] px-1 py-0.5 text-center text-[0.6rem] font-black leading-tight text-black">
                      {col.receiver === "you" ? "You" : col.receiver} {SACRIFICE_MIN - 1} → {SACRIFICE_MIN} 🔥
                    </span>
                  ) : undefined
                }
              />
            ))}
          </TileGrid>
        </ColumnShell>
      ))}
    </div>
  );
}
