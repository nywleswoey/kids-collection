"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PullOutcome } from "./pull-service";
import { pullAction, pullSpecialEggAction, pullRarityPickAction } from "./actions";
import { RevealCard } from "@/features/card/RevealCard";
import { EasterEggPicker } from "./EasterEggPicker";
import { CardRoulette, type FlashCard } from "./CardRoulette";
import { SacrificeHintModal } from "./SacrificeHintModal";
import { hasSeenSacrificeHint, markSacrificeHintSeen } from "./sacrifice-hint";
import { useSound } from "@/features/sound/useSound";
import { CountUp } from "@/features/anim/CountUp";
import { shouldShowAskParent } from "./ticket-display";
import { RARITY_META } from "@/features/card/rarity";
import { RARITIES, zeroRarityCount, type EggTicket, type Rarity } from "@/lib/types";

const ZERO_PICKS: Record<Rarity, number> = zeroRarityCount();

// Special egg tickets share one button shape, differing only in emoji/label (FR4).
const SPECIAL_TICKETS: { kind: EggTicket; emoji: string; label: string }[] = [
  { kind: "epic", emoji: "✨", label: "Epic" },
  { kind: "lucky", emoji: "🍀", label: "Lucky" },
];

export function PullButton({
  childId,
  initialBalance,
  flashPool = [],
  themes = [],
  epicTickets = 0,
  luckyTickets = 0,
  pickTickets = ZERO_PICKS,
}: {
  childId: string;
  initialBalance: number;
  flashPool?: FlashCard[];
  themes?: { id: string; name: string }[];
  epicTickets?: number;
  luckyTickets?: number;
  pickTickets?: Record<Rarity, number>;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [epic, setEpic] = useState(epicTickets);
  const [lucky, setLucky] = useState(luckyTickets);
  const [picks, setPicks] = useState<Record<Rarity, number>>(pickTickets);
  const [outcome, setOutcome] = useState<PullOutcome | null>(null);
  const [cycling, setCycling] = useState(false);
  const [themeId, setThemeId] = useState(""); // "" = Random (default, FR2/FR3)
  const [hintCardId, setHintCardId] = useState<string | null>(null); // Inc13 FR4
  const [pending, startTransition] = useTransition();
  const activeTicket = useRef<EggTicket | null>(null);
  const activePick = useRef<Rarity | null>(null); // Inc16: which rarity-pick is redeeming
  const { play } = useSound();
  const prevBalance = useRef(initialBalance);

  const outOfTokens = balance < 1;
  // FR2 (Inc10): only nag "ask a parent" when the child has nothing to spend at
  // all. If they still hold a special ticket, keep the Discover button visible
  // but greyed so they know a normal ticket is needed for it (B2=B).
  const askParent = shouldShowAskParent(balance, epic, lucky);
  const hasSpecial = epic > 0 || lucky > 0;
  const specialCounts: Record<EggTicket, number> = { epic, lucky };

  // First-duplicate sacrifice hint (Inc13 FR4). Fire once the reveal is on
  // screen (after any roulette) for a normal-pull duplicate the child hasn't
  // been taught about yet.
  useEffect(() => {
    if (cycling) return;
    if (!outcome || outcome.outOfTokens || outcome.easterEgg) return;
    if (!outcome.isDuplicate) return;
    if (hasSeenSacrificeHint(childId)) return;
    markSacrificeHintSeen(childId);
    setHintCardId(outcome.card.id);
  }, [outcome, cycling, childId]);

  // Soft chime as the token counter rolls after a pull.
  useEffect(() => {
    if (balance !== prevBalance.current) {
      prevBalance.current = balance;
      play("tokenChime");
    }
  }, [balance, play]);

  // Shared launch flow for every pull kind (normal, special ticket, rarity pick):
  // sound cues, reset the picker, pin which ticket is redeeming, then dispatch.
  // On success a normal card pull kicks off the slot-machine build-up (Inc7 FR1);
  // any easter-egg outcome plays the picker-appear cue instead (Inc15 FR3).
  function runPull(
    action: () => Promise<PullOutcome>,
    redeeming: { ticket: EggTicket | null; pick: Rarity | null },
  ) {
    play("click");
    play("packOpen");
    setOutcome(null);
    activeTicket.current = redeeming.ticket;
    activePick.current = redeeming.pick;
    startTransition(async () => {
      const res = await action();
      setOutcome(res);
      if (res.outOfTokens) {
        play("denied");
        return;
      }
      setBalance(res.newBalance);
      if (res.easterEgg) play("easterEgg");
      else setCycling(true);
    });
  }

  function doPull() {
    runPull(() => pullAction(themeId || undefined), { ticket: null, pick: null });
  }

  function doSpecialEgg(kind: EggTicket) {
    runPull(() => pullSpecialEggAction(kind), { ticket: kind, pick: null });
  }

  // Inc16 FR2: redeem a rarity-pick ticket → pick-1-of-5 of that rarity.
  function doRarityPick(rarity: Rarity) {
    runPull(() => pullRarityPickAction(rarity), { ticket: null, pick: rarity });
  }

  // On a successful egg claim, decrement the ticket that was spent (FR4/Inc16).
  function onEggClaimed(newBalance: number) {
    setBalance(newBalance);
    if (activeTicket.current === "epic") setEpic((n) => Math.max(0, n - 1));
    else if (activeTicket.current === "lucky") setLucky((n) => Math.max(0, n - 1));
    else if (activePick.current) {
      const r = activePick.current;
      setPicks((p) => ({ ...p, [r]: Math.max(0, p[r] - 1) }));
    }
    activePick.current = null;
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

      {askParent ? (
        <p
          data-testid="out-of-tokens-message"
          className="panel max-w-xs px-6 py-4 text-center text-[color:var(--ink-soft)]"
        >
          You&apos;re out of tickets! Ask your parent for more. 🎟️
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={doPull}
            disabled={pending || outOfTokens}
            data-testid="pull-button"
            className={`btn btn--primary btn--xl press font-extrabold ${
              outOfTokens ? "opacity-50" : ""
            }`}
          >
            {pending ? "Launching…" : "🚀 Discover a card"}
          </button>
          {outOfTokens && hasSpecial ? (
            <span
              data-testid="use-special-hint"
              className="text-sm text-[color:var(--ink-soft)]"
            >
              Out of normal tickets — use a special ticket below! ✨
            </span>
          ) : null}
        </div>
      )}

      {/* Special egg tickets — guaranteed pick-1-of-5 (FR4). */}
      {epic > 0 || lucky > 0 ? (
        <div className="flex flex-wrap justify-center gap-3" data-testid="special-tickets">
          {SPECIAL_TICKETS.filter((t) => specialCounts[t.kind] > 0).map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => doSpecialEgg(t.kind)}
              disabled={pending}
              data-testid={`special-${t.kind}-button`}
              className="btn btn--primary press font-bold"
            >
              {t.emoji} {t.label} Pick ({specialCounts[t.kind]})
            </button>
          ))}
        </div>
      ) : null}

      {/* Rarity-pick tickets (Inc16 FR2) — pick-1-of-5 of that exact rarity. */}
      {RARITIES.some((r) => picks[r] > 0) ? (
        <div className="flex flex-wrap justify-center gap-3" data-testid="pick-tickets">
          {RARITIES.filter((r) => picks[r] > 0).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => doRarityPick(r)}
              disabled={pending}
              data-testid={`pick-${r}-button`}
              className="btn btn--primary press font-bold"
              style={{ borderColor: RARITY_META[r].frame }}
            >
              🎯 {RARITY_META[r].label} Pick ({picks[r]})
            </button>
          ))}
        </div>
      ) : null}

      {outcome && !outcome.outOfTokens && outcome.easterEgg ? (
        <EasterEggPicker
          key={outcome.offer}
          choices={outcome.choices}
          ownedCounts={outcome.ownedCounts}
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

      <SacrificeHintModal
        open={hintCardId !== null}
        cardId={hintCardId ?? ""}
        onClose={() => setHintCardId(null)}
      />
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
