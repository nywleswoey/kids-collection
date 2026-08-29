"use client";

/**
 * PROTOTYPE — #110, take D: wordless. The tile gets an amber ember ring and a
 * small 🔥 dot; the column explains the ring ONCE, in a legend under the
 * header.
 *
 * The bet: the quietest thing that could work — the tile stays art, the sort
 * does the ranking, and the ring only has to make a child ASK. It shares the
 * galaxy's 🔥 on purpose: the promise is different ("not yet" vs "now"), and
 * this take is the one that says the child doesn't need to tell them apart
 * because the action lands in the same place.
 *
 * The risk: that bet is exactly what the ticket warns against — the same mark
 * meaning two different things on two screens.
 */

import type { Card } from "@/lib/types";
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

export const VARIANT_D_NAME = "D — wordless ember ring + one legend per column";

export function VariantDEmber({ pool, mix }: { pool: Card[]; mix: Mix }) {
  const cols = stubColumns(pool, mix);
  return (
    <div className="grid w-full gap-5 md:grid-cols-2">
      {[
        { col: MY_COLUMN, cards: cols.mine },
        { col: THEIR_COLUMN, cards: cols.theirs },
      ].map(({ col, cards }) => (
        <ColumnShell
          key={col.title}
          {...col}
          legend={
            <>
              <span className="mr-1 inline-block rounded-md border-2 border-dashed border-[#f59e0b] px-1">
                🔥
              </span>
              one more of these and {col.receiver} can burn them
            </>
          }
        >
          <TileGrid>
            {cards.map((c) => (
              <BaseTile
                key={c.card.id}
                entry={c}
                badge={
                  c.tier === "new" ? (
                    <NewBadge label={col.newLabel} />
                  ) : c.tier === "one-away" ? (
                    <span className="rounded-full bg-[#f59e0b] px-1 py-0.5 text-[0.6rem] leading-none">
                      🔥
                    </span>
                  ) : undefined
                }
                frameClass={
                  c.tier === "one-away"
                    ? "outline outline-2 outline-dashed outline-offset-[-6px] outline-[#f59e0b]"
                    : ""
                }
              />
            ))}
          </TileGrid>
        </ColumnShell>
      ))}
    </div>
  );
}
