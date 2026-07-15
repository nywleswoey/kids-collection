"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/features/card/Card";
import { RARITY_LABEL } from "@/features/card/rarity";
import { Fireworks } from "@/features/anim/Fireworks";
import { useSound } from "@/features/sound/useSound";
import { rewardFanfare } from "@/features/sound/sfx";
import type { PendingReward } from "./service";
import { markRewardsShownAction } from "./actions";
import "@/features/anim/anim.css";

/**
 * Collection-completion celebration (Inc16 FR5). Shown on the galaxy view when
 * the child has pending rewards. Prominent modal + fireworks + fanfare; steps
 * through multiple rewards, then marks them all shown so it doesn't repeat.
 */
export function CollectionRewardModal({ rewards }: { rewards: PendingReward[] }) {
  const [idx, setIdx] = useState(0);
  const [fire, setFire] = useState(0);
  // Portal to <body> so the overlay escapes the transformed `.page-enter`
  // ancestor (a non-`none` transform becomes the containing block for our
  // `fixed inset-0`, otherwise centering it deep down the tall galaxy page).
  const [mounted, setMounted] = useState(false);
  const { play } = useSound();

  useEffect(() => setMounted(true), []);

  // Mark all shown once (on mount) so a refresh doesn't re-pop; the UI still
  // steps through them client-side.
  useEffect(() => {
    if (rewards.length === 0) return;
    markRewardsShownAction(rewards.map((r) => r.id));
    play("setComplete");
    setFire((n) => n + 1);
    const fanfare = rewardFanfare(rewards[0].rarity);
    if (fanfare) play(fanfare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rewards.length === 0 || idx >= rewards.length || !mounted) return null;
  const r = rewards[idx];

  function next() {
    play("click");
    const n = idx + 1;
    if (n < rewards.length) {
      setFire((k) => k + 1);
      const fanfare = rewardFanfare(rewards[n].rarity);
      if (fanfare) play(fanfare);
    }
    setIdx(n);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="collection-reward-modal"
    >
      <div className="panel flex max-w-sm flex-col items-center gap-4 p-6 text-center">
        <span className="pill pill--gold text-base">🏆 Set complete! 🏆</span>
        <h2 className="text-xl font-bold">
          You collected every {RARITY_LABEL[r.rarity]} {r.themeName}!
        </h2>
        <p className="text-sm text-[color:var(--ink-soft)]">Here&apos;s your bonus card:</p>
        <Card card={r.card} interactive size="lg" />
        <Fireworks fire={fire} />
        <button
          type="button"
          onClick={next}
          data-testid="collection-reward-next"
          className="btn btn--primary press font-bold"
        >
          {idx + 1 < rewards.length ? "Next 🎁" : "Awesome! 🎉"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
