"use server";

import { withActiveChild } from "@/features/actions/action";
import { quizService } from "./quiz-service.prod";
import type { BuiltQuiz } from "./quiz-service";
import type { QuizOutcome } from "./types";

/** Start a quiz for the active child (Inc11). Server picks questions + signs. */
export async function startQuizAction(topicId: string): Promise<BuiltQuiz> {
  return withActiveChild((childId) => quizService.buildQuiz(childId, topicId), undefined, { label: "start_quiz" });
}

/** Submit answers; server re-scores + grants (subject to caps). */
export async function submitQuizAction(
  offer: string,
  picks: string[],
): Promise<QuizOutcome> {
  return withActiveChild(
    (childId) => quizService.submitQuiz(childId, offer, picks),
    ["/play/home", "/play/learn"],
    { label: "submit_quiz" },
  );
}
