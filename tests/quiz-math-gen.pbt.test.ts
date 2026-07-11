import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateMathQuestions, isMathTopic } from "@/features/quiz/math-gen";

const TOPICS = ["add-within-20", "sub-within-20", "number-bonds-10"];

// Deterministic rng driven by a fast-check-provided sequence of doubles.
function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("math-gen (Inc11 Q1=D)", () => {
  it("recognizes math topics", () => {
    for (const t of TOPICS) expect(isMathTopic(t)).toBe(true);
    expect(isMathTopic("nouns-vs-verbs")).toBe(false);
  });

  it("every generated question is well-formed and solvable", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOPICS),
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 40 }),
        (topic, seq) => {
          const qs = generateMathQuestions(topic, 5, seqRng(seq));
          expect(qs).toHaveLength(5);
          for (const q of qs) {
            // 4 unique options, correct is one of them
            expect(q.options).toHaveLength(4);
            expect(new Set(q.options).size).toBe(4);
            expect(q.options).toContain(q.correct);
            // correct answer is a non-negative integer string
            const n = Number(q.correct);
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(20);
          }
        },
      ),
    );
  });

  it("add: prompt sum equals correct answer", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 40 }),
        (seq) => {
          for (const q of generateMathQuestions("add-within-20", 5, seqRng(seq))) {
            const m = q.prompt.match(/(\d+) \+ (\d+)/)!;
            expect(Number(m[1]) + Number(m[2])).toBe(Number(q.correct));
          }
        },
      ),
    );
  });

  it("number-bonds: x + answer = 10", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 40 }),
        (seq) => {
          for (const q of generateMathQuestions("number-bonds-10", 5, seqRng(seq))) {
            const m = q.prompt.match(/\? \+ (\d+) = 10/)!;
            expect(Number(m[1]) + Number(q.correct)).toBe(10);
          }
        },
      ),
    );
  });
});
