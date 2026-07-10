"use client";

import { useState, useTransition } from "react";
import type { PullOutcome } from "./pull-service";
import { pullAction } from "./actions";
import { PullResultView } from "./PullResultView";

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
      <p data-testid="token-balance" className="text-lg">
        🎟️ {balance} pull{balance === 1 ? "" : "s"} left
      </p>

      {outOfTokens ? (
        <p
          data-testid="out-of-tokens-message"
          className="max-w-xs text-center opacity-80"
        >
          You&apos;re out of pulls! Ask your parent for more. 🎟️
        </p>
      ) : (
        <button
          type="button"
          onClick={doPull}
          disabled={pending}
          data-testid="pull-button"
          className="rounded-full bg-gradient-to-br from-amber-300 to-pink-400 px-10 py-5 text-2xl font-extrabold text-gray-900 shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {pending ? "Opening…" : "✨ Pull a card ✨"}
        </button>
      )}

      {outcome && !outcome.outOfTokens ? (
        <div className="flex flex-col items-center gap-2">
          <PullResultView card={outcome.card} isDuplicate={outcome.isDuplicate} />
        </div>
      ) : null}
    </div>
  );
}
