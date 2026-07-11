"use client";

import { useState } from "react";
import type { Card, Rarity } from "@/lib/types";
import { RARITIES } from "@/lib/types";
import { useSound } from "@/features/sound/useSound";
import type { SfxName } from "@/features/sound/sfx";
import { Confetti } from "@/features/anim/Confetti";
import { Asteroids } from "@/features/anim/Asteroids";
import { RevealCard } from "@/features/card/RevealCard";
import "@/features/anim/anim.css";

const SFX: SfxName[] = [
  "click",
  "packOpen",
  "flip",
  "reveal",
  "tokenChime",
  "denied",
  "slotFill",
  "setComplete",
];

/**
 * Admin-only panel to fire every effect on demand (U4-FR3). Must render inside
 * a SoundProvider. `sampleCard` is a real pool card used for the reveal demo
 * (its rarity is overridden per button).
 */
export function EffectTriggerPanel({ sampleCard }: { sampleCard: Card | null }) {
  const { play, bgmEnabled, toggleBgm } = useSound();
  const [confetti, setConfetti] = useState(0);
  const [asteroid, setAsteroid] = useState(0);
  const [reveal, setReveal] = useState<{ card: Card; key: number } | null>(null);
  const [revealN, setRevealN] = useState(0);

  function doReveal(rarity: Rarity) {
    if (!sampleCard) return;
    const n = revealN + 1;
    setRevealN(n);
    setReveal({ card: { ...sampleCard, rarity }, key: n });
  }

  return (
    <section
      data-testid="effect-panel"
      className="panel flex flex-col gap-4 p-5"
    >
      <h2 className="text-xl font-bold">🎬 Effect triggers</h2>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-[color:var(--ink-soft)]">Card reveal (by rarity)</span>
        <div className="flex flex-wrap gap-2">
          {RARITIES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => doReveal(r)}
              disabled={!sampleCard}
              data-testid={`trigger-reveal-${r}`}
              className="btn btn--ghost text-sm capitalize"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-[color:var(--ink-soft)]">Big moments</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfetti((n) => n + 1)}
            data-testid="trigger-confetti"
            className="btn btn--ghost text-sm"
          >
            🎉 Confetti
          </button>
          <button
            type="button"
            onClick={() => {
              play("setComplete");
              setConfetti((n) => n + 1);
            }}
            data-testid="trigger-set-complete"
            className="btn btn--ghost text-sm"
          >
            ✅ Set complete
          </button>
          <button
            type="button"
            onClick={() => setAsteroid((n) => n + 1)}
            data-testid="trigger-asteroid"
            className="btn btn--ghost text-sm"
          >
            ☄️ Asteroid
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-[color:var(--ink-soft)]">Sound effects</span>
        <div className="flex flex-wrap gap-2">
          {SFX.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => play(name)}
              data-testid={`trigger-sfx-${name}`}
              className="btn btn--ghost text-sm"
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={toggleBgm}
            data-testid="trigger-bgm"
            className="btn btn--ghost text-sm"
          >
            {bgmEnabled ? "🎵 BGM: on" : "🎵 BGM: off"}
          </button>
        </div>
      </div>

      {reveal ? (
        <div className="flex justify-center pt-2" data-testid="effect-reveal">
          <RevealCard key={reveal.key} card={reveal.card} />
        </div>
      ) : null}

      <Confetti fire={confetti} count={70} />
      <Asteroids trigger={asteroid} />
    </section>
  );
}
