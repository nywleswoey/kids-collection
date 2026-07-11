/**
 * Pure procedural math-question generators (Inc11 Q1=D). Inject `rng` (0..1) so
 * they are deterministic + property-tested. Correct answers are computed, never
 * guessed — safe answer keys for a kid.
 */

import type { QuizQuestion } from "./types";

type Rng = () => number;

function randInt(rng: Rng, min: number, max: number): number {
  // inclusive both ends; clamp guards against rng()===1.
  return min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build 4 unique options around `answer` (>= 0), shuffled, answer included. */
function options(answer: number, rng: Rng): string[] {
  const set = new Set<number>([answer]);
  const deltas = shuffle([1, 2, 3, -1, -2, -3, 10, -10], rng);
  let di = 0;
  while (set.size < 4 && di < deltas.length) {
    const cand = answer + deltas[di++];
    if (cand >= 0) set.add(cand);
  }
  // Fallback: pad upward if we couldn't find enough non-negative near-misses.
  let pad = answer + 4;
  while (set.size < 4) set.add(pad++);
  return shuffle([...set].map(String), rng);
}

function q(id: string, prompt: string, answer: number, rng: Rng): QuizQuestion {
  return { id, prompt, options: options(answer, rng), correct: String(answer) };
}

/** a + b, sum <= 20. */
function addWithin20(id: string, rng: Rng): QuizQuestion {
  const a = randInt(rng, 0, 20);
  const b = randInt(rng, 0, 20 - a);
  return q(id, `${a} + ${b} = ?`, a + b, rng);
}

/** a - b, a <= 20, result >= 0. */
function subWithin20(id: string, rng: Rng): QuizQuestion {
  const a = randInt(rng, 0, 20);
  const b = randInt(rng, 0, a);
  return q(id, `${a} − ${b} = ?`, a - b, rng);
}

/** ? + x = 10 (number bonds to 10). */
function numberBonds10(id: string, rng: Rng): QuizQuestion {
  const x = randInt(rng, 0, 10);
  return q(id, `? + ${x} = 10`, 10 - x, rng);
}

const GENERATORS: Record<string, (id: string, rng: Rng) => QuizQuestion> = {
  "add-within-20": addWithin20,
  "sub-within-20": subWithin20,
  "number-bonds-10": numberBonds10,
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
