"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import { pull, claimEasterEgg, type PullOutcome } from "./pull-service";
import { grant } from "./token-service";

/** Pull for the current active child (C1). */
export async function pullAction(): Promise<PullOutcome> {
  const child = await getActiveChild();
  if (!child) throw new Error("No active profile");
  const outcome = await pull(child.id);
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
