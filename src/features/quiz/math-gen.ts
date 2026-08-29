/**
 * Pure procedural math-question generators (Inc11; Inc12 harder set). Inject
 * `rng` (0..1) so they are deterministic + property-tested. Correct answers are
 * computed, never guessed — safe answer keys for a kid.
 */

import type { Rng } from "@/lib/logic";
import { randInt, shuffle } from "@/lib/rng";

import { fractionQuestion } from "./fraction-gen";
import type { QuizQuestion } from "./types";

/** Build 4 unique options around `answer` (>= 0), shuffled, answer included.
 * `spread` extra near-miss deltas let larger answers get plausible distractors. */
function options(answer: number, rng: Rng, spread: number[] = []): string[] {
  const set = new Set<number>([answer]);
  const deltas = shuffle([1, 2, 3, -1, -2, -3, 5, -5, 10, -10, ...spread], rng);
  let di = 0;
  while (set.size < 4 && di < deltas.length) {
    const cand = answer + deltas[di++];
    if (cand >= 0) set.add(cand);
  }
  let pad = answer + 4;
  while (set.size < 4) set.add(pad++);
  return shuffle([...set].map(String), rng);
}

function q(
  id: string,
  prompt: string,
  answer: number,
  rng: Rng,
  spread: number[] = [],
): QuizQuestion {
  // Inc13 FR6: derive a "why" by filling the answer into the prompt's blank,
  // e.g. "3 × 4 = ?" → "3 × 4 = 12", "? + 5 = 100" → "95 + 5 = 100".
  const explanation = prompt.replace("?", String(answer));
  return {
    id,
    prompt,
    options: options(answer, rng, spread),
    correct: String(answer),
    explanation,
  };
}

/** Plausible near-misses for a *factor* (small slips), as opposed to a product. */
const FACTOR_SPREAD = [1, -1, 2, -2];

/** a × b, factors 2–10, product <= 100.
 *
 * Inc25 FR4: the missing operand moves. `a × b = ?` recalls a table fact;
 * `a × ? = p` forces the inverse. Same drawn operands in every branch, so the
 * answer stays computed (never authored) and the product stays <= 100. */
function multiplicationWithin100(id: string, rng: Rng): QuizQuestion {
  const a = randInt(rng, 2, 10);
  const b = randInt(rng, 2, 10);
  const p = a * b;
  switch (randInt(rng, 0, 2)) {
    // distractors near the product, incl. off-by-one-factor errors.
    case 0:
      return q(id, `${a} × ${b} = ?`, p, rng, [a, -a, b, -b]);
    case 1:
      return q(id, `${a} × ? = ${p}`, b, rng, FACTOR_SPREAD);
    default:
      return q(id, `? × ${b} = ${p}`, a, rng, FACTOR_SPREAD);
  }
}

/** dividend ÷ divisor, exact. divisor & quotient 2–10, dividend <= 100.
 *  Inc25 FR4: three shapes, same exact division underneath. */
function divisionWithin100(id: string, rng: Rng): QuizQuestion {
  const divisor = randInt(rng, 2, 10);
  const quotient = randInt(rng, 2, 10);
  const dividend = divisor * quotient;
  switch (randInt(rng, 0, 2)) {
    case 0:
      return q(id, `${dividend} ÷ ${divisor} = ?`, quotient, rng);
    case 1:
      return q(id, `${dividend} ÷ ? = ${quotient}`, divisor, rng, FACTOR_SPREAD);
    default:
      return q(id, `? ÷ ${divisor} = ${quotient}`, dividend, rng, [divisor, -divisor]);
  }
}

/** ? + x = 1000 (Inc25 FR5 — replaces number-bonds-100).
 *
 * Q4-iv: MOSTLY arbitrary values in 1–999 with SOME rounder ones, so the topic
 * can't be reduced to one trick ("ones make 10, tens make 90, hundreds make
 * 900") applied on autopilot. The 1-in-10 rounder rate is a tuning value, not a
 * contract — the invariant is `answer + x === 1000`. */
function numberBonds1000(id: string, rng: Rng): QuizQuestion {
  const x =
    randInt(rng, 0, 9) === 0
      ? randInt(rng, 1, 9) * 100 // rounder: 100, 200, … 900
      : randInt(rng, 1, 999); // arbitrary
  return q(id, `? + ${x} = 1000`, 1000 - x, rng, [100, -100, 200, -200]);
}

const GENERATORS: Record<string, (id: string, rng: Rng) => QuizQuestion> = {
  "multiplication-within-100": multiplicationWithin100,
  "division-within-100": divisionWithin100,
  "number-bonds-1000": numberBonds1000,
  // Inc25 D1: fractions register here rather than adding a third branch to
  // buildQuestions. It owns its option-building entirely — `options()` and `q()`
  // above are integer-only and stay untouched.
  fractions: fractionQuestion,
};

/** True if the given topic ID is a math topic with a generator. */
export function isMathTopic(topicId: string): boolean {
  return topicId in GENERATORS;
}

/** Generate `n` questions for a math topic. Throws on unknown topic. */
export function generateMathQuestions(
  topicId: string,
  n: number,
  rng: Rng,
): QuizQuestion[] {
  const gen = GENERATORS[topicId];
  if (!gen) throw new Error(`generateMathQuestions: unknown topic ${topicId}`);
  return Array.from({ length: n }, (_, i) => gen(`${topicId}-${i}`, rng));
}
