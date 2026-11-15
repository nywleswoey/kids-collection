"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Card as CardType } from "@/lib/types";
import { RevealCard } from "@/shared/card/RevealCard";
import { CardImage } from "@/shared/card/CardImage";
import { CardModal } from "@/shared/card/CardModal";
import { RARITY_LABEL, shouldAnimate } from "@/shared/card/rarity";
import { raritySlotClass } from "@/shared/card/rarity-slot";
import { cardHref, BURN } from "@/features/binder/binder-place";
import "@/shared/card/rarity-slot.css";

export type PackSlot = { card: CardType; isDuplicate: boolean };

/** How long a settled reveal sits before auto-advancing to the next slot —
 *  long enough to actually see the card (RevealCard's own flip takes ~1s),
 *  short enough that a child who never taps still gets through a 10-pack. */
const AUTO_ADVANCE_MS = 2200;

/**
 * Mass-draw pack reveal (#kcmassdraw, plan §2.5): one-at-a-time flip-through
 * reusing RevealCard verbatim per slot — advanced by a tap on the card OR
 * (if neither taps) an auto-advance beat — with a persistent "Reveal all"
 * skip straight to a grid summary. Reduced motion skips the flip-through
 * entirely and renders the grid immediately, same contract as RevealCard's
 * own `shouldAnimate()` check.
 */
export function PackReveal({ cards }: { cards: PackSlot[] }) {
  const [index, setIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(() => !shouldAnimate());
  const [inspecting, setInspecting] = useState<CardType | null>(null);

  useEffect(() => {
    if (showGrid) return;
    const t = setTimeout(() => {
      if (index + 1 < cards.length) setIndex((i) => i + 1);
      else setShowGrid(true);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, showGrid, cards.length]);

  function advance() {
    if (index + 1 < cards.length) setIndex((i) => i + 1);
    else setShowGrid(true);
  }

  if (showGrid) {
    const tally = new Map<string, number>();
    for (const { card } of cards) tally.set(card.rarity, (tally.get(card.rarity) ?? 0) + 1);
    const firstDuplicate = cards.find((c) => c.isDuplicate);

    return (
      <div className="flex flex-col items-center gap-3" data-testid="pack-grid">
        <span className="pill pill--gold">📦 {cards.length}-pack results</span>
        <div className="grid grid-cols-5 gap-2">
          {cards.map(({ card, isDuplicate }, i) => (
            <button
              key={`${card.id}-${i}`}
              type="button"
              onClick={() => setInspecting(card)}
              data-testid={`pack-grid-card-${i}`}
              className={`relative block ${raritySlotClass(card.rarity)}`}
            >
              {isDuplicate ? (
                <span
                  aria-label="Duplicate"
                  className="badge-count absolute right-1 top-1"
                >
                  ➕
                </span>
              ) : null}
              <CardImage
                src={card.imageUrl}
                alt={card.name}
                dim={96}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-[color:var(--ink-soft)]" data-testid="pack-tally">
          {[...tally.entries()].map(([rarity, n]) => (
            <span key={rarity}>
              {n} {RARITY_LABEL[rarity as CardType["rarity"]]}
            </span>
          ))}
        </div>
        {firstDuplicate ? (
          <Link
            href={cardHref(firstDuplicate.card.id, BURN)}
            data-testid="pack-sacrifice-link"
            className="btn btn--ghost text-sm"
          >
            ➕ Duplicates → Sacrifice
          </Link>
        ) : null}
        {inspecting ? <CardModal card={inspecting} onClose={() => setInspecting(null)} /> : null}
      </div>
    );
  }

  const slot = cards[index];
  return (
    <div className="flex flex-col items-center gap-3" data-testid="pack-reveal">
      <span className="pill pill--gold">
        Card {index + 1} of {cards.length}
      </span>
      <button
        type="button"
        onClick={advance}
        data-testid="pack-reveal-slot"
        className="press"
        aria-label="Tap to continue"
      >
        <RevealCard key={slot.card.id + index} card={slot.card} />
      </button>
      {slot.isDuplicate ? (
        <span data-testid="pack-slot-duplicate-badge" className="pill">
          ➕ Duplicate — nice, it stacks!
        </span>
      ) : null}
      <div className="flex justify-center gap-1.5" aria-hidden>
        {cards.map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < index ? "bg-[color:var(--brand-2)]" : i === index ? "bg-[color:var(--brand-1)]" : "bg-white/15"
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowGrid(true)}
        data-testid="reveal-all-button"
        className="btn btn--ghost btn--sm"
      >
        Reveal all ▶▶
      </button>
    </div>
  );
}
