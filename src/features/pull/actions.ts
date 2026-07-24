"use server";

import { withParent, withActiveChild } from "@/features/actions/action";
import { getParent } from "@/features/auth/guard";
import { getPostHogClient } from "@/lib/posthog-server";
import { pullService } from "./pull-service.prod";
import { tokenService } from "./token-service.prod";
import type { PullOutcome, SacrificeResult } from "./pull-service";
import type { EggTicket, Rarity } from "@/lib/types";

const PULL_PATHS = ["/play/pull", "/play/binder"] as const;

/**
 * Parent-gated grant of `amount` (validated as a nonzero integer), revalidating
 * the given admin path plus the pull view. Shared body of the three grant entries.
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

/** Pull for the current active child (C1). Optional category (Inc8 FR3). */
export async function pullAction(themeId?: string): Promise<PullOutcome> {
  return withActiveChild((childId) => pullService.pull(childId, themeId), PULL_PATHS, { label: "pull" });
}

/** Spend a special egg ticket for a guaranteed pick-1-of-5 (Inc9 FR4). */
export async function pullSpecialEggAction(
  kind: EggTicket,
): Promise<PullOutcome> {
  return withActiveChild((childId) => pullService.pullSpecialEgg(childId, kind), PULL_PATHS, { label: "pull_special_egg" });
}

/** Redeem a rarity-pick ticket for a pick-1-of-5 of that rarity (Inc16 FR2). */
export async function pullRarityPickAction(
  rarity: Rarity,
): Promise<PullOutcome> {
  return withActiveChild((childId) => pullService.pullRarityPick(childId, rarity), PULL_PATHS, { label: "pull_rarity_pick" });
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

/** Sacrifice 3 copies of a card for a rarity-pick ticket (Inc16 FR1). Parent-gated
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

/** Parent grants a special egg ticket to a child (Inc9 FR4). */
export async function grantSpecialTicketAction(
  childId: string,
  kind: EggTicket,
  amount: number,
): Promise<number> {
  const newBalance = await parentGrant(amount, "/admin", (n) => tokenService.grantSpecial(childId, kind, n), "grant_special_ticket");
  const parent = await getParent();
  if (parent) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "special_ticket_granted", properties: { ticket_kind: kind, amount: Math.trunc(Number(amount)) } });
      await posthog.flush();
    }
  }
  return newBalance;
}

/** Parent grants a rarity-pick ticket to a child (Inc16 FR3). */
export async function grantRarityPickTicketAction(
  childId: string,
  rarity: Rarity,
  amount: number,
): Promise<number> {
  const newBalance = await parentGrant(amount, "/admin", (n) => tokenService.grantPickTicket(childId, rarity, n), "grant_rarity_pick_ticket");
  const parent = await getParent();
  if (parent) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "rarity_pick_granted", properties: { rarity, amount: Math.trunc(Number(amount)) } });
      await posthog.flush();
    }
  }
  return newBalance;
}
