/** Quiz domain types (Inc11). Technology-agnostic. */

export type QuizSubject = "math" | "grammar";

/** A single multiple-choice question. `correct` is the correct option string;
 * `explanation` is a one-line "why" shown as immediate feedback (Inc13 FR6).
 *
 * Inc13 FR6: `correct`/`explanation` ARE sent to the client so feedback shows
 * instantly with no round-trip. Reward integrity is unaffected — the award is
 * still re-scored server-side against the signed offer (the client key only
 * drives display). */
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: string;
  explanation: string;
  /** Inc25 FR13: an optional picture for the prompt, as STRUCTURE rather than
   * markup — so generators stay pure and property-testable, and no child-facing
   * screen ever needs `dangerouslySetInnerHTML`. Presentation only: it does not
   * cross the signed-offer boundary (the offer signs answers + questionIds). */
  visual?: QuizVisual;
}

/** A bar model: a rectangle in `parts` equal segments, `shaded` of them filled.
 *  Bar models only — circles and object groups are out of scope. */
export interface QuizVisual {
  kind: "bar";
  parts: number;
  shaded: number;
}

/** Question as sent to the client. Inc13 FR6: carries the answer key +
 * explanation for immediate per-question feedback. */
export type ClientQuestion = QuizQuestion;

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

/** Number of questions per quiz. */
export const QUIZ_LENGTH = 5;
/** Maximum Easter Egg tickets earnable per day from quizzes (D6=D). */
export const DAILY_TICKET_CAP = 3;

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

/** One row of the admin quiz-activity view (Inc11 FR8). */
export interface QuizActivityRow {
  topic: string;
  title: string;
  correct: number;
  total: number;
  passed: boolean;
  awarded: boolean;
  at: string; // ISO
}

export interface QuizActivity {
  recent: QuizActivityRow[];
  earnedToday: number;
  earnedAllTime: number;
}
