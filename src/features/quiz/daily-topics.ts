/**
 * The daily three (Inc25 FR7) — pure, derived, never stored.
 *
 * A function of (childId, sgtDayKey). No table, no migration, no write on a read
 * path, no two-tab race, and — the point of the feature — no way to reroll into
 * easier topics by refreshing.
 *
 * ## Why this isn't "just exclude yesterday's"
 *
 * The obvious recipe ("draw 3, excluding dailyTopics(day - 1)") does not
 * terminate: evaluating day D needs D-1, which needs D-2, forever, with no
 * anchor. So non-repetition is delivered STRUCTURALLY instead.
 *
 * Days are grouped into 3-day cycles. Within a cycle the three days take
 * DISJOINT slices of one per-(child, cycle) permutation, so they cannot collide.
 * Only the cycle boundary needs care: day 0 of cycle E must avoid what day 2 of
 * cycle E-1 served.
 *
 * ## The rule that keeps that non-recursive
 *
 * **Slot 2's topics are never adjusted.** They are a pure function of the cycle's
 * own permutations, so cycle E can compute what cycle E-1 served by looking at
 * E-1's raw permutations alone — one level back, O(1), no chain.
 *
 * That only works if fixing slot 0 is always *possible* without borrowing from
 * slot 2, which is why MIX_VECTORS pins the last day of every cycle to exactly
 * one maths topic (see there). An earlier revision let slot 2 take two maths and
 * fixed collisions by rotating the whole permutation; that reintroduced the
 * recursion above — cycle E-1's rotation changed what it served, so excluding
 * its *raw* slot 2 excluded the wrong set — and a property test caught it
 * repeating a grammar topic across a boundary.
 */

import { seededRng, shuffle } from "@/lib/rng";
import { GRAMMAR_TOPIC_IDS, MATH_TOPIC_IDS } from "./topics";

const DAYS_PER_CYCLE = 3;
const TOPICS_PER_DAY = 3;

/**
 * How many maths topics each day of a cycle gets. Every entry is >= 1 (the
 * "at least one maths" guarantee), and the mix varies day to day — a
 * permanently fixed "1 maths + 2 grammar" shape would be its own kind of
 * predictability (D3=B).
 *
 * **The last entry is always 1, and that is load-bearing.** It leaves 3 of the 4
 * maths topics and 4 of the 6 grammar topics free for slots 0 and 1, which is
 * exactly what guarantees slot 0 can always dodge the previous cycle's slot 2
 * (which contributes at most 1 forbidden maths and 2 forbidden grammar) without
 * ever touching slot 2. With a `[1,1,2]` row that guarantee fails: slot 2 would
 * hold 2 maths, leaving only 2 free, and a previous cycle whose slot 2 held the
 * same 2 would leave slot 0 with no eligible maths at all.
 */
const MIX_VECTORS: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [2, 1, 1],
  [1, 2, 1],
];

interface Cycle {
  mPerm: string[];
  gPerm: string[];
  mix: readonly [number, number, number];
}

/** A cycle's raw material: two per-subject permutations and a mix vector, all a
 *  pure function of (childId, cycle). NON-RECURSIVE — this is what lets the
 *  boundary fix look one cycle back in O(1). */
function rawCycle(childId: string, cycle: number): Cycle {
  const mPerm = shuffle(MATH_TOPIC_IDS, seededRng(`${childId}:m:${cycle}`));
  const gPerm = shuffle(GRAMMAR_TOPIC_IDS, seededRng(`${childId}:g:${cycle}`));
  const mix = MIX_VECTORS[Math.floor(seededRng(`${childId}:k:${cycle}`)() * MIX_VECTORS.length)];
  return { mPerm, gPerm, mix };
}

/** Slot 2 — the last day of a cycle. Deliberately independent of any boundary
 *  adjustment, so a later cycle can reproduce it from raw material alone. */
function slot2(c: Cycle): { maths: string[]; grammar: string[] } {
  const mUsed = c.mix[0] + c.mix[1];
  const gUsed = TOPICS_PER_DAY - c.mix[0] + (TOPICS_PER_DAY - c.mix[1]);
  return {
    maths: c.mPerm.slice(mUsed, mUsed + c.mix[2]),
    grammar: c.gPerm.slice(gUsed, gUsed + (TOPICS_PER_DAY - c.mix[2])),
  };
}

/** Take the first `n` entries of `from` that aren't in `blocked`, then top up
 *  from the remainder in order. Deterministic, and total by construction. */
function pick(from: readonly string[], n: number, blocked: ReadonlySet<string>): string[] {
  const clean = from.filter((id) => !blocked.has(id));
  const rest = from.filter((id) => blocked.has(id));
  return [...clean, ...rest].slice(0, n);
}

/** The three topics served on `slot` of `cycle`. */
function slotTopics(childId: string, cycle: number, slot: number): string[] {
  const c = rawCycle(childId, cycle);
  const fixed = slot2(c);
  if (slot === 2) return [...fixed.maths, ...fixed.grammar];

  // Everything slots 0 and 1 may draw from: this cycle's topics minus slot 2's.
  const mAvail = c.mPerm.filter((id) => !fixed.maths.includes(id));
  const gAvail = c.gPerm.filter((id) => !fixed.grammar.includes(id));

  // Slot 0 avoids what the previous cycle's slot 2 served. Feasible always:
  // exactly 3 maths and 4 grammar are available here, against at most 1 and 2
  // forbidden. No special case for cycle 0 — `rawCycle` is total over every
  // integer, so cycle -1 resolves like any other and day 0 is not a seam.
  const prev = new Set(slotTopics(childId, cycle - 1, 2));
  const m0 = pick(mAvail, c.mix[0], prev);
  const g0 = pick(gAvail, TOPICS_PER_DAY - c.mix[0], prev);
  if (slot === 0) return [...m0, ...g0];

  // Slot 1 takes what slots 0 and 2 left. Disjointness is set difference, so it
  // needs no exclusion of its own.
  const m1 = mAvail.filter((id) => !m0.includes(id)).slice(0, c.mix[1]);
  const g1 = gAvail.filter((id) => !g0.includes(id)).slice(0, TOPICS_PER_DAY - c.mix[1]);
  return [...m1, ...g1];
}

/**
 * The three topic ids offered to `childId` on the SGT day `dayKey`.
 *
 * Guarantees: exactly 3 distinct ids; at least one maths topic; identical on
 * every call for the same (childId, dayKey); disjoint from the previous day's
 * three; independent between children.
 */
export function dailyTopics(childId: string, dayKey: number): string[] {
  const cycle = Math.floor(dayKey / DAYS_PER_CYCLE);
  const slot = ((dayKey % DAYS_PER_CYCLE) + DAYS_PER_CYCLE) % DAYS_PER_CYCLE;
  return slotTopics(childId, cycle, slot);
}

/** Whether a topic is one of today's three — the gate `buildQuiz` applies. */
export function isTopicOfferedToday(childId: string, dayKey: number, topicId: string): boolean {
  return dailyTopics(childId, dayKey).includes(topicId);
}
