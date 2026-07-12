"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Card as CardType } from "@/lib/types";
import { Card } from "@/features/card/Card";
import { RARITY_LABEL } from "@/features/card/rarity";
import { useSound } from "@/features/sound/useSound";
import { rewardFanfare } from "@/features/sound/sfx";
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
    card: CardType;
    isDuplicate: boolean;
    resultRarity: string;
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
        setResult(res);
        play("setComplete");
        // Inc15 FR2: layer the reward fanfare when the upgrade is epic/legendary.
        const fanfare = rewardFanfare(res.card.rarity);
        if (fanfare) play(fanfare);
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
        <p className="pill pill--gold">✨ Upgrade! {RARITY_LABEL[result.card.rarity]}</p>
        <Card card={result.card} interactive size="lg" />
        {result.isDuplicate ? (
          <span className="pill text-xs">➕ Duplicate — it stacks!</span>
        ) : (
          <span className="pill text-xs">🆕 New card!</span>
        )}
        <Link href="/play/binder" className="btn btn--primary">
          🪐 Back to My Galaxy
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
      {error ? (
        <p data-testid="sacrifice-error" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
