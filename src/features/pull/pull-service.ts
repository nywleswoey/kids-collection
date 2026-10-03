import { drawCard } from "@/lib/logic";
import { env } from "@/lib/env";
import type { Card, PullResult, Rarity } from "@/lib/types";
import type { BalanceColumn, ChildStore } from "@/db/stores/child-store";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { ClaimStore } from "@/db/stores/claim-store";
import type { Catalog } from "@/shared/pool/catalog";
import type { RewardGranter } from "@/features/rewards/reward-granter";
import {
  rollEasterEgg,
  pickEasterEggChoices,
  pickCommonRareChoices,
  pickRarityChoices,
  rollWeightedRarity,
} from "./easter-egg";
import { SACRIFICE_COST } from "./sacrifice";
import { makeOffer, verifyOffer, type OfferPayload } from "./offer";

/** Pick-1-of-5 easter egg: server offers choices, claimed later. */
export interface EasterEggOutcome {
  outOfTokens: false;
  easterEgg: true;
  stillInProgress?: false;
  refunded?: false;
  choices: Card[];
  /** Inc16 FR4: active child's current owned count per choice card (0 = new). */
  ownedCounts: Record<string, number>;
  offer: string;
  newBalance: number;
  /** Inc19 FR4: server-rolled tier for the unified Easter Egg ticket, so the
   *  picker can surprise-reveal it. Absent for the random ~1% eggs. */
  revealRarity?: Rarity;
}

/**
 * A duplicate request id (#kcpi) whose original attempt is still actively
 * being completed (not stale yet) — THIS call spent and granted nothing.
 * Safe to retry with the SAME request id: the retry will either see the
 * original's finished outcome, or, once the claim goes stale, complete it.
 * A plain return value (not a thrown error) so it survives the server
 * action boundary — Next.js can redact a thrown error's message in
 * production, but return values round-trip exactly.
 */
export interface PullStillInProgressOutcome {
  outOfTokens: false;
  easterEgg?: false;
  stillInProgress: true;
  refunded?: false;
  /** Live balance, read when this answer is built. */
  newBalance: number;
}

/**
 * A request id whose claim was swept as abandoned (#kcpi): its ticket was
 * given back and nothing was drawn. `newBalance` is read live on replay.
 */
export interface PullRefundedOutcome {
  outOfTokens: false;
  easterEgg?: false;
  stillInProgress?: false;
  refunded: true;
  newBalance: number;
}

export type PullOutcome =
  | ({ outOfTokens: false; easterEgg?: false; stillInProgress?: false; refunded?: false } & PullResult)
  | EasterEggOutcome
  | { outOfTokens: true; stillInProgress?: false; refunded?: false }
  | PullStillInProgressOutcome
  | PullRefundedOutcome;

export interface SacrificeResult {
  /** Easter Egg ticket balance after the sacrifice granted one (Inc19 FR7). */
  newBalance: number;
}

const OFFER_TTL_MS = 120_000; // 2 min

/**
 * How long a "granting" claim must sit untouched before a retry may treat the
 * original attempt as dead and take over its spend (#kcpi — request-level
 * idempotency). Long enough that a merely slow pull is never mistaken for an
 * abandoned one; short enough that a genuinely killed/timed-out request
 * recovers within one retry. Paired with the client's stuck-loading timeout
 * in PullButton.tsx, which is deliberately shorter so the UI tells the child
 * something's wrong before the server would even agree to take over.
 */
const CLAIM_STALE_MS = 15_000;

/**
 * How long a "granting" claim must sit untouched before the child's NEXT pull
 * (any request id) refunds it outright (#kcpi). CLAIM_STALE_MS is the short
 * same-tab window for a live retry of the SAME id to take over and finish the
 * draw; this is the long cross-session one, for a claim no retry will ever
 * come back for (tab closed, another device, sessionStorage lost). Far longer
 * than any request can run, so it only ever catches one that's truly gone.
 * Swept lazily — by `pull()` only when a spend finds no tickets left, and by
 * `pullBalance()` when the pull screen loads at 0 (where no Discover button is
 * shown to trigger the former) — no background job, and no extra round trip
 * on a pull that can pay. So an abandoned claim stays unrefunded until the
 * child next runs out.
 * The current tap's own request id is excluded: if a child reopens the SAME
 * tab/id after this long, the duplicate-id path takes over and completes the
 * draw for that spend, instead of the sweep refunding it moments before.
 */
const ABANDONED_CLAIM_SWEEP_MS = 10 * 60 * 1000;

export interface PullDeps {
  children: ChildStore;
  collections: CollectionStore;
  catalog: Catalog;
  rewards: RewardGranter;
  claims: ClaimStore;
}

/**
 * Pull/egg/sacrifice orchestration (U4/U6/Inc16), parameterized by its ports.
 * The atomic spend/refund/grant all live behind ChildStore + CollectionStore,
 * and `pull()`'s request-level idempotency lives behind ClaimStore (#kcpi), so
 * this module is pure orchestration — unit-testable with fakes. Offer crypto
 * (`env.authSecret`, `makeOffer`/`verifyOffer`) stays a direct import; parent
 * gating now lives at the action layer. Prod wiring: `pull-service.prod.ts`.
 */
export function makePullService({ children, collections, catalog, rewards, claims }: PullDeps) {
  /** `pull()`'s answer when a duplicate request id's original attempt is still
   *  actively being completed (not stale yet) — nothing was spent or granted. */
  async function stillInProgress(childId: string): Promise<PullStillInProgressOutcome> {
    const newBalance = await children.readColumn(childId, "pullTokens");
    return { outOfTokens: false, stillInProgress: true, newBalance };
  }

  /** Replay a finished claim's stored outcome; a swept (refunded) one gets
   *  the live balance, since the sweep stores no per-claim balance. */
  async function replayDone(childId: string, outcome: unknown): Promise<PullOutcome> {
    if ((outcome as { refunded?: boolean } | null)?.refunded !== true) return outcome as PullOutcome;
    const newBalance = await children.readColumn(childId, "pullTokens");
    return { outOfTokens: false, refunded: true, newBalance };
  }

  /**
   * Assemble a pick-1-of-N easter-egg outcome: sign the offer (pure crypto,
   * always FIRST so a caller's later side-effect can't double-fire on failure),
   * annotate owned counts, and return with the given normal-token balance.
   */
  async function eggOutcome(
    childId: string,
    choices: Card[],
    newBalance: number,
    offerExtra: Partial<OfferPayload> = {},
    revealRarity?: Rarity,
  ): Promise<EasterEggOutcome> {
    const cardIds = choices.map((c) => c.id);
    const offer = await makeOffer(
      { childId, cardIds, exp: Date.now() + OFFER_TTL_MS, ...offerExtra },
      env.authSecret,
    );
    const ownedCounts = await collections.ownedCounts(childId, cardIds);
    return {
      outOfTokens: false,
      easterEgg: true,
      choices,
      ownedCounts,
      offer,
      newBalance,
      ...(revealRarity ? { revealRarity } : {}),
    };
  }

  /**
   * Build a signed pick-1-of-N easter-egg offer, then finish the claim (#kcpi)
   * with the token refund (re-spent on claim) baked into the SAME atomic
   * write as the "done" status — so a stale takeover racing this call can
   * never double-refund. Shared by both eggs (epic+ and common/rare) inside
   * `completeGrant`. Sign FIRST (pure crypto) so a failure can't double-refund.
   */
  async function finishEggOutcome(
    childId: string,
    requestId: string,
    lease: unknown,
    choices: Card[],
    spentBalance: number,
  ): Promise<PullOutcome> {
    const outcome = await eggOutcome(childId, choices, spentBalance + 1);
    const won = await claims.finishWithRefund(lease, requestId, childId, outcome);
    if (won) return outcome;
    return recoverLostLease(requestId, childId);
  }

  /**
   * Grant one copy of a card and return the standard card outcome: upsert the
   * collection count, apply any (theme, rarity) set-completion bonus (Inc16 FR5),
   * and return with the duplicate flag plus the given balance. Used by
   * claimEasterEgg's single-use offer claim, which has its own idempotency
   * (the signed offer's atomic spend) and isn't part of #kcpi's scope.
   */
  async function grantCardOutcome(
    childId: string,
    card: Card,
    newBalance: number,
  ): Promise<PullOutcome> {
    const { count } = await collections.grantCard(childId, card.id);
    await rewards.grantCompletionRewards(childId, [card.id]);
    return { outOfTokens: false, card, isDuplicate: count > 1, newBalance };
  }

  /**
   * A claim's ownership lease was lost mid-`completeGrant` (another caller's
   * stale takeover won the race). The claim is therefore someone else's
   * responsibility now: re-read it and replay its outcome if it finished, or
   * tell THIS caller to retry later — never re-attempt the draw ourselves,
   * which is what would double-grant.
   */
  async function recoverLostLease(requestId: string, childId: string): Promise<PullOutcome> {
    const existing = await claims.read(requestId);
    if (existing && existing.childId === childId && existing.status === "done") {
      return replayDone(childId, existing.outcome);
    }
    return stillInProgress(childId);
  }

  /**
   * Draw one card from `pool`, then grant it + mark the claim done atomically
   * (claims.finishWithCardGrant), THEN the (already idempotent,
   * unique-constrained) completion-bonus fan-out. `pool` is forwarded so the
   * reward cascade doesn't re-fetch the catalog just read — see
   * `grantCompletionRewards`'s doc. The shared tail of every normal-draw branch
   * in `completeGrant` below, egg-fallback included.
   *
   * `preOwned`, when given, is the child's owned-card-id set read BEFORE this
   * grant (concurrently with `pull()`'s other round trips) — this adds the
   * just-drawn card to it in memory instead of paying for a fourth round trip
   * (`ownedCardIds` again) to re-read what we already know we just wrote.
   */
  async function drawAndFinish(
    childId: string,
    requestId: string,
    lease: unknown,
    pool: Card[],
    spentBalance: number,
    preOwned?: Set<string>,
  ): Promise<PullOutcome> {
    if (pool.length === 0) throw new Error("empty pool");
    const card = drawCard(pool);
    const outcome = await claims.finishWithCardGrant(lease, requestId, childId, card.id, card, spentBalance);
    if (!outcome) return recoverLostLease(requestId, childId);
    const owned = preOwned ? new Set(preOwned).add(card.id) : undefined;
    await rewards.grantCompletionRewards(childId, [card.id], pool, owned);
    return outcome as PullOutcome;
  }

  /**
   * Complete the draw+grant for an already-spent claim (#kcpi): roll eggs,
   * else draw a card from the pool (category-scoped if `themeId` was chosen),
   * then finish the claim atomically together with the grant/refund so a kill
   * between "side effect" and "mark done" can never double-grant. On any
   * failure, refunds the spend and deletes the claim so the same request id
   * can be retried from scratch — a failed attempt leaves nothing to replay.
   * Shared by a fresh spend and a stale-claim recovery; both call this with
   * the balance that was actually spent and the lease proving ownership.
   *
   * `prePool`/`preOwned`, when given, are promises `pull()` already started
   * concurrently with its own `claimAndSpend` round trip — the common
   * non-egg path below awaits them instead of starting its own, overlapping
   * that latency with the spend's instead of paying for it afterward. Still
   * only read ONCE either way: a stale-claim recovery (no prefetch on hand)
   * falls back to fetching fresh here, same as before this existed.
   */
  async function completeGrant(
    childId: string,
    themeId: string | undefined,
    requestId: string,
    lease: unknown,
    spentBalance: number,
    prePool?: Promise<Card[]>,
    preOwned?: Promise<Set<string>>,
  ): Promise<PullOutcome> {
    // Guard both against ever being "unhandled" no matter which branch below
    // ends up using them (or neither does, e.g. an egg roll) — a no-op
    // sibling handler, not the one that actually consumes the value.
    prePool?.catch(() => {});
    preOwned?.catch(() => {});
    try {
      // Egg 1 (U6-FR2): rare roll → pick-1-of-5 epic+. Eggs draw from the FULL pool.
      if (rollEasterEgg()) {
        const pool = await catalog.listCards();
        if (pool.length === 0) throw new Error("empty pool");
        const choices = pickEasterEggChoices(pool, 5);
        if (choices.length > 0) return await finishEggOutcome(childId, requestId, lease, choices, spentBalance);
        // No eligible epic+ choices (tiny pool) — fall through to a normal draw
        // using the full pool we already have, themed in memory if requested.
        const drawPool = themeId ? pool.filter((c) => c.themeId === themeId) : pool;
        return await drawAndFinish(childId, requestId, lease, drawPool.length > 0 ? drawPool : pool, spentBalance);
      }

      // Egg 2 (Inc8 FR1): independent rare roll → pick-1-of-5 common/rare.
      if (rollEasterEgg()) {
        const pool = await catalog.listCards();
        if (pool.length === 0) throw new Error("empty pool");
        const choices = pickCommonRareChoices(pool, 5);
        if (choices.length > 0) return await finishEggOutcome(childId, requestId, lease, choices, spentBalance);
        const drawPool = themeId ? pool.filter((c) => c.themeId === themeId) : pool;
        return await drawAndFinish(childId, requestId, lease, drawPool.length > 0 ? drawPool : pool, spentBalance);
      }

      // Draw (rarity-weighted, pure). Category-scoped if a theme was chosen,
      // pushed into SQL — falls back to the full catalog if the themeId turns
      // out to be stale/unknown rather than erroring on an empty draw pool.
      const [pool, owned] = await Promise.all([
        prePool ?? catalog.listCards(themeId),
        preOwned ?? Promise.resolve(undefined),
      ]);
      if (pool.length === 0 && themeId) {
        const fullPool = await catalog.listCards();
        return await drawAndFinish(childId, requestId, lease, fullPool, spentBalance, owned);
      }
      return await drawAndFinish(childId, requestId, lease, pool, spentBalance, owned);
    } catch (err) {
      // Best-effort refund + claim cleanup (U4-BR6 / #kcpi). A no-op if the
      // lease was already lost to a stale takeover — that caller owns the
      // eventual outcome instead.
      try {
        await claims.cleanupFailure(lease, requestId, childId);
      } catch (cleanupErr) {
        console.error(`pull: cleanup failed for request ${requestId}`, cleanupErr);
      }
      throw err;
    }
  }

  /**
   * Pull one card for a child. Atomic, no double-spend (U4-BR1/BR2), AND
   * request-level idempotent (#kcpi): `requestId` is a client-generated id for
   * one tap, persisted by the client until an outcome is shown so a reload or
   * a retry-after-stuck replays rather than re-spends.
   *
   * 1) Atomically claim `requestId` and spend one token in the same
   *    statement (`ClaimStore.claimAndSpend`) — a duplicate id touches
   *    nothing. 2) Draw. 3) Grant, atomically paired with marking the claim
   *    done, so a kill between grant and bookkeeping can't double-grant on a
   *    later retry. If the original attempt for a duplicate id looks
   *    abandoned (no activity for `CLAIM_STALE_MS` — i.e. killed or timed
   *    out), a retry takes over and completes the draw for that SAME spend
   *    rather than charging a new one; if it's still genuinely in flight, the
   *    retry gets `{outOfTokens:false, stillInProgress:true, newBalance}` without touching
   *    anything (a return value, not a thrown error — it has to survive the
   *    server action boundary, where Next.js can redact a thrown message).
   *
   * `themeId` (Inc8 FR3) limits the normal draw to one category; eggs stay global.
   *
   * The catalog read and the owned-ids read a successful draw will need are
   * both independent of `claimAndSpend`'s own result (neither touches
   * `pull_claims` or `children`), so they're started here, overlapping their
   * round trip with the spend's instead of paying for them sequentially after
   * it — see `completeGrant`'s doc. Discarded (never awaited further) on the
   * out-of-tokens and duplicate-id paths, where nothing is drawn.
   */
  async function pull(
    childId: string,
    themeId: string | undefined,
    requestId: string,
  ): Promise<PullOutcome> {
    const prePool = catalog.listCards(themeId);
    const preOwned = collections.ownedCardIds(childId);

    let claimed = await claims.claimAndSpend(requestId, childId);
    if (claimed.kind === "out_of_tokens" && !(await claims.read(requestId))) {
      // Only an empty balance pays for the sweep's round trip; if it frees a
      // ticket held by an abandoned claim, spend that instead.
      if ((await claims.sweepAbandoned(childId, ABANDONED_CLAIM_SWEEP_MS, requestId)) > 0) {
        claimed = await claims.claimAndSpend(requestId, childId);
      }
      if (claimed.kind === "out_of_tokens") {
        prePool.catch(() => {});
        preOwned.catch(() => {});
        return { outOfTokens: true }; // no spend, no draw
      }
    }
    if (claimed.kind === "fresh") {
      return completeGrant(childId, themeId, requestId, claimed.lease, claimed.newBalance, prePool, preOwned);
    }

    prePool.catch(() => {});
    preOwned.catch(() => {});

    // Duplicate request id: replay the original's outcome once it's done, or
    // take over if the original looks abandoned.
    const existing = await claims.read(requestId);
    if (!existing) throw new Error("pull: claim not found for a known-duplicate request id");
    if (existing.childId !== childId) {
      throw new Error("pull: request id belongs to a different child");
    }
    if (existing.status === "done") return replayDone(childId, existing.outcome);

    const takeover = await claims.takeOverIfStale(requestId, CLAIM_STALE_MS);
    if (!takeover) return stillInProgress(childId);
    return completeGrant(childId, themeId, requestId, takeover.lease, takeover.spentBalance);
  }

  /**
   * The pull screen's ticket balance. At 0, first refunds any abandoned claims
   * (`ABANDONED_CLAIM_SWEEP_MS`): the screen shows no Discover button then, so
   * `pull()`'s own sweep could never run for a child whose last ticket is stuck.
   * No request id is excluded — a pending tap that old replays as refunded.
   */
  async function pullBalance(childId: string): Promise<number> {
    const balance = await children.readColumn(childId, "pullTokens");
    if (balance > 0) return balance;
    if ((await claims.sweepAbandoned(childId, ABANDONED_CLAIM_SWEEP_MS, "")) === 0) return balance;
    return children.readColumn(childId, "pullTokens");
  }

  /**
   * Redeem the unified Easter Egg ticket (Inc19 FR3/FR4): guard on the ticket
   * balance (>= 1 held), roll a rarity by the normal pull odds, then offer a
   * pick-1-of-5 of that exact rarity from the FULL pool. The ticket is NOT spent
   * here — spent atomically at claim (single-use); the offer pins `easterEgg` so
   * claim decrements `easterEggTickets`. The rolled tier rides along for the
   * surprise reveal. Returns out-of-tokens when no Easter Egg ticket is held.
   */
  async function pullEasterEgg(childId: string): Promise<PullOutcome> {
    const held = await children.readColumn(childId, "easterEggTickets");
    if (held < 1) return { outOfTokens: true };

    const rarity = rollWeightedRarity();
    // The pool fetch and the normal-token balance read don't depend on each
    // other — run them concurrently instead of one after the other.
    const [pool, balance] = await Promise.all([
      catalog.listCards(),
      children.readColumn(childId, "pullTokens"),
    ]);
    const choices = pickRarityChoices(pool, rarity, 5);
    if (choices.length === 0) throw new Error("pullEasterEgg: no eligible cards");

    return eggOutcome(childId, choices, balance, { easterEgg: true, rolledRarity: rarity }, rarity);
  }

  /**
   * Claim the card the child picked from an easter-egg offer (U6-FR2). Verifies
   * the signed offer (signature + expiry + child) and that the pick was among the
   * offered cards, then spends exactly one column atomically and grants the card.
   * The atomic spend makes the signed offer single-use.
   */
  async function claimEasterEgg(
    childId: string,
    offer: string,
    chosenCardId: string,
  ): Promise<PullOutcome> {
    const payload = await verifyOffer(offer, env.authSecret, Date.now());
    if (!payload) throw new Error("claimEasterEgg: invalid or expired offer");
    if (payload.childId !== childId) throw new Error("claimEasterEgg: child mismatch");
    if (!payload.cardIds.includes(chosenCardId)) {
      throw new Error("claimEasterEgg: card not in offer");
    }

    // The offer's cardIds are server-chosen and HMAC-signed, so membership above
    // is the security boundary. Just confirm the card still exists.
    const card = await catalog.getCard(chosenCardId);
    if (!card) throw new Error("claimEasterEgg: card not found");

    // Atomic spend — the unified Easter Egg ticket when the offer pins `easterEgg`,
    // otherwise a normal token (the random ~1% eggs). Single-use: the guarded
    // decrement makes the signed offer un-replayable.
    const key: BalanceColumn = payload.easterEgg ? "easterEggTickets" : "pullTokens";
    const newBalance = await children.spendOne(childId, key);
    if (newBalance === null) return { outOfTokens: true };

    return grantCardOutcome(childId, card, newBalance);
  }

  /**
   * Sacrifice SACRIFICE_COST copies of a card for one unified Easter Egg ticket
   * (Inc19 FR7). Free (spends copies, not tokens). Atomic guarded decrement
   * prevents over-spending; rarity no longer matters — every sacrifice yields the
   * same 🥚 ticket.
   *
   * A sacrifice always leaves the child at least ONE copy — you burn duplicates,
   * never your only card. `minHeld = SACRIFICE_COST + 1` enforces that: a holding
   * of exactly SACRIFICE_COST can't be burned to zero (which is why the binder
   * only offers the panel at `> SACRIFICE_COST`).
   */
  async function sacrifice(childId: string, cardId: string): Promise<SacrificeResult> {
    const source = await catalog.getCard(cardId);
    if (!source) throw new Error("sacrifice: card not found");

    // Atomic CAS: only succeeds while the child holds enough to burn AND keep one.
    const burned = await collections.removeCard(childId, cardId, SACRIFICE_COST, SACRIFICE_COST + 1);
    if (burned === null) throw new Error("sacrifice: not enough copies");

    // Atomic +1 that returns the new balance (never negative).
    const newBalance = await children.clampedGrant(childId, "easterEggTickets", 1);
    if (newBalance === null) throw new Error("sacrifice: child not found");

    return { newBalance };
  }

  return { pull, pullBalance, pullEasterEgg, claimEasterEgg, sacrifice };
}

export type PullService = ReturnType<typeof makePullService>;
