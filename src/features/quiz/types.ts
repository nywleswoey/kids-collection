/** Quiz domain types (Inc11). Technology-agnostic. */

export type QuizSubject = "math" | "grammar";

/** A single multiple-choice question served to the child. `correct` is the
 * correct option string; it is stripped before sending to the client and lives
 * only inside the signed offer (server-authoritative scoring). */
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: string;
}

/** Question as sent to the client — no answer key. */
export type ClientQuestion = Omit<QuizQuestion, "correct">;

export interface Lesson {
  intro: string;
  example: string;
}

export interface Topic {
  id: string;
  subject: QuizSubject;
  title: string;
  lesson: Lesson;
}

export const QUIZ_LENGTH = 5;
export const DAILY_TICKET_CAP = 3; // global lucky tickets/day from quizzes (D6=D)

/** Why an award was or wasn't granted, for a friendly message. */
export type AwardReason = "ok" | "failed" | "topic-done" | "daily-cap";

export interface QuizOutcome {
  passed: boolean;
  correct: number;
  total: number;
  awarded: boolean;
  reason: AwardReason;
  /** Indexes (0-based) of the questions answered wrong. */
  wrongIndexes: number[];
}
