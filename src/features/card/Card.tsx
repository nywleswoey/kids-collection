"use client";

import Image from "next/image";
import type { Card as CardType } from "@/lib/types";
import { rarityClass, RARITY_LABEL } from "./rarity";
import { useCardTilt } from "./useCardTilt";
import "./card.css";

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
        <span className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold">
          x{count}
        </span>
      ) : null}

      <Image
        src={card.imageUrl}
        alt={card.name}
        width={512}
        height={512}
        className="aspect-square w-full object-cover"
        priority={interactive}
      />

      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold">{card.name}</span>
          <span className="text-xs uppercase opacity-80">
            {RARITY_LABEL[card.rarity]}
          </span>
        </div>
        <p className="text-sm opacity-85">{card.eduText}</p>
      </div>
    </div>
  );
}
