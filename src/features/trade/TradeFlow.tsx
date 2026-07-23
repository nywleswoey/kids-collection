"use client";

import posthog from "posthog-js";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Card as CardType } from "@/lib/types";
import { CardImage } from "@/features/card/CardImage";
import { RARITY_META } from "@/features/card/rarity";
import { AvatarBadge } from "@/features/ui/AvatarBadge";
import { ErrorBanner } from "@/features/ui/ErrorBanner";
import { useSound } from "@/features/sound/useSound";
import { playReward } from "@/features/sound/sfx";
import { getMatchesAction, executeTradeAction } from "./actions";
import type { TradableCard } from "./trade-logic";

type Friend = { id: string; name: string; avatar: string };
type Phase = "pick-mine" | "pick-friend" | "pick-theirs" | "confirm" | "done";

/**
 * Kid-to-kid trade flow (Inc14). Pick your duplicate → pick a friend → pick
 * their same-rarity duplicate → confirm → swap. Server re-validates + commits
 * atomically; the child A is the server-side active profile.
 */
export function TradeFlow({
  myCards,
  friends,
}: {
  myCards: TradableCard[];
  friends: Friend[];
}) {
  const [phase, setPhase] = useState<Phase>("pick-mine");
  const [mine, setMine] = useState<TradableCard | null>(null);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [theirCards, setTheirCards] = useState<TradableCard[]>([]);
  const [theirs, setTheirs] = useState<TradableCard | null>(null);
  const [result, setResult] = useState<{ gave: CardType; got: CardType } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { play } = useSound();

  function reset() {
    setPhase("pick-mine");
    setMine(null);
    setFriend(null);
    setTheirCards([]);
    setTheirs(null);
    setResult(null);
    setError(null);
  }

  function chooseMine(t: TradableCard) {
    play("click");
    setMine(t);
    setPhase("pick-friend");
  }

  function chooseFriend(f: Friend) {
    play("click");
    setFriend(f);
    setError(null);
    startTransition(async () => {
      const matches = await getMatchesAction(f.id, mine!.card.rarity);
      setTheirCards(matches);
      setPhase("pick-theirs");
    });
  }

  function chooseTheirs(t: TradableCard) {
    play("click");
    setTheirs(t);
    setPhase("confirm");
  }

  function commit() {
    play("click");
    setError(null);
    startTransition(async () => {
      const res = await executeTradeAction(mine!.card.id, friend!.id, theirs!.card.id);
      if (res.ok) {
        // Inc15 FR2: set-complete cue + fanfare when the card you got is epic/legendary.
        playReward(play, res.got.rarity);
        posthog.capture("trade_completed", {
          gave_card_rarity: res.gave.rarity,
          got_card_rarity: res.got.rarity,
        });
        setResult({ gave: res.gave, got: res.got });
        setPhase("done");
      } else {
        play("denied");
        setError(res.reason);
        setPhase("pick-mine");
      }
    });
  }

  // ---- Result ----
  if (phase === "done" && result) {
    return (
      <div className="panel flex max-w-md flex-col items-center gap-4 p-6 text-center" data-testid="trade-done">
        <h1 className="text-2xl font-bold title-pop">Trade complete! 🎉</h1>
        <SwapRow give={result.gave} giveLabel="You gave" get={result.got} getLabel="You got" />
        <div className="flex gap-3">
          <button type="button" onClick={reset} data-testid="trade-again" className="btn btn--primary">
            Trade again
          </button>
          <Link href="/play/binder" className="btn btn--ghost">
            🪐 My Galaxy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <ErrorBanner testId="trade-error" message={error} />

      {/* Step 1 — pick your duplicate */}
      {phase === "pick-mine" ? (
        <section className="flex w-full flex-col items-center gap-3" data-testid="trade-pick-mine">
          <h2 className="text-xl font-bold">1. Pick your double to trade</h2>
          {myCards.length === 0 ? (
            <Hint>You have no doubles yet — collect a duplicate first! ➕</Hint>
          ) : (
            <CardGrid cards={myCards} onPick={chooseMine} testid="mine" />
          )}
        </section>
      ) : null}

      {/* Step 2 — pick a friend */}
      {phase === "pick-friend" ? (
        <section className="flex w-full flex-col items-center gap-3" data-testid="trade-pick-friend">
          <h2 className="text-xl font-bold">2. Trade with which friend?</h2>
          {friends.length === 0 ? (
            <Hint>No other players yet — ask a parent to add one.</Hint>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {friends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => chooseFriend(f)}
                  disabled={pending}
                  data-testid={`trade-friend-${f.id}`}
                  className="panel flex items-center gap-2 px-4 py-3 transition hover:bg-white/10 disabled:opacity-50"
                >
                  <AvatarBadge avatar={f.avatar} className="h-9 w-9 text-lg" />
                  <span className="font-semibold">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Step 3 — pick their same-rarity duplicate */}
      {phase === "pick-theirs" && mine && friend ? (
        <section className="flex w-full flex-col items-center gap-3" data-testid="trade-pick-theirs">
          <h2 className="text-xl font-bold">
            3. Pick {friend.name}&apos;s {RARITY_META[mine.card.rarity].label} double
          </h2>
          {theirCards.length === 0 ? (
            <Hint>
              {friend.name} has no {RARITY_META[mine.card.rarity].label} doubles to swap.
            </Hint>
          ) : (
            <CardGrid cards={theirCards} onPick={chooseTheirs} testid="theirs" />
          )}
        </section>
      ) : null}

      {/* Step 4 — confirm */}
      {phase === "confirm" && mine && theirs ? (
        <section className="panel flex flex-col items-center gap-4 p-6 text-center" data-testid="trade-confirm">
          <h2 className="text-xl font-bold">Ready to trade?</h2>
          <SwapRow give={mine.card} giveLabel="You give" get={theirs.card} getLabel="You get" />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={commit}
              disabled={pending}
              data-testid="trade-confirm-button"
              className="btn btn--primary btn--lg press font-bold"
            >
              {pending ? "Trading…" : "Confirm trade 🤝"}
            </button>
            <button type="button" onClick={reset} disabled={pending} className="btn btn--ghost">
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="panel px-5 py-3 text-center text-sm text-[color:var(--ink-soft)]">{children}</p>
  );
}

function SwapRow({
  give,
  giveLabel,
  get,
  getLabel,
}: {
  give: CardType;
  giveLabel: string;
  get: CardType;
  getLabel: string;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <CardMini card={give} label={giveLabel} />
      <span className="text-2xl">🔄</span>
      <CardMini card={get} label={getLabel} />
    </div>
  );
}

function CardGrid({
  cards,
  onPick,
  testid,
}: {
  cards: TradableCard[];
  onPick: (t: TradableCard) => void;
  testid: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {cards.map((t) => {
        const meta = RARITY_META[t.card.rarity];
        return (
          <button
            key={t.card.id}
            type="button"
            onClick={() => onPick(t)}
            data-testid={`trade-${testid}-${t.card.id}`}
            className="relative overflow-hidden rounded-xl border-2 bg-white/10 transition hover:scale-105"
            style={{ borderColor: meta.frame }}
          >
            <span className="rarity-badge">{meta.label}</span>
            <CardImage src={t.card.imageUrl} alt={t.card.name} dim={200} />
            <span className="pill absolute bottom-1 right-1 text-xs">×{t.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function CardMini({ card, label }: { card: CardType; label: string }) {
  const meta = RARITY_META[card.rarity];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-[color:var(--ink-soft)]">{label}</span>
      <div className="relative overflow-hidden rounded-xl border-2" style={{ borderColor: meta.frame }}>
        <CardImage src={card.imageUrl} alt={card.name} dim={110} className="aspect-square w-[110px] object-cover" />
      </div>
      <span className="text-xs font-semibold">{meta.label}</span>
    </div>
  );
}
