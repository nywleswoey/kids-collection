import { describe, it, expect } from "vitest";
import { GRAMMAR_BANKS } from "@/features/quiz/grammar-bank";
import { TOPICS, getTopic } from "@/features/quiz/topics";
import { QUIZ_LENGTH } from "@/features/quiz/types";

describe("grammar banks (Inc11)", () => {
  it("every bank has enough questions to draw a quiz", () => {
    for (const [topic, qs] of Object.entries(GRAMMAR_BANKS)) {
      expect(qs.length).toBeGreaterThanOrEqual(QUIZ_LENGTH * 2);
      // topic id must be a real grammar topic
      expect(getTopic(topic)?.subject).toBe("grammar");
    }
  });

  it("every question's correct answer is one of its options, ids unique", () => {
    for (const qs of Object.values(GRAMMAR_BANKS)) {
      const ids = new Set<string>();
      for (const q of qs) {
        expect(q.options).toContain(q.correct);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size).toBe(q.options.length); // no dup options
        expect(q.explanation.length).toBeGreaterThan(0); // Inc13 FR6 — every Q has a "why"
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
      }
    }
  });
});

describe("topics (Inc11)", () => {
  it("has 10 topics, 4 math + 6 grammar, all with lessons", () => {
    // Inc25 FR15: Fractions added, Number Bonds to 100 replaced by 1000.
    // The 4 maths topics are load-bearing: the daily draw's "at least one maths"
    // guarantee cannot be starved because at most 3 are excluded as yesterday's.
    expect(TOPICS).toHaveLength(10);
    expect(TOPICS.filter((t) => t.subject === "math")).toHaveLength(4);
    expect(TOPICS.filter((t) => t.subject === "grammar")).toHaveLength(6);
    for (const t of TOPICS) {
      expect(t.lesson.intro.length).toBeGreaterThan(10);
      expect(t.lesson.example.length).toBeGreaterThan(5);
    }
  });

  it("every grammar topic has a bank", () => {
    for (const t of TOPICS.filter((t) => t.subject === "grammar")) {
      expect(GRAMMAR_BANKS[t.id]).toBeDefined();
    }
  });
});
