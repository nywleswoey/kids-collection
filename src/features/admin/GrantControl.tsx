"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  grantTokensAction,
  grantEasterEggTicketAction,
} from "@/features/pull/actions";

/** A counter display with +1 / −1 grant buttons; −1 is disabled at zero. */
function Stepper({
  id,
  childId,
  count,
  pending,
  label,
  onInc,
  onDec,
}: {
  id: string;
  childId: string;
  count: number;
  pending: boolean;
  label: ReactNode;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <span className="flex items-center gap-1">
      <span data-testid={`${id}-balance-${childId}`} className="tabular-nums">
        {label}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={pending}
        data-testid={`grant-${id}-plus1-${childId}`}
        className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25 disabled:opacity-50"
      >
        +1
      </button>
      <button
        type="button"
        onClick={onDec}
        disabled={pending || count < 1}
        data-testid={`grant-${id}-minus1-${childId}`}
        className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20 disabled:opacity-50"
      >
        −1
      </button>
    </span>
  );
}

export function GrantControl({
  childId,
  initialBalance,
  initialEasterEgg = 0,
}: {
  childId: string;
  initialBalance: number;
  initialEasterEgg?: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [easterEgg, setEasterEgg] = useState(initialEasterEgg);
  const [amount, setAmount] = useState(1);
  const [pending, startTransition] = useTransition();

  function grant(n: number) {
    if (!Number.isFinite(n) || n === 0) return;
    startTransition(async () => {
      const newBalance = await grantTokensAction(childId, n);
      setBalance(newBalance);
    });
  }

  function grantEgg(n: number) {
    startTransition(async () => {
      const next = await grantEasterEggTicketAction(childId, n);
      setEasterEgg(next);
    });
  }

  return (
    <div className="flex flex-col gap-2">
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

      {/* Unified Easter Egg ticket (Inc19 FR6): one +1/−1 stepper. */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Stepper
          id="egg"
          childId={childId}
          count={easterEgg}
          pending={pending}
          label={<>🥚 {easterEgg}</>}
          onInc={() => grantEgg(1)}
          onDec={() => grantEgg(-1)}
        />
      </div>
    </div>
  );
}
