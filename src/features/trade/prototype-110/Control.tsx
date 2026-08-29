"use client";

/** PROTOTYPE — #110. The control: what shipped with #109 — order only, tier 2
 *  unmarked. Everything below has to beat this, or the answer is "nothing". */

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

export const CONTROL_NAME = "Today — order only, tier 2 says nothing";

export function Control({ pool, mix }: { pool: Card[]; mix: Mix }) {
  const cols = stubColumns(pool, mix);
  return (
    <div className="grid w-full gap-5 md:grid-cols-2">
      {[
        { col: MY_COLUMN, cards: cols.mine },
        { col: THEIR_COLUMN, cards: cols.theirs },
      ].map(({ col, cards }) => (
        <ColumnShell key={col.title} {...col} filterLabel={col.filterLabel}>
          <TileGrid>
            {cards.map((c) => (
              <BaseTile
                key={c.card.id}
                entry={c}
                badge={c.tier === "new" ? <NewBadge label={col.newLabel} /> : undefined}
              />
            ))}
          </TileGrid>
        </ColumnShell>
      ))}
    </div>
  );
}
