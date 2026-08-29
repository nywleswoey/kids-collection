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
import { getTradeBoardAction, executeTradeAction } from "./actions";
import type { TradableCard } from "./trade-logic";
import { bandsByTier, buildColumns, isPickable, type BoardCard } from "./board";
import { ME, bandCopy, tileLabel, type Receiver } from "./band-copy";

export type FriendSummary = {
  id: string;
  name: string;
  avatar: string;
  /** How many of MY duplicates this friend is missing (FR7). */
  missingCount: number;
};

/**
 * Friend-first swap board (Inc22). Pick the friend FIRST, then see both
 * inventories side by side, each ordered by what the swap is worth to whoever
 * would RECEIVE those cards (#109) and cut into labelled tier bands (#110).
 * Server re-validates and commits atomically; giver A is always the
 * server-side active profile.
 */
export function TradeBoard({
  myCards,
  friends,
}: {
  myCards: TradableCard[];
  friends: FriendSummary[];
}) {
  const [friend, setFriend] = useState<FriendSummary | null>(null);
  const [view, setView] = useState<{
    theirDupes: TradableCard[];
    theirOwnedIds: string[];
    myOwnedIds: string[];
  } | null>(null);
  const [mine, setMine] = useState<BoardCard | null>(null);
  const [theirs, setTheirs] = useState<BoardCard | null>(null);
  const [result, setResult] = useState<{ gave: CardType; got: CardType } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { play } = useSound();

  function reset() {
    setFriend(null);
    setView(null);
    setMine(null);
    setTheirs(null);
    setResult(null);
    setError(null);
  }

  function chooseFriend(f: FriendSummary) {
    play("click");
    setFriend(f);
    setView(null);
    setMine(null);
    setTheirs(null);
    setError(null);
    startTransition(async () => {
      try {
        setView(await getTradeBoardAction(f.id));
      } catch {
        // NFR4: the friend strip stays usable so another friend can be tried.
        setError("Couldn't load those cards — try again.");
      }
    });
  }

  function commit() {
    play("click");
    setError(null);
    startTransition(async () => {
      const res = await executeTradeAction(mine!.card.id, friend!.id, theirs!.card.id);
      if (res.ok) {
        // Inc15 FR2: fanfare when the card you got is epic/legendary.
        playReward(play, res.got.rarity);
        posthog.capture("trade_completed", {
          gave_card_rarity: res.gave.rarity,
          got_card_rarity: res.got.rarity,
        });
        setResult({ gave: res.gave, got: res.got });
      } else {
        play("denied");
        setError(res.reason);
        setMine(null);
        setTheirs(null);
      }
    });
  }

  // ---- Result ----
  if (result) {
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

  const columns =
    friend && view
      ? buildColumns({
          mine: myCards,
          theirs: view.theirDupes,
          myOwnedIds: new Set(view.myOwnedIds),
          theirOwnedIds: new Set(view.theirOwnedIds),
        })
      : null;

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-5">
      <ErrorBanner testId="trade-error" message={error} />

      {/* Step 1 — pick a friend (FR1) */}
      <section className="flex w-full flex-col items-center gap-3" data-testid="trade-pick-friend">
        <h2 className="text-xl font-bold">1. Who do you want to trade with?</h2>
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
                aria-pressed={friend?.id === f.id}
                data-testid={`trade-friend-${f.id}`}
                className={`panel flex items-center gap-2 px-4 py-3 transition hover:bg-white/10 disabled:opacity-50 ${
                  friend?.id === f.id ? "ring-2 ring-[color:var(--brand-1)]" : ""
                }`}
              >
                <AvatarBadge avatar={f.avatar} className="h-9 w-9 text-lg" />
                <span className="font-semibold">{f.name}</span>
                {f.missingCount > 0 ? (
                  <span className="pill pill--gold text-xs">🎁 {f.missingCount}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {myCards.length === 0 ? (
        <Hint>You have no doubles yet — collect a duplicate first! ➕</Hint>
      ) : null}

      {friend && pending && !columns ? <Hint>Loading {friend.name}&apos;s cards…</Hint> : null}

      {/* Step 2 — the swap board (FR2) */}
      {friend && columns ? (
        <div className="grid w-full gap-5 md:grid-cols-2" data-testid="trade-board">
          {/* Own doubles first — on mobile these stack above the friend's (FR5=A). */}
          <Column
            testid="mine"
            title="Your doubles"
            cards={columns.mine}
            receiver={{ kind: "friend", name: friend.name }}
            selectedId={mine?.card.id ?? null}
            otherPick={theirs?.card ?? null}
            onPick={(c) => {
              play("click");
              posthog.capture("trade_initiated", { card_rarity: c.card.rarity });
              setMine(c);
            }}
            emptyHint="You have no doubles to trade yet."
          />

          <Column
            testid="theirs"
            title={`${friend.name}'s doubles`}
            cards={columns.theirs}
            receiver={ME}
            selectedId={theirs?.card.id ?? null}
            otherPick={mine?.card ?? null}
            onPick={(c) => {
              play("click");
              setTheirs(c);
            }}
            emptyHint={`${friend.name} has no doubles to swap.`}
          />
        </div>
      ) : null}

      {/* Step 3 — confirm (FR8) */}
      {mine && theirs ? (
        <section
          className="panel sticky bottom-4 flex flex-col items-center gap-4 p-5 text-center"
          data-testid="trade-confirm"
        >
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
            <button
              type="button"
              onClick={() => {
                setMine(null);
                setTheirs(null);
              }}
              disabled={pending}
              className="btn btn--ghost"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * One side of the board, cut into tier bands (#110). The heading carries the
 * tier, so the tiles carry no badges at all — including the 🎁 that used to
 * mark tier 1 (FR4), which the first band now says in full and in words.
 *
 * The "only show what's missing" checkbox went the same way (#111). It kept
 * exactly the `new` band — which the sort already floats to the top, under a
 * heading that names it in a sentence and counts it. The checkbox restated
 * that in its own label, and was the only control on the board that could
 * REMOVE a swap the child was allowed to make. Nothing here narrows any more:
 * the column shows the whole inventory, ordered so the best swap is first, and
 * every card stays reachable.
 */
function Column({
  testid,
  title,
  cards,
  receiver,
  selectedId,
  otherPick,
  onPick,
  emptyHint,
}: {
  testid: string;
  title: string;
  cards: BoardCard[];
  receiver: Receiver;
  selectedId: string | null;
  otherPick: CardType | null;
  onPick: (c: BoardCard) => void;
  emptyHint: string;
}) {
  return (
    <section className="panel flex flex-col gap-3 p-4" data-testid={`trade-column-${testid}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      {cards.length === 0 ? (
        <Hint>{emptyHint}</Hint>
      ) : (
        bandsByTier(cards).map((band) => (
          <div key={band.tier} className="flex flex-col gap-2">
            <h3
              data-testid={`trade-band-${testid}-${band.tier}`}
              className="text-xs font-bold uppercase tracking-wide text-[color:var(--ink-soft)]"
            >
              {bandCopy(band.tier, receiver).heading} ({band.cards.length})
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {band.cards.map((c) => (
                <Tile
                  key={c.card.id}
                  entry={c}
                  receiver={receiver}
                  testid={testid}
                  selected={selectedId === c.card.id}
                  otherPick={otherPick}
                  onPick={() => onPick(c)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

/**
 * A card tile. Carries no tier badge since #110 — the band heading above it
 * says the tier, in a sentence, once. Mismatched rarities are dimmed but stay
 * visible (FR6), and stay REACHABLE (#111): the lock is `aria-disabled`, not
 * `disabled`, because a `disabled` button leaves the tab order entirely, so a
 * child driving the board by keyboard or screen reader met the locked half of
 * a column as silence — no tile, and no reason. Dimmed-but-focusable puts the
 * rule where it can be heard, which is the point of dimming rather than
 * removing in the first place. The click has to be guarded by hand in
 * exchange, since `aria-disabled` is a claim to assistive tech and not a
 * behaviour the browser enforces.
 */
function Tile({
  entry,
  receiver,
  testid,
  selected,
  otherPick,
  onPick,
}: {
  entry: BoardCard;
  receiver: Receiver;
  testid: string;
  selected: boolean;
  otherPick: CardType | null;
  onPick: () => void;
}) {
  const meta = RARITY_META[entry.card.rarity];
  const pickable = isPickable(entry.card, otherPick);
  const { play } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        if (pickable) onPick();
        else play("denied");
      }}
      aria-disabled={!pickable}
      aria-pressed={selected}
      aria-label={tileLabel(entry, receiver, otherPick)}
      data-testid={`trade-${testid}-${entry.card.id}`}
      className={`rounded-xl transition focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-1)] ${
        selected ? "ring-4 ring-[color:var(--brand-1)]" : ""
      } ${pickable ? "hover:scale-105" : "cursor-not-allowed"}`}
    >
      <span
        className={`relative block overflow-hidden rounded-xl border-2 bg-white/10 ${
          pickable ? "" : "opacity-25 grayscale"
        }`}
        style={{ borderColor: meta.frame }}
      >
        <CardImage src={entry.card.imageUrl} alt={entry.card.name} dim={200} />
        <span className="pill absolute bottom-1 right-1 text-xs">×{entry.count}</span>
        <span className="rarity-badge">{meta.label}</span>
      </span>
    </button>
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
