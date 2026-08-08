import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateMathQuestions, isMathTopic } from "@/features/quiz/math-gen";

const TOPICS = [
  "multiplication-within-100",
  "division-within-100",
  "number-bonds-1000",
];

// Deterministic rng driven by a fast-check-provided sequence of doubles.
function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

/** A long-ish double sequence: Inc25's generators consume an extra draw to pick
 *  the question *shape*, so short sequences would explore few forms. */
const rngSeq = fc.array(fc.double({ min: 0, max: 1, noNaN: true }), {
  minLength: 1,
  maxLength: 40,
});

describe("math-gen (Inc11 Q1=D; Inc25 FR4/FR5)", () => {
  it("recognizes math topics", () => {
    for (const t of TOPICS) expect(isMathTopic(t)).toBe(true);
    expect(isMathTopic("verb-tenses")).toBe(false);
    // Inc25 FR5: number-bonds-100 was REPLACED, not kept alongside.
    expect(isMathTopic("number-bonds-100")).toBe(false);
  });

  it("every generated question is well-formed and solvable", () => {
    fc.assert(
      fc.property(fc.constantFrom(...TOPICS), rngSeq, (topic, seq) => {
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
          // Inc13 FR6 — explanation fills the answer into the prompt's blank.
          expect(q.explanation).toContain(q.correct);
          expect(q.explanation).not.toContain("?");
        }
      }),
    );
  });

  // Inc25 FR4: the missing operand moves. Each shape is solved independently so
  // a generator that produced a right-looking prompt with the wrong answer key
  // (e.g. answering the product when the blank is a factor) cannot pass.
  it("multiplication: every shape's answer satisfies a × b = p, p <= 100", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        const seen = new Set<string>();
        for (const q of generateMathQuestions("multiplication-within-100", 5, seqRng(seq))) {
          const ans = Number(q.correct);
          let a: number, b: number, p: number;
          let m: RegExpMatchArray | null;
          if ((m = q.prompt.match(/^(\d+) × (\d+) = \?$/))) {
            [a, b, p] = [Number(m[1]), Number(m[2]), ans];
            seen.add("forward");
          } else if ((m = q.prompt.match(/^(\d+) × \? = (\d+)$/))) {
            [a, b, p] = [Number(m[1]), ans, Number(m[2])];
            seen.add("missing-b");
          } else {
            m = q.prompt.match(/^\? × (\d+) = (\d+)$/)!;
            [a, b, p] = [ans, Number(m[1]), Number(m[2])];
            seen.add("missing-a");
          }
          expect(a * b).toBe(p);
          expect(p).toBeLessThanOrEqual(100);
          expect(a).toBeGreaterThanOrEqual(2);
          expect(b).toBeGreaterThanOrEqual(2);
        }
        expect(seen.size).toBeGreaterThan(0);
      }),
    );
  });

  it("division: every shape's answer satisfies divisor × quotient = dividend, dividend <= 100", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of generateMathQuestions("division-within-100", 5, seqRng(seq))) {
          const ans = Number(q.correct);
          let dividend: number, divisor: number, quotient: number;
          let m: RegExpMatchArray | null;
          if ((m = q.prompt.match(/^(\d+) ÷ (\d+) = \?$/))) {
            [dividend, divisor, quotient] = [Number(m[1]), Number(m[2]), ans];
          } else if ((m = q.prompt.match(/^(\d+) ÷ \? = (\d+)$/))) {
            [dividend, divisor, quotient] = [Number(m[1]), ans, Number(m[2])];
          } else {
            m = q.prompt.match(/^\? ÷ (\d+) = (\d+)$/)!;
            [dividend, divisor, quotient] = [ans, Number(m[1]), Number(m[2])];
          }
          expect(divisor * quotient).toBe(dividend);
          expect(dividend).toBeLessThanOrEqual(100);
          expect(divisor).toBeGreaterThanOrEqual(2);
          expect(quotient).toBeGreaterThanOrEqual(2);
        }
      }),
    );
  });

  it("number-bonds-1000: x + answer = 1000", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of generateMathQuestions("number-bonds-1000", 5, seqRng(seq))) {
          const m = q.prompt.match(/^\? \+ (\d+) = 1000$/)!;
          const x = Number(m[1]);
          expect(x).toBeGreaterThanOrEqual(1);
          expect(x).toBeLessThanOrEqual(999);
          expect(x + Number(q.correct)).toBe(1000);
        }
      }),
    );
  });

  // Inc25 FR4/FR5: both generators must actually VARY, or the increment's whole
  // premise ("the shape stops being predictable") is unmet while every property
  // above still passes.
  it("multiplication and division each produce all three shapes over many draws", () => {
    const shapes = (topic: string, sym: string) => {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) {
        const rng = seqRng([(i * 0.0137) % 1, (i * 0.317) % 1, (i * 0.7717) % 1, (i * 0.911) % 1]);
        for (const q of generateMathQuestions(topic, 5, rng)) {
          if (q.prompt.endsWith("= ?")) seen.add("forward");
          else if (q.prompt.includes(`${sym} ?`)) seen.add("middle");
          else seen.add("leading");
        }
      }
      return seen;
    };
    expect(shapes("multiplication-within-100", "×")).toEqual(
      new Set(["forward", "middle", "leading"]),
    );
    expect(shapes("division-within-100", "÷")).toEqual(
      new Set(["forward", "middle", "leading"]),
    );
  });

  it("number-bonds-1000 produces both rounder and arbitrary values", () => {
    let rounder = 0;
    let arbitrary = 0;
    for (let i = 0; i < 400; i++) {
      const rng = seqRng([(i * 0.0137) % 1, (i * 0.317) % 1, (i * 0.7717) % 1]);
      for (const q of generateMathQuestions("number-bonds-1000", 5, rng)) {
        const x = Number(q.prompt.match(/^\? \+ (\d+) = 1000$/)![1]);
        if (x % 100 === 0) rounder++;
        else arbitrary++;
      }
    }
    expect(rounder).toBeGreaterThan(0);
    expect(arbitrary).toBeGreaterThan(0);
    expect(arbitrary).toBeGreaterThan(rounder); // "mostly arbitrary" (Q4-iv)
  });
});
