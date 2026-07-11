"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PullOutcome } from "./pull-service";
import { pullAction, pullSpecialEggAction } from "./actions";
import { RevealCard } from "@/features/card/RevealCard";
import { EasterEggPicker } from "./EasterEggPicker";
import { CardRoulette, type FlashCard } from "./CardRoulette";
import { useSound } from "@/features/sound/useSound";
import { CountUp } from "@/features/anim/CountUp";
import type { EggTicket } from "@/lib/types";

export function PullButton({
  initialBalance,
  flashPool = [],
  themes = [],
  epicTickets = 0,
  luckyTickets = 0,
}: {
  initialBalance: number;
  flashPool?: FlashCard[];
  themes?: { id: string; name: string }[];
  epicTickets?: number;
  luckyTickets?: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [epic, setEpic] = useState(epicTickets);
  const [lucky, setLucky] = useState(luckyTickets);
  const [outcome, setOutcome] = useState<PullOutcome | null>(null);
  const [cycling, setCycling] = useState(false);
  const [themeId, setThemeId] = useState(""); // "" = Random (default, FR2/FR3)
  const [pending, startTransition] = useTransition();
  const activeTicket = useRef<EggTicket | null>(null);
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
    activeTicket.current = null;
    startTransition(async () => {
      const res = await pullAction(themeId || undefined);
      setOutcome(res);
      if (res.outOfTokens) {
        play("denied");
      } else {
        setBalance(res.newBalance);
        if (res.easterEgg) {
          play("setComplete");
        } else {
          // Normal pull: slot-machine build-up before the reveal (Inc7 FR1).
          setCycling(true);
        }
      }
    });
  }

  function doSpecialEgg(kind: EggTicket) {
    play("click");
    play("packOpen");
    setOutcome(null);
    activeTicket.current = kind;
    startTransition(async () => {
      const res = await pullSpecialEggAction(kind);
      setOutcome(res);
      if (res.outOfTokens) {
        play("denied");
      } else {
        setBalance(res.newBalance);
        play("setComplete");
      }
    });
  }

  // On a successful egg claim, decrement the ticket that was spent (FR4).
  function onEggClaimed(newBalance: number) {
    setBalance(newBalance);
    if (activeTicket.current === "epic") setEpic((n) => Math.max(0, n - 1));
    else if (activeTicket.current === "lucky") setLucky((n) => Math.max(0, n - 1));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p data-testid="token-balance" className="pill pill--gold text-base">
        🎟️ <CountUp value={balance} className="count-pulse" /> ticket{balance === 1 ? "" : "s"} left
      </p>

      {/* Category chips — prominent + persistent, stay visible on the result (FR2/FR3). */}
      {themes.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-[color:var(--ink-soft)]">Pick a galaxy</span>
          <div className="flex flex-wrap justify-center gap-2" data-testid="category-chips">
            <CategoryChip
              label="🎲 Random"
              active={themeId === ""}
              onClick={() => setThemeId("")}
              disabled={pending}
              testid="category-chip-random"
            />
            {themes.map((t) => (
              <CategoryChip
                key={t.id}
                label={t.name}
                active={themeId === t.id}
                onClick={() => setThemeId(t.id)}
                disabled={pending}
                testid={`category-chip-${t.id}`}
              />
            ))}
          </div>
        </div>
      ) : null}

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

      {/* Special egg tickets — guaranteed pick-1-of-5 (FR4). */}
      {epic > 0 || lucky > 0 ? (
        <div className="flex flex-wrap justify-center gap-3" data-testid="special-tickets">
          {epic > 0 ? (
            <button
              type="button"
              onClick={() => doSpecialEgg("epic")}
              disabled={pending}
              data-testid="special-epic-button"
              className="btn btn--primary press font-bold"
            >
              ✨ Epic Pick ({epic})
            </button>
          ) : null}
          {lucky > 0 ? (
            <button
              type="button"
              onClick={() => doSpecialEgg("lucky")}
              disabled={pending}
              data-testid="special-lucky-button"
              className="btn btn--primary press font-bold"
            >
              🍀 Lucky Pick ({lucky})
            </button>
          ) : null}
        </div>
      ) : null}

      {outcome && !outcome.outOfTokens && outcome.easterEgg ? (
        <EasterEggPicker
          key={outcome.offer}
          choices={outcome.choices}
          offer={outcome.offer}
          onDone={(r) => onEggClaimed(r.newBalance)}
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

function CategoryChip({
  label,
  active,
  onClick,
  disabled,
  testid,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-testid={testid}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
        active
          ? "bg-[color:var(--brand-1)] text-black ring-2 ring-[color:var(--brand-1)]"
          : "bg-white/10 text-[color:var(--ink)] hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}
