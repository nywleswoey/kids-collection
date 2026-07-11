"use client";

import Image from "next/image";
import { useState } from "react";
import type { Card as CardType } from "@/lib/types";
import { Card } from "@/features/card/Card";
import { RARITY_META, shouldAnimate } from "@/features/card/rarity";
import { Fireworks } from "@/features/anim/Fireworks";
import { claimEasterEggAction } from "./actions";
import type { PullOutcome } from "./pull-service";
import "@/features/anim/anim.css";

type Phase = "choosing" | "spinning" | "revealed";

/**
 * Rare pick-1-of-5 easter egg (U6-FR2/FR3/FR4). Kid picks a card; the server
 * claim decides/records it; a decelerating roulette builds suspense and lands
 * on the pick, then fireworks + the revealed card. Reduced motion skips straight
 * to the reveal. Uses the static Card (no confetti — fireworks only).
 */
export function EasterEggPicker({
  choices,
  offer,
  onDone,
}: {
  choices: CardType[];
  offer: string;
  onDone: (result: Extract<PullOutcome, { outOfTokens: false }>) => void;
}) {
  const [phase, setPhase] = useState<Phase>("choosing");
  const [active, setActive] = useState(-1);
  const [won, setWon] = useState<CardType | null>(null);
  const [fire, setFire] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pick(index: number) {
    if (phase !== "choosing") return;
    setPhase("spinning");

    let result: PullOutcome;
    try {
      result = await claimEasterEggAction(offer, choices[index].id);
    } catch {
      setError("That prize expired — discover again for another chance!");
      return;
    }
    if (result.outOfTokens || !("card" in result)) {
      setError("Out of tickets to claim this prize.");
      return;
    }

    const finish = () => {
      setActive(index);
      setWon(result.card);
      setFire((n) => n + 1);
      setPhase("revealed");
      onDone(result);
    };

    if (!shouldAnimate()) {
      finish();
      return;
    }

    // Decelerating roulette: ~24 steps from 70ms → ~340ms (~2.7s total).
    const steps = 24;
    let i = 0;
    const tick = () => {
      setActive(i % choices.length);
      i++;
      if (i <= steps) {
        const delay = 70 + (i / steps) * 270;
        setTimeout(tick, delay);
      } else {
        finish();
      }
    };
    tick();
  }

  if (phase === "revealed" && won) {
    return (
      <div className="flex flex-col items-center gap-3" data-testid="easter-egg-won">
        <span className="pill pill--gold text-base">🎆 Jackpot! 🎆</span>
        <Card card={won} interactive size="lg" />
        <Fireworks fire={fire} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5" data-testid="easter-egg-picker">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="pill pill--gold text-base">✨ Lucky Star! ✨</span>
        <p className="display text-lg">
          {phase === "spinning" ? "Spinning…" : "Pick one special card!"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {choices.map((c, i) => {
          const meta = RARITY_META[c.rarity];
          return (
            <button
              key={c.id}
              type="button"
              disabled={phase !== "choosing"}
              onClick={() => pick(i)}
              data-testid={`easter-egg-choice-${i}`}
              className={`roulette-item ${active === i ? "roulette-item--active" : ""} relative overflow-hidden rounded-xl border-2 bg-white/10 disabled:cursor-default`}
              style={{ borderColor: meta.frame }}
            >
              <span className="rarity-badge">{meta.label}</span>
              <Image
                src={c.imageUrl}
                alt={c.name}
                width={200}
                height={200}
                className="aspect-square w-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {error ? (
        <p data-testid="easter-egg-error" className="panel px-5 py-3 text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
