"use server";

import { getActiveChild } from "@/features/profiles/active-profile";
import { rewardService } from "./service.prod";

/** Mark the given pending collection-reward modals as shown (Inc16 FR5). */
export async function markRewardsShownAction(ids: string[]): Promise<void> {
  const child = await getActiveChild();
  if (!child) return;
  await rewardService.markRewardsShown(child.id, ids);
}
