"use server";

import { revalidatePath } from "next/cache";
import { requireActiveChild } from "@/features/profiles/active-profile";
import { quizService } from "./quiz-service.prod";
import type { BuiltQuiz } from "./quiz-service";
import type { QuizOutcome } from "./types";

/** Start a quiz for the active child (Inc11). Server picks questions + signs. */
export async function startQuizAction(topicId: string): Promise<BuiltQuiz> {
  const child = await requireActiveChild();
  return quizService.buildQuiz(child.id, topicId);
}

/** Submit answers; server re-scores + grants (subject to caps). */
export async function submitQuizAction(
  offer: string,
  picks: string[],
): Promise<QuizOutcome> {
  const child = await requireActiveChild();
  const outcome = await quizService.submitQuiz(child.id, offer, picks);
  revalidatePath("/play/home");
  revalidatePath("/play/learn");
  return outcome;
}
