"use server";

import { withActiveChild } from "@/features/actions/action";
import { rewardService } from "./service.prod";

/** Mark the given pending collection-reward modals as shown (Inc16 FR5). */
export async function markRewardsShownAction(ids: string[]): Promise<void> {
  await withActiveChild((childId) => rewardService.markRewardsShown(childId, ids));
}
