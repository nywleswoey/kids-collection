"use client";

import type { Card as CardType } from "@/lib/types";
import { CardImage } from "./CardImage";
import { rarityClass, RARITY_LABEL } from "./rarity";
import { useCardTilt } from "./useCardTilt";
import { useReducedMotion } from "@/shared/anim/useReducedMotion";
import "./card.css";

/**
 * Full card display with art, name, rarity badge, and fun fact. Supports tilt
 * and holographic effects when interactive. Shows optional count badge for
 * duplicates. Rarity-styled frame and glow.
 */
export function Card({
  card,
  interactive = false,
  size = "lg",
  count,
}: {
  card: CardType;
  interactive?: boolean;
  size?: "sm" | "lg";
  count?: number;
}) {
  const { ref, onPointerMove, onPointerLeave } = useCardTilt(interactive);
  const dim = size === "lg" ? 320 : 160;
  const reducedMotion = useReducedMotion();
  // Legendary-only manual animation lane (see AGENTS.md). `Card` itself
  // only ever renders the pull reveal, the card detail modal, and the easter
  // egg / reward reveals — never the collection grid (that renders
  // `RarityThumb` instead, in `CardSlot.tsx`) — so no extra "which surface"
  // gate is needed here. `next/image` flattens an animated WebP to its first
  // frame, so the animated element bypasses it entirely with a plain `<img>`.
  const showAnimated = Boolean(card.animatedUrl) && !reducedMotion;

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      data-testid={`card-${card.id}`}
      className={`card ${rarityClass(card.rarity)} ${interactive ? "card--interactive" : ""} bg-white/10`}
      style={{ width: dim }}
    >
      <div className="card__holo" />
      {count && count > 1 ? (
        <span className="badge-count absolute right-2 top-2">x{count}</span>
      ) : null}

      {showAnimated ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/image flattens animated WebP to its first frame
        <img
          src={card.animatedUrl!}
          alt={card.name}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <CardImage src={card.imageUrl} alt={card.name} dim={512} priority={interactive} />
      )}

      <div className="flex flex-col gap-1.5 bg-black/35 p-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="display text-base font-bold">{card.name}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[color:var(--ink-soft)]">
            {RARITY_LABEL[card.rarity]}
          </span>
        </div>
        <p className="text-sm text-[color:var(--ink-soft)]">{card.eduText}</p>
      </div>
    </div>
  );
}
