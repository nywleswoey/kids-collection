"use client";

import { useState } from "react";
import type { BinderCard } from "@/lib/types";
import { RarityThumb } from "@/features/card/RarityThumb";
import { CardModal } from "@/features/card/CardModal";
import { raritySlotClass } from "@/features/binder/rarity-slot";
import "@/features/binder/rarity-slot.css";

/**
 * Admin preview card (U5-FR1/FR2): rarity-framed thumbnail with a corner badge,
 * name, and admin-only source link. Clicking the thumbnail expands the card in
 * a modal. Client component (holds modal open state).
 */
export function AdminCardSlot({ entry }: { entry: BinderCard }) {
  const [open, setOpen] = useState(false);

  return (
    <div data-testid={`admin-card-${entry.card.id}`} className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`admin-card-expand-${entry.card.id}`}
        aria-label={`Expand ${entry.card.name}`}
        className={raritySlotClass(entry.card.rarity)}
      >
        <RarityThumb
          entry={entry}
          countClassName="absolute right-1 top-1 z-10 rounded-full bg-black/70 px-1.5 text-xs font-bold"
        />
      </button>

      <span className="truncate text-xs font-semibold">{entry.card.name}</span>
      {entry.card.sourceUrl ? (
        <a
          href={entry.card.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`card-source-${entry.card.id}`}
          className="btn btn--ghost truncate text-[0.7rem]"
        >
          🔗 Source
        </a>
      ) : null}

      {open ? <CardModal card={entry.card} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
