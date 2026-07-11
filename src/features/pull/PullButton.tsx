"use client";

import { useState, useTransition } from "react";
import type { PullOutcome } from "./pull-service";
import { pullAction } from "./actions";
import { RevealCard } from "@/features/card/RevealCard";

export function PullButton({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [outcome, setOutcome] = useState<PullOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  const outOfTokens = balance < 1;

  function doPull() {
    startTransition(async () => {
      const res = await pullAction();
      setOutcome(res);
      if (!res.outOfTokens) setBalance(res.newBalance);
    });
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p data-testid="token-balance" className="pill pill--gold text-base">
        🎟️ {balance} pull{balance === 1 ? "" : "s"} left
      </p>

      {outOfTokens ? (
        <p
          data-testid="out-of-tokens-message"
          className="panel max-w-xs px-6 py-4 text-center text-[color:var(--ink-soft)]"
        >
          You&apos;re out of pulls! Ask your parent for more. 🎟️
        </p>
      ) : (
        <button
          type="button"
          onClick={doPull}
          disabled={pending}
          data-testid="pull-button"
          className="btn btn--primary btn--xl font-extrabold"
        >
          {pending ? "Opening…" : "✨ Pull a card ✨"}
        </button>
      )}

      {outcome && !outcome.outOfTokens ? (
        <div className="flex flex-col items-center gap-3" data-testid="pull-result">
          <RevealCard key={outcome.card.id + balance} card={outcome.card} />
          {outcome.isDuplicate ? (
            <span data-testid="duplicate-badge" className="pill">
              ➕ Duplicate — nice, it stacks!
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
