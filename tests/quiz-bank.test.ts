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
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
      }
    }
  });
});

describe("topics (Inc11)", () => {
  it("has 6 topics, 3 math + 3 grammar, all with lessons", () => {
    expect(TOPICS).toHaveLength(6);
    expect(TOPICS.filter((t) => t.subject === "math")).toHaveLength(3);
    expect(TOPICS.filter((t) => t.subject === "grammar")).toHaveLength(3);
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
