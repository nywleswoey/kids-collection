import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeQuizService } from "@/features/quiz/quiz-service";
import { makeQuizOffer } from "@/features/quiz/quiz-offer";
import { inMemoryQuizStore, type QuizSeedRow, type QuizSeenSeedRow } from "@/db/stores/quiz-store.fake";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { dailyTopics } from "@/features/quiz/daily-topics";
import { sgtDayKey } from "@/features/quiz/cap";
import { GRAMMAR_BANKS } from "@/features/quiz/grammar-bank";
import { TOPICS, getTopic } from "@/features/quiz/topics";
import { env } from "@/lib/env";

/** submitQuiz's cap RMW + Easter Egg ticket grant, reachable through the QuizStore +
 * ChildStore ports. Offers are signed, so AUTH_SECRET must be non-empty. */

const NOW = Date.UTC(2026, 0, 15, 6, 0, 0); // fixed instant → deterministic SGT day
const ANSWERS = ["A", "B", "C", "D", "E"]; // QUIZ_LENGTH = 5

// Inc25 FR10: buildQuiz now only serves topics in the child's three for the day,
// so tests derive their topic instead of hardcoding one. submitQuiz is NOT gated
// (a quiz begun before midnight must still be submittable), which is why the
// cap/award cases below can keep using any topic id.
const DAY = sgtDayKey(NOW);
const OFFERED = dailyTopics("kid", DAY);
const TOPIC = OFFERED[0];
const NOT_OFFERED = TOPICS.map((t) => t.id).find((id) => !OFFERED.includes(id))!;
// Asserted below rather than guarded for: a silently-skipping test is worse than
// no test, and these two drive every seen-tracking case in this file.
const OFFERED_GRAMMAR = OFFERED.find((id) => getTopic(id)?.subject === "grammar")!;
const OFFERED_MATH = OFFERED.find((id) => getTopic(id)?.subject === "math")!;

function setup(
  quizSeed: QuizSeedRow[] = [],
  childSeed: ChildSeed = { kid: { easterEggTickets: 0 } },
  seenSeed: QuizSeenSeedRow[] = [],
) {
  const quiz = inMemoryQuizStore(quizSeed, seenSeed);
  const children = inMemoryChildStore(childSeed);
  return { service: makeQuizService({ quiz, children }), quiz, children };
}

async function offer(
  childId: string,
  topic: string,
  answers: string[],
  questionIds?: string[],
) {
  return makeQuizOffer(
    { childId, topic, answers, questionIds, exp: NOW + 60_000 },
    env.authSecret,
  );
}

const today = (topic: string, awarded: boolean): QuizSeedRow => ({
  childId: "kid",
  topic,
  awarded,
  createdAt: new Date(NOW),
});

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-key";
});
afterAll(() => {
  delete process.env.AUTH_SECRET;
});

describe("test fixture", () => {
  it("today's three for 'kid' include both a grammar and a maths topic", () => {
    // Every seen-tracking case below depends on this. If the daily-topics
    // algorithm changes and this fixture stops containing grammar, fail HERE
    // rather than letting five tests quietly assert nothing.
    expect(OFFERED_GRAMMAR).toBeDefined();
    expect(OFFERED_MATH).toBeDefined();
    expect(NOT_OFFERED).toBeDefined();
    expect(OFFERED).toHaveLength(3);
  });
});

describe("makeQuizService.submitQuiz", () => {
  it("awards an Easter Egg ticket on a fresh pass", async () => {
    const { service, children, quiz } = setup();
    const o = await offer("kid", TOPIC, ANSWERS);

    const outcome = await service.submitQuiz("kid", o, ANSWERS, NOW);

    expect(outcome).toMatchObject({ passed: true, correct: 5, awarded: true, reason: "ok" });
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(1);
    expect(await quiz.completionsFor("kid")).toHaveLength(1);
  });

  it("does not award a failed attempt", async () => {
    const { service, children } = setup();
    const o = await offer("kid", TOPIC, ANSWERS);

    const outcome = await service.submitQuiz("kid", o, ["A", "B", "C", "D", "X"], NOW);

    expect(outcome).toMatchObject({ passed: false, awarded: false, reason: "failed", wrongIndexes: [4] });
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(0);
  });

  it("refuses a second award for the same topic today", async () => {
    const { service, children } = setup([today(TOPIC, true)]);
    const o = await offer("kid", TOPIC, ANSWERS);

    const outcome = await service.submitQuiz("kid", o, ANSWERS, NOW);

    expect(outcome).toMatchObject({ awarded: false, reason: "topic-done" });
    expect(await children.readColumn("kid", "easterEggTickets")).toBe(0);
  });

  it("enforces the global daily cap across topics", async () => {
    const { service } = setup([today("t1", true), today("t2", true), today("t3", true)]);
    const o = await offer("kid", TOPIC, ANSWERS);

    const outcome = await service.submitQuiz("kid", o, ANSWERS, NOW);

    expect(outcome).toMatchObject({ awarded: false, reason: "daily-cap" });
  });

  it("rejects an offer signed for another child", async () => {
    const { service } = setup();
    const o = await offer("someone-else", TOPIC, ANSWERS);
    await expect(service.submitQuiz("kid", o, ANSWERS, NOW)).rejects.toThrow("child mismatch");
  });
});

describe("makeQuizService reads", () => {
  it("buildQuiz produces a signed quiz for a valid topic and rejects unknown topics", async () => {
    const { service } = setup();
    const built = await service.buildQuiz("kid", TOPIC, NOW);
    expect(built.topic).toBe(TOPIC);
    expect(built.questions).toHaveLength(5);
    expect(built.offer.split(".")).toHaveLength(2); // base64url(json).base64url(sig)
    await expect(service.buildQuiz("kid", "no-such-topic", NOW)).rejects.toThrow("unknown topic");
  });

  // Inc25 FR10 / story I25-B4 — THE enforcement point. The picker hides the other
  // seven and the route redirects, but startQuizAction is a Server Action, i.e. a
  // directly invocable POST. If this check ever moves back to the page, a child
  // with dev tools can take any of the ten topics and the daily limit is fiction.
  it("buildQuiz refuses a real topic that is not in today's three", async () => {
    const { service, quiz } = setup();
    await expect(service.buildQuiz("kid", NOT_OFFERED, NOW)).rejects.toThrow("not offered today");
    // and it refuses BEFORE doing anything observable
    expect(await quiz.completionsFor("kid")).toHaveLength(0);
  });

  it("buildQuiz serves each of today's three, and they differ from yesterday's", async () => {
    const { service } = setup();
    for (const topic of OFFERED) {
      expect((await service.buildQuiz("kid", topic, NOW)).topic).toBe(topic);
    }
    const yesterday = dailyTopics("kid", DAY - 1);
    expect(OFFERED.filter((t) => yesterday.includes(t))).toEqual([]);
  });

  it("buildQuiz pins the served question ids into the signed offer (FR16)", async () => {
    const { service } = setup();
    const built = await service.buildQuiz("kid", TOPIC, NOW);
    const payload = JSON.parse(
      Buffer.from(built.offer.split(".")[0], "base64url").toString("utf8"),
    );
    expect(payload.questionIds).toHaveLength(5);
    expect(payload.questionIds).toEqual(built.questions.map((q) => q.id));
    // parallel to the answer keys, in the same served order
    expect(payload.answers).toEqual(built.questions.map((q) => q.correct));
  });

  it("buildQuiz writes nothing — an abandoned quiz burns no questions (OQ-DR-T1)", async () => {
    const { service, quiz } = setup();
    await service.buildQuiz("kid", OFFERED_GRAMMAR, NOW);
    expect(await quiz.seenQuestionIds("kid", OFFERED_GRAMMAR)).toEqual([]);
  });
});

describe("makeQuizService seen-question tracking (Inc25 FR20)", () => {
  it("records the offer's question ids as seen on submit — for grammar", async () => {
    const { service, quiz } = setup();
    const ids = GRAMMAR_BANKS[OFFERED_GRAMMAR].slice(0, 5).map((q) => q.id);
    const o = await offer("kid", OFFERED_GRAMMAR, ANSWERS, ids);

    await service.submitQuiz("kid", o, ANSWERS, NOW);

    expect((await quiz.seenQuestionIds("kid", OFFERED_GRAMMAR)).sort()).toEqual([...ids].sort());
  });

  it("records nothing for a maths topic — its ids are positional (OQ-DR-T2)", async () => {
    const { service, quiz } = setup();
    const o = await offer("kid", OFFERED_MATH, ANSWERS, [
      `${OFFERED_MATH}-0`,
      `${OFFERED_MATH}-1`,
    ]);

    await service.submitQuiz("kid", o, ANSWERS, NOW);

    expect(await quiz.seenQuestionIds("kid", OFFERED_MATH)).toEqual([]);
  });

  it("prefers unseen questions, then resets when the bank is exhausted", async () => {
    const bank = GRAMMAR_BANKS[OFFERED_GRAMMAR];
    // Everything seen except four: the next quiz must serve all four, then reset.
    const seenSeed: QuizSeenSeedRow[] = bank
      .slice(0, bank.length - 4)
      .map((q) => ({ childId: "kid", topic: OFFERED_GRAMMAR, questionId: q.id }));
    const { service, quiz } = setup([], { kid: { easterEggTickets: 0 } }, seenSeed);

    const built = await service.buildQuiz("kid", OFFERED_GRAMMAR, NOW);
    const unseenIds = bank.slice(bank.length - 4).map((q) => q.id);
    for (const id of unseenIds) expect(built.questions.map((q) => q.id)).toContain(id);

    const o = await offer("kid", OFFERED_GRAMMAR, ANSWERS, built.questions.map((q) => q.id));
    await service.submitQuiz("kid", o, ANSWERS, NOW);

    // Bank covered → cycle restarts from exactly the five just answered.
    expect(await quiz.seenQuestionIds("kid", OFFERED_GRAMMAR)).toHaveLength(5);
  });

  it("a pre-deploy offer with no question ids still submits, and records nothing (FR17)", async () => {
    const { service, quiz } = setup();
    const legacy = await offer("kid", OFFERED_GRAMMAR, ANSWERS); // questionIds undefined

    const outcome = await service.submitQuiz("kid", legacy, ANSWERS, NOW);

    expect(outcome).toMatchObject({ passed: true, awarded: true });
    expect(await quiz.seenQuestionIds("kid", OFFERED_GRAMMAR)).toEqual([]);
  });

  it("submitting the same offer twice does not double-write", async () => {
    const { service, quiz } = setup();
    const ids = GRAMMAR_BANKS[OFFERED_GRAMMAR].slice(0, 5).map((q) => q.id);
    const o = await offer("kid", OFFERED_GRAMMAR, ANSWERS, ids);

    await service.submitQuiz("kid", o, ANSWERS, NOW);
    await service.submitQuiz("kid", o, ANSWERS, NOW);

    expect(await quiz.seenQuestionIds("kid", OFFERED_GRAMMAR)).toHaveLength(5);
  });

  it("topicsAwardedToday reflects only today's awarded topics", async () => {
    const yesterday: QuizSeedRow = { childId: "kid", topic: "old", awarded: true, createdAt: new Date(NOW - 24 * 3600_000) };
    const { service } = setup([today(TOPIC, true), today("t2", false), yesterday]);
    expect(await service.topicsAwardedToday("kid", NOW)).toEqual(new Set([TOPIC]));
  });

  it("getQuizActivity tallies earned counts", async () => {
    const { service } = setup([today(TOPIC, true), today("t2", true), today("t3", false)]);
    const activity = await service.getQuizActivity("kid", NOW);
    expect(activity.earnedToday).toBe(2);
    expect(activity.earnedAllTime).toBe(2);
    expect(activity.recent.length).toBeGreaterThan(0);
  });
});
