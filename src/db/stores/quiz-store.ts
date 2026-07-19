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
}
