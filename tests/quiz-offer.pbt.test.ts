import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { makeQuizOffer, verifyQuizOffer } from "@/features/quiz/quiz-offer";

const SECRET = "test-secret-quiz";
const NOW = 1_700_000_000_000;

describe("quiz-offer (Inc11 Security)", () => {
  it("round-trips a valid, unexpired offer", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        async (childId, topic, answers) => {
          const token = await makeQuizOffer(
            { childId, topic, answers, exp: NOW + 10_000 },
            SECRET,
          );
          const p = await verifyQuizOffer(token, SECRET, NOW);
          expect(p).not.toBeNull();
          expect(p!.childId).toBe(childId);
          expect(p!.topic).toBe(topic);
          expect(p!.answers).toEqual(answers);
        },
      ),
    );
  });

  it("rejects a tampered payload", async () => {
    const token = await makeQuizOffer(
      { childId: "c1", topic: "add-within-20", answers: ["3"], exp: NOW + 10_000 },
      SECRET,
    );
    const [body, sig] = token.split(".");
    const forged = `${body}x.${sig}`;
    expect(await verifyQuizOffer(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects a wrong secret and an expired offer", async () => {
    const token = await makeQuizOffer(
      { childId: "c1", topic: "add-within-20", answers: ["3"], exp: NOW + 10_000 },
      SECRET,
    );
    expect(await verifyQuizOffer(token, "other-secret", NOW)).toBeNull();
    expect(await verifyQuizOffer(token, SECRET, NOW + 20_000)).toBeNull();
  });
});
