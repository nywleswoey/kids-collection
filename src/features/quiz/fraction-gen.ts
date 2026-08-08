/**
 * Fraction question generator (Inc25 FR11/FR12) — the first quiz content with
 * pictures, and the first whose answers are not integers.
 *
 * Deliberately separate from math-gen's `options()`, which is integer-only and
 * stays untouched (D1/D3): fractions need distractors shaped like the mistakes
 * children actually make, and equality compared BY VALUE so `2/4` can never be
 * offered against `1/2`. Answers are computed, never authored (NFR5).
 */

import type { Rng } from "@/lib/logic";
import { randInt, shuffle } from "@/lib/rng";

import type { QuizQuestion } from "./types";

/** Denominators a bar model divides cleanly (FR11). Sevenths and ninths draw
 *  badly at phone width, so they are excluded by construction — not by a
 *  `<= 10` check that a later edit could quietly widen. */
const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10] as const;

/** Add/subtract needs room for a proper answer on both sides, so halves are out:
 *  every non-trivial sum of halves is a whole. */
const ARITHMETIC_DENOMINATORS = DENOMINATORS.filter((d) => d >= 3);

/** Largest quantity a "fraction of" question may use — keeps this topic at the
 *  same arithmetic scale as the "within 100" maths topics. */
const MAX_QUANTITY = 100;

interface Frac {
  num: number;
  den: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Equality by cross-multiplication — NEVER string comparison. This is what
 *  stops `2/4` being offered as a distractor for `1/2` (FR12). */
function sameValue(a: Frac, b: Frac): boolean {
  return a.num * b.den === b.num * a.den;
}

const fmt = (f: Frac): string => `${f.num}/${f.den}`;

/** Plausible-but-wrong fractions, in the shapes children actually produce. */
function distractorCandidates(answer: Frac, extra: Frac[]): Frac[] {
  const { num, den } = answer;
  return [
    ...extra,
    { num: num + 1, den },
    { num: num - 1, den },
    { num, den: den + 1 },
    { num, den: den - 1 },
    { num: den, den: num }, // numerator/denominator swapped
    { num: num + 2, den },
    { num: num - 2, den },
    { num, den: den + 2 },
  ];
}

/** Four distinct-by-value options containing `answer`, shuffled. */
function fractionOptions(answer: Frac, rng: Rng, extra: Frac[] = []): string[] {
  const chosen: Frac[] = [answer];
  for (const c of distractorCandidates(answer, extra)) {
    if (chosen.length === 4) break;
    // Reject anything malformed, improper, or equal by value to something we
    // already hold — including the answer itself. `num === den` is rejected too:
    // it is a whole number wearing a fraction's clothes, which reads as a typo
    // to a 7-year-old rather than as a plausible mistake.
    if (c.num < 1 || c.den < 2 || c.num >= c.den) continue;
    if (chosen.some((k) => sameValue(k, c))) continue;
    chosen.push(c);
  }
  // Deterministic top-up so we can never return fewer than four (design §9).
  for (let d = 2; chosen.length < 4 && d <= 12; d++) {
    for (let n = 1; chosen.length < 4 && n < d; n++) {
      const c = { num: n, den: d };
      if (!chosen.some((k) => sameValue(k, c))) chosen.push(c);
    }
  }
  return shuffle(chosen.map(fmt), rng);
}

/**
 * Four distinct integer options for "num/den of whole".
 *
 * Distractors are the *mistakes*, not noise: answering with one part instead of
 * `num` parts, dividing by the numerator, multiplying the two numbers, or giving
 * the part left over. An earlier version offered `answer ± 1..5`, which for an
 * answer of 72 produced 73/74/77 — nothing a child would ever actually compute,
 * so the question degenerated into spotting the odd one out.
 */
function quantityOptions(
  answer: number,
  num: number,
  den: number,
  whole: number,
  rng: Rng,
): string[] {
  const groups = whole / den;
  const set = new Set<number>([answer]);
  for (const cand of [
    groups, // took one part instead of num parts
    whole - answer, // gave the remainder
    Math.round(whole / num), // divided by the numerator
    num * den, // multiplied the two numbers in the fraction
    answer + groups, // one part too many
    Math.max(0, answer - groups), // one part too few
  ]) {
    if (set.size === 4) break;
    if (Number.isInteger(cand) && cand > 0 && cand <= whole) set.add(cand);
  }
  // Deterministic top-up, still bounded by the whole: an option larger than the
  // quantity being shared is not a mistake anyone could make.
  for (let v = 1; set.size < 4 && v <= whole; v++) set.add(v);
  return shuffle([...set].map(String), rng);
}

/** "What fraction is shaded?" — the skill the picture exists to teach (FR13). */
function nameTheFraction(id: string, rng: Rng): QuizQuestion {
  const den = DENOMINATORS[randInt(rng, 0, DENOMINATORS.length - 1)];
  const num = randInt(rng, 1, den - 1); // proper, and never a fully shaded bar
  const answer: Frac = { num, den };
  return {
    id,
    prompt: "What fraction of the bar is shaded?",
    visual: { kind: "bar", parts: den, shaded: num },
    options: fractionOptions(answer, rng),
    correct: fmt(answer),
    explanation: `${num} of the ${den} equal parts are shaded, so the fraction is ${num}/${den}.`,
  };
}

/** a/d ± b/d, same denominator. Every operand AND the result stays a proper
 *  fraction — no `3/3`, which is a whole number written to look like a fraction
 *  and reads as a mistake rather than as maths. */
function addSubSameDenominator(id: string, rng: Rng): QuizQuestion {
  const den = ARITHMETIC_DENOMINATORS[randInt(rng, 0, ARITHMETIC_DENOMINATORS.length - 1)];
  const add = randInt(rng, 0, 1) === 0;
  let a: number, b: number, result: number;
  if (add) {
    // Pick the total first, capped below 1, so the sum is always proper.
    result = randInt(rng, 2, den - 1);
    a = randInt(rng, 1, result - 1);
    b = result - a;
  } else {
    a = randInt(rng, 2, den - 1);
    b = randInt(rng, 1, a - 1);
    result = a - b;
  }
  const answer: Frac = { num: result, den };
  const prompt = `${a}/${den} ${add ? "+" : "−"} ${b}/${den} = ?`;
  return {
    id,
    prompt,
    // The classic error: operate on the denominators too (1/5 + 3/5 → 4/10).
    options: fractionOptions(answer, rng, [{ num: result, den: add ? den * 2 : den }]),
    correct: fmt(answer),
    explanation: `The denominators are the same, so ${add ? "add" : "subtract"} just the top numbers: ${a} ${add ? "+" : "−"} ${b} = ${result}. The answer is ${result}/${den}.`,
  };
}

/** "1/4 of 20 = ?" — the one fraction skill whose answer is a whole number. */
function fractionOfQuantity(id: string, rng: Rng): QuizQuestion {
  const den = DENOMINATORS[randInt(rng, 0, DENOMINATORS.length - 1)];
  // Only fractions already in lowest terms. Simplifying is explicitly out of
  // scope for this topic, so a prompt of "6/10 of 120" would show a child a form
  // they have not been taught to reduce — and 3/5 asks the same question.
  const lowestTerms: number[] = [];
  for (let n = 1; n < den; n++) if (gcd(n, den) === 1) lowestTerms.push(n);
  const num = lowestTerms[randInt(rng, 0, lowestTerms.length - 1)];
  // whole = den * groups so it divides exactly, capped so the arithmetic stays
  // at the same scale as the "within 100" maths topics.
  const groups = randInt(rng, 2, Math.floor(MAX_QUANTITY / den));
  const whole = den * groups;
  const answer = num * groups;
  return {
    id,
    prompt: `${num}/${den} of ${whole} = ?`,
    options: quantityOptions(answer, num, den, whole, rng),
    correct: String(answer),
    explanation:
      num === 1
        ? `${whole} shared into ${den} equal parts is ${groups}.`
        : `${whole} shared into ${den} equal parts is ${groups}. ${num} parts is ${num} × ${groups} = ${answer}.`,
  };
}

const SKILLS = [nameTheFraction, addSubSameDenominator, fractionOfQuantity];

/** One fraction question, skill chosen from the injected rng. Registered as a
 *  math-gen GENERATOR (D1) so `buildQuestions` keeps its two branches. */
export function fractionQuestion(id: string, rng: Rng): QuizQuestion {
  return SKILLS[randInt(rng, 0, SKILLS.length - 1)](id, rng);
}
