"use client";

import { useState, useTransition } from "react";
import { grantTokensAction } from "@/features/pull/actions";

export function GrantControl({
  childId,
  initialBalance,
}: {
  childId: string;
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState(1);
  const [pending, startTransition] = useTransition();

  function grant(n: number) {
    if (!Number.isFinite(n) || n === 0) return;
    startTransition(async () => {
      const newBalance = await grantTokensAction(childId, n);
      setBalance(newBalance);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span data-testid={`balance-${childId}`} className="tabular-nums">
        🎟️ {balance}
      </span>
      <button
        type="button"
        onClick={() => grant(1)}
        disabled={pending}
        data-testid={`grant-plus1-${childId}`}
        className="rounded bg-white/15 px-2 py-1 text-sm hover:bg-white/25 disabled:opacity-50"
      >
        +1
      </button>
      <button
        type="button"
        onClick={() => grant(5)}
        disabled={pending}
        data-testid={`grant-plus5-${childId}`}
        className="rounded bg-white/15 px-2 py-1 text-sm hover:bg-white/25 disabled:opacity-50"
      >
        +5
      </button>
      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Math.max(1, Math.trunc(Number(e.target.value))))}
        data-testid={`grant-input-${childId}`}
        className="w-16 rounded bg-white/10 px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={() => grant(amount)}
        disabled={pending}
        data-testid={`grant-submit-${childId}`}
        className="rounded bg-emerald-500/30 px-2 py-1 text-sm hover:bg-emerald-500/40 disabled:opacity-50"
      >
        Grant
      </button>
    </div>
  );
}
