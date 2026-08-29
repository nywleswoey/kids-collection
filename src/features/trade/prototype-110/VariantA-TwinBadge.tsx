"use client";

/**
 * PROTOTYPE — #110, take A: a SECOND badge in the same top-left slot, in a
 * different colour, naming the receiver in words.
 *
 * The bet: a child already reads the green 🎁 pill, so the same slot in amber
 * reads as "a different kind of good". The glyph is shared with the galaxy's
 * 🔥 on purpose — but the words never let it mean "burn it now": it always
 * says "1 more for <receiver>".
 *
 * The risk this take exposes: at tile size the pill wraps to two lines and
 * eats the art, and a column with several of them looks busy.
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

export const VARIANT_A_NAME = "A — twin badge: 🔥 1 more for Ana";

export function VariantATwinBadge({ pool, mix }: { pool: Card[]; mix: Mix }) {
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
                badge={
                  c.tier === "new" ? (
                    <NewBadge label={col.newLabel} />
                  ) : c.tier === "one-away" ? (
                    <span className="rounded-full bg-[#f59e0b] px-1.5 py-0.5 text-[0.6rem] font-black leading-tight text-black">
                      🔥 1 more for {col.receiver}
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
