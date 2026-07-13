"use client";

import { useState, useTransition } from "react";
import {
  grantTokensAction,
  grantSpecialTicketAction,
  grantRarityPickTicketAction,
} from "@/features/pull/actions";
import { RARITY_META } from "@/features/card/rarity";
import { RARITIES, type EggTicket, type Rarity } from "@/lib/types";

const ZERO_PICKS: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };

export function GrantControl({
  childId,
  initialBalance,
  initialEpic = 0,
  initialLucky = 0,
  initialPicks = ZERO_PICKS,
}: {
  childId: string;
  initialBalance: number;
  initialEpic?: number;
  initialLucky?: number;
  initialPicks?: Record<Rarity, number>;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [epic, setEpic] = useState(initialEpic);
  const [lucky, setLucky] = useState(initialLucky);
  const [picks, setPicks] = useState<Record<Rarity, number>>(initialPicks);
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

  function grantPick(rarity: Rarity, n: number) {
    startTransition(async () => {
      const next = await grantRarityPickTicketAction(childId, rarity, n);
      setPicks((p) => ({ ...p, [rarity]: next }));
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

      {/* Rarity-pick tickets (Inc16 FR3). */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {RARITIES.map((r) => (
          <span key={r} className="flex items-center gap-1">
            <span
              data-testid={`pick-${r}-balance-${childId}`}
              className="tabular-nums"
              style={{ color: RARITY_META[r].frame }}
            >
              🎯{RARITY_META[r].label[0]} {picks[r]}
            </span>
            <button
              type="button"
              onClick={() => grantPick(r, 1)}
              disabled={pending}
              data-testid={`grant-pick-${r}-plus1-${childId}`}
              className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25 disabled:opacity-50"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => grantPick(r, -1)}
              disabled={pending || picks[r] < 1}
              data-testid={`grant-pick-${r}-minus1-${childId}`}
              className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20 disabled:opacity-50"
            >
              −1
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
