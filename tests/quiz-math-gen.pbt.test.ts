import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateMathQuestions, isMathTopic } from "@/features/quiz/math-gen";

const TOPICS = [
  "multiplication-within-100",
  "division-within-100",
  "number-bonds-100",
];

// Deterministic rng driven by a fast-check-provided sequence of doubles.
function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("math-gen (Inc11 Q1=D)", () => {
  it("recognizes math topics", () => {
    for (const t of TOPICS) expect(isMathTopic(t)).toBe(true);
    expect(isMathTopic("verb-tenses")).toBe(false);
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
            expect(n).toBeLessThanOrEqual(100);
          }
        },
      ),
    );
  });

  it("multiplication: product <= 100 and equals a × b", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 40 }),
        (seq) => {
          for (const q of generateMathQuestions("multiplication-within-100", 5, seqRng(seq))) {
            const m = q.prompt.match(/(\d+) × (\d+)/)!;
            const prod = Number(m[1]) * Number(m[2]);
            expect(prod).toBe(Number(q.correct));
            expect(prod).toBeLessThanOrEqual(100);
          }
        },
      ),
    );
  });

  it("division: exact, dividend = divisor × answer, dividend <= 100", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 40 }),
        (seq) => {
          for (const q of generateMathQuestions("division-within-100", 5, seqRng(seq))) {
            const m = q.prompt.match(/(\d+) ÷ (\d+)/)!;
            const dividend = Number(m[1]);
            const divisor = Number(m[2]);
            expect(divisor * Number(q.correct)).toBe(dividend);
            expect(dividend).toBeLessThanOrEqual(100);
          }
        },
      ),
    );
  });

  it("number-bonds-100: x + answer = 100", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 40 }),
        (seq) => {
          for (const q of generateMathQuestions("number-bonds-100", 5, seqRng(seq))) {
            const m = q.prompt.match(/\? \+ (\d+) = 100/)!;
            expect(Number(m[1]) + Number(q.correct)).toBe(100);
          }
        },
      ),
    );
  });
});
