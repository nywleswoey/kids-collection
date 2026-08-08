import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { dailyTopics, isTopicOfferedToday } from "@/features/quiz/daily-topics";
import { MATH_TOPIC_IDS, TOPICS } from "@/features/quiz/topics";

const ALL_IDS = TOPICS.map((t) => t.id);

const childArb = fc.string({ minLength: 1, maxLength: 24 });
/** Real SGT day keys are ~20700 and rising; span a wide range including the
 *  cycle boundaries, which is where the interesting behaviour lives. */
const dayArb = fc.integer({ min: 0, max: 40_000 });

const mathsIn = (ids: string[]) => ids.filter((id) => MATH_TOPIC_IDS.includes(id)).length;

describe("daily-topics (Inc25 FR7)", () => {
  it("returns exactly 3 distinct, real topic ids", () => {
    fc.assert(
      fc.property(childArb, dayArb, (child, day) => {
        const got = dailyTopics(child, day);
        expect(got).toHaveLength(3);
        expect(new Set(got).size).toBe(3);
        for (const id of got) expect(ALL_IDS).toContain(id);
      }),
    );
  });

  it("always includes at least one maths topic", () => {
    fc.assert(
      fc.property(childArb, dayArb, (child, day) => {
        expect(mathsIn(dailyTopics(child, day))).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it("is deterministic — a refresh cannot reroll into easier topics", () => {
    fc.assert(
      fc.property(childArb, dayArb, (child, day) => {
        const a = dailyTopics(child, day);
        for (let i = 0; i < 5; i++) expect(dailyTopics(child, day)).toEqual(a);
      }),
    );
  });

  // THE property this module exists for, and the one a hand-written test using
  // two consecutive days inside a single cycle would pass while the boundary
  // rotation was entirely broken. `dayArb` spans cycle boundaries by design.
  it("shares no topic with the previous day — across cycle boundaries too", () => {
    fc.assert(
      fc.property(childArb, dayArb, (child, day) => {
        const today = dailyTopics(child, day);
        const yesterday = dailyTopics(child, day - 1);
        expect(today.filter((t) => yesterday.includes(t))).toEqual([]);
      }),
    );
  });

  it("specifically: the cycle transition (day % 3 === 0) never repeats", () => {
    // Belt and braces — the case above covers this, but if the property ever
    // regresses this test names the reason directly.
    fc.assert(
      fc.property(childArb, fc.integer({ min: 1, max: 13_000 }), (child, c) => {
        const day = c * 3; // slot 0: the only day that consults the previous cycle
        const today = dailyTopics(child, day);
        const yesterday = dailyTopics(child, day - 1); // slot 2 of the previous cycle
        expect(today.filter((t) => yesterday.includes(t))).toEqual([]);
        expect(mathsIn(today)).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it("draws independently per child", () => {
    fc.assert(
      fc.property(childArb, childArb, dayArb, (a, b, day) => {
        fc.pre(a !== b);
        // Not "always different" — two children may coincide by chance. The
        // requirement is that the draw is keyed on the child, so SOME day must
        // differ across a run of days.
        const differs = Array.from({ length: 30 }, (_, i) => i).some(
          (i) => dailyTopics(a, day + i).join() !== dailyTopics(b, day + i).join(),
        );
        expect(differs).toBe(true);
      }),
    );
  });

  it("the maths mix actually varies (D3=B), and never drops below one", () => {
    const counts = new Set<number>();
    for (let day = 0; day < 3000; day++) counts.add(mathsIn(dailyTopics("kid-1", day)));
    expect(counts.has(1)).toBe(true);
    expect(counts.has(2)).toBe(true); // a fixed 1-maths shape would fail here
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...counts)).toBeLessThanOrEqual(3);
  });

  it("every topic remains reachable — nothing is stranded", () => {
    const seen = new Set<string>();
    for (let day = 0; day < 400; day++) for (const t of dailyTopics("kid-1", day)) seen.add(t);
    expect(seen.size).toBe(ALL_IDS.length);
  });

  it("isTopicOfferedToday agrees with dailyTopics", () => {
    fc.assert(
      fc.property(childArb, dayArb, fc.constantFrom(...ALL_IDS), (child, day, topic) => {
        expect(isTopicOfferedToday(child, day, topic)).toBe(dailyTopics(child, day).includes(topic));
      }),
    );
  });
});
