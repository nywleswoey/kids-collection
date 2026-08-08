import type { QuizCompletionRow } from "@/db/schema";

/** A recorded quiz attempt (no id/createdAt — the store stamps those). */
export interface QuizCompletionInput {
  childId: string;
  topic: string;
  correct: number;
  total: number;
  passed: boolean;
  awarded: boolean;
}

/**
 * QuizStore — the persistence port for quiz attempts (`quiz_completions`).
 * Reads back completions for the daily-cap scan and the admin activity view;
 * records a new attempt.
 *
 * Two adapters: `pgQuizStore` (prod) and `inMemoryQuizStore` (tests), kept honest
 * by tests/contracts/quiz-store-contract.ts.
 */
export interface QuizStore {
  /** All of a child's completions (the cap scan buckets these by SGT day). */
  completionsFor(childId: string): Promise<QuizCompletionRow[]>;

  /** A child's most recent completions, newest first (admin activity view). */
  recentCompletions(childId: string, limit: number): Promise<QuizCompletionRow[]>;

  /** Record one attempt. */
  recordCompletion(entry: QuizCompletionInput): Promise<void>;

  /** Question ids this child has already ANSWERED in `topic` (Inc25 FR19).
   *  Grammar only — maths ids are positional and name a different question every
   *  attempt, so tracking them would be meaningless. */
  seenQuestionIds(childId: string, topic: string): Promise<string[]>;

  /**
   * Record `questionIds` as seen. Re-recording the same ids is a no-op, so a
   * replayed submission cannot double-write.
   *
   * When `reset`, the topic's existing rows are cleared FIRST and atomically
   * with the insert — the bank has been exhausted and the cycle restarts from
   * the five just answered. The two halves must not be separate calls: an
   * interruption between them would leave an empty seen-set and make those five
   * immediately eligible again.
   */
  markQuestionsSeen(entry: SeenQuestionsInput): Promise<void>;
}

/** One "these were answered" write. `reset` restarts the topic's cycle. */
export interface SeenQuestionsInput {
  childId: string;
  topic: string;
  questionIds: string[];
  reset: boolean;
}
