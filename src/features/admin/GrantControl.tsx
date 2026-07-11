"use client";

import { useState, useTransition } from "react";
import {
  grantTokensAction,
  grantSpecialTicketAction,
} from "@/features/pull/actions";
import type { EggTicket } from "@/lib/types";

export function GrantControl({
  childId,
  initialBalance,
  initialEpic = 0,
  initialLucky = 0,
}: {
  childId: string;
  initialBalance: number;
  initialEpic?: number;
  initialLucky?: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [epic, setEpic] = useState(initialEpic);
  const [lucky, setLucky] = useState(initialLucky);
  const [amount, setAmount] = useState(1);
  const [pending, startTransition] = useTransition();

  function grant(n: number) {
    if (!Number.isFinite(n) || n === 0) return;
    startTransition(async () => {
      const newBalance = await grantTokensAction(childId, n);
      setBalance(newBalance);
    });
  }

  function grantTicket(kind: EggTicket, n: number) {
    startTransition(async () => {
      const next = await grantSpecialTicketAction(childId, kind, n);
      if (kind === "epic") setEpic(next);
      else setLucky(next);
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

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1">
          <span data-testid={`epic-balance-${childId}`} className="tabular-nums">
            ✨ {epic}
          </span>
          <button
            type="button"
            onClick={() => grantTicket("epic", 1)}
            disabled={pending}
            data-testid={`grant-epic-plus1-${childId}`}
            className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25 disabled:opacity-50"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => grantTicket("epic", -1)}
            disabled={pending || epic < 1}
            data-testid={`grant-epic-minus1-${childId}`}
            className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20 disabled:opacity-50"
          >
            −1
          </button>
        </span>
        <span className="flex items-center gap-1">
          <span data-testid={`lucky-balance-${childId}`} className="tabular-nums">
            🍀 {lucky}
          </span>
          <button
            type="button"
            onClick={() => grantTicket("lucky", 1)}
            disabled={pending}
            data-testid={`grant-lucky-plus1-${childId}`}
            className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25 disabled:opacity-50"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => grantTicket("lucky", -1)}
            disabled={pending || lucky < 1}
            data-testid={`grant-lucky-minus1-${childId}`}
            className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20 disabled:opacity-50"
          >
            −1
          </button>
        </span>
      </div>
    </div>
  );
}
