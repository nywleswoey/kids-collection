"use server";

import { getActiveChild } from "@/features/profiles/active-profile";
import { markRewardsShown } from "./service";

/** Mark the given pending collection-reward modals as shown (Inc16 FR5). */
export async function markRewardsShownAction(ids: string[]): Promise<void> {
  const child = await getActiveChild();
  if (!child) return;
  await markRewardsShown(child.id, ids);
}
