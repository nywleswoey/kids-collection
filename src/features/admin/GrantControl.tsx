"use client";

import { useState, useTransition, type CSSProperties, type ReactNode } from "react";
import {
  grantTokensAction,
  grantSpecialTicketAction,
  grantRarityPickTicketAction,
} from "@/features/pull/actions";
import { RARITY_META } from "@/features/card/rarity";
import { RARITIES, zeroRarityCount, type EggTicket, type Rarity } from "@/lib/types";

const ZERO_PICKS: Record<Rarity, number> = zeroRarityCount();

/** A counter display with +1 / −1 grant buttons; −1 is disabled at zero. */
function Stepper({
  id,
  childId,
  count,
  pending,
  label,
  style,
  onInc,
  onDec,
}: {
  id: string;
  childId: string;
  count: number;
  pending: boolean;
  label: ReactNode;
  style?: CSSProperties;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <span className="flex items-center gap-1">
      <span data-testid={`${id}-balance-${childId}`} className="tabular-nums" style={style}>
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
        <Stepper
          id="epic"
          childId={childId}
          count={epic}
          pending={pending}
          label={<>✨ {epic}</>}
          onInc={() => grantTicket("epic", 1)}
          onDec={() => grantTicket("epic", -1)}
        />
        <Stepper
          id="lucky"
          childId={childId}
          count={lucky}
          pending={pending}
          label={<>🍀 {lucky}</>}
          onInc={() => grantTicket("lucky", 1)}
          onDec={() => grantTicket("lucky", -1)}
        />
      </div>

      {/* Rarity-pick tickets (Inc16 FR3). */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {RARITIES.map((r) => (
          <Stepper
            key={r}
            id={`pick-${r}`}
            childId={childId}
            count={picks[r]}
            pending={pending}
            style={{ color: RARITY_META[r].frame }}
            label={
              <>
                🎯{RARITY_META[r].label[0]} {picks[r]}
              </>
            }
            onInc={() => grantPick(r, 1)}
            onDec={() => grantPick(r, -1)}
          />
        ))}
      </div>
    </div>
  );
}
