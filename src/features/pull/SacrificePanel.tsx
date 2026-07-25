"use client";

import posthog from "posthog-js";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useSound } from "@/features/sound/useSound";
import { playReward } from "@/features/sound/sfx";
import { ErrorBanner } from "@/features/ui/ErrorBanner";
import { sacrificeAction } from "./actions";

/**
 * Sacrifice-to-upgrade panel (Inc8 FR2). Shown on the card detail page when the
 * child owns ≥3 copies. Burns 3 copies for a random same-or-higher-tier card.
 */
export function SacrificePanel({
  cardId,
  count,
}: {
  cardId: string;
  count: number;
}) {
  const [result, setResult] = useState<{
    newBalance: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { play } = useSound();

  function doSacrifice() {
    play("click");
    setError(null);
    startTransition(async () => {
      try {
        const res = await sacrificeAction(cardId);
        setResult({ newBalance: res.newBalance });
        // Inc19: celebratory set-complete cue + fanfare for the earned egg ticket.
        playReward(play, "epic");
        posthog.capture("card_sacrificed", {
          card_id: cardId,
          easter_egg_balance: res.newBalance,
        });
      } catch {
        setError("Couldn't sacrifice — you need at least 3 copies.");
        play("denied");
      }
    });
  }

  if (result) {
    return (
      <div
        className="panel flex flex-col items-center gap-3 p-5"
        data-testid="sacrifice-result"
      >
        <p className="pill pill--gold text-base">
          🥚 You earned 1 Easter Egg ticket!
        </p>
        <p className="text-center text-sm text-[color:var(--ink-soft)]">
          Redeem it on the Discover screen to open an Easter Egg — pick 1 of 5! ✨
        </p>
        <Link href="/play/pull" className="btn btn--primary" data-testid="sacrifice-go-redeem">
          🚀 Go redeem
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={doSacrifice}
        disabled={pending || count < 3}
        data-testid="sacrifice-button"
        className="btn btn--primary"
      >
        {pending ? "Fusing…" : "✨ Sacrifice 3 → mystery upgrade"}
      </button>
      <p className="text-xs text-[color:var(--ink-mute)]">
        Burns 3 copies for a random card of the same or higher tier.
      </p>
      <ErrorBanner
        testId="sacrifice-error"
        message={error}
        className="text-sm text-red-300"
      />
    </div>
  );
}
