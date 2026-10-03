"use client";

import posthog from "posthog-js";
import { useEffect, useRef, useState, useTransition } from "react";
import type { PullOutcome, PullRefundedOutcome, PullStillInProgressOutcome } from "./pull-service";
import { pullAction, pullEasterEggAction } from "./actions";
import { clearPendingRequestId, getOrCreateRequestId, reloadStuckPull } from "./pending-request";
import { RevealCard } from "@/shared/card/RevealCard";
import { EasterEggPicker } from "./EasterEggPicker";
import { CardRoulette, type FlashCard } from "./CardRoulette";
import { SacrificeHintModal } from "./SacrificeHintModal";
import { hasSeenSacrificeHint, markSacrificeHintSeen } from "./sacrifice-hint";
import { useSound } from "@/shared/sound/useSound";
import { CountUp } from "@/shared/anim/CountUp";
import { preloadCardImage } from "@/shared/card/preload-image";
import { FLASH_DIM, boundedFlashPool } from "./roulette-schedule";

/** How long a pull may sit "Launching…" before the UI admits something might
 *  be wrong (#kcpi) — a genuinely stuck fetch/response never resolves on its
 *  own, so only a client-side timeout can offer a way out. Shorter than the
 *  server's CLAIM_STALE_MS (pull-service.ts) so the child/parent sees this
 *  message before a retry could possibly recover the original attempt. */
const STUCK_TIMEOUT_MS = 8000;

/**
 * Main pull/gacha button component. Manages pull token balance, card reveal flow,
 * Easter egg picker, roulette animation, and sacrifice hint modal. Handles both
 * regular pulls and Easter egg redemptions.
 */
export function PullButton({
  childId,
  initialBalance,
  flashPool = [],
  themes = [],
  easterEggTickets = 0,
}: {
  childId: string;
  initialBalance: number;
  flashPool?: FlashCard[];
  themes?: { id: string; name: string }[];
  easterEggTickets?: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [eggs, setEggs] = useState(easterEggTickets);
  // `stillInProgress`/`refunded` are never actually stored here — `runPull`
  // returns before calling `setOutcome` for those (#kcpi) — so excluding them up front keeps
  // every downstream `outcome.card`/`.easterEgg` access narrowed without extra
  // guards scattered through this component.
  const [outcome, setOutcome] = useState<Exclude<PullOutcome, PullStillInProgressOutcome | PullRefundedOutcome> | null>(null);
  const [cycling, setCycling] = useState(false);
  const [themeId, setThemeId] = useState(""); // "" = Random (default, FR2/FR3)
  const [hintCardId, setHintCardId] = useState<string | null>(null); // Inc13 FR4
  const [stuck, setStuck] = useState(false); // #kcpi: stuck-loading timeout fired
  const [refundedNotice, setRefundedNotice] = useState(false); // #kcpi: swept claim replayed
  const [pending, startTransition] = useTransition();
  const { play } = useSound();
  const prevBalance = useRef(initialBalance);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function disarmStuckTimer() {
    if (stuckTimerRef.current !== null) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }

  // Never leave a timer running past unmount.
  useEffect(() => disarmStuckTimer, []);

  const outOfTokens = balance < 1;
  // FR2 (Inc10): only nag "ask a parent" when the child has nothing to spend at
  // all. If they still hold an Easter Egg ticket, keep the Discover button visible
  // but greyed so they know a normal ticket is needed for it (B2=B).
  const askParent = balance <= 0 && eggs <= 0;
  const hasEggs = eggs > 0;

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

  // Warm the browser cache for the roulette's spin flashes as soon as the
  // Discover page opens, well before the kid taps (bounded to the frames the
  // spin can actually show — see roulette-schedule.ts — and low-priority so
  // it doesn't compete with the page's own critical loads).
  useEffect(() => {
    for (const card of boundedFlashPool(flashPool)) {
      preloadCardImage(card.imageUrl, FLASH_DIM, "low");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared launch flow for both pull kinds (normal, Easter Egg ticket): sound
  // cues, reset the picker, then dispatch. On success a normal card pull kicks off
  // the slot-machine build-up (Inc7 FR1); an easter-egg outcome plays the
  // picker-appear cue instead (Inc15 FR3).
  //
  // #kcpi: arms a client-side stuck-loading timeout independent of `pending`
  // (a genuinely hung fetch never resolves on its own, so `pending` alone
  // can't recover).
  function runPull(action: () => Promise<PullOutcome>, kind: "normal" | "easter_egg") {
    play("click");
    play("packOpen");
    setOutcome(null);
    setStuck(false);
    setRefundedNotice(false);
    disarmStuckTimer();
    stuckTimerRef.current = setTimeout(() => setStuck(true), STUCK_TIMEOUT_MS);

    startTransition(async () => {
      let res: PullOutcome;
      try {
        res = await action();
      } catch {
        disarmStuckTimer();
        setStuck(false);
        play("denied");
        return;
      }
      disarmStuckTimer();

      if (res.stillInProgress) {
        // A previous attempt for this SAME request id is still being
        // completed server-side (not stale yet) — nothing was spent or
        // granted just now. Keep the stored id so the next tap retries it.
        setBalance(res.newBalance);
        setStuck(true);
        return;
      }
      setStuck(false);
      clearPendingRequestId(childId); // outcome is about to be shown
      if (res.refunded) {
        setBalance(res.newBalance);
        setRefundedNotice(true);
        return;
      }
      setOutcome(res);
      if (res.outOfTokens) {
        play("denied");
        return;
      }
      // Start loading the won card's full-size art immediately — during the
      // roulette spin for a normal draw, or right away on the reduced-motion
      // path where there's no spin to hide the fetch behind.
      if (!res.easterEgg) preloadCardImage(res.card.imageUrl, 512, "high");
      setBalance(res.newBalance);
      posthog.capture("card_pulled", {
        ticket_type: kind,
        theme_id: themeId || null,
        is_easter_egg: !!res.easterEgg,
        ...(res.easterEgg
          ? {}
          : {
              card_rarity: res.card.rarity,
              is_duplicate: res.isDuplicate,
              new_balance: res.newBalance,
            }),
      });
      if (res.easterEgg) play("easterEgg");
      else setCycling(true);
    });
  }

  function doPull() {
    const requestId = getOrCreateRequestId(childId);
    runPull(() => pullAction(requestId, themeId || undefined), "normal");
  }

  // Inc19: redeem the unified Easter Egg ticket → weighted-roll pick-1-of-5.
  function doEasterEgg() {
    runPull(() => pullEasterEggAction(), "easter_egg");
  }

  // On a successful egg claim, decrement the Easter Egg ticket that was spent.
  function onEggClaimed(newBalance: number) {
    setBalance(newBalance);
    setEggs((n) => Math.max(0, n - 1));
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
            {pending ? (stuck ? "⏳ Still working…" : "Launching…") : "🚀 Discover a card"}
          </button>
          {stuck ? (
            <div
              data-testid="pull-stuck-message"
              className="panel max-w-xs px-4 py-3 text-center text-sm text-[color:var(--ink-soft)]"
            >
              <p>This is taking longer than usual. Check your tickets — nothing extra was charged.</p>
              <button
                type="button"
                onClick={reloadStuckPull}
                data-testid="pull-retry-button"
                className="btn btn--primary mt-2 press font-bold"
              >
                Try again
              </button>
            </div>
          ) : refundedNotice ? (
            <p
              data-testid="pull-refunded-message"
              className="panel max-w-xs px-4 py-3 text-center text-sm text-[color:var(--ink-soft)]"
            >
              Your ticket was given back — tap Discover a card to try again. 🎟️
            </p>
          ) : outOfTokens && hasEggs ? (
            <span
              data-testid="use-special-hint"
              className="text-sm text-[color:var(--ink-soft)]"
            >
              Out of normal tickets — open your Easter Egg below! 🥚
            </span>
          ) : null}
        </div>
      )}

      {/* Unified Easter Egg ticket (Inc19 FR8) — weighted-roll pick-1-of-5. */}
      {hasEggs ? (
        <div className="flex flex-wrap justify-center gap-3" data-testid="easter-egg-tickets">
          <button
            type="button"
            onClick={doEasterEgg}
            disabled={pending}
            data-testid="easter-egg-button"
            className="btn btn--primary press font-bold"
          >
            🥚 Open Easter Egg ({eggs})
          </button>
        </div>
      ) : null}

      {outcome && !outcome.outOfTokens && outcome.easterEgg ? (
        <EasterEggPicker
          key={outcome.offer}
          choices={outcome.choices}
          ownedCounts={outcome.ownedCounts}
          revealRarity={outcome.revealRarity}
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
