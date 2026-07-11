"use client";

import { useEffect, useState } from "react";
import type { Card as CardType } from "@/lib/types";
import { Card } from "./Card";
import { shouldAnimate } from "./rarity";
import { useSound } from "@/features/sound/useSound";
import { Confetti } from "@/features/anim/Confetti";
import { isBigReveal } from "@/features/sound/sfx";
import "./card.css";

/**
 * Pack-open reveal: card back → flip → interactive front (C2).
 * Reduced motion skips the flip and shows the card immediately.
 * Adds a flip whoosh, rarity-scaled reveal sting, and confetti for epic/legendary.
 */
export function RevealCard({ card }: { card: CardType }) {
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const { play } = useSound();

  useEffect(() => {
    const finish = () => {
      setDone(true);
      play("reveal", card.rarity);
      if (isBigReveal(card.rarity)) setBurst((n) => n + 1);
    };

    if (!shouldAnimate()) {
      finish();
      return;
    }
    const t1 = setTimeout(() => {
      setFlipped(true);
      play("flip");
    }, 250);
    const t2 = setTimeout(finish, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  if (done) {
    return (
      <>
        <Card card={card} interactive size="lg" />
        {isBigReveal(card.rarity) ? (
          <Confetti fire={burst} count={card.rarity === "legendary" ? 80 : 55} />
        ) : null}
      </>
    );
  }

  return (
    <div className="reveal" data-testid="reveal-card">
      <div className={`reveal__inner relative ${flipped ? "reveal--flipped" : ""}`}>
        <div className="reveal__back flex h-80 w-72 items-center justify-center rounded-2xl border-[3px] border-white/25 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.25),transparent_55%),linear-gradient(135deg,var(--brand-3),var(--brand-2)_70%,var(--brand-1))] text-6xl shadow-[var(--shadow-glow)]">
          <span className="float">🎴</span>
        </div>
        <div className="reveal__front absolute inset-0">
          <Card card={card} size="lg" />
        </div>
      </div>
    </div>
  );
}
