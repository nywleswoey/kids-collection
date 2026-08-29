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
  bandsByTier,
  buildColumns,
  isPickable,
  type BoardCard,
  type SwapTier,
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
            filterLabel={`Only show what ${friend.name} is missing`}
            filterOn={onlyTheirsMissing}
            setFilterOn={setOnlyTheirsMissing}
            badged={myBadged}
            total={columns.mine.length}
            cards={applyMissingFilter(columns.mine, onlyTheirsMissing)}
            receiver={friend.name}
            newGlyph="🎁"
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
            filterLabel="Only show what you're missing"
            filterOn={onlyMineMissing}
            setFilterOn={setOnlyMineMissing}
            badged={theirBadged}
            total={columns.theirs.length}
            cards={applyMissingFilter(columns.theirs, onlyMineMissing)}
            receiver={YOU}
            newGlyph="🆕"
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

/**
 * The receiver on the far side of a column, as the headings address them.
 * `YOU` is a sentinel, not a name: the copy has to switch person for it
 * ("one more and YOU can burn it"), and a friend can't be called it.
 */
const YOU = "you";

/** The band heading — a whole sentence, naming WHOSE shelf the tier is about
 *  (#110). Said once above the band instead of on every tile. */
function bandTitle(tier: SwapTier, receiver: string, newGlyph: string): string {
  const you = receiver === YOU;
  if (tier === "new") return `${newGlyph} New for ${receiver}`;
  if (tier === "one-away") return `🔥 One more and ${receiver} can burn it`;
  return you ? "You already have these" : `${receiver} already has these`;
}

/**
 * The same sentence on the tile itself, for a screen reader: a band heading is
 * not announced with the button inside it, so the tier rides in each tile's
 * accessible name too. `rest` says nothing — an unlabelled tile means they
 * already have it, exactly as it did when the badge was visible (FR4).
 */
function tierPhrase(tier: SwapTier, receiver: string): string {
  if (tier === "new") return `new for ${receiver}`;
  if (tier === "one-away") return `one more and ${receiver} can burn it`;
  return "";
}

/**
 * One side of the board, cut into tier bands (#110). The heading carries the
 * tier, so the tiles carry no badges at all — including the 🎁 that used to
 * mark tier 1 (FR4), which the first band now says in full and in words.
 *
 * The header pill that counted the same cards went with it: it sat directly
 * above a heading saying the same thing in the same words. The filter's own
 * `(badged/total)` count stays — it's about what the checkbox would leave.
 */
function Column({
  testid,
  title,
  filterLabel,
  filterOn,
  setFilterOn,
  badged,
  total,
  cards,
  receiver,
  newGlyph,
  selectedId,
  otherPick,
  onPick,
  emptyHint,
}: {
  testid: string;
  title: string;
  filterLabel: string;
  filterOn: boolean;
  setFilterOn: (v: boolean) => void;
  badged: number;
  total: number;
  cards: BoardCard[];
  receiver: string;
  newGlyph: string;
  selectedId: string | null;
  otherPick: CardType | null;
  onPick: (c: BoardCard) => void;
  emptyHint: string;
}) {
  return (
    <section className="panel flex flex-col gap-3 p-4" data-testid={`trade-column-${testid}`}>
      <h2 className="text-lg font-bold">{title}</h2>
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
        bandsByTier(cards).map((band) => (
          <div key={band.tier} className="flex flex-col gap-2">
            <h3
              data-testid={`trade-band-${testid}-${band.tier}`}
              className="text-xs font-bold uppercase tracking-wide text-[color:var(--ink-soft)]"
            >
              {bandTitle(band.tier, receiver, newGlyph)} ({band.cards.length})
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {band.cards.map((c) => (
                <Tile
                  key={c.card.id}
                  entry={c}
                  receiver={receiver}
                  testid={testid}
                  selected={selectedId === c.card.id}
                  pickable={isPickable(c.card, otherPick)}
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

/** A card tile. Carries no tier badge since #110 — the band heading above it
 *  says the tier, in a sentence, once. Mismatched rarities are dimmed but stay
 *  visible (FR6). */
function Tile({
  entry,
  receiver,
  testid,
  selected,
  pickable,
  onPick,
}: {
  entry: BoardCard;
  receiver: string;
  testid: string;
  selected: boolean;
  pickable: boolean;
  onPick: () => void;
}) {
  const meta = RARITY_META[entry.card.rarity];
  const phrase = tierPhrase(entry.tier, receiver);
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!pickable}
      aria-pressed={selected}
      aria-label={`${entry.card.name}, ${meta.label}${phrase ? `, ${phrase}` : ""}`}
      data-testid={`trade-${testid}-${entry.card.id}`}
      className={`relative overflow-hidden rounded-xl border-2 bg-white/10 transition ${
        selected ? "ring-4 ring-[color:var(--brand-1)]" : ""
      } ${pickable ? "hover:scale-105" : "cursor-not-allowed opacity-25 grayscale"}`}
      style={{ borderColor: meta.frame }}
    >
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
