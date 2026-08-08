import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizCompletions, quizSeenQuestions } from "@/db/schema";
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

  async seenQuestionIds(childId, topic) {
    const rows = await db
      .select({ questionId: quizSeenQuestions.questionId })
      .from(quizSeenQuestions)
      .where(and(eq(quizSeenQuestions.childId, childId), eq(quizSeenQuestions.topic, topic)));
    return rows.map((r) => r.questionId);
  },

  async markQuestionsSeen({ childId, topic, questionIds, reset }) {
    if (questionIds.length === 0) return;
    const insert = db
      .insert(quizSeenQuestions)
      .values(questionIds.map((questionId) => ({ childId, topic, questionId })))
      // Idempotent: a replayed offer re-inserts the same (child, topic, question)
      // rows, which the primary key absorbs.
      .onConflictDoNothing();

    if (!reset) {
      await insert;
      return;
    }
    // neon-http has no interactive transaction (see collection-store.pg.ts
    // swapCards), so the clear+insert goes through db.batch — the same idiom
    // removeCard uses — to keep the reset atomic.
    await db.batch([
      db
        .delete(quizSeenQuestions)
        .where(and(eq(quizSeenQuestions.childId, childId), eq(quizSeenQuestions.topic, topic))),
      insert,
    ]);
  },
};
