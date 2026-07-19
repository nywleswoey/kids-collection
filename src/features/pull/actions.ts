"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/features/auth/guard";
import { requireActiveChild } from "@/features/profiles/active-profile";
import { pullService } from "./pull-service.prod";
import { tokenService } from "./token-service.prod";
import type { PullOutcome, SacrificeResult } from "./pull-service";
import type { EggTicket, Rarity } from "@/lib/types";

/**
 * Run a pull-family action for the active child and revalidate the pull +
 * binder views. Shared body of the four pull/claim entry points.
 */
async function activePull<T>(run: (childId: string) => Promise<T>): Promise<T> {
  const child = await requireActiveChild();
  const result = await run(child.id);
  revalidatePath("/play/pull");
  revalidatePath("/play/binder");
  return result;
}

/**
 * Parent-gated grant of `amount` (validated as a nonzero integer) via `run`,
 * revalidating the given admin path plus the pull view. Shared body of the
 * three grant entry points.
 */
async function parentGrant(
  amount: number,
  adminPath: string,
  run: (n: number) => Promise<number>,
): Promise<number> {
  await requireParent();
  const n = Math.trunc(Number(amount));
  if (!Number.isFinite(n) || n === 0) throw new Error("Invalid grant amount");
  const balance = await run(n);
  revalidatePath(adminPath);
  revalidatePath("/play/pull");
  return balance;
}

/** Pull for the current active child (C1). Optional category (Inc8 FR3). */
export async function pullAction(themeId?: string): Promise<PullOutcome> {
  return activePull((childId) => pullService.pull(childId, themeId));
}

/** Spend a special egg ticket for a guaranteed pick-1-of-5 (Inc9 FR4). */
export async function pullSpecialEggAction(
  kind: EggTicket,
): Promise<PullOutcome> {
  return activePull((childId) => pullService.pullSpecialEgg(childId, kind));
}

/** Redeem a rarity-pick ticket for a pick-1-of-5 of that rarity (Inc16 FR2). */
export async function pullRarityPickAction(
  rarity: Rarity,
): Promise<PullOutcome> {
  return activePull((childId) => pullService.pullRarityPick(childId, rarity));
}

/** Claim the picked card from an easter-egg offer (U6-FR2). */
export async function claimEasterEggAction(
  offer: string,
  chosenCardId: string,
): Promise<PullOutcome> {
  return activePull((childId) => pullService.claimEasterEgg(childId, offer, chosenCardId));
}

/** Sacrifice 3 copies of a card for a rarity-pick ticket (Inc16 FR1). Parent-gated
 * (the check moved up from the service when it moved behind the Store seam). */
export async function sacrificeAction(
  cardId: string,
): Promise<SacrificeResult> {
  await requireParent();
  const child = await requireActiveChild();
  const result = await pullService.sacrifice(child.id, cardId);
  revalidatePath("/play/binder");
  revalidatePath(`/play/binder/${cardId}`);
  revalidatePath("/play/pull");
  return result;
}

/** Parent grants tokens to a child (F1). */
export async function grantTokensAction(
  childId: string,
  amount: number,
): Promise<number> {
  return parentGrant(amount, "/admin/profiles", (n) => tokenService.grant(childId, n));
}

/** Parent grants a special egg ticket to a child (Inc9 FR4). */
export async function grantSpecialTicketAction(
  childId: string,
  kind: EggTicket,
  amount: number,
): Promise<number> {
  return parentGrant(amount, "/admin", (n) => tokenService.grantSpecial(childId, kind, n));
}

/** Parent grants a rarity-pick ticket to a child (Inc16 FR3). */
export async function grantRarityPickTicketAction(
  childId: string,
  rarity: Rarity,
  amount: number,
): Promise<number> {
  return parentGrant(amount, "/admin", (n) => tokenService.grantPickTicket(childId, rarity, n));
}
