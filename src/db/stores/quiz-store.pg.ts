import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizCompletions } from "@/db/schema";
import type { QuizStore } from "./quiz-store";

/**
 * Postgres adapter for QuizStore. Holds the quiz_completions SQL that was inlined
 * across quiz-service (the cap scan) and quiz/activity (the recent view + the
 * per-topic scan). The only `server-only` code behind the seam.
 */
export const pgQuizStore: QuizStore = {
  completionsFor(childId) {
    return db
      .select()
      .from(quizCompletions)
      .where(eq(quizCompletions.childId, childId));
  },

  recentCompletions(childId, limit) {
    return db
      .select()
      .from(quizCompletions)
      .where(eq(quizCompletions.childId, childId))
      .orderBy(desc(quizCompletions.createdAt))
      .limit(limit);
  },

  async recordCompletion(entry) {
    await db.insert(quizCompletions).values(entry);
  },
};
