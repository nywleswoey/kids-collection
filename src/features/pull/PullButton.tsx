"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PullOutcome } from "./pull-service";
import { pullAction } from "./actions";
import { RevealCard } from "@/features/card/RevealCard";
import { EasterEggPicker } from "./EasterEggPicker";
import { CardRoulette, type FlashCard } from "./CardRoulette";
import { useSound } from "@/features/sound/useSound";
import { CountUp } from "@/features/anim/CountUp";

export function PullButton({
  initialBalance,
  flashPool = [],
}: {
  initialBalance: number;
  flashPool?: FlashCard[];
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [outcome, setOutcome] = useState<PullOutcome | null>(null);
  const [cycling, setCycling] = useState(false);
  const [pending, startTransition] = useTransition();
  const { play } = useSound();
  const prevBalance = useRef(initialBalance);

  const outOfTokens = balance < 1;

  // Soft chime as the token counter rolls after a pull.
  useEffect(() => {
    if (balance !== prevBalance.current) {
      prevBalance.current = balance;
      play("tokenChime");
    }
  }, [balance, play]);

  function doPull() {
    play("click");
    play("packOpen");
    setOutcome(null);
    startTransition(async () => {
      const res = await pullAction();
      setOutcome(res);
      if (res.outOfTokens) {
        play("denied");
      } else {
        // Egg refunds the token (re-spent on claim); balance reflects that.
        setBalance(res.newBalance);
        if (res.easterEgg) {
          play("setComplete");
        } else {
          // Normal pull: run the slot-machine build-up before the reveal (FR1).
          setCycling(true);
        }
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p data-testid="token-balance" className="pill pill--gold text-base">
        🎟️ <CountUp value={balance} className="count-pulse" /> ticket{balance === 1 ? "" : "s"} left
      </p>

      {outOfTokens ? (
        <p
          data-testid="out-of-tokens-message"
          className="panel max-w-xs px-6 py-4 text-center text-[color:var(--ink-soft)]"
        >
          You&apos;re out of tickets! Ask your parent for more. 🎟️
        </p>
      ) : (
        <button
          type="button"
          onClick={doPull}
          disabled={pending}
          data-testid="pull-button"
          className="btn btn--primary btn--xl press font-extrabold"
        >
          {pending ? "Launching…" : "🚀 Discover a card"}
        </button>
      )}

      {outcome && !outcome.outOfTokens && outcome.easterEgg ? (
        <EasterEggPicker
          key={outcome.offer}
          choices={outcome.choices}
          offer={outcome.offer}
          onDone={(r) => setBalance(r.newBalance)}
        />
      ) : outcome && !outcome.outOfTokens && !outcome.easterEgg ? (
        cycling ? (
          <CardRoulette
            key={outcome.card.id + "-roulette"}
            finalCard={outcome.card}
            pool={flashPool}
            onDone={() => setCycling(false)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3" data-testid="pull-result">
            <RevealCard key={outcome.card.id + balance} card={outcome.card} />
            {outcome.isDuplicate ? (
              <span data-testid="duplicate-badge" className="pill">
                ➕ Duplicate — nice, it stacks!
              </span>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
