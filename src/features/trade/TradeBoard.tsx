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
import {
  applyMissingFilter,
  buildColumns,
  isPickable,
  type BoardCard,
} from "./board";

export type FriendSummary = {
  id: string;
  name: string;
  avatar: string;
  /** How many of MY duplicates this friend is missing (FR7). */
  missingCount: number;
};

/**
 * Friend-first swap board (Inc22). Pick the friend FIRST, then see both
 * inventories side by side with the cards that are new to the other party
 * badged. Server re-validates and commits atomically; giver A is always the
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
  // FR5 / Q1=B — both filters start OFF: the child sees their whole inventory
  // on arrival and opts into the narrowing.
  const [onlyTheirsMissing, setOnlyTheirsMissing] = useState(false);
  const [onlyMineMissing, setOnlyMineMissing] = useState(false);
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

  const myBadged = columns ? columns.mine.filter((c) => c.newToOther).length : 0;
  const theirBadged = columns ? columns.theirs.filter((c) => c.newToOther).length : 0;

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
            badgeSummary={`🎁 ${myBadged} new for ${friend.name}`}
            filterLabel={`Only show what ${friend.name} is missing`}
            filterOn={onlyTheirsMissing}
            setFilterOn={setOnlyTheirsMissing}
            badged={myBadged}
            total={columns.mine.length}
            cards={applyMissingFilter(columns.mine, onlyTheirsMissing)}
            wantLabel={`🎁 New for ${friend.name}`}
            selectedId={mine?.card.id ?? null}
            otherPick={theirs?.card ?? null}
            onPick={(c) => {
              play("click");
              posthog.capture("trade_initiated", { card_rarity: c.card.rarity });
              setMine(c);
            }}
            emptyHint={
              onlyTheirsMissing
                ? `${friend.name} already has all your doubles — untick to swap anyway.`
                : "You have no doubles to trade yet."
            }
          />

          <Column
            testid="theirs"
            title={`${friend.name}'s doubles`}
            badgeSummary={`🆕 ${theirBadged} new for you`}
            filterLabel="Only show what you're missing"
            filterOn={onlyMineMissing}
            setFilterOn={setOnlyMineMissing}
            badged={theirBadged}
            total={columns.theirs.length}
            cards={applyMissingFilter(columns.theirs, onlyMineMissing)}
            wantLabel="🆕 New for you"
            selectedId={theirs?.card.id ?? null}
            otherPick={mine?.card ?? null}
            onPick={(c) => {
              play("click");
              setTheirs(c);
            }}
            emptyHint={
              onlyMineMissing
                ? `You already have all of ${friend.name}'s doubles — untick to swap anyway.`
                : `${friend.name} has no doubles to swap.`
            }
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

function Column({
  testid,
  title,
  badgeSummary,
  filterLabel,
  filterOn,
  setFilterOn,
  badged,
  total,
  cards,
  wantLabel,
  selectedId,
  otherPick,
  onPick,
  emptyHint,
}: {
  testid: string;
  title: string;
  badgeSummary: string;
  filterLabel: string;
  filterOn: boolean;
  setFilterOn: (v: boolean) => void;
  badged: number;
  total: number;
  cards: BoardCard[];
  wantLabel: string;
  selectedId: string | null;
  otherPick: CardType | null;
  onPick: (c: BoardCard) => void;
  emptyHint: string;
}) {
  return (
    <section className="panel flex flex-col gap-3 p-4" data-testid={`trade-column-${testid}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="pill pill--gold text-xs">{badgeSummary}</span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filterOn}
          onChange={(e) => setFilterOn(e.target.checked)}
          data-testid={`trade-filter-${testid}`}
        />
        {filterLabel} ({badged}/{total})
      </label>
      {cards.length === 0 ? (
        <Hint>{emptyHint}</Hint>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {cards.map((c) => (
            <Tile
              key={c.card.id}
              entry={c}
              wantLabel={wantLabel}
              testid={testid}
              selected={selectedId === c.card.id}
              pickable={isPickable(c.card, otherPick)}
              onPick={() => onPick(c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** A card tile. Badged ONLY when it's new to the other party (FR4) — an unbadged
 *  tile simply means they already have it. Mismatched rarities are dimmed but
 *  stay visible (FR6). */
function Tile({
  entry,
  wantLabel,
  testid,
  selected,
  pickable,
  onPick,
}: {
  entry: BoardCard;
  wantLabel: string;
  testid: string;
  selected: boolean;
  pickable: boolean;
  onPick: () => void;
}) {
  const meta = RARITY_META[entry.card.rarity];
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!pickable}
      aria-pressed={selected}
      aria-label={`${entry.card.name}, ${meta.label}${entry.newToOther ? `, ${wantLabel}` : ""}`}
      data-testid={`trade-${testid}-${entry.card.id}`}
      className={`relative overflow-hidden rounded-xl border-2 bg-white/10 transition ${
        selected ? "ring-4 ring-[color:var(--brand-1)]" : ""
      } ${pickable ? "hover:scale-105" : "cursor-not-allowed opacity-25 grayscale"}`}
      style={{ borderColor: meta.frame }}
    >
      {entry.newToOther ? (
        <span className="absolute left-1 top-1 z-10 rounded-full bg-[#22c55e] px-1.5 py-0.5 text-[0.6rem] font-black leading-tight text-black">
          {wantLabel}
        </span>
      ) : null}
      <CardImage src={entry.card.imageUrl} alt={entry.card.name} dim={200} />
      <span className="pill absolute bottom-1 right-1 text-xs">×{entry.count}</span>
      <span className="rarity-badge">{meta.label}</span>
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
