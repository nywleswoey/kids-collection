"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import {
  pull,
  pullSpecialEgg,
  claimEasterEgg,
  sacrifice,
  type PullOutcome,
  type SacrificeResult,
} from "./pull-service";
import { grant, grantSpecial } from "./token-service";
import type { EggTicket } from "@/lib/types";

/** Pull for the current active child (C1). Optional category (Inc8 FR3). */
export async function pullAction(themeId?: string): Promise<PullOutcome> {
  const child = await getActiveChild();
  if (!child) throw new Error("No active profile");
  const outcome = await pull(child.id, themeId);
  revalidatePath("/play/pull");
  revalidatePath("/play/binder");
  return outcome;
}

/** Spend a special egg ticket for a guaranteed pick-1-of-5 (Inc9 FR4). */
export async function pullSpecialEggAction(
  kind: EggTicket,
): Promise<PullOutcome> {
  const child = await getActiveChild();
  if (!child) throw new Error("No active profile");
  const outcome = await pullSpecialEgg(child.id, kind);
  revalidatePath("/play/pull");
  revalidatePath("/play/binder");
  return outcome;
}

/** Claim the picked card from an easter-egg offer (U6-FR2). */
export async function claimEasterEggAction(
  offer: string,
  chosenCardId: string,
): Promise<PullOutcome> {
  const child = await getActiveChild();
  if (!child) throw new Error("No active profile");
  const outcome = await claimEasterEgg(child.id, offer, chosenCardId);
  revalidatePath("/play/pull");
  revalidatePath("/play/binder");
  return outcome;
}

/** Sacrifice 3 copies of a card for a random upgrade (Inc8 FR2). */
export async function sacrificeAction(
  cardId: string,
): Promise<SacrificeResult> {
  const child = await getActiveChild();
  if (!child) throw new Error("No active profile");
  const result = await sacrifice(child.id, cardId);
  revalidatePath("/play/binder");
  revalidatePath(`/play/binder/${cardId}`);
  revalidatePath(`/play/binder/${result.card.id}`);
  return result;
}

/** Parent grants tokens to a child (F1). */
export async function grantTokensAction(
  childId: string,
  amount: number,
): Promise<number> {
  await requireParent();
  const n = Math.trunc(Number(amount));
  if (!Number.isFinite(n) || n === 0) throw new Error("Invalid grant amount");
  const balance = await grant(childId, n);
  revalidatePath("/admin/profiles");
  revalidatePath("/play/pull");
  return balance;
}

/** Parent grants a special egg ticket to a child (Inc9 FR4). */
export async function grantSpecialTicketAction(
  childId: string,
  kind: EggTicket,
  amount: number,
): Promise<number> {
  await requireParent();
  const n = Math.trunc(Number(amount));
  if (!Number.isFinite(n) || n === 0) throw new Error("Invalid grant amount");
  const balance = await grantSpecial(childId, kind, n);
  revalidatePath("/admin");
  revalidatePath("/play/pull");
  return balance;
}
