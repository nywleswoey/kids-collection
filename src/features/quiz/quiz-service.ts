import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children, quizCompletions } from "@/db/schema";
import { getTopic } from "./topics";
import { generateMathQuestions, isMathTopic } from "./math-gen";
import { GRAMMAR_BANKS, isGrammarTopic } from "./grammar-bank";
import { makeQuizOffer, verifyQuizOffer } from "./quiz-offer";
import { sgtDayKey, decideAward } from "./cap";
import { sample } from "@/lib/rng";
import {
  QUIZ_LENGTH,
  type ClientQuestion,
  type QuizOutcome,
  type QuizQuestion,
} from "./types";

const OFFER_TTL_MS = 10 * 60_000; // 10 min

function authSecret(): string {
  return process.env.AUTH_SECRET ?? "";
}

function buildQuestions(topicId: string, rng: () => number): QuizQuestion[] {
  if (isMathTopic(topicId)) return generateMathQuestions(topicId, QUIZ_LENGTH, rng);
  if (isGrammarTopic(topicId)) {
    return sample(GRAMMAR_BANKS[topicId], QUIZ_LENGTH, rng).map((q) => ({
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

/** Assemble a quiz + signed offer. The offer holds the authoritative answer
 * keys for scoring; the client copy also carries keys for feedback (Inc13 FR6). */
export async function buildQuiz(
  childId: string,
  topicId: string,
  nowMs: number = Date.now(),
  rng: () => number = Math.random,
): Promise<BuiltQuiz> {
  if (!getTopic(topicId)) throw new Error(`buildQuiz: unknown topic ${topicId}`);
  const questions = buildQuestions(topicId, rng);
  const offer = await makeQuizOffer(
    {
      childId,
      topic: topicId,
      answers: questions.map((q) => q.correct),
      exp: nowMs + OFFER_TTL_MS,
    },
    authSecret(),
  );
  // Inc13 FR6: send the answer key + explanation to the client for immediate
  // per-question feedback. Award stays server-authoritative (re-scored against
  // the signed offer in submitQuiz); the client key only drives display.
  const client: ClientQuestion[] = questions;
  return { topic: topicId, questions: client, offer };
}

/**
 * Score a submission server-side and grant a lucky ticket if eligible (FR6/FR7).
 * Correct answers come from the signed offer — the client only sends its picks.
 * Award + completion insert are atomic against the daily/per-topic caps.
 */
export async function submitQuiz(
  childId: string,
  offer: string,
  picks: string[],
  nowMs: number = Date.now(),
): Promise<QuizOutcome> {
  const payload = await verifyQuizOffer(offer, authSecret(), nowMs);
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
  const todays = await db
    .select({ topic: quizCompletions.topic, awarded: quizCompletions.awarded, createdAt: quizCompletions.createdAt })
    .from(quizCompletions)
    .where(eq(quizCompletions.childId, childId));
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

  await db.insert(quizCompletions).values({
    childId,
    topic: payload.topic,
    correct,
    total: answers.length,
    passed,
    awarded: award,
  });

  if (award) {
    await db
      .update(children)
      .set({ luckyTickets: sql`${children.luckyTickets} + 1` })
      .where(eq(children.id, childId));
  }

  return { passed, correct, total: answers.length, awarded: award, reason, wrongIndexes };
}
