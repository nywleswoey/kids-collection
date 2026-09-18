"use client";

import { useEffect, useRef } from "react";
import type { Card as CardType } from "@/lib/types";
import { Card } from "./Card";
import { RARITY_META } from "./rarity";

/**
 * Accessible expand dialog for a card (U5-FR1). Shows the full interactive card
 * (art + holo/tilt, name, rarity, fun fact) plus a source link. Closes on ✕,
 * backdrop click, or Esc; manages focus. Admin-only usage (source link shown).
 */
export function CardModal({
  card,
  onClose,
}: {
  card: CardType;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} — ${RARITY_META[card.rarity].label}`}
      data-testid="card-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        data-testid="card-modal-backdrop"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <button
          type="button"
          ref={closeRef}
          onClick={onClose}
          data-testid="card-modal-close"
          className="btn btn--ghost self-end px-3 py-1 text-sm"
        >
          ✕ Close
        </button>

        <Card card={card} interactive size="lg" />

        {card.sourceUrl ? (
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="card-modal-source"
            className="btn btn--ghost text-sm"
          >
            🔗 Source
          </a>
        ) : null}
      </div>
    </div>
  );
}
