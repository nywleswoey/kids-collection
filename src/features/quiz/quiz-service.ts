import { getTopic, topicTitle } from "./topics";
import { generateMathQuestions, isMathTopic } from "./math-gen";
import { GRAMMAR_BANKS, isGrammarTopic } from "./grammar-bank";
import { makeQuizOffer, verifyQuizOffer } from "./quiz-offer";
import { sgtDayKey, decideAward } from "./cap";
import { isTopicOfferedToday } from "./daily-topics";
import { coversBank, selectUnseenFirst } from "./seen-select";
import { sample } from "@/lib/rng";
import { env } from "@/lib/env";
import type { ChildStore } from "@/db/stores/child-store";
import type { QuizStore } from "@/db/stores/quiz-store";
import {
  QUIZ_LENGTH,
  type ClientQuestion,
  type QuizActivity,
  type QuizActivityRow,
  type QuizOutcome,
  type QuizQuestion,
} from "./types";

const OFFER_TTL_MS = 10 * 60_000; // 10 min
const ACTIVITY_LIMIT = 50;

/** Inc25 FR20: `seenIds` biases grammar toward questions this child has not
 *  answered. Maths ignores it — its ids are positional, so the same id names a
 *  different question every attempt. */
function buildQuestions(
  topicId: string,
  rng: () => number,
  seenIds: readonly string[] = [],
): QuizQuestion[] {
  if (isMathTopic(topicId)) return generateMathQuestions(topicId, QUIZ_LENGTH, rng);
  if (isGrammarTopic(topicId)) {
    return selectUnseenFirst(GRAMMAR_BANKS[topicId], seenIds, QUIZ_LENGTH, rng).map((q) => ({
      ...q,
      // shuffle options so the correct one isn't always first
      options: sample(q.options, q.options.length, rng),
    }));
  }
  throw new Error(`buildQuestions: unknown topic ${topicId}`);
}

export interface BuiltQuiz {
  topic: string;
  questions: ClientQuestion[];
  offer: string;
}

export interface QuizDeps {
  quiz: QuizStore;
  children: ChildStore;
}

/**
 * Quiz orchestration (Inc11), parameterized by its ports. `buildQuiz` is pure
 * (questions + signed offer); `submitQuiz` re-scores server-side and grants an
 * Easter Egg ticket via ChildStore (Inc19); the activity reads bucket completions
 * by SGT day. Prod wiring: `quiz-service.prod.ts`.
 */
export function makeQuizService({ quiz, children }: QuizDeps) {
  /** Assemble a quiz + signed offer. The offer holds the authoritative answer
   *  keys for scoring; the client copy also carries keys for feedback (Inc13 FR6). */
  async function buildQuiz(
    childId: string,
    topicId: string,
    nowMs: number = Date.now(),
    rng: () => number = Math.random,
  ): Promise<BuiltQuiz> {
    if (!getTopic(topicId)) throw new Error(`buildQuiz: unknown topic ${topicId}`);

    // Inc25 FR10: THE boundary for "three topics a day". The picker hides the
    // other seven and the route redirects, but startQuizAction is a Server
    // Action — a directly invocable POST that takes the topic id from the
    // client — so neither is enforcement. This check sits where childId is
    // already server-resolved, and it gates membership only: replaying a topic
    // already passed today stays allowed (and unrewarded, via decideAward).
    if (!isTopicOfferedToday(childId, sgtDayKey(nowMs), topicId))
      throw new Error(`buildQuiz: topic not offered today ${topicId}`);

    // Read-only on this path — seen-rows are written on submit, never here, so
    // an abandoned quiz burns nothing (OQ-DR-T1).
    const seenIds = isGrammarTopic(topicId)
      ? await quiz.seenQuestionIds(childId, topicId)
      : [];
    const questions = buildQuestions(topicId, rng, seenIds);
    const offer = await makeQuizOffer(
      {
        childId,
        topic: topicId,
        answers: questions.map((q) => q.correct),
        questionIds: questions.map((q) => q.id),
        exp: nowMs + OFFER_TTL_MS,
      },
      env.authSecret,
    );
    return { topic: topicId, questions, offer };
  }

  /**
   * Score a submission server-side and grant an Easter Egg ticket if eligible
   * (FR6/FR7). Correct answers come from the signed offer — the client only sends
   * its picks. Caps are enforced by scanning today's (SGT) completions.
   */
  async function submitQuiz(
    childId: string,
    offer: string,
    picks: string[],
    nowMs: number = Date.now(),
  ): Promise<QuizOutcome> {
    const payload = await verifyQuizOffer(offer, env.authSecret, nowMs);
    if (!payload) throw new Error("submitQuiz: invalid or expired offer");
    if (payload.childId !== childId) throw new Error("submitQuiz: child mismatch");

    const answers = payload.answers;
    const wrongIndexes: number[] = [];
    for (let i = 0; i < answers.length; i++) {
      if (picks[i] !== answers[i]) wrongIndexes.push(i);
    }
    const correct = answers.length - wrongIndexes.length;
    const passed = wrongIndexes.length === 0 && answers.length === QUIZ_LENGTH;

    const day = sgtDayKey(nowMs);

    // Look at today's (SGT) completions for this child to enforce caps.
    const todays = await quiz.completionsFor(childId);
    let awardedTodayGlobal = 0;
    let topicAwardedToday = false;
    for (const row of todays) {
      if (sgtDayKey(row.createdAt.getTime()) !== day) continue;
      if (row.awarded) {
        awardedTodayGlobal++;
        if (row.topic === payload.topic) topicAwardedToday = true;
      }
    }

    const { award, reason } = decideAward(passed, awardedTodayGlobal, topicAwardedToday);

    await quiz.recordCompletion({
      childId,
      topic: payload.topic,
      correct,
      total: answers.length,
      passed,
      awarded: award,
    });

    if (award) await children.incrementColumn(childId, "easterEggTickets", 1);

    // Inc25 FR20: "seen" means ANSWERED, so this is the only place seen-rows are
    // written. Ids come from the SIGNED offer, never from the client. A
    // pre-deploy offer carries none (FR17) — record nothing and move on.
    const servedIds = payload.questionIds ?? [];
    if (servedIds.length > 0 && isGrammarTopic(payload.topic)) {
      const bankIds = GRAMMAR_BANKS[payload.topic].map((q) => q.id);
      const seenIds = await quiz.seenQuestionIds(childId, payload.topic);
      await quiz.markQuestionsSeen({
        childId,
        topic: payload.topic,
        questionIds: servedIds,
        // Bank exhausted: restart the cycle from the five just answered rather
        // than reaching a state where every question counts as seen.
        reset: coversBank(bankIds, seenIds, servedIds),
      });
    }

    return { passed, correct, total: answers.length, awarded: award, reason, wrongIndexes };
  }

  /** Quiz activity for the admin view (Inc11 FR8). */
  async function getQuizActivity(
    childId: string,
    nowMs: number = Date.now(),
  ): Promise<QuizActivity> {
    const rows = await quiz.recentCompletions(childId, ACTIVITY_LIMIT);
    const today = sgtDayKey(nowMs);
    let earnedToday = 0;
    let earnedAllTime = 0;
    for (const r of rows) {
      if (r.awarded) {
        earnedAllTime++;
        if (sgtDayKey(r.createdAt.getTime()) === today) earnedToday++;
      }
    }
    const recent: QuizActivityRow[] = rows.slice(0, 8).map((r) => ({
      topic: r.topic,
      // Inc25 FR6: resolves retired ids (number-bonds-100) to a label rather
      // than showing a raw id; falls back to the raw id for anything unknown.
      title: topicTitle(r.topic),
      correct: r.correct,
      total: r.total,
      passed: r.passed,
      awarded: r.awarded,
      at: r.createdAt.toISOString(),
    }));
    return { recent, earnedToday, earnedAllTime };
  }

  /** Which topics the child has already been awarded for today (SGT) — for the
   *  picker to show "earned today" (FR2). */
  async function topicsAwardedToday(
    childId: string,
    nowMs: number = Date.now(),
  ): Promise<Set<string>> {
    const rows = await quiz.completionsFor(childId);
    const today = sgtDayKey(nowMs);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.awarded && sgtDayKey(r.createdAt.getTime()) === today) set.add(r.topic);
    }
    return set;
  }

  return { buildQuiz, submitQuiz, getQuizActivity, topicsAwardedToday };
}

export type QuizService = ReturnType<typeof makeQuizService>;
