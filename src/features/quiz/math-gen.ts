/**
 * Pure procedural math-question generators (Inc11; Inc12 harder set). Inject
 * `rng` (0..1) so they are deterministic + property-tested. Correct answers are
 * computed, never guessed — safe answer keys for a kid.
 */

import type { Rng } from "@/lib/logic";
import { randInt, shuffle } from "@/lib/rng";

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

/** a × b, factors 2–10, product <= 100. */
function multiplicationWithin100(id: string, rng: Rng): QuizQuestion {
  const a = randInt(rng, 2, 10);
  const b = randInt(rng, 2, 10);
  // distractors near the product, incl. off-by-one-factor errors.
  return q(id, `${a} × ${b} = ?`, a * b, rng, [a, -a, b, -b]);
}

/** dividend ÷ divisor, exact. divisor & quotient 2–10, dividend <= 100. */
function divisionWithin100(id: string, rng: Rng): QuizQuestion {
  const divisor = randInt(rng, 2, 10);
  const quotient = randInt(rng, 2, 10);
  const dividend = divisor * quotient;
  return q(id, `${dividend} ÷ ${divisor} = ?`, quotient, rng);
}

/** ? + x = 100, x any 1–99 (Q3=C). */
function numberBonds100(id: string, rng: Rng): QuizQuestion {
  const x = randInt(rng, 1, 99);
  return q(id, `? + ${x} = 100`, 100 - x, rng, [20, -20]);
}

const GENERATORS: Record<string, (id: string, rng: Rng) => QuizQuestion> = {
  "multiplication-within-100": multiplicationWithin100,
  "division-within-100": divisionWithin100,
  "number-bonds-100": numberBonds100,
};

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
