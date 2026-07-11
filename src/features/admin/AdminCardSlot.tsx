"use client";

import Image from "next/image";
import { useState } from "react";
import type { BinderCard } from "@/lib/types";
import { RARITY_META } from "@/features/card/rarity";
import { CardModal } from "@/features/card/CardModal";
import "@/features/binder/rarity-slot.css";

/**
 * Admin preview card (U5-FR1/FR2): rarity-framed thumbnail with a corner badge,
 * name, and admin-only source link. Clicking the thumbnail expands the card in
 * a modal. Client component (holds modal open state).
 */
export function AdminCardSlot({ entry }: { entry: BinderCard }) {
  const [open, setOpen] = useState(false);
  const meta = RARITY_META[entry.card.rarity];

  return (
    <div data-testid={`admin-card-${entry.card.id}`} className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`admin-card-expand-${entry.card.id}`}
        aria-label={`Expand ${entry.card.name}`}
        className={`rslot rslot--${entry.card.rarity} relative overflow-hidden rounded-xl bg-white/10 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:scale-105`}
      >
        {entry.count > 1 ? (
          <span className="absolute right-1 top-1 z-10 rounded-full bg-black/70 px-1.5 text-xs font-bold">
            x{entry.count}
          </span>
        ) : null}
        <span className="rarity-badge">{meta.label}</span>
        <Image
          src={entry.card.imageUrl}
          alt={entry.card.name}
          width={256}
          height={256}
          loading="lazy"
          className="aspect-square w-full object-cover"
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
