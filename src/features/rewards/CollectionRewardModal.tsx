"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/shared/card/Card";
import { RARITY_LABEL } from "@/shared/card/rarity";
import { Fireworks } from "@/shared/anim/Fireworks";
import { useSound } from "@/shared/sound/useSound";
import { CenteredModal } from "@/shared/ui/CenteredModal";
import { playFanfare, playReward } from "@/shared/sound/sfx";
import type { PendingReward } from "./service";
import { recoverIfStale } from "@/shared/stale-deploy/recovery";
import { markRewardsShownAction } from "./actions";
import "@/shared/anim/anim.css";

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
    markRewardsShownAction(rewards.map((r) => r.id)).catch((e) => {
      // Fire-and-forget: a page from before a deploy reloads (and re-pops the
      // rewards, since they were never marked shown); anything else stays the
      // unhandled rejection it always was, so it is still reported.
      if (!recoverIfStale(e)) throw e;
    });
    setFire((n) => n + 1);
    playReward(play, rewards[0].rarity);
    posthog.capture("collection_reward_shown", {
      reward_count: rewards.length,
      rarity: rewards[0].rarity,
      theme_name: rewards[0].themeName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rewards.length === 0 || idx >= rewards.length || !mounted) return null;
  const r = rewards[idx];

  function next() {
    play("click");
    const n = idx + 1;
    if (n < rewards.length) {
      setFire((k) => k + 1);
      playFanfare(play, rewards[n].rarity);
    }
    setIdx(n);
  }

  return createPortal(
    <CenteredModal testId="collection-reward-modal">
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
    </CenteredModal>,
    document.body,
  );
}
