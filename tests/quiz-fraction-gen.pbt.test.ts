import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateMathQuestions } from "@/features/quiz/math-gen";
import type { QuizQuestion } from "@/features/quiz/types";

/** Denominators a bar model divides cleanly — fraction-gen must never leave this
 *  set (sevenths and ninths don't draw). Restated here deliberately: the test is
 *  the guard against the generator's own list being widened by accident. */
const ALLOWED_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10];

function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

const rngSeq = fc.array(fc.double({ min: 0, max: 1, noNaN: true }), {
  minLength: 1,
  maxLength: 60,
});

const parseFrac = (s: string): { num: number; den: number } | null => {
  const m = s.match(/^(\d+)\/(\d+)$/);
  return m ? { num: Number(m[1]), den: Number(m[2]) } : null;
};

/** Cross-multiplication — the same comparison the generator must use. */
const sameValue = (a: { num: number; den: number }, b: { num: number; den: number }) =>
  a.num * b.den === b.num * a.den;

const fractions = (seq: number[]): QuizQuestion[] =>
  generateMathQuestions("fractions", 5, seqRng(seq));

describe("fraction-gen (Inc25 FR11/FR12)", () => {
  it("every question is well-formed: 4 distinct options, correct among them", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          expect(q.options).toHaveLength(4);
          expect(q.options).toContain(q.correct);
          expect(new Set(q.options).size).toBe(4);
          expect(q.explanation.length).toBeGreaterThan(0);
          expect(q.explanation).not.toContain("?");
        }
      }),
    );
  });

  it("no distractor equals the answer BY VALUE (2/4 can never sit against 1/2)", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const correct = parseFrac(q.correct);
          if (!correct) continue; // fraction-of-a-quantity: integer answer
          for (const opt of q.options) {
            if (opt === q.correct) continue;
            const other = parseFrac(opt);
            if (!other) continue;
            expect(sameValue(correct, other)).toBe(false);
          }
        }
      }),
    );
  });

  it("all four options are distinct by value, not merely by spelling", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const parsed = q.options.map(parseFrac).filter((f) => f !== null);
          for (let i = 0; i < parsed.length; i++) {
            for (let j = i + 1; j < parsed.length; j++) {
              expect(sameValue(parsed[i]!, parsed[j]!)).toBe(false);
            }
          }
        }
      }),
    );
  });

  it("every denominator on show is one a bar model divides cleanly", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const correct = parseFrac(q.correct);
          if (correct) expect(ALLOWED_DENOMINATORS).toContain(correct.den);
          if (q.visual) expect(ALLOWED_DENOMINATORS).toContain(q.visual.parts);
        }
      }),
    );
  });

  it("the picture is consistent with the answer, and is pure structure", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          if (!q.visual) continue;
          // Asserted with NO DOM — the point of a structured `visual` field.
          expect(q.visual.kind).toBe("bar");
          expect(q.visual.shaded).toBeGreaterThanOrEqual(1);
          expect(q.visual.shaded).toBeLessThan(q.visual.parts); // never a full bar
          const correct = parseFrac(q.correct)!;
          expect(correct.num).toBe(q.visual.shaded);
          expect(correct.den).toBe(q.visual.parts);
        }
      }),
    );
  });

  // Found by the manual visual check, not by any earlier property: options like
  // `3/3` are whole numbers wearing a fraction's clothes and read as a typo to a
  // child. Every fraction on screen — answer, distractor, or operand — is proper.
  it("no fraction on screen is a whole number in disguise (n/n)", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          for (const opt of q.options) {
            const f = parseFrac(opt);
            if (!f) continue;
            expect(f.num).toBeGreaterThanOrEqual(1);
            expect(f.den).toBeGreaterThanOrEqual(2);
            expect(f.num).toBeLessThan(f.den); // strict: n/n is rejected
          }
          // …including the operands in the prompt.
          const m = q.prompt.match(/^(\d+)\/(\d+) [+−] (\d+)\/(\d+) = \?$/);
          if (m) {
            expect(Number(m[1])).toBeLessThan(Number(m[2]));
            expect(Number(m[3])).toBeLessThan(Number(m[4]));
          }
        }
      }),
    );
  });

  // Also from the visual check: "6/10 of 120" showed a child an unsimplified
  // fraction they have not been taught to reduce, at a quantity beyond the scale
  // of every other maths topic.
  it("fraction-of-a-quantity uses lowest terms and stays within 100", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const m = q.prompt.match(/^(\d+)\/(\d+) of (\d+) = \?$/);
          if (!m) continue;
          const [num, den, whole] = [Number(m[1]), Number(m[2]), Number(m[3])];
          const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
          expect(g(num, den)).toBe(1); // already in lowest terms
          expect(whole).toBeLessThanOrEqual(100);
        }
      }),
    );
  });

  it("quantity distractors are plausible mistakes, not ±1 noise", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const m = q.prompt.match(/^(\d+)\/(\d+) of (\d+) = \?$/);
          if (!m) continue;
          const whole = Number(m[3]);
          for (const opt of q.options) {
            const v = Number(opt);
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThan(0);
            expect(v).toBeLessThanOrEqual(whole); // never more than the whole
          }
        }
      }),
    );
  });

  it("same-denominator sums are computed correctly and keep the denominator", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const m = q.prompt.match(/^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = \?$/);
          if (!m) continue;
          const [a, den, op, b, den2] = [Number(m[1]), Number(m[2]), m[3], Number(m[4]), Number(m[5])];
          expect(den2).toBe(den); // same denominator, by construction
          const expected = op === "+" ? a + b : a - b;
          expect(parseFrac(q.correct)).toEqual({ num: expected, den });
        }
      }),
    );
  });

  it("fraction-of-a-quantity divides exactly and answers a whole number", () => {
    fc.assert(
      fc.property(rngSeq, (seq) => {
        for (const q of fractions(seq)) {
          const m = q.prompt.match(/^(\d+)\/(\d+) of (\d+) = \?$/);
          if (!m) continue;
          const [num, den, whole] = [Number(m[1]), Number(m[2]), Number(m[3])];
          expect(whole % den).toBe(0); // no remainders reach a child
          expect(Number(q.correct)).toBe((whole / den) * num);
          expect(Number.isInteger(Number(q.correct))).toBe(true);
        }
      }),
    );
  });

  it("all three skills actually occur", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const rng = seqRng([(i * 0.0137) % 1, (i * 0.317) % 1, (i * 0.7717) % 1, (i * 0.911) % 1]);
      for (const q of generateMathQuestions("fractions", 5, rng)) {
        if (q.visual) seen.add("name");
        else if (q.prompt.includes(" of ")) seen.add("of-quantity");
        else seen.add("add-sub");
      }
    }
    expect(seen).toEqual(new Set(["name", "add-sub", "of-quantity"]));
  });
});
