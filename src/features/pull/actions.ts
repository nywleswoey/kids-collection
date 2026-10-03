"use server";

import { withParent, withActiveChild } from "@/lib/actions";
import { getParent } from "@/features/auth/guard";
import { getPostHogClient } from "@/lib/posthog-server";
import { pullService } from "./pull-service.prod";
import { tokenService } from "./token-service.prod";
import { isPullRequestId } from "./pending-request";
import type { PullOutcome, SacrificeResult } from "./pull-service";

const PULL_PATHS = ["/play/pull", "/play/binder"] as const;

/**
 * Parent-gated grant of `amount` (validated as a nonzero integer), revalidating
 * the given admin path plus the pull view. Shared body of the two grant entries.
 */
function parentGrant(
  amount: number,
  adminPath: string,
  run: (n: number) => Promise<number>,
  label: string,
): Promise<number> {
  const n = Math.trunc(Number(amount));
  if (!Number.isFinite(n) || n === 0) throw new Error("Invalid grant amount");
  return withParent(() => run(n), [adminPath, "/play/pull"], label);
}

/**
 * Pull for the current active child (C1). Optional category (Inc8 FR3).
 *
 * `requestId` is a client-generated id for one tap (#kcpi): the client keeps
 * it until an outcome is shown, so a reload or a stuck-loading retry replays
 * the SAME request instead of spending a new ticket. See pull-service.ts
 * `pull()` for the idempotency contract. A tab still running a pre-#kcpi
 * bundle calls this as `pullAction(themeId?)`; rejecting a non-id here keeps
 * that from crashing the insert or replaying one draw forever per theme.
 *
 * No `revalidatePath` here (unlike the other pull actions below): any
 * `revalidatePath` call — even for a route other than the current one —
 * makes Next.js render the CURRENT route's full RSC flight tree into THIS
 * action's own response before it can resolve (`pathWasRevalidated` is a
 * single store-wide flag, not scoped to which path was revalidated; see
 * `node_modules/next/dist/server/web/spec-extension/revalidate.js` and
 * `action-handler.js`'s `skipFlight: !workStore.pathWasRevalidated`). That
 * re-render was `/play/pull`'s own full `listCards()` + balance + themes
 * fetch happening a second time, synchronously inside the "Launching…" wait,
 * for data `PullButton` never reads from the page anyway — the balance, egg
 * count, and won card all come from this action's own return value
 * (`setBalance`/`setOutcome` in `PullButton.tsx`). Skipping it also skips the
 * client router-cache purge a revalidation brings, which back/forward
 * navigation would otherwise restore stale pages from — so `PullButton` calls
 * `router.refresh()` when it unmounts after a pull, which never queues a later
 * pull behind a page re-render.
 */
export async function pullAction(requestId: string, themeId?: string): Promise<PullOutcome> {
  if (!isPullRequestId(requestId)) throw new Error("pullAction: invalid request id");
  return withActiveChild((childId) => pullService.pull(childId, themeId, requestId), undefined, {
    label: "pull",
  });
}

/** Redeem the unified Easter Egg ticket for a weighted-roll pick-1-of-5 (Inc19 FR3). */
export async function pullEasterEggAction(): Promise<PullOutcome> {
  return withActiveChild((childId) => pullService.pullEasterEgg(childId), PULL_PATHS, { label: "pull_easter_egg" });
}

/** Claim the picked card from an easter-egg offer (U6-FR2). */
export async function claimEasterEggAction(
  offer: string,
  chosenCardId: string,
): Promise<PullOutcome> {
  return withActiveChild(
    (childId) => pullService.claimEasterEgg(childId, offer, chosenCardId),
    PULL_PATHS,
    { label: "claim_easter_egg" },
  );
}

/** Sacrifice 3 copies of a card for an Easter Egg ticket (Inc16 FR1). Parent-gated
 * (the check moved up from the service when it moved behind the Store seam). */
export async function sacrificeAction(
  cardId: string,
): Promise<SacrificeResult> {
  return withActiveChild(
    (childId) => pullService.sacrifice(childId, cardId),
    ["/play/binder", `/play/binder/${cardId}`, "/play/pull"],
    { parent: true, label: "sacrifice" },
  );
}

/** Parent grants tokens to a child (F1). */
export async function grantTokensAction(
  childId: string,
  amount: number,
): Promise<number> {
  const newBalance = await parentGrant(amount, "/admin/profiles", (n) => tokenService.grant(childId, n), "grant_tokens");
  const parent = await getParent();
  if (parent) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "tokens_granted", properties: { amount: Math.trunc(Number(amount)) } });
      await posthog.flush();
    }
  }
  return newBalance;
}

/** Parent grants a unified Easter Egg ticket to a child (Inc19 FR6). */
export async function grantEasterEggTicketAction(
  childId: string,
  amount: number,
): Promise<number> {
  const newBalance = await parentGrant(amount, "/admin", (n) => tokenService.grantEasterEgg(childId, n), "grant_easter_egg_ticket");
  const parent = await getParent();
  if (parent) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "easter_egg_ticket_granted", properties: { amount: Math.trunc(Number(amount)) } });
      await posthog.flush();
    }
  }
  return newBalance;
}
