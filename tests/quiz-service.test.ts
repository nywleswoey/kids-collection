import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeQuizService } from "@/features/quiz/quiz-service";
import { makeQuizOffer } from "@/features/quiz/quiz-offer";
import { inMemoryQuizStore, type QuizSeedRow } from "@/db/stores/quiz-store.fake";
import { inMemoryChildStore, type ChildSeed } from "@/db/stores/child-store.fake";
import { env } from "@/lib/env";

/** submitQuiz's cap RMW + Easter Egg ticket grant, reachable through the QuizStore +
 * ChildStore ports. Offers are signed, so AUTH_SECRET must be non-empty. */

const NOW = Date.UTC(2026, 0, 15, 6, 0, 0); // fixed instant → deterministic SGT day
const TOPIC = "multiplication-within-100";
const ANSWERS = ["A", "B", "C", "D", "E"]; // QUIZ_LENGTH = 5

function setup(quizSeed: QuizSeedRow[] = [], childSeed: ChildSeed = { kid: { easterEggTickets: 0 } }) {
  const quiz = inMemoryQuizStore(quizSeed);
  const children = inMemoryChildStore(childSeed);
  return { service: makeQuizService({ quiz, children }), quiz, children };
}

async function offer(childId: string, topic: string, answers: string[]) {
  return makeQuizOffer({ childId, topic, answers, exp: NOW + 60_000 }, env.authSecret);
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
