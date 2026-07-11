"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Card, Rarity } from "@/lib/types";
import { shouldAnimate } from "@/features/card/rarity";
import { rarityClass } from "@/features/card/rarity";
import { useSound } from "@/features/sound/useSound";

export type FlashCard = { id: string; imageUrl: string; rarity: Rarity };

/**
 * Pre-reveal slot-machine (INCREMENT 7 FR1). Rapidly flashes real card fronts
 * from the pool, decelerating over ~2.5s, then lands on `finalCard` and calls
 * `onDone`. Reduced-motion skips straight to `onDone`.
 */
export function CardRoulette({
  finalCard,
  pool,
  onDone,
}: {
  finalCard: Card;
  pool: FlashCard[];
  onDone: () => void;
}) {
  const final: FlashCard = {
    id: finalCard.id,
    imageUrl: finalCard.imageUrl,
    rarity: finalCard.rarity,
  };
  const flashPool = pool.length > 0 ? pool : [final];
  const [shown, setShown] = useState<FlashCard>(flashPool[0]);
  const { play } = useSound();
  const idx = useRef(0);

  useEffect(() => {
    if (!shouldAnimate()) {
      onDone();
      return;
    }

    // Ease-out schedule: many fast frames up front, decelerating to the finale.
    const DURATION = 2500;
    const delays: number[] = [];
    let t = 0;
    let d = 55;
    while (t < DURATION) {
      delays.push(d);
      t += d;
      d = Math.min(300, d * 1.14); // grow the gap → visual deceleration
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    delays.forEach((delay, i) => {
      elapsed += delay;
      const timer = setTimeout(() => {
        if (cancelled) return;
        const isLast = i === delays.length - 1;
        if (isLast) {
          setShown(final);
          play("flip");
          onDone();
        } else {
          idx.current = (idx.current + 1) % flashPool.length;
          setShown(flashPool[idx.current]);
          play("click");
        }
      }, elapsed);
      timers.push(timer);
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalCard.id]);

  return (
    <div
      className={`card ${rarityClass(shown.rarity)} h-80 w-72 overflow-hidden bg-white/10`}
      data-testid="card-roulette"
      aria-hidden
    >
      <div className="card__holo" />
      <Image
        src={shown.imageUrl}
        alt=""
        width={512}
        height={512}
        className="aspect-square w-full object-cover"
        priority
      />
    </div>
  );
}
